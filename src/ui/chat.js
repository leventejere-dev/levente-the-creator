/* LEVENTE — THE CREATOR · ui/chat.js — a közös beszéd: hallgatózás az emberek szavain, és a Teremtő szava hozzájuk */
(function (LW) {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const h = (tag, attrs, ...kids) => { const el = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') el.className = attrs[k]; else if (k === 'html') el.innerHTML = attrs[k]; else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]); else if (k === 'style') el.style.cssText = attrs[k]; else el.setAttribute(k, attrs[k]); } for (const kid of kids) { if (kid == null) continue; el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid); } return el; };
  const excerpt = (s) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > 60 ? s.slice(0, 57) + '…' : s; };

  class Chat {
    constructor(ui) {
      this.ui = ui; this.app = ui.app; this.queue = []; this.lastShown = 0; this.target = 'all'; this.busy = false;
      const box = $('#tab-chat'); box.innerHTML = ''; box.classList.add('chat');
      this.sel = h('select', { id: 'chat-target', title: 'Kihez szólsz', onchange: () => { this.target = this.sel.value; } });
      this.ear = h('input', { type: 'checkbox', id: 'chat-ear', title: 'Isteni fül: minden nem titkos szót értesz. Kikapcsolva a szavakat hallgatózással kell megtanulnod.' });
      this.ear.addEventListener('change', () => { this.world.creatorSettings.divineEar = this.ear.checked; this.app.save(true); this.rerender(); });
      this.llmState = h('span', { class: 'tiny', id: 'chat-llm' });
      this.obey = h('input', { type: 'checkbox', id: 'chat-obey', title: 'Teljes engedelmesség: amit mondasz, megteszik — ha kell, mindent félretéve. Kikapcsolva a maguk feje szerint döntenek (engedelmeskednek, félreértik, félnek, vagy nem törődnek vele).' });
      this.obey.addEventListener('change', () => { this.world.creatorSettings.obedience = this.obey.checked ? 'full' : 'free'; this.ui.cmdMode = this.obey.checked ? 'force' : 'message'; this.ui.refreshGodBar(); this.app.save(true); this.ui.toast(this.obey.checked ? 'Teljes engedelmesség' : 'Szabad akarat', this.obey.checked ? 'A szavad parancs: megteszik, amit mondasz.' : 'A maguk feje szerint döntenek arról, amit kérsz.', true); });
      LW.Voice.init();
      this.speak = h('input', { type: 'checkbox', id: 'chat-speak', title: 'Hang: az emberek szavai és válaszai hallhatók (a böngésző beszédszintézisével)' }); this.speak.checked = LW.Voice.ttsSupported && LW.Voice.speakOn;
      this.speak.addEventListener('change', () => { LW.Voice.setSpeak(this.speak.checked); if (this.speak.checked) LW.Voice.speak('Hallasz engem, Teremtő?', { priority: true }); });
      box.appendChild(h('div', { class: 'chat-head' }, this.sel, h('label', { class: 'tiny', title: 'Isteni fül' }, this.ear, ' isteni fül'), h('label', { class: 'tiny', title: 'Hang' }, this.speak, ' hang'), h('label', { class: 'tiny', title: 'Engedelmesség' }, this.obey, ' parancs'), this.llmState));
      this.stream = h('div', { class: 'chat-stream', id: 'chat-stream' }); box.appendChild(this.stream);
      this.input = h('textarea', { rows: 2, placeholder: 'Szólj hozzájuk… (Enter: küldés, Shift+Enter: új sor)' });
      this.input.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.keyCode === 13) && !e.shiftKey) { e.preventDefault(); this.send(); } });
      this.btn = h('button', { class: 'primary', onclick: () => this.send() }, 'Küldés');
      this.mic = h('button', { class: 'mic', title: 'Szólj hozzájuk mikrofonon — isteni hangként. Kattints, beszélj, a mondat végén magától elküldi.', onclick: () => this.toggleMic() }, 'Mikrofon');
      if (!LW.Voice.sttSupported) { this.mic.disabled = true; this.mic.title = 'Ebben a böngészőben nincs beszédfelismerés (Chrome-ban működik).'; }
      box.appendChild(h('div', { class: 'chat-input' }, this.input, this.mic, this.btn));
      box.appendChild(h('p', { class: 'tiny chat-hint' }, 'Kérhetsz (menj a folyóhoz, építs, fedezd fel, kövesd X-et, gyűjts, vadássz, kísérletezz), kérdezhetsz (hogy vagy? mit csinálsz? mit jelent az, hogy…?), vagy csak beszélhetsz. „Parancs” bekapcsolva megteszik; kikapcsolva a maguk feje szerint döntenek. Egymással a saját nyelvükön beszélnek.'));
    }
    attachWorld(world) {
      this.world = world; this.stream.innerHTML = ''; this.queue = [];
      if (!world._chatHooked) { world._chatHooked = true; world.events.on('Utterance', (ev) => { if (this.app.catchingUp || this.world !== world) return; this.queue.push(ev.utt); if (this.queue.length > 30) this.queue.splice(0, this.queue.length - 30); }); }
      const items = [];
      for (const e of (world.chatLog || []).slice(-40)) items.push({ t: e.t, ms: e.ms || 0, chat: e });
      for (const u of (world.speechLog || []).slice(-16)) items.push({ t: u.t, ms: 0, utt: u });
      items.sort((x, y) => x.t - y.t || x.ms - y.ms);
      for (const it of items) { if (it.chat) this.renderChat(it.chat); else this.renderUtt(it.utt, false); }
      this.ear.checked = !!(world.creatorSettings && world.creatorSettings.divineEar);
      this.obey.checked = !!(world.creatorSettings && world.creatorSettings.obedience === 'full'); this.ui.cmdMode = this.obey.checked ? 'force' : 'message';
      this.refreshTargets(true); this.refreshState(); this.scrollEnd();
    }
    refreshTargets(force) {
      const w = this.world; const list = [...w.agents.values()].filter((a) => LW.Agents.stage(w, a) !== 'infant').sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name, 'hu'));
      const sig = list.map((a) => a.id).join(','); if (!force && sig === this._sig) return; this._sig = sig;
      const cur = this.sel.value || this.target; this.sel.innerHTML = '';
      this.sel.appendChild(h('option', { value: 'all' }, `Mindenkihez (${w.population})`));
      for (const a of list) this.sel.appendChild(h('option', { value: String(a.id) }, a.name));
      this.sel.value = [...this.sel.options].some((o) => o.value === cur) ? cur : 'all'; this.target = this.sel.value;
    }
    setTarget(id) { this.refreshTargets(true); if ([...this.sel.options].some((o) => o.value === String(id))) { this.sel.value = String(id); this.target = String(id); } }
    refreshState() {
      const L = LW.LLM; const t = this.app.observer ? 'megfigyelő: csak hallgatsz' : L.enabled ? (L.status === 'quota' ? 'Gemini: keret kimerült, beépített válasz' : L.status === 'error' ? 'Gemini: hiba, beépített válasz' : `Gemini · ${L.model}`) : 'beépített válaszoló · kulcs a menüben';
      if (this.llmState.textContent !== t) this.llmState.textContent = t;
      const dis = !!this.app.observer; this.input.disabled = dis; this.btn.disabled = dis; if (dis) this.input.placeholder = 'Megfigyelőként csak hallgatod őket. A menüből átveheted a világot.';
    }
    /** képkockánként: a sorban álló megszólalásokból mutat egyet-egyet */
    update() {
      const now = performance.now(); this.refreshState(); if (now - this.lastShown < 700 || !this.queue.length) return; this.lastShown = now;
      const sel = this.ui.selected; let i = this.queue.findIndex((u) => u.a === sel || u.b === sel); if (i < 0) i = this.queue.length - 1;
      const u = this.queue[i]; this.queue.length = 0; this.renderUtt(u, true);
      this.refreshTargets(false);
    }
    name(id) { if (id == null) return 'az égnek'; const a = this.world.agents.get(id) || this.world.deceased.get(id); return a ? a.name : 'valaki'; }
    link(id) { const a = this.world.agents.get(id); return h('b', { class: a ? 'link' : '', onclick: () => { if (a) { this.ui.select(a); this.ui.r.centerOn(a.x, a.y); } } }, this.name(id)); }
    renderUtt(u, live) {
      const w = this.world; if (!w.agents.has(u.a) && !w.deceased.has(u.a)) return;
      if (live && !this.app.observer) { const learned = LW.Speech.decode(w, u); for (const [word, c] of learned) this.line(h('div', { class: 'line sys' }, `Megtanultad: „${word}” = ${LW.Speech.gloss(c)}`)); }
      if (live && this.speak.checked && !this.app.catchingUp && (this.ui.tab === 'chat' || u.a === this.ui.selected || u.b === this.ui.selected)) LW.Voice.speakUtterance(w, u);
      const r = LW.Speech.render(w, u); const prayer = u.b == null;
      const el = h('div', { class: 'line talk' + (prayer ? ' prayer' : '') }, h('time', null, LW.Time.clock(u.t)), this.link(u.a), h('span', { class: 'arrow' }, prayer ? ' → az égnek: ' : ' → '), prayer ? null : this.link(u.b), prayer ? null : h('span', { class: 'arrow' }, ': '), h('span', { class: 'words' }, r.text || '…'), h('div', { class: 'gloss' + (r.full ? '' : ' partial') }, r.gloss ? r.gloss : '(csak mutogat)'));
      this.line(el);
    }
    renderChat(e) {
      const w = this.world;
      if (e.who === 'creator') this.line(h('div', { class: 'line creator' }, h('time', null, LW.Time.clock(e.t)), h('b', null, 'Te'), h('span', { class: 'arrow' }, e.to === 'all' ? ' → mindenkihez: ' : ` → ${this.name(+e.to)}: `), e.text));
      else if (e.utt) { const r = LW.Speech.render(w, e.utt); this.line(h('div', { class: 'line reply own' }, h('time', null, LW.Time.clock(e.t)), this.link(e.who), h('span', { class: 'arrow' }, ' (a maga nyelvén): '), h('span', { class: 'words' }, r.text || '…'), h('div', { class: 'gloss' + (r.full ? '' : ' partial') }, r.gloss || '(csak mutogat)'))); }
      else if (e.sys) this.line(h('div', { class: 'line sys' }, e.text));
      else this.line(h('div', { class: 'line reply' }, h('time', null, LW.Time.clock(e.t)), this.link(e.who), h('span', { class: 'arrow' }, ': '), e.text));
    }
    toggleMic() {
      if (this.app.observer) { this.ui.toast('Megfigyelő mód', 'Innen csak hallgatni lehet őket.', true); return; }
      if (LW.Voice.listening) { LW.Voice.stopListening(); return; }
      const prev = this.input.placeholder; this.mic.classList.add('on'); this.mic.textContent = 'Hallgatlak…'; this.input.placeholder = 'Beszélj… (a mondat végén elküldöm)';
      const done = () => { this.mic.classList.remove('on'); this.mic.textContent = 'Mikrofon'; this.input.placeholder = prev; };
      LW.Voice.listen((interim) => { this.input.value = interim; }, (finalText) => { done(); this.input.value = finalText; this.send(); }, (err) => { done(); this.ui.toast('Mikrofon', err, true); });
      setTimeout(() => { if (!LW.Voice.listening) done(); }, 12000);
    }
    line(el) { const atEnd = this.stream.scrollHeight - this.stream.scrollTop - this.stream.clientHeight < 60; this.stream.appendChild(el); while (this.stream.children.length > 160) this.stream.removeChild(this.stream.firstChild); if (atEnd) this.scrollEnd(); return el; }
    scrollEnd() { this.stream.scrollTop = this.stream.scrollHeight; }
    rerender() { const w = this.world; this.attachWorld(w); }
    async send() {
      const text = this.input.value.trim(); if (!text || this.busy) return; const w = this.world; const D = LW.Dialogue;
      if (this.app.observer) { this.ui.toast('Megfigyelő mód', 'Innen csak hallgatni lehet őket. A menüből átveheted a világot.', true); return; }
      if (!w.meta.started) { this.ui.toast('Még nem indult el a világ', 'Előbb nyomd meg a Nézem gombot.', true); return; }
      this.input.value = ''; this.busy = true; this.btn.disabled = true; this.ui.click();
      const target = this.sel.value || 'all';
      try {
        const entry = D.log(w, { who: 'creator', to: target, text }); this.renderChat(entry);
        if (target === 'all') {
          const r = D.broadcast(w, text, { maxReplies: LW.LLM.enabled ? 2 : 3, preferId: this.ui.selected });
          const sys = D.log(w, { who: 'sys', sys: true, text: `${r.hearers} ember hallotta a hangot az égből.` }); this.renderChat(sys);
          for (const { a, res } of r.replies) await this.deliver(a, res, text);
          if (!r.replies.length) { const s2 = D.log(w, { who: 'sys', sys: true, text: 'Senki nem felelt.' }); this.renderChat(s2); }
        } else {
          const a = w.agents.get(+target); if (!a) { this.renderChat(D.log(w, { who: 'sys', sys: true, text: 'Ő már nincs köztünk.' })); return; }
          const res = D.respond(w, a, text, { allowForce: this.ui.cmdMode === 'force' || this.obey.checked });
          w.events.emit('CreatorSpoke', { tick: w.tick, agentId: a.id, text: `A hang ${a.name} nevét szólította: „${excerpt(text)}”` });
          await this.deliver(a, res, text);
        }
        this.ui.audio.play('command');
      } catch (e) { console.error('chat', e); this.renderChat({ who: 'sys', sys: true, text: 'Hiba történt a beszélgetésben: ' + (e.message || e) }); }
      finally { this.busy = false; this.btn.disabled = !!this.app.observer; this.input.focus(); this.app.save(true); this.ui.refreshGodBar(); }
    }
    async deliver(a, res, text) {
      const w = this.world; const D = LW.Dialogue;
      if (res.asleep && !res.reply && !res.utt) { this.renderChat(D.log(w, { who: 'sys', sys: true, text: `${a.name} alszik; csak álmában hallotta.` })); return; }
      if (res.babble) { this.renderChat(D.log(w, { who: 'sys', sys: true, text: `${a.name} még csecsemő: gőgicsél és rád néz.` })); return; }
      if (res.utt) { const e = D.log(w, { who: a.id, utt: res.utt }); this.renderChat(e); if (this.speak.checked) LW.Voice.speakReply(w, a, res.utt.w.map((x) => x[1]).join(', ')); w.events.emit('CreatorAnswered', { tick: w.tick, agentId: a.id, text: `${a.name} a maga nyelvén felelt a hangnak: „${LW.Speech.render(w, res.utt).text}”` }); return; }
      let reply = res.reply; let pending = null;
      if (LW.LLM.enabled && LW.LLM.quotaWait === 0) {
        pending = this.line(h('div', { class: 'line reply pending' }, h('time', null, LW.Time.clock(w.tick)), this.link(a.id), h('span', { class: 'arrow' }, ': '), h('span', { class: 'dots' }, '…')));
        try { const p = D.prompt(w, a, text, res); const out = await LW.LLM.generate({ system: p.system, user: p.user, json: true, maxTokens: 300, temperature: 0.9 }); const parsed = LW.LLM.parseJSON(out); const r2 = D.applyModel(w, a, parsed); if (r2) reply = r2; }
        catch (e) { if (String(e.message) === 'quota') this.ui.toast('Gemini-keret', 'Az ingyenes keret most kimerült; a beépített válaszoló felel.', true); else console.warn('llm', e); }
        if (pending) pending.remove();
      }
      const e = D.log(w, { who: a.id, text: reply }); this.renderChat(e); if (this.speak.checked) LW.Voice.speakReply(w, a, reply);
      w.events.emit('CreatorAnswered', { tick: w.tick, agentId: a.id, text: `${a.name} felelt a hangnak: „${excerpt(reply)}”` });
    }
  }
  LW.Chat = Chat;
})(globalThis.LW || (globalThis.LW = {}));
