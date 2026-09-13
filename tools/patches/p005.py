PATCHES = [
('src/core/config.js', [
("""      needDrainPerDay: { food: 1.0, water: 1.0, energy: 1.5, social: 0.35, affection: 0.12, curiosity: 0.2 },""",
 """      needDrainPerDay: { food: 0.75, water: 0.8, energy: 1.2, social: 0.35, affection: 0.12, curiosity: 0.2 },"""),
("""      baseSpeed: 1.0, // tiles per tick""",
 """      baseSpeed: 2.0, // tiles per tick (a tile is ~25 m; 2 tiles per 15-minute tick is a slow forager's pace)"""),
]),
('src/agents/actions.js', [
("""      if (item === 'berries') { field = 'veg'; cost = 6; rate = (0.5 + sk) * lore * (a.inv.basket ? 1.3 : 1); }
      else if (item === 'roots') { field = 'veg'; cost = 10; rate = (0.35 + sk * 0.8) * lore * (a.knowledge.techs.has('digging') ? 1.5 : 1); }
      else if (item === 'fiber') { field = t.veg[i] >= 10 ? 'veg' : 'trees'; cost = 2; rate = 0.6 + sk * 0.6; }
      else if (item === 'wood') { field = 'trees'; cost = 6; rate = (0.3 + sk * 0.4) * (a.inv.handaxe ? 2.2 : 1) * (a.knowledge.techs.has('woodworking') ? 1.3 : 1); }
      else if (item === 'stone') { field = 'stone'; cost = 5; rate = 0.4 + sk * 0.4; }""",
 """      if (item === 'berries') { field = 'veg'; cost = 6; rate = (0.9 + sk) * lore * (a.inv.basket ? 1.3 : 1); }
      else if (item === 'roots') { field = 'veg'; cost = 10; rate = (0.6 + sk * 0.8) * lore * (a.knowledge.techs.has('digging') ? 1.5 : 1); }
      else if (item === 'fiber') { field = t.veg[i] >= 10 ? 'veg' : 'trees'; cost = 2; rate = 0.8 + sk * 0.6; }
      else if (item === 'wood') { field = 'trees'; cost = 6; rate = (0.45 + sk * 0.4) * (a.inv.handaxe ? 2.2 : 1) * (a.knowledge.techs.has('woodworking') ? 1.3 : 1); }
      else if (item === 'stone') { field = 'stone'; cost = 5; rate = 0.5 + sk * 0.4; }"""),
("""      const p = 0.2 * (0.5 + a.skills.hunting) * (t.fish[st.i] / 255) * (a.inv.spear ? 1.3 : 1) * (a.inv.basket ? 1.2 : 1);""",
 """      const p = 0.35 * (0.5 + a.skills.hunting) * (0.3 + t.fish[st.i] / 255) * (a.inv.spear ? 1.3 : 1) * (a.inv.basket ? 1.2 : 1);"""),
("""      const p = 0.1 * (0.5 + a.skills.hunting) * (a.inv.spear ? 1.5 : 0.4) * (t.animals[st.i] / 255) * (LW.Time.isNight(world.tick) ? 0.5 : 1);""",
 """      const p = 0.12 * (0.5 + a.skills.hunting) * (a.inv.spear ? 1.5 : 0.4) * (0.2 + t.animals[st.i] / 255) * (LW.Time.isNight(world.tick) ? 0.5 : 1);"""),
]),
('src/agents/brain.js', [
("""        if (!urgent && cand[0].s < curScore * 1.25 + 0.1 && (world.tick - current.startedTick) < 300) { current.score = curScore; return current; }""",
 """        if (!urgent && cand[0].s < curScore * 1.4 + 0.15 && (world.tick - current.startedTick) < 300) { current.score = curScore; return current; }"""),
("""      if (a.sleeping) return a.danger > 0.4 || a.needs.food < 0.12 || a.needs.water < 0.18 || a.needs.warmth < 0.12;""",
 """      if (a.sleeping) return a.danger > 0.4 || a.needs.food < 0.06 || a.needs.water < 0.08 || a.needs.warmth < 0.1;"""),
]),
]
