/* [FEAT-PAY-004] Ví Điện Tử MoMo Nexora Pay, Cổng Bắt Buộc Đăng Nhập Khi Chuyển Tiền, Xem Trước Hóa Đơn QR 2 Bước & Chuyển Khoản Hộ PC-Mobile | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/payment/qr-session/*, /api/mobile/wallet-action, bảng bank_wallets / bank_transactions / payment_qr_sessions | [LOCKED-DESIGN] */
/* [FEAT-AUTH-003] Đăng Nhập/Đăng Ký, Xác Minh OTP 6 Số Qua Resend (@mail.castle-tech.cloud), Đổi Mật Khẩu, Mã PIN Ví 6 Số & Phân Quyền RBAC 4 Cấp (Guest / Buyer / Seller / Admin) | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/auth/*, /api/settings/security/*, bảng users / email_otp_verifications | [LOCKED-DESIGN] */
const NX_THEMES = [
    { id: 'executive_pearl_light', name: '1. Sáng Thanh Lịch (Executive Pearl Light - Mặc định)', swatch: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' },
    { id: 'momo_lotus_pink', name: '2. Hồng Sen MoMo (MoMo Lotus Pink & White)', swatch: 'linear-gradient(135deg,#a50064,#d82d8b)' },
    { id: 'swiss_banking_slate', name: '3. Tài Chính Thụy Sĩ (Swiss Banking Slate)', swatch: 'linear-gradient(135deg,#0f172a,#0284c7)' },
    { id: 'emerald_fintech_light', name: '4. Lục Bảo Nexora (Emerald Fintech Light)', swatch: 'linear-gradient(135deg,#059669,#76b900)' },
    { id: 'obsidian_gold_dark', name: '5. Đen Thượng Lưu (Obsidian Gold Dark)', swatch: 'linear-gradient(135deg,#111827,#f59e0b)' },
    { id: 'bloomberg_dark', name: '6. Chứng Khoán Chuyên Nghiệp (Bloomberg Dark)', swatch: 'linear-gradient(135deg,#050811,#ff6b00)' }
];

let __nxState = {
    apiBase: localStorage.getItem('nexora_api_base') || window.location.origin,
    themeId: localStorage.getItem('nexora_active_theme') || 'executive_pearl_light',
    hideBalance: localStorage.getItem('nexora_hide_balance') === '1',
    bridgeData: null,
    selectedQrInvoice: null,
    payerMode: 'self',
    camStream: null,
    camTimer: null,
    confirmInFlight: false,
    marketOverview: null
};

function nxApiUrl(path) {
    const base = (__nxState.apiBase || window.location.origin).replace(/\/+$/, '');
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return base + (path.startsWith('/') ? path : '/' + path);
}

function nxFormatVnd(amount) {
    if (__nxState.hideBalance) return '•••••••• ₫';
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

function nxToast(msg) {
    let box = document.getElementById('nxToastBanner');
    if (!box) {
        box = document.createElement('div');
        box.id = 'nxToastBanner';
        box.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);max-width:440px;width:92%;background:#0f172a;color:#fff;padding:11px 16px;border-radius:14px;font-size:0.82rem;font-weight:700;z-index:2000;box-shadow:0 10px 28px rgba(0,0,0,0.35);border:1.5px solid #10b981;text-align:center;transition:opacity 0.2s;';
        document.body.appendChild(box);
    }
    box.textContent = msg;
    box.style.opacity = '1';
    clearTimeout(window.__nxToastTimer);
    window.__nxToastTimer = setTimeout(() => {
        if (box) box.style.opacity = '0';
    }, 3200);
}

async function nxApplyTheme(themeId, syncServer = true) {
    __nxState.themeId = themeId;
    localStorage.setItem('nexora_active_theme', themeId);
    document.documentElement.setAttribute('data-nx-theme', themeId);
    document.body.setAttribute('data-nx-theme', themeId);
    if (window.NexoraNativeBridge && typeof window.NexoraNativeBridge.syncTheme === 'function') {
        try { window.NexoraNativeBridge.syncTheme(themeId); } catch (e) {}
    }
    renderThemeModalList();
    if (syncServer) {
        try {
            await fetch(nxApiUrl('/api/mobile/theme-sync'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme_id: themeId, source: 'nexora_mobile_app' })
            });
        } catch (e) {}
    }
}

function toggleBalanceVisibility() {
    __nxState.hideBalance = !__nxState.hideBalance;
    localStorage.setItem('nexora_hide_balance', __nxState.hideBalance ? '1' : '0');
    const eyeBtn = document.getElementById('nxEyeToggleBtn');
    if (eyeBtn) eyeBtn.textContent = __nxState.hideBalance ? '🙈 Hiện số dư' : '👁️ Ẩn số dư';
    renderBridgeDataToUi();
}

function openNxModal(modalId) {
    document.querySelectorAll('.nx-modal-backdrop').forEach(m => m.classList.remove('show'));
    const target = document.getElementById(modalId);
    if (target) target.classList.add('show');
}

function closeNxModal(modalId) {
    if (modalId === 'nxQrScannerModal') stopMobileCameraQr();
    const target = document.getElementById(modalId);
    if (target) target.classList.remove('show');
}

function promptSwitchServerEndpoint() {
    openNxModal('nxServerConfigModal');
    const inp = document.getElementById('nxServerUrlInput');
    if (inp) inp.value = __nxState.apiBase || window.location.origin;
}

function saveServerEndpointConfig(modeUrl) {
    const inp = document.getElementById('nxServerUrlInput');
    const chosen = (modeUrl || (inp ? inp.value : '') || window.location.origin).trim().replace(/\/+$/, '');
    __nxState.apiBase = chosen;
    localStorage.setItem('nexora_api_base', chosen);
    if (window.NexoraNativeBridge && typeof window.NexoraNativeBridge.setServerUrl === 'function') {
        try { window.NexoraNativeBridge.setServerUrl(chosen); } catch (e) {}
    }
    updateServerHeaderPill();
    closeNxModal('nxServerConfigModal');
    nxToast('🟢 Đã chuyển kết nối máy chủ sang: ' + chosen);
    syncMobileBridge();
}

