var __chkCartItems = [];
var __chkUserWallet = { bank_balance: 25000000, coins: 25000 };
var __chkAvailableVouchers = [];
var __chkAppliedVoucher = null;
var __chkComputedTotals = { subtotal: 0, shipping: 30000, voucherDiscount: 0, coinsDiscount: 0, finalTotal: 0 };
var __chkActiveQrToken = '';
var __chkActiveOrderId = 0;
var __chkIsCurrentQrPaid = false;
var __chkPaidReceiptData = null;
var __chkPollTimer = null;

function generateSessionQrToken() {
    var u = typeof getAuthUser === 'function' ? getAuthUser() : null;
    var uid = (u && u.id) ? u.id : 13;
    var savedTok = sessionStorage.getItem('nvx_active_checkout_qr_token');
    if (savedTok) return savedTok;
    var newTok = 'NVXPAY-' + uid + '-' + Date.now().toString().slice(-6);
    sessionStorage.setItem('nvx_active_checkout_qr_token', newTok);
    return newTok;
}

async function initCheckoutPage() {
    var u = typeof getAuthUser === 'function' ? getAuthUser() : null;
    var uid = (u && u.id) ? u.id : 13;

    if (u) {
        var nameInp = document.getElementById('chkCustomerName');
        var phoneInp = document.getElementById('chkCustomerPhone');
        if (nameInp && (u.full_name || u.username)) nameInp.value = u.full_name || u.username;
        if (phoneInp && u.phone) phoneInp.value = u.phone;
    }

    __chkCartItems = typeof getCart === 'function' ? getCart() : [];
    if (!__chkCartItems.length) {
        try {
            var pRes = await fetch('/api/home/products?sort_by=popular');
            var pData = await pRes.json();
            if (pData.products && pData.products.length) {
                var sample = pData.products[0];
                __chkCartItems = [{
                    id: sample.id,
                    product_id: sample.id,
                    name: sample.name,
                    price: Number(sample.price || 1590000),
                    quantity: 1,
                    unit: sample.unit || 'Chiếc',
                    warranty: sample.warranty || '36 tháng',
                    image_url: sample.image_url || '/assets/icons/icon.png'
                }];
            }
        } catch (e) {}
    }

    __chkActiveQrToken = generateSessionQrToken();
    window.__activeCheckoutPayToken = __chkActiveQrToken;
    window.__activeCheckoutQrToken = __chkActiveQrToken;

    var tokEl = document.getElementById('chkQrTokenText');
    if (tokEl) tokEl.textContent = 'Mã Phiên QR: ' + __chkActiveQrToken;

    try {
        var results = await Promise.all([
            fetch('/api/settings/bank-wallet?user_id=' + uid),
            fetch('/api/vouchers/list?user_id=' + uid + '&active_only=1')
        ]);
        var wRes = results[0];
        var vRes = results[1];
        if (wRes && wRes.ok) {
            __chkUserWallet = await wRes.json();
        }
        if (vRes && vRes.ok) {
            var vData = await vRes.json();
            __chkAvailableVouchers = vData.vouchers || vData.home_vouchers || [];
        }
    } catch (e) {}

    renderCheckoutCartItems();
    populateCheckoutVouchersDropdown();
    recalculateCheckoutTotals();

    // Khởi tạo phiên QR ở trạng thái AWAITING_PAYMENT trên Server (tuyệt đối không tự duyệt khi chưa bấm xác nhận)
    await ensureServerQrPaymentSessionCreated();
    await checkIfCurrentQrTokenAlreadyPaid();

    if (__chkPollTimer) clearInterval(__chkPollTimer);
    __chkPollTimer = setInterval(function() {
        if (!__chkIsCurrentQrPaid) {
            checkIfCurrentQrTokenAlreadyPaid();
        }
    }, 1500);
}

