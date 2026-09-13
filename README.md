# LEVENTE — THE CREATOR

**An autonomous, persistent, emergent digital civilization.**

A handful of intelligent beings are placed in a procedurally generated wild world.
Nobody scripts what happens next. They eat, sleep, explore, fall in love, raise
children, discover fire, build shelters, form camps, and — over enough world time —
villages, economies, technologies, states, digital networks and possibly their own
artificial intelligence. You, the Creator, watch. Sometimes you intervene. The world
remembers.

> Rule zero: **we do not write stories. We write systems from which stories emerge.**

---

## Status

| Phase | Name | Status |
|------:|------|--------|
| 0 | Architecture & models | ✅ `docs/` |
| 1 | **Genesis MVP** | ✅ playable — `dist/levente-world.html` |
| 2 | Civilization (villages, jobs, trade, language, culture, religion, server) | planned |
| 3 | States (cities, politics, currency, companies, wars) | planned |
| 4 | Industrial | planned |
| 5 | Digital | planned |
| 6 | AI Age | planned |
| 7 | Unknown Future (procedural post-contemporary tech) | planned |

## Run it

**Live (Observer / Creator mode):** https://leventejere-dev.github.io/levente-the-creator/

Or open **`dist/levente-world.html`** in a modern browser (Chrome, Edge, Firefox, Safari 16.4+).
That single file is the whole game: engine, renderer, UI, sounds. No install, no server.

The world state is saved in the browser (`localStorage`, gzip-compressed) every 30
seconds and whenever you leave. When you come back, the time you were away is
**simulated** — detailed for the last hours, day-scale for the rest — and a
*Welcome back, Creator* report tells you what happened. Export/import a world as a
`.json` file from the menu to keep it forever or move it between machines.

### Controls

| Input | Action |
|---|---|
| drag / `W A S D` / arrows | pan |
| mouse wheel / `+` `−` | zoom (close: people; far: civilizations) |
| click | inspect a person, building or tile |
| `F` | follow the selected person |
| `T` | family tree of the selected person |
| `space`, `1`–`5` | pause, speed presets (1× … 480×) |
| `O` / `H` | world overview / back to the Genesis site |
| right-click / `Esc` | cancel a Creator tool |
| `` ` `` | debug overlay (tick µs, ticks/s, render ms) |

**Creator tools** (bottom bar): rain, storm, cold snap, clear sky, lightning, fire,
forest, food, animals, resource, disease, healing, fertility, earthquake, meteor,
create life, take life, create object, destroy, and four manifestations (pillar of
light, orb, monolith, avatar). Select a person to send **divine commands** — GO HERE,
BUILD, FOLLOW, PROTECT, EXPLORE, LEAVE, SEARCH — either as a *divine message* the
person interprets (obeys, misunderstands, ignores, or hides in fear) or as *force*.

Every intervention is physical (rain is weather, fire is fire), and every witness keeps
a divine memory that spreads as rumor and can become belief.

### Speed

| Preset | world time per real second | 1 real hour ≈ | 1 real day ≈ |
|---|---|---|---|
| 1× | 15 min | 15 hours | 15 days |
| 4× (default) | 1 hour | 2.5 days | 2 months |
| 16× | 4 hours | 10 days | 8 months |
| 96× | 1 day | 2 months | 4 years |
| 480× | 5 days | 10 months | 20 years |

### Build from source

Python 3 is the only tool needed (it concatenates the modules):

```bash
python tools/build.py
```

produces `dist/levente-world.html` (and an identical `dist/index.html` for GitHub Pages).
`python tools/build.py --engine` produces `dist/engine.js` (engine + tests only, DOM-free;
runs in Node as well).

### Special modes (query string on the built file)

- `?headless=50&seed=7&mode=mixed` — run 50 world years without rendering (`detail`,
  `macro` or `mixed`) and print stats, firsts and the chronicle
- `?test=1` — run the automated invariants suite (save/load round trip, determinism,
  prerequisites, catch-up consistency, 3 detailed + 40 macro years without failure)
- `?seed=12345&pop=5` — start a fresh world with that seed / Genesis population (the
  saved world in the browser is left untouched until the new one autosaves)
- `?cfg.time.defaultPreset=fast` — override any config value from `src/core/config.js`

`dist/test.html` (needs `engine.js` next to it) additionally offers `?mode=balance`
for multi-seed survival/story-quality reports.

## What is real in Phase 1

Everything listed here is simulated, not narrated:

- **World:** seeded continents, rivers, lakes, biomes, forests, surface stone/flint/clay,
  hidden mineral veins; seasons, day/night, Markov weather with local rain, lightning,
  wildfires that spread with wind and dryness, snow, regrowing vegetation, game and fish.
- **People:** genetics (16 heritable traits, appearance, longevity, fertility, taste),
  8 needs, 13 emotions, health, injuries, life stages, aging, death with causes;
  perception-limited knowledge (they only know what they have seen or been told);
  episodic/emotional/social memory with decay and rumor distortion.
- **Mind:** a utility AI with ~28 goals scored from needs × personality × emotion ×
  context (+ small noise), plans as action state machines, bounded A* pathfinding, and a
  **WHY?** panel showing the chosen goal, its factors and the rejected alternatives.
- **Society:** asymmetric multi-dimensional relationships; friendship, flirting,
  acceptance/rejection, dating, partnership, jealousy, infidelity, breakups, grief;
  pregnancy, birth with inheritance + mutation, naming by parents in the world's own
  procedural language, children who follow and learn by watching; food sharing; fights.
- **Technology:** 23 primitive/neolithic discoveries found by need, curiosity or
  accident, gated by personal experience and prerequisites; knowledge belongs to
  people, spreads by conversation, demonstration and teaching, and can be **lost**.
- **Building & settling:** campfires, lean-tos, huts, stone houses, storage, farms —
  hauled materials, construction work, decay, fire damage, inheritance; emergent camps →
  hamlets → villages detected from where people actually live; footpaths worn by traffic.
- **History:** typed event bus → importance model → live feed, Creator feed, chronicle,
  historic *firsts* (WOW moments), yearly statistics, and the *since your last visit*
  report.
- **Persistence:** autosave, compressed browser storage, export/import, three snapshot
  slots (restore one and keep going = an alternate timeline), deterministic replay from
  seed.

Known limits of Phase 1 (by design, see `docs/ROADMAP.md`): no economy beyond sharing,
no occupations beyond activity labels, no writing/culture/religion modules yet (belief
in the Creator is tracked, organised religion is Phase 2), the world only advances while
a browser has it open (catch-up makes this invisible; a server host is Phase 2).

## Documentation (Phase 0 — the technical plan)

The 24 items requested in the master specification (§118) map to these documents:

| # | Topic | Document |
|--:|-------|----------|
| 1 | System architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §1 |
| 2 | Repository structure | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §2 |
| 3 | Simulation tick architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §3 |
| 4 | World generation | [docs/SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md) §1 |
| 5 | Agent brain | [docs/AGENT_MODEL.md](docs/AGENT_MODEL.md) §3 |
| 6 | Memory architecture | [docs/AGENT_MODEL.md](docs/AGENT_MODEL.md) §4 |
| 7 | Relationship architecture | [docs/AGENT_MODEL.md](docs/AGENT_MODEL.md) §5 |
| 8 | Genetics | [docs/AGENT_MODEL.md](docs/AGENT_MODEL.md) §6 |
| 9 | Technology Discovery Engine | [docs/TECHNOLOGY_MODEL.md](docs/TECHNOLOGY_MODEL.md) §1 |
| 10 | Economy & Business Engine | [docs/ECONOMY_MODEL.md](docs/ECONOMY_MODEL.md) |
| 11 | Digital Civilization Engine | [docs/TECHNOLOGY_MODEL.md](docs/TECHNOLOGY_MODEL.md) §4 |
| 12 | AI Civilization Engine | [docs/TECHNOLOGY_MODEL.md](docs/TECHNOLOGY_MODEL.md) §5 |
| 13 | God Mode architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §6 |
| 14 | Persistent world architecture | [docs/PERSISTENCE.md](docs/PERSISTENCE.md) §1 |
| 15 | Offline catch-up algorithm | [docs/SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md) §6 |
| 16 | Rendering architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §7 |
| 17 | Simulation LOD | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §4 |
| 18 | Database schema | [docs/PERSISTENCE.md](docs/PERSISTENCE.md) §3 |
| 19 | Testing strategy | [docs/ROADMAP.md](docs/ROADMAP.md) §4 |
| 20 | Performance strategy | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §8 |
| 21 | Genesis MVP | [docs/ROADMAP.md](docs/ROADMAP.md) §1 |
| 22 | Development phases | [docs/ROADMAP.md](docs/ROADMAP.md) §2 |
| 23 | Major risks | [docs/ROADMAP.md](docs/ROADMAP.md) §3 |
| 24 | Configurable parameters | [docs/ROADMAP.md](docs/ROADMAP.md) §5 |

## Repository layout

```
src/            engine (core, language, world, agents, tech, buildings, settlements, history, god, sim, persistence)
                + client (render, ui, audio, main.js) — see src/manifest.json for load order