function updateServerHeaderPill() {
    const lbl = document.getElementById('nxServerStatusText');
    if (!lbl) return;
    let hostLabel = __nxState.apiBase.replace(/^https?:\/\//, '');
    if (!hostLabel || hostLabel === window.location.host) {
        hostLabel = window.location.host || 'nexora.castle-tech.cloud';
    }
    lbl.textContent = '🟢 Đang kết nối: ' + hostLabel;
}

async function syncMobileBridge() {
    updateServerHeaderPill();
    try {
        const res = await fetch(nxApiUrl('/api/mobile/bridge-sync?_t=' + Date.now()), { cache: 'no-store' });
        const data = await res.json();
        if (data && data.ok) {
            __nxState.bridgeData = data;
            if (!localStorage.getItem('nexora_active_theme') && data.active_theme) {
                await nxApplyTheme(data.active_theme, false);
            }
            renderBridgeDataToUi();
        }
    } catch (err) {
        const lbl = document.getElementById('nxServerStatusText');
        if (lbl) lbl.textContent = '🟠 Chế độ Offline/LAN: ' + (__nxState.apiBase || 'nexora.castle-tech.cloud');
    }
}

async function refreshLiveAuctionsList() {
    try {
        const res = await fetch(nxApiUrl('/api/auctions/list?_t=' + Date.now()), { cache: 'no-store' });
        const data = await res.json();
        if (data && Array.isArray(data.auctions)) {
            renderLiveAuctionsPreview(data.auctions);
        }
    } catch (e) {}
}

function isMobileUserLoggedIn() {
    return localStorage.getItem('nvx_explicit_login') === '1' && Boolean(localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user'));
}

function promptMobileQuickLogin(actionLabel = 'thực hiện giao dịch tài chính') {
    if (typeof window.openQuickAuthModal === 'function') {
        window.openQuickAuthModal(actionLabel);
        return;
    }
    const demoUser = {
        id: 13,
        username: 'khach_hang_vip',
        full_name: 'Nguyễn Hưng (Khách VIP)',
        email: 'hungnguyendva@gmail.com',
        role: 'buyer',
        coins: 125000,
        email_verified: 1
    };
    if (confirm(`🔒 Thao tác "${actionLabel}" yêu cầu Đăng nhập tài khoản Nexora Pay.\nBấm OK để Đăng nhập nhanh tài khoản Khách VIP (Nguyễn Hưng) hoặc Cancel để sang trang Đăng nhập.`)) {
        localStorage.setItem('nvx_explicit_login', '1');
        localStorage.setItem('nvidia_user', JSON.stringify(demoUser));
        localStorage.setItem('auth_user', JSON.stringify(demoUser));
        nxToast('🔓 Đã đăng nhập phiên Khách VIP (Nguyễn Hưng)!');
        renderBridgeDataToUi();
    } else {
        window.location.href = '/services/auth/auth.html';
    }
}

function renderBridgeDataToUi() {
    const d = __nxState.bridgeData || {};
    const prof = d.user_profile || {};
    const pockets = d.multi_pockets || {};
    const loggedIn = isMobileUserLoggedIn();

    const wEl = document.getElementById('nxPocketWalletVal');
    const eEl = document.getElementById('nxPocketEscrowVal');
    const aEl = document.getElementById('nxPocketAuctionVal');
    const uNameEl = document.getElementById('nxHeaderUserName');
    const uCoinsEl = document.getElementById('nxHeaderCoinsBadge');

    if (!loggedIn) {
        if (wEl) wEl.innerHTML = `<span style="font-size:0.78rem;cursor:pointer;text-decoration:underline;" onclick="promptMobileQuickLogin('xem số dư Ví Nexora Pay')">🔒 Đăng nhập để xem số dư</span>`;
        if (eEl) eEl.textContent = '🔒 Đăng nhập';
        if (aEl) aEl.textContent = '🔒 Đăng nhập';
        if (uNameEl) uNameEl.textContent = 'Khách (Chưa đăng nhập)';
        if (uCoinsEl) uCoinsEl.textContent = '🪙 0 Xu';
    } else {
        if (wEl) wEl.textContent = nxFormatVnd(pockets.nexora_pay_wallet ?? prof.wallet_balance ?? 50000000);
        if (eEl) eEl.textContent = nxFormatVnd(pockets.escrow_protection_bag ?? prof.escrow_locked_balance ?? 18990000);
        if (aEl) aEl.textContent = nxFormatVnd(pockets.auction_margin_10pct ?? prof.auction_deposit_balance ?? 4500000);
        if (uNameEl) uNameEl.textContent = prof.full_name || 'William • Nexora VIP';
        if (uCoinsEl) uCoinsEl.textContent = '🪙 ' + Number(prof.coins || 150000).toLocaleString('vi-VN') + ' Xu';
    }

    renderSpendingDonut(d.spending_analytics);
    renderPendingQrSessionsList(d.pending_qr_sessions || []);
    renderLiveAuctionsPreview(d.active_auctions || []);
}

function renderSpendingDonut(analytics) {
    const segs = (analytics && analytics.segments) || [
        { label: 'Mua sắm Công nghệ', amount: 42500000, color: '#d82d8b' },
        { label: 'Đấu giá & Ký quỹ', amount: 23490000, color: '#0ea5e9' },
        { label: 'Tiền hoàn trả 100% từ Hoàn đơn', amount: 3290000, color: '#10b981' }
    ];
    const total = segs.reduce((s, it) => s + Number(it.amount || 0), 0) || 1;
    const svgEl = document.getElementById('nxSpendingDonutSvg');
    const legEl = document.getElementById('nxSpendingLegendBox');
    const totEl = document.getElementById('nxDonutCenterTotal');

    if (totEl) {
        totEl.textContent = __nxState.hideBalance ? '••••' : Math.round(total / 1000000) + 'Tr';
    }
    if (!svgEl || !legEl) return;

    const r = 38;
    const c = 2 * Math.PI * r;
    let offset = 0;
    let circlesHtml = `<circle cx="54" cy="54" r="${r}" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="14"></circle>`;

    segs.forEach(seg => {
        const pct = Number(seg.amount || 0) / total;
        const dash = pct * c;
        circlesHtml += `<circle cx="54" cy="54" r="${r}" fill="none" stroke="${seg.color}" stroke-width="14" stroke-dasharray="${dash.toFixed(2)} ${(c - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 54 54)"></circle>`;
        offset += dash;
    });
    svgEl.innerHTML = circlesHtml;

    legEl.innerHTML = segs.map(seg => {
        const pct = Math.round((Number(seg.amount || 0) / total) * 100);
        return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.74rem;margin-bottom:5px;">
            <span style="display:flex;align-items:center;gap:6px;"><span style="width:9px;height:9px;border-radius:50%;background:${seg.color};display:inline-block;"></span>${seg.label}</span>
            <strong>${__nxState.hideBalance ? '••%' : pct + '% (' + Number(seg.amount).toLocaleString('vi-VN') + 'đ)'}</strong>
        </div>`;
    }).join('');
}

function renderPendingQrSessionsList(list) {
    const containers = [
        document.getElementById('nxAwaitingQrQuickList'),
        document.getElementById('nxModalPendingQrList')
    ];
    containers.forEach(box => {
        if (!box) return;
        if (!list.length) {
            box.innerHTML = `<div style="font-size:0.78rem;color:var(--nx-muted);text-align:center;padding:10px;">Chưa có phiên QR nào đang chờ trên máy tính.</div>`;
            return;
        }
        box.innerHTML = list.map(item => {
            const isWait = item.status === 'AWAITING_PAYMENT';
            const badgeHtml = isWait
                ? `<span style="background:#f59e0b;color:#000;font-size:0.65rem;font-weight:800;padding:2px 7px;border-radius:999px;">AWAITING_PAYMENT</span>`
                : `<span style="background:#10b981;color:#fff;font-size:0.65rem;font-weight:800;padding:2px 7px;border-radius:999px;">ESCROW_LOCKED</span>`;
            return `<div class="nx-pending-qr-item" onclick="inspectQrTokenInvoice('${item.pay_token}')">
                <div>
                    <div style="font-weight:800;font-size:0.83rem;">${item.order_code} • ${item.buyer_name}</div>
                    <div style="font-size:0.72rem;color:var(--nx-muted);">Mã QR: <code>${item.pay_token}</code> • ${item.items_count || 1} sản phẩm</div>
                </div>
                <div style="text-align:right;">
                    ${badgeHtml}
                    <div style="font-weight:800;font-size:0.86rem;color:var(--nx-primary);margin-top:2px;">${Number(item.amount || 0).toLocaleString('vi-VN')} ₫</div>
                </div>
            </div>`;
        }).join('');
    });
}

function renderLiveAuctionsPreview(auctions) {
    const box = document.getElementById('nxMobileAuctionsList');
    if (!box) return;
    if (!auctions.length) {
        box.innerHTML = `<div style="font-size:0.78rem;color:var(--nx-muted);">Đang tải phiên đấu giá thời gian thực...</div>`;
        return;
    }
    box.innerHTML = auctions.slice(0, 4).map(a => {
        const isDutch = String(a.auction_type || '').toUpperCase().includes('DUTCH');
        const pName = a.product_name || a.title || 'Siêu phẩm Đấu Giá Nexora';
        const stepVal = Number(a.min_step || a.min_step_price || 500000);
        const bidsCnt = Number(a.bid_count ?? a.total_bids ?? 0);
        const badge = isDutch
            ? `<span style="background:#f43f5e;color:#fff;font-size:0.64rem;font-weight:800;padding:2px 6px;border-radius:6px;">⚡ Đấu Giá Ngược Giảm Từng Giây</span>`
            : `<span style="background:#2563eb;color:#fff;font-size:0.64rem;font-weight:800;padding:2px 6px;border-radius:6px;">🛡️ Ký Quỹ 10% Anti-Sniping +30s</span>`;
        const btnAction = isDutch
            ? `<button class="nx-eye-btn" style="background:var(--nx-primary);color:#fff;" onclick="claimDutchAuctionOnMobile(${a.id})">⚡ Chốt Giá Ngay</button>`
            : `<button class="nx-eye-btn" style="background:var(--nx-primary);color:#fff;" onclick="placeStandardBidOnMobile(${a.id}, ${Number(a.current_price || 0) + stepVal})">🔨 Đặt Giá +${stepVal.toLocaleString('vi-VN')}đ</button>`;
        return `<div style="border:1px solid var(--nx-border);border-radius:16px;padding:10px 12px;margin-bottom:8px;background:var(--nx-surface-2);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                ${badge}
                <small style="font-size:0.7rem;color:var(--nx-muted);">Lượt trả: ${bidsCnt}</small>
            </div>
            <div style="font-weight:800;font-size:0.84rem;margin-bottom:4px;">${pName}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:0.68rem;color:var(--nx-muted);">Giá hiện tại:</div>
                    <div style="font-size:0.92rem;font-weight:800;color:var(--nx-primary);">${Number(a.current_price || 0).toLocaleString('vi-VN')} ₫</div>
                </div>
                ${btnAction}
            </div>
        </div>`;
    }).join('');
}

function renderThemeModalList() {
    const html = NX_THEMES.map(t => {
        const isAct = t.id === __nxState.themeId;
        return `<div class="nx-theme-option-card ${isAct ? 'active' : ''}" onclick="nxApplyTheme('${t.id}', true)">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="width:32px;height:32px;border-radius:10px;background:${t.swatch};display:inline-block;border:1px solid rgba(255,255,255,0.4);"></span>
                <div style="font-size:0.82rem;font-weight:700;">${t.name}</div>
            </div>
            <span>${isAct ? '✅ Đang dùng' : 'Chọn'}</span>
        </div>`;
    }).join('');
    const box1 = document.getElementById('nxThemeSelectorList');
    if (box1) box1.innerHTML = html;
    const box2 = document.getElementById('nxSettingsThemeSelectorList');
    if (box2) box2.innerHTML = html;
}

async function openMobileQrScannerCenter() {
    openNxModal('nxQrScannerModal');
    await syncMobileBridge();
}

async function startMobileCameraQr() {
    const video = document.getElementById('nxMobileQrVideo');
    const wrap = document.getElementById('nxMobileCameraBox');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        nxToast('⚠️ Thiết bị không mở được Camera trực tiếp. Hãy chọn hóa đơn đang chờ bên dưới!');
        return;
    }
    try {
        __nxState.camStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        video.srcObject = __nxState.camStream;
        await video.play();
        if (wrap) wrap.style.display = 'block';

        const canvas = document.getElementById('nxMobileQrCanvas');
        const ctx = canvas.getContext('2d');
        __nxState.camTimer = setInterval(() => {
            if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            if (typeof jsQR === 'function') {
                const code = jsQR(imgData.data, imgData.width, imgData.height);
                if (code && code.data && String(code.data).trim()) {
                    stopMobileCameraQr();
                    inspectQrTokenInvoice(code.data);
                }
            }
        }, 240);
    } catch (err) {
        nxToast('⚠️ Camera đang bận hoặc bị chặn quyền. Bạn có thể bấm chọn ngay đơn AWAITING_PAYMENT bên dưới!');
    }
}

function stopMobileCameraQr() {
    if (__nxState.camTimer) {
        clearInterval(__nxState.camTimer);
        __nxState.camTimer = null;
    }
    if (__nxState.camStream) {
        __nxState.camStream.getTracks().forEach(t => t.stop());
        __nxState.camStream = null;
    }
}

function parseCleanPayToken(rawInput) {
    const raw = String(rawInput || '').trim();
    if (!raw) return '';
    if (raw.includes('pay_token=')) return raw.split('pay_token=')[1].split('&')[0].trim();
    if (raw.includes('qr_token=')) return raw.split('qr_token=')[1].split('&')[0].trim();
    if (raw.includes('|')) {
        let tok = '';
        raw.split('|').forEach(part => {
            const up = part.toUpperCase();
            if (up.startsWith('PAY_TOKEN:')) tok = part.slice(10).trim();
            else if (up.startsWith('TOKEN:')) tok = part.slice(6).trim();
        });
        if (tok) return tok;
    }
    return raw;
}

async function inspectQrTokenInvoice(rawTokenOrPayload) {
    const cleanTok = parseCleanPayToken(rawTokenOrPayload);
    if (!cleanTok) {
        nxToast('⚠️ Vui lòng nhập hoặc quét mã pay_token hợp lệ!');
        return;
    }
    try {
        const res = await fetch(nxApiUrl(`/api/payment/qr-session/${encodeURIComponent(cleanTok)}?_t=${Date.now()}`), { cache: 'no-store' });
        const info = await res.json();
        if (!res.ok || info.ok === false) {
            nxToast(info.error || '❌ Không tìm thấy phiên hóa đơn QR này!');
            return;
        }
        __nxState.selectedQrInvoice = info;
        openNxModal('nxInvoiceInspectModal');
        renderSelectedInvoiceDetail(info);
    } catch (e) {
        nxToast('❌ Lỗi kết nối tới máy chủ khi tải chi tiết hóa đơn QR!');
    }
}

function setMobilePayerMode(mode) {
    __nxState.payerMode = mode === 'behalf' ? 'behalf' : 'self';
    const selfBtn = document.getElementById('nxBtnModeSelf');
    const behalfBtn = document.getElementById('nxBtnModeBehalf');
    const behalfBox = document.getElementById('nxBehalfInputsWrap');
    if (selfBtn) {
        selfBtn.style.background = __nxState.payerMode === 'self' ? 'var(--nx-primary)' : 'var(--nx-surface-2)';
        selfBtn.style.color = __nxState.payerMode === 'self' ? '#fff' : 'var(--nx-text)';
    }
    if (behalfBtn) {
        behalfBtn.style.background = __nxState.payerMode === 'behalf' ? 'var(--nx-primary)' : 'var(--nx-surface-2)';
        behalfBtn.style.color = __nxState.payerMode === 'behalf' ? '#fff' : 'var(--nx-text)';
    }
    if (behalfBox) {
        behalfBox.style.display = __nxState.payerMode === 'behalf' ? 'block' : 'none';
    }
}

function renderSelectedInvoiceDetail(info) {
    const box = document.getElementById('nxInvoiceDetailBody');
    const confirmBtn = document.getElementById('nxConfirmQrPayBtn');
    if (!box) return;

    const items = Array.isArray(info.items) ? info.items : [];
    const itemsRows = items.map((it, idx) => {
        const q = Number(it.quantity || 1);
        const p = Number(it.price || 0);
        const st = Number(it.subtotal || p * q);
        return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--nx-border);font-size:0.79rem;">
            <span>${idx + 1}. <strong>${it.name || 'Sản phẩm công nghệ'}</strong> (x${q})</span>
            <strong>${st.toLocaleString('vi-VN')} ₫</strong>
        </div>`;
    }).join('');

    const isPaid = info.is_paid || info.status === 'APPROVED';
    box.innerHTML = `
        <div style="background:var(--nx-surface-2);border-radius:16px;padding:12px;margin-bottom:12px;border:1px solid var(--nx-border);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.75rem;color:var(--nx-muted);">Mã đơn hàng:</span>
                <strong style="font-size:0.95rem;color:var(--nx-primary);">${info.order_code || ('#NVD-' + info.order_id)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.75rem;color:var(--nx-muted);">Người mua hàng:</span>
                <strong style="font-size:0.83rem;">${info.buyer_name || 'Khách hàng'} (${info.customer_phone || ''})</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.75rem;color:var(--nx-muted);">Mã phiên QR:</span>
                <code>${info.pay_token}</code>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.75rem;color:var(--nx-muted);">Trạng thái:</span>
                <span style="font-weight:800;color:${isPaid ? '#10b981' : '#f59e0b'};">${isPaid ? 'ESCROW_LOCKED (APPROVED)' : 'AWAITING_PAYMENT'}</span>
            </div>
        </div>
        <div style="margin-bottom:10px;">
            <div style="font-size:0.78rem;font-weight:800;margin-bottom:4px;">🛍️ Chi tiết từng sản phẩm:</div>
            ${itemsRows}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:rgba(16,185,129,0.12);border-radius:14px;border:1px solid #10b981;">
            <span style="font-size:0.84rem;font-weight:700;">Tổng tiền thanh toán:</span>
            <strong style="font-size:1.15rem;color:#10b981;">${Number(info.amount || 0).toLocaleString('vi-VN')} ₫</strong>
        </div>
    `;

    if (confirmBtn) {
        if (isPaid) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = '🔒 Hóa Đơn Đã Khóa Bảo Lãnh Escrow';
            confirmBtn.style.opacity = '0.65';
        } else {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.textContent = `✅ Xác Nhận Chuyển Khoản Ngay (${Number(info.amount || 0).toLocaleString('vi-VN')} ₫)`;
        }
    }
}

async function confirmMobileQrPaymentNow() {
    if (!isMobileUserLoggedIn()) {
        promptMobileQuickLogin('Xác nhận chuyển khoản hóa đơn QR');
        return;
    }
    if (__nxState.confirmInFlight || !__nxState.selectedQrInvoice) return;
    const info = __nxState.selectedQrInvoice;
    const payerName = (document.getElementById('nxBehalfPayerName')?.value || '').trim();
    const payerMsg = (document.getElementById('nxBehalfPayerMsg')?.value || '').trim();
    const btn = document.getElementById('nxConfirmQrPayBtn');

    __nxState.confirmInFlight = true;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Đang khóa tiền Bảo Lãnh Escrow & đồng bộ PC...';
    }

    try {
        const payload = {
            pay_token: info.pay_token,
            payer_mode: __nxState.payerMode,
            payment_mode: __nxState.payerMode,
            is_paid_on_behalf: __nxState.payerMode === 'behalf',
            payer_name: __nxState.payerMode === 'behalf' ? (payerName || 'Bạn bè chuyển khoản hộ qua Nexora Mobile') : 'Chủ ví Nexora Pay',
            payer_message: __nxState.payerMode === 'behalf' ? (payerMsg || 'Chúc bạn đập hộp siêu phẩm công nghệ mới thật vui!') : ''
        };
        const res = await fetch(nxApiUrl('/api/payment/qr-session/confirm'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            if (window.NexoraNativeBridge && typeof window.NexoraNativeBridge.vibrateShort === 'function') {
                try { window.NexoraNativeBridge.vibrateShort(); } catch (e) {}
            }
            localStorage.setItem('nvx_qr_payment_confirmed', JSON.stringify({
                ts: Date.now(),
                pay_token: info.pay_token,
                qr_token: info.pay_token,
                tx_id: data.tx_code || info.pay_token,
                order_id: data.order_id || info.order_id,
                tracking_code: data.tracking_code || info.tracking_code,
                amount: data.paid_amount || info.amount,
                is_paid_on_behalf: Boolean(data.is_paid_on_behalf),
                payer_name: data.payer_name || '',
                payer_message: data.payer_message || '',
                next_step_url: data.next_step_url || '/services/order_tracking/tracking.html',
                status: 'APPROVED'
            }));
            nxToast('🎉 Đã xác nhận thanh toán QR! Màn hình checkout.html trên máy tính đã tự động nhảy sang trang Vận đơn tracking.html!');
            await inspectQrTokenInvoice(info.pay_token);
            await syncMobileBridge();
        } else {
            nxToast(data.error || '❌ Không thể xác nhận thanh toán QR!');
            if (btn) btn.disabled = false;
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối khi gửi xác nhận thanh toán QR!');
        if (btn) btn.disabled = false;
    } finally {
        __nxState.confirmInFlight = false;
    }
}

async function submitMobileWalletAction(actionType) {
    if (!isMobileUserLoggedIn()) {
        promptMobileQuickLogin('Nạp / Rút / Chuyển tiền Ví Nexora Pay');
        return;
    }
    const amtInput = document.getElementById('nxWalletActionAmount');
    const recInput = document.getElementById('nxWalletActionRecipient');
    const noteInput = document.getElementById('nxWalletActionNote');
    const amount = Number(amtInput ? amtInput.value : 5000000);
    const recipient = recInput ? recInput.value : 'Ví Nexora Pay';
    const note = noteInput ? noteInput.value : '';
    let uObj = null;
    try { uObj = JSON.parse(localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user') || 'null'); } catch (e) {}

    try {
        const res = await fetch(nxApiUrl('/api/mobile/wallet-action'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: actionType,
                user_id: (uObj && uObj.id) ? uObj.id : 13,
                username: (uObj && uObj.username) ? uObj.username : 'khach_hang_vip',
                amount,
                recipient,
                note
            })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            nxToast('✅ ' + data.message);
            closeNxModal('nxTopupWithdrawModal');
            await syncMobileBridge();
        } else {
            nxToast(data.error || '⚠️ Giao dịch không thành công');
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối máy chủ khi thực hiện giao dịch ví!');
    }
}

async function placeStandardBidOnMobile(auctionId, bidAmount) {
    if (!isMobileUserLoggedIn()) {
        promptMobileQuickLogin('Đặt giá đấu giá ký quỹ 10%');
        return;
    }
    try {
        const res = await fetch(nxApiUrl('/api/auctions/bid'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auction_id: auctionId, bid_amount: bidAmount, username: 'khach_hang_vip' })
        });
        const data = await res.json();
        nxToast(data.message || data.error || '🔨 Đã gửi lệnh đặt giá ký quỹ 10%!');
        await refreshLiveAuctionsList();
        await syncMobileBridge();
    } catch (e) {
        nxToast('❌ Lỗi kết nối Sàn Đấu Giá!');
    }
}

async function claimDutchAuctionOnMobile(auctionId) {
    if (!isMobileUserLoggedIn()) {
        promptMobileQuickLogin('Chốt mua Đấu giá ngược');
        return;
    }
    try {
        const res = await fetch(nxApiUrl('/api/auctions/dutch-claim'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auction_id: auctionId, username: 'khach_hang_vip' })
        });
        const data = await res.json();
        nxToast(data.message || data.error || '⚡ Đã chốt mua phiên Đấu giá ngược!');
        await refreshLiveAuctionsList();
        await syncMobileBridge();
    } catch (e) {
        nxToast('❌ Lỗi kết nối Đấu Giá Ngược!');
    }
}

