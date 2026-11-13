let __activeRecoveryMethod = 'otp';
let __configuredGoogleClientId = '';
const AUTH_SCENES_LIST = ['ancient_sakura', 'bamboo_zen', 'aurora_peaks', 'galaxy_blackhole'];
let __scenerySceneMode = 'ancient_sakura';
let __sceneryAnimId = null;

function selectNextSceneOnReload() {
    /* Tự động xoay vòng qua đủ cả 4 cảnh: 1. Anh Đào -> 2. Rừng Tre -> 3. Cực Quang -> 4. Hố Đen */
    const lastIdx = parseInt(localStorage.getItem('nvx_auth_scene_cycle_idx') || '-1', 10);
    const nextIdx = (lastIdx + 1) % AUTH_SCENES_LIST.length;
    localStorage.setItem('nvx_auth_scene_cycle_idx', String(nextIdx));
    __scenerySceneMode = AUTH_SCENES_LIST[nextIdx];
}

function onToggleRegisterTermsCheckbox(chkEl) {
    const box = document.getElementById('regTermsConsentContainer');
    if (box && chkEl) {
        box.classList.toggle('terms-accepted-active', Boolean(chkEl.checked));
    }
}
window.onToggleRegisterTermsCheckbox = onToggleRegisterTermsCheckbox;

function toggleInlineTermsDrawer() {
    const drawer = document.getElementById('inlineTermsAccordionBox');
    if (drawer) drawer.classList.toggle('d-none');
}
window.toggleInlineTermsDrawer = toggleInlineTermsDrawer;

function acceptTermsFromInlineDrawer() {
    const chk = document.getElementById('regAgreeTermsCheck');
    if (chk) {
        chk.checked = true;
        onToggleRegisterTermsCheckbox(chk);
    }
    document.getElementById('inlineTermsAccordionBox')?.classList.add('d-none');
    if (typeof notifyToast === 'function') {
        notifyToast('☑️ Đã xác nhận đồng ý Điều khoản Pháp lý & Chính sách Bảo vệ Người mua!', 'success');
    }
}
window.acceptTermsFromInlineDrawer = acceptTermsFromInlineDrawer;

async function openQuickTermsPreviewModal() {
    const modal = document.getElementById('quickTermsPreviewModal');
    if (!modal) return;
    modal.classList.remove('d-none');

    try {
        const res = await fetch('/api/legal/clauses?audience=all');
        if (!res.ok) return;
        const data = await res.json();
        const clauses = (data.clauses || []).slice(0, 5);
        const listContainer = modal.querySelector('.small.d-flex.flex-column');
        if (listContainer && clauses.length) {
            listContainer.innerHTML = clauses.map(c => `
                <div class="p-2 rounded border border-secondary" style="background: rgba(30,41,59,0.55);">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-nvidia">[${c.article_code}] ${c.title}</strong>
                        <span class="badge bg-dark border border-secondary">v${c.version || 1}</span>
                    </div>
                    <div style="font-size:11.5px;color:#cbd5e1;">${c.content || ''}</div>
                </div>
            `).join('');
        }
    } catch (e) {}
}
window.openQuickTermsPreviewModal = openQuickTermsPreviewModal;

function showAuthBanner(msg, type = 'success') {
    const banner = document.getElementById('authAlertBanner');
    if (!banner) return;
    banner.className = `alert alert-${type === 'error' ? 'danger' : type} py-2 small mb-2`;
    banner.textContent = msg;
    banner.classList.remove('d-none');
}

/* ==========================================================================
   SIÊU ENGINE PHONG CẢNH 4 CHỦ ĐỀ CHỐNG LAG (OFFSCREEN SPRITE CACHE 60FPS)
   1. ancient_sakura   : Đại Thụ Anh Đào Đung Đưa Theo Gió, Đèn Lồng & Sóng Hồ
   2. bamboo_zen       : Rừng Tre Ngọc Bích Đa Đốt, Lá Tre Sắc Nét & Thác Nước Trăng
   3. aurora_peaks     : Đỉnh Núi Tuyết 3D, Cực Quang Bắc Cực & Hành Tinh Vành Đai
   4. galaxy_blackhole : Vũ Trụ Thuần Khiết 100% (Không Núi), Hố Đen 3D & Sao Băng
   ========================================================================== */

