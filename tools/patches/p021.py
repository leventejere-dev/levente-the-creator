PATCHES = [
('src/agents/agent.js', [
("""      for (let k = 0; k < 120; k++) { const i = rng.int(0, world.w * world.h - 1); if (!world.isPassable(i) || world.isWater(i) || world.tiles.biome[i] === LW.BIOME.MOUNTAIN) continue; const x = world.xOf(i), y = world.yOf(i); let dmin = 1e9; for (const o of people) dmin = Math.min(dmin, LW.dist(x, y, o.x, o.y)); if (dmin > best) { best = dmin; ti = i; } }
      if (ti < 0 || best < 12) return;""",
 """      const B = LW.BIOME; const t = world.tiles;
      for (let k = 0; k < 200; k++) { const i = rng.int(0, world.w * world.h - 1); const b = t.biome[i]; if (!(b === B.GRASSLAND || b === B.FOREST || b === B.SAVANNA || b === B.DENSE_FOREST) || t.veg[i] < 40) continue; const x = world.xOf(i), y = world.yOf(i); let dmin = 1e9; for (const o of people) dmin = Math.min(dmin, LW.dist(x, y, o.x, o.y)); const score = Math.min(dmin, 40) - Math.abs(t.baseTemp[i] - 15); if (score > best) { best = score; ti = i; } }
      if (ti < 0 || best < 10) return;"""),
("""      a.inv.berries = 4; a.achievements.push('Came from beyond');""",
 """      a.inv.berries = 4; a.achievements.push('Came from beyond'); a.skills.gathering = 0.2; a.skills.foraging = 0.2;
      LW.Perception.scan(world, a);"""),
]),
('src/agents/social.js', [
("""      // rumors & stories
      if (world.rng.chance(0.5)) { const m = M().pickToTell(world, a); if (m) M().tell(world, a, t, m); }""",
 """      // where things are: people tell each other about places
      for (const [x, y] of [[a, t], [t, a]]) { const pl = [...x.knowledge.places.values()]; for (let k = 0; k < 3 && pl.length; k++) { const p = world.rng.pick(pl); if (p.k !== 'fire') A().rememberPlace(world, y, p.k, p.i, p.q); } }
      // rumors & stories
      if (world.rng.chance(0.5)) { const m = M().pickToTell(world, a); if (m) M().tell(world, a, t, m); }"""),
]),
('src/sim/macro.js', [
("""      const home = a.home != null ? w.buildings.get(a.home) : null;
      if (home) { a.x = home.x + 0.5; a.y = home.y + 0.5; }""",
 """      const home = a.home != null ? w.buildings.get(a.home) : null;
      if (home) { a.x = home.x + 0.5; a.y = home.y + 0.5; }
      else { // the homeless drift toward other people (a day's walk at most)
        let bestO = null, bd = 1e9; for (const o of w.agents.values()) { if (o === a || (o.home == null && !A().isAdult(w, o))) continue; const d = LW.dist(a.x, a.y, o.x, o.y); if (d < bd && d > 2) { bd = d; bestO = o; } }
        if (bestO && bd > 4) { const step = Math.min(bd - 3, 12); const nx = a.x + (bestO.x - a.x) / bd * step, ny = a.y + (bestO.y - a.y) / bd * step; const ti = w.randomNear(nx | 0, ny | 0, 1); a.x = w.xOf(ti) + 0.5; a.y = w.yOf(ti) + 0.5; }
      }"""),
]),
]
