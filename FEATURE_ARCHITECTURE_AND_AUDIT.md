# BÁO CÁO KIỂM TOÁN KIẾN TRÚC, ĐỘ THẬT DỮ LIỆU SQLITE & BẢN ĐỒ 45 MÃ TÍNH NĂNG (`[FEAT-001..010]`)

> **Phiên bản:** `ver11` (Autonomous Deep Audit, 45 Sub-Feature Matrix & 100-Bug Hunt Campaign)  
> **Trạng thái kiểm toán:** **100% PRODUCTION_DB_LINKED (0 Mock / 0 Hardcoded State)**  
> **Cơ sở dữ liệu:** `database/nvidia_store.db` (SQLite WAL Mode, `PRAGMA integrity_check = OK`)  
> **Đội quân kiểm thử:** **QA Bot Squad V12.0 (10 Bots — 100% PASS, 0 Errors)**

---

## 1. BẢNG ĐỐI CHIẾU 10 PHÂN HỆ LỚN (`[FEAT-001]` ➔ `[FEAT-010]`)

| Mã Tính Năng | Tên Phân Hệ & Thiết Kế Đã Khóa (`[LOCKED-DESIGN]`) | Tệp Giao Diện / Logic (Frontend & Backend) | API Endpoint & Bảng SQLite Thực Tế | Trạng Thái Sau Kiểm Toán (`ver11`) |
| :--- | :--- | :--- | :--- | :--- |
| **`[FEAT-HDR-001]`** | **Header 3 Tầng Cố Định, Kệ 3 Cột Trong Suốt, Điểm Danh 7 Ngày & Spacer (`#nvxHeaderStickySpacer`)** | `core/global.css`, `core/main.js`, `services/home/home.js`, `app.py` | `GET /api/settings/icon-sets`, `GET/POST /api/settings/daily-checkin` • Bảng `system_settings`, `user_daily_checkins`, `users`, `user_vouchers` | **PRODUCTION_DB_LINKED (100% Thật)** — Cấm `filter`/`transform` trên `html, body`; khóa `position: fixed; z-index: 2147483000`; Kệ 3 cột Glassmorphism trong suốt; Điểm danh 7 ngày cộng thưởng thật (`+5K` ➔ `+50K Xu`) và ẩn nút Test đối với khách thường. |
| **`[FEAT-CAT-002]`** | **Linh Vật Mèo AI Canvas 2D (Ăn Cá, Uống Trà Sữa Chuẩn Miệng, 4 Nhóm Accordion & Cất/Gọi Mèo Thập Thò)** | `core/cat_widget.js`, `core/main.js`, `ai_engine/cat_assistant_engine.py`, `app.py` | `GET/POST /api/compare/wishlist`, `POST /api/settings/cat-assistant/command` • Bảng `system_settings` | **PRODUCTION_DB_LINKED (100% Thật)** — Khóa `(mouthX, mouthY)`, 4 nhóm Accordion, và bổ sung `tuckCatBehindChat()` / `summonCatBackOut()` (`TUCKED_BEHIND_CHAT`) — Mèo nấp sau thanh Chat thò tai vểnh và thập thò đuôi / nửa mặt / 2 chân măng cụt mỗi 6-9 giây. |
| **`[FEAT-AUTH-003]`** | **Bảo Mật RBAC 25 Trang, Thưởng OTP +20.000 Xu, Khóa Nút Gửi Lại & Chặn Guest Chuyển Khoản** | `core/main.js`, `services/settings/settings.html`, `services/settings/settings.js`, `services/mobile/mobile-app.html`, `services/mobile/mobile-app.js`, `app.py` | `POST /api/settings/email-otp/verify`, `POST /api/account/verify-otp-and-change-password`, `POST /api/mobile/wallet-action` • Bảng `users`, `account_security_otps`, `bank_transactions`, `security_audit_logs` | **PRODUCTION_DB_LINKED (100% Thật)** — Xác minh OTP thưởng ngay **`+20.000 Xu`** (`OTP_VERIFY_BONUS`), tự động làm mờ/khóa nút Gửi OTP (`✅ Email Đã Được Xác Minh Bảo Mật`), mở lại qua `unlockOtpReverification()`, và chặn Guest chuyển tiền (`HTTP 401`). |
| **`[FEAT-PAY-004]`** | **Hệ Sinh Thái Ví Nexora Pay, Bảo Lãnh Escrow & Chuyển Khoản Hộ QR 2 Bước** | `services/cart_checkout/bank.html`, `services/cart_checkout/checkout.js`, `services/mobile/mobile-app.js`, `app.py` | `POST /api/payment/qr-session/create`, `POST /api/payment/qr-session/confirm`, `GET /api/settings/bank-wallet` • Bảng `qr_payment_sessions`, `bank_transactions`, `orders`, `users` | **PRODUCTION_DB_LINKED (100% Thật)** — Hóa đơn QR 2 bước xem giá trước khi bấm xác nhận, hỗ trợ Chuyển khoản hộ và đồng bộ sổ cái giao dịch SQLite thời gian thực. |
| **`[FEAT-LOG-005]`** | **Điều Phối Vận Đơn NX Express 2H, Đồng Kiểm 24H & Sổ Cái Blockchain SHA-256** | `services/order_tracking/tracking.html`, `services/order_tracking/tracking.js`, `app.py` | `GET/POST /api/tracking/order-lifecycle`, `POST /api/orders/<id>/return-refund`, `GET /api/blockchain/device-passport` • Bảng `orders`, `order_items`, `bank_transactions` | **PRODUCTION_DB_LINKED (100% Thật)** — Đầy đủ 6 bước vận chuyển, hoàn tiền nguyên tử 100% khi trả hàng và kiểm chứng chuỗi băm bất biến SHA-256 4 Block. |
| **`[FEAT-MKT-006]`** | **Sàn Theo Dõi Giá Linh Kiện VN, Chỉ Báo Định Lượng (EMA-7, Bollinger, RSI-14) & Đề Xuất Bayesian** | `services/market_tracker/price-tracker.html`, `services/market_tracker/price-tracker.js`, `app.py` | `GET /api/market-tracker/overview`, `GET/POST /api/market-tracker/watchlist`, `GET /api/algorithms/bayesian-recommendations` • Bảng `market_price_history`, `user_price_watchlist`, `user_notifications` | **PRODUCTION_DB_LINKED (100% Thật)** — Biểu đồ Nến Nhật 30 phiên kèm `EMA-7`, `Bollinger Bands (20, 2σ)`, `RSI-14` và cảnh báo tự động khi chạm `target_price`. |
| **`[FEAT-AUC-007]`** | **Sàn Đấu Giá Kép Thời Gian Thực (Ký Quỹ 10% +30s Anti-Sniping & Đấu Giá Ngược Dutch Flash)** | `services/auction/auction.html`, `services/auction/auction.js`, `app.py` | `GET /api/auctions/list`, `POST /api/auctions/bid`, `POST /api/auctions/dutch-claim` • Bảng `auctions`, `auction_bids`, `orders`, `qr_payment_sessions` | **PRODUCTION_DB_LINKED (100% Thật)** — Khóa cổng RBAC `requireAuthOrPrompt` trước khi đặt giá/chốt giá và tự động hoàn cọc 100% trong cùng transaction nguyên tử SQLite. |
| **`[FEAT-RFQ-008]`** | **Sàn Đấu Thầu Ngược B2B Reverse RFQ & Chốt Báo Giá Tự Sinh Đơn Hàng QR** | `services/rfq/rfq.html`, `services/rfq/rfq.js`, `app.py` | `GET/POST /api/rfq/requests`, `POST /api/rfq/submit-offer`, `POST /api/rfq/accept-offer` • Bảng `rfq_requests`, `rfq_quotes`, `orders`, `qr_payment_sessions` | **PRODUCTION_DB_LINKED (100% Thật)** — Chốt báo giá tự động tạo đơn hàng `#NVD-xxx` trong bảng `orders` và mở hóa đơn QR 2 bước. |
| **`[FEAT-ACC-009]`** | **Studio 12 Giao Diện, 5 Chế Độ Mù Màu (CVD), Mèo Báo Màu Di Chuột 2s & Hỗ Trợ Đa Khuyết Tật** | `core/global.css`, `core/main.js`, `core/cat_widget.js`, `services/product/product-detail.js`, `services/settings/settings.html`, `services/settings/settings.js`, `app.py` | `GET/POST /api/settings/accessibility` • Bảng `system_settings` | **PRODUCTION_DB_LINKED (100% Thật)** — 5 Chế độ CVD, **Mèo AI Báo Màu Khi Di Chuột 2 Giây** (`toggleHoverColorInspector()`, mặc định TẮT), nút `🎨 Mèo Báo Màu & Ngoại Hình SP Này` (`inspectCurrentProductDetailColors()`) và NLP phân biệt thông minh câu hỏi màu sản phẩm vs. câu báo mù màu. |
| **`[FEAT-ADM-010]`** | **Trung Tâm Admin, Tòa Án Trọng Tài AI, Chấm Điểm Rủi Ro Gian Lận (0-100) & Đội Quân 10 Bot QA V12.0** | `services/admin_dispute/admin-center.html`, `services/admin_dispute/admin-center.js`, `services/admin_dispute/arbitration-court.html`, `app.py` | `GET /api/admin-dispute/fraud-risk-radar`, `POST /api/admin-dispute/mission-control/action`, `POST /api/settings/qa-bot-audit` • Bảng `disputes`, `security_shields`, `intrusion_logs`, `users` | **PRODUCTION_DB_LINKED (100% Thật)** — Tích hợp 3 Thuật toán lõi, Admin Mission Control và **Đội Quân 10 Bot QA (`V12.0-10-BOTS`)** đạt 100% PASS. |

