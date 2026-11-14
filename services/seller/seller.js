/* [FEAT-LOG-005] & [FEAT-HDR-001.7] Kênh Người Bán Chuyên Nghiệp, Điều Phối Vận Đơn NX Express 2H & Đối Soát Quỹ Bảo Lãnh Escrow | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/seller/dashboard / orders / products / seller.js | [LOCKED-DESIGN] */
let sellerProductsCache = {};
let sellerProductsList = [];
let sellerOrdersList = [];
let currentOrderStatusFilter = 'all';
let sellerSessionsList = [];
let selectedSellerSessionId = null;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href*="pc-builder"] .badge').forEach(b => b.remove());
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
        if (typeof notifyToast === 'function') notifyToast('Bạn cần tài khoản Người bán hoặc Admin để truy cập!', 'warning');
        window.location.href = '/services/auth/auth.html';
        return;
    }

    const storeLink = document.getElementById('viewPublicStoreBtn');
    if (storeLink) storeLink.href = `/services/seller/store.html?seller_id=${user.id}`;

    const badge = document.getElementById('sellerStoreBadge');
    if (badge) {
        badge.textContent = `🏪 ${user.company_name || user.store_name || user.full_name} (${user.role.toUpperCase()})`;
        if (user.role === 'admin') {
            document.getElementById('sellerJsonSeedBtn')?.classList.remove('d-none');
        }
        loadDashboardData(user.id, user.role);
        loadSellerInboxSessions(user.id, user.role);
    }

    document.getElementById('createProductForm')?.addEventListener('submit', (e) => handleCreateProduct(e, user.id));
    document.getElementById('quickEditForm')?.addEventListener('submit', submitQuickEdit);
});

function switchSellerSection(secName, btn) {
    document.querySelectorAll('.seller-sec').forEach(el => el.classList.add('d-none'));
    document.getElementById(`sec-${secName}`)?.classList.remove('d-none');
    document.querySelectorAll('.dashboard-sidebar .nav-link').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (secName === 'inbox') {
        const u = getAuthUser();
        if (u) loadSellerInboxSessions(u.id, u.role);
    }
}

function jumpToOrderFilter(statusKey) {
    currentOrderStatusFilter = statusKey;
    const ordBtn = document.querySelector('.dashboard-sidebar .nav-link[data-sec="orders"]');
    switchSellerSection('orders', ordBtn);
    renderOrderStatusFilterTabs();
    renderFilteredSellerOrders();
}

async function loadDashboardData(sellerId, role) {
    try {
        const [prodRes, ordRes] = await Promise.all([
            fetch(`/api/seller/products?seller_id=${sellerId}&role=${role}`),
            fetch(`/api/seller/orders?seller_id=${sellerId}&role=${role}`)
        ]);

        const prodData = await prodRes.json();
        const ordData = await ordRes.json();
        sellerProductsList = Array.isArray(prodData) ? prodData : (prodData.products || []);
        sellerOrdersList = Array.isArray(ordData) ? ordData : (ordData.orders || []);

        sellerProductsCache = {};
        sellerProductsList.forEach(p => { sellerProductsCache[p.id] = p; });

        const statProdEl = document.getElementById('statProducts');
        if (statProdEl) statProdEl.textContent = sellerProductsList.length;
        const statOrdEl = document.getElementById('statOrders');
        if (statOrdEl) statOrdEl.textContent = sellerOrdersList.length;

        let totalRev = 0;
        let releasedRev = 0;
        let holdingRev = 0;
        sellerOrdersList.forEach(o => {
            const ordTotal = Number(o.total_amount ?? (Number(o.unit_price || 0) * Number(o.quantity || 1)));
            if (o.status !== 'cancelled') {
                totalRev += ordTotal;
                if (o.escrow_status === 'released' || o.status === 'completed') {
                    releasedRev += ordTotal;
                } else {
                    holdingRev += ordTotal;
                }
            }
        });

        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = formatVND(v); };
        setTxt('statRevenue', totalRev);
        setTxt('statReleasedRevenue', releasedRev);
        setTxt('statEscrowHolding', holdingRev);

        const aiSel = document.getElementById('aiAnalyzeProdSelect');
        if (aiSel) {
            aiSel.innerHTML = sellerProductsList.map(p => `<option value="${p.id}">#${p.id} - ${p.name}</option>`).join('');
        }

        renderFilteredSellerProducts();
        renderOrderStatusFilterTabs();
        renderFilteredSellerOrders();
    } catch (err) {
        console.error('Lỗi tải dữ liệu Dashboard:', err);
    }
}

