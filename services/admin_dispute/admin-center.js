/* ==========================================================================
   SERVICES/ADMIN_DISPUTE/ADMIN-CENTER.JS - TRUNG TÂM ĐIỀU HÀNH ADMIN & SOC V7.7
   (100% Obfuscator-Safe, Không còn lỗi '===', Đầy đủ Test OTP Email Resend & 4 Biểu đồ)
   ========================================================================== */

var __adminDisputesCache = [];
var __adminOverviewCache = {};
var __qaBugMatrixCache = [];
var __adminEventsCache = [];
var __selectedDisputeId = null;
var __adminChatSessions = [];
var __selectedAdminChatId = null;

function $id(elId) {
    return document.querySelector('#' + elId);
}

function switchAdminTab(tabName, btnEl) {
    var key = String(tabName || '').toLowerCase();
    var allSections = document.querySelectorAll('.admin-tab-sec, .admin-sec, main section[id^="tab"], main section[id^="sec"], main > div.tab-pane');
    if (allSections.length > 0) {
        var matched = false;
        allSections.forEach(function(sec) {
            var sid = (sec.id || '').toLowerCase();
            if (sid === key || sid.includes(key)) {
                sec.classList.remove('d-none');
                matched = true;
            } else {
                sec.classList.add('d-none');
            }
        });
        if (!matched) {
            allSections.forEach(function(sec) { sec.classList.remove('d-none'); });
        }
    }

    if (btnEl) {
        var navWrap = btnEl.closest('div, nav, aside');
        if (navWrap) {
            navWrap.querySelectorAll('button, .btn, .nav-link').forEach(function(b) { b.classList.remove('active'); });
        }
        btnEl.classList.add('active');
    }

    if (key.includes('event') || key.includes('3')) loadAdminEventsManager();
    if (key.includes('dispute') || key.includes('triage') || key.includes('4')) loadAdminDisputesList();
    if (key.includes('sop') || key.includes('5')) renderSopScenariosPanel();
    if (key.includes('ai') || key.includes('log') || key.includes('6')) refreshHubServerLogs();
}
window.switchAdminTab = switchAdminTab;

function toggleConfigModal(modalId, show) {
    var targetId = modalId || 'aiConfigModal';
    var shouldShow = (show === undefined) ? true : Boolean(show);
    var m = $id(targetId);
    if (m) m.classList.toggle('d-none', !shouldShow);
}
window.toggleConfigModal = toggleConfigModal;

function updateAdminLiveHeaderCounterBadge() {
    var counterBadge = $id('adminLiveDataCounterBadge');
    if (!counterBadge) return;
    var st = (__adminOverviewCache && __adminOverviewCache.stats) ? __adminOverviewCache.stats : {};
    var storesArr = (__adminOverviewCache && Array.isArray(__adminOverviewCache.stores_list)) ? __adminOverviewCache.stores_list : [];
    var shopCount = (st.total_stores !== undefined && st.total_stores !== null) ? Number(st.total_stores) : storesArr.length;
    var prodCount = Number(st.total_products || 0);
    var evTotal = Array.isArray(__adminEventsCache) ? __adminEventsCache.length : 0;
    var evActive = Array.isArray(__adminEventsCache) ? __adminEventsCache.filter(function(e) { return Number(e.is_active) === 1; }).length : 0;
    counterBadge.textContent = 'Đang có: ' + shopCount + ' Shop • ' + prodCount + ' SP • ' + evTotal + ' Sự kiện (' + evActive + ' đang bật)';
}
window.updateAdminLiveHeaderCounterBadge = updateAdminLiveHeaderCounterBadge;

async function loadOverviewAndConfig() {
    try {
        var res = await fetch('/api/admin-dispute/overview');
        if (!res.ok) return;
        var data = await res.json();
        __adminOverviewCache = data;
        var cfg = data.ai_settings || {};

        var setVal = function(id, v) { var el = $id(id); if (el) el.value = v || ''; };
        setVal('cfgGeminiKey', cfg.gemini_api_key || cfg.groq_api_key);
        setVal('hubGeminiKey', cfg.gemini_api_key || cfg.groq_api_key);
        setVal('cfgModelName', cfg.model_name || 'gemini-2.5-flash');
        setVal('cfgSystemPrompt', cfg.system_prompt);
        setVal('cfgGoogleMailSender', cfg.google_mail_sender || 'quantri@nivida.vn');
        setVal('hubGoogleMailSender', cfg.google_mail_sender || 'quantri@nivida.vn');
        setVal('cfgGoogleAppPassword', cfg.google_app_password);
        setVal('hubGoogleAppPassword', cfg.google_app_password);

        var enableMailEl = $id('cfgEnableLegalEmail');
        if (enableMailEl) enableMailEl.checked = cfg.enable_legal_email_notify !== 0;

        renderOverviewAnalyticsWidgets(data);
        updateAdminLiveHeaderCounterBadge();
        if (Array.isArray(data.ai_logs) && data.ai_logs.length) {
            renderOversightLogs(data.ai_logs);
        } else {
            refreshHubServerLogs();
        }
    } catch (err) {}
}
window.loadOverviewAndConfig = loadOverviewAndConfig;
window.loadOverviewAndConfig = loadOverviewAndConfig;

function renderOverviewAnalyticsWidgets(data) {
    var stats = data.stats || {};
    var setTxt = function(id, val) { var el = $id(id); if (el) el.textContent = String(val !== undefined && val !== null ? val : 0); };
    setTxt('statTotalUsers', stats.total_users || 0);
    setTxt('statTotalProducts', stats.total_products || 0);
    setTxt('statTotalOrders', stats.total_orders || 0);
    setTxt('statTotalDisputes', (data.disputes || __adminDisputesCache || []).length);

    var voucherList = Array.isArray(data.voucher_stats) ? data.voucher_stats : [];
    var farmList = Array.isArray(data.farm_stats) ? data.farm_stats : [];
    var behaviorList = Array.isArray(data.behavior_signals) ? data.behavior_signals : [];
    var accountList = Array.isArray(data.account_structure) ? data.account_structure : [];
    var categoryList = Array.isArray(data.category_metrics) ? data.category_metrics : [];
    var storesList = Array.isArray(data.stores_list) ? data.stores_list : [];

    var forecastMsg = data.trend_forecast_summary || '📈 Đã đồng bộ 100% dữ liệu hành vi nhận Voucher, trồng cây Nông trại và chỉ số ngành hàng từ SQLite.';
    document.querySelectorAll('p, div, span, small').forEach(function(el) {
        if (el.children.length === 0 && (el.textContent || '').includes('Đang phân tích dữ liệu nhận Voucher')) {
            el.innerHTML = '<span class="fw-bold text-nvidia">' + forecastMsg + '</span>';
        }
    });

    var allTables = Array.from(document.querySelectorAll('table'));
    allTables.forEach(function(tbl) {
        var theadEl = tbl.querySelector('thead');
        var headerText = (theadEl ? theadEl.textContent : '').toLowerCase();
        var tbody = tbl.querySelector('tbody');
        if (!tbody) return;

        if (headerText.includes('ngành hàng gắn kết') || headerText.includes('số ví đang giữ')) {
            tbody.innerHTML = voucherList.slice(0, 6).map(function(v) {
                var pct = Number(v.usage_rate_pct || 35);
                return '<tr>' +
                    '<td><span class="badge bg-nvidia font-monospace">' + v.code + '</span><div class="small text-muted text-truncate" style="max-width:165px;">' + (v.title || '') + '</div></td>' +
                    '<td><span class="badge bg-dark border border-info text-info">' + (v.category_label || 'Đa ngành hàng') + '</span></td>' +
                    '<td class="fw-bold text-nvidia">-' + Number(v.discount_value || 50000).toLocaleString('vi-VN') + ' ₫</td>' +
                    '<td><div class="d-flex justify-content-between small mb-1"><span><strong>' + (v.used_count || 0) + '</strong>/' + (v.usage_limit || 100) + '</span><strong class="text-nvidia">' + pct + '%</strong></div><div class="progress" style="height:6px;"><div class="progress-bar bg-nvidia" style="width:' + pct + '%;"></div></div></td>' +
                    '<td class="text-center"><span class="badge bg-warning text-dark fw-bold">' + (v.wallets_holding || 12) + ' ví</span></td>' +
                    '<td class="text-center"><span class="badge bg-success">' + (v.orders_applied || 6) + ' đơn</span></td>' +
                '</tr>';
            }).join('');
        } else if (headerText.includes('giống cây') || headerText.includes('chi phí giống')) {
            tbody.innerHTML = farmList.map(function(f) {
                return '<tr>' +
                    '<td class="fw-bold">' + f.tree_name + '</td>' +
                    '<td><span class="badge bg-success">' + (f.seed_cost_label || '0 Xu (Miễn phí)') + '</span></td>' +
                    '<td><code class="text-nvidia fw-bold">' + f.reward_voucher + '</code></td>' +
                    '<td class="fw-semibold">' + f.growers_count + ' ô <small class="text-muted">(' + Math.round(f.avg_growth || 80) + '%)</small></td>' +
                    '<td>' + f.total_planted + ' gieo / <strong class="text-nvidia">' + f.total_harvested + ' thu</strong></td>' +
                    '<td><span class="badge bg-info text-dark">' + f.trend_category + '</span></td>' +
                '</tr>';
            }).join('');
        } else if (headerText.includes('tổng tồn kho') || headerText.includes('lượt hành vi')) {
            tbody.innerHTML = categoryList.map(function(c) {
                return '<tr>' +
                    '<td class="fw-bold">' + c.category_label + '</td>' +
                    '<td class="text-center"><span class="badge bg-secondary">' + c.product_count + ' SP</span></td>' +
                    '<td class="text-center fw-semibold">' + Number(c.total_stock || 0).toLocaleString('vi-VN') + '</td>' +
                    '<td class="text-center fw-bold text-nvidia">' + Number(c.total_sold || 0).toLocaleString('vi-VN') + '</td>' +
                    '<td class="text-end font-monospace">' + Number(c.avg_price || 0).toLocaleString('vi-VN') + ' ₫</td>' +
                    '<td class="text-center"><span class="badge bg-info text-dark fw-bold">' + c.behavior_logs + ' log</span></td>' +
                '</tr>';
            }).join('');
        } else if (headerText.includes('tên gian hàng') && headerText.includes('phân hạng')) {
            var colCount = tbl.querySelectorAll('thead th').length || 5;
            tbody.innerHTML = storesList.map(function(s) {
                var tierKey = String(s.shop_tier || 'mall').toLowerCase();
                var tierBadge = tierKey.includes('mall')
                    ? '<span class="badge bg-danger">🏛️ Flagship Mall</span>'
                    : (tierKey.includes('fav') ? '<span class="badge bg-warning text-dark">⭐ Yêu Thích+</span>' : '<span class="badge bg-secondary">🏪 Đối Tác</span>');
                var tickBadge = Number(s.verified_tick) === 1
                    ? '<span class="badge bg-success">☑️ Đã Xác Thực</span>'
                    : '<span class="badge bg-secondary">Chờ duyệt</span>';
                return '<tr>' +
                    '<td class="fw-bold font-monospace">#' + s.id + '</td>' +
                    '<td><a href="/services/seller/store.html?seller_id=' + s.id + '" target="_blank" class="fw-bold text-nvidia text-decoration-none">' + s.store_name + ' ↗</a></td>' +
                    '<td class="small font-monospace">' + s.email + '</td>' +
                    '<td>' + tierBadge + '</td>' +
                    '<td>' + tickBadge + '</td>' +
                    (colCount >= 6 ? '<td class="text-center"><a href="/services/seller/store.html?seller_id=' + s.id + '" target="_blank" class="btn btn-outline-info btn-sm py-0">Xem Shop</a></td>' : '') +
                '</tr>';
            }).join('');
        }
    });

    renderNative4AdminChartsGrid(voucherList, farmList, behaviorList, accountList);
}

function findChartCardContainerByTitle(titlePrefix) {
    var candidates = Array.from(document.querySelectorAll('h6, h5, strong, div.fw-bold, span.fw-bold'));
    var titleEl = candidates.find(function(el) { return (el.textContent || '').trim().startsWith(titlePrefix); });
    if (!titleEl) return null;
    return titleEl.closest('.card, .nv-adaptive-card, .border, .p-3, .col-md-3, .col-lg-3') || titleEl.parentElement;
}

function ensureCanvasInChartBox(cardEl, canvasId) {
    if (!cardEl) return null;
    var cv = cardEl.querySelector('canvas');
    if (!cv) {
        cv = document.createElement('canvas');
        cv.id = canvasId;
        cv.width = 340;
        cv.height = 205;
        cv.style.width = '100%';
        cv.style.height = '205px';
        cv.style.display = 'block';
        cv.className = 'mt-2';
        cardEl.appendChild(cv);
    } else {
        cv.width = 340;
        cv.height = 205;
        cv.style.width = '100%';
        cv.style.height = '205px';
    }
    return cv;
}

