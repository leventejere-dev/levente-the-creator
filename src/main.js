/* LEVENTE — THE CREATOR · main.js — browser bootstrap: persistence, catch-up, game loop, headless & test modes */
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
  };

  class App {
    constructor(saved, cfg) {
      this.audio = new LW.Audio(); this.catchingUp = false; this.lastSave = performance.now(); this.lastSaveSize = 0; this.lastReport = null; this.cfg = cfg; this.saving = false;
      let restored = false;
      if (saved) { try { this.sim = LW.Persistence.fromJSON(saved); restored = true; } catch (e) { console.error('Could not restore the saved world', e); alert('The saved world could not be loaded (' + e.message + '). A new world will be created; the old save is kept under key ' + Store.key + '.broken'); Store.setRaw(Store.key + '.broken', saved); } }
      if (!restored) { const seed = q.has('seed') ? (/^\d+$/.test(q.get('seed')) ? (+q.get('seed') >>> 0) : LW.hash32(q.get('seed'))) : ((Math.random() * 4294967295) >>> 0); this.sim = LW.Simulation.newWorld(seed, cfg, Date.now(), { population: +q.get('pop') || cfg.genesis.population }); }
      this.renderer = new LW.Renderer($('#world'), $('#minimap'), this.sim.world);
      this.ui = new LW.UI(this);
      if (Store.getRaw('lw.muted') === '1') this.audio.muted = true;
      if (restored) this.runCatchUp(this.sim, (rep) => { this.ui.showWelcomeReport(rep); });
      else { this.sim.world.meta.lastRealTimeMs = Date.now(); this.ui.showGenesis(); this.save(true); }
      this.loop = this.loop.bind(this); this.last = performance.now(); requestAnimationFrame(this.loop);
      window.addEventListener('beforeunload', () => this.saveSync()); document.addEventListener('visibilitychange', () => { if (document.hidden) this.saveSync(); });
      window.addEventListener('pointerdown', () => this.startAudio(), { once: true }); window.addEventListener('keydown', () => this.startAudio(), { once: true });
      this.audioEnv = { rain: 0, wind: 0, fire: 0, night: 0, warm: true };
    }
    runCatchUp(sim, done) {
      this.ui.showCatchup(0, 'Waking the world…'); this.catchingUp = true; sim.paused = true;
      sim.catchUp(Date.now(), { progress: (p, label) => this.ui.showCatchup(p, label), done: (rep) => { this.catchingUp = false; sim.paused = false; this.lastReport = rep; this.renderer.bakeAll(); this.ui.attachWorld(sim.world); done(rep); this.save(true); } });
    }
    startAudio() { if (this.audio.init()) { this.audio.resume(); this.ui.refreshSound(); } }
    toggleSound() { this.startAudio(); this.audio.setMuted(!this.audio.muted); Store.setRaw('lw.muted', this.audio.muted ? '1' : '0'); }
    loop(now) {
      const dt = Math.min(250, now - this.last); this.last = now;
      if (!this.catchingUp) { this.sim.advance(dt, this.cfg.time.frameBudgetMs); this.sim.world.meta.lastRealTimeMs = Date.now(); }
      this.renderer.draw(this.sim, this.audioEnv); this.audio.ambient(this.audioEnv); this.ui.update(dt);
      if (!this.catchingUp && now - this.lastSave > this.cfg.persistence.autosaveSeconds * 1000) this.save();
      requestAnimationFrame(this.loop);
    }
    /** Async (compressed) save used by autosave and explicit saves. */
    async save(force) {
      if (this.catchingUp || this.saving) return; this.lastSave = performance.now(); this.saving = true;
      try { const json = LW.Persistence.toJSON(this.sim); this.lastSaveSize = json.length; const ok = await Store.set(Store.key, json); if (!ok && force) this.ui.toast('Save failed', 'Browser storage is full — export the world from the menu.', true); } catch (e) { console.error('save error', e); } finally { this.saving = false; }
    }
    /** Synchronous raw save for page-hide / unload (no time for compression). */
    saveSync() { if (this.catchingUp) return; try { const json = LW.Persistence.toJSON(this.sim); this.lastSaveSize = json.length; Store.setRaw(Store.key, json); } catch (e) { console.error('save error', e); } }
    exportWorld() { const json = LW.Persistence.toJSON(this.sim); const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${this.sim.world.name}-year${this.sim.world.year}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    importWorld() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const sim = LW.Persistence.fromJSON(String(r.result)); this.replaceSim(sim, true); this.ui.toast('World imported', sim.world.name, true); } catch (e) { alert('Import failed: ' + e.message); } }; r.readAsText(f); }; inp.click(); }
    replaceSim(sim, catchUp) {
      this.sim = sim; this.renderer.setWorld(sim.world); this.ui.attachWorld(sim.world); this.ui.closeModal();
      if (catchUp) this.runCatchUp(sim, (rep) => this.ui.showWelcomeReport(rep));
      else { sim.world.meta.lastRealTimeMs = Date.now(); this.save(true); }
    }
    newWorld(seed, population) { const sim = LW.Simulation.newWorld(seed, this.cfg, Date.now(), { population }); this.replaceSim(sim, false); this.ui.showGenesis(); }
    hasSnapshot(slot) { const s = Store.getRaw(`${Store.key}.snap${slot}`); if (!s) return null; const m = Store.getRaw(`${Store.key}.snap${slot}.meta`); return m || 'saved'; }
    async snapshot(slot) { const json = LW.Persistence.toJSON(this.sim); const ok = await Store.set(`${Store.key}.snap${slot}`, json); if (ok) { Store.setRaw(`${Store.key}.snap${slot}.meta`, `${this.sim.world.name} · year ${this.sim.world.year}`); this.ui.toast('Snapshot saved', `Slot ${slot} · year ${this.sim.world.year}`, true); } else this.ui.toast('Snapshot failed', 'Browser storage is full.', true); }
    async restoreSnapshot(slot) { const s = await Store.get(`${Store.key}.snap${slot}`); if (!s) return; try { const sim = LW.Persistence.fromJSON(s); sim.world.meta.lastRealTimeMs = Date.now(); this.replaceSim(sim, false); this.ui.toast('Timeline restored', `Continuing from year ${sim.world.year} — an alternate history begins.`, false); } catch (e) { alert('Restore failed: ' + e.message); } }
  }

  function headless() {
    const out = $('#headless'); out.classList.remove('hidden'); const lines = []; const log = (s) => { lines.push(s); out.textContent = lines.join('\n'); };
    const years = +q.get('headless') || 5; const seed = q.has('seed') ? (+q.get('seed') >>> 0) : 12345; const mode = q.get('mode') || 'mixed';
    log(`LEVENTE — THE CREATOR · headless run · seed ${seed} · ${years} years · ${mode}`);
    setTimeout(() => { const { metrics } = LW.runHeadless({ seed, years, mode, log, checkInvariants: true }); log(`\n${metrics.ms} ms · errors ${metrics.errors} · sim errors ${metrics.simErrors.length}`); log('\nFIRSTS'); for (const k in metrics.firsts) log(`  Y${metrics.firsts[k].year} ${metrics.firsts[k].title}`); log('\nCHRONICLE (last 80)'); for (const c of metrics.chronicle.slice(-80)) log('  ' + c); log('\nEVENTS ' + JSON.stringify(metrics.eventsByClass)); window.__metrics = metrics; }, 30);
  }
  function tests() {
    const out = $('#headless'); out.classList.remove('hidden'); const lines = ['LEVENTE — THE CREATOR · simulation invariants']; const log = (s) => { lines.push(s); out.textContent = lines.join('\n'); }; out.textContent = lines.join('\n');
    setTimeout(() => { const r = LW.Invariants.suite(log); log(`\n${r.passed} passed · ${r.failed} failed`); window.__tests = r; }, 30);
  }

  window.addEventListener('DOMContentLoaded', async () => {
    if (q.has('headless')) return headless();
    if (q.has('test')) return tests();
    const cfg = JSON.parse(JSON.stringify(LW.CONFIG));
    for (const [k, v] of q.entries()) if (k.startsWith('cfg.')) { const path = k.slice(4).split('.'); let o = cfg; for (let i = 0; i < path.length - 1; i++) o = o[path[i]] = o[path[i]] || {}; o[path[path.length - 1]] = isNaN(+v) ? v : +v; }
    let saved = null;
    if (!q.has('seed') && !q.has('fresh')) { try { saved = await Store.get(Store.key); } catch (e) { console.error('load failed', e); } }
    try { window.app = new App(saved, cfg); } catch (e) { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="position:absolute;inset:0;background:#111;color:#f88;padding:20px;z-index:99">Failed to start: ${e.stack || e}</pre>`); }
  });
  LW.Store = Store;
})(globalThis.LW || (globalThis.LW = {}));
