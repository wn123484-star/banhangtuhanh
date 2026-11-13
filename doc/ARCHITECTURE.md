# KIẾN TRÚC HỆ THỐNG, CƠ SỞ DỮ LIỆU & API CONTRACT — NVIDIA STORE V9.0

Tài liệu này định nghĩa toàn bộ cấu trúc tệp, phân tích nguyên nhân gốc rễ & cơ chế khắc phục lỗi Icon, thiết kế cơ sở dữ liệu SQLite (cho Sàn Đấu Giá Kép, Theo Dõi Giá Chứng Khoán, Đấu Thầu Ngược RFQ, Thanh Toán QR 2 Bước & Vận Đơn NVX) và hợp đồng giao tiếp API trong phiên bản **Nvidia Store V9.0**.

---

## 1. CẤU TRÚC THƯ MỤC & KIẾN TRÚC PHÂN TẦNG (SYSTEM TOPOLOGY)

```text
banhang-main/
├── AI_RULES.md                      # Hiến pháp kỹ thuật & 8 quy tắc bắt buộc cho AI
├── ARCHITECTURE.md                  # Kiến trúc hệ thống, Thiết kế SQLite Schema & API Contract
├── TODO_ROADMAP.md                  # Lộ trình thực thi 6 giai đoạn & Checklist kiểm thử
├── app.py                           # Cổng khởi chạy chính (Multi-threaded Flask, Dynamic SVG/Icon Sets, OTP, Auctions, Price Tracker, RFQ, QA Bot)
├── core/
│   ├── server.py                    # Khởi tạo Flask App & Đăng ký Multi-Blueprint
│   ├── main.js                      # Đồng bộ Header/Footer, 14 Slot Icon, Chuỗi Điểm Danh 7 Ngày, Mèo Lỏng AI & Chat Đa Cửa Sổ
│   ├── cat_widget.js                # Động cơ vật lý 2D & AI cho Linh vật Mèo Lỏng (5 giống mèo)
│   ├── global.css                   # Hệ thống giao diện 6 chủ đề mùa lễ hội & Adaptive Dark/Light Mode
│   └── error.html                   # Trang điều hướng ngoại lệ HTTP 404/403/500 toàn màn hình
├── assets/
│   ├── icons/
│   │   ├── icon_sets_manifest.json  # Manifest quản lý 4 Bộ Icon, timestamp updated_at & 14 vị trí (Slots)
│   │   ├── default/                 # Bộ Icon Mặc định của hệ thống
│   │   ├── set_1/                   # Bộ Icon Số 1 (Tùy chỉnh)
│   │   ├── set_2/                   # Bộ Icon Số 2 (Tùy chỉnh)
│   │   └── set_3/                   # Bộ Icon Số 3 (Tùy chỉnh)
│   └── uploads/products/            # Kho lưu trữ ảnh thực tế sản phẩm do Seller/Admin tải lên
├── database/
│   ├── db_manager.py                # Quản lý kết nối SQLite (WAL mode)
│   ├── schema.sql                   # Schema nền tảng
│   └── nvidia_store.db              # Cơ sở dữ liệu SQLite trung tâm
└── services/
    ├── home/                        # Trang chủ (index.html, home.js, api.py)
    ├── product/                     # Chi tiết SP & Hộ chiếu Bảo hành Chuỗi băm Blockchain SHA-256
    ├── cart_checkout/               # Giỏ hàng, Cổng thanh toán QR 2 bước & Ngân hàng số NVIDIA Pay (Chuyển khoản hộ)
    ├── order_tracking/              # Vận đơn NVX Express 6 bước, Bản đồ Radar Canvas & Hoàn đơn/Hoàn tiền nguyên tử
    ├── admin_dispute/               # Trung tâm Admin SOC 25 Lớp, Studio 4 Bộ Icon, 4 Biểu đồ Canvas & Tòa án Trọng tài AI
    ├── seller/                      # Kênh người bán & Studio ảnh sản phẩm (Kéo-thả, Dán Clipboard Ctrl+V)
    ├── vouchers_deals/              # Kho Siêu Voucher toàn sàn
    ├── minigame/                    # Vòng quay may mắn & Nông trại 7 giống cây Voucher
    ├── pc_builder/                  # Trạm Build PC AI
    ├── compare/                     # So sánh thông số & Wishlist
    ├── settings/                    # Cài đặt tài khoản, Xác minh OTP nhận 50.000 Xu & Trung tâm khiếu nại
    ├── legal/                       # Điều khoản pháp lý & Quy chuẩn SOP-01..SOP-04
    └── market_arena/ (Mới)          # Trung tâm hợp nhất 3 Siêu Tính Năng:
        ├── market-arena.html        # 1. Sàn Biểu Đồ Giá Công Nghệ VN (Kiểu Chứng Khoán) & Báo Động Giá
        └── market-arena.js          # 2. Sàn Đấu Giá Kép Thời Gian Thực (Ký quỹ Anti-Sniping 30s & Đấu giá ngược)
                                     # 3. Sàn Đấu Thầu Ngược RFQ (Khách đăng nhu cầu — 24 Shop chào giá cạnh tranh)
```