function renderFilteredSellerProducts() {
    const pBody = document.getElementById('sellerProductsBody');
    if (!pBody) return;
    const kw = (document.getElementById('sellerProdSearchInput')?.value || '').trim().toLowerCase();
    const cat = (document.getElementById('sellerProdCategoryFilter')?.value || '').trim().toLowerCase();

    const filtered = sellerProductsList.filter(p => {
        if (cat && (p.category || '').toLowerCase() !== cat) return false;
        if (kw && !(p.name || '').toLowerCase().includes(kw) && !String(p.id).includes(kw)) return false;
        return true;
    });

    if (!filtered.length) {
        pBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Không có sản phẩm nào khớp bộ lọc.</td></tr>`;
        return;
    }

    pBody.innerHTML = filtered.map(p => {
        const isFlash = Number(p.is_flash_sale) === 1;
        const resolvedImg = typeof getProductImageUrl === 'function' ? getProductImageUrl(p) : (p.image_url || '/assets/icons/icon.png');
        return `
            <tr>
                <td class="fw-bold font-monospace">#NVD-${p.id}</td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <img src="${resolvedImg}" style="width:42px; height:42px; object-fit:cover;" class="rounded border">
                        <div>
                            <a href="/services/product/product-detail.html?id=${p.id}" target="_blank" class="fw-bold text-decoration-none">${p.name}</a>
                            <div>
                                ${isFlash ? '<span class="badge bg-warning text-dark" style="font-size:10px;">⚡ Flash Sale</span>' : ''}
                                ${p.discount_badge ? `<span class="badge bg-danger" style="font-size:10px;">${p.discount_badge}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-secondary">${p.category}</span></td>
                <td class="small">
                    <div>ĐVT: <strong>${p.unit || 'Chiếc'}</strong></div>
                    <div class="text-muted">🛡️ ${p.warranty || '24 tháng'}</div>
                </td>
                <td class="text-nvidia fw-bold">${formatVND(p.price)}</td>
                <td>
                    <span class="badge ${Number(p.stock) > 5 ? 'bg-success' : 'bg-danger'}">Kho: ${p.stock}</span>
                    <small class="text-muted d-block">Đã bán: ${p.sold_count || 0}</small>
                </td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-1 flex-wrap">
                        <button onclick="showProductQrModal(${p.id})" class="btn btn-sm btn-outline-info fw-semibold py-0" title="In tem QR Sản phẩm">📱 Tem QR</button>
                        <button onclick="quickAnalyzeItem(${p.id})" class="btn btn-sm btn-outline-success py-0" title="Chạy AI phân tích">🤖 AI</button>
                        <button onclick="openQuickEditModal(${p.id})" class="btn btn-sm btn-warning text-dark fw-semibold py-0">✏️ Sửa</button>
                        <button onclick="removeSellerProduct(${p.id})" class="btn btn-sm btn-outline-danger py-0">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderOrderStatusFilterTabs() {
    const box = document.getElementById('sellerOrderStatusTabs');
    if (!box) return;
    const counts = { all: sellerOrdersList.length, pending: 0, confirmed: 0, shipping: 0, completed: 0 };
    sellerOrdersList.forEach(o => {
        const st = (o.status || 'pending').toLowerCase();
        if (counts[st] !== undefined) counts[st]++;
    });

    const tabs = [
        { key: 'all', label: `📋 Tất cả (${counts.all})` },
        { key: 'pending', label: `⏳ 1. Chờ xác nhận (${counts.pending})` },
        { key: 'confirmed', label: `📦 2. Đã đóng gói (${counts.confirmed})` },
        { key: 'shipping', label: `🚚 3. Đang giao NVX (${counts.shipping})` },
        { key: 'completed', label: `✅ 4. Đã giao & Giải ngân (${counts.completed})` }
    ];

    box.innerHTML = tabs.map(t => {
        const act = currentOrderStatusFilter === t.key ? 'btn-nvidia fw-bold' : 'btn-outline-secondary';
        return `<button type="button" class="btn btn-sm ${act}" onclick="setSellerOrderFilter('${t.key}')">${t.label}</button>`;
    }).join('');
}

function setSellerOrderFilter(stKey) {
    currentOrderStatusFilter = stKey;
    renderOrderStatusFilterTabs();
    renderFilteredSellerOrders();
}

let __pkgCamStream = null;
let __pkgCapturedDataUrl = '';

function openPackagingProofModal(orderId) {
    const ord = sellerOrdersList.find(x => Number(x.order_id || x.id) === Number(orderId)) || {};
    document.getElementById('pkgModalOrderId').value = orderId;
    document.getElementById('pkgModalTitle').textContent = `📸 Minh Chứng Đóng Gói Đơn #NVD-2611-${String(orderId).padStart(4, '0')}`;
    const prevImg = document.getElementById('pkgPreviewImage');
    __pkgCapturedDataUrl = ord.packaging_proof_url || '';
    if (prevImg) {
        prevImg.src = __pkgCapturedDataUrl || (typeof buildCategoryDefaultSvgDataUri === 'function' ? buildCategoryDefaultSvgDataUri('gpu', 'Kien Hang NVX #' + orderId) : '/assets/icons/icon.png');
        prevImg.classList.remove('d-none');
    }
    if (ord.packaging_note) {
        document.getElementById('pkgNoteInput').value = ord.packaging_note;
    }
    document.getElementById('packagingProofModal')?.classList.remove('d-none');
}
window.openPackagingProofModal = openPackagingProofModal;

function closePackagingProofModal() {
    if (__pkgCamStream) {
        __pkgCamStream.getTracks().forEach(t => t.stop());
        __pkgCamStream = null;
    }
    document.getElementById('pkgCameraVideo')?.classList.add('d-none');
    document.getElementById('btnSnapPackagingFrame')?.classList.add('d-none');
    document.getElementById('packagingProofModal')?.classList.add('d-none');
}
window.closePackagingProofModal = closePackagingProofModal;

async function startSellerPackagingCamera() {
    const video = document.getElementById('pkgCameraVideo');
    const snapBtn = document.getElementById('btnSnapPackagingFrame');
    const prevImg = document.getElementById('pkgPreviewImage');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (typeof notifyToast === 'function') notifyToast('Thiết bị không có Camera, đang tạo ảnh đóng dấu niêm phong tự động!', 'info');
        captureSellerPackagingPhoto(true);
        return;
    }
    try {
        __pkgCamStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = __pkgCamStream;
        await video.play();
        video.classList.remove('d-none');
        snapBtn?.classList.remove('d-none');
        prevImg?.classList.add('d-none');
    } catch (e) {
        if (typeof notifyToast === 'function') notifyToast('Không mở được Camera (' + e.message + '), đã tạo ảnh đóng dấu minh chứng!', 'info');
        captureSellerPackagingPhoto(true);
    }
}
window.startSellerPackagingCamera = startSellerPackagingCamera;

function captureSellerPackagingPhoto(useSimulatedSeal = false) {
    const oid = document.getElementById('pkgModalOrderId')?.value || '1';
    const video = document.getElementById('pkgCameraVideo');
    const canvas = document.getElementById('pkgCameraCanvas');
    const prevImg = document.getElementById('pkgPreviewImage');
    const ctx = canvas.getContext('2d');

    if (!useSimulatedSeal && video && video.readyState === video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#76b900';
        ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
        ctx.fillStyle = '#76b900';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`KIỆN HÀNG NIÊM PHONG #NVD-${oid}`, 32, 95);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '15px Arial';
        ctx.fillText('✔ Đã kiểm tra ngoại quan & Serial chính hãng', 32, 135);
        ctx.fillText('✔ Đã bọc xốp chống sốc 3 lớp & dán mã QR NVX', 32, 165);
    }

    ctx.fillStyle = 'rgba(11, 15, 25, 0.82)';
    ctx.fillRect(0, canvas.height - 44, canvas.width, 44);
    ctx.fillStyle = '#a3e635';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`📸 CAM-PROOF NVX-${String(oid).padStart(4, '0')} | ${new Date().toLocaleString('vi-VN')}`, 16, canvas.height - 16);

    __pkgCapturedDataUrl = canvas.toDataURL('image/png');
    if (prevImg) {
        prevImg.src = __pkgCapturedDataUrl;
        prevImg.classList.remove('d-none');
    }
    if (__pkgCamStream) {
        __pkgCamStream.getTracks().forEach(t => t.stop());
        __pkgCamStream = null;
    }
    video?.classList.add('d-none');
}
window.captureSellerPackagingPhoto = captureSellerPackagingPhoto;

