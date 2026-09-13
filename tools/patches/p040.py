PATCHES = [
# ---------------------------------------------------------------- ismeretlen jövő: a világ maga generál új lehetőségeket
('src/tech/tree.js', [
("""    eraOf(id) { const d = D[id]; return d ? (ERA_INDEX[d.era] ?? 0) : 0; },""",
 """    eraOf(id) { const d = D[id]; return d ? (ERA_INDEX[d.era] ?? 0) : 0; },
    /** Az ismeretlen jövő: a Világmag után évente egy új, generált lehetőség — a Teremtőnek sincs rá szava. */
    futureStep(world) {
      const known = LW.Tech.worldKnowledge(world); if (!known.has('world_simulation')) return;
      world.futureTechs = world.futureTechs || []; const last = world.futureTechs[world.futureTechs.length - 1];
      if (last && !known.has(last.id)) return; // előbb az utolsó ismeretlent kell megtalálni
      if (last && world.tick - last.born < LW.TIME.TICKS_PER_YEAR * 2) return;
      const rng = world.rng; const n = world.futureTechs.length + 1;
      const PRE = ['Kvantum', 'Bio', 'Nano', 'Neuro', 'Hiper', 'Foton', 'Gravi', 'Tér', 'Idő', 'Plazma', 'Kripto', 'Szinguláris', 'Ön', 'Meta', 'Exo'];
      const ROOT = ['hálózat', 'motor', 'kohó', 'elme', 'vető', 'híd', 'kapu', 'mag', 'szövet', 'térkép', 'óra', 'tükör', 'kert', 'kút', 'lánc', 'sejt', 'burok', 'nyelv'];
      const name = `${rng.pick(PRE)}${rng.pick(ROOT)}`; const fxKeys = ['discovery', 'craft', 'health', 'speed', 'farm', 'teach', 'warmth', 'food'];
      const fx = {}; for (const k of rng.shuffle(fxKeys.slice()).slice(0, rng.int(1, 3))) fx[k] = Math.round(rng.range(0.1, 0.4) * 100) / 100;
      const own = world.language.place().toLowerCase();
      const t = { id: `future_${n}`, name, era: 'beyond', prereq: [last ? last.id : 'world_simulation'], items: { chip: rng.int(10, 40), electric_part: rng.int(4, 16) }, nearby: rng.pick(['data_center', 'lab', 'simulation_core']), difficulty: 0.985 + rng.f() * 0.01, skill: rng.pick(['crafting', 'medicine', 'building']), minSkill: 0.9, minPop: 150 + n * 20, fx, wow: `Ismeretlen: ${name}`, desc: `Amit még senki nem látott. Ők úgy hívják: „${own}”. ${rng.pick(['Az anyag új rendje.', 'A gondolat új alakja.', 'Az idő másképp folyik körülötte.', 'A világ széle közelebb jött.', 'Senki nem tudja, mire jó — még.'])}`, born: world.tick };
      world.futureTechs.push(t); this.registerFuture([t]);
      world.events.emit('FutureTech', { tick: world.tick, name, id: t.id });
    },
    registerFuture(list) { for (const t of list) { if (D[t.id]) continue; D[t.id] = { ...t }; } },"""),
]),
# ---------------------------------------------------------------- párbeszéd: az elme válaszol
('src/agents/dialogue.js', [
("""['weather', /\\b(milyen az ido|hideg van|esik|meleg van|milyen a videk)\\b/],""",
 """['weather', /\\b(milyen az ido|hideg van|esik|meleg van|milyen a videk)\\b/], ['why', /\\b(miert elsz|mi a celod|mi hajt|mi ertelme|mi az ertelme|miert vagy|mi a dolgod|mit akarsz az elettol|boldog vagy)\\b/], ['dream', /\\b(mit almodtal|almodsz|almodtal|alom)\\b/], ['self', /\\b(mit gondolsz magadrol|milyen ember vagy|ki vagy te valojaban|szeretnek teged|felsz a halaltol|halal|meghalsz)\\b/], ['sim', /\\b(szimulacio|szimulacioban|valodi vagy|letezel|matrix|teremtett vilag|program vagy|jatek vagy)\\b/],"""),
("""        case 'world': { const ch = W.history.chronicle.slice(-3).map((e) => e.text); S.push(ch.length ? `Ami történt: ${ch.join(' ')}` : 'Nem történt semmi, amiről beszélni érdemes.'); break; }""",
 """        case 'world': { const ch = W.history.chronicle.slice(-3).map((e) => e.text); S.push(ch.length ? `Ami történt: ${ch.join(' ')}` : 'Nem történt semmi, amiről beszélni érdemes.'); break; }
        case 'why': { const m = a.mind; if (m && m.purpose) S.push(`Ami hajt: ${LW.Mind.label(m.purpose)}.`); if (m && m.existential > 0.5) S.push(pick(['És mégis: néha nem tudom, mi értelme az egésznek.', 'De vannak kérdéseim, amikre senki nem felel. Te sem.'])); else S.push(pick(['Nem kérdezem, mi értelme. Élek.', 'Reggel felkelek, és van dolgom. Ez elég.'])); if (m && m.journal.length) S.push(`Tegnap ezt gondoltam: „${m.journal[m.journal.length - 1].text}”`); break; }
        case 'dream': { const m = a.mind; const d = m ? m.journal.slice().reverse().find((j) => j.text.startsWith('Álmodtam')) : null; S.push(d ? d.text : pick(['Nem emlékszem, mit álmodtam. Csak arra, hogy féltem.', 'Álmomban a folyónál voltam, és nem volt hideg.'])); break; }
        case 'self': { const m = a.mind || LW.Mind.fresh(); S.push(m.selfImage > 0.3 ? 'Azt hiszem, kedvelnek. Számítanak rám.' : m.selfImage < -0.3 ? 'Nem kedvelnek. Nem tudom, miért.' : 'Nem tudom, mit gondolnak rólam. Nem kérdezem.'); S.push(m.mortality > 0.6 ? pick(['Igen, félek a haláltól. Fogy az időm, és még nem adtam át mindent.', 'Meghalok. Nem ma. De közel van.']) : m.mortality > 0.3 ? 'A halál eszembe jut néha. Aztán dolgozom tovább.' : 'A halál messze van. Most élek.'); break; }
        case 'sim': { const s = a.beliefs.simulation || 0; const sk = LW.Civilization ? LW.Civilization.skepticism(W, a) : 0; if (s > 0.6) S.push(pick(['Igen. Tudom. Mi is egy gépben élünk — és az sem biztos, hogy a tiéd az utolsó.', 'Valaki nézi ezt. Te. És talán téged is néz valaki.', 'Nem baj, ha teremtettek vagyunk. A kenyér attól még kenyér.'])); else if (s > 0 && s < 0.3) S.push(pick(['Nem. Ez a világ valódi. Érzem a hideget, a kenyeret, a fájdalmat. Ne mondj nekem ilyet.', 'Aki ilyet mond, az beteg vagy hazudik. Én valódi vagyok.'])); else if (sk > 0.3) S.push(pick(['A tudomány nem talált teremtőt. Te a fejemben vagy, vagy egy trükk.', 'Nem hiszek olyanban, amit nem mérhetek. Téged sem tudlak mérni.'])); else S.push(pick(['Nem értem a kérdést. Itt vagyok, ez a világ van. Mi más lenne?', 'Szimu… mi? Itt a folyó, itt a tűz. Ez a valóság.'])); break; }"""),
("""      const ks = Object.keys(a.vocab || {}); lines.push(`Nyelv: ${l ? LW.Speech.describeLang(W, l) : 'nincs'}; ${ks.length} szót tud${ks.length ? ', pl. ' + ks.slice(0, 5).map((c) => `„${a.vocab[c].w}”=${LW.Speech.gloss(c)}`).join(', ') : ' (mutogat)'}`);""",
 """      const ks = Object.keys(a.vocab || {}); lines.push(`Nyelv: ${l ? LW.Speech.describeLang(W, l) : 'nincs'}; ${ks.length} szót tud${ks.length ? ', pl. ' + ks.slice(0, 5).map((c) => `„${a.vocab[c].w}”=${LW.Speech.gloss(c)}`).join(', ') : ' (mutogat)'}`);
      if (a.mind) { lines.push(`Belső világ: ${LW.Mind.describe(W, a).join(' ')}${a.ill > 0 ? ' Most beteg.' : ''}`); const j = a.mind.journal.slice(-3).map((x) => x.text); if (j.length) lines.push(`Belső hangja (utolsó gondolatok): ${j.join(' | ')}`); }"""),
# 'me' kérdés: a kétely és a szimuláció is szól bele
("""        case 'me': { if (a.beliefs.creator < 0.25) S.push(pick(['Nem tudom, ki vagy. Egy hang, aminek nincs szája.', 'Nem ismerlek. Talán a fejemben laksz.']));""",
 """        case 'me': { if ((a.beliefs.simulation || 0) > 0.6) S.push('Tudom, ki vagy. Az, aki figyeli ezt a világot — ahogy mi figyeljük a magunkét a Világmagban.'); else if (a.beliefs.creator < 0.25 && LW.Civilization && LW.Civilization.skepticism(W, a) > 0.3) S.push(pick(['A tudomány szerint nincs teremtő. Te a fejemben szólsz, vagy egy trükk.', 'Nem hiszek olyanban, amit nem lehet mérni.'])); else if (a.beliefs.creator < 0.25) S.push(pick(['Nem tudom, ki vagy. Egy hang, aminek nincs szája.', 'Nem ismerlek. Talán a fejemben laksz.']));"""),
]),
# ---------------------------------------------------------------- agy: a halandóság tanításra sarkall
('src/agents/brain.js', [
("""    teach: {
      applicable: (c, a) => c.adult && a.knowledge.techs.size > 0 && c.nearby.length > 0,""",
 """    teach: {
      applicable: (c, a) => c.adult && a.knowledge.techs.size > 0 && c.nearby.length > 0,
      // (a halandóság-érzet a pontozásban: aki tudja, hogy fogy az ideje, átadja, amit tud)"""),
]),
# ---------------------------------------------------------------- felület: Tudat szakasz, betegség, jövő
('src/ui/ui.js', [
("""      // nyelv & viszony a hanghoz
      el.appendChild(h('h3', null, 'Nyelv & a hang'));""",
 """      // tudat: ami hajtja, a belső hangja, kérdései
      el.appendChild(h('h3', null, 'Tudat'));
      { const m = a.mind || LW.Mind.fresh(); el.appendChild(h('div', { class: 'chips' }, h('span', { class: 'chip gold' }, m.purpose ? `hajtja: ${LW.Mind.label(m.purpose)}` : 'még nem tudja, mi hajtja'), h('span', { class: 'chip' + (m.mortality > 0.6 ? ' warn' : '') }, m.mortality > 0.6 ? 'érzi, hogy fogy az ideje' : m.mortality > 0.3 ? 'gondol a halálra' : 'a halál messze'), h('span', { class: 'chip' }, m.selfImage > 0.3 ? 'úgy érzi, kedvelik' : m.selfImage < -0.3 ? 'úgy érzi, nem kedvelik' : 'nem tudja, mit gondolnak róla'), m.existential > 0.5 ? h('span', { class: 'chip warn' }, `létkérdések ${pct(m.existential)}`) : null, a.ill > 0 ? h('span', { class: 'chip warn' }, `beteg (${a.ill} nap)`) : null, (a.beliefs.simulation || 0) > 0.6 ? h('span', { class: 'chip rose' }, 'tudja: teremtett világban él') : (a.beliefs.simulation || 0) > 0 && a.beliefs.simulation < 0.3 ? h('span', { class: 'chip' }, 'tagadja a szimulációt') : null));
        const j = m.journal.slice(-3).reverse(); if (j.length) for (const x of j) el.appendChild(h('div', { class: 'mem' }, h('time', null, `${LW.Time.year(x.t)}. év ${LW.Time.dayOfYear(x.t) + 1}. nap`), h('b', { style: 'font-style:italic;font-weight:400' }, x.text))); else el.appendChild(h('div', { class: 'mem' }, 'Még nem gondolkodott el az életén.')); }
      // nyelv & viszony a hanghoz
      el.appendChild(h('h3', null, 'Nyelv & a hang'));"""),
("""      if (a.nudge && w.tick < a.nudge.until && a.plan && a.plan.goal === a.nudge.goal) return `„${a.nudge.text}” — ezt mondta a hang. Talán igaza van.`;""",
 """      if (a.nudge && w.tick < a.nudge.until && a.plan && a.plan.goal === a.nudge.goal) return `„${a.nudge.text}” — ezt mondta a hang. Talán igaza van.`;
      if (a.ill > 0 && (a.id & 1)) return 'Beteg vagyok. Csak kibírjam.';
      if (a.mind && a.mind.voice && w.tick - a.mind.voiceTick < 96 && ((a.id + (w.tick >> 5)) % 3 === 0)) return a.mind.voice;"""),
]),
('src/history/history.js', [
("""        case 'FutureTech':""",
 """        case 'ExistentialQuestion': return { text: `${n(ev.agentId)} feltette a kérdést: „${ev.text}”`, base: 0.7, firstKey: 'question', firstTitle: 'Az első kérdés, amire nincs válasz' };
        case 'FutureTech':"""),
]),
('src/core/hu.js', [
("""NewLand: 'Új föld', FutureTech: 'Ismeretlen' },""", """NewLand: 'Új föld', FutureTech: 'Ismeretlen', ExistentialQuestion: 'Kérdés' },"""),
]),
]
