from flask import Blueprint, request, jsonify
from database.db_manager import get_db, query_db, execute_db

bp = Blueprint("compare_service", __name__)


def ensure_compare_sql_tables():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(products)")
    p_cols = {r["name"] for r in cur.fetchall()}
    if "unit" not in p_cols:
        cur.execute("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'Chiếc'")
    if "warranty_policy" not in p_cols:
        cur.execute("ALTER TABLE products ADD COLUMN warranty_policy TEXT DEFAULT 'Bảo hành 12 tháng tại Shop'")

    cur.execute("PRAGMA table_info(users)")
    u_cols = {r["name"] for r in cur.fetchall()}
    if "shop_tier" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_tier TEXT DEFAULT 'normal'")
    if "verified_tick" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN verified_tick INTEGER DEFAULT 0")

    cur.execute(
        """CREATE TABLE IF NOT EXISTS user_favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            initial_price REAL DEFAULT 0,
            target_discount_pct INTEGER DEFAULT 5,
            notify_enabled INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )"""
    )
    cur.execute("PRAGMA table_info(user_favorites)")
    fav_cols = {r["name"] for r in cur.fetchall()}
    if "initial_price" not in fav_cols:
        cur.execute("ALTER TABLE user_favorites ADD COLUMN initial_price REAL DEFAULT 0")
    if "target_discount_pct" not in fav_cols:
        cur.execute("ALTER TABLE user_favorites ADD COLUMN target_discount_pct INTEGER DEFAULT 5")
    if "notify_enabled" not in fav_cols:
        cur.execute("ALTER TABLE user_favorites ADD COLUMN notify_enabled INTEGER DEFAULT 1")

    cur.execute(
        """CREATE TABLE IF NOT EXISTS user_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER DEFAULT 0,
            order_id INTEGER DEFAULT 0,
            notif_type TEXT DEFAULT 'wishlist_sale',
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            discount_pct REAL DEFAULT 0,
            link_url TEXT DEFAULT '/services/home/index.html',
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )"""
    )

    cur.execute(
        """CREATE TABLE IF NOT EXISTS user_cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            cat_suggested INTEGER DEFAULT 0,
            recommend_label TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )"""
    )
    cur.execute("PRAGMA table_info(user_cart_items)")
    c_cols = {r["name"] for r in cur.fetchall()}
    if "cat_suggested" not in c_cols:
        cur.execute("ALTER TABLE user_cart_items ADD COLUMN cat_suggested INTEGER DEFAULT 0")
    if "recommend_label" not in c_cols:
        cur.execute("ALTER TABLE user_cart_items ADD COLUMN recommend_label TEXT DEFAULT ''")

    conn.commit()
    conn.close()


def trigger_wishlist_price_drop_notifications(product_id, old_ref_price, new_price, prod_name):
    ensure_compare_sql_tables()
    old_val = float(old_ref_price or 0)
    new_val = float(new_price or 0)
    if new_val <= 0 or old_val <= new_val:
        return 0

    drop_pct = round(((old_val - new_val) / old_val) * 100.0, 1)
    if drop_pct <= 0:
        return 0

    fav_users = query_db(
        """SELECT user_id, COALESCE(initial_price, 0) as initial_price,
                  COALESCE(target_discount_pct, 5) as target_discount_pct,
                  COALESCE(notify_enabled, 1) as notify_enabled
           FROM user_favorites
           WHERE product_id = ? AND COALESCE(notify_enabled, 1) = 1""",
        (int(product_id),)
    )
    sent_cnt = 0
    for f in fav_users:
        uid = f["user_id"]
        base_p = max(old_val, float(f.get("initial_price") or 0))
        actual_pct = round(((base_p - new_val) / base_p) * 100.0, 1) if base_p > new_val else drop_pct
        min_wanted = int(f.get("target_discount_pct") or 1)
        if actual_pct >= max(1, min_wanted):
            title = f"🔥 Giảm giá -{actual_pct}% món bạn Yêu thích!"
            msg = (
                f"Sản phẩm \"{prod_name}\" trong danh sách Yêu thích (Wishlist) của bạn vừa giảm {actual_pct}% "
                f"(Từ {int(base_p):,} Xu xuống còn {int(new_val):,} Xu). Mua ngay kẻo lỡ!"
            )
            execute_db(
                """INSERT INTO user_notifications
                   (user_id, product_id, notif_type, title, message, discount_pct, link_url, is_read)
                   VALUES (?, ?, 'wishlist_sale', ?, ?, ?, ?, 0)""",
                (uid, int(product_id), title, msg, actual_pct, f"/services/product/product-detail.html?id={product_id}")
            )
            execute_db(
                "UPDATE user_favorites SET initial_price = ? WHERE user_id = ? AND product_id = ?",
                (new_val, uid, int(product_id))
            )
            sent_cnt += 1
    return sent_cnt


