import random
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash
from database.db_manager import get_db, query_db, execute_db

bp = Blueprint("order_service", __name__)


def ensure_checkout_schema():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """CREATE TABLE IF NOT EXISTS user_addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            recipient_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            street_address TEXT NOT NULL,
            ward_commune TEXT NOT NULL,
            province_city TEXT NOT NULL,
            full_address TEXT NOT NULL,
            is_default INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )"""
    )
    cur.execute("PRAGMA table_info(orders)")
    o_cols = {r["name"] for r in cur.fetchall()}
    if "subtotal_amount" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN subtotal_amount REAL DEFAULT 0")
    if "voucher_code" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN voucher_code TEXT DEFAULT ''")
    if "voucher_discount" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN voucher_discount REAL DEFAULT 0")
    if "xu_used" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN xu_used REAL DEFAULT 0")
    if "transfer_confirmed" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN transfer_confirmed INTEGER DEFAULT 0")
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
    conn.commit()
    conn.close()


def compose_full_address(street_address, ward_commune, province_city):
    parts = [p.strip() for p in (street_address, ward_commune, province_city) if p and p.strip()]
    return ", ".join(parts)


@bp.route("/checkout-init", methods=["GET"])
def get_checkout_init():
    ensure_checkout_schema()
    user_id = request.args.get("user_id", "").strip()
    addresses = []
    wallet_balance = 0
    saved_vouchers = []

    all_vouchers = query_db("SELECT * FROM vouchers ORDER BY discount_value DESC")

    if user_id and user_id.isdigit():
        uid = int(user_id)
        u = query_db("SELECT id, full_name, phone, address, wallet_balance FROM users WHERE id = ?", (uid,), one=True)
        if u:
            wallet_balance = int(u.get("wallet_balance") or 0)
        addresses = query_db(
            "SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
            (uid,)
        )
        uv_rows = query_db("SELECT voucher_code FROM user_vouchers WHERE user_id = ?", (uid,))
        saved_codes = {r["voucher_code"] for r in uv_rows}
        for v in all_vouchers:
            v["is_saved"] = v["code"] in saved_codes
            saved_vouchers.append(v)
    else:
        for v in all_vouchers:
            v["is_saved"] = v["code"] == "WELCOME100K"
            saved_vouchers.append(v)

    return jsonify({
        "wallet_balance": wallet_balance,
        "addresses": addresses,
        "vouchers": saved_vouchers
    })


