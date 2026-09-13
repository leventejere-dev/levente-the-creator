/* LEVENTE — THE CREATOR · agents/perception.js — agents only know what they have seen, heard or been told (spec §20) */
(function (LW) {
  'use strict';
  const B = LW.BIOME, DEP = LW.DEPOSIT;

  const Perception = {
    scan(world, a) {
      const t = world.tiles, A = LW.Agents; const cx = a.x | 0, cy = a.y | 0;
      let R = world.cfg.agents.perceptionRadius;
      const night = LW.Time.isNight(world.tick); const wx = world.weather.effectiveState();
      if (night && !(a.env && a.env.light > 0)) R = Math.max(2, Math.round(R * 0.5));
      if (wx.state === 'fog' || wx.state === 'storm') R = Math.max(2, Math.round(R * 0.7));
      if (t.biome[world.idx(cx, cy)] === B.HILLS) R = Math.round(R * 1.3);
      let sawFire = false, sawClay = false, foundDeposit = null;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x = cx + dx, y = cy + dy; if (!world.inBounds(x, y)) continue;
        if (dx * dx + dy * dy > R * R) continue;
        const i = world.idx(x, y), b = t.biome[i];
        if (LW.isFreshBiome(b)) { A.rememberPlace(world, a, 'water', i, 255); if (t.fish[i] >= 25) A.rememberPlace(world, a, 'fish', i, t.fish[i]); else A.forgetPlace(a, 'fish', i); continue; }
        if (b === B.OCEAN) { if (t.fish[i] >= 40) A.rememberPlace(world, a, 'fish', i, t.fish[i]); continue; }
        if (t.veg[i] >= 12) A.rememberPlace(world, a, 'food', i, t.veg[i]); else if (A.knowsPlace(a, 'food', i)) A.forgetPlace(a, 'food', i);
        if (t.trees[i] >= 15) A.rememberPlace(world, a, 'wood', i, t.trees[i]); else if (A.knowsPlace(a, 'wood', i)) A.forgetPlace(a, 'wood', i);
        if (t.stone[i] >= 20) { A.rememberPlace(world, a, 'stone', i, t.stone[i]); if (t.stone[i] >= 70 && (b === B.HILLS || b === B.MOUNTAIN || b === B.BEACH) && !t.depType[i]) A.rememberPlace(world, a, 'flint', i, t.stone[i] >> 1); }
        if (t.animals[i] >= 25) A.rememberPlace(world, a, 'animals', i, t.animals[i]); else if (A.knowsPlace(a, 'animals', i)) A.forgetPlace(a, 'animals', i);
        if (t.depType[i] && t.depKnown[i] >= 1) {
          const dt = t.depType[i];
          if (dt === DEP.FLINT) A.rememberPlace(world, a, 'flint', i, Math.min(255, t.depAmt[i]));
          else if (dt === DEP.CLAY) { A.rememberPlace(world, a, 'clay', i, Math.min(255, t.depAmt[i])); sawClay = true; }
          else { A.rememberPlace(world, a, 'deposit', i, dt); if (!a.knowledge.techs.has('ore_lore_' + LW.DEPOSIT_NAME[dt]) && ['copper', 'tin', 'iron', 'coal', 'gold'].includes(LW.DEPOSIT_NAME[dt]) && Math.abs(dx) <= 1 && Math.abs(dy) <= 1) foundDeposit = { i, dt }; }
        }
        if (b === B.MARSH && Math.abs(dx) <= 2 && Math.abs(dy) <= 2) { A.rememberPlace(world, a, 'clay', i, 80); sawClay = true; }
        if (t.fire[i]) { sawFire = true; A.rememberPlace(world, a, 'fire', i, t.fire[i]); }
      }
      // smoke from a wildfire is visible from far away
      if (world.burning.size && !sawFire) { for (const fi of world.burning) { if (t.fire[fi] > 80 && Math.abs(world.xOf(fi) - cx) <= 24 && Math.abs(world.yOf(fi) - cy) <= 24) { sawFire = true; break; } } }
      // fire buildings & landmarks nearby
      for (const bld of world.buildingsNear(cx, cy, R)) {
        if (bld.kind === 'campfire' && bld.lit) sawFire = true;
        const def = LW.Buildings.def(bld);
        if (def.divine && !a.memory.episodic.some((m) => m.buildingId === bld.id)) LW.God.witnessManifestation(world, a, bld);
      }
      if (sawFire) { if (LW.Tech.observe(world, a, 'fire')) { A.memory(world, a, { type: 'phenomenon', text: 'először láttam tüzet', importance: 0.85, emotion: 'fear', intensity: 0.7 }); a.emotions.fear = Math.min(1, a.emotions.fear + 0.3); a.emotions.excitement = Math.min(1, a.emotions.excitement + 0.5); } }
      if (sawClay) LW.Tech.observe(world, a, 'clay');
      if (foundDeposit && a.knowledge.techs.has('digging')) { LW.Tech.learn(world, a, 'ore_lore_' + LW.DEPOSIT_NAME[foundDeposit.dt], 'observation'); world.events.emit('ResourceFound', { tick: world.tick, agentId: a.id, tile: foundDeposit.i, deposit: LW.DEPOSIT_NAME[foundDeposit.dt], first: !world.firsts || !world.firsts['deposit:' + LW.DEPOSIT_NAME[foundDeposit.dt]] }); A.memory(world, a, { type: 'find', text: `találtam: ${LW.ITEMS[LW.DEPOSIT_ITEM[foundDeposit.dt]].label.toLowerCase()}`, importance: 0.6, emotion: 'excitement', intensity: 0.5 }); }
      // other people
      a.threat = null;
      const others = world.agentsNear(a.x, a.y, R, a.id);
      for (const o of others) {
        const r = LW.Relationships.ensure(world, a, o); const s = LW.Memory.social(a, o.id); s.lastSeen = world.tick; s.lastTile = world.idx(o.x | 0, o.y | 0);
        if (r.familiarity < 1) r.familiarity = Math.min(1, r.familiarity + 0.002);
        // learning by watching (children especially)
        if (o.plan && o.plan.tag && LW.dist(a.x, a.y, o.x, o.y) <= 3) this.observePractice(world, a, o, o.plan.tag);
        // jealousy: partner flirting with someone else
        if (a.partner === o.id && o.plan && o.plan.goal === 'flirt' && o.plan.target !== a.id) { const rival = world.agents.get(o.plan.target); if (rival) { r.jealousy = Math.min(1, r.jealousy + 0.25); r.resentment = Math.min(1, r.resentment + 0.1 * (1 - a.personality.patience)); const rr = LW.Relationships.ensure(world, a, rival); rr.resentment = Math.min(1, rr.resentment + 0.15); a.emotions.jealousy = Math.min(1, a.emotions.jealousy + 0.4); a.emotions.anger = Math.min(1, a.emotions.anger + 0.2 * a.personality.aggression); A.memory(world, a, { type: 'jealousy', text: `láttam, ahogy ${o.name} flörtöl vele: ${rival.name}`, importance: 0.6, emotion: 'jealousy', intensity: 0.6, subjects: [o.id, rival.id] }); } }
        if (r.fear > 0.5 || (o.emotions.anger > 0.7 && (o.relationships.get(a.id)?.resentment || 0) > 0.5)) a.threat = o.id;
      }
    },
    observePractice(world, a, o, tag) {
      const kind = tag.split(':')[0];
      const skill = { gather: 'gathering', hunt: 'hunting', fish: 'hunting', craft: 'crafting', build: 'building', dig: 'gathering', experiment: 'crafting', farm: 'farming' }[kind];
      if (skill && world.rng.chance(0.15)) LW.Agents.practice(a, skill, 0.5);
      // watching a demonstration of a technology the watcher doesn't know
      const tech = o.plan.tech || (kind === 'craft' && LW.Tech.RECIPES[tag.split(':')[1]] && LW.Tech.RECIPES[tag.split(':')[1]].tech) || (kind === 'build' && LW.Buildings.DEFS[o.plan.kind] && LW.Buildings.DEFS[o.plan.kind].tech);
      if (tech && !a.knowledge.techs.has(tech) && !LW.Tech.D[tech].hidden) {
        const prereqOk = !LW.Tech.D[tech].prereq || LW.Tech.D[tech].prereq.every((p) => a.knowledge.techs.has(p));
        if (o.knowledge.techs.has(tech)) { // a real demonstration by someone who knows
          const gain = 0.05 * (0.5 + a.personality.intelligence) * (LW.Agents.isChild(world, a) ? 1.5 : 1);
          a.knowledge.progress[tech] = (a.knowledge.progress[tech] || 0) + gain;
          if (a.knowledge.progress[tech] >= 1 && prereqOk) LW.Tech.learn(world, a, tech, 'observed_practice', o);
        } else { // watching someone *try* only plants the idea
          a.knowledge.progress[tech] = Math.min(0.5, (a.knowledge.progress[tech] || 0) + 0.01);
        }
      }
    },
  };
  LW.Perception = Perception;
})(globalThis.LW || (globalThis.LW = {}));
