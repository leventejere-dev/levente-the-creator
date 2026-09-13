PATCHES = [
# ---------------------------------------------------------------- world: épület-index, alapterület
('src/world/world.js', [
("""    addBuilding(b) { this.buildings.set(b.id, b); this.tiles.shade[this.idx(b.x, b.y)] = 1; return b; }
    removeBuilding(id) { const b = this.buildings.get(id); if (!b) return; this.buildings.delete(id); if (!this.buildingAt(this.idx(b.x, b.y))) this.tiles.shade[this.idx(b.x, b.y)] = 0; }
    buildingAt(i) { for (const b of this.buildings.values()) if (this.idx(b.x, b.y) === i) return b; return null; }""",
 """    /** Az épület által lefedett mezők (alapterület: b.w × b.h, a bal felső sarok a horgony). */
    buildingTiles(b) { const out = []; const w = b.w || 1, h = b.h || 1; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const x = b.x + dx, y = b.y + dy; if (this.inBounds(x, y)) out.push(this.idx(x, y)); } return out; }
    addBuilding(b) { this.buildings.set(b.id, b); if (!this.btile) this.btile = new Map(); for (const i of this.buildingTiles(b)) { this.btile.set(i, b.id); this.tiles.shade[i] = 1; } return b; }
    removeBuilding(id) { const b = this.buildings.get(id); if (!b) return; this.buildings.delete(id); if (this.btile) for (const i of this.buildingTiles(b)) { if (this.btile.get(i) === id) { this.btile.delete(i); this.tiles.shade[i] = 0; } } }
    buildingAt(i) { if (!this.btile) this.reindexBuildings(); const id = this.btile.get(i); return id != null ? (this.buildings.get(id) || null) : null; }
    reindexBuildings() { this.btile = new Map(); for (const b of this.buildings.values()) for (const i of this.buildingTiles(b)) this.btile.set(i, b.id); }"""),
]),
# ---------------------------------------------------------------- épületek: alapterület, feljegyzések, hozam
('src/buildings/buildings.js', [
("""      const def = DEFS[kind]; const b = { id: world.nextIds.building++, kind, x: x | 0, y: y | 0, ownerId: ownerId ?? null, residents: [], progress: def.ticks === 0 ? 1 : 0, delivered: {}, hp: 1, storage: {}, startedTick: world.tick, builtTick: def.ticks === 0 ? world.tick : -1, settlementId: null };""",
 """      const def = DEFS[kind]; const b = { id: world.nextIds.building++, kind, x: x | 0, y: y | 0, w: def.size ? def.size[0] : 1, h: def.size ? def.size[1] : 1, ownerId: ownerId ?? null, residents: [], progress: def.ticks === 0 ? 1 : 0, delivered: {}, hp: 1, storage: {}, startedTick: world.tick, builtTick: def.ticks === 0 ? world.tick : -1, settlementId: null };
      if (def.records) b.records = [];"""),
("""      const skill = a.skills.building || 0; const rate = (1 / def.ticks) * (0.6 + 0.8 * skill) * (a.needs.energy < 0.2 ? 0.5 : 1);""",
 """      const skill = a.skills.building || 0; const rate = (1 / def.ticks) * (0.6 + 0.8 * skill) * (a.needs.energy < 0.2 ? 0.5 : 1) * LW.Tech.mult(world, a, 'build');"""),
("""        b.progress = 1; b.builtTick = world.tick; world.stats.buildingsBuilt++; world.dirtyTiles.add(world.idx(b.x, b.y));""",
 """        b.progress = 1; b.builtTick = world.tick; world.stats.buildingsBuilt++; for (const ti of world.buildingTiles(b)) world.dirtyTiles.add(ti);
        if (def.water) for (const o of world.agentsNear(b.x + 0.5, b.y + 0.5, 14)) LW.Agents.rememberPlace(world, o, 'water', world.idx(b.x, b.y), 255);
        if (def.perennial) { b.planted = true; b.crop = 0; }"""),
("""            const g = 0.014 * (0.3 + 0.7 * t.fert[i] / 255) * (0.3 + 0.7 * t.moist[i] / 255) * [1, 1.1, 0.6, 0][season];""",
 """            const irr = world.buildingsNear(b.x, b.y, 10).some((o) => o.progress >= 1 && DEFS[o.kind].irrigation) ? 1.4 : 1;
            const g = (def.cropDays ? 1 / def.cropDays : 0.014) * (0.3 + 0.7 * t.fert[i] / 255) * Math.max(0.3 + 0.7 * t.moist[i] / 255, irr > 1 ? 0.9 : 0) * [1, 1.1, 0.6, 0][season] * irr;"""),
("""        const r = kind === 'campfire' ? 2 : 4; const x = LW.clamp(ax + world.rng.int(-r, r), 1, world.w - 2), y = LW.clamp(ay + world.rng.int(-r, r), 1, world.h - 2);
        const i = world.idx(x, y); const bio = world.tiles.biome[i];
        if (!world.isPassable(i) || bio === LW.BIOME.RIVER || bio === LW.BIOME.MARSH || bio === LW.BIOME.MOUNTAIN || world.buildingAt(i)) continue;
        if (world.tiles.trees[i] > 120 && kind !== 'campfire') continue;""",
 """        const def = DEFS[kind]; const sw = def.size ? def.size[0] : 1, sh = def.size ? def.size[1] : 1;
        const r = kind === 'campfire' ? 2 : def.public ? 6 : 4; const x = LW.clamp(ax + world.rng.int(-r, r), 1, world.w - 1 - sw), y = LW.clamp(ay + world.rng.int(-r, r), 1, world.h - 1 - sh);
        const i = world.idx(x, y); let ok = true;
        for (let dy = 0; dy < sh && ok; dy++) for (let dx = 0; dx < sw; dx++) { const j = world.idx(x + dx, y + dy); const bio = world.tiles.biome[j]; if (!world.isPassable(j) || bio === LW.BIOME.RIVER || bio === LW.BIOME.MARSH || bio === LW.BIOME.MOUNTAIN || world.buildingAt(j) || (world.tiles.trees[j] > 120 && kind !== 'campfire')) { ok = false; break; } }
        if (!ok) continue;"""),
]),
# ---------------------------------------------------------------- felfedezés: népesség, épület, hatások, feljegyzések
('src/tech/discoveries.js', [
("""      const out = [];
      for (const id in D) {
        const d = D[id]; if (d.hidden || a.knowledge.techs.has(id)) continue;
        if (d.prereq && !d.prereq.every((p) => a.knowledge.techs.has(p))) continue;""",
 """      const out = []; let pop = null;
      for (const id in D) {
        const d = D[id]; if (d.hidden || a.knowledge.techs.has(id)) continue;
        if (d.prereq && !d.prereq.every((p) => a.knowledge.techs.has(p))) continue;
        if (d.minPop) { if (pop == null) pop = world.agentsNear(a.x, a.y, 24, a.id).length + 1; if (pop < d.minPop) continue; } // a nagy dolgokhoz sok ember kell"""),
("""      return LW.clamp01(cfg.experimentBase * (1 - Math.max(0.05, difficulty)) * (0.5 + p.intelligence) * (0.5 + p.creativity) * (1 + 0.6 * skill) * (1 + need) * (1 + 1.5 * prog));""",
 """      const era = LW.Tree ? LW.Tree.eraOf(d.id) : 0; const inst = LW.Tree ? LW.Tree.buildingBonus(world, a.x, a.y, 'discovery', 16) : 0;
      return LW.clamp01(cfg.experimentBase * (1 - Math.max(0.05, difficulty)) * (0.5 + p.intelligence) * (0.5 + p.creativity) * (1 + 0.6 * skill) * (1 + need) * (1 + 1.5 * prog) * (1 + (LW.Tech.fx ? LW.Tech.fx(world, a).discovery : 0)) * (1 + inst) * (era >= 5 ? 1.6 : 1));"""),
("""      if (source === 'taught' || source === 'observed_practice' || source === 'inherited') world.events.emit('KnowledgeTransferred', ev);""",
 """      if (source === 'taught' || source === 'observed_practice' || source === 'inherited' || source === 'read') world.events.emit('KnowledgeTransferred', ev);"""),
("""    checkLost(world, id, lastHolder) {
      for (const o of world.agents.values()) if (o.knowledge.techs.has(id)) return;""",
 """    checkLost(world, id, lastHolder) {
      for (const o of world.agents.values()) if (o.knowledge.techs.has(id)) return;
      for (const b of world.buildings.values()) if (b.records && b.progress >= 1 && b.records.includes(id)) return; // leírva megmarad"""),
]),
# ---------------------------------------------------------------- agy: beszerzés (lelőhely, recept-lánc, raktár), épület-közelség, középületek, otthon-létra
('src/agents/brain.js', [
("""  function nearestFire(world, a, maxD) { let best = null, bd = maxD; for (const b of world.buildings.values()) { if (b.kind !== 'campfire' || !b.lit || b.progress < 1) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }""",
 """  function nearestFire(world, a, maxD) { let best = null, bd = maxD; for (const b of world.buildings.values()) { if (b.kind !== 'campfire' || !b.lit || b.progress < 1) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }
  /** Legközelebbi kész épület egy fajtából vagy tulajdonságból (pl. 'furnace' = kemence/olvasztó/kovács). */
  function nearestBuilding(world, a, what, maxD) { let best = null, bd = maxD || 24; const DEFS = Bld().DEFS; for (const b of world.buildings.values()) { if (b.progress < 1) continue; const def = DEFS[b.kind]; if (!(b.kind === what || (def && def[what]))) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }
  function needsBuilding(nearby) { return nearby && nearby !== 'fire' && nearby !== 'water'; }
  function bestDwelling(a) { const DEFS = Bld().DEFS; let best = null, bt = 0; for (const k in DEFS) { const d = DEFS[k]; if (!d.dwelling || !d.tier || (d.tech && !a.knowledge.techs.has(d.tech))) continue; if (d.tier > bt) { bt = d.tier; best = k; } } return best; }"""),
("""  function acquireSteps(world, a, need, ctx) {
    const steps = [];
    for (const item in need) {
      const q = need[item]; const src = LW.Tech.SOURCE[item];
      if (!src) return null;
      let poi = null, op = 'gather';""",
 """  function acquireSteps(world, a, need, ctx, depth) {
    const steps = []; depth = depth || 0;
    for (const item in need) {
      const q = need[item]; const src = LW.Tech.SOURCE[item];
      if (!src) { // nincs a világban: talán meg lehet csinálni (recept-lánc, legfeljebb 2 mélységig)
        const R = LW.Tech.RECIPES[item]; if (!R || depth >= 2 || !a.knowledge.techs.has(R.tech)) return null;
        let inp = R.inp; if (R.inpAny) inp = R.inpAny.find((o) => count(missingFor(a, o)) === 0) || R.inpAny[0];
        const m = missingFor(a, inp); const sub = count(m) ? acquireSteps(world, a, m, ctx, depth + 1) : []; if (!sub) return null;
        steps.push(...sub);
        if (R.nearby === 'fire') { if (!ctx.fire) return null; steps.push({ op: 'moveTo', i: world.idx(ctx.fire.x, ctx.fire.y), near: 1 }); }
        else if (needsBuilding(R.nearby)) { const nb = nearestBuilding(world, a, R.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: world.idx(nb.x, nb.y), near: 1.5 }); }
        const times = Math.max(1, Math.ceil(q / (R.out[item] || 1))); for (let k = 0; k < Math.min(times, 3); k++) steps.push({ op: 'craft', recipe: item, needed: true });
        continue;
      }
      if (src === 'store') { const home = a.home != null ? world.buildings.get(a.home) : null; if (!home || !home.storage || (home.storage[item] || 0) < q) return null; steps.push({ op: 'moveTo', i: world.idx(home.x, home.y), near: 1 }); steps.push({ op: 'take', bid: home.id, item, n: q }); continue; }
      if (src.startsWith('deposit:')) { const dt = LW.DEPOSIT[src.slice(8).toUpperCase()]; let best = null, bd = 1e9; for (const p of a.knowledge.places.values()) { if (p.k !== 'deposit' || p.q !== dt) continue; const d = LW.dist(a.x, a.y, world.xOf(p.i), world.yOf(p.i)); if (d < bd) { bd = d; best = p; } } if (!best || !a.knowledge.techs.has('digging')) return null; if (dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling')) return null; const tg = tileNear(world, best.i); if (tg == null) return null; steps.push({ op: 'moveTo', i: tg, near: 1 }); steps.push({ op: 'dig', i: best.i, n: 8, item, needed: true }); if (q > 2) steps.push({ op: 'dig', i: best.i, n: 8, item, needed: true }); continue; }
      let poi = null, op = 'gather';"""),
# kísérlet: épület-közelség
("""        for (const id of el) { const d = LW.Tech.D[id]; const need = d.need ? u(N(a)[d.need] ?? 1) : 0; const prog = a.knowledge.progress[id] || 0; const m = LW.Tech.missingItems(a, d); const feasible = count(m) === 0 || acquireSteps(c.world, a, m, c); if (!feasible) continue; if (d.nearby === 'fire' && !c.fire) continue; if (d.nearby === 'water' && !c.water) continue;""",
 """        for (const id of el) { const d = LW.Tech.D[id]; const need = d.need ? u(N(a)[d.need] ?? 1) : 0; const prog = a.knowledge.progress[id] || 0; const m = LW.Tech.missingItems(a, d); const feasible = count(m) === 0 || acquireSteps(c.world, a, m, c); if (!feasible) continue; if (d.nearby === 'fire' && !c.fire) continue; if (d.nearby === 'water' && !c.water) continue; if (needsBuilding(d.nearby) && !nearestBuilding(c.world, a, d.nearby, 30)) continue;"""),
("""        if (d.nearby === 'water' && c.water) { const t = tileNear(c.world, c.water.i); if (t != null) steps.push({ op: 'moveTo', i: t }); }
        steps.push({ op: 'experiment', tech: id, n: Math.round(8 + d.difficulty * 32) });""",
 """        if (d.nearby === 'water' && c.water) { const t = tileNear(c.world, c.water.i); if (t != null) steps.push({ op: 'moveTo', i: t }); }
        if (needsBuilding(d.nearby)) { const nb = nearestBuilding(c.world, a, d.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: c.world.idx(nb.x, nb.y), near: 1.5 }); }
        steps.push({ op: 'experiment', tech: id, n: Math.round(8 + d.difficulty * 32) });"""),
# készítés: szerszám-fejlesztés általánosan, épület-közelség
("""        if (a.knowledge.techs.has('food_drying') && c.fire && ((a.inv.meat_raw || 0) >= 2 || (a.inv.fish_raw || 0) >= 2 || (a.inv.berries || 0) >= 6)) want.push(['dried_food', 0.45 + (c.season === 2 ? 0.3 : 0)]);""",
 """        if (a.knowledge.techs.has('food_drying') && c.fire && ((a.inv.meat_raw || 0) >= 2 || (a.inv.fish_raw || 0) >= 2 || (a.inv.berries || 0) >= 6)) want.push(['dried_food', 0.45 + (c.season === 2 ? 0.3 : 0)]);
        // jobb szerszám, ha tudja, hogyan (balta, vadászfegyver, eke, csákány, ruha)
        for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech)) continue; if (LW.Tree.bestTool(a, it.slot) >= it.tier) continue; if (needsBuilding(R.nearby) && !nearestBuilding(c.world, a, R.nearby, 30)) continue; if (R.nearby === 'fire' && !c.fire) continue; want.push([rid, 0.4 + (it.slot === 'hunt' ? u(N(a).food) * 0.3 : 0) + (it.slot === 'clothes' ? u(N(a).warmth) * 0.5 : 0) + P(a).ambition * 0.15]); }
        if (a.knowledge.techs.has('baking') && (a.inv.flour || 0) >= 1 && c.fire) want.push(['bread', 0.5 + u(N(a).food) * 0.5]);
        if (a.knowledge.techs.has('milling') && ((a.inv.grain || 0) >= 3 || (c.home && c.home.storage && (c.home.storage.grain || 0) >= 3))) want.push(['flour', 0.4 + u(N(a).food) * 0.4]);"""),
("""        const steps = [...acq]; if (R.nearby === 'fire') { if (!c.fire) return null; steps.push({ op: 'moveTo', i: c.world.idx(c.fire.x, c.fire.y), near: 1 }); }
        steps.push({ op: 'craft', recipe: rid }); return { steps, tag: R.tag };""",
 """        const steps = [...acq]; if (R.nearby === 'fire') { if (!c.fire) return null; steps.push({ op: 'moveTo', i: c.world.idx(c.fire.x, c.fire.y), near: 1 }); }
        else if (needsBuilding(R.nearby)) { const nb = nearestBuilding(c.world, a, R.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: c.world.idx(nb.x, nb.y), near: 1.5 }); }
        steps.push({ op: 'craft', recipe: rid }); return { steps, tag: R.tag };"""),
# otthon-létra
("""        const kind = a.knowledge.techs.has('stone_masonry') ? 'stone_house' : a.knowledge.techs.has('hut_construction') ? 'hut' : 'lean_to';
        const tier = { lean_to: 1, hut: 2, stone_house: 3 }; const cur = c.home ? tier[c.home.kind] || 0 : 0;
        if (cur >= tier[kind]) return [0, ['az otthon elég jó']];""",
 """        const kind = bestDwelling(a) || 'lean_to'; const DEFS = Bld().DEFS;
        const cur = c.home ? DEFS[c.home.kind].tier || 0 : 0; const tier = { [kind]: DEFS[kind].tier || 1 };
        if (cur >= tier[kind]) return [0, ['az otthon elég jó']];"""),
# középületek: új cél + segítés
("""    helpBuild: {
      applicable: (c, a) => c.adult && !!findHouseholdSite(c, a),""",
 """    buildPublic: {
      applicable: (c, a) => c.adult && !c.night && a.knowledge.techs.size >= 3,
      score: (c, a) => { let best = 0, which = null; const DEFS = Bld().DEFS; for (const k in DEFS) { if (!DEFS[k].public) continue; const w = LW.Society.wants(c.world, a, k); if (w > best) { best = w; which = k; } } a._pubKind = which; if (!which) return [0, []]; return [best * (0.45 + P(a).ambition * 0.4 + P(a).discipline * 0.25) * (c.season === 3 ? 0.6 : 1), [`a közösségnek kellene: ${DEFS[which].label.toLowerCase()}`]]; },
      plan: (c, a) => a._pubKind ? buildPlan(c, a, a._pubKind) : null,
    },
    helpBuild: {
      applicable: (c, a) => c.adult && !!findHouseholdSite(c, a),"""),
("""  function findHouseholdSite(c, a) { for (const b of c.world.buildings.values()) { if (b.progress >= 1) continue; const def = Bld().def(b); if (def.divine) continue; if (b.ownerId === a.id) continue; const owner = c.world.agents.get(b.ownerId); if (!owner) continue; if (a.partner === owner.id || c.household.includes(owner)) if (LW.dist(a.x, a.y, b.x, b.y) < 40) return b; } return null; }""",
 """  function findHouseholdSite(c, a) { for (const b of c.world.buildings.values()) { if (b.progress >= 1) continue; const def = Bld().def(b); if (def.divine) continue; if (b.ownerId === a.id) continue; if (def.public && LW.dist(a.x, a.y, b.x, b.y) < 18 && (c.world.tick + a.id) % 3 === 0) return b; const owner = c.world.agents.get(b.ownerId); if (!owner) continue; if (a.partner === owner.id || c.household.includes(owner)) if (LW.dist(a.x, a.y, b.x, b.y) < 40) return b; } return null; }"""),
("""    let site = [...c.world.buildings.values()].find((b) => b.kind === kind && b.ownerId === a.id && b.progress < 1);""",
 """    const pubk = !!Bld().DEFS[kind].public; let site = [...c.world.buildings.values()].find((b) => b.kind === kind && b.progress < 1 && (b.ownerId === a.id || (pubk && LW.dist(a.x, a.y, b.x, b.y) < 20)));"""),
]),
# ---------------------------------------------------------------- cselekvések: hatások, kút, olaj, hozam, raktárból vétel
('src/agents/actions.js', [
("""      const sk = a.skills.gathering; const lore = a.knowledge.techs.has('foraging_lore') ? 1.3 : 1;
      let rate = 0, field = null, cost = 1, item = st.item;""",
 """      const sk = a.skills.gathering; const lore = a.knowledge.techs.has('foraging_lore') ? 1.3 : 1; const fxm = LW.Tech.fx(world, a);
      let rate = 0, field = null, cost = 1, item = st.item;"""),
("""      if (item === 'berries') { field = 'veg'; cost = 6; rate = (0.9 + sk) * lore * (a.inv.basket ? 1.3 : 1); }
      else if (item === 'roots') { field = 'veg'; cost = 10; rate = (0.6 + sk * 0.8) * lore * (a.knowledge.techs.has('digging') ? 1.5 : 1); }""",
 """      if (item === 'berries') { field = 'veg'; cost = 6; rate = (0.9 + sk) * lore * (a.inv.basket ? 1.3 : 1) * (1 + fxm.food); }
      else if (item === 'roots') { field = 'veg'; cost = 10; rate = (0.6 + sk * 0.8) * lore * (a.knowledge.techs.has('digging') ? 1.5 : 1) * (1 + fxm.food); }"""),
("""      else if (item === 'wood') { field = 'trees'; cost = 6; rate = (0.45 + sk * 0.4) * (a.inv.handaxe ? 2.2 : 1) * (a.knowledge.techs.has('woodworking') ? 1.3 : 1); }
      else if (item === 'stone') { field = 'stone'; cost = 5; rate = 0.5 + sk * 0.4; }""",
 """      else if (item === 'wood') { field = 'trees'; cost = 6; rate = (0.45 + sk * 0.4) * (a.inv.handaxe || LW.Tree.bestTool(a, 'axe') >= 1 ? 2.2 : 1) * (a.knowledge.techs.has('woodworking') ? 1.3 : 1) * (1 + fxm.wood); }
      else if (item === 'stone') { field = 'stone'; cost = 5; rate = (0.5 + sk * 0.4) * (1 + fxm.stone); }"""),
("""      const p = 0.12 * (0.5 + a.skills.hunting) * (a.inv.spear ? 1.5 : 0.4) * (0.2 + t.animals[st.i] / 255) * (LW.Time.isNight(world.tick) ? 0.5 : 1);""",
 """      const p = 0.12 * (0.5 + a.skills.hunting) * (LW.Tree.bestTool(a, 'hunt') >= 1 ? 1.5 : 0.4) * (1 + LW.Tech.fx(world, a).hunt) * (0.2 + t.animals[st.i] / 255) * (LW.Time.isNight(world.tick) ? 0.5 : 1);"""),
("""      const p = 0.35 * (0.5 + a.skills.hunting) * (0.3 + t.fish[st.i] / 255) * (a.inv.spear ? 1.3 : 1) * (a.inv.basket ? 1.2 : 1);""",
 """      const p = 0.35 * (0.5 + a.skills.hunting) * (0.3 + t.fish[st.i] / 255) * (a.inv.spear ? 1.3 : 1) * (a.inv.basket ? 1.2 : 1) * (1 + LW.Tech.fx(world, a).food * 0.5);"""),
("""        const item = LW.DEPOSIT_ITEM[dt]; if (item) { const q = Math.min(t.depAmt[i], world.rng.int(1, 3)); const add = A().addItem(world, a, item, q);""",
 """        const item = dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling') ? null : LW.DEPOSIT_ITEM[dt]; if (item) { const q = Math.min(t.depAmt[i], Math.round(world.rng.int(1, 3) * (1 + LW.Tech.fx(world, a).mine))); const add = A().addItem(world, a, item, q);"""),
("""      if (!st.started) {
        if (R.nearby === 'fire') { const f = world.buildingsNear(a.x | 0, a.y | 0, 2).find((b) => b.kind === 'campfire' && b.lit); if (!f) return FAIL; }""",
 """      if (!st.started) {
        if (R.nearby === 'fire') { const f = world.buildingsNear(a.x | 0, a.y | 0, 2).find((b) => b.kind === 'campfire' && b.lit); if (!f) return FAIL; }
        else if (R.nearby && R.nearby !== 'water') { const DEFS = Bld().DEFS; const nb = world.buildingsNear(a.x | 0, a.y | 0, 3).find((b) => b.progress >= 1 && (b.kind === R.nearby || DEFS[b.kind][R.nearby])); if (!nb) return FAIL; }"""),
("""      st.t++; if (st.t < Math.max(1, Math.round(R.ticks * (1 - a.skills.crafting * 0.4)))) return RUN;""",
 """      st.t++; if (st.t < Math.max(1, Math.round(R.ticks * (1 - a.skills.crafting * 0.4) / (1 + LW.Tech.fx(world, a).craft + LW.Tree.buildingBonus(world, a.x, a.y, 'craft', 4))))) return RUN;"""),
("""    harvest(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !b.planted || b.crop < 1 || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const i = world.idx(b.x, b.y); const q = Math.round(6 + world.tiles.fert[i] / 255 * 8); const add = A().addItem(world, a, 'grain', q);""",
 """    take(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !b.storage || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const have = b.storage[st.item] || 0; if (have <= 0) return FAIL; const q = Math.min(have, st.n || 1); const add = A().addItem(world, a, st.item, q); b.storage[st.item] -= add; if (b.storage[st.item] <= 0) delete b.storage[st.item]; return add > 0 ? DONE : FAIL; },
    harvest(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !b.planted || b.crop < 1 || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const def = Bld().def(b); const i = world.idx(b.x, b.y); const q = Math.round((def.yieldBase || 6) + world.tiles.fert[i] / 255 * 8) * (1 + LW.Tech.fx(world, a).farm) | 0; const cropItem = def.cropItem || 'grain'; const add = A().addItem(world, a, cropItem, q);"""),
("""      const g = world.ground.get(i) || {}; g.grain = (g.grain || 0) + (q - add); world.ground.set(i, g); } b.planted = false; b.crop = 0; world.tiles.fert[i] = Math.max(20, world.tiles.fert[i] - 12);""",
 """      const g = world.ground.get(i) || {}; g[cropItem] = (g[cropItem] || 0) + (q - add); world.ground.set(i, g); } b.planted = !!def.perennial; b.crop = 0; if (!def.perennial) world.tiles.fert[i] = Math.max(20, world.tiles.fert[i] - 12);"""),
]),
# ---------------------------------------------------------------- ember: sebesség, meleg, egészség
('src/agents/agent.js', [
("""      s *= 0.6 + 0.4 * a.health; if (a.needs.energy < 0.15) s *= 0.6; if (a.pregnancy && (world.tick - a.pregnancy.since) > TPD * 180) s *= 0.8;
      return s;""",
 """      s *= 0.6 + 0.4 * a.health; if (a.needs.energy < 0.15) s *= 0.6; if (a.pregnancy && (world.tick - a.pregnancy.since) > TPD * 180) s *= 0.8;
      s *= LW.Tech.mult(world, a, 'speed');
      return s;"""),
("""      const clothing = a.inv.clothes ? LW.ITEMS.clothes.warmth : 0;""",
 """      let clothing = 0; for (const k in a.inv) { const it = LW.ITEMS[k]; if (it && it.warmth && a.inv[k] > 0 && it.warmth > clothing) clothing = it.warmth; } clothing += LW.Tech.fx(world, a).warmth;"""),
("""      if (rng.chance(0.0006 * (1 - a.genes.physiology.immunity * 0.7) * (a.needs.food < 0.3 ? 2 : 1))) {""",
 """      if (rng.chance(0.0006 * (1 - a.genes.physiology.immunity * 0.7) * (a.needs.food < 0.3 ? 2 : 1) * (1 - 0.6 * Math.min(1, LW.Tech.fx(world, a).health)))) {"""),
]),
# ---------------------------------------------------------------- társas: közös nyelv + tanítás-hatások
('src/agents/social.js', [
("""      const p = cfg.conversationTransferBase * (0.5 + teller.personality.sociability) * (0.5 + listener.personality.intelligence) * (0.5 + r.friendship) * (1 - d.difficulty * 0.5) * (0.5 + 0.5 * LW.Speech.intelligibility(teller, listener));""",
 """      const p = cfg.conversationTransferBase * (0.5 + teller.personality.sociability) * (0.5 + listener.personality.intelligence) * (0.5 + r.friendship) * (1 - d.difficulty * 0.5) * (0.5 + 0.5 * LW.Speech.intelligibility(teller, listener)) * LW.Tech.mult(world, teller, 'teach') * (1 + LW.Tree.buildingBonus(world, teller.x, teller.y, 'teach', 14));"""),
]),
# ---------------------------------------------------------------- szimuláció: index, közösség
('src/sim/simulation.js', [
("""      world.ground = world.ground || new Map();
      LW.Speech.init(world);""",
 """      world.ground = world.ground || new Map();
      world.reindexBuildings();
      LW.Speech.init(world);"""),
("""      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w);""",
 """      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w); LW.Society.daily(w);"""),
]),
# ---------------------------------------------------------------- makró: hatások, forrás, otthon-létra, középületek, szerszámok
('src/sim/macro.js', [
("""      LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w);""",
 """      LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w); LW.Society.daily(w);"""),
("""        intake = 0.55 + 0.5 * (0.6 + a.skills.gathering * 0.6) * seasonFood * foodQ * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1) + hunt + fish;""",
 """        intake = (0.55 + 0.5 * (0.6 + a.skills.gathering * 0.6) * seasonFood * foodQ * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1) + hunt + fish) * (1 + LW.Tech.fx(w, a).food * 0.6 + LW.Tech.fx(w, a).farm * 0.2);"""),
("""        const el = LW.Tech.eligible(w, a).filter((id) => { const d = LW.Tech.D[id]; if (d.nearby === 'fire' && !fireNear) return false; if (d.nearby === 'water' && !A().knownCount(a, 'water')) return false; return true; });""",
 """        const el = LW.Tech.eligible(w, a).filter((id) => { const d = LW.Tech.D[id]; if (d.nearby === 'fire' && !fireNear) return false; if (d.nearby === 'water' && !A().knownCount(a, 'water')) return false; if (d.nearby && d.nearby !== 'fire' && d.nearby !== 'water' && !this.buildingNear(w, a, d.nearby, 24)) return false; return true; });"""),
("""        const kind = a.knowledge.techs.has('stone_masonry') ? 'stone_house' : a.knowledge.techs.has('hut_construction') ? 'hut' : a.knowledge.techs.has('shelter_building') ? 'lean_to' : null;
        const tier = { lean_to: 1, hut: 2, stone_house: 3 }; const cur = home ? tier[home.kind] || 0 : 0;""",
 """        let kind = null, kt = 0; for (const k in LW.Buildings.DEFS) { const d = LW.Buildings.DEFS[k]; if (d.dwelling && d.tier && (!d.tech || a.knowledge.techs.has(d.tech)) && d.tier > kt) { kt = d.tier; kind = k; } }
        const tier = { [kind]: kt }; const cur = home ? LW.Buildings.DEFS[home.kind].tier || 0 : 0;"""),
("""      // ---- knowledge of places grows slowly even when abstracted (people wander)""",
 """      // ---- középületek és jobb szerszámok (a napi léptékben elvonatkoztatva: az anyagot a közösség előteremti)
      if (adult && rng.chance(0.06)) { let best = 0, which = null; for (const k in LW.Buildings.DEFS) { if (!LW.Buildings.DEFS[k].public) continue; const wnt = LW.Society.wants(w, a, k); if (wnt > best) { best = wnt; which = k; } } if (which && best > 0.7) { let site = [...w.buildings.values()].find((b) => b.kind === which && b.progress < 1 && LW.dist(b.x, b.y, a.x, a.y) < 20); if (!site) { const s = LW.Buildings.findSite(w, a, which); if (s >= 0) site = LW.Buildings.create(w, which, w.xOf(s), w.yOf(s), a.id); } if (site) { const def = LW.Buildings.def(site); const expectedDays = 3 + def.ticks / 30; for (const k in def.cost) site.delivered[k] = Math.min(def.cost[k], (site.delivered[k] || 0) + def.cost[k] / expectedDays); site.progress = Math.min(1, site.progress + 1 / expectedDays * (0.7 + a.skills.building * 0.6) * LW.Tech.mult(w, a, 'build')); A().practice(a, 'building', 4); if (site.progress >= 1 && LW.Buildings.materialsComplete(site)) { a.counters.built++; LW.Buildings.complete(w, site, a); } else if (site.progress >= 1) site.progress = 0.95; } } }
      if (adult) for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech) || LW.Tree.bestTool(a, it.slot) >= it.tier) continue; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 24)) continue; if (!this.canSource(w, a, { items: R.inp || (R.inpAny ? R.inpAny[0] : {}) })) continue; if (rng.chance(0.12)) { a.inv[out] = 1; if (!w.firsts['item:' + out]) w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: out, first: true }); } }
      // ---- knowledge of places grows slowly even when abstracted (people wander)"""),
("""    canSource(w, a, d) { const need = d.items || (d.itemsAny ? d.itemsAny[0] : {}); for (const k in need) { const src = LW.Tech.SOURCE[k]; if (!src) return (a.inv[k] || 0) >= need[k]; if (src === 'fiber') continue; if (src === 'animals') { if (!a.inv.spear) return false; continue; } if (!A().knownCount(a, src)) return false; } return true; },""",
 """    canSource(w, a, d, depth) { depth = depth || 0; const need = d.items || (d.itemsAny ? d.itemsAny[0] : {}); for (const k in need) { if ((a.inv[k] || 0) >= need[k]) continue; const src = LW.Tech.SOURCE[k]; if (!src) { const R = LW.Tech.RECIPES[k]; if (!R || depth >= 2 || !a.knowledge.techs.has(R.tech)) return false; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 24)) return false; if (!this.canSource(w, a, { items: R.inp || (R.inpAny ? R.inpAny[0] : {}) }, depth + 1)) return false; continue; } if (src === 'fiber') continue; if (src === 'store') { const home = a.home != null ? w.buildings.get(a.home) : null; if (!home || !home.storage || !(home.storage[k] >= need[k])) return false; continue; } if (src === 'animals') { if (!a.inv.spear && LW.Tree.bestTool(a, 'hunt') < 1) return false; continue; } if (src.startsWith('deposit:')) { const dt = LW.DEPOSIT[src.slice(8).toUpperCase()]; let ok = false; for (const p of a.knowledge.places.values()) if (p.k === 'deposit' && p.q === dt) { ok = true; break; } if (!ok || !a.knowledge.techs.has('digging')) return false; if (dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling')) return false; continue; } if (!A().knownCount(a, src)) return false; } return true; },
    buildingNear(w, a, what, r) { const DEFS = LW.Buildings.DEFS; for (const b of w.buildings.values()) { if (b.progress < 1) continue; const def = DEFS[b.kind]; if ((b.kind === what || (def && def[what])) && LW.dist(a.x, a.y, b.x, b.y) <= r) return b; } return null; },"""),
]),
# ---------------------------------------------------------------- történelem: új események
('src/history/history.js', [
("""        case 'KnowledgeTransferred': return { text: `${n(ev.agentId)} megtanulta: ${T[ev.tech].name.toLowerCase()}${ev.teacherId != null ? ' (tanította: ' + n(ev.teacherId) + ')' : ''}.`, base: T[ev.tech].hidden ? 0.05 : 0.15 };""",
 """        case 'KnowledgeTransferred': return { text: `${n(ev.agentId)} ${ev.source === 'read' ? 'olvasta és megértette' : 'megtanulta'}: ${T[ev.tech].name.toLowerCase()}${ev.teacherId != null ? ' (tanította: ' + n(ev.teacherId) + ')' : ''}.`, base: T[ev.tech].hidden ? 0.05 : ev.source === 'read' ? 0.25 : 0.15 };
        case 'RecordWritten': return { text: `${n(ev.agentId)} leírta, amit tud: ${T[ev.tech].name.toLowerCase()}. A tudás most már túléli a tudót.`, base: 0.8, firstKey: 'record', firstTitle: 'Az első leírt tudás' };
        case 'Ritual': return { text: `${ev.n} ember szertartást tart a ${ev.temple ? 'templomnál' : 'szentélynél'}${ev.place ? ' (' + ev.place + ')' : ''}: az égi hangról énekelnek.`, base: 0.4, firstKey: 'rite', firstTitle: 'Az első szertartás' };
        case 'LeaderChosen': return { text: `${n(ev.agentId)} lett ${ev.place} vezetője.`, base: 0.7, firstKey: 'leader', firstTitle: 'Az első vezető' };
        case 'WorldSimulated': return { text: `A Világmag egy ${ev.n}. világot indított el: apró lények, akik egy hangot hallanak az égből.`, base: 1.2, firstKey: 'worldsim', firstTitle: 'A világ a világban' };"""),
]),
('src/core/hu.js', [
("""farmer: 'földműves', fisher: 'halász' },""", """farmer: 'földműves', fisher: 'halász', leader: 'vezető', smith: 'kovács', scholar: 'tudós', priest: 'pap', trader: 'kereskedő' },"""),
("""CreatorSpoke: 'A hang', CreatorAnswered: 'Válasz' },""", """CreatorSpoke: 'A hang', CreatorAnswered: 'Válasz', RecordWritten: 'Írás', Ritual: 'Szertartás', LeaderChosen: 'Vezető', WorldSimulated: 'Világmag', ItemCrafted: 'Készítés' },"""),
]),
('src/manifest.json', [
("""    "buildings/buildings.js",""", """    "buildings/buildings.js",
    "tech/tree.js","""),
("""    "language/speech.js",""", """    "language/speech.js",
    "society/society.js","""),
]),
]
