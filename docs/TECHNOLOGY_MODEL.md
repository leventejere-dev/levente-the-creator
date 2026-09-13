# TECHNOLOGY MODEL

Covers spec items: 9 Technology Discovery Engine · 11 Digital Civilization Engine ·
12 Artificial Intelligence Civilization Engine.

---

## 1. Technology Discovery Engine

### 1.1 Principles

1. **Knowledge belongs to people, not to the world.** There is no global tech tree
   state. `world.firsts` records *who* discovered *what* first (for the chronicle),
   but usability depends on someone alive knowing it. Knowledge spreads (§2) and can
   die out (§3).
2. **Discovery = prerequisites + opportunity + attempt + luck.** No research points.
3. **Need pulls, curiosity pushes, accident surprises.** Three independent paths to
   the same discovery, all real.
4. **Not linear.** The graph has multiple entry points and alternatives; a civilization
   can have pottery before stone houses, or writing before bronze.

### 1.2 Definition

```ts
Discovery {
  id: 'fire_making'
  name: 'Fire Making'
  era: 'primitive'                            // for display/tech-level summaries only
  prerequisites: ['fire_awareness']           // techs the discoverer must personally know
  requiredKnowledgeAny?: [['stone_knapping'], ['woodworking']]  // alternative routes
  requiredItems: { wood: 2 }                  // in inventory for an experiment
  requiredNearby?: ['fire' | 'water' | 'clay' | 'deposit:copper' | 'building:kiln']
  requiredSkills?: { crafting: 0.15 }
  requiredInfrastructure?: ['building:workshop']   // later eras
  socialNeed?: 'warmth' | 'food' | 'safety' | 'trade' | 'war'     // which pressure accelerates it
  difficulty: 0.55                            // 0 easy .. 1 very hard
  accidents: [                                 // serendipity hooks (spec §38)
     { during: 'gather:stone', chance: 0.004, needs: ['fire_awareness'] }
  ]
  observationHints: ['phenomenon:wildfire']   // perceiving these grants partial progress
  unlocks: { actions: ['make_fire'], recipes: ['torch'], buildings: ['campfire'] }
  effects: { warmthSource: true }             // consumed by other systems
  wow: 'First Fire'                           // chronicle title when discovered first ever
}
```

*Phase 1 calibration:* `BASE = 0.05`; most discoveries also carry a `minSkill`
(experience gate — an agent must have foraged/crafted/built enough before the idea can
occur to them), and some carry `boosts` (`fire_making` has no hard prerequisite, but
having *seen* fire or knowing stone tools lowers its difficulty). Skills grow at
`0.0007 × (1 − skill)` per practice, so the gates open over years, not days.

### 1.3 The attempt

`experiment` goal picks the *eligible* discovery with the highest
`(need pressure + curiosity) / difficulty`, gathers requisites if missing (sub-plan),
then spends `T = 8..40 ticks` (scaled by difficulty) at a suitable place. On completion:

```
p = BASE(0.12) × (1 − difficulty)
     × (0.5 + intelligence) × (0.5 + creativity)
     × (1 + 0.5 × relevantSkill)
     × (1 + needPressure)                 // hungry people try harder at food tech
     × (1 + 0.5 × progress[tech])         // partial knowledge from hints / hearing about it
if rng() < p: learn(tech) → DiscoveryMade → maybe FirstOfKind
else: progress[tech] += 0.05 (failed experiments still teach)
```

A discovery that has been *told about* (progress ≥ 0.6 from conversation) can be
learned by a single successful experiment at high chance — this is how knowledge
crosses from teller to learner when no demonstration is possible.

### 1.4 Phase 1 discovery graph (primitive era)

```
                    fire_awareness (from seeing fire)
                          │
 stone_knapping ──────────┼──────────► fire_making ──► cooking ──► food_drying
      │                   │                 │                        ▲
      ├─► spear_making ──►│ hunting         └─► pottery ◄── clay_awareness (dig/marsh)
      ├─► digging ──► ore_awareness(copper/tin/iron)…(Phase 2 smelting)
      ├─► woodworking ──► hut_construction ──► stone_masonry ──► (Phase 2 house)
      │        ▲
 fiber_twisting ─┴─► basket_weaving ──► carrying capacity ↑
      │
 shelter_building (lean-to; needs wood, pressure: cold/rain)
 fishing (near water; spear or basket)
 seed_planting ◄── foraging_knowledge + observation of regrowth + food pressure
 herbal_medicine ◄── foraging_knowledge + illness/injury nearby
```

### 1.5 Effects are systemic

Each unlock changes *what the world can do*: `campfire` makes a warmth/light/safety
source and enables cooking (food value ×1.5, spoilage ↓); `hut` raises sleep
quality, warmth, safety, storage; `seed_planting` creates the `farm` building and the
`farmer` occupation with real yields depending on `fert`, `moist`, season; `digging`
creates `ore_unknown_*` items that are worthless *until* smelting exists — a real
prerequisite chain with real resources, no counters.

## 2. Knowledge diffusion