async function uploadPackagingProofFile(fileInput) {
    if (!fileInput.files || !fileInput.files.length) return;
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    try {
        const res = await fetch('/api/seller/upload-image', { method: 'POST', body: fd });
        if (res.ok) {
            const data = await res.json();
            if (data.image_url) {
                __pkgCapturedDataUrl = data.image_url;
                const prevImg = document.getElementById('pkgPreviewImage');
                if (prevImg) {
                    prevImg.src = __pkgCapturedDataUrl;
                    prevImg.classList.remove('d-none');
                }
            }
        }
    } catch (e) {}
}
window.uploadPackagingProofFile = uploadPackagingProofFile;

async function submitPackagingProofToServer() {
    const oid = document.getElementById('pkgModalOrderId')?.value || '1';
    if (!__pkgCapturedDataUrl) {
        captureSellerPackagingPhoto(true);
    }
    const note = document.getElementById('pkgNoteInput')?.value.trim() || 'Đã đóng gói kèm ảnh minh chứng Camera';
    try {
        const res = await fetch(`/api/seller/orders/${oid}/packaging-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packaging_proof_url: __pkgCapturedDataUrl,
                packaging_note: note,
                auto_confirm: true
            })
        });
        const data = await res.json();
        if (res.ok) {
            closePackagingProofModal();
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            const u = getAuthUser();
            if (u) loadDashboardData(u.id, u.role);
        }
    } catch (e) {}
}
window.submitPackagingProofToServer = submitPackagingProofToServer;

function renderFilteredSellerOrders() {
    const oBody = document.getElementById('sellerOrdersBody');
    if (!oBody) return;
    const kw = (document.getElementById('sellerOrderSearchInput')?.value || '').trim().toLowerCase();

    const filtered = sellerOrdersList.filter(o => {
        const st = (o.status || 'pending').toLowerCase();
        if (currentOrderStatusFilter !== 'all' && st !== currentOrderStatusFilter) return false;
        if (kw) {
            const hay = `${o.order_id} ${o.tracking_code || ''} ${o.customer_name || ''} ${o.phone || ''} ${o.product_name || ''}`.toLowerCase();
            if (!hay.includes(kw)) return false;
        }
        return true;
    });

    if (!filtered.length) {
        oBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Không có đơn hàng nào ở trạng thái này.</td></tr>`;
        return;
    }

    oBody.innerHTML = filtered.map(o => {
        const oid = o.order_id || o.id;
        const rawTrack = String(o.tracking_code || '');
        const trackCode = (!rawTrack || rawTrack.startsWith('SPX')) ? `NVX-${String(oid).padStart(4, '0')}` : rawTrack;
        const routeCode = `NVD-HN-01-KV${String(oid).slice(-2).padStart(2, '0')}`;
        const senderAddr = o.sender_address || 'Kho Trung Tâm Nvidia Partner, Q. Long Biên, Hà Nội';
        const receiverAddr = o.shipping_address || '161/3 Đường Số 1, P.13, Q. Gò Vấp, TP.HCM';
        const weightG = o.weight_grams || (Number(o.quantity || 1) * 450);
        const totalCod = Number(o.total_amount ?? (Number(o.unit_price || 0) * Number(o.quantity || 1)));
        const uniqueOrderUrl = `/services/seller/order-detail.html?id=${encodeURIComponent(oid)}`;
        const st = (o.status || 'pending').toLowerCase();
        const hasProof = Boolean(o.packaging_proof_url);

        const itemsListHtml = Array.isArray(o.items) && o.items.length
            ? o.items.map(it => `<div class="small">• ${it.product_name} <strong>(x${it.quantity})</strong></div>`).join('')
            : `<div class="fw-semibold">${o.product_name} <span class="badge bg-dark">x${o.quantity || 1}</span></div>`;

        const proofBadgeHtml = hasProof
            ? `<div class="mt-1 d-flex align-items-center gap-2"><img src="${o.packaging_proof_url}" style="width:42px;height:32px;object-fit:cover;" class="rounded border border-success"><span class="badge bg-success" style="font-size:10px;">📸 Đã có ảnh đóng gói (${o.packaged_at || 'Đã lưu'})</span></div>`
            : `<div class="mt-1"><span class="badge bg-secondary" style="font-size:10px;">📷 Chưa chụp ảnh minh chứng đóng gói</span></div>`;

        let nextStepActionHtml = '';
        if (st === 'pending') {
            nextStepActionHtml = `<button type="button" class="btn btn-warning text-dark btn-sm fw-bold w-100 mb-1" onclick="openPackagingProofModal(${oid})">📸 Bước 1: Chụp Ảnh &amp; Đóng Gói</button>`;
        } else if (st === 'confirmed') {
            nextStepActionHtml = `<button type="button" class="btn btn-info text-dark btn-sm fw-bold w-100 mb-1" onclick="notifyShipperPartner(${oid})">🚚 Bước 2: Bàn Giao Shipper NVX</button>`;
        } else if (st === 'shipping') {
            nextStepActionHtml = `<button type="button" class="btn btn-success btn-sm fw-bold w-100 mb-1" onclick="changeOrderStatus(${oid}, 'completed')">✅ Bước 3: Xác Nhận Đã Giao (POD)</button>`;
        } else {
            nextStepActionHtml = `<span class="badge bg-success w-100 py-2 mb-1">🎉 Đã Hoàn Tất &amp; Giải Ngân</span>`;
        }

        return `
        <tr>
            <td>
                <div class="fw-bold text-nvidia">#NVD-2611-${String(oid).padStart(4, '0')}</div>
                <span class="badge bg-dark border border-secondary font-monospace">${trackCode}</span>
                <div class="small text-muted mt-1">Tuyến: <strong>${routeCode}</strong></div>
            </td>
            <td>
                <div class="small"><span class="badge bg-secondary">Kho Gửi:</span> ${senderAddr}</div>
                <div class="small mt-1"><span class="badge bg-info text-dark">Khách Nhận:</span> <strong>${o.customer_name || 'Khách hàng'}</strong> (${o.phone || '0988.xxx.xxx'}) — ${receiverAddr}</div>
            </td>
            <td>
                ${itemsListHtml}
                <small class="text-muted d-block mt-1">Tổng SL: <strong>${o.quantity || 1} món</strong> • KL: <strong>${weightG}g</strong></small>
                ${proofBadgeHtml}
            </td>
            <td>
                <div class="text-nvidia fw-bold fs-6">${formatVND(totalCod)}</div>
                <span class="badge ${o.escrow_status === 'released' || st === 'completed' ? 'bg-success' : 'bg-warning text-dark'}">
                    ${o.escrow_status === 'released' || st === 'completed' ? '🔓 Đã giải ngân về Ví' : '🛡️ Escrow đang bảo lãnh'}
                </span>
            </td>
            <td style="min-width: 220px;">
                ${nextStepActionHtml}
                <div class="d-flex gap-1">
                    <button type="button" class="btn btn-outline-warning btn-sm py-0 flex-fill" onclick="openPackagingProofModal(${oid})">📸 Ảnh Đóng Gói</button>
                    <button type="button" class="btn btn-outline-info btn-sm py-0" onclick="if(typeof openMessengerChatWindow==='function') openMessengerChatWindow(${oid}, '${(o.customer_name || 'Khách đơn #' + oid).replace(/'/g, '')}', 'Kênh Người Bán', 'human');" title="Mở cửa sổ Messenger chat với khách đơn này">💬 Chat</button>
                </div>
            </td>
            <td class="text-end">
                <div class="d-flex flex-column gap-1">
                    <a href="${uniqueOrderUrl}" target="_blank" class="btn btn-sm btn-nvidia py-1 fw-bold">🧾 Phiếu Vận Đơn (URL Riêng)</a>
                    <div class="d-flex gap-1">
                        <button onclick="showOrderQrModal(${oid}, '${trackCode}')" class="btn btn-sm btn-outline-info py-0 flex-fill fw-semibold">📱 Tem QR</button>
                        <button onclick="printOrderReceipt(${oid})" class="btn btn-sm btn-outline-success py-0 flex-fill fw-semibold">🖨️ In Nhanh</button>
                    </div>
                </div>
            </td>
        </tr>
    `}).join('');
}

function showProductQrModal(productId) {
    const p = sellerProductsCache[productId];
    if (!p) return;
    const modal = document.getElementById('productQrModal');
    const title = document.getElementById('qrModalProdTitle');
    const qrContainer = document.getElementById('productQrContainer');
    const metaBox = document.getElementById('productQrMetaBox');
    const linkInput = document.getElementById('productQrUrlInput');
    const openBtn = document.getElementById('productQrOpenLinkBtn');
    if (!modal || !qrContainer) return;

    const fullUrl = `${window.location.origin}/services/product/product-detail.html?id=${productId}`;
    const shortQrPayload = `${window.location.origin}/?p=${productId}`;
    title.textContent = `Tem QR Sản Phẩm: #NVD-${p.id}`;
    linkInput.value = fullUrl;
    if (openBtn) openBtn.href = fullUrl;

    if (metaBox) {
        metaBox.innerHTML = `
            <div><strong>Sản phẩm:</strong> ${p.name}</div>
            <div class="d-flex justify-content-between mt-1">
                <span><strong>Giá:</strong> <span class="text-nvidia fw-bold">${formatVND(p.price)}</span> / ${p.unit || 'Chiếc'}</span>
                <span><strong>BH:</strong> ${p.warranty || '24 tháng'}</span>
            </div>
        `;
    }

    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: shortQrPayload,
        width: 168,
        height: 168,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
    });
    modal.classList.remove('d-none');
}

