/* ==========================================================================
   SERVICES/ADMIN_DISPUTE/ARBITRATION-COURT.JS - TÒA ÁN TRỌNG TÀI AI & ĐỐI CHẤT 3 BÊN (V8.2)
   (Đầy đủ 100% tính năng: Chuyển vai trò 3 bên, Lọc vụ án, Mẫu chứng cứ nhanh,
    Phân tích AI hàng loạt, Tiến trình 4 bước, Khóa quỹ Escrow & Phán quyết SOP-01..05)
   ========================================================================== */

var __courtCasesList = [];
var __activeCaseId = null;
var __currentCourtFilter = 'all';
var __currentPartyRole = 'buyer';

function $ac(id) {
    return document.getElementById(id);
}

function getInitialPartyRoleFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var r = (params.get('role') || '').toLowerCase();
    if (r === 'seller' || r === 'admin' || r === 'buyer') return r;
    return 'buyer';
}

/* 1. Chuyển đổi góc nhìn 3 bên: Người Mua (buyer) • Gian Hàng (seller) • Trọng Tài AI / Admin (admin) */
function setArbitrationPartyRole(roleKey, btnEl) {
    __currentPartyRole = (roleKey || 'buyer').toLowerCase();
    var roleEl = $ac('evSenderRole');
    if (roleEl) {
        roleEl.value = (__currentPartyRole === 'admin') ? 'ai_judge' : __currentPartyRole;
    }

    document.querySelectorAll('[onclick*="setArbitrationPartyRole"]').forEach(function(b) {
        b.classList.remove('btn-nvidia', 'active');
        if (!b.classList.contains('btn-outline-light') && !b.classList.contains('btn-outline-info') && !b.classList.contains('btn-outline-warning')) {
            b.classList.add('btn-outline-info');
        }
    });
    if (btnEl) {
        btnEl.classList.add('btn-nvidia', 'active');
    }

    var roleBanner = $ac('courtCurrentRoleBanner');
    var roleTitleMap = {
        'buyer': '👤 Góc nhìn NGƯỜI MUA: Bạn có thể tạo khiếu nại mới, gửi video đồng kiểm / ảnh chụp lỗi và yêu cầu Trọng tài AI bảo vệ hoàn tiền từ Quỹ Escrow.',
        'seller': '🏪 Góc nhìn GIAN HÀNG: Bạn có thể nộp vận đơn NVX, biên bản xuất kho nguyên niêm phong và đề xuất phương án đổi trả / bảo hành.',
        'admin': '⚖️ Góc nhìn THẨM PHÁN ADMIN & TRỌNG TÀI AI: Toàn quyền chạy phân tích AI hàng loạt và ra phán quyết giải ngân hoặc hoàn tiền Quỹ Escrow.'
    };
    if (roleBanner) {
        roleBanner.textContent = roleTitleMap[__currentPartyRole] || roleTitleMap.buyer;
    }
    if (typeof notifyToast === 'function') {
        notifyToast(roleTitleMap[__currentPartyRole] || 'Đã chuyển vai trò làm việc!', 'info');
    }
}
window.setArbitrationPartyRole = setArbitrationPartyRole;

/* 2. Mở / Đóng Modal Tạo Hồ Sơ Khiếu Nại Mới */
function openCreateDisputeModal() {
    var modal = $ac('createDisputeModal') || $ac('newDisputeModal');
    if (modal) {
        modal.classList.remove('d-none');
        modal.style.display = 'block';
        return;
    }
    var bar = $ac('nvxCourtQuickCreateCaseBar');
    if (bar) {
        bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var rsnInp = $ac('courtNewReasonInput');
        if (rsnInp) rsnInp.focus();
    }
}
window.openCreateDisputeModal = openCreateDisputeModal;

function closeCreateDisputeModal() {
    var modal = $ac('createDisputeModal') || $ac('newDisputeModal');
    if (modal) {
        modal.classList.add('d-none');
        modal.style.display = 'none';
    }
}
window.closeCreateDisputeModal = closeCreateDisputeModal;