- **Conversation**: each `converse` interaction picks a random tech the teller knows
  and the listener doesn't: `P(transfer) = 0.25 × (0.5 + teller.sociability) × (0.5 +
  listener.intelligence) × (0.5 + friendship) × (1 − difficulty × 0.5)`; on failure
  `progress += 0.15` (the listener has *heard of it*).
- **Demonstration**: witnessing a tagged action → `progress += 0.05 × intelligence`.
- **Teaching** (deliberate): `teach` goal by elders/parents doubles both rates.
- Phase 2 adds books/schools (institutional memory), Phase 5 networks.

## 3. Knowledge loss (spec §39)

When the last living knower of a tech dies, the tech is *lost*: the world emits
`KnowledgeLost`, the chronicle records it, and rediscovery is possible (with a
`progress` bonus if artifacts — buildings, tools — still exist and are examined).
Elders forget rarely-used techs with declining health. Phase 2 writing pins knowledge
to objects (tablets/books) that survive their authors; burning a library really
loses knowledge.

## 4. Digital Civilization Engine (Phase 5 design)

Abstract, but with real resource flows.

```
DigitalNode { id, ownerCompany, settlement, kind: 'computer'|'server'|'datacenter'|'relay',
              processingPower, storage, bandwidth, latency, reliability, energyDemand,
              links: [nodeId], load }
Network      { nodes, links, protocolTech, coverage(settlement→0..1) }
Software     { id, author(s), company, kind: 'tool'|'service'|'platform'|'automation'|'ai_model',
               requirements: {processing, storage, bandwidth}, value: f(users, quality),
               users: population share per settlement }
```

- Nodes consume electricity from the grid (Phase 4); no power → no network → digital
  services degrade with visible economic effects.
- Data traffic between nodes is computed from software usage (users × per-user
  bandwidth) and rendered as the *network overlay* (spec §43).
- Software is produced by the `programmer` occupation inside companies, with quality
  from skills and research; distribution requires network coverage. Platform
  businesses (marketplace, social, search, communication) emerge when a company's
  software has network effects — modelled as demand growing with user share.
- Digital currency, subscriptions, ads, marketplaces are economy modules (see
  `ECONOMY_MODEL.md` §6) that attach to `Software.kind`.

## 5. Artificial Intelligence Civilization Engine (Phase 6 design)

The endgame is not guaranteed. It emerges only if the prerequisites exist *and* an
institution chooses to fund the attempts.

```
Prerequisites (discoveries): advanced_mathematics, statistics, computing, software_engineering,
                             large_data_systems, electrical_power, research_institutions,
                             machine_learning (itself a chain: automation → expert_systems → ml)
Attempt: a research institution or company with ≥ N researchers, compute ≥ threshold,
         data ≥ threshold, funding sustained over years → discovery roll per year.
```

The resulting in-world AI is an entity, **not an external API**:

```
ArtificialIntelligence { id, name (given by creators), createdTick, creators: [agentIds], owner (company/state),
   capability 0..∞ (grows with compute, data, research), knowledge: Set<tech>,
   compute: DigitalNode[], energyDemand, influence: {economy, research, military, governance},
   goals: derived from owner's goals + drift, alignment: 0..1 (how closely it serves owner goals),
   publicOpinion: per settlement −1..1 }
```

Effects are systemic (spec §46): productivity multipliers by occupation, research
speed for its owner, automation replacing occupations (unemployment → social
pressure → politics), military capability, governance advice. Society reacts through
existing systems: movements (culture module), religions (an AI-worship belief is just
`beliefs.world['ai_divine']`), regulation (politics), corporate races (companies
competing on `capability`). Nothing of this is scripted; the AI object exposes
capabilities and the other modules consume them.

## 6. Beyond contemporary technology (Phase 7)

Discoveries after the AI age are **procedurally generated** from a grammar:
`{domain: energy|materials|computing|biology|space|cognition} × {principle} ×
{scale}` producing `Discovery` objects with prerequisites drawn from existing
high-tier techs and effects drawn from parametrised templates (energy output,
productivity, lifespan, transport speed, information capacity). Names come from the
civilization's own language. The engine treats them like any other discovery.

## The possibility space (`src/tech/tree.js`, `src/society/society.js`)

The tree is data, not history: 105 discoveries in 13 eras (primitive → neolithic → copper → bronze → iron → classical →
medieval → renaissance → industrial → modern → digital → AI → beyond). Each entry has prerequisites, materials
(`items`/`itemsAny`), a required place (`nearby`: fire, water, or a building kind/property such as `furnace`, `workshop`,
`lab`, `university`, `data_center`), a minimum nearby population (`minPop` — big things need many people), a skill gate,
difficulty, `boosts` from related knowledge, and what it unlocks: recipes, buildings and generic effects (`fx`: food,
hunt, wood, stone, mine, farm, build, craft, speed, discovery, teach, warmth, health, preserve). Tools carry a `slot`
and `tier` (axe/hunt/plow/mine/clothes) and feed the same effect system.

Materials form chains (wood → charcoal; ore + charcoal → copper/iron in a furnace; copper + tin → bronze; iron + coal →
steel in a forge; clay → brick in a kiln; fiber → paper in a workshop; iron → machine parts; copper → electric parts;
glass + copper + electric parts → chips in a lab; oil → fuel/plastic in a factory). In the detailed simulation people
acquire inputs recursively (deposits by digging, stores by taking, crafted goods by crafting near the right building);
in the day-scale simulation skilled people produce materials into communal stores (workshop, forge, market, factory…)
and the community builds public buildings when it wants them (`Society.wants`: need, population, no duplicate nearby).

Era label = highest milestone known (copper smelting, bronze alloy, iron smelting, architecture/mathematics, universities,
printing/scientific method, steam engine, electrification, computer, AI, world simulation). Worlds always contain at
least a few surface-visible veins of copper, tin, iron, coal, gold, salt, oil and gems, so every world *can* get there;
whether it does is up to its people. A calibration run with a 12× discovery multiplier crosses the whole tree in ~47
years from 8 people; at the real rate it takes centuries per era, growing faster as populations and institutions grow.
