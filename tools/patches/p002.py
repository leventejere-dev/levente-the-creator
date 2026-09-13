PATCHES = [
('src/world/world.js', [
("""      const seasonal = -Math.cos((f - 0.25) * Math.PI * 2 + Math.PI) * 11; // warmest ~ day 135 (mid summer)""",
 """      const seasonal = Math.cos((f - 0.375) * Math.PI * 2) * 10; // warmest mid-summer (day ~135), coldest mid-winter (day ~315)"""),
]),
('src/world/generate.js', [
("""      const temp = t.baseTemp[i]; if (temp < 8 || temp > 19) continue;""",
 """      const temp = t.baseTemp[i]; if (temp < 11 || temp > 18) continue;"""),
("""    const climateMean = rng.range(9, 16); // °C annual mean at sea level, mid-map""",
 """    const climateMean = rng.range(11, 16); // °C annual mean at sea level, mid-map"""),
]),
('src/sim/simulation.js', [
("""      const world = LW.World.create(seed, cfg);
      world.meta = {""",
 """      const world = LW.World.create(seed, cfg);
      world.tick = T.TICKS_PER_DAY * 100; // Genesis happens in early summer: the first ones get a warm season to learn
      world.meta = {"""),
("""      const group = w.agentsNear(a.x, a.y, 2, a.id).length;
      if (w.rng.chance((d / 255) * 0.0012 / (1 + group))) {""",
 """      const group = w.agentsNear(a.x, a.y, 3, a.id).length; if (group >= 2 || w.buildingsNear(a.x | 0, a.y | 0, 3).length) return;
      if (w.rng.chance((d / 255) * 0.0004 / (1 + group))) {"""),
]),
('src/world/weather.js', [
("""        if (k === 'fog' && season !== 2 && season !== 0) wgt *= 0.5;
        weights.push(Math.max(0.01, wgt));""",
 """        if (k === 'fog' && season !== 2 && season !== 0) wgt *= 0.5;
        if (k === this.state) wgt *= 2.5; // weather is sticky
        weights.push(Math.max(0.01, wgt));"""),
]),
('src/core/config.js', [
("""    berries:     { food: 0.22, water: 0.05, spoilDays: 4,  weight: 0.5, label: 'Berries' },
    roots:       { food: 0.28, spoilDays: 8,  weight: 0.7, label: 'Roots' },""",
 """    berries:     { food: 0.30, water: 0.05, spoilDays: 4,  weight: 0.5, label: 'Berries' },
    roots:       { food: 0.35, spoilDays: 8,  weight: 0.7, label: 'Roots' },"""),
("""    ecology: { vegRegrowth: 0.06, treeRegrowth: 0.004, animalRegrowth: 0.03, fishRegrowth: 0.05, fireSpread: 0.05 },""",
 """    ecology: { vegRegrowth: 0.08, treeRegrowth: 0.004, animalRegrowth: 0.03, fishRegrowth: 0.06, fireSpread: 0.05 },"""),
]),
('src/agents/actions.js', [
("""      if (item === 'berries') { field = 'veg'; cost = 8; rate = (0.5 + sk) * lore * (a.inv.basket ? 1.3 : 1); }""",
 """      if (item === 'berries') { field = 'veg'; cost = 6; rate = (0.5 + sk) * lore * (a.inv.basket ? 1.3 : 1); }"""),
("""      const p = 0.08 * (0.5 + a.skills.hunting) * (a.inv.spear ? 1.5 : 0.35) * (t.animals[st.i] / 255) * (LW.Time.isNight(world.tick) ? 0.5 : 1);""",
 """      const p = 0.1 * (0.5 + a.skills.hunting) * (a.inv.spear ? 1.5 : 0.4) * (t.animals[st.i] / 255) * (LW.Time.isNight(world.tick) ? 0.5 : 1);"""),
("""      const p = 0.12 * (0.5 + a.skills.hunting) * (t.fish[st.i] / 255) * (a.inv.spear ? 1.3 : 1) * (a.inv.basket ? 1.2 : 1);""",
 """      const p = 0.2 * (0.5 + a.skills.hunting) * (t.fish[st.i] / 255) * (a.inv.spear ? 1.3 : 1) * (a.inv.basket ? 1.2 : 1);"""),
]),
('src/agents/brain.js', [
# sleep vs starvation
("""      score: (c, a) => { let s = u(N(a).energy) * 1.3 * (c.night ? 1.7 : 0.5) + (N(a).energy < 0.1 ? 1.5 : 0); if (c.night && N(a).energy < 0.6) s += 0.4; if (E(a).grief > 0.3) s += 0.2; return [s, [`tired ${LW.pct(1 - N(a).energy)}`, c.night ? 'night' : 'day']]; },""",
 """      score: (c, a) => { let s = u(N(a).energy) * 1.3 * (c.night ? 1.7 : 0.5) + (N(a).energy < 0.1 ? 1.5 : 0); if (c.night && N(a).energy < 0.6) s += 0.4; if (E(a).grief > 0.3) s += 0.2; const f = [`tired ${LW.pct(1 - N(a).energy)}`, c.night ? 'night' : 'day']; if (N(a).food < 0.12 && (c.foodInv || c.food || c.storeFood > 0)) { s *= 0.4; f.push('too hungry to sleep'); } if (N(a).water < 0.12 && c.water) { s *= 0.3; f.push('too thirsty to sleep'); } return [s, f]; },"""),
("""      score: (c, a) => { let s = u(N(a).food) * 1.6; const f = []; f.push(`hunger ${LW.pct(1 - N(a).food)}`); if (c.foodInv) { s += N(a).food < 0.5 ? 0.5 : 0.2; f.push('has food'); } else if (c.storeFood > 0 && c.home) { s += 0.3; f.push('food at home'); } else if (!c.food && !(a.inv.spear && c.animals) && !(c.fish && a.knowledge.techs.has('fishing'))) { s *= 0.3; f.push('knows no food source'); } return [s, f]; },""",
 """      score: (c, a) => { let s = u(N(a).food) * 1.6 + (N(a).food < 0.1 ? 0.8 : 0); const f = []; f.push(`hunger ${LW.pct(1 - N(a).food)}`); if (c.foodInv) { s += N(a).food < 0.5 ? 0.5 : 0.2; f.push('has food'); } else if (c.storeFood > 0 && c.home) { s += 0.3; f.push('food at home'); } else if (!c.food && !(a.inv.spear && c.animals) && !(c.fish && a.knowledge.techs.has('fishing'))) { s *= 0.3; f.push('knows no food source'); } return [s, f]; },"""),
# getWarm: always applicable when cold; fallback huddle / tree cover
("""      applicable: (c, a) => !c.infant && (N(a).warmth < 0.75 || (c.rain > 0.3 && !c.fx.inside) || c.storm) && (c.fire || c.shelter || a.knowledge.techs.has('fire_making')),""",
 """      applicable: (c, a) => !c.infant && (N(a).warmth < 0.75 || (c.rain > 0.3 && !c.fx.inside) || c.storm),"""),
("""        if (a.knowledge.techs.has('fire_making')) return GOALS.makeFire.plan(c, a);
        return opts.length ? { steps: opts[0].steps } : null;""",
 """        if (a.knowledge.techs.has('fire_making')) { const p = GOALS.makeFire.plan(c, a); if (p) return p; }
        if (opts.length) return { steps: opts[0].steps };
        // no fire, no shelter: huddle with others under the trees
        const others = c.nearby.filter((o) => !o.sleeping || true); let best = null, bd = 16; for (const o of others) { const d = LW.dist(a.x, a.y, o.x, o.y); if (d < bd && d > 1) { bd = d; best = o; } }
        const wood = A().nearestPoi(c.world, a, 'wood', 110, 10);
        const steps = [];
        if (best) steps.push({ op: 'moveTo', i: c.world.idx(best.x | 0, best.y | 0), near: 1 }); else if (wood) steps.push({ op: 'moveTo', i: wood.i, poi: { k: 'wood', i: wood.i } });
        steps.push({ op: 'wait', n: 8, at: 'huddling' }); return { steps };"""),
("""      score: (c, a) => { let s = P(a).curiosity * (1 - E(a).fear) * 0.55 + u(N(a).curiosity) * 0.45; const f = [`curiosity ${LW.pct(P(a).curiosity)}`]; if (!c.water) { s += 1.0; f.push('no water known'); } if (!c.food) { s += 0.8; f.push('no food known'); } if (a.knowledge.places.size < 20) { s += 0.3; f.push('knows little'); } if (c.night) s *= 0.25; if (N(a).food < 0.3 || N(a).water < 0.3) s *= (c.water && c.food) ? 0.3 : 1.2; return [s, f]; },""",
 """      score: (c, a) => { let s = P(a).curiosity * (1 - E(a).fear) * 0.55 + u(N(a).curiosity) * 0.45; const f = [`curiosity ${LW.pct(P(a).curiosity)}`]; if (!c.water) { s += 1.0; f.push('no water known'); } if (!c.food) { s += 0.8; f.push('no food known'); } else if (c.food.d > 10) { s += 0.4; f.push('food is far'); } if (a.knowledge.places.size < 20) { s += 0.3; f.push('knows little'); } if (c.night) s *= 0.25; if (N(a).warmth < 0.5) s *= 0.3; if (N(a).food < 0.3 || N(a).water < 0.3) s *= (c.water && c.food) ? 0.3 : 1.2; return [s, f]; },"""),
]),
]
