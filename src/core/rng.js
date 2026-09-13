/* LEVENTE — THE CREATOR · core/rng.js
 * Seeded randomness and noise. Every random decision in the engine flows through
 * an instance of Rng so worlds are reproducible from (seed, inputs).
 */
(function (LW) {
  'use strict';

  /** 32-bit string/number hash (xmur3) used to derive seeds. */
  function hash32(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  /** sfc32 PRNG — fast, good quality, 128-bit state that can be saved/restored. */
  class Rng {
    constructor(seed) {
      const s = typeof seed === 'string' ? hash32(seed) : (seed >>> 0);
      this.a = s ^ 0x9E3779B9; this.b = (s * 0x85EBCA6B) >>> 0; this.c = (s ^ 0xC2B2AE35) >>> 0; this.d = 1;
      for (let i = 0; i < 12; i++) this.next(); // warm up
    }
    next() {
      const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
      this.d = (this.d + 1) >>> 0;
      this.a = this.b ^ (this.b >>> 9);
      this.b = (this.c + (this.c << 3)) >>> 0;
      this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
      this.c = (this.c + t) >>> 0;
      return (t >>> 0) / 4294967296;
    }
    /** float in [0, 1) */
    f() { return this.next(); }
    /** float in [lo, hi) */
    range(lo, hi) { return lo + (hi - lo) * this.next(); }
    /** integer in [lo, hi] inclusive */
    int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    /** weighted pick: items array, weights array */
    weighted(items, weights) {
      let sum = 0; for (let i = 0; i < weights.length; i++) sum += weights[i];
      let r = this.next() * sum;
      for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
      return items[items.length - 1];
    }
    /** gaussian via Box-Muller */
    gauss(mean = 0, sd = 1) {
      let u = 0, v = 0;
      while (u === 0) u = this.next();
      while (v === 0) v = this.next();
      return mean + sd * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    }
    getState() { return [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0]; }
    setState(s) { this.a = s[0] >>> 0; this.b = s[1] >>> 0; this.c = s[2] >>> 0; this.d = s[3] >>> 0; }
    /** derive an independent child generator (for world-gen sub-steps) */
    fork(label) { return new Rng((hash32(label) ^ this.int(0, 0x7fffffff)) >>> 0); }
  }

  /** Deterministic 2D value noise with fBm and domain warp. Independent from Rng stream. */
  class Noise {
    constructor(seed) {
      const r = new Rng(seed);
      this.perm = new Uint8Array(512);
      const p = [];
      for (let i = 0; i < 256; i++) p.push(i);
      r.shuffle(p);
      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
      this.grad = new Float32Array(512);
      for (let i = 0; i < 512; i++) this.grad[i] = r.f();
    }
    _v(ix, iy) { return this.grad[(this.perm[(ix & 255) + this.perm[iy & 255]]) ]; }
    /** smooth value noise in [0,1] */
    value(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = this._v(ix, iy), b = this._v(ix + 1, iy), c = this._v(ix, iy + 1), d = this._v(ix + 1, iy + 1);
      return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    }
    /** fractal Brownian motion in [0,1] */
    fbm(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
      let sum = 0, amp = 1, norm = 0, fx = x, fy = y;
      for (let i = 0; i < octaves; i++) {
        sum += this.value(fx, fy) * amp; norm += amp;
        amp *= gain; fx *= lacunarity; fy *= lacunarity;
      }
      return sum / norm;
    }
    /** ridged multifractal in [0,1] — mountain chains */
    ridged(x, y, octaves = 4) {
      let sum = 0, amp = 0.5, fx = x, fy = y, norm = 0;
      for (let i = 0; i < octaves; i++) {
        const n = 1 - Math.abs(this.value(fx, fy) * 2 - 1);
        sum += n * n * amp; norm += amp; amp *= 0.5; fx *= 2.1; fy *= 2.1;
      }
      return sum / norm;
    }
  }

  LW.hash32 = hash32;
  LW.Rng = Rng;
  LW.Noise = Noise;
})(globalThis.LW || (globalThis.LW = {}));
