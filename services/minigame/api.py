import time
import random
import datetime
from flask import Blueprint, jsonify, request
from database.db_manager import get_db

minigame_bp = Blueprint("minigame", __name__)
bp = minigame_bp

WHEEL_PRIZES_8 = [
    {"index": 0, "label": "50.000 Xu", "type": "coins", "value": 50000, "desc": "Cộng trực tiếp 50.000 Xu vào Ví"},
    {"index": 1, "label": "Voucher GEAR50K", "type": "voucher", "code": "GEAR50K", "value": 50000, "desc": "Giảm 50.000đ cho đơn từ 150.000đ"},
    {"index": 2, "label": "20.000 Xu", "type": "coins", "value": 20000, "desc": "Cộng trực tiếp 20.000 Xu vào Ví"},
    {"index": 3, "label": "Voucher BRAND30K", "type": "voucher", "code": "BRAND30K", "value": 30000, "desc": "Giảm 30.000đ toàn sàn"},
    {"index": 4, "label": "10.000 Xu", "type": "coins", "value": 10000, "desc": "Cộng trực tiếp 10.000 Xu vào Ví"},
    {"index": 5, "label": "Voucher START15K", "type": "voucher", "code": "START15K", "value": 15000, "desc": "Giảm 15.000đ cho đơn từ 50.000đ"},
    {"index": 6, "label": "5.000 Xu", "type": "coins", "value": 5000, "desc": "Cộng trực tiếp 5.000 Xu vào Ví"},
    {"index": 7, "label": "1.000 Xu", "type": "coins", "value": 1000, "desc": "Cộng trực tiếp 1.000 Xu vào Ví"}
]

FARM_TREE_SPECIES = {
    "apple_gold": {
        "id": "apple_gold",
        "code": "apple_gold",
        "name": "Cây Táo Kim Bảo",
        "tree_type": "apple_gold",
        "visual_style": "apple_gold",
        "tree_name": "Cây Táo Kim Bảo",
        "reward_type": "voucher",
        "voucher_code": "TAOKIMBAO50K",
        "voucher_title": "Voucher Táo Kim Bảo Giảm 50.000đ",
        "voucher_value": 50000,
        "bonus_coins": 10000,
        "bonus_spins": 1,
        "cooldown_seconds": 180,
        "cooldown_label": "3 phút / lần chăm",
        "seller_name": "Hệ Thống Nông Trại",
        "cost": 0
    },
    "sakura_ruby": {
        "id": "sakura_ruby",
        "code": "sakura_ruby",
        "name": "Cây Anh Đào Mùa Xuân",
        "tree_type": "sakura_ruby",
        "visual_style": "sakura_ruby",
        "tree_name": "Cây Anh Đào Mùa Xuân",
        "reward_type": "voucher",
        "voucher_code": "ANHDAO100K",
        "voucher_title": "Voucher Anh Đào Mùa Xuân Giảm 100.000đ",
        "voucher_value": 100000,
        "bonus_coins": 12000,
        "bonus_spins": 1,
        "cooldown_seconds": 900,
        "cooldown_label": "15 phút / lần chăm",
        "seller_name": "Hệ Thống Nông Trại",
        "cost": 0
    },
    "bamboo_emerald": {
        "id": "bamboo_emerald",
        "code": "bamboo_emerald",
        "name": "Cây Trúc Thanh Ngọc",
        "tree_type": "bamboo_emerald",
        "visual_style": "bamboo_emerald",
        "tree_name": "Cây Trúc Thanh Ngọc",
        "reward_type": "voucher",
        "voucher_code": "HOATOC50K",
        "voucher_title": "Voucher Trúc Thanh Ngọc Trợ Giá Ship 50.000đ",
        "voucher_value": 50000,
        "bonus_coins": 8000,
        "bonus_spins": 2,
        "cooldown_seconds": 1800,
        "cooldown_label": "30 phút / lần chăm",
        "seller_name": "Hệ Thống Nông Trại",
        "cost": 0
    },
    "lotus_crystal": {
        "id": "lotus_crystal",
        "code": "lotus_crystal",
        "name": "Cây Sen Pha Lê",
        "tree_type": "lotus_crystal",
        "visual_style": "lotus_crystal",
        "tree_name": "Cây Sen Pha Lê",
        "reward_type": "voucher",
        "voucher_code": "SENPHALE120K",
        "voucher_title": "Voucher Sen Pha Lê Giảm 120.000đ",
        "voucher_value": 120000,
        "bonus_coins": 15000,
        "bonus_spins": 1,
        "cooldown_seconds": 3600,
        "cooldown_label": "1 giờ / lần chăm",
        "seller_name": "Hệ Thống Nông Trại",
        "cost": 0
    },
    "ginkgo_amber": {
        "id": "ginkgo_amber",
        "code": "ginkgo_amber",
        "name": "Cây Ngân Hạnh Hoàng Kim",
        "tree_type": "ginkgo_amber",
        "visual_style": "ginkgo_amber",
        "tree_name": "Cây Ngân Hạnh Hoàng Kim",
        "reward_type": "voucher",
        "voucher_code": "NGANHANH150K",
        "voucher_title": "Voucher Ngân Hạnh Hoàng Kim Giảm 150.000đ",
        "voucher_value": 150000,
        "bonus_coins": 25000,
        "bonus_spins": 2,
        "cooldown_seconds": 14400,
        "cooldown_label": "4 giờ / lần chăm",
        "seller_name": "Hệ Thống Nông Trại",
        "cost": 0
    },
    "bonsai_dragon": {
        "id": "bonsai_dragon",
        "code": "bonsai_dragon",
        "name": "Cây Tùng Cổ Thụ",
        "tree_type": "bonsai_dragon",
        "visual_style": "bonsai_dragon",
        "tree_name": "Cây Tùng Cổ Thụ",
        "reward_type": "voucher",
        "voucher_code": "TUNGCOTHU200K",
        "voucher_title": "Siêu Voucher Tùng Cổ Thụ Giảm 200.000đ",
        "voucher_value": 200000,
        "bonus_coins": 35000,
        "bonus_spins": 2,
        "cooldown_seconds": 43200,
        "cooldown_label": "12 giờ (Nửa ngày)",
        "seller_name": "Hệ Thống Nông Trại",
        "cost": 0
    },
    "super_coin_tree": {
        "id": "super_coin_tree",
        "code": "super_coin_tree",
        "name": "Cây Siêu Xu Tài Lộc",
        "tree_type": "super_coin_tree",
        "visual_style": "super_coin_tree",
        "tree_name": "Cây Siêu Xu Tài Lộc",
        "reward_type": "super_coins",
        "voucher_code": "SIEUXU50K",
        "voucher_title": "Thu hoạch thuần 50.000 Siêu Xu vào Ví",
        "voucher_value": 0,
        "bonus_coins": 50000,
        "bonus_spins": 3,
        "cooldown_seconds": 1200,
        "cooldown_label": "20 phút / lần chăm",
        "seller_name": "Hệ Thống Nông Trại",
        "cost": 0
    }
}