tests/          invariants suite (runs in the browser via ?test=1, or in Node against dist/engine.js)
tools/          build.py (bundler), patch.py (+ the patch history used during balancing)
docs/           the Phase 0 technical plan
dist/           built artifacts
```

## Design principles (non-negotiable)

1. **Emergence over script.** No `if year == 50: war()`. Ever.
2. **Stochastic, not random.** Noise perturbs decisions; it never replaces the decision model.
3. **No fake complexity.** If the UI says "Aren discovered fire", then fire has prerequisites, a knower, consequences, and can be forgotten.
4. **Persistent.** The browser is a window. The world's true state lives in the engine + storage, and catches up.
5. **Real simulation beats pretty fakery.** Visuals can be improved later; world logic must be real from day one.
6. **LLM-free core.** The simulation runs without any language model. LLMs are optional enrichment.

## Tech stack decision (and why it differs slightly from the preferred one)

The master spec prefers TypeScript + React + PixiJS + Node + PostgreSQL + WebSocket.
The Genesis MVP intentionally ships as **framework-free JavaScript with JSDoc types, a
Canvas 2D pixel renderer, and browser storage**, built into one HTML file. Reasons:

- The development machine has no Node runtime; the deliverable must run with zero
  install and be reviewable as a single file, then pushed to GitHub (and served by
  GitHub Pages as the public *Observer Mode* page for free).
- The engine (`src/core` … `src/sim`) is strictly DOM-free. It is the same code that
  will run inside a Node simulation server in Phase 2 behind a WebSocket, with
  PostgreSQL replacing `localStorage` (see `docs/PERSISTENCE.md`). The catch-up
  algorithm is identical on both sides.
- Canvas 2D is the right tool for chunky pixel art at this scale; PixiJS/WebGL becomes
  worth it at the *city/region* rendering LOD (Phase 3) and is a drop-in swap behind
  the `Renderer` interface.
- JSDoc types give editor type-checking today; migrating the engine to `.ts` is a
  mechanical step once a toolchain exists.