---

## 2. CHẨN ĐOÁN KỸ THUẬT & CƠ CHẾ XỬ LÝ TRIỆT ĐỂ BUG ICON (CHẶNG 0 -> GIAI ĐOẠN 1)

### 2.1. Nguyên nhân chính xác vì sao không lưu được Icon ở vị trí 4 (`nav_bank`), 5 (`nav_ai_cat`), 8 (`cat_mainboard`), 11 (`cat_headphones`)
1. **Lỗi mất trạng thái Preview & Input ở Frontend (`services/admin_dispute/admin-center.js`):**
   - Khi chọn ảnh qua `onPreviewSlotFileSelect(slotKey, fileInput)` (dòng 1379), hệ thống gán `urlInp.value = '[Đã chọn file: ...]'` và lưu Base64 vào biến tạm `__pendingSlotPreviews[slotKey]`. Nếu người dùng chỉnh sửa ô input (kích hoạt `onPreviewSlotUrlInput` xóa mất `__pendingSlotPreviews[slotKey]`) hoặc vừa bấm lưu một vị trí trước đó khiến `loadAdminMultiIconSetsStudio()` (dòng 1434) **vẽ lại toàn bộ `slotsGrid.innerHTML` của cả 14 vị trí**, dữ liệu đã chọn cho các vị trí 4, 5, 8, 11 bị xóa sạch. Khi bấm `saveSlotIconToCurrentSet()`, điều kiện `if (!pending && (!rawUrl || rawUrl.startsWith('[Đã chọn')))` chặn lại và không gửi lệnh lưu.
   - Khi người dùng dán Data URI (`data:image/...`) vào ô URL hoặc ảnh đã hiển thị trên `#slotPreviewImg_<slotKey>`, hàm `saveSlotIconToCurrentSet` chưa có cơ chế tự trích xuất dữ liệu ảnh từ `#slotPreviewImg_<slotKey>`.
2. **Lỗi tải URL từ xa & giải mã Base64 ở Backend (`app.py` — `manage_multi_icon_sets_api`, dòng 879–937):**
   - Nhánh tải `remote_url` dùng `urllib.request.urlopen(req, timeout=10)` mà **không có `ssl._create_unverified_context()`** và thiếu các HTTP Header chuẩn (`Accept`, `Referer`), dẫn tới bị các máy chủ ảnh chặn (`HTTP 403 Forbidden` / lỗi SSL) và trả về `HTTP 400`.
   - Nếu `remote_url` là chuỗi `data:image/...` hoặc URL có chứa query string (`?size=64`, `?v=1`), Backend tách sai phần mở rộng hoặc coi nhầm là tệp nội bộ và báo lỗi `404`. Chuỗi `image_base64` chưa được tự động bù padding `=` (`len(raw_b64) % 4`).
