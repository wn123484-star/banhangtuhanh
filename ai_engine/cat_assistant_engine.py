import os
import json
import random
import unicodedata
from urllib import request as urllib_request
from database.db_manager import query_db

CAT_BREEDS_PRESETS = {
    "nivida_cyber": {
        "name": "Mèo Thần Tài Nivida (Cyber Lime)",
        "body": "rgb(30, 41, 59)",
        "belly": "rgb(118, 185, 0)",
        "stroke": "rgb(15, 23, 42)",
        "pCol": "rgb(132, 204, 22)",
        "pattern": "points",
        "eyeColor": "rgb(16, 185, 129)",
        "eyeColor2": "rgb(16, 185, 129)",
        "tailStyle": "fluffy"
    },
    "calico_lucky": {
        "name": "Mèo Tam Thể May Mắn (Calico)",
        "body": "rgb(255, 251, 235)",
        "belly": "rgb(255, 255, 255)",
        "stroke": "rgb(41, 37, 36)",
        "pCol": "rgb(249, 115, 22)",
        "pattern": "calico",
        "eyeColor": "rgb(217, 119, 6)",
        "eyeColor2": "rgb(217, 119, 6)",
        "tailStyle": "normal"
    },
    "tuxedo_boss": {
        "name": "Mèo Giám Đốc Vest Đen (Tuxedo)",
        "body": "rgb(39, 39, 42)",
        "belly": "rgb(248, 250, 252)",
        "stroke": "rgb(9, 9, 11)",
        "pCol": "rgb(24, 24, 27)",
        "pattern": "cow",
        "eyeColor": "rgb(234, 179, 8)",
        "eyeColor2": "rgb(234, 179, 8)",
        "tailStyle": "long"
    },
    "ginger_boba": {
        "name": "Mèo Cam Mê Trà Sữa (Orange Tabby)",
        "body": "rgb(251, 146, 60)",
        "belly": "rgb(255, 237, 213)",
        "stroke": "rgb(124, 45, 18)",
        "pCol": "rgb(234, 88, 12)",
        "pattern": "stripes",
        "eyeColor": "rgb(217, 119, 6)",
        "eyeColor2": "rgb(217, 119, 6)",
        "tailStyle": "fluffy"
    },
    "white_cloud": {
        "name": "Mèo Bạch Tuyết Mắt 2 Màu (Cloud)",
        "body": "rgb(248, 250, 252)",
        "belly": "rgb(255, 255, 255)",
        "stroke": "rgb(71, 85, 105)",
        "pCol": "rgb(226, 232, 240)",
        "pattern": "solid",
        "eyeColor": "rgb(2, 132, 199)",
        "eyeColor2": "rgb(234, 179, 8)",
        "tailStyle": "fluffy"
    },
    "sakura_neon": {
        "name": "Mèo Anh Đào Cyberpunk (Sakura Pink)",
        "body": "rgb(253, 242, 248)",
        "belly": "rgb(251, 207, 232)",
        "stroke": "rgb(131, 24, 67)",
        "pCol": "rgb(244, 114, 182)",
        "pattern": "points",
        "eyeColor": "rgb(236, 72, 153)",
        "eyeColor2": "rgb(14, 165, 233)",
        "tailStyle": "fluffy"
    }
}

TRAIT_TYPES = ["playful", "foodie", "parkour_master", "shopping_assistant"]
EYE_COLOR_TYPES = ["emerald", "amber", "sapphire", "heterochromia"]
TAIL_STYLE_TYPES = ["fluffy", "normal", "long"]
SIT_FAMILY = ["sitting", "sit_paw_wave_hi", "sit_polite_paws", "head_tilt"]
LOAF_FAMILY = ["loaf_purr_toast"]
SPLOOT_FAMILY = ["sploot_melted_cheese", "sploot_superman"]
SLEEP_FAMILY = ["sleep_bubble_snore"]
DANCE_FAMILY = ["dance_cyberpunk_neon_wave", "money_happy_dance"]
RUN_FAMILY = ["walking", "run_rocket_zoom"]
JUMP_FAMILY = ["jump_starfish_soar", "double_flip"]
EAT_FAMILY = ["eat_chef_kiss_savor"]
DRINK_FAMILY = ["drink_boba_tea"]
MONEY_FAMILY = ["money_happy_dance", "carrying"]
SPECIAL_BEHAVIOR_FAMILY = ["ai_eureka_lightbulb_perk", "climb_spider_scramble", "ai_magic_cape_spin", "sun_bask"]


