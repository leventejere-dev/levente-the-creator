# p050 — a közösség előbb befejezi, amit elkezdett; nem épül három híd egymás mellé
PATCHES = [
('src/sim/macro.js', [
("""      if (adult && rng.chance(0.06 * load)) { const pick = LW.Society.pickPublic(w, a); const which = pick ? pick.kind : null, best = pick ? pick.want : 0; if (which && best > 0.5) { let site = w.buildingsNear(a.x | 0, a.y | 0, 20).find((b) => b.kind === which && b.progress < 1);""",
 """      if (adult && rng.chance(0.06 * load)) { let which = null, best = 0, site = null;
        if (rng.chance(0.6)) { const open = w.buildingsNear(a.x | 0, a.y | 0, 20).filter((b) => b.progress < 1 && LW.Buildings.DEFS[b.kind].public && LW.Buildings.DEFS[b.kind].tech && a.knowledge.techs.has(LW.Buildings.DEFS[b.kind].tech)); if (open.length) { site = open.sort((p, q) => q.progress - p.progress)[0]; which = site.kind; best = 1; } } // előbb befejezik, amit elkezdtek
        if (!site) { const pick = LW.Society.pickPublic(w, a); which = pick ? pick.kind : null; best = pick ? pick.want : 0; }
        if (which && best > 0.5) { if (!site) site = w.buildingsNear(a.x | 0, a.y | 0, 20).find((b) => b.kind === which && b.progress < 1);"""),
]),
('src/society/society.js', [
("""      for (const b of world.buildingsNear(a.x | 0, a.y | 0, 16)) if (b.kind === kind) { if (b.progress < 1) return 0.9; if (!def.bridge) return 0; } // a félkész középületet be kell fejezni; hídból több is kellhet""",
 """      for (const b of world.buildingsNear(a.x | 0, a.y | 0, 16)) if (b.kind === kind) { if (b.progress < 1) return 1.4; if (!def.bridge) return 0; } // a félkész középületet be kell fejezni; hídból több is kellhet"""),
]),
('src/world/crossings.js', [
("""        if (!world.isPassable(i) || t.bridge[i]) continue; const own = comp[i];""",
 """        if (!world.isPassable(i) || t.bridge[i]) continue; const own = comp[i];
        if (world.buildingsNear(x, y, 3).some((b) => { const d = B()[b.kind]; return d && d.bridge; })) continue; // egy átkelő elég egy helyre"""),
]),
]
