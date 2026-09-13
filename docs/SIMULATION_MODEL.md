# SIMULATION MODEL

Covers spec items: 4 World generation · 15 Offline catch-up algorithm, plus weather,
ecology, fire, settlements and paths.

---

## 1. World generation

Everything derives from `worldSeed` (uint32). The generator is deterministic and
pure; the same seed always yields the same planet.

### 1.1 Grid

- Default `128 × 128` tiles (configurable 64–256). One tile ≈ 25 m; the map ≈ 3.2 km
  across. "Huge" for three beings on foot, small enough to simulate every tile.
- Tiles are columns in typed arrays (struct-of-arrays):

| Field | Type | Meaning |
|---|---|---|
| `elev` | f32 | 0..1, sea level 0.38 |
| `moist` | u8 | soil moisture 0..255 (dynamic, rain/evaporation) |
| `fert` | u8 | soil fertility 0..255 (static + slow change) |
| `biome` | u8 | enum: ocean, lake, river, beach, grassland, forest, dense forest, hills, mountain, peak, marsh, tundra, desert |
| `veg` | u8 | edible vegetation (berries/roots) 0..255 (dynamic) |
| `trees` | u8 | wood stock 0..255 (dynamic) |
| `animals` | u8 | huntable game density 0..255 (dynamic) |
| `fish` | u8 | fish density (water & shore) |
| `stone` | u8 | loose surface stone 0..255 |
| `depType` | u8 | subsurface deposit enum: none, clay, flint, salt, coal, copper, tin, iron, gold, gems, oil |
| `depAmt` | u16 | remaining deposit units |
| `depKnown` | u8 | 0 hidden · 1 surface hint · 2 discovered (world-level; agents still need personal knowledge) |
| `traffic` | u16 | footfall counter → paths |
| `path` | u8 | 0 none · 1 trail · 2 path · 3 road |
| `fire` | u8 | burning intensity |
| `burnt` | u8 | scorched countdown |
| `snow` | u8 | snow cover |
| `danger` | u8 | predator pressure baseline by biome |

### 1.2 Pipeline

1. **Continent mask** — radial falloff × domain-warped fBm (5 octaves of value noise)
   with a per-seed choice of *one continent / archipelago / two landmasses*.
2. **Elevation** — fBm + ridged noise for mountain chains; sea level fixed at 0.38.
3. **Temperature** — latitude band (row) + elevation lapse rate (−6.5 °C per 0.1 elev
   above sea) + per-seed climate offset (a cold seed vs. a warm seed).
4. **Moisture** — noise + distance-to-ocean falloff + rain shadow (downwind of ridges
   using the prevailing wind vector).
5. **Rivers** — pick `N = w*h/1200` sources on high wet tiles; descend steepest
   neighbour with small noise; carve until sea/lake; a river tile sets `biome=river`,
   raises `moist` of its neighbourhood, and is crossable (move cost 3) while lakes
   and ocean are not.
6. **Lakes** — local minima above sea level with inflow are flooded up to the spill
   point (bounded flood-fill).
7. **Biomes** — Whittaker-style lookup on (temp, moist, elev).
8. **Vegetation, trees, animals, fish, surface stone** — biome base × noise. Forests
   are the only source of meaningful wood; grassland is best for later farming;
   marsh has clay hints; hills/mountains have surface stone and flint.
9. **Deposits** — Poisson-disc sampled *veins* (clusters of 3–30 tiles) with
   geological plausibility: clay in marsh/river banks, flint in chalk-like hills,
   copper/tin/iron/coal in hills & mountains, gold in mountain rivers, oil/gas in
   sedimentary lowlands and shallow sea. A small fraction get `depKnown=1` (surface
   hints: coloured earth, outcrops) that curious agents can notice.
10. **Genesis site** — choose the tile maximising `fresh water within 6 × veg within 8
    × trees within 8 × (not marsh, not mountain)`; Genesis agents spawn within 3 tiles.
11. **Naming** — the world and its major features get names from the world language
    later, *by agents*, when they discover them (a lake is unnamed until someone
    who lives near it needs to refer to it).

### 1.3 Underground

