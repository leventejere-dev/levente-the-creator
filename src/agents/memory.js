/* LEVENTE — THE CREATOR · agents/memory.js — episodic / emotional / social memory with decay, consolidation, distortion (AGENT_MODEL.md §4) */
(function (LW) {
  'use strict';

  const Memory = {
    add(world, a, m) {
      const mem = { tick: world.tick, type: m.type, text: m.text, importance: LW.clamp01(m.importance ?? 0.3), emotion: m.emotion || null, intensity: LW.clamp01(m.intensity ?? 0.2), confidence: m.confidence ?? 1, source: m.source || 'experienced', subjects: m.subjects || [], tile: m.tile ?? null, tech: m.tech, buildingId: m.buildingId, divine: !!m.divine };
      a.memory.episodic.push(mem);
      if (mem.importance > 0.8 || mem.intensity > 0.7) { a.memory.emotional.push(mem); if (a.memory.emotional.length > world.cfg.agents.emotionalCap) { a.memory.emotional.sort((x, y) => y.importance + y.intensity - x.importance - x.intensity); a.memory.emotional.length = world.cfg.agents.emotionalCap; } }
      if (a.memory.episodic.length > world.cfg.agents.memoryCap * 1.25) this.consolidate(world, a);
      return mem;
    },
    /** Hourly (sliced): decay importance of episodic memories, drop weakest over cap. */
    consolidate(world, a) {
      const cap = world.cfg.agents.memoryCap; const ep = a.memory.episodic;
      for (let i = 0; i < ep.length; i++) { const m = ep[i]; m.importance *= 1 - 0.003 * (1 - m.intensity * 0.8); }
      if (ep.length > cap) { ep.sort((x, y) => (y.importance + y.intensity * 0.5 + (world.tick - x.tick > world.tick - y.tick ? 0 : 0)) - (x.importance + x.intensity * 0.5)); ep.length = cap; ep.sort((x, y) => x.tick - y.tick); }
    },
    /** Retell a memory to another agent (rumor): copies with reduced confidence and possible distortion. */
    tell(world, teller, listener, m) {
      if (listener.memory.episodic.some((x) => x.source === 'told' && x.text === m.text && x.tick === m.tick)) return null;
      const rng = world.rng; let text = m.text, intensity = m.intensity, importance = m.importance * 0.8;
      let distorted = false;
      if (rng.chance((1 - teller.personality.intelligence) * 0.3 + teller.personality.humor * 0.1)) { distorted = true; intensity = LW.clamp01(intensity * (1 + rng.range(0.1, 0.6))); importance = LW.clamp01(importance * 1.1); text = text + ' (így mesélték)'; }
      const copy = { ...m, text, intensity, importance, confidence: m.confidence * 0.8, source: 'told', teller: teller.id, tick: m.tick, distorted };
      listener.memory.episodic.push(copy);
      if (copy.divine) { listener.beliefs.creator = LW.clamp01(listener.beliefs.creator + 0.15 * copy.confidence * (0.5 + listener.personality.optimism) * (0.5 + teller.personality.sociability)); }
      return copy;
    },
    /** Most tellable memory for conversation (important, emotional, recent-ish). */
    pickToTell(world, a) {
      let best = null, bs = 0;
      for (const m of a.memory.episodic) { const age = (world.tick - m.tick) / LW.TIME.TICKS_PER_YEAR; const s = (m.importance + m.intensity) * (1 / (1 + age)) * (m.divine ? 1.6 : 1) * (m.source === 'told' ? 0.6 : 1); if (s > bs) { bs = s; best = m; } }
      return best;
    },
    social(a, otherId) { let s = a.memory.social.get(otherId); if (!s) { s = { lastSeen: -1, lastTile: -1, impression: 0, facts: [] }; a.memory.social.set(otherId, s); } return s; },
  };
  LW.Memory = Memory;
})(globalThis.LW || (globalThis.LW = {}));
