PATCHES = [
('src/main.js', [
("""      if (!this.catchingUp && this.sim.world.meta.started) { this.sim.advance(dt, this.cfg.time.frameBudgetMs); this.sim.world.meta.lastRealTimeMs = Date.now(); }""",
 """      const meta = this.sim.world.meta;
      if (!this.catchingUp && meta.started) {
        if (this.sim.paused) meta.lastRealTimeMs = Date.now(); // a deliberate pause is the Creator's choice: no time accrues
        else {
          // real time owed since the last simulated frame — background tabs are throttled, so this can be much more than one frame
          const owedMs = Math.max(dt, Date.now() - (meta.lastRealTimeMs || Date.now()));
          if (owedMs > 120000) { this.runCatchUp(this.sim, (rep) => this.ui.showWelcomeReport(rep)); }
          else { this.sim.advance(owedMs, this.cfg.time.frameBudgetMs); meta.lastRealTimeMs = Date.now(); }
        }
      }"""),
]),
('src/sim/simulation.js', [
("""      this.tickDebt -= n; if (this.tickDebt > 600) this.tickDebt = 600; // drop unpayable debt""",
 """      this.tickDebt -= n; if (this.tickDebt > 20000) this.tickDebt = 20000; // debt beyond ~this is handled by a real catch-up"""),
]),
]