Deposits are spatial and finite (`depAmt`). Digging/mining (Phase 1: `dig` action
with stone tools) reveals `depType` on that tile to the digger's *personal* knowledge
as an *unknown material* item (`ore_unknown_copper`). Only a later discovery
(`smelting`, Phase 2) turns the item into a usable resource. A civilization that
grows on top of a huge copper vein has a real advantage centuries later.

## 2. Time & seasons

- `TICK = 15 min`, `96 ticks/day`, `360 days/year`, seasons of 90 days starting at
  spring (day 0). Day length varies with season (sunrise 5:00–7:30).
- Temperature at a tile: `base(lat, elev) + seasonCurve(dayOfYear) × amplitude(lat)
  + diurnalCurve(hour) × 6 − cloud × 2 + weatherOffset`.

## 3. Weather

A global Markov state machine stepping every hour, with local variation:

```
states: clear · cloudy · overcast · rain · storm · snow · fog
P(next | current, season, humidity) from a small table; humidity integrates
evaporation (temp, wind) and precipitation. Storms need overcast + humidity>0.6.
```

Per tile: `rain(x,y) = globalRain × (0.4 + 0.6 × noise(x, y, t))`, `wind` is a global
vector with gusts. Storms roll lightning: each tick, `P(strike) = 0.02 × intensity`;
a strike picks a random tile weighted by elevation and tree density; if `trees > 60`
and `moist < 90` a **wildfire** starts. Snow accumulates when `temp < 0 °C` and
precipitating; melts above 2 °C. God interventions push a *weather override* with a
duration; when it expires the machine resumes from an equivalent state.

