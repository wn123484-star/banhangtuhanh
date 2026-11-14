/* [FEAT-RFQ-008] Sàn Đấu Thầu Ngược B2B Reverse RFQ & Chốt Báo Giá Tự Sinh Đơn Hàng | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/rfq/accept-offer / rfq_requests, rfq_offers, orders / rfq.js | [LOCKED-DESIGN] */
var __rfqLastBehalfUrl = '';

function _formatRfqVND(val) {
    if (typeof formatVND === 'function') return formatVND(val);
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
}

function _getRfqUsername() {
    try {
        var u = typeof getAuthUser === 'function' ? getAuthUser() : null;
        if (u && (u.username || u.full_name)) return String(u.username || u.full_name);
    } catch (e) {}
    return 'khach_hang_vip';
}

async function loadReverseRfqMarketplace() {
    try {
        var res = await fetch('/api/rfq/requests?_t=' + Date.now(), { cache: 'no-store' });
        var data = await res.json();
        if (!data || !data.ok) return;
        renderReverseRfqRequests(data.requests || []);
    } catch (e) {}
}

function renderReverseRfqRequests(list) {
    var box = document.getElementById('rfqRequestsListContainer');
    if (!box) return;
    if (!list.length) {
        box.innerHTML = '<div class="p-4 rounded-3 border text-center text-muted">Chưa có yêu cầu đấu thầu ngược nào. Hãy đăng yêu cầu đầu tiên ở cột bên trái!</div>';
        return;
    }

    box.innerHTML = list.map(function (req) {
        var isAwarded = req.status === 'AWARDED';
        var stBadge = isAwarded
            ? '<span class="badge bg-success fw-bold">✅ ĐÃ CHỐT BÁO GIÁ &amp; TẠO ĐƠN QR</span>'
            : '<span class="badge bg-info text-dark fw-bold">🟢 ĐANG MỞ NHẬN BÁO GIÁ CẠNH TRANH</span>';

        var offers = req.offers || req.quotes || [];
        var offersHtml = offers.map(function (of) {
            var saving = Math.max(0, Number(req.max_budget || 0) - Number(of.quoted_price || 0));
            var isAccepted = Number(of.is_accepted) === 1;
            var btnHtml = isAccepted
                ? '<span class="badge bg-success px-3 py-2">🏆 Báo Giá Đã Được Chọn</span>'
                : (
                    '<button type="button" class="btn btn-nvidia btn-sm fw-bold px-3 py-1" onclick="acceptRfqSellerOffer(' + req.id + ', ' + of.id + ')">' +
                        '✅ Chấp Nhận Báo Giá Này &amp; Tạo QR' +
                    '</button>'
                );
            return (
                '<div class="rfq-offer-item p-3 mb-2 d-flex flex-wrap justify-content-between align-items-center gap-2">' +
                    '<div>' +
                        '<div class="fw-bold text-nvidia">🏪 ' + of.seller_store_name + ' <span class="badge bg-danger ms-1">Rẻ hơn ngân sách -' + _formatRfqVND(saving) + '</span></div>' +
                        '<div class="small text-light">🛡️ ' + of.warranty_commitment + ' • 🚚 ' + of.delivery_sla + '</div>' +
                        '<div class="small text-warning">🎁 Quà tặng kèm: ' + (of.gift_bonus || 'Freeship NVX') + '</div>' +
                    '</div>' +
                    '<div class="text-end">' +
                        '<div class="fw-bold text-warning fs-5">' + _formatRfqVND(of.quoted_price) + '</div>' +
                        btnHtml +
                    '</div>' +
                '</div>'
            );
        }).join('');

        return (
            '<div class="nv-adaptive-card rfq-request-card p-4 shadow-sm">' +
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                    '<div>' +
                        stBadge +
                        '<span class="badge bg-dark border border-secondary ms-2 font-monospace">Mã RFQ #' + req.id + '</span>' +
                        '<small class="text-muted ms-2">👤 Người đăng: <strong>' + req.buyer_name + '</strong></small>' +
                    '</div>' +
                    '<div class="fw-bold text-info">Ngân sách tối đa: ' + _formatRfqVND(req.max_budget) + ' (SL: ' + req.qty + ')</div>' +
                '</div>' +
                '<h5 class="fw-bold text-light mb-1">' + req.title + '</h5>' +
                '<p class="small text-muted mb-3">📌 Yêu cầu chi tiết: ' + (req.specs_note || '') + '</p>' +

                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                    '<strong class="small text-nvidia">💬 Danh sách Báo giá cạnh tranh từ các Gian hàng (' + offers.length + ' báo giá):</strong>' +
                    '<button type="button" class="btn btn-warning text-dark btn-sm fw-bold" onclick="simulateThreeFlagshipStoresOffer(' + req.id + ')">' +
                        '⚡ Giả Lập 3 Gian Hàng Flagship Chào Giá Tức Thì (Demo)' +
                    '</button>' +
                '</div>' +
                (offersHtml || '<div class="p-3 rounded border text-muted small">Chưa có gian hàng nào báo giá. Bấm nút [⚡ Giả Lập 3 Gian Hàng Flagship Chào Giá Tức Thì] để xem báo giá cạnh tranh ngay!</div>') +
            '</div>'
        );
    }).join('');
}

