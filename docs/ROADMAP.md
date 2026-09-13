# ROADMAP

Covers spec items: 21 Genesis MVP · 22 Development phases · 23 Major risks ·
19 Testing strategy · 24 Configurable parameters.

---

## 1. Genesis MVP (Phase 1) — scope

Everything in spec §117 Phase 1, implemented for real:

| Area | Delivered in MVP |
|---|---|
| World | seeded procedural map (continents, rivers, lakes, mountains, biomes, forests, surface stone/flint/clay, hidden deposits), seasons, day/night, weather machine with rain/storm/snow/fog/lightning, wildfire, vegetation/animal/fish regeneration |
| Agents | 3 Genesis agents (configurable 2–20), genetics, appearance, 16 personality traits, 13 emotions, 8 needs, health, life stages, aging, death with causes, deceased registry |
| Brain | utility AI with 20+ goals, plans/action state machines, bounded A*, perception-limited knowledge, WHY? explanations for every decision |
| Memory | episodic (capped, decaying, consolidated), emotional, social impressions, told-vs-experienced confidence, rumor distortion |
| Social | multi-dimensional asymmetric relationships, friendship, attraction with personal taste, flirting/acceptance/rejection, dating → partners, jealousy, infidelity, breakups, grief |
| Family | pregnancy, birth with inheritance + mutation, naming by parents, infants fed by caregivers, children follow/learn by observing, full genealogy & family tree UI |
| Resources | gathering berries/roots/wood/stone/flint/fiber/clay, hunting, fishing, digging, carrying capacity, spoilage, household storage & sharing |
| Technology | discovery engine with ~16 primitive discoveries (fire, stone tools, spear, basket, shelter, hut, cooking, pottery, fishing, seed planting, digging, ore awareness…), three discovery paths (need/curiosity/accident), personal knowledge, diffusion by conversation & observation, knowledge loss |
| Building | campfire, lean-to, hut, storage, farm plot; construction with hauled materials, decay, fire damage, ownership & inheritance |
| Settlements | emergent camp/hamlet/village detection, naming by founders, emergent trails/paths |
| God | 18 interventions, FORCE / DIVINE MESSAGE commands with interpretation, manifestations, divine memory, creator belief spread by rumor |
| History | typed event bus, importance model, firsts (WOW), chronicle, live feed, god feed, yearly stats, **Since your last visit** report |
| Persistence | autosave, catch-up (detailed + macro), manual snapshots, restore, branch, export/import |
| UI | pixel renderer with LOD, day/night lighting, weather particles, minimap, camera (pan/zoom/follow/jump), inspector, WHY?, family tree, god panel, chronicle, settings, debug overlay |
| Audio | procedural ambience (wind, rain, thunder, fire) and event sounds, mute persisted |
| Tooling | single-file build, headless mode, invariants test suite |

Definition of done for Phase 1: a fresh world reaches *first couple → first child →
first fire → first shelter → first camp* with no intervention in most seeds within
~1 real hour at Fast, survives 300 headless years without invariant failures, and
population is bounded by food (carrying capacity) rather than by a hard cap.

## 2. Development phases

| Phase | Adds | Emergence unlocked |
|---|---|---|
| **2 Civilization** | occupations by activity, ownership & theft, barter, markets (building), education (teach goal + first schools), writing (pins knowledge to objects), language dialects & mutual intelligibility, culture dimensions, proto-religion (from divine memories & ancestor worship), leadership (councils by respect), timeline UI, replay v1, server host + PostgreSQL | villages with roles, trade routes, first laws, first myths, tech surviving its inventors |
| **3 States** | cities (districts by land value), politics (councils → chiefs → monarchies/republics by culture), commodity money → coins, companies with P&L, taxation, banking/credit, diplomacy & war (from resource/territory/ideology pressure), roads/bridges, engineering | wars with causes, inequality and its politics, bankruptcies, dynasties |
| **4 Industrial** | factories, engines, electricity generation/grid/consumption, rail & vehicles, high-rise construction (steel, elevators), mass commerce, medicine (lifespan as consequence) | industrial cities, night lights, class conflict, urbanisation |
| **5 Digital** | electronics, computers, software, servers, networks, data centers, digital economy & platforms, network overlay | platforms, online economy, information speed changes politics |
| **6 AI Age** | ML → AI research → in-world AI entities, AI companies, automation, AI-assisted economy, society's interpretations | AI races, movements, regulation, autonomous companies |
| **7 Unknown Future** | procedural discovery grammar beyond contemporary tech | open-ended history |

Cross-cutting from Phase 2: MESO/MACRO LOD, Web Worker engine, observer (read-only)
mode & live world page, world replay.

