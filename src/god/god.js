/* LEVENTE — THE CREATOR · god/god.js
 * Interventions are physical effects the ecosystem and the people react to; witnesses
 * keep divine memories that spread as rumor and may become belief. (spec §64–§69)
 */
(function (LW) {
  'use strict';
  const A = () => LW.Agents, T = LW.TIME;

  const KINDS = {
    rain:       { label: 'Eső', icon: '☂', desc: 'Eső egy területen 6 órán át', target: 'tile' },
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
  const COMMANDS = { go: 'MENJ IDE', build: 'ÉPÍTS', follow: 'KÖVESD', protect: 'VÉDD', explore: 'FEDEZD FEL', leave: 'HAGYD EL', search: 'KUTASS' };

  const God = {
    KINDS, COMMANDS,
    intervene(world, kind, p) {
      const K = KINDS[kind]; if (!K) return null; const t = world.tiles; const x = p.x | 0, y = p.y | 0; const i = world.inBounds(x, y) ? world.idx(x, y) : -1;
      let text = '', awe = 0.3, fear = 0, radius = 10; const affected = [];
      const each = (r, fn) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (!world.inBounds(nx, ny) || dx * dx + dy * dy > r * r) continue; fn(world.idx(nx, ny), nx, ny); } };
      switch (kind) {
        case 'rain': world.weather.setOverride('rain', 0.8, 6, x, y, 12); text = 'Esőt hoztál.'; awe = 0.4; break;
        case 'storm': world.weather.setOverride('storm', 1, 4); text = 'Vihart idéztél.'; awe = 0.5; fear = 0.5; break;
        case 'snow': world.weather.setOverride('rain', 0.7, 24); world.weather.tempOffset = -14; text = 'Hidegfrontot küldtél.'; awe = 0.3; fear = 0.4; break;
        case 'clear': world.weather.setOverride('clear', 0, 12); text = 'Kitisztítottad az eget.'; awe = 0.3; break;
        case 'lightning': if (i < 0) return null; world.weather.lastLightning = world.tick; world.weather.lightningTile = i; LW.Ecology.ignite(world, i, 'creator') || (t.veg[i] = Math.max(t.veg[i], 20), LW.Ecology.ignite(world, i, 'creator')); for (const a of world.agentsNear(x + 0.5, y + 0.5, 1.2)) { affected.push(a); A().damage(world, a, 0.95, 'villám a derült égből'); } text = 'Villámmal sújtottad a földet.'; awe = 0.6; fear = 0.7; break;
        case 'fire': if (i < 0) return null; if (!LW.Ecology.ignite(world, i, 'creator')) { t.veg[i] = Math.max(t.veg[i], 30); LW.Ecology.ignite(world, i, 'creator'); } text = 'Lángra lobbantottad a földet.'; awe = 0.4; fear = 0.6; break;
        case 'forest': each(3, (j) => { if (world.isWater(j) || t.biome[j] === LW.BIOME.PEAK) return; t.treeCap[j] = Math.max(t.treeCap[j], 180); t.trees[j] = Math.min(255, t.trees[j] + 150); t.vegCap[j] = Math.max(t.vegCap[j], 100); t.veg[j] = Math.min(255, t.veg[j] + 40); if (t.biome[j] === LW.BIOME.GRASSLAND || t.biome[j] === LW.BIOME.SAVANNA) t.biome[j] = LW.BIOME.FOREST; world.dirtyTiles.add(j); }); text = 'Erdőt támasztottál.'; awe = 0.6; break;
        case 'food': each(3, (j) => { if (world.isWater(j)) return; t.vegCap[j] = Math.max(t.vegCap[j], 120); t.veg[j] = Math.min(255, t.veg[j] + 140); world.dirtyTiles.add(j); }); text = 'Kivirágoztattad a földet.'; awe = 0.5; break;
        case 'animals': each(4, (j) => { if (world.isWater(j)) return; t.animalCap[j] = Math.max(t.animalCap[j], 120); t.animals[j] = Math.min(255, t.animals[j] + 120); }); text = 'Vadakat hoztál a vidékre.'; awe = 0.4; break;
        case 'resource': { let revealed = 0; each(6, (j) => { if (t.depType[j] && t.depKnown[j] === 0) { t.depKnown[j] = 1; revealed++; world.dirtyTiles.add(j); } }); if (!revealed && i >= 0 && !world.isWater(i)) { const type = p.deposit || world.rng.pick([LW.DEPOSIT.COPPER, LW.DEPOSIT.IRON, LW.DEPOSIT.FLINT, LW.DEPOSIT.CLAY, LW.DEPOSIT.GOLD]); each(1, (j) => { if (!world.isWater(j)) { t.depType[j] = type; t.depAmt[j] = 150; t.depKnown[j] = 1; world.dirtyTiles.add(j); } }); text = `${LW.HU.depositItemByName(LW.DEPOSIT_NAME[type])} rejtettél a földbe.`; text = text[0].toUpperCase() + text.slice(1); } else text = `${revealed} rejtett lelőhelyet fedtél fel.`; awe = 0.3; break; }
        case 'disease': for (const a of world.agentsNear(x + 0.5, y + 0.5, 5)) { affected.push(a); a.injury = Math.min(0.9, a.injury + 0.45); a.health = Math.max(0.05, a.health - 0.25); a.emotions.fear = 1; A().memory(world, a, { type: 'divine', text: 'a semmiből szakadt ránk a kór', importance: 0.9, emotion: 'fear', intensity: 0.9, divine: true }); } text = 'Járványt küldtél.'; awe = 0.2; fear = 0.9; break;
        case 'healing': for (const a of world.agentsNear(x + 0.5, y + 0.5, 5)) { affected.push(a); a.injury = 0; a.health = 1; a.needs.food = Math.max(a.needs.food, 0.8); a.needs.water = 1; a.emotions.joy = 1; a.emotions.fear = 0; A().memory(world, a, { type: 'divine', text: 'láthatatlan kéz gyógyított meg', importance: 0.95, emotion: 'joy', intensity: 0.95, divine: true }); } text = 'Meggyógyítottad őket.'; awe = 0.9; break;
        case 'fertility': each(5, (j) => { t.fert[j] = Math.min(255, t.fert[j] + 60); }); for (const a of world.agentsNear(x + 0.5, y + 0.5, 6)) { affected.push(a); a.fertilityBoostUntil = world.tick + T.TICKS_PER_DAY * 30; a.emotions.love = Math.min(1, a.emotions.love + 0.3); } text = 'Megáldottad a földet és az embereket.'; awe = 0.5; break;
        case 'earthquake': for (const b of world.buildingsNear(x, y, 8)) LW.Buildings.damage(world, b, world.rng.range(0.3, 0.9), 'földrengés'); for (const a of world.agentsNear(x + 0.5, y + 0.5, 14)) { affected.push(a); a.emotions.fear = 1; if (world.rng.chance(0.15)) A().damage(world, a, 0.25, 'a földrengés'); } text = 'Megráztad a földet.'; awe = 0.3; fear = 0.9; radius = 16; break;
        case 'meteor': if (i < 0) return null; each(2, (j) => { t.burnt[j] = 200; t.veg[j] = 0; t.trees[j] = 0; if (world.rng.chance(0.5)) { t.depType[j] = world.rng.pick([LW.DEPOSIT.IRON, LW.DEPOSIT.GEMS]); t.depAmt[j] = 120; t.depKnown[j] = 1; } world.dirtyTiles.add(j); const b = world.buildingAt(j); if (b) LW.Buildings.destroy(world, b, 'lezuhanó csillag'); }); each(4, (j) => { if (!t.burnt[j]) LW.Ecology.ignite(world, j, 'creator'); }); for (const a of world.agentsNear(x + 0.5, y + 0.5, 2.5)) { affected.push(a); A().damage(world, a, 1, 'lezuhanó csillag'); } text = 'Követ vetettél le az égből.'; awe = 0.8; fear = 0.9; radius = 20; break;
        case 'spawn': { const ti = i >= 0 && world.isPassable(i) ? i : world.randomNear(x, y, 3); const sex = p.sex || (world.rng.chance(0.5) ? 'f' : 'm'); const a = A().create(world, { name: world.language.person(sex, 0.6), sex, bornTick: world.tick - Math.round(world.rng.range(17, 28) * T.TICKS_PER_YEAR), x: world.xOf(ti) + 0.5, y: world.yOf(ti) + 0.5 }); a.achievements.push('A Teremtő alkotta'); a.beliefs.creator = 0.8; a.inv.berries = 3; A().memory(world, a, { type: 'divine', text: 'létrejöttem; semmire nem emlékszem azelőttről', importance: 1, emotion: 'excitement', intensity: 0.8, divine: true }); world.events.emit('AgentBorn', { tick: world.tick, agentId: a.id, genesis: true, tile: ti, creator: true }); text = `Megteremtetted őt: ${a.name}.`; awe = 0.9; break; }
        case 'kill': { const a = world.agents.get(p.agentId); if (!a) return null; text = `Véget vetettél ${a.name} életének.`; A().die(world, a, 'a Teremtő akarata'); awe = 0.2; fear = 0.9; break; }
        case 'create': { if (i < 0) return null; world.ground = world.ground || new Map(); const g = world.ground.get(i) || {}; const items = p.items || { wood: 6, stone: 4, berries: 6 }; for (const k in items) g[k] = (g[k] || 0) + items[k]; world.ground.set(i, g); text = 'Ajándékokat helyeztél a földre.'; awe = 0.5; break; }
        case 'destroy': { const b = i >= 0 ? world.buildingAt(i) : null; if (!b) return null; text = `Leromboltál egy épületet: ${LW.Buildings.def(b).label.toLowerCase()}.`; LW.Buildings.destroy(world, b, 'a Teremtő akarata'); awe = 0.2; fear = 0.8; break; }
        default: if (K.manifest && i >= 0) { const b = LW.Buildings.create(world, kind, x, y, null); text = `Megjelentél: ${K.label.toLowerCase()}.`; awe = 0.9; fear = 0.3; }
      }
      world.stats.interventions++;
      world.events.emit('CreatorIntervention', { tick: world.tick, kind, text, tile: i >= 0 ? i : undefined });
      // witnesses
      if (i >= 0) for (const a of world.agentsNear(x + 0.5, y + 0.5, radius)) { if (a.sleeping && !affected.includes(a)) continue; this.witness(world, a, kind, awe, fear); }
      else for (const a of world.agents.values()) if (!a.sleeping) this.witness(world, a, kind, awe * 0.7, fear * 0.7);
      return text;
    },
    witness(world, a, kind, awe, fear) {
      const K = KINDS[kind]; const texts = { rain: 'derült égből esett az eső', storm: 'a semmiből jött a vihar', snow: 'egy pillanat alatt jött a hideg', clear: 'egyszerre tűntek el a felhők', lightning: 'derült égből csapott le a villám', fire: 'tűz szökött ki a földből', forest: 'egy pillanat alatt nőtt erdő', food: 'a szemem láttára virágzott ki a föld', animals: 'a semmiből jöttek a vadak', resource: 'a föld megmutatta rejtett köveit', disease: 'a semmiből jött a kór', healing: 'a betegek meggyógyultak', fertility: 'melegség járta át a földet', earthquake: 'megrázkódott a föld', meteor: 'csillag hullott az égből', spawn: 'idegen lépett elő a levegőből', kill: 'valakit lesújtott a semmi', create: 'ajándékok jelentek meg a földön', destroy: 'egy otthon magától omlott össze' };
      const text = K.manifest ? `láttam: ${K.label.toLowerCase()} — valami nem e világból való` : (texts[kind] || 'valami lehetetlent láttam');
      A().memory(world, a, { type: 'divine', text, importance: 0.9, emotion: fear > awe ? 'fear' : 'excitement', intensity: Math.max(awe, fear), divine: true });
      a.emotions.fear = LW.clamp01(a.emotions.fear + fear); a.emotions.excitement = LW.clamp01(a.emotions.excitement + awe);
      a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.25 * (0.4 + a.personality.optimism * 0.4 + a.personality.curiosity * 0.3));
      a.importance += 0.2; if (!a.achievements.includes('A Teremtő tanúja')) a.achievements.push('A Teremtő tanúja');
    },
    witnessManifestation(world, a, b) {
      A().memory(world, a, { type: 'divine', text: `láttam: ${LW.Buildings.def(b).label.toLowerCase()}`, importance: 0.85, emotion: 'excitement', intensity: 0.8, divine: true, buildingId: b.id });
      a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.2 * (0.5 + a.personality.curiosity)); a.emotions.excitement = LW.clamp01(a.emotions.excitement + 0.5); a.emotions.fear = LW.clamp01(a.emotions.fear + 0.15);
      if (!a.achievements.includes('A Teremtő tanúja')) a.achievements.push('A Teremtő tanúja');
    },
    // ---------------- divine commands
    command(world, a, cmd, p) {
      const force = !!p.force; const tile = p.tile ?? null; const targetId = p.targetId ?? null;
      const label = COMMANDS[cmd] || cmd;
      a.divineRequest = { cmd, tile, targetId, force, tick: world.tick, interpreted: force ? 'obey' : null };
      a.plan = null; a.sleeping = false;
      world.events.emit('DivineCommandIssued', { tick: world.tick, agentId: a.id, text: `${force ? 'Kényszerítetted' : 'Kérted'} őt: ${a.name} — ${label}.`, tile });
      if (!force) { A().memory(world, a, { type: 'divine', text: `egy száj nélküli hang szólt: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.6, divine: true }); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.3); a.emotions.fear = LW.clamp01(a.emotions.fear + 0.2); a.emotions.excitement = LW.clamp01(a.emotions.excitement + 0.3); }
      else A().memory(world, a, { type: 'divine', text: `a testem idegen akaratra mozdult: ${label.toLowerCase()}`, importance: 0.9, emotion: 'fear', intensity: 0.7, divine: true });
      a.importance += 0.5; a.lastDecisionTick = -1000;
    },
    obedience(world, a) { const P = a.personality; return LW.clamp01(0.3 + P.loyalty * 0.35 + a.beliefs.creator * 0.45 + a.emotions.fear * 0.2 + P.optimism * 0.15 - P.dominance * 0.3 - P.riskTolerance * 0.1); },
    scoreRequest(world, a) {
      const r = a.divineRequest; if (!r) return [0, []];
      if (world.tick - r.tick > T.TICKS_PER_DAY * 2) { a.divineRequest = null; return [0, []]; }
      if (r.force) return [100, ['a Teremtő kényszeríti']];
      if (!r.interpreted) this.interpret(world, a);
      if (!a.divineRequest) return [0, []];
      const ob = this.obedience(world, a); return [1.2 + ob * 1.5, [`engedelmesség ${LW.pct(ob)}`, `hit ${LW.pct(a.beliefs.creator)}`, `értelmezés: ${{ obey: 'engedelmeskedik', misinterpret: 'félreértette', fear: 'fél', ignore: 'nem törődik vele' }[a.divineRequest.interpreted] || a.divineRequest.interpreted}`]];
    },
    interpret(world, a) {
      const r = a.divineRequest; const ob = this.obedience(world, a); const rng = world.rng; const label = COMMANDS[r.cmd];
      const roll = rng.f(); let how, text;
      if (roll < ob * 0.75) { how = 'obey'; text = `${a.name} furcsa késztetést érzett (${label}), és engedelmeskedett.`; }
      else if (roll < ob * 0.75 + 0.15) { how = 'misinterpret'; if (r.tile != null) r.tile = world.randomNear(world.xOf(r.tile), world.yOf(r.tile), 9); else r.cmd = 'explore'; text = `${a.name} furcsa késztetést érzett, de másképp értette.`; }
      else if (a.emotions.fear > 0.5 || a.personality.bravery < 0.3) { how = 'fear'; text = `${a.name} megrémült a hangtól, és elbújt.`; a.divineRequest = null; a.emotions.fear = 1; a.needs.safety = 0; }
      else { how = 'ignore'; text = `${a.name} lerázta a furcsa késztetést (${label}).`; a.divineRequest = null; }
      if (a.divineRequest) a.divineRequest.interpreted = how;
      A().memory(world, a, { type: 'divine', text: how === 'obey' ? 'engedelmeskedtem a hangnak' : how === 'ignore' ? 'nem törődtem a hanggal' : how === 'fear' ? 'elbújtam a hang elől' : 'azt tettem, amit a hang szerintem akart', importance: 0.7, emotion: how === 'fear' ? 'fear' : 'excitement', intensity: 0.6, divine: true });
      world.events.emit('DivineCommandInterpreted', { tick: world.tick, agentId: a.id, how, text });
    },
    planRequest(world, a) {
      const r = a.divineRequest; if (!r) return null; const W = world;
      const ctx = { world: W };
      const done = { op: 'divineDone' };
      switch (r.cmd) {
        case 'go': return r.tile != null ? { steps: [{ op: 'moveTo', i: r.tile }, done], priority: r.force ? 3 : 2 } : null;
        case 'build': { const kind = a.knowledge.techs.has('hut_construction') ? 'hut' : a.knowledge.techs.has('shelter_building') ? 'lean_to' : a.knowledge.techs.has('fire_making') ? 'campfire' : null; if (!kind) { a.divineRequest = null; return null; } const site = r.tile != null && W.isPassable(r.tile) && !W.buildingAt(r.tile) ? r.tile : LW.Buildings.findSite(W, a, kind); if (site < 0) return null; return { steps: [{ op: 'moveTo', i: site, near: 1 }, { op: 'buildNew', kind, i: site }, done], priority: r.force ? 3 : 2, tag: 'build:' + kind, kind }; }
        case 'follow': { const target = r.targetId != null ? W.agents.get(r.targetId) : null; const av = [...W.buildings.values()].find((b) => LW.Buildings.def(b).divine); if (target) return { steps: [{ op: 'follow', target: target.id, n: 96 }, done], priority: r.force ? 3 : 2, target: target.id }; if (av) return { steps: [{ op: 'moveTo', i: W.idx(av.x, av.y), near: 1 }, { op: 'wait', n: 24, at: 'shelter' }, done], priority: 2 }; a.divineRequest = null; return null; }
        case 'protect': { const target = r.targetId != null ? W.agents.get(r.targetId) : null; if (!target) { a.divineRequest = null; return null; } return { steps: [{ op: 'follow', target: target.id, n: 192 }, done], priority: r.force ? 3 : 2, target: target.id }; }
        case 'explore': { const base = r.tile != null ? r.tile : W.idx(a.x | 0, a.y | 0); const t = W.randomNear(W.xOf(base), W.yOf(base), 6); return { steps: [{ op: 'moveTo', i: t, explore: true }, { op: 'moveTo', i: W.randomNear(W.xOf(t), W.yOf(t), 8), explore: true }, done], priority: 2, tag: 'explore:walk' }; }
        case 'leave': { LW.Buildings.moveOut(W, a); const ang = W.rng.range(0, Math.PI * 2); let t = -1; for (let d = 18; d > 6 && t < 0; d -= 3) { const x = LW.clamp(Math.round(a.x + Math.cos(ang) * d), 1, W.w - 2), y = LW.clamp(Math.round(a.y + Math.sin(ang) * d), 1, W.h - 2); if (W.isPassable(W.idx(x, y))) t = W.idx(x, y); } if (t < 0) return null; return { steps: [{ op: 'moveTo', i: t }, done], priority: r.force ? 3 : 2 }; }
        case 'search': { const t = r.tile != null ? r.tile : W.idx(a.x | 0, a.y | 0); if (a.knowledge.techs.has('digging')) return { steps: [{ op: 'moveTo', i: t, near: 1 }, { op: 'dig', i: t, n: 10 }, done], priority: 2, tag: 'dig:ground' }; return { steps: [{ op: 'moveTo', i: t, near: 1 }, { op: 'moveTo', i: W.randomNear(W.xOf(t), W.yOf(t), 5), explore: true }, done], priority: 2, tag: 'explore:walk' }; }
      }
      a.divineRequest = null; return null;
    },
  };
  // completion op registered into Actions
  LW.Actions.OPS.divineDone = function (world, a) { if (a.divineRequest) { A().memory(world, a, { type: 'divine', text: 'megtettem, amit a hang kért', importance: 0.6, emotion: 'pride', intensity: 0.5, divine: true }); a.beliefs.creator = LW.clamp01(a.beliefs.creator + 0.1); a.divineRequest = null; } return 'done'; };
  LW.God = God;
})(globalThis.LW || (globalThis.LW = {}));
