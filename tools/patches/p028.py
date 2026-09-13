PATCHES = [
('src/main.js', [
# a fresh world is created paused; it starts the moment the Creator first enters ("Watch")
("""      if (restored) this.runCatchUp(this.sim, (rep) => { this.ui.showWelcomeReport(rep); });
      else { this.sim.world.meta.lastRealTimeMs = Date.now(); this.ui.showGenesis(); this.save(true); }""",
 """      if (restored && this.sim.world.meta.started) this.runCatchUp(this.sim, (rep) => { this.ui.showWelcomeReport(rep); });
      else { this.sim.paused = true; this.sim.world.meta.started = false; this.sim.world.meta.lastRealTimeMs = Date.now(); this.ui.showGenesis(); this.ui.refreshSpeed(); this.save(true); }"""),
("""    startAudio() { if (this.audio.init()) { this.audio.resume(); this.ui.refreshSound(); } }""",
 """    /** The world begins the moment the Creator first looks at it. */
    beginWorld() { const w = this.sim.world; if (w.meta.started) return; w.meta.started = true; w.meta.createdMs = Date.now(); w.meta.lastRealTimeMs = Date.now(); this.sim.paused = false; this.ui.refreshSpeed(); this.ui.toast('The world begins', `${w.name}, year 0. From now on everything is up to them.`, false); this.save(true); }
    startAudio() { if (this.audio.init()) { this.audio.resume(); this.ui.refreshSound(); } }"""),
("""      if (!this.catchingUp) { this.sim.advance(dt, this.cfg.time.frameBudgetMs); this.sim.world.meta.lastRealTimeMs = Date.now(); }""",
 """      if (!this.catchingUp && this.sim.world.meta.started) { this.sim.advance(dt, this.cfg.time.frameBudgetMs); this.sim.world.meta.lastRealTimeMs = Date.now(); }"""),
("""    newWorld(seed, population) { const sim = LW.Simulation.newWorld(seed, this.cfg, Date.now(), { population }); this.replaceSim(sim, false); this.ui.showGenesis(); }""",
 """    newWorld(seed, population) { const sim = LW.Simulation.newWorld(seed, this.cfg, Date.now(), { population }); sim.paused = true; sim.world.meta.started = false; this.replaceSim(sim, false); this.ui.showGenesis(); this.ui.refreshSpeed(); }"""),
("""    replaceSim(sim, catchUp) {
      this.sim = sim; this.renderer.setWorld(sim.world); this.ui.attachWorld(sim.world); this.ui.closeModal();
      if (catchUp) this.runCatchUp(sim, (rep) => this.ui.showWelcomeReport(rep));""",
 """    replaceSim(sim, catchUp) {
      this.sim = sim; this.renderer.setWorld(sim.world); this.ui.attachWorld(sim.world); this.ui.closeModal();
      if (sim.world.meta.started == null) sim.world.meta.started = true; // imported/old saves are running worlds
      if (catchUp && sim.world.meta.started) this.runCatchUp(sim, (rep) => this.ui.showWelcomeReport(rep));"""),
]),
('src/ui/ui.js', [
("""      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => { this.closeModal(); this.showHelp(); } }, 'How does this work?'), h('button', { class: 'primary', onclick: () => { this.closeModal(); this.app.startAudio(); } }, 'Watch')));
      this.modal(el);
    }""",
 """      el.appendChild(h('p', null, h('b', null, 'Time has not started yet.'), ' It starts the moment you press Watch — and from then on it never waits for you: while this page is closed, while your computer is off, they keep living, and you will be told what happened.'));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => { this.closeModal(); this.showHelp(); } }, 'How does this work?'), h('button', { class: 'primary', onclick: () => { this.closeModal(); this.app.startAudio(); this.app.beginWorld(); } }, 'Watch')));
      this.modal(el);
    }"""),
("""      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Close')));
      this.modal(el);
    }
    showGenesis() {""",
 """      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => { this.closeModal(); if (!this.world.meta.started) this.showGenesis(); } }, 'Close')));
      this.modal(el);
    }
    showGenesis() {"""),
("""    setSpeed(p) { if (p === 'pause') this.sim.paused = !this.sim.paused; else { this.sim.paused = false; this.sim.setPreset(p); } this.refreshSpeed(); }""",
 """    setSpeed(p) { if (!this.world.meta.started) { this.showGenesis(); return; } if (p === 'pause') this.sim.paused = !this.sim.paused; else { this.sim.paused = false; this.sim.setPreset(p); } this.refreshSpeed(); }"""),
]),
('src/sim/simulation.js', [
("""      world.meta = { seed: world.seed, name: world.name, createdMs: nowMs, lastRealTimeMs: nowMs, lastSimulatedTick: 0, speedPreset: opts.preset || cfg.time.defaultPreset, creatorName: opts.creatorName || 'Levente' };""",
 """      world.meta = { seed: world.seed, name: world.name, createdMs: nowMs, lastRealTimeMs: nowMs, lastSimulatedTick: 0, speedPreset: opts.preset || cfg.time.defaultPreset, creatorName: opts.creatorName || 'Levente', started: true };"""),
]),
('tools/build.py', [
("""with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)""",
 """with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)
with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:   # GitHub Pages serves the repo root
    f.write(html)"""),
]),
]
