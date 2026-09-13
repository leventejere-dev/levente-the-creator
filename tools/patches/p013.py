PATCHES = [
('src/agents/actions.js', [
("""    pickup(world, a, st) { if (!world.ground || !near(world, a, st.i, 1.8)) return FAIL; const g = world.ground.get(st.i); if (!g) return DONE; for (const k of Object.keys(g)) { const add = A().addItem(world, a, k, g[k]); g[k] -= add; if (g[k] <= 0) delete g[k]; } if (!Object.keys(g).length) world.ground.delete(st.i); return DONE; },""",
 """    pickup(world, a, st) {
      if (!world.ground || !near(world, a, st.i, 1.8)) return FAIL; const g = world.ground.get(st.i); if (!g) return DONE;
      for (const k of Object.keys(g)) {
        const d = LW.ITEMS[k] || { weight: 1 };
        // hungry: eat straight from the pile
        if (d.food && a.needs.food < 0.7) { while (g[k] > 0 && a.needs.food < 0.95) { g[k]--; a.needs.food = Math.min(1, a.needs.food + d.food); if (d.water) a.needs.water = Math.min(1, a.needs.water + d.water); a.lastMeal = world.tick; } if (g[k] <= 0) { delete g[k]; continue; } }
        let add = A().addItem(world, a, k, g[k]); if (add === 0 && d.food && A().makeRoom(world, a, d.weight)) add = A().addItem(world, a, k, g[k]);
        g[k] -= add; if (g[k] <= 0) delete g[k];
      }
      if (!Object.keys(g).length) world.ground.delete(st.i); return DONE;
    },"""),
]),
('src/agents/agent.js', [
("""      const order = ['stone', 'clay', 'wood', 'fiber', 'ore_copper', 'ore_tin', 'ore_iron', 'coal', 'salt', 'gems', 'gold_nugget', 'hide'];""",
 """      const order = ['stone', 'clay', 'hide', 'wood', 'fiber', 'ore_copper', 'ore_tin', 'ore_iron', 'coal', 'salt', 'gems', 'gold_nugget'];"""),
]),
('src/agents/brain.js', [
# failure streaks penalise a goal that keeps failing (anti death-spiral)
("""      for (const id in GOALS) {
        const g = GOALS[id];
        try { if (!g.applicable(ctx, a)) continue; } catch (e) { continue; }
        let [s, factors] = g.score(ctx, a); if (!(s > 0)) continue;
        s += world.rng.gauss(0, sigma);
        cand.push({ id, s, factors });
      }""",
 """      const fs = a.failStreak; if (a.plan && a.plan.failed) { if (fs && fs.goal === a.plan.goal && world.tick - fs.tick < 48) { fs.count++; fs.tick = world.tick; } else a.failStreak = { goal: a.plan.goal, count: 1, tick: world.tick }; }
      for (const id in GOALS) {
        const g = GOALS[id];
        try { if (!g.applicable(ctx, a)) continue; } catch (e) { continue; }
        let [s, factors] = g.score(ctx, a); if (!(s > 0)) continue;
        if (a.failStreak && a.failStreak.goal === id && a.failStreak.count >= 3 && world.tick - a.failStreak.tick < 32) { s *= 0.3; factors = [...factors, `keeps failing (×${a.failStreak.count})`]; }
        s += world.rng.gauss(0, sigma);
        cand.push({ id, s, factors });
      }"""),
]),
('src/world/generate.js', [
("""    // ---- 8. genesis site
    let best = -1, bestScore = -1;
    for (let y = 8; y < h - 8; y++) for (let x = 8; x < w - 8; x++) {
      const i = idx(x, y), b = t.biome[i];
      if (!(b === B.GRASSLAND || b === B.FOREST || b === B.SAVANNA)) continue;
      const temp = t.baseTemp[i]; if (temp < 13 || temp > 19.5) continue;""",
 """    // ---- 8. genesis site (progressively relaxed constraints)
    let best = -1, bestScore = -1;
    const PASSES = [[13, 19.5, true], [11, 22, true], [9, 24, false], [-99, 99, false]];
    for (const [tLo, tHi, strictBiome] of PASSES) { if (best >= 0) break;
    for (let y = 8; y < h - 8; y++) for (let x = 8; x < w - 8; x++) {
      const i = idx(x, y), b = t.biome[i];
      if (strictBiome ? !(b === B.GRASSLAND || b === B.FOREST || b === B.SAVANNA) : (isWater(b) || b === B.PEAK || b === B.MOUNTAIN)) continue;
      const temp = t.baseTemp[i]; if (temp < tLo || temp > tHi) continue;"""),
("""      const score = fresh * 3 + veg / 20000 + trees / 20000 + Math.min(stone, 3000) / 3000 - mount / 289 * 1.5 + rng.f() * 0.05;
      if (score > bestScore) { bestScore = score; best = i; }
    }""",
 """      const score = fresh * 3 + veg / 20000 + trees / 20000 + Math.min(stone, 3000) / 3000 - mount / 289 * 1.5 + rng.f() * 0.05;
      if (score > bestScore) { bestScore = score; best = i; }
    } }"""),
]),
]