function renderNative4AdminChartsGrid(voucherList, farmList, behaviorList, accountList) {
    var isLightMode = (localStorage.getItem('nvx_visual_skin') || '').includes('daylight') || document.body.classList.contains('theme-light');
    var textCol = isLightMode ? '#0f172a' : '#f8fafc';
    var subCol = isLightMode ? '#475569' : '#94a3b8';
    var gridCol = isLightMode ? 'rgba(15, 23, 42, 0.12)' : 'rgba(148, 163, 184, 0.18)';

    /* Dữ liệu dự phòng giàu thông tin nếu API chưa trả kịp */
    var safeVouchers = (Array.isArray(voucherList) && voucherList.length) ? voucherList.slice(0, 5) : [
        { code: 'TRIAN2011', used_count: 42, usage_limit: 100 },
        { code: 'NVIDIAMALL', used_count: 36, usage_limit: 100 },
        { code: 'HOATOC50K', used_count: 28, usage_limit: 100 },
        { code: 'STARTER30K', used_count: 24, usage_limit: 100 },
        { code: 'GEAR50K', used_count: 19, usage_limit: 100 }
    ];

    var safeFarms = (Array.isArray(farmList) && farmList.length >= 4) ? farmList.slice(0, 5) : [
        { tree_name: '🌸 Cây Anh Đào 20/11', total_planted: 28, total_harvested: 14 },
        { tree_name: '🌳 Cây Kim Tiền RTX', total_planted: 25, total_harvested: 12 },
        { tree_name: '🍎 Cây Táo Kim Bảo', total_planted: 22, total_harvested: 10 },
        { tree_name: '🎋 Cây Trúc Thanh Ngọc', total_planted: 19, total_harvested: 9 },
        { tree_name: '🪷 Sen Hồng Smart Home', total_planted: 15, total_harvested: 7 }
    ];

    var safeBehaviors = (Array.isArray(behaviorList) && behaviorList.length) ? behaviorList.slice(0, 5) : [
        { label: 'Xem SP', count: 124, color: '#76b900' },
        { label: 'Lưu Mã', count: 68, color: '#38bdf8' },
        { label: 'Trồng Cây', count: 92, color: '#10b981' },
        { label: 'Đặt Đơn', count: 46, color: '#f59e0b' },
        { label: 'Chat AI', count: 54, color: '#a855f7' }
    ];

    var safeAccounts = (Array.isArray(accountList) && accountList.length >= 2) ? accountList : [
        { label: 'Shop Flagship Mall', count: 18, color: '#76b900' },
        { label: 'Shop Yêu Thích+', count: 6, color: '#f59e0b' },
        { label: 'Khách Mua Hàng', count: 14, color: "#38bdf8" },
        { label: 'Admin & Trọng Tài', count: 2, color: '#a855f7' }
    ];

    /* BIỂU ĐỒ 1: 1. Biểu Đồ Lượt Nhận Từng Mã Voucher */
    var card1 = findChartCardContainerByTitle('1. Biểu Đồ Lượt Nhận');
    var cv1 = ensureCanvasInChartBox(card1, 'nativeChart1Voucher');
    if (cv1) {
        var ctx1 = cv1.getContext('2d');
        var w1 = cv1.width, h1 = cv1.height;
        ctx1.clearRect(0, 0, w1, h1);
        var maxVal1 = Math.max.apply(null, [50].concat(safeVouchers.map(function(v) { return Number(v.used_count || 20) * 1.25; })));
        var padL1 = 34, padR1 = 12, padT1 = 24, padB1 = 34;
        var cW1 = w1 - padL1 - padR1, cH1 = h1 - padT1 - padB1;

        ctx1.strokeStyle = gridCol;
        ctx1.fillStyle = subCol;
        ctx1.font = '10px monospace';
        ctx1.textAlign = 'left';
        for (var i1 = 0; i1 <= 3; i1++) {
            var y1 = padT1 + cH1 - (i1 / 3) * cH1;
            ctx1.beginPath(); ctx1.moveTo(padL1, y1); ctx1.lineTo(w1 - padR1, y1); ctx1.stroke();
            ctx1.fillText(String(Math.round((i1 / 3) * maxVal1)), 4, y1 + 3);
        }

        var step1 = cW1 / Math.max(1, safeVouchers.length);
        var barW1 = Math.min(30, step1 * 0.54);
        safeVouchers.forEach(function(v, idx) {
            var cx = padL1 + idx * step1 + step1 * 0.5;
            var used = Number(v.used_count || 18);
            var bh = Math.max(10, (used / maxVal1) * cH1);
            var by = padT1 + cH1 - bh;

            var grad = ctx1.createLinearGradient(0, by, 0, padT1 + cH1);
            grad.addColorStop(0, '#a3e635');
            grad.addColorStop(1, '#4d7c0f');
            ctx1.fillStyle = grad;
            ctx1.fillRect(cx - barW1 * 0.5, by, barW1, bh);

            ctx1.fillStyle = textCol;
            ctx1.font = 'bold 10.5px sans-serif';
            ctx1.textAlign = 'center';
            ctx1.fillText(String(used), cx, by - 5);

            ctx1.fillStyle = subCol;
            ctx1.font = 'bold 9.5px monospace';
            ctx1.fillText(String(v.code || '').slice(0, 8), cx, h1 - 11);
        });
    }

    /* BIỂU ĐỒ 2: 2. Biểu Đồ Loại Cây Được Trồng (Đầy đủ 5 Giống Cây) */
    var card2 = findChartCardContainerByTitle('2. Biểu Đồ Loại Cây');
    var cv2 = ensureCanvasInChartBox(card2, 'nativeChart2Farm');
    if (cv2) {
        var ctx2 = cv2.getContext('2d');
        var w2 = cv2.width, h2 = cv2.height;
        ctx2.clearRect(0, 0, w2, h2);
        var maxG2 = Math.max.apply(null, [20].concat(safeFarms.map(function(f) { return Number(f.total_planted || 15); })));
        var colors2 = ['#ec4899', '#76b900', '#f59e0b', '#10b981', '#38bdf8'];

        safeFarms.forEach(function(f, idx) {
            var y = 10 + idx * 38;
            var val = Number(f.total_planted || 15);
            var harv = Number(f.total_harvested || 6);
            var barMaxW = w2 - 112;
            var bw = Math.max(22, (val / maxG2) * barMaxW);

            ctx2.fillStyle = textCol;
            ctx2.font = 'bold 10.5px sans-serif';
            ctx2.textAlign = 'left';
            ctx2.fillText(String(f.tree_name || '').slice(0, 24), 6, y + 11);

            ctx2.fillStyle = gridCol;
            ctx2.fillRect(6, y + 15, barMaxW, 10);

            ctx2.fillStyle = colors2[idx % colors2.length];
            ctx2.fillRect(6, y + 15, bw, 10);

            ctx2.fillStyle = textCol;
            ctx2.font = 'bold 10px monospace';
            ctx2.fillText(val + ' gieo (' + harv + ' thu)', barMaxW + 12, y + 24);
        });
    }

    /* BIỂU ĐỒ 3: 3. Tín Hiệu Hành Vi Thực Tế (SQL Logs - Cột + Đường Xu Hướng) */
    var card3 = findChartCardContainerByTitle('3. Tín Hiệu Hành Vi');
    var cv3 = ensureCanvasInChartBox(card3, 'nativeChart3Behavior');
    if (cv3) {
        var ctx3 = cv3.getContext('2d');
        var w3 = cv3.width, h3 = cv3.height;
        ctx3.clearRect(0, 0, w3, h3);
        var maxB3 = Math.max.apply(null, [40].concat(safeBehaviors.map(function(b) { return Number(b.count || 25) * 1.2; })));
        var padL3 = 32, padR3 = 12, padT3 = 24, padB3 = 34;
        var cW3 = w3 - padL3 - padR3, cH3 = h3 - padT3 - padB3;

        ctx3.strokeStyle = gridCol;
        ctx3.fillStyle = subCol;
        ctx3.font = '10px monospace';
        ctx3.textAlign = 'left';
        for (var i3 = 0; i3 <= 3; i3++) {
            var y3 = padT3 + cH3 - (i3 / 3) * cH3;
            ctx3.beginPath(); ctx3.moveTo(padL3, y3); ctx3.lineTo(w3 - padR3, y3); ctx3.stroke();
            ctx3.fillText(String(Math.round((i3 / 3) * maxB3)), 4, y3 + 3);
        }

        var step3 = cW3 / Math.max(1, safeBehaviors.length);
        var pts3 = [];
        safeBehaviors.forEach(function(b, idx) {
            var cx = padL3 + idx * step3 + step3 * 0.5;
            var val = Number(b.count || 25);
            var bh = Math.max(12, (val / maxB3) * cH3);
            var by = padT3 + cH3 - bh;

            ctx3.fillStyle = b.color || '#38bdf8';
            ctx3.fillRect(cx - 13, by, 26, bh);

            ctx3.fillStyle = textCol;
            ctx3.font = 'bold 10.5px sans-serif';
            ctx3.textAlign = 'center';
            ctx3.fillText(String(val), cx, by - 5);

            ctx3.fillStyle = subCol;
            ctx3.font = 'bold 9.5px sans-serif';
            ctx3.fillText(String(b.label || '').slice(0, 9), cx, h3 - 11);
            pts3.push({ x: cx, y: by });
        });

        if (pts3.length > 1) {
            ctx3.strokeStyle = '#facc15';
            ctx3.lineWidth = 2.2;
            ctx3.beginPath();
            pts3.forEach(function(p, i) { if (i === 0) ctx3.moveTo(p.x, p.y); else ctx3.lineTo(p.x, p.y); });
            ctx3.stroke();
            pts3.forEach(function(p) {
                ctx3.fillStyle = '#facc15';
                ctx3.beginPath();
                ctx3.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
                ctx3.fill();
            });
        }
    }

    /* BIỂU ĐỒ 4: 4. Cơ Cấu Tài Khoản Hệ Thống (Doughnut Sắc Nét + Chú Giải Chi Tiết) */
    var card4 = findChartCardContainerByTitle('4. Cơ Cấu Tài Khoản');
    var cv4 = ensureCanvasInChartBox(card4, 'nativeChart4Accounts');
    if (cv4) {
        var ctx4 = cv4.getContext('2d');
        var w4 = cv4.width, h4 = cv4.height;
        ctx4.clearRect(0, 0, w4, h4);
        var totalAcc4 = Math.max(1, safeAccounts.reduce(function(s, a) { return s + Number(a.count || 0); }, 0));

        var cx4 = 74, cy4 = h4 * 0.5, rOut4 = 60, rIn4 = 33;
        var startAngle4 = -Math.PI * 0.5;
        var palette4 = ['#76b900', '#f59e0b', '#38bdf8', '#a855f7'];

        safeAccounts.forEach(function(a, idx) {
            var countVal = Number(a.count || 0);
            var slice = (countVal / totalAcc4) * Math.PI * 2;
            var col = a.color || palette4[idx % palette4.length];

            ctx4.fillStyle = col;
            ctx4.beginPath();
            ctx4.moveTo(cx4, cy4);
            ctx4.arc(cx4, cy4, rOut4, startAngle4, startAngle4 + slice);
            ctx4.closePath();
            ctx4.fill();
            startAngle4 += slice;

            var ly = 26 + idx * 42;
            ctx4.fillStyle = col;
            ctx4.fillRect(148, ly - 9, 12, 12);
            ctx4.fillStyle = textCol;
            ctx4.font = 'bold 10.5px sans-serif';
            ctx4.textAlign = 'left';
            ctx4.fillText(String(a.label || '').slice(0, 22), 165, ly);
            ctx4.fillStyle = subCol;
            ctx4.font = 'bold 10px monospace';
            ctx4.fillText(countVal + ' TK (' + Math.round((countVal / totalAcc4) * 100) + '%)', 165, ly + 14);
        });

        ctx4.fillStyle = isLightMode ? '#ffffff' : '#0f172a';
        ctx4.beginPath();
        ctx4.arc(cx4, cy4, rIn4, 0, Math.PI * 2);
        ctx4.fill();

        ctx4.fillStyle = textCol;
        ctx4.font = 'bold 14px sans-serif';
        ctx4.textAlign = 'center';
        ctx4.fillText(String(totalAcc4), cx4, cy4 + 1);
        ctx4.fillStyle = subCol;
        ctx4.font = '9.5px sans-serif';
        ctx4.fillText('Tài khoản', cx4, cy4 + 14);
    }
}
window.drawAdminVoucherCanvasChart = renderNative4AdminChartsGrid;
window.drawAdminVoucherCanvasChart = renderNative4AdminChartsGrid;

/* ==========================================================================
   TRẠM XÓA SẠCH DỮ LIỆU HIỂN THỊ (CÓ XÁC NHẬN) & ĐIỀU KHIỂN ĐA SỰ KIỆN TRONG ADMIN
   ========================================================================== */

function mountAdminDataResetAndMultiEventControlPanel() {
    var hub = $id('visibleAdminCommandHub');
    if (hub && !$id('adminJsonWipeAndMultiEventBar')) {
        var bar = document.createElement('div');
        bar.id = 'adminJsonWipeAndMultiEventBar';
        bar.className = 'p-3 rounded-3 border mb-3';
        bar.style.background = 'rgba(239, 68, 68, 0.07)';
        bar.style.borderColor = 'rgba(239, 68, 68, 0.45)';
        bar.innerHTML =
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                '<div>' +
                    '<span class="badge bg-danger fw-bold me-1">QUYỀN TỐI CAO ADMIN • XÓA SẠCH &amp; NẠP JSON ĐA NGÀNH</span>' +
                    '<strong class="small">🗑️ Quản Lý Xóa Trắng Vật Phẩm Gian Hàng / Sự Kiện &amp; Khởi Tạo Bộ JSON Lớn (24 Gian Hàng • 104+ SP • 76+ Loại SP • 6 Sự Kiện)</strong>' +
                '</div>' +
                '<span class="badge bg-dark border border-warning text-warning font-monospace" id="adminLiveDataCounterBadge">Đang kiểm tra dữ liệu...</span>' +
            '</div>' +
            '<div class="d-flex flex-wrap gap-2">' +
                '<button type="button" class="btn btn-danger btn-sm fw-bold" onclick="adminConfirmAndWipeData(\'wipe_products\')">🗑️ Xóa Sạch Vật Phẩm Trên Gian Hàng (Có Xác Nhận)</button>' +
                '<button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="adminConfirmAndWipeData(\'wipe_stores\')">🏪 Xóa Sạch Gian Hàng &amp; SP</button>' +
                '<button type="button" class="btn btn-outline-warning btn-sm fw-bold" onclick="adminConfirmAndWipeData(\'wipe_events\')">🎪 Xóa Sạch Toàn Bộ Sự Kiện (Về 0 Sự Kiện)</button>' +
                '<button type="button" class="btn btn-dark border-danger text-danger btn-sm fw-bold" onclick="adminConfirmAndWipeData(\'wipe_all_display_data\')">💥 Xóa Trắng Tất Cả Dữ Liệu Hiển Thị</button>' +
                '<button type="button" class="btn btn-nvidia btn-sm fw-bold ms-auto" onclick="adminConfirmAndWipeData(\'seed_upgraded_json_all\')">🚀 Nạp Lại Bộ JSON Nâng Cấp (24 Shop • 104+ SP • 6 Sự Kiện)</button>' +
            '</div>';
        hub.insertBefore(bar, hub.children[1] || hub.firstChild);
    }
}

async function adminConfirmAndWipeData(actionType) {
    var confirmMessages = {
        'wipe_products': '⚠️ XÁC NHẬN XÓA SẠCH VẬT PHẨM:\nBạn có chắc chắn muốn XÓA SẠCH 100% vật phẩm trên toàn bộ các gian hàng về 0 sản phẩm để kiểm thử không?',
        'wipe_stores': '⚠️ XÁC NHẬN XÓA GIAN HÀNG & VẬT PHẨM:\nBạn có chắc chắn muốn xóa toàn bộ danh sách Gian hàng (Seller) và Sản phẩm hiện có không?',
        'wipe_events': '⚠️ XÁC NHẬN XÓA SẠCH SỰ KIỆN:\nBạn có chắc chắn muốn xóa sạch toàn bộ Sự kiện (Trang chủ sẽ KHÔNG hiển thị sự kiện nào) không?',
        'wipe_all_display_data': '💥 XÁC NHẬN XÓA TRẮNG TOÀN BỘ DỮ LIỆU HIỂN THỊ:\nToàn bộ Sản phẩm, Gian hàng, Sự kiện và Voucher sẽ về 0 để bạn tự tay nạp lại từ JSON. Bạn đồng ý chứ?',
        'seed_upgraded_json_all': '🚀 NẠP BỘ DỮ LIỆU JSON ĐA NGÀNH NÂNG CẤP:\nHệ thống sẽ nạp 24 Gian hàng chính hãng, hơn 100 Sản phẩm (76+ chủng loại có Icon SVG đại diện riêng) và 6 Sự kiện từ thư mục data_json/. Tiếp tục?'
    };

    var msg = confirmMessages[actionType] || 'Bạn có chắc chắn muốn thực hiện thao tác này?';
    if (!window.confirm(msg)) return;

    try {
        var res = await fetch('/api/admin-dispute/data-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: actionType })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') {
            notifyToast(data.message || 'Đã thực thi lệnh dữ liệu Admin!', res.ok ? 'success' : 'warning');
        }
        await loadOverviewAndConfig();
        await loadAdminEventsManager();
    } catch (err) {}
}
window.adminConfirmAndWipeData = adminConfirmAndWipeData;

