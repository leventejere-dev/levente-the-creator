PATCHES = [
('src/agents/agent.js', [
("""    removeItem(a, item, q) {""",
 """    /** Drop bulky non-food, non-tool items on the ground until `weight` is free. Returns true if room was made. */
    makeRoom(world, a, weight) {
      const order = ['stone', 'clay', 'wood', 'fiber', 'ore_copper', 'ore_tin', 'ore_iron', 'coal', 'salt', 'gems', 'gold_nugget', 'hide'];
      const i = world.idx(a.x | 0, a.y | 0); world.ground = world.ground || new Map();
      for (const k of order) {
        while ((a.inv[k] || 0) > 0 && this.capacity(world, a) - this.load(a) < weight) { this.removeItem(a, k, 1); const g = world.ground.get(i) || {}; g[k] = (g[k] || 0) + 1; world.ground.set(i, g); }
        if (this.capacity(world, a) - this.load(a) >= weight) return true;
      }
      return this.capacity(world, a) - this.load(a) >= weight;
    },
    removeItem(a, item, q) {"""),
]),
('src/agents/actions.js', [
# eating straight from the bush, and making room for food
("""        st.acc -= 1;
        const added = A().addItem(world, a, item, 1); if (added === 0) { st.full = true; break; } st.got++; a.counters.gathered++;""",
 """        st.acc -= 1;
        if (st.direct && LW.ITEMS[item].food) { a.needs.food = Math.min(1, a.needs.food + LW.ITEMS[item].food); if (LW.ITEMS[item].water) a.needs.water = Math.min(1, a.needs.water + LW.ITEMS[item].water); a.lastMeal = world.tick; st.got++; a.counters.gathered++; if (a.needs.food >= 0.95) { st.got = st.n; } A().practice(a, 'gathering', 1); continue; }
        let added = A().addItem(world, a, item, 1);
        if (added === 0 && (LW.ITEMS[item].food || st.needed) && A().makeRoom(world, a, LW.ITEMS[item].weight)) added = A().addItem(world, a, item, 1);
        if (added === 0) { st.full = true; break; } st.got++; a.counters.gathered++;"""),
("""    takeFood(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; let n = st.n || 3; for (const k of Object.keys(b.storage)) { const d = LW.ITEMS[k]; if (!d || !d.food) continue; while (n > 0 && b.storage[k] > 0) { if (!A().addItem(world, a, k, 1)) { n = 0; break; } b.storage[k]--; n--; } if (b.storage[k] <= 0) delete b.storage[k]; } return DONE; },""",
 """    takeFood(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; let n = st.n || 3; let got = 0; for (const k of Object.keys(b.storage)) { const d = LW.ITEMS[k]; if (!d || !d.food) continue; while (n > 0 && b.storage[k] > 0) { if (!A().addItem(world, a, k, 1)) { if (!A().makeRoom(world, a, d.weight) || !A().addItem(world, a, k, 1)) { n = 0; break; } } b.storage[k]--; n--; got++; } if (b.storage[k] <= 0) delete b.storage[k]; } return got > 0 ? DONE : FAIL; },"""),
("""      if (world.rng.chance(p)) { t.animals[st.i] = Math.max(0, t.animals[st.i] - 30); const q = A().addItem(world, a, 'meat_raw', 2); st.got += q;""",
 """      if (world.rng.chance(p)) { t.animals[st.i] = Math.max(0, t.animals[st.i] - 30); A().makeRoom(world, a, 2.4); const q = A().addItem(world, a, 'meat_raw', 2); st.got += q;"""),
("""      if (world.rng.chance(p)) { t.fish[st.i] = Math.max(0, t.fish[st.i] - 15); st.got += A().addItem(world, a, 'fish_raw', 1);""",
 """      if (world.rng.chance(p)) { t.fish[st.i] = Math.max(0, t.fish[st.i] - 15); A().makeRoom(world, a, 0.8); st.got += A().addItem(world, a, 'fish_raw', 1);"""),
]),
('src/agents/brain.js', [
("""        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i, poi: { k: 'food', i: c.food.i } }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.4) ? 'roots' : 'berries', n: 4 }, { op: 'consume' }], tag: 'gather:berries' });""",
 """        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i, poi: { k: 'food', i: c.food.i } }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.4) ? 'roots' : 'berries', n: 4, direct: true }], tag: 'gather:berries' });"""),
# materials for building/crafting are "needed": make room for them
("""      steps.push({ op: 'moveTo', i: target, poi: { k: src === 'fiber' ? 'food' : src, i: poi.i } }); steps.push({ op, i: poi.i, item, n: q });""",
 """      steps.push({ op: 'moveTo', i: target, poi: { k: src === 'fiber' ? 'food' : src, i: poi.i } }); steps.push({ op, i: poi.i, item, n: q, needed: true });"""),
]),
]