FARM_CROPS = FARM_TREE_SPECIES


def format_wait_duration(seconds_val):
    s = max(0, int(seconds_val or 0))
    if s >= 3600:
        h = s // 3600
        m = (s % 3600) // 60
        return f"{h} giờ {m} phút" if m > 0 else f"{h} giờ"
    if s >= 60:
        m = s // 60
        sec = s % 60
        return f"{m} phút {sec} giây" if sec > 0 else f"{m} phút"
    return f"{s} giây"


def ensure_minigame_tables():
    conn = get_db()
    cursor = conn.cursor()
    for u_col in [
        "coins INTEGER DEFAULT 15000",
        "spins_left INTEGER DEFAULT 2",
        "streak_days INTEGER DEFAULT 1",
        "last_checkin_date TEXT DEFAULT ''",
        "role TEXT DEFAULT 'buyer'"
    ]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {u_col}")
        except Exception:
            pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS wheel_spin_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reward_label TEXT NOT NULL,
            reward_type TEXT NOT NULL,
            reward_value INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_farm_plots (
            user_id INTEGER PRIMARY KEY,
            tree_type TEXT DEFAULT 'apple_gold',
            tree_name TEXT DEFAULT 'Cây Táo Kim Bảo',
            growth_pct INTEGER DEFAULT 30,
            water_count INTEGER DEFAULT 1,
            fertilize_count INTEGER DEFAULT 0,
            harvested_count INTEGER DEFAULT 0,
            last_action_ts INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for f_col in [
        "tree_type TEXT DEFAULT 'apple_gold'",
        "last_action_ts INTEGER DEFAULT 0"
    ]:
        try:
            cursor.execute(f"ALTER TABLE user_farm_plots ADD COLUMN {f_col}")
        except Exception:
            pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS seller_custom_seeds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed_code TEXT UNIQUE NOT NULL,
            seller_id INTEGER DEFAULT 1,
            seller_name TEXT DEFAULT 'Gian Hàng Đối Tác',
            tree_name TEXT NOT NULL,
            visual_style TEXT DEFAULT 'apple_gold',
            reward_type TEXT DEFAULT 'voucher',
            voucher_code TEXT DEFAULT 'SHOPVOUCHER50K',
            voucher_title TEXT DEFAULT 'Voucher Hạt Giống Gian Hàng',
            voucher_value INTEGER DEFAULT 50000,
            bonus_coins INTEGER DEFAULT 15000,
            bonus_spins INTEGER DEFAULT 1,
            cooldown_seconds INTEGER DEFAULT 600,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


def get_merged_species_catalog(cursor):
    catalog = dict(FARM_TREE_SPECIES)
    try:
        cursor.execute("SELECT * FROM seller_custom_seeds WHERE is_active = 1 ORDER BY id DESC LIMIT 20")
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            s_code = r["seed_code"]
            cd_sec = int(r.get("cooldown_seconds") or 600)
            catalog[s_code] = {
                "id": s_code,
                "code": s_code,
                "name": r["tree_name"],
                "tree_type": s_code,
                "visual_style": r.get("visual_style") or "apple_gold",
                "tree_name": r["tree_name"],
                "reward_type": r.get("reward_type") or "voucher",
                "voucher_code": r.get("voucher_code") or "SHOP50K",
                "voucher_title": r.get("voucher_title") or f"Voucher {r['tree_name']}",
                "voucher_value": int(r.get("voucher_value") or 50000),
                "bonus_coins": int(r.get("bonus_coins") or 15000),
                "bonus_spins": int(r.get("bonus_spins") or 1),
                "cooldown_seconds": cd_sec,
                "cooldown_label": format_wait_duration(cd_sec) + " / lần chăm",
                "seller_id": r.get("seller_id") or 1,
                "seller_name": r.get("seller_name") or "Gian Hàng Đối Tác",
                "is_seller_seed": True,
                "cost": 0
            }
    except Exception:
        pass
    return catalog


def is_wheel_zero_spin_bug_enabled(cursor):
    try:
        cursor.execute("SELECT is_bug_active FROM qa_bug_matrix WHERE bug_code = 'BUG-01'")
        r = cursor.fetchone()
        return bool(r and int(r[0] or 0) == 1)
    except Exception:
        return False


@bp.route("/status", methods=["GET"])
def get_minigame_status():
    ensure_minigame_tables()
    user_id = request.args.get("user_id", type=int) or 1
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, full_name, coins, spins_left, streak_days, last_checkin_date FROM users WHERE id = ?", (user_id,))
    u_row = cursor.fetchone()
    if not u_row:
        cursor.execute("SELECT id, full_name, coins, spins_left, streak_days, last_checkin_date FROM users ORDER BY id ASC LIMIT 1")
        u_row = cursor.fetchone()
    u = dict(u_row) if u_row else {"id": 1, "full_name": "Thành viên", "coins": 15000, "spins_left": 2, "streak_days": 1, "last_checkin_date": ""}

    today_str = datetime.date.today().strftime("%Y-%m-%d")
    checked_in_today = (str(u.get("last_checkin_date") or "")[:10] == today_str)

    cursor.execute(
        "SELECT reward_label, reward_type, reward_value, created_at FROM wheel_spin_history WHERE user_id = ? ORDER BY id DESC LIMIT 8",
        (u["id"],)
    )
    history = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({
        "ok": True,
        "user_id": u["id"],
        "full_name": u.get("full_name") or "Thành viên",
        "coins": int(u.get("coins") if u.get("coins") is not None else 15000),
        "spins_left": int(u.get("spins_left") if u.get("spins_left") is not None else 2),
        "streak_days": int(u.get("streak_days") if u.get("streak_days") is not None else 1),
        "checked_in_today": checked_in_today,
        "prizes": WHEEL_PRIZES_8,
        "history": history
    }), 200


@bp.route("/checkin", methods=["POST"])
def daily_checkin():
    ensure_minigame_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or 1
    today_str = datetime.date.today().strftime("%Y-%m-%d")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, coins, spins_left, streak_days, last_checkin_date FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT id, coins, spins_left, streak_days, last_checkin_date FROM users ORDER BY id ASC LIMIT 1")
        row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"ok": False, "error": "Không tìm thấy tài khoản!"}), 200

    u = dict(row)
    if str(u.get("last_checkin_date") or "")[:10] == today_str:
        conn.close()
        return jsonify({
            "ok": True,
            "already_checked_in": True,
            "reward_coins": 0,
            "reward_spins": 0,
            "coins": int(u.get("coins") or 0),
            "spins_left": int(u.get("spins_left") or 0),
            "streak_days": int(u.get("streak_days") or 1),
            "message": "Hôm nay bạn đã điểm danh nhận thưởng rồi! Hãy vào Vòng Quay hoặc Nông Trại Cây nhé."
        }), 200

    new_coins = int(u.get("coins") or 0) + 5000
    new_spins = int(u.get("spins_left") or 0) + 1
    new_streak = int(u.get("streak_days") or 0) + 1
    cursor.execute(
        "UPDATE users SET coins = ?, spins_left = ?, streak_days = ?, last_checkin_date = ? WHERE id = ?",
        (new_coins, new_spins, new_streak, today_str, u["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({
        "ok": True,
        "already_checked_in": False,
        "reward_coins": 5000,
        "reward_spins": 1,
        "coins": new_coins,
        "spins_left": new_spins,
        "streak_days": new_streak,
        "message": f"Điểm danh chuỗi {new_streak} ngày thành công! Nhận +5.000 Xu & +1 Lượt quay miễn phí!"
    }), 200


@bp.route("/missions/progress", methods=["POST"])
def update_mission_progress():
    ensure_minigame_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or 1
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET spins_left = COALESCE(spins_left, 0) + 2, coins = COALESCE(coins, 0) + 5000 WHERE id = ?",
        (user_id,)
    )
    cursor.execute("SELECT coins, spins_left FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    u = dict(row) if row else {"coins": 15000, "spins_left": 2}
    return jsonify({
        "ok": True,
        "coins": int(u.get("coins") or 0),
        "spins_left": int(u.get("spins_left") or 0),
        "message": "Hoàn thành nhiệm vụ! Đã cộng +2 Lượt quay & +5.000 Xu vào tài khoản!"
    }), 200


@bp.route("/buy-spins", methods=["POST"])
def buy_spins_with_coins():
    ensure_minigame_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or 1
    cost_per_spin = 5000

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT coins, spins_left FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Không tìm thấy tài khoản!"}), 404
    u = dict(row)
    cur_coins = int(u.get("coins") or 0)
    if cur_coins < cost_per_spin:
        conn.close()
        return jsonify({"error": f"Bạn cần tối thiểu {cost_per_spin:,} Xu để đổi 1 Lượt quay (Hiện có: {cur_coins:,} Xu)!"}), 400

    new_coins = cur_coins - cost_per_spin
    new_spins = int(u.get("spins_left") or 0) + 1
    cursor.execute("UPDATE users SET coins = ?, spins_left = ? WHERE id = ?", (new_coins, new_spins, user_id))
    conn.commit()
    conn.close()
    return jsonify({
        "ok": True,
        "coins": new_coins,
        "spins_left": new_spins,
        "message": f"Đã đổi 5.000 Xu lấy +1 Lượt quay thành công! (Tổng lượt hiện có: {new_spins})"
    }), 200


@bp.route("/wheel/spin", methods=["POST"])
@bp.route("/spin", methods=["POST"])
def spin_lucky_wheel():
    ensure_minigame_tables()
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or 1

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN IMMEDIATE")
        cursor.execute("SELECT id, coins, spins_left FROM users WHERE id = ?", (user_id,))
        u_row = cursor.fetchone()
        if not u_row:
            cursor.execute("SELECT id, coins, spins_left FROM users ORDER BY id ASC LIMIT 1")
            u_row = cursor.fetchone()
        if not u_row:
            conn.rollback()
            return jsonify({"ok": False, "error": "Vui lòng đăng nhập tài khoản hợp lệ để quay thưởng!"}), 200

        u_dict = dict(u_row)
        spins_left = int(u_dict.get("spins_left") if u_dict.get("spins_left") is not None else 0)
        bug_allow_zero = is_wheel_zero_spin_bug_enabled(cursor)

        if spins_left <= 0 and not bug_allow_zero:
            conn.rollback()
            return jsonify({
                "ok": False,
                "error": "Bạn đã hết lượt quay (0 lượt)! Hãy bấm nút [Đổi 1 Lượt] hoặc [+2 Lượt Ngay] ở thanh nhiệm vụ phía trên nhé!",
                "spins_left": 0,
                "coins": int(u_dict.get("coins") or 0)
            }), 200

        chosen = random.choice(WHEEL_PRIZES_8)
        new_spins = max(0, spins_left - 1)
        new_coins = int(u_dict.get("coins") or 0) + (chosen["value"] if chosen["type"] == "coins" else 0)

        cursor.execute("UPDATE users SET spins_left = ?, coins = ? WHERE id = ?", (new_spins, new_coins, u_dict["id"]))
        cursor.execute(
            "INSERT INTO wheel_spin_history (user_id, reward_label, reward_type, reward_value) VALUES (?, ?, ?, ?)",
            (u_dict["id"], chosen["label"], chosen["type"], chosen["value"])
        )

        if chosen["type"] == "voucher":
            v_code = chosen["code"]
            v_val = chosen["value"]
            try:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO vouchers (code, title, discount_type, discount_value, min_order_value, usage_limit, used_count, expiry_date, is_active)
                    VALUES (?, ?, 'fixed', ?, 50000, 100, 1, '2027-12-31', 1)
                    """,
                    (v_code, f"Voucher Vòng Quay {v_code} (Giảm {v_val:,}đ)", v_val)
                )
                cursor.execute(
                    "INSERT OR IGNORE INTO user_vouchers (user_id, voucher_code, is_used) VALUES (?, ?, 0)",
                    (u_dict["id"], v_code)
                )
            except Exception:
                pass

        conn.commit()
        return jsonify({
            "ok": True,
            "prize": chosen,
            "prize_index": chosen["index"],
            "reward_label": chosen["label"],
            "spins_left": new_spins,
            "coins": new_coins,
            "message": f"Chúc mừng bạn quay trúng [{chosen['label']}] — {chosen['desc']}!"
        }), 200
    except Exception as ex:
        conn.rollback()
        return jsonify({"ok": False, "error": f"Lỗi khi quay thưởng: {ex}"}), 200
    finally:
        conn.close()


@bp.route("/leaderboard", methods=["GET"])
def get_minigame_leaderboard():
    ensure_minigame_tables()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id,
               COALESCE(NULLIF(full_name, ''), NULLIF(username, ''), 'Khách Mua #' || id) as full_name,
               COALESCE(coins, 0) as coins,
               COALESCE(streak_days, 1) as streak_days,
               COALESCE(role, 'buyer') as role
        FROM users
        WHERE LOWER(COALESCE(role, 'buyer')) NOT IN ('admin', 'seller')
          AND LOWER(COALESCE(username, '')) NOT IN ('admin', 'quantri', 'seller')
          AND LOWER(COALESCE(full_name, '')) NOT LIKE '%quản trị%'
          AND LOWER(COALESCE(full_name, '')) NOT LIKE '%official%'
          AND LOWER(COALESCE(full_name, '')) NOT LIKE '%store%'
        ORDER BY coins DESC, streak_days DESC
        LIMIT 10
        """
    )
    leaders = [dict(r) for r in cursor.fetchall()]
    conn.close()

    fallback_buyers = [
        {"id": 201, "full_name": "Nguyễn Minh Quân (Khách VIP)", "coins": 185000, "streak_days": 14, "role": "buyer"},
        {"id": 202, "full_name": "Trần Hoàng Hải (Săn Deal)", "coins": 142000, "streak_days": 11, "role": "buyer"},
        {"id": 203, "full_name": "Lê Thu Hà (Member Bạch Kim)", "coins": 115000, "streak_days": 9, "role": "buyer"},
        {"id": 204, "full_name": "Phạm Tuấn Anh (Thành Viên Vàng)", "coins": 96000, "streak_days": 8, "role": "buyer"},
        {"id": 205, "full_name": "Vũ Thanh Tùng (Build PC)", "coins": 84000, "streak_days": 7, "role": "buyer"},
        {"id": 206, "full_name": "Đặng Ngọc Mai (Yêu Công Nghệ)", "coins": 72000, "streak_days": 6, "role": "buyer"},
        {"id": 207, "full_name": "Hoàng Đức Anh (Khách Thân Thiết)", "coins": 65000, "streak_days": 5, "role": "buyer"},
        {"id": 208, "full_name": "Bùi Phương Thảo (Săn Voucher)", "coins": 54000, "streak_days": 4, "role": "buyer"}
    ]
    existing_names = {str(x.get("full_name") or "").lower() for x in leaders}
    for fb in fallback_buyers:
        if len(leaders) >= 10:
            break
        if fb["full_name"].lower() not in existing_names:
            leaders.append(fb)

    leaders.sort(key=lambda x: (int(x.get("coins") or 0), int(x.get("streak_days") or 1)), reverse=True)
    return jsonify({
        "ok": True,
        "filtered_roles": ["buyer"],
        "excluded_roles": ["admin", "seller"],
        "leaderboard": leaders[:10]
    }), 200


