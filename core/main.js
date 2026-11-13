/* ==========================================================================
   CORE/MAIN.JS - ĐỒNG BỘ HEADER/FOOTER SẪM MÀU, TRẠM HỢP NHẤT MÈO AI & CHAT
   ========================================================================== */

const NV_SEASONAL_THEMES = [
    { key: 'nvidia-emerald', label: '🟢 1. Nvidia Emerald (Công Nghệ)', dark: true },
    { key: 'tet-festival', label: '🧧 2. Tết Nguyên Đán (Hoa Đào & Lì Xì)', dark: true },
    { key: 'christmas-snow', label: '🎄 3. Giáng Sinh (Tuyết Rơi & Quà)', dark: true },
    { key: 'football-cup', label: '⚽ 4. Mùa Bóng Đá (Sân Cỏ & Cúp Vàng)', dark: true },
    { key: 'cyber-halloween', label: '🎃 5. Đêm Hội Cyber Halloween', dark: true },
    { key: 'pure-daylight', label: '☀️ 6. Minimalist Daylight (Nền Sáng)', dark: false }
];

const NV_CATEGORY_DEFAULT_SVG_MAP = {
    gpu: { bg1: '#0f172a', bg2: '#365314', accent: '#76b900', icon: '🎮', title: 'GEFORCE RTX GPU' },
    cpu: { bg1: '#09192b', bg2: '#1d4ed8', accent: '#38bdf8', icon: '⚡', title: 'CORE PROCESSOR' },
    mainboard: { bg1: '#18181b', bg2: '#7f1d1d', accent: '#f43f5e', icon: '🎛️', title: 'MAINBOARD PRO' },
    ram: { bg1: '#1e1b4b', bg2: '#581c87', accent: '#c084fc', icon: '💾', title: 'DDR5 MEMORY' },
    monitor: { bg1: '#042f2e', bg2: '#0f766e', accent: '#2dd4bf', icon: '🖥️', title: 'GAMING MONITOR' },
    psu: { bg1: '#1c1917', bg2: '#78350f', accent: '#facc15', icon: '🔋', title: '80+ GOLD PSU' },
    keyboard: { bg1: '#111827', bg2: '#374151', accent: '#a3e635', icon: '⌨️', title: 'MECH KEYBOARD' },
    mouse: { bg1: '#0f172a', bg2: '#1e3a8a', accent: '#60a5fa', icon: '🖱️', title: 'ESPORTS MOUSE' },
    headphones: { bg1: '#2e1065', bg2: '#4c1d95', accent: '#f472b6', icon: '🎧', title: 'STUDIO AUDIO' },
    speaker: { bg1: '#1f2937', bg2: '#312e81', accent: '#818cf8', icon: '🔊', title: 'HI-FI SPEAKER' },
    fashion: { bg1: '#14532d', bg2: '#064e3b', accent: '#4ade80', icon: '🎒', title: 'TECH BACKPACK' },
    home_living: { bg1: '#27272a', bg2: '#713f12', accent: '#fde047', icon: '💡', title: 'SMART DECOR' },
    health_care: { bg1: '#064e3b', bg2: '#047857', accent: '#34d399', icon: '⌚', title: 'HEALTH & CARE' }
};

let __nvCanvasAnimId = null;
let __nvParticles = [];
let __nvNotifFilterMode = 'all';
let __nvNotificationsCache = [];
let __nvMessengerOpenWindows = [];
let __nvMessengerSessionsCache = [];
let __nvMessengerPollTimer = null;
let __nvSearchDebounceTimer = null;

function formatVND(amount) {
    const num = Number(amount || 0);
    return num.toLocaleString('vi-VN') + ' ₫';
}
window.formatVND = formatVND;

function getAuthUser() {
    try {
        if (localStorage.getItem('nvx_explicit_login') !== '1') {
            localStorage.removeItem('nvidia_user');
            localStorage.removeItem('auth_user');
            return null;
        }
        const raw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
        if (!raw || raw === 'null' || raw === 'undefined') return null;
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.id || parsed.username || parsed.email)) {
            return parsed;
        }
    } catch (e) {}
    return null;
}
window.getAuthUser = getAuthUser;

function setAuthUser(userObj) {
    if (!userObj) {
        localStorage.removeItem('nvx_explicit_login');
        localStorage.removeItem('nvidia_user');
        localStorage.removeItem('auth_user');
        return;
    }
    localStorage.setItem('nvx_explicit_login', '1');
    localStorage.setItem('nvidia_user', JSON.stringify(userObj));
    localStorage.setItem('auth_user', JSON.stringify(userObj));
    localStorage.setItem('nvx_auth_sync_ts', String(Date.now()));
}
window.setAuthUser = setAuthUser;

async function logoutUser() {
    localStorage.removeItem('nvx_explicit_login');
    localStorage.removeItem('nvidia_user');
    localStorage.removeItem('auth_user');
    sessionStorage.clear();
    localStorage.setItem('nvx_logout_event_ts', String(Date.now()));
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.replace('/services/auth/auth.html');
}
window.logoutUser = logoutUser;

function enforceProtectedRouteGuard() {
    const path = window.location.pathname.toLowerCase();
    const user = getAuthUser();

    if (path.includes('/admin_dispute/admin-center.html')) {
        if (!user || user.role !== 'admin') {
            window.location.replace('/services/auth/auth.html?redirect=admin');
            return false;
        }
    } else if (path.includes('/seller/seller-dashboard.html') || path.includes('/seller/sell.html') || path.includes('/seller/store-customization.html')) {
        if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
            window.location.replace('/services/auth/seller-auth.html');
            return false;
        }
    }
    return true;
}

window.addEventListener('storage', (ev) => {
    if (ev.key === 'nvx_logout_event_ts' || ((ev.key === 'nvidia_user' || ev.key === 'auth_user') && !ev.newValue)) {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/admin_dispute/') || path.includes('/seller/seller-dashboard') || path.includes('/seller/sell') || path.includes('/settings/')) {
            window.location.replace('/services/auth/auth.html');
        } else {
            window.location.reload();
        }
    } else if (ev.key === 'nvx_auth_sync_ts') {
        window.location.reload();
    }
});

function inferSmartCategoryKey(catKey, itemName = '') {
    const rawCat = String(catKey || '').toLowerCase().trim();
    const nameLow = String(itemName || '').toLowerCase();
    if (rawCat === 'mainboard' || nameLow.includes('mainboard') || nameLow.includes('bo mạch') || nameLow.includes('z790') || nameLow.includes('b760') || nameLow.includes('x670')) return 'mainboard';
    if (rawCat === 'headphones' || nameLow.includes('tai nghe') || nameLow.includes('headphone') || nameLow.includes('earbuds') || nameLow.includes('airpods')) return 'headphones';
    if (nameLow.includes('đồng hồ') || nameLow.includes('watch') || nameLow.includes('massage') || nameLow.includes('sức khỏe') || nameLow.includes('cân')) return 'health_care';
    if (nameLow.includes('bàn phím') || nameLow.includes('keyboard') || nameLow.includes('keycap')) return 'keyboard';
    if (nameLow.includes('chuột') || nameLow.includes('mouse')) return 'mouse';
    if (nameLow.includes('loa') || nameLow.includes('speaker') || nameLow.includes('mic')) return 'speaker';
    if (nameLow.includes('balo') || nameLow.includes('túi') || nameLow.includes('áo')) return 'fashion';
    if (nameLow.includes('đèn') || nameLow.includes('bình giữ nhiệt') || nameLow.includes('quạt') || nameLow.includes('decor') || nameLow.includes('ghế')) return 'home_living';
    if (nameLow.includes('màn hình') || nameLow.includes('monitor') || nameLow.includes('oled')) return 'monitor';
    if (nameLow.includes('ram') || nameLow.includes('ssd') || nameLow.includes('ổ cứng') || nameLow.includes('nvme')) return 'ram';
    if (nameLow.includes('cpu') || nameLow.includes('vi xử lý') || nameLow.includes('core i') || nameLow.includes('ryzen')) return 'cpu';
    if (nameLow.includes('nguồn') || nameLow.includes('psu') || nameLow.includes('tản nhiệt')) return 'psu';
    if (NV_CATEGORY_DEFAULT_SVG_MAP[rawCat]) return rawCat;
    return 'gpu';
}

function buildCategoryDefaultSvgDataUri(catKey, itemName = '') {
    const resolvedKey = inferSmartCategoryKey(catKey, itemName);
    const cfg = NV_CATEGORY_DEFAULT_SVG_MAP[resolvedKey] || NV_CATEGORY_DEFAULT_SVG_MAP.gpu;
    const shortLabel = String(itemName || cfg.title).slice(0, 24).replace(/[<>&"']/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
        <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${cfg.bg1}"/>
                <stop offset="100%" stop-color="${cfg.bg2}"/>
            </linearGradient>
        </defs>
        <rect width="320" height="220" rx="16" fill="url(#g)"/>
        <rect x="8" y="8" width="304" height="204" rx="12" fill="none" stroke="${cfg.accent}" stroke-width="2" stroke-opacity="0.55"/>
        <circle cx="160" cy="84" r="42" fill="${cfg.accent}" fill-opacity="0.16" stroke="${cfg.accent}" stroke-width="1.5"/>
        <text x="160" y="100" font-size="42" text-anchor="middle" font-family="Segoe UI Emoji, Arial">${cfg.icon}</text>
        <text x="160" y="154" font-size="12.5" font-weight="bold" fill="${cfg.accent}" text-anchor="middle" font-family="Arial, sans-serif">${cfg.title}</text>
        <text x="160" y="176" font-size="11.5" fill="#e2e8f0" text-anchor="middle" font-family="Arial, sans-serif">${shortLabel}</text>
        <text x="160" y="198" font-size="9.5" fill="#94a3b8" text-anchor="middle" font-family="Arial, sans-serif">NVIDIA STORE VERIFIED</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
window.buildCategoryDefaultSvgDataUri = buildCategoryDefaultSvgDataUri;

function getProductImageUrl(p) {
    if (!p) return buildCategoryDefaultSvgDataUri('gpu', 'Nvidia Product');
    var img = String(p.image_url || p.image || '').trim();
    if (img && img !== 'null' && img !== 'undefined' && img !== '/assets/icons/icon.png' && !img.endsWith('placeholder.png')) {
        if (window.__nvxIconManifestVersion && img.indexOf('/api/settings/product-icon-svg') !== -1 && img.indexOf('v=') === -1) {
            img += (img.indexOf('?') !== -1 ? '&' : '?') + 'v=' + window.__nvxIconManifestVersion;
        }
        return img;
    }
    return buildCategoryDefaultSvgDataUri(p.category || 'gpu', p.name || '');
}
window.getProductImageUrl = getProductImageUrl;

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('nvidia_cart') || '[]');
    } catch (e) {
        return [];
    }
}
window.getCart = getCart;

function saveCart(cartList) {
    const arr = Array.isArray(cartList) ? cartList : [];
    localStorage.setItem('nvidia_cart', JSON.stringify(arr));
    updateCartBadge();
    const u = getAuthUser();
    if (u && u.id) {
        fetch('/api/compare/cart/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: u.id, items: arr })
        }).catch(() => {});
    }
}
window.saveCart = saveCart;

function updateCartBadge() {
    const cart = getCart();
    const total = cart.reduce((s, i) => s + Math.max(1, parseInt(i.quantity || i.qty || 1, 10)), 0);
    document.querySelectorAll('#headerCartCount, .header-cart-badge').forEach(el => {
        el.textContent = String(total);
    });
}
window.updateCartBadge = updateCartBadge;

function addToCartGlobal(product, opts = {}) {
    if (!product) return;
    const cart = getCart();
    const pid = Number(product.id || product.product_id || 1);
    const addQty = Math.max(1, parseInt(opts.quantity || product.quantity || product.qty || 1, 10));
    const existing = cart.find(i => Number(i.id || i.product_id) === pid);
    if (existing) {
        existing.quantity = Math.max(1, parseInt(existing.quantity || existing.qty || 1, 10)) + addQty;
        existing.qty = existing.quantity;
    } else {
        cart.push({
            id: pid,
            product_id: pid,
            name: product.name || ('Sản phẩm #' + pid),
            price: Number(product.price || 0),
            quantity: addQty,
            qty: addQty,
            unit: product.unit || 'Chiếc',
            warranty: product.warranty || '36 tháng',
            category: product.category || 'gpu',
            image_url: product.image_url || '/assets/icons/icon.png'
        });
    }
    saveCart(cart);
    if (!opts.silent) {
        notifyToast(`🛒 Đã thêm x${addQty} "${product.name}" vào Giỏ hàng!`, 'success');
    }
}
window.addToCartGlobal = addToCartGlobal;

function getFavoriteIds() {
    try {
        return JSON.parse(localStorage.getItem('nvidia_favorites') || '[]').map(Number);
    } catch (e) {
        return [];
    }
}
window.getFavoriteIds = getFavoriteIds;

function isProductFavorited(prodId) {
    return getFavoriteIds().includes(Number(prodId));
}
window.isProductFavorited = isProductFavorited;

function toggleFavoriteGlobal(prodId, btnEl) {
    const pid = Number(prodId);
    let favs = getFavoriteIds();
    const exists = favs.includes(pid);
    if (exists) {
        favs = favs.filter(x => x !== pid);
        if (btnEl) btnEl.innerHTML = '🤍';
        notifyToast('Đã bỏ khỏi danh sách Yêu thích', 'info');
    } else {
        favs.push(pid);
        if (btnEl) btnEl.innerHTML = '❤️';
        notifyToast('❤️ Đã lưu vào Yêu thích (Sẽ báo ngay khi giảm giá)!', 'success');
    }
    localStorage.setItem('nvidia_favorites', JSON.stringify(favs));
}
window.toggleFavoriteGlobal = toggleFavoriteGlobal;

function getViewedProductIds() {
    try {
        return JSON.parse(localStorage.getItem('nvidia_viewed_ids') || '[]').map(Number);
    } catch (e) {
        return [];
    }
}
window.getViewedProductIds = getViewedProductIds;

function addViewedProductId(prodId) {
    const pid = Number(prodId);
    if (!pid) return;
    let list = getViewedProductIds().filter(x => x !== pid);
    list.unshift(pid);
    localStorage.setItem('nvidia_viewed_ids', JSON.stringify(list.slice(0, 12)));
}
window.addViewedProductId = addViewedProductId;

