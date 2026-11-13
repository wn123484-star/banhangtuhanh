let __allLegalClausesCache = [];
let __currentAudienceFilter = 'all';
let __isAdminViewActive = false;

function isCurrentSessionStrictAdmin() {
    try {
        if (localStorage.getItem('nvx_explicit_login') !== '1') return false;
        const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
        return Boolean(user && String(user.role || '').trim().toLowerCase() === 'admin');
    } catch (e) {
        return false;
    }
}

function initLegalRolePerspective() {
    const isRealAdmin = isCurrentSessionStrictAdmin();
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const adminPanel = document.getElementById('adminExclusiveLegalPanel');
    const btnAdm = document.getElementById('btnSwitchViewAdmin');
    const btnPub = document.getElementById('btnSwitchViewPublic');

    if (isRealAdmin) {
        document.body.classList.add('is-strict-admin-user');
        btnAdm?.classList.remove('d-none');
        btnPub?.classList.remove('d-none');
        const savedPerspective = sessionStorage.getItem('nvx_legal_view_mode');
        __isAdminViewActive = savedPerspective ? (savedPerspective === 'admin') : true;
    } else {
        /* Nếu là Người mua, Người bán hoặc Khách: Xóa hẳn bảng công cụ Admin khỏi DOM */
        document.body.classList.remove('is-strict-admin-user');
        __isAdminViewActive = false;
        sessionStorage.removeItem('nvx_legal_view_mode');
        if (adminPanel) adminPanel.remove();
        if (btnAdm) btnAdm.remove();
        if (btnPub) btnPub.remove();
    }
    applyLegalRoleVisibilityUI();
}

function setLegalViewPerspective(mode) {
    if (!isCurrentSessionStrictAdmin()) {
        __isAdminViewActive = false;
        return;
    }
    __isAdminViewActive = (mode === 'admin');
    sessionStorage.setItem('nvx_legal_view_mode', mode);
    applyLegalRoleVisibilityUI();
    renderLegalClausesList();
    if (__isAdminViewActive) {
        loadAdminLegalEmailLogs();
    }
}

function applyLegalRoleVisibilityUI() {
    const isRealAdmin = isCurrentSessionStrictAdmin();
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const roleBadge = document.getElementById('legalCurrentRoleBadge');
    const adminPanel = document.getElementById('adminExclusiveLegalPanel');

    if (isRealAdmin && __isAdminViewActive) {
        if (roleBadge) {
            roleBadge.className = 'badge bg-warning text-dark fw-bold px-3 py-1';
            roleBadge.textContent = `👑 QUẢN TRỊ VIÊN: ${user.full_name || user.username}`;
        }
        adminPanel?.classList.remove('d-none');
    } else {
        let uLabel = 'KHÁCH TRUY CẬP';
        if (user) {
            const r = String(user.role || 'buyer').toLowerCase();
            const roleVN = r === 'seller' ? '🏪 ĐỐI TÁC BÁN HÀNG' : (r === 'admin' ? '👑 ADMIN (CHẾ ĐỘ XEM CÔNG KHAI)' : '👤 KHÁCH MUA HÀNG');
            uLabel = `${roleVN}: ${user.full_name || user.username}`;
        }
        if (roleBadge) {
            roleBadge.className = 'badge bg-nvidia fw-bold px-3 py-1';
            roleBadge.textContent = uLabel;
        }
        adminPanel?.classList.add('d-none');
    }
}

async function loadLegalClauses(audience = 'all') {
    __currentAudienceFilter = audience;
    const q = (document.getElementById('legalSearchInput')?.value || '').trim();
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user && user.id ? user.id : '';

    try {
        const res = await fetch(`/api/legal/clauses?audience=${encodeURIComponent(audience)}&q=${encodeURIComponent(q)}&user_id=${uid}`);
        const data = await res.json();
        __allLegalClausesCache = data.clauses || [];

        const totalBadge = document.getElementById('legalTotalClausesBadge');
        if (totalBadge) totalBadge.textContent = `${data.total_clauses || __allLegalClausesCache.length} điều khoản hiện hành`;

        const accStatus = document.getElementById('userLegalAcceptanceStatus');
        if (accStatus && data.user_accepted) {
            accStatus.innerHTML = `<span class="text-nvidia fw-bold">✔ Đã ký xác nhận tuân thủ (Mã: ${data.user_accepted.clauses_version_hash} lúc ${data.user_accepted.accepted_at})</span>`;
        }

        renderLegalClausesList();
    } catch (e) {}
}

