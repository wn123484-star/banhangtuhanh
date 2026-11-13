var __liveAuctionsCache = [];
var __lastDutchWinBehalfUrl = '';
var __auctionTickerInterval = null;

var __reflexGameActive = false;
var __reflexRemainingSec = 30.0;
var __reflexHits = 0;
var __reflexTimesMs = [];
var __reflexTarget = { x: 380, y: 155, r: 26, spawnedAt: 0 };
var __reflexTimerId = null;

function _formatAuctionVND(val) {
    if (typeof formatVND === 'function') return formatVND(val);
    return Number(val || 0).toLocaleString('vi-VN') + ' ₫';
}

function _getAuctionCurrentUsername() {
    try {
        var u = typeof getAuthUser === 'function' ? getAuthUser() : null;
        if (u && (u.username || u.full_name)) return String(u.username || u.full_name);
    } catch (e) {}
    return 'khach_hang_vip';
}

function _formatCountdownClock(sec) {
    var s = Math.max(0, Math.floor(Number(sec || 0)));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var rem = s % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(rem).padStart(2, '0');
}

async function loadLiveDualAuctions() {
    try {
        var res = await fetch('/api/auctions/list?_t=' + Date.now(), { cache: 'no-store' });
        var data = await res.json();
        if (!data || !data.ok) return;
        __liveAuctionsCache = data.auctions || [];
        renderStandardEscrowAuctions(data.standard_auctions || []);
        renderDutchFlashAuctions(data.dutch_auctions || []);
        renderReflexLeaderboard(data.reflex_leaderboard || []);
    } catch (e) {}
}

