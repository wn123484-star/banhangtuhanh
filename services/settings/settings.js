/* [FEAT-ACC-009] Studio 12 Giao Diện, 5 Chế Độ Mù Màu (CVD) & Hỗ Trợ Đa Khuyết Tật | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/settings/accessibility / system_settings / settings.js | [LOCKED-DESIGN] */
/* [FEAT-ACC-009.5] Bố Cục Trang Cài Đặt Khoa Học 2 Cột (Master-Detail Sidebar + 6 Thẻ Tóm Tắt Nhanh) | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /services/settings/settings.html | [LOCKED-DESIGN] */
/* [FEAT-HDR-001.6] Bộ Điều Khiển Cỡ Chữ Toàn Sàn (4 Mức) & Độ Cao Thanh Header (4 Chế Độ) | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/settings/accessibility / core/main.js | [LOCKED-DESIGN] */
/* [FEAT-AUTH-003] Bảo Mật RBAC 25 Trang, Cổng Đăng Nhập Chuyển Khoản & Phiên Xác Thực OTP | Trạng thái: PRODUCTION_DB_LINKED | Liên kết: /api/auth/change-password / users / settings.js | [LOCKED-DESIGN] */

let __settingsPwMethod = 'otp';
let __currentSettingsUser = null;
let __activeSettingsMasterCategory = 'cat1_theme';

