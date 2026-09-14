/* LEVENTE — THE CREATOR · society/civilization.js — járványok, kétely és a szimulációs hipotézis, államok és háború, vállalatok, a táguló világ
 * Minden naponta fut (részletes és makró-szimulációban is). Semmi sincs megírva: a járvány a sűrűségből, a kétely a
 * tudományból, a háború a vezetők és a népek feszültségéből, a vállalat a vagyonból, az új föld a hajózásból születik.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME; const A = () => LW.Agents; const b01 = (v) => LW.clamp01(v);

  const Civ = {
    daily(w) {
      this.disease(w); this.faith(w); this.polities(w); this.companies(w); this.growth(w);
    },
    // ---------------------------------------------------------------- járvány: aki beteg, fertőz; a sűrű település a kór otthona
    disease(w) {
      const rng = w.rng; const illBy = new Map();
      for (const a of w.agents.values()) {
        if (!(a.ill > 0)) continue;
        const fx = LW.Tech.fx(w, a).health; const hosp = LW.Tree.buildingBonus(w, a.x, a.y, 'hospital', 12);
        a.health = Math.max(0, a.health - 0.035 * (1 - Math.min(0.8, fx * 0.5 + hosp * 0.3)) * (a.needs.food < 0.3 ? 1.6 : 1)); a.emotions.stress = b01(a.emotions.stress + 0.05); a.needs.energy = Math.max(0, a.needs.energy - 0.15);
        a.ill--; if (a.ill <= 0) { a.ill = 0; a.immuneUntil = w.tick + T.TICKS_PER_DAY * 150; a.emotions.joy = b01(a.emotions.joy + 0.2); A().memory(w, a, { type: 'illness', text: 'meggyógyultam', importance: 0.35, emotion: 'joy', intensity: 0.4 }); }
        if (a.health <= 0) { A().die(w, a, 'betegség'); continue; }
        // fertőzés: háztartás és a közelben állók; a tisztaság, az oltás, a kórház véd
        const near = w.agentsNear(a.x, a.y, 2.2, a.id).concat(A().household(w, a).filter((o) => o !== a));
        for (const o of near) { if (o.ill > 0 || (o.immuneUntil || 0) > w.tick) continue; const p = 0.03 * (1 - o.genes.physiology.immunity * 0.6) * (1 - Math.min(0.85, LW.Tech.fx(w, o).health * 0.6 + LW.Tree.buildingBonus(w, o.x, o.y, 'hospital', 12) * 0.3)) * (o.needs.food < 0.35 ? 1.5 : 1); if (rng.chance(p)) { o.ill = rng.int(4, 10); o.injury = Math.min(0.8, o.injury + 0.15); A().memory(w, o, { type: 'illness', text: `elkaptam a kórt (${a.name})`, importance: 0.45, emotion: 'fear', intensity: 0.5, subjects: [a.id] }); w.events.emit('AgentIll', { tick: w.tick, agentId: o.id, from: a.id }); } }
        const s = LW.Settlements.at(w, a.x, a.y); if (s) illBy.set(s.id, (illBy.get(s.id) || 0) + 1);
      }
      for (const s of w.settlements.values()) {
        const n = illBy.get(s.id) || 0; const thr = Math.max(4, Math.round(s.population * 0.25));
        if (!s.epidemicSince && n >= thr) { s.epidemicSince = w.tick; s.epidemicPeak = n; w.events.emit('Epidemic', { tick: w.tick, place: s.name, n, tile: w.idx(s.x | 0, s.y | 0) }); for (const a of w.agentsNear(s.x + 0.5, s.y + 0.5, 12)) { a.emotions.fear = b01(a.emotions.fear + 0.4); if (a.beliefs.creator > 0.5) a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) - 0.05, -1, 1); } }
        else if (s.epidemicSince) { s.epidemicPeak = Math.max(s.epidemicPeak || 0, n); if (n <= 1) { w.events.emit('EpidemicEnded', { tick: w.tick, place: s.name, days: Math.round((w.tick - s.epidemicSince) / T.TICKS_PER_DAY), peak: s.epidemicPeak, tile: w.idx(s.x | 0, s.y | 0) }); s.epidemicSince = 0; } }
      }
    },
    // ---------------------------------------------------------------- hit és kétely: a tudomány magyaráz; a Világmag után a szimulációs hipotézis
    skepticism(w, a) { let s = 0; const K = a.knowledge.techs; if (K.has('scientific_method')) s += 0.3; if (K.has('universities')) s += 0.1; if (K.has('printing')) s += 0.1; if (K.has('astronomy')) s += 0.05; if (K.has('computer')) s += 0.1; if (K.has('internet')) s += 0.1; if (K.has('artificial_intelligence')) s += 0.1; return Math.min(0.85, s) * (0.6 + a.personality.intelligence * 0.6) * (1.2 - a.personality.optimism * 0.4); },
    faith(w) {
      const rng = w.rng; const known = w._knownAll || (w._knownAll = LW.Tech.worldKnowledge(w)); w._knownAll = null;
      const simKnown = known.has('world_simulation'); if (simKnown && !w.simKnownTick) w.simKnownTick = w.tick; let believers = 0, deniers = 0, adults = 0, hyp = 0;
      for (const a of w.agents.values()) {
        const sk = this.skepticism(w, a); if (sk > 0) { const recent = a.memory.episodic.length && a.memory.episodic.slice(-8).some((m) => m.divine && w.tick - m.tick < T.TICKS_PER_DAY * 30); if (!recent) a.beliefs.creator = b01(a.beliefs.creator - 0.0025 * sk); }
        if (!A().isAdult(w, a)) continue; adults++;
        if (simKnown || a.beliefs.simulation > 0) {
          const target = b01(0.35 + a.personality.curiosity * 0.35 + a.beliefs.creator * 0.25 - a.personality.dominance * 0.25 + (a.knowledge.techs.has('world_simulation') ? 0.25 : 0));
          a.beliefs.simulation = b01((a.beliefs.simulation || 0) + (target - (a.beliefs.simulation || 0)) * 0.02);
          if (a.beliefs.simulation > 0.6) believers++; else if (a.beliefs.simulation < 0.3) deniers++;
          if (!w.firsts['simhyp'] && a.beliefs.simulation > 0.6) w.events.emit('SimulationHypothesis', { tick: w.tick, agentId: a.id, tile: w.idx(a.x | 0, a.y | 0) });
          hyp++;
        }
      }
      if (simKnown && adults >= 10 && w.tick - w.simKnownTick > T.TICKS_PER_YEAR * 3 && w.tick - (w.simVerdictTick || -1e9) > T.TICKS_PER_YEAR * 5) { if (believers / adults > 0.5) { w.simVerdictTick = w.tick; w.events.emit('SimulationVerdict', { tick: w.tick, accepted: true, share: believers / adults }); } else if (deniers / adults > 0.5) { w.simVerdictTick = w.tick; w.events.emit('SimulationVerdict', { tick: w.tick, accepted: false, share: deniers / adults }); } }
    },
    // ---------------------------------------------------------------- államok és háború
    polities(w) {
      const rng = w.rng; const sets = [...w.settlements.values()].filter((s) => !s.abandonedTick && s.population >= 4);
      for (const s of sets) { const leader = s.leaderId != null ? w.agents.get(s.leaderId) : null; const stateKnown = leader && leader.knowledge.techs.has('law_code'); if (leader && stateKnown && !s.state) { s.state = true; w.events.emit('StateFounded', { tick: w.tick, place: s.name, agentId: leader.id, tile: w.idx(s.x | 0, s.y | 0) }); } if (s.polityId != null && !w.settlements.has(s.polityId)) s.polityId = null; }
      const pol = sets.filter((s) => s.leaderId != null && (s.polityId == null || s.polityId === s.id));
      for (let i = 0; i < pol.length; i++) for (let j = i + 1; j < pol.length; j++) {
        const a = pol[i], b = pol[j]; const d = LW.dist(a.x, a.y, b.x, b.y); if (d > 60) continue;
        a.rivalry = a.rivalry || {}; const key = String(b.id); let t = a.rivalry[key] || 0;
        if (a.warWith === b.id) { this.battle(w, a, b); continue; }
        const la = w.agents.get(a.leaderId), lb = w.agents.get(b.leaderId); if (!la || !lb) continue;
        const dom = (la.personality.dominance + lb.personality.dominance + la.personality.aggression + lb.personality.aggression) / 4;
        const rel = la.relationships.get(lb.id); const resent = rel ? rel.resentment - rel.friendship : 0.1;
        const sameLang = la.langId === lb.langId; const hunger = ((1 - la.needs.food) + (1 - lb.needs.food)) / 2;
        const markets = w.buildingsNear(a.x | 0, a.y | 0, 10).some((x) => x.kind === 'market') && w.buildingsNear(b.x | 0, b.y | 0, 10).some((x) => x.kind === 'market');
        const dip = ((LW.Tech.fx(w, la).diplomacy || 0) + (LW.Tech.fx(w, lb).diplomacy || 0)) / 2; // követek, szerződések, közös játékok, elrettentés
        t += 0.0025 * (dom * 1.5 + resent + hunger * 0.8) * Math.max(0.2, 1 - dip) - (sameLang ? 0.0012 : 0) - (markets ? 0.0015 : 0) - 0.0006 - dip * 0.001; t = LW.clamp(t, 0, 1.2);
        a.rivalry[key] = t;
        if (t >= 1 && !a.warWith && !b.warWith && rng.chance(0.2)) { a.warWith = b.id; b.warWith = a.id; a.warSince = w.tick; b.warSince = w.tick; a.warScore = 0; b.warScore = 0; w.events.emit('WarDeclared', { tick: w.tick, place: a.name, other: b.name, agentId: la.id, tile: w.idx(a.x | 0, a.y | 0) }); for (const p of w.agentsNear(a.x + 0.5, a.y + 0.5, 14).concat(w.agentsNear(b.x + 0.5, b.y + 0.5, 14))) { p.emotions.fear = b01(p.emotions.fear + 0.3); p.emotions.anger = b01(p.emotions.anger + 0.2); } }
      }
    },
    warriors(w, s) { return w.agentsNear(s.x + 0.5, s.y + 0.5, 14).filter((p) => A().isAdult(w, p) && p.health > 0.4 && (LW.Tree.bestTool(p, 'hunt') >= 1 || p.personality.bravery > 0.6)).sort((x, y) => (y.personality.bravery + LW.Tree.bestTool(y, 'hunt')) - (x.personality.bravery + LW.Tree.bestTool(x, 'hunt'))).slice(0, 14); },
    battle(w, a, b) {
      const rng = w.rng; if (!rng.chance(0.35)) return;
      const wa = this.warriors(w, a), wb = this.warriors(w, b);
      const wallOf = (s) => { let best = 0; for (const x of w.buildingsNear(s.x | 0, s.y | 0, 12)) { const d = LW.Buildings.DEFS[x.kind]; if (x.progress >= 1 && d && d.wall > best) best = d.wall; } return best; };
      const warOf = (s) => { const l = s.leaderId != null ? w.agents.get(s.leaderId) : null; return l ? (LW.Tech.fx(w, l).war || 0) : 0; }; // lovasság, tüzérség, páncélosok: az állam hadereje
      const str = (list, s) => list.reduce((acc, p) => acc + p.personality.bravery + p.personality.aggression * 0.5 + LW.Tree.bestTool(p, 'hunt') * 0.6 + p.health, 0) * rng.range(0.7, 1.3) * (1 + wallOf(s) * 0.25) * (1 + warOf(s)); // a fal védi az otthon harcolókat
      { const la = a.leaderId != null ? w.agents.get(a.leaderId) : null, lb = b.leaderId != null ? w.agents.get(b.leaderId) : null; if (la && lb && la.knowledge.techs.has('nuclear_weapons') && lb.knowledge.techs.has('nuclear_weapons') && rng.chance(0.06)) { this.nuclear(w, a, b); return; } }
      const sa = str(wa, a), sb = str(wb, b); const win = sa >= sb ? a : b, lose = win === a ? b : a; const wl = win === a ? wb : wa, ww = win === a ? wa : wb;
      for (const p of wl.slice(0, rng.int(1, 3))) { A().damage(w, p, rng.range(0.3, 0.95), `háború (${win.name})`); if (w.agents.has(p.id)) { p.emotions.fear = b01(p.emotions.fear + 0.4); A().memory(w, p, { type: 'war', text: `harcoltunk ${win.name} ellen, és vesztettünk`, importance: 0.7, emotion: 'fear', intensity: 0.7 }); } }
      for (const p of ww.slice(0, rng.int(0, 1))) A().damage(w, p, rng.range(0.2, 0.6), `háború (${lose.name})`);
      for (const p of ww) { if (!w.agents.has(p.id)) continue; p.emotions.pride = b01(p.emotions.pride + 0.15); for (const q of wl) { if (!w.agents.has(q.id)) continue; const r = LW.Relationships.ensure(w, q, p); r.resentment = b01(r.resentment + 0.2); r.fear = b01((r.fear || 0) + 0.15); } }
      win.warScore = (win.warScore || 0) + 1; w.events.emit('Battle', { tick: w.tick, place: win.name, other: lose.name, tile: w.idx(lose.x | 0, lose.y | 0) });
      const days = (w.tick - a.warSince) / T.TICKS_PER_DAY;
      if (win.warScore >= 4 || this.warriors(w, lose).length < 3 || days > 120) {
        const decisive = win.warScore >= 4 || this.warriors(w, lose).length < 3;
        a.warWith = null; b.warWith = null; a.rivalry = a.rivalry || {}; b.rivalry = b.rivalry || {}; a.rivalry[String(b.id)] = 0.3; b.rivalry[String(a.id)] = 0.3;
        if (decisive) { lose.polityId = win.id; const ll = lose.leaderId != null ? w.agents.get(lose.leaderId) : null; if (ll && ll.occupation === 'leader') ll.occupation = null; lose.leaderId = null; for (const p of w.agentsNear(lose.x + 0.5, lose.y + 0.5, 14)) { const wl2 = win.leaderId != null ? w.agents.get(win.leaderId) : null; if (wl2) { const r = LW.Relationships.ensure(w, p, wl2); r.fear = b01((r.fear || 0) + 0.3); r.resentment = b01(r.resentment + 0.3); } } }
        w.events.emit('WarEnded', { tick: w.tick, place: win.name, other: lose.name, decisive, tile: w.idx(win.x | 0, win.y | 0) });
      }
    },
    /** Atomcsapás: a háború egyetlen nap alatt véget ér, és senki sem nyer. A félelem nemzedékekre megmarad. */
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
    // ---------------------------------------------------------------- vállalatok: a vagyon szervezi a termelést
    companies(w) {
      const rng = w.rng;
      for (const b of w.buildings.values()) { const def = LW.Buildings.DEFS[b.kind]; if (!def || !def.public || !def.storage || b.progress < 1 || b.company) continue; if (!rng.chance(0.03)) continue; const near = w.agentsNear(b.x + 0.5, b.y + 0.5, 10).filter((p) => A().isAdult(w, p) && (p.wealth || 0) >= 4 && p.knowledge.techs.has('banking')); if (!near.length) continue; const o = near.sort((x, y) => (y.wealth || 0) - (x.wealth || 0))[0]; b.company = { ownerId: o.id, name: `${o.name} ${def.label.toLowerCase()}e`, since: w.tick, workers: 1 }; o.wealth = (o.wealth || 0) - 5; o.achievements.push('Vállalatalapító'); o.importance += 0.6; w.events.emit('CompanyFounded', { tick: w.tick, agentId: o.id, name: b.company.name, kind: b.kind, tile: w.idx(b.x, b.y) }); A().memory(w, o, { type: 'company', text: `saját vállalatot alapítottam: ${b.company.name}`, importance: 0.8, emotion: 'pride', intensity: 0.7 }); }
      // a vállalat dolgozókat gyűjt és a tulajdonos gazdagszik a termelésből
      for (const b of w.buildings.values()) { if (!b.company) continue; const o = w.agents.get(b.company.ownerId); if (!o) { b.company = null; continue; } const near = w.agentsNear(b.x + 0.5, b.y + 0.5, 12).filter((p) => A().isAdult(w, p) && p.id !== o.id); b.company.workers = Math.max(1, Math.min(near.length, 1 + Math.floor((o.wealth || 0) / 6))); if (rng.chance(0.5)) { o.wealth = (o.wealth || 0) + Math.round(b.company.workers * 0.5); for (const p of near.slice(0, b.company.workers)) p.wealth = (p.wealth || 0) + 1; } }
    },
    // ---------------------------------------------------------------- a világ tágul: aki hajózni tud, új földet talál a tengeren túl
    growth(w) {
      if (!w.cfg.world.expandable && w.cfg.world.expandable !== undefined) return;
      const maxSide = 256; if (w.w >= maxSide && w.h >= maxSide) return;
      const known = LW.Tech.worldKnowledge(w); if (!known.has('sailing')) return;
      const need = 20 + (w.expansions || 0) * 25; if (w.population < need) return;
      if (!w.rng.chance(known.has('navigation') ? 0.004 : 0.0015)) return;
      const side = w.w <= w.h && w.w < maxSide ? 'east' : 'south'; const size = 64;
      const explorer = [...w.agents.values()].filter((a) => a.knowledge.techs.has('sailing')).sort((x, y) => y.personality.curiosity - x.personality.curiosity)[0];
      w.expand(side, size, explorer ? explorer.id : null);
    },
  };
  LW.Civilization = Civ;
})(globalThis.LW || (globalThis.LW = {}));