function notifyToast(message, type = 'info') {
    let container = document.getElementById('nvGlobalToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'nvGlobalToastContainer';
        Object.assign(container.style, {
            position: 'fixed',
            top: '68px',
            right: '18px',
            zIndex: '10999',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '370px'
        });
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'nv-toast-card';
    const borderCol = type === 'success' ? '#76b900' : (type === 'warning' || type === 'error' ? '#f59e0b' : '#38bdf8');
    const iconSym = type === 'success' ? '✅' : (type === 'warning' || type === 'error' ? '⚠️' : '🔔');
    toast.style.borderLeft = `4px solid ${borderCol}`;
    toast.style.border = `1.5px solid ${borderCol}`;
    toast.innerHTML = `
        <span style="font-size:16px;">${iconSym}</span>
        <div class="flex-fill">${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3400);
}
window.notifyToast = notifyToast;

function applyNvidiaVisualSkin(skinKey) {
    const found = NV_SEASONAL_THEMES.find(t => t.key === skinKey) || NV_SEASONAL_THEMES[0];
    document.documentElement.setAttribute('data-nv-skin', found.key);
    document.documentElement.setAttribute('data-theme', found.dark ? 'dark' : 'light');
    localStorage.setItem('nvx_visual_skin', found.key);
    localStorage.setItem('theme', found.dark ? 'dark' : 'light');
    const sel = document.getElementById('headerThemeSkinSelector');
    if (sel && sel.value !== found.key) sel.value = found.key;
    initSeasonalAnimatedCanvas(found.key);
}
window.applyNvidiaVisualSkin = applyNvidiaVisualSkin;

function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-nv-skin') || 'pure-daylight';
    const nextKey = (cur === 'pure-daylight') ? 'nvidia-emerald' : 'pure-daylight';
    applyNvidiaVisualSkin(nextKey);
}
window.toggleTheme = toggleTheme;

function syncBrowserTabFaviconPng(customIconUrl) {
    var iconHref = customIconUrl || localStorage.getItem('nvx_active_brand_icon_url') || '/assets/icons/icon.png';
    if (customIconUrl) {
        localStorage.setItem('nvx_active_brand_icon_url', customIconUrl);
    }
    var head = document.head || document.getElementsByTagName('head')[0];
    if (head) {
        document.querySelectorAll("link[rel*='icon']").forEach(function(el) { el.remove(); });
        var link1 = document.createElement('link');
        link1.rel = 'icon';
        link1.type = 'image/png';
        link1.href = iconHref;
        head.appendChild(link1);

        var link2 = document.createElement('link');
        link2.rel = 'shortcut icon';
        link2.type = 'image/png';
        link2.href = iconHref;
        head.appendChild(link2);
    }
    var hdrImg = document.getElementById('headerBrandLogoImg');
    if (hdrImg) {
        hdrImg.src = iconHref;
        hdrImg.classList.remove('d-none');
    }
    var nBox = document.getElementById('headerBrandNBox');
    if (nBox) {
        nBox.classList.add('d-none');
    }
}
window.syncBrowserTabFaviconPng = syncBrowserTabFaviconPng;

/* ==========================================================================
   ĐỒNG BỘ BỘ ICON ĐANG KÍCH HOẠT (BỘ 1 • BỘ 2 • BỘ 3 • MẶC ĐỊNH) TRÊN TOÀN SÀN
   (Tự động áp dụng cho Logo, Favicon, 9 Danh mục, Menu Voucher/Nông trại/Bank & Mèo AI)
   ========================================================================== */
function _applySlotIconToElement(el, slotKey, slotObj, activeSet) {
    if (!el || !slotObj) return;
    if (el.tagName === 'IMG') {
        if (slotObj.preview_url) {
            el.src = slotObj.preview_url;
            el.classList.remove('d-none');
        }
        return;
    }
    var existingImg = el.querySelector('img.nvx-dynamic-slot-icon');
    var shouldDisplay = Boolean(slotObj.has_custom) || (activeSet && activeSet !== 'default');
    if (!shouldDisplay) {
        if (existingImg) existingImg.remove();
        return;
    }
    if (!existingImg) {
        existingImg = document.createElement('img');
        existingImg.className = 'nvx-dynamic-slot-icon me-1 rounded-1';
        existingImg.style.cssText = 'width:18px;height:18px;object-fit:contain;vertical-align:text-bottom;flex-shrink:0;';
        if (el.firstChild) {
            el.insertBefore(existingImg, el.firstChild);
        } else {
            el.appendChild(existingImg);
        }
    }
    existingImg.setAttribute('data-slot-key', slotKey);
    if (existingImg.getAttribute('src') !== slotObj.preview_url) {
        existingImg.src = slotObj.preview_url;
    }
}

async function syncActiveIconSetAcrossWebsite() {
    try {
        var res = await fetch('/api/settings/icon-sets?_t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        var data = await res.json();
        var activeSet = data.active_set || 'default';
        var slots = data.active_slots || {};
        var manifestVer = data.updated_at || Date.now();
        window.__nvxIconManifestVersion = manifestVer;
        window.__nvxActiveIconSlotsCache = slots;

        if (slots.brand_logo && slots.brand_logo.preview_url) {
            localStorage.setItem('nvx_active_brand_icon_url', slots.brand_logo.preview_url);
            syncBrowserTabFaviconPng(slots.brand_logo.preview_url);
        }

        // 1. Đồng bộ chính xác theo thuộc tính định danh tường minh data-nv-slot cho toàn bộ 14 vị trí
        document.querySelectorAll('[data-nv-slot]').forEach(function(el) {
            var sk = el.getAttribute('data-nv-slot');
            if (sk && slots[sk]) {
                _applySlotIconToElement(el, sk, slots[sk], activeSet);
            }
        });

        // 2. Đồng bộ bổ sung theo nội dung văn bản cho các nút Header, Danh mục, Bank (vị trí 4) và Mèo AI (vị trí 5)
        var categoryTextToSlotMap = [
            { match: 'Card đồ họa', slot: 'cat_gpu' },
            { match: 'Vi xử lý', slot: 'cat_cpu' },
            { match: 'Mainboard', slot: 'cat_mainboard' },
            { match: 'RAM & SSD', slot: 'cat_ram' },
            { match: 'Bàn phím & Chuột', slot: 'cat_keyboard' },
            { match: 'Tai nghe', slot: 'cat_headphones' },
            { match: 'Đèn & Gia dụng', slot: 'cat_home_living' },
            { match: 'Đồng hồ & Sức khỏe', slot: 'cat_health_care' },
            { match: 'Balo & Phụ kiện', slot: 'cat_fashion' },
            { match: 'Kho Voucher', slot: 'nav_voucher' },
            { match: 'Nông Trại Cây', slot: 'nav_farm' },
            { match: 'Bank', slot: 'nav_bank' },
            { match: 'NVIDIA Pay', slot: 'nav_bank' },
            { match: 'Mèo AI', slot: 'nav_ai_cat' },
            { match: 'Mèo Lỏng AI', slot: 'nav_ai_cat' }
        ];

        var selectorList = 'header a, header button, nav a, nav button, .nv-cat-fab, #headerBankBalanceBtn, #nvUnifiedHubToggleBtn, #msgHubTabBtn_cat, [onclick*="Cat"], [onclick*="cat"]';
        document.querySelectorAll(selectorList).forEach(function(el) {
            if (el.hasAttribute('data-nv-slot')) return;
            var txt = (el.textContent || '').trim();
            if (!txt) return;
            var matchedRule = categoryTextToSlotMap.find(function(r) { return txt.includes(r.match); });
            if (!matchedRule) return;
            var slotObj = slots[matchedRule.slot];
            if (!slotObj) return;
            el.setAttribute('data-nv-slot', matchedRule.slot);
            _applySlotIconToElement(el, matchedRule.slot, slotObj, activeSet);
        });

        // 3. Làm mới tức thì các thẻ ảnh sản phẩm đại diện (/api/settings/product-icon-svg) với tham số ?v=<updated_at>
        document.querySelectorAll('img[src*="/api/settings/product-icon-svg"]').forEach(function(imgEl) {
            var curSrc = imgEl.getAttribute('src') || '';
            var basePart = curSrc.replace(/([?&])v=\d+/g, '').replace(/[?&]+$/, '');
            var sep = basePart.indexOf('?') !== -1 ? '&' : '?';
            var nextSrc = basePart + sep + 'v=' + manifestVer;
            if (curSrc !== nextSrc) {
                imgEl.src = nextSrc;
            }
        });
    } catch (e) {}
}
window.syncActiveIconSetAcrossWebsite = syncActiveIconSetAcrossWebsite;

/* ==========================================================================
   HỆ THỐNG ĐIỂM DANH HẰNG NGÀY & CHUỖI ĐĂNG NHẬP 7 NGÀY LIÊN TIẾP (LOGIN STREAK)
   1. Huy hiệu "🔥 Chuỗi X Ngày" gắn cố định trên Header mọi trang (bấm mở Modal Điểm Danh).
   2. Thanh Chuỗi 7 Ngày hiển thị trực tiếp trên Trang chủ, Vòng quay, Nông trại & Cài đặt.
   ========================================================================== */
var __nvxStreakState = null;

function getLoggedInUserIdForStreak() {
    try {
        var uRaw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
        var u = uRaw ? JSON.parse(uRaw) : null;
        if (u && u.id) return Number(u.id);
    } catch (e) {}
    return 13;
}

function updateHeaderCoinsAndStreakDisplay(streakData) {
    if (!streakData) return;

    /* 1. Đồng bộ lại số dư Xu trên Header nếu vừa cộng thưởng */
    if (streakData.coins !== undefined && streakData.coins !== null) {
        var coinsFormatted = Number(streakData.coins).toLocaleString('vi-VN') + ' Xu';
        document.querySelectorAll('header span, header a, header button, .header-coins-badge, #headerUserCoins').forEach(function(el) {
            var t = (el.textContent || '').trim();
            if (el.children.length === 0 && t.endsWith('Xu') && t.length < 22) {
                el.textContent = '🪙 ' + coinsFormatted;
            }
        });
    }

    /* 2. Gắn hoặc cập nhật nút Huy hiệu "🔥 Chuỗi X Ngày" trên thanh Header toàn sàn */
    var headerRightArea = document.querySelector('header .d-flex.align-items-center.gap-2, header .header-actions, header nav .d-flex');
    if (!headerRightArea) {
        var coinEl = Array.from(document.querySelectorAll('header a, header span, header button')).find(function(x) {
            return (x.textContent || '').includes('Xu');
        });
        if (coinEl && coinEl.parentElement) headerRightArea = coinEl.parentElement;
    }

    var streakCount = Number(streakData.login_streak || 0);
    var checkedToday = Boolean(streakData.checked_in_today);

    if (headerRightArea) {
        var badgeBtn = document.getElementById('nvxHeaderLoginStreakBtn');
        if (!badgeBtn) {
            badgeBtn = document.createElement('button');
            badgeBtn.id = 'nvxHeaderLoginStreakBtn';
            badgeBtn.type = 'button';
            badgeBtn.onclick = function() { openDailyCheckinModal(); };
            headerRightArea.insertBefore(badgeBtn, headerRightArea.firstChild);
        }
        badgeBtn.className = 'btn btn-sm fw-bold d-inline-flex align-items-center gap-1 rounded-pill px-3 py-1 ' +
            (checkedToday ? 'btn-outline-success' : 'btn-warning text-dark shadow-sm');
        badgeBtn.style.fontSize = '12px';
        badgeBtn.title = 'Bấm để mở Bảng Điểm Danh Hằng Ngày & Nhận Thưởng Chuỗi 7 Ngày';
        badgeBtn.innerHTML = checkedToday
            ? ('🔥 Chuỗi ' + Math.max(1, streakCount) + ' Ngày ✔')
            : ('🔥 Chuỗi ' + streakCount + ' Ngày • <span class="text-decoration-underline">Điểm Danh!</span>');
    }
}

function build7DayStreakStripHtml(data, isCompact) {
    var schedule = (data && Array.isArray(data.schedule)) ? data.schedule : [
        { day: 1, coins: 5000, spins: 0, label: '+5.000 Xu' },
        { day: 2, coins: 8000, spins: 0, label: '+8.000 Xu' },
        { day: 3, coins: 12000, spins: 1, label: '+12K Xu + 1 Quay' },
        { day: 4, coins: 15000, spins: 0, label: '+15.000 Xu' },
        { day: 5, coins: 20000, spins: 1, label: '+20K Xu + 1 Quay' },
        { day: 6, coins: 25000, spins: 0, label: '+25.000 Xu' },
        { day: 7, coins: 50000, spins: 3, label: '+50K Xu + 3 Quay + VIP' }
    ];
    var streak = Number((data && data.login_streak) || 0);
    var checkedToday = Boolean(data && data.checked_in_today);
    var nextDay = Number((data && data.next_day_to_claim) || ((streak % 7) + 1));
    var totalCheckins = Number((data && data.total_checkins) || 0);

    var daysGridHtml = '<div class="row g-2 my-1">' + schedule.map(function(item) {
        var d = Number(item.day);
        var isClaimed = checkedToday ? (d <= streak) : (d < nextDay);
        var isTodayTarget = !checkedToday && (d === nextDay);
        var isNextPreview = checkedToday && (d === ((streak % 7) + 1));

        var borderCol = isClaimed ? '#76b900' : (isTodayTarget ? '#facc15' : 'rgba(148,163,184,0.25)');
        var bgCol = isClaimed
            ? 'rgba(118, 185, 0, 0.16)'
            : (isTodayTarget ? 'rgba(250, 204, 21, 0.15)' : 'rgba(15, 23, 42, 0.65)');
        var statusTag = isClaimed
            ? '<span class="badge bg-success" style="font-size:9.5px;">✔ Đã nhận</span>'
            : (isTodayTarget
                ? '<span class="badge bg-warning text-dark fw-bold" style="font-size:9.5px;">🎁 Hôm nay</span>'
                : (isNextPreview
                    ? '<span class="badge bg-info text-dark" style="font-size:9.5px;">Ngày mai</span>'
                    : '<span class="badge bg-secondary" style="font-size:9.5px;">Mốc ' + d + '</span>'));

        return '<div class="col">' +
            '<div class="p-2 rounded-3 border text-center h-100 d-flex flex-column justify-content-between" ' +
                 'style="min-width:96px;background:' + bgCol + ';border-color:' + borderCol + '!important;border-width:' + ((isClaimed || isTodayTarget) ? '2px' : '1px') + '!important;cursor:pointer;" ' +
                 'onclick="claimDailyStreakReward(' + (isTodayTarget ? 'false' : 'true') + ')">' +
                '<div class="d-flex justify-content-between align-items-center mb-1">' +
                    '<strong class="small ' + (isClaimed ? 'text-nvidia' : (isTodayTarget ? 'text-warning' : 'text-light')) + '">Ngày ' + d + '</strong>' +
                    statusTag +
                '</div>' +
                '<div class="my-1" style="font-size:1.25rem;">' + (d === 7 ? '👑' : (item.spins > 0 ? '🎰' : '🪙')) + '</div>' +
                '<div class="fw-bold text-nvidia" style="font-size:11px;">+' + Number(item.coins).toLocaleString('vi-VN') + ' Xu</div>' +
                (item.spins > 0 ? '<div class="text-info fw-semibold" style="font-size:10px;">+' + item.spins + ' Lượt quay</div>' : '<div class="text-secondary" style="font-size:10px;">Điểm danh</div>') +
            '</div>' +
        '</div>';
    }).join('') + '</div>';

    return '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
            '<div class="d-flex flex-wrap align-items-center gap-2">' +
                '<span class="badge bg-warning text-dark fw-bold px-2 py-1">🔥 CHUỖI ĐĂNG NHẬP: ' + streak + ' NGÀY LIÊN TIẾP</span>' +
                '<strong class="small">📅 Điểm Danh Hằng Ngày Nhận Xu, Lượt Vòng Quay &amp; Siêu Voucher Mốc 7 Ngày</strong>' +
                '<span class="badge bg-dark border border-secondary font-monospace">Tổng tích lũy: ' + totalCheckins + ' ngày</span>' +
            '</div>' +
            '<div class="d-flex flex-wrap gap-2">' +
                '<button type="button" class="btn btn-sm ' + (checkedToday ? 'btn-success' : 'btn-nvidia') + ' fw-bold px-3" onclick="claimDailyStreakReward(false)">' +
                    (checkedToday ? ('☑️ Đã Điểm Danh Ngày ' + streak + '/7') : ('🎁 Điểm Danh Nhận Thưởng Ngày ' + nextDay + ' Ngay')) +
                '</button>' +
                '<button type="button" class="btn btn-outline-warning btn-sm fw-bold" title="Bấm để giả lập qua ngày hôm sau và test nhận thưởng mốc tiếp theo ngay lập tức" onclick="claimDailyStreakReward(true)">' +
                    '⚡ Test +1 Ngày Chuỗi Tiếp Theo' +
                '</button>' +
                '<button type="button" class="btn btn-outline-secondary btn-sm py-0" title="Đặt lại chuỗi về Ngày 1" onclick="resetDailyStreakCounter()">🔄 Reset</button>' +
            '</div>' +
        '</div>' +
        daysGridHtml;
}

async function loadAndRenderDailyCheckinStreak() {
    var uid = getLoggedInUserIdForStreak();
    try {
        var res = await fetch('/api/settings/daily-checkin?user_id=' + uid);
        if (!res.ok) return;
        var data = await res.json();
        __nvxStreakState = data;

        updateHeaderCoinsAndStreakDisplay(data);

        /* Hiển thị Thanh Điểm Danh 7 Ngày trực tiếp trên Trang chủ, Minigame Vòng quay, Nông trại & Cài đặt */
        var path = (window.location.pathname || '').toLowerCase();
        var shouldMountInline = path.includes('index.html') || path === '/' || path.includes('minigame.html') || path.includes('farm.html') || path.includes('vouchers.html');

        if (shouldMountInline) {
            var mainContainer = document.querySelector('main .container') || document.querySelector('main');
            if (mainContainer) {
                var inlineBar = document.getElementById('nvxDailyCheckinStreakInlineBar');
                if (!inlineBar) {
                    inlineBar = document.createElement('section');
                    inlineBar.id = 'nvxDailyCheckinStreakInlineBar';
                    inlineBar.className = 'nv-adaptive-card p-3 mb-4 rounded-4 border shadow-sm';
                    inlineBar.style.borderLeft = '5px solid #f59e0b';
                    var eventStrip = document.getElementById('nvxMultiEventsLiveStrip');
                    if (eventStrip && eventStrip.nextSibling) {
                        mainContainer.insertBefore(inlineBar, eventStrip.nextSibling);
                    } else if (mainContainer.firstElementChild) {
                        mainContainer.insertBefore(inlineBar, mainContainer.firstElementChild);
                    } else {
                        mainContainer.appendChild(inlineBar);
                    }
                }
                inlineBar.innerHTML = build7DayStreakStripHtml(data, false);
            }
        }

        /* Nếu Modal Điểm danh đang mở thì cập nhật luôn nội dung bên trong */
        var modalBody = document.getElementById('nvxDailyCheckinModalBody');
        if (modalBody) {
            modalBody.innerHTML = build7DayStreakStripHtml(data, false);
        }
    } catch (e) {}
}
window.loadAndRenderDailyCheckinStreak = loadAndRenderDailyCheckinStreak;

async function claimDailyStreakReward(forceNextDay) {
    var uid = getLoggedInUserIdForStreak();
    try {
        var res = await fetch('/api/settings/daily-checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: uid,
                force_next_day: Boolean(forceNextDay)
            })
        });
        var data = await res.json();
        __nvxStreakState = data;

        if (data.user) {
            localStorage.setItem('nvidia_user', JSON.stringify(data.user));
            localStorage.setItem('auth_user', JSON.stringify(data.user));
        }

        if (typeof notifyToast === 'function') {
            notifyToast(data.message || '🎁 Đã điểm danh nhận thưởng thành công!', data.ok ? 'success' : 'info');
        }
        await loadAndRenderDailyCheckinStreak();
    } catch (e) {}
}
window.claimDailyStreakReward = claimDailyStreakReward;

async function resetDailyStreakCounter() {
    var uid = getLoggedInUserIdForStreak();
    try {
        var res = await fetch('/api/settings/daily-checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, reset_streak: true })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã đặt lại chuỗi điểm danh!', 'info');
        await loadAndRenderDailyCheckinStreak();
    } catch (e) {}
}
window.resetDailyStreakCounter = resetDailyStreakCounter;

function openDailyCheckinModal() {
    var modal = document.getElementById('nvxDailyCheckinGlobalModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'nvxDailyCheckinGlobalModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(4,7,13,0.82);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;';
        modal.innerHTML =
            '<div class="nv-adaptive-card p-4 rounded-4 border shadow-lg" style="max-width:880px;width:100%;background:#0f172a;border-color:#76b900!important;">' +
                '<div class="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 pb-2 mb-3">' +
                    '<h5 class="fw-bold m-0 text-nvidia">🔥 Trung Tâm Điểm Danh Hằng Ngày &amp; Chuỗi Đăng Nhập 7 Ngày</h5>' +
                    '<button type="button" class="btn btn-sm btn-outline-light fw-bold px-3" onclick="document.getElementById(\'nvxDailyCheckinGlobalModal\').classList.add(\'d-none\')">✕ Đóng</button>' +
                '</div>' +
                '<div id="nvxDailyCheckinModalBody"></div>' +
            '</div>';
        document.body.appendChild(modal);
    }
    modal.classList.remove('d-none');
    if (__nvxStreakState) {
        var body = document.getElementById('nvxDailyCheckinModalBody');
        if (body) body.innerHTML = build7DayStreakStripHtml(__nvxStreakState, false);
    } else {
        loadAndRenderDailyCheckinStreak();
    }
}
window.openDailyCheckinModal = openDailyCheckinModal;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(syncActiveIconSetAcrossWebsite, 120);
    setTimeout(loadAndRenderDailyCheckinStreak, 220);
});
window.syncActiveIconSetAcrossWebsite = syncActiveIconSetAcrossWebsite;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(syncActiveIconSetAcrossWebsite, 120);
});
window.syncBrowserTabFaviconPng = syncBrowserTabFaviconPng;

/* ==========================================================================
   TÍNH NĂNG XÁC MINH EMAIL BẰNG MÃ OTP NHẬN THƯỞNG (+50.000 XU & +3 LƯỢT QUAY)
   (Tự động gắn vào trang Cài Đặt Tài Khoản /services/settings/settings.html)
   ========================================================================== */
/* ==========================================================================
   TRANG CÀI ĐẶT NGƯỜI DÙNG (SETTINGS.HTML):
   1. XÁC MINH EMAIL BẰNG OTP NHẬN THƯỞNG (+50.000 XU & +3 LƯỢT QUAY)
   2. TRUNG TÂM KHIẾU NẠI ĐƠN HÀNG & TÒA ÁN TRỌNG TÀI AI (MỞ TRANG GIẢI QUYẾT TRANH CHẤP)
   ========================================================================== */
/* ==========================================================================
   TRANG CÀI ĐẶT NGƯỜI DÙNG (SETTINGS.HTML):
   1. XÁC MINH EMAIL BẰNG OTP NHẬN THƯỞNG (+50.000 XU & +3 LƯỢT QUAY)
   2. TRUNG TÂM KHIẾU NẠI ĐƠN HÀNG & TÒA ÁN TRỌNG TÀI AI (MỞ TRANG GIẢI QUYẾT TRANH CHẤP)
   (Sửa dứt điểm lỗi NotFoundError: insertBefore để hiển thị 100% trên mọi cấu trúc DOM)
   ========================================================================== */
function mountSettingsEmailOtpRewardWidget() {
    var path = (window.location.pathname || '').toLowerCase();
    if (!path.includes('settings.html')) return;

    var mainContainer = document.querySelector('main .container') || document.querySelector('main') || document.body;
    if (!mainContainer) return;

    var uRaw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
    var user = null;
    try { user = uRaw ? JSON.parse(uRaw) : null; } catch (e) {}

    var defaultName = (user && (user.full_name || user.username)) ? (user.full_name || user.username) : 'Nguyễn Hưng';
    var defaultEmail = (user && user.email) ? user.email : 'hungnguyendva@gmail.com';
    var isVerified = Boolean(user && Number(user.email_verified) === 1);

    /* KHỐI 2: TRUNG TÂM KHIẾU NẠI ĐƠN HÀNG & TÒA ÁN TRỌNG TÀI AI DÀNH CHO NGƯỜI DÙNG */
    if (!document.getElementById('nvxSettingsUserArbitrationCourtCard')) {
        var courtCard = document.createElement('section');
        courtCard.id = 'nvxSettingsUserArbitrationCourtCard';
        courtCard.className = 'nv-adaptive-card p-4 mb-4 rounded-4 border shadow-sm';
        courtCard.style.borderLeft = '5px solid #f59e0b';
        courtCard.innerHTML =
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-secondary border-opacity-25 pb-3 mb-3">' +
                '<div>' +
                    '<span class="badge bg-warning text-dark fw-bold mb-1">⚖️ BẢO VỆ NGƯỜI MUA ESCROW • TÒA ÁN TRỌNG TÀI AI</span>' +
                    '<h5 class="fw-bold m-0">Trung Tâm Khiếu Nại Đơn Hàng &amp; Làm Việc Với Tòa Án Trọng Tài AI</h5>' +
                    '<div class="small text-secondary mt-1">Khi đơn hàng giao trễ cam kết SLA, sai mô tả hoặc cần đối chiếu lịch sử bảo hành SOP-01, bạn có thể gửi khiếu nại nhanh tại đây hoặc bấm mở Phòng Xử Án Trọng Tài AI (HTML chuyên biệt) để giải quyết trực tiếp.</div>' +
                '</div>' +
                '<div class="d-flex flex-wrap gap-2">' +
                    '<a href="/services/admin_dispute/arbitration-court.html?role=buyer" class="btn btn-warning text-dark fw-bold px-3 py-2 shadow-sm">' +
                        '⚖️ Mở Phòng Xử Án &amp; Giải Quyết Khiếu Nại (Tòa Án AI) →' +
                    '</a>' +
                '</div>' +
            '</div>' +

            '<div class="row g-3 align-items-end mb-3">' +
                '<div class="col-md-3">' +
                    '<label class="form-label small fw-bold mb-1">Mã Đơn Hàng Cần Khiếu Nại</label>' +
                    '<input type="text" id="userQuickDisputeOrderInput" class="form-control form-control-sm font-monospace" value="#NVD-1024" placeholder="VD: #NVD-1024">' +
                '</div>' +
                '<div class="col-md-3">' +
                    '<label class="form-label small fw-bold mb-1">Quy Trình Bảo Vệ (SOP)</label>' +
                    '<select id="userQuickDisputeSopSelect" class="form-select form-select-sm">' +
                        '<option value="SOP-01">SOP-01: Bảo hành &amp; Video Đồng kiểm</option>' +
                        '<option value="SOP-02">SOP-02: Giao trễ SLA Hỏa tốc 2H</option>' +
                        '<option value="SOP-03">SOP-03: Sai thông số / Hàng lỗi NSX</option>' +
                        '<option value="SOP-04">SOP-04: Yêu cầu hoàn tiền Quỹ Escrow</option>' +
                    '</select>' +
                '</div>' +
                '<div class="col-md-4">' +
                    '<label class="form-label small fw-bold mb-1">Nội Dung Khiếu Nại / Yêu Cầu Giải Quyết</label>' +
                    '<input type="text" id="userQuickDisputeReasonInput" class="form-control form-control-sm" placeholder="VD: Đơn giao trễ SLA 2H, yêu cầu bồi thường và đối chiếu bảo hành...">' +
                '</div>' +
                '<div class="col-md-2">' +
                    '<button type="button" class="btn btn-nvidia btn-sm fw-bold w-100 py-2" onclick="submitUserDisputeFromSettingsAndOpenCourt()">' +
                        '🚀 Gửi &amp; Mở Tòa Án AI' +
                    '</button>' +
                '</div>' +
            '</div>' +

            '<div id="userSettingsActiveDisputesList" class="pt-2 border-top border-secondary border-opacity-25 small"></div>';

        if (mainContainer.firstElementChild) {
            mainContainer.insertBefore(courtCard, mainContainer.firstElementChild);
        } else {
            mainContainer.appendChild(courtCard);
        }
        loadUserActiveDisputesInSettings();
    }

    /* KHỐI 1: XÁC MINH EMAIL BẰNG OTP NHẬN THƯỞNG */
    if (!document.getElementById('nvxSettingsEmailOtpRewardCard')) {
        var card = document.createElement('section');
        card.id = 'nvxSettingsEmailOtpRewardCard';
        card.className = 'nv-adaptive-card p-4 mb-4 rounded-4 border shadow-sm';
        card.style.borderLeft = '5px solid #76b900';
        card.innerHTML =
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-secondary border-opacity-25 pb-3 mb-3">' +
                '<div>' +
                    '<span class="badge bg-nvidia mb-1">XÁC MINH TÀI KHOẢN &amp; NHẬN THƯỞNG XU</span>' +
                    '<h5 class="fw-bold m-0">Xác Thực Email Chính Chủ Bằng Mã OTP — Nhận Ngay +50.000 Xu &amp; +3 Lượt Quay</h5>' +
                    '<div class="small text-secondary mt-1">Đăng ký tài khoản nhanh không cần chờ, xác minh Email bằng OTP bất cứ lúc nào tại Cài đặt để nhận thưởng vào Ví Nivida Pay.</div>' +
                '</div>' +
                '<span id="settingsEmailVerifiedStatusBadge" class="badge ' + (isVerified ? 'bg-success' : 'bg-warning text-dark') + ' px-3 py-2">' +
                    (isVerified ? 'Đã Xác Minh Email Chính Chủ' : 'Chưa Xác Minh — Nhận +50.000 Xu Ngay') +
                '</span>' +
            '</div>' +
            '<div class="row g-3 align-items-end">' +
                '<div class="col-md-3">' +
                    '<label class="form-label small fw-bold mb-1">Tên hiển thị trong Email</label>' +
                    '<input type="text" id="settingsOtpFullNameInput" class="form-control form-control-sm" value="' + defaultName + '" placeholder="Nhập họ tên của bạn">' +
                '</div>' +
                '<div class="col-md-4">' +
                    '<label class="form-label small fw-bold mb-1">Địa chỉ Email nhận mã OTP</label>' +
                    '<div class="input-group input-group-sm">' +
                        '<input type="email" id="settingsOtpEmailInput" class="form-control font-monospace" value="' + defaultEmail + '" placeholder="VD: hungnguyendva@gmail.com">' +
                        '<button type="button" id="btnSettingsSendOtpEmail" class="btn btn-nvidia fw-bold" onclick="sendSettingsVerificationOtpEmail()">Gửi Mã OTP</button>' +
                    '</div>' +
                '</div>' +
                '<div class="col-md-5">' +
                    '<label class="form-label small fw-bold mb-1">Nhập mã OTP 6 số từ hộp thư Email</label>' +
                    '<div class="input-group input-group-sm">' +
                        '<input type="text" id="settingsOtpCodeVerifyInput" class="form-control font-monospace text-center fw-bold" placeholder="Nhập 6 chữ số OTP..." maxlength="6">' +
                        '<button type="button" id="btnSettingsVerifyOtpClaim" class="btn btn-info text-dark fw-bold px-3" onclick="verifySettingsOtpAndClaimReward()">Xác Nhận OTP &amp; Nhận +50.000 Xu</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div id="settingsOtpFeedbackBanner" class="mt-3 pt-2 border-top border-secondary border-opacity-25 small d-none"></div>';

        if (mainContainer.firstElementChild) {
            mainContainer.insertBefore(card, mainContainer.firstElementChild);
        } else {
            mainContainer.appendChild(card);
        }
    }
}

async function loadUserActiveDisputesInSettings() {
    var box = document.getElementById('userSettingsActiveDisputesList');
    if (!box) return;
    try {
        var res = await fetch('/api/admin-dispute/disputes');
        if (!res.ok) return;
        var data = await res.json();
        var list = Array.isArray(data) ? data : (data.disputes || []);
        if (!list.length) {
            box.innerHTML = '<span class="text-secondary">Hiện bạn chưa có hồ sơ khiếu nại nào đang mở.</span>';
            return;
        }
        box.innerHTML =
            '<div class="fw-bold text-nvidia mb-2">📂 Hồ Sơ Khiếu Nại Đang Xử Lý Tại Tòa Án Trọng Tài AI (' + list.length + ' hồ sơ — Bấm để vào làm việc trực tiếp):</div>' +
            '<div class="row g-2">' +
                list.slice(0, 4).map(function(d) {
                    return '<div class="col-md-6">' +
                        '<a href="/services/admin_dispute/arbitration-court.html?case_id=' + d.id + '&role=buyer" class="text-decoration-none d-block p-2 rounded-3 border" style="background:rgba(15,23,42,0.65);border-color:rgba(245,158,11,0.35)!important;">' +
                            '<div class="d-flex justify-content-between align-items-center">' +
                                '<strong class="text-warning font-monospace">#ARB-' + String(d.id).padStart(4, '0') + ' • Đơn #NVD-' + (d.order_id || d.id) + '</strong>' +
                                '<span class="badge ' + (d.status === 'resolved' ? 'bg-success' : 'bg-info text-dark') + '">' + (d.status === 'resolved' ? 'Đã giải quyết' : 'Đang đối chất AI →') + '</span>' +
                            '</div>' +
                            '<div class="text-light text-truncate mt-1">' + (d.reason || 'Khiếu nại bảo hành & cam kết SLA') + '</div>' +
                        '</a>' +
                    '</div>';
                }).join('') +
            '</div>';
    } catch (e) {}
}

async function submitUserDisputeFromSettingsAndOpenCourt() {
    var ordInp = document.getElementById('userQuickDisputeOrderInput');
    var sopSel = document.getElementById('userQuickDisputeSopSelect');
    var rsnInp = document.getElementById('userQuickDisputeReasonInput');

    var uRaw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
    var user = null;
    try { user = uRaw ? JSON.parse(uRaw) : null; } catch (e) {}

    var buyerName = (user && (user.full_name || user.username)) ? (user.full_name || user.username) : 'Nguyễn Hưng';
    var orderCode = (ordInp ? ordInp.value : '#NVD-1024').trim();
    var sopCode = (sopSel ? sopSel.value : 'SOP-01');
    var reasonText = (rsnInp && rsnInp.value.trim()) ? rsnInp.value.trim() : ('Yêu cầu Trọng tài AI đối chiếu ' + sopCode + ' và bảo vệ quyền lợi người mua cho đơn ' + orderCode);

    try {
        var res = await fetch('/api/admin-dispute/disputes/create-user-case', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderCode,
                buyer_name: buyerName,
                sop_code: sopCode,
                reason: reasonText,
                amount: 1890000
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            setTimeout(function() {
                window.location.href = '/services/admin_dispute/arbitration-court.html?case_id=' + (data.case_id || 1) + '&role=buyer';
            }, 450);
        }
    } catch (e) {
        window.location.href = '/services/admin_dispute/arbitration-court.html?role=buyer';
    }
}
window.submitUserDisputeFromSettingsAndOpenCourt = submitUserDisputeFromSettingsAndOpenCourt;

async function sendSettingsVerificationOtpEmail() {
    var nameInp = document.getElementById('settingsOtpFullNameInput');
    var emailInp = document.getElementById('settingsOtpEmailInput');
    var btn = document.getElementById('btnSettingsSendOtpEmail');
    var banner = document.getElementById('settingsOtpFeedbackBanner');

    var fullName = (nameInp ? nameInp.value : '').trim();
    var emailVal = (emailInp ? emailInp.value : '').trim();
    var uRaw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
    var user = null;
    try { user = uRaw ? JSON.parse(uRaw) : null; } catch (e) {}

    if (!emailVal || !emailVal.includes('@')) {
        if (typeof notifyToast === 'function') notifyToast('Vui lòng nhập địa chỉ Email hợp lệ!', 'warning');
        return;
    }

    if (btn) btn.disabled = true;
    if (banner) {
        banner.classList.remove('d-none');
        banner.innerHTML = '<span class="text-warning fw-bold">Đang gửi mã OTP xác minh tới ' + emailVal + ' (Xin chào ' + (fullName || 'bạn') + ')...</span>';
    }

    try {
        var res = await fetch('/api/settings/email-otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user ? user.id : 13,
                email: emailVal,
                full_name: fullName,
                purpose: 'reward_verify'
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            if (banner) {
                banner.innerHTML = '<span class="text-nvidia fw-bold">' + data.message + ' Hãy nhập mã 6 số vào ô bên phải để nhận +50.000 Xu!</span>';
            }
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        } else {
            if (banner) {
                banner.innerHTML = '<span class="text-danger fw-bold">' + (data.error || 'Không thể gửi email OTP!') + '</span>';
            }
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Lỗi gửi OTP!', 'warning');
        }
    } catch (err) {
        if (banner) banner.innerHTML = '<span class="text-danger">Lỗi kết nối máy chủ khi gửi OTP!</span>';
    } finally {
        if (btn) btn.disabled = false;
    }
}
window.sendSettingsVerificationOtpEmail = sendSettingsVerificationOtpEmail;

async function verifySettingsOtpAndClaimReward() {
    var nameInp = document.getElementById('settingsOtpFullNameInput');
    var emailInp = document.getElementById('settingsOtpEmailInput');
    var codeInp = document.getElementById('settingsOtpCodeVerifyInput');
    var btn = document.getElementById('btnSettingsVerifyOtpClaim');
    var banner = document.getElementById('settingsOtpFeedbackBanner');
    var statusBadge = document.getElementById('settingsEmailVerifiedStatusBadge');

    var fullName = (nameInp ? nameInp.value : '').trim();
    var emailVal = (emailInp ? emailInp.value : '').trim();
    var otpCode = (codeInp ? codeInp.value : '').trim();
    var uRaw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
    var user = null;
    try { user = uRaw ? JSON.parse(uRaw) : null; } catch (e) {}

    if (!otpCode || otpCode.length < 4) {
        if (typeof notifyToast === 'function') notifyToast('Vui lòng nhập mã OTP 6 chữ số đã gửi tới Email của bạn!', 'warning');
        return;
    }

    if (btn) btn.disabled = true;
    try {
        var res = await fetch('/api/settings/email-otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user ? user.id : 13,
                email: emailVal,
                full_name: fullName,
                otp_code: otpCode
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            if (data.user) {
                localStorage.setItem('nvidia_user', JSON.stringify(data.user));
                localStorage.setItem('auth_user', JSON.stringify(data.user));
            }
            if (statusBadge) {
                statusBadge.className = 'badge bg-success px-3 py-2';
                statusBadge.textContent = 'Đã Xác Minh Email Chính Chủ (Đã Nhận Thưởng)';
            }
            if (banner) {
                banner.classList.remove('d-none');
                banner.innerHTML = '<div class="p-2 rounded bg-dark border border-success text-nvidia fw-bold">' + data.message + '</div>';
            }
            if (codeInp) codeInp.value = '';
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            if (typeof window.renderDynamicHeaderAndFooter === 'function') {
                setTimeout(function() { window.location.reload(); }, 1100);
            }
        } else {
            if (banner) {
                banner.classList.remove('d-none');
                banner.innerHTML = '<span class="text-danger fw-bold">' + (data.error || 'Mã OTP chưa chính xác!') + '</span>';
            }
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Mã OTP không đúng!', 'warning');
        }
    } catch (err) {
    } finally {
        if (btn) btn.disabled = false;
    }
}
window.verifySettingsOtpAndClaimReward = verifySettingsOtpAndClaimReward;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(mountSettingsEmailOtpRewardWidget, 150);
});
window.syncBrowserTabFaviconPng = syncBrowserTabFaviconPng;

function syncBrowserTabFaviconPng(customIconUrl = '') {
    const iconHref = customIconUrl || localStorage.getItem('nvx_active_brand_icon_url') || '/assets/icons/icon.png';
    if (customIconUrl) {
        localStorage.setItem('nvx_active_brand_icon_url', customIconUrl);
    }
    const head = document.head || document.getElementsByTagName('head')[0];
    if (head) {
        document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
        const link1 = document.createElement('link');
        link1.rel = 'icon';
        link1.type = 'image/png';
        link1.href = iconHref;
        head.appendChild(link1);

        const link2 = document.createElement('link');
        link2.rel = 'shortcut icon';
        link2.type = 'image/png';
        link2.href = iconHref;
        head.appendChild(link2);
    }
    const hdrImg = document.getElementById('headerBrandLogoImg');
    if (hdrImg) {
        hdrImg.src = iconHref;
        hdrImg.classList.remove('d-none');
    }
    const nBox = document.getElementById('headerBrandNBox');
    if (nBox) {
        nBox.classList.add('d-none');
    }
}
window.syncBrowserTabFaviconPng = syncBrowserTabFaviconPng;

function toggleWebIconMode() {
    localStorage.setItem('nvx_use_web_icon', '1');
    var freshUrl = '/assets/icons/icon.png?v=' + Date.now();
    syncBrowserTabFaviconPng(freshUrl);
    if (typeof notifyToast === 'function') {
        notifyToast('🖼️ Đã đồng bộ Icon Logo PNG trên cả Header và Thanh Tab trình duyệt!', 'info');
    }
}
window.toggleWebIconMode = toggleWebIconMode;

/* ==========================================================================
   1. BỘ ĐIỀU KHIỂN HIỂN THỊ ĐA SỰ KIỆN TRÊN TRANG CHỦ & BỘ LỌC ĐA HÃNG / CHỦNG LOẠI
   (Nếu không có sự kiện nào bật -> Ẩn hoàn toàn khu vực sự kiện; Nếu bật nhiều -> Hiện tất cả)
   ========================================================================== */
async function syncMultiEventsBannerOnHome() {
    var path = (window.location.pathname || '').toLowerCase();
    if (!path.includes('index.html') && path !== '/') return;

    try {
        var res = await fetch('/api/settings/events');
        if (!res.ok) return;
        var data = await res.json();
        var activeEvents = Array.isArray(data.active_events) ? data.active_events : [];

        /* Tìm tất cả các thanh banner sự kiện mặc định trên Trang chủ */
        var existingEventBanners = Array.from(document.querySelectorAll('#eventBanner, #activeEventBanner, .event-banner-bar, .seasonal-event-banner'));
        document.querySelectorAll('main div, main section').forEach(function(el) {
            var txt = (el.textContent || '').trim();
            if (el.children.length <= 6 && (txt.includes('CHIẾN DỊCH SỰ KIỆN ĐANG KÍCH HOẠT') || txt.includes('Đang diễn ra sự kiện:'))) {
                existingEventBanners.push(el);
            }
        });

        var customMultiStrip = document.getElementById('nvxMultiEventsLiveStrip');

        /* TRƯỜNG HỢP 1: Chưa có sự kiện hoặc tất cả sự kiện đều đang TẮT -> Ẩn sạch 100% */
        if (activeEvents.length === 0) {
            existingEventBanners.forEach(function(b) { b.classList.add('d-none'); });
            if (customMultiStrip) customMultiStrip.classList.add('d-none');
            return;
        }

        /* TRƯỜNG HỢP 2: Có 1 hoặc NHIỀU sự kiện đang bật cùng lúc -> Hiển thị đầy đủ tất cả sự kiện đang bật */
        existingEventBanners.forEach(function(b) { b.classList.add('d-none'); });

        var mainContainer = document.querySelector('main .container') || document.querySelector('main');
        if (!mainContainer) return;

        if (!customMultiStrip) {
            customMultiStrip = document.createElement('section');
            customMultiStrip.id = 'nvxMultiEventsLiveStrip';
            customMultiStrip.className = 'mb-4';
            mainContainer.insertBefore(customMultiStrip, mainContainer.firstChild);
        }
        customMultiStrip.classList.remove('d-none');

        customMultiStrip.innerHTML =
            '<div class="d-flex flex-column gap-2">' +
                activeEvents.map(function(ev) {
                    var themeCol = ev.theme_color || 'rgb(118, 185, 0)';
                    return '<div class="p-3 rounded-4 border d-flex flex-wrap justify-content-between align-items-center gap-2 shadow-sm" style="background:linear-gradient(90deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.82) 100%);border-color:' + themeCol + '!important;border-left:6px solid ' + themeCol + '!important;">' +
                        '<div>' +
                            '<div class="d-flex align-items-center gap-2 mb-1">' +
                                '<span class="badge fw-bold" style="background:' + themeCol + ';color:#090d16;">🎪 SỰ KIỆN ĐANG DIỄN RA (' + (ev.date_label || ev.event_code) + ')</span>' +
                                '<span class="badge bg-dark border border-secondary font-monospace">' + ev.event_code + '</span>' +
                                '<span class="badge bg-warning text-dark fw-bold">Giảm tới ' + (ev.discount_percent || 15) + '%</span>' +
                            '</div>' +
                            '<h6 class="fw-bold m-0 text-light">' + (ev.event_name || ev.title) + '</h6>' +
                            '<div class="small text-secondary mt-1">' + (ev.description || '') + '</div>' +
                        '</div>' +
                        '<div class="d-flex align-items-center gap-2">' +
                            '<a href="/services/vouchers/vouchers.html" class="btn btn-nvidia btn-sm fw-bold px-3 py-2">🎟️ Nhận Mã ' + (ev.voucher_code || 'NVIDIAMALL100K') + ' →</a>' +
                        '</div>' +
                    '</div>';
                }).join('') +
            '</div>';
    } catch (e) {}
}

/* ==========================================================================
   2. BỘ LỌC ĐA NHÃN HÀNG (24 HÃNG) & 76+ CHỦNG LOẠI SẢN PHẨM + ĐỒNG BỘ ICON ĐẠI DIỆN
   ========================================================================== */
var __homeFullProductsList = [];

async function initHomeBrandAndTypeFilterBar() {
    var path = (window.location.pathname || '').toLowerCase();
    if (!path.includes('index.html') && path !== '/') return;

    try {
        var res = await fetch('/api/home/products?sort_by=popular');
        if (!res.ok) return;
        var data = await res.json();
        var prods = Array.isArray(data) ? data : (data.products || []);
        __homeFullProductsList = prods;

        var mainContainer = document.querySelector('main .container') || document.querySelector('main');
        if (!mainContainer) return;

        var filterBar = document.getElementById('nvxAdvancedCatalogFilterBar');
        if (!filterBar) {
            filterBar = document.createElement('section');
            filterBar.id = 'nvxAdvancedCatalogFilterBar';
            filterBar.className = 'nv-adaptive-card p-3 mb-4 rounded-4 border shadow-sm';
            var refNode = document.getElementById('nvxMultiEventsLiveStrip')?.nextSibling || mainContainer.firstChild;
            mainContainer.insertBefore(filterBar, refNode);
        }

        if (prods.length === 0) {
            filterBar.innerHTML =
                '<div class="p-4 text-center">' +
                    '<h5 class="fw-bold text-warning mb-2">🗑️ Hiện Tại Gian Hàng Đang Trống (0 Vật Phẩm)</h5>' +
                    '<p class="small text-secondary mb-3">Toàn bộ vật phẩm đã được xóa sạch theo lệnh Admin. Bạn có thể vào trang Quản trị Admin để nạp lại bộ JSON (24 Gian hàng &amp; 104+ Sản phẩm) bất cứ lúc nào!</p>' +
                    '<a href="/services/admin_dispute/admin-center.html" class="btn btn-nvidia btn-sm fw-bold px-4 py-2">🛡️ Mở Trang Quản Trị Admin Để Nạp JSON</a>' +
                '</div>';
            return;
        }

        var brandsMap = {};
        var typesMap = {};
        prods.forEach(function(p) {
            var b = (p.brand || 'NIVIDA').trim();
            var t = (p.product_type || p.category || 'Linh Kiện').trim();
            brandsMap[b] = (brandsMap[b] || 0) + 1;
            typesMap[t] = (typesMap[t] || 0) + 1;
        });

        var brandOptions = Object.keys(brandsMap).sort().map(function(b) {
            return '<option value="' + b + '">' + b + ' (' + brandsMap[b] + ' SP)</option>';
        }).join('');

        var typeOptions = Object.keys(typesMap).sort().map(function(t) {
            return '<option value="' + t + '">' + t + ' (' + typesMap[t] + ')</option>';
        }).join('');

        filterBar.innerHTML =
            '<div class="row g-2 align-items-center small">' +
                '<div class="col-lg-3 col-md-6">' +
                    '<div class="fw-bold text-nvidia mb-1">🏷️ Lọc Theo Hãng Nhãn Hàng (' + Object.keys(brandsMap).length + ' Hãng):</div>' +
                    '<select id="nvxFilterBrandSelect" class="form-select form-select-sm" onchange="applyHomeAdvancedCatalogFilter()">' +
                        '<option value="">-- Tất cả ' + Object.keys(brandsMap).length + ' Hãng Chính Hãng --</option>' +
                        brandOptions +
                    '</select>' +
                '</div>' +
                '<div class="col-lg-4 col-md-6">' +
                    '<div class="fw-bold text-info mb-1">📦 Lọc Theo Chủng Loại (' + Object.keys(typesMap).length + ' Loại SP):</div>' +
                    '<select id="nvxFilterProductTypeSelect" class="form-select form-select-sm" onchange="applyHomeAdvancedCatalogFilter()">' +
                        '<option value="">-- Tất cả ' + Object.keys(typesMap).length + ' Chủng Loại Sản Phẩm --</option>' +
                        typeOptions +
                    '</select>' +
                '</div>' +
                '<div class="col-lg-3 col-md-6">' +
                    '<div class="fw-bold text-warning mb-1">🖼️ Lọc Theo Trạng Thái Ảnh / Icon:</div>' +
                    '<select id="nvxFilterIconModeSelect" class="form-select form-select-sm" onchange="applyHomeAdvancedCatalogFilter()">' +
                        '<option value="">Tất cả (' + prods.length + ' sản phẩm)</option>' +
                        '<option value="icon_only">🧩 Đang dùng Icon Đại Diện Chủng Loại</option>' +
                        '<option value="real_photo">📸 Đã có Ảnh Thực Tế Tải Lên</option>' +
                    '</select>' +
                '</div>' +
                '<div class="col-lg-2 col-md-6 text-end pt-3">' +
                    '<button type="button" class="btn btn-outline-secondary btn-sm w-100 fw-bold" onclick="resetHomeAdvancedCatalogFilter()">🔄 Đặt Lại (' + prods.length + ' SP)</button>' +
                '</div>' +
            '</div>';

        upgradeProductCardsImagesOnPage(prods);
    } catch (e) {}
}

function upgradeProductCardsImagesOnPage(prodsList) {
    var byId = {};
    (prodsList || []).forEach(function(p) { byId[String(p.id)] = p; });

    document.querySelectorAll('a[href*="product-detail.html?id="]').forEach(function(aEl) {
        var href = aEl.getAttribute('href') || '';
        var m = href.match(/id=(\d+)/);
        if (!m) return;
        var pid = m[1];
        var p = byId[pid];
        if (!p) return;

        var card = aEl.closest('.col, .col-md-3, .col-lg-3, .col-6, .product-card, .card') || aEl.parentElement;
        if (!card) return;
        card.dataset.nvBrand = p.brand || '';
        card.dataset.nvProductType = p.product_type || '';
        var imgUrl = String(p.image_url || '');
        var isIcon = imgUrl.includes('/api/settings/product-icon-svg') || imgUrl.includes('icon.png') || !imgUrl;
        card.dataset.nvIconMode = isIcon ? 'icon_only' : 'real_photo';

        var imgEl = card.querySelector('img');
        if (imgEl) {
            var svgUrl = '/api/settings/product-icon-svg?category=' + encodeURIComponent(p.category || 'gpu') +
                '&type=' + encodeURIComponent(p.product_type || p.category || '') +
                '&brand=' + encodeURIComponent(p.brand || 'NIVIDA') +
                '&name=' + encodeURIComponent((p.name || '').slice(0, 40)) + '&id=' + p.id;
            if (!imgUrl || imgUrl.includes('icon.png')) {
                imgEl.src = svgUrl;
            }
            imgEl.onerror = function() {
                this.onerror = null;
                this.src = svgUrl;
            };
        }
    });
}

function applyHomeAdvancedCatalogFilter() {
    var selBrand = (document.getElementById('nvxFilterBrandSelect')?.value || '').trim();
    var selType = (document.getElementById('nvxFilterProductTypeSelect')?.value || '').trim();
    var selIcon = (document.getElementById('nvxFilterIconModeSelect')?.value || '').trim();

    upgradeProductCardsImagesOnPage(__homeFullProductsList);

    document.querySelectorAll('[data-nv-brand]').forEach(function(card) {
        var bMatch = !selBrand || card.dataset.nvBrand === selBrand;
        var tMatch = !selType || card.dataset.nvProductType === selType;
        var iMatch = !selIcon || card.dataset.nvIconMode === selIcon;
        card.classList.toggle('d-none', !(bMatch && tMatch && iMatch));
    });
}
window.applyHomeAdvancedCatalogFilter = applyHomeAdvancedCatalogFilter;

function resetHomeAdvancedCatalogFilter() {
    var b = document.getElementById('nvxFilterBrandSelect');
    var t = document.getElementById('nvxFilterProductTypeSelect');
    var i = document.getElementById('nvxFilterIconModeSelect');
    if (b) b.value = '';
    if (t) t.value = '';
    if (i) i.value = '';
    applyHomeAdvancedCatalogFilter();
}
window.resetHomeAdvancedCatalogFilter = resetHomeAdvancedCatalogFilter;

/* ==========================================================================
   3. KÊNH NGƯỜI BÁN (SELLER DASHBOARD): CHÈN PREVIEW ẢNH SẢN PHẨM, TẢI ẢNH & SỬA ẢNH
   ========================================================================== */
function initSellerProductImagePreviewAndEditor() {
    var path = (window.location.pathname || '').toLowerCase();
    if (!path.includes('seller-dashboard.html') && !path.includes('store.html')) return;

    /* A. Gắn khung Live Preview & Upload ảnh ngay trong Form Đăng Sản Phẩm Mới của Kênh Người Bán */
    var imgUrlInputs = Array.from(document.querySelectorAll('input[placeholder*=" ảnh"], input[placeholder*="image"], input[id*="Image"], input[name*="image"]'));
    imgUrlInputs.forEach(function(inp) {
        if (inp.dataset.nvPreviewAttached) return;
        inp.dataset.nvPreviewAttached = '1';

        var previewWrap = document.createElement('div');
        previewWrap.className = 'p-3 rounded-3 border mt-2';
        previewWrap.style.background = 'rgba(15, 23, 42, 0.75)';
        previewWrap.style.borderColor = '#76b900';
        previewWrap.innerHTML =
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                '<strong class="small text-nvidia">🖼️ Xem Trước Ảnh Sản Phẩm (Live Preview) &amp; Tải Ảnh Từ Máy:</strong>' +
                '<label class="btn btn-warning text-dark btn-sm py-0 fw-bold m-0" style="cursor:pointer;">' +
                    '📤 Chọn File Ảnh Từ Máy (Tự Điền URL &amp; Preview)' +
                    '<input type="file" accept=".png,.webp,.jpg,.jpeg,.svg" class="d-none">' +
                '</label>' +
            '</div>' +
            '<div class="d-flex align-items-center gap-3">' +
                '<img class="nv-seller-live-preview-img rounded-3 border border-success p-1 bg-dark" src="/api/settings/product-icon-svg?category=gpu&brand=NIVIDA&type=Preview" style="width:96px;height:76px;object-fit:contain;">' +
                '<div class="small text-secondary">Nếu bạn để trống URL ảnh, hệ thống sẽ tự động tạo <strong>Icon Đại Diện đúng Chủng loại &amp; Nhãn hàng</strong> của sản phẩm. Khi dán URL hoặc chọn ảnh từ máy, ảnh sẽ hiển thị xem trước ngay tại đây.</div>' +
            '</div>';

        inp.parentElement.appendChild(previewWrap);
        var previewImg = previewWrap.querySelector('.nv-seller-live-preview-img');
        var fileInp = previewWrap.querySelector('input[type="file"]');

        inp.addEventListener('input', function() {
            var v = inp.value.trim();
            previewImg.src = v || '/api/settings/product-icon-svg?category=gpu&brand=NIVIDA&type=Preview';
        });

        if (fileInp) {
            fileInp.addEventListener('change', function() {
                if (!fileInp.files || !fileInp.files.length) return;
                var reader = new FileReader();
                reader.onload = function(ev) {
                    var b64 = ev.target.result;
                    previewImg.src = b64;
                    inp.value = b64;
                    if (typeof notifyToast === 'function') notifyToast('📸 Đã nạp ảnh xem trước thành công!', 'success');
                };
                reader.readAsDataURL(fileInp.files[0]);
            });
        }
    });

    /* B. Gắn Hộp Công Cụ Sửa Ảnh & Preview Trực Tiếp Cho Mọi Sản Phẩm Trong Kênh Người Bán (Hỗ trợ Kéo-Thả & Ctrl+V) */
    if (!document.getElementById('nvxSellerQuickImageEditorBar')) {
        var mainEl = document.querySelector('main .container') || document.querySelector('main');
        if (mainEl) {
            var editorCard = document.createElement('section');
            editorCard.id = 'nvxSellerQuickImageEditorBar';
            editorCard.className = 'nv-adaptive-card p-3 mb-4 rounded-4 border shadow-sm';
            editorCard.style.borderLeft = '5px solid #0ea5e9';
            editorCard.innerHTML =
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                    '<div>' +
                        '<span class="badge bg-info text-dark fw-bold me-1">STUDIO ẢNH SẢN PHẨM KÊNH NGƯỜI BÁN</span>' +
                        '<strong class="small">📸 Kéo - Thả Ảnh (Drag &amp; Drop), Dán Từ Clipboard (Ctrl + V) Hoặc Chọn File / URL</strong>' +
                    '</div>' +
                    '<button type="button" class="btn btn-outline-info btn-sm py-0" onclick="loadSellerProductsForImageStudio()">🔄 Tải Danh Sách SP Để Sửa Ảnh</button>' +
                '</div>' +
                '<div class="row g-2 align-items-center small">' +
                    '<div class="col-md-4">' +
                        '<select id="sellerStudioProductSelect" class="form-select form-select-sm" onchange="onSelectSellerStudioProduct()">' +
                            '<option value="">-- Chọn sản phẩm cần xem Preview / Sửa ảnh --</option>' +
                        '</select>' +
                    '</div>' +
                    '<div class="col-md-4">' +
                        '<input type="text" id="sellerStudioImageUrlInput" class="form-control form-control-sm font-monospace" placeholder="Dán URL ảnh, bấm Ctrl+V hoặc Kéo-Thả ảnh vào khung..." oninput="updateSellerStudioLivePreview()">' +
                    '</div>' +
                    '<div class="col-md-2">' +
                        '<label class="btn btn-warning text-dark btn-sm fw-bold w-100 m-0 py-1" style="cursor:pointer;">' +
                            '📤 Chọn / Kéo Thả' +
                            '<input type="file" accept=".png,.webp,.jpg,.jpeg,.svg" class="d-none" onchange="onUploadSellerStudioImageFile(this)">' +
                        '</label>' +
                    '</div>' +
                    '<div class="col-md-2">' +
                        '<button type="button" class="btn btn-nvidia btn-sm fw-bold w-100 py-1" onclick="saveSellerStudioProductImage()">💾 Lưu Ảnh SP</button>' +
                    '</div>' +
                '</div>' +
                '<div id="sellerStudioDropZone" class="mt-2 p-2 rounded-3 border border-info border-opacity-50 text-center small" style="border-style:dashed !important;background:rgba(14,165,233,0.06);cursor:pointer;" ondragover="handleSellerStudioDragOver(event)" ondragleave="handleSellerStudioDragLeave(event)" ondrop="handleSellerStudioDropFile(event)">' +
                    '📥 <strong>Vùng Kéo - Thả Ảnh (Drag &amp; Drop) &amp; Dán Nhanh (Ctrl + V):</strong> Kéo thả file ảnh trực tiếp vào đây hoặc bấm <kbd class="bg-dark text-info border border-secondary px-1">Ctrl + V</kbd> để tự động căn chỉnh &amp; nén trên HTML5 Canvas!' +
                '</div>' +
                '<div id="sellerStudioPreviewBox" class="mt-2 pt-2 border-top border-secondary border-opacity-25 d-none">' +
                    '<div class="d-flex flex-wrap align-items-center gap-3 small">' +
                        '<img id="sellerStudioLivePreviewImg" src="/assets/icons/icon.png" class="rounded-3 border border-success p-1 bg-dark" style="width:110px;height:82px;object-fit:contain;">' +
                        '<div>' +
                            '<div class="fw-bold text-nvidia" id="sellerStudioProductTitle">Tên sản phẩm</div>' +
                            '<div class="text-secondary">Bạn có thể kéo-thả ảnh, bấm <strong>Ctrl+V</strong> dán từ Clipboard, dán URL hoặc bấm <a href="javascript:void(0)" class="text-info fw-bold" onclick="resetSellerStudioToCategoryIcon()">[Dùng Icon Đại Diện Chủng Loại]</a>.</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            if (mainEl.firstChild) {
                mainEl.insertBefore(editorCard, mainEl.firstChild);
            } else {
                mainEl.appendChild(editorCard);
            }
            loadSellerProductsForImageStudio();
            bindSellerStudioClipboardPasteListener();
        }
    }
}

var __sellerStudioProductsCache = [];
var __sellerStudioPendingBase64 = '';

function _compressImageFileViaCanvas(fileObj, callbackFn) {
    if (!fileObj) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var rawDataUrl = ev.target.result || '';
        if (fileObj.type === 'image/svg+xml') {
            callbackFn(rawDataUrl, fileObj.name || 'pasted.svg');
            return;
        }
        var tempImg = new Image();
        tempImg.onload = function() {
            try {
                var maxDim = 900;
                var w = tempImg.naturalWidth || 600;
                var h = tempImg.naturalHeight || 600;
                if (w > maxDim || h > maxDim) {
                    var ratio = Math.min(maxDim / w, maxDim / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(tempImg, 0, 0, w, h);
                var compressedDataUrl = canvas.toDataURL('image/png', 0.92);
                callbackFn(compressedDataUrl, fileObj.name || 'studio_canvas.png');
            } catch (err) {
                callbackFn(rawDataUrl, fileObj.name || 'uploaded.png');
            }
        };
        tempImg.onerror = function() {
            callbackFn(rawDataUrl, fileObj.name || 'uploaded.png');
        };
        tempImg.src = rawDataUrl;
    };
    reader.readAsDataURL(fileObj);
}

function _applyStudioProcessedImage(b64Data, fileNameLabel) {
    __sellerStudioPendingBase64 = b64Data;
    var img = document.getElementById('sellerStudioLivePreviewImg');
    var box = document.getElementById('sellerStudioPreviewBox');
    var urlInp = document.getElementById('sellerStudioImageUrlInput');
    if (box) box.classList.remove('d-none');
    if (img) img.src = b64Data;
    if (urlInp) urlInp.value = '[Đã chọn file: ' + (fileNameLabel || 'clipboard_image.png') + ']';
    if (typeof notifyToast === 'function') {
        notifyToast('📸 Đã xử lý & căn chỉnh ảnh [' + (fileNameLabel || 'Clipboard') + '] trên Canvas! Bấm [💾 Lưu Ảnh SP] để lưu.', 'info');
    }
}

function handleSellerStudioDragOver(ev) {
    if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }
    var dz = document.getElementById('sellerStudioDropZone');
    if (dz) dz.style.background = 'rgba(118,185,0,0.22)';
}
window.handleSellerStudioDragOver = handleSellerStudioDragOver;

function handleSellerStudioDragLeave(ev) {
    if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }
    var dz = document.getElementById('sellerStudioDropZone');
    if (dz) dz.style.background = 'rgba(14,165,233,0.06)';
}
window.handleSellerStudioDragLeave = handleSellerStudioDragLeave;

function handleSellerStudioDropFile(ev) {
    if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }
    handleSellerStudioDragLeave(ev);
    var dt = ev ? ev.dataTransfer : null;
    if (!dt || !dt.files || !dt.files.length) return;
    var file = dt.files[0];
    _compressImageFileViaCanvas(file, function(b64, fname) {
        _applyStudioProcessedImage(b64, fname);
    });
}
window.handleSellerStudioDropFile = handleSellerStudioDropFile;

function bindSellerStudioClipboardPasteListener() {
    if (window.__nvxSellerClipboardPasteBound) return;
    window.__nvxSellerClipboardPasteBound = true;
    document.addEventListener('paste', function(ev) {
        var studioBar = document.getElementById('nvxSellerQuickImageEditorBar');
        var iconStudio = document.getElementById('hubTab_icon_sets');
        if (!studioBar && (!iconStudio || iconStudio.classList.contains('d-none'))) return;
        var clipData = ev.clipboardData || window.clipboardData;
        if (!clipData || !clipData.items) return;
        for (var i = 0; i < clipData.items.length; i++) {
            var item = clipData.items[i];
            if (item.type && item.type.indexOf('image') !== -1) {
                var blob = item.getAsFile();
                if (blob && studioBar) {
                    _compressImageFileViaCanvas(blob, function(b64) {
                        _applyStudioProcessedImage(b64, 'Clipboard_Paste_' + Date.now() + '.png');
                    });
                    break;
                }
            }
        }
    });
}

async function loadSellerProductsForImageStudio() {
    var sel = document.getElementById('sellerStudioProductSelect');
    if (!sel) return;
    try {
        var res = await fetch('/api/home/products?sort_by=popular');
        if (!res.ok) return;
        var data = await res.json();
        var list = Array.isArray(data) ? data : (data.products || []);
        __sellerStudioProductsCache = list;
        sel.innerHTML = '<option value="">-- Chọn sản phẩm cần xem Preview / Sửa ảnh (' + list.length + ' SP) --</option>' +
            list.map(function(p) {
                return '<option value="' + p.id + '">#' + p.id + ' - [' + (p.brand || 'NIVIDA') + '] ' + p.name + '</option>';
            }).join('');
    } catch (e) {}
}
window.loadSellerProductsForImageStudio = loadSellerProductsForImageStudio;

function onSelectSellerStudioProduct() {
    var sel = document.getElementById('sellerStudioProductSelect');
    var urlInp = document.getElementById('sellerStudioImageUrlInput');
    var box = document.getElementById('sellerStudioPreviewBox');
    var img = document.getElementById('sellerStudioLivePreviewImg');
    var title = document.getElementById('sellerStudioProductTitle');
    __sellerStudioPendingBase64 = '';

    var pid = sel ? Number(sel.value) : 0;
    var p = __sellerStudioProductsCache.find(function(x) { return Number(x.id) === pid; });
    if (!p) {
        if (box) box.classList.add('d-none');
        return;
    }
    if (box) box.classList.remove('d-none');
    if (urlInp) urlInp.value = p.image_url || '';
    if (img) img.src = p.image_url || ('/api/settings/product-icon-svg?category=' + encodeURIComponent(p.category || 'gpu') + '&brand=' + encodeURIComponent(p.brand || 'NIVIDA'));
    if (title) title.textContent = '#' + p.id + ' • ' + p.name + ' (' + Number(p.price || 0).toLocaleString('vi-VN') + ' ₫)';
}
window.onSelectSellerStudioProduct = onSelectSellerStudioProduct;

function updateSellerStudioLivePreview() {
    var urlInp = document.getElementById('sellerStudioImageUrlInput');
    var img = document.getElementById('sellerStudioLivePreviewImg');
    var box = document.getElementById('sellerStudioPreviewBox');
    __sellerStudioPendingBase64 = '';
    if (box) box.classList.remove('d-none');
    if (img && urlInp && urlInp.value.trim()) {
        img.src = urlInp.value.trim();
    }
}
window.updateSellerStudioLivePreview = updateSellerStudioLivePreview;

function onUploadSellerStudioImageFile(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files.length) return;
    var file = fileInput.files[0];
    _compressImageFileViaCanvas(file, function(b64, fname) {
        _applyStudioProcessedImage(b64, fname);
    });
}
window.onUploadSellerStudioImageFile = onUploadSellerStudioImageFile;

function resetSellerStudioToCategoryIcon() {
    var sel = document.getElementById('sellerStudioProductSelect');
    var pid = sel ? Number(sel.value) : 0;
    var p = __sellerStudioProductsCache.find(function(x) { return Number(x.id) === pid; });
    if (!p) return;
    __sellerStudioPendingBase64 = '';
    var svgUrl = '/api/settings/product-icon-svg?category=' + encodeURIComponent(p.category || 'gpu') +
        '&type=' + encodeURIComponent(p.product_type || p.category || '') +
        '&brand=' + encodeURIComponent(p.brand || 'NIVIDA') + '&id=' + p.id;
    var urlInp = document.getElementById('sellerStudioImageUrlInput');
    var img = document.getElementById('sellerStudioLivePreviewImg');
    if (urlInp) urlInp.value = svgUrl;
    if (img) img.src = svgUrl;
}
window.resetSellerStudioToCategoryIcon = resetSellerStudioToCategoryIcon;

async function saveSellerStudioProductImage() {
    var sel = document.getElementById('sellerStudioProductSelect');
    var urlInp = document.getElementById('sellerStudioImageUrlInput');
    var pid = sel ? Number(sel.value) : 0;
    if (!pid) {
        if (typeof notifyToast === 'function') notifyToast('⚠️ Vui lòng chọn sản phẩm cần cập nhật ảnh!', 'warning');
        return;
    }

    var rawUrl = (urlInp ? urlInp.value : '').trim();
    try {
        var res = await fetch('/api/seller/products/update-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: pid,
                image_url: rawUrl.startsWith('[Đã chọn') ? '' : rawUrl,
                image_base64: __sellerStudioPendingBase64
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            __sellerStudioPendingBase64 = '';
            if (urlInp) urlInp.value = data.image_url;
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            loadSellerProductsForImageStudio();
        } else if (typeof notifyToast === 'function') {
            notifyToast(data.error || 'Không thể lưu ảnh sản phẩm!', 'warning');
        }
    } catch (e) {}
}
window.saveSellerStudioProductImage = saveSellerStudioProductImage;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        syncMultiEventsBannerOnHome();
        initHomeBrandAndTypeFilterBar();
        initSellerProductImagePreviewAndEditor();
    }, 180);
});
window.toggleWebIconMode = toggleWebIconMode;

/* ==========================================================================
   TRẠM TỰ ĐỘNG NHẬN DIỆN XÁC NHẬN THANH TOÁN QR 2 BƯỚC & TỰ ĐỘNG CHUYỂN BƯỚC
   (Chỉ kích hoạt chuyển sang tracking.html sau khi Người mua / Người chuyển hộ bấm Xác Nhận)
   ========================================================================== */
function triggerAutomaticNextStepAfterPayment(txData = {}) {
    if (window.__nvxAutoRedirectingNow) return;
    window.__nvxAutoRedirectingNow = true;

    const txId = txData.tx_code || txData.tx_id || txData.transaction_id || `NVX-PAY-${Date.now()}`;
    const orderId = txData.order_id || '';
    const trackingCode = txData.tracking_code || (orderId ? `NVX-${orderId}` : '');
    const targetTrackingUrl = txData.next_step_url || (orderId ? `/services/order_tracking/tracking.html?id=${orderId}&code=${trackingCode}` : '/services/order_tracking/tracking.html');

    try {
        localStorage.setItem('nvx_qr_payment_confirmed', JSON.stringify({
            ts: Date.now(),
            tx_id: txId,
            pay_token: txData.pay_token || txData.qr_token || '',
            order_id: orderId,
            tracking_code: trackingCode,
            amount: txData.paid_amount || txData.amount || 0,
            is_paid_on_behalf: Boolean(txData.is_paid_on_behalf),
            payer_name: txData.payer_name || '',
            payer_message: txData.payer_message || '',
            next_step_url: targetTrackingUrl,
            status: 'APPROVED'
        }));
    } catch (e) {}

    let banner = document.getElementById('nvxAutoPaymentSuccessBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'nvxAutoPaymentSuccessBanner';
        banner.style.cssText = 'position:fixed;top:22px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f172a;border:2px solid #76b900;color:#f8fafc;padding:14px 24px;border-radius:16px;box-shadow:0 15px 35px rgba(0,0,0,0.65);font-weight:700;display:flex;align-items:center;gap:12px;';
        document.body.appendChild(banner);
    }
    banner.innerHTML = `
        <span class="badge bg-success px-2 py-1">✔ ESCROW LOCKED</span>
        <span>🎉 Đã xác nhận thanh toán thành công (${txId})! Đang chuyển sang Vận đơn NVX Express...</span>
    `;

    if (typeof notifyToast === 'function') {
        notifyToast(`🎉 Đã xác nhận thanh toán (${txId})! Đang chuyển sang trang Theo dõi Vận đơn NVX Express...`, 'success');
    }

    const path = (window.location.pathname || '').toLowerCase();

    /* 1. Nếu đang ở trang Cổng Thanh Toán Đơn Hàng (checkout.html) */
    if (path.includes('checkout.html')) {
        try {
            localStorage.removeItem('nvidia_cart');
            localStorage.removeItem('cart');
        } catch (e) {}
        setTimeout(() => {
            window.location.href = targetTrackingUrl;
        }, 900);
        return;
    }

    /* 2. Nếu đang ở trang Ngân Hàng Số & Quét QR (bank.html) */
    if (path.includes('bank.html')) {
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get('return_url') || params.get('next') || '';
        const hasOrderContext = Boolean(params.get('pay_token') || params.get('qr_token') || params.get('order_id') || params.get('from') === 'checkout' || params.get('qr_pay') || returnUrl);

        setTimeout(() => {
            if (returnUrl) {
                window.location.href = returnUrl;
            } else if (hasOrderContext) {
                window.location.href = targetTrackingUrl;
            } else {
                window.__nvxAutoRedirectingNow = false;
                if (banner) {
                    setTimeout(() => banner.remove(), 2200);
                }
            }
        }, 1400);
    }
}
window.triggerAutomaticNextStepAfterPayment = triggerAutomaticNextStepAfterPayment;

function initAutoPaymentAndRedirectWatcher() {
    const path = (window.location.pathname || '').toLowerCase();
    if (!path.includes('bank.html') && !path.includes('checkout.html')) return;

    const urlParams = new URLSearchParams(window.location.search);
    if (path.includes('checkout.html') && urlParams.get('auto_paid') === '1') {
        setTimeout(() => triggerAutomaticNextStepAfterPayment({ tx_id: 'NVX-AUTO-QR' }), 500);
    }

    /* Lắng nghe sự kiện đồng bộ đa Tab qua localStorage (Khi xác nhận thanh toán ở Tab bank.html bên cạnh) */
    window.addEventListener('storage', (ev) => {
        if (ev.key === 'nvx_qr_payment_confirmed' && ev.newValue) {
            try {
                const payload = JSON.parse(ev.newValue);
                if (payload && payload.status === 'APPROVED') {
                    const activeToken = window.__activeCheckoutPayToken || window.__activeCheckoutQrToken || '';
                    if (!activeToken || !payload.pay_token || payload.pay_token === activeToken) {
                        triggerAutomaticNextStepAfterPayment(payload);
                    }
                }
            } catch (e) {}
        }
    });
}

setTimeout(() => {
    syncBrowserTabFaviconPng();
    initAutoPaymentAndRedirectWatcher();
}, 60);
window.toggleWebIconMode = toggleWebIconMode;

setTimeout(() => syncBrowserTabFaviconPng(), 50);
window.toggleWebIconMode = toggleWebIconMode;

function initSeasonalAnimatedCanvas(skinKey) {
    let canvas = document.getElementById('nvSeasonalCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'nvSeasonalCanvas';
        document.body.prepend(canvas);
    }
    const ctx = canvas.getContext('2d');
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    resize();
    if (!window.__nvCanvasResizeBound) {
        window.__nvCanvasResizeBound = true;
        window.addEventListener('resize', resize);
    }

    if (__nvCanvasAnimId) cancelAnimationFrame(__nvCanvasAnimId);

    const count = 30;
    __nvParticles = Array.from({ length: count }, (_, idx) => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 7.5 + (idx % 5) * 2.2,
        vx: (Math.random() - 0.35) * 0.65,
        vy: 0.42 + (idx % 4) * 0.22,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.018 + (idx % 3) * 0.007,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.022,
        flip: Math.random() * Math.PI * 2,
        vFlip: 0.02 + (idx % 3) * 0.01,
        kind: idx % 3
    }));

    /* 1. Vẽ Hoa Đào / Hoa Mai 5 cánh khuyết tim có nhụy vàng & xoay 3D */
    function draw3DSakuraOrApricotBlossom(p, petalCol, coreCol) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(1, Math.max(0.32, Math.abs(Math.cos(p.flip))));
        ctx.fillStyle = petalCol;
        for (let i = 0; i < 5; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI * 2) / 5);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-p.r * 0.45, -p.r * 0.35, -p.r * 0.52, -p.r * 0.92, -p.r * 0.12, -p.r * 1.02);
            ctx.lineTo(0, -p.r * 0.82);
            ctx.lineTo(p.r * 0.12, -p.r * 1.02);
            ctx.bezierCurveTo(p.r * 0.52, -p.r * 0.92, p.r * 0.45, -p.r * 0.35, 0, 0);
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = coreCol;
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /* 2. Vẽ Chiếc Lá Trà Xanh Non Có Sống Gân Lá Rõ Nét */
    function draw3DVeinedGreenLeaf(p, fillCol, veinCol) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.scale(1, Math.max(0.38, Math.abs(Math.sin(p.flip))));
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 1.05);
        ctx.quadraticCurveTo(p.r * 0.72, -p.r * 0.1, 0, p.r * 1.05);
        ctx.quadraticCurveTo(-p.r * 0.72, -p.r * 0.1, 0, -p.r * 1.05);
        ctx.fill();

        ctx.strokeStyle = veinCol;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 0.85);
        ctx.lineTo(0, p.r * 0.85);
        ctx.moveTo(0, -p.r * 0.2);
        ctx.lineTo(p.r * 0.32, -p.r * 0.45);
        ctx.moveTo(0, p.r * 0.15);
        ctx.lineTo(-p.r * 0.32, -p.r * 0.1);
        ctx.stroke();
        ctx.restore();
    }

    /* 3. Vẽ Cánh Bướm Đập Cánh Mềm Mại Cho Giao Diện Sáng */
    function drawFlutteringButterfly(p, tick) {
        const wingScale = 0.3 + 0.7 * Math.abs(Math.sin(tick * 7 + p.sway));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle * 0.3);
        ctx.scale(wingScale, 1);

        ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.65)';
        ctx.lineWidth = 0.9;
        [-1, 1].forEach(dir => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(dir * p.r * 1.2, -p.r * 0.9, dir * p.r * 1.3, p.r * 0.4, 0, p.r * 0.3);
            ctx.fill();
            ctx.stroke();
        });
        ctx.restore();
    }

    /* 4. Vẽ Tinh Thể Lục Bảo 3D & Mạng Lưới Năng Lượng Cho Nvidia Emerald */
    function draw3DEmeraldCrystal(p) {
        const r = p.r * 0.92;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle * 0.5);

        /* Nửa sáng bên trái tinh thể */
        ctx.fillStyle = 'rgba(163, 230, 53, 0.42)';
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.25);
        ctx.lineTo(-r * 0.68, 0);
        ctx.lineTo(0, r * 1.25);
        ctx.closePath();
        ctx.fill();

        /* Nửa đậm bên phải tinh thể */
        ctx.fillStyle = 'rgba(118, 185, 0, 0.28)';
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.25);
        ctx.lineTo(r * 0.68, 0);
        ctx.lineTo(0, r * 1.25);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(190, 242, 100, 0.65)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -r * 1.25);
        ctx.lineTo(r * 0.68, 0);
        ctx.lineTo(0, r * 1.25);
        ctx.lineTo(-r * 0.68, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    /* 5. Vẽ Bao Lì Xì 3D & Đèn Lồng Lụa Cho Chủ Đề Tết */
    function drawTetLuxuryItem(p, tick) {
        if (p.kind === 0) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(tick * 2 + p.sway) * 0.18);
            const w = p.r * 1.25, h = p.r * 1.75;
            ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.4;
            ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
            ctx.strokeRect(-w * 0.5, -h * 0.5, w, h);

            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(0, -h * 0.08, w * 0.24, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.kind === 1) {
            draw3DSakuraOrApricotBlossom(p, 'rgba(251, 113, 133, 0.82)', '#fef08a');
        } else {
            draw3DSakuraOrApricotBlossom(p, 'rgba(250, 204, 21, 0.82)', '#dc2626');
        }
    }

    /* 6. Vẽ Bông Tuyết Tinh Thể 6 Nhánh Xương Cá & Hộp Quà 3D Cho Giáng Sinh */
    function drawChristmasCrystalOrGift(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if (p.kind === 0) {
            const s = p.r * 1.2;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.82)';
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1;
            ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
            ctx.strokeRect(-s * 0.5, -s * 0.5, s, s);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(-s * 0.14, -s * 0.5, s * 0.28, s);
            ctx.fillRect(-s * 0.5, -s * 0.14, s, s * 0.28);
        } else {
            ctx.strokeStyle = 'rgba(224, 242, 254, 0.82)';
            ctx.lineWidth = 1.4;
            const arm = p.r * 0.95;
            for (let i = 0; i < 6; i++) {
                ctx.save();
                ctx.rotate((i * Math.PI) / 3);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -arm);
                ctx.moveTo(0, -arm * 0.55);
                ctx.lineTo(-arm * 0.28, -arm * 0.78);
                ctx.moveTo(0, -arm * 0.55);
                ctx.lineTo(arm * 0.28, -arm * 0.78);
                ctx.stroke();
                ctx.restore();
            }
        }
        ctx.restore();
    }

    /* 7. Vẽ Trái Bóng Đá 3D & Ngôi Sao Vô Địch Cho Mùa Bóng Đá */
    function drawFootball3DOrTrophyStar(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if (p.kind === 0) {
            ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
            ctx.strokeStyle = '#fef9c3';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos(((18 + i * 72) * Math.PI) / 180) * p.r, -Math.sin(((18 + i * 72) * Math.PI) / 180) * p.r);
                ctx.lineTo(Math.cos(((54 + i * 72) * Math.PI) / 180) * p.r * 0.42, -Math.sin(((54 + i * 72) * Math.PI) / 180) * p.r * 0.42);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            const rad = p.r * 0.82;
            const bg = ctx.createRadialGradient(-rad * 0.25, -rad * 0.25, 1, 0, 0, rad);
            bg.addColorStop(0, '#ffffff');
            bg.addColorStop(1, '#cbd5e1');
            ctx.fillStyle = bg;
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, 0, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
                const px = Math.cos(a) * rad * 0.42;
                const py = Math.sin(a) * rad * 0.42;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    /* 8. Vẽ Bí Ngô Phát Sáng & Dơi Đêm Vỗ Cánh Cho Cyber Halloween */
    function drawHalloweenPumpkinOrBat(p, tick) {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.kind === 0) {
            ctx.rotate(Math.sin(tick * 2 + p.sway) * 0.15);
            const rx = p.r * 0.95, ry = p.r * 0.72;
            ctx.fillStyle = 'rgba(249, 115, 22, 0.85)';
            ctx.strokeStyle = '#7c2d12';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.moveTo(-rx * 0.45, -ry * 0.15);
            ctx.lineTo(-rx * 0.2, -ry * 0.42);
            ctx.lineTo(-rx * 0.1, -ry * 0.15);
            ctx.moveTo(rx * 0.45, -ry * 0.15);
            ctx.lineTo(rx * 0.2, -ry * 0.42);
            ctx.lineTo(rx * 0.1, -ry * 0.15);
            ctx.fill();
        } else {
            const flap = Math.sin(tick * 8 + p.sway) * 0.45;
            ctx.fillStyle = 'rgba(168, 85, 247, 0.65)';
            [-1, 1].forEach(dir => {
                ctx.save();
                ctx.rotate(dir * flap);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(dir * p.r * 0.9, -p.r * 0.6, dir * p.r * 1.25, 0);
                ctx.quadraticCurveTo(dir * p.r * 0.6, p.r * 0.3, 0, p.r * 0.15);
                ctx.fill();
                ctx.restore();
            });
        }
        ctx.restore();
    }

    let tick = 0;
    function animateLoop() {
        tick += 0.016;
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        /* NẾU LÀ GIAO DIỆN SÁNG (PURE-DAYLIGHT): VẼ TIA NẮNG SỚM & HẠT BOKEH MỀM MẠI */
        if (skinKey === 'pure-daylight') {
            ctx.save();
            for (let i = 0; i < 3; i++) {
                const beamX = w * (0.18 + i * 0.32) + Math.sin(tick * 0.7 + i) * 35;
                const beamGrad = ctx.createLinearGradient(beamX, 0, beamX + 180, h * 0.65);
                beamGrad.addColorStop(0, 'rgba(250, 204, 21, 0.12)');
                beamGrad.addColorStop(0.5, 'rgba(132, 204, 22, 0.06)');
                beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = beamGrad;
                ctx.beginPath();
                ctx.moveTo(beamX - 60, 0);
                ctx.lineTo(beamX + 90, 0);
                ctx.lineTo(beamX + 260, h * 0.65);
                ctx.lineTo(beamX + 40, h * 0.65);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        /* NẾU LÀ NVIDIA EMERALD (TỐI MẶC ĐỊNH): VẼ ĐƯỜNG NỐI CONSTELLATION GIỮA CÁC TINH THỂ */
        if (skinKey === 'nvidia-emerald') {
            ctx.strokeStyle = 'rgba(118, 185, 0, 0.11)';
            ctx.lineWidth = 1;
            for (let i = 0; i < __nvParticles.length; i++) {
                for (let j = i + 1; j < __nvParticles.length; j++) {
                    const dx = __nvParticles[i].x - __nvParticles[j].x;
                    const dy = __nvParticles[i].y - __nvParticles[j].y;
                    if (dx * dx + dy * dy < 16500) {
                        ctx.beginPath();
                        ctx.moveTo(__nvParticles[i].x, __nvParticles[i].y);
                        ctx.lineTo(__nvParticles[j].x, __nvParticles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        for (const p of __nvParticles) {
            p.sway += p.swaySpeed;
            p.x += p.vx + Math.sin(p.sway) * 0.38;
            p.y += p.vy;
            p.angle += p.vAngle;
            p.flip += p.vFlip;

            if (p.y > h + 24) {
                p.y = -18;
                p.x = Math.random() * w;
            }
            if (p.x > w + 24) p.x = -18;
            if (p.x < -24) p.x = w + 18;

            if (skinKey === 'pure-daylight') {
                if (p.kind === 0) {
                    draw3DSakuraOrApricotBlossom(p, 'rgba(244, 114, 182, 0.58)', 'rgba(250, 204, 21, 0.85)');
                } else if (p.kind === 1) {
                    draw3DVeinedGreenLeaf(p, 'rgba(101, 163, 13, 0.46)', 'rgba(255, 255, 255, 0.7)');
                } else {
                    drawFlutteringButterfly(p, tick);
                }
            } else if (skinKey === 'tet-festival') {
                drawTetLuxuryItem(p, tick);
            } else if (skinKey === 'christmas-snow') {
                drawChristmasCrystalOrGift(p);
            } else if (skinKey === 'football-cup') {
                drawFootball3DOrTrophyStar(p);
            } else if (skinKey === 'cyber-halloween') {
                drawHalloweenPumpkinOrBat(p, tick);
            } else {
                if (p.kind === 0) {
                    draw3DEmeraldCrystal(p);
                } else if (p.kind === 1) {
                    draw3DVeinedGreenLeaf(p, 'rgba(118, 185, 0, 0.36)', 'rgba(190, 242, 100, 0.65)');
                } else {
                    const fg = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, p.r);
                    fg.addColorStop(0, 'rgba(190, 242, 100, 0.85)');
                    fg.addColorStop(1, 'rgba(118, 185, 0, 0)');
                    ctx.fillStyle = fg;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        __nvCanvasAnimId = requestAnimationFrame(animateLoop);
    }
    animateLoop();
}

function renderGlobalHeaderAndFooter() {
    const hdrBox = document.getElementById('header-placeholder');
    const ftrBox = document.getElementById('footer-placeholder');
    const user = getAuthUser();
    const cartCount = getCart().reduce((s, i) => s + Math.max(1, parseInt(i.quantity || i.qty || 1, 10)), 0);
    const savedSkin = localStorage.getItem('nvx_visual_skin') || 'pure-daylight';
    const useWebIcon = localStorage.getItem('nvx_use_web_icon') !== '0';

    const isAdmin = Boolean(user && user.role === 'admin');
    /* Ưu tiên hiển thị full_name (Tên hiển thị Gmail/Facebook như "William") thay vì username */
    const displayName = user ? (user.full_name || user.username || 'Thành viên') : '';
    const avatarHtml = (user && user.avatar_url)
        ? `<img src="${user.avatar_url}" alt="" class="rounded-circle me-1" style="width:18px;height:18px;object-fit:cover;border:1px solid #76b900;">`
        : '👤 ';

    const userControlsHtml = user ? `
        <button type="button" id="headerNotifBellBtn" class="btn btn-outline-warning btn-sm py-1 px-2 rounded-pill fw-bold" style="font-size: 11.5px;" onclick="toggleGlobalNotificationDrawer()">
            🔔 <span id="headerNotifCount">3</span>
        </button>
        <span class="badge bg-dark border border-warning text-warning py-1 px-2" style="font-size: 11px;" id="headerUserCoinsBadge">🪙 ${Number(user.coins || 25000).toLocaleString('vi-VN')} Xu</span>
        ${isAdmin ? `<a href="/services/admin_dispute/admin-center.html" class="btn btn-warning text-dark btn-sm py-1 px-2 fw-bold text-nowrap" style="font-size: 11.5px;">🛠️ Quản Trị</a>` : ''}
        <a href="/services/settings/settings.html" class="btn btn-outline-light btn-sm py-1 px-2 fw-semibold text-nowrap d-inline-flex align-items-center" style="font-size: 11.5px;">${avatarHtml}<span>${displayName}</span></a>
        <button type="button" class="btn btn-outline-danger btn-sm py-1 px-2 text-nowrap" style="font-size: 11px;" onclick="logoutUser()">Thoát</button>
    ` : `
        <button type="button" id="headerNotifBellBtn" class="btn btn-outline-warning btn-sm py-1 px-2 rounded-pill fw-bold" style="font-size: 11.5px;" onclick="toggleGlobalNotificationDrawer()">
            🔔 <span id="headerNotifCount">2</span>
        </button>
        <a href="/services/auth/seller-auth.html" class="btn btn-outline-info btn-sm py-1 px-2 fw-bold text-nowrap" style="font-size: 11.5px;">🏪 Kênh Người Bán</a>
        <a href="/services/auth/auth.html?tab=register" class="btn btn-outline-light btn-sm py-1 px-2 fw-bold text-nowrap" style="font-size: 11.5px;">Đăng Ký</a>
        <a href="/services/auth/auth.html" class="btn btn-warning text-dark btn-sm py-1 px-2 fw-bold text-nowrap" style="font-size: 11.5px;">Đăng Nhập</a>
    `;

    if (hdrBox) {
        hdrBox.innerHTML = `
            <header class="nvidia-header-bar">
                <div class="nvidia-header-shell">
                    <div class="nv-header-top-row">
                        <div class="d-flex align-items-center gap-3">
                            <a href="${user && (user.role === 'seller' || user.role === 'admin') ? '/services/seller/seller-dashboard.html' : '/services/auth/seller-auth.html'}" class="nv-hdr-link">🏪 Kênh Người Bán</a>
                            <a href="/services/pc_builder/pc-builder.html" class="nv-hdr-link">🛠️ Build PC</a>
                            <a href="/services/compare/compare.html" class="nv-hdr-link">⚖️ So Sánh &amp; Wishlist</a>
                            <a href="/services/market_tracker/price-tracker.html" class="text-info fw-bold text-decoration-none text-nowrap">📈 Theo Dõi Giá VN</a>
                            <a href="/services/auction/auction.html" class="text-warning fw-bold text-decoration-none text-nowrap">🔨 Sàn Đấu Giá</a>
                            <a href="/services/vouchers_deals/vouchers.html" data-nv-slot="nav_voucher" class="nv-hdr-link">🎟️ Kho Voucher</a>
                            <a href="/services/minigame/farm.html" data-nv-slot="nav_farm" class="text-nvidia fw-bold text-decoration-none text-nowrap">🌱 Nông Trại Cây</a>
                            <a href="/services/minigame/minigame.html" class="text-warning fw-bold text-decoration-none text-nowrap">🎡 Vòng Quay</a>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <a href="/services/cart_checkout/bank.html" id="headerBankBalanceBtn" data-nv-slot="nav_bank" class="btn btn-nvidia btn-sm py-0 px-2 fw-bold nv-bank-qr-nav-link text-nowrap" style="font-size: 11px;">🏦 Bank</a>
                            <a href="/services/order_tracking/tracking.html" class="nv-hdr-link">🚚 Tra Cứu Đơn</a>
                            <a href="/services/legal/terms.html" class="nv-hdr-link">📜 Điều Khoản</a>
                            <select id="headerThemeSkinSelector" class="form-select form-select-sm d-inline-block py-0 px-2 fw-bold"
                                    style="width:auto;height:22px;font-size:11px;background:#1e293b;color:#76b900;border-color:#76b900;"
                                    onchange="applyNvidiaVisualSkin(this.value)">
                                ${NV_SEASONAL_THEMES.map(t => `<option value="${t.key}" ${t.key === savedSkin ? 'selected' : ''}>${t.label}</option>`).join('')}
                            </select>
                            <button type="button" class="btn btn-outline-info btn-sm py-0 px-2 text-nowrap" style="font-size: 10.5px;" onclick="toggleWebIconMode()">🖼️ Icon Web</button>
                            <button type="button" id="headerThemeToggleBtn" class="btn btn-outline-light btn-sm py-0 px-2 fw-bold text-nowrap" style="font-size: 10.5px;" onclick="toggleTheme()">🌓 Sáng/Tối</button>
                        </div>
                    </div>

                    <div class="nv-header-main-row">
                        <a href="/services/home/index.html" class="d-flex align-items-center text-decoration-none">
                            <img id="headerBrandLogoImg" data-nv-slot="brand_logo" src="/assets/icons/icon.png" alt="Nvidia" class="${useWebIcon ? '' : 'd-none'}">
                            <span id="headerBrandNBox" class="nv-logo-n-box badge bg-nvidia fs-5 me-2 ${useWebIcon ? 'd-none' : ''}">N</span>
                            <div>
                                <div class="fw-bold fs-4 text-nvidia lh-1">Nivida</div>
                                <small style="font-size: 10.5px; color: #cbd5e1 !important;">Công Nghệ &amp; Đời Sống</small>
                            </div>
                        </a>

                        <div class="nv-header-search-col">
                            <form onsubmit="handleGlobalHeaderSearch(event)" class="d-flex">
                                <input type="search" id="globalSearchInput" class="form-control form-control-sm rounded-start-3" placeholder="✨ Tìm kiếm sản phẩm, thương hiệu, linh kiện PC...">
                                <button type="submit" class="btn btn-nvidia btn-sm px-3 rounded-end-3 fw-bold">🔍</button>
                            </form>
                            <div id="nvSmartQuickSuggestRow"></div>
                        </div>

                        <div class="d-flex align-items-center justify-content-end gap-1">
                            ${userControlsHtml}
                            <a href="/services/cart_checkout/cart.html" id="headerCartLinkBtn" class="btn btn-nvidia btn-sm py-1 px-2 fw-bold text-nowrap" style="font-size: 12px;">
                                🛒 <span id="headerCartCount">${cartCount}</span>
                            </a>
                        </div>
                    </div>

                    <div class="nv-header-cat-row">
                        <div class="d-flex align-items-center gap-3">
                            <a href="/services/home/index.html" class="badge bg-nvidia text-decoration-none">Tất cả</a>
                            <a href="/services/home/index.html?category=gpu" data-nv-slot="cat_gpu" class="nv-hdr-link">🔥 Card đồ họa (GPU)</a>
                            <a href="/services/home/index.html?category=cpu" data-nv-slot="cat_cpu" class="nv-hdr-link">Vi xử lý (CPU)</a>
                            <a href="/services/home/index.html?category=mainboard" data-nv-slot="cat_mainboard" class="nv-hdr-link">Mainboard</a>
                            <a href="/services/home/index.html?category=ram" data-nv-slot="cat_ram" class="nv-hdr-link">RAM &amp; SSD</a>
                            <a href="/services/home/index.html?category=keyboard" data-nv-slot="cat_keyboard" class="nv-hdr-link">Bàn phím &amp; Chuột</a>
                            <a href="/services/home/index.html?category=headphones" data-nv-slot="cat_headphones" class="nv-hdr-link">Tai nghe</a>
                            <a href="/services/home/index.html?category=home_living" data-nv-slot="cat_home_living" class="nv-hdr-link">Đèn &amp; Gia dụng</a>
                            <a href="/services/home/index.html?category=health_care" data-nv-slot="cat_health_care" class="nv-hdr-link">Đồng hồ &amp; Sức khỏe</a>
                            <a href="/services/home/index.html?category=fashion" data-nv-slot="cat_fashion" class="nv-hdr-link">Balo &amp; Phụ kiện</a>
                        </div>
                        <a href="/services/compare/compare.html" class="text-nvidia fw-bold text-decoration-none text-nowrap">📊 So Sánh &amp; Wishlist</a>
                    </div>
                </div>
            </header>
        `;
    }

    if (ftrBox) {
        ftrBox.innerHTML = `
            <footer class="nvidia-unified-footer">
                <div class="nvidia-header-shell small">
                    <div class="row g-4 align-items-start">
                        <div class="col-md-5">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span class="badge bg-nvidia fs-6">N</span>
                                <h6 class="fw-bold text-nvidia m-0">Nivida — Sàn Thương Mại Công Nghệ &amp; Đa Ngành Hàng</h6>
                            </div>
                            <p class="mb-2" style="color: #cbd5e1 !important;">
                                Mua sắm trực tuyến minh bạch 6 tiêu chí, chọn phân loại sản phẩm trực quan, áp dụng trực tiếp Voucher Shop và bảo vệ người mua 100% bởi Quỹ Đảm Bảo Nvidia Escrow.
                            </p>
                            <div class="d-flex flex-wrap gap-2">
                                <span class="badge bg-dark border border-secondary text-light">🛡️ Bảo lãnh Escrow 100%</span>
                                <span class="badge bg-dark border border-secondary text-light">🚚 Giao nhanh NVX 2H</span>
                                <span class="badge bg-dark border border-secondary text-light">🐾 Linh vật Mèo Lỏng AI</span>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <h6 class="fw-bold text-nvidia mb-2">Tiện Ích Mua Sắm &amp; Tài Chính</h6>
                            <div class="d-flex flex-column gap-1">
                                <a href="/services/cart_checkout/bank.html" class="text-info fw-semibold">🏦 Ngân Hàng Số NVIDIA PAY &amp; Quét QR</a>
                                <a href="/services/vouchers_deals/vouchers.html">🎟️ Trung Tâm Săn Siêu Voucher Toàn Sàn</a>
                                <a href="/services/minigame/farm.html">🌱 Nông Trại 7 Giống Cây Voucher &amp; Siêu Xu</a>
                                <a href="/services/order_tracking/tracking.html">🚚 Tra Cứu Mã Vận Đơn NVX &amp; Cam Kết SLA</a>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <h6 class="fw-bold text-nvidia mb-2">Quản Trị &amp; Pháp Lý</h6>
                            <div class="d-flex flex-column gap-1">
                                <a href="/services/admin_dispute/admin-center.html" class="text-warning fw-bold">🤖 Trung Tâm Admin &amp; Đội Bot QA</a>
                                <a href="/services/admin_dispute/arbitration-court.html">⚖️ Cổng Phân Xử &amp; Tòa Án Trọng Tài 3 Bên</a>
                                <a href="/services/legal/terms.html">📜 Điều Khoản Pháp Lý &amp; Quy Chuẩn SOP</a>
                                <a href="/services/settings/settings.html">⚙️ Cài Đặt Bảo Mật OTP / Câu Hỏi</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }
}
window.renderGlobalHeaderAndFooter = renderGlobalHeaderAndFooter;
window.renderGlobalHeaderAndFooter = renderGlobalHeaderAndFooter;

function handleGlobalHeaderSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    const q = (document.getElementById('globalSearchInput')?.value || '').trim();
    window.location.href = `/services/home/index.html?q=${encodeURIComponent(q)}`;
}
window.handleGlobalHeaderSearch = handleGlobalHeaderSearch;

function renderSmartQuickSuggestStrip(keywords) {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput || !Array.isArray(keywords) || !keywords.length) return;

    const params = new URLSearchParams(window.location.search);
    if (!params.get('q') && document.activeElement !== searchInput) {
        searchInput.placeholder = `✨ Đề xuất thông minh (1p): ${keywords[0]} • ${keywords[1] || ''}`;
    }

    const strip = document.getElementById('nvSmartQuickSuggestRow');
    if (!strip) return;
    strip.innerHTML = `
        <span class="text-nvidia fw-bold me-1">⚡ Gợi ý (1p):</span>
        ${keywords.slice(0, 5).map(kw => `
            <a href="/services/home/index.html?q=${encodeURIComponent(kw)}"
               class="badge text-decoration-none fw-normal px-2 py-0"
               style="font-size:10.5px;">✨ ${kw}</a>
        `).join('')}
    `;
}
window.renderSmartQuickSuggestStrip = renderSmartQuickSuggestStrip;

async function initSmartSearchSuggestionRotator() {
    try {
        const res = await fetch('/api/settings/smart-search-keywords');
        if (!res.ok) return;
        const data = await res.json();
        window.__nvSmartBatches = data.all_batches || [];
        window.__nvSmartIdx = Number(data.active_batch_index || 0);
        const activeList = data.active_keywords || (window.__nvSmartBatches[0] || []);
        renderSmartQuickSuggestStrip(activeList);

        if (window.__nvSmartIntervalId) clearInterval(window.__nvSmartIntervalId);
        if (data.auto_rotate && window.__nvSmartBatches.length > 1) {
            const ms = Math.max(10000, Number(data.interval_seconds || 60) * 1000);
            window.__nvSmartIntervalId = setInterval(() => {
                window.__nvSmartIdx = (window.__nvSmartIdx + 1) % window.__nvSmartBatches.length;
                renderSmartQuickSuggestStrip(window.__nvSmartBatches[window.__nvSmartIdx]);
            }, ms);
        }
    } catch (e) {}
}
window.initSmartSearchSuggestionRotator = initSmartSearchSuggestionRotator;