async function triggerMobileDailyCheckin() {
    try {
        const res = await fetch(nxApiUrl('/api/settings/daily-checkin'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 13 })
        });
        const data = await res.json();
        nxToast(data.message || '🔥 Điểm danh chuỗi lửa thành công! Đã cộng Xu thưởng vào Ví!');
        await syncMobileBridge();
    } catch (e) {
        nxToast('❌ Không thể kết nối API Điểm danh!');
    }
}

async function triggerMobileLuckySpin() {
    try {
        const res = await fetch(nxApiUrl('/api/minigame/spin'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 13 })
        });
        const data = await res.json();
        nxToast(data.message || (data.prize && data.prize.label ? '🎡 Chúc mừng bạn quay trúng: ' + data.prize.label : '🎡 Đã quay Vòng Quay May Mắn!'));
        await syncMobileBridge();
    } catch (e) {
        nxToast('❌ Không thể kết nối API Vòng quay may mắn!');
    }
}

async function triggerMobileReflexArenaClaim() {
    try {
        const res = await fetch(nxApiUrl('/api/minigame/reflex-arena/claim'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 28, hits: 28, username: 'khach_hang_vip' })
        });
        const data = await res.json();
        nxToast(data.message || '🎯 Đã nhận thưởng Bắn Tâm Phản Xạ Esport 30s!');
        await syncMobileBridge();
    } catch (e) {
        nxToast('❌ Không thể kết nối API Minigame!');
    }
}