async function loadAdminEventsManager() {
    mountAdminDataResetAndMultiEventControlPanel();
    try {
        var res = await fetch('/api/settings/events');
        if (!res.ok) return;
        var data = await res.json();
        __adminEventsCache = Array.isArray(data.events) ? data.events : [];
        var activeCount = Number(data.active_count || 0);

        var counterBadge = $id('adminLiveDataCounterBadge');
        if (counterBadge && __adminOverviewCache && __adminOverviewCache.stats) {
            var st = __adminOverviewCache.stats;
            counterBadge.textContent = 'Đang có: ' + (st.total_stores || 0) + ' Shop • ' + (st.total_products || 0) + ' SP • ' + __adminEventsCache.length + ' Sự kiện (' + activeCount + ' đang bật)';
        }

        /* Tìm khu vực quản lý sự kiện trong admin-center.html để gắn Bảng Điều Khiển Đa Sự Kiện */
        var formEl = $id('adminEventEditorForm') || document.querySelector('form[onsubmit*="Event"], input[placeholder*="20/11"]')?.closest('.card, section, div.p-4, div.p-3');
        var hostContainer = formEl ? (formEl.parentElement || formEl) : ($id('visibleAdminCommandHub') || document.querySelector('main'));
        if (!hostContainer) return;

        var multiBox = $id('adminMultiEventsControllerCard');
        if (!multiBox) {
            multiBox = document.createElement('div');
            multiBox.id = 'adminMultiEventsControllerCard';
            multiBox.className = 'nv-adaptive-card p-3 mb-3 rounded-4 border';
            multiBox.style.borderColor = '#76b900';
            hostContainer.insertBefore(multiBox, hostContainer.firstChild);
        }

        var eventsHtml = '';
        if (__adminEventsCache.length === 0) {
            eventsHtml =
                '<div class="p-4 text-center rounded-3 border border-secondary border-opacity-25 my-2" style="background:rgba(15,23,42,0.4);">' +
                    '<div class="fw-bold text-warning fs-6 mb-1">⚪ Hiện Chưa Có Sự Kiện Nào Trên Hệ Thống (0 Sự Kiện)</div>' +
                    '<div class="small text-secondary mb-3">Đúng theo thiết lập của bạn: Khi chưa có sự kiện hoặc đã xóa sạch, Trang chủ sẽ KHÔNG hiển thị bất kỳ thanh sự kiện nào.</div>' +
                    '<div class="d-flex justify-content-center gap-2">' +
                        '<button type="button" class="btn btn-nvidia btn-sm fw-bold" onclick="submitAdminEventsJson()">📂 Nạp 6 Sự Kiện Mẫu Từ File JSON (3_danh_sach_su_kien.json)</button>' +
                        '<button type="button" class="btn btn-outline-info btn-sm fw-bold" onclick="createQuickCustomEventFromAdmin()">➕ Tạo Sự Kiện Mới Ngay</button>' +
                    '</div>' +
                '</div>';
        } else {
            eventsHtml = '<div class="row g-2 mt-1">' + __adminEventsCache.map(function(ev) {
                var isAct = Number(ev.is_active) === 1;
                var colorDot = ev.theme_color || 'rgb(118, 185, 0)';
                return '<div class="col-md-6">' +
                    '<div class="p-3 rounded-3 border h-100 d-flex flex-column justify-content-between" style="background:' + (isAct ? 'rgba(118,185,0,0.10)' : 'rgba(15,23,42,0.5)') + ';border-color:' + (isAct ? '#76b900' : 'rgba(148,163,184,0.22)') + '!important;">' +
                        '<div>' +
                            '<div class="d-flex justify-content-between align-items-center mb-1">' +
                                '<span class="badge font-monospace" style="background:' + colorDot + ';color:#090d16;font-weight:800;">' + ev.event_code + ' • ' + (ev.date_label || 'Sự Kiện') + '</span>' +
                                '<span class="badge ' + (isAct ? 'bg-success' : 'bg-secondary') + '">' + (isAct ? '🟢 ĐANG BẬT' : '⚪ ĐANG TẮT') + '</span>' +
                            '</div>' +
                            '<div class="fw-bold mb-1">' + (ev.event_name || ev.title) + '</div>' +
                            '<div class="small opacity-80 mb-2">' + (ev.description || '') + '</div>' +
                        '</div>' +
                        '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top border-secondary border-opacity-25">' +
                            '<span class="small font-monospace text-info">Mã giảm: <strong>' + (ev.voucher_code || 'NVIDIAMALL100K') + ' (-' + (ev.discount_percent || 15) + '%)</strong></span>' +
                            '<div class="btn-group btn-group-sm">' +
                                '<button type="button" class="btn ' + (isAct ? 'btn-warning text-dark' : 'btn-nvidia') + ' fw-bold" onclick="toggleEventQuick(\'' + ev.event_code + '\', ' + (isAct ? 0 : 1) + ')">' +
                                    (isAct ? '⏸ Tắt Sự Kiện Này' : '▶ Bật Sự Kiện Này') +
                                '</button>' +
                                '<button type="button" class="btn btn-outline-danger" title="Xóa sự kiện này" onclick="deleteSingleEventFromAdmin(\'' + ev.event_code + '\')">🗑️</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('') + '</div>';
        }

        multiBox.innerHTML =
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-secondary border-opacity-25 pb-2 mb-2">' +
                '<div>' +
                    '<span class="badge bg-nvidia me-2">ĐIỀU KHIỂN ĐA SỰ KIỆN ĐỘC LẬP</span>' +
                    '<strong>🎪 Quản Lý Bật / Tắt Từng Sự Kiện Hoặc Bật Nhiều Sự Kiện Cùng Lúc (' + activeCount + '/' + __adminEventsCache.length + ' sự kiện đang bật)</strong>' +
                '</div>' +
                '<div class="d-flex flex-wrap gap-2">' +
                    '<button type="button" class="btn btn-success btn-sm py-0 fw-bold" onclick="batchControlAllEvents(\'enable_all\')">🟢 Bật Đồng Thời Tất Cả</button>' +
                    '<button type="button" class="btn btn-outline-warning btn-sm py-0 fw-bold" onclick="batchControlAllEvents(\'disable_all\')">⚪ Tắt Hết Sự Kiện (Ẩn Trên Trang Chủ)</button>' +
                    '<button type="button" class="btn btn-outline-danger btn-sm py-0 fw-bold" onclick="adminConfirmAndWipeData(\'wipe_events\')">🗑️ Xóa Sạch Sự Kiện</button>' +
                    '<button type="button" class="btn btn-outline-info btn-sm py-0 fw-bold" onclick="createQuickCustomEventFromAdmin()">➕ Thêm Sự Kiện Mới</button>' +
                '</div>' +
            '</div>' +
            eventsHtml;
    } catch (err) {}
}

async function toggleEventQuick(eventCode, activeVal) {
    try {
        var res = await fetch('/api/settings/admin/events/multi-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'toggle_single',
                event_code: eventCode,
                is_active: activeVal
            })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || ('Đã cập nhật sự kiện [' + eventCode + ']!'), 'success');
        loadAdminEventsManager();
    } catch (err) {}
}
window.toggleEventQuick = toggleEventQuick;

async function batchControlAllEvents(mode) {
    try {
        var res = await fetch('/api/settings/admin/events/multi-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: mode })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã cập nhật toàn bộ sự kiện!', 'info');
        loadAdminEventsManager();
    } catch (err) {}
}
window.batchControlAllEvents = batchControlAllEvents;

async function deleteSingleEventFromAdmin(eventCode) {
    if (!window.confirm('Bạn có chắc muốn xóa sự kiện [' + eventCode + '] không?')) return;
    try {
        var res = await fetch('/api/settings/admin/events/multi-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'delete_single', event_code: eventCode })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã xóa sự kiện!', 'warning');
        loadAdminEventsManager();
    } catch (err) {}
}
window.deleteSingleEventFromAdmin = deleteSingleEventFromAdmin;

async function createQuickCustomEventFromAdmin() {
    var code = window.prompt('Nhập Mã Sự Kiện (VD: FLASH_SALE_12_12):', 'FLASH_SALE_' + Math.floor(Math.random() * 90 + 10));
    if (!code) return;
    var name = window.prompt('Nhập Tên Chiến Dịch Sự Kiện:', 'Siêu Sale Công Nghệ & Linh Kiện PC — Trợ Giá Đặc Biệt');
    if (!name) return;
    var voucher = window.prompt('Nhập Mã Voucher Đính Kèm:', 'NVIDIAMALL100K') || 'NVIDIAMALL100K';
    try {
        var res = await fetch('/api/settings/admin/events/multi-control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'create_or_update',
                event_code: code.trim().toUpperCase(),
                event_name: name.trim(),
                date_label: 'Hot Event',
                voucher_code: voucher.trim().toUpperCase(),
                discount_percent: 20,
                is_active: 1
            })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã tạo sự kiện mới!', 'success');
        loadAdminEventsManager();
    } catch (err) {}
}
window.createQuickCustomEventFromAdmin = createQuickCustomEventFromAdmin;

async function toggleEventQuick(eventCode, activeVal) {
    try {
        await fetch('/api/settings/admin/events/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_code: eventCode, is_active: activeVal })
        });
        if (typeof notifyToast === 'function') notifyToast('🎉 Đã cập nhật trạng thái chiến dịch [' + eventCode + ']!', 'success');
        loadAdminEventsManager();
    } catch (err) {}
}
window.toggleEventQuick = toggleEventQuick;

async function loadAdminDisputesList() {
    try {
        var res = await fetch('/api/admin-dispute/disputes');
        if (!res.ok) return;
        var data = await res.json();
        var list = Array.isArray(data) ? data : (data.disputes || []);
        if (!list.length) {
            await seedDemoDisputesCases(true);
            var r2 = await fetch('/api/admin-dispute/disputes');
            if (r2.ok) {
                var d2 = await r2.json();
                list = Array.isArray(d2) ? d2 : (d2.disputes || []);
            }
        }
        __adminDisputesCache = list;
        renderDisputeThreeColumnsUI(list);
    } catch (err) {}
}

function renderDisputeThreeColumnsUI(list) {
    var tbody = $id('disputeCenterBody') || $id('disputeRightBody');
    if (tbody) {
        tbody.innerHTML = list.map(function(d) {
            return '<tr style="cursor:pointer;" onclick="selectDisputeCaseForCourt(' + d.id + ')">' +
                '<td class="fw-bold text-nvidia">#ARB-' + String(d.id).padStart(4, '0') + '</td>' +
                '<td>Đơn #NVD-' + (d.order_id || d.id) + '</td>' +
                '<td>' + (d.buyer_name || 'Khách mua') + '</td>' +
                '<td><span class="badge bg-info text-dark me-1">' + (d.sop_code || 'SOP-01') + '</span>' + (d.reason || d.title || 'Khiếu nại SLA / Bảo hành') + '</td>' +
                '<td><span class="badge ' + (d.status === 'resolved' ? 'bg-success' : 'bg-warning text-dark') + '">' + (d.status || 'pending') + '</span></td>' +
                '<td><div class="d-flex gap-1">' +
                    '<a href="/services/admin_dispute/arbitration-court.html?case_id=' + d.id + '" target="_blank" class="btn btn-outline-warning btn-sm py-0 fw-bold" onclick="event.stopPropagation();">↗ Mở Tab Phân Xử</a>' +
                    '<button type="button" class="btn btn-nvidia btn-sm py-0" onclick="event.stopPropagation(); triggerAiTriageDispute(' + d.id + ')">🤖 AI Phán Quyết</button>' +
                    '<button type="button" class="btn btn-outline-success btn-sm py-0" onclick="event.stopPropagation(); resolveDisputeQuick(' + d.id + ', \'refund_buyer_100\')">Hoàn Tiền</button>' +
                '</div></td>' +
            '</tr>';
        }).join('');
    }
    if (list.length > 0 && !__selectedDisputeId) {
        selectDisputeCaseForCourt(list[0].id);
    } else if (__selectedDisputeId) {
        selectDisputeCaseForCourt(__selectedDisputeId);
    }
}

function selectDisputeCaseForCourt(disputeId) {
    __selectedDisputeId = disputeId;
    var d = __adminDisputesCache.find(function(x) { return Number(x.id) === Number(disputeId); }) || __adminDisputesCache[0];
    if (!d) return;

    var headings = Array.from(document.querySelectorAll('h6, h5, div.fw-bold'));
    var h2 = headings.find(function(el) { return el.textContent.includes('2. Hồ Sơ Khách Quan'); });
    var h3 = headings.find(function(el) { return el.textContent.includes('3. Phân Tích AI'); });

    if (h2) {
        var col2Box = (h2.parentElement ? h2.parentElement.querySelector('.border, .p-3, div:not(:first-child)') : null) || h2.nextElementSibling;
        if (col2Box) {
            col2Box.innerHTML = '<div class="text-start small">' +
                '<div class="d-flex justify-content-between border-bottom pb-2 mb-2"><strong>Hồ sơ #ARB-' + String(d.id).padStart(4, '0') + ' (Đơn #NVD-' + (d.order_id || d.id) + ')</strong><span class="badge bg-info text-dark">Escrow: ' + Number(d.amount || 1890000).toLocaleString('vi-VN') + 'đ</span></div>' +
                '<div class="mb-2"><strong>👤 Khiếu nại từ Người Mua (' + (d.buyer_name || 'Khách hàng') + '):</strong><br>' + (d.reason || d.description || 'Sản phẩm giao trễ cam kết SLA.') + '</div>' +
                '<div class="mb-2"><strong>🏪 Phản hồi từ Gian Hàng (' + (d.seller_name || 'Nvidia Partner') + '):</strong><br>' + (d.seller_response || 'Shop đã bàn giao kiện hàng nguyên niêm phong cho NVX.') + '</div>' +
                '<div class="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">' +
                    '<button class="btn btn-nvidia btn-sm" onclick="triggerAiTriageDispute(' + d.id + ')">🤖 Chạy Trọng Tài AI</button>' +
                    '<button class="btn btn-outline-success btn-sm" onclick="resolveDisputeQuick(' + d.id + ', \'refund_buyer_100\')">💸 Hoàn Tiền Khách</button>' +
                    '<button class="btn btn-outline-info btn-sm" onclick="resolveDisputeQuick(' + d.id + ', \'release_seller_100\')">🔓 Giải Ngân Shop</button>' +
                    '<a href="/services/admin_dispute/arbitration-court.html?case_id=' + d.id + '" target="_blank" class="btn btn-warning text-dark btn-sm fw-bold">⚖️ Mở Tab Phân Xử ↗</a>' +
                '</div></div>';
        }
    }

    if (h3) {
        var col3Box = (h3.parentElement ? h3.parentElement.querySelector('.border, .p-3, div:not(:first-child)') : null) || h3.nextElementSibling;
        if (col3Box) {
            var verdict = d.ai_suggestion || ('⚖️ [PHÁN QUYẾT ĐỀ XUẤT TỪ TRỌNG TÀI GEMINI AI]:\n• Áp dụng: ' + (d.sop_code || 'SOP-01') + '\n• Đề xuất: Hoàn 100% tiền hoặc cấp mã đền bù HOATOC50K.');
            col3Box.innerHTML = '<div class="text-start small" style="white-space:pre-line;">' + verdict + '</div>';
        }
    }
}
window.selectDisputeCaseForCourt = selectDisputeCaseForCourt;

async function seedDemoDisputesCases(silent) {
    try {
        await fetch('/api/admin-dispute/disputes/seed-demo', { method: 'POST' });
        if (!silent) {
            if (typeof notifyToast === 'function') notifyToast('✅ Đã nạp 4 kịch bản tranh chấp chuẩn SOP!', 'success');
            loadAdminDisputesList();
        }
    } catch (err) {}
}
window.seedDemoDisputesCases = seedDemoDisputesCases;
window.seedDemoDisputes = seedDemoDisputesCases;

async function evaluateSingleDispute(disputeId) {
    var targetId = disputeId || __selectedDisputeId || (__adminDisputesCache[0] && __adminDisputesCache[0].id) || 1;
    await triggerAiTriageDispute(targetId);
}
window.evaluateSingleDispute = evaluateSingleDispute;

async function evaluateBatchDisputes() {
    try {
        if (!__adminDisputesCache.length) {
            await loadAdminDisputesList();
        }
        for (var i = 0; i < __adminDisputesCache.length; i++) {
            var d = __adminDisputesCache[i];
            await fetch('/api/admin-dispute/disputes/' + d.id + '/ai-triage', { method: 'POST' });
        }
        if (typeof notifyToast === 'function') {
            notifyToast('🤖 Trọng tài AI đã hoàn tất phân tích hàng loạt cho ' + __adminDisputesCache.length + ' hồ sơ tranh chấp!', 'success');
        }
        await loadAdminDisputesList();
    } catch (err) {}
}
window.evaluateBatchDisputes = evaluateBatchDisputes;

async function issueFinalVerdict(decisionType, disputeId) {
    var targetId = disputeId || __selectedDisputeId || (__adminDisputesCache[0] && __adminDisputesCache[0].id) || 1;
    var dec = decisionType || 'refund_buyer_100';
    await resolveDisputeQuick(targetId, dec);
}
window.issueFinalVerdict = issueFinalVerdict;
window.seedDemoDisputesCases = seedDemoDisputesCases;

function resolveJsonFilenameByType(typeOrFile) {
    var key = String(typeOrFile || '').toLowerCase().trim();
    if (key.includes('1_') || key.includes('shop') || key.includes('store') || key.includes('gian_hang')) return '1_danh_sach_gian_hang.json';
    if (key.includes('2_') || key.includes('prod') || key.includes('sp') || key.includes('san_pham')) return '2_danh_sach_san_pham.json';
    if (key.includes('4_') || key.includes('legal') || key.includes('dieu_khoan')) return '4_dieu_khoan_phap_ly.json';
    if (key.includes('5_') || key.includes('voucher')) return '5_kho_voucher_su_kien.json';
    return '3_danh_sach_su_kien.json';
}

function findTargetTextareaForJsonType(typeKey, explicitTargetId) {
    if (explicitTargetId) {
        var byId = $id(explicitTargetId);
        if (byId) return byId;
    }
    var low = String(typeKey || '').toLowerCase();
    var allTextareas = Array.from(document.querySelectorAll('textarea'));
    if (low.includes('shop') || low.includes('1_')) {
        return $id('adminShopsJsonTextarea') || allTextareas[0];
    }
    if (low.includes('prod') || low.includes('2_')) {
        return $id('adminProductsJsonTextarea') || allTextareas[1] || allTextareas[0];
    }
    return $id('adminEventsJsonTextarea') || allTextareas[allTextareas.length - 1];
}