/* ==========================================================================
   HỘP THÔNG BÁO CHUÔNG (NOTIFICATION DRAWER) GIAO DIỆN KÍNH MỜ XỊN XÒ
   ========================================================================== */

async function toggleGlobalNotificationDrawer() {
    let drawer = document.getElementById('nvGlobalNotifDrawer');
    if (drawer) {
        const isHidden = drawer.classList.contains('d-none');
        if (isHidden) {
            drawer.classList.remove('d-none');
            await loadGlobalNotificationsIntoDrawer();
        } else {
            drawer.classList.add('d-none');
        }
        return;
    }

    drawer = document.createElement('div');
    drawer.id = 'nvGlobalNotifDrawer';
    drawer.innerHTML = `
        <div class="px-3 py-2 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25" style="background: linear-gradient(135deg, #090d16, #1e293b);">
            <div class="d-flex align-items-center gap-2">
                <span style="font-size:16px;">🔔</span>
                <strong class="small text-white">Trung Tâm Thông Báo</strong>
                <span id="nvDrawerUnreadBadge" class="badge rounded-pill bg-nvidia text-dark fw-bold" style="font-size:10px;">Mới</span>
            </div>
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm text-nvidia p-0 border-0 fw-bold" style="font-size:11px;" onclick="markAllGlobalNotificationsRead()">✓ Đọc tất cả</button>
                <button type="button" class="btn btn-sm text-light p-0 border-0 fs-6" onclick="document.getElementById('nvGlobalNotifDrawer')?.classList.add('d-none')">✕</button>
            </div>
        </div>
        <div class="nv-hub-seg-bar" id="nvNotifFilterPills">
            <button type="button" class="nv-hub-seg-btn active" onclick="switchNotifDrawerTab('all', this)">🌐 Tất cả</button>
            <button type="button" class="nv-hub-seg-btn" onclick="switchNotifDrawerTab('legal', this)">⚖️ Điều khoản</button>
            <button type="button" class="nv-hub-seg-btn" onclick="switchNotifDrawerTab('order', this)">🎁 Đơn &amp; Ưu đãi</button>
        </div>
        <div id="nvGlobalNotifList" class="p-2 flex-fill" style="overflow-y:auto;max-height:380px;"></div>
    `;
    document.body.appendChild(drawer);
    await loadGlobalNotificationsIntoDrawer();
}
window.toggleGlobalNotificationDrawer = toggleGlobalNotificationDrawer;

