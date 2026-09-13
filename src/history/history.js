/* LEVENTE — THE CREATOR · history/history.js — importance, firsts (WOW), chronicle, feeds, yearly statistics (spec §73–§78) */
(function (LW) {
  'use strict';

  const TECH_FIRST = (id) => (LW.Tech.D[id] && LW.Tech.D[id].wow) || `First ${LW.Tech.D[id] ? LW.Tech.D[id].name : id}`;
  const BLD_FIRST = { campfire: 'First Fire Lit', lean_to: 'First Shelter Built', hut: 'First Hut Built', stone_house: 'First Stone House', storage_pit: 'First Store', farm_plot: 'First Farm Plot' };
  const TIER_FIRST = { camp: 'First Camp', hamlet: 'First Hamlet', village: 'First Village', town: 'First Town', city: 'First City', metropolis: 'First Metropolis' };

  class History {
    constructor(world) {
      this.world = world;
      this.feed = []; this.godFeed = []; this.chronicle = []; this.firsts = {}; this.yearStats = []; this.wow = []; this.counters = { births: 0, deaths: 0, discoveries: 0, buildings: 0, couples: 0, conflicts: 0 };
      world.firsts = this.firsts; world.history = this;
      world.events.onAny((ev) => this.handle(ev));
    }
    nameOf(id) { if (id == null) return 'someone'; const a = this.world.agents.get(id) || this.world.deceased.get(id); return a ? a.name : 'someone'; }
    /** Returns {text, base, firstKey, firstTitle, god} for an event or null to ignore. */
    describe(ev) {
      const n = (id) => this.nameOf(id); const W = this.world; const T = LW.Tech.D; const BD = LW.Buildings.DEFS;
      switch (ev.type) {
        case 'StrangerArrived': return { text: `A stranger, ${n(ev.agentId)}, arrived from beyond the edge of the known land.`, base: 0.6, firstKey: 'stranger', firstTitle: 'First Stranger' };
        case 'AgentBorn': return ev.stranger ? null : ev.genesis ? { text: `${n(ev.agentId)} appeared in the world.`, base: 0.5, firstKey: 'genesis', firstTitle: 'The First Ones' } : { text: `${n(ev.agentId)} was born to ${n(ev.motherId)} and ${n(ev.fatherId)}.`, base: 0.45, firstKey: 'born', firstTitle: 'First Child Born' };
        case 'AgentDied': return { text: `${n(ev.agentId)} died of ${ev.cause} at age ${Math.floor(ev.age)}.`, base: 0.5 + Math.min(0.3, 1 / Math.max(1, W.population)), firstKey: 'death', firstTitle: 'First Death' };
        case 'Killing': return { text: `${n(ev.agentId)} killed ${n(ev.otherId)}.`, base: 0.85, firstKey: 'murder', firstTitle: 'First Murder' };
        case 'CoupleFormed': return ev.stage === 'dating' ? { text: `${n(ev.agentId)} and ${n(ev.otherId)} began seeing each other.`, base: 0.4, firstKey: 'love', firstTitle: 'First Love' } : { text: `${n(ev.agentId)} and ${n(ev.otherId)} became partners.`, base: 0.55, firstKey: 'partners', firstTitle: 'First Union' };
        case 'CoupleBroke': return { text: `${n(ev.agentId)} left ${n(ev.otherId)} (${ev.reason}).`, base: 0.45, firstKey: 'breakup', firstTitle: 'First Heartbreak' };
        case 'Pregnancy': return { text: `${n(ev.agentId)} is expecting a child.`, base: 0.3 };
        case 'DiscoveryMade': return { text: `${n(ev.agentId)} discovered ${T[ev.tech].name}${ev.source === 'accident' ? ' by accident' : ev.source === 'observation' ? ' by observation' : ''}.`, base: T[ev.tech].hidden ? 0.2 : 0.65, firstKey: 'tech:' + ev.tech, firstTitle: TECH_FIRST(ev.tech) };
        case 'KnowledgeTransferred': return { text: `${n(ev.agentId)} learned ${T[ev.tech].name}${ev.teacherId != null ? ' from ' + n(ev.teacherId) : ''}.`, base: T[ev.tech].hidden ? 0.05 : 0.15 };
        case 'KnowledgeLost': return { text: `The knowledge of ${T[ev.tech].name} was lost with the death of ${n(ev.agentId)}.`, base: 0.75, firstKey: 'lost', firstTitle: 'First Knowledge Lost' };
        case 'BuildingStarted': return { text: `${n(ev.agentId)} began building a ${BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.05 : 0.18 };
        case 'BuildingCompleted': return { text: `${n(ev.agentId)} ${ev.kind === 'campfire' ? 'lit a fire' : 'completed a ' + BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.12 : 0.45, firstKey: 'building:' + ev.kind, firstTitle: BLD_FIRST[ev.kind] || `First ${BD[ev.kind].label}` };
        case 'BuildingDestroyed': return ev.kind === 'campfire' ? null : { text: `A ${BD[ev.kind].label.toLowerCase()} was destroyed by ${ev.cause}.`, base: ev.cause === 'decay' ? 0.15 : 0.5 };
        case 'SettlementFounded': return { text: `The ${ev.tier} of ${ev.name} was founded by ${n(ev.agentId)}.`, base: 0.85, firstKey: 'settlement', firstTitle: 'First Settlement' };
        case 'SettlementGrew': return { text: `${ev.name} grew into a ${ev.tier}.`, base: 0.75, firstKey: 'tier:' + ev.tier, firstTitle: TIER_FIRST[ev.tier] };
        case 'SettlementAbandoned': return { text: `${ev.name} was abandoned.`, base: 0.6 };
        case 'SettlementResettled': return { text: `People live in ${ev.name} again.`, base: 0.5 };
        case 'ResourceFound': return { text: `${n(ev.agentId)} found ${ev.deposit}.`, base: 0.5, firstKey: 'deposit:' + ev.deposit, firstTitle: `First ${ev.deposit[0].toUpperCase() + ev.deposit.slice(1)} Found` };
        case 'WeatherChanged': return ev.creator ? null : (ev.state === 'storm' && ev.prev !== 'rain') ? { text: 'A storm sweeps over the land.', base: 0.2 } : (ev.state === 'rain' && ev.prev !== 'storm' && ev.prev !== 'overcast') ? { text: 'Rain begins to fall.', base: 0.08 } : null;
        case 'WildfireStarted': return { text: `A wildfire started${ev.cause === 'lightning' ? ' from a lightning strike' : ev.cause === 'creator' ? ' from the sky' : ''}.`, base: 0.55, firstKey: 'wildfire', firstTitle: 'First Wildfire' };
        case 'WildfireEnded': return { text: `The wildfire burned out after scorching ${ev.burned} tiles.`, base: 0.3 };
        case 'CreatorIntervention': return { text: ev.text, base: 0.6, god: true, firstKey: 'intervention', firstTitle: "The Creator's First Touch" };
        case 'DivineCommandIssued': return { text: ev.text, base: 0.5, god: true };
        case 'DivineCommandInterpreted': return { text: ev.text, base: 0.45, god: true };
        case 'ManifestationPlaced': return { text: `A ${BD[ev.kind].label.toLowerCase()} appeared.`, base: 0.6, god: true, firstKey: 'manifestation', firstTitle: 'First Manifestation' };
        case 'ManifestationEnded': return { text: `The ${BD[ev.kind].label.toLowerCase()} ${ev.cause === 'faded' ? 'faded away' : 'was gone'}.`, base: 0.2, god: true };
        case 'BeliefFormed': return { text: ev.text, base: 0.9, firstKey: 'belief', firstTitle: 'First Belief in the Creator' };
        case 'ConflictOccurred': return { text: `${n(ev.agentId)} fought ${n(ev.otherId)}; ${n(ev.winnerId)} won.`, base: 0.35, firstKey: 'conflict', firstTitle: 'First Fight' };
        case 'AgentInjured': return { text: `${n(ev.agentId)} was hurt by ${ev.cause}.`, base: 0.12 + ev.amount * 0.3 };
        case 'AgentIll': return { text: `${n(ev.agentId)} fell ill.`, base: 0.12 };
        case 'FriendshipFormed': return { text: `${n(ev.agentId)} and ${n(ev.otherId)} became friends.`, base: 0.25, firstKey: 'friendship', firstTitle: 'First Friendship' };
        case 'Courtship': return { text: `${n(ev.agentId)} flirted with ${n(ev.otherId)}.`, base: 0.15 };
        case 'Rejection': return { text: `${n(ev.otherId)} turned ${n(ev.agentId)} down.`, base: 0.12 };
        case 'Gift': return { text: `${n(ev.agentId)} gave ${n(ev.otherId)} ${LW.ITEMS[ev.item] ? LW.ITEMS[ev.item].label.toLowerCase() : ev.item}.`, base: 0.1 };
        case 'ItemCrafted': return { text: `${n(ev.agentId)} made a ${LW.ITEMS[ev.item].label.toLowerCase()}.`, base: 0.3, firstKey: 'item:' + ev.item, firstTitle: `First ${LW.ITEMS[ev.item].label}` };
        case 'Harvest': return { text: `${n(ev.agentId)} harvested ${ev.amount} grain.`, base: 0.35, firstKey: 'harvest', firstTitle: 'First Harvest' };
        case 'PathFormed': return { text: 'Feet have worn a path into the land.', base: 0.3, firstKey: 'path', firstTitle: 'First Path' };
        case 'FireWentOut': return { text: 'A fire went out.', base: 0.05 };
        case 'Conversation': return null;
        default: return null;
      }
    }
    handle(ev) {
      const W = this.world, cfg = W.cfg.history; const d = this.describe(ev); if (!d) return;
      let imp = d.base; let first = false;
      if (d.firstKey && !this.firsts[d.firstKey]) { first = true; this.firsts[d.firstKey] = { tick: ev.tick, agentId: ev.agentId, title: d.firstTitle, text: d.text, tile: ev.tile }; imp *= cfg.firstBonus; }
      if (d.god) imp *= cfg.creatorBonus;
      imp = Math.min(3, imp);
      const entry = { tick: ev.tick, year: LW.Time.year(ev.tick), type: ev.type, text: d.text, importance: imp, agentId: ev.agentId, otherId: ev.otherId, tile: ev.tile, first: first ? d.firstTitle : null, god: !!d.god };
      if (imp >= cfg.feedThreshold || d.god) { this.feed.push(entry); if (this.feed.length > cfg.feedCap) this.feed.splice(0, this.feed.length - cfg.feedCap); }
      if (d.god) { this.godFeed.push(entry); if (this.godFeed.length > 200) this.godFeed.shift(); }
      if (imp >= cfg.chronicleThreshold || first) this.chronicle.push(entry);
      if (first) { this.wow.push(entry); }
      for (const id of [ev.agentId, ev.otherId]) { const a = id != null ? W.agents.get(id) : null; if (a) { a.importance += imp * 0.5; if (first && id === ev.agentId && d.firstTitle) a.achievements.push(d.firstTitle); } }
      if (ev.type === 'AgentBorn') this.counters.births++; if (ev.type === 'AgentDied') this.counters.deaths++; if (ev.type === 'DiscoveryMade' && !LW.Tech.D[ev.tech].hidden) this.counters.discoveries++; if (ev.type === 'BuildingCompleted') this.counters.buildings++; if (ev.type === 'CoupleFormed' && ev.stage === 'partners') this.counters.couples++; if (ev.type === 'ConflictOccurred') this.counters.conflicts++;
      if (W.onHistory && (imp >= cfg.feedThreshold || d.god || first)) W.onHistory(entry);
    }
    yearEnd() {
      const W = this.world; const known = LW.Tech.worldKnowledge(W); const largest = LW.Settlements.largest(W);
      const prev = this.yearStats[this.yearStats.length - 1]; const c = this.counters;
      this.yearStats.push({ year: W.year - 1, population: W.population, births: c.births - (prev ? prev.cumBirths : 0), deaths: c.deaths - (prev ? prev.cumDeaths : 0), cumBirths: c.births, cumDeaths: c.deaths, discoveries: c.discoveries, techs: known.size, techLevel: LW.Tech.techLevel(known), settlements: [...W.settlements.values()].filter((s) => !s.abandonedTick).length, largest: largest ? largest.name : null, buildings: W.buildings.size });
      if (this.yearStats.length > 5000) this.yearStats.shift();
      // creator belief emergence
      if (!this.firsts.belief && W.population >= 4) { let believers = 0; for (const a of W.agents.values()) if (a.beliefs.creator > 0.5) believers++; if (believers / W.population >= 0.6) { const s = largest; W.events.emit('BeliefFormed', { tick: W.tick, text: `The people${s ? ' of ' + s.name : ''} now speak of a Creator who watches from beyond the sky.`, tile: s ? W.idx(s.x | 0, s.y | 0) : undefined }); } }
    }
    snapshotStats() { const W = this.world; const known = LW.Tech.worldKnowledge(W); return { tick: W.tick, population: W.population, births: this.counters.births, deaths: this.counters.deaths, discoveries: this.counters.discoveries, buildings: this.counters.buildings, couples: this.counters.couples, settlements: [...W.settlements.values()].filter((s) => !s.abandonedTick).length, techs: [...known], techLevel: LW.Tech.techLevel(known), chronicleLen: this.chronicle.length }; }
    toJSON() { return { feed: this.feed.slice(-this.world.cfg.history.feedCap), godFeed: this.godFeed, chronicle: this.chronicle, firsts: this.firsts, yearStats: this.yearStats, counters: this.counters }; }
    static fromJSON(world, j) { const h = new History(world); h.feed = j.feed || []; h.godFeed = j.godFeed || []; h.chronicle = j.chronicle || []; Object.assign(h.firsts, j.firsts || {}); h.yearStats = j.yearStats || []; h.counters = j.counters || h.counters; return h; }
  }
  LW.History = History;
})(globalThis.LW || (globalThis.LW = {}));