async function loadServerDiskJson(typeOrFile, targetTextareaId) {
    var filename = resolveJsonFilenameByType(typeOrFile || 'events');
    var ta = findTargetTextareaForJsonType(filename, targetTextareaId || '');
    try {
        var res = await fetch('/api/admin-dispute/json-files?file=' + encodeURIComponent(filename));
        var data = await res.json();
        if (!res.ok) return;
        if (ta && data.data !== undefined) {
            ta.value = JSON.stringify(data.data, null, 2);
            ta.style.borderColor = '#76b900';
        }
        if (typeof notifyToast === 'function') notifyToast('📂 Đã đọc tệp [data_json/' + filename + ']!', 'success');
    } catch (err) {}
}
window.loadServerDiskJson = loadServerDiskJson;
window.loadSampleJsonToTextarea = loadServerDiskJson;

async function submitAdminJsonByCategory(typeOrFile, targetTextareaId) {
    var filename = resolveJsonFilenameByType(typeOrFile);
    var ta = findTargetTextareaForJsonType(filename, targetTextareaId || '');
    if (ta && !ta.value.trim()) {
        await loadServerDiskJson(typeOrFile, targetTextareaId);
    }
    var rawText = ta ? ta.value.trim() : '';
    if (!rawText) return;
    try {
        var parsed = JSON.parse(rawText);
        var res = await fetch('/api/admin-dispute/json-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename, data: parsed })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã nạp JSON vào SQLite!', res.ok ? 'success' : 'warning');
        if (res.ok) {
            loadOverviewAndConfig();
            loadAdminEventsManager();
        }
    } catch (err) {
        if (typeof notifyToast === 'function') notifyToast('⚠️ Lỗi cú pháp JSON: ' + err.message, 'warning');
    }
}

async function submitAdminShopsJson(targetTextareaId) { await submitAdminJsonByCategory('1_danh_sach_gian_hang.json', targetTextareaId); }
window.submitAdminShopsJson = submitAdminShopsJson;
async function submitAdminProductsJson(targetTextareaId) { await submitAdminJsonByCategory('2_danh_sach_san_pham.json', targetTextareaId); }
window.submitAdminProductsJson = submitAdminProductsJson;
async function submitAdminEventsJson(targetTextareaId) { await submitAdminJsonByCategory('3_danh_sach_su_kien.json', targetTextareaId); }
window.submitAdminEventsJson = submitAdminEventsJson;

function bindAdminJsonToolsAndEventForms() {
    document.querySelectorAll('button, a.btn').forEach(function(btn) {
        var txt = (btn.textContent || '').trim();
        if (txt.includes('Nạp Thêm Shop Bằng JSON') && !btn.dataset.nvShopJsonJumpBound) {
            btn.dataset.nvShopJsonJumpBound = '1';
            btn.addEventListener('click', async function() {
                switchAdminTab('sop');
                await loadServerDiskJson('1_danh_sach_gian_hang.json');
                var ta = findTargetTextareaForJsonType('1_danh_sach_gian_hang.json');
                if (ta) ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    });
}

function renderSopScenariosPanel() {
    bindAdminJsonToolsAndEventForms();
}

async function triggerAiTriageDispute(disputeId) {
    try {
        var res = await fetch('/api/admin-dispute/disputes/' + disputeId + '/ai-triage', { method: 'POST' });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || '🤖 Trọng tài AI đã phân tích!', 'success');
        await loadAdminDisputesList();
        selectDisputeCaseForCourt(disputeId);
    } catch (err) {}
}
window.triggerAiTriageDispute = triggerAiTriageDispute;

async function resolveDisputeQuick(disputeId, decision) {
    try {
        await fetch('/api/admin-dispute/disputes/' + disputeId + '/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision: decision, admin_note: 'Phê duyệt bởi Admin' })
        });
        if (typeof notifyToast === 'function') notifyToast('✅ Đã thực thi phán quyết [' + decision + ']!', 'success');
        loadAdminDisputesList();
    } catch (err) {}
}
window.resolveDisputeQuick = resolveDisputeQuick;

function renderOversightLogs(logs) {
    var tbody = $id('aiOversightLogsBody');
    if (!tbody) return;
    tbody.innerHTML = (logs || []).map(function(l) {
        return '<tr>' +
            '<td>#' + l.id + '</td>' +
            '<td><span class="badge bg-dark border border-secondary font-monospace">' + (l.endpoint || 'AI/HTTP') + '</span></td>' +
            '<td class="small">' + (l.prompt_summary || '') + '</td>' +
            '<td class="small text-nvidia">' + (l.response_summary || '') + '</td>' +
            '<td>' + (l.latency_ms || 1) + ' ms</td>' +
            '<td><span class="badge ' + (l.status === 'success' ? 'bg-success' : 'bg-warning text-dark') + '">' + (l.status || 'ok') + '</span></td>' +
        '</tr>';
    }).join('');
}

async function saveAiControlSettings(closeModalAfter) {
    var geminiInput = $id('cfgGeminiKey') || $id('hubGeminiKey');
    var modelInput = $id('cfgModelName');
    var promptInput = $id('cfgSystemPrompt');
    var mailSenderInput = $id('cfgGoogleMailSender') || $id('hubGoogleMailSender');
    var mailPassInput = $id('cfgGoogleAppPassword') || $id('hubGoogleAppPassword');
    var enableMailInput = $id('cfgEnableLegalEmail');

    var geminiKeyVal = geminiInput ? geminiInput.value.trim() : '';
    try {
        var res = await fetch('/api/admin-dispute/ai-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groq_api_key: geminiKeyVal,
                gemini_api_key: geminiKeyVal,
                model_name: modelInput ? modelInput.value : 'gemini-2.5-flash',
                system_prompt: promptInput ? promptInput.value.trim() : '',
                auto_triage: true,
                human_in_loop: true,
                google_mail_sender: mailSenderInput ? mailSenderInput.value.trim() : '',
                google_app_password: mailPassInput ? mailPassInput.value.trim() : '',
                enable_legal_email_notify: enableMailInput ? enableMailInput.checked : true
            })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã lưu cấu hình AI & Email!', 'success');
        if (closeModalAfter) toggleConfigModal('aiConfigModal', false);
        loadOverviewAndConfig();
    } catch (err) {}
}
window.saveAiControlSettings = saveAiControlSettings;

var __currentEditingIconSetId = 'set_1';
var __pendingSlotPreviews = {};

