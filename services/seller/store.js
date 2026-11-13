let __currentStoreSellerId = 1;
let __storeProductsCache = [];
let __storeCurrentAccent = '#76b900';

const STORE_BRAND_NAMES_MAP = {
    1: "ASUS ROG Official Mall",
    2: "MSI Gaming Flagship Store",
    3: "Logitech G & Gear Official",
    4: "Corsair & Elgato Vietnam",
    5: "Samsung Semiconductor Mall",
    6: "Razer Zone & Audio Store",
    7: "NZXT & Lian Li Custom PC",
    8: "Smart Home & Sức Khỏe 247"
};

async function initSellerStorefront() {
    const params = new URLSearchParams(window.location.search);
    __currentStoreSellerId = Number(params.get('seller_id') || params.get('id') || 1);
    const editLink = document.getElementById('editStoreCustomLink');
    if (editLink) {
        editLink.href = `/services/seller/store-customization.html?seller_id=${__currentStoreSellerId}`;
    }
    renderStoreVouchersStrip();
    await reloadStorefrontProducts();
}

function renderStoreVouchersStrip() {
    const box = document.getElementById('storeVouchersStrip');
    if (!box) return;
    const shopVouchers = [
        { code: 'NVIDIAMALL100K', title: 'Giảm 100.000đ Đơn Gian Hàng Chính Hãng', min: 1500000 },
        { code: 'HOATOC50K', title: 'Trợ Giá 50.000đ Giao Nhanh NVX 2H', min: 300000 },
        { code: 'STARTER30K', title: 'Giảm 30.000đ Cho Khách Theo Dõi Shop', min: 150000 }
    ];
    box.innerHTML = shopVouchers.map(v => `
        <div class="col-md-4">
            <div class="p-2 rounded-3 border d-flex justify-content-between align-items-center" style="background: rgba(118,185,0,0.06);">
                <div>
                    <span class="badge bg-danger font-monospace">${v.code}</span>
                    <div class="small fw-bold mt-1">${v.title}</div>
                    <small class="text-muted">Đơn tối thiểu: ${formatVND(v.min)}</small>
                </div>
                <button type="button" class="btn btn-nvidia btn-sm fw-bold text-nowrap" onclick="claimShopVoucherQuick('${v.code}')">Lưu Mã</button>
            </div>
        </div>
    `).join('');
}

async function claimShopVoucherQuick(code) {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    if (!user || !user.id) {
        if (typeof notifyToast === 'function') notifyToast('Vui lòng đăng nhập để lưu Voucher Shop!', 'warning');
        window.location.href = '/services/auth/auth.html';
        return;
    }
    try {
        const res = await fetch('/api/vouchers/claim-shop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, code: code })
        });
        const data = await res.json();
        if (typeof notifyToast === 'function') {
            notifyToast(data.message || data.error || `Đã lưu mã ${code}!`, res.ok ? 'success' : 'info');
        }
    } catch (e) {}
}

