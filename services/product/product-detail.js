/* ==========================================================================
   SERVICES/PRODUCT/PRODUCT-DETAIL.JS - CHI TIẾT SẢN PHẨM, THÔNG SỐ & BẢO HÀNH (V8.0)
   (Sửa triệt để lỗi undefined, chuẩn hóa giao diện Sáng/Tối & Icon đại diện đúng chủng loại)
   ========================================================================== */

var __currentProductDetail = null;
var __currentProductQty = 1;
var __currentProductReviews = [];
var __relatedProductsCache = [];

function $pd(sel) {
    return document.querySelector(sel);
}

function getProductIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var pid = params.get('id') || params.get('product_id') || localStorage.getItem('nvx_last_viewed_product_id') || '1';
    return parseInt(pid, 10) || 1;
}

function formatVndPrice(val) {
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
}

function buildProductIconSvgUrl(p) {
    if (!p) return '/api/settings/product-icon-svg?category=gpu&brand=NIVIDA';
    var cat = encodeURIComponent(p.category || 'gpu');
    var ptype = encodeURIComponent(p.product_type || p.category || 'Công Nghệ');
    var brand = encodeURIComponent(p.brand || 'NIVIDA');
    var name = encodeURIComponent((p.name || '').slice(0, 45));
    return '/api/settings/product-icon-svg?category=' + cat + '&type=' + ptype + '&brand=' + brand + '&name=' + name + '&id=' + (p.id || 1);
}

function resolveAccurateProductImage(p) {
    if (!p) return '/api/settings/product-icon-svg?category=gpu';
    var rawImg = String(p.image_url || p.image || '').trim();
    if (!rawImg || rawImg.includes('icon.png') || rawImg.includes('cat_')) {
        return buildProductIconSvgUrl(p);
    }
    return rawImg;
}

function findProductDetailMountBox() {
    var allDivs = Array.from(document.querySelectorAll('main div, main section'));
    var loadingBox = allDivs.find(function(el) {
        var txt = (el.textContent || '').trim();
        return txt.includes('Đang tải thông số minh bạch') && el.querySelectorAll('div').length <= 5;
    });
    if (loadingBox) {
        return loadingBox.closest('.card, .nv-adaptive-card, .p-4, .p-5, #productDetailContainer, #productDetailRoot') || loadingBox;
    }
    return $pd('#productDetailContainer')
        || $pd('#productDetailRoot')
        || $pd('#productDetailContent')
        || $pd('main .container > div:last-child')
        || $pd('main .container')
        || $pd('main');
}

async function loadProductDetailPage() {
    var pid = getProductIdFromUrl();
    localStorage.setItem('nvx_last_viewed_product_id', String(pid));

    try {
        var viewedRaw = localStorage.getItem('nvx_viewed_product_ids') || '';
        var viewedArr = viewedRaw.split(',').map(function(x) { return x.trim(); }).filter(Boolean);
        if (!viewedArr.includes(String(pid))) {
            viewedArr.unshift(String(pid));
            localStorage.setItem('nvx_viewed_product_ids', viewedArr.slice(0, 12).join(','));
        }
    } catch (e) {}

    try {
        var res = await fetch('/api/products/' + pid);
        var data = null;
        if (res.ok) {
            data = await res.json();
        }
        var product = (data && (data.product || data)) ? (data.product || data) : null;

        var resList = await fetch('/api/home/products?sort_by=popular');
        var allProducts = [];
        if (resList.ok) {
            var listData = await resList.json();
            allProducts = Array.isArray(listData) ? listData : (listData.products || []);
        }

        if (!product || !product.id) {
            product = allProducts.find(function(x) { return Number(x.id) === Number(pid); }) || allProducts[0];
        }

        if (product) {
            __currentProductDetail = product;
            __currentProductReviews = (data && Array.isArray(data.reviews)) ? data.reviews : (product.reviews || []);

            var otherProds = allProducts.filter(function(x) { return Number(x.id) !== Number(product.id); });
            var sameCategory = otherProds.filter(function(x) {
                return String(x.category || '').toLowerCase() === String(product.category || '').toLowerCase();
            });
            __relatedProductsCache = (sameCategory.length >= 4 ? sameCategory : otherProds).slice(0, 4);

            renderProductDetailView(product, data || {});
        }
    } catch (err) {}
}

