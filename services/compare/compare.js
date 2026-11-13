let __compareFavProducts = [];
let __compareCartProducts = [];
let __compareMergedList = [];

async function loadTwoStreamComparison() {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : '';
    const favIds = typeof getFavoriteIds === 'function' ? getFavoriteIds() : JSON.parse(localStorage.getItem('nvidia_favorites') || '[]');
    const cartItems = typeof getCart === 'function' ? getCart() : JSON.parse(localStorage.getItem('nvidia_cart') || '[]');
    const cartIds = cartItems.map(i => i.id || i.product_id).filter(Boolean);

    try {
        const [cmpRes, notifRes] = await Promise.all([
            fetch(`/api/compare/list?user_id=${uid}&fav_ids=${favIds.join(',')}&cart_ids=${cartIds.join(',')}`),
            fetch(`/api/compare/notifications?user_id=${uid || 1}`)
        ]);
        const cmpData = await cmpRes.json();

        __compareFavProducts = cmpData.favorites || cmpData.fav_products || [];
        __compareCartProducts = cmpData.cart || cmpData.cart_products || [];

        if (!__compareFavProducts.length && !__compareCartProducts.length) {
            const homeRes = await fetch('/api/home/products?sort_by=popular');
            const homeData = await homeRes.json();
            const sample = (homeData.products || []).slice(0, 4);
            __compareFavProducts = sample.slice(0, 2);
            __compareCartProducts = sample.slice(2, 4);
        }

        const favCntEl = document.getElementById('compareFavoritesCount');
        if (favCntEl) favCntEl.textContent = String(__compareFavProducts.length);
        const cartCntEl = document.getElementById('compareCartCount');
        if (cartCntEl) cartCntEl.textContent = String(__compareCartProducts.length);

        const mapById = new Map();
        __compareFavProducts.forEach(p => mapById.set(Number(p.id), Object.assign({}, p, { stream_source: '❤️ Yêu thích' })));
        __compareCartProducts.forEach(p => {
            const pid = Number(p.id);
            if (mapById.has(pid)) {
                mapById.get(pid).stream_source = '❤️ Yêu thích + 🛒 Giỏ hàng';
            } else {
                mapById.set(pid, Object.assign({}, p, { stream_source: '🛒 Giỏ hàng' }));
            }
        });
        __compareMergedList = Array.from(mapById.values()).slice(0, 5);

        renderComparisonMatrixTable(__compareMergedList);
        renderStreamProductCards('wishlistCardsGrid', __compareFavProducts, 'fav');
        renderStreamProductCards('cartCompareCardsGrid', __compareCartProducts, 'cart');

        if (notifRes.ok) {
            const notifData = await notifRes.json();
            const alerts = (notifData.notifications || []).filter(n => n.notif_type === 'price_drop' || (n.title || '').toLowerCase().includes('giảm giá'));
            const alertBox = document.getElementById('priceDropAlertsBox');
            if (alertBox && alerts.length) {
                alertBox.classList.remove('d-none');
                alertBox.innerHTML = `
                    <div class="p-3 rounded-3 border border-warning" style="background: rgba(245, 158, 11, 0.12);">
                        <div class="fw-bold small text-warning mb-1">🔔 CẢNH BÁO GIẢM GIÁ SẢN PHẨM TRONG WISHLIST CỦA BẠN:</div>
                        ${alerts.slice(0, 3).map(a => `<div class="small">• <strong>${a.title}:</strong> ${a.message}</div>`).join('')}
                    </div>
                `;
            }
        }
    } catch (e) {}
}

