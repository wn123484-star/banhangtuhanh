/* [FEAT-HDR-001] & [FEAT-MKT-006] Trình Xây Dựng Cấu Hình PC 8 Khe & Chẩn Đoán Nghẽn Cổ Chai AI | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/pc-builder/parts / products / pc-builder.js | [LOCKED-DESIGN] */
const PC_SLOT_META = [
    { key: 'cpu', label: '1. Vi xử lý (CPU)', icon: '🧠' },
    { key: 'mainboard', label: '2. Bo mạch chủ (Mainboard)', icon: '🎛️' },
    { key: 'gpu', label: '3. Card đồ họa (VGA / GPU)', icon: '🎮' },
    { key: 'ram', label: '4. Bộ nhớ trong (RAM)', icon: '⚡' },
    { key: 'ssd', label: '5. Ổ cứng SSD NVMe', icon: '💾' },
    { key: 'psu', label: '6. Nguồn máy tính (PSU)', icon: '🔌' },
    { key: 'case', label: '7. Vỏ thùng máy (Case)', icon: '🖥️' },
    { key: 'monitor', label: '8. Màn hình Gaming (Monitor)', icon: '🖵' }
];

let __pcCatalogBySlot = {};
let __selectedPcBuild = {};

async function renderSlots() {
    const container = document.getElementById('pcSlotsContainer');
    if (!container) return;
    try {
        const res = await fetch('/api/pc-builder/parts');
        const data = await res.json();
        __pcCatalogBySlot = data.slots || {};
        PC_SLOT_META.forEach(s => {
            const list = __pcCatalogBySlot[s.key] || [];
            if (list.length && !__selectedPcBuild[s.key]) {
                __selectedPcBuild[s.key] = list[0];
            }
        });
    } catch (e) {}
    container.innerHTML = PC_SLOT_META.map(s => {
        const options = __pcCatalogBySlot[s.key] || [];
        const chosen = __selectedPcBuild[s.key] || null;
        return `
            <div class="card border-0 shadow-sm rounded-4 p-3">
                <div class="row g-2 align-items-center">
                    <div class="col-md-4">
                        <div class="fw-bold">${s.icon} ${s.label}</div>
                        <small class="text-muted">${chosen ? ('Bảo hành: ' + (chosen.warranty || '36 tháng') + ' • ĐVT: ' + (chosen.unit || 'Chiếc')) : 'Chưa chọn linh kiện'}</small>
                    </div>
                    <div class="col-md-5">
                        <select class="form-select form-select-sm" onchange="selectSlotPart('${s.key}', this.value)">
                            <option value="">-- Không chọn --</option>
                            ${options.map(item => `
                                <option value="${item.id}" ${chosen && Number(chosen.id) === Number(item.id) ? 'selected' : ''}>
                                    ${item.name} (${formatVND(item.price)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="col-md-3 text-md-end">
                        <div class="fw-bold text-nvidia">${chosen ? formatVND(chosen.price) : '0đ'}</div>
                        ${chosen && chosen.socket ? `<span class="badge bg-dark">${chosen.socket}</span>` : ''}
                        ${chosen && chosen.tdp ? `<span class="badge bg-secondary">${chosen.tdp}W</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    updateTotalCost();
}

function selectSlotPart(slotKey, prodId) {
    if (!prodId) {
        delete __selectedPcBuild[slotKey];
    } else {
        const list = __pcCatalogBySlot[slotKey] || [];
        const found = list.find(x => String(x.id) === String(prodId));
        if (found) __selectedPcBuild[slotKey] = found;
    }
    renderSlots();
}

function updateTotalCost() {
    let total = 0;
    let totalWatts = 75;
    Object.values(__selectedPcBuild).forEach(item => {
        if (!item) return;
        total += Number(item.price || 0);
        totalWatts += Number(item.tdp || 0);
    });
    const totalEl = document.getElementById('buildTotalAmount');
    if (totalEl) totalEl.textContent = formatVND(total);
    const wattEl = document.getElementById('pcTotalWattageBadge');
    if (wattEl) wattEl.textContent = totalWatts + 'W';
    const cpu = __selectedPcBuild.cpu;
    const main = __selectedPcBuild.mainboard;
    const compatEl = document.getElementById('pcCompatStatusBadge');
    if (compatEl) {
        if (cpu && main && cpu.socket && main.socket && cpu.socket !== main.socket) {
            compatEl.className = 'badge bg-danger p-2';
            compatEl.textContent = `⚠️ Lệch Socket (${cpu.socket} ≠ ${main.socket})`;
        } else {
            compatEl.className = 'badge bg-success p-2';
            compatEl.textContent = '✅ Tương thích chuẩn';
        }
    }
}

async function runAiCompatibilityCheck() {
    const box = document.getElementById('pcAiBottleneckBox');
    if (box) box.textContent = '⏳ Đang chạy AI phân tích nghẽn cổ chai (Bottleneck) & kiểm tra xung đột phần cứng...';
    try {
        const res = await fetch('/api/pc-builder/check-bottleneck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parts: __selectedPcBuild })
        });
        const data = await res.json();
        if (box) {
            box.innerHTML = `<div class="fw-bold text-success mb-1">🤖 Báo Cáo Kỹ Sư Phần Cứng AI (Bottleneck: ${data.bottleneck_pct}%):</div>` + (data.ai_analysis || '');
        }
    } catch (e) {
        if (box) box.textContent = 'Không thể kết nối máy chủ phân tích AI.';
    }
}

function addAllBuildToCart() {
    const items = Object.values(__selectedPcBuild).filter(Boolean);
    if (!items.length) {
        if (typeof notifyToast === 'function') notifyToast('Vui lòng chọn ít nhất 1 linh kiện!', 'warning');
        return;
    }
    items.forEach(item => {
        if (typeof addToCartGlobal === 'function') {
            addToCartGlobal({
                id: item.id,
                name: item.name,
                price: item.price,
                unit: item.unit || 'Chiếc',
                warranty: item.warranty || '36 tháng',
                category: item.slot || 'pc_part',
                image_url: item.image_url || '/assets/icons/package.svg'
            }, { silent: true });
        }
    });
    if (typeof notifyToast === 'function') {
        notifyToast(`Đã thêm trọn bộ ${items.length} linh kiện PC vào Giỏ hàng!`, 'success');
    }
}

function exportBuildQuote() {
    const modal = document.getElementById('pcQuoteModal');
    const body = document.getElementById('pcQuoteModalBody');
    if (!modal || !body) return;
    const items = Object.values(__selectedPcBuild).filter(Boolean);
    let sum = 0;
    const rowsHtml = items.map((it, idx) => {
        sum += Number(it.price || 0);
        return `
            <tr>
                <td>${idx + 1}</td>
                <td class="fw-semibold">${it.name}</td>
                <td>${it.unit || 'Chiếc'}</td>
                <td>${it.warranty || '36 tháng'}</td>
                <td class="text-end fw-bold">${formatVND(it.price)}</td>
            </tr>
        `;
    }).join('');
    body.innerHTML = `
        <table class="table table-sm table-bordered align-middle mb-2">
            <thead class="table-dark">
                <tr><th>#</th><th>Tên Linh Kiện</th><th>ĐVT</th><th>Bảo Hành</th><th class="text-end">Đơn Giá</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
                <tr><th colspan="4" class="text-end">Tổng cộng cấu hình:</th><th class="text-end text-success fs-6">${formatVND(sum)}</th></tr>
            </tfoot>
        </table>
    `;
    modal.classList.remove('d-none');
}

document.addEventListener('DOMContentLoaded', () => {
    renderSlots();
});