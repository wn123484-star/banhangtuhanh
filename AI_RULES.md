# HIẾN PHÁP KỸ THUẬT & QUY TẮC BẮT BUỘC CHO AI (AI ENGINEERING CONSTITUTION)
**Dự án:** Sàn Thương Mại Điện Tử Công Nghệ & Đời Sống — **Nvidia Store V9.0**

Mọi tác nhân AI (4 Argon High / Argon Medium / Flash) khi đọc, phân tích và chỉnh sửa mã nguồn trong thư mục dự án này **BẮT BUỘC** phải tuân thủ tuyệt đối 8 nhóm quy tắc hiến pháp dưới đây. Bất kỳ thay đổi nào vi phạm các quy tắc này đều bị coi là lỗi nghiêm trọng.

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

---

## ĐIỀU 7: QUY TẮC CƠ SỞ DỮ LIỆU SQLITE & HIỆU NĂNG CANVAS
- Mọi bảng mới (`auctions`, `auction_bids`, `product_price_history`, `user_price_watches`, `rfq_requests`, `rfq_quotes`) phải dùng `CREATE TABLE IF NOT EXISTS` và tự động nạp dữ liệu mẫu (Seed Data) phong phú ngay khi khởi động nếu bảng đang trống.
- Mọi biểu đồ (4 Biểu đồ Admin, Biểu đồ Nến Chứng Khoán Giá Công Nghệ, Radar Vận Đơn) đều vẽ bằng **HTML5 Canvas 2D thuần** sắc nét, tương thích cả giao diện Sáng (`Minimalist Daylight`) và Tối (`Dark Mode`).

---

## ĐIỀU 8: QUY TẮC KIỂM TRA TRƯỚC & SAU KHI SỬA CODE
- Không bao giờ sửa mù quáng: Luôn đọc kỹ đoạn code xung quanh vị trí cần sửa.
- Sau mỗi giai đoạn, phải chạy kiểm tra cú pháp Python (`python -m py_compile app.py`) và chạy Đội Bot QA (`/api/settings/qa-bot-audit`) để đảm bảo 100% trang và API đạt `HTTP 200 OK` (0 lỗi).
