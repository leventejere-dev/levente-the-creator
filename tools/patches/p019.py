PATCHES = [
('src/agents/relationships.js', [
("""    /** Kinship degree: 1 parent/child/sibling, 0.5 half-sibling/grandparent, 0 otherwise. */
    kinship(world, a, b) {
      if (a.parents.includes(b.id) || b.parents.includes(a.id)) return 1;
      const shared = a.parents.filter((p) => p != null && b.parents.includes(p)).length;
      if (shared === 2) return 1; if (shared === 1) return 0.5;
      // grandparent
      for (const p of a.parents) { const rec = p != null ? (world.agents.get(p) || world.deceased.get(p)) : null; if (rec && rec.parents && rec.parents.includes(b.id)) return 0.5; }
      for (const p of b.parents) { const rec = p != null ? (world.agents.get(p) || world.deceased.get(p)) : null; if (rec && rec.parents && rec.parents.includes(a.id)) return 0.5; }
      return 0;
    },""",
 """    /** Kinship degree: 1 parent/child, 0.9 full sibling, 0.5 half-sibling/grandparent, 0.25 first cousin, 0 otherwise. */
    kinship(world, a, b) {
      if (a.parents.includes(b.id) || b.parents.includes(a.id)) return 1;
      const shared = a.parents.filter((p) => p != null && b.parents.includes(p)).length;
      if (shared === 2) return 0.9; if (shared === 1) return 0.5;
      const rec = (id) => (id != null ? (world.agents.get(id) || world.deceased.get(id)) : null);
      for (const p of a.parents) { const r = rec(p); if (r && r.parents && r.parents.includes(b.id)) return 0.5; }
      for (const p of b.parents) { const r = rec(p); if (r && r.parents && r.parents.includes(a.id)) return 0.5; }
      // first cousins: a parent of each are siblings
      const gpA = new Set(); for (const p of a.parents) { const r = rec(p); if (r && r.parents) for (const g of r.parents) if (g != null) gpA.add(g); }
      for (const p of b.parents) { const r = rec(p); if (r && r.parents) for (const g of r.parents) if (g != null && gpA.has(g)) return 0.25; }
      return 0;
    },
    /** Instinctive aversion to pairing with close kin (Westermarck): strong for parents/children and full siblings, weaker beyond. */
    kinPenalty(k) { return k >= 1 ? 2.5 : k >= 0.9 ? 0.9 : k >= 0.5 ? 0.35 : k > 0 ? 0.12 : 0; },"""),
("""      const ageFit = 1 - LW.clamp01(Math.abs(ageA - ageB) / 15);
      const kin = this.kinship(world, a, b);
      let v = 0.4 * look + 0.3 * comp + 0.15 * ageFit + 0.15 * (0.5 + b.personality.humor * 0.25 + b.personality.sociability * 0.25);
      v *= orient; v -= kin * 1.5;""",
 """      const ageFit = 1 - LW.clamp01(Math.abs(ageA - ageB) / 25);
      const kin = this.kinship(world, a, b);
      let v = 0.4 * look + 0.3 * comp + 0.15 * ageFit + 0.15 * (0.5 + b.personality.humor * 0.25 + b.personality.sociability * 0.25);
      v *= orient; v -= this.kinPenalty(kin);"""),
("""        const kin = this.kinship(world, a, b);
        if (kin) { r.status = 'family'; r.trust = 0.7; r.friendship = 0.5; r.loyalty = 0.6; r.familiarity = 0.6; }""",
 """        const kin = this.kinship(world, a, b);
        if (kin >= 0.5) { r.status = 'family'; r.trust = 0.7; r.friendship = 0.5; r.loyalty = 0.6; r.familiarity = 0.6; }"""),
]),
('src/agents/social.js', [
("""      if (kin > 0 || rt.attraction < 0.15) p = 0;""",
 """      if (kin >= 0.9 || rt.attraction < 0.15) p = 0; else if (kin >= 0.5) p *= 0.5;"""),
]),
('src/agents/brain.js', [
("""          if (!A().isAdult(c.world, o) || o.sleeping) continue; const r = LW.Relationships.ensure(c.world, a, o); if (r.attraction < 0.3 || r.status === 'family') continue; if (r.lastFlirt != null && c.tick - r.lastFlirt < 40) continue;""",
 """          if (!A().isAdult(c.world, o) || o.sleeping) continue; const r = LW.Relationships.ensure(c.world, a, o); if (r.attraction < 0.3 || (r.status === 'family' && LW.Relationships.kinship(c.world, a, o) >= 0.9)) continue; if (r.lastFlirt != null && c.tick - r.lastFlirt < 40) continue;"""),
]),
('src/sim/macro.js', [
("""        else if (near.length && rng.chance(0.25)) { let best = null, bs = 0.35; for (const o of near) { if (!A().isAdult(w, o)) continue; const r = LW.Relationships.ensure(w, a, o); if (r.status === 'family') continue; if (r.attraction > bs) { bs = r.attraction; best = o; } } if (best) LW.Social.interact(w, a, best, 'flirt', {}); }""",
 """        else if (near.length && rng.chance(0.25)) { let best = null, bs = 0.35; for (const o of near) { if (!A().isAdult(w, o)) continue; const r = LW.Relationships.ensure(w, a, o); if (r.status === 'family' && LW.Relationships.kinship(w, a, o) >= 0.9) continue; if (r.attraction > bs) { bs = r.attraction; best = o; } } if (best) LW.Social.interact(w, a, best, 'flirt', {}); }"""),
("""      LW.Settlements.detect(w);
      for (const [i, g] of w.ground) { A().spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); }
    },""",
 """      LW.Settlements.detect(w); LW.Agents.immigrationCheck(w);
      for (const [i, g] of w.ground) { A().spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); }
    },"""),
]),
('src/sim/simulation.js', [
("""      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); for (const [i, g] of w.ground) { LW.Agents.spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); } }""",
 """      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); for (const [i, g] of w.ground) { LW.Agents.spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); } }"""),
]),
('src/agents/agent.js', [
("""    // ---------------- life stage & helpers""",
 """    /** The map is a region, not the planet: now and then a stranger wanders in from beyond its edge (daily check). */
    immigrationCheck(world) {
      const pop = world.population; if (pop === 0 || pop > 40) return;
      const pYear = pop < 6 ? 0.45 : pop < 12 ? 0.2 : 0.06; if (!world.rng.chance(pYear / T.DAYS_PER_YEAR)) return;
      const rng = world.rng; const sex = rng.chance(0.5) ? 'f' : 'm';
      // arrive at a passable edge tile, then walk toward the people
      let ti = -1; for (let k = 0; k < 60 && ti < 0; k++) { const side = rng.int(0, 3); const x = side === 0 ? 1 : side === 1 ? world.w - 2 : rng.int(1, world.w - 2), y = side === 2 ? 1 : side === 3 ? world.h - 2 : rng.int(1, world.h - 2); const i = world.idx(x, y); if (world.isPassable(i) && !world.isWater(i)) ti = i; }
      if (ti < 0) return;
      const a = this.create(world, { name: world.language.person(sex, 0.5), sex, bornTick: world.tick - Math.round(rng.range(17, 30) * T.TICKS_PER_YEAR), x: world.xOf(ti) + 0.5, y: world.yOf(ti) + 0.5 });
      a.inv.berries = 4; a.achievements.push('Came from beyond');
      const target = [...world.agents.values()].find((o) => o.id !== a.id); if (target) { a.knowledge.places.set(this.poiKey('water', world.idx(target.x | 0, target.y | 0)), { k: 'water', i: world.idx(target.x | 0, target.y | 0), q: 1, t: world.tick }); a.plan = { goal: 'explore', steps: [{ op: 'moveTo', i: world.idx(target.x | 0, target.y | 0), near: 1, explore: true }], i: 0, startedTick: world.tick, done: false, priority: 1, score: 5 }; }
      this.memory(world, a, { type: 'arrival', text: 'came over the hills from a land I no longer remember', importance: 0.7, emotion: 'excitement', intensity: 0.5 });
      world.events.emit('StrangerArrived', { tick: world.tick, agentId: a.id, tile: ti, first: !world.firsts || !world.firsts['stranger'] });
      world.events.emit('AgentBorn', { tick: world.tick, agentId: a.id, genesis: true, stranger: true, tile: ti });
    },

    // ---------------- life stage & helpers"""),
]),
('src/history/history.js', [
("""        case 'AgentBorn': return ev.genesis ? { text: `${n(ev.agentId)} appeared in the world.`, base: 0.5, firstKey: 'genesis', firstTitle: 'The First Ones' }""",
 """        case 'StrangerArrived': return { text: `A stranger, ${n(ev.agentId)}, arrived from beyond the edge of the known land.`, base: 0.6, firstKey: 'stranger', firstTitle: 'First Stranger' };
        case 'AgentBorn': return ev.stranger ? null : ev.genesis ? { text: `${n(ev.agentId)} appeared in the world.`, base: 0.5, firstKey: 'genesis', firstTitle: 'The First Ones' }"""),
]),
]
