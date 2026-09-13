/* LEVENTE — THE CREATOR · sim/simulation.js — the tick loop, speed presets, frame budget, catch-up orchestration */
(function (LW) {
  'use strict';
  const T = LW.TIME;

  class Simulation {
    constructor(world) {
      this.world = world; this.paused = false; this.tickDebt = 0; this.preset = world.meta.speedPreset || world.cfg.time.defaultPreset;
      this.perf = { tickUs: 0, tickMaxUs: 0, ticksLastSec: 0, _acc: 0, _accT: 0, renderMs: 0 };
      this.errors = [];
      world.onError = (e, a, st) => { this.errors.push({ tick: world.tick, msg: String(e && e.stack || e), agent: a && a.id, op: st && st.op }); if (this.errors.length > 50) this.errors.shift(); if (typeof console !== 'undefined') console.error('[sim]', e, a && a.name, st); };
      if (!world.weather) world.weather = new LW.Weather(world);
      LW.Ecology.init(world);
      if (!world.history) new LW.History(world);
      world.ground = world.ground || new Map();
      world.rebuildBuckets();
    }

    /** Create a fresh world with its Genesis population. */
    static newWorld(seed, cfg, nowMs, opts = {}) {
      const world = LW.World.create(seed, cfg);
      world.tick = T.TICKS_PER_DAY * 100; // Genesis happens in early summer: the first ones get a warm season to learn
      world.meta = { seed: world.seed, name: world.name, createdMs: nowMs, lastRealTimeMs: nowMs, lastSimulatedTick: 0, speedPreset: opts.preset || cfg.time.defaultPreset, creatorName: opts.creatorName || 'Levente', started: true };
      const sim = new Simulation(world);
      LW.Agents.genesis(world, opts.population || cfg.genesis.population);
      // the first ones look around before anything else
      for (const a of world.agents.values()) LW.Perception.scan(world, a);
      return sim;
    }

    get minutesPerRealSecond() { return this.world.cfg.time.speedPresets[this.preset] || 60; }
    get ticksPerSecond() { return this.minutesPerRealSecond / T.TICK_MINUTES; }
    setPreset(p) { if (this.world.cfg.time.speedPresets[p]) { this.preset = p; this.world.meta.speedPreset = p; } }

    /** One world tick. */
    tick() {
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
          this.nightHazards(w, a);
        } catch (e) { w.onError(e, a, null); a.plan = null; }
      }
      LW.Buildings.step(w);
      if (w.tick % T.TICKS_PER_HOUR === 0) { const h = LW.Time.hour(w.tick); for (const a of w.agents.values()) if (a.id % 24 === h) LW.Memory.consolidate(w, a); }
      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); for (const [i, g] of w.ground) { LW.Agents.spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); } }
      if (w.tick % T.TICKS_PER_YEAR === 0) w.history.yearEnd();
      w.meta.lastSimulatedTick = w.tick;
      const dt = now() - t0; this.perf.tickUs = this.perf.tickUs * 0.98 + dt * 1000 * 0.02; if (dt * 1000 > this.perf.tickMaxUs) this.perf.tickMaxUs = dt * 1000; this.perf._acc++;
    }
    nightHazards(w, a) {
      if (!LW.Time.isNight(w.tick) || a.env?.inside || a.env?.fire) return;
      const i = w.idx(a.x | 0, a.y | 0); const d = w.tiles.danger[i]; if (d < 50) return;
      const group = w.agentsNear(a.x, a.y, 3, a.id).length; if (group >= 2 || w.buildingsNear(a.x | 0, a.y | 0, 3).length) return;
      if (w.rng.chance((d / 255) * 0.0004 / (1 + group))) { LW.Agents.damage(w, a, w.rng.range(0.15, 0.45), 'éjszakai ragadozó'); a.needs.safety = 0; LW.Agents.memory(w, a, { type: 'attack', text: 'a sötétben rám támadt egy vad', importance: 0.7, emotion: 'fear', intensity: 0.8 }); }
    }

    /** Run as many ticks as the real-time budget allows (called every frame). */
    advance(realDtMs, budgetMs) {
      if (this.paused) return 0;
      this.tickDebt += (realDtMs / 1000) * this.ticksPerSecond;
      const maxTicks = Math.min(Math.floor(this.tickDebt), 2000); if (maxTicks <= 0) return 0;
      const t0 = now(); let n = 0;
      while (n < maxTicks) { this.tick(); n++; if (now() - t0 > budgetMs) break; }
      this.tickDebt -= n; if (this.tickDebt > 20000) this.tickDebt = 20000; // debt beyond ~this is handled by a real catch-up
      this.perf._accT += realDtMs; if (this.perf._accT >= 1000) { this.perf.ticksLastSec = this.perf._acc; this.perf._acc = 0; this.perf._accT = 0; this.perf.tickMaxUs *= 0.5; }
      return n;
    }
    runTicks(n) { for (let k = 0; k < n; k++) this.tick(); }

    /** Catch-up after time away. Cooperative (chunked) so a UI can show progress. */
    catchUp(nowMs, cb) {
      const w = this.world, cfg = w.cfg.catchup; const meta = w.meta;
      const elapsedMs = Math.max(0, nowMs - (meta.lastRealTimeMs != null ? meta.lastRealTimeMs : nowMs));
      const owedMinutes = (elapsedMs / 1000) * this.minutesPerRealSecond;
      let owedTicks = Math.floor(owedMinutes / T.TICK_MINUTES);
      const capTicks = cfg.maxYears * T.TICKS_PER_YEAR; const capped = owedTicks > capTicks; if (capped) owedTicks = capTicks;
      const report = { awayMs: elapsedMs, owedTicks, capped, before: w.history.snapshotStats(), chronicleStart: w.history.chronicle.length, firstsStart: Object.keys(w.history.firsts).length, beliefBefore: LW.mean([...w.agents.values()].map((a) => a.beliefs.creator)) };
      if (owedTicks < 8) { meta.lastRealTimeMs = nowMs; report.after = w.history.snapshotStats(); report.skipped = true; if (cb && cb.done) cb.done(report); return report; }
      const detail = Math.min(owedTicks, cfg.detailWindowTicks);
      const macroDays = Math.floor((owedTicks - detail) / T.TICKS_PER_DAY);
      const detailTicks = owedTicks - macroDays * T.TICKS_PER_DAY;
      const total = macroDays * T.TICKS_PER_DAY + detailTicks; let doneTicks = 0; let dayI = 0;
      const startTick = w.tick;
      const schedule = (fn) => (typeof setTimeout === 'function' ? setTimeout(fn, 0) : fn());
      const finish = () => { meta.lastRealTimeMs = nowMs; report.after = w.history.snapshotStats(); report.chronicle = w.history.chronicle.slice(report.chronicleStart); report.firsts = Object.entries(w.history.firsts).filter(([, f]) => f.tick > startTick); report.beliefAfter = LW.mean([...w.agents.values()].map((a) => a.beliefs.creator)); report.worldTicks = w.tick - startTick; if (cb && cb.done) cb.done(report); };
      const stepMacro = () => {
        const n = Math.min(cfg.chunkDays, macroDays - dayI);
        for (let k = 0; k < n; k++) { LW.Macro.day(w); dayI++; doneTicks += T.TICKS_PER_DAY; }
        if (cb && cb.progress) cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);
        if (dayI < macroDays) schedule(stepMacro); else schedule(stepDetail);
      };
      let dt = 0;
      const stepDetail = () => {
        const n = Math.min(300, detailTicks - dt);
        for (let k = 0; k < n; k++) this.tick();
        dt += n; doneTicks += n;
        if (cb && cb.progress) cb.progress(doneTicks / total, `Simulating ${LW.Time.span(doneTicks)} of ${LW.Time.span(total)}…`);
        if (dt < detailTicks) schedule(stepDetail); else finish();
      };
      if (cb && cb.progress) cb.progress(0, 'A világ ébred…');
      if (cb && cb.sync) { while (dayI < macroDays) { LW.Macro.day(w); dayI++; } while (dt < detailTicks) { this.tick(); dt++; } finish(); return report; }
      schedule(macroDays > 0 ? stepMacro : stepDetail);
      return report;
    }

    summary() {
      const w = this.world; const known = LW.Tech.worldKnowledge(w); const largest = LW.Settlements.largest(w);
      return { name: w.name, year: w.year, tick: w.tick, population: w.population, deceased: w.deceased.size, techLevel: LW.Tech.techLevel(known), techs: known.size, settlements: [...w.settlements.values()].filter((s) => !s.abandonedTick).length, largest: largest ? `${largest.name} (${largest.tier}, ${largest.population})` : '—', buildings: w.buildings.size, births: w.stats.births, deaths: w.stats.deaths, discoveries: w.stats.discoveries, interventions: w.stats.interventions };
    }
  }
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  LW.Simulation = Simulation;
})(globalThis.LW || (globalThis.LW = {}));
