/* Rocket Run - an original game. An affectionate tribute to classic 1983 home-computer shooters. */
(function () {
  'use strict';
  const { PAL, S, F, sprite, text, textW, hash } = window.RR;
  const W = 256, TOP = 18, STEP = 1000 / 60, PH = 24;
  // H is 192 (classic 4:3) in landscape; in portrait the playfield grows taller to fill the phone (up to 400)
  let H = 192, GROUND = 184, VK = 1;
  const params = new URLSearchParams(location.search);
  const TEST = params.get('test') === '1';

  // ---------- rng ----------
  let seed = TEST ? 12345 : (Date.now() >>> 0);
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];

  // ---------- world ----------
  // classic ledges are placed for a 192-high screen and spread proportionally on taller ones;
  // two extra ledges appear on tall portrait screens so the lower half is not empty
  const BASE_LEDGES = [{ x: 32, y: 80, w: 48 }, { x: 120, y: 104, w: 32 }, { x: 192, y: 56, w: 48 }];
  const EXTRA_LEDGES = [{ x: 64, f: 0.76, w: 40 }, { x: 200, f: 0.62, w: 40 }];
  let LEDGES = [];
  const vscale = () => (GROUND - TOP) / (184 - TOP);
  function buildLedges() {
    const k = vscale();
    LEDGES = BASE_LEDGES.map(L => ({ x: L.x, y: Math.round(TOP + (L.y - TOP) * k), w: L.w, h: 6 }));
    if (H >= 288) for (const L of EXTRA_LEDGES) LEDGES.push({ x: L.x, y: Math.round(TOP + (GROUND - TOP) * L.f), w: L.w, h: 6 });
  }
  const ROCKET_X = 168, START_X = 92;
  // eight alien waves, one colour each; cycles every 8 levels. fr = frames, sh = ticks per frame
  const ALIEN_TYPES = [
    { spr: 'meteor', w: 16, h: 8, pts: 25, col: 'R', sh: 3, flip: true },
    { spr: 'ball', w: 12, h: 12, pts: 40, col: 'C', sh: 5 },
    { spr: 'blob', w: 14, h: 14, pts: 50, col: 'G', sh: 6 },
    { spr: 'saucer', w: 16, h: 10, pts: 80, col: 'M', sh: 4 },
    { spr: 'jelly', w: 14, h: 14, pts: 60, col: 'Y', sh: 7 },
    { spr: 'cross', w: 14, h: 14, pts: 70, col: 'W', sh: 3 },
    { spr: 'bug', w: 14, h: 12, pts: 90, col: 'G', sh: 4 },
    { spr: 'fighter', w: 16, h: 10, pts: 100, col: 'C', sh: 3, flip: true }
  ];
  const GEMS = [{ spr: 'gem', w: 10, h: 7, pts: 250, col: 'C' }, { spr: 'bar', w: 12, h: 5, pts: 500, col: 'Y' }, { spr: 'orb', w: 9, h: 9, pts: 750, col: 'M' }];
  const ROCKET_COLS = ['W', 'C', 'Y', 'G', 'R'];
  const ROCKET_SHAPES = ['rocketA', 'rocketB', 'rocketC', 'rocketD'];

  // three star layers: faint far dots, twinkling mid stars, a few bright cross-shaped near stars
  // (own generator so resizing the playfield never disturbs the game's random sequence)
  let stars = [];
  function makeStars() {
    let ss = 777; const sr = () => { ss = (ss * 1103515245 + 12345) & 0x7fffffff; return ss / 0x80000000; };
    const si = (a, b) => a + Math.floor(sr() * (b - a + 1)), sp = a => a[Math.floor(sr() * a.length)];
    const n = Math.round(70 * H / 192), n0 = Math.round(n * 44 / 70), n1 = Math.round(n * 64 / 70);
    stars = [];
    for (let i = 0; i < n; i++) {
      const layer = i < n0 ? 0 : i < n1 ? 1 : 2;
      stars.push({ x: si(0, 255), y: si(TOP + 2, GROUND - 6), p: si(0, 400), s: [si(150, 400), si(70, 180), si(90, 200)][layer], layer, col: sp(layer ? ['W', 'C', 'Y', 'W'] : ['b', 'b', 'w', 'c']) });
    }
  }
  buildLedges(); makeStars();

  let hi = 0;
  try { hi = parseInt(localStorage.getItem('rocketrun.hi') || '0', 10) || 0; } catch (e) { }
  let muted = false;
  try { muted = localStorage.getItem('rocketrun.mute') === '1'; } catch (e) { }

  const G = { mode: 'title', t: 0, modeT: 0, paused: false, frozen: false, god: false };

  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function overlapWrap(a, b) {
    if (overlap(a, b)) return true;
    const s = { x: a.x + W, y: a.y, w: a.w, h: a.h };
    if (overlap(s, b)) return true;
    s.x = a.x - W; return overlap(s, b);
  }
  function wrapX(o) { let c = o.x + o.w / 2; c = ((c % W) + W) % W; o.x = c - o.w / 2; }
  const pbox = p => ({ x: p.x + 3, y: p.y + 1, w: 10, h: PH - 1 });
  const hitLedge = r => LEDGES.some(l => overlap(r, l));

  // ---------- game setup ----------
  function newGame() {
    Object.assign(G, { mode: 'play', modeT: 0, score: 0, lives: 4, level: 1, nextLife: 10000, rocketNo: 0,
      beams: [], aliens: [], fx: [], smoke: [], items: [], gem: null, gemTimer: ri(500, 900), spawnT: 60, fuelT: 0,
      sub: 'play', subT: 0, banner: 90 });
    setupRocket(true);
    spawnPlayer();
  }
  function setupRocket(fresh) {
    const n = G.rocketNo;
    G.rocket = { x: ROCKET_X, yOff: 0, vy: 0, parts: fresh ? 1 : 3, fuel: 0, shape: ROCKET_SHAPES[n % ROCKET_SHAPES.length], col: ROCKET_COLS[n % ROCKET_COLS.length] };
    G.items = G.items.filter(i => i.kind === 'gem');
    if (fresh) {
      G.items.push({ kind: 'part', idx: 1, x: 128, y: LEDGES[1].y - 16, w: 16, h: 16, vy: 0, st: 'rest' });
      G.items.push({ kind: 'part', idx: 2, x: 48, y: LEDGES[0].y - 16, w: 16, h: 16, vy: 0, st: 'rest' });
    }
    G.fuelT = 90;
  }
  function spawnPlayer() {
    G.p = { x: START_X, y: GROUND - PH, w: 16, h: PH, vx: 0, vy: 0, face: 1, ground: true, carry: null, cool: 0, recoil: 0, inv: 100, anim: 0, alive: true, thrusting: false };
  }
  const rocketTopY = () => GROUND - 16 * G.rocket.parts + G.rocket.yOff;
  const rocketRect = () => ({ x: G.rocket.x + 2, y: rocketTopY(), w: 12, h: 16 * G.rocket.parts });

  // ---------- input ----------
  const keys = { left: false, right: false, thrust: false, fire: false };
  const touch = { left: false, right: false, thrust: false, fire: false };
  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', KeyZ: 'left', ArrowRight: 'right', KeyD: 'right', KeyX: 'right',
    ArrowUp: 'thrust', KeyW: 'thrust', ShiftLeft: 'thrust', ShiftRight: 'thrust', Space: 'fire', Enter: 'fire' };
  const input = k => keys[k] || touch[k];

  addEventListener('keydown', e => {
    unlockAudio();
    const k = KEYMAP[e.code];
    if (k || e.code === 'KeyP' || e.code === 'KeyM') e.preventDefault();
    if (e.code === 'KeyM') { toggleMute(); return; }
    if (e.code === 'KeyP') { if (G.mode === 'play') togglePause(); return; }
    if (k) keys[k] = true;
    if (e.repeat) return;
    anyPress();
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) { keys[k] = false; e.preventDefault(); } });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  const ptrs = new Map();
  function btnAt(x, y) { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('[data-k]'); return b ? b.dataset.k : null; }
  function syncTouch() {
    for (const k in touch) touch[k] = false;
    for (const k of ptrs.values()) if (k) touch[k] = true;
    for (const el of document.querySelectorAll('[data-k]')) el.classList.toggle('on', touch[el.dataset.k]);
  }
  addEventListener('pointerdown', e => {
    unlockAudio();
    const sys = e.target.closest && e.target.closest('.sys');
    if (sys) { e.preventDefault(); if (sys.id === 'bMute') toggleMute(); else if (G.mode === 'play') togglePause(); return; }
    ptrs.set(e.pointerId, btnAt(e.clientX, e.clientY));
    syncTouch();
    anyPress();
    e.preventDefault();
  }, { passive: false });
  addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, btnAt(e.clientX, e.clientY)); syncTouch(); });
  const ptrEnd = e => { if (ptrs.delete(e.pointerId)) syncTouch(); };
  addEventListener('pointerup', ptrEnd); addEventListener('pointercancel', ptrEnd);
  addEventListener('touchstart', e => { if (e.touches.length > 1 || e.target.closest('.btn,.sys,#view')) e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  addEventListener('touchend', () => unlockAudio());
  addEventListener('pointerup', () => unlockAudio());
  addEventListener('gesturestart', e => e.preventDefault());
  addEventListener('dblclick', e => e.preventDefault());
  addEventListener('contextmenu', e => e.preventDefault());

  function anyPress() {
    if (G.mode === 'title' && G.modeT > 20) { newGame(); sfx.start(); }
    else if (G.mode === 'over' && G.modeT > 90) toTitle();
    else if (G.mode === 'play' && G.paused) togglePause();
  }
  function saveHi() { try { if (hi > (parseInt(localStorage.getItem('rocketrun.hi') || '0', 10) || 0)) localStorage.setItem('rocketrun.hi', String(hi)); } catch (e) { } }
  function toTitle() { G.mode = 'title'; G.modeT = 0; }
  function togglePause() { G.paused = !G.paused; document.getElementById('bPause').classList.toggle('on', G.paused); }
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play' && !G.paused) togglePause(); });

  // ---------- audio (synthesised) ----------
  let AC = null, master = null, noiseBuf = null;
  function unlockAudio() {
    try {
      if (!AC) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        AC = new C();
        master = AC.createGain(); master.gain.value = muted ? 0 : 0.22; master.connect(AC.destination);
        const b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource(); s.buffer = b; s.connect(master); s.start(0);
        noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
        const d = noiseBuf.getChannelData(0); let v = 0;
        for (let i = 0; i < d.length; i++) { if (i % 3 === 0) v = Math.random() < 0.5 ? -1 : 1; d[i] = v; }
      }
      if (AC.state === 'suspended') AC.resume();
    } catch (e) { }
  }
  function tone(f0, f1, dur, vol, delay, type) {
    if (!AC || muted) return;
    const t = AC.currentTime + (delay || 0);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, f0, f1, delay, attack) {
    if (!AC || muted) return;
    const t = AC.currentTime + (delay || 0);
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); }
    else g.gain.setValueAtTime(vol, t);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  const sfx = {
    laser: () => tone(2200, 300, 0.09, 0.10),
    boom: () => { noise(0.35, 0.5, 5000, 80); tone(160, 40, 0.2, 0.08); },
    pickup: () => { tone(660, 660, 0.04, 0.12); tone(1320, 1320, 0.05, 0.12, 0.045); },
    attach: () => { tone(330, 330, 0.06, 0.14); tone(495, 495, 0.06, 0.14, 0.07); tone(660, 660, 0.1, 0.14, 0.14); },
    refuel: () => { for (let i = 0; i < 4; i++) tone(1200 + i * 200, 1200 + i * 200, 0.025, 0.12, i * 0.05); },
    gem: () => { tone(1000, 2000, 0.08, 0.12); tone(1500, 3000, 0.08, 0.12, 0.09); },
    launch: () => { noise(2.6, 0.45, 200, 3500, 0, 0.4); tone(55, 600, 2.6, 0.07); },
    land: () => { noise(1.8, 0.35, 2500, 150, 0, 0.1); },
    death: () => { tone(900, 40, 0.8, 0.16); noise(0.6, 0.3, 3000, 100, 0.05); },
    life: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.08, 0.13, i * 0.085)); },
    start: () => { [262, 330, 392, 523].forEach((f, i) => tone(f, f, 0.07, 0.12, i * 0.07)); },
    over: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f, 0.16, 0.12, i * 0.17)); }
  };
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('rocketrun.mute', muted ? '1' : '0'); } catch (e) { }
    if (master) master.gain.value = muted ? 0 : 0.22;
    document.getElementById('bMute').classList.toggle('muted', muted);
  }

  // ---------- update ----------
  function addScore(n) {
    G.score += n;
    if (G.score >= G.nextLife) { G.nextLife += 10000; G.lives++; sfx.life(); G.lifeFlash = 90; }
  }
  // kind: 'boom' (alien), 'big' (player / launch), 'puff' (meteor on a ledge); delay in ticks
  const FX_LIFE = { boom: 24, big: 48, puff: 16 };
  function explode(x, y, col, big, delay) { G.fx.push({ x, y, t: -(delay || 0), col: col || 'Y', kind: big === true ? 'big' : big || 'boom' }); }

  function update() {
    G.t++; G.modeT++;
    if (G.mode === 'over' && G.modeT > 720) toTitle();
    if (G.mode !== 'play') return;
    if (G.banner > 0) G.banner--;
    if (G.lifeFlash > 0) G.lifeFlash--;
    for (const f of G.fx) f.t++;
    G.fx = G.fx.filter(f => f.t < FX_LIFE[f.kind]);
    for (const s of G.smoke) { s.t++; s.x += s.vx; s.y += s.vy; s.vx *= 0.97; }
    G.smoke = G.smoke.filter(s => s.t < 60);
    if (G.sub === 'play') updatePlay();
    else if (G.sub === 'dying') {
      updateAliens(); updateItems();
      if (++G.subT > 100) {
        G.lives--;
        if (G.lives <= 0) {
          G.mode = 'over'; G.modeT = 0; sfx.over();
          hi = Math.max(hi, G.score); saveHi();
        } else { G.aliens = []; G.spawnT = 90; G.beams = []; spawnPlayer(); G.sub = 'play'; }
      }
    } else if (G.sub === 'launch') {
      G.subT++;
      if (G.subT > 40) { G.rocket.vy = Math.max(G.rocket.vy - 0.04, -3.5); G.rocket.yOff += G.rocket.vy; }
      if (G.subT > 24 && G.subT < 150 && G.subT % 3 === 0) puffSmoke();
      if (G.rocket.yOff < -(GROUND + 76)) nextLevel();
    } else if (G.sub === 'land') {
      G.subT++;
      const r = G.rocket;
      r.yOff = Math.min(0, r.yOff + Math.max(0.5, -r.yOff / 40));
      if (r.yOff > -40 && G.subT % 3 === 0) puffSmoke();
      if (r.yOff >= -0.01) { r.yOff = 0; G.sub = 'play'; spawnPlayer(); G.banner = 90; G.fuelT = 60; G.spawnT = 60; }
    }
    if (G.score > hi) hi = G.score;
  }

  function puffSmoke() {
    const cx = G.rocket.x + 8, side = rnd() < 0.5 ? -1 : 1;
    G.smoke.push({ x: cx + side * ri(2, 6), y: GROUND - ri(4, 9), vx: side * (0.5 + rnd() * 0.9), vy: -rnd() * 0.15, t: 0 });
  }
  function nextLevel() {
    G.level++;
    G.beams = []; G.aliens = [];
    G.items = G.items.filter(i => i.kind === 'gem');
    if ((G.level - 1) % 4 === 0) { G.rocketNo++; setupRocket(true); G.sub = 'play'; spawnPlayer(); G.banner = 90; G.spawnT = 60; }
    else { G.rocket.yOff = -(GROUND + 16); G.rocket.vy = 0; G.rocket.fuel = 0; G.sub = 'land'; G.subT = 0; sfx.land(); }
  }

  function updatePlay() {
    const p = G.p;
    // player movement
    const l = input('left'), r = input('right'), th = input('thrust');
    if (l && !r) { p.vx = Math.max(p.vx - 0.14, -1.3); p.face = -1; }
    else if (r && !l) { p.vx = Math.min(p.vx + 0.14, 1.3); p.face = 1; }
    else { const fr = p.ground ? 0.2 : 0.035; p.vx = Math.abs(p.vx) <= fr ? 0 : p.vx - Math.sign(p.vx) * fr; }
    p.thrusting = th;
    if (th) p.vy = Math.max(p.vy - 0.13 * VK, -1.4 * VK);
    else p.vy = Math.min(p.vy + 0.07 * VK, 1.7 * VK);
    p.x += p.vx;
    let b = pbox(p);
    for (const L of LEDGES) if (overlap(b, L)) { if (p.vx > 0) p.x = L.x - 13; else if (p.vx < 0) p.x = L.x + L.w - 3; p.vx = 0; b = pbox(p); }
    wrapX(p);
    p.y += p.vy; p.ground = false;
    b = pbox(p);
    for (const L of LEDGES) if (overlap(b, L)) {
      if (p.vy > 0) { p.y = L.y - PH; p.ground = true; } else { p.y = L.y + L.h - 1; }
      p.vy = 0; b = pbox(p);
    }
    if (p.y + PH >= GROUND) { p.y = GROUND - PH; p.vy = 0; p.ground = true; }
    if (p.y < TOP) { p.y = TOP; p.vy = Math.max(p.vy, 0); }
    if (p.ground && p.vx !== 0) p.anim += Math.abs(p.vx) * 0.12; else if (p.ground) p.anim = 0;
    if (p.inv > 0) p.inv--;

    // laser
    if (p.cool > 0) p.cool--;
    if (p.recoil > 0) p.recoil--;
    if (input('fire') && p.cool === 0) {
      p.cool = 14; p.recoil = 6;
      G.beams.push({ x0: p.face > 0 ? p.x + 16 : p.x - 1, y: p.y + 12, dir: p.face, head: 0, tail: 0, t: 0, ph: ri(0, 7) });
      sfx.laser();
    }
    for (const bm of G.beams) {
      bm.t++; bm.head = Math.min(bm.head + (bm.t < 4 ? 6 : 10), 160);
      if (bm.t > 9) bm.tail += 10;
      const a = bm.x0 + bm.dir * bm.tail, c = bm.x0 + bm.dir * bm.head;
      const seg = { x: Math.min(a, c), y: bm.y - 1, w: Math.abs(c - a) + 1, h: 3 };
      for (const al of G.aliens) {
        if (!al.dead && overlapWrap(seg, al)) { al.dead = true; bm.tail = bm.head; addScore(al.pts); explode(al.x + al.w / 2, al.y + al.h / 2, al.col); sfx.boom(); break; }
      }
    }
    G.beams = G.beams.filter(bm => bm.tail < bm.head);

    updateItems();
    updateRocketLogic();
    updateAliens();
    // alien spawning
    const cyc = Math.floor((G.level - 1) / 4);
    const extra = Math.round((vscale() - 1) * 1.6);   // a taller screen holds a couple more aliens
    const maxA = Math.min(4 + cyc + (G.level > 1 ? 1 : 0), 8) + extra;
    if (--G.spawnT <= 0 && G.aliens.length < maxA) { spawnAlien(); G.spawnT = ri(30, 80); }
    // gems
    if (!G.items.some(i => i.kind === 'gem') && --G.gemTimer <= 0) {
      const g = pick(GEMS);
      G.items.push({ kind: 'gem', g, x: ri(4, 240), y: TOP, w: g.w, h: g.h, vy: 0, st: 'fall', life: 600 });
      G.gemTimer = ri(900, 1500);
    }
    // alien collision with player
    if (p.inv <= 0 && !G.god) {
      const pb = pbox(p);
      for (const al of G.aliens) if (!al.dead && overlapWrap({ x: al.x + 1, y: al.y + 1, w: al.w - 2, h: al.h - 2 }, pb)) { killPlayer(); al.dead = true; explode(al.x + al.w / 2, al.y + al.h / 2, al.col); break; }
    }
    G.aliens = G.aliens.filter(a => !a.dead);
  }

  function killPlayer() {
    const p = G.p;
    explode(p.x + 8, p.y + 12, 'W', true); explode(p.x + 4, p.y + 4, 'C', 'boom', 6); explode(p.x + 12, p.y + 18, 'Y', 'boom', 12); sfx.death();
    if (p.carry) { p.carry.st = 'fall'; p.carry.vy = 0; p.carry = null; }
    p.alive = false; G.sub = 'dying'; G.subT = 0; G.beams = [];
  }

  function nextPartIdx() { return G.rocket.parts < 3 ? G.rocket.parts : -1; }

  function updateItems() {
    const p = G.p, rk = G.rocket;
    for (const it of G.items) {
      if (it.st === 'carried') {
        it.x = p.x + 8 - it.w / 2; it.y = p.y + PH - it.h;
        // over the rocket? let it go
        if (Math.abs((p.x + 8) - (rk.x + 8)) < 4 && G.sub === 'play') {
          it.st = 'drop'; it.x = rk.x + 8 - it.w / 2; it.vy = 0; p.carry = null;
          it.y = Math.min(it.y, rocketTopY() - it.h);
        }
        continue;
      }
      if (it.st === 'fall' || it.st === 'drop') {
        it.vy = Math.min(it.vy + 0.06, it.st === 'drop' ? 1.6 : 1.1 * VK);
        const ny = it.y + it.vy;
        if (it.st === 'drop') {
          if (it.kind === 'part') {
            const ty = rocketTopY() - 16;
            if (ny >= ty) { it.dead = true; rk.parts++; addScore(100); sfx.attach(); if (rk.parts === 3) G.fuelT = 90; continue; }
          } else if (ny + it.h >= rocketTopY() + 6) {
            it.dead = true; rk.fuel++; addScore(100); sfx.refuel(); if (rk.fuel < 6) G.fuelT = ri(60, 140); continue;
          }
          it.y = ny; continue;
        }
        // land on ledge / ground
        let land = null;
        for (const L of LEDGES) if (it.x + it.w > L.x + 1 && it.x < L.x + L.w - 1 && it.y + it.h <= L.y + 0.01 && ny + it.h >= L.y) land = L.y;
        if (ny + it.h >= GROUND) land = land === null ? GROUND : Math.min(land, GROUND);
        if (land !== null) { it.y = land - it.h; it.vy = 0; it.st = 'rest'; } else it.y = ny;
      }
      if (it.kind === 'gem' && --it.life <= 0) it.dead = true;
      // pick up
      if (G.sub === 'play' && p.alive && (it.st === 'rest' || it.st === 'fall') && overlapWrap(it, pbox(p))) {
        if (it.kind === 'gem') { it.dead = true; addScore(it.g.pts); sfx.gem(); explode(it.x + it.w / 2, it.y + it.h / 2, 'W'); }
        else if (!p.carry && (it.kind === 'fuel' ? rk.parts === 3 : it.idx === nextPartIdx())) { it.st = 'carried'; p.carry = it; sfx.pickup(); }
      }
    }
    G.items = G.items.filter(i => !i.dead);
  }

  function updateRocketLogic() {
    const rk = G.rocket, p = G.p;
    if (rk.parts === 3 && rk.fuel < 6 && !G.items.some(i => i.kind === 'fuel')) {
      if (--G.fuelT <= 0) {
        let x; do { x = ri(4, 236); } while (Math.abs(x - rk.x) < 20);
        G.items.push({ kind: 'fuel', x, y: TOP, w: 14, h: 14, vy: 0, st: 'fall' });
      }
    }
    if (rk.fuel >= 6 && !p.carry && overlapWrap(pbox(p), rocketRect())) {
      G.sub = 'launch'; G.subT = 0; rk.vy = 0; G.beams = [];
      G.aliens.forEach((a, i) => explode(a.x + a.w / 2, a.y + a.h / 2, a.col, 'boom', i * 4));
      G.aliens = []; p.alive = false; sfx.launch();
    }
  }

  function spawnAlien() {
    const typ = (G.level - 1) % ALIEN_TYPES.length, T = ALIEN_TYPES[typ];
    const sp = Math.min(1 + 0.22 * Math.floor((G.level - 1) / 4), 2);
    const p = G.p;
    let x, y, side, tries = 0;
    do {
      side = rnd() < 0.5 ? -1 : 1;
      x = side < 0 ? -T.w / 2 : W - T.w / 2; y = ri(TOP + 4, GROUND - 20);
      tries++;
    } while (tries < 10 && (Math.abs(y - p.y) < 34 && Math.min(Math.abs(x - p.x), W - Math.abs(x - p.x)) < 70 || LEDGES.some(L => overlap({ x, y, w: T.w, h: T.h }, L))));
    const dir = -side;
    const a = { typ, spr: T.spr, w: T.w, h: T.h, pts: T.pts, x, y, col: T.col, sp, t: ri(0, 50), vx: 0, vy: 0, squash: 0, dive: 0 };
    if (typ === 0) { a.vx = dir * (0.55 + rnd() * 0.45) * sp; a.vy = (0.15 + rnd() * 0.45) * sp * (rnd() < 0.3 ? -1 : 1); }
    else if (typ === 1 || typ === 5) { a.vx = dir * (0.6 + rnd() * 0.4) * sp; a.vy = (0.5 + rnd() * 0.5) * sp * (rnd() < 0.5 ? -1 : 1); }
    else if (typ === 4) { a.vx = dir * 0.35 * sp; a.vy = 0; a.by = y; }
    else if (typ === 6) { a.vx = dir * 0.75 * sp; a.vy = 0.6 * sp * (rnd() < 0.5 ? -1 : 1); }
    else if (typ === 7) { a.vx = dir * (0.9 + rnd() * 0.3) * sp; a.vy = 0; }
    else { a.vx = dir * 0.5 * sp; a.vy = 0; }
    G.aliens.push(a);
  }

  function updateAliens() {
    const p = G.p;
    for (const a of G.aliens) {
      if (a.dead) continue;
      a.t++;
      if (a.squash > 0) a.squash--;
      if (a.typ === 4) a.vy = Math.sin(a.t / 18) * 0.45 * a.sp + (p.alive ? Math.sign(p.y - a.y) * 0.08 : 0);
      else if (a.typ === 6 && a.t % 40 === 0) a.vy = -a.vy;
      else if (a.typ === 7 && p.alive) {
        const dx = ((p.x + 8 - (a.x + a.w / 2)) % W + W * 1.5) % W - W / 2;
        if (!a.dive && Math.abs(dx) < 36 && Math.sign(dx) === Math.sign(a.vx) && a.t > 30) { a.dive = 1; a.vy = Math.sign(p.y + 12 - (a.y + a.h / 2)) * 1.3 * a.sp; }
        if (a.dive) a.vy *= 0.985;
        if (a.dive && Math.abs(a.vy) < 0.2) { a.dive = 0; a.vy = 0; a.t = 0; }
      }
      if ((a.typ === 2 || a.typ === 3) && p.alive) {
        const acc = (a.typ === 2 ? 0.03 : 0.014) * a.sp, mx = (a.typ === 2 ? 0.95 : 0.6) * a.sp;
        const dx = ((p.x + 8 - (a.x + a.w / 2)) % W + W * 1.5) % W - W / 2, dy = p.y + 10 - (a.y + a.h / 2);
        a.vx = Math.max(-mx, Math.min(mx, a.vx + Math.sign(dx) * acc));
        a.vy = Math.max(-mx, Math.min(mx, a.vy + Math.sign(dy) * acc + (a.typ === 3 ? Math.sin(a.t / 12) * 0.01 : 0)));
      }
      a.x += a.vx;
      if (hitLedge(a)) {
        if (a.typ === 0) { a.dead = true; explode(a.x + a.w / 2, a.y + a.h / 2, a.col, 'puff'); continue; }
        a.x -= a.vx; a.vx = -a.vx;
      }
      wrapX(a);
      a.y += a.vy;
      if (hitLedge(a) || a.y + a.h > GROUND) {
        if (a.typ === 0) { a.dead = true; explode(a.x + a.w / 2, Math.min(a.y + a.h / 2, GROUND - 3), a.col, 'puff'); continue; }
        a.y -= a.vy;
        if (a.typ === 1 && a.vy > 0) a.squash = 6;
        a.vy = (a.typ === 1 || a.typ === 5 || a.typ === 6) ? -a.vy : a.typ === 7 ? -a.vy * 0.6 : -a.vy * 0.5;
      }
      if (a.y < TOP) { a.y = TOP; a.vy = Math.abs(a.vy); }
    }
  }

  // ---------- render ----------
  const low = document.createElement('canvas'); low.width = W; low.height = H;
  const c = low.getContext('2d');
  const screen = document.getElementById('screen'), sctx = screen.getContext('2d');
  const view = document.getElementById('view');

  function draw(img, x, y) {
    x = Math.round(x); y = Math.round(y);
    c.drawImage(img, x, y);
    if (x < 0) c.drawImage(img, x + W, y);
    if (x + img.width > W) c.drawImage(img, x - W, y);
  }
  function rect(x, y, w, h, col) { c.fillStyle = PAL[col] || col; c.fillRect(x, y, w, h); }
  const pad = (n, l) => String(n).padStart(l, '0');
  const centre = (s, y, col, sc, bold) => text(c, s, Math.round((W - textW(s, sc)) / 2), y, col, sc, bold);

  function drawStars() {
    for (const s of stars) {
      const ph = (G.t + s.p) % s.s;
      if (s.layer === 0) { if (ph > 8) rect(s.x, s.y, 1, 1, s.col); continue; }
      if (s.layer === 1) { if (ph < 5) continue; rect(s.x, s.y, 1, 1, ph < 12 ? 'W' : s.col.toLowerCase()); continue; }
      // near stars: a cross-shaped twinkle every so often
      rect(s.x, s.y, 1, 1, s.col);
      if (ph < 10) { const c2 = ph < 4 || ph > 7 ? s.col.toLowerCase() : 'W'; rect(s.x - 1, s.y, 1, 1, c2); rect(s.x + 1, s.y, 1, 1, c2); rect(s.x, s.y - 1, 1, 1, c2); rect(s.x, s.y + 1, 1, 1, c2);
        if (ph >= 4 && ph <= 7) { rect(s.x - 2, s.y, 1, 1, 'b'); rect(s.x + 2, s.y, 1, 1, 'b'); rect(s.x, s.y - 2, 1, 1, 'b'); rect(s.x, s.y + 2, 1, 1, 'b'); } }
    }
  }
  // static terrain (ledges + ground) is drawn once into its own layer
  const LEDGE_TILE = ['WGGGGGGG', 'GGgGGGGg', 'GgkgGGgk', 'gGGGgGkG', 'GkGgGgGG', 'gggggggg'];
  const GROUND_TILE = ['YYYYYYYYYYYYYYYY', 'yYyyyYyyyyYyyyYy', 'yyyYyyykyyyyYyyy', 'yYyyyyyyyYyyyyyk', 'yyykyYyyyyykyyYy', 'yYyyyyyYyyyyyyyy', 'yyyyYyyyykyYyyyy', 'kyykyyyykyyyykyy'];
  let terrain = null;
  function buildTerrain() {
    terrain = document.createElement('canvas'); terrain.width = W; terrain.height = H;
    const t = terrain.getContext('2d');
    const px = (x, y, ch) => { t.fillStyle = PAL[ch]; t.fillRect(x, y, 1, 1); };
    for (const L of LEDGES) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      let ch = LEDGE_TILE[y][(x + L.x) % 8];
      if (x === 0 || x === L.w - 1) ch = y === 0 ? 'G' : y === L.h - 1 ? 'k' : 'g';      // rounded, shaded ends
      if ((x === 0 || x === L.w - 1) && y === L.h - 1) continue;
      px(L.x + x, L.y + y, ch);
    }
    for (let y = GROUND; y < H; y++) for (let x = 0; x < W; x++) px(x, y, GROUND_TILE[y - GROUND][x % 16]);
  }
  function drawWorld() { if (!terrain) buildTerrain(); c.drawImage(terrain, 0, 0); }

  // rocket: each segment cached in its colour and in fuel magenta; fuel fills from the bottom up
  function drawRocketAt(shape, col, x, baseY, parts, fillRows, flash) {
    const rows = S[shape];
    for (let i = 0; i < parts; i++) {
      const py = Math.round(baseY - 16 * (i + 1));
      const k = Math.max(0, Math.min(16, fillRows - 16 * i));
      if (k < 16) c.drawImage(sprite(shape + i, rows[i], false, col), 0, 0, 16, 16 - k, x, py, 16, 16 - k);
      if (k > 0) c.drawImage(sprite(shape + i, rows[i], false, flash ? 'W' : 'M'), 0, 16 - k, 16, k, x, py + 16 - k, 16, k);
    }
  }
  function drawRocket(launching) {
    const rk = G.rocket, baseY = GROUND + rk.yOff;
    const ready = rk.fuel >= 6;
    if (launching) drawPlume(rk.x + 2, baseY - 2, G.sub === 'launch' ? Math.min(34, 6 + G.subT / 2) : 34);
    drawRocketAt(rk.shape, rk.col, rk.x, baseY, rk.parts, Math.round(rk.fuel / 6 * 48), ready && (G.t >> 3) % 2);
  }
  function drawPlume(x, y, len) {
    len = Math.round(len);
    if (len < 2) return;
    const img = sprite('plume' + (G.t >> 1) % 4, S.plume[(G.t >> 1) % 4]);
    c.drawImage(img, 0, 0, 14, len, x - 1, y, 14, len);
  }
  function drawSmoke() {
    for (const s of G.smoke) {
      const f = Math.min(4, s.t / 12 | 0);
      draw(sprite('smoke' + f, S.smoke[f]), s.x - 7, s.y - 6);
    }
  }
  // astronaut: 4-frame walk, tucked flying pose with jet flame, gun recoil, flashing when invulnerable
  function manFrame(p) {
    if (!p.ground) return 'fly';
    if (p.vx !== 0) return 'walk' + (Math.floor(p.anim) % 4);
    return 'stand';
  }
  function drawMan(x, y, face, pose, fire, thrust, tint, t) {
    const key = (fire ? 'manf_' : 'man_') + pose, flip = face < 0;
    x = Math.round(x); y = Math.round(y);
    if (thrust) {
      const f = (t >> 1) % 3;
      draw(sprite('flame' + f, S.flame[f], flip, tint, !!tint), flip ? x + 11 : x + 1, y + 15);
    }
    draw(sprite(key, S[key], flip, tint, !!tint), x, y);
  }
  function drawPlayer() {
    const p = G.p;
    if (!p.alive) return;
    if (p.inv > 0 && (p.inv >> 2) % 3 === 0) return;
    const tint = p.inv > 0 ? ['C', 'M', 'Y', 'G'][(p.inv >> 2) % 4] : null;
    drawMan(p.x, p.y, p.face, manFrame(p), p.recoil > 2, p.thrusting && !p.ground, tint, G.t);
    if (p.recoil > 3) {
      const m = S.muzzle[p.recoil & 1];
      draw(sprite('muzzle' + (p.recoil & 1), m), p.face > 0 ? p.x + 15 : p.x - 2, p.y + 11);
    }
  }
  // laser: grows from the gun, bright segments cycle along it, fades from the tail
  const BEAM_COLS = ['W', 'Y', 'C', 'G', 'M', 'R', 'C', 'Y'];
  function drawBeams() {
    for (const bm of G.beams) {
      for (let d = bm.tail; d < bm.head; d++) {
        if (d > bm.head - 36 && ((d * 7 + bm.t * 3) % 11) < 2) continue; // ragged leading edge
        let x = Math.round(bm.x0 + bm.dir * d); x = ((x % W) + W) % W;
        const fromTail = bm.tail > 0 ? d - bm.tail : 99;
        if (fromTail < 12) { if (fromTail > 4 && (d & 1)) rect(x, bm.y, 1, 1, 'r'); else if (fromTail > 8) rect(x, bm.y, 1, 1, 'R'); continue; }
        rect(x, bm.y, 1, 1, d > bm.head - 6 ? 'W' : BEAM_COLS[((d / 6 | 0) + bm.ph + bm.t) % 8]);
      }
      if (bm.head < 160) { let hx = Math.round(bm.x0 + bm.dir * bm.head); hx = ((hx % W) + W) % W; rect(hx, bm.y - 1, 1, 3, 'W'); }
    }
  }
  function drawFx() {
    for (const f of G.fx) {
      if (f.t < 0) continue;
      if (f.kind === 'puff') { const i = Math.min(3, f.t >> 2); draw(sprite('puff' + i, S.puff[i]), f.x - 5, f.y - 6); continue; }
      const big = f.kind === 'big', set = big ? S.bigBoom : S.boom, n = set.length;
      const i = Math.min(n - 1, Math.floor(f.t / (big ? 6 : 4)));
      const img = sprite((big ? 'bigBoom' : 'boom') + i, set[i]);
      // colour cycle: alternate frames flash white early, then go dim
      draw((f.t & 2) && i < 2 ? sprite((big ? 'bigBoom' : 'boom') + i, set[i], false, 'W', true) : img, f.x - img.width / 2, f.y - img.height / 2);
    }
  }
  function drawAlien(a) {
    const T = ALIEN_TYPES[a.typ];
    if (a.typ === 1 && a.squash > 0) { draw(sprite('ballSquash', S.ballSquash, false, a.col), a.x - 1, a.y + 3); return; }
    const frames = S[a.spr], fi = Math.floor(a.t / T.sh) % frames.length;
    draw(sprite(a.spr + fi, frames[fi], T.flip && a.vx < 0, a.col), a.x, a.y);
  }
  function drawItem(it) {
    if (it.kind === 'part') { c.drawImage(sprite(G.rocket.shape + it.idx, S[G.rocket.shape][it.idx], false, G.rocket.col), Math.round(it.x), Math.round(it.y)); return; }
    if (it.kind === 'fuel') { draw(sprite('fuel', S.fuel), it.x, it.y); return; }
    if (it.life < 120 && (it.life >> 3) % 2) return;
    draw(sprite(it.g.spr, S[it.g.spr], false, it.g.col), it.x, it.y);
    const sf = (G.t >> 3) % 6;
    if (sf < 4) {
      const corner = ((G.t >> 5) + Math.round(it.x)) % 3;
      const sx = corner === 0 ? it.x - 2 : corner === 1 ? it.x + it.w - 3 : it.x + it.w / 2 - 2, sy = corner === 2 ? it.y + it.h - 3 : it.y - 2;
      draw(sprite('sparkle' + sf, S.sparkle[sf]), sx, sy);
    }
  }
  function drawHUD() {
    text(c, '1UP', 8, 1, 'C');
    text(c, pad(G.score || 0, 6), 8, 9, 'W');
    centre('HI', 1, 'Y');
    centre(pad(hi, 6), 9, 'W');
    const lv = 'LV' + pad(G.level || 1, 2);
    text(c, lv, W - 8 - textW(lv), 1, 'M');
    const n = Math.min(G.lives || 0, 6);
    const flash = G.lifeFlash > 0 && (G.lifeFlash >> 3) % 2;
    for (let i = 0; i < n; i++) c.drawImage(sprite('life', S.life, false, flash ? 'Y' : null, true), W - 8 - 7 - i * 8, 9);
    if (G.lives > 6) text(c, '+', W - 8 - 7 - 6 * 8 - 2, 9, 'W');
  }
  function drawGame() {
    drawStars(); drawWorld();
    const launching = G.sub === 'launch' || G.sub === 'land';
    drawRocket(launching && (G.subT > 24 || G.sub === 'land'));
    drawSmoke();
    for (const it of G.items) drawItem(it);
    for (const a of G.aliens) drawAlien(a);
    drawPlayer(); drawBeams(); drawFx();
    drawHUD();
    if (G.banner > 0 && G.sub === 'play') {
      const s = 'LEVEL ' + G.level;
      if ((G.banner >> 3) % 4) centre(s, 40, 'W', 2);
    }
    if (G.sub === 'launch' && G.subT < 60 && (G.subT >> 3) % 2) centre('LIFT OFF!', 40, 'Y', 2);
    if (G.mode === 'over') {
      const oy = Math.round(H / 2) - 20;
      rect(48, oy, 160, 40, 'k');
      centre('GAME OVER', oy + 6, (G.modeT >> 4) % 2 ? 'R' : 'Y', 2);
      centre('SCORE ' + pad(G.score, 6), oy + 28, 'W');
    }
    if (G.paused) { const py = Math.round(H / 2) - 12; rect(80, py, 96, 24, 'k'); centre('PAUSED', py + 4, 'W', 2); }
  }
  // big blocky logo: each font pixel is a 4x4 bevelled block; a colour band and a white glint sweep across
  const LOGO = 'ROCKET RUN', LS = 4, LOGO_COLS = ['R', 'Y', 'G', 'C', 'B', 'M'];
  function drawLogo(y0) {
    const x0 = Math.round((W - textW(LOGO, LS)) / 2);
    for (let i = 0; i < LOGO.length; i++) {
      const g = F[LOGO[i]];
      for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) {
        if (g[r][q] !== '#') continue;
        const bx = x0 + (i * 6 + q) * LS, by = y0 + r * LS, gx = i * 6 + q;
        const band = Math.floor((gx + r - (G.t >> 2)) / 6);
        let col = LOGO_COLS[((band % 6) + 6) % 6];
        const glint = ((gx + r * 2) - (G.t >> 1) % 140) ;
        if (glint >= -1 && glint <= 1) col = 'W';
        rect(bx + 1, by + 1, LS, LS, 'b');                       // drop shadow
        rect(bx, by, LS, LS, col.toLowerCase());
        rect(bx, by, LS - 1, LS - 1, col);
        rect(bx, by, 1, 1, 'W');
      }
    }
  }
  function scoreTable(y0) {
    centre('- SCORE TABLE -', y0, 'C');
    ALIEN_TYPES.forEach((T, i) => {
      const col = i % 2, row = i >> 1, x = 48 + col * 88, y = y0 + 12 + row * 18;
      const fr = S[T.spr], fi = Math.floor(G.t / T.sh) % fr.length;
      c.drawImage(sprite(T.spr + fi, fr[fi], false, T.col), x + Math.round((16 - T.w) / 2), y + Math.round((14 - T.h) / 2));
      text(c, String(T.pts).padStart(3, ' '), x + 22, y + 4, T.col);
      text(c, 'PTS', x + 44, y + 4, 'w');
    });
  }
  function controlsPage(y0) {
    centre('- CONTROLS -', y0, 'C');
    const lines = [['MOVE', 'Z X / A D / ARROWS'], ['THRUST', 'W / UP / SHIFT'], ['FIRE', 'SPACE / ENTER'], ['PAUSE', 'P    MUTE  M']];
    lines.forEach((l, i) => { text(c, l[0], 50, y0 + 16 + i * 11, 'M'); text(c, l[1], 98, y0 + 16 + i * 11, 'W'); });
    text(c, 'BUILD THE ROCKET, FUEL IT', 54, y0 + 64, 'Y');
    text(c, 'AND BLAST OFF!', 90, y0 + 74, 'Y');
  }
  function drawTitle() {
    drawStars();
    if (!terrain) buildTerrain();
    c.drawImage(terrain, 0, GROUND, W, H - GROUND, 0, GROUND, W, H - GROUND);
    // little scene: astronaut hovering left, rocket fuelled on the right
    const bob = Math.round(Math.sin(G.t / 20) * 3);
    drawMan(14, GROUND - 52 + bob, 1, 'fly', (G.t % 60) < 4, true, null, G.t);
    drawRocketAt('rocketA', 'W', 228, GROUND, 3, 30 + Math.round(Math.sin(G.t / 30) * 6), false);
    if (H >= 296) {
      // tall portrait screen: logo, score table and controls all at once, centred above the scene
      const y0 = 8 + Math.max(0, Math.round((GROUND - 64 - 222) / 2));
      drawLogo(y0);
      centre('HI ' + pad(hi, 6), y0 + 36, 'W');
      scoreTable(y0 + 52);
      controlsPage(y0 + 142);
    } else {
      drawLogo(8);
      centre('HI ' + pad(hi, 6), 42, 'W');
      if (Math.floor(G.t / 420) % 2 === 0) scoreTable(54); else controlsPage(54);
    }
    if ((G.t >> 4) % 2 === 0) centre('TAP OR PRESS ANY KEY', GROUND - 38, 'Y');
    centre('AN ORIGINAL TRIBUTE TO', GROUND - 24, 'w');
    centre('1983 HOME-COMPUTER SHOOTERS', GROUND - 15, 'w');
  }
  // change the playfield height (portrait <-> landscape); a game in progress is carried across proportionally
  function setWorld(h) {
    if (h === H) return;
    const oldG = GROUND, f = y => TOP + (y - TOP) * (h - 8 - TOP) / (oldG - TOP);
    H = h; GROUND = H - 8; VK = Math.min(1.35, Math.sqrt(vscale()));
    buildLedges(); makeStars(); terrain = null;
    low.width = W; low.height = H;
    if (G.mode === 'play' && G.p) {
      const p = G.p;
      p.y = Math.min(f(p.y + PH), GROUND) - PH - 1; p.ground = false;
      for (const it of G.items) {
        if (it.st === 'carried') continue;
        if (it.st === 'drop') { it.y = Math.min(it.y + GROUND - oldG, rocketTopY() - it.h); continue; }
        it.y = Math.min(f(it.y + it.h), GROUND) - it.h - 1; it.st = 'fall';
      }
      for (const a of G.aliens) a.y = Math.max(TOP, Math.min(f(a.y), GROUND - a.h - 1));
      for (const fx of G.fx) fx.y = f(fx.y);
      for (const sm of G.smoke) sm.y += GROUND - oldG;
      G.beams = [];
      if (G.sub === 'land') G.rocket.yOff = Math.max(G.rocket.yOff, -(GROUND + 16));
    }
  }
  function render() {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (G.mode === 'title') drawTitle(); else drawGame();
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(low, 0, 0, screen.width, screen.height);
  }

  // ---------- layout ----------
  function safe() {
    const s = getComputedStyle(document.getElementById('safe'));
    return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0, b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 };
  }
  function place(el, x, y, w, h) { Object.assign(el.style, { left: Math.round(x) + 'px', top: Math.round(y) + 'px', width: Math.round(w) + 'px', height: Math.round(h) + 'px' }); }
  function layout() {
    const vw = innerWidth, vh = innerHeight, s = safe();
    const $ = id => document.getElementById(id);
    let gw, gh, gx, gy;
    const portrait = vh >= vw * 0.9;
    document.body.classList.toggle('land', !portrait);
    if (portrait) {
      // controls get a thumb-sized strip at the bottom; everything above the pause/mute row is game.
      // The playfield is 256 wide (fills the width) and as tall as the space allows (192..400, multiples of 8).
      const sysS = 34, gapA = 8, gapB = 10, gap = 10;
      const top = s.t, bottom = vh - Math.max(s.b, 10) - 6;
      const bh0 = Math.max(96, Math.min(Math.round(vh * 0.19), 170));
      const availH = bottom - top - gapA - sysS - gapB - bh0;
      let sc = (vw - s.l - s.r) / W;
      let lh = Math.max(192, Math.min(400, Math.floor(availH / sc / 8) * 8));
      if (lh * sc > availH) sc = availH / lh;            // very short screens: shrink to keep the controls
      setWorld(lh);
      gw = W * sc; gh = lh * sc; gx = (vw - gw) / 2; gy = top;
      const sysY = gy + gh + gapA;
      place($('bPause'), s.l + 10, sysY, sysS, sysS);
      place($('bMute'), vw - s.r - 10 - sysS, sysY, sysS, sysS);
      const by = sysY + sysS + gapB, bh = Math.max(56, bottom - by);
      const half = (vw - s.l - s.r - 30) / 2, bw = (half - gap) / 2;
      place($('bLeft'), s.l + 10, by, bw, bh);
      place($('bRight'), s.l + 10 + bw + gap, by, bw, bh);
      place($('bThrust'), vw - s.r - 10 - 2 * bw - gap, by, bw, bh);
      place($('bFire'), vw - s.r - 10 - bw, by, bw, bh);
    } else {
      setWorld(192);
      const side = 150;
      gh = vh - s.t - s.b - 8; gw = gh * 4 / 3;
      const maxW = vw - s.l - s.r - 2 * side - 16;
      if (gw > maxW) { gw = maxW; gh = gw * 0.75; }
      gx = (vw - gw) / 2; gy = s.t + (vh - s.t - s.b - gh) / 2;
      const lx = s.l + 8, lw = gx - 8 - lx, rx = gx + gw + 8, rw = vw - s.r - 8 - rx;
      const sysS = 34, top = Math.max(s.t, 8);
      place($('bPause'), lx, top, sysS, sysS);
      place($('bMute'), rx + rw - sysS, top, sysS, sysS);
      const bot = vh - Math.max(s.b, 8) - 4;
      const lbh = Math.min(vh * 0.5, 170), lbw = (lw - 8) / 2;
      place($('bLeft'), lx, bot - lbh, lbw, lbh);
      place($('bRight'), lx + lbw + 8, bot - lbh, lbw, lbh);
      const avail = bot - (top + sysS + 10), rbh = Math.min((avail - 8) / 2, 130);
      place($('bThrust'), rx, bot - 2 * rbh - 8, rw, rbh);
      place($('bFire'), rx, bot - rbh, rw, rbh);
    }
    place(view, gx, gy, gw, gh);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    screen.width = Math.round(gw * dpr); screen.height = Math.round(gh * dpr);
    render();
  }
  addEventListener('resize', layout);
  addEventListener('orientationchange', () => setTimeout(layout, 120));
  document.getElementById('bMute').classList.toggle('muted', muted);

  // ---------- main loop: fixed 60Hz timestep ----------
  let acc = 0, last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(now - last, 250); last = now;
    if (!G.paused && !G.frozen) {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 6) { update(); acc -= STEP; n++; }
      if (n === 6) acc = 0;
    } else acc = 0;
    render();
  }
  layout();
  requestAnimationFrame(frame);

  // ---------- test hook ----------
  if (TEST) {
    window.__game = {
      G, keys, touch, low,
      snapshot: () => ({ mode: G.mode, sub: G.sub, level: G.level, score: G.score, lives: G.lives, hi, paused: G.paused, muted,
        player: G.p && { x: G.p.x, y: G.p.y, vx: G.p.vx, vy: G.p.vy, ground: G.p.ground, face: G.p.face, alive: G.p.alive, carrying: G.p.carry ? G.p.carry.kind + (G.p.carry.idx || '') : null },
        beams: (G.beams || []).length, aliens: (G.aliens || []).length, items: (G.items || []).map(i => ({ kind: i.kind, idx: i.idx, st: i.st, x: i.x, y: i.y })),
        rocket: G.rocket && { parts: G.rocket.parts, fuel: G.rocket.fuel, shape: G.rocket.shape, col: G.rocket.col, yOff: G.rocket.yOff },
        audio: AC ? AC.state : 'none' }),
      start: () => { if (G.mode !== 'play') newGame(); },
      god: on => { G.god = on !== false; },
      freeze: on => { G.frozen = on !== false; },
      step: n => { for (let i = 0; i < (n || 1); i++) update(); render(); },
      setPlayer: (x, y, face) => { Object.assign(G.p, { x, y, vx: 0, vy: 0 }); if (face) G.p.face = face; },
      pickNextPart: () => { const it = G.items.find(i => i.kind === 'part' && i.idx === nextPartIdx()); if (!it) return false; Object.assign(G.p, { x: it.x, y: it.y - 4, vx: 0, vy: 0 }); return true; },
      moveOverRocket: () => { Object.assign(G.p, { x: G.rocket.x, y: GROUND - 114, vx: 0, vy: 0 }); },
      dims: () => ({ W, H, GROUND, TOP, ledges: LEDGES.map(L => ({ ...L })) }),
      addFuel: n => { G.rocket.parts = 3; if (G.p.carry && G.p.carry.kind !== 'gem') G.p.carry = null; G.items = G.items.filter(i => i.kind === 'gem'); G.rocket.fuel = Math.min(6, G.rocket.fuel + (n || 6)); },
      spawnAlien: (x, y, vx, vy) => { spawnAlien(); const a = G.aliens[G.aliens.length - 1]; if (x !== undefined) Object.assign(a, { x, y, vx: vx || a.vx, vy: vy || 0 }); return G.aliens.length; },
      clearAliens: () => { G.aliens = []; G.spawnT = 100000; },
      allowSpawns: () => { G.spawnT = 1; },
      fire: () => { G.p.cool = 0; keys.fire = true; update(); keys.fire = false; }
    };
  }
})();