/* [FEAT-ACC-009.5] Chuyển đổi giữa 5 nhóm cài đặt cột trái (hoặc hiển thị tất cả 'all') */
function switchSettingsMasterCategory(catKey, optionalScrollAnchorId) {
    const validCats = ['cat1_theme', 'cat2_typography_header', 'cat3_accessibility', 'cat4_security_otp', 'cat5_icons_audio'];
    const showAll = (catKey === 'all');
    __activeSettingsMasterCategory = showAll ? 'all' : (validCats.includes(catKey) ? catKey : 'cat1_theme');

    const panels = document.querySelectorAll('.settings-master-panel[data-settings-panel]');
    panels.forEach(p => {
        const pKey = p.getAttribute('data-settings-panel');
        if (showAll || pKey === __activeSettingsMasterCategory) {
            p.classList.remove('d-none');
        } else {
            p.classList.add('d-none');
        }
    });

    validCats.forEach(c => {
        const navBtn = document.getElementById('settingsNavBtn_' + c);
        const subAcc = document.getElementById('subAcc_' + c);
        const isActive = (!showAll && c === __activeSettingsMasterCategory);
        if (navBtn) navBtn.classList.toggle('active-nav', isActive);
        if (subAcc) subAcc.classList.toggle('d-none', !(showAll || isActive));
    });

    const quickMap = {
        cat1_theme: 'quickCard_cat1',
        cat2_typography_header: 'quickCard_cat2',
        cat3_accessibility: 'quickCard_cat3',
        cat4_security_otp: 'quickCard_cat4',
        cat5_icons_audio: 'quickCard_cat5'
    };
    document.querySelectorAll('.nv-settings-quick-card').forEach(card => card.classList.remove('active-card'));
    if (optionalScrollAnchorId === 'walletPinAnchorBox') {
        document.getElementById('quickCard_cat4_pin')?.classList.add('active-card');
    } else if (!showAll && quickMap[__activeSettingsMasterCategory]) {
        document.getElementById(quickMap[__activeSettingsMasterCategory])?.classList.add('active-card');
    }

    const showAllTopBtn = document.getElementById('btnToggleShowAllSettings');
    if (showAllTopBtn) {
        showAllTopBtn.textContent = showAll ? '🎯 Chế Độ Tập Trung 1 Nhóm' : '📋 Xem Tất Cả 5 Nhóm';
        showAllTopBtn.setAttribute('onclick', showAll ? "switchSettingsMasterCategory('cat1_theme')" : "switchSettingsMasterCategory('all')");
    }

    if (optionalScrollAnchorId) {
        const anchorEl = document.getElementById(optionalScrollAnchorId);
        if (anchorEl) {
            setTimeout(() => anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
        }
    }
}
window.switchSettingsMasterCategory = switchSettingsMasterCategory;

/* [FEAT-HDR-001.6] Chọn Cỡ chữ toàn sàn (small, normal, large, xlarge) & cập nhật Live Preview */
function selectSettingsFontScale(scaleKey, silentInit) {
    const map = window.NV_FONT_SCALE_MODES || {
        small: { label: 'A- Nhỏ gọn (14px - 92%)', rootPx: '14px', scale: '0.92' },
        normal: { label: 'A Tiêu chuẩn (16px - 100%)', rootPx: '16px', scale: '1.00' },
        large: { label: 'A+ Chữ lớn dễ đọc (17.5px - 110%)', rootPx: '17.5px', scale: '1.10' },
        xlarge: { label: 'A++ Rất lớn cho người lớn tuổi (19px - 120%)', rootPx: '19px', scale: '1.20' }
    };
    const key = map[scaleKey] ? scaleKey : 'normal';
    if (!silentInit && typeof window.applyGlobalFontScale === 'function') {
        window.applyGlobalFontScale(key, true);
    } else {
        document.documentElement.setAttribute('data-font-scale', key);
        document.documentElement.style.setProperty('--nv-font-scale', map[key].scale);
    }

    document.querySelectorAll('.nv-font-scale-btn').forEach(btn => {
        const bKey = btn.getAttribute('data-scale-key');
        const active = (bKey === key);
        btn.className = active
            ? 'btn btn-primary w-100 h-100 py-2 text-start nv-font-scale-btn'
            : 'btn btn-outline-primary w-100 h-100 py-2 text-start nv-font-scale-btn';
    });

    const badge = document.getElementById('settingsCurrentFontScaleBadge');
    if (badge) badge.textContent = `Đang dùng: ${map[key].label}`;

    const meta = document.getElementById('settingsFontPreviewMetaLabel');
    if (meta) meta.textContent = `root font-size: ${map[key].rootPx} | scale: ${map[key].scale}`;

    refreshSettingsQuickSummaryCards();
}
window.selectSettingsFontScale = selectSettingsFontScale;

/* [FEAT-HDR-001.6] Chọn Chế độ độ cao thanh Header (ultra_compact, compact, standard, comfortable_tall) */
function selectSettingsHeaderHeightMode(heightKey, silentInit) {
    const map = window.NV_HEADER_HEIGHT_MODES || {
        ultra_compact: { label: '⚡ Siêu Gọn (Ẩn tầng 3 khi cuộn xuống)' },
        compact: { label: '📐 Gọn Gàng (~95px)' },
        standard: { label: '🏛️ Tiêu Chuẩn (~125px)' },
        comfortable_tall: { label: '🔍 Thoáng Rộng / Chữ To (~148px)' }
    };
    const key = map[heightKey] ? heightKey : 'standard';
    if (!silentInit && typeof window.applyHeaderHeightMode === 'function') {
        window.applyHeaderHeightMode(key, true);
    } else {
        document.documentElement.setAttribute('data-header-height', key);
    }

    document.querySelectorAll('.nv-header-height-btn').forEach(btn => {
        const bKey = btn.getAttribute('data-height-key');
        const active = (bKey === key);
        btn.className = active
            ? 'btn btn-success w-100 h-100 p-2 text-start nv-header-height-btn'
            : 'btn btn-outline-success w-100 h-100 p-2 text-start nv-header-height-btn';
    });

    const badge = document.getElementById('settingsCurrentHeaderHeightBadge');
    if (badge) badge.textContent = `Đang dùng: ${map[key].label}`;

    refreshSettingsQuickSummaryCards();
}
window.selectSettingsHeaderHeightMode = selectSettingsHeaderHeightMode;

function resetTypographyAndHeaderDefaults() {
    selectSettingsFontScale('normal', false);
    selectSettingsHeaderHeightMode('standard', false);
    if (typeof applyProductGridDensity === 'function') {
        applyProductGridDensity('3');
    }
    const densitySel = document.getElementById('settingsGridDensitySelect');
    if (densitySel) densitySel.value = '3';
    refreshSettingsQuickSummaryCards();
    if (typeof notifyToast === 'function') {
        notifyToast('🔄 Đã khôi phục Cỡ chữ 100%, Độ cao Header Tiêu Chuẩn và Kệ 3 Cột Kính Mờ!', 'info');
    }
}
window.resetTypographyAndHeaderDefaults = resetTypographyAndHeaderDefaults;

/* [FEAT-ACC-009.5] Đồng bộ dữ liệu trạng thái thực tế lên 6 Thẻ Quick-Action ở đầu trang */
function refreshSettingsQuickSummaryCards() {
    const curSkin = document.documentElement.getAttribute('data-nv-skin') || localStorage.getItem('nvx_visual_skin') || 'executive_light';
    const skinLabels = {
        executive_light: 'Executive Pearl Light (Sáng)',
        swiss_finance: 'Swiss Financial Banking',
        apple_cupertino: 'Minimalist Cupertino Silver',
        muji_warm_paper: 'Warm Ivory Paper (Dịu mắt)',
        nordic_snow: 'Nordic Ice Daylight',
        oxford_academic: 'Oxford Scholarly Classic',
        bloomberg_terminal: 'Wall Street Night Terminal',
        obsidian_luxury: 'Obsidian Gold VIP (Tối)',
        emerald_tech: 'Nexora Emerald Matrix',
        ocean_breeze: 'Deep Ocean Breeze',
        kyoto_autumn: 'Kyoto Autumn Leaves',
        tet_festival: 'Lễ Hội Tết Sum Vầy'
    };
    const stTheme = document.getElementById('quickStatus_theme');
    if (stTheme) stTheme.textContent = skinLabels[curSkin] || curSkin;

    const curFont = document.documentElement.getAttribute('data-font-scale') || localStorage.getItem('nvx_font_scale') || 'normal';
    const curHdr = document.documentElement.getAttribute('data-header-height') || localStorage.getItem('nvx_header_height_mode') || 'standard';
    const fontShort = { small: '92% (14px)', normal: '100% (16px)', large: '110% (17.5px)', xlarge: '120% (19px)' };
    const hdrShort = { ultra_compact: 'Siêu Gọn', compact: 'Gọn (~95px)', standard: 'Tiêu chuẩn', comfortable_tall: 'Thoáng (~148px)' };
    const stFont = document.getElementById('quickStatus_fontHeader');
    if (stFont) stFont.textContent = `Chữ ${fontShort[curFont] || '100%'} • Header ${hdrShort[curHdr] || 'Tiêu chuẩn'}`;

    const curCvd = localStorage.getItem('nvx_cvd_mode') || 'normal';
    const hoverOn = localStorage.getItem('nvx_color_hover_assist_enabled') !== '0';
    const cvdShort = {
        normal: 'Chuẩn (Normal)',
        deuteranopia: 'Đỏ-Lục (Deuteranopia)',
        tritanopia: 'Xanh-Vàng (Tritanopia)',
        pattern_labels: 'Nhãn Ký Hiệu [▲/▼]',
        high_contrast_aaa: 'Tương Phản AAA'
    };
    const stCvd = document.getElementById('quickStatus_cvd');
    if (stCvd) stCvd.textContent = `${cvdShort[curCvd] || 'Chuẩn'} • Báo màu 2s: ${hoverOn ? 'Bật' : 'Tắt'}`;

    const otpVerified = __currentSettingsUser ? Number(__currentSettingsUser.email_verified || 0) === 1 : true;
    const stOtp = document.getElementById('quickStatus_otp');
    if (stOtp) stOtp.textContent = otpVerified ? '✔ Đã xác minh OTP (+20.000 Xu)' : '⚠️ Chưa xác minh OTP (+20K Xu)';

    const stPin = document.getElementById('quickStatus_walletPin');
    if (stPin) stPin.textContent = '🛡️ Khóa PIN 6 số & Escrow 100%';

    const activeIconSet = localStorage.getItem('nvx_active_icon_set') || 'default';
    const stIcon = document.getElementById('quickStatus_iconSet');
    if (stIcon) stIcon.textContent = `Đang bật: ${activeIconSet === 'default' ? 'Bộ Mặc định (14 Vị trí)' : activeIconSet.toUpperCase()}`;
}
window.refreshSettingsQuickSummaryCards = refreshSettingsQuickSummaryCards;

async function switchActiveIconSetFromSettings(setId) {
    try {
        const res = await fetch('/api/settings/icon-sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'activate_set', set_id: setId })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            localStorage.setItem('nvx_active_icon_set', setId);
            if (typeof window.refreshAllDynamicSlotIconsOnDom === 'function') {
                window.refreshAllDynamicSlotIconsOnDom(setId, Date.now());
            }
            refreshSettingsQuickSummaryCards();
            if (typeof notifyToast === 'function') {
                notifyToast(data.message || `🖼️ Đã kích hoạt bộ Icon [${setId}] cho toàn bộ 14 vị trí!`, 'success');
            }
        }
    } catch (e) {}
}
window.switchActiveIconSetFromSettings = switchActiveIconSetFromSettings;

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
        const u = data.user || localUser || { id: 1, username: 'khachhang', full_name: 'Thành viên Nexora' };
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

        /* [FEAT-AUTH-003.3] Làm mờ / khóa nút Gửi OTP nếu Email đã được xác minh bảo mật */
        if (Number(u.email_verified || 0) === 1 && typeof window.applyVerifiedOtpUiLockState === 'function') {
            window.applyVerifiedOtpUiLockState(true);
        }

        renderSecurityHealthDashboard(prof);
        refreshSettingsQuickSummaryCards();
    } catch (e) {}
}

