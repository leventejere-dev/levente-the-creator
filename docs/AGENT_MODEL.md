# AGENT MODEL

Covers spec items: 5 Agent brain · 6 Memory architecture · 7 Relationship architecture ·
8 Genetics — plus biology, needs, emotions, perception, childhood and death.

---

## 1. The agent object

```ts
Agent {
  id: number                       // monotonically increasing, never reused
  name: string                     // given by parents via the world language
  sex: 'f' | 'm'
  bornTick: number                 // age is derived
  diedTick?: number                // deceased agents are kept in world.deceased (compact record)

  genes: Genome                    // §6 — heritable, immutable after birth
  appearance: { skin, hair, eyes, height, build }   // derived from genes for rendering
  personality: Traits              // §2 — starts from genes, develops during childhood
  emotions: Emotions               // §2 — fast-changing vector
  needs: Needs                     // §2 — satisfaction levels 0..1
  health: number                   // 0..1 ; 0 = death
  injuries: number                 // 0..1 temporary health cap reduction
  pregnancy?: { by: id, sinceTick }

  skills: Record<skill, 0..1>      // gathering hunting crafting building foraging social exploring medicine farming
  knowledge: {
     techs: Set<techId>            // what this agent personally knows (NOT world-global)
     places: Map<tileIdx, Poi>     // known water/food/stone/clay/shelters… with lastSeen & quality
     progress: Record<techId, 0..1> // partial learning (children watching, hearing about it)
  }
  memory: { episodic: Memory[], social: Map<id, Impression>, emotional: Memory[] }   // §4
  relationships: Map<id, Relationship>                                             // §5
  beliefs: { creator: 0..1, world: Record<string, 0..1> }

  inventory: Map<item, qty>        // carry capacity by build & tools
  home?: buildingId                // dwelling; household = everyone with same home
  partner?: id
  parents: [id?, id?]
  children: id[]

  x, y: number                     // tile coords (float, for smooth movement)
  facing: 0..3

  plan?: Plan                      // §3 — current goal + steps
  lastDecisionTick: number
  divineRequest?: DivineRequest    // pending message from the Creator
  achievements: string[]           // "First Fire", "Founder of Velara"
  importance: number               // history-derived; used by LOD and inspector ordering
}
```

## 2. Biology, needs, emotions, personality

### Needs (satisfaction 0..1, 1 = fully satisfied)

| Need | Drain (per world day) | Critical below | Consequence at 0 |
|---|---|---|---|
| food | 1.0 (×metabolism, ×1.3 pregnant/child growing) | 0.25 | health −0.06/day → starvation ≈ 2–3 weeks |
| water | 1.4 | 0.3 | health −0.25/day → 3–4 days |
| energy | 1.5 while awake, +3.0 while sleeping | 0.2 | forced sleep, accident risk, skill −50 % |
| warmth | depends on ambient: `−(comfortTemp − temp)/25` per day, +shelter/fire/clothing | 0.3 | health −0.08/day (hypothermia) |
| safety | recovers +0.5/day in shelter/settlement; drops on threat perception | 0.3 | fear, flee, poor sleep |
| social | 0.35 | 0.25 | loneliness → sadness, risk-taking |
| affection | 0.12 (adults) | 0.2 | seeks partner/family; sadness |
| curiosity | 0.2 × trait | — | drives explore/experiment when others satisfied |
| belonging / status / purpose | Phase 2 (need settlements & roles to be meaningful) | | |

Urgency = `(1 − level)^2` (quadratic so a critical need dominates, a mild one barely
registers).

*Phase 1 calibration:* drains are `food 0.75 · water 0.8 · energy 1.2` per day, base
walking speed is 2 tiles per 15-minute tick (a tile ≈ 25 m), and **warmth** uses an
*effective temperature* = air + fire + shelter insulation + clothing + activity (+3 while
awake) + huddling (+2 per neighbour, max +4) − rain/wind exposure (reduced by tree
cover). Warmth recovers above 8 °C effective and drains below it at `(8 − eff)/50` per
day; hypothermia damage only starts at warmth 0. Sleeping in a lean-to next to a
lit campfire is enough for a temperate winter; sleeping in the open is not.

### Emotions (0..1 each, decay to a personality baseline with half-life ≈ 1 day)

