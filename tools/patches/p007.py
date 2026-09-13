PATCHES = [
('src/agents/agent.js', [
("""    // ---------------- knowledge of places
    poiKey(kind, idx) { return kind + ':' + idx; },
    rememberPlace(world, a, kind, idx, q) {
      const key = this.poiKey(kind, idx); const cur = a.knowledge.places.get(key);
      if (cur) { cur.q = q; cur.t = world.tick; return; }
      a.knowledge.places.set(key, { k: kind, i: idx, q, t: world.tick });
      if (a.knowledge.places.size > world.cfg.agents.poiCap) { let oldest = null, ot = Infinity; for (const [kk, v] of a.knowledge.places) if (v.t < ot && v.k !== 'water') { ot = v.t; oldest = kk; } if (oldest) a.knowledge.places.delete(oldest); }
    },
    forgetPlace(a, kind, idx) { a.knowledge.places.delete(this.poiKey(kind, idx)); },""",
 """    // ---------------- knowledge of places (numeric keys: kind × 2^20 + tile index)
    POI_KINDS: ['water', 'food', 'wood', 'stone', 'flint', 'clay', 'animals', 'fish', 'deposit', 'fire'],
    poiKey(kind, idx) { return this.POI_KINDS.indexOf(kind) * 1048576 + idx; },
    knowsPlace(a, kind, idx) { return a.knowledge.places.has(this.poiKey(kind, idx)); },
    rememberPlace(world, a, kind, idx, q) {
      const key = this.poiKey(kind, idx); const cur = a.knowledge.places.get(key);
      if (cur) { cur.q = q; cur.t = world.tick; return; }
      a.knowledge.places.set(key, { k: kind, i: idx, q, t: world.tick });
      const cap = world.cfg.agents.poiCap;
      if (a.knowledge.places.size > cap * 1.3) { // batch eviction of the least recently seen (water is never forgotten)
        const entries = [...a.knowledge.places.entries()].filter(([, v]) => v.k !== 'water').sort((x, y) => x[1].t - y[1].t);
        const drop = a.knowledge.places.size - cap; for (let k = 0; k < drop && k < entries.length; k++) a.knowledge.places.delete(entries[k][0]);
      }
    },
    forgetPlace(a, kind, idx) { a.knowledge.places.delete(this.poiKey(kind, idx)); },"""),
]),
('src/agents/perception.js', [
("""        if (t.veg[i] >= 12) A.rememberPlace(world, a, 'food', i, t.veg[i]); else if (a.knowledge.places.has('food:' + i)) A.forgetPlace(a, 'food', i);
        if (t.trees[i] >= 15) A.rememberPlace(world, a, 'wood', i, t.trees[i]); else if (a.knowledge.places.has('wood:' + i)) A.forgetPlace(a, 'wood', i);
        if (t.stone[i] >= 20) A.rememberPlace(world, a, 'stone', i, t.stone[i]);
        if (t.animals[i] >= 25) A.rememberPlace(world, a, 'animals', i, t.animals[i]); else if (a.knowledge.places.has('animals:' + i)) A.forgetPlace(a, 'animals', i);""",
 """        if (t.veg[i] >= 12) A.rememberPlace(world, a, 'food', i, t.veg[i]); else if (A.knowsPlace(a, 'food', i)) A.forgetPlace(a, 'food', i);
        if (t.trees[i] >= 15) A.rememberPlace(world, a, 'wood', i, t.trees[i]); else if (A.knowsPlace(a, 'wood', i)) A.forgetPlace(a, 'wood', i);
        if (t.stone[i] >= 20) { A.rememberPlace(world, a, 'stone', i, t.stone[i]); if (t.stone[i] >= 70 && (b === B.HILLS || b === B.MOUNTAIN || b === B.BEACH) && !t.depType[i]) A.rememberPlace(world, a, 'flint', i, t.stone[i] >> 1); }
        if (t.animals[i] >= 25) A.rememberPlace(world, a, 'animals', i, t.animals[i]); else if (A.knowsPlace(a, 'animals', i)) A.forgetPlace(a, 'animals', i);"""),
]),
('src/persistence/persistence.js', [
("""    a.knowledge = { techs: new Set(o.knowledge.techs), places: new Map(o.knowledge.places.map((p) => [p.k + ':' + p.i, p])), progress: o.knowledge.progress || {} };""",
 """    a.knowledge = { techs: new Set(o.knowledge.techs), places: new Map(o.knowledge.places.map((p) => [LW.Agents.poiKey(p.k, p.i), p])), progress: o.knowledge.progress || {} };"""),
]),
('src/world/ecology.js', [
("""      if (capped !== t.path[i]) { t.path[i] = capped; world.dirtyTiles.add(i); if (capped === 2 && tier === 2) world.events.emit('PathFormed', { tick: world.tick, tile: i }); }""",
 """      if (capped !== t.path[i]) { t.path[i] = capped; world.dirtyTiles.add(i); if (capped === 2 && tier === 2 && !world.pathAnnounced.has(i)) { world.pathAnnounced.add(i); if (world.pathAnnounced.size === 1 || world.pathAnnounced.size % 25 === 0) world.events.emit('PathFormed', { tick: world.tick, tile: i }); } }"""),
("""      world.fireStats = world.fireStats || { activeSince: -1, burned: 0, cause: null, origin: -1 };""",
 """      world.fireStats = world.fireStats || { activeSince: -1, burned: 0, cause: null, origin: -1 };
      world.pathAnnounced = world.pathAnnounced || new Set();"""),
]),
('src/agents/actions.js', [
("""      else if (item === 'flint') { if (t.depType[i] === LW.DEPOSIT.FLINT && t.depAmt[i] > 0) { field = 'depAmt'; cost = 1; rate = 0.4 + sk * 0.3; } else if (t.stone[i] > 0) { field = 'stone'; cost = 12; rate = 0.15 + sk * 0.2; } else return FAIL; }""",
 """      else if (item === 'flint') { if (t.depType[i] === LW.DEPOSIT.FLINT && t.depAmt[i] > 0) { field = 'depAmt'; cost = 1; rate = 0.5 + sk * 0.3; } else if (t.stone[i] > 0) { field = 'stone'; cost = 10; rate = 0.3 + sk * 0.3; } else return FAIL; }"""),
]),
('src/agents/social.js', [
# breakups: stronger resentment and a long cooldown before the exes flirt again
("""      rt.resentment = b01(rt.resentment + 0.35); ra.resentment = b01(ra.resentment + 0.1);""",
 """      rt.resentment = b01(rt.resentment + 0.6); ra.resentment = b01(ra.resentment + 0.2); ra.lastFlirt = world.tick + LW.TIME.TICKS_PER_DAY * 60; rt.lastFlirt = world.tick + LW.TIME.TICKS_PER_DAY * 60;"""),
# leaving a partner for another needs a real reason
("""        else if (ra.status === 'dating' && ra.romance >= cfg.partnerThreshold && rt.romance >= cfg.partnerThreshold && world.tick - ra.datingSince > LW.TIME.TICKS_PER_DAY * 8) this.becomePartners(world, a, t, ra, rt);""",
 """        else if (ra.status === 'dating' && ra.romance >= cfg.partnerThreshold && rt.romance >= cfg.partnerThreshold && world.tick - ra.datingSince > LW.TIME.TICKS_PER_DAY * 8) { const leaves = (x, other, rx) => { if (x.partner == null || x.partner === other.id) return true; const cur = x.relationships.get(x.partner); return !cur || (rx.attraction > cur.attraction + 0.2 && cur.friendship < 0.5 && x.personality.loyalty < 0.6); }; if (leaves(a, t, ra) && leaves(t, a, rt)) this.becomePartners(world, a, t, ra, rt); }"""),
]),
('src/agents/brain.js', [
("""          let s = r.attraction * (0.5 + u(N(a).affection)) * (single ? 1 : (1 - P(a).loyalty) * 0.5) * (oSingle ? 1 : 0.4) * (0.6 + P(a).sociability * 0.4) * (E(a).joy > 0.2 ? 1 : 0.7);""",
 """          let s = r.attraction * (0.5 + u(N(a).affection)) * (single ? 1 : (1 - P(a).loyalty) * 0.25) * (oSingle ? 1 : 0.3) * (0.6 + P(a).sociability * 0.4) * (E(a).joy > 0.2 ? 1 : 0.7);"""),
]),
]
