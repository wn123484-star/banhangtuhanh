let __settingsPwMethod = 'otp';
let __currentSettingsUser = null;

function switchSettingsPwMethod(methodKey) {
    __settingsPwMethod = methodKey;
    ['otp', 'security_question', 'old_password'].forEach(m => {
        const box = document.getElementById('setPwBox_' + m);
        if (box) box.classList.toggle('d-none', m !== methodKey);
    });
    const bOtp = document.getElementById('setPwTab_otp');
    const bQues = document.getElementById('setPwTab_question');
    const bOld = document.getElementById('setPwTab_old');
    if (bOtp) bOtp.className = methodKey === 'otp' ? 'btn btn-nvidia fw-bold' : 'btn btn-outline-secondary fw-bold';
    if (bQues) bQues.className = methodKey === 'security_question' ? 'btn btn-nvidia fw-bold' : 'btn btn-outline-info fw-bold';
    if (bOld) bOld.className = methodKey === 'old_password' ? 'btn btn-nvidia fw-bold' : 'btn btn-outline-secondary fw-bold';
}

async function loadUserSecurityProfileInSettings() {
    const localUser = typeof getAuthUser === 'function' ? getAuthUser() : JSON.parse(localStorage.getItem('nvidia_user') || 'null');
    const uid = localUser ? localUser.id : 1;
    try {
        const res = await fetch(`/api/auth/security-status?user_id=${uid}`);
        if (!res.ok) return;
        const data = await res.json();
        const u = data.user || localUser || { id: 1, username: 'khachhang', full_name: 'Thành viên Nvidia' };
        __currentSettingsUser = u;
        const prof = data.security_profile || u.security_profile || { completion_score: 50, missing_items: [] };

        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        setVal('setUsername', u.username || ('user_' + u.id));
        setVal('setFullName', u.full_name || '');
        setVal('setEmail', u.email || '');
        setVal('setPhone', u.phone || '');
        setVal('setSecurityQuestion', prof.security_question || u.security_question || 'Thương hiệu công nghệ yêu thích nhất của bạn là gì?');

        const qLbl = document.getElementById('setActiveQuestionLabel');
        if (qLbl) qLbl.textContent = prof.security_question || u.security_question || 'Thương hiệu công nghệ yêu thích nhất của bạn là gì?';

        const twoFaEl = document.getElementById('setTwoFactorSwitch');
        if (twoFaEl) twoFaEl.checked = prof.has_two_factor !== false;

        renderSecurityHealthDashboard(prof);
    } catch (e) {}
}

function renderSecurityHealthDashboard(prof) {
    const score = Number(prof.completion_score || 50);
    const badge = document.getElementById('secHealthScoreBadge');
    const bigNum = document.getElementById('secScoreBigNumber');
    const bar = document.getElementById('secHealthProgressBar');
    const checklist = document.getElementById('secMissingChecklistBox');
    const headline = document.getElementById('secAdvisorHeadline');

    if (bigNum) bigNum.textContent = score + '%';
    if (bar) {
        bar.style.width = score + '%';
        bar.className = score >= 80 ? 'progress-bar bg-success' : (score >= 50 ? 'progress-bar bg-warning' : 'progress-bar bg-danger');
    }
    if (badge) {
        badge.className = score >= 80 ? 'badge bg-success fw-bold' : 'badge bg-warning text-dark fw-bold';
        badge.textContent = `Độ hoàn thiện bảo mật: ${score}%`;
    }
    if (headline) {
        headline.textContent = score >= 100
            ? '✅ Hồ Sơ Bảo Mật Đã Hoàn Thiện Tuyệt Đối (100% Sẵn Sàng Đổi/Khôi Phục Mật Khẩu)'
            : '🛡️ Gợi Ý Hoàn Thiện Thông Tin Bảo Mật Tài Khoản';
    }

    if (!checklist) return;
    const items = [
        { ok: prof.has_email, text: 'Email nhận mã OTP' },
        { ok: prof.has_phone, text: 'Số điện thoại xác thực' },
        { ok: prof.has_security_question, text: 'Câu hỏi & Câu trả lời bảo mật' },
        { ok: prof.has_two_factor, text: 'Bảo vệ Smart OTP 2 lớp' }
    ];
    checklist.innerHTML = items.map(it => `
        <span class="badge ${it.ok ? 'bg-success' : 'bg-warning text-dark'} p-2">
            ${it.ok ? '✔ Đã có:' : '⚠️ Cần bổ sung:'} ${it.text}
        </span>
    `).join('');
}