function renderStandardEscrowAuctions(list) {
    var grid = document.getElementById('standardAuctionsGrid');
    if (!grid) return;
    if (!list.length) {
        grid.innerHTML = '<div class="col-12 text-center py-4 text-muted">Chưa có phiên đấu giá ký quỹ nào.</div>';
        return;
    }

    grid.innerHTML = list.map(function (a) {
        var nextBid = Number(a.next_min_bid || (Number(a.current_price) + Number(a.min_step_price || 200000)));
        var depAmt = Number(a.next_required_deposit || Math.round(nextBid * 0.1));
        var bidsHtml = (a.bids || []).slice(0, 3).map(function (b) {
            var stBadge = Number(b.is_refunded) === 1
                ? '<span class="badge bg-secondary">✅ Đã hoàn cọc 100%</span>'
                : '<span class="badge bg-warning text-dark">🔒 Đang giữ cọc 10%</span>';
            var snipeTag = Number(b.anti_snipe_triggered) === 1
                ? ' <span class="badge bg-danger">+30s Anti-Snipe</span>'
                : '';
            return (
                '<div class="d-flex justify-content-between align-items-center py-1 border-bottom border-secondary border-opacity-25 small">' +
                    '<span class="text-truncate" style="max-width:48%;">👤 ' + b.bidder_name + snipeTag + '</span>' +
                    '<strong class="text-nvidia">' + _formatAuctionVND(b.bid_amount) + '</strong>' +
                    stBadge +
                '</div>'
            );
        }).join('');

        return (
            '<div class="col-lg-4">' +
                '<div class="nv-adaptive-card auction-card-live p-3 h-100 d-flex flex-column justify-content-between">' +
                    '<div>' +
                        '<div class="d-flex justify-content-between align-items-center mb-2">' +
                            '<span class="badge bg-nvidia fw-bold">🛡️ Cọc Ký Quỹ ' + Number(a.escrow_deposit_pct || 10) + '%</span>' +
                            '<span class="badge bg-danger font-monospace" data-auction-timer="' + a.id + '" data-rem="' + a.remaining_seconds + '">' +
                                '⏱️ ' + _formatCountdownClock(a.remaining_seconds) +
                            '</span>' +
                        '</div>' +
                        '<div class="text-center p-2 rounded-3 mb-2" style="background:#080e1a;">' +
                            '<img src="' + (a.image_url || '/assets/icons/icon.png') + '" alt="' + a.title + '" style="height:130px;object-fit:contain;" class="img-fluid">' +
                        '</div>' +
                        '<h6 class="fw-bold text-light mb-2">' + a.title + '</h6>' +
                        '<div class="p-2 rounded-3 border mb-2" style="background:rgba(118,185,0,0.08);">' +
                            '<div class="d-flex justify-content-between small">' +
                                '<span class="text-muted">Giá dẫn đầu hiện tại:</span>' +
                                '<span class="badge bg-info text-dark">+' + Number(a.anti_snipe_extensions || 0) + ' lần gia hạn +30s</span>' +
                            '</div>' +
                            '<div class="fw-bold text-nvidia fs-4">' + _formatAuctionVND(a.current_price) + '</div>' +
                            '<div class="small text-warning">👑 Người dẫn đầu: <strong>' + (a.highest_bidder_name || 'Chưa có') + '</strong> (' + Number(a.total_bids || 0) + ' lượt đặt)</div>' +
                        '</div>' +
                        '<div class="mb-2">' +
                            '<div class="small fw-bold text-info mb-1">📋 Sổ cái đặt giá &amp; trạng thái hoàn cọc tự động:</div>' +
                            (bidsHtml || '<div class="small text-muted">Hãy là người đặt giá đầu tiên!</div>') +
                        '</div>' +
                    '</div>' +
                    '<div class="pt-2 border-top border-secondary border-opacity-25">' +
                        '<div class="input-group input-group-sm mb-2">' +
                            '<span class="input-group-text">Giá đặt</span>' +
                            '<input type="number" id="bidInput_' + a.id + '" class="form-control fw-bold" value="' + nextBid + '" step="' + Number(a.min_step_price || 200000) + '">' +
                            '<span class="input-group-text">₫</span>' +
                        '</div>' +
                        '<div class="small text-muted mb-2">Cọc tạm khóa 10%: <strong class="text-warning">' + _formatAuctionVND(depAmt) + '</strong> (Tự hoàn 100% nếu có người trả cao hơn)</div>' +
                        '<div class="d-grid gap-2">' +
                            '<button type="button" class="btn btn-nvidia btn-sm fw-bold py-2" onclick="submitStandardAuctionBid(' + a.id + ', false)">' +
                                '🔨 Đặt Giá Ngay (' + _formatAuctionVND(nextBid) + ')' +
                            '</button>' +
                            '<button type="button" class="btn btn-outline-danger btn-sm fw-bold py-1" onclick="submitStandardAuctionBid(' + a.id + ', true)">' +
                                '⚡ Test Đặt Giá Phút Chót (&lt;10s) Kích Hoạt +30s Anti-Sniping' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }).join('');
}

function renderDutchFlashAuctions(list) {
    var grid = document.getElementById('dutchAuctionsGrid');
    if (!grid) return;
    if (!list.length) {
        grid.innerHTML = '<div class="col-12 text-center py-4 text-muted">Chưa có phiên đấu giá ngược nào.</div>';
        return;
    }

    grid.innerHTML = list.map(function (a) {
        var dropStep = Number(a.dutch_drop_step || 30000);
        return (
            '<div class="col-lg-4">' +
                '<div class="nv-adaptive-card dutch-card-live p-3 h-100 d-flex flex-column justify-content-between">' +
                    '<div>' +
                        '<div class="d-flex justify-content-between align-items-center mb-2">' +
                            '<span class="badge bg-info text-dark fw-bold">⚡ Giảm ' + _formatAuctionVND(dropStep) + ' / ' + Number(a.dutch_drop_interval_sec || 2) + 's</span>' +
                            '<span class="badge bg-warning text-dark fw-bold">Giá sàn: ' + _formatAuctionVND(a.reserve_price) + '</span>' +
                        '</div>' +
                        '<div class="text-center p-2 rounded-3 mb-2" style="background:#080e1a;">' +
                            '<img src="' + (a.image_url || '/assets/icons/icon.png') + '" alt="' + a.title + '" style="height:130px;object-fit:contain;" class="img-fluid">' +
                        '</div>' +
                        '<h6 class="fw-bold text-light mb-2">' + a.title + '</h6>' +
                        '<div class="p-3 rounded-3 border mb-3 text-center" style="background:rgba(56,189,248,0.1);border-color:#38bdf8!important;">' +
                            '<div class="small text-muted">Giá khởi điểm: <del>' + _formatAuctionVND(a.start_price) + '</del></div>' +
                            '<div class="small text-info fw-bold mt-1">GIÁ ĐANG GIẢM TRỰC TIẾP TỪNG GIÂY:</div>' +
                            '<div class="fw-bold text-warning fs-3 font-monospace" id="dutchLivePrice_' + a.id + '" data-cur-price="' + a.current_price + '" data-reserve="' + a.reserve_price + '" data-step="' + dropStep + '">' +
                                _formatAuctionVND(a.current_price) +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div>' +
                        '<button type="button" class="btn btn-info text-dark w-100 fw-bold py-2 shadow" onclick="claimDutchFlashAuction(' + a.id + ')">' +
                            '⚡ Chốt Giá Mua Ngay &amp; Tạo Hóa Đơn QR 2 Bước' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }).join('');
}

async function submitStandardAuctionBid(auctionId, simulateLast10s) {
    var inp = document.getElementById('bidInput_' + auctionId);
    var bidVal = Number((inp && inp.value) || 0);
    var user = _getAuctionCurrentUsername();

    try {
        var res = await fetch('/api/auctions/bid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auction_id: Number(auctionId),
                bidder_username: user,
                bid_amount: bidVal,
                simulate_last_10s: Boolean(simulateLast10s)
            })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Đặt giá chưa thành công!', 'warning');
            return;
        }
        if (typeof notifyToast === 'function') {
            notifyToast(data.message || 'Đặt giá thành công!', data.anti_sniping_extended ? 'danger' : 'success');
        }
        await loadLiveDualAuctions();
    } catch (e) {}
}

