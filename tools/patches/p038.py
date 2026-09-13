PATCHES = [
('src/tech/tree.js', [
("""    workshop: pub({ label: 'Műhely', cost: { wood: 18, stone: 6, fiber: 4 }, ticks: 240, workshop: 1, craft: 0.3, tech: 'carpentry', lifeDays: 4000, minPop: 3 }),""",
 """    workshop: pub({ label: 'Műhely', cost: { wood: 18, stone: 6, fiber: 4 }, ticks: 240, workshop: 1, craft: 0.3, storage: 80, tech: 'carpentry', lifeDays: 4000, minPop: 3 }),"""),
("""    furnace: pub({ label: 'Olvasztókemence', cost: { stone: 16, clay: 10, wood: 6 }, ticks: 260, furnace: 2, tech: 'copper_smelting', lifeDays: 4000, light: 0.4, minPop: 3 }),""",
 """    furnace: pub({ label: 'Olvasztókemence', cost: { stone: 16, clay: 10, wood: 6 }, ticks: 260, furnace: 2, storage: 60, tech: 'copper_smelting', lifeDays: 4000, light: 0.4, minPop: 3 }),"""),
("""    forge: pub({ label: 'Kovácsműhely', cost: { stone: 20, wood: 14, iron: 4 }, ticks: 360, furnace: 3, forge: true, workshop: 1, craft: 0.4, tech: 'iron_working', lifeDays: 6000, light: 0.5, minPop: 5 }),""",
 """    forge: pub({ label: 'Kovácsműhely', cost: { stone: 20, wood: 14, iron: 4 }, ticks: 360, furnace: 3, forge: true, workshop: 1, craft: 0.4, storage: 80, tech: 'iron_working', lifeDays: 6000, light: 0.5, minPop: 5 }),"""),
("""    market: pub({ label: 'Piac', cost: { wood: 14, stone: 8, cloth: 4 }, ticks: 300, market: 1, tech: 'trade', lifeDays: 8000, minPop: 8, want: 'food' }),
    mill: pub({ label: 'Malom', cost: { wood: 24, stone: 12 }, ticks: 500, mill: 1, tech: 'milling', lifeDays: 10000, minPop: 8, want: 'food' }),""",
 """    market: pub({ label: 'Piac', cost: { wood: 14, stone: 8, cloth: 4 }, ticks: 300, market: 1, storage: 150, tech: 'trade', lifeDays: 8000, minPop: 8, want: 'food' }),
    mill: pub({ label: 'Malom', cost: { wood: 24, stone: 12 }, ticks: 500, mill: 1, storage: 100, tech: 'milling', lifeDays: 10000, minPop: 8, want: 'food' }),"""),
("""    factory: pub({ label: 'Gyár', cost: { brick: 60, iron: 20, machine_part: 10 }, ticks: 2000, factory: 1, craft: 0.8, tech: 'factory_system', lifeDays: 20000, light: 0.8, minPop: 40, size: [3, 2] }),""",
 """    factory: pub({ label: 'Gyár', cost: { brick: 60, iron: 20, machine_part: 10 }, ticks: 2000, factory: 1, craft: 0.8, storage: 300, tech: 'factory_system', lifeDays: 20000, light: 0.8, minPop: 40, size: [3, 2] }),"""),
("""    /** Épület-adta szorzó a közelben (műhely, labor, egyetem…): a legjobb ilyen épület egy tulajdonságára. */""",
 """    /** Közös raktár a közelben, amelyben van a keresett anyagból (műhely, kovács, piac, gyár…). */
    publicStore(world, a, item, radius) { for (const b of world.buildingsNear(a.x | 0, a.y | 0, radius || 20)) { const d = B[b.kind]; if (b.progress >= 1 && d && d.public && d.storage && b.storage && (b.storage[item] || 0) > 0) return b; } return null; },
    /** Legközelebbi közös raktár, ahová termelni lehet. */
    nearestStore(world, a, radius) { let best = null, bd = 1e9; for (const b of world.buildingsNear(a.x | 0, a.y | 0, radius || 20)) { const d = B[b.kind]; if (!(b.progress >= 1 && d && d.public && d.storage)) continue; const dd = LW.dist(a.x, a.y, b.x, b.y); if (dd < bd) { bd = dd; best = b; } } return best; },
    /** Épület-adta szorzó a közelben (műhely, labor, egyetem…): a legjobb ilyen épület egy tulajdonságára. */"""),
]),
('src/agents/brain.js', [
("""      if (!src) { // nincs a világban: talán meg lehet csinálni (recept-lánc, legfeljebb 2 mélységig)
        const R = LW.Tech.RECIPES[item]; if (!R || depth >= 2 || !a.knowledge.techs.has(R.tech)) return null;""",
 """      if (!src || src === 'store') { const ps = LW.Tree.publicStore(world, a, item, 20); if (ps && ps.storage[item] >= Math.min(q, 2)) { steps.push({ op: 'moveTo', i: world.idx(ps.x, ps.y), near: 1.5 }); steps.push({ op: 'take', bid: ps.id, item, n: q }); continue; } } // a közös raktárból
      if (!src) { // nincs a világban: talán meg lehet csinálni (recept-lánc, legfeljebb 2 mélységig)
        const R = LW.Tech.RECIPES[item]; if (!R || depth >= 2 || !a.knowledge.techs.has(R.tech)) return null;"""),
]),
('src/sim/macro.js', [
("""    canSource(w, a, d, depth) { depth = depth || 0; const need = d.items || (d.itemsAny ? d.itemsAny[0] : {}); for (const k in need) { if ((a.inv[k] || 0) >= need[k]) continue; const src = LW.Tech.SOURCE[k];""",
 """    canSource(w, a, d, depth) { depth = depth || 0; const need = d.items || (d.itemsAny ? d.itemsAny[0] : {}); for (const k in need) { if ((a.inv[k] || 0) >= need[k]) continue; { const ps = LW.Tree.publicStore(w, a, k, 20); if (ps && ps.storage[k] >= need[k]) continue; } const src = LW.Tech.SOURCE[k];"""),
("""      if (adult) for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech) || LW.Tree.bestTool(a, it.slot) >= it.tier) continue;""",
 """      // anyagtermelés a közösségnek: aki ért hozzá és van hozzá műhely, a közös raktárba dolgozik (réz, vas, tégla, papír, üveg…)
      if (adult && rng.chance(0.3)) { const store = LW.Tree.nearestStore(w, a, 20); if (store) { const cands = []; for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || it.slot || it.food || !a.knowledge.techs.has(R.tech)) continue; if ((store.storage[out] || 0) >= 24) continue; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 20)) continue; if (!this.canSource(w, a, { items: R.inp || (R.inpAny ? R.inpAny[0] : {}) })) continue; cands.push([rid, R, out]); } if (cands.length) { const [rid, R, out] = rng.pick(cands); const inp = R.inp || (R.inpAny ? R.inpAny[0] : {}); for (const k in inp) { const ps = LW.Tree.publicStore(w, a, k, 20); if (ps && ps.storage[k] >= inp[k]) ps.storage[k] -= inp[k]; else if ((a.inv[k] || 0) >= inp[k]) a.inv[k] -= inp[k]; } store.storage[out] = (store.storage[out] || 0) + R.out[out] * 2; A().practice(a, R.skill || 'crafting', 3); if (!w.firsts['item:' + out]) w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: out, first: true }); } } }
      if (adult) for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech) || LW.Tree.bestTool(a, it.slot) >= it.tier) continue;"""),
("""    buildingNear(w, a, what, r) {""",
 """    buildingNear(w, a, what, r) {"""),
]),
]