@bp.route("/farm/seller-seeds", methods=["GET", "POST", "DELETE"])
def manage_seller_custom_seeds():
    ensure_minigame_tables()
    conn = get_db()
    cursor = conn.cursor()

    if request.method == "GET":
        merged = get_merged_species_catalog(cursor)
        cursor.execute("SELECT * FROM seller_custom_seeds WHERE is_active = 1 ORDER BY id DESC")
        custom_rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({
            "ok": True,
            "custom_seeds": custom_rows,
            "all_species": list(merged.values())
        }), 200

    if request.method == "DELETE":
        seed_code = (request.args.get("seed_code") or "").strip()
        cursor.execute("DELETE FROM seller_custom_seeds WHERE seed_code = ?", (seed_code,))
        conn.commit()
        conn.close()
        return jsonify({"ok": True, "message": f"Đã xóa hạt giống {seed_code}!"}), 200

    data = request.get_json(silent=True) or {}
    seller_id = int(data.get("seller_id") or 1)
    seller_name = (data.get("seller_name") or "Gian Hàng Chính Hãng").strip()
    tree_name = (data.get("tree_name") or "Cây Hạt Giống Đặc Biệt").strip()
    visual_style = (data.get("visual_style") or "apple_gold").strip()
    reward_type = (data.get("reward_type") or "voucher").strip().lower()
    cooldown_sec = max(60, min(86400, int(data.get("cooldown_seconds") or 600)))

    if reward_type == "super_coins":
        voucher_code = "SIEUXU_SHOP"
        voucher_val = 0
        bonus_coins = max(5000, int(data.get("bonus_coins") or 50000))
        voucher_title = f"Thu hoạch {bonus_coins:,} Siêu Xu từ {seller_name}"
    else:
        voucher_code = (data.get("voucher_code") or f"SHOP{seller_id}V50K").strip().upper()
        voucher_val = max(10000, int(data.get("voucher_value") or 50000))
        bonus_coins = max(1000, int(data.get("bonus_coins") or 10000))
        voucher_title = (data.get("voucher_title") or f"Voucher {tree_name} Giảm {voucher_val:,}đ").strip()
        try:
            cursor.execute(
                """
                INSERT OR IGNORE INTO vouchers (code, title, discount_type, discount_value, min_order_value, usage_limit, used_count, expiry_date, is_active)
                VALUES (?, ?, 'fixed', ?, ?, 200, 0, '2027-12-31', 1)
                """,
                (voucher_code, voucher_title, voucher_val, voucher_val * 2)
            )
        except Exception:
            pass

    seed_code = f"seed_{seller_id}_{int(time.time()) % 100000}"
    cursor.execute(
        """
        INSERT INTO seller_custom_seeds (
            seed_code, seller_id, seller_name, tree_name, visual_style,
            reward_type, voucher_code, voucher_title, voucher_value, bonus_coins, bonus_spins, cooldown_seconds, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)
        """,
        (seed_code, seller_id, seller_name, tree_name, visual_style, reward_type, voucher_code, voucher_title, voucher_val, bonus_coins, cooldown_sec)
    )
    conn.commit()
    merged = get_merged_species_catalog(cursor)
    conn.close()

    return jsonify({
        "ok": True,
        "seed_code": seed_code,
        "all_species": list(merged.values()),
        "message": f"Đã tạo hạt giống [{tree_name}] thành công! (Thời gian chờ mỗi lần chăm: {format_wait_duration(cooldown_sec)})"
    }), 201