function renderCheckoutCartItems() {
    var box = document.getElementById('chkCartItemsList');
    var badge = document.getElementById('chkItemsCountBadge');
    if (!box) return;

    var totalQty = __chkCartItems.reduce(function(s, i) {
        return s + Math.max(1, parseInt(i.quantity || i.qty || 1, 10));
    }, 0);
    if (badge) badge.textContent = totalQty + ' sản phẩm';

    box.innerHTML = __chkCartItems.map(function(item) {
        var qty = Math.max(1, parseInt(item.quantity || item.qty || 1, 10));
        var price = Number(item.price || 0);
        var imgUrl = typeof getProductImageUrl === 'function' ? getProductImageUrl(item) : (item.image_url || '/assets/icons/icon.png');
        return '<div class="d-flex align-items-center justify-content-between p-2 rounded-3 border mb-2">' +
            '<div class="d-flex align-items-center gap-2 text-truncate pe-2">' +
                '<img src="' + imgUrl + '" style="width:48px;height:48px;object-fit:cover;" class="rounded border flex-shrink-0">' +
                '<div class="text-truncate">' +
                    '<div class="fw-bold small text-truncate">' + (item.name || 'Sản phẩm Nvidia') + '</div>' +
                    '<small class="text-muted">ĐVT: ' + (item.unit || 'Chiếc') + ' • BH: ' + (item.warranty || '36 tháng') + ' • SL: <strong>x' + qty + '</strong></small>' +
                '</div>' +
            '</div>' +
            '<div class="text-end flex-shrink-0">' +
                '<div class="fw-bold text-nvidia small">' + formatVND(price * qty) + '</div>' +
                '<small class="text-muted" style="font-size:10.5px;">' + formatVND(price) + ' / ' + (item.unit || 'Chiếc') + '</small>' +
            '</div>' +
        '</div>';
    }).join('');
}
window.renderCheckoutCartItems = renderCheckoutCartItems;

function populateCheckoutVouchersDropdown() {
    var sel = document.getElementById('chkVoucherSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Chọn mã giảm giá trong Ví (' + __chkAvailableVouchers.length + ' mã) --</option>' +
        __chkAvailableVouchers.map(function(v) {
            return '<option value="' + v.code + '">' + v.code + ' — Giảm ' + formatVND(v.discount_value || 50000) + ' (Đơn từ ' + formatVND(v.min_order_value || 0) + ')</option>';
        }).join('');
}

function onSelectCheckoutVoucher(code) {
    var inp = document.getElementById('chkVoucherCodeInput');
    if (inp) inp.value = code || '';
    if (code) {
        applyCheckoutVoucherCode();
    } else {
        __chkAppliedVoucher = null;
        var msgEl = document.getElementById('chkVoucherAppliedMsg');
        if (msgEl) msgEl.classList.add('d-none');
        recalculateCheckoutTotals();
        ensureServerQrPaymentSessionCreated();
    }
}
window.onSelectCheckoutVoucher = onSelectCheckoutVoucher;

async function applyCheckoutVoucherCode() {
    var inp = document.getElementById('chkVoucherCodeInput');
    var code = (inp ? inp.value : '').trim().toUpperCase();
    var msgEl = document.getElementById('chkVoucherAppliedMsg');
    if (!code) return;

    var subtotal = __chkCartItems.reduce(function(s, i) {
        return s + Number(i.price || 0) * Math.max(1, parseInt(i.quantity || i.qty || 1, 10));
    }, 0);
    try {
        var res = await fetch('/api/vouchers/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code, order_total: subtotal, subtotal: subtotal })
        });
        var data = await res.json();
        if (res.ok && (data.valid || data.discount_amount !== undefined)) {
            __chkAppliedVoucher = {
                code: code,
                discount_amount: Number(data.discount_amount || data.discount_value || 50000)
            };
            if (msgEl) {
                msgEl.className = 'small text-nvidia fw-bold mt-2';
                msgEl.textContent = '✔ Đã áp dụng mã [' + code + ']: Giảm trực tiếp ' + formatVND(__chkAppliedVoucher.discount_amount) + '!';
                msgEl.classList.remove('d-none');
            }
        } else {
            var foundLocal = __chkAvailableVouchers.find(function(v) { return String(v.code).toUpperCase() === code; });
            if (foundLocal) {
                __chkAppliedVoucher = { code: code, discount_amount: Number(foundLocal.discount_value || 50000) };
                if (msgEl) {
                    msgEl.className = 'small text-nvidia fw-bold mt-2';
                    msgEl.textContent = '✔ Đã áp dụng mã [' + code + ']: Giảm ' + formatVND(__chkAppliedVoucher.discount_amount) + '!';
                    msgEl.classList.remove('d-none');
                }
            } else if (msgEl) {
                msgEl.className = 'small text-warning fw-bold mt-2';
                msgEl.textContent = data.error || ('⚠️ Mã [' + code + '] chưa đủ điều kiện hoặc đã hết lượt!');
                msgEl.classList.remove('d-none');
            }
        }
    } catch (e) {}
    recalculateCheckoutTotals();
    ensureServerQrPaymentSessionCreated();
}
window.applyCheckoutVoucherCode = applyCheckoutVoucherCode;