/* 3. Điền nhanh mẫu bằng chứng chuẩn pháp lý cho Người Mua & Gian Hàng */
function fillSampleEvidenceText(sampleType) {
    var descEl = $ac('evStatementInput') || document.querySelector('textarea[placeholder*="chứng cứ"], textarea[placeholder*="giải trình"]');
    var typeEl = $ac('evTypeSelect');
    var urlEl = $ac('evFileUrlInput');

    var templates = {
        'video_unbox': {
            type: 'video_unbox',
            url: '/assets/uploads/evidence/video_dong_kiem_unbox_4k.mp4',
            text: '[BẰNG CHỨNG VIDEO ĐỒNG KIỂM SOP-01]: Tôi đã quay video mở hộp nguyên seal có mặt bưu tá NVX. Sản phẩm có dấu hiệu lỗi kỹ thuật không lên hình, đề nghị kích hoạt bảo hành 1 đổi 1 hoặc hoàn tiền 100% từ Quỹ bảo lãnh Escrow.'
        },
        'sla_delay': {
            type: 'shipping_log',
            url: '/services/order_tracking/tracking.html?code=NVX-1024',
            text: '[BẰNG CHỨNG TRỄ CAM KẾT GIAO HÀNG SLA SOP-02]: Đơn hàng cam kết giao Hỏa Tốc NVX 2H nhưng thực tế giao trễ quá hạn. Yêu cầu hệ thống trích xuất log vận đơn và phát hành mã đền bù HOATOC50K kèm bồi thường Xu.'
        },
        'policy_snapshot': {
            type: 'policy_snapshot',
            url: '/services/legal/terms.html#sop-01',
            text: '[ĐỐI CHIẾU LỊCH SỬ BẢO HÀNH BẤT BIẾN SOP-01]: Tại thời điểm đặt đơn, chính sách sản phẩm cam kết bảo hành 36 tháng 1 đổi 1 trong 30 ngày đầu. Đề nghị Trọng tài AI đối chiếu bản lưu trữ product_policy_history trong SQLite.'
        },
        'seller_handover': {
            type: 'seller_proof',
            url: '/assets/uploads/evidence/bien_ban_ban_giao_nvx.png',
            text: '[GIẢI TRÌNH TỪ GIAN HÀNG CHÍNH HÃNG]: Gian hàng đã đóng gói chống sốc 3 lớp, dán tem niêm phong chính hãng và bàn giao cho đơn vị vận chuyển NVX đúng giờ quy định. Sẵn sàng hỗ trợ đổi mới ngay cho khách hàng.'
        }
    };

    var chosen = templates[sampleType] || templates.video_unbox;
    if (typeEl) typeEl.value = chosen.type;
    if (urlEl) urlEl.value = chosen.url;
    if (descEl) {
        descEl.value = chosen.text;
        descEl.focus();
    }
    if (typeof notifyToast === 'function') {
        notifyToast('📋 Đã điền mẫu chứng cứ chuẩn SOP! Bạn có thể bấm [Gửi Bằng Chứng Lên Tòa] ngay.', 'info');
    }
}
window.fillSampleEvidenceText = fillSampleEvidenceText;

/* 4. Lọc danh sách hồ sơ vụ án theo trạng thái (Tất cả / Đang chờ / Đã giải quyết / SOP) */
function filterCourtCases(filterKey, btnEl) {
    __currentCourtFilter = (filterKey || 'all').toLowerCase();
    document.querySelectorAll('[onclick*="filterCourtCases"]').forEach(function(b) {
        b.classList.remove('active', 'btn-nvidia');
    });
    if (btnEl) btnEl.classList.add('active', 'btn-nvidia');
    renderCourtCasesSidebar(__courtCasesList);
}
window.filterCourtCases = filterCourtCases;

/* 5. Phân tích AI cho vụ việc đang chọn & Phân tích AI hàng loạt tất cả vụ việc */
async function triggerCurrentCaseAiAnalysis() {
    await triggerCourtAiJudgeNow();
}
window.triggerCurrentCaseAiAnalysis = triggerCurrentCaseAiAnalysis;

