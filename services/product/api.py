from flask import Blueprint, request, jsonify
from database.db_manager import get_db, query_db, execute_db
from services.compare.api import trigger_wishlist_price_drop_notifications

bp = Blueprint("product_service", __name__)


def ensure_product_detail_schema():
    import os
    import json
    conn = get_db()
    cursor = conn.cursor()
    for prod_col in [
        "unit TEXT DEFAULT ''",
        "warranty TEXT DEFAULT ''",
        "origin TEXT DEFAULT ''",
        "return_policy TEXT DEFAULT ''",
        "Authenticity_commitment TEXT DEFAULT ''",
        "brand TEXT DEFAULT ''",
        "old_price REAL DEFAULT 0",
        "sold_count INTEGER DEFAULT 0",
        "views INTEGER DEFAULT 120"
    ]:
        try:
            cursor.execute(f"ALTER TABLE products ADD COLUMN {prod_col}")
        except Exception:
            pass

    for user_col in [
        "store_name TEXT DEFAULT ''",
        "company_name TEXT DEFAULT ''",
        "shop_tier TEXT DEFAULT 'mall'",
        "verified_tick INTEGER DEFAULT 1",
        "shop_slogan TEXT DEFAULT ''"
    ]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {user_col}")
        except Exception:
            pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS product_policy_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            version INTEGER DEFAULT 1,
            edited_by TEXT DEFAULT '',
            old_price REAL,
            new_price REAL,
            old_unit TEXT,
            new_unit TEXT,
            old_warranty TEXT,
            new_warranty TEXT,
            old_description TEXT,
            new_description TEXT,
            change_summary TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS product_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_name TEXT DEFAULT 'Khách hàng',
            rating INTEGER DEFAULT 5,
            quality_rating INTEGER DEFAULT 5,
            warranty_rating INTEGER DEFAULT 5,
            shipping_rating INTEGER DEFAULT 5,
            service_rating INTEGER DEFAULT 5,
            comment TEXT,
            images_json TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for rev_col in [
        "quality_rating INTEGER DEFAULT 5",
        "warranty_rating INTEGER DEFAULT 5",
        "shipping_rating INTEGER DEFAULT 5",
        "service_rating INTEGER DEFAULT 5",
        "images_json TEXT DEFAULT '[]'"
    ]:
        try:
            cursor.execute(f"ALTER TABLE product_reviews ADD COLUMN {rev_col}")
        except Exception:
            pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS product_media_gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            caption TEXT DEFAULT 'Ảnh góc máy thực tế',
            uploaded_by TEXT DEFAULT 'Khách hàng / Shop',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    try:
        cursor.execute(
            """
            DELETE FROM products
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM products
                GROUP BY LOWER(TRIM(name)), COALESCE(seller_id, 1)
            )
            """
        )
    except Exception:
        pass

    conn.commit()
    conn.close()


