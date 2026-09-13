/* LEVENTE — THE CREATOR · agents/mind.js — a belső világ: én-kép, cél, belső hang, álmok, halandóság, létkérdések
 * Ez a tudat modellje, nem tudat: az ember naponta visszanéz arra, ami vele történt, megfogalmazza, mi hajtja,
 * mit gondol magáról és arról, aki figyeli; a halál közelsége megváltoztatja, mit tart fontosnak; a tudás és a gyász
 * kérdéseket szül, amelyekre nincs válasz. Minden mondat a valódi állapotból és a valódi emlékekből áll össze.
 */
(function (LW) {
  'use strict';
  const T = LW.TIME; const b01 = (v) => LW.clamp01(v);
  const PURPOSE = { family: 'a család', knowledge: 'a tudás', faith: 'a hit', power: 'a hatalom', craft: 'az alkotás', freedom: 'a szabadság', love: 'a szerelem', survival: 'a túlélés', legacy: 'ami utánam marad' };
  const PURPOSE_LINE = { family: ['A gyerekeimért csinálom. Mindent.', 'Ha ők jóllaknak, én is jóllaktam.'], knowledge: ['Tudni akarom, miért. Mindenre.', 'Minden nap egy új kérdés. Ez tart életben.'], faith: ['Valaki figyel. Nem vagyok egyedül.', 'Ha a hang nem szól, akkor is itt van.'], power: ['Aki dönt, az él igazán.', 'A többiek várják, hogy mondjam, merre.'], craft: ['A kezem tudja, amit a fejem még nem.', 'Amit csinálok, az megmarad utánam.'], freedom: ['Senki ne mondja meg, hová menjek.', 'A dombokon túl is van világ.'], love: ['Amíg ő itt van, minden elviselhető.', 'Csak őt látom, ha becsukom a szemem.'], survival: ['Ma is túléltem. Holnap újra kell.', 'Étel, víz, tűz. A többi ráér.'], legacy: ['Nem sok időm van. Át kell adnom, amit tudok.', 'Ne haljon meg velem az, amit megtanultam.'] };
  const QUESTIONS = ['Miért vagyunk itt?', 'Mi van a halál után?', 'Ki figyel minket — és őt ki figyeli?', 'Van-e szabad akaratunk, vagy csak azt tesszük, amit a hang akar?', 'Mi van a világ szélén túl?', 'Ha egyszer mi is világot teremtünk, mi leszünk nekik?'];

  const Mind = {
    PURPOSE,
    fresh() { return { purpose: null, journal: [], existential: 0, mortality: 0, selfImage: 0, asked: [], voice: null, voiceTick: -1, lastPurposeTick: -1e9 }; },
    label(p) { return PURPOSE[p] || '—'; },
    /** Naponta (a többi napi biológiával együtt). */
    daily(world, a) {
      const m = a.mind || (a.mind = this.fresh()); const rng = world.rng; const st = LW.Agents.stage(world, a); if (st === 'infant' || st === 'child') return;
      const P = a.personality, E = a.emotions, N = a.needs; const age = LW.Agents.age(world, a); const lon = a.genes.physiology.longevity;
      // halandóság-érzet: kor, betegség, közeli halálok
      const recentDeaths = a.memory.episodic.slice(-20).filter((x) => x.type === 'death' && world.tick - x.tick < T.TICKS_PER_DAY * 120).length;
      m.mortality = b01(Math.max(0, (age - lon * 0.55) / (lon * 0.45)) * 0.8 + (a.ill > 0 ? 0.25 : 0) + (a.health < 0.4 ? 0.25 : 0) + recentDeaths * 0.12);
      // én-kép: amit mások gondolnak róla (barátság, tisztelet, neheztelés)
      if ((world.tick + a.id) % (T.TICKS_PER_DAY * 5) < T.TICKS_PER_DAY) { let s = 0, n = 0; for (const o of world.agentsNear(a.x, a.y, 12, a.id)) { const r = o.relationships.get(a.id); if (!r) continue; s += r.friendship + (r.respect || 0) - r.resentment; n++; } m.selfImage = n ? LW.clamp(s / n, -1, 1) : m.selfImage * 0.9; }
      // létkérdések: kétely, gyász, a szimulációs hipotézis szül; a hit és a cél csillapít
      const sk = LW.Civilization ? LW.Civilization.skepticism(world, a) : 0;
      m.existential = b01(m.existential + 0.004 * sk + 0.02 * (E.grief > 0.4 ? 1 : 0) + 0.01 * (a.beliefs.simulation || 0) + 0.006 * m.mortality - 0.004 * a.beliefs.creator - (m.purpose ? 0.003 : 0) - 0.002);
      // mi hajtja: időnként újragondolja
      if (world.tick - m.lastPurposeTick > T.TICKS_PER_DAY * 30 || !m.purpose) {
        const leader = a.occupation === 'leader'; const sc = {
          family: (a.children.length ? 1 + a.children.length * 0.25 : 0) + (a.partner != null ? 0.3 : 0) + P.empathy * 0.4 + P.loyalty * 0.3,
          knowledge: P.curiosity * 1.1 + a.knowledge.techs.size / 40 + (a.skills.medicine || 0) * 0.3,
          faith: a.beliefs.creator * 1.2 + (a.beliefs.trust > 0.2 ? 0.3 : 0),
          power: P.dominance * 1.1 + P.ambition * 0.6 + (leader ? 0.8 : 0),
          craft: (a.skills.crafting || 0) * 0.8 + (a.skills.building || 0) * 0.5 + P.creativity * 0.6,
          freedom: P.riskTolerance * 0.7 + (1 - P.loyalty) * 0.5 + (a.home == null ? 0.3 : 0) + P.curiosity * 0.3,
          love: (a.partner != null ? 0.5 : 0) + E.love * 0.9 + (N.affection < 0.4 ? 0.3 : 0),
          survival: (N.food < 0.4 ? 0.6 : 0) + (N.warmth < 0.4 ? 0.5 : 0) + (a.health < 0.5 ? 0.5 : 0) + 0.25,
          legacy: m.mortality * 1.6 + (a.knowledge.techs.size > 8 ? 0.3 : 0),
        };
        let best = null, bs = -1; for (const k in sc) { const v = sc[k] + rng.f() * 0.15; if (v > bs) { bs = v; best = k; } }
        if (best !== m.purpose) { const first = !m.purpose; m.purpose = best; m.lastPurposeTick = world.tick; this.say(world, a, first ? `Most már tudom, mi hajt: ${PURPOSE[best]}.` : `Megváltoztam. Ami most számít: ${PURPOSE[best]}.`); if (best === 'legacy') a.mind.legacy = true; }
        else m.lastPurposeTick = world.tick;
      }
      // kérdések, amelyekre nincs válasz
      if (m.existential > 0.35 && rng.chance(0.04)) { const q = QUESTIONS.filter((x) => !m.asked.includes(x)); if (q.length) { const pick = q[0 + Math.min(q.length - 1, Math.floor(m.existential * q.length))]; m.asked.push(pick); this.say(world, a, pick); if (!world.firsts['question'] && LW.Agents.isAdult(world, a)) world.events.emit('ExistentialQuestion', { tick: world.tick, agentId: a.id, text: pick, tile: world.idx(a.x | 0, a.y | 0) }); } }
      // belső hang: a nap egy mondata
      if (rng.chance(0.35)) this.say(world, a, this.reflect(world, a));
      // álom
      if (rng.chance(0.12) && a.memory.emotional.length) { const mm = rng.pick(a.memory.emotional); this.say(world, a, `Álmodtam: ${mm.text}. Felébredtem, és még mindig ott volt.`); if (mm.emotion === 'fear' || mm.emotion === 'grief') E[mm.emotion] = b01(E[mm.emotion] + 0.1); else E.joy = b01(E.joy + 0.05); }
    },
    say(world, a, text) { const m = a.mind; if (!text) return; m.journal.push({ t: world.tick, text }); if (m.journal.length > 24) m.journal.splice(0, m.journal.length - 24); m.voice = text; m.voiceTick = world.tick; },
    /** Egy őszinte mondat a mai napról — a legerősebb jelből. */
    reflect(world, a) {
      const rng = world.rng; const m = a.mind; const E = a.emotions, N = a.needs, P = a.personality; const pick = (arr) => rng.pick(arr);
      const name = (id) => { const o = world.agents.get(id) || world.deceased.get(id); return o ? o.name : 'valaki'; };
      if (a.ill > 0) return pick(['Beteg vagyok. Nem tudom, ez az a fajta, amiből nem jönnek vissza.', 'Lázas a testem. Aludni akarok, és félek elaludni.']);
      if (E.grief > 0.5) { const d = a.memory.episodic.slice().reverse().find((x) => x.type === 'death'); return d ? `${d.text}. Nem tudom, hová tegyem.` : 'Elment. Mégis keresem.'; }
      if (N.food < 0.2) return pick(['Ma is éhes voltam. Ez a világ nem ad ingyen.', 'A gyomrom parancsol, nem én.']);
      if (m.mortality > 0.6) return pick(['Érzem, hogy fogy az idő. Mit hagyok itt?', 'Aki utánam jön, ne kelljen elölről kezdenie.', 'Régen nem féltem a téltől. Most számolom.']);
      if (a.beliefs.simulation > 0.6) return pick(['Ha ők ott a Világmagban azt hiszik, valódiak — mi mitől lennénk mások?', 'Valaki nézi ezt. Talán most is.', 'Nem baj, ha teremtettek vagyunk. A kenyér attól még kenyér.']);
      if (m.existential > 0.5 && (LW.Civilization ? LW.Civilization.skepticism(world, a) : 0) > 0.3) return pick(['A hang a fejemben talán csak a fejem. A tudomány nem talált teremtőt.', 'Minden megmagyarázható. Ez megnyugtat és rémít.']);
      if (a.beliefs.creator > 0.7 && (a.beliefs.trust || 0) > 0.3) return pick(['A hang jó hozzánk. Ezt nem felejtem el.', 'Ma is szólt valakihez. Nem vagyunk egyedül.']);
      if (a.beliefs.creator > 0.5 && (a.beliefs.trust || 0) < -0.3) return pick(['Aki az égben van, nem szeret minket. Csak néz.', 'Ha ő figyel, én nem nézek vissza.']);
      if (E.pride > 0.5) { const d = a.memory.episodic.slice().reverse().find((x) => x.type === 'discovery' || x.type === 'craft'); return d ? `${d.text}. Ma valakivé lettem.` : 'Csináltam valamit, ami jó, és az enyém.'; }
      if (E.love > 0.6 && a.partner != null) return `${name(a.partner)}. Ha rá gondolok, kiegyenesedik a hátam.`;
      if (E.jealousy > 0.5) return 'Láttam őket. Nem tudom nem látni.';
      if (E.loneliness > 0.5) return pick(['Senki nem kérdezte ma, hogy vagyok.', 'A tűz mellett is egyedül.']);
      if (m.selfImage < -0.3) return pick(['Nem szeretnek. Érzem, ahogy elfordulnak.', 'Valamit rosszul csinálok. Nem tudom, mit.']);
      if (m.selfImage > 0.4) return pick(['Számítanak rám. Ez súly, de jó súly.', 'Ma valaki megköszönte. Ritka.']);
      if (m.purpose && PURPOSE_LINE[m.purpose]) return pick(PURPOSE_LINE[m.purpose]);
      const last = a.memory.episodic[a.memory.episodic.length - 1]; return last ? `Ma: ${last.text}.` : 'Semmi különös. Élek.';
    },
    /** Rövid önjellemzés a párbeszédhez és a felületnek. */
    describe(world, a) {
      const m = a.mind || this.fresh(); const out = [];
      if (m.purpose) out.push(`Ami hajtja: ${PURPOSE[m.purpose]}.`);
      out.push(m.mortality > 0.6 ? 'Tudja, hogy fogy az ideje.' : m.mortality > 0.3 ? 'Néha eszébe jut a halál.' : 'A halál még messze van neki.');
      out.push(m.selfImage > 0.3 ? 'Úgy érzi, kedvelik.' : m.selfImage < -0.3 ? 'Úgy érzi, nem kedvelik.' : 'Nem tudja, mit gondolnak róla.');
      if (m.existential > 0.5) out.push('Kérdések gyötrik, amelyekre nincs válasz.');
      if (a.beliefs.simulation > 0.6) out.push('Elfogadta: ő maga is egy teremtett világban él.'); else if (a.beliefs.simulation > 0 && a.beliefs.simulation < 0.3) out.push('Tagadja, hogy a világa szimuláció lenne.');
      return out;
    },
  };
  LW.Mind = Mind;
})(globalThis.LW || (globalThis.LW = {}));