function buildPreRenderedSpritesCache() {
    const sprites = {};

    /* 1. Tạo 3 mẫu Sprite Bông Hoa Anh Đào 5 Cánh Khuyết Tim Sắc Nét (36x36px) */
    const colors = [
        { key: 'pink', fill: '#fda4af', stroke: '#fb7185', core: '#fef08a' },
        { key: 'white_pink', fill: '#ffe4e6', stroke: '#fda4af', core: '#facc15' },
        { key: 'deep_pink', fill: '#f472b6', stroke: '#e11d48', core: '#fef9c3' }
    ];

    colors.forEach(cfg => {
        const c = document.createElement('canvas');
        c.width = 36;
        c.height = 36;
        const g = c.getContext('2d');
        const r = 13;
        g.translate(18, 18);
        g.fillStyle = cfg.fill;
        g.strokeStyle = cfg.stroke;
        g.lineWidth = 0.9;
        for (let i = 0; i < 5; i++) {
            g.save();
            g.rotate((i * Math.PI * 2) / 5);
            g.beginPath();
            g.moveTo(0, 0);
            g.bezierCurveTo(-r * 0.52, -r * 0.35, -r * 0.62, -r * 0.96, -r * 0.15, -r * 1.1);
            g.lineTo(0, -r * 0.85);
            g.lineTo(r * 0.15, -r * 1.1);
            g.bezierCurveTo(r * 0.62, -r * 0.96, r * 0.52, -r * 0.35, 0, 0);
            g.fill();
            g.stroke();
            g.restore();
        }
        g.fillStyle = cfg.core;
        g.beginPath();
        g.arc(0, 0, 3.2, 0, Math.PI * 2);
        g.fill();
        sprites[cfg.key] = c;
    });

    /* 2. Tạo Sprite Cụm Tán Hoa Anh Đào Nở Rộ (110x80px) */
    const clusterCanvas = document.createElement('canvas');
    clusterCanvas.width = 110;
    clusterCanvas.height = 80;
    const cg = clusterCanvas.getContext('2d');

    const softGlow = cg.createRadialGradient(55, 40, 4, 55, 40, 46);
    softGlow.addColorStop(0, 'rgba(251, 113, 133, 0.32)');
    softGlow.addColorStop(1, 'rgba(251, 113, 133, 0)');
    cg.fillStyle = softGlow;
    cg.beginPath();
    cg.arc(55, 40, 46, 0, Math.PI * 2);
    cg.fill();

    const clusterPositions = [
        [24, 44, 0.72, 'deep_pink', 0.2], [42, 26, 0.85, 'pink', 0.8], [66, 24, 0.88, 'white_pink', 1.4],
        [84, 42, 0.75, 'pink', 2.1], [35, 52, 0.82, 'white_pink', 2.7], [56, 40, 0.96, 'pink', 0.5],
        [72, 50, 0.80, 'deep_pink', 1.9], [48, 34, 0.90, 'white_pink', 3.1]
    ];
    clusterPositions.forEach(pos => {
        const sp = sprites[pos[3]];
        const sz = 32 * pos[2];
        cg.save();
        cg.translate(pos[0], pos[1]);
        cg.rotate(pos[4]);
        cg.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        cg.restore();
    });
    sprites.canopyCluster = clusterCanvas;

    /* 3. Tạo Sprite Đèn Lồng Lụa Đỏ Phát Sáng (56x76px) */
    const lanCanvas = document.createElement('canvas');
    lanCanvas.width = 56;
    lanCanvas.height = 76;
    const lg = lanCanvas.getContext('2d');
    const lGlow = lg.createRadialGradient(28, 34, 2, 28, 34, 26);
    lGlow.addColorStop(0, 'rgba(254, 240, 138, 0.8)');
    lGlow.addColorStop(0.5, 'rgba(249, 115, 22, 0.3)');
    lGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    lg.fillStyle = lGlow;
    lg.beginPath();
    lg.arc(28, 34, 26, 0, Math.PI * 2);
    lg.fill();

    lg.fillStyle = '#e11d48';
    lg.strokeStyle = '#facc15';
    lg.lineWidth = 1.3;
    lg.beginPath();
    lg.ellipse(28, 34, 10, 13, 0, 0, Math.PI * 2);
    lg.fill();
    lg.stroke();

    lg.fillStyle = '#facc15';
    lg.fillRect(23, 19, 10, 3);
    lg.fillRect(23.5, 46, 9, 3);
    lg.strokeStyle = '#fb7185';
    lg.lineWidth = 1.6;
    lg.beginPath();
    lg.moveTo(28, 49);
    lg.lineTo(28, 64);
    lg.stroke();
    sprites.lantern = lanCanvas;

    /* 4. Tạo Sprite Chùm 4 Lá Tre Ngọc Bích Sắc Nét (64x64px) cho cảnh Rừng Tre */
    const bambooLeafCanvas = document.createElement('canvas');
    bambooLeafCanvas.width = 64;
    bambooLeafCanvas.height = 64;
    const bg = bambooLeafCanvas.getContext('2d');
    bg.translate(8, 12);
    const leafAngles = [0.22, 0.52, 0.82, 1.12];
    leafAngles.forEach((la, idx) => {
        bg.save();
        bg.rotate(la);
        bg.fillStyle = idx % 2 === 0 ? '#4ade80' : '#22c55e';
        bg.strokeStyle = '#14532d';
        bg.lineWidth = 0.7;
        bg.beginPath();
        bg.moveTo(0, 0);
        bg.quadraticCurveTo(5.5, 13, 0, 30);
        bg.quadraticCurveTo(-5.5, 13, 0, 0);
        bg.fill();
        bg.stroke();
        bg.restore();
    });
    sprites.bambooCluster = bambooLeafCanvas;

    return sprites;
}