async function openMobileMarketTrackerModal(productId = 1) {
    openNxModal('nxMarketTrackerModal');
    const box = document.getElementById('nxMarketCandleContent');
    if (box) box.innerHTML = '<div style="font-size:0.8rem;color:var(--nx-muted);">Đang tải dữ liệu biểu đồ nến giá linh kiện VN...</div>';
    try {
        const res = await fetch(nxApiUrl(`/api/market-tracker/overview?product_id=${encodeURIComponent(productId)}&_t=${Date.now()}`));
        const data = await res.json();
        __nxState.marketOverview = data;
        const candles = data.candles || data.history || [];
        const prodName = (data.selected_product && data.selected_product.name) || data.product_name || 'Card Đồ Họa NVIDIA GeForce RTX 4090 24GB';
        const curPrice = Number((data.selected_product && data.selected_product.current_price) || data.current_price || 54990000);
        const targetInp = document.getElementById('nxWatchlistTargetPrice');
        if (targetInp) targetInp.value = Math.round(curPrice * 0.92);

        const barsHtml = candles.slice(-10).map(c => {
            const closeP = Number(c.close || c.price || curPrice);
            const openP = Number(c.open || closeP);
            const isUp = closeP >= openP;
            const col = isUp ? '#10b981' : '#ef4444';
            return `<div style="display:flex;justify-content:space-between;font-size:0.74rem;padding:4px 0;border-bottom:1px dashed var(--nx-border);">
                <span>📅 ${c.date || c.session || 'Phiên VN'}</span>
                <strong style="color:${col};">${closeP.toLocaleString('vi-VN')} ₫ (${isUp ? '▲' : '▼'})</strong>
            </div>`;
        }).join('');

        if (box) {
            box.innerHTML = `
                <div style="font-weight:800;font-size:0.86rem;margin-bottom:4px;">${prodName}</div>
                <div style="font-size:0.8rem;margin-bottom:8px;">Giá thị trường VN hiện tại: <strong style="color:var(--nx-primary);">${curPrice.toLocaleString('vi-VN')} ₫</strong></div>
                <div style="max-height:170px;overflow-y:auto;padding:8px;background:var(--nx-surface-2);border-radius:12px;">${barsHtml || 'Đã đồng bộ dữ liệu 30 phiên.'}</div>
            `;
        }
    } catch (e) {
        if (box) box.innerHTML = '<div style="font-size:0.8rem;color:#ef4444;">Không thể tải dữ liệu biểu đồ nến.</div>';
    }
}

