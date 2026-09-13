PATCHES = [
('docs/SIMULATION_MODEL.md', [
("""### Bounds and safety

- Hard cap `MAX_CATCHUP_YEARS = 500`; beyond it the world simply advances that much
  (and tells you).""",
 """### Bounds and safety

- Hard cap `MAX_CATCHUP_YEARS = 500`; beyond it the world simply advances that much
  (and tells you)."""),
("""- A catch-up can be *declined* ("Resume from where I left" → sets `lastRealTimeMs =
  now`) for those who want a paused world.""",
 """- A catch-up can be *declined* ("Resume from where I left" → sets `lastRealTimeMs =
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
  same functions the detailed engine uses.""")
]),
('docs/AGENT_MODEL.md', [
("""Urgency = `(1 − level)^2` (quadratic so a critical need dominates, a mild one barely
registers).""",
 """Urgency = `(1 − level)^2` (quadratic so a critical need dominates, a mild one barely
registers).

*Phase 1 calibration:* drains are `food 0.75 · water 0.8 · energy 1.2` per day, base
walking speed is 2 tiles per 15-minute tick (a tile ≈ 25 m), and **warmth** uses an
*effective temperature* = air + fire + shelter insulation + clothing + activity (+3 while
awake) + huddling (+2 per neighbour, max +4) − rain/wind exposure (reduced by tree
cover). Warmth recovers above 8 °C effective and drains below it at `(8 − eff)/50` per
day; hypothermia damage only starts at warmth 0. Sleeping in a lean-to next to a
lit campfire is enough for a temperate winter; sleeping in the open is not."""),
("""**Compatibility** = 1 − mean(|traitA − traitB|) over `humor optimism patience discipline
sociability` + 0.5 × complementarity on `dominance` (opposites attract there).""",
 """**Compatibility** = 1 − mean(|traitA − traitB|) over `humor optimism patience discipline
sociability` + 0.5 × complementarity on `dominance` (opposites attract there).

**Kinship** is graded (parent/child 1 · full sibling 0.9 · half-sibling or
grandparent 0.5 · first cousin 0.25) and applies a Westermarck-style aversion to
attraction (−2.5 / −0.9 / −0.35 / −0.12). Parent/child and full-sibling pairings are
effectively blocked; more distant kin are merely unlikely, which is what a founding
population of three needs to survive at all."""),
("""A plan that has been *told about* (progress ≥ 0.6 from conversation) can be
learned by a single successful experiment at high chance — this is how knowledge
crosses from teller to learner when no demonstration is possible.""",
 """A plan that has been *told about* (progress ≥ 0.6 from conversation) can be
learned by a single successful experiment at high chance — this is how knowledge
crosses from teller to learner when no demonstration is possible."""),
("""Movement uses bounded A* (8-neighbour, terrain cost: grass 1, forest 1.4, hills 2,
marsh 2.5, river 3, path 0.8, lake/ocean/peak impassable) with a straight-line
fallback; a plan stores its path and re-plans if blocked (fire, new building).""",
 """Movement uses bounded A* (8-neighbour, terrain cost: grass 1, forest 1.4, hills 2,
marsh 2.5, river 3, path 0.8, lake/ocean/peak impassable) with a straight-line
fallback; a plan stores its path and re-plans if blocked (fire, new building).

Two guards keep the brain out of death spirals: a place that turns out to be
unreachable is *avoided* for three days (and forgotten), and a goal whose plan keeps
failing (3× within two hours) is scored ×0.3 until something else has been tried.
Decisions use hysteresis (a new goal must beat the current one's *fresh* score by 40 %
+ 0.15) except for urgent survival goals (drink/eat/flee/warmth/child care above 1.2).""")
]),
('docs/TECHNOLOGY_MODEL.md', [
("""### 1.3 The attempt""",
 """*Phase 1 calibration:* `BASE = 0.05`; most discoveries also carry a `minSkill`
(experience gate — an agent must have foraged/crafted/built enough before the idea can
occur to them), and some carry `boosts` (`fire_making` has no hard prerequisite, but
having *seen* fire or knowing stone tools lowers its difficulty). Skills grow at
`0.0007 × (1 − skill)` per practice, so the gates open over years, not days.

### 1.3 The attempt"""),
]),
('docs/ROADMAP.md', [
("""## 5. Configurable parameters (`src/core/config.js`)""",
 """## 5. Configurable parameters (`src/core/config.js`)

The authoritative values live in `src/core/config.js` (they were retuned during
balancing; the snippet below shows the shape). Any value can be overridden from the
URL of the built file, e.g. `?cfg.time.defaultPreset=fast&cfg.genesis.population=6`."""),
]),
]