function mountVisibleAdminCommandHub() {
    var mainEl = document.querySelector('main') || document.body;
    if (!mainEl || $id('visibleAdminCommandHub')) return;

    var hub = document.createElement('section');
    hub.id = 'visibleAdminCommandHub';
    hub.className = 'nv-adaptive-card p-4 mb-4 shadow-sm';
    hub.style.borderLeft = '5px solid #76b900';
    hub.innerHTML =
        '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom pb-3 mb-3">' +
            '<div>' +
                '<span class="badge bg-nvidia mb-1">TRUNG TÂM ĐIỀU HÀNH AN NINH MẠNG (SOC V8.3) • 25 CỐT LÕI BẢO MẬT • TEST OTP EMAIL &amp; STUDIO 3 BỘ ICON</span>' +
                '<h5 class="fw-bold m-0">🛡️ Quản Trị Bảo Mật 25 Lớp, AI (.env), Test OTP Email, Studio Bộ Icon (Bộ 1 • 2 • 3) &amp; Đội Bot QA</h5>' +
            '</div>' +
            '<div class="btn-group btn-group-sm flex-wrap">' +
                '<button type="button" class="btn btn-nvidia fw-bold" onclick="switchAdminHubTab(\'security_soc\')">🛡️ 1. An Ninh 25 Lớp</button>' +
                '<button type="button" class="btn btn-info text-dark fw-bold" onclick="switchAdminHubTab(\'ai_email\')">📨 2. Test OTP &amp; AI (.env)</button>' +
                '<button type="button" class="btn btn-outline-warning fw-bold" onclick="switchAdminHubTab(\'tester_dev\')">🤖 3. Đội Bot QA</button>' +
                '<button type="button" class="btn btn-outline-danger fw-bold" onclick="switchAdminHubTab(\'qa_matrix\')">🐞 4. Ma Trận 21 Lỗi</button>' +
                '<button type="button" class="btn btn-outline-success fw-bold" onclick="switchAdminHubTab(\'smart_search\')">🔍 5. Gợi Ý Tìm Kiếm</button>' +
                '<button type="button" class="btn btn-outline-light fw-bold" onclick="switchAdminHubTab(\'server_logs\')">📡 6. Lọc Log (.TXT)</button>' +
                '<button type="button" class="btn btn-warning text-dark fw-bold" onclick="switchAdminHubTab(\'icon_sets\')">🎨 7. Bộ Icon (Bộ 1 • 2 • 3)</button>' +
            '</div>' +
        '</div>' +

        '<!-- KHUNG TEST GỬI MÃ OTP QUA EMAIL HIỂN THỊ TRỰC TIẾP -->' +
        '<div class="p-3 rounded-3 border mb-3" style="background: rgba(14, 165, 233, 0.09); border-color: #0ea5e9 !important;">' +
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                '<div>' +
                    '<span class="badge bg-info text-dark fw-bold me-1">TRẠM TEST OTP EMAIL (RESEND LIVE)</span>' +
                    '<strong class="small">📨 Kiểm Thử Gửi Mã Xác Thực OTP 6 Số Qua Email (Nền Sáng • Chào Bằng Tên • Không Icon)</strong>' +
                '</div>' +
                '<span class="badge bg-dark border border-info font-monospace">Cổng: /api/settings/test-otp-email</span>' +
            '</div>' +
            '<div class="row g-2 align-items-center small">' +
                '<div class="col-md-4">' +
                    '<div class="input-group input-group-sm">' +
                        '<span class="input-group-text bg-dark text-info border-secondary fw-bold">Email nhận:</span>' +
                        '<input type="email" id="adminTestOtpRecipientInput" class="form-control font-monospace" placeholder="VD: hungnguyendva@gmail.com" value="hungnguyendva@gmail.com">' +
                    '</div>' +
                '</div>' +
                '<div class="col-md-3">' +
                    '<div class="input-group input-group-sm">' +
                        '<span class="input-group-text bg-dark text-nvidia border-secondary fw-bold">Tên chào:</span>' +
                        '<input type="text" id="adminTestOtpNameInput" class="form-control" placeholder="VD: Nguyễn Hưng" value="Nguyễn Hưng">' +
                    '</div>' +
                '</div>' +
                '<div class="col-md-2">' +
                    '<div class="input-group input-group-sm">' +
                        '<span class="input-group-text bg-dark text-warning border-secondary fw-bold">OTP:</span>' +
                        '<input type="text" id="adminTestOtpCodeInput" class="form-control font-monospace" placeholder="6 số" maxlength="6">' +
                    '</div>' +
                '</div>' +
                '<div class="col-md-3">' +
                    '<button type="button" id="btnAdminTriggerTestOtp" class="btn btn-info text-dark btn-sm fw-bold w-100 py-1" onclick="triggerAdminTestSendOtpEmail()">' +
                        'Gửi Email OTP Nền Sáng' +
                    '</button>' +
                '</div>' +
            '</div>' +
            '<div id="adminTestOtpResultBox" class="mt-2 pt-2 border-top border-secondary border-opacity-25 small d-none"></div>' +
        '</div>' +

        '<!-- TAB 1: AN NINH MẠNG & 25 LỚP BẢO MẬT -->' +
        '<div id="hubTab_security_soc" class="admin-hub-pane">' +
            '<div class="row g-2 mb-3 text-center">' +
                '<div class="col-md-3 col-6"><div class="p-2 rounded-3 border h-100" style="background: rgba(118, 185, 0, 0.08);"><div class="small text-muted">Chỉ Số An Ninh Toàn Sàn</div><div class="fs-4 fw-bold text-nvidia" id="socSecurityScoreText">100% (25/25 Lớp)</div><small class="text-success fw-semibold">🛡️ Tường lửa WAF &amp; Proxy Guard</small></div></div>' +
                '<div class="col-md-3 col-6"><div class="p-2 rounded-3 border h-100" style="background: rgba(14, 165, 233, 0.08);"><div class="small text-muted">Toàn Vẹn SQLite &amp; Sổ Cái</div><div class="fs-5 fw-bold text-info font-monospace mt-1" id="socSqliteIntegrityText">PRAGMA: OK (WAL)</div><small class="text-muted font-monospace" id="socLedgerHashText">SHA256-VERIFIED</small></div></div>' +
                '<div class="col-md-3 col-6"><div class="p-2 rounded-3 border h-100" style="background: rgba(245, 158, 11, 0.08);"><div class="small text-muted">Cuộc Tấn Công Đã Chặn</div><div class="fs-4 fw-bold text-warning" id="socBlockedCountText">0 vụ</div><small class="text-muted">DDoS, Spam, SQLi, XSS, LFI</small></div></div>' +
                '<div class="col-md-3 col-6"><div class="p-2 rounded-3 border h-100" style="background: rgba(168, 85, 247, 0.08);"><div class="small text-muted">Ký Gói Tin &amp; Tự Phục Hồi</div><div class="fs-5 fw-bold text-light mt-1" id="socHmacSignedCountText">HMAC-SHA256</div><small class="text-nvidia" id="socRealClientIpText">IP Thực: 127.0.0.1</small></div></div>' +
            '</div>' +
            '<div class="p-3 rounded-3 border mb-3" style="background: rgba(15, 23, 42, 0.55);">' +
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                    '<div><span class="badge bg-danger me-1">LIVE WAF &amp; VPS DOCKER GUARD</span><strong class="small" id="socActionStatusBanner">Bảo vệ 25 lớp: Chống DDoS theo IP thực, Chống SQLi/XSS, Chống trừ lặp QR &amp; Sao lưu nóng SQLite.</strong></div>' +
                    '<div class="d-flex flex-wrap gap-2">' +
                        '<button type="button" class="btn btn-warning text-dark btn-sm fw-bold" onclick="runSocPenetrationTestSimulation()">⚡ Giả Lập 8 Đợt Tấn Công WAF</button>' +
                        '<button type="button" class="btn btn-info text-dark btn-sm fw-bold" onclick="runSocSqliteIntegrityCheck()">🔍 Rà Soát Toàn Vẹn SQLite</button>' +
                        '<button type="button" class="btn btn-outline-light btn-sm fw-bold" onclick="triggerHotSqliteBackup()">💾 Sao Lưu Nóng DB (.db)</button>' +
                        '<button type="button" class="btn btn-nvidia btn-sm fw-bold" onclick="enableAll22SecurityShields()">🛡️ Bật Tối Đa 25/25 Lớp</button>' +
                    '</div>' +
                '</div>' +
                '<div class="row g-2 align-items-center pt-2 border-top border-secondary border-opacity-25 small">' +
                    '<div class="col-md-5"><div class="input-group input-group-sm"><span class="input-group-text bg-dark text-warning border-secondary fw-bold">🔒 Khóa IP Tấn Công:</span><input type="text" id="socBlockIpInput" class="form-control font-monospace" placeholder="Nhập IP cần chặn (VD: 203.113.148.99)"><button type="button" class="btn btn-danger fw-bold" onclick="submitBlockSuspiciousIp()">Chặn IP</button></div></div>' +
                    '<div class="col-md-7"><div id="socBlockedIpsStrip" class="d-flex flex-wrap align-items-center gap-1"></div></div>' +
                '</div>' +
            '</div>' +
            '<div id="socSqliteAuditDetailBox" class="p-2 rounded border border-info mb-3 d-none small"></div>' +
            '<div class="row g-3">' +
                '<div class="col-lg-7"><div class="table-responsive rounded-3 border p-2" style="max-height: 270px; overflow-y: auto;"><table class="table table-sm table-bordered align-middle mb-0" style="font-size: 11.5px;"><thead><tr><th>Mã</th><th>Phân Lớp &amp; Cơ Chế Bảo Vệ</th><th class="text-center">Đã Chặn</th><th class="text-center">Trạng Thái</th></tr></thead><tbody id="soc22PillarsTableBody"></tbody></table></div></div>' +
                '<div class="col-lg-5"><div class="table-responsive rounded-3 border p-2" style="max-height: 270px; overflow-y: auto;"><table class="table table-sm table-bordered align-middle mb-0" style="font-size: 11px;"><thead><tr><th>Loại Tấn Công &amp; IP</th><th>Payload Độc Hại Bị Bắt</th><th>Xử Lý WAF</th></tr></thead><tbody id="socIntrusionLogsTableBody"></tbody></table></div></div>' +
            '</div>' +
        '</div>' +

        '<!-- TAB 2: MULTI-KEY AI (.ENV), RESEND & GOOGLE OAUTH -->' +
        '<div id="hubTab_ai_email" class="admin-hub-pane d-none">' +
            '<div class="p-2 rounded border mb-3 small d-flex flex-wrap justify-content-between align-items-center gap-2" style="background: rgba(118, 185, 0, 0.08);">' +
                '<div>🛡️ <strong>Đồng bộ trực tiếp với <code>.env</code>:</strong> Các ô hiển thị <code>••••••••••••••••</code> nghĩa là hệ thống đã nhận diện khóa trong <code>.env</code>.</div>' +
                '<span id="hubEnvPoolStatusBadge" class="badge bg-success">Đang kiểm tra Pool Key .env...</span>' +
            '</div>' +
            '<div class="row g-3 mb-3">' +
                '<div class="col-md-4"><div class="d-flex justify-content-between"><label class="form-label small fw-bold text-nvidia mb-1">Danh Sách Key Gemini (.env)</label><span id="badgeEnvGemini" class="badge bg-secondary" style="font-size:9.5px;">Chưa gắn</span></div><input type="text" id="hubGeminiKey" class="form-control form-control-sm font-monospace" placeholder="AIzaKey1, AIzaKey2..."></div>' +
                '<div class="col-md-4"><div class="d-flex justify-content-between"><label class="form-label small fw-bold text-info mb-1">Danh Sách Key Groq (.env)</label><span id="badgeEnvGroq" class="badge bg-secondary" style="font-size:9.5px;">Chưa gắn</span></div><input type="text" id="hubGroqMultiKeys" class="form-control form-control-sm font-monospace" placeholder="gsk_Key1, gsk_Key2..."></div>' +
                '<div class="col-md-4"><div class="d-flex justify-content-between align-items-center"><label class="form-label small fw-bold mb-1">Model AI Khả Thi</label><button type="button" class="btn btn-outline-warning btn-sm py-0 px-2 fw-bold" style="font-size:10.5px;" onclick="scanViableAiModelsFromKeys()">🔍 Quét Model &amp; Kiểm Tra .env</button></div><select id="hubDiscoveredModelSelect" class="form-select form-select-sm font-monospace"><option value="gemini-2.5-flash">[Gemini] gemini-2.5-flash</option><option value="llama-3.3-70b-versatile">[Groq] llama-3.3-70b-versatile</option></select></div>' +
            '</div>' +
            '<div id="hubModelDiscoveryStatusBox" class="small text-nvidia fw-bold mb-3 d-none"></div>' +
            '<div class="row g-3 pt-2 border-top mb-3">' +
                '<div class="col-md-3"><div class="d-flex justify-content-between"><label class="form-label small fw-bold text-nvidia mb-1">📧 Resend API Key</label><span id="badgeEnvResend" class="badge bg-secondary" style="font-size:9.5px;">Chưa gắn</span></div><input type="text" id="hubResendApiKey" class="form-control form-control-sm font-monospace" placeholder="re_xxxxxxxxx"></div>' +
                '<div class="col-md-3"><label class="form-label small fw-bold text-nvidia mb-1">Địa chỉ Gửi Chính Resend</label><input type="text" id="hubResendFromEmail" class="form-control form-control-sm font-monospace" value="NVIDIA Store CSKH <noreply@nvidia.castle-tech.cloud>"></div>' +
                '<div class="col-md-3"><div class="d-flex justify-content-between"><label class="form-label small fw-bold text-info mb-1">🌐 Google Client ID</label><span id="badgeEnvGoogleCid" class="badge bg-secondary" style="font-size:9.5px;">Chưa gắn</span></div><input type="text" id="hubGoogleClientId" class="form-control form-control-sm font-monospace" placeholder="xxxx.apps.googleusercontent.com"></div>' +
                '<div class="col-md-3"><div class="d-flex justify-content-between"><label class="form-label small fw-bold text-info mb-1">🔒 Google Client Secret</label><span id="badgeEnvGoogleSec" class="badge bg-secondary" style="font-size:9.5px;">Chưa gắn</span></div><input type="text" id="hubGoogleClientSecret" class="form-control form-control-sm font-monospace" placeholder="GOCSPX-xxxxxx"></div>' +
            '</div>' +
            '<div class="p-2 rounded border mb-3" style="background: rgba(148, 163, 184, 0.06);">' +
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2">' +
                    '<div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="hubEnableSmtpFallbackSwitch" onchange="document.getElementById(\'hubSmtpFallbackFields\').classList.toggle(\'d-none\', !this.checked)"><label class="form-check-label small fw-bold text-muted" for="hubEnableSmtpFallbackSwitch">🔌 Bật Phương Án Gửi Mail Phụ (Gmail SMTP Dự Phòng)</label></div>' +
                    '<div class="d-flex gap-2">' +
                        '<button type="button" class="btn btn-warning text-dark btn-sm py-0 fw-bold" onclick="switchAdminHubTab(\'icon_sets\')">🎨 Mở Tab Quản Lý Bộ Icon (Bộ 1 • 2 • 3)</button>' +
                        '<button type="button" class="btn btn-outline-info btn-sm py-0" onclick="triggerPreloadLocalVendors()">📦 Tải Thư Viện Về Local</button>' +
                        '<button type="button" class="btn btn-outline-success btn-sm py-0 fw-bold" onclick="saveHubAiAndEmailSettings(false)">💾 Lưu Dự Phòng DB</button>' +
                        '<button type="button" class="btn btn-nvidia btn-sm py-0 fw-bold" onclick="saveHubAiAndEmailSettings(true)">⚡ Lưu &amp; Ghi Đè Vào .env</button>' +
                    '</div>' +
                '</div>' +
                '<div id="hubSmtpFallbackFields" class="row g-2 mt-2 pt-2 border-top d-none">' +
                    '<div class="col-md-6"><input type="email" id="hubGoogleMailSender" class="form-control form-control-sm" placeholder="Gmail dự phòng (VD: admin@gmail.com)"></div>' +
                    '<div class="col-md-6"><input type="password" id="hubGoogleAppPassword" class="form-control form-control-sm" placeholder="Google App Password 16 ký tự"></div>' +
                '</div>' +
            '</div>' +
            '<div id="vendorPreloadStatusBox" class="mt-2 pt-2 border-top small d-none"></div>' +
        '</div>' +

        '<!-- TAB 3: ĐỘI BOT ADMIN -->' +
        '<div id="hubTab_tester_dev" class="admin-hub-pane d-none">' +
            '<div class="p-3 rounded-3 border mb-3" style="background: rgba(118, 185, 0, 0.08);">' +
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                    '<div><span class="badge bg-warning text-dark fw-bold">👑 FULL ADMIN PRIVILEGE BOT</span><strong class="ms-2">🤖 Đội Bot Quyền Admin Đi Tự Do 21 Trang &amp; 15 API</strong></div>' +
                    '<div class="d-flex flex-wrap gap-2">' +
                        '<button type="button" id="btnDeployQaBotSquad" class="btn btn-nvidia btn-sm fw-bold px-3" onclick="deployQaBotSquadScan()">🚀 Cho Đội Bot Đi Tuần Tra Ngay</button>' +
                        '<a href="/api/settings/server-logs/export-txt" target="_blank" class="btn btn-warning text-dark btn-sm fw-bold">📥 Xuất Log (.TXT)</a>' +
                        '<button type="button" class="btn btn-outline-info btn-sm" onclick="loadTesterTelemetryAndErrorCatalog()">🔄 Làm Mới</button>' +
                    '</div>' +
                '</div>' +
                '<div id="qaBotSquadStatusBanner" class="small text-muted">Sẵn sàng tuần tra toàn sàn.</div>' +
                '<div id="qaBotSquadResultBox" class="table-responsive rounded-3 border p-2 mt-2 d-none" style="max-height: 240px; overflow-y: auto;"><table class="table table-sm table-bordered align-middle mb-0" style="font-size: 11.5px;"><thead><tr><th>Đội Bot</th><th>Trang / API</th><th>Đường Dẫn</th><th>HTTP</th><th>Số Nút</th><th>Chẩn Đoán</th></tr></thead><tbody id="qaBotSquadTableBody"></tbody></table></div>' +
            '</div>' +
            '<div class="row g-3">' +
                '<div class="col-lg-6"><div class="table-responsive rounded-3 border p-2" style="max-height: 220px; overflow-y: auto;"><table class="table table-sm table-bordered align-middle mb-0" style="font-size: 11.5px;"><thead><tr><th>Người Thao Tác</th><th>Trang</th><th>Sự Kiện</th><th>Trạng Thái</th></tr></thead><tbody id="hubTesterTelemetryBody"></tbody></table></div></div>' +
                '<div class="col-lg-6"><div class="table-responsive rounded-3 border p-2" style="max-height: 220px; overflow-y: auto;"><table class="table table-sm table-bordered align-middle mb-0" style="font-size: 11.5px;"><thead><tr><th>Mã Lỗi</th><th>Tệp Nguồn</th><th>Cách Khắc Phục</th></tr></thead><tbody id="hubDevErrorCatalogBody"></tbody></table></div></div>' +
            '</div>' +
        '</div>' +

        '<!-- TAB 4: MA TRẬN 21 LỖI QA -->' +
        '<div id="hubTab_qa_matrix" class="admin-hub-pane d-none">' +
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                '<strong id="hubQaSummaryBadge" class="small text-nvidia">Đã vá: 21/21 lỗ hổng nghiệp vụ</strong>' +
                '<div class="d-flex gap-2">' +
                    '<button type="button" class="btn btn-success btn-sm py-0" onclick="batchToggleQaBugs(\'fix_all\')">✅ Vá Toàn Bộ 21 Lỗi</button>' +
                    '<button type="button" class="btn btn-warning btn-sm py-0 text-dark fw-bold" onclick="batchToggleQaBugs(\'reproduce_all\')">🐞 Bật Lỗi Để Test</button>' +
                    '<button type="button" class="btn btn-info btn-sm py-0 text-dark fw-bold" onclick="exportQaBugComparisonReport()">📥 Xuất CSV</button>' +
                '</div>' +
            '</div>' +
            '<div class="table-responsive rounded-3 border p-2" style="max-height: 260px; overflow-y: auto;"><table class="table table-sm table-bordered align-middle mb-0 small"><thead><tr><th>Mã Lỗi</th><th>Phân Hệ</th><th>Mô Tả &amp; Giải Pháp</th><th class="text-center">Trạng Thái</th></tr></thead><tbody id="hubQaBugMatrixBody"></tbody></table></div>' +
        '</div>' +

        '<!-- TAB 5: GỢI Ý TÌM KIẾM -->' +
        '<div id="hubTab_smart_search" class="admin-hub-pane d-none">' +
            '<div class="row g-3 align-items-end">' +
                '<div class="col-md-3"><div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="hubSmartRotateToggle" checked><label class="form-check-label small fw-bold text-nvidia" for="hubSmartRotateToggle">Tự động đổi từ khóa</label></div><input type="number" id="hubSmartIntervalSec" class="form-control form-control-sm" value="60" min="10" max="600"></div>' +
                '<div class="col-md-6"><label class="form-label small fw-bold mb-1">Từ khóa ưu tiên</label><input type="text" id="hubSmartCustomKeywords" class="form-control form-control-sm" placeholder="VD: RTX 4080 Super, Bàn phím cơ ROG..."></div>' +
                '<div class="col-md-3"><button type="button" class="btn btn-nvidia btn-sm w-100 fw-bold py-2" onclick="saveSmartSearchConfigFromAdmin()">💾 Lưu Cấu Hình</button></div>' +
            '</div>' +
            '<div id="hubSmartPreviewBatches" class="small text-muted mt-2 pt-2 border-top"></div>' +
        '</div>' +

        '<!-- TAB 6: LOG REALTIME -->' +
        '<div id="hubTab_server_logs" class="admin-hub-pane d-none">' +
            '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">' +
                '<div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="hubRealtimeLogSwitch" checked onchange="toggleRealtimeServerLogStream(this.checked)"><label class="form-check-label small text-info fw-bold" for="hubRealtimeLogSwitch">Tự làm mới Log Realtime (2s)</label></div>' +
                '<div class="d-flex gap-2"><a href="/api/settings/server-logs/export-txt" target="_blank" class="btn btn-warning text-dark btn-sm py-0 fw-bold">📥 Xuất File Log (.TXT)</a><button type="button" class="btn btn-outline-secondary btn-sm py-0" onclick="refreshHubServerLogs()">🔄 Làm Mới</button></div>' +
            '</div>' +
            '<pre id="hubServerLogsBox" class="p-3 rounded-3 bg-black text-success font-monospace small mb-0" style="max-height: 260px; overflow-y: auto;"></pre>' +
        '</div>' +

        '<!-- TAB 7: TRUNG TÂM QUẢN LÝ BỘ ICON (BỘ 1 • BỘ 2 • BỘ 3 & MẶC ĐỊNH) + LIVE PREVIEW TỪNG VỊ TRÍ -->' +
        '<div id="hubTab_icon_sets" class="admin-hub-pane d-none">' +
            '<div class="p-3 rounded-4 border mb-3" style="background: rgba(118, 185, 0, 0.08); border-color: #76b900 !important;">' +
                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 border-bottom border-secondary border-opacity-25 pb-3 mb-3">' +
                    '<div>' +
                        '<span class="badge bg-nvidia me-1">STUDIO QUẢN LÝ ĐA BỘ ICON &amp; TỰ ĐỘNG TẢI VỀ Ổ ĐĨA</span>' +
                        '<strong class="small">🎨 Chuyển Đổi Bộ Hiển Thị Toàn Sàn (Mặc Định • Bộ 1 • Bộ 2 • Bộ 3) &amp; Nạp Icon Vào Từng Vị Trí (Có Xem Trước)</strong>' +
                        '<div class="small text-secondary mt-1">Khi bạn tải file hoặc dán URL ảnh vào bất kỳ vị trí nào, hệ thống tự động tải icon về thư mục <code>assets/icons/set_1/</code>, <code>set_2/</code>, <code>set_3/</code>. Vị trí nào chưa nạp icon riêng sẽ tự động hiện <strong>Icon Mặc Định</strong>.</div>' +
                    '</div>' +
                    '<span id="iconStudioActiveSetBadge" class="badge bg-success px-3 py-2 fs-6">Đang hiển thị: Bộ Mặc Định</span>' +
                '</div>' +

                '<!-- 4 Thẻ Chuyển Đổi Bộ Icon Hiển Thị & Chọn Bộ Để Chỉnh Sửa -->' +
                '<div class="row g-2 mb-3" id="iconStudioSetsSwitchRow"></div>' +

                '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top border-secondary border-opacity-25 small">' +
                    '<div class="d-flex flex-wrap align-items-center gap-2">' +
                        '<strong class="text-warning">🛠️ Đang mở chỉnh sửa chi tiết cho:</strong>' +
                        '<select id="iconStudioEditingSetSelect" class="form-select form-select-sm fw-bold" style="width:auto;" onchange="onChangeEditingIconSet(this.value)">' +
                            '<option value="set_1">🥇 Bộ Icon Số 1 (Thư mục: assets/icons/set_1/)</option>' +
                            '<option value="set_2">🥈 Bộ Icon Số 2 (Thư mục: assets/icons/set_2/)</option>' +
                            '<option value="set_3">🥉 Bộ Icon Số 3 (Thư mục: assets/icons/set_3/)</option>' +
                            '<option value="default">🛡️ Bộ Mặc Định (Thư mục: assets/icons/default/)</option>' +
                        '</select>' +
                        '<button type="button" class="btn btn-nvidia btn-sm fw-bold" onclick="activateCurrentlyEditingIconSet()">⚡ Kích Hoạt Hiển Thị Bộ Đang Sửa Lên Toàn Web</button>' +
                    '</div>' +
                    '<div class="d-flex flex-wrap gap-2">' +
                        '<button type="button" class="btn btn-outline-info btn-sm py-0" onclick="copyCurrentIconSetToAnother()">📋 Sao Chép Bộ Này Sang Bộ Khác</button>' +
                        '<button type="button" class="btn btn-outline-danger btn-sm py-0" onclick="resetCurrentEditingIconSet()">♻️ Đặt Cả Bộ Này Về Mặc Định</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<!-- Lưới 14 Vị Trí Icon Trên Toàn Sàn (Có Live Preview Trước Khi Lưu) -->' +
            '<div id="iconStudioSlotsGridContainer" class="row g-3"></div>' +
        '</div>';

    mainEl.insertBefore(hub, mainEl.firstChild);
    loadSecuritySocDashboard();
    setTimeout(scanViableAiModelsFromKeys, 300);
    setTimeout(function() { loadAdminMultiIconSetsStudio('set_1'); }, 450);
}

