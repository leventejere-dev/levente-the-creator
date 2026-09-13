PATCHES = [
('src/tech/tree.js', [
("""    simulation_core: pub({ label: 'Világmag',""",
 """    palisade: pub({ label: 'Palánk', cost: { wood: 20, fiber: 4 }, ticks: 300, safety: 0.6, wall: 1, tech: 'fortification', lifeDays: 5000, minPop: 5, want: 'safety' }),
    stone_wall: pub({ label: 'Kőfal', cost: { stone: 40, clay: 8 }, ticks: 700, safety: 0.8, wall: 2, tech: 'stone_walls', lifeDays: 30000, minPop: 10, want: 'safety', size: [2, 1] }),
    castle: pub({ label: 'Vár', cost: { stone: 90, brick: 30, wood: 30, iron: 6 }, ticks: 2600, safety: 0.95, wall: 3, records: 1, storage: 200, tech: 'castles', lifeDays: 60000, light: 0.6, minPop: 20, want: 'safety', size: [3, 3] }),
    harbor: pub({ label: 'Kikötő', cost: { wood: 30, stone: 10, cloth: 4 }, ticks: 600, harbor: 1, storage: 120, tech: 'sailing', lifeDays: 12000, minPop: 8, want: 'food', size: [2, 1] }),
    simulation_core: pub({ label: 'Világmag',"""),
("""  // — vaskor
  T('iron_smelting',""",
 """  T('fortification', { name: 'Palánképítés', era: 'neolithic', prereq: ['hut_construction', 'tribal_council'], items: { wood: 10 }, difficulty: 0.86, need: 'safety', skill: 'building', minSkill: 0.5, minPop: 5, buildings: ['palisade'], wow: 'Az első palánk', desc: 'Hegyezett cölöpök a tábor körül: a vad és az idegen kint marad.' });
  T('stone_walls', { name: 'Kőfalak', era: 'bronze', prereq: ['fortification', 'stone_masonry'], items: { stone: 16 }, difficulty: 0.9, need: 'safety', skill: 'building', minSkill: 0.65, minPop: 10, buildings: ['stone_wall'], wow: 'Az első kőfal', desc: 'Fal, amelyet tűz nem éget és kar nem dönt.' });
  T('dyeing', { name: 'Kelmefestés', era: 'bronze', prereq: ['weaving', 'herbal_medicine'], items: { cloth: 2, berries: 4 }, difficulty: 0.84, skill: 'crafting', minSkill: 0.5, wow: 'Az első festett ruha', desc: 'Növényből és földből szín: a ruha többé nem csak melegít, hanem beszél is arról, ki viseli.' });
  T('boatbuilding', { name: 'Csónaképítés', era: 'neolithic', prereq: ['woodworking', 'fishing'], items: { wood: 8, fiber: 4 }, nearby: 'water', difficulty: 0.84, need: 'food', skill: 'building', minSkill: 0.45, recipes: ['boat'], fx: { food: 0.1 }, wow: 'Az első csónak', desc: 'Kivájt törzs a vízen: a hal ott is elérhető, ahová a part nem ér.' });
  // — vaskor
  T('iron_smelting',"""),
("""  // — középkor
  T('paper_making',""",
 """  T('castles', { name: 'Várépítés', era: 'medieval', prereq: ['stone_walls', 'architecture', 'law_code'], items: { stone: 30, brick: 10 }, difficulty: 0.93, need: 'safety', skill: 'building', minSkill: 0.75, minPop: 20, buildings: ['castle'], wow: 'Az első vár', desc: 'Tornyok, kapu, falak: a hatalom kőbe zárva.' });
  // — középkor
  T('paper_making',"""),
("""  // — modern kor
  T('electrification',""",
 """  T('automobile', { name: 'Gépkocsi', era: 'modern', prereq: ['internal_combustion', 'road_building', 'steel_making'], items: { steel: 6, machine_part: 4, fuel: 2 }, nearby: 'factory', difficulty: 0.96, skill: 'crafting', minSkill: 0.85, minPop: 35, recipes: ['car'], fx: { speed: 0.5 }, wow: 'Az első gépkocsi', desc: 'Négy kerék és egy motor: a távolság elveszti a jelentését.' });
  // — modern kor
  T('electrification',"""),
("""    tractor: { out: { tractor: 1 }, inp: { steel: 6, machine_part: 6, fuel: 2 }, ticks: 120, tech: 'internal_combustion', nearby: 'factory', skill: 'crafting', tag: 'craft:tool' },""",
 """    tractor: { out: { tractor: 1 }, inp: { steel: 6, machine_part: 6, fuel: 2 }, ticks: 120, tech: 'internal_combustion', nearby: 'factory', skill: 'crafting', tag: 'craft:tool' },
    boat: { out: { boat: 1 }, inp: { wood: 8, fiber: 4 }, ticks: 80, tech: 'boatbuilding', skill: 'building', tag: 'craft:boat' },
    car: { out: { car: 1 }, inp: { steel: 6, machine_part: 4, fuel: 2 }, ticks: 120, tech: 'automobile', nearby: 'factory', skill: 'crafting', tag: 'craft:tool' },"""),
("""    wool_clothes: { weight: 1, label: 'Gyapjúruha', tool: true, warmth: 11, slot: 'clothes', tier: 2 },""",
 """    wool_clothes: { weight: 1, label: 'Gyapjúruha', tool: true, warmth: 11, slot: 'clothes', tier: 2 }, boat: { weight: 0, label: 'Csónak', tool: true, slot: 'boat', tier: 1 }, car: { weight: 0, label: 'Gépkocsi', tool: true, slot: 'vehicle', tier: 1 },"""),
("""      f.wood += this.bestTool(a, 'axe') * 0.25; f.hunt += this.bestTool(a, 'hunt') * 0.25; f.farm += this.bestTool(a, 'plow') * 0.25; f.mine += this.bestTool(a, 'mine') * 0.3; f.stone += this.bestTool(a, 'mine') * 0.2;""",
 """      f.wood += this.bestTool(a, 'axe') * 0.25; f.hunt += this.bestTool(a, 'hunt') * 0.25; f.farm += this.bestTool(a, 'plow') * 0.25; f.mine += this.bestTool(a, 'mine') * 0.3; f.stone += this.bestTool(a, 'mine') * 0.2; f.food += this.bestTool(a, 'boat') * 0.15; f.speed += this.bestTool(a, 'vehicle') * 0.5;"""),
]),
('src/society/society.js', [
("""if (def.want === 'health') want += (1 - a.health) * 0.8;""",
 """if (def.want === 'health') want += (1 - a.health) * 0.8; if (def.want === 'safety') { want += (1 - a.needs.safety) * 0.5 + a.emotions.fear * 0.5; const s2 = LW.Settlements.at(world, a.x, a.y); if (s2 && (s2.warWith || (s2.rivalry && Object.values(s2.rivalry).some((v) => v > 0.5)))) want += 0.6; }"""),
]),
('src/society/civilization.js', [
("""      const str = (list) => list.reduce((s, p) => s + p.personality.bravery + p.personality.aggression * 0.5 + LW.Tree.bestTool(p, 'hunt') * 0.6 + p.health, 0) * rng.range(0.7, 1.3);
      const sa = str(wa), sb = str(wb);""",
 """      const wallOf = (s) => { let best = 0; for (const x of w.buildingsNear(s.x | 0, s.y | 0, 12)) { const d = LW.Buildings.DEFS[x.kind]; if (x.progress >= 1 && d && d.wall > best) best = d.wall; } return best; };
      const str = (list, s) => list.reduce((acc, p) => acc + p.personality.bravery + p.personality.aggression * 0.5 + LW.Tree.bestTool(p, 'hunt') * 0.6 + p.health, 0) * rng.range(0.7, 1.3) * (1 + wallOf(s) * 0.25); // a fal védi az otthon harcolókat
      const sa = str(wa, a), sb = str(wb, b);"""),
]),
('src/render/sprites.js', [
("""    const K = a.knowledge && a.knowledge.techs; const dyed = K && K.has('weaving'); const modern = K && K.has('electrification');""",
 """    const K = a.knowledge && a.knowledge.techs; const dyed = K && K.has('dyeing'); const modern = K && K.has('electrification');"""),
("""|${a.knowledge && a.knowledge.techs.has('weaving') ? 1 : 0}${a.knowledge && a.knowledge.techs.has('electrification') ? 1 : 0}`;""",
 """|${a.knowledge && a.knowledge.techs.has('dyeing') ? 1 : 0}${a.knowledge && a.knowledge.techs.has('electrification') ? 1 : 0}`;"""),
("""    data_center: { wall: '#1a2434', roof: '#101820', lights: true, flat: true }, simulation_core: { special: 'core' },""",
 """    data_center: { wall: '#1a2434', roof: '#101820', lights: true, flat: true }, simulation_core: { special: 'core' },
    palisade: { special: 'palisade' }, stone_wall: { special: 'stonewall' }, castle: { wall: '#8a8a86', roof: '#5a5a5a', flat: true, towers: true, door: '#2a1a10' }, harbor: { special: 'harbor' },"""),
("""    else if (st.special === 'core') {""",
 """    else if (st.special === 'palisade') { for (let x = 1; x < W - 1; x += 3) { s('#7a5a34', x, 2, 2, 12); s('#9a7a4a', x, 1, 2, 2); s('#5a3c22', x, 12, 2, 2); } s('#5a3c22', 1, 6, W - 2, 1); }
    else if (st.special === 'stonewall') { s('#7a7a76', 0, 3, W, H - 5); s('#9a9a96', 1, 4, W - 2, 3); for (let x = 0; x < W; x += 4) { s('#8a8a86', x, 1, 3, 3); s('#5a5a56', x + 1, 8 + ((x >> 2) & 1) * 2, 2, 1); } }
    else if (st.special === 'harbor') { s('#3a6a9a', 0, H - 6, W, 6); s('#5a8ac0', 2, H - 5, W - 4, 1); s('#7a5a34', 1, 4, W - 2, 3); s('#5a3c22', 2, 7, 2, 6); s('#5a3c22', W - 4, 7, 2, 6); s('#6a4a2c', W - 12, 8, 8, 3); s('#e8e0d0', W - 8, 1, 1, 8); s('#e8e0d0', W - 12, 2, 4, 4); }
    else if (st.special === 'core') {"""),
("""      if (st.cross) { s('#d75a4a', Math.round(W / 2) - 1, rh + 2, 3, 1); s('#d75a4a', Math.round(W / 2), rh + 1, 1, 3); }""",
 """      if (st.cross) { s('#d75a4a', Math.round(W / 2) - 1, rh + 2, 3, 1); s('#d75a4a', Math.round(W / 2), rh + 1, 1, 3); }
      if (st.towers) { for (const [tx, ty] of [[1, 1], [W - 7, 1], [1, H - 9], [W - 7, H - 9]]) { s('#6a6a66', tx, ty, 6, 8); s('#9a9a96', tx + 1, ty + 1, 4, 6); s('#5a5a56', tx, ty, 2, 2); s('#5a5a56', tx + 4, ty, 2, 2); } s('#c8102e', Math.round(W / 2), 0, 1, 5); s('#c8102e', Math.round(W / 2) + 1, 0, 3, 2); }"""),
]),
]