function recalculateCheckoutTotals() {
    var subtotal = __chkCartItems.reduce(function(s, i) {
        return s + Number(i.price || 0) * Math.max(1, parseInt(i.quantity || i.qty || 1, 10));
    }, 0);
    var carrierEl = document.getElementById('chkShippingCarrier');
    var shipping = Number(carrierEl ? carrierEl.value : 30000);
    var voucherDiscount = __chkAppliedVoucher ? Number(__chkAppliedVoucher.discount_amount || 0) : 0;

    var availCoins = Number(__chkUserWallet.coins !== undefined ? __chkUserWallet.coins : 25000);
    var coinsToggle = document.getElementById('chkUseCoinsToggle');
    var useCoins = Boolean(coinsToggle && coinsToggle.checked);
    var coinsDiscount = useCoins ? Math.min(availCoins, Math.round(subtotal * 0.1)) : 0;

    var finalTotal = Math.max(0, subtotal + shipping - voucherDiscount - coinsDiscount);
    __chkComputedTotals = {
        subtotal: subtotal,
        shipping: shipping,
        voucherDiscount: voucherDiscount,
        coinsDiscount: coinsDiscount,
        finalTotal: finalTotal
    };

    var setTxt = function(id, v) {
        var el = document.getElementById(id);
        if (el) el.textContent = v;
    };
    setTxt('chkBankBalanceText', formatVND(__chkUserWallet.bank_balance !== undefined ? __chkUserWallet.bank_balance : 25000000));
    setTxt('chkAvailableCoinsText', availCoins.toLocaleString('vi-VN'));
    setTxt('chkSubtotalAmount', formatVND(subtotal));
    setTxt('chkShippingFeeAmount', formatVND(shipping));
    setTxt('chkVoucherDiscountAmount', '-' + formatVND(voucherDiscount));
    setTxt('chkCoinsDiscountAmount', '-' + formatVND(coinsDiscount));
    setTxt('chkFinalTotalAmount', formatVND(finalTotal));

    renderCheckoutQrCanvas();
}
window.recalculateCheckoutTotals = recalculateCheckoutTotals;