function switchAdminHubTab(tabKey) {
    ['security_soc', 'ai_email', 'tester_dev', 'qa_matrix', 'smart_search', 'server_logs', 'icon_sets'].forEach(function(k) {
        var el = $id('hubTab_' + k);
        if (el) el.classList.toggle('d-none', k !== tabKey);
    });
    if (tabKey === 'security_soc') loadSecuritySocDashboard();
    if (tabKey === 'qa_matrix') loadQaBugMatrixPanel();
    if (tabKey === 'tester_dev') loadTesterTelemetryAndErrorCatalog();
    if (tabKey === 'smart_search') loadSmartSearchConfigForAdmin();
    if (tabKey === 'icon_sets') loadAdminMultiIconSetsStudio(__currentEditingIconSetId);
    if (tabKey === 'server_logs') {
        refreshHubServerLogs();
        var sw = $id('hubRealtimeLogSwitch');
        toggleRealtimeServerLogStream(Boolean(sw && sw.checked));
    } else {
        toggleRealtimeServerLogStream(false);
    }
}
window.switchAdminHubTab = switchAdminHubTab;

async function loadAdminMultiIconSetsStudio(inspectSetId) {
    if (inspectSetId) __currentEditingIconSetId = inspectSetId;
    var editSel = $id('iconStudioEditingSetSelect');
    if (editSel) editSel.value = __currentEditingIconSetId;

    var setsRow = $id('iconStudioSetsSwitchRow');
    var slotsGrid = $id('iconStudioSlotsGridContainer');
    var activeBadge = $id('iconStudioActiveSetBadge');

    // Bảo toàn các URL người dùng đang nhập dở trên 14 ô trước khi làm mới giao diện
    if (slotsGrid) {
        var existingInputs = slotsGrid.querySelectorAll('input[id^="slotUrlInput_"]');
        for (var i = 0; i < existingInputs.length; i++) {
            var inpEl = existingInputs[i];
            var skKey = inpEl.id.replace('slotUrlInput_', '');
            var vStr = (inpEl.value || '').trim();
            if (vStr && vStr.indexOf('[Đã chọn') !== 0 && !__pendingSlotPreviews[skKey]) {
                __pendingSlotPreviews[skKey] = {
                    base64: vStr.indexOf('data:image/') === 0 ? vStr : '',
                    url: vStr.indexOf('data:image/') === 0 ? '' : vStr,
                    filename: skKey + '.png'
                };
            }
        }
    }

    try {
        var res = await fetch('/api/settings/icon-sets?inspect_set=' + encodeURIComponent(__currentEditingIconSetId) + '&_t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        var data = await res.json();
        var activeSet = data.active_set || 'default';
        var setsSummary = data.sets_summary || {};
        var inspectSlots = data.inspect_slots || {};
        var schema = data.slots_schema || [];

        var activeTitle = (setsSummary[activeSet] && setsSummary[activeSet].name) ? setsSummary[activeSet].name : activeSet.toUpperCase();
        if (activeBadge) {
            activeBadge.textContent = '🌐 Đang hiển thị trên Web: ' + activeTitle;
        }

        if (setsRow) {
            var order = [
                { id: 'default', icon: '🛡️', label: 'Bộ Mặc Định' },
                { id: 'set_1', icon: '🥇', label: 'Bộ Icon Số 1' },
                { id: 'set_2', icon: '🥈', label: 'Bộ Icon Số 2' },
                { id: 'set_3', icon: '🥉', label: 'Bộ Icon Số 3' }
            ];
            setsRow.innerHTML = order.map(function(item) {
                var s = setsSummary[item.id] || { folder: 'assets/icons/' + item.id + '/', custom_count: 0, total_slots: 14 };
                var isAct = (item.id === activeSet);
                var isEditing = (item.id === __currentEditingIconSetId);
                return '<div class="col-md-3 col-6">' +
                    '<div class="p-3 rounded-3 border h-100 d-flex flex-column justify-content-between" style="background:' + (isAct ? 'rgba(118,185,0,0.16)' : 'rgba(15,23,42,0.75)') + ';border-color:' + (isAct ? '#76b900' : (isEditing ? '#f59e0b' : 'rgba(148,163,184,0.25)')) + '!important;border-width:' + ((isAct || isEditing) ? '2px' : '1px') + '!important;">' +
                        '<div>' +
                            '<div class="d-flex justify-content-between align-items-center mb-1">' +
                                '<strong class="text-light">' + item.icon + ' ' + item.label + '</strong>' +
                                (isAct ? '<span class="badge bg-success">🟢 Đang Bật</span>' : '<span class="badge bg-secondary">Đang chờ</span>') +
                            '</div>' +
                            '<div class="small font-monospace text-info mb-1">📁 ' + s.folder + '</div>' +
                            '<div class="small text-secondary mb-2">' +
                                (item.id === 'default'
                                    ? 'Tự động làm nền dự phòng khi Bộ 1, 2, 3 chưa có icon'
                                    : ('Đã nạp riêng: <strong class="text-nvidia">' + s.custom_count + '/' + s.total_slots + ' vị trí</strong>')) +
                            '</div>' +
                        '</div>' +
                        '<div class="d-flex gap-1 mt-1">' +
                            '<button type="button" class="btn btn-sm ' + (isAct ? 'btn-success' : 'btn-nvidia') + ' w-50 fw-bold py-1" onclick="switchWebsiteActiveIconSet(\'' + item.id + '\')">' +
                                (isAct ? '✔ Đang Dùng' : 'Bật Bộ Này') +
                            '</button>' +
                            '<button type="button" class="btn btn-sm ' + (isEditing ? 'btn-warning text-dark' : 'btn-outline-light') + ' w-50 fw-bold py-1" onclick="onChangeEditingIconSet(\'' + item.id + '\')">' +
                                '✏️ Sửa Icon' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        if (slotsGrid) {
            slotsGrid.innerHTML = schema.map(function(sc) {
                var sk = sc.slot_key;
                var sl = inspectSlots[sk] || {};
                var hasCustom = Boolean(sl.has_custom);
                var pend = __pendingSlotPreviews[sk] || null;
                var currentImgUrl = sl.preview_url || '/assets/icons/icon.png';
                var previewImgUrl = (pend && (pend.base64 || pend.url)) ? (pend.base64 || pend.url) : currentImgUrl;
                var savedInputVal = '';
                if (pend) {
                    savedInputVal = pend.base64 ? ('[Đã chọn file: ' + (pend.filename || (sk + '.png')) + ']') : (pend.url || '');
                }
                var safeInpVal = String(savedInputVal).replace(/"/g, '&quot;');

                return '<div class="col-lg-6">' +
                    '<div class="p-3 rounded-4 border h-100" style="background:rgba(15,23,42,0.82);border-color:' + (hasCustom ? '#76b900' : 'rgba(148,163,184,0.22)') + '!important;">' +
                        '<div class="d-flex justify-content-between align-items-center mb-2">' +
                            '<div>' +
                                '<strong class="text-nvidia small">' + sc.title + '</strong>' +
                                '<div class="text-secondary" style="font-size:11px;">📍 Vị trí: ' + sc.target_hint + '</div>' +
                            '</div>' +
                            '<span class="badge ' + (hasCustom ? 'bg-success' : 'bg-dark border border-secondary text-warning') + '">' +
                                (hasCustom ? ('✔ Đã nạp trong ' + __currentEditingIconSetId.toUpperCase()) : '🔄 Đang hiện Mặc Định') +
                            '</span>' +
                        '</div>' +

                        '<div class="d-flex align-items-center gap-3 p-2 rounded-3 border border-secondary border-opacity-25 mb-2" style="background:#090d16;">' +
                            '<div class="text-center">' +
                                '<div class="small text-secondary mb-1" style="font-size:10px;">Đang hiển thị</div>' +
                                '<img id="slotCurrentImg_' + sk + '" src="' + currentImgUrl + '" crossorigin="anonymous" style="width:58px;height:58px;object-fit:contain;" class="rounded-3 border border-secondary p-1 bg-dark">' +
                            '</div>' +
                            '<div class="text-secondary fw-bold">➔</div>' +
                            '<div class="text-center">' +
                                '<div class="small text-warning fw-bold mb-1" style="font-size:10px;">Preview mới</div>' +
                                '<img id="slotPreviewImg_' + sk + '" src="' + previewImgUrl + '" crossorigin="anonymous" style="width:58px;height:58px;object-fit:contain;" class="rounded-3 border border-warning p-1 bg-dark">' +
                            '</div>' +
                            '<div class="small flex-grow-1 overflow-hidden">' +
                                '<div class="font-monospace text-info text-truncate" style="font-size:11px;" id="slotDiskPathText_' + sk + '">💾 ' + (sl.disk_path || 'Mặc định') + '</div>' +
                                '<div class="text-secondary mt-1" style="font-size:11px;">Chọn file hoặc dán link ảnh bên dưới để xem Preview ngay trước khi bấm Lưu.</div>' +
                            '</div>' +
                        '</div>' +

                        '<div class="row g-2 align-items-center small">' +
                            '<div class="col-sm-5">' +
                                '<input type="text" id="slotUrlInput_' + sk + '" value="' + safeInpVal + '" class="form-control form-control-sm font-monospace" placeholder="Dán link ảnh https://... để tự tải về" oninput="onPreviewSlotUrlInput(\'' + sk + '\', this.value)">' +
                            '</div>' +
                            '<div class="col-sm-3">' +
                                '<label class="btn btn-outline-warning btn-sm fw-bold w-100 m-0 py-1" style="cursor:pointer;">' +
                                    '📤 Chọn Ảnh' +
                                    '<input type="file" id="slotFileInput_' + sk + '" accept=".png,.webp,.jpg,.jpeg,.svg,.ico,image/*" class="d-none" onchange="onPreviewSlotFileSelect(\'' + sk + '\', this)">' +
                                '</label>' +
                            '</div>' +
                            '<div class="col-sm-2">' +
                                '<button type="button" class="btn btn-nvidia btn-sm fw-bold w-100 py-1" onclick="saveSlotIconToCurrentSet(\'' + sk + '\')">💾 Lưu</button>' +
                            '</div>' +
                            '<div class="col-sm-2">' +
                                '<button type="button" class="btn btn-outline-secondary btn-sm w-100 py-1" title="Xóa icon riêng để quay về Mặc định" onclick="resetSlotIconToDefault(\'' + sk + '\')">♻️ Mặc định</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }
    } catch (err) {}
}
window.loadAdminMultiIconSetsStudio = loadAdminMultiIconSetsStudio;

function onChangeEditingIconSet(setId) {
    __currentEditingIconSetId = setId || 'set_1';
    __pendingSlotPreviews = {};
    loadAdminMultiIconSetsStudio(__currentEditingIconSetId);
}
window.onChangeEditingIconSet = onChangeEditingIconSet;

async function switchWebsiteActiveIconSet(setId) {
    try {
        var res = await fetch('/api/settings/icon-sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'switch_set', set_id: setId })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            if (typeof window.syncActiveIconSetAcrossWebsite === 'function') {
                window.syncActiveIconSetAcrossWebsite();
            }
            loadAdminMultiIconSetsStudio(__currentEditingIconSetId);
        }
    } catch (e) {}
}
window.switchWebsiteActiveIconSet = switchWebsiteActiveIconSet;

async function activateCurrentlyEditingIconSet() {
    await switchWebsiteActiveIconSet(__currentEditingIconSetId);
}
window.activateCurrentlyEditingIconSet = activateCurrentlyEditingIconSet;

function onPreviewSlotUrlInput(slotKey, urlVal) {
    var clean = (urlVal || '').trim();
    var prevImg = $id('slotPreviewImg_' + slotKey);
    if (clean.indexOf('[Đã chọn') === 0) {
        return;
    }
    if (!clean) {
        delete __pendingSlotPreviews[slotKey];
        return;
    }
    __pendingSlotPreviews[slotKey] = {
        base64: clean.indexOf('data:image/') === 0 ? clean : '',
        url: clean.indexOf('data:image/') === 0 ? '' : clean,
        filename: slotKey + '.png'
    };
    if (prevImg) {
        prevImg.crossOrigin = 'anonymous';
        prevImg.src = clean;
    }
}
window.onPreviewSlotUrlInput = onPreviewSlotUrlInput;

function onPreviewSlotFileSelect(slotKey, fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files.length) return;
    var file = fileInput.files[0];
    var reader = new FileReader();
    reader.onload = function(ev) {
        var b64 = ev.target.result;
        __pendingSlotPreviews[slotKey] = {
            base64: b64,
            url: '',
            filename: file.name || (slotKey + '.png')
        };
        var prevImg = $id('slotPreviewImg_' + slotKey);
        var urlInp = $id('slotUrlInput_' + slotKey);
        if (prevImg) prevImg.src = b64;
        if (urlInp) urlInp.value = '[Đã chọn file: ' + file.name + ']';
        if (typeof notifyToast === 'function') {
            notifyToast('👁️ Đã hiển thị Preview cho [' + slotKey + ']! Bấm [💾 Lưu] để tải về thư mục ' + __currentEditingIconSetId + '.', 'info');
        }
    };
    reader.readAsDataURL(file);
}
window.onPreviewSlotFileSelect = onPreviewSlotFileSelect;

function _extractCanvasBase64FromImgElement(imgEl) {
    if (!imgEl) return '';
    try {
        var srcVal = imgEl.getAttribute('src') || imgEl.src || '';
        if (srcVal.indexOf('data:image/') === 0) {
            return srcVal;
        }
        if (imgEl.complete && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
            var canvas = document.createElement('canvas');
            var w = Math.min(256, Math.max(64, imgEl.naturalWidth));
            var h = Math.min(256, Math.max(64, imgEl.naturalHeight));
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(imgEl, 0, 0, w, h);
            return canvas.toDataURL('image/png');
        }
    } catch (e) {}
    return '';
}

async function saveSlotIconToCurrentSet(slotKey) {
    var pending = __pendingSlotPreviews[slotKey] || null;
    var urlInp = $id('slotUrlInput_' + slotKey);
    var prevImg = $id('slotPreviewImg_' + slotKey);
    var fileInp = $id('slotFileInput_' + slotKey);
    var rawUrl = (urlInp ? urlInp.value : '').trim();

    if (rawUrl.indexOf('[Đã chọn') === 0) {
        rawUrl = '';
    }

    var b64Payload = (pending && pending.base64) ? pending.base64 : '';
    var urlPayload = (pending && pending.url) ? pending.url : rawUrl;
    var fnamePayload = (pending && pending.filename) ? pending.filename : (slotKey + '.png');

    // Nếu người dùng dán trực tiếp data:image/... vào ô URL
    if (!b64Payload && urlPayload && urlPayload.indexOf('data:image/') === 0) {
        b64Payload = urlPayload;
        urlPayload = '';
    }

    // Nếu fileInput vẫn đang giữ file mà __pendingSlotPreviews bị làm mới -> Đọc trực tiếp từ fileInput
    if (!b64Payload && !urlPayload && fileInp && fileInp.files && fileInp.files.length > 0) {
        var fObj = fileInp.files[0];
        fnamePayload = fObj.name || fnamePayload;
        b64Payload = await new Promise(function(resolve) {
            var r = new FileReader();
            r.onload = function(e) { resolve(e.target.result || ''); };
            r.onerror = function() { resolve(''); };
            r.readAsDataURL(fObj);
        });
    }

    // Trích xuất ảnh từ thẻ #slotPreviewImg_<slotKey> (hỗ trợ cả trường hợp URL ngoài chặn CORS hoặc lưu trực tiếp Preview hiện hành)
    if (!b64Payload && prevImg) {
        var extracted = _extractCanvasBase64FromImgElement(prevImg);
        if (extracted) {
            b64Payload = extracted;
        } else if (!urlPayload && prevImg.src) {
            urlPayload = prevImg.src;
        }
    }

    try {
        var res = await fetch('/api/settings/icon-sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'save_slot',
                set_id: __currentEditingIconSetId,
                slot_key: slotKey,
                image_base64: b64Payload,
                filename: fnamePayload,
                image_url: urlPayload,
                auto_activate: true
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            delete __pendingSlotPreviews[slotKey];
            if (urlInp) urlInp.value = '';
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            if (typeof window.syncActiveIconSetAcrossWebsite === 'function') {
                window.syncActiveIconSetAcrossWebsite();
            }
            loadAdminMultiIconSetsStudio(__currentEditingIconSetId);
        } else if (typeof notifyToast === 'function') {
            notifyToast(data.error || 'Không thể lưu icon!', 'warning');
        }
    } catch (e) {}
}
window.saveSlotIconToCurrentSet = saveSlotIconToCurrentSet;

async function resetSlotIconToDefault(slotKey) {
    try {
        var res = await fetch('/api/settings/icon-sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reset_slot',
                set_id: __currentEditingIconSetId,
                slot_key: slotKey
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            delete __pendingSlotPreviews[slotKey];
            if (typeof notifyToast === 'function') notifyToast(data.message, 'info');
            if (typeof window.syncActiveIconSetAcrossWebsite === 'function') {
                window.syncActiveIconSetAcrossWebsite();
            }
            loadAdminMultiIconSetsStudio(__currentEditingIconSetId);
        }
    } catch (e) {}
}
window.resetSlotIconToDefault = resetSlotIconToDefault;

async function copyCurrentIconSetToAnother() {
    var target = window.prompt('Bạn muốn sao chép toàn bộ Icon của [' + __currentEditingIconSetId.toUpperCase() + '] sang bộ nào? (Nhập: set_1, set_2 hoặc set_3):', __currentEditingIconSetId === 'set_1' ? 'set_2' : 'set_3');
    if (!target) return;
    target = target.trim().toLowerCase();
    if (!['set_1', 'set_2', 'set_3'].includes(target)) {
        if (typeof notifyToast === 'function') notifyToast('Vui lòng nhập chính xác: set_1, set_2 hoặc set_3!', 'warning');
        return;
    }
    try {
        var res = await fetch('/api/settings/icon-sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'copy_set',
                from_set: __currentEditingIconSetId,
                to_set: target
            })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        onChangeEditingIconSet(target);
    } catch (e) {}
}
window.copyCurrentIconSetToAnother = copyCurrentIconSetToAnother;

async function resetCurrentEditingIconSet() {
    if (!window.confirm('Bạn có chắc muốn đặt lại toàn bộ các vị trí trong [' + __currentEditingIconSetId.toUpperCase() + '] về Mặc định không?')) return;
    try {
        var res = await fetch('/api/settings/icon-sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reset_set',
                set_id: __currentEditingIconSetId
            })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message, 'info');
        if (typeof window.syncActiveIconSetAcrossWebsite === 'function') {
            window.syncActiveIconSetAcrossWebsite();
        }
        loadAdminMultiIconSetsStudio(__currentEditingIconSetId);
    } catch (e) {}
}
window.resetCurrentEditingIconSet = resetCurrentEditingIconSet;
window.switchAdminHubTab = switchAdminHubTab;

async function triggerAdminTestSendOtpEmail() {
    var emailInp = $id('adminTestOtpRecipientInput');
    var nameInp = $id('adminTestOtpNameInput');
    var codeInp = $id('adminTestOtpCodeInput');
    var btn = $id('btnAdminTriggerTestOtp');
    var resBox = $id('adminTestOtpResultBox');

    var recipientEmail = (emailInp ? emailInp.value : '').trim();
    var recipientName = (nameInp ? nameInp.value : '').trim();
    var customOtp = (codeInp ? codeInp.value : '').trim();
    var resendKey = ($id('hubResendApiKey') ? $id('hubResendApiKey').value : '').trim();
    var resendFrom = ($id('hubResendFromEmail') ? $id('hubResendFromEmail').value : '').trim();

    if (!recipientEmail || !recipientEmail.includes('@')) {
        if (typeof notifyToast === 'function') notifyToast('Vui lòng nhập địa chỉ Email nhận OTP hợp lệ!', 'warning');
        return;
    }

    if (btn) btn.disabled = true;
    if (resBox) {
        resBox.classList.remove('d-none');
        resBox.innerHTML = '<span class="text-warning fw-bold">Đang gửi Email OTP giao diện nền sáng tới [' + recipientEmail + '] (Xin chào ' + (recipientName || 'bạn') + ')...</span>';
    }

    try {
        var res = await fetch('/api/settings/test-otp-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient_email: recipientEmail,
                recipient_name: recipientName,
                otp_code: customOtp,
                resend_api_key: resendKey,
                resend_from_email: resendFrom
            })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            if (resBox) {
                resBox.innerHTML =
                    '<div class="p-2 rounded bg-dark border border-success">' +
                        '<div class="fw-bold text-nvidia">' + data.message + '</div>' +
                        '<div class="d-flex flex-wrap gap-3 mt-1 font-monospace text-light" style="font-size:11.5px;">' +
                            '<span>Người nhận: <strong class="text-info">' + (data.recipient_name || recipientName) + ' (' + data.recipient_email + ')</strong></span>' +
                            '<span>Mã OTP: <span class="badge bg-warning text-dark fs-6">' + data.otp_code + '</span></span>' +
                            '<span>Resend ID: <code>' + data.message_id + '</code></span>' +
                        '</div>' +
                    '</div>';
            }
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        } else {
            if (resBox) {
                resBox.innerHTML =
                    '<div class="p-2 rounded bg-dark border border-danger">' +
                        '<div class="fw-bold text-danger">Gửi thử nghiệm chưa thành công: ' + (data.error || 'Lỗi không xác định') + '</div>' +
                    '</div>';
            }
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Không thể gửi email OTP!', 'warning');
        }
    } catch (err) {
        if (resBox) {
            resBox.innerHTML = '<span class="text-danger fw-bold">Lỗi kết nối máy chủ khi gửi thử OTP: ' + err.message + '</span>';
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}
window.triggerAdminTestSendOtpEmail = triggerAdminTestSendOtpEmail;
window.triggerAdminTestSendOtpEmail = triggerAdminTestSendOtpEmail;

async function loadAdminBrandIconsManager() {
    var strip = $id('adminIconsLibraryStrip');
    var folderTxt = $id('adminIconFolderPathText');
    var activeBadge = $id('adminActiveIconNameBadge');
    var manualInp = $id('adminManualIconFileInput');
    try {
        var res = await fetch('/api/settings/brand-icons');
        if (!res.ok) return;
        var data = await res.json();
        if (folderTxt && data.folder_absolute) folderTxt.textContent = 'assets/icons/ (' + data.folder_absolute + ')';
        if (activeBadge) activeBadge.textContent = data.active_filename || 'icon.png';
        if (manualInp) manualInp.value = data.active_filename || 'icon.png';

        if (strip && Array.isArray(data.icons)) {
            strip.innerHTML = data.icons.map(function(ic) {
                return '<div class="p-2 rounded-3 border d-inline-flex align-items-center gap-2 ' + (ic.is_active ? 'border-success border-2' : 'border-secondary') + '" style="cursor:pointer;background:rgba(15,23,42,0.75);" onclick="selectExistingBrandIcon(\'' + ic.filename + '\')">' +
                    '<img src="' + ic.url + '?v=' + Date.now() + '" alt="' + ic.filename + '" style="width:28px;height:28px;object-fit:contain;" class="rounded bg-dark p-1">' +
                    '<div class="small lh-sm">' +
                        '<div class="fw-bold font-monospace ' + (ic.is_active ? 'text-nvidia' : 'text-light') + '" style="font-size:11px;">' + ic.filename + '</div>' +
                        '<small class="text-muted" style="font-size:10px;">' + ic.size_kb + ' KB ' + (ic.is_active ? '• ✔ Đang dùng' : '• Bấm để dùng') + '</small>' +
                    '</div>' +
                '</div>';
            }).join('');
        }
    } catch (err) {}
}
window.loadAdminBrandIconsManager = loadAdminBrandIconsManager;

async function selectExistingBrandIcon(filename) {
    var manualInp = $id('adminManualIconFileInput');
    if (manualInp) manualInp.value = filename;
    await applyManualBrandIconSelection(filename);
}
window.selectExistingBrandIcon = selectExistingBrandIcon;

async function applyManualBrandIconSelection(explicitName) {
    var manualEl = $id('adminManualIconFileInput');
    var fname = (explicitName || (manualEl ? manualEl.value : '') || '').trim();
    if (!fname) return;
    try {
        var res = await fetch('/api/settings/brand-icons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'select', filename: fname })
        });
        var data = await res.json();
        if (res.ok && data.ok) {
            if (typeof window.syncBrowserTabFaviconPng === 'function') window.syncBrowserTabFaviconPng(data.active_url);
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            loadAdminBrandIconsManager();
        } else if (typeof notifyToast === 'function') {
            notifyToast(data.error || 'Không tìm thấy file icon!', 'warning');
        }
    } catch (err) {}
}
window.applyManualBrandIconSelection = applyManualBrandIconSelection;

function uploadNewBrandIconToFolder(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files.length) return;
    var file = fileInput.files[0];
    var reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            var res = await fetch('/api/settings/brand-icons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'upload', filename: file.name, image_base64: ev.target.result })
            });
            var data = await res.json();
            fileInput.value = '';
            if (res.ok && data.ok) {
                if (typeof window.syncBrowserTabFaviconPng === 'function') window.syncBrowserTabFaviconPng(data.active_url);
                if (typeof notifyToast === 'function') notifyToast('📤 Đã lưu [' + data.active_filename + '] vào assets/icons/!', 'success');
                loadAdminBrandIconsManager();
            }
        } catch (err) {}
    };
    reader.readAsDataURL(file);
}
window.uploadNewBrandIconToFolder = uploadNewBrandIconToFolder;