function switchNotifDrawerTab(mode, btnEl) {
    __nvNotifFilterMode = mode;
    document.querySelectorAll('#nvNotifFilterPills .nv-hub-seg-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderCategorizedNotificationsList();
}
window.switchNotifDrawerTab = switchNotifDrawerTab;

function markAllGlobalNotificationsRead() {
    localStorage.setItem('nvx_notif_read_ts', String(Date.now()));
    const cntEl = document.getElementById('headerNotifCount');
    if (cntEl) cntEl.textContent = '0';
    const bEl = document.getElementById('nvDrawerUnreadBadge');
    if (bEl) bEl.textContent = 'Đã đọc';
    renderCategorizedNotificationsList(true);
    notifyToast('Đã đánh dấu đọc toàn bộ thông báo!', 'success');
}
window.markAllGlobalNotificationsRead = markAllGlobalNotificationsRead;

async function loadGlobalNotificationsIntoDrawer() {
    const u = getAuthUser();
    const uid = u && u.id ? u.id : 1;
    const uKey = u && (u.username || u.id) ? String(u.username || u.id) : 'khach_hang_vip';
    try {
        const [notifRes, legalRes, priceAlertRes] = await Promise.all([
            fetch(`/api/compare/notifications?user_id=${uid}`),
            fetch('/api/legal/clauses?audience=all'),
            fetch(`/api/market-tracker/notifications?user_id=${encodeURIComponent(uKey)}&_t=${Date.now()}`, { cache: 'no-store' })
        ]);
        const nData = await notifRes.json();
        const rawNotifs = nData.notifications || (Array.isArray(nData) ? nData : []);

        let priceAlerts = [];
        if (priceAlertRes && priceAlertRes.ok) {
            const pData = await priceAlertRes.json();
            const pList = pData.notifications || [];
            priceAlerts = pList.map(pa => ({
                id: 'pa_' + pa.id,
                notif_type: 'price_drop',
                title: pa.title,
                message: pa.message,
                created_at: pa.created_at || 'Vừa xong',
                link: pa.link_url || '/services/market_tracker/price-tracker.html'
            }));
            if (priceAlerts.length > 0) {
                const bellBtn = document.getElementById('headerNotifBellBtn');
                if (bellBtn) {
                    bellBtn.classList.remove('btn-outline-warning');
                    bellBtn.classList.add('btn-danger', 'text-white');
                }
            }
        }

        let legalItems = [];
        if (legalRes.ok) {
            const lData = await legalRes.json();
            const clauses = lData.clauses || (Array.isArray(lData) ? lData : []);
            legalItems = clauses.slice(0, 3).map(c => ({
                id: 'leg_' + c.id,
                notif_type: 'legal_update',
                title: `Cập nhật ${c.article_code || 'Điều khoản'} (Phiên bản v${c.version || 1})`,
                message: `${c.title} — ${c.change_note || 'Áp dụng bảo vệ quyền lợi người mua & đối chiếu SOP.'}`,
                created_at: c.effective_date || c.updated_at || 'Mới cập nhật',
                link: '/services/legal/terms.html'
            }));
        }

        const merged = [...priceAlerts, ...rawNotifs, ...legalItems];
        __nvNotificationsCache = merged.length ? merged : [
            {
                id: 'def_1',
                notif_type: 'legal_update',
                title: 'Cập nhật Điều khoản Bảo lãnh Escrow (v2)',
                message: 'Tự động đền bù mã HOATOC50K khi giao trễ SLA và lưu vết chính sách gian hàng.',
                created_at: 'Hôm nay',
                link: '/services/legal/terms.html'
            },
            {
                id: 'def_2',
                notif_type: 'price_drop',
                title: 'Giảm giá sản phẩm trong Wishlist',
                message: 'Card đồ họa RTX 4070 Super vừa giảm thêm 1.500.000đ kèm Freeship NVX!',
                created_at: '10 phút trước',
                link: '/services/compare/compare.html'
            }
        ];

        const cntEl = document.getElementById('headerNotifCount');
        if (cntEl) cntEl.textContent = String(__nvNotificationsCache.length);
        const bEl = document.getElementById('nvDrawerUnreadBadge');
        if (bEl) bEl.textContent = `${__nvNotificationsCache.length} tin`;

        renderCategorizedNotificationsList();
    } catch (e) {}
}
window.loadGlobalNotificationsIntoDrawer = loadGlobalNotificationsIntoDrawer;
window.refreshGlobalPriceAlertBell = async function(openDrawer) {
    await loadGlobalNotificationsIntoDrawer();
    const bellBtn = document.getElementById('headerNotifBellBtn');
    if (bellBtn) {
        bellBtn.classList.remove('btn-outline-warning');
        bellBtn.classList.add('btn-danger', 'text-white');
    }
    if (openDrawer) {
        let drawer = document.getElementById('nvGlobalNotifDrawer');
        if (!drawer || drawer.classList.contains('d-none')) {
            await toggleGlobalNotificationDrawer();
        }
    }
};

function renderCategorizedNotificationsList(allRead = false) {
    const listEl = document.getElementById('nvGlobalNotifList');
    if (!listEl) return;

    const filtered = __nvNotificationsCache.filter(n => {
        const t = String(n.notif_type || '').toLowerCase();
        const title = String(n.title || '').toLowerCase();
        const isLegal = t.includes('legal') || title.includes('điều khoản') || title.includes('dieu-');
        if (__nvNotifFilterMode === 'legal') return isLegal;
        if (__nvNotifFilterMode === 'order') return !isLegal;
        return true;
    });

    if (!filtered.length) {
        listEl.innerHTML = `<div class="text-center py-4 small" style="color:#94a3b8;">Không có thông báo nào trong mục này.</div>`;
        return;
    }

    listEl.innerHTML = filtered.slice(0, 14).map(n => {
        const t = String(n.notif_type || '').toLowerCase();
        const title = String(n.title || '');
        const isLegal = t.includes('legal') || title.toLowerCase().includes('điều khoản') || title.includes('DIEU-');
        const isPrice = t.includes('price') || title.toLowerCase().includes('giảm giá');
        const iconTxt = isLegal ? '⚖️' : (isPrice ? '📉' : '🎁');
        const iconBg = isLegal ? 'rgba(250, 204, 21, 0.18)' : (isPrice ? 'rgba(244, 63, 94, 0.18)' : 'rgba(118, 185, 0, 0.18)');
        const iconBorder = isLegal ? '#facc15' : (isPrice ? '#f43f5e' : '#76b900');
        const href = n.link || (isLegal ? '/services/legal/terms.html' : (isPrice ? '/services/compare/compare.html' : '/services/vouchers_deals/vouchers.html'));

        return `
            <a href="${href}" class="nv-notif-item-card">
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                     style="width:36px;height:36px;background:${iconBg};border:1.5px solid ${iconBorder};font-size:16px;">
                    ${iconTxt}
                </div>
                <div class="flex-fill" style="min-width:0;">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="notif-title text-truncate">${title}</span>
                        ${!allRead ? `<span class="rounded-circle bg-nvidia ms-1 flex-shrink-0" style="width:7px;height:7px;"></span>` : ''}
                    </div>
                    <div class="notif-desc">${n.message || ''}</div>
                    <span class="notif-time">🕒 ${String(n.created_at || 'Vừa xong').slice(0, 16)}</span>
                </div>
            </a>
        `;
    }).join('');
}

/* ==========================================================================
   AUTOCOMPLETE TÌM KIẾM THÔNG MINH TRÊN HEADER
   ========================================================================== */

function setupSmartSearchEngineAutocomplete() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput || searchInput.dataset.nvAutocompleteBound) return;
    searchInput.dataset.nvAutocompleteBound = '1';
    searchInput.setAttribute('autocomplete', 'off');

    const formEl = searchInput.closest('form') || searchInput.parentElement;
    if (formEl) formEl.style.position = 'relative';

    let drop = document.getElementById('nvSearchAutocompleteDropdown');
    if (!drop && formEl) {
        drop = document.createElement('div');
        drop.id = 'nvSearchAutocompleteDropdown';
        drop.className = 'p-2 shadow-lg d-none';
        Object.assign(drop.style, {
            position: 'absolute',
            top: '38px',
            left: '0',
            right: '0',
            zIndex: '1099',
            maxHeight: '390px',
            overflowY: 'auto',
            background: 'rgba(9, 14, 24, 0.96)',
            color: '#f8fafc',
            border: '2px solid #76b900',
            borderRadius: '14px',
            backdropFilter: 'blur(18px)'
        });
        formEl.appendChild(drop);
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(__nvSearchDebounceTimer);
        const q = searchInput.value.trim();
        __nvSearchDebounceTimer = setTimeout(() => fetchLiveSearchSuggestions(q), 140);
    });

    searchInput.addEventListener('focus', () => {
        fetchLiveSearchSuggestions(searchInput.value.trim());
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#nvSearchAutocompleteDropdown') && e.target !== searchInput) {
            drop?.classList.add('d-none');
        }
    });
}

