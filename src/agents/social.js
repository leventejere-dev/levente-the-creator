/* LEVENTE — THE CREATOR · agents/social.js — conversations, knowledge spread, rumors, romance, gifts, fights, breakups */
(function (LW) {
  'use strict';
  const A = () => LW.Agents, R = () => LW.Relationships, M = () => LW.Memory;
  const b01 = (v) => LW.clamp01(v);

  const Social = {
    interact(world, a, t, kind, st) {
      const ra = R().ensure(world, a, t), rt = R().ensure(world, t, a); ra.last = world.tick; rt.last = world.tick;
      switch (kind) {
        case 'converse': return this.converse(world, a, t, ra, rt);
        case 'flirt': return this.flirt(world, a, t, ra, rt);
        case 'mate': return this.mate(world, a, t, ra, rt);
        case 'fight': return this.fight(world, a, t, ra, rt);
        case 'teach': return this.teach(world, a, t, st.tech, ra, rt);
      }
    },
    converse(world, a, t, ra, rt) {
      const comp = R().compatibility(a, t); const humor = (a.personality.humor + t.personality.humor) / 2;
      a.needs.social = b01(a.needs.social + 0.35 * (0.6 + a.personality.sociability * 0.6)); t.needs.social = b01(t.needs.social + 0.3 * (0.6 + t.personality.sociability * 0.6));
      const wasFriend = ra.friendship >= 0.3;
      const dF = 0.03 * (0.5 + comp) * (1 + humor) - (ra.resentment > 0.4 ? 0.02 : 0);
      ra.friendship = b01(ra.friendship + dF); rt.friendship = b01(rt.friendship + dF * (0.8 + t.personality.empathy * 0.4)); ra.trust = b01(ra.trust + 0.01); rt.trust = b01(rt.trust + 0.01); ra.familiarity = b01(ra.familiarity + 0.05); rt.familiarity = b01(rt.familiarity + 0.05);
      a.emotions.joy = b01(a.emotions.joy + 0.05 * (1 + humor)); t.emotions.joy = b01(t.emotions.joy + 0.05 * (1 + humor)); a.emotions.loneliness *= 0.6; t.emotions.loneliness *= 0.6;
      a.counters.talks++; t.counters.talks++;
      if (!wasFriend && ra.friendship >= 0.3 && ra.status === 'stranger') { ra.status = 'acquaintance'; }
      if (ra.friendship >= 0.3 && rt.friendship >= 0.3 && ra.status !== 'family' && ra.status !== 'partner' && ra.status !== 'dating' && !ra.friendEvent) { ra.friendEvent = true; rt.friendEvent = true; world.events.emit('FriendshipFormed', { tick: world.tick, agentId: a.id, otherId: t.id, first: !world.firsts || !world.firsts['friendship'] }); }
      // szavak: aki beszél, szót talál vagy mutogat; a másik tanul, néha visszaszól
      LW.Speech.say(world, a, t); if (world.rng.chance(0.6)) LW.Speech.say(world, t, a);
      // knowledge transfer, either direction (a közös nyelv segít)
      this.transfer(world, a, t, ra); this.transfer(world, t, a, rt);
      // where things are: people tell each other about places
      for (const [x, y] of [[a, t], [t, a]]) { const pl = [...x.knowledge.places.values()]; for (let k = 0; k < 3 && pl.length; k++) { const p = world.rng.pick(pl); if (p.k !== 'fire') A().rememberPlace(world, y, p.k, p.i, p.q); } }
      // rumors & stories
      if (world.rng.chance(0.5)) { const m = M().pickToTell(world, a); if (m) M().tell(world, a, t, m); }
      if (world.rng.chance(0.35)) { const m = M().pickToTell(world, t); if (m) M().tell(world, t, a, m); }
      // beliefs drift toward the more convinced
      for (const [x, y] of [[a, t], [t, a]]) if (x.beliefs.creator > y.beliefs.creator + 0.1) y.beliefs.creator = b01(y.beliefs.creator + 0.04 * (x.beliefs.creator - y.beliefs.creator) * (0.5 + x.personality.sociability));
      A().practice(a, 'social', 1); A().practice(t, 'social', 1);
      world.events.emit('Conversation', { tick: world.tick, agentId: a.id, otherId: t.id, importance: 0.05 });
    },
    transfer(world, teller, listener, r) {
      const cand = [...teller.knowledge.techs].filter((id) => !listener.knowledge.techs.has(id) && !LW.Tech.D[id].hidden && (!LW.Tech.D[id].prereq || LW.Tech.D[id].prereq.every((p) => listener.knowledge.techs.has(p))));
      const hidden = [...teller.knowledge.techs].filter((id) => !listener.knowledge.techs.has(id) && LW.Tech.D[id].hidden);
      if (hidden.length && world.rng.chance(0.3)) LW.Tech.learn(world, listener, world.rng.pick(hidden), 'taught', teller);
      if (!cand.length) return;
      const id = world.rng.pick(cand); const d = LW.Tech.D[id]; const cfg = world.cfg.social;
      const p = cfg.conversationTransferBase * (0.5 + teller.personality.sociability) * (0.5 + listener.personality.intelligence) * (0.5 + r.friendship) * (1 - d.difficulty * 0.5) * (0.5 + 0.5 * LW.Speech.intelligibility(teller, listener));
      if (world.rng.chance(p)) LW.Tech.learn(world, listener, id, 'taught', teller);
      else listener.knowledge.progress[id] = Math.min(0.95, (listener.knowledge.progress[id] || 0) + world.cfg.tech.hintProgress);
    },
    flirt(world, a, t, ra, rt) {
      a.counters.flirts++; const cfg = world.cfg.social; const kin = R().kinship(world, a, t); ra.lastFlirt = world.tick; rt.lastFlirt = world.tick;
      let p = 0.25 + rt.attraction * 0.6 + rt.friendship * 0.2 + (t.emotions.joy - t.emotions.sadness) * 0.15 - t.emotions.shame * 0.2 + (t.needs.affection < 0.4 ? 0.15 : 0) - rt.resentment * 0.5;
      if (t.partner != null && t.partner !== a.id) p -= 0.25 + 0.5 * t.personality.loyalty;
      if (kin >= 0.9 || rt.attraction < 0.15) p = 0; else if (kin >= 0.5) p *= 0.5;
      const firstTime = rt.romance === 0 && ra.romance === 0;
      if (world.rng.chance(b01(p))) {
        ra.romance = b01(ra.romance + 0.2 + 0.1 * ra.attraction); rt.romance = b01(rt.romance + 0.15 + 0.1 * rt.attraction);
        ra.attraction = b01(ra.attraction + 0.04); rt.attraction = b01(rt.attraction + 0.05);
        for (const x of [a, t]) { x.emotions.love = b01(x.emotions.love + 0.15); x.emotions.joy = b01(x.emotions.joy + 0.15); x.emotions.excitement = b01(x.emotions.excitement + 0.2); x.needs.affection = b01(x.needs.affection + 0.2); x.needs.social = b01(x.needs.social + 0.15); }
        if (firstTime) world.events.emit('Courtship', { tick: world.tick, agentId: a.id, otherId: t.id, importance: 0.2 });
        M().add(world, a, { type: 'romance', text: `flörtöltem: ${t.name}`, importance: 0.35, emotion: 'love', intensity: 0.4, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `${a.name} flörtölt velem`, importance: 0.35, emotion: 'love', intensity: 0.4, subjects: [a.id] });
        if (ra.romance >= cfg.datingThreshold && rt.romance >= cfg.datingThreshold && ra.status !== 'dating' && ra.status !== 'partner') this.startDating(world, a, t, ra, rt);
        else if (ra.status === 'dating' && ra.romance >= cfg.partnerThreshold && rt.romance >= cfg.partnerThreshold && world.tick - ra.datingSince > LW.TIME.TICKS_PER_DAY * 8) { const leaves = (x, other, rx) => { if (x.partner == null || x.partner === other.id) return true; const cur = x.relationships.get(x.partner); return !cur || (rx.attraction > cur.attraction + 0.2 && cur.friendship < 0.5 && x.personality.loyalty < 0.6); }; if (leaves(a, t, ra) && leaves(t, a, rt)) this.becomePartners(world, a, t, ra, rt); }
      } else {
        ra.romance = Math.max(0, ra.romance - 0.1); ra.resentment = b01(ra.resentment + 0.05 * (1 - a.personality.patience)); rt.attraction = Math.max(0, rt.attraction - 0.03);
        a.emotions.shame = b01(a.emotions.shame + 0.3); a.emotions.sadness = b01(a.emotions.sadness + 0.15);
        M().add(world, a, { type: 'rejection', text: `elutasított: ${t.name}`, importance: 0.45, emotion: 'shame', intensity: 0.5, subjects: [t.id] });
        world.events.emit('Rejection', { tick: world.tick, agentId: a.id, otherId: t.id, importance: 0.12 });
      }
    },
    startDating(world, a, t, ra, rt) {
      ra.status = 'dating'; rt.status = 'dating'; ra.datingSince = world.tick; rt.datingSince = world.tick;
      for (const x of [a, t]) { x.emotions.love = b01(x.emotions.love + 0.4); x.emotions.joy = b01(x.emotions.joy + 0.3); }
      M().add(world, a, { type: 'romance', text: `járni kezdtünk: ${t.name}`, importance: 0.75, emotion: 'love', intensity: 0.7, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `járni kezdtünk: ${a.name}`, importance: 0.75, emotion: 'love', intensity: 0.7, subjects: [a.id] });
      world.events.emit('CoupleFormed', { tick: world.tick, agentId: a.id, otherId: t.id, stage: 'dating', first: !world.firsts || !world.firsts['love'] });
    },
    becomePartners(world, a, t, ra, rt) {
      if (a.partner != null && a.partner !== t.id) this.breakup(world, a, world.agents.get(a.partner), 'másért ment el');
      if (t.partner != null && t.partner !== a.id) this.breakup(world, t, world.agents.get(t.partner), 'másért ment el');
      a.partner = t.id; t.partner = a.id; ra.status = 'partner'; rt.status = 'partner'; ra.loyalty = b01(ra.loyalty + 0.3); rt.loyalty = b01(rt.loyalty + 0.3);
      // share a home
      const ha = a.home != null ? world.buildings.get(a.home) : null, ht = t.home != null ? world.buildings.get(t.home) : null;
      if (ha && !ht) LW.Buildings.moveIn(world, ha, t); else if (ht && !ha) LW.Buildings.moveIn(world, ht, a); else if (ha && ht && ha.id !== ht.id) { const better = (LW.Buildings.def(ha).capacity || 0) >= (LW.Buildings.def(ht).capacity || 0) ? ha : ht; LW.Buildings.moveIn(world, better, better === ha ? t : a); }
      for (const x of [a, t]) { x.emotions.love = 1; x.emotions.joy = b01(x.emotions.joy + 0.4); x.needs.affection = 1; }
      M().add(world, a, { type: 'romance', text: `párom lett: ${t.name}`, importance: 0.85, emotion: 'love', intensity: 0.85, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `párom lett: ${a.name}`, importance: 0.85, emotion: 'love', intensity: 0.85, subjects: [a.id] });
      world.events.emit('CoupleFormed', { tick: world.tick, agentId: a.id, otherId: t.id, stage: 'partners', first: !world.firsts || !world.firsts['partners'] });
    },
    breakup(world, a, t, reason) {
      if (!t) { a.partner = null; return; }
      const ra = R().ensure(world, a, t), rt = R().ensure(world, t, a);
      if (a.partner === t.id) a.partner = null; if (t.partner === a.id) t.partner = null;
      ra.status = 'ex'; rt.status = 'ex'; ra.romance = 0; rt.romance = 0; ra.loyalty *= 0.5; rt.loyalty *= 0.5;
      rt.resentment = b01(rt.resentment + 0.6); ra.resentment = b01(ra.resentment + 0.2); ra.lastFlirt = world.tick + LW.TIME.TICKS_PER_DAY * 60; rt.lastFlirt = world.tick + LW.TIME.TICKS_PER_DAY * 60;
      t.emotions.sadness = b01(t.emotions.sadness + 0.6); t.emotions.grief = b01(t.emotions.grief + 0.3); a.emotions.sadness = b01(a.emotions.sadness + 0.3);
      // the non-owner leaves the shared home
      if (a.home != null && a.home === t.home) { const h = world.buildings.get(a.home); if (h) LW.Buildings.moveOut(world, h.ownerId === a.id ? t : a); }
      M().add(world, a, { type: 'romance', text: `szakítottam vele: ${t.name} (${reason})`, importance: 0.7, emotion: 'sadness', intensity: 0.6, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `${a.name} elhagyott (${reason})`, importance: 0.8, emotion: 'grief', intensity: 0.75, subjects: [a.id] });
      world.events.emit('CoupleBroke', { tick: world.tick, agentId: a.id, otherId: t.id, reason, first: !world.firsts || !world.firsts['breakup'] });
    },
    mate(world, a, t, ra, rt) {
      if (!A().isAdult(world, a) || !A().isAdult(world, t)) return;
      for (const x of [a, t]) { x.needs.affection = 1; x.emotions.love = b01(x.emotions.love + 0.25); x.emotions.joy = b01(x.emotions.joy + 0.2); x.emotions.stress *= 0.7; }
      ra.loyalty = b01(ra.loyalty + 0.02); rt.loyalty = b01(rt.loyalty + 0.02); ra.attraction = b01(ra.attraction + 0.01); rt.attraction = b01(rt.attraction + 0.01);
      const f = a.sex === 'f' ? a : t.sex === 'f' ? t : null, m = a.sex === 'm' ? a : t.sex === 'm' ? t : null;
      if (f && m) A().conceive(world, f, m);
    },
    fight(world, a, t, ra, rt) {
      const rng = world.rng;
      const str = (x) => x.personality.bravery * 0.3 + x.personality.aggression * 0.3 + x.health * 0.3 + x.genes.appearance.build * 0.2 + (x.inv.spear ? 0.3 : 0) + rng.f() * 0.4;
      const sa = str(a), stt = str(t); const winner = sa >= stt ? a : t, loser = winner === a ? t : a;
      const rw = winner === a ? ra : rt, rl = winner === a ? rt : ra;
      const dmg = 0.12 + rng.f() * 0.3 * (winner.inv.spear ? 1.4 : 1);
      world.events.emit('ConflictOccurred', { tick: world.tick, agentId: a.id, otherId: t.id, winnerId: winner.id, first: !world.firsts || !world.firsts['conflict'] });
      A().damage(world, loser, dmg, `verekedés (${winner.name})`); A().damage(world, winner, dmg * 0.25, `verekedés (${loser.name})`);
      if (!world.agents.has(loser.id)) { winner.counters.kills++; winner.emotions.shame = b01(winner.emotions.shame + 0.5 * winner.personality.empathy); world.events.emit('Killing', { tick: world.tick, agentId: winner.id, otherId: loser.id, first: !world.firsts || !world.firsts['murder'] }); for (const o of world.agents.values()) { if (o.id === winner.id) continue; const rr = o.relationships.get(loser.id); const close = o.parents.includes(loser.id) || loser.parents.includes(o.id) ? 1 : rr ? Math.max(rr.friendship, rr.romance) : 0; if (close > 0.3) { const ro = R().ensure(world, o, winner); ro.resentment = b01(ro.resentment + close * 0.6); ro.fear = b01(ro.fear + 0.3); } } }
      else { rl.fear = b01(rl.fear + 0.4); rl.resentment = b01(rl.resentment + 0.2); loser.emotions.anger = b01(loser.emotions.anger + 0.2); }
      winner.emotions.anger = Math.max(0, winner.emotions.anger - 0.5); winner.emotions.pride = b01(winner.emotions.pride + 0.2); rw.resentment = Math.max(0, rw.resentment - 0.3); rw.respect = Math.max(0, rw.respect - 0.1);
      for (const o of world.agentsNear(a.x, a.y, 6)) { if (o === a || o === t) continue; o.emotions.fear = b01(o.emotions.fear + 0.2); M().add(world, o, { type: 'witness', text: `láttam, ahogy ${a.name} és ${t.name} összeverekedett`, importance: 0.4, emotion: 'fear', intensity: 0.4, subjects: [a.id, t.id] }); }
      M().add(world, winner, { type: 'fight', text: `megverekedtem vele és győztem: ${loser.name}`, importance: 0.5, emotion: 'pride', intensity: 0.5, subjects: [loser.id] });
      if (world.agents.has(loser.id)) M().add(world, loser, { type: 'fight', text: `megverekedtem vele és vesztettem: ${winner.name}`, importance: 0.6, emotion: 'anger', intensity: 0.6, subjects: [winner.id] });
    },
    teach(world, a, t, tech, ra, rt) {
      const d = LW.Tech.D[tech]; if (!d || t.knowledge.techs.has(tech)) return;
      const p = 0.5 * (0.5 + a.personality.sociability) * (0.5 + t.personality.intelligence) * (1 - d.difficulty * 0.5) * (a.children.includes(t.id) ? 1.3 : 1);
      if (world.rng.chance(p)) LW.Tech.learn(world, t, tech, 'taught', a); else t.knowledge.progress[tech] = Math.min(0.95, (t.knowledge.progress[tech] || 0) + 0.3);
      rt.gratitude = b01(rt.gratitude + 0.1); rt.respect = b01(rt.respect + 0.1); ra.friendship = b01(ra.friendship + 0.02); rt.friendship = b01(rt.friendship + 0.03);
      a.needs.social = b01(a.needs.social + 0.2); t.needs.social = b01(t.needs.social + 0.2); a.emotions.pride = b01(a.emotions.pride + 0.1);
    },
    gift(world, a, t, item, n) {
      const ra = R().ensure(world, a, t), rt = R().ensure(world, t, a);
      rt.gratitude = b01(rt.gratitude + 0.3); rt.trust = b01(rt.trust + 0.05); rt.friendship = b01(rt.friendship + 0.05); ra.friendship = b01(ra.friendship + 0.02);
      a.emotions.joy = b01(a.emotions.joy + 0.1); a.emotions.pride = b01(a.emotions.pride + 0.1); t.emotions.joy = b01(t.emotions.joy + 0.15);
      const label = LW.ITEMS[item] ? LW.ITEMS[item].label.toLowerCase() : item;
      M().add(world, t, { type: 'gift', text: `${a.name} adott nekem: ${label}`, importance: 0.4, emotion: 'joy', intensity: 0.4, subjects: [a.id] });
      world.events.emit('Gift', { tick: world.tick, agentId: a.id, otherId: t.id, item, n, importance: 0.1 });
      if (LW.ITEMS[item] && LW.ITEMS[item].food && A().stage(world, t) !== 'infant' && t.needs.food < 0.6) A().eat(world, t, item);
    },
    /** Rövid szóváltás: aki egymás mellett dolgozik, ül a tűznél, az beszél is — terv nélkül, gyakran. */
    ambient(world, a) {
      if (a.sleeping || a.engagedUntil > world.tick || LW.Agents.stage(world, a) === 'infant') return;
      const near = world.agentsNear(a.x, a.y, 1.8, a.id); if (!near.length) return;
      const t = near[world.rng.int(0, near.length - 1)]; if (t.sleeping || t.engagedUntil > world.tick || LW.Agents.stage(world, t) === 'infant') return;
      const ra = R().ensure(world, a, t), rt = R().ensure(world, t, a);
      if (world.tick - (ra.lastChat || -1000) < 12) return;
      if (!world.rng.chance(0.25 * (0.4 + a.personality.sociability) * (ra.resentment > 0.6 ? 0.2 : 1))) return;
      ra.lastChat = world.tick; rt.lastChat = world.tick; ra.familiarity = b01(ra.familiarity + 0.01); rt.familiarity = b01(rt.familiarity + 0.01); ra.friendship = b01(ra.friendship + 0.003); rt.friendship = b01(rt.friendship + 0.003);
      a.needs.social = b01(a.needs.social + 0.06); t.needs.social = b01(t.needs.social + 0.05); a.emotions.loneliness *= 0.9; t.emotions.loneliness *= 0.9;
      a.facing = t.x > a.x ? 1 : 0; t.facing = a.x > t.x ? 1 : 0;
      LW.Speech.say(world, a, t); if (world.rng.chance(0.5)) LW.Speech.say(world, t, a);
    },
    /** Daily: breakups, dating time-outs. */
    daily(world, a) {
      if (a.partner != null) {
        const t = world.agents.get(a.partner); if (!t) { a.partner = null; return; }
        const r = R().ensure(world, a, t); const cfg = world.cfg.social;
        let p = 0; if (r.resentment > r.friendship + cfg.breakupResentment) p += 0.25 * (1 - a.personality.patience); if (r.attraction < 0.15 && r.friendship < 0.3) p += 0.03; if (r.jealousy > 0.7) p += 0.2 * (1 - a.personality.patience);
        if (p > 0 && world.rng.chance(p)) this.breakup(world, a, t, r.jealousy > 0.6 ? 'féltékenység' : 'neheztelés');
      }
      for (const [id, r] of a.relationships) if (r.status === 'dating' && world.tick - r.last > LW.TIME.TICKS_PER_DAY * 60) { r.status = 'acquaintance'; r.romance = 0; const t = world.agents.get(id); if (t) { const rt = t.relationships.get(a.id); if (rt && rt.status === 'dating') { rt.status = 'acquaintance'; rt.romance = 0; } } }
    },
  };
  LW.Social = Social;
})(globalThis.LW || (globalThis.LW = {}));
