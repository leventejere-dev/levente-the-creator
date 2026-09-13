/* LEVENTE — THE CREATOR · cloud.js
 * Cloud persistence on top of the GitHub API: the world state lives in the repository
 * (orphan branch `world`, one file, force-updated so the history never grows), so it
 * survives cleared browser data and can be opened from any device.
 *   - anyone can READ it (public repo)  → Observer mode on any device
 *   - the Creator WRITES with a personal access token (Contents: read & write)
 *   - a lease inside the state keeps two open tabs from both simulating the same world
 */
(function (LW) {
  'use strict';
  const API = 'https://api.github.com';

  const Cloud = {
    owner: 'leventejere-dev', repo: 'levente-the-creator', branch: 'world', path: 'world.json.gz',
    tokenKey: 'lw.cloud.token', enabled: true, lastSaveMs: 0, lastLoadMs: 0, saving: false, status: 'idle', error: null,
    sessionId: Math.random().toString(36).slice(2) + Date.now().toString(36),
    get token() { try { return localStorage.getItem(this.tokenKey) || ''; } catch (e) { return ''; } },
    setToken(t) { try { if (t) localStorage.setItem(this.tokenKey, t.trim()); else localStorage.removeItem(this.tokenKey); } catch (e) { /* ignore */ } },
    get canWrite() { return !!this.token; },
    headers(json) { const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; if (this.token) h.Authorization = 'Bearer ' + this.token; if (json) h['Content-Type'] = 'application/json'; return h; },
    /** Latest world text from the cloud ('GZ:...' or raw JSON) with its lease, or null when there is none. */
    async load(opts) {
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
    },
    /** Peek at the meta of a cloud text without inflating everything (cheap when raw JSON; inflates when gzipped). */
    async parseMeta(text) { const json = text.startsWith('GZ:') ? await LW.Store.inflate(text.slice(3)) : text; const m = /"meta":(\{[^{}]*\})/.exec(json); return { json, meta: m ? JSON.parse(m[1]) : null }; },
    /** Write the world text as the single file of an orphan commit; force-move the branch (old commits become garbage). */
    async save(text, message) {
      if (!this.canWrite || this.saving) return false; this.saving = true; this.status = 'saving';
      try {
        const base = `${API}/repos/${this.owner}/${this.repo}/git`;
        const b64 = btoa(unescape(encodeURIComponent(text)));
        const blob = await this.post(`${base}/blobs`, { content: b64, encoding: 'base64' });
        const tree = await this.post(`${base}/trees`, { tree: [{ path: this.path, mode: '100644', type: 'blob', sha: blob.sha }] });
        const commit = await this.post(`${base}/commits`, { message: message || 'a világ állapota', tree: tree.sha, parents: [] });
        const ref = await fetch(`${base}/refs/heads/${this.branch}`, { method: 'PATCH', headers: this.headers(true), body: JSON.stringify({ sha: commit.sha, force: true }) });
        if (ref.status === 422 || ref.status === 404) { const c = await fetch(`${base}/refs`, { method: 'POST', headers: this.headers(true), body: JSON.stringify({ ref: `refs/heads/${this.branch}`, sha: commit.sha }) }); if (!c.ok) throw new Error('ref create ' + c.status); }
        else if (!ref.ok) throw new Error('ref update ' + ref.status);
        this.lastSaveMs = Date.now(); this.status = 'ok'; this.error = null; return true;
      } catch (e) { this.status = 'error'; this.error = String(e.message || e); console.warn('[cloud] save failed', e); return false; }
      finally { this.saving = false; }
    },
    async post(url, body) { const r = await fetch(url, { method: 'POST', headers: this.headers(true), body: JSON.stringify(body) }); if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`${r.status} ${t.slice(0, 120)}`); } return r.json(); },
    /** Verify a token can write to the repo (and read the user). */
    async verify(token) { const old = this.token; this.setToken(token); try { const r = await fetch(`${API}/repos/${this.owner}/${this.repo}`, { headers: this.headers(false) }); if (!r.ok) throw new Error('repo ' + r.status); const j = await r.json(); if (!(j.permissions && j.permissions.push)) throw new Error('a token nem írhat a repóba (Contents: read & write kell)'); return true; } catch (e) { this.setToken(old); throw e; } },
  };
  LW.Cloud = Cloud;
})(globalThis.LW || (globalThis.LW = {}));
