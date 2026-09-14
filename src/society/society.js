/* LEVENTE — THE CREATOR · society/society.js — a közösség napi rendszerei
 * Kutak (víz a településen), írott tudás (levéltár, könyvtár, nyomda, hálózat: a tudás nem hal meg a tudóval),
 * szentélyek és templomok (hit, félelem), piac (a felesleg a rászorulóhoz), vezetők, iskola, kórház, erőmű,
 * gyümölcsös és karám hozama, a Világmag. Minden naponta fut; a makró-szimulációban is.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME; const A = () => LW.Agents; const Bld = () => LW.Buildings;
  const b01 = (v) => LW.clamp01(v);

  const Society = {
    daily(world) {
      const w = world, rng = w.rng; const Bd = Bld().DEFS;
      { const t = w.tiles; const list = []; for (let i = 0; i < w.w * w.h; i++) if (t.depType[i] && t.depKnown[i]) list.push(i); w._knownDeposits = list; }
      const done = new Set();
      for (const b of w.buildings.values()) {
        if (b.progress < 1) continue; const def = Bd[b.kind]; if (!def) continue;
        const near = def.water || def.records || def.shrine || def.school || def.hospital || def.market || def.pasture || def.power || def.produce || def.joy || def.hygiene || def.spaceport || def.bank ? w.agentsNear(b.x + 0.5, b.y + 0.5, 12) : null;
        // termelő középület (méhes, halastó, üvegház, vertikális farm): évszaktól függetlenül a közös raktárba dolgozik
        if (def.produce && b.storage) { const cap = def.storage || 60; for (const k in def.produce) b.storage[k] = Math.min(cap, (b.storage[k] || 0) + def.produce[k] * (near.length ? 1 : 0.3)); }
        // erőmű: fény, meleg és gépek a környéken (a hatás a Tree.fx-ben); csatorna, víztorony: kevesebb kór
        if (def.hygiene) for (const a of near) { if (a.ill > 0 && rng.chance(0.1 * def.hygiene)) a.ill = Math.max(0, a.ill - 2); }
        // színház, stadion, mozi, múzeum: közös öröm; néha ünnep
        if (def.joy) { for (const a of near) { a.emotions.joy = b01(a.emotions.joy + 0.01 * def.joy); a.needs.social = b01(a.needs.social + 0.02); a.emotions.loneliness = Math.max(0, a.emotions.loneliness - 0.02); } if (near.length >= 6 && rng.chance(0.03) && w.tick - (b.lastShow || -1e9) > T.TICKS_PER_DAY * 20) { b.lastShow = w.tick; const s = LW.Settlements.at(w, b.x, b.y); w.events.emit('Festival', { tick: w.tick, place: s ? s.name : null, kind: b.kind, n: near.length, tile: w.idx(b.x, b.y) }); for (const a of near) { a.emotions.joy = b01(a.emotions.joy + 0.15); a.emotions.stress = Math.max(0, a.emotions.stress - 0.1); } } }
        // űrkikötő: indítások; ha van kolónia-tudás, néhányan elmennek, és nem jönnek vissza
        if (def.spaceport) LW.Frontier.spaceport(w, b, near);
        // kút: mindenki tudja a közelben, hogy itt víz van
        if (def.water) for (const a of near) A().rememberPlace(w, a, 'water', w.idx(b.x, b.y), 255);
        // írott tudás: aki tud írni, lejegyzi; aki tud olvasni, megtanulja
        if (def.records) {
          b.records = b.records || []; const writers = near.filter((a) => a.knowledge.techs.has('writing')); const recSet = new Set(b.records);
          for (const a of writers.slice(0, 12)) for (const id of a.knowledge.techs) { const d = LW.Tech.D[id]; if (!d || d.hidden || recSet.has(id)) continue; if (rng.chance(0.25 * def.records)) { b.records.push(id); recSet.add(id); if (!w.firsts['record']) w.events.emit('RecordWritten', { tick: w.tick, agentId: a.id, tech: id, buildingId: b.id, tile: w.idx(b.x, b.y) }); } }
          for (const a of writers) { if (a.knowledge.techs.size >= b.records.length || (a.knowledge.techs.size > 60 && rng.chance(0.5))) continue; const cand = b.records.filter((id) => !a.knowledge.techs.has(id) && LW.Tech.D[id] && (!LW.Tech.D[id].prereq || LW.Tech.D[id].prereq.every((p) => a.knowledge.techs.has(p)))); if (!cand.length) continue; const id = rng.pick(cand); if (rng.chance(0.05 * def.records * (0.5 + a.personality.intelligence) * LW.Tech.mult(w, a, 'teach'))) { LW.Tech.learn(w, a, id, 'read'); A().memory(w, a, { type: 'learn', text: `olvastam róla: ${LW.Tech.D[id].name.toLowerCase()}`, importance: 0.5, emotion: 'excitement', intensity: 0.4, tech: id }); } }
        }
        // szentély, templom: a hit rendeződik, a félelem csillapul; néha szertartás
        if (def.shrine) { for (const a of near) { a.beliefs.creator = b01(a.beliefs.creator + 0.004 * def.shrine); a.emotions.fear = Math.max(0, a.emotions.fear - 0.03); a.emotions.joy = b01(a.emotions.joy + 0.01); a.needs.social = b01(a.needs.social + 0.03); } if (near.length >= 3 && rng.chance(0.08) && w.tick - (b.lastRite || -1e9) > T.TICKS_PER_DAY * 12) { b.lastRite = w.tick; const s = LW.Settlements.at(w, b.x, b.y); w.events.emit('Ritual', { tick: w.tick, agentId: rng.pick(near).id, place: s ? s.name : null, n: near.length, tile: w.idx(b.x, b.y), temple: def.shrine >= 2 }); for (const a of near) { LW.Speech.say(w, a, null, [rng.pick(['creator', 'sky', 'voice']), rng.pick(['good', 'give', 'we'])]); a.beliefs.creator = b01(a.beliefs.creator + 0.05); } } }
        // iskola: a gyerekek nem csak a szüleiktől tanulnak
        if (def.school) { const adults = near.filter((a) => A().isAdult(w, a)); const kids = near.filter((a) => !A().isAdult(w, a) && A().stage(w, a) !== 'infant'); for (const k of kids) { if (!adults.length) break; const t = rng.pick(adults); const cand = [...t.knowledge.techs].filter((id) => !k.knowledge.techs.has(id) && !LW.Tech.D[id].hidden && (!LW.Tech.D[id].prereq || LW.Tech.D[id].prereq.every((p) => k.knowledge.techs.has(p)))); if (cand.length && rng.chance(0.12 * def.school * (0.5 + k.personality.intelligence))) LW.Tech.learn(w, k, rng.pick(cand), 'taught', t); } }
        // kórház
        if (def.hospital) for (const a of near) { a.injury = Math.max(0, a.injury - 0.03); a.health = Math.min(1 - a.injury, a.health + 0.04); }
        // piac: a felesleg a rászorulóhoz, a felesleg gazdája gazdagszik
        if (def.market || def.bank) this.market(w, b, near);
        // karám: tej és gyapjú; gyümölcsös termése a farm-lépésben
        if (def.pasture && b.ownerId != null) { const o = w.agents.get(b.ownerId); if (o) { const home = o.home != null ? w.buildings.get(o.home) : null; const st = home && home.storage ? home.storage : o.inv; if (rng.chance(0.6)) st.milk = Math.min((st.milk || 0) + 2, 12); if (rng.chance(0.15)) st.wool = Math.min((st.wool || 0) + 1, 20); if (rng.chance(0.06)) st.meat_raw = Math.min((st.meat_raw || 0) + 2, 10); if (rng.chance(0.08)) st.hide = Math.min((st.hide || 0) + 1, 12); } }
        // Világmag: ők is teremtettek
        if (def.simulation && !done.has('sim')) { done.add('sim'); b.worlds = (b.worlds || 0); if (rng.chance(0.02)) { b.worlds++; w.events.emit('WorldSimulated', { tick: w.tick, buildingId: b.id, n: b.worlds, tile: w.idx(b.x, b.y) }); } }
      }
      this.leaders(w);
      LW.Civilization.daily(w);
      LW.Frontier.daily(w);
      if (LW.Tree.futureStep) LW.Tree.futureStep(w);
    },
    market(w, b, near) {
      const rng = w.rng; const donors = [], needy = []; let trade = 0, welfare = false;
      for (const a of near) { const f = LW.Tech.fx(w, a); if (f.trade > trade) trade = f.trade; if (a.knowledge.techs.has('welfare_state')) welfare = true; const home = a.home != null ? w.buildings.get(a.home) : null; if (a.needs.food < 0.4 && A().foodUnits(a.inv) < 0.5) needy.push(a); else if (home && home.storage && A().foodUnits(home.storage) > 6 - Math.min(3, trade * 4)) donors.push({ a, st: home.storage }); }
      if (b.storage) donors.push({ a: null, st: b.storage }); // a piac és a bank közös készlete is oszt
      for (const n of needy) { if (!donors.length) break; const d = donors[rng.int(0, donors.length - 1)]; for (const k of Object.keys(d.st)) { const it = LW.ITEMS[k]; if (!it || !it.food || d.st[k] <= 0) continue; const q = Math.min(d.st[k], 2 + Math.round(trade * 2)); d.st[k] -= q; if (d.st[k] <= 0) delete d.st[k]; A().addItem(w, n, k, q); if (!welfare) n.wealth = (n.wealth || 0) - q; if (d.a) { d.a.wealth = (d.a.wealth || 0) + q + (trade > 0.3 ? 1 : 0); const r = LW.Relationships.ensure(w, n, d.a); r.gratitude = b01(r.gratitude + 0.05); } break; } }
      if (trade > 0 && rng.chance(Math.min(0.5, trade))) for (const a of near) if (A().isAdult(w, a) && (a.wealth || 0) > 2 && rng.chance(0.2)) a.wealth += 1; // a kereskedelem gazdagít
      b.trades = (b.trades || 0) + needy.length;
    },
    /** Vezetők: ahol van törzsi tanács, a legtekintélyesebb ember vezet. */
    leaders(w) {
      for (const s of w.settlements.values()) {
        if (s.abandonedTick) { s.leaderId = null; continue; }
        const people = w.agentsNear(s.x + 0.5, s.y + 0.5, w.cfg.settlements.clusterRadius + 6).filter((a) => A().isAdult(w, a));
        if (people.length < 4 || !people.some((a) => a.knowledge.techs.has('tribal_council'))) { s.leaderId = null; continue; }
        const cur = s.leaderId != null ? w.agents.get(s.leaderId) : null;
        // népuralom: ahol a többség ismeri, a vezetőt szavazással választják, négyévente újra
        const democracy = people.filter((a) => a.knowledge.techs.has('democracy')).length * 2 > people.length;
        if (democracy) { if (cur && people.includes(cur) && w.tick - (s.leaderSince || 0) < T.TICKS_PER_YEAR * 4) { cur.occupation = 'leader'; continue; } }
        else if (cur && people.includes(cur) && w.tick - (s.leaderSince || 0) < T.TICKS_PER_YEAR * 3 && w.rng.chance(0.97)) { cur.occupation = 'leader'; continue; }
        let best = null, bs = -1, votes = 0;
        if (democracy) { const tally = new Map(); for (const o of people) { let pick = null, ps = -1e9; for (const a of people) { if (a === o) continue; const r = o.relationships.get(a.id); const sc = (r ? r.respect + r.friendship * 0.6 + r.trust * 0.3 - r.resentment - (r.fear || 0) * 0.5 : 0) + a.personality.sociability * 0.2 + (a.id === s.leaderId ? 0.15 : 0) + w.rng.f() * 0.2; if (sc > ps) { ps = sc; pick = a; } } if (pick) tally.set(pick.id, (tally.get(pick.id) || 0) + 1); } for (const [id, n] of tally) if (n > bs) { bs = n; best = w.agents.get(id); } votes = bs; }
        else for (const a of people) { let respect = 0; for (const o of people) { const r = o.relationships.get(a.id); if (r) respect += r.respect + r.friendship * 0.5 - r.resentment; } const s2 = a.personality.dominance * 2 + a.personality.sociability + respect * 0.5 + Math.min(1, LW.Time.ageYears(a.bornTick, w.tick) / 50) + a.importance * 0.02 + (a.knowledge.techs.has('law_code') ? 0.5 : 0); if (s2 > bs) { bs = s2; best = a; } }
        if (best && (best.id !== s.leaderId || democracy)) { const re = best.id === s.leaderId; if (cur && cur.occupation === 'leader' && !re) cur.occupation = null; s.leaderId = best.id; s.leaderSince = w.tick; best.occupation = 'leader'; if (!re) { best.importance += 1; best.emotions.pride = b01(best.emotions.pride + 0.5); } if (democracy) w.events.emit('Election', { tick: w.tick, agentId: best.id, place: s.name, votes, of: people.length, again: re, tile: w.idx(s.x | 0, s.y | 0) }); else w.events.emit('LeaderChosen', { tick: w.tick, agentId: best.id, place: s.name, tile: w.idx(s.x | 0, s.y | 0) }); if (!re) A().memory(w, best, { type: 'status', text: democracy ? `${s.name} megválasztott vezetője lettem` : `${s.name} vezetője lettem`, importance: 0.9, emotion: 'pride', intensity: 0.8 }); }
      }
    },
    /** Szüksége van-e a közösségnek erre a középületre a közelben? (nincs még, elég ember van hozzá) */
    wants(world, a, kind) {
      const def = Bld().DEFS[kind]; if (!def || !def.public) return 0;
      if (def.tech && !a.knowledge.techs.has(def.tech)) return 0;
      const s = LW.Settlements.at(world, a.x, a.y); const pop = Math.max(s ? s.population : 0, world.agentsNear(a.x, a.y, 12, a.id).length + 1, Math.round(world.population * 0.7));
      if ((def.minPop || 1) > pop) return 0;
      for (const b of world.buildingsNear(a.x | 0, a.y | 0, 16)) if (b.kind === kind) { if (b.progress < 1) return 1.4; if (!def.bridge) return 0; } // a félkész középületet be kell fejezni; hídból több is kellhet
      if (def.bridge) return LW.Crossings.want(world, a, kind);
      let want = 0.5;
      if (def.want === 'trade') want += Math.min(1, (a.wealth || 0) / 10) * 0.6 + a.personality.greed * 0.4 + a.personality.ambition * 0.2; if (def.want === 'joy') want += (1 - a.emotions.joy) * 0.8 + a.emotions.stress * 0.4 + a.personality.sociability * 0.3;
      if (def.want === 'food') { want += (1 - a.needs.food) * 1.2 + 0.2; const hungry = world.agentsNear(a.x, a.y, 12, a.id).filter((o) => o.needs.food < 0.4).length; want += Math.min(0.6, hungry * 0.1); } if (def.want === 'water') want += (LW.Agents.nearestPoi(world, a, 'water') ? (LW.Agents.nearestPoi(world, a, 'water').d > 8 ? 0.6 : 0.1) : 1); if (def.want === 'belief') want += a.beliefs.creator * 0.8; if (def.want === 'knowledge') want += a.personality.curiosity * 0.6 + a.personality.intelligence * 0.3; if (def.want === 'health') want += (1 - a.health) * 0.8; if (def.want === 'safety') { want += (1 - a.needs.safety) * 0.5 + a.emotions.fear * 0.5; const s2 = LW.Settlements.at(world, a.x, a.y); if (s2 && (s2.warWith || (s2.rivalry && Object.values(s2.rivalry).some((v) => v > 0.5)))) want += 0.6; }
      if (def.furnace || def.workshop || def.lab || def.factory || def.computer) want += a.personality.creativity * 0.5 + a.personality.ambition * 0.3;
      // hiányzó hely: aki tudja, mire kellene (elérhető felfedezés vagy ismert recept), az akarja
      const day = world.tick / T.TICKS_PER_DAY | 0;
      if (a._needDay !== day) { a._needDay = day; const need = {}; for (const id of LW.Tech.eligible(world, a)) { const nb = LW.Tech.D[id].nearby; if (nb && nb !== 'fire' && nb !== 'water') need[nb] = (need[nb] || 0) + 0.5; } for (const rid in LW.Tech.RECIPES) { const R = LW.Tech.RECIPES[rid]; if (R.nearby && R.nearby !== 'fire' && R.nearby !== 'water' && a.knowledge.techs.has(R.tech)) need[R.nearby] = (need[R.nearby] || 0) + 0.25; } a._need = need; }
      let boost = 0; for (const k in a._need) if (k === kind || def[k]) boost += a._need[k]; want += Math.min(1.5, boost);
      return want;
    },
    /** Melyik középületet kezdje el ma: a vágyak közül súlyozott véletlennel (nem mindig a legnagyobb — sokféle kell). */
    pickPublic(world, a) {
      const DEFS = Bld().DEFS; const cands = []; let sum = 0;
      for (const k in DEFS) { if (!DEFS[k].public) continue; const wnt = this.wants(world, a, k); if (wnt > 0.5) { const wt = wnt * wnt; cands.push([k, wnt, wt]); sum += wt; } }
      if (!cands.length) return null; let r = world.rng.f() * sum; for (const c of cands) { r -= c[2]; if (r <= 0) return { kind: c[0], want: c[1] }; } return { kind: cands[cands.length - 1][0], want: cands[cands.length - 1][1] };
    },
  };
  LW.Society = Society;
})(globalThis.LW || (globalThis.LW = {}));
