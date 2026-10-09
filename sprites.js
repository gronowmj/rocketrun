/* Rocket Run - original pixel art, palette and font, all drawn in code (no external assets). */
(function () {
  'use strict';
  // Spectrum-style palette: lower case = normal, upper case = bright.
  const PAL = {
    k: '#000000', b: '#0000d7', r: '#d70000', m: '#d700d7', g: '#00d700', c: '#00d7d7', y: '#d7d700', w: '#d7d7d7',
    K: '#000000', B: '#0000ff', R: '#ff0000', M: '#ff00ff', G: '#00ff00', C: '#00ffff', Y: '#ffff00', W: '#ffffff'
  };

  // ---------- font: 5x7 glyphs on a 6x8 cell ----------
  const F = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    ':': ['.....', '..#..', '..#..', '.....', '..#..', '..#..', '.....'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
    ',': ['.....', '.....', '.....', '.....', '..#..', '..#..', '.#...'],
    '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
    ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
    "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
    '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....']
  };

  // ---------- helpers for building pixel art ----------
  // grid(w, h, fn) -> rows of chars; fn(x, y) returns a palette char or '.'
  function grid(w, h, fn) {
    const out = [];
    for (let y = 0; y < h; y++) { let s = ''; for (let x = 0; x < w; x++) s += fn(x, y) || '.'; out.push(s); }
    return out;
  }
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const S = {};

  // ---------- astronaut: 16x24, facing right (X/x = suit, C visor, Y/y pack) ----------
  const TORSO = [
    '......wWWWw.....',
    '.....wWWWWWw....',
    '....wWWWCCCCw...',
    '....WWWCWWCCC...',
    '....WWWCWCCCC...',
    '....WWWCCCCCc...',
    '....wWWWCCCcw...',
    '.....wWWWWWw....',
    '..yy..wwwww.....',
    '.yYYy.WWWWWw....',
    '.yYRywWWWWWWw...',
    '.yYYywWWWWWWWwww',
    '.yYYywWWwWWWWWwW',
    '.yYYywWWWwwww...',
    '..yy.wWWWWWw....'
  ];
  const LEGS = {
    stand: ['.....wWWWWWw....', '.....WWWWWWW....', '.....WWW.WWW....', '.....WWW.WWW....', '.....wWw.wWw....',
      '.....WWW.WWW....', '.....WWW.WWW....', '.....WWWW.WWWW..', '.....wwww.wwww..'],
    walk0: ['.....wWWWWWw....', '.....wWWWWWW....', '....wwW...WWW...', '....ww.....WWW..', '...ww.......WW..',
      '...ww.......WWW.', '..ww.........WW.', '.www........WWWW', '.www........wwww'],
    walk1: ['.....wWWWWWw....', '.....wWWWWWW....', '......wwWWWW....', '......ww.WWWW...', '......ww..WWW...',
      '......ww..WWWW..', '......ww...WWW..', '......www.......', '......www.......'],
    walk2: ['.....wWWWWWw....', '.....WWWWWWw....', '....WWW...wwW...', '...WWW.....ww...', '...WW.......ww..',
      '..WWW.......ww..', '..WW.........ww.', '.WWWW.......wwww', '.wwww.......wwww'],
    walk3: ['.....wWWWWWw....', '.....WWWWWWw....', '......WWWWww....', '......WWW.www...', '......WWW..ww...',
      '......WWW..www..', '......WWW...ww..', '......WWWW......', '......wwww......'],
    fly: ['.....wWWWWWw....', '.....WWWWWWWW...', '.....wWWWWWWWW..', '......wwWWWWWW..', '..........WWW...',
      '.........wWWW...', '.........WWWW...', '........wwww....', '................']
  };
  // recoil: gun arm pulled back one pixel
  const TORSO_FIRE = TORSO.map((r, i) => (i >= 11 && i <= 13) ? r.slice(0, 9) + r.slice(10) + '.' : r);
  for (const k in LEGS) { S['man_' + k] = TORSO.concat(LEGS[k]); S['manf_' + k] = TORSO_FIRE.concat(LEGS[k]); }
  // jet flame under the pack: 3 flickering frames, 4x8
  S.flame = [
    ['.YY.', 'YWWY', 'YWWY', '.YY.', '.RY.', '.RR.', '..R.', '....'],
    ['.YY.', 'YWWY', '.WY.', 'RYYR', '.RR.', 'R.R.', '.R..', '..r.'],
    ['YYYY', 'YWWY', 'YWWY', 'RYWR', '.YR.', '.R..', 'r.R.', '...r']
  ];
  S.muzzle = [['.W.', 'WWW', '.W.'], ['Y.Y', '.W.', 'Y.Y']];
  S.life = ['..WWW..', '.WWCCC.', '.WWCWC.', 'yWWWWW.', 'yWWWWWW', '.WW.WW.', '.ww.ww.'];

  // ---------- rockets: built from profiles, 48 rows split into nose / middle / base (16x16 each) ----------
  function buildRocket(spec) {
    const rows = grid(16, 48, (x, y) => {
      const hw = spec.hw(y);
      const L = Math.round(8 - hw), R = Math.round(8 + hw) - 1;
      // window(s)
      for (const wd of spec.win || []) {
        const d = Math.hypot(x + 0.5 - 8, y + 0.5 - wd[0]);
        if (d < wd[1] - 0.9) return (x === 7 && y === Math.floor(wd[0] - 1)) ? 'W' : 'C';
        if (d < wd[1] + 0.2 && x >= L && x <= R) return 'w';
      }
      if (hw > 0 && x >= L && x <= R) {
        if (spec.noz && spec.noz(y)) return x === L ? 'W' : x === R ? 'w' : (x === L + 1 ? 'W' : 'w');
        if ((spec.bands || []).includes(y)) return x === L ? 'W' : 'w';
        if (x === L) return 'W';
        if (x === R || (hw >= 4 && x === R - 1)) return 'x';
        return 'X';
      }
      // fins / pods
      const f = spec.fin && spec.fin(y, x);
      return f || '.';
    });
    return [rows.slice(32, 48), rows.slice(16, 32), rows.slice(0, 16)];
  }
  const ogive = (y, n, w) => w * Math.sqrt(Math.min(1, (y + 1) / n));
  S.rocketA = buildRocket({
    hw: y => y < 16 ? Math.max(0.6, ogive(y, 15, 4)) : y < 44 ? 4 : [3, 3, 4, 4][y - 44],
    noz: y => y >= 44, bands: [16, 31, 32, 42], win: [[24, 3]],
    fin: (y, x) => {
      if (y < 33 || y > 45) return null;
      const out = Math.min(8, 4 + (y - 33) * 0.6), d = Math.abs(x + 0.5 - 8);
      if (d > 4 && d <= out) return d > out - 1 ? 'x' : 'X';
      return null;
    }
  });
  S.rocketB = buildRocket({
    hw: y => y < 10 ? Math.max(1, 6 * Math.sqrt(1 - Math.pow((10 - y) / 11, 2))) : y < 43 ? 6 : [5, 4, 4, 5, 0][y - 43] || 0,
    noz: y => y >= 43, bands: [12, 16, 31, 32, 40], win: [[22, 3], [36, 2]],
    fin: (y, x) => {
      if (y >= 40 && (x === 1 || x === 14)) return y === 47 ? 'w' : 'X';
      if (y >= 42 && (x === 0 || x === 15)) return y >= 46 ? 'w' : 'x';
      return null;
    }
  });
  S.rocketC = buildRocket({
    hw: y => y < 22 ? Math.max(0.6, ogive(y, 21, 3)) : y < 45 ? 3 : 2,
    noz: y => y >= 45, bands: [22, 32, 40], win: [[28, 2]],
    fin: (y, x) => {
      if (y < 30) return null;
      const out = Math.min(8, 3 + (y - 30) * 0.4), d = Math.abs(x + 0.5 - 8);
      if (d > 3 && d <= out && !(y > 44 && d < out - 2)) return d > out - 1 ? 'x' : 'X';
      return null;
    }
  });
  S.rocketD = buildRocket({
    hw: y => y < 16 ? Math.max(0.6, ogive(y, 15, 4)) : y < 44 ? 4 : 3,
    noz: y => y >= 44, bands: [16, 20, 31, 32, 38], win: [[25, 2.5]],
    fin: (y, x) => {
      const top = 26, d = Math.abs(x + 0.5 - 8);
      if (y < top || d < 5) return null;
      const t = y - top;
      if (d > 7.6) return null;
      if (t < 3 && d > 5 + t) return null;
      if (y > 44) return d < 7 ? 'w' : null;
      return d > 6.5 ? 'x' : (d < 5.6 ? 'W' : 'X');
    }
  });

  // ---------- aliens (X = wave colour bright, x = same colour dim) ----------
  S.meteor = [
    ['...........xXx..', '...x.x..xXXXXXx.', '..x.x.xxXXXWWXXx', '.x.x.x.xXXXXWXXX', 'x.x.x.xxXXXXXXXX', '..x.x.x.xXXXXXXx', '...x.x...xXXXXx.', '...........xx...'],
    ['..........xXXx..', '..x.x.x.xXXXXXx.', '.x.x.x.xXXXXWWXx', 'x.x.x.xXXXXXXWXX', '.x.x.x.xXXXXXXXX', 'x.x.x.x.xXXXXXXx', '..x.x....xXXXXx.', '..........xXx...'],
    ['...........xXx..', '.x.x.x..xXXXXXx.', 'x.x.x.xxXXXWWXXx', '..x.x.x.XXXXWXXX', '.x.x.x.xXXXXXXXX', 'x.x.x.x.xXXXXXXx', '.x.x.x...xXXXXx.', '...........xx...']
  ];
  // spinning ball: shaded sphere with a seam that rotates
  function sphere(w, h, seam, cx, cy) {
    cx = cx === undefined ? w / 2 : cx; cy = cy === undefined ? h / 2 : cy;
    const rx = w / 2, ry = h / 2;
    return grid(w, h, (x, y) => {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) return null;
      const lit = -nx * 0.6 - ny * 0.7 + Math.sqrt(1 - d) * 0.4;
      if (seam !== null && seam !== undefined) {
        const lon = Math.asin(Math.max(-1, Math.min(1, nx / Math.sqrt(Math.max(0.05, 1 - ny * ny)))));
        if (Math.abs(lon - seam) < 0.22) return lit > 0.55 ? 'X' : 'x';
      }
      if (lit > 0.62) return 'W';
      if (lit > -0.25 && d < 0.8) return 'X';
      return d > 0.75 && lit < 0.2 ? 'x' : 'X';
    });
  }
  S.ball = [-1.2, -0.4, 0.4, 1.2].map(s => sphere(12, 12, s));
  S.ballSquash = sphere(14, 9, 0);
  // pulsing homing blob with eyes
  S.blob = [5.2, 5.8, 6.4, 5.8].map((r, f) => grid(14, 14, (x, y) => {
    const dx = x + 0.5 - 7, dy = y + 0.5 - 7.5, a = Math.atan2(dy, dx);
    const rr = r + Math.sin(a * 5 + f * 1.6) * 0.7;
    const d = Math.hypot(dx, dy * 1.1);
    if (d > rr) return null;
    if ((x === 4 || x === 9) && (y === 5 || y === 6)) return y === 5 ? 'W' : 'k';
    if ((x === 5 || x === 10) && (y === 5 || y === 6)) return 'W';
    if (d > rr - 1.1) return 'x';
    if (dx < -1 && dy < -2 && d > rr - 2.4) return 'W';
    return 'X';
  }));
  // saucer with a rotating light band
  S.saucer = [0, 1, 2, 3].map(f => [
    '......xXXx......', '.....XWWXXx.....', '....xWXXXXXx....', '..xxXXXXXXXXxx..', '.XWWXXXXXXXXXXx.',
    [...Array(16)].map((_, x) => x === 0 || x === 15 ? 'x' : (x + f) % 4 === 0 ? 'W' : (x + f) % 4 === 2 ? 'Y' : 'k').join(''),
    'xXXXXXXXXXXXXXXx', '.xxXXXXXXXXXXxx.', '...xxx....xxx...', '..x..........x..'
  ]);
  // jellyfish drifter: dome + waving tentacles
  S.jelly = [0, 1, 2].map(f => grid(14, 14, (x, y) => {
    const dx = x + 0.5 - 7;
    if (y < 7) {
      const d = Math.hypot(dx / 7, (y + 0.5 - 7) / 7);
      if (d > 1) return null;
      if (d > 0.86) return 'x';
      if (y === 2 && (x === 4 || x === 5) || y === 3 && x === 3) return 'W';
      if (y === 4 && (x === 5 || x === 8)) return 'x';
      return 'X';
    }
    if (y === 7) return x % 2 ? 'X' : 'x';
    for (const tc of [1, 4, 7, 10, 12]) {
      const off = Math.round(Math.sin((y * 0.9) + f * 2.1 + tc) * (y - 7) / 4);
      if (x === tc + off) return y > 11 ? 'x' : 'X';
    }
    return null;
  }));
  // spinning cross / star
  S.cross = [0, 1, 2, 3].map(f => grid(14, 14, (x, y) => {
    const dx = x + 0.5 - 7, dy = y + 0.5 - 7, r = Math.hypot(dx, dy), a = f * Math.PI / 8;
    if (r > 6.9) return null;
    if (r < 1.3) return 'W';
    const d1 = Math.abs(dx * Math.sin(a) - dy * Math.cos(a)), d2 = Math.abs(dx * Math.cos(a) + dy * Math.sin(a));
    const d = Math.min(d1, d2), wid = 1.1 + (r > 5 ? 0.5 : 0);
    if (d > wid) return null;
    if (r > 5.8) return 'W';
    return d > 0.6 ? 'x' : 'X';
  }));
  // flapping bug
  S.bug = [
    ['..xX......Xx..', '.xXWx....xWXx.', '.xXXWx..xWXXx.', '..xXXx..xXXx..', '....xXXXXx....', '...xXWXXWXx...',
      '...XXkXXkXX...', '..xXXXXXXXXx..', '..XxXXXXXXxX..', '...xXXXXXXx...', '..x.x.xx.x.x..', '.x..x....x..x.'],
    ['..............', '..............', '..............', '....xXXXXx....', 'xxxxXWXXWXxxxx',
      'XXXXXkXXkXXXXX', '.xXXXXXXXXXXx.', '..xXXXXXXXXx..', '..XxXXXXXXxX..', '...xXXXXXXx...', '...x.x..x.x...', '..x..x..x..x..']
  ];
  // diving fighter (faces right)
  S.fighter = [0, 1].map(f => [
    '..xX............', '..xXXx..........', '...xXXXxx.......',
    (f ? 'YR' : 'RY') + 'xXXXXXXXXWWx..', (f ? 'WY' : 'YW') + 'XXXXXXXXXXCCXx', (f ? 'YR' : 'RY') + 'xXXXXXXXXXXxx.',
    '...xXXXxx.......', '..xXXx..........', '..xX............', '................'
  ]);

  // ---------- explosions: chunky frames, precomputed ----------
  function burst(size, frames, seed) {
    const out = [], c = size / 2, maxR = size / 2 - 0.5;
    const HOT = ['W', 'W', 'Y', 'Y', 'R', 'r'], COOL = ['Y', 'Y', 'R', 'R', 'r', 'r'];
    for (let f = 0; f < frames; f++) {
      const p = f / (frames - 1);
      const ringR = maxR * (0.25 + p * 0.7), thick = maxR * (0.45 - p * 0.3), core = p < 0.3 ? maxR * (0.45 - p) : 0;
      const st = Math.min(5, Math.floor(p * 5.99)), hot = HOT[st], cool = COOL[st];
      out.push(grid(size, size, (x, y) => {
        const bx = x >> 1, by = y >> 1;                       // 2x2 chunks
        const dx = bx * 2 + 1 - c, dy = by * 2 + 1 - c, d = Math.hypot(dx, dy);
        const sx = x + 0.5 - c, sy = y + 0.5 - c, sd = Math.hypot(sx, sy), ang = Math.atan2(sy, sx);
        if (core && d < core) return f === 0 ? 'W' : (hash(bx, by, seed) < 0.5 ? 'W' : 'Y');
        if (Math.abs(d - ringR) < thick && hash(bx, by, seed + f) < 0.78 - p * 0.45) return d < ringR ? hot : cool;
        // sparks along spokes, flying further out
        const spoke = Math.round(ang / (Math.PI / 6));
        const sa = spoke * Math.PI / 6 + (hash(spoke, 1, seed) - 0.5) * 0.4;
        const sr = maxR * (0.4 + p * 0.65) * (0.75 + hash(spoke, 2, seed) * 0.25);
        if (Math.abs(ang - sa) < 0.9 / Math.max(sd, 1) && Math.abs(sd - sr) < 1.2 && hash(spoke, f, seed) < 0.85) return p < 0.6 ? 'W' : 'Y';
        return null;
      }));
    }
    return out;
  }
  S.boom = burst(18, 6, 7);
  S.bigBoom = burst(30, 8, 3);
  S.puff = [2, 3, 4, 4.6].map((r, f) => grid(10, 8, (x, y) => {
    const dx = x + 0.5 - 5, dy = (y + 0.5 - 5.5) * 1.4, d = Math.hypot(dx, dy);
    if (d > r) return null;
    if (f >= 2 && d < r - 1.4) return null;
    if (f === 3) return (x + y) % 2 ? null : 'w';
    return dx + dy < -1 ? 'W' : f ? 'w' : 'Y';
  }));
  S.smoke = [2.5, 3.5, 4.5, 5.5, 6].map((r, f) => grid(14, 12, (x, y) => {
    const dx = x + 0.5 - 7, dy = y + 0.5 - 7, d = Math.hypot(dx, dy * 1.2) + Math.sin(Math.atan2(dy, dx) * 3 + f) * 0.35;
    if (d > r) return null;
    if (f >= 3 && (x + y) % 2) return null;
    if (f === 4 && (x % 2 || y % 2)) return null;
    return dx + dy < -2 ? 'W' : 'w';
  }));
  // rocket exhaust plume (4 frames, 12x28)
  S.plume = [0, 1, 2, 3].map(f => grid(14, 34, (x, y) => {
    const t = y / 33, half = 2.6 + t * 4.2 + Math.sin(y * 0.7 + f * 1.7) * 0.9, dx = Math.abs(x + 0.5 - 7);
    if (dx > half) return null;
    const n = hash(x, y, f);
    if (t > 0.5 && n < (t - 0.5) * 1.7) return null;
    const heat = 1.05 - t * 0.9 - dx / 10 + n * 0.25;
    return heat > 0.8 ? 'W' : heat > 0.5 ? 'Y' : heat > 0.28 ? 'R' : 'r';
  }));

  // ---------- pickups ----------
  const LET = { F: ['###', '#..', '##.', '#..', '#..'], U: ['#.#', '#.#', '#.#', '#.#', '###'], E: ['###', '#..', '##.', '#..', '###'], L: ['#..', '#..', '#..', '#..', '###'] };
  S.fuel = grid(14, 14, (x, y) => {
    if (y === 0) return x >= 4 && x <= 9 ? (x === 4 ? 'W' : 'w') : null;
    if (y === 1) return x >= 5 && x <= 8 ? 'w' : null;
    if (y === 2) return x >= 1 && x <= 12 ? (x === 1 ? 'W' : x >= 11 ? 'm' : 'M') : null;
    if (y >= 13) return x >= 1 && x <= 12 ? 'm' : null;
    if (x === 0) return 'M'; if (x === 13) return 'm';
    if (y === 3 || y === 9) return x === 1 ? 'W' : 'M';
    if (y >= 4 && y <= 8) {
      const li = Math.floor((x - 1) / 3), lx = (x - 1) % 3;
      if (li < 4 && LET['FUEL'[li]][y - 4][lx] === '#') return li % 2 ? 'Y' : 'W';
      return 'k';
    }
    return x === 1 ? 'W' : x >= 11 ? 'm' : 'M';
  });
  S.gem = ['..WWXXXx..', '.WWXXXXXx.', 'WWWXXXXxxx', '.xXXXXXxx.', '..xXXXxx..', '...xXXx...', '....xx....'];
  S.bar = ['...WWWWWWW..', '..WXXXXXXXx.', '.WXXXXXXXXXx', 'WXXXXXXXXXXx', 'xxxxxxxxxxxx'];
  S.orb = sphere(9, 9, null);
  S.sparkle = [['.....', '..W..', '.WWW.', '..W..', '.....'], ['..W..', '..W..', 'WWWWW', '..W..', '..W..'], ['.....', '..W..', '.WWW.', '..W..', '.....'], ['.....', '.....', '..W..', '.....', '.....']];

  // ---------- sprite cache ----------
  const cache = new Map();
  // Returns a canvas for sprite rows. tint replaces X (bright) and x (dim); tintAll paints every pixel in tint.
  function sprite(key, rows, flip, tint, tintAll) {
    const ck = key + '|' + (flip ? 1 : 0) + '|' + (tint || '') + '|' + (tintAll ? 1 : 0);
    let cv = cache.get(ck);
    if (cv) return cv;
    const h = rows.length, w = rows[0].length;
    cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let ch = rows[y][flip ? w - 1 - x : x];
      if (!ch || ch === '.') continue;
      if (tint && tintAll) ch = tint;
      else if (ch === 'X') ch = tint ? tint.toUpperCase() : 'W';
      else if (ch === 'x') ch = tint ? tint.toLowerCase() : 'w';
      c.fillStyle = PAL[ch] || '#fff';
      c.fillRect(x, y, 1, 1);
    }
    cache.set(ck, cv);
    return cv;
  }

  function text(ctx, str, x, y, col, scale, bold) {
    scale = scale || 1;
    ctx.fillStyle = PAL[col] || col;
    str = String(str).toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const g = F[str[i]] || F['?'];
      for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) {
        if (g[r][q] !== '#') continue;
        ctx.fillRect(x + (i * 6 + q) * scale, y + r * scale, scale * (bold ? 1.5 : 1), scale);
      }
    }
  }
  const textW = (str, scale) => String(str).length * 6 * (scale || 1) - (scale || 1);

  window.RR = { PAL, S, F, sprite, text, textW, hash };
})();
