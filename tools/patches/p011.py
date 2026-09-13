PATCHES = [
('src/world/generate.js', [
("""      const temp = t.baseTemp[i]; if (temp < 12 || temp > 19) continue;""",
 """      const temp = t.baseTemp[i]; if (temp < 13 || temp > 19.5) continue;"""),
("""    const climateMean = rng.range(12, 17); // °C annual mean at sea level, mid-map""",
 """    const climateMean = rng.range(13.5, 18); // °C annual mean at sea level, mid-map (temperate-warm: the first ones must survive their first winters)"""),
]),
('src/agents/agent.js', [
("""        skills: Object.fromEntries(LW.SKILLS.map((s) => [s, 0.05])),""",
 """        skills: Object.fromEntries(LW.SKILLS.map((s) => [s, 0.1])),"""),
]),
('src/agents/actions.js', [
("""        A().practice(a, item === 'fiber' || item === 'clay' ? 'crafting' : 'gathering', 1);""",
 """        A().practice(a, item === 'fiber' || item === 'clay' ? 'crafting' : 'gathering', 1); if (item === 'berries' || item === 'roots') A().practice(a, 'foraging', 0.6);"""),
]),
('src/tech/discoveries.js', [
("""    fishing: { name: 'Fishing', era: 'primitive', prereq: [], items: { wood: 1, fiber: 1 }, nearby: 'water', difficulty: 0.5, need: 'food', skill: 'hunting', minSkill: 0.08,""",
 """    fishing: { name: 'Fishing', era: 'primitive', prereq: [], items: { wood: 1, fiber: 1 }, nearby: 'water', difficulty: 0.5, need: 'food', skill: 'hunting', minSkill: 0.05,"""),
]),
]
