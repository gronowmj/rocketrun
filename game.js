/* Rocket Run - an original game. An affectionate tribute to classic 1983 home-computer shooters. */
(function () {
  'use strict';
  const { PAL, S, sprite, text, textW } = window.RR;
  const W = 256, H = 192, GROUND = 184, TOP = 18, STEP = 1000 / 60;
  const params = new URLSearchParams(location.search);
  const TEST = params.get('test') === '1';

  // ---------- rng ----------
  let seed = TEST ? 12345 : (Date.now() >>> 0);
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];

  // ---------- world ----------
  const LEDGES = [{ x: 32, y: 80, w: 48, h: 6 }, { x: 120, y: 104, w: 32, h: 6 }, { x: 192, y: 56, w: 48, h: 6 }];
  const ROCKET_X = 168, START_X = 92;
  const ALIEN_COLS = ['R', 'M', 'G', 'C', 'Y', 'W'];
  const ALIEN_TYPES = [
    { spr: 'meteor', w: 16, h: 7, pts: 25 },
    { spr: 'ball', w: 12, h: 12, pts: 40 },
    { spr: 'blob', w: 12, h: 12, pts: 50 },
    { spr: 'saucer', w: 16, h: 8, pts: 80 }
  ];
  const GEMS = [{ spr: 'gem', w: 8, h: 8, pts: 250 }, { spr: 'bar', w: 12, h: 6, pts: 500 }, { spr: 'orb', w: 8, h: 8, pts: 750 }];
  const ROCKET_COLS = ['W', 'C', 'Y', 'G', 'M', 'R'];

  const stars = [];
  for (let i = 0; i < 26; i++) stars.push({ x: ri(0, 255), y: ri(TOP + 2, GROUND - 4), p: ri(0, 200), s: ri(60, 200) });

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
  const pbox = p => ({ x: p.x + 3, y: p.y + 1, w: 10, h: 19 });
  const hitLedge = r => LEDGES.some(l => overlap(r, l));

  // ---------- game setup ----------
  function newGame() {
    Object.assign(G, { mode: 'play', modeT: 0, score: 0, lives: 4, level: 1, nextLife: 10000, rocketNo: 0,
      beams: [], aliens: [], fx: [], items: [], gem: null, gemTimer: ri(500, 900), spawnT: 60, fuelT: 0,
      sub: 'play', subT: 0, banner: 90 });
    setupRocket(true);
    spawnPlayer();
  }
  function setupRocket(fresh) {
    const n = G.rocketNo;
    G.rocket = { x: ROCKET_X, yOff: 0, vy: 0, parts: fresh ? 1 : 3, fuel: 0, shape: n % 2 ? 'rocketB' : 'rocketA', col: ROCKET_COLS[n % ROCKET_COLS.length] };
    G.items = G.items.filter(i => i.kind === 'gem');
    if (fresh) {
      G.items.push({ kind: 'part', idx: 1, x: 128, y: 104 - 16, w: 16, h: 16, vy: 0, st: 'rest' });
      G.items.push({ kind: 'part', idx: 2, x: 48, y: 80 - 16, w: 16, h: 16, vy: 0, st: 'rest' });
    }
    G.fuelT = 90;
  }
  function spawnPlayer() {
    G.p = { x: START_X, y: GROUND - 20, w: 16, h: 20, vx: 0, vy: 0, face: 1, ground: true, carry: null, cool: 0, inv: 90, anim: 0, alive: true, thrusting: false };
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
  function explode(x, y, col, big) { G.fx.push({ x, y, t: 0, col: col || 'Y', big: !!big }); }

  function update() {
    G.t++; G.modeT++;
    if (G.mode === 'over' && G.modeT > 720) toTitle();
    if (G.mode !== 'play') return;
    if (G.banner > 0) G.banner--;
    if (G.lifeFlash > 0) G.lifeFlash--;
    for (const f of G.fx) f.t++;
    G.fx = G.fx.filter(f => f.t < 24);
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
      if (G.rocket.yOff < -260) nextLevel();
    } else if (G.sub === 'land') {
      G.subT++;
      const r = G.rocket;
      r.yOff = Math.min(0, r.yOff + Math.max(0.5, -r.yOff / 40));
      if (r.yOff >= -0.01) { r.yOff = 0; G.sub = 'play'; spawnPlayer(); G.banner = 90; G.fuelT = 60; G.spawnT = 60; }
    }
    if (G.score > hi) hi = G.score;
  }

  function nextLevel() {
    G.level++;
    G.beams = []; G.aliens = [];
    G.items = G.items.filter(i => i.kind === 'gem');
    if ((G.level - 1) % 4 === 0) { G.rocketNo++; setupRocket(true); G.sub = 'play'; spawnPlayer(); G.banner = 90; G.spawnT = 60; }
    else { G.rocket.yOff = -200; G.rocket.vy = 0; G.rocket.fuel = 0; G.sub = 'land'; G.subT = 0; sfx.land(); }
  }

  function updatePlay() {
    const p = G.p;
    // player movement
    const l = input('left'), r = input('right'), th = input('thrust');
    if (l && !r) { p.vx = Math.max(p.vx - 0.14, -1.3); p.face = -1; }
    else if (r && !l) { p.vx = Math.min(p.vx + 0.14, 1.3); p.face = 1; }
    else { const fr = p.ground ? 0.2 : 0.035; p.vx = Math.abs(p.vx) <= fr ? 0 : p.vx - Math.sign(p.vx) * fr; }
    p.thrusting = th;
    if (th) p.vy = Math.max(p.vy - 0.13, -1.4);
    else p.vy = Math.min(p.vy + 0.07, 1.7);
    p.x += p.vx;
    let b = pbox(p);
    for (const L of LEDGES) if (overlap(b, L)) { if (p.vx > 0) p.x = L.x - 13; else if (p.vx < 0) p.x = L.x + L.w - 3; p.vx = 0; b = pbox(p); }
    wrapX(p);
    p.y += p.vy; p.ground = false;
    b = pbox(p);
    for (const L of LEDGES) if (overlap(b, L)) {
      if (p.vy > 0) { p.y = L.y - 20; p.ground = true; } else { p.y = L.y + L.h - 1; }
      p.vy = 0; b = pbox(p);
    }
    if (p.y + 20 >= GROUND) { p.y = GROUND - 20; p.vy = 0; p.ground = true; }
    if (p.y < TOP) { p.y = TOP; p.vy = Math.max(p.vy, 0); }
    if (p.ground && p.vx !== 0) p.anim += Math.abs(p.vx) * 0.12; else if (p.ground) p.anim = 0;
    if (p.inv > 0) p.inv--;

    // laser
    if (p.cool > 0) p.cool--;
    if (input('fire') && p.cool === 0) {
      p.cool = 14;
      G.beams.push({ x0: p.face > 0 ? p.x + 16 : p.x - 1, y: p.y + 8, dir: p.face, head: 0, tail: 0, t: 0, ph: ri(0, 7) });
      sfx.laser();
    }
    for (const bm of G.beams) {
      bm.t++; bm.head = Math.min(bm.head + 9, 150);
      if (bm.t > 9) bm.tail += 9;
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
    const maxA = Math.min(4 + cyc + (G.level > 1 ? 1 : 0), 8);
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
    explode(p.x + 8, p.y + 10, 'W', true); explode(p.x + 4, p.y + 4, 'C'); sfx.death();
    if (p.carry) { p.carry.st = 'fall'; p.carry.vy = 0; p.carry = null; }
    p.alive = false; G.sub = 'dying'; G.subT = 0; G.beams = [];
  }

  function nextPartIdx() { return G.rocket.parts < 3 ? G.rocket.parts : -1; }

  function updateItems() {
    const p = G.p, rk = G.rocket;
    for (const it of G.items) {
      if (it.st === 'carried') {
        it.x = p.x + 8 - it.w / 2; it.y = p.y + 20 - it.h;
        // over the rocket? let it go
        if (Math.abs((p.x + 8) - (rk.x + 8)) < 4 && G.sub === 'play') {
          it.st = 'drop'; it.x = rk.x + 8 - it.w / 2; it.vy = 0; p.carry = null;
          it.y = Math.min(it.y, rocketTopY() - it.h);
        }
        continue;
      }
      if (it.st === 'fall' || it.st === 'drop') {
        it.vy = Math.min(it.vy + 0.06, it.st === 'drop' ? 1.6 : 1.1);
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
        G.items.push({ kind: 'fuel', x, y: TOP, w: 12, h: 12, vy: 0, st: 'fall' });
      }
    }
    if (rk.fuel >= 6 && !p.carry && overlapWrap(pbox(p), rocketRect())) {
      G.sub = 'launch'; G.subT = 0; rk.vy = 0; G.beams = [];
      for (const a of G.aliens) explode(a.x + a.w / 2, a.y + a.h / 2, a.col);
      G.aliens = []; p.alive = false; sfx.launch();
    }
  }

  function spawnAlien() {
    const typ = (G.level - 1) % 4, T = ALIEN_TYPES[typ];
    const sp = Math.min(1 + 0.22 * Math.floor((G.level - 1) / 4), 2);
    const p = G.p;
    let x, y, side, tries = 0;
    do {
      side = rnd() < 0.5 ? -1 : 1;
      x = side < 0 ? -T.w / 2 : W - T.w / 2; y = ri(TOP + 4, GROUND - 20);
      tries++;
    } while (tries < 10 && (Math.abs(y - p.y) < 34 && Math.min(Math.abs(x - p.x), W - Math.abs(x - p.x)) < 70 || LEDGES.some(L => overlap({ x, y, w: T.w, h: T.h }, L))));
    const dir = -side;
    const a = { typ, spr: T.spr, w: T.w, h: T.h, pts: T.pts, x, y, col: pick(ALIEN_COLS), sp, t: ri(0, 50), vx: 0, vy: 0 };
    if (typ === 0) { a.vx = dir * (0.55 + rnd() * 0.45) * sp; a.vy = (0.15 + rnd() * 0.45) * sp * (rnd() < 0.3 ? -1 : 1); }
    else if (typ === 1) { a.vx = dir * (0.6 + rnd() * 0.4) * sp; a.vy = (0.5 + rnd() * 0.5) * sp * (rnd() < 0.5 ? -1 : 1); }
    else { a.vx = dir * 0.5 * sp; a.vy = 0; }
    G.aliens.push(a);
  }

  function updateAliens() {
    const p = G.p;
    for (const a of G.aliens) {
      if (a.dead) continue;
      a.t++;
      if (a.typ >= 2 && p.alive) {
        const acc = (a.typ === 2 ? 0.03 : 0.014) * a.sp, mx = (a.typ === 2 ? 0.95 : 0.6) * a.sp;
        const dx = ((p.x + 8 - (a.x + a.w / 2)) % W + W * 1.5) % W - W / 2, dy = p.y + 10 - (a.y + a.h / 2);
        a.vx = Math.max(-mx, Math.min(mx, a.vx + Math.sign(dx) * acc));
        a.vy = Math.max(-mx, Math.min(mx, a.vy + Math.sign(dy) * acc + (a.typ === 3 ? Math.sin(a.t / 12) * 0.01 : 0)));
      }
      a.x += a.vx;
      if (hitLedge(a)) {
        if (a.typ === 0) { a.dead = true; explode(a.x + a.w / 2, a.y + a.h / 2, a.col); continue; }
        a.x -= a.vx; a.vx = -a.vx;
      }
      wrapX(a);
      a.y += a.vy;
      if (hitLedge(a) || a.y + a.h > GROUND) {
        if (a.typ === 0) { a.dead = true; explode(a.x + a.w / 2, Math.min(a.y + a.h / 2, GROUND - 3), a.col); continue; }
        a.y -= a.vy; a.vy = a.typ === 1 ? -a.vy : -a.vy * 0.5;
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
      if (ph < 6) continue;
      rect(s.x, s.y, 1, 1, ph < 14 ? 'W' : (s.p % 3 ? 'w' : 'c'));
    }
  }
  function drawWorld() {
    for (const L of LEDGES) {
      rect(L.x, L.y, L.w, L.h, 'g');
      rect(L.x, L.y, L.w, 1, 'G');
      for (let x = L.x; x < L.x + L.w; x += 2) rect(x + ((x >> 1) & 1), L.y + 2 + ((x >> 1) & 1) * 2, 1, 1, 'G');
    }
    rect(0, GROUND, W, H - GROUND, 'y');
    rect(0, GROUND, W, 1, 'Y');
    for (let x = 0; x < W; x += 2) { rect(x, GROUND + 2 + ((x >> 1) % 3) * 2, 1, 1, 'Y'); }
  }
  function drawRocket(launching) {
    const rk = G.rocket, rows = S[rk.shape];
    const baseY = GROUND + rk.yOff;
    const ready = rk.fuel >= 6;
    const fillRows = Math.round(rk.fuel / 6 * 48);
    for (let i = 0; i < rk.parts; i++) {
      const py = baseY - 16 * (i + 1);
      const spr = rows[i];
      for (let y = 0; y < 16; y++) {
        const fromBottom = 16 * i + (15 - y);
        const fueled = fromBottom < fillRows;
        let col = rk.col;
        if (fueled) col = ready && (G.t >> 3) % 2 ? 'W' : 'M';
        for (let x = 0; x < 16; x++) {
          const ch = spr[y][x];
          if (ch === '.') continue;
          rect(rk.x + x, py + y, 1, 1, ch === 'X' ? col : ch);
        }
      }
    }
    if (launching) {
      for (let i = 0; i < 26; i++) rect(rk.x + 4 + ri(0, 7), baseY + ri(0, 3 + (G.subT >> 2)), 1, 2, pick(['R', 'Y', 'Y', 'W', 'r']));
    }
  }
  function drawPlayer() {
    const p = G.p;
    if (!p.alive) return;
    if (p.inv > 0 && (p.inv >> 2) % 2) return;
    let legs = 'stand';
    if (!p.ground) legs = 'fly';
    else if (p.vx !== 0) legs = ['walk1', 'walk2', 'walk3', 'walk2'][Math.floor(p.anim) % 4];
    const tint = p.inv > 0 ? ['C', 'M', 'Y', 'G'][(p.inv >> 1) % 4] : null;
    const img = sprite('man_' + legs, S['man_' + legs], p.face < 0, tint, true);
    if (p.thrusting && !p.ground) {
      const fx = p.face > 0 ? p.x + 1 : p.x + 12;
      for (let i = 0; i < 7; i++) rect(Math.round(fx + ri(0, 2)), Math.round(p.y + 14 + ri(0, 5)), 1, 1, pick(['R', 'Y', 'W']));
    }
    draw(img, p.x, p.y);
  }
  const BEAM_COLS = ['W', 'Y', 'C', 'G', 'M', 'R', 'C', 'Y'];
  function drawBeams() {
    for (const bm of G.beams) {
      for (let d = bm.tail; d < bm.head; d++) {
        const k = ((d >> 3) + bm.ph + (bm.t >> 1)) % 8;
        if (d > bm.head - 40 && ((d * 7 + bm.t * 3) % 11) < 2) continue; // ragged leading edge
        let x = Math.round(bm.x0 + bm.dir * d); x = ((x % W) + W) % W;
        rect(x, bm.y, 1, 1, BEAM_COLS[k]);
      }
    }
  }
  function drawFx() {
    for (const f of G.fx) {
      const r = f.t * (f.big ? 0.9 : 0.6) + 1, n = f.big ? 14 : 9;
      const col = f.t < 4 ? 'W' : f.t < 12 ? f.col : (f.t % 2 ? 'R' : 'r');
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + f.t * 0.05 + (i % 2) * 0.3;
        const rr = r * (i % 3 === 0 ? 1 : 0.65);
        const s = f.t < 10 ? 2 : 1;
        rect(Math.round(f.x + Math.cos(a) * rr), Math.round(f.y + Math.sin(a) * rr), s, s, col);
      }
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
    drawRocket(launching && (G.subT > 30 || G.sub === 'land'));
    for (const it of G.items) {
      if (it.kind === 'part') {
        c.drawImage(sprite(G.rocket.shape + it.idx, S[G.rocket.shape][it.idx], false, G.rocket.col), Math.round(it.x), Math.round(it.y));
      } else if (it.kind === 'fuel') draw(sprite('fuel', S.fuel), it.x, it.y);
      else if (!(it.life < 120 && (it.life >> 3) % 2)) draw(sprite(it.g.spr, S[it.g.spr]), it.x, it.y);
    }
    for (const a of G.aliens) {
      const fr = S[a.spr][(a.t >> 3) % 2];
      draw(sprite(a.spr + ((a.t >> 3) % 2), fr, a.vx < 0, a.col), a.x, a.y);
    }
    drawPlayer(); drawBeams(); drawFx();
    drawHUD();
    if (G.banner > 0 && G.sub === 'play') {
      const s = 'LEVEL ' + G.level;
      if ((G.banner >> 3) % 4) centre(s, 40, 'W', 2);
    }
    if (G.sub === 'launch' && G.subT < 60 && (G.subT >> 3) % 2) centre('LIFT OFF!', 40, 'Y', 2);
    if (G.mode === 'over') {
      rect(48, 76, 160, 40, 'k');
      centre('GAME OVER', 82, (G.modeT >> 4) % 2 ? 'R' : 'Y', 2);
      centre('SCORE ' + pad(G.score, 6), 104, 'W');
    }
    if (G.paused) { rect(80, 84, 96, 24, 'k'); centre('PAUSED', 88, 'W', 2); }
  }
  function drawTitle() {
    drawStars();
    rect(0, GROUND, W, H - GROUND, 'y'); rect(0, GROUND, W, 1, 'Y');
    // title with colour bands
    const tcol = ['R', 'Y', 'G', 'C', 'M'];
    const s = 'ROCKET RUN', sc = 3, x0 = Math.round((W - textW(s, sc)) / 2);
    for (let i = 0; i < s.length; i++) text(c, s[i], x0 + i * 6 * sc, 22, tcol[(i + (G.t >> 4)) % tcol.length], sc, true);
    // little scene
    const shape = 'rocketA';
    for (let i = 0; i < 3; i++) c.drawImage(sprite(shape + i, S[shape][i], false, 'W'), 206, GROUND - 16 * (i + 1));
    const bob = Math.round(Math.sin(G.t / 20) * 3);
    c.drawImage(sprite('man_fly', S.man_fly), 28, 146 + bob);
    for (let i = 0; i < 6; i++) rect(30 + ri(0, 2), 160 + bob + ri(0, 5), 1, 1, pick(['R', 'Y', 'W']));
    for (let d = 0; d < 34; d++) rect(46 + d, 154 + bob, 1, 1, BEAM_COLS[((d >> 3) + (G.t >> 2)) % 8]);
    c.drawImage(sprite('saucer' + ((G.t >> 3) % 2), S.saucer[(G.t >> 3) % 2], true, 'G'), 100 + Math.round(Math.sin(G.t / 30) * 8), 150);
    centre('HI ' + pad(hi, 6), 52, 'W');
    if ((G.t >> 4) % 2 === 0) centre('TAP OR PRESS ANY KEY TO START', 64, 'Y');
    const lines = [['MOVE', 'Z X / A D / ARROWS', 'C'], ['THRUST', 'W / UP / SHIFT', 'C'], ['FIRE', 'SPACE / ENTER', 'C'], ['PAUSE', 'P    MUTE  M', 'C']];
    lines.forEach((l, i) => { text(c, l[0], 60, 80 + i * 9, 'M'); text(c, l[1], 108, 80 + i * 9, 'W'); });
    centre('AN AFFECTIONATE TRIBUTE TO', 120, 'w');
    centre('CLASSIC 1983 HOME-COMPUTER SHOOTERS', 130, 'w');
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
      gw = vw - s.l - s.r; gh = gw * 0.75;
      if (gh > vh * 0.56) { gh = vh * 0.56; gw = gh * 4 / 3; }
      gx = (vw - gw) / 2; gy = s.t;
      const sysY = gy + gh + 8, sysS = 34;
      place($('bPause'), s.l + 10, sysY, sysS, sysS);
      place($('bMute'), vw - s.r - 10 - sysS, sysY, sysS, sysS);
      const padTop = sysY + sysS + 10, padBot = vh - Math.max(s.b, 10) - 6;
      const bh = Math.max(60, Math.min(padBot - padTop, 200));
      const by = padBot - bh, gap = 10, half = (vw - s.l - s.r - 30) / 2;
      const bw = (half - gap) / 2;
      place($('bLeft'), s.l + 10, by, bw, bh);
      place($('bRight'), s.l + 10 + bw + gap, by, bw, bh);
      place($('bThrust'), vw - s.r - 10 - 2 * bw - gap, by, bw, bh);
      place($('bFire'), vw - s.r - 10 - bw, by, bw, bh);
    } else {
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
      G, keys, touch,
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
      moveOverRocket: () => { Object.assign(G.p, { x: G.rocket.x, y: 70, vx: 0, vy: 0 }); },
      addFuel: n => { G.rocket.parts = 3; if (G.p.carry && G.p.carry.kind !== 'gem') G.p.carry = null; G.items = G.items.filter(i => i.kind === 'gem'); G.rocket.fuel = Math.min(6, G.rocket.fuel + (n || 6)); },
      spawnAlien: (x, y, vx, vy) => { spawnAlien(); const a = G.aliens[G.aliens.length - 1]; if (x !== undefined) Object.assign(a, { x, y, vx: vx || a.vx, vy: vy || 0 }); return G.aliens.length; },
      clearAliens: () => { G.aliens = []; G.spawnT = 100000; },
      allowSpawns: () => { G.spawnT = 1; },
      fire: () => { G.p.cool = 0; keys.fire = true; update(); keys.fire = false; }
    };
  }
})();
