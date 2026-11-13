let __isWheelSpinningNow = false;
let __currentWheelRotation = 0;

const WHEEL_SECTORS_DRAW = [
    { label: "50.000 Xu", sub: "JACKPOT", c1: "#15803d", c2: "#166534" },
    { label: "GEAR50K", sub: "VOUCHER", c1: "#1d4ed8", c2: "#1e40af" },
    { label: "20.000 Xu", sub: "COINS", c1: "#b45309", c2: "#92400e" },
    { label: "BRAND30K", sub: "VOUCHER", c1: "#6d28d9", c2: "#5b21b6" },
    { label: "10.000 Xu", sub: "COINS", c1: "#0f766e", c2: "#115e59" },
    { label: "START15K", sub: "VOUCHER", c1: "#be123c", c2: "#9f1239" },
    { label: "5.000 Xu", sub: "COINS", c1: "#334155", c2: "#1e293b" },
    { label: "1.000 Xu", sub: "COINS", c1: "#4d7c0f", c2: "#3f6212" }
];

function renderWheelSvgDisk() {
    const ring = document.getElementById('wheelOuterRing');
    if (ring && !ring.querySelector('.wheel-led-dot')) {
        for (let i = 0; i < 16; i++) {
            const angle = (i * 22.5) * (Math.PI / 180);
            const rx = 174 + Math.cos(angle) * 165 - 5;
            const ry = 174 + Math.sin(angle) * 165 - 5;
            const dot = document.createElement('div');
            dot.className = 'wheel-led-dot';
            dot.style.left = rx.toFixed(1) + 'px';
            dot.style.top = ry.toFixed(1) + 'px';
            ring.appendChild(dot);
        }
    }

    const svg = document.getElementById('wheelSvgDisk');
    if (!svg) return;
    const cx = 150, cy = 150, r = 146;
    let defsHtml = '<defs>';
    let pathsHtml = '';

    for (let i = 0; i < 8; i++) {
        const sec = WHEEL_SECTORS_DRAW[i];
        defsHtml += `
            <linearGradient id="wGrad${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${sec.c1}"/>
                <stop offset="100%" stop-color="${sec.c2}"/>
            </linearGradient>
        `;
        const startAngle = (i * 45 - 90 - 22.5) * (Math.PI / 180);
        const endAngle = ((i + 1) * 45 - 90 - 22.5) * (Math.PI / 180);
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const midAngleDeg = i * 45;
        const midRad = (midAngleDeg - 90) * (Math.PI / 180);
        const tx = cx + (r * 0.65) * Math.cos(midRad);
        const ty = cy + (r * 0.65) * Math.sin(midRad);

        pathsHtml += `
            <path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z"
                  fill="url(#wGrad${i})" stroke="#fde047" stroke-width="1.8"></path>
            <g transform="rotate(${midAngleDeg}, ${tx.toFixed(2)}, ${ty.toFixed(2)})">
                <text x="${tx.toFixed(2)}" y="${(ty - 5).toFixed(2)}" fill="#ffffff" font-size="11.5" font-weight="900"
                      text-anchor="middle" dominant-baseline="middle">${sec.label}</text>
                <text x="${tx.toFixed(2)}" y="${(ty + 9).toFixed(2)}" fill="#fde047" font-size="8.5" font-weight="bold"
                      text-anchor="middle" dominant-baseline="middle">${sec.sub}</text>
            </g>
        `;
    }
    defsHtml += '</defs>';
    svg.innerHTML = defsHtml + pathsHtml;
}

function fireWinConfettiBurst() {
    const canvas = document.getElementById('wheelConfettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({ length: 75 }, () => ({
        x: canvas.width / 2,
        y: canvas.height / 2 - 40,
        vx: (Math.random() - 0.5) * 14,
        vy: -(4 + Math.random() * 10),
        size: 5 + Math.random() * 6,
        color: ['#76b900', '#facc15', '#38bdf8', '#f43f5e', '#a855f7'][Math.floor(Math.random() * 5)],
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
        life: 95
    }));

    function step() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        pieces.forEach(p => {
            if (p.life <= 0) return;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.28;
            p.rot += p.vRot;
            p.life -= 1;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
        });
        if (alive) requestAnimationFrame(step);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(step);
}

