/* LEVENTE — THE CREATOR · tech/discoveries.js
 * Technology Discovery Engine: definitions, eligibility, attempts, accidents,
 * observation hints, learning and knowledge loss. Knowledge is per person.
 * (TECHNOLOGY_MODEL.md §1–§3)
 */
(function (LW) {
  'use strict';

  const D = {
    fire_awareness: { name: 'Knowledge of Fire', era: 'primitive', hidden: true, desc: 'Has seen fire and understood it is a thing that can be had.' },
    clay_awareness: { name: 'Knowledge of Clay', era: 'primitive', hidden: true, desc: 'Knows the soft earth by the water can be shaped.' },
    foraging_lore: { name: 'Plant Lore', era: 'primitive', prereq: [], items: { berries: 3, roots: 2 }, difficulty: 0.35, need: 'food', skill: 'foraging', minSkill: 0.12, wow: 'First Plant Lore', desc: 'Which plants feed, which harm. Better foraging.' },
    stone_knapping: { name: 'Stone Tools', era: 'primitive', prereq: [], items: { stone: 2, flint: 1 }, difficulty: 0.5, need: 'food', skill: 'crafting', minSkill: 0.1, accidents: [{ during: 'gather:stone', chance: 0.01 }], recipes: ['handaxe'], wow: 'First Stone Tool', desc: 'Striking stone against stone makes an edge.' },
    fire_making: { name: 'Fire Making', era: 'primitive', prereq: [], items: { wood: 3 }, difficulty: 0.72, boosts: { fire_awareness: 0.25, stone_knapping: 0.1 }, need: 'warmth', skill: 'crafting', accidents: [{ during: 'craft:handaxe', chance: 0.03 }, { during: 'gather:stone', chance: 0.004 }], buildings: ['campfire'], wow: 'First Fire', desc: 'Fire can be made, not only found.' },
    cooking: { name: 'Cooking', era: 'primitive', prereq: ['fire_making'], itemsAny: [{ meat_raw: 1 }, { fish_raw: 1 }], nearby: 'fire', difficulty: 0.4, need: 'food', skill: 'crafting', accidents: [{ during: 'rest:fire', chance: 0.04, itemsAny: [{ meat_raw: 1 }, { fish_raw: 1 }] }], recipes: ['meat_cooked', 'fish_cooked'], wow: 'First Cooked Meal', desc: 'Meat over fire is safer, richer, keeps longer.' },
    shelter_building: { name: 'Shelter Building', era: 'primitive', prereq: [], items: { wood: 4, fiber: 2 }, difficulty: 0.45, need: 'warmth', skill: 'building', buildings: ['lean_to'], wow: 'First Shelter', desc: 'Branches leaned together keep out rain and wind.' },
    fiber_twisting: { name: 'Cordage', era: 'primitive', prereq: [], items: { fiber: 3 }, difficulty: 0.4, skill: 'crafting', minSkill: 0.1, desc: 'Twisted plant fibers make rope.' },
    basket_weaving: { name: 'Basket Weaving', era: 'primitive', prereq: ['fiber_twisting'], items: { fiber: 6 }, difficulty: 0.55, need: 'food', skill: 'crafting', minSkill: 0.2, recipes: ['basket'], wow: 'First Basket', desc: 'Carry more, gather more.' },
    spear_making: { name: 'Spear Making', era: 'primitive', prereq: ['stone_knapping'], items: { wood: 1, flint: 1, fiber: 1 }, difficulty: 0.5, need: 'food', skill: 'crafting', minSkill: 0.2, recipes: ['spear'], wow: 'First Spear', desc: 'A sharp stone on a shaft. Hunting becomes possible.' },
    fishing: { name: 'Fishing', era: 'primitive', prereq: [], items: { wood: 1, fiber: 1 }, nearby: 'water', difficulty: 0.5, need: 'food', skill: 'hunting', minSkill: 0.05, wow: 'First Catch', desc: 'The water is full of food for those who learn to take it.' },
    woodworking: { name: 'Woodworking', era: 'primitive', prereq: ['stone_knapping'], items: { wood: 4 }, difficulty: 0.55, skill: 'crafting', minSkill: 0.3, desc: 'Shaping wood with stone tools.' },
    hut_construction: { name: 'Hut Building', era: 'primitive', prereq: ['shelter_building', 'woodworking', 'fiber_twisting'], items: { wood: 6, fiber: 2 }, difficulty: 0.75, need: 'warmth', skill: 'building', minSkill: 0.35, buildings: ['hut'], wow: 'First Hut', desc: 'A real home: walls, roof, a place to keep things.' },
    digging: { name: 'Digging', era: 'primitive', prereq: ['stone_knapping'], items: { stone: 1, wood: 1 }, difficulty: 0.5, skill: 'gathering', minSkill: 0.35, desc: 'What lies under the ground can be reached.' },
    pottery: { name: 'Pottery', era: 'primitive', prereq: ['fire_making', 'clay_awareness'], items: { clay: 4 }, nearby: 'fire', difficulty: 0.8, skill: 'crafting', minSkill: 0.4, accidents: [{ during: 'rest:fire', chance: 0.01, items: { clay: 1 } }], recipes: ['pot'], wow: 'First Pottery', desc: 'Clay hardened in fire holds water and grain.' },
    food_drying: { name: 'Food Preservation', era: 'primitive', prereq: ['fire_making'], itemsAny: [{ meat_raw: 2 }, { fish_raw: 2 }, { berries: 4 }], difficulty: 0.6, need: 'food', skill: 'crafting', minSkill: 0.3, recipes: ['dried_food'], buildings: ['storage_pit'], wow: 'First Food Store', desc: 'Dried food survives the winter.' },
    hide_working: { name: 'Hide Working', era: 'primitive', prereq: ['stone_knapping'], items: { hide: 2 }, difficulty: 0.55, need: 'warmth', skill: 'crafting', minSkill: 0.3, recipes: ['clothes'], wow: 'First Clothing', desc: 'Animal skins become warm clothing.' },
    seed_planting: { name: 'Agriculture', era: 'neolithic', prereq: ['foraging_lore', 'digging'], items: { roots: 2, berries: 2 }, difficulty: 0.92, need: 'food', skill: 'foraging', minSkill: 0.55, buildings: ['farm_plot'], wow: 'First Farm', desc: 'Seeds put in the ground come back as food.' },
    herbal_medicine: { name: 'Herbal Medicine', era: 'primitive', prereq: ['foraging_lore'], items: { fiber: 2, berries: 2 }, difficulty: 0.7, skill: 'foraging', minSkill: 0.35, wow: 'First Healer', desc: 'Some plants close wounds and calm fevers.' },
    stone_masonry: { name: 'Stone Masonry', era: 'neolithic', prereq: ['hut_construction', 'digging'], items: { stone: 8, clay: 2 }, difficulty: 0.92, skill: 'building', minSkill: 0.6, buildings: ['stone_house'], wow: 'First Stone House', desc: 'Stones fitted and bound with clay stand for generations.' },
    ore_lore_copper: { name: 'Knowledge of Green Stone', era: 'neolithic', hidden: true, desc: 'A strange green-veined stone has been found. Nobody knows its use yet.' },
    ore_lore_tin: { name: 'Knowledge of Grey Stone', era: 'neolithic', hidden: true, desc: 'A heavy grey stone. Its use is unknown.' },
    ore_lore_iron: { name: 'Knowledge of Red Stone', era: 'neolithic', hidden: true, desc: 'Rust-red rock, heavy and useless so far.' },
    ore_lore_coal: { name: 'Knowledge of Burning Stone', era: 'neolithic', hidden: true, desc: 'A black stone that burns.' },
    ore_lore_gold: { name: 'Knowledge of Shining Stone', era: 'neolithic', hidden: true, desc: 'A soft yellow stone that never dulls. Beautiful.' },
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
  LW.ITEMS.clothes = { weight: 1.0, label: 'Hide clothing', tool: true, warmth: 8 };

  /** Where an item can be obtained from the world (POI kind) — null = only via crafting/inventory. */
  const SOURCE = { berries: 'food', roots: 'food', wood: 'wood', stone: 'stone', flint: 'flint', fiber: 'fiber', clay: 'clay', meat_raw: 'animals', fish_raw: 'fish' };

  const Tech = {
    D, RECIPES, SOURCE,
    knows(a, id) { return a.knowledge.techs.has(id); },
    /** Discoveries an agent could try right now (prereqs known, not yet known, not hidden). */
    eligible(world, a) {
      const out = [];
      for (const id in D) {
        const d = D[id]; if (d.hidden || a.knowledge.techs.has(id)) continue;
        if (d.prereq && !d.prereq.every((p) => a.knowledge.techs.has(p))) continue;
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
      return LW.clamp01(cfg.experimentBase * (1 - Math.max(0.05, difficulty)) * (0.5 + p.intelligence) * (0.5 + p.creativity) * (1 + 0.6 * skill) * (1 + need) * (1 + 1.5 * prog));
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
      if (source === 'taught' || source === 'observed_practice' || source === 'inherited') world.events.emit('KnowledgeTransferred', ev);
      else { world.stats.discoveries++; world.events.emit('DiscoveryMade', ev); }
      if (!d.hidden && source !== 'taught') { LW.Agents.memory(world, a, { type: 'discovery', text: `discovered ${d.name}`, importance: first ? 0.95 : 0.7, emotion: 'pride', intensity: first ? 0.9 : 0.6, tech: id }); a.emotions.pride = Math.min(1, a.emotions.pride + 0.6); a.emotions.joy = Math.min(1, a.emotions.joy + 0.4); a.needs.curiosity = 1; }
    },
    /** Union of everything anyone alive knows. */
    worldKnowledge(world) { const s = new Set(); for (const a of world.agents.values()) for (const t of a.knowledge.techs) s.add(t); return s; },
    techLevel(known) {
      const has = (k) => known.has(k);
      if (has('stone_masonry') && has('seed_planting')) return 'Neolithic';
      if (has('seed_planting') || (has('pottery') && has('hut_construction'))) return 'Early Neolithic';
      if (has('stone_knapping') && has('fire_making')) return 'Stone Age';
      if (has('stone_knapping') || has('fire_making') || has('shelter_building')) return 'Early Stone Age';
      return 'Primitive';
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
      if (world.firsts && world.firsts['tech:' + id]) world.events.emit('KnowledgeLost', { tick: world.tick, tech: id, agentId: lastHolder ? lastHolder.id : undefined });
    },
  };

  function diff(inv, need) { const m = {}; for (const k in need) { const have = inv[k] || 0; if (have < need[k]) m[k] = need[k] - have; } return m; }
  function count(m) { let c = 0; for (const k in m) c += m[k]; return c; }

  LW.Tech = Tech;
})(globalThis.LW || (globalThis.LW = {}));