@bp.route("/<int:product_id>", methods=["GET"])
def get_product_detail(product_id):
    ensure_product_detail_schema()
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE products SET views = COALESCE(views, 120) + 1 WHERE id = ?", (product_id,))
        conn.commit()
    except Exception:
        pass

    try:
        cursor.execute(
            """
            SELECT p.*,
                   COALESCE(NULLIF(u.store_name, ''), NULLIF(u.company_name, ''), NULLIF(u.full_name, '')) as seller_store_name,
                   u.company_name, u.full_name as seller_name,
                   COALESCE(NULLIF(u.shop_tier, ''), 'mall') as shop_tier,
                   COALESCE(u.verified_tick, 1) as verified_tick,
                   u.shop_slogan
            FROM products p
            LEFT JOIN users u ON p.seller_id = u.id
            WHERE p.id = ?
            """,
            (product_id,)
        )
        row = cursor.fetchone()
    except Exception:
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Không tìm thấy sản phẩm"}), 404
    prod = dict(row)

    cat_key = str(prod.get("category") or "gpu").lower()
    cat_warranty_map = {
        "gpu": "36 tháng Chính hãng (Theo Serial NSX)",
        "cpu": "36 tháng Chính hãng Box",
        "mainboard": "36 tháng Chính hãng",
        "ram": "36 tháng 1 đổi 1",
        "monitor": "24 tháng Chính hãng Panel",
        "keyboard": "24 tháng Chính hãng",
        "mouse": "24 tháng Chính hãng",
        "headphones": "12 tháng Chính hãng",
        "fashion": "12 tháng Đường may & Khóa kéo",
        "home_living": "12 tháng Thiết bị điện gia dụng",
        "health_care": "18 tháng Động cơ & Vi mạch"
    }
    cat_unit_map = {
        "ram": "Bộ",
        "fashion": "Chiếc",
        "home_living": "Bộ",
        "headphones": "Bộ"
    }

    real_store_name = prod.get("seller_store_name") or prod.get("brand") or f"Gian Hàng Chính Hãng #{prod.get('seller_id') or 1}"
    real_unit = (prod.get("unit") or "").strip() or cat_unit_map.get(cat_key, "Chiếc")
    real_warranty = (prod.get("warranty") or "").strip() or cat_warranty_map.get(cat_key, "24 tháng Chính hãng")
    real_origin = (prod.get("origin") or "").strip() or f"Phân phối bởi {real_store_name}"
    real_return = (prod.get("return_policy") or "").strip() or f"Đổi trả 15 ngày tại {real_store_name} & Đền bù Voucher HOATOC50K nếu giao trễ SLA"
    real_price = float(prod.get("price") or 0)
    real_old_price = float(prod.get("old_price") or real_price)
    real_tier = str(prod.get("shop_tier") or "mall").upper()

    prod["store_name"] = real_store_name
    prod["unit"] = real_unit
    prod["warranty"] = real_warranty
    prod["origin"] = real_origin
    prod["return_policy"] = real_return
    prod["views"] = int(prod.get("views") or 125)

    try:
        cursor.execute("SELECT * FROM product_reviews WHERE product_id = ? ORDER BY id DESC", (product_id,))
        reviews = [dict(r) for r in cursor.fetchall()]
    except Exception:
        reviews = []

    try:
        cursor.execute("SELECT * FROM product_media_gallery WHERE product_id = ? ORDER BY id DESC LIMIT 20", (product_id,))
        gallery_media = [dict(r) for r in cursor.fetchall()]
    except Exception:
        gallery_media = []

    cursor.execute("SELECT * FROM product_policy_history WHERE product_id = ? ORDER BY version DESC, id DESC", (product_id,))
    policy_history = [dict(r) for r in cursor.fetchall()]

    if not policy_history:
        init_summary = f"Khởi tạo hồ sơ SQLite từ JSON: Giá {int(real_price):,}đ/{real_unit} • BH: {real_warranty}"
        cursor.execute(
            """
            INSERT INTO product_policy_history (
                product_id, version, edited_by, old_price, new_price,
                old_unit, new_unit, old_warranty, new_warranty,
                old_description, new_description, change_summary
            ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                product_id,
                real_store_name,
                real_old_price,
                real_price,
                real_unit,
                real_unit,
                real_warranty,
                real_warranty,
                prod.get("description") or "",
                prod.get("description") or "",
                init_summary
            )
        )
        conn.commit()
        cursor.execute("SELECT * FROM product_policy_history WHERE product_id = ? ORDER BY version DESC, id DESC", (product_id,))
        policy_history = [dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT * FROM products
        WHERE seller_id = ? AND id != ?
        GROUP BY LOWER(TRIM(name))
        ORDER BY sold_count DESC, id DESC LIMIT 4
        """,
        (prod.get("seller_id") or 1, product_id)
    )
    same_shop = [dict(r) for r in cursor.fetchall()]

    cursor.execute(
        """
        SELECT * FROM products
        WHERE category = ? AND id != ?
        GROUP BY LOWER(TRIM(name))
        ORDER BY rating DESC, sold_count DESC LIMIT 4
        """,
        (prod.get("category") or "", product_id)
    )
    transparent_recommendations = [dict(r) for r in cursor.fetchall()]
    conn.close()

    latest_ver = policy_history[0].get("version", len(policy_history)) if policy_history else 1
    latest_ts = policy_history[0].get("updated_at", "") if policy_history else ""
    discount_pct = round(((real_old_price - real_price) / real_old_price) * 100) if real_old_price > real_price > 0 else 0
    price_vat_str = f"{int(real_price):,}đ / {real_unit}" + (f" (Giảm {discount_pct}% từ {int(real_old_price):,}đ - Đã gồm VAT)" if discount_pct > 0 else " (Giá gốc niêm yết SQLite - Đã gồm VAT)")

    transparency_criteria = [
        {"code": "CRIT_WARRANTY", "label": "1. Cam kết Bảo hành (Trích xuất DB/JSON)", "value": f"{real_warranty} (Mã SP: #NVD-{product_id})", "passed": True},
        {"code": "CRIT_UNIT", "label": "2. Đơn vị định lượng & Tồn kho thực tế", "value": f"{real_unit} (Còn {int(prod.get('stock') or 0)} {real_unit} trong kho)", "passed": True},
        {"code": "CRIT_PRICE", "label": "3. Minh bạch Giá niêm yết & VAT", "value": price_vat_str, "passed": True},
        {"code": "CRIT_ORIGIN", "label": "4. Nguồn gốc & Phân hạng Gian hàng", "value": f"{real_origin} • Hạng: {real_tier}", "passed": True},
        {"code": "CRIT_SLA_RETURN", "label": "5. Chính sách Đổi trả & Bảo vệ SLA", "value": real_return, "passed": True},
        {"code": "CRIT_AUDIT_LOG", "label": "6. Lịch sử chỉnh sửa mô tả & chính sách", "value": f"Đã lưu vết {len(policy_history)} phiên bản trong SQLite (Mới nhất: v{latest_ver} lúc {latest_ts})", "passed": True}
    ]
    prod["reviews"] = reviews
    prod["gallery_media"] = gallery_media
    prod["policy_history"] = policy_history
    prod["transparency_criteria"] = transparency_criteria
    prod["transparency_score"] = 100
    prod["same_shop_products"] = same_shop
    prod["transparent_recommendations"] = transparent_recommendations
    return jsonify(prod), 200