async function loadMinigameStatus() {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : 1;
    try {
        const res = await fetch(`/api/minigame/status?user_id=${uid}`);
        if (!res.ok) return;
        const data = await res.json();

        const spinsEl = document.getElementById('wheelSpinsLeft');
        if (spinsEl) spinsEl.textContent = String(data.spins_left ?? 0);

        const coinsEl = document.getElementById('wheelUserCoins');
        if (coinsEl) coinsEl.textContent = Number(data.coins || 0).toLocaleString('vi-VN') + ' Xu';

        const streakEl = document.getElementById('wheelUserStreak');
        if (streakEl) streakEl.textContent = `🔥 ${data.streak_days || 1} ngày`;

        const checkinBtn = document.getElementById('btnDailyCheckinWheel');
        if (checkinBtn) {
            checkinBtn.textContent = data.checked_in_today ? '✅ Đã Điểm Danh' : '📅 Điểm Danh (+1 Lượt)';
        }

        const histBox = document.getElementById('wheelHistoryList');
        if (histBox && Array.isArray(data.history)) {
            if (!data.history.length) {
                histBox.innerHTML = '<span class="text-muted">Chưa có lượt quay nào. Hãy bấm QUAY ngay!</span>';
            } else {
                histBox.innerHTML = data.history.map(h => `
                    <span class="badge bg-dark border border-secondary me-1 mb-1 p-2">
                        🎉 ${h.reward_label} <small class="text-muted">(${String(h.created_at || '').slice(11, 16) || 'Vừa xong'})</small>
                    </span>
                `).join('');
            }
        }
    } catch (e) {}
}

async function loadLeaderboardTable() {
    const tbody = document.getElementById('leaderboardTableBody');
    if (!tbody) return;
    try {
        const res = await fetch('/api/minigame/leaderboard');
        const data = await res.json();
        const rawList = data.leaderboard || [];
        const cleanBuyers = rawList.filter(u => {
            const r = String(u.role || 'buyer').toLowerCase();
            const n = String(u.full_name || '').toLowerCase();
            return r !== 'admin' && r !== 'seller' && !n.includes('quản trị') && !n.includes('official');
        });

        tbody.innerHTML = cleanBuyers.map((u, idx) => {
            const rankMedal = idx === 0 ? '🥇 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : `#${idx + 1}`));
            const memberBadge = idx === 0 ? '<span class="badge bg-warning text-dark">👑 Kim Cương</span>' : (idx < 3 ? '<span class="badge bg-info text-dark">💎 Bạch Kim</span>' : '<span class="badge bg-secondary">⭐ Thành Viên</span>');
            const tierReward = idx < 3 ? 'Voucher 80.000 Xu' : 'Voucher 30.000 Xu';
            return `
                <tr>
                    <td class="fw-bold">${rankMedal}</td>
                    <td class="fw-semibold">👤 ${u.full_name}</td>
                    <td>${memberBadge}</td>
                    <td>🔥 ${u.streak_days || 1} ngày</td>
                    <td class="fw-bold text-warning">🪙 ${Number(u.coins || 0).toLocaleString('vi-VN')} Xu</td>
                    <td class="text-end"><span class="badge bg-nvidia">${tierReward}</span></td>
                </tr>
            `;
        }).join('');
    } catch (e) {}
}