function onSearchLegalClauses() {
    loadLegalClauses(__currentAudienceFilter);
}

function filterLegalClauses(audience, btnEl) {
    document.querySelectorAll('#legalAudienceFilterBtns button').forEach(b => {
        b.className = 'btn btn-outline-secondary btn-sm';
    });
    if (btnEl) btnEl.className = 'btn btn-nvidia btn-sm fw-bold';
    loadLegalClauses(audience);
}

function renderLegalClausesList() {
    const box = document.getElementById('legalClausesContainer');
    if (!box) return;
    const canShowAdminTools = isCurrentSessionStrictAdmin() && __isAdminViewActive;

    if (!__allLegalClausesCache.length) {
        box.innerHTML = `
            <div class="col-12 text-center py-4 text-muted">
                Không tìm thấy điều khoản nào khớp từ khóa.
            </div>
        `;
        return;
    }

    const audBadgeMap = {
        'buyer': '<span class="badge bg-info text-dark">👤 Quyền lợi Người Mua</span>',
        'seller': '<span class="badge bg-warning text-dark">🏪 Nghĩa vụ Người Bán</span>',
        'ai_ethics': '<span class="badge bg-danger">🤖 Trọng Tài &amp; SOP</span>',
        'all': '<span class="badge bg-nvidia">🌐 Áp dụng Toàn Sàn</span>'
    };

    box.innerHTML = __allLegalClausesCache.map(c => {
        const audTag = audBadgeMap[c.audience] || audBadgeMap['all'];
        const ver = c.version || 1;
        const code = c.article_code || ('DIEU-' + c.id);
        const effDate = c.effective_date || (c.updated_at || '2026-11-10').slice(0, 10);
        const sopRef = c.sop_reference || `SOP-${code}`;

        /* Chỉ hiển thị nút Sửa/Xóa khi người dùng thực sự là Admin */
        const adminActions = canShowAdminTools ? `
            <button type="button" class="btn btn-warning btn-sm py-0 text-dark fw-bold admin-only-legal-action" onclick="prefillEditLegalClause(${c.id})">✏️ Sửa (v${Number(ver) + 1})</button>
            <button type="button" class="btn btn-outline-danger btn-sm py-0 admin-only-legal-action" onclick="deleteSingleLegalClause(${c.id}, '${code}')">🗑️</button>
        ` : '';

        return `
            <div class="col-md-6">
                <div class="nv-adaptive-card legal-clause-card p-3 h-100 d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 border-bottom pb-2">
                            <div class="d-flex flex-wrap align-items-center gap-1">
                                <span class="badge bg-dark font-monospace fs-6">${code}</span>
                                ${audTag}
                                <span class="badge bg-secondary">Phiên bản v${ver}</span>
                                <span class="badge bg-dark border border-secondary font-monospace" style="font-size:10px;">${sopRef}</span>
                            </div>
                            <div class="d-flex gap-1">
                                <button type="button" class="btn btn-outline-info btn-sm py-0" onclick="openClauseHistoryModal('${code}')">📜 Lịch sử (v${ver})</button>
                                ${adminActions}
                            </div>
                        </div>
                        <h6 class="fw-bold text-nvidia mb-2">${c.title}</h6>
                        <p class="small mb-2" style="white-space: pre-line; line-height: 1.58;">${c.content || c.description || ''}</p>
                    </div>
                    <div class="pt-2 border-top small d-flex flex-wrap justify-content-between align-items-center text-muted">
                        <span>📅 Hiệu lực: <strong>${effDate}</strong></span>
                        <span>📝 Ghi chú: <em>${c.change_note || 'Quy chuẩn chính thức'}</em></span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function openClauseHistoryModal(articleCode) {
    const modal = document.getElementById('legalHistoryModal');
    const titleEl = document.getElementById('legalHistoryModalTitle');
    const bodyEl = document.getElementById('legalHistoryModalBody');
    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.textContent = `📜 Lịch Sử Phiên Bản Điều Khoản [${articleCode}]`;
    bodyEl.innerHTML = `<div class="text-center py-3 text-muted">Đang tải lịch sử phiên bản...</div>`;
    modal.classList.remove('d-none');

    try {
        const res = await fetch(`/api/legal/history/${encodeURIComponent(articleCode)}`);
        const data = await res.json();
        const list = data.history || [];
        if (!list.length) {
            bodyEl.innerHTML = `<div class="text-muted py-3">Chưa có bản ghi lịch sử nào.</div>`;
            return;
        }
        bodyEl.innerHTML = list.map(h => `
            <div class="p-3 rounded-3 border mb-2" style="border-left: 4px solid #76b900 !important;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge bg-nvidia">Phiên bản v${h.version || 1} • Bởi: ${h.edited_by || 'Ban Quản Trị'}</span>
                    <small class="text-muted font-monospace">🕒 ${h.updated_at || ''}</small>
                </div>
                <div class="fw-bold text-nvidia">${h.title || ''}</div>
                <div class="small text-warning fw-semibold my-1">📌 Nội dung cập nhật: ${h.change_note || ''}</div>
                <div class="small text-muted" style="white-space: pre-line;">${h.content || ''}</div>
            </div>
        `).join('');
    } catch (e) {}
}

function prefillEditLegalClause(clauseId) {
    if (!isCurrentSessionStrictAdmin()) return;
    const c = __allLegalClausesCache.find(x => Number(x.id) === Number(clauseId));
    if (!c) return;
    document.getElementById('legEditId').value = c.id;
    document.getElementById('legArticleCode').value = c.article_code || '';
    document.getElementById('legAudience').value = c.audience || 'all';
    document.getElementById('legSopRef').value = c.sop_reference || `SOP-${c.article_code}`;
    document.getElementById('legEffectiveDate').value = (c.effective_date || '2026-11-15').slice(0, 10);
    document.getElementById('legTitle').value = c.title || '';
    document.getElementById('legContent').value = c.content || c.description || '';
    document.getElementById('legChangeNote').value = `Cập nhật phiên bản v${Number(c.version || 1) + 1}: `;
    document.getElementById('adminExclusiveLegalPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('legChangeNote')?.focus();
}

function resetAdminLegalForm() {
    if (!isCurrentSessionStrictAdmin()) return;
    document.getElementById('legEditId').value = '';
    document.getElementById('legArticleCode').value = 'DIEU-0' + (__allLegalClausesCache.length + 1);
    document.getElementById('legTitle').value = '';
    document.getElementById('legContent').value = '';
    document.getElementById('legChangeNote').value = '';
}

async function submitAdminLegalClause(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!isCurrentSessionStrictAdmin()) return;
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const editId = document.getElementById('legEditId').value.trim();
    const payload = {
        admin_user_id: user ? user.id : undefined,
        id: editId ? Number(editId) : undefined,
        article_code: document.getElementById('legArticleCode').value.trim().toUpperCase(),
        audience: document.getElementById('legAudience').value,
        sop_reference: document.getElementById('legSopRef').value.trim().toUpperCase(),
        effective_date: document.getElementById('legEffectiveDate').value,
        title: document.getElementById('legTitle').value.trim(),
        content: document.getElementById('legContent').value.trim(),
        change_note: document.getElementById('legChangeNote').value.trim(),
        edited_by: user ? (user.full_name || user.username) : 'Quản Trị Viên'
    };

    try {
        const res = await fetch('/api/legal/clauses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Lỗi lưu điều khoản!', 'warning');
            return;
        }
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        resetAdminLegalForm();
        loadLegalClauses(__currentAudienceFilter);
        loadAdminLegalEmailLogs();
    } catch (err) {}
}

async function deleteSingleLegalClause(clauseId, code) {
    if (!isCurrentSessionStrictAdmin()) return;
    if (!confirm(`Bạn có chắc muốn xóa điều khoản [${code}] khỏi hệ thống?`)) return;
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    try {
        const res = await fetch(`/api/legal/clauses/${clauseId}?admin_user_id=${user ? user.id : ''}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message, 'info');
            loadLegalClauses(__currentAudienceFilter);
        }
    } catch (e) {}
}

