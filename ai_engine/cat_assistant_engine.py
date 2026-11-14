import os
import re
import json
import random
import unicodedata
from urllib import request as urllib_request
from database.db_manager import query_db

CAT_BREEDS_PRESETS = {
    "nivida_cyber": {
        "name": "Mèo Thần Tài Nexora (Emerald Cyber)",
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
                    "content": "Bạn là Mèo Lỏng Trợ Lý AI phép thuật của sàn thương mại điện tử Nexora Mall. Luôn bắt đầu bằng '✨ Hô thần chú:' kèm 'Meow~' hoặc 'Nyan~', trả lời ngắn gọn 1-2 câu tiếng Việt sinh động."
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
                "bubble_text": "✨ Hô thần chú: Meow~ Bạn hãy bảo Mèo đổi giao diện 12 chủ đề, chỉnh lưới 3-6 cột, tìm sản phẩm hay mua sản phẩm số 1 nhé! 🐾",
                "groq_used": False
            }

        # [FEAT-CAT-002.6] LỆNH CẤT MÈO ĐI / MÈO TRỐN SAU KHUNG CHAT & GỌI MÈO RA
        if any(k in msg_norm for k in ["cat meo", "meo tron di", "cho meo ngu", "tron sau chat"]):
            return {
                "action_type": "TUCK_CAT_BEHIND_CHAT",
                "cat_state": "TUCKED_BEHIND_CHAT",
                "cat_expr": "uwu",
                "particle": "zzz",
                "bubble_text": "🐾 Mèo chạy về trốn sau khung chat đây!",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["goi meo ra", "meo ra day", "meo oi ra day"]) or msg_norm in ["meo oi", "meo"]:
            return {
                "action_type": "SUMMON_CAT_BACK_OUT",
                "cat_state": "sit_paw_wave_hi",
                "cat_expr": "lovestruck_sparkle",
                "particle": "star",
                "bubble_text": "😺 Mèo ra rồi đây! Cần Mèo giúp gì nào?",
                "groq_used": False
            }

        # [FEAT-ACC-009.4] PHÂN BIỆT THÔNG MINH: HỎI PHIÊN BẢN MÀU SẢN PHẨM vs. KHÓ NHÌN MÀU / MÙ MÀU
        is_normal_variant_query = any(
            k in msg_norm for k in [
                "co mau trang khong", "con mau hong khong", "co may mau",
                "mau den con hang khong", "phien ban mau", "mau nao dep"
            ]
        )
        is_colorblind_assist_phrase = any(
            k in msg_norm for k in [
                "toi khong thay mau", "khong thay mau", "toi bi mu mau", "bi mu mau",
                "mu mau", "khong phan biet duoc mau", "mau nay la mau gi vay toi nhin khong ro",
                "nhin khong ro mau", "ho tro xem mau giao dien", "ho tro xem mau",
                "kho nhin mau qua", "bat bao mau"
            ]
        )
        if is_colorblind_assist_phrase and not is_normal_variant_query:
            return {
                "action_type": "ENABLE_COLORBLIND_HOVER_ASSIST",
                "enable_hover_color_inspector": True,
                "cat_state": "ai_magic_cape_spin",
                "cat_expr": "lovestruck_sparkle",
                "particle": "sparkle",
                "bubble_text": "🐾 Mèo đã bật chế độ Hỗ Trợ Nhìn Màu & Báo Màu Khi Trỏ Chuột 2 Giây cho bạn rồi nhé! Bạn chỉ cần giữ chuột 2 giây ở bất kỳ nút hay sản phẩm nào, Mèo sẽ đọc rõ màu sắc giúp bạn!",
                "groq_used": False
            }

        if is_normal_variant_query:
            return {
                "action_type": "CHAT_REPLY",
                "enable_hover_color_inspector": False,
                "cat_state": "sit_paw_wave_hi",
                "cat_expr": "lovestruck_sparkle",
                "particle": "sparkle",
                "bubble_text": "🎨 Sản phẩm này hiện có đủ các phiên bản màu: Đen Titan Nhám (#0F172A), Trắng Sương Mù (#F8FAFC) và Xám Không Gian sẵn hàng tại kho Nexora Mall nhé!",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["doi meo", "doi skin meo", "doi mau long", "giong meo"]):
            return {
                "action_type": "SWITCH_BREED",
                "cat_state": "dance_cyberpunk_neon_wave",
                "cat_expr": "starry_hyped_grin",
                "particle": "sparkle",
                "bubble_text": "✨ Hô thần chú: Biến hình! Mèo vừa khoác bộ lông mới cực xinh cho bạn ngắm nè! 🎨🐾",
                "groq_used": False
            }

        # 1A. LỆNH CHỈNH MẬT ĐỘ LƯỚI SẢN PHẨM (3, 4, 5, 6 CỘT HOẶC DANH SÁCH NGANG)
        if any(w in msg_norm for w in ["luoi", "cot", "mat do", "danh sach ngang", "list view"]):
            for density_val, kws, label in [
                ("3", ["3 cot", "ba cot", "chu to", "rong rai"], "3 Cột (Rộng rãi - Chữ to)"),
                ("4", ["4 cot", "bon cot", "tieu chuan"], "4 Cột (Tiêu chuẩn - Cân đối)"),
                ("5", ["5 cot", "nam cot", "chuyen nghiep"], "5 Cột (Chuyên nghiệp)"),
                ("6", ["6 cot", "sau cot", "sieu gon"], "6 Cột (Siêu gọn)"),
                ("list", ["danh sach", "ngang", "list"], "Danh Sách Ngang (List View)")
            ]:
                if any(k in msg_norm for k in kws):
                    return {
                        "action_type": "SET_GRID_DENSITY",
                        "grid_density": density_val,
                        "cat_state": "ai_magic_cape_spin",
                        "cat_expr": "starry_hyped_grin",
                        "particle": "sparkle",
                        "bubble_text": f"✨ Hô thần chú: Sắp xếp không gian! Mèo đã chỉnh mật độ hiển thị sang [{label}] cho bạn rồi nhé! 📐🐾",
                        "groq_used": False
                    }

        # 1B. LỆNH ĐỔI 12 BỘ GIAO DIỆN ĐA LỨA TUỔI (MULTI-GENERATIONAL SKINS)
        skin_rules = [
            ("executive_light", ["thanh lich", "executive", "pearl", "mac dinh sang"], "Sáng Thanh Lịch (Executive Pearl Light)"),
            ("swiss_finance", ["thuy si", "swiss", "tai chinh"], "Tài Chính Thụy Sĩ (Swiss Banking Light)"),
            ("apple_cupertino", ["apple", "cupertino", "minimal"], "Apple Cupertino Minimal"),
            ("muji_warm_paper", ["muji", "giay am", "warm paper", "doc sach"], "Giấy Ấm Muji (Warm Paper)"),
            ("nordic_snow", ["bac au", "nordic", "tuyet"], "Tuyết Bắc Âu (Nordic Snow)"),
            ("oxford_academic", ["oxford", "han lam", "academic"], "Hàn Lâm Oxford (Academic Light)"),
            ("bloomberg_terminal", ["bloomberg", "chung khoan", "terminal"], "Chứng Khoán Bloomberg (Dark)"),
            ("obsidian_luxury", ["obsidian", "vang kim", "luxury", "vip"], "Đen Tuyền Vàng Kim (Obsidian Luxury)"),
            ("emerald_tech", ["ngoc luc bao", "emerald", "cyber"], "Công Nghệ Ngọc Lục Bảo (Emerald Tech)"),
            ("ocean_breeze", ["dai duong", "ocean", "breeze"], "Đại Dương Sâu (Deep Ocean)"),
            ("kyoto_autumn", ["kyoto", "mua thu", "autumn"], "Thu Kyoto (Kyoto Autumn)"),
            ("tet_festival", ["tet", "le hoi", "xuan"], "Lễ Hội Tết (Lunar Festival)")
        ]
        for skin_key, kw_list, skin_label in skin_rules:
            if any(k in msg_norm for k in kw_list):
                return {
                    "action_type": "SET_SKIN_PRESET",
                    "skin_key": skin_key,
                    "cat_state": "ai_magic_cape_spin",
                    "cat_expr": "starry_hyped_grin",
                    "particle": "sparkle",
                    "bubble_text": f"✨ Hô thần chú: Biến hình không gian! Mèo đã chuyển giao diện sang [{skin_label}] cho bạn rồi nha! 🎨✨",
                    "groq_used": False
                }

        # 1C. LỆNH BẬT NỀN TỐI / NỀN SÁNG
        if any(k in msg_norm for k in ["giao dien toi", "che do toi", "dark mode", "nen toi", "mau toi", "ban dem", "tat den"]):
            return {
                "action_type": "SET_THEME",
                "theme_mode": "dark",
                "skin_key": "bloomberg_terminal",
                "cat_state": "ai_magic_cape_spin",
                "cat_expr": "cyber_visor_glow",
                "particle": "sparkle",
                "bubble_text": "✨ Hô thần chú: Dạ quang huyền bí! Mèo đã bật Chế độ Tối (Bloomberg Dark) dịu mắt cho bạn rồi nè! 🌙✨",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["giao dien sang", "che do sang", "light mode", "nen sang", "mau sang", "bat den"]):
            return {
                "action_type": "SET_THEME",
                "theme_mode": "light",
                "skin_key": "executive_light",
                "cat_state": "sun_bask",
                "cat_expr": "sparkle_bliss_squint",
                "particle": "star",
                "bubble_text": "✨ Hô thần chú: Ánh sáng ngọc trai! Mèo đã bật Giao diện Sáng Thanh Lịch (Executive Pearl Light) cho bạn rồi nha! ☀️🐾",
                "groq_used": False
            }

        # 2. LỆNH MUA SẢN PHẨM SỐ N (VD: "Mua sản phẩm số 1", "Chọn sản phẩm thứ 2")
        m_idx = re.search(r"(?:mua|chon|them|lay)\s+(?:ngay\s+)?(?:san pham|mon|sp|do)\s+(?:so|thu)\s*(\d+)", msg_norm)
        if m_idx:
            prod_idx = max(1, int(m_idx.group(1)))
            return {
                "action_type": "BUY_PRODUCT_INDEX",
                "product_index": prod_idx,
                "checkout_now": ("mua ngay" in msg_norm or "thanh toan" in msg_norm),
                "cat_state": "jump_starfish_soar",
                "cat_expr": "money_eyes",
                "particle": "sparkle",
                "bubble_text": f"✨ Hô thần chú: Triệu hồi bảo vật số #{prod_idx}! Mèo đang nhảy tới thẻ sản phẩm số {prod_idx} để bỏ vào Giỏ hàng giúp bạn ngay! 🛒🐾",
                "groq_used": False
            }

        # 3. LỆNH ĐIỂM DANH & ĐIỀU HƯỚNG TOÀN SÀN
        if any(k in msg_norm for k in ["diem danh", "checkin", "nhan xu", "nhan thuong"]):
            return {
                "action_type": "TRIGGER_CHECKIN",
                "cat_state": "money_happy_dance",
                "cat_expr": "gold_coin_eyes",
                "particle": "star",
                "bubble_text": "✨ Hô thần chú: Triệu hồi ngân lượng! Mèo đang nhảy lên bấm Điểm danh nhận Xu cho bạn đây! 🪙✨",
                "groq_used": False
            }

        for nav_kws, nav_url, nav_label in [
            (["dau gia", "san dau gia", "auction"], "/services/auction/auction.html", "Sàn Đấu Giá Kép"),
            (["dau thau", "rfq", "bao gia"], "/services/rfq/rfq.html", "Sàn Đấu Thầu Ngược RFQ"),
            (["gia thi truong", "theo doi gia", "lich su gia", "market"], "/services/market_tracker/price-tracker.html", "Theo Dõi Giá Thị Trường VN"),
            (["build pc", "lap pc", "cau hinh pc"], "/services/pc_builder/pc-builder.html", "Trạm Build PC AI"),
            (["ngan hang", "nexora pay", "vi tien", "bank", "quet qr"], "/services/cart_checkout/bank.html", "Ngân Hàng Số Nexora Pay"),
            (["cai dat", "tuy chinh giao dien", "settings"], "/services/settings/settings.html", "Cài Đặt Giao Diện 12 Chủ Đề"),
            (["voucher", "ma giam gia", "san ma"], "/services/vouchers_deals/vouchers.html", "Kho Siêu Voucher"),
            (["nong trai", "trong cay", "tuoi cay"], "/services/minigame/farm.html", "Nông Trại Cây Voucher"),
            (["vong quay", "quay thuong", "ban tam", "esport", "minigame"], "/services/minigame/minigame.html", "Vòng Quay & Bắn Tâm Esport 30s"),
            (["so sanh", "wishlist", "yeu thich"], "/services/compare/compare.html", "Trang So Sánh & Wishlist"),
            (["xem gio hang", "mo gio hang", "thanh toan"], "/services/cart_checkout/cart.html", "Giỏ Hàng"),
            (["van don", "tracking", "don hang", "kiem tra don"], "/services/order_tracking/tracking.html", "Tra Cứu Vận Đơn NX Express"),
            (["kenh nguoi ban", "seller", "gian hang"], "/services/seller/seller-dashboard.html", "Kênh Người Bán"),
            (["toa an", "trong tai", "khieu nai"], "/services/admin_dispute/arbitration-court.html", "Tòa Án Trọng Tài AI"),
            (["quan tri", "admin"], "/services/admin_dispute/admin-center.html", "Trung Tâm Quản Trị Admin")
        ]:
            if any(k in msg_norm for k in nav_kws) and any(w in msg_norm for w in ["mo", "vao", "di", "sang", "trang", "xem", "toi", "kiem tra", "den"]):
                return {
                    "action_type": "NAVIGATE_PAGE",
                    "target_url": nav_url,
                    "cat_state": "run_rocket_zoom",
                    "cat_expr": "pure_joy_beam",
                    "particle": "dust",
                    "bubble_text": f"✨ Hô thần chú: Dịch chuyển tức thời! Mèo dẫn bạn sang [{nav_label}] ngay đây! 🚀🐾",
                    "groq_used": False
                }

        # 4. BIỂU DIỄN TRÒ VUI
        if any(k in msg_norm for k in ["tra sua", "boba", "uong sua"]):
            return {
                "action_type": "DO_TRICK",
                "cat_state": "drink_boba_tea",
                "cat_expr": "boba_chew_bliss",
                "particle": "heart",
                "bubble_text": "✨ Hô thần chú: Trà sữa trân châu đường đen ngon bá cháy luôn chủ nhân ơi! 🧋😻",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["an ca", "cho an", "doi bung"]):
            return {
                "action_type": "DO_TRICK",
                "cat_state": "eat_chef_kiss_savor",
                "cat_expr": "eat_starry_feast",
                "particle": "crumb",
                "bubble_text": "✨ Hô thần chú: Cá hồi tươi chuẩn 5 sao Michelin, cảm ơn chủ nhân nha! 🐟💖",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["lon vong", "nhao lon", "backflip", "nhay cao"]):
            return {
                "action_type": "DO_TRICK",
                "cat_state": "double_flip",
                "cat_expr": "starry_hyped_grin",
                "particle": "star",
                "bubble_text": "✨ Hô thần chú: Xem Mèo biểu diễn cú nhảy lộn 2 vòng trên không (Double Flip) nè! 🤸‍♂️✨",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["nhay mua", "dance", "quay"]):
            return {
                "action_type": "DO_TRICK",
                "cat_state": "dance_cyberpunk_neon_wave",
                "cat_expr": "rich_sunglasses_gold",
                "particle": "music",
                "bubble_text": "✨ Hô thần chú: Lên nhạc đi chủ nhân ơi, Mèo đeo kính vàng quẩy điệu Cyberpunk Neon nè! 🎵🕶️",
                "groq_used": False
            }

        if any(k in msg_norm for k in ["ngu", "nam", "banh mi", "loaf", "tan chay", "sploot"]):
            st_choice = "loaf_purr_toast" if ("banh mi" in msg_norm or "loaf" in msg_norm) else ("sploot_melted_cheese" if "tan chay" in msg_norm else "sleep_bubble_snore")
            return {
                "action_type": "DO_TRICK",
                "cat_state": st_choice,
                "cat_expr": "sleepy_drool_bubble",
                "particle": "zzz",
                "bubble_text": "✨ Hô thần chú: Khò khò... Mèo nằm ườn hóa lỏng nghỉ ngơi một chút đây~ 💤🍞",
                "groq_used": False
            }

        # 5. LỆNH TÌM KIẾM SẢN PHẨM & SĂN BỎ GIỎ HÀNG
        hunt_triggers = [
            "tim", "kiem", "de xuat", "goi y", "tu van", "bo gio", "bo vao gio",
            "them vao gio", "bo ro", "them gio", "mua", "dat", "lay", "chon",
            "rtx", "vga", "card", "ban phim", "phim", "chuot", "tai nghe",
            "dong ho", "massage", "balo", "tui", "den", "loa", "loc khong khi",
            "ram", "cpu", "main", "binh giu nhiet", "do", "mon", "san pham"
        ]
        if any(k in msg_norm for k in hunt_triggers):
            want_add_cart = any(k in msg_norm for k in ["bo gio", "bo vao gio", "them vao gio", "them gio", "de xuat", "mua", "san"])
            want_many = any(k in msg_norm for k in ["nhieu", "cac", "may", "2", "3", "4", "danh sach", "de xuat", "goi y"])
            limit_cnt = 2 if want_many else 1
            matched_prods, tokens = find_matching_products_for_cat(user_msg, limit=limit_cnt)
            kw_display = " ".join(tokens) if tokens else user_msg[:26]

            if not want_add_cart and any(k in msg_norm for k in ["tim", "kiem"]):
                return {
                    "action_type": "SEARCH_ONLY_AUTO_CLICK",
                    "search_query": kw_display,
                    "products": matched_prods,
                    "cat_state": "climb_spider_scramble",
                    "cat_expr": "matrix_code_eyes",
                    "particle": "sparkle",
                    "bubble_text": f"✨ Hô thần chú: Khai mở nhãn thần! Để Mèo trèo lên gõ '{kw_display}' và bấm nút Tìm kiếm giúp bạn nhé! 🔍🐾",
                    "groq_used": False
                }

            if matched_prods:
                names_str = ", ".join([f"{p['name'][:30]} ({int(float(p.get('price') or 0)):,}đ)" for p in matched_prods])
                ctx = f"Mèo đã trèo lên thanh tìm kiếm gõ '{kw_display}', nhảy xuống chọn {len(matched_prods)} món ({names_str}) và bỏ thẳng vào Giỏ hàng kèm nhãn 'Mèo AI Đề Xuất'."
                ai_txt = call_groq_for_cat_assistant(user_msg, ctx)
                return {
                    "action_type": "HUNT_AND_ADD_TO_CART",
                    "search_query": kw_display,
                    "products": matched_prods,
                    "cat_state": "carrying",
                    "cat_expr": "money_eyes",
                    "particle": "heart",
                    "bubble_text": ai_txt or f"✨ Hô thần chú: Đã tìm '{kw_display}' và tha {len(matched_prods)} món ({names_str}) bỏ thẳng vào Giỏ hàng cho bạn rồi nha! 🛒🐾",
                    "groq_used": bool(ai_txt)
                }

        ai_txt = call_groq_for_cat_assistant(user_msg, "Trò chuyện tư vấn thân thiện với khách hàng trên sàn Nexora Mall.")
        return {
            "action_type": "CHAT_REPLY",
            "cat_state": random.choice(["sit_paw_wave_hi", "ai_eureka_lightbulb_perk", "head_tilt"]),
            "cat_expr": random.choice(["lovestruck_sparkle", "uwu", "pure_joy_beam"]),
            "particle": "heart",
            "bubble_text": ai_txt or "✨ Hô thần chú: Meow~ Bạn hãy bảo Mèo: 'Tìm cho tôi RTX 4070', 'Mua sản phẩm số 1', 'Chỉnh lưới 4 cột' hoặc 'Đổi sang giao diện sáng thanh lịch' để Mèo thực hiện ngay nhé! 🐾✨",
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