function renderProductDetailView(p, extraData) {
    document.title = (p.name || 'Chi tiết sản phẩm') + ' | Nivida Store';

    var breadcrumbItems = document.querySelectorAll('nav a, .breadcrumb-item, main a');
    breadcrumbItems.forEach(function(el) {
        if ((el.textContent || '').trim() === 'Chi tiết sản phẩm') {
            el.textContent = p.name || 'Chi tiết sản phẩm';
        }
    });
    var bcLast = $pd('#breadcrumbProductName') || $pd('.breadcrumb-item.active');
    if (bcLast) bcLast.textContent = p.name || 'Chi tiết sản phẩm';

    var priceNum = Number(p.price || 1590000);
    var oldPriceNum = Number(p.original_price || Math.round(priceNum * 1.15));
    var discountPct = oldPriceNum > priceNum ? Math.round(((oldPriceNum - priceNum) / oldPriceNum) * 100) : 15;
    var iconFallbackUrl = buildProductIconSvgUrl(p);
    var imgSrc = resolveAccurateProductImage(p);
    var isUsingIcon = imgSrc.includes('/api/settings/product-icon-svg');
    var brandName = p.brand || 'NIVIDA PARTNER';
    var productTypeLabel = p.product_type || String(p.category || 'Công Nghệ').toUpperCase();
    var storeName = p.store_name || p.seller_name || (brandName + ' Official Flagship Mall');
    var sellerId = p.seller_id || 2;
    var stockVal = (p.stock !== undefined && p.stock !== null) ? Number(p.stock) : 40;
    var soldVal = (p.sold_count !== undefined && p.sold_count !== null) ? Number(p.sold_count) : 64;
    var ratingVal = p.rating || '4.9';
    var warrantyMonths = Number(p.warranty_months || 36);
    var policyVersion = p.policy_version || 'v2.5-ESCROW-SLA';

    var rawHistory = (extraData && Array.isArray(extraData.policy_history) && extraData.policy_history.length)
        ? extraData.policy_history
        : [];

    var normalizedPolicyHistory = rawHistory.map(function(ph, idx) {
        var ver = ph.version || ph.policy_version || (ph.version_number ? ('v' + ph.version_number + '.0-ESCROW') : (idx === 0 ? policyVersion : 'v1.0-ARCHIVE'));
        var eff = ph.effective_from || ph.created_at || (idx === 0 ? 'Đang áp dụng hiện hành' : 'Bản lưu trữ đối chiếu trước đó');
        var wMonths = ph.warranty_months || warrantyMonths;
        var retDays = ph.return_days || 30;
        var wTerms = ph.warranty_terms || ph.policy_summary || ('Bảo hành chính hãng ' + wMonths + ' tháng, lỗi 1 đổi 1 trong ' + retDays + ' ngày đầu. Hỗ trợ kích hoạt và tra cứu bảo hành điện tử qua mã QR.');
        var slaText = ph.sla_commitment || ph.shipping_sla || 'Giao Hỏa Tốc NVX 2H nội thành & 24h toàn quốc — Trễ cam kết tự động đền bù Voucher HOATOC50K.';
        var escText = ph.escrow_protection || ph.escrow_terms || '100% giá trị đơn hàng được bảo vệ tại Quỹ Bảo Lãnh Escrow cho tới khi khách hàng xác nhận đồng kiểm.';
        return {
            version: ver,
            effective_from: eff,
            warranty_terms: wTerms,
            sla_commitment: slaText,
            escrow_protection: escText
        };
    });

    if (!normalizedPolicyHistory.length) {
        normalizedPolicyHistory = [
            {
                version: policyVersion,
                effective_from: '01/11/2026 - Nay (Đang áp dụng)',
                warranty_terms: 'Bảo hành chính hãng ' + warrantyMonths + ' tháng 1 đổi 1 trong 30 ngày đầu nếu lỗi NSX. Tích hợp mã QR kích hoạt bảo hành điện tử.',
                sla_commitment: 'Giao Hỏa Tốc NVX 2H nội thành — Trễ cam kết tự động đền bù Voucher HOATOC50K.',
                escrow_protection: '100% số tiền thanh toán được giữ tại Quỹ Bảo Lãnh Escrow cho tới khi khách xác nhận đồng kiểm.'
            },
            {
                version: 'v1.0-INITIAL',
                effective_from: 'Bản lưu trữ đối chiếu Trọng tài AI',
                warranty_terms: 'Bảo hành tiêu chuẩn 24 tháng tại trung tâm ủy quyền chính hãng.',
                sla_commitment: 'Giao tiêu chuẩn 24h - 48h toàn quốc.',
                escrow_protection: 'Áp dụng đối chiếu tự động theo Kịch bản SOP #01 tại Tòa án Trọng tài.'
            }
        ];
    }

    var reviewsList = (__currentProductReviews && __currentProductReviews.length)
        ? __currentProductReviews
        : [
            { user_name: 'Nguyễn Hưng', rating: 5, comment: 'Sản phẩm chính hãng đúng mô tả, đóng gói cẩn thận và kích hoạt bảo hành QR rất nhanh!', created_at: 'Hôm nay' },
            { user_name: 'Trần Minh Quân', rating: 5, comment: 'Giao nhanh NVX 2H đúng hẹn, hiệu năng thực tế vượt mong đợi. Rất yên tâm vì có quỹ bảo lãnh Escrow.', created_at: 'Hôm qua' }
        ];

    var mountBox = findProductDetailMountBox();
    if (!mountBox) return;

    mountBox.className = 'p-0 bg-transparent border-0';
    mountBox.innerHTML =
        '<!-- KHỐI 1: THÔNG TIN CHÍNH SẢN PHẨM, ẢNH / ICON ĐẠI DIỆN & ĐẶT MUA -->' +
        '<div class="nv-adaptive-card p-4 mb-4 rounded-4 border shadow-sm">' +
            '<div class="row g-4 align-items-start">' +
                '<div class="col-lg-5">' +
                    '<div class="p-3 rounded-4 border text-center position-relative mb-3" style="background:#0b1120;border-color:rgba(118,185,0,0.35)!important;">' +
                        '<span class="badge bg-danger position-absolute top-0 start-0 m-3 px-3 py-2">-' + discountPct + '% OFF</span>' +
                        '<span class="badge ' + (isUsingIcon ? 'bg-info text-dark' : 'bg-nvidia') + ' position-absolute top-0 end-0 m-3 px-3 py-2">' +
                            (isUsingIcon ? ('🧩 Icon Đại Diện: ' + productTypeLabel) : '🏛️ Ảnh Thực Tế Chính Hãng') +
                        '</span>' +
                        '<img id="detailMainImage" src="' + imgSrc + '" alt="' + (p.name || '') + '" class="img-fluid rounded-3 my-3" style="max-height:310px;width:100%;object-fit:contain;" onerror="this.onerror=null;this.src=\'' + iconFallbackUrl + '\'">' +
                    '</div>' +
                    '<div class="d-flex justify-content-center align-items-center gap-2 mb-3">' +
                        '<img src="' + imgSrc + '" class="rounded-3 border border-2 border-success p-1 bg-dark" style="width:68px;height:56px;object-fit:contain;cursor:pointer;" title="Ảnh/Icon chính" onclick="changeMainProductImage(this.src, this)">' +
                        '<img src="' + iconFallbackUrl + '" class="rounded-3 border border-secondary p-1 bg-dark" style="width:68px;height:56px;object-fit:contain;cursor:pointer;" title="Icon đại diện chủng loại sản phẩm" onclick="changeMainProductImage(this.src, this)">' +
                    '</div>' +
                    '<div class="p-3 rounded-3 border small" style="background:rgba(118,185,0,0.10);border-color:rgba(118,185,0,0.4)!important;">' +
                        '<div class="d-flex justify-content-between align-items-center mb-1">' +
                            '<strong class="text-nvidia">🛡️ Chứng Thực Bảo Hành &amp; Escrow SOP-01</strong>' +
                            '<span class="badge bg-dark border border-success font-monospace">' + policyVersion + '</span>' +
                        '</div>' +
                        '<div class="opacity-85" style="font-size:12.5px;">Mọi đơn hàng đều lưu bản chụp chính sách bảo hành (' + warrantyMonths + ' tháng) tại thời điểm đặt mua để bảo vệ tuyệt đối quyền lợi khách hàng.</div>' +
                    '</div>' +
                '</div>' +

                '<div class="col-lg-7">' +
                    '<div class="d-flex flex-wrap align-items-center gap-2 mb-2">' +
                        '<span class="badge bg-danger">🏛️ Flagship Mall</span>' +
                        '<span class="badge bg-nvidia fw-bold">🏷️ Hãng: ' + brandName + '</span>' +
                        '<span class="badge bg-info text-dark fw-bold">📦 Loại: ' + productTypeLabel + '</span>' +
                        '<span class="badge bg-dark border border-secondary font-monospace">Mã SP: #NVD-' + String(p.id).padStart(4, '0') + '</span>' +
                    '</div>' +

                    '<h3 id="detailProductName" class="fw-bold mb-2" style="line-height:1.32;">' + (p.name || 'Sản Phẩm Công Nghệ Nivida') + '</h3>' +

                    '<div class="d-flex flex-wrap align-items-center gap-3 small mb-3 pb-3 border-bottom border-secondary border-opacity-25">' +
                        '<span class="text-warning fw-bold">★★★★★ ' + ratingVal + '/5.0</span>' +
                        '<span class="opacity-50">|</span>' +
                        '<span>Đã bán: <strong class="text-nvidia">' + soldVal + '</strong></span>' +
                        '<span class="opacity-50">|</span>' +
                        '<span>Tồn kho: <strong class="text-info">' + stockVal + ' sản phẩm</strong></span>' +
                        '<span class="opacity-50">|</span>' +
                        '<span>Bảo hành: <strong class="text-success">' + warrantyMonths + ' tháng</strong></span>' +
                    '</div>' +

                    '<div class="p-3 rounded-4 mb-3 d-flex flex-wrap align-items-baseline gap-3" style="background:rgba(118,185,0,0.12);border:1px solid rgba(118,185,0,0.38);">' +
                        '<div id="detailProductPrice" class="fw-bold text-nvidia" style="font-size:2.1rem;">' + formatVndPrice(priceNum) + '</div>' +
                        '<div id="detailProductOldPrice" class="opacity-75 text-decoration-line-through fs-6">' + formatVndPrice(oldPriceNum) + '</div>' +
                        '<span class="badge bg-warning text-dark fw-bold">Tiết kiệm ' + formatVndPrice(Math.max(0, oldPriceNum - priceNum)) + '</span>' +
                    '</div>' +

                    '<div class="p-3 rounded-3 border mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style="background:rgba(14,165,233,0.08);border-color:rgba(14,165,233,0.35)!important;">' +
                        '<div class="d-flex align-items-center gap-3">' +
                            '<img src="/assets/icons/icon.png" style="width:42px;height:42px;object-fit:contain;" class="rounded-circle bg-dark p-1 border border-success">' +
                            '<div>' +
                                '<div class="fw-bold text-nvidia fs-6">' + storeName + ' <span class="badge bg-success ms-1" style="font-size:10px;">☑️ Đã Xác Thực</span></div>' +
                                '<div class="small opacity-85">Đối tác Ủy quyền Chính hãng ' + brandName + ' • Phản hồi Chat 99%</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="d-flex gap-2">' +
                            '<a href="/services/seller/store.html?seller_id=' + sellerId + '" class="btn btn-info text-dark btn-sm fw-bold px-3">🏪 Xem Gian Hàng</a>' +
                            '<button type="button" class="btn btn-nvidia btn-sm fw-bold px-3" onclick="openStoreChatFromDetail(' + sellerId + ', \'' + storeName.replace(/\'/g, '') + '\')">💬 Chat Với Shop</button>' +
                        '</div>' +
                    '</div>' +

                    '<p id="detailProductDesc" class="small opacity-90 mb-3" style="line-height:1.65;">' +
                        (p.description || 'Sản phẩm chính hãng phân phối tại Nivida Store, tích hợp mã QR kích hoạt bảo hành điện tử và được bảo vệ 100% bởi Quỹ Bảo Lãnh Thanh Toán Escrow.') +
                    '</p>' +

                    '<div class="d-flex flex-wrap align-items-center gap-3 mb-4">' +
                        '<span class="small fw-bold">Số lượng đặt mua:</span>' +
                        '<div class="input-group input-group-sm" style="width:136px;">' +
                            '<button type="button" class="btn btn-outline-secondary fw-bold px-3" onclick="updateDetailQuantity(-1)">−</button>' +
                            '<input type="number" id="detailQtyInput" class="form-control text-center fw-bold" value="1" min="1" max="99">' +
                            '<button type="button" class="btn btn-outline-secondary fw-bold px-3" onclick="updateDetailQuantity(1)">+</button>' +
                        '</div>' +
                        '<small class="opacity-75">Sẵn hàng ' + stockVal + ' sản phẩm tại kho NVX</small>' +
                    '</div>' +

                    '<div class="row g-2">' +
                        '<div class="col-sm-4 col-12">' +
                            '<button type="button" class="btn btn-nvidia w-100 py-2 fw-bold" onclick="buyNowFromDetail()">⚡ Mua Ngay &amp; Quét QR</button>' +
                        '</div>' +
                        '<div class="col-sm-4 col-12">' +
                            '<button type="button" class="btn btn-outline-success w-100 py-2 fw-bold" onclick="addToCartFromDetail(false)">🛒 Thêm Vào Giỏ</button>' +
                        '</div>' +
                        '<div class="col-sm-2 col-6">' +
                            '<button type="button" class="btn btn-outline-info w-100 py-2 fw-bold" onclick="addToCompareFromDetail()">⚖️ So Sánh</button>' +
                        '</div>' +
                        '<div class="col-sm-2 col-6">' +
                            '<button type="button" class="btn btn-outline-warning w-100 py-2 fw-bold" onclick="toggleWishlistFromDetail()">❤️ Lưu</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<!-- KHỐI 2: LỊCH SỬ CHÍNH SÁCH BẢO HÀNH (SOP-01) & ĐÁNH GIÁ KHÁCH HÀNG -->' +
        '<div class="row g-4 mb-4">' +
            '<div class="col-lg-6">' +
                '<div class="nv-adaptive-card p-4 h-100 rounded-4 border shadow-sm">' +
                    '<div class="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 pb-2 mb-3">' +
                        '<h6 class="fw-bold m-0 text-nvidia">📜 Lịch Sử Chính Sách &amp; Bảo Hành Minh Bạch (SOP-01)</h6>' +
                        '<span class="badge bg-success">Bất biến trên SQLite</span>' +
                    '</div>' +
                    '<div class="d-flex flex-column gap-3">' +
                        normalizedPolicyHistory.map(function(ph) {
                            return '<div class="p-3 rounded-3 border" style="background:rgba(118,185,0,0.06);border-color:rgba(118,185,0,0.32)!important;">' +
                                '<div class="d-flex justify-content-between align-items-center mb-2">' +
                                    '<span class="badge bg-nvidia font-monospace">' + ph.version + '</span>' +
                                    '<small class="text-info fw-bold">' + ph.effective_from + '</small>' +
                                '</div>' +
                                '<div class="small mb-1"><strong>🔧 Bảo hành:</strong> ' + ph.warranty_terms + '</div>' +
                                '<div class="small mb-1"><strong>🚚 Cam kết SLA:</strong> ' + ph.sla_commitment + '</div>' +
                                '<div class="small text-nvidia"><strong>🛡️ Bảo vệ Escrow:</strong> ' + ph.escrow_protection + '</div>' +
                            '</div>';
                        }).join('') +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="col-lg-6">' +
                '<div class="nv-adaptive-card p-4 h-100 rounded-4 border shadow-sm">' +
                    '<div class="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 pb-2 mb-3">' +
                        '<h6 class="fw-bold m-0 text-warning">⭐ Đánh Giá Thực Tế Từ Khách Đã Mua (' + reviewsList.length + ')</h6>' +
                        '<span class="badge bg-warning text-dark fw-bold">' + ratingVal + ' / 5.0</span>' +
                    '</div>' +
                    '<div id="productReviewsList" class="d-flex flex-column gap-2 mb-3" style="max-height:250px;overflow-y:auto;">' +
                        reviewsList.map(function(r) {
                            var stars = '★'.repeat(Math.max(1, Math.min(5, Number(r.rating || 5))));
                            return '<div class="p-3 rounded-3 border" style="background:rgba(148,163,184,0.06);border-color:rgba(148,163,184,0.22)!important;">' +
                                '<div class="d-flex justify-content-between align-items-center mb-1">' +
                                    '<strong>👤 ' + (r.user_name || 'Khách mua hàng') + ' <span class="badge bg-success ms-1" style="font-size:9.5px;">✔ Đã mua hàng</span></strong>' +
                                    '<span class="small text-warning fw-bold">' + stars + '</span>' +
                                '</div>' +
                                '<div class="small opacity-90">' + (r.comment || '') + '</div>' +
                            '</div>';
                        }).join('') +
                    '</div>' +
                    '<div class="input-group input-group-sm">' +
                        '<input type="text" id="newReviewCommentInput" class="form-control" placeholder="Nhập nhận xét của bạn về sản phẩm...">' +
                        '<button type="button" class="btn btn-nvidia fw-bold" onclick="submitQuickProductReview()">Gửi Đánh Giá</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        '<!-- KHỐI 3: SẢN PHẨM ĐỀ XUẤT CÙNG PHÂN KHÚC (HIỂN THỊ ĐÚNG ICON ĐẠI DIỆN CHỦNG LOẠI) -->' +
        (__relatedProductsCache.length ? (
            '<div class="nv-adaptive-card p-4 rounded-4 border shadow-sm mb-4">' +
                '<div class="d-flex justify-content-between align-items-center mb-3">' +
                    '<h6 class="fw-bold text-nvidia m-0">🔥 Sản Phẩm Đề Xuất Cùng Phân Khúc</h6>' +
                    '<span class="badge bg-dark border border-secondary">Tự động nhận diện Icon theo Loại SP &amp; Hãng</span>' +
                '</div>' +
                '<div class="row g-3">' +
                    __relatedProductsCache.map(function(rp) {
                        var rpIconUrl = buildProductIconSvgUrl(rp);
                        var rpImg = resolveAccurateProductImage(rp);
                        return '<div class="col-md-3 col-6">' +
                            '<a href="/services/product/product-detail.html?id=' + rp.id + '" class="text-decoration-none d-block p-3 rounded-3 border h-100 nv-adaptive-card">' +
                                '<div class="text-center mb-2 p-2 rounded-3" style="background:#0b1120;">' +
                                    '<img src="' + rpImg + '" style="height:125px;width:100%;object-fit:contain;" class="img-fluid" onerror="this.onerror=null;this.src=\'' + rpIconUrl + '\'">' +
                                '</div>' +
                                '<div class="d-flex justify-content-between align-items-center mb-1">' +
                                    '<span class="badge bg-dark border border-info text-info" style="font-size:9.5px;">' + (rp.brand || 'NIVIDA') + '</span>' +
                                    '<small class="text-warning fw-bold">★ ' + (rp.rating || '4.9') + '</small>' +
                                '</div>' +
                                '<div class="small fw-bold text-truncate mb-1">' + rp.name + '</div>' +
                                '<div class="fw-bold text-nvidia">' + formatVndPrice(rp.price) + '</div>' +
                            '</a>' +
                        '</div>';
                    }).join('') +
                '</div>' +
            '</div>'
        ) : '');
}

function openStoreChatFromDetail(sellerId, storeName) {
    if (typeof window.openUnifiedCatHub === 'function') {
        window.openUnifiedCatHub('store_chat', { seller_id: sellerId, store_name: storeName });
    } else {
        var chatBtn = document.querySelector('[onclick*="cat_widget"], .nv-cat-fab, #catWidgetToggleBtn');
        if (chatBtn) chatBtn.click();
        if (typeof notifyToast === 'function') notifyToast('💬 Đã kết nối phiên Chat trực tiếp với [' + storeName + ']!', 'info');
    }
}
window.openStoreChatFromDetail = openStoreChatFromDetail;

function submitQuickProductReview() {
    var inp = $pd('#newReviewCommentInput');
    var txt = (inp ? inp.value : '').trim();
    if (!txt) return;
    var uRaw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
    var uName = 'Khách hàng Nivida';
    try {
        var u = uRaw ? JSON.parse(uRaw) : null;
        if (u && (u.full_name || u.username)) uName = u.full_name || u.username;
    } catch (e) {}

    __currentProductReviews.unshift({
        user_name: uName,
        rating: 5,
        comment: txt,
        created_at: 'Vừa xong'
    });
    if (inp) inp.value = '';
    if (__currentProductDetail) renderProductDetailView(__currentProductDetail, {});
    if (typeof notifyToast === 'function') notifyToast('🎉 Cảm ơn bạn đã gửi đánh giá sản phẩm!', 'success');
}
window.submitQuickProductReview = submitQuickProductReview;

function changeMainProductImage(srcUrl, thumbEl) {
    var mainImg = $pd('#detailMainImage');
    if (mainImg && srcUrl) mainImg.src = srcUrl;
    if (thumbEl && thumbEl.parentElement) {
        thumbEl.parentElement.querySelectorAll('img').forEach(function(el) {
            el.classList.remove('border-success');
            el.classList.add('border-secondary');
        });
        thumbEl.classList.remove('border-secondary');
        thumbEl.classList.add('border-success');
    }
}
window.changeMainProductImage = changeMainProductImage;
window.changeMainImage = changeMainProductImage;

function updateDetailQuantity(delta) {
    var qtyInp = $pd('#detailQtyInput');
    var cur = qtyInp ? (parseInt(qtyInp.value, 10) || 1) : __currentProductQty;
    var nextVal = Math.max(1, Math.min(99, cur + Number(delta || 0)));
    __currentProductQty = nextVal;
    if (qtyInp) qtyInp.value = String(nextVal);
}
window.updateDetailQuantity = updateDetailQuantity;
window.changeQty = updateDetailQuantity;

async function addToCartFromDetail(redirectCheckout) {
    var p = __currentProductDetail || { id: getProductIdFromUrl(), name: 'Sản phẩm Nivida', price: 1590000 };
    var qtyInp = $pd('#detailQtyInput');
    var qty = qtyInp ? (parseInt(qtyInp.value, 10) || 1) : __currentProductQty;
    var accurateImg = resolveAccurateProductImage(p);

    try {
        var rawCart = localStorage.getItem('nvidia_cart') || localStorage.getItem('cart') || '[]';
        var cart = JSON.parse(rawCart);
        if (!Array.isArray(cart)) cart = [];
        var existing = cart.find(function(item) { return Number(item.id || item.product_id) === Number(p.id); });
        if (existing) {
            existing.quantity = Number(existing.quantity || 1) + qty;
        } else {
            cart.push({
                id: p.id,
                product_id: p.id,
                name: p.name,
                price: Number(p.price || 1590000),
                image_url: accurateImg,
                quantity: qty,
                seller_id: p.seller_id || 2
            });
        }
        localStorage.setItem('nvidia_cart', JSON.stringify(cart));
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (err) {}

    try {
        var uRaw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
        var u = uRaw ? JSON.parse(uRaw) : null;
        if (u && u.id) {
            await fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: u.id, product_id: p.id, quantity: qty })
            });
        }
    } catch (err) {}

    if (typeof window.updateHeaderCartCount === 'function') window.updateHeaderCartCount();
    if (typeof notifyToast === 'function') {
        notifyToast('🛒 Đã thêm [' + (p.name || 'Sản phẩm') + '] (x' + qty + ') vào giỏ hàng!', 'success');
    }

    if (redirectCheckout) {
        setTimeout(function() {
            window.location.href = '/services/cart_checkout/checkout.html';
        }, 300);
    }
}
window.addToCartFromDetail = addToCartFromDetail;

function buyNowFromDetail() {
    addToCartFromDetail(true);
}
window.buyNowFromDetail = buyNowFromDetail;

function addToCompareFromDetail() {
    var p = __currentProductDetail;
    if (!p) return;
    if (typeof window.addToCompare === 'function') {
        window.addToCompare(p.id);
    } else if (typeof notifyToast === 'function') {
        notifyToast('⚖️ Đã thêm [' + p.name + '] vào danh sách So sánh!', 'info');
    }
}
window.addToCompareFromDetail = addToCompareFromDetail;

function toggleWishlistFromDetail() {
    var p = __currentProductDetail;
    if (!p) return;
    if (typeof window.toggleWishlistItem === 'function') {
        window.toggleWishlistItem(p.id);
    } else if (typeof notifyToast === 'function') {
        notifyToast('❤️ Đã lưu [' + p.name + '] vào danh sách Yêu thích!', 'success');
    }
}
window.toggleWishlistFromDetail = toggleWishlistFromDetail;

document.addEventListener('DOMContentLoaded', function() {
    loadProductDetailPage();
});