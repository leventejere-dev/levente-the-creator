# p052 — a részletes tick 800 embernél: a földön heverő holmi keresése ablakban (6800 kupac volt), a holmi a földön
# elenyészik, a tanítás/kísérlet/szerszám-pontozás olcsóbb; a tick szeletekben fut a képkockák között (nem akad az oldal)
PATCHES = [
('src/agents/brain.js', [
("""  function nearestGround(world, a, maxD) { let best = null, bd = maxD; for (const [i, g] of world.ground) { let any = false; for (const k in g) if (g[k] > 0) { any = true; break; } if (!any) continue; const d = LW.dist(a.x, a.y, world.xOf(i) + 0.5, world.yOf(i) + 0.5); if (d < bd) { bd = d; best = i; } } return best; }
  function nearestGroundFood(world, a, maxD) { let best = null, bd = maxD; for (const [i, g] of world.ground) { let any = false; for (const k in g) if (g[k] > 0 && LW.ITEMS[k] && LW.ITEMS[k].food) { any = true; break; } if (!any) continue; const d = LW.dist(a.x, a.y, world.xOf(i) + 0.5, world.yOf(i) + 0.5); if (d < bd) { bd = d; best = i; } } return best; }""",
 """  // a földön heverő holmi: csak a környező ablakot nézi (a világban ezrével hevernek kupacok, mind végigjárni drága volt)
  function nearestGroundBy(world, a, maxD, pred) { if (!world.ground || !world.ground.size) return null; let best = null, bd = maxD; const r = Math.ceil(maxD), ax = a.x | 0, ay = a.y | 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = ax + dx, y = ay + dy; if (!world.inBounds(x, y)) continue; const i = world.idx(x, y); const g = world.ground.get(i); if (!g) continue; let any = false; for (const k in g) if (g[k] > 0 && pred(k)) { any = true; break; } if (!any) continue; const d = LW.dist(a.x, a.y, x + 0.5, y + 0.5); if (d < bd) { bd = d; best = i; } } return best; }
  function nearestGround(world, a, maxD) { return nearestGroundBy(world, a, maxD, () => true); }
  function nearestGroundFood(world, a, maxD) { return nearestGroundBy(world, a, maxD, (k) => LW.ITEMS[k] && LW.ITEMS[k].food); }"""),
("""      score: (c, a) => { let best = 0, who = null, tech = null; for (const o of c.nearby) { if (o.sleeping || A().stage(c.world, o) === 'infant') continue; const r = a.relationships.get(o.id); const close = (a.children.includes(o.id) ? 0.8 : 0) + (r ? r.friendship * 0.6 : 0); if (close < 0.2) continue; for (const t of a.knowledge.techs) { if (o.knowledge.techs.has(t) || LW.Tech.D[t].hidden) continue; const pre = !LW.Tech.D[t].prereq || LW.Tech.D[t].prereq.every((p) => o.knowledge.techs.has(p)); if (!pre) continue; const s = 0.3 * (1 + (a.mind ? a.mind.mortality * 1.2 : 0)) * close * (0.5 + P(a).empathy + P(a).sociability * 0.5) * (c.stage === 'elder' ? 1.5 : 1); if (s > best) { best = s; who = o; tech = t; } } } a._teach = who ? { who, tech } : null; return [best, who ? [`tanítja (${LW.Tech.D[tech].name.toLowerCase()}): ${who.name}`] : []]; },""",
 """      score: (c, a) => { let best = 0, who = null, tech = null; const cands = []; for (const o of c.nearby) { if (o.sleeping || A().stage(c.world, o) === 'infant') continue; const r = a.relationships.get(o.id); const close = (a.children.includes(o.id) ? 0.8 : 0) + (r ? r.friendship * 0.6 : 0); if (close >= 0.2) cands.push([close, o]); } cands.sort((p, q) => q[0] - p[0]); const base = 0.3 * (1 + (a.mind ? a.mind.mortality * 1.2 : 0)) * (0.5 + P(a).empathy + P(a).sociability * 0.5) * (c.stage === 'elder' ? 1.5 : 1);
        for (const [close, o] of cands) { const s = base * close; if (s <= best) break; let t0 = null; for (const t of a.knowledge.techs) { if (o.knowledge.techs.has(t) || LW.Tech.D[t].hidden) continue; const pre = !LW.Tech.D[t].prereq || LW.Tech.D[t].prereq.every((p) => o.knowledge.techs.has(p)); if (pre) { t0 = t; break; } } if (t0) { best = s; who = o; tech = t0; break; } } // a pontszám nem függ attól, mit tanít: a legközelebbi tanítható ember elég
        a._teach = who ? { who, tech } : null; return [best, who ? [`tanítja (${LW.Tech.D[tech].name.toLowerCase()}): ${who.name}`] : []]; },"""),
("""        const el = LW.Tech.eligible(c.world, a); if (!el.length) return [0, ['nincs mit kipróbálni']];
        let best = 0, which = null;
        for (const id of el) { const d = LW.Tech.D[id]; const need = d.need ? u(N(a)[d.need] ?? 1) : 0; const prog = a.knowledge.progress[id] || 0; const m = LW.Tech.missingItems(a, d); const feasible = count(m) === 0 || acquireSteps(c.world, a, m, c); if (!feasible) continue; if (d.nearby === 'fire' && !c.fire) continue; if (d.nearby === 'water' && !c.water) continue; if (needsBuilding(d.nearby) && !nearestBuilding(c.world, a, d.nearby, 30)) continue; const s = (0.25 + P(a).curiosity * 0.5) * (0.4 + P(a).creativity * 0.6) * (1 - d.difficulty * 0.5) + need * 0.7 + prog * 0.4 + u(N(a).curiosity) * 0.35 + (count(m) === 0 ? 0.15 : 0); if (s > best) { best = s; which = id; } }""",
 """        // ami kipróbálható és elérhető: hatóránként újraszámolva (a beszerzési tervek végigpróbálása drága)
        if (!a._expC || c.world.tick - a._expC.tick > 24 || a._expC.n !== a.knowledge.techs.size) { const el = LW.Tech.eligible(c.world, a); const ok = []; for (const id of el) { const d = LW.Tech.D[id]; const m = LW.Tech.missingItems(a, d); const feasible = count(m) === 0 || acquireSteps(c.world, a, m, c); if (!feasible) continue; if (d.nearby === 'fire' && !c.fire) continue; if (d.nearby === 'water' && !c.water) continue; if (needsBuilding(d.nearby) && !nearestBuilding(c.world, a, d.nearby, 30)) continue; ok.push(id); } a._expC = { tick: c.world.tick, n: a.knowledge.techs.size, ids: ok }; }
        const el = a._expC.ids; if (!el.length) return [0, ['nincs mit kipróbálni']];
        let best = 0, which = null;
        for (const id of el) { const d = LW.Tech.D[id]; if (a.knowledge.techs.has(id)) continue; const need = d.need ? u(N(a)[d.need] ?? 1) : 0; const prog = a.knowledge.progress[id] || 0; const m = LW.Tech.missingItems(a, d); const s = (0.25 + P(a).curiosity * 0.5) * (0.4 + P(a).creativity * 0.6) * (1 - d.difficulty * 0.5) + need * 0.7 + prog * 0.4 + u(N(a).curiosity) * 0.35 + (count(m) === 0 ? 0.15 : 0); if (s > best) { best = s; which = id; } }"""),
("""        for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech)) continue; if (LW.Tree.bestTool(a, it.slot) >= it.tier) continue; if (needsBuilding(R.nearby) && !nearestBuilding(c.world, a, R.nearby, 30)) continue; if (R.nearby === 'fire' && !c.fire) continue; want.push([rid, 0.4 + (it.slot === 'hunt' ? u(N(a).food) * 0.3 : 0) + (it.slot === 'clothes' ? u(N(a).warmth) * 0.5 : 0) + P(a).ambition * 0.15]); }""",
 """        if (!a._toolC || c.world.tick - a._toolC.tick > 48) { const list = []; for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech)) continue; if (LW.Tree.bestTool(a, it.slot) >= it.tier) continue; if (needsBuilding(R.nearby) && !nearestBuilding(c.world, a, R.nearby, 30)) continue; list.push([rid, it.slot]); } a._toolC = { tick: c.world.tick, list }; } // félnaponta újraszámolva: 60 recept, mindnél épületkeresés
        for (const [rid, slot] of a._toolC.list) { const R = LW.Tech.RECIPES[rid]; if (R.nearby === 'fire' && !c.fire) continue; if (LW.Tree.bestTool(a, slot) >= LW.ITEMS[Object.keys(R.out)[0]].tier) continue; want.push([rid, 0.4 + (slot === 'hunt' ? u(N(a).food) * 0.3 : 0) + (slot === 'clothes' ? u(N(a).warmth) * 0.5 : 0) + P(a).ambition * 0.15]); }"""),
]),
('src/agents/agent.js', [
("""    knownCount(a, kind) {""",
 """    /** A földön hagyott holmi elenyészik: a fa és a bőr korhad, a kő a földbe süllyed, a fém rozsdál. */
    groundDecay(world, g, days) { const rng = world.rng; for (const k in g) { const it = LW.ITEMS[k]; if (!it || it.food) continue; const rate = it.tool || it.slot ? 0.003 : (k === 'stone' || k === 'flint' || k === 'clay' || k === 'salt' || /^ore_/.test(k) || k === 'coal' || k === 'gems' || k === 'gold_nugget') ? 0.006 : 0.02; const q = g[k]; if (q <= 0) { delete g[k]; continue; } const loss = q * rate * days; g[k] = q - loss - (rng.chance(rate * days * 4) ? 1 : 0); if (g[k] < 0.5) delete g[k]; } },
    knownCount(a, kind) {"""),
]),
('src/sim/macro.js', [
("""      for (const [i, g] of w.ground) { A().spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); }""",
 """      for (const [i, g] of w.ground) { A().spoil(w, g, 1.5); A().groundDecay(w, g, 1); if (!Object.keys(g).length) w.ground.delete(i); }"""),
]),
('src/sim/simulation.js', [
("""    tick() {
      const w = this.world; const t0 = now();
      w.tick++;
      w.weather.step();
      LW.Ecology.stepSlice(w);
      LW.Ecology.stepFire(w);
      w.rebuildBuckets();
      const agents = w.agentList();
      for (let k = 0; k < agents.length; k++) {
        const a = agents[k]; if (!w.agents.has(a.id)) continue;
        try {
          LW.Agents.stepBiology(w, a); if (!w.agents.has(a.id)) continue;
          if (((w.tick + a.id) & 1) === 0) LW.Perception.scan(w, a);
          if (LW.Brain.shouldDecide(w, a)) { LW.Brain.decide(w, a); a.lastDecisionTick = w.tick; }
          LW.Actions.step(w, a);
          if (((w.tick + a.id) & 3) === 0) LW.Social.ambient(w, a);
          this.nightHazards(w, a);
        } catch (e) { w.onError(e, a, null); a.plan = null; }
      }
      LW.Buildings.step(w);
      if (w.tick % T.TICKS_PER_HOUR === 0) { const h = LW.Time.hour(w.tick); for (const a of w.agents.values()) if (a.id % 24 === h) LW.Memory.consolidate(w, a); }
      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w); LW.Society.daily(w); for (const [i, g] of w.ground) { LW.Agents.spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); } }
      if (w.tick % T.TICKS_PER_YEAR === 0) w.history.yearEnd();
      w.meta.lastSimulatedTick = w.tick;
      const dt = now() - t0; this.perf.tickUs = this.perf.tickUs * 0.98 + dt * 1000 * 0.02; if (dt * 1000 > this.perf.tickMaxUs) this.perf.tickMaxUs = dt * 1000; this.perf._acc++;
    }""",
 """    tick() { if (!this._tp) this.tickBegin(); this.tickAgents(Infinity); this.tickEnd(); } // egy félbehagyott szeletelt ticket előbb befejez
    /** Egy tick három részben: kezdet (világ), emberek (szeletelhető), vég (épületek, nap, év). A képkockák között
     *  a szeletelt változat fut, hogy 800 embernél se akadjon meg az oldal: egy tick több képkockán át is tarthat. */
    tickBegin() {
      const w = this.world; this._tp = { t0: now(), cpu: 0, k: 0, agents: null };
      w.tick++;
      w.weather.step();
      LW.Ecology.stepSlice(w);
      LW.Ecology.stepFire(w);
      w.rebuildBuckets();
      this._tp.agents = w.agentList();
      this._tp.cpu += now() - this._tp.t0;
    }
    /** Az emberek lépése; legfeljebb budgetMs ideig. Igaz, ha mindenki sorra került. */
    tickAgents(budgetMs) {
      const w = this.world; const tp = this._tp; const agents = tp.agents; const t0 = now();
      for (; tp.k < agents.length; tp.k++) {
        const a = agents[tp.k]; if (!w.agents.has(a.id)) continue;
        try {
          LW.Agents.stepBiology(w, a); if (!w.agents.has(a.id)) continue;
          if (((w.tick + a.id) & 1) === 0) LW.Perception.scan(w, a);
          if (LW.Brain.shouldDecide(w, a)) { LW.Brain.decide(w, a); a.lastDecisionTick = w.tick; }
          LW.Actions.step(w, a);
          if (((w.tick + a.id) & 3) === 0) LW.Social.ambient(w, a);
          this.nightHazards(w, a);
        } catch (e) { w.onError(e, a, null); a.plan = null; }
        if ((tp.k & 15) === 15 && now() - t0 > budgetMs) { tp.k++; tp.cpu += now() - t0; return false; }
      }
      tp.cpu += now() - t0; return true;
    }
    tickEnd() {
      const w = this.world; const tp = this._tp; const t0 = now();
      LW.Buildings.step(w);
      if (w.tick % T.TICKS_PER_HOUR === 0) { const h = LW.Time.hour(w.tick); for (const a of w.agents.values()) if (a.id % 24 === h) LW.Memory.consolidate(w, a); }
      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w); LW.Society.daily(w); for (const [i, g] of w.ground) { LW.Agents.spoil(w, g, 1.5); LW.Agents.groundDecay(w, g, 1); if (!Object.keys(g).length) w.ground.delete(i); } }
      if (w.tick % T.TICKS_PER_YEAR === 0) w.history.yearEnd();
      w.meta.lastSimulatedTick = w.tick;
      const dt = (tp.cpu + now() - t0) / 1000; this._tp = null; this.perf.tickUs = this.perf.tickUs * 0.98 + dt * 1000 * 0.02; if (dt * 1000 > this.perf.tickMaxUs) this.perf.tickMaxUs = dt * 1000; this.perf._acc++;
    }
    get tickInProgress() { return !!this._tp; }"""),
("""      const t0 = now(); let n = 0;
      while (n < maxTicks) { this.tick(); n++; if (now() - t0 > budgetMs) break; }""",
 """      const t0 = now(); let n = 0;
      // szeletelve: egy drága tick több képkockán át folytatódik, a kicsik egy képkockába többen is beleférnek
      while (n < maxTicks) { if (!this._tp) this.tickBegin(); const done = this.tickAgents(Math.max(1, budgetMs - (now() - t0))); if (!done) break; this.tickEnd(); n++; if (now() - t0 > budgetMs) break; }"""),
]),
('src/core/config.js', [
("""    persistence: { autosaveSeconds: 30, snapshotSlots: 3, key: 'lw.world.v1' },""",
 """    persistence: { autosaveSeconds: 90, snapshotSlots: 3, key: 'lw.world.v1' },"""),
]),
]
