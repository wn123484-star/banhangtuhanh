if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        let radius = Array.isArray(r) ? r[0] : (r || 0);
        if (w < 2 * radius) radius = w / 2;
        if (h < 2 * radius) radius = h / 2;
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + w, y, x + w, y + h, radius);
        this.arcTo(x + w, y + h, x, y + h, radius);
        this.arcTo(x, y + h, x, y, radius);
        this.arcTo(x, y, x + w, y, radius);
        this.closePath();
        return this;
    };
}

const NX_THEMES = [
    { id: 'emerald_fintech_light', name: '1. Lục Bảo Công Nghệ Nexora (Emerald Fintech Light - Mặc định)', swatch: 'linear-gradient(135deg,#064e3b,#10b981,#76b900)' },
    { id: 'executive_pearl_light', name: '2. Sáng Thanh Lịch (Executive Pearl Light)', swatch: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' },
    { id: 'momo_lotus_pink', name: '3. Hồng Sen MoMo (MoMo Lotus Pink & White)', swatch: 'linear-gradient(135deg,#a50064,#d82d8b)' },
    { id: 'swiss_banking_slate', name: '4. Tài Chính Thụy Sĩ (Swiss Banking Slate)', swatch: 'linear-gradient(135deg,#0f172a,#0284c7)' },
    { id: 'obsidian_gold_dark', name: '5. Đen Thượng Lưu (Obsidian Gold Dark)', swatch: 'linear-gradient(135deg,#111827,#f59e0b)' },
    { id: 'bloomberg_dark', name: '6. Chứng Khoán Chuyên Nghiệp (Bloomberg Dark)', swatch: 'linear-gradient(135deg,#050811,#ff6b00)' }
];

const NX_CVD_MODES = [
    { id: 'standard', name: '1. Chuẩn (Standard Vision)', buyColor: '#059669', sellColor: '#ef4444', buyLabel: 'MUA / TĂNG', sellLabel: 'BÁN / GIẢM' },
    { id: 'protanopia_deuteranopia', name: '2. Mù Đỏ-Lục (Protanopia / Deuteranopia)', buyColor: '#0072b2', sellColor: '#d55e00', buyLabel: 'MUA / TĂNG', sellLabel: 'BÁN / GIẢM' },
    { id: 'tritanopia', name: '3. Mù Xanh-Vàng (Tritanopia)', buyColor: '#009e73', sellColor: '#cc79a7', buyLabel: 'MUA / TĂNG', sellLabel: 'BÁN / GIẢM' },
    { id: 'symbol_labels', name: '4. Nhãn Ký Hiệu [▲/▼] (Symbol Assisted)', buyColor: '#059669', sellColor: '#ef4444', buyLabel: '[▲] MUA / TĂNG +', sellLabel: '[▼] BÁN / GIẢM -' },
    { id: 'high_contrast_aaa', name: '5. Tương Phản Cao AAA (High Contrast)', buyColor: '#22c55e', sellColor: '#facc15', buyLabel: '[▲] XÁC NHẬN', sellLabel: '[▼] CẢNH BÁO' }
];

function loadSavedMobileAuthUser() {
    try {
        const raw = localStorage.getItem('nexora_mobile_auth_user') || localStorage.getItem('auth_user') || '';
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && Number(parsed.id) > 0) return parsed;
    } catch (e) {}
    return null;
}

let __nxState = {
    apiBase: localStorage.getItem('nexora_api_base') || window.location.origin,
    themeId: localStorage.getItem('nexora_active_theme') || 'emerald_fintech_light',
    cvdMode: localStorage.getItem('nexora_cvd_mode') || 'standard',
    hideBalance: localStorage.getItem('nexora_hide_balance') === '1',
    soundboxEnabled: localStorage.getItem('nexora_soundbox_enabled') !== '0',
    authUser: loadSavedMobileAuthUser(),
    isLoggedIn: Boolean(loadSavedMobileAuthUser()),
    emailVerified: false,
    otpSendLocked: false,
    bridgeData: null,
    selectedQrInvoice: null,
    payerMode: 'self',
    camStream: null,
    camTimer: null,
    confirmInFlight: false,
    marketOverview: null,
    smartOtpLen: 6,
    smartOtpCode: '------',
    smartOtpRemain: 30,
    smartOtpTimer: null,
    activeNotifTab: 'deal',
    lastReceiptData: null,
    activeMiniGame: 'wheel',
    wheelAngle: 0,
    wheelSpinning: false,
    aimScore: 0,
    aimTimeLeft: 30,
    aimTarget: { x: 160, y: 120, r: 24 },
    aimTimer: null,
    treeWaterLevel: 3,
    treeCoinsDrops: []
};

function nxApiUrl(path) {
    const base = (__nxState.apiBase || window.location.origin).replace(/\/+$/, '');
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return base + (path.startsWith('/') ? path : '/' + path);
}

function nxAuthHeaders(extra = {}) {
    const h = { ...extra };
    if (__nxState.authUser && __nxState.authUser.id) {
        h['X-Nexora-User-Id'] = String(__nxState.authUser.id);
        h['X-Nexora-Username'] = String(__nxState.authUser.username || '');
    }
    return h;
}

function nxFormatVnd(amount) {
    if (!__nxState.isLoggedIn || amount === null || amount === undefined) {
        return '🔒 Đăng nhập để xem';
    }
    if (__nxState.hideBalance) return '•••••••• ₫';
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
}

function nxToast(msg) {
    let box = document.getElementById('nxToastBanner');
    if (!box) {
        box = document.createElement('div');
        box.id = 'nxToastBanner';
        box.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);max-width:440px;width:92%;background:#052e16;color:#fff;padding:11px 16px;border-radius:14px;font-size:0.82rem;font-weight:700;z-index:2000;box-shadow:0 10px 28px rgba(0,0,0,0.35);border:1.5px solid #10b981;text-align:center;transition:opacity 0.2s;';
        document.body.appendChild(box);
    }
    box.textContent = msg;
    box.style.opacity = '1';
    clearTimeout(window.__nxToastTimer);
    window.__nxToastTimer = setTimeout(() => {
        if (box) box.style.opacity = '0';
    }, 3400);
}

function speakBalanceChangeByAiSoundbox(speechText) {
    if (!__nxState.soundboxEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const actx = new AudioCtx();
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, actx.currentTime);
            osc.frequency.setValueAtTime(1320, actx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.16, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.45);
            osc.connect(gain);
            gain.connect(actx.destination);
            osc.start();
            osc.stop(actx.currentTime + 0.45);
        }
    } catch (e) {}
    try {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(speechText || 'Nexora Pay thông báo: Giao dịch thành công!');
            utter.lang = 'vi-VN';
            utter.rate = 1.05;
            window.speechSynthesis.speak(utter);
        }
    } catch (e) {}
}

function triggerNativeOrWebLockScreenNotification(title, message, targetUrl = '/services/mobile/mobile-app.html') {
    if (window.NexoraNativeBridge && typeof window.NexoraNativeBridge.pushLockScreenNotification === 'function') {
        try {
            window.NexoraNativeBridge.pushLockScreenNotification(String(title), String(message), String(targetUrl));
            return;
        } catch (e) {}
    }
    if ('Notification' in window) {
        const sendWebNotif = () => {
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                        body: message,
                        icon: '/assets/icons/pwa/icon-192x192.png',
                        badge: '/assets/icons/pwa/icon-96x96.png',
                        vibrate: [200, 100, 200],
                        data: { url: targetUrl }
                    });
                }).catch(() => {
                    new Notification(title, { body: message, icon: '/assets/icons/pwa/icon-192x192.png' });
                });
            } else {
                new Notification(title, { body: message, icon: '/assets/icons/pwa/icon-192x192.png' });
            }
        };
        if (Notification.permission === 'granted') {
            sendWebNotif();
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(p => {
                if (p === 'granted') sendWebNotif();
            });
        }
    }
}

