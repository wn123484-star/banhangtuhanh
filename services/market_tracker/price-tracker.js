var __vnTechCurrentProductId = 1;
var __vnTechChartMode = 'candlestick';
var __vnTechOverviewData = null;

function _getTrackerCurrentUserKey() {
    try {
        var u = typeof getAuthUser === 'function' ? getAuthUser() : null;
        if (u && (u.username || u.id)) {
            return String(u.username || u.id);
        }
    } catch (e) {}
    return 'khach_hang_vip';
}

function _formatTrackerVND(val) {
    if (typeof formatVND === 'function') return formatVND(val);
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
}

async function loadVnTechMarketOverview(productId) {
    var pid = Number(productId || __vnTechCurrentProductId || 1);
    __vnTechCurrentProductId = pid;
    var userKey = _getTrackerCurrentUserKey();

    try {
        var res = await fetch('/api/market-tracker/overview?product_id=' + encodeURIComponent(pid) + '&user_id=' + encodeURIComponent(userKey) + '&_t=' + Date.now(), {
            cache: 'no-store'
        });
        var data = await res.json();
        if (!data || !data.ok) return;
        __vnTechOverviewData = data;

        // 1. Render băng điện tử VN-TECH INDEX
        var idx = data.vn_tech_index || {};
        var idxBadge = document.getElementById('vnTechIndexPointsBadge');
        if (idxBadge) {
            var sign = Number(idx.change_pct || 0) >= 0 ? '+' : '';
            idxBadge.textContent = Number(idx.index_points || 1284.65).toLocaleString('en-US') + ' điểm (' + sign + Number(idx.change_pct || -1.26) + '%)';
        }
        var updBadge = document.getElementById('vnTechUpdatedAtBadge');
        if (updBadge) updBadge.textContent = 'Cập nhật: ' + (idx.updated_at || new Date().toLocaleTimeString('vi-VN'));
        var sentEl = document.getElementById('vnTechSentimentText');
        if (sentEl && idx.market_sentiment) sentEl.textContent = idx.market_sentiment;

        // 2. Render Select sản phẩm
        var selEl = document.getElementById('vnTechProductSelect');
        if (selEl && Array.isArray(data.catalog) && data.catalog.length) {
            selEl.innerHTML = data.catalog.map(function (c) {
                var selectedAttr = Number(c.id) === Number(data.selected_product.id) ? 'selected' : '';
                return '<option value="' + c.id + '" ' + selectedAttr + '>#' + c.id + ' - ' + c.name + ' (' + _formatTrackerVND(c.price) + ')</option>';
            }).join('');
        }

        // 3. Render thông số sản phẩm đang chọn
        var sp = data.selected_product || {};
        __vnTechCurrentProductId = Number(sp.id || pid);
        var nvP = document.getElementById('statNvStorePrice');
        if (nvP) nvP.textContent = _formatTrackerVND(sp.nv_store_price);
        var savEl = document.getElementById('statSavingVsVn');
        if (savEl) savEl.textContent = 'Tiết kiệm ' + _formatTrackerVND(sp.saving_vs_vn_market) + ' (-' + Number(sp.saving_pct || 0) + '%)';
        var vnAvgEl = document.getElementById('statVnMarketAvg');
        if (vnAvgEl) vnAvgEl.textContent = _formatTrackerVND(sp.vn_market_avg_price);
        var lhEl = document.getElementById('statLowHigh30d');
        if (lhEl) lhEl.textContent = _formatTrackerVND(sp.low_30d) + ' / ' + _formatTrackerVND(sp.high_30d);
        var maEl = document.getElementById('statMa7Ma30');
        if (maEl) maEl.textContent = 'MA7: ' + _formatTrackerVND(sp.ma7) + ' • MA30: ' + _formatTrackerVND(sp.ma30);

        var goBtn = document.getElementById('btnGoToSelectedProduct');
        if (goBtn) goBtn.href = '/services/product/product-detail.html?id=' + sp.id;
        var titleEl = document.getElementById('chartSelectedProductTitle');
        if (titleEl) titleEl.textContent = '📊 Lịch sử giá 30 phiên: ' + (sp.name || '');

        var wfLabel = document.getElementById('watchFormProductLabel');
        if (wfLabel) wfLabel.textContent = 'Sản phẩm đang chọn: #' + sp.id + ' — ' + (sp.name || '');

        var ai = data.ai_recommendation || {};
        var aiBadge = document.getElementById('aiSignalBadge');
        if (aiBadge) {
            aiBadge.textContent = ai.badge_text || '🟢 KHUYẾN NGHỊ AI';
            aiBadge.style.backgroundColor = ai.color || '#22c55e';
            aiBadge.style.color = '#061108';
        }
        var aiTargetLbl = document.getElementById('aiSuggestedTargetLabel');
        if (aiTargetLbl) aiTargetLbl.textContent = 'Mốc canh mua đề xuất: ' + _formatTrackerVND(ai.suggested_target_price || sp.nv_store_price * 0.93);
        var aiSum = document.getElementById('aiRecommendationSummary');
        if (aiSum) aiSum.textContent = ai.summary || '';

        var targetInp = document.getElementById('watchTargetPriceInput');
        if (targetInp && (!targetInp.value || Number(targetInp.getAttribute('data-for-pid')) !== Number(sp.id))) {
            targetInp.value = Math.round(Number(ai.suggested_target_price || sp.nv_store_price * 0.93));
            targetInp.setAttribute('data-for-pid', String(sp.id));
        }

        // 4. Vẽ biểu đồ Canvas
        drawVnTechStockChart();

        // 5. Render Top Giảm Sâu & Top Sốt Giá
        renderMoversLists(data.top_drops || [], data.top_gainers || []);

        // 6. Render Watchlist & Quota
        renderWatchlistPanel(data.watchlist_summary || {});
    } catch (err) {
        console.warn('loadVnTechMarketOverview error:', err);
    }
}