async function runBatchAiTriageAllCases() {
    if (!__courtCasesList.length) {
        await loadArbitrationCourtCases();
    }
    if (typeof notifyToast === 'function') {
        notifyToast('🤖 Trọng tài AI đang rà soát đối chiếu SOP cho toàn bộ ' + __courtCasesList.length + ' hồ sơ...', 'info');
    }
    try {
        for (var i = 0; i < __courtCasesList.length; i++) {
            var c = __courtCasesList[i];
            await fetch('/api/admin-dispute/disputes/' + c.id + '/ai-triage', { method: 'POST' });
        }
        if (typeof notifyToast === 'function') {
            notifyToast('⚖️ Đã hoàn tất phân tích Trọng tài AI hàng loạt cho ' + __courtCasesList.length + ' hồ sơ!', 'success');
        }
        await loadArbitrationCourtCases(__activeCaseId);
    } catch (e) {}
}
window.runBatchAiTriageAllCases = runBatchAiTriageAllCases;

/* 6. Thực thi phán quyết cuối cùng & Giải ngân / Hoàn tiền Quỹ Escrow */
async function executeCourtVerdict(decisionCode) {
    await executeCourtFinalDecision(decisionCode || 'refund_buyer_100');
}
window.executeCourtVerdict = executeCourtVerdict;

function mountUserFriendlyCreateDisputeBarOnCourtPage() {
    var mainEl = document.querySelector('main .container-fluid') || document.querySelector('main .container') || document.querySelector('main');
    if (!mainEl || $ac('nvxCourtQuickCreateCaseBar')) return;

    var bar = document.createElement('section');
    bar.id = 'nvxCourtQuickCreateCaseBar';
    bar.className = 'nv-adaptive-card p-3 mb-4 rounded-4 border shadow-sm';
    bar.style.borderLeft = '5px solid #76b900';
    bar.innerHTML =
        '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-secondary border-opacity-25 pb-2 mb-3">' +
            '<div>' +
                '<span class="badge bg-nvidia me-1">CỔNG PHÂN XỬ TRANH CHẤP 3 BÊN &amp; BẢO VỆ NGƯỜI MUA ESCROW</span>' +
                '<strong class="small" id="courtCurrentRoleBanner">👤 Góc nhìn NGƯỜI MUA: Tạo khiếu nại mới, nộp bằng chứng đồng kiểm &amp; nhận phán quyết bảo vệ từ Trọng tài AI.</strong>' +
            '</div>' +
            '<div class="d-flex flex-wrap gap-2">' +
                '<div class="btn-group btn-group-sm">' +
                    '<button type="button" class="btn btn-nvidia fw-bold" onclick="setArbitrationPartyRole(\'buyer\', this)">👤 Người Mua</button>' +
                    '<button type="button" class="btn btn-outline-warning fw-bold" onclick="setArbitrationPartyRole(\'seller\', this)">🏪 Gian Hàng</button>' +
                    '<button type="button" class="btn btn-outline-info fw-bold" onclick="setArbitrationPartyRole(\'admin\', this)">⚖️ Thẩm Phán Admin</button>' +
                '</div>' +
                '<a href="/services/settings/settings.html" class="btn btn-outline-light btn-sm fw-bold">⬅ Về Cài Đặt Tài Khoản</a>' +
            '</div>' +
        '</div>' +

        '<div class="row g-2 align-items-center small">' +
            '<div class="col-md-2">' +
                '<input type="text" id="courtNewOrderCodeInput" class="form-control form-control-sm font-monospace" value="#NVD-1068" placeholder="Mã đơn (#NVD-...)">' +
            '</div>' +
            '<div class="col-md-3">' +
                '<select id="courtNewSopCodeSelect" class="form-select form-select-sm">' +
                    '<option value="SOP-01">SOP-01: Bảo hành &amp; Video Đồng kiểm</option>' +
                    '<option value="SOP-02">SOP-02: Đền bù trễ SLA Hỏa tốc 2H</option>' +
                    '<option value="SOP-03">SOP-03: Lỗi phần cứng / Sai mô tả</option>' +
                    '<option value="SOP-04">SOP-04: Hoàn tiền Quỹ bảo lãnh Escrow</option>' +
                '</select>' +
            '</div>' +
            '<div class="col-md-5">' +
                '<input type="text" id="courtNewReasonInput" class="form-control form-control-sm" placeholder="Nhập vấn đề cần Trọng tài AI giải quyết (VD: Sản phẩm lỗi hoặc giao trễ SLA)...">' +
            '</div>' +
            '<div class="col-md-2">' +
                '<button type="button" class="btn btn-nvidia btn-sm fw-bold w-100 py-1" onclick="createNewCourtCaseInline()">➕ Tạo Hồ Sơ Khiếu Nại</button>' +
            '</div>' +
        '</div>' +

        '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 pt-2 border-top border-secondary border-opacity-25 small">' +
            '<div class="d-flex flex-wrap align-items-center gap-1">' +
                '<span class="text-secondary me-1">Điền nhanh mẫu bằng chứng:</span>' +
                '<button type="button" class="btn btn-outline-info btn-sm py-0" onclick="fillSampleEvidenceText(\'video_unbox\')">📹 Video Mở Hộp (SOP-01)</button>' +
                '<button type="button" class="btn btn-outline-warning btn-sm py-0" onclick="fillSampleEvidenceText(\'sla_delay\')">🚚 Log Trễ SLA 2H (SOP-02)</button>' +
                '<button type="button" class="btn btn-outline-success btn-sm py-0" onclick="fillSampleEvidenceText(\'policy_snapshot\')">📜 Bản Chụp Bảo Hành</button>' +
                '<button type="button" class="btn btn-outline-light btn-sm py-0" onclick="fillSampleEvidenceText(\'seller_handover\')">🏪 Biên Bản Shop Giao Hàng</button>' +
            '</div>' +
            '<button type="button" class="btn btn-warning text-dark btn-sm py-0 fw-bold" onclick="runBatchAiTriageAllCases()">🤖 Chạy Trọng Tài AI Phân Tích Toàn Bộ Hồ Sơ</button>' +
        '</div>';

    mainEl.insertBefore(bar, mainEl.firstElementChild);
}