def recycle_desktop_cat_files():
    return []


def strip_accents_cat(text):
    if not text:
        return ""
    norm = unicodedata.normalize("NFD", str(text).lower().replace("đ", "d"))
    return "".join(ch for ch in norm if unicodedata.category(ch) != "Mn")


def find_matching_products_for_cat(query_str, limit=2):
    all_prods = query_db("SELECT * FROM products ORDER BY sold_count DESC, rating DESC") or []
    q_norm = strip_accents_cat(query_str)
    stop_words = {
        "meo", "oi", "tim", "kiem", "giup", "cho", "minh", "toi", "mua", "bo",
        "vao", "gio", "hang", "san", "pham", "mon", "do", "de", "xuat", "goi",
        "y", "tu", "van", "lay", "chon", "cai", "chiec", "ro", "them",
        "nhieu", "cac", "may", "nhe", "nha", "di", "voi", "nao", "tot", "re"
    }
    raw_tokens = [w for w in q_norm.replace(",", " ").replace(".", " ").split() if len(w) >= 2 and w not in stop_words]

    cat_synonyms = {
        "gpu": ["rtx", "vga", "card", "do hoa", "5090", "4070"],
        "cpu": ["cpu", "core i", "i7", "ryzen", "7800x3d", "vi xu ly", "chip"],
        "mainboard": ["main", "mainboard", "bo mach", "b650"],
        "ram": ["ram", "ddr5", "bo nho", "kingston", "corsair", "gskill"],
        "keyboard": ["ban phim", "phim co", "keychron", "switch", "gasket"],
        "mouse": ["chuot", "mouse", "viper", "superlight", "cong thai hoc"],
        "headphones": ["tai nghe", "headphone", "sony", "chong on", "anc"],
        "watch": ["dong ho", "smartwatch", "amoled", "massage", "binh giu nhiet", "garmin"],
        "speaker": ["den", "loa", "loc khong khi", "decor", "bluetooth"],
        "bag": ["balo", "tui", "laptop", "canvas"]
    }

    target_cat = None
    for c_key, kw_list in cat_synonyms.items():
        if any(k in q_norm for k in kw_list):
            target_cat = c_key
            break

    scored = []
    for p in all_prods:
        p_name_norm = strip_accents_cat(p.get("name") or "")
        p_cat_norm = strip_accents_cat(p.get("category") or "")
        p_desc_norm = strip_accents_cat(p.get("description") or "")
        score = 0

        if target_cat and p_cat_norm == target_cat:
            score += 25

        for tk in raw_tokens:
            if tk in p_name_norm:
                score += 20
            elif tk in p_cat_norm:
                score += 12
            elif tk in p_desc_norm:
                score += 6

        if score > 0:
            scored.append((score, float(p.get("sold_count") or 0), p))

    scored.sort(key=lambda x: (x[0], x[1]), reverse=True)
    matched = [item[2] for item in scored[:max(1, int(limit or 1))]]

    if not matched and all_prods:
        matched = all_prods[:max(1, int(limit or 1))]

    return matched, raw_tokens[:4]


