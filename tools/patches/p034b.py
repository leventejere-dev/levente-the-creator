PATCHES = [
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
("""g.grain = (g.grain || 0) + (q - add); world.ground.set(i, g); } b.planted = false; b.crop = 0; world.tiles.fert[i] = Math.max(20, world.tiles.fert[i] - 12);""",
 """g[cropItem] = (g[cropItem] || 0) + (q - add); world.ground.set(i, g); } b.planted = !!def.perennial; b.crop = 0; if (!def.perennial) world.tiles.fert[i] = Math.max(20, world.tiles.fert[i] - 12);"""),
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
