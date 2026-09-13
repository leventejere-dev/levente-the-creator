  const TECH_FIRST = (id) => (LW.Tech.D[id] && LW.Tech.D[id].wow) || `Első: ${LW.Tech.D[id] ? LW.Tech.D[id].name.toLowerCase() : id}`;
  const BLD_FIRST = { campfire: 'Első meggyújtott tűz', lean_to: 'Első megépült fedezék', hut: 'Első megépült kunyhó', stone_house: 'Első kőház', storage_pit: 'Első tároló', farm_plot: 'Első szántóföld' };
  const TIER_FIRST = { camp: 'Első tábor', hamlet: 'Első tanya', village: 'Első falu', town: 'Első mezőváros', city: 'Első város', metropolis: 'Első nagyváros' };
//DESCRIBE
    describe(ev) {
      const n = (id) => this.nameOf(id); const W = this.world; const T = LW.Tech.D; const BD = LW.Buildings.DEFS; const HU = LW.HU;
      switch (ev.type) {
        case 'StrangerArrived': return { text: `Egy idegen, ${n(ev.agentId)}, érkezett az ismert föld peremén túlról.`, base: 0.6, firstKey: 'stranger', firstTitle: 'Első idegen' };
        case 'AgentBorn': return ev.stranger ? null : ev.genesis ? { text: `${n(ev.agentId)} megjelent a világban.`, base: 0.5, firstKey: 'genesis', firstTitle: 'Az Elsők' } : { text: `Megszületett ${n(ev.agentId)}, ${n(ev.motherId)} és ${n(ev.fatherId)} gyermeke.`, base: 0.45, firstKey: 'born', firstTitle: 'Első gyermek' };
        case 'AgentDied': return { text: `${n(ev.agentId)} ${Math.floor(ev.age)} évesen meghalt: ${ev.cause}.`, base: 0.5 + Math.min(0.3, 1 / Math.max(1, W.population)), firstKey: 'death', firstTitle: 'Első halál' };
        case 'Killing': return { text: `${n(ev.agentId)} végzett ${n(ev.otherId)} életével.`, base: 0.85, firstKey: 'murder', firstTitle: 'Első gyilkosság' };
        case 'CoupleFormed': return ev.stage === 'dating' ? { text: `${n(ev.agentId)} és ${n(ev.otherId)} járni kezdtek.`, base: 0.4, firstKey: 'love', firstTitle: 'Első szerelem' } : { text: `${n(ev.agentId)} és ${n(ev.otherId)} párrá lettek.`, base: 0.55, firstKey: 'partners', firstTitle: 'Első pár' };
        case 'CoupleBroke': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} szakítottak — ${n(ev.agentId)} lépett ki (${ev.reason}).`, base: 0.45, firstKey: 'breakup', firstTitle: 'Első szakítás' };
        case 'Pregnancy': return { text: `${n(ev.agentId)} gyermeket vár.`, base: 0.3 };
        case 'DiscoveryMade': return { text: `${n(ev.agentId)} rájött${ev.source === 'accident' ? ' véletlenül' : ev.source === 'observation' ? ' megfigyelésből' : ''}: ${T[ev.tech].name.toLowerCase()}.`, base: T[ev.tech].hidden ? 0.2 : 0.65, firstKey: 'tech:' + ev.tech, firstTitle: TECH_FIRST(ev.tech) };
        case 'KnowledgeTransferred': return { text: `${n(ev.agentId)} megtanulta: ${T[ev.tech].name.toLowerCase()}${ev.teacherId != null ? ' (tanította: ' + n(ev.teacherId) + ')' : ''}.`, base: T[ev.tech].hidden ? 0.05 : 0.15 };
        case 'KnowledgeLost': return { text: `${n(ev.agentId)} halálával elveszett a tudás: ${T[ev.tech].name.toLowerCase()}.`, base: 0.75, firstKey: 'lost', firstTitle: 'Első elveszett tudás' };
        case 'BuildingStarted': return { text: `${n(ev.agentId)} építeni kezdett: ${BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.05 : 0.18 };
        case 'BuildingCompleted': return { text: `${n(ev.agentId)} ${ev.kind === 'campfire' ? 'tüzet gyújtott' : 'elkészült: ' + BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.12 : 0.45, firstKey: 'building:' + ev.kind, firstTitle: BLD_FIRST[ev.kind] || `Első ${BD[ev.kind].label.toLowerCase()}` };
        case 'BuildingDestroyed': return ev.kind === 'campfire' ? null : { text: `Elpusztult egy ${BD[ev.kind].label.toLowerCase()} (${ev.cause}).`, base: ev.cause === 'elkorhadt' ? 0.15 : 0.5 };
        case 'SettlementFounded': return { text: `Megalakult ${ev.name} ${HU.tier(ev.tier)}a — alapítója ${n(ev.agentId)}.`, base: 0.85, firstKey: 'settlement', firstTitle: 'Első település' };
        case 'SettlementGrew': return { text: `${ev.name} ${HU.tierBecame(ev.tier)} nőtt.`, base: 0.75, firstKey: 'tier:' + ev.tier, firstTitle: TIER_FIRST[ev.tier] };
        case 'SettlementAbandoned': return { text: `${ev.name} elnéptelenedett.`, base: 0.6 };
        case 'SettlementResettled': return { text: `${ev.name} újra lakott.`, base: 0.5 };
        case 'ResourceFound': return { text: `${n(ev.agentId)} ${HU.depositItemByName(ev.deposit)} talált.`, base: 0.5, firstKey: 'deposit:' + ev.deposit, firstTitle: `Első ${HU.depositByName(ev.deposit)}lelet` };
        case 'WeatherChanged': return ev.creator ? null : (ev.state === 'storm' && ev.prev !== 'rain') ? { text: 'Vihar söpör végig a vidéken.', base: 0.2 } : (ev.state === 'rain' && ev.prev !== 'storm' && ev.prev !== 'overcast') ? { text: 'Eleredt az eső.', base: 0.08 } : null;
        case 'WildfireStarted': return { text: `Erdőtűz tört ki${ev.cause === 'lightning' ? ' egy villámcsapásból' : ev.cause === 'creator' ? ' az égből' : ''}.`, base: 0.55, firstKey: 'wildfire', firstTitle: 'Első erdőtűz' };
        case 'WildfireEnded': return { text: `Az erdőtűz kialudt; ${ev.burned} mező perzselődött fel.`, base: 0.3 };
        case 'CreatorIntervention': return { text: ev.text, base: 0.6, god: true, firstKey: 'intervention', firstTitle: 'A Teremtő első érintése' };
        case 'DivineCommandIssued': return { text: ev.text, base: 0.5, god: true };
        case 'DivineCommandInterpreted': return { text: ev.text, base: 0.45, god: true };
        case 'ManifestationPlaced': return { text: `Megjelent egy ${BD[ev.kind].label.toLowerCase()}.`, base: 0.6, god: true, firstKey: 'manifestation', firstTitle: 'Első megjelenés' };
        case 'ManifestationEnded': return { text: `A ${BD[ev.kind].label.toLowerCase()} ${ev.cause === 'elhalványult' ? 'elhalványult' : 'eltűnt'}.`, base: 0.2, god: true };
        case 'BeliefFormed': return { text: ev.text, base: 0.9, firstKey: 'belief', firstTitle: 'Az első hit a Teremtőben' };
        case 'ConflictOccurred': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} összeverekedett; ${n(ev.winnerId)} győzött.`, base: 0.35, firstKey: 'conflict', firstTitle: 'Első verekedés' };
        case 'AgentInjured': return { text: `${n(ev.agentId)} megsérült: ${ev.cause}.`, base: 0.12 + ev.amount * 0.3 };
        case 'AgentIll': return { text: `${n(ev.agentId)} megbetegedett.`, base: 0.12 };
        case 'FriendshipFormed': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} összebarátkoztak.`, base: 0.25, firstKey: 'friendship', firstTitle: 'Első barátság' };
        case 'Courtship': return { text: `${n(ev.agentId)} és ${n(ev.otherId)} flörtöltek.`, base: 0.15 };
        case 'Rejection': return { text: `${n(ev.otherId)} elutasította ${n(ev.agentId)} közeledését.`, base: 0.12 };
        case 'Gift': return { text: `${n(ev.agentId)} ajándéka ${n(ev.otherId)} részére: ${LW.ITEMS[ev.item] ? LW.ITEMS[ev.item].label.toLowerCase() : ev.item}.`, base: 0.1 };
        case 'ItemCrafted': return { text: `${n(ev.agentId)} készített: ${LW.ITEMS[ev.item].label.toLowerCase()}.`, base: 0.3, firstKey: 'item:' + ev.item, firstTitle: `Első ${LW.ITEMS[ev.item].label.toLowerCase()}` };
        case 'Harvest': return { text: `${n(ev.agentId)} aratott: ${ev.amount} gabona.`, base: 0.35, firstKey: 'harvest', firstTitle: 'Első aratás' };
        case 'PathFormed': return { text: 'A lábak ösvényt tapostak a földbe.', base: 0.3, firstKey: 'path', firstTitle: 'Első ösvény' };
        case 'FireWentOut': return { text: 'Kialudt egy tűz.', base: 0.05 };
        case 'Conversation': return null;
        default: return null;
      }
    }