@bp.route("/farm", methods=["GET", "POST"])
@bp.route("/farm/buy", methods=["POST"])
def handle_voucher_farm():
    ensure_minigame_tables()
    conn = get_db()
    cursor = conn.cursor()
    req_json = request.get_json(silent=True) or {}
    user_id = request.args.get("user_id", type=int) or req_json.get("user_id") or 1

    cursor.execute("SELECT id, role, coins, spins_left FROM users WHERE id = ?", (user_id,))
    u_row = cursor.fetchone()
    if not u_row:
        cursor.execute("SELECT id, role, coins, spins_left FROM users ORDER BY id ASC LIMIT 1")
        u_row = cursor.fetchone()
    u_info = dict(u_row) if u_row else {"id": 1, "role": "buyer", "coins": 15000, "spins_left": 2}
    user_role = str(req_json.get("role") or request.args.get("role") or u_info.get("role") or "buyer").lower()
    is_admin_user = (user_role == "admin")

    catalog = get_merged_species_catalog(cursor)

    cursor.execute("SELECT * FROM user_farm_plots WHERE user_id = ?", (user_id,))
    plot_row = cursor.fetchone()
    if not plot_row:
        cursor.execute(
            """
            INSERT INTO user_farm_plots (user_id, tree_type, tree_name, growth_pct, water_count, fertilize_count, harvested_count, last_action_ts)
            VALUES (?, 'apple_gold', 'Cây Táo Kim Bảo', 30, 1, 0, 0, 0)
            """,
            (user_id,)
        )
        conn.commit()
        cursor.execute("SELECT * FROM user_farm_plots WHERE user_id = ?", (user_id,))
        plot_row = cursor.fetchone()
    plot = dict(plot_row)
    cur_type = plot.get("tree_type") or "apple_gold"
    spec = catalog.get(cur_type, catalog["apple_gold"])

    now_ts = int(time.time())
    last_ts = int(plot.get("last_action_ts") or 0)
    cd_total = int(spec.get("cooldown_seconds") or 180)
    elapsed = now_ts - last_ts
    cd_remaining = 0 if is_admin_user else max(0, cd_total - elapsed)

    reward_preview_txt = f"{spec['bonus_coins']:,} Siêu Xu" if spec.get("reward_type") == "super_coins" else f"Mã {spec['voucher_code']} (+{spec['bonus_coins']:,} Xu)"
    msg = f"Đang trồng [{spec['tree_name']}]: Đạt 100% nhận {reward_preview_txt}!"
    reward_code = None
    harvest_summary = None
    on_cooldown = (cd_remaining > 0)

    if request.method == "POST":
        action = (req_json.get("action") or "water").strip().lower()
        growth = int(plot.get("growth_pct") or 0)

        if action == "select_tree":
            req_type = (req_json.get("tree_type") or "apple_gold").strip()
            new_spec = catalog.get(req_type, catalog["apple_gold"])
            cursor.execute(
                "UPDATE user_farm_plots SET tree_type = ?, tree_name = ?, last_action_ts = 0 WHERE user_id = ?",
                (new_spec["tree_type"], new_spec["tree_name"], user_id)
            )
            spec = new_spec
            cd_total = int(spec.get("cooldown_seconds") or 180)
            cd_remaining = 0
            on_cooldown = False
            r_txt = f"{spec['bonus_coins']:,} Siêu Xu" if spec.get("reward_type") == "super_coins" else f"Mã {spec['voucher_code']}"
            msg = f"Đã gieo hạt giống [{new_spec['tree_name']}] (Chu kỳ chăm: {new_spec['cooldown_label']} • Quả nở: {r_txt})!"

        elif action == "admin_instant_mature" and is_admin_user:
            growth = 100
            cursor.execute("UPDATE user_farm_plots SET growth_pct = 100, last_action_ts = 0 WHERE user_id = ?", (user_id,))
            cd_remaining = 0
            on_cooldown = False
            msg = f"Đặc quyền Admin: Đã kích chín 100% cho [{spec['tree_name']}] ngay lập tức!"

        elif action in ("water", "tuoi_nuoc", "fertilize", "bon_phan", "buy"):
            if not is_admin_user and cd_remaining > 0:
                conn.close()
                return jsonify({
                    "ok": False,
                    "on_cooldown": True,
                    "cooldown_remaining": cd_remaining,
                    "cooldown_total": cd_total,
                    "is_admin": is_admin_user,
                    "growth_pct": growth,
                    "tree_type": spec["tree_type"],
                    "visual_style": spec.get("visual_style") or spec["tree_type"],
                    "tree_name": spec["tree_name"],
                    "error": f"Cây đang hấp thụ dinh dưỡng! Vui lòng chờ {format_wait_duration(cd_remaining)} nữa để chăm tiếp (Chỉ Admin mới có quyền tưới/bón tức thì 0 giây)."
                }), 200

            delta = 25 if action in ("water", "tuoi_nuoc") else 35
            growth = min(100, growth + delta)
            new_last_ts = 0 if is_admin_user else now_ts
            col_inc = "water_count = water_count + 1" if delta == 25 else "fertilize_count = fertilize_count + 1"
            cursor.execute(
                f"UPDATE user_farm_plots SET growth_pct = ?, {col_inc}, last_action_ts = ? WHERE user_id = ?",
                (growth, new_last_ts, user_id)
            )
            cd_remaining = 0 if is_admin_user else cd_total
            on_cooldown = (cd_remaining > 0)
            act_label = "Tưới mưa mát lành (+25%)" if delta == 25 else "Bón tinh chất vàng (+35%)"
            wait_note = " (Admin: Chăm tiếp tức thì 0s)" if is_admin_user else f" (Lần chăm tiếp sau: {format_wait_duration(cd_total)})"
            msg = f"Đã {act_label} cho {spec['tree_name']}! Tiến độ đạt {growth}%{wait_note}."

        elif action in ("harvest", "thu_hoach"):
            if growth < 100:
                conn.close()
                return jsonify({
                    "ok": False,
                    "error": f"Cây mới đạt {growth}% (Cần đủ 100% mới thu hoạch được quả)!",
                    "growth_pct": growth
                }), 200

            b_coins = int(spec.get("bonus_coins") or 10000)
            b_spins = int(spec.get("bonus_spins") or 1)
            cursor.execute("UPDATE user_farm_plots SET growth_pct = 15, harvested_count = harvested_count + 1, last_action_ts = 0 WHERE user_id = ?", (user_id,))
            cd_remaining = 0
            on_cooldown = False

            if spec.get("reward_type") == "super_coins":
                reward_code = f"+{b_coins:,} SIÊU XU"
                harvest_summary = {
                    "title": f"Thu Hoạch {spec['tree_name']}",
                    "badge": f"🪙 +{b_coins:,} XU TÀI LỘC",
                    "detail": f"Đã cộng trực tiếp {b_coins:,} Xu vào Ví và +{b_spins} Lượt quay!"
                }
            else:
                reward_code = spec["voucher_code"]
                try:
                    cursor.execute(
                        """
                        INSERT OR IGNORE INTO vouchers (code, title, discount_type, discount_value, min_order_value, usage_limit, used_count, expiry_date, is_active)
                        VALUES (?, ?, 'fixed', ?, 150000, 200, 1, '2027-12-31', 1)
                        """,
                        (reward_code, spec["voucher_title"], spec["voucher_value"])
                    )
                    cursor.execute("INSERT OR IGNORE INTO user_vouchers (user_id, voucher_code, is_used) VALUES (?, ?, 0)", (user_id, reward_code))
                except Exception:
                    pass
                harvest_summary = {
                    "title": f"Thu Hoạch {spec['tree_name']}",
                    "badge": f"🎟️ MÃ: {reward_code}",
                    "detail": f"{spec['voucher_title']} + {b_coins:,} Xu + {b_spins} Lượt quay!"
                }

            cursor.execute(
                "UPDATE users SET coins = COALESCE(coins, 0) + ?, spins_left = COALESCE(spins_left, 0) + ? WHERE id = ?",
                (b_coins, b_spins, user_id)
            )
            msg = f"Thu hoạch [{spec['tree_name']}] thành công! Nhận [{reward_code}] + {b_coins:,} Xu + {b_spins} Lượt quay!"

        conn.commit()
        cursor.execute("SELECT * FROM user_farm_plots WHERE user_id = ?", (user_id,))
        plot = dict(cursor.fetchone())

    cursor.execute("SELECT coins, spins_left FROM users WHERE id = ?", (user_id,))
    u_after = cursor.fetchone()
    u_final = dict(u_after) if u_after else {"coins": 15000, "spins_left": 2}
    conn.close()

    return jsonify({
        "ok": True,
        "farm": plot,
        "is_admin": is_admin_user,
        "tree_type": spec["tree_type"],
        "visual_style": spec.get("visual_style") or spec["tree_type"],
        "tree_name": spec["tree_name"],
        "reward_type": spec.get("reward_type") or "voucher",
        "voucher_reward_preview": f"+{spec['bonus_coins']:,} Siêu Xu" if spec.get("reward_type") == "super_coins" else spec["voucher_code"],
        "cooldown_seconds": cd_total,
        "cooldown_label": spec.get("cooldown_label") or format_wait_duration(cd_total),
        "cooldown_remaining": cd_remaining,
        "on_cooldown": on_cooldown,
        "species_catalog": list(catalog.values()),
        "growth_pct": plot.get("growth_pct", 30),
        "harvested_count": plot.get("harvested_count", 0),
        "coins": int(u_final.get("coins") or 0),
        "spins_left": int(u_final.get("spins_left") or 0),
        "reward_code": reward_code,
        "harvest_summary": harvest_summary,
        "message": msg
    }), 200