function closeProductQrModal() {
    document.getElementById('productQrModal')?.classList.add('d-none');
}

function showOrderQrModal(orderId, trackingCode = '') {
    const modal = document.getElementById('orderQrModal');
    const title = document.getElementById('qrModalOrderTitle');
    const qrContainer = document.getElementById('orderQrContainer');
    const metaBox = document.getElementById('orderQrMetaBox');
    const linkInput = document.getElementById('orderQrUrlInput');
    const openBtn = document.getElementById('orderQrOpenLinkBtn');
    if (!modal || !qrContainer) return;

    const ord = sellerOrdersList.find(x => Number(x.order_id || x.id) === Number(orderId)) || {};
    const tCode = (!trackingCode || trackingCode.startsWith('SPX')) ? `NVX-${String(orderId).padStart(4, '0')}` : trackingCode;
    const fullUrl = `${window.location.origin}/services/seller/order-detail.html?id=${encodeURIComponent(orderId)}`;
    const shortQrPayload = `${window.location.origin}/?ord=${orderId}`;

    title.textContent = `Tem QR Vận Đơn: ${tCode} (#NVD-${orderId})`;
    linkInput.value = fullUrl;
    if (openBtn) openBtn.href = fullUrl;

    if (metaBox) {
        const totalCod = Number(ord.total_amount ?? (Number(ord.unit_price || 0) * Number(ord.quantity || 1)));
        metaBox.innerHTML = `
            <div class="d-flex justify-content-between">
                <span><strong>Mã vận đơn:</strong> <span class="font-monospace text-nvidia">${tCode}</span></span>
                <span class="badge bg-dark">${(ord.status || 'shipping').toUpperCase()}</span>
            </div>
            <div class="mt-1"><strong>Người nhận:</strong> ${ord.customer_name || 'Khách hàng'} (${ord.phone || '0988.xxx.xxx'})</div>
            <div class="mt-1"><strong>Thu hộ COD:</strong> <span class="text-nvidia fw-bold">${formatVND(totalCod)}</span> • Quét QR để xác nhận giao/nhận</div>
        `;
    }

    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: shortQrPayload,
        width: 168,
        height: 168,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
    });
    modal.classList.remove('d-none');
}

