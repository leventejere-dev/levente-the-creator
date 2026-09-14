PATCHES = [
# ---------------------------------------------------------------- épület-rács: buildingsNear O(1) környék-lekérdezés
('src/world/world.js', [
("""    addBuilding(b) { this.buildings.set(b.id, b); if (!this.btile) this.btile = new Map(); for (const i of this.buildingTiles(b)) { this.btile.set(i, b.id); this.tiles.shade[i] = 1; } return b; }
    removeBuilding(id) { const b = this.buildings.get(id); if (!b) return; this.buildings.delete(id); if (this.btile) for (const i of this.buildingTiles(b)) { if (this.btile.get(i) === id) { this.btile.delete(i); this.tiles.shade[i] = 0; } } }
    buildingAt(i) { if (!this.btile) this.reindexBuildings(); const id = this.btile.get(i); return id != null ? (this.buildings.get(id) || null) : null; }
    reindexBuildings() { this.btile = new Map(); for (const b of this.buildings.values()) for (const i of this.buildingTiles(b)) this.btile.set(i, b.id); }""",
 """    addBuilding(b) { this.buildings.set(b.id, b); if (!this.btile) this.btile = new Map(); for (const i of this.buildingTiles(b)) { this.btile.set(i, b.id); this.tiles.shade[i] = 1; } this._bput(b); return b; }
    removeBuilding(id) { const b = this.buildings.get(id); if (!b) return; this.buildings.delete(id); if (this.btile) for (const i of this.buildingTiles(b)) { if (this.btile.get(i) === id) { this.btile.delete(i); this.tiles.shade[i] = 0; } } this._bdel(b); }
    buildingAt(i) { if (!this.btile) this.reindexBuildings(); const id = this.btile.get(i); return id != null ? (this.buildings.get(id) || null) : null; }
    reindexBuildings() { this.btile = new Map(); this.bcells = new Map(); for (const b of this.buildings.values()) { for (const i of this.buildingTiles(b)) this.btile.set(i, b.id); this._bput(b); } }
    _bkey(x, y) { return ((y >> 3) * 4096) + (x >> 3); }
    _bput(b) { if (!this.bcells) this.bcells = new Map(); const k = this._bkey(b.x, b.y); let s = this.bcells.get(k); if (!s) { s = new Set(); this.bcells.set(k, s); } s.add(b.id); }
    _bdel(b) { if (!this.bcells) return; const s = this.bcells.get(this._bkey(b.x, b.y)); if (s) s.delete(b.id); }"""),
("""    buildingsNear(x, y, r) { const out = []; for (const b of this.buildings.values()) if (Math.abs(b.x - x) <= r && Math.abs(b.y - y) <= r) out.push(b); return out; }""",
 """    buildingsNear(x, y, r) { const out = []; if (!this.bcells) this.reindexBuildings(); const x0 = (x - r) >> 3, x1 = (x + r) >> 3, y0 = (y - r) >> 3, y1 = (y + r) >> 3; for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const s = this.bcells.get(cy * 4096 + cx); if (!s) continue; for (const id of s) { const b = this.buildings.get(id); if (b && Math.abs(b.x - x) <= r && Math.abs(b.y - y) <= r) out.push(b); } } return out; }"""),
]),
# ---------------------------------------------------------------- makró: környék-lekérdezések az összes-épület pásztázás helyett
('src/sim/macro.js', [
("""      const fireNear = [...w.buildings.values()].some((b) => b.kind === 'campfire' && b.lit && LW.dist(b.x, b.y, a.x, a.y) < 4);""",
 """      const fireNear = w.buildingsNear(a.x | 0, a.y | 0, 4).some((b) => b.kind === 'campfire' && b.lit && LW.dist(b.x, b.y, a.x, a.y) < 4);"""),
("""        const fires = [...w.buildings.values()].filter((b) => b.kind === 'campfire' && LW.dist(b.x, b.y, a.x, a.y) < 8);""",
 """        const fires = w.buildingsNear(a.x | 0, a.y | 0, 8).filter((b) => b.kind === 'campfire' && LW.dist(b.x, b.y, a.x, a.y) < 8);"""),
("""          let site = [...w.buildings.values()].find((b) => b.ownerId === a.id && b.progress < 1 && LW.Buildings.def(b).dwelling);""",
 """          let site = w.buildingsNear(a.x | 0, a.y | 0, 24).find((b) => b.ownerId === a.id && b.progress < 1 && LW.Buildings.def(b).dwelling);"""),
("""          const farms = [...w.buildings.values()].filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id); const maxFarms = 1""",
 """          const farms = w.buildingsNear(a.x | 0, a.y | 0, 20).filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id); const maxFarms = 1"""),
("""    buildingNear(w, a, what, r) { const DEFS = LW.Buildings.DEFS; for (const b of w.buildings.values()) { if (b.progress < 1) continue; const def = DEFS[b.kind]; if ((b.kind === what || (def && def[what])) && LW.dist(a.x, a.y, b.x, b.y) <= r) return b; } return null; },""",
 """    buildingNear(w, a, what, r) { const DEFS = LW.Buildings.DEFS; for (const b of w.buildingsNear(a.x | 0, a.y | 0, r)) { if (b.progress < 1) continue; const def = DEFS[b.kind]; if ((b.kind === what || (def && def[what])) && LW.dist(a.x, a.y, b.x, b.y) <= r) return b; } return null; },"""),
]),
('src/agents/brain.js', [
("""  function nearestFire(world, a, maxD) { let best = null, bd = maxD; for (const b of world.buildings.values()) { if (b.kind !== 'campfire' || !b.lit || b.progress < 1) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }""",
 """  function nearestFire(world, a, maxD) { let best = null, bd = maxD; for (const b of world.buildingsNear(a.x | 0, a.y | 0, maxD)) { if (b.kind !== 'campfire' || !b.lit || b.progress < 1) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }"""),
("""  function nearestBuilding(world, a, what, maxD) { let best = null, bd = maxD || 24; const DEFS = Bld().DEFS; for (const b of world.buildings.values()) {""",
 """  function nearestBuilding(world, a, what, maxD) { let best = null, bd = maxD || 24; const DEFS = Bld().DEFS; for (const b of world.buildingsNear(a.x | 0, a.y | 0, bd)) {"""),
("""        const existing = [...c.world.buildings.values()].find((b) => b.kind === 'campfire' && !b.lit && LW.dist(b.x, b.y, a.x, a.y) < 6);""",
 """        const existing = c.world.buildingsNear(a.x | 0, a.y | 0, 6).find((b) => b.kind === 'campfire' && !b.lit && LW.dist(b.x, b.y, a.x, a.y) < 6);"""),
("""      score: (c, a) => { const farms = [...c.world.buildings.values()].filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id);""",
 """      score: (c, a) => { const farms = c.world.buildingsNear(a.x | 0, a.y | 0, 20).filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id);"""),
("""  function findHouseholdSite(c, a) { for (const b of c.world.buildings.values()) {""",
 """  function findHouseholdSite(c, a) { for (const b of c.world.buildingsNear(a.x | 0, a.y | 0, 40)) {"""),
("""    const pubk = !!Bld().DEFS[kind].public; let site = [...c.world.buildings.values()].find((b) => b.kind === kind && b.progress < 1 && (b.ownerId === a.id || (pubk && LW.dist(a.x, a.y, b.x, b.y) < 20)));""",
 """    const pubk = !!Bld().DEFS[kind].public; let site = c.world.buildingsNear(a.x | 0, a.y | 0, 24).find((b) => b.kind === kind && b.progress < 1 && (b.ownerId === a.id || (pubk && LW.dist(a.x, a.y, b.x, b.y) < 20)));"""),
]),
# ---------------------------------------------------------------- felzárkózás: számolási keret + kihagyás; a főciklus órája a ténylegesen szimulált időt követi
('src/sim/simulation.js', [
("""      const total = macroDays * T.TICKS_PER_DAY + detailTicks; let doneTicks = 0; let dayI = 0;""",
 """      const total = macroDays * T.TICKS_PER_DAY + detailTicks; let doneTicks = 0; let dayI = 0; const t0 = now(); const budget = cb && cb.budgetMs ? cb.budgetMs : Infinity; this._catchSkip = false;
      const outOfTime = () => this._catchSkip || (now() - t0) > budget;"""),
("""      const finish = () => { meta.lastRealTimeMs = Date.now(); /* a felzárkózás saját ideje nem tartozás — különben végtelen hurok */""",
 """      const finish = () => { meta.lastRealTimeMs = Date.now(); report.skippedTicks = Math.max(0, total - doneTicks); /* a felzárkózás saját ideje nem tartozás — különben végtelen hurok */"""),
("""        if (cb && cb.progress) cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);
        if (dayI < macroDays) schedule(stepMacro); else schedule(stepDetail);""",
 """        if (cb && cb.progress) cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);
        if (outOfTime()) { finish(); return; }
        if (dayI < macroDays) schedule(stepMacro); else schedule(stepDetail);"""),
("""        if (cb && cb.progress) cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);
        if (dt < detailTicks) schedule(stepDetail); else finish();""",
 """        if (cb && cb.progress) cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);
        if (dt < detailTicks && !outOfTime()) schedule(stepDetail); else finish();"""),
("""      if (cb && cb.sync) { while (dayI < macroDays) { LW.Macro.day(w); dayI++; } while (dt < detailTicks) { this.tick(); dt++; } finish(); return report; }""",
 """      if (cb && cb.sync) { while (dayI < macroDays && !outOfTime()) { LW.Macro.day(w); dayI++; doneTicks += T.TICKS_PER_DAY; } while (dt < detailTicks && !outOfTime()) { this.tick(); dt++; doneTicks++; } finish(); return report; }"""),
]),
('src/main.js', [
("""      this.ui.showCatchup(0, 'A világ ébred…'); this.catchingUp = true; sim.paused = true;
      sim.catchUp(Date.now(), { progress: (p, label) => this.ui.showCatchup(p, label), done: (rep) => { this.catchingUp = false; sim.paused = false; this.lastReport = rep; this.renderer.bakeAll(); this.ui.attachWorld(sim.world); done(rep); this.save(true); } });""",
 """      this.ui.showCatchup(0, 'A világ ébred…'); this.catchingUp = true; sim.paused = true;
      // a böngésző legfeljebb ~2 percet számol; ami nem fér bele, azt kihagyja (az idő ugrik, a világ nem kerül hurokba)
      sim.catchUp(Date.now(), { budgetMs: 120000, progress: (p, label) => this.ui.showCatchup(p, label), done: (rep) => { this.catchingUp = false; sim.paused = false; this.lastReport = rep; this.renderer.bakeAll(); this.ui.attachWorld(sim.world); done(rep); this.save(true); } });"""),
("""        if (this.sim.paused) meta.lastRealTimeMs = Date.now(); // a deliberate pause is the Creator's choice: no time accrues
        else {
          // real time owed since the last simulated frame — background tabs are throttled, so this can be much more than one frame
          const owedMs = Math.max(dt, Date.now() - (meta.lastRealTimeMs || Date.now()));
          if (owedMs > 120000) { this.runCatchUp(this.sim, (rep) => this.ui.showWelcomeReport(rep)); }
          else { this.sim.advance(owedMs, this.cfg.time.frameBudgetMs); meta.lastRealTimeMs = Date.now(); }
        }""",
 """        if (this.sim.paused) meta.lastRealTimeMs = Date.now(); // a deliberate pause is the Creator's choice: no time accrues
        else {
          // a világ órája annyit lép, amennyit a gép tényleg leszimulált: ha a gép lassabb a beállított sebességnél, a világ lassabban megy, nem halmoz tartozást
          const owedMs = Math.max(dt, Math.min(600, Date.now() - (meta.lastRealTimeMs || Date.now())));
          if (Date.now() - (meta.lastRealTimeMs || Date.now()) > 180000 && !document.hidden) { this.runCatchUp(this.sim, (rep) => this.ui.showWelcomeReport(rep)); }
          else { const n = this.sim.advance(owedMs, this.cfg.time.frameBudgetMs); const simMs = n * LW.TIME.TICK_MINUTES * 60000 / this.sim.minutesPerRealSecond; meta.lastRealTimeMs = Math.min(Date.now(), (meta.lastRealTimeMs || Date.now()) + Math.max(simMs, n ? 0 : dt)); }
        }"""),
]),
('tools/host.js', [
("""const rep = sim.catchUp(now, { sync: true });""",
 """const rep = sim.catchUp(now, { sync: true, budgetMs: 22 * 60 * 1000 }); // a gazda legfeljebb ~22 percet számol egy futásban"""),
]),
('src/ui/ui.js', [
("""      let m = $('#modal'); if (!m.querySelector('#cu-bar')) { const el = h('div'); el.appendChild(h('h1', null, 'Üdv újra, Teremtő', h('small', null, 'a világ nem várt rád'))); el.appendChild(h('p', { id: 'cu-label' }, label)); el.appendChild(h('div', { class: 'progress' }, h('div', { id: 'cu-bar' }))); this.modal(el); }""",
 """      let m = $('#modal'); if (!m.querySelector('#cu-bar')) { const el = h('div'); el.appendChild(h('h1', null, 'Üdv újra, Teremtő', h('small', null, 'a világ nem várt rád'))); el.appendChild(h('p', { id: 'cu-label' }, label)); el.appendChild(h('div', { class: 'progress' }, h('div', { id: 'cu-bar' }))); el.appendChild(h('p', { class: 'tiny' }, 'A gép a lemaradt időt számolja (legfeljebb ~2 percig). Ha nem akarsz várni: a kihagyott idő egyszerűen nem telik el a világban.')); el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => { this.sim._catchSkip = true; this.click(); } }, 'Kihagyom a többit'))); this.modal(el); }"""),
("""      el.appendChild(h('h1', null, 'Üdv újra, Teremtő', h('small', null, `${LW.Time.realSpan(rep.awayMs)} voltál távol · a világban ${LW.Time.span(rep.worldTicks)} telt el${rep.capped ? ' (korlátozva)' : ''}`)));""",
 """      el.appendChild(h('h1', null, 'Üdv újra, Teremtő', h('small', null, `${LW.Time.realSpan(rep.awayMs)} voltál távol · a világban ${LW.Time.span(rep.worldTicks)} telt el${rep.capped ? ' (korlátozva)' : ''}${rep.skippedTicks > 96 ? ` · ${LW.Time.span(rep.skippedTicks)} kimaradt (a gép nem bírta, vagy kihagytad)` : ''}`)));"""),
]),
]