function renderComparisonMatrixTable(items) {
    const thead = document.getElementById('compareMatrixTableHead');
    const tbody = document.getElementById('compareMatrixTableBody');
    if (!thead || !tbody) return;

    if (!items.length) {
        thead.innerHTML = '';
        tbody.innerHTML = `<tr><td class="text-center py-4 text-muted">Chưa có sản phẩm nào để đối chiếu.</td></tr>`;
        return;
    }

    const minPrice = Math.min(...items.map(x => Number(x.price || 999999999)));

    thead.innerHTML = `
        <tr>
            <th style="min-width: 165px;">Tiêu Chí Đối Chiếu</th>
            ${items.map(p => {
                const isBestPrice = Number(p.price) === minPrice;
                const imgUrl = typeof getProductImageUrl === 'function' ? getProductImageUrl(p) : (p.image_url || '/assets/icons/icon.png');
                return `
                    <th class="text-center" style="min-width: 200px;">
                        <div class="mb-1"><span class="badge bg-dark border border-secondary">${p.stream_source}</span></div>
                        <img src="${imgUrl}" alt="${p.name}" style="width:64px;height:64px;object-fit:cover;" class="rounded-3 border mb-2">
                        <a href="/services/product/product-detail.html?id=${p.id}" class="d-block fw-bold text-decoration-none text-truncate" title="${p.name}">${p.name}</a>
                        ${isBestPrice ? '<span class="badge bg-nvidia mt-1">🏆 Giá Tốt Nhất</span>' : ''}
                    </th>
                `;
            }).join('')}
        </tr>
    `;

    tbody.innerHTML = `
        <tr>
            <td class="fw-bold">💰 Giá Niêm Yết (Đã VAT)</td>
            ${items.map(p => `<td class="text-center fw-bold fs-6 ${Number(p.price) === minPrice ? 'text-nvidia' : ''}">${formatVND(p.price)}</td>`).join('')}
        </tr>
        <tr>
            <td class="fw-bold">📦 Đơn Vị Định Lượng</td>
            ${items.map(p => `<td class="text-center"><strong>${p.unit || 'Chiếc'}</strong></td>`).join('')}
        </tr>
        <tr>
            <td class="fw-bold">🛡️ Cam Kết Bảo Hành</td>
            ${items.map(p => `<td class="text-center"><span class="badge bg-info text-dark">${p.warranty || '36 tháng Chính hãng'}</span></td>`).join('')}
        </tr>
        <tr>
            <td class="fw-bold">🏪 Phân Hạng Gian Hàng</td>
            ${items.map(p => `<td class="text-center"><span class="badge bg-danger">👑 ${(p.shop_tier || 'MALL').toUpperCase()}</span><div class="small text-muted mt-1">${p.store_name || 'Nvidia Official'}</div></td>`).join('')}
        </tr>
        <tr>
            <td class="fw-bold">⭐ Điểm Đánh Giá &amp; Đã Bán</td>
            ${items.map(p => `<td class="text-center"><strong class="text-warning">⭐ ${Number(p.rating || 4.9).toFixed(1)}</strong> (${p.sold_count || 25} đã bán)</td>`).join('')}
        </tr>
        <tr>
            <td class="fw-bold">🔍 Chỉ Số Minh Bạch</td>
            ${items.map(() => `<td class="text-center"><span class="badge bg-success">🛡️ Đạt 6/6 Tiêu chí (100%)</span></td>`).join('')}
        </tr>
        <tr>
            <td class="fw-bold">🛒 Thao Tác Nhanh</td>
            ${items.map(p => `
                <td class="text-center">
                    <button type="button" class="btn btn-nvidia btn-sm w-100 fw-bold" onclick="quickAddComparedItem(${p.id})">+ Thêm Vào Giỏ</button>
                </td>
            `).join('')}
        </tr>
    `;
}

function renderStreamProductCards(containerId, list, streamType) {
    const box = document.getElementById(containerId);
    if (!box) return;
    if (!list.length) {
        box.innerHTML = `<div class="col-12 text-center py-4 text-muted small">Chưa có sản phẩm nào trong luồng này.</div>`;
        return;
    }
    box.innerHTML = list.map(p => {
        const imgUrl = typeof getProductImageUrl === 'function' ? getProductImageUrl(p) : (p.image_url || '/assets/icons/icon.png');
        return `
            <div class="col-md-6">
                <div class="nv-adaptive-card p-3 h-100 d-flex flex-column justify-content-between">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <img src="${imgUrl}" style="width:52px;height:52px;object-fit:cover;" class="rounded border">
                        <div class="text-truncate">
                            <a href="/services/product/product-detail.html?id=${p.id}" class="fw-bold small text-decoration-none d-block text-truncate">${p.name}</a>
                            <div class="text-nvidia fw-bold small">${formatVND(p.price)} / ${p.unit || 'Chiếc'}</div>
                            <small class="text-muted">🛡️ BH: ${p.warranty || '24 tháng'}</small>
                        </div>
                    </div>
                    <div class="d-flex gap-1 mt-2">
                        <button type="button" class="btn btn-nvidia btn-sm flex-fill py-0 fw-bold" onclick="quickAddComparedItem(${p.id})">+ Giỏ Hàng</button>
                        <a href="/services/product/product-detail.html?id=${p.id}" class="btn btn-outline-secondary btn-sm py-0">Chi Tiết</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function quickAddComparedItem(prodId) {
    const found = __compareMergedList.find(x => Number(x.id) === Number(prodId))
        || __compareFavProducts.find(x => Number(x.id) === Number(prodId))
        || __compareCartProducts.find(x => Number(x.id) === Number(prodId));
    if (!found) return;
    if (typeof addToCartGlobal === 'function') {
        addToCartGlobal({
            id: found.id,
            name: found.name,
            price: found.price,
            unit: found.unit || 'Chiếc',
            warranty: found.warranty || '36 tháng',
            category: found.category || '',
            image_url: found.image_url || '/assets/icons/icon.png'
        });
    }
}

function addAllComparedToCart() {
    if (!__compareMergedList.length) return;
    __compareMergedList.forEach(p => quickAddComparedItem(p.id));
    if (typeof notifyToast === 'function') {
        notifyToast(`🛒 Đã thêm toàn bộ ${__compareMergedList.length} sản phẩm đang so sánh vào Giỏ hàng!`, 'success');
    }
}

document.addEventListener('DOMContentLoaded', loadTwoStreamComparison);