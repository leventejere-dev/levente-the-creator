# ARCHITECTURE

Covers spec items: 1 System architecture · 2 Repository structure · 3 Simulation tick
architecture · 13 God Mode architecture · 16 Rendering architecture · 17 Simulation LOD ·
20 Performance strategy.

---

## 1. System architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER (a window on the world)                                     │
│                                                                      │
│   ┌────────────┐   ┌────────────┐   ┌──────────────┐   ┌──────────┐  │
│   │  Renderer  │   │    UI      │   │    Audio     │   │  Input   │  │
│   │ Canvas 2D  │   │  panels,   │   │  WebAudio    │   │ camera,  │  │
│   │ pixel LODs │   │  inspector │   │  procedural  │   │ god tool │  │
│   └─────▲──────┘   └─────▲──────┘   └──────▲───────┘   └────┬─────┘  │
│         │ read-only view of state          │ events         │ intents │
│   ══════╪══════════════════════════════════╪════════════════╪═══════  │
│         │           ENGINE (DOM-free, deterministic given seed+inputs) │
│   ┌─────┴──────────────────────────────────┴────────────────▼──────┐  │
│   │ Simulation loop ─ tick scheduler ─ catch-up ─ macro simulation │  │
│   │  World · Weather · Ecology · Agents · Brain · Memory · Social  │  │
│   │  Discovery · Buildings · Settlements · God · History · Names   │  │
│   │                       EVENT BUS (typed)                        │  │
│   └─────────────────────────────┬──────────────────────────────────┘  │
│                                 │ snapshots / event log                │
│                       ┌─────────▼─────────┐                           │
│                       │  Persistence      │  localStorage (MVP)       │
│                       │  serialize/restore│  JSON export/import       │
│                       └───────────────────┘                           │
└──────────────────────────────────────────────────────────────────────┘

Phase 2+ (server mode):
   Browser ──WebSocket──▶ Node simulation server (same ENGINE) ──▶ PostgreSQL
```

The **engine** owns the truth. Everything above the double line is a *view* or an
*intent source*. The UI never mutates world state directly; it calls engine APIs
(`god.intervene(...)`, `sim.setSpeed(...)`) which produce events like everything else.
This is what makes the server migration a transport change, not a rewrite.

### Key invariants

- Engine code never touches `window`, `document`, `localStorage`, or `Date` for
  simulation purposes (real time is passed in as an argument).
- All randomness flows through the world's seeded RNG (`LW.Rng`). Given the same
  seed, the same real-time schedule and the same god inputs, two runs are identical.
  (Catch-up uses the same RNG stream, so away-time is deterministic too.)
- Every state mutation that matters emits a typed event on the bus. History, UI,
  audio and persistence are *subscribers*, never sources.

## 2. Repository structure

```
levente-world/
├── README.md
├── docs/                      Phase 0 plan (this folder)
├── src/
│   ├── manifest.js            ordered list of engine + client files (single source of truth for build)
│   ├── core/                  rng, noise, event bus, config, time, utils
│   ├── language/              procedural naming language
│   ├── world/                 map generation, tiles, weather, ecology (vegetation, animals, fire)
│   ├── agents/                agent model, genetics, needs, emotions, perception, memory,
│   │                          relationships, brain (utility AI), actions (state machines), social
│   ├── tech/                  discovery definitions + Technology Discovery Engine
│   ├── buildings/             building definitions, construction, decay, ownership
│   ├── settlements/           emergent settlement detection, tiers, naming, paths/roads
│   ├── history/               event importance, firsts, chronicle, live feed, "since last visit"
│   ├── god/                   interventions, divine commands, manifestations, divine memory & belief
│   ├── sim/                   simulation loop, scheduler, catch-up, macro (day-scale) simulation
│   ├── persistence/           serialize / deserialize / snapshots / branching
│   ├── render/                Canvas 2D renderer, sprite generation, camera, LOD rendering
│   ├── ui/                    panels, inspector, WHY?, family tree, god panel, modals
│   ├── audio/                 procedural sound effects and ambience
│   ├── main.js                bootstrap (browser)
│   ├── headless.js            bootstrap (no renderer; browser ?headless= or Node)
│   ├── styles.css
│   └── index.html             template with INLINE_CSS / INLINE_JS placeholders
├── tests/
│   └── invariants.js          automated simulation tests (run with ?test=1 or Node)
├── tools/
│   └── build.py               concatenates manifest → dist/levente-world.html
└── dist/
    └── levente-world.html     the single-file deliverable
