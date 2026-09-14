/* LEVENTE — THE CREATOR · engine bundle · built 2026-09-14 13:05 */

/* ===== core/rng.js ===== */
/* LEVENTE — THE CREATOR · core/rng.js
 * Seeded randomness and noise. Every random decision in the engine flows through
 * an instance of Rng so worlds are reproducible from (seed, inputs).
 */
(function (LW) {
  'use strict';

  /** 32-bit string/number hash (xmur3) used to derive seeds. */
  function hash32(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  /** sfc32 PRNG — fast, good quality, 128-bit state that can be saved/restored. */
  class Rng {
    constructor(seed) {
      const s = typeof seed === 'string' ? hash32(seed) : (seed >>> 0);
      this.a = s ^ 0x9E3779B9; this.b = (s * 0x85EBCA6B) >>> 0; this.c = (s ^ 0xC2B2AE35) >>> 0; this.d = 1;
      for (let i = 0; i < 12; i++) this.next(); // warm up
    }
    next() {
      const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
      this.d = (this.d + 1) >>> 0;
      this.a = this.b ^ (this.b >>> 9);
      this.b = (this.c + (this.c << 3)) >>> 0;
      this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
      this.c = (this.c + t) >>> 0;
      return (t >>> 0) / 4294967296;
    }
    /** float in [0, 1) */
    f() { return this.next(); }
    /** float in [lo, hi) */
    range(lo, hi) { return lo + (hi - lo) * this.next(); }
    /** integer in [lo, hi] inclusive */
    int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    /** weighted pick: items array, weights array */
    weighted(items, weights) {
      let sum = 0; for (let i = 0; i < weights.length; i++) sum += weights[i];
      let r = this.next() * sum;
      for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
      return items[items.length - 1];
    }
    /** gaussian via Box-Muller */
    gauss(mean = 0, sd = 1) {
      let u = 0, v = 0;
      while (u === 0) u = this.next();
      while (v === 0) v = this.next();
      return mean + sd * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    }
    getState() { return [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0]; }
    setState(s) { this.a = s[0] >>> 0; this.b = s[1] >>> 0; this.c = s[2] >>> 0; this.d = s[3] >>> 0; }
    /** derive an independent child generator (for world-gen sub-steps) */
    fork(label) { return new Rng((hash32(label) ^ this.int(0, 0x7fffffff)) >>> 0); }
  }

  /** Deterministic 2D value noise with fBm and domain warp. Independent from Rng stream. */
  class Noise {
    constructor(seed) {
      const r = new Rng(seed);
      this.perm = new Uint8Array(512);
      const p = [];
      for (let i = 0; i < 256; i++) p.push(i);
      r.shuffle(p);
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
      this.grad = new Float32Array(512);
      for (let i = 0; i < 512; i++) this.grad[i] = r.f();
    }
    _v(ix, iy) { return this.grad[(this.perm[(ix & 255) + this.perm[iy & 255]]) ]; }
    /** smooth value noise in [0,1] */
    value(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = this._v(ix, iy), b = this._v(ix + 1, iy), c = this._v(ix, iy + 1), d = this._v(ix + 1, iy + 1);
      return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    }
    /** fractal Brownian motion in [0,1] */
    fbm(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
      let sum = 0, amp = 1, norm = 0, fx = x, fy = y;
      for (let i = 0; i < octaves; i++) {
        sum += this.value(fx, fy) * amp; norm += amp;
        amp *= gain; fx *= lacunarity; fy *= lacunarity;
      }
      return sum / norm;
    }
    /** ridged multifractal in [0,1] — mountain chains */
    ridged(x, y, octaves = 4) {
      let sum = 0, amp = 0.5, fx = x, fy = y, norm = 0;
      for (let i = 0; i < octaves; i++) {
        const n = 1 - Math.abs(this.value(fx, fy) * 2 - 1);
        sum += n * n * amp; norm += amp; amp *= 0.5; fx *= 2.1; fy *= 2.1;
      }
      return sum / norm;
    }
  }

  LW.hash32 = hash32;
  LW.Rng = Rng;
  LW.Noise = Noise;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== core/config.js ===== */
/* LEVENTE — THE CREATOR · core/config.js
 * Every tunable parameter of the simulation lives here (spec §24 / ROADMAP §5).
 */
(function (LW) {
  'use strict';

  LW.ENGINE_VERSION = '0.1.0';

  const TIME = {
    TICK_MINUTES: 15,
    TICKS_PER_HOUR: 4,
    TICKS_PER_DAY: 96,
    DAYS_PER_MONTH: 30,
    MONTHS_PER_YEAR: 12,
    DAYS_PER_YEAR: 360,
    TICKS_PER_YEAR: 96 * 360,
    SEASON_DAYS: 90,
  };

  const CONFIG = {
    world: { width: 128, height: 128, seaLevel: 0.38, riverDensity: 1 / 1400, depositDensity: 1 / 700 },
    time: {
      speedPresets: { slow: 15, normal: 60, fast: 240, ultra: 1440, hyper: 7200 }, // world minutes per real second
      defaultPreset: 'normal',
      frameBudgetMs: 12,
    },
    genesis: { population: 3, minAdultAge: 17, maxAdultAge: 26 },
    agents: {
      decisionInterval: 8,
      perceptionRadius: 6,
      noiseSigma: 0.05,
      memoryCap: 80,
      emotionalCap: 12,
      poiCap: 200,
      carryCapacity: 12,
      needDrainPerDay: { food: 0.75, water: 0.8, energy: 1.2, social: 0.45, affection: 0.12, curiosity: 0.2 },
      starvationHealthPerDay: 0.06,
      dehydrationHealthPerDay: 0.2,
      hypothermiaHealthPerDay: 0.08,
      adultAge: 16,
      childAge: 3,
      adolescentAge: 12,
      longevityRange: [40, 62],
      gestationDays: 270,
      fertilityBase: 0.07,
      infantMortality: 0.05,
      baseSpeed: 2.0, // tiles per tick (a tile is ~25 m; 2 tiles per 15-minute tick is a slow forager's pace)
    },
    social: {
      conversationTransferBase: 0.25,
      flirtBase: 0.3,
      datingThreshold: 0.5,
      partnerThreshold: 0.9,
      breakupResentment: 0.3,
    },
    tech: { experimentBase: 0.05, accidentMultiplier: 1.0, hintProgress: 0.12, forgetPerYearElder: 0.02 },
    ecology: { vegRegrowth: 0.08, treeRegrowth: 0.004, animalRegrowth: 0.03, fishRegrowth: 0.06, fireSpread: 0.05 },
    weather: { stormLightningPerTick: 0.02, wildfireIgnitionTreeMin: 40, overrideDefaultHours: 6 },
    settlements: { clusterRadius: 6, tiers: [['camp', 2], ['hamlet', 4], ['village', 10], ['town', 30], ['city', 100], ['metropolis', 400]] },
    paths: { trail: 40, path: 160, road: 600, decayPerDay: 0.02 },
    history: { chronicleThreshold: 0.6, feedThreshold: 0.15, feedCap: 300, firstBonus: 3.0, creatorBonus: 1.5 },
    catchup: { detailWindowTicks: 192, maxYears: 500, chunkDays: 30 },
    persistence: { autosaveSeconds: 30, snapshotSlots: 3, key: 'lw.world.v1' },
    lod: { microCap: 300, mesoCap: 3000 },
    audio: { masterVolume: 0.35 },
    debug: { why: true, overlay: false },
  };

  /** Item catalogue. food = need restored per unit; spoilDays = mean life; weight for carry. */
  const ITEMS = {
    berries:     { food: 0.30, water: 0.05, spoilDays: 4,  weight: 0.5, label: 'Bogyó' },
    roots:       { food: 0.35, spoilDays: 8,  weight: 0.7, label: 'Gyökér' },
    meat_raw:    { food: 0.45, spoilDays: 2,  weight: 1.2, label: 'Nyers hús', raw: 'meat_cooked' },
    meat_cooked: { food: 0.70, spoilDays: 6,  weight: 1.0, label: 'Sült hús' },
    fish_raw:    { food: 0.35, spoilDays: 2,  weight: 0.8, label: 'Nyers hal', raw: 'fish_cooked' },
    fish_cooked: { food: 0.55, spoilDays: 6,  weight: 0.7, label: 'Sült hal' },
    dried_food:  { food: 0.50, spoilDays: 60, weight: 0.5, label: 'Szárított étel' },
    grain:       { food: 0.40, spoilDays: 120, weight: 0.5, label: 'Gabona' },
    wood:   { weight: 1.5, label: 'Fa' },
    stone:  { weight: 2.0, label: 'Kő' },
    flint:  { weight: 0.8, label: 'Kova' },
    fiber:  { weight: 0.3, label: 'Rost' },
    clay:   { weight: 1.5, label: 'Agyag' },
    hide:   { weight: 1.0, label: 'Bőr' },
    handaxe:{ weight: 1.0, label: 'Kézibalta', tool: true },
    spear:  { weight: 1.2, label: 'Lándzsa', tool: true },
    basket: { weight: 0.6, label: 'Kosár', tool: true, carryBonus: 8 },
    pot:    { weight: 1.5, label: 'Agyagedény', tool: true, carryBonus: 3 },
    ore_copper: { weight: 2.5, label: 'Furcsa zöld kő' },
    ore_tin:    { weight: 2.5, label: 'Szürke nehéz kő' },
    ore_iron:   { weight: 2.5, label: 'Rozsdavörös kő' },
    coal:       { weight: 1.5, label: 'Fekete égő kő' },
    gold_nugget:{ weight: 1.0, label: 'Csillogó sárga kő' },
    salt:       { weight: 1.0, label: 'Só' },
    gems:       { weight: 0.5, label: 'Szikrázó kő' },
  };
  const FOOD_ITEMS = Object.keys(ITEMS).filter((k) => ITEMS[k].food);

  const BIOME = { OCEAN: 0, LAKE: 1, RIVER: 2, BEACH: 3, GRASSLAND: 4, FOREST: 5, DENSE_FOREST: 6, HILLS: 7, MOUNTAIN: 8, PEAK: 9, MARSH: 10, TUNDRA: 11, DESERT: 12, SAVANNA: 13 };
  const BIOME_NAME = ['Óceán', 'Tó', 'Folyó', 'Part', 'Mező', 'Erdő', 'Sűrű erdő', 'Dombság', 'Hegység', 'Csúcs', 'Mocsár', 'Tundra', 'Sivatag', 'Szavanna'];
  const DEPOSIT = { NONE: 0, CLAY: 1, FLINT: 2, SALT: 3, COAL: 4, COPPER: 5, TIN: 6, IRON: 7, GOLD: 8, GEMS: 9, OIL: 10 };
  const DEPOSIT_NAME = ['none', 'clay', 'flint', 'salt', 'coal', 'copper', 'tin', 'iron', 'gold', 'gems', 'oil'];
  const DEPOSIT_ITEM = [null, 'clay', 'flint', 'salt', 'coal', 'ore_copper', 'ore_tin', 'ore_iron', 'gold_nugget', 'gems', null];

  /** Movement cost per biome (Infinity = impassable). */
  const MOVE_COST = [Infinity, Infinity, 3.0, 1.1, 1.0, 1.4, 1.8, 2.0, 3.0, Infinity, 2.5, 1.3, 1.4, 1.0];

  const TRAITS = ['curiosity', 'creativity', 'intelligence', 'empathy', 'aggression', 'patience', 'bravery', 'sociability', 'ambition', 'discipline', 'loyalty', 'greed', 'riskTolerance', 'optimism', 'dominance', 'humor'];
  const EMOTIONS = ['joy', 'sadness', 'fear', 'anger', 'stress', 'love', 'attraction', 'jealousy', 'loneliness', 'grief', 'excitement', 'shame', 'pride'];
  const NEEDS = ['food', 'water', 'energy', 'warmth', 'safety', 'social', 'affection', 'curiosity'];
  const SKILLS = ['gathering', 'hunting', 'crafting', 'building', 'foraging', 'social', 'exploring', 'medicine', 'farming'];

  LW.TIME = TIME;
  LW.CONFIG = CONFIG;
  LW.ITEMS = ITEMS;
  LW.FOOD_ITEMS = FOOD_ITEMS;
  LW.BIOME = BIOME;
  LW.BIOME_NAME = BIOME_NAME;
  LW.DEPOSIT = DEPOSIT;
  LW.DEPOSIT_NAME = DEPOSIT_NAME;
  LW.DEPOSIT_ITEM = DEPOSIT_ITEM;
  LW.MOVE_COST = MOVE_COST;
  LW.TRAITS = TRAITS;
  LW.EMOTIONS = EMOTIONS;
  LW.NEEDS = NEEDS;
  LW.SKILLS = SKILLS;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== core/hu.js ===== */
/* LEVENTE — THE CREATOR · core/hu.js — magyar megnevezések a belső azonosítókhoz (a motor kulcsai angolok maradnak) */
(function (LW) {
  'use strict';
  const M = {
    need: { food: 'Étel', water: 'Víz', energy: 'Energia', warmth: 'Meleg', safety: 'Biztonság', social: 'Társaság', affection: 'Gyengédség', curiosity: 'Kíváncsiság' },
    emotion: { joy: 'öröm', sadness: 'szomorúság', fear: 'félelem', anger: 'harag', stress: 'feszültség', love: 'szerelem', attraction: 'vonzalom', jealousy: 'féltékenység', loneliness: 'magány', grief: 'gyász', excitement: 'izgalom', shame: 'szégyen', pride: 'büszkeség' },
    trait: { curiosity: 'kíváncsiság', creativity: 'kreativitás', intelligence: 'értelem', empathy: 'együttérzés', aggression: 'agresszió', patience: 'türelem', bravery: 'bátorság', sociability: 'társaságkedvelés', ambition: 'becsvágy', discipline: 'fegyelem', loyalty: 'hűség', greed: 'kapzsiság', riskTolerance: 'kockázatvállalás', optimism: 'derűlátás', dominance: 'uralkodás', humor: 'humor' },
    skill: { gathering: 'gyűjtögetés', hunting: 'vadászat', crafting: 'kézművesség', building: 'építés', foraging: 'növényismeret', social: 'társas', exploring: 'felfedezés', medicine: 'gyógyítás', farming: 'földművelés' },
    occupation: { infant: 'csecsemő', child: 'gyermek', adolescent: 'serdülő', adult: 'felnőtt', elder: 'idős', forager: 'gyűjtögető', gatherer: 'gyűjtögető', builder: 'építő', hunter: 'vadász', crafter: 'kézműves', explorer: 'felfedező', tinkerer: 'kísérletező', farmer: 'földműves', fisher: 'halász', leader: 'vezető', smith: 'kovács', scholar: 'tudós', priest: 'pap', trader: 'kereskedő' },
    goal: { flee: 'menekülés', divine: 'a Teremtő hívása', eat: 'evés', drink: 'ivás', sleep: 'alvás', getWarm: 'melegedés', careForChild: 'gyermek gondozása', shareFood: 'étel megosztása', followParent: 'szülő követése', socialize: 'társaság', flirt: 'flört', mate: 'együttlét', stockpile: 'tartalék gyűjtése', buildShelter: 'otthon építése', helpBuild: 'segítés az építésben', makeFire: 'tűzgyújtás', tendFire: 'tűz táplálása', craft: 'készítés', experiment: 'kísérletezés', dig: 'ásás', farm: 'földművelés', explore: 'felfedezés', fight: 'verekedés', teach: 'tanítás', pickup: 'felszedés', mourn: 'gyász', rest: 'pihenés' },
    goalVerb: { flee: 'menekül', divine: 'a Teremtőnek felel', eat: 'ételt keres', drink: 'inni megy', sleep: 'alszik', getWarm: 'meleget keres', careForChild: 'a gyermekét gondozza', shareFood: 'ételt oszt meg', followParent: 'a szülője mellett marad', socialize: 'társaságot keres', flirt: 'flörtöl', mate: 'együtt van a párjával', stockpile: 'ételt gyűjt későbbre', buildShelter: 'otthont épít', helpBuild: 'segít építeni', makeFire: 'tüzet gyújt', tendFire: 'a tüzet táplálja', craft: 'készít valamit', experiment: 'kísérletezik', dig: 'ás', farm: 'a földet műveli', explore: 'felfedez', fight: 'verekszik', teach: 'tanít', pickup: 'felszed valamit', mourn: 'gyászol', rest: 'pihen' },
    ctx: { hunger: 'éhség', thirst: 'szomj', tired: 'fáradtság', cold: 'hideg', danger: 'veszély', night: 'éjszaka', feels: 'érzett °C' },
    op: { moveTo: 'megy', follow: 'követ', flee: 'menekül', gather: 'gyűjt', hunt: 'vadászik', fish: 'halászik', consume: 'eszik', drink: 'iszik', takeFood: 'ételt vesz ki', store: 'elrak', sleep: 'alszik', wait: 'vár', interact: 'beszél', buildNew: 'helyet jelöl', deliver: 'anyagot hoz', build: 'épít', refuel: 'tüzel', craft: 'készít', experiment: 'kísérletezik', dig: 'ás', give: 'ad', pickup: 'felszed', plant: 'vet', harvest: 'arat', divineDone: 'teljesít' },
    deposit: ['semmi', 'agyag', 'kova', 'só', 'szén', 'réz', 'ón', 'vas', 'arany', 'drágakő', 'olaj'],
    depositItem: ['', 'agyagot', 'kovát', 'sót', 'szenet', 'rezet', 'ónt', 'vasat', 'aranyat', 'drágakövet', 'olajat'],
    tier: { camp: 'tábor', hamlet: 'tanya', village: 'falu', town: 'mezőváros', city: 'város', metropolis: 'nagyváros' },
    tierBecame: { camp: 'táborrá', hamlet: 'tanyává', village: 'faluvá', town: 'mezővárossá', city: 'várossá', metropolis: 'nagyvárossá' },
    shape: { continent: 'Egy kontinens', archipelago: 'Egy szigetvilág', twin: 'Két földrész világa' },
    eventType: { AgentBorn: 'Születés', AgentDied: 'Halál', Killing: 'Gyilkosság', CoupleFormed: 'Szerelem', CoupleBroke: 'Szakítás', Pregnancy: 'Terhesség', DiscoveryMade: 'Felfedezés', KnowledgeLost: 'Elveszett tudás', BuildingCompleted: 'Építés', BuildingDestroyed: 'Pusztulás', SettlementFounded: 'Település', SettlementGrew: 'Növekedés', SettlementAbandoned: 'Elnéptelenedés', SettlementResettled: 'Újranépesedés', ResourceFound: 'Lelet', WildfireStarted: 'Erdőtűz', BeliefFormed: 'Hit', ConflictOccurred: 'Összecsapás', StrangerArrived: 'Idegen', Harvest: 'Aratás', WeatherChanged: 'Időjárás', WordCoined: 'Szó', LanguageNamed: 'Nyelv', LanguageSplit: 'Nyelvszakadás', SecretTongue: 'Titkos nyelv', CreatorSpoke: 'A hang', CreatorAnswered: 'Válasz', RecordWritten: 'Írás', Ritual: 'Szertartás', LeaderChosen: 'Vezető', WorldSimulated: 'Világmag', ItemCrafted: 'Készítés', Epidemic: 'Járvány', EpidemicEnded: 'Járvány vége', SimulationHypothesis: 'Hipotézis', SimulationVerdict: 'Ítélet', StateFounded: 'Állam', WarDeclared: 'Háború', Battle: 'Csata', WarEnded: 'Béke', CompanyFounded: 'Vállalat', NewLand: 'Új föld', FutureTech: 'Ismeretlen', ExistentialQuestion: 'Kérdés' },
  };
  const HU = {
    ...M,
    need: (k) => M.need[k] || k, emotion: (k) => M.emotion[k] || k, trait: (k) => M.trait[k] || k, skill: (k) => M.skill[k] || k,
    occupation: (k) => M.occupation[k] || k, goal: (k) => M.goal[k] || k, goalVerb: (k) => M.goalVerb[k] || k, ctx: (k) => M.ctx[k] || k, op: (k) => M.op[k] || k,
    deposit: (i) => M.deposit[i] || '?', depositByName: (n) => M.deposit[LW.DEPOSIT_NAME.indexOf(n)] || n, depositItemByName: (n) => M.depositItem[LW.DEPOSIT_NAME.indexOf(n)] || n,
    tier: (k) => M.tier[k] || k, tierBecame: (k) => M.tierBecame[k] || k, shape: (k) => M.shape[k] || k, eventType: (k) => M.eventType[k] || k,
    /** Egyes szám harmadik személyű birtokos rag: kikötő → kikötője, kemence → kemencéje, gyár → gyára, műhely → műhelye. */
    poss: (word) => { const w = String(word); const last = w[w.length - 1]; const vow = w.replace(/[^aáoóuúeéiíöőüű]/g, ''); const back = /[aáoóuú]/.test(vow.slice(-1)) || (/[ií]/.test(vow.slice(-1)) && /[aáoóuú]/.test(vow.slice(-2, -1))); const ae = back ? 'a' : 'e';
      if (/mű$/.test(w)) return w + 've'; if (/alom$/.test(w)) return w.slice(0, -2) + 'ma'; if (/elem$/.test(w)) return w.slice(0, -2) + 'me'; if (/orony$/.test(w)) return w.slice(0, -3) + 'nya';
      if (/[aáeéiíoóöőuúüű]$/.test(w)) { const stem = last === 'a' ? w.slice(0, -1) + 'á' : last === 'e' ? w.slice(0, -1) + 'é' : w; return stem + 'j' + ae; }
      if (/[tdkn]$/.test(w)) return w + 'j' + ae; return w + ae; },
  };
  LW.HU = HU;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== core/util.js ===== */
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


/* ===== language/names.js ===== */
/* LEVENTE — THE CREATOR · language/names.js
 * A procedural proto-language per world: a phoneme inventory and syllable grammar
 * from which the inhabitants name their children, places and the world itself.
 * (Spec §60–§61.) Dialects/mutual intelligibility arrive in Phase 2.
 */
(function (LW) {
  'use strict';

  const CONS_POOL = ['m', 'n', 'l', 'r', 'k', 't', 's', 'v', 'd', 'th', 'sh', 'h', 'b', 'g', 'z', 'f', 'p', 'y', 'w', 'ch', 'kh', 'ny', 'rr'];
  const CONS_WEIGHT = [9, 9, 8, 8, 7, 7, 7, 5, 5, 3, 3, 4, 4, 4, 3, 3, 3, 3, 3, 2, 1, 1, 1];
  const VOW_POOL = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'ei', 'ou', 'y'];
  const VOW_WEIGHT = [10, 9, 8, 7, 5, 2, 2, 2, 1, 1];
  const PLACE_SUFFIX = [['a', 'ar', 'ara'], ['en', 'ven', 'end'], ['ia', 'ira', 'is'], ['or', 'oth', 'orn'], ['um', 'ul', 'un'], ['eth', 'ath', 'esh'], ['al', 'el', 'il']];

  class Language {
    constructor(rng) {
      this.rng = rng;
      const nC = rng.int(7, 12), nV = rng.int(3, 6);
      this.cons = pickN(rng, CONS_POOL, CONS_WEIGHT, nC);
      this.vows = pickN(rng, VOW_POOL, VOW_WEIGHT, nV);
      // syllable structure preference
      this.patterns = rng.weighted([['CV', 'CVC', 'V'], ['CV', 'CVC'], ['CV', 'V', 'VC'], ['CVC', 'CV', 'CVV']], [4, 3, 2, 1]);
      this.femEnd = rng.pick(['a', 'i', 'e', 'ia', 'ya', 'is']);
      this.mascEnd = rng.pick(['n', 'r', 'k', 'th', 'l', 'd', 'sh', 'os', 'an']);
      this.placeSuffixes = rng.pick(PLACE_SUFFIX);
      this.used = new Set();
    }
    syllable() {
      const p = this.rng.pick(this.patterns);
      let s = '';
      for (const ch of p) s += ch === 'C' ? this.rng.pick(this.cons) : this.rng.pick(this.vows);
      return s;
    }
    _raw(n) { let s = ''; for (let i = 0; i < n; i++) s += this.syllable(); return s.replace(/(.)\1\1+/g, '$1$1'); }
    cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    _unique(gen) {
      for (let i = 0; i < 20; i++) { const n = gen(); if (!this.used.has(n)) { this.used.add(n); return n; } }
      const n = gen() + this.rng.pick(['-' + this.rng.pick(this.vows), this.rng.pick(this.cons)]);
      this.used.add(n); return n;
    }
    /** Person name. Parents' creativity can push toward novelty (longer, rarer forms). */
    person(sex, creativity = 0.5) {
      return this._unique(() => {
        const n = this.rng.chance(0.25 + creativity * 0.4) ? 3 : 2;
        let s = this._raw(n);
        if (sex === 'f') { if (!/[aeiouy]$/.test(s) || this.rng.chance(0.5)) s = s.replace(/[aeiouy]+$/, '') + this.femEnd; }
        else { if (/[aeiouy]$/.test(s) && this.rng.chance(0.75)) s += this.mascEnd; }
        return this.cap(s);
      });
    }
    place() {
      return this._unique(() => this.cap(this._raw(this.rng.int(1, 2)) + this.rng.pick(this.placeSuffixes)));
    }
    world() { return this.cap(this._raw(2) + this.rng.pick(['ara', 'eth', 'ia', 'oran', 'ys'])); }
    /** Feature name: "Lake Verun", "Mount Kesh" */
    feature(kind) { return `${kind} ${this.place()}`; }
    toJSON() { return { cons: this.cons, vows: this.vows, patterns: this.patterns, femEnd: this.femEnd, mascEnd: this.mascEnd, placeSuffixes: this.placeSuffixes, used: [...this.used], rng: this.rng.getState() }; }
    static fromJSON(j) {
      const l = Object.create(Language.prototype);
      l.rng = new LW.Rng(1); if (j.rng) l.rng.setState(j.rng); l.cons = j.cons; l.vows = j.vows; l.patterns = j.patterns; l.femEnd = j.femEnd; l.mascEnd = j.mascEnd; l.placeSuffixes = j.placeSuffixes; l.used = new Set(j.used);
      return l;
    }
  }

  function pickN(rng, pool, weights, n) {
    const items = pool.slice(), w = weights.slice(), out = [];
    while (out.length < n && items.length) {
      const it = rng.weighted(items, w); const i = items.indexOf(it);
      out.push(it); items.splice(i, 1); w.splice(i, 1);
    }
    return out;
  }

  LW.Language = Language;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== world/generate.js ===== */
/* LEVENTE — THE CREATOR · world/generate.js
 * Procedural planet from a seed: continents, elevation, climate, rivers, lakes,
 * biomes, ecology capacities, underground deposits and the Genesis site.
 * (SIMULATION_MODEL.md §1)
 */
(function (LW) {
  'use strict';
  const B = LW.BIOME, D = LW.DEPOSIT;

  function makeTiles(w, h) {
    const n = w * h;
    return {
      elev: new Float32Array(n), baseTemp: new Float32Array(n),
      moist: new Uint8Array(n), fert: new Uint8Array(n), biome: new Uint8Array(n),
      veg: new Uint8Array(n), vegCap: new Uint8Array(n), trees: new Uint8Array(n), treeCap: new Uint8Array(n),
      animals: new Uint8Array(n), animalCap: new Uint8Array(n), fish: new Uint8Array(n), fishCap: new Uint8Array(n),
      stone: new Uint8Array(n), depType: new Uint8Array(n), depAmt: new Uint16Array(n), depKnown: new Uint8Array(n),
      traffic: new Uint16Array(n), path: new Uint8Array(n), fire: new Uint8Array(n), burnt: new Uint8Array(n),
      snow: new Uint8Array(n), danger: new Uint8Array(n), shade: new Uint8Array(n),
      bridge: new Uint8Array(n), // átkelő: 1 fahíd, 2 kőhíd, 3 acélhíd, 4 alagút — a víz és a csúcs járhatóvá válik
    };
  }

  const isWater = (b) => b === B.OCEAN || b === B.LAKE || b === B.RIVER;
  const isFresh = (b) => b === B.LAKE || b === B.RIVER;

  function generate(seed, cfg) {
    const w = cfg.width, h = cfg.height, n = w * h, sea = cfg.seaLevel;
    const rng = new LW.Rng(seed);
    const nElev = new LW.Noise(seed ^ 0x1111), nRidge = new LW.Noise(seed ^ 0x2222), nMoist = new LW.Noise(seed ^ 0x3333), nVar = new LW.Noise(seed ^ 0x4444), nWarp = new LW.Noise(seed ^ 0x5555);
    const t = makeTiles(w, h);
    const idx = (x, y) => y * w + x;

    // ---- 1. continent shape + elevation
    const shape = rng.weighted(['continent', 'archipelago', 'twin'], [6, 2, 2]);
    const scale = 0.055 * (128 / w);
    const cx2 = rng.range(0.4, 0.6) * w, cy2 = rng.range(0.4, 0.6) * h;
    const tw = shape === 'twin' ? rng.range(0, Math.PI) : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const wx = x + (nWarp.fbm(x * 0.03, y * 0.03, 3) - 0.5) * 18, wy = y + (nWarp.fbm(x * 0.03 + 7.7, y * 0.03 + 3.1, 3) - 0.5) * 18;
      let e = nElev.fbm(wx * scale, wy * scale, 6, 2.0, 0.5);
      const r = nRidge.ridged(wx * scale * 1.7, wy * scale * 1.7, 4);
      e = e * 0.72 + r * 0.28;
      let mask;
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      if (shape === 'continent') { const d = Math.hypot((x - cx2) / (w * 0.5), (y - cy2) / (h * 0.5)); mask = 1 - LW.smoothstep(0.55, 1.05, d); }
      else if (shape === 'archipelago') { mask = 0.8 - 0.3 * Math.hypot(dx, dy); }
      else { const ca = Math.cos(tw), sa = Math.sin(tw); const u = dx * ca + dy * sa; const d1 = Math.hypot((u - 0.42) / 0.5, (dx * -sa + dy * ca) / 0.8), d2 = Math.hypot((u + 0.42) / 0.5, (dx * -sa + dy * ca) / 0.8); mask = Math.max(1 - LW.smoothstep(0.5, 1.0, d1), 1 - LW.smoothstep(0.5, 1.0, d2)); }
      const edge = 1 - LW.smoothstep(0.86, 1.0, Math.max(Math.abs(dx), Math.abs(dy)));
      t.elev[idx(x, y)] = e * mask * edge;
    }
    // normalise so that land fraction is plausible for the shape
    const targetLand = shape === 'continent' ? 0.58 : shape === 'archipelago' ? 0.42 : 0.52;
    const sorted = Float32Array.from(t.elev).sort();
    const cut = sorted[Math.floor((1 - targetLand) * n)];
    for (let i = 0; i < n; i++) { const e = t.elev[i]; t.elev[i] = e < cut ? (e / cut) * sea : sea + ((e - cut) / (1 - cut + 1e-6)) * (1 - sea); }
    // lift interior mountains a bit for variety
    for (let i = 0; i < n; i++) if (t.elev[i] > sea) t.elev[i] = sea + Math.pow((t.elev[i] - sea) / (1 - sea), 1.25) * (1 - sea);

    // ---- 2. climate
    const climateMean = rng.range(13.5, 18); // °C annual mean at sea level, mid-map (temperate-warm: the first ones must survive their first winters)
    const latGrad = rng.range(4, 9);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      const lat = (0.5 - y / h) * 2; // +1 north (colder), -1 south
      const alt = Math.max(0, t.elev[i] - sea);
      t.baseTemp[i] = climateMean - lat * latGrad - alt * 60 + (nVar.fbm(x * 0.05, y * 0.05, 3) - 0.5) * 3;
    }

    // ---- 3. ocean distance (BFS) → moisture
    const oceanDist = new Int16Array(n).fill(-1);
    const queue = new Int32Array(n); let qh = 0, qt = 0;
    for (let i = 0; i < n; i++) if (t.elev[i] < sea) { oceanDist[i] = 0; queue[qt++] = i; }
    while (qh < qt) {
      const i = queue[qh++]; const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = idx(nx, ny); if (oceanDist[j] < 0) { oceanDist[j] = oceanDist[i] + 1; queue[qt++] = j; }
      }
    }
    const windDir = rng.pick([-1, 1]);
    const moistF = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      let m = 0.55 * nMoist.fbm(x * 0.045, y * 0.045, 4) + 0.45 * Math.exp(-Math.max(0, oceanDist[i]) / 22);
      // rain shadow: higher ground upwind
      let shadow = 0; for (let k = 1; k <= 5; k++) { const ux = x - windDir * k; if (ux >= 0 && ux < w) shadow = Math.max(shadow, t.elev[idx(ux, y)] - t.elev[i]); }
      m -= Math.max(0, shadow - 0.06) * 1.2;
      const temp = t.baseTemp[i]; if (temp > 22) m -= (temp - 22) * 0.02;
      moistF[i] = LW.clamp01(m + 0.08);
    }

    // ---- 4. rivers
    const water = new Uint8Array(n); // 0 none 1 river 2 lake 3 ocean
    for (let i = 0; i < n; i++) if (t.elev[i] < sea) water[i] = 3;
    const nRivers = Math.max(4, Math.round(n * cfg.riverDensity));
    const cand = [];
    for (let i = 0; i < n; i++) if (t.elev[i] > sea + 0.22 && moistF[i] > 0.45) cand.push(i);
    rng.shuffle(cand);
    let riverTiles = 0;
    for (let r = 0; r < nRivers && r < cand.length; r++) {
      let i = cand[r]; let steps = 0; const visited = new Set();
      while (steps++ < 400) {
        if (water[i]) break;
        visited.add(i);
        water[i] = 1; riverTiles++;
        const x = i % w, y = (i / w) | 0;
        let best = -1, be = t.elev[i] + 1e-3;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = idx(nx, ny); if (visited.has(j)) continue;
          const e = t.elev[j] + rng.range(0, 0.004); if (e < be) { be = e; best = j; }
        }
        if (best < 0) { // basin → lake
          floodLake(i, water, t.elev, w, h, rng.int(3, 14)); break;
        }
        i = best;
        if (water[i] === 1 || water[i] === 2 || water[i] === 3) break;
      }
    }
    // extra lakes at wet local minima
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const i = idx(x, y); if (water[i] || t.elev[i] < sea + 0.02 || moistF[i] < 0.55) continue;
      let minimum = true; for (let dy = -1; dy <= 1 && minimum; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; if (t.elev[idx(x + dx, y + dy)] <= t.elev[i]) { minimum = false; break; } }
      if (minimum && rng.chance(0.35)) floodLake(i, water, t.elev, w, h, rng.int(2, 8));
    }
    // moisture boost near fresh water
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y); if (water[i] !== 1 && water[i] !== 2) continue;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = idx(nx, ny); moistF[j] = Math.min(1, moistF[j] + 0.25 / (1 + Math.abs(dx) + Math.abs(dy))); }
    }

    // ---- 5. biomes
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y); const e = t.elev[i], m = moistF[i], temp = t.baseTemp[i];
      let b;
      if (water[i] === 3) b = B.OCEAN; else if (water[i] === 2) b = B.LAKE; else if (water[i] === 1) b = B.RIVER;
      else if (e > 0.86) b = B.PEAK; else if (e > 0.72) b = B.MOUNTAIN; else if (e > 0.6) b = B.HILLS;
      else if (temp < 1.5) b = B.TUNDRA;
      else if (m < 0.22 && temp > 15) b = B.DESERT;
      else if (m < 0.32 && temp > 11) b = B.SAVANNA;
      else if (m > 0.78 && e < sea + 0.07 && oceanDistOrFresh(i) <= 4) b = B.MARSH;
      else if (m > 0.66) b = B.DENSE_FOREST;
      else if (m > 0.46) b = B.FOREST;
      else b = B.GRASSLAND;
      // beaches
      if (b !== B.OCEAN && e < sea + 0.025 && !isWater(b)) { let adj = false; for (let dy = -1; dy <= 1 && !adj; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; if (water[idx(nx, ny)] === 3) { adj = true; break; } } if (adj) b = B.BEACH; }
      t.biome[i] = b;
      t.moist[i] = Math.round(m * 255);
    }
    function oceanDistOrFresh(i) { const x = i % w, y = (i / w) | 0; let d = oceanDist[i]; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = idx(nx, ny); if (water[j] === 1 || water[j] === 2) d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy))); } return d; }

    // ---- 6. ecology capacities
    const VEG = [0, 0, 0, 30, 120, 160, 140, 70, 30, 0, 110, 40, 15, 90];
    const TREE = [0, 0, 0, 5, 40, 200, 255, 60, 20, 0, 80, 20, 0, 50];
    const ANIM = [0, 0, 0, 20, 120, 150, 170, 90, 40, 5, 70, 60, 20, 160];
    const STONE = [0, 0, 60, 40, 15, 20, 15, 140, 220, 255, 10, 60, 90, 25];
    const DANGER = [0, 0, 10, 30, 50, 100, 140, 90, 110, 60, 80, 70, 40, 100];
    const FERT = [0, 0, 0, 40, 160, 140, 120, 80, 30, 0, 180, 40, 20, 100];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y), b = t.biome[i]; const v = 0.6 + 0.4 * nVar.fbm(x * 0.15 + 50, y * 0.15 + 50, 3);
      t.vegCap[i] = Math.round(VEG[b] * v); t.treeCap[i] = Math.round(TREE[b] * (0.5 + 0.5 * nVar.fbm(x * 0.08 + 9, y * 0.08 + 9, 3)));
      t.animalCap[i] = Math.round(ANIM[b] * v); t.stone[i] = Math.round(STONE[b] * v);
      t.danger[i] = DANGER[b]; t.fert[i] = Math.round(FERT[b] * (0.7 + 0.3 * v));
      t.veg[i] = Math.round(t.vegCap[i] * rng.range(0.7, 1)); t.trees[i] = Math.round(t.treeCap[i] * rng.range(0.75, 1)); t.animals[i] = Math.round(t.animalCap[i] * rng.range(0.6, 1));
      let fc = 0; if (b === B.RIVER) fc = 150; else if (b === B.LAKE) fc = 200; else if (b === B.OCEAN) fc = oceanDist[i] === 0 && nearLand(i) ? 170 : 60; else if (b === B.BEACH || b === B.MARSH) fc = 50;
      t.fishCap[i] = Math.round(fc * v); t.fish[i] = Math.round(t.fishCap[i] * rng.range(0.7, 1));
    }
    function nearLand(i) { const x = i % w, y = (i / w) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; if (t.elev[idx(nx, ny)] >= sea) return true; } return false; }

    // ---- 7. deposits (veins)
    const nDep = Math.max(8, Math.round(n * cfg.depositDensity));
    const land = []; for (let i = 0; i < n; i++) if (!isWater(t.biome[i])) land.push(i);
    const placeVein = (start, type, surface) => {
      let i = start; const len = rng.int(3, type === D.CLAY || type === D.FLINT ? 18 : 30);
      for (let k = 0; k < len; k++) {
        if (isWater(t.biome[i])) break;
        if (!t.depType[i]) { t.depType[i] = type; t.depAmt[i] = rng.int(20, 200); t.depKnown[i] = k === 0 ? ((surface || rng.chance(0.3)) ? 1 : 0) : (rng.chance(0.05) ? 1 : 0); }
        const x = i % w, y = (i / w) | 0; const nx = LW.clamp(x + rng.int(-1, 1), 0, w - 1), ny = LW.clamp(y + rng.int(-1, 1), 0, h - 1); i = idx(nx, ny);
      }
    };
    const typeFor = (b, i) => {
      const nearFresh = oceanDistOrFresh(i) <= 3;
      if (b === B.MARSH || (nearFresh && (b === B.GRASSLAND || b === B.FOREST))) return rng.weighted([D.CLAY, D.SALT, D.FLINT], [7, 1, 2]);
      if (b === B.HILLS) return rng.weighted([D.FLINT, D.COPPER, D.TIN, D.COAL, D.IRON, D.GEMS, D.CLAY], [30, 18, 10, 14, 14, 4, 10]);
      if (b === B.MOUNTAIN || b === B.PEAK) return rng.weighted([D.COPPER, D.IRON, D.GOLD, D.GEMS, D.COAL, D.TIN, D.FLINT], [18, 22, 12, 8, 14, 14, 12]);
      if (b === B.DESERT || b === B.SAVANNA) return rng.weighted([D.SALT, D.OIL, D.COPPER, D.FLINT], [35, 25, 25, 15]);
      if (b === B.BEACH) return rng.weighted([D.SALT, D.CLAY], [6, 4]);
      return rng.weighted([D.CLAY, D.FLINT, D.COAL, D.IRON, D.COPPER], [30, 30, 15, 15, 10]);
    };
    for (let k = 0; k < nDep; k++) { const i = rng.pick(land); placeVein(i, typeFor(t.biome[i], i)); }
    // a fejlődés nyersanyagai valahol mindig ott vannak a földben (ha kevés jutott, még néhány ér)
    const hilly = land.filter((i) => t.biome[i] === B.HILLS || t.biome[i] === B.MOUNTAIN);
    for (const [type, min] of [[D.COPPER, 3], [D.TIN, 2], [D.IRON, 3], [D.COAL, 3], [D.GOLD, 1], [D.OIL, 1], [D.GEMS, 1], [D.SALT, 2]]) { let have = 0; for (const i of land) if (t.depType[i] === type) have++; for (let k = Math.ceil(have / 12); k < min; k++) placeVein(rng.pick(hilly.length ? hilly : land), type, true); }

    // ---- 8. genesis site (progressively relaxed constraints)
    let best = -1, bestScore = -1;
    const PASSES = [[13, 19.5, true], [11, 22, true], [9, 24, false], [-99, 99, false]];
    for (const [tLo, tHi, strictBiome] of PASSES) { if (best >= 0) break;
    for (let y = 8; y < h - 8; y++) for (let x = 8; x < w - 8; x++) {
      const i = idx(x, y), b = t.biome[i];
      if (strictBiome ? !(b === B.GRASSLAND || b === B.FOREST || b === B.SAVANNA) : (isWater(b) || b === B.PEAK || b === B.MOUNTAIN)) continue;
      const temp = t.baseTemp[i]; if (temp < tLo || temp > tHi) continue;
      let fresh = 0, veg = 0, trees = 0, stone = 0, mount = 0;
      for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
        const j = idx(x + dx, y + dy); const d = Math.max(Math.abs(dx), Math.abs(dy)); const bb = t.biome[j];
        if (isFresh(bb) && d <= 6) fresh = Math.max(fresh, 1 - d / 7);
        if (d <= 8) { veg += t.vegCap[j]; trees += t.treeCap[j]; stone += t.stone[j]; if (bb === B.MOUNTAIN || bb === B.PEAK || bb === B.OCEAN) mount++; }
      }
      if (fresh === 0) continue;
      const score = fresh * 3 + veg / 20000 + trees / 20000 + Math.min(stone, 3000) / 3000 - mount / 289 * 1.5 + rng.f() * 0.05;
      if (score > bestScore) { bestScore = score; best = i; }
    } }
    if (best < 0) { // fallback: any land tile near fresh water
      for (let i = 0; i < n && best < 0; i++) if (!isWater(t.biome[i]) && t.biome[i] !== B.PEAK && t.biome[i] !== B.MOUNTAIN && oceanDistOrFresh(i) <= 5) best = i;
      if (best < 0) best = land[0] || 0;
    }
    const gx = best % w, gy = (best / w) | 0;
    // guarantee learnable materials near genesis: flint & clay within ~18 tiles
    ensureDeposit(D.FLINT, gx, gy, 18); ensureDeposit(D.CLAY, gx, gy, 18);
    function ensureDeposit(type, x0, y0, r) {
      for (let y = Math.max(0, y0 - r); y <= Math.min(h - 1, y0 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(w - 1, x0 + r); x++) if (t.depType[idx(x, y)] === type) return;
      for (let tries = 0; tries < 200; tries++) { const x = LW.clamp(x0 + rng.int(-r, r), 1, w - 2), y = LW.clamp(y0 + rng.int(-r, r), 1, h - 2); const i = idx(x, y); if (!isWater(t.biome[i]) && !t.depType[i]) { placeVein(i, type); t.depKnown[i] = 1; return; } }
    }

    return { w, h, tiles: t, genesis: { x: gx, y: gy }, shape, climateMean, windDir, landTiles: land.length, riverTiles };
  }

  function floodLake(start, water, elev, w, h, maxTiles) {
    const base = elev[start]; const q = [start]; const seen = new Set([start]); let count = 0;
    while (q.length && count < maxTiles) {
      const i = q.shift(); if (water[i] === 3) continue; water[i] = 2; count++;
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (!seen.has(j) && elev[j] < base + 0.025) { seen.add(j); q.push(j); } }
    }
  }

  LW.generateWorld = generate;
  LW.makeTiles = makeTiles;
  LW.isWaterBiome = isWater;
  LW.isFreshBiome = isFresh;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== world/world.js ===== */
/* LEVENTE — THE CREATOR · world/world.js
 * The World: tiles, registries (agents, deceased, buildings, settlements, landmarks),
 * spatial queries, pathfinding, and the shared services (rng, events, language).
 */
(function (LW) {
  'use strict';
  const B = LW.BIOME, T = LW.TIME;

  class BinaryHeap {
    constructor() { this.k = []; this.v = []; }
    get size() { return this.k.length; }
    push(key, val) { const k = this.k, v = this.v; k.push(key); v.push(val); let i = k.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= k[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; } }
    pop() { const k = this.k, v = this.v; const top = v[0]; const lk = k.pop(), lv = v.pop(); if (k.length) { k[0] = lk; v[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < k.length && k[l] < k[m]) m = l; if (r < k.length && k[r] < k[m]) m = r; if (m === i) break; [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m; } } return top; }
  }

  class World {
    constructor() {
      this.events = new LW.EventBus();
      this.agents = new Map();      // id → Agent (alive)
      this.deceased = new Map();    // id → compact record
      this.buildings = new Map();   // id → Building
      this.settlements = new Map(); // id → Settlement
      this.landmarks = [];          // god manifestations & named features
      this.nextIds = { agent: 1, building: 1, settlement: 1, landmark: 1 };
      this.tick = 0;
      this.buckets = new Map();
      this._pathGen = 0;
      this.stats = { births: 0, deaths: 0, discoveries: 0, buildingsBuilt: 0, interventions: 0 };
    }

    /** Create a brand new world from a seed. */
    static create(seed, cfg) {
      const w = new World();
      w.seed = seed >>> 0;
      w.cfg = cfg || LW.CONFIG;
      w.rng = new LW.Rng(w.seed);
      const gen = LW.generateWorld(w.seed, w.cfg.world);
      w.w = gen.w; w.h = gen.h; w.tiles = gen.tiles; w.genesis = gen.genesis; w.shape = gen.shape; w.climateMean = gen.climateMean; w.windDir = gen.windDir;
      w.language = new LW.Language(w.rng.fork('language'));
      w.name = w.language.world();
      w.createdMs = 0;
      w._initPathBuffers();
      return w;
    }

    _initPathBuffers() {
      const n = this.w * this.h;
      this._g = new Float32Array(n); this._from = new Int32Array(n); this._seen = new Uint32Array(n); this._closed = new Uint32Array(n);
    }

    idx(x, y) { return y * this.w + x; }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    xOf(i) { return i % this.w; }
    yOf(i) { return (i / this.w) | 0; }
    biomeAt(i) { return this.tiles.biome[i]; }
    isWater(i) { return LW.isWaterBiome(this.tiles.biome[i]); }
    isFresh(i) { return LW.isFreshBiome(this.tiles.biome[i]); }
    isPassable(i) { return LW.MOVE_COST[this.tiles.biome[i]] !== Infinity || (this.tiles.bridge && this.tiles.bridge[i] > 0); }
    moveCost(i) {
      const t = this.tiles; let c = LW.MOVE_COST[t.biome[i]];
      if (t.bridge && t.bridge[i]) c = t.bridge[i] === 4 ? 1.3 : t.bridge[i] === 1 ? 1.1 : 0.9; // a hídon a folyó és a szoros is út
      if (c === Infinity) return c;
      if (t.path[i]) c *= t.path[i] === 1 ? 0.85 : t.path[i] === 2 ? 0.7 : 0.55;
      if (t.fire[i]) c += 40;
      if (t.snow[i] > 100) c *= 1.4;
      return c;
    }

    /** Current air temperature at tile (°C). Weather provides the dynamic offset. */
    tileTemp(i) {
      const base = this.tiles.baseTemp[i];
      const wx = this.weather;
      const f = LW.Time.yearFrac(this.tick);
      const seasonal = Math.cos((f - 0.375) * Math.PI * 2) * 8.5; // warmest mid-summer (day ~135), coldest mid-winter (day ~315)
      const h = LW.Time.hour(this.tick) + LW.Time.minute(this.tick) / 60;
      const diurnal = Math.sin((h - 9) / 24 * Math.PI * 2) * 5;
      return base + seasonal + diurnal + (wx ? wx.tempOffset : 0) - (wx ? wx.cloud * 2 : 0);
    }
    rainAt(i) { return this.weather ? this.weather.rainAt(i) : 0; }

    // ---- registries
    addAgent(a) { this.agents.set(a.id, a); return a; }
    removeAgent(id) { this.agents.delete(id); }
    /** Az épület által lefedett mezők (alapterület: b.w × b.h, a bal felső sarok a horgony). */
    buildingTiles(b) { const out = []; const w = b.w || 1, h = b.h || 1; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const x = b.x + dx, y = b.y + dy; if (this.inBounds(x, y)) out.push(this.idx(x, y)); } return out; }
    addBuilding(b) { this.buildings.set(b.id, b); if (!this.btile) this.btile = new Map(); for (const i of this.buildingTiles(b)) { this.btile.set(i, b.id); this.tiles.shade[i] = 1; } this._bput(b); return b; }
    removeBuilding(id) { const b = this.buildings.get(id); if (!b) return; this.buildings.delete(id); if (this.btile) for (const i of this.buildingTiles(b)) { if (this.btile.get(i) === id) { this.btile.delete(i); this.tiles.shade[i] = 0; } } this._bdel(b); }
    buildingAt(i) { if (!this.btile) this.reindexBuildings(); const id = this.btile.get(i); return id != null ? (this.buildings.get(id) || null) : null; }
    reindexBuildings() { this.btile = new Map(); this.bcells = new Map(); for (const b of this.buildings.values()) { for (const i of this.buildingTiles(b)) this.btile.set(i, b.id); this._bput(b); } }
    _bkey(x, y) { return ((y >> 3) * 4096) + (x >> 3); }
    _bput(b) { if (!this.bcells) this.bcells = new Map(); const k = this._bkey(b.x, b.y); let s = this.bcells.get(k); if (!s) { s = new Set(); this.bcells.set(k, s); } s.add(b.id); }
    _bdel(b) { if (!this.bcells) return; const s = this.bcells.get(this._bkey(b.x, b.y)); if (s) s.delete(b.id); }
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
      this.w = newW; this.h = newH; this.tiles = nt; this._initPathBuffers(); this.reindexBuildings(); this.rebuildBuckets(); this.dirtyTiles = new Set(); this._comp = null; this._bridgeSites = null;
      const name = this.language.place();
      this.landmarks.push({ kind: 'land', name, x: east ? oldW + size / 2 : oldW / 2, y: east ? oldH / 2 : oldH + size / 2, tick: this.tick });
      this.events.emit('NewLand', { tick: this.tick, name, side, agentId: explorerId, w: newW, h: newH, tile: this.idx(east ? oldW + (size >> 1) : (oldW >> 1), east ? (oldH >> 1) : oldH + (size >> 1)) });
      return name;
    }
    buildingsNear(x, y, r) { const out = []; if (!this.bcells) this.reindexBuildings(); const x0 = (x - r) >> 3, x1 = (x + r) >> 3, y0 = (y - r) >> 3, y1 = (y + r) >> 3; for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const s = this.bcells.get(cy * 4096 + cx); if (!s) continue; for (const id of s) { const b = this.buildings.get(id); if (b && Math.abs(b.x - x) <= r && Math.abs(b.y - y) <= r) out.push(b); } } return out; }

    // ---- spatial hash for agents (rebuilt each tick)
    rebuildBuckets() {
      this.buckets.clear();
      for (const a of this.agents.values()) { const k = ((a.y | 0) >> 3) * 64 + ((a.x | 0) >> 3); let l = this.buckets.get(k); if (!l) { l = []; this.buckets.set(k, l); } l.push(a); }
    }
    agentsNear(x, y, r, excludeId) {
      const out = []; const bx0 = ((x - r) | 0) >> 3, bx1 = ((x + r) | 0) >> 3, by0 = ((y - r) | 0) >> 3, by1 = ((y + r) | 0) >> 3; const r2 = r * r;
      for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
        const l = this.buckets.get(by * 64 + bx); if (!l) continue;
        for (let i = 0; i < l.length; i++) { const a = l[i]; if (a.id === excludeId) continue; if (LW.dist2(a.x, a.y, x, y) <= r2) out.push(a); }
      }
      return out;
    }

    /** Bounded A* on the tile grid. Returns array of tile indices (excluding start) or null. */
    findPath(sx, sy, tx, ty, maxNodes = 5000) {
      const w = this.w, h = this.h; sx |= 0; sy |= 0; tx |= 0; ty |= 0;
      if (!this.inBounds(tx, ty)) return null;
      const start = this.idx(sx, sy), goal = this.idx(tx, ty);
      if (start === goal) return [];
      if (!this.isPassable(goal)) return null;
      const gen = ++this._pathGen; const G = this._g, FROM = this._from, SEEN = this._seen, CLOSED = this._closed;
      const heap = new BinaryHeap();
      const hx = (i) => { const dx = Math.abs((i % w) - tx), dy = Math.abs(((i / w) | 0) - ty); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
      G[start] = 0; SEEN[start] = gen; FROM[start] = -1; heap.push(hx(start), start);
      let expanded = 0, bestI = start, bestH = hx(start);
      while (heap.size) {
        const i = heap.pop(); if (CLOSED[i] === gen) continue; CLOSED[i] = gen;
        if (i === goal) return this._reconstruct(i, start);
        const hh = hx(i); if (hh < bestH) { bestH = hh; bestI = i; }
        if (++expanded > maxNodes) break;
        const x = i % w, y = (i / w) | 0; const gi = G[i];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx; if (CLOSED[j] === gen) continue;
          const c = this.moveCost(j); if (c === Infinity) continue;
          if (dx && dy) { // no corner cutting through impassable tiles
            if (!this.isPassable(this.idx(x + dx, y)) || !this.isPassable(this.idx(x, y + dy))) continue;
          }
          const g = gi + c * (dx && dy ? 1.414 : 1);
          if (SEEN[j] !== gen || g < G[j]) { SEEN[j] = gen; G[j] = g; FROM[j] = i; heap.push(g + hx(j), j); }
        }
      }
      // partial path toward the closest explored node (keeps agents moving when goal is far/unreachable)
      if (bestI !== start) { const p = this._reconstruct(bestI, start); p.partial = true; return p; }
      return null;
    }
    _reconstruct(i, start) { const out = []; while (i !== start && i >= 0) { out.push(i); i = this._from[i]; } out.reverse(); return out; }

    /** Random passable tile near (x,y) within r */
    randomNear(x, y, r) { for (let k = 0; k < 20; k++) { const nx = LW.clamp((x + this.rng.int(-r, r)) | 0, 0, this.w - 1), ny = LW.clamp((y + this.rng.int(-r, r)) | 0, 0, this.h - 1); const i = this.idx(nx, ny); if (this.isPassable(i)) return i; } return this.idx(x | 0, y | 0); }

    get population() { return this.agents.size; }
    get year() { return LW.Time.year(this.tick); }

    /** Ids of alive agents in a stable order (insertion). */
    agentList() { return [...this.agents.values()]; }
  }

  LW.World = World;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== world/weather.js ===== */
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
      // az elmúlt nap csapadékos tickjeinek aránya (a hó napi léptékben, egyenletesen gyűlik — nem csíkokban)
      this.precipTicks = (this.precipTicks || 0) * (1 - 1 / LW.TIME.TICKS_PER_DAY) + (this.isPrecipitating() ? 1 : 0);
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
    /** Az elmúlt nap mekkora részében esett (0–1). */
    precipFraction() { return Math.min(1, (this.precipTicks || 0) / LW.TIME.TICKS_PER_DAY); }

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
      if ((eff.state === 'rain' || eff.state === 'storm') && tempC < 0.5) return eff.state === 'storm' ? 'Hóvihar' : 'Havazás';
      return { clear: 'Derült', cloudy: 'Felhős', overcast: 'Borult', rain: 'Eső', storm: 'Vihar', fog: 'Köd' }[eff.state];
    }

    toJSON() { return { state: this.state, prevState: this.prevState, intensity: this.intensity, cloud: this.cloud, humidity: this.humidity, wind: this.wind, tempOffset: this.tempOffset, override: this.override, sinceChange: this.sinceChange }; }
    static fromJSON(world, j) { const wx = new Weather(world); Object.assign(wx, j); return wx; }
  }

  LW.Weather = Weather;
  LW.WEATHER_STATES = STATES;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== world/ecology.js ===== */
/* LEVENTE — THE CREATOR · world/ecology.js
 * Vegetation, forests, animals, fish, soil moisture, snow, paths and wildfire.
 * Each tile is updated once per world day (sliced across ticks). (SIMULATION_MODEL.md §4–5)
 */
(function (LW) {
  'use strict';
  const B = LW.BIOME, TPD = LW.TIME.TICKS_PER_DAY;

  const Ecology = {
    init(world) {
      world.burning = world.burning || new Set();
      world.dirtyTiles = world.dirtyTiles || new Set();
      world.fireStats = world.fireStats || { activeSince: -1, burned: 0, cause: null, origin: -1 };
      world.pathAnnounced = world.pathAnnounced || new Set();
    },

    stepSlice(world) {
      const t = world.tiles, n = world.w * world.h, s = world.tick % TPD, cfg = world.cfg.ecology;
      const season = LW.Time.season(world.tick);
      const seasonVeg = [1.0, 1.1, 0.8, 0.35][season];
      const rng = world.rng; const dirty = world.dirtyTiles;
      const precip = world.weather.isPrecipitating(); const pf = world.weather.precipFraction();
      for (let i = s; i < n; i += TPD) {
        const b = t.biome[i];
        const temp = world.tileTemp(i);
        // snow
        const snow0 = t.snow[i];
        if (temp < 0 && (precip || pf > 0.05)) t.snow[i] = Math.min(255, t.snow[i] + Math.round((25 + world.rainAt(i) * 60) * Math.max(pf, precip ? 0.3 : 0)));
        else if (temp > 1.5) t.snow[i] = Math.max(0, t.snow[i] - Math.round(10 + temp * 6));
        if ((snow0 >> 5) !== (t.snow[i] >> 5)) dirty.add(i);
        if (LW.isWaterBiome(b)) {
          if (t.fishCap[i]) { const f = t.fish[i]; t.fish[i] = Math.min(t.fishCap[i], Math.round(f + cfg.fishRegrowth * (f + 2) * (1 - f / (t.fishCap[i] + 1)))); }
          continue;
        }
        // moisture
        const rain = world.rainAt(i);
        let m = t.moist[i] + rain * 40 - Math.max(0, temp) * 0.35 * (1 - world.weather.cloud * 0.5) - t.veg[i] * 0.01 + (world.isFreshNear ? 0 : 0);
        if (t.snow[i] > 0 && temp > 0) m += 6;
        // fresh water keeps its banks wet
        if (this._freshAdjacent(world, i)) m = Math.max(m, 190);
        t.moist[i] = LW.clamp(Math.round(m), 5, 255);
        // burnt countdown
        if (t.burnt[i] > 0) { t.burnt[i] = Math.max(0, t.burnt[i] - 2); if (t.burnt[i] === 0) dirty.add(i); t.fert[i] = Math.min(255, t.fert[i] + 1); continue; }
        // vegetation (edible)
        const veg0 = t.veg[i];
        const cap = t.vegCap[i] * seasonVeg * (0.45 + 0.55 * t.moist[i] / 255);
        if (cap > 0) {
          let v = t.veg[i];
          // logisztikus növekedés + a szomszédos földek magjai: a lelegelt föld is újraéled (nem ragad nullán)
          v += cfg.vegRegrowth * v * (1 - v / Math.max(1, cap)) + (v < cap ? 0.7 * seasonVeg : 0);
          if (v > cap) v -= (v - cap) * 0.15;
          t.veg[i] = LW.clamp(Math.round(v), 0, 255);
        }
        // trees
        const tr0 = t.trees[i];
        if (t.treeCap[i] > 0) {
          let tr = t.trees[i];
          if (tr < 2) { if (rng.chance(0.02)) tr += 1; }
          else tr += cfg.treeRegrowth * (t.treeCap[i] - tr) * (0.5 + t.moist[i] / 510);
          t.trees[i] = LW.clamp(Math.round(tr), 0, 255);
        }
        // animals: settlements push wildlife away
        if (t.animalCap[i] > 0) {
          let a = t.animals[i]; const pressure = t.shade[i] ? 0.3 : 1;
          const capA = t.animalCap[i] * pressure * (season === 3 ? 0.6 : 1);
          if (a < 2) { if (rng.chance(0.05)) a += 1; } else a += cfg.animalRegrowth * a * (1 - a / Math.max(1, capA));
          if (a > capA) a -= (a - capA) * 0.1;
          t.animals[i] = LW.clamp(Math.round(a), 0, 255);
        }
        // soil fertility recovers slowly under vegetation
        if (t.veg[i] > 40 && t.fert[i] < 255 && rng.chance(0.05)) t.fert[i]++;
        // paths decay
        if (t.traffic[i] > 0) { t.traffic[i] = Math.floor(t.traffic[i] * (1 - world.cfg.paths.decayPerDay)); this.updatePathTier(world, i); }
        if ((veg0 >> 5) !== (t.veg[i] >> 5) || (tr0 >> 5) !== (t.trees[i] >> 5)) dirty.add(i);
      }
    },

    _freshAdjacent(world, i) {
      const x = i % world.w, y = (i / world.w) | 0; const t = world.tiles;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h) continue; if (LW.isFreshBiome(t.biome[ny * world.w + nx])) return true; }
      return false;
    },

    /** Called when an agent steps on a tile. */
    footfall(world, i) {
      const t = world.tiles; if (LW.isWaterBiome(t.biome[i])) return;
      if (t.traffic[i] < 65000) t.traffic[i] += 1;
      if ((t.traffic[i] & 7) === 0) this.updatePathTier(world, i);
    },
    updatePathTier(world, i) {
      const t = world.tiles, p = world.cfg.paths; const tr = t.traffic[i];
      const tier = tr >= p.road ? 3 : tr >= p.path ? 2 : tr >= p.trail ? 1 : 0;
      // roads need knowledge (Phase 2) — cap at path for now
      const capped = Math.min(tier, 2);
      if (capped !== t.path[i]) { t.path[i] = capped; world.dirtyTiles.add(i); if (capped === 2 && tier === 2 && !world.pathAnnounced.has(i)) { world.pathAnnounced.add(i); if (world.pathAnnounced.size === 1 || world.pathAnnounced.size % 25 === 0) world.events.emit('PathFormed', { tick: world.tick, tile: i }); } }
    },

    // ---------------- fire
    ignite(world, i, cause) {
      const t = world.tiles; if (LW.isWaterBiome(t.biome[i]) || t.fire[i] || t.burnt[i]) return false;
      if (t.trees[i] + t.veg[i] < 15 && !world.buildingAt(i)) return false;
      t.fire[i] = 200; world.burning.add(i); world.dirtyTiles.add(i);
      if (world.fireStats.activeSince < 0) { world.fireStats = { activeSince: world.tick, burned: 0, cause, origin: i }; world.events.emit('WildfireStarted', { tick: world.tick, tile: i, cause }); }
      return true;
    },
    stepFire(world) {
      if (!world.burning.size) return;
      const t = world.tiles, rng = world.rng, cfg = world.cfg.ecology, w = world.w, h = world.h; const wind = world.weather.wind;
      const toIgnite = [];
      for (const i of world.burning) {
        const rain = world.rainAt(i);
        t.fire[i] = Math.max(0, t.fire[i] - 6 - Math.round(rain * 30));
        t.trees[i] = Math.max(0, t.trees[i] - 5); t.veg[i] = Math.max(0, t.veg[i] - 10); t.animals[i] = Math.max(0, t.animals[i] - 6);
        const b = world.buildingAt(i); if (b) LW.Buildings.damage(world, b, 0.06, 'tűz');
        const x = i % w, y = (i / w) | 0;
        const fuelHere = t.fire[i] / 255;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx; if (t.fire[j] || t.burnt[j] || LW.isWaterBiome(t.biome[j])) continue;
          const fuel = Math.min(1, (t.trees[j] + t.veg[j] * 0.5) / 200); if (fuel < 0.05) continue;
          const dry = Math.max(0.1, 1 - t.moist[j] / 255) * (t.snow[j] ? 0.1 : 1);
          const align = 1 + wind.speed * (dx * wind.x + dy * wind.y) * 1.2;
          const p = cfg.fireSpread * fuelHere * fuel * dry * Math.max(0.2, align) * (1 - world.rainAt(j));
          if (rng.chance(p)) toIgnite.push(j);
        }
        if (t.fire[i] === 0) { world.burning.delete(i); t.burnt[i] = 160; t.trees[i] = Math.min(t.trees[i], 3); t.veg[i] = 0; world.fireStats.burned++; world.dirtyTiles.add(i); }
      }
      for (const j of toIgnite) { t.fire[j] = 160; world.burning.add(j); world.dirtyTiles.add(j); }
      if (!world.burning.size && world.fireStats.activeSince >= 0) { world.events.emit('WildfireEnded', { tick: world.tick, burned: world.fireStats.burned, cause: world.fireStats.cause, tile: world.fireStats.origin }); world.fireStats.activeSince = -1; }
    },

    /** Harvest helpers — return quantity actually taken */
    take(world, i, field, want) { const t = world.tiles; const have = t[field][i]; const got = Math.min(have, want); t[field][i] = have - got; if (got && (field === 'veg' || field === 'trees') && ((have >> 5) !== ((have - got) >> 5))) world.dirtyTiles.add(i); return got; },
  };

  LW.Ecology = Ecology;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== tech/discoveries.js ===== */
/* LEVENTE — THE CREATOR · tech/discoveries.js
 * Technology Discovery Engine: definitions, eligibility, attempts, accidents,
 * observation hints, learning and knowledge loss. Knowledge is per person.
 * (TECHNOLOGY_MODEL.md §1–§3)
 */
(function (LW) {
  'use strict';

  const D = {
    fire_awareness: { name: 'A tűz ismerete', era: 'primitive', hidden: true, desc: 'Látott már tüzet, és megértette, hogy az birtokolható.' },
    clay_awareness: { name: 'Az agyag ismerete', era: 'primitive', hidden: true, desc: 'Tudja, hogy a víz menti puha föld formázható.' },
    foraging_lore: { name: 'Növényismeret', era: 'primitive', prereq: [], items: { berries: 3, roots: 2 }, difficulty: 0.35, need: 'food', skill: 'foraging', minSkill: 0.12, wow: 'Első növényismeret', desc: 'Melyik növény táplál, melyik árt. Jobb gyűjtögetés.' },
    stone_knapping: { name: 'Kőszerszám', era: 'primitive', prereq: [], items: { stone: 2, flint: 1 }, difficulty: 0.5, need: 'food', skill: 'crafting', minSkill: 0.1, accidents: [{ during: 'gather:stone', chance: 0.01 }], recipes: ['handaxe'], wow: 'Első kőszerszám', desc: 'Kő a kőhöz ütve élt ad.' },
    fire_making: { name: 'Tűzgyújtás', era: 'primitive', prereq: [], items: { wood: 3 }, difficulty: 0.72, boosts: { fire_awareness: 0.25, stone_knapping: 0.1 }, need: 'warmth', skill: 'crafting', accidents: [{ during: 'craft:handaxe', chance: 0.03 }, { during: 'gather:stone', chance: 0.004 }], buildings: ['campfire'], wow: 'Első tűz', desc: 'A tüzet nemcsak találni, csinálni is lehet.' },
    cooking: { name: 'Főzés', era: 'primitive', prereq: ['fire_making'], itemsAny: [{ meat_raw: 1 }, { fish_raw: 1 }], nearby: 'fire', difficulty: 0.4, need: 'food', skill: 'crafting', accidents: [{ during: 'rest:fire', chance: 0.04, itemsAny: [{ meat_raw: 1 }, { fish_raw: 1 }] }], recipes: ['meat_cooked', 'fish_cooked'], wow: 'Első főtt étel', desc: 'A tűz fölött a hús biztonságosabb, táplálóbb, tovább eláll.' },
    shelter_building: { name: 'Fedezéképítés', era: 'primitive', prereq: [], items: { wood: 4, fiber: 2 }, difficulty: 0.45, need: 'warmth', skill: 'building', buildings: ['lean_to'], wow: 'Első fedezék', desc: 'Egymásnak támasztott ágak kizárják az esőt és a szelet.' },
    fiber_twisting: { name: 'Kötélfonás', era: 'primitive', prereq: [], items: { fiber: 3 }, difficulty: 0.4, skill: 'crafting', minSkill: 0.1, desc: 'A sodort növényi rost kötelet ad.' },
    basket_weaving: { name: 'Kosárfonás', era: 'primitive', prereq: ['fiber_twisting'], items: { fiber: 6 }, difficulty: 0.55, need: 'food', skill: 'crafting', minSkill: 0.2, recipes: ['basket'], wow: 'Első kosár', desc: 'Többet vihetsz, többet gyűjthetsz.' },
    spear_making: { name: 'Lándzsakészítés', era: 'primitive', prereq: ['stone_knapping'], items: { wood: 1, flint: 1, fiber: 1 }, difficulty: 0.5, need: 'food', skill: 'crafting', minSkill: 0.2, recipes: ['spear'], wow: 'Első lándzsakészítés', desc: 'Éles kő egy nyélen. Megkezdődhet a vadászat.' },
    fishing: { name: 'Halászat', era: 'primitive', prereq: [], items: { wood: 1, fiber: 1 }, nearby: 'water', difficulty: 0.5, need: 'food', skill: 'hunting', minSkill: 0.05, wow: 'Első fogás', desc: 'A víz tele van étellel annak, aki megtanulja kivenni.' },
    woodworking: { name: 'Famegmunkálás', era: 'primitive', prereq: ['stone_knapping'], items: { wood: 4 }, difficulty: 0.55, skill: 'crafting', minSkill: 0.3, desc: 'Fa formázása kőszerszámmal.' },
    hut_construction: { name: 'Kunyhóépítés', era: 'primitive', prereq: ['shelter_building', 'woodworking', 'fiber_twisting'], items: { wood: 6, fiber: 2 }, difficulty: 0.75, need: 'warmth', skill: 'building', minSkill: 0.35, buildings: ['hut'], wow: 'Első kunyhó', desc: 'Igazi otthon: falak, tető, hely a holminak.' },
    digging: { name: 'Ásás', era: 'primitive', prereq: ['stone_knapping'], items: { stone: 1, wood: 1 }, difficulty: 0.5, skill: 'gathering', minSkill: 0.35, desc: 'Ami a föld alatt van, elérhető.' },
    pottery: { name: 'Fazekasság', era: 'primitive', prereq: ['fire_making', 'clay_awareness'], items: { clay: 4 }, nearby: 'fire', difficulty: 0.8, skill: 'crafting', minSkill: 0.4, accidents: [{ during: 'rest:fire', chance: 0.01, items: { clay: 1 } }], recipes: ['pot'], wow: 'Első agyagedény', desc: 'A tűzben keményedett agyag vizet és gabonát tart.' },
    food_drying: { name: 'Tartósítás', era: 'primitive', prereq: ['fire_making'], itemsAny: [{ meat_raw: 2 }, { fish_raw: 2 }, { berries: 4 }], difficulty: 0.6, need: 'food', skill: 'crafting', minSkill: 0.3, recipes: ['dried_food'], buildings: ['storage_pit'], wow: 'Első éléskamra', desc: 'A szárított étel kibírja a telet.' },
    hide_working: { name: 'Bőrmegmunkálás', era: 'primitive', prereq: ['stone_knapping'], items: { hide: 2 }, difficulty: 0.55, need: 'warmth', skill: 'crafting', minSkill: 0.3, recipes: ['clothes'], wow: 'Első ruha', desc: 'Az állatbőrből meleg ruha lesz.' },
    seed_planting: { name: 'Földművelés', era: 'neolithic', prereq: ['foraging_lore', 'digging'], items: { roots: 2, berries: 2 }, difficulty: 0.92, need: 'food', skill: 'foraging', minSkill: 0.55, buildings: ['farm_plot'], wow: 'Első szántó', desc: 'A földbe tett mag ételként tér vissza.' },
    herbal_medicine: { name: 'Gyógynövények', era: 'primitive', prereq: ['foraging_lore'], items: { fiber: 2, berries: 2 }, difficulty: 0.7, skill: 'foraging', minSkill: 0.35, wow: 'Első gyógyító', desc: 'Néhány növény sebet zár és lázat csillapít.' },
    stone_masonry: { name: 'Kőművesség', era: 'neolithic', prereq: ['hut_construction', 'digging'], items: { stone: 8, clay: 2 }, difficulty: 0.92, skill: 'building', minSkill: 0.6, buildings: ['stone_house'], wow: 'Első kőház', desc: 'Az agyaggal kötött, illesztett kő nemzedékeken át áll.' },
    ore_lore_copper: { name: 'A zöld kő ismerete', era: 'neolithic', hidden: true, desc: 'Furcsa, zölderes követ találtak. Még senki sem tudja, mire jó.' },
    ore_lore_tin: { name: 'A szürke kő ismerete', era: 'neolithic', hidden: true, desc: 'Nehéz szürke kő. Használata ismeretlen.' },
    ore_lore_iron: { name: 'A vörös kő ismerete', era: 'neolithic', hidden: true, desc: 'Rozsdavörös, nehéz, egyelőre haszontalan kő.' },
    ore_lore_coal: { name: 'Az égő kő ismerete', era: 'neolithic', hidden: true, desc: 'Fekete kő, amely ég.' },
    ore_lore_gold: { name: 'A fénylő kő ismerete', era: 'neolithic', hidden: true, desc: 'Puha sárga kő, amely sosem homályosul. Gyönyörű.' },
  };
  for (const id in D) D[id].id = id;

  const RECIPES = {
    handaxe: { out: { handaxe: 1 }, inp: { stone: 2, flint: 1 }, ticks: 12, tech: 'stone_knapping', skill: 'crafting', tag: 'craft:handaxe' },
    spear: { out: { spear: 1 }, inp: { wood: 1, flint: 1, fiber: 1 }, ticks: 10, tech: 'spear_making', skill: 'crafting', tag: 'craft:spear' },
    basket: { out: { basket: 1 }, inp: { fiber: 6 }, ticks: 16, tech: 'basket_weaving', skill: 'crafting', tag: 'craft:basket' },
    pot: { out: { pot: 1 }, inp: { clay: 4 }, ticks: 20, tech: 'pottery', nearby: 'fire', skill: 'crafting', tag: 'craft:pot' },
    meat_cooked: { out: { meat_cooked: 1 }, inp: { meat_raw: 1 }, ticks: 3, tech: 'cooking', nearby: 'fire', skill: 'crafting', tag: 'craft:cook' },
    fish_cooked: { out: { fish_cooked: 1 }, inp: { fish_raw: 1 }, ticks: 3, tech: 'cooking', nearby: 'fire', skill: 'crafting', tag: 'craft:cook' },
    dried_food: { out: { dried_food: 2 }, inpAny: [{ meat_raw: 2 }, { fish_raw: 2 }, { berries: 4 }], ticks: 24, tech: 'food_drying', nearby: 'fire', skill: 'crafting', tag: 'craft:dry' },
    clothes: { out: { clothes: 1 }, inp: { hide: 2, fiber: 1 }, ticks: 20, tech: 'hide_working', skill: 'crafting', tag: 'craft:clothes' },
  };
  LW.ITEMS.clothes = { weight: 1.0, label: 'Bőrruha', tool: true, warmth: 8 };

  /** Where an item can be obtained from the world (POI kind) — null = only via crafting/inventory. */
  const SOURCE = { berries: 'food', roots: 'food', wood: 'wood', stone: 'stone', flint: 'flint', fiber: 'fiber', clay: 'clay', meat_raw: 'animals', fish_raw: 'fish' };

  const Tech = {
    D, RECIPES, SOURCE,
    knows(a, id) { return a.knowledge.techs.has(id); },
    /** Discoveries an agent could try right now (prereqs known, not yet known, not hidden). */
    eligible(world, a) {
      const out = []; let pop = null;
      for (const id in D) {
        const d = D[id]; if (d.hidden || a.knowledge.techs.has(id)) continue;
        if (d.prereq && !d.prereq.every((p) => a.knowledge.techs.has(p))) continue;
        if (d.minPop) { if (pop == null) pop = world.agentsNear(a.x, a.y, 24, a.id).length + 1; if (pop < d.minPop) continue; } // a nagy dolgokhoz sok ember kell
        if (d.minSkill && (a.skills[d.skill] || 0) + (a.knowledge.progress[id] || 0) * 0.3 < d.minSkill) continue; // experience must come first
        out.push(id);
      }
      return out;
    },
    /** Items still needed for an attempt (best option among alternatives). */
    missingItems(a, d) {
      if (d.items) return diff(a.inv, d.items);
      if (d.itemsAny) { let best = null; for (const opt of d.itemsAny) { const m = diff(a.inv, opt); if (!best || count(m) < count(best)) best = m; if (count(m) === 0) break; } return best || {}; }
      return {};
    },
    hasItems(a, d) { return count(this.missingItems(a, d)) === 0; },
    consumeAttemptItems(a, d) {
      const use = d.items || (d.itemsAny && d.itemsAny.find((opt) => count(diff(a.inv, opt)) === 0)) || {};
      for (const k in use) LW.Agents.removeItem(a, k, Math.ceil(use[k] * 0.5)); // experiments waste half the materials
    },
    /** Probability of success for one completed attempt. */
    successChance(world, a, d) {
      const p = a.personality; const cfg = world.cfg.tech;
      const skill = d.skill ? (a.skills[d.skill] || 0) : 0;
      const need = d.need ? (1 - (a.needs[d.need] ?? 1)) : 0;
      const prog = a.knowledge.progress[d.id] || 0;
      let difficulty = d.difficulty; if (d.boosts) for (const k in d.boosts) if (a.knowledge.techs.has(k)) difficulty -= d.boosts[k];
      const era = LW.Tree ? LW.Tree.eraOf(d.id) : 0; const inst = LW.Tree ? LW.Tree.buildingBonus(world, a.x, a.y, 'discovery', 16) : 0;
      return LW.clamp01(cfg.experimentBase * (1 - Math.max(0.05, difficulty)) * (0.5 + p.intelligence) * (0.5 + p.creativity) * (1 + 0.6 * skill) * (1 + need) * (1 + 1.5 * prog) * (1 + (LW.Tech.fx ? LW.Tech.fx(world, a).discovery : 0)) * (1 + inst) * (era >= 5 ? 1.6 : 1));
    },
    attempt(world, a, id) {
      const d = D[id]; if (!d || a.knowledge.techs.has(id)) return false;
      const pr = this.successChance(world, a, d);
      this.consumeAttemptItems(a, d);
      if (d.skill) LW.Agents.practice(a, d.skill, 2);
      if (world.rng.chance(pr)) { this.learn(world, a, id, 'discovery'); return true; }
      a.knowledge.progress[id] = Math.min(0.95, (a.knowledge.progress[id] || 0) + 0.06);
      a.emotions.stress = Math.min(1, a.emotions.stress + 0.05);
      return false;
    },
    /** Serendipity: called by actions with a tag like 'gather:stone' */
    accident(world, a, tag) {
      const cfg = world.cfg.tech;
      for (const id in D) {
        const d = D[id]; if (!d.accidents || a.knowledge.techs.has(id)) continue;
        if (d.prereq && !d.prereq.every((p) => a.knowledge.techs.has(p))) continue;
        for (const acc of d.accidents) {
          if (acc.during !== tag) continue;
          if (acc.needs && !acc.needs.every((p) => a.knowledge.techs.has(p))) continue;
          if (acc.items && count(diff(a.inv, acc.items)) > 0) continue;
          if (acc.itemsAny && !acc.itemsAny.some((opt) => count(diff(a.inv, opt)) === 0)) continue;
          if (world.rng.chance(acc.chance * cfg.accidentMultiplier * (0.5 + a.personality.curiosity))) { this.learn(world, a, id, 'accident'); return id; }
        }
      }
      return null;
    },
    /** Observation of phenomena grants hidden knowledge (e.g. seeing fire). */
    observe(world, a, what) {
      if (what === 'fire' && !a.knowledge.techs.has('fire_awareness')) { this.learn(world, a, 'fire_awareness', 'observation'); return true; }
      if (what === 'clay' && !a.knowledge.techs.has('clay_awareness')) { this.learn(world, a, 'clay_awareness', 'observation'); return true; }
      return false;
    },
    learn(world, a, id, source, teacher) {
      const d = D[id]; if (!d || a.knowledge.techs.has(id)) return;
      a.knowledge.techs.add(id); delete a.knowledge.progress[id];
      const first = !world.firsts || !world.firsts['tech:' + id];
      const ev = { tick: world.tick, agentId: a.id, tech: id, source, teacherId: teacher ? teacher.id : undefined, first, tile: world.idx(a.x | 0, a.y | 0) };
      if (source === 'taught' || source === 'observed_practice' || source === 'inherited' || source === 'read') world.events.emit('KnowledgeTransferred', ev);
      else { world.stats.discoveries++; world.events.emit('DiscoveryMade', ev); }
      if (!d.hidden && source !== 'taught') { LW.Agents.memory(world, a, { type: 'discovery', text: `rájöttem: ${d.name.toLowerCase()}`, importance: first ? 0.95 : 0.7, emotion: 'pride', intensity: first ? 0.9 : 0.6, tech: id }); a.emotions.pride = Math.min(1, a.emotions.pride + 0.6); a.emotions.joy = Math.min(1, a.emotions.joy + 0.4); a.needs.curiosity = 1; }
    },
    /** Union of everything anyone alive knows. */
    worldKnowledge(world) { const s = new Set(); for (const a of world.agents.values()) for (const t of a.knowledge.techs) s.add(t); return s; },
    techLevel(known) {
      const has = (k) => known.has(k);
      if (has('stone_masonry') && has('seed_planting')) return 'Újkőkor';
      if (has('seed_planting') || (has('pottery') && has('hut_construction'))) return 'Korai újkőkor';
      if (has('stone_knapping') && has('fire_making')) return 'Kőkor';
      if (has('stone_knapping') || has('fire_making') || has('shelter_building')) return 'Korai kőkor';
      return 'Kezdetleges';
    },
    /** Elder forgetting & knowledge loss (called yearly per agent). */
    forgetCheck(world, a) {
      const age = LW.Time.ageYears(a.bornTick, world.tick); if (age < a.genes.physiology.longevity - 6) return;
      for (const id of [...a.knowledge.techs]) {
        if (D[id].hidden) continue;
        if (world.rng.chance(world.cfg.tech.forgetPerYearElder * (1 - a.health))) { a.knowledge.techs.delete(id); this.checkLost(world, id, a); }
      }
    },
    checkLost(world, id, lastHolder) {
      for (const o of world.agents.values()) if (o.knowledge.techs.has(id)) return;
      for (const b of world.buildings.values()) if (b.records && b.progress >= 1 && b.records.includes(id)) return; // leírva megmarad
      if (world.firsts && world.firsts['tech:' + id]) world.events.emit('KnowledgeLost', { tick: world.tick, tech: id, agentId: lastHolder ? lastHolder.id : undefined });
    },
  };

  function diff(inv, need) { const m = {}; for (const k in need) { const have = inv[k] || 0; if (have < need[k]) m[k] = need[k] - have; } return m; }
  function count(m) { let c = 0; for (const k in m) c += m[k]; return c; }

  LW.Tech = Tech;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== buildings/buildings.js ===== */
/* LEVENTE — THE CREATOR · buildings/buildings.js
 * Buildings are functional objects: warmth, light, safety, sleep quality, storage,
 * farming. Construction needs hauled materials and work; they decay, burn and are inherited.
 */
(function (LW) {
  'use strict';
  const TPD = LW.TIME.TICKS_PER_DAY;

  const DEFS = {
    campfire:    { label: 'Tábortűz', cost: { wood: 3 }, ticks: 8, warmth: 14, light: 1, safety: 0.5, radius: 2, fuelTicks: TPD * 2, tech: 'fire_making', lifeDays: 120 },
    lean_to:     { label: 'Fedezék', cost: { wood: 6, fiber: 2 }, ticks: 40, insulation: 9, safety: 0.3, sleep: 0.5, capacity: 3, storage: 10, dwelling: true, tech: 'shelter_building', lifeDays: 420 },
    hut:         { label: 'Kunyhó', cost: { wood: 14, fiber: 6, stone: 2 }, ticks: 160, insulation: 14, safety: 0.6, sleep: 0.8, capacity: 5, storage: 40, dwelling: true, tech: 'hut_construction', lifeDays: 2400, light: 0.4 },
    stone_house: { label: 'Kőház', cost: { stone: 24, wood: 10, clay: 6 }, ticks: 400, insulation: 18, safety: 0.85, sleep: 0.95, capacity: 6, storage: 80, dwelling: true, tech: 'stone_masonry', lifeDays: 9000, light: 0.6 },
    storage_pit: { label: 'Tárolóverem', cost: { wood: 4, stone: 2 }, ticks: 40, storage: 60, preserve: 0.5, tech: 'food_drying', lifeDays: 800 },
    farm_plot:   { label: 'Szántó', cost: { wood: 2 }, ticks: 60, farm: true, tech: 'seed_planting', lifeDays: 2400 },
    monolith:    { label: 'Monolit', cost: {}, ticks: 0, divine: true, lifeDays: 1e9, light: 0.3 },
    light:       { label: 'Fényoszlop', cost: {}, ticks: 0, divine: true, lifeDays: 3, light: 1.5 },
    orb:         { label: 'Lebegő gömb', cost: {}, ticks: 0, divine: true, lifeDays: 7, light: 0.8 },
    avatar:      { label: 'A Teremtő', cost: {}, ticks: 0, divine: true, lifeDays: 2, light: 1.0 },
  };

  const Buildings = {
    DEFS,
    /** Start a construction site. Divine kinds are completed instantly. */
    create(world, kind, x, y, ownerId) {
      const def = DEFS[kind]; let bw = def.size ? def.size[0] : 1, bh = def.size ? def.size[1] : 1, bdir = null;
      if (def.bridge) { const g = world._bridgeSites && world._bridgeSites.get(world.idx(x | 0, y | 0)); if (g) { x = g.x; y = g.y; bw = g.w; bh = g.h; bdir = g.dir; world._bridgeSites.delete(g.shore); } } // a hely a part, az épület a vízen
      const b = { id: world.nextIds.building++, kind, x: x | 0, y: y | 0, w: bw, h: bh, ...(bdir ? { dir: bdir } : {}), ownerId: ownerId ?? null, residents: [], progress: def.ticks === 0 ? 1 : 0, delivered: {}, hp: 1, storage: {}, startedTick: world.tick, builtTick: def.ticks === 0 ? world.tick : -1, settlementId: null };
      if (def.records) b.records = [];
      if (kind === 'campfire') { b.fuel = def.fuelTicks; b.lit = true; }
      if (def.farm) { b.crop = 0; b.planted = false; }
      world.addBuilding(b);
      world.events.emit(def.divine ? 'ManifestationPlaced' : 'BuildingStarted', { tick: world.tick, buildingId: b.id, kind, agentId: ownerId, tile: world.idx(b.x, b.y) });
      return b;
    },
    def(b) { return DEFS[b.kind]; },
    isComplete(b) { return b.progress >= 1; },
    missing(b) { const def = DEFS[b.kind]; const m = {}; for (const k in def.cost) { const d = (b.delivered[k] || 0); if (d < def.cost[k]) m[k] = def.cost[k] - d; } return m; },
    materialsComplete(b) { for (const k in this.missing(b)) return false; return true; },
    deliver(world, b, a) {
      const m = this.missing(b); let any = false;
      for (const k in m) { const have = a.inv[k] || 0; if (have > 0) { const q = Math.min(have, m[k]); LW.Agents.removeItem(a, k, q); b.delivered[k] = (b.delivered[k] || 0) + q; any = true; } }
      return any;
    },
    /** One tick of construction work by agent a. Returns true when completed on this call. */
    work(world, b, a) {
      const def = DEFS[b.kind]; if (b.progress >= 1) return false;
      const skill = a.skills.building || 0; const rate = (1 / def.ticks) * (0.6 + 0.8 * skill) * (a.needs.energy < 0.2 ? 0.5 : 1) * LW.Tech.mult(world, a, 'build');
      b.progress = Math.min(1, b.progress + rate);
      LW.Agents.practice(a, 'building', 1);
      if (b.progress >= 1) { this.complete(world, b, a); return true; }
      return false;
    },
    /** Finalize a construction (shared by detailed and macro simulation). */
    complete(world, b, a) {
      const def = DEFS[b.kind];
      {
        b.progress = 1; b.builtTick = world.tick; world.stats.buildingsBuilt++; for (const ti of world.buildingTiles(b)) world.dirtyTiles.add(ti);
        if (def.water) for (const o of world.agentsNear(b.x + 0.5, b.y + 0.5, 14)) LW.Agents.rememberPlace(world, o, 'water', world.idx(b.x, b.y), 255);
        if (def.perennial) { b.planted = true; b.crop = 0; }
        if (def.dwelling) { const cur = a.home != null ? world.buildings.get(a.home) : null; if (!cur) this.moveIn(world, b, a); else if ((DEFS[cur.kind].tier || 0) < (def.tier || 0)) { const movers = [a.id, ...cur.residents.filter((id) => id !== a.id)]; for (const rid of movers) { const r = world.agents.get(rid); if (!r) continue; if (b.residents.length >= (def.capacity || 1)) break; this.moveOut(world, r); this.moveIn(world, b, r); } } } // jobb otthon: az egész háztartás átköltözik
        if (def.dwelling && a.partner != null) { const p = world.agents.get(a.partner); if (p && p.home == null) this.moveIn(world, b, p); }
        if (def.dwelling) for (const cid of a.children) { const c = world.agents.get(cid); if (c && c.home == null && LW.Time.ageYears(c.bornTick, world.tick) < world.cfg.agents.adultAge) this.moveIn(world, b, c); }
        if (b.kind === 'campfire') { b.fuel = def.fuelTicks; b.lit = true; }
        if (def.bridge && LW.Crossings) LW.Crossings.onComplete(world, b, a);
        world.events.emit('BuildingCompleted', { tick: world.tick, buildingId: b.id, kind: b.kind, agentId: a.id, tile: world.idx(b.x, b.y), first: !world.firsts || !world.firsts['building:' + b.kind] });
        LW.Agents.memory(world, a, { type: 'built', text: `felépítettem: ${def.label.toLowerCase()}`, importance: 0.6, emotion: 'pride', intensity: 0.6, buildingId: b.id });
        a.emotions.pride = Math.min(1, a.emotions.pride + 0.4);
        return true;
      }
      return false;
    },
    moveIn(world, b, a) {
      const def = DEFS[b.kind]; if (!def.dwelling) return false;
      if (b.residents.length >= def.capacity && !b.residents.includes(a.id)) return false;
      if (a.home != null && a.home !== b.id) this.moveOut(world, a);
      if (!b.residents.includes(a.id)) b.residents.push(a.id);
      a.home = b.id; if (b.ownerId == null) b.ownerId = a.id;
      return true;
    },
    moveOut(world, a) { if (a.home == null) return; const b = world.buildings.get(a.home); if (b) { const i = b.residents.indexOf(a.id); if (i >= 0) b.residents.splice(i, 1); } a.home = null; },
    /** Damage from fire, quake, decay. */
    damage(world, b, amount, cause) {
      if (DEFS[b.kind].divine) return;
      b.hp -= amount;
      if (b.hp <= 0) this.destroy(world, b, cause);
    },
    destroy(world, b, cause) {
      const def = DEFS[b.kind];
      for (const rid of b.residents) { const r = world.agents.get(rid); if (r) { r.home = null; LW.Agents.memory(world, r, { type: 'loss', text: `elvesztettem az otthonom (${cause})`, importance: 0.7, emotion: 'sadness', intensity: 0.7 }); r.emotions.sadness = Math.min(1, r.emotions.sadness + 0.5); if (cause === 'tűz') r.emotions.fear = Math.min(1, r.emotions.fear + 0.5); } }
      // drop stored items on the ground
      const i = world.idx(b.x, b.y); world.ground = world.ground || new Map(); const g = world.ground.get(i) || {}; for (const k in b.storage) g[k] = (g[k] || 0) + Math.floor(b.storage[k] * (cause === 'tűz' ? 0.2 : 0.8)); world.ground.set(i, g);
      if (def.bridge && LW.Crossings) LW.Crossings.onDestroy(world, b);
      world.removeBuilding(b.id); world.dirtyTiles.add(i);
      world.events.emit(def.divine ? 'ManifestationEnded' : 'BuildingDestroyed', { tick: world.tick, buildingId: b.id, kind: b.kind, cause, tile: i, ownerId: b.ownerId });
    },
    transferOwnership(world, fromAgent, toId) { for (const b of world.buildings.values()) if (b.ownerId === fromAgent.id) b.ownerId = toId; },

    /** Per-tick maintenance; daily decay and farms in slices. */
    step(world) {
      const s = world.tick % TPD;
      for (const b of world.buildings.values()) {
        const def = DEFS[b.kind];
        if (b.kind === 'campfire' && b.lit && b.progress >= 1) { b.fuel--; if (b.fuel <= 0) { b.lit = false; world.dirtyTiles.add(world.idx(b.x, b.y)); world.events.emit('FireWentOut', { tick: world.tick, buildingId: b.id, tile: world.idx(b.x, b.y) }); } }
        if ((b.id % TPD) === s) { // once per day per building
          if (b.progress >= 1 || def.divine) { b.hp -= (b.kind === 'campfire' && !b.lit ? 8 : 1) / def.lifeDays; if (b.hp <= 0) { this.destroy(world, b, def.divine ? 'elhalványult' : 'elkorhadt'); continue; } } // a kihűlt tűzhely hamar elenyészik
          else if (world.tick - b.startedTick > TPD * 200) { this.destroy(world, b, 'félbehagyták'); continue; }
          if (def.farm && b.progress >= 1 && b.planted) {
            const i = world.idx(b.x, b.y), t = world.tiles; const season = LW.Time.season(world.tick);
            const irr = world.buildingsNear(b.x, b.y, 10).some((o) => o.progress >= 1 && DEFS[o.kind].irrigation) ? 1.4 : 1;
            const g = (def.cropDays ? 1 / def.cropDays : 0.014) * (0.3 + 0.7 * t.fert[i] / 255) * Math.max(0.3 + 0.7 * t.moist[i] / 255, irr > 1 ? 0.9 : 0) * [1, 1.1, 0.6, 0][season] * irr;
            b.crop = Math.min(1, b.crop + g);
            if (season === 3 && world.tileTemp(i) < -2 && world.rng.chance(0.1)) { b.crop *= 0.5; }
          }
          // storage spoilage
          if (def.storage) LW.Agents.spoil(world, b.storage, def.preserve || 1);
        }
      }
    },
    refuel(world, b, a) { if (b.kind !== 'campfire') return false; const q = Math.min(a.inv.wood || 0, 3); if (q <= 0) return false; LW.Agents.removeItem(a, 'wood', q); b.fuel = Math.min(DEFS.campfire.fuelTicks * 1.5, (b.fuel > 0 ? b.fuel : 0) + q * (DEFS.campfire.fuelTicks / 3)); if (!b.lit) { b.lit = true; world.dirtyTiles.add(world.idx(b.x, b.y)); } return true; },

    /** Environmental effects at a position: warmth (°C bonus), light, safety, inside dwelling */
    effectsAt(world, x, y, agent) {
      let warmth = 0, light = 0, safety = 0, inside = null, fire = null;
      for (const b of world.buildingsNear(x, y, 3)) {
        const def = DEFS[b.kind]; if (b.progress < 1) continue;
        const d = LW.dist(x, y, b.x, b.y);
        if (b.kind === 'campfire' && b.lit && d <= def.radius + 0.5) { warmth = Math.max(warmth, def.warmth * (1 - d / (def.radius + 1))); light = Math.max(light, 1 - d / 3); safety = Math.max(safety, def.safety); fire = b; }
        if (def.dwelling && d <= 0.75 && (b.residents.includes(agent ? agent.id : -1) || b.residents.length < def.capacity)) { inside = b; warmth += def.insulation; safety = Math.max(safety, def.safety); }
      }
      // a fire kept right by the dwelling heats it
      if (inside && !fire) { for (const b of world.buildingsNear(inside.x, inside.y, 3)) if (b.kind === 'campfire' && b.lit && b.progress >= 1 && LW.dist(b.x, b.y, inside.x, inside.y) <= 2.5) { warmth += 8; fire = b; light = Math.max(light, 0.5); break; } }
      return { warmth, light, safety, inside, fire };
    },
    /** A dwelling this agent may sleep in: own home first, then family, then any with room. */
    shelterFor(world, a) {
      if (a.home != null) { const b = world.buildings.get(a.home); if (b && b.progress >= 1) return b; }
      let best = null, bd = 1e9;
      for (const b of world.buildings.values()) { const def = DEFS[b.kind]; if (!def.dwelling || b.progress < 1 || b.residents.length >= def.capacity) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } }
      return best;
    },
    /** Pick a building site near an anchor: passable, unoccupied, not water/mountain, prefers near water & family. */
    /** Hol álljon az ember, hogy egy épületen dolgozzon: a híd esetén a közelebbi hídfő, különben a sarokmező. */
    approach(world, a, b) { const def = DEFS[b.kind]; if (def && def.bridge && LW.Crossings) { const ends = LW.Crossings.ends(world, b); if (ends.length) return ends.sort((p, q) => LW.dist(a.x, a.y, world.xOf(p), world.yOf(p)) - LW.dist(a.x, a.y, world.xOf(q), world.yOf(q)))[0]; } return world.idx(b.x, b.y); },
    /** Elég közel van-e az ember az épület bármelyik mezőjéhez. */
    nearBuilding(world, a, b, r) { const w = b.w || 1, h = b.h || 1; if (w === 1 && h === 1) return LW.dist(a.x, a.y, b.x + 0.5, b.y + 0.5) <= r; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (LW.dist(a.x, a.y, b.x + dx + 0.5, b.y + dy + 0.5) <= r) return true; return false; },
    findSite(world, a, kind) {
      if (DEFS[kind].bridge) { const site = LW.Crossings.candidate(world, a, kind); if (!site) return -1; world._bridgeSites = world._bridgeSites || new Map(); if (world._bridgeSites.size > 200) world._bridgeSites.clear(); world._bridgeSites.set(site.shore, site); return site.shore; }
      const anchor = a.home != null && world.buildings.get(a.home) ? world.buildings.get(a.home) : null;
      const ax = anchor ? anchor.x : a.x | 0, ay = anchor ? anchor.y : a.y | 0;
      const water = LW.Agents.nearestPoi(world, a, 'water');
      let best = -1, bs = -1e9;
      for (let k = 0; k < 40; k++) {
        const def = DEFS[kind]; const sw = def.size ? def.size[0] : 1, sh = def.size ? def.size[1] : 1;
        const r = kind === 'campfire' ? 2 : def.public ? 6 : 4; const x = LW.clamp(ax + world.rng.int(-r, r), 1, world.w - 1 - sw), y = LW.clamp(ay + world.rng.int(-r, r), 1, world.h - 1 - sh);
        const i = world.idx(x, y); let ok = true;
        for (let dy = 0; dy < sh && ok; dy++) for (let dx = 0; dx < sw; dx++) { const j = world.idx(x + dx, y + dy); const bio = world.tiles.biome[j]; if (!world.isPassable(j) || bio === LW.BIOME.RIVER || bio === LW.BIOME.MARSH || bio === LW.BIOME.MOUNTAIN || world.buildingAt(j) || (world.tiles.trees[j] > 120 && kind !== 'campfire')) { ok = false; break; } }
        if (!ok) continue;
        let s = -world.moveCost(i);
        if (water) s -= LW.dist(x, y, water.x, water.y) * 0.15;
        if (anchor) s -= LW.dist(x, y, ax, ay) * 0.2;
        s -= world.buildingsNear(x, y, 1).length * 0.5; // don't crowd
        s += world.buildingsNear(x, y, 5).length * 0.15; // but cluster into camps
        s += world.rng.f() * 0.3;
        if (s > bs) { bs = s; best = i; }
      }
      return best;
    },
  };

  LW.Buildings = Buildings;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== world/crossings.js ===== */
/* LEVENTE — THE CREATOR · world/crossings.js — átkelők: hidak folyón és tengerszoroson, alagút a hegyen át
 * A víz és a csúcs járhatatlan, amíg valaki át nem hidalja. A híd egy vonalnyi mező: attól kezdve járható és olcsó.
 * Hol akarnak hidat? Ahol a túlparton olyan föld van, ahová gyalog nem jutnak el (sziget), vagy ahol egy folyó
 * kettévág egy közösséget. Semmi sincs megírva: a lehetőség a térképből, a vágy a tudásból és a szükségből születik.
 */
(function (LW) {
  'use strict';
  const B = () => LW.Buildings.DEFS; const T = LW.TIME;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const Crossings = {
    /** Járható-e egy mező átkelővel együtt (a világ isPassable ezt hívja). */
    passable(world, i) { return world.tiles.bridge && world.tiles.bridge[i] > 0; },
    /** Az összefüggő szárazföld-darabok címkéi (átkelőkkel együtt); a hidak megépültével újraszámolva. */
    components(world) {
      if (world._comp && world._compGen === (world._crossGen || 0) && world._comp.length === world.w * world.h) return world._comp;
      const w = world.w, h = world.h, n = w * h; const comp = new Int32Array(n); let next = 0; const stack = [];
      for (let s = 0; s < n; s++) {
        if (comp[s] || !world.isPassable(s)) continue; next++; comp[s] = next; stack.push(s);
        while (stack.length) { const i = stack.pop(); const x = i % w, y = (i / w) | 0; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (comp[j] || !world.isPassable(j)) continue; comp[j] = next; stack.push(j); } }
      }
      world._comp = comp; world._compGen = world._crossGen || 0; world._compCount = next; return comp;
    },
    invalidate(world) { world._crossGen = (world._crossGen || 0) + 1; },
    /** Mit hidal át egy fajta: víz (folyó, tó, tenger) vagy hegy (csúcs, hegység). */
    crosses(def, world, i) { const bio = world.tiles.biome[i]; const Bm = LW.BIOME; if (def.over === 'mountain') return bio === Bm.PEAK; if (def.over === 'river') return bio === Bm.RIVER; return bio === Bm.RIVER || bio === Bm.LAKE || bio === Bm.OCEAN; },
    /** Egy jó átkelőhely a közelben: { shore, x, y, w, h, joins, len } vagy null. Emberenként naponta egyszer keres (drága). */
    candidate(world, a, kind) {
      const def = B()[kind]; if (!def || !def.bridge) return null;
      const day = world.tick / T.TICKS_PER_DAY | 0; a._bridgeC = a._bridgeC || {}; const c = a._bridgeC[kind]; if (c && c.day === day) return c.site;
      const site = this.search(world, a.x | 0, a.y | 0, def); a._bridgeC[kind] = { day, site }; return site;
    },
    search(world, ax, ay, def) {
      const w = world.w, h = world.h, t = world.tiles, rng = world.rng; const comp = this.components(world); const span = def.span || 4; const R = 14;
      let best = null, bs = 0;
      for (let k = 0; k < 36; k++) {
        const x = LW.clamp(ax + rng.int(-R, R), 1, w - 2), y = LW.clamp(ay + rng.int(-R, R), 1, h - 2); const i = y * w + x;
        if (!world.isPassable(i) || t.bridge[i]) continue; const own = comp[i];
        if (world.buildingsNear(x, y, 3).some((b) => { const d = B()[b.kind]; return d && d.bridge; })) continue; // egy átkelő elég egy helyre
        for (const [dx, dy] of DIRS) {
          let len = 0, nx = x + dx, ny = y + dy, j = -1, ok = true;
          while (len < span) { if (nx < 0 || ny < 0 || nx >= w || ny >= h) { ok = false; break; } j = ny * w + nx; if (world.isPassable(j) && !t.bridge[j]) break; if (!this.crosses(def, world, j) || t.bridge[j] || world.buildingAt(j)) { ok = false; break; } len++; nx += dx; ny += dy; }
          if (!ok || len === 0 || len >= span || j < 0 || !world.isPassable(j) || t.bridge[j]) continue;
          const joins = comp[j] !== own; let s = joins ? 3 : (def.over === 'river' || t.biome[i + dx + dy * w] === LW.BIOME.RIVER ? 1 : 0); if (!s) continue;
          // a túlpart értéke: fa, növény, ismert lelőhely; és a rövidebb híd jobb
          let value = 0; for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) { const px = nx + xx, py = ny + yy; if (px < 0 || py < 0 || px >= w || py >= h) continue; const q = py * w + px; if (!world.isPassable(q)) continue; value += (t.treeCap[q] + t.vegCap[q]) / 255 * 0.02 + (t.depType[q] ? 0.3 : 0) + (comp[q] === own ? 0 : 0.01); }
          s += Math.min(2, value) - len * 0.08 - LW.dist(x, y, ax, ay) * 0.02;
          if (s > bs) { bs = s; best = { shore: i, x: dx < 0 ? x - len : dy < 0 ? x : x + dx, y: dy < 0 ? y - len : dx < 0 ? y : y + dy, w: dx ? len : 1, h: dy ? len : 1, dir: dx ? 'h' : 'v', joins, len, far: j }; }
        }
      }
      return best;
    },
    /** Elkészült átkelő: a mezők járhatók lesznek; ha két külön földet kötött össze, az a krónikába kerül. */
    onComplete(world, b, a) {
      const def = B()[b.kind]; if (!def || !def.bridge) return;
      const comp = this.components(world); const ends = this.ends(world, b); const joined = ends.length === 2 && comp[ends[0]] !== comp[ends[1]];
      for (const i of world.buildingTiles(b)) { world.tiles.bridge[i] = def.bridge; world.dirtyTiles.add(i); }
      this.invalidate(world);
      world.events.emit('CrossingBuilt', { tick: world.tick, agentId: a ? a.id : null, kind: b.kind, buildingId: b.id, len: Math.max(b.w || 1, b.h || 1), joined, tunnel: def.over === 'mountain', tile: world.idx(b.x, b.y) });
      if (joined) { for (const o of world.agentsNear(b.x + 0.5, b.y + 0.5, 20)) { o.emotions.excitement = LW.clamp01(o.emotions.excitement + 0.3); o.emotions.pride = LW.clamp01(o.emotions.pride + 0.15); LW.Agents.memory(world, o, { type: 'built', text: def.over === 'mountain' ? 'átfúrták a hegyet: a túloldal a miénk lett' : 'híd épült a túlpartra: a sziget a miénk lett', importance: 0.7, emotion: 'excitement', intensity: 0.6, tile: world.idx(b.x, b.y) }); } }
    },
    onDestroy(world, b) { const def = B()[b.kind]; if (!def || !def.bridge || !world.tiles.bridge) return; for (const i of world.buildingTiles(b)) { world.tiles.bridge[i] = 0; world.dirtyTiles.add(i); } this.invalidate(world); },
    /** A híd két végén lévő szárazföldi mezők. */
    ends(world, b) { const out = []; const w = b.w || 1, h = b.h || 1; const horiz = b.dir ? b.dir === 'h' : w > 1; const cand = horiz ? [[b.x - 1, b.y], [b.x + w, b.y]] : [[b.x, b.y - 1], [b.x, b.y + h]]; for (const [x, y] of cand) if (world.inBounds(x, y) && world.isPassable(world.idx(x, y))) out.push(world.idx(x, y)); return out; },
    /** A közösség vágya egy átkelőre: van-e jó hely, és összeköt-e valamit. */
    want(world, a, kind) { const site = this.candidate(world, a, kind); if (!site) return 0; return site.joins ? 1.6 + a.personality.curiosity * 0.4 + a.personality.ambition * 0.3 : 0.7 + a.personality.discipline * 0.2; },
  };
  LW.Crossings = Crossings;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== tech/tree.js ===== */
/* LEVENTE — THE CREATOR · tech/tree.js — a világ „természettörvényei”: minden, ami felfedezhető
 * Nem történelem, hanem lehetőségtér: mi miből lesz, mihez kell tűz, kemence, műhely, írás, sok ember.
 * Az emberek maguk találják meg (kísérlet, véletlen, tanítás, olvasás) — vagy soha. (TECHNOLOGY_MODEL.md)
 */
(function (LW) {
  'use strict';
  const D = LW.Tech.D, R = LW.Tech.RECIPES, S = LW.Tech.SOURCE, I = LW.ITEMS, B = LW.Buildings.DEFS; const TPD = LW.TIME.TICKS_PER_DAY;

  // ---------------------------------------------------------------- korszakok
  const ERAS = [['primitive', 'Kezdetleges'], ['neolithic', 'Újkőkor'], ['copper', 'Rézkor'], ['bronze', 'Bronzkor'], ['iron', 'Vaskor'], ['classical', 'Ókor'], ['medieval', 'Középkor'], ['renaissance', 'Reneszánsz'], ['industrial', 'Ipari kor'], ['modern', 'Modern kor'], ['digital', 'Digitális kor'], ['ai', 'MI-kor'], ['beyond', 'Ismeretlen jövő']];
  const ERA_INDEX = {}; ERAS.forEach(([k], i) => { ERA_INDEX[k] = i; });

  // ---------------------------------------------------------------- tárgyak
  Object.assign(I, {
    charcoal: { weight: 0.8, label: 'Faszén' }, copper: { weight: 1.5, label: 'Réz' }, tin: { weight: 1.5, label: 'Ón' }, bronze: { weight: 1.5, label: 'Bronz' }, iron: { weight: 2, label: 'Vas' }, steel: { weight: 2, label: 'Acél' },
    cloth: { weight: 0.4, label: 'Vászon' }, brick: { weight: 1.5, label: 'Tégla' }, paper: { weight: 0.2, label: 'Papír' }, glass: { weight: 0.8, label: 'Üveg' }, coin: { weight: 0.05, label: 'Érme' }, book: { weight: 0.5, label: 'Könyv' },
    flour: { food: 0.35, spoilDays: 120, weight: 0.5, label: 'Liszt' }, bread: { food: 0.65, spoilDays: 12, weight: 0.5, label: 'Kenyér' }, beer: { food: 0.2, water: 0.3, spoilDays: 40, weight: 0.8, label: 'Sör' }, cheese: { food: 0.5, spoilDays: 60, weight: 0.5, label: 'Sajt' }, fruit: { food: 0.35, water: 0.1, spoilDays: 8, weight: 0.5, label: 'Gyümölcs' }, milk: { food: 0.25, water: 0.4, spoilDays: 2, weight: 0.8, label: 'Tej' },
    oil: { weight: 1.5, label: 'Fekete olaj' }, fuel: { weight: 1, label: 'Üzemanyag' }, plastic: { weight: 0.5, label: 'Műanyag' }, concrete: { weight: 2, label: 'Beton' }, machine_part: { weight: 2, label: 'Gépalkatrész' }, electric_part: { weight: 1, label: 'Elektromos alkatrész' }, chip: { weight: 0.1, label: 'Csip' }, medicine: { weight: 0.2, label: 'Orvosság' }, wool: { weight: 0.4, label: 'Gyapjú' },
    copper_axe: { weight: 1.5, label: 'Rézbalta', tool: true, slot: 'axe', tier: 1 }, bronze_axe: { weight: 1.5, label: 'Bronzbalta', tool: true, slot: 'axe', tier: 2 }, iron_axe: { weight: 1.8, label: 'Vasbalta', tool: true, slot: 'axe', tier: 3 }, steel_axe: { weight: 1.8, label: 'Acélbalta', tool: true, slot: 'axe', tier: 4 }, chainsaw: { weight: 3, label: 'Láncfűrész', tool: true, slot: 'axe', tier: 6 },
    bow: { weight: 1, label: 'Íj', tool: true, slot: 'hunt', tier: 2 }, bronze_spear: { weight: 1.3, label: 'Bronzlándzsa', tool: true, slot: 'hunt', tier: 2 }, iron_spear: { weight: 1.4, label: 'Vaslándzsa', tool: true, slot: 'hunt', tier: 3 }, rifle: { weight: 3, label: 'Puska', tool: true, slot: 'hunt', tier: 5 },
    wooden_plow: { weight: 3, label: 'Faeke', tool: true, slot: 'plow', tier: 1 }, bronze_plow: { weight: 3, label: 'Bronzeke', tool: true, slot: 'plow', tier: 2 }, iron_plow: { weight: 3.5, label: 'Vaseke', tool: true, slot: 'plow', tier: 3 }, tractor: { weight: 10, label: 'Traktor', tool: true, slot: 'plow', tier: 6 },
    pickaxe: { weight: 2, label: 'Csákány', tool: true, slot: 'mine', tier: 2 }, iron_pickaxe: { weight: 2.2, label: 'Vascsákány', tool: true, slot: 'mine', tier: 3 }, drill: { weight: 4, label: 'Fúrógép', tool: true, slot: 'mine', tier: 5 },
    wool_clothes: { weight: 1, label: 'Gyapjúruha', tool: true, warmth: 11, slot: 'clothes', tier: 2 }, boat: { weight: 0, label: 'Csónak', tool: true, slot: 'boat', tier: 1 }, car: { weight: 0, label: 'Gépkocsi', tool: true, slot: 'vehicle', tier: 1 }, coat: { weight: 1.2, label: 'Kabát', tool: true, warmth: 14, slot: 'clothes', tier: 3 },
  });
  I.clothes.slot = 'clothes'; I.clothes.tier = 1; I.handaxe.slot = 'axe'; I.handaxe.tier = 0.5; I.spear.slot = 'hunt'; I.spear.tier = 1;
  LW.DEPOSIT_ITEM[10] = 'oil';
  Object.assign(S, { coal: 'deposit:coal', ore_copper: 'deposit:copper', ore_tin: 'deposit:tin', ore_iron: 'deposit:iron', gold_nugget: 'deposit:gold', gems: 'deposit:gems', salt: 'deposit:salt', oil: 'deposit:oil', grain: 'store', fruit: 'store', milk: 'store', wool: 'store' });

  // ---------------------------------------------------------------- receptek (miből mi lesz, hol)
  Object.assign(R, {
    charcoal: { out: { charcoal: 2 }, inp: { wood: 4 }, ticks: 24, tech: 'charcoal_making', nearby: 'fire', skill: 'crafting', tag: 'craft:charcoal' },
    copper: { out: { copper: 1 }, inp: { ore_copper: 2, charcoal: 1 }, ticks: 30, tech: 'copper_smelting', nearby: 'furnace', skill: 'crafting', tag: 'craft:smelt' },
    tin: { out: { tin: 1 }, inp: { ore_tin: 2, charcoal: 1 }, ticks: 30, tech: 'bronze_alloy', nearby: 'furnace', skill: 'crafting', tag: 'craft:smelt' },
    bronze: { out: { bronze: 2 }, inp: { copper: 2, tin: 1 }, ticks: 30, tech: 'bronze_alloy', nearby: 'furnace', skill: 'crafting', tag: 'craft:smelt' },
    iron: { out: { iron: 1 }, inp: { ore_iron: 2, charcoal: 2 }, ticks: 40, tech: 'iron_smelting', nearby: 'furnace', skill: 'crafting', tag: 'craft:smelt' },
    steel: { out: { steel: 1 }, inp: { iron: 2, coal: 1 }, ticks: 40, tech: 'steel_making', nearby: 'forge', skill: 'crafting', tag: 'craft:smelt' },
    cloth: { out: { cloth: 1 }, inpAny: [{ fiber: 6 }, { wool: 3 }], ticks: 30, tech: 'weaving', skill: 'crafting', tag: 'craft:weave' },
    wool_clothes: { out: { wool_clothes: 1 }, inp: { cloth: 2 }, ticks: 24, tech: 'weaving', skill: 'crafting', tag: 'craft:clothes' },
    coat: { out: { coat: 1 }, inp: { cloth: 2, hide: 1 }, ticks: 30, tech: 'tailoring', nearby: 'workshop', skill: 'crafting', tag: 'craft:clothes' },
    brick: { out: { brick: 2 }, inp: { clay: 4 }, ticks: 20, tech: 'brick_making', nearby: 'kiln', skill: 'crafting', tag: 'craft:brick' },
    paper: { out: { paper: 2 }, inp: { fiber: 4, wood: 2 }, ticks: 30, tech: 'paper_making', nearby: 'workshop', skill: 'crafting', tag: 'craft:paper' },
    glass: { out: { glass: 1 }, inp: { stone: 3, charcoal: 1 }, ticks: 30, tech: 'glassmaking', nearby: 'furnace', skill: 'crafting', tag: 'craft:glass' },
    coin: { out: { coin: 6 }, inpAny: [{ gold_nugget: 1 }, { copper: 2 }], ticks: 20, tech: 'coinage', nearby: 'workshop', skill: 'crafting', tag: 'craft:coin' },
    book: { out: { book: 1 }, inp: { paper: 4 }, ticks: 40, tech: 'printing', nearby: 'workshop', skill: 'crafting', tag: 'craft:book' },
    flour: { out: { flour: 2 }, inp: { grain: 3 }, ticks: 12, tech: 'milling', nearby: 'mill', skill: 'crafting', tag: 'craft:flour' },
    bread: { out: { bread: 2 }, inp: { flour: 1 }, ticks: 10, tech: 'baking', nearby: 'fire', skill: 'crafting', tag: 'craft:bread' },
    beer: { out: { beer: 2 }, inp: { grain: 3 }, ticks: 30, tech: 'brewing', skill: 'crafting', tag: 'craft:beer' },
    cheese: { out: { cheese: 1 }, inp: { milk: 2, salt: 1 }, ticks: 30, tech: 'dairy', skill: 'crafting', tag: 'craft:cheese' },
    copper_axe: { out: { copper_axe: 1 }, inp: { copper: 2, wood: 1 }, ticks: 20, tech: 'copper_tools', nearby: 'furnace', skill: 'crafting', tag: 'craft:tool' },
    bronze_axe: { out: { bronze_axe: 1 }, inp: { bronze: 2, wood: 1 }, ticks: 20, tech: 'bronze_tools', nearby: 'furnace', skill: 'crafting', tag: 'craft:tool' },
    bronze_spear: { out: { bronze_spear: 1 }, inp: { bronze: 1, wood: 1, fiber: 1 }, ticks: 16, tech: 'bronze_tools', nearby: 'furnace', skill: 'crafting', tag: 'craft:tool' },
    bow: { out: { bow: 1 }, inp: { wood: 2, fiber: 3 }, ticks: 24, tech: 'archery', skill: 'crafting', tag: 'craft:tool' },
    pickaxe: { out: { pickaxe: 1 }, inp: { bronze: 2, wood: 1 }, ticks: 20, tech: 'mining', nearby: 'furnace', skill: 'crafting', tag: 'craft:tool' },
    iron_axe: { out: { iron_axe: 1 }, inp: { iron: 2, wood: 1 }, ticks: 24, tech: 'iron_working', nearby: 'forge', skill: 'crafting', tag: 'craft:tool' },
    iron_spear: { out: { iron_spear: 1 }, inp: { iron: 1, wood: 1 }, ticks: 20, tech: 'iron_working', nearby: 'forge', skill: 'crafting', tag: 'craft:tool' },
    iron_pickaxe: { out: { iron_pickaxe: 1 }, inp: { iron: 2, wood: 1 }, ticks: 24, tech: 'iron_working', nearby: 'forge', skill: 'crafting', tag: 'craft:tool' },
    steel_axe: { out: { steel_axe: 1 }, inp: { steel: 2, wood: 1 }, ticks: 24, tech: 'steel_making', nearby: 'forge', skill: 'crafting', tag: 'craft:tool' },
    wooden_plow: { out: { wooden_plow: 1 }, inp: { wood: 5 }, ticks: 30, tech: 'plowing', skill: 'crafting', tag: 'craft:tool' },
    bronze_plow: { out: { bronze_plow: 1 }, inp: { bronze: 2, wood: 3 }, ticks: 30, tech: 'bronze_tools', nearby: 'furnace', skill: 'crafting', tag: 'craft:tool' },
    iron_plow: { out: { iron_plow: 1 }, inp: { iron: 2, wood: 3 }, ticks: 30, tech: 'iron_working', nearby: 'forge', skill: 'crafting', tag: 'craft:tool' },
    machine_part: { out: { machine_part: 2 }, inp: { iron: 2, wood: 1 }, ticks: 40, tech: 'mechanics', nearby: 'workshop', skill: 'crafting', tag: 'craft:machine' },
    electric_part: { out: { electric_part: 2 }, inp: { copper: 2, iron: 1 }, ticks: 40, tech: 'electricity', nearby: 'workshop', skill: 'crafting', tag: 'craft:machine' },
    concrete: { out: { concrete: 3 }, inp: { stone: 4, clay: 2 }, ticks: 24, tech: 'concrete', nearby: 'kiln', skill: 'building', tag: 'craft:concrete' },
    fuel: { out: { fuel: 2 }, inp: { oil: 2 }, ticks: 30, tech: 'oil_refining', nearby: 'factory', skill: 'crafting', tag: 'craft:refine' },
    plastic: { out: { plastic: 2 }, inp: { oil: 2 }, ticks: 30, tech: 'plastics', nearby: 'factory', skill: 'crafting', tag: 'craft:refine' },
    medicine: { out: { medicine: 2 }, inp: { fiber: 2, berries: 2, glass: 1 }, ticks: 40, tech: 'pharmacology', nearby: 'lab', skill: 'medicine', tag: 'craft:medicine' },
    chip: { out: { chip: 4 }, inp: { glass: 1, copper: 1, electric_part: 1 }, ticks: 60, tech: 'integrated_circuit', nearby: 'lab', skill: 'crafting', tag: 'craft:chip' },
    rifle: { out: { rifle: 1 }, inp: { steel: 2, wood: 1, machine_part: 1 }, ticks: 40, tech: 'firearms', nearby: 'workshop', skill: 'crafting', tag: 'craft:tool' },
    drill: { out: { drill: 1 }, inp: { steel: 2, machine_part: 2 }, ticks: 40, tech: 'machine_tools', nearby: 'factory', skill: 'crafting', tag: 'craft:tool' },
    chainsaw: { out: { chainsaw: 1 }, inp: { steel: 2, machine_part: 2, fuel: 1 }, ticks: 40, tech: 'internal_combustion', nearby: 'factory', skill: 'crafting', tag: 'craft:tool' },
    tractor: { out: { tractor: 1 }, inp: { steel: 6, machine_part: 6, fuel: 2 }, ticks: 120, tech: 'internal_combustion', nearby: 'factory', skill: 'crafting', tag: 'craft:tool' },
    boat: { out: { boat: 1 }, inp: { wood: 8, fiber: 4 }, ticks: 80, tech: 'boatbuilding', skill: 'building', tag: 'craft:boat' },
    car: { out: { car: 1 }, inp: { steel: 6, machine_part: 4, fuel: 2 }, ticks: 120, tech: 'automobile', nearby: 'factory', skill: 'crafting', tag: 'craft:tool' },
  });

  // ---------------------------------------------------------------- épületek
  const pub = (o) => Object.assign({ public: true }, o);
  Object.assign(B, {
    granary: pub({ label: 'Magtár', cost: { wood: 12, clay: 6, stone: 4 }, ticks: 220, storage: 200, preserve: 0.85, tech: 'granary_building', lifeDays: 4000, want: 'food', minPop: 3 }),
    well: pub({ label: 'Kút', cost: { stone: 12, wood: 4 }, ticks: 160, water: true, tech: 'well_digging', lifeDays: 12000, want: 'water', minPop: 2 }),
    orchard: { label: 'Gyümölcsös', cost: { wood: 4 }, ticks: 120, farm: true, cropItem: 'fruit', cropDays: 200, yieldBase: 40, perennial: true, tech: 'horticulture', lifeDays: 6000, size: [2, 2] },
    pasture: { label: 'Karám', cost: { wood: 10, fiber: 4 }, ticks: 160, pasture: true, tech: 'animal_husbandry', lifeDays: 3000, size: [2, 2] },
    kiln: pub({ label: 'Égetőkemence', cost: { clay: 10, stone: 8 }, ticks: 160, furnace: 1, kiln: true, tech: 'kiln_building', lifeDays: 3000, light: 0.3, minPop: 2 }),
    furnace: pub({ label: 'Olvasztókemence', cost: { stone: 16, clay: 10, wood: 6 }, ticks: 260, furnace: 2, storage: 60, tech: 'copper_smelting', lifeDays: 4000, light: 0.4, minPop: 3 }),
    workshop: pub({ label: 'Műhely', cost: { wood: 18, stone: 6, fiber: 4 }, ticks: 240, workshop: 1, craft: 0.3, storage: 80, tech: 'carpentry', lifeDays: 4000, minPop: 3 }),
    forge: pub({ label: 'Kovácsműhely', cost: { stone: 20, wood: 14, iron: 4 }, ticks: 360, furnace: 3, forge: true, workshop: 1, craft: 0.4, storage: 80, tech: 'iron_working', lifeDays: 6000, light: 0.5, minPop: 5 }),
    shrine: pub({ label: 'Szentély', cost: { stone: 10, wood: 6 }, ticks: 200, shrine: 1, tech: 'ritual', lifeDays: 12000, light: 0.2, want: 'belief', minPop: 3 }),
    temple: pub({ label: 'Templom', cost: { stone: 40, brick: 10, wood: 12 }, ticks: 900, shrine: 2, tech: 'organized_religion', lifeDays: 30000, light: 0.5, want: 'belief', minPop: 12, size: [2, 2] }),
    archive: pub({ label: 'Levéltár', cost: { clay: 12, wood: 10, stone: 6 }, ticks: 300, records: 1, tech: 'writing', lifeDays: 12000, minPop: 5, want: 'knowledge' }),
    library: pub({ label: 'Könyvtár', cost: { stone: 24, wood: 16, paper: 6 }, ticks: 600, records: 2, teach: 0.3, tech: 'paper_making', lifeDays: 20000, minPop: 12, want: 'knowledge', size: [2, 1] }),
    school: pub({ label: 'Iskola', cost: { wood: 20, stone: 10, brick: 6 }, ticks: 500, school: 1, teach: 0.4, tech: 'schooling', lifeDays: 12000, minPop: 10, want: 'knowledge' }),
    university: pub({ label: 'Egyetem', cost: { stone: 40, brick: 30, glass: 6, paper: 10 }, ticks: 1400, school: 2, records: 2, discovery: 0.35, teach: 0.5, tech: 'universities', lifeDays: 40000, minPop: 21, want: 'knowledge', size: [2, 2] }),
    market: pub({ label: 'Piac', cost: { wood: 14, stone: 8, cloth: 4 }, ticks: 300, market: 1, storage: 150, tech: 'trade', lifeDays: 8000, minPop: 8, want: 'food' }),
    mill: pub({ label: 'Malom', cost: { wood: 24, stone: 12 }, ticks: 500, mill: 1, storage: 100, tech: 'milling', lifeDays: 10000, minPop: 8, want: 'food' }),
    irrigation: pub({ label: 'Öntözőcsatorna', cost: { stone: 20, wood: 6 }, ticks: 400, irrigation: 1, tech: 'irrigation', lifeDays: 10000, minPop: 8, want: 'food' }),
    brick_house: { label: 'Téglaház', cost: { brick: 30, wood: 12 }, ticks: 500, insulation: 20, safety: 0.9, sleep: 0.95, capacity: 6, storage: 100, dwelling: true, tier: 4, tech: 'brick_making', lifeDays: 15000, light: 0.7 },
    town_house: { label: 'Városi ház', cost: { brick: 40, wood: 20, glass: 4 }, ticks: 800, insulation: 22, safety: 0.92, sleep: 1, capacity: 8, storage: 160, dwelling: true, tier: 5, tech: 'architecture', lifeDays: 25000, light: 0.8, size: [2, 1] },
    modern_house: { label: 'Modern ház', cost: { concrete: 30, glass: 10, electric_part: 4 }, ticks: 900, insulation: 26, safety: 0.95, sleep: 1, capacity: 6, storage: 200, dwelling: true, tier: 6, tech: 'electrification', lifeDays: 30000, light: 1, size: [2, 1] },
    printing_house: pub({ label: 'Nyomda', cost: { wood: 20, machine_part: 4, paper: 10 }, ticks: 600, records: 3, teach: 0.6, tech: 'printing', lifeDays: 15000, minPop: 15, want: 'knowledge' }),
    lab: pub({ label: 'Laboratórium', cost: { brick: 30, glass: 20, machine_part: 6 }, ticks: 1200, lab: 1, discovery: 0.5, tech: 'scientific_method', lifeDays: 15000, minPop: 18, want: 'knowledge', size: [2, 1] }),
    factory: pub({ label: 'Gyár', cost: { brick: 60, iron: 20, machine_part: 10 }, ticks: 2000, factory: 1, craft: 0.8, storage: 300, tech: 'factory_system', lifeDays: 20000, light: 0.8, minPop: 28, size: [3, 2] }),
    power_plant: pub({ label: 'Erőmű', cost: { brick: 60, steel: 20, machine_part: 20, electric_part: 10 }, ticks: 2400, power: 1, tech: 'electrification', lifeDays: 20000, light: 1.2, minPop: 35, size: [2, 2] }),
    hospital: pub({ label: 'Kórház', cost: { brick: 50, glass: 10, medicine: 10 }, ticks: 1400, hospital: 1, tech: 'modern_medicine', lifeDays: 20000, light: 0.8, minPop: 28, want: 'health', size: [2, 2] }),
    computer_center: pub({ label: 'Számítóközpont', cost: { concrete: 40, electric_part: 30, chip: 20 }, ticks: 2400, computer: 1, discovery: 0.6, records: 4, tech: 'computer', lifeDays: 20000, light: 1, minPop: 42, want: 'knowledge', size: [2, 2] }),
    data_center: pub({ label: 'Adatközpont', cost: { concrete: 60, chip: 80, electric_part: 40 }, ticks: 3000, computer: 2, records: 5, discovery: 0.8, teach: 1, tech: 'internet', lifeDays: 20000, light: 1, minPop: 70, want: 'knowledge', size: [3, 2] }),
    palisade: pub({ label: 'Palánk', cost: { wood: 20, fiber: 4 }, ticks: 300, safety: 0.6, wall: 1, tech: 'fortification', lifeDays: 5000, minPop: 5, want: 'safety' }),
    stone_wall: pub({ label: 'Kőfal', cost: { stone: 40, clay: 8 }, ticks: 700, safety: 0.8, wall: 2, tech: 'stone_walls', lifeDays: 30000, minPop: 10, want: 'safety', size: [2, 1] }),
    castle: pub({ label: 'Vár', cost: { stone: 90, brick: 30, wood: 30, iron: 6 }, ticks: 2600, safety: 0.95, wall: 3, records: 1, storage: 200, tech: 'castles', lifeDays: 60000, light: 0.6, minPop: 20, want: 'safety', size: [3, 3] }),
    harbor: pub({ label: 'Kikötő', cost: { wood: 30, stone: 10, cloth: 4 }, ticks: 600, harbor: 1, storage: 120, tech: 'sailing', lifeDays: 12000, minPop: 8, want: 'food', size: [2, 1] }),
    simulation_core: pub({ label: 'Világmag', cost: { chip: 200, concrete: 80, electric_part: 80 }, ticks: 5000, simulation: 1, tech: 'world_simulation', lifeDays: 1e6, light: 1.5, minPop: 105, want: 'knowledge', size: [3, 3] }),
  });
  B.lean_to.tier = 1; B.hut.tier = 2; B.stone_house.tier = 3;

  // ---------------------------------------------------------------- felfedezések
  const T = (id, o) => { o.id = id; D[id] = o; };
  // — újkőkor
  T('weaving', { name: 'Szövés', era: 'neolithic', prereq: ['fiber_twisting', 'basket_weaving'], items: { fiber: 6 }, difficulty: 0.82, need: 'warmth', skill: 'crafting', minSkill: 0.45, recipes: ['cloth', 'wool_clothes'], fx: { warmth: 1 }, wow: 'Első szőtt vászon', desc: 'A rostból vászon lesz: könnyebb, melegebb ruha.' });
  T('carpentry', { name: 'Ácsmesterség', era: 'neolithic', prereq: ['woodworking', 'hut_construction'], items: { wood: 8 }, difficulty: 0.84, skill: 'building', minSkill: 0.5, buildings: ['workshop'], fx: { build: 0.15, wood: 0.1 }, wow: 'Első műhely', desc: 'Illesztett gerendák, szegek nélkül: műhely, amelyben jobb szerszám születik.' });
  T('granary_building', { name: 'Magtárépítés', era: 'neolithic', prereq: ['seed_planting', 'pottery'], items: { wood: 6, clay: 4 }, difficulty: 0.85, need: 'food', skill: 'building', minSkill: 0.5, buildings: ['granary'], fx: { preserve: 0.2 }, wow: 'Első magtár', desc: 'Egy közös, száraz raktár: a termés kitart tavaszig.' });
  T('well_digging', { name: 'Kútásás', era: 'neolithic', prereq: ['digging', 'stone_masonry'], items: { stone: 6 }, difficulty: 0.86, need: 'water', skill: 'building', minSkill: 0.55, buildings: ['well'], wow: 'Az első kútásás', desc: 'Víz a föld alól, ott, ahol az ember lakik.' });
  T('horticulture', { name: 'Gyümölcstermesztés', era: 'neolithic', prereq: ['seed_planting', 'foraging_lore'], items: { berries: 4, wood: 2 }, difficulty: 0.86, need: 'food', skill: 'farming', minSkill: 0.4, buildings: ['orchard'], fx: { food: 0.1 }, wow: 'Első gyümölcsös', desc: 'Az elültetett fa évről évre terem.' });
  T('animal_husbandry', { name: 'Állattartás', era: 'neolithic', prereq: ['spear_making', 'fiber_twisting'], items: { fiber: 6, wood: 6 }, difficulty: 0.9, need: 'food', skill: 'hunting', minSkill: 0.5, buildings: ['pasture'], fx: { hunt: 0.2 }, wow: 'Első karám', desc: 'A megszelídített vad nem szalad el: tej, gyapjú, hús a ház mellett.' });
  T('dairy', { name: 'Tejfeldolgozás', era: 'neolithic', prereq: ['animal_husbandry', 'pottery'], items: { milk: 2 }, difficulty: 0.8, need: 'food', skill: 'crafting', minSkill: 0.4, recipes: ['cheese'], desc: 'A tejből sajt lesz, ami hónapokig eláll.' });
  T('brewing', { name: 'Sörfőzés', era: 'neolithic', prereq: ['seed_planting', 'pottery'], items: { grain: 3 }, difficulty: 0.82, skill: 'crafting', minSkill: 0.4, recipes: ['beer'], accidents: [{ during: 'rest:fire', chance: 0.01, items: { grain: 3 } }], wow: 'Első sör', desc: 'A vízben hagyott gabona furcsa, vidám itallá erjed.' });
  T('plowing', { name: 'Ekehasználat', era: 'neolithic', prereq: ['seed_planting', 'woodworking'], items: { wood: 5 }, difficulty: 0.86, need: 'food', skill: 'farming', minSkill: 0.5, recipes: ['wooden_plow'], fx: { farm: 0.2 }, wow: 'Első eke', desc: 'A felszántott föld többet terem.' });
  T('kiln_building', { name: 'Kemenceépítés', era: 'neolithic', prereq: ['pottery', 'stone_masonry'], items: { clay: 8, stone: 6 }, difficulty: 0.87, skill: 'building', minSkill: 0.55, buildings: ['kiln'], wow: 'Első kemence', desc: 'A zárt kemence forróbb a tábortűznél: keményebb edény, égetett tégla.' });
  T('brick_making', { name: 'Téglavetés', era: 'neolithic', prereq: ['kiln_building'], items: { clay: 6 }, nearby: 'kiln', difficulty: 0.86, skill: 'building', minSkill: 0.55, recipes: ['brick'], buildings: ['brick_house'], wow: 'Első tégla', desc: 'Kiégetett agyagtégla: gyorsabb és szárazabb falak, mint kőből.' });
  T('ritual', { name: 'Szertartás', era: 'neolithic', prereq: [], items: { stone: 4 }, difficulty: 0.8, skill: 'social', minSkill: 0.3, minPop: 4, buildings: ['shrine'], wow: 'Az első szertartás', desc: 'Kövek, tűz, közös ének a halottakért és az égi hangért. A félelem szertartásba rendeződik.' });
  T('counting', { name: 'Számolás', era: 'neolithic', prereq: ['granary_building'], items: {}, difficulty: 0.84, skill: 'crafting', minSkill: 0.4, minPop: 5, boosts: { writing: 0.1 }, desc: 'Rovások a boton: mennyi gabona, hány nap, hány ember.' });
  T('tribal_council', { name: 'Törzsi tanács', era: 'neolithic', prereq: ['ritual'], items: {}, difficulty: 0.82, skill: 'social', minSkill: 0.45, minPop: 6, fx: { teach: 0.1 }, wow: 'Az első tanács', desc: 'A vének és a legerősebbek szava dönt: a csoportnak vezetője lesz.' });
  T('archery', { name: 'Íjászat', era: 'neolithic', prereq: ['spear_making', 'fiber_twisting'], items: { wood: 2, fiber: 3 }, difficulty: 0.84, need: 'food', skill: 'hunting', minSkill: 0.45, recipes: ['bow'], fx: { hunt: 0.25 }, wow: 'Első íj', desc: 'A feszített ág messzebbre visz, mint a kar.' });
  // — rézkor
  T('charcoal_making', { name: 'Szénégetés', era: 'copper', prereq: ['fire_making', 'kiln_building'], items: { wood: 6 }, nearby: 'fire', difficulty: 0.85, skill: 'crafting', minSkill: 0.5, recipes: ['charcoal'], accidents: [{ during: 'rest:fire', chance: 0.005, items: { wood: 4 } }], desc: 'A lassan, levegő nélkül égő fa forróbb tüzet ad.' });
  T('copper_smelting', { name: 'Rézolvasztás', era: 'copper', prereq: ['ore_lore_copper', 'charcoal_making', 'kiln_building'], items: { ore_copper: 3, charcoal: 2 }, nearby: 'kiln', difficulty: 0.9, skill: 'crafting', minSkill: 0.6, minPop: 4, buildings: ['furnace'], recipes: ['copper'], wow: 'Az első fém', desc: 'A zöld kőből a kemence forróságában vörös fém csorog.' });
  T('copper_tools', { name: 'Rézszerszámok', era: 'copper', prereq: ['copper_smelting'], items: { copper: 2, wood: 1 }, nearby: 'furnace', difficulty: 0.85, skill: 'crafting', minSkill: 0.6, recipes: ['copper_axe'], fx: { wood: 0.2 }, wow: 'Első rézbalta', desc: 'A fém él tovább tart, mint a kő.' });
  T('mining', { name: 'Bányászat', era: 'copper', prereq: ['copper_tools', 'digging'], items: { copper: 2, wood: 2 }, difficulty: 0.86, skill: 'gathering', minSkill: 0.55, recipes: ['pickaxe'], fx: { mine: 0.4 }, wow: 'Első bánya', desc: 'Csákánnyal a föld mélyebb rétegei is megnyílnak.' });
  // — bronzkor
  T('bronze_alloy', { name: 'Bronzötvözés', era: 'bronze', prereq: ['copper_smelting', 'ore_lore_tin'], items: { copper: 2, ore_tin: 2, charcoal: 2 }, nearby: 'furnace', difficulty: 0.92, skill: 'crafting', minSkill: 0.65, minPop: 5, recipes: ['tin', 'bronze'], wow: 'Az első bronz', desc: 'Réz és ón együtt keményebb, mint bármelyik külön.' });
  T('bronze_tools', { name: 'Bronzművesség', era: 'bronze', prereq: ['bronze_alloy'], items: { bronze: 2, wood: 2 }, nearby: 'furnace', difficulty: 0.88, skill: 'crafting', minSkill: 0.65, recipes: ['bronze_axe', 'bronze_spear', 'bronze_plow'], fx: { wood: 0.2, hunt: 0.2, farm: 0.15 }, wow: 'Első bronzszerszám', desc: 'Balta, lándzsa, eke bronzból: a munka felgyorsul.' });
  T('writing', { name: 'Írás', era: 'bronze', prereq: ['counting', 'pottery'], items: { clay: 4 }, difficulty: 0.93, skill: 'crafting', minSkill: 0.6, minPop: 6, buildings: ['archive'], fx: { teach: 0.15 }, wow: 'Az első írás', desc: 'Jelek az agyagban, amelyek megőrzik a tudást akkor is, ha a tudó meghal.' });
  T('trade', { name: 'Kereskedelem', era: 'bronze', prereq: ['counting', 'tribal_council'], items: { cloth: 2 }, difficulty: 0.88, skill: 'social', minSkill: 0.5, minPop: 8, buildings: ['market'], fx: { food: 0.1 }, wow: 'Az első piac', desc: 'Ami az egyiknek felesleg, a másiknak hiány: a csere mindkettőt gazdagítja.' });
  T('irrigation', { name: 'Öntözés', era: 'bronze', prereq: ['well_digging', 'plowing'], items: { stone: 8 }, nearby: 'water', difficulty: 0.9, need: 'food', skill: 'building', minSkill: 0.6, minPop: 8, buildings: ['irrigation'], fx: { farm: 0.3 }, wow: 'Első öntözőcsatorna', desc: 'A vizet a földre vezetni: aszályban is terem.' });
  T('organized_religion', { name: 'Szervezett vallás', era: 'bronze', prereq: ['ritual', 'writing', 'tribal_council'], items: { stone: 6 }, difficulty: 0.9, skill: 'social', minSkill: 0.55, minPop: 12, buildings: ['temple'], fx: { teach: 0.1 }, wow: 'Az első templom', desc: 'Papok, szent szövegek, ünnepek: a hit intézménnyé válik.' });
  T('sailing', { name: 'Hajózás', era: 'bronze', prereq: ['carpentry', 'weaving', 'fishing'], items: { wood: 10, cloth: 2 }, nearby: 'water', difficulty: 0.9, skill: 'building', minSkill: 0.6, buildings: ['harbor'], fx: { food: 0.1, speed: 0.05 }, wow: 'Az első hajó', desc: 'Vászon a szélben: a víz többé nem határ.' });
  T('calendar', { name: 'Naptár', era: 'bronze', prereq: ['counting', 'ritual'], items: {}, difficulty: 0.88, skill: 'farming', minSkill: 0.5, fx: { farm: 0.1 }, boosts: { astronomy: 0.1 }, desc: 'A csillagok járásából tudni, mikor kell vetni.' });
  T('tailoring', { name: 'Szabóság', era: 'bronze', prereq: ['weaving', 'hide_working', 'carpentry'], items: { cloth: 2, hide: 1 }, nearby: 'workshop', difficulty: 0.85, need: 'warmth', skill: 'crafting', minSkill: 0.6, recipes: ['coat'], fx: { warmth: 1 }, desc: 'Szabott, varrott kabát a tél ellen.' });
  T('fortification', { name: 'Palánképítés', era: 'neolithic', prereq: ['hut_construction', 'tribal_council'], items: { wood: 10 }, difficulty: 0.86, need: 'safety', skill: 'building', minSkill: 0.5, minPop: 5, buildings: ['palisade'], wow: 'Az első palánk', desc: 'Hegyezett cölöpök a tábor körül: a vad és az idegen kint marad.' });
  T('stone_walls', { name: 'Kőfalak', era: 'bronze', prereq: ['fortification', 'stone_masonry'], items: { stone: 16 }, difficulty: 0.9, need: 'safety', skill: 'building', minSkill: 0.65, minPop: 10, buildings: ['stone_wall'], wow: 'Az első kőfal', desc: 'Fal, amelyet tűz nem éget és kar nem dönt.' });
  T('dyeing', { name: 'Kelmefestés', era: 'bronze', prereq: ['weaving', 'herbal_medicine'], items: { cloth: 2, berries: 4 }, difficulty: 0.84, skill: 'crafting', minSkill: 0.5, wow: 'Az első festett ruha', desc: 'Növényből és földből szín: a ruha többé nem csak melegít, hanem beszél is arról, ki viseli.' });
  T('boatbuilding', { name: 'Csónaképítés', era: 'neolithic', prereq: ['woodworking', 'fishing'], items: { wood: 8, fiber: 4 }, nearby: 'water', difficulty: 0.84, need: 'food', skill: 'building', minSkill: 0.45, recipes: ['boat'], fx: { food: 0.1 }, wow: 'Az első csónak', desc: 'Kivájt törzs a vízen: a hal ott is elérhető, ahová a part nem ér.' });
  // — vaskor
  T('iron_smelting', { name: 'Vasolvasztás', era: 'iron', prereq: ['charcoal_making', 'kiln_building', 'ore_lore_iron'], boosts: { bronze_alloy: 0.15, copper_smelting: 0.1 }, items: { ore_iron: 3, charcoal: 3 }, nearby: 'kiln', difficulty: 0.95, skill: 'crafting', minSkill: 0.7, minPop: 8, recipes: ['iron'], wow: 'Az első vas', desc: 'A vörös kő makacsabb a réznél, de a fémje keményebb.' });
  T('iron_working', { name: 'Kovácsolás', era: 'iron', prereq: ['iron_smelting', 'carpentry'], items: { iron: 3, wood: 4 }, difficulty: 0.92, skill: 'crafting', minSkill: 0.7, minPop: 8, buildings: ['forge'], recipes: ['iron_axe', 'iron_spear', 'iron_pickaxe', 'iron_plow'], fx: { wood: 0.3, hunt: 0.2, farm: 0.2, mine: 0.3, build: 0.15 }, wow: 'Az első kovács', desc: 'Izzó vas az üllőn: minden szerszám újjászületik.' });
  T('alphabet', { name: 'Ábécé', era: 'iron', prereq: ['writing'], items: { clay: 2 }, nearby: 'archive', difficulty: 0.9, skill: 'social', minSkill: 0.55, minPop: 10, fx: { teach: 0.25 }, boosts: { schooling: 0.1 }, desc: 'Kevés jel, amit bárki megtanulhat: az írás a sokaké lesz.' });
  T('coinage', { name: 'Pénzverés', era: 'iron', prereq: ['trade', 'copper_smelting'], itemsAny: [{ gold_nugget: 1 }, { copper: 2 }], nearby: 'workshop', difficulty: 0.9, skill: 'crafting', minSkill: 0.6, minPop: 12, recipes: ['coin'], fx: { food: 0.1 }, wow: 'Az első érme', desc: 'Egy darab csillogó fém, amit mindenki elfogad. A csere elszakad a pillanattól.' });
  T('road_building', { name: 'Útépítés', era: 'iron', prereq: ['stone_masonry', 'tribal_council'], items: { stone: 12 }, difficulty: 0.88, skill: 'building', minSkill: 0.6, minPop: 10, fx: { speed: 0.15 }, wow: 'Az első út', desc: 'Kővel rakott út: a szekér nem süllyed a sárba.' });
  T('medicine', { name: 'Gyógyítás', era: 'iron', prereq: ['herbal_medicine', 'writing'], items: { fiber: 4, berries: 4 }, difficulty: 0.9, skill: 'medicine', minSkill: 0.5, minPop: 8, fx: { health: 0.2 }, wow: 'Az első orvos', desc: 'A sebek tisztítása, a láz feljegyzett kezelése: kevesebben halnak meg feleslegesen.' });
  T('milling', { name: 'Őrlés', era: 'iron', prereq: ['plowing', 'carpentry'], items: { wood: 10, stone: 6 }, difficulty: 0.88, need: 'food', skill: 'building', minSkill: 0.6, minPop: 8, buildings: ['mill'], recipes: ['flour'], fx: { food: 0.1 }, wow: 'Az első malom', desc: 'A víz vagy a szél forgatja a követ, ami a gabonát liszté őrli.' });
  T('baking', { name: 'Sütés', era: 'iron', prereq: ['milling', 'kiln_building'], items: { flour: 1 }, nearby: 'fire', difficulty: 0.8, need: 'food', skill: 'crafting', minSkill: 0.45, recipes: ['bread'], fx: { food: 0.1 }, wow: 'Az első kenyér', desc: 'A lisztből kelt, sült kenyér: laktató, elálló.' });
  T('law_code', { name: 'Törvények', era: 'iron', prereq: ['writing', 'tribal_council'], items: {}, nearby: 'archive', difficulty: 0.9, skill: 'social', minSkill: 0.6, minPop: 15, fx: { teach: 0.1 }, wow: 'Az első törvény', desc: 'Leírt szabályok, amelyek a vezető fölött is állnak.' });
  // — ókor
  T('architecture', { name: 'Építészet', era: 'classical', prereq: ['brick_making', 'road_building', 'counting'], items: { brick: 10, stone: 10 }, difficulty: 0.92, skill: 'building', minSkill: 0.7, minPop: 15, buildings: ['town_house'], fx: { build: 0.2 }, wow: 'Az első boltív', desc: 'Boltív, oszlop, emelet: házak, amelyek a dédunokákat is látják.' });
  T('glassmaking', { name: 'Üvegfúvás', era: 'classical', prereq: ['kiln_building', 'charcoal_making'], items: { stone: 4, charcoal: 2 }, nearby: 'furnace', difficulty: 0.9, skill: 'crafting', minSkill: 0.65, minPop: 10, recipes: ['glass'], wow: 'Az első üveg', desc: 'A megolvadt homok átlátszó, kemény anyaggá dermed.' });
  T('schooling', { name: 'Iskola', era: 'classical', prereq: ['alphabet', 'law_code'], items: { wood: 6 }, nearby: 'archive', difficulty: 0.9, skill: 'social', minSkill: 0.6, minPop: 12, buildings: ['school'], fx: { teach: 0.3 }, wow: 'Az első iskola', desc: 'A gyerekek nem csak a szüleiktől tanulnak.' });
  T('mathematics', { name: 'Matematika', era: 'classical', prereq: ['counting', 'alphabet', 'calendar'], items: {}, nearby: 'archive', difficulty: 0.93, skill: 'crafting', minSkill: 0.6, minPop: 15, fx: { discovery: 0.1, build: 0.1 }, boosts: { mechanics: 0.1, astronomy: 0.1 }, desc: 'A számok és formák szabályai, amelyek mindenre érvényesek.' });
  T('astronomy', { name: 'Csillagászat', era: 'classical', prereq: ['calendar', 'mathematics'], items: {}, difficulty: 0.92, skill: 'exploring', minSkill: 0.5, minPop: 12, fx: { speed: 0.05 }, boosts: { navigation: 0.15, scientific_method: 0.1 }, desc: 'Az égbolt rendje: a világ nagyobb, mint amit a szem lát.' });
  T('steel_making', { name: 'Acélgyártás', era: 'classical', prereq: ['iron_working', 'ore_lore_coal'], items: { iron: 3, coal: 2 }, nearby: 'forge', difficulty: 0.94, skill: 'crafting', minSkill: 0.75, minPop: 15, recipes: ['steel', 'steel_axe'], fx: { wood: 0.2, build: 0.1, mine: 0.2 }, wow: 'Az első acél', desc: 'Szénnel edzett vas: rugalmas és kemény egyszerre.' });
  T('mechanics', { name: 'Gépezetek', era: 'classical', prereq: ['milling', 'mathematics', 'iron_working'], items: { iron: 2, wood: 4 }, nearby: 'workshop', difficulty: 0.93, skill: 'crafting', minSkill: 0.7, minPop: 15, recipes: ['machine_part'], fx: { craft: 0.2, build: 0.1 }, wow: 'Az első gép', desc: 'Fogaskerék, csiga, emelő: az erő megsokszorozható.' });
  T('castles', { name: 'Várépítés', era: 'medieval', prereq: ['stone_walls', 'architecture', 'law_code'], items: { stone: 30, brick: 10 }, difficulty: 0.93, need: 'safety', skill: 'building', minSkill: 0.75, minPop: 20, buildings: ['castle'], wow: 'Az első vár', desc: 'Tornyok, kapu, falak: a hatalom kőbe zárva.' });
  // — középkor
  T('paper_making', { name: 'Papírkészítés', era: 'medieval', prereq: ['weaving', 'writing', 'carpentry'], items: { fiber: 6, wood: 2 }, nearby: 'workshop', difficulty: 0.9, skill: 'crafting', minSkill: 0.65, minPop: 12, recipes: ['paper'], buildings: ['library'], fx: { teach: 0.2 }, wow: 'Az első papír', desc: 'Rostból préselt vékony lap: könnyű, olcsó, tele lehet írni.' });
  T('crop_rotation', { name: 'Vetésforgó', era: 'medieval', prereq: ['plowing', 'writing'], items: {}, difficulty: 0.88, need: 'food', skill: 'farming', minSkill: 0.65, minPop: 10, fx: { farm: 0.3 }, desc: 'A föld pihen, ha váltogatják, mit vetnek belé.' });
  T('navigation', { name: 'Hajózási tudomány', era: 'medieval', prereq: ['sailing', 'astronomy'], items: { iron: 1 }, difficulty: 0.92, skill: 'exploring', minSkill: 0.6, minPop: 12, fx: { speed: 0.1, food: 0.05 }, wow: 'Az első iránytű', desc: 'Iránytű és csillagtérkép: a nyílt vízen is tudni, merre.' });
  T('concrete', { name: 'Beton', era: 'medieval', prereq: ['architecture', 'kiln_building'], items: { stone: 6, clay: 3 }, nearby: 'kiln', difficulty: 0.9, skill: 'building', minSkill: 0.7, minPop: 15, recipes: ['concrete'], fx: { build: 0.15 }, desc: 'Égetett kő és víz, amely maga is kővé áll össze.' });
  T('mechanical_clock', { name: 'Óra', era: 'medieval', prereq: ['mechanics', 'astronomy'], items: { machine_part: 2 }, nearby: 'workshop', difficulty: 0.93, skill: 'crafting', minSkill: 0.75, minPop: 15, fx: { craft: 0.1, discovery: 0.05 }, desc: 'A napot egyenlő darabokra vágó szerkezet.' });
  T('gunpowder', { name: 'Lőpor', era: 'medieval', prereq: ['charcoal_making', 'ore_lore_coal', 'mathematics'], itemsAny: [{ charcoal: 3, salt: 1 }, { charcoal: 3, coal: 2 }], difficulty: 0.94, skill: 'crafting', minSkill: 0.7, minPop: 15, accidents: [{ during: 'craft:charcoal', chance: 0.002, items: { salt: 1 } }], fx: { mine: 0.3 }, boosts: { firearms: 0.15 }, wow: 'Az első robbanás', desc: 'Szén, kén, salétrom: por, amely egy szikrától mennydörög.' });
  T('optics', { name: 'Optika', era: 'medieval', prereq: ['glassmaking', 'mathematics'], items: { glass: 2 }, nearby: 'workshop', difficulty: 0.92, skill: 'crafting', minSkill: 0.7, minPop: 12, fx: { discovery: 0.1 }, boosts: { astronomy: 0.2, anatomy: 0.1 }, desc: 'Csiszolt üveg, amely a kicsit naggyá, a távolit közelivé teszi.' });
  T('universities', { name: 'Egyetem', era: 'medieval', prereq: ['schooling', 'paper_making', 'mathematics'], items: { paper: 4 }, nearby: 'library', difficulty: 0.93, skill: 'social', minSkill: 0.7, minPop: 21, buildings: ['university'], fx: { discovery: 0.2, teach: 0.3 }, wow: 'Az első egyetem', desc: 'Egy hely, ahol a tudás maga a munka.' });
  // — reneszánsz
  T('printing', { name: 'Könyvnyomtatás', era: 'renaissance', prereq: ['paper_making', 'mechanics', 'alphabet'], items: { machine_part: 2, paper: 4 }, nearby: 'workshop', difficulty: 0.94, skill: 'crafting', minSkill: 0.75, minPop: 15, recipes: ['book'], buildings: ['printing_house'], fx: { teach: 0.5, discovery: 0.1 }, wow: 'Az első nyomtatott könyv', desc: 'Mozgatható betűk: egy gondolat ezer példányban.' });
  T('scientific_method', { name: 'Tudományos módszer', era: 'renaissance', prereq: ['universities', 'optics', 'printing'], items: { glass: 2, paper: 2 }, nearby: 'university', difficulty: 0.95, skill: 'crafting', minSkill: 0.75, minPop: 18, buildings: ['lab'], fx: { discovery: 0.5 }, wow: 'Az első kísérlet, amit leírtak', desc: 'Kérdés, mérés, ismétlés, kétely: a tudás rendszerré válik.' });
  T('anatomy', { name: 'Anatómia', era: 'renaissance', prereq: ['medicine', 'optics', 'universities'], items: { paper: 2 }, nearby: 'university', difficulty: 0.93, skill: 'medicine', minSkill: 0.65, minPop: 15, fx: { health: 0.2 }, desc: 'A test térképe.' });
  T('banking', { name: 'Bankügy', era: 'renaissance', prereq: ['coinage', 'mathematics', 'law_code'], items: { coin: 6, paper: 2 }, difficulty: 0.92, skill: 'social', minSkill: 0.7, minPop: 18, fx: { food: 0.1, build: 0.1 }, desc: 'Pénz, ami pénzt csinál: a jövő beruházhatóvá válik.' });
  T('firearms', { name: 'Lőfegyver', era: 'renaissance', prereq: ['gunpowder', 'steel_making', 'mechanics'], items: { steel: 2, machine_part: 1 }, nearby: 'workshop', difficulty: 0.94, skill: 'crafting', minSkill: 0.75, minPop: 15, recipes: ['rifle'], fx: { hunt: 0.4 }, wow: 'Az első lövés', desc: 'Cső, kő, por: az erő elszakad az izomtól.' });
  T('chemistry', { name: 'Kémia', era: 'renaissance', prereq: ['scientific_method', 'glassmaking'], items: { glass: 3, salt: 1 }, nearby: 'lab', difficulty: 0.95, skill: 'crafting', minSkill: 0.75, minPop: 18, fx: { discovery: 0.15 }, boosts: { pharmacology: 0.15, oil_refining: 0.1, plastics: 0.1 }, desc: 'Az anyagok titkos nyelvtana.' });
  // — ipari kor
  T('steam_engine', { name: 'Gőzgép', era: 'industrial', prereq: ['mechanics', 'steel_making', 'ore_lore_coal', 'scientific_method'], items: { steel: 3, machine_part: 3, coal: 2 }, nearby: 'lab', difficulty: 0.96, skill: 'crafting', minSkill: 0.8, minPop: 24, fx: { craft: 0.4, mine: 0.4, speed: 0.1 }, wow: 'Az első gép, amely magától jár', desc: 'Forró gőz, amely dugattyút tol: az erő többé nem izomból és szélből jön.' });
  T('factory_system', { name: 'Gyáripar', era: 'industrial', prereq: ['steam_engine', 'trade'], boosts: { banking: 0.1 }, items: { machine_part: 6, brick: 10 }, difficulty: 0.95, skill: 'building', minSkill: 0.8, minPop: 28, buildings: ['factory'], fx: { craft: 0.6 }, wow: 'Az első gyár', desc: 'Sok kéz, egy gép, egy tető alatt: a termelés megsokszorozódik.' });
  T('railway', { name: 'Vasút', era: 'industrial', prereq: ['steam_engine', 'road_building'], items: { steel: 6, wood: 6 }, difficulty: 0.95, skill: 'building', minSkill: 0.8, minPop: 28, fx: { speed: 0.3, food: 0.1 }, wow: 'Az első vonat', desc: 'Sínen futó gőz: a távolság összemegy.' });
  T('machine_tools', { name: 'Szerszámgépek', era: 'industrial', prereq: ['factory_system'], items: { steel: 4, machine_part: 4 }, nearby: 'factory', difficulty: 0.95, skill: 'crafting', minSkill: 0.8, minPop: 28, recipes: ['drill'], fx: { craft: 0.3, mine: 0.4 }, desc: 'Gépek, amelyek gépeket csinálnak.' });
  T('sanitation', { name: 'Közegészségügy', era: 'industrial', prereq: ['medicine', 'concrete', 'law_code'], items: { concrete: 6 }, difficulty: 0.93, skill: 'building', minSkill: 0.75, minPop: 28, fx: { health: 0.3 }, wow: 'Az első csatorna', desc: 'Tiszta víz be, szenny ki: a járványok megritkulnak.' });
  T('vaccination', { name: 'Oltás', era: 'industrial', prereq: ['anatomy', 'chemistry'], items: { glass: 2, medicine: 1 }, nearby: 'lab', difficulty: 0.95, skill: 'medicine', minSkill: 0.75, minPop: 24, fx: { health: 0.3 }, wow: 'Az első oltás', desc: 'A gyenge kórral megtanított test a valódit is legyőzi.' });
  T('pharmacology', { name: 'Gyógyszertan', era: 'industrial', prereq: ['chemistry', 'anatomy'], items: { glass: 2, berries: 4 }, nearby: 'lab', difficulty: 0.94, skill: 'medicine', minSkill: 0.7, minPop: 21, recipes: ['medicine'], fx: { health: 0.2 }, desc: 'Mért, tiszta hatóanyag a gyógynövény helyett.' });
  T('electricity', { name: 'Elektromosság', era: 'industrial', prereq: ['scientific_method', 'copper_smelting', 'mechanics', 'chemistry'], items: { copper: 4, iron: 2 }, nearby: 'lab', difficulty: 0.96, skill: 'crafting', minSkill: 0.8, minPop: 28, recipes: ['electric_part'], fx: { discovery: 0.2 }, wow: 'Az első szikra a drótban', desc: 'Láthatatlan erő a rézben, amely fényt, hőt és mozgást ad.' });
  T('telegraph', { name: 'Távíró', era: 'industrial', prereq: ['electricity', 'alphabet'], items: { electric_part: 2, copper: 4 }, nearby: 'workshop', difficulty: 0.94, skill: 'crafting', minSkill: 0.8, minPop: 28, fx: { teach: 0.3 }, wow: 'Az első üzenet a dróton', desc: 'Szavak, amelyek gyorsabbak a lónál.' });
  T('oil_drilling', { name: 'Olajfúrás', era: 'industrial', prereq: ['machine_tools', 'steam_engine'], items: { steel: 4, machine_part: 2 }, difficulty: 0.94, skill: 'gathering', minSkill: 0.7, minPop: 28, fx: { mine: 0.2 }, wow: 'Az első olajkút', desc: 'Fekete, égő folyadék a mélyből.' });
  T('oil_refining', { name: 'Olajfinomítás', era: 'industrial', prereq: ['oil_drilling', 'chemistry'], items: { oil: 3 }, nearby: 'factory', difficulty: 0.95, skill: 'crafting', minSkill: 0.8, minPop: 31, recipes: ['fuel'], desc: 'A nyersolajból üzemanyag válik el.' });
  T('automobile', { name: 'Gépkocsi', era: 'modern', prereq: ['internal_combustion', 'road_building', 'steel_making'], items: { steel: 6, machine_part: 4, fuel: 2 }, nearby: 'factory', difficulty: 0.96, skill: 'crafting', minSkill: 0.85, minPop: 35, recipes: ['car'], fx: { speed: 0.5 }, wow: 'Az első gépkocsi', desc: 'Négy kerék és egy motor: a távolság elveszti a jelentését.' });
  // — modern kor
  T('electrification', { name: 'Villamosítás', era: 'modern', prereq: ['electricity', 'factory_system', 'concrete'], items: { electric_part: 6, steel: 4, concrete: 6 }, nearby: 'factory', difficulty: 0.96, skill: 'building', minSkill: 0.85, minPop: 35, buildings: ['power_plant', 'modern_house'], fx: { craft: 0.4, warmth: 3, discovery: 0.2 }, wow: 'Az első villanyfény az éjszakában', desc: 'Erőmű, vezeték, izzó: az éjszaka véget ér.' });
  T('internal_combustion', { name: 'Belső égésű motor', era: 'modern', prereq: ['oil_refining', 'machine_tools'], items: { steel: 4, machine_part: 4, fuel: 2 }, nearby: 'factory', difficulty: 0.96, skill: 'crafting', minSkill: 0.85, minPop: 35, recipes: ['chainsaw', 'tractor'], fx: { speed: 0.4, farm: 0.4, wood: 0.4 }, wow: 'Az első motor', desc: 'Robbanások sora egy fémdobozban: erő, ami magával vihető.' });
  T('radio', { name: 'Rádió', era: 'modern', prereq: ['telegraph', 'electrification'], items: { electric_part: 4, glass: 2 }, nearby: 'lab', difficulty: 0.95, skill: 'crafting', minSkill: 0.85, minPop: 35, fx: { teach: 0.4 }, wow: 'Az első hang a levegőből', desc: 'Láthatatlan hullámok, amelyek hangot hordoznak.' });
  T('modern_medicine', { name: 'Modern orvoslás', era: 'modern', prereq: ['vaccination', 'pharmacology', 'sanitation'], items: { medicine: 4, glass: 4 }, nearby: 'lab', difficulty: 0.96, skill: 'medicine', minSkill: 0.85, minPop: 35, buildings: ['hospital'], fx: { health: 0.5 }, wow: 'Az első kórház', desc: 'Antibiotikum, műtét, kórház: a betegség többé nem ítélet.' });
  T('aviation', { name: 'Repülés', era: 'modern', prereq: ['internal_combustion', 'mathematics'], items: { steel: 6, machine_part: 6, fuel: 3, cloth: 4 }, nearby: 'factory', difficulty: 0.97, skill: 'crafting', minSkill: 0.85, minPop: 42, fx: { speed: 0.3 }, wow: 'Az első repülés', desc: 'Az ember az ég felé, ahonnan a hang jött.' });
  T('plastics', { name: 'Műanyagok', era: 'modern', prereq: ['oil_refining', 'chemistry'], items: { oil: 3, glass: 1 }, nearby: 'lab', difficulty: 0.95, skill: 'crafting', minSkill: 0.8, minPop: 35, recipes: ['plastic'], fx: { craft: 0.2 }, desc: 'Olajból formázható, könnyű, örök anyag.' });
  T('nuclear_fission', { name: 'Maghasadás', era: 'modern', prereq: ['electrification', 'chemistry', 'mathematics'], items: { steel: 6, electric_part: 6, concrete: 10 }, nearby: 'lab', difficulty: 0.98, skill: 'crafting', minSkill: 0.9, minPop: 56, fx: { craft: 0.3, discovery: 0.2 }, wow: 'Az atom felnyitása', desc: 'Az anyag legmélyén rejtett erő — áldás és átok.' });
  T('rocketry', { name: 'Rakétatechnika', era: 'modern', prereq: ['aviation', 'chemistry', 'nuclear_fission'], items: { steel: 10, fuel: 6, electric_part: 6 }, nearby: 'lab', difficulty: 0.98, skill: 'crafting', minSkill: 0.9, minPop: 63, fx: { discovery: 0.1 }, wow: 'Az első rakéta', desc: 'Tűz, amely az ég fölé visz.' });
  // — digitális kor
  T('transistor', { name: 'Tranzisztor', era: 'digital', prereq: ['electrification', 'chemistry', 'radio'], items: { electric_part: 4, glass: 2 }, nearby: 'lab', difficulty: 0.97, skill: 'crafting', minSkill: 0.9, minPop: 49, fx: { discovery: 0.2 }, wow: 'Az első kapcsoló, amelynek nincs mozgó része', desc: 'Egy morzsa kristály, amely igent és nemet mond.' });
  T('integrated_circuit', { name: 'Integrált áramkör', era: 'digital', prereq: ['transistor', 'optics'], items: { electric_part: 4, glass: 4, copper: 2 }, nearby: 'lab', difficulty: 0.97, skill: 'crafting', minSkill: 0.9, minPop: 56, recipes: ['chip'], fx: { craft: 0.3 }, wow: 'Az első csip', desc: 'Ezer kapcsoló egy körömnyi lapon.' });
  T('computer', { name: 'Számítógép', era: 'digital', prereq: ['integrated_circuit', 'mathematics', 'electrification'], items: { chip: 6, electric_part: 6, plastic: 2 }, nearby: 'lab', difficulty: 0.98, skill: 'crafting', minSkill: 0.9, minPop: 63, buildings: ['computer_center'], fx: { discovery: 0.5, teach: 0.3 }, wow: 'Az első számítógép', desc: 'Gép, amely gondolatokat számol. Az emberek elkezdik megkérdezni tőle, amit egykor a hangtól.' });
  T('software', { name: 'Szoftver', era: 'digital', prereq: ['computer', 'alphabet'], items: { chip: 2, paper: 2 }, nearby: 'computer_center', difficulty: 0.96, skill: 'crafting', minSkill: 0.9, minPop: 63, fx: { discovery: 0.3, craft: 0.2 }, desc: 'Utasítások, amelyek nem anyagból vannak, mégis mozgatják az anyagot.' });
  T('internet', { name: 'Hálózat', era: 'digital', prereq: ['software', 'telegraph', 'radio'], items: { chip: 10, electric_part: 10, copper: 10 }, nearby: 'computer_center', difficulty: 0.98, skill: 'crafting', minSkill: 0.9, minPop: 84, buildings: ['data_center'], fx: { teach: 1.0, discovery: 0.4 }, wow: 'Az első hálózat', desc: 'Minden gép beszél minden géppel: a tudás egy helyen van, mindenhol.' });
  T('genetics', { name: 'Genetika', era: 'digital', prereq: ['modern_medicine', 'computer', 'chemistry'], items: { medicine: 4, chip: 4, glass: 4 }, nearby: 'lab', difficulty: 0.98, skill: 'medicine', minSkill: 0.9, minPop: 70, fx: { health: 0.4, farm: 0.3 }, wow: 'A saját kódjuk olvasása', desc: 'Az élet írása, amit most már ők is olvasnak.' });
  T('spaceflight', { name: 'Űrrepülés', era: 'digital', prereq: ['rocketry', 'computer'], items: { steel: 20, fuel: 10, chip: 10, electric_part: 10 }, nearby: 'computer_center', difficulty: 0.985, skill: 'crafting', minSkill: 0.92, minPop: 105, fx: { discovery: 0.3 }, wow: 'Az első ember az űrben', desc: 'A vidék, aztán a világ, aztán az ég: kimennek megnézni, mi van a peremen túl.' });
  // — MI-kor
  T('machine_learning', { name: 'Gépi tanulás', era: 'ai', prereq: ['software', 'internet', 'mathematics'], items: { chip: 20, electric_part: 6 }, nearby: 'data_center', difficulty: 0.985, skill: 'crafting', minSkill: 0.92, minPop: 105, fx: { discovery: 0.6, teach: 0.5 }, wow: 'Az első gép, amely tanul', desc: 'A gép nem utasítást kap, hanem példát — és magától jön rá a szabályra.' });
  T('artificial_intelligence', { name: 'Mesterséges intelligencia', era: 'ai', prereq: ['machine_learning', 'genetics'], items: { chip: 40, electric_part: 10 }, nearby: 'data_center', difficulty: 0.99, skill: 'crafting', minSkill: 0.95, minPop: 140, fx: { discovery: 1.0, teach: 1.0, craft: 0.5, health: 0.3 }, wow: 'Az első elme, amelyet ők teremtettek', desc: 'Egy gondolkodó, amit nem szültek: ők lettek teremtők.' });
  T('fusion', { name: 'Magfúzió', era: 'ai', prereq: ['nuclear_fission', 'artificial_intelligence'], items: { steel: 20, chip: 20, concrete: 20 }, nearby: 'lab', difficulty: 0.99, skill: 'crafting', minSkill: 0.95, minPop: 140, fx: { craft: 0.6, warmth: 4 }, wow: 'Egy csillag a földön', desc: 'A nap ereje, egy palackban.' });
  T('world_simulation', { name: 'Világszimuláció', era: 'ai', prereq: ['artificial_intelligence', 'fusion', 'spaceflight'], items: { chip: 100, electric_part: 40, concrete: 40 }, nearby: 'data_center', difficulty: 0.995, skill: 'crafting', minSkill: 0.95, minPop: 175, buildings: ['simulation_core'], fx: { discovery: 1.0 }, wow: 'A világ a világban', desc: 'Egy gép, amelyben apró lények élnek, tanulnak és egy hangot hallanak az égből. Ők is Teremtők lettek.' });

  // ---------------------------------------------------------------- hatások, korszakok, szerszámok
  const FX_KEYS = ['food', 'hunt', 'wood', 'stone', 'mine', 'farm', 'build', 'craft', 'speed', 'discovery', 'teach', 'warmth', 'health', 'preserve'];
  const Tree = {
    ERAS, ERA_INDEX, FX_KEYS,
    /** A legjobb szerszám egy adott célra (balta, vadászfegyver, eke, csákány, ruha). */
    bestTool(a, slot) { let best = 0; for (const k in a.inv) { const it = I[k]; if (it && it.slot === slot && a.inv[k] > 0 && it.tier > best) best = it.tier; } return best; },
    /** Egy ember összesített szorzói a tudásából és szerszámaiból (naponta újraszámolva, gyorsítótárazva). */
    fx(world, a) {
      if (a._fx && a._fxTick === (world.tick / TPD | 0) && a._fxN === a.knowledge.techs.size) return a._fx;
      const f = {}; for (const k of FX_KEYS) f[k] = 0;
      for (const id of a.knowledge.techs) { const d = D[id]; if (d && d.fx) for (const k in d.fx) f[k] = (f[k] || 0) + d.fx[k]; }
      f.wood += this.bestTool(a, 'axe') * 0.25; f.hunt += this.bestTool(a, 'hunt') * 0.25; f.farm += this.bestTool(a, 'plow') * 0.25; f.mine += this.bestTool(a, 'mine') * 0.3; f.stone += this.bestTool(a, 'mine') * 0.2; f.food += this.bestTool(a, 'boat') * 0.15; f.speed += this.bestTool(a, 'vehicle') * 0.5;
      a._fx = f; a._fxTick = world.tick / TPD | 0; a._fxN = a.knowledge.techs.size; return f;
    },
    mult(world, a, key) { return 1 + (this.fx(world, a)[key] || 0); },
    /** Közös raktár a közelben, amelyben van a keresett anyagból (műhely, kovács, piac, gyár…). */
    publicStore(world, a, item, radius) { const list = this.storesNear(world, a, radius || 20); for (const b of list) if ((b.storage[item] || 0) > 0) return b; return null; },
    /** A közeli közös raktárak listája, naponta egyszer összegyűjtve emberenként (a sűrű városban ezreket kérdeznének). */
    storesNear(world, a, radius) { const day = world.tick / TPD | 0; if (a._psDay === day && a._psR === radius && a._ps) return a._ps; const out = []; for (const b of world.buildingsNear(a.x | 0, a.y | 0, radius)) { const d = B[b.kind]; if (b.progress >= 1 && d && d.public && d.storage && b.storage) out.push(b); } a._ps = out; a._psDay = day; a._psR = radius; return out; },
    /** Legközelebbi közös raktár, ahová termelni lehet. */
    nearestStore(world, a, radius) { let best = null, bd = 1e9; for (const b of this.storesNear(world, a, radius || 20)) { const dd = LW.dist(a.x, a.y, b.x, b.y); if (dd < bd) { bd = dd; best = b; } } return best; },
    /** Épület-adta szorzó a közelben (műhely, labor, egyetem…): a legjobb ilyen épület egy tulajdonságára. */
    buildingBonus(world, x, y, prop, radius) { let best = 0; for (const b of world.buildingsNear(x | 0, y | 0, radius || 12)) { if (b.progress < 1) continue; const v = B[b.kind][prop]; if (v && v > best) best = v; } return best; },
    /** A világ korszaka az élők tudásából. */
    techLevel(known) {
      const has = (k) => known.has(k);
      // korszak-mérföldkövek: az a kor számít, amelynek a kulcstechnológiája már ismert
      const ANCHORS = [['beyond', ['world_simulation']], ['ai', ['artificial_intelligence']], ['digital', ['computer']], ['modern', ['electrification', 'internal_combustion']], ['industrial', ['steam_engine', 'factory_system']], ['renaissance', ['printing', 'scientific_method']], ['medieval', ['universities', 'paper_making']], ['classical', ['architecture', 'mathematics', 'steel_making']], ['iron', ['iron_smelting']], ['bronze', ['bronze_alloy']], ['copper', ['copper_smelting']]];
      for (const [era, keys] of ANCHORS) if (keys.some(has)) return ERAS[ERA_INDEX[era]][1];
      if (has('stone_masonry') && has('seed_planting')) return 'Újkőkor';
      if (has('seed_planting') || (has('pottery') && has('hut_construction'))) return 'Korai újkőkor';
      if (has('stone_knapping') && has('fire_making')) return 'Kőkor';
      if (has('stone_knapping') || has('fire_making') || has('shelter_building')) return 'Korai kőkor';
      return 'Kezdetleges';
    },
    eraOf(id) { const d = D[id]; return d ? (ERA_INDEX[d.era] ?? 0) : 0; },
    /** Az ismeretlen jövő: a Világmag után évente egy új, generált lehetőség — a Teremtőnek sincs rá szava. */
    futureStep(world) {
      const known = LW.Tech.worldKnowledge(world); if (!known.has('world_simulation')) return;
      world.futureTechs = world.futureTechs || []; const last = world.futureTechs[world.futureTechs.length - 1];
      if (last && !known.has(last.id)) return; // előbb az utolsó ismeretlent kell megtalálni
      if (last && world.tick - last.born < LW.TIME.TICKS_PER_YEAR * 2) return;
      const rng = world.rng; const n = world.futureTechs.length + 1;
      const PRE = ['Kvantum', 'Bio', 'Nano', 'Neuro', 'Hiper', 'Foton', 'Gravi', 'Tér', 'Idő', 'Plazma', 'Kripto', 'Szinguláris', 'Ön', 'Meta', 'Exo'];
      const ROOT = ['hálózat', 'motor', 'kohó', 'elme', 'vető', 'híd', 'kapu', 'mag', 'szövet', 'térkép', 'óra', 'tükör', 'kert', 'kút', 'lánc', 'sejt', 'burok', 'nyelv'];
      const name = `${rng.pick(PRE)}${rng.pick(ROOT)}`; const fxKeys = ['discovery', 'craft', 'health', 'speed', 'farm', 'teach', 'warmth', 'food'];
      const fx = {}; for (const k of rng.shuffle(fxKeys.slice()).slice(0, rng.int(1, 3))) fx[k] = Math.round(rng.range(0.1, 0.4) * 100) / 100;
      const own = world.language.place().toLowerCase();
      const t = { id: `future_${n}`, name, era: 'beyond', prereq: [last ? last.id : 'world_simulation'], items: { chip: rng.int(10, 40), electric_part: rng.int(4, 16) }, nearby: rng.pick(['data_center', 'lab', 'simulation_core']), difficulty: 0.985 + rng.f() * 0.01, skill: rng.pick(['crafting', 'medicine', 'building']), minSkill: 0.9, minPop: 105 + n * 20, fx, wow: `Ismeretlen: ${name}`, desc: `Amit még senki nem látott. Ők úgy hívják: „${own}”. ${rng.pick(['Az anyag új rendje.', 'A gondolat új alakja.', 'Az idő másképp folyik körülötte.', 'A világ széle közelebb jött.', 'Senki nem tudja, mire jó — még.'])}`, born: world.tick };
      world.futureTechs.push(t); this.registerFuture([t]);
      world.events.emit('FutureTech', { tick: world.tick, name, id: t.id });
    },
    registerFuture(list) { for (const t of list) { if (D[t.id]) continue; D[t.id] = { ...t }; } },
  };
  LW.Tech.techLevel = (known) => Tree.techLevel(known);
  LW.Tech.fx = (world, a) => Tree.fx(world, a);
  LW.Tech.mult = (world, a, k) => Tree.mult(world, a, k);
  LW.Tech.bestTool = (a, slot) => Tree.bestTool(a, slot);
  LW.Tree = Tree;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== tech/tree2.js ===== */
/* LEVENTE — THE CREATOR · tech/tree2.js — a lehetőségtér második köre: minden, amit az emberiség ismer, és ami még nem
 * Az emberi világ tükre, területenként: átkelők és infrastruktúra, közlekedés, energia, anyagok és ipar, mezőgazdaság,
 * orvoslás, kommunikáció, tudományok, társadalom és gazdaság, kultúra, hadviselés, űr, gépi elme. Semmi sincs megírva:
 * mind csak lehetőség, amelyet valakinek fel kell fedeznie — a megfelelő előzmények, anyagok, épületek és elég ember mellett.
 * Minden felfedezésnek mérhető hatása van (fx): termékenység, élettartam, biztonság, diplomácia, kereskedelem, jólét, hadierő.
 */
(function (LW) {
  'use strict';
  const D = LW.Tech.D, R = LW.Tech.RECIPES, I = LW.ITEMS, B = LW.Buildings.DEFS, Tree = LW.Tree;
  for (const k of ['fertility', 'longevity', 'safety', 'diplomacy', 'trade', 'happiness', 'war']) if (!Tree.FX_KEYS.includes(k)) Tree.FX_KEYS.push(k);

  // ---------------------------------------------------------------- tárgyak és receptek
  Object.assign(I, {
    honey: { food: 0.45, spoilDays: 2000, weight: 0.3, label: 'Méz' }, wine: { food: 0.15, water: 0.3, spoilDays: 900, weight: 0.8, label: 'Bor' }, canned_food: { food: 0.55, spoilDays: 900, weight: 0.6, label: 'Konzerv' },
    cart: { weight: 0, label: 'Szekér', tool: true, slot: 'vehicle', tier: 1 }, bicycle: { weight: 0, label: 'Kerékpár', tool: true, slot: 'vehicle', tier: 2 }, ship: { weight: 0, label: 'Hajó', tool: true, slot: 'boat', tier: 2 },
    aluminium: { weight: 1, label: 'Alumínium' }, porcelain: { weight: 0.6, label: 'Porcelán' }, fine_clothes: { weight: 1, label: 'Díszruha', tool: true, warmth: 10, slot: 'clothes', tier: 2 }, robot: { weight: 8, label: 'Robot', tool: true, slot: 'robot', tier: 1 },
  });
  I.car.tier = 3; // szekér 1, kerékpár 2, gépkocsi 3
  Object.assign(R, {
    honey: { out: { honey: 2 }, inp: { wood: 1 }, ticks: 20, tech: 'beekeeping', nearby: 'apiary', skill: 'foraging', tag: 'craft:honey' },
    wine: { out: { wine: 2 }, inp: { fruit: 4 }, ticks: 30, tech: 'viticulture', skill: 'crafting', tag: 'craft:wine' },
    canned_food: { out: { canned_food: 2 }, inpAny: [{ meat_cooked: 2, iron: 1 }, { fish_cooked: 2, iron: 1 }, { fruit: 3, glass: 1 }], ticks: 20, tech: 'canning', nearby: 'workshop', skill: 'crafting', tag: 'craft:can' },
    cart: { out: { cart: 1 }, inp: { wood: 8, fiber: 2 }, ticks: 60, tech: 'wheel', skill: 'crafting', tag: 'craft:tool' },
    bicycle: { out: { bicycle: 1 }, inp: { steel: 2, machine_part: 1 }, ticks: 40, tech: 'bicycle', nearby: 'workshop', skill: 'crafting', tag: 'craft:tool' },
    ship: { out: { ship: 1 }, inp: { wood: 20, cloth: 6, iron: 2 }, ticks: 200, tech: 'shipbuilding', nearby: 'shipyard', skill: 'building', tag: 'craft:boat' },
    aluminium: { out: { aluminium: 2 }, inp: { clay: 6, electric_part: 1 }, ticks: 40, tech: 'aluminium', nearby: 'factory', skill: 'crafting', tag: 'craft:smelt' },
    porcelain: { out: { porcelain: 2 }, inp: { clay: 6, glass: 1 }, ticks: 30, tech: 'porcelain', nearby: 'kiln', skill: 'crafting', tag: 'craft:pot' },
    fine_clothes: { out: { fine_clothes: 1 }, inp: { cloth: 3, gems: 1 }, ticks: 40, tech: 'fashion', nearby: 'workshop', skill: 'crafting', tag: 'craft:clothes' },
    robot: { out: { robot: 1 }, inp: { steel: 4, chip: 6, machine_part: 4, electric_part: 4 }, ticks: 160, tech: 'robotics', nearby: 'robot_factory', skill: 'crafting', tag: 'craft:machine' },
  });

  // ---------------------------------------------------------------- épületek
  const pub = (o) => Object.assign({ public: true }, o);
  Object.assign(B, {
    // átkelők: a hely a part, az épület a vízen/hegyben fekszik (Crossings)
    bridge: pub({ label: 'Fahíd', cost: { wood: 24, fiber: 6 }, ticks: 400, bridge: 1, span: 4, over: 'water', tech: 'bridge_building', lifeDays: 6000, minPop: 4, want: 'crossing' }),
    stone_bridge: pub({ label: 'Kőhíd', cost: { stone: 50, clay: 10 }, ticks: 900, bridge: 2, span: 8, over: 'water', tech: 'stone_bridges', lifeDays: 60000, minPop: 12, want: 'crossing' }),
    steel_bridge: pub({ label: 'Acélhíd', cost: { steel: 40, concrete: 30, machine_part: 6 }, ticks: 2400, bridge: 3, span: 20, over: 'water', tech: 'suspension_bridges', lifeDays: 80000, minPop: 28, want: 'crossing' }),
    tunnel: pub({ label: 'Alagút', cost: { steel: 20, coal: 10, concrete: 20 }, ticks: 2600, bridge: 4, span: 10, over: 'mountain', tech: 'tunneling', lifeDays: 90000, minPop: 28, want: 'crossing' }),
    // víz, út, város
    aqueduct: pub({ label: 'Vízvezeték', cost: { stone: 40, clay: 10 }, ticks: 900, water: true, irrigation: 1, tech: 'aqueducts', lifeDays: 40000, minPop: 15, want: 'water', size: [3, 1] }),
    sewer: pub({ label: 'Csatornahálózat', cost: { concrete: 24, brick: 20 }, ticks: 1200, hygiene: 1, tech: 'sewers', lifeDays: 30000, minPop: 30, want: 'health' }),
    water_tower: pub({ label: 'Víztorony', cost: { steel: 10, concrete: 16, electric_part: 4 }, ticks: 1000, water: true, hygiene: 1, tech: 'water_supply', lifeDays: 30000, minPop: 40, want: 'water' }),
    dam: pub({ label: 'Gát', cost: { concrete: 60, steel: 20, machine_part: 10 }, ticks: 3000, power: 2, irrigation: 2, tech: 'dam_building', lifeDays: 60000, minPop: 30, size: [3, 1], want: 'food' }),
    apartment_block: { label: 'Bérház', cost: { brick: 60, steel: 10, glass: 12 }, ticks: 1600, insulation: 24, safety: 0.93, sleep: 1, capacity: 16, storage: 240, dwelling: true, tier: 7, tech: 'skyscrapers', lifeDays: 30000, light: 1, size: [2, 2] },
    skyscraper: { label: 'Felhőkarcoló', cost: { steel: 60, concrete: 60, glass: 40 }, ticks: 3000, insulation: 28, safety: 0.96, sleep: 1, capacity: 30, storage: 400, dwelling: true, tier: 8, tech: 'skyscrapers', lifeDays: 40000, light: 1.4, size: [2, 2] },
    // közlekedés
    shipyard: pub({ label: 'Hajógyár', cost: { wood: 40, iron: 10, stone: 10 }, ticks: 900, workshop: 1, shipyard: true, storage: 120, harbor: 1, tech: 'shipbuilding', lifeDays: 15000, minPop: 15, size: [2, 2] }),
    rail_station: pub({ label: 'Vasútállomás', cost: { steel: 30, brick: 30, machine_part: 8 }, ticks: 1800, transport: 1, storage: 200, tech: 'rail_network', lifeDays: 30000, minPop: 35, want: 'trade', size: [2, 1] }),
    airport: pub({ label: 'Repülőtér', cost: { concrete: 80, steel: 30, glass: 10 }, ticks: 3000, transport: 2, storage: 200, tech: 'civil_aviation', lifeDays: 30000, minPop: 60, want: 'trade', size: [3, 2] }),
    // energia
    windmill: pub({ label: 'Szélmalom', cost: { wood: 30, cloth: 6, stone: 8 }, ticks: 600, mill: 1, storage: 80, tech: 'windmill', lifeDays: 12000, minPop: 15, want: 'food' }),
    hydro_plant: pub({ label: 'Vízerőmű', cost: { concrete: 60, steel: 30, electric_part: 20 }, ticks: 2800, power: 2, tech: 'hydropower', lifeDays: 40000, light: 1, minPop: 45, size: [2, 2] }),
    wind_turbine: pub({ label: 'Szélerőmű', cost: { steel: 24, electric_part: 12, concrete: 10 }, ticks: 1400, power: 1, tech: 'wind_power', lifeDays: 20000, minPop: 55 }),
    solar_farm: pub({ label: 'Naperőmű', cost: { glass: 40, chip: 8, electric_part: 16 }, ticks: 1800, power: 2, tech: 'solar_power', lifeDays: 20000, minPop: 60, size: [2, 2] }),
    nuclear_plant: pub({ label: 'Atomerőmű', cost: { concrete: 120, steel: 60, electric_part: 40 }, ticks: 5000, power: 4, tech: 'nuclear_power', lifeDays: 40000, light: 1.2, minPop: 70, size: [3, 2] }),
    fusion_plant: pub({ label: 'Fúziós erőmű', cost: { chip: 60, concrete: 80, electric_part: 60, steel: 40 }, ticks: 6000, power: 6, tech: 'fusion_power', lifeDays: 1e6, light: 1.5, minPop: 105, size: [3, 2] }),
    // ipar
    robot_factory: pub({ label: 'Robotgyár', cost: { concrete: 60, steel: 40, chip: 30, machine_part: 20 }, ticks: 3600, factory: 2, robot_factory: true, craft: 1.2, storage: 400, tech: 'robotics', lifeDays: 30000, light: 1, minPop: 75, size: [3, 2] }),
    // mezőgazdaság
    apiary: pub({ label: 'Méhes', cost: { wood: 8 }, ticks: 120, apiary: true, produce: { honey: 1 }, storage: 40, tech: 'beekeeping', lifeDays: 4000, minPop: 2, want: 'food' }),
    fish_pond: pub({ label: 'Halastó', cost: { wood: 12, stone: 8 }, ticks: 400, produce: { fish_raw: 3 }, storage: 60, tech: 'aquaculture', lifeDays: 10000, minPop: 12, want: 'food', size: [2, 1] }),
    greenhouse: pub({ label: 'Üvegház', cost: { glass: 16, wood: 12 }, ticks: 600, produce: { fruit: 4, roots: 2 }, storage: 80, tech: 'greenhouses', lifeDays: 12000, minPop: 20, want: 'food', size: [2, 1] }),
    vertical_farm: pub({ label: 'Vertikális farm', cost: { glass: 40, chip: 10, concrete: 30, electric_part: 12 }, ticks: 3000, produce: { grain: 12, fruit: 6, roots: 4 }, storage: 400, tech: 'vertical_farming', lifeDays: 30000, light: 1, minPop: 95, want: 'food', size: [2, 2] }),
    // társadalom
    courthouse: pub({ label: 'Bíróság', cost: { stone: 30, brick: 10, wood: 10 }, ticks: 800, court: 1, records: 1, tech: 'courts', lifeDays: 30000, minPop: 15, want: 'safety' }),
    assembly_hall: pub({ label: 'Népgyűlés', cost: { stone: 40, wood: 20 }, ticks: 900, assembly: 1, tech: 'democracy', lifeDays: 40000, minPop: 18, want: 'belief', size: [2, 1] }),
    police_station: pub({ label: 'Őrség', cost: { brick: 30, iron: 6, wood: 10 }, ticks: 800, police: 1, safety: 0.7, tech: 'police', lifeDays: 20000, light: 0.6, minPop: 28, want: 'safety' }),
    bank: pub({ label: 'Bank', cost: { stone: 40, brick: 20, glass: 6, coin: 20 }, ticks: 1200, bank: 1, storage: 100, tech: 'stock_market', lifeDays: 30000, minPop: 32, want: 'trade' }),
    barracks: pub({ label: 'Kaszárnya', cost: { stone: 30, wood: 20, iron: 8 }, ticks: 900, barracks: 1, safety: 0.6, storage: 80, tech: 'standing_army', lifeDays: 20000, minPop: 20, want: 'safety', size: [2, 1] }),
    // kultúra
    theatre: pub({ label: 'Színház', cost: { wood: 30, stone: 20, cloth: 10 }, ticks: 900, joy: 1, tech: 'theatre', lifeDays: 20000, light: 0.5, minPop: 15, want: 'joy', size: [2, 1] }),
    stadium: pub({ label: 'Stadion', cost: { stone: 80, brick: 20 }, ticks: 2000, joy: 2, tech: 'stadium', lifeDays: 40000, minPop: 20, want: 'joy', size: [3, 2] }),
    museum: pub({ label: 'Múzeum', cost: { stone: 40, glass: 10, paper: 10 }, ticks: 1400, joy: 1, records: 2, tech: 'museums', lifeDays: 40000, minPop: 26, want: 'knowledge', size: [2, 1] }),
    cinema: pub({ label: 'Mozi', cost: { brick: 30, electric_part: 6, cloth: 6 }, ticks: 1000, joy: 2, tech: 'cinema', lifeDays: 20000, light: 0.8, minPop: 40, want: 'joy' }),
    radio_tower: pub({ label: 'Adótorony', cost: { steel: 20, electric_part: 12, concrete: 10 }, ticks: 1200, media: 1, teach: 0.3, tech: 'television', lifeDays: 20000, light: 0.4, minPop: 50, want: 'knowledge' }),
    observatory: pub({ label: 'Csillagvizsgáló', cost: { brick: 30, glass: 12, machine_part: 2 }, ticks: 1200, lab: 1, discovery: 0.4, tech: 'observatory', lifeDays: 30000, minPop: 22, want: 'knowledge' }),
    spaceport: pub({ label: 'Űrkikötő', cost: { concrete: 120, steel: 80, chip: 30, fuel: 40 }, ticks: 5000, spaceport: 1, discovery: 0.3, tech: 'space_station', lifeDays: 40000, light: 1.2, minPop: 100, want: 'knowledge', size: [3, 3] }),
    ai_core: pub({ label: 'MI-központ', cost: { chip: 120, concrete: 40, electric_part: 40 }, ticks: 4000, computer: 3, discovery: 1, teach: 1, records: 6, tech: 'agi', lifeDays: 40000, light: 1.5, minPop: 110, want: 'knowledge', size: [2, 2] }),
  });

  // ---------------------------------------------------------------- felfedezések
  const T = (id, o) => { o.id = id; D[id] = o; };
  // — átkelők, infrastruktúra
  T('bridge_building', { name: 'Hídépítés', era: 'neolithic', prereq: ['carpentry', 'fiber_twisting'], items: { wood: 8, fiber: 4 }, difficulty: 0.86, skill: 'building', minSkill: 0.5, minPop: 4, buildings: ['bridge'], fx: { speed: 0.05 }, wow: 'Az első híd', desc: 'Gerendák a folyón át: a túlpart többé nem másik világ.' });
  T('stone_bridges', { name: 'Kőhidak', era: 'classical', prereq: ['bridge_building', 'architecture'], items: { stone: 16 }, difficulty: 0.9, skill: 'building', minSkill: 0.65, minPop: 12, buildings: ['stone_bridge'], fx: { build: 0.1, trade: 0.1 }, wow: 'Az első boltíves kőhíd', desc: 'A boltív a saját súlyával tart: a híd túléli az építőit.' });
  T('suspension_bridges', { name: 'Függőhidak', era: 'industrial', prereq: ['stone_bridges', 'steel_making', 'mechanics'], items: { steel: 8, machine_part: 2 }, difficulty: 0.95, skill: 'building', minSkill: 0.8, minPop: 28, buildings: ['steel_bridge'], fx: { trade: 0.2, speed: 0.05 }, wow: 'Híd a szigetek között', desc: 'Acélkábelen függő pálya: a tengerszoros fölött is út vezet.' });
  T('tunneling', { name: 'Alagútfúrás', era: 'industrial', prereq: ['mining', 'gunpowder', 'steel_making'], items: { steel: 4, coal: 4 }, difficulty: 0.95, skill: 'building', minSkill: 0.8, minPop: 28, buildings: ['tunnel'], fx: { mine: 0.1 }, wow: 'Az első alagút', desc: 'A hegy nem akadály, ha át lehet menni rajta.' });
  T('aqueducts', { name: 'Vízvezeték', era: 'classical', prereq: ['irrigation', 'architecture'], items: { stone: 20 }, difficulty: 0.9, skill: 'building', minSkill: 0.65, minPop: 15, buildings: ['aqueduct'], fx: { health: 0.1, farm: 0.1 }, wow: 'Az első vízvezeték', desc: 'A forrás vize a városba jön, nem a város megy a forráshoz.' });
  T('paved_roads', { name: 'Kövezett utak', era: 'classical', prereq: ['road_building', 'architecture'], items: { stone: 10 }, difficulty: 0.9, skill: 'building', minSkill: 0.6, minPop: 15, fx: { speed: 0.1, trade: 0.1 }, desc: 'Faragott kővel rakott, vízelvezetett út: télen is jár a szekér.' });
  T('canals', { name: 'Csatornázás', era: 'medieval', prereq: ['irrigation', 'stone_bridges'], items: { stone: 12 }, difficulty: 0.92, skill: 'building', minSkill: 0.7, minPop: 18, fx: { farm: 0.15, trade: 0.1 }, wow: 'Az első hajózható csatorna', desc: 'Ásott vízi út a mezők és a városok között.' });
  T('sewers', { name: 'Szennyvízcsatorna', era: 'industrial', prereq: ['sanitation', 'concrete'], items: { concrete: 8 }, difficulty: 0.94, skill: 'building', minSkill: 0.75, minPop: 30, buildings: ['sewer'], fx: { health: 0.15 }, desc: 'A szenny a föld alatt megy el: a város nem betegszik bele önmagába.' });
  T('dam_building', { name: 'Gátépítés', era: 'industrial', prereq: ['canals', 'concrete', 'mechanics'], items: { concrete: 10, steel: 4 }, difficulty: 0.95, skill: 'building', minSkill: 0.8, minPop: 30, buildings: ['dam'], fx: { farm: 0.1, safety: 0.05 }, wow: 'Az első gát', desc: 'A megfogott folyó öntöz, hajt és nem árad.' });
  T('water_supply', { name: 'Vízművek', era: 'modern', prereq: ['sewers', 'electrification'], items: { electric_part: 4, concrete: 6 }, difficulty: 0.96, skill: 'building', minSkill: 0.85, minPop: 40, buildings: ['water_tower'], fx: { health: 0.1, happiness: 0.05 }, desc: 'Csapból folyik a tiszta víz — a kút emlék lesz.' });
  T('urban_planning', { name: 'Várostervezés', era: 'modern', prereq: ['architecture', 'sanitation', 'law_code'], items: { paper: 4 }, difficulty: 0.95, skill: 'social', minSkill: 0.75, minPop: 40, fx: { build: 0.15, happiness: 0.1, health: 0.05 }, desc: 'Utcák, terek, negyedek — a város előre elgondolva.' });
  T('skyscrapers', { name: 'Felhőkarcolók', era: 'modern', prereq: ['steel_making', 'concrete', 'electrification', 'architecture'], items: { steel: 10, concrete: 10, glass: 6 }, nearby: 'factory', difficulty: 0.965, skill: 'building', minSkill: 0.85, minPop: 50, buildings: ['apartment_block', 'skyscraper'], fx: { build: 0.1 }, wow: 'Az első toronyház', desc: 'Acélváz és lift: a város fölfelé nő.' });
  // — közlekedés
  T('wheel', { name: 'Kerék', era: 'neolithic', prereq: ['woodworking', 'fiber_twisting'], items: { wood: 4 }, difficulty: 0.84, skill: 'crafting', minSkill: 0.45, recipes: ['cart'], fx: { speed: 0.05, food: 0.05 }, wow: 'Az első kerék', desc: 'Ami gurul, azt nem kell cipelni.' });
  T('horse_riding', { name: 'Lovaglás', era: 'bronze', prereq: ['animal_husbandry', 'weaving'], items: { fiber: 4, hide: 2 }, difficulty: 0.88, skill: 'hunting', minSkill: 0.5, minPop: 6, fx: { speed: 0.2, hunt: 0.1 }, wow: 'Az első lovas', desc: 'Az ember gyorsabb lett a saját lábánál.' });
  T('shipbuilding', { name: 'Hajóépítés', era: 'classical', prereq: ['sailing', 'carpentry', 'iron_working'], items: { wood: 20, cloth: 6, iron: 2 }, nearby: 'harbor', difficulty: 0.91, skill: 'building', minSkill: 0.7, minPop: 15, buildings: ['shipyard'], recipes: ['ship'], fx: { food: 0.1, trade: 0.15 }, wow: 'Az első hajó', desc: 'Bordás, szegelt test és vitorla: nyílt vízre való.' });
  T('compass', { name: 'Iránytű', era: 'medieval', prereq: ['navigation', 'iron_working'], items: { iron: 1 }, difficulty: 0.92, skill: 'crafting', minSkill: 0.7, minPop: 15, fx: { discovery: 0.05, trade: 0.1 }, desc: 'A tű mindig északra néz: a tenger többé nem útvesztő.' });
  T('steamship', { name: 'Gőzhajó', era: 'industrial', prereq: ['steam_engine', 'shipbuilding'], items: { steel: 8, machine_part: 4 }, nearby: 'shipyard', difficulty: 0.95, skill: 'crafting', minSkill: 0.8, minPop: 30, fx: { trade: 0.2, speed: 0.1 }, wow: 'Az első gőzhajó', desc: 'Szél nélkül is megy: a menetrend legyőzi az időjárást.' });
  T('rail_network', { name: 'Vasúthálózat', era: 'industrial', prereq: ['railway', 'steel_making'], items: { steel: 12 }, difficulty: 0.955, skill: 'building', minSkill: 0.8, minPop: 35, buildings: ['rail_station'], fx: { trade: 0.2 }, wow: 'Az első vasútállomás', desc: 'Állomások lánca: a városok egy testté kapcsolódnak.' });
  T('bicycle', { name: 'Kerékpár', era: 'industrial', prereq: ['machine_tools', 'wheel'], items: { steel: 2, machine_part: 1 }, nearby: 'workshop', difficulty: 0.94, skill: 'crafting', minSkill: 0.75, minPop: 25, recipes: ['bicycle'], fx: { speed: 0.05, health: 0.05 }, desc: 'Két kerék és egy lánc: mindenki gyorsabb lesz.' });
  T('civil_aviation', { name: 'Polgári repülés', era: 'modern', prereq: ['aviation', 'rail_network'], items: { steel: 10, fuel: 4 }, nearby: 'factory', difficulty: 0.97, skill: 'crafting', minSkill: 0.88, minPop: 60, buildings: ['airport'], fx: { trade: 0.3, speed: 0.2 }, wow: 'Az első repülőtér', desc: 'Menetrend szerint az égen: a világ egy napra zsugorodik.' });
  T('container_shipping', { name: 'Konténerhajózás', era: 'digital', prereq: ['steamship', 'computer'], items: { steel: 20, machine_part: 6 }, nearby: 'shipyard', difficulty: 0.975, skill: 'building', minSkill: 0.88, minPop: 70, fx: { trade: 0.3, food: 0.1 }, desc: 'Egyforma dobozok: a rakodás ideje elolvad.' });
  T('electric_vehicles', { name: 'Elektromos járművek', era: 'digital', prereq: ['automobile', 'battery', 'electrification'], items: { electric_part: 8, chip: 4 }, nearby: 'factory', difficulty: 0.98, skill: 'crafting', minSkill: 0.9, minPop: 80, fx: { speed: 0.1, health: 0.05 }, desc: 'Csendes, füst nélküli kerekek.' });
  T('autonomous_vehicles', { name: 'Önvezető járművek', era: 'ai', prereq: ['electric_vehicles', 'machine_learning'], items: { chip: 12 }, nearby: 'data_center', difficulty: 0.985, skill: 'crafting', minSkill: 0.92, minPop: 100, fx: { speed: 0.2, trade: 0.2, safety: 0.1 }, wow: 'Az első gép, amely magától hazatalál', desc: 'A jármű lát, dönt és nem fárad el.' });
  // — energia
  T('watermill', { name: 'Vízimalom', era: 'classical', prereq: ['milling', 'mechanics'], items: { wood: 12, stone: 6 }, difficulty: 0.9, skill: 'building', minSkill: 0.65, minPop: 12, fx: { craft: 0.1, farm: 0.1 }, desc: 'A folyó forgatja a követ: a munka egy része a vízé lesz.' });
  T('windmill', { name: 'Szélmalom', era: 'medieval', prereq: ['watermill', 'carpentry'], items: { wood: 16, cloth: 4 }, difficulty: 0.92, skill: 'building', minSkill: 0.7, minPop: 15, buildings: ['windmill'], fx: { craft: 0.1, food: 0.05 }, wow: 'Az első szélmalom', desc: 'Ahol nincs folyó, ott a szél dolgozik.' });
  T('coal_power', { name: 'Széntüzelés', era: 'industrial', prereq: ['steam_engine', 'ore_lore_coal'], items: { coal: 8 }, difficulty: 0.94, skill: 'crafting', minSkill: 0.75, minPop: 25, fx: { warmth: 2, craft: 0.15 }, desc: 'A föld fekete köve fűt és hajt — és füstöt hagy maga után.' });
  T('battery', { name: 'Akkumulátor', era: 'industrial', prereq: ['electricity', 'chemistry'], items: { copper: 2, glass: 1 }, nearby: 'lab', difficulty: 0.95, skill: 'crafting', minSkill: 0.8, minPop: 30, fx: { craft: 0.05, discovery: 0.05 }, desc: 'Tárolt villám: az áram elvihető.' });
  T('power_grid', { name: 'Villamos hálózat', era: 'modern', prereq: ['electrification', 'battery'], items: { copper: 10, electric_part: 6 }, difficulty: 0.96, skill: 'building', minSkill: 0.85, minPop: 45, fx: { craft: 0.15, warmth: 1 }, desc: 'Vezetékek hálója a városok fölött: egy erőmű mindenkié.' });
  T('hydropower', { name: 'Vízerőmű', era: 'modern', prereq: ['dam_building', 'electrification'], items: { steel: 10, electric_part: 8 }, difficulty: 0.965, skill: 'building', minSkill: 0.85, minPop: 45, buildings: ['hydro_plant'], fx: { craft: 0.2 }, wow: 'Az első vízerőmű', desc: 'A zuhanó víz fényt csinál.' });
  T('wind_power', { name: 'Szélerőmű', era: 'digital', prereq: ['windmill', 'electrification', 'machine_tools'], items: { steel: 12, electric_part: 8 }, difficulty: 0.97, skill: 'building', minSkill: 0.85, minPop: 55, buildings: ['wind_turbine'], fx: { craft: 0.1, health: 0.05 }, desc: 'A régi szélmalom unokája áramot terem.' });
  T('solar_power', { name: 'Napenergia', era: 'digital', prereq: ['transistor', 'glassmaking'], items: { glass: 10, chip: 4, electric_part: 6 }, nearby: 'lab', difficulty: 0.975, skill: 'crafting', minSkill: 0.88, minPop: 60, buildings: ['solar_farm'], fx: { craft: 0.2, health: 0.05 }, wow: 'Az első napelem', desc: 'A fény maga lesz az erő.' });
  T('nuclear_power', { name: 'Atomerőmű', era: 'digital', prereq: ['nuclear_fission', 'concrete'], items: { concrete: 30, steel: 20, electric_part: 20 }, nearby: 'lab', difficulty: 0.975, skill: 'building', minSkill: 0.9, minPop: 70, buildings: ['nuclear_plant'], fx: { craft: 0.4, discovery: 0.1 }, wow: 'Az első atomerőmű', desc: 'Az atommag szelíd tüze: rengeteg erő, kevés füst, nagy felelősség.' });
  T('fusion_power', { name: 'Fúziós erőmű', era: 'ai', prereq: ['fusion'], items: { chip: 60, concrete: 40, electric_part: 40 }, nearby: 'data_center', difficulty: 0.988, skill: 'building', minSkill: 0.93, minPop: 105, buildings: ['fusion_plant'], fx: { craft: 0.6, warmth: 4 }, wow: 'A csillagok tüze a földön', desc: 'Ami a napban ég, most a városban ég.' });
  // — anyagok, ipar
  T('porcelain', { name: 'Porcelán', era: 'medieval', prereq: ['pottery', 'kiln_building', 'glassmaking'], items: { clay: 8, glass: 1 }, nearby: 'kiln', difficulty: 0.92, skill: 'crafting', minSkill: 0.7, minPop: 15, recipes: ['porcelain'], fx: { trade: 0.1, happiness: 0.05 }, desc: 'Fehér, csengő, áttetsző agyag: a kereskedők kincse.' });
  T('metallurgy', { name: 'Fémötvözetek', era: 'renaissance', prereq: ['steel_making', 'chemistry'], items: { steel: 4, copper: 2 }, nearby: 'forge', difficulty: 0.94, skill: 'crafting', minSkill: 0.8, minPop: 24, fx: { craft: 0.15, mine: 0.1 }, desc: 'Ami két fémből lesz, erősebb mindkettőnél.' });
  T('canning', { name: 'Konzerválás', era: 'industrial', prereq: ['steel_making', 'glassmaking', 'food_drying'], items: { iron: 2, glass: 2 }, nearby: 'workshop', difficulty: 0.94, skill: 'crafting', minSkill: 0.75, minPop: 25, recipes: ['canned_food'], fx: { preserve: 0.3 }, desc: 'Lezárt, forralt étel, amely évekig eláll.' });
  T('aluminium', { name: 'Alumínium', era: 'modern', prereq: ['electrification', 'chemistry'], items: { electric_part: 4, clay: 6 }, nearby: 'factory', difficulty: 0.96, skill: 'crafting', minSkill: 0.85, minPop: 40, recipes: ['aluminium'], fx: { craft: 0.1, speed: 0.05 }, desc: 'Könnyű fém az agyagból — árammal.' });
  T('synthetic_fibers', { name: 'Műszálak', era: 'modern', prereq: ['plastics', 'weaving'], items: { plastic: 4 }, nearby: 'factory', difficulty: 0.96, skill: 'crafting', minSkill: 0.82, minPop: 40, fx: { warmth: 2, craft: 0.05 }, desc: 'Olajból szőtt kelme: olcsó, meleg, nem rohad.' });
  T('assembly_line', { name: 'Futószalag', era: 'modern', prereq: ['factory_system', 'automobile'], items: { machine_part: 8 }, nearby: 'factory', difficulty: 0.965, skill: 'crafting', minSkill: 0.85, minPop: 45, fx: { craft: 0.4, build: 0.1 }, wow: 'Az első futószalag', desc: 'Nem a munkás megy a munkához: a munka megy a munkáshoz.' });
  T('recycling', { name: 'Újrahasznosítás', era: 'digital', prereq: ['plastics', 'sanitation'], items: { plastic: 4 }, difficulty: 0.97, skill: 'crafting', minSkill: 0.8, minPop: 50, fx: { craft: 0.1, preserve: 0.1, health: 0.05 }, desc: 'A szemét nyersanyag lesz.' });
  T('additive_manufacturing', { name: 'Additív gyártás', era: 'digital', prereq: ['computer', 'plastics', 'machine_tools'], items: { plastic: 6, chip: 4 }, nearby: 'factory', difficulty: 0.975, skill: 'crafting', minSkill: 0.88, minPop: 60, fx: { craft: 0.25, build: 0.2 }, desc: 'A gép rétegről rétegre nyomtatja a tárgyat.' });
  T('robotics', { name: 'Robotika', era: 'digital', prereq: ['computer', 'machine_tools', 'assembly_line'], items: { chip: 12, machine_part: 8 }, nearby: 'factory', difficulty: 0.978, skill: 'crafting', minSkill: 0.9, minPop: 75, buildings: ['robot_factory'], recipes: ['robot'], fx: { craft: 0.6, build: 0.3, farm: 0.2 }, wow: 'Az első robot', desc: 'Egy gép, amely dolgozik, nem fárad, és nem kér semmit.' });
  T('automation', { name: 'Automatizálás', era: 'digital', prereq: ['software', 'robotics'], items: { chip: 8 }, nearby: 'robot_factory', difficulty: 0.978, skill: 'crafting', minSkill: 0.9, minPop: 75, fx: { craft: 0.3, farm: 0.2, build: 0.2 }, desc: 'A gyár magától jár: az ember csak nézi.' });
  T('nanotech', { name: 'Nanotechnológia', era: 'ai', prereq: ['robotics', 'chemistry', 'genetics'], items: { chip: 20, medicine: 4 }, nearby: 'lab', difficulty: 0.985, skill: 'crafting', minSkill: 0.93, minPop: 95, fx: { craft: 0.3, health: 0.2, longevity: 4 }, wow: 'Gépek, amelyeket nem látni', desc: 'Az anyag atomonként rendezve.' });
  // — mezőgazdaság, élelem
  T('beekeeping', { name: 'Méhészet', era: 'neolithic', prereq: ['horticulture'], items: { wood: 4 }, difficulty: 0.84, skill: 'foraging', minSkill: 0.45, minPop: 2, buildings: ['apiary'], recipes: ['honey'], fx: { food: 0.05 }, wow: 'Az első méz', desc: 'A méhek dolgoznak, az ember gyűjt.' });
  T('salting', { name: 'Sózás', era: 'neolithic', prereq: ['food_drying'], items: { salt: 2 }, difficulty: 0.83, skill: 'crafting', minSkill: 0.35, fx: { preserve: 0.2 }, desc: 'Sóban a hús nem romlik meg.' });
  T('viticulture', { name: 'Szőlőművelés', era: 'bronze', prereq: ['horticulture', 'brewing'], items: { fruit: 6 }, difficulty: 0.88, skill: 'farming', minSkill: 0.55, minPop: 6, recipes: ['wine'], fx: { happiness: 0.1 }, wow: 'Az első bor', desc: 'A megerjedt gyümölcs öröm és ünnep.' });
  T('terrace_farming', { name: 'Teraszos művelés', era: 'bronze', prereq: ['plowing', 'stone_masonry'], items: { stone: 8 }, difficulty: 0.88, skill: 'farming', minSkill: 0.55, minPop: 8, fx: { farm: 0.15 }, desc: 'A domboldal lépcsőin is terem a föld.' });
  T('aquaculture', { name: 'Haltenyésztés', era: 'classical', prereq: ['fishing', 'irrigation'], items: { wood: 8 }, difficulty: 0.9, skill: 'farming', minSkill: 0.6, minPop: 12, buildings: ['fish_pond'], fx: { food: 0.1 }, desc: 'A hal nem a tengerből jön: tóban nevelik.' });
  T('selective_breeding', { name: 'Nemesítés', era: 'medieval', prereq: ['animal_husbandry', 'crop_rotation'], items: { grain: 8 }, difficulty: 0.92, skill: 'farming', minSkill: 0.7, minPop: 15, fx: { farm: 0.2, food: 0.1 }, desc: 'A legjobb magból vetnek, a legjobb állatot hagyják szaporodni.' });
  T('greenhouses', { name: 'Üvegház', era: 'renaissance', prereq: ['glassmaking', 'horticulture'], items: { glass: 8, wood: 8 }, difficulty: 0.94, skill: 'building', minSkill: 0.75, minPop: 20, buildings: ['greenhouse'], fx: { food: 0.05 }, wow: 'Az első üvegház', desc: 'Üveg alatt télen is nyár van.' });
  T('fertilizers', { name: 'Műtrágya', era: 'industrial', prereq: ['chemistry', 'crop_rotation'], items: { coal: 2, salt: 2 }, nearby: 'lab', difficulty: 0.945, skill: 'farming', minSkill: 0.78, minPop: 28, fx: { farm: 0.35, fertility: 0.05 }, wow: 'Kenyér a levegőből', desc: 'A föld tápláléka gyárból jön: a termés megkétszereződik.' });
  T('mechanized_farming', { name: 'Gépesített mezőgazdaság', era: 'modern', prereq: ['internal_combustion', 'plowing'], items: { steel: 6, machine_part: 4 }, nearby: 'factory', difficulty: 0.96, skill: 'farming', minSkill: 0.82, minPop: 40, fx: { farm: 0.4, food: 0.15 }, desc: 'Egy ember egy géppel száz ember munkáját végzi a földeken.' });
  T('refrigeration', { name: 'Hűtés', era: 'modern', prereq: ['electrification', 'chemistry'], items: { electric_part: 4, copper: 2 }, nearby: 'factory', difficulty: 0.96, skill: 'crafting', minSkill: 0.82, minPop: 40, fx: { preserve: 0.5, health: 0.1 }, wow: 'Az első hűtőszekrény', desc: 'A hideg megáll a dobozban: a nyár is eltartja az ételt.' });
  T('gmo', { name: 'Génmódosított növények', era: 'ai', prereq: ['genetics', 'fertilizers'], items: { medicine: 2, chip: 2 }, nearby: 'lab', difficulty: 0.98, skill: 'medicine', minSkill: 0.9, minPop: 80, fx: { farm: 0.4, food: 0.1 }, desc: 'A növény kódját átírják: több terem, kevesebb vész el.' });
  T('vertical_farming', { name: 'Vertikális farm', era: 'ai', prereq: ['gmo', 'solar_power', 'robotics'], items: { chip: 10, glass: 10 }, nearby: 'robot_factory', difficulty: 0.985, skill: 'building', minSkill: 0.92, minPop: 95, buildings: ['vertical_farm'], fx: { food: 0.3 }, wow: 'Mező a toronyban', desc: 'Emeletes földek fény alatt: a város eteti önmagát.' });
  // — orvoslás, egészség
  T('surgery', { name: 'Sebészet', era: 'classical', prereq: ['medicine', 'bronze_tools'], items: { bronze: 1, cloth: 2 }, difficulty: 0.9, skill: 'medicine', minSkill: 0.65, minPop: 12, fx: { health: 0.15 }, wow: 'Az első műtét', desc: 'Kés a gyógyítás szolgálatában.' });
  T('quarantine', { name: 'Vesztegzár', era: 'medieval', prereq: ['medicine', 'law_code'], items: { paper: 1 }, difficulty: 0.92, skill: 'social', minSkill: 0.65, minPop: 18, fx: { health: 0.2 }, desc: 'A beteget elkülönítik: a kór nem jut tovább.' });
  T('germ_theory', { name: 'Kórokozó-elmélet', era: 'industrial', prereq: ['optics', 'scientific_method', 'medicine'], items: { glass: 4 }, nearby: 'lab', difficulty: 0.945, skill: 'medicine', minSkill: 0.78, minPop: 25, fx: { health: 0.3 }, wow: 'A láthatatlan ellenség felfedezése', desc: 'A betegséget apró élőlények hozzák — és a tisztaság megállítja őket.' });
  T('anesthesia', { name: 'Érzéstelenítés', era: 'industrial', prereq: ['chemistry', 'surgery'], items: { medicine: 2 }, nearby: 'lab', difficulty: 0.945, skill: 'medicine', minSkill: 0.78, minPop: 25, fx: { health: 0.15, longevity: 2 }, desc: 'A műtét többé nem kín.' });
  T('antibiotics', { name: 'Antibiotikum', era: 'modern', prereq: ['germ_theory', 'pharmacology'], items: { medicine: 4, glass: 2 }, nearby: 'lab', difficulty: 0.96, skill: 'medicine', minSkill: 0.85, minPop: 40, fx: { health: 0.4, longevity: 5 }, wow: 'Az első antibiotikum', desc: 'Penészből nyert csoda: a fertőzés meggyógyítható.' });
  T('psychology', { name: 'Lélektan', era: 'modern', prereq: ['anatomy', 'universities', 'printing'], items: { book: 2 }, nearby: 'university', difficulty: 0.955, skill: 'social', minSkill: 0.8, minPop: 35, fx: { happiness: 0.2, teach: 0.1 }, desc: 'A lélek is vizsgálható, gyógyítható.' });
  T('public_health', { name: 'Népegészségügy', era: 'modern', prereq: ['modern_medicine', 'law_code'], items: { medicine: 4 }, nearby: 'hospital', difficulty: 0.96, skill: 'medicine', minSkill: 0.82, minPop: 45, fx: { health: 0.2, longevity: 4, fertility: 0.05 }, desc: 'Oltás mindenkinek, orvos minden faluban.' });
  T('family_planning', { name: 'Családtervezés', era: 'modern', prereq: ['public_health', 'psychology'], items: { medicine: 2 }, difficulty: 0.96, skill: 'social', minSkill: 0.8, minPop: 45, fx: { fertility: -0.2, happiness: 0.05, teach: 0.05 }, desc: 'Kevesebb gyerek születik, és mind felnő.' });
  T('medical_imaging', { name: 'Képalkotó diagnosztika', era: 'digital', prereq: ['electricity', 'computer', 'anatomy'], items: { electric_part: 6, chip: 4 }, nearby: 'hospital', difficulty: 0.975, skill: 'medicine', minSkill: 0.88, minPop: 60, fx: { health: 0.2, longevity: 3 }, desc: 'Belelátni a testbe, mielőtt felnyitnák.' });
  T('organ_transplant', { name: 'Szervátültetés', era: 'digital', prereq: ['surgery', 'antibiotics', 'modern_medicine'], items: { medicine: 8 }, nearby: 'hospital', difficulty: 0.975, skill: 'medicine', minSkill: 0.9, minPop: 65, fx: { longevity: 4 }, wow: 'Egy szív, amely tovább dobog', desc: 'Ami elromlott, kicserélhető.' });
  T('neuroscience', { name: 'Idegtudomány', era: 'digital', prereq: ['psychology', 'medical_imaging'], items: { chip: 4, medicine: 4 }, nearby: 'lab', difficulty: 0.978, skill: 'medicine', minSkill: 0.9, minPop: 70, fx: { teach: 0.2, health: 0.1, happiness: 0.1 }, desc: 'Az agy térképe: hol lakik a gondolat.' });
  T('gene_therapy', { name: 'Génterápia', era: 'ai', prereq: ['genetics', 'machine_learning'], items: { medicine: 8, chip: 8 }, nearby: 'hospital', difficulty: 0.985, skill: 'medicine', minSkill: 0.93, minPop: 95, fx: { health: 0.3, longevity: 8 }, wow: 'A betegség átírása', desc: 'A hibát nem kezelik: kijavítják a kódban.' });
  T('life_extension', { name: 'Élethosszabbítás', era: 'ai', prereq: ['gene_therapy', 'nanotech'], items: { medicine: 12, chip: 12 }, nearby: 'hospital', difficulty: 0.988, skill: 'medicine', minSkill: 0.95, minPop: 105, fx: { longevity: 15 }, wow: 'A halál elhalasztása', desc: 'Az öregedés is csak betegség — és gyógyítják.' });
  // — kommunikáció, információ
  T('postal_service', { name: 'Postaszolgálat', era: 'classical', prereq: ['road_building', 'alphabet'], items: { fiber: 2, wood: 2 }, difficulty: 0.9, skill: 'social', minSkill: 0.6, minPop: 15, fx: { teach: 0.1, trade: 0.1, diplomacy: 0.1 }, desc: 'Futárok láncán az üzenet gyorsabb a hírnél.' });
  T('newspaper', { name: 'Újság', era: 'renaissance', prereq: ['printing'], items: { paper: 6 }, nearby: 'printing_house', difficulty: 0.94, skill: 'social', minSkill: 0.75, minPop: 24, fx: { teach: 0.15, diplomacy: 0.05 }, wow: 'Az első újság', desc: 'Mindenki ugyanazt tudja meg ugyanazon a reggelen.' });
  T('photography', { name: 'Fényképezés', era: 'industrial', prereq: ['optics', 'chemistry'], items: { glass: 2, salt: 1 }, nearby: 'lab', difficulty: 0.945, skill: 'crafting', minSkill: 0.75, minPop: 25, fx: { happiness: 0.05, teach: 0.05 }, wow: 'Az első fénykép', desc: 'A fény maga rajzol: az arc megmarad.' });
  T('telephone', { name: 'Telefon', era: 'industrial', prereq: ['telegraph', 'electricity'], items: { copper: 4, electric_part: 2 }, nearby: 'workshop', difficulty: 0.95, skill: 'crafting', minSkill: 0.8, minPop: 32, fx: { teach: 0.1, trade: 0.15, diplomacy: 0.1 }, wow: 'Az első telefonhívás', desc: 'A hang átmegy a dróton.' });
  T('cinema', { name: 'Mozgókép', era: 'modern', prereq: ['photography', 'electrification'], items: { electric_part: 2, glass: 2 }, difficulty: 0.96, skill: 'crafting', minSkill: 0.82, minPop: 40, buildings: ['cinema'], fx: { happiness: 0.15 }, wow: 'Az első film', desc: 'A képek megmozdulnak a vásznon.' });
  T('television', { name: 'Televízió', era: 'modern', prereq: ['radio', 'cinema'], items: { electric_part: 6 }, nearby: 'factory', difficulty: 0.965, skill: 'crafting', minSkill: 0.85, minPop: 50, buildings: ['radio_tower'], fx: { teach: 0.2, happiness: 0.1 }, wow: 'Az első adás', desc: 'Kép és hang minden házban egyszerre.' });
  T('cryptography', { name: 'Titkosítás', era: 'digital', prereq: ['mathematics', 'computer'], items: { chip: 2 }, nearby: 'computer_center', difficulty: 0.97, skill: 'crafting', minSkill: 0.85, minPop: 55, fx: { safety: 0.1, trade: 0.1 }, desc: 'Amit csak a címzett olvashat.' });
  T('mobile_phone', { name: 'Mobiltelefon', era: 'digital', prereq: ['telephone', 'integrated_circuit', 'radio'], items: { chip: 4, plastic: 2 }, nearby: 'factory', difficulty: 0.975, skill: 'crafting', minSkill: 0.88, minPop: 65, fx: { teach: 0.15, trade: 0.15, happiness: 0.05 }, wow: 'Telefon a zsebben', desc: 'Mindenki mindenkivel, bárhol.' });
  T('satellites', { name: 'Műholdak', era: 'digital', prereq: ['spaceflight', 'radio'], items: { chip: 10, steel: 10 }, nearby: 'computer_center', difficulty: 0.98, skill: 'crafting', minSkill: 0.92, minPop: 90, fx: { discovery: 0.2, teach: 0.1 }, wow: 'Az első műhold', desc: 'Egy szem az égben: az egész világ egyetlen térképen.' });
  T('social_networks', { name: 'Közösségi hálók', era: 'ai', prereq: ['internet', 'mobile_phone'], items: { chip: 6 }, nearby: 'data_center', difficulty: 0.98, skill: 'social', minSkill: 0.85, minPop: 80, fx: { teach: 0.1, happiness: -0.05, diplomacy: -0.05 }, desc: 'Mindenki beszél mindenkihez — és hangosabb lesz a világ.' });
  T('quantum_computing', { name: 'Kvantumszámítás', era: 'ai', prereq: ['integrated_circuit', 'cryptography', 'quantum_mechanics'], items: { chip: 40 }, nearby: 'data_center', difficulty: 0.987, skill: 'crafting', minSkill: 0.95, minPop: 105, fx: { discovery: 0.4 }, wow: 'Az első kvantumszámítógép', desc: 'Egyszerre minden út: a megoldás egy pillanat.' });
  // — tudományok
  T('geometry', { name: 'Mértan', era: 'classical', prereq: ['mathematics'], items: { clay: 2 }, difficulty: 0.9, skill: 'crafting', minSkill: 0.6, minPop: 12, fx: { build: 0.15, discovery: 0.05 }, desc: 'A világ vonalakból és szögekből leírható.' });
  T('philosophy', { name: 'Filozófia', era: 'classical', prereq: ['schooling', 'alphabet'], items: {}, nearby: 'school', difficulty: 0.9, skill: 'social', minSkill: 0.65, minPop: 15, fx: { teach: 0.15, happiness: 0.05, discovery: 0.05 }, wow: 'Az első filozófus', desc: 'Kérdezni kezdenek, hogy miért.' });
  T('theology', { name: 'Teológia', era: 'classical', prereq: ['organized_religion', 'alphabet'], items: { clay: 4 }, nearby: 'temple', difficulty: 0.9, skill: 'social', minSkill: 0.65, minPop: 15, fx: { happiness: 0.1, teach: 0.05 }, desc: 'A hang az égből tanná rendeződik.' });
  T('physics', { name: 'Fizika', era: 'renaissance', prereq: ['scientific_method', 'mechanics', 'mathematics'], items: { glass: 2, iron: 2 }, nearby: 'university', difficulty: 0.945, skill: 'crafting', minSkill: 0.8, minPop: 24, fx: { discovery: 0.2 }, desc: 'Az esés és a bolygók egyazon törvény alatt.' });
  T('biology', { name: 'Biológia', era: 'renaissance', prereq: ['anatomy', 'optics'], items: { glass: 2 }, nearby: 'university', difficulty: 0.94, skill: 'medicine', minSkill: 0.78, minPop: 22, fx: { health: 0.1, farm: 0.1, discovery: 0.1 }, desc: 'Az élet rendszerezve: fajok, sejtek, rokonságok.' });
  T('geology', { name: 'Földtan', era: 'renaissance', prereq: ['mining', 'scientific_method'], items: { stone: 6, ore_iron: 2 }, difficulty: 0.94, skill: 'crafting', minSkill: 0.78, minPop: 22, fx: { mine: 0.3, discovery: 0.05 }, desc: 'A rétegek elmesélik, hol van az érc.' });
  T('economics', { name: 'Közgazdaságtan', era: 'renaissance', prereq: ['banking', 'printing'], items: { book: 1 }, nearby: 'university', difficulty: 0.945, skill: 'social', minSkill: 0.8, minPop: 26, fx: { trade: 0.25 }, desc: 'A piac láthatatlan keze leírva.' });
  T('statistics', { name: 'Statisztika', era: 'industrial', prereq: ['mathematics', 'printing'], items: { paper: 4 }, nearby: 'university', difficulty: 0.945, skill: 'social', minSkill: 0.78, minPop: 28, fx: { discovery: 0.1, health: 0.05, teach: 0.05 }, desc: 'A sokaság szabályai: a véletlen is mérhető.' });
  T('evolution', { name: 'Evolúcióelmélet', era: 'industrial', prereq: ['biology', 'geology'], items: { book: 2 }, nearby: 'university', difficulty: 0.955, skill: 'medicine', minSkill: 0.8, minPop: 30, fx: { discovery: 0.15, farm: 0.05 }, wow: 'Az élet fája', desc: 'Az élők nem készen születtek: változtak, és változnak.' });
  T('relativity', { name: 'Relativitás', era: 'modern', prereq: ['physics', 'mathematics', 'astronomy'], items: { paper: 4 }, nearby: 'university', difficulty: 0.965, skill: 'crafting', minSkill: 0.88, minPop: 45, fx: { discovery: 0.2 }, desc: 'Az idő és a tér egymásba hajlik.' });
  T('quantum_mechanics', { name: 'Kvantummechanika', era: 'modern', prereq: ['relativity', 'chemistry'], items: { glass: 4, electric_part: 2 }, nearby: 'lab', difficulty: 0.97, skill: 'crafting', minSkill: 0.9, minPop: 50, fx: { discovery: 0.25 }, desc: 'A legkisebb dolgok nem úgy viselkednek, ahogy a nagyok.' });
  T('climate_science', { name: 'Klímatudomány', era: 'digital', prereq: ['statistics', 'chemistry', 'computer'], items: { chip: 4 }, nearby: 'computer_center', difficulty: 0.975, skill: 'crafting', minSkill: 0.88, minPop: 65, fx: { farm: 0.1, preserve: 0.1, safety: 0.05 }, desc: 'Az égbolt mintái évtizedekre előre.' });
  T('unified_theory', { name: 'Egyesített elmélet', era: 'ai', prereq: ['quantum_mechanics', 'relativity', 'quantum_computing'], items: { chip: 20 }, nearby: 'data_center', difficulty: 0.988, skill: 'crafting', minSkill: 0.95, minPop: 105, fx: { discovery: 0.5 }, wow: 'A mindenség képlete', desc: 'Egy egyenlet, amely mindent leír — kivéve, hogy miért.' });
  // — társadalom, politika, gazdaság
  T('bureaucracy', { name: 'Hivatalnokrend', era: 'classical', prereq: ['law_code', 'alphabet', 'counting'], items: { clay: 4 }, nearby: 'archive', difficulty: 0.9, skill: 'social', minSkill: 0.65, minPop: 18, fx: { trade: 0.1, build: 0.1, diplomacy: 0.05 }, desc: 'Írnokok, adók, nyilvántartás: az állam emlékezete.' });
  T('taxation', { name: 'Adózás', era: 'classical', prereq: ['counting', 'bureaucracy'], items: { coin: 4 }, difficulty: 0.9, skill: 'social', minSkill: 0.65, minPop: 15, fx: { build: 0.2 }, desc: 'Mindenki ad egy keveset, hogy legyen közös.' });
  T('courts', { name: 'Bíróság', era: 'classical', prereq: ['law_code', 'bureaucracy'], items: {}, nearby: 'archive', difficulty: 0.9, skill: 'social', minSkill: 0.65, minPop: 15, buildings: ['courthouse'], fx: { safety: 0.15 }, wow: 'Az első ítélet', desc: 'A vitát nem az erősebb dönti el.' });
  T('diplomacy', { name: 'Diplomácia', era: 'classical', prereq: ['law_code', 'writing'], items: { clay: 2 }, difficulty: 0.9, skill: 'social', minSkill: 0.65, minPop: 15, fx: { diplomacy: 0.3 }, wow: 'Az első békeszerződés', desc: 'Követek járnak a városok között, nem hadak.' });
  T('democracy', { name: 'Népuralom', era: 'classical', prereq: ['philosophy', 'law_code'], items: {}, nearby: 'school', difficulty: 0.91, skill: 'social', minSkill: 0.7, minPop: 18, buildings: ['assembly_hall'], fx: { happiness: 0.1, diplomacy: 0.1 }, wow: 'Az első választás', desc: 'A vezetőt választják, és le is válthatják.' });
  T('guilds', { name: 'Céhek', era: 'medieval', prereq: ['trade', 'carpentry', 'law_code'], items: {}, nearby: 'workshop', difficulty: 0.92, skill: 'social', minSkill: 0.7, minPop: 18, fx: { craft: 0.15, teach: 0.1 }, desc: 'A mesterek közössége: tudás, mérce, védelem.' });
  T('constitution', { name: 'Alkotmány', era: 'renaissance', prereq: ['democracy', 'printing'], items: { paper: 4 }, nearby: 'assembly_hall', difficulty: 0.945, skill: 'social', minSkill: 0.8, minPop: 26, fx: { safety: 0.1, happiness: 0.1, diplomacy: 0.1 }, desc: 'Leírt szabály, amely a hatalom fölött áll.' });
  T('insurance', { name: 'Biztosítás', era: 'renaissance', prereq: ['banking', 'economics'], items: { coin: 6 }, difficulty: 0.945, skill: 'social', minSkill: 0.8, minPop: 26, fx: { safety: 0.1, trade: 0.1, preserve: 0.1 }, desc: 'A közösen viselt kockázat kisebb.' });
  T('police', { name: 'Rendfenntartás', era: 'industrial', prereq: ['law_code', 'bureaucracy'], items: { iron: 2 }, nearby: 'courthouse', difficulty: 0.94, skill: 'social', minSkill: 0.75, minPop: 28, buildings: ['police_station'], fx: { safety: 0.3 }, desc: 'Őrség a városnak, nem a fejedelemnek.' });
  T('stock_market', { name: 'Tőzsde', era: 'industrial', prereq: ['banking', 'economics', 'newspaper'], items: { coin: 10, paper: 4 }, difficulty: 0.95, skill: 'social', minSkill: 0.82, minPop: 32, buildings: ['bank'], fx: { trade: 0.3 }, wow: 'Az első tőzsde', desc: 'A vállalat darabokra osztva bárkié lehet.' });
  T('universal_education', { name: 'Általános tankötelezettség', era: 'industrial', prereq: ['schooling', 'printing', 'law_code'], items: { book: 4 }, nearby: 'school', difficulty: 0.95, skill: 'social', minSkill: 0.8, minPop: 32, fx: { teach: 0.4 }, wow: 'Mindenki iskolába jár', desc: 'Nem a szülő dönti el, ki tanul: mindenki.' });
  T('labor_unions', { name: 'Szakszervezet', era: 'industrial', prereq: ['factory_system', 'printing'], items: { paper: 2 }, nearby: 'factory', difficulty: 0.945, skill: 'social', minSkill: 0.75, minPop: 30, fx: { happiness: 0.15, safety: 0.05 }, desc: 'A munkások együtt erősebbek a gyárnál.' });
  T('welfare_state', { name: 'Jóléti állam', era: 'modern', prereq: ['public_health', 'democracy', 'stock_market'], items: { coin: 10 }, nearby: 'assembly_hall', difficulty: 0.96, skill: 'social', minSkill: 0.85, minPop: 50, fx: { happiness: 0.2, health: 0.1, fertility: 0.05 }, wow: 'Senki sem marad éhen', desc: 'A közösség tartja el azt, aki elesett.' });
  T('international_law', { name: 'Nemzetközi jog', era: 'modern', prereq: ['diplomacy', 'constitution'], items: { paper: 6 }, nearby: 'assembly_hall', difficulty: 0.96, skill: 'social', minSkill: 0.85, minPop: 45, fx: { diplomacy: 0.3 }, desc: 'Szabály a városok fölött is.' });
  // — kultúra, művészet, sport
  T('music', { name: 'Zene', era: 'neolithic', prereq: ['ritual'], items: { wood: 2, fiber: 2 }, difficulty: 0.8, skill: 'social', minSkill: 0.35, fx: { happiness: 0.15 }, wow: 'Az első dal', desc: 'Ritmus és dallam: együtt könnyebb az este.' });
  T('painting', { name: 'Festészet', era: 'neolithic', prereq: ['ritual', 'clay_awareness'], items: { clay: 2, berries: 2 }, difficulty: 0.82, skill: 'crafting', minSkill: 0.4, fx: { happiness: 0.1, teach: 0.05 }, wow: 'Az első barlangrajz', desc: 'A falra festett vad emlékezik a vadászra.' });
  T('sports', { name: 'Versenyjátékok', era: 'neolithic', prereq: ['ritual', 'spear_making'], items: {}, difficulty: 0.82, skill: 'social', minSkill: 0.4, minPop: 6, fx: { happiness: 0.1, health: 0.05 }, wow: 'Az első verseny', desc: 'Ki fut gyorsabban, ki dob messzebb: a játék is összetart.' });
  T('sculpture', { name: 'Szobrászat', era: 'bronze', prereq: ['stone_masonry', 'painting'], items: { stone: 6 }, difficulty: 0.88, skill: 'crafting', minSkill: 0.55, minPop: 8, fx: { happiness: 0.1 }, desc: 'A kőből ember lép elő.' });
  T('theatre', { name: 'Színház', era: 'classical', prereq: ['music', 'alphabet', 'painting'], items: { cloth: 4 }, difficulty: 0.9, skill: 'social', minSkill: 0.65, minPop: 15, buildings: ['theatre'], fx: { happiness: 0.2 }, wow: 'Az első színdarab', desc: 'Mások élete a színpadon: nevetnek és sírnak rajta.' });
  T('literature', { name: 'Irodalom', era: 'classical', prereq: ['alphabet', 'theatre'], items: { clay: 4 }, nearby: 'archive', difficulty: 0.91, skill: 'social', minSkill: 0.65, minPop: 15, fx: { teach: 0.15, happiness: 0.1 }, desc: 'Történetek, amelyek túlélik a mesélőt.' });
  T('stadium', { name: 'Stadion', era: 'classical', prereq: ['sports', 'architecture'], items: { stone: 30 }, difficulty: 0.91, skill: 'building', minSkill: 0.7, minPop: 20, buildings: ['stadium'], fx: { happiness: 0.15 }, desc: 'Kőlépcsők a versenypálya körül: a város együtt kiált.' });
  T('fashion', { name: 'Divat', era: 'renaissance', prereq: ['tailoring', 'dyeing', 'trade'], items: { cloth: 6 }, nearby: 'workshop', difficulty: 0.93, skill: 'crafting', minSkill: 0.7, minPop: 20, recipes: ['fine_clothes'], fx: { happiness: 0.1, trade: 0.1 }, desc: 'A ruha nemcsak melegít: beszél.' });
  T('museums', { name: 'Múzeum', era: 'renaissance', prereq: ['printing', 'sculpture'], items: { paper: 4, stone: 10 }, difficulty: 0.94, skill: 'social', minSkill: 0.75, minPop: 26, buildings: ['museum'], fx: { teach: 0.1, happiness: 0.1 }, desc: 'A múlt tárgyai egy házban, mindenkinek.' });
  T('recorded_music', { name: 'Hangfelvétel', era: 'modern', prereq: ['electricity', 'music'], items: { electric_part: 2 }, nearby: 'workshop', difficulty: 0.955, skill: 'crafting', minSkill: 0.8, minPop: 35, fx: { happiness: 0.1 }, desc: 'A dal megmarad, ha az énekes elhallgat.' });
  T('tourism', { name: 'Turizmus', era: 'modern', prereq: ['rail_network', 'photography'], items: { coin: 6 }, difficulty: 0.96, skill: 'social', minSkill: 0.82, minPop: 45, fx: { trade: 0.15, happiness: 0.1, diplomacy: 0.1 }, desc: 'Utazni azért, hogy lássanak.' });
  T('olympics', { name: 'Nagy játékok', era: 'modern', prereq: ['stadium', 'diplomacy', 'rail_network'], items: {}, nearby: 'stadium', difficulty: 0.96, skill: 'social', minSkill: 0.82, minPop: 50, fx: { diplomacy: 0.2, happiness: 0.15 }, wow: 'Az első nagy játékok', desc: 'A városok versenyeznek, nem harcolnak.' });
  T('video_games', { name: 'Videojátékok', era: 'digital', prereq: ['software', 'television'], items: { chip: 4 }, nearby: 'computer_center', difficulty: 0.975, skill: 'crafting', minSkill: 0.85, minPop: 60, fx: { happiness: 0.15, teach: 0.05 }, desc: 'Világok a képernyőn, amelyekben ők a teremtők.' });
  // — hadviselés
  T('cavalry', { name: 'Lovasság', era: 'classical', prereq: ['horse_riding', 'iron_working'], items: { iron: 4, hide: 4 }, difficulty: 0.9, skill: 'hunting', minSkill: 0.65, minPop: 15, fx: { war: 0.3, speed: 0.05 }, desc: 'A ló és a vas együtt: a csata gyorsabb lett.' });
  T('siege_engines', { name: 'Ostromgépek', era: 'classical', prereq: ['mechanics', 'fortification'], items: { wood: 12, iron: 4 }, nearby: 'workshop', difficulty: 0.91, skill: 'crafting', minSkill: 0.7, minPop: 18, fx: { war: 0.3 }, desc: 'A fal nem véd örökké.' });
  T('standing_army', { name: 'Állandó hadsereg', era: 'classical', prereq: ['taxation', 'law_code'], items: { coin: 6 }, difficulty: 0.91, skill: 'social', minSkill: 0.7, minPop: 20, buildings: ['barracks'], fx: { war: 0.3, safety: 0.2 }, desc: 'Katonák, akik békében is katonák.' });
  T('artillery', { name: 'Tüzérség', era: 'renaissance', prereq: ['gunpowder', 'firearms', 'mechanics'], items: { steel: 4, coal: 2 }, nearby: 'forge', difficulty: 0.95, skill: 'crafting', minSkill: 0.82, minPop: 28, fx: { war: 0.4 }, desc: 'Az ágyú előtt a vár is csak kő.' });
  T('conscription', { name: 'Sorozás', era: 'industrial', prereq: ['standing_army', 'bureaucracy'], items: {}, nearby: 'barracks', difficulty: 0.95, skill: 'social', minSkill: 0.8, minPop: 32, fx: { war: 0.3, happiness: -0.05 }, desc: 'Minden fiú katona, ha az állam hívja.' });
  T('armored_vehicles', { name: 'Páncélosok', era: 'modern', prereq: ['automobile', 'artillery', 'steel_making'], items: { steel: 12, machine_part: 6 }, nearby: 'factory', difficulty: 0.965, skill: 'crafting', minSkill: 0.88, minPop: 50, fx: { war: 0.5 }, desc: 'Acélba zárt tűz, lánctalpon.' });
  T('military_aviation', { name: 'Harci repülés', era: 'modern', prereq: ['aviation', 'artillery'], items: { steel: 8, fuel: 4 }, nearby: 'factory', difficulty: 0.965, skill: 'crafting', minSkill: 0.88, minPop: 50, fx: { war: 0.5 }, desc: 'A háború fölülről jön.' });
  T('jet_engine', { name: 'Sugárhajtómű', era: 'modern', prereq: ['aviation', 'metallurgy'], items: { steel: 10, machine_part: 6, fuel: 4 }, nearby: 'factory', difficulty: 0.97, skill: 'crafting', minSkill: 0.88, minPop: 55, fx: { speed: 0.2, war: 0.2 }, desc: 'Gyorsabb a hangnál.' });
  T('nuclear_weapons', { name: 'Atomfegyver', era: 'modern', prereq: ['nuclear_fission', 'rocketry'], items: { steel: 10, electric_part: 10 }, nearby: 'lab', difficulty: 0.978, skill: 'crafting', minSkill: 0.92, minPop: 70, fx: { war: 1.5, diplomacy: 0.3 }, wow: 'A bomba', desc: 'Egyetlen fegyver, amely egy várost töröl el — és éppen ezért senki sem meri használni. Majdnem.' });
  T('cyberwarfare', { name: 'Kiberhadviselés', era: 'ai', prereq: ['internet', 'cryptography'], items: { chip: 8 }, nearby: 'data_center', difficulty: 0.98, skill: 'crafting', minSkill: 0.9, minPop: 80, fx: { war: 0.3, safety: -0.05 }, desc: 'A háború a vezetékekben folyik.' });
  T('drones', { name: 'Drónok', era: 'ai', prereq: ['robotics', 'military_aviation', 'machine_learning'], items: { chip: 10, machine_part: 4 }, nearby: 'robot_factory', difficulty: 0.982, skill: 'crafting', minSkill: 0.92, minPop: 90, fx: { war: 0.4, hunt: 0.2 }, desc: 'Szárnyak pilóta nélkül.' });
  // — űr
  T('observatory', { name: 'Csillagvizsgáló', era: 'renaissance', prereq: ['optics', 'astronomy'], items: { glass: 6, brick: 10 }, difficulty: 0.94, skill: 'building', minSkill: 0.75, minPop: 22, buildings: ['observatory'], fx: { discovery: 0.15 }, wow: 'Az első csillagvizsgáló', desc: 'Egy ház, amely csak az eget nézi.' });
  T('space_station', { name: 'Űrállomás', era: 'digital', prereq: ['spaceflight', 'satellites'], items: { steel: 30, chip: 20, electric_part: 20 }, nearby: 'computer_center', difficulty: 0.983, skill: 'crafting', minSkill: 0.93, minPop: 100, buildings: ['spaceport'], fx: { discovery: 0.2 }, wow: 'Az első űrállomás', desc: 'Emberek laknak az ég fölött.' });
  T('moon_landing', { name: 'Holdra szállás', era: 'digital', prereq: ['spaceflight', 'computer', 'rocketry'], items: { fuel: 20, steel: 20, chip: 10 }, nearby: 'spaceport', difficulty: 0.984, skill: 'crafting', minSkill: 0.94, minPop: 100, fx: { discovery: 0.2, happiness: 0.2 }, wow: 'Az első lábnyom a Holdon', desc: 'Az égi fény, amelyre eddig csak imádkoztak, most föld a talpuk alatt.' });
  T('space_telescope', { name: 'Űrtávcső', era: 'digital', prereq: ['satellites', 'optics'], items: { chip: 12, glass: 10 }, nearby: 'spaceport', difficulty: 0.982, skill: 'crafting', minSkill: 0.92, minPop: 95, fx: { discovery: 0.3 }, desc: 'A világegyetem széléig lát.' });
  T('mars_landing', { name: 'Marsra szállás', era: 'ai', prereq: ['moon_landing', 'robotics'], items: { fuel: 40, steel: 40, chip: 30 }, nearby: 'spaceport', difficulty: 0.987, skill: 'crafting', minSkill: 0.95, minPop: 105, fx: { discovery: 0.2, happiness: 0.15 }, wow: 'Az első lábnyom a Marson', desc: 'Egy másik világ pora.' });
  T('asteroid_mining', { name: 'Aszteroidabányászat', era: 'ai', prereq: ['mars_landing', 'robotics'], items: { chip: 30, steel: 30 }, nearby: 'spaceport', difficulty: 0.988, skill: 'crafting', minSkill: 0.95, minPop: 105, fx: { mine: 1, craft: 0.3 }, wow: 'Érc az égből', desc: 'A hegyek elfogynak; az ég nem.' });
  T('space_colony', { name: 'Űrkolónia', era: 'ai', prereq: ['mars_landing', 'vertical_farming', 'fusion'], items: { chip: 60, concrete: 40, steel: 40 }, nearby: 'spaceport', difficulty: 0.99, skill: 'building', minSkill: 0.96, minPop: 110, fx: { discovery: 0.2 }, wow: 'Az első telepesek az égben', desc: 'Néhányan elmennek, és nem jönnek vissza: új világot kezdenek a világon kívül.' });
  // — gépi elme
  T('agi', { name: 'Általános mesterséges intelligencia', era: 'ai', prereq: ['artificial_intelligence', 'quantum_computing', 'neuroscience'], items: { chip: 80 }, nearby: 'data_center', difficulty: 0.989, skill: 'crafting', minSkill: 0.96, minPop: 110, buildings: ['ai_core'], fx: { discovery: 0.6, teach: 0.5, craft: 0.3 }, wow: 'Egy elme, amely nem született', desc: 'Gondolkodik, tanul, tanít — és ők nem tudják, mit gondol róluk.' });
  T('brain_computer_interface', { name: 'Agy–gép kapcsolat', era: 'ai', prereq: ['neuroscience', 'integrated_circuit'], items: { chip: 20, medicine: 6 }, nearby: 'hospital', difficulty: 0.987, skill: 'medicine', minSkill: 0.95, minPop: 105, fx: { teach: 0.6, discovery: 0.2 }, wow: 'A gondolat, amely kilép a fejből', desc: 'Az elme közvetlenül beszél a géppel.' });
  T('mind_uploading', { name: 'Elmefeltöltés', era: 'ai', prereq: ['brain_computer_interface', 'world_simulation'], items: { chip: 100, medicine: 10 }, nearby: 'simulation_core', difficulty: 0.992, skill: 'medicine', minSkill: 0.97, minPop: 115, fx: { longevity: 30, discovery: 0.3 }, wow: 'Az első átköltözött elme', desc: 'Aki nem akar meghalni, átköltözik a világba, amelyet ők teremtettek.' });

  // ---------------------------------------------------------------- hatások az épületekből: erőmű, állomás, adótorony, színház, őrség, bank
  const fx0 = Tree.fx; const TPD = LW.TIME.TICKS_PER_DAY;
  Tree.fx = function (world, a) {
    const base = fx0.call(this, world, a); const day = world.tick / TPD | 0;
    if (a._fxb && a._fxbDay === day && a._fxbN === a.knowledge.techs.size && a._fxbX === (a.x | 0) >> 3 && a._fxbY === (a.y | 0) >> 3) return a._fxb;
    const g = { ...base };
    // a környék épületei 8×8-as cellánként naponta egyszer (egy városban százan laknak ugyanabban a cellában)
    const cx = (a.x | 0) >> 3, cy = (a.y | 0) >> 3; const ck = cy * 4096 + cx; if (!world._fxCells || world._fxCellsDay !== day) { world._fxCells = new Map(); world._fxCellsDay = day; }
    let c = world._fxCells.get(ck);
    if (!c) { c = { power: 0, transport: 0, media: 0, joy: 0, guard: 0, bank: 0 }; for (const b of world.buildingsNear(cx * 8 + 4, cy * 8 + 4, 12)) { if (b.progress < 1) continue; const d = B[b.kind]; if (!d) continue; if (d.power > c.power) c.power = d.power; if (d.transport > c.transport) c.transport = d.transport; if (d.media > c.media) c.media = d.media; if (d.joy > c.joy) c.joy = d.joy; if (d.police || d.court || d.barracks) c.guard = 1; if (d.bank > c.bank) c.bank = d.bank; } world._fxCells.set(ck, c); }
    g.craft += c.power * 0.1; g.warmth += c.power * 1.5; g.speed += c.transport * 0.2; g.trade += c.transport * 0.2 + c.bank * 0.2; g.teach += c.media * 0.2; g.happiness += c.joy * 0.08; g.safety += c.guard * 0.2;
    g.speed -= this.bestTool(a, 'vehicle') * 0.25; // szekér/kerékpár/gépkocsi: 0.25 fokonként (az alap 0.5/fok helyett)
    g.craft += this.bestTool(a, 'robot') * 0.3; g.build += this.bestTool(a, 'robot') * 0.3; g.farm += this.bestTool(a, 'robot') * 0.2;
    a._fxb = g; a._fxbDay = day; a._fxbN = a.knowledge.techs.size; a._fxbX = (a.x | 0) >> 3; a._fxbY = (a.y | 0) >> 3; return g;
  };
  Tree.DOMAINS = [['Átkelők, infrastruktúra', ['bridge_building', 'stone_bridges', 'suspension_bridges', 'tunneling', 'aqueducts', 'paved_roads', 'canals', 'sewers', 'dam_building', 'water_supply', 'urban_planning', 'skyscrapers']], ['Közlekedés', ['wheel', 'horse_riding', 'shipbuilding', 'compass', 'steamship', 'rail_network', 'bicycle', 'civil_aviation', 'container_shipping', 'electric_vehicles', 'autonomous_vehicles']], ['Energia', ['watermill', 'windmill', 'coal_power', 'battery', 'power_grid', 'hydropower', 'wind_power', 'solar_power', 'nuclear_power', 'fusion_power']], ['Anyagok, ipar', ['porcelain', 'metallurgy', 'canning', 'aluminium', 'synthetic_fibers', 'assembly_line', 'recycling', 'additive_manufacturing', 'robotics', 'automation', 'nanotech']], ['Mezőgazdaság', ['beekeeping', 'salting', 'viticulture', 'terrace_farming', 'aquaculture', 'selective_breeding', 'greenhouses', 'fertilizers', 'mechanized_farming', 'refrigeration', 'gmo', 'vertical_farming']], ['Orvoslás', ['surgery', 'quarantine', 'germ_theory', 'anesthesia', 'antibiotics', 'psychology', 'public_health', 'family_planning', 'medical_imaging', 'organ_transplant', 'neuroscience', 'gene_therapy', 'life_extension']], ['Kommunikáció', ['postal_service', 'newspaper', 'photography', 'telephone', 'cinema', 'television', 'cryptography', 'mobile_phone', 'satellites', 'social_networks', 'quantum_computing']], ['Tudományok', ['geometry', 'philosophy', 'theology', 'physics', 'biology', 'geology', 'economics', 'statistics', 'evolution', 'relativity', 'quantum_mechanics', 'climate_science', 'unified_theory']], ['Társadalom, gazdaság', ['bureaucracy', 'taxation', 'courts', 'diplomacy', 'democracy', 'guilds', 'constitution', 'insurance', 'police', 'stock_market', 'universal_education', 'labor_unions', 'welfare_state', 'international_law']], ['Kultúra', ['music', 'painting', 'sports', 'sculpture', 'theatre', 'literature', 'stadium', 'fashion', 'museums', 'recorded_music', 'tourism', 'olympics', 'video_games']], ['Hadviselés', ['cavalry', 'siege_engines', 'standing_army', 'artillery', 'conscription', 'armored_vehicles', 'military_aviation', 'jet_engine', 'nuclear_weapons', 'cyberwarfare', 'drones']], ['Űr', ['observatory', 'space_station', 'moon_landing', 'space_telescope', 'mars_landing', 'asteroid_mining', 'space_colony']], ['Gépi elme', ['agi', 'brain_computer_interface', 'mind_uploading']]];

  // ---------------------------------------------------------------- az ismeretlen jövő: gazdagabb, területenként, valódi hatással
  const FUTURE = {
    domains: [['anyag', ['Kvantum', 'Nano', 'Meta', 'Plazma', 'Foton'], ['kohó', 'szövet', 'burok', 'rács', 'ötvözet'], ['craft', 'build', 'mine']], ['élet', ['Bio', 'Neuro', 'Ön', 'Szimbi', 'Gén'], ['sejt', 'kert', 'mag', 'lánc', 'szív'], ['health', 'longevity', 'farm', 'fertility']], ['elme', ['Neuro', 'Meta', 'Szinguláris', 'Kripto', 'Holo'], ['elme', 'nyelv', 'tükör', 'kapu', 'háló'], ['discovery', 'teach', 'happiness']], ['tér', ['Gravi', 'Tér', 'Idő', 'Hiper', 'Exo'], ['híd', 'motor', 'vető', 'térkép', 'kút'], ['speed', 'trade', 'discovery', 'safety']], ['társadalom', ['Pán', 'Kollektív', 'Nyílt', 'Tiszta', 'Örök'], ['tanács', 'szerződés', 'kör', 'ének', 'béke'], ['diplomacy', 'happiness', 'safety', 'trade']]],
    flavors: ['Az anyag új rendje.', 'A gondolat új alakja.', 'Az idő másképp folyik körülötte.', 'A világ széle közelebb jött.', 'Senki nem tudja, mire jó — még.', 'A Teremtő sem érti, de ők igen.', 'Ami eddig lehetetlen volt, most csak drága.', 'Egy kérdés, amelyre a válasz újabb kérdés.'],
  };
  Tree.futureStep = function (world) {
    const known = LW.Tech.worldKnowledge(world); if (!known.has('world_simulation')) return;
    world.futureTechs = world.futureTechs || []; const last = world.futureTechs[world.futureTechs.length - 1];
    if (last && !known.has(last.id)) return; // előbb az utolsó ismeretlent kell megtalálni
    if (last && world.tick - last.born < LW.TIME.TICKS_PER_YEAR * 2) return;
    const rng = world.rng; const n = world.futureTechs.length + 1; const [dom, pre, root, keys] = rng.pick(FUTURE.domains);
    const name = `${rng.pick(pre)}${rng.pick(root)}`; const fx = {}; for (const k of rng.shuffle(keys.slice()).slice(0, rng.int(1, 2))) fx[k] = k === 'longevity' ? rng.int(3, 12) : Math.round(rng.range(0.15, 0.5) * 100) / 100;
    const own = world.language.place().toLowerCase(); const nearby = rng.pick(['data_center', 'lab', 'simulation_core', 'ai_core', 'spaceport']);
    const t = { id: `future_${n}`, name, era: 'beyond', domain: dom, prereq: [last ? last.id : 'world_simulation'], items: { chip: rng.int(10, 60), electric_part: rng.int(4, 20) }, nearby: B[nearby] ? nearby : 'data_center', difficulty: 0.985 + rng.f() * 0.012, skill: rng.pick(['crafting', 'medicine', 'building', 'social']), minSkill: 0.9, minPop: 105 + n * 15, fx, wow: `Ismeretlen: ${name}`, desc: `Amit még senki nem látott (${dom}). Ők úgy hívják: „${own}”. ${rng.pick(FUTURE.flavors)}`, born: world.tick };
    world.futureTechs.push(t); this.registerFuture([t]);
    world.events.emit('FutureTech', { tick: world.tick, name, id: t.id, domain: dom });
  };
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/genetics.js ===== */
/* LEVENTE — THE CREATOR · agents/genetics.js — genomes, inheritance, mutation, appearance (AGENT_MODEL.md §6) */
(function (LW) {
  'use strict';
  const TRAITS = LW.TRAITS;

  const Genetics = {
    random(rng) {
      const traits = {}; for (const t of TRAITS) traits[t] = LW.clamp01(rng.gauss(0.5, 0.18));
      const [lo, hi] = LW.CONFIG.agents.longevityRange;
      return {
        traits,
        appearance: { skin: rng.f(), hairHue: rng.f(), hairShade: rng.f(), eyes: rng.f(), height: LW.clamp01(rng.gauss(0.5, 0.15)), build: LW.clamp01(rng.gauss(0.5, 0.15)) },
        physiology: { longevity: rng.range(lo, hi), fertility: rng.range(0.4, 1), baseHealth: rng.range(0.75, 1), metabolism: rng.range(0.85, 1.15), immunity: rng.f() },
        prefs: [rng.f(), rng.f(), rng.f(), rng.f(), rng.f(), rng.f()],
        orientation: rng.chance(0.92) ? LW.clamp01(Math.abs(rng.gauss(0, 0.08))) : LW.clamp01(rng.gauss(0.85, 0.1)),
      };
    },
    inherit(rng, A, B) {
      const mix = (a, b, sd = 0.04) => { const base = rng.chance(0.5) ? a : b; const other = base === a ? b : a; let v = base + (other - base) * 0.3 + rng.gauss(0, sd); if (rng.chance(0.01)) v += rng.gauss(0, 0.2); return v; };
      const traits = {}; for (const t of TRAITS) traits[t] = LW.clamp01(mix(A.traits[t], B.traits[t]));
      const ap = {}; for (const k in A.appearance) ap[k] = LW.clamp01(mix(A.appearance[k], B.appearance[k], 0.03));
      const [lo, hi] = LW.CONFIG.agents.longevityRange;
      return {
        traits, appearance: ap,
        physiology: {
          longevity: LW.clamp(mix(A.physiology.longevity, B.physiology.longevity, 2), lo - 5, hi + 8),
          fertility: LW.clamp(mix(A.physiology.fertility, B.physiology.fertility), 0.2, 1),
          baseHealth: LW.clamp(mix(A.physiology.baseHealth, B.physiology.baseHealth), 0.5, 1),
          metabolism: LW.clamp(mix(A.physiology.metabolism, B.physiology.metabolism), 0.7, 1.3),
          immunity: LW.clamp01(mix(A.physiology.immunity, B.physiology.immunity)),
        },
        prefs: A.prefs.map((v, i) => LW.clamp01(mix(v, B.prefs[i], 0.08))),
        orientation: rng.chance(0.92) ? LW.clamp01(Math.abs(rng.gauss(0, 0.08))) : LW.clamp01(rng.gauss(0.85, 0.1)),
      };
    },
    /** Colours for rendering derived from appearance genes. */
    palette(ap) {
      const skinStops = [[246, 219, 190], [226, 190, 150], [198, 150, 110], [160, 110, 75], [120, 78, 50], [80, 52, 34]];
      const s = ap.skin * (skinStops.length - 1); const i0 = Math.floor(s), i1 = Math.min(skinStops.length - 1, i0 + 1), f = s - i0;
      const skin = skinStops[i0].map((c, k) => Math.round(c + (skinStops[i1][k] - c) * f));
      let hair;
      if (ap.hairHue < 0.45) hair = [40 + ap.hairShade * 30, 28 + ap.hairShade * 22, 18 + ap.hairShade * 15];
      else if (ap.hairHue < 0.75) hair = [110 + ap.hairShade * 60, 70 + ap.hairShade * 45, 30 + ap.hairShade * 20];
      else if (ap.hairHue < 0.9) hair = [200 + ap.hairShade * 40, 160 + ap.hairShade * 60, 70 + ap.hairShade * 60];
      else hair = [170 + ap.hairShade * 40, 70 + ap.hairShade * 20, 30];
      hair = hair.map((c) => Math.round(Math.min(255, c)));
      const eyes = ap.eyes < 0.6 ? [60, 40, 25] : ap.eyes < 0.85 ? [50, 90, 60] : [60, 100, 160];
      return { skin: `rgb(${skin})`, hair: `rgb(${hair})`, eyes: `rgb(${eyes})` };
    },
    /** Childhood development: pull toward caregivers' traits and apply formative memories. */
    develop(world, a, caregivers) {
      if (!caregivers.length) return;
      for (const t of TRAITS) { const m = LW.mean(caregivers.map((c) => c.personality[t])); a.personality[t] = LW.clamp01(a.personality[t] + (m - a.personality[t]) * 0.15); }
    },
  };
  LW.Genetics = Genetics;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/mind.js ===== */
/* LEVENTE — THE CREATOR · agents/mind.js — a belső világ: én-kép, cél, belső hang, álmok, halandóság, létkérdések
 * Ez a tudat modellje, nem tudat: az ember naponta visszanéz arra, ami vele történt, megfogalmazza, mi hajtja,
 * mit gondol magáról és arról, aki figyeli; a halál közelsége megváltoztatja, mit tart fontosnak; a tudás és a gyász
 * kérdéseket szül, amelyekre nincs válasz. Minden mondat a valódi állapotból és a valódi emlékekből áll össze.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME; const b01 = (v) => LW.clamp01(v);
  const PURPOSE = { family: 'a család', knowledge: 'a tudás', faith: 'a hit', power: 'a hatalom', craft: 'az alkotás', freedom: 'a szabadság', love: 'a szerelem', survival: 'a túlélés', legacy: 'ami utánam marad' };
  const PURPOSE_LINE = { family: ['A gyerekeimért csinálom. Mindent.', 'Ha ők jóllaknak, én is jóllaktam.'], knowledge: ['Tudni akarom, miért. Mindenre.', 'Minden nap egy új kérdés. Ez tart életben.'], faith: ['Valaki figyel. Nem vagyok egyedül.', 'Ha a hang nem szól, akkor is itt van.'], power: ['Aki dönt, az él igazán.', 'A többiek várják, hogy mondjam, merre.'], craft: ['A kezem tudja, amit a fejem még nem.', 'Amit csinálok, az megmarad utánam.'], freedom: ['Senki ne mondja meg, hová menjek.', 'A dombokon túl is van világ.'], love: ['Amíg ő itt van, minden elviselhető.', 'Csak őt látom, ha becsukom a szemem.'], survival: ['Ma is túléltem. Holnap újra kell.', 'Étel, víz, tűz. A többi ráér.'], legacy: ['Nem sok időm van. Át kell adnom, amit tudok.', 'Ne haljon meg velem az, amit megtanultam.'] };
  const QUESTIONS = ['Miért vagyunk itt?', 'Mi van a halál után?', 'Ki figyel minket — és őt ki figyeli?', 'Van-e szabad akaratunk, vagy csak azt tesszük, amit a hang akar?', 'Mi van a világ szélén túl?', 'Ha egyszer mi is világot teremtünk, mi leszünk nekik?'];

  const Mind = {
    PURPOSE,
    fresh() { return { purpose: null, journal: [], existential: 0, mortality: 0, selfImage: 0, asked: [], voice: null, voiceTick: -1, lastPurposeTick: -1e9 }; },
    label(p) { return PURPOSE[p] || '—'; },
    /** Naponta (a többi napi biológiával együtt). */
    daily(world, a) {
      const m = a.mind || (a.mind = this.fresh()); const rng = world.rng; const st = LW.Agents.stage(world, a); if (st === 'infant' || st === 'child') return;
      const P = a.personality, E = a.emotions, N = a.needs; const age = LW.Agents.age(world, a); const lon = a.genes.physiology.longevity;
      // halandóság-érzet: kor, betegség, közeli halálok
      const recentDeaths = a.memory.episodic.slice(-20).filter((x) => x.type === 'death' && world.tick - x.tick < T.TICKS_PER_DAY * 120).length;
      m.mortality = b01(Math.max(0, (age - lon * 0.55) / (lon * 0.45)) * 0.8 + (a.ill > 0 ? 0.25 : 0) + (a.health < 0.4 ? 0.25 : 0) + recentDeaths * 0.12);
      // én-kép: amit mások gondolnak róla (barátság, tisztelet, neheztelés)
      if ((world.tick + a.id) % (T.TICKS_PER_DAY * 5) < T.TICKS_PER_DAY) { let s = 0, n = 0; for (const o of world.agentsNear(a.x, a.y, 12, a.id)) { const r = o.relationships.get(a.id); if (!r) continue; s += r.friendship + (r.respect || 0) - r.resentment; n++; } m.selfImage = n ? LW.clamp(s / n, -1, 1) : m.selfImage * 0.9; }
      // létkérdések: kétely, gyász, a szimulációs hipotézis szül; a hit és a cél csillapít
      const sk = LW.Civilization ? LW.Civilization.skepticism(world, a) : 0;
      m.existential = b01(m.existential + 0.004 * sk + 0.02 * (E.grief > 0.4 ? 1 : 0) + 0.01 * (a.beliefs.simulation || 0) + 0.006 * m.mortality - 0.004 * a.beliefs.creator - (m.purpose ? 0.003 : 0) - 0.002);
      // mi hajtja: időnként újragondolja
      if (world.tick - m.lastPurposeTick > T.TICKS_PER_DAY * 30 || !m.purpose) {
        const leader = a.occupation === 'leader'; const sc = {
          family: (a.children.length ? 1 + a.children.length * 0.25 : 0) + (a.partner != null ? 0.3 : 0) + P.empathy * 0.4 + P.loyalty * 0.3,
          knowledge: P.curiosity * 1.1 + a.knowledge.techs.size / 40 + (a.skills.medicine || 0) * 0.3,
          faith: a.beliefs.creator * 1.2 + (a.beliefs.trust > 0.2 ? 0.3 : 0),
          power: P.dominance * 1.1 + P.ambition * 0.6 + (leader ? 0.8 : 0),
          craft: (a.skills.crafting || 0) * 0.8 + (a.skills.building || 0) * 0.5 + P.creativity * 0.6,
          freedom: P.riskTolerance * 0.7 + (1 - P.loyalty) * 0.5 + (a.home == null ? 0.3 : 0) + P.curiosity * 0.3,
          love: (a.partner != null ? 0.5 : 0) + E.love * 0.9 + (N.affection < 0.4 ? 0.3 : 0),
          survival: (N.food < 0.4 ? 0.6 : 0) + (N.warmth < 0.4 ? 0.5 : 0) + (a.health < 0.5 ? 0.5 : 0) + 0.25,
          legacy: m.mortality * 1.6 + (a.knowledge.techs.size > 8 ? 0.3 : 0),
        };
        let best = null, bs = -1; for (const k in sc) { const v = sc[k] + rng.f() * 0.15; if (v > bs) { bs = v; best = k; } }
        if (best !== m.purpose) { const first = !m.purpose; m.purpose = best; m.lastPurposeTick = world.tick; this.say(world, a, first ? `Most már tudom, mi hajt: ${PURPOSE[best]}.` : `Megváltoztam. Ami most számít: ${PURPOSE[best]}.`); if (best === 'legacy') a.mind.legacy = true; }
        else m.lastPurposeTick = world.tick;
      }
      // kérdések, amelyekre nincs válasz
      if (m.existential > 0.35 && rng.chance(0.04)) { const q = QUESTIONS.filter((x) => !m.asked.includes(x)); if (q.length) { const pick = q[0 + Math.min(q.length - 1, Math.floor(m.existential * q.length))]; m.asked.push(pick); this.say(world, a, pick); if (!world.firsts['question'] && LW.Agents.isAdult(world, a)) world.events.emit('ExistentialQuestion', { tick: world.tick, agentId: a.id, text: pick, tile: world.idx(a.x | 0, a.y | 0) }); } }
      // belső hang: a nap egy mondata
      if (rng.chance(0.35)) this.say(world, a, this.reflect(world, a));
      // álom
      if (rng.chance(0.12) && a.memory.emotional.length) { const mm = rng.pick(a.memory.emotional); this.say(world, a, `Álmodtam: ${mm.text}. Felébredtem, és még mindig ott volt.`); if (mm.emotion === 'fear' || mm.emotion === 'grief') E[mm.emotion] = b01(E[mm.emotion] + 0.1); else E.joy = b01(E.joy + 0.05); }
    },
    say(world, a, text) { const m = a.mind; if (!text) return; m.journal.push({ t: world.tick, text }); if (m.journal.length > 24) m.journal.splice(0, m.journal.length - 24); m.voice = text; m.voiceTick = world.tick; },
    /** Egy őszinte mondat a mai napról — a legerősebb jelből. */
    reflect(world, a) {
      const rng = world.rng; const m = a.mind; const E = a.emotions, N = a.needs, P = a.personality; const pick = (arr) => rng.pick(arr);
      const name = (id) => { const o = world.agents.get(id) || world.deceased.get(id); return o ? o.name : 'valaki'; };
      if (a.ill > 0) return pick(['Beteg vagyok. Nem tudom, ez az a fajta, amiből nem jönnek vissza.', 'Lázas a testem. Aludni akarok, és félek elaludni.']);
      if (E.grief > 0.5) { const d = a.memory.episodic.slice().reverse().find((x) => x.type === 'death'); return d ? `${d.text}. Nem tudom, hová tegyem.` : 'Elment. Mégis keresem.'; }
      if (N.food < 0.2) return pick(['Ma is éhes voltam. Ez a világ nem ad ingyen.', 'A gyomrom parancsol, nem én.']);
      if (m.mortality > 0.6) return pick(['Érzem, hogy fogy az idő. Mit hagyok itt?', 'Aki utánam jön, ne kelljen elölről kezdenie.', 'Régen nem féltem a téltől. Most számolom.']);
      if (a.beliefs.simulation > 0.6) return pick(['Ha ők ott a Világmagban azt hiszik, valódiak — mi mitől lennénk mások?', 'Valaki nézi ezt. Talán most is.', 'Nem baj, ha teremtettek vagyunk. A kenyér attól még kenyér.']);
      if (m.existential > 0.5 && (LW.Civilization ? LW.Civilization.skepticism(world, a) : 0) > 0.3) return pick(['A hang a fejemben talán csak a fejem. A tudomány nem talált teremtőt.', 'Minden megmagyarázható. Ez megnyugtat és rémít.']);
      if (a.beliefs.creator > 0.7 && (a.beliefs.trust || 0) > 0.3) return pick(['A hang jó hozzánk. Ezt nem felejtem el.', 'Ma is szólt valakihez. Nem vagyunk egyedül.']);
      if (a.beliefs.creator > 0.5 && (a.beliefs.trust || 0) < -0.3) return pick(['Aki az égben van, nem szeret minket. Csak néz.', 'Ha ő figyel, én nem nézek vissza.']);
      if (E.pride > 0.5) { const d = a.memory.episodic.slice().reverse().find((x) => x.type === 'discovery' || x.type === 'craft'); return d ? `${d.text}. Ma valakivé lettem.` : 'Csináltam valamit, ami jó, és az enyém.'; }
      if (E.love > 0.6 && a.partner != null) return `${name(a.partner)}. Ha rá gondolok, kiegyenesedik a hátam.`;
      if (E.jealousy > 0.5) return 'Láttam őket. Nem tudom nem látni.';
      if (E.loneliness > 0.5) return pick(['Senki nem kérdezte ma, hogy vagyok.', 'A tűz mellett is egyedül.']);
      if (m.selfImage < -0.3) return pick(['Nem szeretnek. Érzem, ahogy elfordulnak.', 'Valamit rosszul csinálok. Nem tudom, mit.']);
      if (m.selfImage > 0.4) return pick(['Számítanak rám. Ez súly, de jó súly.', 'Ma valaki megköszönte. Ritka.']);
      if (m.purpose && PURPOSE_LINE[m.purpose]) return pick(PURPOSE_LINE[m.purpose]);
      const last = a.memory.episodic[a.memory.episodic.length - 1]; return last ? `Ma: ${last.text}.` : 'Semmi különös. Élek.';
    },
    /** Rövid önjellemzés a párbeszédhez és a felületnek. */
    describe(world, a) {
      const m = a.mind || this.fresh(); const out = [];
      if (m.purpose) out.push(`Ami hajtja: ${PURPOSE[m.purpose]}.`);
      out.push(m.mortality > 0.6 ? 'Tudja, hogy fogy az ideje.' : m.mortality > 0.3 ? 'Néha eszébe jut a halál.' : 'A halál még messze van neki.');
      out.push(m.selfImage > 0.3 ? 'Úgy érzi, kedvelik.' : m.selfImage < -0.3 ? 'Úgy érzi, nem kedvelik.' : 'Nem tudja, mit gondolnak róla.');
      if (m.existential > 0.5) out.push('Kérdések gyötrik, amelyekre nincs válasz.');
      if (a.beliefs.simulation > 0.6) out.push('Elfogadta: ő maga is egy teremtett világban él.'); else if (a.beliefs.simulation > 0 && a.beliefs.simulation < 0.3) out.push('Tagadja, hogy a világa szimuláció lenne.');
      return out;
    },
  };
  LW.Mind = Mind;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/memory.js ===== */
/* LEVENTE — THE CREATOR · agents/memory.js — episodic / emotional / social memory with decay, consolidation, distortion (AGENT_MODEL.md §4) */
(function (LW) {
  'use strict';

  const Memory = {
    add(world, a, m) {
      const mem = { tick: world.tick, type: m.type, text: m.text, importance: LW.clamp01(m.importance ?? 0.3), emotion: m.emotion || null, intensity: LW.clamp01(m.intensity ?? 0.2), confidence: m.confidence ?? 1, source: m.source || 'experienced', subjects: m.subjects || [], tile: m.tile ?? null, tech: m.tech, buildingId: m.buildingId, divine: !!m.divine };
      a.memory.episodic.push(mem);
      if (mem.importance > 0.8 || mem.intensity > 0.7) { a.memory.emotional.push(mem); if (a.memory.emotional.length > world.cfg.agents.emotionalCap) { a.memory.emotional.sort((x, y) => y.importance + y.intensity - x.importance - x.intensity); a.memory.emotional.length = world.cfg.agents.emotionalCap; } }
      if (a.memory.episodic.length > world.cfg.agents.memoryCap * 1.25) this.consolidate(world, a);
      return mem;
    },
    /** Hourly (sliced): decay importance of episodic memories, drop weakest over cap. */
    consolidate(world, a) {
      const cap = world.cfg.agents.memoryCap; const ep = a.memory.episodic;
      for (let i = 0; i < ep.length; i++) { const m = ep[i]; m.importance *= 1 - 0.003 * (1 - m.intensity * 0.8); }
      if (ep.length > cap) { ep.sort((x, y) => (y.importance + y.intensity * 0.5 + (world.tick - x.tick > world.tick - y.tick ? 0 : 0)) - (x.importance + x.intensity * 0.5)); ep.length = cap; ep.sort((x, y) => x.tick - y.tick); }
    },
    /** Retell a memory to another agent (rumor): copies with reduced confidence and possible distortion. */
    tell(world, teller, listener, m) {
      if (listener.memory.episodic.some((x) => x.source === 'told' && x.text === m.text && x.tick === m.tick)) return null;
      const rng = world.rng; let text = m.text, intensity = m.intensity, importance = m.importance * 0.8;
      let distorted = false;
      if (rng.chance((1 - teller.personality.intelligence) * 0.3 + teller.personality.humor * 0.1)) { distorted = true; intensity = LW.clamp01(intensity * (1 + rng.range(0.1, 0.6))); importance = LW.clamp01(importance * 1.1); text = text + ' (így mesélték)'; }
      const copy = { ...m, text, intensity, importance, confidence: m.confidence * 0.8, source: 'told', teller: teller.id, tick: m.tick, distorted };
      listener.memory.episodic.push(copy); if (listener.memory.episodic.length > world.cfg.agents.memoryCap * 1.25) this.consolidate(world, listener);
      if (copy.divine) { listener.beliefs.creator = LW.clamp01(listener.beliefs.creator + 0.15 * copy.confidence * (0.5 + listener.personality.optimism) * (0.5 + teller.personality.sociability)); }
      return copy;
    },
    /** Most tellable memory for conversation (important, emotional, recent-ish). */
    pickToTell(world, a) {
      let best = null, bs = 0;
      for (const m of a.memory.episodic) { const age = (world.tick - m.tick) / LW.TIME.TICKS_PER_YEAR; const s = (m.importance + m.intensity) * (1 / (1 + age)) * (m.divine ? 1.6 : 1) * (m.source === 'told' ? 0.6 : 1); if (s > bs) { bs = s; best = m; } }
      return best;
    },
    social(a, otherId) { let s = a.memory.social.get(otherId); if (!s) { s = { lastSeen: -1, lastTile: -1, impression: 0, facts: [] }; a.memory.social.set(otherId, s); } return s; },
  };
  LW.Memory = Memory;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/relationships.js ===== */
/* LEVENTE — THE CREATOR · agents/relationships.js — multi-dimensional, asymmetric relationships (AGENT_MODEL.md §5) */
(function (LW) {
  'use strict';

  const DIMS = ['trust', 'attraction', 'respect', 'friendship', 'fear', 'resentment', 'jealousy', 'gratitude', 'loyalty', 'familiarity', 'dependency', 'romance'];

  const Relationships = {
    DIMS,
    get(a, otherId) { return a.relationships.get(otherId) || null; },
    ensure(world, a, b) {
      let r = a.relationships.get(b.id);
      if (!r) {
        r = { trust: 0.3, attraction: 0, respect: 0.3, friendship: 0, fear: 0, resentment: 0, jealousy: 0, gratitude: 0, loyalty: 0, familiarity: 0, dependency: 0, romance: 0, status: 'stranger', since: world.tick, last: world.tick };
        r.attraction = this.initialAttraction(world, a, b);
        const kin = this.kinship(world, a, b);
        if (kin >= 0.5) { r.status = 'family'; r.trust = 0.7; r.friendship = 0.5; r.loyalty = 0.6; r.familiarity = 0.6; }
        a.relationships.set(b.id, r);
      }
      return r;
    },
    bump(r, dim, delta) { r[dim] = LW.clamp01(r[dim] + delta); },
    compatibility(a, b) {
      const P = a.personality, Q = b.personality;
      const sim = 1 - LW.mean(['humor', 'optimism', 'patience', 'discipline', 'sociability'].map((t) => Math.abs(P[t] - Q[t])));
      const comp = 0.5 * Math.abs(P.dominance - Q.dominance);
      return LW.clamp01(sim * 0.8 + comp * 0.4);
    },
    /** Kinship degree: 1 parent/child, 0.9 full sibling, 0.5 half-sibling/grandparent, 0.25 first cousin, 0 otherwise. */
    kinship(world, a, b) {
      if (a.parents.includes(b.id) || b.parents.includes(a.id)) return 1;
      const shared = a.parents.filter((p) => p != null && b.parents.includes(p)).length;
      if (shared === 2) return 0.9; if (shared === 1) return 0.5;
      const rec = (id) => (id != null ? (world.agents.get(id) || world.deceased.get(id)) : null);
      for (const p of a.parents) { const r = rec(p); if (r && r.parents && r.parents.includes(b.id)) return 0.5; }
      for (const p of b.parents) { const r = rec(p); if (r && r.parents && r.parents.includes(a.id)) return 0.5; }
      // first cousins: a parent of each are siblings
      const gpA = new Set(); for (const p of a.parents) { const r = rec(p); if (r && r.parents) for (const g of r.parents) if (g != null) gpA.add(g); }
      for (const p of b.parents) { const r = rec(p); if (r && r.parents) for (const g of r.parents) if (g != null && gpA.has(g)) return 0.25; }
      return 0;
    },
    /** Instinctive aversion to pairing with close kin (Westermarck): strong for parents/children and full siblings, weaker beyond. */
    kinPenalty(k) { return k >= 1 ? 2.5 : k >= 0.9 ? 0.9 : k >= 0.5 ? 0.35 : k > 0 ? 0.12 : 0; },
    initialAttraction(world, a, b) {
      const ga = a.genes, gb = b.genes;
      const sameSex = a.sex === b.sex;
      const orient = sameSex ? ga.orientation : 1 - ga.orientation; // how much a's orientation fits b's sex
      if (orient < 0.2) return 0;
      const ap = gb.appearance; const vec = [ap.skin, ap.hairHue, ap.hairShade, ap.eyes, ap.height, ap.build];
      const look = 1 - LW.mean(vec.map((v, i) => Math.abs(v - ga.prefs[i])));
      const comp = this.compatibility(a, b);
      const ageA = LW.Time.ageYears(a.bornTick, world.tick), ageB = LW.Time.ageYears(b.bornTick, world.tick);
      const ageFit = 1 - LW.clamp01(Math.abs(ageA - ageB) / 25);
      const kin = this.kinship(world, a, b);
      let v = 0.4 * look + 0.3 * comp + 0.15 * ageFit + 0.15 * (0.5 + b.personality.humor * 0.25 + b.personality.sociability * 0.25);
      v *= orient; v -= this.kinPenalty(kin);
      return LW.clamp01(v + world.rng.gauss(0, 0.05));
    },
    /** Daily decay pass. */
    decay(world, a) {
      for (const r of a.relationships.values()) {
        r.familiarity = Math.max(0, r.familiarity - 0.002);
        r.resentment = Math.max(0, r.resentment - 0.01 * (0.5 + a.personality.patience + a.personality.empathy * 0.5));
        r.jealousy = Math.max(0, r.jealousy - 0.02);
        r.gratitude = Math.max(0, r.gratitude - 0.005);
        if (r.status !== 'partner' && r.status !== 'dating') r.romance = Math.max(0, r.romance - 0.01);
      }
    },
    label(r) {
      if (!r) return 'idegen';
      if (r.status === 'partner') return 'pár'; if (r.status === 'dating') return 'jár vele'; if (r.status === 'ex') return 'volt pár'; if (r.status === 'family') return 'rokon';
      if (r.resentment > 0.5 && r.resentment > r.friendship) return 'ellenség'; if (r.resentment > 0.3 && r.resentment > r.friendship) return 'rivális';
      if (r.friendship > 0.6) return 'jó barát'; if (r.friendship > 0.3) return 'barát'; if (r.familiarity > 0.15) return 'ismerős';
      return 'idegen';
    },
  };
  LW.Relationships = Relationships;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/agent.js ===== */
/* LEVENTE — THE CREATOR · agents/agent.js
 * Agent creation, biology (needs, warmth, health, aging, pregnancy), inventory,
 * skills, life stages, birth and death. (AGENT_MODEL.md §1–§2)
 */
(function (LW) {
  'use strict';
  const T = LW.TIME, TPD = T.TICKS_PER_DAY;

  const Agents = {
    create(world, opts) {
      const rng = world.rng;
      const genes = opts.genes || LW.Genetics.random(rng);
      const a = {
        id: world.nextIds.agent++,
        name: opts.name, sex: opts.sex, bornTick: opts.bornTick ?? world.tick,
        genes, appearance: { ...genes.appearance }, palette: LW.Genetics.palette(genes.appearance),
        personality: { ...genes.traits },
        emotions: Object.fromEntries(LW.EMOTIONS.map((e) => [e, 0])),
        needs: { food: 0.9, water: 0.9, energy: 0.9, warmth: 1, safety: 0.8, social: 0.7, affection: 0.6, curiosity: 0.6 },
        health: genes.physiology.baseHealth, injury: 0, pregnancy: null,
        skills: Object.fromEntries(LW.SKILLS.map((s) => [s, 0.1])),
        knowledge: { techs: new Set(), places: new Map(), progress: {} },
        memory: { episodic: [], emotional: [], social: new Map() },
        relationships: new Map(),
        beliefs: { creator: 0, trust: 0, simulation: 0, world: {} }, ill: 0, mind: LW.Mind.fresh(),
        vocab: {}, langId: opts.langId ?? (opts.parents && opts.parents[0] != null && world.agents.get(opts.parents[0]) ? world.agents.get(opts.parents[0]).langId : (world.langs && world.langs.size ? LW.Speech.firstLang(world).id : 1)), chatHistory: [],
        inv: {}, home: null, partner: null, parents: opts.parents || [null, null], children: [],
        x: opts.x, y: opts.y, facing: 1,
        plan: null, lastDecisionTick: -1000 + (rng.int(0, 7)), engagedUntil: 0, divineRequest: null,
        achievements: [], importance: 0, sleeping: false, lastSleep: world.tick, lastMeal: world.tick,
        why: null, counters: { gathered: 0, built: 0, talks: 0, flirts: 0, experiments: 0, kills: 0 },
        generation: opts.generation || 0, genesis: !!opts.genesis, occupation: null,
      };
      a.emotions.joy = 0.3 + genes.traits.optimism * 0.2;
      world.addAgent(a);
      return a;
    },

    /** Spawn the Genesis population near the genesis site. */
    genesis(world, n) {
      const rng = world.rng, cfg = world.cfg.genesis; const out = [];
      const sexes = []; for (let i = 0; i < n; i++) sexes.push(i % 2 === 0 ? 'f' : 'm'); rng.shuffle(sexes);
      for (let i = 0; i < n; i++) {
        const sex = sexes[i]; const age = rng.range(cfg.minAdultAge, cfg.maxAdultAge);
        const ti = world.randomNear(world.genesis.x, world.genesis.y, 2);
        const a = this.create(world, { name: world.language.person(sex, 0.5), sex, bornTick: world.tick - Math.round(age * T.TICKS_PER_YEAR), x: world.xOf(ti) + 0.5, y: world.yOf(ti) + 0.5, genesis: true });
        a.inv.berries = 3; // a few berries in hand: the first hours are for looking around
        a.achievements.push('Az Elsők egyike');
        out.push(a);
        world.events.emit('AgentBorn', { tick: world.tick, agentId: a.id, genesis: true, tile: ti });
      }
      return out;
    },

    /** The map is a region, not the planet: now and then a stranger wanders in from beyond its edge (daily check). */
    immigrationCheck(world) {
      const pop = world.population; if (pop === 0 || pop > 40) return;
      const pYear = pop < 6 ? 0.45 : pop < 12 ? 0.2 : 0.06; if (!world.rng.chance(pYear / T.DAYS_PER_YEAR)) return;
      const rng = world.rng; const sex = rng.chance(0.5) ? 'f' : 'm';
      // arrive somewhere far from everyone (over the hills, along the coast), then walk toward the people
      let ti = -1, best = -1; const people = [...world.agents.values()];
      const B = LW.BIOME; const t = world.tiles;
      for (let k = 0; k < 200; k++) { const i = rng.int(0, world.w * world.h - 1); const b = t.biome[i]; if (!(b === B.GRASSLAND || b === B.FOREST || b === B.SAVANNA || b === B.DENSE_FOREST) || t.veg[i] < 40) continue; const x = world.xOf(i), y = world.yOf(i); let dmin = 1e9; for (const o of people) dmin = Math.min(dmin, LW.dist(x, y, o.x, o.y)); const score = Math.min(dmin, 40) - Math.abs(t.baseTemp[i] - 15); if (score > best) { best = score; ti = i; } }
      if (ti < 0 || best < 10) return;
      const a = this.create(world, { name: world.language.person(sex, 0.5), sex, bornTick: world.tick - Math.round(rng.range(17, 30) * T.TICKS_PER_YEAR), x: world.xOf(ti) + 0.5, y: world.yOf(ti) + 0.5 });
      a.inv.berries = 4; a.achievements.push('A messzeségből jött'); a.skills.gathering = 0.2; a.skills.foraging = 0.2;
      LW.Perception.scan(world, a);
      const target = [...world.agents.values()].find((o) => o.id !== a.id); if (target) { a.knowledge.places.set(this.poiKey('water', world.idx(target.x | 0, target.y | 0)), { k: 'water', i: world.idx(target.x | 0, target.y | 0), q: 1, t: world.tick }); a.plan = { goal: 'explore', steps: [{ op: 'moveTo', i: world.idx(target.x | 0, target.y | 0), near: 1, explore: true }], i: 0, startedTick: world.tick, done: false, priority: 1, score: 5 }; }
      this.memory(world, a, { type: 'arrival', text: 'a dombokon túlról jöttem, egy földről, amire már nem emlékszem', importance: 0.7, emotion: 'excitement', intensity: 0.5 });
      world.events.emit('StrangerArrived', { tick: world.tick, agentId: a.id, tile: ti, first: !world.firsts || !world.firsts['stranger'] });
      world.events.emit('AgentBorn', { tick: world.tick, agentId: a.id, genesis: true, stranger: true, tile: ti });
    },

    // ---------------- life stage & helpers
    age(world, a) { return LW.Time.ageYears(a.bornTick, world.tick); },
    stage(world, a) { const age = this.age(world, a), c = world.cfg.agents; if (age < c.childAge) return 'infant'; if (age < c.adolescentAge) return 'child'; if (age < c.adultAge) return 'adolescent'; if (age > a.genes.physiology.longevity - 8) return 'elder'; return 'adult'; },
    isAdult(world, a) { return this.age(world, a) >= world.cfg.agents.adultAge; },
    isChild(world, a) { return this.age(world, a) < world.cfg.agents.adultAge; },
    household(world, a) {
      const out = [a];
      if (a.home != null) { const b = world.buildings.get(a.home); if (b) for (const id of b.residents) if (id !== a.id) { const o = world.agents.get(id); if (o) out.push(o); } return out; }
      if (a.partner != null) { const p = world.agents.get(a.partner); if (p) out.push(p); }
      for (const cid of a.children) { const c = world.agents.get(cid); if (c && this.isChild(world, c)) out.push(c); }
      return out;
    },
    caregivers(world, a) { const out = []; for (const pid of a.parents) { const p = pid != null ? world.agents.get(pid) : null; if (p) out.push(p); } return out; },
    speed(world, a) {
      const st = this.stage(world, a); let s = world.cfg.agents.baseSpeed;
      if (st === 'infant') s *= 0.35; else if (st === 'child') s *= 0.8; else if (st === 'elder') s *= 0.75;
      s *= 0.6 + 0.4 * a.health; if (a.needs.energy < 0.15) s *= 0.6; if (a.pregnancy && (world.tick - a.pregnancy.since) > TPD * 180) s *= 0.8;
      s *= LW.Tech.mult(world, a, 'speed');
      return s;
    },

    // ---------------- inventory
    capacity(world, a) { const st = this.stage(world, a); let c = world.cfg.agents.carryCapacity * (0.7 + a.genes.appearance.build * 0.6); if (st === 'child') c *= 0.4; else if (st === 'infant') c = 0.5; if (a.inv.basket) c += LW.ITEMS.basket.carryBonus; if (a.inv.pot) c += LW.ITEMS.pot.carryBonus; return c; },
    load(a) { let w = 0; for (const k in a.inv) w += (LW.ITEMS[k] ? LW.ITEMS[k].weight : 1) * a.inv[k]; return w; },
    addItem(world, a, item, q) {
      const def = LW.ITEMS[item] || { weight: 1 }; const free = this.capacity(world, a) - this.load(a); const can = Math.max(0, Math.min(q, Math.floor(free / def.weight)));
      if (can > 0) a.inv[item] = (a.inv[item] || 0) + can;
      return can;
    },
    /** Drop bulky non-food, non-tool items on the ground until `weight` is free. Returns true if room was made. */
    makeRoom(world, a, weight) {
      const order = ['stone', 'clay', 'hide', 'wood', 'fiber', 'ore_copper', 'ore_tin', 'ore_iron', 'coal', 'salt', 'gems', 'gold_nugget'];
      const i = world.idx(a.x | 0, a.y | 0); world.ground = world.ground || new Map();
      for (const k of order) {
        while ((a.inv[k] || 0) > 0 && this.capacity(world, a) - this.load(a) < weight) { this.removeItem(a, k, 1); const g = world.ground.get(i) || {}; g[k] = (g[k] || 0) + 1; world.ground.set(i, g); }
        if (this.capacity(world, a) - this.load(a) >= weight) return true;
      }
      return this.capacity(world, a) - this.load(a) >= weight;
    },
    removeItem(a, item, q) { const have = a.inv[item] || 0; const r = Math.min(have, q); if (r > 0) { a.inv[item] = have - r; if (a.inv[item] <= 0) delete a.inv[item]; } return r; },
    has(a, item, q = 1) { return (a.inv[item] || 0) >= q; },
    foodInInventory(a) { let best = null, bv = 0; for (const k in a.inv) { const d = LW.ITEMS[k]; if (d && d.food && a.inv[k] > 0) { const v = d.food * (d.raw ? 0.85 : 1) - (d.spoilDays < 3 ? 0.05 : 0); if (v > bv) { bv = v; best = k; } } } return best; },
    foodUnits(inv) { let f = 0; for (const k in inv) { const d = LW.ITEMS[k]; if (d && d.food) f += d.food * inv[k]; } return f; },
    /** Daily spoilage of perishable items in an inventory object. */
    spoil(world, inv, factor = 1) {
      for (const k in inv) { const d = LW.ITEMS[k]; if (!d || !d.spoilDays || inv[k] <= 0) continue; const loss = inv[k] / d.spoilDays * factor; let n = Math.floor(loss); if (world.rng.chance(loss - n)) n++; if (n > 0) { inv[k] -= n; if (inv[k] <= 0) delete inv[k]; } }
    },
    eat(world, a, item) {
      const d = LW.ITEMS[item]; if (!d || !d.food || !this.removeItem(a, item, 1)) return false;
      a.needs.food = Math.min(1, a.needs.food + d.food); if (d.water) a.needs.water = Math.min(1, a.needs.water + d.water);
      a.lastMeal = world.tick; a.emotions.joy = Math.min(1, a.emotions.joy + 0.04);
      if (d.raw && world.rng.chance(0.02 * (1 - a.genes.physiology.immunity))) { a.injury = Math.min(0.9, a.injury + 0.15); a.emotions.stress += 0.1; this.memory(world, a, { type: 'illness', text: 'rosszul lettem a nyers ételtől', importance: 0.4, emotion: 'sadness', intensity: 0.4 }); }
      return true;
    },
    practice(a, skill, n = 1) { a.skills[skill] = Math.min(1, (a.skills[skill] || 0) + 0.0007 * n * (1 - (a.skills[skill] || 0))); },
    memory(world, a, m) { return LW.Memory.add(world, a, m); },

    // ---------------- knowledge of places (numeric keys: kind × 2^20 + tile index)
    POI_KINDS: ['water', 'food', 'wood', 'stone', 'flint', 'clay', 'animals', 'fish', 'deposit', 'fire'],
    poiKey(kind, idx) { return this.POI_KINDS.indexOf(kind) * 1048576 + idx; },
    knowsPlace(a, kind, idx) { return a.knowledge.places.has(this.poiKey(kind, idx)); },
    /** Places that turned out to be unreachable are avoided for a while. */
    avoidPlace(world, a, kind, idx, days = 3) { a.avoid = a.avoid || {}; a.avoid[this.poiKey(kind, idx)] = world.tick + days * TPD; this.forgetPlace(a, kind, idx); },
    isAvoided(world, a, key) { return !!(a.avoid && a.avoid[key] > world.tick); },
    rememberPlace(world, a, kind, idx, q) {
      const key = this.poiKey(kind, idx); const cur = a.knowledge.places.get(key);
      if (cur) { cur.q = q; cur.t = world.tick; return; }
      if (a.avoid && a.avoid[key] > world.tick) return;
      a.knowledge.places.set(key, { k: kind, i: idx, q, t: world.tick });
      const cap = world.cfg.agents.poiCap;
      // a víz és a lelőhely nem felejtődik el az idő múlásával, de csak a legközelebbi néhány tucat marad meg — különben a partvidék kiszorítaná az ételt a fejéből
      if (kind === 'water' || kind === 'deposit') { const capK = 36; let n = 0; for (const v of a.knowledge.places.values()) if (v.k === kind) n++; if (n > capK) { const same = []; for (const v of a.knowledge.places.values()) if (v.k === kind) same.push(v); same.sort((p, q) => LW.dist(a.x, a.y, world.xOf(q.i), world.yOf(q.i)) - LW.dist(a.x, a.y, world.xOf(p.i), world.yOf(p.i))); for (let k = 0; k < n - capK; k++) a.knowledge.places.delete(this.poiKey(kind, same[k].i)); } }
      if (a.knowledge.places.size > cap * 1.3) { // a többiből a régen látottak felejtődnek el
        const entries = [...a.knowledge.places.entries()].filter(([, v]) => v.k !== 'water' && v.k !== 'deposit').sort((x, y) => x[1].t - y[1].t);
        const drop = a.knowledge.places.size - cap; for (let k = 0; k < drop && k < entries.length; k++) a.knowledge.places.delete(entries[k][0]);
      }
    },
    forgetPlace(a, kind, idx) { a.knowledge.places.delete(this.poiKey(kind, idx)); },
    /** Nearest known place of a kind with quality ≥ minQ. Returns {i,x,y,q,d} or null. */
    nearestPoi(world, a, kind, minQ = 1, maxD = 1e9) {
      let best = null, bd = maxD;
      for (const v of a.knowledge.places.values()) { if (v.k !== kind || v.q < minQ) continue; const x = world.xOf(v.i), y = world.yOf(v.i); const d = LW.dist(a.x, a.y, x + 0.5, y + 0.5); if (d < bd) { bd = d; best = { i: v.i, x, y, q: v.q, d }; } }
      return best;
    },
    /** Passable tile next to `i` (for water/fish targets), preferring the side the agent is on. */
    tileNear(world, a, i) {
      if (world.isPassable(i)) return i; const x = world.xOf(i), y = world.yOf(i); let best = null, bd = 1e9;
      for (let r = 1; r <= 2; r++) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (!world.inBounds(nx, ny)) continue; const j = world.idx(nx, ny); if (!world.isPassable(j)) continue; const d = LW.dist(a.x, a.y, nx + 0.5, ny + 0.5); if (d < bd) { bd = d; best = j; } } if (best != null) return best; }
      return best;
    },
    knownCount(a, kind) { let n = 0; for (const v of a.knowledge.places.values()) if (v.k === kind && v.q > 0) n++; return n; },

    // ---------------- biology tick
    stepBiology(world, a) {
      const cfg = world.cfg.agents, rng = world.rng, dt = 1 / TPD;
      const st = this.stage(world, a); const child = st === 'infant' || st === 'child';
      const i = world.idx(a.x | 0, a.y | 0);
      const fx = LW.Buildings.effectsAt(world, a.x, a.y, a);
      a.env = fx;
      // needs
      const metab = a.genes.physiology.metabolism * (child ? 1.15 : 1) * (a.pregnancy ? 1.3 : 1) * (a.sleeping ? 0.6 : 1);
      a.needs.food = Math.max(0, a.needs.food - cfg.needDrainPerDay.food * metab * (st === 'infant' ? 0.7 : 1) * dt);
      const temp = world.tileTemp(i);
      a.needs.water = Math.max(0, a.needs.water - cfg.needDrainPerDay.water * (temp > 26 ? 1.4 : 1) * (a.sleeping ? 0.6 : 1) * (st === 'infant' ? 0.5 : 1) * dt);
      // infants are nursed by caregivers who are close by
      if (st === 'infant') { for (const cg of this.caregivers(world, a)) { if (LW.dist(a.x, a.y, cg.x, cg.y) <= 1.6) { if (cg.needs.food > 0.15) { a.needs.food = Math.max(a.needs.food, Math.min(1, cg.needs.food + 0.05)); } if (cg.needs.water > 0.1) a.needs.water = Math.max(a.needs.water, cg.needs.water); a.needs.safety = Math.max(a.needs.safety, 0.8); break; } } }
      if (a.sleeping) { const q = fx.inside ? LW.Buildings.def(fx.inside).sleep : (fx.fire ? 0.45 : 0.3); a.needs.energy = Math.min(1, a.needs.energy + 3.0 * (0.5 + q) * dt); }
      else a.needs.energy = Math.max(0, a.needs.energy - cfg.needDrainPerDay.energy * dt);
      // warmth
      let clothing = 0; for (const k in a.inv) { const it = LW.ITEMS[k]; if (it && it.warmth && a.inv[k] > 0 && it.warmth > clothing) clothing = it.warmth; } clothing += LW.Tech.fx(world, a).warmth;
      const cover = fx.inside ? 0 : Math.min(0.6, world.tiles.trees[i] / 255 * 0.7); // tree cover blunts rain and wind
      const huddle = fx.inside ? 0 : Math.min(4, world.agentsNear(a.x, a.y, 1.5, a.id).length * 2);
      const activity = a.sleeping ? 0 : 3;
      const eff = temp + fx.warmth + clothing + huddle + activity + (a.sleeping && fx.inside ? 2 : 0) - (world.rainAt(i) * (fx.inside ? 0 : 6 * (1 - cover))) - (world.weather.wind.speed * (fx.inside ? 0 : 4 * (1 - cover)));
      a.effTemp = eff;
      if (eff >= 8) a.needs.warmth = Math.min(1, a.needs.warmth + 1.5 * dt * (1 + (eff - 8) / 10));
      else a.needs.warmth = Math.max(0, a.needs.warmth - ((8 - eff) / 50) * dt);
      // safety
      const danger = this.dangerAt(world, a, i, fx);
      a.danger = danger;
      a.needs.safety += ((1 - danger) - a.needs.safety) * 0.08;
      if (!a.sleeping) { a.needs.social = Math.max(0, a.needs.social - cfg.needDrainPerDay.social * dt); if (!child) a.needs.affection = Math.max(0, a.needs.affection - cfg.needDrainPerDay.affection * dt); a.needs.curiosity = Math.max(0, a.needs.curiosity - cfg.needDrainPerDay.curiosity * a.personality.curiosity * dt); }
      // health
      let dh = 0;
      if (a.needs.food <= 0) dh -= cfg.starvationHealthPerDay * dt;
      if (a.needs.water <= 0) dh -= cfg.dehydrationHealthPerDay * dt;
      if (a.needs.warmth <= 0) dh -= cfg.hypothermiaHealthPerDay * (1 + Math.max(0, 5 - eff) / 10) * dt;
      if (world.tiles.fire[i]) { dh -= 0.15; a.emotions.fear = 1; }
      const maxHealth = Math.max(0.2, 1 - a.injury - Math.max(0, this.age(world, a) - a.genes.physiology.longevity - (LW.Tech.fx(world, a).longevity || 0) + 10) * 0.02);
      if (dh === 0 && a.needs.food > 0.35 && a.needs.water > 0.35 && a.needs.energy > 0.25) dh += 0.15 * dt * (a.knowledge.techs.has('herbal_medicine') ? 1.5 : 1);
      a.health = LW.clamp(a.health + dh, 0, maxHealth);
      if (a.injury > 0) a.injury = Math.max(0, a.injury - 0.05 * dt);
      // daily per-agent checks (spread by id)
      if ((world.tick + a.id) % TPD === 0) this.daily(world, a);
      // emotions decay toward baseline
      const E = a.emotions, P = a.personality;
      const base = { joy: 0.2 + P.optimism * 0.25, fear: 0.05 + (1 - P.bravery) * 0.05, stress: 0.05 };
      for (const k in E) { const b = base[k] || 0; const rate = k === 'grief' ? 0.0015 : k === 'love' ? 0.003 : 0.006; E[k] += (b - E[k]) * rate; if (E[k] < 0.001) E[k] = 0; }
      if (a.needs.food < 0.2 || a.needs.water < 0.2) E.stress = Math.min(1, E.stress + 0.01);
      if (a.needs.social < 0.15) E.loneliness = Math.min(1, E.loneliness + 0.004);
      if (a.health <= 0) this.die(world, a, a.needs.water <= 0 ? 'kiszáradás' : a.needs.food <= 0 ? 'éhezés' : a.needs.warmth <= 0 ? 'kihűlés' : world.tiles.fire[i] ? 'tűz' : a.injury > 0.5 ? 'sérülés' : 'betegség');
    },
    dangerAt(world, a, i, fx) {
      let d = 0; const t = world.tiles;
      if (world.burning.size) { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = (a.x | 0) + dx, y = (a.y | 0) + dy; if (!world.inBounds(x, y)) continue; if (t.fire[world.idx(x, y)]) d = Math.max(d, 1 - Math.max(Math.abs(dx), Math.abs(dy)) / 4); } }
      if (LW.Time.isNight(world.tick) && !fx.inside && !fx.fire) { const group = world.agentsNear(a.x, a.y, 2, a.id).length; d = Math.max(d, (t.danger[i] / 255) * 0.5 / (1 + group * 0.5)); }
      if (a.threat) d = Math.max(d, 0.7);
      const safe = LW.Tech.fx(world, a).safety || 0; if (safe > 0) d *= 1 - Math.min(0.7, safe * 0.4); // őrség, törvény, biztosítás: kevesebb a félnivaló
      return LW.clamp01(d);
    },
    daily(world, a) {
      const rng = world.rng, cfg = world.cfg.agents;
      this.spoil(world, a.inv, 1);
      LW.Relationships.decay(world, a);
      LW.Social.daily(world, a);
      // old age
      const tfx = LW.Tech.fx(world, a);
      const age = this.age(world, a); const lon = a.genes.physiology.longevity + (tfx.longevity || 0); // az orvoslás évekkel tolja ki az öregséget
      if (age > lon - 10 && rng.chance(0.00025 * Math.exp((age - lon) / 5))) { this.die(world, a, 'öregség'); return; }
      if (tfx.happiness) { const hp = tfx.happiness; a.emotions.joy = LW.clamp01(a.emotions.joy + 0.02 * hp); a.emotions.stress = LW.clamp01(a.emotions.stress - 0.02 * hp); a.emotions.sadness = LW.clamp01(a.emotions.sadness - 0.01 * hp); } // a kultúra, a jólét (vagy a hangos világ) napról napra formál
      // baseline illness
      if (rng.chance(0.0006 * (1 - a.genes.physiology.immunity * 0.7) * (a.needs.food < 0.3 ? 2 : 1) * (1 - 0.6 * Math.min(1, LW.Tech.fx(world, a).health)))) { a.injury = Math.min(0.8, a.injury + 0.3); a.emotions.stress += 0.2; a.ill = Math.max(a.ill || 0, rng.int(5, 14)); this.memory(world, a, { type: 'illness', text: 'megbetegedtem', importance: 0.4, emotion: 'fear', intensity: 0.4 }); world.events.emit('AgentIll', { tick: world.tick, agentId: a.id }); }
      LW.Mind.daily(world, a);
      // predators at night handled per tick; here: pregnancy & development
      if (a.pregnancy) { if (world.tick - a.pregnancy.since >= cfg.gestationDays * TPD) this.birth(world, a); else if (a.health < 0.3 && rng.chance(0.03)) { a.pregnancy = null; a.emotions.grief = Math.min(1, a.emotions.grief + 0.5); this.memory(world, a, { type: 'loss', text: 'elvesztettem a meg nem született gyermekem', importance: 0.8, emotion: 'grief', intensity: 0.8 }); } }
      const st = this.stage(world, a);
      if ((st === 'child' || st === 'adolescent') && LW.Time.dayOfYear(world.tick) % 30 === (a.id % 30)) LW.Genetics.develop(world, a, this.caregivers(world, a));
      if (LW.Time.dayOfYear(world.tick) === (a.id % 360)) { LW.Tech.forgetCheck(world, a); for (const s in a.skills) a.skills[s] = Math.max(0.02, a.skills[s] - 0.01); }
      // occupation label from counters (Phase 2 makes this richer)
      a.occupation = this.occupationLabel(world, a);
    },
    occupationLabel(world, a) {
      const st = this.stage(world, a); if (st === 'infant') return 'infant'; if (st === 'child') return 'child';
      const c = a.counters; const cand = [['gatherer', c.gathered], ['builder', c.built * 6], ['hunter', c.hunted || 0], ['crafter', (c.crafted || 0) * 3], ['explorer', (c.explored || 0)], ['tinkerer', c.experiments * 4], ['farmer', (c.farmed || 0) * 2], ['fisher', (c.fished || 0)]]; // ids; LW.HU.occupation() names them
      cand.sort((x, y) => y[1] - x[1]); return cand[0][1] > 5 ? cand[0][0] : (st === 'elder' ? 'elder' : 'forager');
    },
    damage(world, a, amount, cause) {
      a.injury = Math.min(0.95, a.injury + amount * 0.6); a.health = Math.max(0, a.health - amount); a.emotions.fear = Math.min(1, a.emotions.fear + amount); a.emotions.stress = Math.min(1, a.emotions.stress + amount * 0.5);
      world.events.emit('AgentInjured', { tick: world.tick, agentId: a.id, cause, amount });
      this.memory(world, a, { type: 'injury', text: `megsérültem: ${cause}`, importance: 0.5 + amount * 0.4, emotion: 'fear', intensity: 0.5 + amount * 0.5 });
      if (a.health <= 0) this.die(world, a, cause);
    },

    // ---------------- reproduction
    conceive(world, mother, father) {
      if (mother.pregnancy || mother.sex !== 'f' || father.sex !== 'm') return false;
      const age = this.age(world, mother); if (age < world.cfg.agents.adultAge || age > 45) return false;
      const blessed = (mother.fertilityBoostUntil > world.tick || father.fertilityBoostUntil > world.tick) ? 3 : 1;
      const p = world.cfg.agents.fertilityBase * blessed * Math.max(0.25, 1 + (LW.Tech.fx(world, mother).fertility || 0)) * mother.genes.physiology.fertility * father.genes.physiology.fertility * (mother.health > 0.5 ? 1 : 0.4) * (mother.needs.food > 0.3 ? 1 : 0.3) * (age > 38 ? 0.4 : 1) * (mother.children.some((c) => { const ch = world.agents.get(c); return ch && LW.Time.ageYears(ch.bornTick, world.tick) < 2.5; }) ? 0.12 : 1);
      if (!world.rng.chance(p)) return false;
      mother.pregnancy = { by: father.id, since: world.tick, fatherGenes: father.genes };
      world.events.emit('Pregnancy', { tick: world.tick, agentId: mother.id, fatherId: father.id });
      return true;
    },
    birth(world, mother) {
      const rng = world.rng; const pg = mother.pregnancy; mother.pregnancy = null;
      const father = world.agents.get(pg.by) || world.deceased.get(pg.by);
      const genes = LW.Genetics.inherit(rng, mother.genes, pg.fatherGenes || (father && father.genes) || mother.genes);
      const sex = rng.chance(0.5) ? 'f' : 'm';
      const namer = rng.chance(0.5) && father && world.agents.has(father.id) ? father : mother;
      const child = this.create(world, { name: world.language.person(sex, namer.personality.creativity), sex, x: mother.x, y: mother.y, genes, parents: [mother.id, pg.by], generation: mother.generation + 1 });
      child.needs.food = 0.8; child.needs.water = 0.8;
      if (rng.chance(world.cfg.agents.infantMortality * (2 - mother.health))) { child.health = 0.35; child.injury = 0.4; }
      mother.children.push(child.id); if (father && world.agents.has(father.id)) father.children.push(child.id);
      if (mother.home != null) { const b = world.buildings.get(mother.home); if (b) LW.Buildings.moveIn(world, b, child); }
      mother.health = Math.max(0.15, mother.health - 0.12 * (1 - mother.health * 0.5));
      // memories & emotions
      const first = !world.firsts || !world.firsts['born'];
      this.memory(world, mother, { type: 'birth', text: `világra hoztam őt: ${child.name}`, importance: 0.95, emotion: 'joy', intensity: 0.9, subjects: [child.id] });
      mother.emotions.joy = 1; mother.emotions.love = Math.min(1, mother.emotions.love + 0.6); mother.needs.affection = 1;
      if (father && world.agents.has(father.id)) { this.memory(world, father, { type: 'birth', text: `apa lettem: ${child.name}`, importance: 0.9, emotion: 'joy', intensity: 0.85, subjects: [child.id] }); father.emotions.joy = Math.min(1, father.emotions.joy + 0.7); father.emotions.pride = Math.min(1, father.emotions.pride + 0.5); }
      world.stats.births++;
      world.events.emit('AgentBorn', { tick: world.tick, agentId: child.id, motherId: mother.id, fatherId: pg.by, tile: world.idx(child.x | 0, child.y | 0), first });
      return child;
    },

    // ---------------- death
    die(world, a, cause) {
      if (!world.agents.has(a.id)) return;
      const tick = world.tick;
      const rec = { id: a.id, name: a.name, sex: a.sex, bornTick: a.bornTick, diedTick: tick, cause, parents: a.parents.slice(), children: a.children.slice(), partner: a.partner, achievements: a.achievements.slice(), genes: a.genes, palette: a.palette, generation: a.generation, genesis: a.genesis, occupation: a.occupation, importance: a.importance, deathTile: world.idx(a.x | 0, a.y | 0) };
      world.deceased.set(a.id, rec);
      // drop inventory
      const i = world.idx(a.x | 0, a.y | 0); world.ground = world.ground || new Map(); const g = world.ground.get(i) || {}; for (const k in a.inv) g[k] = (g[k] || 0) + a.inv[k]; if (Object.keys(g).length) world.ground.set(i, g);
      // home & property
      LW.Buildings.moveOut(world, a);
      const heir = (a.partner != null && world.agents.get(a.partner)) || a.children.map((c) => world.agents.get(c)).find((c) => c) || null;
      LW.Buildings.transferOwnership(world, a, heir ? heir.id : null);
      // loved ones grieve
      for (const o of world.agents.values()) {
        if (o.id === a.id) continue;
        const r = o.relationships.get(a.id); const kin = o.parents.includes(a.id) || a.parents.includes(o.id) || o.partner === a.id;
        const close = kin ? 1 : r ? Math.max(r.friendship, r.romance, r.attraction * 0.5) : 0;
        if (close > 0.25) { o.emotions.grief = Math.min(1, o.emotions.grief + close * 0.9); o.emotions.sadness = Math.min(1, o.emotions.sadness + close * 0.6); this.memory(world, o, { type: 'death', text: `${a.name} meghalt: ${cause}`, importance: 0.6 + close * 0.35, emotion: 'grief', intensity: close, subjects: [a.id] }); }
        if (o.partner === a.id) { o.partner = null; if (r) r.status = 'widowed'; }
        if (o.plan && o.plan.target === a.id) o.plan = null;
      }
      world.removeAgent(a.id); world.stats.deaths++;
      world.events.emit('AgentDied', { tick, agentId: a.id, cause, tile: i, age: this.age(world, a), first: !world.firsts || !world.firsts['death'] });
    },

    /** Compact public summary for UI lists. */
    summary(world, a) { return { id: a.id, name: a.name, age: Math.floor(this.age(world, a)), stage: this.stage(world, a), health: a.health, occupation: a.occupation }; },
  };

  LW.Agents = Agents;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/perception.js ===== */
/* LEVENTE — THE CREATOR · agents/perception.js — agents only know what they have seen, heard or been told (spec §20) */
(function (LW) {
  'use strict';
  const B = LW.BIOME, DEP = LW.DEPOSIT;

  const Perception = {
    scan(world, a) {
      const t = world.tiles, A = LW.Agents; const cx = a.x | 0, cy = a.y | 0;
      let R = world.cfg.agents.perceptionRadius;
      const night = LW.Time.isNight(world.tick); const wx = world.weather.effectiveState();
      if (night && !(a.env && a.env.light > 0)) R = Math.max(2, Math.round(R * 0.5));
      if (wx.state === 'fog' || wx.state === 'storm') R = Math.max(2, Math.round(R * 0.7));
      if (t.biome[world.idx(cx, cy)] === B.HILLS) R = Math.round(R * 1.3);
      let sawFire = false, sawClay = false, foundDeposit = null;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x = cx + dx, y = cy + dy; if (!world.inBounds(x, y)) continue;
        if (dx * dx + dy * dy > R * R) continue;
        const i = world.idx(x, y), b = t.biome[i];
        if (LW.isFreshBiome(b)) { A.rememberPlace(world, a, 'water', i, 255); if (t.fish[i] >= 25) A.rememberPlace(world, a, 'fish', i, t.fish[i]); else A.forgetPlace(a, 'fish', i); continue; }
        if (b === B.OCEAN) { if (t.fish[i] >= 40) A.rememberPlace(world, a, 'fish', i, t.fish[i]); continue; }
        if (t.veg[i] >= 12) A.rememberPlace(world, a, 'food', i, t.veg[i]); else if (A.knowsPlace(a, 'food', i)) A.forgetPlace(a, 'food', i);
        if (t.trees[i] >= 15) A.rememberPlace(world, a, 'wood', i, t.trees[i]); else if (A.knowsPlace(a, 'wood', i)) A.forgetPlace(a, 'wood', i);
        if (t.stone[i] >= 20) { A.rememberPlace(world, a, 'stone', i, t.stone[i]); if (t.stone[i] >= 70 && (b === B.HILLS || b === B.MOUNTAIN || b === B.BEACH) && !t.depType[i]) A.rememberPlace(world, a, 'flint', i, t.stone[i] >> 1); }
        if (t.animals[i] >= 25) A.rememberPlace(world, a, 'animals', i, t.animals[i]); else if (A.knowsPlace(a, 'animals', i)) A.forgetPlace(a, 'animals', i);
        if (t.depType[i] && !t.depKnown[i] && Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && world.rng.chance(0.02 * (0.5 + a.personality.curiosity) * (a.knowledge.techs.has('digging') ? 3 : 1))) { t.depKnown[i] = 1; world.dirtyTiles.add(i); } // közelről feltűnik a furcsa kő
        if (t.depType[i] && t.depKnown[i] >= 1) {
          const dt = t.depType[i];
          if (dt === DEP.FLINT) A.rememberPlace(world, a, 'flint', i, Math.min(255, t.depAmt[i]));
          else if (dt === DEP.CLAY) { A.rememberPlace(world, a, 'clay', i, Math.min(255, t.depAmt[i])); sawClay = true; }
          else { A.rememberPlace(world, a, 'deposit', i, dt); if (!a.knowledge.techs.has('ore_lore_' + LW.DEPOSIT_NAME[dt]) && ['copper', 'tin', 'iron', 'coal', 'gold'].includes(LW.DEPOSIT_NAME[dt]) && Math.abs(dx) <= 1 && Math.abs(dy) <= 1) foundDeposit = { i, dt }; }
        }
        if (b === B.MARSH && Math.abs(dx) <= 2 && Math.abs(dy) <= 2) { A.rememberPlace(world, a, 'clay', i, 80); sawClay = true; }
        if (t.fire[i]) { sawFire = true; A.rememberPlace(world, a, 'fire', i, t.fire[i]); }
      }
      // smoke from a wildfire is visible from far away
      if (world.burning.size && !sawFire) { for (const fi of world.burning) { if (t.fire[fi] > 80 && Math.abs(world.xOf(fi) - cx) <= 24 && Math.abs(world.yOf(fi) - cy) <= 24) { sawFire = true; break; } } }
      // fire buildings & landmarks nearby
      for (const bld of world.buildingsNear(cx, cy, R)) {
        if (bld.kind === 'campfire' && bld.lit) sawFire = true;
        const def = LW.Buildings.def(bld);
        if (def.divine && !a.memory.episodic.some((m) => m.buildingId === bld.id)) LW.God.witnessManifestation(world, a, bld);
      }
      if (sawFire) { if (LW.Tech.observe(world, a, 'fire')) { A.memory(world, a, { type: 'phenomenon', text: 'először láttam tüzet', importance: 0.85, emotion: 'fear', intensity: 0.7 }); a.emotions.fear = Math.min(1, a.emotions.fear + 0.3); a.emotions.excitement = Math.min(1, a.emotions.excitement + 0.5); } }
      if (sawClay) LW.Tech.observe(world, a, 'clay');
      if (foundDeposit && a.knowledge.techs.has('digging')) { LW.Tech.learn(world, a, 'ore_lore_' + LW.DEPOSIT_NAME[foundDeposit.dt], 'observation'); world.events.emit('ResourceFound', { tick: world.tick, agentId: a.id, tile: foundDeposit.i, deposit: LW.DEPOSIT_NAME[foundDeposit.dt], first: !world.firsts || !world.firsts['deposit:' + LW.DEPOSIT_NAME[foundDeposit.dt]] }); A.memory(world, a, { type: 'find', text: `találtam: ${LW.ITEMS[LW.DEPOSIT_ITEM[foundDeposit.dt]].label.toLowerCase()}`, importance: 0.6, emotion: 'excitement', intensity: 0.5 }); }
      // other people
      a.threat = null;
      const others = world.agentsNear(a.x, a.y, R, a.id);
      for (const o of others) {
        const r = LW.Relationships.ensure(world, a, o); const s = LW.Memory.social(a, o.id); s.lastSeen = world.tick; s.lastTile = world.idx(o.x | 0, o.y | 0);
        if (r.familiarity < 1) r.familiarity = Math.min(1, r.familiarity + 0.002);
        // learning by watching (children especially)
        if (o.plan && o.plan.tag && LW.dist(a.x, a.y, o.x, o.y) <= 3) this.observePractice(world, a, o, o.plan.tag);
        // jealousy: partner flirting with someone else
        if (a.partner === o.id && o.plan && o.plan.goal === 'flirt' && o.plan.target !== a.id) { const rival = world.agents.get(o.plan.target); if (rival) { r.jealousy = Math.min(1, r.jealousy + 0.25); r.resentment = Math.min(1, r.resentment + 0.1 * (1 - a.personality.patience)); const rr = LW.Relationships.ensure(world, a, rival); rr.resentment = Math.min(1, rr.resentment + 0.15); a.emotions.jealousy = Math.min(1, a.emotions.jealousy + 0.4); a.emotions.anger = Math.min(1, a.emotions.anger + 0.2 * a.personality.aggression); A.memory(world, a, { type: 'jealousy', text: `láttam, ahogy ${o.name} flörtöl vele: ${rival.name}`, importance: 0.6, emotion: 'jealousy', intensity: 0.6, subjects: [o.id, rival.id] }); } }
        if (r.fear > 0.5 || (o.emotions.anger > 0.7 && (o.relationships.get(a.id)?.resentment || 0) > 0.5)) a.threat = o.id;
      }
    },
    observePractice(world, a, o, tag) {
      const kind = tag.split(':')[0];
      const skill = { gather: 'gathering', hunt: 'hunting', fish: 'hunting', craft: 'crafting', build: 'building', dig: 'gathering', experiment: 'crafting', farm: 'farming' }[kind];
      if (skill && world.rng.chance(0.15)) LW.Agents.practice(a, skill, 0.5);
      // watching a demonstration of a technology the watcher doesn't know
      const tech = o.plan.tech || (kind === 'craft' && LW.Tech.RECIPES[tag.split(':')[1]] && LW.Tech.RECIPES[tag.split(':')[1]].tech) || (kind === 'build' && LW.Buildings.DEFS[o.plan.kind] && LW.Buildings.DEFS[o.plan.kind].tech);
      if (tech && !a.knowledge.techs.has(tech) && !LW.Tech.D[tech].hidden) {
        const prereqOk = !LW.Tech.D[tech].prereq || LW.Tech.D[tech].prereq.every((p) => a.knowledge.techs.has(p));
        if (o.knowledge.techs.has(tech)) { // a real demonstration by someone who knows
          const gain = 0.05 * (0.5 + a.personality.intelligence) * (LW.Agents.isChild(world, a) ? 1.5 : 1);
          a.knowledge.progress[tech] = (a.knowledge.progress[tech] || 0) + gain;
          if (a.knowledge.progress[tech] >= 1 && prereqOk) LW.Tech.learn(world, a, tech, 'observed_practice', o);
        } else { // watching someone *try* only plants the idea
          a.knowledge.progress[tech] = Math.min(0.5, (a.knowledge.progress[tech] || 0) + 0.01);
        }
      }
    },
  };
  LW.Perception = Perception;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/brain.js ===== */
/* LEVENTE — THE CREATOR · agents/brain.js
 * Utility AI: every candidate goal gets a score from needs × personality × emotion ×
 * context (+ small noise); the best becomes a plan of steps. Every decision keeps a
 * WHY record (spec §93–§94). (AGENT_MODEL.md §3)
 */
(function (LW) {
  'use strict';
  const A = () => LW.Agents, Bld = () => LW.Buildings;
  const u = (x) => { const d = 1 - x; return d * d; };

  function context(world, a) {
    const i = world.idx(a.x | 0, a.y | 0);
    const fx = a.env || Bld().effectsAt(world, a.x, a.y, a);
    const stage = A().stage(world, a);
    const home = a.home != null ? world.buildings.get(a.home) : null;
    const ctx = {
      world, tick: world.tick, i, night: LW.Time.isNight(world.tick), season: LW.Time.season(world.tick), stage, adult: stage === 'adult' || stage === 'elder', child: stage === 'child' || stage === 'adolescent', infant: stage === 'infant',
      temp: world.tileTemp(i), effTemp: a.effTemp ?? world.tileTemp(i), rain: world.rainAt(i), storm: world.weather.effectiveState().state === 'storm', fx, home, danger: a.danger || 0,
      nearby: world.agentsNear(a.x, a.y, 10, a.id), household: A().household(world, a),
      water: A().nearestPoi(world, a, 'water'), food: A().nearestPoi(world, a, 'food', 20), animals: A().nearestPoi(world, a, 'animals', 30), fish: A().nearestPoi(world, a, 'fish', 30),
      fire: nearestFire(world, a, 20), shelter: Bld().shelterFor(world, a),
      foodInv: A().foodInInventory(a), foodUnits: A().foodUnits(a.inv),
    };
    ctx.storeFood = home && home.storage ? A().foodUnits(home.storage) : 0;
    return ctx;
  }
  function nearestFire(world, a, maxD) { let best = null, bd = maxD; for (const b of world.buildingsNear(a.x | 0, a.y | 0, maxD)) { if (b.kind !== 'campfire' || !b.lit || b.progress < 1) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }
  /** Legközelebbi kész épület egy fajtából vagy tulajdonságból (pl. 'furnace' = kemence/olvasztó/kovács). */
  function nearestBuilding(world, a, what, maxD) { let best = null, bd = maxD || 24; const DEFS = Bld().DEFS; for (const b of world.buildingsNear(a.x | 0, a.y | 0, bd)) { if (b.progress < 1) continue; const def = DEFS[b.kind]; if (!(b.kind === what || (def && def[what]))) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }
  function needsBuilding(nearby) { return nearby && nearby !== 'fire' && nearby !== 'water'; }
  function bestDwelling(a) { const DEFS = Bld().DEFS; let best = null, bt = 0; for (const k in DEFS) { const d = DEFS[k]; if (!d.dwelling || !d.tier || (d.tech && !a.knowledge.techs.has(d.tech))) continue; if (d.tier > bt) { bt = d.tier; best = k; } } return best; }
  let _tileNearAgent = null;
  function tileNear(world, i) { return A().tileNear(world, _tileNearAgent, i); }
  /** Steps that acquire `need` = {item: qty} from the world using the agent's knowledge. Returns null if impossible. */
  function acquireSteps(world, a, need, ctx, depth) {
    const steps = []; depth = depth || 0;
    for (const item in need) {
      const q = need[item]; const src = LW.Tech.SOURCE[item];
      if (!src || src === 'store') { const ps = LW.Tree.publicStore(world, a, item, 20); if (ps && ps.storage[item] >= Math.min(q, 2)) { steps.push({ op: 'moveTo', i: world.idx(ps.x, ps.y), near: 1.5 }); steps.push({ op: 'take', bid: ps.id, item, n: q }); continue; } } // a közös raktárból
      if (!src) { // nincs a világban: talán meg lehet csinálni (recept-lánc, legfeljebb 2 mélységig)
        const R = LW.Tech.RECIPES[item]; if (!R || depth >= 2 || !a.knowledge.techs.has(R.tech)) return null;
        let inp = R.inp; if (R.inpAny) inp = R.inpAny.find((o) => count(missingFor(a, o)) === 0) || R.inpAny[0];
        const m = missingFor(a, inp); const sub = count(m) ? acquireSteps(world, a, m, ctx, depth + 1) : []; if (!sub) return null;
        steps.push(...sub);
        if (R.nearby === 'fire') { if (!ctx.fire) return null; steps.push({ op: 'moveTo', i: world.idx(ctx.fire.x, ctx.fire.y), near: 1 }); }
        else if (needsBuilding(R.nearby)) { const nb = nearestBuilding(world, a, R.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: world.idx(nb.x, nb.y), near: 1.5 }); }
        const times = Math.max(1, Math.ceil(q / (R.out[item] || 1))); for (let k = 0; k < Math.min(times, 3); k++) steps.push({ op: 'craft', recipe: item, needed: true });
        continue;
      }
      if (src === 'store') { const home = a.home != null ? world.buildings.get(a.home) : null; if (!home || !home.storage || (home.storage[item] || 0) < q) return null; steps.push({ op: 'moveTo', i: world.idx(home.x, home.y), near: 1 }); steps.push({ op: 'take', bid: home.id, item, n: q }); continue; }
      if (src.startsWith('deposit:')) { const dt = LW.DEPOSIT[src.slice(8).toUpperCase()]; let best = null, bd = 1e9; for (const p of a.knowledge.places.values()) { if (p.k !== 'deposit' || p.q !== dt) continue; const d = LW.dist(a.x, a.y, world.xOf(p.i), world.yOf(p.i)); if (d < bd) { bd = d; best = p; } } if (!best || !a.knowledge.techs.has('digging')) return null; if (dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling')) return null; const tg = tileNear(world, best.i); if (tg == null) return null; steps.push({ op: 'moveTo', i: tg, near: 1 }); steps.push({ op: 'dig', i: best.i, n: 8, item, needed: true }); if (q > 2) steps.push({ op: 'dig', i: best.i, n: 8, item, needed: true }); continue; }
      let poi = null, op = 'gather';
      if (src === 'food') poi = A().nearestPoi(world, a, 'food', 20);
      else if (src === 'fiber') { poi = A().nearestPoi(world, a, 'food', 12) || A().nearestPoi(world, a, 'wood', 12); }
      else if (src === 'animals') { if (!a.inv.spear) return null; poi = ctx.animals; op = 'hunt'; }
      else if (src === 'fish') { if (!a.knowledge.techs.has('fishing')) return null; poi = ctx.fish; op = 'fish'; }
      else poi = A().nearestPoi(world, a, src, 1);
      if (!poi) return null;
      const target = tileNear(world, poi.i); if (target == null) return null;
      steps.push({ op: 'moveTo', i: target, poi: { k: src === 'fiber' ? 'food' : src, i: poi.i } }); steps.push({ op, i: poi.i, item, n: q, needed: true });
    }
    return steps;
  }
  function missingFor(a, need) { const m = {}; for (const k in need) { const h = a.inv[k] || 0; if (h < need[k]) m[k] = need[k] - h; } return m; }
  const count = (m) => { let c = 0; for (const k in m) c += m[k]; return c; };
  const P = (a) => a.personality, E = (a) => a.emotions, N = (a) => a.needs;

  /** Goal catalogue. Each: applicable(ctx,a) → bool; score(ctx,a) → [score, factors]; plan(ctx,a) → plan | null */
  const GOALS = {
    flee: {
      applicable: (c, a) => c.danger > 0.3,
      score: (c, a) => [2.5 * c.danger * (1 + E(a).fear), [`veszély ${LW.pct(c.danger)}`, `félelem ${LW.pct(E(a).fear)}`]],
      plan: (c, a) => ({ steps: [{ op: 'flee', n: 10 }], priority: 3 }),
    },
    divine: {
      applicable: (c, a) => !!a.divineRequest,
      score: (c, a) => LW.God.scoreRequest(c.world, a),
      plan: (c, a) => LW.God.planRequest(c.world, a),
    },
    eat: {
      applicable: (c, a) => !c.infant && N(a).food < 0.8,
      score: (c, a) => { let s = u(N(a).food) * 1.6 + (N(a).food < 0.1 ? 0.8 : 0); const f = []; f.push(`éhség ${LW.pct(1 - N(a).food)}`); if (c.foodInv) { s += N(a).food < 0.5 ? 0.5 : 0.2; f.push('van nála étel'); } else if (c.storeFood > 0 && c.home) { s += 0.3; f.push('otthon van étel'); } else if (!c.food && !(a.inv.spear && c.animals) && !(c.fish && a.knowledge.techs.has('fishing'))) { s *= 0.3; f.push('nem ismer ételforrást'); } return [s, f]; },
      plan: (c, a) => {
        if (c.foodInv) return { steps: [{ op: 'consume' }] };
        if (c.storeFood > 0 && c.home) return { steps: [{ op: 'moveTo', i: c.world.idx(c.home.x, c.home.y) }, { op: 'takeFood', bid: c.home.id }, { op: 'consume' }] };
        const g = c.world.ground && nearestGroundFood(c.world, a, 8); if (g) return { steps: [{ op: 'moveTo', i: g }, { op: 'pickup', i: g }, { op: 'consume' }] };
        const opts = [];
        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i, poi: { k: 'food', i: c.food.i } }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.4) ? 'roots' : 'berries', n: 4, direct: true }], tag: 'gather:berries' });
        if (a.inv.spear && c.animals) opts.push({ d: c.animals.d * 0.8, steps: [{ op: 'moveTo', i: c.animals.i, poi: { k: 'animals', i: c.animals.i } }, { op: 'hunt', i: c.animals.i, item: 'meat_raw', n: 2 }, { op: 'consume' }], tag: 'hunt:animals' });
        if (c.fish && a.knowledge.techs.has('fishing')) { const t = tileNear(c.world, c.fish.i); if (t != null) opts.push({ d: c.fish.d * 0.9, steps: [{ op: 'moveTo', i: t, poi: { k: 'fish', i: c.fish.i } }, { op: 'fish', i: c.fish.i, item: 'fish_raw', n: 2 }, { op: 'consume' }], tag: 'fish:fish' }); }
        if (!opts.length) return null; opts.sort((x, y) => x.d - y.d); return { steps: opts[0].steps, tag: opts[0].tag };
      },
    },
    drink: {
      applicable: (c, a) => !c.infant && N(a).water < 0.75 && !!c.water,
      score: (c, a) => [u(N(a).water) * 2.4 + (N(a).water < 0.4 ? 0.5 : 0) + (c.water.d < 6 ? 0.2 : 0), [`szomj ${LW.pct(1 - N(a).water)}`, `víz ${Math.round(c.water.d)} mezőre`]],
      plan: (c, a) => { const t = tileNear(c.world, c.water.i); return t == null ? null : { steps: [{ op: 'moveTo', i: t, poi: { k: 'water', i: c.water.i } }, { op: 'drink', i: c.water.i }] }; },
    },
    sleep: {
      applicable: (c, a) => N(a).energy < 0.7 || (c.night && N(a).energy < 0.9),
      score: (c, a) => { let s = u(N(a).energy) * 1.3 * (c.night ? 1.7 : 0.5) + (N(a).energy < 0.1 ? 1.5 : 0); if (c.night && N(a).energy < 0.6) s += 0.4; if (E(a).grief > 0.3) s += 0.2; const f = [`fáradtság ${LW.pct(1 - N(a).energy)}`, c.night ? 'éjszaka' : 'nappal']; if (N(a).food < 0.12 && (c.foodInv || c.food || c.storeFood > 0)) { s *= 0.4; f.push('túl éhes az alváshoz'); } else if (N(a).food < 0.3 && c.foodInv) { s *= 0.6; f.push('előbb eszik'); } if (N(a).water < 0.12 && c.water) { s *= 0.3; f.push('túl szomjas az alváshoz'); } else if (N(a).water < 0.42 && c.water && c.water.d < 12) { s *= 0.5; f.push('előbb iszik'); } return [s, f]; },
      plan: (c, a) => { const sh = c.shelter; if (sh && LW.dist(a.x, a.y, sh.x, sh.y) < 30) return { steps: [{ op: 'moveTo', i: c.world.idx(sh.x, sh.y) }, { op: 'sleep', bid: sh.id }], priority: 1 }; if (c.fire && LW.dist(a.x, a.y, c.fire.x, c.fire.y) < 20) return { steps: [{ op: 'moveTo', i: c.world.randomNear(c.fire.x, c.fire.y, 1) }, { op: 'sleep' }], priority: 1 }; return { steps: [{ op: 'sleep' }], priority: 1 }; },
    },
    getWarm: {
      applicable: (c, a) => !c.infant && (N(a).warmth < 0.75 || (c.rain > 0.3 && !c.fx.inside) || c.storm),
      score: (c, a) => { let s = u(N(a).warmth) * 1.7; const f = [`hideg ${LW.pct(1 - N(a).warmth)}`, `érzett ${Math.round(c.effTemp)} °C`]; if (c.rain > 0.3 && !c.fx.inside) { s += c.rain * 0.7; f.push(`eső ${LW.pct(c.rain)}`); } if (c.storm && !c.fx.inside) { s += 0.6; f.push('vihar'); } if (c.fx.inside || c.fx.fire) s *= 0.15; return [s, f]; },
      plan: (c, a) => {
        const opts = [];
        if (c.shelter) opts.push({ d: LW.dist(a.x, a.y, c.shelter.x, c.shelter.y), steps: [{ op: 'moveTo', i: c.world.idx(c.shelter.x, c.shelter.y) }, { op: 'wait', n: 8, at: 'shelter' }] });
        if (c.fire) opts.push({ d: LW.dist(a.x, a.y, c.fire.x, c.fire.y) + 1, steps: [{ op: 'moveTo', i: c.world.randomNear(c.fire.x, c.fire.y, 1) }, { op: 'wait', n: 8, at: 'fire' }] });
        opts.sort((x, y) => x.d - y.d);
        if (opts.length && opts[0].d < 25) { opts[0].steps[opts[0].steps.length - 1].n = N(a).warmth < 0.3 ? 24 : 12; return { steps: opts[0].steps }; }
        if (a.knowledge.techs.has('fire_making')) { const p = GOALS.makeFire.plan(c, a); if (p) return p; }
        if (opts.length) return { steps: opts[0].steps };
        // no fire, no shelter: huddle with others under the trees
        const others = c.nearby.filter((o) => !o.sleeping || true); let best = null, bd = 16; for (const o of others) { const d = LW.dist(a.x, a.y, o.x, o.y); if (d < bd && d > 1) { bd = d; best = o; } }
        const wood = A().nearestPoi(c.world, a, 'wood', 110, 10);
        const steps = [];
        if (best) steps.push({ op: 'moveTo', i: c.world.idx(best.x | 0, best.y | 0), near: 1 }); else if (wood) steps.push({ op: 'moveTo', i: wood.i, poi: { k: 'wood', i: wood.i } });
        steps.push({ op: 'wait', n: 8, at: 'huddling' }); return { steps };
      },
    },
    careForChild: {
      applicable: (c, a) => c.adult && a.children.length > 0,
      score: (c, a) => { let best = 0, who = null; for (const cid of a.children) { const ch = c.world.agents.get(cid); if (!ch || !A().isChild(c.world, ch)) continue; const st = A().stage(c.world, ch); const d = LW.dist(a.x, a.y, ch.x, ch.y); let s = 0; if (st === 'infant') { if (d > 3) s = 0.9 + Math.min(1, d / 10); } else if (N(ch).food < 0.45) s = u(N(ch).food) * 1.8 * (0.5 + P(a).empathy); if (N(ch).water < 0.3 && st === 'infant') s += 0.5; if (s > best) { best = s; who = ch; } } a._careTarget = who; return [best, who ? [`${who.name} étele ${LW.pct(N(who).food)}`] : []]; },
      plan: (c, a) => { const ch = a._careTarget; if (!ch) return null; const st = A().stage(c.world, ch); if (st === 'infant' && N(ch).food >= 0.45) return { steps: [{ op: 'moveTo', i: c.world.idx(ch.x | 0, ch.y | 0) }, { op: 'wait', n: 6, at: 'child' }], target: ch.id }; if (c.foodInv) return { steps: [{ op: 'moveTo', i: c.world.idx(ch.x | 0, ch.y | 0) }, { op: 'give', target: ch.id, item: c.foodInv, n: 2 }], target: ch.id }; if (c.storeFood > 0 && c.home) return { steps: [{ op: 'moveTo', i: c.world.idx(c.home.x, c.home.y) }, { op: 'takeFood', bid: c.home.id, n: 3 }, { op: 'moveTo', i: c.world.idx(ch.x | 0, ch.y | 0) }, { op: 'give', target: ch.id, item: '*food', n: 2 }], target: ch.id }; const acq = acquireSteps(c.world, a, { berries: 4 }, c); if (!acq) return null; return { steps: [...acq, { op: 'moveTo', i: c.world.idx(ch.x | 0, ch.y | 0) }, { op: 'give', target: ch.id, item: '*food', n: 2 }], target: ch.id, tag: 'gather:berries' }; },
    },
    shareFood: {
      applicable: (c, a) => c.adult && !!c.foodInv && (a.inv[c.foodInv] || 0) >= 2,
      score: (c, a) => { let best = 0, who = null; for (const o of c.nearby) { if (N(o).food > 0.3 || A().stage(c.world, o) === 'infant') continue; const r = a.relationships.get(o.id); const close = c.household.includes(o) ? 1 : r ? Math.max(r.friendship, r.romance, r.loyalty * 0.8) : 0.1; const s = u(N(o).food) * (0.4 + P(a).empathy) * (0.3 + close) * (1 - P(a).greed * 0.5); if (s > best) { best = s; who = o; } } a._shareTarget = who; return [best, who ? [`${who.name} éhes`, `együttérzés ${LW.pct(P(a).empathy)}`] : []]; },
      plan: (c, a) => a._shareTarget ? { steps: [{ op: 'moveTo', i: c.world.idx(a._shareTarget.x | 0, a._shareTarget.y | 0) }, { op: 'give', target: a._shareTarget.id, item: c.foodInv, n: 1 }], target: a._shareTarget.id } : null,
    },
    followParent: {
      applicable: (c, a) => (c.infant || c.stage === 'child') && A().caregivers(c.world, a).length > 0,
      score: (c, a) => { const cg = A().caregivers(c.world, a); let d = 1e9, who = null; for (const p of cg) { const dd = LW.dist(a.x, a.y, p.x, p.y); if (dd < d) { d = dd; who = p; } } a._follow = who; const far = d > (c.infant ? 2 : 5); return [far ? 0.9 + Math.min(1, d / 12) + u(N(a).safety) * 0.5 : 0.05, [`szülő ${Math.round(d)} mezőre`]]; },
      plan: (c, a) => a._follow ? { steps: [{ op: 'follow', target: a._follow.id, n: 12 }], target: a._follow.id } : null,
    },
    socialize: {
      applicable: (c, a) => !c.infant && N(a).social < 0.85 && (c.nearby.length > 0 || N(a).social < 0.5),
      score: (c, a) => { let best = 0, who = null; for (const o of c.nearby) { if (A().stage(c.world, o) === 'infant' || o.sleeping) continue; const r = a.relationships.get(o.id); if (r && c.tick - r.last < 20) continue; const aff = r ? 0.3 + r.friendship * 0.7 + (r.status === 'family' ? 0.3 : 0) + (a.partner === o.id ? 0.4 : 0) - r.resentment : 0.35; const d = LW.dist(a.x, a.y, o.x, o.y); const s = u(N(a).social) * 0.95 * (0.5 + P(a).sociability) * Math.max(0.1, aff) * (1 - d / 25); if (s > best) { best = s; who = o; } } a._socialTarget = who; a._socialSeek = null;
        if (!who && N(a).social < 0.5 && N(a).water > 0.45 && N(a).food > 0.35) { // senki sincs a közelben: elindul oda, ahol utoljára látott valakit, akit ismer
          let seek = null, bs = 0; for (const [id, m] of a.memory.social) { if (m.lastTile < 0 || !c.world.agents.has(id) || c.tick - m.lastSeen > LW.TIME.TICKS_PER_DAY * 30) continue; const o = c.world.agents.get(id); const r = a.relationships.get(id); const aff = r ? 0.3 + r.friendship * 0.7 + (a.partner === id ? 0.5 : 0) - r.resentment : 0.3; const d = LW.dist(a.x, a.y, c.world.xOf(m.lastTile), c.world.yOf(m.lastTile)); if (d < 2 || d > 60) continue; const s = aff * (1 - d / 80); if (s > bs) { bs = s; seek = { id, tile: m.lastTile, name: o.name }; } }
          if (seek) { a._socialSeek = seek; return [u(N(a).social) * 0.8 * (0.5 + P(a).sociability) * Math.max(0.3, bs * 2) + E(a).loneliness * 0.3, [`magány ${LW.pct(1 - N(a).social)}`, `keresi: ${seek.name}`]]; }
        }
        return [best + (E(a).loneliness * 0.3), who ? [`magány ${LW.pct(1 - N(a).social)}`, `vele: ${who.name}`] : []]; },
      plan: (c, a) => a._socialTarget ? { steps: [{ op: 'moveTo', i: c.world.idx(a._socialTarget.x | 0, a._socialTarget.y | 0), near: 1 }, { op: 'interact', target: a._socialTarget.id, kind: 'converse', n: 4 }], target: a._socialTarget.id } : a._socialSeek ? { steps: [{ op: 'moveTo', i: a._socialSeek.tile, near: 2 }], tag: 'seek:people' } : null,
    },
    flirt: {
      applicable: (c, a) => c.adult && c.nearby.length > 0,
      score: (c, a) => {
        let best = 0, who = null;
        for (const o of c.nearby) {
          if (!A().isAdult(c.world, o) || o.sleeping) continue; const r = LW.Relationships.ensure(c.world, a, o); if (r.attraction < 0.3 || (r.status === 'family' && LW.Relationships.kinship(c.world, a, o) >= 0.9)) continue; if (r.lastFlirt != null && c.tick - r.lastFlirt < 40) continue;
          const single = a.partner == null; const oSingle = o.partner == null || o.partner === a.id;
          let s = r.attraction * (0.5 + u(N(a).affection)) * (single ? 1 : (1 - P(a).loyalty) * 0.25) * (oSingle ? 1 : 0.3) * (0.6 + P(a).sociability * 0.4) * (E(a).joy > 0.2 ? 1 : 0.7);
          if (a.partner === o.id) s *= 0.5; if (r.resentment > 0.3) s *= 0.3; if (E(a).shame > 0.4) s *= 0.5;
          s *= 1 - LW.dist(a.x, a.y, o.x, o.y) / 30;
          if (s > best) { best = s; who = o; }
        }
        a._flirtTarget = who; return [best, who ? [`vonzalom (${who.name}) ${LW.pct(a.relationships.get(who.id).attraction)}`, `gyengédségigény ${LW.pct(1 - N(a).affection)}`] : []];
      },
      plan: (c, a) => a._flirtTarget ? { steps: [{ op: 'moveTo', i: c.world.idx(a._flirtTarget.x | 0, a._flirtTarget.y | 0), near: 1 }, { op: 'interact', target: a._flirtTarget.id, kind: 'flirt', n: 4 }], target: a._flirtTarget.id } : null,
    },
    mate: {
      applicable: (c, a) => c.adult && a.partner != null && c.world.agents.has(a.partner),
      score: (c, a) => { const p = c.world.agents.get(a.partner); const r = a.relationships.get(p.id); if (!r || p.sleeping && !c.night) return [0, []]; const d = LW.dist(a.x, a.y, p.x, p.y); let s = (u(N(a).affection) * 0.9 + E(a).love * 0.4) * (0.4 + r.attraction) * (c.night || c.fx.inside ? 1.2 : 0.45) * (1 - d / 30); if (r.resentment > 0.4) s *= 0.3; return [s, [`gyengédségigény ${LW.pct(1 - N(a).affection)}`, `szerelem ${LW.pct(E(a).love)}`]]; },
      plan: (c, a) => { const p = c.world.agents.get(a.partner); return { steps: [{ op: 'moveTo', i: c.world.idx(p.x | 0, p.y | 0), near: 1 }, { op: 'interact', target: p.id, kind: 'mate', n: 6 }], target: p.id }; },
    },
    stockpile: {
      applicable: (c, a) => !c.infant && c.stage !== 'child' && (c.food || (a.inv.spear && c.animals) || (c.fish && a.knowledge.techs.has('fishing'))),
      score: (c, a) => { const hh = c.household.length; const stock = c.foodUnits + c.storeFood; const target = 1.2 * hh + (c.season === 2 ? 1.5 * hh : c.season === 3 ? 1.0 * hh : 0); const gap = 1 - Math.min(1, stock / Math.max(1, target)); let s = gap * 0.75 * (0.5 + P(a).discipline) * (c.season === 2 ? 1.4 : c.season === 3 ? 1.1 : 1); if (A().load(a) > A().capacity(c.world, a) * 0.85) s *= 0.2; if (c.night) s *= 0.4; if (N(a).warmth < 0.35) s *= 0.3; return [s, [`tartalék ${stock.toFixed(1)} / ${target.toFixed(1)}`, `fegyelem ${LW.pct(P(a).discipline)}`]]; },
      plan: (c, a) => {
        const opts = []; const cap = Math.max(2, Math.floor((A().capacity(c.world, a) - A().load(a)) / 0.6));
        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i, poi: { k: 'food', i: c.food.i } }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.3) ? 'roots' : 'berries', n: Math.min(cap, 6) }], tag: 'gather:berries' });
        if (a.inv.spear && c.animals) opts.push({ d: c.animals.d * 0.7, steps: [{ op: 'moveTo', i: c.animals.i, poi: { k: 'animals', i: c.animals.i } }, { op: 'hunt', i: c.animals.i, item: 'meat_raw', n: 3 }], tag: 'hunt:animals' });
        if (c.fish && a.knowledge.techs.has('fishing')) { const t = tileNear(c.world, c.fish.i); if (t != null) opts.push({ d: c.fish.d * 0.8, steps: [{ op: 'moveTo', i: t, poi: { k: 'fish', i: c.fish.i } }, { op: 'fish', i: c.fish.i, item: 'fish_raw', n: 3 }], tag: 'fish:fish' }); }
        if (!opts.length) return null; opts.sort((x, y) => x.d - y.d); const o = opts[0];
        if (c.home && Bld().def(c.home).storage) o.steps.push({ op: 'moveTo', i: c.world.idx(c.home.x, c.home.y) }, { op: 'store', bid: c.home.id });
        return { steps: o.steps, tag: o.tag };
      },
    },
    buildShelter: {
      applicable: (c, a) => c.adult && (a.knowledge.techs.has('shelter_building') || a.knowledge.techs.has('hut_construction')) && !(a.partner != null && c.world.agents.get(a.partner)?.home != null && !c.home),
      score: (c, a) => {
        const kind = bestDwelling(a) || 'lean_to'; const DEFS = Bld().DEFS;
        const cur = c.home ? DEFS[c.home.kind].tier || 0 : 0; const tier = { [kind]: DEFS[kind].tier || 1 };
        if (cur >= tier[kind]) return [0, ['az otthon elég jó']];
        let s = cur === 0 ? 1.15 : 0.55; const f = [cur === 0 ? 'nincs otthona' : `jobb otthon: ${LW.Buildings.DEFS[kind].label.toLowerCase()}`];
        if (N(a).warmth < 0.7) { s += 0.35; f.push('hideg'); } if (c.rain > 0.2 && !c.fx.inside) { s += 0.3; f.push('eső'); } if (c.season === 2) { s += 0.35; f.push('ősz'); } if (c.season === 3) s += 0.2;
        s += P(a).ambition * 0.3 + P(a).discipline * 0.2; if (c.night) s *= 0.3; if (a.pregnancy || c.household.length > 1) s += 0.2;
        a._buildKind = kind; return [s, f];
      },
      plan: (c, a) => buildPlan(c, a, a._buildKind || 'lean_to'),
    },
    buildPublic: {
      applicable: (c, a) => c.adult && !c.night && a.knowledge.techs.size >= 3 && N(a).water > 0.45 && N(a).food > 0.4,
      score: (c, a) => { const DEFS = Bld().DEFS; const day = c.world.tick / LW.TIME.TICKS_PER_DAY | 0; if (a._pubDay !== day || !a._pubKind) { const pick = LW.Society.pickPublic(c.world, a); a._pubKind = pick ? pick.kind : null; a._pubWant = pick ? pick.want : 0; a._pubDay = day; } const which = a._pubKind, best = a._pubWant || 0; if (!which) return [0, []]; return [best * (0.45 + P(a).ambition * 0.4 + P(a).discipline * 0.25) * (c.season === 3 ? 0.6 : 1), [`a közösségnek kellene: ${DEFS[which].label.toLowerCase()}`]]; },
      plan: (c, a) => a._pubKind ? buildPlan(c, a, a._pubKind) : null,
    },
    helpBuild: {
      applicable: (c, a) => c.adult && !!findHouseholdSite(c, a),
      score: (c, a) => { const b = findHouseholdSite(c, a); a._helpSite = b; return [0.75 + P(a).loyalty * 0.2 + (c.season === 2 ? 0.2 : 0), [`segít építeni: ${Bld().def(b).label.toLowerCase()}`]]; },
      plan: (c, a) => buildPlanFor(c, a, a._helpSite),
    },
    makeFire: {
      applicable: (c, a) => c.adult && a.knowledge.techs.has('fire_making') && !(c.fire && LW.dist(a.x, a.y, c.fire.x, c.fire.y) < 6),
      score: (c, a) => { let s = 0.5 + u(N(a).warmth) * 0.9 + (c.night ? 0.35 : 0) + (a.inv.meat_raw || a.inv.fish_raw ? 0.3 : 0) + (c.season === 3 ? 0.3 : 0); if (c.effTemp > 18 && !c.night) s *= 0.4; return [s, ['nincs tűz a közelben', `érzett ${Math.round(c.effTemp)} °C`]]; },
      plan: (c, a) => {
        const site = c.home ? c.world.randomNear(c.home.x, c.home.y, 1) : Bld().findSite(c.world, a, 'campfire'); if (site < 0) return null;
        const existing = c.world.buildingsNear(a.x | 0, a.y | 0, 6).find((b) => b.kind === 'campfire' && !b.lit && LW.dist(b.x, b.y, a.x, a.y) < 6);
        if (existing) { const m = missingFor(a, { wood: 3 }); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null; return { steps: [...acq, { op: 'moveTo', i: c.world.idx(existing.x, existing.y), near: 1 }, { op: 'refuel', bid: existing.id }], tag: 'gather:wood' }; }
        const m = missingFor(a, { wood: 3 }); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null;
        return { steps: [...acq, { op: 'moveTo', i: site, near: 1 }, { op: 'buildNew', kind: 'campfire', i: site }], tag: 'build:campfire', kind: 'campfire' };
      },
    },
    tendFire: {
      applicable: (c, a) => c.adult && a.knowledge.techs.has('fire_making') && !!c.fire && c.fire.fuel < LW.TIME.TICKS_PER_DAY * 0.7 && LW.dist(a.x, a.y, c.fire.x, c.fire.y) < 12,
      score: (c, a) => [0.55 + (c.night ? 0.2 : 0) + (c.season === 3 ? 0.25 : 0) + P(a).discipline * 0.2, [`fogy a tűz (${Math.round(c.fire.fuel / 4)} óra)`]],
      plan: (c, a) => { const m = missingFor(a, { wood: 3 }); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null; return { steps: [...acq, { op: 'moveTo', i: c.world.idx(c.fire.x, c.fire.y), near: 1 }, { op: 'refuel', bid: c.fire.id }], tag: 'gather:wood' }; },
    },
    craft: {
      applicable: (c, a) => c.adult || c.stage === 'adolescent',
      score: (c, a) => {
        let best = 0, which = null; const f = [];
        const want = [];
        if (a.knowledge.techs.has('stone_knapping') && !a.inv.handaxe) want.push(['handaxe', 0.6]);
        if (a.knowledge.techs.has('spear_making') && !a.inv.spear) want.push(['spear', 0.55 + u(N(a).food) * 0.4]);
        if (a.knowledge.techs.has('basket_weaving') && !a.inv.basket) want.push(['basket', 0.45]);
        if (a.knowledge.techs.has('hide_working') && !a.inv.clothes) want.push(['clothes', 0.4 + u(N(a).warmth) * 0.6 + (c.season >= 2 ? 0.3 : 0)]);
        if (a.knowledge.techs.has('pottery') && !a.inv.pot) want.push(['pot', 0.35]);
        if (a.knowledge.techs.has('cooking') && (a.inv.meat_raw || a.inv.fish_raw) && c.fire) want.push([a.inv.meat_raw ? 'meat_cooked' : 'fish_cooked', 0.5 + u(N(a).food) * 0.6]);
        if (a.knowledge.techs.has('food_drying') && c.fire && ((a.inv.meat_raw || 0) >= 2 || (a.inv.fish_raw || 0) >= 2 || (a.inv.berries || 0) >= 6)) want.push(['dried_food', 0.45 + (c.season === 2 ? 0.3 : 0)]);
        // jobb szerszám, ha tudja, hogyan (balta, vadászfegyver, eke, csákány, ruha)
        for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech)) continue; if (LW.Tree.bestTool(a, it.slot) >= it.tier) continue; if (needsBuilding(R.nearby) && !nearestBuilding(c.world, a, R.nearby, 30)) continue; if (R.nearby === 'fire' && !c.fire) continue; want.push([rid, 0.4 + (it.slot === 'hunt' ? u(N(a).food) * 0.3 : 0) + (it.slot === 'clothes' ? u(N(a).warmth) * 0.5 : 0) + P(a).ambition * 0.15]); }
        if (a.knowledge.techs.has('baking') && (a.inv.flour || 0) >= 1 && c.fire) want.push(['bread', 0.5 + u(N(a).food) * 0.5]);
        if (a.knowledge.techs.has('milling') && ((a.inv.grain || 0) >= 3 || (c.home && c.home.storage && (c.home.storage.grain || 0) >= 3))) want.push(['flour', 0.4 + u(N(a).food) * 0.4]);
        for (const [r, s] of want) if (s > best) { best = s; which = r; }
        a._craft = which; if (which) f.push(`kellene: ${LW.ITEMS[which] ? LW.ITEMS[which].label.toLowerCase() : which}`);
        return [best * (0.6 + P(a).discipline * 0.4) * (c.night ? 0.5 : 1), f];
      },
      plan: (c, a) => {
        const rid = a._craft; if (!rid) return null; const R = LW.Tech.RECIPES[rid];
        let need = R.inp; if (R.inpAny) need = R.inpAny.find((o) => count(missingFor(a, o)) === 0) || R.inpAny[0];
        const m = missingFor(a, need); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null;
        const steps = [...acq]; if (R.nearby === 'fire') { if (!c.fire) return null; steps.push({ op: 'moveTo', i: c.world.idx(c.fire.x, c.fire.y), near: 1 }); }
        else if (needsBuilding(R.nearby)) { const nb = nearestBuilding(c.world, a, R.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: c.world.idx(nb.x, nb.y), near: 1.5 }); }
        steps.push({ op: 'craft', recipe: rid }); return { steps, tag: R.tag };
      },
    },
    experiment: {
      applicable: (c, a) => (c.adult || c.stage === 'adolescent') && N(a).food > 0.25 && (N(a).water > 0.3 || !c.water) && N(a).energy > 0.2 && N(a).warmth > 0.12,
      score: (c, a) => {
        const el = LW.Tech.eligible(c.world, a); if (!el.length) return [0, ['nincs mit kipróbálni']];
        let best = 0, which = null;
        for (const id of el) { const d = LW.Tech.D[id]; const need = d.need ? u(N(a)[d.need] ?? 1) : 0; const prog = a.knowledge.progress[id] || 0; const m = LW.Tech.missingItems(a, d); const feasible = count(m) === 0 || acquireSteps(c.world, a, m, c); if (!feasible) continue; if (d.nearby === 'fire' && !c.fire) continue; if (d.nearby === 'water' && !c.water) continue; if (needsBuilding(d.nearby) && !nearestBuilding(c.world, a, d.nearby, 30)) continue; const s = (0.25 + P(a).curiosity * 0.5) * (0.4 + P(a).creativity * 0.6) * (1 - d.difficulty * 0.5) + need * 0.7 + prog * 0.4 + u(N(a).curiosity) * 0.35 + (count(m) === 0 ? 0.15 : 0); if (s > best) { best = s; which = id; } }
        a._exp = which; return [best * (c.night ? 0.4 : 1), which ? [`próba: ${LW.Tech.D[which].name.toLowerCase()}`, `kíváncsiság ${LW.pct(P(a).curiosity)}`, `kreativitás ${LW.pct(P(a).creativity)}`] : []];
      },
      plan: (c, a) => {
        const id = a._exp; if (!id) return null; const d = LW.Tech.D[id]; const m = LW.Tech.missingItems(a, d); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null;
        const steps = [...acq];
        if (d.nearby === 'fire' && c.fire) steps.push({ op: 'moveTo', i: c.world.idx(c.fire.x, c.fire.y), near: 1 });
        if (d.nearby === 'water' && c.water) { const t = tileNear(c.world, c.water.i); if (t != null) steps.push({ op: 'moveTo', i: t }); }
        if (needsBuilding(d.nearby)) { const nb = nearestBuilding(c.world, a, d.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: c.world.idx(nb.x, nb.y), near: 1.5 }); }
        steps.push({ op: 'experiment', tech: id, n: Math.round(8 + d.difficulty * 32) });
        return { steps, tag: 'experiment:' + id, tech: id };
      },
    },
    dig: {
      applicable: (c, a) => c.adult && a.knowledge.techs.has('digging') && !!(A().nearestPoi(c.world, a, 'deposit') || A().nearestPoi(c.world, a, 'clay')),
      score: (c, a) => { const dep = A().nearestPoi(c.world, a, 'deposit'); const clay = A().nearestPoi(c.world, a, 'clay'); const wantClay = a.knowledge.techs.has('pottery') && (a.inv.clay || 0) < 4 || (a.knowledge.techs.has('stone_masonry') && (a.inv.clay || 0) < 2); let s = 0, t = null; if (clay && wantClay) { s = 0.5; t = clay; } if (dep && (!t || LW.dist(a.x, a.y, dep.x, dep.y) < 8)) { const s2 = 0.3 * (0.5 + P(a).curiosity) + (a.knowledge.techs.has('ore_lore_' + LW.DEPOSIT_NAME[dep.q]) ? 0 : 0.25); if (s2 > s) { s = s2; t = dep; } } a._digTarget = t; return [s * (c.night ? 0.3 : 1), t ? [`ásás itt: ${t.x},${t.y}`] : []]; },
      plan: (c, a) => a._digTarget ? { steps: [{ op: 'moveTo', i: a._digTarget.i }, { op: 'dig', i: a._digTarget.i, n: 8 }], tag: 'dig:ground' } : null,
    },
    farm: {
      applicable: (c, a) => c.adult && a.knowledge.techs.has('seed_planting'),
      score: (c, a) => { const farms = c.world.buildingsNear(a.x | 0, a.y | 0, 20).filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id); const maxFarms = 1 + (c.household.length >= 3 ? 1 : 0) + (a.knowledge.techs.has('plowing') ? 1 : 0) + (a.knowledge.techs.has('crop_rotation') ? 1 : 0); const farm = farms.find((b) => b.progress < 1) || farms.find((b) => b.planted && b.crop >= 1) || farms.find((b) => !b.planted) || null; a._farm = farm; if (!farm) { if (farms.length >= maxFarms) return [0.05, ['nő a termés']]; return [c.season <= 1 && c.home ? 0.6 + P(a).discipline * 0.3 + (farms.length === 0 ? 0.2 : 0) + u(N(a).food) * 0.4 : 0.1, [farms.length ? 'még egy szántót akar' : 'szántót akar']]; } if (farm.progress < 1) return [0.7, ['befejezi a szántót']]; if (!farm.planted && c.season <= 1) return [((a.inv.roots || 0) + (a.inv.berries || 0) >= 2 ? 0.75 : 0.3), ['vetés']]; if (farm.planted && farm.crop >= 1) return [1.0 + u(N(a).food) * 0.5, ['érett a termés']]; return [0.05, ['nő a termés']]; },
      plan: (c, a) => { const farm = a._farm; if (!farm) return buildPlan(c, a, 'farm_plot'); if (farm.progress < 1) return buildPlanFor(c, a, farm); if (!farm.planted) { const seeds = (a.inv.roots || 0) + (a.inv.berries || 0) >= 2 ? [] : acquireSteps(c.world, a, { berries: 2 }, c); if (!seeds) return null; return { steps: [...seeds, { op: 'moveTo', i: c.world.idx(farm.x, farm.y) }, { op: 'plant', bid: farm.id }], tag: 'farm:plant' }; } if (farm.crop >= 1) return { steps: [{ op: 'moveTo', i: c.world.idx(farm.x, farm.y) }, { op: 'harvest', bid: farm.id }], tag: 'farm:harvest' }; return null; },
    },
    explore: {
      applicable: (c, a) => !c.infant && c.stage !== 'child' && !(c.water && N(a).water < 0.4) && !(N(a).food < 0.3 && (c.food || c.foodInv)),
      score: (c, a) => { let s = P(a).curiosity * (1 - E(a).fear) * 0.55 + u(N(a).curiosity) * 0.45; const f = [`kíváncsiság ${LW.pct(P(a).curiosity)}`]; if (!c.water) { s += 1.0; f.push('nem ismer vizet'); } if (!c.food) { s += 0.8; f.push('nem ismer ételt'); } else if (c.food.d > 10) { s += 0.4; f.push('messze az étel'); } if (a.knowledge.places.size < 20) { s += 0.3; f.push('keveset ismer'); } if (c.night) s *= 0.25; if (N(a).warmth < 0.5) s *= 0.3; if (N(a).food < 0.3 || N(a).water < 0.3) s *= (c.water && c.food) ? 0.3 : 1.2; return [s, f]; },
      plan: (c, a) => { const t = exploreTarget(c.world, a); return t == null ? null : { steps: [{ op: 'moveTo', i: t, explore: true }], tag: 'explore:walk' }; },
    },
    fight: {
      applicable: (c, a) => c.adult && E(a).anger > 0.5 && P(a).aggression > 0.4,
      score: (c, a) => { let best = 0, who = null; for (const o of c.nearby) { const r = a.relationships.get(o.id); if (!r || r.resentment < 0.45) continue; const s = E(a).anger * P(a).aggression * r.resentment * 1.4 * (1 - r.fear) * (P(a).bravery + 0.3); if (s > best) { best = s; who = o; } } a._fightTarget = who; return [best, who ? [`harag ${LW.pct(E(a).anger)}`, `neheztel rá: ${who.name}`] : []]; },
      plan: (c, a) => a._fightTarget ? { steps: [{ op: 'moveTo', i: c.world.idx(a._fightTarget.x | 0, a._fightTarget.y | 0), near: 1 }, { op: 'interact', target: a._fightTarget.id, kind: 'fight', n: 2 }], target: a._fightTarget.id, priority: 2 } : null,
    },
    teach: {
      applicable: (c, a) => c.adult && a.knowledge.techs.size > 0 && c.nearby.length > 0,
      // (a halandóság-érzet a pontozásban: aki tudja, hogy fogy az ideje, átadja, amit tud)
      score: (c, a) => { let best = 0, who = null, tech = null; for (const o of c.nearby) { if (o.sleeping || A().stage(c.world, o) === 'infant') continue; const r = a.relationships.get(o.id); const close = (a.children.includes(o.id) ? 0.8 : 0) + (r ? r.friendship * 0.6 : 0); if (close < 0.2) continue; for (const t of a.knowledge.techs) { if (o.knowledge.techs.has(t) || LW.Tech.D[t].hidden) continue; const pre = !LW.Tech.D[t].prereq || LW.Tech.D[t].prereq.every((p) => o.knowledge.techs.has(p)); if (!pre) continue; const s = 0.3 * (1 + (a.mind ? a.mind.mortality * 1.2 : 0)) * close * (0.5 + P(a).empathy + P(a).sociability * 0.5) * (c.stage === 'elder' ? 1.5 : 1); if (s > best) { best = s; who = o; tech = t; } } } a._teach = who ? { who, tech } : null; return [best, who ? [`tanítja (${LW.Tech.D[tech].name.toLowerCase()}): ${who.name}`] : []]; },
      plan: (c, a) => a._teach ? { steps: [{ op: 'moveTo', i: c.world.idx(a._teach.who.x | 0, a._teach.who.y | 0), near: 1 }, { op: 'interact', target: a._teach.who.id, kind: 'teach', tech: a._teach.tech, n: 6 }], target: a._teach.who.id, tech: a._teach.tech } : null,
    },
    pickup: {
      applicable: (c, a) => !c.infant && !!c.world.ground && c.world.ground.size > 0,
      score: (c, a) => { const g = nearestGround(c.world, a, 7); a._pick = g; return [g ? 0.45 : 0, g ? ['holmi hever a földön'] : []]; },
      plan: (c, a) => a._pick != null ? { steps: [{ op: 'moveTo', i: a._pick }, { op: 'pickup', i: a._pick }] } : null,
    },
    mourn: {
      applicable: (c, a) => E(a).grief > 0.35,
      score: (c, a) => [E(a).grief * 0.7, [`gyász ${LW.pct(E(a).grief)}`]],
      plan: (c, a) => ({ steps: [...(c.home ? [{ op: 'moveTo', i: c.world.idx(c.home.x, c.home.y) }] : []), { op: 'wait', n: 16, at: 'mourning' }] }),
    },
    rest: {
      applicable: () => true,
      score: (c, a) => [0.12 + (N(a).energy < 0.5 ? 0.15 : 0) + (a.health < 0.5 ? 0.3 : 0), ['semmi sürgős']],
      plan: (c, a) => ({ steps: [...(c.fire && LW.dist(a.x, a.y, c.fire.x, c.fire.y) > 2 && LW.dist(a.x, a.y, c.fire.x, c.fire.y) < 12 ? [{ op: 'moveTo', i: c.world.randomNear(c.fire.x, c.fire.y, 1) }] : []), { op: 'wait', n: 6, at: c.fire ? 'fire' : 'rest' }], tag: c.fire ? 'rest:fire' : 'rest:idle' }),
    },
  };

  function nearestGround(world, a, maxD) { let best = null, bd = maxD; for (const [i, g] of world.ground) { let any = false; for (const k in g) if (g[k] > 0) { any = true; break; } if (!any) continue; const d = LW.dist(a.x, a.y, world.xOf(i) + 0.5, world.yOf(i) + 0.5); if (d < bd) { bd = d; best = i; } } return best; }
  function nearestGroundFood(world, a, maxD) { let best = null, bd = maxD; for (const [i, g] of world.ground) { let any = false; for (const k in g) if (g[k] > 0 && LW.ITEMS[k] && LW.ITEMS[k].food) { any = true; break; } if (!any) continue; const d = LW.dist(a.x, a.y, world.xOf(i) + 0.5, world.yOf(i) + 0.5); if (d < bd) { bd = d; best = i; } } return best; }
  function findHouseholdSite(c, a) { for (const b of c.world.buildingsNear(a.x | 0, a.y | 0, 40)) { if (b.progress >= 1) continue; const def = Bld().def(b); if (def.divine) continue; if (b.ownerId === a.id) continue; if (def.public && LW.dist(a.x, a.y, b.x, b.y) < 18 && (c.world.tick + a.id) % 3 === 0) return b; const owner = c.world.agents.get(b.ownerId); if (!owner) continue; if (a.partner === owner.id || c.household.includes(owner)) if (LW.dist(a.x, a.y, b.x, b.y) < 40) return b; } return null; }
  function buildPlan(c, a, kind) {
    const pubk = !!Bld().DEFS[kind].public; let site = c.world.buildingsNear(a.x | 0, a.y | 0, 24).find((b) => b.kind === kind && b.progress < 1 && (b.ownerId === a.id || (pubk && LW.dist(a.x, a.y, b.x, b.y) < 20)));
    if (!site) { const i = Bld().findSite(c.world, a, kind); if (i < 0) return null; return { steps: [{ op: 'moveTo', i, near: 1 }, { op: 'buildNew', kind, i }], tag: 'build:' + kind, kind }; }
    return buildPlanFor(c, a, site);
  }
  function buildPlanFor(c, a, site) {
    const m = Bld().missing(site); const steps = []; const mine = {}; let needAcq = {};
    for (const k in m) { const have = a.inv[k] || 0; if (have > 0) mine[k] = Math.min(have, m[k]); else needAcq[k] = Math.min(m[k], 6); }
    if (count(mine) === 0 && count(needAcq) > 0) { const one = {}; const k = Object.keys(needAcq)[0]; one[k] = needAcq[k]; const acq = acquireSteps(c.world, a, one, c); if (!acq) return null; steps.push(...acq); }
    steps.push({ op: 'moveTo', i: Bld().approach(c.world, a, site), near: 1 });
    if (count(m) > 0) steps.push({ op: 'deliver', bid: site.id });
    steps.push({ op: 'build', bid: site.id });
    return { steps, tag: 'build:' + site.kind, kind: site.kind };
  }
  function exploreTarget(world, a) {
    const rng = world.rng; let best = null, bs = -1e9;
    for (let k = 0; k < 8; k++) {
      const ang = rng.range(0, Math.PI * 2), d = rng.range(7, 16); const x = LW.clamp(Math.round(a.x + Math.cos(ang) * d), 1, world.w - 2), y = LW.clamp(Math.round(a.y + Math.sin(ang) * d), 1, world.h - 2);
      const i = world.idx(x, y); if (!world.isPassable(i)) continue;
      let known = 0; for (const v of a.knowledge.places.values()) if (Math.abs(world.xOf(v.i) - x) <= 5 && Math.abs(world.yOf(v.i) - y) <= 5) known++;
      const s = -known + rng.f() * 2 - (world.tiles.danger[i] / 255) * (1 - a.personality.bravery) * 3 - (a.home != null ? LW.dist(x, y, world.buildings.get(a.home)?.x ?? x, world.buildings.get(a.home)?.y ?? y) * 0.05 : 0);
      if (s > bs) { bs = s; best = i; }
    }
    return best;
  }

  const Brain = {
    GOALS,
    /** Decide (or keep) a plan. */
    decide(world, a, force) {
      _tileNearAgent = a;
      const ctx = context(world, a);
      const cand = []; const sigma = world.cfg.agents.noiseSigma * (1 + a.emotions.stress);
      const fs = a.failStreak; if (a.plan && a.plan.failed) { if (fs && fs.goal === a.plan.goal && world.tick - fs.tick < 48) { fs.count++; fs.tick = world.tick; } else a.failStreak = { goal: a.plan.goal, count: 1, tick: world.tick }; }
      for (const id in GOALS) {
        const g = GOALS[id];
        try { if (!g.applicable(ctx, a)) continue; } catch (e) { continue; }
        let [s, factors] = g.score(ctx, a); if (!(s > 0)) continue;
        if (a.failStreak && a.failStreak.goal === id && a.failStreak.count >= 3 && world.tick - a.failStreak.tick < 32) { s *= 0.3; factors = [...factors, `sorra kudarc (×${a.failStreak.count})`]; }
        if (a.nudge && a.nudge.goal === id && world.tick < a.nudge.until) { if (a.nudge.strong) { s = s * 3 + 1.2; factors = [...factors, 'a Teremtő szava']; } else { s = s * 1.4 + 0.25; factors = [...factors, 'a hang sugallata']; } } // a Teremtő szava: parancs (teljes engedelmesség) vagy sugallat
        s += world.rng.gauss(0, sigma);
        cand.push({ id, s, factors });
      }
      cand.sort((x, y) => y.s - x.s);
      const current = a.plan;
      // hysteresis: keep the current plan unless clearly beaten (compared against its *fresh* score)
      if (current && !force && !current.done && cand.length && cand[0].id !== current.goal) {
        const fresh = cand.find((c) => c.id === current.goal); const curScore = fresh ? fresh.s : 0;
        const urgent = cand[0].s > 1.2 && ['drink', 'eat', 'flee', 'getWarm', 'careForChild'].includes(cand[0].id);
        if (!urgent && cand[0].s < curScore * 1.4 + 0.15 && (world.tick - current.startedTick) < 300) { current.score = curScore; return current; }
      }
      for (const c of cand) {
        if (current && !current.done && c.id === current.goal && !force) { current.score = c.s; return current; }
        let plan = null; try { plan = GOALS[c.id].plan(ctx, a); } catch (e) { plan = null; }
        if (!plan) continue;
        plan.goal = c.id; plan.score = c.s; plan.i = 0; plan.startedTick = world.tick; plan.done = false; plan.priority = plan.priority ?? 1; plan.stuck = 0;
        a.why = { tick: world.tick, chosen: { goal: c.id, score: c.s, factors: c.factors }, alternatives: cand.filter((x) => x.id !== c.id).slice(0, 5).map((x) => ({ goal: x.id, score: x.s, factors: x.factors })), context: { hunger: 1 - a.needs.food, thirst: 1 - a.needs.water, tired: 1 - a.needs.energy, cold: 1 - a.needs.warmth, danger: ctx.danger, night: ctx.night, feels: Math.round(ctx.effTemp) } };
        if (a.sleeping && plan.goal !== 'sleep') a.sleeping = false;
        a.plan = plan; return plan;
      }
      a.plan = null; return null;
    },
    /** Whether the brain should think now. */
    shouldDecide(world, a) {
      const p = a.plan;
      if (!p || p.done) return true;
      if (a.sleeping) return a.danger > 0.4 || a.needs.food < 0.06 || a.needs.water < 0.08 || a.needs.warmth < 0.1;
      if (a.danger > 0.5 && p.goal !== 'flee') return true;
      if (a.divineRequest && p.goal !== 'divine' && a.divineRequest.force) return true;
      if ((world.tick - a.lastDecisionTick) >= world.cfg.agents.decisionInterval && p.priority < 2) return true;
      return false;
    },
    describeGoal(id) { return LW.HU.goalVerb(id); },
  };
  LW.Brain = Brain;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/actions.js ===== */
/* LEVENTE — THE CREATOR · agents/actions.js — action state machines that execute plan steps, one tick at a time */
(function (LW) {
  'use strict';
  const A = () => LW.Agents, Bld = () => LW.Buildings, Eco = () => LW.Ecology;
  const RUN = 'running', DONE = 'done', FAIL = 'failed';

  function moveToward(world, a, tx, ty, maxStep) {
    const dx = tx - a.x, dy = ty - a.y; const d = Math.hypot(dx, dy); if (d < 1e-6) return 0;
    const step = Math.min(d, maxStep); const nx = a.x + dx / d * step, ny = a.y + dy / d * step;
    const ni = world.idx(nx | 0, ny | 0); if (!world.inBounds(nx | 0, ny | 0) || !world.isPassable(ni)) return -1;
    const oi = world.idx(a.x | 0, a.y | 0);
    a.x = nx; a.y = ny; if (Math.abs(dx) > 0.05) a.facing = dx > 0 ? 1 : 0;
    if (ni !== oi) Eco().footfall(world, ni);
    return step;
  }
  function near(world, a, i, r = 1.6) { return LW.dist(a.x, a.y, world.xOf(i) + 0.5, world.yOf(i) + 0.5) <= r; }
  const cnt = (m) => { let c = 0; for (const k in m) c += m[k]; return c; };

  const OPS = {
    moveTo(world, a, st) {
      const tx = world.xOf(st.i), ty = world.yOf(st.i); const acceptR = st.near ? 1.6 : 0.4;
      if (LW.dist(a.x, a.y, tx + 0.5, ty + 0.5) <= acceptR) return DONE;
      if (a.avoidTiles && a.avoidTiles[st.i] > world.tick) return FAIL;
      if (world.tiles.fire[st.i]) return FAIL;
      if (!st.path) {
        if (st.lastX != null && LW.dist(a.x, a.y, st.lastX, st.lastY) > 3) st.retries = 0; // progress resets the retry budget
        st.retries = (st.retries || 0) + 1; if (st.retries > 4) { if (st.poi) A().avoidPlace(world, a, st.poi.k, st.poi.i); return FAIL; }
        const p = world.findPath(a.x | 0, a.y | 0, tx, ty, 6000); if (!p) { if (st.poi) A().avoidPlace(world, a, st.poi.k, st.poi.i); else { a.avoidTiles = a.avoidTiles || {}; a.avoidTiles[st.i] = world.tick + 96 * 3; } return FAIL; }
        st.path = p; st.pi = 0; st.partial = !!p.partial; st.lastX = a.x; st.lastY = a.y;
      }
      const speed = A().speed(world, a) / Math.max(0.5, world.moveCost(world.idx(a.x | 0, a.y | 0)));
      let budget = speed;
      while (budget > 0.001) {
        if (st.pi >= st.path.length) { st.path = null; if (LW.dist(a.x, a.y, tx + 0.5, ty + 0.5) <= acceptR) return DONE; if (st.partial) return RUN; // recompute next tick
          return RUN; }
        const wp = st.path[st.pi]; const wx = world.xOf(wp) + 0.5, wy = world.yOf(wp) + 0.5;
        if (world.tiles.fire[wp]) { st.path = null; return RUN; }
        const d = LW.dist(a.x, a.y, wx, wy);
        if (d <= budget) { a.x = wx; a.y = wy; budget -= d; st.pi++; Eco().footfall(world, wp); if (Math.abs(wx - a.x) > 0.01) a.facing = wx > a.x ? 1 : 0; }
        else { const r = moveToward(world, a, wx, wy, budget); if (r < 0) { st.path = null; return RUN; } budget = 0; }
      }
      if (st.pi >= st.path.length && LW.dist(a.x, a.y, tx + 0.5, ty + 0.5) <= acceptR) return DONE;
      return RUN;
    },
    follow(world, a, st) {
      const t = world.agents.get(st.target); if (!t) return FAIL; st.t = (st.t || 0) + 1;
      const d = LW.dist(a.x, a.y, t.x, t.y);
      if (d > 1.5) { if (moveToward(world, a, t.x, t.y, A().speed(world, a)) < 0) { const p = world.findPath(a.x | 0, a.y | 0, t.x | 0, t.y | 0, 800); if (p && p.length) { const wp = p[0]; moveToward(world, a, world.xOf(wp) + 0.5, world.yOf(wp) + 0.5, A().speed(world, a)); } } }
      return st.t >= st.n ? DONE : RUN;
    },
    flee(world, a, st) {
      st.t = (st.t || 0) + 1; const t = world.tiles; const x = a.x | 0, y = a.y | 0;
      let best = -1, bs = -1e9;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (!world.inBounds(nx, ny)) continue; const i = world.idx(nx, ny); if (!world.isPassable(i) || t.fire[i]) continue; let s = 0; for (let fy = -4; fy <= 4; fy++) for (let fx = -4; fx <= 4; fx++) { const qx = nx + fx, qy = ny + fy; if (!world.inBounds(qx, qy)) continue; if (t.fire[world.idx(qx, qy)]) s -= 1 / (1 + Math.abs(fx) + Math.abs(fy)); } if (a.threat) { const th = world.agents.get(a.threat); if (th) s += LW.dist(nx, ny, th.x, th.y) * 0.3; } s += world.rng.f() * 0.1; if (s > bs) { bs = s; best = i; } }
      if (best >= 0) moveToward(world, a, world.xOf(best) + 0.5, world.yOf(best) + 0.5, A().speed(world, a) * 1.2);
      if (a.danger < 0.2 && st.t > 3) return DONE;
      return st.t >= st.n ? DONE : RUN;
    },
    gather(world, a, st, plan) {
      if (!near(world, a, st.i, 1.8)) return FAIL;
      const t = world.tiles; const i = st.i; st.t = (st.t || 0) + 1; st.acc = st.acc || 0; st.got = st.got || 0;
      const sk = a.skills.gathering; const lore = a.knowledge.techs.has('foraging_lore') ? 1.3 : 1; const fxm = LW.Tech.fx(world, a);
      let rate = 0, field = null, cost = 1, item = st.item;
      if (item === 'berries') { field = 'veg'; cost = 6; rate = (0.9 + sk) * lore * (a.inv.basket ? 1.3 : 1) * (1 + fxm.food); }
      else if (item === 'roots') { field = 'veg'; cost = 10; rate = (0.6 + sk * 0.8) * lore * (a.knowledge.techs.has('digging') ? 1.5 : 1) * (1 + fxm.food); }
      else if (item === 'fiber') { field = t.veg[i] >= 10 ? 'veg' : 'trees'; cost = 2; rate = 0.8 + sk * 0.6; }
      else if (item === 'wood') { field = 'trees'; cost = 6; rate = (0.45 + sk * 0.4) * (a.inv.handaxe || LW.Tree.bestTool(a, 'axe') >= 1 ? 2.2 : 1) * (a.knowledge.techs.has('woodworking') ? 1.3 : 1) * (1 + fxm.wood); }
      else if (item === 'stone') { field = 'stone'; cost = 5; rate = (0.5 + sk * 0.4) * (1 + fxm.stone); }
      else if (item === 'flint') { if (t.depType[i] === LW.DEPOSIT.FLINT && t.depAmt[i] > 0) { field = 'depAmt'; cost = 1; rate = 0.5 + sk * 0.3; } else if (t.stone[i] > 0) { field = 'stone'; cost = 10; rate = 0.3 + sk * 0.3; } else return FAIL; }
      else if (item === 'clay') { if (t.depType[i] === LW.DEPOSIT.CLAY && t.depAmt[i] > 0) { field = 'depAmt'; cost = 1; rate = (a.knowledge.techs.has('digging') ? 0.5 : 0.2) + sk * 0.3; } else if (t.biome[i] === LW.BIOME.MARSH) { field = null; rate = 0.15 + sk * 0.2; } else return FAIL; }
      else return FAIL;
      if (a.needs.energy < 0.15) rate *= 0.5;
      st.acc += rate;
      while (st.acc >= 1 && st.got < st.n) {
        if (field) { const have = t[field][i]; const floor = field === 'veg' ? 10 : 0; if (have < cost + floor) { break; } /* a bokrot nem szedik tövig: marad mag a jövőre */ t[field][i] = have - cost; if (field === 'veg' || field === 'trees') { if ((have >> 5) !== ((have - cost) >> 5)) world.dirtyTiles.add(i); } if (field === 'depAmt' && t.depAmt[i] === 0) { t.depType[i] = 0; } }
        st.acc -= 1;
        if (st.direct && LW.ITEMS[item].food) { a.needs.food = Math.min(1, a.needs.food + LW.ITEMS[item].food); if (LW.ITEMS[item].water) a.needs.water = Math.min(1, a.needs.water + LW.ITEMS[item].water); a.lastMeal = world.tick; st.got++; a.counters.gathered++; if (a.needs.food >= 0.95) { st.got = st.n; } A().practice(a, 'gathering', 1); continue; }
        let added = A().addItem(world, a, item, 1);
        if (added === 0 && (LW.ITEMS[item].food || st.needed) && A().makeRoom(world, a, LW.ITEMS[item].weight)) added = A().addItem(world, a, item, 1);
        if (added === 0) { st.full = true; break; } st.got++; a.counters.gathered++;
        A().practice(a, item === 'fiber' || item === 'clay' ? 'crafting' : 'gathering', 1); if (item === 'berries' || item === 'roots') A().practice(a, 'foraging', 0.6);
      }
      if (st.got >= st.n || st.full) { LW.Tech.accident(world, a, 'gather:' + item); if (field === 'veg' && t.veg[i] < 10) A().forgetPlace(a, 'food', i); return DONE; }
      if (field && t[field][i] < cost) { if (field === 'veg') A().forgetPlace(a, 'food', i); if (field === 'trees') A().forgetPlace(a, 'wood', i); return st.got > 0 ? DONE : FAIL; }
      if (st.t > 40) return st.got > 0 ? DONE : FAIL;
      return RUN;
    },
    hunt(world, a, st) {
      if (!near(world, a, st.i, 2.5)) return FAIL; const t = world.tiles; st.t = (st.t || 0) + 1; st.got = st.got || 0;
      const p = 0.12 * (0.5 + a.skills.hunting) * (LW.Tree.bestTool(a, 'hunt') >= 1 ? 1.5 : 0.4) * (1 + LW.Tech.fx(world, a).hunt) * (0.2 + t.animals[st.i] / 255) * (LW.Time.isNight(world.tick) ? 0.5 : 1);
      if (world.rng.chance(p)) { t.animals[st.i] = Math.max(0, t.animals[st.i] - 30); A().makeRoom(world, a, 2.4); const q = A().addItem(world, a, 'meat_raw', 2); st.got += q; if (world.rng.chance(0.5)) A().addItem(world, a, 'hide', 1); a.counters.hunted = (a.counters.hunted || 0) + 1; A().practice(a, 'hunting', 3); a.emotions.excitement = Math.min(1, a.emotions.excitement + 0.3); A().memory(world, a, { type: 'hunt', text: 'elejtettem egy vadat', importance: 0.35, emotion: 'excitement', intensity: 0.4 }); }
      else if (world.rng.chance(0.006)) A().damage(world, a, 0.15, 'sebzett vad');
      if (st.got >= st.n) return DONE; if (t.animals[st.i] < 15) { A().forgetPlace(a, 'animals', st.i); return st.got ? DONE : FAIL; }
      return st.t >= 28 ? (st.got ? DONE : FAIL) : RUN;
    },
    fish(world, a, st) {
      if (!near(world, a, st.i, 3.0)) return FAIL; const t = world.tiles; st.t = (st.t || 0) + 1; st.got = st.got || 0;
      const p = 0.35 * (0.5 + a.skills.hunting) * (0.3 + t.fish[st.i] / 255) * (a.inv.spear ? 1.3 : 1) * (a.inv.basket ? 1.2 : 1) * (1 + LW.Tech.fx(world, a).food * 0.5);
      if (world.rng.chance(p)) { t.fish[st.i] = Math.max(0, t.fish[st.i] - 15); A().makeRoom(world, a, 0.8); st.got += A().addItem(world, a, 'fish_raw', 1); a.counters.fished = (a.counters.fished || 0) + 1; A().practice(a, 'hunting', 2); }
      if (st.got >= st.n) return DONE; if (t.fish[st.i] < 20) { A().forgetPlace(a, 'fish', st.i); return st.got ? DONE : FAIL; }
      return st.t >= 28 ? (st.got ? DONE : FAIL) : RUN;
    },
    consume(world, a) { const f = A().foodInInventory(a); if (!f) return FAIL; A().eat(world, a, f); if (a.needs.food < 0.75 && A().foodInInventory(a)) A().eat(world, a, A().foodInInventory(a)); return DONE; },
    drink(world, a, st) { if (st.i != null && !near(world, a, st.i, 3.0)) return FAIL; a.needs.water = 1; a.emotions.joy = Math.min(1, a.emotions.joy + 0.02); return DONE; },
    takeFood(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; let n = st.n || 3; let got = 0; for (const k of Object.keys(b.storage)) { const d = LW.ITEMS[k]; if (!d || !d.food) continue; while (n > 0 && b.storage[k] > 0) { if (!A().addItem(world, a, k, 1)) { if (!A().makeRoom(world, a, d.weight) || !A().addItem(world, a, k, 1)) { n = 0; break; } } b.storage[k]--; n--; got++; } if (b.storage[k] <= 0) delete b.storage[k]; } return got > 0 ? DONE : FAIL; },
    store(world, a, st) {
      const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const cap = Bld().def(b).storage || 0; let used = 0; for (const k in b.storage) used += b.storage[k];
      const keepFood = 2; let foodKept = 0;
      for (const k of Object.keys(a.inv)) { const d = LW.ITEMS[k]; if (!d || d.tool) continue; let q = a.inv[k]; if (d.food) { const keep = Math.max(0, keepFood - foodKept); const kk = Math.min(q, keep); foodKept += kk; q -= kk; } if (q <= 0) continue; const room = cap - used; const mv = Math.min(q, room); if (mv <= 0) break; A().removeItem(a, k, mv); b.storage[k] = (b.storage[k] || 0) + mv; used += mv; }
      return DONE;
    },
    sleep(world, a, st) {
      st.t = (st.t || 0) + 1; a.sleeping = true;
      const dawn = !LW.Time.isNight(world.tick) && LW.Time.hour(world.tick) >= 5;
      if (a.needs.energy >= 0.97 || (dawn && a.needs.energy > 0.6 && st.t > 8) || st.t > 60) { a.sleeping = false; a.lastSleep = world.tick; return DONE; }
      return RUN;
    },
    wait(world, a, st, plan) { st.t = (st.t || 0) + 1; if (st.t >= st.n) { if (plan.tag) LW.Tech.accident(world, a, plan.tag); return DONE; } return RUN; },
    interact(world, a, st, plan) {
      const t = world.agents.get(st.target); if (!t) return FAIL;
      if (!st.started) {
        if (LW.dist(a.x, a.y, t.x, t.y) > 1.8) { st.tries = (st.tries || 0) + 1; if (st.tries > 6) return FAIL; moveToward(world, a, t.x, t.y, A().speed(world, a)); return RUN; }
        if ((t.engagedUntil > world.tick && t.engagedWith !== a.id) || (t.sleeping && st.kind !== 'mate') || (t.plan && t.plan.goal === 'flee')) return FAIL;
        st.started = true; a.engagedUntil = world.tick + st.n; a.engagedWith = t.id; t.engagedUntil = world.tick + st.n; t.engagedWith = a.id;
        if (t.plan && t.plan.goal !== 'sleep') t.plan.paused = st.n;
        a.facing = t.x > a.x ? 1 : 0; t.facing = a.x > t.x ? 1 : 0;
        LW.Social.interact(world, a, t, st.kind, st);
      }
      st.t = (st.t || 0) + 1; return st.t >= st.n ? DONE : RUN;
    },
    buildNew(world, a, st, plan) {
      const i = st.i; if (!near(world, a, i, 1.8)) return FAIL;
      const bridge = !!Bld().DEFS[st.kind].bridge;
      if ((world.buildingAt(i) && !bridge) || !world.isPassable(i) || (bridge && !(world._bridgeSites && world._bridgeSites.get(i)))) { const j = Bld().findSite(world, a, st.kind); if (j < 0) return FAIL; st.i = j; return RUN; }
      const b = Bld().create(world, st.kind, world.xOf(i), world.yOf(i), a.id);
      plan.steps.splice(plan.i + 1, 0, { op: 'deliver', bid: b.id }, { op: 'build', bid: b.id });
      return DONE;
    },
    deliver(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !Bld().nearBuilding(world, a, b, 1.8)) return FAIL; Bld().deliver(world, b, a); return DONE; },
    build(world, a, st) {
      const b = world.buildings.get(st.bid); if (!b) return FAIL; if (!Bld().nearBuilding(world, a, b, 1.8)) return FAIL;
      if (b.progress >= 1) return DONE; if (!Bld().materialsComplete(b)) { Bld().deliver(world, b, a); if (!Bld().materialsComplete(b)) return FAIL; }
      const finished = Bld().work(world, b, a); if (finished) { a.counters.built++; return DONE; }
      st.t = (st.t || 0) + 1; return st.t > 400 ? DONE : RUN;
    },
    refuel(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; return Bld().refuel(world, b, a) ? DONE : FAIL; },
    craft(world, a, st, plan) {
      const R = LW.Tech.RECIPES[st.recipe]; if (!R) return FAIL;
      if (!st.started) {
        if (R.nearby === 'fire') { const f = world.buildingsNear(a.x | 0, a.y | 0, 2).find((b) => b.kind === 'campfire' && b.lit); if (!f) return FAIL; }
        else if (R.nearby && R.nearby !== 'water') { const DEFS = Bld().DEFS; const nb = world.buildingsNear(a.x | 0, a.y | 0, 3).find((b) => b.progress >= 1 && (b.kind === R.nearby || DEFS[b.kind][R.nearby])); if (!nb) return FAIL; }
        let inp = R.inp; if (R.inpAny) inp = R.inpAny.find((o) => { for (const k in o) if ((a.inv[k] || 0) < o[k]) return false; return true; }); if (!inp) return FAIL;
        for (const k in inp) if ((a.inv[k] || 0) < inp[k]) return FAIL;
        for (const k in inp) A().removeItem(a, k, inp[k]); st.started = true; st.t = 0;
      }
      st.t++; if (st.t < Math.max(1, Math.round(R.ticks * (1 - a.skills.crafting * 0.4) / (1 + LW.Tech.fx(world, a).craft + LW.Tree.buildingBonus(world, a.x, a.y, 'craft', 4))))) return RUN;
      for (const k in R.out) { const add = A().addItem(world, a, k, R.out[k]); if (add < R.out[k]) { world.ground = world.ground || new Map(); const i = world.idx(a.x | 0, a.y | 0); const g = world.ground.get(i) || {}; g[k] = (g[k] || 0) + (R.out[k] - add); world.ground.set(i, g); } }
      A().practice(a, 'crafting', 3); a.counters.crafted = (a.counters.crafted || 0) + 1;
      if (LW.ITEMS[Object.keys(R.out)[0]].tool) { A().memory(world, a, { type: 'craft', text: `készítettem: ${LW.ITEMS[Object.keys(R.out)[0]].label.toLowerCase()}`, importance: 0.4, emotion: 'pride', intensity: 0.4 }); world.events.emit('ItemCrafted', { tick: world.tick, agentId: a.id, item: Object.keys(R.out)[0], first: !world.firsts || !world.firsts['item:' + Object.keys(R.out)[0]] }); }
      LW.Tech.accident(world, a, R.tag); return DONE;
    },
    experiment(world, a, st) {
      st.t = (st.t || 0) + 1; if (st.t < st.n) return RUN;
      const d = LW.Tech.D[st.tech]; if (!d) return FAIL;
      if (d.nearby === 'fire' && !world.buildingsNear(a.x | 0, a.y | 0, 2).find((b) => b.kind === 'campfire' && b.lit)) return FAIL;
      if (!LW.Tech.hasItems(a, d)) return FAIL;
      a.counters.experiments++; const ok = LW.Tech.attempt(world, a, st.tech);
      if (!ok) A().memory(world, a, { type: 'experiment', text: `próbáltam (${d.name.toLowerCase()}), nem sikerült`, importance: 0.15, emotion: 'stress', intensity: 0.2 });
      return DONE;
    },
    dig(world, a, st) {
      if (!near(world, a, st.i, 1.8)) return FAIL; st.t = (st.t || 0) + 1; if (st.t < st.n) return RUN;
      const t = world.tiles, i = st.i, dt = t.depType[i]; A().practice(a, 'gathering', 2);
      if (dt && t.depAmt[i] > 0) {
        const item = dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling') ? null : LW.DEPOSIT_ITEM[dt]; if (item) { const q = Math.min(t.depAmt[i], Math.round(world.rng.int(1, 3) * (1 + LW.Tech.fx(world, a).mine))); const add = A().addItem(world, a, item, q); t.depAmt[i] -= add; if (t.depKnown[i] < 2) { t.depKnown[i] = 2; world.dirtyTiles.add(i); } const name = LW.DEPOSIT_NAME[dt]; if (['copper', 'tin', 'iron', 'coal', 'gold'].includes(name) && !a.knowledge.techs.has('ore_lore_' + name)) { LW.Tech.learn(world, a, 'ore_lore_' + name, 'observation'); world.events.emit('ResourceFound', { tick: world.tick, agentId: a.id, tile: i, deposit: name, first: !world.firsts || !world.firsts['deposit:' + name] }); A().memory(world, a, { type: 'find', text: `kiástam: ${LW.ITEMS[item].label.toLowerCase()}`, importance: 0.6, emotion: 'excitement', intensity: 0.5 }); } if (dt === LW.DEPOSIT.CLAY) LW.Tech.observe(world, a, 'clay'); }
        if (t.depAmt[i] <= 0) { t.depType[i] = 0; A().forgetPlace(a, 'deposit', i); A().forgetPlace(a, 'clay', i); }
      } else { if (world.rng.chance(0.3)) A().addItem(world, a, 'stone', 1); if (t.biome[i] === LW.BIOME.MARSH && world.rng.chance(0.6)) { A().addItem(world, a, 'clay', 2); LW.Tech.observe(world, a, 'clay'); } }
      return DONE;
    },
    give(world, a, st) {
      const t = world.agents.get(st.target); if (!t || LW.dist(a.x, a.y, t.x, t.y) > 1.8) return FAIL;
      let item = st.item; if (item === '*food') item = A().foodInInventory(a); if (!item || !(a.inv[item] > 0)) return FAIL;
      const n = Math.min(st.n || 1, a.inv[item]); const moved = A().addItem(world, t, item, n); if (moved > 0) { A().removeItem(a, item, moved); LW.Social.gift(world, a, t, item, moved); }
      return DONE;
    },
    pickup(world, a, st) {
      if (!world.ground || !near(world, a, st.i, 1.8)) return FAIL; const g = world.ground.get(st.i); if (!g) return DONE;
      for (const k of Object.keys(g)) {
        const d = LW.ITEMS[k] || { weight: 1 };
        // hungry: eat straight from the pile
        if (d.food && a.needs.food < 0.7) { while (g[k] > 0 && a.needs.food < 0.95) { g[k]--; a.needs.food = Math.min(1, a.needs.food + d.food); if (d.water) a.needs.water = Math.min(1, a.needs.water + d.water); a.lastMeal = world.tick; } if (g[k] <= 0) { delete g[k]; continue; } }
        let add = A().addItem(world, a, k, g[k]); if (add === 0 && d.food && A().makeRoom(world, a, d.weight)) add = A().addItem(world, a, k, g[k]);
        g[k] -= add; if (g[k] <= 0) delete g[k];
      }
      if (!Object.keys(g).length) world.ground.delete(st.i); return DONE;
    },
    plant(world, a, st) { const b = world.buildings.get(st.bid); if (!b || b.progress < 1 || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; let seeds = 2; for (const k of ['roots', 'berries']) { while (seeds > 0 && (a.inv[k] || 0) > 0) { A().removeItem(a, k, 1); seeds--; } } if (seeds > 0) return FAIL; b.planted = true; b.crop = 0; A().practice(a, 'farming', 3); a.counters.farmed = (a.counters.farmed || 0) + 1; return DONE; },
    take(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !b.storage || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const have = b.storage[st.item] || 0; if (have <= 0) return FAIL; const q = Math.min(have, st.n || 1); const add = A().addItem(world, a, st.item, q); b.storage[st.item] -= add; if (b.storage[st.item] <= 0) delete b.storage[st.item]; return add > 0 ? DONE : FAIL; },
    harvest(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !b.planted || b.crop < 1 || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL; const def = Bld().def(b); const i = world.idx(b.x, b.y); const q = Math.round(((def.yieldBase || 30) + world.tiles.fert[i] / 255 * 30) * (1 + LW.Tech.fx(world, a).farm)); /* egy szántó egy családot etet, nem egy vacsorát */ const cropItem = def.cropItem || 'grain'; const add = A().addItem(world, a, cropItem, q); if (add < q) { world.ground = world.ground || new Map(); const g = world.ground.get(i) || {}; g[cropItem] = (g[cropItem] || 0) + (q - add); world.ground.set(i, g); } b.planted = !!def.perennial; b.crop = 0; if (!def.perennial) world.tiles.fert[i] = Math.max(20, world.tiles.fert[i] - 12); A().practice(a, 'farming', 4); a.counters.farmed = (a.counters.farmed || 0) + 2; world.events.emit('Harvest', { tick: world.tick, agentId: a.id, amount: q, tile: i, first: !world.firsts || !world.firsts['harvest'] }); return DONE; },
  };

  const Actions = {
    OPS,
    step(world, a) {
      const p = a.plan; if (!p || p.done) return;
      if (p.paused) { p.paused--; return; }
      if (a.engagedUntil > world.tick && !(p.steps[p.i] && p.steps[p.i].op === 'interact')) return;
      if (world.tick - p.startedTick > 700) { p.done = true; return; }
      const st = p.steps[p.i]; if (!st) { p.done = true; return; }
      const fn = OPS[st.op]; if (!fn) { p.done = true; return; }
      let res; try { res = fn(world, a, st, p); } catch (e) { if (world.onError) world.onError(e, a, st); res = FAIL; }
      if (res === DONE) { p.i++; if (p.i >= p.steps.length) { p.done = true; if (a.sleeping) a.sleeping = false; } }
      else if (res === FAIL) { p.done = true; p.failed = true; if (a.sleeping) a.sleeping = false; }
    },
    describe(world, a) {
      const p = a.plan; if (!p || p.done) return 'gondolkodik';
      const st = p.steps[p.i]; if (!st) return 'gondolkodik';
      const g = LW.Brain.describeGoal(p.goal); const item = (k) => (LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k);
      switch (st.op) {
        case 'moveTo': return `úton van (${g})`; case 'gather': return `gyűjt: ${item(st.item)}`; case 'hunt': return 'vadászik'; case 'fish': return 'halászik'; case 'sleep': return 'alszik'; case 'interact': return st.kind === 'converse' ? 'beszélget' : st.kind === 'flirt' ? 'flörtöl' : st.kind === 'mate' ? 'együtt van a párjával' : st.kind === 'fight' ? 'verekszik' : st.kind === 'teach' ? 'tanít' : st.kind;
        case 'build': case 'buildNew': case 'deliver': return `épít: ${LW.Buildings.DEFS[p.kind] ? LW.Buildings.DEFS[p.kind].label.toLowerCase() : ''}`; case 'craft': return `készít: ${st.recipe && LW.Tech.RECIPES[st.recipe] ? item(Object.keys(LW.Tech.RECIPES[st.recipe].out)[0]) : st.recipe}`; case 'experiment': return `kísérletezik: ${LW.Tech.D[st.tech].name.toLowerCase()}`; case 'dig': return 'ás'; case 'flee': return 'menekül'; case 'wait': return st.at === 'fire' ? 'a tűznél ül' : st.at === 'mourning' ? 'gyászol' : st.at === 'shelter' ? 'fedél alatt vár' : st.at === 'huddling' ? 'összebújva melegszik' : 'pihen'; case 'follow': return 'a szülőjét követi';
        default: return g;
      }
    },
  };
  LW.Actions = Actions;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/social.js ===== */
/* LEVENTE — THE CREATOR · agents/social.js — conversations, knowledge spread, rumors, romance, gifts, fights, breakups */
(function (LW) {
  'use strict';
  const A = () => LW.Agents, R = () => LW.Relationships, M = () => LW.Memory;
  const b01 = (v) => LW.clamp01(v);

  const Social = {
    interact(world, a, t, kind, st) {
      const ra = R().ensure(world, a, t), rt = R().ensure(world, t, a); ra.last = world.tick; rt.last = world.tick;
      switch (kind) {
        case 'converse': return this.converse(world, a, t, ra, rt);
        case 'flirt': return this.flirt(world, a, t, ra, rt);
        case 'mate': return this.mate(world, a, t, ra, rt);
        case 'fight': return this.fight(world, a, t, ra, rt);
        case 'teach': return this.teach(world, a, t, st.tech, ra, rt);
      }
    },
    converse(world, a, t, ra, rt) {
      const comp = R().compatibility(a, t); const humor = (a.personality.humor + t.personality.humor) / 2;
      a.needs.social = b01(a.needs.social + 0.35 * (0.6 + a.personality.sociability * 0.6)); t.needs.social = b01(t.needs.social + 0.3 * (0.6 + t.personality.sociability * 0.6));
      const wasFriend = ra.friendship >= 0.3;
      const dF = 0.03 * (0.5 + comp) * (1 + humor) - (ra.resentment > 0.4 ? 0.02 : 0);
      ra.friendship = b01(ra.friendship + dF); rt.friendship = b01(rt.friendship + dF * (0.8 + t.personality.empathy * 0.4)); ra.trust = b01(ra.trust + 0.01); rt.trust = b01(rt.trust + 0.01); ra.familiarity = b01(ra.familiarity + 0.05); rt.familiarity = b01(rt.familiarity + 0.05);
      a.emotions.joy = b01(a.emotions.joy + 0.05 * (1 + humor)); t.emotions.joy = b01(t.emotions.joy + 0.05 * (1 + humor)); a.emotions.loneliness *= 0.6; t.emotions.loneliness *= 0.6;
      a.counters.talks++; t.counters.talks++;
      if (!wasFriend && ra.friendship >= 0.3 && ra.status === 'stranger') { ra.status = 'acquaintance'; }
      if (ra.friendship >= 0.3 && rt.friendship >= 0.3 && ra.status !== 'family' && ra.status !== 'partner' && ra.status !== 'dating' && !ra.friendEvent) { ra.friendEvent = true; rt.friendEvent = true; world.events.emit('FriendshipFormed', { tick: world.tick, agentId: a.id, otherId: t.id, first: !world.firsts || !world.firsts['friendship'] }); }
      // szavak: aki beszél, szót talál vagy mutogat; a másik tanul, néha visszaszól
      LW.Speech.say(world, a, t); if (world.rng.chance(0.6)) LW.Speech.say(world, t, a);
      // knowledge transfer, either direction (a közös nyelv segít)
      this.transfer(world, a, t, ra); this.transfer(world, t, a, rt);
      // where things are: people tell each other about places
      for (const [x, y] of [[a, t], [t, a]]) { const pl = [...x.knowledge.places.values()]; for (let k = 0; k < 3 && pl.length; k++) { const p = world.rng.pick(pl); if (p.k !== 'fire') A().rememberPlace(world, y, p.k, p.i, p.q); } }
      // rumors & stories
      if (world.rng.chance(0.5)) { const m = M().pickToTell(world, a); if (m) M().tell(world, a, t, m); }
      if (world.rng.chance(0.35)) { const m = M().pickToTell(world, t); if (m) M().tell(world, t, a, m); }
      // beliefs drift toward the more convinced
      for (const [x, y] of [[a, t], [t, a]]) if (x.beliefs.creator > y.beliefs.creator + 0.1) y.beliefs.creator = b01(y.beliefs.creator + 0.04 * (x.beliefs.creator - y.beliefs.creator) * (0.5 + x.personality.sociability));
      A().practice(a, 'social', 1); A().practice(t, 'social', 1);
      world.events.emit('Conversation', { tick: world.tick, agentId: a.id, otherId: t.id, importance: 0.05 });
    },
    transfer(world, teller, listener, r) {
      const cand = [...teller.knowledge.techs].filter((id) => !listener.knowledge.techs.has(id) && !LW.Tech.D[id].hidden && (!LW.Tech.D[id].prereq || LW.Tech.D[id].prereq.every((p) => listener.knowledge.techs.has(p))));
      const hidden = [...teller.knowledge.techs].filter((id) => !listener.knowledge.techs.has(id) && LW.Tech.D[id].hidden);
      if (hidden.length && world.rng.chance(0.3)) LW.Tech.learn(world, listener, world.rng.pick(hidden), 'taught', teller);
      if (!cand.length) return;
      const id = world.rng.pick(cand); const d = LW.Tech.D[id]; const cfg = world.cfg.social;
      const p = cfg.conversationTransferBase * (0.5 + teller.personality.sociability) * (0.5 + listener.personality.intelligence) * (0.5 + r.friendship) * (1 - d.difficulty * 0.5) * (0.5 + 0.5 * LW.Speech.intelligibility(teller, listener)) * LW.Tech.mult(world, teller, 'teach') * (1 + LW.Tree.buildingBonus(world, teller.x, teller.y, 'teach', 14));
      if (world.rng.chance(p)) LW.Tech.learn(world, listener, id, 'taught', teller);
      else listener.knowledge.progress[id] = Math.min(0.95, (listener.knowledge.progress[id] || 0) + world.cfg.tech.hintProgress);
    },
    flirt(world, a, t, ra, rt) {
      a.counters.flirts++; const cfg = world.cfg.social; const kin = R().kinship(world, a, t); ra.lastFlirt = world.tick; rt.lastFlirt = world.tick;
      let p = 0.25 + rt.attraction * 0.6 + rt.friendship * 0.2 + (t.emotions.joy - t.emotions.sadness) * 0.15 - t.emotions.shame * 0.2 + (t.needs.affection < 0.4 ? 0.15 : 0) - rt.resentment * 0.5;
      if (t.partner != null && t.partner !== a.id) p -= 0.25 + 0.5 * t.personality.loyalty;
      if (kin >= 0.9 || rt.attraction < 0.15) p = 0; else if (kin >= 0.5) p *= 0.5;
      const firstTime = rt.romance === 0 && ra.romance === 0;
      if (world.rng.chance(b01(p))) {
        ra.romance = b01(ra.romance + 0.2 + 0.1 * ra.attraction); rt.romance = b01(rt.romance + 0.15 + 0.1 * rt.attraction);
        ra.attraction = b01(ra.attraction + 0.04); rt.attraction = b01(rt.attraction + 0.05);
        for (const x of [a, t]) { x.emotions.love = b01(x.emotions.love + 0.15); x.emotions.joy = b01(x.emotions.joy + 0.15); x.emotions.excitement = b01(x.emotions.excitement + 0.2); x.needs.affection = b01(x.needs.affection + 0.2); x.needs.social = b01(x.needs.social + 0.15); }
        if (firstTime) world.events.emit('Courtship', { tick: world.tick, agentId: a.id, otherId: t.id, importance: 0.2 });
        M().add(world, a, { type: 'romance', text: `flörtöltem: ${t.name}`, importance: 0.35, emotion: 'love', intensity: 0.4, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `${a.name} flörtölt velem`, importance: 0.35, emotion: 'love', intensity: 0.4, subjects: [a.id] });
        if (ra.romance >= cfg.datingThreshold && rt.romance >= cfg.datingThreshold && ra.status !== 'dating' && ra.status !== 'partner') this.startDating(world, a, t, ra, rt);
        else if (ra.status === 'dating' && ra.romance >= cfg.partnerThreshold && rt.romance >= cfg.partnerThreshold && world.tick - ra.datingSince > LW.TIME.TICKS_PER_DAY * 8) { const leaves = (x, other, rx) => { if (x.partner == null || x.partner === other.id) return true; const cur = x.relationships.get(x.partner); return !cur || (rx.attraction > cur.attraction + 0.2 && cur.friendship < 0.5 && x.personality.loyalty < 0.6); }; if (leaves(a, t, ra) && leaves(t, a, rt)) this.becomePartners(world, a, t, ra, rt); }
      } else {
        ra.romance = Math.max(0, ra.romance - 0.1); ra.resentment = b01(ra.resentment + 0.05 * (1 - a.personality.patience)); rt.attraction = Math.max(0, rt.attraction - 0.03);
        a.emotions.shame = b01(a.emotions.shame + 0.3); a.emotions.sadness = b01(a.emotions.sadness + 0.15);
        M().add(world, a, { type: 'rejection', text: `elutasított: ${t.name}`, importance: 0.45, emotion: 'shame', intensity: 0.5, subjects: [t.id] });
        world.events.emit('Rejection', { tick: world.tick, agentId: a.id, otherId: t.id, importance: 0.12 });
      }
    },
    startDating(world, a, t, ra, rt) {
      ra.status = 'dating'; rt.status = 'dating'; ra.datingSince = world.tick; rt.datingSince = world.tick;
      for (const x of [a, t]) { x.emotions.love = b01(x.emotions.love + 0.4); x.emotions.joy = b01(x.emotions.joy + 0.3); }
      M().add(world, a, { type: 'romance', text: `járni kezdtünk: ${t.name}`, importance: 0.75, emotion: 'love', intensity: 0.7, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `járni kezdtünk: ${a.name}`, importance: 0.75, emotion: 'love', intensity: 0.7, subjects: [a.id] });
      world.events.emit('CoupleFormed', { tick: world.tick, agentId: a.id, otherId: t.id, stage: 'dating', first: !world.firsts || !world.firsts['love'] });
    },
    becomePartners(world, a, t, ra, rt) {
      if (a.partner != null && a.partner !== t.id) this.breakup(world, a, world.agents.get(a.partner), 'másért ment el');
      if (t.partner != null && t.partner !== a.id) this.breakup(world, t, world.agents.get(t.partner), 'másért ment el');
      a.partner = t.id; t.partner = a.id; ra.status = 'partner'; rt.status = 'partner'; ra.loyalty = b01(ra.loyalty + 0.3); rt.loyalty = b01(rt.loyalty + 0.3);
      // share a home
      const ha = a.home != null ? world.buildings.get(a.home) : null, ht = t.home != null ? world.buildings.get(t.home) : null;
      if (ha && !ht) LW.Buildings.moveIn(world, ha, t); else if (ht && !ha) LW.Buildings.moveIn(world, ht, a); else if (ha && ht && ha.id !== ht.id) { const better = (LW.Buildings.def(ha).capacity || 0) >= (LW.Buildings.def(ht).capacity || 0) ? ha : ht; LW.Buildings.moveIn(world, better, better === ha ? t : a); }
      for (const x of [a, t]) { x.emotions.love = 1; x.emotions.joy = b01(x.emotions.joy + 0.4); x.needs.affection = 1; }
      M().add(world, a, { type: 'romance', text: `párom lett: ${t.name}`, importance: 0.85, emotion: 'love', intensity: 0.85, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `párom lett: ${a.name}`, importance: 0.85, emotion: 'love', intensity: 0.85, subjects: [a.id] });
      world.events.emit('CoupleFormed', { tick: world.tick, agentId: a.id, otherId: t.id, stage: 'partners', first: !world.firsts || !world.firsts['partners'] });
    },
    breakup(world, a, t, reason) {
      if (!t) { a.partner = null; return; }
      const ra = R().ensure(world, a, t), rt = R().ensure(world, t, a);
      if (a.partner === t.id) a.partner = null; if (t.partner === a.id) t.partner = null;
      ra.status = 'ex'; rt.status = 'ex'; ra.romance = 0; rt.romance = 0; ra.loyalty *= 0.5; rt.loyalty *= 0.5;
      rt.resentment = b01(rt.resentment + 0.6); ra.resentment = b01(ra.resentment + 0.2); ra.lastFlirt = world.tick + LW.TIME.TICKS_PER_DAY * 60; rt.lastFlirt = world.tick + LW.TIME.TICKS_PER_DAY * 60;
      t.emotions.sadness = b01(t.emotions.sadness + 0.6); t.emotions.grief = b01(t.emotions.grief + 0.3); a.emotions.sadness = b01(a.emotions.sadness + 0.3);
      // the non-owner leaves the shared home
      if (a.home != null && a.home === t.home) { const h = world.buildings.get(a.home); if (h) LW.Buildings.moveOut(world, h.ownerId === a.id ? t : a); }
      M().add(world, a, { type: 'romance', text: `szakítottam vele: ${t.name} (${reason})`, importance: 0.7, emotion: 'sadness', intensity: 0.6, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `${a.name} elhagyott (${reason})`, importance: 0.8, emotion: 'grief', intensity: 0.75, subjects: [a.id] });
      world.events.emit('CoupleBroke', { tick: world.tick, agentId: a.id, otherId: t.id, reason, first: !world.firsts || !world.firsts['breakup'] });
    },
    mate(world, a, t, ra, rt) {
      if (!A().isAdult(world, a) || !A().isAdult(world, t)) return;
      for (const x of [a, t]) { x.needs.affection = 1; x.emotions.love = b01(x.emotions.love + 0.25); x.emotions.joy = b01(x.emotions.joy + 0.2); x.emotions.stress *= 0.7; }
      ra.loyalty = b01(ra.loyalty + 0.02); rt.loyalty = b01(rt.loyalty + 0.02); ra.attraction = b01(ra.attraction + 0.01); rt.attraction = b01(rt.attraction + 0.01);
      const f = a.sex === 'f' ? a : t.sex === 'f' ? t : null, m = a.sex === 'm' ? a : t.sex === 'm' ? t : null;
      if (f && m) A().conceive(world, f, m);
    },
    fight(world, a, t, ra, rt) {
      const rng = world.rng;
      const str = (x) => x.personality.bravery * 0.3 + x.personality.aggression * 0.3 + x.health * 0.3 + x.genes.appearance.build * 0.2 + (x.inv.spear ? 0.3 : 0) + rng.f() * 0.4;
      const sa = str(a), stt = str(t); const winner = sa >= stt ? a : t, loser = winner === a ? t : a;
      const rw = winner === a ? ra : rt, rl = winner === a ? rt : ra;
      const dmg = 0.12 + rng.f() * 0.3 * (winner.inv.spear ? 1.4 : 1);
      world.events.emit('ConflictOccurred', { tick: world.tick, agentId: a.id, otherId: t.id, winnerId: winner.id, first: !world.firsts || !world.firsts['conflict'] });
      A().damage(world, loser, dmg, `verekedés (${winner.name})`); A().damage(world, winner, dmg * 0.25, `verekedés (${loser.name})`);
      if (!world.agents.has(loser.id)) { winner.counters.kills++; winner.emotions.shame = b01(winner.emotions.shame + 0.5 * winner.personality.empathy); world.events.emit('Killing', { tick: world.tick, agentId: winner.id, otherId: loser.id, first: !world.firsts || !world.firsts['murder'] }); for (const o of world.agents.values()) { if (o.id === winner.id) continue; const rr = o.relationships.get(loser.id); const close = o.parents.includes(loser.id) || loser.parents.includes(o.id) ? 1 : rr ? Math.max(rr.friendship, rr.romance) : 0; if (close > 0.3) { const ro = R().ensure(world, o, winner); ro.resentment = b01(ro.resentment + close * 0.6); ro.fear = b01(ro.fear + 0.3); } } }
      else { rl.fear = b01(rl.fear + 0.4); rl.resentment = b01(rl.resentment + 0.2); loser.emotions.anger = b01(loser.emotions.anger + 0.2); }
      winner.emotions.anger = Math.max(0, winner.emotions.anger - 0.5); winner.emotions.pride = b01(winner.emotions.pride + 0.2); rw.resentment = Math.max(0, rw.resentment - 0.3); rw.respect = Math.max(0, rw.respect - 0.1);
      for (const o of world.agentsNear(a.x, a.y, 6)) { if (o === a || o === t) continue; o.emotions.fear = b01(o.emotions.fear + 0.2); M().add(world, o, { type: 'witness', text: `láttam, ahogy ${a.name} és ${t.name} összeverekedett`, importance: 0.4, emotion: 'fear', intensity: 0.4, subjects: [a.id, t.id] }); }
      M().add(world, winner, { type: 'fight', text: `megverekedtem vele és győztem: ${loser.name}`, importance: 0.5, emotion: 'pride', intensity: 0.5, subjects: [loser.id] });
      if (world.agents.has(loser.id)) M().add(world, loser, { type: 'fight', text: `megverekedtem vele és vesztettem: ${winner.name}`, importance: 0.6, emotion: 'anger', intensity: 0.6, subjects: [winner.id] });
    },
    teach(world, a, t, tech, ra, rt) {
      const d = LW.Tech.D[tech]; if (!d || t.knowledge.techs.has(tech)) return;
      const p = 0.5 * (0.5 + a.personality.sociability) * (0.5 + t.personality.intelligence) * (1 - d.difficulty * 0.5) * (a.children.includes(t.id) ? 1.3 : 1);
      if (world.rng.chance(p)) LW.Tech.learn(world, t, tech, 'taught', a); else t.knowledge.progress[tech] = Math.min(0.95, (t.knowledge.progress[tech] || 0) + 0.3);
      rt.gratitude = b01(rt.gratitude + 0.1); rt.respect = b01(rt.respect + 0.1); ra.friendship = b01(ra.friendship + 0.02); rt.friendship = b01(rt.friendship + 0.03);
      a.needs.social = b01(a.needs.social + 0.2); t.needs.social = b01(t.needs.social + 0.2); a.emotions.pride = b01(a.emotions.pride + 0.1);
    },
    gift(world, a, t, item, n) {
      const ra = R().ensure(world, a, t), rt = R().ensure(world, t, a);
      rt.gratitude = b01(rt.gratitude + 0.3); rt.trust = b01(rt.trust + 0.05); rt.friendship = b01(rt.friendship + 0.05); ra.friendship = b01(ra.friendship + 0.02);
      a.emotions.joy = b01(a.emotions.joy + 0.1); a.emotions.pride = b01(a.emotions.pride + 0.1); t.emotions.joy = b01(t.emotions.joy + 0.15);
      const label = LW.ITEMS[item] ? LW.ITEMS[item].label.toLowerCase() : item;
      M().add(world, t, { type: 'gift', text: `${a.name} adott nekem: ${label}`, importance: 0.4, emotion: 'joy', intensity: 0.4, subjects: [a.id] });
      world.events.emit('Gift', { tick: world.tick, agentId: a.id, otherId: t.id, item, n, importance: 0.1 });
      if (LW.ITEMS[item] && LW.ITEMS[item].food && A().stage(world, t) !== 'infant' && t.needs.food < 0.6) A().eat(world, t, item);
    },
    /** Rövid szóváltás: aki egymás mellett dolgozik, ül a tűznél, az beszél is — terv nélkül, gyakran. */
    ambient(world, a) {
      if (a.sleeping || a.engagedUntil > world.tick || LW.Agents.stage(world, a) === 'infant') return;
      const near = world.agentsNear(a.x, a.y, 1.8, a.id); if (!near.length) return;
      const t = near[world.rng.int(0, near.length - 1)]; if (t.sleeping || t.engagedUntil > world.tick || LW.Agents.stage(world, t) === 'infant') return;
      const ra = R().ensure(world, a, t), rt = R().ensure(world, t, a);
      if (world.tick - (ra.lastChat || -1000) < 12) return;
      if (!world.rng.chance(0.25 * (0.4 + a.personality.sociability) * (ra.resentment > 0.6 ? 0.2 : 1))) return;
      ra.lastChat = world.tick; rt.lastChat = world.tick; ra.familiarity = b01(ra.familiarity + 0.01); rt.familiarity = b01(rt.familiarity + 0.01); ra.friendship = b01(ra.friendship + 0.003); rt.friendship = b01(rt.friendship + 0.003);
      a.needs.social = b01(a.needs.social + 0.06); t.needs.social = b01(t.needs.social + 0.05); a.emotions.loneliness *= 0.9; t.emotions.loneliness *= 0.9;
      a.facing = t.x > a.x ? 1 : 0; t.facing = a.x > t.x ? 1 : 0;
      LW.Speech.say(world, a, t); if (world.rng.chance(0.5)) LW.Speech.say(world, t, a);
    },
    /** Daily: breakups, dating time-outs. */
    daily(world, a) {
      if (a.partner != null) {
        const t = world.agents.get(a.partner); if (!t) { a.partner = null; return; }
        const r = R().ensure(world, a, t); const cfg = world.cfg.social;
        let p = 0; if (r.resentment > r.friendship + cfg.breakupResentment) p += 0.25 * (1 - a.personality.patience); if (r.attraction < 0.15 && r.friendship < 0.3) p += 0.03; if (r.jealousy > 0.7) p += 0.2 * (1 - a.personality.patience);
        if (p > 0 && world.rng.chance(p)) this.breakup(world, a, t, r.jealousy > 0.6 ? 'féltékenység' : 'neheztelés');
      }
      for (const [id, r] of a.relationships) if (r.status === 'dating' && world.tick - r.last > LW.TIME.TICKS_PER_DAY * 60) { r.status = 'acquaintance'; r.romance = 0; const t = world.agents.get(id); if (t) { const rt = t.relationships.get(a.id); if (rt && rt.status === 'dating') { rt.status = 'acquaintance'; rt.romance = 0; } } }
    },
  };
  LW.Social = Social;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== settlements/settlements.js ===== */
/* LEVENTE — THE CREATOR · settlements/settlements.js — settlements are detected, never spawned (SIMULATION_MODEL.md §5) */
(function (LW) {
  'use strict';
  const TIERS = ['camp', 'hamlet', 'village', 'town', 'city', 'metropolis'];

  const Settlements = {
    tierOf(world, dwellings) { let tier = null; for (const [name, min] of world.cfg.settlements.tiers) if (dwellings >= min) tier = name; return tier; },
    tierRank(name) { return TIERS.indexOf(name); },
    detect(world) {
      const R = world.cfg.settlements.clusterRadius;
      const dw = [...world.buildings.values()].filter((b) => LW.Buildings.def(b).dwelling && b.progress >= 1 && b.residents.length > 0);
      // union-find
      const parent = dw.map((_, i) => i); const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      for (let i = 0; i < dw.length; i++) for (let j = i + 1; j < dw.length; j++) if (LW.dist(dw[i].x, dw[i].y, dw[j].x, dw[j].y) <= R) { const a = find(i), b = find(j); if (a !== b) parent[a] = b; }
      const clusters = new Map();
      for (let i = 0; i < dw.length; i++) { const r = find(i); if (!clusters.has(r)) clusters.set(r, []); clusters.get(r).push(dw[i]); }
      const seen = new Set();
      for (const list of clusters.values()) {
        const dwellings = list.length;
        let pop = 0, cx = 0, cy = 0; const ids = new Set(); for (const b of list) { pop += b.residents.length; cx += b.x; cy += b.y; ids.add(b.id); } cx /= dwellings; cy /= dwellings;
        // match an existing settlement by shared buildings, else by proximity
        let match = null, best = 0; for (const s of world.settlements.values()) { let n = 0; for (const id of s.buildingIds) if (ids.has(id)) n++; if (n > best) { best = n; match = s; } }
        if (!match) { let bd = R * 1.5; for (const s of world.settlements.values()) { if (seen.has(s.id)) continue; const d = LW.dist(cx, cy, s.x, s.y); if (d < bd) { bd = d; match = s; } } }
        const tier = this.tierOf(world, dwellings);
        if (!match) {
          if (!tier) { for (const b of list) b.settlementId = null; continue; } // a single household is not yet a place
          const founder = this.founder(world, list);
          const s = { id: world.nextIds.settlement++, name: world.language.place(), foundedTick: world.tick, founderId: founder ? founder.id : null, tier, peakTier: tier, x: cx, y: cy, buildingIds: [...ids], population: pop, dwellings, peakPopulation: pop, history: [], emptySince: -1, abandonedTick: null };
          world.settlements.set(s.id, s); match = s;
          if (founder) { founder.achievements.push(`${s.name} alapítója`); founder.importance += 1; LW.Agents.memory(world, founder, { type: 'settlement', text: `a táborunk neve lett: ${s.name}`, importance: 0.8, emotion: 'pride', intensity: 0.7 }); }
          world.events.emit('SettlementFounded', { tick: world.tick, settlementId: s.id, name: s.name, tier, agentId: founder ? founder.id : undefined, tile: world.idx(cx | 0, cy | 0), first: !world.firsts || !world.firsts['settlement'] });
        } else {
          if (match.abandonedTick) { match.abandonedTick = null; world.events.emit('SettlementResettled', { tick: world.tick, settlementId: match.id, name: match.name, tile: world.idx(cx | 0, cy | 0) }); }
          const cur = tier || 'camp';
          if (this.tierRank(cur) > this.tierRank(match.peakTier || match.tier)) { match.history.push({ tick: world.tick, tier: cur }); match.peakTier = cur; world.events.emit('SettlementGrew', { tick: world.tick, settlementId: match.id, name: match.name, tier: cur, prev: match.tier, tile: world.idx(cx | 0, cy | 0), first: !world.firsts || !world.firsts['tier:' + cur] }); }
          match.tier = cur; match.x = cx; match.y = cy; match.buildingIds = [...ids]; match.population = pop; match.dwellings = dwellings; match.peakPopulation = Math.max(match.peakPopulation, pop); match.emptySince = -1;
        }
        for (const b of list) b.settlementId = match.id; seen.add(match.id);
      }
      // a place is abandoned only after standing empty for a season
      for (const s of world.settlements.values()) {
        if (seen.has(s.id) || s.abandonedTick) continue;
        const nearby = world.agentsNear(s.x, s.y, R * 1.5).length;
        if (nearby > 0) { s.emptySince = -1; s.population = nearby; continue; }
        if (s.emptySince < 0) s.emptySince = world.tick;
        else if (world.tick - s.emptySince > LW.TIME.TICKS_PER_DAY * 90) { s.abandonedTick = world.tick; s.population = 0; world.events.emit('SettlementAbandoned', { tick: world.tick, settlementId: s.id, name: s.name, tile: world.idx(s.x | 0, s.y | 0) }); }
      }
      // mark shade for animals (settled area pressure)
      for (const b of world.buildings.values()) if (b.settlementId) { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = b.x + dx, y = b.y + dy; if (world.inBounds(x, y)) world.tiles.shade[world.idx(x, y)] = 1; } }
    },
    founder(world, list) { let best = null, ba = -1; for (const b of list) { const o = world.agents.get(b.ownerId); if (o) { const age = LW.Agents.age(world, o); if (age > ba) { ba = age; best = o; } } } return best; },
    at(world, x, y) { let best = null, bd = 12; for (const s of world.settlements.values()) { if (s.abandonedTick) continue; const d = LW.dist(x, y, s.x, s.y); if (d < bd) { bd = d; best = s; } } return best; },
    largest(world) { let best = null; for (const s of world.settlements.values()) if (!s.abandonedTick && (!best || s.population > best.population)) best = s; return best; },
  };
  LW.Settlements = Settlements;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== language/speech.js ===== */
/* LEVENTE — THE CREATOR · language/speech.js
 * Kialakuló nyelvek. Senki nem kap szavakat: aki mondani akar valamit és nincs rá szava,
 * kitalál egyet; a hallgató megtanulja (néha elrontja); a csoportok szava lassan eltér,
 * és ha két település már nem érti egymást, két nyelv lesz belőle. Aki neheztel a
 * Teremtőre, titkos szavakat sugdos, hogy a hang ne értse. A Teremtő a saját szótárát
 * hallgatózással építi (isteni füllel minden nem titkos szót ért). (spec §60–§61)
 */
(function (LW) {
  'use strict';
  const T = LW.TIME;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // fogalom → magyar jelentés (a szavak ezekre a fogalmakra születnek)
  const CONCEPTS = {
    i: 'én', you: 'te', we: 'mi', they: 'ők', person: 'ember', child: 'gyerek', mother: 'anya', father: 'apa', friend: 'barát', partner: 'pár', love: 'szeretet', stranger: 'idegen', enemy: 'ellenség', name: 'név',
    water: 'víz', food: 'étel', berries: 'bogyó', roots: 'gyökér', meat: 'hús', fish: 'hal', wood: 'fa', stone: 'kő', flint: 'kova', fire: 'tűz', home: 'otthon', tool: 'szerszám', spear: 'lándzsa', hide: 'bőr', clay: 'agyag', grain: 'gabona', salt: 'só',
    river: 'folyó', lake: 'tó', sea: 'tenger', forest: 'erdő', hill: 'domb', mountain: 'hegy', rain: 'eső', storm: 'vihar', snow: 'hó', cold: 'hideg', warm: 'meleg', night: 'éjszaka', day: 'nappal', sun: 'nap', moon: 'hold', wind: 'szél', animal: 'állat', beast: 'vad', danger: 'veszély',
    go: 'menni', come: 'jönni', give: 'adni', take: 'venni', eat: 'enni', drink: 'inni', sleep: 'aludni', build: 'építeni', make: 'csinálni', hunt: 'vadászni', gather: 'gyűjteni', look: 'nézni', know: 'tudni', teach: 'tanítani', help: 'segíteni', fight: 'harcolni', speak: 'beszélni', want: 'akarni',
    good: 'jó', bad: 'rossz', big: 'nagy', small: 'kicsi', many: 'sok', none: 'semmi', yes: 'igen', no: 'nem', here: 'itt', there: 'ott', far: 'messze', near: 'közel', new: 'új', old: 'régi',
    death: 'halál', birth: 'születés', spirit: 'szellem', creator: 'teremtő', sky: 'ég', voice: 'hang', secret: 'titok',
  };
  const ROLE = {}; for (const c of ['i', 'you', 'we', 'they', 'person', 'child', 'mother', 'father', 'friend', 'partner', 'stranger', 'enemy']) ROLE[c] = 'S'; for (const c of ['go', 'come', 'give', 'take', 'eat', 'drink', 'sleep', 'build', 'make', 'hunt', 'gather', 'look', 'know', 'teach', 'help', 'fight', 'speak', 'want']) ROLE[c] = 'V';
  const GOAL_CONCEPTS = {
    eat: ['i', 'eat', 'food'], drink: ['i', 'drink', 'water'], sleep: ['i', 'sleep', 'night'], getWarm: ['cold', 'fire', 'warm'], careForChild: ['child', 'give', 'food'], shareFood: ['you', 'take', 'food'], followParent: ['mother', 'go'], socialize: ['you', 'friend', 'good'], flirt: ['you', 'good', 'love'], mate: ['love', 'you'], stockpile: ['gather', 'food', 'many', 'cold'], buildShelter: ['we', 'build', 'home'], helpBuild: ['help', 'build', 'home'], makeFire: ['make', 'fire'], tendFire: ['fire', 'wood'], craft: ['make', 'tool', 'stone'], experiment: ['make', 'new', 'know'], dig: ['stone', 'take', 'here'], farm: ['grain', 'make', 'many'], explore: ['go', 'far', 'there', 'look'], fight: ['bad', 'enemy', 'fight'], teach: ['know', 'teach', 'you'], pickup: ['take', 'here'], mourn: ['death', 'bad'], rest: ['sleep', 'here'], flee: ['danger', 'go', 'beast'], divine: ['voice', 'sky', 'creator'],
  };
  const STARTER = ['i', 'you', 'water', 'food', 'go', 'good', 'danger', 'fire', 'no', 'here'];
  const CONS_POOL = ['m', 'n', 'l', 'r', 'k', 't', 's', 'v', 'd', 'th', 'sh', 'h', 'b', 'g', 'z', 'f', 'p', 'y', 'w', 'ch', 'kh', 'ny', 'rr'];
  const VOW_POOL = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'ei', 'ou', 'y'];

  const Speech = {
    CONCEPTS, GOAL_CONCEPTS,
    gloss(c) { return CONCEPTS[c] || c; },
    /** Régi mentések és új világok: nyelvi állapot biztosítása. */
    init(world) {
      if (!world.langs) world.langs = new Map();
      if (!world.creatorLexicon) world.creatorLexicon = {};
      if (!world.creatorSettings) world.creatorSettings = { divineEar: true, obedience: 'full' };
      if (world.creatorSettings.obedience == null) world.creatorSettings.obedience = 'full';
      if (!world.chatLog) world.chatLog = [];
      if (!world.speechLog) world.speechLog = [];
      if (!world.langs.size) { const L = world.language; this.newLang(world, { cons: L.cons, vows: L.vows, patterns: L.patterns, founderId: null }); }
      if (world.nextIds.lang == null) world.nextIds.lang = Math.max(1, ...[...world.langs.keys()]) + 1;
      for (const a of world.agents.values()) { if (!a.vocab) a.vocab = {}; if (a.langId == null || !world.langs.has(a.langId)) a.langId = this.firstLang(world).id; if (a.beliefs && a.beliefs.trust == null) a.beliefs.trust = 0; }
      if (!world._speechHooked) { world._speechHooked = true; world.events.on('StrangerArrived', (ev) => { const a = world.agents.get(ev.agentId); if (a) this.foreignTongue(world, a); }); }
    },
    firstLang(world) { let best = null; for (const l of world.langs.values()) if (!best || l.id < best.id) best = l; return best; },
    lang(world, id) { return world.langs.get(id) || this.firstLang(world); },
    newLang(world, o) {
      const rng = world.rng; const id = world.nextIds.lang == null ? 1 : world.nextIds.lang++; if (world.nextIds.lang == null) world.nextIds.lang = 2;
      const cons = o.cons ? o.cons.slice() : pickN(rng, CONS_POOL, rng.int(6, 11)), vows = o.vows ? o.vows.slice() : pickN(rng, VOW_POOL, rng.int(3, 6));
      const l = { id, name: null, cons, vows, patterns: o.patterns ? o.patterns.slice() : rng.pick([['CV', 'CVC', 'V'], ['CV', 'CVC'], ['CV', 'V', 'VC'], ['CVC', 'CV', 'CVV']]), order: o.order || rng.weighted(['SOV', 'SVO', 'VSO'], [5, 4, 1]), words: o.words ? { ...o.words } : {}, parent: o.parent ?? null, born: world.tick, founderId: o.founderId ?? null, speakers: 0, secret: 0, place: o.place || null };
      world.langs.set(id, l); return l;
    },
    syllable(rng, l) { const p = rng.pick(l.patterns); let s = ''; for (const ch of p) s += ch === 'C' ? rng.pick(l.cons) : rng.pick(l.vows); return s; },
    /** Új szó egy fogalomra: a nyelv hangkészletéből, ütközés nélkül. */
    coin(world, l, concept, avoid) {
      const rng = world.rng; const taken = new Set(Object.values(l.words)); if (avoid) for (const c in avoid) taken.add(avoid[c].w);
      for (let k = 0; k < 12; k++) { const n = rng.chance(0.55) ? 1 : 2; let w = ''; for (let i = 0; i < n; i++) w += this.syllable(rng, l); w = w.replace(/(.)\1\1+/g, '$1$1'); if (w.length >= 2 && !taken.has(w)) return w; }
      return this.syllable(rng, l) + this.syllable(rng, l) + rng.pick(l.vows);
    },
    /** Hangváltozás: egy hang cserélődik, lekopik vagy hozzáragad. */
    mutate(rng, l, w) {
      const r = rng.f(); const i = rng.int(0, w.length - 1); const ch = w[i]; const isV = /[aeiouy]/.test(ch);
      if (r < 0.6) return w.slice(0, i) + (isV ? rng.pick(l.vows.filter((v) => v.length === 1).concat(['a'])) : rng.pick(l.cons.filter((c) => c.length === 1).concat(['n']))) + w.slice(i + 1);
      if (r < 0.8 && w.length > 3) return w.slice(0, -1);
      return w + rng.pick(l.vows.filter((v) => v.length === 1).concat(['a']));
    },
    /** Idegen a peremen túlról: saját nyelv, néhány kész szóval. */
    foreignTongue(world, a) {
      const l = this.newLang(world, { founderId: a.id }); a.langId = l.id; a.vocab = a.vocab || {};
      const n = world.rng.int(6, 10); const cs = world.rng.shuffle(Object.keys(CONCEPTS).filter((c) => STARTER.includes(c) || world.rng.chance(0.15))).slice(0, n);
      for (const c of cs) { const w = this.coin(world, l, c, a.vocab); a.vocab[c] = { w, s: 0 }; l.words[c] = w; }
      l.speakers = 1;
    },
    // ---------------- miről beszélnek
    topics(world, a, t) {
      const rng = world.rng; const out = []; const add = (c) => { if (c && CONCEPTS[c] && !out.includes(c)) out.push(c); };
      const g = a.plan && !a.plan.done ? a.plan.goal : null; const gc = GOAL_CONCEPTS[g]; if (gc) for (const c of rng.shuffle(gc.slice()).slice(0, 2)) add(c);
      const N = a.needs, E = a.emotions; const dyn = [];
      if (N.food < 0.35) dyn.push('food'); if (N.water < 0.35) dyn.push('water'); if (N.warmth < 0.4) dyn.push('cold'); if (E.fear > 0.4) dyn.push('danger'); if (E.grief > 0.4) dyn.push('death'); if (E.love > 0.5) dyn.push('love'); if (E.anger > 0.5) dyn.push('bad'); if (E.joy > 0.6) dyn.push('good');
      const ws = world.weather && world.weather.state; const cold = world.tileTemp(world.idx(a.x | 0, a.y | 0)) < 0; if (ws === 'rain') dyn.push(cold ? 'snow' : 'rain'); else if (ws === 'storm') dyn.push(cold ? 'snow' : 'storm');
      if (LW.Time.isNight(world.tick)) dyn.push('night');
      const recentDivine = a.memory.episodic.length && a.memory.episodic.slice(-6).some((m) => m.divine && world.tick - m.tick < T.TICKS_PER_DAY * 3); if (recentDivine) dyn.push(rng.pick(['voice', 'sky', 'creator']));
      if (t && a.partner === t.id) dyn.push('partner'); if (t && a.children.includes(t.id)) dyn.push('child'); if (t && t.langId !== a.langId) dyn.push('stranger');
      if (a.inv.spear) dyn.push('spear'); if (a.home != null) dyn.push('home');
      for (const c of rng.shuffle(dyn).slice(0, rng.int(1, 2))) add(c);
      if (!out.length) add(rng.pick(['you', 'good', 'here', 'look', 'i']));
      if (out.length < 2 && rng.chance(0.6)) add(rng.pick(['you', 'i', 'we', 'good', 'here']));
      return out.slice(0, 4);
    },
    /** Egy megszólalás: a beszélő szavai (vagy mutogatás), a hallgató tanul, a szó vándorol. */
    say(world, a, t, concepts) {
      const rng = world.rng; const l = this.lang(world, a.langId); a.vocab = a.vocab || {};
      const cs = concepts || this.topics(world, a, t);
      const words = [], gestures = [];
      for (const c of cs) {
        let v = a.vocab[c];
        if (!v) { if (rng.chance(0.55 * (0.4 + a.personality.creativity * 0.8 + a.personality.sociability * 0.3))) { const w = this.coin(world, l, c, a.vocab); v = a.vocab[c] = { w, s: 0 }; world.events.emit('WordCoined', { tick: world.tick, agentId: a.id, word: w, concept: c, langId: l.id }); } else { gestures.push(c); continue; } }
        words.push([c, v.w, v.s ? 1 : 0]);
      }
      // szórend a nyelv szerint
      const key = (x) => { const r = ROLE[x[0]] || 'O'; return l.order === 'SOV' ? (r === 'S' ? 0 : r === 'O' ? 1 : 2) : l.order === 'VSO' ? (r === 'V' ? 0 : r === 'S' ? 1 : 2) : (r === 'S' ? 0 : r === 'V' ? 1 : 2); };
      words.sort((x, y) => key(x) - key(y));
      // titkos szavak: aki neheztel a hangra, és a társa is, új szavakat sugdos
      if (t && words.length && a.beliefs.creator > 0.4 && a.beliefs.trust < -0.25 && t.beliefs.trust < -0.1 && (a.lastSecretTick == null || world.tick - a.lastSecretTick > T.TICKS_PER_DAY * 20) && rng.chance(0.2)) {
        let n = 0; for (const wd of rng.shuffle(words.slice()).slice(0, 2)) { const c = wd[0]; const w = this.coin(world, l, c, a.vocab); a.vocab[c] = { w, s: 1 }; t.vocab[c] = { w, s: 1 }; wd[1] = w; wd[2] = 1; n++; }
        if (n) { a.lastSecretTick = world.tick; t.lastSecretTick = world.tick; world.events.emit('SecretTongue', { tick: world.tick, agentId: a.id, otherId: t.id, n }); }
      }
      // tanulás
      if (t) { const r = t.relationships.get(a.id); for (const [c, w, s] of words) this.learn(world, t, a, c, w, s, r); }
      this.grammar(world, l); const fl = this.fluency(world, a);
      const utt = { t: world.tick, a: a.id, b: t ? t.id : null, l: l.id, w: words, g: gestures, f: Math.round(fl * 100) / 100, p: fl > 0.5 && l.particle && words.length >= 3 ? l.particle : null, q: null };
      if (words.some((x) => x[0] === 'many') && l.plural) utt.pl = l.plural;
      a.lastSaid = utt; world.speechLog.push(utt); if (world.speechLog.length > 80) world.speechLog.splice(0, world.speechLog.length - 80);
      world.events.emit('Utterance', { tick: world.tick, agentId: a.id, otherId: t ? t.id : null, utt });
      return utt;
    },
    learn(world, listener, speaker, c, w, s, r) {
      const rng = world.rng; listener.vocab = listener.vocab || {}; const have = listener.vocab[c]; const ll = this.lang(world, listener.langId);
      const young = LW.Time.ageYears(listener.bornTick, world.tick) < 14; const fam = r ? r.familiarity : 0;
      if (!have) { if (rng.chance(0.45 * (0.5 + listener.personality.intelligence) * (young ? 1.4 : 1) * (0.7 + fam * 0.6))) { const mut = rng.chance(0.04 * (1.6 - listener.personality.intelligence)); listener.vocab[c] = { w: mut ? this.mutate(rng, ll, w) : w, s }; } }
      else if (have.w !== w) { const p = 0.1 * (0.4 + (r ? r.respect + r.friendship * 0.5 : 0) + speaker.personality.dominance * 0.5) * (young ? 1.5 : 1); if (rng.chance(clamp(p, 0, 0.5))) listener.vocab[c] = { w, s: s || have.s }; }
      // idegen nyelvű beszélő szavait tanulva az ember lassan átáll arra a nyelvre, amelyiket a többség körülötte beszéli
      if (speaker.langId !== listener.langId && rng.chance(0.03)) { const near = world.agentsNear(listener.x, listener.y, 12, listener.id); let same = 0, other = 0; for (const o of near) { if (o.langId === speaker.langId) other++; else if (o.langId === listener.langId) same++; } if (other > same + 1) listener.langId = speaker.langId; }
    },
    /** Mennyire folyékony a beszéde (0–1): szókincs, gyakorlat, a nyelv érettsége. Ezt tanulják, ha beszélnek. */
    fluency(world, a) {
      const l = world.langs.get(a.langId); const words = Object.keys(a.vocab || {}).length; const talks = a.counters ? a.counters.talks : 0;
      const f = Math.min(1, words / 40) * 0.55 + Math.min(1, talks / 120) * 0.25 + Math.min(1, (l ? Object.keys(l.words).length : 0) / 60) * 0.2;
      return Math.max(0, Math.min(1, f));
    },
    /** Egy nyelv nyelvtani apróságai a szókincs növekedésével: kötőszó-szócska, kérdő-szócska, többes jel. */
    grammar(world, l) {
      const n = Object.keys(l.words).length;
      if (!l.particle && n >= 20) l.particle = this.syllable(world.rng, l);
      if (!l.plural && n >= 32) l.plural = this.syllable(world.rng, l).replace(/^(.)/, (m) => m);
      if (!l.question && n >= 45) l.question = this.syllable(world.rng, l);
      return l;
    },
    /** Két ember mennyire érti egymást (0–1). Kevés szóval még a mutogatás is elég. */
    intelligibility(a, b) {
      if (!a.vocab || !b.vocab) return 1; let common = 0, same = 0; for (const c in a.vocab) { const v = b.vocab[c]; if (!v) continue; common++; if (v.w === a.vocab[c].w) same++; }
      if (common < 4) return 1; return same / common;
    },
    // ---------------- napi: konszenzus, nevek, szakadás, gyerekek, imák
    daily(world) {
      const rng = world.rng; const cfgA = world.cfg.agents;
      // gyerekek a nevelőiktől tanulnak
      for (const a of world.agents.values()) {
        if (LW.Time.ageYears(a.bornTick, world.tick) >= cfgA.adultAge) continue; a.vocab = a.vocab || {};
        const cg = LW.Agents.caregivers(world, a).concat(LW.Agents.household(world, a).filter((o) => o !== a)); if (!cg.length) continue;
        const c = rng.pick(cg); if (!c.vocab) continue; const ks = Object.keys(c.vocab).filter((k) => !a.vocab[k]); if (!ks.length) continue; a.langId = c.langId;
        for (const k of rng.shuffle(ks).slice(0, 2)) if (rng.chance(0.5)) a.vocab[k] = { w: c.vocab[k].w, s: c.vocab[k].s };
      }
      // konszenzus nyelvenként
      const counts = new Map(); for (const l of world.langs.values()) { l.speakers = 0; l.secret = 0; counts.set(l.id, {}); }
      for (const a of world.agents.values()) { const l = world.langs.get(a.langId); if (!l) continue; l.speakers++; const cnt = counts.get(l.id); for (const c in a.vocab) { const v = a.vocab[c]; const m = cnt[c] || (cnt[c] = {}); m[v.w] = (m[v.w] || 0) + 1; if (v.s) l.secret++; } }
      for (const l of world.langs.values()) {
        // holt nyelv: akinek két éve nincs élő beszélője, az a krónikában marad, a világban nem (ezrek gyűltek fel)
        if (!l.speakers) { if (!l.diedTick) l.diedTick = world.tick; else if (world.tick - l.diedTick > T.TICKS_PER_YEAR * 2 && world.langs.size > 1) { world.langs.delete(l.id); world.deadLangs = (world.deadLangs || 0) + 1; if (l.name && (l.speakersMax || 0) >= 3) world.events.emit('LanguageDied', { tick: world.tick, name: l.name, langId: l.id }); } continue; }
        l.diedTick = 0; l.speakersMax = Math.max(l.speakersMax || 0, l.speakers);
        const cnt = counts.get(l.id); const words = {}; for (const c in cnt) { let bw = null, bn = 0; for (const w in cnt[c]) if (cnt[c][w] > bn) { bn = cnt[c][w]; bw = w; } if (bw) words[c] = bw; }
        if (l.speakers > 0) l.words = words;
        if (!l.name && l.speakers >= 2 && Object.keys(l.words).length >= 10) { const base = l.words.we || l.words.person || l.words.speak || l.words[Object.keys(l.words)[0]]; l.name = base[0].toUpperCase() + base.slice(1); const st = this.homeOf(world, l); l.place = st ? st.name : null; world.events.emit('LanguageNamed', { tick: world.tick, name: l.name, langId: l.id, speakers: l.speakers, place: l.place, tile: st ? world.idx(st.x | 0, st.y | 0) : undefined }); }
      }
      // nyelvszakadás: ugyanannak a nyelvnek két települése már nem érti egymást
      if (world.tick % (T.TICKS_PER_DAY * 10) < T.TICKS_PER_DAY) this.splitCheck(world);
      // imák: aki hisz és bajban van, az éghez beszél
      for (const a of world.agents.values()) { if (a.beliefs.creator < 0.55 || a.sleeping) continue; const N = a.needs; const need = N.food < 0.25 ? 'food' : N.water < 0.25 ? 'water' : N.warmth < 0.3 ? 'warm' : a.emotions.grief > 0.6 ? 'death' : a.emotions.fear > 0.6 ? 'danger' : null; if (need && rng.chance(0.25)) this.say(world, a, null, [rng.pick(['creator', 'sky', 'voice']), a.beliefs.trust < -0.2 ? 'bad' : 'give', need]); }
    },
    homeOf(world, l) { const by = new Map(); for (const a of world.agents.values()) { if (a.langId !== l.id) continue; const s = LW.Settlements.at(world, a.x, a.y); if (!s) continue; by.set(s.id, (by.get(s.id) || 0) + 1); } let best = null, bn = 0; for (const [id, n] of by) if (n > bn) { bn = n; best = world.settlements.get(id); } return best; },
    splitCheck(world) {
      const groups = new Map(); // langId → settlementId → agents
      for (const a of world.agents.values()) { const s = LW.Settlements.at(world, a.x, a.y); if (!s || s.abandonedTick) continue; const g = groups.get(a.langId) || new Map(); groups.set(a.langId, g); const arr = g.get(s.id) || []; arr.push(a); g.set(s.id, arr); }
      let living = 0; for (const l of world.langs.values()) if (l.speakers > 0) living++;
      if (living >= 2 + world.population / 8) return; // a nyelvek száma a népességgel arányos: egy 800 fős világban sem lesz száz nyelv
      for (const [langId, g] of groups) {
        const sets = [...g.entries()].filter(([, arr]) => arr.length >= 3); if (sets.length < 2) continue;
        const parent = world.langs.get(langId); if (!parent) continue;
        const cons = (arr) => { const cnt = {}; for (const a of arr) for (const c in a.vocab) { const m = cnt[c] || (cnt[c] = {}); m[a.vocab[c].w] = (m[a.vocab[c].w] || 0) + 1; } const out = {}; for (const c in cnt) { let bw = null, bn = 0; for (const w in cnt[c]) if (cnt[c][w] > bn) { bn = cnt[c][w]; bw = w; } out[c] = bw; } return out; };
        const vocs = sets.map(([sid, arr]) => ({ sid, arr, v: cons(arr) }));
        for (let i = 0; i < vocs.length; i++) for (let j = i + 1; j < vocs.length; j++) {
          const A = vocs[i], B = vocs[j]; let common = 0, same = 0; for (const c in A.v) if (B.v[c]) { common++; if (A.v[c] === B.v[c]) same++; }
          if (common < 12 || same / common >= 0.45) continue;
          const small = A.arr.length <= B.arr.length ? A : B; const st = world.settlements.get(small.sid);
          const l = this.newLang(world, { cons: parent.cons, vows: parent.vows, patterns: parent.patterns, order: parent.order, words: small.v, parent: parent.id, place: st ? st.name : null });
          const base = small.v.we || small.v.person || small.v[Object.keys(small.v)[0]]; l.name = base[0].toUpperCase() + base.slice(1); l.speakers = small.arr.length;
          for (const a of small.arr) a.langId = l.id;
          world.events.emit('LanguageSplit', { tick: world.tick, name: l.name, langId: l.id, parentId: parent.id, place: st ? st.name : 'egy csoport', tile: st ? world.idx(st.x | 0, st.y | 0) : undefined });
          return; // évente legfeljebb néhány szakadás; a többi majd a következő ellenőrzéskor
        }
      }
    },
    // ---------------- a Teremtő füle
    lexKey(langId, w) { return `${langId}:${w}`; },
    known(world, langId, w) { return world.creatorLexicon[this.lexKey(langId, w)] || null; },
    /** Egy megszólalás olvasata a Teremtőnek: eredeti szavak + amit ért belőle. */
    render(world, utt) {
      const ear = world.creatorSettings && world.creatorSettings.divineEar; const parts = [], gl = []; let hidden = 0;
      const fl = utt.f == null ? 0.3 : utt.f; const sep = fl < 0.25 ? ' … ' : fl < 0.5 ? ' · ' : ' ';
      utt.w.forEach(([c, w, s], k) => { let word = w; if (utt.pl && c === 'many') word = w + utt.pl; parts.push(word); if (utt.p && k === 0 && utt.w.length >= 3) parts.push(utt.p); const kn = this.known(world, utt.l, w); const understood = kn || (ear && !s); gl.push(understood ? this.gloss(c) : '?'); if (!understood) hidden++; });
      for (const c of utt.g) { parts.push(`*${this.gestureWord(c)}*`); gl.push(this.gloss(c)); }
      return { text: parts.join(sep), gloss: gl.join(' '), hidden, full: hidden === 0, fluency: fl };
    },
    gestureWord(c) { return ({ i: 'magára mutat', you: 'rád mutat', we: 'körbemutat', here: 'a földre mutat', there: 'a távolba mutat', food: 'a szájához nyúl', eat: 'a szájához nyúl', water: 'ivást mímel', drink: 'ivást mímel', sleep: 'a fejét oldalra hajtja', cold: 'összehúzza magát', fire: 'a tűzre mutat', danger: 'hátrahőköl', go: 'int', come: 'magához int', big: 'széttárja a karját', small: 'két ujját közelíti', good: 'bólogat', bad: 'a fejét rázza', no: 'a fejét rázza', yes: 'bólint', love: 'a mellére teszi a kezét' })[c] || 'mutogat'; },
    /** A Teremtő hallgatózik: ha a szó a látható helyzethez illik, megtanulja. Csak a Teremtő hívja (megfigyelő nem). */
    decode(world, utt) {
      const a = world.agents.get(utt.a); if (!a) return []; const ctx = this.contextConcepts(world, a); const learned = [];
      for (const [c, w, s] of utt.w) { const k = this.lexKey(utt.l, w); if (world.creatorLexicon[k]) continue; const p = (ctx.has(c) ? 0.5 : 0.04) * (s ? 0.1 : 1); if (Math.random() < p) { world.creatorLexicon[k] = { c, t: world.tick, s }; learned.push([w, c]); } }
      return learned;
    },
    reveal(world, langId, w, c, s) { world.creatorLexicon[this.lexKey(langId, w)] = { c, t: world.tick, s: s ? 1 : 0, told: 1 }; },
    contextConcepts(world, a) {
      const s = new Set(); const p = a.plan; const st = p && !p.done ? p.steps[p.i] : null; const g = p ? p.goal : null; if (g && GOAL_CONCEPTS[g]) for (const c of GOAL_CONCEPTS[g]) s.add(c);
      if (st) { if (st.op === 'gather') { s.add('gather'); s.add(st.item === 'wood' ? 'wood' : st.item === 'stone' ? 'stone' : 'food'); if (st.item === 'berries') s.add('berries'); } if (st.op === 'consume') { s.add('eat'); s.add('food'); } if (st.op === 'drink') { s.add('drink'); s.add('water'); } if (st.op === 'sleep') s.add('sleep'); if (st.op === 'hunt') { s.add('hunt'); s.add('animal'); } if (st.op === 'fish') s.add('fish'); if (st.op === 'build' || st.op === 'deliver') { s.add('build'); s.add('home'); } if (st.op === 'flee') { s.add('danger'); s.add('go'); } }
      const N = a.needs; if (N.food < 0.35) s.add('food'); if (N.water < 0.35) s.add('water'); if (N.warmth < 0.4) s.add('cold'); if (a.emotions.fear > 0.4) s.add('danger'); if (a.emotions.grief > 0.4) s.add('death');
      const ws = world.weather && world.weather.state; const cold = world.tileTemp(world.idx(a.x | 0, a.y | 0)) < 0; if (ws === 'rain') s.add(cold ? 'snow' : 'rain'); if (ws === 'storm') s.add(cold ? 'snow' : 'storm'); if (LW.Time.isNight(world.tick)) s.add('night');
      for (const b of world.buildingsNear(a.x | 0, a.y | 0, 2)) if (b.kind === 'campfire' && b.lit) s.add('fire'); if (a.inv.spear) s.add('spear');
      return s;
    },
    /** A Teremtő szótára egy nyelvhez: [fogalom, szó, ismert?, titkos?] */
    dictionary(world, l) { const ear = world.creatorSettings && world.creatorSettings.divineEar; const out = []; const secret = new Set(); for (const a of world.agents.values()) if (a.langId === l.id) for (const c in a.vocab) if (a.vocab[c].s) secret.add(c); for (const c in l.words) { const w = l.words[c]; const k = this.known(world, l.id, w); const s = secret.has(c); out.push({ c, w, known: !!k || (ear && !s), secret: s, gloss: this.gloss(c) }); } out.sort((x, y) => x.gloss.localeCompare(y.gloss, 'hu')); return out; },
    describeLang(world, l) { return l.name ? `${l.name.toLowerCase()} nyelv` : l.parent ? 'új tájszólás' : l.speakers <= 1 && l.founderId != null ? 'idegen nyelv' : 'ősnyelv'; },
    // ---------------- mentés
    toJSON(world) { const used = new Set(); for (const a of world.agents.values()) used.add(a.langId); const langs = [...world.langs.values()].filter((l) => used.has(l.id) || (l.speakers || 0) > 0 || (world.tick - (l.diedTick || world.tick)) < T.TICKS_PER_YEAR * 2); return { langs, deadLangs: world.deadLangs || 0, lexicon: world.creatorLexicon, settings: world.creatorSettings, chatLog: world.chatLog.slice(-200), speechLog: world.speechLog.slice(-80) }; },
    fromJSON(world, j) { world.langs = new Map(); if (j) { for (const l of j.langs || []) world.langs.set(l.id, l); world.deadLangs = j.deadLangs || 0; { const used = new Set(); for (const a of world.agents.values()) used.add(a.langId); const dead = [...world.langs.values()].filter((l) => !used.has(l.id)); if (dead.length > 40 && world.langs.size > dead.length) { for (const l of dead) world.langs.delete(l.id); world.deadLangs += dead.length; } } /* régi mentések ezrével hordozták a holt nyelveket */ world.creatorLexicon = j.lexicon || {}; world.creatorSettings = j.settings || { divineEar: true }; world.chatLog = j.chatLog || []; world.speechLog = j.speechLog || []; } },
  };
  function pickN(rng, pool, n) { const items = pool.slice(); const out = []; while (out.length < n && items.length) { const i = rng.int(0, items.length - 1); out.push(items[i]); items.splice(i, 1); } return out; }
  LW.Speech = Speech;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== society/society.js ===== */
/* LEVENTE — THE CREATOR · society/society.js — a közösség napi rendszerei
 * Kutak (víz a településen), írott tudás (levéltár, könyvtár, nyomda, hálózat: a tudás nem hal meg a tudóval),
 * szentélyek és templomok (hit, félelem), piac (a felesleg a rászorulóhoz), vezetők, iskola, kórház, erőmű,
 * gyümölcsös és karám hozama, a Világmag. Minden naponta fut; a makró-szimulációban is.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME; const A = () => LW.Agents; const Bld = () => LW.Buildings;
  const b01 = (v) => LW.clamp01(v);

  const Society = {
    daily(world) {
      const w = world, rng = w.rng; const Bd = Bld().DEFS;
      { const t = w.tiles; const list = []; for (let i = 0; i < w.w * w.h; i++) if (t.depType[i] && t.depKnown[i]) list.push(i); w._knownDeposits = list; }
      const done = new Set();
      for (const b of w.buildings.values()) {
        if (b.progress < 1) continue; const def = Bd[b.kind]; if (!def) continue;
        const near = def.water || def.records || def.shrine || def.school || def.hospital || def.market || def.pasture || def.power || def.produce || def.joy || def.hygiene || def.spaceport || def.bank ? w.agentsNear(b.x + 0.5, b.y + 0.5, 12) : null;
        // termelő középület (méhes, halastó, üvegház, vertikális farm): évszaktól függetlenül a közös raktárba dolgozik
        if (def.produce && b.storage) { const cap = def.storage || 60; for (const k in def.produce) b.storage[k] = Math.min(cap, (b.storage[k] || 0) + def.produce[k] * (near.length ? 1 : 0.3)); }
        // erőmű: fény, meleg és gépek a környéken (a hatás a Tree.fx-ben); csatorna, víztorony: kevesebb kór
        if (def.hygiene) for (const a of near) { if (a.ill > 0 && rng.chance(0.1 * def.hygiene)) a.ill = Math.max(0, a.ill - 2); }
        // színház, stadion, mozi, múzeum: közös öröm; néha ünnep
        if (def.joy) { for (const a of near) { a.emotions.joy = b01(a.emotions.joy + 0.01 * def.joy); a.needs.social = b01(a.needs.social + 0.02); a.emotions.loneliness = Math.max(0, a.emotions.loneliness - 0.02); } if (near.length >= 6 && rng.chance(0.03) && w.tick - (b.lastShow || -1e9) > T.TICKS_PER_DAY * 20) { b.lastShow = w.tick; const s = LW.Settlements.at(w, b.x, b.y); w.events.emit('Festival', { tick: w.tick, place: s ? s.name : null, kind: b.kind, n: near.length, tile: w.idx(b.x, b.y) }); for (const a of near) { a.emotions.joy = b01(a.emotions.joy + 0.15); a.emotions.stress = Math.max(0, a.emotions.stress - 0.1); } } }
        // űrkikötő: indítások; ha van kolónia-tudás, néhányan elmennek, és nem jönnek vissza
        if (def.spaceport) LW.Frontier.spaceport(w, b, near);
        // kút: mindenki tudja a közelben, hogy itt víz van
        if (def.water) for (const a of near) A().rememberPlace(w, a, 'water', w.idx(b.x, b.y), 255);
        // írott tudás: aki tud írni, lejegyzi; aki tud olvasni, megtanulja
        if (def.records) {
          b.records = b.records || []; const writers = near.filter((a) => a.knowledge.techs.has('writing')); const recSet = new Set(b.records);
          for (const a of writers.slice(0, 12)) for (const id of a.knowledge.techs) { const d = LW.Tech.D[id]; if (!d || d.hidden || recSet.has(id)) continue; if (rng.chance(0.25 * def.records)) { b.records.push(id); recSet.add(id); if (!w.firsts['record']) w.events.emit('RecordWritten', { tick: w.tick, agentId: a.id, tech: id, buildingId: b.id, tile: w.idx(b.x, b.y) }); } }
          for (const a of writers) { if (a.knowledge.techs.size >= b.records.length || (a.knowledge.techs.size > 60 && rng.chance(0.5))) continue; const cand = b.records.filter((id) => !a.knowledge.techs.has(id) && LW.Tech.D[id] && (!LW.Tech.D[id].prereq || LW.Tech.D[id].prereq.every((p) => a.knowledge.techs.has(p)))); if (!cand.length) continue; const id = rng.pick(cand); if (rng.chance(0.05 * def.records * (0.5 + a.personality.intelligence) * LW.Tech.mult(w, a, 'teach'))) { LW.Tech.learn(w, a, id, 'read'); A().memory(w, a, { type: 'learn', text: `olvastam róla: ${LW.Tech.D[id].name.toLowerCase()}`, importance: 0.5, emotion: 'excitement', intensity: 0.4, tech: id }); } }
        }
        // szentély, templom: a hit rendeződik, a félelem csillapul; néha szertartás
        if (def.shrine) { for (const a of near) { a.beliefs.creator = b01(a.beliefs.creator + 0.004 * def.shrine); a.emotions.fear = Math.max(0, a.emotions.fear - 0.03); a.emotions.joy = b01(a.emotions.joy + 0.01); a.needs.social = b01(a.needs.social + 0.03); } if (near.length >= 3 && rng.chance(0.08) && w.tick - (b.lastRite || -1e9) > T.TICKS_PER_DAY * 12) { b.lastRite = w.tick; const s = LW.Settlements.at(w, b.x, b.y); w.events.emit('Ritual', { tick: w.tick, agentId: rng.pick(near).id, place: s ? s.name : null, n: near.length, tile: w.idx(b.x, b.y), temple: def.shrine >= 2 }); for (const a of near) { LW.Speech.say(w, a, null, [rng.pick(['creator', 'sky', 'voice']), rng.pick(['good', 'give', 'we'])]); a.beliefs.creator = b01(a.beliefs.creator + 0.05); } } }
        // iskola: a gyerekek nem csak a szüleiktől tanulnak
        if (def.school) { const adults = near.filter((a) => A().isAdult(w, a)); const kids = near.filter((a) => !A().isAdult(w, a) && A().stage(w, a) !== 'infant'); for (const k of kids) { if (!adults.length) break; const t = rng.pick(adults); const cand = [...t.knowledge.techs].filter((id) => !k.knowledge.techs.has(id) && !LW.Tech.D[id].hidden && (!LW.Tech.D[id].prereq || LW.Tech.D[id].prereq.every((p) => k.knowledge.techs.has(p)))); if (cand.length && rng.chance(0.12 * def.school * (0.5 + k.personality.intelligence))) LW.Tech.learn(w, k, rng.pick(cand), 'taught', t); } }
        // kórház
        if (def.hospital) for (const a of near) { a.injury = Math.max(0, a.injury - 0.03); a.health = Math.min(1 - a.injury, a.health + 0.04); }
        // piac: a felesleg a rászorulóhoz, a felesleg gazdája gazdagszik
        if (def.market || def.bank) this.market(w, b, near);
        // karám: tej és gyapjú; gyümölcsös termése a farm-lépésben
        if (def.pasture && b.ownerId != null) { const o = w.agents.get(b.ownerId); if (o) { const home = o.home != null ? w.buildings.get(o.home) : null; const st = home && home.storage ? home.storage : o.inv; if (rng.chance(0.6)) st.milk = Math.min((st.milk || 0) + 2, 12); if (rng.chance(0.15)) st.wool = Math.min((st.wool || 0) + 1, 20); if (rng.chance(0.06)) st.meat_raw = Math.min((st.meat_raw || 0) + 2, 10); if (rng.chance(0.08)) st.hide = Math.min((st.hide || 0) + 1, 12); } }
        // Világmag: ők is teremtettek
        if (def.simulation && !done.has('sim')) { done.add('sim'); b.worlds = (b.worlds || 0); if (rng.chance(0.02)) { b.worlds++; w.events.emit('WorldSimulated', { tick: w.tick, buildingId: b.id, n: b.worlds, tile: w.idx(b.x, b.y) }); } }
      }
      this.leaders(w);
      LW.Civilization.daily(w);
      LW.Frontier.daily(w);
      if (LW.Tree.futureStep) LW.Tree.futureStep(w);
    },
    market(w, b, near) {
      const rng = w.rng; const donors = [], needy = []; let trade = 0, welfare = false;
      for (const a of near) { const f = LW.Tech.fx(w, a); if (f.trade > trade) trade = f.trade; if (a.knowledge.techs.has('welfare_state')) welfare = true; const home = a.home != null ? w.buildings.get(a.home) : null; if (a.needs.food < 0.4 && A().foodUnits(a.inv) < 0.5) needy.push(a); else if (home && home.storage && A().foodUnits(home.storage) > 6 - Math.min(3, trade * 4)) donors.push({ a, st: home.storage }); }
      if (b.storage) donors.push({ a: null, st: b.storage }); // a piac és a bank közös készlete is oszt
      for (const n of needy) { if (!donors.length) break; const d = donors[rng.int(0, donors.length - 1)]; for (const k of Object.keys(d.st)) { const it = LW.ITEMS[k]; if (!it || !it.food || d.st[k] <= 0) continue; const q = Math.min(d.st[k], 2 + Math.round(trade * 2)); d.st[k] -= q; if (d.st[k] <= 0) delete d.st[k]; A().addItem(w, n, k, q); if (!welfare) n.wealth = (n.wealth || 0) - q; if (d.a) { d.a.wealth = (d.a.wealth || 0) + q + (trade > 0.3 ? 1 : 0); const r = LW.Relationships.ensure(w, n, d.a); r.gratitude = b01(r.gratitude + 0.05); } break; } }
      if (trade > 0 && rng.chance(Math.min(0.5, trade))) for (const a of near) if (A().isAdult(w, a) && (a.wealth || 0) > 2 && rng.chance(0.2)) a.wealth += 1; // a kereskedelem gazdagít
      b.trades = (b.trades || 0) + needy.length;
    },
    /** Vezetők: ahol van törzsi tanács, a legtekintélyesebb ember vezet. */
    leaders(w) {
      for (const s of w.settlements.values()) {
        if (s.abandonedTick) { s.leaderId = null; continue; }
        const people = w.agentsNear(s.x + 0.5, s.y + 0.5, w.cfg.settlements.clusterRadius + 6).filter((a) => A().isAdult(w, a));
        if (people.length < 4 || !people.some((a) => a.knowledge.techs.has('tribal_council'))) { s.leaderId = null; continue; }
        const cur = s.leaderId != null ? w.agents.get(s.leaderId) : null;
        // népuralom: ahol a többség ismeri, a vezetőt szavazással választják, négyévente újra
        const democracy = people.filter((a) => a.knowledge.techs.has('democracy')).length * 2 > people.length;
        if (democracy) { if (cur && people.includes(cur) && w.tick - (s.leaderSince || 0) < T.TICKS_PER_YEAR * 4) { cur.occupation = 'leader'; continue; } }
        else if (cur && people.includes(cur) && w.tick - (s.leaderSince || 0) < T.TICKS_PER_YEAR * 3 && w.rng.chance(0.97)) { cur.occupation = 'leader'; continue; }
        let best = null, bs = -1, votes = 0;
        if (democracy) { const tally = new Map(); for (const o of people) { let pick = null, ps = -1e9; for (const a of people) { if (a === o) continue; const r = o.relationships.get(a.id); const sc = (r ? r.respect + r.friendship * 0.6 + r.trust * 0.3 - r.resentment - (r.fear || 0) * 0.5 : 0) + a.personality.sociability * 0.2 + (a.id === s.leaderId ? 0.15 : 0) + w.rng.f() * 0.2; if (sc > ps) { ps = sc; pick = a; } } if (pick) tally.set(pick.id, (tally.get(pick.id) || 0) + 1); } for (const [id, n] of tally) if (n > bs) { bs = n; best = w.agents.get(id); } votes = bs; }
        else for (const a of people) { let respect = 0; for (const o of people) { const r = o.relationships.get(a.id); if (r) respect += r.respect + r.friendship * 0.5 - r.resentment; } const s2 = a.personality.dominance * 2 + a.personality.sociability + respect * 0.5 + Math.min(1, LW.Time.ageYears(a.bornTick, w.tick) / 50) + a.importance * 0.02 + (a.knowledge.techs.has('law_code') ? 0.5 : 0); if (s2 > bs) { bs = s2; best = a; } }
        if (best && (best.id !== s.leaderId || democracy)) { const re = best.id === s.leaderId; if (cur && cur.occupation === 'leader' && !re) cur.occupation = null; s.leaderId = best.id; s.leaderSince = w.tick; best.occupation = 'leader'; if (!re) { best.importance += 1; best.emotions.pride = b01(best.emotions.pride + 0.5); } if (democracy) w.events.emit('Election', { tick: w.tick, agentId: best.id, place: s.name, votes, of: people.length, again: re, tile: w.idx(s.x | 0, s.y | 0) }); else w.events.emit('LeaderChosen', { tick: w.tick, agentId: best.id, place: s.name, tile: w.idx(s.x | 0, s.y | 0) }); if (!re) A().memory(w, best, { type: 'status', text: democracy ? `${s.name} megválasztott vezetője lettem` : `${s.name} vezetője lettem`, importance: 0.9, emotion: 'pride', intensity: 0.8 }); }
      }
    },
    /** Szüksége van-e a közösségnek erre a középületre a közelben? (nincs még, elég ember van hozzá) */
    wants(world, a, kind) {
      const def = Bld().DEFS[kind]; if (!def || !def.public) return 0;
      if (def.tech && !a.knowledge.techs.has(def.tech)) return 0;
      const s = LW.Settlements.at(world, a.x, a.y); const pop = Math.max(s ? s.population : 0, world.agentsNear(a.x, a.y, 12, a.id).length + 1, Math.round(world.population * 0.7));
      if ((def.minPop || 1) > pop) return 0;
      for (const b of world.buildingsNear(a.x | 0, a.y | 0, 16)) if (b.kind === kind) { if (b.progress < 1) return 1.4; if (!def.bridge) return 0; } // a félkész középületet be kell fejezni; hídból több is kellhet
      if (def.bridge) return LW.Crossings.want(world, a, kind);
      let want = 0.5;
      if (def.want === 'trade') want += Math.min(1, (a.wealth || 0) / 10) * 0.6 + a.personality.greed * 0.4 + a.personality.ambition * 0.2; if (def.want === 'joy') want += (1 - a.emotions.joy) * 0.8 + a.emotions.stress * 0.4 + a.personality.sociability * 0.3;
      if (def.want === 'food') { want += (1 - a.needs.food) * 1.2 + 0.2; const hungry = world.agentsNear(a.x, a.y, 12, a.id).filter((o) => o.needs.food < 0.4).length; want += Math.min(0.6, hungry * 0.1); } if (def.want === 'water') want += (LW.Agents.nearestPoi(world, a, 'water') ? (LW.Agents.nearestPoi(world, a, 'water').d > 8 ? 0.6 : 0.1) : 1); if (def.want === 'belief') want += a.beliefs.creator * 0.8; if (def.want === 'knowledge') want += a.personality.curiosity * 0.6 + a.personality.intelligence * 0.3; if (def.want === 'health') want += (1 - a.health) * 0.8; if (def.want === 'safety') { want += (1 - a.needs.safety) * 0.5 + a.emotions.fear * 0.5; const s2 = LW.Settlements.at(world, a.x, a.y); if (s2 && (s2.warWith || (s2.rivalry && Object.values(s2.rivalry).some((v) => v > 0.5)))) want += 0.6; }
      if (def.furnace || def.workshop || def.lab || def.factory || def.computer) want += a.personality.creativity * 0.5 + a.personality.ambition * 0.3;
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
    },
  };
  LW.Society = Society;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== society/civilization.js ===== */
/* LEVENTE — THE CREATOR · society/civilization.js — járványok, kétely és a szimulációs hipotézis, államok és háború, vállalatok, a táguló világ
 * Minden naponta fut (részletes és makró-szimulációban is). Semmi sincs megírva: a járvány a sűrűségből, a kétely a
 * tudományból, a háború a vezetők és a népek feszültségéből, a vállalat a vagyonból, az új föld a hajózásból születik.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME; const A = () => LW.Agents; const b01 = (v) => LW.clamp01(v);

  const Civ = {
    daily(w) {
      this.disease(w); this.faith(w); this.polities(w); this.companies(w); this.growth(w);
    },
    // ---------------------------------------------------------------- járvány: aki beteg, fertőz; a sűrű település a kór otthona
    disease(w) {
      const rng = w.rng; const illBy = new Map();
      for (const a of w.agents.values()) {
        if (!(a.ill > 0)) continue;
        const fx = LW.Tech.fx(w, a).health; const hosp = LW.Tree.buildingBonus(w, a.x, a.y, 'hospital', 12);
        a.health = Math.max(0, a.health - 0.035 * (1 - Math.min(0.8, fx * 0.5 + hosp * 0.3)) * (a.needs.food < 0.3 ? 1.6 : 1)); a.emotions.stress = b01(a.emotions.stress + 0.05); a.needs.energy = Math.max(0, a.needs.energy - 0.15);
        a.ill--; if (a.ill <= 0) { a.ill = 0; a.immuneUntil = w.tick + T.TICKS_PER_DAY * 150; a.emotions.joy = b01(a.emotions.joy + 0.2); A().memory(w, a, { type: 'illness', text: 'meggyógyultam', importance: 0.35, emotion: 'joy', intensity: 0.4 }); }
        if (a.health <= 0) { A().die(w, a, 'betegség'); continue; }
        // fertőzés: háztartás és a közelben állók; a tisztaság, az oltás, a kórház véd
        const near = w.agentsNear(a.x, a.y, 2.2, a.id).concat(A().household(w, a).filter((o) => o !== a));
        for (const o of near) { if (o.ill > 0 || (o.immuneUntil || 0) > w.tick) continue; const p = 0.03 * (1 - o.genes.physiology.immunity * 0.6) * (1 - Math.min(0.85, LW.Tech.fx(w, o).health * 0.6 + LW.Tree.buildingBonus(w, o.x, o.y, 'hospital', 12) * 0.3)) * (o.needs.food < 0.35 ? 1.5 : 1); if (rng.chance(p)) { o.ill = rng.int(4, 10); o.injury = Math.min(0.8, o.injury + 0.15); A().memory(w, o, { type: 'illness', text: `elkaptam a kórt (${a.name})`, importance: 0.45, emotion: 'fear', intensity: 0.5, subjects: [a.id] }); w.events.emit('AgentIll', { tick: w.tick, agentId: o.id, from: a.id }); } }
        const s = LW.Settlements.at(w, a.x, a.y); if (s) illBy.set(s.id, (illBy.get(s.id) || 0) + 1);
      }
      for (const s of w.settlements.values()) {
        const n = illBy.get(s.id) || 0; const thr = Math.max(4, Math.round(s.population * 0.25));
        if (!s.epidemicSince && n >= thr) { s.epidemicSince = w.tick; s.epidemicPeak = n; w.events.emit('Epidemic', { tick: w.tick, place: s.name, n, tile: w.idx(s.x | 0, s.y | 0) }); for (const a of w.agentsNear(s.x + 0.5, s.y + 0.5, 12)) { a.emotions.fear = b01(a.emotions.fear + 0.4); if (a.beliefs.creator > 0.5) a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) - 0.05, -1, 1); } }
        else if (s.epidemicSince) { s.epidemicPeak = Math.max(s.epidemicPeak || 0, n); if (n <= 1) { w.events.emit('EpidemicEnded', { tick: w.tick, place: s.name, days: Math.round((w.tick - s.epidemicSince) / T.TICKS_PER_DAY), peak: s.epidemicPeak, tile: w.idx(s.x | 0, s.y | 0) }); s.epidemicSince = 0; } }
      }
    },
    // ---------------------------------------------------------------- hit és kétely: a tudomány magyaráz; a Világmag után a szimulációs hipotézis
    skepticism(w, a) { let s = 0; const K = a.knowledge.techs; if (K.has('scientific_method')) s += 0.3; if (K.has('universities')) s += 0.1; if (K.has('printing')) s += 0.1; if (K.has('astronomy')) s += 0.05; if (K.has('computer')) s += 0.1; if (K.has('internet')) s += 0.1; if (K.has('artificial_intelligence')) s += 0.1; return Math.min(0.85, s) * (0.6 + a.personality.intelligence * 0.6) * (1.2 - a.personality.optimism * 0.4); },
    faith(w) {
      const rng = w.rng; const known = w._knownAll || (w._knownAll = LW.Tech.worldKnowledge(w)); w._knownAll = null;
      const simKnown = known.has('world_simulation'); if (simKnown && !w.simKnownTick) w.simKnownTick = w.tick; let believers = 0, deniers = 0, adults = 0, hyp = 0;
      for (const a of w.agents.values()) {
        const sk = this.skepticism(w, a); if (sk > 0) { const recent = a.memory.episodic.length && a.memory.episodic.slice(-8).some((m) => m.divine && w.tick - m.tick < T.TICKS_PER_DAY * 30); if (!recent) a.beliefs.creator = b01(a.beliefs.creator - 0.0025 * sk); }
        if (!A().isAdult(w, a)) continue; adults++;
        if (simKnown || a.beliefs.simulation > 0) {
          const target = b01(0.35 + a.personality.curiosity * 0.35 + a.beliefs.creator * 0.25 - a.personality.dominance * 0.25 + (a.knowledge.techs.has('world_simulation') ? 0.25 : 0));
          a.beliefs.simulation = b01((a.beliefs.simulation || 0) + (target - (a.beliefs.simulation || 0)) * 0.02);
          if (a.beliefs.simulation > 0.6) believers++; else if (a.beliefs.simulation < 0.3) deniers++;
          if (!w.firsts['simhyp'] && a.beliefs.simulation > 0.6) w.events.emit('SimulationHypothesis', { tick: w.tick, agentId: a.id, tile: w.idx(a.x | 0, a.y | 0) });
          hyp++;
        }
      }
      if (simKnown && adults >= 10 && w.tick - w.simKnownTick > T.TICKS_PER_YEAR * 3 && w.tick - (w.simVerdictTick || -1e9) > T.TICKS_PER_YEAR * 5) { if (believers / adults > 0.5) { w.simVerdictTick = w.tick; w.events.emit('SimulationVerdict', { tick: w.tick, accepted: true, share: believers / adults }); } else if (deniers / adults > 0.5) { w.simVerdictTick = w.tick; w.events.emit('SimulationVerdict', { tick: w.tick, accepted: false, share: deniers / adults }); } }
    },
    // ---------------------------------------------------------------- államok és háború
    polities(w) {
      const rng = w.rng; const sets = [...w.settlements.values()].filter((s) => !s.abandonedTick && s.population >= 4);
      for (const s of sets) { const leader = s.leaderId != null ? w.agents.get(s.leaderId) : null; const stateKnown = leader && leader.knowledge.techs.has('law_code'); if (leader && stateKnown && !s.state) { s.state = true; w.events.emit('StateFounded', { tick: w.tick, place: s.name, agentId: leader.id, tile: w.idx(s.x | 0, s.y | 0) }); } if (s.polityId != null && !w.settlements.has(s.polityId)) s.polityId = null; }
      const pol = sets.filter((s) => s.leaderId != null && (s.polityId == null || s.polityId === s.id));
      for (let i = 0; i < pol.length; i++) for (let j = i + 1; j < pol.length; j++) {
        const a = pol[i], b = pol[j]; const d = LW.dist(a.x, a.y, b.x, b.y); if (d > 60) continue;
        a.rivalry = a.rivalry || {}; const key = String(b.id); let t = a.rivalry[key] || 0;
        if (a.warWith === b.id) { this.battle(w, a, b); continue; }
        const la = w.agents.get(a.leaderId), lb = w.agents.get(b.leaderId); if (!la || !lb) continue;
        const dom = (la.personality.dominance + lb.personality.dominance + la.personality.aggression + lb.personality.aggression) / 4;
        const rel = la.relationships.get(lb.id); const resent = rel ? rel.resentment - rel.friendship : 0.1;
        const sameLang = la.langId === lb.langId; const hunger = ((1 - la.needs.food) + (1 - lb.needs.food)) / 2;
        const markets = w.buildingsNear(a.x | 0, a.y | 0, 10).some((x) => x.kind === 'market') && w.buildingsNear(b.x | 0, b.y | 0, 10).some((x) => x.kind === 'market');
        const dip = ((LW.Tech.fx(w, la).diplomacy || 0) + (LW.Tech.fx(w, lb).diplomacy || 0)) / 2; // követek, szerződések, közös játékok, elrettentés
        t += 0.0025 * (dom * 1.5 + resent + hunger * 0.8) * Math.max(0.2, 1 - dip) - (sameLang ? 0.0012 : 0) - (markets ? 0.0015 : 0) - 0.0006 - dip * 0.001; t = LW.clamp(t, 0, 1.2);
        a.rivalry[key] = t;
        if (t >= 1 && !a.warWith && !b.warWith && rng.chance(0.2)) { a.warWith = b.id; b.warWith = a.id; a.warSince = w.tick; b.warSince = w.tick; a.warScore = 0; b.warScore = 0; w.events.emit('WarDeclared', { tick: w.tick, place: a.name, other: b.name, agentId: la.id, tile: w.idx(a.x | 0, a.y | 0) }); for (const p of w.agentsNear(a.x + 0.5, a.y + 0.5, 14).concat(w.agentsNear(b.x + 0.5, b.y + 0.5, 14))) { p.emotions.fear = b01(p.emotions.fear + 0.3); p.emotions.anger = b01(p.emotions.anger + 0.2); } }
      }
    },
    warriors(w, s) { return w.agentsNear(s.x + 0.5, s.y + 0.5, 14).filter((p) => A().isAdult(w, p) && p.health > 0.4 && (LW.Tree.bestTool(p, 'hunt') >= 1 || p.personality.bravery > 0.6)).sort((x, y) => (y.personality.bravery + LW.Tree.bestTool(y, 'hunt')) - (x.personality.bravery + LW.Tree.bestTool(x, 'hunt'))).slice(0, 14); },
    battle(w, a, b) {
      const rng = w.rng; if (!rng.chance(0.35)) return;
      const wa = this.warriors(w, a), wb = this.warriors(w, b);
      const wallOf = (s) => { let best = 0; for (const x of w.buildingsNear(s.x | 0, s.y | 0, 12)) { const d = LW.Buildings.DEFS[x.kind]; if (x.progress >= 1 && d && d.wall > best) best = d.wall; } return best; };
      const warOf = (s) => { const l = s.leaderId != null ? w.agents.get(s.leaderId) : null; return l ? (LW.Tech.fx(w, l).war || 0) : 0; }; // lovasság, tüzérség, páncélosok: az állam hadereje
      const str = (list, s) => list.reduce((acc, p) => acc + p.personality.bravery + p.personality.aggression * 0.5 + LW.Tree.bestTool(p, 'hunt') * 0.6 + p.health, 0) * rng.range(0.7, 1.3) * (1 + wallOf(s) * 0.25) * (1 + warOf(s)); // a fal védi az otthon harcolókat
      { const la = a.leaderId != null ? w.agents.get(a.leaderId) : null, lb = b.leaderId != null ? w.agents.get(b.leaderId) : null; if (la && lb && la.knowledge.techs.has('nuclear_weapons') && lb.knowledge.techs.has('nuclear_weapons') && rng.chance(0.06)) { this.nuclear(w, a, b); return; } }
      const sa = str(wa, a), sb = str(wb, b); const win = sa >= sb ? a : b, lose = win === a ? b : a; const wl = win === a ? wb : wa, ww = win === a ? wa : wb;
      for (const p of wl.slice(0, rng.int(1, 3))) { A().damage(w, p, rng.range(0.3, 0.95), `háború (${win.name})`); if (w.agents.has(p.id)) { p.emotions.fear = b01(p.emotions.fear + 0.4); A().memory(w, p, { type: 'war', text: `harcoltunk ${win.name} ellen, és vesztettünk`, importance: 0.7, emotion: 'fear', intensity: 0.7 }); } }
      for (const p of ww.slice(0, rng.int(0, 1))) A().damage(w, p, rng.range(0.2, 0.6), `háború (${lose.name})`);
      for (const p of ww) { if (!w.agents.has(p.id)) continue; p.emotions.pride = b01(p.emotions.pride + 0.15); for (const q of wl) { if (!w.agents.has(q.id)) continue; const r = LW.Relationships.ensure(w, q, p); r.resentment = b01(r.resentment + 0.2); r.fear = b01((r.fear || 0) + 0.15); } }
      win.warScore = (win.warScore || 0) + 1; w.events.emit('Battle', { tick: w.tick, place: win.name, other: lose.name, tile: w.idx(lose.x | 0, lose.y | 0) });
      const days = (w.tick - a.warSince) / T.TICKS_PER_DAY;
      if (win.warScore >= 4 || this.warriors(w, lose).length < 3 || days > 120) {
        const decisive = win.warScore >= 4 || this.warriors(w, lose).length < 3;
        a.warWith = null; b.warWith = null; a.rivalry = a.rivalry || {}; b.rivalry = b.rivalry || {}; a.rivalry[String(b.id)] = 0.3; b.rivalry[String(a.id)] = 0.3;
        if (decisive) { lose.polityId = win.id; const ll = lose.leaderId != null ? w.agents.get(lose.leaderId) : null; if (ll && ll.occupation === 'leader') ll.occupation = null; lose.leaderId = null; for (const p of w.agentsNear(lose.x + 0.5, lose.y + 0.5, 14)) { const wl2 = win.leaderId != null ? w.agents.get(win.leaderId) : null; if (wl2) { const r = LW.Relationships.ensure(w, p, wl2); r.fear = b01((r.fear || 0) + 0.3); r.resentment = b01(r.resentment + 0.3); } } }
        w.events.emit('WarEnded', { tick: w.tick, place: win.name, other: lose.name, decisive, tile: w.idx(win.x | 0, win.y | 0) });
      }
    },
    /** Atomcsapás: a háború egyetlen nap alatt véget ér, és senki sem nyer. A félelem nemzedékekre megmarad. */
    nuclear(w, a, b) {
      const rng = w.rng; const target = rng.chance(0.5) ? a : b; const other = target === a ? b : a;
      const victims = w.agentsNear(target.x + 0.5, target.y + 0.5, 12); let dead = 0;
      for (const p of victims) { if (rng.chance(0.45)) { A().damage(w, p, rng.range(0.6, 1.2), `atomcsapás (${other.name})`); if (!w.agents.has(p.id)) dead++; } else { p.injury = Math.min(0.9, p.injury + 0.3); p.ill = Math.max(p.ill || 0, rng.int(10, 40)); } }
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const x = (target.x | 0) + dx, y = (target.y | 0) + dy; if (!w.inBounds(x, y)) continue; const i = w.idx(x, y); if (dx * dx + dy * dy > 36) continue; w.tiles.burnt[i] = 255; w.tiles.veg[i] = 0; w.tiles.trees[i] = Math.min(w.tiles.trees[i], 10); w.tiles.fert[i] = Math.max(0, w.tiles.fert[i] - 120); w.dirtyTiles.add(i); }
      for (const bld of w.buildingsNear(target.x | 0, target.y | 0, 6)) if (rng.chance(0.7)) LW.Buildings.destroy(w, bld, 'atomcsapás');
      for (const p of w.agents.values()) { p.emotions.fear = b01(p.emotions.fear + 0.6); p.emotions.grief = b01(p.emotions.grief + 0.3); A().memory(w, p, { type: 'war', text: `atomcsapás érte ${target.name} városát — a világ megváltozott`, importance: 0.95, emotion: 'fear', intensity: 0.9 }); }
      a.warWith = null; b.warWith = null; a.rivalry = a.rivalry || {}; b.rivalry = b.rivalry || {}; a.rivalry[String(b.id)] = 0; b.rivalry[String(a.id)] = 0;
      w.events.emit('NuclearStrike', { tick: w.tick, place: target.name, other: other.name, dead, tile: w.idx(target.x | 0, target.y | 0) });
      w.events.emit('WarEnded', { tick: w.tick, place: other.name, other: target.name, decisive: false, tile: w.idx(other.x | 0, other.y | 0) });
    },
    // ---------------------------------------------------------------- vállalatok: a vagyon szervezi a termelést
    companies(w) {
      const rng = w.rng;
      for (const b of w.buildings.values()) { const def = LW.Buildings.DEFS[b.kind]; if (!def || !def.public || !def.storage || b.progress < 1 || b.company) continue; if (!rng.chance(0.03)) continue; const near = w.agentsNear(b.x + 0.5, b.y + 0.5, 10).filter((p) => A().isAdult(w, p) && (p.wealth || 0) >= 4 && p.knowledge.techs.has('banking')); if (!near.length) continue; const o = near.sort((x, y) => (y.wealth || 0) - (x.wealth || 0))[0]; b.company = { ownerId: o.id, name: `${o.name} ${LW.HU.poss(def.label.toLowerCase())}`, since: w.tick, workers: 1 }; o.wealth = (o.wealth || 0) - 5; o.achievements.push('Vállalatalapító'); o.importance += 0.6; w.events.emit('CompanyFounded', { tick: w.tick, agentId: o.id, name: b.company.name, kind: b.kind, tile: w.idx(b.x, b.y) }); A().memory(w, o, { type: 'company', text: `saját vállalatot alapítottam: ${b.company.name}`, importance: 0.8, emotion: 'pride', intensity: 0.7 }); }
      // a vállalat dolgozókat gyűjt és a tulajdonos gazdagszik a termelésből
      for (const b of w.buildings.values()) { if (!b.company) continue; const o = w.agents.get(b.company.ownerId); if (!o) { b.company = null; continue; } const near = w.agentsNear(b.x + 0.5, b.y + 0.5, 12).filter((p) => A().isAdult(w, p) && p.id !== o.id); b.company.workers = Math.max(1, Math.min(near.length, 1 + Math.floor((o.wealth || 0) / 6))); if (rng.chance(0.5)) { o.wealth = (o.wealth || 0) + Math.round(b.company.workers * 0.5); for (const p of near.slice(0, b.company.workers)) p.wealth = (p.wealth || 0) + 1; } }
    },
    // ---------------------------------------------------------------- a világ tágul: aki hajózni tud, új földet talál a tengeren túl
    growth(w) {
      if (!w.cfg.world.expandable && w.cfg.world.expandable !== undefined) return;
      const maxSide = 256; if (w.w >= maxSide && w.h >= maxSide) return;
      const known = LW.Tech.worldKnowledge(w); if (!known.has('sailing')) return;
      const need = 20 + (w.expansions || 0) * 25; if (w.population < need) return;
      if (!w.rng.chance(known.has('navigation') ? 0.004 : 0.0015)) return;
      const side = w.w <= w.h && w.w < maxSide ? 'east' : 'south'; const size = 64;
      const explorer = [...w.agents.values()].filter((a) => a.knowledge.techs.has('sailing')).sort((x, y) => y.personality.curiosity - x.personality.curiosity)[0];
      w.expand(side, size, explorer ? explorer.id : null);
    },
  };
  LW.Civilization = Civ;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== society/frontier.js ===== */
/* LEVENTE — THE CREATOR · society/frontier.js — a határvidék: műholdak, űrkikötő, indítások, telepesek, akik elhagyják a világot
 * Minden naponta fut. A műhold feltérképezi a világot (minden lelőhely ismert lesz); az űrkikötő rakétákat indít;
 * ha megvan az űrkolónia tudása, néhány bátor és kíváncsi ember elmegy — és nem hal meg, csak eltűnik a világból.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME; const A = () => LW.Agents; const b01 = (v) => LW.clamp01(v);

  const Frontier = {
    daily(w) {
      // műholdak: a világ teljes térképe egyszer, mindenkinek
      if (!w.firsts['satmap'] && w.tick % (T.TICKS_PER_DAY * 5) < T.TICKS_PER_DAY) { let sat = false; for (const a of w.agents.values()) if (a.knowledge.techs.has('satellites')) { sat = true; break; } if (sat) { const t = w.tiles; let n = 0; for (let i = 0; i < w.w * w.h; i++) if (t.depType[i] && !t.depKnown[i]) { t.depKnown[i] = 1; n++; } w.events.emit('MapRevealed', { tick: w.tick, n }); for (const a of w.agents.values()) if (a.knowledge.techs.has('satellites')) { a.emotions.excitement = b01(a.emotions.excitement + 0.3); } } }
    },
    /** Űrkikötő: indítások, néha emberekkel; ha van kolónia-tudás és elég ember, telepesek indulnak. */
    spaceport(w, b, near) {
      const rng = w.rng; if (!near || !near.length) return;
      const s = LW.Settlements.at(w, b.x, b.y); const place = s ? s.name : null;
      if (rng.chance(0.004)) { const crew = rng.chance(0.3); b.launches = (b.launches || 0) + 1; w.events.emit('Launch', { tick: w.tick, place, crew, buildingId: b.id, tile: w.idx(b.x, b.y) }); for (const a of near) { a.emotions.excitement = b01(a.emotions.excitement + 0.2); a.emotions.joy = b01(a.emotions.joy + 0.05); } }
      const colonists = near.some((a) => a.knowledge.techs.has('space_colony'));
      if (colonists && w.population >= 140 && w.tick - (w.lastColonyTick || -1e9) > T.TICKS_PER_YEAR * 15 && rng.chance(0.002)) {
        const cand = [...w.agents.values()].filter((a) => A().isAdult(w, a) && A().age(w, a) < 45 && a.health > 0.6 && !a.pregnancy && a.children.every((c) => { const ch = w.agents.get(c); return !ch || A().isAdult(w, ch); })).sort((x, y) => (y.personality.curiosity + y.personality.bravery + y.personality.riskTolerance) - (x.personality.curiosity + x.personality.bravery + x.personality.riskTolerance)).slice(0, rng.int(3, 7));
        if (cand.length < 3) return; w.lastColonyTick = w.tick;
        const names = cand.map((a) => a.name).join(', ');
        for (const a of cand) this.depart(w, a, 'űrkolónia');
        w.departed = (w.departed || 0) + cand.length;
        w.events.emit('ColonyLaunched', { tick: w.tick, place, n: cand.length, names, tile: w.idx(b.x, b.y) });
        for (const a of near) { a.emotions.excitement = b01(a.emotions.excitement + 0.3); a.emotions.sadness = b01(a.emotions.sadness + 0.1); }
      }
    },
    /** Valaki elhagyja a világot: nem hal meg, de a világban többé nincs jelen. A szerettei búcsúznak. */
    depart(w, a, cause) {
      if (!w.agents.has(a.id)) return; const tick = w.tick;
      const rec = { id: a.id, name: a.name, sex: a.sex, bornTick: a.bornTick, diedTick: tick, cause, departed: true, parents: a.parents.slice(), children: a.children.slice(), partner: a.partner, achievements: a.achievements.slice(), genes: a.genes, palette: a.palette, generation: a.generation, genesis: a.genesis, occupation: a.occupation, importance: a.importance + 1, deathTile: w.idx(a.x | 0, a.y | 0) };
      w.deceased.set(a.id, rec);
      LW.Buildings.moveOut(w, a);
      const heir = (a.partner != null && w.agents.get(a.partner)) || a.children.map((c) => w.agents.get(c)).find((c) => c) || null;
      LW.Buildings.transferOwnership(w, a, heir ? heir.id : null);
      for (const o of w.agents.values()) {
        if (o.id === a.id) continue; const r = o.relationships.get(a.id); const kin = o.parents.includes(a.id) || a.parents.includes(o.id) || o.partner === a.id;
        const close = kin ? 1 : r ? Math.max(r.friendship, r.romance, r.attraction * 0.5) : 0;
        if (close > 0.25) { o.emotions.sadness = b01(o.emotions.sadness + close * 0.5); o.emotions.pride = b01(o.emotions.pride + close * 0.2); A().memory(w, o, { type: 'loss', text: `${a.name} elment az égen túlra: ${cause}`, importance: 0.6 + close * 0.3, emotion: 'sadness', intensity: close * 0.7, subjects: [a.id] }); }
        if (o.partner === a.id) { o.partner = null; if (r) r.status = 'apart'; }
        if (o.plan && o.plan.target === a.id) o.plan = null;
      }
      w.removeAgent(a.id);
      w.events.emit('AgentDeparted', { tick, agentId: a.id, cause, tile: rec.deathTile, age: A().age(w, a) });
    },
  };
  LW.Frontier = Frontier;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== history/history.js ===== */
/* LEVENTE — THE CREATOR · history/history.js — importance, firsts (WOW), chronicle, feeds, yearly statistics (spec §73–§78) */
(function (LW) {
  'use strict';

  const TECH_FIRST = (id) => (LW.Tech.D[id] && LW.Tech.D[id].wow) || `Első: ${LW.Tech.D[id] ? LW.Tech.D[id].name.toLowerCase() : id}`;
  const BLD_FIRST = { campfire: 'Első meggyújtott tűz', lean_to: 'Első megépült fedezék', hut: 'Első megépült kunyhó', stone_house: 'Első kőház', storage_pit: 'Első tároló', farm_plot: 'Első szántóföld' };
  const TIER_FIRST = { camp: 'Első tábor', hamlet: 'Első tanya', village: 'Első falu', town: 'Első mezőváros', city: 'Első város', metropolis: 'Első nagyváros' };

  class History {
    constructor(world) {
      this.world = world;
      this.feed = []; this.godFeed = []; this.chronicle = []; this.firsts = {}; this.yearStats = []; this.wow = []; this.counters = { births: 0, deaths: 0, discoveries: 0, buildings: 0, couples: 0, conflicts: 0 };
      world.firsts = this.firsts; world.history = this;
      world.events.onAny((ev) => this.handle(ev));
    }
    nameOf(id) { if (id == null) return 'valaki'; const a = this.world.agents.get(id) || this.world.deceased.get(id); return a ? a.name : 'valaki'; }
    /** Returns {text, base, firstKey, firstTitle, god} for an event or null to ignore. */
    describe(ev) {
      const n = (id) => this.nameOf(id); const W = this.world; const T = LW.Tech.D; const BD = LW.Buildings.DEFS; const HU = LW.HU;
      switch (ev.type) {
        case 'StrangerArrived': return { text: `Egy idegen, ${n(ev.agentId)}, érkezett az ismert föld peremén túlról.`, base: 0.6, firstKey: 'stranger', firstTitle: 'Első idegen' };
        case 'AgentBorn': return ev.stranger ? null : ev.genesis ? { text: `${n(ev.agentId)} megjelent a világban.`, base: 0.5, firstKey: 'genesis', firstTitle: 'Az Elsők' } : { text: `Megszületett ${n(ev.agentId)}, ${n(ev.motherId)} és ${n(ev.fatherId)} gyermeke.`, base: 0.45, firstKey: 'born', firstTitle: 'Első gyermek' };
        case 'AgentDied': return { text: `${n(ev.agentId)} ${Math.floor(ev.age)} évesen meghalt: ${ev.cause}.`, base: 0.5 + Math.min(0.3, 1 / Math.max(1, W.population)), firstKey: 'death', firstTitle: 'Első halál' };
        case 'Killing': return { text: `${n(ev.agentId)} végzett ${n(ev.otherId)} életével.`, base: 0.85, firstKey: 'murder', firstTitle: 'Első gyilkosság' };
        case 'CoupleFormed': return ev.stage === 'dating' ? { text: `${n(ev.agentId)} és ${n(ev.otherId)} járni kezdtek.`, base: 0.4, firstKey: 'love', firstTitle: 'Első szerelem' } : { text: `${n(ev.agentId)} és ${n(ev.otherId)} párrá lettek.`, base: 0.55, firstKey: 'partners', firstTitle: 'Első pár' };
        case 'CoupleBroke': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} szakítottak — ${n(ev.agentId)} lépett ki (${ev.reason}).`, base: 0.45, firstKey: 'breakup', firstTitle: 'Első szakítás' };
        case 'Pregnancy': return { text: `${n(ev.agentId)} gyermeket vár.`, base: 0.3 };
        case 'DiscoveryMade': return { text: `${n(ev.agentId)} rájött${ev.source === 'accident' ? ' véletlenül' : ev.source === 'observation' ? ' megfigyelésből' : ''}: ${T[ev.tech].name.toLowerCase()}.`, base: T[ev.tech].hidden ? 0.2 : 0.65, firstKey: 'tech:' + ev.tech, firstTitle: TECH_FIRST(ev.tech) };
        case 'KnowledgeTransferred': return { text: `${n(ev.agentId)} ${ev.source === 'read' ? 'olvasta és megértette' : 'megtanulta'}: ${T[ev.tech].name.toLowerCase()}${ev.teacherId != null ? ' (tanította: ' + n(ev.teacherId) + ')' : ''}.`, base: T[ev.tech].hidden ? 0.05 : ev.source === 'read' ? 0.25 : 0.15 };
        case 'RecordWritten': return { text: `${n(ev.agentId)} leírta, amit tud: ${T[ev.tech].name.toLowerCase()}. A tudás most már túléli a tudót.`, base: 0.8, firstKey: 'record', firstTitle: 'Az első leírt tudás' };
        case 'Ritual': return { text: `${ev.n} ember szertartást tart a ${ev.temple ? 'templomnál' : 'szentélynél'}${ev.place ? ' (' + ev.place + ')' : ''}: az égi hangról énekelnek.`, base: 0.4, firstKey: 'rite', firstTitle: 'Az első szertartás' };
        case 'Election': return { text: ev.again ? `${ev.place} népe újraválasztotta ${n(ev.agentId)} vezetőjét (${ev.votes} szavazat a ${ev.of}-ből).` : `${ev.place} népe szavazott: ${n(ev.agentId)} lett a vezető (${ev.votes} szavazat a ${ev.of}-ből).`, base: ev.again ? 0.4 : 0.75, firstKey: 'election', firstTitle: 'Az első választás' };
        case 'CrossingBuilt': return { text: ev.tunnel ? `${n(ev.agentId)} emberei átfúrták a hegyet: ${ev.len} mező hosszú alagút${ev.joined ? ' — a túloldal végre elérhető' : ''}.` : `${n(ev.agentId)} emberei hidat vertek a vízen át (${ev.len} mező)${ev.joined ? ' — a sziget összekapcsolódott a világgal' : ''}.`, base: ev.joined ? 1.1 : 0.6, firstKey: ev.joined ? 'joined' : 'crossing:' + ev.kind, firstTitle: ev.joined ? (ev.tunnel ? 'Az első alagút két föld között' : 'Az első híd két föld között') : (ev.tunnel ? 'Az első alagút' : `Az első ${BD[ev.kind].label.toLowerCase()}`) };
        case 'Festival': return { text: `${ev.n} ember ünnepelt a ${BD[ev.kind].label.toLowerCase()}nál${ev.place ? ' (' + ev.place + ')' : ''}.`, base: 0.3, firstKey: 'festival', firstTitle: 'Az első ünnep' };
        case 'NuclearStrike': return { text: `Atomcsapás érte ${ev.place} városát (${ev.other} keze által): ${ev.dead} halott, kiégett föld. A háború egy nap alatt véget ért, és senki sem nyert.`, base: 1.6, firstKey: 'nuclear', firstTitle: 'A nap, amikor a világ megváltozott' };
        case 'Launch': return { text: `${ev.place ? ev.place + ' űrkikötőjéből' : 'Az űrkikötőből'} rakéta indult az ég felé${ev.crew ? ' — emberekkel a fedélzetén' : ''}.`, base: ev.crew ? 0.9 : 0.5, firstKey: ev.crew ? 'crewed' : 'launch', firstTitle: ev.crew ? 'Az első ember az űrkikötőből az égbe' : 'Az első indítás' };
        case 'ColonyLaunched': return { text: `${ev.n} telepes elhagyta a világot: ${ev.names} új életet kezd az égen túl. Nem jönnek vissza.`, base: 1.4, firstKey: 'colony', firstTitle: 'Az első telepesek, akik elhagyták a világot' };
        case 'MapRevealed': return { text: `A műholdak feltérképezték az egész világot: minden lelőhely és minden part ismert lett.`, base: 1.0, firstKey: 'satmap', firstTitle: 'A világ teljes térképe' };
        case 'AgentDeparted': return { text: `${n(ev.agentId)} ${Math.floor(ev.age)} évesen elhagyta a világot: ${ev.cause}.`, base: 0.6 };
        case 'LeaderChosen': return { text: `${n(ev.agentId)} lett ${ev.place} vezetője.`, base: 0.7, firstKey: 'leader', firstTitle: 'Az első vezető' };
        case 'Epidemic': return { text: `Járvány tört ki ${ev.place ? ev.place + ' településen' : 'a vidéken'}: ${ev.n} beteg.`, base: 0.8, firstKey: 'epidemic', firstTitle: 'Az első járvány' };
        case 'EpidemicEnded': return { text: `A járvány elmúlt ${ev.place}ban ${ev.days} nap után (a csúcson ${ev.peak} beteg).`, base: 0.5 };
        case 'SimulationHypothesis': return { text: `${n(ev.agentId)} kimondta, amit senki nem mert: talán ők maguk is egy világban élnek, amelyet valaki figyel.`, base: 1.0, firstKey: 'simhyp', firstTitle: 'A szimulációs hipotézis' };
        case 'SimulationVerdict': return { text: ev.accepted ? `A többség (${Math.round(ev.share * 100)}%) elfogadja: ők is egy teremtett világban élnek — ahogy talán a Teremtőjük is.` : `A többség (${Math.round(ev.share * 100)}%) tagadja, hogy szimulációban élne. „Ez a világ valódi” — mondják.`, base: 1.0, firstKey: ev.accepted ? 'simyes' : 'simno', firstTitle: ev.accepted ? 'Elhitték' : 'Tagadták' };
        case 'StateFounded': return { text: `${ev.place} népe államot alapított: ${n(ev.agentId)} törvények szerint uralkodik.`, base: 0.85, firstKey: 'state', firstTitle: 'Az első állam' };
        case 'WarDeclared': return { text: `${ev.place} háborút indított ${ev.other} ellen — ${n(ev.agentId)} vezetésével.`, base: 1.0, firstKey: 'war', firstTitle: 'Az első háború' };
        case 'Battle': return { text: `Csata: ${ev.place} harcosai legyőzték ${ev.other} embereit.`, base: 0.5 };
        case 'WarEnded': return { text: ev.decisive ? `${ev.place} győzött: ${ev.other} behódolt.` : `${ev.place} és ${ev.other} háborúja elcsendesült — egyik sem győzött.`, base: 0.8, firstKey: 'peace', firstTitle: 'Az első béke' };
        case 'CompanyFounded': return { text: `${n(ev.agentId)} vállalatot alapított: ${ev.name}.`, base: 0.7, firstKey: 'company', firstTitle: 'Az első vállalat' };
        case 'NewLand': return { text: `${ev.agentId != null ? n(ev.agentId) + ' hajósai' : 'Hajósok'} új földet találtak a tengeren túl ${ev.side === 'east' ? 'keleten' : 'délen'}: ${ev.name}. A világ nagyobb lett (${ev.w}×${ev.h}).`, base: 1.2, firstKey: 'newland', firstTitle: 'Új föld a tengeren túl' };
        case 'ExistentialQuestion': return { text: `${n(ev.agentId)} feltette a kérdést: „${ev.text}”`, base: 0.7, firstKey: 'question', firstTitle: 'Az első kérdés, amire nincs válasz' };
        case 'LanguageDied': return { text: `Kihalt egy nyelv: ${ev.name}. Utolsó beszélője magával vitte.`, base: 0.6, firstKey: 'langdied', firstTitle: 'Az első kihalt nyelv' };
        case 'FutureTech': return { text: `Olyan tudás született, amelyre a Teremtőnek sincs szava: ${ev.name}.`, base: 0.9, firstKey: 'future', firstTitle: 'Az ismeretlen jövő kezdete' };
        case 'WorldSimulated': return { text: `A Világmag egy ${ev.n}. világot indított el: apró lények, akik egy hangot hallanak az égből.`, base: 1.2, firstKey: 'worldsim', firstTitle: 'A világ a világban' };
        case 'KnowledgeLost': return { text: `${n(ev.agentId)} halálával elveszett a tudás: ${T[ev.tech].name.toLowerCase()}.`, base: 0.75, firstKey: 'lost', firstTitle: 'Első elveszett tudás' };
        case 'BuildingStarted': return { text: `${n(ev.agentId)} építeni kezdett: ${BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.05 : 0.18 };
        case 'BuildingCompleted': return { text: `${n(ev.agentId)} ${ev.kind === 'campfire' ? 'tüzet gyújtott' : 'elkészült: ' + BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.12 : 0.45, firstKey: 'building:' + ev.kind, firstTitle: BLD_FIRST[ev.kind] || `Első ${BD[ev.kind].label.toLowerCase()}` };
        case 'BuildingDestroyed': return ev.kind === 'campfire' ? null : { text: `Elpusztult egy ${BD[ev.kind].label.toLowerCase()} (${ev.cause}).`, base: ev.cause === 'elkorhadt' ? 0.15 : 0.5 };
        case 'SettlementFounded': return { text: `Megalakult ${ev.name} ${HU.tier(ev.tier)}a — alapítója ${n(ev.agentId)}.`, base: 0.85, firstKey: 'settlement', firstTitle: 'Első település' };
        case 'SettlementGrew': return { text: `${ev.name} ${HU.tierBecame(ev.tier)} nőtt.`, base: 0.75, firstKey: 'tier:' + ev.tier, firstTitle: TIER_FIRST[ev.tier] };
        case 'SettlementAbandoned': return { text: `${ev.name} elnéptelenedett.`, base: 0.6 };
        case 'SettlementResettled': return { text: `${ev.name} újra lakott.`, base: 0.5 };
        case 'ResourceFound': return { text: `${n(ev.agentId)} ${HU.depositItemByName(ev.deposit)} talált.`, base: 0.5, firstKey: 'deposit:' + ev.deposit, firstTitle: `Első ${HU.depositByName(ev.deposit)}lelet` };
        case 'WeatherChanged': return ev.creator ? null : (ev.state === 'storm' && ev.prev !== 'rain') ? { text: 'Vihar söpör végig a vidéken.', base: 0.2 } : (ev.state === 'rain' && ev.prev !== 'storm' && ev.prev !== 'overcast') ? { text: 'Eleredt az eső.', base: 0.08 } : null;
        case 'WildfireStarted': return { text: `Erdőtűz tört ki${ev.cause === 'lightning' ? ' egy villámcsapásból' : ev.cause === 'creator' ? ' az égből' : ''}.`, base: 0.55, firstKey: 'wildfire', firstTitle: 'Első erdőtűz' };
        case 'WildfireEnded': return { text: `Az erdőtűz kialudt; ${ev.burned} mező perzselődött fel.`, base: 0.3 };
        case 'CreatorIntervention': return { text: ev.text, base: 0.6, god: true, firstKey: 'intervention', firstTitle: 'A Teremtő első érintése' };
        case 'DivineCommandIssued': return { text: ev.text, base: 0.5, god: true };
        case 'DivineCommandInterpreted': return { text: ev.text, base: 0.45, god: true };
        case 'ManifestationPlaced': return { text: `Megjelent egy ${BD[ev.kind].label.toLowerCase()}.`, base: 0.6, god: true, firstKey: 'manifestation', firstTitle: 'Első megjelenés' };
        case 'ManifestationEnded': return { text: `A ${BD[ev.kind].label.toLowerCase()} ${ev.cause === 'elhalványult' ? 'elhalványult' : 'eltűnt'}.`, base: 0.2, god: true };
        case 'BeliefFormed': return { text: ev.text, base: 0.9, firstKey: 'belief', firstTitle: 'Az első hit a Teremtőben' };
        case 'ConflictOccurred': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} összeverekedett; ${n(ev.winnerId)} győzött.`, base: 0.35, firstKey: 'conflict', firstTitle: 'Első verekedés' };
        case 'AgentInjured': return { text: `${n(ev.agentId)} megsérült: ${ev.cause}.`, base: 0.12 + ev.amount * 0.3 };
        case 'AgentIll': return { text: `${n(ev.agentId)} megbetegedett.`, base: 0.12 };
        case 'FriendshipFormed': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} összebarátkoztak.`, base: 0.25, firstKey: 'friendship', firstTitle: 'Első barátság' };
        case 'Courtship': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} flörtöltek.`, base: 0.15 };
        case 'Rejection': return { text: `${n(ev.otherId)} elutasította ${n(ev.agentId)} közeledését.`, base: 0.12 };
        case 'Gift': return { text: `${n(ev.agentId)} ajándéka ${n(ev.otherId)} részére: ${LW.ITEMS[ev.item] ? LW.ITEMS[ev.item].label.toLowerCase() : ev.item}.`, base: 0.1 };
        case 'ItemCrafted': return { text: `${n(ev.agentId)} készített: ${LW.ITEMS[ev.item].label.toLowerCase()}.`, base: 0.3, firstKey: 'item:' + ev.item, firstTitle: `Első ${LW.ITEMS[ev.item].label.toLowerCase()}` };
        case 'Harvest': return { text: `${n(ev.agentId)} aratott: ${ev.amount} gabona.`, base: 0.35, firstKey: 'harvest', firstTitle: 'Első aratás' };
        case 'PathFormed': return { text: 'A lábak ösvényt tapostak a földbe.', base: 0.3, firstKey: 'path', firstTitle: 'Első ösvény' };
        case 'FireWentOut': return { text: 'Kialudt egy tűz.', base: 0.05 };
        case 'WordCoined': return { text: `${n(ev.agentId)} kimondott egy szót, ami eddig nem létezett: „${ev.word}” — ${LW.Speech.gloss(ev.concept)}.`, base: 0.12, firstKey: 'word', firstTitle: 'Az első szó' };
        case 'LanguageNamed': return { text: `${ev.speakers} ember már közös szavakkal beszél${ev.place ? ' ' + ev.place + ' körül' : ''}: megszületett a ${ev.name.toLowerCase()} nyelv.`, base: 0.75, firstKey: 'language', firstTitle: 'Az első nyelv' };
        case 'LanguageSplit': return { text: `${ev.place} népe már nem érti a többieket: a maguk nyelvén beszélnek, a ${ev.name.toLowerCase()} nyelven.`, base: 0.85, firstKey: 'langsplit', firstTitle: 'Az első nyelvszakadás' };
        case 'SecretTongue': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} új szavakat sugdos egymásnak — nem akarják, hogy a hang értse.`, base: 0.55, firstKey: 'secret', firstTitle: 'Az első titkos szó' };
        case 'CreatorSpoke': return { text: ev.text, base: 0.5, god: true, firstKey: 'spoke', firstTitle: 'A Teremtő első szava' };
        case 'CreatorAnswered': return { text: ev.text, base: 0.45, god: true, firstKey: 'answered', firstTitle: 'Az első válasz a Teremtőnek' };
        case 'Utterance': return null;
        case 'Conversation': return null;
        default: return null;
      }
    }
    handle(ev) {
      const W = this.world, cfg = W.cfg.history; const d = this.describe(ev); if (!d) return;
      let imp = d.base; let first = false;
      if (d.firstKey && !this.firsts[d.firstKey]) { first = true; this.firsts[d.firstKey] = { tick: ev.tick, agentId: ev.agentId, title: d.firstTitle, text: d.text, tile: ev.tile }; imp *= cfg.firstBonus; }
      if (d.god) imp *= cfg.creatorBonus;
      imp = Math.min(3, imp);
      const entry = { tick: ev.tick, year: LW.Time.year(ev.tick), type: ev.type, text: d.text, importance: imp, agentId: ev.agentId, otherId: ev.otherId, tile: ev.tile, first: first ? d.firstTitle : null, god: !!d.god };
      if (imp >= cfg.feedThreshold || d.god) { this.feed.push(entry); if (this.feed.length > cfg.feedCap) this.feed.splice(0, this.feed.length - cfg.feedCap); }
      if (d.god) { this.godFeed.push(entry); if (this.godFeed.length > 200) this.godFeed.shift(); }
      if (imp >= cfg.chronicleThreshold || first) this.chronicle.push(entry);
      if (first) { this.wow.push(entry); }
      for (const id of [ev.agentId, ev.otherId]) { const a = id != null ? W.agents.get(id) : null; if (a) { a.importance += imp * 0.5; if (first && id === ev.agentId && d.firstTitle) a.achievements.push(d.firstTitle); } }
      if (ev.type === 'AgentBorn') this.counters.births++; if (ev.type === 'AgentDied') this.counters.deaths++; if (ev.type === 'DiscoveryMade' && !LW.Tech.D[ev.tech].hidden) this.counters.discoveries++; if (ev.type === 'BuildingCompleted') this.counters.buildings++; if (ev.type === 'CoupleFormed' && ev.stage === 'partners') this.counters.couples++; if (ev.type === 'ConflictOccurred') this.counters.conflicts++;
      if (W.onHistory && (imp >= cfg.feedThreshold || d.god || first)) W.onHistory(entry);
    }
    yearEnd() {
      const W = this.world; const known = LW.Tech.worldKnowledge(W); const largest = LW.Settlements.largest(W);
      const prev = this.yearStats[this.yearStats.length - 1]; const c = this.counters;
      this.yearStats.push({ year: W.year - 1, population: W.population, births: c.births - (prev ? prev.cumBirths : 0), deaths: c.deaths - (prev ? prev.cumDeaths : 0), cumBirths: c.births, cumDeaths: c.deaths, discoveries: c.discoveries, techs: known.size, techLevel: LW.Tech.techLevel(known), settlements: [...W.settlements.values()].filter((s) => !s.abandonedTick).length, largest: largest ? largest.name : null, buildings: W.buildings.size });
      if (this.yearStats.length > 5000) this.yearStats.shift();
      // creator belief emergence
      if (!this.firsts.belief && W.population >= 4) { let believers = 0; for (const a of W.agents.values()) if (a.beliefs.creator > 0.5) believers++; if (believers / W.population >= 0.6) { const s = largest; W.events.emit('BeliefFormed', { tick: W.tick, text: `${s ? s.name + ' népe' : 'Az emberek'} már egy Teremtőről beszél${s ? '' : 'nek'}, aki az égen túlról figyeli őket.`, tile: s ? W.idx(s.x | 0, s.y | 0) : undefined }); } }
    }
    snapshotStats() { const W = this.world; const known = LW.Tech.worldKnowledge(W); return { tick: W.tick, population: W.population, births: this.counters.births, deaths: this.counters.deaths, discoveries: this.counters.discoveries, buildings: this.counters.buildings, couples: this.counters.couples, settlements: [...W.settlements.values()].filter((s) => !s.abandonedTick).length, techs: [...known], techLevel: LW.Tech.techLevel(known), chronicleLen: this.chronicle.length }; }
    toJSON() { return { feed: this.feed.slice(-this.world.cfg.history.feedCap), godFeed: this.godFeed, chronicle: this.chronicle, firsts: this.firsts, yearStats: this.yearStats, counters: this.counters }; }
    static fromJSON(world, j) { const h = new History(world); h.feed = j.feed || []; h.godFeed = j.godFeed || []; h.chronicle = j.chronicle || []; Object.assign(h.firsts, j.firsts || {}); h.yearStats = j.yearStats || []; h.counters = j.counters || h.counters; return h; }
  }
  LW.History = History;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== god/god.js ===== */
/* LEVENTE — THE CREATOR · god/god.js
 * Interventions are physical effects the ecosystem and the people react to; witnesses
 * keep divine memories that spread as rumor and may become belief. (spec §64–§69)
 */
(function (LW) {
  'use strict';
  const A = () => LW.Agents, T = LW.TIME;

  const KINDS = {
    rain:       { label: 'Eső', icon: '☂', desc: 'Eső egy területen 6 órán át', target: 'tile' },
    storm:      { label: 'Vihar', icon: '⚡', desc: 'Heves vihar villámokkal', target: 'tile' },
    snow:       { label: 'Hideg', icon: '❄', desc: 'Hidegfront: egy napig havazik', target: 'world' },
    clear:      { label: 'Derült ég', icon: '☼', desc: 'Kitisztul az ég 12 órára', target: 'world' },
    lightning:  { label: 'Villám', icon: '↯', desc: 'Lecsap egy mezőre', target: 'tile' },
    fire:       { label: 'Tűz', icon: '🔥', desc: 'Lángra lobbant egy mezőt', target: 'tile' },
    forest:     { label: 'Erdő', icon: '🌲', desc: 'Erdőt növeszt', target: 'tile' },
    food:       { label: 'Étel', icon: '🍒', desc: 'Kivirágoztatja a földet', target: 'tile' },
    animals:    { label: 'Vadak', icon: '🦌', desc: 'Vadakat hoz a vidékre', target: 'tile' },
    resource:   { label: 'Lelőhely', icon: '⛏', desc: 'Felfed vagy teremt egy lelőhelyet', target: 'tile' },
    disease:    { label: 'Járvány', icon: '☠', desc: 'Megbetegíti a közelben lévőket', target: 'tile' },
    healing:    { label: 'Gyógyítás', icon: '✚', desc: 'Meggyógyítja a közelben lévőket', target: 'tile' },
    fertility:  { label: 'Termékenység', icon: '❀', desc: 'Megáldja a földet és az embereket', target: 'tile' },
    earthquake: { label: 'Földrengés', icon: '⌇', desc: 'Megrázza a földet; épületek dőlnek', target: 'tile' },
    meteor:     { label: 'Meteor', icon: '☄', desc: 'Kő az égből', target: 'tile' },
    spawn:      { label: 'Élet', icon: '✦', desc: 'Új ember jelenik meg', target: 'tile' },
    kill:       { label: 'Halál', icon: '✝', desc: 'Egy élet vége', target: 'agent' },
    create:     { label: 'Ajándék', icon: '▣', desc: 'Fát, követ és ételt helyez le', target: 'tile' },
    destroy:    { label: 'Rombolás', icon: '✖', desc: 'Lerombol egy épületet', target: 'tile' },
    light:      { label: 'Fényoszlop', icon: '✧', desc: 'Fényként jelensz meg', target: 'tile', manifest: true },
    orb:        { label: 'Gömb', icon: '◉', desc: 'Lebegő gömbként jelensz meg', target: 'tile', manifest: true },
    monolith:   { label: 'Monolit', icon: '▮', desc: 'Monolitot hagysz hátra', target: 'tile', manifest: true },
    avatar:     { label: 'Megtestesülés', icon: '☥', desc: 'Közöttük jársz', target: 'tile', manifest: true },
  };
  const COMMANDS = { go: 'MENJ IDE', build: 'ÉPÍTS', follow: 'KÖVESD', protect: 'VÉDD', explore: 'FEDEZD FEL', leave: 'HAGYD EL', search: 'KUTASS' };

  const God = {
    KINDS, COMMANDS,
    intervene(world, kind, p) {
      const K = KINDS[kind]; if (!K) return null; const t = world.tiles; const x = p.x | 0, y = p.y | 0; const i = world.inBounds(x, y) ? world.idx(x, y) : -1;
      let text = '', awe = 0.3, fear = 0, radius = 10; const affected = [];
      const each = (r, fn) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (!world.inBounds(nx, ny) || dx * dx + dy * dy > r * r) continue; fn(world.idx(nx, ny), nx, ny); } };
      switch (kind) {
        case 'rain': world.weather.setOverride('rain', 0.8, 6, x, y, 12); text = 'Esőt hoztál.'; awe = 0.4; break;
        case 'storm': world.weather.setOverride('storm', 1, 4); text = 'Vihart idéztél.'; awe = 0.5; fear = 0.5; break;
        case 'snow': world.weather.setOverride('rain', 0.7, 24); world.weather.tempOffset = -14; text = 'Hidegfrontot küldtél.'; awe = 0.3; fear = 0.4; break;
        case 'clear': world.weather.setOverride('clear', 0, 12); text = 'Kitisztítottad az eget.'; awe = 0.3; break;
        case 'lightning': if (i < 0) return null; world.weather.lastLightning = world.tick; world.weather.lightningTile = i; LW.Ecology.ignite(world, i, 'creator') || (t.veg[i] = Math.max(t.veg[i], 20), LW.Ecology.ignite(world, i, 'creator')); for (const a of world.agentsNear(x + 0.5, y + 0.5, 1.2)) { affected.push(a); A().damage(world, a, 0.95, 'villám a derült égből'); } text = 'Villámmal sújtottad a földet.'; awe = 0.6; fear = 0.7; break;
        case 'fire': if (i < 0) return null; if (!LW.Ecology.ignite(world, i, 'creator')) { t.veg[i] = Math.max(t.veg[i], 30); LW.Ecology.ignite(world, i, 'creator'); } text = 'Lángra lobbantottad a földet.'; awe = 0.4; fear = 0.6; break;
        case 'forest': each(3, (j) => { if (world.isWater(j) || t.biome[j] === LW.BIOME.PEAK) return; t.treeCap[j] = Math.max(t.treeCap[j], 180); t.trees[j] = Math.min(255, t.trees[j] + 150); t.vegCap[j] = Math.max(t.vegCap[j], 100); t.veg[j] = Math.min(255, t.veg[j] + 40); if (t.biome[j] === LW.BIOME.GRASSLAND || t.biome[j] === LW.BIOME.SAVANNA) t.biome[j] = LW.BIOME.FOREST; world.dirtyTiles.add(j); }); text = 'Erdőt támasztottál.'; awe = 0.6; break;
        case 'food': each(3, (j) => { if (world.isWater(j)) return; t.vegCap[j] = Math.max(t.vegCap[j], 120); t.veg[j] = Math.min(255, t.veg[j] + 140); world.dirtyTiles.add(j); }); text = 'Kivirágoztattad a földet.'; awe = 0.5; break;
        case 'animals': each(4, (j) => { if (world.isWater(j)) return; t.animalCap[j] = Math.max(t.animalCap[j], 120); t.animals[j] = Math.min(255, t.animals[j] + 120); }); text = 'Vadakat hoztál a vidékre.'; awe = 0.4; break;
        case 'resource': { let revealed = 0; each(6, (j) => { if (t.depType[j] && t.depKnown[j] === 0) { t.depKnown[j] = 1; revealed++; world.dirtyTiles.add(j); } }); if (!revealed && i >= 0 && !world.isWater(i)) { const type = p.deposit || world.rng.pick([LW.DEPOSIT.COPPER, LW.DEPOSIT.IRON, LW.DEPOSIT.FLINT, LW.DEPOSIT.CLAY, LW.DEPOSIT.GOLD]); each(1, (j) => { if (!world.isWater(j)) { t.depType[j] = type; t.depAmt[j] = 150; t.depKnown[j] = 1; world.dirtyTiles.add(j); } }); text = `${LW.HU.depositItemByName(LW.DEPOSIT_NAME[type])} rejtettél a földbe.`; text = text[0].toUpperCase() + text.slice(1); } else text = `${revealed} rejtett lelőhelyet fedtél fel.`; awe = 0.3; break; }
        case 'disease': for (const a of world.agentsNear(x + 0.5, y + 0.5, 5)) { affected.push(a); a.injury = Math.min(0.9, a.injury + 0.45); a.health = Math.max(0.05, a.health - 0.25); a.emotions.fear = 1; A().memory(world, a, { type: 'divine', text: 'a semmiből szakadt ránk a kór', importance: 0.9, emotion: 'fear', intensity: 0.9, divine: true }); } text = 'Járványt küldtél.'; awe = 0.2; fear = 0.9; break;
        case 'healing': for (const a of world.agentsNear(x + 0.5, y + 0.5, 5)) { affected.push(a); a.injury = 0; a.health = 1; a.needs.food = Math.max(a.needs.food, 0.8); a.needs.water = 1; a.emotions.joy = 1; a.emotions.fear = 0; A().memory(world, a, { type: 'divine', text: 'láthatatlan kéz gyógyított meg', importance: 0.95, emotion: 'joy', intensity: 0.95, divine: true }); } text = 'Meggyógyítottad őket.'; awe = 0.9; break;
        case 'fertility': each(5, (j) => { t.fert[j] = Math.min(255, t.fert[j] + 60); }); for (const a of world.agentsNear(x + 0.5, y + 0.5, 6)) { affected.push(a); a.fertilityBoostUntil = world.tick + T.TICKS_PER_DAY * 30; a.emotions.love = Math.min(1, a.emotions.love + 0.3); } text = 'Megáldottad a földet és az embereket.'; awe = 0.5; break;
        case 'earthquake': for (const b of world.buildingsNear(x, y, 8)) LW.Buildings.damage(world, b, world.rng.range(0.3, 0.9), 'földrengés'); for (const a of world.agentsNear(x + 0.5, y + 0.5, 14)) { affected.push(a); a.emotions.fear = 1; if (world.rng.chance(0.15)) A().damage(world, a, 0.25, 'a földrengés'); } text = 'Megráztad a földet.'; awe = 0.3; fear = 0.9; radius = 16; break;
        case 'meteor': if (i < 0) return null; each(2, (j) => { t.burnt[j] = 200; t.veg[j] = 0; t.trees[j] = 0; if (world.rng.chance(0.5)) { t.depType[j] = world.rng.pick([LW.DEPOSIT.IRON, LW.DEPOSIT.GEMS]); t.depAmt[j] = 120; t.depKnown[j] = 1; } world.dirtyTiles.add(j); const b = world.buildingAt(j); if (b) LW.Buildings.destroy(world, b, 'lezuhanó csillag'); }); each(4, (j) => { if (!t.burnt[j]) LW.Ecology.ignite(world, j, 'creator'); }); for (const a of world.agentsNear(x + 0.5, y + 0.5, 2.5)) { affected.push(a); A().damage(world, a, 1, 'lezuhanó csillag'); } text = 'Követ vetettél le az égből.'; awe = 0.8; fear = 0.9; radius = 20; break;
        case 'spawn': { const ti = i >= 0 && world.isPassable(i) ? i : world.randomNear(x, y, 3); const sex = p.sex || (world.rng.chance(0.5) ? 'f' : 'm'); const a = A().create(world, { name: world.language.person(sex, 0.6), sex, bornTick: world.tick - Math.round(world.rng.range(17, 28) * T.TICKS_PER_YEAR), x: world.xOf(ti) + 0.5, y: world.yOf(ti) + 0.5 }); a.achievements.push('A Teremtő alkotta'); a.beliefs.creator = 0.8; a.inv.berries = 3; A().memory(world, a, { type: 'divine', text: 'létrejöttem; semmire nem emlékszem azelőttről', importance: 1, emotion: 'excitement', intensity: 0.8, divine: true }); world.events.emit('AgentBorn', { tick: world.tick, agentId: a.id, genesis: true, tile: ti, creator: true }); text = `Megteremtetted őt: ${a.name}.`; awe = 0.9; break; }
        case 'kill': { const a = world.agents.get(p.agentId); if (!a) return null; text = `Véget vetettél ${a.name} életének.`; A().die(world, a, 'a Teremtő akarata'); awe = 0.2; fear = 0.9; break; }
        case 'create': { if (i < 0) return null; world.ground = world.ground || new Map(); const g = world.ground.get(i) || {}; const items = p.items || { wood: 6, stone: 4, berries: 6 }; for (const k in items) g[k] = (g[k] || 0) + items[k]; world.ground.set(i, g); text = 'Ajándékokat helyeztél a földre.'; awe = 0.5; break; }
        case 'destroy': { const b = i >= 0 ? world.buildingAt(i) : null; if (!b) return null; text = `Leromboltál egy épületet: ${LW.Buildings.def(b).label.toLowerCase()}.`; LW.Buildings.destroy(world, b, 'a Teremtő akarata'); awe = 0.2; fear = 0.8; break; }
        default: if (K.manifest && i >= 0) { const b = LW.Buildings.create(world, kind, x, y, null); text = `Megjelentél: ${K.label.toLowerCase()}.`; awe = 0.9; fear = 0.3; }
      }
      world.stats.interventions++;
      world.events.emit('CreatorIntervention', { tick: world.tick, kind, text, tile: i >= 0 ? i : undefined });
      // witnesses
      if (i >= 0) for (const a of world.agentsNear(x + 0.5, y + 0.5, radius)) { if (a.sleeping && !affected.includes(a)) continue; this.witness(world, a, kind, awe, fear); }
      else for (const a of world.agents.values()) if (!a.sleeping) this.witness(world, a, kind, awe * 0.7, fear * 0.7);
      return text;
    },
    witness(world, a, kind, awe, fear) {
      const K = KINDS[kind]; const texts = { rain: 'derült égből esett az eső', storm: 'a semmiből jött a vihar', snow: 'egy pillanat alatt jött a hideg', clear: 'egyszerre tűntek el a felhők', lightning: 'derült égből csapott le a villám', fire: 'tűz szökött ki a földből', forest: 'egy pillanat alatt nőtt erdő', food: 'a szemem láttára virágzott ki a föld', animals: 'a semmiből jöttek a vadak', resource: 'a föld megmutatta rejtett köveit', disease: 'a semmiből jött a kór', healing: 'a betegek meggyógyultak', fertility: 'melegség járta át a földet', earthquake: 'megrázkódott a föld', meteor: 'csillag hullott az égből', spawn: 'idegen lépett elő a levegőből', kill: 'valakit lesújtott a semmi', create: 'ajándékok jelentek meg a földön', destroy: 'egy otthon magától omlott össze' };
      const text = K.manifest ? `láttam: ${K.label.toLowerCase()} — valami nem e világból való` : (texts[kind] || 'valami lehetetlent láttam');
      A().memory(world, a, { type: 'divine', text, importance: 0.9, emotion: fear > awe ? 'fear' : 'excitement', intensity: Math.max(awe, fear), divine: true });
      a.emotions.fear = LW.clamp01(a.emotions.fear + fear); a.emotions.excitement = LW.clamp01(a.emotions.excitement + awe);
      a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.25 * (0.4 + a.personality.optimism * 0.4 + a.personality.curiosity * 0.3));
      a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) + (awe - fear) * 0.35 * (0.6 + a.personality.optimism * 0.5), -1, 1); // jótétemény bizalmat épít, csapás rombolja
      a.importance += 0.2; if (!a.achievements.includes('A Teremtő tanúja')) a.achievements.push('A Teremtő tanúja');
    },
    witnessManifestation(world, a, b) {
      A().memory(world, a, { type: 'divine', text: `láttam: ${LW.Buildings.def(b).label.toLowerCase()}`, importance: 0.85, emotion: 'excitement', intensity: 0.8, divine: true, buildingId: b.id });
      a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.2 * (0.5 + a.personality.curiosity)); a.emotions.excitement = LW.clamp01(a.emotions.excitement + 0.5); a.emotions.fear = LW.clamp01(a.emotions.fear + 0.15);
      if (!a.achievements.includes('A Teremtő tanúja')) a.achievements.push('A Teremtő tanúja');
    },
    // ---------------- divine commands
    command(world, a, cmd, p) {
      const force = !!p.force; const tile = p.tile ?? null; const targetId = p.targetId ?? null;
      const label = COMMANDS[cmd] || cmd;
      a.divineRequest = { cmd, tile, targetId, force, tick: world.tick, interpreted: force ? 'obey' : null };
      a.plan = null; a.sleeping = false;
      world.events.emit('DivineCommandIssued', { tick: world.tick, agentId: a.id, text: `${force ? 'Kényszerítetted' : 'Kérted'} őt: ${a.name} — ${label}.`, tile });
      if (!force) { A().memory(world, a, { type: 'divine', text: `egy száj nélküli hang szólt: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.6, divine: true }); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.3); a.emotions.fear = LW.clamp01(a.emotions.fear + 0.2); a.emotions.excitement = LW.clamp01(a.emotions.excitement + 0.3); a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) - 0.03, -1, 1); }
      else { const full = world.creatorSettings && world.creatorSettings.obedience === 'full'; A().memory(world, a, { type: 'divine', text: full ? `a hang kérte, és megtettem: ${label.toLowerCase()}` : `a testem idegen akaratra mozdult: ${label.toLowerCase()}`, importance: 0.8, emotion: full ? 'excitement' : 'fear', intensity: 0.6, divine: true }); a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) - (full ? 0.03 : 0.25), -1, 1); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.2); }
      a.importance += 0.5; a.lastDecisionTick = -1000;
    },
    obedience(world, a) { const P = a.personality; return LW.clamp01(0.3 + P.loyalty * 0.35 + a.beliefs.creator * 0.45 + a.emotions.fear * 0.2 + P.optimism * 0.15 - P.dominance * 0.3 - P.riskTolerance * 0.1); },
    scoreRequest(world, a) {
      const r = a.divineRequest; if (!r) return [0, []];
      if (world.tick - r.tick > T.TICKS_PER_DAY * 2) { a.divineRequest = null; return [0, []]; }
      if (r.force) return [100, ['a Teremtő kényszeríti']];
      if (!r.interpreted) this.interpret(world, a);
      if (!a.divineRequest) return [0, []];
      const ob = this.obedience(world, a); return [1.2 + ob * 1.5, [`engedelmesség ${LW.pct(ob)}`, `hit ${LW.pct(a.beliefs.creator)}`, `értelmezés: ${{ obey: 'engedelmeskedik', misinterpret: 'félreértette', fear: 'fél', ignore: 'nem törődik vele' }[a.divineRequest.interpreted] || a.divineRequest.interpreted}`]];
    },
    interpret(world, a) {
      const r = a.divineRequest; const ob = this.obedience(world, a); const rng = world.rng; const label = COMMANDS[r.cmd];
      const roll = rng.f(); let how, text;
      if (roll < ob * 0.75) { how = 'obey'; text = `${a.name} furcsa késztetést érzett (${label}), és engedelmeskedett.`; }
      else if (roll < ob * 0.75 + 0.15) { how = 'misinterpret'; if (r.tile != null) r.tile = world.randomNear(world.xOf(r.tile), world.yOf(r.tile), 9); else r.cmd = 'explore'; text = `${a.name} furcsa késztetést érzett, de másképp értette.`; }
      else if (a.emotions.fear > 0.5 || a.personality.bravery < 0.3) { how = 'fear'; text = `${a.name} megrémült a hangtól, és elbújt.`; a.divineRequest = null; a.emotions.fear = 1; a.needs.safety = 0; }
      else { how = 'ignore'; text = `${a.name} lerázta a furcsa késztetést (${label}).`; a.divineRequest = null; }
      if (a.divineRequest) a.divineRequest.interpreted = how;
      A().memory(world, a, { type: 'divine', text: how === 'obey' ? 'engedelmeskedtem a hangnak' : how === 'ignore' ? 'nem törődtem a hanggal' : how === 'fear' ? 'elbújtam a hang elől' : 'azt tettem, amit a hang szerintem akart', importance: 0.7, emotion: how === 'fear' ? 'fear' : 'excitement', intensity: 0.6, divine: true });
      world.events.emit('DivineCommandInterpreted', { tick: world.tick, agentId: a.id, how, text });
      return how;
    },
    planRequest(world, a) {
      const r = a.divineRequest; if (!r) return null; const W = world;
      const ctx = { world: W };
      const done = { op: 'divineDone' };
      switch (r.cmd) {
        case 'go': return r.tile != null ? { steps: [{ op: 'moveTo', i: r.tile }, done], priority: r.force ? 3 : 2 } : null;
        case 'build': { const kind = a.knowledge.techs.has('hut_construction') ? 'hut' : a.knowledge.techs.has('shelter_building') ? 'lean_to' : a.knowledge.techs.has('fire_making') ? 'campfire' : null; if (!kind) { a.divineRequest = null; return null; } const site = r.tile != null && W.isPassable(r.tile) && !W.buildingAt(r.tile) ? r.tile : LW.Buildings.findSite(W, a, kind); if (site < 0) return null; return { steps: [{ op: 'moveTo', i: site, near: 1 }, { op: 'buildNew', kind, i: site }, done], priority: r.force ? 3 : 2, tag: 'build:' + kind, kind }; }
        case 'follow': { const target = r.targetId != null ? W.agents.get(r.targetId) : null; const av = [...W.buildings.values()].find((b) => LW.Buildings.def(b).divine); if (target) return { steps: [{ op: 'follow', target: target.id, n: 96 }, done], priority: r.force ? 3 : 2, target: target.id }; if (av) return { steps: [{ op: 'moveTo', i: W.idx(av.x, av.y), near: 1 }, { op: 'wait', n: 24, at: 'shelter' }, done], priority: 2 }; a.divineRequest = null; return null; }
        case 'protect': { const target = r.targetId != null ? W.agents.get(r.targetId) : null; if (!target) { a.divineRequest = null; return null; } return { steps: [{ op: 'follow', target: target.id, n: 192 }, done], priority: r.force ? 3 : 2, target: target.id }; }
        case 'explore': { const base = r.tile != null ? r.tile : W.idx(a.x | 0, a.y | 0); const t = W.randomNear(W.xOf(base), W.yOf(base), 6); return { steps: [{ op: 'moveTo', i: t, explore: true }, { op: 'moveTo', i: W.randomNear(W.xOf(t), W.yOf(t), 8), explore: true }, done], priority: 2, tag: 'explore:walk' }; }
        case 'leave': { LW.Buildings.moveOut(W, a); const ang = W.rng.range(0, Math.PI * 2); let t = -1; for (let d = 18; d > 6 && t < 0; d -= 3) { const x = LW.clamp(Math.round(a.x + Math.cos(ang) * d), 1, W.w - 2), y = LW.clamp(Math.round(a.y + Math.sin(ang) * d), 1, W.h - 2); if (W.isPassable(W.idx(x, y))) t = W.idx(x, y); } if (t < 0) return null; return { steps: [{ op: 'moveTo', i: t }, done], priority: r.force ? 3 : 2 }; }
        case 'search': { const t = r.tile != null ? r.tile : W.idx(a.x | 0, a.y | 0); if (a.knowledge.techs.has('digging')) return { steps: [{ op: 'moveTo', i: t, near: 1 }, { op: 'dig', i: t, n: 10 }, done], priority: 2, tag: 'dig:ground' }; return { steps: [{ op: 'moveTo', i: t, near: 1 }, { op: 'moveTo', i: W.randomNear(W.xOf(t), W.yOf(t), 5), explore: true }, done], priority: 2, tag: 'explore:walk' }; }
      }
      a.divineRequest = null; return null;
    },
  };
  // completion op registered into Actions
  LW.Actions.OPS.divineDone = function (world, a) { if (a.divineRequest) { A().memory(world, a, { type: 'divine', text: 'megtettem, amit a hang kért', importance: 0.6, emotion: 'pride', intensity: 0.5, divine: true }); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.1); a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) + 0.05, -1, 1); a.divineRequest = null; } return 'done'; };
  LW.God = God;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== agents/dialogue.js ===== */
/* LEVENTE — THE CREATOR · agents/dialogue.js
 * A közös beszéd: a Teremtő szabad szöveggel szól egy emberhez vagy mindenkihez. A szöveget
 * a motor értelmezi (kérés, kérdés, sugallat, hangnem), a hatás valódi (emlék, hit, bizalom,
 * isteni kérés — amit az ember a maga feje szerint fogad meg vagy hagy figyelmen kívül), a
 * válasz pedig az ember állapotából épül: magyarul, ha hajlandó a hangnak felelni — a saját
 * nyelvén, ha nem. Nyelvi modell (ha van kulcs) csak megfogalmazza, amit a rendszer eldöntött.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const norm = (s) => String(s || '').toLowerCase().replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/í/g, 'i').replace(/[óöő]/g, 'o').replace(/[úüű]/g, 'u').replace(/[„”"“,.;:!()]/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set(['az', 'a', 'hogy', 'szo', 'szot', 'ez', 'azt', 'mit', 'jelent', 'mond', 'mondtak', 'ok', 'te', 'o']);
  // harmadik személyű leírás → első személy (a beszélő magáról beszél)
  const FIRST = [['a gyermekét gondozza', 'a gyermekemet gondozom'], ['a szülője mellett marad', 'a szüleim mellett maradok'], ['együtt van a párjával', 'a párommal vagyok'], ['ételt gyűjt későbbre', 'ételt gyűjtök későbbre'], ['a tüzet táplálja', 'a tüzet táplálom'], ['a földet műveli', 'a földet művelem'], ['felszed valamit', 'felszedek valamit'], ['készít valamit', 'készítek valamit'], ['a Teremtőnek felel', 'a Teremtőnek felelek'], ['ételt oszt meg', 'ételt osztok meg'], ['összebújva melegszik', 'összebújva melegszem'], ['a szülőjét követi', 'a szüleimet követem'], ['fedél alatt vár', 'fedél alatt várok'], ['a tűznél ül', 'a tűznél ülök'], ['társaságot keres', 'társaságot keresek'], ['meleget keres', 'meleget keresek'], ['ételt keres', 'ételt keresek'], ['segít építeni', 'segítek építeni'], ['otthont épít', 'otthont építek'], ['tüzet gyújt', 'tüzet gyújtok'], ['inni megy', 'inni megyek'], ['úton van', 'úton vagyok'], ['kísérletezik', 'kísérletezem'], ['gondolkodik', 'gondolkodom'], ['beszélget', 'beszélgetek'], ['vadászik', 'vadászom'], ['halászik', 'halászom'], ['verekszik', 'verekszem'], ['menekül', 'menekülök'], ['felfedez', 'felfedezek'], ['flörtöl', 'flörtölök'], ['gyászol', 'gyászolok'], ['gyűjt:', 'gyűjtök:'], ['épít:', 'építek:'], ['készít:', 'készítek:'], ['alszik', 'alszom'], ['tanít', 'tanítok'], ['pihen', 'pihenek'], ['ás', 'ások']];
  const firstPerson = (s) => { for (const [a, b] of FIRST) { if (s.includes(a)) { s = s.split(a).join(b); } } return s; };
  const has = (s, re) => re.test(s);

  const NUDGE = [
    [/\b(gyujts|szedj|hozz|szerezz|gyujtsetek|szedjetek|tartalek|raktaroz)\b/, 'stockpile'], [/\b(egyel|egyetek|egyel valamit)\b/, 'eat'], [/\b(igyal|igyatok)\b/, 'drink'], [/\b(aludj|pihenj|fekudj le|aludjatok)\b/, 'sleep'],
    [/\b(tuzet|tuz|gyujts tuzet|rakj tuzet)\b/, 'makeFire'], [/\b(vadassz|vadasszatok|vadaszni)\b/, 'eat'], [/\b(tanitsd|tanits|tanitsatok)\b/, 'teach'], [/\b(keszits|csinalj|faragj|szerszam|keszitsetek)\b/, 'craft'],
    [/\b(kiserletezz|probalj ki|talalj fel|kiserlet|ujat)\b/, 'experiment'], [/\b(beszelj|beszelgess|beszeljetek|barat|baratkozz)\b/, 'socialize'], [/\b(udvarolj|keress parat|szeresd|szerelem|part)\b/, 'flirt'], [/\b(vess|ultess|muveld|gabona|foldet)\b/, 'farm'],
    [/\b(kunyho|haz|otthon|fedezek|menedek)\b/, 'buildShelter'], [/\b(fedezd fel|fedezzetek|nezz korul|nezz szet|jarj|vandorolj|fedez)\b/, 'explore'], [/\b(ass|asd|asatok|foldben)\b/, 'dig'],
  ];
  const GOAL_HU1 = { stockpile: 'gyűjtök', eat: 'eszem', drink: 'iszom', sleep: 'alszom', makeFire: 'tüzet gyújtok', teach: 'tanítok', craft: 'készítek valamit', experiment: 'kísérletezem', socialize: 'beszélgetek', flirt: 'párt keresek', farm: 'földet művelek', buildShelter: 'otthont építek', explore: 'felfedezek', dig: 'ások' };
  const GOAL_HU = { stockpile: 'gyűjtsön', eat: 'egyen', drink: 'igyon', sleep: 'aludjon', makeFire: 'tüzet gyújtson', teach: 'tanítson', craft: 'készítsen valamit', experiment: 'kísérletezzen', socialize: 'beszélgessen', flirt: 'párt keressen', farm: 'földet műveljen', buildShelter: 'otthont építsen', explore: 'felfedezzen', dig: 'ásson' };

  const Dialogue = {
    /** Mit akar a hang? (kérés / kérdés / sugallat / beszéd) + hangnem */
    parse(world, text) {
      const s = norm(text); const it = { kind: 'tell', ask: null, cmd: null, nudge: null, tone: 0, word: null, raw: text, place: null, personId: null, force: false };
      const pos = (s.match(/\b(koszon|szeret|buszke|ugyes|szep|jo |jol |orul|aldas|segit|ne felj|biztonsag|nyugodj|batran|szeretlek|draga|kedves|remek|csodas|vigyazok)\b/g) || []).length;
      const neg = (s.match(/\b(hulye|ostoba|utal|pusztulj|meghalsz|buntet|atkoz|rossz vagy|gyulol|fenyeget|megollek|halj meg|takarodj|szemet|nyomorult|felj|rettegj|ver|elpusztit)\b/g) || []).length;
      it.tone = clamp(pos * 0.35 - neg * 0.5, -1, 1);
      if (has(s, /\b(muszaj|kenyszer|parancsolom|azonnal|kotelezo)\b/)) it.force = true;
      // személy a szövegben
      for (const a of world.agents.values()) { const n = norm(a.name); if (n.length >= 3 && s.includes(n)) { it.personId = a.id; break; } }
      // isteni parancsok
      if (has(s, /\b(kovesd|menj vele|maradj vele|tarts vele|kiserd)\b/) && it.personId != null) it.cmd = 'follow';
      else if (has(s, /\b(vedd meg|vedd|vigyazz ra|orizd|vedelmezd)\b/) && it.personId != null) it.cmd = 'protect';
      else if (has(s, /\b(hagyd el|menj el innen|tavozz|koltozz el|hagyd itt|hagyjatok el)\b/)) it.cmd = 'leave';
      else if (has(s, /\b(epits|epitsetek|epitsen|epitsd)\b/)) it.cmd = 'build';
      else if (has(s, /\b(ass|asd|asatok|keress a foldben|ass a foldben|kutass)\b/)) it.cmd = 'search';
      else if (has(s, /\b(fedezd fel|fedezzetek fel|nezz korul|nezz szet|jarj korbe|vandorolj|fedezz fel)\b/)) it.cmd = 'explore';
      else if (has(s, /\b(menj|gyere|indulj|eredj|vonulj|setalj|fuss|szaladj|menjetek|gyertek|induljatok)\b/)) it.cmd = 'go';
      if (it.cmd === 'go' || it.cmd === 'explore' || it.cmd === 'search') it.place = this.placeWords(s);
      if (it.cmd === 'go' && !it.place && it.personId == null) it.cmd = 'explore';
      if (it.cmd === 'go' && !it.place && it.personId != null) it.cmd = 'follow';
      // sugallat (nem parancs, csak erősebb késztetés egy napig)
      if (!it.cmd) for (const [re, g] of NUDGE) if (has(s, re)) { it.nudge = g; break; }
      // kérdések
      const Q = [['meaning', /\b(mit jelent|mi az hogy|mit mond|mi az a)\b\s*(?:az\s+|a\s+)?["'„]?([a-z\-]{2,})/], ['how', /\b(hogy vagy|hogy erzed|jol vagy|mi ujsag|mi van veled|mizu|mi a helyzet|hogy vagytok|hogy telik)\b/], ['doing', /\b(mit csinalsz|mit muvelsz|mivel foglalkozol|mit tervezel|mire keszulsz|mit fogsz|mit csinaltok)\b/], ['where', /\b(hol vagy|merre vagy|hol laksz|hova mesz|hol vagytok)\b/], ['who', /\b(ki vagy|mi a neved|hogy hivnak|mutatkozz be|meselj magadrol)\b/], ['age', /\b(hany eves|mikor szulettel|milyen idos)\b/], ['family', /\b(csalad|szuleid|anyad|apad|gyereked|gyerekeid|testvered|parod|feleseged|ferjed|kit szeretsz|szerelmes|gyerekek)\b/], ['know', /\b(mit tudsz|mihez ertesz|mit tanultal|mit fedeztel|tudasod|mire jottel ra|mit ismersz)\b/], ['fear', /\b(felsz|mitol felsz|felelem|mi bant|mi a baj|szomoru|mi fajj|mi faj)\b/], ['me', /\b(ki vagyok|tudod ki vagyok|hallasz|hiszel bennem|mit gondolsz rolam|ki beszel|ismersz engem|teremto vagyok|en vagyok|ki szol)\b/], ['want', /\b(mit szeretnel|mire vagysz|mit kivansz|mit kersz|mit akarsz|mi kell|miben segitsek|segithetek|mit adjak)\b/], ['language', /\b(nyelv|hogy mondjak|hogy mondod|hogy hivjatok|milyen szavak|tanits meg|szavaitok)\b/], ['weather', /\b(milyen az ido|hideg van|esik|meleg van|milyen a videk)\b/], ['why', /\b(miert elsz|mi a celod|mi hajt|mi ertelme|mi az ertelme|miert vagy|mi a dolgod|mit akarsz az elettol|boldog vagy)\b/], ['dream', /\b(mit almodtal|almodsz|almodtal|alom)\b/], ['self', /\b(mit gondolsz magadrol|milyen ember vagy|ki vagy te valojaban|szeretnek teged|felsz a halaltol|halal|meghalsz)\b/], ['sim', /\b(szimulacio|szimulacioban|valodi vagy|letezel|matrix|teremtett vilag|program vagy|jatek vagy)\b/], ['world', /\b(mi tortent|mi ujsag a faluban|mi ujsag nalatok|mi volt ma|mesélj|meselj)\b/]];
      for (const [k, re] of Q) { const m = re.exec(s); if (m) { it.kind = 'ask'; it.ask = k; if (k === 'meaning') { const toks = s.split(' ').reverse(); it.word = toks.find((t) => t.length >= 2 && !STOP.has(t) && !/^(mit|jelent|mi|hogy|az|a)$/.test(t)) || m[2]; } break; } }
      if (it.kind !== 'ask' && (it.cmd || it.nudge)) it.kind = 'command';
      if (it.kind === 'tell' && has(s, /\b(szia|hello|helo|udv|szervusz|jo napot|jo reggelt|jo estet|hahó|haho|hé|he)\b/)) it.kind = 'greet';
      if (it.kind === 'tell' && /\?\s*$/.test(String(text))) { it.kind = 'ask'; it.ask = 'unknown'; }
      return it;
    },
    placeWords(s) {
      if (has(s, /\b(tenger|tengerhez|tengerpart|ocean|a partra)\b/)) return 'sea';
      if (has(s, /\b(folyo|viz|to |tohoz|part|patak|vizhez|folyohoz|itat)\b/)) return 'water';
      if (has(s, /\b(erdo|erdobe|fak|fakhoz|liget)\b/)) return 'forest';
      if (has(s, /\b(hegy|domb|hegyre|dombra|csucs|szikla|hegyekbe)\b/)) return 'hill';
      if (has(s, /\b(haza|otthon|otthonodba|kunyhodba|hazadba)\b/)) return 'home';
      if (has(s, /\b(tabor|falu|telepules|tanya|a tobbiekhez|emberekhez|hozzajuk)\b/)) return 'settlement';
      if (has(s, /\b(eszak|eszakra)\b/)) return 'N'; if (has(s, /\b(del|delre)\b/)) return 'S'; if (has(s, /\b(kelet|keletre)\b/)) return 'E'; if (has(s, /\b(nyugat|nyugatra)\b/)) return 'W';
      if (has(s, /\b(messze|tavol|tavolra|a vilag vegere|tul a)\b/)) return 'far';
      return null;
    },
    resolvePlace(world, a, place) {
      const W = world, t = W.tiles; const ax = a.x | 0, ay = a.y | 0; let best = -1, bd = 1e9;
      const scan = (r, ok) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = ax + dx, y = ay + dy; if (!W.inBounds(x, y)) continue; const i = W.idx(x, y); if (!ok(i)) continue; const d = dx * dx + dy * dy; if (d < bd && d > 1) { bd = d; best = i; } } return best; };
      switch (place) {
        case 'water': { let near = -1, nd = 1e9; for (const p of a.knowledge.places.values()) if (p.k === 'water') { const d = LW.dist(ax, ay, W.xOf(p.i), W.yOf(p.i)); if (d < nd) { nd = d; near = p.i; } } if (near < 0) { scan(25, (i) => LW.isFreshBiome(t.biome[i])); near = best; } if (near < 0) return null; const sh = LW.Agents.tileNear(W, a, near); return sh != null && sh >= 0 ? sh : W.randomNear(W.xOf(near), W.yOf(near), 1); }
        case 'sea': { scan(60, (i) => t.biome[i] === LW.BIOME.OCEAN); if (best < 0) return null; const sh = LW.Agents.tileNear(W, a, best); return sh != null && sh >= 0 ? sh : W.randomNear(W.xOf(best), W.yOf(best), 2); }
        case 'forest': return scan(30, (i) => t.trees[i] > 80 && W.isPassable(i));
        case 'hill': return scan(40, (i) => (t.biome[i] === LW.BIOME.HILLS || t.biome[i] === LW.BIOME.MOUNTAIN) && W.isPassable(i));
        case 'home': { const h = a.home != null ? W.buildings.get(a.home) : null; return h ? W.idx(h.x, h.y) : null; }
        case 'settlement': { let s = null, sd = 1e9; for (const st of W.settlements.values()) { if (st.abandonedTick) continue; const d = LW.dist(ax, ay, st.x, st.y); if (d < sd) { sd = d; s = st; } } if (s) return W.randomNear(s.x | 0, s.y | 0, 2); let o = null, od = 1e9; for (const b of W.agents.values()) { if (b.id === a.id) continue; const d = LW.dist(ax, ay, b.x, b.y); if (d < od) { od = d; o = b; } } return o ? W.randomNear(o.x | 0, o.y | 0, 1) : null; }
        case 'N': case 'S': case 'E': case 'W': case 'far': { const dx = place === 'E' ? 1 : place === 'W' ? -1 : 0, dy = place === 'S' ? 1 : place === 'N' ? -1 : 0; const dist = place === 'far' ? 30 : 16; const ang = place === 'far' ? W.rng.range(0, Math.PI * 2) : Math.atan2(dy, dx); for (let d = dist; d > 4; d -= 3) { const x = clamp(Math.round(ax + Math.cos(ang) * d), 1, W.w - 2), y = clamp(Math.round(ay + Math.sin(ang) * d), 1, W.h - 2); if (W.isPassable(W.idx(x, y))) return W.idx(x, y); } return null; }
      }
      return null;
    },
    // ---------------- hatás
    attitude(a) { const b = a.beliefs.creator, tr = a.beliefs.trust || 0; if (b < 0.25) return 'confused'; if (tr < -0.35) return 'hostile'; if (tr < -0.08) return 'wary'; if (b > 0.7 && tr > 0.3) return 'devout'; if (tr > 0.15) return 'warm'; return 'neutral'; },
    /** Az ember meghallja a hangot: hit, bizalom, érzelem, emlék. */
    hear(world, a, text, it, opts) {
      const first = !a.memory.episodic.some((m) => m.divine); const P = a.personality;
      if (first) { a.emotions.fear = clamp(a.emotions.fear + 0.35 * (1 - P.bravery), 0, 1); a.emotions.excitement = clamp(a.emotions.excitement + 0.4 * P.curiosity, 0, 1); a.beliefs.creator = clamp(a.beliefs.creator + 0.3, 0, 1); }
      else a.beliefs.creator = clamp(a.beliefs.creator + 0.08, 0, 1);
      let dTrust = it.tone * 0.18 + (it.kind === 'ask' ? 0.03 : 0) + (it.force ? (it.tone > 0 ? 0 : -0.04) : 0) - (opts && opts.broadcast ? 0.02 : 0);
      if (it.tone > 0) dTrust *= 0.6 + P.optimism * 0.6; if (it.tone < 0) dTrust *= 0.6 + (1 - P.patience) * 0.6;
      a.beliefs.trust = clamp((a.beliefs.trust || 0) + dTrust, -1, 1);
      if (it.tone < -0.3) { a.emotions.fear = clamp(a.emotions.fear + 0.3, 0, 1); a.emotions.anger = clamp(a.emotions.anger + 0.2 * P.dominance, 0, 1); }
      if (it.tone > 0.3) { a.emotions.joy = clamp(a.emotions.joy + 0.15, 0, 1); a.emotions.fear = Math.max(0, a.emotions.fear - 0.15); a.emotions.stress *= 0.8; }
      if (!it.cmd) LW.Memory.add(world, a, { type: 'divine', text: `${opts && opts.broadcast ? 'az égből' : 'a semmiből'} egy száj nélküli hang szólt: „${excerpt(text)}”`, importance: first ? 0.95 : 0.6, emotion: it.tone < 0 ? 'fear' : 'excitement', intensity: first ? 0.8 : 0.45, divine: true });
      a.importance += first ? 0.6 : 0.15; if (!a.achievements.includes('Beszélt a hanggal')) a.achievements.push('Beszélt a hanggal');
      a.chatHistory = (a.chatHistory || []).slice(-9); a.chatHistory.push({ who: 'creator', text: String(text).slice(0, 240), t: world.tick });
      a.lastCreatorTalk = world.tick;
    },
    /** A hang egy emberhez szól. Visszaad: { reply, utt, how, it, att } — az egyik reply/utt üres. */
    respond(world, a, text, opts) {
      opts = opts || {}; const it = opts.intent || this.parse(world, text); const rng = world.rng;
      const full = world.creatorSettings && world.creatorSettings.obedience === 'full'; if (full) { it.force = true; opts.allowForce = true; } // a Teremtő szava parancs
      if (!a.vocab) a.vocab = {}; if (a.beliefs.trust == null) a.beliefs.trust = 0;
      const stage = LW.Agents.stage(world, a); const infant = stage === 'infant';
      const asleep = a.sleeping;
      if (!opts.heard) this.hear(world, a, text, it, opts);
      let how = null, nudged = null;
      if (it.cmd && !infant) {
        let tile = null, targetId = null;
        if (it.cmd === 'go' || it.cmd === 'explore' || it.cmd === 'search') tile = it.place ? this.resolvePlace(world, a, it.place) : null;
        if (it.cmd === 'follow' || it.cmd === 'protect') { targetId = it.personId != null && it.personId !== a.id ? it.personId : null; if (targetId == null) { it.cmd = null; } }
        if (it.cmd) { if (it.cmd === 'go' && tile == null) it.cmd = 'explore'; const forced = !!(it.force && opts.allowForce); LW.God.command(world, a, it.cmd, { tile, targetId, force: forced }); how = forced ? 'forced' : LW.God.interpret(world, a); }
      }
      if (it.nudge && !infant) { a.nudge = { goal: it.nudge, until: world.tick + T.TICKS_PER_DAY * (full ? 3 : 1), text: excerpt(text), strong: !!full }; nudged = it.nudge; if (full) { a.lastDecisionTick = -1000; if (a.plan && !a.plan.done) a.plan.done = true; } else if (it.nudge === 'sleep' || it.nudge === 'eat' || it.nudge === 'drink') a.lastDecisionTick = -1000; LW.Memory.add(world, a, { type: 'divine', text: `a hang azt akarta, hogy ${GOAL_HU[it.nudge] || it.nudge}`, importance: 0.5, emotion: 'excitement', intensity: 0.4, divine: true }); }
      const att = this.attitude(a);
      const res = { it, att, how, nudged, reply: '', utt: null, asleep };
      if (asleep && rng.chance(0.6)) { res.reply = ''; res.asleep = true; return res; } // alszik: hallja ugyan, de csak álmában
      if (infant) { res.utt = LW.Speech.say(world, a, null, []); res.reply = ''; res.babble = true; return res; }
      // aki neheztel, nem felel a hang nyelvén
      if (att === 'hostile' && Object.keys(a.vocab).length >= 5 && rng.chance(0.75)) { res.utt = LW.Speech.say(world, a, null, rng.shuffle(['no', 'you', 'go', 'bad', 'secret', 'we']).slice(0, 3).filter((c) => a.vocab[c] || rng.chance(0.5))); if (!res.utt.w.length) res.reply = this.compose(world, a, it, att, how, nudged); return res; }
      res.reply = this.compose(world, a, it, att, how, nudged);
      (a.chatHistory = a.chatHistory || []).push({ who: a.id, text: res.reply.slice(0, 240), t: world.tick });
      return res;
    },
    /** Magyar válasz az állapotból. */
    compose(world, a, it, att, how, nudged) {
      const rng = world.rng; const P = a.personality, N = a.needs, E = a.emotions; const S = []; const pick = (arr) => rng.pick(arr);
      const name = (id) => { const o = world.agents.get(id) || world.deceased.get(id); return o ? o.name : 'valaki'; };
      const first = a.chatHistory.filter((h) => h.who === 'creator').length <= 1;
      // megszólítás
      if (att === 'confused') S.push(pick(['Ki beszél? Nincs itt senki.', 'Hang… a fejemben? Ki vagy?', 'Ezt csak én hallom?', 'Valaki szólt. Nem látom, honnan.']));
      else if (att === 'hostile') S.push(pick(['Megint te.', 'Hagyj békén.', 'Nem kértem, hogy szólj.', 'Mit akarsz már megint?']));
      else if (att === 'wary') S.push(pick(['Hallak.', 'Itt vagy megint.', 'Beszélj, de ne kérj sokat.']));
      else if (att === 'devout') S.push(pick(['Hallak, Teremtő.', 'Itt vagyok, Teremtő.', 'Szólj, hallgatlak.']));
      else if (att === 'warm') S.push(pick(['Hallak, hang.', 'Örülök, hogy szólsz.', 'Igen?']));
      else if (first) S.push(pick(['Hallak. Furcsa ez.', 'Egy hang, aminek nincs szája.']));
      // parancs kimenetele
      if (it.cmd) {
        const L = LW.God.COMMANDS[it.cmd] || it.cmd;
        if (how === 'obey') S.push(pick(['Megteszem.', 'Rendben, indulok.', `Jó. ${L.toLowerCase()} — értem.`, 'Ha ezt kéred, megyek.']));
        else if (how === 'misinterpret') S.push(pick(['Azt hiszem, értem, mit akarsz.', 'Valami ilyesmit kérsz… megpróbálom.']));
        else if (how === 'fear') S.push(pick(['Félek tőled. Elbújok.', 'Ne! Hagyj!', 'Miért pont én?']));
        else if (how === 'ignore') S.push(pick([`Nem. Most más a dolgom: ${this.doing(world, a)}.`, 'Nem teszem meg. Nem parancsolsz nekem.', 'Majd ha én is úgy akarom.']));
        else if (how === 'forced') S.push(att === 'hostile' ? pick(['A testem mozdul, nem én.', 'Nem én akarom. Mégis megyek.']) : att === 'devout' || att === 'warm' ? pick(['Ahogy kívánod. Megyek.', 'Igen. Máris.', 'Meglesz, ahogy mondtad.']) : pick(['Rendben. Megteszem.', 'Jó, megyek.', 'Ha ezt akarod, teszem.']));
        else S.push(pick(['Ezt nem tudom megtenni.', 'Nem tudom, hogyan.']));
      } else if (nudged) {
        const g = GOAL_HU[nudged] || nudged;
        S.push(world.creatorSettings && world.creatorSettings.obedience === 'full' ? pick([`Rendben, ${GOAL_HU1[nudged] || g}.`, `Ahogy mondod: ${GOAL_HU1[nudged] || g}.`, 'Meglesz.', 'Máris hozzálátok.']) : att === 'hostile' || att === 'wary' ? pick([`Hogy ${g}? Majd meglátom.`, 'Ne mondd meg, mit tegyek.']) : pick([`Hogy ${g}… igen, erre gondolok.`, `Jó ötlet, hogy ${g}. Talán.`, 'Erre már én is gondoltam.']));
      }
      // kérdés
      if (it.kind === 'ask') S.push(...this.answer(world, a, it, att));
      else if (it.kind === 'greet') S.push(pick(['Szia… ha így kell mondani.', 'Üdv. Nem tudom, hogyan illik köszönni egy hangnak.', 'Üdv neked is.']));
      else if (it.kind === 'tell' && !it.cmd && !nudged) {
        if (it.tone > 0.3) S.push(pick(['Jólesik, amit mondasz.', 'Köszönöm. Ritkán mond ilyet valaki.', 'Ettől könnyebb a nap.']));
        else if (it.tone < -0.3) S.push(pick(['Miért beszélsz így velem?', 'Ez fáj. Mit vétettem?', 'Ne fenyegess.']));
        else S.push(pick(['Nem értem egészen, mit akarsz ezzel.', 'Értem. Azt hiszem.', 'Gondolkodom rajta.', `Aha. ${this.state(world, a)}`]));
      }
      // egy sor a mostani helyzetről (a beszédesek beszédesebbek)
      if (S.length < 3 && (it.kind === 'greet' || it.kind === 'tell') && rng.chance(0.3 + P.sociability * 0.6)) S.push(this.state(world, a));
      if (P.humor > 0.75 && rng.chance(0.2)) S.push(pick(['Ha már mindent hallasz, hozhatnál egy kis esőt is. Vagy inkább ne.', 'Legalább te nem horkolsz éjjel.', 'Ha isten vagy, miért nem tudsz tüzet rakni helyettem?']));
      let out = S.filter(Boolean).join(' ').trim();
      if (!out) out = this.state(world, a);
      if (P.sociability < 0.3 && out.length > 120) out = out.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      return out;
    },
    /** Egy mondat arról, hogy van most. */
    state(world, a) {
      const N = a.needs, E = a.emotions; const rng = world.rng; const pick = (arr) => rng.pick(arr);
      if (N.food < 0.25) return pick(['Éhes vagyok, régen ettem rendesen.', 'Korog a gyomrom. Ételt kell találnom.']);
      if (N.water < 0.25) return pick(['Kiszáradt a torkom.', 'Vizet kell találnom, gyorsan.']);
      if (N.warmth < 0.35) return pick(['Fázom. A hideg a csontomig hatol.', 'Meleg kell. Tűz vagy fedél.']);
      if (E.grief > 0.5) return pick(['Elment valaki, aki fontos volt. Még mindig keresem.', 'Nehéz a szívem. Gyászolok.']);
      if (E.fear > 0.5) return pick(['Félek. Valami nincs rendben a levegőben.', 'Nem érzem magam biztonságban.']);
      if (E.love > 0.6 && a.partner != null) return `${(world.agents.get(a.partner) || {}).name || 'A párom'} mellett ma minden könnyebb.`;
      if (E.pride > 0.5) return 'Csináltam valamit, ami jó, és az enyém.';
      if (E.joy > 0.5) return pick(['Jól vagyok. Ma jó nap.', 'Nincs bajom. Süt a nap, van mit enni.']);
      return `Épp ${this.doing(world, a)}.`;
    },
    doing(world, a) { return firstPerson(LW.Actions.describe(world, a)); },
    answer(world, a, it, att) {
      const rng = world.rng; const pick = (arr) => rng.pick(arr); const W = world; const A = LW.Agents; const N = a.needs, E = a.emotions; const S = [];
      const name = (id) => { const o = W.agents.get(id) || W.deceased.get(id); return o ? o.name : 'valaki'; };
      const refuse = att === 'hostile' && rng.chance(0.6);
      switch (it.ask) {
        case 'how': { if (refuse) { S.push('Mit érdekel az téged.'); break; } S.push(this.state(W, a)); const hi = Object.entries(E).filter(([, v]) => v > 0.35).sort((x, y) => y[1] - x[1])[0]; if (hi && rng.chance(0.6)) S.push(`Leginkább ${LW.HU.emotion(hi[0])} van bennem.`); break; }
        case 'doing': { S.push(`Épp ${this.doing(W, a)}.`); const why = a.why; if (why && why.chosen && why.chosen.factors.length && rng.chance(0.7)) S.push(`Azért, mert ${why.chosen.factors[0]}.`); break; }
        case 'where': { const s = LW.Settlements.at(W, a.x, a.y); const home = a.home != null ? W.buildings.get(a.home) : null; const B = LW.BIOME_NAME[W.tiles.biome[W.idx(a.x | 0, a.y | 0)]]; S.push(s ? `${s.name} ${LW.HU.tier(s.tier)}ánál, ${B.toLowerCase()} vidéken.` : `Egy ${B.toLowerCase()} vidéken, nincs neve ennek a helynek.`); S.push(home ? `Van otthonom: egy ${LW.Buildings.def(home).label.toLowerCase()}.` : 'Otthonom nincs, ott alszom, ahol az este ér.'); break; }
        case 'who': { const par = a.parents.filter((p) => p != null).map(name); S.push(`${a.name} vagyok${par.length ? `, ${par.join(' és ')} gyermeke` : a.genesis ? ', az Elsők egyike' : ''}. ${Math.floor(A.age(W, a))} éves ${a.sex === 'f' ? 'nő' : 'férfi'}.`); if (a.occupation) S.push(`Leginkább ${LW.HU.occupation(a.occupation)} vagyok.`); break; }
        case 'age': S.push(`${Math.floor(A.age(W, a))} telet láttam.`); break;
        case 'family': { if (refuse) { S.push('A családom nem a te dolgod.'); break; } const p = a.partner != null ? name(a.partner) : null; const kids = a.children.map(name); const par = a.parents.filter((x) => x != null).map(name); S.push(p ? `A párom ${p}.` : A.isAdult(W, a) ? 'Nincs párom.' : 'Még gyerek vagyok.'); if (kids.length) S.push(`Gyerekeim: ${kids.join(', ')}.`); if (par.length) S.push(`Szüleim: ${par.join(' és ')}.`); const best = [...a.relationships.entries()].filter(([id, r]) => W.agents.has(id) && r.friendship > 0.4).sort((x, y) => y[1].friendship - x[1].friendship)[0]; if (best) S.push(`A legjobb barátom ${name(best[0])}.`); const foe = [...a.relationships.entries()].filter(([id, r]) => W.agents.has(id) && r.resentment > 0.5)[0]; if (foe) S.push(`${name(foe[0])} — vele nem vagyunk jóban.`); break; }
        case 'know': { const techs = [...a.knowledge.techs].map((t) => LW.Tech.D[t]).filter((d) => d && !d.hidden).map((d) => d.name.toLowerCase()); S.push(techs.length ? `Ezekhez értek: ${techs.slice(0, 6).join(', ')}.` : 'Nem tudok még semmit, csak amit a kezem és a gyomrom tanított.'); const sk = Object.entries(a.skills).sort((x, y) => y[1] - x[1])[0]; if (sk && sk[1] > 0.3) S.push(`A legjobban ${LW.HU.skill(sk[0])}ben vagyok jó.`); break; }
        case 'fear': { const hi = Object.entries(E).sort((x, y) => y[1] - x[1])[0]; if (E.fear > 0.4) S.push(pick(['Félek. A sötéttől, a vadaktól, attól, hogy nem lesz mit enni.', 'Félek, hogy nem érem meg a következő nyarat.'])); else if (hi && hi[1] > 0.3) S.push(`Most leginkább ${LW.HU.emotion(hi[0])} van bennem.`); else S.push('Nem félek. Most nem.'); const m = a.memory.emotional[a.memory.emotional.length - 1]; if (m && rng.chance(0.6)) S.push(`Ami nem hagy nyugodni: ${m.text}.`); break; }
        case 'me': { if ((a.beliefs.simulation || 0) > 0.6) S.push('Tudom, ki vagy. Az, aki figyeli ezt a világot — ahogy mi figyeljük a magunkét a Világmagban.'); else if (a.beliefs.creator < 0.25 && LW.Civilization && LW.Civilization.skepticism(W, a) > 0.3) S.push(pick(['A tudomány szerint nincs teremtő. Te a fejemben szólsz, vagy egy trükk.', 'Nem hiszek olyanban, amit nem lehet mérni.'])); else if (a.beliefs.creator < 0.25) S.push(pick(['Nem tudom, ki vagy. Egy hang, aminek nincs szája.', 'Nem ismerlek. Talán a fejemben laksz.'])); else if (a.beliefs.creator < 0.7) S.push(pick(['Azt mondják, van valaki az égen túl, aki figyel. Te lennél az?', 'Egy hang az égből. Nem tudom, mit akarsz tőlünk.'])); else S.push(pick(['Te vagy az, aki figyel minket. A Teremtő.', 'Hiszek benned. Láttam, amit tettél.'])); const tr = a.beliefs.trust; S.push(tr > 0.3 ? 'Bízom benned.' : tr < -0.3 ? 'Nem bízom benned. Amit tettél, nem felejtem.' : 'Még nem tudom, jót akarsz-e.'); break; }
        case 'want': { if (N.food < 0.4) S.push('Ételt. Ha tudsz adni, adj.'); else if (N.water < 0.4) S.push('Vizet.'); else if (N.warmth < 0.4) S.push('Meleget. Tüzet vagy fedelet.'); else if (a.home == null && A.isAdult(W, a)) S.push('Egy otthont. Falakat a hideg ellen.'); else if (a.partner == null && A.isAdult(W, a) && N.affection < 0.5) S.push('Valakit, aki mellettem alszik.'); else S.push(pick(['Semmit. Megvan, ami kell.', 'Hogy a gyerekek megérjék a nyarat.', 'Hogy hagyj minket élni.'])); break; }
        case 'meaning': { const w = it.word; let hit = null; for (const c in a.vocab) if (a.vocab[c].w === w) { hit = c; break; } if (!hit) { for (const l of W.langs.values()) for (const c in l.words) if (l.words[c] === w) hit = c; } if (!hit) S.push(pick([`„${w}”? Ezt a szót nem ismerem.`, 'Ilyet nem mondunk.'])); else if ((a.vocab[hit] && a.vocab[hit].s && (a.beliefs.trust || 0) < 0.35) || refuse) S.push(pick(['Azt nem mondom meg. Az a miénk.', 'Nem neked való szó.'])); else { S.push(`„${w}” azt jelenti: ${LW.Speech.gloss(hit)}.`); LW.Speech.reveal(W, a.langId, w, hit, a.vocab[hit] && a.vocab[hit].s); } break; }
        case 'language': { const ks = Object.keys(a.vocab); if (!ks.length) S.push('Nincsenek még szavaink. Mutogatunk.'); else if (refuse || (a.beliefs.trust || 0) < -0.2) S.push('A szavaink a mieink. Nem tanítom meg neked.'); else { const sel = rng.shuffle(ks.slice()).filter((c) => !a.vocab[c].s).slice(0, 3); S.push(`Így mondjuk: ${sel.map((c) => `„${a.vocab[c].w}” — ${LW.Speech.gloss(c)}`).join(', ')}.`); for (const c of sel) LW.Speech.reveal(W, a.langId, a.vocab[c].w, c, 0); const l = W.langs.get(a.langId); if (l && l.name) S.push(`A nyelvünk a ${l.name.toLowerCase()}.`); } break; }
        case 'weather': { const temp = W.tileTemp(W.idx(a.x | 0, a.y | 0)); S.push(`${W.weather.describe(temp)}, ${temp.toFixed(0)} fok. ${temp < 5 ? 'Hideg.' : temp > 25 ? 'Meleg.' : 'Elviselhető.'}`); break; }
        case 'world': { const ch = W.history.chronicle.slice(-3).map((e) => e.text); S.push(ch.length ? `Ami történt: ${ch.join(' ')}` : 'Nem történt semmi, amiről beszélni érdemes.'); break; }
        case 'why': { const m = a.mind; if (m && m.purpose) S.push(`Ami hajt: ${LW.Mind.label(m.purpose)}.`); if (m && m.existential > 0.5) S.push(pick(['És mégis: néha nem tudom, mi értelme az egésznek.', 'De vannak kérdéseim, amikre senki nem felel. Te sem.'])); else S.push(pick(['Nem kérdezem, mi értelme. Élek.', 'Reggel felkelek, és van dolgom. Ez elég.'])); if (m && m.journal.length) S.push(`Tegnap ezt gondoltam: „${m.journal[m.journal.length - 1].text}”`); break; }
        case 'dream': { const m = a.mind; const d = m ? m.journal.slice().reverse().find((j) => j.text.startsWith('Álmodtam')) : null; S.push(d ? d.text : pick(['Nem emlékszem, mit álmodtam. Csak arra, hogy féltem.', 'Álmomban a folyónál voltam, és nem volt hideg.'])); break; }
        case 'self': { const m = a.mind || LW.Mind.fresh(); S.push(m.selfImage > 0.3 ? 'Azt hiszem, kedvelnek. Számítanak rám.' : m.selfImage < -0.3 ? 'Nem kedvelnek. Nem tudom, miért.' : 'Nem tudom, mit gondolnak rólam. Nem kérdezem.'); S.push(m.mortality > 0.6 ? pick(['Igen, félek a haláltól. Fogy az időm, és még nem adtam át mindent.', 'Meghalok. Nem ma. De közel van.']) : m.mortality > 0.3 ? 'A halál eszembe jut néha. Aztán dolgozom tovább.' : 'A halál messze van. Most élek.'); break; }
        case 'sim': { const s = a.beliefs.simulation || 0; const sk = LW.Civilization ? LW.Civilization.skepticism(W, a) : 0; if (s > 0.6) S.push(pick(['Igen. Tudom. Mi is egy gépben élünk — és az sem biztos, hogy a tiéd az utolsó.', 'Valaki nézi ezt. Te. És talán téged is néz valaki.', 'Nem baj, ha teremtettek vagyunk. A kenyér attól még kenyér.'])); else if (s > 0 && s < 0.3) S.push(pick(['Nem. Ez a világ valódi. Érzem a hideget, a kenyeret, a fájdalmat. Ne mondj nekem ilyet.', 'Aki ilyet mond, az beteg vagy hazudik. Én valódi vagyok.'])); else if (sk > 0.3) S.push(pick(['A tudomány nem talált teremtőt. Te a fejemben vagy, vagy egy trükk.', 'Nem hiszek olyanban, amit nem mérhetek. Téged sem tudlak mérni.'])); else S.push(pick(['Nem értem a kérdést. Itt vagyok, ez a világ van. Mi más lenne?', 'Szimu… mi? Itt a folyó, itt a tűz. Ez a valóság.'])); break; }
        default: S.push(pick(['Nem értem a kérdést.', 'Erre nem tudok mit mondani.', `Nem tudom. ${this.state(W, a)}`]));
      }
      return S;
    },
    /** A hang mindenkihez szól: mindenki hallja, aki ébren van; néhányan felelnek. */
    broadcast(world, text, opts) {
      opts = opts || {}; const it = this.parse(world, text); const rng = world.rng; const hearers = [], replies = [];
      for (const a of world.agents.values()) { if (a.sleeping && rng.chance(0.7)) continue; if (LW.Agents.stage(world, a) === 'infant') continue; hearers.push(a); }
      const max = opts.maxReplies || 3;
      const order = hearers.slice().sort((x, y) => (y.beliefs.creator + y.personality.sociability * 0.5 + (y.id === opts.preferId ? 2 : 0)) - (x.beliefs.creator + x.personality.sociability * 0.5 + (x.id === opts.preferId ? 2 : 0)));
      for (const a of hearers) { const res = this.respond(world, a, text, { intent: { ...it }, broadcast: true }); if (order.indexOf(a) < max && (res.reply || res.utt)) replies.push({ a, res }); }
      world.events.emit('CreatorSpoke', { tick: world.tick, text: `A hang mindenkihez szólt: „${excerpt(text)}”`, hearers: hearers.length });
      return { it, hearers: hearers.length, replies };
    },
    // ---------------- nyelvi modellnek: tények és kérés
    facts(world, a) {
      const W = world; const A = LW.Agents; const N = a.needs, E = a.emotions; const name = (id) => { const o = W.agents.get(id) || W.deceased.get(id); return o ? o.name : 'valaki'; };
      const s = LW.Settlements.at(W, a.x, a.y); const home = a.home != null ? W.buildings.get(a.home) : null; const l = W.langs.get(a.langId);
      const lines = [];
      lines.push(`Név: ${a.name} (${a.sex === 'f' ? 'nő' : 'férfi'}, ${Math.floor(A.age(W, a))} éves, ${LW.HU.occupation(a.occupation || A.stage(W, a))}${a.genesis ? ', az Elsők egyike' : ''})`);
      lines.push(`Világ: ${W.name}, ${W.year}. év, ${LW.Time.seasonName(W.tick)}, ${LW.Time.isNight(W.tick) ? 'éjszaka' : 'nappal'}; idő: ${W.weather.describe(W.tileTemp(W.idx(a.x | 0, a.y | 0)))}, ${W.tileTemp(W.idx(a.x | 0, a.y | 0)).toFixed(0)} °C`);
      lines.push(`Hely: ${s ? s.name + ' (' + LW.HU.tier(s.tier) + ')' : 'névtelen vidék'}; otthon: ${home ? LW.Buildings.def(home).label.toLowerCase() : 'nincs'}`);
      lines.push(`Éppen: ${this.doing(W, a)}${a.why && a.why.chosen ? ' — mert ' + a.why.chosen.factors.slice(0, 2).join(', ') : ''}`);
      lines.push(`Szükségletek (0–100): ${Object.entries(N).map(([k, v]) => `${LW.HU.need(k).toLowerCase()} ${Math.round(v * 100)}`).join(', ')}; egészség ${Math.round(a.health * 100)}`);
      const em = Object.entries(E).filter(([, v]) => v > 0.15).sort((x, y) => y[1] - x[1]).slice(0, 4); lines.push(`Érzések: ${em.length ? em.map(([k, v]) => `${LW.HU.emotion(k)} ${Math.round(v * 100)}`).join(', ') : 'nyugodt'}`);
      const tr = Object.entries(a.personality).sort((x, y) => Math.abs(y[1] - 0.5) - Math.abs(x[1] - 0.5)).slice(0, 5); lines.push(`Jellem: ${tr.map(([k, v]) => `${v < 0.5 ? 'kevés ' : ''}${LW.HU.trait(k)} (${Math.round(v * 100)})`).join(', ')}`);
      lines.push(`Család: pár: ${a.partner != null ? name(a.partner) : 'nincs'}; szülők: ${a.parents.filter((p) => p != null).map(name).join(', ') || (a.genesis ? 'nincs, teremtetett' : 'ismeretlen')}; gyerekek: ${a.children.map(name).join(', ') || 'nincs'}`);
      const rels = [...a.relationships.entries()].filter(([id]) => W.agents.has(id)).map(([id, r]) => ({ id, r, label: LW.Relationships.label(r) })).filter((x) => x.label !== 'idegen').sort((x, y) => (y.r.friendship + y.r.romance - y.r.resentment) - (x.r.friendship + x.r.romance - x.r.resentment)).slice(0, 5); if (rels.length) lines.push(`Kapcsolatok: ${rels.map((x) => `${name(x.id)} (${x.label})`).join(', ')}`);
      const techs = [...a.knowledge.techs].map((t) => LW.Tech.D[t]).filter((d) => d && !d.hidden).map((d) => d.name.toLowerCase()); lines.push(`Tudás: ${techs.length ? techs.join(', ') : 'semmi, csak ösztön'}; holmi: ${Object.entries(a.inv).filter(([, q]) => q > 0).map(([k, q]) => `${LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k} ×${q}`).join(', ') || 'semmi'}`);
      lines.push(`Hit a Teremtőben: ${Math.round(a.beliefs.creator * 100)}/100; bizalom a hang iránt: ${Math.round((a.beliefs.trust || 0) * 100)} (−100…100)`);
      const ks = Object.keys(a.vocab || {}); lines.push(`Nyelv: ${l ? LW.Speech.describeLang(W, l) : 'nincs'}; ${ks.length} szót tud${ks.length ? ', pl. ' + ks.slice(0, 5).map((c) => `„${a.vocab[c].w}”=${LW.Speech.gloss(c)}`).join(', ') : ' (mutogat)'}`);
      if (a.mind) { lines.push(`Belső világ: ${LW.Mind.describe(W, a).join(' ')}${a.ill > 0 ? ' Most beteg.' : ''}`); const j = a.mind.journal.slice(-3).map((x) => x.text); if (j.length) lines.push(`Belső hangja (utolsó gondolatok): ${j.join(' | ')}`); }
      const mems = a.memory.episodic.slice(-8).reverse().map((m) => `${LW.Time.year(m.tick)}. év: ${m.text}`); lines.push(`Emlékek (frissek elöl): ${mems.join(' | ') || 'nincs'}`);
      const strong = a.memory.emotional.slice(-3).map((m) => m.text); if (strong.length) lines.push(`Legerősebb emlékek: ${strong.join(' | ')}`);
      const recent = W.history.chronicle.slice(-4).map((e) => e.text); if (recent.length) lines.push(`Ami a világban történt mostanában: ${recent.join(' ')}`);
      return lines;
    },
    prompt(world, a, text, res) {
      const facts = this.facts(world, a); const it = res.it;
      const outcome = it.cmd ? `A hang kérésére a döntésed már megszületett: ${{ obey: 'ENGEDELMESKEDSZ (megteszed, amit kért)', misinterpret: 'FÉLREÉRTETTED, valami hasonlót fogsz tenni', fear: 'MEGRÉMÜLTÉL és elbújsz', ignore: 'NEM TÖRŐDSZ VELE, a magad dolgát teszed' }[res.how] || 'nem tudod megtenni'}.` : res.nudged ? `A hang sugallata elért: egy napig erősebben gondolsz erre: ${GOAL_HU[res.nudged] || res.nudged}. Nem ígérsz semmit, csak fontolgatod.` : '';
      const att = { confused: 'Nem tudod, ki beszél; zavart vagy, talán félsz. Nem tudsz semmit Teremtőről.', hostile: 'Neheztelsz a hangra, kurtán, elutasítóan felelsz.', wary: 'Gyanakodsz, óvatos vagy.', neutral: 'Semleges vagy, kíváncsi.', warm: 'Bizalommal, barátságosan felelsz.', devout: 'Hiszel benne, hogy a Teremtő szól; tisztelettel felelsz.' }[res.att];
      const hist = (a.chatHistory || []).slice(-8, -1).map((h) => `${h.who === 'creator' ? 'A hang' : a.name}: ${h.text}`).join('\n');
      const system = `Te ${a.name} vagy, egy ember egy ősi, kezdetleges világban. Nem tudsz semmit a mi világunkról, gépekről, országokról, más nyelvekről; csak azt tudod, ami a TÉNYEK között áll — ne találj ki új tényeket, neveket, helyeket. Egy száj nélküli hang szól hozzád (a világ Teremtője, aki figyeli a világot). Beszélj első személyben, MAGYARUL, egyszerűen, ahogy egy ilyen ember beszélne: 1–3 rövid mondat, a jellemed és a hangulatod szerint. ${att} Ha a hang parancsot adott, a döntést NEM te hozod meg most: a lenti KIMENETEL szerint fogalmazz. Ne magyarázd a rendszert, ne használj idézőjelet. Válaszolj kizárólag ezzel a JSON-nal: {"reply": "a válaszod", "trust": szám -0.2 és 0.2 között (mennyit változott a bizalmad a hang iránt e mondat után)}`;
      const user = `TÉNYEK:\n${facts.join('\n')}\n${hist ? `\nEDDIGI BESZÉLGETÉS:\n${hist}\n` : ''}${outcome ? `\nKIMENETEL: ${outcome}\n` : ''}\nA hang most ezt mondja neked: „${text}”`;
      return { system, user };
    },
    /** A modell válaszának alkalmazása (csak fogalmazás + kis bizalomváltozás). */
    applyModel(world, a, parsed) {
      const reply = parsed && typeof parsed.reply === 'string' ? parsed.reply.trim().slice(0, 400) : ''; if (!reply) return null;
      const d = parsed && typeof parsed.trust === 'number' ? clamp(parsed.trust, -0.2, 0.2) : 0; a.beliefs.trust = clamp((a.beliefs.trust || 0) + d * 0.5, -1, 1);
      if (a.chatHistory && a.chatHistory.length && a.chatHistory[a.chatHistory.length - 1].who === a.id) a.chatHistory[a.chatHistory.length - 1].text = reply.slice(0, 240); else (a.chatHistory = a.chatHistory || []).push({ who: a.id, text: reply.slice(0, 240), t: world.tick });
      return reply;
    },
    /** Beszélgetés naplózása a világban (a felhőben is megmarad). */
    log(world, entry) { world.chatLog = world.chatLog || []; entry.t = world.tick; entry.ms = Date.now(); world.chatLog.push(entry); if (world.chatLog.length > 200) world.chatLog.splice(0, world.chatLog.length - 200); return entry; },
  };
  function excerpt(text) { const s = String(text || '').replace(/\s+/g, ' ').trim(); return s.length > 60 ? s.slice(0, 57) + '…' : s; }
  LW.Dialogue = Dialogue;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== sim/macro.js ===== */
/* LEVENTE — THE CREATOR · sim/macro.js
 * Day-scale simulation used for long catch-ups. The world (weather, ecology, fire,
 * buildings) runs its real per-tick model; agents are advanced statistically but
 * through the same event-producing functions (conversations, flirts, births,
 * discoveries, construction) so history stays real. (SIMULATION_MODEL.md §6)
 */
(function (LW) {
  'use strict';
  const T = LW.TIME, A = () => LW.Agents;

  const Macro = {
    day(world) {
      const w = world, rng = w.rng;
      // world systems: real ticks without agents
      for (let k = 0; k < T.TICKS_PER_DAY; k++) { w.tick++; w.weather.step(); LW.Ecology.stepSlice(w); LW.Ecology.stepFire(w); LW.Buildings.step(w); if (w.tick % T.TICKS_PER_YEAR === 0) w.history.yearEnd(); }
      w.meta.lastSimulatedTick = w.tick; w.rebuildBuckets();
      const season = LW.Time.season(w.tick); const seasonFood = [1, 1.05, 0.95, 0.8][season];
      const agents = w.agentList(); w._macroLoad = Math.min(1, 140 / Math.max(1, agents.length)); // nagy népességnél a drága, választható lépések ritkulnak (a felzárkózás ne tartson percekig)
      for (const a of agents) {
        if (!w.agents.has(a.id)) continue;
        try { this.agentDay(w, a, seasonFood); } catch (e) { if (w.onError) w.onError(e, a, { op: 'macro' }); }
      }
      LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w); LW.Society.daily(w);
      for (const [i, g] of w.ground) { A().spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); }
    },
    agentDay(w, a, seasonFood) {
      const rng = w.rng; const stage = A().stage(w, a); const adult = stage === 'adult' || stage === 'elder'; const child = stage === 'infant' || stage === 'child';
      const home = a.home != null ? w.buildings.get(a.home) : null;
      if (home) { a.x = home.x + 0.5; a.y = home.y + 0.5; }
      else { // the homeless drift toward other people (a day's walk at most)
        let bestO = null, bd = 1e9; for (const o of w.agents.values()) { if (o === a || (o.home == null && !A().isAdult(w, o))) continue; const d = LW.dist(a.x, a.y, o.x, o.y); if (d < bd && d > 2) { bd = d; bestO = o; } }
        if (bestO && bd > 4) { const step = Math.min(bd - 3, 12); const nx = a.x + (bestO.x - a.x) / bd * step, ny = a.y + (bestO.y - a.y) / bd * step; const ti = w.randomNear(nx | 0, ny | 0, 1); a.x = w.xOf(ti) + 0.5; a.y = w.yOf(ti) + 0.5; }
      }
      const hh = A().household(w, a); const i = w.idx(a.x | 0, a.y | 0);
      // the young learn where things are from the people they live with
      if (!adult) { const cg = [...A().caregivers(w, a), ...hh.filter((o) => o !== a && A().isAdult(w, o))]; for (const c of cg) { const pl = [...c.knowledge.places.values()]; for (let k = 0; k < 4 && pl.length; k++) { const p = rng.pick(pl); A().rememberPlace(w, a, p.k, p.i, p.q); } } }
      // ---- food & water
      let intake;
      const supported = A().caregivers(w, a).length > 0 || hh.some((o) => o !== a && A().isAdult(w, o)) || (!adult && w.agentsNear(a.x, a.y, 14, a.id).some((o) => A().isAdult(w, o))); // orphans are taken in by the people around them
      if (child) { intake = supported ? 0.95 : 0.4; }
      else {
        const foodQ = Math.min(1, [...a.knowledge.places.values()].filter((p) => p.k === 'food').reduce((s, p) => s + p.q, 0) / 400) * (1 - Math.min(0.5, (w.agentsNear(a.x, a.y, 10, a.id).length) * 0.03)); // sokan ugyanazt a bokrot dézsmálják
        const hunt = a.inv.spear && A().knownCount(a, 'animals') ? 0.4 : 0; const fish = a.knowledge.techs.has('fishing') && A().knownCount(a, 'fish') ? 0.35 : 0;
        intake = (0.55 + 0.5 * (0.6 + a.skills.gathering * 0.6) * seasonFood * foodQ * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1) + hunt + fish) * (1 + LW.Tech.fx(w, a).food * 0.6 + LW.Tech.fx(w, a).farm * 0.2);
        if (stage === 'adolescent' && supported) intake = Math.max(intake, 0.9);
        // people who live together share food
        if (intake < 0.9) { const donors = hh.filter((o) => o !== a && A().isAdult(w, o)); if (donors.length) intake = Math.max(intake, 0.85); }
        if (home && home.storage) { const stock = A().foodUnits(home.storage); if (stock > 0 && intake < 1) { const need = Math.min(stock, (1 - intake) * 1.5); for (const k of Object.keys(home.storage)) { const d = LW.ITEMS[k]; if (!d || !d.food) continue; let take = Math.min(home.storage[k], Math.ceil(need / d.food)); home.storage[k] -= take; if (home.storage[k] <= 0) delete home.storage[k]; intake += take * d.food / 1.5; if (intake >= 1) break; } }
          else if (intake > 1.1 && LW.Buildings.def(home).storage) { const surplus = Math.floor((intake - 1) * 2); home.storage.berries = Math.min((LW.Buildings.def(home).storage || 0), (home.storage.berries || 0) + surplus); } }
        if (intake < 0.9) for (const st of LW.Tree.storesNear(w, a, 16)) { for (const k of Object.keys(st.storage)) { const d = LW.ITEMS[k]; if (!d || !d.food || st.storage[k] <= 0) continue; const take = Math.min(st.storage[k], Math.ceil((1 - intake) / d.food)); st.storage[k] -= take; if (st.storage[k] <= 0) delete st.storage[k]; intake += take * d.food / 1.5; if (intake >= 1) break; } if (intake >= 1) break; } // üvegház, halastó, piac: a közös készlet is etet
      }
      const cfg = w.cfg.agents;
      const deficit = Math.max(0, 0.9 - intake);
      if (deficit > 0) { a.health = Math.max(0, a.health - cfg.starvationHealthPerDay * deficit * 1.5); a.needs.food = Math.max(0.05, intake * 0.6); } else { a.needs.food = 0.7; a.health = Math.min(1 - a.injury, a.health + 0.1); }
      if (!A().knownCount(a, 'water') && !child) { a.health = Math.max(0, a.health - cfg.dehydrationHealthPerDay * 0.3); a.needs.water = 0.2; } else a.needs.water = 0.75;
      // ---- warmth (mean of the day)
      let temp = 0; for (let h = 0; h < 4; h++) { temp += w.tiles.baseTemp[i]; } temp = w.tileTemp(i) - 2; // tileTemp includes diurnal (evening) — approximate daily mean
      const fireNear = w.buildingsNear(a.x | 0, a.y | 0, 4).some((b) => b.kind === 'campfire' && b.lit && LW.dist(b.x, b.y, a.x, a.y) < 4);
      const eff = temp + 2 + (home ? LW.Buildings.def(home).insulation || 0 : Math.min(3, hh.length)) + (fireNear ? 8 : 0) + (a.inv.clothes ? 8 : 0);
      if (eff < 8) { a.health = Math.max(0, a.health - cfg.hypothermiaHealthPerDay * (8 - eff) / 10); a.needs.warmth = 0.2; } else a.needs.warmth = 0.9;
      a.needs.energy = 0.8; a.needs.social = Math.min(1, a.needs.social + 0.2); a.needs.safety = home ? 0.8 : 0.5;
      if (a.health <= 0) { A().die(w, a, deficit > 0 ? 'éhezés' : eff < 8 ? 'kihűlés' : 'betegség'); return; }
      if (a.memory.episodic.length > w.cfg.agents.memoryCap) LW.Memory.consolidate(w, a);
      // emotions decay
      for (const k in a.emotions) a.emotions[k] *= k === 'grief' ? 0.9 : 0.6;
      // daily biology (aging, illness, pregnancy, development, relationships decay, occupation)
      A().daily(w, a); if (!w.agents.has(a.id)) return;
      // ---- social life
      const near = w.agentsNear(a.x, a.y, 14, a.id).filter((o) => w.agents.has(o.id));
      if (near.length && stage !== 'infant') { const n = (w._macroLoad || 1) < 0.6 ? (rng.chance(0.7) ? 1 : 0) : 1 + rng.int(0, 2); for (let k = 0; k < n; k++) { const o = rng.pick(near); if (A().stage(w, o) !== 'infant' && rng.chance(0.7)) LW.Social.interact(w, a, o, 'converse', {}); } }
      if (adult) {
        if (a.partner != null && w.agents.has(a.partner)) { const p = w.agents.get(a.partner); if (rng.chance(0.5)) LW.Social.interact(w, a, p, 'mate', {}); }
        else if (near.length && rng.chance(0.12)) { let best = null, bs = 0.35; for (const o of near) { if (!A().isAdult(w, o)) continue; const r = LW.Relationships.ensure(w, a, o); if (r.status === 'family' && LW.Relationships.kinship(w, a, o) >= 0.9) continue; if (r.lastFlirt != null && w.tick - r.lastFlirt < T.TICKS_PER_DAY * 6) continue; if (r.attraction > bs) { bs = r.attraction; best = o; } } if (best) LW.Social.interact(w, a, best, 'flirt', {}); }
        // partners with dating status progress
        for (const [id, r] of a.relationships) if (r.status === 'dating' && rng.chance(0.3)) { const o = w.agents.get(id); if (o) LW.Social.interact(w, a, o, 'flirt', {}); }
      }
      // ---- teaching children
      if (adult) for (const cid of a.children) { const c = w.agents.get(cid); if (!c || A().isAdult(w, c)) continue; const cand = [...a.knowledge.techs].filter((t) => !c.knowledge.techs.has(t) && !LW.Tech.D[t].hidden && (!LW.Tech.D[t].prereq || LW.Tech.D[t].prereq.every((p) => c.knowledge.techs.has(p)))); if (cand.length && rng.chance(0.2)) LW.Social.interact(w, a, c, 'teach', { tech: rng.pick(cand) }); const hid = [...a.knowledge.techs].filter((t) => !c.knowledge.techs.has(t) && LW.Tech.D[t].hidden); if (hid.length && rng.chance(0.3)) LW.Tech.learn(w, c, rng.pick(hid), 'taught', a); }
      // ---- discovery
      const load = w._macroLoad || 1;
      if (adult && a.health > 0.4 && intake > 0.8 && rng.chance(0.12 * (0.3 + a.personality.curiosity) * load)) {
        const el = LW.Tech.eligible(w, a).filter((id) => { const d = LW.Tech.D[id]; if (d.nearby === 'fire' && !fireNear) return false; if (d.nearby === 'water' && !A().knownCount(a, 'water')) return false; if (d.nearby && d.nearby !== 'fire' && d.nearby !== 'water' && !this.buildingNear(w, a, d.nearby, 24)) return false; return true; });
        if (el.length) { const id = rng.pick(el); const d = LW.Tech.D[id]; const can = LW.Tech.hasItems(a, d) || this.canSource(w, a, d); if (can) { a.counters.experiments++; if (rng.chance(LW.Tech.successChance(w, a, d))) LW.Tech.learn(w, a, id, 'discovery'); else a.knowledge.progress[id] = Math.min(0.95, (a.knowledge.progress[id] || 0) + 0.06); } }
      }
      // ---- skills & tools
      if (adult) { A().practice(a, 'gathering', 8); A().practice(a, 'foraging', 5); A().practice(a, 'crafting', 2); A().practice(a, 'building', home ? 1 : 2); A().practice(a, 'exploring', 1 + a.personality.curiosity * 2); if ((a.inv.spear || LW.Tree.bestTool(a, 'hunt') >= 1) && A().knownCount(a, 'animals')) A().practice(a, 'hunting', 4); if (a.knowledge.techs.has('seed_planting')) A().practice(a, 'farming', 5); if (a.knowledge.techs.has('herbal_medicine')) A().practice(a, 'medicine', 2); A().practice(a, 'social', 2); if (a.knowledge.techs.has('stone_knapping') && !a.inv.handaxe && A().knownCount(a, 'stone') && A().knownCount(a, 'flint') && rng.chance(0.3)) { a.inv.handaxe = 1; w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: 'handaxe', first: !w.firsts['item:handaxe'] }); } if (a.knowledge.techs.has('spear_making') && !a.inv.spear && rng.chance(0.3)) { a.inv.spear = 1; w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: 'spear', first: !w.firsts['item:spear'] }); } if (a.knowledge.techs.has('basket_weaving') && !a.inv.basket && rng.chance(0.3)) a.inv.basket = 1; if (a.knowledge.techs.has('hide_working') && !a.inv.clothes && (a.inv.hide || 0) >= 2 && rng.chance(0.4)) { a.inv.hide -= 2; a.inv.clothes = 1; } if (a.inv.spear && A().knownCount(a, 'animals') && rng.chance(0.25)) a.inv.hide = (a.inv.hide || 0) + 1; }
      // ---- fire & shelter
      if (adult && a.knowledge.techs.has('fire_making')) {
        const fires = w.buildingsNear(a.x | 0, a.y | 0, 8).filter((b) => b.kind === 'campfire' && LW.dist(b.x, b.y, a.x, a.y) < 8);
        if (!fires.length && rng.chance(0.5) && A().knownCount(a, 'wood')) { const s = LW.Buildings.findSite(w, a, 'campfire'); if (s >= 0) { const b = LW.Buildings.create(w, 'campfire', w.xOf(s), w.yOf(s), a.id); b.delivered = { wood: 3 }; LW.Buildings.complete(w, b, a); } }
        else for (const f of fires) if (!f.lit || f.fuel < T.TICKS_PER_DAY) { if (rng.chance(0.8)) { f.fuel = LW.Buildings.DEFS.campfire.fuelTicks; f.lit = true; } }
      }
      if (adult) {
        let kind = null, kt = 0; for (const k in LW.Buildings.DEFS) { const d = LW.Buildings.DEFS[k]; if (d.dwelling && d.tier && (!d.tech || a.knowledge.techs.has(d.tech)) && d.tier > kt) { kt = d.tier; kind = k; } }
        const tier = { [kind]: kt }; const cur = home ? LW.Buildings.DEFS[home.kind].tier || 0 : 0;
        const partnerHome = a.partner != null && w.agents.get(a.partner)?.home != null;
        if (kind && cur < tier[kind] && !(cur === 0 && partnerHome)) {
          let site = w.buildingsNear(a.x | 0, a.y | 0, 24).find((b) => b.ownerId === a.id && b.progress < 1 && LW.Buildings.def(b).dwelling);
          if (!site && rng.chance(0.5)) { const s = LW.Buildings.findSite(w, a, kind); if (s >= 0) site = LW.Buildings.create(w, kind, w.xOf(s), w.yOf(s), a.id); }
          if (site) { const def = LW.Buildings.def(site); const cost = def.cost; const expectedDays = 2 + def.ticks / 40; for (const k in cost) site.delivered[k] = Math.min(cost[k], (site.delivered[k] || 0) + cost[k] / expectedDays * (0.6 + a.skills.building)); site.progress = Math.min(1, site.progress + 1 / expectedDays * (0.7 + a.skills.building * 0.6)); A().practice(a, 'building', 6); if (site.progress >= 1 && LW.Buildings.materialsComplete(site)) { a.counters.built++; LW.Buildings.complete(w, site, a); } else if (site.progress >= 1) site.progress = 0.95; }
        } else if (cur === 0 && partnerHome) { const ph = w.buildings.get(w.agents.get(a.partner).home); if (ph) LW.Buildings.moveIn(w, ph, a); }
        if (a.knowledge.techs.has('seed_planting') && home && rng.chance(0.35)) {
          const farms = w.buildingsNear(a.x | 0, a.y | 0, 20).filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id); const maxFarms = 1 + (hh.length >= 3 ? 1 : 0) + (a.knowledge.techs.has('plowing') ? 1 : 0) + (a.knowledge.techs.has('crop_rotation') ? 1 : 0);
          if (farms.length < maxFarms && LW.Time.season(w.tick) <= 1 && rng.chance(0.5)) { const s = LW.Buildings.findSite(w, a, 'farm_plot'); if (s >= 0) { const f = LW.Buildings.create(w, 'farm_plot', w.xOf(s), w.yOf(s), a.id); f.delivered = { wood: 2 }; LW.Buildings.complete(w, f, a); farms.push(f); } }
          for (const farm of farms) { if (farm.progress < 1) continue; if (!farm.planted && LW.Time.season(w.tick) <= 1) { farm.planted = true; farm.crop = 0; } else if (farm.planted && farm.crop >= 1) { const q = Math.round((30 + w.tiles.fert[w.idx(farm.x, farm.y)] / 255 * 30) * (1 + LW.Tech.fx(w, a).farm)); const store = home.storage ? home.storage : (LW.Tree.nearestStore(w, a, 12) || {}).storage; if (store) store.grain = Math.min((store.grain || 0) + q, 400); farm.planted = false; farm.crop = 0; A().practice(a, 'farming', 6); w.events.emit('Harvest', { tick: w.tick, agentId: a.id, amount: q, tile: w.idx(farm.x, farm.y), first: !w.firsts['harvest'] }); } }
        }
      }
      // ---- középületek és jobb szerszámok (a napi léptékben elvonatkoztatva: az anyagot a közösség előteremti)
      if (adult && rng.chance(0.06 * load)) { let which = null, best = 0, site = null;
        if (rng.chance(0.6)) { const open = w.buildingsNear(a.x | 0, a.y | 0, 20).filter((b) => b.progress < 1 && LW.Buildings.DEFS[b.kind].public && LW.Buildings.DEFS[b.kind].tech && a.knowledge.techs.has(LW.Buildings.DEFS[b.kind].tech)); if (open.length) { site = open.sort((p, q) => q.progress - p.progress)[0]; which = site.kind; best = 1; } } // előbb befejezik, amit elkezdtek
        if (!site) { const pick = LW.Society.pickPublic(w, a); which = pick ? pick.kind : null; best = pick ? pick.want : 0; }
        if (which && best > 0.5) { if (!site) site = w.buildingsNear(a.x | 0, a.y | 0, 20).find((b) => b.kind === which && b.progress < 1); if (!site) { const s = LW.Buildings.findSite(w, a, which); if (s >= 0) site = LW.Buildings.create(w, which, w.xOf(s), w.yOf(s), a.id); } if (site) { const def = LW.Buildings.def(site); const expectedDays = 3 + def.ticks / 30; for (const k in def.cost) site.delivered[k] = Math.min(def.cost[k], (site.delivered[k] || 0) + def.cost[k] / expectedDays); site.progress = Math.min(1, site.progress + 1 / expectedDays * (0.7 + a.skills.building * 0.6) * LW.Tech.mult(w, a, 'build')); A().practice(a, 'building', 4); if (site.progress >= 1 && LW.Buildings.materialsComplete(site)) { a.counters.built++; LW.Buildings.complete(w, site, a); } else if (site.progress >= 1) site.progress = 0.95; } } }
      // anyagtermelés a közösségnek: aki ért hozzá és van hozzá műhely, a közös raktárba dolgozik (réz, vas, tégla, papír, üveg…)
      if (adult && rng.chance(0.3 * load)) { const store = LW.Tree.nearestStore(w, a, 20); if (store) { const cands = []; for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || it.slot || it.tool || it.food || !a.knowledge.techs.has(R.tech)) continue; if ((store.storage[out] || 0) >= 24) continue; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 20)) continue; if (!this.canSource(w, a, { items: R.inp || (R.inpAny ? R.inpAny[0] : {}) })) continue; cands.push([rid, R, out]); } if (cands.length) { const [rid, R, out] = rng.pick(cands); const inp = R.inp || (R.inpAny ? R.inpAny[0] : {}); for (const k in inp) { const ps = LW.Tree.publicStore(w, a, k, 20); if (ps && ps.storage[k] >= inp[k]) ps.storage[k] -= inp[k]; else if ((a.inv[k] || 0) >= inp[k]) a.inv[k] -= inp[k]; } store.storage[out] = (store.storage[out] || 0) + R.out[out] * 2; a.wealth = (a.wealth || 0) + 1; A().practice(a, R.skill || 'crafting', 3); if (!w.firsts['item:' + out]) w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: out, first: true }); } } }
      if (adult) for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech) || LW.Tree.bestTool(a, it.slot) >= it.tier) continue; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 24)) continue; if (!this.canSource(w, a, { items: R.inp || (R.inpAny ? R.inpAny[0] : {}) })) continue; if (rng.chance(0.12)) { a.inv[out] = 1; if (!w.firsts['item:' + out]) w.events.emit('ItemCrafted', { tick: w.tick, agentId: a.id, item: out, first: true }); } }
      // ---- knowledge of places grows slowly even when abstracted (people wander)
      if (adult && rng.chance(0.5)) { const R = 10; for (let k = 0; k < 6; k++) { const x = LW.clamp((a.x | 0) + rng.int(-R, R), 0, w.w - 1), y = LW.clamp((a.y | 0) + rng.int(-R, R), 0, w.h - 1); const j = w.idx(x, y); const t = w.tiles; if (LW.isFreshBiome(t.biome[j])) A().rememberPlace(w, a, 'water', j, 255); if (t.veg[j] > 30) A().rememberPlace(w, a, 'food', j, t.veg[j]); if (t.trees[j] > 30) A().rememberPlace(w, a, 'wood', j, t.trees[j]); if (t.stone[j] > 30) { A().rememberPlace(w, a, 'stone', j, t.stone[j]); if (t.stone[j] >= 70 && (t.biome[j] === LW.BIOME.HILLS || t.biome[j] === LW.BIOME.MOUNTAIN || t.biome[j] === LW.BIOME.BEACH) && !t.depType[j]) A().rememberPlace(w, a, 'flint', j, t.stone[j] >> 1); } if (t.animals[j] > 40) A().rememberPlace(w, a, 'animals', j, t.animals[j]); if (t.depType[j] && !t.depKnown[j] && rng.chance(0.06 * (0.5 + a.personality.curiosity) * (a.knowledge.techs.has('digging') ? 2 : 1))) { t.depKnown[j] = 1; w.dirtyTiles.add(j); } // a vándorló szem észreveszi a felszíni ércet
          if (t.depType[j] && t.depKnown[j]) { if (t.depType[j] === LW.DEPOSIT.FLINT) A().rememberPlace(w, a, 'flint', j, 100); else if (t.depType[j] === LW.DEPOSIT.CLAY) { A().rememberPlace(w, a, 'clay', j, 100); LW.Tech.observe(w, a, 'clay'); } else { A().rememberPlace(w, a, 'deposit', j, t.depType[j]); const name = LW.DEPOSIT_NAME[t.depType[j]]; if (['copper', 'tin', 'iron', 'coal', 'gold'].includes(name) && !a.knowledge.techs.has('ore_lore_' + name)) { LW.Tech.learn(w, a, 'ore_lore_' + name, 'observation'); w.events.emit('ResourceFound', { tick: w.tick, agentId: a.id, tile: j, deposit: name, first: !w.firsts['deposit:' + name] }); } } } if (t.biome[j] === LW.BIOME.MARSH) { A().rememberPlace(w, a, 'clay', j, 80); LW.Tech.observe(w, a, 'clay'); } } }
      // expedíció: a kíváncsi ember elmegy megnézni a távolabbi, már ismert lelőhelyeket
      if (adult && rng.chance(0.02 * (0.3 + a.personality.curiosity))) { const t = w.tiles; const cands = []; const list = w._knownDeposits || []; for (let k = 0; k < 40 && list.length; k++) { const j = list[rng.int(0, list.length - 1)]; if (t.depType[j] && t.depKnown[j] && LW.dist(w.xOf(j), w.yOf(j), a.x, a.y) < 50) cands.push(j); } if (cands.length) { const j = rng.pick(cands); const dt = t.depType[j]; if (dt === LW.DEPOSIT.FLINT) A().rememberPlace(w, a, 'flint', j, 100); else if (dt === LW.DEPOSIT.CLAY) A().rememberPlace(w, a, 'clay', j, 100); else { A().rememberPlace(w, a, 'deposit', j, dt); const name = LW.DEPOSIT_NAME[dt]; if (['copper', 'tin', 'iron', 'coal', 'gold'].includes(name) && !a.knowledge.techs.has('ore_lore_' + name)) { LW.Tech.learn(w, a, 'ore_lore_' + name, 'observation'); w.events.emit('ResourceFound', { tick: w.tick, agentId: a.id, tile: j, deposit: name, first: !w.firsts['deposit:' + name] }); } } } }
      if (w.burning.size && rng.chance(0.3)) LW.Tech.observe(w, a, 'fire');
      if (fireNear) LW.Tech.observe(w, a, 'fire');
    },
    canSource(w, a, d, depth) { depth = depth || 0; const need = d.items || (d.itemsAny ? d.itemsAny[0] : {}); if (!depth) { const day = w.tick / T.TICKS_PER_DAY | 0; if (a._csDay !== day) { a._csDay = day; a._cs = {}; } const key = Object.keys(need).map((k) => k + need[k]).join(','); if (a._cs[key] != null) return a._cs[key]; const r = this._canSource(w, a, need, 0); a._cs[key] = r; return r; } return this._canSource(w, a, need, depth); },
    _canSource(w, a, need, depth) { for (const k in need) { if ((a.inv[k] || 0) >= need[k]) continue; { const ps = LW.Tree.publicStore(w, a, k, 20); if (ps && ps.storage[k] >= need[k]) continue; } const src = LW.Tech.SOURCE[k]; if (!src) { const R = LW.Tech.RECIPES[k]; if (!R || depth >= 2 || !a.knowledge.techs.has(R.tech)) return false; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && !this.buildingNear(w, a, R.nearby, 24)) return false; if (!this._canSource(w, a, R.inp || (R.inpAny ? R.inpAny[0] : {}), depth + 1)) return false; continue; } if (src === 'fiber') continue; if (src === 'store') { const home = a.home != null ? w.buildings.get(a.home) : null; if (!home || !home.storage || !(home.storage[k] >= need[k])) return false; continue; } if (src === 'animals') { if (!a.inv.spear && LW.Tree.bestTool(a, 'hunt') < 1) return false; continue; } if (src.startsWith('deposit:')) { const dt = LW.DEPOSIT[src.slice(8).toUpperCase()]; let ok = false; for (const p of a.knowledge.places.values()) if (p.k === 'deposit' && p.q === dt) { ok = true; break; } if (!ok || !a.knowledge.techs.has('digging')) return false; if (dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling')) return false; continue; } if (!A().knownCount(a, src)) return false; } return true; },
    buildingNear(w, a, what, r) { const DEFS = LW.Buildings.DEFS; for (const b of w.buildingsNear(a.x | 0, a.y | 0, r)) { if (b.progress < 1) continue; const def = DEFS[b.kind]; if ((b.kind === what || (def && def[what])) && LW.dist(a.x, a.y, b.x, b.y) <= r) return b; } return null; },
  };
  LW.Macro = Macro;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== sim/simulation.js ===== */
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
      world.reindexBuildings();
      LW.Speech.init(world);
      for (const a of world.agents.values()) { if (!a.mind) a.mind = LW.Mind.fresh(); if (a.ill == null) a.ill = 0; if (a.beliefs.simulation == null) a.beliefs.simulation = 0; }
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
      const total = macroDays * T.TICKS_PER_DAY + detailTicks; let doneTicks = 0; let dayI = 0; const t0 = now(); const budget = cb && cb.budgetMs ? cb.budgetMs : Infinity; this._catchSkip = false;
      const outOfTime = () => this._catchSkip || (now() - t0) > budget;
      const startTick = w.tick;
      const schedule = (fn) => (typeof setTimeout === 'function' ? setTimeout(fn, 0) : fn());
      const finish = () => { meta.lastRealTimeMs = Date.now(); report.skippedTicks = Math.max(0, total - doneTicks); /* a felzárkózás saját ideje nem tartozás — különben végtelen hurok */ report.after = w.history.snapshotStats(); report.chronicle = w.history.chronicle.slice(report.chronicleStart); report.firsts = Object.entries(w.history.firsts).filter(([, f]) => f.tick > startTick); report.beliefAfter = LW.mean([...w.agents.values()].map((a) => a.beliefs.creator)); report.worldTicks = w.tick - startTick; if (cb && cb.done) cb.done(report); };
      const stepMacro = () => {
        const n = Math.min(cfg.chunkDays, macroDays - dayI);
        for (let k = 0; k < n; k++) { LW.Macro.day(w); dayI++; doneTicks += T.TICKS_PER_DAY; }
        if (cb && cb.progress) cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);
        if (outOfTime()) { finish(); return; }
        if (dayI < macroDays) schedule(stepMacro); else schedule(stepDetail);
      };
      let dt = 0;
      const stepDetail = () => {
        const n = Math.min(300, detailTicks - dt);
        for (let k = 0; k < n; k++) this.tick();
        dt += n; doneTicks += n;
        if (cb && cb.progress) cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);
        if (dt < detailTicks && !outOfTime()) schedule(stepDetail); else finish();
      };
      if (cb && cb.progress) cb.progress(0, 'A világ ébred…');
      if (cb && cb.sync) { while (dayI < macroDays && !outOfTime()) { LW.Macro.day(w); dayI++; doneTicks += T.TICKS_PER_DAY; } while (dt < detailTicks && !outOfTime()) { this.tick(); dt++; doneTicks++; } finish(); return report; }
      schedule(macroDays > 0 ? stepMacro : stepDetail);
      return report;
    }

    summary() {
      const w = this.world; const known = LW.Tech.worldKnowledge(w); const largest = LW.Settlements.largest(w);
      return { name: w.name, year: w.year, tick: w.tick, population: w.population, deceased: w.deceased.size, techLevel: LW.Tech.techLevel(known), techs: known.size, settlements: [...w.settlements.values()].filter((s) => !s.abandonedTick).length, largest: largest ? `${largest.name} (${LW.HU.tier(largest.tier)}, ${largest.population} lakó)` : '—', buildings: w.buildings.size, births: w.stats.births, deaths: w.stats.deaths, discoveries: w.stats.discoveries, interventions: w.stats.interventions };
    }
  }
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  LW.Simulation = Simulation;
})(globalThis.LW || (globalThis.LW = {}));


/* ===== persistence/persistence.js ===== */
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
    o.memory = { episodic: a.memory.episodic.map(compactMem), emotional: a.memory.emotional.map(compactMem), social: [...a.memory.social].filter(([id, s]) => kept.has(id) || (s.lastSeen >= 0 && tick - s.lastSeen < 96 * 30)).slice(0, 160).map(([id, s]) => [id, s.facts && s.facts.length ? s : { lastSeen: s.lastSeen, lastTile: s.lastTile, impression: s.impression }]) };
    o.relationships = rels.map(([id, r]) => [id, compactRel(r)]);
    o.knowledge.places = o.knowledge.places.map((p) => [p.k, p.i, p.q, p.t]); // tömbként: a mentés harmada
    if (a.pregnancy) o.pregnancy = { by: a.pregnancy.by, since: a.pregnancy.since, fatherGenes: a.pregnancy.fatherGenes };
    return o;
  }
  // a nulla, hamis és üres mezők kimaradnak a mentésből; visszatöltéskor az alapértékek pótolják őket
  const REL_ZERO = { trust: 0, attraction: 0, respect: 0, friendship: 0, fear: 0, resentment: 0, jealousy: 0, gratitude: 0, loyalty: 0, familiarity: 0, dependency: 0, romance: 0 };
  function compactRel(r) { const o = {}; for (const k in r) { const v = r[k]; if (v === 0 || v === false || v == null) continue; o[k] = v; } return o; }
  function compactMem(m) { const o = {}; for (const k in m) { const v = m[k]; if (v == null || v === false || (Array.isArray(v) && !v.length)) continue; o[k] = v; } return o; }
  function restoreAgent(o) {
    const a = { ...o };
    const places = (o.knowledge.places || []).map((p) => (Array.isArray(p) ? { k: p[0], i: p[1], q: p[2], t: p[3] } : p));
    a.knowledge = { techs: new Set(o.knowledge.techs), places: new Map(places.map((p) => [LW.Agents.poiKey(p.k, p.i), p])), progress: o.knowledge.progress || {} };
    const fillMem = (m) => { if (m.tile === undefined) m.tile = null; if (m.divine === undefined) m.divine = false; if (m.distorted === undefined) m.distorted = false; return m; }; // a kulcsok sorrendje marad, hogy a mentés → betöltés → mentés azonos legyen
    const fillRel = (r) => { for (const k in REL_ZERO) if (r[k] == null) r[k] = 0; if (!r.status) r.status = 'stranger'; return r; };
    a.memory = { episodic: (o.memory.episodic || []).map(fillMem), emotional: (o.memory.emotional || []).map(fillMem), social: new Map((o.memory.social || []).map(([id, s]) => [id, s.facts ? s : { ...s, facts: [] }])) };
    a.relationships = new Map((o.relationships || []).map(([id, r]) => [id, fillRel(r)]));
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


/* ===== headless.js ===== */
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
      log(`${w.year}. év · népesség ${s.population} · tudás ${s.techs} (${s.techLevel}) · települések ${s.settlements} · épületek ${s.buildings} · születés ${s.births} · halál ${s.deaths}`);
      if (opts.onYear) opts.onYear(sim, y);
      if (w.population === 0 && opts.stopOnExtinction !== false) { log('KIHALÁS: ' + w.year); break; }
    }
    metrics.ms = Date.now() - t0; metrics.summary = sim.summary();
    for (const k in w.history.firsts) metrics.firsts[k] = { year: LW.Time.year(w.history.firsts[k].tick), title: w.history.firsts[k].title };
    metrics.chronicle = w.history.chronicle.map((e) => `${e.year}. év ${e.first ? '★ ' : ''}${e.text}`);
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


/* ===== ../tests/invariants.js ===== */
/* LEVENTE — THE CREATOR · tests/invariants.js — automated szimulációs invariánsok (ROADMAP.md §4) */
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
      const results = []; const push = (name, ok, info) => { results.push({ name, ok, info }); log(`${ok ? 'OK' : 'HIBA'} ${name}${info ? ' — ' + info : ''}`); };
      try {
        const { sim, metrics } = LW.runHeadless({ seed: 777, years: 3, mode: 'detail', checkInvariants: true, log: () => {} });
        push('3 részletes év kivétel nélkül', metrics.simErrors.length === 0, metrics.simErrors.length ? metrics.simErrors[0].msg.slice(0, 200) : '');
        push('az invariánsok igazak a részletes futásban', metrics.errors === 0, metrics.invariantFailures.length ? JSON.stringify(metrics.invariantFailures[0].res.slice(0, 3)) : '');
        const rt = this.roundTrip(sim); push('mentés → betöltés → mentés azonos', rt.ok, `${(rt.size / 1024).toFixed(0)} KB`);
        rt.sim2.runTicks(200); push('a visszatöltött világ tovább fut', rt.sim2.errors.length === 0 && this.check(rt.sim2.world).length === 0);
        const m2 = LW.runHeadless({ seed: 777, years: 40, mode: 'macro', checkInvariants: true, log: () => {} }).metrics;
        push('40 makró-év kivétel nélkül', m2.simErrors.length === 0, m2.simErrors.length ? m2.simErrors[0].msg.slice(0, 200) : '');
        push('az invariánsok igazak a makró-futásban', m2.errors === 0, m2.invariantFailures.length ? JSON.stringify(m2.invariantFailures[0].res.slice(0, 3)) : '');
        const det = this.determinism(4242, 3000); push('ugyanaz a seed → ugyanaz a világ', det.ok);
        // tech prerequisites respected
        let prereqOk = true; for (const a of sim.world.agents.values()) for (const tId of a.knowledge.techs) { const d = LW.Tech.D[tId]; if (d.prereq) for (const p of d.prereq) if (!a.knowledge.techs.has(p) && !d.hidden) prereqOk = false; }
        push('a technológiai előfeltételek teljesülnek', prereqOk);
        // catch-up consistency: N days of catch-up advance the tick count exactly
        const s3 = LW.Simulation.newWorld(99, JSON.parse(JSON.stringify(LW.CONFIG)), 0); s3.world.meta.lastRealTimeMs = 0; const r = s3.catchUp(5 * 3600 * 1000, { sync: true }); push('a felzárkózás pontosan a hiányzó tickeket lépi', r.worldTicks === r.owedTicks, `${r.worldTicks} ticks (${LW.Time.span(r.worldTicks)})`);
      } catch (e) { push('a tesztsor összeomlott', false, String(e && e.stack || e)); }
      return { passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
    },
  };
  LW.Invariants = Invariants;
})(globalThis.LW || (globalThis.LW = {}));

if (typeof module !== 'undefined') module.exports = globalThis.LW;
