/* LEVENTE — THE CREATOR · world/ecology.js
 * Vegetation, forests, animals, fish, soil moisture, snow, paths and wildfire.
 * Each tile is updated once per world day (sliced across ticks). (SIMULATION_MODEL.md §4–5)
 */
(function (LW) {
  'use strict';
  const B = LW.BIOME, TPD = LW.TIME.TICKS_PER_DAY;

  const Ecology = {
    init(world) {
      world.burning = world.burning || new Set();
      world.dirtyTiles = world.dirtyTiles || new Set();
      world.fireStats = world.fireStats || { activeSince: -1, burned: 0, cause: null, origin: -1 };
      world.pathAnnounced = world.pathAnnounced || new Set();
    },

    stepSlice(world) {
      const t = world.tiles, n = world.w * world.h, s = world.tick % TPD, cfg = world.cfg.ecology;
      const season = LW.Time.season(world.tick);
      const seasonVeg = [1.0, 1.1, 0.8, 0.35][season];
      const rng = world.rng; const dirty = world.dirtyTiles;
      const precip = world.weather.isPrecipitating();
      for (let i = s; i < n; i += TPD) {
        const b = t.biome[i];
        const temp = world.tileTemp(i);
        // snow
        const snow0 = t.snow[i];
        if (temp < 0 && precip) t.snow[i] = Math.min(255, t.snow[i] + 25 + Math.round(world.rainAt(i) * 60));
        else if (temp > 1.5) t.snow[i] = Math.max(0, t.snow[i] - Math.round(10 + temp * 6));
        if ((snow0 >> 5) !== (t.snow[i] >> 5)) dirty.add(i);
        if (LW.isWaterBiome(b)) {
          if (t.fishCap[i]) { const f = t.fish[i]; t.fish[i] = Math.min(t.fishCap[i], Math.round(f + cfg.fishRegrowth * (f + 2) * (1 - f / (t.fishCap[i] + 1)))); }
          continue;
        }
        // moisture
        const rain = world.rainAt(i);
        let m = t.moist[i] + rain * 40 - Math.max(0, temp) * 0.35 * (1 - world.weather.cloud * 0.5) - t.veg[i] * 0.01 + (world.isFreshNear ? 0 : 0);
        if (t.snow[i] > 0 && temp > 0) m += 6;
        // fresh water keeps its banks wet
        if (this._freshAdjacent(world, i)) m = Math.max(m, 190);
        t.moist[i] = LW.clamp(Math.round(m), 5, 255);
        // burnt countdown
        if (t.burnt[i] > 0) { t.burnt[i] = Math.max(0, t.burnt[i] - 2); if (t.burnt[i] === 0) dirty.add(i); t.fert[i] = Math.min(255, t.fert[i] + 1); continue; }
        // vegetation (edible)
        const veg0 = t.veg[i];
        const cap = t.vegCap[i] * seasonVeg * (0.45 + 0.55 * t.moist[i] / 255);
        if (cap > 0) {
          let v = t.veg[i];
          if (v < 3) { if (rng.chance(0.25 * seasonVeg)) v += 1; }
          else v += cfg.vegRegrowth * v * (1 - v / Math.max(1, cap));
          if (v > cap) v -= (v - cap) * 0.15;
          t.veg[i] = LW.clamp(Math.round(v), 0, 255);
        }
        // trees
        const tr0 = t.trees[i];
        if (t.treeCap[i] > 0) {
          let tr = t.trees[i];
          if (tr < 2) { if (rng.chance(0.02)) tr += 1; }
          else tr += cfg.treeRegrowth * (t.treeCap[i] - tr) * (0.5 + t.moist[i] / 510);
          t.trees[i] = LW.clamp(Math.round(tr), 0, 255);
        }
        // animals: settlements push wildlife away
        if (t.animalCap[i] > 0) {
          let a = t.animals[i]; const pressure = t.shade[i] ? 0.3 : 1;
          const capA = t.animalCap[i] * pressure * (season === 3 ? 0.6 : 1);
          if (a < 2) { if (rng.chance(0.05)) a += 1; } else a += cfg.animalRegrowth * a * (1 - a / Math.max(1, capA));
          if (a > capA) a -= (a - capA) * 0.1;
          t.animals[i] = LW.clamp(Math.round(a), 0, 255);
        }
        // soil fertility recovers slowly under vegetation
        if (t.veg[i] > 40 && t.fert[i] < 255 && rng.chance(0.05)) t.fert[i]++;
        // paths decay
        if (t.traffic[i] > 0) { t.traffic[i] = Math.floor(t.traffic[i] * (1 - world.cfg.paths.decayPerDay)); this.updatePathTier(world, i); }
        if ((veg0 >> 5) !== (t.veg[i] >> 5) || (tr0 >> 5) !== (t.trees[i] >> 5)) dirty.add(i);
      }
    },

    _freshAdjacent(world, i) {
      const x = i % world.w, y = (i / world.w) | 0; const t = world.tiles;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h) continue; if (LW.isFreshBiome(t.biome[ny * world.w + nx])) return true; }
      return false;
    },

    /** Called when an agent steps on a tile. */
    footfall(world, i) {
      const t = world.tiles; if (LW.isWaterBiome(t.biome[i])) return;
      if (t.traffic[i] < 65000) t.traffic[i] += 1;
      if ((t.traffic[i] & 7) === 0) this.updatePathTier(world, i);
    },
    updatePathTier(world, i) {
      const t = world.tiles, p = world.cfg.paths; const tr = t.traffic[i];
      const tier = tr >= p.road ? 3 : tr >= p.path ? 2 : tr >= p.trail ? 1 : 0;
      // roads need knowledge (Phase 2) — cap at path for now
      const capped = Math.min(tier, 2);
      if (capped !== t.path[i]) { t.path[i] = capped; world.dirtyTiles.add(i); if (capped === 2 && tier === 2 && !world.pathAnnounced.has(i)) { world.pathAnnounced.add(i); if (world.pathAnnounced.size === 1 || world.pathAnnounced.size % 25 === 0) world.events.emit('PathFormed', { tick: world.tick, tile: i }); } }
    },

    // ---------------- fire
    ignite(world, i, cause) {
      const t = world.tiles; if (LW.isWaterBiome(t.biome[i]) || t.fire[i] || t.burnt[i]) return false;
      if (t.trees[i] + t.veg[i] < 15 && !world.buildingAt(i)) return false;
      t.fire[i] = 200; world.burning.add(i); world.dirtyTiles.add(i);
      if (world.fireStats.activeSince < 0) { world.fireStats = { activeSince: world.tick, burned: 0, cause, origin: i }; world.events.emit('WildfireStarted', { tick: world.tick, tile: i, cause }); }
      return true;
    },
    stepFire(world) {
      if (!world.burning.size) return;
      const t = world.tiles, rng = world.rng, cfg = world.cfg.ecology, w = world.w, h = world.h; const wind = world.weather.wind;
      const toIgnite = [];
      for (const i of world.burning) {
        const rain = world.rainAt(i);
        t.fire[i] = Math.max(0, t.fire[i] - 6 - Math.round(rain * 30));
        t.trees[i] = Math.max(0, t.trees[i] - 5); t.veg[i] = Math.max(0, t.veg[i] - 10); t.animals[i] = Math.max(0, t.animals[i] - 6);
        const b = world.buildingAt(i); if (b) LW.Buildings.damage(world, b, 0.06, 'tűz');
        const x = i % w, y = (i / w) | 0;
        const fuelHere = t.fire[i] / 255;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx; if (t.fire[j] || t.burnt[j] || LW.isWaterBiome(t.biome[j])) continue;
          const fuel = Math.min(1, (t.trees[j] + t.veg[j] * 0.5) / 200); if (fuel < 0.05) continue;
          const dry = Math.max(0.1, 1 - t.moist[j] / 255) * (t.snow[j] ? 0.1 : 1);
          const align = 1 + wind.speed * (dx * wind.x + dy * wind.y) * 1.2;
          const p = cfg.fireSpread * fuelHere * fuel * dry * Math.max(0.2, align) * (1 - world.rainAt(j));
          if (rng.chance(p)) toIgnite.push(j);
        }
        if (t.fire[i] === 0) { world.burning.delete(i); t.burnt[i] = 160; t.trees[i] = Math.min(t.trees[i], 3); t.veg[i] = 0; world.fireStats.burned++; world.dirtyTiles.add(i); }
      }
      for (const j of toIgnite) { t.fire[j] = 160; world.burning.add(j); world.dirtyTiles.add(j); }
      if (!world.burning.size && world.fireStats.activeSince >= 0) { world.events.emit('WildfireEnded', { tick: world.tick, burned: world.fireStats.burned, cause: world.fireStats.cause, tile: world.fireStats.origin }); world.fireStats.activeSince = -1; }
    },

    /** Harvest helpers — return quantity actually taken */
    take(world, i, field, want) { const t = world.tiles; const have = t[field][i]; const got = Math.min(have, want); t[field][i] = have - got; if (got && (field === 'veg' || field === 'trees') && ((have >> 5) !== ((have - got) >> 5))) world.dirtyTiles.add(i); return got; },
  };

  LW.Ecology = Ecology;
})(globalThis.LW || (globalThis.LW = {}));
