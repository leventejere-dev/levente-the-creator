# PERSISTENCE

Covers spec items: 14 Persistent world architecture · 18 Database schema, plus
snapshots and world branching (spec §100–§102).

---

## 1. Persistent world architecture

### Phase 1 (this build): browser-resident world

```
engine state ──serialize()──▶ JSON (typed arrays as base64) ──▶ localStorage['lw.world.v1']
                                                          └─▶ localStorage['lw.snapshot.<n>'] (manual, up to 3)
                                                          └─▶ download .json (export) / upload (import)
```

- Autosave every 30 real seconds *and* on `visibilitychange`/`pagehide`, plus after
  every god intervention (so an intervention is never lost).
- Save carries `lastRealTimeMs` and `lastSimulatedTick`; on load the catch-up
  algorithm (`SIMULATION_MODEL.md` §6) advances the world by the away time.
- The save is self-describing (`v`, `engineVersion`) with migrations applied on load.
- Size budget: 128² tiles ≈ 330 KB base64 + agents (≈ 3 KB each) + history. Well within
  the 5 MB `localStorage` limit up to several hundred agents; beyond that the
  IndexedDB adapter (same interface) is used automatically.

Limitation, stated honestly: with no server, the world does not advance *while the
page is closed*; it advances **as if it had** when reopened, using the same engine.
For the observer, the results are indistinguishable; for a truly "always on" world,
Phase 2 moves the engine to a server.

### Phase 2: server-resident world

```
Browser ◀─WebSocket─▶ Node "world host" (same engine, headless) ◀─▶ PostgreSQL
   │  view deltas      │ ticks continuously; catch-up only after host downtime
   └─ intents ─────────┘ god actions, camera interest region (drives LOD)
```

- The host runs one world per process; the browser receives *deltas* for the
  visible region + global stats + events (not the whole state).
- Persistence uses **dirty tracking + batching**: entities mark themselves dirty;
  a writer flushes every N seconds in one transaction; the **event log** is appended
  continuously (source of truth for history/replay); full **snapshots** every
  world-year or 10 real minutes.
- Crash recovery = last snapshot + replay of the event log tail.

## 2. Serialization format (v1)

```jsonc
{
  "v": 1, "engineVersion": "0.1.0",
  "meta": { "seed": 123456789, "name": "Ilvaran", "createdMs": 0, "lastRealTimeMs": 0,
            "lastSimulatedTick": 0, "speedPreset": "normal", "creatorName": "Levente" },
  "rng": [a, b, c, d],                                  // sfc32 state, so continuation is deterministic
  "world": { "w": 128, "h": 128, "tick": 0,
             "tiles": { "elev": "<b64 f32>", "moist": "<b64 u8>", ... } },
  "weather": { "state": "clear", "humidity": 0.5, "wind": [x, y], "override": null, ... },
  "language": { "consonants": [...], "vowels": [...], "patterns": [...], "used": [...] },
  "agents": [ { /* full Agent, Maps as arrays of pairs, Sets as arrays */ } ],
  "deceased": [ { "id", "name", "sex", "bornTick", "diedTick", "cause", "parents", "children", "achievements" } ],
  "buildings": [ ... ], "settlements": [ ... ], "landmarks": [ ... ],
  "history": { "chronicle": [...], "firsts": {...}, "feed": [last 300], "godFeed": [...], "yearStats": [...] },
  "god": { "interventions": [...], "activeOverrides": [...] },
  "nextIds": { "agent": 1, "building": 1, "settlement": 1 }
}
```

## 3. Database schema (PostgreSQL, Phase 2)

Relational where queries matter (history, genealogy, economy), JSONB where the
object is only ever loaded whole (agent brains).