function applyCustomStoreVisualTheme(storeInfo, auditLogs) {
    const brandTitle = storeInfo.store_name || STORE_BRAND_NAMES_MAP[__currentStoreSellerId] || `Nvidia Partner Flagship #${__currentStoreSellerId}`;
    const brandSlogan = storeInfo.slogan || 'Gian hàng chính hãng phân phối linh kiện phần cứng cao cấp.';
    const brandTheme = storeInfo.theme_color || 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #15803d 100%)';
    const accent = storeInfo.accent_color || '#76b900';
    const bgUrl = (storeInfo.bg_image_url || '').trim();
    __storeCurrentAccent = accent;

    const titleEl = document.getElementById('storeBannerTitle');
    if (titleEl) { titleEl.textContent = brandTitle; titleEl.style.color = accent; }
    const sloganEl = document.getElementById('storeBannerSlogan');
    if (sloganEl) sloganEl.textContent = brandSlogan;

    const verBadge = document.getElementById('storePolicyVerBadge');
    if (verBadge) verBadge.textContent = `📜 Chính sách v${storeInfo.policy_version || 1} (Cập nhật: ${String(storeInfo.updated_at || '').slice(0, 10)})`;

    const marqueeEl = document.getElementById('storeWelcomeMarquee');
    if (marqueeEl && storeInfo.welcome_msg) marqueeEl.textContent = '🔥 ' + storeInfo.welcome_msg;

    const wEl = document.getElementById('storeLiveWarrantyText');
    if (wEl && storeInfo.warranty_policy) wEl.textContent = storeInfo.warranty_policy;
    const rEl = document.getElementById('storeLiveReturnText');
    if (rEl && storeInfo.return_policy) rEl.textContent = storeInfo.return_policy;
    const sEl = document.getElementById('storeLiveShippingText');
    if (sEl && storeInfo.shipping_commitment) sEl.textContent = storeInfo.shipping_commitment;

    const heroBanner = document.getElementById('storeDynamicHeroBanner');
    if (heroBanner) {
        heroBanner.style.background = brandTheme;
        heroBanner.style.borderColor = accent;
    }

    const bodyEl = document.getElementById('storePageBody') || document.body;
    if (bgUrl) {
        bodyEl.style.backgroundImage = `linear-gradient(180deg, rgba(7,11,18,0.82) 0%, rgba(11,15,25,0.90) 100%), url('${bgUrl}')`;
        bodyEl.style.backgroundSize = 'cover';
        bodyEl.style.backgroundAttachment = 'fixed';
    }

    const logsBox = document.getElementById('publicStorePolicyLogsList');
    if (logsBox) {
        if (!Array.isArray(auditLogs) || !auditLogs.length) {
            logsBox.innerHTML = `<div class="p-2 rounded border text-muted">Phiên bản v1 (Chính sách gốc từ ngày mở gian hàng): ${storeInfo.warranty_policy || 'Bảo hành 36 tháng'}</div>`;
        } else {
            logsBox.innerHTML = auditLogs.map(l => `
                <div class="p-2 rounded border mb-2" style="background: rgba(118,185,0,0.05);">
                    <div class="d-flex justify-content-between">
                        <span class="badge bg-nvidia">Phiên bản v${l.version}</span>
                        <small class="text-muted font-monospace">🕒 ${l.created_at}</small>
                    </div>
                    <div class="fw-bold text-warning mt-1">${l.change_summary}</div>
                    <div class="text-muted" style="font-size:11px;">🛡️ BH: ${l.warranty_policy} | 🔄 Đổi trả: ${l.return_policy}</div>
                </div>
            `).join('');
        }
    }
}

async function verifyStorePolicyForBuyerOrder() {
    const oDate = document.getElementById('buyerVerifyOrderDate')?.value || '';
    const oId = document.getElementById('buyerVerifyOrderId')?.value || '';
    const box = document.getElementById('buyerPolicyMatchResult');
    try {
        const res = await fetch(`/api/seller/store-customization/match-order?seller_id=${__currentStoreSellerId}&order_date=${encodeURIComponent(oDate)}&order_id=${encodeURIComponent(oId)}`);
        const data = await res.json();
        if (box && data.matched_policy) {
            const mp = data.matched_policy;
            box.innerHTML = `
                <div class="fw-bold text-nvidia mb-1">✅ Khớp Chính Sách Phiên Bản v${mp.version || 1} (Có hiệu lực lúc: ${mp.created_at || 'Khi đặt đơn'})</div>
                <div>• <strong>Cam kết Bảo hành:</strong> ${mp.warranty_policy}</div>
                <div>• <strong>Chính sách Đổi trả:</strong> ${mp.return_policy}</div>
                <div>• <strong>Cam kết Giao hàng:</strong> ${mp.shipping_commitment}</div>
            `;
        }
    } catch (e) {}
}
window.verifyStorePolicyForBuyerOrder = verifyStorePolicyForBuyerOrder;