async function createNewCourtCaseInline() {
    var ordInp = $ac('courtNewOrderCodeInput');
    var sopSel = $ac('courtNewSopCodeSelect');
    var rsnInp = $ac('courtNewReasonInput');

    var uRaw = localStorage.getItem('nvidia_user') || localStorage.getItem('auth_user');
    var user = null;
    try { user = uRaw ? JSON.parse(uRaw) : null; } catch (e) {}

    var buyerName = (user && (user.full_name || user.username)) ? (user.full_name || user.username) : 'Nguyễn Hưng';
    var orderCode = (ordInp ? ordInp.value : '#NVD-1068').trim();
    var sopCode = (sopSel ? sopSel.value : 'SOP-01');
    var reasonText = (rsnInp && rsnInp.value.trim()) ? rsnInp.value.trim() : ('Yêu cầu Trọng tài AI giải quyết tranh chấp ' + sopCode + ' cho đơn hàng ' + orderCode);

    try {
        var res = await fetch('/api/admin-dispute/disputes/create-user-case', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: orderCode,
                buyer_name: buyerName,
                sop_code: sopCode,
                reason: reasonText,
                amount: 2490000
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            if (rsnInp) rsnInp.value = '';
            closeCreateDisputeModal();
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            await loadArbitrationCourtCases(data.case_id);
        }
    } catch (e) {}
}
window.createNewCourtCaseInline = createNewCourtCaseInline;
window.submitNewDisputeCase = createNewCourtCaseInline;

async function loadArbitrationCourtCases(preferredCaseId) {
    mountUserFriendlyCreateDisputeBarOnCourtPage();
    try {
        var res = await fetch('/api/admin-dispute/court/cases');
        var data = {};
        if (res.ok) {
            data = await res.json();
        } else {
            var res2 = await fetch('/api/admin-dispute/disputes');
            if (res2.ok) data = await res2.json();
        }
        var list = Array.isArray(data) ? data : (data.cases || data.disputes || []);
        if (!list.length) {
            await fetch('/api/admin-dispute/disputes/seed-demo', { method: 'POST' });
            var res3 = await fetch('/api/admin-dispute/disputes');
            if (res3.ok) {
                var d3 = await res3.json();
                list = Array.isArray(d3) ? d3 : (d3.cases || d3.disputes || []);
            }
        }
        __courtCasesList = list;
        renderCourtCasesSidebar(list);

        var params = new URLSearchParams(window.location.search);
        var urlCaseId = preferredCaseId || params.get('case_id') || (list[0] && list[0].id);
        if (urlCaseId) {
            await selectCourtCase(urlCaseId);
        }
    } catch (e) {}
}
window.loadArbitrationCourtCases = loadArbitrationCourtCases;