## 3. Major risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Stagnation** (agents survive but nothing happens) | boring world = failed project | story-quality metrics in headless runs (events/yr, time-to-first-X); tune need/curiosity pressures, not events |
| **Extinction spiral** (3 agents die in the first winter) | Genesis is fragile by design | Genesis site selection, clothing-free warmth model calibrated so shelter is *needed* but learnable; balance tests assert ≥ 70 % of seeds survive 50 years unaided |
| **Population explosion / collapse oscillation** | unrealistic, perf | carrying capacity via real food regrowth; famine reduces fertility before it kills |
| **Inbreeding** (tiny gene pool) | first generations are all siblings | kinship block + "stranger" attraction bonus; Genesis 2–8 configurable; god `spawn agent`; Phase 2 migrants from off-map |
| **Catch-up inconsistency** (macro ≠ detailed) | breaks the "it really happened" feeling | macro rates *fitted* to detailed headless statistics; test compares 1-year macro vs detailed distributions |
| **Save size / localStorage limits** | data loss | typed arrays as base64, caps, IndexedDB fallback, export reminders |
| **Determinism drift** (Math.random leaks, iteration order) | replay/branch break | lint rule: no `Math.random`; Maps iterated in insertion order; tests replay a seed twice and diff |
| **Perf at 1 000+ agents** | Phase 3 | LOD hooks from day one, spatial hash, sliced updates, worker |
| **Fake complexity creep** | the spec's cardinal sin | every feature answers "does this change what agents can do?"; UI text always references real state |
| **Scope** | the spec is a decade of work | strict phase gates; MVP definition of done above |

## 4. Testing strategy

**Automated invariants** (`tests/invariants.js`, run with `?test=1`, later in CI via Node):

- 10 000 world days (≈ 28 years) detailed + 300 years macro without exception
- no action executed by a dead agent; no dead agent in any live collection
- unique ids; every `parents` reference resolves to a living or deceased record;
  no agent is its own ancestor; children born after both parents' birth
- population is finite & numeric; needs/emotions/relationships in [0,1]
- item conservation across gather/give/consume/spoil/drop; no negative inventories
- every known tech of every agent has satisfied prerequisites at learn time
- buildings reference existing tiles; residents reference existing dwellings
- save → load → save produces identical JSON; seed replay twice is byte-identical
- catch-up of N days yields the same tick count as N days of detailed ticks

**Balance / story-quality metrics** (headless report): time-to-first fire/shelter/
child/camp; events per year by class (birth, love, conflict, discovery,
construction, migration); stagnation windows (longest span with no event ≥ 0.3
importance); survival rate over 50 seeds; population curve; gini of stored food.

**Manual QA checklist** for UI: catch-up overlay, welcome report, WHY? correctness
(numbers match inspector), family tree over 4 generations, god actions produce
physical + memory effects, sound toggles.

## 5. Configurable parameters (`src/core/config.js`)

The authoritative values live in `src/core/config.js` (they were retuned during
balancing; the snippet below shows the shape). Any value can be overridden from the
URL of the built file, e.g. `?cfg.time.defaultPreset=fast&cfg.genesis.population=6`.

```js
LW.CONFIG = {
  world:   { width: 128, height: 128, seaLevel: 0.38, riverDensity: 1/1200, depositDensity: 1/900, climate: 'auto' },
  time:    { tickMinutes: 15, daysPerYear: 360, speedPresets: { slow: 15, normal: 60, fast: 240, ultra: 1440, hyper: 7200 },
             defaultPreset: 'normal', frameBudgetMs: 12 },
  genesis: { population: 3, minAdultAge: 17, maxAdultAge: 26, sexRatio: 'balanced' },
  agents:  { decisionInterval: 8, perceptionRadius: 6, noiseSigma: 0.05, memoryCap: 80, emotionalCap: 12, poiCap: 200,
             carryCapacity: 12, needDrainPerDay: { food: 1.0, water: 1.4, energy: 1.5, social: 0.35, affection: 0.12, curiosity: 0.2 },
             starvationHealthPerDay: 0.06, dehydrationHealthPerDay: 0.25, hypothermiaHealthPerDay: 0.08,
             adultAge: 16, longevityRange: [40, 62], gestationDays: 270, fertilityBase: 0.035, infantMortality: 0.06 },
  social:  { conversationTransferBase: 0.25, flirtBase: 0.3, datingThreshold: 0.5, partnerThreshold: 0.9, breakupResentment: 0.3 },
  tech:    { experimentBase: 0.12, accidentMultiplier: 1.0, hintProgress: 0.15, forgetPerYearElder: 0.02 },
  ecology: { vegRegrowth: 0.06, treeRegrowth: 0.004, animalRegrowth: 0.03, fishRegrowth: 0.05, fireSpread: 0.05 },
  weather: { stormLightningPerTick: 0.02, wildfireIgnitionTreeMin: 60, overrideDefaultHours: 6 },
  settlements: { clusterRadius: 6, tiers: { camp: 2, hamlet: 4, village: 10, town: 30, city: 100, metropolis: 400 } },
  paths:   { trail: 40, path: 160, road: 600, decayPerDay: 0.02 },
  history: { chronicleThreshold: 0.6, feedThreshold: 0.15, feedCap: 300, firstBonus: 3.0, creatorBonus: 1.5 },
  catchup: { detailWindowTicks: 192, maxYears: 500, chunkDays: 30 },
  persistence: { autosaveSeconds: 30, snapshotSlots: 3, key: 'lw.world.v1' },
  lod:     { microCap: 300, mesoCap: 3000 },
  audio:   { masterVolume: 0.5 },
  debug:   { why: true, overlay: false }
};
```

Every parameter is overridable from the settings panel or the URL (`?cfg.time.defaultPreset=fast`).
