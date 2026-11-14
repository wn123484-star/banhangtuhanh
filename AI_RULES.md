# HIẾN PHÁP KỸ THUẬT & QUY TẮC BẮT BUỘC CHO AI (AI ENGINEERING CONSTITUTION)
**Dự án:** Sàn Thương Mại Điện Tử Công Nghệ & Đời Sống — **Nexora Mall (NEXORA V11.0)**

---

## HIẾN PHÁP KHÓA THIẾT KẾ & MÃ TÍNH NĂNG (DESIGN & FEATURE FREEZE CONSTITUTION — BẤT KHẢ XÂM PHẠM)

### Điều 1 (Cấm tự ý sửa đổi thiết kế đã khóa — `[LOCKED-DESIGN]`):
Mọi thành phần đã được gắn nhãn `[LOCKED-DESIGN]` — bao gồm:
1. **Cấu trúc Header 3 tầng cuộn cố định (`[FEAT-HDR-001]` & `[FEAT-HDR-001.1..001.5]`):** Hàng 1 Topbar Dropdown không điểm mù (`Sàn Giao Dịch ▾`, `Giải Trí & Săn Thưởng ▾`, `Tiện Ích ▾`, `Nexora Pay`), Hàng 2 (`Logo NEXORA`, Thanh tìm kiếm, nút Điểm danh lửa `🔥`, Chuông `🔔`, Đổi Sáng/Tối `☀️/🌙`, Tài khoản, Giỏ hàng), Hàng 3 (Thanh 9 Danh mục + So Sánh & Wishlist) ở chế độ `position: fixed; top: 0; z-index: 2147483000` kèm `#nvxHeaderStickySpacer`. Tuyệt đối CẤM đặt `filter`, `transform`, `perspective`, hoặc `backdrop-filter` lên `html, body`.
2. **Hình ảnh & cách cắt chữ của Logo `#brandLogoImg` (`#headerBrandLogoImg`)** và **Cấu hình miền gửi mail Resend `@mail.castle-tech.cloud`** (`Nexora Mall CSKH <noreply@mail.castle-tech.cloud>`).
3. **18+ tính năng Mèo AI chia 4 nhóm xổ xuống & Chế độ Cất/Gọi Mèo Thập Thò (`[FEAT-CAT-002]` & `[FEAT-CAT-002.1..002.6]`):** Lớp Canvas trên cùng (`z-index: 2147483645`), 5 giống mèo, cằm bo tròn mềm mại không vệt ngang, miệng mèo `(mouthX, mouthY)` khớp 100% với hoạt ảnh Ăn Cá / Uống Trà Sữa, kịch bản săn hàng 4 chặng, 4 thanh Accordion xổ xuống (`▾`), và chế độ `TUCKED_BEHIND_CHAT` (`tuckCatBehindChat()` / `summonCatBackOut()`) nấp sau thanh Chat thò tai/đuôi/mắt/chân măng cụt mỗi 6-9 giây.
4. **Hệ thống 12 giao diện Sáng/Tối, 5 chế độ Trợ năng Mù màu (CVD) & Mèo Báo Màu Di Chuột 2 Giây (`[FEAT-ACC-009]` & `[FEAT-ACC-009.1..009.4]`)** cùng **Giao diện Ví MoMo `Nexora Pay` (`[FEAT-PAY-004]`)**.

Tất cả các thành phần trên là **BẤT KHẢ XÂM PHẠM**. Không một AI nào được phép tự ý xóa, ẩn, rút gọn hoặc thay đổi bố cục khi chưa có lệnh rõ ràng từ người dùng.

### Điều 2 (Quy chuẩn ghi chú 10 Mã Phân Hệ & 45 Mã Tính Năng Con `[FEAT-xxx.y]`):
Khi viết hoặc sửa bất kỳ hàm Python/JS/CSS nào, bắt buộc phải đặt khối comment chuẩn ngay trên đầu hàm/khu vực đó theo định dạng:
`# [FEAT-<PHÂN_HỆ>-<SỐ>.<NHÁNH>] Tên tính năng | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: <API / Bảng SQLite / File UI> | [LOCKED-DESIGN]`

