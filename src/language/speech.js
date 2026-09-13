/* LEVENTE — THE CREATOR · language/speech.js
 * Kialakuló nyelvek. Senki nem kap szavakat: aki mondani akar valamit és nincs rá szava,
 * kitalál egyet; a hallgató megtanulja (néha elrontja); a csoportok szava lassan eltér,
 * és ha két település már nem érti egymást, két nyelv lesz belőle. Aki neheztel a
 * Teremtőre, titkos szavakat sugdos, hogy a hang ne értse. A Teremtő a saját szótárát
 * hallgatózással építi (isteni füllel minden nem titkos szót ért). (spec §60–§61)
 */
(function (LW) {
  'use strict';
  const T = LW.TIME;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // fogalom → magyar jelentés (a szavak ezekre a fogalmakra születnek)
  const CONCEPTS = {
    i: 'én', you: 'te', we: 'mi', they: 'ők', person: 'ember', child: 'gyerek', mother: 'anya', father: 'apa', friend: 'barát', partner: 'pár', love: 'szeretet', stranger: 'idegen', enemy: 'ellenség', name: 'név',
    water: 'víz', food: 'étel', berries: 'bogyó', roots: 'gyökér', meat: 'hús', fish: 'hal', wood: 'fa', stone: 'kő', flint: 'kova', fire: 'tűz', home: 'otthon', tool: 'szerszám', spear: 'lándzsa', hide: 'bőr', clay: 'agyag', grain: 'gabona', salt: 'só',
    river: 'folyó', lake: 'tó', sea: 'tenger', forest: 'erdő', hill: 'domb', mountain: 'hegy', rain: 'eső', storm: 'vihar', snow: 'hó', cold: 'hideg', warm: 'meleg', night: 'éjszaka', day: 'nappal', sun: 'nap', moon: 'hold', wind: 'szél', animal: 'állat', beast: 'vad', danger: 'veszély',
    go: 'menni', come: 'jönni', give: 'adni', take: 'venni', eat: 'enni', drink: 'inni', sleep: 'aludni', build: 'építeni', make: 'csinálni', hunt: 'vadászni', gather: 'gyűjteni', look: 'nézni', know: 'tudni', teach: 'tanítani', help: 'segíteni', fight: 'harcolni', speak: 'beszélni', want: 'akarni',
    good: 'jó', bad: 'rossz', big: 'nagy', small: 'kicsi', many: 'sok', none: 'semmi', yes: 'igen', no: 'nem', here: 'itt', there: 'ott', far: 'messze', near: 'közel', new: 'új', old: 'régi',
    death: 'halál', birth: 'születés', spirit: 'szellem', creator: 'teremtő', sky: 'ég', voice: 'hang', secret: 'titok',
  };
  const ROLE = {}; for (const c of ['i', 'you', 'we', 'they', 'person', 'child', 'mother', 'father', 'friend', 'partner', 'stranger', 'enemy']) ROLE[c] = 'S'; for (const c of ['go', 'come', 'give', 'take', 'eat', 'drink', 'sleep', 'build', 'make', 'hunt', 'gather', 'look', 'know', 'teach', 'help', 'fight', 'speak', 'want']) ROLE[c] = 'V';
  const GOAL_CONCEPTS = {
    eat: ['i', 'eat', 'food'], drink: ['i', 'drink', 'water'], sleep: ['i', 'sleep', 'night'], getWarm: ['cold', 'fire', 'warm'], careForChild: ['child', 'give', 'food'], shareFood: ['you', 'take', 'food'], followParent: ['mother', 'go'], socialize: ['you', 'friend', 'good'], flirt: ['you', 'good', 'love'], mate: ['love', 'you'], stockpile: ['gather', 'food', 'many', 'cold'], buildShelter: ['we', 'build', 'home'], helpBuild: ['help', 'build', 'home'], makeFire: ['make', 'fire'], tendFire: ['fire', 'wood'], craft: ['make', 'tool', 'stone'], experiment: ['make', 'new', 'know'], dig: ['stone', 'take', 'here'], farm: ['grain', 'make', 'many'], explore: ['go', 'far', 'there', 'look'], fight: ['bad', 'enemy', 'fight'], teach: ['know', 'teach', 'you'], pickup: ['take', 'here'], mourn: ['death', 'bad'], rest: ['sleep', 'here'], flee: ['danger', 'go', 'beast'], divine: ['voice', 'sky', 'creator'],
  };
  const STARTER = ['i', 'you', 'water', 'food', 'go', 'good', 'danger', 'fire', 'no', 'here'];
  const CONS_POOL = ['m', 'n', 'l', 'r', 'k', 't', 's', 'v', 'd', 'th', 'sh', 'h', 'b', 'g', 'z', 'f', 'p', 'y', 'w', 'ch', 'kh', 'ny', 'rr'];
  const VOW_POOL = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'ei', 'ou', 'y'];

  const Speech = {
    CONCEPTS, GOAL_CONCEPTS,
    gloss(c) { return CONCEPTS[c] || c; },
    /** Régi mentések és új világok: nyelvi állapot biztosítása. */
    init(world) {
      if (!world.langs) world.langs = new Map();
      if (!world.creatorLexicon) world.creatorLexicon = {};
      if (!world.creatorSettings) world.creatorSettings = { divineEar: true, obedience: 'full' };
      if (world.creatorSettings.obedience == null) world.creatorSettings.obedience = 'full';
      if (!world.chatLog) world.chatLog = [];
      if (!world.speechLog) world.speechLog = [];
      if (!world.langs.size) { const L = world.language; this.newLang(world, { cons: L.cons, vows: L.vows, patterns: L.patterns, founderId: null }); }
      if (world.nextIds.lang == null) world.nextIds.lang = Math.max(1, ...[...world.langs.keys()]) + 1;
      for (const a of world.agents.values()) { if (!a.vocab) a.vocab = {}; if (a.langId == null || !world.langs.has(a.langId)) a.langId = this.firstLang(world).id; if (a.beliefs && a.beliefs.trust == null) a.beliefs.trust = 0; }
      if (!world._speechHooked) { world._speechHooked = true; world.events.on('StrangerArrived', (ev) => { const a = world.agents.get(ev.agentId); if (a) this.foreignTongue(world, a); }); }
    },
    firstLang(world) { let best = null; for (const l of world.langs.values()) if (!best || l.id < best.id) best = l; return best; },
    lang(world, id) { return world.langs.get(id) || this.firstLang(world); },
    newLang(world, o) {
      const rng = world.rng; const id = world.nextIds.lang == null ? 1 : world.nextIds.lang++; if (world.nextIds.lang == null) world.nextIds.lang = 2;
      const cons = o.cons ? o.cons.slice() : pickN(rng, CONS_POOL, rng.int(6, 11)), vows = o.vows ? o.vows.slice() : pickN(rng, VOW_POOL, rng.int(3, 6));
      const l = { id, name: null, cons, vows, patterns: o.patterns ? o.patterns.slice() : rng.pick([['CV', 'CVC', 'V'], ['CV', 'CVC'], ['CV', 'V', 'VC'], ['CVC', 'CV', 'CVV']]), order: o.order || rng.weighted(['SOV', 'SVO', 'VSO'], [5, 4, 1]), words: o.words ? { ...o.words } : {}, parent: o.parent ?? null, born: world.tick, founderId: o.founderId ?? null, speakers: 0, secret: 0, place: o.place || null };
      world.langs.set(id, l); return l;
    },
    syllable(rng, l) { const p = rng.pick(l.patterns); let s = ''; for (const ch of p) s += ch === 'C' ? rng.pick(l.cons) : rng.pick(l.vows); return s; },
    /** Új szó egy fogalomra: a nyelv hangkészletéből, ütközés nélkül. */
    coin(world, l, concept, avoid) {
      const rng = world.rng; const taken = new Set(Object.values(l.words)); if (avoid) for (const c in avoid) taken.add(avoid[c].w);
      for (let k = 0; k < 12; k++) { const n = rng.chance(0.55) ? 1 : 2; let w = ''; for (let i = 0; i < n; i++) w += this.syllable(rng, l); w = w.replace(/(.)\1\1+/g, '$1$1'); if (w.length >= 2 && !taken.has(w)) return w; }
      return this.syllable(rng, l) + this.syllable(rng, l) + rng.pick(l.vows);
    },
    /** Hangváltozás: egy hang cserélődik, lekopik vagy hozzáragad. */
    mutate(rng, l, w) {
      const r = rng.f(); const i = rng.int(0, w.length - 1); const ch = w[i]; const isV = /[aeiouy]/.test(ch);
      if (r < 0.6) return w.slice(0, i) + (isV ? rng.pick(l.vows.filter((v) => v.length === 1).concat(['a'])) : rng.pick(l.cons.filter((c) => c.length === 1).concat(['n']))) + w.slice(i + 1);
      if (r < 0.8 && w.length > 3) return w.slice(0, -1);
      return w + rng.pick(l.vows.filter((v) => v.length === 1).concat(['a']));
    },
    /** Idegen a peremen túlról: saját nyelv, néhány kész szóval. */
    foreignTongue(world, a) {
      const l = this.newLang(world, { founderId: a.id }); a.langId = l.id; a.vocab = a.vocab || {};
      const n = world.rng.int(6, 10); const cs = world.rng.shuffle(Object.keys(CONCEPTS).filter((c) => STARTER.includes(c) || world.rng.chance(0.15))).slice(0, n);
      for (const c of cs) { const w = this.coin(world, l, c, a.vocab); a.vocab[c] = { w, s: 0 }; l.words[c] = w; }
      l.speakers = 1;
    },
    // ---------------- miről beszélnek
    topics(world, a, t) {
      const rng = world.rng; const out = []; const add = (c) => { if (c && CONCEPTS[c] && !out.includes(c)) out.push(c); };
      const g = a.plan && !a.plan.done ? a.plan.goal : null; const gc = GOAL_CONCEPTS[g]; if (gc) for (const c of rng.shuffle(gc.slice()).slice(0, 2)) add(c);
      const N = a.needs, E = a.emotions; const dyn = [];
      if (N.food < 0.35) dyn.push('food'); if (N.water < 0.35) dyn.push('water'); if (N.warmth < 0.4) dyn.push('cold'); if (E.fear > 0.4) dyn.push('danger'); if (E.grief > 0.4) dyn.push('death'); if (E.love > 0.5) dyn.push('love'); if (E.anger > 0.5) dyn.push('bad'); if (E.joy > 0.6) dyn.push('good');
      const ws = world.weather && world.weather.state; const cold = world.tileTemp(world.idx(a.x | 0, a.y | 0)) < 0; if (ws === 'rain') dyn.push(cold ? 'snow' : 'rain'); else if (ws === 'storm') dyn.push(cold ? 'snow' : 'storm');
      if (LW.Time.isNight(world.tick)) dyn.push('night');
      const recentDivine = a.memory.episodic.length && a.memory.episodic.slice(-6).some((m) => m.divine && world.tick - m.tick < T.TICKS_PER_DAY * 3); if (recentDivine) dyn.push(rng.pick(['voice', 'sky', 'creator']));
      if (t && a.partner === t.id) dyn.push('partner'); if (t && a.children.includes(t.id)) dyn.push('child'); if (t && t.langId !== a.langId) dyn.push('stranger');
      if (a.inv.spear) dyn.push('spear'); if (a.home != null) dyn.push('home');
      for (const c of rng.shuffle(dyn).slice(0, rng.int(1, 2))) add(c);
      if (!out.length) add(rng.pick(['you', 'good', 'here', 'look', 'i']));
      if (out.length < 2 && rng.chance(0.6)) add(rng.pick(['you', 'i', 'we', 'good', 'here']));
      return out.slice(0, 4);
    },
    /** Egy megszólalás: a beszélő szavai (vagy mutogatás), a hallgató tanul, a szó vándorol. */
    say(world, a, t, concepts) {
      const rng = world.rng; const l = this.lang(world, a.langId); a.vocab = a.vocab || {};
      const cs = concepts || this.topics(world, a, t);
      const words = [], gestures = [];
      for (const c of cs) {
        let v = a.vocab[c];
        if (!v) { if (rng.chance(0.55 * (0.4 + a.personality.creativity * 0.8 + a.personality.sociability * 0.3))) { const w = this.coin(world, l, c, a.vocab); v = a.vocab[c] = { w, s: 0 }; world.events.emit('WordCoined', { tick: world.tick, agentId: a.id, word: w, concept: c, langId: l.id }); } else { gestures.push(c); continue; } }
        words.push([c, v.w, v.s ? 1 : 0]);
      }
      // szórend a nyelv szerint
      const key = (x) => { const r = ROLE[x[0]] || 'O'; return l.order === 'SOV' ? (r === 'S' ? 0 : r === 'O' ? 1 : 2) : l.order === 'VSO' ? (r === 'V' ? 0 : r === 'S' ? 1 : 2) : (r === 'S' ? 0 : r === 'V' ? 1 : 2); };
      words.sort((x, y) => key(x) - key(y));
      // titkos szavak: aki neheztel a hangra, és a társa is, új szavakat sugdos
      if (t && words.length && a.beliefs.creator > 0.4 && a.beliefs.trust < -0.25 && t.beliefs.trust < -0.1 && (a.lastSecretTick == null || world.tick - a.lastSecretTick > T.TICKS_PER_DAY * 20) && rng.chance(0.2)) {
        let n = 0; for (const wd of rng.shuffle(words.slice()).slice(0, 2)) { const c = wd[0]; const w = this.coin(world, l, c, a.vocab); a.vocab[c] = { w, s: 1 }; t.vocab[c] = { w, s: 1 }; wd[1] = w; wd[2] = 1; n++; }
        if (n) { a.lastSecretTick = world.tick; t.lastSecretTick = world.tick; world.events.emit('SecretTongue', { tick: world.tick, agentId: a.id, otherId: t.id, n }); }
      }
      // tanulás
      if (t) { const r = t.relationships.get(a.id); for (const [c, w, s] of words) this.learn(world, t, a, c, w, s, r); }
      this.grammar(world, l); const fl = this.fluency(world, a);
      const utt = { t: world.tick, a: a.id, b: t ? t.id : null, l: l.id, w: words, g: gestures, f: Math.round(fl * 100) / 100, p: fl > 0.5 && l.particle && words.length >= 3 ? l.particle : null, q: null };
      if (words.some((x) => x[0] === 'many') && l.plural) utt.pl = l.plural;
      a.lastSaid = utt; world.speechLog.push(utt); if (world.speechLog.length > 80) world.speechLog.splice(0, world.speechLog.length - 80);
      world.events.emit('Utterance', { tick: world.tick, agentId: a.id, otherId: t ? t.id : null, utt });
      return utt;
    },
    learn(world, listener, speaker, c, w, s, r) {
      const rng = world.rng; listener.vocab = listener.vocab || {}; const have = listener.vocab[c]; const ll = this.lang(world, listener.langId);
      const young = LW.Time.ageYears(listener.bornTick, world.tick) < 14; const fam = r ? r.familiarity : 0;
      if (!have) { if (rng.chance(0.45 * (0.5 + listener.personality.intelligence) * (young ? 1.4 : 1) * (0.7 + fam * 0.6))) { const mut = rng.chance(0.04 * (1.6 - listener.personality.intelligence)); listener.vocab[c] = { w: mut ? this.mutate(rng, ll, w) : w, s }; } }
      else if (have.w !== w) { const p = 0.1 * (0.4 + (r ? r.respect + r.friendship * 0.5 : 0) + speaker.personality.dominance * 0.5) * (young ? 1.5 : 1); if (rng.chance(clamp(p, 0, 0.5))) listener.vocab[c] = { w, s: s || have.s }; }
      // idegen nyelvű beszélő szavait tanulva az ember lassan átáll arra a nyelvre, amelyiket a többség körülötte beszéli
      if (speaker.langId !== listener.langId && rng.chance(0.03)) { const near = world.agentsNear(listener.x, listener.y, 12, listener.id); let same = 0, other = 0; for (const o of near) { if (o.langId === speaker.langId) other++; else if (o.langId === listener.langId) same++; } if (other > same + 1) listener.langId = speaker.langId; }
    },
    /** Mennyire folyékony a beszéde (0–1): szókincs, gyakorlat, a nyelv érettsége. Ezt tanulják, ha beszélnek. */
    fluency(world, a) {
      const l = world.langs.get(a.langId); const words = Object.keys(a.vocab || {}).length; const talks = a.counters ? a.counters.talks : 0;
      const f = Math.min(1, words / 40) * 0.55 + Math.min(1, talks / 120) * 0.25 + Math.min(1, (l ? Object.keys(l.words).length : 0) / 60) * 0.2;
      return Math.max(0, Math.min(1, f));
    },
    /** Egy nyelv nyelvtani apróságai a szókincs növekedésével: kötőszó-szócska, kérdő-szócska, többes jel. */
    grammar(world, l) {
      const n = Object.keys(l.words).length;
      if (!l.particle && n >= 20) l.particle = this.syllable(world.rng, l);
      if (!l.plural && n >= 32) l.plural = this.syllable(world.rng, l).replace(/^(.)/, (m) => m);
      if (!l.question && n >= 45) l.question = this.syllable(world.rng, l);
      return l;
    },
    /** Két ember mennyire érti egymást (0–1). Kevés szóval még a mutogatás is elég. */
    intelligibility(a, b) {
      if (!a.vocab || !b.vocab) return 1; let common = 0, same = 0; for (const c in a.vocab) { const v = b.vocab[c]; if (!v) continue; common++; if (v.w === a.vocab[c].w) same++; }
      if (common < 4) return 1; return same / common;
    },
    // ---------------- napi: konszenzus, nevek, szakadás, gyerekek, imák
    daily(world) {
      const rng = world.rng; const cfgA = world.cfg.agents;
      // gyerekek a nevelőiktől tanulnak
      for (const a of world.agents.values()) {
        if (LW.Time.ageYears(a.bornTick, world.tick) >= cfgA.adultAge) continue; a.vocab = a.vocab || {};
        const cg = LW.Agents.caregivers(world, a).concat(LW.Agents.household(world, a).filter((o) => o !== a)); if (!cg.length) continue;
        const c = rng.pick(cg); if (!c.vocab) continue; const ks = Object.keys(c.vocab).filter((k) => !a.vocab[k]); if (!ks.length) continue; a.langId = c.langId;
        for (const k of rng.shuffle(ks).slice(0, 2)) if (rng.chance(0.5)) a.vocab[k] = { w: c.vocab[k].w, s: c.vocab[k].s };
      }
      // konszenzus nyelvenként
      const counts = new Map(); for (const l of world.langs.values()) { l.speakers = 0; l.secret = 0; counts.set(l.id, {}); }
      for (const a of world.agents.values()) { const l = world.langs.get(a.langId); if (!l) continue; l.speakers++; const cnt = counts.get(l.id); for (const c in a.vocab) { const v = a.vocab[c]; const m = cnt[c] || (cnt[c] = {}); m[v.w] = (m[v.w] || 0) + 1; if (v.s) l.secret++; } }
      for (const l of world.langs.values()) {
        const cnt = counts.get(l.id); const words = {}; for (const c in cnt) { let bw = null, bn = 0; for (const w in cnt[c]) if (cnt[c][w] > bn) { bn = cnt[c][w]; bw = w; } if (bw) words[c] = bw; }
        if (l.speakers > 0) l.words = words;
        if (!l.name && l.speakers >= 2 && Object.keys(l.words).length >= 10) { const base = l.words.we || l.words.person || l.words.speak || l.words[Object.keys(l.words)[0]]; l.name = base[0].toUpperCase() + base.slice(1); const st = this.homeOf(world, l); l.place = st ? st.name : null; world.events.emit('LanguageNamed', { tick: world.tick, name: l.name, langId: l.id, speakers: l.speakers, place: l.place, tile: st ? world.idx(st.x | 0, st.y | 0) : undefined }); }
      }
      // nyelvszakadás: ugyanannak a nyelvnek két települése már nem érti egymást
      if (world.tick % (T.TICKS_PER_DAY * 10) < T.TICKS_PER_DAY) this.splitCheck(world);
      // imák: aki hisz és bajban van, az éghez beszél
      for (const a of world.agents.values()) { if (a.beliefs.creator < 0.55 || a.sleeping) continue; const N = a.needs; const need = N.food < 0.25 ? 'food' : N.water < 0.25 ? 'water' : N.warmth < 0.3 ? 'warm' : a.emotions.grief > 0.6 ? 'death' : a.emotions.fear > 0.6 ? 'danger' : null; if (need && rng.chance(0.25)) this.say(world, a, null, [rng.pick(['creator', 'sky', 'voice']), a.beliefs.trust < -0.2 ? 'bad' : 'give', need]); }
    },
    homeOf(world, l) { const by = new Map(); for (const a of world.agents.values()) { if (a.langId !== l.id) continue; const s = LW.Settlements.at(world, a.x, a.y); if (!s) continue; by.set(s.id, (by.get(s.id) || 0) + 1); } let best = null, bn = 0; for (const [id, n] of by) if (n > bn) { bn = n; best = world.settlements.get(id); } return best; },
    splitCheck(world) {
      const groups = new Map(); // langId → settlementId → agents
      for (const a of world.agents.values()) { const s = LW.Settlements.at(world, a.x, a.y); if (!s || s.abandonedTick) continue; const g = groups.get(a.langId) || new Map(); groups.set(a.langId, g); const arr = g.get(s.id) || []; arr.push(a); g.set(s.id, arr); }
      for (const [langId, g] of groups) {
        const sets = [...g.entries()].filter(([, arr]) => arr.length >= 3); if (sets.length < 2) continue;
        const parent = world.langs.get(langId); if (!parent) continue;
        const cons = (arr) => { const cnt = {}; for (const a of arr) for (const c in a.vocab) { const m = cnt[c] || (cnt[c] = {}); m[a.vocab[c].w] = (m[a.vocab[c].w] || 0) + 1; } const out = {}; for (const c in cnt) { let bw = null, bn = 0; for (const w in cnt[c]) if (cnt[c][w] > bn) { bn = cnt[c][w]; bw = w; } out[c] = bw; } return out; };
        const vocs = sets.map(([sid, arr]) => ({ sid, arr, v: cons(arr) }));
        for (let i = 0; i < vocs.length; i++) for (let j = i + 1; j < vocs.length; j++) {
          const A = vocs[i], B = vocs[j]; let common = 0, same = 0; for (const c in A.v) if (B.v[c]) { common++; if (A.v[c] === B.v[c]) same++; }
          if (common < 12 || same / common >= 0.45) continue;
          const small = A.arr.length <= B.arr.length ? A : B; const st = world.settlements.get(small.sid);
          const l = this.newLang(world, { cons: parent.cons, vows: parent.vows, patterns: parent.patterns, order: parent.order, words: small.v, parent: parent.id, place: st ? st.name : null });
          const base = small.v.we || small.v.person || small.v[Object.keys(small.v)[0]]; l.name = base[0].toUpperCase() + base.slice(1); l.speakers = small.arr.length;
          for (const a of small.arr) a.langId = l.id;
          world.events.emit('LanguageSplit', { tick: world.tick, name: l.name, langId: l.id, parentId: parent.id, place: st ? st.name : 'egy csoport', tile: st ? world.idx(st.x | 0, st.y | 0) : undefined });
          return; // évente legfeljebb néhány szakadás; a többi majd a következő ellenőrzéskor
        }
      }
    },
    // ---------------- a Teremtő füle
    lexKey(langId, w) { return `${langId}:${w}`; },
    known(world, langId, w) { return world.creatorLexicon[this.lexKey(langId, w)] || null; },
    /** Egy megszólalás olvasata a Teremtőnek: eredeti szavak + amit ért belőle. */
    render(world, utt) {
      const ear = world.creatorSettings && world.creatorSettings.divineEar; const parts = [], gl = []; let hidden = 0;
      const fl = utt.f == null ? 0.3 : utt.f; const sep = fl < 0.25 ? ' … ' : fl < 0.5 ? ' · ' : ' ';
      utt.w.forEach(([c, w, s], k) => { let word = w; if (utt.pl && c === 'many') word = w + utt.pl; parts.push(word); if (utt.p && k === 0 && utt.w.length >= 3) parts.push(utt.p); const kn = this.known(world, utt.l, w); const understood = kn || (ear && !s); gl.push(understood ? this.gloss(c) : '?'); if (!understood) hidden++; });
      for (const c of utt.g) { parts.push(`*${this.gestureWord(c)}*`); gl.push(this.gloss(c)); }
      return { text: parts.join(sep), gloss: gl.join(' '), hidden, full: hidden === 0, fluency: fl };
    },
    gestureWord(c) { return ({ i: 'magára mutat', you: 'rád mutat', we: 'körbemutat', here: 'a földre mutat', there: 'a távolba mutat', food: 'a szájához nyúl', eat: 'a szájához nyúl', water: 'ivást mímel', drink: 'ivást mímel', sleep: 'a fejét oldalra hajtja', cold: 'összehúzza magát', fire: 'a tűzre mutat', danger: 'hátrahőköl', go: 'int', come: 'magához int', big: 'széttárja a karját', small: 'két ujját közelíti', good: 'bólogat', bad: 'a fejét rázza', no: 'a fejét rázza', yes: 'bólint', love: 'a mellére teszi a kezét' })[c] || 'mutogat'; },
    /** A Teremtő hallgatózik: ha a szó a látható helyzethez illik, megtanulja. Csak a Teremtő hívja (megfigyelő nem). */
    decode(world, utt) {
      const a = world.agents.get(utt.a); if (!a) return []; const ctx = this.contextConcepts(world, a); const learned = [];
      for (const [c, w, s] of utt.w) { const k = this.lexKey(utt.l, w); if (world.creatorLexicon[k]) continue; const p = (ctx.has(c) ? 0.5 : 0.04) * (s ? 0.1 : 1); if (Math.random() < p) { world.creatorLexicon[k] = { c, t: world.tick, s }; learned.push([w, c]); } }
      return learned;
    },
    reveal(world, langId, w, c, s) { world.creatorLexicon[this.lexKey(langId, w)] = { c, t: world.tick, s: s ? 1 : 0, told: 1 }; },
    contextConcepts(world, a) {
      const s = new Set(); const p = a.plan; const st = p && !p.done ? p.steps[p.i] : null; const g = p ? p.goal : null; if (g && GOAL_CONCEPTS[g]) for (const c of GOAL_CONCEPTS[g]) s.add(c);
      if (st) { if (st.op === 'gather') { s.add('gather'); s.add(st.item === 'wood' ? 'wood' : st.item === 'stone' ? 'stone' : 'food'); if (st.item === 'berries') s.add('berries'); } if (st.op === 'consume') { s.add('eat'); s.add('food'); } if (st.op === 'drink') { s.add('drink'); s.add('water'); } if (st.op === 'sleep') s.add('sleep'); if (st.op === 'hunt') { s.add('hunt'); s.add('animal'); } if (st.op === 'fish') s.add('fish'); if (st.op === 'build' || st.op === 'deliver') { s.add('build'); s.add('home'); } if (st.op === 'flee') { s.add('danger'); s.add('go'); } }
      const N = a.needs; if (N.food < 0.35) s.add('food'); if (N.water < 0.35) s.add('water'); if (N.warmth < 0.4) s.add('cold'); if (a.emotions.fear > 0.4) s.add('danger'); if (a.emotions.grief > 0.4) s.add('death');
      const ws = world.weather && world.weather.state; const cold = world.tileTemp(world.idx(a.x | 0, a.y | 0)) < 0; if (ws === 'rain') s.add(cold ? 'snow' : 'rain'); if (ws === 'storm') s.add(cold ? 'snow' : 'storm'); if (LW.Time.isNight(world.tick)) s.add('night');
      for (const b of world.buildingsNear(a.x | 0, a.y | 0, 2)) if (b.kind === 'campfire' && b.lit) s.add('fire'); if (a.inv.spear) s.add('spear');
      return s;
    },
    /** A Teremtő szótára egy nyelvhez: [fogalom, szó, ismert?, titkos?] */
    dictionary(world, l) { const ear = world.creatorSettings && world.creatorSettings.divineEar; const out = []; const secret = new Set(); for (const a of world.agents.values()) if (a.langId === l.id) for (const c in a.vocab) if (a.vocab[c].s) secret.add(c); for (const c in l.words) { const w = l.words[c]; const k = this.known(world, l.id, w); const s = secret.has(c); out.push({ c, w, known: !!k || (ear && !s), secret: s, gloss: this.gloss(c) }); } out.sort((x, y) => x.gloss.localeCompare(y.gloss, 'hu')); return out; },
    describeLang(world, l) { return l.name ? `${l.name.toLowerCase()} nyelv` : l.parent ? 'új tájszólás' : l.speakers <= 1 && l.founderId != null ? 'idegen nyelv' : 'ősnyelv'; },
    // ---------------- mentés
    toJSON(world) { return { langs: [...world.langs.values()], lexicon: world.creatorLexicon, settings: world.creatorSettings, chatLog: world.chatLog.slice(-200), speechLog: world.speechLog.slice(-80) }; },
    fromJSON(world, j) { world.langs = new Map(); if (j) { for (const l of j.langs || []) world.langs.set(l.id, l); world.creatorLexicon = j.lexicon || {}; world.creatorSettings = j.settings || { divineEar: true }; world.chatLog = j.chatLog || []; world.speechLog = j.speechLog || []; } },
  };
  function pickN(rng, pool, n) { const items = pool.slice(); const out = []; while (out.length < n && items.length) { const i = rng.int(0, items.length - 1); out.push(items[i]); items.splice(i, 1); } return out; }
  LW.Speech = Speech;
})(globalThis.LW || (globalThis.LW = {}));
