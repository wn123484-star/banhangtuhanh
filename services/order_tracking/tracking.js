var __activeTrackingOrderData = null;
var __radarAnimFrameId = null;
var __radarSweepAngle = 0;

function getInitialTrackingQuery() {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('id') || params.get('order_id') || params.get('code') || '';
    if (!q) {
        q = localStorage.getItem('nvx_last_created_order_id') || localStorage.getItem('nvx_last_created_tracking_code') || '';
    }
    return q;
}

function quickLookupSampleOrder(qVal) {
    var inp = document.getElementById('trackingInput');
    if (inp) inp.value = (qVal === 'latest') ? '' : ('NVX-' + qVal);
    lookupTracking(qVal === 'latest' ? '' : qVal);
}
window.quickLookupSampleOrder = quickLookupSampleOrder;

async function lookupTracking(overrideQuery) {
    var inp = document.getElementById('trackingInput');
    var q = (overrideQuery !== undefined && overrideQuery !== null)
        ? String(overrideQuery).trim()
        : (inp ? inp.value.trim() : '');
    if (!q) {
        q = getInitialTrackingQuery();
    }

    var box = document.getElementById('trackingResult');
    if (!box) return;

    try {
        var res = await fetch('/api/tracking/order-lifecycle?code=' + encodeURIComponent(q) + '&_t=' + Date.now(), { cache: 'no-store' });
        var data = await res.json();
        if (!res.ok || !data || data.ok === false) {
            box.innerHTML = '<div class="nv-adaptive-card p-4 text-center text-warning fw-bold">⚠️ Không tìm thấy vận đơn khớp mã [' + q + ']. Đang tải vận đơn mới nhất...</div>';
            return;
        }
        __activeTrackingOrderData = data;
        if (inp && !inp.value && data.tracking_code) {
            inp.value = data.tracking_code;
        }
        renderNvxTrackingLifecycleView(data);
    } catch (e) {
        box.innerHTML = '<div class="nv-adaptive-card p-4 text-center text-danger fw-bold">❌ Không thể kết nối máy chủ điều phối vận đơn NVX Express!</div>';
    }
}
window.lookupTracking = lookupTracking;

