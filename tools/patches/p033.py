PATCHES = [
('src/manifest.json', [
("""    "cloud.js",
    "llm.js",
    "audio/audio.js",
    "render/sprites.js",""",
 """    "cloud.js",
    "llm.js",
    "voice.js",
    "audio/audio.js",
    "render/icons.js",
    "render/sprites.js","""),
]),
('src/styles.css', [
(""".godbtn i { font-style: normal; font-size: 16px; color: var(--ink); margin-bottom: 1px; }""",
 """.godbtn i { font-style: normal; font-size: 16px; color: var(--ink); margin-bottom: 1px; }
.godbtn canvas.icon { image-rendering: pixelated; image-rendering: crisp-edges; display: block; margin-bottom: 2px; }
.godbtn.danger canvas.icon { filter: drop-shadow(0 0 2px rgba(255, 90, 60, 0.6)); }
.chat-head button.mini { padding: 2px 7px; font-size: 11px; }
.chat-input button.mic { min-width: 74px; } .chat-input button.mic.on { background: var(--red); border-color: var(--red); color: #fff; animation: blink 1s infinite; }"""),
]),
('src/ui/ui.js', [
("""      for (const [k, K] of Object.entries(LW.God.KINDS)) { const b = h('button', { class: 'godbtn' + (['disease', 'kill', 'destroy', 'meteor', 'earthquake', 'fire', 'lightning'].includes(k) ? ' danger' : ''), title: K.desc, onclick: () => this.pickGod(k) }, h('i', null, K.icon), K.label); b.dataset.god = k; box.appendChild(b); }""",
 """      for (const [k, K] of Object.entries(LW.God.KINDS)) { const b = h('button', { class: 'godbtn' + (['disease', 'kill', 'destroy', 'meteor', 'earthquake', 'fire', 'lightning'].includes(k) ? ' danger' : ''), title: K.desc, onclick: () => this.pickGod(k) }, LW.Icons.el(k, 20), K.label); b.dataset.god = k; box.appendChild(b); }"""),
("""      for (const [k, label] of Object.entries(LW.God.COMMANDS)) cb.appendChild(h('button', { class: 'godbtn', onclick: () => this.pickCmd(k) }, h('i', null, { go: '➤', build: '⌂', follow: '↝', protect: '⛨', explore: '✧', leave: '⇥', search: '⌕' }[k]), label));""",
 """      for (const [k, label] of Object.entries(LW.God.COMMANDS)) cb.appendChild(h('button', { class: 'godbtn', onclick: () => this.pickCmd(k) }, LW.Icons.el(k, 20), label));"""),
]),
('src/ui/chat.js', [
("""      this.llmState = h('span', { class: 'tiny', id: 'chat-llm' });
      box.appendChild(h('div', { class: 'chat-head' }, this.sel, h('label', { class: 'tiny', title: 'Isteni fül' }, this.ear, ' isteni fül'), this.llmState));""",
 """      this.llmState = h('span', { class: 'tiny', id: 'chat-llm' });
      LW.Voice.init();
      this.speak = h('input', { type: 'checkbox', id: 'chat-speak', title: 'Hang: az emberek szavai és válaszai hallhatók (a böngésző beszédszintézisével)' }); this.speak.checked = LW.Voice.ttsSupported && LW.Voice.speakOn;
      this.speak.addEventListener('change', () => { LW.Voice.setSpeak(this.speak.checked); if (this.speak.checked) LW.Voice.speak('Hallasz engem, Teremtő?', { priority: true }); });
      box.appendChild(h('div', { class: 'chat-head' }, this.sel, h('label', { class: 'tiny', title: 'Isteni fül' }, this.ear, ' isteni fül'), h('label', { class: 'tiny', title: 'Hang' }, this.speak, ' hang'), this.llmState));"""),
("""      this.btn = h('button', { class: 'primary', onclick: () => this.send() }, 'Küldés');
      box.appendChild(h('div', { class: 'chat-input' }, this.input, this.btn));""",
 """      this.btn = h('button', { class: 'primary', onclick: () => this.send() }, 'Küldés');
      this.mic = h('button', { class: 'mic', title: 'Szólj hozzájuk mikrofonon — isteni hangként. Kattints, beszélj, a mondat végén magától elküldi.', onclick: () => this.toggleMic() }, 'Mikrofon');
      if (!LW.Voice.sttSupported) { this.mic.disabled = true; this.mic.title = 'Ebben a böngészőben nincs beszédfelismerés (Chrome-ban működik).'; }
      box.appendChild(h('div', { class: 'chat-input' }, this.input, this.mic, this.btn));"""),
("""    line(el) { const atEnd""",
 """    toggleMic() {
      if (this.app.observer) { this.ui.toast('Megfigyelő mód', 'Innen csak hallgatni lehet őket.', true); return; }
      if (LW.Voice.listening) { LW.Voice.stopListening(); return; }
      const prev = this.input.placeholder; this.mic.classList.add('on'); this.mic.textContent = 'Hallgatlak…'; this.input.placeholder = 'Beszélj… (a mondat végén elküldöm)';
      const done = () => { this.mic.classList.remove('on'); this.mic.textContent = 'Mikrofon'; this.input.placeholder = prev; };
      LW.Voice.listen((interim) => { this.input.value = interim; }, (finalText) => { done(); this.input.value = finalText; this.send(); }, (err) => { done(); this.ui.toast('Mikrofon', err, true); });
      setTimeout(() => { if (!LW.Voice.listening) done(); }, 12000);
    }
    line(el) { const atEnd"""),
("""      if (live && !this.app.observer) { const learned = LW.Speech.decode(w, u); for (const [word, c] of learned) this.line(h('div', { class: 'line sys' }, `Megtanultad: „${word}” = ${LW.Speech.gloss(c)}`)); }""",
 """      if (live && !this.app.observer) { const learned = LW.Speech.decode(w, u); for (const [word, c] of learned) this.line(h('div', { class: 'line sys' }, `Megtanultad: „${word}” = ${LW.Speech.gloss(c)}`)); }
      if (live && this.speak.checked && !this.app.catchingUp && (this.ui.tab === 'chat' || u.a === this.ui.selected || u.b === this.ui.selected)) LW.Voice.speakUtterance(w, u);"""),
("""      if (res.utt) { const e = D.log(w, { who: a.id, utt: res.utt }); this.renderChat(e); w.events.emit('CreatorAnswered', { tick: w.tick, agentId: a.id, text: `${a.name} a maga nyelvén felelt a hangnak: „${LW.Speech.render(w, res.utt).text}”` }); return; }""",
 """      if (res.utt) { const e = D.log(w, { who: a.id, utt: res.utt }); this.renderChat(e); if (this.speak.checked) LW.Voice.speakReply(w, a, res.utt.w.map((x) => x[1]).join(', ')); w.events.emit('CreatorAnswered', { tick: w.tick, agentId: a.id, text: `${a.name} a maga nyelvén felelt a hangnak: „${LW.Speech.render(w, res.utt).text}”` }); return; }"""),
("""      const e = D.log(w, { who: a.id, text: reply }); this.renderChat(e);
      w.events.emit('CreatorAnswered',""",
 """      const e = D.log(w, { who: a.id, text: reply }); this.renderChat(e); if (this.speak.checked) LW.Voice.speakReply(w, a, reply);
      w.events.emit('CreatorAnswered',"""),
]),
]