`joy sadness fear anger stress love attraction jealousy loneliness grief excitement
shame pride`. Impulses come from events (a rejection: `shame +0.4, sadness +0.3`; a
child born: `joy +0.7, pride +0.5`; witnessing fire: `fear +0.6`). Emotions modify
decisions, not just the UI:

- `fear` → flee/shelter score ×(1+2·fear); exploration ×(1−fear); action error rate ↑
- `grief` → work yield ×(1−0.5·grief), sociability ↓, sleeps more; lasts weeks
- `anger` + high aggression + resentment toward someone nearby → conflict chance
- `joy/love` → flirt acceptance ↑, generosity ↑ (sharing food)
- `stress` (needs unmet, danger, crowding) → poorer decisions (noise σ ×2)

`mood = joy + love + pride + 0.5·excitement − sadness − fear − anger − grief − shame − 0.5·stress`.

### Personality (0..1, the 16 traits of spec §15)

`curiosity creativity intelligence empathy aggression patience bravery sociability
ambition discipline loyalty greed riskTolerance optimism dominance humor`.
Every goal's score has explicit trait multipliers (see §3). Traits are genetic at
birth (§6) and *develop* until adulthood: each year of childhood pulls 15 % toward the
mean of the caregivers' traits (nurture) and formative memories nudge specific
traits (a childhood famine +discipline +greed; a violent death witnessed +fear
baseline −bravery).

### Life stages

| Stage | Age (world years) | Behaviour |
|---|---|---|
| infant | 0–3 | carried/stays home; needs are met by caregivers' `careForChild` goal or it dies |
| child | 3–12 | follows a parent, plays, forages a little, *learns by watching* (knowledge progress from observed tagged actions) |
| adolescent | 12–16 | works, explores, first attractions (no reproduction) |
| adult | 16+ | everything |
| elder | > longevity − 8 | slower, teaching bonus, mortality rises |

Longevity is genetic (40–62 in the primitive era). Later phases raise it via
medicine, food security and housing — as consequences, not as an era constant.

### Death

Health hits 0 from: starvation, dehydration, hypothermia, injury (fights, accidents
during risky work, predators at night outside), fire, lightning, disease (baseline
small hazard, god disease), old age (`P/day = 0.0004 × exp((age − longevity)/4)`).
`AgentDied {cause}` → inventory dropped on the tile; property inherited by partner,
else eldest child, else household; loved ones get `grief`; the record moves to
`world.deceased` (name, dates, parents, children, cause, achievements) so family
trees and history remain complete.

## 3. The brain — Utility AI + hierarchical goals + action state machines

```
decide(agent):
  candidates = [] 
  for goal in GOALS:
      if !goal.applicable(agent, ctx): continue            // e.g. flirt needs an adult target in range
      s = goal.score(agent, ctx)                           // 0..~3
      s *= traitMultipliers(goal, agent.personality)
      s *= emotionMultipliers(goal, agent.emotions)
      s += gauss(0, NOISE_SIGMA × (1 + stress))            // stochastic, small
      candidates.push({goal, s, explanation})
  best = argmax; if agent.plan && best.goal == plan.goal && plan.ok: keep plan
  agent.plan = goal.makePlan(agent, ctx)                   // steps
  agent.why  = { chosen: best, rejected: top 4 alternatives with scores, factors }   // WHY? button
```

### Goal catalogue (Phase 1)