async function fetchLiveSearchSuggestions(queryText) {
    const drop = document.getElementById('nvSearchAutocompleteDropdown');
    if (!drop) return;
    try {
        const res = await fetch(`/api/home/products?q=${encodeURIComponent(queryText)}&sort_by=popular`);
        if (!res.ok) return;
        const data = await res.json();
        const products = (data.products || []).slice(0, 6);
        drop.classList.remove('d-none');

        if (!products.length) {
            drop.innerHTML = `<div class="p-2 text-center small" style="color:#94a3b8;">Không tìm thấy sản phẩm khớp với "<strong>${queryText}</strong>".</div>`;
            return;
        }

        drop.innerHTML = `
            <div class="d-flex justify-content-between align-items-center px-2 py-1 border-bottom border-secondary border-opacity-25 mb-1" style="font-size:11px;">
                <span class="fw-bold text-nvidia">🔍 ${queryText ? `Kết quả khớp nhanh (${data.count || products.length} SP)` : '🔥 Xu hướng tìm kiếm'}</span>
            </div>
            ${products.map(p => {
                const img = getProductImageUrl(p);
                return `
                    <div class="nv-notif-item-card align-items-center justify-content-between mb-1 py-1">
                        <a href="/services/product/product-detail.html?id=${p.id}" class="d-flex align-items-center gap-2 text-truncate pe-2 text-decoration-none flex-fill" style="color:#f8fafc;">
                            <img src="${img}" style="width:36px;height:36px;object-fit:cover;" class="rounded border flex-shrink-0">
                            <div class="text-truncate">
                                <div class="fw-bold small text-truncate text-white">${p.name}</div>
                                <small style="font-size:10.5px;color:#cbd5e1;">🏪 ${p.store_name || 'Shop Mall'} • <strong class="text-nvidia">${formatVND(p.price)}</strong></small>
                            </div>
                        </a>
                        <button type="button" class="btn btn-nvidia btn-sm py-0 px-2 fw-bold flex-shrink-0" style="font-size:10.5px;" onclick="document.getElementById('nvSearchAutocompleteDropdown')?.classList.add('d-none'); executeGlobalCatSearchBarHunt('Mua 1 ${(p.name || '').slice(0, 22).replace(/'/g, '')} bỏ vào giỏ');">🐾 Mèo Gắp</button>
                    </div>
                `;
            }).join('')}
        `;
    } catch (e) {}
}