function renderMoversLists(topDrops, topGainers) {
    var dropsBox = document.getElementById('topDropsContainer');
    if (dropsBox) {
        dropsBox.innerHTML = topDrops.map(function (m) {
            return (
                '<div class="vntech-mover-row p-2 border-bottom d-flex justify-content-between align-items-center" onclick="onSelectTrackerProduct(' + m.id + ')">' +
                    '<div class="text-truncate pe-2" style="max-width: 65%;">' +
                        '<div class="fw-bold text-light text-truncate">' + m.name + '</div>' +
                        '<small class="text-muted">TB Thị trường VN: <del>' + _formatTrackerVND(m.vn_market_avg_price) + '</del></small>' +
                    '</div>' +
                    '<div class="text-end">' +
                        '<div class="fw-bold text-nvidia">' + _formatTrackerVND(m.price) + '</div>' +
                        '<span class="badge bg-success">Rẻ hơn VN -' + m.saving_vs_vn_pct + '%</span>' +
                    '</div>' +
                '</div>'
            );
        }).join('');
    }

    var gainBox = document.getElementById('topGainersContainer');
    if (gainBox) {
        gainBox.innerHTML = topGainers.map(function (m) {
            return (
                '<div class="vntech-mover-row p-2 border-bottom d-flex justify-content-between align-items-center" onclick="onSelectTrackerProduct(' + m.id + ')">' +
                    '<div class="text-truncate pe-2" style="max-width: 65%;">' +
                        '<div class="fw-bold text-light text-truncate">' + m.name + '</div>' +
                        '<small class="text-info">Khối lượng khớp 24h: ' + m.volume_24h + ' chiếc</small>' +
                    '</div>' +
                    '<div class="text-end">' +
                        '<div class="fw-bold text-warning">' + _formatTrackerVND(m.price) + '</div>' +
                        '<span class="badge bg-info text-dark">' + (m.change_30d_pct >= 0 ? '+' : '') + m.change_30d_pct + '% (30N)</span>' +
                    '</div>' +
                '</div>'
            );
        }).join('');
    }
}

