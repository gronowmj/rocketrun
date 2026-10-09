/* Rocket Run - original pixel art, palette and font, all drawn in code. */
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

  // ---------- sprites (each char = a palette colour; X = tinted body, '.' = empty) ----------
  const BODY = [
    '......WWWW......',
    '.....WWWWWW.....',
    '....WWWWWCCC....',
    '....WWWWCCCC....',
    '....WWWWWCCC....',
    '.....WWWWWW.....',
    '......WWWW......',
    '..CC.WWWWWWW....',
    '.CCCWWWWWWWWWWWW',
    '.CCCWWWWWWWWWWW.',
    '.CCCWWWWWW......',
    '.CCCWWWWWW......',
    '.CCCWWWWWW......',
    '..CC.WWWWW......',
    '.....WWWWWW.....'
  ];
  const LEGS = {
    stand: ['.....WW..WW.....', '.....WW..WW.....', '.....WW..WW.....', '.....WW..WW.....', '....WWW..WWW....'],
    walk1: ['.....WW..WW.....', '....WW....WW....', '...WW......WW...', '..WW.......WW...', '.WWW.......WWW..'],
    walk2: ['.....WWWWW......', '......WWW.......', '......WWW.......', '......WWW.......', '.....WWWW.......'],
    walk3: ['.....WW.WW......', '.....WW..WW.....', '....WW....WW....', '....WW....WW....', '...WWW....WWW...'],
    fly:   ['.....WW..WW.....', '......WW..WW....', '.......WW..WW...', '........WW..W...', '................']
  };
  const S = {};
  for (const k in LEGS) S['man_' + k] = BODY.concat(LEGS[k]);

  S.life = ['..WWW..', '.WWCCC.', '.WWWWW.', 'CWWWWW.', 'CWWWWW.', '.WW.WW.', '.WW.WW.'];

  // rockets: two shapes, each 3 parts of 16x16 (0 = base, 1 = middle, 2 = nose)
  S.rocketA = [
    ['....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....', '...XXXXXXXXXX...', '..XXXXXXXXXXXX..',
     '.XXXXXXXXXXXXXX.', 'XXX.XXXXXXXX.XXX', 'XX..XXXXXXXX..XX', 'XX..XXXXXXXX..XX', 'X...XXXXXXXX...X', 'X...XXXXXXXX...X',
     '.....XXXXXX.....', '.....RRRRRR.....', '....RRRRRRRR....', '....RRRRRRRR....'],
    ['....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....', '....RRRRRRRR....', '....XXXXXXXX....', '....XXXXXXXX....',
     '....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....',
     '....RRRRRRRR....', '....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....'],
    ['.......XX.......', '......XXXX......', '......XXXX......', '.....XXXXXX.....', '.....XXXXXX.....', '....XXXXXXXX....',
     '....XXXXXXXX....', '....XXXXXXXX....', '....XXX..XXX....', '....XX.RR.XX....', '....XX.RR.XX....', '....XXX..XXX....',
     '....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....', '....XXXXXXXX....']
  ];
  S.rocketB = [
    ['..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '.XXXXXXXXXXXXXX.',
     'XXXXXXXXXXXXXXXX', 'XX.XXXXXXXXXX.XX', 'XX..XXXXXXXX..XX', 'XX...RRRRRR...XX', 'XX...RRRRRR...XX', 'XX....RRRR....XX',
     'XX............XX', 'XX............XX', 'XX............XX', 'XXX..........XXX'],
    ['..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..RRXXXXXXXXRR..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..',
     '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..',
     '..XXXXXXXXXXXX..', '..RRXXXXXXXXRR..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..'],
    ['................', '................', '......XXXX......', '....XXXXXXXX....', '...XXXXXXXXXX...', '...XXXXXXXXXX...',
     '..XXXX.RR.XXXX..', '..XXX.RRRR.XXX..', '..XXX.RRRR.XXX..', '..XXXX.RR.XXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..',
     '..RRRRRRRRRRRR..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..', '..XXXXXXXXXXXX..']
  ];

  // aliens (X = tinted)
  S.meteor = [
    ['..........XXXX..', '..X.X.X..XXXXXX.', '.X.X.X.XXXXXXXXX', 'X.X.X.XXXXXXXXXX', '.X.X.X.XXXXXXXXX', '..X.X.X..XXXXXX.', '..........XXXX..'],
    ['..........XXXX..', '.X.X.X...XXXXXX.', 'X.X.X.X.XXXXXXXX', '.X.X.X.XXXXXXXXX', 'X.X.X.X.XXXXXXXX', '.X.X.X...XXXXXX.', '..........XXXX..']
  ];
  S.ball = [
    ['...XXXXXX...', '.XXXXXXXXXX.', '.XX..XXXXXX.', 'XX....XXXXXX', 'XX....XXXXXX', 'XXX..XXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXX.XX', 'XXXXXXXX..XX', '.XXXXXXX.XX.', '.XXXXXXXXXX.', '...XXXXXX...'],
    ['...XXXXXX...', '.XXXXXXXXXX.', '.XXXXXX..XX.', 'XXXXXX....XX', 'XXXXXX....XX', 'XXXXXXX..XXX', 'XXXXXXXXXXXX', 'XX.XXXXXXXXX', 'XX..XXXXXXXX', '.XX.XXXXXXX.', '.XXXXXXXXXX.', '...XXXXXX...']
  ];
  S.blob = [
    ['....XXXX....', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XX..XX..XX.', 'XXX..XX..XXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXX.XXXX.XXX', '.XXX....XXX.', '.X.X.XX.X.X.', 'X..X.XX.X..X', '...X....X...'],
    ['....XXXX....', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XX..XX..XX.', 'XXX..XX..XXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXX....XXXX', '.XXXXXXXXXX.', '..X.X..X.X..', '.X..X..X..X.', 'X...X..X...X']
  ];
  S.saucer = [
    ['......XXXX......', '....XX....XX....', '...XXXXXXXXXX...', 'XXXXXXXXXXXXXXXX', 'X.XX.XX.XX.XX.XX', 'XXXXXXXXXXXXXXXX', '..XXXXXXXXXXXX..', '....X......X....'],
    ['......XXXX......', '....XX....XX....', '...XXXXXXXXXX...', 'XXXXXXXXXXXXXXXX', 'XX.XX.XX.XX.XX.X', 'XXXXXXXXXXXXXXXX', '..XXXXXXXXXXXX..', '.....X....X.....']
  ];
  // pickups
  S.fuel = ['...WWWWWW...', '..WW....WW..', '.MMMMMMMMMM.', 'MMMMMMMMMMMM', 'MM.WWW.MMMMM', 'MM.W...MMMMM', 'MM.WW..MMMMM', 'MM.W...MMMMM', 'MM.W...MMMMM', 'MMMMMMMMMMMM', '.MMMMMMMMMM.', '..MM....MM..'];
  S.gem = ['...CC...', '..CWCC..', '.CWCCCC.', 'CWCCCCCC', 'CCCCCCCC', '.CCCCCC.', '..CCCC..', '...CC...'];
  S.bar = ['...YYYYYYYY.', '..YWYYYYYYY.', '.YWYYYYYYYY.', 'YYYYYYYYYYY.', 'YYYYYYYYYYY.', 'YYYYYYYYYY..'];
  S.orb = ['..GGGG..', '.GWWGGG.', 'GWGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', '.GGGGGG.', '..GGGG..'];

  const cache = new Map();
  // Returns a canvas for sprite rows; tint replaces X (or all colours when tintAll); fill: {rows, char} colours rows >= rows with char
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
      if (ch === '.') continue;
      if (tint && (tintAll || ch === 'X')) ch = tint;
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

  window.RR = { PAL, S, F, sprite, text, textW };
})();