3. **Lỗi thiếu bộ chọn DOM & bị ghi đè riêng tại 4 vị trí 4 (`nav_bank`), 5 (`nav_ai_cat`), 8 (`cat_mainboard`), 11 (`cat_headphones`) trong `core/main.js`:**
   - **Vị trí 4 (`nav_bank`):** Dòng 3061–3062 của `core/main.js` chạy `if (bankBtn) bankBtn.innerHTML = '🏦 Bank';` trong `initNvidiaPlatformBootstrap()`, xóa đè mất thẻ `<img class="nvx-dynamic-slot-icon">` vừa gắn.
   - **Vị trí 5 (`nav_ai_cat`):** Nút Mèo AI góc dưới phải (`#nvUnifiedHubToggleBtn`, `#msgHubTabBtn_cat` nằm trong `#nvMessengerLauncherBar`) và nút Mèo AI trên trang chủ nằm ngoài phạm vi bộ chọn `header a, header button, nav a, nav button, .nv-cat-fab` (dòng 400 của `core/main.js`), nên **không bao giờ được gắn icon vị trí 5**.
   - **Vị trí 8 (`cat_mainboard`) & Vị trí 11 (`cat_headphones`):** Nhiều sản phẩm nhóm `mainboard` và `headphones` bị hàm `inferSmartCategoryKey` (dòng 121 `core/main.js`) và `serve_product_representative_svg_icon` (dòng 1076–1148 `app.py`) phân nhánh sang `psu`, `monitor`, `speaker` trước khi kiểm tra `cat_mainboard` / `cat_headphones`.

### 2.2. Nguyên nhân chính xác vì sao khi thay đổi Icon trong quản trị nhưng tải lại trang người dùng (F5) chưa tải về Icon mới
1. **Lệch pha giữa Bộ đang sửa (`set_1`) và Bộ đang kích hoạt (`default`):**
   - Trong `admin-center.js` (dòng 973, 1196), Admin mặc định mở chỉnh sửa `set_1` (`__currentEditingIconSetId = 'set_1'`), trong khi `icon_sets_manifest.json` mặc định để `"active_set": "default"`. Khi Admin bấm Lưu từng slot (`action == "save_slot"`), Backend chỉ lưu vào `set_1` mà chưa tự động kích hoạt `active_set = target_set` (nếu `active_set` vẫn đang là `default`). Khi trang người dùng F5, `syncActiveIconSetAcrossWebsite()` đọc `active_set = "default"` (`has_custom = false`) nên bỏ qua toàn bộ icon mới.
2. **Cache trình duyệt & `localStorage` giữ cứng URL cũ:**
   - Lời gọi `fetch('/api/settings/icon-sets')` trong `core/main.js` (dòng 374) không có tham số chống cache `?_t=` và `cache: 'no-store'`; response của `/api/settings/icon-sets` chưa đặt header `Cache-Control: no-store`.
   - `icon_sets_manifest.json` chưa lưu mốc thời gian `"updated_at"` (millisecond), và các thẻ `<img src="/api/settings/product-icon-svg?...">` của 120 sản phẩm trên `home.js` không có tham số `?v=<updated_at>`, khiến trình duyệt hiển thị lại ảnh SVG cũ từ bộ nhớ đệm khi F5.
3. **Race Condition khi khởi tạo DOM:**
   - `syncActiveIconSetAcrossWebsite()` chỉ chạy 1 lần ở `120ms`, trước khi `home.js` (`loadProducts`) và `cat_widget.js` render xong các nút/thẻ trên giao diện.

---

## 3. CƠ CHẾ VẬN HÀNH SÀN ĐẤU GIÁ KÉP, THEO DÕI GIÁ CHỨNG KHOÁN & ĐẤU THẦU NGƯỢC RFQ

### 3.1. Sàn Theo Dõi Giá Thị Trường Công Nghệ Việt Nam (Stock-Style Price Tracker — VN-TECH INDEX)
Tính năng này tạo **thói quen truy cập hằng ngày tự nhiên** cho cả **Khách vãng lai**, **Người mua hàng** và **Chủ gian hàng (Seller)**:

