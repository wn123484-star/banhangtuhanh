import os
import re
import math
import unicodedata
from flask import Blueprint, request, jsonify
from database.db_manager import get_db, query_db, ensure_admin_account

bp = Blueprint("home_service", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAX_USER_VOUCHER_CLAIMS = 3
DISPLAY_VOUCHER_POOL_SIZE = 5

SYNONYM_CATEGORY_MAP = {
    "gpu": ["gpu", "card", "vga", "rtx", "geforce", "do hoa", "man hinh", "pc", "may tinh", "gaming", "render", "ai", "blackwell", "gddr7"],
    "keyboard": ["ban phim", "phim", "keyboard", "keycap", "switch", "hotswap", "gasket", "go phim", "van phong", "combo"],
    "mouse": ["chuot", "mouse", "wireless", "pixart", "polling", "dpi", "luot"],
    "headphones": ["tai nghe", "headphone", "earphone", "anc", "chong on", "am thanh", "nghe nhac", "mic", "bluetooth"],
    "watch": ["dong ho", "watch", "smartwatch", "amoled", "suc khoe", "massage", "co vai gay", "dau moi", "nhip tim", "the thao", "binh giu nhiet", "quat", "ong ba", "cha me", "qua tang"],
    "speaker": ["loa", "speaker", "soundbar", "den", "den ban", "decor", "phong ngu", "sac khong day", "loc khong khi", "ion", "bui min", "gia dung"],
    "bag": ["balo", "tui", "bag", "deo cheo", "chong soc", "chong nuoc", "laptop", "di hoc", "sinh vien", "hoc sinh", "du lich", "canvas"]
}


def remove_accents(text):
    if not text:
        return ""
    s = str(text).replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    return "".join(ch for ch in s if unicodedata.category(ch) != "Mn").lower()


def is_garbage_query(q):
    clean = (q or "").strip()
    if not clean:
        return False
    norm = remove_accents(clean)
    if len(norm) > 40 and " " not in norm:
        return True

    alnum_tokens = re.findall(r"[a-z0-9]+", norm)
    if not alnum_tokens:
        return True

    valid_tech_tokens = {"rtx", "gtx", "gpu", "cpu", "ram", "psu", "anc", "led", "usb", "rgb", "amoled", "5atm", "15w", "8k", "2k", "4k", "4070", "5090", "3395", "gddr7", "pc", "ai"}
    vowels = set("aeiouy")

    for tok in alnum_tokens:
        if tok in valid_tech_tokens or tok.isdigit():
            continue
        has_alpha = any(c.isalpha() for c in tok)
        has_digit = any(c.isdigit() for c in tok)
        if has_alpha and has_digit and len(tok) >= 7:
            return True
        alpha_only = "".join(c for c in tok if c.isalpha())
        if len(alpha_only) >= 5:
            vowel_cnt = sum(1 for c in alpha_only if c in vowels)
            if vowel_cnt == 0:
                return True
            if re.search(r"[bcdfghjklmnpqrstvwxz]{5,}", alpha_only):
                return True
        if len(alpha_only) >= 9 and len(set(alpha_only)) <= 2:
            return True

    return False


def smart_search_products(all_products, raw_query):
    q_clean = (raw_query or "").strip()
    if not q_clean:
        return all_products, [], {"is_garbage": False, "exact_count": len(all_products), "related_count": 0}

    if is_garbage_query(q_clean):
        return [], [], {"is_garbage": True, "exact_count": 0, "related_count": 0}

    q_norm = remove_accents(q_clean)
    q_tokens = [t for t in re.findall(r"[a-z0-9]+", q_norm) if len(t) >= 2]
    if not q_tokens:
        return [], [], {"is_garbage": True, "exact_count": 0, "related_count": 0}

    inferred_categories = set()
    for cat, kw_list in SYNONYM_CATEGORY_MAP.items():
        for kw in kw_list:
            if kw in q_norm or any(tok == kw for tok in q_tokens):
                inferred_categories.add(cat)

    exact_matches = []
    partial_matches = []

    for p in all_products:
        name_norm = remove_accents(p.get("name", ""))
        brand_norm = remove_accents(p.get("brand", ""))
        cat_norm = remove_accents(p.get("category", ""))
        desc_norm = remove_accents(p.get("description", ""))
        shop_norm = remove_accents(p.get("company_name", ""))
        unit_norm = remove_accents(p.get("unit", ""))

        primary_text = f"{name_norm} {brand_norm} {cat_norm} {unit_norm} {shop_norm}"
        full_text = f"{primary_text} {desc_norm}"
        word_set = set(re.findall(r"[a-z0-9]+", full_text))

        if q_norm in primary_text:
            exact_matches.append((100 + int(p.get("sold_count") or 0), p))
            continue

        matched_tokens_primary = sum(1 for tok in q_tokens if tok in primary_text)
        matched_tokens_full = sum(
            1 for tok in q_tokens
            if tok in word_set or any(w.startswith(tok) for w in word_set if len(tok) >= 3)
        )

        if matched_tokens_primary == len(q_tokens) or matched_tokens_full == len(q_tokens):
            exact_matches.append((75 + matched_tokens_primary * 10, p))
        elif matched_tokens_full > 0:
            partial_matches.append((40 + matched_tokens_full * 15, p))
        elif p.get("category") in inferred_categories:
            partial_matches.append((25 + int(p.get("rating", 4.8) * 3), p))

    exact_matches.sort(key=lambda x: x[0], reverse=True)
    partial_matches.sort(key=lambda x: x[0], reverse=True)

    exact_list = [item[1] for item in exact_matches]
    exact_ids = {p["id"] for p in exact_list}

    related_list = [item[1] for item in partial_matches if item[1]["id"] not in exact_ids]

    if not exact_list and not related_list and inferred_categories:
        for p in all_products:
            if p.get("category") in inferred_categories:
                related_list.append(p)

    return exact_list, related_list[:8], {
        "is_garbage": False,
        "exact_count": len(exact_list),
        "related_count": len(related_list[:8])
    }


def ensure_home_schema():
    conn = get_db()
    ensure_admin_account(conn)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(users)")
    u_cols = {r["name"] for r in cur.fetchall()}
    if "gender" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT 'other'")
    if "shop_tier" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_tier TEXT DEFAULT 'normal'")
    if "shop_theme_color" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_theme_color TEXT DEFAULT 'rgb(118, 185, 0)'")
    if "shop_slogan" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_slogan TEXT DEFAULT ''")
    if "verified_tick" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN verified_tick INTEGER DEFAULT 0")

    cur.execute("PRAGMA table_info(products)")
    p_cols = {r["name"] for r in cur.fetchall()}
    if "unit" not in p_cols:
        cur.execute("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'Chiếc'")
    if "target_gender" not in p_cols:
        cur.execute("ALTER TABLE products ADD COLUMN target_gender TEXT DEFAULT 'all'")
    if "sponsor_tag" not in p_cols:
        cur.execute("ALTER TABLE products ADD COLUMN sponsor_tag TEXT DEFAULT ''")
    if "warranty_policy" not in p_cols:
        cur.execute("ALTER TABLE products ADD COLUMN warranty_policy TEXT DEFAULT 'Bảo hành 12 tháng tại Shop'")

    cur.execute(
        """CREATE TABLE IF NOT EXISTS user_behavior_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action_type TEXT,
            category_tag TEXT,
            item_ref TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    conn.commit()
    conn.close()


@bp.route("/site-assets", methods=["GET", "POST"])
def get_site_assets():
    import base64
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    icons_dir = os.path.join(base_dir, "assets", "icons")
    banners_dir = os.path.join(base_dir, "assets", "banners")
    os.makedirs(icons_dir, exist_ok=True)

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        action = str(data.get("action") or "").strip().lower()
        raw_key = str(data.get("icon_key") or "").strip().lower()
        safe_key = "".join(ch for ch in raw_key if ch.isalnum() or ch == "_")
        if not safe_key:
            return jsonify({"error": "Mã icon không hợp lệ"}), 400

        if action == "delete":
            removed = 0
            for f in os.listdir(icons_dir):
                name_no_ext = os.path.splitext(f.lower())[0]
                if name_no_ext == safe_key:
                    try:
                        os.remove(os.path.join(icons_dir, f))
                        removed += 1
                    except Exception:
                        pass
            return jsonify({"message": f"Đã xóa icon [{safe_key}], hệ thống tự động lùi về icon mặc định!", "removed": removed})

        if action == "upload":
            data_url = str(data.get("data_url") or "").strip()
            if not data_url or "," not in data_url:
                return jsonify({"error": "Dữ liệu ảnh tải lên không hợp lệ"}), 400
            header_part, b64_part = data_url.split(",", 1)
            ext = "png"
            if "svg" in header_part:
                ext = "svg"
            elif "webp" in header_part:
                ext = "webp"
            elif "jpeg" in header_part or "jpg" in header_part:
                ext = "jpg"
            elif "ico" in header_part:
                ext = "ico"

            for f in os.listdir(icons_dir):
                if os.path.splitext(f.lower())[0] == safe_key:
                    try:
                        os.remove(os.path.join(icons_dir, f))
                    except Exception:
                        pass

            target_path = os.path.join(icons_dir, f"{safe_key}.{ext}")
            try:
                raw_bytes = base64.b64decode(b64_part)
                with open(target_path, "wb") as out_f:
                    out_f.write(raw_bytes)
            except Exception as e:
                return jsonify({"error": f"Không thể lưu tệp icon: {str(e)}"}), 500

            return jsonify({
                "message": f"Đã cập nhật icon [{safe_key}.{ext}] thành công!",
                "icon_key": safe_key,
                "url": f"/assets/icons/{safe_key}.{ext}"
            })

    logo_url = ""
    custom_icons = {}
    if os.path.isdir(icons_dir):
        for f in sorted(os.listdir(icons_dir)):
            lower_f = f.lower()
            if lower_f.endswith((".png", ".svg", ".webp", ".jpg", ".jpeg", ".ico")):
                full_url = f"/assets/icons/{f}"
                key_name = os.path.splitext(lower_f)[0]
                custom_icons[key_name] = full_url
                if key_name in ("logo", "icon") and not logo_url:
                    logo_url = full_url
        if not logo_url and custom_icons:
            first_k = next(iter(custom_icons))
            logo_url = custom_icons[first_k]

    banners = []
    if os.path.isdir(banners_dir):
        for f in sorted(os.listdir(banners_dir)):
            if f.lower().endswith((".png", ".webp", ".jpg", ".jpeg", ".svg")):
                banners.append(f"/assets/banners/{f}")

    return jsonify({
        "logo_url": logo_url,
        "custom_icons": custom_icons,
        "banners": banners
    })


def compute_hybrid_recommendations(all_products, user_id, viewed_ids, cart_categories):
    if not all_products:
        return [], "Hiện chưa có sản phẩm nào được đăng bán.", {}

    ratings = [float(p.get("rating") or 5.0) for p in all_products]
    global_mean_rating = sum(ratings) / len(ratings) if ratings else 4.8
    min_votes_m = 5.0

    review_counts_rows = query_db(
        "SELECT product_id, COUNT(*) as cnt FROM product_reviews GROUP BY product_id"
    )
    review_cnt_map = {r["product_id"]: int(r["cnt"]) for r in review_counts_rows}

    user_gender = None
    behavior_cat_weights = {}
    purchased_cat_weights = {}
    voucher_cats = set()

    if user_id and str(user_id).isdigit():
        uid = int(user_id)
        u_row = query_db("SELECT gender FROM users WHERE id = ?", (uid,), one=True)
        if u_row and u_row.get("gender"):
            user_gender = u_row["gender"].lower()

        b_rows = query_db(
            """SELECT action_type, category_tag, COUNT(*) as cnt
               FROM user_behavior_logs
               WHERE user_id = ? AND category_tag IS NOT NULL AND category_tag != 'all'
               GROUP BY action_type, category_tag""",
            (uid,)
        )
        action_multipliers = {
            "purchase": 25.0,
            "harvest_voucher_tree": 18.0,
            "claim_voucher": 16.0,
            "plant_voucher_tree": 14.0,
            "buy_voucher_seed": 10.0,
            "wheel_spin_win": 10.0,
            "view_product": 8.0,
            "browse_filter": 6.0
        }
        for r in b_rows:
            cat = r["category_tag"]
            mult = action_multipliers.get(r["action_type"], 6.0)
            behavior_cat_weights[cat] = behavior_cat_weights.get(cat, 0.0) + float(r["cnt"]) * mult

        ord_rows = query_db(
            """SELECT p.category, SUM(oi.quantity) as total_qty
               FROM order_items oi
               JOIN orders o ON oi.order_id = o.id
               JOIN products p ON oi.product_id = p.id
               WHERE o.buyer_id = ?
               GROUP BY p.category""",
            (uid,)
        )
        for r in ord_rows:
            if r.get("category"):
                purchased_cat_weights[r["category"]] = float(r["total_qty"] or 1) * 25.0

        uv_rows = query_db("SELECT voucher_code FROM user_vouchers WHERE user_id = ?", (uid,))
        for uv in uv_rows:
            code = (uv["voucher_code"] or "").upper()
            if "LADY" in code or "2010" in code:
                voucher_cats.update(["watch", "bag", "speaker"])
            elif "GEAR" in code:
                voucher_cats.update(["keyboard", "mouse", "headphones"])
            elif "VOUCHER15K" in code:
                voucher_cats.add("bag")
            elif "TECH" in code:
                voucher_cats.add("gpu")

    viewed_cats = set()
    viewed_brands = set()
    if viewed_ids:
        for p in all_products:
            if p["id"] in viewed_ids:
                if p.get("category"):
                    viewed_cats.add(p["category"])
                if p.get("brand"):
                    viewed_brands.add(str(p["brand"]).upper())

    cart_cat_counts = {}
    for c in cart_categories:
        if c:
            cart_cat_counts[c] = cart_cat_counts.get(c, 0) + 1

    scored_items = []
    for p in all_products:
        pid = p["id"]
        cat = p.get("category", "gpu")
        brand = str(p.get("brand") or "").upper()
        sold = float(p.get("sold_count") or 0)
        rating = float(p.get("rating") or global_mean_rating)
        rev_cnt = float(review_cnt_map.get(pid, 0))
        votes_v = sold + rev_cnt

        bayesian_rating = (votes_v / (votes_v + min_votes_m)) * rating + (min_votes_m / (votes_v + min_votes_m)) * global_mean_rating
        popularity_score = bayesian_rating * 10.0 + math.log1p(sold) * 8.5

        behavior_score = (
            behavior_cat_weights.get(cat, 0.0)
            + purchased_cat_weights.get(cat, 0.0)
            + cart_cat_counts.get(cat, 0) * 20.0
            + (18.0 if cat in voucher_cats else 0.0)
        )
        behavior_score = min(85.0, behavior_score)

        content_score = 0.0
        if cat in viewed_cats:
            content_score += 15.0
        if brand and brand in viewed_brands:
            content_score += 10.0
        t_gender = (p.get("target_gender") or "all").lower()
        if user_gender in ("male", "female") and t_gender == user_gender:
            content_score += 12.0
        elif t_gender == "all":
            content_score += 6.0

        tier = (p.get("shop_tier") or "normal").lower()
        trust_score = 8.0 if tier == "mall" else (5.0 if tier == "favorite" else 2.0)
        if int(p.get("verified_tick") or 0) == 1:
            trust_score += 4.0

        total_score = round(popularity_score + behavior_score + content_score + trust_score, 2)
        p_copy = dict(p)
        p_copy["rec_score"] = total_score
        scored_items.append((total_score, p_copy))

    scored_items.sort(key=lambda x: x[0], reverse=True)

    diversified = []
    cat_quota = {}
    overflow = []
    for score, item in scored_items:
        c = item.get("category", "other")
        if cat_quota.get(c, 0) < 2:
            diversified.append(item)
            cat_quota[c] = cat_quota.get(c, 0) + 1
        else:
            overflow.append(item)
        if len(diversified) >= 8:
            break

    while len(diversified) < 8 and overflow:
        diversified.append(overflow.pop(0))

    active_signals = list(behavior_cat_weights.keys()) + list(purchased_cat_weights.keys()) + list(cart_cat_counts.keys()) + list(viewed_cats)
    if not user_id:
        reason = "Tuyển chọn các sản phẩm bán chạy và được đánh giá cao nhất từ các Gian hàng uy tín"
    elif active_signals:
        reason = "Gợi ý các mặt hàng phù hợp với sản phẩm bạn vừa xem, giỏ hàng và mã giảm giá bạn đã lưu"
    else:
        reason = "Gợi ý các sản phẩm nổi bật phù hợp với nhu cầu mua sắm của bạn"

    algo_meta = {
        "name": "Weighted Hybrid Recommendation",
        "global_mean_rating": round(global_mean_rating, 2),
        "active_categories": list(set(active_signals))
    }
    return diversified, reason, algo_meta


def strip_vn_accents(text):
    import unicodedata
    s = str(text or "")
    s = s.replace("đ", "d").replace("Đ", "D")
    norm = unicodedata.normalize("NFD", s)
    return "".join(ch for ch in norm if unicodedata.category(ch) != "Mn").casefold()


@bp.route("/products", methods=["GET"])
def get_home_products():
    conn = get_db()
    cursor = conn.cursor()
    for col_def in [
        "brand TEXT DEFAULT 'NVIDIA'",
        "unit TEXT DEFAULT 'Chiếc'",
        "warranty TEXT DEFAULT '24 tháng'",
        "old_price REAL DEFAULT 0",
        "sold_count INTEGER DEFAULT 15",
        "is_flash_sale INTEGER DEFAULT 0",
        "views INTEGER DEFAULT 120"
    ]:
        try:
            cursor.execute(f"ALTER TABLE products ADD COLUMN {col_def}")
        except Exception:
            pass
    for u_col in [
        "store_name TEXT DEFAULT ''",
        "company_name TEXT DEFAULT ''",
        "shop_tier TEXT DEFAULT 'mall'",
        "verified_tick INTEGER DEFAULT 1"
    ]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {u_col}")
        except Exception:
            pass
    conn.commit()

    q_raw = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or request.args.get("cat") or "").strip().lower()
    shop_tier = (request.args.get("shop_tier") or "").strip().lower()
    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)
    min_rating = request.args.get("min_rating", type=float)
    flash_only = (request.args.get("flash_sale") or "").strip() == "1"
    sort_by = (request.args.get("sort_by") or "popular").strip().lower()

    cursor.execute(
        """
        SELECT p.*,
               COALESCE(NULLIF(u.store_name, ''), NULLIF(u.company_name, ''), NULLIF(u.full_name, ''), 'ASUS ROG Official Mall') as store_name,
               COALESCE(u.shop_tier, 'mall') as shop_tier,
               COALESCE(u.verified_tick, 1) as verified_tick
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        ORDER BY p.id DESC
        """
    )
    raw_rows = [dict(r) for r in cursor.fetchall()]

    seen_keys = set()
    rows = []
    for p in raw_rows:
        norm_name = " ".join(str(p.get("name") or "").lower().split())
        norm_brand = str(p.get("brand") or p.get("store_name") or p.get("seller_id") or "").lower().strip()
        dedup_key = (norm_name, norm_brand)
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)
        rows.append(p)

    cursor.execute(
        """
        SELECT u.id, u.full_name, u.company_name,
               COALESCE(NULLIF(u.store_name, ''), NULLIF(u.company_name, ''), NULLIF(u.full_name, ''), 'Nvidia Partner #' || u.id) as store_name,
               COALESCE(u.shop_tier, 'mall') as shop_tier,
               COALESCE(u.verified_tick, 1) as verified_tick,
               COUNT(p.id) as product_count
        FROM users u
        LEFT JOIN products p ON p.seller_id = u.id
        WHERE u.role IN ('seller', 'admin')
        GROUP BY u.id
        ORDER BY product_count DESC
        """
    )
    stores = [dict(s) for s in cursor.fetchall()]
    conn.close()

    q_folded = q_raw.casefold()
    q_unaccent = strip_vn_accents(q_raw)
    tokens_folded = [tok.casefold() for tok in q_raw.split() if tok.strip()]
    tokens_unaccent = [strip_vn_accents(tok) for tok in q_raw.split() if tok.strip()]

    filtered = []
    for p in rows:
        if category and (p.get("category") or "").lower() != category:
            continue
        if shop_tier and (p.get("shop_tier") or "mall").lower() != shop_tier:
            continue
        price_val = float(p.get("price") or 0)
        if min_price is not None and price_val < min_price:
            continue
        if max_price is not None and price_val > max_price:
            continue
        rating_val = float(p.get("rating") or 4.9)
        if min_rating is not None and rating_val < min_rating:
            continue
        if flash_only and int(p.get("is_flash_sale") or 0) != 1 and float(p.get("old_price") or 0) <= price_val:
            continue

        relevance_score = 0
        if tokens_folded:
            name_str = str(p.get("name") or "")
            cat_str = str(p.get("category") or "")
            brand_str = str(p.get("brand") or "")
            store_str = str(p.get("store_name") or "")
            desc_str = str(p.get("description") or "")

            full_folded = " ".join([name_str, desc_str, cat_str, brand_str, store_str]).casefold()
            full_unaccent = strip_vn_accents(full_folded)
            name_folded = name_str.casefold()
            name_unaccent = strip_vn_accents(name_str)

            exact_match = all(tok in full_folded for tok in tokens_folded)
            unaccent_match = all(tok in full_unaccent for tok in tokens_unaccent if tok)

            if not exact_match and not unaccent_match:
                continue

            if q_folded in name_folded:
                relevance_score += 120
            elif q_unaccent and q_unaccent in name_unaccent:
                relevance_score += 95
            if name_folded.startswith(tokens_folded[0]) or (tokens_unaccent[0] and name_unaccent.startswith(tokens_unaccent[0])):
                relevance_score += 50
            for t_f in tokens_folded:
                if t_f in name_folded:
                    relevance_score += 30
                elif t_f in brand_str.casefold() or t_f in cat_str.casefold():
                    relevance_score += 20
                else:
                    relevance_score += 8
            if exact_match:
                relevance_score += 25

        p["search_score"] = relevance_score
        filtered.append(p)

    if sort_by == "price_asc":
        filtered.sort(key=lambda x: float(x.get("price") or 0))
    elif sort_by == "price_desc":
        filtered.sort(key=lambda x: float(x.get("price") or 0), reverse=True)
    elif sort_by == "rating_desc":
        filtered.sort(key=lambda x: (float(x.get("rating") or 4.9), int(x.get("sold_count") or 0)), reverse=True)
    else:
        if tokens_folded:
            filtered.sort(key=lambda x: (int(x.get("search_score") or 0), int(x.get("sold_count") or 0), float(x.get("rating") or 4.9)), reverse=True)
        else:
            filtered.sort(key=lambda x: (int(x.get("sold_count") or 0), float(x.get("rating") or 4.9)), reverse=True)

    return jsonify({
        "ok": True,
        "query": q_raw,
        "count": len(filtered),
        "products": filtered,
        "recommended": filtered[:8],
        "stores": stores,
        "recommendation_reason": f"Tìm thấy {len(filtered)} sản phẩm khớp thông minh với '{q_raw}'" if q_raw else "Đề xuất thông minh từ CSDL SQLite (Đã khử trùng lặp & chuẩn hóa 6 tiêu chí)"
    }), 200
