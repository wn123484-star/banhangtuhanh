import random
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from database.db_manager import get_db, query_db, execute_db

bp = Blueprint("tracking_service", __name__)


def ensure_tracking_schema():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(orders)")
    o_cols = {r["name"] for r in cur.fetchall()}
    if "confirmed_at" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN confirmed_at TEXT DEFAULT ''")
    if "shipped_at" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN shipped_at TEXT DEFAULT ''")
    if "eta_timestamp" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN eta_timestamp REAL DEFAULT 0")
    if "eta_offset_hours" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN eta_offset_hours REAL DEFAULT 0")
    if "delay_reason" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN delay_reason TEXT DEFAULT ''")
    if "delay_investigated" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN delay_investigated INTEGER DEFAULT 0")
    if "late_compensated" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN late_compensated INTEGER DEFAULT 0")
    if "compensation_note" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN compensation_note TEXT DEFAULT ''")
    if "tracking_code" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN tracking_code TEXT DEFAULT ''")
    if "carrier_name" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN carrier_name TEXT DEFAULT 'Giao Hàng Nhanh (GHN)'")

    cur.execute("PRAGMA table_info(order_items)")
    oi_cols = {r["name"] for r in cur.fetchall()}
    if "product_name_snapshot" not in oi_cols:
        cur.execute("ALTER TABLE order_items ADD COLUMN product_name_snapshot TEXT DEFAULT ''")
    if "warranty_snapshot" not in oi_cols:
        cur.execute("ALTER TABLE order_items ADD COLUMN warranty_snapshot TEXT DEFAULT 'Bảo hành tại Shop'")

    cur.execute("PRAGMA table_info(products)")
    p_cols = {r["name"] for r in cur.fetchall()}
    if "warranty_policy" not in p_cols:
        cur.execute("ALTER TABLE products ADD COLUMN warranty_policy TEXT DEFAULT 'Bảo hành 12 tháng tại Shop'")

    cur.execute("SELECT id FROM vouchers WHERE code = 'HOATOC50K'")
    if not cur.fetchone():
        cur.execute(
            """INSERT INTO vouchers (code, title, discount_value, min_order_value, total_limit, used_count, expires_at)
               VALUES ('HOATOC50K', 'Voucher Đền Bù Giao Chậm - Miễn Phí Ship Hỏa Tốc & Giảm 50.000 Xu Lần Sau', 50000, 0, 99999, 0, '31/12/2026')"""
        )
    conn.commit()
    conn.close()


def enrich_order_tracking(o):
    now_ts = datetime.now().timestamp()
    items = query_db(
        """SELECT oi.*,
                  COALESCE(p.name, NULLIF(oi.product_name_snapshot, ''), 'Sản phẩm công nghệ & đời sống') as product_name,
                  COALESCE(p.brand, 'Nivida') as brand,
                  COALESCE(p.unit, 'Chiếc') as unit,
                  COALESCE(p.warranty_policy, NULLIF(oi.warranty_snapshot, ''), 'Bảo hành 12 tháng tại Shop') as warranty_policy,
                  COALESCE(u.company_name, u.full_name, 'Gian hàng đối tác') as shop_name,
                  COALESCE(u.id, 1) as shop_id
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           LEFT JOIN users u ON oi.seller_id = u.id
           WHERE oi.order_id = ?""",
        (o["id"],)
    )
    o["items"] = items

    base_eta = float(o.get("eta_timestamp") or 0)
    offset_h = float(o.get("eta_offset_hours") or 0)
    if o.get("status") == "shipping" and base_eta <= 0:
        base_eta = now_ts + 24 * 3600
        execute_db("UPDATE orders SET eta_timestamp = ? WHERE id = ?", (base_eta, o["id"]))

    if o.get("status") in ("shipping", "completed") and not (o.get("tracking_code") or "").strip():
        auto_code = f"GHN-NVD-{o['id']}-{1000 + (int(o['id']) * 137) % 8999}"
        execute_db("UPDATE orders SET tracking_code = ? WHERE id = ?", (auto_code, o["id"]))
        o["tracking_code"] = auto_code

    o["carrier_name"] = o.get("carrier_name") or "Giao Hàng Nhanh (GHN)"
    effective_eta = base_eta + (offset_h * 3600) if base_eta > 0 else 0
    remaining_hours = round((effective_eta - now_ts) / 3600, 1) if effective_eta > 0 else 24.0
    eta_str = datetime.fromtimestamp(effective_eta).strftime("%H:%M %d/%m/%Y") if effective_eta > 0 else "Chưa bàn giao vận chuyển"

    is_delayed = (o.get("status") == "shipping") and (remaining_hours < 0)
    o["remaining_hours"] = remaining_hours
    o["eta_formatted"] = eta_str
    o["is_delayed"] = is_delayed
    return o


