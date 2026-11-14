let __homeAllProductsCache = [];
let __homeFeaturedStoresCache = [];

function getShopPromotionMetaForProduct(p) {
    const price = Number(p.price || 0);
    const rawOld = Number(p.old_price || 0);
    const oldPrice = rawOld > price ? rawOld : Math.round((price * 1.18) / 10000) * 10000;
    const discountPct = oldPrice > price && price > 0 ? Math.max(5, Math.round(((oldPrice - price) / oldPrice) * 100)) : 15;
    const promos = [
        '🎁 KM Shop: Giảm 100K • Tặng quà',
        '🎟️ Mã Shop -80K • Freeship NX',
        '⚡ Flash Deal • Đổi mới 15 ngày',
        '🔥 Trợ giá 50K • Bảo hành tận nơi'
    ];
    const promoText = promos[Number(p.id || 1) % promos.length];
    return { price, oldPrice, discountPct, promoText };
}

function buildProductCardHtml(p) {
    const imgUrl = typeof getProductImageUrl === 'function' ? getProductImageUrl(p) : (p.image_url || '/assets/icons/icon.png');
    const favActive = typeof isProductFavorited === 'function' && isProductFavorited(p.id);
    const isMall = (p.shop_tier || 'mall') === 'mall';
    const tierBadge = isMall
        ? '<span class="badge bg-danger" style="font-size:9.5px;">👑 Mall</span>'
        : '<span class="badge bg-warning text-dark" style="font-size:9.5px;">⭐ Yêu thích</span>';
    const promo = getShopPromotionMetaForProduct(p);
    const detailUrl = `/services/product/product-detail.html?id=${p.id}`;

    return `
        <div class="col-6 col-sm-4 col-md-3 col-lg-3 nv-product-col">
            <div class="nv-adaptive-card h-100 overflow-hidden d-flex flex-column justify-content-between nv-product-card product-card position-relative"
                 data-product-id="${p.id}"
                 data-product-name="${(p.name || '').replace(/"/g, '&quot;')}">
                <div class="d-flex flex-column flex-fill">
                    <div class="position-relative nv-prod-thumb-wrap product-img-wrap product-card-img nvx-card-thumb">
                        <a href="${detailUrl}" class="d-flex align-items-center justify-content-center w-100 h-100">
                            <img src="${imgUrl}" alt="${(p.name || '').replace(/"/g, '&quot;')}" class="w-100 h-100 nv-prod-thumb" style="width: 100% !important; height: 100% !important; object-fit: contain !important; object-position: center !important;">
                        </a>
                        <div class="position-absolute top-0 start-0 m-1 d-flex gap-1">
                            ${tierBadge}
                            <span class="badge bg-warning text-dark fw-bold" style="font-size:9.5px;">-${promo.discountPct}%</span>
                        </div>
                        <button type="button" class="btn btn-sm btn-light position-absolute top-0 end-0 m-1 py-0 px-1 rounded-circle shadow-sm"
                                style="font-size:11px;" onclick="toggleFavoriteGlobal(${p.id}, this)" title="Yêu thích">
                            ${favActive ? '❤️' : '🤍'}
                        </button>
                    </div>

                    <div class="p-2 pb-0">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <small class="text-muted text-truncate" style="font-size:10px;">🏪 ${p.store_name || 'Nexora Mall'} ☑️</small>
                        </div>
                        <a href="${detailUrl}" class="fw-bold text-decoration-none nv-card-6col-title mb-1" title="${(p.name || '').replace(/"/g, '&quot;')}">${p.name}</a>
                        <div class="text-muted mb-1" style="font-size:10.5px;">
                            ĐVT: <strong>${p.unit || 'Chiếc'}</strong> • BH: <strong>${p.warranty || '24T'}</strong>
                        </div>
                        <div class="nv-promo-ribbon mb-1 text-truncate" title="${promo.promoText}">
                            ${promo.promoText}
                        </div>
                    </div>
                </div>

                <div class="p-2 pt-1">
                    <div class="mb-1">
                        <div class="fw-bold text-nvidia" style="font-size:13.5px;">${formatVND(promo.price)}</div>
                        <div class="d-flex justify-content-between align-items-center">
                            <del class="text-muted" style="font-size:10px;">${formatVND(promo.oldPrice)}</del>
                            <small class="text-muted" style="font-size:10px;">⭐${Number(p.rating || 4.9).toFixed(1)} (${p.sold_count || 28})</small>
                        </div>
                    </div>
                    <a href="${detailUrl}" class="btn btn-nvidia btn-sm w-100 fw-bold py-1" style="font-size:11px;">
                        🔍 Xem &amp; Chọn Loại
                    </a>
                </div>
            </div>
        </div>
    `;
}
window.buildProductCardHtml = buildProductCardHtml;