async function claimDutchFlashAuction(auctionId) {
    var priceEl = document.getElementById('dutchLivePrice_' + auctionId);
    var curP = priceEl ? Number(priceEl.getAttribute('data-cur-price') || 0) : 0;
    var user = _getAuctionCurrentUsername();

    try {
        var res = await fetch('/api/auctions/dutch-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auction_id: Number(auctionId),
                buyer_username: user,
                claimed_price: curP > 0 ? curP : undefined
            })
        });
        var data = await res.json();
        if (!res.ok || !data.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Không thể chốt phiên đấu giá ngược!', 'warning');
            return;
        }

        if (typeof notifyToast === 'function') {
            notifyToast(data.message || '⚡ Đã chốt thắng Đấu Giá Ngược!', 'success');
        }

        var banner = document.getElementById('dutchWinQrModalBanner');
        var tEl = document.getElementById('dutchWinTitleText');
        var sEl = document.getElementById('dutchWinSubText');
        var inspBtn = document.getElementById('dutchWinInspectBtn');
        if (banner) {
            banner.classList.remove('d-none');
            if (tEl) tEl.textContent = 'Đơn thắng đấu giá ' + data.order_code + ' — Giá chốt: ' + _formatAuctionVND(data.won_price);
            if (sEl) sEl.textContent = 'Mã thanh toán QR: ' + data.pay_token + ' • Bấm nút bên phải để Xem Giá & Xác Nhận Chuyển Khoản hoặc nhờ người thân chuyển khoản hộ.';
            if (inspBtn) inspBtn.href = data.inspect_url;
            __lastDutchWinBehalfUrl = window.location.origin + data.share_behalf_url;
            banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        await loadLiveDualAuctions();
    } catch (e) {}
}