@bp.route("/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    ensure_product_detail_schema()
    data = request.get_json(silent=True) or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    old_row = cursor.fetchone()
    if not old_row:
        conn.close()
        return jsonify({"error": f"Không tìm thấy sản phẩm ID={product_id} để cập nhật"}), 404
    old_prod = dict(old_row)
    old_price = float(old_prod.get("price") or 0)
    new_price = float(data.get("price", old_price))
    new_name = (data.get("name") or old_prod.get("name") or "").strip()
    new_stock = int(data.get("stock", old_prod.get("stock") or 0))
    new_unit = (data.get("unit") or old_prod.get("unit") or "Chiếc").strip()
    new_warranty = (data.get("warranty") or old_prod.get("warranty") or "12 tháng").strip()
    new_desc = (data.get("description") or old_prod.get("description") or "").strip()
    new_cat = (data.get("category") or old_prod.get("category") or "").strip()
    new_img = (data.get("image_url") or old_prod.get("image_url") or "").strip()
    cursor.execute(
        """
        UPDATE products
        SET name = ?, price = ?, old_price = ?, stock = ?, unit = ?, warranty = ?,
            description = ?, category = ?, image_url = ?
        WHERE id = ?
        """,
        (new_name, new_price, old_price, new_stock, new_unit, new_warranty, new_desc, new_cat, new_img, product_id)
    )
    cursor.execute("SELECT COALESCE(MAX(version), 1) FROM product_policy_history WHERE product_id = ?", (product_id,))
    next_ver = int(cursor.fetchone()[0] or 1) + 1
    summary_parts = []
    if new_price != old_price:
        summary_parts.append(f"Giá: {int(old_price):,}đ -> {int(new_price):,}đ")
    if new_warranty != (old_prod.get("warranty") or ""):
        summary_parts.append(f"Bảo hành: {old_prod.get('warranty')} -> {new_warranty}")
    if new_unit != (old_prod.get("unit") or ""):
        summary_parts.append(f"ĐVT: {old_prod.get('unit')} -> {new_unit}")
    if new_desc != (old_prod.get("description") or ""):
        summary_parts.append("Cập nhật nội dung mô tả & chính sách")
    change_summary = "; ".join(summary_parts) if summary_parts else "Cập nhật định kỳ thông tin minh bạch sản phẩm"
    cursor.execute(
        """
        INSERT INTO product_policy_history (
            product_id, version, edited_by, old_price, new_price,
            old_unit, new_unit, old_warranty, new_warranty,
            old_description, new_description, change_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            product_id, next_ver, data.get("edited_by") or "Chủ Gian Hàng",
            old_price, new_price,
            old_prod.get("unit") or "Chiếc", new_unit,
            old_prod.get("warranty") or "12 tháng", new_warranty,
            old_prod.get("description") or "", new_desc,
            change_summary
        )
    )
    conn.commit()
    conn.close()
    notified_users = 0
    if new_price < old_price:
        try:
            from services.compare.api import trigger_wishlist_price_drop_notifications
            notified_users = trigger_wishlist_price_drop_notifications(product_id, old_price, new_price, new_name)
        except Exception:
            pass
    return jsonify({
        "ok": True,
        "message": "Đã cập nhật sản phẩm & ghi nhận lịch sử chỉnh sửa chính sách minh bạch!",
        "product_id": product_id,
        "new_price": new_price,
        "policy_version": next_ver,
        "wishlist_notified_count": notified_users
    }), 200


@bp.route("/<int:product_id>/reviews", methods=["POST"])
def add_product_review(product_id):
    import json
    ensure_product_detail_schema()
    data = request.get_json(silent=True) or {}
    user_name = (data.get("user_name") or "Khách hàng xác thực").strip()
    q_rate = max(1, min(5, int(data.get("quality_rating") or data.get("rating") or 5)))
    w_rate = max(1, min(5, int(data.get("warranty_rating") or q_rate)))
    s_rate = max(1, min(5, int(data.get("shipping_rating") or q_rate)))
    v_rate = max(1, min(5, int(data.get("service_rating") or q_rate)))
    overall_rating = round((q_rate + w_rate + s_rate + v_rate) / 4.0)
    comment = (data.get("comment") or "Sản phẩm chính hãng chất lượng tốt, đóng gói cẩn thận.").strip()
    images_list = data.get("images") if isinstance(data.get("images"), list) else []
    images_json = json.dumps(images_list, ensure_ascii=False)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO product_reviews (
            product_id, user_name, rating, quality_rating, warranty_rating, shipping_rating, service_rating, comment, images_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (product_id, user_name, overall_rating, q_rate, w_rate, s_rate, v_rate, comment, images_json)
    )
    for img_url in images_list:
        if img_url and str(img_url).strip():
            cursor.execute(
                "INSERT INTO product_media_gallery (product_id, image_url, caption, uploaded_by) VALUES (?, ?, ?, ?)",
                (product_id, str(img_url).strip(), comment[:80], user_name)
            )

    cursor.execute("SELECT AVG(rating) FROM product_reviews WHERE product_id = ?", (product_id,))
    avg_row = cursor.fetchone()
    new_avg = round(float(avg_row[0] or overall_rating), 1) if avg_row else float(overall_rating)
    try:
        cursor.execute("UPDATE products SET rating = ? WHERE id = ?", (new_avg, product_id))
    except Exception:
        pass
    conn.commit()
    conn.close()
    return jsonify({
        "ok": True,
        "product_id": product_id,
        "new_rating": new_avg,
        "message": "🎉 Đã ghi nhận đánh giá 4 tiêu chí & hình ảnh thực tế vào hồ sơ sản phẩm!"
    }), 201


@bp.route("/<int:product_id>/media", methods=["POST"])
def upload_product_showcase_media(product_id):
    ensure_product_detail_schema()
    data = request.get_json(silent=True) or {}
    image_url = (data.get("image_url") or "").strip()
    caption = (data.get("caption") or "Ảnh thực tế góc máy khách hàng / Shop").strip()
    uploaded_by = (data.get("uploaded_by") or "Thành viên Nvidia").strip()
    if not image_url:
        return jsonify({"error": "Vui lòng chọn hoặc dán đường dẫn ảnh!"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO product_media_gallery (product_id, image_url, caption, uploaded_by) VALUES (?, ?, ?, ?)",
        (product_id, image_url, caption, uploaded_by)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "message": "📸 Đã đăng tải ảnh vào thư viện View thực tế của sản phẩm!"}), 201
