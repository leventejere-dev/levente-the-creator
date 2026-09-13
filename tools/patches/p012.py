PATCHES = [
('src/agents/agent.js', [
("""      if (eff >= 10) a.needs.warmth = Math.min(1, a.needs.warmth + 1.5 * dt * (1 + (eff - 10) / 10));
      else a.needs.warmth = Math.max(0, a.needs.warmth - ((10 - eff) / 40) * dt);""",
 """      if (eff >= 8) a.needs.warmth = Math.min(1, a.needs.warmth + 1.5 * dt * (1 + (eff - 8) / 10));
      else a.needs.warmth = Math.max(0, a.needs.warmth - ((8 - eff) / 50) * dt);"""),
]),
('src/buildings/buildings.js', [
("""    lean_to:     { label: 'Lean-to', cost: { wood: 6, fiber: 2 }, ticks: 40, insulation: 8,""",
 """    lean_to:     { label: 'Lean-to', cost: { wood: 6, fiber: 2 }, ticks: 40, insulation: 9,"""),
]),
]