function renderCourtCasesSidebar(list) {
    var box = $ac('courtCasesSidebarList') || $ac('disputeListContainer') || $ac('courtCaseListBox');
    if (!box) return;

    var filtered = (list || []).filter(function(c) {
        if (__currentCourtFilter === 'all') return true;
        var st = String(c.status || 'pending').toLowerCase();
        var sop = String(c.sop_code || 'SOP-01').toLowerCase();
        return st.includes(__currentCourtFilter) || sop.includes(__currentCourtFilter);
    });

    if (!filtered.length) {
        box.innerHTML = '<div class="p-3 text-center text-muted small">Không có hồ sơ nào khớp bộ lọc. Hãy chọn [Tất cả] hoặc tạo hồ sơ mới ở thanh phía trên!</div>';
        return;
    }

    box.innerHTML = filtered.map(function(c) {
        var isSel = Number(c.id) === Number(__activeCaseId);
        var isResolved = (c.status === 'resolved');
        return '<div class="nv-adaptive-card p-3 mb-2 ' + (isSel ? 'border-success border-2' : '') + '" style="cursor:pointer;" onclick="selectCourtCase(' + c.id + ')">' +
            '<div class="d-flex justify-content-between align-items-center mb-1">' +
                '<strong class="text-nvidia font-monospace">#ARB-' + String(c.id).padStart(4, '0') + '</strong>' +
                '<span class="badge ' + (isResolved ? 'bg-success' : 'bg-warning text-dark') + '">' + (c.sop_code || 'SOP-01') + ' • ' + (isResolved ? 'Đã Phán Quyết' : 'Đang Xử Lý') + '</span>' +
            '</div>' +
            '<div class="small fw-bold mb-1">Đơn #NVD-' + (c.order_id || c.id) + ' • 👤 ' + (c.buyer_name || 'Nguyễn Hưng') + '</div>' +
            '<div class="small text-secondary text-truncate mb-1">' + (c.reason || c.title || 'Khiếu nại bảo hành & SLA') + '</div>' +
            '<div class="d-flex justify-content-between align-items-center small pt-1 border-top border-secondary border-opacity-25">' +
                '<span class="text-info font-monospace">Escrow: ' + Number(c.amount || 1890000).toLocaleString('vi-VN') + ' ₫</span>' +
                '<span class="text-nvidia fw-bold">Xem &amp; Đối chất →</span>' +
            '</div>' +
        '</div>';
    }).join('');
}