Danh mục **10 Phân Hệ Lớn & 45 Mã Tính Năng Con (`[FEAT-xxx.y]`)**:
1. **`[FEAT-HDR-001]` — Thanh Header 3 Tầng Cố Định & Tiện Ích Đầu Trang (5 mã con):**
   - `[FEAT-HDR-001.1]`: Khóa `position: fixed; top: 0; z-index: 2147483000` cho Header 3 tầng, cấm `filter`/`transform` trên `html, body` & đồng bộ `#nvxHeaderStickySpacer`.
   - `[FEAT-HDR-001.2]`: Menu Dropdown Topbar không điểm mù (`16px` cầu nối trong suốt + `260ms` delay) & Kệ 3 cột Glassmorphism trong suốt (`gap: 32px`).
   - `[FEAT-HDR-001.3]`: Hệ thống Điểm danh 7 ngày liên tiếp (`🔥 + số ngày`) cộng thưởng thật vào SQLite (`+5.000 Xu` $\rightarrow$ `+50.000 Xu` + Lượt quay + Voucher `STREAK7VIP`).
   - `[FEAT-HDR-001.4]`: Khóa nút Điểm danh sau khi đã nhận trong ngày & ẩn 2 nút Test (`⚡ Test +1 Ngày`, `🔄 Reset`) đối với khách thường (chỉ hiện cho Admin/Debug).
   - `[FEAT-HDR-001.5]`: Nút chuyển nhanh Giao diện Sáng/Tối (`☀️/🌙`), Chuông thông báo giảm giá (`🔔`) & Đồng bộ 14 vị trí Icon động (`syncActiveIconSetAcrossWebsite`).
2. **`[FEAT-CAT-002]` — Linh Vật Mèo AI Canvas 2D Lớp Trên Cùng (6 mã con):**
   - `[FEAT-CAT-002.1]`: Khung xương Canvas 2D (`z-index: 2147483645`), 5 giống mèo & đầu bo tròn mềm mại không vạch ngang cằm.
   - `[FEAT-CAT-002.2]`: Khóa tọa độ miệng mèo `(mouthX = headCenterX, mouthY = headCenterY + headRadius * 0.38)` khớp 100% với mẩu cá & ống hút trà sữa.
   - `[FEAT-CAT-002.3]`: Bảng điều khiển Mèo AI gom 4 Nhóm Accordion xổ xuống (`▾`) hiển thị đầy đủ 18+ nút tương tác.
   - `[FEAT-CAT-002.4]`: Kịch bản Mèo AI đi săn hàng khuyến mãi 4 chặng & lưu Wishlist thực tế vào SQLite (`/api/compare/wishlist`).
   - `[FEAT-CAT-002.5]`: Mèo AI trèo leo hô thần chú & tự động bấm nút tìm kiếm khi dùng Giọng nói (`🎙️` Google Voice Search).
   - `[FEAT-CAT-002.6]`: Tính năng **"Cất Mèo Đi / Gọi Mèo Ra"** (`tuckCatBehindChat()`, `summonCatBackOut()`, `TUCKED_BEHIND_CHAT`) — Mèo chạy ra sau thanh Chat góc phải dưới, thò 2 tai vểnh và cứ 6-9 giây lại thập thò đuôi / nửa mặt + mắt tròn / 2 chân măng cụt bám mép.
3. **`[FEAT-AUTH-003]` — Xác Thực Đa Tầng, OTP Resend & Phân Quyền RBAC (5 mã con):**
   - `[FEAT-AUTH-003.1]`: Đăng nhập/Đăng ký Buyer & Seller, Google OAuth 2.0 & trang Auth mặc định Nền Sáng Thanh Lịch (`executive_light`).
   - `[FEAT-AUTH-003.2]`: Xác minh Email OTP 6 số qua Resend (`@mail.castle-tech.cloud`) tự động thưởng **`+20.000 Xu`** vào Ví SQLite (`OTP_VERIFY_BONUS`) & bật cờ `email_verified = 1`.
   - `[FEAT-AUTH-003.3]`: Tự động làm mờ & vô hiệu hóa nút Gửi mã OTP sau khi đã xác minh (`✅ Email Đã Được Xác Minh Bảo Mật`), chỉ mở lại khi bấm `unlockOtpReverification()` để Đổi Mật khẩu / Đổi Mã PIN / Đổi Email.
   - `[FEAT-AUTH-003.4]`: Quy trình Đổi mật khẩu (`SHA-256`) & Thiết lập Mã PIN Ví 6 số có nhật ký kiểm toán `security_audit_logs`.
   - `[FEAT-AUTH-003.5]`: Ma trận phân quyền RBAC 4 cấp (`Guest / Buyer / Seller / Admin`) trên 25 trang & chặn tuyệt đối khách chưa đăng nhập chuyển khoản/nạp rút (`HTTP 401 require_login`).