@bp.route("/favorites", methods=["GET"])
def get_user_favorites():
    ensure_compare_sql_tables()
    user_id = request.args.get("user_id", "").strip()
    if not user_id or not user_id.isdigit():
        return jsonify({"favorite_ids": [], "wishlist_items": []})
    uid = int(user_id)
    rows = query_db(
        """SELECT uf.*, p.name, p.price, p.old_price, p.image_url, p.category,
                  COALESCE(p.unit, 'Chiếc') as unit
           FROM user_favorites uf
           JOIN products p ON uf.product_id = p.id
           WHERE uf.user_id = ?
           ORDER BY uf.id DESC""",
        (uid,)
    )
    return jsonify({
        "favorite_ids": [r["product_id"] for r in rows],
        "wishlist_items": rows
    })


@bp.route("/favorites/clear", methods=["POST"])
def clear_user_favorites():
    ensure_compare_sql_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if user_id and str(user_id).isdigit():
        execute_db("DELETE FROM user_favorites WHERE user_id = ?", (int(user_id),))
    return jsonify({"message": "Đã xóa toàn bộ danh sách Ưa thích", "favorite_ids": []})


@bp.route("/favorites/toggle", methods=["POST"])
def toggle_user_favorite():
    ensure_compare_sql_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    product_id = data.get("product_id")
    target_pct = int(data.get("target_discount_pct", 5) or 5)
    if not user_id or not product_id:
        return jsonify({"error": "Thiếu thông tin người dùng hoặc sản phẩm"}), 400

    uid = int(user_id)
    pid = int(product_id)
    existing = query_db(
        "SELECT id FROM user_favorites WHERE user_id = ? AND product_id = ?",
        (uid, pid),
        one=True
    )
    if existing:
        execute_db("DELETE FROM user_favorites WHERE id = ?", (existing["id"],))
        is_fav = False
        msg = "Đã bỏ sản phẩm khỏi danh sách Yêu thích (Wishlist)"
    else:
        prod = query_db("SELECT id, name, category, price, old_price FROM products WHERE id = ?", (pid,), one=True)
        init_price = float(prod["price"] if prod else 0)
        execute_db(
            """INSERT OR REPLACE INTO user_favorites
               (user_id, product_id, initial_price, target_discount_pct, notify_enabled)
               VALUES (?, ?, ?, ?, 1)""",
            (uid, pid, init_price, target_pct)
        )
        execute_db(
            "INSERT INTO user_behavior_logs (user_id, action_type, category_tag, item_ref) VALUES (?, 'favorite_product', ?, ?)",
            (uid, prod["category"] if prod else "gpu", str(pid))
        )
        if prod and float(prod.get("old_price") or 0) > float(prod.get("price") or 0):
            old_p = float(prod["old_price"])
            cur_p = float(prod["price"])
            cur_disc = round(((old_p - cur_p) / old_p) * 100.0, 1)
            if cur_disc >= target_pct:
                execute_db(
                    """INSERT INTO user_notifications
                       (user_id, product_id, notif_type, title, message, discount_pct, link_url, is_read)
                       VALUES (?, ?, 'wishlist_sale', ?, ?, ?, ?, 0)""",
                    (
                        uid,
                        pid,
                        f"❤️ Món bạn vừa Yêu thích đang giảm -{cur_disc}%!",
                        f"\"{prod['name']}\" hiện đang giảm {cur_disc}% (Giá gốc {int(old_p):,} Xu chỉ còn {int(cur_p):,} Xu). Hệ thống sẽ tiếp tục báo cho bạn khi giảm thêm ≥ {target_pct}%!",
                        cur_disc,
                        f"/services/product/product-detail.html?id={pid}"
                    )
                )
        is_fav = True
        msg = f"❤️ Đã thêm vào Yêu thích (Wishlist) & Bật thông báo khi giảm giá ≥ {target_pct}%!"

    rows = query_db("SELECT product_id FROM user_favorites WHERE user_id = ? ORDER BY id DESC", (uid,))
    return jsonify({
        "message": msg,
        "is_favorite": is_fav,
        "favorite_ids": [r["product_id"] for r in rows]
    })


