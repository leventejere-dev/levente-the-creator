/* LEVENTE — THE CREATOR · agents/actions.js — action state machines that execute plan steps, one tick at a time */
(function (LW) {
  'use strict';
  const A = () => LW.Agents, Bld = () => LW.Buildings, Eco = () => LW.Ecology;
  const RUN = 'running', DONE = 'done', FAIL = 'failed';

  function moveToward(world, a, tx, ty, maxStep) {
    const dx = tx - a.x, dy = ty - a.y; const d = Math.hypot(dx, dy); if (d < 1e-6) return 0;
    const step = Math.min(d, maxStep); const nx = a.x + dx / d * step, ny = a.y + dy / d * step;
    const ni = world.idx(nx | 0, ny | 0); if (!world.inBounds(nx | 0, ny | 0) || !world.isPassable(ni)) return -1;
    const oi = world.idx(a.x | 0, a.y | 0);
    a.x = nx; a.y = ny; if (Math.abs(dx) > 0.05) a.facing = dx > 0 ? 1 : 0;
    if (ni !== oi) Eco().footfall(world, ni);
    return step;
  }
  function near(world, a, i, r = 1.6) { return LW.dist(a.x, a.y, world.xOf(i) + 0.5, world.yOf(i) + 0.5) <= r; }
  const cnt = (m) => { let c = 0; for (const k in m) c += m[k]; return c; };

  const OPS = {
    moveTo(world, a, st) {
      const tx = world.xOf(st.i), ty = world.yOf(st.i); const acceptR = st.near ? 1.6 : 0.4;
      if (LW.dist(a.x, a.y, tx + 0.5, ty + 0.5) <= acceptR) return DONE;
      if (a.avoidTiles && a.avoidTiles[st.i] > world.tick) return FAIL;
      if (world.tiles.fire[st.i]) return FAIL;
      if (!st.path) {
        if (st.lastX != null && LW.dist(a.x, a.y, st.lastX, st.lastY) > 3) st.retries = 0; // progress resets the retry budget
        st.retries = (st.retries || 0) + 1; if (st.retries > 4) { if (st.poi) A().avoidPlace(world, a, st.poi.k, st.poi.i); return FAIL; }
        const p = world.findPath(a.x | 0, a.y | 0, tx, ty, 6000); if (!p) { if (st.poi) A().avoidPlace(world, a, st.poi.k, st.poi.i); else { a.avoidTiles = a.avoidTiles || {}; a.avoidTiles[st.i] = world.tick + 96 * 3; } return FAIL; }
        st.path = p; st.pi = 0; st.partial = !!p.partial; st.lastX = a.x; st.lastY = a.y;
      }
      const speed = A().speed(world, a) / Math.max(0.5, world.moveCost(world.idx(a.x | 0, a.y | 0)));
      let budget = speed;
      while (budget > 0.001) {
        if (st.pi >= st.path.length) { st.path = null; if (LW.dist(a.x, a.y, tx + 0.5, ty + 0.5) <= acceptR) return DONE; if (st.partial) return RUN; // recompute next tick
          return RUN; }
        const wp = st.path[st.pi]; const wx = world.xOf(wp) + 0.5, wy = world.yOf(wp) + 0.5;
        if (world.tiles.fire[wp]) { st.path = null; return RUN; }
        const d = LW.dist(a.x, a.y, wx, wy);
        if (d <= budget) { a.x = wx; a.y = wy; budget -= d; st.pi++; Eco().footfall(world, wp); if (Math.abs(wx - a.x) > 0.01) a.facing = wx > a.x ? 1 : 0; }
        else { const r = moveToward(world, a, wx, wy, budget); if (r < 0) { st.path = null; return RUN; } budget = 0; }
      }
      if (st.pi >= st.path.length && LW.dist(a.x, a.y, tx + 0.5, ty + 0.5) <= acceptR) return DONE;
      return RUN;
    },
    follow(world, a, st) {
      const t = world.agents.get(st.target); if (!t) return FAIL; st.t = (st.t || 0) + 1;
      const d = LW.dist(a.x, a.y, t.x, t.y);
      if (d > 1.5) { if (moveToward(world, a, t.x, t.y, A().speed(world, a)) < 0) { const p = world.findPath(a.x | 0, a.y | 0, t.x | 0, t.y | 0, 800); if (p && p.length) { const wp = p[0]; moveToward(world, a, world.xOf(wp) + 0.5, world.yOf(wp) + 0.5, A().speed(world, a)); } } }
      return st.t >= st.n ? DONE : RUN;
    },
    flee(world, a, st) {
      st.t = (st.t || 0) + 1; const t = world.tiles; const x = a.x | 0, y = a.y | 0;
      let best = -1, bs = -1e9;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (!world.inBounds(nx, ny)) continue; const i = world.idx(nx, ny); if (!world.isPassable(i) || t.fire[i]) continue; let s = 0; for (let fy = -4; fy <= 4; fy++) for (let fx = -4; fx <= 4; fx++) { const qx = nx + fx, qy = ny + fy; if (!world.inBounds(qx, qy)) continue; if (t.fire[world.idx(qx, qy)]) s -= 1 / (1 + Math.abs(fx) + Math.abs(fy)); } if (a.threat) { const th = world.agents.get(a.threat); if (th) s += LW.dist(nx, ny, th.x, th.y) * 0.3; } s += world.rng.f() * 0.1; if (s > bs) { bs = s; best = i; } }
      if (best >= 0) moveToward(world, a, world.xOf(best) + 0.5, world.yOf(best) + 0.5, A().speed(world, a) * 1.2);
      if (a.danger < 0.2 && st.t > 3) return DONE;
      return st.t >= st.n ? DONE : RUN;
    },
    gather(world, a, st, plan) {
      if (!near(world, a, st.i, 1.8)) return FAIL;
      const t = world.tiles; const i = st.i; st.t = (st.t || 0) + 1; st.acc = st.acc || 0; st.got = st.got || 0;
      const sk = a.skills.gathering; const lore = a.knowledge.techs.has('foraging_lore') ? 1.3 : 1; const fxm = LW.Tech.fx(world, a);
      let rate = 0, field = null, cost = 1, item = st.item;
      if (item === 'berries') { field = 'veg'; cost = 6; rate = (0.9 + sk) * lore * (a.inv.basket ? 1.3 : 1) * (1 + fxm.food); }
      else if (item === 'roots') { field = 'veg'; cost = 10; rate = (0.6 + sk * 0.8) * lore * (a.knowledge.techs.has('digging') ? 1.5 : 1) * (1 + fxm.food); }
      else if (item === 'fiber') { field = t.veg[i] >= 10 ? 'veg' : 'trees'; cost = 2; rate = 0.8 + sk * 0.6; }
      else if (item === 'wood') { field = 'trees'; cost = 6; rate = (0.45 + sk * 0.4) * (a.inv.handaxe || LW.Tree.bestTool(a, 'axe') >= 1 ? 2.2 : 1) * (a.knowledge.techs.has('woodworking') ? 1.3 : 1) * (1 + fxm.wood); }
      else if (item === 'stone') { field = 'stone'; cost = 5; rate = (0.5 + sk * 0.4) * (1 + fxm.stone); }
      else if (item === 'flint') { if (t.depType[i] === LW.DEPOSIT.FLINT && t.depAmt[i] > 0) { field = 'depAmt'; cost = 1; rate = 0.5 + sk * 0.3; } else if (t.stone[i] > 0) { field = 'stone'; cost = 10; rate = 0.3 + sk * 0.3; } else return FAIL; }
      else if (item === 'clay') { if (t.depType[i] === LW.DEPOSIT.CLAY && t.depAmt[i] > 0) { field = 'depAmt'; cost = 1; rate = (a.knowledge.techs.has('digging') ? 0.5 : 0.2) + sk * 0.3; } else if (t.biome[i] === LW.BIOME.MARSH) { field = null; rate = 0.15 + sk * 0.2; } else return FAIL; }
      else return FAIL;
      if (a.needs.energy < 0.15) rate *= 0.5;
      st.acc += rate;
      while (st.acc >= 1 && st.got < st.n) {
        if (field) { const have = t[field][i]; const floor = field === 'veg' ? 10 : 0; if (have < cost + floor) { break; } /* a bokrot nem szedik tövig: marad mag a jövőre */ t[field][i] = have - cost; if (field === 'veg' || field === 'trees') { if ((have >> 5) !== ((have - cost) >> 5)) world.dirtyTiles.add(i); } if (field === 'depAmt' && t.depAmt[i] === 0) { t.depType[i] = 0; } }
        st.acc -= 1;
        if (st.direct && LW.ITEMS[item].food) { a.needs.food = Math.min(1, a.needs.food + LW.ITEMS[item].food); if (LW.ITEMS[item].water) a.needs.water = Math.min(1, a.needs.water + LW.ITEMS[item].water); a.lastMeal = world.tick; st.got++; a.counters.gathered++; if (a.needs.food >= 0.95) { st.got = st.n; } A().practice(a, 'gathering', 1); continue; }
        let added = A().addItem(world, a, item, 1);
        if (added === 0 && (LW.ITEMS[item].food || st.needed) && A().makeRoom(world, a, LW.ITEMS[item].weight)) added = A().addItem(world, a, item, 1);
        if (added === 0) { st.full = true; break; } st.got++; a.counters.gathered++;
        A().practice(a, item === 'fiber' || item === 'clay' ? 'crafting' : 'gathering', 1); if (item === 'berries' || item === 'roots') A().practice(a, 'foraging', 0.6);
      }
      if (st.got >= st.n || st.full) { LW.Tech.accident(world, a, 'gather:' + item); if (field === 'veg' && t.veg[i] < 10) A().forgetPlace(a, 'food', i); return DONE; }
      if (field && t[field][i] < cost) { if (field === 'veg') A().forgetPlace(a, 'food', i); if (field === 'trees') A().forgetPlace(a, 'wood', i); return st.got > 0 ? DONE : FAIL; }
      if (st.t > 40) return st.got > 0 ? DONE : FAIL;
      return RUN;
    },
    hunt(world, a, st) {
      if (!near(world, a, st.i, 2.5)) return FAIL; const t = world.tiles; st.t = (st.t || 0) + 1; st.got = st.got || 0;
      const p = 0.12 * (0.5 + a.skills.hunting) * (LW.Tree.bestTool(a, 'hunt') >= 1 ? 1.5 : 0.4) * (1 + LW.Tech.fx(world, a).hunt) * (0.2 + t.animals[st.i] / 255) * (LW.Time.isNight(world.tick) ? 0.5 : 1);
      if (world.rng.chance(p)) { t.animals[st.i] = Math.max(0, t.animals[st.i] - 30); A().makeRoom(world, a, 2.4); const q = A().addItem(world, a, 'meat_raw', 2); st.got += q; if (world.rng.chance(0.5)) A().addItem(world, a, 'hide', 1); a.counters.hunted = (a.counters.hunted || 0) + 1; A().practice(a, 'hunting', 3); a.emotions.excitement = Math.min(1, a.emotions.excitement + 0.3); A().memory(world, a, { type: 'hunt', text: 'elejtettem egy vadat', importance: 0.35, emotion: 'excitement', intensity: 0.4 }); }
      else if (world.rng.chance(0.006)) A().damage(world, a, 0.15, 'sebzett vad');
      if (st.got >= st.n) return DONE; if (t.animals[st.i] < 15) { A().forgetPlace(a, 'animals', st.i); return st.got ? DONE : FAIL; }
      return st.t >= 28 ? (st.got ? DONE : FAIL) : RUN;
    },
    fish(world, a, st) {
      if (!near(world, a, st.i, 3.0)) return FAIL; const t = world.tiles; st.t = (st.t || 0) + 1; st.got = st.got || 0;
      const p = 0.35 * (0.5 + a.skills.hunting) * (0.3 + t.fish[st.i] / 255) * (a.inv.spear ? 1.3 : 1) * (a.inv.basket ? 1.2 : 1) * (1 + LW.Tech.fx(world, a).food * 0.5);
      if (world.rng.chance(p)) { t.fish[st.i] = Math.max(0, t.fish[st.i] - 15); A().makeRoom(world, a, 0.8); st.got += A().addItem(world, a, 'fish_raw', 1); a.counters.fished = (a.counters.fished || 0) + 1; A().practice(a, 'hunting', 2); }
      if (st.got >= st.n) return DONE; if (t.fish[st.i] < 20) { A().forgetPlace(a, 'fish', st.i); return st.got ? DONE : FAIL; }
      return st.t >= 28 ? (st.got ? DONE : FAIL) : RUN;
    },
    consume(world, a) { const f = A().foodInInventory(a); if (!f) return FAIL; A().eat(world, a, f); if (a.needs.food < 0.75 && A().foodInInventory(a)) A().eat(world, a, A().foodInInventory(a)); return DONE; },
    drink(world, a, st) { if (st.i != null && !near(world, a, st.i, 3.0)) return FAIL; a.needs.water = 1; a.emotions.joy = Math.min(1, a.emotions.joy + 0.02); return DONE; },
    takeFood(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; let n = st.n || 3; let got = 0; for (const k of Object.keys(b.storage)) { const d = LW.ITEMS[k]; if (!d || !d.food) continue; while (n > 0 && b.storage[k] > 0) { if (!A().addItem(world, a, k, 1)) { if (!A().makeRoom(world, a, d.weight) || !A().addItem(world, a, k, 1)) { n = 0; break; } } b.storage[k]--; n--; got++; } if (b.storage[k] <= 0) delete b.storage[k]; } return got > 0 ? DONE : FAIL; },
    store(world, a, st) {
      const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const cap = Bld().def(b).storage || 0; let used = 0; for (const k in b.storage) used += b.storage[k];
      const keepFood = 2; let foodKept = 0;
      for (const k of Object.keys(a.inv)) { const d = LW.ITEMS[k]; if (!d || d.tool) continue; let q = a.inv[k]; if (d.food) { const keep = Math.max(0, keepFood - foodKept); const kk = Math.min(q, keep); foodKept += kk; q -= kk; } if (q <= 0) continue; const room = cap - used; const mv = Math.min(q, room); if (mv <= 0) break; A().removeItem(a, k, mv); b.storage[k] = (b.storage[k] || 0) + mv; used += mv; }
      return DONE;
    },
    sleep(world, a, st) {
      st.t = (st.t || 0) + 1; a.sleeping = true;
      const dawn = !LW.Time.isNight(world.tick) && LW.Time.hour(world.tick) >= 5;
      if (a.needs.energy >= 0.97 || (dawn && a.needs.energy > 0.6 && st.t > 8) || st.t > 60) { a.sleeping = false; a.lastSleep = world.tick; return DONE; }
      return RUN;
    },
    wait(world, a, st, plan) { st.t = (st.t || 0) + 1; if (st.t >= st.n) { if (plan.tag) LW.Tech.accident(world, a, plan.tag); return DONE; } return RUN; },
    interact(world, a, st, plan) {
      const t = world.agents.get(st.target); if (!t) return FAIL;
      if (!st.started) {
        if (LW.dist(a.x, a.y, t.x, t.y) > 1.8) { st.tries = (st.tries || 0) + 1; if (st.tries > 6) return FAIL; moveToward(world, a, t.x, t.y, A().speed(world, a)); return RUN; }
        if ((t.engagedUntil > world.tick && t.engagedWith !== a.id) || (t.sleeping && st.kind !== 'mate') || (t.plan && t.plan.goal === 'flee')) return FAIL;
        st.started = true; a.engagedUntil = world.tick + st.n; a.engagedWith = t.id; t.engagedUntil = world.tick + st.n; t.engagedWith = a.id;
        if (t.plan && t.plan.goal !== 'sleep') t.plan.paused = st.n;
        a.facing = t.x > a.x ? 1 : 0; t.facing = a.x > t.x ? 1 : 0;
        LW.Social.interact(world, a, t, st.kind, st);
      }
      st.t = (st.t || 0) + 1; return st.t >= st.n ? DONE : RUN;
    },
    buildNew(world, a, st, plan) {
      const i = st.i; if (!near(world, a, i, 1.8)) return FAIL;
      const bridge = !!Bld().DEFS[st.kind].bridge;
      if ((world.buildingAt(i) && !bridge) || !world.isPassable(i) || (bridge && !(world._bridgeSites && world._bridgeSites.get(i)))) { const j = Bld().findSite(world, a, st.kind); if (j < 0) return FAIL; st.i = j; return RUN; }
      const b = Bld().create(world, st.kind, world.xOf(i), world.yOf(i), a.id);
      plan.steps.splice(plan.i + 1, 0, { op: 'deliver', bid: b.id }, { op: 'build', bid: b.id });
      return DONE;
    },
    deliver(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !Bld().nearBuilding(world, a, b, 1.8)) return FAIL; Bld().deliver(world, b, a); return DONE; },
    build(world, a, st) {
      const b = world.buildings.get(st.bid); if (!b) return FAIL; if (!Bld().nearBuilding(world, a, b, 1.8)) return FAIL;
      if (b.progress >= 1) return DONE; if (!Bld().materialsComplete(b)) { Bld().deliver(world, b, a); if (!Bld().materialsComplete(b)) return FAIL; }
      const finished = Bld().work(world, b, a); if (finished) { a.counters.built++; return DONE; }
      st.t = (st.t || 0) + 1; return st.t > 400 ? DONE : RUN;
    },
    refuel(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; return Bld().refuel(world, b, a) ? DONE : FAIL; },
    craft(world, a, st, plan) {
      const R = LW.Tech.RECIPES[st.recipe]; if (!R) return FAIL;
      if (!st.started) {
        if (R.nearby === 'fire') { const f = world.buildingsNear(a.x | 0, a.y | 0, 2).find((b) => b.kind === 'campfire' && b.lit); if (!f) return FAIL; }
        else if (R.nearby && R.nearby !== 'water') { const DEFS = Bld().DEFS; const nb = world.buildingsNear(a.x | 0, a.y | 0, 3).find((b) => b.progress >= 1 && (b.kind === R.nearby || DEFS[b.kind][R.nearby])); if (!nb) return FAIL; }
        let inp = R.inp; if (R.inpAny) inp = R.inpAny.find((o) => { for (const k in o) if ((a.inv[k] || 0) < o[k]) return false; return true; }); if (!inp) return FAIL;
        for (const k in inp) if ((a.inv[k] || 0) < inp[k]) return FAIL;
        for (const k in inp) A().removeItem(a, k, inp[k]); st.started = true; st.t = 0;
      }
      st.t++; if (st.t < Math.max(1, Math.round(R.ticks * (1 - a.skills.crafting * 0.4) / (1 + LW.Tech.fx(world, a).craft + LW.Tree.buildingBonus(world, a.x, a.y, 'craft', 4))))) return RUN;
      for (const k in R.out) { const add = A().addItem(world, a, k, R.out[k]); if (add < R.out[k]) { world.ground = world.ground || new Map(); const i = world.idx(a.x | 0, a.y | 0); const g = world.ground.get(i) || {}; g[k] = (g[k] || 0) + (R.out[k] - add); world.ground.set(i, g); } }
      A().practice(a, 'crafting', 3); a.counters.crafted = (a.counters.crafted || 0) + 1;
      if (LW.ITEMS[Object.keys(R.out)[0]].tool) { A().memory(world, a, { type: 'craft', text: `készítettem: ${LW.ITEMS[Object.keys(R.out)[0]].label.toLowerCase()}`, importance: 0.4, emotion: 'pride', intensity: 0.4 }); world.events.emit('ItemCrafted', { tick: world.tick, agentId: a.id, item: Object.keys(R.out)[0], first: !world.firsts || !world.firsts['item:' + Object.keys(R.out)[0]] }); }
      LW.Tech.accident(world, a, R.tag); return DONE;
    },
    experiment(world, a, st) {
      st.t = (st.t || 0) + 1; if (st.t < st.n) return RUN;
      const d = LW.Tech.D[st.tech]; if (!d) return FAIL;
      if (d.nearby === 'fire' && !world.buildingsNear(a.x | 0, a.y | 0, 2).find((b) => b.kind === 'campfire' && b.lit)) return FAIL;
      if (!LW.Tech.hasItems(a, d)) return FAIL;
      a.counters.experiments++; const ok = LW.Tech.attempt(world, a, st.tech);
      if (!ok) A().memory(world, a, { type: 'experiment', text: `próbáltam (${d.name.toLowerCase()}), nem sikerült`, importance: 0.15, emotion: 'stress', intensity: 0.2 });
      return DONE;
    },
    dig(world, a, st) {
      if (!near(world, a, st.i, 1.8)) return FAIL; st.t = (st.t || 0) + 1; if (st.t < st.n) return RUN;
      const t = world.tiles, i = st.i, dt = t.depType[i]; A().practice(a, 'gathering', 2);
      if (dt && t.depAmt[i] > 0) {
        const item = dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling') ? null : LW.DEPOSIT_ITEM[dt]; if (item) { const q = Math.min(t.depAmt[i], Math.round(world.rng.int(1, 3) * (1 + LW.Tech.fx(world, a).mine))); const add = A().addItem(world, a, item, q); t.depAmt[i] -= add; if (t.depKnown[i] < 2) { t.depKnown[i] = 2; world.dirtyTiles.add(i); } const name = LW.DEPOSIT_NAME[dt]; if (['copper', 'tin', 'iron', 'coal', 'gold'].includes(name) && !a.knowledge.techs.has('ore_lore_' + name)) { LW.Tech.learn(world, a, 'ore_lore_' + name, 'observation'); world.events.emit('ResourceFound', { tick: world.tick, agentId: a.id, tile: i, deposit: name, first: !world.firsts || !world.firsts['deposit:' + name] }); A().memory(world, a, { type: 'find', text: `kiástam: ${LW.ITEMS[item].label.toLowerCase()}`, importance: 0.6, emotion: 'excitement', intensity: 0.5 }); } if (dt === LW.DEPOSIT.CLAY) LW.Tech.observe(world, a, 'clay'); }
        if (t.depAmt[i] <= 0) { t.depType[i] = 0; A().forgetPlace(a, 'deposit', i); A().forgetPlace(a, 'clay', i); }
      } else { if (world.rng.chance(0.3)) A().addItem(world, a, 'stone', 1); if (t.biome[i] === LW.BIOME.MARSH && world.rng.chance(0.6)) { A().addItem(world, a, 'clay', 2); LW.Tech.observe(world, a, 'clay'); } }
      return DONE;
    },
    give(world, a, st) {
      const t = world.agents.get(st.target); if (!t || LW.dist(a.x, a.y, t.x, t.y) > 1.8) return FAIL;
      let item = st.item; if (item === '*food') item = A().foodInInventory(a); if (!item || !(a.inv[item] > 0)) return FAIL;
      const n = Math.min(st.n || 1, a.inv[item]); const moved = A().addItem(world, t, item, n); if (moved > 0) { A().removeItem(a, item, moved); LW.Social.gift(world, a, t, item, moved); }
      return DONE;
    },
    pickup(world, a, st) {
      if (!world.ground || !near(world, a, st.i, 1.8)) return FAIL; const g = world.ground.get(st.i); if (!g) return DONE;
      for (const k of Object.keys(g)) {
        const d = LW.ITEMS[k] || { weight: 1 };
        // hungry: eat straight from the pile
        if (d.food && a.needs.food < 0.7) { while (g[k] > 0 && a.needs.food < 0.95) { g[k]--; a.needs.food = Math.min(1, a.needs.food + d.food); if (d.water) a.needs.water = Math.min(1, a.needs.water + d.water); a.lastMeal = world.tick; } if (g[k] <= 0) { delete g[k]; continue; } }
        let add = A().addItem(world, a, k, g[k]); if (add === 0 && d.food && A().makeRoom(world, a, d.weight)) add = A().addItem(world, a, k, g[k]);
        g[k] -= add; if (g[k] <= 0) delete g[k];
      }
      if (!Object.keys(g).length) world.ground.delete(st.i); return DONE;
    },
    plant(world, a, st) { const b = world.buildings.get(st.bid); if (!b || b.progress < 1 || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; let seeds = 2; for (const k of ['roots', 'berries']) { while (seeds > 0 && (a.inv[k] || 0) > 0) { A().removeItem(a, k, 1); seeds--; } } if (seeds > 0) return FAIL; b.planted = true; b.crop = 0; A().practice(a, 'farming', 3); a.counters.farmed = (a.counters.farmed || 0) + 1; return DONE; },
    take(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !b.storage || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const have = b.storage[st.item] || 0; if (have <= 0) return FAIL; const q = Math.min(have, st.n || 1); const add = A().addItem(world, a, st.item, q); b.storage[st.item] -= add; if (b.storage[st.item] <= 0) delete b.storage[st.item]; return add > 0 ? DONE : FAIL; },
    harvest(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !b.planted || b.crop < 1 || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const def = Bld().def(b); const i = world.idx(b.x, b.y); const q = Math.round(((def.yieldBase || 30) + world.tiles.fert[i] / 255 * 30) * (1 + LW.Tech.fx(world, a).farm)); /* egy szántó egy családot etet, nem egy vacsorát */ const cropItem = def.cropItem || 'grain'; const add = A().addItem(world, a, cropItem, q); if (add < q) { world.ground = world.ground || new Map(); const g = world.ground.get(i) || {}; g[cropItem] = (g[cropItem] || 0) + (q - add); world.ground.set(i, g); } b.planted = !!def.perennial; b.crop = 0; if (!def.perennial) world.tiles.fert[i] = Math.max(20, world.tiles.fert[i] - 12); A().practice(a, 'farming', 4); a.counters.farmed = (a.counters.farmed || 0) + 2; world.events.emit('Harvest', { tick: world.tick, agentId: a.id, amount: q, tile: i, first: !world.firsts || !world.firsts['harvest'] }); return DONE; },
  };

  const Actions = {
    OPS,
    step(world, a) {
      const p = a.plan; if (!p || p.done) return;
      if (p.paused) { p.paused--; return; }
      if (a.engagedUntil > world.tick && !(p.steps[p.i] && p.steps[p.i].op === 'interact')) return;
      if (world.tick - p.startedTick > 700) { p.done = true; return; }
      const st = p.steps[p.i]; if (!st) { p.done = true; return; }
      const fn = OPS[st.op]; if (!fn) { p.done = true; return; }
      let res; try { res = fn(world, a, st, p); } catch (e) { if (world.onError) world.onError(e, a, st); res = FAIL; }
      if (res === DONE) { p.i++; if (p.i >= p.steps.length) { p.done = true; if (a.sleeping) a.sleeping = false; } }
      else if (res === FAIL) { p.done = true; p.failed = true; if (a.sleeping) a.sleeping = false; }
    },
    describe(world, a) {
      const p = a.plan; if (!p || p.done) return 'gondolkodik';
      const st = p.steps[p.i]; if (!st) return 'gondolkodik';
      const g = LW.Brain.describeGoal(p.goal); const item = (k) => (LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k);
      switch (st.op) {
        case 'moveTo': return `úton van (${g})`; case 'gather': return `gyűjt: ${item(st.item)}`; case 'hunt': return 'vadászik'; case 'fish': return 'halászik'; case 'sleep': return 'alszik'; case 'interact': return st.kind === 'converse' ? 'beszélget' : st.kind === 'flirt' ? 'flörtöl' : st.kind === 'mate' ? 'együtt van a párjával' : st.kind === 'fight' ? 'verekszik' : st.kind === 'teach' ? 'tanít' : st.kind;
        case 'build': case 'buildNew': case 'deliver': return `épít: ${LW.Buildings.DEFS[p.kind] ? LW.Buildings.DEFS[p.kind].label.toLowerCase() : ''}`; case 'craft': return `készít: ${st.recipe && LW.Tech.RECIPES[st.recipe] ? item(Object.keys(LW.Tech.RECIPES[st.recipe].out)[0]) : st.recipe}`; case 'experiment': return `kísérletezik: ${LW.Tech.D[st.tech].name.toLowerCase()}`; case 'dig': return 'ás'; case 'flee': return 'menekül'; case 'wait': return st.at === 'fire' ? 'a tűznél ül' : st.at === 'mourning' ? 'gyászol' : st.at === 'shelter' ? 'fedél alatt vár' : st.at === 'huddling' ? 'összebújva melegszik' : 'pihen'; case 'follow': return 'a szülőjét követi';
        default: return g;
      }
    },
  };
  LW.Actions = Actions;
})(globalThis.LW || (globalThis.LW = {}));