4. **`[FEAT-PAY-004]` — Ví Điện Tử Nexora Pay, Hóa Đơn QR 2 Bước & Escrow (5 mã con):**
   - `[FEAT-PAY-004.1]`: Giao diện Ví điện tử `Nexora Pay` chuẩn MoMo & đồng bộ số dư thời gian thực giữa Web và Mobile App.
   - `[FEAT-PAY-004.2]`: Tạo đơn hàng QR ở trạng thái chờ `AWAITING_PAYMENT` (cấm tự động duyệt khi chưa bấm xác nhận).
   - `[FEAT-PAY-004.3]`: Màn hình Xem giá & Kiểm tra hóa đơn chi tiết trên `bank.html?pay_token=...` trước khi bấm `✅ Xác Nhận Chuyển Khoản`.
   - `[FEAT-PAY-004.4]`: Chế độ **Chuyển khoản hộ cho bạn bè / người thân** (lưu họ tên người chuyển hộ & lời nhắn).
   - `[FEAT-PAY-004.5]`: Khóa tiền vào Quỹ Bảo Lãnh (`ESCROW_LOCKED`) & phát tín hiệu Realtime (`poll=1`) tự động chuyển màn hình `checkout.html` sang `tracking.html`.
5. **`[FEAT-LOG-005]` — Điều Phối Vận Đơn NX Express 6 Bước & Hoàn Tiền 100% (4 mã con):**
   - `[FEAT-LOG-005.1]`: Chu trình vận đơn 6 bước chuẩn (`AWAITING_PAYMENT` $\rightarrow$ `ESCROW_LOCKED` $\rightarrow$ `SELLER_PACKING` $\rightarrow$ `NVX_IN_TRANSIT` $\rightarrow$ `DELIVERED_INSPECTING` $\rightarrow$ `COMPLETED`).
   - `[FEAT-LOG-005.2]`: Bản đồ Radar Canvas 2D mô phỏng lộ trình giao hàng Hỏa Tốc NX Express 2H.
   - `[FEAT-LOG-005.3]`: Chốt chặn xác nhận Đã nhận hàng & giải ngân bảo lãnh Escrow cho Gian hàng.
   - `[FEAT-LOG-005.4]`: Luồng Trả hàng / Hoàn tiền nguyên tử 100% (`RETURN_REQUESTED` $\rightarrow$ `REFUNDED`) cộng trả tiền vào Ví, hoàn kho `products.stock` & tính tiền phạt trễ SLA.
6. **`[FEAT-MKT-006]` — Sàn Theo Dõi Giá VN-TECH INDEX & Chỉ Báo Định Lượng (4 mã con):**
   - `[FEAT-MKT-006.1]`: Biểu đồ Nến Nhật OHLC 30 phiên vẽ bằng HTML5 Canvas 2D so sánh giá Nexora và Giá Trung Bình Thị Trường VN.
   - `[FEAT-MKT-006.2]`: Bộ 3 chỉ báo định lượng kỹ thuật: Đường trung bình lũy thừa `EMA-7`, Dải `Bollinger Bands (20, 2σ)` và Chỉ số sức mạnh tương đối `RSI-14`.
   - `[FEAT-MKT-006.3]`: Quản lý danh sách Canh giá (`Watchlist Quota`: 05 vật phẩm mặc định, mở rộng lên 08 vật phẩm khi đã xác minh OTP hoặc điểm danh $\ge 3$ ngày).
   - `[FEAT-MKT-006.4]`: Cảnh báo tự động qua Chuông (`🔔`) & huy hiệu `⚡ ĐÃ CHẠM GIÁ MỤC TIÊU` khi giá giảm chạm `target_price`.
7. **`[FEAT-AUC-007]` — Sàn Đấu Giá Kép Thời Gian Thực (2 mã con):**
   - `[FEAT-AUC-007.1]`: Đấu giá truyền thống ký quỹ 10% (`Escrow Deposit`), tự động hoàn cọc 100% cho người bị vượt giá & cơ chế chống cướp phút chót `+30s Anti-Sniping`.
   - `[FEAT-AUC-007.2]`: Đấu giá ngược giảm giá từng giây (`Dutch Flash Auction`) chốt đơn nguyên tử ngay khi người đầu tiên bấm mua.
8. **`[FEAT-RFQ-008]` — Sàn Đấu Thầu Ngược B2B Reverse RFQ & Hộ Chiếu SHA-256 (5 mã con):**
   - `[FEAT-RFQ-008.1]`: Đăng yêu cầu báo giá số lượng lớn (`rfq_requests`) cho 24 Gian hàng Chính hãng Flagship.
   - `[FEAT-RFQ-008.2]`: Gian hàng gửi chào giá cạnh tranh (`rfq_quotes`) kèm cam kết SLA & chiết khấu sỉ.
   - `[FEAT-RFQ-008.3]`: Người mua bấm Chốt báo giá (`/api/rfq/accept-offer`) tự động sinh đơn hàng thật trong bảng `orders` và khóa quỹ Escrow.
   - `[FEAT-RFQ-008.4]`: Hộ chiếu Thiết bị Blockchain (`Device Passport` — `/api/blockchain/device-passport`) băm chuỗi `SHA-256` chống làm giả nguồn gốc & lịch sử bảo hành.
   - `[FEAT-RFQ-008.5]`: Trạm Build PC AI kiểm tra tương thích nguồn/socket & Nông trại Cây Voucher đồng bộ kho Voucher toàn sàn.