async function loadHomeActiveEventBanner() {
    try {
        const res = await fetch('/api/settings/events');
        if (!res.ok) return;
        const data = await res.json();
        const activeEv = data.active_event || (data.events || []).find(e => Number(e.is_active) === 1);
        if (!activeEv) return;
        const badgeEl = document.getElementById('heroEventBadge');
        const titleEl = document.getElementById('heroEventTitle');
        const sloganEl = document.getElementById('heroEventSlogan');
        if (badgeEl) badgeEl.textContent = `🎉 CHIẾN DỊCH ${activeEv.date_label || activeEv.event_code}: ĐANG DIỄN RA`;
        if (titleEl && (activeEv.event_name || activeEv.title)) titleEl.textContent = activeEv.event_name || activeEv.title;
        if (sloganEl && (activeEv.description || activeEv.slogan)) sloganEl.textContent = activeEv.description || activeEv.slogan;
    } catch (e) {}
}

async function loadHomeVouchersStrip() {
    const stripBox = document.getElementById('homeVoucherStrip');
    if (!stripBox) return;
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : '';
    try {
        const res = await fetch(`/api/vouchers/list?user_id=${uid}&active_only=1`);
        const data = await res.json();
        const rawList = data.home_vouchers || data.vouchers || [];
        const validList = rawList.filter(v => !v.is_expired && !v.is_out_of_stock && (v.remaining_uses === undefined || v.remaining_uses > 0)).slice(0, 6);
        if (!validList.length) {
            stripBox.innerHTML = '';
            return;
        }
        stripBox.innerHTML = validList.map(v => {
            const claimed = Boolean(v.is_claimed);
            const used = Boolean(v.is_used);
            const canClick = !claimed && !used && v.can_claim !== false;
            const btnText = used ? 'Đã Dùng' : (claimed ? '✓ Đã Lưu Ví' : 'Lưu Mã');
            return `
                <div class="col-6 col-sm-4 col-md-3 col-lg-2">
                    <div class="nv-adaptive-card p-2 h-100 d-flex flex-column justify-content-between">
                        <div>
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="badge bg-danger font-monospace" style="font-size:10px;">${v.code}</span>
                                <small class="text-nvidia fw-bold" style="font-size:9.5px;">Còn ${v.remaining_uses ?? 20}</small>
                            </div>
                            <div class="fw-bold text-truncate" style="font-size:11.5px;">${v.title || ('Giảm ' + formatVND(v.discount_value))}</div>
                            <small class="text-muted d-block" style="font-size:10px;">Đơn từ: ${formatVND(v.min_order_value || 0)}</small>
                        </div>
                        <button type="button" class="btn btn-sm mt-1 py-0 fw-bold ${canClick ? 'btn-nvidia' : 'btn-outline-secondary'}" style="font-size:11px;" ${canClick ? '' : 'disabled'} onclick="claimHomeStarterVoucher('${v.code}')">
                            ${btnText}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {}
}

async function claimHomeStarterVoucher(code) {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user && user.id ? user.id : 13;
    try {
        const res = await fetch('/api/vouchers/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, code: code })
        });
        const data = await res.json();
        if (typeof notifyToast === 'function') {
            notifyToast(data.message || data.error || `Đã lưu mã ${code}!`, res.ok ? 'success' : 'warning');
        }
        loadHomeVouchersStrip();
    } catch (e) {}
}
window.claimHomeStarterVoucher = claimHomeStarterVoucher;

function filterHomeByShopTier(tierKey) {
    const tierEl = document.getElementById('homeFilterShopTier');
    if (tierEl) tierEl.value = tierKey;
    loadProducts();
    document.getElementById('allProductsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.filterHomeByShopTier = filterHomeByShopTier;

function renderFeaturedStoresStrip() {
    const box = document.getElementById('homeStoresStrip');
    if (!box) return;

    const brandCatalog = [
        { title: "ASUS ROG Official Mall", tier: "mall", badge: "👑 Flagship", voucher: "Giảm 150K", rating: 4.9, icon: "🎮" },
        { title: "MSI Gaming Flagship", tier: "mall", badge: "👑 Shop Mall", voucher: "Giảm 100K", rating: 4.9, icon: "⚡" },
        { title: "Logitech G Official", tier: "mall", badge: "👑 Shop Mall", voucher: "Freeship", rating: 5.0, icon: "🎧" },
        { title: "Corsair & Elgato VN", tier: "mall", badge: "👑 Shop Mall", voucher: "Giảm 80K", rating: 4.8, icon: "🖥️" },
        { title: "Samsung Memory Mall", tier: "mall", badge: "👑 Shop Mall", voucher: "Giảm 50K", rating: 4.9, icon: "💾" },
        { title: "Smart Home & Care 247", tier: "favorite", badge: "⭐ Yêu Thích", voucher: "Giảm 30K", rating: 4.8, icon: "⌚" }
    ];

    const baseList = __homeFeaturedStoresCache.length ? __homeFeaturedStoresCache.slice(0, 6) : brandCatalog.map((m, i) => ({ id: i + 1, product_count: 24 + i * 5 }));

    box.innerHTML = baseList.map((s, idx) => {
        const meta = brandCatalog[idx % brandCatalog.length];
        const rawName = (s.store_name || s.company_name || s.full_name || '').trim();
        const displayName = (!rawName || rawName.toLowerCase().includes('nivida official') || rawName.toLowerCase().includes('quản trị')) ? meta.title : rawName;
        const tierKey = s.shop_tier || meta.tier;
        const isMall = tierKey === 'mall';
        const badgeCls = isMall ? 'bg-danger' : 'bg-warning text-dark';
        const vTag = s.voucher_tag || meta.voucher;

        return `
            <div class="col-6 col-sm-4 col-md-4 col-lg-2">
                <a href="/services/seller/store.html?seller_id=${s.id || (idx + 1)}" class="text-decoration-none">
                    <div class="nv-adaptive-card p-2 h-100 d-flex flex-column justify-content-between">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <div class="rounded-3 d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                 style="width:34px;height:34px;background:rgba(118,185,0,0.15);border:1px solid #76b900;font-size:16px;">
                                ${meta.icon}
                            </div>
                            <div class="text-truncate">
                                <div class="fw-bold text-truncate" style="font-size:11.5px;" title="${displayName}">${displayName}</div>
                                <span class="badge ${badgeCls}" style="font-size:9px;">${meta.badge}</span>
                                <span class="badge bg-success" style="font-size:9px;">${vTag}</span>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center border-top pt-1" style="font-size:10px;">
                            <span class="text-muted">⭐ ${s.rating || meta.rating} • ${s.product_count || 32} SP</span>
                            <span class="text-nvidia fw-bold">Vào Shop ➔</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }).join('');
}

function syncUrlParamsToFilters() {
    const params = new URLSearchParams(window.location.search);
    const ordRedirect = params.get('ord');
    if (ordRedirect) {
        window.location.href = `/services/seller/order-detail.html?id=${encodeURIComponent(ordRedirect)}`;
        return;
    }
    const prodRedirect = params.get('p');
    if (prodRedirect) {
        window.location.href = `/services/product/product-detail.html?id=${encodeURIComponent(prodRedirect)}`;
        return;
    }

    const cat = params.get('cat') || params.get('category') || '';
    const q = params.get('q') || '';
    const shopTier = params.get('shop_tier') || '';
    const sortBy = params.get('sort_by') || '';

    const catEl = document.getElementById('homeFilterCategory');
    if (catEl && cat) catEl.value = cat;
    const tierEl = document.getElementById('homeFilterShopTier');
    if (tierEl && shopTier) tierEl.value = shopTier;
    const sortEl = document.getElementById('homeFilterSortBy');
    if (sortEl && sortBy) sortEl.value = sortBy;

    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput && q) searchInput.value = q;
    const localSearch = document.getElementById('searchInput');
    if (localSearch && q) localSearch.value = q;
}

