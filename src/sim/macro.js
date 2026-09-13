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
      LW.Settlements.detect(w); LW.Agents.immigrationCheck(w);
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
        intake = 0.55 + 0.5 * (0.6 + a.skills.gathering * 0.6) * seasonFood * foodQ * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1) + hunt + fish;
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
      // emotions decay
      for (const k in a.emotions) a.emotions[k] *= k === 'grief' ? 0.9 : 0.6;
      // daily biology (aging, illness, pregnancy, development, relationships decay, occupation)
      A().daily(w, a); if (!w.agents.has(a.id)) return;
      // ---- social life
      const near = w.agentsNear(a.x, a.y, 14, a.id).filter((o) => w.agents.has(o.id));
      if (near.length && stage !== 'infant') { const o = rng.pick(near); if (A().stage(w, o) !== 'infant' && rng.chance(0.7)) LW.Social.interact(w, a, o, 'converse', {}); }
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
        const el = LW.Tech.eligible(w, a).filter((id) => { const d = LW.Tech.D[id]; if (d.nearby === 'fire' && !fireNear) return false; if (d.nearby === 'water' && !A().knownCount(a, 'water')) return false; return true; });
        if (el.length) { const id = rng.pick(el); const d = LW.Tech.D[id]; const can = LW.Tech.hasItems(a, d) || this.canSource(w, a, d); if (can) { a.counters.experiments++; if (rng.chance(LW.Tech.successChance(w, a, d))) LW.Tech.learn(w, a, id, 'discovery'); else a.knowledge.progress[id] = Math.min(0.95, (a.knowledge.progress[id] || 0) + 0.06); } }
      }
      // ---- skills & tools
      if (adult) { A().practice(a, 'gathering', 8); A().practice(a, 'foraging', 5); A().practice(a, 'crafting', 2); A().practice(a, 'building', home ? 1 : 2); if (a.knowledge.techs.has('stone_knapping') && !a.inv.handaxe && A().knownCount(a, 'stone') && A().knownCount(a, 'flint') && rng.chance(0.3)) { a.inv.handaxe = 1; w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: 'handaxe', first: !w.firsts['item:handaxe'] }); } if (a.knowledge.techs.has('spear_making') && !a.inv.spear && rng.chance(0.3)) { a.inv.spear = 1; w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: 'spear', first: !w.firsts['item:spear'] }); } if (a.knowledge.techs.has('basket_weaving') && !a.inv.basket && rng.chance(0.3)) a.inv.basket = 1; if (a.knowledge.techs.has('hide_working') && !a.inv.clothes && (a.inv.hide || 0) >= 2 && rng.chance(0.4)) { a.inv.hide -= 2; a.inv.clothes = 1; } if (a.inv.spear && A().knownCount(a, 'animals') && rng.chance(0.25)) a.inv.hide = (a.inv.hide || 0) + 1; }
      // ---- fire & shelter
      if (adult && a.knowledge.techs.has('fire_making')) {
        const fires = [...w.buildings.values()].filter((b) => b.kind === 'campfire' && LW.dist(b.x, b.y, a.x, a.y) < 5);
        if (!fires.length && rng.chance(0.5) && A().knownCount(a, 'wood')) { const s = LW.Buildings.findSite(w, a, 'campfire'); if (s >= 0) { const b = LW.Buildings.create(w, 'campfire', w.xOf(s), w.yOf(s), a.id); b.delivered = { wood: 3 }; LW.Buildings.complete(w, b, a); } }
        else for (const f of fires) if (!f.lit || f.fuel < T.TICKS_PER_DAY) { if (rng.chance(0.8)) { f.fuel = LW.Buildings.DEFS.campfire.fuelTicks; f.lit = true; } }
      }
      if (adult) {
        const kind = a.knowledge.techs.has('stone_masonry') ? 'stone_house' : a.knowledge.techs.has('hut_construction') ? 'hut' : a.knowledge.techs.has('shelter_building') ? 'lean_to' : null;
        const tier = { lean_to: 1, hut: 2, stone_house: 3 }; const cur = home ? tier[home.kind] || 0 : 0;
        const partnerHome = a.partner != null && w.agents.get(a.partner)?.home != null;
        if (kind && cur < tier[kind] && !(cur === 0 && partnerHome)) {
          let site = [...w.buildings.values()].find((b) => b.ownerId === a.id && b.progress < 1 && LW.Buildings.def(b).dwelling);
          if (!site && rng.chance(0.5)) { const s = LW.Buildings.findSite(w, a, kind); if (s >= 0) site = LW.Buildings.create(w, kind, w.xOf(s), w.yOf(s), a.id); }
          if (site) { const def = LW.Buildings.def(site); const cost = def.cost; const expectedDays = 2 + def.ticks / 40; for (const k in cost) site.delivered[k] = Math.min(cost[k], (site.delivered[k] || 0) + cost[k] / expectedDays * (0.6 + a.skills.building)); site.progress = Math.min(1, site.progress + 1 / expectedDays * (0.7 + a.skills.building * 0.6)); A().practice(a, 'building', 6); if (site.progress >= 1 && LW.Buildings.materialsComplete(site)) { a.counters.built++; LW.Buildings.complete(w, site, a); } else if (site.progress >= 1) site.progress = 0.95; }
        } else if (cur === 0 && partnerHome) { const ph = w.buildings.get(w.agents.get(a.partner).home); if (ph) LW.Buildings.moveIn(w, ph, a); }
        if (a.knowledge.techs.has('seed_planting') && home && rng.chance(0.15)) { let farm = [...w.buildings.values()].find((b) => b.kind === 'farm_plot' && b.ownerId === a.id); if (!farm) { const s = LW.Buildings.findSite(w, a, 'farm_plot'); if (s >= 0) { farm = LW.Buildings.create(w, 'farm_plot', w.xOf(s), w.yOf(s), a.id); farm.delivered = { wood: 2 }; LW.Buildings.complete(w, farm, a); } } if (farm && farm.progress >= 1) { if (!farm.planted && LW.Time.season(w.tick) <= 1) { farm.planted = true; farm.crop = 0; } else if (farm.planted && farm.crop >= 1) { const q = Math.round(6 + w.tiles.fert[w.idx(farm.x, farm.y)] / 255 * 8); if (home.storage) home.storage.grain = (home.storage.grain || 0) + q; farm.planted = false; farm.crop = 0; w.events.emit('Harvest', { tick: w.tick, agentId: a.id, amount: q, tile: w.idx(farm.x, farm.y), first: !w.firsts['harvest'] }); } } }
      }
      // ---- knowledge of places grows slowly even when abstracted (people wander)
      if (adult && rng.chance(0.5)) { const R = 10; for (let k = 0; k < 6; k++) { const x = LW.clamp((a.x | 0) + rng.int(-R, R), 0, w.w - 1), y = LW.clamp((a.y | 0) + rng.int(-R, R), 0, w.h - 1); const j = w.idx(x, y); const t = w.tiles; if (LW.isFreshBiome(t.biome[j])) A().rememberPlace(w, a, 'water', j, 255); if (t.veg[j] > 30) A().rememberPlace(w, a, 'food', j, t.veg[j]); if (t.trees[j] > 30) A().rememberPlace(w, a, 'wood', j, t.trees[j]); if (t.stone[j] > 30) { A().rememberPlace(w, a, 'stone', j, t.stone[j]); if (t.stone[j] >= 70 && (t.biome[j] === LW.BIOME.HILLS || t.biome[j] === LW.BIOME.MOUNTAIN || t.biome[j] === LW.BIOME.BEACH) && !t.depType[j]) A().rememberPlace(w, a, 'flint', j, t.stone[j] >> 1); } if (t.animals[j] > 40) A().rememberPlace(w, a, 'animals', j, t.animals[j]); if (t.depType[j] && t.depKnown[j]) { if (t.depType[j] === LW.DEPOSIT.FLINT) A().rememberPlace(w, a, 'flint', j, 100); else if (t.depType[j] === LW.DEPOSIT.CLAY) { A().rememberPlace(w, a, 'clay', j, 100); LW.Tech.observe(w, a, 'clay'); } else A().rememberPlace(w, a, 'deposit', j, t.depType[j]); } if (t.biome[j] === LW.BIOME.MARSH) { A().rememberPlace(w, a, 'clay', j, 80); LW.Tech.observe(w, a, 'clay'); } } }
      if (w.burning.size && rng.chance(0.3)) LW.Tech.observe(w, a, 'fire');
      if (fireNear) LW.Tech.observe(w, a, 'fire');
    },
    canSource(w, a, d) { const need = d.items || (d.itemsAny ? d.itemsAny[0] : {}); for (const k in need) { const src = LW.Tech.SOURCE[k]; if (!src) return (a.inv[k] || 0) >= need[k]; if (src === 'fiber') continue; if (src === 'animals') { if (!a.inv.spear) return false; continue; } if (!A().knownCount(a, src)) return false; } return true; },
  };
  LW.Macro = Macro;
})(globalThis.LW || (globalThis.LW = {}));
