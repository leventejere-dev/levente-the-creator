PATCHES = [
('src/tech/discoveries.js', [
("""    foraging_lore: { name: 'Plant Lore', era: 'primitive', prereq: [], items: { berries: 3, roots: 2 }, difficulty: 0.3, need: 'food', skill: 'foraging', wow: 'First Plant Lore', desc: 'Which plants feed, which harm. Better foraging.' },
    stone_knapping: { name: 'Stone Tools', era: 'primitive', prereq: [], items: { stone: 2, flint: 1 }, difficulty: 0.35, need: 'food', skill: 'crafting', accidents: [{ during: 'gather:stone', chance: 0.01 }], recipes: ['handaxe'], wow: 'First Stone Tool', desc: 'Striking stone against stone makes an edge.' },""",
 """    foraging_lore: { name: 'Plant Lore', era: 'primitive', prereq: [], items: { berries: 3, roots: 2 }, difficulty: 0.35, need: 'food', skill: 'foraging', minSkill: 0.12, wow: 'First Plant Lore', desc: 'Which plants feed, which harm. Better foraging.' },
    stone_knapping: { name: 'Stone Tools', era: 'primitive', prereq: [], items: { stone: 2, flint: 1 }, difficulty: 0.5, need: 'food', skill: 'crafting', minSkill: 0.1, accidents: [{ during: 'gather:stone', chance: 0.01 }], recipes: ['handaxe'], wow: 'First Stone Tool', desc: 'Striking stone against stone makes an edge.' },"""),
("""    cooking: { name: 'Cooking', era: 'primitive', prereq: ['fire_making'], itemsAny: [{ meat_raw: 1 }, { fish_raw: 1 }], nearby: 'fire', difficulty: 0.3, need: 'food', skill: 'crafting',""",
 """    cooking: { name: 'Cooking', era: 'primitive', prereq: ['fire_making'], itemsAny: [{ meat_raw: 1 }, { fish_raw: 1 }], nearby: 'fire', difficulty: 0.4, need: 'food', skill: 'crafting',"""),
("""    fiber_twisting: { name: 'Cordage', era: 'primitive', prereq: [], items: { fiber: 3 }, difficulty: 0.3, skill: 'crafting', desc: 'Twisted plant fibers make rope.' },
    basket_weaving: { name: 'Basket Weaving', era: 'primitive', prereq: ['fiber_twisting'], items: { fiber: 6 }, difficulty: 0.4, need: 'food', skill: 'crafting', recipes: ['basket'], wow: 'First Basket', desc: 'Carry more, gather more.' },
    spear_making: { name: 'Spear Making', era: 'primitive', prereq: ['stone_knapping'], items: { wood: 1, flint: 1, fiber: 1 }, difficulty: 0.4, need: 'food', skill: 'crafting', recipes: ['spear'], wow: 'First Spear', desc: 'A sharp stone on a shaft. Hunting becomes possible.' },
    fishing: { name: 'Fishing', era: 'primitive', prereq: [], items: { wood: 1, fiber: 1 }, nearby: 'water', difficulty: 0.45, need: 'food', skill: 'hunting', wow: 'First Catch', desc: 'The water is full of food for those who learn to take it.' },
    woodworking: { name: 'Woodworking', era: 'primitive', prereq: ['stone_knapping'], items: { wood: 4 }, difficulty: 0.4, skill: 'crafting', desc: 'Shaping wood with stone tools.' },
    hut_construction: { name: 'Hut Building', era: 'primitive', prereq: ['shelter_building', 'woodworking', 'fiber_twisting'], items: { wood: 6, fiber: 2 }, difficulty: 0.5, need: 'warmth', skill: 'building', buildings: ['hut'], wow: 'First Hut', desc: 'A real home: walls, roof, a place to keep things.' },
    digging: { name: 'Digging', era: 'primitive', prereq: ['stone_knapping'], items: { stone: 1, wood: 1 }, difficulty: 0.35, skill: 'gathering', desc: 'What lies under the ground can be reached.' },
    pottery: { name: 'Pottery', era: 'primitive', prereq: ['fire_making', 'clay_awareness'], items: { clay: 4 }, nearby: 'fire', difficulty: 0.5, skill: 'crafting', accidents: [{ during: 'rest:fire', chance: 0.02, items: { clay: 1 } }], recipes: ['pot'], wow: 'First Pottery', desc: 'Clay hardened in fire holds water and grain.' },
    food_drying: { name: 'Food Preservation', era: 'primitive', prereq: ['fire_making'], itemsAny: [{ meat_raw: 2 }, { fish_raw: 2 }, { berries: 4 }], difficulty: 0.45, need: 'food', skill: 'crafting', recipes: ['dried_food'], buildings: ['storage_pit'], wow: 'First Food Store', desc: 'Dried food survives the winter.' },
    hide_working: { name: 'Hide Working', era: 'primitive', prereq: ['stone_knapping'], items: { hide: 2 }, difficulty: 0.4, need: 'warmth', skill: 'crafting', recipes: ['clothes'], wow: 'First Clothing', desc: 'Animal skins become warm clothing.' },
    seed_planting: { name: 'Agriculture', era: 'neolithic', prereq: ['foraging_lore', 'digging'], items: { roots: 2, berries: 2 }, difficulty: 0.7, need: 'food', skill: 'foraging', buildings: ['farm_plot'], wow: 'First Farm', desc: 'Seeds put in the ground come back as food.' },
    herbal_medicine: { name: 'Herbal Medicine', era: 'primitive', prereq: ['foraging_lore'], items: { fiber: 2, berries: 2 }, difficulty: 0.6, skill: 'medicine', wow: 'First Healer', desc: 'Some plants close wounds and calm fevers.' },
    stone_masonry: { name: 'Stone Masonry', era: 'neolithic', prereq: ['hut_construction', 'digging'], items: { stone: 8, clay: 2 }, difficulty: 0.65, skill: 'building', buildings: ['stone_house'], wow: 'First Stone House', desc: 'Stones fitted and bound with clay stand for generations.' },""",
 """    fiber_twisting: { name: 'Cordage', era: 'primitive', prereq: [], items: { fiber: 3 }, difficulty: 0.4, skill: 'crafting', minSkill: 0.1, desc: 'Twisted plant fibers make rope.' },
    basket_weaving: { name: 'Basket Weaving', era: 'primitive', prereq: ['fiber_twisting'], items: { fiber: 6 }, difficulty: 0.55, need: 'food', skill: 'crafting', minSkill: 0.2, recipes: ['basket'], wow: 'First Basket', desc: 'Carry more, gather more.' },
    spear_making: { name: 'Spear Making', era: 'primitive', prereq: ['stone_knapping'], items: { wood: 1, flint: 1, fiber: 1 }, difficulty: 0.5, need: 'food', skill: 'crafting', minSkill: 0.2, recipes: ['spear'], wow: 'First Spear', desc: 'A sharp stone on a shaft. Hunting becomes possible.' },
    fishing: { name: 'Fishing', era: 'primitive', prereq: [], items: { wood: 1, fiber: 1 }, nearby: 'water', difficulty: 0.5, need: 'food', skill: 'hunting', minSkill: 0.08, wow: 'First Catch', desc: 'The water is full of food for those who learn to take it.' },
    woodworking: { name: 'Woodworking', era: 'primitive', prereq: ['stone_knapping'], items: { wood: 4 }, difficulty: 0.55, skill: 'crafting', minSkill: 0.3, desc: 'Shaping wood with stone tools.' },
    hut_construction: { name: 'Hut Building', era: 'primitive', prereq: ['shelter_building', 'woodworking', 'fiber_twisting'], items: { wood: 6, fiber: 2 }, difficulty: 0.65, need: 'warmth', skill: 'building', minSkill: 0.35, buildings: ['hut'], wow: 'First Hut', desc: 'A real home: walls, roof, a place to keep things.' },
    digging: { name: 'Digging', era: 'primitive', prereq: ['stone_knapping'], items: { stone: 1, wood: 1 }, difficulty: 0.5, skill: 'gathering', minSkill: 0.35, desc: 'What lies under the ground can be reached.' },
    pottery: { name: 'Pottery', era: 'primitive', prereq: ['fire_making', 'clay_awareness'], items: { clay: 4 }, nearby: 'fire', difficulty: 0.7, skill: 'crafting', minSkill: 0.4, accidents: [{ during: 'rest:fire', chance: 0.01, items: { clay: 1 } }], recipes: ['pot'], wow: 'First Pottery', desc: 'Clay hardened in fire holds water and grain.' },
    food_drying: { name: 'Food Preservation', era: 'primitive', prereq: ['fire_making'], itemsAny: [{ meat_raw: 2 }, { fish_raw: 2 }, { berries: 4 }], difficulty: 0.6, need: 'food', skill: 'crafting', minSkill: 0.3, recipes: ['dried_food'], buildings: ['storage_pit'], wow: 'First Food Store', desc: 'Dried food survives the winter.' },
    hide_working: { name: 'Hide Working', era: 'primitive', prereq: ['stone_knapping'], items: { hide: 2 }, difficulty: 0.55, need: 'warmth', skill: 'crafting', minSkill: 0.3, recipes: ['clothes'], wow: 'First Clothing', desc: 'Animal skins become warm clothing.' },
    seed_planting: { name: 'Agriculture', era: 'neolithic', prereq: ['foraging_lore', 'digging'], items: { roots: 2, berries: 2 }, difficulty: 0.85, need: 'food', skill: 'foraging', minSkill: 0.55, buildings: ['farm_plot'], wow: 'First Farm', desc: 'Seeds put in the ground come back as food.' },
    herbal_medicine: { name: 'Herbal Medicine', era: 'primitive', prereq: ['foraging_lore'], items: { fiber: 2, berries: 2 }, difficulty: 0.7, skill: 'foraging', minSkill: 0.35, wow: 'First Healer', desc: 'Some plants close wounds and calm fevers.' },
    stone_masonry: { name: 'Stone Masonry', era: 'neolithic', prereq: ['hut_construction', 'digging'], items: { stone: 8, clay: 2 }, difficulty: 0.85, skill: 'building', minSkill: 0.6, buildings: ['stone_house'], wow: 'First Stone House', desc: 'Stones fitted and bound with clay stand for generations.' },"""),
("""    shelter_building: { name: 'Shelter Building', era: 'primitive', prereq: [], items: { wood: 4, fiber: 2 }, difficulty: 0.4, need: 'warmth', skill: 'building', buildings: ['lean_to'], wow: 'First Shelter', desc: 'Branches leaned together keep out rain and wind.' },""",
 """    shelter_building: { name: 'Shelter Building', era: 'primitive', prereq: [], items: { wood: 4, fiber: 2 }, difficulty: 0.45, need: 'warmth', skill: 'building', buildings: ['lean_to'], wow: 'First Shelter', desc: 'Branches leaned together keep out rain and wind.' },"""),
("""    eligible(world, a) {
      const out = [];
      for (const id in D) {
        const d = D[id]; if (d.hidden || a.knowledge.techs.has(id)) continue;
        if (d.prereq && !d.prereq.every((p) => a.knowledge.techs.has(p))) continue;
        out.push(id);
      }
      return out;
    },""",
 """    eligible(world, a) {
      const out = [];
      for (const id in D) {
        const d = D[id]; if (d.hidden || a.knowledge.techs.has(id)) continue;
        if (d.prereq && !d.prereq.every((p) => a.knowledge.techs.has(p))) continue;
        if (d.minSkill && (a.skills[d.skill] || 0) + (a.knowledge.progress[id] || 0) * 0.3 < d.minSkill) continue; // experience must come first
        out.push(id);
      }
      return out;
    },"""),
]),
('src/core/config.js', [
("""    tech: { experimentBase: 0.12, accidentMultiplier: 1.0, hintProgress: 0.15, forgetPerYearElder: 0.02 },""",
 """    tech: { experimentBase: 0.07, accidentMultiplier: 1.0, hintProgress: 0.12, forgetPerYearElder: 0.02 },"""),
]),
('src/agents/agent.js', [
("""    practice(a, skill, n = 1) { a.skills[skill] = Math.min(1, (a.skills[skill] || 0) + 0.004 * n * (1 - (a.skills[skill] || 0))); },""",
 """    practice(a, skill, n = 1) { a.skills[skill] = Math.min(1, (a.skills[skill] || 0) + 0.0025 * n * (1 - (a.skills[skill] || 0))); },"""),
]),
]