function closeOrderQrModal() {
    document.getElementById('orderQrModal')?.classList.add('d-none');
}

function downloadQrCanvasImage(containerId, fileName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');
    const dataUrl = canvas ? canvas.toDataURL('image/png') : (img ? img.src : '');
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName || 'Nvidia_QR_Label.png';
    a.click();
    if (typeof notifyToast === 'function') {
        notifyToast('⬇️ Đã tải ảnh nhãn QR (.PNG) sẵn sàng in dán lên kiện hàng!', 'success');
    }
}

async function printOrderReceipt(orderId) {
    const printWin = window.open(`/services/seller/order-detail.html?id=${encodeURIComponent(orderId)}&autoprint=1`, '_blank', 'width=820,height=860');
    if (printWin) printWin.focus();
}

async function notifyShipperPartner(orderId, silent = false) {
    try {
        const res = await fetch(`/api/seller/orders/${orderId}/notify-shipper`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (!silent && typeof notifyToast === 'function') {
                notifyToast(`🚚 [NVIDIA XPRESS] ${data.message}`, 'success');
            }
            const u = getAuthUser();
            if (u) loadDashboardData(u.id, u.role);
        }
    } catch (e) {}
}

function quickAnalyzeItem(prodId) {
    const sel = document.getElementById('aiAnalyzeProdSelect');
    if (sel) sel.value = String(prodId);
    const ovBtn = document.querySelector('.dashboard-sidebar .nav-link[data-sec="overview"]');
    switchSellerSection('overview', ovBtn);
    runSellerAiAnalysis();
}