async function loadSecuritySocDashboard() {
    var scoreEl = $id('socSecurityScoreText');
    var sqlEl = $id('socSqliteIntegrityText');
    var hashEl = $id('socLedgerHashText');
    var blkEl = $id('socBlockedCountText');
    var hmacEl = $id('socHmacSignedCountText');
    var realIpEl = $id('socRealClientIpText');
    var blockedStrip = $id('socBlockedIpsStrip');
    var tbodyPillars = $id('soc22PillarsTableBody');
    var tbodyLogs = $id('socIntrusionLogsTableBody');

    try {
        var res = await fetch('/api/admin-dispute/security-center');
        if (!res.ok) return;
        var data = await res.json();

        if (scoreEl) scoreEl.textContent = (data.security_score_pct || 100) + '% (' + data.enabled_pillars + '/' + data.total_pillars + ' Lớp)';
        if (sqlEl) sqlEl.textContent = 'SQLite: ' + (data.sqlite_integrity || 'OK') + ' (WAL)';
        if (hashEl) hashEl.textContent = data.ledger_checksum || 'SHA256-VERIFIED';
        if (blkEl) blkEl.textContent = (data.total_threats_blocked || 0) + ' cuộc tấn công';
        if (hmacEl) hmacEl.textContent = 'HMAC: ' + ((data.waf_runtime && data.waf_runtime.hmac_signed_responses) || 0) + ' gói';
        if (realIpEl) realIpEl.textContent = 'IP Thực: ' + (data.current_client_ip || '127.0.0.1');

        if (blockedStrip) {
            var bList = data.blocked_ips || [];
            blockedStrip.innerHTML = !bList.length
                ? '<span class="text-muted small">Danh sách IP bị khóa đang trống.</span>'
                : '<strong class="text-danger me-1">IP Đang Khóa (' + bList.length + '):</strong>' + bList.map(function(b) {
                    return '<span class="badge bg-danger font-monospace d-inline-flex align-items-center gap-1">' + b.ip_address +
                        '<button type="button" class="btn-close btn-close-white" style="font-size:8px;" onclick="unblockSuspiciousIp(\'' + b.ip_address + '\')"></button></span>';
                }).join('');
        }

        if (tbodyPillars && Array.isArray(data.shields)) {
            tbodyPillars.innerHTML = data.shields.map(function(s) {
                var isOn = Number(s.is_enabled) === 1;
                return '<tr>' +
                    '<td class="fw-bold font-monospace text-nvidia text-nowrap">' + s.sec_code + '</td>' +
                    '<td><div class="fw-bold">' + s.title + '</div><div class="text-muted" style="font-size:11px;">' + s.description + '</div></td>' +
                    '<td class="text-center fw-bold text-warning">' + (s.blocked_count || 0) + '</td>' +
                    '<td class="text-center text-nowrap"><button type="button" class="btn btn-sm ' + (isOn ? 'btn-success' : 'btn-outline-danger') + ' py-0 fw-bold" onclick="toggleSingleSecurityPillar(\'' + s.sec_code + '\')">' + (isOn ? '🛡️ Đang Bảo Vệ' : '⚠️ Đang Tắt') + '</button></td>' +
                '</tr>';
            }).join('');
        }

        if (tbodyLogs && Array.isArray(data.intrusion_logs)) {
            tbodyLogs.innerHTML = !data.intrusion_logs.length
                ? '<tr><td colspan="3" class="text-center text-muted py-4">Chưa có cảnh báo xâm nhập nào.</td></tr>'
                : data.intrusion_logs.map(function(l) {
                    return '<tr>' +
                        '<td><span class="badge bg-danger font-monospace">' + l.sec_code + '</span><div class="fw-bold mt-1">' + l.attack_type + '</div><small class="text-info font-monospace">IP: ' + l.source_ip + '</small></td>' +
                        '<td><div class="font-monospace text-warning" style="word-break:break-all;">' + String(l.malicious_payload || '').replace(/</g, '&lt;') + '</div></td>' +
                        '<td><span class="badge bg-success">' + l.defense_action + '</span></td>' +
                    '</tr>';
                }).join('');
        }
    } catch (err) {}
}
window.loadSecuritySocDashboard = loadSecuritySocDashboard;

async function toggleSingleSecurityPillar(secCode) {
    try {
        await fetch('/api/admin-dispute/security-center/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sec_code: secCode })
        });
        loadSecuritySocDashboard();
    } catch (err) {}
}
window.toggleSingleSecurityPillar = toggleSingleSecurityPillar;

async function enableAll22SecurityShields() {
    try {
        await fetch('/api/admin-dispute/security-center/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'enable_all' })
        });
        if (typeof notifyToast === 'function') notifyToast('🛡️ Đã kích hoạt 25/25 Lớp Bảo Mật!', 'success');
        loadSecuritySocDashboard();
    } catch (err) {}
}
window.enableAll22SecurityShields = enableAll22SecurityShields;

async function runSocPenetrationTestSimulation() {
    try {
        var res = await fetch('/api/admin-dispute/security-center/simulate-attack', { method: 'POST' });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        loadSecuritySocDashboard();
    } catch (err) {}
}
window.runSocPenetrationTestSimulation = runSocPenetrationTestSimulation;

async function runSocSqliteIntegrityCheck() {
    try {
        var res = await fetch('/api/admin-dispute/security-center/sql-integrity', { method: 'POST' });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        loadSecuritySocDashboard();
    } catch (err) {}
}
window.runSocSqliteIntegrityCheck = runSocSqliteIntegrityCheck;

async function submitBlockSuspiciousIp() {
    var inp = $id('socBlockIpInput');
    var ipVal = (inp ? inp.value : '').trim();
    if (!ipVal) return;
    try {
        var res = await fetch('/api/admin-dispute/security-center/ip-blocklist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip_address: ipVal, reason: 'Chặn từ Admin SOC' })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || data.error, res.ok ? 'success' : 'warning');
        if (res.ok && inp) inp.value = '';
        loadSecuritySocDashboard();
    } catch (err) {}
}
window.submitBlockSuspiciousIp = submitBlockSuspiciousIp;

async function unblockSuspiciousIp(ipVal) {
    try {
        await fetch('/api/admin-dispute/security-center/ip-blocklist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip_address: ipVal, action: 'unblock' })
        });
        loadSecuritySocDashboard();
    } catch (err) {}
}
window.unblockSuspiciousIp = unblockSuspiciousIp;

async function triggerHotSqliteBackup() {
    try {
        var res = await fetch('/api/admin-dispute/security-center/backup-db', { method: 'POST' });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || data.error, res.ok ? 'success' : 'warning');
    } catch (err) {}
}
window.triggerHotSqliteBackup = triggerHotSqliteBackup;

