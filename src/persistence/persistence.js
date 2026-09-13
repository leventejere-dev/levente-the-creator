/* LEVENTE — THE CREATOR · persistence/persistence.js — serialize / restore whole worlds (PERSISTENCE.md §2) */
(function (LW) {
  'use strict';
  const SAVE_VERSION = 1;

  function b64encode(u8) {
    if (typeof Buffer !== 'undefined' && Buffer.from) return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
    let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s);
  }
  function b64decode(str) {
    if (typeof Buffer !== 'undefined' && Buffer.from) { const b = Buffer.from(str, 'base64'); return new Uint8Array(b.buffer, b.byteOffset, b.byteLength); }
    const s = atob(str); const u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return u8;
  }
  const encArr = (arr) => ({ t: arr.constructor.name, d: b64encode(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)) });
  const decArr = (o) => { const u8 = b64decode(o.d); const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength); return o.t === 'Float32Array' ? new Float32Array(buf) : o.t === 'Uint16Array' ? new Uint16Array(buf) : new Uint8Array(buf); };

  const TRANSIENT = new Set(['plan', 'why', 'env', 'threat', 'engagedWith', 'lastSaid']);
  function serializeAgent(a, tick) {
    const o = {};
    for (const k in a) { if (TRANSIENT.has(k) || k[0] === '_') continue; o[k] = a[k]; }
    o.knowledge = { techs: [...a.knowledge.techs], places: [...a.knowledge.places.values()], progress: a.knowledge.progress };
    // csak a számottevő kapcsolatok maradnak a mentésben (nagy népességnél a többi négyzetesen nőne)
    const keep = (r) => r.status !== 'stranger' || r.familiarity >= 0.15 || r.friendship >= 0.1 || r.romance > 0 || r.resentment >= 0.1 || (r.fear || 0) >= 0.2 || (r.trust || 0) >= 0.2 || r.attraction >= 0.5;
    let rels = [...a.relationships].filter(([, r]) => keep(r));
    if (rels.length > 120) { rels.sort((x, y) => (y[1].familiarity + y[1].friendship + y[1].romance + y[1].resentment) - (x[1].familiarity + x[1].friendship + x[1].romance + x[1].resentment)); rels = rels.slice(0, 120); }
    const kept = new Set(rels.map(([id]) => id));
    o.memory = { episodic: a.memory.episodic, emotional: a.memory.emotional, social: [...a.memory.social].filter(([id, s]) => kept.has(id) || (s.lastSeen >= 0 && tick - s.lastSeen < 96 * 30)).slice(0, 160) };
    o.relationships = rels;
    if (a.pregnancy) o.pregnancy = { by: a.pregnancy.by, since: a.pregnancy.since, fatherGenes: a.pregnancy.fatherGenes };
    return o;
  }
  function restoreAgent(o) {
    const a = { ...o };
    a.knowledge = { techs: new Set(o.knowledge.techs), places: new Map(o.knowledge.places.map((p) => [LW.Agents.poiKey(p.k, p.i), p])), progress: o.knowledge.progress || {} };
    a.memory = { episodic: o.memory.episodic || [], emotional: o.memory.emotional || [], social: new Map(o.memory.social || []) };
    a.relationships = new Map(o.relationships || []);
    a.plan = null; a.why = null; a.env = null; a.threat = null; if (a.engagedUntil == null) a.engagedUntil = 0; if (a.lastDecisionTick == null) a.lastDecisionTick = -1000;
    if (!a.palette) a.palette = LW.Genetics.palette(a.genes.appearance);
    if (!a.vocab) a.vocab = {}; if (a.beliefs && a.beliefs.trust == null) a.beliefs.trust = 0; if (!a.chatHistory) a.chatHistory = []; if (a.ill == null) a.ill = 0; if (a.beliefs && a.beliefs.simulation == null) a.beliefs.simulation = 0; if (!a.mind) a.mind = LW.Mind.fresh();
    return a;
  }

  const Persistence = {
    SAVE_VERSION,
    serialize(sim) {
      const w = sim.world; const tiles = {}; for (const k in w.tiles) tiles[k] = encArr(w.tiles[k]);
      return {
        v: SAVE_VERSION, engineVersion: LW.ENGINE_VERSION, savedMs: w.meta.lastRealTimeMs,
        meta: w.meta, cfg: w.cfg, rng: w.rng.getState(),
        world: { w: w.w, h: w.h, tick: w.tick, seed: w.seed, name: w.name, genesis: w.genesis, shape: w.shape, climateMean: w.climateMean, windDir: w.windDir, tiles, nextIds: w.nextIds, stats: w.stats, burning: [...w.burning], fireStats: w.fireStats, ground: [...w.ground], expansions: w.expansions || 0, futureTechs: w.futureTechs || [], simVerdictTick: w.simVerdictTick || 0, simKnownTick: w.simKnownTick || 0 },
        weather: w.weather.toJSON(), language: w.language.toJSON(),
        agents: [...w.agents.values()].map((a) => serializeAgent(a, w.tick)), deceased: [...w.deceased.values()],
        buildings: [...w.buildings.values()], settlements: [...w.settlements.values()], landmarks: w.landmarks,
        history: w.history.toJSON(), speech: LW.Speech.toJSON(w),
      };
    },
    restore(state) {
      state = this.migrate(state);
      const w = new LW.World();
      const s = state.world;
      w.seed = s.seed; w.cfg = mergeCfg(LW.CONFIG, state.cfg); w.rng = new LW.Rng(w.seed); w.rng.setState(state.rng);
      w.w = s.w; w.h = s.h; w.tick = s.tick; w.name = s.name; w.genesis = s.genesis; w.shape = s.shape; w.climateMean = s.climateMean; w.windDir = s.windDir;
      w.tiles = LW.makeTiles(w.w, w.h); for (const k in w.tiles) if (s.tiles[k]) w.tiles[k] = decArr(s.tiles[k]);
      w.nextIds = s.nextIds; w.stats = s.stats || w.stats; w.burning = new Set(s.burning || []); w.fireStats = s.fireStats; w.ground = new Map(s.ground || []); w.expansions = s.expansions || 0; w.futureTechs = s.futureTechs || []; w.simVerdictTick = s.simVerdictTick || 0; w.simKnownTick = s.simKnownTick || 0;
      if (LW.Tree && w.futureTechs.length) LW.Tree.registerFuture(w.futureTechs);
      w._initPathBuffers();
      w.meta = state.meta; w.language = LW.Language.fromJSON(state.language);
      w.weather = LW.Weather.fromJSON(w, state.weather);
      for (const o of state.agents) w.agents.set(o.id, restoreAgent(o));
      for (const d of state.deceased) w.deceased.set(d.id, d);
      for (const b of state.buildings) w.buildings.set(b.id, b);
      for (const st of state.settlements) w.settlements.set(st.id, st);
      w.landmarks = state.landmarks || [];
      LW.History.fromJSON(w, state.history);
      LW.Speech.fromJSON(w, state.speech);
      const sim = new LW.Simulation(w);
      sim.setPreset(state.meta.speedPreset || w.cfg.time.defaultPreset);
      return sim;
    },
    migrate(state) { if (!state || typeof state.v !== 'number') throw new Error('Not a world save'); return state; },
    toJSON(sim) { return JSON.stringify(this.serialize(sim), (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10000) / 10000 : v)); },
    fromJSON(str) { return this.restore(JSON.parse(str)); },
  };
  function mergeCfg(base, over) { if (!over) return JSON.parse(JSON.stringify(base)); const out = JSON.parse(JSON.stringify(base)); for (const k in over) { if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && out[k] && typeof out[k] === 'object') Object.assign(out[k], over[k]); else out[k] = over[k]; } return out; }
  LW.Persistence = Persistence;
})(globalThis.LW || (globalThis.LW = {}));