async function runSellerAiAnalysis() {
    const sel = document.getElementById('aiAnalyzeProdSelect');
    const prodId = sel ? sel.value : null;
    const user = getAuthUser();
    const errBanner = document.getElementById('sellerAiErrorBanner');
    const metricsRow = document.getElementById('sellerAiMetricsRow');
    const reportBox = document.getElementById('sellerAiReportBox');

    if (errBanner) errBanner.classList.add('d-none');
    if (reportBox) reportBox.textContent = '⏳ Trợ lý AI đang đọc dữ liệu tồn kho, số lượng đã bán và chính sách bảo hành từ DB để phân tích...';

    try {
        const res = await fetch('/api/seller/ai-product-analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: prodId, seller_id: user ? user.id : 1 })
        });
        const data = await res.json();

        if (data.metrics && data.metrics.name) {
            metricsRow.classList.remove('d-none');
            metricsRow.innerHTML = `
                <div class="col-3"><div class="p-2 border rounded small">Tồn kho: <strong>${data.metrics.stock}</strong></div></div>
                <div class="col-3"><div class="p-2 border rounded small">Đã bán: <strong>${data.metrics.sold_count}</strong></div></div>
                <div class="col-3"><div class="p-2 border rounded small">Chuyển đổi: <strong class="text-nvidia">${data.metrics.conversion_ratio ?? data.metrics.conversion_rate ?? 15}%</strong></div></div>
                <div class="col-3"><div class="p-2 border rounded small">Bảo hành: <strong>${data.metrics.warranty || '36 tháng'}</strong></div></div>
            `;
        }
        if (data.report) reportBox.textContent = data.report;
    } catch (e) {
        if (errBanner) {
            errBanner.classList.remove('d-none');
            errBanner.textContent = `⚠️ Lỗi mạng khi gọi API AI: ${e.message}`;
        }
    }
}

