(function () {
    if (window.__nividaLiquidCatV25) return;
    window.__nividaLiquidCatV25 = true;

    const CAT_BREEDS = {
        nivida_cyber: {
            name: 'Mèo Thần Tài Nivida (Cyber Lime)',
            body: 'rgb(30, 41, 59)',
            belly: 'rgb(118, 185, 0)',
            stroke: 'rgb(15, 23, 42)',
            pCol: 'rgb(132, 204, 22)',
            pattern: 'points',
            eyeColor: 'rgb(16, 185, 129)',
            eyeColor2: 'rgb(16, 185, 129)',
            tailStyle: 'fluffy'
        },
        calico_lucky: {
            name: 'Mèo Tam Thể May Mắn (Calico)',
            body: 'rgb(255, 251, 235)',
            belly: 'rgb(255, 255, 255)',
            stroke: 'rgb(41, 37, 36)',
            pCol: 'rgb(249, 115, 22)',
            pattern: 'calico',
            eyeColor: 'rgb(217, 119, 6)',
            eyeColor2: 'rgb(217, 119, 6)',
            tailStyle: 'normal'
        },
        tuxedo_boss: {
            name: 'Mèo Giám Đốc Vest Đen (Tuxedo)',
            body: 'rgb(39, 39, 42)',
            belly: 'rgb(248, 250, 252)',
            stroke: 'rgb(9, 9, 11)',
            pCol: 'rgb(24, 24, 27)',
            pattern: 'cow',
            eyeColor: 'rgb(234, 179, 8)',
            eyeColor2: 'rgb(234, 179, 8)',
            tailStyle: 'long'
        },
        ginger_boba: {
            name: 'Mèo Cam Mê Trà Sữa (Orange Tabby)',
            body: 'rgb(251, 146, 60)',
            belly: 'rgb(255, 237, 213)',
            stroke: 'rgb(124, 45, 18)',
            pCol: 'rgb(234, 88, 12)',
            pattern: 'stripes',
            eyeColor: 'rgb(217, 119, 6)',
            eyeColor2: 'rgb(217, 119, 6)',
            tailStyle: 'fluffy'
        },
        white_cloud: {
            name: 'Mèo Bạch Tuyết Mắt 2 Màu (Cloud)',
            body: 'rgb(248, 250, 252)',
            belly: 'rgb(255, 255, 255)',
            stroke: 'rgb(71, 85, 105)',
            pCol: 'rgb(226, 232, 240)',
            pattern: 'solid',
            eyeColor: 'rgb(2, 132, 199)',
            eyeColor2: 'rgb(234, 179, 8)',
            tailStyle: 'fluffy'
        },
        sakura_neon: {
            name: 'Mèo Anh Đào Cyberpunk (Sakura Pink)',
            body: 'rgb(253, 242, 248)',
            belly: 'rgb(251, 207, 232)',
            stroke: 'rgb(131, 24, 67)',
            pCol: 'rgb(244, 114, 182)',
            pattern: 'points',
            eyeColor: 'rgb(236, 72, 153)',
            eyeColor2: 'rgb(14, 165, 233)',
            tailStyle: 'fluffy'
        }
    };

    const BREED_KEYS = Object.keys(CAT_BREEDS);

    function lerpVal(a, b, t) {
        return a + (b - a) * Math.min(1, Math.max(0, t));
    }

    function sleepMs(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    class CohesiveSoftBody {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.numNodes = 12;
            this.baseRx = 32;
            this.baseRy = 23;
            this.targetScaleX = 1.10;
            this.targetScaleY = 0.90;
            this.smoothScaleX = 1.10;
            this.smoothScaleY = 0.90;
            this.breathPhase = 0;
        }

        setLiquidState(st) {
            const s = String(st || '');
            if (s.includes('sploot') || s.includes('melt') || s.includes('puddle')) {
                this.targetScaleX = 1.38;
                this.targetScaleY = 0.62;
            } else if (s.includes('loaf') || s.includes('sleep')) {
                this.targetScaleX = 1.20;
                this.targetScaleY = 0.78;
            } else if (s.includes('run') || s.includes('sprint') || s.includes('zoom')) {
                this.targetScaleX = 1.26;
                this.targetScaleY = 0.74;
            } else if (s.includes('climb')) {
                this.targetScaleX = 0.90;
                this.targetScaleY = 1.15;
            } else if (s.includes('jump') || s.includes('flip') || s.includes('dance')) {
                this.targetScaleX = 0.94;
                this.targetScaleY = 1.14;
            } else {
                this.targetScaleX = 1.08;
                this.targetScaleY = 0.92;
            }
        }

        triggerSquish(sx, sy) {
            this.smoothScaleX = sx;
            this.smoothScaleY = sy;
        }

        stepShape(dt) {
            const safeDt = Math.min(0.025, Math.max(0.004, dt));
            this.smoothScaleX = lerpVal(this.smoothScaleX, this.targetScaleX, safeDt * 10.0);
            this.smoothScaleY = lerpVal(this.smoothScaleY, this.targetScaleY, safeDt * 10.0);
            this.breathPhase += safeDt * 4.8;
        }

        getLocalContourPoints() {
            const rx = this.baseRx * this.smoothScaleX;
            const ry = this.baseRy * this.smoothScaleY;
            const pts = [];
            for (let i = 0; i < this.numNodes; i++) {
                const ang = (2 * Math.PI * i) / this.numNodes;
                const wave = Math.sin(this.breathPhase + i * 0.6) * 0.8;
                pts.push({
                    ox: (rx + wave) * Math.cos(ang),
                    oy: (ry - wave * 0.5) * Math.sin(ang)
                });
            }
            return pts;
        }
    }

    class WebLiquidCatAssistant {
        constructor() {
            ['nividaLiquidCatCanvas', 'nividaCatHitbox', 'nividaCatSpeechBubble', 'nividaCatOpenBtn', 'nividaCatControlDock'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });

            const saved = this.loadSavedCatState();
            this.floorY = window.innerHeight - 46;
            this.ceilingY = 38;
            this.leftWallX = 48;
            this.rightWallX = window.innerWidth - 48;

            const startX = saved.x ? Math.min(this.rightWallX, Math.max(this.leftWallX, saved.x)) : Math.round(window.innerWidth * 0.68);
            const startY = saved.y ? Math.min(this.floorY, Math.max(this.ceilingY, saved.y)) : this.floorY;

            this.softBody = new CohesiveSoftBody(startX, startY);
            this.breedKey = saved.breedKey && CAT_BREEDS[saved.breedKey] ? saved.breedKey : 'nivida_cyber';
            this.breed = CAT_BREEDS[this.breedKey];
            this.state = saved.state || 'sitting';
            this.expr = saved.expr || 'normal';
            this.direction = saved.direction || -1;
            this.surfaceMode = saved.surfaceMode || 'floor';
            this.stateTimer = 4.0;
            this.animTime = 0;

            this.targetX = null;
            this.targetY = null;
            this.moveSpeedOverride = null;
            this.choreographyBusy = false;
            this.carryingLabel = '';
            this.isDragging = false;
            this.dragMoved = false;
            this.mousePos = { x: startX, y: startY };
            this.particles = [];
            this.bodyTilt = 0;
            this.blinkTimer = 3.5;
            this.eyeOpen = 1.0;
            this.bubbleTimeout = null;
            this.channel = null;

            this.injectStylesAndDOM();
            this.resizeCanvas();
            this.bindEvents();
            this.initCrossTabSync();

            if (saved.bubbleText && (Date.now() - (saved.ts || 0) < 8000)) {
                this.showBubble(saved.bubbleText, 5500, false);
            } else {
                this.showBubble('Meow~ Bấm vào Mèo hoặc gõ lệnh (VD: "Đề xuất bàn phím cơ", "Tìm RTX 4070", "Ăn cá", "Trà sữa") để Mèo biểu diễn và trèo lên thanh tìm kiếm tha đồ vào Giỏ hàng nha! 🐾🛒', 6500, false);
            }

            this.lastTs = performance.now();
            requestAnimationFrame((ts) => this.loop(ts));
        }

        loadSavedCatState() {
            try {
                return JSON.parse(localStorage.getItem('nivida_liquid_cat_state') || '{}');
            } catch {
                return {};
            }
        }

        saveCatState(bubbleText = '') {
            try {
                const payload = {
                    x: Math.round(this.softBody.x),
                    y: Math.round(this.softBody.y),
                    surfaceMode: this.surfaceMode,
                    breedKey: this.breedKey,
                    state: this.state,
                    expr: this.expr,
                    direction: this.direction,
                    bubbleText: bubbleText || this.currentBubbleText || '',
                    ts: Date.now()
                };
                localStorage.setItem('nivida_liquid_cat_state', JSON.stringify(payload));
                if (this.channel) {
                    this.channel.postMessage(payload);
                }
            } catch {}
        }

        initCrossTabSync() {
            try {
                if (typeof BroadcastChannel !== 'undefined') {
                    this.channel = new BroadcastChannel('nivida_liquid_cat_sync');
                    this.channel.onmessage = (ev) => {
                        const d = ev.data || {};
                        if (d.breedKey && CAT_BREEDS[d.breedKey]) {
                            this.breedKey = d.breedKey;
                            this.breed = CAT_BREEDS[this.breedKey];
                        }
                        if (!this.choreographyBusy && typeof d.x === 'number' && typeof d.y === 'number') {
                            this.softBody.x = Math.min(this.rightWallX, Math.max(this.leftWallX, d.x));
                            this.softBody.y = Math.min(this.floorY, Math.max(this.ceilingY, d.y));
                            this.surfaceMode = d.surfaceMode || 'floor';
                        }
                        if (d.state && !this.choreographyBusy) {
                            this.setCatState(d.state, 4.5, d.expr || 'normal', false);
                        }
                        if (d.bubbleText && !this.choreographyBusy) {
                            this.showBubble(d.bubbleText, 5500, false);
                        }
                    };
                }
            } catch {}
        }

        injectStylesAndDOM() {
            const dockMinimized = localStorage.getItem('nivida_cat_dock_minimized') === '1';
            const openBtnCls = dockMinimized ? '' : 'd-none';
            const dockCls = dockMinimized ? 'd-none' : '';

            const styleEl = document.createElement('style');
            styleEl.textContent = `
                [id="nividaLiquidCatCanvas"] {
                    position: fixed !important;
                    inset: 0 !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    pointer-events: none !important;
                    z-index: 10040 !important;
                }
                .nivida-cat-hitbox {
                    position: fixed;
                    width: 104px;
                    height: 84px;
                    cursor: grab;
                    z-index: 10045;
                    border-radius: 50%;
                    user-select: none;
                }
                .nivida-cat-hitbox:active {
                    cursor: grabbing;
                }
                .nivida-cat-bubble {
                    position: fixed;
                    max-width: 310px;
                    min-width: 170px;
                    background: rgb(15, 23, 42);
                    color: rgb(248, 250, 252);
                    border: 2px solid rgb(118, 185, 0);
                    border-radius: 14px;
                    padding: 8px 12px;
                    font-size: 0.78rem;
                    font-weight: 600;
                    line-height: 1.42;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.45);
                    z-index: 10048;
                    pointer-events: auto;
                    transition: opacity 0.18s ease;
                }
                .nivida-cat-bubble.d-none {
                    opacity: 0;
                    pointer-events: none;
                }
                .nivida-cat-dock {
                    position: fixed;
                    bottom: 14px;
                    left: 16px;
                    width: min(390px, calc(100vw - 32px));
                    background: rgba(15, 23, 42, 0.96);
                    color: rgb(248, 250, 252);
                    border: 2px solid rgb(118, 185, 0);
                    border-radius: 14px;
                    padding: 10px 12px;
                    box-shadow: 0 16px 40px rgba(0,0,0,0.55);
                    z-index: 10050;
                    backdrop-filter: blur(6px);
                }
                .nivida-cat-dock.d-none {
                    display: none !important;
                }
                .cat-action-chip {
                    background: rgb(30, 41, 59);
                    color: rgb(226, 232, 240);
                    border: 1px solid rgb(71, 85, 105);
                    border-radius: 999px;
                    padding: 3px 9px;
                    font-size: 0.71rem;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.15s;
                }
                .cat-action-chip:hover {
                    background: rgb(118, 185, 0);
                    color: rgb(15, 23, 42);
                    border-color: rgb(118, 185, 0);
                }
                .cat-toggle-pill {
                    position: fixed;
                    bottom: 14px;
                    left: 16px;
                    z-index: 10049;
                    background: linear-gradient(135deg, rgb(15, 23, 42), rgb(30, 41, 59));
                    color: rgb(163, 230, 53);
                    border: 2px solid rgb(118, 185, 0);
                    border-radius: 999px;
                    padding: 7px 15px;
                    font-size: 0.81rem;
                    font-weight: 800;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.45);
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .cat-target-glow {
                    outline: 3px solid rgb(118, 185, 0) !important;
                    box-shadow: 0 0 22px rgba(118, 185, 0, 0.85) !important;
                    transition: all 0.25s ease !important;
                }
            `;
            document.head.appendChild(styleEl);

            const wrap = document.createElement('div');
            wrap.innerHTML = `
                <canvas id="nividaLiquidCatCanvas"></canvas>
                <div id="nividaCatHitbox" class="nivida-cat-hitbox" title="Bấm vào Mèo để Chat hoặc Kéo thả Mèo lên tận thanh Header / bất kỳ đâu!"></div>
                <div id="nividaCatSpeechBubble" class="nivida-cat-bubble d-none"></div>

                <button type="button" id="nividaCatOpenBtn" class="cat-toggle-pill ${openBtnCls}">
                    <span>🐾 Ra Lệnh Cho Mèo AI</span>
                </button>

                <div id="nividaCatControlDock" class="nivida-cat-dock ${dockCls}">
                    <div class="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-secondary flex-wrap gap-1">
                        <strong class="small" style="color:rgb(163, 230, 53);">🐱 Mèo Lỏng Trợ Lý AI</strong>
                        <div class="d-flex gap-1 align-items-center">
                            <button type="button" id="catClimbCeilingBtn" class="cat-action-chip" title="Cho Mèo leo lên đi dọc trần web">🐾 Leo Trần</button>
                            <button type="button" id="catParkourBtn" class="cat-action-chip" title="Cho Mèo nhảy khắp toàn bộ màn hình">🚀 Đi Khắp Màn</button>
                            <button type="button" id="catBreedSwitchBtn" class="cat-action-chip" title="Đổi màu lông & giống mèo (6 Skin)">🎨 Đổi Mèo</button>
                            <button type="button" id="catDockCloseBtn" class="cat-action-chip" title="Thu gọn khung chat">Ẩn [–]</button>
                        </div>
                    </div>

                    <div class="d-flex flex-wrap gap-1 mb-2">
                        <button type="button" class="cat-action-chip" data-cmd="Đổi sang giao diện sáng thanh lịch">☀️ Sáng Thanh Lịch</button>
                        <button type="button" class="cat-action-chip" data-cmd="Đổi giao diện Tài chính Thụy Sĩ">🏛️ Thụy Sĩ</button>
                        <button type="button" class="cat-action-chip" data-cmd="Đổi sang Bloomberg">🌙 Bloomberg Tối</button>
                        <button type="button" class="cat-action-chip" data-cmd="Chỉnh lưới 4 cột">📐 Lưới 4 Cột</button>
                        <button type="button" class="cat-action-chip" data-cmd="Chỉnh lưới 3 cột">📐 Lưới 3 Cột</button>
                    </div>

                    <div class="d-flex flex-wrap gap-1 mb-2">
                        <button type="button" class="cat-action-chip" data-cmd="Tìm cho tôi RTX 4070">🔍 Tìm RTX 4070</button>
                        <button type="button" class="cat-action-chip" data-cmd="Mua sản phẩm số 1">🛒 Mua SP Số 1</button>
                        <button type="button" class="cat-action-chip" data-cmd="Tìm bàn phím cơ bỏ vào giỏ">🛒 Săn Phím Cơ</button>
                        <button type="button" class="cat-action-chip" data-cmd="Mở sàn đấu giá">🔨 Sàn Đấu Giá</button>
                        <button type="button" class="cat-action-chip" data-cmd="Điểm danh nhận xu">✨ Điểm danh</button>
                    </div>

                    <form id="nividaCatCmdForm" class="d-flex gap-1">
                        <input type="text" id="nividaCatCmdInput" class="form-control form-control-sm" style="background:rgb(30,41,59); color:rgb(255,255,255); border-color:rgb(118,185,0);" placeholder="💬 Gõ lệnh (VD: Tìm RTX 4070, Mua sản phẩm số 1, Chỉnh lưới 4 cột)..." required>
                        <button type="submit" id="nividaCatSendBtn" class="btn btn-nvidia btn-sm px-3 fw-bold">Gửi</button>
                    </form>
                </div>
            `;
            document.body.appendChild(wrap);

            this.canvas = document.getElementById('nividaLiquidCatCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.hitbox = document.getElementById('nividaCatHitbox');
            this.bubbleEl = document.getElementById('nividaCatSpeechBubble');
            this.dockEl = document.getElementById('nividaCatControlDock');
            this.openBtn = document.getElementById('nividaCatOpenBtn');
        }

        resizeCanvas() {
            if (!this.canvas) return;
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.floorY = window.innerHeight - 46;
            this.ceilingY = 38;
            this.leftWallX = 48;
            this.rightWallX = window.innerWidth - 48;
            this.softBody.x = Math.min(this.rightWallX, Math.max(this.leftWallX, this.softBody.x));
            this.softBody.y = Math.min(this.floorY, Math.max(this.ceilingY, this.softBody.y));
        }

        cycleCatBreed() {
            const idx = (BREED_KEYS.indexOf(this.breedKey) + 1) % BREED_KEYS.length;
            this.breedKey = BREED_KEYS[idx];
            this.breed = CAT_BREEDS[this.breedKey];
            this.softBody.triggerSquish(1.26, 0.76);
            this.spawnParticle('sparkle');
            this.spawnParticle('heart');
            this.showBubble('Meow~ Đã đổi giao diện sang [' + this.breed.name + ']! 🐾✨', 4500);
            this.saveCatState();
        }

        pickRandomScreenPerchPoint() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const roll = Math.random();
            if (roll < 0.32) {
                return {
                    x: 80 + Math.random() * Math.max(150, w - 160),
                    y: this.ceilingY,
                    mode: 'ceiling'
                };
            } else if (roll < 0.72) {
                return {
                    x: 80 + Math.random() * Math.max(150, w - 160),
                    y: Math.round(55 + Math.random() * Math.max(160, h - 140)),
                    mode: 'perch'
                };
            }
            return {
                x: 80 + Math.random() * Math.max(150, w - 160),
                y: this.floorY,
                mode: 'floor'
            };
        }

        goToCeilingWalk() {
            const w = window.innerWidth;
            this.surfaceMode = 'ceiling';
            this.targetX = 100 + Math.random() * Math.max(160, w - 200);
            this.targetY = this.ceilingY;
            this.setCatState('climb_spider_scramble', 6.5, 'starry_hyped_grin');
            this.softBody.triggerSquish(0.88, 1.20);
            this.spawnParticle('sparkle');
        }

        goToRandom2DTarget() {
            const pt = this.pickRandomScreenPerchPoint();
            this.surfaceMode = pt.mode;
            this.targetX = pt.x;
            this.targetY = pt.y;
            this.setCatState('jump_starfish_soar', 5.5, 'pure_joy_beam');
            this.softBody.triggerSquish(0.90, 1.18);
            this.spawnParticle('dust');
        }

        moveToPointAsync(tx, ty, stateName = 'climb_spider_scramble', expr = 'matrix_code_eyes', speed = 420) {
            return new Promise((resolve) => {
                this.targetX = Math.max(this.leftWallX, Math.min(this.rightWallX, tx));
                this.targetY = Math.max(this.ceilingY, Math.min(this.floorY, ty));
                this.moveSpeedOverride = speed;
                this.setCatState(stateName, 12.0, expr, false);
                const checkTimer = setInterval(() => {
                    if (this.isDragging) {
                        clearInterval(checkTimer);
                        this.moveSpeedOverride = null;
                        resolve();
                        return;
                    }
                    const d = Math.hypot((this.targetX || this.softBody.x) - this.softBody.x, (this.targetY || this.softBody.y) - this.softBody.y);
                    if (d < 20 || (this.targetX === null && this.targetY === null)) {
                        clearInterval(checkTimer);
                        this.moveSpeedOverride = null;
                        resolve();
                    }
                }, 40);
            });
        }

        findProductCardRectOnScreen(prodId) {
            const selectorStr = 'a[href*="product-detail.html?id=' + prodId + '"]';
            const linkEl = document.querySelector(selectorStr);
            const cardEl = linkEl ? (linkEl.closest('.product-card') || linkEl.closest('.col-6') || linkEl) : null;
            if (cardEl) {
                try {
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch {}
                return cardEl;
            }
            return null;
        }

        async runSearchAndCartChoreography(searchQuery, products, finalBubbleText) {
            if (this.choreographyBusy) return;
            this.choreographyBusy = true;
            try {
                const searchInput = document.getElementById('globalSearchInput');
                let sX = window.innerWidth * 0.42;
                let sY = 54;
                if (searchInput) {
                    const sr = searchInput.getBoundingClientRect();
                    if (sr.width > 0) {
                        sX = sr.left + sr.width * 0.5;
                        sY = Math.max(this.ceilingY, sr.top + sr.height * 0.5);
                    }
                }

                this.showBubble('Meow~ Đang trèo lên thanh tìm kiếm để gõ "' + searchQuery + '"... 🐾🧗', 8000, false);
                await this.moveToPointAsync(sX, sY, 'climb_spider_scramble', 'matrix_code_eyes', 460);

                if (searchInput) {
                    searchInput.focus();
                    searchInput.value = '';
                    const cleanQ = String(searchQuery || '');
                    for (let i = 0; i < cleanQ.length; i++) {
                        searchInput.value += cleanQ[i];
                        await sleepMs(45);
                    }
                    this.spawnParticle('idea_bulb');
                    this.softBody.triggerSquish(1.25, 0.78);
                    if (typeof loadProducts === 'function') {
                        const newUrl = window.location.pathname + '?q=' + encodeURIComponent(cleanQ);
                        window.history.replaceState({}, '', newUrl);
                        await loadProducts();
                    }
                }
                await sleepMs(380);

                const list = Array.isArray(products) ? products : [];
                for (let i = 0; i < list.length; i++) {
                    const p = list[i];
                    const cardEl = this.findProductCardRectOnScreen(p.id);
                    await sleepMs(260);

                    let pX = 180 + ((i * 220) % Math.max(240, window.innerWidth - 320));
                    let pY = Math.min(this.floorY - 60, Math.max(160, window.innerHeight * 0.52));
                    if (cardEl) {
                        const cr = cardEl.getBoundingClientRect();
                        if (cr.width > 0 && cr.top > 40 && cr.top < window.innerHeight - 40) {
                            pX = cr.left + cr.width * 0.5;
                            pY = Math.max(this.ceilingY + 20, Math.min(this.floorY - 20, cr.top + 36));
                        }
                        cardEl.classList.add('cat-target-glow');
                    }

                    this.showBubble('Meow~ Nhảy xuống món [' + p.name.substring(0, 28) + '...] để kiểm tra & tha vào Giỏ! 🐾👇', 6000, false);
                    await this.moveToPointAsync(pX, pY, 'jump_starfish_soar', 'starry_hyped_grin', 480);

                    this.carryingLabel = '📦 ' + p.name.substring(0, 18) + '...';
                    this.setCatState('sit_paw_wave_hi', 2.5, 'money_eyes', false);
                    this.softBody.triggerSquish(1.32, 0.72);
                    this.spawnParticle('heart');
                    this.spawnParticle('sparkle');

                    if (typeof addToCartGlobal === 'function') {
                        addToCartGlobal(p, {
                            catSuggested: true,
                            recommendLabel: '🐱 Mèo AI Đề Xuất'
                        });
                    }
                    window.dispatchEvent(new CustomEvent('nivida_cart_updated'));
                    await sleepMs(520);

                    if (cardEl) {
                        setTimeout(() => cardEl.classList.remove('cat-target-glow'), 1800);
                    }
                }

                const cartBadge = document.getElementById('headerCartCount');
                if (cartBadge) {
                    const br = cartBadge.getBoundingClientRect();
                    if (br.width > 0) {
                        this.showBubble('Meow~ Đang tha đồ lên cất vào Giỏ hàng trên thanh Header! 🛒🐾', 5000, false);
                        await this.moveToPointAsync(br.left, Math.max(this.ceilingY, br.bottom + 18), 'carrying', 'money_eyes', 500);
                        this.softBody.triggerSquish(1.30, 0.72);
                        this.spawnParticle('star');
                    }
                }

                this.carryingLabel = '';
                this.setCatState('money_happy_dance', 6.5, 'lovestruck_sparkle', true);
                this.showBubble(finalBubbleText || 'Meow~ Đã tha toàn bộ món đồ đề xuất vào Giỏ hàng (Gắn nhãn 🐱 Mèo AI Đề Xuất) cho bạn rồi nha! 🛒✨', 8500, true);
            } catch (err) {
                this.carryingLabel = '';
                this.showBubble('Meow~ Đã bỏ sản phẩm đề xuất vào Giỏ hàng cho bạn rồi nhé! 🛒🐾', 6000);
            } finally {
                this.choreographyBusy = false;
                this.carryingLabel = '';
            }
        }

        bindEvents() {
            window.addEventListener('resize', () => this.resizeCanvas());

            window.addEventListener('mousemove', (e) => {
                this.mousePos.x = e.clientX;
                this.mousePos.y = e.clientY;
                if (this.isDragging) {
                    this.dragMoved = true;
                    this.softBody.x = Math.max(this.leftWallX, Math.min(this.rightWallX, e.clientX));
                    this.softBody.y = Math.max(this.ceilingY, Math.min(this.floorY, e.clientY));
                    this.targetX = null;
                    this.targetY = null;
                }
            });

            this.hitbox.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                this.isDragging = true;
                this.dragMoved = false;
                this.targetX = null;
                this.targetY = null;
                this.softBody.triggerSquish(0.92, 1.15);
                this.setCatState('drag', 2.0, 'shocked', false);
            });

            window.addEventListener('mouseup', () => {
                if (!this.isDragging) return;
                this.isDragging = false;
                this.softBody.triggerSquish(1.28, 0.74);
                if (!this.dragMoved) {
                    this.onCatClicked();
                } else {
                    if (this.softBody.y <= this.ceilingY + 28) {
                        this.surfaceMode = 'ceiling';
                        this.softBody.y = this.ceilingY;
                        this.showBubble('Meow~ Đậu trên đỉnh trần web ngắm xuống thích quá đi! 🐾✨', 4500);
                    } else if (this.softBody.y < this.floorY - 35) {
                        this.surfaceMode = 'perch';
                        this.showBubble('Nyan~ Mèo đậu ngay tại vị trí bạn vừa thả nè! 🐾', 4500);
                    } else {
                        this.surfaceMode = 'floor';
                        this.softBody.y = this.floorY;
                    }
                    this.setCatState('sitting', 8.0, 'uwu');
                    this.spawnParticle('star');
                    this.saveCatState();
                }
            });

            this.openBtn.addEventListener('click', () => this.toggleDock(true));
            document.getElementById('catDockCloseBtn').addEventListener('click', () => this.toggleDock(false));

            document.getElementById('catClimbCeilingBtn').addEventListener('click', () => {
                this.goToCeilingWalk();
                this.showBubble('Meow~ Leo thẳng lên đỉnh trần trang web đi tuần tra nè! 🐾🕷️', 4500);
            });

            document.getElementById('catParkourBtn').addEventListener('click', () => {
                this.goToRandom2DTarget();
                this.showBubble('Hựaaa! Nhảy tự do khắp toàn bộ giao diện web! 🚀🐾', 4500);
            });

            document.getElementById('catBreedSwitchBtn').addEventListener('click', () => {
                this.cycleCatBreed();
            });

            document.querySelectorAll('.cat-action-chip[data-cmd]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cmd = btn.getAttribute('data-cmd');
                    this.sendCommandToCat(cmd);
                });
            });

            document.getElementById('nividaCatCmdForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const inp = document.getElementById('nividaCatCmdInput');
                const msg = inp.value.trim();
                if (!msg) return;
                inp.value = '';
                this.sendCommandToCat(msg);
            });
        }

        toggleDock(show) {
            this.dockEl.classList.toggle('d-none', !show);
            this.openBtn.classList.toggle('d-none', show);
            localStorage.setItem('nivida_cat_dock_minimized', show ? '0' : '1');
            if (show) {
                setTimeout(() => document.getElementById('nividaCatCmdInput')?.focus(), 60);
            }
        }

        onCatClicked() {
            this.spawnParticle('heart');
            this.spawnParticle('sparkle');
            this.softBody.triggerSquish(1.25, 0.78);
            this.setCatState('sit_paw_wave_hi', 5.0, 'lovestruck_sparkle');
            this.showBubble('Meow~ Gõ món đồ bạn cần vào khung Chat góc trái để Mèo trèo lên thanh tìm kiếm, nhảy xuống món đồ và bỏ thẳng vào Giỏ hàng cho bạn nhé! 🐾🛒', 5500);
            this.toggleDock(true);
        }

        setCatState(newState, duration = 5.0, expr = 'normal', broadcast = true) {
            this.state = newState;
            this.stateTimer = duration;
            this.expr = expr;
            this.softBody.setLiquidState(newState);
            if (broadcast) this.saveCatState();
        }

        showBubble(text, durationMs = 6000, broadcast = true) {
            if (!this.bubbleEl) return;
            this.currentBubbleText = text;
            this.bubbleEl.textContent = text;
            this.bubbleEl.classList.remove('d-none');
            if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
            this.bubbleTimeout = setTimeout(() => {
                this.bubbleEl.classList.add('d-none');
            }, durationMs);
            if (broadcast) this.saveCatState(text);
        }

        spawnParticle(type) {
            const symMap = {
                heart: '❤️', zzz: '💤', star: '⭐',
                sparkle: '✨', music: '🎵', crumb: '🐟',
                idea_bulb: '💡', dust: '💨'
            };
            for (let i = 0; i < 2; i++) {
                this.particles.push({
                    sym: symMap[type] || '✨',
                    x: this.softBody.x + (Math.random() * 36 - 18),
                    y: this.softBody.y - 32,
                    vx: Math.random() * 36 - 18,
                    vy: -40 - Math.random() * 30,
                    life: 1.0
                });
            }
        }

        spawnDomMagicSparklesAt(x, y) {
            const symbols = ['✨', '🌟', '⚡', '🐾', '💫', '🔮'];
            for (let i = 0; i < 6; i++) {
                const sp = document.createElement('div');
                sp.className = 'nv-cat-magic-sparkle';
                sp.textContent = symbols[i % symbols.length];
                const ox = Math.round((Math.random() - 0.5) * 68);
                const oy = Math.round((Math.random() - 0.5) * 52);
                sp.style.left = Math.max(12, Math.min(window.innerWidth - 28, x + ox)) + 'px';
                sp.style.top = Math.max(12, Math.min(window.innerHeight - 28, y + oy)) + 'px';
                document.body.appendChild(sp);
                setTimeout(() => sp.remove(), 780);
            }
            this.spawnParticle('sparkle');
            this.spawnParticle('star');
        }

        async climbToElementAndCastSpell(targetElOrSelector, spellText, actionCallback) {
            let targetEl = null;
            if (typeof targetElOrSelector === 'string') {
                targetEl = document.querySelector(targetElOrSelector);
            } else if (targetElOrSelector && targetElOrSelector.getBoundingClientRect) {
                targetEl = targetElOrSelector;
            }

            let tx = window.innerWidth * 0.52;
            let ty = 64;
            if (targetEl) {
                try {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch (e) {}
                await sleepMs(160);
                const rect = targetEl.getBoundingClientRect();
                if (rect.width > 0 || rect.height > 0) {
                    tx = rect.left + rect.width * 0.5;
                    ty = Math.max(this.ceilingY + 12, Math.min(this.floorY - 12, rect.top + Math.min(28, rect.height * 0.5)));
                }
                targetEl.classList.add('cat-target-glow');
            }

            const formattedSpell = String(spellText || '').startsWith('✨ Hô thần chú')
                ? spellText
                : ('✨ Hô thần chú: ' + spellText);

            this.showBubble(formattedSpell, 7000, false);
            await this.moveToPointAsync(tx, ty, 'climb_spider_scramble', 'starry_hyped_grin', 490);
            this.softBody.triggerSquish(1.32, 0.72);
            this.setCatState('ai_magic_cape_spin', 4.5, 'lovestruck_sparkle', true);
            this.spawnDomMagicSparklesAt(this.softBody.x, this.softBody.y);

            if (typeof actionCallback === 'function') {
                await actionCallback(targetEl);
            }

            if (targetEl) {
                setTimeout(() => targetEl.classList.remove('cat-target-glow'), 1800);
            }
        }

        async performVoiceSearchAutoClick(spokenKeyword) {
            const cleanKw = String(spokenKeyword || '').trim();
            if (!cleanKw) return;
            if (this.choreographyBusy) this.choreographyBusy = false;
            this.choreographyBusy = true;

            try {
                const searchInp = document.getElementById('searchInput') || document.getElementById('globalSearchInput');
                const searchBtn = document.getElementById('searchBtn') || document.getElementById('globalSearchBtn');
                const globalInp = document.getElementById('globalSearchInput');

                if (searchInp) searchInp.value = cleanKw;
                if (globalInp) globalInp.value = cleanKw;

                await this.climbToElementAndCastSpell(
                    searchBtn || searchInp,
                    `🐾 Mèo nghe rõ rồi: [${cleanKw}]! Để Mèo bấm tìm kiếm giúp bạn ngay!`,
                    async (btnEl) => {
                        if (btnEl) {
                            btnEl.classList.add('cat-target-glow');
                            setTimeout(() => btnEl.classList.remove('cat-target-glow'), 1500);
                        }
                        if (typeof window.executeQuickKeywordSearch === 'function' && document.getElementById('searchInput')) {
                            await window.executeQuickKeywordSearch();
                        } else if (typeof window.loadProducts === 'function') {
                            const newUrl = window.location.pathname + '?q=' + encodeURIComponent(cleanKw);
                            window.history.replaceState({}, '', newUrl);
                            await window.loadProducts();
                        } else if (typeof window.triggerGlobalHeaderSearch === 'function') {
                            window.triggerGlobalHeaderSearch();
                        }
                        const gridEl = document.getElementById('productGrid') || document.getElementById('productList');
                        if (gridEl) {
                            setTimeout(() => {
                                try {
                                    gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } catch (e) {}
                            }, 220);
                        }
                    }
                );
            } finally {
                this.choreographyBusy = false;
            }
        }

        async sendCommandToCat(message) {
            const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
            this.showBubble('✨ Hô thần chú: Meow~ Đang phân tích lệnh và chuẩn bị phóng đi... 🐾💭', 8000, false);
            this.setCatState('ai_eureka_lightbulb_perk', 3.0, 'matrix_code_eyes', false);

            try {
                const res = await fetch('/api/settings/cat-assistant/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: message,
                        user_id: user ? user.id : null
                    })
                });
                const data = await res.json();
                await this.executeCommandResponse(data);
            } catch (err) {
                this.showBubble('Meow! Hệ thống vừa tự phục hồi kết nối, bạn thử lại giúp Mèo nhé! 😿', 4500);
            }
        }

        async executeCommandResponse(data) {
            if (!data) return;
            const act = data.action_type || 'CHAT_REPLY';
            const st = data.cat_state || 'sit_paw_wave_hi';
            const ex = data.cat_expr || 'uwu';
            const pt = data.particle || 'sparkle';

            if (act === 'SWITCH_BREED') {
                this.cycleCatBreed();
                return;
            }

            if (act === 'SET_SKIN_PRESET') {
                const skinKey = data.skin_key || 'executive_light';
                const targetBtn = document.getElementById('settingsSkinSelect') || document.getElementById('headerThemeSettingsBtn');
                await this.climbToElementAndCastSpell(targetBtn, data.bubble_text || 'Biến hình giao diện Nexora!', () => {
                    if (typeof window.selectGlobalSeasonalSkin === 'function') {
                        window.selectGlobalSeasonalSkin(skinKey);
                    }
                });
                return;
            }

            if (act === 'SET_GRID_DENSITY') {
                const densityVal = data.grid_density || '4';
                const targetToolbar = document.getElementById('gridDensityToolbar') || document.getElementById('settingsGridDensitySelect') || document.getElementById('headerThemeSettingsBtn');
                await this.climbToElementAndCastSpell(targetToolbar, data.bubble_text || `Chỉnh mật độ lưới ${densityVal} cột!`, () => {
                    if (typeof window.changeHomeGridDensity === 'function') {
                        window.changeHomeGridDensity(densityVal);
                    } else if (typeof window.applyProductGridDensity === 'function') {
                        window.applyProductGridDensity(densityVal, true);
                    }
                });
                return;
            }

            if (act === 'SEARCH_ONLY_AUTO_CLICK') {
                const sq = data.search_query || '';
                const sInp = document.getElementById('searchInput') || document.getElementById('globalSearchInput');
                const sBtn = document.getElementById('searchBtn') || document.getElementById('globalSearchBtn');
                await this.climbToElementAndCastSpell(sInp, `Đang gõ "${sq}"... Để Mèo bấm nút tìm giúp bạn nhé! 🔍`, async () => {
                    if (sInp) {
                        sInp.focus();
                        sInp.value = '';
                        for (let i = 0; i < sq.length; i++) {
                            sInp.value += sq[i];
                            await sleepMs(35);
                        }
                    }
                    if (document.getElementById('globalSearchInput')) {
                        document.getElementById('globalSearchInput').value = sq;
                    }
                    await this.climbToElementAndCastSpell(sBtn || sInp, `Bấm nút Tìm kiếm [${sq}] ngay! 🐾🔍`, async () => {
                        if (typeof window.executeQuickKeywordSearch === 'function' && document.getElementById('searchInput')) {
                            await window.executeQuickKeywordSearch();
                        } else if (typeof window.loadProducts === 'function') {
                            const newUrl = window.location.pathname + '?q=' + encodeURIComponent(sq);
                            window.history.replaceState({}, '', newUrl);
                            await window.loadProducts();
                        } else if (typeof window.triggerGlobalHeaderSearch === 'function') {
                            window.triggerGlobalHeaderSearch();
                        }
                    });
                });
                return;
            }

            if (act === 'BUY_PRODUCT_INDEX') {
                const idxOneBased = Math.max(1, parseInt(data.product_index || 1, 10));
                const cards = Array.from(document.querySelectorAll('#productGrid .product-card, #productList .product-card'));
                const targetCard = cards[idxOneBased - 1] || cards[0] || null;
                await this.climbToElementAndCastSpell(targetCard, data.bubble_text || `Chọn mua sản phẩm số #${idxOneBased}!`, async (cardEl) => {
                    const list = Array.isArray(window.__homeProductsCache) ? window.__homeProductsCache : [];
                    const chosenProd = list[idxOneBased - 1] || list[0];
                    if (chosenProd && typeof window.addToCartGlobal === 'function') {
                        window.addToCartGlobal(chosenProd, {
                            catSuggested: true,
                            recommendLabel: `🐱 Mèo AI Chọn SP #${idxOneBased}`
                        });
                    } else if (cardEl) {
                        const addBtn = cardEl.querySelector('button[onclick*="addToCart"], button.btn-nvidia');
                        if (addBtn) addBtn.click();
                    }
                    const cartBadge = document.getElementById('headerCartCount');
                    if (cartBadge) {
                        await this.climbToElementAndCastSpell(cartBadge, `Đã cất sản phẩm số #${idxOneBased} vào Giỏ hàng! 🛒✨`);
                    }
                    if (data.checkout_now) {
                        setTimeout(() => { window.location.href = '/services/cart_checkout/checkout.html'; }, 800);
                    }
                });
                return;
            }

            if (act === 'HUNT_AND_ADD_TO_CART' || act === 'ADD_TO_CART' || act === 'SEARCH_PRODUCTS') {
                const prods = Array.isArray(data.products)
                    ? data.products
                    : (data.product ? [data.product] : []);
                if (prods.length > 0) {
                    await this.runSearchAndCartChoreography(
                        data.search_query || prods[0].name.substring(0, 20),
                        prods,
                        data.bubble_text
                    );
                    return;
                }
            }

            if (st === 'double_flip' || st.includes('jump')) {
                this.goToRandom2DTarget();
                this.setCatState(st, 5.5, ex);
            } else {
                this.setCatState(st, 6.5, ex);
            }
            this.spawnDomMagicSparklesAt(this.softBody.x, this.softBody.y);
            this.showBubble(data.bubble_text || '✨ Hô thần chú: Meow~ Đã rõ!', 7500);

            if (act === 'SET_THEME') {
                const mode = data.theme_mode || 'light';
                const targetSkin = data.skin_key || (mode === 'dark' ? 'bloomberg_terminal' : 'executive_light');
                const targetBtn = document.getElementById('headerThemeSettingsBtn');
                await this.climbToElementAndCastSpell(targetBtn, data.bubble_text || 'Chuyển chế độ Sáng/Tối!', () => {
                    if (typeof window.selectGlobalSeasonalSkin === 'function') {
                        window.selectGlobalSeasonalSkin(targetSkin);
                    } else {
                        localStorage.setItem('theme', mode);
                        if (typeof applySavedTheme === 'function') applySavedTheme();
                    }
                });
            } else if (act === 'SET_STYLE_PRESET') {
                localStorage.setItem('bs_style', data.style_preset || 'nvidia');
                if (typeof applySavedTheme === 'function') applySavedTheme();
            } else if (act === 'TRIGGER_CHECKIN') {
                const checkinBtn = document.getElementById('headerCheckinBtn');
                await this.climbToElementAndCastSpell(checkinBtn, data.bubble_text || 'Điểm danh nhận thưởng!', () => {
                    if (typeof triggerHeaderCheckin === 'function') {
                        triggerHeaderCheckin();
                    }
                });
            } else if (act === 'NAVIGATE_PAGE' && data.target_url) {
                const navLink = document.querySelector(`a[href*="${data.target_url}"]`);
                await this.climbToElementAndCastSpell(navLink, data.bubble_text || 'Dịch chuyển tới trang đích!', () => {
                    setTimeout(() => {
                        window.location.href = data.target_url;
                    }, 550);
                });
            }
        }

        loop(ts) {
            const rawDt = (ts - this.lastTs) / 1000;
            this.lastTs = ts;
            const dt = Math.min(0.025, Math.max(0.004, rawDt || 0.016));
            this.updateCatBehavior(dt);
            this.renderCatCanvas();
            requestAnimationFrame((nextTs) => this.loop(nextTs));
        }

        updateCatBehavior(dt) {
            this.animTime += dt;
            this.stateTimer -= dt;

            this.blinkTimer -= dt;
            if (this.blinkTimer <= 0) {
                this.eyeOpen = 0.08;
                if (this.blinkTimer <= -0.16) {
                    this.blinkTimer = 3.0 + Math.random() * 3.5;
                }
            } else {
                this.eyeOpen = lerpVal(this.eyeOpen, 1.0, dt * 14);
            }

            if (this.state === 'double_flip' || this.state === 'backflip') {
                this.bodyTilt += dt * 680 * this.direction;
            } else {
                this.bodyTilt = lerpVal(this.bodyTilt, 0, dt * 10);
            }

            if (!this.isDragging) {
                if (this.targetX !== null && this.targetY !== null) {
                    const dx = this.targetX - this.softBody.x;
                    const dy = this.targetY - this.softBody.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 16) {
                        this.softBody.x = this.targetX;
                        this.softBody.y = this.targetY;
                        this.targetX = null;
                        this.targetY = null;
                        this.softBody.triggerSquish(1.24, 0.78);
                        if (!this.choreographyBusy && (this.state === 'walking' || this.state.includes('jump') || this.state.includes('climb'))) {
                            this.setCatState('sitting', 4.5, 'normal', false);
                        }
                    } else {
                        if (Math.abs(dx) > 5) this.direction = dx >= 0 ? 1 : -1;
                        const moveSpd = this.moveSpeedOverride || ((this.state.includes('jump') || this.state.includes('run') || this.state === 'carrying') ? 360 : 185);
                        const stepDist = Math.min(dist, moveSpd * dt);
                        this.softBody.x += (dx / dist) * stepDist;
                        this.softBody.y += (dy / dist) * stepDist;
                    }
                } else if (!this.choreographyBusy && this.stateTimer <= 0) {
                    const r = Math.random();
                    if (r < 0.45) {
                        const pt = this.pickRandomScreenPerchPoint();
                        this.surfaceMode = pt.mode;
                        this.targetX = pt.x;
                        this.targetY = pt.y;
                        const moveState = Math.abs(pt.y - this.softBody.y) > 80 ? 'jump_starfish_soar' : 'walking';
                        this.setCatState(moveState, 5.5, 'normal', false);
                    } else if (r < 0.72) {
                        this.targetX = 90 + Math.random() * Math.max(150, window.innerWidth - 180);
                        this.targetY = this.softBody.y;
                        this.setCatState('walking', 5.0, 'normal', false);
                    } else if (r < 0.86) {
                        this.setCatState('loaf_purr_toast', 5.5, 'content_purr', false);
                    } else {
                        this.setCatState('sploot_superman', 5.0, 'uwu', false);
                    }
                }
            }

            this.softBody.x = Math.min(this.rightWallX, Math.max(this.leftWallX, this.softBody.x));
            this.softBody.y = Math.min(this.floorY, Math.max(this.ceilingY, this.softBody.y));
            this.softBody.stepShape(dt);

            const cx = this.softBody.x;
            const cy = this.softBody.y;
            if (this.hitbox) {
                this.hitbox.style.left = (cx - 52) + 'px';
                this.hitbox.style.top = (cy - 44) + 'px';
            }
            if (this.bubbleEl && !this.bubbleEl.classList.contains('d-none')) {
                const bw = this.bubbleEl.offsetWidth || 220;
                const leftPos = Math.max(12, Math.min(window.innerWidth - bw - 16, cx - bw / 2));
                const topPos = cy > 140 ? (cy - 114) : (cy + 40);
                this.bubbleEl.style.left = leftPos + 'px';
                this.bubbleEl.style.top = Math.max(8, topPos) + 'px';
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt * 0.85;
                if (p.life <= 0) this.particles.splice(i, 1);
            }
        }

        renderCatCanvas() {
            const ctx = this.ctx;
            if (!ctx) return;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            const cx = this.softBody.x;
            const cy = this.softBody.y;
            const dir = this.direction;
            const b = this.breed;
            const st = this.state;
            const t = this.animTime;
            const scX = this.softBody.smoothScaleX;
            const scY = this.softBody.smoothScaleY;

            ctx.save();
            ctx.translate(cx, cy);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
            ctx.beginPath();
            ctx.ellipse(0, 24 * scY, 32 * scX, 5.0, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.rotate((this.bodyTilt * Math.PI) / 180);

            const wag = Math.sin(t * (st.includes('dance') || st.includes('happy') ? 16 : 5.5)) * 13;
            const tx = -24 * dir * scX;
            const ty = 3 * scY;
            ctx.save();
            ctx.lineCap = 'round';
            ctx.strokeStyle = b.stroke;
            ctx.lineWidth = b.tailStyle === 'fluffy' ? 13 : 9.5;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.bezierCurveTo(tx - 18 * dir, ty + 8, tx - 35 * dir, ty - 16 + wag, tx - 44 * dir, ty - 5 + wag);
            ctx.stroke();
            ctx.strokeStyle = b.pCol;
            ctx.lineWidth = b.tailStyle === 'fluffy' ? 8.5 : 5.5;
            ctx.stroke();
            ctx.restore();

            if (!st.includes('loaf') && !st.includes('sleep')) {
                const isMoving = (this.targetX !== null || st === 'walking' || st.includes('run') || st === 'carrying');
                const walkSwing = isMoving ? Math.sin(t * 15) * 8.0 : 0;
                ctx.save();
                ctx.fillStyle = b.body;
                ctx.strokeStyle = b.stroke;
                ctx.lineWidth = 3.8;
                [-14, 14].forEach((ox, idx) => {
                    const lx = ox * dir + (idx === 0 ? -walkSwing : walkSwing) * 0.6;
                    const ly = 10 * scY;
                    ctx.beginPath();
                    ctx.roundRect(lx - 6, ly, 12, 14, 5.5);
                    ctx.fill();
                    ctx.stroke();
                });
                ctx.restore();
            }

            const pts = this.softBody.getLocalContourPoints();
            const num = pts.length;
            const bodyPath = new Path2D();
            const startMidX = (pts[0].ox + pts[num - 1].ox) / 2;
            const startMidY = (pts[0].oy + pts[num - 1].oy) / 2;
            bodyPath.moveTo(startMidX, startMidY);
            for (let i = 0; i < num; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % num];
                bodyPath.quadraticCurveTo(p1.ox, p1.oy, (p1.ox + p2.ox) / 2, (p1.oy + p2.oy) / 2);
            }
            bodyPath.closePath();

            ctx.save();
            ctx.fillStyle = b.body;
            ctx.fill(bodyPath);

            ctx.save();
            ctx.clip(bodyPath);
            if (b.pattern !== 'solid') {
                const bellyPath = new Path2D();
                bellyPath.ellipse(2 * dir, 11 * scY, 19 * scX, 10 * scY, 0, 0, Math.PI * 2);
                ctx.fillStyle = b.belly;
                ctx.fill(bellyPath);
            }
            if (b.pattern === 'calico' || b.pattern === 'cow') {
                const patchPath = new Path2D();
                patchPath.ellipse(-8 * dir, -6 * scY, 12, 9.5, 0, 0, Math.PI * 2);
                ctx.fillStyle = b.pCol;
                ctx.fill(patchPath);
            } else if (b.pattern === 'stripes') {
                ctx.fillStyle = b.pCol;
                [-10, 0, 10].forEach(off => {
                    ctx.fillRect(off - 2, -22 * scY, 4, 11);
                });
            }
            ctx.restore();

            ctx.lineWidth = 4.2;
            ctx.strokeStyle = b.stroke;
            ctx.stroke(bodyPath);
            ctx.restore();

            const bobY = (this.targetX !== null || st.includes('dance')) ? -Math.abs(Math.sin(t * 13)) * 3.5 : 0;
            const hx = (st.includes('loaf') || st.includes('sleep') ? 15 : 21) * dir * scX;
            const hy = -(st.includes('sploot') ? 10 : 17) * scY + bobY;

            ctx.save();
            ctx.translate(hx, hy);
            if (st === 'head_tilt' || st.includes('dance')) {
                ctx.rotate(Math.sin(t * 6) * 0.14);
            }

            [-1, 1].forEach(side => {
                ctx.save();
                ctx.translate(side * 12, -14);
                ctx.rotate(side * 0.22);
                const earP = new Path2D();
                earP.moveTo(-9, 4);
                earP.quadraticCurveTo(-5, -15, 0, -18);
                earP.quadraticCurveTo(5, -15, 9, 4);
                earP.closePath();
                ctx.fillStyle = b.pattern === 'points' ? b.pCol : b.body;
                ctx.fill(earP);
                ctx.lineWidth = 3.8;
                ctx.strokeStyle = b.stroke;
                ctx.stroke(earP);

                const innerP = new Path2D();
                innerP.moveTo(-4, 2);
                innerP.quadraticCurveTo(0, -10.5, 4, 2);
                innerP.closePath();
                ctx.fillStyle = 'rgb(251, 207, 232)';
                ctx.fill(innerP);
                ctx.restore();
            });

            const chewPuff = (st.includes('eat') || st.includes('boba')) ? Math.abs(Math.sin(t * 15)) * 3.5 : 0;
            const headPath = new Path2D();
            headPath.ellipse(0, 0, 23 + chewPuff, 19, 0, 0, Math.PI * 2);
            ctx.fillStyle = b.body;
            ctx.fill(headPath);
            ctx.lineWidth = 4.0;
            ctx.strokeStyle = b.stroke;
            ctx.stroke(headPath);

            ctx.strokeStyle = b.stroke;
            ctx.lineWidth = 1.8;
            [-1, 1].forEach(wSide => {
                const wx0 = wSide * (17 + chewPuff * 0.5);
                const wx1 = wSide * (28 + chewPuff * 0.7);
                ctx.beginPath();
                ctx.moveTo(wx0, 2);
                ctx.lineTo(wx1, 0);
                ctx.moveTo(wx0, 6);
                ctx.lineTo(wx1, 7);
                ctx.stroke();
            });

            if (this.expr === 'cyber_visor_glow') {
                ctx.fillStyle = 'rgba(6, 182, 212, 0.88)';
                ctx.strokeStyle = 'rgb(2, 132, 199)';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.roundRect(-17, -7, 34, 9.5, 4);
                ctx.fill();
                ctx.stroke();
            } else if (this.expr === 'rich_sunglasses_gold') {
                ctx.fillStyle = 'rgb(250, 204, 21)';
                ctx.strokeStyle = 'rgb(120, 53, 15)';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.roundRect(-16, -8, 13.5, 9.5, 3);
                ctx.roundRect(2.5, -8, 13.5, 9.5, 3);
                ctx.fill();
                ctx.stroke();
            } else if (st.includes('sleep') || this.expr === 'content_purr' || this.expr === 'sleepy_drool_bubble') {
                ctx.strokeStyle = b.stroke;
                ctx.lineWidth = 2.8;
                [-8.5, 8.5].forEach(ex => {
                    ctx.beginPath();
                    ctx.arc(ex, -2, 4.6, 0, Math.PI, false);
                    ctx.stroke();
                });
            } else {
                const dx = this.mousePos.x - (cx + hx);
                const dy = this.mousePos.y - (cy + hy);
                const ang = Math.atan2(dy, dx);
                const lookDist = Math.min(2.0, Math.hypot(dx, dy) * 0.012);
                const px = Math.cos(ang) * lookDist;
                const py = Math.sin(ang) * lookDist;

                [-8.5, 8.5].forEach((ex, idxE) => {
                    ctx.fillStyle = idxE === 0 ? b.eyeColor : b.eyeColor2;
                    ctx.beginPath();
                    ctx.ellipse(ex, -2, 6.2, 6.2 * this.eyeOpen, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'rgb(9, 13, 22)';
                    ctx.beginPath();
                    ctx.ellipse(ex + px, -2 + py, 3.9, 4.8 * this.eyeOpen, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'rgb(255, 255, 255)';
                    ctx.beginPath();
                    ctx.arc(ex - 1.6 + px, -3.4 + py, 1.9, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            ctx.fillStyle = 'rgba(255, 145, 178, 0.85)';
            ctx.beginPath();
            ctx.ellipse(-14, 5, 4.4, 2.9, 0, 0, Math.PI * 2);
            ctx.ellipse(14, 5, 4.4, 2.9, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgb(255, 107, 129)';
            ctx.beginPath();
            ctx.moveTo(-3.0, 3.8);
            ctx.lineTo(3.0, 3.8);
            ctx.lineTo(0, 7.2);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgb(255, 107, 129)';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(-4.8, 8.0);
            ctx.quadraticCurveTo(-2.4, 11.8, 0, 8.0);
            ctx.quadraticCurveTo(2.4, 11.8, 4.8, 8.0);
            ctx.stroke();

            if (this.carryingLabel) {
                ctx.save();
                ctx.translate(10 * dir, 16);
                ctx.fillStyle = 'rgb(118, 185, 0)';
                ctx.strokeStyle = 'rgb(15, 23, 42)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-28, -2, 56, 16, 5);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = 'rgb(15, 23, 42)';
                ctx.font = 'bold 8.5px Segoe UI, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('🐱 Đề Xuất', 0, 9);
                ctx.restore();
            } else if (st === 'drink_boba_tea') {
                ctx.save();
                ctx.translate(10 * dir, 14);
                ctx.fillStyle = 'rgb(253, 230, 138)';
                ctx.strokeStyle = 'rgb(30, 41, 59)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-7, -2, 14, 16, 3);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = 'rgb(15, 23, 42)';
                [-2.5, 0, 2.5].forEach(bx => {
                    ctx.beginPath();
                    ctx.arc(bx, 10, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            } else if (st.includes('eat')) {
                ctx.save();
                ctx.translate(10 * dir, 14);
                ctx.fillStyle = 'rgb(251, 146, 60)';
                ctx.strokeStyle = 'rgb(15, 23, 42)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.ellipse(0, 4, 9, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
            ctx.restore();

            this.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
                ctx.font = '16px "Segoe UI Emoji", Arial';
                ctx.fillText(p.sym, p.x, p.y);
                ctx.restore();
            });
        }
    }

    window.climbToElementAndCastSpell = function (targetElOrSelector, spellText, actionCallback) {
        if (window.__nividaCatInstance && typeof window.__nividaCatInstance.climbToElementAndCastSpell === 'function') {
            return window.__nividaCatInstance.climbToElementAndCastSpell(targetElOrSelector, spellText, actionCallback);
        }
    };

    window.performVoiceSearchAutoClick = function (spokenKeyword) {
        if (window.__nividaCatInstance && typeof window.__nividaCatInstance.performVoiceSearchAutoClick === 'function') {
            return window.__nividaCatInstance.performVoiceSearchAutoClick(spokenKeyword);
        }
    };

    window.sendCommandToCat = function (message) {
        if (window.__nividaCatInstance && typeof window.__nividaCatInstance.sendCommandToCat === 'function') {
            return window.__nividaCatInstance.sendCommandToCat(message);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.__nividaCatInstance = new WebLiquidCatAssistant();
        });
    } else {
        window.__nividaCatInstance = new WebLiquidCatAssistant();
    }
})();