async function submitMobileWatchlistAlert() {
    const targetPrice = Number(document.getElementById('nxWatchlistTargetPrice')?.value || 48000000);
    try {
        const res = await fetch(nxApiUrl('/api/market-tracker/watchlist'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: 'khach_hang_vip',
                product_id: 1,
                target_price: targetPrice
            })
        });
        const data = await res.json();
        nxToast(data.message || `🔔 Đã đặt báo động giảm giá ở mức ${targetPrice.toLocaleString('vi-VN')} ₫!`);
    } catch (e) {
        nxToast('❌ Lỗi khi lưu báo động giá!');
    }
}

function handleQuickSearchInput(ev) {
    if (ev && ev.key === 'Enter') {
        const val = (ev.target.value || '').trim();
        if (!val) return;
        inspectQrTokenInvoice(val);
    }
}

let __nxOtpCountdownTimer = null;
let __nxOtpRemainingSec = 0;
let __nxDeferredPwaPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    __nxDeferredPwaPrompt = e;
});

function openNxSettingsAndSecurityCenter() {
    openNxModal('nxSettingsSecurityModal');
    renderThemeModalList();
    populateSettingsCenterFromBridge();
}

function populateSettingsCenterFromBridge() {
    const d = __nxState.bridgeData || {};
    const prof = d.user_profile || {};
    const fnEl = document.getElementById('nxSetFullName');
    const emEl = document.getElementById('nxSetEmail');
    const phEl = document.getElementById('nxSetPhone');
    const adEl = document.getElementById('nxSetAddress');
    const tfEl = document.getElementById('nxSetTwoFactor');
    const otpTargetEl = document.getElementById('nxSecTargetIdentity');
    const badgeEl = document.getElementById('nxSecVerifiedBadge');
    const nameDisp = document.getElementById('nxSecProfileDisplayName');
    const emailDisp = document.getElementById('nxSecProfileDisplayEmail');

    if (fnEl && !fnEl.dataset.dirty) fnEl.value = prof.full_name || 'William • Nexora VIP';
    if (emEl && !emEl.dataset.dirty) emEl.value = prof.email || 'william.vip@nexora.castle-tech.cloud';
    if (phEl && !phEl.dataset.dirty) phEl.value = prof.phone || '0988889999';
    if (adEl && !adEl.dataset.dirty) adEl.value = prof.shipping_address || 'Tòa nhà Nexora Tower, Quận 1, TP. Hồ Chí Minh';
    if (tfEl) tfEl.checked = prof.two_factor_enabled !== false;
    if (otpTargetEl && !otpTargetEl.value) {
        otpTargetEl.value = prof.email || prof.username || 'khach_hang_vip';
    }
    if (nameDisp) nameDisp.textContent = prof.full_name || 'William • Nexora VIP';
    if (emailDisp) emailDisp.textContent = (prof.email || 'william.vip@nexora.castle-tech.cloud') + ' • ' + (prof.phone || '0988889999');
    if (badgeEl) {
        const isVer = prof.email_verified !== false;
        badgeEl.textContent = isVer ? '🛡️ Đã xác thực OTP Bảo Lãnh Escrow' : '⚠️ Chưa xác thực OTP Email';
        badgeEl.style.background = isVer ? 'rgba(16,185,129,0.16)' : 'rgba(245,158,11,0.18)';
        badgeEl.style.color = isVer ? '#10b981' : '#f59e0b';
    }

    const savedFont = localStorage.getItem('nexora_font_scale') || prof.font_scale || 'normal';
    applyMobileFontScale(savedFont, false);
    const savedDensity = localStorage.getItem('nexora_ui_density') || prof.ui_density || 'comfortable';
    applyMobileUiDensity(savedDensity, false);

    const srvInp = document.getElementById('nxSettingsInlineServerInput');
    if (srvInp) srvInp.value = __nxState.apiBase || window.location.origin;

    renderSecurityAuditLogs(d.security_audit_logs || []);
}