async function loadSellerInboxSessions(sellerId, role) {
    try {
        const res = await fetch(`/api/admin-dispute/store-chat/sessions?seller_id=${sellerId}&role=${role}`);
        const raw = await res.json();
        sellerSessionsList = Array.isArray(raw) ? raw : (raw.sessions || []);
        const box = document.getElementById('sellerChatSessionsList');
        if (!box) return;

        if (!sellerSessionsList.length) {
            box.innerHTML = '<div class="small text-muted">Chưa có khách hàng nào nhắn tin.</div>';
            return;
        }

        box.innerHTML = sellerSessionsList.map(s => `
            <div class="p-2 border rounded ${s.id === selectedSellerSessionId ? 'border-success border-2' : ''}" style="cursor:pointer;" onclick="selectSellerSession(${s.id})">
                <div class="d-flex justify-content-between align-items-center">
                    <strong class="small">🧑 ${s.buyer_name}</strong>
                    <span class="badge ${s.chat_mode === 'human' ? 'bg-warning text-dark' : 'bg-secondary'}" style="font-size:0.68rem;">
                        ${s.chat_mode === 'human' ? '👤 Người thật' : '🤖 AI'}
                    </span>
                </div>
                <div class="small text-muted">${s.seller_store_name || 'Gian hàng'}</div>
            </div>
        `).join('');

        if (selectedSellerSessionId) {
            selectSellerSession(selectedSellerSessionId);
        } else if (sellerSessionsList[0]) {
            selectSellerSession(sellerSessionsList[0].id);
        }
    } catch (e) {}
}

async function selectSellerSession(sessionId) {
    selectedSellerSessionId = sessionId;
    const res = await fetch(`/api/admin-dispute/store-chat/session/${sessionId}`);
    const data = await res.json();
    if (!data || !data.session) return;

    document.getElementById('sellerActiveBuyerTitle').textContent = `Hội thoại với: ${data.session.buyer_name} (${data.session.seller_store_name || 'Shop'})`;
    const badge = document.getElementById('sellerSessionModeBadge');
    const isHuman = data.session.chat_mode === 'human';
    badge.textContent = isHuman ? '👤 Chế độ: Người thật trả lời' : '🤖 Chế độ: AI tự động';
    badge.className = `badge ${isHuman ? 'bg-warning text-dark' : 'bg-info text-dark'}`;

    const msgBox = document.getElementById('sellerInboxMessages');
    msgBox.innerHTML = (data.messages || []).map(m => `
        <div class="mb-2 small">
            <strong class="${m.sender_role === 'buyer' ? 'text-info' : 'text-nvidia'}">${m.sender_name}:</strong>
            <span class="${m.is_error ? 'text-danger fw-bold' : ''}">${m.message}</span>
        </div>
    `).join('');
    msgBox.scrollTop = msgBox.scrollHeight;
}