9. **`[FEAT-ACC-009]` — Studio 12 Giao Diện, 5 Chế Độ Mù Màu (CVD) & Mèo Báo Màu 2s (4 mã con):**
   - `[FEAT-ACC-009.1]`: Studio 12 Giao Diện Đa Lứa Tuổi (6 Nền Sáng Thanh Lịch mặc định `executive_light` + 6 Nền Tối Chuyên Nghiệp/Lễ Hội) & Chỉnh mật độ lưới (`3, 4, 5, 6 Cột`).
   - `[FEAT-ACC-009.2]`: 5 Chế độ Trợ năng Mù màu (`normal`, `deuteranopia`, `tritanopia`, `pattern_labels`, `high_contrast_aaa`) áp dụng SVG Filter lên `#nvxPageRoot` (hoặc thẻ con, tuyệt đối không gắn `filter` lên `html, body`) kèm Ký hiệu Hình học (`▲`, `▼`, `◆`) trên nến giá và nút.
   - `[FEAT-ACC-009.3]`: Bảng Xem Trước Màu Thực Tế (`openColorblindPreviewModal()`) & Tự động mô tả màu sắc, chất liệu trong Chi tiết Sản phẩm.
   - `[FEAT-ACC-009.4]`: Tính năng **Mèo AI Báo Màu Khi Di Chuột 2 Giây** (`toggleHoverColorInspector()`, mặc định `TẮT` để không làm phiền người bình thường), nút `🎨 Mèo Báo Màu & Ngoại Hình SP Này` (`inspectCurrentProductDetailColors()`) và Nhận diện Ngôn ngữ Tự nhiên (NLP) phân biệt thông minh giữa câu hỏi màu sản phẩm thông thường với câu báo khó khăn thị giác/mù màu (`ENABLE_COLORBLIND_HOVER_ASSIST`).
10. **`[FEAT-ADM-010]` — Trung Tâm Chỉ Huy Admin, 3 Thuật Toán Lõi & Đội Quân 10 Bot QA V12.0 (5 mã con):**
    - `[FEAT-ADM-010.1]`: Trung tâm Quản trị Admin (`admin-center.html`), Studio Đa Bộ Icon 14 Vị Trí & Lá chắn An ninh SOC 25 Lớp.
    - `[FEAT-ADM-010.2]`: Tòa Án Trọng Tài AI (`arbitration-court.html`) phân tích bằng chứng & phán quyết tranh chấp Escrow.
    - `[FEAT-ADM-010.3]`: Thuật toán 1 — Hệ thống Đề xuất Sản phẩm **Hybrid Bayesian Weighted Rating** (`/api/algorithms/bayesian-recommendations`).
    - `[FEAT-ADM-010.4]`: Thuật toán 3 — Radar Chấm điểm Rủi ro Gian lận Thời gian thực **Multi-Signal Fraud Risk Scoring 0-100** (`/api/admin-dispute/fraud-risk-radar`).
    - `[FEAT-ADM-010.5]`: **Đội Quân 10 Bot Kiểm Thử Tự Động Toàn Diện (`QA Bot Squad V12.0 — 10 Bots`)** & Chiến dịch Kiểm toán Săn 100 Bug (`BUG_HUNT_100_REPORT.md` — 100/100 FIXED).

---

Mọi tác nhân AI (4 Argon High / Argon Medium / Flash) khi đọc, phân tích và chỉnh sửa mã nguồn trong thư mục dự án này **BẮT BUỘC** phải tuân thủ tuyệt đối các quy tắc hiến pháp dưới đây. Bất kỳ thay đổi nào vi phạm các quy tắc này đều bị coi là lỗi nghiêm trọng.

---

## ĐIỀU 1: QUY TẮC BẢO TOÀN HỆ THỐNG & CHỐNG HỒI QUY (ZERO-REGRESSION)
1.1. **Cấm xóa bỏ các Route và Tính năng đang hoạt động:**
- Hệ thống hiện tại đã hoàn thiện nền tảng Flask Multi-Blueprint (`app.py`, `core/server.py`, `services/*/api.py`).
- **TUYỆT ĐỐI KHÔNG** xóa hoặc làm hỏng các API hiện có:
  - Xác thực & Google OAuth 2.0: `/api/auth/login`, `/api/auth/register`, `/api/auth/google-config`, `/api/auth/google-login`, `/api/auth/social-login`.
  - Quản trị & SOC 25 Lớp: `/api/admin-dispute/overview`, `/api/admin-dispute/security-center`, `/api/admin-dispute/disputes`, `/api/admin-dispute/data-reset`, `/api/admin-dispute/json-files`.
  - Email OTP & Điểm danh Chuỗi lửa: `/api/settings/test-otp-email`, `/api/settings/email-otp/send`, `/api/settings/email-otp/verify`, `/api/settings/daily-checkin`.
  - Quản lý Đa Bộ Icon & SVG: `/api/settings/icon-sets`, `/api/settings/slot-icon/<slot_key>`, `/api/settings/product-icon-svg`.