function renderWatchlistPanel(wData) {
    var items = wData.items || wData.watchlist || [];
    var used = Number(wData.used_quota || items.length || 0);
    var maxQ = Number(wData.max_quota || 6);

    var qBadge = document.getElementById('watchlistQuotaBadge');
    if (qBadge) {
        qBadge.textContent = 'Quota: ' + used + '/' + maxQ + ' vật phẩm';
        qBadge.className = used >= maxQ ? 'badge bg-danger fw-bold' : 'badge bg-warning text-dark fw-bold';
    }

    var box = document.getElementById('watchlistItemsContainer');
    if (!box) return;

    if (!items.length) {
        box.innerHTML = (
            '<div class="p-3 rounded-3 border text-center text-muted small">' +
                'Bạn chưa gắn theo dõi vật phẩm nào (0/' + maxQ + '). Hãy chọn sản phẩm và bấm <strong>🔔 Gắn Theo Dõi & Đặt Giá Mục Tiêu</strong>!' +
            '</div>'
        );
        return;
    }

    box.innerHTML = items.map(function (item) {
        var trigClass = item.is_triggered ? 'vntech-watchlist-card triggered-red-alert p-3' : 'vntech-watchlist-card p-3';
        var badgeClass = item.is_triggered ? 'badge bg-danger fw-bold mb-1' : 'badge bg-secondary mb-1';
        return (
            '<div class="' + trigClass + '">' +
                '<div class="d-flex justify-content-between align-items-start gap-2">' +
                    '<span class="' + badgeClass + '">' + (item.status_badge || '🔔 Đang canh giá') + '</span>' +
                    '<button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="removeWatchlistItem(' + item.product_id + ')" title="Gỡ khỏi danh sách">' +
                        '✕' +
                    '</button>' +
                '</div>' +
                '<div class="fw-bold text-light small mb-1" style="cursor:pointer;" onclick="onSelectTrackerProduct(' + item.product_id + ')">' +
                    '#' + item.product_id + ' - ' + item.name +
                '</div>' +
                '<div class="d-flex justify-content-between small mb-2">' +
                    '<span class="text-muted">Giá hiện tại: <strong class="text-nvidia">' + _formatTrackerVND(item.current_price) + '</strong></span>' +
                    '<span class="text-muted">Mục tiêu: <strong class="text-warning">' + _formatTrackerVND(item.target_price) + '</strong></span>' +
                '</div>' +
                '<div class="d-flex gap-2">' +
                    '<a href="/services/product/product-detail.html?id=' + item.product_id + '" class="btn btn-nvidia btn-sm fw-bold flex-grow-1 py-1">' +
                        (item.is_triggered ? '⚡ MUA NGAY GIÁ ĐÁY' : '🔍 Xem Sản Phẩm') +
                    '</a>' +
                    '<button type="button" class="btn btn-outline-danger btn-sm py-1" onclick="simulateMarketFlashDropDemo(' + item.product_id + ')" title="Giả lập sập giá sản phẩm này">' +
                        '📉 Hạ Giá Demo' +
                    '</button>' +
                '</div>' +
            '</div>'
        );
    }).join('');
}