async function createNewReverseRfqRequest() {
    if (typeof requireAuthOrPrompt === 'function' && !requireAuthOrPrompt('đăng yêu cầu đấu thầu ngược B2B RFQ')) return;
    var title = (document.getElementById('rfqTitleInput')?.value || '').trim();
    var maxB = Number(document.getElementById('rfqMaxBudgetInput')?.value || 35000000);
    var qty = Number(document.getElementById('rfqQtyInput')?.value || 1);
    var cat = document.getElementById('rfqCategorySelect')?.value || 'gpu';
    var note = (document.getElementById('rfqSpecsNoteInput')?.value || '').trim();

    if (!title) {
        if (typeof notifyToast === 'function') notifyToast('Vui lòng nhập tiêu đề cấu hình / sản phẩm cần tìm!', 'warning');
        return;
    }

    try {
        var res = await fetch('/api/rfq/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                buyer_username: _getRfqUsername(),
                title: title,
                category: cat,
                max_budget: maxB,
                qty: qty,
                specs_note: note
            })
        });
        var data = await res.json();
        if (data && data.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã đăng yêu cầu đấu thầu ngược!', 'success');
            renderReverseRfqRequests(data.requests || []);
        }
    } catch (e) {}
}

async function simulateThreeFlagshipStoresOffer(rfqId) {
    try {
        var res = await fetch('/api/rfq/submit-offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rfq_id: Number(rfqId),
                simulate_3_flagship_stores: true
            })
        });
        var data = await res.json();
        if (data && data.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message || '⚡ 3 Gian hàng Flagship đã gửi báo giá!', 'success');
            renderReverseRfqRequests(data.requests || []);
        }
    } catch (e) {}
}

async function acceptRfqSellerOffer(rfqId, offerId) {
    if (typeof requireAuthOrPrompt === 'function' && !requireAuthOrPrompt('chấp nhận báo giá và tạo đơn hàng QR trên Sàn RFQ')) return;
    try {
        var res = await fetch('/api/rfq/accept-offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                rfq_id: Number(rfqId),
                offer_id: Number(offerId),
                buyer_username: _getRfqUsername()
            })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Không thể chấp nhận báo giá!', 'warning');
            return;
        }
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');

        var banner = document.getElementById('rfqAwardedQrBanner');
        var tEl = document.getElementById('rfqAwardedTitleText');
        var sEl = document.getElementById('rfqAwardedSubText');
        var inspBtn = document.getElementById('rfqAwardedInspectBtn');
        if (banner) {
            banner.classList.remove('d-none');
            if (tEl) tEl.textContent = 'Đơn chốt thầu ' + data.order_code + ' (' + data.seller_store_name + ') — Tổng thanh toán: ' + _formatRfqVND(data.total_amount);
            if (sEl) sEl.textContent = 'Mã hóa đơn QR: ' + data.pay_token + ' • Bấm nút bên phải để Xem Giá & Xác Nhận Chuyển Khoản hoặc nhờ bạn bè chuyển khoản hộ.';
            if (inspBtn) inspBtn.href = data.inspect_url;
            __rfqLastBehalfUrl = window.location.origin + data.share_behalf_url;
            banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        renderReverseRfqRequests(data.requests || []);
    } catch (e) {}
}

function copyRfqAwardedBehalfLink() {
    var link = __rfqLastBehalfUrl || (window.location.origin + '/services/cart_checkout/bank.html');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).catch(function () {});
    }
    if (typeof notifyToast === 'function') {
        notifyToast('🤝 Đã copy Link Nhờ Bạn Bè / Người Thân Chuyển Khoản Hộ: ' + link, 'info');
    }
}

window.loadReverseRfqMarketplace = loadReverseRfqMarketplace;
window.createNewReverseRfqRequest = createNewReverseRfqRequest;
window.simulateThreeFlagshipStoresOffer = simulateThreeFlagshipStoresOffer;
window.acceptRfqSellerOffer = acceptRfqSellerOffer;
window.copyRfqAwardedBehalfLink = copyRfqAwardedBehalfLink;

document.addEventListener('DOMContentLoaded', function () {
    loadReverseRfqMarketplace();
});