function renderCheckoutQrCanvas() {
    var qrBox = document.getElementById('checkoutQrCanvasBox');
    if (!qrBox || typeof QRCode === 'undefined') return;
    qrBox.innerHTML = '';
    var qrUrlPayload = window.location.origin + '/services/cart_checkout/bank.html?pay_token=' + encodeURIComponent(__chkActiveQrToken);
    new QRCode(qrBox, {
        text: qrUrlPayload,
        width: 164,
        height: 164,
        colorDark: '#090d16',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
}
window.renderCheckoutQrCanvas = renderCheckoutQrCanvas;

async function ensureServerQrPaymentSessionCreated() {
    var u = typeof getAuthUser === 'function' ? getAuthUser() : null;
    var uid = (u && u.id) ? u.id : 13;
    var custName = (document.getElementById('chkCustomerName')?.value || '').trim() || (u ? (u.full_name || u.username) : 'Khách mua hàng');
    var custPhone = (document.getElementById('chkCustomerPhone')?.value || '').trim() || '0988123456';
    var shipAddr = (document.getElementById('chkShippingAddress')?.value || '').trim() || 'Khu Công Nghệ Cao Quận 9, TP. Thủ Đức, TP.HCM';

    var mappedItems = __chkCartItems.map(function(i) {
        return {
            product_id: Number(i.product_id || i.id || 1),
            name: i.name || 'Sản phẩm công nghệ Nvidia',
            quantity: Math.max(1, parseInt(i.quantity || i.qty || 1, 10)),
            price: Number(i.price || 0)
        };
    });

    try {
        var res = await fetch('/api/payment/qr-session/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                buyer_id: uid,
                customer_name: custName,
                phone: custPhone,
                shipping_address: shipAddr,
                pay_token: __chkActiveQrToken,
                order_id: __chkActiveOrderId || '',
                amount: __chkComputedTotals.finalTotal,
                subtotal_amount: __chkComputedTotals.subtotal,
                voucher_code: __chkAppliedVoucher ? __chkAppliedVoucher.code : '',
                voucher_discount: __chkComputedTotals.voucherDiscount,
                xu_used: __chkComputedTotals.coinsDiscount,
                items: mappedItems
            })
        });
        if (res.ok) {
            var data = await res.json();
            if (data && data.ok) {
                __chkActiveQrToken = data.pay_token || __chkActiveQrToken;
                __chkActiveOrderId = Number(data.order_id || __chkActiveOrderId || 0);
                window.__activeCheckoutPayToken = __chkActiveQrToken;
                window.__activeCheckoutQrToken = __chkActiveQrToken;
                sessionStorage.setItem('nvx_active_checkout_qr_token', __chkActiveQrToken);
                var tokEl = document.getElementById('chkQrTokenText');
                if (tokEl) {
                    tokEl.textContent = 'Mã QR: ' + __chkActiveQrToken + (__chkActiveOrderId ? (' (Đơn #NVD-' + __chkActiveOrderId + ')') : '');
                }
                renderCheckoutQrCanvas();
                return data;
            }
        }
    } catch (e) {}
    return null;
}
window.ensureServerQrPaymentSessionCreated = ensureServerQrPaymentSessionCreated;

function onChangePaymentMethod(methodVal) {
    var btn = document.getElementById('btnMainCheckoutAction');
    if (!btn) return;
    if (methodVal === 'COD_ESCROW') {
        btn.innerHTML = '📦 Đặt Hàng COD Đồng Kiểm &amp; Khởi Tạo Vận Đơn Ngay';
    } else {
        btn.innerHTML = '📱 Mở Màn Hình Xem Giá &amp; Xác Nhận Quét QR (NVIDIA Pay)';
    }
}
window.onChangePaymentMethod = onChangePaymentMethod;

async function openBankAppForQrScan() {
    await ensureServerQrPaymentSessionCreated();
    var targetUrl = '/services/cart_checkout/bank.html?pay_token=' + encodeURIComponent(__chkActiveQrToken) +
        (__chkActiveOrderId ? ('&order_id=' + encodeURIComponent(__chkActiveOrderId)) : '');
    window.location.href = targetUrl;
}
window.openBankAppForQrScan = openBankAppForQrScan;

async function copySharePayOnBehalfLink() {
    await ensureServerQrPaymentSessionCreated();
    var shareUrl = window.location.origin + '/services/cart_checkout/bank.html?pay_token=' +
        encodeURIComponent(__chkActiveQrToken) +
        (__chkActiveOrderId ? ('&order_id=' + encodeURIComponent(__chkActiveOrderId)) : '') +
        '&mode=behalf';

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
        }
    } catch (e) {}

    var stepHint = document.getElementById('chkQrScanStepHint');
    if (stepHint) {
        stepHint.innerHTML =
            '<div class="p-2 rounded-3 border border-success mt-1 text-start" style="background:rgba(118,185,0,0.14);">' +
                '<div class="fw-bold text-nvidia mb-1">🤝 Đã sao chép Link Nhờ Bạn Bè / Người Thân Chuyển Khoản Hộ!</div>' +
                '<div class="font-monospace small text-info text-break mb-2">' + shareUrl + '</div>' +
                '<a href="' + shareUrl + '" class="btn btn-sm btn-nvidia fw-bold w-100">👉 Mở Ngay Màn Hình Chuyển Khoản Hộ (Xem Giá &amp; Lời Nhắn)</a>' +
            '</div>';
    }

    if (typeof notifyToast === 'function') {
        notifyToast('🤝 Đã copy Link Chuyển Khoản Hộ! Bạn bè mở link sẽ thấy chi tiết hóa đơn #NVD-' + (__chkActiveOrderId || '101') + ' để xác nhận trả hộ.', 'success');
    }
}
window.copySharePayOnBehalfLink = copySharePayOnBehalfLink;

