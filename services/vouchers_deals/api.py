import datetime
from flask import Blueprint, jsonify, request
from database.db_manager import get_db

vouchers_bp = Blueprint("vouchers_deals", __name__)
bp = vouchers_bp

DEFAULT_STARTER_VOUCHERS = [
    ("NVIDIAMALL100K", "Giảm 100.000đ Đơn Công Nghệ & Linh Kiện", "fixed", 100000, 1500000, 50, 5, "2027-12-31"),
    ("HOATOC50K", "Trợ Giá 50.000đ Ship Hỏa Tốc & Đền Bù SLA", "fixed", 50000, 300000, 100, 12, "2027-12-31"),
    ("STARTER30K", "Voucher Khởi Nghiệp Giảm 30.000đ Mọi Ngành Hàng", "fixed", 30000, 150000, 80, 10, "2027-12-31"),
    ("VIPGAMING10", "Giảm 10% (Tối đa 250K) Khi Mua Kèm PC/Màn Hình", "percent", 10, 2000000, 40, 8, "2027-12-31"),
    ("EXPIRED2024", "Mã Sự Kiện Cũ Đã Hết Hạn (Test Trạng Thái Hết Hạn)", "fixed", 50000, 200000, 20, 2, "2024-01-01"),
    ("SOLDOUT99K", "Mã Siêu Sale Đã Hết Lượt Sử Dụng (Test Hết Lượt)", "fixed", 99000, 500000, 10, 10, "2027-12-31")
]


def ensure_vouchers_schema_and_seed():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            title TEXT,
            discount_type TEXT DEFAULT 'fixed',
            discount_value REAL DEFAULT 0,
            min_order_value REAL DEFAULT 0,
            usage_limit INTEGER DEFAULT 50,
            used_count INTEGER DEFAULT 0,
            expiry_date TEXT DEFAULT '2027-12-31',
            is_active INTEGER DEFAULT 1
        )
        """
    )
    for col_def in [
        "title TEXT DEFAULT ''",
        "discount_type TEXT DEFAULT 'fixed'",
        "discount_value REAL DEFAULT 0",
        "min_order_value REAL DEFAULT 0",
        "usage_limit INTEGER DEFAULT 50",
        "used_count INTEGER DEFAULT 0",
        "expiry_date TEXT DEFAULT '2027-12-31'",
        "is_active INTEGER DEFAULT 1"
    ]:
        try:
            cursor.execute(f"ALTER TABLE vouchers ADD COLUMN {col_def}")
        except Exception:
            pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            voucher_code TEXT NOT NULL,
            is_used INTEGER DEFAULT 0,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP DEFAULT NULL,
            UNIQUE(user_id, voucher_code)
        )
        """
    )
    for u_col in ["is_used INTEGER DEFAULT 0", "used_at TIMESTAMP DEFAULT NULL"]:
        try:
            cursor.execute(f"ALTER TABLE user_vouchers ADD COLUMN {u_col}")
        except Exception:
            pass

    for code, title, d_type, d_val, min_ord, u_lim, u_cnt, exp_d in DEFAULT_STARTER_VOUCHERS:
        cursor.execute("SELECT id FROM vouchers WHERE code = ?", (code,))
        if not cursor.fetchone():
            try:
                cursor.execute(
                    """
                    INSERT INTO vouchers (code, title, discount_type, discount_value, min_order_value, usage_limit, used_count, expiry_date, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                    """,
                    (code, title, d_type, d_val, min_ord, u_lim, u_cnt, exp_d)
                )
            except Exception:
                pass
    conn.commit()
    conn.close()


