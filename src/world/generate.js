/* LEVENTE — THE CREATOR · world/generate.js
 * Procedural planet from a seed: continents, elevation, climate, rivers, lakes,
 * biomes, ecology capacities, underground deposits and the Genesis site.
 * (SIMULATION_MODEL.md §1)
 */
(function (LW) {
  'use strict';
  const B = LW.BIOME, D = LW.DEPOSIT;

  function makeTiles(w, h) {
    const n = w * h;
    return {
      elev: new Float32Array(n), baseTemp: new Float32Array(n),
      moist: new Uint8Array(n), fert: new Uint8Array(n), biome: new Uint8Array(n),
      veg: new Uint8Array(n), vegCap: new Uint8Array(n), trees: new Uint8Array(n), treeCap: new Uint8Array(n),
      animals: new Uint8Array(n), animalCap: new Uint8Array(n), fish: new Uint8Array(n), fishCap: new Uint8Array(n),
      stone: new Uint8Array(n), depType: new Uint8Array(n), depAmt: new Uint16Array(n), depKnown: new Uint8Array(n),
      traffic: new Uint16Array(n), path: new Uint8Array(n), fire: new Uint8Array(n), burnt: new Uint8Array(n),
      snow: new Uint8Array(n), danger: new Uint8Array(n), shade: new Uint8Array(n),
    };
  }

  const isWater = (b) => b === B.OCEAN || b === B.LAKE || b === B.RIVER;
  const isFresh = (b) => b === B.LAKE || b === B.RIVER;

  function generate(seed, cfg) {
    const w = cfg.width, h = cfg.height, n = w * h, sea = cfg.seaLevel;
    const rng = new LW.Rng(seed);
    const nElev = new LW.Noise(seed ^ 0x1111), nRidge = new LW.Noise(seed ^ 0x2222), nMoist = new LW.Noise(seed ^ 0x3333), nVar = new LW.Noise(seed ^ 0x4444), nWarp = new LW.Noise(seed ^ 0x5555);
    const t = makeTiles(w, h);
    const idx = (x, y) => y * w + x;

    // ---- 1. continent shape + elevation
    const shape = rng.weighted(['continent', 'archipelago', 'twin'], [6, 2, 2]);
    const scale = 0.055 * (128 / w);
    const cx2 = rng.range(0.4, 0.6) * w, cy2 = rng.range(0.4, 0.6) * h;
    const tw = shape === 'twin' ? rng.range(0, Math.PI) : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const wx = x + (nWarp.fbm(x * 0.03, y * 0.03, 3) - 0.5) * 18, wy = y + (nWarp.fbm(x * 0.03 + 7.7, y * 0.03 + 3.1, 3) - 0.5) * 18;
      let e = nElev.fbm(wx * scale, wy * scale, 6, 2.0, 0.5);
      const r = nRidge.ridged(wx * scale * 1.7, wy * scale * 1.7, 4);
      e = e * 0.72 + r * 0.28;
      let mask;
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      if (shape === 'continent') { const d = Math.hypot((x - cx2) / (w * 0.5), (y - cy2) / (h * 0.5)); mask = 1 - LW.smoothstep(0.55, 1.05, d); }
      else if (shape === 'archipelago') { mask = 0.8 - 0.3 * Math.hypot(dx, dy); }
      else { const ca = Math.cos(tw), sa = Math.sin(tw); const u = dx * ca + dy * sa; const d1 = Math.hypot((u - 0.42) / 0.5, (dx * -sa + dy * ca) / 0.8), d2 = Math.hypot((u + 0.42) / 0.5, (dx * -sa + dy * ca) / 0.8); mask = Math.max(1 - LW.smoothstep(0.5, 1.0, d1), 1 - LW.smoothstep(0.5, 1.0, d2)); }
      const edge = 1 - LW.smoothstep(0.86, 1.0, Math.max(Math.abs(dx), Math.abs(dy)));
      t.elev[idx(x, y)] = e * mask * edge;
    }
    // normalise so that land fraction is plausible for the shape
    const targetLand = shape === 'continent' ? 0.58 : shape === 'archipelago' ? 0.42 : 0.52;
    const sorted = Float32Array.from(t.elev).sort();
    const cut = sorted[Math.floor((1 - targetLand) * n)];
    for (let i = 0; i < n; i++) { const e = t.elev[i]; t.elev[i] = e < cut ? (e / cut) * sea : sea + ((e - cut) / (1 - cut + 1e-6)) * (1 - sea); }
    // lift interior mountains a bit for variety
    for (let i = 0; i < n; i++) if (t.elev[i] > sea) t.elev[i] = sea + Math.pow((t.elev[i] - sea) / (1 - sea), 1.25) * (1 - sea);

    // ---- 2. climate
    const climateMean = rng.range(13.5, 18); // °C annual mean at sea level, mid-map (temperate-warm: the first ones must survive their first winters)
    const latGrad = rng.range(4, 9);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      const lat = (0.5 - y / h) * 2; // +1 north (colder), -1 south
      const alt = Math.max(0, t.elev[i] - sea);
      t.baseTemp[i] = climateMean - lat * latGrad - alt * 60 + (nVar.fbm(x * 0.05, y * 0.05, 3) - 0.5) * 3;
    }

    // ---- 3. ocean distance (BFS) → moisture
    const oceanDist = new Int16Array(n).fill(-1);
    const queue = new Int32Array(n); let qh = 0, qt = 0;
    for (let i = 0; i < n; i++) if (t.elev[i] < sea) { oceanDist[i] = 0; queue[qt++] = i; }
    while (qh < qt) {
      const i = queue[qh++]; const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = idx(nx, ny); if (oceanDist[j] < 0) { oceanDist[j] = oceanDist[i] + 1; queue[qt++] = j; }
      }
    }
    const windDir = rng.pick([-1, 1]);
    const moistF = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      let m = 0.55 * nMoist.fbm(x * 0.045, y * 0.045, 4) + 0.45 * Math.exp(-Math.max(0, oceanDist[i]) / 22);
      // rain shadow: higher ground upwind
      let shadow = 0; for (let k = 1; k <= 5; k++) { const ux = x - windDir * k; if (ux >= 0 && ux < w) shadow = Math.max(shadow, t.elev[idx(ux, y)] - t.elev[i]); }
      m -= Math.max(0, shadow - 0.06) * 1.2;
      const temp = t.baseTemp[i]; if (temp > 22) m -= (temp - 22) * 0.02;
      moistF[i] = LW.clamp01(m + 0.08);
    }

    // ---- 4. rivers
    const water = new Uint8Array(n); // 0 none 1 river 2 lake 3 ocean
    for (let i = 0; i < n; i++) if (t.elev[i] < sea) water[i] = 3;
    const nRivers = Math.max(4, Math.round(n * cfg.riverDensity));
    const cand = [];
    for (let i = 0; i < n; i++) if (t.elev[i] > sea + 0.22 && moistF[i] > 0.45) cand.push(i);
    rng.shuffle(cand);
    let riverTiles = 0;
    for (let r = 0; r < nRivers && r < cand.length; r++) {
      let i = cand[r]; let steps = 0; const visited = new Set();
      while (steps++ < 400) {
        if (water[i]) break;
        visited.add(i);
        water[i] = 1; riverTiles++;
        const x = i % w, y = (i / w) | 0;
        let best = -1, be = t.elev[i] + 1e-3;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = idx(nx, ny); if (visited.has(j)) continue;
          const e = t.elev[j] + rng.range(0, 0.004); if (e < be) { be = e; best = j; }
        }
        if (best < 0) { // basin → lake
          floodLake(i, water, t.elev, w, h, rng.int(3, 14)); break;
        }
        i = best;
        if (water[i] === 1 || water[i] === 2 || water[i] === 3) break;
      }
    }
    // extra lakes at wet local minima
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const i = idx(x, y); if (water[i] || t.elev[i] < sea + 0.02 || moistF[i] < 0.55) continue;
      let minimum = true; for (let dy = -1; dy <= 1 && minimum; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; if (t.elev[idx(x + dx, y + dy)] <= t.elev[i]) { minimum = false; break; } }
      if (minimum && rng.chance(0.35)) floodLake(i, water, t.elev, w, h, rng.int(2, 8));
    }
    // moisture boost near fresh water
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y); if (water[i] !== 1 && water[i] !== 2) continue;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = idx(nx, ny); moistF[j] = Math.min(1, moistF[j] + 0.25 / (1 + Math.abs(dx) + Math.abs(dy))); }
    }

    // ---- 5. biomes
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y); const e = t.elev[i], m = moistF[i], temp = t.baseTemp[i];
      let b;
      if (water[i] === 3) b = B.OCEAN; else if (water[i] === 2) b = B.LAKE; else if (water[i] === 1) b = B.RIVER;
      else if (e > 0.86) b = B.PEAK; else if (e > 0.72) b = B.MOUNTAIN; else if (e > 0.6) b = B.HILLS;
      else if (temp < 1.5) b = B.TUNDRA;
      else if (m < 0.22 && temp > 15) b = B.DESERT;
      else if (m < 0.32 && temp > 11) b = B.SAVANNA;
      else if (m > 0.78 && e < sea + 0.07 && oceanDistOrFresh(i) <= 4) b = B.MARSH;
      else if (m > 0.66) b = B.DENSE_FOREST;
      else if (m > 0.46) b = B.FOREST;
      else b = B.GRASSLAND;
      // beaches
      if (b !== B.OCEAN && e < sea + 0.025 && !isWater(b)) { let adj = false; for (let dy = -1; dy <= 1 && !adj; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; if (water[idx(nx, ny)] === 3) { adj = true; break; } } if (adj) b = B.BEACH; }
      t.biome[i] = b;
      t.moist[i] = Math.round(m * 255);
    }
    function oceanDistOrFresh(i) { const x = i % w, y = (i / w) | 0; let d = oceanDist[i]; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = idx(nx, ny); if (water[j] === 1 || water[j] === 2) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy))); } return d; }

    // ---- 6. ecology capacities
    const VEG = [0, 0, 0, 30, 120, 160, 140, 70, 30, 0, 110, 40, 15, 90];
    const TREE = [0, 0, 0, 5, 40, 200, 255, 60, 20, 0, 80, 20, 0, 50];
    const ANIM = [0, 0, 0, 20, 120, 150, 170, 90, 40, 5, 70, 60, 20, 160];
    const STONE = [0, 0, 60, 40, 15, 20, 15, 140, 220, 255, 10, 60, 90, 25];
    const DANGER = [0, 0, 10, 30, 50, 100, 140, 90, 110, 60, 80, 70, 40, 100];
    const FERT = [0, 0, 0, 40, 160, 140, 120, 80, 30, 0, 180, 40, 20, 100];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y), b = t.biome[i]; const v = 0.6 + 0.4 * nVar.fbm(x * 0.15 + 50, y * 0.15 + 50, 3);
      t.vegCap[i] = Math.round(VEG[b] * v); t.treeCap[i] = Math.round(TREE[b] * (0.5 + 0.5 * nVar.fbm(x * 0.08 + 9, y * 0.08 + 9, 3)));
      t.animalCap[i] = Math.round(ANIM[b] * v); t.stone[i] = Math.round(STONE[b] * v);
      t.danger[i] = DANGER[b]; t.fert[i] = Math.round(FERT[b] * (0.7 + 0.3 * v));
      t.veg[i] = Math.round(t.vegCap[i] * rng.range(0.7, 1)); t.trees[i] = Math.round(t.treeCap[i] * rng.range(0.75, 1)); t.animals[i] = Math.round(t.animalCap[i] * rng.range(0.6, 1));
      let fc = 0; if (b === B.RIVER) fc = 150; else if (b === B.LAKE) fc = 200; else if (b === B.OCEAN) fc = oceanDist[i] === 0 && nearLand(i) ? 170 : 60; else if (b === B.BEACH || b === B.MARSH) fc = 50;
      t.fishCap[i] = Math.round(fc * v); t.fish[i] = Math.round(t.fishCap[i] * rng.range(0.7, 1));
    }
    function nearLand(i) { const x = i % w, y = (i / w) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; if (t.elev[idx(nx, ny)] >= sea) return true; } return false; }

    // ---- 7. deposits (veins)
    const nDep = Math.max(8, Math.round(n * cfg.depositDensity));
    const land = []; for (let i = 0; i < n; i++) if (!isWater(t.biome[i])) land.push(i);
    const placeVein = (start, type, surface) => {
      let i = start; const len = rng.int(3, type === D.CLAY || type === D.FLINT ? 18 : 30);
      for (let k = 0; k < len; k++) {
        if (isWater(t.biome[i])) break;
        if (!t.depType[i]) { t.depType[i] = type; t.depAmt[i] = rng.int(20, 200); t.depKnown[i] = k === 0 ? ((surface || rng.chance(0.3)) ? 1 : 0) : (rng.chance(0.05) ? 1 : 0); }
        const x = i % w, y = (i / w) | 0; const nx = LW.clamp(x + rng.int(-1, 1), 0, w - 1), ny = LW.clamp(y + rng.int(-1, 1), 0, h - 1); i = idx(nx, ny);
      }
    };
    const typeFor = (b, i) => {
      const nearFresh = oceanDistOrFresh(i) <= 3;
      if (b === B.MARSH || (nearFresh && (b === B.GRASSLAND || b === B.FOREST))) return rng.weighted([D.CLAY, D.SALT, D.FLINT], [7, 1, 2]);
      if (b === B.HILLS) return rng.weighted([D.FLINT, D.COPPER, D.TIN, D.COAL, D.IRON, D.GEMS, D.CLAY], [30, 18, 10, 14, 14, 4, 10]);
      if (b === B.MOUNTAIN || b === B.PEAK) return rng.weighted([D.COPPER, D.IRON, D.GOLD, D.GEMS, D.COAL, D.TIN, D.FLINT], [18, 22, 12, 8, 14, 14, 12]);
      if (b === B.DESERT || b === B.SAVANNA) return rng.weighted([D.SALT, D.OIL, D.COPPER, D.FLINT], [35, 25, 25, 15]);
      if (b === B.BEACH) return rng.weighted([D.SALT, D.CLAY], [6, 4]);
      return rng.weighted([D.CLAY, D.FLINT, D.COAL, D.IRON, D.COPPER], [30, 30, 15, 15, 10]);
    };
    for (let k = 0; k < nDep; k++) { const i = rng.pick(land); placeVein(i, typeFor(t.biome[i], i)); }
    // a fejlődés nyersanyagai valahol mindig ott vannak a földben (ha kevés jutott, még néhány ér)
    const hilly = land.filter((i) => t.biome[i] === B.HILLS || t.biome[i] === B.MOUNTAIN);
    for (const [type, min] of [[D.COPPER, 3], [D.TIN, 2], [D.IRON, 3], [D.COAL, 3], [D.GOLD, 1], [D.OIL, 1], [D.GEMS, 1], [D.SALT, 2]]) { let have = 0; for (const i of land) if (t.depType[i] === type) have++; for (let k = Math.ceil(have / 12); k < min; k++) placeVein(rng.pick(hilly.length ? hilly : land), type, true); }

    // ---- 8. genesis site (progressively relaxed constraints)
    let best = -1, bestScore = -1;
    const PASSES = [[13, 19.5, true], [11, 22, true], [9, 24, false], [-99, 99, false]];
    for (const [tLo, tHi, strictBiome] of PASSES) { if (best >= 0) break;
    for (let y = 8; y < h - 8; y++) for (let x = 8; x < w - 8; x++) {
      const i = idx(x, y), b = t.biome[i];
      if (strictBiome ? !(b === B.GRASSLAND || b === B.FOREST || b === B.SAVANNA) : (isWater(b) || b === B.PEAK || b === B.MOUNTAIN)) continue;
      const temp = t.baseTemp[i]; if (temp < tLo || temp > tHi) continue;
      let fresh = 0, veg = 0, trees = 0, stone = 0, mount = 0;
      for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
        const j = idx(x + dx, y + dy); const d = Math.max(Math.abs(dx), Math.abs(dy)); const bb = t.biome[j];
        if (isFresh(bb) && d <= 6) fresh = Math.max(fresh, 1 - d / 7);
        if (d <= 8) { veg += t.vegCap[j]; trees += t.treeCap[j]; stone += t.stone[j]; if (bb === B.MOUNTAIN || bb === B.PEAK || bb === B.OCEAN) mount++; }
      }
      if (fresh === 0) continue;
      const score = fresh * 3 + veg / 20000 + trees / 20000 + Math.min(stone, 3000) / 3000 - mount / 289 * 1.5 + rng.f() * 0.05;
      if (score > bestScore) { bestScore = score; best = i; }
    } }
    if (best < 0) { // fallback: any land tile near fresh water
      for (let i = 0; i < n && best < 0; i++) if (!isWater(t.biome[i]) && t.biome[i] !== B.PEAK && t.biome[i] !== B.MOUNTAIN && oceanDistOrFresh(i) <= 5) best = i;
      if (best < 0) best = land[0] || 0;
    }
    const gx = best % w, gy = (best / w) | 0;
    // guarantee learnable materials near genesis: flint & clay within ~18 tiles
    ensureDeposit(D.FLINT, gx, gy, 18); ensureDeposit(D.CLAY, gx, gy, 18);
    function ensureDeposit(type, x0, y0, r) {
      for (let y = Math.max(0, y0 - r); y <= Math.min(h - 1, y0 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(w - 1, x0 + r); x++) if (t.depType[idx(x, y)] === type) return;
      for (let tries = 0; tries < 200; tries++) { const x = LW.clamp(x0 + rng.int(-r, r), 1, w - 2), y = LW.clamp(y0 + rng.int(-r, r), 1, h - 2); const i = idx(x, y); if (!isWater(t.biome[i]) && !t.depType[i]) { placeVein(i, type); t.depKnown[i] = 1; return; } }
    }

    return { w, h, tiles: t, genesis: { x: gx, y: gy }, shape, climateMean, windDir, landTiles: land.length, riverTiles };
  }

  function floodLake(start, water, elev, w, h, maxTiles) {
    const base = elev[start]; const q = [start]; const seen = new Set([start]); let count = 0;
    while (q.length && count < maxTiles) {
      const i = q.shift(); if (water[i] === 3) continue; water[i] = 2; count++;
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (!seen.has(j) && elev[j] < base + 0.025) { seen.add(j); q.push(j); } }
    }
  }

  LW.generateWorld = generate;
  LW.makeTiles = makeTiles;
  LW.isWaterBiome = isWater;
  LW.isFreshBiome = isFresh;
})(globalThis.LW || (globalThis.LW = {}));