async function triggerAutoSyncLegalFromJson() {
    if (!isCurrentSessionStrictAdmin()) return;
    try {
        const res = await fetch('/api/legal/sync-json');
        const data = await res.json();
        if (res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            const ta = document.getElementById('manualLegalJsonTextarea');
            if (ta && data.clauses) ta.value = JSON.stringify(data.clauses, null, 2);
            loadLegalClauses(__currentAudienceFilter);
        }
    } catch (e) {}
}

function loadLegalJsonFileFromDisk(fileInput) {
    if (!isCurrentSessionStrictAdmin()) return;
    if (!fileInput || !fileInput.files || !fileInput.files.length) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const ta = document.getElementById('manualLegalJsonTextarea');
        if (ta) ta.value = ev.target.result;
        if (typeof notifyToast === 'function') notifyToast('📂 Đã đọc nội dung file JSON vào khung soạn thảo!', 'info');
    };
    reader.readAsText(fileInput.files[0], 'UTF-8');
}

async function submitManualLegalJsonImport() {
    if (!isCurrentSessionStrictAdmin()) return;
    const rawText = document.getElementById('manualLegalJsonTextarea')?.value.trim() || '';
    if (!rawText) {
        triggerAutoSyncLegalFromJson();
        return;
    }
    try {
        const parsed = JSON.parse(rawText);
        const clausesList = Array.isArray(parsed) ? parsed : (parsed.clauses || parsed.items || []);
        const res = await fetch('/api/legal/sync-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clauses: clausesList })
        });
        const data = await res.json();
        if (res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            loadLegalClauses(__currentAudienceFilter);
        }
    } catch (err) {
        if (typeof notifyToast === 'function') notifyToast('Cấu trúc JSON chưa hợp lệ: ' + err.message, 'warning');
    }
}

