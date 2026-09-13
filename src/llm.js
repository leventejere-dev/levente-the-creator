/* LEVENTE — THE CREATOR · llm.js
 * Nyelvi modell a beszélgetéshez — Google Gemini (ingyenes kulccsal, aistudio.google.com/apikey).
 * A modell semmit nem dönt el: a motor eldönti, mi történik, a modell csak megfogalmazza az
 * ember válaszát a tényekből. Kulcs nélkül a beépített magyar válaszoló dolgozik.
 * A kulcs csak ebben a böngészőben tárolódik; a kérés közvetlenül a Google felé megy.
 */
(function (LW) {
  'use strict';
  const API = 'https://generativelanguage.googleapis.com/v1beta';
  const PREFER = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemma-3-27b-it', 'gemma-3-12b-it'];

  const LLM = {
    keyKey: 'lw.llm.key', modelKey: 'lw.llm.model', status: 'idle', error: null, lastCallMs: 0, calls: 0, quotaUntil: 0, models: [],
    get key() { try { return localStorage.getItem(this.keyKey) || ''; } catch (e) { return ''; } },
    setKey(k) { try { if (k) localStorage.setItem(this.keyKey, k.trim()); else localStorage.removeItem(this.keyKey); } catch (e) { /* ignore */ } },
    get model() { try { return localStorage.getItem(this.modelKey) || ''; } catch (e) { return ''; } },
    setModel(m) { try { if (m) localStorage.setItem(this.modelKey, m); else localStorage.removeItem(this.modelKey); } catch (e) { /* ignore */ } },
    get enabled() { return !!this.key; },
    get quotaWait() { return Math.max(0, this.quotaUntil - Date.now()); },
    /** Elérhető modellek (a kulcs ellenőrzése is ez). */
    async listModels(key) {
      const r = await fetch(`${API}/models?pageSize=100&key=${encodeURIComponent(key)}`); if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'a kulcs nem érvényes' : `modell-lista ${r.status}`);
      const j = await r.json(); const names = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => m.name.replace(/^models\//, ''));
      return names;
    },
    pick(names) {
      const ok = names.filter((n) => !/(preview|exp|thinking|tts|image|audio|live|embedding|vision)/i.test(n) || /flash-lite/.test(n));
      for (const p of PREFER) { const hit = ok.find((n) => n === p) || ok.find((n) => n.startsWith(p)); if (hit) return hit; }
      return ok.find((n) => /flash/.test(n)) || ok.find((n) => /gemma/.test(n)) || ok[0] || null;
    },
    async verify(key) {
      const names = await this.listModels(key); this.models = names; const m = this.model && names.includes(this.model) ? this.model : this.pick(names);
      if (!m) throw new Error('ehhez a kulcshoz nincs használható modell');
      this.setKey(key); if (!this.model || !names.includes(this.model)) this.setModel(m); this.status = 'ok'; this.error = null; return m;
    },
    /** Egy hívás: rendszer-utasítás + felhasználói szöveg → szöveg (JSON-módban a modell JSON-t ad). */
    async generate(o) {
      if (!this.enabled) throw new Error('nincs kulcs'); if (this.quotaWait > 0) throw new Error('quota');
      const model = this.model || 'gemini-2.0-flash'; this.status = 'busy'; this.calls++;
      const body = { contents: [{ role: 'user', parts: [{ text: o.user }] }], generationConfig: { temperature: o.temperature ?? 0.9, maxOutputTokens: o.maxTokens || 400 } };
      if (o.system) body.system_instruction = { parts: [{ text: o.system }] };
      if (o.json && !/gemma/.test(model)) body.generationConfig.responseMimeType = 'application/json';
      body.safetySettings = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map((c) => ({ category: c, threshold: 'BLOCK_ONLY_HIGH' }));
      let r;
      try { r = await fetch(`${API}/models/${model}:generateContent?key=${encodeURIComponent(this.key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
      catch (e) { this.status = 'error'; this.error = 'nincs kapcsolat'; throw e; }
      if (r.status === 429) { this.quotaUntil = Date.now() + 45000; this.status = 'quota'; this.error = 'az ingyenes keret pillanatnyilag kimerült'; throw new Error('quota'); }
      if (!r.ok) { const t = await r.text().catch(() => ''); this.status = 'error'; this.error = `${r.status} ${t.slice(0, 100)}`; throw new Error(this.error); }
      const j = await r.json(); this.lastCallMs = Date.now(); this.status = 'ok'; this.error = null;
      const parts = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts; const text = parts ? parts.map((p) => p.text || '').join('') : '';
      if (!text) { const why = j.candidates && j.candidates[0] && j.candidates[0].finishReason; throw new Error('üres válasz' + (why ? ' (' + why + ')' : '')); }
      return text;
    },
    /** JSON-válasz kinyerése (a modell néha kódblokkba teszi). */
    parseJSON(text) { try { return JSON.parse(text); } catch (e) { const m = /\{[\s\S]*\}/.exec(text); if (m) { try { return JSON.parse(m[0]); } catch (e2) { /* fall through */ } } return { reply: text.replace(/```[a-z]*|```/g, '').trim() }; } },
  };
  LW.LLM = LLM;
})(globalThis.LW || (globalThis.LW = {}));
