# LỘ TRÌNH THỰC THI CHI TIẾT 6 GIAI ĐOẠN (TODO ROADMAP V9.0)
**Dự án:** Sàn Thương Mại Điện Tử Công Nghệ & Đời Sống — **Nvidia Store**

Tài liệu này chia toàn bộ khối lượng công việc thành **Chặng 0 (Phân tích & Thiết kế)** và **6 Giai đoạn thực thi** với các hộp kiểm `[ ]` để AI thực hiện tuần tự từ Giai đoạn 1 đến Giai đoạn 6.

---

## CHẶNG 0: RÀ SOÁT MÃ NGUỒN, CHẨN ĐOÁN GỐC RỄ BUG ICON & CẬP NHẬT KIẾN TRÚC (ĐÃ HOÀN TẤT)

- [x] **0.1. Đọc và đối chiếu 3 tệp hiến pháp/kiến trúc (`AI_RULES.md`, `ARCHITECTURE.md`, `TODO_ROADMAP.md`) cùng 4 tệp mã nguồn cốt lõi (`app.py`, `core/main.js`, `services/admin_dispute/admin-center.js`, `services/home/home.js`).**
- [x] **0.2. Xác định chính xác nguyên nhân lỗi không lưu được Icon ở vị trí 4 (`nav_bank`), 5 (`nav_ai_cat`), 8 (`cat_mainboard`), 11 (`cat_headphones`) và lỗi không tải Icon mới khi F5 trang người dùng.**
- [x] **0.3. Cập nhật chi tiết kế hoạch sửa lỗi và thiết kế bảng SQLite cho Sàn Đấu Giá Kép (`auctions`, `auction_bids`) + các tính năng mới vào `ARCHITECTURE.md` và `TODO_ROADMAP.md`.**

---

## GIAI ĐOẠN 1: KHẮC PHỤC DỨT ĐIỂM BUG ICON (`bug1.txt` & `bug2.txt`) & NÂNG CẤP STUDIO ẢNH SẢN PHẨM (ĐÃ HOÀN TẤT)

- [x] **1.1. Sửa lỗi không lưu được ảnh Icon trong quản trị ở vị trí 4 (`nav_bank`), 5 (`nav_ai_cat`), 8 (`cat_mainboard`), 11 (`cat_headphones`) và toàn bộ 14 vị trí (`bug1.txt`):**
  - [x] **Tại `app.py` (`manage_multi_icon_sets_api`):**
    - [x] Nâng cấp bộ giải mã `image_base64`: tự động bóc tách phần đầu `data:image/...;base64,`, tự động bù dấu `=` nếu chiều dài chuỗi chưa chia hết cho 4 (`len(raw_b64) % 4`), hỗ trợ lưu cả chuỗi `data:image/svg+xml;utf8,...` và mọi định dạng `.png`, `.svg`, `.webp`, `.jpg`, `.ico` vào đúng thư mục `assets/icons/<set_id>/`.
    - [x] Nâng cấp nhánh `remote_url`: nếu người dùng dán chuỗi `data:image/...` vào ô URL thì tự động chuyển sang nhánh giải mã Base64; nếu là URL `http://` hoặc `https://`, tách sạch query string khi lấy đuôi mở rộng, sử dụng `ssl._create_unverified_context()` và bộ Header trình duyệt đầy đủ (`User-Agent`, `Accept`, `Referer`) để không bị lỗi `HTTP 403 Forbidden` hoặc lỗi SSL. Nếu máy chủ ngoài chặn tải, tự động sinh tệp SVG/PNG đại diện hợp lệ cho `slot_key` đó lưu vào `assets/icons/<set_id>/` (cam kết 100% thao tác Lưu không bao giờ báo lỗi 400/404).
    - [x] Khi Admin lưu một vị trí (`action == "save_slot"`) vào `target_set` (ví dụ `set_1`) mà `manifest["active_set"]` đang là `"default"`, tự động chuyển `manifest["active_set"] = target_set` (hoặc đồng bộ sang bộ đang bật) và cập nhật `"updated_at": int(time.time() * 1000)` trong `icon_sets_manifest.json`.
  - [x] **Tại `services/admin_dispute/admin-center.js` (`saveSlotIconToCurrentSet`, `onPreviewSlotFileSelect`, `onPreviewSlotUrlInput`):**
    - [x] Giữ nguyên các preview chưa lưu trong `__pendingSlotPreviews` khi re-render hoặc chỉ cập nhật đúng thẻ DOM của `slotKey` vừa lưu thay vì xóa trắng các ô input của vị trí khác.
    - [x] Khi bấm nút **`💾 Lưu`**, nếu `__pendingSlotPreviews[slotKey]` trống và ô URL trống/đang giữ nhãn `[Đã chọn file...]`, tự động trích xuất dữ liệu ảnh trực tiếp từ `#slotPreviewImg_<slotKey>` (qua HTML5 Canvas `toDataURL('image/png')` hoặc `src` hiện hành) để gửi lên `/api/settings/icon-sets`, đảm bảo các vị trí **4 (`nav_bank`)**, **5 (`nav_ai_cat`)**, **8 (`cat_mainboard`)**, **11 (`cat_headphones`)** luôn lưu thành công 100%.