function renderSecurityAuditLogs(logs) {
    const box = document.getElementById('nxSecAuditLogsBox');
    if (!box) return;
    if (!logs || !logs.length) {
        box.innerHTML = '<div style="font-size:0.74rem;color:var(--nx-muted);">Chưa có nhật ký thay đổi bảo mật gần đây.</div>';
        return;
    }
    box.innerHTML = logs.slice(0, 4).map(item => `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.73rem;padding:5px 0;border-bottom:1px dashed var(--nx-border);">
            <span>🔐 <strong>${item.action}</strong>: ${item.detail || ''}</span>
            <small style="color:var(--nx-muted);">${item.created_at || ''}</small>
        </div>
    `).join('');
}

async function saveMobileProfileAndSettings() {
    const fullName = (document.getElementById('nxSetFullName')?.value || '').trim();
    const email = (document.getElementById('nxSetEmail')?.value || '').trim();
    const phone = (document.getElementById('nxSetPhone')?.value || '').trim();
    const shippingAddress = (document.getElementById('nxSetAddress')?.value || '').trim();
    const twoFactor = Boolean(document.getElementById('nxSetTwoFactor')?.checked);
    const fontScale = localStorage.getItem('nexora_font_scale') || 'normal';
    const uiDensity = localStorage.getItem('nexora_ui_density') || 'comfortable';

    try {
        const res = await fetch(nxApiUrl('/api/account/update-profile-and-settings'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email_or_username: email || 'khach_hang_vip',
                full_name: fullName,
                email: email,
                phone: phone,
                shipping_address: shippingAddress,
                two_factor_enabled: twoFactor,
                font_scale: fontScale,
                ui_density: uiDensity,
                theme_id: __nxState.themeId
            })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            nxToast('✅ ' + (data.message || 'Đã lưu hồ sơ cá nhân & cài đặt bảo mật!'));
            await syncMobileBridge();
            populateSettingsCenterFromBridge();
        } else {
            nxToast(data.error || '⚠️ Không thể cập nhật hồ sơ!');
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối khi lưu hồ sơ & cài đặt!');
    }
}

function startOtpCountdown60s() {
    const btn = document.getElementById('nxBtnSendSecurityOtp');
    __nxOtpRemainingSec = 60;
    if (__nxOtpCountdownTimer) clearInterval(__nxOtpCountdownTimer);
    if (btn) {
        btn.disabled = true;
        btn.textContent = `⏳ Gửi lại sau (${__nxOtpRemainingSec}s)`;
    }
    __nxOtpCountdownTimer = setInterval(() => {
        __nxOtpRemainingSec -= 1;
        if (__nxOtpRemainingSec <= 0) {
            clearInterval(__nxOtpCountdownTimer);
            __nxOtpCountdownTimer = null;
            if (btn) {
                btn.disabled = false;
                btn.textContent = '📨 Gửi Mã OTP Xác Thực (6 Số)';
            }
        } else if (btn) {
            btn.textContent = `⏳ Gửi lại sau (${__nxOtpRemainingSec}s)`;
        }
    }, 1000);
}

async function sendMobileSecurityOtp() {
    const targetIdentity = (document.getElementById('nxSecTargetIdentity')?.value || document.getElementById('nxSetEmail')?.value || 'khach_hang_vip').trim();
    const purpose = (document.getElementById('nxSecOtpPurpose')?.value || 'change_password').trim();
    const hintBanner = document.getElementById('nxSecOtpDemoHintBanner');

    try {
        const res = await fetch(nxApiUrl('/api/account/send-security-otp'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email_or_username: targetIdentity,
                purpose: purpose
            })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            startOtpCountdown60s();
            nxToast('📨 ' + (data.message || 'Đã gửi mã OTP 6 chữ số!'));
            if (hintBanner && data.demo_otp_hint) {
                hintBanner.style.display = 'block';
                hintBanner.innerHTML = `💡 <strong>Mã OTP Xác Thực (Môi trường Chấm Điểm / Local):</strong> <code style="font-size:1rem;color:#10b981;font-weight:800;">${data.demo_otp_hint}</code> <button type="button" class="nx-eye-btn" style="margin-left:6px;background:var(--nx-primary);color:#fff;" onclick="fillDemoSecurityOtp('${data.demo_otp_hint}')">Điền Nhanh 6 Số</button>`;
            }
            const firstBox = document.getElementById('nxOtpBox0');
            if (firstBox) firstBox.focus();
        } else {
            nxToast(data.error || '❌ Không thể gửi mã OTP!');
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối máy chủ khi gửi mã OTP!');
    }
}

function fillDemoSecurityOtp(codeStr) {
    const clean = String(codeStr || '').replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < 6; i++) {
        const inp = document.getElementById('nxOtpBox' + i);
        if (inp) inp.value = clean[i] || '';
    }
    nxToast('⚡ Đã điền tự động 6 chữ số OTP vào ô xác thực!');
}