@bp.route("/wishlist-settings", methods=["POST"])
def update_wishlist_alert_settings():
    ensure_compare_sql_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    product_id = data.get("product_id")
    target_pct = max(1, min(90, int(data.get("target_discount_pct", 5) or 5)))
    notify_enabled = 1 if data.get("notify_enabled", True) else 0

    if not user_id or not str(user_id).isdigit():
        return jsonify({"error": "Vui lòng đăng nhập để cài đặt thông báo Wishlist"}), 401

    uid = int(user_id)
    if product_id:
        execute_db(
            "UPDATE user_favorites SET target_discount_pct = ?, notify_enabled = ? WHERE user_id = ? AND product_id = ?",
            (target_pct, notify_enabled, uid, int(product_id))
        )
    else:
        execute_db(
            "UPDATE user_favorites SET target_discount_pct = ?, notify_enabled = ? WHERE user_id = ?",
            (target_pct, notify_enabled, uid)
        )
    return jsonify({
        "message": f"🔔 Đã cập nhật nhận thông báo khi sản phẩm Yêu thích giảm giá từ {target_pct}% trở lên!"
    })


@bp.route("/wishlist-simulate-drop", methods=["POST"])
def simulate_wishlist_price_drop():
    ensure_compare_sql_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    product_id = data.get("product_id")
    drop_pct = max(5, min(50, int(data.get("drop_pct", 15) or 15)))

    if not user_id or not str(user_id).isdigit():
        return jsonify({"error": "Vui lòng đăng nhập"}), 401
    uid = int(user_id)

    if product_id:
        prod = query_db("SELECT * FROM products WHERE id = ?", (int(product_id),), one=True)
    else:
        fav = query_db(
            """SELECT p.* FROM user_favorites uf
               JOIN products p ON uf.product_id = p.id
               WHERE uf.user_id = ? ORDER BY uf.id DESC LIMIT 1""",
            (uid,),
            one=True
        )
        prod = fav or query_db("SELECT * FROM products ORDER BY id ASC LIMIT 1", one=True)

    if not prod:
        return jsonify({"error": "Không tìm thấy sản phẩm để kích hoạt thông báo giảm giá"}), 404

    pid = prod["id"]
    old_p = float(prod["price"] or 500000)
    new_p = round(old_p * (100 - drop_pct) / 100.0, -3)
    if new_p <= 0:
        new_p = int(old_p * 0.85)

    execute_db(
        "INSERT OR IGNORE INTO user_favorites (user_id, product_id, initial_price, target_discount_pct, notify_enabled) VALUES (?, ?, ?, 5, 1)",
        (uid, pid, old_p)
    )
    execute_db(
        "UPDATE products SET old_price = ?, price = ?, discount_badge = ? WHERE id = ?",
        (old_p, new_p, f"-{drop_pct}%", pid)
    )
    sent = trigger_wishlist_price_drop_notifications(pid, old_p, new_p, prod["name"])
    if sent == 0:
        execute_db(
            """INSERT INTO user_notifications
               (user_id, product_id, notif_type, title, message, discount_pct, link_url, is_read)
               VALUES (?, ?, 'wishlist_sale', ?, ?, ?, ?, 0)""",
            (
                uid,
                pid,
                f"🔥 Giảm giá -{drop_pct}% món bạn Yêu thích!",
                f"Sản phẩm \"{prod['name']}\" trong Wishlist của bạn vừa giảm {drop_pct}% (Từ {int(old_p):,} Xu xuống còn {int(new_p):,} Xu)!",
                drop_pct,
                f"/services/product/product-detail.html?id={pid}"
            )
        )

    return jsonify({
        "message": f"🔔 Đã kích hoạt giảm giá -{drop_pct}% cho \"{prod['name']}\" và bắn thông báo về Chuông của bạn!",
        "product_id": pid,
        "old_price": old_p,
        "new_price": new_p,
        "drop_pct": drop_pct
    })


