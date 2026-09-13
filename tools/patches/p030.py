PATCHES = [
('src/audio/audio.js', [
# the constant high "cricket" tone was heard as beeping — replaced by a soft, sparse night chirp at very low volume
("""      // night crickets: soft high tone with tremolo
      const cr = c.createOscillator(); cr.type = 'triangle'; cr.frequency.value = 4200; const crG = c.createGain(); crG.gain.value = 0; const lfo = c.createOscillator(); lfo.frequency.value = 9; const lfoG = c.createGain(); lfoG.gain.value = 0.5; lfo.connect(lfoG); lfoG.connect(crG.gain); cr.connect(crG); crG.connect(this.master); cr.start(); lfo.start();
      src.start();
      this.amb = { windG, rainG, fireG, crG, wind };""",
 """      src.start();
      this.amb = { windG, rainG, fireG, wind }; this.nightLevel = 0;"""),
("""      this.amb.crG.gain.setTargetAtTime(env.night * (1 - env.rain) * 0.012 * (env.warm ? 1 : 0.2), t, 1.0);
      if (env.fire > 0 && Math.random() < 0.08) this._crackle(env.fire);""",
 """      this.nightLevel = env.night * (1 - env.rain) * (env.warm ? 1 : 0.15);
      if (this.nightLevel > 0.5 && Math.random() < 0.004) this._chirp(this.nightLevel); // a lone cricket now and then, very quiet
      if (env.fire > 0 && Math.random() < 0.08) this._crackle(env.fire);"""),
("""    _crackle(v) {""",
 """    _chirp(v) { const c = this.ctx; const f = 1800 + Math.random() * 600; for (let k = 0; k < 3; k++) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = c.createGain(); const t0 = c.currentTime + k * 0.09; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.006 * v, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07); o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + 0.08); } }
    _crackle(v) {"""),
]),
('src/core/config.js', [
("""    audio: { masterVolume: 0.5 },""", """    audio: { masterVolume: 0.35 },"""),
]),
]