/* ==========================================================================
   TRẠM HỢP NHẤT MÈO LỎNG AI & CHAT GIAN HÀNG (1 KHUNG DUY NHẤT PHÂN 3 TAB)
   ========================================================================== */

function initMultiWindowMessengerDock() {
    setupSmartSearchEngineAutocomplete();
    ['nvLiquidCatWidget', 'nvMasterCatActor', 'nvUnifiedCatStation', 'nvCompanionCatAvatar', 'nividaCatControlDock', 'nividaCatOpenBtn'].forEach(id => {
        document.getElementById(id)?.remove();
    });

    if (document.getElementById('nvMessengerLauncherBar')) return;

    const hubMinimized = localStorage.getItem('nvx_unified_hub_minimized') === '1';

    const launcher = document.createElement('div');
    launcher.id = 'nvMessengerLauncherBar';
    Object.assign(launcher.style, {
        position: 'fixed',
        bottom: '14px',
        right: '18px',
        zIndex: '10051',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '10px',
        pointerEvents: 'none'
    });

    launcher.innerHTML = `
        <!-- Khay chứa các cửa sổ Chat Gian Hàng mở song song -->
        <div id="nvMessengerWindowsSlot" style="display:flex;align-items:flex-end;gap:10px;pointer-events:auto;"></div>

        <!-- Khung Hợp Nhất 3 Tab: Mèo Lỏng AI | Chat Gian Hàng | Khiếu Nại -->
        <div style="pointer-events:auto;position:relative;">
            <div id="nvUnifiedHubDock" class="${hubMinimized ? 'd-none' : ''}">
                <!-- Thanh tiêu đề & Điều khiển nhanh Linh vật Mèo Lỏng -->
                <div class="px-3 py-2 d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25" style="background:linear-gradient(135deg,#090d16,#1e293b);">
                    <div class="d-flex align-items-center gap-1">
                        <span style="font-size:15px;">🐱</span>
                        <strong class="small text-nvidia">Trạm Mèo Lỏng AI &amp; Chat Sàn</strong>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <button type="button" class="cat-action-chip py-0 px-2" title="Làm mờ khung để nhìn xuyên thấu" onclick="document.getElementById('nvUnifiedHubDock')?.classList.toggle('hub-translucent')">👁️ Mờ</button>
                        <button type="button" class="btn btn-sm text-light p-0 px-1 border-0 fw-bold" title="Thu gọn trạm" onclick="toggleUnifiedHubDock(false)">✕</button>
                    </div>
                </div>

                <!-- Thanh chuyển 3 Tab: 1. Mèo Lỏng AI | 2. Chat Gian Hàng | 3. Khiếu Nại -->
                <div class="nv-hub-seg-bar">
                    <button type="button" id="msgHubTabBtn_cat" data-nv-slot="nav_ai_cat" class="nv-hub-seg-btn active" onclick="switchMessengerPopupTab('cat')">🐾 1. Mèo Lỏng AI</button>
                    <button type="button" id="msgHubTabBtn_chat" class="nv-hub-seg-btn" onclick="switchMessengerPopupTab('chat')">💬 2. Chat Shop (<span id="nvMessengerActiveCount">3</span>)</button>
                    <button type="button" id="msgHubTabBtn_report" class="nv-hub-seg-btn" onclick="switchMessengerPopupTab('report')">🚨 3. Khiếu Nại</button>
                </div>

                <!-- TAB 1: ĐIỀU KHIỂN LINH VẬT MÈO LỎNG GỐC (5 GIỐNG MÈO, LEO TRẦN, SĂN HÀNG) -->
                <div id="msgHubPane_cat" class="p-3 small">
                    <div class="d-flex flex-wrap justify-content-between align-items-center gap-1 mb-2 pb-2 border-bottom border-secondary border-opacity-25">
                        <span class="text-warning fw-bold" style="font-size:11px;">🎨 Đổi Giống &amp; Di Chuyển:</span>
                        <div class="d-flex flex-wrap gap-1">
                            <button type="button" class="cat-action-chip" onclick="window.__nividaCatInstance?.switchCatBreed()">🎨 Đổi Mèo (5 Giống)</button>
                            <button type="button" class="cat-action-chip" onclick="window.__nividaCatInstance?.goToCeilingWalk()">🐾 Leo Trần</button>
                            <button type="button" class="cat-action-chip" onclick="window.__nividaCatInstance?.goToRandom2DTarget()">🚀 Đi Khắp Màn</button>
                        </div>
                    </div>

                    <div class="d-flex flex-wrap gap-1 mb-2">
                        <button type="button" class="cat-action-chip" onclick="executeGlobalCatSearchBarHunt('Cho ăn cá')">🐟 Ăn cá</button>
                        <button type="button" class="cat-action-chip" onclick="executeGlobalCatSearchBarHunt('Uống trà sữa boba')">🧋 Trà sữa</button>
                        <button type="button" class="cat-action-chip" onclick="executeGlobalCatSearchBarHunt('Lộn vòng backflip')">🤸 Nhào lộn</button>
                        <button type="button" class="cat-action-chip" onclick="executeGlobalCatSearchBarHunt('Nằm ổ bánh mì')">🍞 Bánh mì</button>
                        <button type="button" class="cat-action-chip" onclick="executeGlobalCatSearchBarHunt('Tan chảy sploot')">🫠 Tan chảy</button>
                        <button type="button" class="cat-action-chip" onclick="executeGlobalCatSearchBarHunt('Nhảy múa')">🎵 Nhảy múa</button>
                    </div>

                    <div class="d-flex flex-wrap gap-1 mb-2">
                        <button type="button" class="cat-action-chip" style="border-color:#76b900;color:#a3e635;" onclick="executeGlobalCatSearchBarHunt('Mua 2 card RTX 4070 bỏ vào giỏ')">🛒 Săn 2 RTX 4070</button>
                        <button type="button" class="cat-action-chip" style="border-color:#38bdf8;color:#7dd3fc;" onclick="executeGlobalCatSearchBarHunt('Lấy 3 bàn phím cơ bỏ vào giỏ')">⌨️ Săn 3 Phím Cơ</button>
                        <button type="button" class="cat-action-chip" style="border-color:#facc15;color:#fde047;" onclick="executeGlobalCatSearchBarHunt('Tìm màn hình bỏ vào giỏ')">🖥️ Săn Màn Hình</button>
                        <button type="button" class="cat-action-chip" onclick="executeGlobalCatSearchBarHunt('Đổi giao diện tối')">🌙 Nền Tối</button>
                        <button type="button" class="cat-action-chip" onclick="executeGlobalCatSearchBarHunt('Đổi giao diện sáng')">☀️ Nền Sáng</button>
                    </div>

                    <form id="nividaCatCmdForm" onsubmit="submitUnifiedCatCommand(event)" class="d-flex gap-1 mt-2">
                        <input type="text" id="nividaCatCmdInput" class="form-control form-control-sm" style="background:rgba(15,23,42,0.92);color:#fff;border-color:#76b900;font-size:12px;" placeholder="💬 Gõ lệnh cho Mèo (VD: mua 2 tai nghe, ăn cá)..." required>
                        <button type="submit" class="btn btn-nvidia btn-sm px-3 fw-bold">Gửi</button>
                    </form>
                </div>

                <!-- TAB 2: DANH SÁCH CHAT GIAN HÀNG ĐA CỬA SỔ -->
                <div id="msgHubPane_chat" class="p-2 d-none">
                    <div class="small px-1 mb-2" style="font-size:11px;color:#cbd5e1;">Chọn gian hàng để mở cửa sổ chat trực tuyến:</div>
                    <div id="nvMessengerContactList" class="d-flex flex-column gap-1" style="max-height:240px;overflow-y:auto;"></div>
                </div>

                <!-- TAB 3: GỬI KHIẾU NẠI NHANH & MỞ TÒA ÁN PHÂN XỬ 3 BÊN -->
                <div id="msgHubPane_report" class="p-3 d-none">
                    <form onsubmit="submitQuickDisputeOrBugFromChat(event)" class="small">
                        <div class="mb-2">
                            <label class="fw-bold mb-1 text-light">Phân loại yêu cầu *</label>
                            <select id="chatReportTypeSelect" class="form-select form-select-sm" style="background:#0f172a;color:#fff;border-color:#475569;">
                                <option value="dispute">⚖️ Khiếu nại Đơn hàng / Bảo vệ Escrow</option>
                                <option value="sla">🚚 Báo trễ hẹn SLA (Nhận Voucher HOATOC50K)</option>
                                <option value="bug">🛠️ Báo lỗi hiển thị / Kỹ thuật</option>
                            </select>
                        </div>
                        <div class="row g-2 mb-2">
                            <div class="col-5">
                                <label class="fw-bold mb-1 text-light">Mã đơn #</label>
                                <input type="number" id="chatReportOrderId" class="form-control form-control-sm" style="background:#0f172a;color:#fff;border-color:#475569;" value="1" min="1">
                            </div>
                            <div class="col-7">
                                <label class="fw-bold mb-1 text-light">Gian hàng</label>
                                <input type="text" id="chatReportTarget" class="form-control form-control-sm" style="background:#0f172a;color:#fff;border-color:#475569;" value="ASUS ROG Official Mall">
                            </div>
                        </div>
                        <div class="mb-2">
                            <label class="fw-bold mb-1 text-light">Nội dung chi tiết *</label>
                            <textarea id="chatReportDesc" class="form-control form-control-sm" style="background:#0f172a;color:#fff;border-color:#475569;" rows="2" placeholder="Mô tả vấn đề cần hỗ trợ..." required></textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-warning text-dark btn-sm flex-fill fw-bold rounded-pill">🚀 Gửi Ngay</button>
                            <a href="/services/admin_dispute/arbitration-court.html" class="btn btn-outline-info btn-sm rounded-pill fw-bold">⚖️ Tòa Án 3 Bên</a>
                        </div>
                    </form>
                    <div id="chatReportResultMsg" class="small mt-2 d-none"></div>
                </div>
            </div>

            <!-- Nút Pill Hợp Nhất Duy Nhất Ở Góc Dưới Phải -->
            <button type="button" id="nvUnifiedHubToggleBtn" data-nv-slot="nav_ai_cat"
                    class="btn btn-nvidia rounded-pill shadow-lg px-3 py-2 fw-bold d-flex align-items-center gap-2"
                    style="border:2px solid #ffffff;font-size:12.5px;box-shadow:0 10px 28px rgba(0,0,0,0.6);"
                    onclick="toggleUnifiedHubDock()">
                <span>🐾 Mèo AI &amp; 💬 Chat Gian Hàng</span>
                <span class="badge rounded-pill bg-warning text-dark">Mở</span>
            </button>
        </div>
    `;
    document.body.appendChild(launcher);

    loadMessengerContactsList();
    if (!__nvMessengerPollTimer) {
        __nvMessengerPollTimer = setInterval(refreshAllOpenMessengerWindows, 3800);
    }
}
window.initMultiWindowMessengerDock = initMultiWindowMessengerDock;

function toggleUnifiedHubDock(forceState = null) {
    const dock = document.getElementById('nvUnifiedHubDock');
    if (!dock) return;
    const willShow = forceState !== null ? forceState : dock.classList.contains('d-none');
    dock.classList.toggle('d-none', !willShow);
    localStorage.setItem('nvx_unified_hub_minimized', willShow ? '0' : '1');
    if (willShow) {
        loadMessengerContactsList();
    }
}
window.toggleUnifiedHubDock = toggleUnifiedHubDock;
window.toggleMessengerContactListPopup = () => toggleUnifiedHubDock();
window.closeUnifiedPopupAndRestoreDock = () => toggleUnifiedHubDock(false);

