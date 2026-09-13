/* LEVENTE — THE CREATOR · render/sprites.js — procedural pixel-art sprites (no external assets) */
(function (LW) {
  'use strict';
  const PX = 8; // base pixels per tile

  const ADULT = {
    f: [
      ['..HHH..', '.HHHHH.', '.HSSSH.', '.HSESH.', '..SSS..', '.BBBBB.', 'BBBBBBB', '.BBBBB.', '.BBBBB.', '.L...L.', '.L...L.'],
      ['..HHH..', '.HHHHH.', '.HSSSH.', '.HSESH.', '..SSS..', '.BBBBB.', 'BBBBBBB', '.BBBBB.', '.BBBBB.', 'L.....L', 'L.....L'],
    ],
    m: [
      ['..HHH..', '.HHHH..', '.SSSS..', '.SES...', '..SS...', '.BBBBB.', 'BBBBBBB', '.BBBBB.', '.LLLLL.', '.L...L.', '.L...L.'],
      ['..HHH..', '.HHHH..', '.SSSS..', '.SES...', '..SS...', '.BBBBB.', 'BBBBBBB', '.BBBBB.', '.LLLLL.', 'L.....L', 'L.....L'],
    ],
  };
  const CHILD = [['.HHH.', '.SSS.', '.SES.', '.BBB.', 'BBBBB', '.BBB.', '.L.L.', '.L.L.'], ['.HHH.', '.SSS.', '.SES.', '.BBB.', 'BBBBB', '.BBB.', 'L...L', 'L...L']];
  const INFANT = [['.HH.', '.SS.', 'BBBB', '.BB.', '.LL.'], ['.HH.', '.SS.', 'BBBB', '.BB.', 'L..L']];
  const SLEEP = { adult: ['.HHSSBBBBBLL.', 'HHHSSBBBBBLLL'], child: ['HHSSBBBLL', 'HHSSBBBLL'], infant: ['HSBBL', 'HSBBL'] };

  const cache = new Map();
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function fromTemplate(rows, colors, flip) {
    const h = rows.length, w = rows[0].length; const c = canvas(w, h); const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h); const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = rows[y][flip ? w - 1 - x : x]; const col = colors[ch]; if (!col) continue; const o = (y * w + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
    ctx.putImageData(img, 0, 0); return c;
  }
  const parse = (s) => { const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(s); return m ? [+m[1], +m[2], +m[3]] : [200, 160, 120]; };
  const dark = (c, f) => c.map((v) => Math.round(v * f));

  const Sprites = {
    PX,
    /** Agent sprite (canvas) for a stage/frame/facing; cached. */
    agent(a, stage, frame, facing, sleeping) {
      const clothed = !!a.inv.clothes; const key = `${a.palette.skin}|${a.palette.hair}|${a.sex}|${stage}|${frame}|${facing}|${sleeping ? 1 : 0}|${clothed ? 1 : 0}`;
      let c = cache.get(key); if (c) return c;
      const skin = parse(a.palette.skin), hair = parse(a.palette.hair), eyes = parse(a.palette.eyes);
      const body = clothed ? [138, 96, 58] : (a.sex === 'f' ? [110, 74, 44] : [92, 62, 36]);
      const legs = clothed ? [92, 66, 40] : dark(skin, 0.8);
      const colors = { H: hair, S: skin, E: eyes, B: body, L: legs };
      let rows;
      const kind = stage === 'infant' ? 'infant' : (stage === 'child' || stage === 'adolescent') ? 'child' : 'adult';
      if (sleeping) rows = SLEEP[kind]; else rows = kind === 'infant' ? INFANT[frame] : kind === 'child' ? CHILD[frame] : ADULT[a.sex][frame];
      c = fromTemplate(rows, colors, facing === 0); cache.set(key, c); return c;
    },
    /** Draw a terrain tile at base resolution into ctx at (px,py). */
    tile(ctx, world, i, px, py) {
      const t = world.tiles, b = t.biome[i]; const B = LW.BIOME; const h = hash(i);
      const v = 0.94 + (h & 15) / 15 * 0.12; // per-tile variation
      let base;
      switch (b) {
        case B.OCEAN: { const e = t.elev[i] / world.cfg.world.seaLevel; base = [16 + e * 22, 42 + e * 44, 88 + e * 52]; break; }
        case B.LAKE: base = [44, 96, 150]; break;
        case B.RIVER: base = [60, 116, 168]; break;
        case B.BEACH: base = [216, 200, 156]; break;
        case B.GRASSLAND: base = [106, 152, 70]; break;
        case B.FOREST: base = [78, 124, 58]; break;
        case B.DENSE_FOREST: base = [54, 98, 48]; break;
        case B.HILLS: base = [126, 134, 86]; break;
        case B.MOUNTAIN: base = [118, 114, 106]; break;
        case B.PEAK: base = [196, 198, 204]; break;
        case B.MARSH: base = [72, 112, 92]; break;
        case B.TUNDRA: base = [150, 158, 140]; break;
        case B.DESERT: base = [212, 186, 122]; break;
        case B.SAVANNA: base = [158, 156, 82]; break;
        default: base = [100, 100, 100];
      }
      const col = base.map((c) => Math.min(255, c * v));
      ctx.fillStyle = rgb(col); ctx.fillRect(px, py, PX, PX);
      const water = LW.isWaterBiome(b);
      if (water) {
        ctx.fillStyle = rgb(col.map((c) => Math.min(255, c + 18))); if (h & 1) ctx.fillRect(px + (h >> 1 & 7), py + (h >> 4 & 7), 2, 1);
        if (b !== B.OCEAN || t.elev[i] > world.cfg.world.seaLevel * 0.85) { ctx.fillStyle = rgb(col.map((c) => Math.min(255, c + 30))); if (h & 64) ctx.fillRect(px + (h >> 7 & 6), py + (h >> 10 & 7), 1, 1); }
        return;
      }
      // soft grass texture: one lighter and one darker speck
      ctx.fillStyle = rgb(col.map((c) => c * 0.9)); ctx.fillRect(px + (h >> 2 & 7), py + (h >> 5 & 7), 1, 1);
      ctx.fillStyle = rgb(col.map((c) => Math.min(255, c * 1.08))); ctx.fillRect(px + (h >> 9 & 7), py + (h >> 12 & 7), 1, 1);
      if (b === B.HILLS) { ctx.fillStyle = rgb(col.map((c) => c * 0.8)); ctx.fillRect(px + 1, py + 5, 3, 1); ctx.fillRect(px + 4, py + 2, 3, 1); }
      if (b === B.MOUNTAIN || b === B.PEAK) { ctx.fillStyle = rgb(col.map((c) => c * 0.72)); ctx.fillRect(px + 1, py + 6, 2, 1); ctx.fillRect(px + 5, py + 3, 2, 1); ctx.fillRect(px + 3, py + 1, 1, 2); if (t.elev[i] > 0.8) { ctx.fillStyle = '#eceef4'; ctx.fillRect(px + 3, py + 1, 2, 2); ctx.fillRect(px + 6, py + 0, 1, 1); } }
      if (b === B.DESERT) { ctx.fillStyle = rgb([228, 204, 146]); ctx.fillRect(px + (h >> 3 & 6), py + (h >> 7 & 7), 2, 1); }
      if (b === B.MARSH) { ctx.fillStyle = 'rgb(64,104,142)'; ctx.fillRect(px + (h >> 3 & 6), py + (h >> 7 & 6), 2, 1); ctx.fillStyle = 'rgb(96,140,90)'; ctx.fillRect(px + (h >> 11 & 7), py + (h >> 14 & 7), 1, 2); }
      if (b === B.BEACH) { ctx.fillStyle = 'rgb(236,224,186)'; ctx.fillRect(px + (h >> 4 & 7), py + (h >> 8 & 7), 1, 1); }
      // berries / edible vegetation — only where there is plenty
      if (t.veg[i] > 110 && (b === B.GRASSLAND || b === B.FOREST || b === B.DENSE_FOREST || b === B.SAVANNA || b === B.MARSH)) { ctx.fillStyle = (h & 64) ? '#c8405a' : '#8a3aa8'; ctx.fillRect(px + (h >> 1 & 6) + 1, py + (h >> 6 & 6) + 1, 1, 1); if (t.veg[i] > 190) ctx.fillRect(px + (h >> 9 & 6) + 1, py + (h >> 12 & 6) + 1, 1, 1); }
      // trees
      const tr = t.trees[i]; const n = tr > 170 ? 2 : tr > 60 ? 1 : 0; const cold = b === B.TUNDRA || t.baseTemp[i] < 6;
      if (n) { tree(ctx, px + 1 + (h >> 3 & 2), py + 1 + (h >> 6 & 2), h, cold, tr > 120); if (n > 1) tree(ctx, px + 4 + (h >> 8 & 1), py + 3 + (h >> 10 & 1), h >> 4, cold, true); }
      else if (tr > 25) { ctx.fillStyle = cold ? '#4a6a52' : '#3e7a3c'; ctx.fillRect(px + (h >> 2 & 6) + 1, py + (h >> 5 & 6) + 1, 2, 1); }
      // surface stone
      if (t.stone[i] > 100 && !(b === B.MOUNTAIN || b === B.PEAK)) { ctx.fillStyle = '#9c9c98'; ctx.fillRect(px + (h >> 4 & 6), py + (h >> 10 & 6), 2, 1); ctx.fillStyle = '#7c7c78'; ctx.fillRect(px + (h >> 4 & 6) + 1, py + (h >> 10 & 6) + 1, 1, 1); }
      // known deposits
      if (t.depType[i] && t.depKnown[i]) { const DC = { 1: '#b06a3a', 2: '#3c3c44', 3: '#f0f0f0', 4: '#1a1a1a', 5: '#3aa06a', 6: '#8090a0', 7: '#a04a2a', 8: '#f0c020', 9: '#e070ff', 10: '#302020' }; ctx.fillStyle = DC[t.depType[i]]; ctx.fillRect(px + 2, py + 5, 2, 1); ctx.fillRect(px + 5, py + 2, 1, 2); if (t.depKnown[i] >= 2) ctx.fillRect(px + 3, py + 3, 2, 2); }
      // paths
      if (t.path[i]) {
        ctx.fillStyle = t.path[i] === 1 ? rgb(col.map((c, k) => c * 0.82 + [36, 26, 10][k] * 0.6)) : t.path[i] === 2 ? '#a8926a' : '#8a7a62';
        ctx.fillRect(px + 3, py + 3, 2, 2);
        const w = world.w; const x = i % w, y = (i / w) | 0;
        const pAt = (xx, yy) => world.inBounds(xx, yy) && t.path[world.idx(xx, yy)] > 0;
        if (pAt(x - 1, y)) ctx.fillRect(px, py + 3, 3, 2); if (pAt(x + 1, y)) ctx.fillRect(px + 5, py + 3, 3, 2); if (pAt(x, y - 1)) ctx.fillRect(px + 3, py, 2, 3); if (pAt(x, y + 1)) ctx.fillRect(px + 3, py + 5, 2, 3);
      }
      // burnt
      if (t.burnt[i]) { ctx.fillStyle = `rgba(20,16,12,${0.35 + t.burnt[i] / 400})`; ctx.fillRect(px, py, PX, PX); ctx.fillStyle = '#3a3230'; ctx.fillRect(px + (h & 5) + 1, py + (h >> 3 & 5) + 1, 1, 2); }
      // snow
      if (t.snow[i] > 40) { ctx.fillStyle = `rgba(236,240,250,${Math.min(0.92, t.snow[i] / 255 + 0.2)})`; ctx.fillRect(px, py, PX, PX); ctx.fillStyle = 'rgba(200,210,230,0.5)'; ctx.fillRect(px + (h & 7), py + (h >> 3 & 7), 1, 1); }
    },
    /** Building sprite drawn at base resolution centered on tile (px,py). */
    building(ctx, b, px, py, tick) {
      const p = b.progress; const done = p >= 1;
      const s = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(px + x, py + y, w, h); };
      switch (b.kind) {
        case 'campfire': s('#6b6b66', 1, 5, 6, 2); s('#8a8a84', 1, 5, 1, 1); s('#8a8a84', 6, 5, 1, 1); s('#5a3a20', 2, 4, 4, 1); s('#6a4a28', 3, 3, 2, 2); if (!b.lit && done) s('#2a2a2a', 3, 3, 2, 2); if (!done) s('rgba(255,255,255,0.35)', 0, 0, 8, Math.round(8 * (1 - p))); break;
        case 'lean_to': s('#4a3220', 0, 7, 8, 1); s('#5a3c22', 1, 6, 6, 1); s('#7a5a34', 2, 5, 4, 1); s('#8a6a3c', 3, 4, 3, 1); s('#6a4a2c', 3, 3, 2, 1); s('#2a1a10', 4, 6, 2, 1); if (!done) s('rgba(255,255,255,0.4)', 0, 0, 8, Math.round(8 * (1 - p))); break;
        case 'hut': s('#4a3a26', 1, 4, 6, 4); s('#a0865a', 2, 5, 4, 2); s('#5a4a30', 2, 1, 4, 1); s('#6a5a38', 1, 2, 6, 2); s('#3a2a1a', 3, 6, 2, 2); s('#2a1a10', 3, 5, 2, 1); if (b.residents.length && LW.Time.isNight(tick)) s('#ffcc66', 5, 5, 1, 1); if (!done) s('rgba(255,255,255,0.4)', 0, 0, 8, Math.round(8 * (1 - p))); break;
        case 'stone_house': s('#8a8a86', 0, 3, 8, 5); s('#a0a09a', 1, 4, 6, 3); s('#5a3a26', 0, 1, 8, 2); s('#6a4a30', 1, 0, 6, 1); s('#3a2a1a', 3, 5, 2, 3); s('#2a2a2a', 6, 4, 1, 1); if (b.residents.length && LW.Time.isNight(tick)) s('#ffd070', 6, 4, 1, 1); if (!done) s('rgba(255,255,255,0.4)', 0, 0, 8, Math.round(8 * (1 - p))); break;
        case 'storage_pit': s('#4a3a28', 1, 2, 6, 5); s('#7a6a4a', 2, 3, 4, 3); s('#5a4a30', 2, 1, 4, 1); if (!done) s('rgba(255,255,255,0.4)', 0, 0, 8, Math.round(8 * (1 - p))); break;
        case 'farm_plot': s('#6a4a2a', 0, 0, 8, 8); for (let r = 1; r < 8; r += 2) s(b.planted ? (b.crop > 0.8 ? '#d4b04a' : '#7ab04a') : '#5a3a1a', 0, r, 8, 1); if (!done) s('rgba(255,255,255,0.4)', 0, 0, 8, Math.round(8 * (1 - p))); break;
        case 'monolith': s('#101018', 3, 0, 2, 8); s('#2a2a44', 3, 0, 1, 8); s('#5060a0', 2, 7, 4, 1); break;
        case 'light': s('rgba(255,255,220,0.8)', 3, 0, 2, 8); s('rgba(255,255,255,0.9)', 3, 0, 1, 8); break;
        case 'orb': { const f = (tick % 8) / 8; s('rgba(180,220,255,0.9)', 3, 2, 2, 2); s(`rgba(200,240,255,${0.3 + f * 0.4})`, 2, 1, 4, 4); break; }
        case 'avatar': s('#fff7d0', 3, 0, 2, 2); s('#ffe8a0', 2, 2, 4, 4); s('#ffd070', 3, 6, 2, 2); break;
      }
    },
    flame(ctx, px, py, tick, size = 1) {
      const f = tick & 3; const cols = ['#ffd24a', '#ff8a2a', '#ff4a1a'];
      ctx.fillStyle = cols[f % 3]; ctx.fillRect(px + 3, py + 1 + (f & 1), 2 * size, 3 * size);
      ctx.fillStyle = cols[(f + 1) % 3]; ctx.fillRect(px + 2 + (f & 1), py + 2, size, 2 * size); ctx.fillRect(px + 5 - (f & 1), py + 2, size, 2 * size);
      ctx.fillStyle = '#fff2a0'; ctx.fillRect(px + 3 + (f >> 1), py + 3, 1, 1);
    },
    wildfire(ctx, px, py, tick, intensity) {
      const f = (tick + px) & 3; const n = 2 + Math.round(intensity * 3);
      for (let k = 0; k < n; k++) { const x = (hash(px * 7 + py * 13 + k + (tick >> 1)) & 7), y = (hash(px * 3 + py * 5 + k * 11 + (tick >> 1)) & 7); ctx.fillStyle = k % 3 === 0 ? '#ffd24a' : k % 3 === 1 ? '#ff7a2a' : '#ff3a1a'; ctx.fillRect(px + x, py + Math.min(7, y + (f & 1)), 1, 2); }
      ctx.fillStyle = 'rgba(40,30,30,0.35)'; ctx.fillRect(px, py, 8, 8);
    },
    itemPile(ctx, px, py, g) { const keys = Object.keys(g); if (!keys.length) return; const col = g.wood ? '#8a5a2a' : g.stone ? '#8a8a86' : g.berries ? '#c8405a' : g.grain ? '#d4b04a' : '#9a8a6a'; ctx.fillStyle = col; ctx.fillRect(px + 3, py + 5, 2, 2); ctx.fillRect(px + 2, py + 6, 4, 1); },
  };

  function tree(ctx, x, y, h, cold, big) {
    const canopy = cold ? '#38584a' : (h & 1) ? '#2c6630' : '#347238'; const canopy2 = cold ? '#4c6c5c' : '#4a8c46'; const shadow = cold ? '#2a4238' : '#204a24';
    ctx.fillStyle = shadow; ctx.fillRect(x, y + 3, 3, 1);
    ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 1, y + 2, 1, 2);
    ctx.fillStyle = canopy; ctx.fillRect(x, y, 3, 2); ctx.fillRect(x + 1, y - 1, 1, 1);
    if (big) { ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x + 3, y + 1, 1, 1); }
    ctx.fillStyle = canopy2; ctx.fillRect(x + 1, y, 1, 1); if (big) ctx.fillRect(x, y - 1, 1, 1);
  }
  function hash(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return h >>> 0; }
  const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

  LW.Sprites = Sprites;
})(globalThis.LW || (globalThis.LW = {}));