function drawSingleNexoraCanvasIcon(canvas, iconName) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width || 96;
    const h = canvas.height || 96;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const gEmerald = ctx.createLinearGradient(0, 0, w, h);
    gEmerald.addColorStop(0, '#047857');
    gEmerald.addColorStop(0.55, '#10b981');
    gEmerald.addColorStop(1, '#76b900');

    const gGold = ctx.createLinearGradient(0, 0, w, h);
    gGold.addColorStop(0, '#fde047');
    gGold.addColorStop(0.5, '#f59e0b');
    gGold.addColorStop(1, '#d97706');

    const gPink = ctx.createLinearGradient(0, 0, w, h);
    gPink.addColorStop(0, '#f43f5e');
    gPink.addColorStop(1, '#d82d8b');

    if (iconName === 'topup_withdraw') {
        ctx.fillStyle = gEmerald;
        ctx.beginPath(); ctx.roundRect(14, 24, 68, 52, 14); ctx.fill();
        ctx.fillStyle = '#064e3b';
        ctx.beginPath(); ctx.roundRect(54, 40, 28, 20, 8); ctx.fill();
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.arc(64, 50, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = gGold;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(34, 42); ctx.lineTo(34, 14);
        ctx.moveTo(24, 24); ctx.lineTo(34, 14); ctx.lineTo(44, 24);
        ctx.stroke();
    } else if (iconName === 'receive_qr') {
        ctx.strokeStyle = gEmerald;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(48, 10); ctx.lineTo(80, 22); ctx.lineTo(80, 52);
        ctx.quadraticCurveTo(80, 76, 48, 86);
        ctx.quadraticCurveTo(16, 76, 16, 52);
        ctx.lineTo(16, 22); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.arc(48, 48, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#052e16';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('QR', 48, 49);
    } else if (iconName === 'qr_scanner') {
        ctx.strokeStyle = gEmerald;
        ctx.lineWidth = 6;
        const cLen = 18;
        ctx.beginPath();
        ctx.moveTo(16, 16 + cLen); ctx.lineTo(16, 16); ctx.lineTo(16 + cLen, 16);
        ctx.moveTo(80 - cLen, 16); ctx.lineTo(80, 16); ctx.lineTo(80, 16 + cLen);
        ctx.moveTo(16, 80 - cLen); ctx.lineTo(16, 80); ctx.lineTo(16 + cLen, 80);
        ctx.moveTo(80 - cLen, 80); ctx.lineTo(80, 80); ctx.lineTo(80, 80 - cLen);
        ctx.stroke();
        ctx.fillStyle = gEmerald;
        ctx.fillRect(28, 28, 14, 14);
        ctx.fillRect(54, 28, 14, 14);
        ctx.fillRect(28, 54, 14, 14);
        ctx.fillRect(54, 54, 14, 14);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(12, 48); ctx.lineTo(84, 48); ctx.stroke();
    } else if (iconName === 'utility_wallet') {
        ctx.fillStyle = gEmerald;
        ctx.beginPath(); ctx.roundRect(14, 26, 68, 54, 14); ctx.fill();
        ctx.strokeStyle = gGold;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.roundRect(34, 14, 28, 16, 6); ctx.stroke();
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.arc(48, 52, 9, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'fast_transfer') {
        ctx.fillStyle = gEmerald;
        ctx.beginPath(); ctx.arc(48, 48, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = gGold;
        ctx.beginPath();
        ctx.moveTo(54, 16); ctx.lineTo(28, 52); ctx.lineTo(46, 52);
        ctx.lineTo(40, 80); ctx.lineTo(68, 44); ctx.lineTo(50, 44);
        ctx.closePath(); ctx.fill();
    } else if (iconName === 'pay_behalf') {
        ctx.fillStyle = gPink;
        ctx.beginPath(); ctx.arc(36, 44, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = gEmerald;
        ctx.beginPath(); ctx.arc(60, 44, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(36, 44); ctx.lineTo(46, 54); ctx.lineTo(62, 36); ctx.stroke();
    } else if (iconName === 'dual_auction') {
        ctx.fillStyle = gEmerald;
        ctx.beginPath(); ctx.roundRect(18, 68, 60, 12, 6); ctx.fill();
        ctx.save();
        ctx.translate(48, 42);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.roundRect(-22, -12, 44, 20, 6); ctx.fill();
        ctx.fillStyle = '#047857';
        ctx.fillRect(-5, 8, 10, 32);
        ctx.restore();
    } else if (iconName === 'market_chart') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(28, 22); ctx.lineTo(28, 72); ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(21, 36, 14, 24);
        ctx.strokeStyle = '#10b981';
        ctx.beginPath(); ctx.moveTo(64, 16); ctx.lineTo(64, 68); ctx.stroke();
        ctx.fillStyle = '#10b981';
        ctx.fillRect(57, 26, 14, 28);
        ctx.strokeStyle = gGold;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(14, 66); ctx.quadraticCurveTo(46, 58, 82, 20); ctx.stroke();
    } else if (iconName === 'reverse_rfq') {
        ctx.fillStyle = gEmerald;
        ctx.beginPath(); ctx.roundRect(20, 14, 56, 68, 10); ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(32, 32); ctx.lineTo(64, 32);
        ctx.moveTo(32, 46); ctx.lineTo(64, 46);
        ctx.moveTo(32, 60); ctx.lineTo(50, 60);
        ctx.stroke();
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.arc(64, 64, 14, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'daily_fire') {
        const gFire = ctx.createLinearGradient(48, 10, 48, 84);
        gFire.addColorStop(0, '#fde047');
        gFire.addColorStop(0.5, '#f97316');
        gFire.addColorStop(1, '#dc2626');
        ctx.fillStyle = gFire;
        ctx.beginPath();
        ctx.moveTo(48, 12);
        ctx.bezierCurveTo(76, 34, 82, 62, 66, 78);
        ctx.quadraticCurveTo(48, 90, 30, 78);
        ctx.bezierCurveTo(14, 62, 22, 34, 48, 12);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.arc(48, 64, 12, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'esport_aim') {
        ctx.strokeStyle = gEmerald;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(48, 48, 30, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(48, 8); ctx.lineTo(48, 28);
        ctx.moveTo(48, 68); ctx.lineTo(48, 88);
        ctx.moveTo(8, 48); ctx.lineTo(28, 48);
        ctx.moveTo(68, 48); ctx.lineTo(88, 48);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(48, 48, 7, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'radar_truck') {
        ctx.strokeStyle = gEmerald;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(48, 48, 34, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(48, 48, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = gGold;
        ctx.beginPath();
        ctx.moveTo(48, 48); ctx.lineTo(76, 28);
        ctx.arc(48, 48, 34, -0.6, 0.1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.beginPath(); ctx.arc(48, 48, 6, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'ai_cat_mascot') {
        ctx.fillStyle = gEmerald;
        ctx.beginPath();
        ctx.moveTo(22, 38); ctx.lineTo(18, 14); ctx.lineTo(38, 26);
        ctx.moveTo(74, 38); ctx.lineTo(78, 14); ctx.lineTo(58, 26);
        ctx.fill();
        ctx.beginPath(); ctx.arc(48, 52, 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(38, 48, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(58, 48, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.arc(48, 76, 7, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'nav_home') {
        ctx.fillStyle = gEmerald;
        ctx.beginPath();
        ctx.moveTo(48, 14); ctx.lineTo(82, 44); ctx.lineTo(72, 44);
        ctx.lineTo(72, 80); ctx.lineTo(24, 80); ctx.lineTo(24, 44); ctx.lineTo(14, 44);
        ctx.closePath(); ctx.fill();
    } else if (iconName === 'nav_auction') {
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.roundRect(24, 20, 48, 22, 8); ctx.fill();
        ctx.fillStyle = gEmerald;
        ctx.fillRect(43, 42, 10, 36);
    } else if (iconName === 'nav_minigame') {
        const cols = ['#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6', '#eab308'];
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = cols[i];
            ctx.beginPath();
            ctx.moveTo(48, 48);
            ctx.arc(48, 48, 34, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(48, 48, 10, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'smart_otp_key') {
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.arc(34, 48, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(48, 43, 34, 10);
        ctx.fillRect(64, 53, 7, 12);
        ctx.fillRect(75, 53, 7, 16);
        ctx.fillStyle = '#052e16';
        ctx.beginPath(); ctx.arc(34, 48, 6, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'notif_bell') {
        ctx.fillStyle = gGold;
        ctx.beginPath();
        ctx.moveTo(48, 14);
        ctx.quadraticCurveTo(72, 18, 74, 58);
        ctx.lineTo(82, 68);
        ctx.lineTo(14, 68);
        ctx.lineTo(22, 58);
        ctx.quadraticCurveTo(24, 18, 48, 14);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(48, 76, 9, 0, Math.PI * 2); ctx.fill();
    } else if (iconName === 'soundbox_speaker') {
        ctx.fillStyle = gEmerald;
        ctx.beginPath();
        ctx.moveTo(18, 36); ctx.lineTo(36, 36); ctx.lineTo(56, 18);
        ctx.lineTo(56, 78); ctx.lineTo(36, 60); ctx.lineTo(18, 60);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = gGold;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(58, 48, 14, -0.7, 0.7); ctx.stroke();
        ctx.beginPath(); ctx.arc(58, 48, 24, -0.8, 0.8); ctx.stroke();
    } else {
        ctx.strokeStyle = gEmerald;
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(48, 48, 22, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const ang = (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(48 + Math.cos(ang) * 24, 48 + Math.sin(ang) * 24);
            ctx.lineTo(48 + Math.cos(ang) * 34, 48 + Math.sin(ang) * 34);
            ctx.stroke();
        }
        ctx.fillStyle = gGold;
        ctx.beginPath(); ctx.arc(48, 48, 9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function renderNexoraCanvasIcons() {
    document.querySelectorAll('canvas.nx-canvas-icon').forEach(cv => {
        const iconName = cv.getAttribute('data-nx-icon') || 'nav_settings';
        drawSingleNexoraCanvasIcon(cv, iconName);
    });
}

async function nxApplyTheme(themeId, syncServer = true) {
    __nxState.themeId = themeId || 'emerald_fintech_light';
    localStorage.setItem('nexora_active_theme', __nxState.themeId);
    document.documentElement.setAttribute('data-nx-theme', __nxState.themeId);
    document.body.setAttribute('data-nx-theme', __nxState.themeId);
    if (window.NexoraNativeBridge && typeof window.NexoraNativeBridge.syncTheme === 'function') {
        try { window.NexoraNativeBridge.syncTheme(__nxState.themeId); } catch (e) {}
    }
    renderThemeModalList();
    renderNexoraCanvasIcons();
    if (syncServer) {
        try {
            await fetch(nxApiUrl('/api/mobile/theme-sync'), {
                method: 'POST',
                headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ theme_id: __nxState.themeId, source: 'nexora_mobile_app' })
            });
        } catch (e) {}
    }
}

async function nxApplyCvdMode(cvdId, syncServer = true) {
    __nxState.cvdMode = cvdId || 'standard';
    localStorage.setItem('nexora_cvd_mode', __nxState.cvdMode);
    document.documentElement.setAttribute('data-nx-cvd', __nxState.cvdMode);
    document.body.setAttribute('data-nx-cvd', __nxState.cvdMode);
    renderCvdAccessibilityOptions();
    if (syncServer) {
        try {
            await fetch(nxApiUrl('/api/account/update-settings'), {
                method: 'POST',
                headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ cvd_mode: __nxState.cvdMode })
            });
        } catch (e) {}
    }
}

function renderCvdAccessibilityOptions() {
    const box = document.getElementById('nxCvdModeSelectorList');
    const previewBox = document.getElementById('nxCvdLivePreviewBox');
    const activeObj = NX_CVD_MODES.find(m => m.id === __nxState.cvdMode) || NX_CVD_MODES[0];

    if (previewBox) {
        previewBox.innerHTML = `
            <div style="font-size:0.74rem;font-weight:700;margin-bottom:6px;">Xem trước trực quan chế độ [${activeObj.name}]:</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button type="button" style="padding:9px;border:none;border-radius:10px;background:${activeObj.buyColor};color:#fff;font-weight:800;font-size:0.76rem;">${activeObj.buyLabel}</button>
                <button type="button" style="padding:9px;border:none;border-radius:10px;background:${activeObj.sellColor};color:#fff;font-weight:800;font-size:0.76rem;">${activeObj.sellLabel}</button>
            </div>
        `;
    }
    if (!box) return;
    box.innerHTML = NX_CVD_MODES.map(m => {
        const isAct = m.id === __nxState.cvdMode;
        return `<div class="nx-theme-option-card ${isAct ? 'active' : ''}" onclick="nxApplyCvdMode('${m.id}', true)">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="width:18px;height:18px;border-radius:50%;background:${m.buyColor};display:inline-block;"></span>
                <span style="width:18px;height:18px;border-radius:50%;background:${m.sellColor};display:inline-block;"></span>
                <div style="font-size:0.79rem;font-weight:700;">${m.name}</div>
            </div>
            <span style="font-size:0.74rem;font-weight:800;">${isAct ? '✅ Đang bật' : 'Chọn'}</span>
        </div>`;
    }).join('');
}

function updateOtpSendButtonLockState(isVerifiedLocked) {
    __nxState.otpSendLocked = Boolean(isVerifiedLocked);
    const sendBtn = document.getElementById('nxBtnSendSecurityOtp');
    const unlockBtn = document.getElementById('nxBtnUnlockReverifyOtp');
    if (sendBtn) {
        sendBtn.disabled = __nxState.otpSendLocked;
        sendBtn.style.opacity = __nxState.otpSendLocked ? '0.55' : '1';
        sendBtn.textContent = __nxState.otpSendLocked
            ? '✅ Tài Khoản Đã Xác Minh OTP Bảo Mật'
            : '📨 Gửi Mã OTP Xác Thực (6 Số)';
    }
    if (unlockBtn) {
        unlockBtn.style.display = __nxState.otpSendLocked ? 'inline-block' : 'none';
    }
}

function unlockOtpForPasswordChange() {
    updateOtpSendButtonLockState(false);
    nxToast('🔓 Đã mở khóa gửi mã OTP mới để đổi Mật khẩu / Mã PIN!');
}

async function sendMobileSecurityOtp() {
    if (!requireMobileLoginForAction('gửi mã OTP bảo mật')) return;
    const emailInp = document.getElementById('nxOtpEmailInput');
    const email = (emailInp ? emailInp.value : (__nxState.authUser.email || '')).trim();
    try {
        const res = await fetch(nxApiUrl('/api/account/send-security-otp'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email, purpose: 'security_verify' })
        });
        const data = await res.json();
        nxToast(data.message || data.error || '📨 Đã gửi mã OTP!');
        if (data.demo_otp_hint) {
            const otpInp = document.getElementById('nxOtpCodeInput');
            if (otpInp && !otpInp.value) otpInp.value = data.demo_otp_hint;
        }
    } catch (e) {
        nxToast('❌ Không thể kết nối dịch vụ gửi OTP!');
    }
}

async function verifyMobileOtpAndSaveSecurity() {
    if (!requireMobileLoginForAction('xác minh OTP nhận +20.000 Xu')) return;
    const email = (document.getElementById('nxOtpEmailInput')?.value || '').trim();
    const otp_code = (document.getElementById('nxOtpCodeInput')?.value || '').trim();
    const new_password = (document.getElementById('nxOtpNewPasswordInput')?.value || '').trim();
    const new_wallet_pin = (document.getElementById('nxOtpNewPinInput')?.value || '').trim();

    try {
        const res = await fetch(nxApiUrl('/api/account/verify-otp-and-change-password'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email, otp_code, new_password, new_wallet_pin })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            __nxState.emailVerified = true;
            updateOtpSendButtonLockState(true);
            nxToast(data.message || '✅ Xác minh OTP thành công!');
            if (data.reward_coins_added > 0) {
                speakBalanceChangeByAiSoundbox('Nexora Pay thông báo: Cộng 20 nghìn xu thưởng xác thực bảo mật OTP thành công!');
                triggerNativeOrWebLockScreenNotification('🎁 +20.000 Xu Thưởng Bảo Mật OTP', data.message);
            }
            await syncMobileBridge();
        } else {
            nxToast(data.error || '❌ Mã OTP không hợp lệ!');
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối khi xác minh mã OTP!');
    }
}

function requireMobileLoginForAction(actionLabel = 'thực hiện chức năng này') {
    if (__nxState.isLoggedIn && __nxState.authUser && __nxState.authUser.id) {
        return true;
    }
    nxToast(`🔒 Vui lòng đăng nhập tài khoản Nexora để ${actionLabel}!`);
    openNxModal('nxMobileAuthModal');
    return false;
}

async function submitMobileAuthForm(mode = 'login') {
    const identifier = (document.getElementById('nxAuthIdentifierInput')?.value || '').trim();
    const password = (document.getElementById('nxAuthPasswordInput')?.value || '').trim();
    const fullName = (document.getElementById('nxAuthFullNameInput')?.value || '').trim();

    try {
        const res = await fetch(nxApiUrl('/api/mobile/auth-login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: mode, identifier, username: identifier, password, full_name: fullName })
        });
        const data = await res.json();
        if (res.ok && data.ok && data.user_profile) {
            __nxState.authUser = data.user_profile;
            __nxState.isLoggedIn = true;
            __nxState.emailVerified = Boolean(data.user_profile.email_verified);
            localStorage.setItem('nexora_mobile_auth_user', JSON.stringify(data.user_profile));
            localStorage.setItem('auth_user', JSON.stringify(data.user_profile));
            closeNxModal('nxMobileAuthModal');
            nxToast(data.message || '✅ Đăng nhập thành công!');
            await syncMobileBridge();
        } else {
            nxToast(data.error || '❌ Đăng nhập không thành công!');
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối máy chủ khi xác thực tài khoản!');
    }
}

async function logoutMobileAccount() {
    try {
        await fetch(nxApiUrl('/api/mobile/auth-logout'), { method: 'POST', headers: nxAuthHeaders() });
    } catch (e) {}
    __nxState.authUser = null;
    __nxState.isLoggedIn = false;
    __nxState.emailVerified = false;
    localStorage.removeItem('nexora_mobile_auth_user');
    localStorage.removeItem('auth_user');
    closeNxModal('nxThemeModal');
    nxToast('👋 Đã đăng xuất khỏi tài khoản Nexora!');
    await syncMobileBridge();
}

function toggleBalanceVisibility() {
    if (!requireMobileLoginForAction('xem số dư ví')) return;
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
    renderNexoraCanvasIcons();
}

function closeNxModal(modalId) {
    if (modalId === 'nxQrScannerModal') stopMobileCameraQr();
    if (modalId === 'nxSmartOtpModal' && __nxState.smartOtpTimer) {
        clearInterval(__nxState.smartOtpTimer);
        __nxState.smartOtpTimer = null;
    }
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
    const u = __nxState.isLoggedIn && __nxState.authUser ? (__nxState.authUser.username || 'VIP') : 'Chạm xem tin mới';
    lbl.textContent = `⚡ Nexora Live • Bảo lãnh Escrow 100% • ${u}`;
}

async function syncMobileBridge() {
    updateServerHeaderPill();
    try {
        const q = (__nxState.authUser && __nxState.authUser.id) ? `?user_id=${encodeURIComponent(__nxState.authUser.id)}&_t=${Date.now()}` : `?_t=${Date.now()}`;
        const res = await fetch(nxApiUrl('/api/mobile/bridge-sync' + q), {
            headers: nxAuthHeaders(),
            cache: 'no-store'
        });
        const data = await res.json();
        if (data && data.ok) {
            __nxState.bridgeData = data;
            __nxState.isLoggedIn = Boolean(data.authenticated && data.user_profile && data.user_profile.id > 0);
            if (__nxState.isLoggedIn) {
                __nxState.authUser = data.user_profile;
                __nxState.emailVerified = Boolean(data.user_profile.email_verified);
                updateOtpSendButtonLockState(__nxState.emailVerified);
                const otpEm = document.getElementById('nxOtpEmailInput');
                if (otpEm && !otpEm.value && data.user_profile.email) otpEm.value = data.user_profile.email;
            } else {
                updateOtpSendButtonLockState(false);
            }
            if (!localStorage.getItem('nexora_active_theme') && data.active_theme) {
                await nxApplyTheme(data.active_theme, false);
            }
            renderBridgeDataToUi();
        }
    } catch (err) {
        const lbl = document.getElementById('nxServerStatusText');
        if (lbl) lbl.textContent = '🟠 Chế độ Offline/LAN • Chạm để đổi cấu hình';
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

function renderBridgeDataToUi() {
    const d = __nxState.bridgeData || {};
    const prof = d.user_profile || {};
    const pockets = d.multi_pockets || {};

    const wEl = document.getElementById('nxPocketWalletVal');
    const eEl = document.getElementById('nxPocketEscrowVal');
    const aEl = document.getElementById('nxPocketAuctionVal');
    const uNameEl = document.getElementById('nxHeaderUserName');
    const uCoinsEl = document.getElementById('nxHeaderCoinsBadge');
    const authActionBtn = document.getElementById('nxHeaderAuthBtn');
    const notifDot = document.getElementById('nxUnreadNotifBadge');

    if (notifDot) {
        const unread = Number(d.unread_notifications_count || (d.live_counters && d.live_counters.unread_notifications) || 0);
        notifDot.textContent = unread > 99 ? '99+' : String(unread);
        notifDot.style.display = unread > 0 ? 'flex' : 'none';
    }

    if (__nxState.isLoggedIn) {
        if (wEl) wEl.textContent = nxFormatVnd(pockets.nexora_pay_wallet ?? prof.wallet_balance ?? 0);
        if (eEl) eEl.textContent = nxFormatVnd(pockets.escrow_protection_bag ?? prof.escrow_locked_balance ?? 0);
        if (aEl) aEl.textContent = nxFormatVnd(pockets.auction_margin_10pct ?? prof.auction_deposit_balance ?? 0);
        if (uNameEl) uNameEl.textContent = prof.full_name || prof.username;
        if (uCoinsEl) uCoinsEl.textContent = '🪙 ' + Number(prof.coins || 0).toLocaleString('vi-VN') + ' Xu';
        if (authActionBtn) {
            authActionBtn.textContent = '🚪 Đăng Xuất';
            authActionBtn.onclick = logoutMobileAccount;
        }
    } else {
        if (wEl) wEl.textContent = '🔒 Đăng nhập để xem';
        if (eEl) eEl.textContent = '🔒 Đăng nhập để xem';
        if (aEl) aEl.textContent = '🔒 Đăng nhập để xem';
        if (uNameEl) uNameEl.textContent = 'Khách vãng lai • Bấm để Đăng nhập';
        if (uCoinsEl) uCoinsEl.textContent = '🔑 Đăng Nhập';
        if (authActionBtn) {
            authActionBtn.textContent = '🔑 Đăng Nhập / Đăng Ký';
            authActionBtn.onclick = () => openNxModal('nxMobileAuthModal');
        }
    }

    renderSpendingDonut(d.spending_analytics);
    renderPendingQrSessionsList(d.pending_qr_sessions || []);
    renderLiveAuctionsPreview(d.active_auctions || []);
    renderRealTransactionsLedger(d.recent_transactions || []);
}

function renderRealTransactionsLedger(txList) {
    const box = document.getElementById('nxRealTransactionsList');
    if (!box) return;
    if (!__nxState.isLoggedIn) {
        box.innerHTML = `<div style="font-size:0.78rem;color:var(--nx-muted);text-align:center;padding:12px;">🔒 Vui lòng đăng nhập để xem sổ cái lịch sử giao dịch thực tế trong SQLite.</div>`;
        return;
    }
    if (!txList || !txList.length) {
        box.innerHTML = `<div style="font-size:0.78rem;color:var(--nx-muted);text-align:center;padding:12px;background:var(--nx-surface-2);border-radius:14px;">Sổ cái sạch (0 giao dịch). Mọi giao dịch nạp/rút hoặc thanh toán QR mới sẽ hiển thị tại đây.</div>`;
        return;
    }
    box.innerHTML = txList.map(tx => {
        const amt = Number(tx.amount || 0);
        const isPlus = amt >= 0;
        const safeNote = String(tx.note || tx.tx_type || 'Giao dịch ví').replace(/'/g, '');
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 11px;border-radius:14px;background:var(--nx-surface-2);border:1px solid var(--nx-border);margin-bottom:7px;cursor:pointer;" onclick="openReceiptForTransaction('${tx.tx_code || 'NXPAY'}', ${Math.abs(amt)}, '${safeNote}', '${tx.created_at || ''}')">
            <div style="max-width:65%;">
                <div style="font-weight:800;font-size:0.79rem;">${tx.tx_code || 'NXPAY'} • ${tx.tx_type || 'TX'}</div>
                <div style="font-size:0.71rem;color:var(--nx-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tx.note || ''}</div>
                <div style="font-size:0.66rem;color:var(--nx-muted);">${tx.created_at || ''} (Chạm xuất biên lai PNG)</div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:800;font-size:0.86rem;color:${isPlus ? '#10b981' : '#ef4444'};">${isPlus ? '+' : ''}${amt.toLocaleString('vi-VN')} ₫</div>
                <div style="font-size:0.68rem;color:var(--nx-muted);">Dư: ${Number(tx.balance_after || 0).toLocaleString('vi-VN')} ₫</div>
            </div>
        </div>`;
    }).join('');
}

async function clearRealTransactionsHistory() {
    if (!requireMobileLoginForAction('làm sạch lịch sử giao dịch về 0')) return;
    try {
        const res = await fetch(nxApiUrl('/api/mobile/transactions/clear'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ user_id: __nxState.authUser.id })
        });
        const data = await res.json();
        nxToast(data.message || '🧹 Đã làm sạch lịch sử giao dịch về 0!');
        await syncMobileBridge();
    } catch (e) {
        nxToast('❌ Không thể xóa lịch sử giao dịch!');
    }
}

function openReceiptForTransaction(txCode, amount, note, createdAt) {
    __nxState.lastReceiptData = {
        tx_code: txCode,
        amount: amount,
        recipient: (__nxState.authUser && __nxState.authUser.full_name) || 'Ví Lục Bảo Nexora Pay',
        note: note,
        created_at: createdAt || new Date().toLocaleString('vi-VN')
    };
    openNxModal('nxDigitalReceiptModal');
    drawDigitalReceiptOnCanvas(__nxState.lastReceiptData);
}

function drawDigitalReceiptOnCanvas(rcp) {
    const cv = document.getElementById('nxReceiptCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    ctx.clearRect(0, 0, w, h);

    const gBg = ctx.createLinearGradient(0, 0, w, h);
    gBg.addColorStop(0, '#052e16');
    gBg.addColorStop(0.5, '#064e3b');
    gBg.addColorStop(1, '#047857');
    ctx.fillStyle = gBg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(24, 24, w - 48, h - 48, 22);
    ctx.fill();

    ctx.fillStyle = '#059669';
    ctx.beginPath();
    ctx.roundRect(24, 24, w - 48, 92, [22, 22, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BIÊN LAI GIAO DỊCH NEXORA PAY', w / 2, 64);
    ctx.font = '13px sans-serif';
    ctx.fillText('BẢO CHỨNG THANH TOÁN ESCROW SOP-01', w / 2, 92);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(Number(rcp.amount || 0).toLocaleString('vi-VN') + ' VNĐ', w / 2, 166);

    ctx.strokeStyle = '#d1fae5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(52, 194);
    ctx.lineTo(w - 52, 194);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '14px sans-serif';
    const rows = [
        ['Mã giao dịch:', String(rcp.tx_code || 'NXPAY-888')],
        ['Chủ tài khoản:', String((__nxState.authUser && __nxState.authUser.full_name) || 'Thành viên Nexora')],
        ['Thụ hưởng:', String(rcp.recipient || 'Quỹ Bảo Lãnh Nexora Escrow')],
        ['Thời gian:', String(rcp.created_at || new Date().toLocaleString('vi-VN'))],
        ['Nội dung:', String(rcp.note || 'Giao dịch bảo mật Nexora Pay').slice(0, 42)]
    ];
    let yPos = 232;
    rows.forEach(r => {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px sans-serif';
        ctx.fillText(r[0], 52, yPos);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(r[1], 175, yPos);
        yPos += 38;
    });

    ctx.save();
    ctx.translate(w - 135, h - 105);
    ctx.rotate(-0.2);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(-78, -28, 156, 56, 10);
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ĐÃ BẢO LÃNH ESCROW', 0, -4);
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('NEXORA VERIFIED', 0, 14);
    ctx.restore();
}

function renderAndDownloadCanvasReceipt() {
    const cv = document.getElementById('nxReceiptCanvas');
    if (!cv) return;
    if (!__nxState.lastReceiptData) {
        __nxState.lastReceiptData = {
            tx_code: 'NXPAY-' + Date.now(),
            amount: 0,
            recipient: 'Ví Nexora Pay',
            note: 'Biên lai xác thực ví điện tử',
            created_at: new Date().toLocaleString('vi-VN')
        };
        drawDigitalReceiptOnCanvas(__nxState.lastReceiptData);
    }
    const url = cv.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `BienLai_${__nxState.lastReceiptData.tx_code || 'NexoraPay'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    nxToast('📥 Đã tải ảnh Biên Lai Điện Tử (.PNG) về thiết bị!');
}

function renderSpendingDonut(analytics) {
    const segs = (analytics && analytics.segments) || [
        { label: 'Mua sắm Công nghệ', amount: 0, color: '#059669' },
        { label: 'Đấu giá & Ký quỹ', amount: 0, color: '#0ea5e9' },
        { label: 'Tiền hoàn trả 100% từ Hoàn đơn', amount: 0, color: '#f59e0b' }
    ];
    const rawTotal = segs.reduce((s, it) => s + Number(it.amount || 0), 0);
    const total = rawTotal > 0 ? rawTotal : 1;
    const svgEl = document.getElementById('nxSpendingDonutSvg');
    const legEl = document.getElementById('nxSpendingLegendBox');
    const totEl = document.getElementById('nxDonutCenterTotal');

    if (totEl) {
        if (!__nxState.isLoggedIn) totEl.textContent = '🔒';
        else if (__nxState.hideBalance) totEl.textContent = '••••';
        else totEl.textContent = rawTotal >= 1000000 ? (rawTotal / 1000000).toFixed(1) + 'Tr' : rawTotal.toLocaleString('vi-VN') + 'đ';
    }
    if (!svgEl || !legEl) return;

    const r = 38;
    const c = 2 * Math.PI * r;
    let offset = 0;
    let circlesHtml = `<circle cx="54" cy="54" r="${r}" fill="none" stroke="rgba(148,163,184,0.22)" stroke-width="14"></circle>`;

    if (rawTotal > 0 && __nxState.isLoggedIn) {
        segs.forEach(seg => {
            const pct = Number(seg.amount || 0) / total;
            const dash = pct * c;
            circlesHtml += `<circle cx="54" cy="54" r="${r}" fill="none" stroke="${seg.color}" stroke-width="14" stroke-dasharray="${dash.toFixed(2)} ${(c - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 54 54)"></circle>`;
            offset += dash;
        });
    }
    svgEl.innerHTML = circlesHtml;

    legEl.innerHTML = segs.map(seg => {
        const pct = rawTotal > 0 ? Math.round((Number(seg.amount || 0) / total) * 100) : 0;
        const valText = !__nxState.isLoggedIn
            ? '🔒 Đăng nhập'
            : (__nxState.hideBalance ? '••%' : `${pct}% (${Number(seg.amount || 0).toLocaleString('vi-VN')}đ)`);
        return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.74rem;margin-bottom:5px;">
            <span style="display:flex;align-items:center;gap:6px;"><span style="width:9px;height:9px;border-radius:50%;background:${seg.color};display:inline-block;"></span>${seg.label}</span>
            <strong>${valText}</strong>
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
            box.innerHTML = `<div style="font-size:0.78rem;color:var(--nx-muted);text-align:center;padding:12px;background:var(--nx-surface-2);border-radius:14px;">Hiện chưa có hóa đơn QR nào đang chờ thanh toán trong SQLite.</div>`;
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
        box.innerHTML = `<div style="font-size:0.78rem;color:var(--nx-muted);">Đang đồng bộ phiên đấu giá thời gian thực từ SQLite...</div>`;
        return;
    }
    box.innerHTML = auctions.slice(0, 4).map(a => {
        const isDutch = String(a.auction_type || '').toUpperCase().includes('DUTCH');
        const pName = a.product_name || a.title || 'Sản phẩm Đấu Giá Nexora';
        const stepVal = Number(a.min_step || a.min_step_price || 500000);
        const bidsCnt = Number(a.bid_count ?? a.total_bids ?? 0);
        const badge = isDutch
            ? `<span style="background:#f43f5e;color:#fff;font-size:0.64rem;font-weight:800;padding:2px 6px;border-radius:6px;">⚡ Đấu Giá Ngược Giảm Từng Giây</span>`
            : `<span style="background:#059669;color:#fff;font-size:0.64rem;font-weight:800;padding:2px 6px;border-radius:6px;">🛡️ Ký Quỹ 10% Anti-Sniping +30s</span>`;
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
    const box = document.getElementById('nxThemeSelectorList');
    if (!box) return;
    box.innerHTML = NX_THEMES.map(t => {
        const isAct = t.id === __nxState.themeId;
        return `<div class="nx-theme-option-card ${isAct ? 'active' : ''}" onclick="nxApplyTheme('${t.id}', true)">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="width:32px;height:32px;border-radius:10px;background:${t.swatch};display:inline-block;border:1px solid rgba(255,255,255,0.4);"></span>
                <div style="font-size:0.82rem;font-weight:700;">${t.name}</div>
            </div>
            <span>${isAct ? '✅ Đang dùng' : 'Chọn'}</span>
        </div>`;
    }).join('');
}

async function openMobileQrScannerCenter() {
    openNxModal('nxQrScannerModal');
    await startMobileCameraQr();
    await syncMobileBridge();
}

async function startMobileCameraQr() {
    stopMobileCameraQr();
    const video = document.getElementById('nxMobileQrVideo');
    const wrap = document.getElementById('nxMobileCameraBox');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        nxToast('⚠️ Bạn có thể chọn Ảnh Mã QR từ Thư viện máy hoặc chọn đơn đang chờ bên dưới!');
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
                    handleDecodedQrString(code.data);
                }
            }
        }, 220);
    } catch (err) {
        nxToast('📷 Hãy chọn Ảnh Mã QR từ Thư viện máy hoặc bấm vào hóa đơn AWAITING_PAYMENT bên dưới!');
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

function handleQrGalleryImageSelected(ev) {
    const file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(loadEv) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('nxMobileQrCanvas');
            const ctx = canvas.getContext('2d');
            const scales = [1, 1.5, 0.75];
            let foundData = '';
            for (const sc of scales) {
                const dw = Math.round((img.naturalWidth || img.width || 300) * sc);
                const dh = Math.round((img.naturalHeight || img.height || 300) * sc);
                canvas.width = dw + 40;
                canvas.height = dh + 40;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20, dw, dh);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                if (typeof jsQR === 'function') {
                    const res = jsQR(imgData.data, imgData.width, imgData.height);
                    if (res && res.data && String(res.data).trim()) {
                        foundData = String(res.data).trim();
                        break;
                    }
                }
            }
            if (foundData) {
                stopMobileCameraQr();
                handleDecodedQrString(foundData);
            } else {
                nxToast('❌ Không tìm thấy mã QR hợp lệ trong bức ảnh bạn vừa chọn!');
            }
        };
        img.src = loadEv.target.result;
    };
    reader.readAsDataURL(file);
}

async function handleDecodedQrString(rawStr) {
    const s = String(rawStr || '').trim();
    if (s.toUpperCase().includes('QRWEB') || s.includes('web_login_token=')) {
        const res = await fetch(nxApiUrl('/api/mobile/smart-otp/approve-qr-login'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ qr_login_token: s })
        });
        const data = await res.json();
        nxToast(data.message || data.error || '📲 Đã duyệt QR đăng nhập máy tính!');
        if (res.ok && data.ok) {
            triggerNativeOrWebLockScreenNotification('📲 Duyệt QR Đăng Nhập Web', data.message);
        }
        return;
    }
    await inspectQrTokenInvoice(s);
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
    if (!requireMobileLoginForAction('xác nhận thanh toán hóa đơn QR')) return;
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
            user_id: __nxState.authUser.id,
            payer_id: __nxState.authUser.id,
            pay_token: info.pay_token,
            payer_mode: __nxState.payerMode,
            payment_mode: __nxState.payerMode,
            is_paid_on_behalf: __nxState.payerMode === 'behalf',
            payer_name: __nxState.payerMode === 'behalf' ? (payerName || __nxState.authUser.full_name) : (__nxState.authUser.full_name || __nxState.authUser.username),
            payer_message: __nxState.payerMode === 'behalf' ? payerMsg : ''
        };
        const res = await fetch(nxApiUrl('/api/payment/qr-session/confirm'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            if (window.NexoraNativeBridge && typeof window.NexoraNativeBridge.vibrateShort === 'function') {
                try { window.NexoraNativeBridge.vibrateShort(); } catch (e) {}
            }
            const paidAmt = Number(data.paid_amount || info.amount || 0);
            speakBalanceChangeByAiSoundbox(`Nexora Pay thông báo: Đã khóa bảo lãnh Escrow thành công ${paidAmt} đồng cho đơn hàng ${info.order_code || ''}`);
            triggerNativeOrWebLockScreenNotification(
                `✅ Đã Thanh Toán QR ${info.order_code || ''}`,
                `Số tiền ${paidAmt.toLocaleString('vi-VN')} ₫ đã được bảo vệ trong Quỹ Bảo Lãnh Escrow.`,
                data.next_step_url || '/services/order_tracking/tracking.html'
            );
            localStorage.setItem('nvx_qr_payment_confirmed', JSON.stringify({
                ts: Date.now(),
                pay_token: info.pay_token,
                qr_token: info.pay_token,
                tx_id: data.tx_code || info.pay_token,
                order_id: data.order_id || info.order_id,
                tracking_code: data.tracking_code || info.tracking_code,
                amount: paidAmt,
                is_paid_on_behalf: Boolean(data.is_paid_on_behalf),
                payer_name: data.payer_name || '',
                payer_message: data.payer_message || '',
                next_step_url: data.next_step_url || '/services/order_tracking/tracking.html',
                status: 'APPROVED'
            }));
            __nxState.lastReceiptData = {
                tx_code: data.tx_code || info.pay_token,
                amount: paidAmt,
                recipient: 'Quỹ Bảo Lãnh Nexora Escrow',
                note: `Thanh toán QR ${info.order_code || ''}`,
                created_at: new Date().toLocaleString('vi-VN')
            };
            nxToast('🎉 Đã xác nhận thanh toán QR! Màn hình checkout.html trên PC đã tự động nhảy sang trang Vận đơn!');
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

function openProtectedWalletModal() {
    if (!requireMobileLoginForAction('nạp/rút hoặc chuyển tiền Ví Nexora Pay')) return;
    openNxModal('nxTopupWithdrawModal');
}

async function submitMobileWalletAction(actionType) {
    if (!requireMobileLoginForAction('giao dịch Ví Nexora Pay')) return;
    const amtInput = document.getElementById('nxWalletActionAmount');
    const recInput = document.getElementById('nxWalletActionRecipient');
    const noteInput = document.getElementById('nxWalletActionNote');
    const amount = Number(amtInput ? amtInput.value : 0);
    const recipient = (recInput ? recInput.value : '') || 'Ví Nexora Pay';
    const note = noteInput ? noteInput.value : '';

    try {
        const res = await fetch(nxApiUrl('/api/mobile/wallet-action'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                user_id: __nxState.authUser.id,
                username: __nxState.authUser.username,
                action: actionType,
                amount,
                recipient,
                note
            })
        });
        const data = await res.json();
        if (res.status === 401 || data.require_login) {
            closeNxModal('nxTopupWithdrawModal');
            openNxModal('nxMobileAuthModal');
            nxToast(data.error || '🔒 Vui lòng đăng nhập!');
            return;
        }
        if (res.ok && data.ok) {
            if (amtInput) amtInput.value = '';
            speakBalanceChangeByAiSoundbox(data.soundbox_speech || data.message);
            triggerNativeOrWebLockScreenNotification('💸 Biến Động Số Dư Nexora Pay', data.message);
            closeNxModal('nxTopupWithdrawModal');
            await syncMobileBridge();
            openReceiptForTransaction(data.tx_code, amount, data.note || note, data.created_at);
        } else {
            nxToast(data.error || '⚠️ Giao dịch không thành công');
        }
    } catch (e) {
        nxToast('❌ Lỗi kết nối máy chủ khi thực hiện giao dịch ví!');
    }
}

async function openSmartOtpKeyModal() {
    if (!requireMobileLoginForAction('mở Khóa Bảo Mật Động Smart OTP Key')) return;
    openNxModal('nxSmartOtpModal');
    await generateNewSmartOtpCode(__nxState.smartOtpLen, false);
    if (__nxState.smartOtpTimer) clearInterval(__nxState.smartOtpTimer);
    __nxState.smartOtpTimer = setInterval(async () => {
        __nxState.smartOtpRemain -= 1;
        if (__nxState.smartOtpRemain <= 0) {
            await generateNewSmartOtpCode(__nxState.smartOtpLen, false);
        } else {
            drawSmartOtpCountdownRing();
        }
    }, 1000);
}

async function generateNewSmartOtpCode(pinLength = 6, pushLockscreen = false) {
    if (!requireMobileLoginForAction('cấp mã Smart OTP')) return;
    __nxState.smartOtpLen = Number(pinLength) || 6;
    [4, 6, 8].forEach(l => {
        const b = document.getElementById('nxSmartOtpLenBtn' + l);
        if (b) {
            b.style.background = l === __nxState.smartOtpLen ? 'var(--nx-primary)' : 'var(--nx-surface-2)';
            b.style.color = l === __nxState.smartOtpLen ? '#fff' : 'var(--nx-text)';
        }
    });
    try {
        const res = await fetch(nxApiUrl('/api/mobile/smart-otp/generate'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                user_id: __nxState.authUser.id,
                pin_length: __nxState.smartOtpLen,
                push_lockscreen: pushLockscreen
            })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            __nxState.smartOtpCode = data.dynamic_pin;
            __nxState.smartOtpRemain = 30;
            const codeEl = document.getElementById('nxSmartOtpDigitsDisplay');
            if (codeEl) codeEl.textContent = String(data.dynamic_pin).split('').join(' ');
            drawSmartOtpCountdownRing();
            if (pushLockscreen) {
                triggerNativeOrWebLockScreenNotification(
                    `🔐 Mã Smart OTP (${__nxState.smartOtpLen} Số): ${data.dynamic_pin}`,
                    `Mã xác thực đăng nhập Web của bạn là ${data.dynamic_pin} (Hiệu lực 30 giây).`
                );
                nxToast('📲 Đã bắn mã Smart OTP ra Màn Hình Khóa điện thoại!');
            }
        }
    } catch (e) {}
}

function drawSmartOtpCountdownRing() {
    const cv = document.getElementById('nxSmartOtpRingCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const pct = Math.max(0, __nxState.smartOtpRemain) / 30;
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(5, 150, 105, 0.16)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 46, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = __nxState.smartOtpRemain <= 7 ? '#ef4444' : '#059669';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 46, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = __nxState.smartOtpRemain <= 7 ? '#ef4444' : '#052e16';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(__nxState.smartOtpRemain + 's', w / 2, h / 2);
}

async function openNotificationInboxModal(tab = 'deal') {
    __nxState.activeNotifTab = tab;
    openNxModal('nxNotificationCenterModal');
    await loadNotificationsByTab(tab);
}

async function loadNotificationsByTab(tab = 'deal') {
    __nxState.activeNotifTab = tab;
    ['deal', 'terms', 'balance'].forEach(t => {
        const b = document.getElementById('nxNotifTabBtn_' + t);
        if (b) {
            b.style.background = t === tab ? 'var(--nx-primary)' : 'var(--nx-surface-2)';
            b.style.color = t === tab ? '#fff' : 'var(--nx-text)';
        }
    });
    const termsAgreeBar = document.getElementById('nxTermsAgreementBox');
    if (termsAgreeBar) termsAgreeBar.style.display = tab === 'terms' ? 'block' : 'none';

    const listEl = document.getElementById('nxNotificationsInboxList');
    if (!listEl) return;
    try {
        const res = await fetch(nxApiUrl(`/api/mobile/notifications?category=${encodeURIComponent(tab)}&_t=${Date.now()}`), {
            headers: nxAuthHeaders()
        });
        const data = await res.json();
        const rows = (data && data.notifications) || [];
        if (!rows.length) {
            listEl.innerHTML = `<div style="font-size:0.78rem;color:var(--nx-muted);text-align:center;padding:14px;">Chưa có thông báo nào trong mục này.</div>`;
            return;
        }
        listEl.innerHTML = rows.map(n => {
            return `<div style="padding:11px 12px;border-radius:14px;background:var(--nx-surface-2);border:1.5px solid ${n.is_read ? 'var(--nx-border)' : 'var(--nx-primary)'};margin-bottom:8px;cursor:pointer;" onclick="window.location.href='${n.target_url || '/services/mobile/mobile-app.html'}'">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <strong style="font-size:0.82rem;color:var(--nx-primary);">${n.title}</strong>
                    <span style="font-size:0.65rem;color:var(--nx-muted);">${n.created_at || ''}</span>
                </div>
                <div style="font-size:0.76rem;line-height:1.35;">${n.message}</div>
            </div>`;
        }).join('');
    } catch (e) {}
}

async function triggerPushLockscreenDemo(category) {
    const delayCheck = document.getElementById('nxDelayLockscreenToggle');
    const delayMs = delayCheck && delayCheck.checked ? 3000 : 100;
    if (delayMs >= 1000) {
        nxToast('⏳ Đã hẹn 3 giây! Hãy bấm nút Nguồn tắt/khóa màn hình điện thoại ngay để xem thông báo bật sáng trên Màn Hình Khóa!');
    }
    setTimeout(async () => {
        try {
            const res = await fetch(nxApiUrl('/api/mobile/notifications'), {
                method: 'POST',
                headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ action: 'push_lockscreen', category })
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                triggerNativeOrWebLockScreenNotification(data.title, data.message, data.target_url);
                await loadNotificationsByTab(category);
                await syncMobileBridge();
            }
        } catch (e) {}
    }, delayMs);
}

async function submitAgreeTermsV12() {
    try {
        const res = await fetch(nxApiUrl('/api/mobile/notifications/agree-terms'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({})
        });
        const data = await res.json();
        nxToast(data.message || '✅ Đã xác nhận đồng ý Điều khoản & Chính sách V12!');
        triggerNativeOrWebLockScreenNotification('📜 Đã Đồng Ý Điều Khoản Nexora V12', data.message);
        await loadNotificationsByTab('terms');
    } catch (e) {}
}

function openCheckin7DaysModal() {
    openNxModal('nxCheckin7DaysModal');
    drawCheckin7DaysCanvas();
}

function drawCheckin7DaysCanvas() {
    const cv = document.getElementById('nxCheckin7DaysCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const streak = (__nxState.authUser && Number(__nxState.authUser.streak_days || 1)) || 1;
    const rewards = ['+5K', '+10K', '+15K', '+20K', '+25K', '+30K', '+50K'];

    for (let i = 0; i < 7; i++) {
        const x = 14 + i * 54;
        const y = 22;
        const done = (i + 1) <= streak;
        ctx.fillStyle = done ? '#059669' : '#dcfce7';
        ctx.beginPath();
        ctx.roundRect(x, y, 46, 76, 12);
        ctx.fill();
        ctx.fillStyle = done ? '#ffffff' : '#052e16';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ngày ' + (i + 1), x + 23, y + 22);
        ctx.fillStyle = done ? '#fde047' : '#059669';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(rewards[i], x + 23, y + 48);
        ctx.font = '12px sans-serif';
        ctx.fillText(done ? '🔥' : '🪙', x + 23, y + 68);
    }
}

async function triggerMobileDailyCheckin() {
    if (!requireMobileLoginForAction('điểm danh chuỗi lửa 7 ngày nhận Xu')) return;
    try {
        const res = await fetch(nxApiUrl('/api/settings/daily-checkin'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ user_id: __nxState.authUser.id })
        });
        const data = await res.json();
        nxToast(data.message || '🔥 Điểm danh chuỗi lửa thành công!');
        speakBalanceChangeByAiSoundbox(data.message || 'Điểm danh chuỗi lửa thành công');
        await syncMobileBridge();
        drawCheckin7DaysCanvas();
    } catch (e) {
        nxToast('❌ Không thể kết nối API Điểm danh!');
    }
}

function openMiniGameCenterModal(gameType = 'wheel') {
    openNxModal('nxMiniGameCenterModal');
    switchMiniGameMode(gameType);
}

function switchMiniGameMode(gameType) {
    __nxState.activeMiniGame = gameType;
    if (__nxState.aimTimer) {
        clearInterval(__nxState.aimTimer);
        __nxState.aimTimer = null;
    }
    ['wheel', 'aim', 'tree'].forEach(g => {
        const b = document.getElementById('nxGameTab_' + g);
        if (b) {
            b.style.background = g === gameType ? 'var(--nx-primary)' : 'var(--nx-surface-2)';
            b.style.color = g === gameType ? '#fff' : 'var(--nx-text)';
        }
    });
    const actBtn = document.getElementById('nxMiniGamePrimaryBtn');
    if (gameType === 'wheel') {
        if (actBtn) {
            actBtn.textContent = '🎡 QUAY VÒNG QUAY LỤC BẢO NGAY';
            actBtn.onclick = startCanvasWheelSpin;
        }
        drawLuckyWheelGameCanvas();
    } else if (gameType === 'aim') {
        __nxState.aimScore = 0;
        __nxState.aimTimeLeft = 30;
        if (actBtn) {
            actBtn.textContent = '🎯 BẮT ĐẦU BẮN TÂM 30 GIÂY & NHẬN XU';
            actBtn.onclick = startAimReflexCanvasGame;
        }
        drawAimReflexGameCanvas();
    } else {
        if (actBtn) {
            actBtn.textContent = '🌱 TƯỚI NƯỚC & THU HOẠCH QUẢ TIỀN VÀNG';
            actBtn.onclick = waterAndHarvestEmeraldTree;
        }
        drawMoneyTreeGameCanvas();
    }
}

function drawLuckyWheelGameCanvas() {
    const cv = document.getElementById('nxInteractiveGameCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const r = 105;
    const prizes = ['50K Xu', 'GEAR50K', '20K Xu', 'BRAND30K', '10K Xu', 'START15K', '5K Xu', '1K Xu'];
    const cols = ['#059669', '#10b981', '#047857', '#0ea5e9', '#d97706', '#76b900', '#0284c7', '#f59e0b'];

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(__nxState.wheelAngle);
    for (let i = 0; i < 8; i++) {
        const a0 = (i * Math.PI) / 4;
        const a1 = ((i + 1) * Math.PI) / 4;
        ctx.fillStyle = cols[i];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, a0, a1);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.rotate(a0 + Math.PI / 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(prizes[i], r - 12, 4);
        ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 10);
    ctx.lineTo(cx - 10, cy - r + 12);
    ctx.lineTo(cx + 10, cy - r + 12);
    ctx.closePath();
    ctx.fill();
}

async function startCanvasWheelSpin() {
    if (!requireMobileLoginForAction('quay Vòng Quay Lục Bảo')) return;
    if (__nxState.wheelSpinning) return;
    __nxState.wheelSpinning = true;
    let vel = 0.42;
    const anim = setInterval(() => {
        __nxState.wheelAngle += vel;
        vel *= 0.96;
        drawLuckyWheelGameCanvas();
        if (vel < 0.01) {
            clearInterval(anim);
            __nxState.wheelSpinning = false;
            triggerMobileLuckySpin();
        }
    }, 30);
}

function drawAimReflexGameCanvas() {
    const cv = document.getElementById('nxInteractiveGameCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    ctx.fillStyle = '#052e16';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🎯 Điểm: ${__nxState.aimScore}  |  ⏱️ Còn: ${__nxState.aimTimeLeft}s`, 16, 26);

    const t = __nxState.aimTarget;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r * 0.28, 0, Math.PI * 2); ctx.fill();
}

function startAimReflexCanvasGame() {
    if (!requireMobileLoginForAction('chơi Bắn Tâm Phản Xạ nhận Xu')) return;
    __nxState.aimScore = 0;
    __nxState.aimTimeLeft = 15;
    if (__nxState.aimTimer) clearInterval(__nxState.aimTimer);
    __nxState.aimTimer = setInterval(() => {
        __nxState.aimTimeLeft -= 1;
        drawAimReflexGameCanvas();
        if (__nxState.aimTimeLeft <= 0) {
            clearInterval(__nxState.aimTimer);
            __nxState.aimTimer = null;
            triggerMobileReflexArenaClaim();
        }
    }, 1000);
    drawAimReflexGameCanvas();
}

function drawMoneyTreeGameCanvas() {
    const cv = document.getElementById('nxInteractiveGameCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const w = cv.width;
    const h = cv.height;
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#78350f';
    ctx.fillRect(w / 2 - 14, h - 90, 28, 70);
    ctx.fillStyle = '#059669';
    ctx.beginPath(); ctx.arc(w / 2, h - 120, 56, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2 - 38, h - 100, 40, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w / 2 + 38, h - 100, 40, 0, Math.PI * 2); ctx.fill();

    const coinCoords = [[w / 2 - 30, h - 130], [w / 2 + 26, h - 135], [w / 2, h - 155], [w / 2 - 44, h - 95], [w / 2 + 44, h - 95]];
    coinCoords.forEach(c => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(c[0], c[1], 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XU', c[0], c[1] + 3);
    });
}

async function waterAndHarvestEmeraldTree() {
    if (!requireMobileLoginForAction('tưới cây & thu hoạch Xu')) return;
    drawMoneyTreeGameCanvas();
    await triggerMobileDailyCheckin();
}

function handleInteractiveGameCanvasTap(ev) {
    const cv = document.getElementById('nxInteractiveGameCanvas');
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    const px = (ev.clientX - rect.left) * scaleX;
    const py = (ev.clientY - rect.top) * scaleY;

    if (__nxState.activeMiniGame === 'aim') {
        const d = Math.hypot(px - __nxState.aimTarget.x, py - __nxState.aimTarget.y);
        if (d <= __nxState.aimTarget.r + 14) {
            __nxState.aimScore += 1;
            __nxState.aimTarget.x = 40 + Math.random() * (cv.width - 80);
            __nxState.aimTarget.y = 50 + Math.random() * (cv.height - 90);
            drawAimReflexGameCanvas();
        }
    } else if (__nxState.activeMiniGame === 'wheel') {
        startCanvasWheelSpin();
    } else {
        waterAndHarvestEmeraldTree();
    }
}

async function placeStandardBidOnMobile(auctionId, bidAmount) {
    if (!requireMobileLoginForAction('đặt giá đấu giá ký quỹ 10%')) return;
    try {
        const res = await fetch(nxApiUrl('/api/auctions/bid'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                auction_id: auctionId,
                bid_amount: bidAmount,
                user_id: __nxState.authUser.id,
                username: __nxState.authUser.username
            })
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
    if (!requireMobileLoginForAction('chốt mua đấu giá ngược')) return;
    try {
        const res = await fetch(nxApiUrl('/api/auctions/dutch-claim'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                auction_id: auctionId,
                user_id: __nxState.authUser.id,
                username: __nxState.authUser.username
            })
        });
        const data = await res.json();
        nxToast(data.message || data.error || '⚡ Đã chốt mua phiên Đấu giá ngược!');
        await refreshLiveAuctionsList();
        await syncMobileBridge();
    } catch (e) {
        nxToast('❌ Lỗi kết nối Đấu Giá Ngược!');
    }
}

async function triggerMobileLuckySpin() {
    if (!requireMobileLoginForAction('quay Vòng Quay May Mắn')) return;
    try {
        const res = await fetch(nxApiUrl('/api/minigame/spin'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ user_id: __nxState.authUser.id })
        });
        const data = await res.json();
        const msg = data.message || (data.prize && data.prize.label ? '🎡 Chúc mừng bạn quay trúng: ' + data.prize.label : '🎡 Đã quay Vòng Quay May Mắn!');
        nxToast(msg);
        speakBalanceChangeByAiSoundbox(msg);
        await syncMobileBridge();
    } catch (e) {
        nxToast('❌ Không thể kết nối API Vòng quay may mắn!');
    }
}

async function triggerMobileReflexArenaClaim() {
    if (!requireMobileLoginForAction('nhận thưởng Bắn Tâm Phản Xạ Esport')) return;
    try {
        const hits = Math.max(15, __nxState.aimScore || 25);
        const res = await fetch(nxApiUrl('/api/minigame/reflex-arena/claim'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                score: hits,
                hits: hits,
                user_id: __nxState.authUser.id,
                username: __nxState.authUser.username
            })
        });
        const data = await res.json();
        nxToast(data.message || '🎯 Đã nhận thưởng Bắn Tâm Phản Xạ Esport!');
        speakBalanceChangeByAiSoundbox(data.message || 'Đã nhận thưởng bắn tâm phản xạ');
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
        const prodName = (data.selected_product && data.selected_product.name) || data.product_name || 'Linh kiện công nghệ VN';
        const curPrice = Number((data.selected_product && data.selected_product.current_price) || data.current_price || 0);
        const targetInp = document.getElementById('nxWatchlistTargetPrice');
        if (targetInp && curPrice > 0) targetInp.value = Math.round(curPrice * 0.92);

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
    if (!requireMobileLoginForAction('đặt báo động canh giá linh kiện')) return;
    const targetPrice = Number(document.getElementById('nxWatchlistTargetPrice')?.value || 0);
    try {
        const res = await fetch(nxApiUrl('/api/market-tracker/watchlist'), {
            method: 'POST',
            headers: nxAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                user_id: __nxState.authUser.id,
                username: __nxState.authUser.username,
                product_id: 1,
                target_price: targetPrice
            })
        });
        const data = await res.json();
        const msg = data.message || `🔔 Đã đặt báo động giảm giá ở mức ${targetPrice.toLocaleString('vi-VN')} ₫!`;
        nxToast(msg);
        triggerNativeOrWebLockScreenNotification('🏷️ Đã Đặt Báo Động Giảm Giá', msg, '/services/market_tracker/price-tracker.html');
    } catch (e) {
        nxToast('❌ Lỗi khi lưu báo động giá!');
    }
}

function handleQuickSearchInput(ev) {
    if (ev && ev.key === 'Enter') {
        const val = (ev.target.value || '').trim();
        if (!val) return;
        handleDecodedQrString(val);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    renderNexoraCanvasIcons();
    await nxApplyTheme(__nxState.themeId, false);
    await nxApplyCvdMode(__nxState.cvdMode, false);
    if ('Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch (e) {}
    }
    if ('serviceWorker' in navigator) {
        try { navigator.serviceWorker.register('/sw.js'); } catch (e) {}
    }
    await syncMobileBridge();
    await refreshLiveAuctionsList();
    const params = new URLSearchParams(window.location.search);
    const payTok = params.get('pay_token') || params.get('qr_token') || '';
    if (payTok) {
        setMobilePayerMode(params.get('mode') === 'behalf' ? 'behalf' : 'self');
        await inspectQrTokenInvoice(payTok);
    }
    setInterval(syncMobileBridge, 6000);
});
