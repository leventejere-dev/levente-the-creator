PATCHES = [
('src/agents/dialogue.js', [
("""if (near >= 0) return LW.Brain.tileNear ? LW.Brain.tileNear(W, near) : near; scan(25, (i) => LW.isFreshBiome(t.biome[i])); return best >= 0 ? W.randomNear(W.xOf(best), W.yOf(best), 1) : null; }""",
 """if (near < 0) { scan(25, (i) => LW.isFreshBiome(t.biome[i])); near = best; } if (near < 0) return null; const sh = LW.Agents.tileNear(W, a, near); return sh != null && sh >= 0 ? sh : W.randomNear(W.xOf(near), W.yOf(near), 1); }"""),
("""      res.reply = this.compose(world, a, it, att, how, nudged);
      a.chatHistory.push({ who: a.id, text: res.reply.slice(0, 240), t: world.tick });""",
 """      res.reply = this.compose(world, a, it, att, how, nudged);
      (a.chatHistory = a.chatHistory || []).push({ who: a.id, text: res.reply.slice(0, 240), t: world.tick });"""),
]),
('src/god/god.js', [
("""      a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.25 * (0.4 + a.personality.optimism * 0.4 + a.personality.curiosity * 0.3));
      a.importance += 0.2; if (!a.achievements.includes('A Teremtő tanúja')) a.achievements.push('A Teremtő tanúja');""",
 """      a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.25 * (0.4 + a.personality.optimism * 0.4 + a.personality.curiosity * 0.3));
      a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) + (awe - fear) * 0.35 * (0.6 + a.personality.optimism * 0.5), -1, 1); // jótétemény bizalmat épít, csapás rombolja
      a.importance += 0.2; if (!a.achievements.includes('A Teremtő tanúja')) a.achievements.push('A Teremtő tanúja');"""),
("""      if (!force) { A().memory(world, a, { type: 'divine', text: `egy száj nélküli hang szólt: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.6, divine: true }); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.3); a.emotions.fear = LW.clamp01(a.emotions.fear + 0.2); a.emotions.excitement = LW.clamp01(a.emotions.excitement + 0.3); }
      else A().memory(world, a, { type: 'divine', text: `a testem idegen akaratra mozdult: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.7, divine: true });""",
 """      if (!force) { A().memory(world, a, { type: 'divine', text: `egy száj nélküli hang szólt: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.6, divine: true }); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.3); a.emotions.fear = LW.clamp01(a.emotions.fear + 0.2); a.emotions.excitement = LW.clamp01(a.emotions.excitement + 0.3); a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) - 0.03, -1, 1); }
      else { A().memory(world, a, { type: 'divine', text: `a testem idegen akaratra mozdult: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.7, divine: true }); a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) - 0.25, -1, 1); }"""),
("""      if (a.divineRequest) a.divineRequest.interpreted = how;
      A().memory(world, a, { type: 'divine', text: how === 'obey' ? 'engedelmeskedtem a hangnak' : how === 'ignore' ? 'nem törődtem a hanggal' : how === 'fear' ? 'elbújtam a hang elől' : 'azt tettem, amit a hang szerintem akart', importance: 0.7, emotion: how === 'fear' ? 'fear' : 'excitement', intensity: 0.6, divine: true });
      world.events.emit('DivineCommandInterpreted', { tick: world.tick, agentId: a.id, how, text });
    },""",
 """      if (a.divineRequest) a.divineRequest.interpreted = how;
      A().memory(world, a, { type: 'divine', text: how === 'obey' ? 'engedelmeskedtem a hangnak' : how === 'ignore' ? 'nem törődtem a hanggal' : how === 'fear' ? 'elbújtam a hang elől' : 'azt tettem, amit a hang szerintem akart', importance: 0.7, emotion: how === 'fear' ? 'fear' : 'excitement', intensity: 0.6, divine: true });
      world.events.emit('DivineCommandInterpreted', { tick: world.tick, agentId: a.id, how, text });
      return how;
    },"""),
("""  LW.Actions.OPS.divineDone = function (world, a) { if (a.divineRequest) { A().memory(world, a, { type: 'divine', text: 'megtettem, amit a hang kért', importance: 0.6, emotion: 'pride', intensity: 0.5, divine: true }); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.1); a.divineRequest = null; } return 'done'; };""",
 """  LW.Actions.OPS.divineDone = function (world, a) { if (a.divineRequest) { A().memory(world, a, { type: 'divine', text: 'megtettem, amit a hang kért', importance: 0.6, emotion: 'pride', intensity: 0.5, divine: true }); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.1); a.beliefs.trust = LW.clamp((a.beliefs.trust || 0) + 0.05, -1, 1); a.divineRequest = null; } return 'done'; };"""),
]),
('src/agents/brain.js', [
("""        if (a.failStreak && a.failStreak.goal === id && a.failStreak.count >= 3 && world.tick - a.failStreak.tick < 32) { s *= 0.3; factors = [...factors, `sorra kudarc (×${a.failStreak.count})`]; }""",
 """        if (a.failStreak && a.failStreak.goal === id && a.failStreak.count >= 3 && world.tick - a.failStreak.tick < 32) { s *= 0.3; factors = [...factors, `sorra kudarc (×${a.failStreak.count})`]; }
        if (a.nudge && a.nudge.goal === id && world.tick < a.nudge.until) { s = s * 1.4 + 0.25; factors = [...factors, 'a hang sugallata']; } // a Teremtő szava: erősebb késztetés, nem parancs"""),
]),
('src/agents/social.js', [
("""      // knowledge transfer, either direction
      this.transfer(world, a, t, ra); this.transfer(world, t, a, rt);""",
 """      // szavak: aki beszél, szót talál vagy mutogat; a másik tanul, néha visszaszól
      LW.Speech.say(world, a, t); if (world.rng.chance(0.6)) LW.Speech.say(world, t, a);
      // knowledge transfer, either direction (a közös nyelv segít)
      this.transfer(world, a, t, ra); this.transfer(world, t, a, rt);"""),
("""      const p = cfg.conversationTransferBase * (0.5 + teller.personality.sociability) * (0.5 + listener.personality.intelligence) * (0.5 + r.friendship) * (1 - d.difficulty * 0.5);""",
 """      const p = cfg.conversationTransferBase * (0.5 + teller.personality.sociability) * (0.5 + listener.personality.intelligence) * (0.5 + r.friendship) * (1 - d.difficulty * 0.5) * (0.5 + 0.5 * LW.Speech.intelligibility(teller, listener));"""),
]),
('src/agents/memory.js', [
("""text = text + ' (as told)'; }""", """text = text + ' (így mesélték)'; }"""),
]),
('src/sim/simulation.js', [
("""      if (!world.history) new LW.History(world);
      world.ground = world.ground || new Map();""",
 """      if (!world.history) new LW.History(world);
      world.ground = world.ground || new Map();
      LW.Speech.init(world);"""),
("""      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); for (const [i, g] of w.ground) { LW.Agents.spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); } }""",
 """      if (w.tick % T.TICKS_PER_DAY === 0) { LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w); for (const [i, g] of w.ground) { LW.Agents.spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); } }"""),
("""        if (cb && cb.progress) cb.progress(doneTicks / total, `Simulating ${LW.Time.span(doneTicks)} of ${LW.Time.span(total)}…`);""",
 """        if (cb && cb.progress) cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);"""),
]),
('src/sim/macro.js', [
("""      LW.Settlements.detect(w); LW.Agents.immigrationCheck(w);
      for (const [i, g] of w.ground) { A().spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); }""",
 """      LW.Settlements.detect(w); LW.Agents.immigrationCheck(w); LW.Speech.daily(w);
      for (const [i, g] of w.ground) { A().spoil(w, g, 1.5); if (!Object.keys(g).length) w.ground.delete(i); }"""),
]),
('src/persistence/persistence.js', [
("""  const TRANSIENT = new Set(['plan', 'why', 'env', 'threat', 'engagedWith']);""",
 """  const TRANSIENT = new Set(['plan', 'why', 'env', 'threat', 'engagedWith', 'lastSaid']);"""),
("""    if (!a.palette) a.palette = LW.Genetics.palette(a.genes.appearance);
    return a;""",
 """    if (!a.palette) a.palette = LW.Genetics.palette(a.genes.appearance);
    if (!a.vocab) a.vocab = {}; if (a.beliefs && a.beliefs.trust == null) a.beliefs.trust = 0; if (!a.chatHistory) a.chatHistory = [];
    return a;"""),
("""        history: w.history.toJSON(),
      };""",
 """        history: w.history.toJSON(), speech: LW.Speech.toJSON(w),
      };"""),
("""      LW.History.fromJSON(w, state.history);
      const sim = new LW.Simulation(w);""",
 """      LW.History.fromJSON(w, state.history);
      LW.Speech.fromJSON(w, state.speech);
      const sim = new LW.Simulation(w);"""),
]),
('src/history/history.js', [
("""        case 'Conversation': return null;""",
 """        case 'WordCoined': return { text: `${n(ev.agentId)} kimondott egy szót, ami eddig nem létezett: „${ev.word}” — ${LW.Speech.gloss(ev.concept)}.`, base: 0.12, firstKey: 'word', firstTitle: 'Az első szó' };
        case 'LanguageNamed': return { text: `${ev.speakers} ember már közös szavakkal beszél${ev.place ? ' ' + ev.place + ' körül' : ''}: megszületett a ${ev.name.toLowerCase()} nyelv.`, base: 0.75, firstKey: 'language', firstTitle: 'Az első nyelv' };
        case 'LanguageSplit': return { text: `${ev.place} népe már nem érti a többieket: a maguk nyelvén beszélnek, a ${ev.name.toLowerCase()} nyelven.`, base: 0.85, firstKey: 'langsplit', firstTitle: 'Az első nyelvszakadás' };
        case 'SecretTongue': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} új szavakat sugdos egymásnak — nem akarják, hogy a hang értse.`, base: 0.55, firstKey: 'secret', firstTitle: 'Az első titkos szó' };
        case 'CreatorSpoke': return { text: ev.text, base: 0.5, god: true, firstKey: 'spoke', firstTitle: 'A Teremtő első szava' };
        case 'CreatorAnswered': return { text: ev.text, base: 0.45, god: true, firstKey: 'answered', firstTitle: 'Az első válasz a Teremtőnek' };
        case 'Utterance': return null;
        case 'Conversation': return null;"""),
]),
('src/core/hu.js', [
("""StrangerArrived: 'Idegen', Harvest: 'Aratás', WeatherChanged: 'Időjárás' },""",
 """StrangerArrived: 'Idegen', Harvest: 'Aratás', WeatherChanged: 'Időjárás', WordCoined: 'Szó', LanguageNamed: 'Nyelv', LanguageSplit: 'Nyelvszakadás', SecretTongue: 'Titkos nyelv', CreatorSpoke: 'A hang', CreatorAnswered: 'Válasz' },"""),
]),
('src/manifest.json', [
("""    "settlements/settlements.js",
    "history/history.js",
    "god/god.js",""",
 """    "settlements/settlements.js",
    "language/speech.js",
    "history/history.js",
    "god/god.js",
    "agents/dialogue.js","""),
("""    "cloud.js",
    "audio/audio.js",""",
 """    "cloud.js",
    "llm.js",
    "audio/audio.js","""),
("""    "ui/ui.js",
    "main.js\"""",
 """    "ui/ui.js",
    "ui/chat.js",
    "main.js\""""),
]),
]
