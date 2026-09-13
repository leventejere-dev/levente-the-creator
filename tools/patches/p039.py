PATCHES = [
# ---------------------------------------------------------------- a világ tágul
('src/world/world.js', [
("""    reindexBuildings() { this.btile = new Map(); for (const b of this.buildings.values()) for (const i of this.buildingTiles(b)) this.btile.set(i, b.id); }""",
 """    reindexBuildings() { this.btile = new Map(); for (const b of this.buildings.values()) for (const i of this.buildingTiles(b)) this.btile.set(i, b.id); }
    /** Új föld a tengeren túl: a térkép keletre vagy délre bővül egy külön generált sávval; minden mezőindex újraszámolva. */
    expand(side, size, explorerId) {
      const oldW = this.w, oldH = this.h; const east = side === 'east';
      const newW = east ? oldW + size : oldW, newH = east ? oldH : oldH + size;
      const bandCfg = { ...this.cfg.world, width: east ? size : oldW, height: east ? oldH : size };
      this.expansions = (this.expansions || 0) + 1;
      const band = LW.generateWorld((this.seed ^ Math.imul(0x9e3779b9, this.expansions + 1)) >>> 0, bandCfg);
      const nt = LW.makeTiles(newW, newH);
      for (const k in nt) { const src = this.tiles[k], bt = band.tiles[k]; if (!src || !bt) continue; for (let y = 0; y < oldH; y++) for (let x = 0; x < oldW; x++) nt[k][y * newW + x] = src[y * oldW + x]; if (east) { for (let y = 0; y < oldH; y++) for (let x = 0; x < size; x++) nt[k][y * newW + oldW + x] = bt[y * size + x]; } else { for (let y = 0; y < size; y++) for (let x = 0; x < oldW; x++) nt[k][(oldH + y) * newW + x] = bt[y * oldW + x]; } }
      const remap = (i) => (i == null || i < 0 ? i : ((i / oldW) | 0) * newW + (i % oldW));
      if (newW !== oldW) {
        const seen = new Set();
        for (const a of this.agents.values()) {
          const places = new Map(); for (const p of a.knowledge.places.values()) { p.i = remap(p.i); places.set(LW.Agents.poiKey(p.k, p.i), p); } a.knowledge.places = places;
          if (a.avoid) { const av = {}; for (const key in a.avoid) { const kind = Math.floor(key / 1048576), i = key % 1048576; av[kind * 1048576 + remap(i)] = a.avoid[key]; } a.avoid = av; }
          for (const s of a.memory.social.values()) s.lastTile = remap(s.lastTile);
          for (const m of a.memory.episodic) { if (seen.has(m)) continue; seen.add(m); if (m.tile != null) m.tile = remap(m.tile); }
          for (const m of a.memory.emotional) { if (seen.has(m)) continue; seen.add(m); if (m.tile != null) m.tile = remap(m.tile); }
          if (a.divineRequest && a.divineRequest.tile != null) a.divineRequest.tile = remap(a.divineRequest.tile);
          a.plan = null; a.lastDecisionTick = -1000;
        }
        this.burning = new Set([...this.burning].map(remap)); this.ground = new Map([...this.ground].map(([i, g]) => [remap(i), g]));
        if (this.pathAnnounced) this.pathAnnounced = new Set([...this.pathAnnounced].map(remap));
        if (this.fireStats && this.fireStats.origin >= 0) this.fireStats.origin = remap(this.fireStats.origin);
        if (this.weather && this.weather.lightningTile >= 0) this.weather.lightningTile = remap(this.weather.lightningTile);
        if (this.history) { for (const list of [this.history.feed, this.history.godFeed, this.history.chronicle, this.history.wow]) for (const e of list) if (e.tile != null) e.tile = remap(e.tile); for (const k in this.history.firsts) if (this.history.firsts[k].tile != null) this.history.firsts[k].tile = remap(this.history.firsts[k].tile); }
      }
      this.w = newW; this.h = newH; this.tiles = nt; this._initPathBuffers(); this.reindexBuildings(); this.rebuildBuckets(); this.dirtyTiles = new Set();
      const name = this.language.place();
      this.landmarks.push({ kind: 'land', name, x: east ? oldW + size / 2 : oldW / 2, y: east ? oldH / 2 : oldH + size / 2, tick: this.tick });
      this.events.emit('NewLand', { tick: this.tick, name, side, agentId: explorerId, w: newW, h: newH, tile: this.idx(east ? oldW + (size >> 1) : (oldW >> 1), east ? (oldH >> 1) : oldH + (size >> 1)) });
      return name;
    }"""),
]),
('src/persistence/persistence.js', [
("""        world: { w: w.w, h: w.h, tick: w.tick, seed: w.seed, name: w.name, genesis: w.genesis, shape: w.shape, climateMean: w.climateMean, windDir: w.windDir, tiles, nextIds: w.nextIds, stats: w.stats, burning: [...w.burning], fireStats: w.fireStats, ground: [...w.ground] },""",
 """        world: { w: w.w, h: w.h, tick: w.tick, seed: w.seed, name: w.name, genesis: w.genesis, shape: w.shape, climateMean: w.climateMean, windDir: w.windDir, tiles, nextIds: w.nextIds, stats: w.stats, burning: [...w.burning], fireStats: w.fireStats, ground: [...w.ground], expansions: w.expansions || 0, futureTechs: w.futureTechs || [], simVerdictTick: w.simVerdictTick || 0 },"""),
("""      w.nextIds = s.nextIds; w.stats = s.stats || w.stats; w.burning = new Set(s.burning || []); w.fireStats = s.fireStats; w.ground = new Map(s.ground || []);""",
 """      w.nextIds = s.nextIds; w.stats = s.stats || w.stats; w.burning = new Set(s.burning || []); w.fireStats = s.fireStats; w.ground = new Map(s.ground || []); w.expansions = s.expansions || 0; w.futureTechs = s.futureTechs || []; w.simVerdictTick = s.simVerdictTick || 0;
      if (LW.Tree && w.futureTechs.length) LW.Tree.registerFuture(w.futureTechs);"""),
("""    if (!a.vocab) a.vocab = {}; if (a.beliefs && a.beliefs.trust == null) a.beliefs.trust = 0; if (!a.chatHistory) a.chatHistory = [];""",
 """    if (!a.vocab) a.vocab = {}; if (a.beliefs && a.beliefs.trust == null) a.beliefs.trust = 0; if (!a.chatHistory) a.chatHistory = []; if (a.ill == null) a.ill = 0; if (a.beliefs && a.beliefs.simulation == null) a.beliefs.simulation = 0; if (!a.mind) a.mind = LW.Mind.fresh();"""),
]),
('src/agents/agent.js', [
("""        beliefs: { creator: 0, trust: 0, world: {} },""",
 """        beliefs: { creator: 0, trust: 0, simulation: 0, world: {} }, ill: 0, mind: LW.Mind.fresh(),"""),
("""{ a.injury = Math.min(0.8, a.injury + 0.3); a.emotions.stress += 0.2; this.memory(world, a, { type: 'illness', text: 'megbetegedtem', importance: 0.4, emotion: 'fear', intensity: 0.4 }); world.events.emit('AgentIll', { tick: world.tick, agentId: a.id }); }""",
 """{ a.injury = Math.min(0.8, a.injury + 0.3); a.emotions.stress += 0.2; a.ill = Math.max(a.ill || 0, rng.int(5, 14)); this.memory(world, a, { type: 'illness', text: 'megbetegedtem', importance: 0.4, emotion: 'fear', intensity: 0.4 }); world.events.emit('AgentIll', { tick: world.tick, agentId: a.id }); }
      LW.Mind.daily(world, a);"""),
]),
# ---------------------------------------------------------------- közösség: civilizáció + jövő + elme
('src/society/society.js', [
("""      this.leaders(w);
    },""",
 """      this.leaders(w);
      LW.Civilization.daily(w);
      if (LW.Tree.futureStep) LW.Tree.futureStep(w);
    },"""),
]),
('src/sim/simulation.js', [
("""      world.reindexBuildings();
      LW.Speech.init(world);""",
 """      world.reindexBuildings();
      LW.Speech.init(world);
      for (const a of world.agents.values()) { if (!a.mind) a.mind = LW.Mind.fresh(); if (a.ill == null) a.ill = 0; if (a.beliefs.simulation == null) a.beliefs.simulation = 0; }"""),
]),
('src/render/renderer.js', [
("""      if (this.follow) { const a = w.agents.get(this.follow); if (a) { this.cam.x += (a.x - this.cam.x) * 0.15; this.cam.y += (a.y - this.cam.y) * 0.15; } else this.follow = null; }""",
 """      if (this.terrain.width !== w.w * PX || this.terrain.height !== w.h * PX) { this.terrain.width = w.w * PX; this.terrain.height = w.h * PX; this.bakeAll(); } // a világ tágult
      if (this.follow) { const a = w.agents.get(this.follow); if (a) { this.cam.x += (a.x - this.cam.x) * 0.15; this.cam.y += (a.y - this.cam.y) * 0.15; } else this.follow = null; }"""),
]),
# ---------------------------------------------------------------- történelem és nevek
('src/history/history.js', [
("""        case 'WorldSimulated':""",
 """        case 'Epidemic': return { text: `Járvány tört ki ${ev.place ? ev.place + ' településen' : 'a vidéken'}: ${ev.n} beteg.`, base: 0.8, firstKey: 'epidemic', firstTitle: 'Az első járvány' };
        case 'EpidemicEnded': return { text: `A járvány elmúlt ${ev.place}ban ${ev.days} nap után (a csúcson ${ev.peak} beteg).`, base: 0.5 };
        case 'SimulationHypothesis': return { text: `${n(ev.agentId)} kimondta, amit senki nem mert: talán ők maguk is egy világban élnek, amelyet valaki figyel.`, base: 1.0, firstKey: 'simhyp', firstTitle: 'A szimulációs hipotézis' };
        case 'SimulationVerdict': return { text: ev.accepted ? `A többség (${Math.round(ev.share * 100)}%) elfogadja: ők is egy teremtett világban élnek — ahogy talán a Teremtőjük is.` : `A többség (${Math.round(ev.share * 100)}%) tagadja, hogy szimulációban élne. „Ez a világ valódi” — mondják.`, base: 1.0, firstKey: ev.accepted ? 'simyes' : 'simno', firstTitle: ev.accepted ? 'Elhitték' : 'Tagadták' };
        case 'StateFounded': return { text: `${ev.place} népe államot alapított: ${n(ev.agentId)} törvények szerint uralkodik.`, base: 0.85, firstKey: 'state', firstTitle: 'Az első állam' };
        case 'WarDeclared': return { text: `${ev.place} háborút indított ${ev.other} ellen — ${n(ev.agentId)} vezetésével.`, base: 1.0, firstKey: 'war', firstTitle: 'Az első háború' };
        case 'Battle': return { text: `Csata: ${ev.place} harcosai legyőzték ${ev.other} embereit.`, base: 0.5 };
        case 'WarEnded': return { text: ev.decisive ? `${ev.place} győzött: ${ev.other} behódolt.` : `${ev.place} és ${ev.other} háborúja elcsendesült — egyik sem győzött.`, base: 0.8, firstKey: 'peace', firstTitle: 'Az első béke' };
        case 'CompanyFounded': return { text: `${n(ev.agentId)} vállalatot alapított: ${ev.name}.`, base: 0.7, firstKey: 'company', firstTitle: 'Az első vállalat' };
        case 'NewLand': return { text: `${ev.agentId != null ? n(ev.agentId) + ' hajósai' : 'Hajósok'} új földet találtak a tengeren túl ${ev.side === 'east' ? 'keleten' : 'délen'}: ${ev.name}. A világ nagyobb lett (${ev.w}×${ev.h}).`, base: 1.2, firstKey: 'newland', firstTitle: 'Új föld a tengeren túl' };
        case 'FutureTech': return { text: `Olyan tudás született, amelyre a Teremtőnek sincs szava: ${ev.name}.`, base: 0.9, firstKey: 'future', firstTitle: 'Az ismeretlen jövő kezdete' };
        case 'WorldSimulated':"""),
]),
('src/core/hu.js', [
("""RecordWritten: 'Írás', Ritual: 'Szertartás', LeaderChosen: 'Vezető', WorldSimulated: 'Világmag', ItemCrafted: 'Készítés' },""",
 """RecordWritten: 'Írás', Ritual: 'Szertartás', LeaderChosen: 'Vezető', WorldSimulated: 'Világmag', ItemCrafted: 'Készítés', Epidemic: 'Járvány', EpidemicEnded: 'Járvány vége', SimulationHypothesis: 'Hipotézis', SimulationVerdict: 'Ítélet', StateFounded: 'Állam', WarDeclared: 'Háború', Battle: 'Csata', WarEnded: 'Béke', CompanyFounded: 'Vállalat', NewLand: 'Új föld', FutureTech: 'Ismeretlen' },"""),
]),
('src/manifest.json', [
("""    "agents/genetics.js",""", """    "agents/genetics.js",
    "agents/mind.js","""),
("""    "society/society.js",""", """    "society/society.js",
    "society/civilization.js","""),
]),
]
