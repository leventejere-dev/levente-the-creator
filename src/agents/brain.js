/* LEVENTE — THE CREATOR · agents/brain.js
 * Utility AI: every candidate goal gets a score from needs × personality × emotion ×
 * context (+ small noise); the best becomes a plan of steps. Every decision keeps a
 * WHY record (spec §93–§94). (AGENT_MODEL.md §3)
 */
(function (LW) {
  'use strict';
  const A = () => LW.Agents, Bld = () => LW.Buildings;
  const u = (x) => { const d = 1 - x; return d * d; };

  function context(world, a) {
    const i = world.idx(a.x | 0, a.y | 0);
    const fx = a.env || Bld().effectsAt(world, a.x, a.y, a);
    const stage = A().stage(world, a);
    const home = a.home != null ? world.buildings.get(a.home) : null;
    const ctx = {
      world, tick: world.tick, i, night: LW.Time.isNight(world.tick), season: LW.Time.season(world.tick), stage, adult: stage === 'adult' || stage === 'elder', child: stage === 'child' || stage === 'adolescent', infant: stage === 'infant',
      temp: world.tileTemp(i), effTemp: a.effTemp ?? world.tileTemp(i), rain: world.rainAt(i), storm: world.weather.effectiveState().state === 'storm', fx, home, danger: a.danger || 0,
      nearby: world.agentsNear(a.x, a.y, 10, a.id), household: A().household(world, a),
      water: A().nearestPoi(world, a, 'water'), food: A().nearestPoi(world, a, 'food', 20), animals: A().nearestPoi(world, a, 'animals', 30), fish: A().nearestPoi(world, a, 'fish', 30),
      fire: nearestFire(world, a, 20), shelter: Bld().shelterFor(world, a),
      foodInv: A().foodInInventory(a), foodUnits: A().foodUnits(a.inv),
    };
    ctx.storeFood = home && home.storage ? A().foodUnits(home.storage) : 0;
    return ctx;
  }
  function nearestFire(world, a, maxD) { let best = null, bd = maxD; for (const b of world.buildingsNear(a.x | 0, a.y | 0, maxD)) { if (b.kind !== 'campfire' || !b.lit || b.progress < 1) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }
  /** Legközelebbi kész épület egy fajtából vagy tulajdonságból (pl. 'furnace' = kemence/olvasztó/kovács). */
  function nearestBuilding(world, a, what, maxD) { let best = null, bd = maxD || 24; const DEFS = Bld().DEFS; for (const b of world.buildingsNear(a.x | 0, a.y | 0, bd)) { if (b.progress < 1) continue; const def = DEFS[b.kind]; if (!(b.kind === what || (def && def[what]))) continue; const d = LW.dist(a.x, a.y, b.x, b.y); if (d < bd) { bd = d; best = b; } } return best; }
  function needsBuilding(nearby) { return nearby && nearby !== 'fire' && nearby !== 'water'; }
  function bestDwelling(a) { const DEFS = Bld().DEFS; let best = null, bt = 0; for (const k in DEFS) { const d = DEFS[k]; if (!d.dwelling || !d.tier || (d.tech && !a.knowledge.techs.has(d.tech))) continue; if (d.tier > bt) { bt = d.tier; best = k; } } return best; }
  let _tileNearAgent = null;
  function tileNear(world, i) { return A().tileNear(world, _tileNearAgent, i); }
  /** Steps that acquire `need` = {item: qty} from the world using the agent's knowledge. Returns null if impossible. */
  function acquireSteps(world, a, need, ctx, depth) {
    const steps = []; depth = depth || 0;
    for (const item in need) {
      const q = need[item]; const src = LW.Tech.SOURCE[item];
      if (!src || src === 'store') { const ps = LW.Tree.publicStore(world, a, item, 20); if (ps && ps.storage[item] >= Math.min(q, 2)) { steps.push({ op: 'moveTo', i: world.idx(ps.x, ps.y), near: 1.5 }); steps.push({ op: 'take', bid: ps.id, item, n: q }); continue; } } // a közös raktárból
      if (!src) { // nincs a világban: talán meg lehet csinálni (recept-lánc, legfeljebb 2 mélységig)
        const R = LW.Tech.RECIPES[item]; if (!R || depth >= 2 || !a.knowledge.techs.has(R.tech)) return null;
        let inp = R.inp; if (R.inpAny) inp = R.inpAny.find((o) => count(missingFor(a, o)) === 0) || R.inpAny[0];
        const m = missingFor(a, inp); const sub = count(m) ? acquireSteps(world, a, m, ctx, depth + 1) : []; if (!sub) return null;
        steps.push(...sub);
        if (R.nearby === 'fire') { if (!ctx.fire) return null; steps.push({ op: 'moveTo', i: world.idx(ctx.fire.x, ctx.fire.y), near: 1 }); }
        else if (needsBuilding(R.nearby)) { const nb = nearestBuilding(world, a, R.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: world.idx(nb.x, nb.y), near: 1.5 }); }
        const times = Math.max(1, Math.ceil(q / (R.out[item] || 1))); for (let k = 0; k < Math.min(times, 3); k++) steps.push({ op: 'craft', recipe: item, needed: true });
        continue;
      }
      if (src === 'store') { const home = a.home != null ? world.buildings.get(a.home) : null; if (!home || !home.storage || (home.storage[item] || 0) < q) return null; steps.push({ op: 'moveTo', i: world.idx(home.x, home.y), near: 1 }); steps.push({ op: 'take', bid: home.id, item, n: q }); continue; }
      if (src.startsWith('deposit:')) { const dt = LW.DEPOSIT[src.slice(8).toUpperCase()]; let best = null, bd = 1e9; for (const p of a.knowledge.places.values()) { if (p.k !== 'deposit' || p.q !== dt) continue; const d = LW.dist(a.x, a.y, world.xOf(p.i), world.yOf(p.i)); if (d < bd) { bd = d; best = p; } } if (!best || !a.knowledge.techs.has('digging')) return null; if (dt === LW.DEPOSIT.OIL && !a.knowledge.techs.has('oil_drilling')) return null; const tg = tileNear(world, best.i); if (tg == null) return null; steps.push({ op: 'moveTo', i: tg, near: 1 }); steps.push({ op: 'dig', i: best.i, n: 8, item, needed: true }); if (q > 2) steps.push({ op: 'dig', i: best.i, n: 8, item, needed: true }); continue; }
      let poi = null, op = 'gather';
      if (src === 'food') poi = A().nearestPoi(world, a, 'food', 20);
      else if (src === 'fiber') { poi = A().nearestPoi(world, a, 'food', 12) || A().nearestPoi(world, a, 'wood', 12); }
      else if (src === 'animals') { if (!a.inv.spear) return null; poi = ctx.animals; op = 'hunt'; }
      else if (src === 'fish') { if (!a.knowledge.techs.has('fishing')) return null; poi = ctx.fish; op = 'fish'; }
      else poi = A().nearestPoi(world, a, src, 1);
      if (!poi) return null;
      const target = tileNear(world, poi.i); if (target == null) return null;
      steps.push({ op: 'moveTo', i: target, poi: { k: src === 'fiber' ? 'food' : src, i: poi.i } }); steps.push({ op, i: poi.i, item, n: q, needed: true });
    }
    return steps;
  }
  function missingFor(a, need) { const m = {}; for (const k in need) { const h = a.inv[k] || 0; if (h < need[k]) m[k] = need[k] - h; } return m; }
  const count = (m) => { let c = 0; for (const k in m) c += m[k]; return c; };
  const P = (a) => a.personality, E = (a) => a.emotions, N = (a) => a.needs;

  /** Goal catalogue. Each: applicable(ctx,a) → bool; score(ctx,a) → [score, factors]; plan(ctx,a) → plan | null */
  const GOALS = {
    flee: {
      applicable: (c, a) => c.danger > 0.3,
      score: (c, a) => [2.5 * c.danger * (1 + E(a).fear), [`veszély ${LW.pct(c.danger)}`, `félelem ${LW.pct(E(a).fear)}`]],
      plan: (c, a) => ({ steps: [{ op: 'flee', n: 10 }], priority: 3 }),
    },
    divine: {
      applicable: (c, a) => !!a.divineRequest,
      score: (c, a) => LW.God.scoreRequest(c.world, a),
      plan: (c, a) => LW.God.planRequest(c.world, a),
    },
    eat: {
      applicable: (c, a) => !c.infant && N(a).food < 0.8,
      score: (c, a) => { let s = u(N(a).food) * 1.6 + (N(a).food < 0.1 ? 0.8 : 0); const f = []; f.push(`éhség ${LW.pct(1 - N(a).food)}`); if (c.foodInv) { s += N(a).food < 0.5 ? 0.5 : 0.2; f.push('van nála étel'); } else if (c.storeFood > 0 && c.home) { s += 0.3; f.push('otthon van étel'); } else if (!c.food && !(a.inv.spear && c.animals) && !(c.fish && a.knowledge.techs.has('fishing'))) { s *= 0.3; f.push('nem ismer ételforrást'); } return [s, f]; },
      plan: (c, a) => {
        if (c.foodInv) return { steps: [{ op: 'consume' }] };
        if (c.storeFood > 0 && c.home) return { steps: [{ op: 'moveTo', i: c.world.idx(c.home.x, c.home.y) }, { op: 'takeFood', bid: c.home.id }, { op: 'consume' }] };
        const g = c.world.ground && nearestGroundFood(c.world, a, 8); if (g) return { steps: [{ op: 'moveTo', i: g }, { op: 'pickup', i: g }, { op: 'consume' }] };
        const opts = [];
        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i, poi: { k: 'food', i: c.food.i } }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.4) ? 'roots' : 'berries', n: 4, direct: true }], tag: 'gather:berries' });
        if (a.inv.spear && c.animals) opts.push({ d: c.animals.d * 0.8, steps: [{ op: 'moveTo', i: c.animals.i, poi: { k: 'animals', i: c.animals.i } }, { op: 'hunt', i: c.animals.i, item: 'meat_raw', n: 2 }, { op: 'consume' }], tag: 'hunt:animals' });
        if (c.fish && a.knowledge.techs.has('fishing')) { const t = tileNear(c.world, c.fish.i); if (t != null) opts.push({ d: c.fish.d * 0.9, steps: [{ op: 'moveTo', i: t, poi: { k: 'fish', i: c.fish.i } }, { op: 'fish', i: c.fish.i, item: 'fish_raw', n: 2 }, { op: 'consume' }], tag: 'fish:fish' }); }
        if (!opts.length) return null; opts.sort((x, y) => x.d - y.d); return { steps: opts[0].steps, tag: opts[0].tag };
      },
    },
    drink: {
      applicable: (c, a) => !c.infant && N(a).water < 0.75 && !!c.water,
      score: (c, a) => [u(N(a).water) * 2.4 + (N(a).water < 0.4 ? 0.5 : 0) + (c.water.d < 6 ? 0.2 : 0), [`szomj ${LW.pct(1 - N(a).water)}`, `víz ${Math.round(c.water.d)} mezőre`]],
      plan: (c, a) => { const t = tileNear(c.world, c.water.i); return t == null ? null : { steps: [{ op: 'moveTo', i: t, poi: { k: 'water', i: c.water.i } }, { op: 'drink', i: c.water.i }] }; },
    },
    sleep: {
      applicable: (c, a) => N(a).energy < 0.7 || (c.night && N(a).energy < 0.9),
      score: (c, a) => { let s = u(N(a).energy) * 1.3 * (c.night ? 1.7 : 0.5) + (N(a).energy < 0.1 ? 1.5 : 0); if (c.night && N(a).energy < 0.6) s += 0.4; if (E(a).grief > 0.3) s += 0.2; const f = [`fáradtság ${LW.pct(1 - N(a).energy)}`, c.night ? 'éjszaka' : 'nappal']; if (N(a).food < 0.12 && (c.foodInv || c.food || c.storeFood > 0)) { s *= 0.4; f.push('túl éhes az alváshoz'); } else if (N(a).food < 0.3 && c.foodInv) { s *= 0.6; f.push('előbb eszik'); } if (N(a).water < 0.12 && c.water) { s *= 0.3; f.push('túl szomjas az alváshoz'); } else if (N(a).water < 0.42 && c.water && c.water.d < 12) { s *= 0.5; f.push('előbb iszik'); } return [s, f]; },
      plan: (c, a) => { const sh = c.shelter; if (sh && LW.dist(a.x, a.y, sh.x, sh.y) < 30) return { steps: [{ op: 'moveTo', i: c.world.idx(sh.x, sh.y) }, { op: 'sleep', bid: sh.id }], priority: 1 }; if (c.fire && LW.dist(a.x, a.y, c.fire.x, c.fire.y) < 20) return { steps: [{ op: 'moveTo', i: c.world.randomNear(c.fire.x, c.fire.y, 1) }, { op: 'sleep' }], priority: 1 }; return { steps: [{ op: 'sleep' }], priority: 1 }; },
    },
    getWarm: {
      applicable: (c, a) => !c.infant && (N(a).warmth < 0.75 || (c.rain > 0.3 && !c.fx.inside) || c.storm),
      score: (c, a) => { let s = u(N(a).warmth) * 1.7; const f = [`hideg ${LW.pct(1 - N(a).warmth)}`, `érzett ${Math.round(c.effTemp)} °C`]; if (c.rain > 0.3 && !c.fx.inside) { s += c.rain * 0.7; f.push(`eső ${LW.pct(c.rain)}`); } if (c.storm && !c.fx.inside) { s += 0.6; f.push('vihar'); } if (c.fx.inside || c.fx.fire) s *= 0.15; return [s, f]; },
      plan: (c, a) => {
        const opts = [];
        if (c.shelter) opts.push({ d: LW.dist(a.x, a.y, c.shelter.x, c.shelter.y), steps: [{ op: 'moveTo', i: c.world.idx(c.shelter.x, c.shelter.y) }, { op: 'wait', n: 8, at: 'shelter' }] });
        if (c.fire) opts.push({ d: LW.dist(a.x, a.y, c.fire.x, c.fire.y) + 1, steps: [{ op: 'moveTo', i: c.world.randomNear(c.fire.x, c.fire.y, 1) }, { op: 'wait', n: 8, at: 'fire' }] });
        opts.sort((x, y) => x.d - y.d);
        if (opts.length && opts[0].d < 25) { opts[0].steps[opts[0].steps.length - 1].n = N(a).warmth < 0.3 ? 24 : 12; return { steps: opts[0].steps }; }
        if (a.knowledge.techs.has('fire_making')) { const p = GOALS.makeFire.plan(c, a); if (p) return p; }
        if (opts.length) return { steps: opts[0].steps };
        // no fire, no shelter: huddle with others under the trees
        const others = c.nearby.filter((o) => !o.sleeping || true); let best = null, bd = 16; for (const o of others) { const d = LW.dist(a.x, a.y, o.x, o.y); if (d < bd && d > 1) { bd = d; best = o; } }
        const wood = A().nearestPoi(c.world, a, 'wood', 110, 10);
        const steps = [];
        if (best) steps.push({ op: 'moveTo', i: c.world.idx(best.x | 0, best.y | 0), near: 1 }); else if (wood) steps.push({ op: 'moveTo', i: wood.i, poi: { k: 'wood', i: wood.i } });
        steps.push({ op: 'wait', n: 8, at: 'huddling' }); return { steps };
      },
    },
    careForChild: {
      applicable: (c, a) => c.adult && a.children.length > 0,
      score: (c, a) => { let best = 0, who = null; for (const cid of a.children) { const ch = c.world.agents.get(cid); if (!ch || !A().isChild(c.world, ch)) continue; const st = A().stage(c.world, ch); const d = LW.dist(a.x, a.y, ch.x, ch.y); let s = 0; if (st === 'infant') { if (d > 3) s = 0.9 + Math.min(1, d / 10); } else if (N(ch).food < 0.45) s = u(N(ch).food) * 1.8 * (0.5 + P(a).empathy); if (N(ch).water < 0.3 && st === 'infant') s += 0.5; if (s > best) { best = s; who = ch; } } a._careTarget = who; return [best, who ? [`${who.name} étele ${LW.pct(N(who).food)}`] : []]; },
      plan: (c, a) => { const ch = a._careTarget; if (!ch) return null; const st = A().stage(c.world, ch); if (st === 'infant' && N(ch).food >= 0.45) return { steps: [{ op: 'moveTo', i: c.world.idx(ch.x | 0, ch.y | 0) }, { op: 'wait', n: 6, at: 'child' }], target: ch.id }; if (c.foodInv) return { steps: [{ op: 'moveTo', i: c.world.idx(ch.x | 0, ch.y | 0) }, { op: 'give', target: ch.id, item: c.foodInv, n: 2 }], target: ch.id }; if (c.storeFood > 0 && c.home) return { steps: [{ op: 'moveTo', i: c.world.idx(c.home.x, c.home.y) }, { op: 'takeFood', bid: c.home.id, n: 3 }, { op: 'moveTo', i: c.world.idx(ch.x | 0, ch.y | 0) }, { op: 'give', target: ch.id, item: '*food', n: 2 }], target: ch.id }; const acq = acquireSteps(c.world, a, { berries: 4 }, c); if (!acq) return null; return { steps: [...acq, { op: 'moveTo', i: c.world.idx(ch.x | 0, ch.y | 0) }, { op: 'give', target: ch.id, item: '*food', n: 2 }], target: ch.id, tag: 'gather:berries' }; },
    },
    shareFood: {
      applicable: (c, a) => c.adult && !!c.foodInv && (a.inv[c.foodInv] || 0) >= 2,
      score: (c, a) => { let best = 0, who = null; for (const o of c.nearby) { if (N(o).food > 0.3 || A().stage(c.world, o) === 'infant') continue; const r = a.relationships.get(o.id); const close = c.household.includes(o) ? 1 : r ? Math.max(r.friendship, r.romance, r.loyalty * 0.8) : 0.1; const s = u(N(o).food) * (0.4 + P(a).empathy) * (0.3 + close) * (1 - P(a).greed * 0.5); if (s > best) { best = s; who = o; } } a._shareTarget = who; return [best, who ? [`${who.name} éhes`, `együttérzés ${LW.pct(P(a).empathy)}`] : []]; },
      plan: (c, a) => a._shareTarget ? { steps: [{ op: 'moveTo', i: c.world.idx(a._shareTarget.x | 0, a._shareTarget.y | 0) }, { op: 'give', target: a._shareTarget.id, item: c.foodInv, n: 1 }], target: a._shareTarget.id } : null,
    },
    followParent: {
      applicable: (c, a) => (c.infant || c.stage === 'child') && A().caregivers(c.world, a).length > 0,
      score: (c, a) => { const cg = A().caregivers(c.world, a); let d = 1e9, who = null; for (const p of cg) { const dd = LW.dist(a.x, a.y, p.x, p.y); if (dd < d) { d = dd; who = p; } } a._follow = who; const far = d > (c.infant ? 2 : 5); return [far ? 0.9 + Math.min(1, d / 12) + u(N(a).safety) * 0.5 : 0.05, [`szülő ${Math.round(d)} mezőre`]]; },
      plan: (c, a) => a._follow ? { steps: [{ op: 'follow', target: a._follow.id, n: 12 }], target: a._follow.id } : null,
    },
    socialize: {
      applicable: (c, a) => !c.infant && N(a).social < 0.85 && (c.nearby.length > 0 || N(a).social < 0.5),
      score: (c, a) => { let best = 0, who = null; for (const o of c.nearby) { if (A().stage(c.world, o) === 'infant' || o.sleeping) continue; const r = a.relationships.get(o.id); if (r && c.tick - r.last < 20) continue; const aff = r ? 0.3 + r.friendship * 0.7 + (r.status === 'family' ? 0.3 : 0) + (a.partner === o.id ? 0.4 : 0) - r.resentment : 0.35; const d = LW.dist(a.x, a.y, o.x, o.y); const s = u(N(a).social) * 0.95 * (0.5 + P(a).sociability) * Math.max(0.1, aff) * (1 - d / 25); if (s > best) { best = s; who = o; } } a._socialTarget = who; a._socialSeek = null;
        if (!who && N(a).social < 0.5 && N(a).water > 0.45 && N(a).food > 0.35) { // senki sincs a közelben: elindul oda, ahol utoljára látott valakit, akit ismer
          let seek = null, bs = 0; for (const [id, m] of a.memory.social) { if (m.lastTile < 0 || !c.world.agents.has(id) || c.tick - m.lastSeen > LW.TIME.TICKS_PER_DAY * 30) continue; const o = c.world.agents.get(id); const r = a.relationships.get(id); const aff = r ? 0.3 + r.friendship * 0.7 + (a.partner === id ? 0.5 : 0) - r.resentment : 0.3; const d = LW.dist(a.x, a.y, c.world.xOf(m.lastTile), c.world.yOf(m.lastTile)); if (d < 2 || d > 60) continue; const s = aff * (1 - d / 80); if (s > bs) { bs = s; seek = { id, tile: m.lastTile, name: o.name }; } }
          if (seek) { a._socialSeek = seek; return [u(N(a).social) * 0.8 * (0.5 + P(a).sociability) * Math.max(0.3, bs * 2) + E(a).loneliness * 0.3, [`magány ${LW.pct(1 - N(a).social)}`, `keresi: ${seek.name}`]]; }
        }
        return [best + (E(a).loneliness * 0.3), who ? [`magány ${LW.pct(1 - N(a).social)}`, `vele: ${who.name}`] : []]; },
      plan: (c, a) => a._socialTarget ? { steps: [{ op: 'moveTo', i: c.world.idx(a._socialTarget.x | 0, a._socialTarget.y | 0), near: 1 }, { op: 'interact', target: a._socialTarget.id, kind: 'converse', n: 4 }], target: a._socialTarget.id } : a._socialSeek ? { steps: [{ op: 'moveTo', i: a._socialSeek.tile, near: 2 }], tag: 'seek:people' } : null,
    },
    flirt: {
      applicable: (c, a) => c.adult && c.nearby.length > 0,
      score: (c, a) => {
        let best = 0, who = null;
        for (const o of c.nearby) {
          if (!A().isAdult(c.world, o) || o.sleeping) continue; const r = LW.Relationships.ensure(c.world, a, o); if (r.attraction < 0.3 || (r.status === 'family' && LW.Relationships.kinship(c.world, a, o) >= 0.9)) continue; if (r.lastFlirt != null && c.tick - r.lastFlirt < 40) continue;
          const single = a.partner == null; const oSingle = o.partner == null || o.partner === a.id;
          let s = r.attraction * (0.5 + u(N(a).affection)) * (single ? 1 : (1 - P(a).loyalty) * 0.25) * (oSingle ? 1 : 0.3) * (0.6 + P(a).sociability * 0.4) * (E(a).joy > 0.2 ? 1 : 0.7);
          if (a.partner === o.id) s *= 0.5; if (r.resentment > 0.3) s *= 0.3; if (E(a).shame > 0.4) s *= 0.5;
          s *= 1 - LW.dist(a.x, a.y, o.x, o.y) / 30;
          if (s > best) { best = s; who = o; }
        }
        a._flirtTarget = who; return [best, who ? [`vonzalom (${who.name}) ${LW.pct(a.relationships.get(who.id).attraction)}`, `gyengédségigény ${LW.pct(1 - N(a).affection)}`] : []];
      },
      plan: (c, a) => a._flirtTarget ? { steps: [{ op: 'moveTo', i: c.world.idx(a._flirtTarget.x | 0, a._flirtTarget.y | 0), near: 1 }, { op: 'interact', target: a._flirtTarget.id, kind: 'flirt', n: 4 }], target: a._flirtTarget.id } : null,
    },
    mate: {
      applicable: (c, a) => c.adult && a.partner != null && c.world.agents.has(a.partner),
      score: (c, a) => { const p = c.world.agents.get(a.partner); const r = a.relationships.get(p.id); if (!r || p.sleeping && !c.night) return [0, []]; const d = LW.dist(a.x, a.y, p.x, p.y); let s = (u(N(a).affection) * 0.9 + E(a).love * 0.4) * (0.4 + r.attraction) * (c.night || c.fx.inside ? 1.2 : 0.45) * (1 - d / 30); if (r.resentment > 0.4) s *= 0.3; return [s, [`gyengédségigény ${LW.pct(1 - N(a).affection)}`, `szerelem ${LW.pct(E(a).love)}`]]; },
      plan: (c, a) => { const p = c.world.agents.get(a.partner); return { steps: [{ op: 'moveTo', i: c.world.idx(p.x | 0, p.y | 0), near: 1 }, { op: 'interact', target: p.id, kind: 'mate', n: 6 }], target: p.id }; },
    },
    stockpile: {
      applicable: (c, a) => !c.infant && c.stage !== 'child' && (c.food || (a.inv.spear && c.animals) || (c.fish && a.knowledge.techs.has('fishing'))),
      score: (c, a) => { const hh = c.household.length; const stock = c.foodUnits + c.storeFood; const target = 1.2 * hh + (c.season === 2 ? 1.5 * hh : c.season === 3 ? 1.0 * hh : 0); const gap = 1 - Math.min(1, stock / Math.max(1, target)); let s = gap * 0.75 * (0.5 + P(a).discipline) * (c.season === 2 ? 1.4 : c.season === 3 ? 1.1 : 1); if (A().load(a) > A().capacity(c.world, a) * 0.85) s *= 0.2; if (c.night) s *= 0.4; if (N(a).warmth < 0.35) s *= 0.3; return [s, [`tartalék ${stock.toFixed(1)} / ${target.toFixed(1)}`, `fegyelem ${LW.pct(P(a).discipline)}`]]; },
      plan: (c, a) => {
        const opts = []; const cap = Math.max(2, Math.floor((A().capacity(c.world, a) - A().load(a)) / 0.6));
        if (c.food) opts.push({ d: c.food.d, steps: [{ op: 'moveTo', i: c.food.i, poi: { k: 'food', i: c.food.i } }, { op: 'gather', i: c.food.i, item: c.food.q > 60 && c.world.rng.chance(0.3) ? 'roots' : 'berries', n: Math.min(cap, 6) }], tag: 'gather:berries' });
        if (a.inv.spear && c.animals) opts.push({ d: c.animals.d * 0.7, steps: [{ op: 'moveTo', i: c.animals.i, poi: { k: 'animals', i: c.animals.i } }, { op: 'hunt', i: c.animals.i, item: 'meat_raw', n: 3 }], tag: 'hunt:animals' });
        if (c.fish && a.knowledge.techs.has('fishing')) { const t = tileNear(c.world, c.fish.i); if (t != null) opts.push({ d: c.fish.d * 0.8, steps: [{ op: 'moveTo', i: t, poi: { k: 'fish', i: c.fish.i } }, { op: 'fish', i: c.fish.i, item: 'fish_raw', n: 3 }], tag: 'fish:fish' }); }
        if (!opts.length) return null; opts.sort((x, y) => x.d - y.d); const o = opts[0];
        if (c.home && Bld().def(c.home).storage) o.steps.push({ op: 'moveTo', i: c.world.idx(c.home.x, c.home.y) }, { op: 'store', bid: c.home.id });
        return { steps: o.steps, tag: o.tag };
      },
    },
    buildShelter: {
      applicable: (c, a) => c.adult && (a.knowledge.techs.has('shelter_building') || a.knowledge.techs.has('hut_construction')) && !(a.partner != null && c.world.agents.get(a.partner)?.home != null && !c.home),
      score: (c, a) => {
        const kind = bestDwelling(a) || 'lean_to'; const DEFS = Bld().DEFS;
        const cur = c.home ? DEFS[c.home.kind].tier || 0 : 0; const tier = { [kind]: DEFS[kind].tier || 1 };
        if (cur >= tier[kind]) return [0, ['az otthon elég jó']];
        let s = cur === 0 ? 1.15 : 0.55; const f = [cur === 0 ? 'nincs otthona' : `jobb otthon: ${LW.Buildings.DEFS[kind].label.toLowerCase()}`];
        if (N(a).warmth < 0.7) { s += 0.35; f.push('hideg'); } if (c.rain > 0.2 && !c.fx.inside) { s += 0.3; f.push('eső'); } if (c.season === 2) { s += 0.35; f.push('ősz'); } if (c.season === 3) s += 0.2;
        s += P(a).ambition * 0.3 + P(a).discipline * 0.2; if (c.night) s *= 0.3; if (a.pregnancy || c.household.length > 1) s += 0.2;
        a._buildKind = kind; return [s, f];
      },
      plan: (c, a) => buildPlan(c, a, a._buildKind || 'lean_to'),
    },
    buildPublic: {
      applicable: (c, a) => c.adult && !c.night && a.knowledge.techs.size >= 3 && N(a).water > 0.45 && N(a).food > 0.4,
      score: (c, a) => { const DEFS = Bld().DEFS; const day = c.world.tick / LW.TIME.TICKS_PER_DAY | 0; if (a._pubDay !== day || !a._pubKind) { const pick = LW.Society.pickPublic(c.world, a); a._pubKind = pick ? pick.kind : null; a._pubWant = pick ? pick.want : 0; a._pubDay = day; } const which = a._pubKind, best = a._pubWant || 0; if (!which) return [0, []]; return [best * (0.45 + P(a).ambition * 0.4 + P(a).discipline * 0.25) * (c.season === 3 ? 0.6 : 1), [`a közösségnek kellene: ${DEFS[which].label.toLowerCase()}`]]; },
      plan: (c, a) => a._pubKind ? buildPlan(c, a, a._pubKind) : null,
    },
    helpBuild: {
      applicable: (c, a) => c.adult && !!findHouseholdSite(c, a),
      score: (c, a) => { const b = findHouseholdSite(c, a); a._helpSite = b; return [0.75 + P(a).loyalty * 0.2 + (c.season === 2 ? 0.2 : 0), [`segít építeni: ${Bld().def(b).label.toLowerCase()}`]]; },
      plan: (c, a) => buildPlanFor(c, a, a._helpSite),
    },
    makeFire: {
      applicable: (c, a) => c.adult && a.knowledge.techs.has('fire_making') && !(c.fire && LW.dist(a.x, a.y, c.fire.x, c.fire.y) < 6),
      score: (c, a) => { let s = 0.5 + u(N(a).warmth) * 0.9 + (c.night ? 0.35 : 0) + (a.inv.meat_raw || a.inv.fish_raw ? 0.3 : 0) + (c.season === 3 ? 0.3 : 0); if (c.effTemp > 18 && !c.night) s *= 0.4; return [s, ['nincs tűz a közelben', `érzett ${Math.round(c.effTemp)} °C`]]; },
      plan: (c, a) => {
        const site = c.home ? c.world.randomNear(c.home.x, c.home.y, 1) : Bld().findSite(c.world, a, 'campfire'); if (site < 0) return null;
        const existing = c.world.buildingsNear(a.x | 0, a.y | 0, 6).find((b) => b.kind === 'campfire' && !b.lit && LW.dist(b.x, b.y, a.x, a.y) < 6);
        if (existing) { const m = missingFor(a, { wood: 3 }); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null; return { steps: [...acq, { op: 'moveTo', i: c.world.idx(existing.x, existing.y), near: 1 }, { op: 'refuel', bid: existing.id }], tag: 'gather:wood' }; }
        const m = missingFor(a, { wood: 3 }); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null;
        return { steps: [...acq, { op: 'moveTo', i: site, near: 1 }, { op: 'buildNew', kind: 'campfire', i: site }], tag: 'build:campfire', kind: 'campfire' };
      },
    },
    tendFire: {
      applicable: (c, a) => c.adult && a.knowledge.techs.has('fire_making') && !!c.fire && c.fire.fuel < LW.TIME.TICKS_PER_DAY * 0.7 && LW.dist(a.x, a.y, c.fire.x, c.fire.y) < 12,
      score: (c, a) => [0.55 + (c.night ? 0.2 : 0) + (c.season === 3 ? 0.25 : 0) + P(a).discipline * 0.2, [`fogy a tűz (${Math.round(c.fire.fuel / 4)} óra)`]],
      plan: (c, a) => { const m = missingFor(a, { wood: 3 }); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null; return { steps: [...acq, { op: 'moveTo', i: c.world.idx(c.fire.x, c.fire.y), near: 1 }, { op: 'refuel', bid: c.fire.id }], tag: 'gather:wood' }; },
    },
    craft: {
      applicable: (c, a) => c.adult || c.stage === 'adolescent',
      score: (c, a) => {
        let best = 0, which = null; const f = [];
        const want = [];
        if (a.knowledge.techs.has('stone_knapping') && !a.inv.handaxe) want.push(['handaxe', 0.6]);
        if (a.knowledge.techs.has('spear_making') && !a.inv.spear) want.push(['spear', 0.55 + u(N(a).food) * 0.4]);
        if (a.knowledge.techs.has('basket_weaving') && !a.inv.basket) want.push(['basket', 0.45]);
        if (a.knowledge.techs.has('hide_working') && !a.inv.clothes) want.push(['clothes', 0.4 + u(N(a).warmth) * 0.6 + (c.season >= 2 ? 0.3 : 0)]);
        if (a.knowledge.techs.has('pottery') && !a.inv.pot) want.push(['pot', 0.35]);
        if (a.knowledge.techs.has('cooking') && (a.inv.meat_raw || a.inv.fish_raw) && c.fire) want.push([a.inv.meat_raw ? 'meat_cooked' : 'fish_cooked', 0.5 + u(N(a).food) * 0.6]);
        if (a.knowledge.techs.has('food_drying') && c.fire && ((a.inv.meat_raw || 0) >= 2 || (a.inv.fish_raw || 0) >= 2 || (a.inv.berries || 0) >= 6)) want.push(['dried_food', 0.45 + (c.season === 2 ? 0.3 : 0)]);
        // jobb szerszám, ha tudja, hogyan (balta, vadászfegyver, eke, csákány, ruha)
        if (!a._toolC || c.world.tick - a._toolC.tick > 48) { const list = []; for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; const out = Object.keys(R.out)[0]; const it = LW.ITEMS[out]; if (!it || !it.slot || !a.knowledge.techs.has(R.tech)) continue; if (LW.Tree.bestTool(a, it.slot) >= it.tier) continue; if (needsBuilding(R.nearby) && !nearestBuilding(c.world, a, R.nearby, 30)) continue; list.push([rid, it.slot]); } a._toolC = { tick: c.world.tick, list }; } // félnaponta újraszámolva: 60 recept, mindnél épületkeresés
        for (const [rid, slot] of a._toolC.list) { const R = LW.Tech.RECIPES[rid]; if (R.nearby === 'fire' && !c.fire) continue; if (LW.Tree.bestTool(a, slot) >= LW.ITEMS[Object.keys(R.out)[0]].tier) continue; want.push([rid, 0.4 + (slot === 'hunt' ? u(N(a).food) * 0.3 : 0) + (slot === 'clothes' ? u(N(a).warmth) * 0.5 : 0) + P(a).ambition * 0.15]); }
        if (a.knowledge.techs.has('baking') && (a.inv.flour || 0) >= 1 && c.fire) want.push(['bread', 0.5 + u(N(a).food) * 0.5]);
        if (a.knowledge.techs.has('milling') && ((a.inv.grain || 0) >= 3 || (c.home && c.home.storage && (c.home.storage.grain || 0) >= 3))) want.push(['flour', 0.4 + u(N(a).food) * 0.4]);
        for (const [r, s] of want) if (s > best) { best = s; which = r; }
        a._craft = which; if (which) f.push(`kellene: ${LW.ITEMS[which] ? LW.ITEMS[which].label.toLowerCase() : which}`);
        return [best * (0.6 + P(a).discipline * 0.4) * (c.night ? 0.5 : 1), f];
      },
      plan: (c, a) => {
        const rid = a._craft; if (!rid) return null; const R = LW.Tech.RECIPES[rid];
        let need = R.inp; if (R.inpAny) need = R.inpAny.find((o) => count(missingFor(a, o)) === 0) || R.inpAny[0];
        const m = missingFor(a, need); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null;
        const steps = [...acq]; if (R.nearby === 'fire') { if (!c.fire) return null; steps.push({ op: 'moveTo', i: c.world.idx(c.fire.x, c.fire.y), near: 1 }); }
        else if (needsBuilding(R.nearby)) { const nb = nearestBuilding(c.world, a, R.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: c.world.idx(nb.x, nb.y), near: 1.5 }); }
        steps.push({ op: 'craft', recipe: rid }); return { steps, tag: R.tag };
      },
    },
    experiment: {
      applicable: (c, a) => (c.adult || c.stage === 'adolescent') && N(a).food > 0.25 && (N(a).water > 0.3 || !c.water) && N(a).energy > 0.2 && N(a).warmth > 0.12,
      score: (c, a) => {
        // ami kipróbálható és elérhető: hatóránként újraszámolva (a beszerzési tervek végigpróbálása drága)
        if (!a._expC || c.world.tick - a._expC.tick > 24 || a._expC.n !== a.knowledge.techs.size) { const el = LW.Tech.eligible(c.world, a); const ok = []; for (const id of el) { const d = LW.Tech.D[id]; const m = LW.Tech.missingItems(a, d); const feasible = count(m) === 0 || acquireSteps(c.world, a, m, c); if (!feasible) continue; if (d.nearby === 'fire' && !c.fire) continue; if (d.nearby === 'water' && !c.water) continue; if (needsBuilding(d.nearby) && !nearestBuilding(c.world, a, d.nearby, 30)) continue; ok.push(id); } a._expC = { tick: c.world.tick, n: a.knowledge.techs.size, ids: ok }; }
        const el = a._expC.ids; if (!el.length) return [0, ['nincs mit kipróbálni']];
        let best = 0, which = null;
        for (const id of el) { const d = LW.Tech.D[id]; if (a.knowledge.techs.has(id)) continue; const need = d.need ? u(N(a)[d.need] ?? 1) : 0; const prog = a.knowledge.progress[id] || 0; const m = LW.Tech.missingItems(a, d); const s = (0.25 + P(a).curiosity * 0.5) * (0.4 + P(a).creativity * 0.6) * (1 - d.difficulty * 0.5) + need * 0.7 + prog * 0.4 + u(N(a).curiosity) * 0.35 + (count(m) === 0 ? 0.15 : 0); if (s > best) { best = s; which = id; } }
        a._exp = which; return [best * (c.night ? 0.4 : 1), which ? [`próba: ${LW.Tech.D[which].name.toLowerCase()}`, `kíváncsiság ${LW.pct(P(a).curiosity)}`, `kreativitás ${LW.pct(P(a).creativity)}`] : []];
      },
      plan: (c, a) => {
        const id = a._exp; if (!id) return null; const d = LW.Tech.D[id]; const m = LW.Tech.missingItems(a, d); const acq = count(m) ? acquireSteps(c.world, a, m, c) : []; if (!acq) return null;
        const steps = [...acq];
        if (d.nearby === 'fire' && c.fire) steps.push({ op: 'moveTo', i: c.world.idx(c.fire.x, c.fire.y), near: 1 });
        if (d.nearby === 'water' && c.water) { const t = tileNear(c.world, c.water.i); if (t != null) steps.push({ op: 'moveTo', i: t }); }
        if (needsBuilding(d.nearby)) { const nb = nearestBuilding(c.world, a, d.nearby, 30); if (!nb) return null; steps.push({ op: 'moveTo', i: c.world.idx(nb.x, nb.y), near: 1.5 }); }
        steps.push({ op: 'experiment', tech: id, n: Math.round(8 + d.difficulty * 32) });
        return { steps, tag: 'experiment:' + id, tech: id };
      },
    },
    dig: {
      applicable: (c, a) => c.adult && a.knowledge.techs.has('digging') && !!(A().nearestPoi(c.world, a, 'deposit') || A().nearestPoi(c.world, a, 'clay')),
      score: (c, a) => { const dep = A().nearestPoi(c.world, a, 'deposit'); const clay = A().nearestPoi(c.world, a, 'clay'); const wantClay = a.knowledge.techs.has('pottery') && (a.inv.clay || 0) < 4 || (a.knowledge.techs.has('stone_masonry') && (a.inv.clay || 0) < 2); let s = 0, t = null; if (clay && wantClay) { s = 0.5; t = clay; } if (dep && (!t || LW.dist(a.x, a.y, dep.x, dep.y) < 8)) { const s2 = 0.3 * (0.5 + P(a).curiosity) + (a.knowledge.techs.has('ore_lore_' + LW.DEPOSIT_NAME[dep.q]) ? 0 : 0.25); if (s2 > s) { s = s2; t = dep; } } a._digTarget = t; return [s * (c.night ? 0.3 : 1), t ? [`ásás itt: ${t.x},${t.y}`] : []]; },
      plan: (c, a) => a._digTarget ? { steps: [{ op: 'moveTo', i: a._digTarget.i }, { op: 'dig', i: a._digTarget.i, n: 8 }], tag: 'dig:ground' } : null,
    },
    farm: {
      applicable: (c, a) => c.adult && a.knowledge.techs.has('seed_planting'),
      score: (c, a) => { const farms = c.world.buildingsNear(a.x | 0, a.y | 0, 20).filter((b) => b.kind === 'farm_plot' && b.ownerId === a.id); const maxFarms = 1 + (c.household.length >= 3 ? 1 : 0) + (a.knowledge.techs.has('plowing') ? 1 : 0) + (a.knowledge.techs.has('crop_rotation') ? 1 : 0); const farm = farms.find((b) => b.progress < 1) || farms.find((b) => b.planted && b.crop >= 1) || farms.find((b) => !b.planted) || null; a._farm = farm; if (!farm) { if (farms.length >= maxFarms) return [0.05, ['nő a termés']]; return [c.season <= 1 && c.home ? 0.6 + P(a).discipline * 0.3 + (farms.length === 0 ? 0.2 : 0) + u(N(a).food) * 0.4 : 0.1, [farms.length ? 'még egy szántót akar' : 'szántót akar']]; } if (farm.progress < 1) return [0.7, ['befejezi a szántót']]; if (!farm.planted && c.season <= 1) return [((a.inv.roots || 0) + (a.inv.berries || 0) >= 2 ? 0.75 : 0.3), ['vetés']]; if (farm.planted && farm.crop >= 1) return [1.0 + u(N(a).food) * 0.5, ['érett a termés']]; return [0.05, ['nő a termés']]; },
      plan: (c, a) => { const farm = a._farm; if (!farm) return buildPlan(c, a, 'farm_plot'); if (farm.progress < 1) return buildPlanFor(c, a, farm); if (!farm.planted) { const seeds = (a.inv.roots || 0) + (a.inv.berries || 0) >= 2 ? [] : acquireSteps(c.world, a, { berries: 2 }, c); if (!seeds) return null; return { steps: [...seeds, { op: 'moveTo', i: c.world.idx(farm.x, farm.y) }, { op: 'plant', bid: farm.id }], tag: 'farm:plant' }; } if (farm.crop >= 1) return { steps: [{ op: 'moveTo', i: c.world.idx(farm.x, farm.y) }, { op: 'harvest', bid: farm.id }], tag: 'farm:harvest' }; return null; },
    },
    explore: {
      applicable: (c, a) => !c.infant && c.stage !== 'child' && !(c.water && N(a).water < 0.4) && !(N(a).food < 0.3 && (c.food || c.foodInv)),
      score: (c, a) => { let s = P(a).curiosity * (1 - E(a).fear) * 0.55 + u(N(a).curiosity) * 0.45; const f = [`kíváncsiság ${LW.pct(P(a).curiosity)}`]; if (!c.water) { s += 1.0; f.push('nem ismer vizet'); } if (!c.food) { s += 0.8; f.push('nem ismer ételt'); } else if (c.food.d > 10) { s += 0.4; f.push('messze az étel'); } if (a.knowledge.places.size < 20) { s += 0.3; f.push('keveset ismer'); } if (c.night) s *= 0.25; if (N(a).warmth < 0.5) s *= 0.3; if (N(a).food < 0.3 || N(a).water < 0.3) s *= (c.water && c.food) ? 0.3 : 1.2; return [s, f]; },
      plan: (c, a) => { const t = exploreTarget(c.world, a); return t == null ? null : { steps: [{ op: 'moveTo', i: t, explore: true }], tag: 'explore:walk' }; },
    },
    fight: {
      applicable: (c, a) => c.adult && E(a).anger > 0.5 && P(a).aggression > 0.4,
      score: (c, a) => { let best = 0, who = null; for (const o of c.nearby) { const r = a.relationships.get(o.id); if (!r || r.resentment < 0.45) continue; const s = E(a).anger * P(a).aggression * r.resentment * 1.4 * (1 - r.fear) * (P(a).bravery + 0.3); if (s > best) { best = s; who = o; } } a._fightTarget = who; return [best, who ? [`harag ${LW.pct(E(a).anger)}`, `neheztel rá: ${who.name}`] : []]; },
      plan: (c, a) => a._fightTarget ? { steps: [{ op: 'moveTo', i: c.world.idx(a._fightTarget.x | 0, a._fightTarget.y | 0), near: 1 }, { op: 'interact', target: a._fightTarget.id, kind: 'fight', n: 2 }], target: a._fightTarget.id, priority: 2 } : null,
    },
    teach: {
      applicable: (c, a) => c.adult && a.knowledge.techs.size > 0 && c.nearby.length > 0,
      // (a halandóság-érzet a pontozásban: aki tudja, hogy fogy az ideje, átadja, amit tud)
      score: (c, a) => { let best = 0, who = null, tech = null; const cands = []; for (const o of c.nearby) { if (o.sleeping || A().stage(c.world, o) === 'infant') continue; const r = a.relationships.get(o.id); const close = (a.children.includes(o.id) ? 0.8 : 0) + (r ? r.friendship * 0.6 : 0); if (close >= 0.2) cands.push([close, o]); } cands.sort((p, q) => q[0] - p[0]); const base = 0.3 * (1 + (a.mind ? a.mind.mortality * 1.2 : 0)) * (0.5 + P(a).empathy + P(a).sociability * 0.5) * (c.stage === 'elder' ? 1.5 : 1);
        for (const [close, o] of cands) { const s = base * close; if (s <= best) break; let t0 = null; for (const t of a.knowledge.techs) { if (o.knowledge.techs.has(t) || LW.Tech.D[t].hidden) continue; const pre = !LW.Tech.D[t].prereq || LW.Tech.D[t].prereq.every((p) => o.knowledge.techs.has(p)); if (pre) { t0 = t; break; } } if (t0) { best = s; who = o; tech = t0; break; } } // a pontszám nem függ attól, mit tanít: a legközelebbi tanítható ember elég
        a._teach = who ? { who, tech } : null; return [best, who ? [`tanítja (${LW.Tech.D[tech].name.toLowerCase()}): ${who.name}`] : []]; },
      plan: (c, a) => a._teach ? { steps: [{ op: 'moveTo', i: c.world.idx(a._teach.who.x | 0, a._teach.who.y | 0), near: 1 }, { op: 'interact', target: a._teach.who.id, kind: 'teach', tech: a._teach.tech, n: 6 }], target: a._teach.who.id, tech: a._teach.tech } : null,
    },
    pickup: {
      applicable: (c, a) => !c.infant && !!c.world.ground && c.world.ground.size > 0,
      score: (c, a) => { const g = nearestGround(c.world, a, 7); a._pick = g; return [g ? 0.45 : 0, g ? ['holmi hever a földön'] : []]; },
      plan: (c, a) => a._pick != null ? { steps: [{ op: 'moveTo', i: a._pick }, { op: 'pickup', i: a._pick }] } : null,
    },
    mourn: {
      applicable: (c, a) => E(a).grief > 0.35,
      score: (c, a) => [E(a).grief * 0.7, [`gyász ${LW.pct(E(a).grief)}`]],
      plan: (c, a) => ({ steps: [...(c.home ? [{ op: 'moveTo', i: c.world.idx(c.home.x, c.home.y) }] : []), { op: 'wait', n: 16, at: 'mourning' }] }),
    },
    rest: {
      applicable: () => true,
      score: (c, a) => [0.12 + (N(a).energy < 0.5 ? 0.15 : 0) + (a.health < 0.5 ? 0.3 : 0), ['semmi sürgős']],
      plan: (c, a) => ({ steps: [...(c.fire && LW.dist(a.x, a.y, c.fire.x, c.fire.y) > 2 && LW.dist(a.x, a.y, c.fire.x, c.fire.y) < 12 ? [{ op: 'moveTo', i: c.world.randomNear(c.fire.x, c.fire.y, 1) }] : []), { op: 'wait', n: 6, at: c.fire ? 'fire' : 'rest' }], tag: c.fire ? 'rest:fire' : 'rest:idle' }),
    },
  };

  // a földön heverő holmi: csak a környező ablakot nézi (a világban ezrével hevernek kupacok, mind végigjárni drága volt)
  function nearestGroundBy(world, a, maxD, pred) { if (!world.ground || !world.ground.size) return null; let best = null, bd = maxD; const r = Math.ceil(maxD), ax = a.x | 0, ay = a.y | 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = ax + dx, y = ay + dy; if (!world.inBounds(x, y)) continue; const i = world.idx(x, y); const g = world.ground.get(i); if (!g) continue; let any = false; for (const k in g) if (g[k] > 0 && pred(k)) { any = true; break; } if (!any) continue; const d = LW.dist(a.x, a.y, x + 0.5, y + 0.5); if (d < bd) { bd = d; best = i; } } return best; }
  function nearestGround(world, a, maxD) { return nearestGroundBy(world, a, maxD, () => true); }
  function nearestGroundFood(world, a, maxD) { return nearestGroundBy(world, a, maxD, (k) => LW.ITEMS[k] && LW.ITEMS[k].food); }
  function findHouseholdSite(c, a) { for (const b of c.world.buildingsNear(a.x | 0, a.y | 0, 40)) { if (b.progress >= 1) continue; const def = Bld().def(b); if (def.divine) continue; if (b.ownerId === a.id) continue; if (def.public && LW.dist(a.x, a.y, b.x, b.y) < 18 && (c.world.tick + a.id) % 3 === 0) return b; const owner = c.world.agents.get(b.ownerId); if (!owner) continue; if (a.partner === owner.id || c.household.includes(owner)) if (LW.dist(a.x, a.y, b.x, b.y) < 40) return b; } return null; }
  function buildPlan(c, a, kind) {
    const pubk = !!Bld().DEFS[kind].public; let site = c.world.buildingsNear(a.x | 0, a.y | 0, 24).find((b) => b.kind === kind && b.progress < 1 && (b.ownerId === a.id || (pubk && LW.dist(a.x, a.y, b.x, b.y) < 20)));
    if (!site) { const i = Bld().findSite(c.world, a, kind); if (i < 0) return null; return { steps: [{ op: 'moveTo', i, near: 1 }, { op: 'buildNew', kind, i }], tag: 'build:' + kind, kind }; }
    return buildPlanFor(c, a, site);
  }
  function buildPlanFor(c, a, site) {
    const m = Bld().missing(site); const steps = []; const mine = {}; let needAcq = {};
    for (const k in m) { const have = a.inv[k] || 0; if (have > 0) mine[k] = Math.min(have, m[k]); else needAcq[k] = Math.min(m[k], 6); }
    if (count(mine) === 0 && count(needAcq) > 0) { const one = {}; const k = Object.keys(needAcq)[0]; one[k] = needAcq[k]; const acq = acquireSteps(c.world, a, one, c); if (!acq) return null; steps.push(...acq); }
    steps.push({ op: 'moveTo', i: Bld().approach(c.world, a, site), near: 1 });
    if (count(m) > 0) steps.push({ op: 'deliver', bid: site.id });
    steps.push({ op: 'build', bid: site.id });
    return { steps, tag: 'build:' + site.kind, kind: site.kind };
  }
  function exploreTarget(world, a) {
    const rng = world.rng; let best = null, bs = -1e9;
    for (let k = 0; k < 8; k++) {
      const ang = rng.range(0, Math.PI * 2), d = rng.range(7, 16); const x = LW.clamp(Math.round(a.x + Math.cos(ang) * d), 1, world.w - 2), y = LW.clamp(Math.round(a.y + Math.sin(ang) * d), 1, world.h - 2);
      const i = world.idx(x, y); if (!world.isPassable(i)) continue;
      let known = 0; for (const v of a.knowledge.places.values()) if (Math.abs(world.xOf(v.i) - x) <= 5 && Math.abs(world.yOf(v.i) - y) <= 5) known++;
      const s = -known + rng.f() * 2 - (world.tiles.danger[i] / 255) * (1 - a.personality.bravery) * 3 - (a.home != null ? LW.dist(x, y, world.buildings.get(a.home)?.x ?? x, world.buildings.get(a.home)?.y ?? y) * 0.05 : 0);
      if (s > bs) { bs = s; best = i; }
    }
    return best;
  }

  const Brain = {
    GOALS,
    /** Decide (or keep) a plan. */
    decide(world, a, force) {
      _tileNearAgent = a;
      const ctx = context(world, a);
      const cand = []; const sigma = world.cfg.agents.noiseSigma * (1 + a.emotions.stress);
      const fs = a.failStreak; if (a.plan && a.plan.failed) { if (fs && fs.goal === a.plan.goal && world.tick - fs.tick < 48) { fs.count++; fs.tick = world.tick; } else a.failStreak = { goal: a.plan.goal, count: 1, tick: world.tick }; }
      for (const id in GOALS) {
        const g = GOALS[id];
        try { if (!g.applicable(ctx, a)) continue; } catch (e) { continue; }
        let [s, factors] = g.score(ctx, a); if (!(s > 0)) continue;
        if (a.failStreak && a.failStreak.goal === id && a.failStreak.count >= 3 && world.tick - a.failStreak.tick < 32) { s *= 0.3; factors = [...factors, `sorra kudarc (×${a.failStreak.count})`]; }
        if (a.nudge && a.nudge.goal === id && world.tick < a.nudge.until) { if (a.nudge.strong) { s = s * 3 + 1.2; factors = [...factors, 'a Teremtő szava']; } else { s = s * 1.4 + 0.25; factors = [...factors, 'a hang sugallata']; } } // a Teremtő szava: parancs (teljes engedelmesség) vagy sugallat
        s += world.rng.gauss(0, sigma);
        cand.push({ id, s, factors });
      }
      cand.sort((x, y) => y.s - x.s);
      const current = a.plan;
      // hysteresis: keep the current plan unless clearly beaten (compared against its *fresh* score)
      if (current && !force && !current.done && cand.length && cand[0].id !== current.goal) {
        const fresh = cand.find((c) => c.id === current.goal); const curScore = fresh ? fresh.s : 0;
        const urgent = cand[0].s > 1.2 && ['drink', 'eat', 'flee', 'getWarm', 'careForChild'].includes(cand[0].id);
        if (!urgent && cand[0].s < curScore * 1.4 + 0.15 && (world.tick - current.startedTick) < 300) { current.score = curScore; return current; }
      }
      for (const c of cand) {
        if (current && !current.done && c.id === current.goal && !force) { current.score = c.s; return current; }
        let plan = null; try { plan = GOALS[c.id].plan(ctx, a); } catch (e) { plan = null; }
        if (!plan) continue;
        plan.goal = c.id; plan.score = c.s; plan.i = 0; plan.startedTick = world.tick; plan.done = false; plan.priority = plan.priority ?? 1; plan.stuck = 0;
        a.why = { tick: world.tick, chosen: { goal: c.id, score: c.s, factors: c.factors }, alternatives: cand.filter((x) => x.id !== c.id).slice(0, 5).map((x) => ({ goal: x.id, score: x.s, factors: x.factors })), context: { hunger: 1 - a.needs.food, thirst: 1 - a.needs.water, tired: 1 - a.needs.energy, cold: 1 - a.needs.warmth, danger: ctx.danger, night: ctx.night, feels: Math.round(ctx.effTemp) } };
        if (a.sleeping && plan.goal !== 'sleep') a.sleeping = false;
        a.plan = plan; return plan;
      }
      a.plan = null; return null;
    },
    /** Whether the brain should think now. */
    shouldDecide(world, a) {
      const p = a.plan;
      if (!p || p.done) return true;
      if (a.sleeping) return a.danger > 0.4 || a.needs.food < 0.06 || a.needs.water < 0.08 || a.needs.warmth < 0.1;
      if (a.danger > 0.5 && p.goal !== 'flee') return true;
      if (a.divineRequest && p.goal !== 'divine' && a.divineRequest.force) return true;
      if ((world.tick - a.lastDecisionTick) >= world.cfg.agents.decisionInterval && p.priority < 2) return true;
      return false;
    },
    describeGoal(id) { return LW.HU.goalVerb(id); },
  };
  LW.Brain = Brain;
})(globalThis.LW || (globalThis.LW = {}));
