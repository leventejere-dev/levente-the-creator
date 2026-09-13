PATCHES = [
('src/agents/brain.js', [
("""      const current = a.plan;
      // hysteresis: keep the current plan unless clearly beaten
      if (current && !force && !current.done && cand.length && cand[0].id !== current.goal) {
        const curScore = current.score ?? 0; if (cand[0].s < curScore * 1.25 + 0.1 && current.priority !== 0 && (world.tick - current.startedTick) < 300) return current;
      }""",
"""      const current = a.plan;
      // hysteresis: keep the current plan unless clearly beaten (compared against its *fresh* score)
      if (current && !force && !current.done && cand.length && cand[0].id !== current.goal) {
        const fresh = cand.find((c) => c.id === current.goal); const curScore = fresh ? fresh.s : 0;
        const urgent = cand[0].s > 1.2 && ['drink', 'eat', 'flee', 'getWarm', 'careForChild'].includes(cand[0].id);
        if (!urgent && cand[0].s < curScore * 1.25 + 0.1 && (world.tick - current.startedTick) < 300) { current.score = curScore; return current; }
      }"""),
("""      if (a.sleeping) return a.danger > 0.4 || a.needs.food < 0.08 || a.needs.water < 0.08 || a.needs.warmth < 0.1;""",
 """      if (a.sleeping) return a.danger > 0.4 || a.needs.food < 0.12 || a.needs.water < 0.18 || a.needs.warmth < 0.12;"""),
("""      if (!poi) return null;
      const target = tileNear(world, poi.i); if (target == null) return null;
      steps.push({ op: 'moveTo', i: target }); steps.push({ op, i: poi.i, item, n: q });""",
 """      if (!poi) return null;
      const target = tileNear(world, poi.i); if (target == null) return null;
      steps.push({ op: 'moveTo', i: target, poi: { k: src === 'fiber' ? 'food' : src, i: poi.i } }); steps.push({ op, i: poi.i, item, n: q });"""),
("""      plan: (c, a) => { const t = tileNear(c.world, c.water.i); return t == null ? null : { steps: [{ op: 'moveTo', i: t }, { op: 'drink', i: c.water.i }] }; },""",
 """      plan: (c, a) => { const t = tileNear(c.world, c.water.i); return t == null ? null : { steps: [{ op: 'moveTo', i: t, poi: { k: 'water', i: c.water.i } }, { op: 'drink', i: c.water.i }] }; },"""),
("""        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.4) ? 'roots' : 'berries', n: 4 }, { op: 'consume' }], tag: 'gather:berries' });
        if (a.inv.spear && c.animals) opts.push({ d: c.animals.d * 0.8, steps: [{ op: 'moveTo', i: c.animals.i }, { op: 'hunt', i: c.animals.i, item: 'meat_raw', n: 2 }, { op: 'consume' }], tag: 'hunt:animals' });
        if (c.fish && a.knowledge.techs.has('fishing')) { const t = tileNear(c.world, c.fish.i); if (t != null) opts.push({ d: c.fish.d * 0.9, steps: [{ op: 'moveTo', i: t }, { op: 'fish', i: c.fish.i, item: 'fish_raw', n: 2 }, { op: 'consume' }], tag: 'fish:fish' }); }""",
 """        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i, poi: { k: 'food', i: c.food.i } }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.4) ? 'roots' : 'berries', n: 4 }, { op: 'consume' }], tag: 'gather:berries' });
        if (a.inv.spear && c.animals) opts.push({ d: c.animals.d * 0.8, steps: [{ op: 'moveTo', i: c.animals.i, poi: { k: 'animals', i: c.animals.i } }, { op: 'hunt', i: c.animals.i, item: 'meat_raw', n: 2 }, { op: 'consume' }], tag: 'hunt:animals' });
        if (c.fish && a.knowledge.techs.has('fishing')) { const t = tileNear(c.world, c.fish.i); if (t != null) opts.push({ d: c.fish.d * 0.9, steps: [{ op: 'moveTo', i: t, poi: { k: 'fish', i: c.fish.i } }, { op: 'fish', i: c.fish.i, item: 'fish_raw', n: 2 }, { op: 'consume' }], tag: 'fish:fish' }); }"""),
("""        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.3) ? 'roots' : 'berries', n: Math.min(cap, 6) }], tag: 'gather:berries' });
        if (a.inv.spear && c.animals) opts.push({ d: c.animals.d * 0.7, steps: [{ op: 'moveTo', i: c.animals.i }, { op: 'hunt', i: c.animals.i, item: 'meat_raw', n: 3 }], tag: 'hunt:animals' });
        if (c.fish && a.knowledge.techs.has('fishing')) { const t = tileNear(c.world, c.fish.i); if (t != null) opts.push({ d: c.fish.d * 0.8, steps: [{ op: 'moveTo', i: t }, { op: 'fish', i: c.fish.i, item: 'fish_raw', n: 3 }], tag: 'fish:fish' }); }""",
 """        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i, poi: { k: 'food', i: c.food.i } }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.3) ? 'roots' : 'berries', n: Math.min(cap, 6) }], tag: 'gather:berries' });
        if (a.inv.spear && c.animals) opts.push({ d: c.animals.d * 0.7, steps: [{ op: 'moveTo', i: c.animals.i, poi: { k: 'animals', i: c.animals.i } }, { op: 'hunt', i: c.animals.i, item: 'meat_raw', n: 3 }], tag: 'hunt:animals' });
        if (c.fish && a.knowledge.techs.has('fishing')) { const t = tileNear(c.world, c.fish.i); if (t != null) opts.push({ d: c.fish.d * 0.8, steps: [{ op: 'moveTo', i: t, poi: { k: 'fish', i: c.fish.i } }, { op: 'fish', i: c.fish.i, item: 'fish_raw', n: 3 }], tag: 'fish:fish' }); }"""),
("""          if (!A().isAdult(c.world, o) || o.sleeping) continue; const r = LW.Relationships.ensure(c.world, a, o); if (r.attraction < 0.3 || r.status === 'family') continue;""",
 """          if (!A().isAdult(c.world, o) || o.sleeping) continue; const r = LW.Relationships.ensure(c.world, a, o); if (r.attraction < 0.3 || r.status === 'family') continue; if (r.lastFlirt != null && c.tick - r.lastFlirt < 40) continue;"""),
("""const r = a.relationships.get(o.id); const aff = r ? 0.3 + r.friendship * 0.7 + (r.status === 'family' ? 0.3 : 0) + (a.partner === o.id ? 0.4 : 0) - r.resentment : 0.35;""",
 """const r = a.relationships.get(o.id); if (r && c.tick - r.last < 20) continue; const aff = r ? 0.3 + r.friendship * 0.7 + (r.status === 'family' ? 0.3 : 0) + (a.partner === o.id ? 0.4 : 0) - r.resentment : 0.35;"""),
]),
('src/agents/social.js', [
("""      a.counters.flirts++; const cfg = world.cfg.social; const kin = R().kinship(world, a, t);""",
 """      a.counters.flirts++; const cfg = world.cfg.social; const kin = R().kinship(world, a, t); ra.lastFlirt = world.tick; rt.lastFlirt = world.tick;"""),
]),
('src/agents/actions.js', [
("""      if (!st.path) {
        st.retries = (st.retries || 0) + 1; if (st.retries > 4) return FAIL;
        const p = world.findPath(a.x | 0, a.y | 0, tx, ty, 4000); if (!p) return FAIL;
        st.path = p; st.pi = 0; st.partial = !!p.partial;
      }""",
 """      if (!st.path) {
        if (st.lastX != null && LW.dist(a.x, a.y, st.lastX, st.lastY) > 3) st.retries = 0; // progress resets the retry budget
        st.retries = (st.retries || 0) + 1; if (st.retries > 4) { if (st.poi) A().forgetPlace(a, st.poi.k, st.poi.i); return FAIL; }
        const p = world.findPath(a.x | 0, a.y | 0, tx, ty, 12000); if (!p) { if (st.poi) A().forgetPlace(a, st.poi.k, st.poi.i); return FAIL; }
        st.path = p; st.pi = 0; st.partial = !!p.partial; st.lastX = a.x; st.lastY = a.y;
      }"""),
]),
('src/agents/agent.js', [
("""      const clothing = a.inv.clothes ? LW.ITEMS.clothes.warmth : 0;
      const eff = temp + fx.warmth + clothing + (a.sleeping && fx.inside ? 2 : 0) - (world.rainAt(i) * (fx.inside ? 0 : 6)) - (world.weather.wind.speed * (fx.inside ? 0 : 4));
      a.effTemp = eff;
      if (eff >= 16) a.needs.warmth = Math.min(1, a.needs.warmth + 0.6 * dt * (1 + (eff - 16) / 10));
      else a.needs.warmth = Math.max(0, a.needs.warmth - ((16 - eff) / 25) * dt);""",
 """      const clothing = a.inv.clothes ? LW.ITEMS.clothes.warmth : 0;
      const cover = fx.inside ? 0 : Math.min(0.6, world.tiles.trees[i] / 255 * 0.7); // tree cover blunts rain and wind
      const huddle = fx.inside ? 0 : Math.min(4, world.agentsNear(a.x, a.y, 1.5, a.id).length * 2);
      const activity = a.sleeping ? 0 : 3;
      const eff = temp + fx.warmth + clothing + huddle + activity + (a.sleeping && fx.inside ? 2 : 0) - (world.rainAt(i) * (fx.inside ? 0 : 6 * (1 - cover))) - (world.weather.wind.speed * (fx.inside ? 0 : 4 * (1 - cover)));
      a.effTemp = eff;
      if (eff >= 12) a.needs.warmth = Math.min(1, a.needs.warmth + 0.8 * dt * (1 + (eff - 12) / 10));
      else a.needs.warmth = Math.max(0, a.needs.warmth - ((12 - eff) / 30) * dt);"""),
]),
('src/core/config.js', [
("""      needDrainPerDay: { food: 1.0, water: 1.4, energy: 1.5, social: 0.35, affection: 0.12, curiosity: 0.2 },
      starvationHealthPerDay: 0.06,
      dehydrationHealthPerDay: 0.25,""",
 """      needDrainPerDay: { food: 1.0, water: 1.0, energy: 1.5, social: 0.35, affection: 0.12, curiosity: 0.2 },
      starvationHealthPerDay: 0.06,
      dehydrationHealthPerDay: 0.2,"""),
]),
]
