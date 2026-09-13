/* LEVENTE — THE CREATOR · headless.js — run worlds without a renderer (balancing, story metrics, tests) */
(function (LW) {
  'use strict';
  const T = LW.TIME;

  /**
   * opts: { seed, years, mode: 'detail'|'macro'|'mixed', population, log(fn), checkInvariants: bool, onYear(fn) }
   * mixed = detailed for the first `detailYears` (default 2) then macro.
   */
  LW.runHeadless = function (opts = {}) {
    const seed = opts.seed ?? 12345, years = opts.years ?? 10, mode = opts.mode || 'detail';
    const cfg = JSON.parse(JSON.stringify(LW.CONFIG)); if (opts.cfg) for (const k in opts.cfg) Object.assign(cfg[k], opts.cfg[k]);
    const sim = LW.Simulation.newWorld(seed, cfg, 0, { population: opts.population });
    const w = sim.world; const log = opts.log || (() => {});
    const metrics = { seed, mode, years, timeline: [], firsts: {}, eventsByClass: {}, stagnation: 0, longestQuiet: 0, errors: 0 };
    let lastEventTick = 0;
    w.events.onAny((ev) => { const cls = ev.type; metrics.eventsByClass[cls] = (metrics.eventsByClass[cls] || 0) + 1; });
    w.onHistory = (e) => { if (e.importance >= 0.3) { const gap = e.tick - lastEventTick; if (gap > metrics.longestQuiet) metrics.longestQuiet = gap; lastEventTick = e.tick; } };
    const t0 = Date.now(); const detailYears = opts.detailYears ?? 2;
    const invariants = opts.checkInvariants !== false && LW.Invariants ? LW.Invariants : null; const failures = [];
    for (let y = 0; y < years; y++) {
      const useDetail = mode === 'detail' || (mode === 'mixed' && y < detailYears);
      if (useDetail) { for (let d = 0; d < T.DAYS_PER_YEAR; d++) { sim.runTicks(T.TICKS_PER_DAY); if (w.population === 0 && opts.stopOnExtinction !== false) break; } }
      else { for (let d = 0; d < T.DAYS_PER_YEAR; d++) { LW.Macro.day(w); if (w.population === 0 && opts.stopOnExtinction !== false) break; } }
      const s = sim.summary(); metrics.timeline.push({ year: w.year, pop: s.population, techs: s.techs, level: s.techLevel, settlements: s.settlements, buildings: s.buildings });
      if (invariants) { const res = invariants.check(w); if (res.length) { failures.push({ year: w.year, res }); metrics.errors += res.length; } }
      log(`Y${w.year} pop ${s.population} techs ${s.techs} (${s.techLevel}) settlements ${s.settlements} buildings ${s.buildings} births ${s.births} deaths ${s.deaths}`);
      if (opts.onYear) opts.onYear(sim, y);
      if (w.population === 0 && opts.stopOnExtinction !== false) { log('EXTINCTION at year ' + w.year); break; }
    }
    metrics.ms = Date.now() - t0; metrics.summary = sim.summary();
    for (const k in w.history.firsts) metrics.firsts[k] = { year: LW.Time.year(w.history.firsts[k].tick), title: w.history.firsts[k].title };
    metrics.chronicle = w.history.chronicle.map((e) => `Y${e.year} ${e.first ? '★ ' : ''}${e.text}`);
    metrics.invariantFailures = failures; metrics.simErrors = sim.errors;
    return { sim, metrics };
  };

  /** Multi-seed survival & story-quality report. */
  LW.balanceReport = function (opts = {}) {
    const seeds = opts.seeds || [1, 2, 3, 4, 5, 6, 7, 8]; const years = opts.years || 30; const out = [];
    for (const seed of seeds) { const { metrics } = LW.runHeadless({ seed, years, mode: opts.mode || 'mixed', detailYears: opts.detailYears ?? 2, checkInvariants: true, log: () => {} }); out.push({ seed, pop: metrics.summary.population, techs: metrics.summary.techs, level: metrics.summary.techLevel, settlements: metrics.summary.settlements, firsts: Object.keys(metrics.firsts).length, fire: metrics.firsts['tech:fire_making']?.year ?? '-', shelter: metrics.firsts['building:lean_to']?.year ?? '-', child: metrics.firsts['born']?.year ?? '-', camp: metrics.firsts['settlement']?.year ?? '-', errors: metrics.errors + metrics.simErrors.length, ms: metrics.ms }); }
    return out;
  };
})(globalThis.LW || (globalThis.LW = {}));