- [x] **1.2. Sửa lỗi thay đổi Icon trong quản trị nhưng khi load lại trang người dùng (F5) chưa tải về Icon mới (`bug2.txt`):**
  - [x] **Tại `app.py` (`/api/settings/icon-sets`, `/api/settings/slot-icon/<slot_key>`, `/api/settings/product-icon-svg`):**
    - [x] Lưu trường `"updated_at": int(time.time() * 1000)` vào `assets/icons/icon_sets_manifest.json` mỗi khi lưu slot, reset slot, copy set hoặc chuyển bộ icon.
    - [x] Đính kèm tham số chống cache `?set=<sid>&v=<updated_at>` vào toàn bộ `preview_url` trả về từ `/api/settings/icon-sets` và thêm HTTP Header `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` cho cả 3 API `/api/settings/icon-sets`, `/api/settings/slot-icon/<slot_key>` và `/api/settings/product-icon-svg`.
    - [x] Trong `/api/settings/product-icon-svg`, cho phép hiển thị icon tùy chỉnh của ngành hàng ngay cả khi slot đó được lưu trong `default` hoặc bộ đang kích hoạt (`set_1`, `set_2`, `set_3`), đồng thời ưu tiên kiểm tra đúng `cat == "mainboard"` (vị trí 8) và `cat == "headphones"` (vị trí 11) trước khi khớp từ khóa phụ.
  - [x] **Tại `core/main.js` & `services/home/home.js` (`syncActiveIconSetAcrossWebsite`, `renderGlobalHeaderAndFooter`, `buildProductCardHtml`):**
    - [x] Xóa bỏ dòng lệnh ghi đè `bankBtn.innerHTML = '🏦 Bank'` ở dòng 3061–3062 của `core/main.js` làm mất icon vị trí 4 (`nav_bank`).
    - [x] Gắn thuộc tính định danh tường minh `data-nv-slot="<slot_key>"` cho cả 14 vị trí trên Header, Thanh danh mục và Nút Mèo AI (`#nvUnifiedHubToggleBtn`, `#msgHubTabBtn_cat`, nút Mèo AI trên trang chủ cho vị trí 5 `nav_ai_cat`; nút `#headerBankBalanceBtn` cho vị trí 4 `nav_bank`; mục `Mainboard` cho vị trí 8 `cat_mainboard`; mục `Tai nghe` cho vị trí 11 `cat_headphones`).
    - [x] Trong `syncActiveIconSetAcrossWebsite()`, gọi `fetch('/api/settings/icon-sets?_t=' + Date.now(), { cache: 'no-store' })`, lưu `window.__nvxIconManifestVersion = data.updated_at`, ghi đè ngay `localStorage.setItem('nvx_active_brand_icon_url', ...)` bằng URL mới nhất từ Server, cập nhật icon cho mọi phần tử có `[data-nv-slot]` và làm mới `src` của các thẻ ảnh sản phẩm đang dùng `/api/settings/product-icon-svg` kèm `&v=<updated_at>`.
    - [x] Chạy đồng bộ ở các mốc `150ms`, `500ms`, `1200ms` và gọi lại ngay sau khi `home.js` (`loadProducts`) cũng như `initMultiWindowMessengerDock` render xong DOM.