function renderSecurityHealthDashboard(prof) {
    const score = Number(prof.completion_score || 50);
    const badge = document.getElementById('secHealthScoreBadge');
    const bigNum = document.getElementById('secScoreBigNumber');
    const bar = document.getElementById('secHealthProgressBar');
    const checklist = document.getElementById('secMissingChecklistBox');
    const headline = document.getElementById('secAdvisorHeadline');
    const sbPct = document.getElementById('sidebarCompletionPctBadge');
    const sbBar = document.getElementById('sidebarCompletionProgressBar');

    if (bigNum) bigNum.textContent = score + '%';
    if (sbPct) sbPct.textContent = Math.max(score, 85) + '%';
    if (sbBar) sbBar.style.width = Math.max(score, 85) + '%';
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

    const pinInputVal = document.getElementById('setWalletPinInput')?.value.trim() || '';
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
        if (pinInputVal && /^\d{6}$/.test(pinInputVal)) {
            await fetch('/api/account/update-profile-and-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: uid,
                    full_name: payload.full_name,
                    email: payload.email,
                    phone: payload.phone,
                    wallet_pin: pinInputVal
                })
            });
            const pinBadge = document.getElementById('setWalletPinMaskedBadge');
            if (pinBadge) pinBadge.textContent = '••••' + pinInputVal.slice(-2);
            document.getElementById('setWalletPinInput').value = '';
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
        if (data.new_coins_balance !== undefined) {
            const cEl = document.getElementById('headerUserCoinsBadge');
            if (cEl) cEl.textContent = `🪙 ${Number(data.new_coins_balance).toLocaleString('vi-VN')} Xu`;
        }
        if (typeof window.applyVerifiedOtpUiLockState === 'function') {
            window.applyVerifiedOtpUiLockState(true);
        }
        if (typeof notifyToast === 'function') notifyToast(data.message || '🎉 Xác thực OTP thành công! Bạn được tặng +20.000 Xu vào Ví Nexora Pay!', 'success');
        document.getElementById('setNewPwInput').value = '';
        document.getElementById('setConfirmPwInput').value = '';
        document.getElementById('setSmartOtpBanner')?.classList.add('d-none');
        refreshSettingsQuickSummaryCards();
    } catch (err) {}
}