1.2. **Chống lỗi trùng lặp Endpoint trong Flask (`AssertionError`):**
- Luôn giữ hàm bọc `_safe_idempotent_add_url_rule` tại đầu tệp `app.py` trước khi gọi `create_app()`.
- Khi nâng cấp một route đã tồn tại trong Blueprint con, hãy ánh xạ qua `app.view_functions` hoặc sửa trực tiếp tại hàm gốc, không khai báo 2 hàm trùng tên trong cùng một tệp.
1.3. **Cấm để sót ký tự đánh dấu bản vá (Patch Markers):**
- Tuyệt đối không bao giờ để sót các dòng `=== PATCH_START ===`, `=== FIND ===`, `=== REPLACE ===`, `<<< CODE`, `>>> END_CODE` trong bất kỳ tệp `.py`, `.js`, `.html`, `.css` nào.

---

## ĐIỀU 2: QUY TẮC JAVASCRIPT CHUẨN OBFUSCATOR-SAFE & AN TOÀN DOM
2.1. **Tương thích 100% với trình làm rối mã (JavaScript Obfuscator):**
- Trong toàn bộ các tệp `.js`, **ưu tiên sử dụng `var` ở cấp hàm** hoặc đặt tên biến hoàn toàn duy nhất trong từng khối lệnh.
- **CẤM** khai báo trùng tên biến `let` hoặc `const` trong các nhánh `if/else`, `switch/case`, `try/catch` cùng cấp để ngăn chặn triệt để lỗi `Uncaught SyntaxError: Identifier '_0x...' has already been declared` sau khi làm rối mã.
2.2. **Gán hàm toàn cục tường minh (`window.*`):**
- Mọi hàm JavaScript được gọi từ thuộc tính sự kiện HTML (`onclick`, `onchange`, `oninput`, `onsubmit`) **BẮT BUỘC** phải được gán ra đối tượng `window` ngay sau khi khai báo (ví dụ: `window.tenHam = tenHam;`).
2.3. **Thao tác chèn DOM an toàn tuyệt đối (Chống lỗi `NotFoundError: insertBefore`):**
- **CẤM** viết `container.insertBefore(newNode, container.querySelector('.row'))` vì `.querySelector()` có thể trả về một phần tử cháu nằm sâu bên trong chứ không phải con trực tiếp của `container`.
- **BẮT BUỘC** chỉ dùng:
  - `if (refNode && refNode.parentNode === container) { container.insertBefore(newNode, refNode); }`
  - Hoặc `if (container.firstElementChild) { container.insertBefore(newNode, container.firstElementChild); } else { container.appendChild(newNode); }`
  - Hoặc `refNode.insertAdjacentElement('beforebegin', newNode);`.

---

## ĐIỀU 3: QUY TẮC XỬ LÝ TRIỆT ĐỂ BUG ICON (BUG1.TXT & BUG2.TXT)
3.1. **Quy tắc lưu thành công 100% cho cả 14 vị trí Icon (Đặc biệt vị trí 4, 5, 8, 11):**
- 14 vị trí icon gồm: `brand_logo` (1), `nav_voucher` (2), `nav_farm` (3), `nav_bank` (4), `nav_ai_cat` (5), `cat_gpu` (6), `cat_cpu` (7), `cat_mainboard` (8), `cat_ram` (9), `cat_keyboard` (10), `cat_headphones` (11), `cat_home_living` (12), `cat_health_care` (13), `cat_fashion` (14).
- Khi Admin lưu icon cho bất kỳ vị trí nào (kể cả vị trí 4, 5, 8, 11) bằng tệp tải lên hoặc link URL:
  - Nếu là chuỗi `image_base64`: Tự động tách bỏ phần đầu `data:image/...;base64,`, tự động bù ký tự `=` nếu chiều dài chuỗi chưa chia hết cho 4 (`len(b64) % 4`), hỗ trợ lưu mọi định dạng `.png`, `.webp`, `.svg`, `.jpg`, `.ico`.
  - Nếu là `image_url` từ bên ngoài: Dùng `urllib.request.Request` với `User-Agent` trình duyệt và `ssl._create_unverified_context()`. Nếu máy chủ bên ngoài chặn tải (`HTTP 403/404`) hoặc ở phía trình duyệt Admin đã tải được ảnh lên thẻ `#slotPreviewImg_<slotKey>`, Frontend tự động trích xuất Base64 từ ảnh Preview (hoặc Backend tự động lưu tệp SVG/PNG đại diện hợp lệ vào `assets/icons/<set_id>/`) để **cam kết 100% thao tác Lưu không bao giờ thất bại**.
