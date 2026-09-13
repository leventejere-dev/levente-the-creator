/* LEVENTE — THE CREATOR · agents/genetics.js — genomes, inheritance, mutation, appearance (AGENT_MODEL.md §6) */
(function (LW) {
  'use strict';
  const TRAITS = LW.TRAITS;

  const Genetics = {
    random(rng) {
      const traits = {}; for (const t of TRAITS) traits[t] = LW.clamp01(rng.gauss(0.5, 0.18));
      const [lo, hi] = LW.CONFIG.agents.longevityRange;
      return {
        traits,
        appearance: { skin: rng.f(), hairHue: rng.f(), hairShade: rng.f(), eyes: rng.f(), height: LW.clamp01(rng.gauss(0.5, 0.15)), build: LW.clamp01(rng.gauss(0.5, 0.15)) },
        physiology: { longevity: rng.range(lo, hi), fertility: rng.range(0.4, 1), baseHealth: rng.range(0.75, 1), metabolism: rng.range(0.85, 1.15), immunity: rng.f() },
        prefs: [rng.f(), rng.f(), rng.f(), rng.f(), rng.f(), rng.f()],
        orientation: rng.chance(0.92) ? LW.clamp01(Math.abs(rng.gauss(0, 0.08))) : LW.clamp01(rng.gauss(0.85, 0.1)),
      };
    },
    inherit(rng, A, B) {
      const mix = (a, b, sd = 0.04) => { const base = rng.chance(0.5) ? a : b; const other = base === a ? b : a; let v = base + (other - base) * 0.3 + rng.gauss(0, sd); if (rng.chance(0.01)) v += rng.gauss(0, 0.2); return v; };
      const traits = {}; for (const t of TRAITS) traits[t] = LW.clamp01(mix(A.traits[t], B.traits[t]));
      const ap = {}; for (const k in A.appearance) ap[k] = LW.clamp01(mix(A.appearance[k], B.appearance[k], 0.03));
      const [lo, hi] = LW.CONFIG.agents.longevityRange;
      return {
        traits, appearance: ap,
        physiology: {
          longevity: LW.clamp(mix(A.physiology.longevity, B.physiology.longevity, 2), lo - 5, hi + 8),
          fertility: LW.clamp(mix(A.physiology.fertility, B.physiology.fertility), 0.2, 1),
          baseHealth: LW.clamp(mix(A.physiology.baseHealth, B.physiology.baseHealth), 0.5, 1),
          metabolism: LW.clamp(mix(A.physiology.metabolism, B.physiology.metabolism), 0.7, 1.3),
          immunity: LW.clamp01(mix(A.physiology.immunity, B.physiology.immunity)),
        },
        prefs: A.prefs.map((v, i) => LW.clamp01(mix(v, B.prefs[i], 0.08))),
        orientation: rng.chance(0.92) ? LW.clamp01(Math.abs(rng.gauss(0, 0.08))) : LW.clamp01(rng.gauss(0.85, 0.1)),
      };
    },
    /** Colours for rendering derived from appearance genes. */
    palette(ap) {
      const skinStops = [[246, 219, 190], [226, 190, 150], [198, 150, 110], [160, 110, 75], [120, 78, 50], [80, 52, 34]];
      const s = ap.skin * (skinStops.length - 1); const i0 = Math.floor(s), i1 = Math.min(skinStops.length - 1, i0 + 1), f = s - i0;
      const skin = skinStops[i0].map((c, k) => Math.round(c + (skinStops[i1][k] - c) * f));
      let hair;
      if (ap.hairHue < 0.45) hair = [40 + ap.hairShade * 30, 28 + ap.hairShade * 22, 18 + ap.hairShade * 15];
      else if (ap.hairHue < 0.75) hair = [110 + ap.hairShade * 60, 70 + ap.hairShade * 45, 30 + ap.hairShade * 20];
      else if (ap.hairHue < 0.9) hair = [200 + ap.hairShade * 40, 160 + ap.hairShade * 60, 70 + ap.hairShade * 60];
      else hair = [170 + ap.hairShade * 40, 70 + ap.hairShade * 20, 30];
      hair = hair.map((c) => Math.round(Math.min(255, c)));
      const eyes = ap.eyes < 0.6 ? [60, 40, 25] : ap.eyes < 0.85 ? [50, 90, 60] : [60, 100, 160];
      return { skin: `rgb(${skin})`, hair: `rgb(${hair})`, eyes: `rgb(${eyes})` };
    },
    /** Childhood development: pull toward caregivers' traits and apply formative memories. */
    develop(world, a, caregivers) {
      if (!caregivers.length) return;
      for (const t of TRAITS) { const m = LW.mean(caregivers.map((c) => c.personality[t])); a.personality[t] = LW.clamp01(a.personality[t] + (m - a.personality[t]) * 0.15); }
    },
  };
  LW.Genetics = Genetics;
})(globalThis.LW || (globalThis.LW = {}));
