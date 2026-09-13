/* LEVENTE — THE CREATOR · buildings/buildings.js
 * Buildings are functional objects: warmth, light, safety, sleep quality, storage,
 * farming. Construction needs hauled materials and work; they decay, burn and are inherited.
 */
(function (LW) {
  'use strict';
  const TPD = LW.TIME.TICKS_PER_DAY;

  const DEFS = {
    campfire:    { label: 'Campfire', cost: { wood: 3 }, ticks: 8, warmth: 14, light: 1, safety: 0.5, radius: 2, fuelTicks: TPD * 2, tech: 'fire_making', lifeDays: 120 },
    lean_to:     { label: 'Lean-to', cost: { wood: 6, fiber: 2 }, ticks: 40, insulation: 9, safety: 0.3, sleep: 0.5, capacity: 3, storage: 10, dwelling: true, tech: 'shelter_building', lifeDays: 420 },
    hut:         { label: 'Hut', cost: { wood: 14, fiber: 6, stone: 2 }, ticks: 160, insulation: 14, safety: 0.6, sleep: 0.8, capacity: 5, storage: 40, dwelling: true, tech: 'hut_construction', lifeDays: 2400, light: 0.4 },
    stone_house: { label: 'Stone house', cost: { stone: 24, wood: 10, clay: 6 }, ticks: 400, insulation: 18, safety: 0.85, sleep: 0.95, capacity: 6, storage: 80, dwelling: true, tech: 'stone_masonry', lifeDays: 9000, light: 0.6 },
    storage_pit: { label: 'Storage pit', cost: { wood: 4, stone: 2 }, ticks: 40, storage: 60, preserve: 0.5, tech: 'food_drying', lifeDays: 800 },
    farm_plot:   { label: 'Farm plot', cost: { wood: 2 }, ticks: 60, farm: true, tech: 'seed_planting', lifeDays: 400 },
    monolith:    { label: 'Monolith', cost: {}, ticks: 0, divine: true, lifeDays: 1e9, light: 0.3 },
    light:       { label: 'Pillar of light', cost: {}, ticks: 0, divine: true, lifeDays: 3, light: 1.5 },
    orb:         { label: 'Floating orb', cost: {}, ticks: 0, divine: true, lifeDays: 7, light: 0.8 },
    avatar:      { label: 'The Creator', cost: {}, ticks: 0, divine: true, lifeDays: 2, light: 1.0 },
  };

  const Buildings = {
    DEFS,
    /** Start a construction site. Divine kinds are completed instantly. */
    create(world, kind, x, y, ownerId) {
      const def = DEFS[kind]; const b = { id: world.nextIds.building++, kind, x: x | 0, y: y | 0, ownerId: ownerId ?? null, residents: [], progress: def.ticks === 0 ? 1 : 0, delivered: {}, hp: 1, storage: {}, startedTick: world.tick, builtTick: def.ticks === 0 ? world.tick : -1, settlementId: null };
      if (kind === 'campfire') { b.fuel = def.fuelTicks; b.lit = true; }
      if (def.farm) { b.crop = 0; b.planted = false; }
      world.addBuilding(b);
      world.events.emit(def.divine ? 'ManifestationPlaced' : 'BuildingStarted', { tick: world.tick, buildingId: b.id, kind, agentId: ownerId, tile: world.idx(b.x, b.y) });
      return b;
    },
    def(b) { return DEFS[b.kind]; },
    isComplete(b) { return b.progress >= 1; },
    missing(b) { const def = DEFS[b.kind]; const m = {}; for (const k in def.cost) { const d = (b.delivered[k] || 0); if (d < def.cost[k]) m[k] = def.cost[k] - d; } return m; },
    materialsComplete(b) { for (const k in this.missing(b)) return false; return true; },
    deliver(world, b, a) {
      const m = this.missing(b); let any = false;
      for (const k in m) { const have = a.inv[k] || 0; if (have > 0) { const q = Math.min(have, m[k]); LW.Agents.removeItem(a, k, q); b.delivered[k] = (b.delivered[k] || 0) + q; any = true; } }
      return any;
    },
    /** One tick of construction work by agent a. Returns true when completed on this call. */
    work(world, b, a) {
      const def = DEFS[b.kind]; if (b.progress >= 1) return false;
      const skill = a.skills.building || 0; const rate = (1 / def.ticks) * (0.6 + 0.8 * skill) * (a.needs.energy < 0.2 ? 0.5 : 1);
      b.progress = Math.min(1, b.progress + rate);
      LW.Agents.practice(a, 'building', 1);
      if (b.progress >= 1) { this.complete(world, b, a); return true; }
      return false;
    },
    /** Finalize a construction (shared by detailed and macro simulation). */
    complete(world, b, a) {
      const def = DEFS[b.kind];
      {
        b.progress = 1; b.builtTick = world.tick; world.stats.buildingsBuilt++; world.dirtyTiles.add(world.idx(b.x, b.y));
        if (def.dwelling && a.home == null) this.moveIn(world, b, a);
        if (def.dwelling && a.partner != null) { const p = world.agents.get(a.partner); if (p && p.home == null) this.moveIn(world, b, p); }
        if (def.dwelling) for (const cid of a.children) { const c = world.agents.get(cid); if (c && c.home == null && LW.Time.ageYears(c.bornTick, world.tick) < world.cfg.agents.adultAge) this.moveIn(world, b, c); }
        if (b.kind === 'campfire') { b.fuel = def.fuelTicks; b.lit = true; }
        world.events.emit('BuildingCompleted', { tick: world.tick, buildingId: b.id, kind: b.kind, agentId: a.id, tile: world.idx(b.x, b.y), first: !world.firsts || !world.firsts['building:' + b.kind] });
        LW.Agents.memory(world, a, { type: 'built', text: `built a ${def.label.toLowerCase()}`, importance: 0.6, emotion: 'pride', intensity: 0.6, buildingId: b.id });
        a.emotions.pride = Math.min(1, a.emotions.pride + 0.4);
        return true;
      }
      return false;
    },
    moveIn(world, b, a) {
      const def = DEFS[b.kind]; if (!def.dwelling) return false;
      if (b.residents.length >= def.capacity && !b.residents.includes(a.id)) return false;
      if (a.home != null && a.home !== b.id) this.moveOut(world, a);
      if (!b.residents.includes(a.id)) b.residents.push(a.id);
      a.home = b.id; if (b.ownerId == null) b.ownerId = a.id;
      return true;
    },
    moveOut(world, a) { if (a.home == null) return; const b = world.buildings.get(a.home); if (b) { const i = b.residents.indexOf(a.id); if (i >= 0) b.residents.splice(i, 1); } a.home = null; },
    /** Damage from fire, quake, decay. */
    damage(world, b, amount, cause) {
      if (DEFS[b.kind].divine) return;
      b.hp -= amount;
      if (b.hp <= 0) this.destroy(world, b, cause);
    },
    destroy(world, b, cause) {
      const def = DEFS[b.kind];
      for (const rid of b.residents) { const r = world.agents.get(rid); if (r) { r.home = null; LW.Agents.memory(world, r, { type: 'loss', text: `lost home to ${cause}`, importance: 0.7, emotion: 'sadness', intensity: 0.7 }); r.emotions.sadness = Math.min(1, r.emotions.sadness + 0.5); if (cause === 'fire') r.emotions.fear = Math.min(1, r.emotions.fear + 0.5); } }
      // drop stored items on the ground
      const i = world.idx(b.x, b.y); world.ground = world.ground || new Map(); const g = world.ground.get(i) || {}; for (const k in b.storage) g[k] = (g[k] || 0) + Math.floor(b.storage[k] * (cause === 'fire' ? 0.2 : 0.8)); world.ground.set(i, g);
      world.removeBuilding(b.id); world.dirtyTiles.add(i);
      world.events.emit(def.divine ? 'ManifestationEnded' : 'BuildingDestroyed', { tick: world.tick, buildingId: b.id, kind: b.kind, cause, tile: i, ownerId: b.ownerId });
    },
    transferOwnership(world, fromAgent, toId) { for (const b of world.buildings.values()) if (b.ownerId === fromAgent.id) b.ownerId = toId; },

    /** Per-tick maintenance; daily decay and farms in slices. */
    step(world) {
      const s = world.tick % TPD;
      for (const b of world.buildings.values()) {
        const def = DEFS[b.kind];
        if (b.kind === 'campfire' && b.lit && b.progress >= 1) { b.fuel--; if (b.fuel <= 0) { b.lit = false; world.dirtyTiles.add(world.idx(b.x, b.y)); world.events.emit('FireWentOut', { tick: world.tick, buildingId: b.id, tile: world.idx(b.x, b.y) }); } }
        if ((b.id % TPD) === s) { // once per day per building
          if (b.progress >= 1 || def.divine) { b.hp -= 1 / def.lifeDays; if (b.hp <= 0) { this.destroy(world, b, def.divine ? 'faded' : 'decay'); continue; } }
          else if (world.tick - b.startedTick > TPD * 200) { this.destroy(world, b, 'abandoned'); continue; }
          if (def.farm && b.progress >= 1 && b.planted) {
            const i = world.idx(b.x, b.y), t = world.tiles; const season = LW.Time.season(world.tick);
            const g = 0.014 * (0.3 + 0.7 * t.fert[i] / 255) * (0.3 + 0.7 * t.moist[i] / 255) * [1, 1.1, 0.6, 0][season];
            b.crop = Math.min(1, b.crop + g);
            if (season === 3 && world.tileTemp(i) < -2 && world.rng.chance(0.1)) { b.crop *= 0.5; }
          }
          // storage spoilage
          if (def.storage) LW.Agents.spoil(world, b.storage, def.preserve || 1);
        }
      }
    },
    refuel(world, b, a) { if (b.kind !== 'campfire') return false; const q = Math.min(a.inv.wood || 0, 3); if (q <= 0) return false; LW.Agents.removeItem(a, 'wood', q); b.fuel = Math.min(DEFS.campfire.fuelTicks * 1.5, (b.fuel > 0 ? b.fuel : 0) + q * (DEFS.campfire.fuelTicks / 3)); if (!b.lit) { b.lit = true; world.dirtyTiles.add(world.idx(b.x, b.y)); } return true; },

    /** Environmental effects at a position: warmth (°C bonus), light, safety, inside dwelling */
    effectsAt(world, x, y, agent) {
      let warmth = 0, light = 0, safety = 0, inside = null, fire = null;
      for (const b of world.buildingsNear(x, y, 3)) {
        const def = DEFS[b.kind]; if (b.progress < 1) continue;
        const d = LW.dist(x, y, b.x, b.y);
        if (b.kind === 'campfire' && b.lit && d <= def.radius + 0.5) { warmth = Math.max(warmth, def.warmth * (1 - d / (def.radius + 1))); light = Math.max(light, 1 - d / 3); safety = Math.max(safety, def.safety); fire = b; }
        if (def.dwelling && d <= 0.75 && (b.residents.includes(agent ? agent.id : -1) || b.residents.length < def.capacity)) { inside = b; warmth += def.insulation; safety = Math.max(safety, def.safety); }
      }
      // a fire kept right by the dwelling heats it
      if (inside && !fire) { for (const b of world.buildingsNear(inside.x, inside.y, 3)) if (b.kind === 'campfire' && b.lit && b.progress >= 1 && LW.dist(b.x, b.y, inside.x, inside.y) <= 2.5) { warmth += 8; fire = b; light = Math.max(light, 0.5); break; } }
      return { warmth, light, safety, inside, fire };
    },
    /** A dwelling this agent may sleep in: own home first, then family, then any with room. */
    shelterFor(world, a) {
      if (a.home != null) { const b = world.buildings.get(a.home); if (b && b.progress >= 1) return b; }
      let best = null, bd = 1e9;
      for (const b of world.buildings.values()) { const def = DEFS[b.kind]; if (!def.dwelling || b.progress < 1 || b.residents.length >= def.capacity) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } }
      return best;
    },
    /** Pick a building site near an anchor: passable, unoccupied, not water/mountain, prefers near water & family. */
    findSite(world, a, kind) {
      const anchor = a.home != null && world.buildings.get(a.home) ? world.buildings.get(a.home) : null;
      const ax = anchor ? anchor.x : a.x | 0, ay = anchor ? anchor.y : a.y | 0;
      const water = LW.Agents.nearestPoi(world, a, 'water');
      let best = -1, bs = -1e9;
      for (let k = 0; k < 40; k++) {
        const r = kind === 'campfire' ? 2 : 4; const x = LW.clamp(ax + world.rng.int(-r, r), 1, world.w - 2), y = LW.clamp(ay + world.rng.int(-r, r), 1, world.h - 2);
        const i = world.idx(x, y); const bio = world.tiles.biome[i];
        if (!world.isPassable(i) || bio === LW.BIOME.RIVER || bio === LW.BIOME.MARSH || bio === LW.BIOME.MOUNTAIN || world.buildingAt(i)) continue;
        if (world.tiles.trees[i] > 120 && kind !== 'campfire') continue;
        let s = -world.moveCost(i);
        if (water) s -= LW.dist(x, y, water.x, water.y) * 0.15;
        if (anchor) s -= LW.dist(x, y, ax, ay) * 0.2;
        s -= world.buildingsNear(x, y, 1).length * 0.5; // don't crowd
        s += world.buildingsNear(x, y, 5).length * 0.15; // but cluster into camps
        s += world.rng.f() * 0.3;
        if (s > bs) { bs = s; best = i; }
      }
      return best;
    },
  };

  LW.Buildings = Buildings;
})(globalThis.LW || (globalThis.LW = {}));
