/* LEVENTE — THE CREATOR · main.js — browser bootstrap: local + cloud persistence, observer mode, catch-up, game loop, headless & test modes */
(function (LW) {
  'use strict';
  const q = new URLSearchParams(location.search);
  const $ = (s) => document.querySelector(s);

  /** localStorage with optional gzip (CompressionStream) — saves are 'GZ:' + base64 when compressed, raw JSON otherwise. */
  const Store = {
    key: LW.CONFIG.persistence.key,
    canGzip: typeof CompressionStream === 'function',
    getRaw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    async get(k) { const s = this.getRaw(k); if (!s) return null; if (!s.startsWith('GZ:')) return s; return this.inflate(s.slice(3)); },
    setRaw(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { console.warn('save failed', e); return false; } },
    async set(k, json) { if (!this.canGzip) return this.setRaw(k, json); try { const gz = await this.deflate(json); return this.setRaw(k, 'GZ:' + gz); } catch (e) { return this.setRaw(k, json); } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    async deflate(str) { const cs = new CompressionStream('gzip'); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)); w.close(); const buf = await new Response(cs.readable).arrayBuffer(); const u8 = new Uint8Array(buf); let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); },
    async inflate(b64) { const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const ds = new DecompressionStream('gzip'); const w = ds.writable.getWriter(); w.write(u8); w.close(); return new Response(ds.readable).text(); },
    /** 'GZ:...' or raw JSON → JSON text */
    async unwrap(text) { if (!text) return null; return text.startsWith('GZ:') ? this.inflate(text.slice(3)) : text; },
  };
  const metaOf = (json) => { const m = /"meta":(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/.exec(json); try { return m ? JSON.parse(m[1]) : null; } catch (e) { return null; } };

  class App {
    constructor(saved, cfg, opts) {
      this.audio = new LW.Audio(); this.catchingUp = false; this.lastSave = performance.now(); this.lastSaveSize = 0; this.lastReport = null; this.cfg = cfg; this.saving = false;
      this.observer = !!(opts && opts.observer); this.cloudEvery = 120000; this.lastCloudSave = performance.now(); this.pendingCloud = false;
      let restored = false;
      if (saved) { try { this.sim = LW.Persistence.fromJSON(saved); restored = true; } catch (e) { console.error('Could not restore the saved world', e); alert('A mentett világot nem sikerült betölteni (' + e.message + '). Új világ jön létre; a régi mentés megmarad a ' + Store.key + '.broken kulcs alatt.'); Store.setRaw(Store.key + '.broken', saved); } }
      if (!restored) { const seed = q.has('seed') ? (/^\d+$/.test(q.get('seed')) ? (+q.get('seed') >>> 0) : LW.hash32(q.get('seed'))) : ((Math.random() * 4294967295) >>> 0); this.sim = LW.Simulation.newWorld(seed, cfg, Date.now(), { population: +q.get('pop') || cfg.genesis.population }); }
      this.renderer = new LW.Renderer($('#world'), $('#minimap'), this.sim.world);
      this.ui = new LW.UI(this);
      if (Store.getRaw('lw.muted') === '1') this.audio.muted = true;
      if (this.observer) { this.sim.paused = true; this.ui.showObserver(opts.reason); this.observerTimer = setInterval(() => this.observerRefresh(), 90000); }
      else if (restored && this.sim.world.meta.started !== false) this.runCatchUp(this.sim, (rep) => { this.ui.showWelcomeReport(rep); });
      else { this.sim.paused = true; this.sim.world.meta.started = false; this.sim.world.meta.lastRealTimeMs = Date.now(); this.ui.showGenesis(); this.ui.refreshSpeed(); this.save(true); }
      this.loop = this.loop.bind(this); this.last = performance.now(); requestAnimationFrame(this.loop);
      window.addEventListener('beforeunload', () => this.saveSync()); document.addEventListener('visibilitychange', () => { if (document.hidden) { this.saveSync(); this.save(true); } });
      window.addEventListener('pointerdown', () => this.startAudio(), { once: true }); window.addEventListener('keydown', () => this.startAudio(), { once: true });
      this.audioEnv = { rain: 0, wind: 0, fire: 0, night: 0, warm: true };
    }
    runCatchUp(sim, done) {
      this.ui.showCatchup(0, 'A világ ébred…'); this.catchingUp = true; sim.paused = true;
      sim.catchUp(Date.now(), { progress: (p, label) => this.ui.showCatchup(p, label), done: (rep) => { this.catchingUp = false; sim.paused = false; this.lastReport = rep; this.renderer.bakeAll(); this.ui.attachWorld(sim.world); done(rep); this.save(true); } });
    }
    /** The world begins the moment the Creator first looks at it. */
    beginWorld() { const w = this.sim.world; if (w.meta.started) return; w.meta.started = true; w.meta.createdMs = Date.now(); w.meta.lastRealTimeMs = Date.now(); this.sim.paused = false; this.ui.refreshSpeed(); this.ui.toast('A világ elindult', `${w.name}, nulladik év. Mostantól minden rajtuk múlik.`, false); this.save(true); }
    startAudio() { if (this.audio.init()) { this.audio.resume(); this.ui.refreshSound(); } }
    toggleSound() { this.startAudio(); this.audio.setMuted(!this.audio.muted); Store.setRaw('lw.muted', this.audio.muted ? '1' : '0'); }
    loop(now) {
      const dt = Math.min(250, now - this.last); this.last = now;
      const meta = this.sim.world.meta;
      if (!this.observer && !this.catchingUp && meta.started) {
        if (this.sim.paused) meta.lastRealTimeMs = Date.now(); // a deliberate pause is the Creator's choice: no time accrues
        else {
          // real time owed since the last simulated frame — background tabs are throttled, so this can be much more than one frame
          const owedMs = Math.max(dt, Date.now() - (meta.lastRealTimeMs || Date.now()));
          if (owedMs > 120000) { this.runCatchUp(this.sim, (rep) => this.ui.showWelcomeReport(rep)); }
          else { this.sim.advance(owedMs, this.cfg.time.frameBudgetMs); meta.lastRealTimeMs = Date.now(); }
        }
      }
      this.renderer.draw(this.sim, this.audioEnv); this.audio.ambient(this.audioEnv); this.ui.update(dt);
      if (!this.observer && !this.catchingUp && now - this.lastSave > this.cfg.persistence.autosaveSeconds * 1000) this.save();
      requestAnimationFrame(this.loop);
    }
    /** Async (compressed) local save; also pushes to the cloud every couple of minutes or when forced. */
    async save(force) {
      if (this.catchingUp || this.observer || this.saving) return; this.lastSave = performance.now(); this.saving = true;
      let json = null;
      try { json = LW.Persistence.toJSON(this.sim); this.lastSaveSize = json.length; const ok = await Store.set(Store.key, json); if (!ok && force) this.ui.toast('A mentés nem sikerült', 'A böngésző tárhelye megtelt — exportáld a világot a menüből.', true); } catch (e) { console.error('save error', e); }
      finally { this.saving = false; }
      if (json && LW.Cloud.canWrite && this.sim.world.meta.started && (force || performance.now() - this.lastCloudSave > this.cloudEvery)) this.cloudSave(json);
    }
    /** Synchronous raw save for page-hide / unload (no time for compression). */
    saveSync() { if (this.catchingUp || this.observer) return; try { const json = LW.Persistence.toJSON(this.sim); this.lastSaveSize = json.length; Store.setRaw(Store.key, json); } catch (e) { console.error('save error', e); } }
    async cloudSave(json) {
      if (this.pendingCloud) return; this.pendingCloud = true; this.lastCloudSave = performance.now();
      try {
        // someone else may have taken the world over on another device (the GitHub host always yields to a browser)
        const other = await this.cloudLease();
        const mine = this.sim.world.meta.lease;
        if (other && other.sessionId !== LW.Cloud.sessionId && !other.sessionId.startsWith('host:') && (!mine || other.at > mine.at)) { this.becomeObserver('A világot egy másik gépen vették át.'); return; }
        this.sim.world.meta.lease = { sessionId: LW.Cloud.sessionId, at: Date.now() };
        const fresh = LW.Persistence.toJSON(this.sim);
        const text = Store.canGzip ? 'GZ:' + await Store.deflate(fresh) : fresh;
        await LW.Cloud.save(text, `${this.sim.world.name} · ${this.sim.world.year}. év`);
        this.ui.refreshCloud();
      } catch (e) { console.warn('cloud save', e); } finally { this.pendingCloud = false; }
    }
    async cloudLease() { try { const text = await LW.Cloud.load(); if (!text) return null; const json = await Store.unwrap(text); const m = metaOf(json); return m && m.lease ? m.lease : null; } catch (e) { return null; } }
    becomeObserver(reason) { this.observer = true; this.sim.paused = true; this.ui.showObserver(reason); if (!this.observerTimer) this.observerTimer = setInterval(() => this.observerRefresh(), 90000); }
    async observerRefresh() {
      try { const text = await LW.Cloud.load({ cdn: true }); if (!text) return; const json = await Store.unwrap(text); const meta = metaOf(json); if (meta && meta.lastSimulatedTick === this.sim.world.tick) return; const sim = LW.Persistence.fromJSON(json); sim.paused = true; this.sim = sim; this.renderer.setWorld(sim.world); this.ui.attachWorld(sim.world); this.ui.refreshCloud(); } catch (e) { console.warn('observer refresh', e); }
    }
    /** Take the world over on this device (needs a key): the other device notices at its next cloud save. */
    async takeOver() {
      if (!LW.Cloud.canWrite) { this.ui.toast('Nincs kulcs', 'Ehhez a menüben add meg a Teremtő-kulcsodat.', true); return; }
      if (this.observerTimer) { clearInterval(this.observerTimer); this.observerTimer = null; }
      await this.observerRefresh(); this.observer = false; this.ui.hideObserver();
      this.sim.world.meta.lease = { sessionId: LW.Cloud.sessionId, at: Date.now() };
      if (this.sim.world.meta.started === false) { this.sim.paused = true; this.ui.showGenesis(); } else this.runCatchUp(this.sim, (rep) => this.ui.showWelcomeReport(rep));
    }
    exportWorld() { const json = LW.Persistence.toJSON(this.sim); const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${this.sim.world.name}-${this.sim.world.year}-ev.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    importWorld() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const sim = LW.Persistence.fromJSON(String(r.result)); this.replaceSim(sim, true); this.ui.toast('Világ importálva', sim.world.name, true); } catch (e) { alert('Az importálás nem sikerült: ' + e.message); } }; r.readAsText(f); }; inp.click(); }
    replaceSim(sim, catchUp) {
      this.sim = sim; this.renderer.setWorld(sim.world); this.ui.attachWorld(sim.world); this.ui.closeModal();
      if (sim.world.meta.started == null) sim.world.meta.started = true; // imported/old saves are running worlds
      if (catchUp && sim.world.meta.started) this.runCatchUp(sim, (rep) => this.ui.showWelcomeReport(rep));
      else { sim.world.meta.lastRealTimeMs = Date.now(); this.save(true); }
    }
    newWorld(seed, population) { const sim = LW.Simulation.newWorld(seed, this.cfg, Date.now(), { population }); sim.paused = true; sim.world.meta.started = false; this.replaceSim(sim, false); this.ui.showGenesis(); this.ui.refreshSpeed(); }
    hasSnapshot(slot) { const s = Store.getRaw(`${Store.key}.snap${slot}`); if (!s) return null; const m = Store.getRaw(`${Store.key}.snap${slot}.meta`); return m || 'mentve'; }
    async snapshot(slot) { const json = LW.Persistence.toJSON(this.sim); const ok = await Store.set(`${Store.key}.snap${slot}`, json); if (ok) { Store.setRaw(`${Store.key}.snap${slot}.meta`, `${this.sim.world.name} · ${this.sim.world.year}. év`); this.ui.toast('Pillanatkép mentve', `${slot}. hely · ${this.sim.world.year}. év`, true); } else this.ui.toast('A pillanatkép nem sikerült', 'A böngésző tárhelye megtelt.', true); }
    async restoreSnapshot(slot) { const s = await Store.get(`${Store.key}.snap${slot}`); if (!s) return; try { const sim = LW.Persistence.fromJSON(s); sim.world.meta.lastRealTimeMs = Date.now(); this.replaceSim(sim, false); this.ui.toast('Idővonal visszaállítva', `Folytatás a(z) ${sim.world.year}. évtől — egy másik történelem kezdődik.`, false); } catch (e) { alert('A visszaállítás nem sikerült: ' + e.message); } }
  }

  function headless() {
    const out = $('#headless'); out.classList.remove('hidden'); const lines = []; const log = (s) => { lines.push(s); out.textContent = lines.join('\n'); };
    const years = +q.get('headless') || 5; const seed = q.has('seed') ? (+q.get('seed') >>> 0) : 12345; const mode = q.get('mode') || 'mixed';
    log(`LEVENTE — THE CREATOR · fej nélküli futás · seed ${seed} · ${years} év · ${mode}`);
    setTimeout(() => { const { metrics } = LW.runHeadless({ seed, years, mode, log, checkInvariants: true }); log(`\n${metrics.ms} ms · errors ${metrics.errors} · sim errors ${metrics.simErrors.length}`); log('\nFIRSTS'); for (const k in metrics.firsts) log(`  ${metrics.firsts[k].year}. év ${metrics.firsts[k].title}`); log('\nCHRONICLE (last 80)'); for (const c of metrics.chronicle.slice(-80)) log('  ' + c); log('\nEVENTS ' + JSON.stringify(metrics.eventsByClass)); window.__metrics = metrics; }, 30);
  }
  function tests() {
    const out = $('#headless'); out.classList.remove('hidden'); const lines = ['LEVENTE — THE CREATOR · szimulációs invariánsok']; const log = (s) => { lines.push(s); out.textContent = lines.join('\n'); }; out.textContent = lines.join('\n');
    setTimeout(() => { const r = LW.Invariants.suite(log); log(`\n${r.passed} sikeres · ${r.failed} hibás`); window.__tests = r; }, 30);
  }

  /** Decide what to load: local cache vs cloud; whether this device is the Creator or an observer. */
  async function boot(cfg) {
    let local = null, cloud = null;
    if (!q.has('seed') && !q.has('fresh')) { try { local = await Store.get(Store.key); } catch (e) { console.error('load failed', e); } }
    if (!q.has('seed') && !q.has('fresh') && !q.has('local')) { try { cloud = await Store.unwrap(await LW.Cloud.load()); LW.Cloud.status = cloud ? 'ok' : 'empty'; } catch (e) { console.warn('cloud unavailable', e); LW.Cloud.status = 'offline'; } }
    const lm = local ? metaOf(local) : null, cm = cloud ? metaOf(cloud) : null;
    let saved = local, observer = false, reason = null, note = 'local';
    if (cm && (!lm || (cm.lastRealTimeMs || 0) >= (lm.lastRealTimeMs || 0) || cm.seed !== lm.seed)) {
      saved = cloud; note = 'cloud'; // the cloud is newer (or a different world): it wins
      const lease = cm.lease; const other = lease && lease.sessionId !== LW.Cloud.sessionId && !String(lease.sessionId).startsWith('host:') && Date.now() - lease.at < 6 * 60000;
      if (other) { observer = true; reason = 'A világ most egy másik gépen fut.'; }
      else if (!LW.Cloud.canWrite) { observer = true; reason = 'Ezen a gépen nincs Teremtő-kulcs, ezért csak nézni lehet.'; }
    }
    window.app = new App(saved, cfg, { observer, reason }); window.app.bootNote = note;
    if (!observer && saved && note === 'local' && cm === null && LW.Cloud.canWrite && LW.Cloud.status !== 'offline') window.app.save(true); // first upload of a local-only world
  }

  window.addEventListener('DOMContentLoaded', async () => {
    if (q.has('headless')) return headless();
    if (q.has('test')) return tests();
    const cfg = JSON.parse(JSON.stringify(LW.CONFIG));
    for (const [k, v] of q.entries()) if (k.startsWith('cfg.')) { const path = k.slice(4).split('.'); let o = cfg; for (let i = 0; i < path.length - 1; i++) o = o[path[i]] = o[path[i]] || {}; o[path[path.length - 1]] = isNaN(+v) ? v : +v; }
    try { await boot(cfg); } catch (e) { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="position:absolute;inset:0;background:#111;color:#f88;padding:20px;z-index:99">Nem sikerült elindítani: ${e.stack || e}</pre>`); }
  });
  LW.Store = Store;
})(globalThis.LW || (globalThis.LW = {}));