def call_groq_for_cat_assistant(user_msg, context_summary=""):
    try:
        row = query_db("SELECT key_main, key_backup1, kill_switch, model_name FROM ai_settings WHERE id = 1", one=True) or {}
        if int(row.get("kill_switch") or 0) == 1:
            return None
        api_key = (row.get("key_main") or row.get("key_backup1") or os.environ.get("GROQ_API_KEY") or "").strip()
        if not api_key:
            return None
        payload = json.dumps({
            "model": row.get("model_name") or "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "system",
                    "content": "Bạn là Mèo Lỏng Trợ Lý AI siêu dễ thương của sàn thương mại điện tử Nivida. Luôn bắt đầu bằng 'Meow~' hoặc 'Nyan~', trả lời ngắn gọn 1-2 câu tiếng Việt sinh động."
                },
                {
                    "role": "user",
                    "content": f"Khách hàng nói: {user_msg}\nHành động Mèo vừa thực hiện: {context_summary}"
                }
            ],
            "temperature": 0.5,
            "max_tokens": 140
        }).encode("utf-8")

        req = urllib_request.Request(
            "https" + "://api.groq.com/openai/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib_request.urlopen(req, timeout=4.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def process_cat_assistant_command(data):
    try:
        user_msg = str((data or {}).get("message") or "").strip()
        msg_norm = strip_accents_cat(user_msg)

        if not user_msg:
            return {
                "action_type": "IDLE_CHAT",
                "cat_state": "sit_paw_wave_hi",
                "cat_expr": "uwu",
                "bubble_text": "Meow~ Bạn muốn Mèo trèo lên thanh tìm kiếm săn đồ bỏ vào Giỏ hàng, biểu diễn nhào lộn hay đổi giao diện Sáng/Tối nè? 🐾",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["doi meo", "doi skin", "doi mau long", "giong meo"]):
            return {
                "action_type": "SWITCH_BREED",
                "cat_state": "dance_cyberpunk_neon_wave",
                "cat_expr": "starry_hyped_grin",
                "particle": "sparkle",
                "bubble_text": "Meow~ Biến hình! Mèo vừa khoác bộ lông mới cực xinh cho bạn ngắm nè! 🎨🐾",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["giao dien toi", "che do toi", "dark mode", "nen toi", "mau toi", "ban dem", "tat den"]):
            ctx = "Đã chuyển giao diện web sang chế độ Tối (Dark Mode)."
            ai_txt = call_groq_for_cat_assistant(user_msg, ctx)
            return {
                "action_type": "SET_THEME",
                "theme_mode": "dark",
                "cat_state": "ai_magic_cape_spin",
                "cat_expr": "cyber_visor_glow",
                "particle": "sparkle",
                "bubble_text": ai_txt or "Meow~ Úm ba la! Mèo đã bật Giao diện Tối (Dark Mode) dịu mắt cho bạn rồi nè! 🌙✨",
                "groq_used": bool(ai_txt)
            }

        if any(k in msg_norm for k in ["giao dien sang", "che do sang", "light mode", "nen sang", "mau sang", "bat den"]):
            ctx = "Đã chuyển giao diện web sang chế độ Sáng (Light Mode)."
            ai_txt = call_groq_for_cat_assistant(user_msg, ctx)
            return {
                "action_type": "SET_THEME",
                "theme_mode": "light",
                "cat_state": "sun_bask",
                "cat_expr": "sparkle_bliss_squint",
                "particle": "star",
                "bubble_text": ai_txt or "Nyan~ Mèo đã bật Giao diện Sáng (Light Mode) rực rỡ nắng ấm rồi nha! ☀️🐾",
                "groq_used": bool(ai_txt)
            }

        for preset_key, kw_list, label_name in [
            ("cyberpunk", ["cyberpunk", "mau hong", "neon"], "Cyberpunk Pink"),
            ("shopee", ["shopee", "mau cam"], "Cam Năng Động"),
            ("ocean", ["ocean", "xanh duong", "dai duong"], "Xanh Đại Dương"),
            ("nvidia", ["nvidia", "nivida", "xanh la", "mac dinh"], "Xanh Nivida")
        ]:
            if any(k in msg_norm for k in kw_list) and any(w in msg_norm for w in ["mau", "theme", "giao dien", "doi", "chuyen"]):
                return {
                    "action_type": "SET_STYLE_PRESET",
                    "style_preset": preset_key,
                    "cat_state": "dance_cyberpunk_neon_wave",
                    "cat_expr": "starry_hyped_grin",
                    "particle": "sparkle",
                    "bubble_text": f"Meow~ Đã đổi tông màu chủ đạo sang [{label_name}] cực chất luôn! 🎨🐾",
                    "groq_used": False
                }

        if any(k in msg_norm for k in ["diem danh", "checkin", "nhan xu"]):
            return {
                "action_type": "TRIGGER_CHECKIN",
                "cat_state": "money_happy_dance",
                "cat_expr": "gold_coin_eyes",
                "particle": "star",
                "bubble_text": "Meow~ Mèo đang nhảy lên bấm Điểm danh hàng ngày săn Xu và Lượt quay cho bạn đây! 🪙✨",
                "groq_used": False
            }

        for nav_kws, nav_url, nav_label in [
            (["voucher", "ma giam gia", "san ma"], "/services/vouchers_deals/vouchers.html", "Kho Voucher"),
            (["nong trai", "trong cay", "tuoi cay"], "/services/minigame/farm.html", "Nông Trại Cây Voucher"),
            (["vong quay", "quay thuong"], "/services/minigame/minigame.html", "Vòng Quay May Mắn"),
            (["so sanh", "wishlist", "yeu thich"], "/services/compare/compare.html", "Trang So Sánh & Wishlist"),
            (["xem gio hang", "mo gio hang", "thanh toan"], "/services/cart_checkout/cart.html", "Giỏ Hàng"),
            (["van don", "tracking", "don hang"], "/services/order_tracking/tracking.html", "Tra Cứu Vận Đơn"),
            (["kenh nguoi ban", "seller", "gian hang"], "/services/seller/seller-dashboard.html", "Kênh Người Bán"),
            (["quan tri", "admin"], "/services/admin_dispute/admin-center.html", "Trung Tâm Quản Trị Admin")
        ]:
            if any(k in msg_norm for k in nav_kws) and any(w in msg_norm for w in ["mo", "vao", "di", "sang", "trang", "xem", "toi"]):
                return {
                    "action_type": "NAVIGATE_PAGE",
                    "target_url": nav_url,
                    "cat_state": "run_rocket_zoom",
                    "cat_expr": "pure_joy_beam",
                    "particle": "dust",
                    "bubble_text": f"Meow~ Bám chắc nhé! Mèo dẫn bạn sang [{nav_label}] ngay đây! 🚀🐾",
                    "groq_used": False
                }

        if any(k in msg_norm for k in ["tra sua", "boba", "uong sua"]):
            return {
                "action_type": "DO_TRICK",
                "cat_state": "drink_boba_tea",
                "cat_expr": "boba_chew_bliss",
                "particle": "heart",
                "bubble_text": "Nyam nyam~ Trà sữa trân châu đường đen ngon bá cháy luôn chủ nhân ơi! 🧋😻",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["an ca", "cho an", "doi bung"]):
            return {
                "action_type": "DO_TRICK",
                "cat_state": "eat_chef_kiss_savor",
                "cat_expr": "eat_starry_feast",
                "particle": "crumb",
                "bubble_text": "Meow măm măm~ Cá hồi tươi chuẩn 5 sao Michelin, cảm ơn chủ nhân nha! 🐟💖",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["lon vong", "nhao lon", "backflip", "nhay cao"]):
            return {
                "action_type": "DO_TRICK",
                "cat_state": "double_flip",
                "cat_expr": "starry_hyped_grin",
                "particle": "star",
                "bubble_text": "Hựaaa! Xem Mèo biểu diễn cú nhảy lộn 2 vòng trên không (Double Flip) nè! 🤸‍♂️✨",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["nhay mua", "dance", "quay"]):
            return {
                "action_type": "DO_TRICK",
                "cat_state": "dance_cyberpunk_neon_wave",
                "cat_expr": "rich_sunglasses_gold",
                "particle": "music",
                "bubble_text": "Meow xập xình~ Lên nhạc đi chủ nhân ơi, Mèo đeo kính vàng quẩy điệu Cyberpunk Neon nè! 🎵🕶️",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["ngu", "nam", "banh mi", "loaf", "tan chay", "sploot"]):
            st_choice = "loaf_purr_toast" if ("banh mi" in msg_norm or "loaf" in msg_norm) else ("sploot_melted_cheese" if "tan chay" in msg_norm else "sleep_bubble_snore")
            return {
                "action_type": "DO_TRICK",
                "cat_state": st_choice,
                "cat_expr": "sleepy_drool_bubble",
                "particle": "zzz",
                "bubble_text": "Khò khò... Mèo nằm ườn hóa lỏng nghỉ ngơi một chút đây~ 💤🍞",
                "groq_used": False
            }

        hunt_triggers = [
            "tim", "kiem", "de xuat", "goi y", "tu van", "bo gio", "bo vao gio",
            "them vao gio", "bo ro", "them gio", "mua", "dat", "lay", "chon",
            "rtx", "vga", "card", "ban phim", "phim", "chuot", "tai nghe",
            "dong ho", "massage", "balo", "tui", "den", "loa", "loc khong khi",
            "ram", "cpu", "main", "binh giu nhiet", "do", "mon", "san pham"
        ]
        if any(k in msg_norm for k in hunt_triggers):
            want_many = any(k in msg_norm for k in ["nhieu", "cac", "may", "2", "3", "4", "danh sach", "de xuat", "goi y"])
            limit_cnt = 2 if want_many else 1
            matched_prods, tokens = find_matching_products_for_cat(user_msg, limit=limit_cnt)
            if matched_prods:
                kw_display = " ".join(tokens) if tokens else user_msg[:26]
                names_str = ", ".join([f"{p['name'][:30]} ({int(float(p.get('price') or 0)):,} Xu)" for p in matched_prods])
                ctx = f"Mèo đã trèo lên thanh tìm kiếm gõ '{kw_display}', nhảy xuống chọn {len(matched_prods)} món ({names_str}) và bỏ thẳng vào Giỏ hàng kèm nhãn 'Mèo AI Đề Xuất'."
                ai_txt = call_groq_for_cat_assistant(user_msg, ctx)
                return {
                    "action_type": "HUNT_AND_ADD_TO_CART",
                    "search_query": kw_display,
                    "products": matched_prods,
                    "cat_state": "carrying",
                    "cat_expr": "money_eyes",
                    "particle": "heart",
                    "bubble_text": ai_txt or f"Meow~ Đã tìm '{kw_display}' và tha {len(matched_prods)} món ({names_str}) bỏ thẳng vào Giỏ hàng (Gắn nhãn 🐱 Mèo AI Đề Xuất) cho bạn rồi nha! 🛒🐾",
                    "groq_used": bool(ai_txt)
                }

        ai_txt = call_groq_for_cat_assistant(user_msg, "Trò chuyện tư vấn thân thiện với khách hàng trên sàn Nivida.")
        return {
            "action_type": "CHAT_REPLY",
            "cat_state": random.choice(["sit_paw_wave_hi", "ai_eureka_lightbulb_perk", "head_tilt"]),
            "cat_expr": random.choice(["lovestruck_sparkle", "uwu", "pure_joy_beam"]),
            "particle": "heart",
            "bubble_text": ai_txt or "Meow~ Bạn hãy bảo Mèo: 'Tìm card RTX 4070', 'Đề xuất bàn phím cơ', 'Ăn cá', 'Trà sữa' hoặc 'Đổi giao diện tối' để Mèo biểu diễn và săn đồ vào Giỏ hàng cho nhé! 🐾✨",
            "groq_used": bool(ai_txt)
        }
    except Exception as e:
        return {
            "action_type": "ERROR_RECOVERY",
            "cat_state": "sit_polite_paws",
            "cat_expr": "uwu",
            "particle": "sparkle",
            "bubble_text": f"Meow~ Hệ thống vừa tự động xử lý ngoại lệ an toàn ({str(e)[:45]}). Bạn thử gõ lại lệnh cho Mèo nhé! 🐾",
            "groq_used": False
        }