function downloadCheckoutInvoiceQrImage() {
    var qrBox = document.getElementById('checkoutQrCanvasBox');
    if (!qrBox) return;
    var canvas = qrBox.querySelector('canvas');
    var img = qrBox.querySelector('img');
    var dataUrl = '';
    if (canvas && typeof canvas.toDataURL === 'function') {
        dataUrl = canvas.toDataURL('image/png');
    } else if (img && img.src) {
        dataUrl = img.src;
    }
    if (!dataUrl) {
        if (typeof notifyToast === 'function') notifyToast('⚠️ Đang khởi tạo ảnh QR, vui lòng thử lại!', 'warning');
        return;
    }
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'HoaDon_QR_' + (__chkActiveQrToken || 'NVIDIA_PAY') + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (typeof notifyToast === 'function') {
        notifyToast('⬇️ Đã tải ảnh Mã QR Hóa đơn (' + __chkActiveQrToken + ') về máy!', 'info');
    }
}
window.downloadCheckoutInvoiceQrImage = downloadCheckoutInvoiceQrImage;

async function handlePrimaryCheckoutButtonClick() {
    var payMethod = document.getElementById('chkPaymentMethod')?.value || 'NVIDIA_PAY_QR';
    if (payMethod === 'COD_ESCROW') {
        await submitCodOrderDirectly();
        return;
    }
    await openBankAppForQrScan();
}
window.handlePrimaryCheckoutButtonClick = handlePrimaryCheckoutButtonClick;