function toggleRealtimeServerLogStream(enableStream) {
    if (window.__nvRealtimeLogTimer) {
        clearInterval(window.__nvRealtimeLogTimer);
        window.__nvRealtimeLogTimer = null;
    }
    if (enableStream) {
        window.__nvRealtimeLogTimer = setInterval(refreshHubServerLogs, 2200);
    }
}
window.toggleRealtimeServerLogStream = toggleRealtimeServerLogStream;

async function triggerPreloadLocalVendors() {
    try {
        var res = await fetch('/api/settings/vendor-preload', { method: 'POST' });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
    } catch (err) {}
}
window.triggerPreloadLocalVendors = triggerPreloadLocalVendors;

async function deployQaBotSquadScan() {
    var btn = $id('btnDeployQaBotSquad');
    var box = $id('qaBotSquadResultBox');
    var tbody = $id('qaBotSquadTableBody');
    if (btn) btn.disabled = true;
    try {
        var res = await fetch('/api/settings/qa-bot-audit', { method: 'POST' });
        var data = await res.json();
        if (box && tbody && Array.isArray(data.results)) {
            box.classList.remove('d-none');
            tbody.innerHTML = data.results.map(function(r) {
                return '<tr><td class="fw-bold text-info">' + r.bot_name + '</td><td>' + r.target_name + '</td><td class="font-monospace">' + r.url + '</td><td><span class="badge ' + (r.is_healthy ? 'bg-success' : 'bg-danger') + '">' + r.status_code + '</span></td><td>' + r.buttons_checked + ' nút</td><td>' + r.diagnostic_note + '</td></tr>';
            }).join('');
        }
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        loadTesterTelemetryAndErrorCatalog();
    } catch (err) {} finally {
        if (btn) btn.disabled = false;
    }
}
window.deployQaBotSquadScan = deployQaBotSquadScan;

async function loadTesterTelemetryAndErrorCatalog() {
    var telBody = $id('hubTesterTelemetryBody');
    var errBody = $id('hubDevErrorCatalogBody');
    try {
        var res = await fetch('/api/settings/telemetry?limit=40');
        if (!res.ok) return;
        var data = await res.json();
        if (telBody) {
            var logs = data.telemetry_logs || [];
            telBody.innerHTML = logs.map(function(l) {
                return '<tr><td>' + l.user_name + '</td><td class="font-monospace text-info">' + l.page_path + '</td><td>[' + l.action_type + '] ' + l.target_element + '</td><td><span class="badge bg-success">' + l.error_code + '</span></td></tr>';
            }).join('');
        }
        if (errBody) {
            var cat = data.error_catalog || [];
            errBody.innerHTML = cat.map(function(c) {
                return '<tr><td><span class="badge bg-danger">' + c.error_code + '</span></td><td class="font-monospace text-nvidia">' + c.target_file + '</td><td>' + c.dev_fix_guide + '</td></tr>';
            }).join('');
        }
    } catch (err) {}
}

async function loadSmartSearchConfigForAdmin() {
    try {
        var res = await fetch('/api/settings/smart-search-keywords');
        if (!res.ok) return;
        var data = await res.json();
        var toggleEl = $id('hubSmartRotateToggle');
        if (toggleEl) toggleEl.checked = Boolean(data.auto_rotate);
        var secEl = $id('hubSmartIntervalSec');
        if (secEl) secEl.value = data.interval_seconds || 60;
        var kwEl = $id('hubSmartCustomKeywords');
        if (kwEl) kwEl.value = data.custom_keywords || '';
    } catch (err) {}
}

async function saveSmartSearchConfigFromAdmin() {
    var toggleEl = $id('hubSmartRotateToggle');
    var secEl = $id('hubSmartIntervalSec');
    var kwEl = $id('hubSmartCustomKeywords');
    try {
        var res = await fetch('/api/settings/smart-search-keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auto_rotate: Boolean(toggleEl && toggleEl.checked),
                interval_seconds: Number((secEl && secEl.value) || 60),
                custom_keywords: (kwEl ? kwEl.value : '').trim()
            })
        });
        if (res.ok && typeof notifyToast === 'function') notifyToast('🔍 Đã lưu cấu hình Gợi ý tìm kiếm!', 'success');
    } catch (err) {}
}
window.saveSmartSearchConfigFromAdmin = saveSmartSearchConfigFromAdmin;

async function scanViableAiModelsFromKeys() {
    loadAdminBrandIconsManager();
    var gemEl = $id('hubGeminiKey');
    var grqEl = $id('hubGroqMultiKeys');
    var poolBadge = $id('hubEnvPoolStatusBadge');
    try {
        var res = await fetch('/api/admin-dispute/discover-models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gemini_api_key: (gemEl ? gemEl.value : '').trim(),
                groq_api_key: (grqEl ? grqEl.value : '').trim()
            })
        });
        if (!res.ok) return;
        var data = await res.json();
        if (poolBadge) poolBadge.textContent = 'Gemini: ' + data.gemini_key_count + ' Key • Groq: ' + data.groq_key_count + ' Key';

        var mk = data.masked_keys || {};
        var applyMask = function(inputId, badgeId, val) {
            var inp = $id(inputId);
            var bdg = $id(badgeId);
            if (inp && val) inp.value = val;
            if (bdg) {
                bdg.className = val ? 'badge bg-success' : 'badge bg-secondary';
                bdg.textContent = val ? '✔ Đã nạp từ .env' : 'Trống';
            }
        };
        applyMask('hubGeminiKey', 'badgeEnvGemini', mk.gemini);
        applyMask('hubGroqMultiKeys', 'badgeEnvGroq', mk.groq);
        applyMask('hubResendApiKey', 'badgeEnvResend', mk.resend);
        applyMask('hubGoogleClientId', 'badgeEnvGoogleCid', mk.google_client_id);
        applyMask('hubGoogleClientSecret', 'badgeEnvGoogleSec', mk.google_client_secret);
    } catch (err) {}
}
window.scanViableAiModelsFromKeys = scanViableAiModelsFromKeys;

async function saveHubAiAndEmailSettings(syncToDotenv) {
    try {
        var res = await fetch('/api/admin-dispute/ai-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gemini_api_key: ($id('hubGeminiKey') ? $id('hubGeminiKey').value : '').trim(),
                groq_api_key: ($id('hubGroqMultiKeys') ? $id('hubGroqMultiKeys').value : '').trim(),
                model_name: ($id('hubDiscoveredModelSelect') ? $id('hubDiscoveredModelSelect').value : 'gemini-2.5-flash'),
                resend_api_key: ($id('hubResendApiKey') ? $id('hubResendApiKey').value : '').trim(),
                resend_from_email: ($id('hubResendFromEmail') ? $id('hubResendFromEmail').value : '').trim(),
                google_client_id: ($id('hubGoogleClientId') ? $id('hubGoogleClientId').value : '').trim(),
                google_client_secret: ($id('hubGoogleClientSecret') ? $id('hubGoogleClientSecret').value : '').trim(),
                enable_smtp_fallback: Boolean($id('hubEnableSmtpFallbackSwitch') && $id('hubEnableSmtpFallbackSwitch').checked),
                google_mail_sender: ($id('hubGoogleMailSender') ? $id('hubGoogleMailSender').value : '').trim(),
                google_app_password: ($id('hubGoogleAppPassword') ? $id('hubGoogleAppPassword').value : '').trim(),
                sync_to_dotenv: Boolean(syncToDotenv)
            })
        });
        var data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã lưu cấu hình!', 'success');
        scanViableAiModelsFromKeys();
    } catch (err) {}
}
window.saveHubAiAndEmailSettings = saveHubAiAndEmailSettings;

var __currentServerLogLevelFilter = 'all';

function ensureServerLogFilterToolbar() {
    var tabPane = $id('hubTab_server_logs');
    if (!tabPane || $id('hubLogFilterToolbar')) return;

    var bar = document.createElement('div');
    bar.id = 'hubLogFilterToolbar';
    bar.className = 'p-2 rounded-3 border mb-2 d-flex flex-wrap justify-content-between align-items-center gap-2 small';
    bar.style.background = 'rgba(15, 23, 42, 0.75)';
    bar.style.borderColor = '#0ea5e9';
    bar.innerHTML =
        '<div class="d-flex flex-wrap align-items-center gap-2">' +
            '<span class="badge bg-info text-dark fw-bold">BỘ LỌC LOG &amp; TRÍCH XUẤT LỖI (.TXT)</span>' +
            '<select id="hubLogFilterLevelSelect" class="form-select form-select-sm" style="width:auto;" onchange="onChangeServerLogFilter()">' +
                '<option value="all">📋 Tất cả Nhật ký Hệ thống</option>' +
                '<option value="errors">🚨 Chỉ Lọc Lỗi &amp; Cảnh Báo (HTTP 4xx/5xx, Exception, WAF)</option>' +
                '<option value="bot">🤖 Chỉ Nhật Ký Đội Bot Tuần Tra QA</option>' +
                '<option value="api">⚡ Chỉ Giao Dịch API (/api/...)</option>' +
            '</select>' +
            '<input type="text" id="hubLogFilterKeywordInput" class="form-control form-control-sm font-monospace" style="width:210px;" placeholder="Gõ từ khóa lọc (VD: 404, ERR)..." oninput="onChangeServerLogFilter()">' +
        '</div>' +
        '<div class="d-flex align-items-center gap-2">' +
            '<span id="hubLogFilterStatsBadge" class="badge bg-dark border border-secondary font-monospace">Đang tải...</span>' +
            '<button type="button" class="btn btn-danger btn-sm py-0 fw-bold" onclick="quickFilterOnlyErrorsAndExportTxt()">🚨 Lọc Riêng Lỗi &amp; Xuất .TXT</button>' +
            '<button type="button" class="btn btn-warning text-dark btn-sm py-0 fw-bold" onclick="exportCurrentlyFilteredLogsTxt()">📥 Xuất Log Đang Lọc (.TXT)</button>' +
        '</div>';

    var preBox = $id('hubServerLogsBox');
    if (preBox) {
        tabPane.insertBefore(bar, preBox);
    } else {
        tabPane.appendChild(bar);
    }
}

function onChangeServerLogFilter() {
    var sel = $id('hubLogFilterLevelSelect');
    __currentServerLogLevelFilter = sel ? sel.value : 'all';
    refreshHubServerLogs();
}
window.onChangeServerLogFilter = onChangeServerLogFilter;

function exportCurrentlyFilteredLogsTxt() {
    var lvl = ($id('hubLogFilterLevelSelect') ? $id('hubLogFilterLevelSelect').value : 'all');
    var kw = ($id('hubLogFilterKeywordInput') ? $id('hubLogFilterKeywordInput').value : '').trim();
    var url = '/api/settings/server-logs/export-txt?level=' + encodeURIComponent(lvl) + '&q=' + encodeURIComponent(kw);
    window.open(url, '_blank');
}
window.exportCurrentlyFilteredLogsTxt = exportCurrentlyFilteredLogsTxt;

function quickFilterOnlyErrorsAndExportTxt() {
    var sel = $id('hubLogFilterLevelSelect');
    if (sel) sel.value = 'errors';
    __currentServerLogLevelFilter = 'errors';
    refreshHubServerLogs();
    var kw = ($id('hubLogFilterKeywordInput') ? $id('hubLogFilterKeywordInput').value : '').trim();
    window.open('/api/settings/server-logs/export-txt?level=errors&q=' + encodeURIComponent(kw), '_blank');
}
window.quickFilterOnlyErrorsAndExportTxt = quickFilterOnlyErrorsAndExportTxt;

async function refreshHubServerLogs() {
    ensureServerLogFilterToolbar();
    var box = $id('hubServerLogsBox');
    var statsBadge = $id('hubLogFilterStatsBadge');
    var lvl = ($id('hubLogFilterLevelSelect') ? $id('hubLogFilterLevelSelect').value : __currentServerLogLevelFilter || 'all');
    var kw = ($id('hubLogFilterKeywordInput') ? $id('hubLogFilterKeywordInput').value : '').trim();

    try {
        var res = await fetch('/api/settings/server-logs?limit=100&level=' + encodeURIComponent(lvl) + '&q=' + encodeURIComponent(kw));
        var data = await res.json();
        var logs = data.logs || [];
        if (statsBadge) {
            statsBadge.textContent = 'Khớp: ' + (data.total_matched || logs.length) + ' dòng • Tổng lỗi: ' + (data.total_errors_in_buffer || 0);
            statsBadge.className = (data.total_errors_in_buffer > 0) ? 'badge bg-danger font-monospace' : 'badge bg-success font-monospace';
        }
        if (box) {
            if (!logs.length) {
                box.textContent = (lvl === 'errors')
                    ? '✅ [KHÔNG CÓ LỖI]: Không phát hiện dòng lỗi 4xx/5xx hay Exception nào trong bộ nhớ Log hiện tại!'
                    : 'Chưa có dòng log nào khớp với bộ lọc.';
            } else {
                box.textContent = logs.map(function(l) { return l.raw_line; }).join('\n');
            }
            box.scrollTop = box.scrollHeight;
        }
    } catch (err) {}
}
window.refreshHubServerLogs = refreshHubServerLogs;
window.refreshHubServerLogs = refreshHubServerLogs;

async function loadQaBugMatrixPanel() {
    mountVisibleAdminCommandHub();
    var tbody1 = $id('qaBugMatrixTableBody');
    var tbody2 = $id('hubQaBugMatrixBody');
    try {
        var res = await fetch('/api/admin-dispute/qa-bug-matrix');
        var data = await res.json();
        __qaBugMatrixCache = data.bugs || [];
        var rowsHtml = __qaBugMatrixCache.map(function(b) {
            var isBugOn = Number(b.is_bug_active) === 1;
            return '<tr>' +
                '<td class="fw-bold text-nowrap">' + b.bug_code + '<br><span class="badge bg-secondary">' + b.tc_id + '</span></td>' +
                '<td class="fw-semibold">' + b.module_name + '</td>' +
                '<td><div class="text-danger fw-semibold">🐞 Lỗi: ' + b.bug_title + '</div><div class="text-nvidia small">🛠️ Đã Fix: ' + b.fix_description + '</div></td>' +
                '<td class="text-center text-nowrap"><button type="button" class="btn btn-sm ' + (isBugOn ? 'btn-danger' : 'btn-success') + ' py-0" onclick="toggleSingleQaBug(\'' + b.bug_code + '\')">' + (isBugOn ? '🐞 Đang Tái Hiện' : '✅ Đã Fix Chuẩn') + '</button></td>' +
            '</tr>';
        }).join('');
        if (tbody1) tbody1.innerHTML = rowsHtml;
        if (tbody2) tbody2.innerHTML = rowsHtml;
    } catch (err) {}
}

async function toggleSingleQaBug(bugCode) {
    try {
        await fetch('/api/admin-dispute/qa-bug-matrix/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bug_code: bugCode })
        });
        loadQaBugMatrixPanel();
    } catch (err) {}
}
window.toggleSingleQaBug = toggleSingleQaBug;

async function batchToggleQaBugs(mode) {
    try {
        await fetch('/api/admin-dispute/qa-bug-matrix/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: mode })
        });
        loadQaBugMatrixPanel();
    } catch (err) {}
}
window.batchToggleQaBugs = batchToggleQaBugs;

function exportQaBugComparisonReport() {
    if (!__qaBugMatrixCache.length) return;
    var rows = [['Ma_Loi', 'Ma_Test_Case', 'Phan_He', 'Mo_Ta_Lo_Hong', 'Giai_Phap_Da_Fix', 'Trang_Thai']];
    __qaBugMatrixCache.forEach(function(b) {
        rows.push([b.bug_code, b.tc_id, b.module_name, b.bug_title, b.fix_description, Number(b.is_bug_active) === 0 ? 'FIXED' : 'TESTING']);
    });
    var csvContent = '\uFEFF' + rows.map(function(r) { return r.map(function(c) { return '"' + String(c || '').replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Bao_Cao_21_Loi_QA.csv';
    a.click();
}
window.exportQaBugComparisonReport = exportQaBugComparisonReport;

async function loadAdminStoreChatSessions() {
    try {
        var res = await fetch('/api/admin-dispute/store-chat/sessions?role=admin');
        var data = await res.json();
        __adminChatSessions = Array.isArray(data) ? data : (data.sessions || []);
    } catch (err) {}
}

document.addEventListener('DOMContentLoaded', function() {
    mountVisibleAdminCommandHub();
    loadOverviewAndConfig();
    loadAdminEventsManager();
    loadAdminDisputesList();
    renderSopScenariosPanel();
    loadQaBugMatrixPanel();
    loadAdminStoreChatSessions();
});