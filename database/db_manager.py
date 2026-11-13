import sqlite3
import os
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "nvidia_store.db")

AUTO_SEEDED_SHOP_EMAILS = (
    "seller@nvidia.com",
    "mall_tech@nividax.vn",
    "glowlife@nividax.vn",
    "homesmart@nividax.vn",
    "urbanbag@nividax.vn"
)


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_columns(conn):
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(users)")
    u_cols = {r["name"] for r in cur.fetchall()}
    if "gender" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT 'other'")
    if "dob" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN dob TEXT DEFAULT ''")
    if "spin_tickets" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN spin_tickets INTEGER DEFAULT 3")
    if "browse_seconds" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN browse_seconds INTEGER DEFAULT 0")
    if "streak_count" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN streak_count INTEGER DEFAULT 0")
    if "last_checkin" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN last_checkin TEXT DEFAULT ''")
    if "shop_tier" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_tier TEXT DEFAULT 'normal'")
    if "shop_theme_color" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_theme_color TEXT DEFAULT 'rgb(118, 185, 0)'")
    if "shop_slogan" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN shop_slogan TEXT DEFAULT 'Cam kết sản phẩm đúng mô tả & hỗ trợ đổi trả nhanh chóng'")
    if "verified_tick" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN verified_tick INTEGER DEFAULT 0")
    if "is_verified" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0")
    if "identity_code" not in u_cols:
        cur.execute("ALTER TABLE users ADD COLUMN identity_code TEXT DEFAULT ''")

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

    cur.execute("PRAGMA table_info(disputes)")
    d_cols = {r["name"] for r in cur.fetchall()}
    if "workflow_code" not in d_cols:
        cur.execute("ALTER TABLE disputes ADD COLUMN workflow_code TEXT DEFAULT 'SOP_03_SAI_MAU'")

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
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )"""
    )

    cur.execute(
        """CREATE TABLE IF NOT EXISTS platform_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            date_label TEXT DEFAULT '',
            start_date TEXT DEFAULT '',
            end_date TEXT DEFAULT '',
            budget_xu INTEGER DEFAULT 10000000000,
            distributed_xu INTEGER DEFAULT 0,
            vouchers_issued INTEGER DEFAULT 0,
            bonus_multiplier REAL DEFAULT 1.0,
            voucher_code TEXT DEFAULT '',
            voucher_discount REAL DEFAULT 30000,
            min_order_value REAL DEFAULT 100000,
            theme_color TEXT DEFAULT 'rgb(118, 185, 0)',
            banner_slogan TEXT DEFAULT '',
            is_active INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    conn.commit()


def ensure_admin_account(conn):
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE LOWER(username) = 'admin' OR LOWER(email) = 'admin@nvidia.com'")

    placeholders = ",".join(["?"] * len(AUTO_SEEDED_SHOP_EMAILS))
    cur.execute(
        f"SELECT id FROM users WHERE LOWER(email) IN ({placeholders}) AND COALESCE(address, '') != 'MANUAL_JSON'",
        AUTO_SEEDED_SHOP_EMAILS
    )
    old_shop_ids = [r["id"] for r in cur.fetchall()]
    if old_shop_ids:
        id_placeholders = ",".join(["?"] * len(old_shop_ids))
        cur.execute(f"DELETE FROM products WHERE seller_id IN ({id_placeholders})", tuple(old_shop_ids))
        cur.execute(f"DELETE FROM users WHERE id IN ({id_placeholders})", tuple(old_shop_ids))

    pw_hash = generate_password_hash("Nivida@2026")
    cur.execute(
        "SELECT id FROM users WHERE LOWER(username) = 'quantri' OR LOWER(email) = 'quantri@nivida.vn' LIMIT 1"
    )
    row = cur.fetchone()
    if row:
        cur.execute(
            """UPDATE users
               SET username = 'quantri',
                   email = 'quantri@nivida.vn',
                   full_name = 'Quản Trị Viên Nivida',
                   company_name = 'Nivida Official Mall',
                   role = 'admin',
                   password_hash = ?,
                   shop_tier = 'mall',
                   verified_tick = 1,
                   is_mall = 1
               WHERE id = ?""",
            (pw_hash, row["id"])
        )
    else:
        cur.execute(
            """INSERT INTO users
               (username, full_name, email, password_hash, role, company_name, phone, address, wallet_balance, is_mall, gender, spin_tickets, shop_tier, verified_tick)
               VALUES ('quantri', 'Quản Trị Viên Nivida', 'quantri@nivida.vn', ?, 'admin', 'Nivida Official Mall', '0988888888', 'Số 10 Phạm Văn Bạch, Phường Dịch Vọng, Thành phố Hà Nội', 10000000, 1, 'other', 10, 'mall', 1)""",
            (pw_hash,)
        )
    conn.commit()