function copyDutchWinBehalfLink() {
    var link = __lastDutchWinBehalfUrl || (window.location.origin + '/services/cart_checkout/bank.html');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).catch(function () {});
    }
    if (typeof notifyToast === 'function') {
        notifyToast('🤝 Đã copy Link Nhờ Bạn Bè / Người Thân Chuyển Khoản Hộ: ' + link, 'info');
    }
}

function startAuctionRealtimeTickers() {
    if (__auctionTickerInterval) clearInterval(__auctionTickerInterval);
    __auctionTickerInterval = setInterval(function () {
        document.querySelectorAll('[data-auction-timer]').forEach(function (el) {
            var rem = Math.max(0, Number(el.getAttribute('data-rem') || 0) - 1);
            el.setAttribute('data-rem', String(rem));
            el.textContent = '⏱️ ' + _formatCountdownClock(rem);
        });

        document.querySelectorAll('[id^="dutchLivePrice_"]').forEach(function (el) {
            var cur = Number(el.getAttribute('data-cur-price') || 0);
            var resP = Number(el.getAttribute('data-reserve') || 0);
            var step = Number(el.getAttribute('data-step') || 20000);
            var nextP = Math.max(resP, cur - Math.round(step / 2));
            el.setAttribute('data-cur-price', String(nextP));
            el.textContent = _formatAuctionVND(nextP);
        });
    }, 1000);
}

/* ==========================================================================
   ĐẤU TRƯỜNG PHẢN XẠ TÂM NGẮM ESPORT 30S (AIM REFLEX ARENA)
   ========================================================================== */

function drawReflexArenaCanvas() {
    var canvas = document.getElementById('reflexArenaCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Lưới radar Esport
    ctx.strokeStyle = 'rgba(118, 185, 0, 0.14)';
    ctx.lineWidth = 1;
    for (var x = 0; x < W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var y = 0; y < H; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!__reflexGameActive) {
        ctx.fillStyle = '#76b900';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 Bấm [🚀 Bắt Đầu Thử Thách 30 Giây] rồi click trúng các tâm ngắm NVIDIA!', W / 2, H / 2);
        return;
    }

    // Vẽ tâm ngắm mục tiêu
    var t = __reflexTarget;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(118, 185, 0, 0.35)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#76b900';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15';
    ctx.fill();
}

function spawnNextReflexTarget() {
    var canvas = document.getElementById('reflexArenaCanvas');
    var W = canvas ? canvas.width : 760;
    var H = canvas ? canvas.height : 310;
    __reflexTarget = {
        x: Math.floor(50 + Math.random() * (W - 100)),
        y: Math.floor(45 + Math.random() * (H - 90)),
        r: 25,
        spawnedAt: performance.now()
    };
    drawReflexArenaCanvas();
}

function startEsportReflexArenaGame() {
    __reflexGameActive = true;
    __reflexRemainingSec = 30.0;
    __reflexHits = 0;
    __reflexTimesMs = [];
    spawnNextReflexTarget();

    if (__reflexTimerId) clearInterval(__reflexTimerId);
    __reflexTimerId = setInterval(function () {
        __reflexRemainingSec = Math.max(0, __reflexRemainingSec - 0.1);
        var tBadge = document.getElementById('reflexTimerBadge');
        if (tBadge) tBadge.textContent = '⏱️ ' + __reflexRemainingSec.toFixed(1) + 's';
        if (__reflexRemainingSec <= 0) {
            clearInterval(__reflexTimerId);
            __reflexGameActive = false;
            drawReflexArenaCanvas();
            finishAndClaimReflexArenaReward();
        }
    }, 100);
}

async function finishAndClaimReflexArenaReward() {
    var hits = Math.max(10, __reflexHits);
    var avgMs = __reflexTimesMs.length
        ? Math.round(__reflexTimesMs.reduce(function (a, b) { return a + b; }, 0) / __reflexTimesMs.length)
        : 225;

    try {
        var res = await fetch('/api/minigame/reflex-arena/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: _getAuctionCurrentUsername(),
                hits: hits,
                avg_reflex_ms: avgMs
            })
        });
        var data = await res.json();
        if (data && data.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            if (Array.isArray(data.leaderboard)) renderReflexLeaderboard(data.leaderboard);
            var cBadge = document.getElementById('headerUserCoinsBadge');
            if (cBadge && data.new_coins_balance) {
                cBadge.textContent = '🪙 ' + Number(data.new_coins_balance).toLocaleString('vi-VN') + ' Xu';
            }
        }
    } catch (e) {}
}