```

Future server layout (Phase 2): `server/` (Node: WebSocket gateway, tick host,
Postgres adapter) reusing `src/core … src/persistence` verbatim.

### Module pattern

Each file is an IIFE that extends a single global namespace `LW`:

```js
(function (LW) {
  'use strict';
  class Weather { /* ... */ }
  LW.Weather = Weather;
})(globalThis.LW || (globalThis.LW = {}));
```

Loads unchanged in a browser `<script>`, in a concatenated single file, and in Node
via `require`. `src/manifest.js` fixes the load order (dependencies first).

## 3. Simulation tick architecture

### Time model

| Constant | Value | Note |
|---|---|---|
| `TICK_MINUTES` | 15 | one tick = 15 world minutes |
| `TICKS_PER_HOUR` | 4 | |
| `TICKS_PER_DAY` | 96 | |
| `DAYS_PER_MONTH` | 30 | 12 months |
| `DAYS_PER_YEAR` | 360 | 4 seasons × 90 days |
| `TICKS_PER_YEAR` | 34 560 | |

World time is a single integer `world.tick`. Everything else (hour, day, season, year)
is derived. Speed presets are expressed as *world minutes per real second*:

| Preset | world min / real s | ticks / s | 1 real hour = | 1 real day = |
|---|---|---|---|---|
| Slow | 15 | 1 | 15 world h | 15 days |
| **Normal** | 60 | 4 | 2.5 days | 60 days |
| Fast | 240 | 16 | 10 days | 240 days |
| Ultra | 1 440 | 96 | 60 days | 4 years |
| Hyper | 7 200 | 480 | 300 days | 20 years |

This calibrates to the spec's pacing: minutes → social events; hours → couples and
first shelters; 1–3 days (Normal/Fast) → settlements and a new generation; a week at
Fast/Ultra → centuries.

### The tick

```
tick(world):
  world.tick++
  weather.step()                  // every tick (cheap): global state machine + local noise
  ecology.stepSlice()             // 1/96 of tiles per tick → every tile once per world day
  fire.step()                     // only tiles in the burning set
  for agent of world.agents (alive):
      agent.biology.step()        // needs drain, warmth, health, aging, pregnancy
      agent.perceive()            // every 2 ticks: visible tiles/agents/buildings → knowledge, memory
      if agent.needsDecision(): agent.brain.decide()   // utility AI → plan
      agent.actions.step()        // execute current plan step (state machine)
      agent.emotions.decay()
  social.stepInteractions()       // pairwise interactions queued by actions
  buildings.step()                // construction progress, decay, occupancy
  if hourBoundary: memory.consolidate(slice of agents)
  if dayBoundary:  settlements.detect(); paths.decay(); history.dailyStats(); deaths.age()
  if yearBoundary: history.yearSummary()
  eventBus.flush()                // subscribers: history, ui feed, audio, persistence dirty flags
```

The loop runs in `requestAnimationFrame`. Each frame is given a time budget
(default 12 ms). It runs as many ticks as owed by the speed preset, but stops when
the budget is spent and carries the debt forward (so Hyper degrades gracefully to
"as fast as possible" instead of freezing the tab). Rendering happens once per frame
regardless of how many ticks ran.

### Decision cadence

Agents don't re-plan every tick. A plan persists until it completes, fails, or is
interrupted. Interrupts: a need crossing a *critical* threshold, danger perceived
(fire, attack), a divine command, a social request. Otherwise re-evaluation happens
every `DECISION_INTERVAL` ticks (default 8 = 2 world hours) with staggered offsets
so all agents don't think on the same tick.

## 4. Simulation LOD

Three fidelity levels for agents, decided each world day (Phase 1 uses only MICRO
because population is small; the hooks exist from day one):

| Level | Who | What runs |
|---|---|---|
| **MICRO** | visible on screen, followed, selected, "important" (see below), or population ≤ `MICRO_CAP` (300) | full tick as above |
| **MESO** | others within loaded settlements | needs/biology every tick; brain every 4× longer; movement teleports between plan waypoints; perception only at plan start |
| **MACRO** | population above `MESO_CAP` (3 000) | not individual objects. Aggregated into *cohorts* per settlement: `{ageBand, sex, occupation, count, avgNeeds, avgSkills}`; births/deaths/marriages/migration sampled statistically; notable individuals are *promoted* out of cohorts when events need a name (a discovery, a founder, a crime) |

**Important agents** (spec §91) are never demoted: discoverers, founders, leaders,
anyone the Creator has interacted with, anyone with ≥ 3 chronicle events, and one
"lineage witness" per Genesis family line so genealogy remains traceable to Year 0.

Time LOD (catch-up) is a separate axis; see `SIMULATION_MODEL.md` §6.

## 5. Event bus

```js
LW.events.emit('AgentBorn', { agentId, parents, tick, tileIdx })
LW.events.on('AgentBorn', handler)
```

Typed event catalogue (Phase 1 subset — new phases append, never rename):

`AgentBorn AgentDied AgentAged RelationshipChanged CoupleFormed CoupleBroke Pregnancy
DiscoveryMade KnowledgeTransferred BuildingStarted BuildingCompleted BuildingDestroyed
SettlementFounded SettlementGrew SettlementNamed ResourceFound WeatherChanged
WildfireStarted WildfireEnded CreatorIntervention DivineCommandIssued DivineCommandInterpreted
BeliefFormed ConflictOccurred AgentInjured FirstOfKind`

Events are plain objects `{type, tick, importance?, ...payload}`. The history engine
computes importance (spec §75) and decides feed vs chronicle vs WOW.

## 6. God Mode architecture

```
UI god panel ──▶ LW.God.intervene(kind, target, params)
                    │
                    ├─ physical effect (weather override, tile fire, spawn, kill, ...)
                    ├─ CreatorIntervention event  → GOD FEED + history importance (creatorImpact)
                    └─ witness pass: every agent whose perception covers the effect
                         ├─ memory  {type:'divine', importance:0.95, emotion:awe|fear, distortion:0}
                         ├─ belief  agent.beliefs.creator += f(personality)   (spec §66)
                         └─ rumor   spreads via conversations with confidence decay & distortion (§62)