1. **Công thức Chỉ số Giá & Lịch sử Biến động Nến (OHLC Candlestick):**
   - Mỗi sản phẩm công nghệ trọng tâm được theo dõi lịch sử giá theo từng phiên trong bảng `product_price_history` gồm 4 thông số chuẩn chứng khoán:
     - $P_{\text{open}}$: Giá mở cửa phiên.
     - $P_{\text{high}}$: Giá cao nhất trong phiên (hoặc giá niêm yết gốc).
     - $P_{\text{low}}$: Giá thấp nhất trong phiên (khi áp dụng Flash Sale / Đấu giá).
     - $P_{\text{close}}$: Giá khớp hiện hành trên Nivida Store.
     - $P_{\text{vn\_avg}}$: Giá tham chiếu trung bình tại thị trường Việt Nam (tổng hợp tham chiếu mặt bằng chung Hà Nội / TP.HCM).
   - Đường trung bình động ($MA_7$ và $MA_{30}$) cùng độ lệch giá thị trường giúp tự động tính toán **Tín hiệu Khuyến nghị AI**:
     $$\Delta_{\text{market}} = \frac{P_{\text{vn\_avg}} - P_{\text{close}}}{P_{\text{vn\_avg}}} \times 100\%$$
     - Nếu $\Delta_{\text{market}} \ge 12\%$ hoặc $P_{\text{close}}$ chạm vùng đáy 30 ngày $\rightarrow$ Tín hiệu: **`🟢 VÙNG ĐÁY LỊCH SỬ — NÊN MUA NGAY`**.
     - Nếu $0\% \le \Delta_{\text{market}} < 12\%$ $\rightarrow$ Tín hiệu: **`🟡 GIÁ HỢP LÝ — THEO DÕI THÊM`**.
     - Nếu $\Delta_{\text{market}} < 0\%$ $\rightarrow$ Tín hiệu: **`🔴 ĐANG Ở ĐỈNH NGẮN HẠN — NÊN ĐẶT BÁO ĐỘNG CHỜ GIẢM`**.
2. **Cơ chế Gắn Theo Dõi Giới Hạn (Quota Watchlist) & Báo Động Khi Giảm Giá:**
   - **Giới hạn Slot Theo Dõi (Quota):** Mặc định tối đa **$N_{\max} = 5$ slot theo dõi sản phẩm** cùng lúc; nếu tài khoản đã xác minh OTP hoặc có chuỗi điểm danh $\ge 3$ ngày được nâng hạn mức lên **$8$ slot**.
   - **Kích hoạt Báo động Tự động (Event-Driven Alert):** Khi giá thực tế $P_{\text{current}} \le P_{\text{target}}$ (do Gian hàng giảm giá, Sự kiện bật, hoặc biến động thị trường `Market Tick`), hệ thống chuyển `is_triggered = 1`, bật thông báo Chuông (`🔔`) và hiển thị nút **`⚡ Mua Ngay Ở Giá Đáy`**.

### 3.2. Sàn Đấu Giá Kép Thời Gian Thực (Dual Real-Time Auction Arena)
Hệ thống vận hành song song 2 mô hình đấu giá chuyên biệt trên cùng một sàn:

1. **Mô hình 1: Đấu Giá Trả Giá Lên Có Ký Quỹ & Chống Phút Chót (`standard` — English Escrow Auction + Anti-Sniping 30s):**
   - **Điều kiện đặt giá:** Giá đặt mới $B_{\text{new}}$ phải thỏa mãn:
     $$B_{\text{new}} \ge P_{\text{current}} + S_{\text{min}}$$
     trong đó $S_{\text{min}}$ là bước giá tối thiểu (`min_step_price`, mặc định `100.000 ₫` – `500.000 ₫`).
   - **Cơ chế Ký quỹ Bảo lãnh (Escrow Deposit Lock 10%) & Hoàn cọc Tức thì:**
     - Để chống trả giá ảo (bùng kèo), người tham gia khi đặt giá $B_{\text{new}}$ sẽ được hệ thống tạm khóa khoản tiền cọc ký quỹ:
       $$D_{\text{lock}} = \text{round}\left(B_{\text{new}} \times \frac{\text{escrow\_deposit\_pct}}{100}\right)$$
       từ số dư Ví NVIDIA Pay (`users.coins` / `user_bank_wallets.balance`).
     - Ngay trong cùng một giao dịch SQLite nguyên tử (`ATOMIC TRANSACTION`), người giữ giá cao nhất liền trước đó (`previous_highest_bidder`) được **hoàn trả 100% tiền cọc ngay lập tức** vào lại Ví NVIDIA Pay (`is_refunded = 1` trong bảng `auction_bids`).
   - **Luật Chống Cướp Phút Chót (Anti-Sniping +30s):**
     - Nếu thời gian còn lại của phiên đấu giá tại thời điểm đặt lệnh thỏa mãn $0 < (T_{\text{end}} - T_{\text{now}}) \le 10\text{ giây}$, hệ thống tự động cộng thêm **+30 giây** vào `end_time_epoch` và tăng bộ đếm `anti_snipe_extensions_count`, đảm bảo cuộc đấu giá công bằng tuyệt đối.
2. **Mô hình 2: Đấu Giá Ngược Giảm Giá Từng Giây (`dutch` — Dutch Flash Auction):**
   - Giá khởi điểm từ mức trần $P_{\text{start}}$ và tự động giảm đi một lượng $D_{\text{tick}}$ (`drop_per_tick`) sau mỗi chu kỳ $\Delta t = 2\text{ giây}$ cho tới khi chạm giá sàn bảo vệ $P_{\text{floor}}$ (`reserve_floor_price`):
     $$P(t) = \max\left(P_{\text{floor}},\; P_{\text{start}} - \left\lfloor \frac{t - t_{\text{start}}}{2} \right\rfloor \times D_{\text{tick}}\right)$$
   - Người dùng đầu tiên bấm **`⚡ Chốt Giá Mua Ngay`** sẽ thắng phiên đấu giá ngay lập tức ở mức giá $P(t)$ tại giây đó, khóa phiên (`status = 'ended'`) và tự động sinh mã hóa đơn thanh toán QR (`pay_token`) để tự thanh toán hoặc nhờ bạn bè chuyển khoản hộ.

### 3.3. Sàn Đấu Thầu Ngược RFQ ("Khách Đăng Nhu Cầu — 24 Gian Hàng Chào Giá Cạnh Tranh")
- Khách mua đăng yêu cầu tìm mua linh kiện / dàn máy (`rfq_requests`) kèm ngân sách trần `budget_max` và yêu cầu chi tiết.
- Các Gian hàng Flagship Mall (hoặc hệ thống tự động điều phối báo giá từ 24 Gian hàng chính hãng) gửi báo giá cạnh tranh (`rfq_quotes`) với mức giá `offered_price <= budget_max`, cam kết bảo hành (`36 tháng`) và quà tặng kèm.
- Khi Khách mua bấm **`✅ Chấp Nhận Báo Giá`**, hệ thống tự động khởi tạo đơn hàng và phiên thanh toán QR 2 bước ở đúng mức giá ưu đãi vừa trúng thầu.