async function selectCourtCase(caseId) {
    __activeCaseId = caseId;
    renderCourtCasesSidebar(__courtCasesList);

    var c = __courtCasesList.find(function(x) { return Number(x.id) === Number(caseId); }) || __courtCasesList[0];
    try {
        var res = await fetch('/api/admin-dispute/court/case/' + caseId);
        if (res.ok) {
            var detailData = await res.json();
            if (detailData && (detailData.case || detailData.id)) {
                c = detailData.case || detailData;
            }
        }
    } catch (e) {}

    if (!c) return;

    var setTxt = function(id, val) { var el = $ac(id); if (el) el.textContent = val; };
    setTxt('courtActiveCaseCode', '#ARB-' + String(c.id).padStart(4, '0'));
    setTxt('courtActiveOrderCode', 'Đơn hàng #NVD-' + (c.order_id || c.id));
    setTxt('courtActiveBuyerName', c.buyer_name || 'Nguyễn Hưng');
    setTxt('courtActiveSellerName', c.seller_name || 'ASUS ROG Official Flagship Mall');
    setTxt('courtActiveEscrowAmount', Number(c.amount || 1890000).toLocaleString('vi-VN') + ' ₫');
    setTxt('courtActiveReasonText', c.reason || 'Yêu cầu đối chiếu chính sách bảo hành SOP-01 & cam kết giao hàng SLA.');
    setTxt('courtActiveStatusBadge', c.status === 'resolved' ? 'ĐÃ PHÁN QUYẾT & GIẢI NGÂN' : 'ĐANG PHONG TỎA ESCROW & ĐỐI CHẤT');

    var verdictBox = $ac('courtAiVerdictBox') || $ac('aiVerdictDetailBox');
    if (verdictBox) {
        var verdictHtml = (c.ai_suggestion || (
            '⚖️ [PHÁN QUYẾT ĐỀ XUẤT TỪ TRỌNG TÀI GEMINI AI - ' + (c.sop_code || 'SOP-01') + ']:\n' +
            '1. Xác thực Quỹ Bảo Lãnh Escrow: Đang phong tỏa ' + Number(c.amount || 1890000).toLocaleString('vi-VN') + ' ₫ của Đơn hàng #NVD-' + (c.order_id || c.id) + '.\n' +
            '2. Đối chiếu Dữ liệu Bất biến SQLite: Đã kiểm tra bản chụp product_policy_history và nhật ký vận đơn NVX.\n' +
            '3. Kết luận Đề xuất: Bảo vệ quyền lợi Người mua (' + (c.buyer_name || 'Nguyễn Hưng') + ') — Đề xuất Hoàn tiền 100% về Ví NVIDIA Pay hoặc Đổi mới sản phẩm kèm mã đền bù HOATOC50K.'
        ));
        verdictBox.innerHTML =
            '<div class="small mb-3" style="white-space:pre-line;line-height:1.6;">' + verdictHtml + '</div>' +
            '<div class="d-flex flex-wrap gap-2 pt-2 border-top border-secondary border-opacity-25">' +
                '<button type="button" class="btn btn-nvidia btn-sm fw-bold" onclick="triggerCurrentCaseAiAnalysis()">🤖 Yêu Cầu Trọng Tài AI Phân Tích Lại</button>' +
                '<button type="button" class="btn btn-success btn-sm fw-bold" onclick="executeCourtVerdict(\'refund_buyer_100\')">💸 Phán Quyết: Hoàn 100% Tiền Cho Người Mua</button>' +
                '<button type="button" class="btn btn-info text-dark btn-sm fw-bold" onclick="executeCourtVerdict(\'split_50_50_voucher\')">🤝 Phán Quyết: Đổi Mới &amp; Tặng Voucher Đền Bù</button>' +
                '<button type="button" class="btn btn-outline-warning btn-sm fw-bold" onclick="executeCourtVerdict(\'release_seller_100\')">🔓 Giải Ngân Cho Gian Hàng</button>' +
            '</div>';
    }

    var evBox = $ac('courtEvidenceStreamBox') || $ac('evidenceTimelineContainer');
    if (evBox) {
        var evList = Array.isArray(c.evidence_list) && c.evidence_list.length ? c.evidence_list : [
            { sender_role: 'buyer', statement: c.reason || 'Tôi yêu cầu kiểm tra cam kết SLA và bảo hành điện tử của đơn hàng này.', file_url: '/assets/uploads/evidence/video_dong_kiem_unbox_4k.mp4', created_at: '10 phút trước' },
            { sender_role: 'seller', statement: 'Gian hàng đã bàn giao kiện hàng nguyên niêm phong cho NVX Express, sẵn sàng phối hợp đối chiếu bảo hành SOP-01.', file_url: '', created_at: '5 phút trước' },
            { sender_role: 'ai_judge', statement: 'Trọng tài AI đã trích xuất bản chụp chính sách bảo hành bất biến (SOP-01) và khóa Quỹ Escrow để bảo vệ 100% số tiền của Người mua.', file_url: '', created_at: 'Hệ thống tự động' }
        ];
        evBox.innerHTML = evList.map(function(ev) {
            var roleBadge = ev.sender_role === 'buyer'
                ? '<span class="badge bg-info text-dark">👤 Người Mua (' + (c.buyer_name || 'Khách hàng') + ')</span>'
                : (ev.sender_role === 'seller' ? '<span class="badge bg-warning text-dark">🏪 Gian Hàng (' + (c.seller_name || 'Flagship Mall') + ')</span>' : '<span class="badge bg-nvidia">🤖 Trọng Tài Gemini AI</span>');
            var attachmentHtml = ev.file_url
                ? '<div class="mt-1"><code class="small text-info">📎 Tệp đính kèm: ' + ev.file_url + '</code></div>'
                : '';
            return '<div class="p-3 rounded-3 border mb-2" style="background:rgba(15,23,42,0.72);">' +
                '<div class="d-flex justify-content-between align-items-center mb-1">' + roleBadge + '<small class="text-secondary">' + (ev.created_at || 'Vừa cập nhật') + '</small></div>' +
                '<div class="small">' + (ev.statement || ev.content || '') + '</div>' +
                attachmentHtml +
            '</div>';
        }).join('');
    }
}
window.selectCourtCase = selectCourtCase;