3.2. **Quy tắc đồng bộ Icon mới ngay lập tức khi tải lại trang người dùng (F5):**
- Trong `icon_sets_manifest.json`, luôn cập nhật `"updated_at": int(time.time() * 1000)` mỗi khi có bất kỳ thay đổi nào.
- API `/api/settings/icon-sets` phải đính kèm `?v=<updated_at>` vào tất cả các đường dẫn ảnh trả về và đặt HTTP Header `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.
- Trong `core/main.js` (`syncActiveIconSetAcrossWebsite`), **BẮT BUỘC**:
  1. Gọi `/api/settings/icon-sets?_t=` + `Date.now()` để tránh cache trình duyệt.
  2. Ghi đè ngay `localStorage.setItem('nvx_active_brand_icon_url', slots.brand_logo.preview_url)` bằng URL mới nhất từ Server.
  3. Gắn thuộc tính `data-nv-slot="<slot_key>"` cho cả 14 vị trí trên Header, Thanh danh mục và Nút Mèo AI.
  4. Chạy đồng bộ lại ở các mốc `150ms`, `500ms`, `1200ms` (hoặc ngay sau khi `home.js` và `cat_widget.js` render xong DOM) để đảm bảo vị trí 4 (`Bank`), vị trí 5 (`Mèo AI`), vị trí 8 (`Mainboard`), vị trí 11 (`Tai nghe`) và toàn bộ các mục khác luôn hiển thị đúng icon mới ngay khi F5.

---

## ĐIỀU 4: QUY TẮC THANH TOÁN QR 2 BƯỚC (XEM GIÁ -> XÁC NHẬN) & CHUYỂN KHOẢN HỘ
4.1. **Cấm tự động duyệt thanh toán khi người dùng chưa bấm Xác nhận:**
- Khi tạo đơn hàng thanh toán QR tại `checkout.html`, trạng thái ban đầu bắt buộc là `AWAITING_PAYMENT` (Chờ thanh toán).
- Khi người mua (hoặc người chuyển hộ) quét mã QR hoặc mở đường dẫn xác nhận trên `bank.html?pay_token=...`, hệ thống **BẮT BUỘC** hiển thị **Màn Hình Xem Giá & Kiểm Tra Hóa Đơn Chi Tiết** gồm:
  - Mã đơn hàng (`#NVD-xxxx`), Tên người đặt mua, Danh sách sản phẩm, Số tiền cần thanh toán.
  - Công tắc chọn: **"Tôi tự thanh toán"** hoặc **"Chuyển khoản hộ cho bạn bè / người thân"** (kèm ô nhập *Họ tên người chuyển hộ* và *Lời nhắn*).
  - Nút bấm quyết định: **`✅ Xác Nhận Chuyển Khoản Số Tiền Này`** và **`❌ Hủy / Từ Chối`**.
- Chỉ sau khi nút **`✅ Xác Nhận Chuyển Khoản Số Tiền Này`** được bấm, Backend mới trừ số dư, khóa tiền vào Quỹ Bảo Lãnh (`ESCROW_LOCKED`), lưu tên người chuyển hộ và phát tín hiệu Realtime để màn hình `checkout.html` tự động chuyển sang trang Theo dõi vận đơn (`tracking.html`).

---

## ĐIỀU 5: QUY TẮC VẬN ĐƠN NVX EXPRESS & LUỒNG HOÀN ĐƠN - HOÀN TIỀN KHÉP KÍN
5.1. **Chuẩn hóa ngôn ngữ Logistics chuyên nghiệp (Cấm dùng văn phong dịch máy kiểu Shopee):**
- Sử dụng đúng 6 chặng trạng thái chuẩn của **NVX Smart Logistics & Escrow**:
  1. `AWAITING_PAYMENT`: Chờ xác nhận thanh toán QR / Chuyển khoản hộ.
  2. `ESCROW_LOCKED`: Đã thanh toán — Quỹ Bảo Lãnh Escrow đã khóa tiền bảo vệ người mua 100%.
  3. `SELLER_PACKING`: Gian hàng chính hãng xuất kho, đóng gói chống sốc & dán tem QR bảo hành SOP-01.
  4. `NVX_IN_TRANSIT`: Đang vận chuyển Hỏa Tốc NVX 2H (kèm Bản đồ Radar Canvas trực quan).
  5. `DELIVERED_INSPECTING`: Đã giao hàng — Khách hàng đang trong thời gian Đồng kiểm 24h.
  6. `COMPLETED` (Đã hoàn tất & Giải ngân cho Shop) hoặc `RETURN_REQUESTED` $\rightarrow$ `REFUNDED` (Đã thu hồi hàng & Hoàn tiền 100% về Ví NVIDIA Pay của khách).
