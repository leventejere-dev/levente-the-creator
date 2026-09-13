PATCHES = [
('src/agents/agent.js', [
("""      for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (!world.inBounds(nx, ny)) continue; const j = world.idx(nx, ny); if (!world.isPassable(j)) continue; const d = LW.dist(a.x, a.y, nx + 0.5, ny + 0.5) + r * 0.5; if (d < bd) { bd = d; best = j; } }
      return best;""",
 """      for (let r = 1; r <= 2; r++) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (!world.inBounds(nx, ny)) continue; const j = world.idx(nx, ny); if (!world.isPassable(j)) continue; const d = LW.dist(a.x, a.y, nx + 0.5, ny + 0.5); if (d < bd) { bd = d; best = j; } } if (best != null) return best; }
      return best;"""),
]),
('src/agents/actions.js', [
("""    drink(world, a, st) { if (st.i != null && !near(world, a, st.i, 2.0)) return FAIL;""",
 """    drink(world, a, st) { if (st.i != null && !near(world, a, st.i, 3.0)) return FAIL;"""),
("""      if (!near(world, a, st.i, 2.2)) return FAIL; const t = world.tiles; st.t = (st.t || 0) + 1; st.got = st.got || 0;
      const p = 0.35""",
 """      if (!near(world, a, st.i, 3.0)) return FAIL; const t = world.tiles; st.t = (st.t || 0) + 1; st.got = st.got || 0;
      const p = 0.35"""),
]),
]
