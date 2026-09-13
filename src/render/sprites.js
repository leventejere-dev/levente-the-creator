/* LEVENTE — THE CREATOR · render/sprites.js — eljárással rajzolt pixelgrafika (külső kép nincs)
 * 16 képpont / mező: rétegzett talajtextúrák, lombkoronák, hullámok, hófedte csúcsok; az emberek
 * 12–24 képpont magas, körvonalas alakok (fej, haj, test, karok, lábak, ruha, szerszám), járó animációval.
 */
(function (LW) {
  'use strict';
  const PX = 16; // képpont / mező

  const cache = new Map();
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const parse = (s) => { const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(s); if (m) return [+m[1], +m[2], +m[3]]; const h = /^#([0-9a-f]{6})$/i.exec(s); if (h) return [parseInt(h[1].slice(0, 2), 16), parseInt(h[1].slice(2, 4), 16), parseInt(h[1].slice(4, 6), 16)]; return [200, 160, 120]; };
  const mul = (c, f) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
  const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  function hash(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return h >>> 0; }

  // ---------------------------------------------------------------- emberek
  /** Egy ember rajza egy kis vászonra: paraméterek a génekből, a korból, a holmiból. */
  function drawPerson(a, stage, frame, facing, sleeping) {
    const skin = parse(a.palette.skin), hair0 = parse(a.palette.hair), eyes = parse(a.palette.eyes);
    const ap = a.appearance || (a.genes && a.genes.appearance) || { height: 0.5, build: 0.5, hairShade: 0.5, hairHue: 0.5 };
    const h = hash(a.id * 97 + 13);
    const elder = stage === 'elder'; const hair = elder ? mix(hair0, [200, 200, 205], 0.75) : hair0;
    const clothed = !!a.inv.clothes; const f = a.sex === 'f';
    const kind = stage === 'infant' ? 'infant' : (stage === 'child' || stage === 'adolescent') ? 'child' : 'adult';
    const H = kind === 'infant' ? 9 : kind === 'child' ? 15 + (stage === 'adolescent' ? 3 : 0) : 20 + Math.round(ap.height * 4); // teljes magasság
    const W = kind === 'infant' ? 6 : kind === 'child' ? 8 : 9 + Math.round(ap.build * 3) - (f ? 1 : 0);
    const cw = W + 6, ch = H + 3;
    const c = canvas(sleeping ? Math.max(cw, H + 4) : cw, sleeping ? 12 : ch); const g = c.getContext('2d');
    const fill = (col, x, y, w, hh) => { g.fillStyle = typeof col === 'string' ? col : rgb(col); g.fillRect(x, y, w, hh); };
    const skinD = mul(skin, 0.78), hairD = mul(hair, 0.7), hairL = mul(hair, 1.25);
    const clothCol = clothed ? [[150, 108, 62], [120, 96, 70], [96, 110, 70], [140, 84, 60], [110, 100, 90]][h % 5] : (f ? [120, 82, 48] : [100, 68, 40]);
    const clothD = mul(clothCol, 0.75);
    if (sleeping) {
      // fekvő alak: fej balra, test és takaró jobbra
      const len = H - 2; const y = 4; const headR = kind === 'infant' ? 2 : 3;
      fill('rgba(0,0,0,0.25)', 1, y + 5, len + 2, 2);
      fill(hairD, 1, y - 1, headR * 2, headR * 2 + 1); fill(hair, 2, y - 1, headR * 2 - 1, headR); fill(skin, 2, y + 1, headR * 2 - 1, headR + 1);
      fill(clothD, headR * 2 + 1, y, len - headR * 2, headR * 2 + 2); fill(clothCol, headR * 2 + 2, y + 1, len - headR * 2 - 2, headR * 2);
      fill(skinD, len - 1, y + 1, 3, 2); fill(skin, len, y + 1, 2, 1);
      return outline(c);
    }
    const cx = Math.floor(cw / 2); const top = 2;
    const headW = kind === 'infant' ? 4 : kind === 'child' ? 5 : 6, headH = headW;
    const legH = Math.round(H * 0.34), torsoH = H - headH - legH - 1;
    const bodyW = Math.max(3, W - 4); const shoulder = kind === 'adult' ? bodyW + (f ? 0 : 1) : bodyW;
    const walk = frame === 1 ? 1 : frame === 2 ? -1 : 0; // lábak és karok lengése
    const dir = facing === 0 ? -1 : 1;
    // árnyék
    fill('rgba(0,0,0,0.28)', cx - Math.ceil(bodyW / 2) - 1, top + headH + torsoH + legH - 1, bodyW + 3, 2);
    // lábak
    const ly = top + headH + torsoH; const legW = Math.max(1, Math.round(bodyW / 3));
    const legCol = clothed && kind === 'adult' ? mul(clothCol, 0.9) : skin;
    fill(mul(legCol, 0.8), cx - legW - 1 + walk * dir, ly, legW, legH); fill(legCol, cx + 1 - walk * dir, ly, legW, legH);
    fill(mul(legCol, 0.6), cx - legW - 1 + walk * dir, ly + legH - 1, legW, 1); fill(mul(legCol, 0.6), cx + 1 - walk * dir, ly + legH - 1, legW, 1);
    // törzs
    const ty = top + headH;
    fill(clothD, cx - Math.ceil(shoulder / 2), ty, shoulder, torsoH);
    fill(clothCol, cx - Math.ceil(shoulder / 2) + 1, ty, shoulder - 1, torsoH - 1);
    if (kind === 'adult' && !clothed) { fill(skin, cx - Math.ceil(shoulder / 2) + 1, ty, shoulder - 1, Math.max(1, Math.round(torsoH * 0.55))); fill(skinD, cx + (f ? 0 : 1), ty + 1, 1, Math.max(1, Math.round(torsoH * 0.4))); } // felsőtest szabadon, ágyékkötő alul
    if (clothed && kind === 'adult') fill(mul(clothCol, 0.55), cx - Math.ceil(shoulder / 2) + 1, ty + Math.round(torsoH * 0.6), shoulder - 1, 1); // öv
    if (f && kind === 'adult') fill(clothed ? clothCol : [120, 82, 48], cx - Math.ceil(shoulder / 2), ty + torsoH - 2, shoulder, 2);
    // karok
    const armH = Math.max(3, torsoH - 2);
    fill(skinD, cx - Math.ceil(shoulder / 2) - 1, ty + 1 + (walk > 0 ? 1 : 0), 1, armH); fill(skin, cx + Math.floor(shoulder / 2), ty + 1 + (walk < 0 ? 1 : 0), 1, armH);
    // fej
    const hy = top; const hx = cx - Math.ceil(headW / 2);
    fill(skinD, hx, hy, headW, headH); fill(skin, hx + 1, hy + 1, headW - 2, headH - 1);
    // haj: forma a génekből
    const style = (h >> 3) % 3; // 0 rövid, 1 hosszú, 2 kontyos / bozontos
    fill(hairD, hx, hy - 1, headW, 2); fill(hair, hx + 1, hy - 1, headW - 2, 2); fill(hairL, hx + 1, hy - 1, 2, 1);
    fill(hair, hx, hy + 1, 1, 2); fill(hair, hx + headW - 1, hy + 1, 1, 2);
    if (style === 1 || (f && style !== 0)) { fill(hairD, hx - (dir < 0 ? 1 : 0), hy + 1, 1, headH + 1); fill(hairD, hx + headW - (dir > 0 ? 0 : 1), hy + 1, 1, headH + 1); }
    if (style === 2 && f) fill(hair, hx + headW - 1, hy - 2, 2, 2);
    if (style === 2 && !f) { fill(hair, hx - 1, hy, 1, 2); fill(hair, hx + headW, hy, 1, 2); }
    if (!f && kind === 'adult' && ((h >> 5) % 3 === 0 || elder)) fill(hairD, hx + 1, hy + headH - 1, headW - 2, 1); // szakáll
    // szem és száj
    const ey = hy + Math.round(headH * 0.45); const ex = dir > 0 ? hx + headW - 2 : hx + 1;
    fill(eyes, ex, ey, 1, 1); fill(eyes, ex - dir * 2, ey, 1, 1);
    fill(mul(skin, 0.6), dir > 0 ? hx + headW - 3 : hx + 2, ey + 2, 2, 1);
    // eszközök
    if (a.inv.spear && kind === 'adult') { fill([112, 80, 46], cx + dir * (Math.floor(shoulder / 2) + 1), ty - 4, 1, torsoH + legH + 2); fill([150, 150, 148], cx + dir * (Math.floor(shoulder / 2) + 1), ty - 6, 1, 2); }
    if (a.inv.basket && kind !== 'infant') { fill([176, 140, 88], cx - dir * (Math.floor(shoulder / 2) + 3), ty + 1, 3, 4); fill([140, 104, 60], cx - dir * (Math.floor(shoulder / 2) + 3), ty + 2, 3, 1); }
    if (a.inv.handaxe && !a.inv.spear && kind === 'adult') fill([120, 120, 118], cx + dir * (Math.floor(shoulder / 2) + 1), ty + armH - 1, 2, 2);
    return outline(c);
  }
  /** 1 képpontos sötét körvonal a sziluett köré — így kivehető az alak a talajon. */
  function outline(c) {
    const g = c.getContext('2d'); const w = c.width, h = c.height; const img = g.getImageData(0, 0, w, h); const d = img.data; const out = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (d[o + 3] > 40) continue; let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const p = (ny * w + nx) * 4; if (d[p + 3] > 200) { near = true; break; } } if (near) { out[o] = 20; out[o + 1] = 14; out[o + 2] = 10; out[o + 3] = 170; } }
    img.data.set(out); g.putImageData(img, 0, 0); return c;
  }

  const Sprites = {
    PX,
    /** Ember-sprite (vászon) életszakasz/képkocka/irány szerint; gyorsítótárazva. */
    agent(a, stage, frame, facing, sleeping) {
      const key = `${a.id}|${a.palette.skin}|${a.palette.hair}|${stage}|${frame}|${facing}|${sleeping ? 1 : 0}|${a.inv.clothes ? 1 : 0}|${a.inv.spear ? 1 : 0}|${a.inv.basket ? 1 : 0}|${a.inv.handaxe ? 1 : 0}`;
      let c = cache.get(key); if (c) return c;
      c = drawPerson(a, stage, frame, facing, sleeping); cache.set(key, c); if (cache.size > 4000) cache.clear(); return c;
    },
    /** Egy mező talaja alap-felbontáson a ctx-re (px,py) helyre. */
    tile(ctx, world, i, px, py) {
      const t = world.tiles, b = t.biome[i]; const B = LW.BIOME; const h = hash(i); const h2 = hash(i * 31 + 7);
      const fert = t.fert[i] / 255;
      const base = baseColor(world, i, b);
      const v = 0.95 + (h & 15) / 15 * 0.1;
      const col = mul(base, v);
      const s = (c, x, y, w, hh) => { ctx.fillStyle = typeof c === 'string' ? c : rgb(c); ctx.fillRect(px + x, py + y, w, hh); };
      s(col, 0, 0, PX, PX);
      // átmenet a szomszédok felé: raszteres sáv a szélén, ha más a talaj
      const x = i % world.w, y = (i / world.w) | 0;
      const nb = [[x - 1, y, 0], [x + 1, y, 1], [x, y - 1, 2], [x, y + 1, 3]];
      for (const [nx, ny, side] of nb) { if (!world.inBounds(nx, ny)) continue; const j = world.idx(nx, ny); const nbm = t.biome[j]; if (nbm === b) continue; const nc = mix(col, baseColor(world, j, nbm), LW.isWaterBiome(nbm) !== LW.isWaterBiome(b) ? 0.35 : 0.5); ctx.fillStyle = rgb(nc); for (let k = 0; k < PX; k++) { if (((k + side) & 1) === 0) continue; if (side === 0) ctx.fillRect(px, py + k, 2 - (k & 1), 1); else if (side === 1) ctx.fillRect(px + PX - 2 + (k & 1), py + k, 2 - (k & 1), 1); else if (side === 2) ctx.fillRect(px + k, py, 1, 2 - (k & 1)); else ctx.fillRect(px + k, py + PX - 2 + (k & 1), 1, 2 - (k & 1)); } }
      const water = LW.isWaterBiome(b);
      if (water) {
        // hullámok: világos taréj-vonalak, sötét mélység
        const light = mul(col, 1.22), dark = mul(col, 0.86);
        for (let k = 0; k < 3; k++) { const wx = (hash(i * 5 + k * 17) & 15), wy = (hash(i * 9 + k * 23) & 15); s(light, wx, wy, 3 + (k & 1), 1); if (k < 2) s(dark, (wx + 5) & 15, (wy + 3) & 15, 3, 1); }
        if (b === B.OCEAN && t.elev[i] < world.cfg.world.seaLevel * 0.7) { s(mul(col, 0.9), (h >> 4) & 15, (h >> 8) & 15, 2, 1); }
        // part menti világos sekély víz
        for (const [nx, ny] of nb) { if (!world.inBounds(nx, ny)) continue; if (!LW.isWaterBiome(t.biome[world.idx(nx, ny)])) { s('rgba(255,255,255,0.08)', 0, 0, PX, PX); break; } }
        return;
      }
      // talajrészletek
      const cold = b === B.TUNDRA || t.baseTemp[i] < 6;
      if (b === B.GRASSLAND || b === B.FOREST || b === B.DENSE_FOREST || b === B.SAVANNA || b === B.HILLS) {
        const g1 = mul(col, 0.86), g2 = mul(col, 1.12);
        for (let k = 0; k < 6; k++) { const gx = hash(i * 3 + k * 11) & 15, gy = hash(i * 7 + k * 13) & 15; s(k & 1 ? g1 : g2, gx, gy, 1, 2); }
        if (fert > 0.55 && t.veg[i] > 140 && (h2 & 7) === 0) { s((h2 >> 3) & 1 ? '#f0e070' : '#f4f0f0', (h2 >> 4) & 15, (h2 >> 8) & 15, 1, 1); } // virág
        if (b === B.HILLS) { const d = mul(col, 0.8); s(d, 1, 10, 6, 1); s(d, 2, 9, 3, 1); s(d, 8, 4, 6, 1); s(d, 10, 3, 3, 1); s(mul(col, 1.1), 3, 8, 2, 1); s(mul(col, 1.1), 11, 2, 2, 1); }
      }
      if (b === B.MOUNTAIN || b === B.PEAK) {
        const lit = mul(col, 1.18), sh = mul(col, 0.7), sh2 = mul(col, 0.55);
        s(sh, 2, 9, 7, 5); s(lit, 4, 5, 4, 4); s(sh2, 8, 7, 6, 6); s(lit, 9, 3, 3, 4); s(col, 6, 4, 2, 2); s(sh2, 1, 13, 4, 2); s(lit, 12, 2, 2, 1);
        if (b === B.PEAK || t.elev[i] > 0.8) { s('#eef0f6', 4, 3, 4, 3); s('#ffffff', 5, 2, 2, 1); s('#e2e6ee', 9, 2, 3, 2); }
      }
      if (b === B.DESERT) { const l = mul(col, 1.08), d = mul(col, 0.9); s(l, 0, 3, 10, 1); s(d, 0, 4, 12, 1); s(l, 5, 10, 11, 1); s(d, 4, 11, 12, 1); s(mul(col, 1.15), (h >> 3) & 15, (h >> 7) & 15, 1, 1); if ((h & 31) === 0) { s('#5a7a3a', 7, 6, 1, 3); s('#5a7a3a', 6, 7, 3, 1); } }
      if (b === B.MARSH) { s([54, 92, 128], 2 + ((h >> 2) & 6), 3 + ((h >> 5) & 6), 5, 3); s([64, 108, 148], 3 + ((h >> 2) & 6), 4 + ((h >> 5) & 6), 3, 1); s([50, 90, 60], 10, 6, 1, 4); s([50, 90, 60], 12, 8, 1, 4); s([70, 110, 70], 11, 5, 1, 2); s([88, 70, 40], 10, 5, 1, 1); }
      if (b === B.BEACH) { s(mul(col, 1.1), (h >> 4) & 15, (h >> 8) & 15, 1, 1); s(mul(col, 0.9), (h >> 12) & 15, (h >> 2) & 15, 2, 1); s(mul(col, 1.12), 3, 12, 6, 1); }
      if (b === B.TUNDRA) { s(mul(col, 0.85), 3, 4, 1, 2); s(mul(col, 0.85), 11, 9, 1, 2); s([120, 124, 118], 6, 11, 3, 2); s([150, 154, 148], 6, 11, 2, 1); }
      // bogyós bokrok — ahol bőven van ehető növény
      if (t.veg[i] > 110 && (b === B.GRASSLAND || b === B.FOREST || b === B.DENSE_FOREST || b === B.SAVANNA || b === B.MARSH)) {
        const bx = 1 + ((h >> 1) & 7), by = 7 + ((h >> 6) & 5); s([40, 96, 44], bx, by, 5, 3); s([60, 120, 56], bx + 1, by - 1, 3, 2);
        const berry = (h & 64) ? '#d0405a' : '#8a3aa8'; s(berry, bx + 1, by + 1, 1, 1); s(berry, bx + 3, by, 1, 1); if (t.veg[i] > 190) s(berry, bx + 2, by + 2, 1, 1);
      }
      // fák
      const tr = t.trees[i]; const n = tr > 170 ? 3 : tr > 110 ? 2 : tr > 60 ? 1 : 0;
      if (n) { const jx = (h >> 3) % 7, jy = (h >> 7) % 6; tree(ctx, px + 3 + jx, py + 4 + jy, h, cold, tr > 120 && (h & 4), b === B.SAVANNA); if (n > 1) tree(ctx, px + 9 + ((h >> 11) % 4), py + 7 + ((h >> 13) % 5), h >> 4, cold, (h >> 9) & 1, b === B.SAVANNA); if (n > 2) tree(ctx, px + 4 + ((h >> 15) % 5), py + 10 + ((h >> 17) % 3), h >> 8, cold, false, false); }
      else if (tr > 25) { s(cold ? [70, 100, 82] : [62, 122, 60], 2 + ((h >> 2) & 8), 3 + ((h >> 5) & 8), 3, 2); s(cold ? [90, 120, 100] : [84, 150, 78], 3 + ((h >> 2) & 8), 2 + ((h >> 5) & 8), 1, 1); }
      // felszíni kő
      if (t.stone[i] > 100 && !(b === B.MOUNTAIN || b === B.PEAK)) { const sx = (h >> 4) & 11, sy = (h >> 10) & 11; s([116, 116, 112], sx, sy + 1, 4, 2); s([150, 150, 146], sx + 1, sy, 2, 1); s([86, 86, 82], sx, sy + 2, 4, 1); }
      // ismert lelőhelyek
      if (t.depType[i] && t.depKnown[i]) { const DC = { 1: '#b06a3a', 2: '#3c3c44', 3: '#f0f0f0', 4: '#1a1a1a', 5: '#3aa06a', 6: '#8090a0', 7: '#a04a2a', 8: '#f0c020', 9: '#e070ff', 10: '#302020' }; s(DC[t.depType[i]], 4, 10, 3, 2); s(DC[t.depType[i]], 10, 4, 2, 3); if (t.depKnown[i] >= 2) { s('#5a4a3a', 5, 6, 6, 5); s(DC[t.depType[i]], 7, 7, 2, 2); } }
      // ösvények
      if (t.path[i]) {
        const pc = t.path[i] === 1 ? mix(col, [120, 96, 60], 0.45) : t.path[i] === 2 ? [168, 146, 106] : [138, 122, 98]; const pe = mul(pc, 0.85);
        s(pe, 5, 5, 6, 6); s(pc, 6, 6, 4, 4);
        const pAt = (xx, yy) => world.inBounds(xx, yy) && t.path[world.idx(xx, yy)] > 0;
        if (pAt(x - 1, y)) { s(pe, 0, 5, 6, 6); s(pc, 0, 6, 6, 4); } if (pAt(x + 1, y)) { s(pe, 10, 5, 6, 6); s(pc, 10, 6, 6, 4); } if (pAt(x, y - 1)) { s(pe, 5, 0, 6, 6); s(pc, 6, 0, 4, 6); } if (pAt(x, y + 1)) { s(pe, 5, 10, 6, 6); s(pc, 6, 10, 4, 6); }
      }
      // leégett föld
      if (t.burnt[i]) { s(`rgba(20,16,12,${0.35 + t.burnt[i] / 400})`, 0, 0, PX, PX); s('#3a3230', 2 + (h & 5), 3 + ((h >> 3) & 5), 1, 4); s('#3a3230', 9 + ((h >> 6) & 5), 6 + ((h >> 9) & 5), 3, 1); }
      // hó
      if (t.snow[i] > 40) { s(`rgba(236,240,250,${Math.min(0.92, t.snow[i] / 255 + 0.2)})`, 0, 0, PX, PX); s('rgba(255,255,255,0.7)', h & 15, (h >> 4) & 15, 1, 1); s('rgba(200,210,230,0.5)', (h >> 8) & 15, (h >> 12) & 15, 2, 1); }
    },
    /** Épület alap-felbontáson a (px,py) mezőre. */
    building(ctx, b, px, py, tick) {
      const p = b.progress; const done = p >= 1; const night = LW.Time.isNight(tick);
      const s = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(px + x, py + y, w, h); };
      const scaffold = () => { if (!done) { s('rgba(255,255,255,0.35)', 0, 0, 16, Math.round(16 * (1 - p))); s('#9a7a4a', 2, 2, 1, 12); s('#9a7a4a', 13, 2, 1, 12); } };
      switch (b.kind) {
        case 'campfire': s('rgba(0,0,0,0.25)', 3, 11, 10, 2); for (const [x, y] of [[3, 9], [6, 11], [9, 11], [12, 9], [4, 6], [11, 6], [7, 5]]) { s('#6b6b66', x, y, 3, 2); s('#8a8a84', x, y, 2, 1); } s('#5a3a20', 5, 8, 6, 2); s('#6a4a28', 6, 7, 4, 2); s('#3a2a1a', 6, 9, 4, 1); if (!b.lit && done) s('#2a2a2a', 6, 7, 4, 2); scaffold(); break;
        case 'lean_to': s('rgba(0,0,0,0.25)', 1, 13, 14, 2); s('#4a3220', 1, 12, 14, 2); s('#5a3c22', 2, 10, 12, 2); s('#7a5a34', 3, 8, 10, 2); s('#8a6a3c', 4, 6, 8, 2); s('#6a4a2c', 5, 4, 6, 2); s('#8a7a50', 3, 7, 1, 6); s('#8a7a50', 12, 7, 1, 6); s('#2a1a10', 6, 10, 5, 3); s('#a08a5a', 4, 5, 2, 1); s('#a08a5a', 10, 7, 2, 1); scaffold(); break;
        case 'hut': s('rgba(0,0,0,0.25)', 2, 13, 13, 2); s('#5a4630', 3, 8, 10, 6); s('#8a7048', 4, 9, 8, 4); s('#6a5638', 4, 12, 8, 1); s('#3a2a1a', 7, 10, 3, 4); s('#8a6a3a', 1, 6, 14, 2); s('#a08a54', 2, 4, 12, 2); s('#b09a60', 4, 2, 8, 2); s('#c0a868', 6, 1, 4, 1); s('#7a6238', 2, 5, 12, 1); s('#7a6238', 4, 3, 8, 1); if (b.residents.length && night) s('#ffcc66', 11, 10, 1, 2); scaffold(); break;
        case 'stone_house': s('rgba(0,0,0,0.25)', 1, 13, 15, 2); s('#8a8a86', 2, 7, 12, 7); s('#a0a09a', 3, 8, 10, 5); s('#7a7a76', 3, 10, 4, 1); s('#7a7a76', 8, 12, 4, 1); s('#5a3a26', 1, 4, 14, 3); s('#6a4a30', 2, 2, 12, 2); s('#7a5a38', 4, 1, 8, 1); s('#4a3020', 1, 6, 14, 1); s('#3a2a1a', 6, 9, 3, 5); s('#2a2a2a', 10, 9, 2, 2); if (b.residents.length && night) s('#ffd070', 10, 9, 2, 2); s('#6a6a66', 11, 0, 2, 3); scaffold(); break;
        case 'storage_pit': s('rgba(0,0,0,0.25)', 2, 12, 12, 2); s('#4a3a28', 2, 4, 12, 9); s('#6a5a40', 3, 5, 10, 7); s('#8a7a58', 4, 7, 8, 3); s('#5a4a30', 2, 3, 12, 1); s('#7a6a4a', 4, 2, 8, 1); s('#3a2a1a', 6, 9, 4, 2); scaffold(); break;
        case 'farm_plot': s('#6a4a2a', 0, 0, 16, 16); for (let r = 1; r < 16; r += 3) { s('#5a3a1a', 0, r, 16, 1); if (b.planted) { const c = b.crop > 0.8 ? '#d4b04a' : b.crop > 0.4 ? '#8ab848' : '#6a9a44'; for (let x = 1; x < 16; x += 3) { s(c, x, r - 1, 1, 2); if (b.crop > 0.8) s('#e8c860', x, r - 1, 1, 1); } } } scaffold(); break;
        case 'monolith': s('rgba(0,0,0,0.3)', 4, 14, 9, 2); s('#101018', 6, 0, 4, 15); s('#2a2a44', 6, 0, 1, 15); s('#5060a0', 5, 14, 6, 1); s('#3a3a5a', 9, 2, 1, 11); break;
        case 'light': s('rgba(255,255,220,0.75)', 6, 0, 4, 16); s('rgba(255,255,255,0.95)', 7, 0, 2, 16); s('rgba(255,255,220,0.35)', 4, 0, 8, 16); break;
        case 'orb': { const f = (tick % 8) / 8; s('rgba(180,220,255,0.9)', 6, 5, 4, 4); s(`rgba(200,240,255,${0.3 + f * 0.4})`, 4, 3, 8, 8); s('rgba(255,255,255,0.9)', 7, 6, 1, 1); break; }
        case 'avatar': s('rgba(255,240,200,0.4)', 3, 1, 10, 14); s('#fff7d0', 6, 1, 4, 4); s('#ffe8a0', 5, 5, 6, 7); s('#ffd070', 6, 12, 4, 3); break;
      }
    },
    flame(ctx, px, py, tick, size = 1) {
      const f = tick & 3; const cols = ['#ffd24a', '#ff8a2a', '#ff4a1a'];
      ctx.fillStyle = 'rgba(255,200,120,0.22)'; ctx.fillRect(px + 3, py + 1, 10, 9);
      ctx.fillStyle = cols[f % 3]; ctx.fillRect(px + 6, py + 2 + (f & 1), 4 * size, 6 * size);
      ctx.fillStyle = cols[(f + 1) % 3]; ctx.fillRect(px + 4 + (f & 1), py + 4, 2 * size, 4 * size); ctx.fillRect(px + 10 - (f & 1), py + 4, 2 * size, 4 * size);
      ctx.fillStyle = '#fff2a0'; ctx.fillRect(px + 7 + (f >> 1), py + 5, 2, 2);
    },
    wildfire(ctx, px, py, tick, intensity) {
      const f = (tick + px) & 3; const n = 3 + Math.round(intensity * 5);
      for (let k = 0; k < n; k++) { const x = (hash(px * 7 + py * 13 + k + (tick >> 1)) & 15), y = (hash(px * 3 + py * 5 + k * 11 + (tick >> 1)) & 15); ctx.fillStyle = k % 3 === 0 ? '#ffd24a' : k % 3 === 1 ? '#ff7a2a' : '#ff3a1a'; ctx.fillRect(px + x, py + Math.min(14, y + (f & 1)), 2, 3); }
      ctx.fillStyle = 'rgba(40,30,30,0.35)'; ctx.fillRect(px, py, 16, 16);
    },
    itemPile(ctx, px, py, g) { const keys = Object.keys(g); if (!keys.length) return; const col = g.wood ? '#8a5a2a' : g.stone ? '#8a8a86' : g.berries ? '#c8405a' : g.grain ? '#d4b04a' : '#9a8a6a'; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + 4, py + 12, 8, 2); ctx.fillStyle = col; ctx.fillRect(px + 6, py + 8, 4, 4); ctx.fillRect(px + 4, py + 10, 8, 3); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(px + 6, py + 8, 2, 1); },
  };

  function baseColor(world, i, b) {
    const t = world.tiles; const B = LW.BIOME; const moist = t.moist[i] / 255, fert = t.fert[i] / 255;
    switch (b) {
      case B.OCEAN: { const e = t.elev[i] / world.cfg.world.seaLevel; return [14 + e * 26, 40 + e * 50, 84 + e * 60]; }
      case B.LAKE: return [42, 98, 152]; case B.RIVER: return [58, 118, 170]; case B.BEACH: return [218, 202, 156];
      case B.GRASSLAND: return mix([112, 156, 70], [92, 140, 66], moist * 0.6 + fert * 0.3);
      case B.FOREST: return mix([80, 126, 58], [66, 112, 52], moist * 0.7);
      case B.DENSE_FOREST: return [52, 96, 46]; case B.HILLS: return mix([128, 136, 86], [110, 124, 78], moist * 0.6);
      case B.MOUNTAIN: return [118, 114, 106]; case B.PEAK: return [196, 198, 204]; case B.MARSH: return [70, 110, 90];
      case B.TUNDRA: return [150, 158, 140]; case B.DESERT: return [214, 188, 124]; case B.SAVANNA: return mix([162, 158, 84], [140, 150, 78], fert * 0.6);
      default: return [100, 100, 100];
    }
  }
  /** Lombkorona: kerekded, háromtónusú (árnyék · szín · fény), törzzsel és talajárnyékkal; hidegben fenyő, szavannán lapos. */
  function tree(ctx, x, y, h, cold, big, flat) {
    const r = big ? 4 : 3; const shade = cold ? [40, 66, 54] : (h & 1) ? [34, 92, 40] : [40, 104, 46]; const mid = cold ? [54, 88, 70] : (h & 1) ? [50, 122, 52] : [60, 134, 58]; const hi = cold ? [80, 114, 92] : [96, 168, 82];
    const f = (c, ax, ay, w, hh) => { ctx.fillStyle = typeof c === 'string' ? c : rgb(c); ctx.fillRect(ax, ay, w, hh); };
    f('rgba(0,0,0,0.22)', x - r + 1, y + r + 1, 2 * r, 2);
    f([74, 50, 30], x - 1, y + r - 1, 2, 3); f([54, 36, 22], x, y + r - 1, 1, 3);
    if (cold) { // fenyő: háromszög
      for (let k = 0; k <= r + 1; k++) { const w = Math.min(2 * r, 1 + k * 2); f(k % 2 ? mid : shade, x - Math.floor(w / 2), y - r + k, w, 1); }
      f(hi, x, y - r, 1, 2); f(hi, x - 1, y - r + 3, 1, 1); return;
    }
    if (flat) { f(shade, x - r - 1, y - 1, 2 * r + 2, 2); f(mid, x - r, y - 2, 2 * r, 2); f(hi, x - r + 1, y - 2, r, 1); f([74, 50, 30], x - 1, y, 2, r + 2); return; }
    // kerekded lomb
    f(shade, x - r, y - r + 1, 2 * r, 2 * r - 1); f(shade, x - r + 1, y - r, 2 * r - 2, 2 * r + 1);
    f(mid, x - r + 1, y - r + 1, 2 * r - 2, 2 * r - 2); f(mid, x - r + 2, y - r, 2 * r - 4, 1);
    f(hi, x - r + 2, y - r + 1, r - 1, r - 1); f(hi, x - r + 3, y - r, 1, 1);
    f(shade, x - 1, y + r - 2, 2, 1);
  }

  LW.Sprites = Sprites;
})(globalThis.LW || (globalThis.LW = {}));
