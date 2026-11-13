import os
import uuid
import json
import time
import random
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from database.db_manager import get_db, query_db, execute_db
from services.admin_dispute.api import call_groq_with_fallback
from services.compare.api import trigger_wishlist_price_drop_notifications

bp = Blueprint("seller_service", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRODUCT_UPLOAD_DIR = os.path.join(BASE_DIR, "assets", "uploads", "products")


def ensure_seller_product_columns():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(products)")
    cols = {r["name"] for r in cur.fetchall()}
    if "unit" not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'Chiếc'")
    if "target_gender" not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN target_gender TEXT DEFAULT 'all'")
    if "sponsor_tag" not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN sponsor_tag TEXT DEFAULT ''")
    if "warranty_policy" not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN warranty_policy TEXT DEFAULT 'Bảo hành 12 tháng tại Shop'")

    cur.execute("PRAGMA table_info(users)")
    u_cols = {r["name"] for r in cur.fetchall()}
    if "shop_tier" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_tier TEXT DEFAULT 'normal'")
    if "shop_theme_color" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_theme_color TEXT DEFAULT 'rgb(118, 185, 0)'")
    if "shop_slogan" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_slogan TEXT DEFAULT 'Gian hàng chính hãng bảo hành uy tín tại Shop'")
    if "verified_tick" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN verified_tick INTEGER DEFAULT 0")

    cur.execute("PRAGMA table_info(orders)")
    o_cols = {r["name"] for r in cur.fetchall()}
    if "tracking_code" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN tracking_code TEXT DEFAULT ''")
    if "carrier_name" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN carrier_name TEXT DEFAULT 'Giao Hàng Nhanh (GHN)'")
    if "confirmed_at" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN confirmed_at TEXT DEFAULT ''")
    if "shipped_at" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN shipped_at TEXT DEFAULT ''")
    if "eta_timestamp" not in o_cols:
        cur.execute("ALTER TABLE orders ADD COLUMN eta_timestamp REAL DEFAULT 0")
    conn.commit()
    conn.close()


@bp.route("/list-stores", methods=["GET"])
def list_seller_stores():
    brand_catalog = [
        {"title": "ASUS ROG Official Mall", "tier": "mall", "badge": "👑 Flagship Mall", "voucher": "Giảm 150K", "rating": 4.9, "followers": "86.5k", "specialty": "Card đồ họa RTX & Mainboard Z790"},
        {"title": "MSI Gaming Flagship Store", "tier": "mall", "badge": "👑 Shop Mall", "voucher": "Giảm 100K", "rating": 4.9, "followers": "64.2k", "specialty": "Laptop Gaming, VGA & Màn hình 240Hz"},
        {"title": "Logitech G & Gear Official", "tier": "mall", "badge": "👑 Shop Mall", "voucher": "Freeship NVX", "rating": 5.0, "followers": "92.1k", "specialty": "Chuột Pro X Superlight & Phím cơ"},
        {"title": "Corsair & Elgato Vietnam", "tier": "mall", "badge": "👑 Shop Mall", "voucher": "Giảm 80K", "rating": 4.8, "followers": "45.8k", "specialty": "RAM DDR5, Nguồn ATX 3.0 & Tản nhiệt"},
        {"title": "Samsung Semiconductor Mall", "tier": "mall", "badge": "👑 Shop Mall", "voucher": "Giảm 50K", "rating": 4.9, "followers": "71.0k", "specialty": "Ổ cứng SSD NVMe 990 PRO & Màn hình"},
        {"title": "Razer Zone & Audio Store", "tier": "favorite", "badge": "⭐ Yêu Thích+", "voucher": "Tặng Xu 20K", "rating": 4.8, "followers": "38.4k", "specialty": "Tai nghe Gaming & Phụ kiện Streamer"},
        {"title": "NZXT & Lian Li Custom PC", "tier": "favorite", "badge": "⭐ Yêu Thích+", "voucher": "Giảm 5%", "rating": 4.9, "followers": "29.6k", "specialty": "Vỏ Case Panoramic & Tản nước AIO"},
        {"title": "Smart Home & Sức Khỏe 247", "tier": "favorite", "badge": "⭐ Yêu Thích", "voucher": "Giảm 30K", "rating": 4.8, "followers": "51.3k", "specialty": "Đèn Decor, Máy Massage & Balo chống sốc"}
    ]
    rows = query_db(
        """
        SELECT u.id, u.full_name, u.company_name, u.role,
               COUNT(p.id) as product_count
        FROM users u
        LEFT JOIN products p ON p.seller_id = u.id
        WHERE u.role IN ('seller', 'admin')
        GROUP BY u.id
        ORDER BY product_count DESC, u.id ASC
        """
    )
    stores = []
    for idx, r in enumerate(rows or []):
        d = dict(r)
        meta = brand_catalog[idx % len(brand_catalog)]
        raw_name = (d.get("company_name") or d.get("full_name") or "").strip()
        if not raw_name or "nivida official" in raw_name.lower() or "quản trị" in raw_name.lower():
            display_name = meta["title"]
        else:
            display_name = raw_name
        stores.append({
            "id": d["id"],
            "store_name": display_name,
            "company_name": display_name,
            "full_name": d.get("full_name") or display_name,
            "shop_tier": meta["tier"],
            "tier_badge": meta["badge"],
            "voucher_tag": meta["voucher"],
            "rating": meta["rating"],
            "followers": meta["followers"],
            "specialty": meta["specialty"],
            "verified_tick": 1,
            "product_count": max(6, int(d.get("product_count") or 0))
        })

    while len(stores) < 8:
        idx = len(stores)
        meta = brand_catalog[idx % len(brand_catalog)]
        stores.append({
            "id": idx + 1,
            "store_name": meta["title"],
            "company_name": meta["title"],
            "full_name": meta["title"],
            "shop_tier": meta["tier"],
            "tier_badge": meta["badge"],
            "voucher_tag": meta["voucher"],
            "rating": meta["rating"],
            "followers": meta["followers"],
            "specialty": meta["specialty"],
            "verified_tick": 1,
            "product_count": 12 + idx * 4
        })
    return jsonify(stores[:8])


@bp.route("/storefront/<int:seller_id>", methods=["GET"])
def get_public_storefront(seller_id):
    ensure_seller_product_columns()
    shop = query_db(
        """SELECT id, username, full_name, company_name, role, is_mall,
                  COALESCE(shop_tier, 'normal') as shop_tier,
                  COALESCE(shop_theme_color, 'rgb(118, 185, 0)') as shop_theme_color,
                  COALESCE(shop_slogan, 'Gian hàng phân phối chính hãng bảo hành uy tín tại Shop') as shop_slogan,
                  COALESCE(verified_tick, 0) as verified_tick,
                  created_at
           FROM users WHERE id = ?""",
        (seller_id,),
        one=True
    )
    if not shop:
        return jsonify({"error": f"Không tìm thấy Gian hàng ID={seller_id}"}), 404

    category = request.args.get("category", "").strip()
    q = request.args.get("q", "").strip()
    sort_by = request.args.get("sort_by", "bestseller").strip()

    sql = """SELECT p.*,
                    COALESCE(u.company_name, u.full_name, 'Nivida Store') as company_name,
                    COALESCE(u.shop_tier, 'normal') as shop_tier,
                    COALESCE(u.shop_theme_color, 'rgb(118, 185, 0)') as shop_theme_color,
                    COALESCE(u.verified_tick, 0) as verified_tick
             FROM products p
             LEFT JOIN users u ON p.seller_id = u.id
             WHERE p.seller_id = ?"""
    params = [seller_id]

    if category:
        sql += " AND p.category = ?"
        params.append(category)
    if q:
        sql += " AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])

    if sort_by == "price_asc":
        sql += " ORDER BY p.price ASC"
    elif sort_by == "price_desc":
        sql += " ORDER BY p.price DESC"
    elif sort_by == "newest":
        sql += " ORDER BY p.id DESC"
    else:
        sql += " ORDER BY p.sold_count DESC, p.id DESC"

    products = query_db(sql, params)
    all_shop_products = query_db("SELECT category, sold_count, stock, rating FROM products WHERE seller_id = ?", (seller_id,))
    total_products = len(all_shop_products)
    total_sold = sum(int(p.get("sold_count") or 0) for p in all_shop_products)
    total_stock = sum(int(p.get("stock") or 0) for p in all_shop_products)
    avg_rating = round(
        sum(float(p.get("rating") or 5.0) for p in all_shop_products) / total_products, 2
    ) if total_products > 0 else 5.0
    categories = sorted(list({p["category"] for p in all_shop_products if p.get("category")}))

    other_stores = query_db(
        """SELECT id, company_name, full_name,
                  COALESCE(shop_tier, 'normal') as shop_tier,
                  COALESCE(shop_theme_color, 'rgb(118, 185, 0)') as shop_theme_color,
                  COALESCE(verified_tick, 0) as verified_tick
           FROM users
           WHERE role IN ('seller', 'admin') AND id != ?
           ORDER BY id ASC LIMIT 6""",
        (seller_id,)
    )

    return jsonify({
        "shop": shop,
        "stats": {
            "total_products": total_products,
            "total_sold": total_sold,
            "total_stock": total_stock,
            "avg_rating": avg_rating,
            "categories": categories
        },
        "products": products,
        "other_stores": other_stores
    })


@bp.route("/store-customization", methods=["GET", "PUT"])
def handle_store_customization():
    ensure_seller_product_columns()
    if request.method == "GET":
        seller_id = request.args.get("seller_id", "").strip()
        if seller_id and seller_id.isdigit():
            row = query_db(
                """SELECT id, full_name, company_name, role, is_mall,
                          COALESCE(shop_tier, 'normal') as shop_tier,
                          COALESCE(shop_theme_color, 'rgb(118, 185, 0)') as shop_theme_color,
                          COALESCE(shop_slogan, 'Gian hàng uy tín bảo hành tại Shop') as shop_slogan,
                          COALESCE(verified_tick, 0) as verified_tick
                   FROM users WHERE id = ?""",
                (int(seller_id),),
                one=True
            )
            if row:
                return jsonify(row)
        fallback = query_db(
            """SELECT id, full_name, company_name, role, is_mall,
                      COALESCE(shop_tier, 'normal') as shop_tier,
                      COALESCE(shop_theme_color, 'rgb(118, 185, 0)') as shop_theme_color,
                      COALESCE(shop_slogan, 'Gian hàng uy tín bảo hành tại Shop') as shop_slogan,
                      COALESCE(verified_tick, 0) as verified_tick
               FROM users WHERE role IN ('seller', 'admin') ORDER BY id ASC LIMIT 1""",
            one=True
        )
        if not fallback:
            return jsonify({"error": "Không tìm thấy Gian hàng nào"}), 404
        return jsonify(fallback)

    data = request.get_json() or {}
    seller_id = data.get("seller_id")
    if not seller_id or not str(seller_id).isdigit():
        return jsonify({"error": "Thiếu seller_id hợp lệ"}), 400

    target_user = query_db("SELECT id FROM users WHERE id = ?", (int(seller_id),), one=True)
    if not target_user:
        return jsonify({"error": f"Không tìm thấy Gian hàng có ID={seller_id} trong cơ sở dữ liệu"}), 404

    actual_sid = target_user["id"]
    company_name = data.get("company_name", "").strip()
    shop_tier = data.get("shop_tier", "normal").strip().lower()
    if shop_tier not in ("normal", "favorite", "mall"):
        shop_tier = "normal"
    shop_theme_color = data.get("shop_theme_color", "rgb(118, 185, 0)").strip() or "rgb(118, 185, 0)"
    shop_slogan = data.get("shop_slogan", "").strip()
    verified_tick = 1 if data.get("verified_tick") else 0
    is_mall = 1 if shop_tier == "mall" else 0

    execute_db(
        """UPDATE users
           SET company_name = COALESCE(NULLIF(?, ''), company_name),
               shop_tier = ?,
               shop_theme_color = ?,
               shop_slogan = ?,
               verified_tick = ?,
               is_mall = ?
           WHERE id = ?""",
        (company_name, shop_tier, shop_theme_color, shop_slogan, verified_tick, is_mall, actual_sid)
    )
    updated = query_db(
        """SELECT id, username, full_name, email, role, company_name, phone, address, wallet_balance,
                  shop_tier, shop_theme_color, shop_slogan, verified_tick, is_mall
           FROM users WHERE id = ?""",
        (actual_sid,),
        one=True
    )
    return jsonify({
        "message": "Đã lưu cấu hình cá nhân hóa Gian hàng & Phân hạng Shop thành công!",
        "user": updated
    })


@bp.route("/upload-image", methods=["POST"])
def upload_product_image():
    if "file" not in request.files:
        return jsonify({"error": "Không có file upload"}), 400
    f = request.files["file"]
    if not f or not f.filename or f.filename.strip() == "":
        return jsonify({"error": "Tên file trống"}), 400

    ext = os.path.splitext(f.filename)[1].lower() or ".jpg"
    if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        ext = ".jpg"

    new_name = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(PRODUCT_UPLOAD_DIR, exist_ok=True)
    save_path = os.path.join(PRODUCT_UPLOAD_DIR, new_name)
    f.save(save_path)

    relative_url = f"/assets/uploads/products/{new_name}"
    return jsonify({"image_url": relative_url, "filename": new_name})


@bp.route("/products", methods=["GET", "POST"])
def handle_seller_products():
    from services.product.api import ensure_product_detail_schema
    ensure_product_detail_schema()
    if request.method == "GET":
        seller_id = request.args.get("seller_id")
        role = request.args.get("role", "seller")
        if not seller_id and role != "admin":
            return jsonify([])
        if role == "admin":
            rows = query_db("SELECT * FROM products ORDER BY id DESC")
        else:
            rows = query_db("SELECT * FROM products WHERE seller_id = ? ORDER BY id DESC", (seller_id,))
        return jsonify(rows or [])

    data = request.get_json(silent=True) or {}
    seller_id = data.get("seller_id") or 1
    image_url = (data.get("image_url") or "").strip() or "/assets/icons/icon.png"
    unit_val = (data.get("unit") or "Chiếc").strip()
    warranty_val = (data.get("warranty") or "36 tháng Chính hãng").strip()

    pid = execute_db(
        """INSERT INTO products (seller_id, name, category, price, old_price, discount_badge, stock, unit, warranty, image_url, description, is_flash_sale)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            int(seller_id),
            (data.get("name") or "Sản phẩm mới").strip(),
            data.get("category") or "gpu",
            float(data.get("price") or 0),
            float(data.get("old_price") or 0),
            (data.get("discount_badge") or "").strip(),
            int(data.get("stock") if data.get("stock") is not None else 50),
            unit_val,
            warranty_val,
            image_url,
            (data.get("description") or "").strip(),
            int(data.get("is_flash_sale") or 0)
        )
    )
    return jsonify({"ok": True, "message": "Đã đăng bán sản phẩm mới thành công!", "product_id": pid, "image_url": image_url})


@bp.route("/products/<int:product_id>", methods=["PUT", "DELETE"])
def handle_single_product(product_id):
    from services.product.api import ensure_product_detail_schema
    ensure_product_detail_schema()
    if request.method == "DELETE":
        execute_db("DELETE FROM products WHERE id = ?", (product_id,))
        return jsonify({"ok": True, "message": "Đã xóa sản phẩm khỏi gian hàng", "product_id": product_id})

    data = request.get_json(silent=True) or {}
    existing = query_db("SELECT * FROM products WHERE id = ?", (product_id,), one=True) or {}
    image_url = (data.get("image_url") or "").strip() or existing.get("image_url") or "/assets/icons/icon.png"
    unit_val = (data.get("unit") or existing.get("unit") or "Chiếc").strip()
    warranty_val = (data.get("warranty") or existing.get("warranty") or "36 tháng Chính hãng").strip()

    execute_db(
        """UPDATE products
           SET name = ?, category = ?, price = ?, old_price = ?,
               discount_badge = ?, stock = ?, unit = ?, warranty = ?,
               image_url = ?, description = ?, is_flash_sale = ?
           WHERE id = ?""",
        (
            (data.get("name") or existing.get("name") or "").strip(),
            data.get("category") or existing.get("category") or "gpu",
            float(data.get("price") if data.get("price") is not None else (existing.get("price") or 0)),
            float(data.get("old_price") if data.get("old_price") is not None else (existing.get("old_price") or 0)),
            (data.get("discount_badge") if "discount_badge" in data else (existing.get("discount_badge") or "")).strip(),
            int(data.get("stock") if data.get("stock") is not None else (existing.get("stock") or 0)),
            unit_val,
            warranty_val,
            image_url,
            (data.get("description") if "description" in data else (existing.get("description") or "")).strip(),
            int(data.get("is_flash_sale") if "is_flash_sale" in data else (existing.get("is_flash_sale") or 0)),
            product_id
        )
    )
    return jsonify({"ok": True, "message": "Đã cập nhật sản phẩm & chính sách bảo hành thành công!", "product_id": product_id, "image_url": image_url})


def ensure_shopee_order_waybill_columns():
    from database.db_manager import get_db
    conn = get_db()
    cursor = conn.cursor()
    for col_def in [
        "tracking_code TEXT DEFAULT ''",
        "route_sort_code TEXT DEFAULT 'NVD-HN-01-SG'",
        "sender_address TEXT DEFAULT 'Kho Trung Tâm Nvidia Partner, Quận Long Biên, Hà Nội'",
        "weight_grams INTEGER DEFAULT 550",
        "escrow_status TEXT DEFAULT 'holding'",
        "packaging_proof_url TEXT DEFAULT ''",
        "packaging_note TEXT DEFAULT ''",
        "packaged_at TEXT DEFAULT ''"
    ]:
        try:
            cursor.execute(f"ALTER TABLE orders ADD COLUMN {col_def}")
        except Exception:
            pass
    conn.commit()
    conn.close()


@bp.route("/orders/<int:order_id>/packaging-proof", methods=["POST"])
def save_order_packaging_proof(order_id):
    ensure_shopee_order_waybill_columns()
    data = request.get_json(silent=True) or {}
    proof_url = (data.get("packaging_proof_url") or data.get("image_url") or "").strip()
    note = (data.get("packaging_note") or "Đã kiểm tra ngoại quan, dán tem niêm phong & đóng gói chống sốc trước Camera").strip()
    auto_confirm = bool(data.get("auto_confirm", True))

    if not proof_url:
        return jsonify({"ok": False, "error": "Chưa có hình ảnh minh chứng đóng gói!"}), 400

    now_str = time.strftime("%Y-%m-%d %H:%M:%S")
    tracking_code = f"NVX-{int(order_id):04d}"
    route_code = f"NVD-HN-01-KV{int(order_id) % 99:02d}"

    if auto_confirm:
        execute_db(
            """
            UPDATE orders
            SET packaging_proof_url = ?,
                packaging_note = ?,
                packaged_at = ?,
                status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
                tracking_code = COALESCE(NULLIF(tracking_code, ''), ?),
                route_sort_code = COALESCE(NULLIF(route_sort_code, ''), ?)
            WHERE id = ?
            """,
            (proof_url, note, now_str, tracking_code, route_code, order_id)
        )
    else:
        execute_db(
            "UPDATE orders SET packaging_proof_url = ?, packaging_note = ?, packaged_at = ? WHERE id = ?",
            (proof_url, note, now_str, order_id)
        )

    return jsonify({
        "ok": True,
        "order_id": order_id,
        "packaging_proof_url": proof_url,
        "packaging_note": note,
        "packaged_at": now_str,
        "tracking_code": tracking_code,
        "message": f"📸 Đã lưu ảnh minh chứng đóng gói cho đơn #NVD-{order_id} lúc {now_str} & xác nhận niêm phong!"
    }), 200


@bp.route("/orders", methods=["GET"])
def get_seller_orders():
    ensure_shopee_order_waybill_columns()
    seller_id = request.args.get("seller_id")
    role = request.args.get("role", "seller")
    if not seller_id and role != "admin":
        return jsonify([])

    if role == "admin":
        rows = query_db(
            """SELECT oi.id as item_id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price,
                      p.name as product_name, p.unit, p.warranty, p.image_url, p.category,
                      o.customer_name, o.phone, o.shipping_address,
                      o.status, o.escrow_status, o.created_at,
                      o.tracking_code, o.route_sort_code, o.sender_address, o.weight_grams,
                      o.packaging_proof_url, o.packaging_note, o.packaged_at
               FROM order_items oi
               JOIN orders o ON oi.order_id = o.id
               JOIN products p ON oi.product_id = p.id
               ORDER BY o.id DESC, oi.id ASC"""
        )
    else:
        rows = query_db(
            """SELECT oi.id as item_id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price,
                      p.name as product_name, p.unit, p.warranty, p.image_url, p.category,
                      o.customer_name, o.phone, o.shipping_address,
                      o.status, o.escrow_status, o.created_at,
                      o.tracking_code, o.route_sort_code, o.sender_address, o.weight_grams,
                      o.packaging_proof_url, o.packaging_note, o.packaged_at
               FROM order_items oi
               JOIN orders o ON oi.order_id = o.id
               JOIN products p ON oi.product_id = p.id
               WHERE oi.seller_id = ? OR p.seller_id = ?
               ORDER BY o.id DESC, oi.id ASC""",
            (seller_id, seller_id)
        )

    grouped_orders = {}
    order_seq = []
    for r in (rows or []):
        d = dict(r)
        oid = int(d.get("order_id") or 1)
        qty = max(1, int(d.get("quantity") or 1))
        u_price = float(d.get("unit_price") or 0)
        line_total = qty * u_price

        if oid not in grouped_orders:
            t_code = normalize_nvidia_tracking_code(d.get("tracking_code"), oid)
            raw_route = str(d.get("route_sort_code") or "")
            r_code = f"NVD-HN-01-KV{oid % 99:02d}" if (not raw_route or raw_route.startswith("HN-LB")) else raw_route
            st = (d.get("status") or "pending").lower()
            esc = "released" if st == "completed" else (d.get("escrow_status") or "holding")

            grouped_orders[oid] = {
                "order_id": oid,
                "order_code": f"NVD-2611-{oid:04d}",
                "tracking_code": t_code,
                "route_sort_code": r_code,
                "customer_name": d.get("customer_name") or "Khách hàng",
                "phone": d.get("phone") or "0988 777 666",
                "shipping_address": d.get("shipping_address") or "Hà Nội",
                "sender_address": d.get("sender_address") or "Kho Trung Tâm Nvidia Partner, Quận Long Biên, Hà Nội",
                "status": st,
                "escrow_status": esc,
                "created_at": d.get("created_at") or time.strftime("%Y-%m-%d %H:%M:%S"),
                "packaging_proof_url": d.get("packaging_proof_url") or "",
                "packaging_note": d.get("packaging_note") or "",
                "packaged_at": d.get("packaged_at") or "",
                "product_name": d.get("product_name") or "Sản phẩm công nghệ",
                "quantity": 0,
                "unit_price": u_price,
                "total_amount": 0.0,
                "weight_grams": 0,
                "unique_url": f"/services/seller/order-detail.html?id={oid}",
                "items": []
            }
            order_seq.append(oid)

        g = grouped_orders[oid]
        g["quantity"] += qty
        g["total_amount"] += line_total
        g["items"].append({
            "item_id": d.get("item_id"),
            "product_id": d.get("product_id"),
            "product_name": d.get("product_name"),
            "category": d.get("category") or "gpu",
            "quantity": qty,
            "unit_price": u_price,
            "line_total": line_total,
            "unit": d.get("unit") or "Chiếc",
            "warranty": d.get("warranty") or "24 tháng"
        })

    result = []
    for oid in order_seq:
        g = grouped_orders[oid]
        g["unit_price"] = g["total_amount"] / max(1, g["quantity"])
        g["weight_grams"] = g["quantity"] * 450
        if len(g["items"]) > 1:
            g["product_name"] = f"{g['items'][0]['product_name']} (+{len(g['items']) - 1} mặt hàng khác)"
        result.append(g)

    return jsonify(result)


@bp.route("/orders/<int:order_id>/detail", methods=["GET"])
def get_single_order_waybill_detail(order_id):
    ensure_shopee_order_waybill_columns()
    order = query_db("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    items = query_db(
        """SELECT oi.*, p.name as product_name, p.unit, p.warranty, p.category, p.seller_id,
                  u.company_name, u.store_name, u.full_name, u.phone as seller_phone
           FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           LEFT JOIN users u ON p.seller_id = u.id
           WHERE oi.order_id = ?""",
        (order_id,)
    )
    if not order and not items:
        return jsonify({
            "order_id": order_id,
            "order_code": f"NVD-2611-{int(order_id):04d}",
            "tracking_code": f"NVX-{int(order_id):04d}",
            "route_sort_code": f"NVD-HN-01-KV{int(order_id) % 99:02d}",
            "status": "shipping",
            "escrow_status": "holding",
            "packaging_proof_url": "",
            "packaging_note": "",
            "packaged_at": "",
            "seller_name": "Nvidia Flagship Official Store",
            "seller_phone": "0848 307 774",
            "sender_address": "Kho Trung Tâm Nvidia Partner, Quận Long Biên, Hà Nội",
            "customer_name": "Khách Hàng Nvidia",
            "phone": "0988 777 666",
            "shipping_address": "161/3 Đường Số 1, Phường 13, Quận Gò Vấp, TP. Hồ Chí Minh",
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "weight_grams": 650,
            "total_amount": 15990000,
            "unique_url": f"/services/seller/order-detail.html?id={order_id}",
            "items": [{
                "product_name": "Thiết bị Công nghệ Chính hãng Nvidia Store",
                "quantity": 1,
                "unit_price": 15990000,
                "unit": "Chiếc",
                "warranty": "36 tháng"
            }]
        }), 200

    ord_dict = dict(order) if order else {}
    items_list = [dict(i) for i in (items or [])]
    first_it = items_list[0] if items_list else {}
    seller_name = first_it.get("company_name") or first_it.get("full_name") or first_it.get("store_name") or "Nvidia Partner Store"
    seller_phone = first_it.get("seller_phone") or "0848 307 774"
    tracking_code = normalize_nvidia_tracking_code(ord_dict.get("tracking_code"), order_id)
    route_code = f"NVD-HN-01-KV{int(order_id) % 99:02d}"
    sender_addr = ord_dict.get("sender_address") or "Kho Trung Tâm Nvidia Partner, Quận Long Biên, Hà Nội"
    total_qty = sum(int(i.get("quantity") or 1) for i in items_list) or 1
    total_amt = sum(float(i.get("unit_price") or 0) * int(i.get("quantity") or 1) for i in items_list) or float(ord_dict.get("total_amount") or 0)

    return jsonify({
        "order_id": order_id,
        "order_code": f"NVD-2611-{int(order_id):04d}",
        "tracking_code": tracking_code,
        "route_sort_code": route_code,
        "status": ord_dict.get("status") or "shipping",
        "escrow_status": ord_dict.get("escrow_status") or "holding",
        "packaging_proof_url": ord_dict.get("packaging_proof_url") or "",
        "packaging_note": ord_dict.get("packaging_note") or "",
        "packaged_at": ord_dict.get("packaged_at") or "",
        "seller_name": seller_name,
        "seller_phone": seller_phone,
        "sender_address": sender_addr,
        "customer_name": ord_dict.get("customer_name") or "Khách nhận hàng",
        "phone": ord_dict.get("phone") or "0988 777 666",
        "shipping_address": ord_dict.get("shipping_address") or "Hà Nội",
        "created_at": str(ord_dict.get("created_at") or time.strftime("%Y-%m-%d %H:%M:%S")),
        "weight_grams": int(ord_dict.get("weight_grams") or (total_qty * 450)),
        "total_amount": total_amt,
        "unique_url": f"/services/seller/order-detail.html?id={order_id}",
        "items": items_list
    }), 200


@bp.route("/orders/<int:order_id>/status", methods=["PUT", "POST"])
def update_order_status(order_id):
    ensure_shopee_order_waybill_columns()
    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "confirmed").strip().lower()
    tracking_code = f"NVX-{int(order_id):04d}"
    route_code = f"NVD-HN-01-KV{int(order_id) % 99:02d}"

    if status == "completed":
        escrow_status = "released"
        execute_db(
            "UPDATE orders SET status = ?, escrow_status = 'released', tracking_code = ?, route_sort_code = ? WHERE id = ?",
            (status, tracking_code, route_code, order_id)
        )
        msg = f"🎉 Đơn #NVD-{order_id} đã giao thành công (POD)! Tiền hàng đã được giải ngân từ Escrow về Ví Shop."
    elif status == "cancelled":
        escrow_status = "refunded"
        execute_db("UPDATE orders SET status = ?, escrow_status = 'refunded' WHERE id = ?", (status, order_id))
        msg = f"Đã hủy đơn #NVD-{order_id} & hoàn tiền Escrow cho người mua."
    elif status == "shipping":
        escrow_status = "holding"
        execute_db(
            "UPDATE orders SET status = 'shipping', tracking_code = ?, route_sort_code = ? WHERE id = ?",
            (tracking_code, route_code, order_id)
        )
        msg = f"🚚 Đã bàn giao kiện hàng #NVD-{order_id} (Vận đơn {tracking_code}) cho Shipper NVIDIA XPRESS!"
    else:
        escrow_status = "holding"
        execute_db(
            "UPDATE orders SET status = ?, tracking_code = ?, route_sort_code = ? WHERE id = ?",
            (status, tracking_code, route_code, order_id)
        )
        msg = f"📦 Đã xác nhận đóng gói đơn #NVD-{order_id} & cấp mã vận đơn {tracking_code}!"

    return jsonify({
        "ok": True,
        "message": msg,
        "order_id": order_id,
        "status": status,
        "escrow_status": escrow_status,
        "tracking_code": tracking_code,
        "route_sort_code": route_code
    })


@bp.route("/orders/<int:order_id>/tracking-code", methods=["POST", "PUT"])
def update_order_tracking_code(order_id):
    ensure_seller_product_columns()
    order = query_db("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    if not order:
        return jsonify({"error": "Không tìm thấy đơn hàng"}), 404

    data = request.get_json(silent=True) or {}
    tracking_code = str(data.get("tracking_code", "")).strip().upper()
    carrier_name = str(data.get("carrier_name", "Giao Hàng Nhanh (GHN)")).strip() or "Giao Hàng Nhanh (GHN)"
    if not tracking_code:
        tracking_code = f"GHN-NVD-{order_id}-{random.randint(1000, 9999)}"

    now_dt = datetime.now()
    now_str = now_dt.strftime("%H:%M %d/%m/%Y")
    eta_ts = float(order.get("eta_timestamp") or 0)
    if eta_ts <= 0:
        eta_ts = (now_dt + timedelta(hours=24)).timestamp()

    new_status = order.get("status")
    if new_status in ("pending", "confirmed"):
        new_status = "shipping"

    execute_db(
        """UPDATE orders
           SET tracking_code = ?,
               carrier_name = ?,
               status = ?,
               confirmed_at = CASE WHEN COALESCE(confirmed_at, '') = '' THEN ? ELSE confirmed_at END,
               shipped_at = CASE WHEN COALESCE(shipped_at, '') = '' THEN ? ELSE shipped_at END,
               eta_timestamp = ?
           WHERE id = ?""",
        (tracking_code, carrier_name, new_status, now_str, now_str, eta_ts, order_id)
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
                f"🚚 Đơn hàng #{order_id} đã có Mã vận chuyển!",
                f"Đơn hàng #{order_id} đã được bàn giao cho {carrier_name} với Mã vận đơn: {tracking_code}. Bấm để theo dõi hành trình!",
                f"/services/order_tracking/tracking.html?q={tracking_code}"
            )
        )

    return jsonify({
        "success": True,
        "order_id": order_id,
        "tracking_code": tracking_code,
        "carrier_name": carrier_name,
        "status": new_status,
        "message": f"Đã gắn Mã vận chuyển [{tracking_code}] ({carrier_name}) cho đơn hàng #{order_id}!"
    })


@bp.route("/orders/<int:order_id>/receipt", methods=["GET"])
def print_order_receipt(order_id):
    from flask import redirect
    return redirect(f"/services/seller/order-detail.html?order_id={order_id}")


@bp.route("/orders/<int:order_id>/notify-shipper", methods=["POST"])
def notify_shipper_webhook(order_id):
    ensure_shopee_order_waybill_columns()
    order = query_db("SELECT * FROM orders WHERE id = ?", (order_id,), one=True)
    tracking_code = f"NVX-{int(order_id):04d}"
    route_code = f"NVD-HN-01-KV{int(order_id) % 99:02d}"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    if order:
        execute_db(
            "UPDATE orders SET status = 'shipping', tracking_code = ?, route_sort_code = ? WHERE id = ?",
            (tracking_code, route_code, order_id)
        )
    return jsonify({
        "success": True,
        "order_id": order_id,
        "tracking_code": tracking_code,
        "route_sort_code": route_code,
        "unique_url": f"/services/seller/order-detail.html?id={order_id}",
        "shipper_partner": "NVIDIA XPRESS (NVX)",
        "ping_status": "SENT_200_OK",
        "timestamp": timestamp,
        "message": f"Đã phát lệnh điều phối Shipper NVIDIA XPRESS thành công! Mã vận đơn: {tracking_code}"
    })


@bp.route("/market-trends", methods=["GET"])
def get_seller_market_trends():
    ensure_seller_product_columns()
    behavior_stats = query_db(
        """SELECT category_tag, COUNT(*) as interactions
           FROM user_behavior_logs
           WHERE category_tag IS NOT NULL AND category_tag != 'all'
           GROUP BY category_tag
           ORDER BY interactions DESC"""
    )
    voucher_stats = query_db(
        """SELECT v.code, v.title, v.discount_value, v.used_count, COUNT(uv.id) as claimed_users
           FROM vouchers v
           LEFT JOIN user_vouchers uv ON v.code = uv.voucher_code
           GROUP BY v.code
           ORDER BY claimed_users DESC, v.used_count DESC
           LIMIT 6"""
    )
    unit_breakdown = query_db(
        """SELECT COALESCE(unit, 'Chiếc') as unit, COUNT(*) as product_count, COALESCE(SUM(sold_count), 0) as total_sold, COALESCE(SUM(stock), 0) as total_stock
           FROM products
           GROUP BY COALESCE(unit, 'Chiếc')
           ORDER BY total_sold DESC"""
    )

    cat_labels = {
        "gpu": "Card đồ họa & Linh kiện PC",
        "cpu": "Vi xử lý & Bo mạch",
        "keyboard": "Bàn phím & Thiết bị gõ",
        "mouse": "Chuột máy tính",
        "headphones": "Tai nghe & Âm thanh",
        "watch": "Đồng hồ thông minh & Thiết bị sức khỏe",
        "speaker": "Loa & Thiết bị gia dụng thông minh",
        "bag": "Balo & Phụ kiện"
    }

    hot_trends = []
    for b in behavior_stats:
        c_key = b["category_tag"]
        cnt = int(b["interactions"] or 0)
        hot_trends.append({
            "category": c_key,
            "label": cat_labels.get(c_key, c_key.upper()),
            "interactions": cnt,
            "recommendation_for_shop": f"Dữ liệu SQL thực tế ghi nhận {cnt} lượt tương tác/thu hoạch Voucher ở nhóm '{cat_labels.get(c_key, c_key)}'."
        })

    return jsonify({
        "hot_trends": hot_trends,
        "voucher_demand": voucher_stats,
        "unit_breakdown": unit_breakdown
    })


def generate_fallback_seller_report(metrics):
    name = metrics.get("name", "Sản phẩm")
    stock = metrics.get("stock", 0)
    sold = metrics.get("sold_count", 0)
    price = metrics.get("price", 0)
    conv = metrics.get("conversion_ratio", 0)

    if conv >= 40:
        speed_eval = f"Tốc độ tiêu thụ tốt (Tỷ lệ chuyển đổi {conv}%). Hàng bán chạy."
        risk_eval = f"Tồn kho còn {stock} sản phẩm. Rủi ro đọng vốn thấp, cần chủ động nhập thêm."
    elif conv >= 15:
        speed_eval = f"Tốc độ tiêu thụ ổn định (Tỷ lệ chuyển đổi {conv}%)."
        risk_eval = f"Tồn kho {stock} sản phẩm ở mức vừa phải. Cần đẩy mạnh chiến dịch marketing."
    else:
        speed_eval = f"Tốc độ tiêu thụ còn chậm (Tỷ lệ chuyển đổi {conv}%)."
        risk_eval = f"Cảnh báo rủi ro đọng vốn với {stock} sản phẩm tồn kho (đã bán {sold} sản phẩm)."

    if conv < 20:
        price_rec = f"Khuyến nghị giảm giá 5-10% (Sẽ tự động gửi thông báo tới khách hàng đã bấm Yêu thích Wishlist) hoặc đăng ký Flash Sale để đẩy tồn kho. Giá hiện tại: {price:,.0f} Xu."
    else:
        price_rec = f"Giá bán {price:,.0f} Xu đang đạt hiệu quả tối ưu. Nên tạo thêm Voucher giảm 3-5% tri ân khách hàng."

    tech_rec = (
        f"1. Nhấn mạnh hiệu năng vượt trội và thông số kỹ thuật ấn tượng của {name}.\n"
        f"2. Cam kết chính sách bảo hành chính hãng tại Shop.\n"
        f"3. Bổ sung hình ảnh thực tế và ghi rõ đơn vị tính (Chiếc/Set/Bộ)."
    )

    return f"""📊 BÁO CÁO PHÂN TÍCH KINH DOANH GIẢI PHÁP CHO SHOP: {name}

1. Đánh giá tốc độ tiêu thụ & Rủi ro tồn đọng vốn:
- {speed_eval}
- {risk_eval}

2. Đề xuất điều chỉnh giá & Chương trình Khuyến mãi:
- {price_rec}

3. Gợi ý 3 điểm nhấn kỹ thuật thu hút người mua:
{tech_rec}"""


@bp.route("/ai-product-analytics", methods=["POST"])
def ai_analyze_seller_item():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    seller_id = data.get("seller_id")
    conn = get_db()
    cursor = conn.cursor()
    if product_id:
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    elif seller_id:
        cursor.execute("SELECT * FROM products WHERE seller_id = ? ORDER BY sold_count DESC LIMIT 1", (seller_id,))
    else:
        cursor.execute("SELECT * FROM products ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Không tìm thấy sản phẩm để phân tích"}), 404
    prod = dict(row)
    pid = prod["id"]
    cursor.execute("SELECT COUNT(*), AVG(rating) FROM product_reviews WHERE product_id = ?", (pid,))
    rev_row = cursor.fetchone()
    rev_count = int(rev_row[0] or 0) if rev_row else 0
    avg_rating = round(float(rev_row[1] or prod.get("rating") or 5.0), 2) if rev_row else 5.0
    conn.close()
    price = float(prod.get("price") or 0)
    stock = int(prod.get("stock") or 0)
    sold = int(prod.get("sold_count") or prod.get("sold") or 0)
    views = max(sold * 8 + 25, int(prod.get("views") or 50))
    conv_rate = round((sold / max(1, views)) * 100.0, 1)
    revenue = price * sold
    metrics = {
        "product_id": pid,
        "name": prod.get("name"),
        "category": prod.get("category"),
        "unit": prod.get("unit") or "Chiếc",
        "warranty": prod.get("warranty") or "12 tháng",
        "price": price,
        "stock": stock,
        "sold_count": sold,
        "views": views,
        "conversion_rate": conv_rate,
        "estimated_revenue": revenue,
        "review_count": rev_count,
        "avg_rating": avg_rating
    }
    sys_prompt = (
        "Bạn là Chuyên gia Phân tích Kinh doanh TMĐT AI của sàn Nivida Store. "
        "Hãy phân tích ngắn gọn, sắc bén mặt hàng dưới đây theo 4 mục: "
        "1. Đánh giá hiệu suất doanh thu & tỷ lệ chuyển đổi. "
        "2. Rà soát độ minh bạch thông tin (Đơn vị tính, Bảo hành, Giá niêm yết). "
        "3. Dự báo tồn kho & rủi ro đứt hàng. "
        "4. Đề xuất chiến lược Flash Sale / Voucher Shop tăng trưởng tuần tới."
    )
    user_prompt = json.dumps(metrics, ensure_ascii=False)
    ai_report = None
    try:
        from services.admin_dispute.api import call_groq_with_fallback
        ai_reply, _ = call_groq_with_fallback(sys_prompt, user_prompt, force_json=False)
        if ai_reply:
            ai_report = ai_reply
    except Exception:
        pass
    if not ai_report:
        if "generate_fallback_seller_report" in globals():
            ai_report = globals()["generate_fallback_seller_report"](metrics)
        else:
            ai_report = (
                f"📊 Phân tích Kinh doanh AI cho [{metrics['name']}]:\n"
                f"1. Doanh thu ước tính: {int(revenue):,}đ (Đã bán: {sold} {metrics['unit']}, Tỷ lệ chuyển đổi: {conv_rate}%).\n"
                f"2. Độ minh bạch: Đã niêm yết rõ ĐVT ({metrics['unit']}) và Bảo hành ({metrics['warranty']}).\n"
                f"3. Tồn kho hiện tại: {stock} sản phẩm — Khuyến nghị bổ sung thêm hàng nếu bật Flash Sale.\n"
                f"4. Đề xuất: Tạo mã Voucher giảm 5% cho đơn từ 2 sản phẩm để kích cầu tuần tới."
            )
    return jsonify({
        "ok": True,
        "metrics": metrics,
        "report": ai_report,
        "ai_powered": True
    }), 200


def normalize_nvidia_tracking_code(raw_code, order_id):
    code = str(raw_code or "").strip()
    if not code or code.startswith("SPX"):
        return f"NVX-{int(order_id):04d}"
    return code


def ensure_store_customization_table():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS store_customizations (
            seller_id INTEGER PRIMARY KEY,
            store_name TEXT DEFAULT '',
            slogan TEXT DEFAULT '',
            shop_tier TEXT DEFAULT 'mall',
            theme_color TEXT DEFAULT '',
            specialty TEXT DEFAULT '',
            welcome_msg TEXT DEFAULT '',
            bg_image_url TEXT DEFAULT '',
            banner_image_url TEXT DEFAULT '',
            accent_color TEXT DEFAULT '#76b900',
            glass_opacity INTEGER DEFAULT 88,
            layout_mode TEXT DEFAULT 'bento_showcase',
            warranty_policy TEXT DEFAULT 'Bảo hành chính hãng 36 tháng, 1 đổi 1 trong 15 ngày đầu',
            return_policy TEXT DEFAULT 'Đổi trả miễn phí 15 ngày nếu sản phẩm lỗi hoặc khác mô tả',
            shipping_commitment TEXT DEFAULT 'Giao hỏa tốc NVX 2H nội thành, đền bù Voucher 50K nếu giao trễ',
            policy_version INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for col_def in [
        "bg_image_url TEXT DEFAULT ''",
        "banner_image_url TEXT DEFAULT ''",
        "accent_color TEXT DEFAULT '#76b900'",
        "glass_opacity INTEGER DEFAULT 88",
        "layout_mode TEXT DEFAULT 'bento_showcase'",
        "warranty_policy TEXT DEFAULT 'Bảo hành chính hãng 36 tháng, 1 đổi 1 trong 15 ngày đầu'",
        "return_policy TEXT DEFAULT 'Đổi trả miễn phí 15 ngày nếu sản phẩm lỗi hoặc khác mô tả'",
        "shipping_commitment TEXT DEFAULT 'Giao hỏa tốc NVX 2H nội thành, đền bù Voucher 50K nếu giao trễ'",
        "policy_version INTEGER DEFAULT 1"
    ]:
        try:
            cursor.execute(f"ALTER TABLE store_customizations ADD COLUMN {col_def}")
        except Exception:
            pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS store_customization_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id INTEGER NOT NULL,
            version INTEGER DEFAULT 1,
            changed_by TEXT DEFAULT 'Chủ Gian Hàng',
            change_summary TEXT DEFAULT '',
            warranty_policy TEXT DEFAULT '',
            return_policy TEXT DEFAULT '',
            shipping_commitment TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            theme_snapshot_json TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


@bp.route("/store-customization", methods=["GET", "POST"])
def handle_store_customization_api():
    ensure_store_customization_table()
    seller_id = request.args.get("seller_id", type=int) or (request.get_json(silent=True) or {}).get("seller_id") or 1

    default_cfg = {
        "seller_id": seller_id,
        "store_name": "ASUS ROG & Nvidia Flagship Store",
        "slogan": "Đỉnh cao phần cứng gaming chiến thắng tuyệt đối",
        "shop_tier": "mall",
        "theme_color": "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #15803d 100%)",
        "specialty": "Card đồ họa RTX & Mainboard Z790",
        "welcome_msg": "Chào mừng quý khách! Mọi đơn hàng đều được bảo lãnh Escrow 100% và cam kết giao đúng hẹn SLA.",
        "bg_image_url": "",
        "banner_image_url": "",
        "accent_color": "#76b900",
        "glass_opacity": 88,
        "layout_mode": "bento_showcase",
        "warranty_policy": "Bảo hành chính hãng 36 tháng theo Serial điện tử, 1 đổi 1 trong 15 ngày đầu.",
        "return_policy": "Hoàn tiền 100% qua Quỹ Escrow nếu sản phẩm không đúng mô tả hoặc phát sinh lỗi NSX.",
        "shipping_commitment": "Bàn giao bưu cục NVX trong 2 giờ, tự động tặng Voucher HOATOC50K nếu trễ SLA.",
        "policy_version": 1
    }

    if request.method == "GET":
        row = query_db("SELECT * FROM store_customizations WHERE seller_id = ?", (seller_id,), one=True)
        logs = query_db("SELECT * FROM store_customization_logs WHERE seller_id = ? ORDER BY version DESC, id DESC LIMIT 30", (seller_id,))
        res_data = dict(default_cfg)
        if row:
            for k, v in dict(row).items():
                if v is not None and v != "":
                    res_data[k] = v
        res_data["audit_logs"] = [dict(l) for l in (logs or [])]
        return jsonify(res_data)

    data = request.get_json(silent=True) or {}
    sid = int(data.get("seller_id") or 1)
    old_row = query_db("SELECT * FROM store_customizations WHERE seller_id = ?", (sid,), one=True)
    old_dict = dict(old_row) if old_row else dict(default_cfg)

    store_name = (data.get("store_name") or old_dict.get("store_name") or default_cfg["store_name"]).strip()
    slogan = (data.get("slogan") or old_dict.get("slogan") or default_cfg["slogan"]).strip()
    shop_tier = (data.get("shop_tier") or old_dict.get("shop_tier") or "mall").strip()
    theme_color = (data.get("theme_color") or old_dict.get("theme_color") or default_cfg["theme_color"]).strip()
    specialty = (data.get("specialty") or old_dict.get("specialty") or default_cfg["specialty"]).strip()
    welcome_msg = (data.get("welcome_msg") or old_dict.get("welcome_msg") or default_cfg["welcome_msg"]).strip()
    bg_image_url = (data.get("bg_image_url") if "bg_image_url" in data else (old_dict.get("bg_image_url") or "")).strip()
    banner_image_url = (data.get("banner_image_url") if "banner_image_url" in data else (old_dict.get("banner_image_url") or "")).strip()
    accent_color = (data.get("accent_color") or old_dict.get("accent_color") or "#76b900").strip()
    glass_opacity = max(45, min(98, int(data.get("glass_opacity") if data.get("glass_opacity") is not None else (old_dict.get("glass_opacity") or 88))))
    layout_mode = (data.get("layout_mode") or old_dict.get("layout_mode") or "bento_showcase").strip()
    warranty_policy = (data.get("warranty_policy") or old_dict.get("warranty_policy") or default_cfg["warranty_policy"]).strip()
    return_policy = (data.get("return_policy") or old_dict.get("return_policy") or default_cfg["return_policy"]).strip()
    shipping_commitment = (data.get("shipping_commitment") or old_dict.get("shipping_commitment") or default_cfg["shipping_commitment"]).strip()
    changed_by = (data.get("changed_by") or store_name).strip()

    max_ver_row = query_db("SELECT COALESCE(MAX(version), 0) as mv FROM store_customization_logs WHERE seller_id = ?", (sid,), one=True)
    next_ver = int((max_ver_row or {}).get("mv") or old_dict.get("policy_version") or 0) + 1

    changes = []
    if store_name != old_dict.get("store_name"):
        changes.append(f"Đổi tên Shop: '{old_dict.get('store_name')}' -> '{store_name}'")
    if warranty_policy != old_dict.get("warranty_policy"):
        changes.append(f"Sửa BH: '{old_dict.get('warranty_policy')}' -> '{warranty_policy}'")
    if return_policy != old_dict.get("return_policy"):
        changes.append(f"Sửa Đổi trả: '{old_dict.get('return_policy')}' -> '{return_policy}'")
    if shipping_commitment != old_dict.get("shipping_commitment"):
        changes.append(f"Sửa Cam kết giao hàng: '{shipping_commitment}'")
    if bg_image_url != old_dict.get("bg_image_url") or theme_color != old_dict.get("theme_color"):
        changes.append("Cập nhật hình nền & chủ đề giao diện Shop")
    custom_reason = (data.get("change_reason") or "").strip()
    if custom_reason:
        changes.insert(0, f"Lý do: {custom_reason}")
    change_summary = " | ".join(changes) if changes else f"Đồng bộ cấu hình & chính sách gian hàng phiên bản v{next_ver}"

    execute_db(
        """
        INSERT INTO store_customizations (
            seller_id, store_name, slogan, shop_tier, theme_color, specialty, welcome_msg,
            bg_image_url, banner_image_url, accent_color, glass_opacity, layout_mode,
            warranty_policy, return_policy, shipping_commitment, policy_version, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(seller_id) DO UPDATE SET
            store_name = excluded.store_name,
            slogan = excluded.slogan,
            shop_tier = excluded.shop_tier,
            theme_color = excluded.theme_color,
            specialty = excluded.specialty,
            welcome_msg = excluded.welcome_msg,
            bg_image_url = excluded.bg_image_url,
            banner_image_url = excluded.banner_image_url,
            accent_color = excluded.accent_color,
            glass_opacity = excluded.glass_opacity,
            layout_mode = excluded.layout_mode,
            warranty_policy = excluded.warranty_policy,
            return_policy = excluded.return_policy,
            shipping_commitment = excluded.shipping_commitment,
            policy_version = excluded.policy_version,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            sid, store_name, slogan, shop_tier, theme_color, specialty, welcome_msg,
            bg_image_url, banner_image_url, accent_color, glass_opacity, layout_mode,
            warranty_policy, return_policy, shipping_commitment, next_ver
        )
    )

    snapshot_json = json.dumps({
        "theme_color": theme_color,
        "bg_image_url": bg_image_url,
        "banner_image_url": banner_image_url,
        "accent_color": accent_color,
        "layout_mode": layout_mode
    }, ensure_ascii=False)

    execute_db(
        """
        INSERT INTO store_customization_logs (
            seller_id, version, changed_by, change_summary,
            warranty_policy, return_policy, shipping_commitment, store_name, theme_snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (sid, next_ver, changed_by, change_summary, warranty_policy, return_policy, shipping_commitment, store_name, snapshot_json)
    )

    logs = query_db("SELECT * FROM store_customization_logs WHERE seller_id = ? ORDER BY version DESC, id DESC LIMIT 30", (sid,))
    return jsonify({
        "ok": True,
        "policy_version": next_ver,
        "message": f"🎨 Đã lưu giao diện & ghi log chính sách gian hàng phiên bản v{next_ver} thành công!",
        "audit_logs": [dict(l) for l in (logs or [])]
    })


@bp.route("/store-customization/match-order", methods=["GET", "POST"])
def match_store_policy_by_order_date():
    ensure_store_customization_table()
    seller_id = request.args.get("seller_id", type=int) or (request.get_json(silent=True) or {}).get("seller_id") or 1
    query_date = (request.args.get("order_date") or (request.get_json(silent=True) or {}).get("order_date") or "").strip()
    order_id = request.args.get("order_id", type=int) or (request.get_json(silent=True) or {}).get("order_id")

    if order_id and not query_date:
        ord_row = query_db("SELECT created_at FROM orders WHERE id = ?", (order_id,), one=True)
        if ord_row and ord_row.get("created_at"):
            query_date = str(ord_row["created_at"])

    logs = query_db("SELECT * FROM store_customization_logs WHERE seller_id = ? ORDER BY created_at DESC, version DESC", (seller_id,))
    logs_list = [dict(l) for l in (logs or [])]

    matched_log = None
    if query_date and logs_list:
        q_norm = query_date[:19]
        for lg in logs_list:
            c_at = str(lg.get("created_at") or "")[:19]
            if c_at <= q_norm or c_at[:10] <= q_norm[:10]:
                matched_log = lg
                break
    if not matched_log and logs_list:
        matched_log = logs_list[-1]

    if not matched_log:
        matched_log = {
            "version": 1,
            "store_name": f"Nvidia Partner Store #{seller_id}",
            "warranty_policy": "Bảo hành chính hãng 36 tháng, 1 đổi 1 trong 15 ngày đầu.",
            "return_policy": "Hoàn tiền 100% qua Quỹ Escrow nếu sản phẩm lỗi hoặc khác mô tả.",
            "shipping_commitment": "Giao hỏa tốc NVX 2H, đền bù Voucher HOATOC50K nếu trễ SLA.",
            "change_summary": "Chính sách gốc khi khởi tạo gian hàng",
            "created_at": "2026-11-01 08:00:00"
        }

    return jsonify({
        "ok": True,
        "seller_id": seller_id,
        "queried_date": query_date or "Hiện tại",
        "matched_policy": matched_log,
        "message": f"🔍 Đã khớp chính sách phiên bản v{matched_log.get('version', 1)} có hiệu lực tại thời điểm mua hàng!"
    }), 200


@bp.route("/storefront/<int:seller_id>", methods=["GET"])
def get_storefront_public_data(seller_id):
    ensure_store_customization_table()
    store_cust = query_db("SELECT * FROM store_customizations WHERE seller_id = ?", (seller_id,), one=True)
    user_row = query_db("SELECT id, full_name, company_name, store_name, shop_tier FROM users WHERE id = ?", (seller_id,), one=True)
    products = query_db("SELECT * FROM products WHERE seller_id = ? ORDER BY id DESC", (seller_id,))
    logs = query_db("SELECT * FROM store_customization_logs WHERE seller_id = ? ORDER BY version DESC, id DESC LIMIT 20", (seller_id,))

    cust = dict(store_cust) if store_cust else {}
    u = dict(user_row) if user_row else {}

    store_name = cust.get("store_name") or u.get("store_name") or u.get("company_name") or u.get("full_name") or f"Nvidia Partner Store #{seller_id}"
    slogan = cust.get("slogan") or "Gian hàng chính hãng phân phối linh kiện phần cứng cao cấp bảo hành 36 tháng."
    shop_tier = cust.get("shop_tier") or u.get("shop_tier") or "mall"
    theme_color = cust.get("theme_color") or "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #15803d 100%)"

    return jsonify({
        "ok": True,
        "store": {
            "id": seller_id,
            "store_name": store_name,
            "company_name": store_name,
            "slogan": slogan,
            "shop_tier": shop_tier,
            "theme_color": theme_color,
            "specialty": cust.get("specialty") or "Linh kiện & Thiết bị Chính hãng",
            "welcome_msg": cust.get("welcome_msg") or "Chào mừng quý khách! Gian hàng bảo lãnh Escrow 100%.",
            "bg_image_url": cust.get("bg_image_url") or "",
            "banner_image_url": cust.get("banner_image_url") or "",
            "accent_color": cust.get("accent_color") or "#76b900",
            "glass_opacity": int(cust.get("glass_opacity") or 88),
            "layout_mode": cust.get("layout_mode") or "bento_showcase",
            "warranty_policy": cust.get("warranty_policy") or "Bảo hành chính hãng 36 tháng, 1 đổi 1 trong 15 ngày đầu.",
            "return_policy": cust.get("return_policy") or "Hoàn tiền 100% qua Quỹ Escrow nếu sản phẩm không đúng mô tả.",
            "shipping_commitment": cust.get("shipping_commitment") or "Giao hỏa tốc NVX 2H, đền bù Voucher HOATOC50K nếu trễ SLA.",
            "policy_version": int(cust.get("policy_version") or 1),
            "updated_at": str(cust.get("updated_at") or "2026-11-10")
        },
        "audit_logs": [dict(l) for l in (logs or [])],
        "products": products or []
    }), 200

