/* LEVENTE — THE CREATOR · tests/invariants.js — automated simulation invariants (ROADMAP.md §4) */
(function (LW) {
  'use strict';

  const Invariants = {
    /** Returns an array of failure strings (empty = all good). */
    check(w) {
      const f = [];
      const ids = new Set();
      for (const a of w.agents.values()) {
        if (ids.has(a.id)) f.push(`duplicate agent id ${a.id}`); ids.add(a.id);
        if (w.deceased.has(a.id)) f.push(`agent ${a.id} both alive and deceased`);
        if (!(a.health >= 0 && a.health <= 1)) f.push(`agent ${a.id} health out of range ${a.health}`);
        for (const k in a.needs) if (!(a.needs[k] >= 0 && a.needs[k] <= 1.0001)) f.push(`agent ${a.id} need ${k}=${a.needs[k]}`);
        for (const k in a.emotions) if (!(a.emotions[k] >= 0 && a.emotions[k] <= 1.0001)) f.push(`agent ${a.id} emotion ${k}=${a.emotions[k]}`);
        for (const k in a.inv) if (!(a.inv[k] >= 0) || !Number.isFinite(a.inv[k])) f.push(`agent ${a.id} inventory ${k}=${a.inv[k]}`);
        if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !w.inBounds(a.x | 0, a.y | 0)) f.push(`agent ${a.id} position invalid`);
        for (const p of a.parents) if (p != null && !w.agents.has(p) && !w.deceased.has(p)) f.push(`agent ${a.id} parent ${p} unknown`);
        if (a.parents.includes(a.id)) f.push(`agent ${a.id} is its own parent`);
        for (const p of a.parents) { const rec = p != null ? (w.agents.get(p) || w.deceased.get(p)) : null; if (rec && rec.bornTick >= a.bornTick) f.push(`agent ${a.id} born before parent ${p}`); }
        if (a.home != null) { const b = w.buildings.get(a.home); if (!b) f.push(`agent ${a.id} home ${a.home} missing`); else if (!b.residents.includes(a.id)) f.push(`agent ${a.id} not resident of home`); }
        if (a.partner != null) { const p = w.agents.get(a.partner); if (p && p.partner !== a.id) f.push(`partner asymmetry ${a.id}↔${a.partner}`); }
        for (const t of a.knowledge.techs) { const d = LW.Tech.D[t]; if (!d) { f.push(`unknown tech ${t}`); continue; } }
        if (a.plan && a.plan.target != null && !w.agents.has(a.plan.target) && !a.plan.done) f.push(`agent ${a.id} plan targets dead agent`);
      }
      for (const b of w.buildings.values()) { if (!w.inBounds(b.x, b.y)) f.push(`building ${b.id} off map`); for (const r of b.residents) if (!w.agents.has(r)) f.push(`building ${b.id} has dead resident ${r}`); if (!(b.progress >= 0 && b.progress <= 1)) f.push(`building ${b.id} progress ${b.progress}`); }
      for (const d of w.deceased.values()) { if (w.agents.has(d.id)) f.push(`deceased ${d.id} still alive`); }
      if (!Number.isFinite(w.population)) f.push('population not numeric');
      const t = w.tiles; for (const k of ['veg', 'trees', 'animals', 'fish', 'stone']) { for (let i = 0; i < t[k].length; i += 97) if (t[k][i] > 255) f.push(`tile ${k} overflow`); }
      for (const i of w.burning) if (!t.fire[i]) f.push(`burning set has cold tile ${i}`);
      return f;
    },
    /** Save → load → save round trip must be identical. */
    roundTrip(sim) {
      const j1 = LW.Persistence.toJSON(sim); const sim2 = LW.Persistence.fromJSON(j1); const j2 = LW.Persistence.toJSON(sim2);
      return { ok: j1 === j2, size: j1.length, sim2 };
    },
    /** Same seed twice must produce identical worlds after N ticks. */
    determinism(seed, ticks) {
      const a = LW.Simulation.newWorld(seed, JSON.parse(JSON.stringify(LW.CONFIG)), 0); a.runTicks(ticks);
      const b = LW.Simulation.newWorld(seed, JSON.parse(JSON.stringify(LW.CONFIG)), 0); b.runTicks(ticks);
      const ja = JSON.stringify(LW.Persistence.serialize(a)), jb = JSON.stringify(LW.Persistence.serialize(b));
      return { ok: ja === jb, ticks };
    },
    /** Full suite. Returns {passed, failed, results[]} */
    suite(log = () => {}) {
      const results = []; const push = (name, ok, info) => { results.push({ name, ok, info }); log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); };
      try {
        const { sim, metrics } = LW.runHeadless({ seed: 777, years: 3, mode: 'detail', checkInvariants: true, log: () => {} });
        push('3 detailed years without exception', metrics.simErrors.length === 0, metrics.simErrors.length ? metrics.simErrors[0].msg.slice(0, 200) : '');
        push('invariants hold during detailed run', metrics.errors === 0, metrics.invariantFailures.length ? JSON.stringify(metrics.invariantFailures[0].res.slice(0, 3)) : '');
        const rt = this.roundTrip(sim); push('save → load → save identical', rt.ok, `${(rt.size / 1024).toFixed(0)} KB`);
        rt.sim2.runTicks(200); push('restored world keeps running', rt.sim2.errors.length === 0 && this.check(rt.sim2.world).length === 0);
        const m2 = LW.runHeadless({ seed: 777, years: 40, mode: 'macro', checkInvariants: true, log: () => {} }).metrics;
        push('40 macro years without exception', m2.simErrors.length === 0, m2.simErrors.length ? m2.simErrors[0].msg.slice(0, 200) : '');
        push('invariants hold during macro run', m2.errors === 0, m2.invariantFailures.length ? JSON.stringify(m2.invariantFailures[0].res.slice(0, 3)) : '');
        const det = this.determinism(4242, 3000); push('same seed → identical world', det.ok);
        // tech prerequisites respected
        let prereqOk = true; for (const a of sim.world.agents.values()) for (const tId of a.knowledge.techs) { const d = LW.Tech.D[tId]; if (d.prereq) for (const p of d.prereq) if (!a.knowledge.techs.has(p) && !d.hidden) prereqOk = false; }
        push('technology prerequisites respected', prereqOk);
        // catch-up consistency: N days of catch-up advance the tick count exactly
        const s3 = LW.Simulation.newWorld(99, JSON.parse(JSON.stringify(LW.CONFIG)), 0); s3.world.meta.lastRealTimeMs = 0; const r = s3.catchUp(5 * 3600 * 1000, { sync: true }); push('catch-up advances the exact owed ticks', r.worldTicks === r.owedTicks, `${r.worldTicks} ticks (${LW.Time.span(r.worldTicks)})`);
      } catch (e) { push('suite crashed', false, String(e && e.stack || e)); }
      return { passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
    },
  };
  LW.Invariants = Invariants;
})(globalThis.LW || (globalThis.LW = {}));
