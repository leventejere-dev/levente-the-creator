/* LEVENTE — THE CREATOR · render/icons.js — a Teremtő-sáv képpont-ikonjai (egységes stílus, emoji nélkül) */
(function (LW) {
  'use strict';
  const C = { w: '#f1e5c4', g: '#e0b15a', t: '#5ac8b8', r: '#d75a4a', o: '#ff8a2a', y: '#ffd24a', b: '#6a9fd8', k: '#2a2622', s: '#9a9a96', e: '#5aa04a', d: '#3a6a34', p: '#e07a9a', v: '#8a6a3c', i: '#c9d6f0', m: '#8a3aa8' };
  // 11×11 rács; '.' = üres, betűk = szín a C táblából
  const ICONS = {
    rain: ['..sssss....', '.sssssssss.', 'sssssssssss', '.sssssssss.', '...........', '.b..b..b...', '..b..b..b..', '...........', 'b..b..b....', '.b..b..b...', '...........'],
    storm: ['..sssss....', '.sssssssss.', 'sssssssssss', '.sssssssss.', '.....yy....', '....yy.....', '...yyyy....', '.....yy....', '....yy.....', '...yy......', '...........'],
    snow: ['.....i.....', '..i..i..i..', '...i.i.i...', '....iii....', '.iiiiiiiii.', '....iii....', '...i.i.i...', '..i..i..i..', '.....i.....', '...........', '...........'],
    clear: ['.....y.....', '..y..y..y..', '...yyyyy...', '..yyyyyyy..', 'y.yyyyyyy.y', 'yyyyyyyyyyy', 'y.yyyyyyy.y', '..yyyyyyy..', '...yyyyy...', '..y..y..y..', '.....y.....'],
    lightning: ['.....yyy...', '....yyy....', '...yyy.....', '..yyyyyy...', '....yyy....', '...yyy.....', '..yyy......', '..yy.......', '.yy........', '.y.........', '...........'],
    fire: ['.....o.....', '....oo.....', '....ooo....', '...oooo.o..', '...ooooo...', '..ooyyoo...', '..oyyyyoo..', '.ooyyyyoo..', '.ooyyyyoo..', '..ooyyoo...', '...oooo....'],
    forest: ['....eee....', '...eeeee...', '..eeeeeee..', '..eeeeeee..', '.eeeeeeeee.', '.eeeeeeeee.', '..eeeeeee..', '....vvv....', '....vvv....', '....vvv....', '..ddddddd..'],
    food: ['....d.d....', '.....d.....', '...rr.rr...', '..rrrr rrr.', '..rrrr.rrr.', '...rr.rrr..', '.....rr....', '....rrrr...', '....rrrr...', '.....rr....', '...........'],
    animals: ['..v.....v..', '.vv.....vv.', '.vvv...vvv.', '..vvvvvvv..', '..vvvvvvv..', '..vvkvkvv..', '..vvvvvvv..', '...vvvvv...', '...v...v...', '...v...v...', '...........'],
    resource: ['.......ss..', '......sss..', '.....sss...', '....sss....', '...sss.....', '..sss......', '.vvs.......', '.vv........', 'vv.........', '...........', '...........'],
    disease: ['...wwwww...', '..wwwwwww..', '.wwwwwwwww.', '.wkkwwwkkw.', '.wkkwwwkkw.', '.wwwwwwwww.', '..wwwkwww..', '...wwwww...', '...w.w.w...', '...w.w.w...', '...........'],
    healing: ['....ttt....', '....ttt....', '....ttt....', '.ttttttttt.', '.ttttttttt.', '.ttttttttt.', '....ttt....', '....ttt....', '....ttt....', '...........', '...........'],
    fertility: ['....ppp....', '...ppppp...', '.pp.ppp.pp.', 'pppp.y.pppp', 'pppp.y.pppp', '.pp.ppp.pp.', '...ppppp...', '....ppp....', '.....e.....', '....ee.....', '.....e.....'],
    earthquake: ['...........', 'vvvvv.vvvvv', 'vvvv.vvvvvv', 'vvvvv.vvvvv', 'vvvv.vvvvvv', 'vvv.vvvvvvv', 'vvvv.vvvvvv', 'vvvvv.vvvvv', 'vvvv.vvvvvv', 'vvvvv.vvvvv', '...........'],
    meteor: ['o..........', '.o.........', '..oo.......', '...oo......', '....oo.....', '.....sss...', '.....ssss..', '......ssss.', '......ssss.', '.......ss..', '...........'],
    spawn: ['.....y.....', '.....y.....', '..y..y..y..', '...y.y.y...', '.yyyyyyyyy.', '...y.y.y...', '..y..y..y..', '.....y.....', '.....y.....', '...........', '...........'],
    kill: ['...........', '.kk.....kk.', '..kk...kk..', '...kk.kk...', '....kkk....', '...kk.kk...', '..kk...kk..', '.kk.....kk.', '...........', '...........', '...........'],
    create: ['....gg.....', '...g..g....', '.ggggggggg.', '.g.......g.', '.ggggggggg.', '.g...g...g.', '.g...g...g.', '.g...g...g.', '.ggggggggg.', '...........', '...........'],
    destroy: ['.....v.....', '....vvv....', '...vvvvv...', '..vvvvvvv..', '.vvvvvvvvv.', '..s.....s..', '..s.r...s..', '..s..r..s..', '..s...r.s..', '..sssssss..', '...........'],
    light: ['.....w.....', '....www....', '....www....', '....www....', '....www....', '....www....', '....www....', '....www....', '...wwwww...', '..wwwwwww..', '...........'],
    orb: ['....iii....', '..iiiiiii..', '.iiwwiiiii.', '.iiwiiiiii.', 'iiiiiiiiiii', 'iiiiiiiiiii', 'iiiiiiiiiii', '.iiiiiiiii.', '.iiiiiiiii.', '..iiiiiii..', '....iii....'],
    monolith: ['....kkk....', '....kkk....', '....kkk....', '....kkk....', '....kkk....', '....kkk....', '....kkk....', '....kkk....', '....kkk....', '...bbbbb...', '...........'],
    avatar: ['....yyy....', '....yyy....', '.....y.....', '..yyyyyyy..', '.y..yyy..y.', '.y..yyy..y.', '....yyy....', '....yyy....', '...yy.yy...', '...yy.yy...', '...........'],
    go: ['...........', '......w....', '.......w...', '........w..', 'wwwwwwwwww.', '........w..', '.......w...', '......w....', '...........', '...........', '...........'],
    build: ['.....g.....', '....ggg....', '...ggggg...', '..ggggggg..', '.ggggggggg.', '..g.....g..', '..g.....g..', '..g..g..g..', '..g..g..g..', '..ggggggg..', '...........'],
    follow: ['..ww.......', '.www.......', '.ww........', '.....ww....', '....www....', '....ww.....', '........ww.', '.......www.', '.......ww..', '...........', '...........'],
    protect: ['..ttttttt..', '.ttttttttt.', '.ttt.t.ttt.', '.ttt.t.ttt.', '.ttttttttt.', '.ttttttttt.', '..ttttttt..', '...ttttt...', '....ttt....', '.....t.....', '...........'],
    explore: ['....www....', '..ww...ww..', '.w.......w.', '.w..www..w.', 'w..wwwww..w', '.w..www..w.', '.w.......w.', '..ww...ww..', '....www....', '...........', '...........'],
    leave: ['.wwwww.....', '.w...w.....', '.w...w..w..', '.w...w...w.', '.w...wwwwww', '.w...w...w.', '.w...w..w..', '.w...w.....', '.wwwww.....', '...........', '...........'],
    search: ['..wwww.....', '.w....w....', 'w......w...', 'w......w...', 'w......w...', '.w....w....', '..wwww.w...', '........w..', '.........w.', '..........w', '...........'],
  };
  const cache = new Map();
  const Icons = {
    /** 11×11 képpontos ikon <canvas> elemként (CSS-ben nagyítva, élesen). */
    el(name, size) {
      const rows = ICONS[name]; const cv = document.createElement('canvas'); cv.width = 11; cv.height = 11; cv.className = 'icon'; cv.style.width = cv.style.height = (size || 22) + 'px';
      if (!rows) return cv; const g = cv.getContext('2d');
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) { const ch = rows[y][x]; if (!ch || ch === '.' || ch === ' ') continue; g.fillStyle = C[ch] || '#fff'; g.fillRect(x, y, 1, 1); }
      return cv;
    },
    has(name) { return !!ICONS[name]; },
  };
  LW.Icons = Icons;
})(globalThis.LW || (globalThis.LW = {}));