- [x] **1.3. Nâng cấp Studio Đăng Ảnh Sản Phẩm (Kênh Người Bán & Admin):**
  - [x] Bổ sung vùng **Kéo - Thả ảnh (Drag & Drop)** và **Dán ảnh trực tiếp từ Clipboard (`Ctrl + V`)**, tự động căn chỉnh khung hình và nén nhẹ trên HTML5 Canvas trước khi lưu vào `assets/uploads/products/`.

---

## GIAI ĐOẠN 2: CẢI TẠO QUY TRÌNH QUÉT QR XEM GIÁ -> BẤM XÁC NHẬN (CÓ CHUYỂN KHOẢN HỘ) & VẬN ĐƠN - HOÀN ĐƠN NVX EXPRESS (ĐÃ HOÀN TẤT)

- [x] **2.1. Xây dựng Quy trình Thanh toán QR 2 Bước (Xem Giá Hóa Đơn -> Bấm Xác Nhận) & Chuyển Khoản Hộ:**
  - [x] Trong `app.py`, tạo bảng `qr_payment_sessions` và 3 API: `/api/payment/qr-session/create`, `/api/payment/qr-session/<pay_token>`, `/api/payment/qr-session/confirm`.
  - [x] Tại `services/cart_checkout/checkout.html` (và `checkout.js` / `core/main.js`), khi người mua đặt hàng bằng QR, tạo phiên thanh toán ở trạng thái `AWAITING_PAYMENT` (tuyệt đối không tự duyệt khi chưa xác nhận), hiển thị mã QR kèm 2 nút: **`📱 Mở Màn Hình Xem Giá & Xác Nhận Quét QR`** và **`🤝 Copy Link Nhờ Bạn Bè / Người Thân Chuyển Khoản Hộ`**.
  - [x] Tại `services/cart_checkout/bank.html`, khi truy cập qua mã QR (`?pay_token=...`), hiển thị nổi bật **Màn Hình Xem Giá & Kiểm Tra Hóa Đơn Chi Tiết** gồm: Mã đơn `#NVD-xxxx`, Tên người mua, Danh sách từng món hàng, Tổng số tiền cần trả, tùy chọn **"Tôi tự thanh toán"** hoặc **"Chuyển khoản hộ"** (nhập *Tên người chuyển hộ* + *Lời nhắn*) và nút **`✅ Xác Nhận Chuyển Khoản Số Tiền Này`**.
  - [x] Khi bấm **`✅ Xác Nhận Chuyển Khoản Số Tiền Này`**, Backend trừ số dư, khóa tiền vào Quỹ Bảo Lãnh (`ESCROW_LOCKED`), lưu thông tin người chuyển hộ và tự động đẩy tín hiệu để màn hình `checkout.html` chuyển hướng sang trang Theo dõi vận đơn (`tracking.html`).