5.2. **Tính toàn vẹn khi Hoàn đơn:**
- Khi đơn hàng chuyển sang `REFUNDED`, hệ thống phải thực thi nguyên tử trong SQLite: Cộng trả 100% số tiền đơn hàng vào `users.coins` và `user_bank_wallets.balance` của người mua, cộng trả lại số lượng tồn kho (`products.stock`) và ghi nhật ký giao dịch hoàn tiền rõ ràng.

---

## ĐIỀU 6: QUY TẮC CHO SÀN BIỂU ĐỒ GIÁ CHỨNG KHOÁN & THEO DÕI GIÁ (PRICE TRACKER)
6.1. **Mọi người dùng (Khách vãng lai, Người mua, Người bán) đều truy cập được:**
- Sàn Theo Dõi Giá Thị Trường Công Nghệ Việt Nam phải cho phép tất cả mọi người vào xem biểu đồ nến/đường như chứng khoán, so sánh giá sàn Nivida với Giá Trung Bình Thị Trường Việt Nam và xem tín hiệu Mua/Chờ.
6.2. **Giới hạn số lượng vật phẩm theo dõi (Watchlist Quota) & Cảnh báo tự động:**
- Mỗi tài khoản mặc định được gắn theo dõi tối đa **05 vật phẩm cùng lúc** (tránh spam; nếu đã xác minh OTP hoặc chuỗi điểm danh $\ge 3$ ngày được mở rộng lên **08 vật phẩm**).
- Khi người dùng đặt mức **Giá Mục Tiêu (`target_price`)**, bất kỳ khi nào giá sản phẩm giảm chạm hoặc thấp hơn `target_price` (do Gian hàng giảm giá, Sự kiện bật, hoặc biến động thị trường), hệ thống phải tự động bật thông báo Chuông (`🔔`), hiển thị huy hiệu **`⚡ ĐÃ CHẠM GIÁ MỤC TIÊU`** và cho phép chốt mua ngay.

