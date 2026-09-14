# p049 — a közösség nem mindig ugyanazt az egy középületet akarja: súlyozott választás; és aki tudja, mihez kellene
# kemence/műhely/labor/kikötő (elérhető felfedezés, ismert recept), az azt akarja megépíteni
PATCHES = [
('src/society/society.js', [
("""      if (def.furnace || def.workshop || def.lab || def.factory || def.computer) want += a.personality.creativity * 0.5 + a.personality.ambition * 0.3;
      return want;
    },""",
 """      if (def.furnace || def.workshop || def.lab || def.factory || def.computer) want += a.personality.creativity * 0.5 + a.personality.ambition * 0.3;
      // hiányzó hely: aki tudja, mire kellene (elérhető felfedezés vagy ismert recept), az akarja
      const day = world.tick / T.TICKS_PER_DAY | 0;
      if (a._needDay !== day) { a._needDay = day; const need = {}; for (const id of LW.Tech.eligible(world, a)) { const nb = LW.Tech.D[id].nearby; if (nb && nb !== 'fire' && nb !== 'water') need[nb] = (need[nb] || 0) + 0.5; } for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && a.knowledge.techs.has(R.tech)) need[R.nearby] = (need[R.nearby] || 0) + 0.25; } a._need = need; }
      let boost = 0; for (const k in a._need) if (k === kind || def[k]) boost += a._need[k]; want += Math.min(1.5, boost);
      return want;
    },
    /** Melyik középületet kezdje el ma: a vágyak közül súlyozott véletlennel (nem mindig a legnagyobb — sokféle kell). */
    pickPublic(world, a) {
      const DEFS = Bld().DEFS; const cands = []; let sum = 0;
      for (const k in DEFS) { if (!DEFS[k].public) continue; const wnt = this.wants(world, a, k); if (wnt > 0.5) { const wt = wnt * wnt; cands.push([k, wnt, wt]); sum += wt; } }
      if (!cands.length) return null; let r = world.rng.f() * sum; for (const c of cands) { r -= c[2]; if (r <= 0) return { kind: c[0], want: c[1] }; } return { kind: cands[cands.length - 1][0], want: cands[cands.length - 1][1] };
    },"""),
]),
('src/sim/macro.js', [
("""      if (adult && rng.chance(0.06 * load)) { let best = 0, which = null; for (const k in LW.Buildings.DEFS) { if (!LW.Buildings.DEFS[k].public) continue; const wnt = LW.Society.wants(w, a, k); if (wnt > best) { best = wnt; which = k; } } if (which && best > 0.5) {""",
 """      if (adult && rng.chance(0.06 * load)) { const pick = LW.Society.pickPublic(w, a); const which = pick ? pick.kind : null, best = pick ? pick.want : 0; if (which && best > 0.5) {"""),
]),
('src/agents/brain.js', [
("""      score: (c, a) => { let best = 0, which = null; const DEFS = Bld().DEFS; for (const k in DEFS) { if (!DEFS[k].public) continue; const w = LW.Society.wants(c.world, a, k); if (w > best) { best = w; which = k; } } a._pubKind = which; if (!which) return [0, []];""",
 """      score: (c, a) => { const DEFS = Bld().DEFS; const day = c.world.tick / LW.TIME.TICKS_PER_DAY | 0; if (a._pubDay !== day || !a._pubKind) { const pick = LW.Society.pickPublic(c.world, a); a._pubKind = pick ? pick.kind : null; a._pubWant = pick ? pick.want : 0; a._pubDay = day; } const which = a._pubKind, best = a._pubWant || 0; if (!which) return [0, []];"""),
]),
]
