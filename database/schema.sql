CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    company_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    wallet_balance REAL DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    last_checkin TEXT,
    is_locked INTEGER DEFAULT 0,
    is_mall INTEGER DEFAULT 0,
    terms_version_accepted TEXT DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at REAL NOT NULL,
    used INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS farm_seed_inventory (
    user_id INTEGER NOT NULL,
    crop_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, crop_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS farm_plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plot_number INTEGER NOT NULL,
    crop_id TEXT,
    planted_at REAL,
    ready_at REAL,
    watered_at REAL,
    UNIQUE (user_id, plot_number),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    brand TEXT DEFAULT 'NVIDIA',
    category TEXT DEFAULT 'gpu',
    price REAL NOT NULL,
    old_price REAL DEFAULT 0,
    discount_badge TEXT DEFAULT '',
    stock INTEGER DEFAULT 100,
    sold_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    image_url TEXT DEFAULT '',
    secondary_image_url TEXT DEFAULT '',
    specs_json TEXT DEFAULT '{}',
    description TEXT DEFAULT '',
    is_flash_sale INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    voucher_code TEXT DEFAULT '',
    discount_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    escrow_status TEXT DEFAULT 'holding',
    status TEXT DEFAULT 'pending',
    tracking_code TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    serial_number TEXT DEFAULT '',
    warranty_months INTEGER DEFAULT 36,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'all',
    discount_value REAL NOT NULL,
    min_order_value REAL DEFAULT 0,
    total_limit INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    expires_at TEXT DEFAULT '2026-12-31'
);

CREATE TABLE IF NOT EXISTS user_vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    voucher_code TEXT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, voucher_code)
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
    updated_at TEXT NOT NULL,
    effective_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_clause_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clause_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    old_title TEXT NOT NULL,
    old_content TEXT NOT NULL,
    modified_by TEXT DEFAULT 'William Admin',
    modified_at TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    change_note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS disputes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    accused_party TEXT DEFAULT 'seller',
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    refund_amount REAL DEFAULT 0,
    buyer_evidence TEXT DEFAULT '',
    seller_response TEXT DEFAULT '',
    shipper_log TEXT DEFAULT '',
    damage_rate INTEGER DEFAULT 0,
    shipper_delay_hours INTEGER DEFAULT 0,
    seller_Defect_history INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    ai_score INTEGER,
    ai_level TEXT DEFAULT '',
    ai_rationale TEXT DEFAULT '',
    ai_action_plan TEXT DEFAULT '',
    ai_violated_rules TEXT DEFAULT '[]',
    admin_verdict TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispute_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispute_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    key_main TEXT DEFAULT '',
    key_backup1 TEXT DEFAULT '',
    key_backup2 TEXT DEFAULT '',
    model_name TEXT DEFAULT 'llama-3.3-70b-versatile',
    system_prompt TEXT DEFAULT 'Bạn là Trợ lý AI chính thức của sàn thương mại điện tử Nvidia Store. Hãy tư vấn ngắn gọn, trung thực, lịch sự.',
    kill_switch INTEGER DEFAULT 0,
    cart_reset_version INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT DEFAULT 'Khách',
    context_type TEXT DEFAULT 'chat',
    prompt_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    oversight_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER NOT NULL,
    buyer_name TEXT NOT NULL,
    seller_id INTEGER NOT NULL,
    seller_store_name TEXT NOT NULL,
    chat_mode TEXT DEFAULT 'ai',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(buyer_id, seller_id)
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