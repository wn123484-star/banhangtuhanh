(function () {
    if (window.__nividaLiquidCatV25) return;
    window.__nividaLiquidCatV25 = true;

    /* 5 GIỐNG MÈO ĐẶC TRƯNG (ĐỔI MÀU LÔNG, MẮT, HỌA TIẾT & PHỤ KIỆN TỨC THÌ TRÊN CANVAS) */
    const CAT_BREEDS = {
        ginger_boba: {
            name: 'Mèo Cam Hoàng Thượng (Ginger Tabby)',
            shortName: 'Mèo Cam Hoàng Thượng',
            body: 'rgb(251, 146, 60)',
            belly: 'rgb(255, 237, 213)',
            stroke: 'rgb(124, 45, 18)',
            pCol: 'rgb(234, 88, 12)',
            pattern: 'stripes',
            eyeColor: 'rgb(217, 119, 6)',
            eyeColor2: 'rgb(217, 119, 6)',
            tailStyle: 'fluffy',
            accessory: 'crown'
        },
        tuxedo_boss: {
            name: 'Mèo Đen Tuxedo Quý Tộc (Black & White Tuxedo)',
            shortName: 'Mèo Đen Tuxedo Quý Tộc',
            body: 'rgb(30, 30, 36)',
            belly: 'rgb(248, 250, 252)',
            stroke: 'rgb(9, 9, 11)',
            pCol: 'rgb(15, 15, 20)',
            pattern: 'cow',
            eyeColor: 'rgb(234, 179, 8)',
            eyeColor2: 'rgb(234, 179, 8)',
            tailStyle: 'long',
            accessory: 'bowtie'
        },
        white_cloud: {
            name: 'Mèo Trắng Lông Ngắn Anh (Snow White Cyan-Eye)',
            shortName: 'Mèo Trắng Lông Ngắn Anh',
            body: 'rgb(248, 250, 252)',
            belly: 'rgb(255, 255, 255)',
            stroke: 'rgb(71, 85, 105)',
            pCol: 'rgb(226, 232, 240)',
            pattern: 'solid',
            eyeColor: 'rgb(6, 182, 212)',
            eyeColor2: 'rgb(2, 132, 199)',
            tailStyle: 'fluffy',
            accessory: 'bell'
        },
        calico_lucky: {
            name: 'Mèo Tam Thể May Mắn (Calico)',
            shortName: 'Mèo Tam Thể May Mắn',
            body: 'rgb(255, 251, 235)',
            belly: 'rgb(255, 255, 255)',
            stroke: 'rgb(41, 37, 36)',
            pCol: 'rgb(249, 115, 22)',
            pattern: 'calico',
            eyeColor: 'rgb(217, 119, 6)',
            eyeColor2: 'rgb(16, 185, 129)',
            tailStyle: 'normal',
            accessory: 'bell'
        },
        nivida_cyber: {
            name: 'Mèo Xám Cyber Neon (Cyberpunk Silver-Green)',
            shortName: 'Mèo Xám Cyber Neon',
            body: 'rgb(51, 65, 85)',
            belly: 'rgb(16, 185, 129)',
            stroke: 'rgb(15, 23, 42)',
            pCol: 'rgb(132, 204, 22)',
            pattern: 'points',
            eyeColor: 'rgb(16, 185, 129)',
            eyeColor2: 'rgb(52, 211, 153)',
            tailStyle: 'fluffy',
            accessory: 'cyber_collar'
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
                this.targetScaleX = 1.44;
                this.targetScaleY = 0.56;
            } else if (s.includes('loaf') || s.includes('sleep')) {
                this.targetScaleX = 1.24;
                this.targetScaleY = 0.76;
            } else if (s.includes('run') || s.includes('sprint') || s.includes('zoom')) {
                this.targetScaleX = 1.26;
                this.targetScaleY = 0.74;
            } else if (s.includes('climb')) {
                this.targetScaleX = 0.90;
                this.targetScaleY = 1.15;
            } else if (s.includes('jump') || s.includes('flip') || s.includes('dance') || s.includes('magic')) {
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
            this.breedKey = saved.breedKey && CAT_BREEDS[saved.breedKey] ? saved.breedKey : 'ginger_boba';
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
            this.foodAnim = null;
            this.magicCastState = null;
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
                    };
                }
            } catch {}
        }

        injectStylesAndDOM() {
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
                    white-space: nowrap;
                    max-width: 340px;
                    background: rgb(15, 23, 42);
                    color: rgb(248, 250, 252);
                    border: 2px solid rgb(16, 185, 129);
                    border-radius: 999px;
                    padding: 6px 14px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    line-height: 1.3;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                    z-index: 10048;
                    pointer-events: none;
                    transition: opacity 0.16s ease;
                }
                .nivida-cat-bubble.d-none {
                    opacity: 0;
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
                    background: rgb(16, 185, 129);
                    color: rgb(5, 46, 22);
                    border-color: rgb(16, 185, 129);
                }
                .cat-target-glow {
                    outline: 3px solid rgb(16, 185, 129) !important;
                    box-shadow: 0 0 22px rgba(16, 185, 129, 0.85) !important;
                    transition: all 0.25s ease !important;
                }
            `;
            document.head.appendChild(styleEl);

            const wrap = document.createElement('div');
            wrap.innerHTML = `
                <canvas id="nividaLiquidCatCanvas"></canvas>
                <div id="nividaCatHitbox" class="nivida-cat-hitbox" title="Bấm vào Mèo hoặc Kéo thả Mèo lên tận thanh Header / bất kỳ đâu!"></div>
                <div id="nividaCatSpeechBubble" class="nivida-cat-bubble d-none"></div>
            `;
            document.body.appendChild(wrap);

            this.canvas = document.getElementById('nividaLiquidCatCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.hitbox = document.getElementById('nividaCatHitbox');
            this.bubbleEl = document.getElementById('nividaCatSpeechBubble');
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

        hideBubbleImmediate() {
            if (this.bubbleTimeout) {
                clearTimeout(this.bubbleTimeout);
                this.bubbleTimeout = null;
            }
            if (this.bubbleEl) {
                this.bubbleEl.classList.add('d-none');
            }
        }

        showBubble(text, durationMs = 2500, broadcast = true) {
            if (!this.bubbleEl) return;
            const raw = String(text || '').trim();
            const concise = raw.length > 52 ? (raw.slice(0, 49) + '...') : raw;
            this.currentBubbleText = concise;
            this.bubbleEl.textContent = concise;
            this.bubbleEl.classList.remove('d-none');
            if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
            this.bubbleTimeout = setTimeout(() => {
                this.bubbleEl.classList.add('d-none');
            }, Math.min(2800, Math.max(1800, durationMs)));
            if (broadcast) this.saveCatState(concise);
        }

        /* 4.2: ĐỔI MÈO 5 GIỐNG HOẠT ĐỘNG 100% */
        async cycleCatBreed() {
            this.hideBubbleImmediate();
            const idx = (BREED_KEYS.indexOf(this.breedKey) + 1) % BREED_KEYS.length;
            this.breedKey = BREED_KEYS[idx];
            this.breed = CAT_BREEDS[this.breedKey];
            this.softBody.triggerSquish(1.32, 0.72);
            this.setCatState('sit_paw_wave_hi', 3.5, 'lovestruck_sparkle', false);
            this.spawnDomMagicSparklesAt(this.softBody.x, this.softBody.y);
            this.spawnParticle('sparkle');
            this.spawnParticle('heart');
            this.saveCatState();
            await sleepMs(420);
            this.showBubble(`🎨 Đã đổi sang ${this.breed.shortName}!`, 2500, true);
        }

        switchCatBreed() {
            return this.cycleCatBreed();
        }

        /* 4.3: HÔ BIẾN ĐỔI GIAO DIỆN SÁNG/TỐI THật 100% */
        async performMagicThemeToggle(targetMode = null) {
            if (this.choreographyBusy) return;
            this.choreographyBusy = true;
            this.hideBubbleImmediate();

            const startY = this.softBody.y;
            this.magicCastState = {
                active: true,
                progress: 0,
                ringRadius: 8
            };
            this.setCatState('ai_magic_cape_spin', 2.0, 'starry_hyped_grin', false);
            this.spawnDomMagicSparklesAt(this.softBody.x, this.softBody.y);

            const steps = 24;
            for (let i = 1; i <= steps; i++) {
                const p = i / steps;
                this.magicCastState.progress = p;
                this.magicCastState.ringRadius = 12 + p * 85;
                this.softBody.y = Math.max(this.ceilingY, startY - Math.sin(p * Math.PI) * 32);
                this.bodyTilt = p * 360;
                if (i === 12) {
                    this.spawnDomMagicSparklesAt(this.softBody.x, this.softBody.y);
                    const isDarkNow = document.documentElement.getAttribute('data-theme') === 'dark';
                    const desiredMode = targetMode || (isDarkNow ? 'light' : 'dark');
                    if (typeof window.applyNvidiaVisualSkin === 'function') {
                        const nextSkin = desiredMode === 'dark'
                            ? (localStorage.getItem('nvx_last_dark_skin') || 'emerald_tech')
                            : 'executive_light';
                        window.applyNvidiaVisualSkin(nextSkin);
                    } else if (typeof window.toggleTheme === 'function') {
                        window.toggleTheme();
                    }
                    document.documentElement.setAttribute('data-theme', desiredMode);
                    if (document.body) document.body.setAttribute('data-theme', desiredMode);
                    localStorage.setItem('theme', desiredMode);
                }
                await sleepMs(48);
            }

            this.bodyTilt = 0;
            this.softBody.y = startY;
            this.magicCastState = null;
            this.softBody.triggerSquish(1.28, 0.74);
            this.setCatState('sit_paw_wave_hi', 3.5, 'lovestruck_sparkle', true);
            this.choreographyBusy = false;
            this.showBubble('✨ Hô biến! Đã đổi giao diện!', 2500, true);
        }

        /* 4.4A: HOẠT ẢNH ĂN CÁ THẬT TRÊN CANVAS (CÁ -> NHAI 3 NHÁT -> XƯƠNG CÁ 🦴 + TIM 💕) */
        async performEatFishAnimation() {
            if (this.choreographyBusy) return;
            this.choreographyBusy = true;
            this.hideBubbleImmediate();

            this.setCatState('eat_fish_feast', 3.0, 'starry_hyped_grin', false);
            const scales = [1.0, 0.70, 0.42];
            for (let bite = 0; bite < 3; bite++) {
                this.foodAnim = { type: 'fish', stage: bite, scale: scales[bite] };
                this.softBody.triggerSquish(1.22, 0.80);
                this.spawnParticle('crumb');
                await sleepMs(480);
            }

            this.foodAnim = { type: 'fish', stage: 3, scale: 1.0 };
            this.softBody.triggerSquish(1.28, 0.75);
            this.spawnParticle('heart');
            this.spawnParticle('sparkle');
            await sleepMs(650);

            this.foodAnim = null;
            this.setCatState('sitting', 4.0, 'content_purr', true);
            this.choreographyBusy = false;
            this.showBubble('🐟 Cá nướng thơm ngon quá!', 2500, true);
        }

        /* 4.4B: HOẠT ẢNH UỐNG TRÀ SỮA TRÂN CHÂU THẬT TRÊN CANVAS (HÚT CẠN LY + ĐỎ MÁ HỒNG) */
        async performDrinkBobaAnimation() {
            if (this.choreographyBusy) return;
            this.choreographyBusy = true;
            this.hideBubbleImmediate();

            this.setCatState('drink_boba_tea', 3.2, 'lovestruck_sparkle', false);
            const totalSteps = 18;
            for (let s = 0; s <= totalSteps; s++) {
                const ratio = 1.0 - (s / totalSteps) * 0.86;
                const pearlsLeft = Math.max(1, Math.ceil((1.0 - s / totalSteps) * 6));
                this.foodAnim = {
                    type: 'boba',
                    level: ratio,
                    pearls: pearlsLeft,
                    blushBoost: 1.6
                };
                if (s % 5 === 0) {
                    this.softBody.triggerSquish(1.18, 0.84);
                    this.spawnParticle('heart');
                }
                await sleepMs(115);
            }

            this.foodAnim = null;
            this.setCatState('sitting', 4.0, 'content_purr', true);
            this.choreographyBusy = false;
            this.showBubble('🧋 Trà sữa full topping đã quá!', 2500, true);
        }

        async performLoafBreadAnimation() {
            this.hideBubbleImmediate();
            this.setCatState('loaf_purr_toast', 4.5, 'content_purr', false);
            this.softBody.triggerSquish(1.30, 0.72);
            this.spawnParticle('zzz');
            this.spawnParticle('heart');
            await sleepMs(1400);
            this.showBubble('🥖 Nằm ổ bánh mì ấm áp quá!', 2500, true);
        }

        async performBackflipAnimation() {
            if (this.choreographyBusy) return;
            this.choreographyBusy = true;
            this.hideBubbleImmediate();
            const startY = this.softBody.y;
            this.setCatState('double_flip', 2.0, 'starry_hyped_grin', false);
            for (let i = 1; i <= 18; i++) {
                const p = i / 18;
                this.softBody.y = Math.max(this.ceilingY, startY - Math.sin(p * Math.PI) * 58);
                this.bodyTilt = p * 360 * this.direction;
                await sleepMs(42);
            }
            this.bodyTilt = 0;
            this.softBody.y = startY;
            this.softBody.triggerSquish(1.32, 0.70);
            this.spawnParticle('star');
            this.setCatState('sitting', 4.0, 'normal', true);
            this.choreographyBusy = false;
            this.showBubble('🤸 Nhào lộn 360 độ chuẩn chỉnh!', 2500, true);
        }

        async performMeltSplootAnimation() {
            this.hideBubbleImmediate();
            this.setCatState('sploot_superman', 4.5, 'uwu', false);
            this.softBody.triggerSquish(1.48, 0.54);
            this.spawnParticle('sparkle');
            await sleepMs(1350);
            this.showBubble('🫠 Mèo lỏng tan chảy mát rượi!', 2500, true);
        }

        async performDanceAnimation() {
            this.hideBubbleImmediate();
            this.setCatState('money_happy_dance', 3.5, 'lovestruck_sparkle', false);
            for (let i = 0; i < 4; i++) {
                this.direction = i % 2 === 0 ? 1 : -1;
                this.softBody.triggerSquish(0.92, 1.16);
                this.spawnParticle('music');
                await sleepMs(340);
            }
            this.setCatState('sitting', 4.0, 'normal', true);
            this.showBubble('💃 Nhảy múa cực sung cùng bạn!', 2500, true);
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

        async goToCeilingWalk() {
            this.hideBubbleImmediate();
            const w = window.innerWidth;
            this.surfaceMode = 'ceiling';
            const tx = 100 + Math.random() * Math.max(160, w - 200);
            this.softBody.triggerSquish(0.88, 1.20);
            this.spawnParticle('sparkle');
            await this.moveToPointAsync(tx, this.ceilingY, 'climb_spider_scramble', 'starry_hyped_grin', 480);
            this.showBubble('🧗 Đã leo lên trần web tuần tra!', 2500, true);
        }

        async goToRandom2DTarget() {
            this.hideBubbleImmediate();
            const pt = this.pickRandomScreenPerchPoint();
            this.surfaceMode = pt.mode;
            this.softBody.triggerSquish(0.90, 1.18);
            this.spawnParticle('dust');
            await this.moveToPointAsync(pt.x, pt.y, 'jump_starfish_soar', 'pure_joy_beam', 480);
            this.showBubble('🏃 Đã phóng tới vị trí mới!', 2500, true);
        }

        moveToPointAsync(tx, ty, stateName = 'climb_spider_scramble', expr = 'matrix_code_eyes', speed = 440) {
            this.hideBubbleImmediate();
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
            const cardEl = linkEl ? (linkEl.closest('.product-card') || linkEl.closest('.nv-product-card') || linkEl.closest('.col-6') || linkEl) : null;
            if (cardEl) {
                try {
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch {}
                return cardEl;
            }
            const anyCard = document.querySelector('#productGrid .nv-product-card, #productGrid .product-card, #productList .product-card');
            return anyCard || null;
        }

        /* 4.5: KỊCH BẢN 4 CHẶNG LIỀN MẠCH: NHẢY LÊN Ô TÌM KIẾM -> GÕ CHỮ -> NHẢY XUỐNG SP ĐỘI HỘP QUÀ 📦 -> THA LÊN GIỎ HÀNG 🛒 */
        async runSearchAndCartChoreography(searchQuery, products, finalBubbleText) {
            if (this.choreographyBusy) return;
            this.choreographyBusy = true;
            this.hideBubbleImmediate();

            const restingX = this.softBody.x;
            const restingY = this.floorY;

            try {
                /* Chặng 1: Nhảy từ vị trí nghỉ và chạy lên đậu ngay cạnh ô #globalSearchInput / #searchInput */
                const searchInput = document.getElementById('globalSearchInput') || document.getElementById('searchInput');
                let sX = window.innerWidth * 0.42;
                let sY = 58;
                if (searchInput) {
                    const sr = searchInput.getBoundingClientRect();
                    if (sr.width > 0) {
                        sX = sr.left + sr.width * 0.5;
                        sY = Math.max(this.ceilingY, sr.top + sr.height * 0.5);
                    }
                }

                await this.moveToPointAsync(sX, sY, 'climb_spider_scramble', 'matrix_code_eyes', 500);

                /* Chặng 2: Gõ từng chữ cái từ khóa vào ô tìm kiếm và kích hoạt lọc sản phẩm */
                const cleanQ = String(searchQuery || 'RTX 4070').trim();
                const gInp = document.getElementById('globalSearchInput');
                const hInp = document.getElementById('searchInput');
                if (gInp) gInp.value = '';
                if (hInp) hInp.value = '';
                for (let i = 0; i < cleanQ.length; i++) {
                    if (gInp) gInp.value += cleanQ[i];
                    if (hInp && hInp !== gInp) hInp.value += cleanQ[i];
                    await sleepMs(42);
                }
                this.spawnParticle('idea_bulb');
                this.softBody.triggerSquish(1.25, 0.78);
                if (typeof window.loadProducts === 'function') {
                    const newUrl = window.location.pathname + '?q=' + encodeURIComponent(cleanQ);
                    window.history.replaceState({}, '', newUrl);
                    await window.loadProducts();
                }
                await sleepMs(320);

                /* Chặng 3: Nhảy xuống thẻ sản phẩm khớp đầu tiên và đội hộp hàng 📦 lên lưng */
                const list = Array.isArray(products) && products.length ? products : [{
                    id: 1,
                    name: cleanQ,
                    price: 16990000,
                    category: 'gpu'
                }];
                const firstProd = list[0];
                const cardEl = this.findProductCardRectOnScreen(firstProd.id);
                await sleepMs(220);

                let pX = Math.round(window.innerWidth * 0.45);
                let pY = Math.min(this.floorY - 60, Math.max(160, window.innerHeight * 0.52));
                if (cardEl) {
                    const cr = cardEl.getBoundingClientRect();
                    if (cr.width > 0 && cr.top > 30 && cr.top < window.innerHeight - 30) {
                        pX = cr.left + cr.width * 0.5;
                        pY = Math.max(this.ceilingY + 20, Math.min(this.floorY - 20, cr.top + 36));
                    }
                    cardEl.classList.add('cat-target-glow');
                }

                await this.moveToPointAsync(pX, pY, 'jump_starfish_soar', 'starry_hyped_grin', 520);

                this.carryingLabel = '📦 ' + String(firstProd.name || cleanQ).slice(0, 14);
                this.softBody.triggerSquish(1.30, 0.72);
                this.spawnParticle('sparkle');
                await sleepMs(340);

                if (cardEl) {
                    setTimeout(() => cardEl.classList.remove('cat-target-glow'), 1400);
                }

                /* Chặng 4: Tha hộp hàng 📦 chạy thẳng tới nút Giỏ hàng 🛒 trên Header, thả vào làm nút Giỏ hàng nảy lên */
                const cartBtn = document.getElementById('headerCartLinkBtn') || document.getElementById('headerCartCount');
                if (cartBtn) {
                    const br = cartBtn.getBoundingClientRect();
                    if (br.width > 0) {
                        await this.moveToPointAsync(br.left + br.width * 0.5, Math.max(this.ceilingY, br.bottom + 14), 'carrying', 'money_eyes', 540);
                    }
                }

                for (let i = 0; i < list.length; i++) {
                    if (typeof window.addToCartGlobal === 'function') {
                        window.addToCartGlobal(list[i], {
                            silent: true,
                            catSuggested: true,
                            recommendLabel: '🐱 Mèo AI Đề Xuất'
                        });
                    }
                }
                if (typeof window.updateCartBadge === 'function') {
                    window.updateCartBadge();
                }
                if (cartBtn) {
                    cartBtn.classList.remove('nv-cart-bounce-active');
                    void cartBtn.offsetWidth;
                    cartBtn.classList.add('nv-cart-bounce-active');
                    setTimeout(() => cartBtn.classList.remove('nv-cart-bounce-active'), 700);
                }
                this.carryingLabel = '';
                this.spawnParticle('star');
                this.spawnParticle('heart');
                window.dispatchEvent(new CustomEvent('nivida_cart_updated'));

                /* Quay về vị trí nghỉ và hiện bong bóng thoại ngắn gọn 2.5s */
                await this.moveToPointAsync(restingX, restingY, 'jump_starfish_soar', 'lovestruck_sparkle', 540);
                this.surfaceMode = 'floor';
                this.setCatState('sit_paw_wave_hi', 4.5, 'lovestruck_sparkle', true);
                this.showBubble('🛒 Đã tha hàng vào giỏ cho bạn!', 2500, true);
            } catch (err) {
                this.carryingLabel = '';
                this.showBubble('🛒 Đã tha hàng vào giỏ cho bạn!', 2500, true);
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
                    this.hideBubbleImmediate();
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
                this.hideBubbleImmediate();
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
                        this.showBubble('🐾 Đậu trên trần web thích quá!', 2500);
                    } else if (this.softBody.y < this.floorY - 35) {
                        this.surfaceMode = 'perch';
                        this.showBubble('🐾 Mèo đậu ngay chỗ bạn thả nè!', 2500);
                    } else {
                        this.surfaceMode = 'floor';
                        this.softBody.y = this.floorY;
                    }
                    this.setCatState('sitting', 8.0, 'uwu');
                    this.spawnParticle('star');
                    this.saveCatState();
                }
            });
        }

        toggleDock(show) {
            if (typeof window.toggleUnifiedHubDock === 'function') {
                window.toggleUnifiedHubDock(show);
                if (show && typeof window.switchMessengerPopupTab === 'function') {
                    window.switchMessengerPopupTab('cat');
                }
            }
        }

        onCatClicked() {
            this.spawnParticle('heart');
            this.spawnParticle('sparkle');
            this.softBody.triggerSquish(1.25, 0.78);
            this.setCatState('sit_paw_wave_hi', 5.0, 'lovestruck_sparkle');
            this.showBubble('🐾 Meow~ Ra lệnh cho Mèo ở góc phải nhé!', 2500);
            this.toggleDock(true);
        }

        setCatState(newState, duration = 5.0, expr = 'normal', broadcast = true) {
            this.state = newState;
            this.stateTimer = duration;
            this.expr = expr;
            this.softBody.setLiquidState(newState);
            if (broadcast) this.saveCatState();
        }

        spawnParticle(type) {
            const symMap = {
                heart: '💕', zzz: '💤', star: '⭐',
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
            this.hideBubbleImmediate();
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
                await sleepMs(140);
                const rect = targetEl.getBoundingClientRect();
                if (rect.width > 0 || rect.height > 0) {
                    tx = rect.left + rect.width * 0.5;
                    ty = Math.max(this.ceilingY + 12, Math.min(this.floorY - 12, rect.top + Math.min(28, rect.height * 0.5)));
                }
                targetEl.classList.add('cat-target-glow');
            }

            await this.moveToPointAsync(tx, ty, 'climb_spider_scramble', 'starry_hyped_grin', 500);
            this.softBody.triggerSquish(1.32, 0.72);
            this.setCatState('ai_magic_cape_spin', 3.5, 'lovestruck_sparkle', true);
            this.spawnDomMagicSparklesAt(this.softBody.x, this.softBody.y);

            if (typeof actionCallback === 'function') {
                await actionCallback(targetEl);
            }

            if (targetEl) {
                setTimeout(() => targetEl.classList.remove('cat-target-glow'), 1500);
            }
            if (spellText) {
                this.showBubble(spellText, 2500, true);
            }
        }

        async performVoiceSearchAutoClick(spokenKeyword) {
            const cleanKw = String(spokenKeyword || '').trim();
            if (!cleanKw) return;
            if (this.choreographyBusy) this.choreographyBusy = false;
            this.choreographyBusy = true;
            this.hideBubbleImmediate();

            try {
                const searchInp = document.getElementById('searchInput') || document.getElementById('globalSearchInput');
                const searchBtn = document.getElementById('searchBtn') || document.getElementById('globalSearchBtn');
                const globalInp = document.getElementById('globalSearchInput');

                if (searchInp) searchInp.value = cleanKw;
                if (globalInp) globalInp.value = cleanKw;

                await this.climbToElementAndCastSpell(
                    searchBtn || searchInp,
                    `🎙️ Đã tìm "${cleanKw}" cho bạn!`,
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
                        } else if (typeof window.handleGlobalHeaderSearch === 'function') {
                            window.handleGlobalHeaderSearch();
                        }
                    }
                );
            } finally {
                this.choreographyBusy = false;
            }
        }

        async sendCommandToCat(message) {
            const rawMsg = String(message || '').trim();
            const low = rawMsg.toLowerCase();
            this.hideBubbleImmediate();

            /* Xử lý trực tiếp các lệnh hoạt ảnh đặc trưng ngay lập tức */
            if (low.includes('ăn cá') || low.includes('an ca') || low === 'fish') {
                await this.performEatFishAnimation();
                return;
            }
            if (low.includes('trà sữa') || low.includes('tra sua') || low.includes('boba')) {
                await this.performDrinkBobaAnimation();
                return;
            }
            if (low.includes('bánh mì') || low.includes('banh mi') || low.includes('loaf')) {
                await this.performLoafBreadAnimation();
                return;
            }
            if (low.includes('nhào lộn') || low.includes('lộn vòng') || low.includes('backflip')) {
                await this.performBackflipAnimation();
                return;
            }
            if (low.includes('tan chảy') || low.includes('sploot') || low.includes('melt')) {
                await this.performMeltSplootAnimation();
                return;
            }
            if (low.includes('nhảy múa') || low.includes('nhay mua') || low.includes('dance')) {
                await this.performDanceAnimation();
                return;
            }
            if (low.includes('đổi mèo') || low.includes('doi meo') || low.includes('đổi giống')) {
                await this.cycleCatBreed();
                return;
            }
            if (low.includes('giao diện tối') || low.includes('nền tối')) {
                await this.performMagicThemeToggle('dark');
                return;
            }
            if (low.includes('giao diện sáng') || low.includes('nền sáng')) {
                await this.performMagicThemeToggle('light');
                return;
            }
            if (low.includes('sáng tối') || low.includes('đổi giao diện') || low.includes('hô biến')) {
                await this.performMagicThemeToggle(null);
                return;
            }

            const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
            this.setCatState('ai_eureka_lightbulb_perk', 3.0, 'matrix_code_eyes', false);

            try {
                const res = await fetch('/api/settings/cat-assistant/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: rawMsg,
                        user_id: user ? user.id : null
                    })
                });
                const data = await res.json();
                await this.executeCommandResponse(data);
            } catch (err) {
                this.showBubble('🐾 Bạn thử lại lệnh giúp Mèo nhé!', 2500);
            }
        }

        async executeCommandResponse(data) {
            if (!data) return;
            const act = data.action_type || 'CHAT_REPLY';
            const st = data.cat_state || 'sit_paw_wave_hi';
            const ex = data.cat_expr || 'uwu';

            if (act === 'SWITCH_BREED') {
                await this.cycleCatBreed();
                return;
            }

            if (act === 'SET_THEME' || act === 'SET_SKIN_PRESET') {
                const mode = data.theme_mode || (String(data.skin_key || '').includes('light') ? 'light' : 'dark');
                await this.performMagicThemeToggle(mode);
                return;
            }

            if (st === 'eat_fish_feast' || st.includes('eat')) {
                await this.performEatFishAnimation();
                return;
            }

            if (st === 'drink_boba_tea' || st.includes('boba')) {
                await this.performDrinkBobaAnimation();
                return;
            }

            if (act === 'SET_GRID_DENSITY') {
                const densityVal = data.grid_density || '4';
                if (typeof window.applyProductGridDensity === 'function') {
                    window.applyProductGridDensity(densityVal, true);
                }
                this.showBubble(`📐 Đã chỉnh lưới ${densityVal} cột!`, 2500);
                return;
            }

            if (act === 'HUNT_AND_ADD_TO_CART' || act === 'ADD_TO_CART' || act === 'SEARCH_PRODUCTS' || act === 'SEARCH_ONLY_AUTO_CLICK') {
                const prods = Array.isArray(data.products)
                    ? data.products
                    : (data.product ? [data.product] : []);
                await this.runSearchAndCartChoreography(
                    data.search_query || (prods[0] ? prods[0].name.substring(0, 18) : 'RTX 4070'),
                    prods,
                    '🛒 Đã tha hàng vào giỏ cho bạn!'
                );
                return;
            }

            if (act === 'TRIGGER_CHECKIN') {
                if (typeof window.openDailyCheckinModal === 'function') {
                    window.openDailyCheckinModal();
                }
                this.showBubble('🔥 Đã mở bảng Điểm danh!', 2500);
                return;
            }

            if (act === 'NAVIGATE_PAGE' && data.target_url) {
                this.showBubble('🚀 Đang chuyển trang cho bạn!', 2000);
                setTimeout(() => {
                    window.location.href = data.target_url;
                }, 450);
                return;
            }

            this.setCatState(st, 4.5, ex);
            this.spawnDomMagicSparklesAt(this.softBody.x, this.softBody.y);
            this.showBubble(data.bubble_text || '🐾 Meow~ Mèo đã rõ!', 2500);
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

            if (!this.choreographyBusy && !this.magicCastState) {
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
                        const moveSpd = this.moveSpeedOverride || ((this.state.includes('jump') || this.state.includes('run') || this.state === 'carrying') ? 380 : 195);
                        const stepDist = Math.min(dist, moveSpd * dt);
                        this.softBody.x += (dx / dist) * stepDist;
                        this.softBody.y += (dy / dist) * stepDist;
                    }
                } else if (!this.choreographyBusy && !this.foodAnim && this.stateTimer <= 0) {
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

            /* QUY TẮC BONG BÓNG THOẠI: CÁCH ĐỈNH ĐẦU MÈO 14PX, KHÔNG BAO GIỜ ĐÈ LÊN THÂN MÈO */
            if (this.bubbleEl && !this.bubbleEl.classList.contains('d-none')) {
                const bw = this.bubbleEl.offsetWidth || 210;
                const bh = this.bubbleEl.offsetHeight || 32;
                const leftPos = Math.max(12, Math.min(window.innerWidth - bw - 16, cx - bw / 2));
                const headTopY = cy - 52;
                const topPos = headTopY > (bh + 18) ? (headTopY - bh - 14) : (cy + 36);
                this.bubbleEl.style.left = Math.round(leftPos) + 'px';
                this.bubbleEl.style.top = Math.round(Math.max(8, topPos)) + 'px';
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

            /* Vòng tròn ma thuật & Sóng ánh sáng khi "Hô biến" Đổi Sáng/Tối */
            if (this.magicCastState && this.magicCastState.active) {
                ctx.save();
                const rad = this.magicCastState.ringRadius || 36;
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, rad, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.beginPath();
                ctx.arc(0, 0, 38, t * 4, t * 4 + Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
            ctx.beginPath();
            ctx.ellipse(0, 24 * scY, 32 * scX, 5.0, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.rotate((this.bodyTilt * Math.PI) / 180);

            /* Vẽ Đuôi Mèo */
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

            /* Vẽ Chân Mèo */
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

            /* Vẽ Thân Mèo Lỏng (Soft-Body) */
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
            if (b.pattern === 'calico') {
                const patch1 = new Path2D();
                patch1.ellipse(-8 * dir, -6 * scY, 13, 10, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(249, 115, 22)';
                ctx.fill(patch1);
                const patch2 = new Path2D();
                patch2.ellipse(6 * dir, -9 * scY, 10, 8, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgb(41, 37, 36)';
                ctx.fill(patch2);
            } else if (b.pattern === 'cow') {
                const patchPath = new Path2D();
                patchPath.ellipse(-8 * dir, -6 * scY, 12, 9.5, 0, 0, Math.PI * 2);
                ctx.fillStyle = b.pCol;
                ctx.fill(patchPath);
            } else if (b.pattern === 'stripes') {
                ctx.fillStyle = b.pCol;
                [-10, 0, 10].forEach(off => {
                    ctx.fillRect(off - 2.5, -22 * scY, 5, 12);
                });
            }
            ctx.restore();

            ctx.lineWidth = 4.2;
            ctx.strokeStyle = b.stroke;
            ctx.stroke(bodyPath);
            ctx.restore();

            /* HỘP HÀNG 3D (📦) ĐỘI TRÊN LƯNG KHI SĂN DEAL VỀ GIỎ */
            if (this.carryingLabel) {
                ctx.save();
                ctx.translate(-4 * dir, -28 * scY);
                ctx.fillStyle = '#f59e0b';
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.roundRect(-22, -16, 44, 28, 5);
                ctx.fill();
                ctx.stroke();

                /* Dây ruy-băng đỏ chữ thập trên hộp quà */
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(-3, -16, 6, 28);
                ctx.fillRect(-22, -4, 44, 5);

                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 8.5px Segoe UI, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('📦 DEAL', 0, 20);
                ctx.restore();
            }

            /* Vẽ Đầu Mèo */
            const bobY = (this.targetX !== null || st.includes('dance')) ? -Math.abs(Math.sin(t * 13)) * 3.5 : 0;
            const hx = (st.includes('loaf') || st.includes('sleep') ? 15 : 21) * dir * scX;
            const hy = -(st.includes('sploot') ? 10 : 17) * scY + bobY;

            ctx.save();
            ctx.translate(hx, hy);
            if (st === 'head_tilt' || st.includes('dance')) {
                ctx.rotate(Math.sin(t * 6) * 0.14);
            }

            /* Tai Mèo */
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

            /* Khuôn mặt */
            const isChewing = Boolean(this.foodAnim || st.includes('eat') || st.includes('boba'));
            const chewPuff = isChewing ? Math.abs(Math.sin(t * 16)) * 3.8 : 0;
            const headPath = new Path2D();
            headPath.ellipse(0, 0, 23 + chewPuff, 19, 0, 0, Math.PI * 2);
            ctx.fillStyle = b.body;
            ctx.fill(headPath);
            ctx.lineWidth = 4.0;
            ctx.strokeStyle = b.stroke;
            ctx.stroke(headPath);

            /* Phụ kiện đặc trưng theo từng giống Mèo */
            if (b.accessory === 'crown') {
                ctx.save();
                ctx.translate(0, -20);
                ctx.fillStyle = '#facc15';
                ctx.strokeStyle = '#854d0e';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(-8, 2);
                ctx.lineTo(-9, -7);
                ctx.lineTo(-3, -2);
                ctx.lineTo(0, -9);
                ctx.lineTo(3, -2);
                ctx.lineTo(9, -7);
                ctx.lineTo(8, 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (b.accessory === 'bowtie') {
                ctx.save();
                ctx.translate(0, 17);
                ctx.fillStyle = '#ef4444';
                ctx.strokeStyle = '#7f1d1d';
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-8, -5);
                ctx.lineTo(-8, 5);
                ctx.closePath();
                ctx.moveTo(0, 0);
                ctx.lineTo(8, -5);
                ctx.lineTo(8, 5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (b.accessory === 'bell') {
                ctx.save();
                ctx.translate(0, 17);
                ctx.fillStyle = '#facc15';
                ctx.strokeStyle = '#92400e';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (b.accessory === 'cyber_collar') {
                ctx.save();
                ctx.translate(0, 16);
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.roundRect(-10, -2, 20, 4.5, 2);
                ctx.fill();
                ctx.restore();
            }

            /* Ria Mèo */
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

            /* Mắt Mèo */
            if (st.includes('sleep') || this.expr === 'content_purr') {
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

            /* Má hồng (Đỏ hồng rực rỡ hơn khi uống trà sữa / ăn cá) */
            const blushAlpha = (this.foodAnim && this.foodAnim.blushBoost) ? 0.96 : 0.82;
            const blushRx = (this.foodAnim && this.foodAnim.blushBoost) ? 6.0 : 4.4;
            ctx.fillStyle = `rgba(244, 114, 182, ${blushAlpha})`;
            ctx.beginPath();
            ctx.ellipse(-14, 5, blushRx, 3.3, 0, 0, Math.PI * 2);
            ctx.ellipse(14, 5, blushRx, 3.3, 0, 0, Math.PI * 2);
            ctx.fill();

            /* Mũi & Miệng */
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
            ctx.quadraticCurveTo(-2.4, 11.8 + chewPuff * 0.6, 0, 8.0);
            ctx.quadraticCurveTo(2.4, 11.8 + chewPuff * 0.6, 4.8, 8.0);
            ctx.stroke();

            /* ĐŨA PHÉP MA THUẬT KHI HÔ BIẾN ĐỔI SÁNG/TỐI */
            if (this.magicCastState && this.magicCastState.active) {
                ctx.save();
                ctx.translate(22 * dir, -4);
                ctx.rotate(Math.sin(t * 18) * 0.35);
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3.2;
                ctx.beginPath();
                ctx.moveTo(0, 10);
                ctx.lineTo(14 * dir, -10);
                ctx.stroke();
                ctx.font = '14px "Segoe UI Emoji", Arial';
                ctx.fillText('⭐', 10 * dir, -10);
                ctx.restore();
            }

            /* VẼ CON CÁ CHI TIẾT & XƯƠNG CÁ 🦴 KHI BẤM "🐟 ĂN CÁ" */
            if ((this.foodAnim && this.foodAnim.type === 'fish') || st.includes('eat')) {
                const fStage = this.foodAnim ? this.foodAnim.stage : 0;
                const fScale = this.foodAnim ? (this.foodAnim.scale || 1.0) : 0.9;
                ctx.save();
                ctx.translate(16 * dir, 13);
                ctx.scale(dir * fScale, fScale);

                if (fStage >= 3) {
                    /* Vẽ bộ xương cá 🦴 trắng tinh sau khi nhai hết 3 miếng */
                    ctx.strokeStyle = '#f8fafc';
                    ctx.lineWidth = 2.4;
                    ctx.beginPath();
                    ctx.moveTo(-12, 0);
                    ctx.lineTo(12, 0);
                    [-6, 0, 6].forEach(rx => {
                        ctx.moveTo(rx, -6);
                        ctx.lineTo(rx, 6);
                    });
                    ctx.moveTo(12, 0);
                    ctx.lineTo(17, -5);
                    ctx.moveTo(12, 0);
                    ctx.lineTo(17, 5);
                    ctx.stroke();
                } else {
                    /* Vẽ con cá nướng vàng cam / xanh bạc có đầu, vây lưng, đuôi chẻ */
                    ctx.fillStyle = '#fb923c';
                    ctx.strokeStyle = '#7c2d12';
                    ctx.lineWidth = 1.8;

                    /* Đuôi cá */
                    ctx.beginPath();
                    ctx.moveTo(10, 0);
                    ctx.lineTo(19, -7);
                    ctx.lineTo(16, 0);
                    ctx.lineTo(19, 7);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    /* Vây lưng */
                    ctx.beginPath();
                    ctx.moveTo(-3, -6);
                    ctx.quadraticCurveTo(2, -12, 6, -5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    /* Thân cá */
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 13, 6.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    /* Mắt cá & Vạch nướng */
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath();
                    ctx.arc(-7, -1.5, 1.6, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = '#9a3412';
                    ctx.lineWidth = 1.3;
                    [-1, 4].forEach(gx => {
                        ctx.beginPath();
                        ctx.moveTo(gx, -4);
                        ctx.lineTo(gx - 2, 4);
                        ctx.stroke();
                    });
                }
                ctx.restore();
            }

            /* VẼ LY TRÀ SỮA TRÂN CHÂU BOBA ĐẦY ĐỦ NẮP VÒM, ỐNG HÚT & TRÂN CHÂU CẠN DẦN */
            if ((this.foodAnim && this.foodAnim.type === 'boba') || st === 'drink_boba_tea') {
                const lvl = (this.foodAnim && this.foodAnim.level !== undefined) ? this.foodAnim.level : 0.78;
                const pearlsCnt = (this.foodAnim && this.foodAnim.pearls !== undefined) ? this.foodAnim.pearls : 5;
                ctx.save();
                ctx.translate(15 * dir, 14);

                /* Ống hút cắm nghiêng vào miệng Mèo */
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 3.2;
                ctx.beginPath();
                ctx.moveTo(0, 6);
                ctx.lineTo(-10 * dir, -7);
                ctx.stroke();

                /* Nắp vòm trong suốt */
                ctx.fillStyle = 'rgba(248, 250, 252, 0.55)';
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(0, -1, 8.5, Math.PI, 0, false);
                ctx.stroke();

                /* Thân ly nhựa trong */
                ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.beginPath();
                ctx.roundRect(-8.5, -1, 17, 20, 3.5);
                ctx.fill();
                ctx.stroke();

                /* Mực nước trà sữa kem nâu vơi dần khi Mèo hút */
                const maxLiquidH = 16;
                const curLiquidH = Math.max(2, maxLiquidH * lvl);
                const liquidTopY = 18 - curLiquidH;
                ctx.fillStyle = '#fde68a';
                ctx.beginPath();
                ctx.roundRect(-7.2, liquidTopY, 14.4, curLiquidH, 2.5);
                ctx.fill();

                /* Hạt trân châu đen dưới đáy ly */
                const pearlCoords = [
                    { x: -4.2, y: 15.5 },
                    { x: 0, y: 15.8 },
                    { x: 4.2, y: 15.5 },
                    { x: -2.2, y: 12.6 },
                    { x: 2.2, y: 12.6 },
                    { x: 0, y: 10.2 }
                ];
                ctx.fillStyle = '#0f172a';
                for (let pi = 0; pi < Math.min(pearlsCnt, pearlCoords.length); pi++) {
                    const pc = pearlCoords[pi];
                    ctx.beginPath();
                    ctx.arc(pc.x, pc.y, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }

            ctx.restore();
            ctx.restore();

            /* Vẽ hạt hiệu ứng bay lên */
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

    window.switchCatBreed = function () {
        if (window.__nividaCatInstance && typeof window.__nividaCatInstance.switchCatBreed === 'function') {
            return window.__nividaCatInstance.switchCatBreed();
        }
    };

    window.cycleCatBreed = window.switchCatBreed;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.__nividaCatInstance = new WebLiquidCatAssistant();
        });
    } else {
        window.__nividaCatInstance = new WebLiquidCatAssistant();
    }
})();