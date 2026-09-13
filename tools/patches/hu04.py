PATCHES = [
('src/god/god.js', [
("""    rain:       { label: 'Rain', icon: '☂', desc: 'Rain over an area for 6 hours', target: 'tile' },
    storm:      { label: 'Storm', icon: '⚡', desc: 'A violent storm with lightning', target: 'tile' },
    snow:       { label: 'Cold snap', icon: '❄', desc: 'A cold front: snow for a day', target: 'world' },
    clear:      { label: 'Clear sky', icon: '☼', desc: 'Clear the weather for 12 hours', target: 'world' },
    lightning:  { label: 'Lightning', icon: '↯', desc: 'Strike a tile', target: 'tile' },
    fire:       { label: 'Fire', icon: '🔥', desc: 'Set a tile ablaze', target: 'tile' },
    forest:     { label: 'Forest', icon: '🌲', desc: 'Grow a forest', target: 'tile' },
    food:       { label: 'Food', icon: '🍒', desc: 'Make the land bloom with food', target: 'tile' },
    animals:    { label: 'Animals', icon: '🦌', desc: 'Bring game animals', target: 'tile' },
    resource:   { label: 'Resource', icon: '⛏', desc: 'Reveal or create a deposit', target: 'tile' },
    disease:    { label: 'Disease', icon: '☠', desc: 'Sicken those nearby', target: 'tile' },
    healing:    { label: 'Healing', icon: '✚', desc: 'Heal those nearby', target: 'tile' },
    fertility:  { label: 'Fertility', icon: '❀', desc: 'Bless the land and the people', target: 'tile' },
    earthquake: { label: 'Earthquake', icon: '⌇', desc: 'Shake the ground; buildings fall', target: 'tile' },
    meteor:     { label: 'Meteor', icon: '☄', desc: 'A stone from the sky', target: 'tile' },
    spawn:      { label: 'Create life', icon: '✦', desc: 'A new person appears', target: 'tile' },
    kill:       { label: 'Take life', icon: '✝', desc: 'End a life', target: 'agent' },
    create:     { label: 'Create object', icon: '▣', desc: 'Place wood, stone and food', target: 'tile' },
    destroy:    { label: 'Destroy', icon: '✖', desc: 'Destroy a building', target: 'tile' },
    light:      { label: 'Pillar of light', icon: '✧', desc: 'Manifest as light', target: 'tile', manifest: true },
    orb:        { label: 'Orb', icon: '◉', desc: 'Manifest as a floating orb', target: 'tile', manifest: true },
    monolith:   { label: 'Monolith', icon: '▮', desc: 'Leave a monolith', target: 'tile', manifest: true },
    avatar:     { label: 'Avatar', icon: '☥', desc: 'Walk among them', target: 'tile', manifest: true },
  };
  const COMMANDS = { go: 'GO HERE', build: 'BUILD', follow: 'FOLLOW', protect: 'PROTECT', explore: 'EXPLORE', leave: 'LEAVE', search: 'SEARCH' };""",
 """    rain:       { label: 'Eső', icon: '☂', desc: 'Eső egy területen 6 órán át', target: 'tile' },
    storm:      { label: 'Vihar', icon: '⚡', desc: 'Heves vihar villámokkal', target: 'tile' },
    snow:       { label: 'Hideg', icon: '❄', desc: 'Hidegfront: egy napig havazik', target: 'world' },
    clear:      { label: 'Derült ég', icon: '☼', desc: 'Kitisztul az ég 12 órára', target: 'world' },
    lightning:  { label: 'Villám', icon: '↯', desc: 'Lecsap egy mezőre', target: 'tile' },
    fire:       { label: 'Tűz', icon: '🔥', desc: 'Lángra lobbant egy mezőt', target: 'tile' },
    forest:     { label: 'Erdő', icon: '🌲', desc: 'Erdőt növeszt', target: 'tile' },
    food:       { label: 'Étel', icon: '🍒', desc: 'Kivirágoztatja a földet', target: 'tile' },
    animals:    { label: 'Vadak', icon: '🦌', desc: 'Vadakat hoz a vidékre', target: 'tile' },
    resource:   { label: 'Lelőhely', icon: '⛏', desc: 'Felfed vagy teremt egy lelőhelyet', target: 'tile' },
    disease:    { label: 'Járvány', icon: '☠', desc: 'Megbetegíti a közelben lévőket', target: 'tile' },
    healing:    { label: 'Gyógyítás', icon: '✚', desc: 'Meggyógyítja a közelben lévőket', target: 'tile' },
    fertility:  { label: 'Termékenység', icon: '❀', desc: 'Megáldja a földet és az embereket', target: 'tile' },
    earthquake: { label: 'Földrengés', icon: '⌇', desc: 'Megrázza a földet; épületek dőlnek', target: 'tile' },
    meteor:     { label: 'Meteor', icon: '☄', desc: 'Kő az égből', target: 'tile' },
    spawn:      { label: 'Élet', icon: '✦', desc: 'Új ember jelenik meg', target: 'tile' },
    kill:       { label: 'Halál', icon: '✝', desc: 'Egy élet vége', target: 'agent' },
    create:     { label: 'Ajándék', icon: '▣', desc: 'Fát, követ és ételt helyez le', target: 'tile' },
    destroy:    { label: 'Rombolás', icon: '✖', desc: 'Lerombol egy épületet', target: 'tile' },
    light:      { label: 'Fényoszlop', icon: '✧', desc: 'Fényként jelensz meg', target: 'tile', manifest: true },
    orb:        { label: 'Gömb', icon: '◉', desc: 'Lebegő gömbként jelensz meg', target: 'tile', manifest: true },
    monolith:   { label: 'Monolit', icon: '▮', desc: 'Monolitot hagysz hátra', target: 'tile', manifest: true },
    avatar:     { label: 'Megtestesülés', icon: '☥', desc: 'Közöttük jársz', target: 'tile', manifest: true },
  };
  const COMMANDS = { go: 'MENJ IDE', build: 'ÉPÍTS', follow: 'KÖVESD', protect: 'VÉDD', explore: 'FEDEZD FEL', leave: 'HAGYD EL', search: 'KUTASS' };"""),
("""        case 'rain': world.weather.setOverride('rain', 0.8, 6, x, y, 12); text = 'You brought rain.'; awe = 0.4; break;
        case 'storm': world.weather.setOverride('storm', 1, 4); text = 'You summoned a storm.'; awe = 0.5; fear = 0.5; break;
        case 'snow': world.weather.setOverride('rain', 0.7, 24); world.weather.tempOffset = -14; text = 'You sent a cold front.'; awe = 0.3; fear = 0.4; break;
        case 'clear': world.weather.setOverride('clear', 0, 12); text = 'You cleared the sky.'; awe = 0.3; break;""",
 """        case 'rain': world.weather.setOverride('rain', 0.8, 6, x, y, 12); text = 'Esőt hoztál.'; awe = 0.4; break;
        case 'storm': world.weather.setOverride('storm', 1, 4); text = 'Vihart idéztél.'; awe = 0.5; fear = 0.5; break;
        case 'snow': world.weather.setOverride('rain', 0.7, 24); world.weather.tempOffset = -14; text = 'Hidegfrontot küldtél.'; awe = 0.3; fear = 0.4; break;
        case 'clear': world.weather.setOverride('clear', 0, 12); text = 'Kitisztítottad az eget.'; awe = 0.3; break;"""),
("""A().damage(world, a, 0.95, 'lightning from a clear sky'); } text = 'You struck the ground with lightning.'; awe = 0.6; fear = 0.7; break;""",
 """A().damage(world, a, 0.95, 'villám a derült égből'); } text = 'Villámmal sújtottad a földet.'; awe = 0.6; fear = 0.7; break;"""),
("""text = 'You set the land on fire.'; awe = 0.4; fear = 0.6; break;""", """text = 'Lángra lobbantottad a földet.'; awe = 0.4; fear = 0.6; break;"""),
("""text = 'You raised a forest.'; awe = 0.6; break;""", """text = 'Erdőt támasztottál.'; awe = 0.6; break;"""),
("""text = 'You made the land bloom.'; awe = 0.5; break;""", """text = 'Kivirágoztattad a földet.'; awe = 0.5; break;"""),
("""text = 'You brought animals to the land.'; awe = 0.4; break;""", """text = 'Vadakat hoztál a vidékre.'; awe = 0.4; break;"""),
("""text = `You laid ${LW.DEPOSIT_NAME[type]} into the earth.`; } else text = `You revealed ${revealed} hidden deposits.`; awe = 0.3; break; }""",
 """text = `${LW.HU.depositItemByName(LW.DEPOSIT_NAME[type])} rejtettél a földbe.`; text = text[0].toUpperCase() + text.slice(1); } else text = `${revealed} rejtett lelőhelyet fedtél fel.`; awe = 0.3; break; }"""),
("""A().memory(world, a, { type: 'divine', text: 'a sickness fell upon us from nowhere', importance: 0.9, emotion: 'fear', intensity: 0.9, divine: true }); } text = 'You sent a plague.'; awe = 0.2; fear = 0.9; break;""",
 """A().memory(world, a, { type: 'divine', text: 'a semmiből szakadt ránk a kór', importance: 0.9, emotion: 'fear', intensity: 0.9, divine: true }); } text = 'Járványt küldtél.'; awe = 0.2; fear = 0.9; break;"""),
("""A().memory(world, a, { type: 'divine', text: 'was healed by an unseen hand', importance: 0.95, emotion: 'joy', intensity: 0.95, divine: true }); } text = 'You healed them.'; awe = 0.9; break;""",
 """A().memory(world, a, { type: 'divine', text: 'láthatatlan kéz gyógyított meg', importance: 0.95, emotion: 'joy', intensity: 0.95, divine: true }); } text = 'Meggyógyítottad őket.'; awe = 0.9; break;"""),
("""text = 'You blessed the land and the people.'; awe = 0.5; break;""", """text = 'Megáldottad a földet és az embereket.'; awe = 0.5; break;"""),
("""for (const b of world.buildingsNear(x, y, 8)) LW.Buildings.damage(world, b, world.rng.range(0.3, 0.9), 'earthquake'); for (const a of world.agentsNear(x + 0.5, y + 0.5, 14)) { affected.push(a); a.emotions.fear = 1; if (world.rng.chance(0.15)) A().damage(world, a, 0.25, 'the earthquake'); } text = 'You shook the earth.'; awe = 0.3; fear = 0.9; radius = 16; break;""",
 """for (const b of world.buildingsNear(x, y, 8)) LW.Buildings.damage(world, b, world.rng.range(0.3, 0.9), 'földrengés'); for (const a of world.agentsNear(x + 0.5, y + 0.5, 14)) { affected.push(a); a.emotions.fear = 1; if (world.rng.chance(0.15)) A().damage(world, a, 0.25, 'a földrengés'); } text = 'Megráztad a földet.'; awe = 0.3; fear = 0.9; radius = 16; break;"""),
("""const b = world.buildingAt(j); if (b) LW.Buildings.destroy(world, b, 'a falling star'); }); each(4, (j) => { if (!t.burnt[j]) LW.Ecology.ignite(world, j, 'creator'); }); for (const a of world.agentsNear(x + 0.5, y + 0.5, 2.5)) { affected.push(a); A().damage(world, a, 1, 'a falling star'); } text = 'You cast down a stone from the sky.'; awe = 0.8; fear = 0.9; radius = 20; break;""",
 """const b = world.buildingAt(j); if (b) LW.Buildings.destroy(world, b, 'lezuhanó csillag'); }); each(4, (j) => { if (!t.burnt[j]) LW.Ecology.ignite(world, j, 'creator'); }); for (const a of world.agentsNear(x + 0.5, y + 0.5, 2.5)) { affected.push(a); A().damage(world, a, 1, 'lezuhanó csillag'); } text = 'Követ vetettél le az égből.'; awe = 0.8; fear = 0.9; radius = 20; break;"""),
("""a.achievements.push('Made by the Creator'); a.beliefs.creator = 0.8; a.inv.berries = 3; A().memory(world, a, { type: 'divine', text: 'came into being; I remember nothing before', importance: 1, emotion: 'excitement', intensity: 0.8, divine: true }); world.events.emit('AgentBorn', { tick: world.tick, agentId: a.id, genesis: true, tile: ti, creator: true }); text = `You created ${a.name}.`; awe = 0.9; break; }""",
 """a.achievements.push('A Teremtő alkotta'); a.beliefs.creator = 0.8; a.inv.berries = 3; A().memory(world, a, { type: 'divine', text: 'létrejöttem; semmire nem emlékszem azelőttről', importance: 1, emotion: 'excitement', intensity: 0.8, divine: true }); world.events.emit('AgentBorn', { tick: world.tick, agentId: a.id, genesis: true, tile: ti, creator: true }); text = `Megteremtetted őt: ${a.name}.`; awe = 0.9; break; }"""),
("""case 'kill': { const a = world.agents.get(p.agentId); if (!a) return null; text = `You ended the life of ${a.name}.`; A().die(world, a, 'the will of the Creator'); awe = 0.2; fear = 0.9; break; }""",
 """case 'kill': { const a = world.agents.get(p.agentId); if (!a) return null; text = `Véget vetettél ${a.name} életének.`; A().die(world, a, 'a Teremtő akarata'); awe = 0.2; fear = 0.9; break; }"""),
("""world.ground.set(i, g); text = 'You placed gifts on the ground.'; awe = 0.5; break; }""", """world.ground.set(i, g); text = 'Ajándékokat helyeztél a földre.'; awe = 0.5; break; }"""),
("""text = `You destroyed a ${LW.Buildings.def(b).label.toLowerCase()}.`; LW.Buildings.destroy(world, b, 'the will of the Creator'); awe = 0.2; fear = 0.8; break; }""",
 """text = `Leromboltál egy épületet: ${LW.Buildings.def(b).label.toLowerCase()}.`; LW.Buildings.destroy(world, b, 'a Teremtő akarata'); awe = 0.2; fear = 0.8; break; }"""),
("""default: if (K.manifest && i >= 0) { const b = LW.Buildings.create(world, kind, x, y, null); text = `You appeared as ${K.label.toLowerCase()}.`; awe = 0.9; fear = 0.3; }""",
 """default: if (K.manifest && i >= 0) { const b = LW.Buildings.create(world, kind, x, y, null); text = `Megjelentél: ${K.label.toLowerCase()}.`; awe = 0.9; fear = 0.3; }"""),
("""      const K = KINDS[kind]; const texts = { rain: 'rain fell from a clear sky', storm: 'a storm came out of nothing', snow: 'the cold came in an instant', clear: 'the clouds vanished at once', lightning: 'lightning struck from a clear sky', fire: 'fire sprang from the ground', forest: 'a forest rose in a moment', food: 'the land bloomed before my eyes', animals: 'animals appeared from nowhere', resource: 'the earth showed its hidden stones', disease: 'a sickness came from nowhere', healing: 'the sick were made whole', fertility: 'a warmth passed over the land', earthquake: 'the ground shook', meteor: 'a star fell from the sky', spawn: 'a stranger appeared out of the air', kill: 'someone was struck down by nothing', create: 'gifts appeared on the ground', destroy: 'a home fell apart by itself' };
      const text = K.manifest ? `saw ${K.label.toLowerCase()} — something not of this world` : (texts[kind] || 'saw something impossible');""",
 """      const K = KINDS[kind]; const texts = { rain: 'derült égből esett az eső', storm: 'a semmiből jött a vihar', snow: 'egy pillanat alatt jött a hideg', clear: 'egyszerre tűntek el a felhők', lightning: 'derült égből csapott le a villám', fire: 'tűz szökött ki a földből', forest: 'egy pillanat alatt nőtt erdő', food: 'a szemem láttára virágzott ki a föld', animals: 'a semmiből jöttek a vadak', resource: 'a föld megmutatta rejtett köveit', disease: 'a semmiből jött a kór', healing: 'a betegek meggyógyultak', fertility: 'melegség járta át a földet', earthquake: 'megrázkódott a föld', meteor: 'csillag hullott az égből', spawn: 'idegen lépett elő a levegőből', kill: 'valakit lesújtott a semmi', create: 'ajándékok jelentek meg a földön', destroy: 'egy otthon magától omlott össze' };
      const text = K.manifest ? `láttam: ${K.label.toLowerCase()} — valami nem e világból való` : (texts[kind] || 'valami lehetetlent láttam');"""),
("""      a.importance += 0.2; if (!a.achievements.includes('Witness of the Creator')) a.achievements.push('Witness of the Creator');
    },
    witnessManifestation(world, a, b) {
      A().memory(world, a, { type: 'divine', text: `saw the ${LW.Buildings.def(b).label.toLowerCase()}`, importance: 0.85, emotion: 'excitement', intensity: 0.8, divine: true, buildingId: b.id });
      a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.2 * (0.5 + a.personality.curiosity)); a.emotions.excitement = LW.clamp01(a.emotions.excitement + 0.5); a.emotions.fear = LW.clamp01(a.emotions.fear + 0.15);
      if (!a.achievements.includes('Witness of the Creator')) a.achievements.push('Witness of the Creator');""",
 """      a.importance += 0.2; if (!a.achievements.includes('A Teremtő tanúja')) a.achievements.push('A Teremtő tanúja');
    },
    witnessManifestation(world, a, b) {
      A().memory(world, a, { type: 'divine', text: `láttam: ${LW.Buildings.def(b).label.toLowerCase()}`, importance: 0.85, emotion: 'excitement', intensity: 0.8, divine: true, buildingId: b.id });
      a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.2 * (0.5 + a.personality.curiosity)); a.emotions.excitement = LW.clamp01(a.emotions.excitement + 0.5); a.emotions.fear = LW.clamp01(a.emotions.fear + 0.15);
      if (!a.achievements.includes('A Teremtő tanúja')) a.achievements.push('A Teremtő tanúja');"""),
("""      world.events.emit('DivineCommandIssued', { tick: world.tick, agentId: a.id, text: `You ${force ? 'compelled' : 'asked'} ${a.name}: ${label}.`, tile });
      if (!force) { A().memory(world, a, { type: 'divine', text: `a voice with no mouth said: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.6, divine: true });""",
 """      world.events.emit('DivineCommandIssued', { tick: world.tick, agentId: a.id, text: `${force ? 'Kényszerítetted' : 'Kérted'} őt: ${a.name} — ${label}.`, tile });
      if (!force) { A().memory(world, a, { type: 'divine', text: `egy száj nélküli hang szólt: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.6, divine: true });"""),
("""      else A().memory(world, a, { type: 'divine', text: `my body moved by a will not my own: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.7, divine: true });""",
 """      else A().memory(world, a, { type: 'divine', text: `a testem idegen akaratra mozdult: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.7, divine: true });"""),
("""      if (roll < ob * 0.75) { how = 'obey'; text = `${a.name} felt a strange urge (${label}) and obeyed.`; }
      else if (roll < ob * 0.75 + 0.15) { how = 'misinterpret'; if (r.tile != null) r.tile = world.randomNear(world.xOf(r.tile), world.yOf(r.tile), 9); else r.cmd = 'explore'; text = `${a.name} felt a strange urge but understood it differently.`; }
      else if (a.emotions.fear > 0.5 || a.personality.bravery < 0.3) { how = 'fear'; text = `${a.name} was terrified by the voice and hid.`; a.divineRequest = null; a.emotions.fear = 1; a.needs.safety = 0; }
      else { how = 'ignore'; text = `${a.name} shrugged off a strange urge (${label}).`; a.divineRequest = null; }
      if (a.divineRequest) a.divineRequest.interpreted = how;
      A().memory(world, a, { type: 'divine', text: how === 'obey' ? 'obeyed the voice' : how === 'ignore' ? 'ignored the voice' : how === 'fear' ? 'hid from the voice' : 'did what I thought the voice wanted', importance: 0.7, emotion: how === 'fear' ? 'fear' : 'excitement', intensity: 0.6, divine: true });""",
 """      if (roll < ob * 0.75) { how = 'obey'; text = `${a.name} furcsa késztetést érzett (${label}), és engedelmeskedett.`; }
      else if (roll < ob * 0.75 + 0.15) { how = 'misinterpret'; if (r.tile != null) r.tile = world.randomNear(world.xOf(r.tile), world.yOf(r.tile), 9); else r.cmd = 'explore'; text = `${a.name} furcsa késztetést érzett, de másképp értette.`; }
      else if (a.emotions.fear > 0.5 || a.personality.bravery < 0.3) { how = 'fear'; text = `${a.name} megrémült a hangtól, és elbújt.`; a.divineRequest = null; a.emotions.fear = 1; a.needs.safety = 0; }
      else { how = 'ignore'; text = `${a.name} lerázta a furcsa késztetést (${label}).`; a.divineRequest = null; }
      if (a.divineRequest) a.divineRequest.interpreted = how;
      A().memory(world, a, { type: 'divine', text: how === 'obey' ? 'engedelmeskedtem a hangnak' : how === 'ignore' ? 'nem törődtem a hanggal' : how === 'fear' ? 'elbújtam a hang elől' : 'azt tettem, amit a hang szerintem akart', importance: 0.7, emotion: how === 'fear' ? 'fear' : 'excitement', intensity: 0.6, divine: true });"""),
("""  LW.Actions.OPS.divineDone = function (world, a) { if (a.divineRequest) { A().memory(world, a, { type: 'divine', text: 'did what the voice asked', importance: 0.6, emotion: 'pride', intensity: 0.5, divine: true });""",
 """  LW.Actions.OPS.divineDone = function (world, a) { if (a.divineRequest) { A().memory(world, a, { type: 'divine', text: 'megtettem, amit a hang kért', importance: 0.6, emotion: 'pride', intensity: 0.5, divine: true });"""),
]),
]