async function spinWheel() {
    if (__isWheelSpinningNow) return;
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : 1;

    const spinsEl = document.getElementById('wheelSpinsLeft');
    const bannerEl = document.getElementById('wheelResultBanner');
    const pointer = document.getElementById('wheelPointerArrow');

    __isWheelSpinningNow = true;
    try {
        const res = await fetch('/api/minigame/wheel/spin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid })
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
            const msg = data.error || 'Bạn đã hết lượt quay (0 lượt)!';
            if (bannerEl) {
                bannerEl.className = 'mt-3 p-2 rounded border small fw-bold text-danger';
                bannerEl.textContent = '⚠️ ' + msg;
            }
            if (typeof notifyToast === 'function') notifyToast(msg, 'warning');
            __isWheelSpinningNow = false;
            return;
        }

        const prizeIdx = Number(data.prize_index || 0);
        const extraSpins = 360 * 6;
        const targetMod = (360 - prizeIdx * 45) % 360;
        const currentMod = __currentWheelRotation % 360;
        const delta = (targetMod - currentMod + 360) % 360;
        __currentWheelRotation += extraSpins + delta;

        const svgDisk = document.getElementById('wheelSvgDisk');
        if (svgDisk) {
            svgDisk.style.transform = `rotate(${__currentWheelRotation}deg)`;
        }
        if (pointer) {
            pointer.style.transform = 'translateX(-50%) rotate(-14deg)';
            setTimeout(() => { pointer.style.transform = 'translateX(-50%) rotate(0deg)'; }, 3100);
        }
        if (bannerEl) {
            bannerEl.className = 'mt-3 p-2 rounded border small fw-bold text-warning';
            bannerEl.textContent = '🎡 Vòng quay LED đang xoay... Chờ đón phần thưởng!';
        }

        setTimeout(() => {
            if (spinsEl && data.spins_left !== undefined) spinsEl.textContent = String(data.spins_left);
            if (bannerEl) {
                bannerEl.className = 'mt-3 p-2 rounded border small fw-bold text-nvidia';
                bannerEl.textContent = data.message || `🎉 Trúng: ${data.reward_label}!`;
            }
            fireWinConfettiBurst();
            if (typeof notifyToast === 'function') {
                notifyToast(data.message || `🎉 Trúng: ${data.reward_label}!`, 'success');
            }
            loadMinigameStatus();
            loadLeaderboardTable();
            __isWheelSpinningNow = false;
        }, 3450);
    } catch (e) {
        __isWheelSpinningNow = false;
    }
}
window.spinWheel = spinWheel;

async function claimDailyCheckinFromWheel() {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : 1;
    try {
        const res = await fetch('/api/minigame/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid })
        });
        const data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã điểm danh!', 'success');
        const bannerEl = document.getElementById('wheelResultBanner');
        if (bannerEl && data.message) bannerEl.textContent = data.message;
        loadMinigameStatus();
        loadLeaderboardTable();
    } catch (e) {}
}

async function exchangeCoinsForSpin() {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : 1;
    try {
        const res = await fetch('/api/minigame/buy-spins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid })
        });
        const data = await res.json();
        if (!res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Không đủ Xu!', 'warning');
            return;
        }
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        const bannerEl = document.getElementById('wheelResultBanner');
        if (bannerEl) bannerEl.textContent = data.message;
        loadMinigameStatus();
    } catch (e) {}
}

async function claimQuickMissionSpins() {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : 1;
    try {
        const res = await fetch('/api/minigame/missions/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, mission_code: 'browse_30s', progress_delta: 30 })
        });
        const data = await res.json();
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        const bannerEl = document.getElementById('wheelResultBanner');
        if (bannerEl) bannerEl.textContent = data.message;
        loadMinigameStatus();
    } catch (e) {}
}

async function loadFarm() {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : 1;
    try {
        const res = await fetch(`/api/minigame/farm?user_id=${uid}`);
        if (!res.ok) return;
        const data = await res.json();
        const progBar = document.querySelector('#farmGrowthBar, .progress-bar');
        if (progBar) {
            progBar.style.width = `${data.growth_pct || 30}%`;
            progBar.textContent = `${data.growth_pct || 30}%`;
        }
        const msgEl = document.querySelector('#farm-message, #farmStatusText');
        if (msgEl && data.message) msgEl.textContent = data.message;
    } catch (e) {}
}

async function sendFarmAction(action, extraPayload = {}) {
    const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
    const uid = user ? user.id : 1;
    const endpoint = action === 'buy' ? '/api/minigame/farm/buy' : '/api/minigame/farm';
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ user_id: uid, action: action }, extraPayload))
        });
        const data = await res.json();
        if (!res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Chưa đủ điều kiện!', 'warning');
            return data;
        }
        if (typeof notifyToast === 'function') notifyToast(data.message || 'Đã chăm sóc cây!', 'success');
        loadFarm();
        loadMinigameStatus();
        return data;
    } catch (e) {
        return null;
    }
}
window.sendFarmAction = sendFarmAction;
window.loadFarm = loadFarm;

document.addEventListener('DOMContentLoaded', () => {
    renderWheelSvgDisk();
    loadMinigameStatus();
    loadLeaderboardTable();
    loadFarm();
});