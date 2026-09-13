/* LEVENTE — THE CREATOR · core/util.js — small pure helpers + event bus + time helpers */
(function (LW) {
  'use strict';

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  const smoothstep = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const mean = (arr) => (arr.length ? sum(arr) / arr.length : 0);
  const fmt = (v, d = 2) => (typeof v === 'number' ? v.toFixed(d) : String(v));
  const pct = (v) => Math.round(v * 100) + '%';

  /** Typed event bus. Handlers are called synchronously on emit; `flush` is a no-op hook kept for batching later. */
  class EventBus {
    constructor() { this.handlers = new Map(); this.any = []; }
    on(type, fn) { if (!this.handlers.has(type)) this.handlers.set(type, []); this.handlers.get(type).push(fn); return () => this.off(type, fn); }
    off(type, fn) { const l = this.handlers.get(type); if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
    onAny(fn) { this.any.push(fn); return () => { const i = this.any.indexOf(fn); if (i >= 0) this.any.splice(i, 1); }; }
    emit(type, payload) {
      const ev = payload || {}; ev.type = type;
      const l = this.handlers.get(type);
      if (l) for (let i = 0; i < l.length; i++) l[i](ev);
      for (let i = 0; i < this.any.length; i++) this.any[i](ev);
      return ev;
    }
  }

  const T = LW.TIME;
  /** Derived calendar values from a tick. */
  const Time = {
    hour: (tick) => Math.floor((tick % T.TICKS_PER_DAY) / T.TICKS_PER_HOUR),
    minute: (tick) => (tick % T.TICKS_PER_HOUR) * T.TICK_MINUTES,
    dayOfYear: (tick) => Math.floor(tick / T.TICKS_PER_DAY) % T.DAYS_PER_YEAR,
    day: (tick) => Math.floor(tick / T.TICKS_PER_DAY),
    year: (tick) => Math.floor(tick / T.TICKS_PER_YEAR),
    season: (tick) => Math.floor(Time.dayOfYear(tick) / T.SEASON_DAYS), // 0 spring 1 summer 2 autumn 3 winter
    seasonName: (tick) => ['Tavasz', 'Nyár', 'Ősz', 'Tél'][Time.season(tick)],
    month: (tick) => Math.floor(Time.dayOfYear(tick) / T.DAYS_PER_MONTH),
    dayOfMonth: (tick) => (Time.dayOfYear(tick) % T.DAYS_PER_MONTH) + 1,
    /** 0..1 fraction through the year */
    yearFrac: (tick) => (tick % T.TICKS_PER_YEAR) / T.TICKS_PER_YEAR,
    ageYears: (bornTick, tick) => (tick - bornTick) / T.TICKS_PER_YEAR,
    /** daylight: returns [sunrise hour, sunset hour] for a day of year (temperate) */
    daylight: (tick) => {
      const f = Time.yearFrac(tick); // 0 spring equinox
      const s = Math.sin(f * Math.PI * 2); // +1 midsummer (~day 90), -1 midwinter
      return [6.5 - 1.5 * s, 18.5 + 1.8 * s];
    },
    isNight: (tick) => { const h = Time.hour(tick) + Time.minute(tick) / 60; const [a, b] = Time.daylight(tick); return h < a || h >= b; },
    /** 0 at night → 1 at full day, smooth */
    dayFactor: (tick) => {
      const h = Time.hour(tick) + Time.minute(tick) / 60; const [a, b] = Time.daylight(tick);
      if (h < a - 1 || h > b + 1) return 0;
      if (h < a + 0.75) return smoothstep(a - 1, a + 0.75, h);
      if (h > b - 0.75) return 1 - smoothstep(b - 0.75, b + 1, h);
      return 1;
    },
    stamp: (tick) => { const y = Time.year(tick), d = Time.dayOfYear(tick) + 1, h = Time.hour(tick), m = Time.minute(tick); return `${y}. év ${d}. nap ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },
    clock: (tick) => `${String(Time.hour(tick)).padStart(2, '0')}:${String(Time.minute(tick)).padStart(2, '0')}`,
    /** human friendly duration of ticks */
    span: (ticks) => {
      const days = ticks / T.TICKS_PER_DAY;
      if (days < 1) return `${Math.round(ticks / T.TICKS_PER_HOUR)} óra`;
      if (days < 60) return `${Math.round(days)} nap`;
      const years = days / T.DAYS_PER_YEAR;
      if (years < 2) return `${Math.round(days / 30)} hónap`;
      return `${years.toFixed(years < 10 ? 1 : 0)} év`;
    },
    realSpan: (ms) => {
      const s = Math.floor(ms / 1000); if (s < 60) return `${s} mp`;
      const m = Math.floor(s / 60); if (m < 60) return `${m} perc`;
      const h = Math.floor(m / 60); if (h < 48) return `${h} óra ${m % 60} perc`;
      const d = Math.floor(h / 24); return `${d} nap ${h % 24} óra`;
    },
  };

  LW.clamp = clamp; LW.clamp01 = clamp01; LW.lerp = lerp; LW.dist = dist; LW.dist2 = dist2; LW.smoothstep = smoothstep;
  LW.sum = sum; LW.mean = mean; LW.fmt = fmt; LW.pct = pct;
  LW.EventBus = EventBus;
  LW.Time = Time;
})(globalThis.LW || (globalThis.LW = {}));
