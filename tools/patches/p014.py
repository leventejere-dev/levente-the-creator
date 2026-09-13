PATCHES = [
('src/agents/agent.js', [
("""    practice(a, skill, n = 1) { a.skills[skill] = Math.min(1, (a.skills[skill] || 0) + 0.0025 * n * (1 - (a.skills[skill] || 0))); },""",
 """    practice(a, skill, n = 1) { a.skills[skill] = Math.min(1, (a.skills[skill] || 0) + 0.0007 * n * (1 - (a.skills[skill] || 0))); },"""),
("""      const blessed = (mother.fertilityBoostUntil > world.tick || father.fertilityBoostUntil > world.tick) ? 3 : 1;
      const p = world.cfg.agents.fertilityBase * blessed * mother.genes.physiology.fertility * father.genes.physiology.fertility * (mother.health > 0.5 ? 1 : 0.4) * (mother.needs.food > 0.3 ? 1 : 0.3) * (age > 38 ? 0.4 : 1) * (mother.children.some((c) => { const ch = world.agents.get(c); return ch && LW.Time.ageYears(ch.bornTick, world.tick) < 1.5; }) ? 0.25 : 1);""",
 """      const blessed = (mother.fertilityBoostUntil > world.tick || father.fertilityBoostUntil > world.tick) ? 3 : 1;
      const p = world.cfg.agents.fertilityBase * blessed * mother.genes.physiology.fertility * father.genes.physiology.fertility * (mother.health > 0.5 ? 1 : 0.4) * (mother.needs.food > 0.3 ? 1 : 0.3) * (age > 38 ? 0.4 : 1) * (mother.children.some((c) => { const ch = world.agents.get(c); return ch && LW.Time.ageYears(ch.bornTick, world.tick) < 1.2; }) ? 0.35 : 1);"""),
]),
('src/core/config.js', [
("""      fertilityBase: 0.05,""", """      fertilityBase: 0.07,"""),
("""    tech: { experimentBase: 0.07, accidentMultiplier: 1.0, hintProgress: 0.12, forgetPerYearElder: 0.02 },""",
 """    tech: { experimentBase: 0.05, accidentMultiplier: 1.0, hintProgress: 0.12, forgetPerYearElder: 0.02 },"""),
]),
('src/tech/discoveries.js', [
("""    seed_planting: { name: 'Agriculture', era: 'neolithic', prereq: ['foraging_lore', 'digging'], items: { roots: 2, berries: 2 }, difficulty: 0.85, need: 'food', skill: 'foraging', minSkill: 0.55,""",
 """    seed_planting: { name: 'Agriculture', era: 'neolithic', prereq: ['foraging_lore', 'digging'], items: { roots: 2, berries: 2 }, difficulty: 0.92, need: 'food', skill: 'foraging', minSkill: 0.55,"""),
("""    stone_masonry: { name: 'Stone Masonry', era: 'neolithic', prereq: ['hut_construction', 'digging'], items: { stone: 8, clay: 2 }, difficulty: 0.85, skill: 'building', minSkill: 0.6,""",
 """    stone_masonry: { name: 'Stone Masonry', era: 'neolithic', prereq: ['hut_construction', 'digging'], items: { stone: 8, clay: 2 }, difficulty: 0.92, skill: 'building', minSkill: 0.6,"""),
("""    pottery: { name: 'Pottery', era: 'primitive', prereq: ['fire_making', 'clay_awareness'], items: { clay: 4 }, nearby: 'fire', difficulty: 0.7, skill: 'crafting', minSkill: 0.4,""",
 """    pottery: { name: 'Pottery', era: 'primitive', prereq: ['fire_making', 'clay_awareness'], items: { clay: 4 }, nearby: 'fire', difficulty: 0.8, skill: 'crafting', minSkill: 0.4,"""),
("""    hut_construction: { name: 'Hut Building', era: 'primitive', prereq: ['shelter_building', 'woodworking', 'fiber_twisting'], items: { wood: 6, fiber: 2 }, difficulty: 0.65, need: 'warmth', skill: 'building', minSkill: 0.35,""",
 """    hut_construction: { name: 'Hut Building', era: 'primitive', prereq: ['shelter_building', 'woodworking', 'fiber_twisting'], items: { wood: 6, fiber: 2 }, difficulty: 0.75, need: 'warmth', skill: 'building', minSkill: 0.35,"""),
]),
('src/sim/macro.js', [
("""      if (adult) { A().practice(a, 'gathering', 4);""",
 """      if (adult) { A().practice(a, 'gathering', 8); A().practice(a, 'foraging', 5); A().practice(a, 'crafting', 2); A().practice(a, 'building', home ? 1 : 2);"""),
]),
]
