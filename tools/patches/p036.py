PATCHES = [
('src/language/speech.js', [
("""      if (!world.creatorSettings) world.creatorSettings = { divineEar: true };""",
 """      if (!world.creatorSettings) world.creatorSettings = { divineEar: true, obedience: 'full' };
      if (world.creatorSettings.obedience == null) world.creatorSettings.obedience = 'full';"""),
]),
('src/agents/dialogue.js', [
("""      opts = opts || {}; const it = opts.intent || this.parse(world, text); const rng = world.rng;""",
 """      opts = opts || {}; const it = opts.intent || this.parse(world, text); const rng = world.rng;
      const full = world.creatorSettings && world.creatorSettings.obedience === 'full'; if (full) { it.force = true; opts.allowForce = true; } // a Teremtő szava parancs"""),
("""      if (it.nudge && !infant) { a.nudge = { goal: it.nudge, until: world.tick + T.TICKS_PER_DAY, text: excerpt(text) }; nudged = it.nudge; if (it.nudge === 'sleep' || it.nudge === 'eat' || it.nudge === 'drink') a.lastDecisionTick = -1000;""",
 """      if (it.nudge && !infant) { a.nudge = { goal: it.nudge, until: world.tick + T.TICKS_PER_DAY * (full ? 3 : 1), text: excerpt(text), strong: !!full }; nudged = it.nudge; if (full) { a.lastDecisionTick = -1000; if (a.plan && !a.plan.done) a.plan.done = true; } else if (it.nudge === 'sleep' || it.nudge === 'eat' || it.nudge === 'drink') a.lastDecisionTick = -1000;"""),
("""        else if (how === 'forced') S.push(pick(['A testem mozdul, nem én.', 'Nem én akarom. Mégis megyek.']));""",
 """        else if (how === 'forced') S.push(att === 'hostile' ? pick(['A testem mozdul, nem én.', 'Nem én akarom. Mégis megyek.']) : att === 'devout' || att === 'warm' ? pick(['Ahogy kívánod. Megyek.', 'Igen. Máris.', 'Meglesz, ahogy mondtad.']) : pick(['Rendben. Megteszem.', 'Jó, megyek.', 'Ha ezt akarod, teszem.']));"""),
("""        S.push(att === 'hostile' || att === 'wary' ? pick([`Hogy ${g}? Majd meglátom.`, 'Ne mondd meg, mit tegyek.']) : pick([`Hogy ${g}… igen, erre gondolok.`, `Jó ötlet, hogy ${g}. Talán.`, 'Erre már én is gondoltam.']));""",
 """        S.push(world.creatorSettings && world.creatorSettings.obedience === 'full' ? pick([`Rendben, ${g.replace(/n$/, 'k')}.`.replace('gyűjtsök', 'gyűjtök').replace('egyek', 'eszem').replace('igyok', 'iszom').replace('aludjok', 'alszom'), `Ahogy mondod: ${g}.`, 'Meglesz.', 'Máris hozzálátok.']) : att === 'hostile' || att === 'wary' ? pick([`Hogy ${g}? Majd meglátom.`, 'Ne mondd meg, mit tegyek.']) : pick([`Hogy ${g}… igen, erre gondolok.`, `Jó ötlet, hogy ${g}. Talán.`, 'Erre már én is gondoltam.']));"""),
("""      let dTrust = it.tone * 0.18 + (it.kind === 'ask' ? 0.03 : 0) + (it.force ? -0.12 : 0) - (opts && opts.broadcast ? 0.02 : 0);""",
 """      let dTrust = it.tone * 0.18 + (it.kind === 'ask' ? 0.03 : 0) + (it.force ? (it.tone > 0 ? 0 : -0.04) : 0) - (opts && opts.broadcast ? 0.02 : 0);"""),
]),
('src/god/god.js', [
("""      else { A().memory(world, a, { type: 'divine', text: `a testem idegen akaratra mozdult: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.7, divine: true }); a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) - 0.25, -1, 1); }""",
 """      else { const full = world.creatorSettings && world.creatorSettings.obedience === 'full'; A().memory(world, a, { type: 'divine', text: full ? `a hang kérte, és megtettem: ${label.toLowerCase()}` : `a testem idegen akaratra mozdult: ${label.toLowerCase()}`, importance: 0.8, emotion: full ? 'excitement' : 'fear', intensity: 0.6, divine: true }); a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) - (full ? 0.03 : 0.25), -1, 1); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.2); }"""),
]),
('src/agents/brain.js', [
("""        if (a.nudge && a.nudge.goal === id && world.tick < a.nudge.until) { s = s * 1.4 + 0.25; factors = [...factors, 'a hang sugallata']; } // a Teremtő szava: erősebb késztetés, nem parancs""",
 """        if (a.nudge && a.nudge.goal === id && world.tick < a.nudge.until) { if (a.nudge.strong) { s = s * 3 + 1.2; factors = [...factors, 'a Teremtő szava']; } else { s = s * 1.4 + 0.25; factors = [...factors, 'a hang sugallata']; } } // a Teremtő szava: parancs (teljes engedelmesség) vagy sugallat"""),
]),
('src/ui/chat.js', [
("""      this.llmState = h('span', { class: 'tiny', id: 'chat-llm' });
      LW.Voice.init();""",
 """      this.llmState = h('span', { class: 'tiny', id: 'chat-llm' });
      this.obey = h('input', { type: 'checkbox', id: 'chat-obey', title: 'Teljes engedelmesség: amit mondasz, megteszik — ha kell, mindent félretéve. Kikapcsolva a maguk feje szerint döntenek (engedelmeskednek, félreértik, félnek, vagy nem törődnek vele).' });
      this.obey.addEventListener('change', () => { this.world.creatorSettings.obedience = this.obey.checked ? 'full' : 'free'; this.ui.cmdMode = this.obey.checked ? 'force' : 'message'; this.ui.refreshGodBar(); this.app.save(true); this.ui.toast(this.obey.checked ? 'Teljes engedelmesség' : 'Szabad akarat', this.obey.checked ? 'A szavad parancs: megteszik, amit mondasz.' : 'A maguk feje szerint döntenek arról, amit kérsz.', true); });
      LW.Voice.init();"""),
("""      box.appendChild(h('div', { class: 'chat-head' }, this.sel, h('label', { class: 'tiny', title: 'Isteni fül' }, this.ear, ' isteni fül'), h('label', { class: 'tiny', title: 'Hang' }, this.speak, ' hang'), this.llmState));""",
 """      box.appendChild(h('div', { class: 'chat-head' }, this.sel, h('label', { class: 'tiny', title: 'Isteni fül' }, this.ear, ' isteni fül'), h('label', { class: 'tiny', title: 'Hang' }, this.speak, ' hang'), h('label', { class: 'tiny', title: 'Engedelmesség' }, this.obey, ' parancs'), this.llmState));"""),
("""      this.ear.checked = !!(world.creatorSettings && world.creatorSettings.divineEar);""",
 """      this.ear.checked = !!(world.creatorSettings && world.creatorSettings.divineEar);
      this.obey.checked = !!(world.creatorSettings && world.creatorSettings.obedience === 'full'); this.ui.cmdMode = this.obey.checked ? 'force' : 'message';"""),
("""          const res = D.respond(w, a, text, { allowForce: this.ui.cmdMode === 'force' });""",
 """          const res = D.respond(w, a, text, { allowForce: this.ui.cmdMode === 'force' || this.obey.checked });"""),
("""      box.appendChild(h('p', { class: 'tiny chat-hint' }, 'Kérhetsz (menj a folyóhoz, építs, fedezd fel, kövesd X-et), kérdezhetsz (hogy vagy? mit csinálsz? mit jelent az, hogy…?), vagy csak beszélhetsz. Ők a maguk feje szerint döntenek — és a saját nyelvükön beszélnek egymással.'));""",
 """      box.appendChild(h('p', { class: 'tiny chat-hint' }, 'Kérhetsz (menj a folyóhoz, építs, fedezd fel, kövesd X-et, gyűjts, vadássz, kísérletezz), kérdezhetsz (hogy vagy? mit csinálsz? mit jelent az, hogy…?), vagy csak beszélhetsz. „Parancs” bekapcsolva megteszik; kikapcsolva a maguk feje szerint döntenek. Egymással a saját nyelvükön beszélnek.'));"""),
]),
('src/ui/ui.js', [
("""      el.appendChild(h('div', { class: 'kv', style: 'margin-top:6px' }, h('span', null, 'Otthon'), h('span', null, home ? `${LW.Buildings.def(home).label}${home.storage && Object.keys(home.storage).length ? ' · raktár: ' + Object.entries(home.storage).map(([k, q]) => `${q} ${LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k}`).join(', ') : ''}` : 'nincs'), h('span', null, 'Hit'), h('span', null, a.beliefs.creator > 0.7 ? `hisz a Teremtőben (${pct(a.beliefs.creator)})` : a.beliefs.creator > 0.3 ? `tűnődik egy Teremtőn (${pct(a.beliefs.creator)})` : 'nem tud rólad semmit')));""",
 """      el.appendChild(h('div', { class: 'kv', style: 'margin-top:6px' }, h('span', null, 'Otthon'), h('span', null, home ? `${LW.Buildings.def(home).label}${home.storage && Object.keys(home.storage).length ? ' · raktár: ' + Object.entries(home.storage).map(([k, q]) => `${q} ${LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k}`).join(', ') : ''}` : 'nincs'), h('span', null, 'Hit'), h('span', null, a.beliefs.creator > 0.7 ? `hisz a Teremtőben (${pct(a.beliefs.creator)})` : a.beliefs.creator > 0.3 ? `tűnődik egy Teremtőn (${pct(a.beliefs.creator)})` : 'nem tud rólad semmit'), a.wealth ? h('span', null, 'Vagyon') : null, a.wealth ? h('span', null, `${a.wealth > 0 ? '+' : ''}${a.wealth} (a piacon adott/kapott)`) : null));"""),
("""      kv.appendChild(h('span', null, 'Tulajdonos')); kv.appendChild(h('span', null, owner ? owner.name : 'senki'));""",
 """      kv.appendChild(h('span', null, 'Tulajdonos')); kv.appendChild(h('span', null, owner ? owner.name : 'senki'));
      if (b.records) { kv.appendChild(h('span', null, 'Feljegyzések')); kv.appendChild(h('div', { class: 'chips' }, ...(b.records.length ? b.records.map((t) => h('span', { class: 'chip gold', title: LW.Tech.D[t] ? LW.Tech.D[t].desc : '' }, LW.Tech.D[t] ? LW.Tech.D[t].name : t)) : [h('span', { class: 'chip' }, 'még üres')]))); }
      if (b.trades) { kv.appendChild(h('span', null, 'Cserék')); kv.appendChild(h('span', null, String(b.trades))); }
      if (b.worlds) { kv.appendChild(h('span', null, 'Szimulált világok')); kv.appendChild(h('span', null, String(b.worlds))); }
      if (b.w > 1 || b.h > 1) { kv.appendChild(h('span', null, 'Méret')); kv.appendChild(h('span', null, `${b.w}×${b.h} mező`)); }"""),
("""      kv.appendChild(h('span', null, 'Ad')); kv.appendChild(h('span', null, [def.insulation ? `+${def.insulation}° meleg` : null, def.warmth ? `+${def.warmth}° meleg a közelben` : null, def.light ? 'fény' : null, def.safety ? `biztonság ${pct(def.safety)}` : null, def.sleep ? `alvás ${pct(def.sleep)}` : null, def.divine ? 'jel a túlvilágról' : null].filter(Boolean).join(' · ') || '—'));""",
 """      kv.appendChild(h('span', null, 'Ad')); kv.appendChild(h('span', null, [def.insulation ? `+${def.insulation}° meleg` : null, def.warmth ? `+${def.warmth}° meleg a közelben` : null, def.light ? 'fény' : null, def.safety ? `biztonság ${pct(def.safety)}` : null, def.sleep ? `alvás ${pct(def.sleep)}` : null, def.divine ? 'jel a túlvilágról' : null, def.water ? 'víz' : null, def.furnace ? 'tűz az olvasztáshoz' : null, def.workshop ? 'műhely' : null, def.records ? 'írott tudás' : null, def.shrine ? 'hit és nyugalom' : null, def.market ? 'csere' : null, def.school ? 'tanítás' : null, def.discovery ? `felfedezés +${pct(def.discovery)}` : null, def.teach ? `tanítás +${pct(def.teach)}` : null, def.craft ? `készítés +${pct(def.craft)}` : null, def.hospital ? 'gyógyulás' : null, def.power ? 'áram' : null, def.simulation ? 'egy világ a világban' : null].filter(Boolean).join(' · ') || '—'));"""),
]),
]