## ĐIỀU 6B: QUY TẮC THƯƠNG HIỆU NEXORA, 12 GIAO DIỆN NỀN SÁNG MẶC ĐỊNH, HEADER TINH GỌN & TRỢ LÝ MÈO AI
6B.1. **Đổi tên thương hiệu hiển thị sang NEXORA (Chống khóa Resend):**
- Toàn bộ tên hiển thị trên UI, tiêu đề trang, Footer, Chatbot và mẫu Email OTP phải dùng thương hiệu **NEXORA** (`Nexora Mall — Sàn Thương Mại Công Nghệ & Đời Sống`, Ví `Nexora Pay`, Vận đơn `NX Express`, máy chủ `nexora.castle-tech.cloud`, Email gửi mặc định đã xác thực: `Nexora Mall CSKH <noreply@mail.castle-tech.cloud>`). Tuyệt đối không đưa mã OTP ra tiêu đề (`Subject`) của Email.
- Tuyệt đối không dùng chữ `NVIDIA Store` hay `Nivida` trong nội dung Email gửi qua Resend; giữ nguyên tên các biến kỹ thuật nội bộ (`localStorage` keys, tên bảng/file DB) để đảm bảo tương thích ngược 100%.
6B.2. **Xử lý dứt điểm lỗi "Ô vuông xanh lá" & Cấm để lại dữ liệu rác sau khi chạy Auto-Test:**
- Xóa toàn bộ tệp ảnh test màu xanh lá trong `assets/icons/default/`, `set_1/`, `set_2/`, `set_3/` và đặt `icon_sets_manifest.json` về `"active_set": "default"` với `"slots": {}` sạch sẽ.
- Trong `app.py` (`serve_product_representative_svg_icon`): Luôn vẽ hình minh họa Vector SVG chi tiết theo đúng chủng loại sản phẩm (GPU, CPU, Mainboard, RAM/SSD, Phím Chuột, Tai nghe...), KHÔNG lấy icon nhỏ của thanh menu đè lên ảnh lớn của thẻ sản phẩm.
- Trong `core/main.js` (`_applySlotIconToElement`): Khóa chặt CSS của `.nvx-dynamic-slot-icon` với `width: 18px !important; height: 18px !important; max-width: 18px !important; max-height: 18px !important; object-fit: contain !important; display: inline-block !important;`.
- Khi script Auto-Test kiểm thử tính năng lưu Icon (`/api/settings/icon-sets`), sau khi assert xong BẮT BUỘC phải khôi phục `icon_sets_manifest.json` nguyên vẹn và xóa tệp ảnh test.
6B.3. **Tái cấu trúc Header tinh gọn, chuyển Game Esport sang Minigame & Chỉnh Mật Độ Lưới:**
- Chuyển **Đấu Trường Phản Xạ Tâm Ngắm Esport 30s (Aim Reflex Arena)** từ `auction.html` sang `services/minigame/minigame.html` & `minigame.js` (cạnh Vòng Quay May Mắn).
- Gom nhóm Header Topbar trong `core/main.js` thành các cụm/Dropdown: `🏪 Kênh Người Bán`, `📈 Sàn Giao Dịch ▾`, `🎮 Giải Trí & Săn Thưởng ▾`, `🛠️ Tiện Ích ▾`, `🏦 Nexora Pay`, và chỉ để lại 1 nút nhỏ gọn `🎨 Giao Diện & Cài Đặt` dẫn tới `/services/settings/settings.html`.
- Bổ sung công cụ **Chỉnh Mật Độ Hiển Thị Lưới Sản Phẩm (Grid Density Control)** (`3 Cột`, `4 Cột`, `5 Cột`, `6 Cột`, `Danh sách ngang`) ở cả Thanh công cụ Trang Chủ (`index.html`) và Trang Cài Đặt (`settings.html`).
6B.4. **Mặc định Nền Sáng Thanh Lịch (`executive_light` - Executive Pearl Light) & 12 Giao Diện Đa Lứa Tuổi:**
- Khi người dùng mới vào web (chưa có cấu hình trong `localStorage`), giao diện BẮT BUỘC mở ở chế độ **Nền Sáng Thanh Lịch (`executive_light`)** — tông trắng sứ `#f8fafc`, thẻ trắng `#ffffff`, viền `#e2e8f0`, chữ xám than `#0f172a`, điểm nhấn xanh lục bảo `#059669` & xanh navy `#1e3a8a`.
- Quản lý đủ **12 Giao Diện Đa Lứa Tuổi** (6 giao diện Nghiêm túc Nền Sáng: `executive_light`, `swiss_finance`, `apple_cupertino`, `muji_warm_paper`, `nordic_snow`, `oxford_academic`; 6 giao diện Chuyên nghiệp/Lễ hội Nền Tối: `bloomberg_terminal`, `obsidian_luxury`, `emerald_tech`, `ocean_breeze`, `kyoto_autumn`, `tet_festival`) kèm nút bật/tắt hiệu ứng nền động.
- Trang Đăng nhập / Đăng ký (`auth.html`, `seller-auth.html`) mặc định ở Nền Sáng Thanh Lịch và tự động hiển thị bộ minh họa Vector sáng/tối tương ứng.
6B.5. **Hoạt ảnh Mèo AI trèo leo hô thần chú, Điều khiển qua Prompt & Voice Search tự bấm nút:**
- Nhân vật Mèo AI trong `core/cat_widget.js` có khả năng trèo/di chuyển tới vị trí mục tiêu trên màn hình, hiện bong bóng `"✨ Hô thần chú: ..."` và thực thi lệnh thật (Đổi giao diện/mật độ lưới, Tìm kiếm sản phẩm và tự bấm `#searchBtn`, Đặt mua/Thêm giỏ hàng/Điều hướng).
- Khi tìm kiếm bằng giọng nói (`🎙️` Google Voice Search), Mèo AI xuất hiện cạnh thanh tìm kiếm, xác nhận từ khóa vừa nói, chạm chân bấm nút `🔍 Tìm Kiếm` và cuộn mượt xuống kết quả.

---

## ĐIỀU 7: QUY TẮC CƠ SỞ DỮ LIỆU SQLITE & HIỆU NĂNG CANVAS
- Mọi bảng mới (`auctions`, `auction_bids`, `product_price_history`, `user_price_watches`, `rfq_requests`, `rfq_quotes`) phải dùng `CREATE TABLE IF NOT EXISTS` và tự động nạp dữ liệu mẫu (Seed Data) phong phú ngay khi khởi động nếu bảng đang trống.
- Mọi biểu đồ (4 Biểu đồ Admin, Biểu đồ Nến Chứng Khoán Giá Công Nghệ, Radar Vận Đơn) đều vẽ bằng **HTML5 Canvas 2D thuần** sắc nét, tương thích cả giao diện Sáng (`Minimalist Daylight`) và Tối (`Dark Mode`).

---

## ĐIỀU 8: QUY TẮC KIỂM TRA TRƯỚC & SAU KHI SỬA CODE
- Không bao giờ sửa mù quáng: Luôn đọc kỹ đoạn code xung quanh vị trí cần sửa.
- Sau mỗi giai đoạn, phải chạy kiểm tra cú pháp Python (`python -m py_compile app.py`) và chạy Đội Bot QA (`/api/settings/qa-bot-audit`) để đảm bảo 100% trang và API đạt `HTTP 200 OK` (0 lỗi).