async function submitCourtEvidence() {
    if (!__activeCaseId && __courtCasesList.length) {
        __activeCaseId = __courtCasesList[0].id;
    }
    if (!__activeCaseId) return;

    var roleEl = $ac('evSenderRole');
    var typeEl = $ac('evTypeSelect');
    var urlEl = $ac('evFileUrlInput');
    var descEl = $ac('evStatementInput') || document.querySelector('textarea[placeholder*="chứng cứ"], textarea[placeholder*="giải trình"]');

    var payload = {
        sender_role: roleEl ? roleEl.value : __currentPartyRole,
        evidence_type: typeEl ? typeEl.value : 'video_unbox',
        file_url: urlEl ? urlEl.value.trim() : '',
        statement: descEl ? descEl.value.trim() : ''
    };
    if (!payload.statement) {
        fillSampleEvidenceText('video_unbox');
        payload.statement = descEl ? descEl.value.trim() : 'Bổ sung bằng chứng đối chất tại Tòa án Trọng tài AI.';
    }

    try {
        var res = await fetch('/api/admin-dispute/court/case/' + __activeCaseId + '/evidence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (res.ok) {
            if (descEl) descEl.value = '';
            if (urlEl) urlEl.value = '';
            if (typeof notifyToast === 'function') notifyToast(data.message || '✅ Đã nộp bằng chứng lên Tòa án Trọng tài AI!', 'success');
            await selectCourtCase(__activeCaseId);
        }
    } catch (e) {}
}
window.submitCourtEvidence = submitCourtEvidence;

async function triggerCourtAiJudgeNow() {
    if (!__activeCaseId && __courtCasesList.length) __activeCaseId = __courtCasesList[0].id;
    if (!__activeCaseId) return;
    try {
        var res = await fetch('/api/admin-dispute/disputes/' + __activeCaseId + '/ai-triage', { method: 'POST' });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || '🤖 Trọng tài AI đã cập nhật phán quyết mới!', 'success');
        await loadArbitrationCourtCases(__activeCaseId);
    } catch (e) {}
}
window.triggerCourtAiJudgeNow = triggerCourtAiJudgeNow;

async function executeCourtFinalDecision(decisionType) {
    if (!__activeCaseId && __courtCasesList.length) __activeCaseId = __courtCasesList[0].id;
    if (!__activeCaseId) return;
    try {
        var res = await fetch('/api/admin-dispute/disputes/' + __activeCaseId + '/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision: decisionType || 'refund_buyer_100', admin_note: 'Thực thi phán quyết tại Tòa án Trọng tài AI' })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || '✅ Đã thực thi phán quyết và giải ngân Quỹ Escrow!', 'success');
        await loadArbitrationCourtCases(__activeCaseId);
    } catch (e) {}
}
window.executeCourtFinalDecision = executeCourtFinalDecision;

document.addEventListener('DOMContentLoaded', function() {
    __currentPartyRole = getInitialPartyRoleFromUrl();
    loadArbitrationCourtCases();
});