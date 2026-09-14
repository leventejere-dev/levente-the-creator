# p045 — kisebb mentés (kapcsolatok és emlékek tömören, helyek tömbként, csak az élő nyelvek), holt nyelvek törlése,
# nyelvszakadás felső korlát, parseMeta a beágyazott lease-szel is működik
PATCHES = [
('src/persistence/persistence.js', [
("""    const kept = new Set(rels.map(([id]) => id));
    o.memory = { episodic: a.memory.episodic, emotional: a.memory.emotional, social: [...a.memory.social].filter(([id, s]) => kept.has(id) || (s.lastSeen >= 0 && tick - s.lastSeen < 96 * 30)).slice(0, 160) };
    o.relationships = rels;""",
 """    const kept = new Set(rels.map(([id]) => id));
    o.memory = { episodic: a.memory.episodic.map(compactMem), emotional: a.memory.emotional.map(compactMem), social: [...a.memory.social].filter(([id, s]) => kept.has(id) || (s.lastSeen >= 0 && tick - s.lastSeen < 96 * 30)).slice(0, 160).map(([id, s]) => [id, s.facts && s.facts.length ? s : { lastSeen: s.lastSeen, lastTile: s.lastTile, impression: s.impression }]) };
    o.relationships = rels.map(([id, r]) => [id, compactRel(r)]);
    o.knowledge.places = o.knowledge.places.map((p) => [p.k, p.i, p.q, p.t]); // tömbként: a mentés harmada"""),
("""  function restoreAgent(o) {
    const a = { ...o };
    a.knowledge = { techs: new Set(o.knowledge.techs), places: new Map(o.knowledge.places.map((p) => [LW.Agents.poiKey(p.k, p.i), p])), progress: o.knowledge.progress || {} };
    a.memory = { episodic: o.memory.episodic || [], emotional: o.memory.emotional || [], social: new Map(o.memory.social || []) };
    a.relationships = new Map(o.relationships || []);""",
 """  // a nulla, hamis és üres mezők kimaradnak a mentésből; visszatöltéskor az alapértékek pótolják őket
  const REL_ZERO = { trust: 0, attraction: 0, respect: 0, friendship: 0, fear: 0, resentment: 0, jealousy: 0, gratitude: 0, loyalty: 0, familiarity: 0, dependency: 0, romance: 0 };
  function compactRel(r) { const o = {}; for (const k in r) { const v = r[k]; if (v === 0 || v === false || v == null) continue; o[k] = v; } return o; }
  function compactMem(m) { const o = {}; for (const k in m) { const v = m[k]; if (v == null || v === false || (Array.isArray(v) && !v.length)) continue; o[k] = v; } return o; }
  function restoreAgent(o) {
    const a = { ...o };
    const places = (o.knowledge.places || []).map((p) => (Array.isArray(p) ? { k: p[0], i: p[1], q: p[2], t: p[3] } : p));
    a.knowledge = { techs: new Set(o.knowledge.techs), places: new Map(places.map((p) => [LW.Agents.poiKey(p.k, p.i), p])), progress: o.knowledge.progress || {} };
    a.memory = { episodic: (o.memory.episodic || []).map((m) => ({ tile: null, divine: false, distorted: false, ...m })), emotional: (o.memory.emotional || []).map((m) => ({ tile: null, divine: false, distorted: false, ...m })), social: new Map((o.memory.social || []).map(([id, s]) => [id, s.facts ? s : { ...s, facts: [] }])) };
    a.relationships = new Map((o.relationships || []).map(([id, r]) => [id, { ...REL_ZERO, status: 'stranger', ...r }]));"""),
]),
('src/language/speech.js', [
("""    toJSON(world) { return { langs: [...world.langs.values()], lexicon: world.creatorLexicon, settings: world.creatorSettings, chatLog: world.chatLog.slice(-200), speechLog: world.speechLog.slice(-80) }; },""",
 """    toJSON(world) { const used = new Set(); for (const a of world.agents.values()) used.add(a.langId); const langs = [...world.langs.values()].filter((l) => used.has(l.id) || (l.speakers || 0) > 0 || (world.tick - (l.diedTick || world.tick)) < T.TICKS_PER_YEAR * 2); return { langs, deadLangs: world.deadLangs || 0, lexicon: world.creatorLexicon, settings: world.creatorSettings, chatLog: world.chatLog.slice(-200), speechLog: world.speechLog.slice(-80) }; },"""),
("""    fromJSON(world, j) { world.langs = new Map(); if (j) { for (const l of j.langs || []) world.langs.set(l.id, l); world.creatorLexicon = j.lexicon || {}; world.creatorSettings = j.settings || { divineEar: true }; world.chatLog = j.chatLog || []; world.speechLog = j.speechLog || []; } },""",
 """    fromJSON(world, j) { world.langs = new Map(); if (j) { for (const l of j.langs || []) world.langs.set(l.id, l); world.deadLangs = j.deadLangs || 0; world.creatorLexicon = j.lexicon || {}; world.creatorSettings = j.settings || { divineEar: true }; world.chatLog = j.chatLog || []; world.speechLog = j.speechLog || []; } },"""),
("""      for (const l of world.langs.values()) {
        const cnt = counts.get(l.id); const words = {}; for (const c in cnt) { let bw = null, bn = 0; for (const w in cnt[c]) if (cnt[c][w] > bn) { bn = cnt[c][w]; bw = w; } if (bw) words[c] = bw; }
        if (l.speakers > 0) l.words = words;""",
 """      for (const l of world.langs.values()) {
        // holt nyelv: akinek két éve nincs élő beszélője, az a krónikában marad, a világban nem (ezrek gyűltek fel)
        if (!l.speakers) { if (!l.diedTick) l.diedTick = world.tick; else if (world.tick - l.diedTick > T.TICKS_PER_YEAR * 2 && world.langs.size > 1) { world.langs.delete(l.id); world.deadLangs = (world.deadLangs || 0) + 1; if (l.name && (l.speakersMax || 0) >= 3) world.events.emit('LanguageDied', { tick: world.tick, name: l.name, langId: l.id }); } continue; }
        l.diedTick = 0; l.speakersMax = Math.max(l.speakersMax || 0, l.speakers);
        const cnt = counts.get(l.id); const words = {}; for (const c in cnt) { let bw = null, bn = 0; for (const w in cnt[c]) if (cnt[c][w] > bn) { bn = cnt[c][w]; bw = w; } if (bw) words[c] = bw; }
        if (l.speakers > 0) l.words = words;"""),
("""      for (const [langId, g] of groups) {
        const sets = [...g.entries()].filter(([, arr]) => arr.length >= 3); if (sets.length < 2) continue;""",
 """      let living = 0; for (const l of world.langs.values()) if (l.speakers > 0) living++;
      if (living >= 2 + world.population / 8) return; // a nyelvek száma a népességgel arányos: egy 800 fős világban sem lesz száz nyelv
      for (const [langId, g] of groups) {
        const sets = [...g.entries()].filter(([, arr]) => arr.length >= 3); if (sets.length < 2) continue;"""),
]),
('src/cloud.js', [
("""const m = /"meta":(\\{[^{}]*\\})/.exec(json); return { json, meta: m ? JSON.parse(m[1]) : null }; },""",
 """const i = json.indexOf('"meta":'); let meta = null; if (i >= 0) { let d = 0, j = i + 7; for (; j < json.length; j++) { const ch = json[j]; if (ch === '{') d++; else if (ch === '}') { d--; if (!d) break; } } try { meta = JSON.parse(json.slice(i + 7, j + 1)); } catch (e) { meta = null; } } return { json, meta }; },"""),
]),
('src/history/history.js', [
("""        case 'FutureTech':""",
 """        case 'LanguageDied': return { text: `Kihalt egy nyelv: ${ev.name}. Utolsó beszélője magával vitte.`, base: 0.6, firstKey: 'langdied', firstTitle: 'Az első kihalt nyelv' };
        case 'FutureTech':"""),
]),
]
