/* LEVENTE — THE CREATOR · settlements/settlements.js — settlements are detected, never spawned (SIMULATION_MODEL.md §5) */
(function (LW) {
  'use strict';
  const TIERS = ['camp', 'hamlet', 'village', 'town', 'city', 'metropolis'];

  const Settlements = {
    tierOf(world, dwellings) { let tier = null; for (const [name, min] of world.cfg.settlements.tiers) if (dwellings >= min) tier = name; return tier; },
    tierRank(name) { return TIERS.indexOf(name); },
    detect(world) {
      const R = world.cfg.settlements.clusterRadius;
      const dw = [...world.buildings.values()].filter((b) => LW.Buildings.def(b).dwelling && b.progress >= 1 && b.residents.length > 0);
      // union-find
      const parent = dw.map((_, i) => i); const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      for (let i = 0; i < dw.length; i++) for (let j = i + 1; j < dw.length; j++) if (LW.dist(dw[i].x, dw[i].y, dw[j].x, dw[j].y) <= R) { const a = find(i), b = find(j); if (a !== b) parent[a] = b; }
      const clusters = new Map();
      for (let i = 0; i < dw.length; i++) { const r = find(i); if (!clusters.has(r)) clusters.set(r, []); clusters.get(r).push(dw[i]); }
      const seen = new Set();
      for (const list of clusters.values()) {
        const dwellings = list.length;
        let pop = 0, cx = 0, cy = 0; const ids = new Set(); for (const b of list) { pop += b.residents.length; cx += b.x; cy += b.y; ids.add(b.id); } cx /= dwellings; cy /= dwellings;
        // match an existing settlement by shared buildings, else by proximity
        let match = null, best = 0; for (const s of world.settlements.values()) { let n = 0; for (const id of s.buildingIds) if (ids.has(id)) n++; if (n > best) { best = n; match = s; } }
        if (!match) { let bd = R * 1.5; for (const s of world.settlements.values()) { if (seen.has(s.id)) continue; const d = LW.dist(cx, cy, s.x, s.y); if (d < bd) { bd = d; match = s; } } }
        const tier = this.tierOf(world, dwellings);
        if (!match) {
          if (!tier) { for (const b of list) b.settlementId = null; continue; } // a single household is not yet a place
          const founder = this.founder(world, list);
          const s = { id: world.nextIds.settlement++, name: world.language.place(), foundedTick: world.tick, founderId: founder ? founder.id : null, tier, peakTier: tier, x: cx, y: cy, buildingIds: [...ids], population: pop, dwellings, peakPopulation: pop, history: [], emptySince: -1, abandonedTick: null };
          world.settlements.set(s.id, s); match = s;
          if (founder) { founder.achievements.push(`${s.name} alapítója`); founder.importance += 1; LW.Agents.memory(world, founder, { type: 'settlement', text: `a táborunk neve lett: ${s.name}`, importance: 0.8, emotion: 'pride', intensity: 0.7 }); }
          world.events.emit('SettlementFounded', { tick: world.tick, settlementId: s.id, name: s.name, tier, agentId: founder ? founder.id : undefined, tile: world.idx(cx | 0, cy | 0), first: !world.firsts || !world.firsts['settlement'] });
        } else {
          if (match.abandonedTick) { match.abandonedTick = null; world.events.emit('SettlementResettled', { tick: world.tick, settlementId: match.id, name: match.name, tile: world.idx(cx | 0, cy | 0) }); }
          const cur = tier || 'camp';
          if (this.tierRank(cur) > this.tierRank(match.peakTier || match.tier)) { match.history.push({ tick: world.tick, tier: cur }); match.peakTier = cur; world.events.emit('SettlementGrew', { tick: world.tick, settlementId: match.id, name: match.name, tier: cur, prev: match.tier, tile: world.idx(cx | 0, cy | 0), first: !world.firsts || !world.firsts['tier:' + cur] }); }
          match.tier = cur; match.x = cx; match.y = cy; match.buildingIds = [...ids]; match.population = pop; match.dwellings = dwellings; match.peakPopulation = Math.max(match.peakPopulation, pop); match.emptySince = -1;
        }
        for (const b of list) b.settlementId = match.id; seen.add(match.id);
      }
      // a place is abandoned only after standing empty for a season
      for (const s of world.settlements.values()) {
        if (seen.has(s.id) || s.abandonedTick) continue;
        const nearby = world.agentsNear(s.x, s.y, R * 1.5).length;
        if (nearby > 0) { s.emptySince = -1; s.population = nearby; continue; }
        if (s.emptySince < 0) s.emptySince = world.tick;
        else if (world.tick - s.emptySince > LW.TIME.TICKS_PER_DAY * 90) { s.abandonedTick = world.tick; s.population = 0; world.events.emit('SettlementAbandoned', { tick: world.tick, settlementId: s.id, name: s.name, tile: world.idx(s.x | 0, s.y | 0) }); }
      }
      // mark shade for animals (settled area pressure)
      for (const b of world.buildings.values()) if (b.settlementId) { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = b.x + dx, y = b.y + dy; if (world.inBounds(x, y)) world.tiles.shade[world.idx(x, y)] = 1; } }
    },
    founder(world, list) { let best = null, ba = -1; for (const b of list) { const o = world.agents.get(b.ownerId); if (o) { const age = LW.Agents.age(world, o); if (age > ba) { ba = age; best = o; } } } return best; },
    at(world, x, y) { let best = null, bd = 12; for (const s of world.settlements.values()) { if (s.abandonedTick) continue; const d = LW.dist(x, y, s.x, s.y); if (d < bd) { bd = d; best = s; } } return best; },
    largest(world) { let best = null; for (const s of world.settlements.values()) if (!s.abandonedTick && (!best || s.population > best.population)) best = s; return best; },
  };
  LW.Settlements = Settlements;
})(globalThis.LW || (globalThis.LW = {}));
