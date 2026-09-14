/* LEVENTE — THE CREATOR · society/frontier.js — a határvidék: műholdak, űrkikötő, indítások, telepesek, akik elhagyják a világot
 * Minden naponta fut. A műhold feltérképezi a világot (minden lelőhely ismert lesz); az űrkikötő rakétákat indít;
 * ha megvan az űrkolónia tudása, néhány bátor és kíváncsi ember elmegy — és nem hal meg, csak eltűnik a világból.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME; const A = () => LW.Agents; const b01 = (v) => LW.clamp01(v);

  const Frontier = {
    daily(w) {
      // műholdak: a világ teljes térképe egyszer, mindenkinek
      if (!w.firsts['satmap'] && w.tick % (T.TICKS_PER_DAY * 5) < T.TICKS_PER_DAY) { let sat = false; for (const a of w.agents.values()) if (a.knowledge.techs.has('satellites')) { sat = true; break; } if (sat) { const t = w.tiles; let n = 0; for (let i = 0; i < w.w * w.h; i++) if (t.depType[i] && !t.depKnown[i]) { t.depKnown[i] = 1; n++; } w.events.emit('MapRevealed', { tick: w.tick, n }); for (const a of w.agents.values()) if (a.knowledge.techs.has('satellites')) { a.emotions.excitement = b01(a.emotions.excitement + 0.3); } } }
    },
    /** Űrkikötő: indítások, néha emberekkel; ha van kolónia-tudás és elég ember, telepesek indulnak. */
    spaceport(w, b, near) {
      const rng = w.rng; if (!near || !near.length) return;
      const s = LW.Settlements.at(w, b.x, b.y); const place = s ? s.name : null;
      if (rng.chance(0.004)) { const crew = rng.chance(0.3); b.launches = (b.launches || 0) + 1; w.events.emit('Launch', { tick: w.tick, place, crew, buildingId: b.id, tile: w.idx(b.x, b.y) }); for (const a of near) { a.emotions.excitement = b01(a.emotions.excitement + 0.2); a.emotions.joy = b01(a.emotions.joy + 0.05); } }
      const colonists = near.some((a) => a.knowledge.techs.has('space_colony'));
      if (colonists && w.population >= 140 && w.tick - (w.lastColonyTick || -1e9) > T.TICKS_PER_YEAR * 15 && rng.chance(0.002)) {
        const cand = [...w.agents.values()].filter((a) => A().isAdult(w, a) && A().age(w, a) < 45 && a.health > 0.6 && !a.pregnancy && a.children.every((c) => { const ch = w.agents.get(c); return !ch || A().isAdult(w, ch); })).sort((x, y) => (y.personality.curiosity + y.personality.bravery + y.personality.riskTolerance) - (x.personality.curiosity + x.personality.bravery + x.personality.riskTolerance)).slice(0, rng.int(3, 7));
        if (cand.length < 3) return; w.lastColonyTick = w.tick;
        const names = cand.map((a) => a.name).join(', ');
        for (const a of cand) this.depart(w, a, 'űrkolónia');
        w.departed = (w.departed || 0) + cand.length;
        w.events.emit('ColonyLaunched', { tick: w.tick, place, n: cand.length, names, tile: w.idx(b.x, b.y) });
        for (const a of near) { a.emotions.excitement = b01(a.emotions.excitement + 0.3); a.emotions.sadness = b01(a.emotions.sadness + 0.1); }
      }
    },
    /** Valaki elhagyja a világot: nem hal meg, de a világban többé nincs jelen. A szerettei búcsúznak. */
    depart(w, a, cause) {
      if (!w.agents.has(a.id)) return; const tick = w.tick;
      const rec = { id: a.id, name: a.name, sex: a.sex, bornTick: a.bornTick, diedTick: tick, cause, departed: true, parents: a.parents.slice(), children: a.children.slice(), partner: a.partner, achievements: a.achievements.slice(), genes: a.genes, palette: a.palette, generation: a.generation, genesis: a.genesis, occupation: a.occupation, importance: a.importance + 1, deathTile: w.idx(a.x | 0, a.y | 0) };
      w.deceased.set(a.id, rec);
      LW.Buildings.moveOut(w, a);
      const heir = (a.partner != null && w.agents.get(a.partner)) || a.children.map((c) => w.agents.get(c)).find((c) => c) || null;
      LW.Buildings.transferOwnership(w, a, heir ? heir.id : null);
      for (const o of w.agents.values()) {
        if (o.id === a.id) continue; const r = o.relationships.get(a.id); const kin = o.parents.includes(a.id) || a.parents.includes(o.id) || o.partner === a.id;
        const close = kin ? 1 : r ? Math.max(r.friendship, r.romance, r.attraction * 0.5) : 0;
        if (close > 0.25) { o.emotions.sadness = b01(o.emotions.sadness + close * 0.5); o.emotions.pride = b01(o.emotions.pride + close * 0.2); A().memory(w, o, { type: 'loss', text: `${a.name} elment az égen túlra: ${cause}`, importance: 0.6 + close * 0.3, emotion: 'sadness', intensity: close * 0.7, subjects: [a.id] }); }
        if (o.partner === a.id) { o.partner = null; if (r) r.status = 'apart'; }
        if (o.plan && o.plan.target === a.id) o.plan = null;
      }
      w.removeAgent(a.id);
      w.events.emit('AgentDeparted', { tick, agentId: a.id, cause, tile: rec.deathTile, age: A().age(w, a) });
    },
  };
  LW.Frontier = Frontier;
})(globalThis.LW || (globalThis.LW = {}));
