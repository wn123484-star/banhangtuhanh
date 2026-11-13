function redirectToLogin() {
    window.location.href = '/services/auth/auth.html';
}

function setMessage(text, isError = false) {
    const el = document.getElementById('farm-message');
    if (!el) return;
    el.textContent = text;
    el.className = isError ? 'text-danger small fw-bold' : 'text-success small fw-bold';
}

function formatXu(value) {
    return Number(value || 0).toLocaleString('vi-VN') + ' Xu';
}

function formatDuration(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds || 0)));
    return s + 's';
}

function renderFarm() {}
function startCountdown() {}
function loadFarm() {}
function sendFarmAction(action, payload) {}
function closeFarm() {
    window.location.href = '/services/minigame/farm.html';
}