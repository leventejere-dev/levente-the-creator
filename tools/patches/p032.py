PATCHES = [
('src/index.html', [
("""      <button data-tab="feed" class="active">Hírek</button>
      <button data-tab="god">Teremtő</button>""",
 """      <button data-tab="feed" class="active">Hírek</button>
      <button data-tab="chat" title="Hallgasd őket, és szólj hozzájuk">Beszéd</button>
      <button data-tab="god">Teremtő</button>"""),
("""    <div class="tabbody" id="tab-feed"></div>
    <div class="tabbody hidden" id="tab-god"></div>""",
 """    <div class="tabbody" id="tab-feed"></div>
    <div class="tabbody hidden" id="tab-chat"></div>
    <div class="tabbody hidden" id="tab-god"></div>"""),
]),
('src/styles.css', [
("""#debug { position: absolute;""",
 """/* beszéd */
.tabbody.chat { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.chat-head { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-bottom: 1px solid var(--line); font-size: 11px; }
.chat-head select { max-width: 150px; font: inherit; color: var(--ink); background: var(--panel2); border: 1px solid var(--line); border-radius: 4px; padding: 3px 4px; }
.chat-head label { display: flex; align-items: center; gap: 4px; white-space: nowrap; cursor: pointer; }
.chat-head #chat-llm { margin-left: auto; color: var(--ink3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.chat-stream { flex: 1; overflow-y: auto; padding: 6px 8px; scrollbar-width: thin; }
.chat-stream .line { padding: 4px 6px; margin-bottom: 3px; border-radius: 4px; border-left: 2px solid transparent; font-size: 12px; line-height: 1.4; }
.chat-stream .line time { font-family: var(--mono); font-size: 10px; color: var(--ink3); margin-right: 6px; }
.chat-stream .line b.link { cursor: pointer; color: var(--teal); } .chat-stream .line b.link:hover { text-decoration: underline; }
.chat-stream .line .arrow { color: var(--ink3); }
.chat-stream .line.talk { border-left-color: #3c4a5a; color: var(--ink2); }
.chat-stream .line.talk.prayer { border-left-color: var(--gold2); }
.chat-stream .line .words { font-style: italic; color: var(--ink); letter-spacing: 0.03em; }
.chat-stream .line .gloss { font-size: 10px; color: var(--ink3); padding-left: 2px; } .chat-stream .line .gloss.partial { color: #8a7a55; }
.chat-stream .line.creator { border-left-color: var(--gold); background: rgba(224, 177, 90, 0.08); color: #fff; }
.chat-stream .line.reply { border-left-color: var(--teal); background: rgba(90, 200, 184, 0.06); }
.chat-stream .line.reply.own { border-left-color: var(--rose); }
.chat-stream .line.reply.pending .dots { animation: blink 1s infinite; } @keyframes blink { 50% { opacity: 0.3; } }
.chat-stream .line.sys { color: var(--ink3); font-size: 11px; font-style: italic; }
.chat-input { display: flex; gap: 6px; padding: 6px 8px; border-top: 1px solid var(--line); }
.chat-input textarea { flex: 1; font: inherit; font-size: 12px; color: var(--ink); background: var(--panel2); border: 1px solid var(--line); border-radius: 4px; padding: 5px 7px; resize: none; }
.chat-input textarea:focus { outline: none; border-color: var(--gold2); }
.chat-hint { margin: 0; padding: 4px 8px 6px; color: var(--ink3); font-size: 10px; }
.chip.warn { border-color: rgba(215, 90, 74, 0.5); color: #e6a08f; }
#debug { position: absolute;"""),
]),
('src/render/renderer.js', [
("""      if (lod !== 'region') for (const a of w.agents.values()) { if (a.id !== this.selected && !(this.hoverAgent === a.id)) continue; const p = this.worldToScreen(a.x, a.y); c.fillStyle = 'rgba(0,0,0,0.6)'; const tw = c.measureText(a.name).width + 10; c.fillRect(p.x - tw / 2, p.y - z * 2.2 - 16, tw, 16); c.fillStyle = a.id === this.selected ? '#ffd37a' : '#eee'; c.fillText(a.name, p.x, p.y - z * 2.2 - 4); }""",
 """      if (lod !== 'region') for (const a of w.agents.values()) { if (a.id !== this.selected && !(this.hoverAgent === a.id)) continue; const p = this.worldToScreen(a.x, a.y); c.fillStyle = 'rgba(0,0,0,0.6)'; const tw = c.measureText(a.name).width + 10; c.fillRect(p.x - tw / 2, p.y - z * 2.2 - 16, tw, 16); c.fillStyle = a.id === this.selected ? '#ffd37a' : '#eee'; c.fillText(a.name, p.x, p.y - z * 2.2 - 4); }
      // beszédbuborék: aki az imént szólt, annak a szavai egy pillanatra látszanak (közelről)
      if (z >= 10) { c.font = `italic ${Math.max(10, Math.min(13, z * 0.9))}px "Segoe UI", system-ui, sans-serif`; for (const a of w.agents.values()) { const u = a.lastSaid; if (!u || w.tick - u.t > 6 || (!u.w.length && !u.g.length)) continue; const p = this.worldToScreen(a.x, a.y); if (p.x < -60 || p.x > c.canvas.width + 60 || p.y < -30 || p.y > c.canvas.height + 30) continue; const txt = u.w.length ? u.w.map((x) => x[1]).join(' ') : '…'; const tw = c.measureText(txt).width + 12; const y = p.y - z * 2.2 - (a.id === this.selected || this.hoverAgent === a.id ? 34 : 18); c.fillStyle = 'rgba(245,238,220,0.92)'; c.fillRect(p.x - tw / 2, y - 12, tw, 16); c.fillStyle = '#2a2418'; c.fillText(txt, p.x, y); } c.font = `${Math.max(11, Math.min(16, z))}px "Segoe UI", system-ui, sans-serif`; }"""),
]),
('src/ui/ui.js', [
("""      this.bindTop(); this.bindTabs(); this.bindCanvas(); this.buildGodBar(); this.bindKeys();
      this.attachWorld(this.world);""",
 """      this.bindTop(); this.bindTabs(); this.bindCanvas(); this.buildGodBar(); this.bindKeys();
      this.chat = new LW.Chat(this);
      this.attachWorld(this.world);"""),
("""      world.onHistory = (e) => this.onHistory(e);
      for (const e of world.history.feed.slice(-120)) this.appendFeed(e, false);""",
 """      world.onHistory = (e) => this.onHistory(e);
      this.chat.attachWorld(world);
      for (const e of world.history.feed.slice(-120)) this.appendFeed(e, false);"""),
("""if (this.tab === 'chronicle') this.renderChronicle(); if (this.tab === 'firsts') this.renderFirsts(); if (this.tab === 'people') this.renderPeople(); this.click(); })); }""",
 """if (this.tab === 'chronicle') this.renderChronicle(); if (this.tab === 'firsts') this.renderFirsts(); if (this.tab === 'people') this.renderPeople(); if (this.tab === 'chat') { this.chat.scrollEnd(); if (!this.app.observer) this.chat.input.focus(); } this.click(); })); }
    showTab(name) { const b = document.querySelector(`.tabs button[data-tab="${name}"]`); if (b) b.click(); }"""),
("""    select(a) { this.selected = a.id; this.selKind = 'agent'; this.r.selected = a.id; this._openRight(); this.renderInspector(true); this.refreshGodBar(); }""",
 """    select(a) { this.selected = a.id; this.selKind = 'agent'; this.r.selected = a.id; this._openRight(); this.renderInspector(true); this.refreshGodBar(); if (this.chat && LW.Agents.stage(this.world, a) !== 'infant') this.chat.setTarget(a.id); }"""),
("""      el.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: () => { this.r.follow = this.r.follow === a.id ? null : a.id; this.click(); } }, this.r.follow === a.id ? '● Követem' : 'Követés'), h('button', { onclick: () => { this.showTree(a); this.click(); } }, 'Családfa'), h('button', { onclick: () => { this.showWhy(a); this.click(); } }, 'MIÉRT?')));""",
 """      el.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: () => { this.r.follow = this.r.follow === a.id ? null : a.id; this.click(); } }, this.r.follow === a.id ? '● Követem' : 'Követés'), h('button', { onclick: () => { this.showTree(a); this.click(); } }, 'Családfa'), h('button', { onclick: () => { this.showWhy(a); this.click(); } }, 'MIÉRT?'), h('button', { class: 'primary', onclick: () => { this.chat.setTarget(a.id); this.showTab('chat'); } }, 'Beszélgetés')));"""),
("""      if (a.achievements.length) { el.appendChild(h('h3', null, 'Tettek')); el.appendChild(h('div', { class: 'chips' }, ...a.achievements.map((x) => h('span', { class: 'chip gold' }, x)))); }""",
 """      // nyelv & viszony a hanghoz
      el.appendChild(h('h3', null, 'Nyelv & a hang'));
      const lang = w.langs ? w.langs.get(a.langId) : null; const vk = Object.keys(a.vocab || {}); const secret = vk.filter((c) => a.vocab[c].s).length;
      const tr = a.beliefs.trust || 0; const trLabel = a.beliefs.creator < 0.25 ? 'nem tud rólad' : tr > 0.35 ? 'bízik benned' : tr > 0.1 ? 'inkább bízik benned' : tr < -0.35 ? 'neheztel rád' : tr < -0.1 ? 'tart tőled' : 'még nem döntött rólad';
      el.appendChild(h('div', { class: 'chips' }, h('span', { class: 'chip' }, lang ? LW.Speech.describeLang(w, lang) : 'nincs nyelv'), h('span', { class: 'chip' }, `${vk.length} szó${secret ? ` · ${secret} titkos` : ''}`), h('span', { class: 'chip' + (tr < -0.1 ? ' warn' : tr > 0.1 ? ' gold' : '') }, trLabel)));
      if (vk.length) { const ear = w.creatorSettings && w.creatorSettings.divineEar; const show = vk.slice(-8).map((c) => { const v = a.vocab[c]; const k = LW.Speech.known(w, a.langId, v.w); const und = k || (ear && !v.s); return h('span', { class: 'chip', title: und ? LW.Speech.gloss(c) : 'nem érted (még)' }, `${v.w}${und ? ' = ' + LW.Speech.gloss(c) : ' = ?'}${v.s ? ' 🔒' : ''}`); }); el.appendChild(h('div', { class: 'chips', style: 'margin-top:4px' }, ...show)); }
      if (a.achievements.length) { el.appendChild(h('h3', null, 'Tettek')); el.appendChild(h('div', { class: 'chips' }, ...a.achievements.map((x) => h('span', { class: 'chip gold' }, x)))); }"""),
("""      if (a.divineRequest) return a.divineRequest.force ? 'A testem mozdul, és nem én mozdítom.' : 'Egy hang, aminek nincs szája. El kell döntenem, mit akar.';""",
 """      if (a.divineRequest) return a.divineRequest.force ? 'A testem mozdul, és nem én mozdítom.' : 'Egy hang, aminek nincs szája. El kell döntenem, mit akar.';
      if (a.nudge && w.tick < a.nudge.until && a.plan && a.plan.goal === a.nudge.goal) return `„${a.nudge.text}” — ezt mondta a hang. Talán igaza van.`;"""),
("""      el.appendChild(cloudBox);
      const vol = h('input',""",
 """      el.appendChild(cloudBox);
      // nyelvi modell a beszélgetéshez
      const L = LW.LLM; const aiBox = h('div', { style: 'border:1px solid rgba(90,200,184,.3);border-radius:6px;padding:10px 12px;margin:10px 0' });
      aiBox.appendChild(h('h3', { style: 'margin:0 0 6px;font-size:11px;letter-spacing:.2em;color:#5ac8b8' }, 'BESZÉLGETÉS — NYELVI MODELL (INGYENES GEMINI-KULCS)'));
      aiBox.appendChild(h('p', { class: 'tiny', style: 'margin:0 0 6px' }, `Kulcs nélkül is beszélhetsz velük: a beépített válaszoló az emlékeikből, érzéseikből, kapcsolataikból felel. Ingyenes Google Gemini-kulccsal természetesebben fogalmaznak (a modell csak fogalmaz — hogy mi történik, azt a világ dönti el). Állapot: ${L.enabled ? (L.status === 'quota' ? 'a keret most kimerült, kis szünet' : L.status === 'error' ? 'hiba — ' + L.error : 'kulcs megadva · ' + L.model) : 'NINCS KULCS — beépített válaszoló'}.`));
      const aiIn = h('input', { type: 'password', placeholder: 'Gemini API-kulcs (AIza…)', style: 'width:100%', value: '' }); aiBox.appendChild(aiIn);
      const modelSel = h('select', { style: 'margin-top:6px;max-width:100%;font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:3px 4px' });
      const fillModels = () => { modelSel.innerHTML = ''; const names = L.models.length ? L.models : (L.model ? [L.model] : []); for (const n of names) modelSel.appendChild(h('option', { value: n }, n)); if (L.model) modelSel.value = L.model; modelSel.classList.toggle('hidden', !names.length); };
      fillModels(); modelSel.addEventListener('change', () => { L.setModel(modelSel.value); this.toast('Modell', modelSel.value, true); });
      aiBox.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: async () => { const k = aiIn.value.trim(); if (!k) return; try { const m = await L.verify(k); this.toast('Gemini-kulcs elfogadva', `Modell: ${m}. Beszélgess velük a Beszéd fülön.`, true); this.showMenu(); } catch (e) { this.toast('A kulcs nem jó', String(e.message || e), true); } } }, 'Kulcs mentése'), L.enabled ? h('button', { onclick: () => { L.setKey(''); L.setModel(''); L.models = []; this.toast('Kulcs törölve', 'A beépített válaszoló felel.', true); this.showMenu(); } }, 'Kulcs törlése') : null, L.enabled ? h('button', { onclick: async () => { try { L.models = await L.listModels(L.key); fillModels(); this.toast('Modellek frissítve', `${L.models.length} elérhető`, true); } catch (e) { this.toast('Nem sikerült', String(e.message || e), true); } } }, 'Modellek') : null));
      aiBox.appendChild(modelSel);
      aiBox.appendChild(h('p', { class: 'tiny', style: 'margin:6px 0 0' }, 'Kulcs: aistudio.google.com/apikey → „Create API key” (ingyenes, bankkártya nem kell). A kulcs csak ebben a böngészőben tárolódik; a kérések közvetlenül a Google-hoz mennek. Az ingyenes csomagban a Google felhasználhatja a beszélgetéseket a modelljei fejlesztésére.'));
      el.appendChild(aiBox);
      const vol = h('input',"""),
("""el.appendChild(h('div', { class: 'help-grid' }, h('b', null, 'húzás / WASD'), h('span', null, 'kamera mozgatása'),""",
 """el.appendChild(h('div', { class: 'help-grid' }, h('b', null, 'Beszéd fül'), h('span', null, 'hallgasd, ahogy egymással beszélnek (a saját, kialakuló nyelvükön), és szólj hozzájuk — kérj, kérdezz, sugallj; ők döntik el, mit kezdenek vele'), h('b', null, 'húzás / WASD'), h('span', null, 'kamera mozgatása'),"""),
("""      el.appendChild(h('p', null, 'A világ akkor is él, amikor ez az oldal be van zárva: a felhőben lakik, a GitHub gépei félóránként továbbviszik, és visszatéréskor jelentést kapsz arról, mi történt.'));""",
 """      el.appendChild(h('p', null, 'Nyelv: senki nem kap szavakat. Aki mondani akar valamit, kitalál rá egy szót; a másik megtanulja vagy elrontja; a távol élő csoportok szava eltér, és idővel külön nyelv lesz belőle. Aki neheztel rád, titkos szavakat sugdos, hogy ne értsd. Az „isteni fül” minden nem titkos szót megért; kikapcsolva neked kell kihallgatnod, mi mit jelent — vagy megkérdezni tőlük.'));
      el.appendChild(h('p', null, 'A világ akkor is él, amikor ez az oldal be van zárva: a felhőben lakik, a GitHub gépei félóránként továbbviszik, és visszatéréskor jelentést kapsz arról, mi történt.'));"""),
("""      this.refreshTop(); this.refreshCloud(); if (this.selected != null && !$('#right').classList.contains('hidden')) this.renderInspector();""",
 """      this.refreshTop(); this.refreshCloud(); this.chat.update(); if (this.selected != null && !$('#right').classList.contains('hidden')) this.renderInspector();"""),
]),
]