@bp.route("/lookup", methods=["GET"])
def lookup_order_or_warranty():
    ensure_tracking_schema()
    q = request.args.get("q", "").strip()
    if not q:
        orders = query_db("SELECT * FROM orders ORDER BY id DESC LIMIT 8")
    elif q.isdigit():
        orders = query_db("SELECT * FROM orders WHERE id = ? OR phone LIKE ? OR tracking_code LIKE ? ORDER BY id DESC", (int(q), f"%{q}%", f"%{q}%"))
    else:
        orders = query_db(
            "SELECT * FROM orders WHERE UPPER(tracking_code) LIKE UPPER(?) OR phone LIKE ? OR customer_name LIKE ? ORDER BY id DESC",
            (f"%{q}%", f"%{q}%", f"%{q}%")
        )

    enriched = [enrich_order_tracking(o) for o in orders]
    return jsonify({"orders": enriched})


@bp.route("/shop-confirm/<int:order_id>", methods=["POST"])
def shop_confirm_order(order_id):
    ensure_tracking_schema()
    order = query_db("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    if not order:
        return jsonify({"error": "Không tìm thấy đơn hàng"}), 404

    now_str = datetime.now().strftime("%H:%M %d/%m/%Y")
    execute_db(
        "UPDATE orders SET status = 'confirmed', confirmed_at = ? WHERE id = ?",
        (now_str, order_id)
    )
    return jsonify({
        "message": f"Shop đã xác nhận nhận đơn hàng số {order_id} lúc {now_str} và bắt đầu đóng gói!"
    })


@bp.route("/handover-carrier/<int:order_id>", methods=["POST"])
def shop_handover_to_carrier(order_id):
    ensure_tracking_schema()
    order = query_db("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    if not order:
        return jsonify({"error": "Không tìm thấy đơn hàng"}), 404

    data = request.get_json(silent=True) or {}
    estimated_hours = float(data.get("estimated_hours", 24))
    tracking_code = str(data.get("tracking_code", "")).strip().upper()
    carrier_name = str(data.get("carrier_name", "")).strip() or order.get("carrier_name") or "Giao Hàng Nhanh (GHN)"
    if not tracking_code:
        tracking_code = order.get("tracking_code") or f"GHN-NVD-{order_id}-{random.randint(1000, 9999)}"

    now_dt = datetime.now()
    now_str = now_dt.strftime("%H:%M %d/%m/%Y")
    eta_dt = now_dt + timedelta(hours=estimated_hours)
    eta_ts = eta_dt.timestamp()
    eta_str = eta_dt.strftime("%H:%M %d/%m/%Y")

    confirmed_at = order.get("confirmed_at") or now_str
    execute_db(
        """UPDATE orders
           SET status = 'shipping',
               confirmed_at = ?,
               shipped_at = ?,
               eta_timestamp = ?,
               eta_offset_hours = 0,
               tracking_code = ?,
               carrier_name = ?
           WHERE id = ?""",
        (confirmed_at, now_str, eta_ts, tracking_code, carrier_name, order_id)
    )

    buyer_id = order.get("buyer_id")
    if buyer_id:
        execute_db(
            """INSERT INTO user_notifications
               (user_id, order_id, notif_type, title, message, link_url, is_read)
               VALUES (?, ?, 'shipping_code', ?, ?, ?, 0)""",
            (
                buyer_id,
                order_id,
                f"🚚 Đơn #{order_id} đã có Mã vận chuyển: {tracking_code}",
                f"Đơn hàng #{order_id} đã được giao cho {carrier_name} (Mã vận đơn: {tracking_code}). Dự kiến giao trước {eta_str}.",
                f"/services/order_tracking/tracking.html?q={tracking_code}"
            )
        )

    return jsonify({
        "tracking_code": tracking_code,
        "carrier_name": carrier_name,
        "message": f"Đã bàn giao đơn số {order_id} cho {carrier_name} (Mã vận đơn: {tracking_code})! Thời gian dự kiến nhận hàng: {eta_str}."
    })


@bp.route("/admin-adjust-eta/<int:order_id>", methods=["POST"])
def admin_adjust_order_eta(order_id):
    ensure_tracking_schema()
    order = query_db("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    if not order:
        return jsonify({"error": "Không tìm thấy đơn hàng"}), 404

    data = request.get_json(silent=True) or {}
    target_remaining_hours = float(data.get("target_remaining_hours", -12))
    delay_reason = str(data.get("delay_reason", "")).strip()

    now_ts = datetime.now().timestamp()
    new_base_eta = now_ts + (target_remaining_hours * 3600)
    status_val = order.get("status")
    if status_val in ("pending", "confirmed"):
        status_val = "shipping"

    execute_db(
        """UPDATE orders
           SET status = ?,
               eta_timestamp = ?,
               eta_offset_hours = 0,
               delay_reason = CASE WHEN ? != '' THEN ? ELSE delay_reason END
           WHERE id = ?""",
        (status_val, new_base_eta, delay_reason, delay_reason, order_id)
    )

    if target_remaining_hours < 0:
        msg = f"Đã chỉnh thời gian dự kiến của đơn số {order_id} về mức ÂM ({target_remaining_hours} giờ) để mô phỏng tình huống GIAO HÀNG CHẬM TRỄ!"
    else:
        msg = f"Đã cập nhật thời gian dự kiến giao hàng còn +{target_remaining_hours} giờ nữa."
    return jsonify({"message": msg})


@bp.route("/investigate-delay/<int:order_id>", methods=["POST"])
def investigate_and_compensate_delay(order_id):
    ensure_tracking_schema()
    order = query_db("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    if not order:
        return jsonify({"error": "Không tìm thấy đơn hàng"}), 404

    data = request.get_json(silent=True) or {}
    delay_reason = str(data.get("delay_reason") or "Quá tải tại trạm trung chuyển khu vực khiến bưu tá giao trễ hẹn").strip()
    issue_compensation = bool(data.get("issue_compensation", True))

    buyer_id = order.get("buyer_id") or 1
    comp_note = f"Kết luận điều tra: {delay_reason}."

    if issue_compensation and int(order.get("late_compensated") or 0) == 0:
        execute_db(
            "INSERT OR IGNORE INTO user_vouchers (user_id, voucher_code) VALUES (?, 'HOATOC50K')",
            (buyer_id,)
        )
        execute_db(
            "UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + 15000 WHERE id = ?",
            (buyer_id,)
        )
        comp_note += " Sàn đã tặng Mã HOATOC50K (Miễn phí Ship Hỏa Tốc & Giảm 50.000 Xu lần sau) + 15.000 Xu hỗ trợ vào Ví người mua."
        execute_db(
            """UPDATE orders
               SET delay_reason = ?,
                   delay_investigated = 1,
                   late_compensated = 1,
                   compensation_note = ?
               WHERE id = ?""",
            (delay_reason, comp_note, order_id)
        )
    else:
        execute_db(
            """UPDATE orders
               SET delay_reason = ?,
                   delay_investigated = 1,
                   compensation_note = ?
               WHERE id = ?""",
            (delay_reason, comp_note, order_id)
        )

    return jsonify({
        "message": f"Đã hoàn tất điều tra giao chậm cho đơn số {order_id}!\n{comp_note}"
    })


@bp.route("/confirm-escrow/<int:order_id>", methods=["POST"])
def confirm_order_escrow(order_id):
    ensure_tracking_schema()
    order = query_db("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    if not order:
        return jsonify({"error": "Không tìm thấy đơn hàng"}), 404

    if order.get("status") in ("pending", "confirmed"):
        return jsonify({
            "error": "Đơn hàng này chưa được Shop bàn giao cho đơn vị vận chuyển nên chưa thể bấm Đã nhận hàng!"
        }), 400

    execute_db(
        "UPDATE orders SET status = 'completed', escrow_status = 'released' WHERE id = ?",
        (order_id,)
    )
    if order.get("total_amount", 0) > 0:
        items = query_db("SELECT seller_id, unit_price, quantity FROM order_items WHERE order_id = ?", (order_id,))
        for it in items:
            sid = it.get("seller_id") or 1
            amt = float(it.get("unit_price") or 0) * int(it.get("quantity") or 1)
            execute_db("UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?", (amt, sid))

    return jsonify({
        "message": f"Cảm ơn bạn đã xác nhận nhận được hàng! Đơn hàng số {order_id} đã hoàn tất."
    })
