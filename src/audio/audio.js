/* LEVENTE — THE CREATOR · audio/audio.js — procedural ambience and event sounds (Web Audio, no assets) */
(function (LW) {
  'use strict';

  class Audio {
    constructor() { this.ctx = null; this.enabled = false; this.muted = false; this.master = null; this.amb = null; this.volume = LW.CONFIG.audio.masterVolume; this.lastEvent = 0; }
    /** Must be called from a user gesture. */
    init() {
      if (this.ctx) return true;
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return false;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.volume; this.master.connect(this.ctx.destination);
      this._ambience(); this.enabled = true; return true;
    }
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05); }
    setVolume(v) { this.volume = v; if (this.master && !this.muted) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); }
    _noise(seconds = 2) { const sr = this.ctx.sampleRate; const buf = this.ctx.createBuffer(1, sr * seconds, sr); const d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; } return buf; }
    _ambience() {
      const c = this.ctx; const noise = this._noise(4); const src = c.createBufferSource(); src.buffer = noise; src.loop = true;
      // wind
      const wind = c.createBiquadFilter(); wind.type = 'lowpass'; wind.frequency.value = 400; const windG = c.createGain(); windG.gain.value = 0; src.connect(wind); wind.connect(windG); windG.connect(this.master);
      // rain
      const rain = c.createBiquadFilter(); rain.type = 'bandpass'; rain.frequency.value = 3200; rain.Q.value = 0.6; const rainG = c.createGain(); rainG.gain.value = 0; src.connect(rain); rain.connect(rainG); rainG.connect(this.master);
      // fire crackle
      const fire = c.createBiquadFilter(); fire.type = 'bandpass'; fire.frequency.value = 900; fire.Q.value = 1.2; const fireG = c.createGain(); fireG.gain.value = 0; src.connect(fire); fire.connect(fireG); fireG.connect(this.master);
      // night crickets: soft high tone with tremolo
      const cr = c.createOscillator(); cr.type = 'triangle'; cr.frequency.value = 4200; const crG = c.createGain(); crG.gain.value = 0; const lfo = c.createOscillator(); lfo.frequency.value = 9; const lfoG = c.createGain(); lfoG.gain.value = 0.5; lfo.connect(lfoG); lfoG.connect(crG.gain); cr.connect(crG); crG.connect(this.master); cr.start(); lfo.start();
      src.start();
      this.amb = { windG, rainG, fireG, crG, wind };
    }
    /** Called each frame with the environment near the camera. */
    ambient(env) {
      if (!this.enabled || !this.amb) return; const t = this.ctx.currentTime;
      this.amb.windG.gain.setTargetAtTime(0.05 + env.wind * 0.35, t, 0.5); this.amb.wind.frequency.setTargetAtTime(250 + env.wind * 500, t, 0.5);
      this.amb.rainG.gain.setTargetAtTime(env.rain * 0.5, t, 0.4);
      this.amb.fireG.gain.setTargetAtTime(env.fire * 0.25, t, 0.4);
      this.amb.crG.gain.setTargetAtTime(env.night * (1 - env.rain) * 0.012 * (env.warm ? 1 : 0.2), t, 1.0);
      if (env.fire > 0 && Math.random() < 0.08) this._crackle(env.fire);
    }
    _crackle(v) { const c = this.ctx; const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 1500 + Math.random() * 2500; const g = c.createGain(); g.gain.value = 0.015 * v; g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.03); o.connect(g); g.connect(this.master); o.start(); o.stop(c.currentTime + 0.04); }
    _tone(freq, dur, type = 'sine', vol = 0.15, delay = 0, slide) { const c = this.ctx; const t0 = c.currentTime + delay; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05); }
    _burst(dur, vol, freq, q = 0.7, delay = 0) { const c = this.ctx; const t0 = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = this._noise(Math.min(4, dur + 0.2)); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t0); f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.15), t0 + dur); f.Q.value = q; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t0); s.stop(t0 + dur + 0.1); }
    /** Play a named cue. */
    play(name) {
      if (!this.enabled || this.muted) return; const now = performance.now(); if (now - this.lastEvent < 40) return; this.lastEvent = now;
      switch (name) {
        case 'birth': this._tone(660, 0.5, 'sine', 0.12); this._tone(990, 0.7, 'sine', 0.1, 0.18); break;
        case 'death': this._tone(220, 1.6, 'sine', 0.14, 0, 110); break;
        case 'love': this._tone(523, 0.4, 'triangle', 0.08); this._tone(659, 0.6, 'triangle', 0.08, 0.15); break;
        case 'discovery': this._tone(523, 0.25, 'triangle', 0.1); this._tone(659, 0.25, 'triangle', 0.1, 0.12); this._tone(784, 0.25, 'triangle', 0.1, 0.24); this._tone(1046, 0.6, 'triangle', 0.12, 0.36); break;
        case 'first': this._tone(392, 0.3, 'sine', 0.12); this._tone(523, 0.3, 'sine', 0.12, 0.15); this._tone(659, 0.3, 'sine', 0.12, 0.3); this._tone(784, 0.9, 'sine', 0.14, 0.45); this._tone(1568, 1.2, 'sine', 0.05, 0.5); break;
        case 'build': this._burst(0.08, 0.2, 1200, 1, 0); this._burst(0.08, 0.18, 1000, 1, 0.16); this._burst(0.1, 0.22, 900, 1, 0.34); break;
        case 'thunder': this._burst(1.8 + Math.random(), 0.5, 300, 0.5, 0.15 + Math.random() * 0.4); break;
        case 'fire': this._burst(0.6, 0.25, 700, 0.8); break;
        case 'god': this._tone(55, 2.2, 'sawtooth', 0.12, 0, 110); this._tone(110, 2.0, 'sine', 0.1, 0.1, 220); this._burst(1.2, 0.2, 500, 0.5, 0.05); break;
        case 'command': this._tone(880, 0.12, 'sine', 0.08); this._tone(1320, 0.3, 'sine', 0.06, 0.1); break;
        case 'settlement': this._tone(330, 0.5, 'triangle', 0.1); this._tone(440, 0.5, 'triangle', 0.1, 0.2); this._tone(550, 0.8, 'triangle', 0.1, 0.4); break;
        case 'conflict': this._burst(0.15, 0.25, 600, 2); this._tone(150, 0.3, 'square', 0.05); break;
        case 'click': this._tone(1200, 0.05, 'square', 0.03); break;
        case 'rain': this._burst(0.5, 0.1, 4000, 0.4); break;
        case 'quake': this._burst(2.5, 0.5, 120, 0.3); break;
        case 'meteor': this._tone(1800, 1.2, 'sawtooth', 0.08, 0, 80); this._burst(2.2, 0.6, 250, 0.4, 1.0); break;
      }
    }
  }
  LW.Audio = Audio;
})(globalThis.LW || (globalThis.LW = {}));