function resetHomeAllFilters() {
    const catEl = document.getElementById('homeFilterCategory');
    if (catEl) catEl.value = '';
    const tierEl = document.getElementById('homeFilterShopTier');
    if (tierEl) tierEl.value = '';
    const sortEl = document.getElementById('homeFilterSortBy');
    if (sortEl) sortEl.value = 'popular';
    const flashEl = document.getElementById('homeFilterFlashSale');
    if (flashEl) flashEl.checked = false;
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) searchInput.value = '';
    const localSearch = document.getElementById('searchInput');
    if (localSearch) localSearch.value = '';
    window.history.replaceState({}, '', '/services/home/index.html');
    loadProducts();
}
window.resetHomeAllFilters = resetHomeAllFilters;

async function loadProducts() {
    const listEl = document.getElementById('productList');
    if (!listEl) return;

    const params = new URLSearchParams(window.location.search);
    const searchInput = document.getElementById('globalSearchInput');
    const localSearch = document.getElementById('searchInput');
    const q = (localSearch && localSearch.value.trim())
        ? localSearch.value.trim()
        : ((searchInput && searchInput.value.trim()) ? searchInput.value.trim() : (params.get('q') || ''));
    if (searchInput && q && !searchInput.value) searchInput.value = q;
    if (localSearch && q && !localSearch.value) localSearch.value = q;
    const cat = document.getElementById('homeFilterCategory')?.value || '';
    const tier = document.getElementById('homeFilterShopTier')?.value || '';
    const sortBy = document.getElementById('homeFilterSortBy')?.value || 'popular';
    const flashOnly = document.getElementById('homeFilterFlashSale')?.checked ? '1' : '';

    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user && user.id ? user.id : 13;
    const viewed = typeof getViewedProductIds === 'function' ? getViewedProductIds().join(',') : '';

    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (cat) qs.set('category', cat);
    if (tier) qs.set('shop_tier', tier);
    if (sortBy) qs.set('sort_by', sortBy);
    if (flashOnly) qs.set('flash_sale', '1');
    qs.set('user_id', String(uid));
    if (viewed) qs.set('viewed_ids', viewed);

    try {
        const res = await fetch(`/api/home/products?${qs.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const products = data.products || [];
        __homeAllProductsCache = products;

        if (Array.isArray(data.stores) && data.stores.length && !__homeFeaturedStoresCache.length) {
            __homeFeaturedStoresCache = data.stores;
            renderFeaturedStoresStrip();
        }

        const totalBadge = document.getElementById('homeTotalProductsBadge');
        if (totalBadge) totalBadge.textContent = `${products.length} sản phẩm`;

        const reasonEl = document.getElementById('recommendationReasonText');
        if (reasonEl && data.recommendation_reason) {
            reasonEl.textContent = data.recommendation_reason;
        }

        if (!products.length) {
            listEl.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="fs-2 mb-2">🔍</div>
                    <h6 class="fw-bold">Không tìm thấy sản phẩm nào khớp bộ lọc</h6>
                    <button type="button" class="btn btn-nvidia btn-sm mt-2 fw-bold" onclick="resetHomeAllFilters()">🔄 Xem Toàn Bộ Sản Phẩm</button>
                </div>
            `;
            return;
        }

        listEl.innerHTML = products.map(p => buildProductCardHtml(p)).join('');
        if (typeof window.applyProductGridDensity === 'function') {
            window.applyProductGridDensity(localStorage.getItem('nvx_grid_density') || '4');
        }
        if (typeof window.syncActiveIconSetAcrossWebsite === 'function') {
            window.syncActiveIconSetAcrossWebsite();
        }
    } catch (e) {}
}
window.loadProducts = loadProducts;

function triggerAiCatCatchVisibleProduct(preferredKeyword = '') {
    if (typeof window.executeGlobalCatSearchBarHunt === 'function') {
        window.executeGlobalCatSearchBarHunt(preferredKeyword || 'RTX 4070');
    }
}
window.triggerAiCatCatchVisibleProduct = triggerAiCatCatchVisibleProduct;

document.addEventListener('DOMContentLoaded', () => {
    syncUrlParamsToFilters();
    if (typeof window.applyProductGridDensity === 'function') {
        window.applyProductGridDensity(localStorage.getItem('nvx_grid_density') || '4');
    }
    loadHomeActiveEventBanner();
    renderFeaturedStoresStrip();
    loadHomeVouchersStrip();
    loadProducts();
});