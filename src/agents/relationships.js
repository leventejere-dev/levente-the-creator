/* LEVENTE — THE CREATOR · agents/relationships.js — multi-dimensional, asymmetric relationships (AGENT_MODEL.md §5) */
(function (LW) {
  'use strict';

  const DIMS = ['trust', 'attraction', 'respect', 'friendship', 'fear', 'resentment', 'jealousy', 'gratitude', 'loyalty', 'familiarity', 'dependency', 'romance'];

  const Relationships = {
    DIMS,
    get(a, otherId) { return a.relationships.get(otherId) || null; },
    ensure(world, a, b) {
      let r = a.relationships.get(b.id);
      if (!r) {
        r = { trust: 0.3, attraction: 0, respect: 0.3, friendship: 0, fear: 0, resentment: 0, jealousy: 0, gratitude: 0, loyalty: 0, familiarity: 0, dependency: 0, romance: 0, status: 'stranger', since: world.tick, last: world.tick };
        r.attraction = this.initialAttraction(world, a, b);
        const kin = this.kinship(world, a, b);
        if (kin >= 0.5) { r.status = 'family'; r.trust = 0.7; r.friendship = 0.5; r.loyalty = 0.6; r.familiarity = 0.6; }
        a.relationships.set(b.id, r);
      }
      return r;
    },
    bump(r, dim, delta) { r[dim] = LW.clamp01(r[dim] + delta); },
    compatibility(a, b) {
      const P = a.personality, Q = b.personality;
      const sim = 1 - LW.mean(['humor', 'optimism', 'patience', 'discipline', 'sociability'].map((t) => Math.abs(P[t] - Q[t])));
      const comp = 0.5 * Math.abs(P.dominance - Q.dominance);
      return LW.clamp01(sim * 0.8 + comp * 0.4);
    },
    /** Kinship degree: 1 parent/child, 0.9 full sibling, 0.5 half-sibling/grandparent, 0.25 first cousin, 0 otherwise. */
    kinship(world, a, b) {
      if (a.parents.includes(b.id) || b.parents.includes(a.id)) return 1;
      const shared = a.parents.filter((p) => p != null && b.parents.includes(p)).length;
      if (shared === 2) return 0.9; if (shared === 1) return 0.5;
      const rec = (id) => (id != null ? (world.agents.get(id) || world.deceased.get(id)) : null);
      for (const p of a.parents) { const r = rec(p); if (r && r.parents && r.parents.includes(b.id)) return 0.5; }
      for (const p of b.parents) { const r = rec(p); if (r && r.parents && r.parents.includes(a.id)) return 0.5; }
      // first cousins: a parent of each are siblings
      const gpA = new Set(); for (const p of a.parents) { const r = rec(p); if (r && r.parents) for (const g of r.parents) if (g != null) gpA.add(g); }
      for (const p of b.parents) { const r = rec(p); if (r && r.parents) for (const g of r.parents) if (g != null && gpA.has(g)) return 0.25; }
      return 0;
    },
    /** Instinctive aversion to pairing with close kin (Westermarck): strong for parents/children and full siblings, weaker beyond. */
    kinPenalty(k) { return k >= 1 ? 2.5 : k >= 0.9 ? 0.9 : k >= 0.5 ? 0.35 : k > 0 ? 0.12 : 0; },
    initialAttraction(world, a, b) {
      const ga = a.genes, gb = b.genes;
      const sameSex = a.sex === b.sex;
      const orient = sameSex ? ga.orientation : 1 - ga.orientation; // how much a's orientation fits b's sex
      if (orient < 0.2) return 0;
      const ap = gb.appearance; const vec = [ap.skin, ap.hairHue, ap.hairShade, ap.eyes, ap.height, ap.build];
      const look = 1 - LW.mean(vec.map((v, i) => Math.abs(v - ga.prefs[i])));
      const comp = this.compatibility(a, b);
      const ageA = LW.Time.ageYears(a.bornTick, world.tick), ageB = LW.Time.ageYears(b.bornTick, world.tick);
      const ageFit = 1 - LW.clamp01(Math.abs(ageA - ageB) / 25);
      const kin = this.kinship(world, a, b);
      let v = 0.4 * look + 0.3 * comp + 0.15 * ageFit + 0.15 * (0.5 + b.personality.humor * 0.25 + b.personality.sociability * 0.25);
      v *= orient; v -= this.kinPenalty(kin);
      return LW.clamp01(v + world.rng.gauss(0, 0.05));
    },
    /** Daily decay pass. */
    decay(world, a) {
      for (const r of a.relationships.values()) {
        r.familiarity = Math.max(0, r.familiarity - 0.002);
        r.resentment = Math.max(0, r.resentment - 0.01 * (0.5 + a.personality.patience + a.personality.empathy * 0.5));
        r.jealousy = Math.max(0, r.jealousy - 0.02);
        r.gratitude = Math.max(0, r.gratitude - 0.005);
        if (r.status !== 'partner' && r.status !== 'dating') r.romance = Math.max(0, r.romance - 0.01);
      }
    },
    label(r) {
      if (!r) return 'stranger';
      if (r.status === 'partner') return 'partner'; if (r.status === 'dating') return 'dating'; if (r.status === 'ex') return 'former partner'; if (r.status === 'family') return 'family';
      if (r.resentment > 0.5 && r.resentment > r.friendship) return 'enemy'; if (r.resentment > 0.3 && r.resentment > r.friendship) return 'rival';
      if (r.friendship > 0.6) return 'close friend'; if (r.friendship > 0.3) return 'friend'; if (r.familiarity > 0.15) return 'acquaintance';
      return 'stranger';
    },
  };
  LW.Relationships = Relationships;
})(globalThis.LW || (globalThis.LW = {}));