| Goal | Score sketch | Plan |
|---|---|---|
| eat | `urg(food)×1.6` (+0.6 if inventory has food) | consume from inventory, else moveTo best known food POI → gather → consume; hunt if spear known & animals |
| drink | `urg(water)×1.8` | moveTo nearest known water → drink |
| sleep | `urg(energy)×1.3×(night?1.6:0.6)` | moveTo home/shelter if any → sleep until energy>0.9 or dawn |
| getWarm / shelter | `urg(warmth)×1.5 + rain×0.7 + storm×1.0` | moveTo fire/shelter; if none known & knows fire → make fire |
| flee | `danger×2.5×(1+fear)` | move away from threat vector; interrupts anything |
| careForChild | `max over own infants/children: urg(child.food)×1.8×(0.5+empathy)` | fetch food → give |
| socialize | `urg(social)×0.9×(0.5+sociability)` | moveTo known agent nearby → converse (knowledge transfer, relationship update) |
| flirt | `attraction(t)×(0.4+urg(affection))×libido×(single or lowLoyalty)` | approach → flirt → courtship progress |
| mate | partnered: `urg(affection)×attraction×privacy` | at home / night → intimacy → pregnancy chance |
| gatherFood (stockpile) | `(1−stock/target)×0.7×(0.5+discipline)×seasonPressure` | gather berries/hunt/fish to inventory/home storage |
| gatherMaterials | need from build/ craft plan | collect wood/stone/fiber/clay |
| build | `has shelter tech × (no home)×1.2 + rainMemory + coldMemory` , ambition | choose site near water/food/family → haul → construct |
| craft | tool needed & known × 0.8 | make handaxe/spear/basket/pot |
| explore | `curiosity×(1−fear)×0.6×unknownFraction(range)` | walk to frontier of known map, perceive |
| experiment | `curiosity×creativity×0.8×allNeedsOk×eligibleDiscoveries` | pick eligible discovery → gather requisites → try N ticks → roll |
| teach/learn | knowledge gap × sociability × relationship | converse with intent |
| dig | knows stone tools × curiosity × surface hint nearby | dig tile → find material |
| mourn | `grief×0.8` | sit at home/grave, reduced activity |
| followParent (child) | constant 0.9 if parent > 6 tiles away | move toward parent |
| divine (message) | `obedience` (see ARCHITECTURE §6) | interpreted plan |
| rest / wander | 0.15 baseline | idle near home, small walks |

### Plans and actions

```
Plan { goal, steps: Step[], i, target, startedTick, why, priority }
Step kinds: moveTo(tile|agent) · gather(tile,item,n) · consume(item) · sleep(untilCond)
            · interact(agent, kind) · build(bid) · craft(recipe) · experiment(techId)
            · dig(tile) · give(agent,item,n) · wait(n) · flee(vector)
step(): 'running' | 'done' | 'failed'
```

Movement uses bounded A* (8-neighbour, terrain cost: grass 1, forest 1.4, hills 2,
marsh 2.5, river 3, path 0.8, lake/ocean/peak impassable) with a straight-line
fallback; a plan stores its path and re-plans if blocked (fire, new building).

Two guards keep the brain out of death spirals: a place that turns out to be
unreachable is *avoided* for three days (and forgotten), and a goal whose plan keeps
failing (3× within two hours) is scored ×0.3 until something else has been tried.
Decisions use hysteresis (a new goal must beat the current one's *fresh* score by 40 %
+ 0.15) except for urgent survival goals (drink/eat/flee/warmth/child care above 1.2).

### Perception

Every 2 ticks an agent scans radius `R = 6` (×1.3 on hills, ×0.5 at night without
moon, ×0.7 in rain/fog). It learns POIs (water, food ≥ threshold, stone, clay hints,
buildings, fires, landmarks), notices other agents (creating/refreshing `social`
impressions and `familiarity`), witnesses actions (flirting partner → jealousy;
a discovery → progress on that tech; a death → grief/fear) and phenomena (wildfire →
`fire_awareness`). Nothing outside perception is known — an agent can starve next to
a berry bush it never saw (rare, because exploring is a goal).

## 4. Memory architecture

```
Memory { tick, type, subjects: id[], tileIdx?, importance 0..1, emotion: {kind, intensity},
         confidence 0..1, source: 'experienced'|'told'|'inferred', text: template key + params }
```

- **Working memory** — the current plan, perceived agents/tiles this tick, threat vector.
- **Episodic** — list capped at 80; consolidation each world hour (sliced):
  `importance ← importance × (1 − decay × (1 − emotion.intensity))`, drop the weakest
  when over cap; memories with `importance > 0.8` or emotional intensity > 0.7 are
  copied to **emotional memory** (permanent, max 12, shape personality drift).
- **Semantic** — `knowledge.techs`, `knowledge.places`, `beliefs`. Techs are boolean but
  can be *forgotten* by elders with declining health if unused for years (Phase 2 makes
  writing the cure — spec §39).
- **Social** — `memory.social[id] = { lastSeen, lastTile, impression (−1..1),
  knownTraits (estimated), knownFacts: [{fact, confidence, source}] }`.