---

## 2. BẢN ĐỒ CHI TIẾT 45 MÃ TÍNH NĂNG CON (`[FEAT-xxx.y]`)

| STT | Mã Tính Năng Con | Mô Tả Chi Tiết & File Triển Khai | Trạng Thái |
| :---: | :--- | :--- | :---: |
| 1 | `[FEAT-HDR-001.1]` | Khóa `position: fixed; top: 0; z-index: 2147483000` cho Header 3 tầng, cấm `filter`/`transform` trên `html, body` & đồng bộ `#nvxHeaderStickySpacer` (`core/global.css`, `core/main.js`) | ✅ LOCKED |
| 2 | `[FEAT-HDR-001.2]` | Menu Dropdown Topbar không điểm mù (`16px` cầu nối trong suốt + `260ms` delay) & Kệ 3 cột Glassmorphism trong suốt (`gap: 32px`) (`core/global.css`, `core/main.js`, `services/home/home.js`) | ✅ LOCKED |
| 3 | `[FEAT-HDR-001.3]` | Hệ thống Điểm danh 7 ngày liên tiếp (`🔥 + số ngày`) cộng thưởng thật vào SQLite (`+5.000 Xu` ➔ `+50.000 Xu` + Lượt quay + Voucher `STREAK7VIP`) (`core/main.js`, `app.py`) | ✅ LOCKED |
| 4 | `[FEAT-HDR-001.4]` | Khóa nút Điểm danh sau khi đã nhận trong ngày & ẩn 2 nút Test (`⚡ Test +1 Ngày`, `🔄 Reset`) đối với khách thường (`core/main.js`) | ✅ LOCKED |
| 5 | `[FEAT-HDR-001.5]` | Nút chuyển nhanh Giao diện Sáng/Tối (`☀️/🌙`), Chuông thông báo giảm giá (`🔔`) & Đồng bộ 14 vị trí Icon động (`core/main.js`, `app.py`) | ✅ LOCKED |
| 6 | `[FEAT-CAT-002.1]` | Khung xương Canvas 2D (`z-index: 2147483645`), 5 giống mèo & đầu bo tròn mềm mại không vạch ngang cằm (`core/cat_widget.js`) | ✅ LOCKED |
| 7 | `[FEAT-CAT-002.2]` | Khóa tọa độ miệng mèo `(mouthX = headCenterX, mouthY = headCenterY + headRadius * 0.38)` khớp 100% với mẩu cá & ống hút trà sữa (`core/cat_widget.js`) | ✅ LOCKED |
| 8 | `[FEAT-CAT-002.3]` | Bảng điều khiển Mèo AI gom 4 Nhóm Accordion xổ xuống (`▾`) hiển thị đầy đủ 18+ nút tương tác (`core/main.js`) | ✅ LOCKED |
| 9 | `[FEAT-CAT-002.4]` | Kịch bản Mèo AI đi săn hàng khuyến mãi 4 chặng & lưu Wishlist thực tế vào SQLite (`/api/compare/wishlist`) (`core/cat_widget.js`, `app.py`) | ✅ LOCKED |
| 10 | `[FEAT-CAT-002.5]` | Mèo AI trèo leo hô thần chú & tự động bấm nút tìm kiếm khi dùng Giọng nói (`🎙️` Google Voice Search) (`core/cat_widget.js`, `core/main.js`) | ✅ LOCKED |
| 11 | `[FEAT-CAT-002.6]` | Tính năng **"Cất Mèo Đi / Gọi Mèo Ra"** (`tuckCatBehindChat()`, `summonCatBackOut()`, `TUCKED_BEHIND_CHAT`) — Mèo nấp sau thanh Chat thò tai và thập thò đuôi / nửa mặt / 2 chân măng cụt mỗi 6-9s (`core/cat_widget.js`, `core/main.js`) | ✅ LOCKED |
| 12 | `[FEAT-AUTH-003.1]` | Đăng nhập/Đăng ký Buyer & Seller, Google OAuth 2.0 & trang Auth mặc định Nền Sáng Thanh Lịch (`services/auth/auth.html`, `services/auth/auth.js`) | ✅ LOCKED |
| 13 | `[FEAT-AUTH-003.2]` | Xác minh Email OTP 6 số qua Resend (`@mail.castle-tech.cloud`) tự động thưởng **`+20.000 Xu`** vào Ví SQLite (`OTP_VERIFY_BONUS`) (`core/main.js`, `app.py`) | ✅ LOCKED |
| 14 | `[FEAT-AUTH-003.3]` | Tự động làm mờ & vô hiệu hóa nút Gửi mã OTP sau khi đã xác minh (`✅ Email Đã Được Xác Minh Bảo Mật`), mở lại qua `unlockOtpReverification()` (`core/main.js`, `services/settings/settings.js`, `services/mobile/mobile-app.js`) | ✅ LOCKED |
| 15 | `[FEAT-AUTH-003.4]` | Quy trình Đổi mật khẩu (`SHA-256`) & Thiết lập Mã PIN Ví 6 số có nhật ký kiểm toán `security_audit_logs` (`app.py`, `services/mobile/mobile-app.js`) | ✅ LOCKED |
| 16 | `[FEAT-AUTH-003.5]` | Ma trận phân quyền RBAC 4 cấp (`Guest / Buyer / Seller / Admin`) trên 25 trang & chặn tuyệt đối khách chưa đăng nhập chuyển khoản (`HTTP 401`) (`core/main.js`, `app.py`) | ✅ LOCKED |
| 17 | `[FEAT-PAY-004.1]` | Giao diện Ví điện tử `Nexora Pay` chuẩn MoMo & đồng bộ số dư thời gian thực giữa Web và Mobile App (`services/cart_checkout/bank.html`, `app.py`) | ✅ LOCKED |
| 18 | `[FEAT-PAY-004.2]` | Tạo đơn hàng QR ở trạng thái chờ `AWAITING_PAYMENT` (cấm tự động duyệt khi chưa bấm xác nhận) (`services/cart_checkout/checkout.js`, `app.py`) | ✅ LOCKED |
| 19 | `[FEAT-PAY-004.3]` | Màn hình Xem giá & Kiểm tra hóa đơn chi tiết trên `bank.html?pay_token=...` trước khi bấm xác nhận (`services/cart_checkout/bank.html`) | ✅ LOCKED |
| 20 | `[FEAT-PAY-004.4]` | Chế độ **Chuyển khoản hộ cho bạn bè / người thân** (lưu họ tên người chuyển hộ & lời nhắn) (`services/cart_checkout/bank.html`, `app.py`) | ✅ LOCKED |
| 21 | `[FEAT-PAY-004.5]` | Khóa tiền vào Quỹ Bảo Lãnh (`ESCROW_LOCKED`) & phát tín hiệu Realtime (`poll=1`) tự động chuyển sang `tracking.html` (`services/cart_checkout/checkout.js`, `app.py`) | ✅ LOCKED |
| 22 | `[FEAT-LOG-005.1]` | Chu trình vận đơn 6 bước chuẩn (`AWAITING_PAYMENT` ➔ `COMPLETED`) (`services/order_tracking/tracking.js`, `app.py`) | ✅ LOCKED |
| 23 | `[FEAT-LOG-005.2]` | Bản đồ Radar Canvas 2D mô phỏng lộ trình giao hàng Hỏa Tốc NX Express 2H (`services/order_tracking/tracking.js`) | ✅ LOCKED |
| 24 | `[FEAT-LOG-005.3]` | Chốt chặn xác nhận Đã nhận hàng & giải ngân bảo lãnh Escrow cho Gian hàng (`services/order_tracking/tracking.js`, `app.py`) | ✅ LOCKED |
| 25 | `[FEAT-LOG-005.4]` | Luồng Trả hàng / Hoàn tiền nguyên tử 100% (`RETURN_REQUESTED` ➔ `REFUNDED`) cộng trả tiền vào Ví, hoàn kho & tính phạt SLA (`app.py`) | ✅ LOCKED |
| 26 | `[FEAT-MKT-006.1]` | Biểu đồ Nến Nhật OHLC 30 phiên vẽ bằng HTML5 Canvas 2D so sánh giá Nexora và Giá Trung Bình Thị Trường VN (`services/market_tracker/price-tracker.js`) | ✅ LOCKED |
| 27 | `[FEAT-MKT-006.2]` | Bộ 3 chỉ báo định lượng kỹ thuật: `EMA-7`, `Bollinger Bands (20, 2σ)` và `RSI-14` (`services/market_tracker/price-tracker.js`, `app.py`) | ✅ LOCKED |
| 28 | `[FEAT-MKT-006.3]` | Quản lý danh sách Canh giá (`Watchlist Quota`: 05 vật phẩm mặc định, mở rộng lên 08 vật phẩm khi đã xác minh OTP/điểm danh) (`app.py`) | ✅ LOCKED |
| 29 | `[FEAT-MKT-006.4]` | Cảnh báo tự động qua Chuông (`🔔`) & huy hiệu `⚡ ĐÃ CHẠM GIÁ MỤC TIÊU` khi giá giảm chạm `target_price` (`core/main.js`, `app.py`) | ✅ LOCKED |
| 30 | `[FEAT-AUC-007.1]` | Đấu giá truyền thống ký quỹ 10% (`Escrow Deposit`), tự động hoàn cọc 100% & cơ chế `+30s Anti-Sniping` (`services/auction/auction.js`, `app.py`) | ✅ LOCKED |
| 31 | `[FEAT-AUC-007.2]` | Đấu giá ngược giảm giá từng giây (`Dutch Flash Auction`) chốt đơn nguyên tử ngay khi người đầu tiên bấm mua (`services/auction/auction.js`, `app.py`) | ✅ LOCKED |
| 32 | `[FEAT-RFQ-008.1]` | Đăng yêu cầu báo giá số lượng lớn (`rfq_requests`) cho 24 Gian hàng Chính hãng Flagship (`services/rfq/rfq.js`, `app.py`) | ✅ LOCKED |
| 33 | `[FEAT-RFQ-008.2]` | Gian hàng gửi chào giá cạnh tranh (`rfq_quotes`) kèm cam kết SLA & chiết khấu sỉ (`services/rfq/rfq.js`, `app.py`) | ✅ LOCKED |
| 34 | `[FEAT-RFQ-008.3]` | Người mua bấm Chốt báo giá (`/api/rfq/accept-offer`) tự động sinh đơn hàng thật trong bảng `orders` (`services/rfq/rfq.js`, `app.py`) | ✅ LOCKED |
| 35 | `[FEAT-RFQ-008.4]` | Hộ chiếu Thiết bị Blockchain (`Device Passport` — `/api/blockchain/device-passport`) băm chuỗi `SHA-256` 4 Block (`services/product/product-detail.js`, `app.py`) | ✅ LOCKED |
| 36 | `[FEAT-RFQ-008.5]` | Trạm Build PC AI kiểm tra tương thích nguồn/socket & Nông trại Cây Voucher đồng bộ kho Voucher toàn sàn (`services/pc_builder/pc-builder.js`, `services/minigame/farm.js`) | ✅ LOCKED |
| 37 | `[FEAT-ACC-009.1]` | Studio 12 Giao Diện Đa Lứa Tuổi (6 Nền Sáng mặc định `executive_light` + 6 Nền Tối) & Chỉnh mật độ lưới (`3, 4, 5, 6 Cột`) (`core/main.js`, `services/settings/settings.js`) | ✅ LOCKED |
| 38 | `[FEAT-ACC-009.2]` | 5 Chế độ Trợ năng Mù màu (`normal`, `deuteranopia`, `tritanopia`, `pattern_labels`, `high_contrast_aaa`) không làm hỏng `position: fixed` (`core/global.css`, `core/main.js`) | ✅ LOCKED |
| 39 | `[FEAT-ACC-009.3]` | Bảng Xem Trước Màu Thực Tế (`openColorblindPreviewModal()`) & Tự động mô tả màu sắc, chất liệu trong Chi tiết Sản phẩm (`core/main.js`, `services/product/product-detail.js`) | ✅ LOCKED |
| 40 | `[FEAT-ACC-009.4]` | **Mèo AI Báo Màu Khi Di Chuột 2 Giây** (`toggleHoverColorInspector()`, mặc định TẮT), nút `🎨 Mèo Báo Màu & Ngoại Hình SP Này` (`inspectCurrentProductDetailColors()`) & NLP phân biệt thông minh (`core/main.js`, `core/cat_widget.js`, `ai_engine/cat_assistant_engine.py`) | ✅ LOCKED |
| 41 | `[FEAT-ADM-010.1]` | Trung tâm Quản trị Admin (`admin-center.html`), Studio Đa Bộ Icon 14 Vị Trí & Lá chắn An ninh SOC 25 Lớp (`services/admin_dispute/admin-center.js`, `app.py`) | ✅ LOCKED |
| 42 | `[FEAT-ADM-010.2]` | Tòa Án Trọng Tài AI (`arbitration-court.html`) phân tích bằng chứng & phán quyết tranh chấp Escrow (`services/admin_dispute/arbitration-court.js`) | ✅ LOCKED |
| 43 | `[FEAT-ADM-010.3]` | Thuật toán 1 — Hệ thống Đề xuất Sản phẩm **Hybrid Bayesian Weighted Rating** (`/api/algorithms/bayesian-recommendations`) (`app.py`) | ✅ LOCKED |
| 44 | `[FEAT-ADM-010.4]` | Thuật toán 3 — Radar Chấm điểm Rủi ro Gian lận Thời gian thực **Multi-Signal Fraud Risk Scoring 0-100** (`/api/admin-dispute/fraud-risk-radar`) (`app.py`) | ✅ LOCKED |
| 45 | `[FEAT-ADM-010.5]` | **Đội Quân 10 Bot Kiểm Thử Tự Động Toàn Diện (`QA Bot Squad V12.0 — 10 Bots`)** & Chiến dịch Kiểm toán Săn 100 Bug (`BUG_HUNT_100_REPORT.md` — 100/100 FIXED) (`app.py`) | ✅ LOCKED |