@bp.route("/addresses", methods=["POST"])
def save_user_address():
    ensure_checkout_schema()
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "Cần đăng nhập để lưu sổ địa chỉ"}), 400

    recipient_name = data.get("recipient_name", "").strip()
    phone = data.get("phone", "").strip()
    street_address = data.get("street_address", "").strip()
    ward_commune = data.get("ward_commune", "").strip()
    province_city = data.get("province_city", "").strip()
    is_default = 1 if data.get("is_default") else 0

    if not recipient_name or not phone or not street_address or not ward_commune or not province_city:
        return jsonify({"error": "Vui lòng nhập đủ Số nhà/Đường, Phường/Xã và Tỉnh/Thành phố"}), 400

    full_address = compose_full_address(street_address, ward_commune, province_city)
    if is_default:
        execute_db("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", (user_id,))
        execute_db("UPDATE users SET address = ?, phone = ? WHERE id = ?", (full_address, phone, user_id))

    addr_id = execute_db(
        """INSERT INTO user_addresses
           (user_id, recipient_name, phone, street_address, ward_commune, province_city, full_address, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, recipient_name, phone, street_address, ward_commune, province_city, full_address, is_default)
    )
    addresses = query_db("SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", (user_id,))
    return jsonify({
        "message": "Đã lưu địa chỉ nhận hàng thành công!",
        "address_id": addr_id,
        "addresses": addresses
    })


@bp.route("/checkout", methods=["POST"])
def checkout():
    ensure_checkout_schema()
    data = request.get_json() or {}
    buyer_id = data.get("buyer_id")
    customer_name = data.get("customer_name", "").strip()
    phone = data.get("phone", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip() or "123456"
    gender = data.get("gender", "other").strip()

    street_address = data.get("street_address", "").strip()
    ward_commune = data.get("ward_commune", "").strip()
    province_city = data.get("province_city", "").strip()
    shipping_address = data.get("shipping_address", "").strip()
    if street_address and ward_commune and province_city:
        shipping_address = compose_full_address(street_address, ward_commune, province_city)

    set_default_address = bool(data.get("set_default_address", True))
    payment_method = data.get("payment_method", "cod").strip()
    transfer_confirmed = 1 if data.get("transfer_confirmed") else 0
    voucher_code = (data.get("voucher_code") or "").strip().upper()
    use_xu = bool(data.get("use_xu", False))
    items = data.get("items", [])

    if not items:
        return jsonify({"error": "Giỏ hàng đang trống!"}), 400
    if not customer_name or not phone or not shipping_address:
        return jsonify({"error": "Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng!"}), 400

    if payment_method == "bank_transfer" and not transfer_confirmed:
        return jsonify({"error": "Vui lòng bấm nút 'Xác nhận đã chuyển khoản' trước khi hoàn tất đơn hàng!"}), 400

    auto_registered = False
    if not buyer_id:
        if not email:
            clean_phone = "".join(ch for ch in phone if ch.isdigit()) or str(random.randint(1000, 9999))
            email = f"khach_{clean_phone}@nivida.vn"
        existing_u = query_db("SELECT * FROM users WHERE email = ?", (email,), one=True)
        if existing_u:
            buyer_id = existing_u["id"]
        else:
            username = email.split("@")[0] + str(random.randint(10, 99))
            buyer_id = execute_db(
                """INSERT INTO users
                   (username, full_name, email, password_hash, role, phone, address, wallet_balance, gender, spin_tickets)
                   VALUES (?, ?, ?, ?, 'user', ?, ?, 100000, ?, 3)""",
                (username, customer_name, email, generate_password_hash(password), phone, shipping_address, gender)
            )
            execute_db("INSERT OR IGNORE INTO user_vouchers (user_id, voucher_code) VALUES (?, 'WELCOME100K')", (buyer_id,))
            auto_registered = True
        session["user_id"] = buyer_id

    buyer = query_db("SELECT * FROM users WHERE id = ?", (buyer_id,), one=True)
    if not buyer:
        return jsonify({"error": "Không tìm thấy tài khoản người mua"}), 404

    if street_address and ward_commune and province_city:
        existing_addr = query_db(
            "SELECT id FROM user_addresses WHERE user_id = ? AND full_address = ?",
            (buyer_id, shipping_address),
            one=True
        )
        if set_default_address:
            execute_db("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", (buyer_id,))
            execute_db("UPDATE users SET address = ?, phone = ? WHERE id = ?", (shipping_address, phone, buyer_id))
        if not existing_addr:
            execute_db(
                """INSERT INTO user_addresses
                   (user_id, recipient_name, phone, street_address, ward_commune, province_city, full_address, is_default)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (buyer_id, customer_name, phone, street_address, ward_commune, province_city, shipping_address, 1 if set_default_address else 0)
            )

    subtotal_amount = sum(float(i["price"]) * int(i["quantity"]) for i in items)

    voucher_discount = 0.0
    if voucher_code:
        v_row = query_db("SELECT * FROM vouchers WHERE UPPER(code) = ?", (voucher_code,), one=True)
        if v_row and subtotal_amount >= float(v_row.get("min_order_value") or 0):
            voucher_discount = float(v_row["discount_value"])
            execute_db("UPDATE vouchers SET used_count = MIN(total_limit, used_count + 1) WHERE id = ?", (v_row["id"],))

    after_voucher = max(0.0, subtotal_amount - voucher_discount)
    available_xu = float(buyer.get("wallet_balance") or 0)
    xu_used = 0.0

    if use_xu and available_xu > 0 and after_voucher > 0:
        xu_used = min(available_xu, after_voucher)
        execute_db(
            "UPDATE users SET wallet_balance = MAX(0, wallet_balance - ?) WHERE id = ?",
            (xu_used, buyer_id)
        )

    final_amount = max(0.0, after_voucher - xu_used)

    order_id = execute_db(
        """INSERT INTO orders
           (buyer_id, customer_name, phone, shipping_address, payment_method, subtotal_amount, voucher_code, voucher_discount, xu_used, total_amount, transfer_confirmed, status, escrow_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'holding')""",
        (
            buyer_id,
            customer_name,
            phone,
            shipping_address,
            payment_method,
            subtotal_amount,
            voucher_code,
            voucher_discount,
            xu_used,
            final_amount,
            transfer_confirmed
        )
    )

    for item in items:
        prod = query_db(
            "SELECT seller_id, name, category, COALESCE(warranty_policy, 'Bảo hành 12 tháng tại Shop') as warranty_policy FROM products WHERE id = ?",
            (item["product_id"],),
            one=True
        )
        seller_id = prod["seller_id"] if prod else 1
        snap_name = prod["name"] if prod else (item.get("name") or f"Sản phẩm mã {item['product_id']}")
        snap_warranty = prod["warranty_policy"] if prod else "Bảo hành 12 tháng tại Shop"
        qty = int(item["quantity"])
        execute_db(
            """INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price, product_name_snapshot, warranty_snapshot)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (order_id, item["product_id"], seller_id, qty, float(item["price"]), snap_name, snap_warranty)
        )
        execute_db(
            "UPDATE products SET stock = MAX(0, stock - ?), sold_count = sold_count + ? WHERE id = ?",
            (qty, qty, item["product_id"])
        )
        if prod and prod.get("category"):
            execute_db(
                "INSERT INTO user_behavior_logs (user_id, action_type, category_tag, item_ref) VALUES (?, 'purchase', ?, ?)",
                (buyer_id, prod["category"], str(item["product_id"]))
            )

    updated_user = query_db(
        "SELECT id, username, full_name, email, role, company_name, phone, address, wallet_balance, gender, spin_tickets FROM users WHERE id = ?",
        (buyer_id,),
        one=True
    )
    msg = f"Đặt đơn hàng thành công (Mã đơn: {order_id})! Hiện đang chờ Shop xác nhận."
    if auto_registered:
        msg = f"Đã tạo tài khoản (+100.000 Xu) & Đặt đơn hàng số {order_id} thành công! Hiện đang chờ Shop xác nhận."

    return jsonify({
        "message": msg,
        "order_id": order_id,
        "auto_registered": auto_registered,
        "subtotal_amount": subtotal_amount,
        "voucher_discount": voucher_discount,
        "xu_used": xu_used,
        "final_amount": final_amount,
        "user": updated_user
    })
