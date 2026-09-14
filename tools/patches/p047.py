# p047 — az új hatások bekötése: termékenység, élettartam, biztonság, jólét (emberek); diplomácia, hadierő, atomcsapás
# (államok); választás, kereskedelem, jóléti állam, termelő épületek, erőmű (közösség); közös raktárból evés a makróban;
# krónika-szövegek az új eseményekhez
PATCHES = [
('src/agents/agent.js', [
("""      const maxHealth = Math.max(0.2, 1 - a.injury - Math.max(0, this.age(world, a) - a.genes.physiology.longevity + 10) * 0.02);""",
 """      const maxHealth = Math.max(0.2, 1 - a.injury - Math.max(0, this.age(world, a) - a.genes.physiology.longevity - (LW.Tech.fx(world, a).longevity || 0) + 10) * 0.02);"""),
("""      const age = this.age(world, a); const lon = a.genes.physiology.longevity;
      if (age > lon - 10 && rng.chance(0.00025 * Math.exp((age - lon) / 5))) { this.die(world, a, 'öregség'); return; }""",
 """      const tfx = LW.Tech.fx(world, a);
      const age = this.age(world, a); const lon = a.genes.physiology.longevity + (tfx.longevity || 0); // az orvoslás évekkel tolja ki az öregséget
      if (age > lon - 10 && rng.chance(0.00025 * Math.exp((age - lon) / 5))) { this.die(world, a, 'öregség'); return; }
      if (tfx.happiness) { const hp = tfx.happiness; a.emotions.joy = LW.clamp01(a.emotions.joy + 0.02 * hp); a.emotions.stress = LW.clamp01(a.emotions.stress - 0.02 * hp); a.emotions.sadness = LW.clamp01(a.emotions.sadness - 0.01 * hp); } // a kultúra, a jólét (vagy a hangos világ) napról napra formál"""),
("""      if (a.threat) d = Math.max(d, 0.7);
      return LW.clamp01(d);""",
 """      if (a.threat) d = Math.max(d, 0.7);
      const safe = LW.Tech.fx(world, a).safety || 0; if (safe > 0) d *= 1 - Math.min(0.7, safe * 0.4); // őrség, törvény, biztosítás: kevesebb a félnivaló
      return LW.clamp01(d);"""),
("""      const p = world.cfg.agents.fertilityBase * blessed * mother.genes.physiology.fertility * father.genes.physiology.fertility""",
 """      const p = world.cfg.agents.fertilityBase * blessed * Math.max(0.25, 1 + (LW.Tech.fx(world, mother).fertility || 0)) * mother.genes.physiology.fertility * father.genes.physiology.fertility"""),
]),
('src/society/civilization.js', [
("""        t += 0.0025 * (dom * 1.5 + resent + hunger * 0.8) - (sameLang ? 0.0012 : 0) - (markets ? 0.0015 : 0) - 0.0006; t = LW.clamp(t, 0, 1.2);""",
 """        const dip = ((LW.Tech.fx(w, la).diplomacy || 0) + (LW.Tech.fx(w, lb).diplomacy || 0)) / 2; // követek, szerződések, közös játékok, elrettentés
        t += 0.0025 * (dom * 1.5 + resent + hunger * 0.8) * Math.max(0.2, 1 - dip) - (sameLang ? 0.0012 : 0) - (markets ? 0.0015 : 0) - 0.0006 - dip * 0.001; t = LW.clamp(t, 0, 1.2);"""),
("""      const str = (list, s) => list.reduce((acc, p) => acc + p.personality.bravery + p.personality.aggression * 0.5 + LW.Tree.bestTool(p, 'hunt') * 0.6 + p.health, 0) * rng.range(0.7, 1.3) * (1 + wallOf(s) * 0.25); // a fal védi az otthon harcolókat""",
 """      const warOf = (s) => { const l = s.leaderId != null ? w.agents.get(s.leaderId) : null; return l ? (LW.Tech.fx(w, l).war || 0) : 0; }; // lovasság, tüzérség, páncélosok: az állam hadereje
      const str = (list, s) => list.reduce((acc, p) => acc + p.personality.bravery + p.personality.aggression * 0.5 + LW.Tree.bestTool(p, 'hunt') * 0.6 + p.health, 0) * rng.range(0.7, 1.3) * (1 + wallOf(s) * 0.25) * (1 + warOf(s)); // a fal védi az otthon harcolókat
      { const la = a.leaderId != null ? w.agents.get(a.leaderId) : null, lb = b.leaderId != null ? w.agents.get(b.leaderId) : null; if (la && lb && la.knowledge.techs.has('nuclear_weapons') && lb.knowledge.techs.has('nuclear_weapons') && rng.chance(0.06)) { this.nuclear(w, a, b); return; } }"""),
("""    // ---------------------------------------------------------------- vállalatok: a vagyon szervezi a termelést""",
 """    /** Atomcsapás: a háború egyetlen nap alatt véget ér, és senki sem nyer. A félelem nemzedékekre megmarad. */
    nuclear(w, a, b) {
      const rng = w.rng; const target = rng.chance(0.5) ? a : b; const other = target === a ? b : a;
      const victims = w.agentsNear(target.x + 0.5, target.y + 0.5, 12); let dead = 0;
      for (const p of victims) { if (rng.chance(0.45)) { A().damage(w, p, rng.range(0.6, 1.2), `atomcsapás (${other.name})`); if (!w.agents.has(p.id)) dead++; } else { p.injury = Math.min(0.9, p.injury + 0.3); p.ill = Math.max(p.ill || 0, rng.int(10, 40)); } }
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const x = (target.x | 0) + dx, y = (target.y | 0) + dy; if (!w.inBounds(x, y)) continue; const i = w.idx(x, y); if (dx * dx + dy * dy > 36) continue; w.tiles.burnt[i] = 255; w.tiles.veg[i] = 0; w.tiles.trees[i] = Math.min(w.tiles.trees[i], 10); w.tiles.fert[i] = Math.max(0, w.tiles.fert[i] - 120); w.dirtyTiles.add(i); }
      for (const bld of w.buildingsNear(target.x | 0, target.y | 0, 6)) if (rng.chance(0.7)) LW.Buildings.destroy(w, bld, 'atomcsapás');
      for (const p of w.agents.values()) { p.emotions.fear = b01(p.emotions.fear + 0.6); p.emotions.grief = b01(p.emotions.grief + 0.3); A().memory(w, p, { type: 'war', text: `atomcsapás érte ${target.name} városát — a világ megváltozott`, importance: 0.95, emotion: 'fear', intensity: 0.9 }); }
      a.warWith = null; b.warWith = null; a.rivalry = a.rivalry || {}; b.rivalry = b.rivalry || {}; a.rivalry[String(b.id)] = 0; b.rivalry[String(a.id)] = 0;
      w.events.emit('NuclearStrike', { tick: w.tick, place: target.name, other: other.name, dead, tile: w.idx(target.x | 0, target.y | 0) });
      w.events.emit('WarEnded', { tick: w.tick, place: other.name, other: target.name, decisive: false, tile: w.idx(other.x | 0, other.y | 0) });
    },
    // ---------------------------------------------------------------- vállalatok: a vagyon szervezi a termelést"""),
]),
('src/society/society.js', [
("""        const near = def.water || def.records || def.shrine || def.school || def.hospital || def.market || def.pasture || def.power ? w.agentsNear(b.x + 0.5, b.y + 0.5, 12) : null;""",
 """        const near = def.water || def.records || def.shrine || def.school || def.hospital || def.market || def.pasture || def.power || def.produce || def.joy || def.hygiene || def.spaceport ? w.agentsNear(b.x + 0.5, b.y + 0.5, 12) : null;
        // termelő középület (méhes, halastó, üvegház, vertikális farm): évszaktól függetlenül a közös raktárba dolgozik
        if (def.produce && b.storage) { const cap = def.storage || 60; for (const k in def.produce) b.storage[k] = Math.min(cap, (b.storage[k] || 0) + def.produce[k] * (near.length ? 1 : 0.3)); }
        // erőmű: fény, meleg és gépek a környéken (a hatás a Tree.fx-ben); csatorna, víztorony: kevesebb kór
        if (def.hygiene) for (const a of near) { if (a.ill > 0 && rng.chance(0.1 * def.hygiene)) a.ill = Math.max(0, a.ill - 2); }
        // színház, stadion, mozi, múzeum: közös öröm; néha ünnep
        if (def.joy) { for (const a of near) { a.emotions.joy = b01(a.emotions.joy + 0.01 * def.joy); a.needs.social = b01(a.needs.social + 0.02); a.emotions.loneliness = Math.max(0, a.emotions.loneliness - 0.02); } if (near.length >= 6 && rng.chance(0.03) && w.tick - (b.lastShow || -1e9) > T.TICKS_PER_DAY * 20) { b.lastShow = w.tick; const s = LW.Settlements.at(w, b.x, b.y); w.events.emit('Festival', { tick: w.tick, place: s ? s.name : null, kind: b.kind, n: near.length, tile: w.idx(b.x, b.y) }); for (const a of near) { a.emotions.joy = b01(a.emotions.joy + 0.15); a.emotions.stress = Math.max(0, a.emotions.stress - 0.1); } } }
        // űrkikötő: indítások; ha van kolónia-tudás, néhányan elmennek, és nem jönnek vissza
        if (def.spaceport) LW.Frontier.spaceport(w, b, near);"""),
("""        if (def.market) this.market(w, b, near);""",
 """        if (def.market || def.bank) this.market(w, b, near);"""),
("""      const rng = w.rng; const donors = [], needy = [];
      for (const a of near) { const home = a.home != null ? w.buildings.get(a.home) : null; if (a.needs.food < 0.4 && A().foodUnits(a.inv) < 0.5) needy.push(a); else if (home && home.storage && A().foodUnits(home.storage) > 6) donors.push({ a, st: home.storage }); }
      for (const n of needy) { if (!donors.length) break; const d = donors[rng.int(0, donors.length - 1)]; for (const k of Object.keys(d.st)) { const it = LW.ITEMS[k]; if (!it || !it.food || d.st[k] <= 0) continue; const q = Math.min(d.st[k], 2); d.st[k] -= q; if (d.st[k] <= 0) delete d.st[k]; A().addItem(w, n, k, q); n.wealth = (n.wealth || 0) - q; d.a.wealth = (d.a.wealth || 0) + q; const r = LW.Relationships.ensure(w, n, d.a); r.gratitude = b01(r.gratitude + 0.05); break; } }""",
 """      const rng = w.rng; const donors = [], needy = []; let trade = 0, welfare = false;
      for (const a of near) { const f = LW.Tech.fx(w, a); if (f.trade > trade) trade = f.trade; if (a.knowledge.techs.has('welfare_state')) welfare = true; const home = a.home != null ? w.buildings.get(a.home) : null; if (a.needs.food < 0.4 && A().foodUnits(a.inv) < 0.5) needy.push(a); else if (home && home.storage && A().foodUnits(home.storage) > 6 - Math.min(3, trade * 4)) donors.push({ a, st: home.storage }); }
      if (b.storage) donors.push({ a: null, st: b.storage }); // a piac és a bank közös készlete is oszt
      for (const n of needy) { if (!donors.length) break; const d = donors[rng.int(0, donors.length - 1)]; for (const k of Object.keys(d.st)) { const it = LW.ITEMS[k]; if (!it || !it.food || d.st[k] <= 0) continue; const q = Math.min(d.st[k], 2 + Math.round(trade * 2)); d.st[k] -= q; if (d.st[k] <= 0) delete d.st[k]; A().addItem(w, n, k, q); if (!welfare) n.wealth = (n.wealth || 0) - q; if (d.a) { d.a.wealth = (d.a.wealth || 0) + q + (trade > 0.3 ? 1 : 0); const r = LW.Relationships.ensure(w, n, d.a); r.gratitude = b01(r.gratitude + 0.05); } break; } }
      if (trade > 0 && rng.chance(Math.min(0.5, trade))) for (const a of near) if (A().isAdult(w, a) && (a.wealth || 0) > 2 && rng.chance(0.2)) a.wealth += 1; // a kereskedelem gazdagít"""),
("""        const cur = s.leaderId != null ? w.agents.get(s.leaderId) : null;
        if (cur && people.includes(cur) && w.tick - (s.leaderSince || 0) < T.TICKS_PER_YEAR * 3 && w.rng.chance(0.97)) { cur.occupation = 'leader'; continue; }
        let best = null, bs = -1; for (const a of people) { let respect = 0; for (const o of people) { const r = o.relationships.get(a.id); if (r) respect += r.respect + r.friendship * 0.5 - r.resentment; } const s2 = a.personality.dominance * 2 + a.personality.sociability + respect * 0.5 + Math.min(1, LW.Time.ageYears(a.bornTick, w.tick) / 50) + a.importance * 0.02 + (a.knowledge.techs.has('law_code') ? 0.5 : 0); if (s2 > bs) { bs = s2; best = a; } }
        if (best && best.id !== s.leaderId) { if (cur && cur.occupation === 'leader') cur.occupation = null; s.leaderId = best.id; s.leaderSince = w.tick; best.occupation = 'leader'; best.importance += 1; best.emotions.pride = b01(best.emotions.pride + 0.5); w.events.emit('LeaderChosen', { tick: w.tick, agentId: best.id, place: s.name, tile: w.idx(s.x | 0, s.y | 0) }); A().memory(w, best, { type: 'status', text: `${s.name} vezetője lettem`, importance: 0.9, emotion: 'pride', intensity: 0.8 }); }""",
 """        const cur = s.leaderId != null ? w.agents.get(s.leaderId) : null;
        // népuralom: ahol a többség ismeri, a vezetőt szavazással választják, négyévente újra
        const democracy = people.filter((a) => a.knowledge.techs.has('democracy')).length * 2 > people.length;
        if (democracy) { if (cur && people.includes(cur) && w.tick - (s.leaderSince || 0) < T.TICKS_PER_YEAR * 4) { cur.occupation = 'leader'; continue; } }
        else if (cur && people.includes(cur) && w.tick - (s.leaderSince || 0) < T.TICKS_PER_YEAR * 3 && w.rng.chance(0.97)) { cur.occupation = 'leader'; continue; }
        let best = null, bs = -1, votes = 0;
        if (democracy) { const tally = new Map(); for (const o of people) { let pick = null, ps = -1e9; for (const a of people) { if (a === o) continue; const r = o.relationships.get(a.id); const sc = (r ? r.respect + r.friendship * 0.6 + r.trust * 0.3 - r.resentment - (r.fear || 0) * 0.5 : 0) + a.personality.sociability * 0.2 + (a.id === s.leaderId ? 0.15 : 0) + w.rng.f() * 0.2; if (sc > ps) { ps = sc; pick = a; } } if (pick) tally.set(pick.id, (tally.get(pick.id) || 0) + 1); } for (const [id, n] of tally) if (n > bs) { bs = n; best = w.agents.get(id); } votes = bs; }
        else for (const a of people) { let respect = 0; for (const o of people) { const r = o.relationships.get(a.id); if (r) respect += r.respect + r.friendship * 0.5 - r.resentment; } const s2 = a.personality.dominance * 2 + a.personality.sociability + respect * 0.5 + Math.min(1, LW.Time.ageYears(a.bornTick, w.tick) / 50) + a.importance * 0.02 + (a.knowledge.techs.has('law_code') ? 0.5 : 0); if (s2 > bs) { bs = s2; best = a; } }
        if (best && (best.id !== s.leaderId || democracy)) { const re = best.id === s.leaderId; if (cur && cur.occupation === 'leader' && !re) cur.occupation = null; s.leaderId = best.id; s.leaderSince = w.tick; best.occupation = 'leader'; if (!re) { best.importance += 1; best.emotions.pride = b01(best.emotions.pride + 0.5); } if (democracy) w.events.emit('Election', { tick: w.tick, agentId: best.id, place: s.name, votes, of: people.length, again: re, tile: w.idx(s.x | 0, s.y | 0) }); else w.events.emit('LeaderChosen', { tick: w.tick, agentId: best.id, place: s.name, tile: w.idx(s.x | 0, s.y | 0) }); if (!re) A().memory(w, best, { type: 'status', text: democracy ? `${s.name} megválasztott vezetője lettem` : `${s.name} vezetője lettem`, importance: 0.9, emotion: 'pride', intensity: 0.8 }); }"""),
("""      if (def.want === 'food') { want += (1 - a.needs.food) * 1.2 + 0.2;""",
 """      if (def.want === 'trade') want += Math.min(1, (a.wealth || 0) / 10) * 0.6 + a.personality.greed * 0.4 + a.personality.ambition * 0.2; if (def.want === 'joy') want += (1 - a.emotions.joy) * 0.8 + a.emotions.stress * 0.4 + a.personality.sociability * 0.3;
      if (def.want === 'food') { want += (1 - a.needs.food) * 1.2 + 0.2;"""),
("""      this.leaders(w);
      LW.Civilization.daily(w);""",
 """      this.leaders(w);
      LW.Civilization.daily(w);
      LW.Frontier.daily(w);"""),
]),
('src/sim/macro.js', [
("""          else if (intake > 1.1 && LW.Buildings.def(home).storage) { const surplus = Math.floor((intake - 1) * 2); home.storage.berries = Math.min((LW.Buildings.def(home).storage || 0), (home.storage.berries || 0) + surplus); } }""",
 """          else if (intake > 1.1 && LW.Buildings.def(home).storage) { const surplus = Math.floor((intake - 1) * 2); home.storage.berries = Math.min((LW.Buildings.def(home).storage || 0), (home.storage.berries || 0) + surplus); } }
        if (intake < 0.9) for (const st of LW.Tree.storesNear(w, a, 16)) { for (const k of Object.keys(st.storage)) { const d = LW.ITEMS[k]; if (!d || !d.food || st.storage[k] <= 0) continue; const take = Math.min(st.storage[k], Math.ceil((1 - intake) / d.food)); st.storage[k] -= take; if (st.storage[k] <= 0) delete st.storage[k]; intake += take * d.food / 1.5; if (intake >= 1) break; } if (intake >= 1) break; } // üvegház, halastó, piac: a közös készlet is etet"""),
("""if (which && best > 0.5) { let site = [...w.buildings.values()].find((b) => b.kind === which && b.progress < 1 && LW.dist(b.x, b.y, a.x, a.y) < 20);""",
 """if (which && best > 0.5) { let site = w.buildingsNear(a.x | 0, a.y | 0, 20).find((b) => b.kind === which && b.progress < 1);"""),
]),
('src/history/history.js', [
("""        case 'LeaderChosen':""",
 """        case 'Election': return { text: ev.again ? `${ev.place} népe újraválasztotta ${n(ev.agentId)} vezetőjét (${ev.votes} szavazat a ${ev.of}-ből).` : `${ev.place} népe szavazott: ${n(ev.agentId)} lett a vezető (${ev.votes} szavazat a ${ev.of}-ből).`, base: ev.again ? 0.4 : 0.75, firstKey: 'election', firstTitle: 'Az első választás' };
        case 'CrossingBuilt': return { text: ev.tunnel ? `${n(ev.agentId)} emberei átfúrták a hegyet: ${ev.len} mező hosszú alagút${ev.joined ? ' — a túloldal végre elérhető' : ''}.` : `${n(ev.agentId)} emberei hidat vertek a vízen át (${ev.len} mező)${ev.joined ? ' — a sziget összekapcsolódott a világgal' : ''}.`, base: ev.joined ? 1.1 : 0.6, firstKey: ev.joined ? 'joined' : 'crossing:' + ev.kind, firstTitle: ev.joined ? (ev.tunnel ? 'Az első alagút két föld között' : 'Az első híd két föld között') : (ev.tunnel ? 'Az első alagút' : `Az első ${BD[ev.kind].label.toLowerCase()}`) };
        case 'Festival': return { text: `${ev.n} ember ünnepelt a ${BD[ev.kind].label.toLowerCase()}nál${ev.place ? ' (' + ev.place + ')' : ''}.`, base: 0.3, firstKey: 'festival', firstTitle: 'Az első ünnep' };
        case 'NuclearStrike': return { text: `Atomcsapás érte ${ev.place} városát (${ev.other} keze által): ${ev.dead} halott, kiégett föld. A háború egy nap alatt véget ért, és senki sem nyert.`, base: 1.6, firstKey: 'nuclear', firstTitle: 'A nap, amikor a világ megváltozott' };
        case 'Launch': return { text: `${ev.place ? ev.place + ' űrkikötőjéből' : 'Az űrkikötőből'} rakéta indult az ég felé${ev.crew ? ' — emberekkel a fedélzetén' : ''}.`, base: ev.crew ? 0.9 : 0.5, firstKey: ev.crew ? 'crewed' : 'launch', firstTitle: ev.crew ? 'Az első ember az űrkikötőből az égbe' : 'Az első indítás' };
        case 'ColonyLaunched': return { text: `${ev.n} telepes elhagyta a világot: ${ev.names} új életet kezd az égen túl. Nem jönnek vissza.`, base: 1.4, firstKey: 'colony', firstTitle: 'Az első telepesek, akik elhagyták a világot' };
        case 'MapRevealed': return { text: `A műholdak feltérképezték az egész világot: minden lelőhely és minden part ismert lett.`, base: 1.0, firstKey: 'satmap', firstTitle: 'A világ teljes térképe' };
        case 'AgentDeparted': return { text: `${n(ev.agentId)} ${Math.floor(ev.age)} évesen elhagyta a világot: ${ev.cause}.`, base: 0.6 };
        case 'LeaderChosen':"""),
]),
('src/manifest.json', [
("""    "society/civilization.js",""",
 """    "society/civilization.js",
    "society/frontier.js","""),
]),
]
