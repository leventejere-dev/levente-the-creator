/* LEVENTE — THE CREATOR · agents/dialogue.js
 * A közös beszéd: a Teremtő szabad szöveggel szól egy emberhez vagy mindenkihez. A szöveget
 * a motor értelmezi (kérés, kérdés, sugallat, hangnem), a hatás valódi (emlék, hit, bizalom,
 * isteni kérés — amit az ember a maga feje szerint fogad meg vagy hagy figyelmen kívül), a
 * válasz pedig az ember állapotából épül: magyarul, ha hajlandó a hangnak felelni — a saját
 * nyelvén, ha nem. Nyelvi modell (ha van kulcs) csak megfogalmazza, amit a rendszer eldöntött.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const norm = (s) => String(s || '').toLowerCase().replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/í/g, 'i').replace(/[óöő]/g, 'o').replace(/[úüű]/g, 'u').replace(/[„”"“,.;:!()]/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set(['az', 'a', 'hogy', 'szo', 'szot', 'ez', 'azt', 'mit', 'jelent', 'mond', 'mondtak', 'ok', 'te', 'o']);
  // harmadik személyű leírás → első személy (a beszélő magáról beszél)
  const FIRST = [['a gyermekét gondozza', 'a gyermekemet gondozom'], ['a szülője mellett marad', 'a szüleim mellett maradok'], ['együtt van a párjával', 'a párommal vagyok'], ['ételt gyűjt későbbre', 'ételt gyűjtök későbbre'], ['a tüzet táplálja', 'a tüzet táplálom'], ['a földet műveli', 'a földet művelem'], ['felszed valamit', 'felszedek valamit'], ['készít valamit', 'készítek valamit'], ['a Teremtőnek felel', 'a Teremtőnek felelek'], ['ételt oszt meg', 'ételt osztok meg'], ['összebújva melegszik', 'összebújva melegszem'], ['a szülőjét követi', 'a szüleimet követem'], ['fedél alatt vár', 'fedél alatt várok'], ['a tűznél ül', 'a tűznél ülök'], ['társaságot keres', 'társaságot keresek'], ['meleget keres', 'meleget keresek'], ['ételt keres', 'ételt keresek'], ['segít építeni', 'segítek építeni'], ['otthont épít', 'otthont építek'], ['tüzet gyújt', 'tüzet gyújtok'], ['inni megy', 'inni megyek'], ['úton van', 'úton vagyok'], ['kísérletezik', 'kísérletezem'], ['gondolkodik', 'gondolkodom'], ['beszélget', 'beszélgetek'], ['vadászik', 'vadászom'], ['halászik', 'halászom'], ['verekszik', 'verekszem'], ['menekül', 'menekülök'], ['felfedez', 'felfedezek'], ['flörtöl', 'flörtölök'], ['gyászol', 'gyászolok'], ['gyűjt:', 'gyűjtök:'], ['épít:', 'építek:'], ['készít:', 'készítek:'], ['alszik', 'alszom'], ['tanít', 'tanítok'], ['pihen', 'pihenek'], ['ás', 'ások']];
  const firstPerson = (s) => { for (const [a, b] of FIRST) { if (s.includes(a)) { s = s.split(a).join(b); } } return s; };
  const has = (s, re) => re.test(s);

  const NUDGE = [
    [/\b(gyujts|szedj|hozz|szerezz|gyujtsetek|szedjetek|tartalek|raktaroz)\b/, 'stockpile'], [/\b(egyel|egyetek|egyel valamit)\b/, 'eat'], [/\b(igyal|igyatok)\b/, 'drink'], [/\b(aludj|pihenj|fekudj le|aludjatok)\b/, 'sleep'],
    [/\b(tuzet|tuz|gyujts tuzet|rakj tuzet)\b/, 'makeFire'], [/\b(vadassz|vadasszatok|vadaszni)\b/, 'eat'], [/\b(tanitsd|tanits|tanitsatok)\b/, 'teach'], [/\b(keszits|csinalj|faragj|szerszam|keszitsetek)\b/, 'craft'],
    [/\b(kiserletezz|probalj ki|talalj fel|kiserlet|ujat)\b/, 'experiment'], [/\b(beszelj|beszelgess|beszeljetek|barat|baratkozz)\b/, 'socialize'], [/\b(udvarolj|keress parat|szeresd|szerelem|part)\b/, 'flirt'], [/\b(vess|ultess|muveld|gabona|foldet)\b/, 'farm'],
    [/\b(kunyho|haz|otthon|fedezek|menedek)\b/, 'buildShelter'], [/\b(fedezd fel|fedezzetek|nezz korul|nezz szet|jarj|vandorolj|fedez)\b/, 'explore'], [/\b(ass|asd|asatok|foldben)\b/, 'dig'],
  ];
  const GOAL_HU1 = { stockpile: 'gyűjtök', eat: 'eszem', drink: 'iszom', sleep: 'alszom', makeFire: 'tüzet gyújtok', teach: 'tanítok', craft: 'készítek valamit', experiment: 'kísérletezem', socialize: 'beszélgetek', flirt: 'párt keresek', farm: 'földet művelek', buildShelter: 'otthont építek', explore: 'felfedezek', dig: 'ások' };
  const GOAL_HU = { stockpile: 'gyűjtsön', eat: 'egyen', drink: 'igyon', sleep: 'aludjon', makeFire: 'tüzet gyújtson', teach: 'tanítson', craft: 'készítsen valamit', experiment: 'kísérletezzen', socialize: 'beszélgessen', flirt: 'párt keressen', farm: 'földet műveljen', buildShelter: 'otthont építsen', explore: 'felfedezzen', dig: 'ásson' };

  const Dialogue = {
    /** Mit akar a hang? (kérés / kérdés / sugallat / beszéd) + hangnem */
    parse(world, text) {
      const s = norm(text); const it = { kind: 'tell', ask: null, cmd: null, nudge: null, tone: 0, word: null, raw: text, place: null, personId: null, force: false };
      const pos = (s.match(/\b(koszon|szeret|buszke|ugyes|szep|jo |jol |orul|aldas|segit|ne felj|biztonsag|nyugodj|batran|szeretlek|draga|kedves|remek|csodas|vigyazok)\b/g) || []).length;
      const neg = (s.match(/\b(hulye|ostoba|utal|pusztulj|meghalsz|buntet|atkoz|rossz vagy|gyulol|fenyeget|megollek|halj meg|takarodj|szemet|nyomorult|felj|rettegj|ver|elpusztit)\b/g) || []).length;
      it.tone = clamp(pos * 0.35 - neg * 0.5, -1, 1);
      if (has(s, /\b(muszaj|kenyszer|parancsolom|azonnal|kotelezo)\b/)) it.force = true;
      // személy a szövegben
      for (const a of world.agents.values()) { const n = norm(a.name); if (n.length >= 3 && s.includes(n)) { it.personId = a.id; break; } }
      // isteni parancsok
      if (has(s, /\b(kovesd|menj vele|maradj vele|tarts vele|kiserd)\b/) && it.personId != null) it.cmd = 'follow';
      else if (has(s, /\b(vedd meg|vedd|vigyazz ra|orizd|vedelmezd)\b/) && it.personId != null) it.cmd = 'protect';
      else if (has(s, /\b(hagyd el|menj el innen|tavozz|koltozz el|hagyd itt|hagyjatok el)\b/)) it.cmd = 'leave';
      else if (has(s, /\b(epits|epitsetek|epitsen|epitsd)\b/)) it.cmd = 'build';
      else if (has(s, /\b(ass|asd|asatok|keress a foldben|ass a foldben|kutass)\b/)) it.cmd = 'search';
      else if (has(s, /\b(fedezd fel|fedezzetek fel|nezz korul|nezz szet|jarj korbe|vandorolj|fedezz fel)\b/)) it.cmd = 'explore';
      else if (has(s, /\b(menj|gyere|indulj|eredj|vonulj|setalj|fuss|szaladj|menjetek|gyertek|induljatok)\b/)) it.cmd = 'go';
      if (it.cmd === 'go' || it.cmd === 'explore' || it.cmd === 'search') it.place = this.placeWords(s);
      if (it.cmd === 'go' && !it.place && it.personId == null) it.cmd = 'explore';
      if (it.cmd === 'go' && !it.place && it.personId != null) it.cmd = 'follow';
      // sugallat (nem parancs, csak erősebb késztetés egy napig)
      if (!it.cmd) for (const [re, g] of NUDGE) if (has(s, re)) { it.nudge = g; break; }
      // kérdések
      const Q = [['meaning', /\b(mit jelent|mi az hogy|mit mond|mi az a)\b\s*(?:az\s+|a\s+)?["'„]?([a-z\-]{2,})/], ['how', /\b(hogy vagy|hogy erzed|jol vagy|mi ujsag|mi van veled|mizu|mi a helyzet|hogy vagytok|hogy telik)\b/], ['doing', /\b(mit csinalsz|mit muvelsz|mivel foglalkozol|mit tervezel|mire keszulsz|mit fogsz|mit csinaltok)\b/], ['where', /\b(hol vagy|merre vagy|hol laksz|hova mesz|hol vagytok)\b/], ['who', /\b(ki vagy|mi a neved|hogy hivnak|mutatkozz be|meselj magadrol)\b/], ['age', /\b(hany eves|mikor szulettel|milyen idos)\b/], ['family', /\b(csalad|szuleid|anyad|apad|gyereked|gyerekeid|testvered|parod|feleseged|ferjed|kit szeretsz|szerelmes|gyerekek)\b/], ['know', /\b(mit tudsz|mihez ertesz|mit tanultal|mit fedeztel|tudasod|mire jottel ra|mit ismersz)\b/], ['fear', /\b(felsz|mitol felsz|felelem|mi bant|mi a baj|szomoru|mi fajj|mi faj)\b/], ['me', /\b(ki vagyok|tudod ki vagyok|hallasz|hiszel bennem|mit gondolsz rolam|ki beszel|ismersz engem|teremto vagyok|en vagyok|ki szol)\b/], ['want', /\b(mit szeretnel|mire vagysz|mit kivansz|mit kersz|mit akarsz|mi kell|miben segitsek|segithetek|mit adjak)\b/], ['language', /\b(nyelv|hogy mondjak|hogy mondod|hogy hivjatok|milyen szavak|tanits meg|szavaitok)\b/], ['weather', /\b(milyen az ido|hideg van|esik|meleg van|milyen a videk)\b/], ['world', /\b(mi tortent|mi ujsag a faluban|mi ujsag nalatok|mi volt ma|mesélj|meselj)\b/]];
      for (const [k, re] of Q) { const m = re.exec(s); if (m) { it.kind = 'ask'; it.ask = k; if (k === 'meaning') { const toks = s.split(' ').reverse(); it.word = toks.find((t) => t.length >= 2 && !STOP.has(t) && !/^(mit|jelent|mi|hogy|az|a)$/.test(t)) || m[2]; } break; } }
      if (it.kind !== 'ask' && (it.cmd || it.nudge)) it.kind = 'command';
      if (it.kind === 'tell' && has(s, /\b(szia|hello|helo|udv|szervusz|jo napot|jo reggelt|jo estet|hahó|haho|hé|he)\b/)) it.kind = 'greet';
      if (it.kind === 'tell' && /\?\s*$/.test(String(text))) { it.kind = 'ask'; it.ask = 'unknown'; }
      return it;
    },
    placeWords(s) {
      if (has(s, /\b(tenger|tengerhez|tengerpart|ocean|a partra)\b/)) return 'sea';
      if (has(s, /\b(folyo|viz|to |tohoz|part|patak|vizhez|folyohoz|itat)\b/)) return 'water';
      if (has(s, /\b(erdo|erdobe|fak|fakhoz|liget)\b/)) return 'forest';
      if (has(s, /\b(hegy|domb|hegyre|dombra|csucs|szikla|hegyekbe)\b/)) return 'hill';
      if (has(s, /\b(haza|otthon|otthonodba|kunyhodba|hazadba)\b/)) return 'home';
      if (has(s, /\b(tabor|falu|telepules|tanya|a tobbiekhez|emberekhez|hozzajuk)\b/)) return 'settlement';
      if (has(s, /\b(eszak|eszakra)\b/)) return 'N'; if (has(s, /\b(del|delre)\b/)) return 'S'; if (has(s, /\b(kelet|keletre)\b/)) return 'E'; if (has(s, /\b(nyugat|nyugatra)\b/)) return 'W';
      if (has(s, /\b(messze|tavol|tavolra|a vilag vegere|tul a)\b/)) return 'far';
      return null;
    },
    resolvePlace(world, a, place) {
      const W = world, t = W.tiles; const ax = a.x | 0, ay = a.y | 0; let best = -1, bd = 1e9;
      const scan = (r, ok) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = ax + dx, y = ay + dy; if (!W.inBounds(x, y)) continue; const i = W.idx(x, y); if (!ok(i)) continue; const d = dx * dx + dy * dy; if (d < bd && d > 1) { bd = d; best = i; } } return best; };
      switch (place) {
        case 'water': { let near = -1, nd = 1e9; for (const p of a.knowledge.places.values()) if (p.k === 'water') { const d = LW.dist(ax, ay, W.xOf(p.i), W.yOf(p.i)); if (d < nd) { nd = d; near = p.i; } } if (near < 0) { scan(25, (i) => LW.isFreshBiome(t.biome[i])); near = best; } if (near < 0) return null; const sh = LW.Agents.tileNear(W, a, near); return sh != null && sh >= 0 ? sh : W.randomNear(W.xOf(near), W.yOf(near), 1); }
        case 'sea': { scan(60, (i) => t.biome[i] === LW.BIOME.OCEAN); if (best < 0) return null; const sh = LW.Agents.tileNear(W, a, best); return sh != null && sh >= 0 ? sh : W.randomNear(W.xOf(best), W.yOf(best), 2); }
        case 'forest': return scan(30, (i) => t.trees[i] > 80 && W.isPassable(i));
        case 'hill': return scan(40, (i) => (t.biome[i] === LW.BIOME.HILLS || t.biome[i] === LW.BIOME.MOUNTAIN) && W.isPassable(i));
        case 'home': { const h = a.home != null ? W.buildings.get(a.home) : null; return h ? W.idx(h.x, h.y) : null; }
        case 'settlement': { let s = null, sd = 1e9; for (const st of W.settlements.values()) { if (st.abandonedTick) continue; const d = LW.dist(ax, ay, st.x, st.y); if (d < sd) { sd = d; s = st; } } if (s) return W.randomNear(s.x | 0, s.y | 0, 2); let o = null, od = 1e9; for (const b of W.agents.values()) { if (b.id === a.id) continue; const d = LW.dist(ax, ay, b.x, b.y); if (d < od) { od = d; o = b; } } return o ? W.randomNear(o.x | 0, o.y | 0, 1) : null; }
        case 'N': case 'S': case 'E': case 'W': case 'far': { const dx = place === 'E' ? 1 : place === 'W' ? -1 : 0, dy = place === 'S' ? 1 : place === 'N' ? -1 : 0; const dist = place === 'far' ? 30 : 16; const ang = place === 'far' ? W.rng.range(0, Math.PI * 2) : Math.atan2(dy, dx); for (let d = dist; d > 4; d -= 3) { const x = clamp(Math.round(ax + Math.cos(ang) * d), 1, W.w - 2), y = clamp(Math.round(ay + Math.sin(ang) * d), 1, W.h - 2); if (W.isPassable(W.idx(x, y))) return W.idx(x, y); } return null; }
      }
      return null;
    },
    // ---------------- hatás
    attitude(a) { const b = a.beliefs.creator, tr = a.beliefs.trust || 0; if (b < 0.25) return 'confused'; if (tr < -0.35) return 'hostile'; if (tr < -0.08) return 'wary'; if (b > 0.7 && tr > 0.3) return 'devout'; if (tr > 0.15) return 'warm'; return 'neutral'; },
    /** Az ember meghallja a hangot: hit, bizalom, érzelem, emlék. */
    hear(world, a, text, it, opts) {
      const first = !a.memory.episodic.some((m) => m.divine); const P = a.personality;
      if (first) { a.emotions.fear = clamp(a.emotions.fear + 0.35 * (1 - P.bravery), 0, 1); a.emotions.excitement = clamp(a.emotions.excitement + 0.4 * P.curiosity, 0, 1); a.beliefs.creator = clamp(a.beliefs.creator + 0.3, 0, 1); }
      else a.beliefs.creator = clamp(a.beliefs.creator + 0.08, 0, 1);
      let dTrust = it.tone * 0.18 + (it.kind === 'ask' ? 0.03 : 0) + (it.force ? (it.tone > 0 ? 0 : -0.04) : 0) - (opts && opts.broadcast ? 0.02 : 0);
      if (it.tone > 0) dTrust *= 0.6 + P.optimism * 0.6; if (it.tone < 0) dTrust *= 0.6 + (1 - P.patience) * 0.6;
      a.beliefs.trust = clamp((a.beliefs.trust || 0) + dTrust, -1, 1);
      if (it.tone < -0.3) { a.emotions.fear = clamp(a.emotions.fear + 0.3, 0, 1); a.emotions.anger = clamp(a.emotions.anger + 0.2 * P.dominance, 0, 1); }
      if (it.tone > 0.3) { a.emotions.joy = clamp(a.emotions.joy + 0.15, 0, 1); a.emotions.fear = Math.max(0, a.emotions.fear - 0.15); a.emotions.stress *= 0.8; }
      if (!it.cmd) LW.Memory.add(world, a, { type: 'divine', text: `${opts && opts.broadcast ? 'az égből' : 'a semmiből'} egy száj nélküli hang szólt: „${excerpt(text)}”`, importance: first ? 0.95 : 0.6, emotion: it.tone < 0 ? 'fear' : 'excitement', intensity: first ? 0.8 : 0.45, divine: true });
      a.importance += first ? 0.6 : 0.15; if (!a.achievements.includes('Beszélt a hanggal')) a.achievements.push('Beszélt a hanggal');
      a.chatHistory = (a.chatHistory || []).slice(-9); a.chatHistory.push({ who: 'creator', text: String(text).slice(0, 240), t: world.tick });
      a.lastCreatorTalk = world.tick;
    },
    /** A hang egy emberhez szól. Visszaad: { reply, utt, how, it, att } — az egyik reply/utt üres. */
    respond(world, a, text, opts) {
      opts = opts || {}; const it = opts.intent || this.parse(world, text); const rng = world.rng;
      const full = world.creatorSettings && world.creatorSettings.obedience === 'full'; if (full) { it.force = true; opts.allowForce = true; } // a Teremtő szava parancs
      if (!a.vocab) a.vocab = {}; if (a.beliefs.trust == null) a.beliefs.trust = 0;
      const stage = LW.Agents.stage(world, a); const infant = stage === 'infant';
      const asleep = a.sleeping;
      if (!opts.heard) this.hear(world, a, text, it, opts);
      let how = null, nudged = null;
      if (it.cmd && !infant) {
        let tile = null, targetId = null;
        if (it.cmd === 'go' || it.cmd === 'explore' || it.cmd === 'search') tile = it.place ? this.resolvePlace(world, a, it.place) : null;
        if (it.cmd === 'follow' || it.cmd === 'protect') { targetId = it.personId != null && it.personId !== a.id ? it.personId : null; if (targetId == null) { it.cmd = null; } }
        if (it.cmd) { if (it.cmd === 'go' && tile == null) it.cmd = 'explore'; const forced = !!(it.force && opts.allowForce); LW.God.command(world, a, it.cmd, { tile, targetId, force: forced }); how = forced ? 'forced' : LW.God.interpret(world, a); }
      }
      if (it.nudge && !infant) { a.nudge = { goal: it.nudge, until: world.tick + T.TICKS_PER_DAY * (full ? 3 : 1), text: excerpt(text), strong: !!full }; nudged = it.nudge; if (full) { a.lastDecisionTick = -1000; if (a.plan && !a.plan.done) a.plan.done = true; } else if (it.nudge === 'sleep' || it.nudge === 'eat' || it.nudge === 'drink') a.lastDecisionTick = -1000; LW.Memory.add(world, a, { type: 'divine', text: `a hang azt akarta, hogy ${GOAL_HU[it.nudge] || it.nudge}`, importance: 0.5, emotion: 'excitement', intensity: 0.4, divine: true }); }
      const att = this.attitude(a);
      const res = { it, att, how, nudged, reply: '', utt: null, asleep };
      if (asleep && rng.chance(0.6)) { res.reply = ''; res.asleep = true; return res; } // alszik: hallja ugyan, de csak álmában
      if (infant) { res.utt = LW.Speech.say(world, a, null, []); res.reply = ''; res.babble = true; return res; }
      // aki neheztel, nem felel a hang nyelvén
      if (att === 'hostile' && Object.keys(a.vocab).length >= 5 && rng.chance(0.75)) { res.utt = LW.Speech.say(world, a, null, rng.shuffle(['no', 'you', 'go', 'bad', 'secret', 'we']).slice(0, 3).filter((c) => a.vocab[c] || rng.chance(0.5))); if (!res.utt.w.length) res.reply = this.compose(world, a, it, att, how, nudged); return res; }
      res.reply = this.compose(world, a, it, att, how, nudged);
      (a.chatHistory = a.chatHistory || []).push({ who: a.id, text: res.reply.slice(0, 240), t: world.tick });
      return res;
    },
    /** Magyar válasz az állapotból. */
    compose(world, a, it, att, how, nudged) {
      const rng = world.rng; const P = a.personality, N = a.needs, E = a.emotions; const S = []; const pick = (arr) => rng.pick(arr);
      const name = (id) => { const o = world.agents.get(id) || world.deceased.get(id); return o ? o.name : 'valaki'; };
      const first = a.chatHistory.filter((h) => h.who === 'creator').length <= 1;
      // megszólítás
      if (att === 'confused') S.push(pick(['Ki beszél? Nincs itt senki.', 'Hang… a fejemben? Ki vagy?', 'Ezt csak én hallom?', 'Valaki szólt. Nem látom, honnan.']));
      else if (att === 'hostile') S.push(pick(['Megint te.', 'Hagyj békén.', 'Nem kértem, hogy szólj.', 'Mit akarsz már megint?']));
      else if (att === 'wary') S.push(pick(['Hallak.', 'Itt vagy megint.', 'Beszélj, de ne kérj sokat.']));
      else if (att === 'devout') S.push(pick(['Hallak, Teremtő.', 'Itt vagyok, Teremtő.', 'Szólj, hallgatlak.']));
      else if (att === 'warm') S.push(pick(['Hallak, hang.', 'Örülök, hogy szólsz.', 'Igen?']));
      else if (first) S.push(pick(['Hallak. Furcsa ez.', 'Egy hang, aminek nincs szája.']));
      // parancs kimenetele
      if (it.cmd) {
        const L = LW.God.COMMANDS[it.cmd] || it.cmd;
        if (how === 'obey') S.push(pick(['Megteszem.', 'Rendben, indulok.', `Jó. ${L.toLowerCase()} — értem.`, 'Ha ezt kéred, megyek.']));
        else if (how === 'misinterpret') S.push(pick(['Azt hiszem, értem, mit akarsz.', 'Valami ilyesmit kérsz… megpróbálom.']));
        else if (how === 'fear') S.push(pick(['Félek tőled. Elbújok.', 'Ne! Hagyj!', 'Miért pont én?']));
        else if (how === 'ignore') S.push(pick([`Nem. Most más a dolgom: ${this.doing(world, a)}.`, 'Nem teszem meg. Nem parancsolsz nekem.', 'Majd ha én is úgy akarom.']));
        else if (how === 'forced') S.push(att === 'hostile' ? pick(['A testem mozdul, nem én.', 'Nem én akarom. Mégis megyek.']) : att === 'devout' || att === 'warm' ? pick(['Ahogy kívánod. Megyek.', 'Igen. Máris.', 'Meglesz, ahogy mondtad.']) : pick(['Rendben. Megteszem.', 'Jó, megyek.', 'Ha ezt akarod, teszem.']));
        else S.push(pick(['Ezt nem tudom megtenni.', 'Nem tudom, hogyan.']));
      } else if (nudged) {
        const g = GOAL_HU[nudged] || nudged;
        S.push(world.creatorSettings && world.creatorSettings.obedience === 'full' ? pick([`Rendben, ${GOAL_HU1[nudged] || g}.`, `Ahogy mondod: ${GOAL_HU1[nudged] || g}.`, 'Meglesz.', 'Máris hozzálátok.']) : att === 'hostile' || att === 'wary' ? pick([`Hogy ${g}? Majd meglátom.`, 'Ne mondd meg, mit tegyek.']) : pick([`Hogy ${g}… igen, erre gondolok.`, `Jó ötlet, hogy ${g}. Talán.`, 'Erre már én is gondoltam.']));
      }
      // kérdés
      if (it.kind === 'ask') S.push(...this.answer(world, a, it, att));
      else if (it.kind === 'greet') S.push(pick(['Szia… ha így kell mondani.', 'Üdv. Nem tudom, hogyan illik köszönni egy hangnak.', 'Üdv neked is.']));
      else if (it.kind === 'tell' && !it.cmd && !nudged) {
        if (it.tone > 0.3) S.push(pick(['Jólesik, amit mondasz.', 'Köszönöm. Ritkán mond ilyet valaki.', 'Ettől könnyebb a nap.']));
        else if (it.tone < -0.3) S.push(pick(['Miért beszélsz így velem?', 'Ez fáj. Mit vétettem?', 'Ne fenyegess.']));
        else S.push(pick(['Nem értem egészen, mit akarsz ezzel.', 'Értem. Azt hiszem.', 'Gondolkodom rajta.', `Aha. ${this.state(world, a)}`]));
      }
      // egy sor a mostani helyzetről (a beszédesek beszédesebbek)
      if (S.length < 3 && (it.kind === 'greet' || it.kind === 'tell') && rng.chance(0.3 + P.sociability * 0.6)) S.push(this.state(world, a));
      if (P.humor > 0.75 && rng.chance(0.2)) S.push(pick(['Ha már mindent hallasz, hozhatnál egy kis esőt is. Vagy inkább ne.', 'Legalább te nem horkolsz éjjel.', 'Ha isten vagy, miért nem tudsz tüzet rakni helyettem?']));
      let out = S.filter(Boolean).join(' ').trim();
      if (!out) out = this.state(world, a);
      if (P.sociability < 0.3 && out.length > 120) out = out.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      return out;
    },
    /** Egy mondat arról, hogy van most. */
    state(world, a) {
      const N = a.needs, E = a.emotions; const rng = world.rng; const pick = (arr) => rng.pick(arr);
      if (N.food < 0.25) return pick(['Éhes vagyok, régen ettem rendesen.', 'Korog a gyomrom. Ételt kell találnom.']);
      if (N.water < 0.25) return pick(['Kiszáradt a torkom.', 'Vizet kell találnom, gyorsan.']);
      if (N.warmth < 0.35) return pick(['Fázom. A hideg a csontomig hatol.', 'Meleg kell. Tűz vagy fedél.']);
      if (E.grief > 0.5) return pick(['Elment valaki, aki fontos volt. Még mindig keresem.', 'Nehéz a szívem. Gyászolok.']);
      if (E.fear > 0.5) return pick(['Félek. Valami nincs rendben a levegőben.', 'Nem érzem magam biztonságban.']);
      if (E.love > 0.6 && a.partner != null) return `${(world.agents.get(a.partner) || {}).name || 'A párom'} mellett ma minden könnyebb.`;
      if (E.pride > 0.5) return 'Csináltam valamit, ami jó, és az enyém.';
      if (E.joy > 0.5) return pick(['Jól vagyok. Ma jó nap.', 'Nincs bajom. Süt a nap, van mit enni.']);
      return `Épp ${this.doing(world, a)}.`;
    },
    doing(world, a) { return firstPerson(LW.Actions.describe(world, a)); },
    answer(world, a, it, att) {
      const rng = world.rng; const pick = (arr) => rng.pick(arr); const W = world; const A = LW.Agents; const N = a.needs, E = a.emotions; const S = [];
      const name = (id) => { const o = W.agents.get(id) || W.deceased.get(id); return o ? o.name : 'valaki'; };
      const refuse = att === 'hostile' && rng.chance(0.6);
      switch (it.ask) {
        case 'how': { if (refuse) { S.push('Mit érdekel az téged.'); break; } S.push(this.state(W, a)); const hi = Object.entries(E).filter(([, v]) => v > 0.35).sort((x, y) => y[1] - x[1])[0]; if (hi && rng.chance(0.6)) S.push(`Leginkább ${LW.HU.emotion(hi[0])} van bennem.`); break; }
        case 'doing': { S.push(`Épp ${this.doing(W, a)}.`); const why = a.why; if (why && why.chosen && why.chosen.factors.length && rng.chance(0.7)) S.push(`Azért, mert ${why.chosen.factors[0]}.`); break; }
        case 'where': { const s = LW.Settlements.at(W, a.x, a.y); const home = a.home != null ? W.buildings.get(a.home) : null; const B = LW.BIOME_NAME[W.tiles.biome[W.idx(a.x | 0, a.y | 0)]]; S.push(s ? `${s.name} ${LW.HU.tier(s.tier)}ánál, ${B.toLowerCase()} vidéken.` : `Egy ${B.toLowerCase()} vidéken, nincs neve ennek a helynek.`); S.push(home ? `Van otthonom: egy ${LW.Buildings.def(home).label.toLowerCase()}.` : 'Otthonom nincs, ott alszom, ahol az este ér.'); break; }
        case 'who': { const par = a.parents.filter((p) => p != null).map(name); S.push(`${a.name} vagyok${par.length ? `, ${par.join(' és ')} gyermeke` : a.genesis ? ', az Elsők egyike' : ''}. ${Math.floor(A.age(W, a))} éves ${a.sex === 'f' ? 'nő' : 'férfi'}.`); if (a.occupation) S.push(`Leginkább ${LW.HU.occupation(a.occupation)} vagyok.`); break; }
        case 'age': S.push(`${Math.floor(A.age(W, a))} telet láttam.`); break;
        case 'family': { if (refuse) { S.push('A családom nem a te dolgod.'); break; } const p = a.partner != null ? name(a.partner) : null; const kids = a.children.map(name); const par = a.parents.filter((x) => x != null).map(name); S.push(p ? `A párom ${p}.` : A.isAdult(W, a) ? 'Nincs párom.' : 'Még gyerek vagyok.'); if (kids.length) S.push(`Gyerekeim: ${kids.join(', ')}.`); if (par.length) S.push(`Szüleim: ${par.join(' és ')}.`); const best = [...a.relationships.entries()].filter(([id, r]) => W.agents.has(id) && r.friendship > 0.4).sort((x, y) => y[1].friendship - x[1].friendship)[0]; if (best) S.push(`A legjobb barátom ${name(best[0])}.`); const foe = [...a.relationships.entries()].filter(([id, r]) => W.agents.has(id) && r.resentment > 0.5)[0]; if (foe) S.push(`${name(foe[0])} — vele nem vagyunk jóban.`); break; }
        case 'know': { const techs = [...a.knowledge.techs].map((t) => LW.Tech.D[t]).filter((d) => d && !d.hidden).map((d) => d.name.toLowerCase()); S.push(techs.length ? `Ezekhez értek: ${techs.slice(0, 6).join(', ')}.` : 'Nem tudok még semmit, csak amit a kezem és a gyomrom tanított.'); const sk = Object.entries(a.skills).sort((x, y) => y[1] - x[1])[0]; if (sk && sk[1] > 0.3) S.push(`A legjobban ${LW.HU.skill(sk[0])}ben vagyok jó.`); break; }
        case 'fear': { const hi = Object.entries(E).sort((x, y) => y[1] - x[1])[0]; if (E.fear > 0.4) S.push(pick(['Félek. A sötéttől, a vadaktól, attól, hogy nem lesz mit enni.', 'Félek, hogy nem érem meg a következő nyarat.'])); else if (hi && hi[1] > 0.3) S.push(`Most leginkább ${LW.HU.emotion(hi[0])} van bennem.`); else S.push('Nem félek. Most nem.'); const m = a.memory.emotional[a.memory.emotional.length - 1]; if (m && rng.chance(0.6)) S.push(`Ami nem hagy nyugodni: ${m.text}.`); break; }
        case 'me': { if (a.beliefs.creator < 0.25) S.push(pick(['Nem tudom, ki vagy. Egy hang, aminek nincs szája.', 'Nem ismerlek. Talán a fejemben laksz.'])); else if (a.beliefs.creator < 0.7) S.push(pick(['Azt mondják, van valaki az égen túl, aki figyel. Te lennél az?', 'Egy hang az égből. Nem tudom, mit akarsz tőlünk.'])); else S.push(pick(['Te vagy az, aki figyel minket. A Teremtő.', 'Hiszek benned. Láttam, amit tettél.'])); const tr = a.beliefs.trust; S.push(tr > 0.3 ? 'Bízom benned.' : tr < -0.3 ? 'Nem bízom benned. Amit tettél, nem felejtem.' : 'Még nem tudom, jót akarsz-e.'); break; }
        case 'want': { if (N.food < 0.4) S.push('Ételt. Ha tudsz adni, adj.'); else if (N.water < 0.4) S.push('Vizet.'); else if (N.warmth < 0.4) S.push('Meleget. Tüzet vagy fedelet.'); else if (a.home == null && A.isAdult(W, a)) S.push('Egy otthont. Falakat a hideg ellen.'); else if (a.partner == null && A.isAdult(W, a) && N.affection < 0.5) S.push('Valakit, aki mellettem alszik.'); else S.push(pick(['Semmit. Megvan, ami kell.', 'Hogy a gyerekek megérjék a nyarat.', 'Hogy hagyj minket élni.'])); break; }
        case 'meaning': { const w = it.word; let hit = null; for (const c in a.vocab) if (a.vocab[c].w === w) { hit = c; break; } if (!hit) { for (const l of W.langs.values()) for (const c in l.words) if (l.words[c] === w) hit = c; } if (!hit) S.push(pick([`„${w}”? Ezt a szót nem ismerem.`, 'Ilyet nem mondunk.'])); else if ((a.vocab[hit] && a.vocab[hit].s && (a.beliefs.trust || 0) < 0.35) || refuse) S.push(pick(['Azt nem mondom meg. Az a miénk.', 'Nem neked való szó.'])); else { S.push(`„${w}” azt jelenti: ${LW.Speech.gloss(hit)}.`); LW.Speech.reveal(W, a.langId, w, hit, a.vocab[hit] && a.vocab[hit].s); } break; }
        case 'language': { const ks = Object.keys(a.vocab); if (!ks.length) S.push('Nincsenek még szavaink. Mutogatunk.'); else if (refuse || (a.beliefs.trust || 0) < -0.2) S.push('A szavaink a mieink. Nem tanítom meg neked.'); else { const sel = rng.shuffle(ks.slice()).filter((c) => !a.vocab[c].s).slice(0, 3); S.push(`Így mondjuk: ${sel.map((c) => `„${a.vocab[c].w}” — ${LW.Speech.gloss(c)}`).join(', ')}.`); for (const c of sel) LW.Speech.reveal(W, a.langId, a.vocab[c].w, c, 0); const l = W.langs.get(a.langId); if (l && l.name) S.push(`A nyelvünk a ${l.name.toLowerCase()}.`); } break; }
        case 'weather': { const temp = W.tileTemp(W.idx(a.x | 0, a.y | 0)); S.push(`${W.weather.describe(temp)}, ${temp.toFixed(0)} fok. ${temp < 5 ? 'Hideg.' : temp > 25 ? 'Meleg.' : 'Elviselhető.'}`); break; }
        case 'world': { const ch = W.history.chronicle.slice(-3).map((e) => e.text); S.push(ch.length ? `Ami történt: ${ch.join(' ')}` : 'Nem történt semmi, amiről beszélni érdemes.'); break; }
        default: S.push(pick(['Nem értem a kérdést.', 'Erre nem tudok mit mondani.', `Nem tudom. ${this.state(W, a)}`]));
      }
      return S;
    },
    /** A hang mindenkihez szól: mindenki hallja, aki ébren van; néhányan felelnek. */
    broadcast(world, text, opts) {
      opts = opts || {}; const it = this.parse(world, text); const rng = world.rng; const hearers = [], replies = [];
      for (const a of world.agents.values()) { if (a.sleeping && rng.chance(0.7)) continue; if (LW.Agents.stage(world, a) === 'infant') continue; hearers.push(a); }
      const max = opts.maxReplies || 3;
      const order = hearers.slice().sort((x, y) => (y.beliefs.creator + y.personality.sociability * 0.5 + (y.id === opts.preferId ? 2 : 0)) - (x.beliefs.creator + x.personality.sociability * 0.5 + (x.id === opts.preferId ? 2 : 0)));
      for (const a of hearers) { const res = this.respond(world, a, text, { intent: { ...it }, broadcast: true }); if (order.indexOf(a) < max && (res.reply || res.utt)) replies.push({ a, res }); }
      world.events.emit('CreatorSpoke', { tick: world.tick, text: `A hang mindenkihez szólt: „${excerpt(text)}”`, hearers: hearers.length });
      return { it, hearers: hearers.length, replies };
    },
    // ---------------- nyelvi modellnek: tények és kérés
    facts(world, a) {
      const W = world; const A = LW.Agents; const N = a.needs, E = a.emotions; const name = (id) => { const o = W.agents.get(id) || W.deceased.get(id); return o ? o.name : 'valaki'; };
      const s = LW.Settlements.at(W, a.x, a.y); const home = a.home != null ? W.buildings.get(a.home) : null; const l = W.langs.get(a.langId);
      const lines = [];
      lines.push(`Név: ${a.name} (${a.sex === 'f' ? 'nő' : 'férfi'}, ${Math.floor(A.age(W, a))} éves, ${LW.HU.occupation(a.occupation || A.stage(W, a))}${a.genesis ? ', az Elsők egyike' : ''})`);
      lines.push(`Világ: ${W.name}, ${W.year}. év, ${LW.Time.seasonName(W.tick)}, ${LW.Time.isNight(W.tick) ? 'éjszaka' : 'nappal'}; idő: ${W.weather.describe(W.tileTemp(W.idx(a.x | 0, a.y | 0)))}, ${W.tileTemp(W.idx(a.x | 0, a.y | 0)).toFixed(0)} °C`);
      lines.push(`Hely: ${s ? s.name + ' (' + LW.HU.tier(s.tier) + ')' : 'névtelen vidék'}; otthon: ${home ? LW.Buildings.def(home).label.toLowerCase() : 'nincs'}`);
      lines.push(`Éppen: ${this.doing(W, a)}${a.why && a.why.chosen ? ' — mert ' + a.why.chosen.factors.slice(0, 2).join(', ') : ''}`);
      lines.push(`Szükségletek (0–100): ${Object.entries(N).map(([k, v]) => `${LW.HU.need(k).toLowerCase()} ${Math.round(v * 100)}`).join(', ')}; egészség ${Math.round(a.health * 100)}`);
      const em = Object.entries(E).filter(([, v]) => v > 0.15).sort((x, y) => y[1] - x[1]).slice(0, 4); lines.push(`Érzések: ${em.length ? em.map(([k, v]) => `${LW.HU.emotion(k)} ${Math.round(v * 100)}`).join(', ') : 'nyugodt'}`);
      const tr = Object.entries(a.personality).sort((x, y) => Math.abs(y[1] - 0.5) - Math.abs(x[1] - 0.5)).slice(0, 5); lines.push(`Jellem: ${tr.map(([k, v]) => `${v < 0.5 ? 'kevés ' : ''}${LW.HU.trait(k)} (${Math.round(v * 100)})`).join(', ')}`);
      lines.push(`Család: pár: ${a.partner != null ? name(a.partner) : 'nincs'}; szülők: ${a.parents.filter((p) => p != null).map(name).join(', ') || (a.genesis ? 'nincs, teremtetett' : 'ismeretlen')}; gyerekek: ${a.children.map(name).join(', ') || 'nincs'}`);
      const rels = [...a.relationships.entries()].filter(([id]) => W.agents.has(id)).map(([id, r]) => ({ id, r, label: LW.Relationships.label(r) })).filter((x) => x.label !== 'idegen').sort((x, y) => (y.r.friendship + y.r.romance - y.r.resentment) - (x.r.friendship + x.r.romance - x.r.resentment)).slice(0, 5); if (rels.length) lines.push(`Kapcsolatok: ${rels.map((x) => `${name(x.id)} (${x.label})`).join(', ')}`);
      const techs = [...a.knowledge.techs].map((t) => LW.Tech.D[t]).filter((d) => d && !d.hidden).map((d) => d.name.toLowerCase()); lines.push(`Tudás: ${techs.length ? techs.join(', ') : 'semmi, csak ösztön'}; holmi: ${Object.entries(a.inv).filter(([, q]) => q > 0).map(([k, q]) => `${LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k} ×${q}`).join(', ') || 'semmi'}`);
      lines.push(`Hit a Teremtőben: ${Math.round(a.beliefs.creator * 100)}/100; bizalom a hang iránt: ${Math.round((a.beliefs.trust || 0) * 100)} (−100…100)`);
      const ks = Object.keys(a.vocab || {}); lines.push(`Nyelv: ${l ? LW.Speech.describeLang(W, l) : 'nincs'}; ${ks.length} szót tud${ks.length ? ', pl. ' + ks.slice(0, 5).map((c) => `„${a.vocab[c].w}”=${LW.Speech.gloss(c)}`).join(', ') : ' (mutogat)'}`);
      const mems = a.memory.episodic.slice(-8).reverse().map((m) => `${LW.Time.year(m.tick)}. év: ${m.text}`); lines.push(`Emlékek (frissek elöl): ${mems.join(' | ') || 'nincs'}`);
      const strong = a.memory.emotional.slice(-3).map((m) => m.text); if (strong.length) lines.push(`Legerősebb emlékek: ${strong.join(' | ')}`);
      const recent = W.history.chronicle.slice(-4).map((e) => e.text); if (recent.length) lines.push(`Ami a világban történt mostanában: ${recent.join(' ')}`);
      return lines;
    },
    prompt(world, a, text, res) {
      const facts = this.facts(world, a); const it = res.it;
      const outcome = it.cmd ? `A hang kérésére a döntésed már megszületett: ${{ obey: 'ENGEDELMESKEDSZ (megteszed, amit kért)', misinterpret: 'FÉLREÉRTETTED, valami hasonlót fogsz tenni', fear: 'MEGRÉMÜLTÉL és elbújsz', ignore: 'NEM TÖRŐDSZ VELE, a magad dolgát teszed' }[res.how] || 'nem tudod megtenni'}.` : res.nudged ? `A hang sugallata elért: egy napig erősebben gondolsz erre: ${GOAL_HU[res.nudged] || res.nudged}. Nem ígérsz semmit, csak fontolgatod.` : '';
      const att = { confused: 'Nem tudod, ki beszél; zavart vagy, talán félsz. Nem tudsz semmit Teremtőről.', hostile: 'Neheztelsz a hangra, kurtán, elutasítóan felelsz.', wary: 'Gyanakodsz, óvatos vagy.', neutral: 'Semleges vagy, kíváncsi.', warm: 'Bizalommal, barátságosan felelsz.', devout: 'Hiszel benne, hogy a Teremtő szól; tisztelettel felelsz.' }[res.att];
      const hist = (a.chatHistory || []).slice(-8, -1).map((h) => `${h.who === 'creator' ? 'A hang' : a.name}: ${h.text}`).join('\n');
      const system = `Te ${a.name} vagy, egy ember egy ősi, kezdetleges világban. Nem tudsz semmit a mi világunkról, gépekről, országokról, más nyelvekről; csak azt tudod, ami a TÉNYEK között áll — ne találj ki új tényeket, neveket, helyeket. Egy száj nélküli hang szól hozzád (a világ Teremtője, aki figyeli a világot). Beszélj első személyben, MAGYARUL, egyszerűen, ahogy egy ilyen ember beszélne: 1–3 rövid mondat, a jellemed és a hangulatod szerint. ${att} Ha a hang parancsot adott, a döntést NEM te hozod meg most: a lenti KIMENETEL szerint fogalmazz. Ne magyarázd a rendszert, ne használj idézőjelet. Válaszolj kizárólag ezzel a JSON-nal: {"reply": "a válaszod", "trust": szám -0.2 és 0.2 között (mennyit változott a bizalmad a hang iránt e mondat után)}`;
      const user = `TÉNYEK:\n${facts.join('\n')}\n${hist ? `\nEDDIGI BESZÉLGETÉS:\n${hist}\n` : ''}${outcome ? `\nKIMENETEL: ${outcome}\n` : ''}\nA hang most ezt mondja neked: „${text}”`;
      return { system, user };
    },
    /** A modell válaszának alkalmazása (csak fogalmazás + kis bizalomváltozás). */
    applyModel(world, a, parsed) {
      const reply = parsed && typeof parsed.reply === 'string' ? parsed.reply.trim().slice(0, 400) : ''; if (!reply) return null;
      const d = parsed && typeof parsed.trust === 'number' ? clamp(parsed.trust, -0.2, 0.2) : 0; a.beliefs.trust = clamp((a.beliefs.trust || 0) + d * 0.5, -1, 1);
      if (a.chatHistory && a.chatHistory.length && a.chatHistory[a.chatHistory.length - 1].who === a.id) a.chatHistory[a.chatHistory.length - 1].text = reply.slice(0, 240); else (a.chatHistory = a.chatHistory || []).push({ who: a.id, text: reply.slice(0, 240), t: world.tick });
      return reply;
    },
    /** Beszélgetés naplózása a világban (a felhőben is megmarad). */
    log(world, entry) { world.chatLog = world.chatLog || []; entry.t = world.tick; entry.ms = Date.now(); world.chatLog.push(entry); if (world.chatLog.length > 200) world.chatLog.splice(0, world.chatLog.length - 200); return entry; },
  };
  function excerpt(text) { const s = String(text || '').replace(/\s+/g, ' ').trim(); return s.length > 60 ? s.slice(0, 57) + '…' : s; }
  LW.Dialogue = Dialogue;
})(globalThis.LW || (globalThis.LW = {}));