@bp.route("/notifications", methods=["GET"])
def get_user_notifications():
    ensure_compare_sql_tables()
    user_id = request.args.get("user_id", "").strip()
    if not user_id or not user_id.isdigit():
        return jsonify({"notifications": [], "unread_count": 0, "wishlist_items": []})

    uid = int(user_id)
    notifs = query_db(
        "SELECT * FROM user_notifications WHERE user_id = ? ORDER BY id DESC LIMIT 25",
        (uid,)
    )
    unread_cnt = sum(1 for n in notifs if int(n.get("is_read") or 0) == 0)
    wishlist = query_db(
        """SELECT uf.product_id, uf.initial_price,
                  COALESCE(uf.target_discount_pct, 5) as target_discount_pct,
                  COALESCE(uf.notify_enabled, 1) as notify_enabled,
                  p.name, p.price, p.old_price, p.discount_badge
           FROM user_favorites uf
           JOIN products p ON uf.product_id = p.id
           WHERE uf.user_id = ?
           ORDER BY uf.id DESC""",
        (uid,)
    )
    return jsonify({
        "notifications": notifs,
        "unread_count": unread_cnt,
        "wishlist_items": wishlist
    })


@bp.route("/notifications/read", methods=["POST"])
def mark_notifications_read():
    ensure_compare_sql_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    notif_id = data.get("notif_id")
    if not user_id or not str(user_id).isdigit():
        return jsonify({"updated": False})

    uid = int(user_id)
    if notif_id:
        execute_db("UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (int(notif_id), uid))
    else:
        execute_db("UPDATE user_notifications SET is_read = 1 WHERE user_id = ?", (uid,))
    return jsonify({"updated": True, "message": "Đã đánh dấu đã đọc thông báo"})


@bp.route("/cart/sync", methods=["POST"])
def sync_user_cart_to_sql():
    try:
        ensure_compare_sql_tables()
        data = request.get_json(silent=True) or {}
        user_id = data.get("user_id")
        items = data.get("items", [])
        if not user_id or not str(user_id).isdigit():
            return jsonify({"synced": False})

        uid = int(user_id)
        execute_db("DELETE FROM user_cart_items WHERE user_id = ?", (uid,))
        for it in items:
            if isinstance(it, dict) and it.get("id"):
                cat_sug = 1 if it.get("cat_suggested") else 0
                rec_lbl = str(it.get("recommend_label") or ("🐱 Mèo AI Đề Xuất" if cat_sug else "")).strip()
                execute_db(
                    """INSERT OR REPLACE INTO user_cart_items
                       (user_id, product_id, quantity, cat_suggested, recommend_label, updated_at)
                       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                    (uid, int(it["id"]), max(1, int(it.get("quantity") or 1)), cat_sug, rec_lbl)
                )
        return jsonify({"synced": True, "count": len(items)})
    except Exception as e:
        return jsonify({"synced": False, "error": str(e)}), 200


@bp.route("/list", methods=["GET"])
def get_comparable_products():
    ensure_compare_sql_tables()
    user_id = request.args.get("user_id", "").strip()
    fav_raw = request.args.get("fav_ids", "").strip()
    cart_raw = request.args.get("cart_ids", "").strip()

    all_rows = query_db(
        """SELECT p.*,
                  COALESCE(u.company_name, u.full_name, 'Nivida Official Store') as company_name,
                  COALESCE(u.shop_tier, 'normal') as shop_tier,
                  COALESCE(u.verified_tick, 0) as verified_tick,
                  COALESCE(p.unit, 'Chiếc') as unit,
                  COALESCE(p.warranty_policy, 'Bảo hành 12 tháng tại Shop') as warranty_policy
           FROM products p
           LEFT JOIN users u ON p.seller_id = u.id
           ORDER BY p.sold_count DESC, p.price DESC"""
    )
    prod_map = {r["id"]: r for r in all_rows}

    fav_ids = [int(x) for x in fav_raw.split(",") if x.strip().isdigit()] if fav_raw else []
    cart_ids = [int(x) for x in cart_raw.split(",") if x.strip().isdigit()] if cart_raw else []

    if user_id and user_id.isdigit():
        uid = int(user_id)
        sql_favs = query_db("SELECT product_id FROM user_favorites WHERE user_id = ? ORDER BY id DESC", (uid,))
        for r in sql_favs:
            if r["product_id"] not in fav_ids:
                fav_ids.append(r["product_id"])

        sql_carts = query_db("SELECT product_id FROM user_cart_items WHERE user_id = ? ORDER BY id DESC", (uid,))
        for r in sql_carts:
            if r["product_id"] not in cart_ids:
                cart_ids.append(r["product_id"])

    favorite_products = [prod_map[i] for i in fav_ids if i in prod_map]
    cart_products = [prod_map[i] for i in cart_ids if i in prod_map]

    return jsonify({
        "favorite_products": favorite_products,
        "cart_products": cart_products,
        "all_catalog": all_rows
    })