- **Distortion** — a *told* memory copies with `confidence × 0.8` and, with probability
  `(1 − teller.intelligence) × 0.3`, a mutated detail (subject swapped for a similar
  agent, place shifted, intensity exaggerated by `humor`/`optimism`). Rumors are just
  low-confidence told memories; the divine memories from god interventions spread
  this way and drift into myth.

## 5. Relationship architecture

`Relationship { trust, attraction, respect, friendship, fear, resentment, jealousy,
gratitude, loyalty, familiarity, dependency, romance: 0..1 (courtship progress),
status: 'stranger'|'acquaintance'|'friend'|'rival'|'dating'|'partner'|'ex'|'family',
lastInteractionTick }` — all 0..1, asymmetric (A→B ≠ B→A).

Update rules (examples):

- meet: `familiarity += 0.05`; first meeting computes initial `attraction` (see below)
  and `respect` from perceived skills/age.
- conversation: `friendship += 0.03 × compatibility × (1 + humor_a + humor_b)/2`;
  `trust += 0.01`; if a fact told is later contradicted by experience: `trust −= 0.1`.
- help received (food given, protection): `gratitude += 0.3`, `trust += 0.05`.
- harm (fight, theft, rejection): `resentment += 0.2..0.5`, `fear` if lost the fight.
- witnessing own partner flirt: `jealousy += 0.4`, `resentment(partner) += 0.2`,
  `resentment(rival) += 0.3`.
- decay: `familiarity −0.002/day`, `resentment −0.01/day × (patience)`, `gratitude −0.005/day`.

**Compatibility** = 1 − mean(|traitA − traitB|) over `humor optimism patience discipline
sociability` + 0.5 × complementarity on `dominance` (opposites attract there).

**Kinship** is graded (parent/child 1 · full sibling 0.9 · half-sibling or
grandparent 0.5 · first cousin 0.25) and applies a Westermarck-style aversion to
attraction (−2.5 / −0.9 / −0.35 / −0.12). Parent/child and full-sibling pairings are
effectively blocked; more distant kin are merely unlikely, which is what a founding
population of three needs to survive at all.

**Attraction** (A→B) = `0.35 × appearancePref(A.prefs, B.appearance) + 0.25 × compatibility
+ 0.15 × B.status/skills + 0.1 × age proximity − 0.5 × kinship − 1.0 × sameSexIfNotOriented`.
Each agent has a random preference vector (from genes) so taste differs; kinship
(parent/child/sibling/half-sibling) is an instinctive block (Westermarck effect for
those raised together).

**Romance flow** (spec §25): flirt → acceptance test on the other side (attraction,
mood, single or `loyalty` low, shyness = 1−sociability) → mutual `romance` progress
→ ≥ 0.5 = *dating* (`CoupleFormed`) → ≥ 0.9 + time = *partners* (share a home,
`affection` satisfied by each other, mating possible). Rejection → `shame`,
`resentment` small. Breakup when `resentment > friendship + 0.3` for a week, or
attraction < 0.15 for a month, or partner's infidelity witnessed with low
`patience`. Ex-partners keep a relationship with `status: ex`. Forgiveness is
resentment decay × `empathy` × `patience`.

## 6. Genetics

```
Genome {
  traits: number[16]            // personality base values 0..1
  appearance: { skin 0..1, hairHue 0..1, hairShade 0..1, eyes 0..1, height 0..1, build 0..1 }
  physiology: { longevity 40..62, fertility 0.3..1, baseHealth 0.7..1, metabolism 0.8..1.2, immunity 0..1 }
  prefs: number[6]              // appearance preference vector (what this agent finds attractive)
  orientation: 0..1             // 0 = other-sex attraction, 1 = same-sex; sampled bimodally (~92 % near 0)
}
```

Inheritance: for each scalar, take parent A's or B's value (50/50) then blend 30 %
toward the other parent, then add mutation `N(0, 0.04)` (clamped). Rare (1 %) large
mutations (`N(0, 0.2)`) keep lineages from converging. The child's `personality`
starts as `genes.traits` and develops through childhood (§2). Full genealogy is kept
(`parents`, `children`, deceased records), so any agent can be traced to Genesis.
Genesis agents have random genomes drawn from the seed.