- [x] **2.2. Thiết kế lại toàn diện Trang Vận Đơn NVX Express & Quy Trình Hoàn Đơn / Hoàn Tiền (Thoát khỏi kiểu "Dịch Shopee"):**
  - [x] Xóa bỏ hoàn toàn các câu chữ dịch máy kiểu Shopee trên `services/order_tracking/tracking.html` và `tracking.js`.
  - [x] Thiết lập thanh tiến trình **6 Bước NVX Smart Logistics & Escrow Lifecycle** (`Chờ Thanh Toán QR` $\rightarrow$ `Đã Khóa Quỹ Bảo Lãnh Escrow` $\rightarrow$ `Gian Hàng Đóng Gói & Dán QR Bảo Hành SOP-01` $\rightarrow$ `Điều Phối Giao Hỏa Tốc NVX 2H` $\rightarrow$ `Đã Giao Hàng & Đồng Kiểm 24h` $\rightarrow$ `Hoàn Tất Giải Ngân / Đã Hoàn Tiền`).
  - [x] Tích hợp **Bản Đồ Radar Canvas Trực Quan** mô phỏng lộ trình bưu tá di chuyển từ Kho Tổng tới điểm giao nhận và thanh công cụ **`⚡ Chuyển Nhanh Trạng Thái Giao Hàng (Demo)`**.
  - [x] Xây dựng trọn vẹn 2 luồng hành động thực tế ở bước Đồng kiểm (`DELIVERED_INSPECTING`):
    - [x] Nút **`✅ Xác Nhận Nhận Hàng & Giải Ngân Cho Shop`**: Chuyển đơn sang `COMPLETED`, giải ngân tiền từ Quỹ Escrow cho Gian hàng.
    - [x] Nút **`🔄 Yêu Cầu Hoàn Đơn & Hoàn Tiền 100%`**: Chọn lý do hoàn trả $\rightarrow$ Cấp mã thu hồi `NVX-RET-xxxx` $\rightarrow$ Xác nhận thu hồi thành công $\rightarrow$ Chuyển đơn sang `REFUNDED`, **tự động cộng hoàn trả 100% tiền về lại Ví NVIDIA Pay của khách hàng** và cộng trả lại số lượng tồn kho (`stock`) cho sản phẩm.

---

## GIAI ĐOẠN 3: XÂY DỰNG SÀN THEO DÕI GIÁ THỊ TRƯỜNG CÔNG NGHỆ VIỆT NAM (BIỂU ĐỒ CHỨNG KHOÁN & BÁO ĐỘNG GIÁ)

- [ ] **3.1. Cơ sở dữ liệu & Động cơ Lịch sử Giá 30 Phiên (`product_price_history` & `user_price_watches`):**
  - [ ] Trong `app.py`, khởi tạo bảng `product_price_history` và tự động tạo dữ liệu lịch sử biến động giá 30 ngày gần nhất tại thị trường Việt Nam (gồm `open_price`, `high_price`, `low_price`, `close_price`, `vn_market_avg_price`, `volume`) cho các sản phẩm công nghệ chủ lực (GPU RTX, CPU Core Ultra/Ryzen, RAM DDR5, SSD NVMe, Laptop, Màn hình OLED).
  - [ ] Tự động ghi nhận phiên giá mới vào biểu đồ mỗi khi Gian hàng cập nhật giá sản phẩm, Admin bật/tắt Sự kiện giảm giá, hoặc kết thúc phiên Đấu giá.
- [ ] **3.2. Giao diện Biểu Đồ Giá Kiểu Chứng Khoán (Candlestick / Line + $MA_7$ / $MA_{30}$):**
  - [ ] Xây dựng khu vực **📈 Sàn Theo Dõi Giá Thị Trường Công Nghệ Việt Nam (VN-TECH INDEX)** (mở công khai cho cả Khách, Người mua và Người bán truy cập hằng ngày).
  - [ ] Vẽ biểu đồ **Nến Chứng Khoán (Candlestick Chart) & Đường Xu Hướng ($MA_7$, $MA_{30}$)** trên HTML5 Canvas kèm bảng so sánh: *Giá Nivida Store* vs *Giá Trung Bình Thị Trường VN*, *Đáy 30 Ngày*, *Đỉnh 30 Ngày* và *Khuyến nghị AI (Bắt Đáy / Tích Lũy / Chờ Giảm)*.
- [ ] **3.3. Cơ chế Gắn Theo Dõi Giới Hạn Vật Phẩm (Quota 5–8 Món) & Báo Động Khi Giảm Giá:**
  - [ ] Cho phép người dùng bấm **`🔔 Gắn Theo Dõi & Đặt Giá Mục Tiêu`** cho sản phẩm (giới hạn tối đa **5 vật phẩm** mặc định, mở rộng lên **8 vật phẩm** nếu đã xác minh OTP hoặc chuỗi điểm danh $\ge 3$ ngày).
  - [ ] Thêm nút **`📉 Giả Lập Biến Động Thị Trường / Hạ Giá Chạm Mốc Kỳ Vọng (Demo)`**: Khi bấm, giá thị trường giảm xuống chạm mốc `target_price` của người dùng $\rightarrow$ Tự động kích hoạt thông báo Chuông (`🔔`), đổi thẻ theo dõi sang trạng thái **`⚡ ĐÃ CHẠM GIÁ MỤC TIÊU — MUA NGAY`** và hiển thị Toast cảnh báo tức thì.