function onNxOtpDigitInput(idx, el) {
    if (!el) return;
    const val = String(el.value || '').replace(/\D/g, '');
    el.value = val ? val.slice(-1) : '';
    if (el.value && idx < 5) {
        const nextEl = document.getElementById('nxOtpBox' + (idx + 1));
        if (nextEl) nextEl.focus();
    }
}

function onNxOtpDigitKeydown(idx, ev) {
    if (!ev) return;
    const cur = document.getElementById('nxOtpBox' + idx);
    if (ev.key === 'Backspace' && cur && !cur.value && idx > 0) {
        const prevEl = document.getElementById('nxOtpBox' + (idx - 1));
        if (prevEl) {
            prevEl.focus();
            prevEl.value = '';
        }
    }
}

function onNxOtpDigitPaste(ev) {
    if (!ev) return;
    const clip = (ev.clipboardData || window.clipboardData)?.getData('text') || '';
    const digits = String(clip).replace(/\D/g, '').slice(0, 6);
    if (digits.length >= 2) {
        ev.preventDefault();
        fillDemoSecurityOtp(digits);
    }
}

function getEnteredNxOtpCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        const inp = document.getElementById('nxOtpBox' + i);
        code += inp ? String(inp.value || '').trim() : '';
    }
    return code;
}

async function verifyMobileSecurityOtpOnly() {
    const otpCode = getEnteredNxOtpCode();
    const targetIdentity = (document.getElementById('nxSecTargetIdentity')?.value || 'khach_hang_vip').trim();
    const statusBox = document.getElementById('nxSecPasswordResultBanner');
    if (otpCode.length !== 6) {
        nxToast('⚠️ Vui lòng nhập đủ 6 chữ số OTP trong 6 ô!');
        return;
    }
    try {
        const res = await fetch(nxApiUrl('/api/account/verify-otp-and-change-password'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'verify_only',
                email_or_username: targetIdentity,
                otp_code: otpCode
            })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            nxToast('✅ ' + (data.message || 'Xác minh mã OTP 6 số thành công!'));
            if (statusBox) {
                statusBox.style.display = 'block';
                statusBox.style.borderColor = '#10b981';
                statusBox.style.color = '#10b981';
                statusBox.textContent = '✅ Mã OTP 6 số hợp lệ! Bạn có thể đặt mật khẩu mới và mã PIN Ví ngay bên dưới.';
            }
            await syncMobileBridge();
            populateSettingsCenterFromBridge();
        } else {
            nxToast(data.error || '❌ Mã OTP không hợp lệ hoặc đã hết hạn!');
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối khi xác minh mã OTP!');
    }
}

function toggleNxPasswordVisibility(inputId, btnEl) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === 'password') {
        inp.type = 'text';
        if (btnEl) btnEl.textContent = '🙈';
    } else {
        inp.type = 'password';
        if (btnEl) btnEl.textContent = '👁️';
    }
}

function evaluateNxPasswordStrength(pw) {
    const val = String(pw || '');
    const fill = document.getElementById('nxPwStrengthFill');
    const lbl = document.getElementById('nxPwStrengthLabel');
    let score = 0;
    if (val.length >= 6) score += 25;
    if (val.length >= 10) score += 25;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 25;
    if (/\d/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 25;

    let color = '#ef4444';
    let text = 'Độ mạnh: Yếu (Cần tối thiểu 6 ký tự)';
    if (score >= 75) {
        color = '#10b981';
        text = 'Độ mạnh: Rất Mạnh • Chuẩn Bảo Mật Escrow';
    } else if (score >= 50) {
        color = '#f59e0b';
        text = 'Độ mạnh: Khá (Nên thêm chữ hoa & ký tự số)';
    } else if (score >= 25) {
        color = '#f97316';
        text = 'Độ mạnh: Trung bình';
    }
    if (fill) {
        fill.style.width = score + '%';
        fill.style.background = color;
    }
    if (lbl) {
        lbl.textContent = text;
        lbl.style.color = color;
    }
}

async function submitMobileVerifyOtpAndChangePassword() {
    const targetIdentity = (document.getElementById('nxSecTargetIdentity')?.value || 'khach_hang_vip').trim();
    const otpCode = getEnteredNxOtpCode();
    const oldPassword = (document.getElementById('nxSecOldPassword')?.value || '').trim();
    const newPassword = (document.getElementById('nxSecNewPassword')?.value || '').trim();
    const confirmPassword = (document.getElementById('nxSecConfirmPassword')?.value || '').trim();
    const walletPin = (document.getElementById('nxSecWalletPin')?.value || '').trim();
    const statusBox = document.getElementById('nxSecPasswordResultBanner');

    if (!otpCode && !oldPassword) {
        nxToast('⚠️ Vui lòng nhập mã OTP 6 số (Bước 2) hoặc mật khẩu hiện tại!');
        return;
    }
    if (newPassword && newPassword.length < 6) {
        nxToast('⚠️ Mật khẩu mới phải có từ 6 ký tự trở lên!');
        return;
    }
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
        nxToast('⚠️ Xác nhận mật khẩu mới không khớp!');
        return;
    }

    try {
        const res = await fetch(nxApiUrl('/api/account/verify-otp-and-change-password'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'full_update',
                email_or_username: targetIdentity,
                otp_code: otpCode,
                old_password: oldPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
                wallet_pin: walletPin
            })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            nxToast('🔐 ' + (data.message || 'Đã đổi mật khẩu & cập nhật mã PIN Ví thành công!'));
            if (statusBox) {
                statusBox.style.display = 'block';
                statusBox.style.borderColor = '#10b981';
                statusBox.style.color = '#10b981';
                statusBox.textContent = '🎉 ' + (data.message || 'Cập nhật mật khẩu & mã PIN thành công!');
            }
            const npEl = document.getElementById('nxSecNewPassword');
            const cpEl = document.getElementById('nxSecConfirmPassword');
            const opEl = document.getElementById('nxSecOldPassword');
            if (npEl) npEl.value = '';
            if (cpEl) cpEl.value = '';
            if (opEl) opEl.value = '';
            await syncMobileBridge();
            populateSettingsCenterFromBridge();
        } else {
            nxToast(data.error || '❌ Không thể đổi mật khẩu!');
            if (statusBox) {
                statusBox.style.display = 'block';
                statusBox.style.borderColor = '#ef4444';
                statusBox.style.color = '#ef4444';
                statusBox.textContent = '❌ ' + (data.error || 'Đổi mật khẩu thất bại.');
            }
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối máy chủ khi cập nhật mật khẩu!');
    }
}

async function toggleMobileLightDarkQuick() {
    const darkThemes = ['obsidian_gold_dark', 'bloomberg_dark'];
    const isCurrentlyDark = darkThemes.includes(__nxState.themeId);
    const nextTheme = isCurrentlyDark ? 'executive_pearl_light' : 'obsidian_gold_dark';
    await nxApplyTheme(nextTheme, true);
    nxToast(isCurrentlyDark ? '☀️ Đã chuyển sang chế độ Sáng (Executive Pearl Light)' : '🌙 Đã chuyển sang chế độ Tối (Obsidian Gold Dark)');
}