**Childhood learning**: an observed tagged action (`gather:berries`, `craft:handaxe`,
`experiment:fire_making`) by a caregiver adds `knowledge.progress[tech] += 0.02 ×
intelligence`; reaching 1.0 = learned. Skills grow with practice:
`skill += 0.004 × (1 − skill)` per action, decay `0.0002/day` unused.

## 7. Speech — emergent language (`src/language/speech.js`) and the shared chat (`src/agents/dialogue.js`)

Nobody is given words. A person has `vocab: {concept → {w: word, s: secretFlag}}` and a `langId`. Concepts are a fixed
catalogue (~90: needs, objects, nature, actions, qualities, abstractions) with Hungarian glosses. When two people talk
(`Social.converse`, or the plan-less *ambient* chatter of people standing next to each other, `Social.ambient`), the
speaker picks 2–4 concepts from their situation (goal, needs, emotions, weather, recent divine memory, partner/child) and
utters them: a word if they have one, a coined one (from the language's phoneme inventory) if creativity allows, a
gesture otherwise. Listeners learn words (intelligence, familiarity, youth), sometimes mutated (sound shift), and may
adopt a different word from a respected speaker. Daily, per language, the consensus word per concept is recomputed; a
language gets a name (its word for *we*) once 10 consensus words exist. Every 10 days settlements of the same language
are compared: if two groups share < 45 % of their words the smaller one splits into a child language. Strangers arrive
with their own small language; learning from a majority slowly switches a person's `langId`. Knowledge transfer in
conversation is scaled by mutual intelligibility. Believers in trouble *pray* (an utterance addressed to the sky).

**Secrecy.** People who believe in the Creator but distrust the voice (`beliefs.trust < −0.25`) re-coin words with a
partner who shares the sentiment (`s: 1`). The Creator's *divine ear* understands every non-secret word; secret words
must be decoded by listening (low probability) or revealed by someone who trusts the voice.

**The shared chat.** `Dialogue.parse` classifies the Creator's free text (command / nudge / question / greeting / tone),
`Dialogue.hear` applies the effects (belief, trust, fear/joy, memory, achievement), commands go through `God.command` +
`God.interpret` (obey / misinterpret / fear / ignore — the person decides), nudges boost one goal for a day
(`a.nudge`), and `Dialogue.compose` builds the Hungarian reply from state (attitude: confused / hostile / wary / neutral /
warm / devout). Hostile people answer in their own tongue. An LLM (free Gemini key, browser-side) only *phrases* the
reply from `Dialogue.facts` and the decided outcome. `trust` is a new belief axis moved by witnessed interventions
(awe − fear), forced commands, kept promises and the tone of the voice.

## 8. Mind — the self-model (`src/agents/mind.js`) and civilization dynamics (`src/society/civilization.js`)

`a.mind` is a functional model of consciousness, not consciousness: *purpose* (family / knowledge / faith / power / craft /
freedom / love / survival / legacy, re-chosen monthly from personality, life situation and mortality), *self-image*
(what nearby people feel about the person), *mortality* (age vs longevity, illness, recent deaths — it raises teaching
and record-keeping: legacy), *existential load* (grows with scientific doubt, grief and the simulation hypothesis;
shrinks with faith and purpose), a *journal* of inner sentences composed daily from the strongest real signal (illness,
grief, hunger, mortality, doubt, pride, love, self-image, purpose), unanswerable *questions* asked once each, and
*dreams* (an emotional memory replayed at night). The chat and the inspector read from it.

Civilization: contagious *disease* (`a.ill`, spread to household and neighbours, immunity after recovery; epidemics per
settlement; sanitation/vaccination/hospitals protect), *doubt* (`skepticism` from science lowers belief unless the
Creator has recently acted), the *simulation hypothesis* (`beliefs.simulation`, per-person target from curiosity,
faith and dominance once `world_simulation` is known; a verdict event when a majority accepts or denies), *states*
(a leader who knows law), *war* (tension between neighbouring polities from dominance, resentment, hunger; markets and a
shared language lower it; battles wound warriors; a decisive war annexes the loser), *companies* (a banker with wealth
takes over a productive building), and *growth* (sailors discover a new land band; `World.expand` remaps every index).