def enrich_voucher_status(v_dict, claimed_map):
    now_str = datetime.date.today().strftime("%Y-%m-%d")
    code = (v_dict.get("code") or "").strip().upper()
    exp_date = str(v_dict.get("expiry_date") or v_dict.get("expires_at") or "2027-12-31")[:10]
    usage_limit = int(v_dict.get("usage_limit") if v_dict.get("usage_limit") is not None else 50)
    used_count = int(v_dict.get("used_count") if v_dict.get("used_count") is not None else 0)
    remaining = max(0, usage_limit - used_count)

    is_expired = exp_date < now_str or int(v_dict.get("is_active", 1) or 1) == 0
    is_out_of_stock = remaining <= 0

    if is_expired:
        status_code = "expired"
        status_label = "Đã hết hạn"
    elif is_out_of_stock:
        status_code = "out_of_stock"
        status_label = "Đã hết lượt"
    else:
        status_code = "active"
        status_label = "Đang áp dụng"

    claim_info = claimed_map.get(code)
    is_claimed = claim_info is not None
    is_used = bool(claim_info and int(claim_info.get("is_used") or 0) == 1)

    v_dict["code"] = code
    v_dict["expiry_date"] = exp_date
    v_dict["usage_limit"] = usage_limit
    v_dict["used_count"] = used_count
    v_dict["remaining_uses"] = remaining
    v_dict["is_expired"] = is_expired
    v_dict["is_out_of_stock"] = is_out_of_stock
    v_dict["status_code"] = status_code
    v_dict["status_label"] = status_label
    v_dict["is_claimed"] = is_claimed
    v_dict["is_used"] = is_used
    v_dict["can_claim"] = (status_code == "active") and (not is_claimed)
    v_dict["can_apply"] = (status_code == "active") and (not is_used)
    return v_dict


@bp.route("", methods=["GET"])
@bp.route("/list", methods=["GET"])
def list_vouchers():
    ensure_vouchers_schema_and_seed()
    user_id = request.args.get("user_id", type=int)
    active_only = (request.args.get("active_only") or "").strip() == "1"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vouchers ORDER BY id ASC")
    raw_vouchers = [dict(r) for r in cursor.fetchall()]

    claimed_map = {}
    if user_id:
        cursor.execute("SELECT voucher_code, is_used, claimed_at FROM user_vouchers WHERE user_id = ?", (user_id,))
        for r in cursor.fetchall():
            rd = dict(r)
            claimed_map[(rd.get("voucher_code") or "").strip().upper()] = rd
    conn.close()

    all_enriched = [enrich_voucher_status(v, claimed_map) for v in raw_vouchers]
    home_valid = [v for v in all_enriched if v["status_code"] == "active"]

    return jsonify({
        "ok": True,
        "vouchers": home_valid if active_only else all_enriched,
        "home_vouchers": home_valid,
        "claimed_codes": list(claimed_map.keys())
    }), 200