function initLeftArtisticSceneryCanvas() {
    const canvas = document.getElementById('authSceneryCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spriteCache = buildPreRenderedSpritesCache();

    const stars = Array.from({ length: 115 }, () => ({
        x: Math.random(),
        y: Math.random() * 0.74,
        r: 0.6 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        col: Math.random() > 0.6 ? '#bae6fd' : '#fef08a'
    }));

    const meteors = Array.from({ length: 3 }, (_, i) => ({
        x: Math.random() * 1100,
        y: Math.random() * 250,
        len: 95 + Math.random() * 75,
        speed: 8 + Math.random() * 4,
        alpha: 0,
        cooldown: i * 45 + 30
    }));

    const bhParticles = Array.from({ length: 105 }, (_, i) => ({
        angle: (i / 105) * Math.PI * 2,
        rRatio: 1.38 + (i % 8) * 0.22,
        speed: 0.013 + (0.015 / (1 + (i % 5) * 0.25)),
        size: 1.3 + (i % 3) * 0.8,
        col: i % 3 === 0 ? '#ffffff' : (i % 2 === 0 ? '#fde047' : '#fb923c')
    }));

    const spriteKeys = ['pink', 'white_pink', 'deep_pink'];
    const driftingPetals = Array.from({ length: 50 }, (_, i) => ({
        x: Math.random() * 1400,
        y: Math.random() * 750,
        size: 11 + (i % 4) * 3.5,
        vx: 0.55 + (i % 5) * 0.2,
        vy: 0.45 + (i % 4) * 0.18,
        swayPhase: i * 0.5,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.03,
        spriteKey: spriteKeys[i % 3]
    }));

    const bambooStalks = [
        { xPct: 0.06, width: 14, segH: 54, nodes: 11, swayAmp: 3.5, phase: 0.2, tint: '#15803d' },
        { xPct: 0.11, width: 18, segH: 60, nodes: 11, swayAmp: 2.8, phase: 1.1, tint: '#16a34a' },
        { xPct: 0.16, width: 12, segH: 50, nodes: 12, swayAmp: 4.2, phase: 2.0, tint: '#15803d' },
        { xPct: 0.21, width: 20, segH: 62, nodes: 11, swayAmp: 2.5, phase: 0.7, tint: '#22c55e' },
        { xPct: 0.26, width: 15, segH: 55, nodes: 11, swayAmp: 3.2, phase: 1.6, tint: '#16a34a' },
        { xPct: 0.37, width: 13, segH: 52, nodes: 11, swayAmp: 3.8, phase: 2.5, tint: '#15803d' },
        { xPct: 0.42, width: 17, segH: 58, nodes: 11, swayAmp: 2.9, phase: 0.4, tint: '#22c55e' },
        { xPct: 0.47, width: 11, segH: 48, nodes: 12, swayAmp: 4.5, phase: 1.9, tint: '#14532d' }
    ];

    const lakeRipples = [];

    /* 1. CẢNH ĐẠI THỤ ANH ĐÀO ĐUNG ĐƯA THEO GIÓ */
    function renderSmoothAncientSakuraScene(w, h, horizonY, tick) {
        const baseX = w * 0.24;
        const baseY = horizonY + 12;
        const wind = Math.sin(tick * 1.4) * 5.5 + Math.cos(tick * 0.8) * 2.5;

        ctx.save();
        const moonX = w * 0.30;
        const moonY = h * 0.32;
        const mGlow = ctx.createRadialGradient(moonX, moonY, 18, moonX, moonY, 155);
        mGlow.addColorStop(0, 'rgba(255, 251, 235, 0.95)');
        mGlow.addColorStop(0.45, 'rgba(244, 114, 182, 0.32)');
        mGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 155, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111827';
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(baseX + 8, baseY + 6, 150, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.lineCap = 'round';
        ctx.strokeStyle = '#2d1510';
        ctx.lineWidth = 24;
        ctx.beginPath();
        ctx.moveTo(baseX - 10, baseY + 6);
        ctx.quadraticCurveTo(baseX - 4, horizonY - 85, baseX + 10 + wind * 0.2, horizonY - 165);
        ctx.stroke();

        const tx = baseX + 10 + wind * 0.2;
        const ty = horizonY - 165;

        const mainLimbs = [
            { cx: tx - 75, cy: ty - 45, ex: tx - 165 + wind * 0.9, ey: ty - 75 + wind * 0.3, w: 12, lantern: true },
            { cx: tx - 40, cy: ty - 85, ex: tx - 95 + wind * 1.1, ey: ty - 125 + wind * 0.4, w: 10, lantern: false },
            { cx: tx + 5, cy: ty - 95, ex: tx + 10 + wind * 1.2, ey: ty - 140 + wind * 0.3, w: 11, lantern: false },
            { cx: tx + 65, cy: ty - 85, ex: tx + 115 + wind * 1.1, ey: ty - 120 + wind * 0.4, w: 10, lantern: false },
            { cx: tx + 95, cy: ty - 45, ex: tx + 185 + wind * 1.0, ey: ty - 70 + wind * 0.4, w: 11, lantern: true },
            { cx: tx - 55, cy: ty - 15, ex: tx - 125 + wind * 0.8, ey: ty - 28 + wind * 0.3, w: 8.5, lantern: false },
            { cx: tx + 75, cy: ty - 15, ex: tx + 145 + wind * 0.8, ey: ty - 22 + wind * 0.3, w: 8.5, lantern: false }
        ];

        for (const limb of mainLimbs) {
            ctx.strokeStyle = '#3b1b14';
            ctx.lineWidth = limb.w;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(limb.cx, limb.cy, limb.ex, limb.ey);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(253, 164, 175, 0.28)';
            ctx.lineWidth = limb.w * 0.25;
            ctx.beginPath();
            ctx.moveTo(tx, ty - 2);
            ctx.quadraticCurveTo(limb.cx, limb.cy - 2, limb.ex, limb.ey - 2);
            ctx.stroke();

            if (limb.lantern) {
                const swing = Math.sin(tick * 2.1 + limb.w) * 0.12;
                ctx.save();
                ctx.translate(limb.ex, limb.ey);
                ctx.rotate(swing);
                ctx.drawImage(spriteCache.lantern, -28, -4);
                ctx.restore();
            }
        }

        const canopySpots = [
            [-165, -78, 1.05], [-120, -102, 1.15], [-75, -125, 1.2], [-25, -142, 1.25],
            [25, -140, 1.25], [75, -128, 1.2], [125, -112, 1.15], [175, -75, 1.05],
            [-130, -35, 1.0], [-75, -62, 1.15], [-15, -82, 1.2], [45, -78, 1.18],
            [102, -58, 1.1], [145, -28, 0.98]
        ];

        canopySpots.forEach((sp, idx) => {
            const localSwayX = wind * (0.7 + (idx % 3) * 0.22);
            const localSwayY = Math.sin(tick * 1.8 + idx) * 2.5;
            const cx = tx + sp[0] + localSwayX;
            const cy = ty + sp[1] + localSwayY;
            const cw = 110 * sp[2];
            const ch = 80 * sp[2];
            ctx.drawImage(spriteCache.canopyCluster, cx - cw * 0.5, cy - ch * 0.5, cw, ch);
        });

        for (let i = lakeRipples.length - 1; i >= 0; i--) {
            const rp = lakeRipples[i];
            rp.rx += 0.5;
            rp.ry += 0.13;
            rp.alpha -= 0.009;
            if (rp.alpha <= 0) {
                lakeRipples.splice(i, 1);
                continue;
            }
            ctx.strokeStyle = `rgba(253, 164, 175, ${rp.alpha.toFixed(2)})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.ellipse(rp.x, rp.y, rp.rx, rp.ry, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (const p of driftingPetals) {
            p.swayPhase += 0.024;
            p.x += p.vx + Math.cos(p.swayPhase) * 0.55;
            p.y += p.vy;
            p.angle += p.vAngle;

            if (p.y >= horizonY + 10 && Math.random() < 0.05 && lakeRipples.length < 14) {
                lakeRipples.push({ x: p.x, y: Math.min(h - 8, p.y), rx: 3, ry: 1, alpha: 0.6 });
                p.y = -15;
                p.x = Math.random() * (w * 0.75);
            } else if (p.y > h + 15) {
                p.y = -15;
                p.x = Math.random() * w;
            }
            if (p.x > w + 20) p.x = -15;

            const spImg = spriteCache[p.spriteKey];
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.drawImage(spImg, -p.size * 0.5, -p.size * 0.5, p.size, p.size);
            ctx.restore();
        }

        ctx.restore();
    }

    /* 2. CẢNH RỪNG TRE TRÚC NGỌC BÍCH, THÁC NƯỚC & TRĂNG THANH */
    function renderSmoothBambooZenScene(w, h, horizonY, tick) {
        ctx.save();
        /* Mặt trăng ngọc bích */
        const moonX = w * 0.31;
        const moonY = h * 0.30;
        const mGlow = ctx.createRadialGradient(moonX, moonY, 14, moonX, moonY, 135);
        mGlow.addColorStop(0, 'rgba(236, 253, 245, 0.95)');
        mGlow.addColorStop(0.5, 'rgba(52, 211, 153, 0.32)');
        mGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 135, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ecfdf5';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 44, 0, Math.PI * 2);
        ctx.fill();

        /* Thác nước bạc đổ từ vách núi xuống mặt hồ */
        const wfX = w * 0.31;
        const wfTop = horizonY * 0.64;
        const wfGrad = ctx.createLinearGradient(wfX, wfTop, wfX, horizonY);
        wfGrad.addColorStop(0, 'rgba(186, 230, 253, 0.78)');
        wfGrad.addColorStop(1, 'rgba(240, 253, 244, 0.95)');
        ctx.fillStyle = wfGrad;
        ctx.fillRect(wfX - 15, wfTop, 30, horizonY - wfTop);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        for (let k = 0; k < 5; k++) {
            const dropY = wfTop + ((tick * 65 + k * 24) % Math.max(20, horizonY - wfTop));
            ctx.beginPath();
            ctx.moveTo(wfX - 10 + k * 4.5, dropY);
            ctx.lineTo(wfX - 10 + k * 4.5, Math.min(horizonY, dropY + 14));
            ctx.stroke();
        }

        /* Rừng tre trúc 8 thân đa đốt uốn lượn + chùm lá tre Sprite */
        for (const st of bambooStalks) {
            const baseX = w * st.xPct;
            const sway = Math.sin(tick * 1.35 + st.phase) * st.swayAmp;
            let curX = baseX;
            let curY = h * 0.95;

            for (let n = 0; n < st.nodes; n++) {
                const nextY = curY - st.segH;
                const nextX = baseX + (sway * (n + 1)) / st.nodes;
                const curW = st.width * (1 - n * 0.03);

                ctx.strokeStyle = st.tint;
                ctx.lineWidth = curW;
                ctx.lineCap = 'butt';
                ctx.beginPath();
                ctx.moveTo(curX, curY);
                ctx.lineTo(nextX, nextY);
                ctx.stroke();

                /* Mấu đốt tre trắng ngọc */
                ctx.strokeStyle = '#dcfce7';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(nextX - curW * 0.58, nextY);
                ctx.lineTo(nextX + curW * 0.58, nextY);
                ctx.stroke();

                /* Gắn chùm lá tre bằng Sprite (0ms lag) */
                if (n >= 2 && n % 2 === 0) {
                    const dir = (n % 4 === 0) ? 1 : -1;
                    ctx.save();
                    ctx.translate(nextX + dir * 8, nextY - 6);
                    ctx.scale(dir, 1);
                    ctx.rotate(sway * 0.015);
                    ctx.drawImage(spriteCache.bambooCluster, -8, -12, 48, 48);
                    ctx.restore();
                }

                curX = nextX;
                curY = nextY;
            }
        }

        /* Đom đóm rừng trúc bay lượn */
        for (let i = 0; i < 28; i++) {
            const p = driftingPetals[i];
            p.swayPhase += 0.02;
            p.x += p.vx * 0.6 + Math.cos(p.swayPhase) * 0.4;
            p.y -= p.vy * 0.5;
            if (p.y < -10) { p.y = h - 20; p.x = Math.random() * w; }
            if (p.x > w + 10) p.x = -10;

            ctx.fillStyle = '#bef264';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /* 3. CẢNH ĐỈNH NÚI TUYẾT CỰC QUANG & HÀNH TINH VÀNH ĐAI 3D */
    function renderSmoothAuroraPeaksScene(w, h, horizonY, tick) {
        ctx.save();
        for (let b = 0; b < 3; b++) {
            const aGrad = ctx.createLinearGradient(0, h * (0.10 + b * 0.08), w * 0.78, h * (0.38 + b * 0.08));
            aGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
            aGrad.addColorStop(0.3, b % 2 === 0 ? 'rgba(52, 211, 153, 0.42)' : 'rgba(56, 189, 248, 0.36)');
            aGrad.addColorStop(0.65, 'rgba(168, 85, 247, 0.30)');
            aGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = aGrad;
            ctx.beginPath();
            ctx.moveTo(0, h * (0.18 + b * 0.07));
            for (let x = 0; x <= w; x += 60) {
                const y = h * (0.16 + b * 0.07) + Math.sin(tick * 1.5 + x * 0.005 + b * 1.2) * 26;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h * 0.58);
            ctx.lineTo(0, h * 0.58);
            ctx.closePath();
            ctx.fill();
        }

        /* Hành tinh băng giá có vành đai 3D */
        const px = w * 0.28, py = h * 0.33;
        const pr = Math.min(w, h) * 0.062;
        ctx.translate(px, py);

        ctx.save();
        ctx.rotate(-0.28);
        ctx.strokeStyle = 'rgba(163, 230, 53, 0.55)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(0, 0, pr * 2.15, pr * 0.45, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const pGrad = ctx.createRadialGradient(-pr * 0.35, -pr * 0.35, 4, 0, 0, pr);
        pGrad.addColorStop(0, '#bae6fd');
        pGrad.addColorStop(0.55, '#0284c7');
        pGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(0, 0, pr, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(-0.28);
        ctx.strokeStyle = 'rgba(190, 242, 100, 0.92)';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, pr * 2.15, pr * 0.45, 0, 0, Math.PI);
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }

    function draw3DFacetedMountains(w, horizonY, ridgePoints, litColor, shadowColor, rimColor, drawSnow = true) {
        for (let i = 0; i < ridgePoints.length - 1; i++) {
            const p1 = ridgePoints[i];
            const p2 = ridgePoints[i + 1];
            const x1 = p1[0] * w, y1 = p1[1] * horizonY;
            const x2 = p2[0] * w, y2 = p2[1] * horizonY;
            const isPeak = y1 < y2;
            const peakX = isPeak ? x1 : x2;
            const peakY = isPeak ? y1 : y2;
            const ridgeMidX = (x1 + x2) * 0.5;

            ctx.fillStyle = litColor;
            ctx.beginPath();
            ctx.moveTo(x1, horizonY);
            ctx.lineTo(x1, y1);
            ctx.lineTo(ridgeMidX, (y1 + y2) * 0.5);
            ctx.lineTo(ridgeMidX, horizonY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = shadowColor;
            ctx.beginPath();
            ctx.moveTo(ridgeMidX, horizonY);
            ctx.lineTo(ridgeMidX, (y1 + y2) * 0.5);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2, horizonY);
            ctx.closePath();
            ctx.fill();

            if (drawSnow && Math.min(y1, y2) < horizonY * 0.78) {
                const snowH = (horizonY - peakY) * 0.26;
                ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
                ctx.beginPath();
                ctx.moveTo(peakX, peakY);
                ctx.lineTo(peakX - snowH * 0.9, peakY + snowH);
                ctx.lineTo(peakX - snowH * 0.2, peakY + snowH * 0.75);
                ctx.lineTo(peakX + snowH * 0.85, peakY + snowH);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ridgePoints.forEach((pt, idx) => {
            const px = pt[0] * w, py = pt[1] * horizonY;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.stroke();
    }

    /* 4. CẢNH HỐ ĐEN VŨ TRỤ GARGANTUA THUẦN KHIẾT (KHÔNG NÚI) */
    function renderPureCosmosBlackHoleScene(w, h, tick) {
        ctx.fillStyle = '#040611';
        ctx.fillRect(0, 0, w, h);

        for (const st of stars) {
            ctx.fillStyle = st.col;
            ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(tick * 2 + st.phase));
            ctx.beginPath();
            ctx.arc(st.x * w, st.y * h * 1.3, st.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        const cx = w * 0.28, cy = h * 0.50;
        const bhR = Math.min(w, h) * 0.105;
        const tiltAngle = -0.24;

        ctx.save();
        ctx.translate(cx, cy);

        const neb = ctx.createRadialGradient(0, 0, bhR * 0.8, 0, 0, bhR * 4.2);
        neb.addColorStop(0, 'rgba(251, 146, 60, 0.48)');
        neb.addColorStop(0.4, 'rgba(168, 85, 247, 0.24)');
        neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = neb;
        ctx.beginPath();
        ctx.arc(0, 0, bhR * 4.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.rotate(tiltAngle);
        for (let rIdx = 2; rIdx >= 0; rIdx--) {
            ctx.strokeStyle = rIdx === 0 ? 'rgba(254, 249, 195, 0.9)' : 'rgba(251, 146, 60, 0.65)';
            ctx.lineWidth = 7 - rIdx * 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, bhR * (1.6 + rIdx * 0.45), bhR * (0.32 + rIdx * 0.08), 0, Math.PI, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = '#010206';
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(0, 0, bhR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.rotate(tiltAngle);
        for (let rIdx = 2; rIdx >= 0; rIdx--) {
            ctx.strokeStyle = rIdx === 0 ? '#ffffff' : 'rgba(253, 224, 71, 0.85)';
            ctx.lineWidth = 7.5 - rIdx * 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, bhR * (1.6 + rIdx * 0.45), bhR * (0.32 + rIdx * 0.08), 0, 0, Math.PI);
            ctx.stroke();
        }
        for (const p of bhParticles) {
            p.angle += p.speed;
            const px = Math.cos(p.angle) * bhR * p.rRatio;
            const py = Math.sin(p.angle) * bhR * (p.rRatio * 0.23);
            if (Math.sin(p.angle) > 0 || (px * px + py * py) > bhR * bhR) {
                ctx.fillStyle = p.col;
                ctx.beginPath();
                ctx.arc(px, py, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
        ctx.restore();

        for (const m of meteors) {
            if (m.cooldown > 0) {
                m.cooldown -= 1;
                if (m.cooldown <= 0) {
                    m.x = w * (0.15 + Math.random() * 0.75);
                    m.y = h * (0.06 + Math.random() * 0.30);
                    m.alpha = 1;
                }
            } else {
                m.x -= m.speed;
                m.y += m.speed * 0.42;
                m.alpha -= 0.018;
                if (m.alpha <= 0) {
                    m.cooldown = 55 + Math.random() * 90;
                } else {
                    const mg = ctx.createLinearGradient(m.x, m.y, m.x + m.len, m.y - m.len * 0.42);
                    mg.addColorStop(0, `rgba(255, 255, 255, ${m.alpha})`);
                    mg.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.strokeStyle = mg;
                    ctx.lineWidth = 2.2;
                    ctx.beginPath();
                    ctx.moveTo(m.x, m.y);
                    ctx.lineTo(m.x + m.len, m.y - m.len * 0.42);
                    ctx.stroke();
                }
            }
        }
    }

    let tick = 0;
    function renderFullPanorama() {
        tick += 0.015;
        const w = canvas.width;
        const h = canvas.height;
        const horizonY = h * 0.77;

        /* Nhánh 1: Hố Đen Vũ Trụ Thuần Khiết */
        if (__scenerySceneMode === 'galaxy_blackhole') {
            renderPureCosmosBlackHoleScene(w, h, tick);
            __sceneryAnimId = requestAnimationFrame(renderFullPanorama);
            return;
        }

        /* Bầu trời cho 3 cảnh Thiên Nhiên (Anh Đào / Rừng Tre / Đỉnh Núi Cực Quang) */
        const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
        if (__scenerySceneMode === 'aurora_peaks') {
            sky.addColorStop(0, '#020617');
            sky.addColorStop(0.5, '#082f49');
            sky.addColorStop(1, '#0f766e');
        } else if (__scenerySceneMode === 'bamboo_zen') {
            sky.addColorStop(0, '#02120a');
            sky.addColorStop(0.52, '#063624');
            sky.addColorStop(1, '#115e59');
        } else {
            sky.addColorStop(0, '#090616');
            sky.addColorStop(0.48, '#3b0764');
            sky.addColorStop(1, '#831843');
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizonY);

        for (const st of stars) {
            ctx.fillStyle = st.col;
            ctx.globalAlpha = 0.25 + 0.7 * Math.abs(Math.sin(tick * 2 + st.phase));
            ctx.beginPath();
            ctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* Nhánh 2 (Bầu trời): Cực Quang & Hành tinh vành đai 3D */
        if (__scenerySceneMode === 'aurora_peaks') {
            renderSmoothAuroraPeaksScene(w, h, horizonY, tick);
        }

        const farPeaks = [
            [0.0, 0.82], [0.09, 0.58], [0.18, 0.74], [0.29, 0.50], [0.41, 0.72],
            [0.54, 0.54], [0.67, 0.75], [0.81, 0.56], [0.92, 0.72], [1.0, 0.62]
        ];
        const nearPeaks = [
            [0.0, 0.88], [0.06, 0.74], [0.15, 0.85], [0.24, 0.66], [0.35, 0.84],
            [0.47, 0.68], [0.59, 0.86], [0.73, 0.69], [0.86, 0.84], [1.0, 0.74]
        ];

        if (__scenerySceneMode === 'aurora_peaks') {
            draw3DFacetedMountains(w, horizonY, farPeaks, '#1e3a8a', '#0f172a', 'rgba(103, 232, 249, 0.78)', true);
            draw3DFacetedMountains(w, horizonY, nearPeaks, '#0f766e', '#042f2e', 'rgba(110, 231, 183, 0.68)', true);
        } else if (__scenerySceneMode === 'bamboo_zen') {
            draw3DFacetedMountains(w, horizonY, farPeaks, '#065f46', '#022c22', 'rgba(110, 231, 183, 0.65)', false);
            draw3DFacetedMountains(w, horizonY, nearPeaks, '#15803d', '#052e16', 'rgba(163, 230, 53, 0.65)', false);
        } else {
            draw3DFacetedMountains(w, horizonY, farPeaks, '#4c1d95', '#1e1b4b', 'rgba(244, 114, 182, 0.70)', true);
            draw3DFacetedMountains(w, horizonY, nearPeaks, '#31102f', '#0f172a', 'rgba(251, 113, 133, 0.55)', false);
        }

        const waterGrad = ctx.createLinearGradient(0, horizonY, 0, h);
        waterGrad.addColorStop(0, __scenerySceneMode === 'bamboo_zen' ? '#064e3b' : '#1e1b4b');
        waterGrad.addColorStop(1, '#02040a');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, horizonY, w, h - horizonY);

        const reflectX = w * 0.30;
        for (let i = 0; i < 14; i++) {
            const wy = horizonY + 6 + i * ((h - horizonY) / 15);
            const sway = Math.sin(tick * 3 + i * 0.6) * (7 + i);
            const rw = 42 + i * 4.5;
            ctx.fillStyle = __scenerySceneMode === 'ancient_sakura' ? 'rgba(251, 113, 133, 0.36)' : 'rgba(52, 211, 153, 0.35)';
            ctx.fillRect(reflectX - rw * 0.5 + sway, wy, rw, 2.2);
        }

        /* Phân nhánh rõ ràng cho tiền cảnh: Anh Đào vs Rừng Tre vs Tuyết Cực Quang */
        if (__scenerySceneMode === 'ancient_sakura') {
            renderSmoothAncientSakuraScene(w, h, horizonY, tick);
        } else if (__scenerySceneMode === 'bamboo_zen') {
            renderSmoothBambooZenScene(w, h, horizonY, tick);
        } else if (__scenerySceneMode === 'aurora_peaks') {
            for (let i = 0; i < 32; i++) {
                const p = driftingPetals[i];
                p.swayPhase += 0.02;
                p.x += Math.sin(p.swayPhase) * 0.5;
                p.y += p.vy * 0.75;
                if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
                ctx.fillStyle = 'rgba(224, 242, 254, 0.82)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        __sceneryAnimId = requestAnimationFrame(renderFullPanorama);
    }
    renderFullPanorama();
}

/* ==========================================================================
   XỬ LÝ ĐĂNG NHẬP, ĐĂNG KÝ NGƯỜI MUA & ĐĂNG NHẬP MẠNG XÃ HỘI (GOOGLE/FB/APPLE)
   ========================================================================== */

function isCurrentOriginAllowedForGoogleGsi() {
    const host = (window.location.hostname || '').toLowerCase();
    /* Google OAuth không cho phép IP trần (127.0.0.1 / 180.93.x.x); chỉ bật GSI khi chạy trên tên miền hoặc localhost */
    if (host === 'localhost' || host.endsWith('.castle-tech.cloud') || host === 'castle-tech.cloud') {
        return true;
    }
    return false;
}

function isCurrentOriginAllowedForGoogleGsi() {
    const host = (window.location.hostname || '').toLowerCase();
    /* Google OAuth không cho phép IP trần (127.0.0.1 / 180.93.x.x); chỉ bật GSI khi chạy trên tên miền hoặc localhost */
    if (host === 'localhost' || host.endsWith('.castle-tech.cloud') || host === 'castle-tech.cloud') {
        return true;
    }
    return false;
}

let __configuredFacebookAppId = '';

function isCurrentOriginAllowedForGoogleGsi() {
    const host = (window.location.hostname || '').toLowerCase();
    if (host === 'localhost' || host.endsWith('.castle-tech.cloud') || host === 'castle-tech.cloud') {
        return true;
    }
    return false;
}

function loadFacebookSdkIfConfigured(fbAppId) {
    if (!fbAppId || window.FB || document.getElementById('facebook-jssdk')) return;
    window.fbAsyncInit = function() {
        window.FB.init({
            appId: fbAppId,
            cookie: true,
            xfbml: false,
            version: 'v19.0'
        });
    };
    const js = document.createElement('script');
    js.id = 'facebook-jssdk';
    js.src = 'https://connect.facebook.net/vi_VN/sdk.js';
    js.async = true;
    js.defer = true;
    document.head.appendChild(js);
}

function isCurrentOriginAllowedForGoogleGsi() {
    const host = (window.location.hostname || '').toLowerCase();
    if (host === 'localhost' || host.endsWith('.castle-tech.cloud') || host === 'castle-tech.cloud') {
        return true;
    }
    return false;
}

async function initGoogleOAuthClient() {
    const container = document.getElementById('googleSignInBtnContainer');
    const customGoogleBtn = document.getElementById('btnCustomGoogleLogin');
    try {
        const res = await fetch('/api/auth/google-config');
        if (!res.ok) return;
        const data = await res.json();
        __configuredGoogleClientId = data.google_client_id || '';

        if (data.is_configured && isCurrentOriginAllowedForGoogleGsi()) {
            let retries = 0;
            const tryRenderGsi = () => {
                if (window.google && window.google.accounts && window.google.accounts.id) {
                    window.google.accounts.id.initialize({
                        client_id: __configuredGoogleClientId,
                        callback: handleGoogleCredentialResponse
                    });
                    if (container) {
                        window.google.accounts.id.renderButton(container, {
                            theme: 'filled_black',
                            size: 'large',
                            shape: 'rectangular',
                            width: 390,
                            text: 'continue_with'
                        });
                        if (customGoogleBtn) customGoogleBtn.classList.add('d-none');
                    }
                } else if (retries < 15) {
                    retries++;
                    setTimeout(tryRenderGsi, 200);
                }
            };
            tryRenderGsi();
        } else if (container) {
            container.innerHTML = '';
            if (customGoogleBtn) customGoogleBtn.classList.remove('d-none');
        }
    } catch (e) {}
}

async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;
    try {
        const res = await fetch('/api/auth/social-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'google', credential: response.credential })
        });
        const data = await res.json();
        if (!res.ok) {
            showAuthBanner(data.error || 'Không thể đăng nhập bằng Google!', 'error');
            return;
        }
        setAuthUser(data.user);
        showAuthBanner(data.message, 'success');
        if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
        setTimeout(() => { window.location.href = '/services/home/index.html'; }, 500);
    } catch (err) {}
}
window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;

async function triggerSocialLoginFlow(provider = 'google') {
    if (__configuredGoogleClientId && isCurrentOriginAllowedForGoogleGsi() && window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.prompt();
        return;
    }

    const emailInput = prompt(
        'Đăng nhập nhanh bằng tài khoản Google\nBước 1: Nhập địa chỉ Email Google của bạn:',
        'hungnguyendva@gmail.com'
    );
    if (!emailInput || !emailInput.includes('@')) return;

    const defaultName = emailInput.toLowerCase().startsWith('hungnguyen') ? 'William' : emailInput.split('@')[0].replace('.', ' ').toUpperCase();
    const nameInput = prompt('Bước 2: Nhập Tên hiển thị của bạn trên sàn (VD: William):', defaultName) || defaultName;

    try {
        const res = await fetch('/api/auth/social-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'google',
                email: emailInput.trim(),
                full_name: nameInput.trim(),
                role: 'buyer'
            })
        });
        const data = await res.json();
        if (res.ok && data.user) {
            setAuthUser(data.user);
            showAuthBanner(data.message, 'success');
            if (typeof notifyToast === 'function') notifyToast(data.message, 'success');
            setTimeout(() => { window.location.href = '/services/home/index.html'; }, 500);
        } else {
            showAuthBanner(data.error || 'Đăng nhập Google chưa thành công!', 'error');
        }
    } catch (e) {}
}
window.triggerSocialLoginFlow = triggerSocialLoginFlow;
window.triggerSocialLoginFlow = triggerSocialLoginFlow;
window.triggerSocialLoginFlow = triggerSocialLoginFlow;
window.triggerSocialLoginFlow = triggerSocialLoginFlow;
window.triggerSocialLoginFlow = triggerSocialLoginFlow;
window.triggerSocialLoginFlow = triggerSocialLoginFlow;
window.triggerSocialLoginFlow = triggerSocialLoginFlow;

function switchAuthTab(tabKey) {
    ['login', 'register', 'recovery'].forEach(k => {
        const pane = document.getElementById('authPane_' + k);
        const btn = document.getElementById('authTabBtn_' + k);
        if (pane) pane.classList.toggle('d-none', k !== tabKey);
        if (btn) {
            btn.className = k === tabKey ? 'btn btn-nvidia fw-bold' : 'btn btn-outline-secondary fw-bold text-light';
        }
    });
    const titles = {
        'login': 'Đăng Nhập Tài Khoản',
        'register': 'Đăng Ký Thành Viên Mới',
        'recovery': 'Khôi Phục Mật Khẩu'
    };
    const titleEl = document.getElementById('authHeaderTitle');
    if (titleEl && titles[tabKey]) titleEl.textContent = titles[tabKey];
    document.getElementById('authAlertBanner')?.classList.add('d-none');
}

function togglePasswordVisibility(inputId, btnEl) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const isPw = inp.type === 'password';
    inp.type = isPw ? 'text' : 'password';
    if (btnEl) btnEl.textContent = isPw ? '🙈' : '👁️';
}

function evaluatePasswordStrength(pw, barId, textId) {
    const bar = document.getElementById(barId);
    const txt = document.getElementById(textId);
    if (!bar || !txt) return;
    const val = String(pw || '');
    let score = 0;
    if (val.length >= 4) score += 25;
    if (val.length >= 8) score += 25;
    if (/[A-Z]/.test(val) || /[0-9]/.test(val)) score += 25;
    if (/[^A-Za-z0-9]/.test(val) || val.length >= 10) score += 25;

    bar.style.width = score + '%';
    bar.className = score <= 25 ? 'progress-bar bg-danger' : (score <= 50 ? 'progress-bar bg-warning' : 'progress-bar bg-success');
    txt.textContent = `Độ an toàn mật khẩu: ${score}%`;
}

async function handleLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const username = document.getElementById('loginUsername')?.value.trim() || '';
    const password = document.getElementById('loginPassword')?.value.trim() || '';
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
            showAuthBanner(data.error || 'Đăng nhập thất bại!', 'error');
            return;
        }
        const userObj = data.user || {};
        setAuthUser(userObj);
        showAuthBanner(data.message || 'Đăng nhập thành công!', 'success');
        setTimeout(() => {
            if (userObj.role === 'admin') window.location.href = '/services/admin_dispute/admin-center.html';
            else if (userObj.role === 'seller') window.location.href = '/services/seller/seller-dashboard.html';
            else window.location.href = '/services/home/index.html';
        }, 480);
    } catch (err) {
        showAuthBanner('Lỗi kết nối máy chủ!', 'error');
    }
}

async function handleRegisterSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const termsChk = document.getElementById('regAgreeTermsCheck');
    if (termsChk && !termsChk.checked) {
        const box = document.getElementById('regTermsConsentContainer');
        if (box) {
            box.style.borderColor = '#ef4444';
            box.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.35)';
            setTimeout(() => { box.style.borderColor = ''; box.style.boxShadow = ''; }, 1600);
        }
        showAuthBanner('⚖️ Vui lòng tích chọn đồng ý với Điều khoản Pháp lý & Chính sách sàn trước khi đăng ký!', 'error');
        return;
    }

    const payload = {
        username: document.getElementById('regUsername')?.value.trim() || '',
        full_name: document.getElementById('regFullName')?.value.trim() || '',
        email: document.getElementById('regEmail')?.value.trim() || '',
        phone: document.getElementById('regPhone')?.value.trim() || '',
        password: document.getElementById('regPassword')?.value.trim() || '',
        role: 'buyer',
        agreed_terms: true,
        security_question: document.getElementById('regSecurityQuestion')?.value || '',
        security_answer: document.getElementById('regSecurityAnswer')?.value.trim() || ''
    };
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            showAuthBanner(data.error || 'Không thể đăng ký!', 'error');
            return;
        }
        const newUser = data.user || {};
        setAuthUser(newUser);

        fetch('/api/legal/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: newUser.id || 1,
                user_name: newUser.full_name || newUser.username || payload.username,
                role: 'buyer'
            })
        }).catch(() => {});

        showAuthBanner(data.message, 'success');
        setTimeout(() => { window.location.href = '/services/home/index.html'; }, 550);
    } catch (err) {}
}

function selectRecoveryMethod(methodKey) {
    __activeRecoveryMethod = methodKey;
    ['otp', 'security_question'].forEach(m => {
        const box = document.getElementById('recBox_' + m);
        if (box) box.classList.toggle('d-none', m !== methodKey);
    });
    const bOtp = document.getElementById('recMethodBtn_otp');
    const bQues = document.getElementById('recMethodBtn_question');
    if (bOtp) bOtp.className = methodKey === 'otp' ? 'btn btn-nvidia fw-bold' : 'btn btn-outline-secondary fw-bold';
    if (bQues) bQues.className = methodKey === 'security_question' ? 'btn btn-nvidia fw-bold' : 'btn btn-outline-info fw-bold';
    if (methodKey === 'security_question') loadUserSecurityQuestionForRecovery();
}

async function requestSendOtpCode() {
    const ident = document.getElementById('recIdentifierInput')?.value.trim() || '';
    if (!ident) {
        showAuthBanner('Vui lòng nhập Email hoặc Tên đăng nhập trước khi lấy mã!', 'error');
        return;
    }
    const banner = document.getElementById('smartOtpDisplayBanner');
    try {
        const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: ident })
        });
        const data = await res.json();
        if (!res.ok) {
            showAuthBanner(data.error || 'Không thể gửi mã!', 'error');
            return;
        }
        if (banner) {
            banner.classList.remove('d-none');
            banner.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <span>📲 Mã xác thực của bạn:</span>
                    <span class="badge bg-nvidia fs-6 font-monospace">${data.otp_demo_code}</span>
                </div>
            `;
        }
        const otpInp = document.getElementById('recOtpCodeInput');
        if (otpInp && data.otp_demo_code) otpInp.value = data.otp_demo_code;
    } catch (e) {}
}

async function loadUserSecurityQuestionForRecovery() {
    const ident = document.getElementById('recIdentifierInput')?.value.trim() || '';
    if (!ident) return;
    const qEl = document.getElementById('recLoadedQuestionText');
    try {
        const res = await fetch('/api/auth/lookup-security-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: ident })
        });
        const data = await res.json();
        if (res.ok && qEl) {
            qEl.textContent = data.security_question;
        }
    } catch (e) {}
}

async function submitPasswordResetAction(e) {
    if (e && e.preventDefault) e.preventDefault();
    const ident = document.getElementById('recIdentifierInput')?.value.trim() || '';
    const newPw = document.getElementById('recNewPasswordInput')?.value.trim() || '';
    const confirmPw = document.getElementById('recConfirmPasswordInput')?.value.trim() || '';
    if (newPw !== confirmPw) {
        showAuthBanner('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }
    const payload = {
        identifier: ident,
        method: __activeRecoveryMethod,
        new_password: newPw,
        otp_code: document.getElementById('recOtpCodeInput')?.value.trim() || '',
        security_answer: document.getElementById('recSecurityAnswerInput')?.value.trim() || ''
    };
    try {
        const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            showAuthBanner(data.error || 'Đổi mật khẩu thất bại!', 'error');
            return;
        }
        showAuthBanner(data.message, 'success');
        setTimeout(() => {
            document.getElementById('loginUsername').value = ident;
            document.getElementById('loginPassword').value = newPw;
            switchAuthTab('login');
        }, 700);
    } catch (err) {}
}

document.addEventListener('DOMContentLoaded', () => {
    selectNextSceneOnReload();
    initLeftArtisticSceneryCanvas();
    initGoogleOAuthClient();
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || params.get('mode');
    if (tab === 'register') switchAuthTab('register');
    else if (tab === 'recovery' || tab === 'forgot') switchAuthTab('recovery');
});