function drawVnTechStockChart() {
    var canvas = document.getElementById('vntechMainChartCanvas');
    if (!canvas || !__vnTechOverviewData || !Array.isArray(__vnTechOverviewData.history)) return;
    var ctx = canvas.getContext('2d');
    var hist = __vnTechOverviewData.history;
    if (!hist.length) return;

    var W = canvas.width;
    var H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Nền bảng điện tử chứng khoán
    ctx.fillStyle = '#060b14';
    ctx.fillRect(0, 0, W, H);

    var padL = 78;
    var padR = 24;
    var padT = 24;
    var padB = 42;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;

    var allPrices = [];
    hist.forEach(function (d) {
        allPrices.push(Number(d.low_price), Number(d.high_price), Number(d.vn_market_avg_price), Number(d.ma7), Number(d.ma30));
    });
    var minP = Math.min.apply(null, allPrices) * 0.985;
    var maxP = Math.max.apply(null, allPrices) * 1.015;
    if (maxP <= minP) maxP = minP + 1000000;

    function yOfPrice(p) {
        return padT + plotH - ((p - minP) / (maxP - minP)) * plotH;
    }

    // Lưới ngang & Nhãn giá VNĐ
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    for (var g = 0; g <= 5; g++) {
        var pVal = minP + ((maxP - minP) * (5 - g)) / 5;
        var yGrid = padT + (plotH * g) / 5;
        ctx.beginPath();
        ctx.moveTo(padL, yGrid);
        ctx.lineTo(W - padR, yGrid);
        ctx.stroke();
        var shortM = (pVal / 1000000).toFixed(1) + 'Tr';
        ctx.fillText(shortM, 10, yGrid + 4);
    }

    var n = hist.length;
    var stepX = plotW / Math.max(1, n);

    if (__vnTechChartMode === 'candlestick') {
        // Vẽ từng cây nến Nhật OHLC
        for (var i = 0; i < n; i++) {
            var item = hist[i];
            var cx = padL + i * stepX + stepX * 0.5;
            var yHigh = yOfPrice(item.high_price);
            var yLow = yOfPrice(item.low_price);
            var yOpen = yOfPrice(item.open_price);
            var yClose = yOfPrice(item.close_price);

            var isBull = Number(item.close_price) >= Number(item.open_price);
            var color = isBull ? '#22c55e' : '#ef4444';

            ctx.strokeStyle = color;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(cx, yHigh);
            ctx.lineTo(cx, yLow);
            ctx.stroke();

            var bodyTop = Math.min(yOpen, yClose);
            var bodyH = Math.max(3, Math.abs(yClose - yOpen));
            var candleW = Math.max(5, stepX * 0.58);
            ctx.fillStyle = color;
            ctx.fillRect(cx - candleW / 2, bodyTop, candleW, bodyH);

            if (i % 5 === 0 || i === n - 1) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px monospace';
                ctx.fillText(String(item.date_str).slice(5), cx - 14, H - 14);
            }
        }
    } else {
        // Biểu đồ Line so sánh Giá Nivida Store vs Giá TB Thị Trường Việt Nam
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (var j = 0; j < n; j++) {
            var lx = padL + j * stepX + stepX * 0.5;
            var ly = yOfPrice(hist[j].close_price);
            if (j === 0) ctx.moveTo(lx, ly);
            else ctx.lineTo(lx, ly);
            if (j % 5 === 0 || j === n - 1) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px monospace';
                ctx.fillText(String(hist[j].date_str).slice(5), lx - 14, H - 14);
            }
        }
        ctx.stroke();
    }

    // Đường MA7 (Vàng)
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (var m7 = 0; m7 < n; m7++) {
        var x7 = padL + m7 * stepX + stepX * 0.5;
        var y7 = yOfPrice(hist[m7].ma7);
        if (m7 === 0) ctx.moveTo(x7, y7);
        else ctx.lineTo(x7, y7);
    }
    ctx.stroke();

    // Đường Giá TB Thị Trường Việt Nam (Xanh dương nét đứt)
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var mv = 0; mv < n; mv++) {
        var xv = padL + mv * stepX + stepX * 0.5;
        var yv = yOfPrice(hist[mv].vn_market_avg_price);
        if (mv === 0) ctx.moveTo(xv, yv);
        else ctx.lineTo(xv, yv);
    }
    ctx.stroke();
    ctx.restore();
}

function bindChartHoverInspector() {
    var canvas = document.getElementById('vntechMainChartCanvas');
    var infoBar = document.getElementById('vntechChartHoverBar');
    if (!canvas || !infoBar) return;

    canvas.addEventListener('mousemove', function (ev) {
        if (!__vnTechOverviewData || !Array.isArray(__vnTechOverviewData.history)) return;
        var hist = __vnTechOverviewData.history;
        if (!hist.length) return;
        var rect = canvas.getBoundingClientRect();
        var relX = ((ev.clientX - rect.left) / rect.width) * canvas.width;
        var padL = 78;
        var padR = 24;
        var plotW = canvas.width - padL - padR;
        var idx = Math.floor(((relX - padL) / plotW) * hist.length);
        if (idx >= 0 && idx < hist.length) {
            var c = hist[idx];
            infoBar.innerHTML = (
                '📅 <strong>' + c.date_str + '</strong> | ' +
                'Open: <strong>' + _formatTrackerVND(c.open_price) + '</strong> • ' +
                'High: <strong class="text-success">' + _formatTrackerVND(c.high_price) + '</strong> • ' +
                'Low: <strong class="text-danger">' + _formatTrackerVND(c.low_price) + '</strong> • ' +
                'Giá Nivida: <strong class="text-nvidia">' + _formatTrackerVND(c.close_price) + '</strong> • ' +
                'TB Thị Trường VN: <strong class="text-info">' + _formatTrackerVND(c.vn_market_avg_price) + '</strong>'
            );
        }
    });
}