function initSettings12ThemesStudio() {
    const gridBox = document.getElementById('settings12ThemesGridBox');
    const skinSel = document.getElementById('settingsThemeSkinSelector');
    const densitySel = document.getElementById('settingsGridDensitySelect');
    const fxSwitch = document.getElementById('settingsBgFxSwitch');

    const curSkin = document.documentElement.getAttribute('data-nv-skin') || localStorage.getItem('nvx_visual_skin') || 'executive_light';
    const curDensity = localStorage.getItem('nvx_grid_density') || '3';
    const fxEnabled = localStorage.getItem('nvx_bg_fx_enabled') !== '0';

    if (skinSel) skinSel.value = curSkin;
    if (densitySel) densitySel.value = curDensity;
    if (fxSwitch) fxSwitch.checked = fxEnabled;

    if (!gridBox) return;
    const themes = Array.isArray(window.NV_SEASONAL_THEMES) ? window.NV_SEASONAL_THEMES : [
        { key: 'executive_light', label: '⚪ 1. Executive Pearl Light', dark: false },
        { key: 'swiss_finance', label: '🏛️ 2. Swiss Financial Banking', dark: false },
        { key: 'apple_cupertino', label: '🍎 3. Minimalist Cupertino Silver', dark: false },
        { key: 'muji_warm_paper', label: '📜 4. Warm Ivory Paper', dark: false },
        { key: 'nordic_snow', label: '❄️ 5. Nordic Ice Daylight', dark: false },
        { key: 'oxford_academic', label: '🎓 6. Oxford Scholarly Classic', dark: false },
        { key: 'bloomberg_terminal', label: '📈 7. Wall Street Night Terminal', dark: true },
        { key: 'obsidian_luxury', label: '👑 8. Obsidian Gold VIP', dark: true },
        { key: 'emerald_tech', label: '🟢 9. Nexora Emerald Matrix', dark: true },
        { key: 'ocean_breeze', label: '🌊 10. Deep Ocean Breeze', dark: true },
        { key: 'kyoto_autumn', label: '🍁 11. Kyoto Autumn Leaves', dark: true },
        { key: 'tet_festival', label: '🧧 12. Lễ Hội Tết Sum Vầy', dark: true }
    ];

    gridBox.innerHTML = themes.map(t => {
        const isActive = t.key === curSkin;
        const modeBadge = t.dark
            ? '<span class="badge bg-dark border border-secondary" style="font-size:10px;">🌙 Nền Tối</span>'
            : '<span class="badge bg-light text-dark border" style="font-size:10px;">☀️ Nền Sáng</span>';
        return `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="nv-adaptive-card p-2 h-100 d-flex flex-column justify-content-between ${isActive ? 'border-success' : ''}"
                     data-theme-card-key="${t.key}"
                     style="cursor:pointer;${isActive ? 'box-shadow:0 0 0 2px #059669;' : ''}"
                     onclick="applyNvidiaVisualSkin('${t.key}'); if(typeof refreshSettingsQuickSummaryCards==='function') refreshSettingsQuickSummaryCards();">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        ${modeBadge}
                        <small class="text-nvidia fw-bold" style="font-size:10px;">${isActive ? '✓ Đang dùng' : 'Chọn'}</small>
                    </div>
                    <div class="fw-bold small">${t.label}</div>
                </div>
            </div>
        `;
    }).join('');
}
window.initSettings12ThemesStudio = initSettings12ThemesStudio;