`WeatherChanged` events are emitted on state transitions (feed: "Heavy storm
approaching Velara" when the storm state is entered and a settlement exists).

## 4. Ecology (abstract, but real)

Each tile is updated once per world day (sliced):

- `veg`: logistic regrowth toward biome capacity × season factor × moisture; harvest
  subtracts; burnt tiles regrow from 0 after `burnt` countdown.
- `trees`: very slow regrowth (a forest takes decades to return), felling subtracts.
- `animals`: logistic regrowth; hunting subtracts; predator pressure `danger`
  scales with `trees` and distance from fires/buildings (settlements push wildlife out).
- `fish`: regrowth on water/shore tiles.
- `moist`: `+rain −evaporation(temp, wind) −uptake(veg)`, diffuses slightly to
  neighbours; rivers/lakes clamp their neighbourhood to high moisture.
- `fert`: rises slowly under vegetation, drops with repeated farming (Phase 2 rotation
  discovery matters), rises after burns (ash).

### Fire

Sparse set of burning tiles, stepped every tick:

```
for t in burning:
   fire[t] -= burnRate; trees[t], veg[t] decay; buildings on t take damage
   for n in neighbours(t):
       p = 0.05 × fire[t]/255 × fuel(n) × dryness(n) × windAlign(t→n) × (1 − rain(n))
       if rng() < p: ignite(n)
   if fire[t]==0: burnt[t] = 200; remove
```

Wildfire is an *observable phenomenon*: agents perceiving fire gain
`fire_awareness` knowledge (a prerequisite that makes `fire_making` discoverable),
feel fear, flee, and remember. This is how the first fire is usually *found*, not
invented from nothing.

## 5. Settlements and paths (emergent)

Nothing spawns a settlement. Every world day:

1. Collect completed dwellings with ≥ 1 resident.
2. Union-find cluster them with radius 6 tiles.
3. For each cluster: `dwellings`, `population`, centroid. Tier by dwellings:
   `2 camp · 4 hamlet · 10 village · 30 town · 100 city · 400 metropolis`.
4. Match clusters to existing settlement records by overlap (stable identity even as
   they grow/shrink/split/merge). New record → `SettlementFounded` (founder = oldest
   resident household head), who **names it** using the world language; tier change
   → `SettlementGrew`. A cluster that loses all dwellings becomes a *ruin* record
   (kept in history).

**Paths:** each agent step increments `traffic` on the tile; traffic decays 2 %/day.
`traffic > 40 → trail`, `> 160 → path`, `> 600 → road` (road needs `road_building`
knowledge in Phase 2; Phase 1 stops at path). Paths lower movement cost (×0.8 / ×0.65)
which feeds back into more traffic — desire lines become roads, exactly as in reality.

## 6. Offline catch-up algorithm

Stored: `lastSimulatedTick`, `lastRealTimeMs`, `speedPreset`.

```
onLoad(nowMs):
  owedMinutes = (nowMs − lastRealTimeMs)/1000 × worldMinutesPerRealSecond(speedPreset)
  owedTicks   = min(owedMinutes / TICK_MINUTES, MAX_CATCHUP_TICKS)     // cap: 500 years
  detailTicks = min(owedTicks, DETAIL_WINDOW)                          // 2 days = 192 ticks
  macroDays   = floor((owedTicks − detailTicks) / TICKS_PER_DAY)
  run macro for macroDays  (day-scale)              ← progress overlay "Simulating 62 years…"
  run detailed ticks for detailTicks + remainder    ← world arrives in a consistent micro state
  compute "Since your last visit" report (population, births, deaths, discoveries,
       buildings, settlements, top chronicle events, new beliefs referencing past interventions)
```

Rationale for the order: macro first, detailed last, so the world you *see* was
produced by the full model in its final hours and agents are mid-action, not frozen.

### Macro day (`sim/macro.js`)

The macro step must be **statistically consistent** with the detailed model —
calibrated against headless runs, not hand-tuned to look nice. Per world day:

- **Weather/ecology**: run the daily ecology pass in full (it is already day-scale);
  weather sampled per day from the Markov chain's day-level transition matrix.
- **Agents (each alive)**:
  - food/water: expected daily intake from *known* resources within home range ×
    gathering skill × season; deficit reduces `health` at the detailed model's rate.
  - warmth: exposure = f(temperature, shelter tier, fire access); cold damage as in detail.
  - aging, longevity mortality (`P_death/day = base × exp((age − longevity) / 4)`),
    disease/accident baseline.
  - needs are *not* tracked; they are set to typical values when detail resumes.
  - relationships: daily drift toward equilibrium given co-location (household,
    settlement); couple formation and breakup sampled from the detailed model's
    measured daily hazard rates given attraction/compatibility.
  - pregnancy: progresses; birth applies the genetics module exactly (real child).
  - childhood learning: skills/knowledge sampled from household knowledge.
  - discovery: per eligible agent, `P/day = k × experimentationTendency × eligibility`,
    with the same prerequisite check as the detailed engine (no shortcuts).
  - building: households with materials and knowledge progress construction at the
    expected daily rate.
- **Settlements/paths**: daily pass as usual.
- **History**: every event created by macro is a real event on the bus. Nothing is
  "narrated"; the chronicle for away-time is produced by the same history engine.

### Bounds and safety

- Hard cap `MAX_CATCHUP_YEARS = 500`; beyond it the world simply advances that much
  (and tells you).
- Catch-up runs inside a cooperative loop (chunks of days with `setTimeout(0)`
  between them) so the overlay can show progress and the tab never hangs.
- A catch-up can be *declined* ("Resume from where I left" → sets `lastRealTimeMs =
  now`) for those who want a paused world.

## 7. Calibration notes (as implemented in Phase 1)

- **Genesis happens in early summer** (world tick starts at day 100) so the first ones
  get a warm season to learn before their first winter; the Genesis site is chosen in a
  temperate-warm band (annual mean 13–19.5 °C at the site, seasonal amplitude ±8.5 °C).
- **Strangers.** The map is a region, not the planet. When the population is small a
  wanderer may arrive from beyond the edge of the known land (≈45 %/year below 6
  people, 20 %/year below 12, 6 %/year otherwise, never above 40). They arrive with no
  knowledge and walk toward the people they find. This keeps a 3-person Genesis from
  collapsing into a single sibling family and is the seed of Phase 2 migration.
- **Macro day ≙ detailed model.** Macro intake/warmth/reproduction rates were fitted
  against multi-seed detailed runs (`?mode=balance` in `dist/test.html`): a household
  shares food, orphans are taken in by the people around them, the homeless drift
  toward others, and every discovery, birth, couple and building goes through the
  same functions the detailed engine uses.