function onSelectTrackerProduct(productId) {
    loadVnTechMarketOverview(Number(productId || 1));
}

function switchVnTechChartMode(mode) {
    __vnTechChartMode = mode === 'line' ? 'line' : 'candlestick';
    var btnC = document.getElementById('btnChartModeCandle');
    var btnL = document.getElementById('btnChartModeLine');
    if (btnC && btnL) {
        btnC.className = __vnTechChartMode === 'candlestick' ? 'btn btn-nvidia fw-bold' : 'btn btn-outline-nvidia fw-bold';
        btnL.className = __vnTechChartMode === 'line' ? 'btn btn-info text-dark fw-bold' : 'btn btn-outline-info fw-bold';
    }
    drawVnTechStockChart();
}

function prefillTargetPriceFromCurrent() {
    var inp = document.getElementById('watchTargetPriceInput');
    if (inp && __vnTechOverviewData && __vnTechOverviewData.selected_product) {
        var suggested = Math.round(Number(__vnTechOverviewData.selected_product.nv_store_price || 1000000) * 0.93);
        inp.value = suggested;
        inp.focus();
    }
    addOrUpdateWatchlistItem();
}

async function addOrUpdateWatchlistItem() {
    var inp = document.getElementById('watchTargetPriceInput');
    var targetPrice = Number((inp && inp.value) || 0);
    var userKey = _getTrackerCurrentUserKey();

    try {
        var res = await fetch('/api/market-tracker/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add',
                user_id: userKey,
                product_id: __vnTechCurrentProductId,
                target_price: targetPrice
            })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) {
            if (typeof notifyToast === 'function') {
                notifyToast(data.error || 'Không thể gắn theo dõi sản phẩm!', 'warning');
            } else {
                alert(data.error || 'Không thể gắn theo dõi sản phẩm!');
            }
            return;
        }
        renderWatchlistPanel(data);
        if (typeof notifyToast === 'function') {
            notifyToast(data.message || '🔔 Đã gắn theo dõi giá sản phẩm thành công!', 'success');
        }
    } catch (e) {}
}

async function removeWatchlistItem(productId) {
    var userKey = _getTrackerCurrentUserKey();
    try {
        var res = await fetch('/api/market-tracker/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'remove',
                user_id: userKey,
                product_id: Number(productId)
            })
        });
        var data = await res.json();
        if (data && data.ok) {
            renderWatchlistPanel(data);
            if (typeof notifyToast === 'function') {
                notifyToast(data.message || 'Đã gỡ sản phẩm khỏi danh sách theo dõi!', 'info');
            }
        }
    } catch (e) {}
}

async function simulateMarketFlashDropDemo(optionalProductId) {
    var pid = Number(optionalProductId || __vnTechCurrentProductId || 1);
    var userKey = _getTrackerCurrentUserKey();

    try {
        var res = await fetch('/api/market-tracker/simulate-flash-drop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userKey,
                product_id: pid,
                drop_percent: 16
            })
        });
        var data = await res.json();
        if (data && data.ok) {
            if (typeof notifyToast === 'function') {
                notifyToast(data.message || '🚨 Báo động giảm giá chạm mốc mục tiêu!', 'danger');
            }
            if (typeof window.refreshGlobalPriceAlertBell === 'function') {
                window.refreshGlobalPriceAlertBell(true);
            }
            await loadVnTechMarketOverview(pid);
        }
    } catch (e) {}
}

window.onSelectTrackerProduct = onSelectTrackerProduct;
window.switchVnTechChartMode = switchVnTechChartMode;
window.prefillTargetPriceFromCurrent = prefillTargetPriceFromCurrent;
window.addOrUpdateWatchlistItem = addOrUpdateWatchlistItem;
window.removeWatchlistItem = removeWatchlistItem;
window.simulateMarketFlashDropDemo = simulateMarketFlashDropDemo;

document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);
    var initPid = Number(params.get('product_id') || params.get('id') || 1);
    bindChartHoverInspector();
    loadVnTechMarketOverview(initPid);
});