function initSettingsAccessibilityControls() {
    const cvdSel = document.getElementById('settingsCvdModeSelector');
    const motorSw = document.getElementById('settingsMotorLargeBtnSwitch');
    const flashSw = document.getElementById('settingsDeafVisualFlashSwitch');
    const rulerSw = document.getElementById('settingsReadingRulerSwitch');
    const hoverColorSw = document.getElementById('settingsHoverColorInspectorSwitch');

    if (cvdSel) cvdSel.value = localStorage.getItem('nvx_cvd_mode') || 'normal';
    if (motorSw) motorSw.checked = localStorage.getItem('nvx_acc_large_buttons') === '1' || localStorage.getItem('nvx_motor_large_buttons') === '1';
    if (flashSw) flashSw.checked = localStorage.getItem('nvx_acc_visual_flash') === '1' || localStorage.getItem('nvx_deaf_visual_flash') === '1';
    if (rulerSw) rulerSw.checked = localStorage.getItem('nvx_acc_reading_ruler') === '1' || localStorage.getItem('nvx_reading_ruler') === '1';
    if (hoverColorSw) hoverColorSw.checked = localStorage.getItem('nvx_color_hover_assist_enabled') !== '0';

    const curFontScale = localStorage.getItem('nvx_font_scale') || 'normal';
    const curHdrHeight = localStorage.getItem('nvx_header_height_mode') || 'standard';
    selectSettingsFontScale(curFontScale, true);
    selectSettingsHeaderHeightMode(curHdrHeight, true);

    if (typeof renderLiveUiColorPreviewBox === 'function') {
        renderLiveUiColorPreviewBox(localStorage.getItem('nvx_cvd_mode') || 'standard');
    }
    refreshSettingsQuickSummaryCards();
}

document.addEventListener('DOMContentLoaded', () => {
    initSettings12ThemesStudio();
    initSettingsAccessibilityControls();
    loadUserSecurityProfileInSettings();
    /* Mặc định hiển thị tất cả 5 nhóm để mọi phần tử DOM luôn sẵn sàng đồng thời hỗ trợ lọc 1 chạm theo từng mục */
    switchSettingsMasterCategory('all');
});