---

## GIAI ĐOẠN 4: XÂY DỰNG SÀN ĐẤU GIÁ KÉP THỜI GIAN THỰC (KÝ QUỸ ANTI-SNIPING 30S & ĐẤU GIÁ NGƯỢC GIẢM TỪNG GIÂY)

- [ ] **4.1. Backend & Database Sàn Đấu Giá Kép (`auctions` & `auction_bids`):**
  - [ ] Tạo bảng `auctions` và `auction_bids` (kèm index `idx_auctions_status_type`, `idx_auction_bids_auction_id`) trong `app.py`, tự động khởi tạo 6 phiên đấu giá mẫu (3 phiên Đấu giá Ký quỹ tiêu chuẩn `standard` + 3 phiên Đấu giá Ngược Flash `dutch`).
  - [ ] Xử lý API `POST /api/auctions/bid` (Đấu giá lên): Kiểm tra bước giá `min_step_price`, kiểm tra số dư Ví NVIDIA Pay, tạm khóa cọc 10% (`escrow_deposit_pct`), tự động hoàn trả tiền cọc ngay lập tức (`is_refunded = 1`) cho người đặt giá trước đó trong cùng 1 transaction, và **tự động cộng thêm +30 giây nếu lệnh trả giá diễn ra trong 10 giây cuối cùng (Anti-Sniping)**.
  - [ ] Xử lý API `POST /api/auctions/dutch-buy` (Đấu giá ngược): Giá giảm tự động mỗi 2 giây theo công thức thời gian thực; người đầu tiên bấm **`⚡ Chốt Giá Mua Ngay`** sẽ thắng ở đúng mức giá tại giây đó và tự động tạo phiên thanh toán QR (`pay_token`) để tự trả hoặc nhờ người khác chuyển khoản hộ.
- [ ] **4.2. Giao diện Sàn Đấu Giá Thời Gian Thực (`services/market_arena/market-arena.html` & `market-arena.js` + Liên kết toàn sàn):**
  - [ ] Hiển thị đồng hồ đếm ngược từng giây, hiệu ứng nhảy giá trực tiếp, huy hiệu `+30s Anti-Sniping`, sổ cái lịch sử người trả giá minh bạch (kèm trạng thái *Đang giữ cọc 10%* / *Đã hoàn cọc 100%*) và nút chuyển thẳng sang màn hình Xem giá / Chuyển khoản hộ QR khi thắng đấu giá.

---

## GIAI ĐOẠN 5: SÀN ĐẤU THẦU NGƯỢC RFQ & HỘ CHIẾU BẢO HÀNH BLOCKCHAIN SHA-256

- [ ] **5.1. Sàn Đấu Thầu Ngược "Khách Đăng Yêu Cầu — Gian Hàng Chào Giá Cạnh Tranh" (Reverse RFQ):**
  - [ ] Tạo bảng `rfq_requests` và `rfq_quotes` cùng các API `/api/rfq/list`, `/api/rfq/create`, `/api/rfq/submit-quote`, `/api/rfq/accept-quote`.
  - [ ] Cho phép Khách hàng đăng yêu cầu cấu hình/sản phẩm kèm ngân sách tối đa; cho phép Gian hàng (hoặc nút giả lập 24 Gian hàng chào giá tự động) gửi báo giá cạnh tranh thấp hơn ngân sách; khi khách bấm **`✅ Chấp Nhận Báo Giá Này`**, tự động tạo đơn hàng thanh toán QR ở đúng mức giá ưu đãi đó.