### 3.4. Hộ Chiếu Bảo Hành Chuỗi Băm SHA-256 (Blockchain Device Warranty Passport)
- **Hộ Chiếu Bảo Hành Blockchain (`SHA-256 Device Warranty Passport`):** Mỗi sản phẩm chính hãng hiển thị chuỗi 3 Block liên kết bằng mã băm mật mã `SHA-256` (*Block #1: Xuất xưởng NSX* $\rightarrow$ *Block #2: Kiểm định QC Kho NVX* $\rightarrow$ *Block #3: Bảo lãnh Escrow SOP-01*).

---

## 4. THIẾT KẾ DATABASE SCHEMA MỞ RỘNG (SQLITE)

### 4.1. Bảng Sàn Đấu Giá Kép (`auctions` & `auction_bids`)
```sql
CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_code TEXT UNIQUE,                      -- Mã phiên đấu giá (VD: 'AUC-RTX4090-01')
    product_id INTEGER,                            -- Liên kết tới products.id
    seller_id INTEGER DEFAULT 2,                   -- Gian hàng chính hãng tổ chức đấu giá
    store_name TEXT DEFAULT 'ASUS ROG Official Flagship Mall',
    title TEXT NOT NULL,                           -- Tên vật phẩm đấu giá
    brand TEXT DEFAULT 'NVIDIA',
    category TEXT DEFAULT 'gpu',
    image_url TEXT,
    auction_type TEXT DEFAULT 'standard',          -- 'standard' (Đấu giá lên + Anti-sniping 30s) | 'dutch' (Đấu giá ngược giảm từng giây)
    start_price REAL NOT NULL,                     -- Giá khởi điểm (Standard) hoặc Giá trần ban đầu (Dutch)
    current_price REAL NOT NULL,                   -- Giá cao nhất hiện tại (Standard) hoặc Giá giảm hiện hành (Dutch)
    buy_now_price REAL DEFAULT 0,                  -- Giá mua đứt ngay lập tức (tùy chọn cho Standard)
    min_step_price REAL DEFAULT 100000,            -- Bước giá tối thiểu (VD: 100.000đ - 500.000đ)
    reserve_floor_price REAL DEFAULT 500000,       -- Giá sàn bảo vệ thấp nhất (cho Đấu giá ngược Dutch)
    drop_per_tick REAL DEFAULT 20000,              -- Mức giảm giá mỗi nhịp 2 giây (cho Đấu giá ngược Dutch)
    tick_interval_sec INTEGER DEFAULT 2,           -- Chu kỳ giảm giá (giây)
    escrow_deposit_pct INTEGER DEFAULT 10,         -- Tỷ lệ ký quỹ tạm khóa (mặc định 10% giá đặt)
    highest_bidder_id INTEGER DEFAULT 0,           -- ID người đang dẫn đầu hoặc người thắng cuộc
    highest_bidder_name TEXT DEFAULT 'Chưa có',
    bids_count INTEGER DEFAULT 0,                  -- Tổng số lượt trả giá hợp lệ
    anti_snipe_window_sec INTEGER DEFAULT 10,      -- Cửa sổ phát hiện đặt giá phút chót (10 giây cuối)
    anti_snipe_extend_sec INTEGER DEFAULT 30,      -- Thời gian tự động cộng thêm (+30 giây)
    anti_snipe_extensions_count INTEGER DEFAULT 0, -- Số lần đã kích hoạt gia hạn Anti-Sniping
    start_time_epoch INTEGER,                      -- Thời điểm bắt đầu phiên (Unix timestamp)
    end_time_epoch INTEGER,                        -- Thời điểm kết thúc phiên (Unix timestamp)
    winner_order_id INTEGER DEFAULT 0,             -- Mã đơn hàng tự động tạo khi kết thúc/chốt giá
    winner_pay_token TEXT DEFAULT '',              -- Token thanh toán QR 2 bước dành cho người thắng
    warranty_months INTEGER DEFAULT 36,            -- Cam kết bảo hành chính hãng SOP-01
    status TEXT DEFAULT 'active',                  -- 'active' | 'ended' | 'settled'
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS auction_bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,                   -- Liên kết tới auctions.id
    user_id INTEGER NOT NULL,                      -- ID người đặt giá
    user_name TEXT NOT NULL,                       -- Tên hiển thị của người đặt giá
    bid_type TEXT DEFAULT 'standard_bid',          -- 'standard_bid' | 'dutch_buyout' | 'auto_proxy_bid'
    bid_amount REAL NOT NULL,                      -- Mức giá đặt / chốt
    deposit_locked REAL DEFAULT 0,                 -- Số tiền ký quỹ 10% đã tạm khóa trong Escrow
    is_winning INTEGER DEFAULT 1,                  -- 1 = Đang dẫn đầu / Thắng, 0 = Đã bị vượt giá
    is_refunded INTEGER DEFAULT 0,                 -- 1 = Đã hoàn trả tiền cọc về Ví NVIDIA Pay khi bị vượt giá
    anti_snipe_triggered INTEGER DEFAULT 0,        -- 1 = Lệnh này đã kích hoạt cộng thêm +30s
    tx_ref TEXT DEFAULT '',                        -- Mã tham chiếu giao dịch ký quỹ/hoàn cọc
    created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_auctions_status_type ON auctions(status, auction_type);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id, bid_amount DESC);
```

### 4.2. Bảng Nâng Cấp Đơn Hàng & Chuyển Khoản Hộ (`orders` & `qr_payment_sessions`)
```sql
CREATE TABLE IF NOT EXISTS qr_payment_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pay_token TEXT UNIQUE,
    order_id INTEGER,
    buyer_id INTEGER,
    buyer_name TEXT,
    amount REAL,
    items_summary_json TEXT,
    status TEXT DEFAULT 'AWAITING_PAYMENT', -- 'AWAITING_PAYMENT' | 'APPROVED' | 'REJECTED'
    payer_id INTEGER DEFAULT 0,
    payer_name TEXT DEFAULT '',
    payer_message TEXT DEFAULT '',
    is_paid_on_behalf INTEGER DEFAULT 0,
    created_at TEXT,
    confirmed_at TEXT
);
```
- Bảng `orders` được bổ sung các cột: `logistics_stage` (`AWAITING_PAYMENT`, `ESCROW_LOCKED`, `SELLER_PACKING`, `NVX_IN_TRANSIT`, `DELIVERED_INSPECTING`, `COMPLETED`, `RETURN_PROCESSING`, `REFUNDED`), `payer_name`, `payer_message`, `return_reason`, `return_tracking_code`, `refunded_amount`, `pay_token`.

### 4.3. Bảng Lịch Sử Giá Thị Trường VN & Cảnh Báo Theo Dõi Giá (`product_price_history` & `user_price_watches`)
```sql
CREATE TABLE IF NOT EXISTS product_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    date_label TEXT,
    open_price REAL,
    high_price REAL,
    low_price REAL,
    close_price REAL,
    vn_market_avg_price REAL,
    volume INTEGER DEFAULT 15,
    recorded_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_price_watches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    initial_price REAL,
    target_price REAL,
    current_price REAL,
    is_triggered INTEGER DEFAULT 0,
    notify_note TEXT DEFAULT '',
    created_at TEXT
);
```

### 4.4. Bảng Sàn Đấu Thầu Ngược RFQ (`rfq_requests` & `rfq_quotes`)
```sql
CREATE TABLE IF NOT EXISTS rfq_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_id INTEGER,
    buyer_name TEXT,
    title TEXT,
    category TEXT,
    budget_max REAL,
    requirements_detail TEXT,
    status TEXT DEFAULT 'open', -- 'open' | 'awarded'
    accepted_quote_id INTEGER DEFAULT 0,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS rfq_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfq_id INTEGER,
    seller_id INTEGER,
    store_name TEXT,
    product_name TEXT,
    offered_price REAL,
    warranty_months INTEGER DEFAULT 36,
    gift_bonus TEXT DEFAULT '',
    status TEXT DEFAULT 'pending', -- 'pending' | 'accepted'
    created_at TEXT
);
```

---

## 5. HỢP ĐỒNG GIAO TIẾP API (API CONTRACTS)

1. **Hệ thống Icon 14 Vị trí & Studio Ảnh Sản Phẩm (`app.py`):**
   - `GET /api/settings/icon-sets?inspect_set=set_1&_t=<ts>`: Trả về trạng thái 4 bộ icon, `updated_at`, `active_slots`, `inspect_slots` kèm header `Cache-Control: no-store`.
   - `POST /api/settings/icon-sets` (`action`: `save_slot` | `switch_set` | `reset_slot` | `copy_set` | `reset_set`): Tự động giải mã Base64 / tải URL với SSL unverified fallback, lưu file vật lý vào `assets/icons/<set_id>/`, cập nhật `updated_at` và đồng bộ `active_set`.
   - `GET /api/settings/slot-icon/<slot_key>?set=<set_id>&v=<updated_at>`: Phục vụ trực tiếp tệp ảnh của từng vị trí hoặc SVG mặc định sắc nét.
2. **Hệ thống Thanh toán QR 2 bước & Chuyển khoản hộ (`app.py`):**
   - `POST /api/payment/qr-session/create`: Tạo phiên `pay_token` ở trạng thái `AWAITING_PAYMENT` (không tự động duyệt khi chưa bấm nút xác nhận).
   - `GET /api/payment/qr-session/<pay_token>`: Lấy thông tin hóa đơn chi tiết để hiển thị lên màn hình Xem giá & Xác nhận trên `bank.html`.
   - `POST /api/payment/qr-session/confirm`: Người mua hoặc Người chuyển hộ bấm xác nhận thanh toán $\rightarrow$ Khóa tiền vào `ESCROW_LOCKED`, lưu lời nhắn người chuyển hộ và báo cho `checkout.html` tự động chuyển sang `tracking.html`.
3. **Hệ thống Vận đơn NVX Express & Hoàn đơn Nguyên tử (`app.py`):**
   - `GET /api/tracking/order-lifecycle?order_id=<id>`: Trả về trạng thái 6 bước NVX Smart Logistics & dữ liệu tọa độ Bản đồ Radar.
   - `POST /api/tracking/advance-stage`: Chuyển trạng thái giao hàng (phục vụ vận hành & Demo).
   - `POST /api/tracking/confirm-delivery`: Khách xác nhận đồng kiểm hài lòng $\rightarrow$ Giải ngân Escrow cho Shop (`COMPLETED`).
   - `POST /api/tracking/request-return-refund`: Khách yêu cầu hoàn đơn $\rightarrow$ Cấp mã thu hồi `NVX-RET-xxxx` $\rightarrow$ Hoàn tiền 100% về Ví NVIDIA Pay của khách & cộng trả lại tồn kho (`REFUNDED`).
4. **Hệ thống Theo dõi Giá Thị trường VN, Đấu giá Kép & Đấu thầu Ngược RFQ (`app.py`):**
   - `GET /api/market-tracker/overview`: Lấy chỉ số `VN-TECH INDEX`, danh sách sản phẩm kèm lịch sử nến OHLC 30 phiên và danh sách Watchlist (tối đa 5–8 món) của người dùng.
   - `POST /api/market-tracker/watch`: Gắn hoặc gỡ theo dõi giá mục tiêu cho 1 vật phẩm (kiểm tra Quota 5–8 slot).
   - `POST /api/market-tracker/simulate-tick`: Giả lập biến động giá thị trường (tăng/giảm giá hoặc hạ giá chạm mốc kỳ vọng để kích hoạt chuông báo động ngay lập tức).
   - `GET /api/auctions/live`: Danh sách các phiên Đấu giá Ký quỹ (`standard`) và Đấu giá Ngược (`dutch`) kèm lịch sử đặt giá `auction_bids` và giá thời gian thực.
   - `POST /api/auctions/bid`: Đặt giá cho phiên `standard` (kiểm tra bước giá, tạm khóa cọc 10% Escrow, hoàn cọc tức thì cho người trước, tự động cộng +30s nếu đặt trong 10s cuối).
   - `POST /api/auctions/dutch-buy`: Chốt giá mua ngay cho phiên `dutch` ở mức giá giảm tại giây hiện tại và khởi tạo phiên thanh toán QR (`pay_token`).
   - `GET /api/rfq/list`, `POST /api/rfq/create`, `POST /api/rfq/submit-quote`, `POST /api/rfq/accept-quote`: Xử lý Đấu thầu ngược giữa Khách mua và 24 Gian hàng chính hãng.