function instantClaimReflexRewardDemo() {
    __reflexHits = 24;
    __reflexTimesMs = [195, 210, 225, 205];
    var hBadge = document.getElementById('reflexHitsBadge');
    var msBadge = document.getElementById('reflexMsBadge');
    if (hBadge) hBadge.textContent = '🎯 Mục tiêu: 24';
    if (msBadge) msBadge.textContent = '⚡ Phản xạ: 209 ms';
    finishAndClaimReflexArenaReward();
}

function renderReflexLeaderboard(list) {
    var box = document.getElementById('reflexLeaderboardList');
    if (!box) return;
    if (!list.length) {
        box.innerHTML = '<div class="text-muted small">Hãy là xạ thủ đầu tiên ghi danh lên bảng vàng hôm nay!</div>';
        return;
    }
    box.innerHTML = list.map(function (item, idx) {
        return (
            '<div class="p-2 rounded-3 border d-flex justify-content-between align-items-center" style="background:rgba(118,185,0,0.06);">' +
                '<div>' +
                    '<strong class="text-nvidia">#' + (idx + 1) + ' ' + item.username + '</strong>' +
                    '<div class="text-muted" style="font-size:11px;">🎯 ' + item.hits + ' hits • ⚡ ' + item.avg_reflex_ms + ' ms</div>' +
                '</div>' +
                '<span class="badge bg-warning text-dark fw-bold">+' + Number(item.reward_coins || 15000).toLocaleString('vi-VN') + ' Xu</span>' +
            '</div>'
        );
    }).join('');
}

function bindReflexCanvasClick() {
    var canvas = document.getElementById('reflexArenaCanvas');
    if (!canvas) return;
    canvas.addEventListener('mousedown', function (ev) {
        if (!__reflexGameActive) return;
        var rect = canvas.getBoundingClientRect();
        var cx = ((ev.clientX - rect.left) / rect.width) * canvas.width;
        var cy = ((ev.clientY - rect.top) / rect.height) * canvas.height;
        var dist = Math.hypot(cx - __reflexTarget.x, cy - __reflexTarget.y);
        if (dist <= __reflexTarget.r + 10) {
            __reflexHits += 1;
            var reactMs = Math.max(95, Math.round(performance.now() - __reflexTarget.spawnedAt));
            __reflexTimesMs.push(reactMs);
            var hBadge = document.getElementById('reflexHitsBadge');
            var msBadge = document.getElementById('reflexMsBadge');
            if (hBadge) hBadge.textContent = '🎯 Mục tiêu: ' + __reflexHits;
            if (msBadge) msBadge.textContent = '⚡ Phản xạ: ' + reactMs + ' ms';
            spawnNextReflexTarget();
        }
    });
    drawReflexArenaCanvas();
}

window.loadLiveDualAuctions = loadLiveDualAuctions;
window.submitStandardAuctionBid = submitStandardAuctionBid;
window.claimDutchFlashAuction = claimDutchFlashAuction;
window.copyDutchWinBehalfLink = copyDutchWinBehalfLink;
window.startEsportReflexArenaGame = startEsportReflexArenaGame;
window.instantClaimReflexRewardDemo = instantClaimReflexRewardDemo;

document.addEventListener('DOMContentLoaded', function () {
    loadLiveDualAuctions();
    startAuctionRealtimeTickers();
    bindReflexCanvasClick();
});