def seed_default_events(conn):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as c FROM platform_events")
    if cur.fetchone()["c"] == 0:
        default_events = [
            (
                "EVENT_20_10",
                "Sự Kiện 20/10 - Đại Tiệc Quà Tặng & Công Nghệ",
                "20/10",
                "2026-10-15",
                "2026-10-25",
                10000000000,
                0,
                0,
                1.5,
                "EVENT2010",
                40000,
                100000,
                "rgb(236, 72, 153)",
                "Tài trợ 10 Tỷ Xu dịp 20/10: Nhân 1.5x Xu thưởng Vòng quay & Phát hành Cây Voucher 0 Xu!",
                1
            ),
            (
                "EVENT_11_11",
                "Sự Kiện 11/11 - Siêu Sale Độc Thân & Đại Tiệc Công Nghệ",
                "11/11",
                "2026-11-01",
                "2026-11-15",
                15000000000,
                0,
                0,
                2.0,
                "MEGA1111",
                111000,
                250000,
                "rgb(249, 115, 22)",
                "Siêu hội 11/11 Quỹ 15 Tỷ Xu: Nhân đôi (x2.0) Xu thưởng & Săn Siêu Voucher giảm 111.000 Xu!",
                0
            ),
            (
                "EVENT_20_11",
                "Sự Kiện 20/11 - Tri Ân Thầy Cô & Tiếp Sức Tri Thức",
                "20/11",
                "2026-11-16",
                "2026-11-25",
                8000000000,
                0,
                0,
                1.5,
                "TRIAN2011",
                50000,
                120000,
                "rgb(14, 165, 233)",
                "Chào mừng Ngày Nhà Giáo Việt Nam 20/11: Ưu đãi Laptop, Balo, Đèn bàn & Thiết bị học tập!",
                0
            )
        ]
        cur.executemany(
            """INSERT INTO platform_events
               (event_code, title, date_label, start_date, end_date, budget_xu, distributed_xu, vouchers_issued,
                bonus_multiplier, voucher_code, voucher_discount, min_order_value, theme_color, banner_slogan, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            default_events
        )
    conn.commit()


def seed_initial_data(conn):
    ensure_admin_account(conn)
    seed_default_events(conn)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as c FROM vouchers")
    if cur.fetchone()["c"] == 0:
        vouchers_seed = [
            ("WELCOME100K", "Voucher Tân Thủ Giảm 100.000 Xu Đơn Từ 200.000 Xu", 100000, 200000, 9999, 0, "31/12/2026"),
            ("EVENT2010", "Voucher Sự Kiện 20/10 Giảm 40.000 Xu Toàn Sàn", 40000, 100000, 5000, 0, "31/12/2026"),
            ("MEGA1111", "Siêu Voucher Sự Kiện 11/11 Giảm 111.000 Xu", 111000, 250000, 5000, 0, "31/12/2026"),
            ("TRIAN2011", "Voucher Tri Ân 20/11 Giảm 50.000 Xu", 50000, 120000, 5000, 0, "31/12/2026"),
            ("VOUCHER15K", "Voucher Cây Khởi Nghiệp 0 Xu Giảm 15.000 Xu", 15000, 50000, 5000, 0, "31/12/2026"),
            ("GEAR50K", "Voucher Thiết Bị & Phụ Kiện Giảm 50.000 Xu Đơn Từ 150.000 Xu", 50000, 150000, 3000, 0, "31/12/2026"),
            ("TECH100K", "Siêu Voucher Giảm 100.000 Xu Đơn Từ 300.000 Xu", 100000, 300000, 2000, 0, "31/12/2026")
        ]
        cur.executemany(
            """INSERT INTO vouchers (code, title, discount_value, min_order_value, total_limit, used_count, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            vouchers_seed
        )

    cur.execute("SELECT COUNT(*) as c FROM ai_settings")
    if cur.fetchone()["c"] == 0:
        cur.execute(
            """INSERT INTO ai_settings (id, model_name, system_prompt, kill_switch, cart_reset_version)
               VALUES (1, 'llama-3.3-70b-versatile', 'Bạn là Trọng tài AI & Cố vấn Thương mại của sàn Nivida.', 0, 1)"""
        )

    conn.commit()


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            full_name TEXT,
            email TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'user',
            company_name TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            address TEXT DEFAULT '',
            wallet_balance REAL DEFAULT 100000,
            avatar_url TEXT DEFAULT '',
            is_mall INTEGER DEFAULT 0,
            gender TEXT DEFAULT 'other',
            dob TEXT DEFAULT '',
            spin_tickets INTEGER DEFAULT 3,
            browse_seconds INTEGER DEFAULT 0,
            streak_count INTEGER DEFAULT 0,
            last_checkin TEXT DEFAULT '',
            shop_tier TEXT DEFAULT 'normal',
            shop_theme_color TEXT DEFAULT 'rgb(118, 185, 0)',
            shop_slogan TEXT DEFAULT '',
            verified_tick INTEGER DEFAULT 0,
            is_verified INTEGER DEFAULT 0,
            identity_code TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_addresses (
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
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id INTEGER DEFAULT 1,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'gpu',
            brand TEXT DEFAULT 'NVIDIA',
            price REAL NOT NULL,
            old_price REAL DEFAULT 0,
            discount_badge TEXT DEFAULT '',
            stock INTEGER DEFAULT 50,
            sold_count INTEGER DEFAULT 0,
            rating REAL DEFAULT 5.0,
            image_url TEXT DEFAULT '',
            specs_json TEXT DEFAULT '{}',
            description TEXT DEFAULT '',
            is_flash_sale INTEGER DEFAULT 0,
            unit TEXT DEFAULT 'Chiếc',
            target_gender TEXT DEFAULT 'all',
            sponsor_tag TEXT DEFAULT '',
            warranty_policy TEXT DEFAULT 'Bảo hành 12 tháng tại Shop',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (seller_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS user_favorites (
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
        );

        CREATE TABLE IF NOT EXISTS user_notifications (
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
        );

        CREATE TABLE IF NOT EXISTS user_cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, product_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS product_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            rating INTEGER DEFAULT 5,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            discount_value REAL NOT NULL,
            min_order_value REAL DEFAULT 0,
            total_limit INTEGER DEFAULT 1000,
            used_count INTEGER DEFAULT 0,
            expires_at TEXT DEFAULT '31/12/2026'
        );

        CREATE TABLE IF NOT EXISTS user_vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            voucher_code TEXT NOT NULL,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, voucher_code),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (voucher_code) REFERENCES vouchers(code)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            buyer_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            shipping_address TEXT NOT NULL,
            payment_method TEXT DEFAULT 'cod',
            subtotal_amount REAL DEFAULT 0,
            voucher_code TEXT DEFAULT '',
            voucher_discount REAL DEFAULT 0,
            xu_used REAL DEFAULT 0,
            total_amount REAL NOT NULL,
            transfer_confirmed INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            escrow_status TEXT DEFAULT 'holding',
            tracking_code TEXT DEFAULT '',
            carrier_name TEXT DEFAULT 'Giao Hàng Nhanh (GHN)',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (buyer_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            seller_id INTEGER DEFAULT 1,
            quantity INTEGER DEFAULT 1,
            unit_price REAL NOT NULL,
            product_name_snapshot TEXT DEFAULT '',
            warranty_snapshot TEXT DEFAULT 'Bảo hành tại Shop',
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (seller_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS farm_plots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plot_number INTEGER NOT NULL,
            crop_id TEXT,
            planted_at REAL,
            ready_at REAL,
            watered_at REAL,
            UNIQUE(user_id, plot_number),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS farm_seed_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            crop_id TEXT NOT NULL,
            quantity INTEGER DEFAULT 0,
            UNIQUE(user_id, crop_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS platform_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            date_label TEXT DEFAULT '',
            start_date TEXT DEFAULT '',
            end_date TEXT DEFAULT '',
            budget_xu INTEGER DEFAULT 10000000000,
            distributed_xu INTEGER DEFAULT 0,
            vouchers_issued INTEGER DEFAULT 0,
            bonus_multiplier REAL DEFAULT 1.0,
            voucher_code TEXT DEFAULT '',
            voucher_discount REAL DEFAULT 30000,
            min_order_value REAL DEFAULT 100000,
            theme_color TEXT DEFAULT 'rgb(118, 185, 0)',
            banner_slogan TEXT DEFAULT '',
            is_active INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_missions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            mission_code TEXT NOT NULL,
            mission_date TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            claimed INTEGER DEFAULT 0,
            UNIQUE(user_id, mission_code, mission_date),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS user_behavior_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action_type TEXT,
            category_tag TEXT,
            item_ref TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS disputes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            buyer_id INTEGER DEFAULT 1,
            seller_id INTEGER DEFAULT 1,
            accused_party TEXT DEFAULT 'seller',
            workflow_code TEXT DEFAULT 'SOP_03_SAI_MAU',
            reason TEXT NOT NULL,
            description TEXT DEFAULT '',
            refund_amount REAL DEFAULT 0,
            buyer_evidence TEXT DEFAULT '',
            seller_response TEXT DEFAULT '',
            shipper_log TEXT DEFAULT '',
            damage_rate INTEGER DEFAULT 0,
            shipper_delay_hours INTEGER DEFAULT 0,
            seller_Defect_history INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            ai_score INTEGER,
            ai_level TEXT,
            ai_rationale TEXT,
            ai_action_plan TEXT,
            ai_violated_rules TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (buyer_id) REFERENCES users(id),
            FOREIGN KEY (seller_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS dispute_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dispute_id INTEGER NOT NULL,
            sender_role TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dispute_id) REFERENCES disputes(id)
        );

        CREATE TABLE IF NOT EXISTS dispute_workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            scenario_group TEXT NOT NULL,
            trigger_condition TEXT NOT NULL,
            escrow_rule TEXT NOT NULL,
            resolution_steps TEXT NOT NULL,
            legal_ref TEXT NOT NULL,
            sla_hours INTEGER DEFAULT 24
        );

        CREATE TABLE IF NOT EXISTS legal_clauses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_group TEXT DEFAULT 'terms',
            chapter TEXT NOT NULL,
            article_code TEXT NOT NULL,
            title TEXT NOT NULL,
            audience TEXT DEFAULT 'all',
            content TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            updated_at TEXT,
            effective_date TEXT
        );

        CREATE TABLE IF NOT EXISTS legal_clause_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clause_id INTEGER NOT NULL,
            version INTEGER NOT NULL,
            old_title TEXT,
            old_content TEXT,
            modified_by TEXT,
            modified_at TEXT,
            effective_date TEXT,
            change_note TEXT,
            FOREIGN KEY (clause_id) REFERENCES legal_clauses(id)
        );

        CREATE TABLE IF NOT EXISTS ai_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            key_main TEXT DEFAULT '',
            key_backup1 TEXT DEFAULT '',
            key_backup2 TEXT DEFAULT '',
            model_name TEXT DEFAULT 'llama-3.3-70b-versatile',
            system_prompt TEXT DEFAULT '',
            kill_switch INTEGER DEFAULT 0,
            cart_reset_version INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ai_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_name TEXT DEFAULT 'Khách',
            context_type TEXT DEFAULT 'chat',
            prompt_text TEXT DEFAULT '',
            response_text TEXT DEFAULT '',
            oversight_status TEXT DEFAULT 'confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS store_chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            buyer_id INTEGER NOT NULL,
            buyer_name TEXT NOT NULL,
            seller_id INTEGER NOT NULL,
            chat_mode TEXT DEFAULT 'ai',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (buyer_id) REFERENCES users(id),
            FOREIGN KEY (seller_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS store_chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            sender_role TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            message TEXT NOT NULL,
            is_error INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES store_chat_sessions(id)
        );
        """
    )
    ensure_columns(conn)
    seed_initial_data(conn)
    conn.close()


def query_db(query, args=(), one=False):
    conn = get_db()
    cur = conn.execute(query, args)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return (rows[0] if rows else None) if one else rows


def execute_db(query, args=()):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(query, args)
    conn.commit()
    last_id = cur.lastrowid
    conn.close()
    return last_id