function exportLegalClausesJsonFile() {
    if (!__allLegalClausesCache.length) return;
    const blob = new Blob([JSON.stringify(__allLegalClausesCache, null, 2)], { type: 'application/json;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '4_dieu_khoan_phap_ly.json';
    a.click();
    if (typeof notifyToast === 'function') notifyToast('📥 Đã xuất tệp 4_dieu_khoan_phap_ly.json!', 'success');
}

async function submitUserLegalAcceptance() {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const payload = {
        user_id: user && user.id ? user.id : 1,
        user_name: user ? (user.full_name || user.username) : 'Khách mua hàng',
        role: user ? (user.role || 'buyer') : 'buyer'
    };
    try {
        const res = await fetch('/api/legal/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            loadLegalClauses(__currentAudienceFilter);
        }
    } catch (e) {}
}

async function loadAdminLegalEmailLogs() {
    if (!isCurrentSessionStrictAdmin()) return;
    const tbody = document.getElementById('adminLegalEmailLogsBody');
    const badge = document.getElementById('legalTotalNotifBadge');
    if (!tbody) return;
    try {
        const res = await fetch('/api/legal/email-logs');
        if (!res.ok) return;
        const data = await res.json();
        if (badge) badge.textContent = `${data.total_broadcast_notifications || 0} thông báo`;
        const logs = data.email_logs || [];
        if (!logs.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Chưa có lịch sử phát tán Email.</td></tr>`;
            return;
        }
        tbody.innerHTML = logs.map(l => `
            <tr>
                <td class="fw-bold font-monospace">${l.article_code || 'DIEU'}</td>
                <td>${l.recipient_email}</td>
                <td><span class="badge bg-dark border border-secondary">${l.delivery_mode}</span></td>
                <td><span class="badge bg-success">${l.status}</span></td>
            </tr>
        `).join('');
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    initLegalRolePerspective();
    loadLegalClauses('all');
    if (isCurrentSessionStrictAdmin()) {
        loadAdminLegalEmailLogs();
    }
});