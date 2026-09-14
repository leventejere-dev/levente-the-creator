PATCHES = [
('src/core/config.js', [
("""    grain:       { food: 0.30, spoilDays: 90, weight: 0.5, label: 'Gabona' },""",
 """    grain:       { food: 0.40, spoilDays: 120, weight: 0.5, label: 'Gabona' },"""),
]),
('src/agents/actions.js', [
("""const q = Math.round((def.yieldBase || 6) + world.tiles.fert[i] / 255 * 8) * (1 + LW.Tech.fx(world, a).farm) | 0;""",
 """const q = Math.round(((def.yieldBase || 30) + world.tiles.fert[i] / 255 * 30) * (1 + LW.Tech.fx(world, a).farm)); // egy szántó egy családot etet, nem egy vacsorát"""),
]),
('src/tech/tree.js', [
("""    orchard: { label: 'Gyümölcsös', cost: { wood: 4 }, ticks: 120, farm: true, cropItem: 'fruit', cropDays: 200, yieldBase: 10, tech: 'horticulture', lifeDays: 6000, size: [2, 2] },""",
 """    orchard: { label: 'Gyümölcsös', cost: { wood: 4 }, ticks: 120, farm: true, cropItem: 'fruit', cropDays: 200, yieldBase: 40, perennial: true, tech: 'horticulture', lifeDays: 6000, size: [2, 2] },"""),
]),
('src/agents/brain.js', [
("""      score: (c, a) => { const farm = [...c.world.buildings.values()].find((b) => b.kind === 'farm_plot' && b.ownerId === a.id); a._farm = farm; if (!farm) return [c.season <= 1 && c.home ? 0.6 + P(a).discipline * 0.3 : 0.1, ['szántót akar']];""",
 """      score: (c, a) => { const farms = [...c.world.buildings.values()].filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id); const maxFarms = 1 + (c.household.length >= 3 ? 1 : 0) + (a.knowledge.techs.has('plowing') ? 1 : 0) + (a.knowledge.techs.has('crop_rotation') ? 1 : 0); const farm = farms.find((b) => b.progress < 1) || farms.find((b) => b.planted && b.crop >= 1) || farms.find((b) => !b.planted) || null; a._farm = farm; if (!farm) { if (farms.length >= maxFarms) return [0.05, ['nő a termés']]; return [c.season <= 1 && c.home ? 0.6 + P(a).discipline * 0.3 + (farms.length === 0 ? 0.2 : 0) + u(N(a).food) * 0.4 : 0.1, [farms.length ? 'még egy szántót akar' : 'szántót akar']]; }"""),
]),
('src/sim/macro.js', [
("""        if (a.knowledge.techs.has('seed_planting') && home && rng.chance(0.15)) { let farm = [...w.buildings.values()].find((b) => b.kind === 'farm_plot' && b.ownerId === a.id); if (!farm) { const s = LW.Buildings.findSite(w, a, 'farm_plot'); if (s >= 0) { farm = LW.Buildings.create(w, 'farm_plot', w.xOf(s), w.yOf(s), a.id); farm.delivered = { wood: 2 }; LW.Buildings.complete(w, farm, a); } } if (farm && farm.progress >= 1) { if (!farm.planted && LW.Time.season(w.tick) <= 1) { farm.planted = true; farm.crop = 0; } else if (farm.planted && farm.crop >= 1) { const q = Math.round(6 + w.tiles.fert[w.idx(farm.x, farm.y)] / 255 * 8); if (home.storage) home.storage.grain = (home.storage.grain || 0) + q; farm.planted = false; farm.crop = 0; w.events.emit('Harvest', { tick: w.tick, agentId: a.id, amount: q, tile: w.idx(farm.x, farm.y), first: !w.firsts['harvest'] }); } } }""",
 """        if (a.knowledge.techs.has('seed_planting') && home && rng.chance(0.35)) {
          const farms = [...w.buildings.values()].filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id); const maxFarms = 1 + (hh.length >= 3 ? 1 : 0) + (a.knowledge.techs.has('plowing') ? 1 : 0) + (a.knowledge.techs.has('crop_rotation') ? 1 : 0);
          if (farms.length < maxFarms && LW.Time.season(w.tick) <= 1 && rng.chance(0.5)) { const s = LW.Buildings.findSite(w, a, 'farm_plot'); if (s >= 0) { const f = LW.Buildings.create(w, 'farm_plot', w.xOf(s), w.yOf(s), a.id); f.delivered = { wood: 2 }; LW.Buildings.complete(w, f, a); farms.push(f); } }
          for (const farm of farms) { if (farm.progress < 1) continue; if (!farm.planted && LW.Time.season(w.tick) <= 1) { farm.planted = true; farm.crop = 0; } else if (farm.planted && farm.crop >= 1) { const q = Math.round((30 + w.tiles.fert[w.idx(farm.x, farm.y)] / 255 * 30) * (1 + LW.Tech.fx(w, a).farm)); const store = home.storage ? home.storage : (LW.Tree.nearestStore(w, a, 12) || {}).storage; if (store) store.grain = Math.min((store.grain || 0) + q, 400); farm.planted = false; farm.crop = 0; A().practice(a, 'farming', 6); w.events.emit('Harvest', { tick: w.tick, agentId: a.id, amount: q, tile: w.idx(farm.x, farm.y), first: !w.firsts['harvest'] }); } }
        }"""),
("""        const fires = [...w.buildings.values()].filter((b) => b.kind === 'campfire' && LW.dist(b.x, b.y, a.x, a.y) < 5);
        if (!fires.length && rng.chance(0.5) && A().knownCount(a, 'wood')) {""",
 """        const fires = [...w.buildings.values()].filter((b) => b.kind === 'campfire' && LW.dist(b.x, b.y, a.x, a.y) < 8);
        if (!fires.length && rng.chance(0.5) && A().knownCount(a, 'wood')) {"""),
# a makróban a tárolt gabona etet: az intake-számítás már a raktárból vesz; a felesleg a raktárba kerül
("""        const foodQ = Math.min(1, [...a.knowledge.places.values()].filter((p) => p.k === 'food').reduce((s, p) => s + p.q, 0) / 400);""",
 """        const foodQ = Math.min(1, [...a.knowledge.places.values()].filter((p) => p.k === 'food').reduce((s, p) => s + p.q, 0) / 400) * (1 - Math.min(0.5, (w.agentsNear(a.x, a.y, 10, a.id).length) * 0.03)); // sokan ugyanazt a bokrot dézsmálják"""),
]),
('src/buildings/buildings.js', [
("""          if (b.progress >= 1 || def.divine) { b.hp -= 1 / def.lifeDays; if (b.hp <= 0) { this.destroy(world, b, def.divine ? 'elhalványult' : 'elkorhadt'); continue; } }""",
 """          if (b.progress >= 1 || def.divine) { b.hp -= (b.kind === 'campfire' && !b.lit ? 8 : 1) / def.lifeDays; if (b.hp <= 0) { this.destroy(world, b, def.divine ? 'elhalványult' : 'elkorhadt'); continue; } } // a kihűlt tűzhely hamar elenyészik"""),
]),
('src/society/society.js', [
("""      if (def.want === 'food') want += (1 - a.needs.food) * 0.6;""",
 """      if (def.want === 'food') { want += (1 - a.needs.food) * 1.2 + 0.2; const hungry = world.agentsNear(a.x, a.y, 12, a.id).filter((o) => o.needs.food < 0.4).length; want += Math.min(0.6, hungry * 0.1); }"""),
]),
]