async function reloadStorefrontProducts() {
    const q = (document.getElementById('storeSearchInput')?.value || '').trim();
    const cat = (document.getElementById('storeCategoryFilter')?.value || '').trim();
    const sortBy = (document.getElementById('storeSortSelect')?.value || 'bestseller').trim();
    const grid = document.getElementById('storeProductsGrid');
    const countBadge = document.getElementById('storeProductCountBadge');

    try {
        const res = await fetch(`/api/seller/storefront/${__currentStoreSellerId}?category=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}&sort_by=${encodeURIComponent(sortBy)}`);
        let products = [];
        let storeInfo = {};
        let auditLogs = [];
        if (res.ok) {
            const data = await res.json();
            products = data.products || [];
            storeInfo = data.store || data.seller || {};
            auditLogs = data.audit_logs || [];
        }
        if (!products.length) {
            const fallbackRes = await fetch(`/api/home/products?category=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}`);
            const fbData = await fallbackRes.json();
            products = (fbData.products || []).slice(0, 12);
        }

        __storeProductsCache = products;
        applyCustomStoreVisualTheme(storeInfo, auditLogs);
        if (countBadge) countBadge.textContent = `${products.length} sản phẩm`;

        if (!grid) return;
        const brandTitle = storeInfo.store_name || STORE_BRAND_NAMES_MAP[__currentStoreSellerId] || 'ASUS ROG Official Mall';

        grid.innerHTML = products.map((p) => {
            const imgUrl = typeof getProductImageUrl === 'function' ? getProductImageUrl(p) : (p.image_url || '/assets/icons/icon.png');
            const price = Number(p.price || 0);
            const oldPrice = Number(p.old_price) > price ? Number(p.old_price) : Math.round((price * 1.18) / 10000) * 10000;
            const discountPct = oldPrice > price && price > 0 ? Math.max(5, Math.round(((oldPrice - price) / oldPrice) * 100)) : 15;
            const detailUrl = `/services/product/product-detail.html?id=${p.id}`;

            return `
                <div class="col-6 col-sm-4 col-md-3 col-lg-2">
                    <div class="nv-adaptive-card h-100 overflow-hidden d-flex flex-column justify-content-between nv-product-card" style="border-color: ${__storeCurrentAccent}44 !important;" data-product-id="${p.id}" data-product-name="${(p.name || '').replace(/"/g, '&quot;')}">
                        <div>
                            <div class="position-relative">
                                <a href="${detailUrl}">
                                    <img src="${imgUrl}" alt="${p.name}" class="w-100" style="height: 145px; object-fit: cover;">
                                </a>
                                <div class="position-absolute top-0 start-0 m-1 d-flex gap-1">
                                    <span class="badge bg-danger" style="font-size:9px;">👑 ${brandTitle.slice(0, 12)}</span>
                                    <span class="badge bg-warning text-dark fw-bold" style="font-size:9px;">-${discountPct}%</span>
                                </div>
                            </div>
                            <div class="p-2 pb-0">
                                <a href="${detailUrl}" class="fw-bold text-decoration-none nv-card-6col-title mb-1" title="${p.name}">${p.name}</a>
                                <div class="text-muted mb-1" style="font-size:10.5px;">ĐVT: <strong>${p.unit || 'Chiếc'}</strong> • BH: <strong>${p.warranty || '36T'}</strong></div>
                                <div class="nv-promo-ribbon mb-1 text-truncate">
                                    🎟️ KM Shop: Giảm 100K • Freeship NVX
                                </div>
                            </div>
                        </div>
                        <div class="p-2 pt-1">
                            <div class="mb-1">
                                <div class="fw-bold" style="color: ${__storeCurrentAccent}; font-size:13.5px;">${formatVND(price)}</div>
                                <div class="d-flex justify-content-between align-items-center">
                                    <del class="text-muted" style="font-size:10px;">${formatVND(oldPrice)}</del>
                                    <small class="text-muted" style="font-size:10px;">⭐${Number(p.rating || 4.9).toFixed(1)}</small>
                                </div>
                            </div>
                            <a href="${detailUrl}" class="btn btn-nvidia btn-sm w-100 fw-bold py-1" style="font-size:11px;">
                                🔍 Xem &amp; Chọn Loại
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {}
}

function addStoreItemToCart(prodId) {
    const p = __storeProductsCache.find(x => Number(x.id) === Number(prodId));
    if (!p) return;
    if (typeof addToCartGlobal === 'function') {
        addToCartGlobal({
            id: p.id,
            name: p.name,
            price: p.price,
            unit: p.unit || 'Chiếc',
            warranty: p.warranty || '36 tháng',
            category: p.category || '',
            image_url: p.image_url || '/assets/icons/icon.png'
        });
    }
}

function startChatFromStorePage() {
    const storeTitle = document.getElementById('storeBannerTitle')?.textContent || STORE_BRAND_NAMES_MAP[__currentStoreSellerId] || 'ASUS ROG Official Mall';
    if (typeof window.openStoreChatBySellerId === 'function') {
        window.openStoreChatBySellerId(__currentStoreSellerId, storeTitle);
    } else if (typeof window.openMultiMessengerWindow === 'function') {
        window.openMultiMessengerWindow('seller_' + __currentStoreSellerId, storeTitle);
    } else if (typeof notifyToast === 'function') {
        notifyToast('Đang mở kênh chat trực tiếp với ' + storeTitle, 'info');
    }
}
window.startChatFromStorePage = startChatFromStorePage;
window.claimShopVoucherQuick = claimShopVoucherQuick;
window.reloadStorefrontProducts = reloadStorefrontProducts;
window.addStoreItemToCart = addStoreItemToCart;

document.addEventListener('DOMContentLoaded', initSellerStorefront);