async function saveSecurityProfileSettings(e) {
    if (e && e.preventDefault) e.preventDefault();
    const localUser = __currentSettingsUser || (typeof getAuthUser === 'function' ? getAuthUser() : null);
    const uid = localUser ? localUser.id : 1;

    const payload = {
        user_id: uid,
        full_name: document.getElementById('setFullName')?.value.trim() || '',
        email: document.getElementById('setEmail')?.value.trim() || '',
        phone: document.getElementById('setPhone')?.value.trim() || '',
        security_question: document.getElementById('setSecurityQuestion')?.value || '',
        security_answer: document.getElementById('setSecurityAnswer')?.value.trim() || '',
        two_factor_enabled: Boolean(document.getElementById('setTwoFactorSwitch')?.checked)
    };

    try {
        const res = await fetch('/api/auth/update-security-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Lỗi lưu hồ sơ!', 'warning');
            return;
        }
        if (data.user) {
            localStorage.setItem('nvidia_user', JSON.stringify(data.user));
            localStorage.setItem('auth_user', JSON.stringify(data.user));
        }
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        loadUserSecurityProfileInSettings();
    } catch (err) {}
}

async function sendOtpInSettingsPage() {
    const localUser = __currentSettingsUser || (typeof getAuthUser === 'function' ? getAuthUser() : null);
    const uid = localUser ? localUser.id : 1;
    const banner = document.getElementById('setSmartOtpBanner');
    try {
        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid })
        });
        const data = await res.json();
        if (res.ok && banner) {
            banner.classList.remove('d-none');
            banner.innerHTML = `📲 <strong>Mã Smart OTP của bạn:</strong> <span class="badge bg-nvidia fs-6 font-monospace ms-1">${data.otp_demo_code}</span> (Hiệu lực 5 phút)`;
            const otpInp = document.getElementById('setOtpInput');
            if (otpInp) otpInp.value = data.otp_demo_code;
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        }
    } catch (e) {}
}

async function submitSettingsPasswordChange(e) {
    if (e && e.preventDefault) e.preventDefault();
    const localUser = __currentSettingsUser || (typeof getAuthUser === 'function' ? getAuthUser() : null);
    const uid = localUser ? localUser.id : 1;
    const newPw = document.getElementById('setNewPwInput')?.value.trim() || '';
    const confirmPw = document.getElementById('setConfirmPwInput')?.value.trim() || '';

    if (newPw !== confirmPw) {
        if (typeof notifyToast === 'function') notifyToast('Mật khẩu xác nhận không khớp!', 'warning');
        return;
    }

    const payload = {
        user_id: uid,
        method: __settingsPwMethod,
        new_password: newPw,
        otp_code: document.getElementById('setOtpInput')?.value.trim() || '',
        security_answer: document.getElementById('setAnswerVerifyInput')?.value.trim() || '',
        old_password: document.getElementById('setOldPwInput')?.value.trim() || ''
    };

    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            if (typeof notifyToast === 'function') notifyToast(data.error || 'Không thể đổi mật khẩu!', 'warning');
            return;
        }
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        document.getElementById('setNewPwInput').value = '';
        document.getElementById('setConfirmPwInput').value = '';
        document.getElementById('setSmartOtpBanner')?.classList.add('d-none');
    } catch (err) {}
}

document.addEventListener('DOMContentLoaded', loadUserSecurityProfileInSettings);