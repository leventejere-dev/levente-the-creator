PATCHES = [
('src/world/world.js', [
("""      const seasonal = Math.cos((f - 0.375) * Math.PI * 2) * 10; // warmest mid-summer (day ~135), coldest mid-winter (day ~315)""",
 """      const seasonal = Math.cos((f - 0.375) * Math.PI * 2) * 8.5; // warmest mid-summer (day ~135), coldest mid-winter (day ~315)"""),
]),
('src/world/generate.js', [
("""      const temp = t.baseTemp[i]; if (temp < 11 || temp > 18) continue;""",
 """      const temp = t.baseTemp[i]; if (temp < 12 || temp > 19) continue;"""),
("""    const climateMean = rng.range(11, 16); // °C annual mean at sea level, mid-map""",
 """    const climateMean = rng.range(12, 17); // °C annual mean at sea level, mid-map"""),
]),
('src/buildings/buildings.js', [
("""    campfire:    { label: 'Campfire', cost: { wood: 3 }, ticks: 8, warmth: 14, light: 1, safety: 0.5, radius: 2, fuelTicks: TPD * 2, tech: 'fire_making', lifeDays: 60 },
    lean_to:     { label: 'Lean-to', cost: { wood: 6, fiber: 2 }, ticks: 40, insulation: 6, safety: 0.3, sleep: 0.5, capacity: 3, storage: 10, dwelling: true, tech: 'shelter_building', lifeDays: 150 },
    hut:         { label: 'Hut', cost: { wood: 14, fiber: 6, stone: 2 }, ticks: 160, insulation: 12, safety: 0.6, sleep: 0.8, capacity: 5, storage: 40, dwelling: true, tech: 'hut_construction', lifeDays: 1200, light: 0.4 },
    stone_house: { label: 'Stone house', cost: { stone: 24, wood: 10, clay: 6 }, ticks: 400, insulation: 16, safety: 0.85, sleep: 0.95, capacity: 6, storage: 80, dwelling: true, tech: 'stone_masonry', lifeDays: 6000, light: 0.6 },""",
 """    campfire:    { label: 'Campfire', cost: { wood: 3 }, ticks: 8, warmth: 14, light: 1, safety: 0.5, radius: 2, fuelTicks: TPD * 2, tech: 'fire_making', lifeDays: 120 },
    lean_to:     { label: 'Lean-to', cost: { wood: 6, fiber: 2 }, ticks: 40, insulation: 8, safety: 0.3, sleep: 0.5, capacity: 3, storage: 10, dwelling: true, tech: 'shelter_building', lifeDays: 420 },
    hut:         { label: 'Hut', cost: { wood: 14, fiber: 6, stone: 2 }, ticks: 160, insulation: 14, safety: 0.6, sleep: 0.8, capacity: 5, storage: 40, dwelling: true, tech: 'hut_construction', lifeDays: 2400, light: 0.4 },
    stone_house: { label: 'Stone house', cost: { stone: 24, wood: 10, clay: 6 }, ticks: 400, insulation: 18, safety: 0.85, sleep: 0.95, capacity: 6, storage: 80, dwelling: true, tech: 'stone_masonry', lifeDays: 9000, light: 0.6 },"""),
("""        if (def.dwelling && d <= 0.75 && (b.residents.includes(agent ? agent.id : -1) || b.residents.length < def.capacity)) { inside = b; warmth += def.insulation; safety = Math.max(safety, def.safety); }
      }
      return { warmth, light, safety, inside, fire };""",
 """        if (def.dwelling && d <= 0.75 && (b.residents.includes(agent ? agent.id : -1) || b.residents.length < def.capacity)) { inside = b; warmth += def.insulation; safety = Math.max(safety, def.safety); }
      }
      // a fire kept right by the dwelling heats it
      if (inside && !fire) { for (const b of world.buildingsNear(inside.x, inside.y, 3)) if (b.kind === 'campfire' && b.lit && b.progress >= 1 && LW.dist(b.x, b.y, inside.x, inside.y) <= 2.5) { warmth += 8; fire = b; light = Math.max(light, 0.5); break; } }
      return { warmth, light, safety, inside, fire };"""),
]),
('src/agents/agent.js', [
("""      if (eff >= 12) a.needs.warmth = Math.min(1, a.needs.warmth + 0.8 * dt * (1 + (eff - 12) / 10));
      else a.needs.warmth = Math.max(0, a.needs.warmth - ((12 - eff) / 30) * dt);""",
 """      if (eff >= 10) a.needs.warmth = Math.min(1, a.needs.warmth + 1.5 * dt * (1 + (eff - 10) / 10));
      else a.needs.warmth = Math.max(0, a.needs.warmth - ((10 - eff) / 40) * dt);"""),
]),
('src/agents/brain.js', [
# cold suppresses outdoor optional activities
("""      score: (c, a) => { const hh = c.household.length; const stock = c.foodUnits + c.storeFood; const target = 1.2 * hh + (c.season === 2 ? 1.5 * hh : c.season === 3 ? 1.0 * hh : 0); let s = gap * 0.75 * (0.5 + P(a).discipline) * (c.season === 2 ? 1.4 : c.season === 3 ? 1.1 : 1); if (A().load(a) > A().capacity(c.world, a) * 0.85) s *= 0.2; if (c.night) s *= 0.4; return [s, [`stock ${stock.toFixed(1)} / ${target.toFixed(1)}`, `discipline ${LW.pct(P(a).discipline)}`]]; },""",
 """      score: (c, a) => { const hh = c.household.length; const stock = c.foodUnits + c.storeFood; const target = 1.2 * hh + (c.season === 2 ? 1.5 * hh : c.season === 3 ? 1.0 * hh : 0); const gap = 1 - Math.min(1, stock / Math.max(1, target)); let s = gap * 0.75 * (0.5 + P(a).discipline) * (c.season === 2 ? 1.4 : c.season === 3 ? 1.1 : 1); if (A().load(a) > A().capacity(c.world, a) * 0.85) s *= 0.2; if (c.night) s *= 0.4; if (N(a).warmth < 0.35) s *= 0.3; return [s, [`stock ${stock.toFixed(1)} / ${target.toFixed(1)}`, `discipline ${LW.pct(P(a).discipline)}`]]; },"""),
("""        if (opts.length && opts[0].d < 25) return { steps: opts[0].steps };""",
 """        if (opts.length && opts[0].d < 25) { opts[0].steps[opts[0].steps.length - 1].n = N(a).warmth < 0.3 ? 24 : 12; return { steps: opts[0].steps }; }"""),
]),
]
