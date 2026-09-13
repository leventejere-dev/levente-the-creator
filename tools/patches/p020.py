PATCHES = [
('src/agents/agent.js', [
("""      // arrive at a passable edge tile, then walk toward the people
      let ti = -1; for (let k = 0; k < 60 && ti < 0; k++) { const side = rng.int(0, 3); const x = side === 0 ? 1 : side === 1 ? world.w - 2 : rng.int(1, world.w - 2), y = side === 2 ? 1 : side === 3 ? world.h - 2 : rng.int(1, world.h - 2); const i = world.idx(x, y); if (world.isPassable(i) && !world.isWater(i)) ti = i; }
      if (ti < 0) return;""",
 """      // arrive somewhere far from everyone (over the hills, along the coast), then walk toward the people
      let ti = -1, best = -1; const people = [...world.agents.values()];
      for (let k = 0; k < 120; k++) { const i = rng.int(0, world.w * world.h - 1); if (!world.isPassable(i) || world.isWater(i) || world.tiles.biome[i] === LW.BIOME.MOUNTAIN) continue; const x = world.xOf(i), y = world.yOf(i); let dmin = 1e9; for (const o of people) dmin = Math.min(dmin, LW.dist(x, y, o.x, o.y)); if (dmin > best) { best = dmin; ti = i; } }
      if (ti < 0 || best < 12) return;"""),
("""      if (age > lon - 12 && rng.chance(0.0004 * Math.exp((age - lon) / 4))) { this.die(world, a, 'old age'); return; }""",
 """      if (age > lon - 10 && rng.chance(0.00025 * Math.exp((age - lon) / 5))) { this.die(world, a, 'old age'); return; }"""),
]),
('src/sim/macro.js', [
("""      const supported = A().caregivers(w, a).length > 0 || hh.some((o) => o !== a && A().isAdult(w, o));""",
 """      const supported = A().caregivers(w, a).length > 0 || hh.some((o) => o !== a && A().isAdult(w, o)) || (!adult && w.agentsNear(a.x, a.y, 14, a.id).some((o) => A().isAdult(w, o))); // orphans are taken in by the people around them"""),
]),
]
