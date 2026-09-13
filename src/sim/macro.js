/* LEVENTE — THE CREATOR · sim/macro.js
 * Day-scale simulation used for long catch-ups. The world (weather, ecology, fire,
 * buildings) runs its real per-tick model; agents are advanced statistically but
 * through the same event-producing functions (conversations, flirts, births,
 * discoveries, construction) so history stays real. (SIMULATION_MODEL.md §6)
 */
(function (LW) {
  'use strict';
  const T = LW.TIME, A = () => LW.Agents;

  const Macro = {
    day(world) {
      const w = world, rng = w.rng;
      // world systems: real ticks without agents
      for (let k = 0; k < T.TICKS_PER_DAY; k++) { w.tick++; w.weather.step(); LW.Ecology.stepSlice(w); LW.Ecology.stepFire(w); LW.Buildings.step(w); if (w.tick % T.TICKS_PER_YEAR === 0) w.history.yearEnd(); }
      w.meta.lastSimulatedTick = w.tick; w.rebuildBuckets();
      const season = LW.Time.season(w.tick); const seasonFood = [1, 1.05, 0.95, 0.8][season];
      const agents = w.agentList();
      for (const a of agents) {
        if (!w.agents.has(a.id)) continue;
        try { this.agentDay(w, a, seasonFood); } catch (e) { if (w.onError) w.onError(e, a, { op: 'macro' }); }
      }
      LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w); LW.Society.daily(w);
      for (const [i, g] of w.ground) { A().spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); }
    },
    agentDay(w, a, seasonFood) {
      const rng = w.rng; const stage = A().stage(w, a); const adult = stage === 'adult' || stage === 'elder'; const child = stage === 'infant' || stage === 'child';
      const home = a.home != null ? w.buildings.get(a.home) : null;
      if (home) { a.x = home.x + 0.5; a.y = home.y + 0.5; }
      else { // the homeless drift toward other people (a day's walk at most)
        let bestO = null, bd = 1e9; for (const o of w.agents.values()) { if (o === a || (o.home == null && !A().isAdult(w, o))) continue; const d = LW.dist(a.x, a.y, o.x, o.y); if (d < bd && d > 2) { bd = d; bestO = o; } }
        if (bestO && bd > 4) { const step = Math.min(bd - 3, 12); const nx = a.x + (bestO.x - a.x) / bd * step, ny = a.y + (bestO.y - a.y) / bd * step; const ti = w.randomNear(nx | 0, ny | 0, 1); a.x = w.xOf(ti) + 0.5; a.y = w.yOf(ti) + 0.5; }
      }
      const hh = A().household(w, a); const i = w.idx(a.x | 0, a.y | 0);
      // the young learn where things are from the people they live with
      if (!adult) { const cg = [...A().caregivers(w, a), ...hh.filter((o) => o !== a && A().isAdult(w, o))]; for (const c of cg) { const pl = [...c.knowledge.places.values()]; for (let k = 0; k < 4 && pl.length; k++) { const p = rng.pick(pl); A().rememberPlace(w, a, p.k, p.i, p.q); } } }
      // ---- food & water
      let intake;
      const supported = A().caregivers(w, a).length > 0 || hh.some((o) => o !== a && A().isAdult(w, o)) || (!adult && w.agentsNear(a.x, a.y, 14, a.id).some((o) => A().isAdult(w, o))); // orphans are taken in by the people around them
      if (child) { intake = supported ? 0.95 : 0.4; }
      else {
        const foodQ = Math.min(1, [...a.knowledge.places.values()].filter((p) => p.k === 'food').reduce((s, p) => s + p.q, 0) / 400);
        const hunt = a.inv.spear && A().knownCount(a, 'animals') ? 0.4 : 0; const fish = a.knowledge.techs.has('fishing') && A().knownCount(a, 'fish') ? 0.35 : 0;
        intake = (0.55 + 0.5 * (0.6 + a.skills.gathering * 0.6) * seasonFood * foodQ * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1) + hunt + fish) * (1 + LW.Tech.fx(w, a).food * 0.6 + LW.Tech.fx(w, a).farm * 0.2);
        if (stage === 'adolescent' && supported) intake = Math.max(intake, 0.9);
        // people who live together share food
        if (intake < 0.9) { const donors = hh.filter((o) => o !== a && A().isAdult(w, o)); if (donors.length) intake = Math.max(intake, 0.85); }
        if (home && home.storage) { const stock = A().foodUnits(home.storage); if (stock > 0 && intake < 1) { const need = Math.min(stock, (1 - intake) * 1.5); for (const k of Object.keys(home.storage)) { const d = LW.ITEMS[k]; if (!d || !d.food) continue; let take = Math.min(home.storage[k], Math.ceil(need / d.food)); home.storage[k] -= take; if (home.storage[k] <= 0) delete home.storage[k]; intake += take * d.food / 1.5; if (intake >= 1) break; } }
          else if (intake > 1.1 && LW.Buildings.def(home).storage) { const surplus = Math.floor((intake - 1) * 2); home.storage.berries = Math.min((LW.Buildings.def(home).storage || 0), (home.storage.berries || 0) + surplus); } }
      }
      const cfg = w.cfg.agents;
      const deficit = Math.max(0, 0.9 - intake);
      if (deficit > 0) { a.health = Math.max(0, a.health - cfg.starvationHealthPerDay * deficit * 1.5); a.needs.food = Math.max(0.05, intake * 0.6); } else { a.needs.food = 0.7; a.health = Math.min(1 - a.injury, a.health + 0.1); }
      if (!A().knownCount(a, 'water') && !child) { a.health = Math.max(0, a.health - cfg.dehydrationHealthPerDay * 0.3); a.needs.water = 0.2; } else a.needs.water = 0.75;
      // ---- warmth (mean of the day)
      let temp = 0; for (let h = 0; h < 4; h++) { temp += w.tiles.baseTemp[i]; } temp = w.tileTemp(i) - 2; // tileTemp includes diurnal (evening) — approximate daily mean
      const fireNear = [...w.buildings.values()].some((b) => b.kind === 'campfire' && b.lit && LW.dist(b.x, b.y, a.x, a.y) < 4);
      const eff = temp + 2 + (home ? LW.Buildings.def(home).insulation || 0 : Math.min(3, hh.length)) + (fireNear ? 8 : 0) + (a.inv.clothes ? 8 : 0);
      if (eff < 8) { a.health = Math.max(0, a.health - cfg.hypothermiaHealthPerDay * (8 - eff) / 10); a.needs.warmth = 0.2; } else a.needs.warmth = 0.9;
      a.needs.energy = 0.8; a.needs.social = Math.min(1, a.needs.social + 0.2); a.needs.safety = home ? 0.8 : 0.5;
      if (a.health <= 0) { A().die(w, a, deficit > 0 ? 'éhezés' : eff < 8 ? 'kihűlés' : 'betegség'); return; }
      if (a.memory.episodic.length > w.cfg.agents.memoryCap) LW.Memory.consolidate(w, a);
      // emotions decay
      for (const k in a.emotions) a.emotions[k] *= k === 'grief' ? 0.9 : 0.6;
      // daily biology (aging, illness, pregnancy, development, relationships decay, occupation)
      A().daily(w, a); if (!w.agents.has(a.id)) return;
      // ---- social life
      const near = w.agentsNear(a.x, a.y, 14, a.id).filter((o) => w.agents.has(o.id));
      if (near.length && stage !== 'infant') { const n = 1 + rng.int(0, 2); for (let k = 0; k < n; k++) { const o = rng.pick(near); if (A().stage(w, o) !== 'infant' && rng.chance(0.7)) LW.Social.interact(w, a, o, 'converse', {}); } }
      if (adult) {
        if (a.partner != null && w.agents.has(a.partner)) { const p = w.agents.get(a.partner); if (rng.chance(0.5)) LW.Social.interact(w, a, p, 'mate', {}); }
        else if (near.length && rng.chance(0.12)) { let best = null, bs = 0.35; for (const o of near) { if (!A().isAdult(w, o)) continue; const r = LW.Relationships.ensure(w, a, o); if (r.status === 'family' && LW.Relationships.kinship(w, a, o) >= 0.9) continue; if (r.lastFlirt != null && w.tick - r.lastFlirt < T.TICKS_PER_DAY * 6) continue; if (r.attraction > bs) { bs = r.attraction; best = o; } } if (best) LW.Social.interact(w, a, best, 'flirt', {}); }
        // partners with dating status progress
        for (const [id, r] of a.relationships) if (r.status === 'dating' && rng.chance(0.3)) { const o = w.agents.get(id); if (o) LW.Social.interact(w, a, o, 'flirt', {}); }
      }
      // ---- teaching children
      if (adult) for (const cid of a.children) { const c = w.agents.get(cid); if (!c || A().isAdult(w, c)) continue; const cand = [...a.knowledge.techs].filter((t) => !c.knowledge.techs.has(t) && !LW.Tech.D[t].hidden && (!LW.Tech.D[t].prereq || LW.Tech.D[t].prereq.every((p) => c.knowledge.techs.has(p)))); if (cand.length && rng.chance(0.2)) LW.Social.interact(w, a, c, 'teach', { tech: rng.pick(cand) }); const hid = [...a.knowledge.techs].filter((t) => !c.knowledge.techs.has(t) && LW.Tech.D[t].hidden); if (hid.length && rng.chance(0.3)) LW.Tech.learn(w, c, rng.pick(hid), 'taught', a); }
      // ---- discovery
      if (adult && a.health > 0.4 && intake > 0.8 && rng.chance(0.12 * (0.3 + a.personality.curiosity))) {
        const el = LW.Tech.eligible(w, a).filter((id) => { const d = LW.Tech.D[id]; if (d.nearby === 'fire' && !fireNear) return false; if (d.nearby === 'water' && !A().knownCount(a, 'water')) return false; if (d.nearby && d.nearby !== 'fire' && d.nearby !== 'water' && !this.buildingNear(w, a, d.nearby, 24)) return false; return true; });
        if (el.length) { const id = rng.pick(el); const d = LW.Tech.D[id]; const can = LW.Tech.hasItems(a, d) || this.canSource(w, a, d); if (can) { a.counters.experiments++; if (rng.chance(LW.Tech.successChance(w, a, d))) LW.Tech.learn(w, a, id, 'discovery'); else a.knowledge.progress[id] = Math.min(0.95, (a.knowledge.progress[id] || 0) + 0.06); } }
      }
      // ---- skills & tools
      if (adult) { A().practice(a, 'gathering', 8); A().practice(a, 'foraging', 5); A().practice(a, 'crafting', 2); A().practice(a, 'building', home ? 1 : 2); A().practice(a, 'exploring', 1 + a.personality.curiosity * 2); if ((a.inv.spear || LW.Tree.bestTool(a, 'hunt') >= 1) && A().knownCount(a, 'animals')) A().practice(a, 'hunting', 4); if (a.knowledge.techs.has('seed_planting')) A().practice(a, 'farming', 5); if (a.knowledge.techs.has('herbal_medicine')) A().practice(a, 'medicine', 2); A().practice(a, 'social', 2); if (a.knowledge.techs.has('stone_knapping') && !a.inv.handaxe && A().knownCount(a, 'stone') && A().knownCount(a, 'flint') && rng.chance(0.3)) { a.inv.handaxe = 1; w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: 'handaxe', first: !w.firsts['item:handaxe'] }); } if (a.knowledge.techs.has('spear_making') && !a.inv.spear && rng.chance(0.3)) { a.inv.spear = 1; w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: 'spear', first: !w.firsts['item:spear'] }); } if (a.knowledge.techs.has('basket_weaving') && !a.inv.basket && rng.chance(0.3)) a.inv.basket = 1; if (a.knowledge.techs.has('hide_working') && !a.inv.clothes && (a.inv.hide || 0) >= 2 && rng.chance(0.4)) { a.inv.hide -= 2; a.inv.clothes = 1; } if (a.inv.spear && A().knownCount(a, 'animals') && rng.chance(0.25)) a.inv.hide = (a.inv.hide || 0) + 1; }
      // ---- fire & shelter
      if (adult && a.knowledge.techs.has('fire_making')) {
        const fires = [...w.buildings.values()].filter((b) => b.kind === 'campfire' && LW.dist(b.x, b.y, a.x, a.y) < 5);
        if (!fires.length && rng.chance(0.5) && A().knownCount(a, 'wood')) { const s = LW.Buildings.findSite(w, a, 'campfire'); if (s >= 0) { const b = LW.Buildings.create(w, 'campfire', w.xOf(s), w.yOf(s), a.id); b.delivered = { wood: 3 }; LW.Buildings.complete(w, b, a); } }
        else for (const f of fires) if (!f.lit || f.fuel < T.TICKS_PER_DAY) { if (rng.chance(0.8)) { f.fuel = LW.Buildings.DEFS.campfire.fuelTicks; f.lit = true; } }
      }
      if (adult) {
        let kind = null, kt = 0; for (const k in LW.Buildings.DEFS) { const d = LW.Buildings.DEFS[k]; if (d.dwelling && d.tier && (!d.tech || a.knowledge.techs.has(d.tech)) && d.tier > kt) { kt = d.tier; kind = k; } }
        const tier = { [kind]: kt }; const cur = home ? LW.Buildings.DEFS[home.kind].tier || 0 : 0;
        const partnerHome = a.partner != null && w.agents.get(a.partner)?.home != null;
        if (kind && cur < tier[kind] && !(cur === 0 && partnerHome)) {
          let site = [...w.buildings.values()].find((b) => b.ownerId === a.id && b.progress < 1 && LW.Buildings.def(b).dwelling);
          if (!site && rng.chance(0.5)) { const s = LW.Buildings.findSite(w, a, kind); if (s >= 0) site = LW.Buildings.create(w, kind, w.xOf(s), w.yOf(s), a.id); }
          if (site) { const def = LW.Buildings.def(site); const cost = def.cost; const expectedDays = 2 + def.ticks / 40; for (const k in cost) site.delivered[k] = Math.min(cost[k], (site.delivered[k] || 0) + cost[k] / expectedDays * (0.6 + a.skills.building)); site.progress = Math.min(1, site.progress + 1 / expectedDays * (0.7 + a.skills.building * 0.6)); A().practice(a, 'building', 6); if (site.progress >= 1 && LW.Buildings.materialsComplete(site)) { a.counters.built++; LW.Buildings.complete(w, site, a); } else if (site.progress >= 1) site.progress = 0.95; }
        } else if (cur === 0 && partnerHome) { const ph = w.buildings.get(w.agents.get(a.partner).home); if (ph) LW.Buildings.moveIn(w, ph, a); }
        if (a.knowledge.techs.has('seed_planting') && home && rng.chance(0.15)) { let farm = [...w.buildings.values()].find((b) => b.kind === 'farm_plot' && b.ownerId === a.id); if (!farm) { const s = LW.Buildings.findSite(w, a, 'farm_plot'); if (s >= 0) { farm = LW.Buildings.create(w, 'farm_plot', w.xOf(s), w.yOf(s), a.id); farm.delivered = { wood: 2 }; LW.Buildings.complete(w, farm, a); } } if (farm && farm.progress >= 1) { if (!farm.planted && LW.Time.season(w.tick) <= 1) { farm.planted = true; farm.crop = 0; } else if (farm.planted && farm.crop >= 1) { const q = Math.round(6 + w.tiles.fert[w.idx(farm.x, farm.y)] / 255 * 8); if (home.storage) home.storage.grain = (home.storage.grain || 0) + q; farm.planted = false; farm.crop = 0; w.events.emit('Harvest', { tick: w.tick, agentId: a.id, amount: q, tile: w.idx(farm.x, farm.y), first: !w.firsts['harvest'] }); } } }
      }
      // ---- középületek és jobb szerszámok (a napi léptékben elvonatkoztatva: az anyagot a közösség előteremti)
      if (adult && rng.chance(0.06)) { let best = 0, which = null; for (const k in LW.Buildings.DEFS) { if (!LW.Buildings.DEFS[k].public) continue; const wnt = LW.Society.wants(w, a, k); if (wnt > best) { best = wnt; which = k; } } if (which && best > 0.5) { let site = [...w.buildings.values()].find((b) => b.kind === which && b.progress < 1 && LW.dist(b.x, b.y, a.x, a.y) < 20); if (!site) { const s = LW.Buildings.findSite(w, a, which); if (s >= 0) site = LW.Buildings.create(w, which, w.xOf(s), w.yOf(s), a.id); } if (site) { const def = LW.Buildings.def(site); const expectedDays = 3 + def.ticks / 30; for (const k in def.cost) site.delivered[k] = Math.min(def.cost[k], (site.delivered[k] || 0) + def.cost[k] / expectedDays); site.progress = Math.min(1, site.progress + 1 / expectedDays * (0.7 + a.skills.building * 0.6) * LW.Tech.mult(w, a, 'build')); A().practice(a, 'building', 4); if (site.progress >= 1 && LW.Buildings.materialsComplete(site)) { a.counters.built++; LW.Buildings.complete(w, site, a); } else if (site.progress >= 1) site.progress = 0.95; } } }
      // anyagtermelés a közösségnek: aki ért hozzá és van hozzá műhely, a közös raktárba dolgozik (réz, vas, tégla, papír, üveg…)
      if (adult && rng.chance(0.3)) { const store = LW.Tree.nearestStore(w, a, 20); if (store) { const cands = []; for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || it.slot || it.tool || it.food || !a.knowledge.techs.has(R.tech)) continue; if ((store.storage[out] || 0) >= 24) continue; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 20)) continue; if (!this.canSource(w, a, { items: R.inp || (R.inpAny ? R.inpAny[0] : {}) })) continue; cands.push([rid, R, out]); } if (cands.length) { const [rid, R, out] = rng.pick(cands); const inp = R.inp || (R.inpAny ? R.inpAny[0] : {}); for (const k in inp) { const ps = LW.Tree.publicStore(w, a, k, 20); if (ps && ps.storage[k] >= inp[k]) ps.storage[k] -= inp[k]; else if ((a.inv[k] || 0) >= inp[k]) a.inv[k] -= inp[k]; } store.storage[out] = (store.storage[out] || 0) + R.out[out] * 2; a.wealth = (a.wealth || 0) + 1; A().practice(a, R.skill || 'crafting', 3); if (!w.firsts['item:' + out]) w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: out, first: true }); } } }
      if (adult) for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech) || LW.Tree.bestTool(a, it.slot) >= it.tier) continue; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 24)) continue; if (!this.canSource(w, a, { items: R.inp || (R.inpAny ? R.inpAny[0] : {}) })) continue; if (rng.chance(0.12)) { a.inv[out] = 1; if (!w.firsts['item:' + out]) w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: out, first: true }); } }
      // ---- knowledge of places grows slowly even when abstracted (people wander)
      if (adult && rng.chance(0.5)) { const R = 10; for (let k = 0; k < 6; k++) { const x = LW.clamp((a.x | 0) + rng.int(-R, R), 0, w.w - 1), y = LW.clamp((a.y | 0) + rng.int(-R, R), 0, w.h - 1); const j = w.idx(x, y); const t = w.tiles; if (LW.isFreshBiome(t.biome[j])) A().rememberPlace(w, a, 'water', j, 255); if (t.veg[j] > 30) A().rememberPlace(w, a, 'food', j, t.veg[j]); if (t.trees[j] > 30) A().rememberPlace(w, a, 'wood', j, t.trees[j]); if (t.stone[j] > 30) { A().rememberPlace(w, a, 'stone', j, t.stone[j]); if (t.stone[j] >= 70 && (t.biome[j] === LW.BIOME.HILLS || t.biome[j] === LW.BIOME.MOUNTAIN || t.biome[j] === LW.BIOME.BEACH) && !t.depType[j]) A().rememberPlace(w, a, 'flint', j, t.stone[j] >> 1); } if (t.animals[j] > 40) A().rememberPlace(w, a, 'animals', j, t.animals[j]); if (t.depType[j] && !t.depKnown[j] && rng.chance(0.06 * (0.5 + a.personality.curiosity) * (a.knowledge.techs.has('digging') ? 2 : 1))) { t.depKnown[j] = 1; w.dirtyTiles.add(j); } // a vándorló szem észreveszi a felszíni ércet
          if (t.depType[j] && t.depKnown[j]) { if (t.depType[j] === LW.DEPOSIT.FLINT) A().rememberPlace(w, a, 'flint', j, 100); else if (t.depType[j] === LW.DEPOSIT.CLAY) { A().rememberPlace(w, a, 'clay', j, 100); LW.Tech.observe(w, a, 'clay'); } else { A().rememberPlace(w, a, 'deposit', j, t.depType[j]); const name = LW.DEPOSIT_NAME[t.depType[j]]; if (['copper', 'tin', 'iron', 'coal', 'gold'].includes(name) && !a.knowledge.techs.has('ore_lore_' + name)) { LW.Tech.learn(w, a, 'ore_lore_' + name, 'observation'); w.events.emit('ResourceFound', { tick: w.tick, agentId: a.id, tile: j, deposit: name, first: !w.firsts['deposit:' + name] }); } } } if (t.biome[j] === LW.BIOME.MARSH) { A().rememberPlace(w, a, 'clay', j, 80); LW.Tech.observe(w, a, 'clay'); } } }
      // expedíció: a kíváncsi ember elmegy megnézni a távolabbi, már ismert lelőhelyeket
      if (adult && rng.chance(0.02 * (0.3 + a.personality.curiosity))) { const t = w.tiles; const cands = []; const list = w._knownDeposits || []; for (let k = 0; k < 40 && list.length; k++) { const j = list[rng.int(0, list.length - 1)]; if (t.depType[j] && t.depKnown[j] && LW.dist(w.xOf(j), w.yOf(j), a.x, a.y) < 50) cands.push(j); } if (cands.length) { const j = rng.pick(cands); const dt = t.depType[j]; if (dt === LW.DEPOSIT.FLINT) A().rememberPlace(w, a, 'flint', j, 100); else if (dt === LW.DEPOSIT.CLAY) A().rememberPlace(w, a, 'clay', j, 100); else { A().rememberPlace(w, a, 'deposit', j, dt); const name = LW.DEPOSIT_NAME[dt]; if (['copper', 'tin', 'iron', 'coal', 'gold'].includes(name) && !a.knowledge.techs.has('ore_lore_' + name)) { LW.Tech.learn(w, a, 'ore_lore_' + name, 'observation'); w.events.emit('ResourceFound', { tick: w.tick, agentId: a.id, tile: j, deposit: name, first: !w.firsts['deposit:' + name] }); } } } }
      if (w.burning.size && rng.chance(0.3)) LW.Tech.observe(w, a, 'fire');
      if (fireNear) LW.Tech.observe(w, a, 'fire');
    },
    canSource(w, a, d, depth) { depth = depth || 0; const need = d.items || (d.itemsAny ? d.itemsAny[0] : {}); for (const k in need) { if ((a.inv[k] || 0) >= need[k]) continue; { const ps = LW.Tree.publicStore(w, a, k, 20); if (ps && ps.storage[k] >= need[k]) continue; } const src = LW.Tech.SOURCE[k]; if (!src) { const R = LW.Tech.RECIPES[k]; if (!R || depth >= 2 || !a.knowledge.techs.has(R.tech)) return false; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 24)) return false; if (!this.canSource(w, a, { items: R.inp || (R.inpAny ? R.inpAny[0] : {}) }, depth + 1)) return false; continue; } if (src === 'fiber') continue; if (src === 'store') { const home = a.home != null ? w.buildings.get(a.home) : null; if (!home || !home.storage || !(home.storage[k] >= need[k])) return false; continue; } if (src === 'animals') { if (!a.inv.spear && LW.Tree.bestTool(a, 'hunt') < 1) return false; continue; } if (src.startsWith('deposit:')) { const dt = LW.DEPOSIT[src.slice(8).toUpperCase()]; let ok = false; for (const p of a.knowledge.places.values()) if (p.k === 'deposit' && p.q === dt) { ok = true; break; } if (!ok || !a.knowledge.techs.has('digging')) return false; if (dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling')) return false; continue; } if (!A().knownCount(a, src)) return false; } return true; },
    buildingNear(w, a, what, r) { const DEFS = LW.Buildings.DEFS; for (const b of w.buildings.values()) { if (b.progress < 1) continue; const def = DEFS[b.kind]; if ((b.kind === what || (def && def[what])) && LW.dist(a.x, a.y, b.x, b.y) <= r) return b; } return null; },
  };
  LW.Macro = Macro;
})(globalThis.LW || (globalThis.LW = {}));