```sql
CREATE TABLE worlds (
  id            uuid PRIMARY KEY,
  seed          bigint NOT NULL,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_tick     bigint NOT NULL,
  last_real_ms  bigint NOT NULL,
  speed_preset  text NOT NULL,
  parent_world  uuid REFERENCES worlds(id),      -- branching: forked from
  parent_tick   bigint,                          -- at this tick
  engine_ver    text NOT NULL
);

CREATE TABLE snapshots (
  id        bigserial PRIMARY KEY,
  world_id  uuid REFERENCES worlds(id) ON DELETE CASCADE,
  tick      bigint NOT NULL,
  kind      text NOT NULL,          -- 'auto' | 'manual' | 'yearly'
  state     bytea NOT NULL,         -- gzip(JSON) of the full serialization
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON snapshots (world_id, tick DESC);

CREATE TABLE events (                -- append-only event log (history, replay, recovery)
  id        bigserial PRIMARY KEY,
  world_id  uuid NOT NULL,
  tick      bigint NOT NULL,
  type      text NOT NULL,
  importance real NOT NULL DEFAULT 0,
  subjects  bigint[] NOT NULL DEFAULT '{}',      -- agent ids involved
  tile      integer,
  payload   jsonb NOT NULL
);
CREATE INDEX ON events (world_id, tick);
CREATE INDEX ON events (world_id, importance DESC);
CREATE INDEX ON events USING gin (subjects);

CREATE TABLE agents (               -- hot state; loaded whole by the host
  world_id  uuid NOT NULL,
  id        bigint NOT NULL,
  alive     boolean NOT NULL,
  name      text NOT NULL,
  sex       char(1) NOT NULL,
  born_tick bigint NOT NULL,
  died_tick bigint,
  parent_a  bigint, parent_b bigint,
  settlement_id bigint,
  importance real NOT NULL DEFAULT 0,
  lod       smallint NOT NULL DEFAULT 0,        -- 0 micro 1 meso 2 macro-promoted
  body      jsonb NOT NULL,                     -- everything else (genes, brain, memory, relationships)
  updated_tick bigint NOT NULL,
  PRIMARY KEY (world_id, id)
);
CREATE INDEX ON agents (world_id, alive);
CREATE INDEX ON agents (world_id, parent_a); CREATE INDEX ON agents (world_id, parent_b);

CREATE TABLE tiles_chunks (         -- 16×16 tile chunks, typed-array columns as bytea
  world_id uuid NOT NULL, cx smallint NOT NULL, cy smallint NOT NULL,
  columns  bytea NOT NULL, updated_tick bigint NOT NULL,
  PRIMARY KEY (world_id, cx, cy)
);

CREATE TABLE buildings   (world_id uuid, id bigint, kind text, x smallint, y smallint, owner_household bigint,
                          settlement_id bigint, state jsonb, PRIMARY KEY (world_id, id));
CREATE TABLE settlements (world_id uuid, id bigint, name text, tier text, founded_tick bigint, founder bigint,
                          centroid_x real, centroid_y real, population int, stats jsonb, PRIMARY KEY (world_id, id));
CREATE TABLE cohorts     (world_id uuid, settlement_id bigint, key text, count int, stats jsonb,
                          PRIMARY KEY (world_id, settlement_id, key));           -- MACRO LOD population
CREATE TABLE discoveries (world_id uuid, tech_id text, first_tick bigint, first_agent bigint,
                          knowers int, lost_tick bigint, PRIMARY KEY (world_id, tech_id));
CREATE TABLE chronicle   (world_id uuid, id bigserial, year int, tick bigint, title text, text text,
                          importance real, event_id bigint, PRIMARY KEY (world_id, id));
-- Phase 3+: companies, ledgers, trades, prices, governments, laws, wars, networks, software, ai_entities
```

Write strategy: the host keeps everything in memory; a `DirtyTracker` collects
touched agent ids / chunks / buildings; a flusher writes batches every 5 s in a
single transaction; the event log is streamed with `COPY`. Snapshots are taken from
an in-memory serialization on a worker thread.

## 4. Snapshots and branching (spec §101–§102)

- **Automatic**: yearly (world time) and every 10 real minutes, retention 30.
- **Manual**: named, unlimited.
- **Restore**: load a snapshot as the live state (the current state is auto-snapshotted first).
- **Branch**: `CREATE ALTERNATE TIMELINE` creates a new world row with
  `parent_world/parent_tick`, copies the snapshot, and continues independently.
  Because the RNG state is inside the snapshot, a branch with *no* god intervention
  is exactly "what would have happened if I had not intervened" — the counterfactual
  is real, not estimated.
- **Replay** (spec §82): a timelapse is rendered from yearly snapshots (terrain +
  buildings + settlements) with event markers from the log. Phase 2.

## 5. Migrations

`persistence/migrations.js` holds `{from, to, fn(state)}` steps; loading applies them
in order and re-saves. Rule: never break an existing world; add fields with defaults.