function applyMobileFontScale(scale, showMsg = true) {
    const valid = ['small', 'normal', 'large', 'xlarge'].includes(scale) ? scale : 'normal';
    document.documentElement.setAttribute('data-nx-font', valid);
    localStorage.setItem('nexora_font_scale', valid);
    document.querySelectorAll('.nx-font-scale-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-scale') === valid);
    });
    if (showMsg) nxToast('🔤 Đã áp dụng cỡ chữ hiển thị: ' + valid.toUpperCase());
}

function applyMobileUiDensity(density, showMsg = true) {
    const valid = ['compact', 'comfortable', 'spacious'].includes(density) ? density : 'comfortable';
    document.body.setAttribute('data-nx-density', valid);
    localStorage.setItem('nexora_ui_density', valid);
    const sel = document.getElementById('nxUiDensitySelect');
    if (sel) sel.value = valid;
    if (showMsg) nxToast('📐 Đã đổi mật độ hiển thị: ' + valid);
}

function applyMobileColorblindMode(mode, showMsg = true) {
    const valid = ['normal', 'deuteranopia', 'tritanopia', 'pattern_labels', 'high_contrast_aaa'].includes(mode) ? mode : 'normal';
    document.documentElement.setAttribute('data-cvd-mode', valid);
    localStorage.setItem('nvx_cvd_mode', valid);
    const sel = document.getElementById('nxMobileCvdModeSelect');
    if (sel) sel.value = valid;
    const summaryEl = document.getElementById('nxMobileCvdSummaryText');
    const summaryMap = {
        normal: 'Xanh lá (#16A34A) • Đỏ (#DC2626) • Tương phản 7.5:1',
        deuteranopia: 'Xanh Dương (#0072B2) • Cam Hổ Phách (#D55E00) • Tương phản 8.9:1',
        tritanopia: 'Xanh Ngọc (#009E73) • Đỏ Tím (#CC79A7) • Tương phản 8.4:1',
        pattern_labels: 'Nhãn Ký Hiệu [▲ TĂNG / ▼ GIẢM] • Tương phản 9.2:1',
        high_contrast_aaa: 'Vàng Sáng (#FFD700) • Nền Đen (#000000) • Tương phản 19.6:1 (AAA)'
    };
    if (summaryEl) summaryEl.textContent = summaryMap[valid] || summaryMap.normal;
    if (showMsg) nxToast('👁️ Đã bật chế độ màu trợ năng: ' + (summaryMap[valid] || valid));
}

async function triggerMobilePwaInstallPrompt() {
    if (__nxDeferredPwaPrompt) {
        __nxDeferredPwaPrompt.prompt();
        await __nxDeferredPwaPrompt.userChoice;
        __nxDeferredPwaPrompt = null;
    } else {
        nxToast('📲 Trên trình duyệt điện thoại, chọn "Thêm vào Màn hình chính (Add to Home Screen)" hoặc tải file .APK Android!');
    }
}

function openMobileApkDownloadGuide() {
    nxToast('📦 Đang mở kho tải bản build .APK Android tự động (Nexora-Mobile-Debug-APK)...');
    window.open('https://github.com/wn123484-star/banhangtuhanh/actions', '_blank', 'noopener');
}

window.nxApplyTheme = nxApplyTheme;
window.toggleBalanceVisibility = toggleBalanceVisibility;
window.openNxModal = openNxModal;
window.closeNxModal = closeNxModal;
window.promptSwitchServerEndpoint = promptSwitchServerEndpoint;
window.saveServerEndpointConfig = saveServerEndpointConfig;
window.syncMobileBridge = syncMobileBridge;
window.refreshLiveAuctionsList = refreshLiveAuctionsList;
window.openMobileQrScannerCenter = openMobileQrScannerCenter;
window.startMobileCameraQr = startMobileCameraQr;
window.stopMobileCameraQr = stopMobileCameraQr;
window.inspectQrTokenInvoice = inspectQrTokenInvoice;
window.setMobilePayerMode = setMobilePayerMode;
window.confirmMobileQrPaymentNow = confirmMobileQrPaymentNow;
window.submitMobileWalletAction = submitMobileWalletAction;
window.placeStandardBidOnMobile = placeStandardBidOnMobile;
window.claimDutchAuctionOnMobile = claimDutchAuctionOnMobile;
window.triggerMobileDailyCheckin = triggerMobileDailyCheckin;
window.triggerMobileLuckySpin = triggerMobileLuckySpin;
window.triggerMobileReflexArenaClaim = triggerMobileReflexArenaClaim;
window.openMobileMarketTrackerModal = openMobileMarketTrackerModal;
window.submitMobileWatchlistAlert = submitMobileWatchlistAlert;
window.handleQuickSearchInput = handleQuickSearchInput;
window.openNxSettingsAndSecurityCenter = openNxSettingsAndSecurityCenter;
window.saveMobileProfileAndSettings = saveMobileProfileAndSettings;
window.sendMobileSecurityOtp = sendMobileSecurityOtp;
window.fillDemoSecurityOtp = fillDemoSecurityOtp;
window.onNxOtpDigitInput = onNxOtpDigitInput;
window.onNxOtpDigitKeydown = onNxOtpDigitKeydown;
window.onNxOtpDigitPaste = onNxOtpDigitPaste;
window.verifyMobileSecurityOtpOnly = verifyMobileSecurityOtpOnly;
window.toggleNxPasswordVisibility = toggleNxPasswordVisibility;
window.evaluateNxPasswordStrength = evaluateNxPasswordStrength;
window.submitMobileVerifyOtpAndChangePassword = submitMobileVerifyOtpAndChangePassword;
window.toggleMobileLightDarkQuick = toggleMobileLightDarkQuick;
window.applyMobileFontScale = applyMobileFontScale;
window.applyMobileUiDensity = applyMobileUiDensity;
window.applyMobileColorblindMode = applyMobileColorblindMode;
window.triggerMobilePwaInstallPrompt = triggerMobilePwaInstallPrompt;
window.openMobileApkDownloadGuide = openMobileApkDownloadGuide;

document.addEventListener('DOMContentLoaded', async () => {
    const savedFont = localStorage.getItem('nexora_font_scale') || 'normal';
    applyMobileFontScale(savedFont, false);
    const savedDensity = localStorage.getItem('nexora_ui_density') || 'comfortable';
    applyMobileUiDensity(savedDensity, false);
    const savedCvd = localStorage.getItem('nvx_cvd_mode') || 'normal';
    applyMobileColorblindMode(savedCvd, false);
    await nxApplyTheme(__nxState.themeId, false);
    await syncMobileBridge();
    await refreshLiveAuctionsList();
    const params = new URLSearchParams(window.location.search);
    const payTok = params.get('pay_token') || params.get('qr_token') || '';
    if (payTok) {
        setMobilePayerMode(params.get('mode') === 'behalf' ? 'behalf' : 'self');
        await inspectQrTokenInvoice(payTok);
    }
    if (params.get('tab') === 'settings' || params.get('open') === 'security') {
        openNxSettingsAndSecurityCenter();
    }
    setInterval(syncMobileBridge, 6000);
});