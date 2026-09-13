/* LEVENTE — THE CREATOR · world/weather.js
 * Global Markov weather with local variation, wind, lightning, and Creator overrides.
 * (SIMULATION_MODEL.md §3)
 */
(function (LW) {
  'use strict';

  const STATES = ['clear', 'cloudy', 'overcast', 'rain', 'storm', 'fog'];
  const CLOUD = { clear: 0.05, cloudy: 0.4, overcast: 0.8, rain: 0.9, storm: 1.0, fog: 0.6 };
  // base transition weights (row: from, col: to) — modulated by humidity and season
  const TRANS = {
    clear:    { clear: 70, cloudy: 22, overcast: 3, rain: 1, storm: 0, fog: 4 },
    cloudy:   { clear: 30, cloudy: 45, overcast: 18, rain: 5, storm: 1, fog: 1 },
    overcast: { clear: 5, cloudy: 25, overcast: 40, rain: 24, storm: 5, fog: 1 },
    rain:     { clear: 3, cloudy: 12, overcast: 30, rain: 45, storm: 9, fog: 1 },
    storm:    { clear: 2, cloudy: 5, overcast: 25, rain: 40, storm: 28, fog: 0 },
    fog:      { clear: 35, cloudy: 35, overcast: 10, rain: 5, storm: 0, fog: 15 },
  };

  class Weather {
    constructor(world) {
      this.world = world;
      this.state = 'clear'; this.prevState = 'clear';
      this.intensity = 0; this.cloud = 0.05; this.humidity = 0.5;
      this.wind = { x: world.windDir || 1, y: 0.2, speed: 0.3 };
      this.tempOffset = 0;
      this.override = null; // { state, intensity, untilTick, cx, cy, r }
      this.noise = new LW.Noise((world.seed ^ 0x77777) >>> 0);
      this.lastLightning = -1;
      this.lightningTile = -1;
      this.sinceChange = 0;
    }

    step() {
      const w = this.world, tick = w.tick;
      if (this.override && tick >= this.override.untilTick) { this.override = null; }
      if (tick % (LW.TIME.TICKS_PER_HOUR * 3) === 0) this._hourly();
      // lightning during storms
      const eff = this.effectiveState();
      if (eff.state === 'storm' && w.rng.chance(w.cfg.weather.stormLightningPerTick * eff.intensity)) this._lightning();
    }

    _hourly() {
      const w = this.world, rng = w.rng, season = LW.Time.season(w.tick);
      const temp = w.climateMean + (season === 1 ? 10 : season === 3 ? -10 : 0);
      // humidity integrates evaporation and precipitation
      const evap = 0.012 * (0.5 + Math.max(0, temp) / 30) * (1 - this.cloud * 0.5);
      const precip = this.state === 'rain' ? 0.03 * this.intensity : this.state === 'storm' ? 0.05 * this.intensity : 0;
      this.humidity = LW.clamp01(this.humidity + evap - precip + rng.gauss(0, 0.01));
      // transition
      const row = TRANS[this.state]; const keys = STATES, weights = [];
      for (const k of keys) {
        let wgt = row[k];
        if (k === 'rain' || k === 'storm' || k === 'overcast') wgt *= 0.4 + this.humidity * 1.6;
        if (k === 'clear') wgt *= 1.6 - this.humidity;
        if (season === 3 && k === 'storm') wgt *= 0.6; if (season === 1 && k === 'storm') wgt *= 1.3;
        if (k === 'fog' && season !== 2 && season !== 0) wgt *= 0.5;
        if (k === this.state) wgt *= 3; // weather is sticky
        weights.push(Math.max(0.01, wgt));
      }
      const next = rng.weighted(keys, weights);
      if (next !== this.state) { this.prevState = this.state; this.state = next; this.sinceChange = 0; w.events.emit('WeatherChanged', { tick: w.tick, state: next, prev: this.prevState }); } else this.sinceChange++;
      this.intensity = this.state === 'rain' ? rng.range(0.3, 0.75) : this.state === 'storm' ? rng.range(0.7, 1.0) : this.state === 'fog' ? 0.1 : 0;
      this.cloud = LW.lerp(this.cloud, CLOUD[this.state], 0.5);
      // wind random walk; storms are windy
      const targetSpeed = this.state === 'storm' ? rng.range(0.7, 1) : this.state === 'clear' ? rng.range(0.05, 0.35) : rng.range(0.2, 0.6);
      this.wind.speed = LW.lerp(this.wind.speed, targetSpeed, 0.4);
      const ang = Math.atan2(this.wind.y, this.wind.x) + rng.gauss(0, 0.25); this.wind.x = Math.cos(ang); this.wind.y = Math.sin(ang);
      // temperature fronts
      const targetOff = this.state === 'storm' ? -3 : this.state === 'rain' ? -2 : this.state === 'clear' ? 1 : 0;
      this.tempOffset = LW.clamp(LW.lerp(this.tempOffset, targetOff + rng.gauss(0, 1.5), 0.2), -6, 6);
    }

    _lightning() {
      const w = this.world, t = w.tiles, rng = w.rng; let best = -1, bs = -1;
      for (let k = 0; k < 6; k++) { const i = rng.int(0, w.w * w.h - 1); if (w.isWater(i)) continue; const s = t.elev[i] + t.trees[i] / 400 + rng.f() * 0.1; if (s > bs) { bs = s; best = i; } }
      if (best < 0) return;
      this.lastLightning = w.tick; this.lightningTile = best;
      w.events.emit('Lightning', { tick: w.tick, tile: best });
      // ignition needs fuel and dryness; storms bring rain so this is uncommon
      if (t.trees[best] >= w.cfg.weather.wildfireIgnitionTreeMin && t.moist[best] < 200 && rng.chance(0.5)) LW.Ecology.ignite(w, best, 'lightning');
      // a being standing there may be struck
      for (const a of w.agentsNear(w.xOf(best), w.yOf(best), 0.6)) { if (rng.chance(0.6)) LW.Agents.damage(w, a, 0.9, 'lightning'); }
    }

    /** State/intensity taking Creator overrides into account (global part). */
    effectiveState() {
      if (this.override && this.override.r == null) return { state: this.override.state, intensity: this.override.intensity };
      return { state: this.state, intensity: this.intensity };
    }
    isPrecipitating() { const s = this.effectiveState().state; return s === 'rain' || s === 'storm'; }

    /** Local rain intensity 0..1 at a tile. */
    rainAt(i) {
      const w = this.world; const x = i % w.w, y = (i / w.w) | 0;
      let base = 0;
      const eff = this.effectiveState();
      if (eff.state === 'rain' || eff.state === 'storm') base = eff.intensity * (0.4 + 0.6 * this.noise.value(x * 0.08 + w.tick * 0.01, y * 0.08 + w.tick * 0.013));
      if (this.override && this.override.r != null) {
        const d = LW.dist(x, y, this.override.cx, this.override.cy);
        if (d <= this.override.r) { const s = this.override.state; const local = (s === 'rain' || s === 'storm') ? this.override.intensity : 0; base = Math.max(base, local); if (s === 'clear') base = 0; }
      }
      return base;
    }

    /** Creator override. r == null → global. hours default from config. */
    setOverride(state, intensity, hours, cx, cy, r) {
      const w = this.world;
      this.override = { state, intensity, untilTick: w.tick + Math.round((hours || w.cfg.weather.overrideDefaultHours) * LW.TIME.TICKS_PER_HOUR), cx, cy, r };
      if (r == null) { this.prevState = this.state; this.state = state; this.intensity = intensity; this.cloud = CLOUD[state]; w.events.emit('WeatherChanged', { tick: w.tick, state, prev: this.prevState, creator: true }); }
    }

    describe(tempC) {
      const eff = this.effectiveState();
      if ((eff.state === 'rain' || eff.state === 'storm') && tempC < 0.5) return eff.state === 'storm' ? 'Blizzard' : 'Snow';
      return { clear: 'Clear', cloudy: 'Cloudy', overcast: 'Overcast', rain: 'Rain', storm: 'Storm', fog: 'Fog' }[eff.state];
    }

    toJSON() { return { state: this.state, prevState: this.prevState, intensity: this.intensity, cloud: this.cloud, humidity: this.humidity, wind: this.wind, tempOffset: this.tempOffset, override: this.override, sinceChange: this.sinceChange }; }
    static fromJSON(world, j) { const wx = new Weather(world); Object.assign(wx, j); return wx; }
  }

  LW.Weather = Weather;
  LW.WEATHER_STATES = STATES;
})(globalThis.LW || (globalThis.LW = {}));
