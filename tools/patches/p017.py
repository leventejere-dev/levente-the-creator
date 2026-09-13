PATCHES = [
('src/sim/macro.js', [
("""      const season = LW.Time.season(w.tick); const seasonFood = [1, 1.05, 0.9, 0.5][season];""",
 """      const season = LW.Time.season(w.tick); const seasonFood = [1, 1.05, 0.95, 0.8][season];"""),
("""        const foodQ = Math.min(1, [...a.knowledge.places.values()].filter((p) => p.k === 'food').reduce((s, p) => s + p.q, 0) / 500);
        const hunt = a.inv.spear && A().knownCount(a, 'animals') ? 0.35 : 0; const fish = a.knowledge.techs.has('fishing') && A().knownCount(a, 'fish') ? 0.3 : 0;
        intake = 0.3 + (0.55 + a.skills.gathering * 0.4) * seasonFood * Math.min(1.3, foodQ + hunt + fish) * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1);""",
 """        const foodQ = Math.min(1, [...a.knowledge.places.values()].filter((p) => p.k === 'food').reduce((s, p) => s + p.q, 0) / 400);
        const hunt = a.inv.spear && A().knownCount(a, 'animals') ? 0.4 : 0; const fish = a.knowledge.techs.has('fishing') && A().knownCount(a, 'fish') ? 0.35 : 0;
        intake = 0.55 + 0.5 * (0.6 + a.skills.gathering * 0.6) * seasonFood * foodQ * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1) + hunt + fish;"""),
("""      if (intake < 1) { a.health = Math.max(0, a.health - cfg.starvationHealthPerDay * (1 - intake) * 0.9); a.needs.food = Math.max(0.05, intake * 0.6); } else { a.needs.food = 0.7; a.health = Math.min(1 - a.injury, a.health + 0.1); }""",
 """      const deficit = Math.max(0, 0.9 - intake);
      if (deficit > 0) { a.health = Math.max(0, a.health - cfg.starvationHealthPerDay * deficit * 1.5); a.needs.food = Math.max(0.05, intake * 0.6); } else { a.needs.food = 0.7; a.health = Math.min(1 - a.injury, a.health + 0.1); }"""),
("""      const eff = temp + (home ? LW.Buildings.def(home).insulation || 0 : 0) + (fireNear ? 8 : 0) + (a.inv.clothes ? 8 : 0);""",
 """      const eff = temp + 2 + (home ? LW.Buildings.def(home).insulation || 0 : Math.min(3, hh.length)) + (fireNear ? 8 : 0) + (a.inv.clothes ? 8 : 0);"""),
("""      if (a.health <= 0) { A().die(w, a, intake < 1 ? 'starvation' : eff < 8 ? 'cold' : 'illness'); return; }""",
 """      if (a.health <= 0) { A().die(w, a, deficit > 0 ? 'starvation' : eff < 8 ? 'cold' : 'illness'); return; }"""),
]),
('src/ui/ui.js', [
("""cell('Technology', b.techLevel, a.techLevel, `${a.techs.length - b.techs.length} new discoveries`)""",
 """cell('Technology', b.techLevel, a.techLevel, `${Math.max(0, a.discoveries - b.discoveries)} new discoveries`)"""),
]),
]
