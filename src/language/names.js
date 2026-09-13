/* LEVENTE — THE CREATOR · language/names.js
 * A procedural proto-language per world: a phoneme inventory and syllable grammar
 * from which the inhabitants name their children, places and the world itself.
 * (Spec §60–§61.) Dialects/mutual intelligibility arrive in Phase 2.
 */
(function (LW) {
  'use strict';

  const CONS_POOL = ['m', 'n', 'l', 'r', 'k', 't', 's', 'v', 'd', 'th', 'sh', 'h', 'b', 'g', 'z', 'f', 'p', 'y', 'w', 'ch', 'kh', 'ny', 'rr'];
  const CONS_WEIGHT = [9, 9, 8, 8, 7, 7, 7, 5, 5, 3, 3, 4, 4, 4, 3, 3, 3, 3, 3, 2, 1, 1, 1];
  const VOW_POOL = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'ei', 'ou', 'y'];
  const VOW_WEIGHT = [10, 9, 8, 7, 5, 2, 2, 2, 1, 1];
  const PLACE_SUFFIX = [['a', 'ar', 'ara'], ['en', 'ven', 'end'], ['ia', 'ira', 'is'], ['or', 'oth', 'orn'], ['um', 'ul', 'un'], ['eth', 'ath', 'esh'], ['al', 'el', 'il']];

  class Language {
    constructor(rng) {
      this.rng = rng;
      const nC = rng.int(7, 12), nV = rng.int(3, 6);
      this.cons = pickN(rng, CONS_POOL, CONS_WEIGHT, nC);
      this.vows = pickN(rng, VOW_POOL, VOW_WEIGHT, nV);
      // syllable structure preference
      this.patterns = rng.weighted([['CV', 'CVC', 'V'], ['CV', 'CVC'], ['CV', 'V', 'VC'], ['CVC', 'CV', 'CVV']], [4, 3, 2, 1]);
      this.femEnd = rng.pick(['a', 'i', 'e', 'ia', 'ya', 'is']);
      this.mascEnd = rng.pick(['n', 'r', 'k', 'th', 'l', 'd', 'sh', 'os', 'an']);
      this.placeSuffixes = rng.pick(PLACE_SUFFIX);
      this.used = new Set();
    }
    syllable() {
      const p = this.rng.pick(this.patterns);
      let s = '';
      for (const ch of p) s += ch === 'C' ? this.rng.pick(this.cons) : this.rng.pick(this.vows);
      return s;
    }
    _raw(n) { let s = ''; for (let i = 0; i < n; i++) s += this.syllable(); return s.replace(/(.)\1\1+/g, '$1$1'); }
    cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    _unique(gen) {
      for (let i = 0; i < 20; i++) { const n = gen(); if (!this.used.has(n)) { this.used.add(n); return n; } }
      const n = gen() + this.rng.pick(['-' + this.rng.pick(this.vows), this.rng.pick(this.cons)]);
      this.used.add(n); return n;
    }
    /** Person name. Parents' creativity can push toward novelty (longer, rarer forms). */
    person(sex, creativity = 0.5) {
      return this._unique(() => {
        const n = this.rng.chance(0.25 + creativity * 0.4) ? 3 : 2;
        let s = this._raw(n);
        if (sex === 'f') { if (!/[aeiouy]$/.test(s) || this.rng.chance(0.5)) s = s.replace(/[aeiouy]+$/, '') + this.femEnd; }
        else { if (/[aeiouy]$/.test(s) && this.rng.chance(0.75)) s += this.mascEnd; }
        return this.cap(s);
      });
    }
    place() {
      return this._unique(() => this.cap(this._raw(this.rng.int(1, 2)) + this.rng.pick(this.placeSuffixes)));
    }
    world() { return this.cap(this._raw(2) + this.rng.pick(['ara', 'eth', 'ia', 'oran', 'ys'])); }
    /** Feature name: "Lake Verun", "Mount Kesh" */
    feature(kind) { return `${kind} ${this.place()}`; }
    toJSON() { return { cons: this.cons, vows: this.vows, patterns: this.patterns, femEnd: this.femEnd, mascEnd: this.mascEnd, placeSuffixes: this.placeSuffixes, used: [...this.used], rng: this.rng.getState() }; }
    static fromJSON(j) {
      const l = Object.create(Language.prototype);
      l.rng = new LW.Rng(1); if (j.rng) l.rng.setState(j.rng); l.cons = j.cons; l.vows = j.vows; l.patterns = j.patterns; l.femEnd = j.femEnd; l.mascEnd = j.mascEnd; l.placeSuffixes = j.placeSuffixes; l.used = new Set(j.used);
      return l;
    }
  }

  function pickN(rng, pool, weights, n) {
    const items = pool.slice(), w = weights.slice(), out = [];
    while (out.length < n && items.length) {
      const it = rng.weighted(items, w); const i = items.indexOf(it);
      out.push(it); items.splice(i, 1); w.splice(i, 1);
    }
    return out;
  }

  LW.Language = Language;
})(globalThis.LW || (globalThis.LW = {}));