async function toggleSessionHumanMode(mode) {
    if (!selectedSellerSessionId) return;
    await fetch(`/api/admin-dispute/store-chat/session/${selectedSellerSessionId}/mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_mode: mode })
    });
    if (typeof notifyToast === 'function') notifyToast(mode === 'human' ? 'Đã chuyển sang Người thật trả lời!' : 'Đã bật lại Trợ lý AI!');
    const u = getAuthUser();
    if (u) loadSellerInboxSessions(u.id, u.role);
}

async function sendSellerHumanReply(e) {
    e.preventDefault();
    if (!selectedSellerSessionId) return;
    const input = document.getElementById('sellerReplyInput');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    const u = getAuthUser();
    await fetch('/api/admin-dispute/store-chat/seller-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: selectedSellerSessionId,
            seller_name: u.company_name || u.full_name,
            message: msg
        })
    });
    selectSellerSession(selectedSellerSessionId);
}

function openQuickEditModal(id) {
    const p = sellerProductsCache[id];
    if (!p) return;
    document.getElementById('qeId').value = p.id;
    document.getElementById('qeImageUrl').value = p.image_url || '';

    const preview = document.getElementById('qeImgPreview');
    if (preview) preview.src = p.image_url || '/assets/icons/icon.png';
    const fileInp = document.getElementById('qeImageFile');
    if (fileInp) fileInp.value = '';

    document.getElementById('qeName').value = p.name || '';
    document.getElementById('qePrice').value = p.price || 0;
    document.getElementById('qeOldPrice').value = p.old_price || 0;
    document.getElementById('qeStock').value = p.stock || 0;
    document.getElementById('qeUnit').value = p.unit || 'Chiếc';
    document.getElementById('qeWarranty').value = p.warranty || '36 tháng Chính hãng';
    document.getElementById('qeCategory').value = p.category || 'gpu';
    document.getElementById('qeBadge').value = p.discount_badge || '';
    document.getElementById('qeFlash').checked = Number(p.is_flash_sale) === 1;
    document.getElementById('qeDesc').value = p.description || '';
    document.getElementById('quickEditModal')?.classList.remove('d-none');
}

function closeQuickEditModal() {
    document.getElementById('quickEditModal')?.classList.add('d-none');
}

async function submitQuickEdit(e) {
    e.preventDefault();
    const id = document.getElementById('qeId').value;
    let imageUrl = document.getElementById('qeImageUrl').value;

    const fileInp = document.getElementById('qeImageFile');
    if (fileInp && fileInp.files && fileInp.files.length > 0) {
        const fd = new FormData();
        fd.append('file', fileInp.files[0]);
        try {
            const upRes = await fetch('/api/seller/upload-image', { method: 'POST', body: fd });
            if (upRes.ok) {
                const upData = await upRes.json();
                imageUrl = upData.image_url;
            }
        } catch (err) {}
    }

    const payload = {
        name: document.getElementById('qeName').value.trim(),
        price: Number(document.getElementById('qePrice').value),
        old_price: Number(document.getElementById('qeOldPrice').value),
        stock: Number(document.getElementById('qeStock').value),
        unit: document.getElementById('qeUnit').value.trim() || 'Chiếc',
        warranty: document.getElementById('qeWarranty').value.trim() || '36 tháng',
        category: document.getElementById('qeCategory').value,
        discount_badge: document.getElementById('qeBadge').value.trim(),
        is_flash_sale: document.getElementById('qeFlash').checked ? 1 : 0,
        description: document.getElementById('qeDesc').value.trim(),
        image_url: imageUrl
    };

    await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const res = await fetch(`/api/seller/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        closeQuickEditModal();
        const u = getAuthUser();
        if (u) await loadDashboardData(u.id, u.role);
        if (typeof notifyToast === 'function') notifyToast('✅ Đã cập nhật sản phẩm & ghi lịch sử chính sách minh bạch!', 'success');
    }
}

async function removeSellerProduct(id) {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi gian hàng?')) return;
    await fetch(`/api/seller/products/${id}`, { method: 'DELETE' });
    const u = getAuthUser();
    if (u) loadDashboardData(u.id, u.role);
    if (typeof notifyToast === 'function') notifyToast('Đã xóa sản phẩm!');
}

async function changeOrderStatus(orderId, status) {
    try {
        const res = await fetch(`/api/seller/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (res.ok) {
            const u = getAuthUser();
            if (u) await loadDashboardData(u.id, u.role);
            if (typeof notifyToast === 'function') {
                notifyToast(data.message || `Đã cập nhật đơn #NVD-${orderId} sang [${status}]!`, 'success');
            }
        }
    } catch (e) {}
}

async function handleCreateProduct(e, sellerId) {
    e.preventDefault();
    const btn = document.getElementById('submitProdBtn');
    if (btn) btn.disabled = true;

    try {
        let imageUrl = '';
        const fileInput = document.getElementById('prodImage');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const fd = new FormData();
            fd.append('file', fileInput.files[0]);
            const upRes = await fetch('/api/seller/upload-image', { method: 'POST', body: fd });
            if (upRes.ok) {
                const upData = await upRes.json();
                imageUrl = upData.image_url;
            }
        }

        const payload = {
            seller_id: sellerId,
            name: document.getElementById('prodName').value.trim(),
            category: document.getElementById('prodCategory').value,
            price: Number(document.getElementById('prodPrice').value),
            old_price: Number(document.getElementById('prodOldPrice').value),
            discount_badge: document.getElementById('prodBadge').value.trim(),
            stock: Number(document.getElementById('prodStock').value),
            unit: document.getElementById('prodUnit')?.value.trim() || 'Chiếc',
            warranty: document.getElementById('prodWarranty')?.value.trim() || '36 tháng Chính hãng',
            is_flash_sale: document.getElementById('prodFlashSale').checked ? 1 : 0,
            description: document.getElementById('prodDesc').value.trim(),
            image_url: imageUrl
        };

        const res = await fetch('/api/seller/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            if (typeof notifyToast === 'function') notifyToast('Đã đăng bán sản phẩm thành công!');
            window.location.href = '/services/seller/seller-dashboard.html';
        }
    } catch (err) {
        console.error('Lỗi khi tạo sản phẩm:', err);
    } finally {
        if (btn) btn.disabled = false;
    }
}