function openMessengerWithTab(tabKey) {
    toggleUnifiedHubDock(true);
    switchMessengerPopupTab(tabKey);
}
window.openMessengerWithTab = openMessengerWithTab;

function switchMessengerPopupTab(tabKey) {
    ['cat', 'chat', 'report'].forEach(k => {
        document.getElementById('msgHubPane_' + k)?.classList.toggle('d-none', k !== tabKey);
        document.getElementById('msgHubTabBtn_' + k)?.classList.toggle('active', k === tabKey);
    });
    if (tabKey === 'chat') loadMessengerContactsList();
    if (tabKey === 'cat') setTimeout(() => document.getElementById('nividaCatCmdInput')?.focus(), 50);
}
window.switchMessengerPopupTab = switchMessengerPopupTab;

function submitUnifiedCatCommand(e) {
    if (e && e.preventDefault) e.preventDefault();
    const inp = document.getElementById('nividaCatCmdInput');
    const msg = (inp ? inp.value : '').trim();
    if (!msg) return;
    inp.value = '';
    executeGlobalCatSearchBarHunt(msg);
}
window.submitUnifiedCatCommand = submitUnifiedCatCommand;

async function loadMessengerContactsList() {
    const u = getAuthUser();
    try {
        const res = await fetch(`/api/admin-dispute/store-chat/sessions?seller_id=${(u && u.id) || 1}&role=admin`);
        const data = await res.json();
        let list = Array.isArray(data) ? data : (data.sessions || []);
        if (!list.length) {
            list = [
                { id: 1, buyer_id: 101, buyer_name: 'Nguyễn Văn Khách (VIP)', seller_id: 1, seller_store_name: 'ASUS ROG Official Mall', chat_mode: 'ai' },
                { id: 2, buyer_id: 102, buyer_name: 'Trần Minh Quân (Build PC)', seller_id: 2, seller_store_name: 'MSI Gaming Flagship', chat_mode: 'human' },
                { id: 3, buyer_id: 103, buyer_name: 'Lê Hoàng Hải (Săn Deal)', seller_id: 3, seller_store_name: 'Logitech G Official', chat_mode: 'ai' }
            ];
        }
        __nvMessengerSessionsCache = list;
        const cntEl = document.getElementById('nvMessengerActiveCount');
        if (cntEl) cntEl.textContent = String(list.length);

        const box = document.getElementById('nvMessengerContactList');
        if (!box) return;
        box.innerHTML = list.map(s => `
            <div class="nv-chat-contact-item" onclick="openMessengerChatWindow(${s.id}, '${(s.buyer_name || 'Khách hàng').replace(/'/g, '')}', '${(s.seller_store_name || 'Gian hàng').replace(/'/g, '')}', '${s.chat_mode || 'ai'}')">
                <div class="text-truncate pe-2">
                    <div class="fw-bold small text-truncate text-white">🟢 ${s.buyer_name || 'Khách hàng'}</div>
                    <small style="font-size:10.5px;color:#cbd5e1;">🏪 ${s.seller_store_name || 'Shop Mall'}</small>
                </div>
                <span class="badge ${s.chat_mode === 'human' ? 'bg-warning text-dark' : 'bg-info text-dark'}" style="font-size:10px;">
                    ${s.chat_mode === 'human' ? '👤 Người thật' : '🤖 AI'}
                </span>
            </div>
        `).join('');
    } catch (e) {}
}
window.loadMessengerContactsList = loadMessengerContactsList;

async function openMessengerChatWindow(sessionId, buyerName = 'Khách hàng', storeName = 'Shop', chatMode = 'ai') {
    const sid = Number(sessionId || 1);
    const existing = __nvMessengerOpenWindows.find(w => w.sessionId === sid);
    if (existing) {
        existing.minimized = false;
        renderMessengerWindowsDock();
        fetchSingleMessengerWindowHistory(sid);
        return;
    }
    if (__nvMessengerOpenWindows.length >= 2) {
        __nvMessengerOpenWindows.shift();
    }
    __nvMessengerOpenWindows.push({
        sessionId: sid,
        buyerName: buyerName,
        storeName: storeName,
        chatMode: chatMode,
        minimized: false
    });
    renderMessengerWindowsDock();
    await fetchSingleMessengerWindowHistory(sid);
}
window.openMessengerChatWindow = openMessengerChatWindow;

function closeMessengerChatWindow(sessionId) {
    __nvMessengerOpenWindows = __nvMessengerOpenWindows.filter(w => w.sessionId !== Number(sessionId));
    renderMessengerWindowsDock();
}
window.closeMessengerChatWindow = closeMessengerChatWindow;

function toggleMinimizeMessengerWindow(sessionId) {
    const w = __nvMessengerOpenWindows.find(x => x.sessionId === Number(sessionId));
    if (w) {
        w.minimized = !w.minimized;
        renderMessengerWindowsDock();
        if (!w.minimized) fetchSingleMessengerWindowHistory(w.sessionId);
    }
}
window.toggleMinimizeMessengerWindow = toggleMinimizeMessengerWindow;

function renderMessengerWindowsDock() {
    const slot = document.getElementById('nvMessengerWindowsSlot');
    if (!slot) return;
    slot.innerHTML = __nvMessengerOpenWindows.map(w => {
        const initials = String(w.buyerName || 'KH').trim().slice(0, 2).toUpperCase();
        if (w.minimized) {
            return `
                <div class="position-relative" style="cursor:pointer;" title="${w.buyerName}" onclick="toggleMinimizeMessengerWindow(${w.sessionId})">
                    <div class="rounded-circle shadow-lg d-flex align-items-center justify-content-center fw-bold text-white"
                         style="width:46px;height:46px;background:linear-gradient(135deg,#0f172a,#15803d);border:2px solid #76b900;font-size:13px;">
                        ${initials}
                    </div>
                    <span class="position-absolute bottom-0 start-0 p-1 bg-success border border-light rounded-circle"></span>
                    <button type="button" class="position-absolute top-0 end-0 badge rounded-pill bg-danger border-0 p-1"
                            style="font-size:8px;line-height:1;"
                            onclick="event.stopPropagation(); closeMessengerChatWindow(${w.sessionId})">✕</button>
                </div>
            `;
        }
        return `
            <div class="shadow-lg d-flex flex-column"
                 style="width:300px;height:370px;background:rgba(9,14,24,0.95);color:#f8fafc;border:1.5px solid rgba(118,185,0,0.7);border-radius:18px;overflow:hidden;box-shadow:0 18px 42px rgba(0,0,0,0.6);backdrop-filter:blur(18px);">
                <div class="px-3 py-2 d-flex justify-content-between align-items-center" style="background:linear-gradient(135deg,#090d16,#1e293b);color:#fff;border-bottom:1px solid rgba(118,185,0,0.4);">
                    <div class="d-flex align-items-center gap-2 text-truncate pe-1" style="cursor:pointer;" onclick="toggleMinimizeMessengerWindow(${w.sessionId})">
                        <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-dark flex-shrink-0"
                             style="width:28px;height:28px;background:#76b900;font-size:11px;">${initials}</div>
                        <div class="text-truncate">
                            <div class="fw-bold small text-truncate lh-1 mb-1 text-white">${w.buyerName}</div>
                            <small style="font-size:10px;color:#a3e635;">● ${w.storeName}</small>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                        <button type="button" id="msgModeBtn_${w.sessionId}" class="badge rounded-pill border-0 ${w.chatMode === 'human' ? 'bg-warning text-dark' : 'bg-info text-dark'}" style="font-size:10px;cursor:pointer;" onclick="switchMessengerWindowMode(${w.sessionId})">
                            ${w.chatMode === 'human' ? '👤 Người' : '🤖 AI'}
                        </button>
                        <button type="button" class="btn btn-sm py-0 px-1 text-light border-0" onclick="toggleMinimizeMessengerWindow(${w.sessionId})">—</button>
                        <button type="button" class="btn btn-sm py-0 px-1 text-secondary border-0" onclick="closeMessengerChatWindow(${w.sessionId})">✕</button>
                    </div>
                </div>
                <div id="msgHistoryBox_${w.sessionId}" class="flex-fill p-2 small" style="overflow-y:auto;"></div>
                <div class="px-2 py-1 border-top border-secondary border-opacity-25 d-flex gap-1" style="overflow-x:auto;white-space:nowrap;scrollbar-width:none;background:rgba(15,23,42,0.5);">
                    <span class="cat-action-chip py-0 px-2" style="font-size:10px;" onclick="quickSendMessengerText(${w.sessionId}, 'Shop xác nhận đơn của bạn đã đóng gói kèm ảnh minh chứng nhé!')">📦 Đã đóng gói</span>
                    <span class="cat-action-chip py-0 px-2" style="font-size:10px;" onclick="quickSendMessengerText(${w.sessionId}, 'Sản phẩm bảo hành chính hãng 36 tháng 1 đổi 1 ạ!')">🛡️ Bảo hành 36T</span>
                </div>
                <form onsubmit="submitMessengerWindowSend(event, ${w.sessionId})" class="p-2 border-top border-secondary border-opacity-25 d-flex align-items-center gap-1">
                    <input type="text" id="msgInput_${w.sessionId}" class="form-control form-control-sm rounded-pill px-3" style="background:#0f172a;color:#fff;border-color:#475569;" placeholder="Nhắn tin..." required>
                    <button type="submit" class="btn btn-nvidia btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width:32px;height:32px;padding:0;">➤</button>
                </form>
            </div>
        `;
    }).join('');
}

async function fetchSingleMessengerWindowHistory(sessionId) {
    const box = document.getElementById(`msgHistoryBox_${sessionId}`);
    if (!box) return;
    try {
        const res = await fetch(`/api/admin-dispute/store-chat/session/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs = data.messages || [];
        if (data.session) {
            const w = __nvMessengerOpenWindows.find(x => x.sessionId === Number(sessionId));
            if (w) w.chatMode = data.session.chat_mode || w.chatMode;
            const mBtn = document.getElementById(`msgModeBtn_${sessionId}`);
            if (mBtn && w) {
                mBtn.className = `badge rounded-pill border-0 ${w.chatMode === 'human' ? 'bg-warning text-dark' : 'bg-info text-dark'}`;
                mBtn.textContent = w.chatMode === 'human' ? '👤 Người' : '🤖 AI';
            }
        }
        if (!msgs.length) {
            box.innerHTML = `<div class="small text-center py-3" style="color:#94a3b8;">Bắt đầu trò chuyện trực tuyến ngay!</div>`;
            return;
        }
        box.innerHTML = msgs.map(m => {
            const isBuyer = m.sender_role === 'buyer';
            return `
                <div class="mb-2 d-flex flex-column ${isBuyer ? 'align-items-start' : 'align-items-end'}">
                    <small style="font-size:9.5px;color:#94a3b8;">${m.sender_name || (isBuyer ? 'Khách' : 'Shop')}</small>
                    <div class="px-2 py-1 rounded-3 text-white" style="max-width:88%;font-size:12px;background:${isBuyer ? 'rgba(51,65,85,0.75)' : 'rgba(118,185,0,0.28)'};border:1px solid ${isBuyer ? '#64748b' : '#76b900'};">
                        ${m.message}
                    </div>
                </div>
            `;
        }).join('');
        box.scrollTop = box.scrollHeight;
    } catch (e) {}
}

function refreshAllOpenMessengerWindows() {
    __nvMessengerOpenWindows.forEach(w => {
        if (!w.minimized) fetchSingleMessengerWindowHistory(w.sessionId);
    });
}

async function switchMessengerWindowMode(sessionId) {
    const w = __nvMessengerOpenWindows.find(x => x.sessionId === Number(sessionId));
    if (!w) return;
    const nextMode = w.chatMode === 'human' ? 'ai' : 'human';
    w.chatMode = nextMode;
    try {
        await fetch(`/api/admin-dispute/store-chat/session/${sessionId}/mode`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_mode: nextMode })
        });
        fetchSingleMessengerWindowHistory(sessionId);
    } catch (e) {}
}
window.switchMessengerWindowMode = switchMessengerWindowMode;

async function quickSendMessengerText(sessionId, textVal) {
    const inp = document.getElementById(`msgInput_${sessionId}`);
    if (inp) {
        inp.value = textVal;
        await submitMessengerWindowSend(null, sessionId);
    }
}
window.quickSendMessengerText = quickSendMessengerText;

async function submitMessengerWindowSend(e, sessionId) {
    if (e && e.preventDefault) e.preventDefault();
    const inp = document.getElementById(`msgInput_${sessionId}`);
    if (!inp) return;
    const msg = inp.value.trim();
    if (!msg) return;
    inp.value = '';

    const u = getAuthUser();
    const isSellerOrAdmin = u && (u.role === 'seller' || u.role === 'admin');
    try {
        if (isSellerOrAdmin) {
            await fetch('/api/admin-dispute/store-chat/seller-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    seller_name: u.company_name || u.store_name || u.full_name || 'Chủ Shop',
                    message: msg
                })
            });
        } else {
            await fetch('/api/admin-dispute/store-chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    buyer_id: (u && u.id) || 1,
                    buyer_name: (u && (u.full_name || u.username)) || 'Khách hàng',
                    seller_id: 1,
                    message: msg
                })
            });
        }
        await fetchSingleMessengerWindowHistory(sessionId);
    } catch (err) {}
}
window.submitMessengerWindowSend = submitMessengerWindowSend;

async function submitQuickDisputeOrBugFromChat(e) {
    if (e && e.preventDefault) e.preventDefault();
    const u = getAuthUser();
    const rType = document.getElementById('chatReportTypeSelect')?.value || 'dispute';
    const ordId = Number(document.getElementById('chatReportOrderId')?.value || 1);
    const targetName = document.getElementById('chatReportTarget')?.value.trim() || 'Gian hàng';
    const desc = document.getElementById('chatReportDesc')?.value.trim() || '';
    const msgBox = document.getElementById('chatReportResultMsg');

    try {
        if (rType === 'bug') {
            recordTesterTelemetryEvent('USER_BUG_REPORT', targetName, 'ERR-USER-REPORT', window.location.pathname, desc);
            if (msgBox) {
                msgBox.className = 'small mt-2 p-2 rounded border border-info text-info fw-bold';
                msgBox.textContent = 'Đã ghi nhận báo cáo kỹ thuật vào bảng Telemetry!';
                msgBox.classList.remove('d-none');
            }
            notifyToast('Đã gửi báo cáo sự cố kỹ thuật!', 'info');
        } else {
            if (rType === 'sla') {
                await fetch(`/api/tracking/lookup?order_code=${ordId}&action=simulate_late_sla`);
            }
            const res = await fetch('/api/admin-dispute/disputes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: ordId,
                    buyer_name: (u && (u.full_name || u.username)) || 'Khách hàng',
                    seller_name: targetName,
                    reason: desc,
                    description: desc
                })
            });
            const data = await res.json();
            if (msgBox) {
                msgBox.className = 'small mt-2 p-2 rounded border border-success text-nvidia fw-bold';
                msgBox.innerHTML = `${data.message || 'Đã gửi khiếu nại!'}<br><small class="text-light">${data.ai_suggestion || ''}</small>`;
                msgBox.classList.remove('d-none');
            }
            notifyToast(data.message || 'Đã gửi khiếu nại lên Trọng tài AI!', 'success');
        }
        document.getElementById('chatReportDesc').value = '';
    } catch (err) {}
}
window.submitQuickDisputeOrBugFromChat = submitQuickDisputeOrBugFromChat;

function recordTesterTelemetryEvent(actionType, targetEl, errCode = 'OK-200', srcHint = '', detail = '') {
    try {
        const u = getAuthUser();
        const userName = u ? `${u.username || u.full_name} (${u.role || 'buyer'})` : 'Khách';
        fetch('/api/settings/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: userName,
                page_path: window.location.pathname + window.location.search,
                action_type: actionType,
                target_element: targetEl,
                error_code: errCode,
                source_file_hint: srcHint,
                detail: detail
            })
        }).catch(() => {});
    } catch (e) {}
}
window.recordTesterTelemetryEvent = recordTesterTelemetryEvent;

function executeGlobalCatSearchBarHunt(rawCommand = '') {
    if (window.__nividaCatInstance && typeof window.__nividaCatInstance.sendCommandToCat === 'function') {
        window.__nividaCatInstance.sendCommandToCat(rawCommand || 'Mua 1 RTX 4070 bỏ vào giỏ');
        return;
    }
    ensureCatWidgetScriptLoaded();
    setTimeout(() => {
        if (window.__nividaCatInstance && typeof window.__nividaCatInstance.sendCommandToCat === 'function') {
            window.__nividaCatInstance.sendCommandToCat(rawCommand || 'Mua 1 RTX 4070 bỏ vào giỏ');
        }
    }, 350);
}
window.executeGlobalCatSearchBarHunt = executeGlobalCatSearchBarHunt;
window.triggerAiCatCatchVisibleProduct = executeGlobalCatSearchBarHunt;

function ensureCatWidgetScriptLoaded() {
    if (window.__nividaCatInstance) return;
    const existing = document.querySelector('script[src*="cat_widget.js"]');
    if (existing) return;
    const s = document.createElement('script');
    s.src = '/core/cat_widget.js?v=' + Date.now();
    document.body.appendChild(s);
}

function initNvidiaPlatformBootstrap() {
    /* Xóa hẳn chế độ giả lập điện thoại nếu từng lưu trong sessionStorage */
    sessionStorage.removeItem('nvx_mobile_app_mode');
    document.body.classList.remove('mobile-app-sim-active');

    if (localStorage.getItem('nvx_default_light_v61') !== '1') {
        localStorage.setItem('nvx_default_light_v61', '1');
        localStorage.setItem('nvx_visual_skin', 'pure-daylight');
        localStorage.setItem('theme', 'light');
    }

    if (!enforceProtectedRouteGuard()) return;
    renderGlobalHeaderAndFooter();
    const savedSkin = localStorage.getItem('nvx_visual_skin') || 'pure-daylight';
    applyNvidiaVisualSkin(savedSkin);
    initSmartSearchSuggestionRotator();
    initMultiWindowMessengerDock();
    ensureCatWidgetScriptLoaded();

    document.querySelectorAll('img').forEach(img => {
        if (!img.dataset.nvFallbackBound) {
            img.dataset.nvFallbackBound = '1';
            img.addEventListener('error', function() {
                if (!this.src.startsWith('data:image/svg+xml')) {
                    this.src = buildCategoryDefaultSvgDataUri('gpu', this.alt || 'Nvidia Store');
                }
            });
        }
    });

    const bankBtn = document.getElementById('headerBankBalanceBtn');
    if (bankBtn && !bankBtn.querySelector('img.nvx-dynamic-slot-icon') && !bankBtn.textContent.trim()) {
        bankBtn.textContent = '🏦 Bank';
    }

    syncActiveIconSetAcrossWebsite();
    setTimeout(syncActiveIconSetAcrossWebsite, 150);
    setTimeout(syncActiveIconSetAcrossWebsite, 500);
    setTimeout(syncActiveIconSetAcrossWebsite, 1200);

    const u = getAuthUser();
    if (u && u.id) {
        fetch(`/api/settings/bank-wallet?user_id=${u.id}`)
            .then(r => r.json())
            .then(d => {
                if (d && d.coins !== undefined) {
                    const cEl = document.getElementById('headerUserCoinsBadge');
                    if (cEl) cEl.textContent = `🪙 ${Number(d.coins).toLocaleString('vi-VN')} Xu`;
                }
            })
            .catch(() => {});
    }

    if (!window.__nvTelemetryAttached) {
        window.__nvTelemetryAttached = true;
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('button, a.btn, [onclick]');
            if (!btn) return;
            const label = (btn.textContent || btn.getAttribute('title') || btn.id || 'Button').trim().slice(0, 48);
            const idHint = btn.id ? `#${btn.id}` : (btn.getAttribute('onclick') || btn.getAttribute('href') || '');
            recordTesterTelemetryEvent('CLICK', `${label} (${idHint})`, 'OK-200', window.location.pathname, 'Thao tác người dùng');
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNvidiaPlatformBootstrap);
} else {
    initNvidiaPlatformBootstrap();
}