---

## 3. KIỂM TOÁN KIẾN TRÚC 5 TẦNG HIỂN THỊ (`Z-INDEX` & `STACKING CONTEXT`)

1. **Tầng 1 (Cao nhất — `z-index: 2147483645`):** Linh vật Mèo AI (`#nividaLiquidCatCanvas`, `#nividaCatHitbox`, `#nividaCatSpeechBubble`) gắn trực tiếp vào `document.body` với `position: fixed !important` (khi ở chế độ `TUCKED_BEHIND_CHAT` tự động lùi về `z-index: 2147483490` ngay sau thanh Chat để thò 2 tai và thập thò đáng yêu).
2. **Tầng 2 (`z-index: 2147483600`):** Các hộp thoại Modal khẩn cấp (`#nvQuickAuthGateModal`, `#nvColorblindPreviewModal`, `#nvDailyCheckinModal`, `#qrPaymentOverlayModal`).
3. **Tầng 3 (`z-index: 2147483500`):** Trung tâm Tin nhắn, Trợ lý AI & Điều khiển Mèo (`#nvMessengerLauncherBar`, `#nvUnifiedHubDock`, `#nvUnifiedHubPanel`, `#nvUnifiedHubToggleBtn`) cố định chuẩn góc phải dưới (`right: 18px; bottom: 68px; width: 390px`).
4. **Tầng 4 (`z-index: 2147483000` / `2147483100`):** Thanh Header 3 tầng cố định (`header#mainHeader.nvx-header-wrapper`) và Menu xổ xuống (`.nvx-dropdown-menu`) kết hợp `#nvxHeaderStickySpacer` đồng bộ bằng `ResizeObserver`.
5. **Tầng 5 (`z-index <= 20`):** Nội dung trang `<main>`, bộ lọc, kệ 3 cột Glassmorphism trong suốt và chân trang `<footer>`.
