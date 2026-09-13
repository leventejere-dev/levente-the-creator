/* LEVENTE — THE CREATOR · core/hu.js — magyar megnevezések a belső azonosítókhoz (a motor kulcsai angolok maradnak) */
(function (LW) {
  'use strict';
  const M = {
    need: { food: 'Étel', water: 'Víz', energy: 'Energia', warmth: 'Meleg', safety: 'Biztonság', social: 'Társaság', affection: 'Gyengédség', curiosity: 'Kíváncsiság' },
    emotion: { joy: 'öröm', sadness: 'szomorúság', fear: 'félelem', anger: 'harag', stress: 'feszültség', love: 'szerelem', attraction: 'vonzalom', jealousy: 'féltékenység', loneliness: 'magány', grief: 'gyász', excitement: 'izgalom', shame: 'szégyen', pride: 'büszkeség' },
    trait: { curiosity: 'kíváncsiság', creativity: 'kreativitás', intelligence: 'értelem', empathy: 'együttérzés', aggression: 'agresszió', patience: 'türelem', bravery: 'bátorság', sociability: 'társaságkedvelés', ambition: 'becsvágy', discipline: 'fegyelem', loyalty: 'hűség', greed: 'kapzsiság', riskTolerance: 'kockázatvállalás', optimism: 'derűlátás', dominance: 'uralkodás', humor: 'humor' },
    skill: { gathering: 'gyűjtögetés', hunting: 'vadászat', crafting: 'kézművesség', building: 'építés', foraging: 'növényismeret', social: 'társas', exploring: 'felfedezés', medicine: 'gyógyítás', farming: 'földművelés' },
    occupation: { infant: 'csecsemő', child: 'gyermek', adolescent: 'serdülő', adult: 'felnőtt', elder: 'idős', forager: 'gyűjtögető', gatherer: 'gyűjtögető', builder: 'építő', hunter: 'vadász', crafter: 'kézműves', explorer: 'felfedező', tinkerer: 'kísérletező', farmer: 'földműves', fisher: 'halász' },
    goal: { flee: 'menekülés', divine: 'a Teremtő hívása', eat: 'evés', drink: 'ivás', sleep: 'alvás', getWarm: 'melegedés', careForChild: 'gyermek gondozása', shareFood: 'étel megosztása', followParent: 'szülő követése', socialize: 'társaság', flirt: 'flört', mate: 'együttlét', stockpile: 'tartalék gyűjtése', buildShelter: 'otthon építése', helpBuild: 'segítés az építésben', makeFire: 'tűzgyújtás', tendFire: 'tűz táplálása', craft: 'készítés', experiment: 'kísérletezés', dig: 'ásás', farm: 'földművelés', explore: 'felfedezés', fight: 'verekedés', teach: 'tanítás', pickup: 'felszedés', mourn: 'gyász', rest: 'pihenés' },
    goalVerb: { flee: 'menekül', divine: 'a Teremtőnek felel', eat: 'ételt keres', drink: 'inni megy', sleep: 'alszik', getWarm: 'meleget keres', careForChild: 'a gyermekét gondozza', shareFood: 'ételt oszt meg', followParent: 'a szülője mellett marad', socialize: 'társaságot keres', flirt: 'flörtöl', mate: 'együtt van a párjával', stockpile: 'ételt gyűjt későbbre', buildShelter: 'otthont épít', helpBuild: 'segít építeni', makeFire: 'tüzet gyújt', tendFire: 'a tüzet táplálja', craft: 'készít valamit', experiment: 'kísérletezik', dig: 'ás', farm: 'a földet műveli', explore: 'felfedez', fight: 'verekszik', teach: 'tanít', pickup: 'felszed valamit', mourn: 'gyászol', rest: 'pihen' },
    ctx: { hunger: 'éhség', thirst: 'szomj', tired: 'fáradtság', cold: 'hideg', danger: 'veszély', night: 'éjszaka', feels: 'érzett °C' },
    op: { moveTo: 'megy', follow: 'követ', flee: 'menekül', gather: 'gyűjt', hunt: 'vadászik', fish: 'halászik', consume: 'eszik', drink: 'iszik', takeFood: 'ételt vesz ki', store: 'elrak', sleep: 'alszik', wait: 'vár', interact: 'beszél', buildNew: 'helyet jelöl', deliver: 'anyagot hoz', build: 'épít', refuel: 'tüzel', craft: 'készít', experiment: 'kísérletezik', dig: 'ás', give: 'ad', pickup: 'felszed', plant: 'vet', harvest: 'arat', divineDone: 'teljesít' },
    deposit: ['semmi', 'agyag', 'kova', 'só', 'szén', 'réz', 'ón', 'vas', 'arany', 'drágakő', 'olaj'],
    depositItem: ['', 'agyagot', 'kovát', 'sót', 'szenet', 'rezet', 'ónt', 'vasat', 'aranyat', 'drágakövet', 'olajat'],
    tier: { camp: 'tábor', hamlet: 'tanya', village: 'falu', town: 'mezőváros', city: 'város', metropolis: 'nagyváros' },
    tierBecame: { camp: 'táborrá', hamlet: 'tanyává', village: 'faluvá', town: 'mezővárossá', city: 'várossá', metropolis: 'nagyvárossá' },
    shape: { continent: 'Egy kontinens', archipelago: 'Egy szigetvilág', twin: 'Két földrész világa' },
    eventType: { AgentBorn: 'Születés', AgentDied: 'Halál', Killing: 'Gyilkosság', CoupleFormed: 'Szerelem', CoupleBroke: 'Szakítás', Pregnancy: 'Terhesség', DiscoveryMade: 'Felfedezés', KnowledgeLost: 'Elveszett tudás', BuildingCompleted: 'Építés', BuildingDestroyed: 'Pusztulás', SettlementFounded: 'Település', SettlementGrew: 'Növekedés', SettlementAbandoned: 'Elnéptelenedés', SettlementResettled: 'Újranépesedés', ResourceFound: 'Lelet', WildfireStarted: 'Erdőtűz', BeliefFormed: 'Hit', ConflictOccurred: 'Összecsapás', StrangerArrived: 'Idegen', Harvest: 'Aratás', WeatherChanged: 'Időjárás' },
  };
  const HU = {
    ...M,
    need: (k) => M.need[k] || k, emotion: (k) => M.emotion[k] || k, trait: (k) => M.trait[k] || k, skill: (k) => M.skill[k] || k,
    occupation: (k) => M.occupation[k] || k, goal: (k) => M.goal[k] || k, goalVerb: (k) => M.goalVerb[k] || k, ctx: (k) => M.ctx[k] || k, op: (k) => M.op[k] || k,
    deposit: (i) => M.deposit[i] || '?', depositByName: (n) => M.deposit[LW.DEPOSIT_NAME.indexOf(n)] || n, depositItemByName: (n) => M.depositItem[LW.DEPOSIT_NAME.indexOf(n)] || n,
    tier: (k) => M.tier[k] || k, tierBecame: (k) => M.tierBecame[k] || k, shape: (k) => M.shape[k] || k, eventType: (k) => M.eventType[k] || k,
  };
  LW.HU = HU;
})(globalThis.LW || (globalThis.LW = {}));
