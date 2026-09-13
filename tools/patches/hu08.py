PATCHES = [
('src/cloud.js', [
("""    async load() {
      this.lastLoadMs = Date.now();
      const url = `${API}/repos/${this.owner}/${this.repo}/contents/${this.path}?ref=${this.branch}&t=${Date.now()}`;
      const r = await fetch(url, { headers: { ...this.headers(false), Accept: 'application/vnd.github.raw' }, cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`cloud load ${r.status}`);
      const text = await r.text();
      return text;
    },""",
 """    async load(opts) {
      this.lastLoadMs = Date.now();
      // anonymous periodic reads go through the CDN (no rate limit, a few minutes stale); the API is used when fresh data matters
      if (!this.token && opts && opts.cdn) {
        const r = await fetch(`https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${this.path}?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store' });
        if (r.status === 404) return null; if (!r.ok) throw new Error(`cloud load ${r.status}`); return r.text();
      }
      const url = `${API}/repos/${this.owner}/${this.repo}/contents/${this.path}?ref=${this.branch}&t=${Date.now()}`;
      const r = await fetch(url, { headers: { ...this.headers(false), Accept: 'application/vnd.github.raw' }, cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`cloud load ${r.status}`);
      return r.text();
    },"""),
]),
('src/main.js', [
("""      try { const text = await LW.Cloud.load(); if (!text) return; const json = await Store.unwrap(text); const meta = metaOf(json); if (meta && meta.lastSimulatedTick === this.sim.world.tick) return;""",
 """      try { const text = await LW.Cloud.load({ cdn: true }); if (!text) return; const json = await Store.unwrap(text); const meta = metaOf(json); if (meta && meta.lastSimulatedTick === this.sim.world.tick) return;"""),
("""this.observerTimer = setInterval(() => this.observerRefresh(), 60000); }
      else if (restored""", """this.observerTimer = setInterval(() => this.observerRefresh(), 90000); }
      else if (restored"""),
("""becomeObserver(reason) { this.observer = true; this.sim.paused = true; this.ui.showObserver(reason); if (!this.observerTimer) this.observerTimer = setInterval(() => this.observerRefresh(), 60000); }""",
 """becomeObserver(reason) { this.observer = true; this.sim.paused = true; this.ui.showObserver(reason); if (!this.observerTimer) this.observerTimer = setInterval(() => this.observerRefresh(), 90000); }"""),
]),
]
