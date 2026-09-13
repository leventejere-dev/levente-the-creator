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
        beliefs: { creator: 0, world: {} },
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
      if (a.knowledge.places.size > cap * 1.3) { // batch eviction of the least recently seen (water is never forgotten)
        const entries = [...a.knowledge.places.entries()].filter(([, v]) => v.k !== 'water').sort((x, y) => x[1].t - y[1].t);
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
      const clothing = a.inv.clothes ? LW.ITEMS.clothes.warmth : 0;
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
      const maxHealth = Math.max(0.2, 1 - a.injury - Math.max(0, this.age(world, a) - a.genes.physiology.longevity + 10) * 0.02);
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
      return LW.clamp01(d);
    },
    daily(world, a) {
      const rng = world.rng, cfg = world.cfg.agents;
      this.spoil(world, a.inv, 1);
      LW.Relationships.decay(world, a);
      LW.Social.daily(world, a);
      // old age
      const age = this.age(world, a); const lon = a.genes.physiology.longevity;
      if (age > lon - 10 && rng.chance(0.00025 * Math.exp((age - lon) / 5))) { this.die(world, a, 'öregség'); return; }
      // baseline illness
      if (rng.chance(0.0006 * (1 - a.genes.physiology.immunity * 0.7) * (a.needs.food < 0.3 ? 2 : 1))) { a.injury = Math.min(0.8, a.injury + 0.3); a.emotions.stress += 0.2; this.memory(world, a, { type: 'illness', text: 'megbetegedtem', importance: 0.4, emotion: 'fear', intensity: 0.4 }); world.events.emit('AgentIll', { tick: world.tick, agentId: a.id }); }
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
      const p = world.cfg.agents.fertilityBase * blessed * mother.genes.physiology.fertility * father.genes.physiology.fertility * (mother.health > 0.5 ? 1 : 0.4) * (mother.needs.food > 0.3 ? 1 : 0.3) * (age > 38 ? 0.4 : 1) * (mother.children.some((c) => { const ch = world.agents.get(c); return ch && LW.Time.ageYears(ch.bornTick, world.tick) < 2.5; }) ? 0.12 : 1);
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
