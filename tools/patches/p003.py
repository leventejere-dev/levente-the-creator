PATCHES = [
('src/tech/discoveries.js', [
("""    fire_making: { name: 'Fire Making', era: 'primitive', prereq: ['fire_awareness'], items: { wood: 3 }, difficulty: 0.55, need: 'warmth', skill: 'crafting', accidents: [{ during: 'craft:handaxe', chance: 0.03, needs: ['fire_awareness'] }], buildings: ['campfire'], wow: 'First Fire', desc: 'Fire can be made, not only found.' },""",
 """    fire_making: { name: 'Fire Making', era: 'primitive', prereq: [], items: { wood: 3 }, difficulty: 0.72, boosts: { fire_awareness: 0.25, stone_knapping: 0.1 }, need: 'warmth', skill: 'crafting', accidents: [{ during: 'craft:handaxe', chance: 0.03 }, { during: 'gather:stone', chance: 0.004 }], buildings: ['campfire'], wow: 'First Fire', desc: 'Fire can be made, not only found.' },"""),
("""      const prog = a.knowledge.progress[d.id] || 0;
      return LW.clamp01(cfg.experimentBase * (1 - d.difficulty) * (0.5 + p.intelligence) * (0.5 + p.creativity) * (1 + 0.6 * skill) * (1 + need) * (1 + 1.5 * prog));""",
 """      const prog = a.knowledge.progress[d.id] || 0;
      let difficulty = d.difficulty; if (d.boosts) for (const k in d.boosts) if (a.knowledge.techs.has(k)) difficulty -= d.boosts[k];
      return LW.clamp01(cfg.experimentBase * (1 - Math.max(0.05, difficulty)) * (0.5 + p.intelligence) * (0.5 + p.creativity) * (1 + 0.6 * skill) * (1 + need) * (1 + 1.5 * prog));"""),
]),
('src/agents/perception.js', [
("""      // fire buildings & landmarks nearby
      for (const bld of world.buildingsNear(cx, cy, R)) {""",
 """      // smoke from a wildfire is visible from far away
      if (world.burning.size && !sawFire) { for (const fi of world.burning) { if (t.fire[fi] > 80 && Math.abs(world.xOf(fi) - cx) <= 24 && Math.abs(world.yOf(fi) - cy) <= 24) { sawFire = true; break; } } }
      // fire buildings & landmarks nearby
      for (const bld of world.buildingsNear(cx, cy, R)) {"""),
]),
('src/world/weather.js', [
("""      if (tick % LW.TIME.TICKS_PER_HOUR === 0) this._hourly();""",
 """      if (tick % (LW.TIME.TICKS_PER_HOUR * 3) === 0) this._hourly();"""),
("""        if (k === this.state) wgt *= 2.5; // weather is sticky""",
 """        if (k === this.state) wgt *= 3; // weather is sticky"""),
("""      if (t.trees[best] >= w.cfg.weather.wildfireIgnitionTreeMin && t.moist[best] < 150 && rng.chance(0.3)) LW.Ecology.ignite(w, best, 'lightning');""",
 """      if (t.trees[best] >= w.cfg.weather.wildfireIgnitionTreeMin && t.moist[best] < 200 && rng.chance(0.5)) LW.Ecology.ignite(w, best, 'lightning');"""),
]),
('src/core/config.js', [
("""    weather: { stormLightningPerTick: 0.02, wildfireIgnitionTreeMin: 60, overrideDefaultHours: 6 },""",
 """    weather: { stormLightningPerTick: 0.02, wildfireIgnitionTreeMin: 40, overrideDefaultHours: 6 },"""),
]),
('src/agents/brain.js', [
("""      applicable: (c, a) => (c.adult || c.stage === 'adolescent') && N(a).food > 0.3 && N(a).water > 0.3 && N(a).energy > 0.25 && N(a).warmth > 0.35,""",
 """      applicable: (c, a) => (c.adult || c.stage === 'adolescent') && N(a).food > 0.25 && N(a).water > 0.25 && N(a).energy > 0.2 && N(a).warmth > 0.12,"""),
]),
]
