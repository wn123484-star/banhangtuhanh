/* [FEAT-PAY-004] Trung Tâm Săn Siêu Voucher & Ví Ưu Đãi Toàn Sàn | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/vouchers/list / user_vouchers / vouchers.js | [LOCKED-DESIGN] */
let __vouchersCatalogCache = [];
let __voucherFilterMode = 'all';

async function loadVouchersCatalog() {
    const grid = document.getElementById('voucherListGrid') || document.querySelector('main .row.g-3');
    if (!grid) return;
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : '';
    try {
        const res = await fetch(`/api/vouchers/list?user_id=${uid}`);
        const data = await res.json();
        __vouchersCatalogCache = data.vouchers || [];

        const activeCnt = __vouchersCatalogCache.filter(v => v.status_code === 'active').length;
        const claimedCnt = __vouchersCatalogCache.filter(v => v.is_claimed).length;
        const actEl = document.getElementById('statActiveVouchersCount');
        if (actEl) actEl.textContent = `${activeCnt} mã khả dụng`;
        const clmEl = document.getElementById('statMyClaimedCount');
        if (clmEl) clmEl.textContent = `${claimedCnt} mã`;

        renderFilteredVouchersGrid();
    } catch (e) {}
}

function setVoucherFilterMode(mode, btnEl) {
    __voucherFilterMode = mode;
    document.querySelectorAll('#voucherFilterTabsBar button').forEach(b => {
        b.className = 'btn btn-outline-secondary btn-sm fw-bold';
    });
    if (btnEl) btnEl.className = 'btn btn-nvidia btn-sm fw-bold';
    renderFilteredVouchersGrid();
}

function renderFilteredVouchersGrid() {
    const grid = document.getElementById('voucherListGrid') || document.querySelector('main .row.g-3');
    if (!grid) return;

    const list = __vouchersCatalogCache.filter(v => {
        const st = v.status_code || 'active';
        if (__voucherFilterMode === 'active') return st === 'active';
        if (__voucherFilterMode === 'claimed') return Boolean(v.is_claimed);
        if (__voucherFilterMode === 'ended') return st !== 'active';
        return true;
    });

    if (!list.length) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-muted">Không có mã giảm giá nào trong nhóm lọc này.</div>';
        return;
    }

    grid.innerHTML = list.map(v => {
        const st = v.status_code || 'active';
        const claimed = Boolean(v.is_claimed);
        const used = Boolean(v.is_used);
        const isPct = (v.discount_type || '').toLowerCase() === 'percent';
        const stubValue = isPct ? `${v.discount_value}%` : `${Math.round(Number(v.discount_value || 0) / 1000)}K`;
        const usageLimit = Math.max(1, Number(v.usage_limit || 50));
        const usedCount = Math.min(usageLimit, Number(v.used_count || 0));
        const usedPct = Math.round((usedCount / usageLimit) * 100);

        let statusBadge = '<span class="badge bg-success">🟢 Đang áp dụng</span>';
        if (st === 'expired') statusBadge = '<span class="badge bg-secondary">⚫ Đã hết hạn</span>';
        else if (st === 'out_of_stock') statusBadge = '<span class="badge bg-danger">🔴 Đã hết lượt</span>';

        let actionHtml = '';
        if (used) {
            actionHtml = `<button type="button" class="btn btn-secondary btn-sm w-100" disabled>✓ Đã Sử Dụng (1 lần)</button>`;
        } else if (claimed && st === 'active') {
            actionHtml = `
                <div class="d-flex gap-1">
                    <span class="badge bg-success d-flex align-items-center px-2">✓ Đã lưu Ví</span>
                    <a href="/services/cart_checkout/checkout.html" class="btn btn-nvidia btn-sm flex-fill fw-bold">🛒 Dùng Ngay Ở Thanh Toán ➔</a>
                </div>
            `;
        } else if (st === 'active') {
            actionHtml = `<button type="button" class="btn btn-nvidia btn-sm w-100 fw-bold" onclick="claimCatalogVoucher('${v.code}')">🎟️ Lưu Mã Vào Ví Ngay</button>`;
        } else {
            actionHtml = `<button type="button" class="btn btn-secondary btn-sm w-100" disabled>${st === 'expired' ? 'Mã Đã Hết Hạn' : 'Đã Hết Lượt Lưu'}</button>`;
        }

        return `
            <div class="col-md-6">
                <div class="nv-voucher-ticket h-100 ${st !== 'active' ? 'opacity-75' : ''}">
                    <div class="nv-voucher-stub ${st !== 'active' ? 'stub-expired' : ''}">
                        <div class="small fw-bold opacity-75">GIẢM</div>
                        <div class="fs-3 fw-bold">${stubValue}</div>
                        <span class="badge bg-dark mt-1" style="font-size:10px;">NVIDIA MALL</span>
                    </div>
                    <div class="nv-voucher-body">
                        <div>
                            <div class="d-flex justify-content-between align-items-center gap-2 mb-1">
                                <span class="badge bg-danger font-monospace fs-6">${v.code}</span>
                                ${statusBadge}
                            </div>
                            <h6 class="fw-bold mb-1 text-truncate" title="${v.title || ''}">${v.title || ('Giảm ' + formatVND(v.discount_value))}</h6>
                            <div class="small text-muted mb-2">Đơn tối thiểu: <strong>${formatVND(v.min_order_value || 0)}</strong> • HSD: <strong>${v.expiry_date}</strong></div>
                            <div class="mb-2">
                                <div class="d-flex justify-content-between small mb-1" style="font-size:11px;">
                                    <span>Đã lưu: ${usedCount}/${usageLimit} lượt</span>
                                    <strong class="text-nvidia">Còn ${v.remaining_uses} lượt</strong>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar ${st === 'active' ? 'bg-nvidia' : 'bg-secondary'}" style="width: ${usedPct}%;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-2">${actionHtml}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function claimCatalogVoucher(code) {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    if (!user || !user.id) {
        if (typeof notifyToast === 'function') notifyToast('Vui lòng đăng nhập để lưu Voucher!', 'warning');
        window.location.href = '/services/auth/auth.html';
        return;
    }
    try {
        const res = await fetch('/api/vouchers/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, code: code })
        });
        const data = await res.json();
        if (!res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Không thể lưu mã!', 'warning');
            return;
        }
        if (typeof notifyToast === 'function') notifyToast(data.message || `Đã lưu mã ${code}!`, 'success');
        loadVouchersCatalog();
    } catch (e) {}
}

function claimSecretVoucherByInput(e) {
    if (e && e.preventDefault) e.preventDefault();
    const inp = document.getElementById('secretVoucherCodeInput');
    const code = (inp ? inp.value : '').trim().toUpperCase();
    if (!code) return;
    claimCatalogVoucher(code);
    if (inp) inp.value = '';
}

document.addEventListener('DOMContentLoaded', loadVouchersCatalog);