async function checkIfCurrentQrTokenAlreadyPaid() {
    if (!__chkActiveQrToken) return false;
    try {
        var res = await fetch('/api/payment/qr-session/' + encodeURIComponent(__chkActiveQrToken) + '?_t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return false;
        var data = await res.json();
        if (data && data.order_id && !__chkActiveOrderId) {
            __chkActiveOrderId = Number(data.order_id);
        }
        if (data && (data.is_paid || data.status === 'APPROVED' || data.status === 'PAID')) {
            markQrAsPaidUI(data);
            return true;
        }
    } catch (e) {}
    return false;
}
window.checkIfCurrentQrTokenAlreadyPaid = checkIfCurrentQrTokenAlreadyPaid;

function markQrAsPaidUI(paidInfo) {
    if (__chkIsCurrentQrPaid) return;
    __chkIsCurrentQrPaid = true;
    __chkPaidReceiptData = paidInfo;

    var overlay = document.getElementById('chkQrPaidOverlay');
    var overlaySub = document.getElementById('chkQrPaidOverlaySub');
    var statusBadge = document.getElementById('chkQrStatusBadge');
    var stepHint = document.getElementById('chkQrScanStepHint');
    var btnMain = document.getElementById('btnMainCheckoutAction');

    var oid = paidInfo.order_id || __chkActiveOrderId || 101;
    var tCode = paidInfo.tracking_code || ('NVX-' + oid);
    var behalfNote = paidInfo.is_paid_on_behalf
        ? ('<br><span class="badge bg-info text-dark mt-1">🤝 Chuyển khoản hộ bởi: ' + (paidInfo.payer_name || 'Bạn bè') + '</span>')
        : '';

    if (overlay) overlay.classList.remove('d-none');
    if (overlaySub) {
        overlaySub.innerHTML = 'Mã GD: <strong>' + (paidInfo.tx_code || 'NVX-ESCROW') + '</strong> • Đơn <strong>#NVD-' + oid + '</strong> đã khóa tiền vào Quỹ Bảo Lãnh Escrow!' + behalfNote;
    }
    if (statusBadge) {
        statusBadge.className = 'badge bg-success font-monospace';
        statusBadge.textContent = '✅ ESCROW_LOCKED';
    }
    if (stepHint) {
        stepHint.innerHTML = '<span class="text-nvidia fw-bold">🎉 Đã xác nhận thanh toán thành công! Đang tự động chuyển sang trang Theo dõi Vận đơn NVX Express...</span>';
    }

    if (typeof saveCart === 'function') saveCart([]);

    var trackingUrl = paidInfo.next_step_url || ('/services/order_tracking/tracking.html?id=' + encodeURIComponent(oid) + '&code=' + encodeURIComponent(tCode));
    if (btnMain) {
        btnMain.className = 'btn btn-success w-100 fw-bold py-2 fs-6';
        btnMain.innerHTML = '🚚 Đã Xác Nhận Thanh Toán — Mở Vận Đơn NVX Express Ngay ➔';
        btnMain.onclick = function() {
            window.location.href = trackingUrl;
        };
    }

    sessionStorage.removeItem('nvx_active_checkout_qr_token');
    if (typeof notifyToast === 'function') {
        notifyToast('🎉 Đơn hàng #NVD-' + oid + ' đã chuyển sang ESCROW_LOCKED! Đang mở trang Vận đơn NVX Express...', 'success');
    }

    setTimeout(function() {
        window.location.href = trackingUrl;
    }, 1100);
}
window.markQrAsPaidUI = markQrAsPaidUI;

function resetNewQrPaymentSession() {
    sessionStorage.removeItem('nvx_active_checkout_qr_token');
    __chkIsCurrentQrPaid = false;
    __chkPaidReceiptData = null;
    window.location.reload();
}
window.resetNewQrPaymentSession = resetNewQrPaymentSession;

async function startStep1ScanQrCode() {
    await openBankAppForQrScan();
}
window.startStep1ScanQrCode = startStep1ScanQrCode;

function closeStep2ConfirmModal() {
    document.getElementById('step2ConfirmTransferModal')?.classList.add('d-none');
}
window.closeStep2ConfirmModal = closeStep2ConfirmModal;

async function submitStep3ConfirmTransfer(e) {
    if (e && e.preventDefault) e.preventDefault();
    await ensureServerQrPaymentSessionCreated();
    try {
        var res = await fetch('/api/payment/qr-session/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pay_token: __chkActiveQrToken,
                order_id: __chkActiveOrderId,
                is_paid_on_behalf: false
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            closeStep2ConfirmModal();
            markQrAsPaidUI(data);
        }
    } catch (err) {}
}
window.submitStep3ConfirmTransfer = submitStep3ConfirmTransfer;

async function submitCodOrderDirectly() {
    var sessData = await ensureServerQrPaymentSessionCreated();
    var oid = (sessData && sessData.order_id) ? sessData.order_id : (__chkActiveOrderId || 101);
    try {
        await fetch('/api/tracking/advance-stage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: oid, target_stage: 'SELLER_PACKING' })
        });
    } catch (e) {}
    if (typeof saveCart === 'function') saveCart([]);
    sessionStorage.removeItem('nvx_active_checkout_qr_token');
    if (typeof notifyToast === 'function') {
        notifyToast('📦 Đã khởi tạo đơn hàng COD Đồng kiểm #NVD-' + oid + ' thành công!', 'success');
    }
    setTimeout(function() {
        window.location.href = '/services/order_tracking/tracking.html?id=' + encodeURIComponent(oid) + '&code=NVX-' + encodeURIComponent(oid);
    }, 600);
}
window.submitCodOrderDirectly = submitCodOrderDirectly;

document.addEventListener('DOMContentLoaded', initCheckoutPage);