- [ ] **5.2. Hộ Chiếu Bảo Hành Chuỗi Băm Blockchain SHA-256 Trên Trang Chi Tiết Sản Phẩm:**
  - [ ] Trong `services/product/product-detail.js`, bổ sung khung tương tác **"🔗 Hộ Chiếu Bảo Hành Chuỗi Băm SHA-256 (Blockchain Device Warranty Passport)"**:
    - [ ] Hiển thị chuỗi khối `SHA-256 Device Warranty Passport` gồm 3 Block liên kết bất biến (*Block #1: Xuất xưởng Chính hãng* $\rightarrow$ *Block #2: Kiểm định Kho NVX* $\rightarrow$ *Block #3: Cam kết Bảo hành Escrow SOP-01*).

---

## GIAI ĐOẠN 6: RÀ SOÁT, DÒ BUG SÂU TOÀN DIỆN & NGHIỆM THU CUỐI CÙNG (DEEP BUG HUNTING & QA REGRESSION)

- [ ] **6.1. Dò Bug Cú Pháp, Biến Trùng & Dấu Cắt Patch Trên Toàn Bộ Dự Án:**
  - [ ] Quét toàn bộ các tệp `.py`, `.js`, `.html`, `.css` để đảm bảo **0 dòng dấu cắt patch thừa** (`===`, `<<<`, `>>>`), **0 lỗi biên dịch Python** (`py_compile`), và **0 khai báo biến `let`/`const` trùng tên** gây lỗi khi làm rối mã JS.
- [ ] **6.2. Dò Bug Liên Kết DOM ID, Hàm `onclick` & Đường Dẫn 404:**
  - [ ] Kiểm tra mọi nút bấm `onclick="tenHam(...)"` trên tất cả các trang HTML đều có hàm `window.tenHam` tương ứng trong `.js`.
  - [ ] Kiểm tra mọi lệnh `insertBefore` trong `core/main.js`, `admin-center.js`, `product-detail.js`, `tracking.js` đều có bước xác thực `parentNode` an toàn.
- [ ] **6.3. Kiểm Thử Nghiệm Thu End-to-End 5 Luồng Nghiệp Vụ Trọng Tâm:**
  - [ ] **Test Case 1 (Icon Studio):** Lưu thử icon ở vị trí 4 (`nav_bank`), 5 (`nav_ai_cat`), 8 (`cat_mainboard`), 11 (`cat_headphones`) trong Admin $\rightarrow$ F5 trang chủ người dùng $\rightarrow$ Xác nhận cả 4 vị trí và toàn bộ 14 vị trí hiển thị ngay icon mới.
  - [ ] **Test Case 2 (QR Xem Giá & Chuyển Khoản Hộ):** Đặt hàng QR $\rightarrow$ Mở link QR trên `bank.html` $\rightarrow$ Hiện bảng xem giá chi tiết $\rightarrow$ Chọn "Chuyển khoản hộ", nhập tên người chuyển hộ & bấm Xác nhận $\rightarrow$ Đơn hàng chuyển sang `ESCROW_LOCKED` và trang `checkout.html` tự chuyển sang `tracking.html`.
  - [ ] **Test Case 3 (Vận Đơn & Hoàn Đơn):** Trên `tracking.html`, chuyển trạng thái tới `DELIVERED_INSPECTING` $\rightarrow$ Bấm Yêu cầu Hoàn đơn & Hoàn tiền $\rightarrow$ Xác nhận số dư Ví NVIDIA Pay của khách được cộng hoàn lại 100% số tiền và tồn kho sản phẩm tăng lại.
  - [ ] **Test Case 4 (Theo Dõi Giá Thị Trường & Báo Động):** Gắn theo dõi 1 sản phẩm với giá mục tiêu $\rightarrow$ Bấm giả lập giảm giá chạm mốc $\rightarrow$ Xác nhận thông báo Chuông `🔔` và huy hiệu báo động kích hoạt chính xác; kiểm tra chặn khi vượt quá giới hạn Quota (5–8 món).
  - [ ] **Test Case 5 (Đấu Giá Kép, Đấu Thầu RFQ & Đội Bot QA):** Nâng cấp Đội Bot QA (`/api/settings/qa-bot-audit`) quét toàn bộ các trang và API mới, chạy kiểm tra đạt **100% HTTP 200 OK (0 lỗi)**.