@bp.route("/claim", methods=["POST"])
@bp.route("/claim-shop", methods=["POST"])
def claim_voucher():
    ensure_vouchers_schema_and_seed()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    raw_code = (data.get("code") or data.get("voucher_code") or "").strip().upper()

    if not user_id or not raw_code:
        return jsonify({"error": "Thiếu thông tin tài khoản hoặc mã Voucher!"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN IMMEDIATE")

        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            conn.rollback()
            return jsonify({"error": "Tài khoản người dùng không tồn tại trong hệ thống!"}), 404

        cursor.execute("SELECT * FROM vouchers WHERE UPPER(code) = ?", (raw_code,))
        v_row = cursor.fetchone()
        if not v_row:
            conn.rollback()
            return jsonify({"error": f"Mã voucher '{raw_code}' không tồn tại!"}), 404

        v = dict(v_row)
        now_str = datetime.date.today().strftime("%Y-%m-%d")
        exp_date = str(v.get("expiry_date") or "2027-12-31")[:10]
        if exp_date < now_str or int(v.get("is_active", 1) or 1) == 0:
            conn.rollback()
            return jsonify({"error": f"Mã voucher '{raw_code}' đã hết hạn sử dụng!"}), 400

        usage_limit = int(v.get("usage_limit") if v.get("usage_limit") is not None else 50)
        used_count = int(v.get("used_count") if v.get("used_count") is not None else 0)
        if used_count >= usage_limit:
            conn.rollback()
            return jsonify({"error": f"Mã voucher '{raw_code}' đã hết lượt lưu!"}), 400

        cursor.execute(
            "SELECT id, is_used FROM user_vouchers WHERE user_id = ? AND UPPER(voucher_code) = ?",
            (user_id, raw_code)
        )
        if cursor.fetchone():
            conn.rollback()
            return jsonify({"error": f"Bạn đã lưu mã '{raw_code}' trong ví trước đó rồi!"}), 400

        cursor.execute(
            "UPDATE vouchers SET used_count = COALESCE(used_count, 0) + 1 WHERE id = ?",
            (v["id"],)
        )
        cursor.execute(
            "INSERT INTO user_vouchers (user_id, voucher_code, is_used) VALUES (?, ?, 0)",
            (user_id, raw_code)
        )
        conn.commit()
        return jsonify({
            "ok": True,
            "message": f"Đã lưu mã '{raw_code}' vào ví Voucher thành công!",
            "code": raw_code,
            "remaining_uses": max(0, usage_limit - (used_count + 1))
        }), 200
    except Exception as ex:
        conn.rollback()
        return jsonify({"error": f"Không thể lưu mã voucher: {ex}"}), 400
    finally:
        conn.close()


@bp.route("/apply", methods=["POST"])
@bp.route("/validate", methods=["POST"])
def validate_and_calculate_voucher():
    ensure_vouchers_schema_and_seed()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    raw_code = (data.get("code") or data.get("voucher_code") or "").strip().upper()
    items = data.get("items") or []
    consume_now = bool(data.get("consume", False))

    if not raw_code:
        return jsonify({"error": "Vui lòng chọn hoặc nhập mã Voucher!"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM vouchers WHERE UPPER(code) = ?", (raw_code,))
        v_row = cursor.fetchone()
        if not v_row:
            return jsonify({"error": f"Mã voucher '{raw_code}' không tồn tại!"}), 404
        v = dict(v_row)

        now_str = datetime.date.today().strftime("%Y-%m-%d")
        exp_date = str(v.get("expiry_date") or "2027-12-31")[:10]
        if exp_date < now_str or int(v.get("is_active", 1) or 1) == 0:
            return jsonify({"error": f"Mã voucher '{raw_code}' đã hết hạn!"}), 400

        if user_id:
            cursor.execute(
                "SELECT * FROM user_vouchers WHERE user_id = ? AND UPPER(voucher_code) = ?",
                (user_id, raw_code)
            )
            uv = cursor.fetchone()
            if uv and int(dict(uv).get("is_used") or 0) == 1:
                return jsonify({"error": f"Mã voucher '{raw_code}' đã được bạn sử dụng ở đơn hàng trước (chỉ dùng 1 lần)!"}), 400

        db_subtotal = 0.0
        if items and isinstance(items, list):
            for it in items:
                pid = it.get("id") or it.get("product_id")
                qty = max(1, int(it.get("quantity") or it.get("qty") or 1))
                cursor.execute("SELECT price FROM products WHERE id = ?", (pid,))
                p_row = cursor.fetchone()
                unit_p = float(p_row[0]) if p_row else float(it.get("price") or 0)
                db_subtotal += unit_p * qty
        else:
            db_subtotal = float(data.get("subtotal") or data.get("order_total") or 0)

        min_order = float(v.get("min_order_value") or 0)
        if db_subtotal < min_order:
            return jsonify({
                "error": f"Mã '{raw_code}' yêu cầu đơn tối thiểu {int(min_order):,}đ (Hiện tại: {int(db_subtotal):,}đ)!"
            }), 400

        d_type = (v.get("discount_type") or "fixed").lower()
        d_val = float(v.get("discount_value") or 0)
        if d_type == "percent":
            discount_amt = min(250000.0, round(db_subtotal * (d_val / 100.0)))
        else:
            discount_amt = min(db_subtotal, d_val)

        if consume_now and user_id:
            cursor.execute("BEGIN IMMEDIATE")
            cursor.execute(
                """
                INSERT INTO user_vouchers (user_id, voucher_code, is_used, used_at)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, voucher_code) DO UPDATE SET is_used = 1, used_at = CURRENT_TIMESTAMP
                """,
                (user_id, raw_code)
            )
            conn.commit()

        return jsonify({
            "ok": True,
            "code": raw_code,
            "title": v.get("title"),
            "subtotal": db_subtotal,
            "discount_amount": discount_amt,
            "final_total": max(0.0, db_subtotal - discount_amt),
            "message": f"Đã áp dụng mã {raw_code}: Giảm {int(discount_amt):,}đ!"
        }), 200
    finally:
        conn.close()
