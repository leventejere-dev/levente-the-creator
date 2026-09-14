# p051 — a helyi mentés a böngésző adatbázisába (IndexedDB) kerül: a localStorage ~5 MB-os korlátja egy 800 fős
# világnak (8–11 MB tömörítve) kevés volt, ezért „a böngésző tárhelye megtelt”. A régi localStorage-mentés átköltözik.
PATCHES = [
('src/main.js', [
("""  /** localStorage with optional gzip (CompressionStream) — saves are 'GZ:' + base64 when compressed, raw JSON otherwise. */
  const Store = {
    key: LW.CONFIG.persistence.key,
    canGzip: typeof CompressionStream === 'function',
    getRaw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    async get(k) { const s = this.getRaw(k); if (!s) return null; if (!s.startsWith('GZ:')) return s; return this.inflate(s.slice(3)); },
    setRaw(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { console.warn('save failed', e); return false; } },
    async set(k, json) { if (!this.canGzip) return this.setRaw(k, json); try { const gz = await this.deflate(json); return this.setRaw(k, 'GZ:' + gz); } catch (e) { return this.setRaw(k, json); } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },""",
 """  /** A nagy mentések helye: IndexedDB (több száz MB is elfér); a localStorage csak a kis beállításoké. */
  const IDB = {
    db: null,
    open() { if (this.db) return Promise.resolve(this.db); if (typeof indexedDB === 'undefined') return Promise.reject(new Error('nincs IndexedDB')); return new Promise((res, rej) => { const r = indexedDB.open('levente-world', 1); r.onupgradeneeded = () => { r.result.createObjectStore('kv'); }; r.onsuccess = () => { this.db = r.result; this.db.onversionchange = () => { this.db.close(); this.db = null; }; res(this.db); }; r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked')); }); },
    async get(k) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readonly'); const q = t.objectStore('kv').get(k); q.onsuccess = () => res(q.result == null ? null : q.result); q.onerror = () => rej(q.error); }); },
    async set(k, v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abort')); }); },
    async del(k) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); }); },
  };
  /** Mentések: IndexedDB, opcionális gzip (CompressionStream) — 'GZ:' + base64 tömörítve, különben nyers JSON. A localStorage-ban talált régi mentés átköltözik. */
  const Store = {
    key: LW.CONFIG.persistence.key,
    canGzip: typeof CompressionStream === 'function',
    getRaw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    async get(k) {
      let s = null; try { s = await IDB.get(k); } catch (e) { console.warn('IndexedDB olvasás', e); }
      if (!s) { s = this.getRaw(k); if (s) { try { await IDB.set(k, s); localStorage.removeItem(k); } catch (e) { /* marad a localStorage */ } } } // átköltözés a régi helyről
      if (!s) return null; if (!s.startsWith('GZ:')) return s; return this.inflate(s.slice(3));
    },
    setRaw(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { console.warn('save failed', e); return false; } },
    /** Nagy érték gyorsan, tömörítés nélkül (lapelhagyáskor): az adatbázisba indul, nem vár rá senki. */
    setBig(k, v) { IDB.set(k, v).catch((e) => console.warn('IndexedDB írás', e)); },
    async set(k, json) {
      let v = json; if (this.canGzip) { try { v = 'GZ:' + await this.deflate(json); } catch (e) { v = json; } }
      try { await IDB.set(k, v); try { localStorage.removeItem(k); } catch (e) { /* ignore */ } return true; } catch (e) { console.warn('IndexedDB írás', e); return this.setRaw(k, v); }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } IDB.del(k).catch(() => {}); },"""),
("""      if (saved) { try { this.sim = LW.Persistence.fromJSON(saved); restored = true; } catch (e) { console.error('Could not restore the saved world', e); alert('A mentett világot nem sikerült betölteni (' + e.message + '). Új világ jön létre; a régi mentés megmarad a ' + Store.key + '.broken kulcs alatt.'); Store.setRaw(Store.key + '.broken', saved); } }""",
 """      if (saved) { try { this.sim = LW.Persistence.fromJSON(saved); restored = true; } catch (e) { console.error('Could not restore the saved world', e); alert('A mentett világot nem sikerült betölteni (' + e.message + '). Új világ jön létre; a régi mentés megmarad a ' + Store.key + '.broken kulcs alatt.'); Store.setBig(Store.key + '.broken', saved); } }"""),
("""      try { json = LW.Persistence.toJSON(this.sim); this.lastSaveSize = json.length; const ok = await Store.set(Store.key, json); if (!ok && force) this.ui.toast('A mentés nem sikerült', 'A böngésző tárhelye megtelt — exportáld a világot a menüből.', true); } catch (e) { console.error('save error', e); }""",
 """      try { json = LW.Persistence.toJSON(this.sim); this.lastSaveSize = json.length; const ok = await Store.set(Store.key, json); if (!ok && force) this.ui.toast('A helyi mentés nem sikerült', 'A böngésző nem engedte írni az adatbázisát — a világ a felhőben biztonságban van; ha kell, exportáld a menüből.', true); } catch (e) { console.error('save error', e); }"""),
("""    saveSync() { if (this.catchingUp || this.observer) return; try { const json = LW.Persistence.toJSON(this.sim); this.lastSaveSize = json.length; Store.setRaw(Store.key, json); } catch (e) { console.error('save error', e); } }""",
 """    saveSync() { if (this.catchingUp || this.observer) return; try { const json = LW.Persistence.toJSON(this.sim); this.lastSaveSize = json.length; Store.setBig(Store.key, json); } catch (e) { console.error('save error', e); } }"""),
("""    hasSnapshot(slot) { const s = Store.getRaw(`${Store.key}.snap${slot}`); if (!s) return null; const m = Store.getRaw(`${Store.key}.snap${slot}.meta`); return m || 'mentve'; }""",
 """    hasSnapshot(slot) { return Store.getRaw(`${Store.key}.snap${slot}.meta`) || null; }"""),
]),
]