```

Two command channels for agents (spec §68):

- **FORCE** — pushes a plan with priority ∞. Executes unless physically impossible.
- **DIVINE MESSAGE** — creates a `divineRequest` object the brain scores like any
  other goal: `obedience = f(loyalty, fear, beliefs.creator, optimism) − stubbornness`.
  The agent may obey, ignore, flee, misinterpret (a different target/goal drawn
  from nearby options), or convert it into a belief memory. The interpretation is a
  visible event (`DivineCommandInterpreted`) so you can see *why*.

**Manifestation** (spec §69): a placed world object (`light | orb | monolith |
avatar`) with a perception radius. Agents that see it get divine memories; the
object persists as a landmark, so it can be named and become a pilgrimage focus
(Phase 2 religion module consumes these).

**Physical consequences** are not special-cased: god rain is just weather with an
override for N hours; god fire is a burning tile; god food is vegetation on tiles.
The ecosystem and agents react exactly as they would to natural causes — which is
what gives the butterfly effect (spec §97) without scripting.

## 7. Rendering architecture

Canvas 2D, pixel-perfect scaling (`imageSmoothingEnabled = false`).

```
Layers (offscreen canvases, composited per frame):
 0  terrain   baked, 8 px per tile, redrawn only for dirty tiles (veg growth, burn, snow, path)
 1  objects   buildings & landmarks, baked, dirty on change
 2  dynamic   agents, fire flames, projectiles — every frame
 3  weather   rain/snow particles, clouds shadow noise — every frame
 4  light     night darkness multiplied + additive light sources (fire, windows) — every frame
 5  labels    settlement names, selected agent ring, god cursor — every frame (DOM-free canvas text)
```

Scale-dependent rendering (spec §88):

| Zoom | Level | Agents | Buildings | Labels |
|---|---|---|---|---|
| ≥ 3 | MICRO | full sprite (hair/skin from genes, walk bob, carried item, facing) | detailed sprites, smoke | names on hover |
| 1.5–3 | LOCAL | small sprite | sprite | settlement names |
| 0.75–1.5 | CITY | 2 px dots | blocks | settlement names + pop |
| < 0.75 | REGION/WORLD | none (heat dots per settlement) | settlement footprint | civ-level labels |

All sprites are generated procedurally at startup from a tiny pixel grammar
(`render/sprites.js`) — no external assets, so the single-file build stays self-contained.
Day/night: a sky-color curve by hour + season; light sources rendered as radial
gradients into the light layer, composited with `multiply`. Windows glow at night once
buildings are ≥ hut tier. Visual eras (spec §84) are a property of building tiers and
settlement tiers, not of a global "era" flag.

Camera: pan (drag / WASD), zoom (wheel, pinch), follow agent, jump-to (event, city),
world overview. Minimap is a downscaled terrain layer plus settlement dots.

## 8. Performance strategy

Measured (spec §106) and shown in the debug overlay: tick µs (avg/max), ticks/s,
render ms, alive agents, abstracted population, burning tiles, dirty tiles, save size.

Techniques:

- **Typed-array tiles.** All per-tile fields are `Uint8Array/Uint16Array/Float32Array`
  columns, indexed by `y*w+x`. Cache-friendly, cheap to serialize.
- **Sliced ecology.** Each tile is updated once per world day, spread across ticks.
- **Sparse sets** for burning tiles, dirty tiles, active buildings.
- **Spatial hash** (bucket grid of 8×8 tiles) for agent neighbourhood queries.
- **Plan persistence** — agents think every 8 ticks, act every tick.
- **Bounded A\*** (node cap + straight-line fallback); path cached in plan.
- **Knowledge caps** — per-agent POI knowledge ≤ 200 entries, episodic memory ≤ 80,
  consolidated hourly in slices.
- **Frame budget** with tick debt, never blocking the UI thread > 12 ms.
- **Catch-up** switches to day-scale macro simulation beyond 2 days elapsed
  (see `SIMULATION_MODEL.md` §6), keeping reload under a few seconds for years away.
- **Web Worker** (Phase 2): the engine's DOM-free design allows moving it to a
  worker with structured-clone snapshots; the WebSocket server is the same split.