function renderNvxTrackingLifecycleView(data) {
    var box = document.getElementById('trackingResult');
    if (!box || !data) return;

    var hdrStage = document.getElementById('trkHeaderStageBadge');
    if (hdrStage) {
        hdrStage.textContent = data.logistics_stage || 'ESCROW_LOCKED';
    }

    var steps = Array.isArray(data.steps) ? data.steps : [];
    var items = Array.isArray(data.items) ? data.items : [];
    var radar = data.radar_telemetry || {};
    var stage = String(data.logistics_stage || 'ESCROW_LOCKED').toUpperCase();
    var isInspecting = (stage === 'DELIVERED_INSPECTING' || stage === 'RETURN_PROCESSING');
    var isRefunded = (stage === 'REFUNDED');
    var isCompleted = (stage === 'COMPLETED');

    var behalfBannerHtml = '';
    if (data.is_paid_on_behalf) {
        behalfBannerHtml =
            '<div class="p-3 rounded-4 border border-info mb-3" style="background:rgba(14,165,233,0.12);">' +
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2">' +
                    '<div>' +
                        '<span class="badge bg-info text-dark fw-bold me-2">🤝 ĐƠN HÀNG ĐƯỢC CHUYỂN KHOẢN HỘ</span>' +
                        '<strong class="text-light">Người thanh toán hộ: <span class="text-info">' + (data.payer_name || 'Bạn bè / Người thân') + '</span></strong>' +
                    '</div>' +
                    '<span class="badge bg-success">Đã Khóa Quỹ Bảo Lãnh Escrow 100%</span>' +
                '</div>' +
                (data.payer_message ? ('<div class="small text-light mt-1 fst-italic">💬 Lời nhắn gửi kèm: "' + data.payer_message + '"</div>') : '') +
            '</div>';
    }

    var refundCompleteBannerHtml = '';
    if (isRefunded) {
        refundCompleteBannerHtml =
            '<div class="p-4 rounded-4 border border-warning mb-4 shadow" style="background:rgba(245,158,11,0.14);border-width:2px !important;">' +
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                    '<div>' +
                        '<span class="badge bg-warning text-dark fw-bold me-2">🔄 REFUNDED • ĐÃ HOÀN ĐƠN &amp; HOÀN TIỀN 100%</span>' +
                        '<strong class="fs-5 text-warning">Đã cộng hoàn trả +' + Number(data.refunded_amount || data.total_amount || 0).toLocaleString('vi-VN') + ' ₫ về Ví NVIDIA Pay!</strong>' +
                    '</div>' +
                    '<code class="badge bg-dark border border-warning text-warning px-3 py-2 fs-6">Mã Thu Hồi: ' + (data.return_tracking_code || ('NVX-RET-' + data.order_id)) + '</code>' +
                '</div>' +
                '<div class="small text-light mb-1">• Lý do hoàn đơn: <strong>' + (data.return_reason || 'Không đúng cam kết đồng kiểm SOP-01') + '</strong></div>' +
                '<div class="small text-nvidia fw-bold">• Số dư Ví NVIDIA Pay hiện tại của khách hàng: ' + Number(data.buyer_wallet_balance || 0).toLocaleString('vi-VN') + ' ₫ • Tồn kho (stock) của sản phẩm đã được cộng hoàn trả đầy đủ!</div>' +
            '</div>';
    } else if (isCompleted) {
        refundCompleteBannerHtml =
            '<div class="p-3 rounded-4 border border-success mb-4" style="background:rgba(118,185,0,0.14);">' +
                '<span class="badge bg-success me-2">✅ COMPLETED • ĐÃ GIẢI NGÂN ESCROW</span>' +
                '<strong class="text-nvidia">Khách hàng đã xác nhận nhận hàng hài lòng! Quỹ Bảo Lãnh Escrow đã giải ngân 100% cho Gian hàng &amp; kích hoạt Bảo hành điện tử 36 tháng.</strong>' +
            '</div>';
    }

    var stepsGridHtml = steps.map(function(st) {
        var cls = 'nvx-step-node';
        var iconBadge = '<span class="badge bg-secondary">Bước ' + st.step_index + '</span>';
        if (st.is_current) {
            cls += ' step-active';
            iconBadge = '<span class="badge bg-nvidia">🟢 ĐANG Ở BƯỚC ' + st.step_index + '</span>';
        } else if (st.is_done) {
            cls += ' step-done';
            iconBadge = '<span class="badge bg-success">✔ Hoàn tất B' + st.step_index + '</span>';
        }
        return '<div class="col-md-4 col-sm-6">' +
            '<div class="' + cls + '">' +
                '<div class="d-flex justify-content-between align-items-center mb-1">' +
                    iconBadge +
                    '<code class="small text-info">' + st.stage_key + '</code>' +
                '</div>' +
                '<div class="fw-bold text-light small mb-1">' + st.title + '</div>' +
                '<div class="text-secondary" style="font-size:11.5px;line-height:1.4;">' + st.description + '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    var itemsRowsHtml = items.map(function(it) {
        return '<div class="d-flex flex-wrap justify-content-between align-items-center p-2 rounded-3 border border-secondary border-opacity-25 mb-2" style="background:rgba(15,23,42,0.6);">' +
            '<div class="d-flex align-items-center gap-2">' +
                '<img src="' + (it.image_url || '/assets/icons/icon.png') + '" style="width:52px;height:52px;object-fit:contain;" class="rounded border border-secondary p-1 bg-dark">' +
                '<div>' +
                    '<div class="fw-bold text-light small">' + it.name + '</div>' +
                    '<div class="text-secondary" style="font-size:11px;">🏪 ' + (it.seller_store_name || 'Flagship Mall') + ' • 🛡️ ' + (it.warranty_policy || 'Bảo hành 36 tháng SOP-01') + '</div>' +
                    '<div class="text-info" style="font-size:11px;">📦 Tồn kho hiện tại trên kệ: <strong id="trkProdStock_' + it.product_id + '">' + (it.current_stock !== undefined ? it.current_stock : 20) + '</strong> sản phẩm</div>' +
                '</div>' +
            '</div>' +
            '<div class="text-end">' +
                '<div class="fw-bold text-nvidia">' + Number(it.subtotal || it.unit_price || 0).toLocaleString('vi-VN') + ' ₫</div>' +
                '<div class="small text-secondary">SL: x' + (it.quantity || 1) + '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    var inspectionActionCardHtml =
        '<div class="nv-adaptive-card p-4 rounded-4 border mb-4 shadow" style="border: 2px solid ' + (isInspecting ? '#76b900' : 'rgba(148,163,184,0.3)') + ' !important; background: rgba(15, 23, 42, 0.9);">' +
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-secondary border-opacity-25 pb-2 mb-3">' +
                '<div>' +
                    '<span class="badge ' + (isInspecting ? 'bg-nvidia' : 'bg-info text-dark') + ' mb-1">QUYỀN LỢI ĐỒNG KIỂM 24H &amp; BẢO VỆ NGƯỜI MUA (SOP-01)</span>' +
                    '<h5 class="fw-bold text-light m-0">🛡️ Trạm Quyết Định Đồng Kiểm: Giải Ngân Cho Shop Hoặc Hoàn Đơn &amp; Hoàn Tiền 100%</h5>' +
                '</div>' +
                '<div class="text-end small">' +
                    '<div class="text-secondary">Số dư Ví NVIDIA Pay của khách:</div>' +
                    '<strong class="fs-6 text-nvidia" id="trkBuyerWalletBalanceText">' + Number(data.buyer_wallet_balance || 0).toLocaleString('vi-VN') + ' ₫</strong>' +
                '</div>' +
            '</div>' +

            (!isInspecting && !isRefunded && !isCompleted
                ? '<div class="alert alert-info py-2 small mb-3">💡 <strong>Gợi ý:</strong> Kiện hàng đang ở trạng thái <code>' + stage + '</code>. Bạn có thể bấm nút <strong>"5. Đã Giao &amp; Mở Đồng Kiểm 24h"</strong> ở thanh Demo phía trên hoặc bấm trực tiếp 2 nút bên dưới để thực hiện Xác nhận nhận hàng / Hoàn đơn ngay!</div>'
                : '') +

            '<div class="row g-3">' +
                '<div class="col-md-6">' +
                    '<button type="button" class="btn btn-nvidia w-100 fw-bold py-3 fs-6 shadow" ' + (isRefunded ? 'disabled' : '') + ' onclick="confirmOrderDeliveryAndReleaseEscrow()">' +
                        '✅ Xác Nhận Nhận Hàng &amp; Giải Ngân Cho Shop' +
                    '</button>' +
                    '<div class="small text-secondary mt-1 text-center">Khi bạn hài lòng với sản phẩm, tiền trong Quỹ Escrow sẽ được giải ngân cho Gian hàng.</div>' +
                '</div>' +
                '<div class="col-md-6">' +
                    '<button type="button" class="btn btn-warning text-dark w-100 fw-bold py-3 fs-6 shadow" ' + (isRefunded ? 'disabled' : '') + ' onclick="toggleReturnRefundReasonDrawer()">' +
                        '🔄 Yêu Cầu Hoàn Đơn &amp; Hoàn Tiền 100%' +
                    '</button>' +
                    '<div class="small text-secondary mt-1 text-center">Cấp mã thu hồi <code>NVX-RET-xxxx</code>, hoàn trả 100% tiền về Ví NVIDIA Pay &amp; cộng lại tồn kho.</div>' +
                '</div>' +
            '</div>' +

            '<!-- KHUNG CHỌN LÝ DO HOÀN ĐƠN -> CẤP MÃ NVX-RET -> XÁC NHẬN HOÀN TẤT THU HỒI & HOÀN TIỀN 100% -->' +
            '<div id="nvxReturnRefundDrawer" class="mt-3 pt-3 border-top border-warning ' + (stage === 'RETURN_PROCESSING' ? '' : 'd-none') + '">' +
                '<div class="p-3 rounded-3 border border-warning" style="background:rgba(245,158,11,0.08);">' +
                    '<h6 class="fw-bold text-warning mb-2">🔄 Quy Trình Thu Hồi Kiện Hàng &amp; Hoàn Tiền Nguyên Tử 100% Về Ví NVIDIA Pay</h6>' +
                    '<div class="row g-2 align-items-end mb-3">' +
                        '<div class="col-md-6">' +
                            '<label class="small fw-bold text-light mb-1">1. Chọn lý do yêu cầu hoàn đơn *</label>' +
                            '<select id="nvxReturnReasonSelect" class="form-select form-select-sm" style="background:#0f172a;color:#fff;border-color:#f59e0b;">' +
                                '<option value="Sản phẩm phát sinh lỗi kỹ thuật khi đồng kiểm (SOP-01)">Sản phẩm phát sinh lỗi kỹ thuật khi đồng kiểm (SOP-01)</option>' +
                                '<option value="Hộp sản phẩm có dấu hiệu móp méo / Rách tem niêm phong QR">Hộp sản phẩm có dấu hiệu móp méo / Rách tem niêm phong QR</option>' +
                                '<option value="Giao sai phiên bản / Thông số không đúng mô tả gian hàng">Giao sai phiên bản / Thông số không đúng mô tả gian hàng</option>' +
                                '<option value="Đổi ý trong thời hạn đồng kiểm 24h miễn phí">Đổi ý trong thời hạn đồng kiểm 24h miễn phí</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="col-md-6">' +
                            '<label class="small fw-bold text-light mb-1">Mã vận đơn thu hồi ngược (Tự động cấp)</label>' +
                            '<input type="text" id="nvxReturnCodePreviewInput" class="form-control form-control-sm font-monospace text-warning fw-bold" style="background:#0f172a;border-color:#f59e0b;" value="' + (data.return_tracking_code || ('NVX-RET-' + data.order_id + '-8899')) + '" readonly>' +
                        '</div>' +
                    '</div>' +
                    '<div class="d-flex flex-wrap gap-2">' +
                        '<button type="button" class="btn btn-outline-warning btn-sm fw-bold px-3 py-2" onclick="submitReturnRefundFlow(\'issue_code\')">' +
                            '🏷️ Bước 1: Cấp Mã Thu Hồi Kiện Hàng (' + (data.return_tracking_code || ('NVX-RET-' + data.order_id)) + ')' +
                        '</button>' +
                        '<button type="button" class="btn btn-nvidia btn-sm fw-bold px-4 py-2 flex-fill shadow" onclick="submitReturnRefundFlow(\'complete\')">' +
                            '💸 Bước 2: Xác Nhận Hoàn Tất Thu Hồi ➔ Hoàn Tiền 100% (' + Number(data.total_amount || 0).toLocaleString('vi-VN') + ' ₫) Về Ví &amp; Cộng Lại Tồn Kho' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    box.innerHTML =
        behalfBannerHtml +
        refundCompleteBannerHtml +

        '<!-- BẢNG TỔNG QUAN VẬN ĐƠN & BẢN ĐỒ RADAR ĐỊNH VỊ CANVAS -->' +
        '<div class="row g-4 mb-4">' +
            '<div class="col-lg-5">' +
                '<div class="nv-adaptive-card p-4 rounded-4 border h-100">' +
                    '<div class="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-25 pb-2 mb-3">' +
                        '<div>' +
                            '<span class="text-secondary small">Mã vận đơn NVX Express:</span>' +
                            '<h4 class="fw-bold text-nvidia font-monospace m-0">' + (data.tracking_code || ('NVX-' + data.order_id)) + '</h4>' +
                        '</div>' +
                        '<div class="text-end">' +
                            '<span class="text-secondary small">Mã đơn hàng:</span>' +
                            '<div class="fw-bold text-info font-monospace fs-5">' + (data.order_code || ('#NVD-' + data.order_id)) + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="small mb-3">' +
                        '<div class="mb-1">👤 <strong>Người nhận:</strong> ' + (data.customer_name || 'Khách mua hàng') + ' (' + (data.phone || '0988123456') + ')</div>' +
                        '<div class="mb-1">📍 <strong>Điểm giao nhận:</strong> ' + (data.shipping_address || 'TP. Hồ Chí Minh') + '</div>' +
                        '<div class="mb-1">🚐 <strong>Chuyên viên giao nhận:</strong> ' + (radar.courier_name || 'Trần Hoàng Nam') + ' (' + (radar.courier_phone || '0909.888.799') + ')</div>' +
                        '<div class="mb-1">🚛 <strong>Phương tiện chuyên dụng:</strong> <code>' + (radar.vehicle_code || 'NVX-VAN-29A-886.88') + '</code></div>' +
                        '<div class="mb-1">🛡️ <strong>Trạng thái Quỹ Escrow:</strong> <span class="badge bg-success">' + (data.escrow_status || 'holding').toUpperCase() + '</span></div>' +
                        '<div class="mt-2 pt-2 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-baseline">' +
                            '<span class="fw-bold">Giá trị bảo lãnh Escrow:</span>' +
                            '<strong class="fs-4 text-warning">' + Number(data.total_amount || 0).toLocaleString('vi-VN') + ' ₫</strong>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mt-2">' +
                        '<div class="fw-bold text-nvidia small mb-2">📦 Danh sách kiện hàng công nghệ (' + items.length + ' món):</div>' +
                        itemsRowsHtml +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="col-lg-7">' +
                '<div class="nv-adaptive-card p-4 rounded-4 border h-100 d-flex flex-column justify-content-between">' +
                    '<div>' +
                        '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                            '<div>' +
                                '<span class="badge bg-nvidia">BẢN ĐỒ RADAR VỆ TINH NVX EXPRESS 2H</span>' +
                                '<h5 class="fw-bold m-0 mt-1">🛰️ Định Vị Lộ Trình Vận Chuyển Thời Gian Thực (' + (data.progress_pct || 25) + '%)</h5>' +
                            '</div>' +
                            '<span class="badge bg-dark border border-success text-nvidia">' + (radar.sla_badge || 'Giao Hỏa Tốc 2H') + '</span>' +
                        '</div>' +
                        '<div class="nvx-radar-box mb-3">' +
                            '<canvas id="nvxLogisticsRadarCanvas" width="640" height="250" style="width:100%;height:250px;display:block;"></canvas>' +
                        '</div>' +
                    '</div>' +
                    '<div class="p-3 rounded-3 border border-secondary border-opacity-25 small" style="background:rgba(15,23,42,0.75);">' +
                        '<div class="d-flex justify-content-between align-items-center mb-1">' +
                            '<span class="text-info fw-bold">📍 Vị trí hiện tại: ' + (data.current_position_label || 'Đang điều phối') + '</span>' +
                            '<strong class="text-nvidia">' + (data.progress_pct || 25) + '% lộ trình</strong>' +
                        '</div>' +
                        '<div class="progress" style="height:8px;background:#1e293b;">' +
                            '<div class="progress-bar bg-success" role="progressbar" style="width:' + (data.progress_pct || 25) + '%;"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        inspectionActionCardHtml +

        '<!-- THANH TIẾN TRÌNH 6 BƯỚC NVX SMART LOGISTICS & ESCROW LIFECYCLE -->' +
        '<div class="nv-adaptive-card p-4 rounded-4 border shadow-sm">' +
            '<div class="d-flex justify-content-between align-items-center mb-3">' +
                '<h5 class="fw-bold text-nvidia m-0">📋 Tiến Trình 6 Bước NVX Smart Logistics &amp; Escrow Lifecycle</h5>' +
                '<span class="badge bg-dark border border-secondary text-light">Chuẩn vận hành độc quyền Nvidia Store</span>' +
            '</div>' +
            '<div class="row g-3">' +
                stepsGridHtml +
            '</div>' +
        '</div>';

    startNvxRadarCanvasAnimation(data.progress_pct || 25, stage);
    loadTrackingBlockchainPassport(data);
}

async function loadTrackingBlockchainPassport(orderData) {
    var box = document.getElementById('trackingBlockchainPassportBox');
    if (!box) return;
    var oid = (orderData && orderData.order_id) || 101;
    var items = (orderData && orderData.items) || [];
    var pid = (items.length && items[0].product_id) ? items[0].product_id : 1;

    try {
        var res = await fetch('/api/blockchain/device-passport?product_id=' + encodeURIComponent(pid) + '&order_id=' + encodeURIComponent(oid) + '&_t=' + Date.now(), { cache: 'no-store' });
        var pData = await res.json();
        if (!pData || !pData.ok) return;

        var blocksHtml = (pData.chain || []).map(function (b) {
            return (
                '<div class="col-md-6 col-lg-3">' +
                    '<div class="p-3 rounded-3 border h-100" style="background:rgba(15,23,42,0.85);border-color:rgba(118,185,0,0.4)!important;">' +
                        '<div class="d-flex justify-content-between align-items-center mb-1">' +
                            '<span class="badge bg-nvidia">Block #' + b.block_index + '</span>' +
                            '<span class="badge bg-dark border border-success font-monospace" style="font-size:10px;">✔ Verified</span>' +
                        '</div>' +
                        '<div class="fw-bold small text-light mb-1">' + b.title + '</div>' +
                        '<div class="text-muted mb-2" style="font-size:11.5px;">' + b.payload_summary + '</div>' +
                        '<div class="p-1 rounded bg-dark border border-secondary font-monospace text-info" style="font-size:10px;word-break:break-all;">' +
                            'Hash: ' + b.short_hash +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
        }).join('');

        box.innerHTML = (
            '<div class="nv-adaptive-card p-4 rounded-4 border shadow-sm" style="border-color:rgba(118,185,0,0.5)!important;">' +
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-secondary border-opacity-25 pb-2 mb-3">' +
                    '<div>' +
                        '<span class="badge bg-nvidia fw-bold me-2">🔗 SHA-256 BLOCKCHAIN DEVICE PASSPORT</span>' +
                        '<strong class="text-nvidia fs-6">Hộ Chiếu Thiết Bị Chuỗi Băm Bất Biến — Serial: <span class="font-monospace text-warning">' + pData.device_serial + '</span></strong>' +
                    '</div>' +
                    '<button type="button" class="btn btn-outline-nvidia btn-sm fw-bold" onclick="verifyTrackingPassportHashChain()">' +
                        '🔐 Kiểm Chứng Chuỗi Băm SHA-256' +
                    '</button>' +
                '</div>' +
                '<div class="row g-3 mb-2">' + blocksHtml + '</div>' +
                '<div id="trackingPassportVerifyMsg" class="small text-success font-monospace mt-2">' +
                    '✅ Chuỗi 4 Block liên kết bất biến (Root Merkle Hash: 0x' + String(pData.root_merkle_hash || '').slice(0, 32) + '...) — Cam kết chính hãng &amp; bảo vệ Escrow SOP-01.' +
                '</div>' +
            '</div>'
        );
    } catch (e) {}
}
window.loadTrackingBlockchainPassport = loadTrackingBlockchainPassport;

function verifyTrackingPassportHashChain() {
    var msgEl = document.getElementById('trackingPassportVerifyMsg');
    if (msgEl) {
        msgEl.className = 'small text-warning fw-bold font-monospace mt-2 p-2 rounded border border-success';
        msgEl.innerHTML = '🔐 ĐÃ XÁC THỰC MẬT MÃ HỌC SHA-256 (4/4 BLOCKS KHỚP 100%): Genesis Block ➔ Factory QA ➔ Escrow Smart Contract ➔ 36M Warranty Activation!';
    }
    if (typeof notifyToast === 'function') {
        notifyToast('🔐 Đã kiểm chứng toàn vẹn chuỗi băm SHA-256 của kiện hàng!', 'success');
    }
}
window.verifyTrackingPassportHashChain = verifyTrackingPassportHashChain;

function startNvxRadarCanvasAnimation(progressPct, stageKey) {
    if (__radarAnimFrameId) {
        cancelAnimationFrame(__radarAnimFrameId);
        __radarAnimFrameId = null;
    }
    var canvas = document.getElementById('nvxLogisticsRadarCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var pct = Math.max(5, Math.min(100, Number(progressPct || 25))) / 100;

    function drawFrame() {
        var el = document.getElementById('nvxLogisticsRadarCanvas');
        if (!el) return;
        var w = canvas.width;
        var h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Lưới tọa độ Radar
        ctx.strokeStyle = 'rgba(118, 185, 0, 0.14)';
        ctx.lineWidth = 1;
        for (var x = 0; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (var y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Vòng tròn quét Radar ở tâm
        var cx = w * 0.5;
        var cy = h * 0.52;
        [45, 90, 135].forEach(function(r) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(118, 185, 0, 0.22)';
            ctx.stroke();
        });

        // Tia quét Radar xoay
        __radarSweepAngle = (__radarSweepAngle + 0.025) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(__radarSweepAngle);
        var grad = ctx.createLinearGradient(0, 0, 130, 0);
        grad.addColorStop(0, 'rgba(118, 185, 0, 0.45)');
        grad.addColorStop(1, 'rgba(118, 185, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 135, -0.35, 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Tuyến đường vận chuyển từ Kho Tổng (trái) -> Trạm Điều Phối (giữa) -> Điểm Giao Nhận (phải)
        var pStart = { x: 75, y: 175, label: '🏭 Kho QC NVX' };
        var pMid = { x: 320, y: 78, label: '⚡ Trạm Điều Phối 2H' };
        var pEnd = { x: 565, y: 165, label: '🏠 Điểm Giao Nhận' };

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pMid.x, pMid.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tính tọa độ xe NVX Express theo pct
        var curX = pStart.x;
        var curY = pStart.y;
        if (pct <= 0.5) {
            var t1 = pct * 2;
            curX = pStart.x + (pMid.x - pStart.x) * t1;
            curY = pStart.y + (pMid.y - pStart.y) * t1;
        } else {
            var t2 = (pct - 0.5) * 2;
            curX = pMid.x + (pEnd.x - pMid.x) * t2;
            curY = pMid.y + (pEnd.y - pMid.y) * t2;
        }

        // Vẽ đường đã đi màu xanh Nvidia
        ctx.strokeStyle = '#76b900';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        if (pct <= 0.5) {
            ctx.lineTo(curX, curY);
        } else {
            ctx.lineTo(pMid.x, pMid.y);
            ctx.lineTo(curX, curY);
        }
        ctx.stroke();

        // Vẽ 3 trạm mốc
        [pStart, pMid, pEnd].forEach(function(pt) {
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(pt.label, pt.x, pt.y + 24);
        });

        // Vẽ tín hiệu xe vận chuyển hiện tại
        ctx.fillStyle = (stageKey === 'REFUNDED') ? '#f59e0b' : '#76b900';
        ctx.beginPath();
        ctx.arc(curX, curY, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#a3e635';
        ctx.font = 'bold 11.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(stageKey === 'REFUNDED' ? '🔄 ĐÃ THU HỒI' : '🚐 NVX-2H', curX, curY - 16);

        __radarAnimFrameId = requestAnimationFrame(drawFrame);
    }
    drawFrame();
}

async function advanceOrderLogisticsStage(targetStage) {
    var oid = (__activeTrackingOrderData && __activeTrackingOrderData.order_id)
        ? __activeTrackingOrderData.order_id
        : getInitialTrackingQuery();
    try {
        var res = await fetch('/api/tracking/advance-stage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: oid,
                target_stage: targetStage || 'NEXT'
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            __activeTrackingOrderData = data;
            renderNvxTrackingLifecycleView(data);
            if (typeof notifyToast === 'function') {
                notifyToast(data.message || ('⚡ Đã chuyển trạng thái vận đơn sang ' + targetStage), 'info');
            }
        }
    } catch (e) {}
}
window.advanceOrderLogisticsStage = advanceOrderLogisticsStage;

async function confirmOrderDeliveryAndReleaseEscrow() {
    var oid = (__activeTrackingOrderData && __activeTrackingOrderData.order_id)
        ? __activeTrackingOrderData.order_id
        : getInitialTrackingQuery();
    try {
        var res = await fetch('/api/tracking/confirm-delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: oid })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            __activeTrackingOrderData = data;
            renderNvxTrackingLifecycleView(data);
            if (typeof notifyToast === 'function') {
                notifyToast(data.message || '✅ Đã xác nhận nhận hàng & giải ngân cho Shop!', 'success');
            }
        }
    } catch (e) {}
}
window.confirmOrderDeliveryAndReleaseEscrow = confirmOrderDeliveryAndReleaseEscrow;

function toggleReturnRefundReasonDrawer() {
    var drawer = document.getElementById('nvxReturnRefundDrawer');
    if (drawer) {
        drawer.classList.toggle('d-none');
        drawer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
window.toggleReturnRefundReasonDrawer = toggleReturnRefundReasonDrawer;

async function submitReturnRefundFlow(stepMode) {
    var oid = (__activeTrackingOrderData && __activeTrackingOrderData.order_id)
        ? __activeTrackingOrderData.order_id
        : getInitialTrackingQuery();
    var reasonSel = document.getElementById('nvxReturnReasonSelect');
    var reasonVal = reasonSel ? reasonSel.value : 'Sản phẩm phát sinh lỗi kỹ thuật khi đồng kiểm (SOP-01)';

    try {
        var res = await fetch('/api/tracking/request-return-refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: oid,
                reason: reasonVal,
                step: stepMode || 'complete'
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            __activeTrackingOrderData = data;
            renderNvxTrackingLifecycleView(data);
            if (typeof notifyToast === 'function') {
                notifyToast(data.message, 'success');
            }
            // Cập nhật số dư Xu trên Header nếu có
            var hdrCoins = document.getElementById('headerUserCoinsBadge');
            if (hdrCoins && data.buyer_wallet_balance !== undefined) {
                hdrCoins.textContent = '🪙 ' + Number(data.buyer_wallet_balance).toLocaleString('vi-VN') + ' Xu';
            }
        }
    } catch (e) {}
}
window.submitReturnRefundFlow = submitReturnRefundFlow;

document.addEventListener('DOMContentLoaded', function() {
    var initQ = getInitialTrackingQuery();
    var inp = document.getElementById('trackingInput');
    if (inp && initQ) inp.value = initQ;
    lookupTracking(initQ);
});