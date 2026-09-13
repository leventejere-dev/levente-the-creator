PATCHES = [
('src/manifest.json', [
("""    "core/config.js",
    "core/util.js",""", """    "core/config.js",
    "core/hu.js",
    "core/util.js","""),
("""    "audio/audio.js",""", """    "cloud.js",
    "audio/audio.js","""),
]),
('src/core/config.js', [
("""    berries:     { food: 0.30, water: 0.05, spoilDays: 4,  weight: 0.5, label: 'Berries' },
    roots:       { food: 0.35, spoilDays: 8,  weight: 0.7, label: 'Roots' },
    meat_raw:    { food: 0.45, spoilDays: 2,  weight: 1.2, label: 'Raw meat', raw: 'meat_cooked' },
    meat_cooked: { food: 0.70, spoilDays: 6,  weight: 1.0, label: 'Cooked meat' },
    fish_raw:    { food: 0.35, spoilDays: 2,  weight: 0.8, label: 'Raw fish', raw: 'fish_cooked' },
    fish_cooked: { food: 0.55, spoilDays: 6,  weight: 0.7, label: 'Cooked fish' },
    dried_food:  { food: 0.50, spoilDays: 60, weight: 0.5, label: 'Dried food' },
    grain:       { food: 0.30, spoilDays: 90, weight: 0.5, label: 'Grain' },
    wood:   { weight: 1.5, label: 'Wood' },
    stone:  { weight: 2.0, label: 'Stone' },
    flint:  { weight: 0.8, label: 'Flint' },
    fiber:  { weight: 0.3, label: 'Plant fiber' },
    clay:   { weight: 1.5, label: 'Clay' },
    hide:   { weight: 1.0, label: 'Hide' },
    handaxe:{ weight: 1.0, label: 'Hand axe', tool: true },
    spear:  { weight: 1.2, label: 'Spear', tool: true },
    basket: { weight: 0.6, label: 'Basket', tool: true, carryBonus: 8 },
    pot:    { weight: 1.5, label: 'Clay pot', tool: true, carryBonus: 3 },
    ore_copper: { weight: 2.5, label: 'Strange green stone' },
    ore_tin:    { weight: 2.5, label: 'Grey heavy stone' },
    ore_iron:   { weight: 2.5, label: 'Rust-red stone' },
    coal:       { weight: 1.5, label: 'Black burning stone' },
    gold_nugget:{ weight: 1.0, label: 'Shiny yellow stone' },
    salt:       { weight: 1.0, label: 'Salt' },
    gems:       { weight: 0.5, label: 'Glittering stone' },""",
 """    berries:     { food: 0.30, water: 0.05, spoilDays: 4,  weight: 0.5, label: 'Bogyó' },
    roots:       { food: 0.35, spoilDays: 8,  weight: 0.7, label: 'Gyökér' },
    meat_raw:    { food: 0.45, spoilDays: 2,  weight: 1.2, label: 'Nyers hús', raw: 'meat_cooked' },
    meat_cooked: { food: 0.70, spoilDays: 6,  weight: 1.0, label: 'Sült hús' },
    fish_raw:    { food: 0.35, spoilDays: 2,  weight: 0.8, label: 'Nyers hal', raw: 'fish_cooked' },
    fish_cooked: { food: 0.55, spoilDays: 6,  weight: 0.7, label: 'Sült hal' },
    dried_food:  { food: 0.50, spoilDays: 60, weight: 0.5, label: 'Szárított étel' },
    grain:       { food: 0.30, spoilDays: 90, weight: 0.5, label: 'Gabona' },
    wood:   { weight: 1.5, label: 'Fa' },
    stone:  { weight: 2.0, label: 'Kő' },
    flint:  { weight: 0.8, label: 'Kova' },
    fiber:  { weight: 0.3, label: 'Rost' },
    clay:   { weight: 1.5, label: 'Agyag' },
    hide:   { weight: 1.0, label: 'Bőr' },
    handaxe:{ weight: 1.0, label: 'Kézibalta', tool: true },
    spear:  { weight: 1.2, label: 'Lándzsa', tool: true },
    basket: { weight: 0.6, label: 'Kosár', tool: true, carryBonus: 8 },
    pot:    { weight: 1.5, label: 'Agyagedény', tool: true, carryBonus: 3 },
    ore_copper: { weight: 2.5, label: 'Furcsa zöld kő' },
    ore_tin:    { weight: 2.5, label: 'Szürke nehéz kő' },
    ore_iron:   { weight: 2.5, label: 'Rozsdavörös kő' },
    coal:       { weight: 1.5, label: 'Fekete égő kő' },
    gold_nugget:{ weight: 1.0, label: 'Csillogó sárga kő' },
    salt:       { weight: 1.0, label: 'Só' },
    gems:       { weight: 0.5, label: 'Szikrázó kő' },"""),
("""  const BIOME_NAME = ['Ocean', 'Lake', 'River', 'Beach', 'Grassland', 'Forest', 'Dense forest', 'Hills', 'Mountain', 'Peak', 'Marsh', 'Tundra', 'Desert', 'Savanna'];""",
 """  const BIOME_NAME = ['Óceán', 'Tó', 'Folyó', 'Part', 'Mező', 'Erdő', 'Sűrű erdő', 'Dombság', 'Hegység', 'Csúcs', 'Mocsár', 'Tundra', 'Sivatag', 'Szavanna'];"""),
]),
('src/tech/discoveries.js', [
("""  LW.ITEMS.clothes = { weight: 1.0, label: 'Hide clothing', tool: true, warmth: 8 };""",
 """  LW.ITEMS.clothes = { weight: 1.0, label: 'Bőrruha', tool: true, warmth: 8 };"""),
("""    techLevel(known) {
      const has = (k) => known.has(k);
      if (has('stone_masonry') && has('seed_planting')) return 'Neolithic';
      if (has('seed_planting') || (has('pottery') && has('hut_construction'))) return 'Early Neolithic';
      if (has('stone_knapping') && has('fire_making')) return 'Stone Age';
      if (has('stone_knapping') || has('fire_making') || has('shelter_building')) return 'Early Stone Age';
      return 'Primitive';
    },""",
 """    techLevel(known) {
      const has = (k) => known.has(k);
      if (has('stone_masonry') && has('seed_planting')) return 'Újkőkor';
      if (has('seed_planting') || (has('pottery') && has('hut_construction'))) return 'Korai újkőkor';
      if (has('stone_knapping') && has('fire_making')) return 'Kőkor';
      if (has('stone_knapping') || has('fire_making') || has('shelter_building')) return 'Korai kőkor';
      return 'Kezdetleges';
    },"""),
("""      if (!d.hidden && source !== 'taught') { LW.Agents.memory(world, a, { type: 'discovery', text: `discovered ${d.name}`, importance: first ? 0.95 : 0.7, emotion: 'pride', intensity: first ? 0.9 : 0.6, tech: id });""",
 """      if (!d.hidden && source !== 'taught') { LW.Agents.memory(world, a, { type: 'discovery', text: `rájöttem: ${d.name.toLowerCase()}`, importance: first ? 0.95 : 0.7, emotion: 'pride', intensity: first ? 0.9 : 0.6, tech: id });"""),
]),
('src/core/util.js', [
("""    seasonName: (tick) => ['Spring', 'Summer', 'Autumn', 'Winter'][Time.season(tick)],""",
 """    seasonName: (tick) => ['Tavasz', 'Nyár', 'Ősz', 'Tél'][Time.season(tick)],"""),
("""      if (days < 1) return `${Math.round(ticks / T.TICKS_PER_HOUR)} hours`;
      if (days < 60) return `${Math.round(days)} days`;
      const years = days / T.DAYS_PER_YEAR;
      if (years < 2) return `${Math.round(days / 30)} months`;
      return `${years.toFixed(years < 10 ? 1 : 0)} years`;""",
 """      if (days < 1) return `${Math.round(ticks / T.TICKS_PER_HOUR)} óra`;
      if (days < 60) return `${Math.round(days)} nap`;
      const years = days / T.DAYS_PER_YEAR;
      if (years < 2) return `${Math.round(days / 30)} hónap`;
      return `${years.toFixed(years < 10 ? 1 : 0)} év`;"""),
("""      const s = Math.floor(ms / 1000); if (s < 60) return `${s} s`;
      const m = Math.floor(s / 60); if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60); if (h < 48) return `${h} h ${m % 60} min`;
      const d = Math.floor(h / 24); return `${d} days ${h % 24} h`;""",
 """      const s = Math.floor(ms / 1000); if (s < 60) return `${s} mp`;
      const m = Math.floor(s / 60); if (m < 60) return `${m} perc`;
      const h = Math.floor(m / 60); if (h < 48) return `${h} óra ${m % 60} perc`;
      const d = Math.floor(h / 24); return `${d} nap ${h % 24} óra`;"""),
("""    stamp: (tick) => { const y = Time.year(tick), d = Time.dayOfYear(tick) + 1, h = Time.hour(tick), m = Time.minute(tick); return `Y${y} D${d} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },""",
 """    stamp: (tick) => { const y = Time.year(tick), d = Time.dayOfYear(tick) + 1, h = Time.hour(tick), m = Time.minute(tick); return `${y}. év ${d}. nap ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },"""),
]),
('src/buildings/buildings.js', [
("""g[k] = (g[k] || 0) + Math.floor(b.storage[k] * (cause === 'fire' ? 0.2 : 0.8));""", """g[k] = (g[k] || 0) + Math.floor(b.storage[k] * (cause === 'tűz' ? 0.2 : 0.8));"""),
("""if (cause === 'fire') r.emotions.fear = Math.min(1, r.emotions.fear + 0.5);""", """if (cause === 'tűz') r.emotions.fear = Math.min(1, r.emotions.fear + 0.5);"""),
("""    campfire:    { label: 'Campfire',""", """    campfire:    { label: 'Tábortűz',"""),
("""    lean_to:     { label: 'Lean-to',""", """    lean_to:     { label: 'Fedezék',"""),
("""    hut:         { label: 'Hut',""", """    hut:         { label: 'Kunyhó',"""),
("""    stone_house: { label: 'Stone house',""", """    stone_house: { label: 'Kőház',"""),
("""    storage_pit: { label: 'Storage pit',""", """    storage_pit: { label: 'Tárolóverem',"""),
("""    farm_plot:   { label: 'Farm plot',""", """    farm_plot:   { label: 'Szántó',"""),
("""    monolith:    { label: 'Monolith',""", """    monolith:    { label: 'Monolit',"""),
("""    light:       { label: 'Pillar of light',""", """    light:       { label: 'Fényoszlop',"""),
("""    orb:         { label: 'Floating orb',""", """    orb:         { label: 'Lebegő gömb',"""),
("""    avatar:      { label: 'The Creator',""", """    avatar:      { label: 'A Teremtő',"""),
("""        LW.Agents.memory(world, a, { type: 'built', text: `built a ${def.label.toLowerCase()}`, importance: 0.6, emotion: 'pride', intensity: 0.6, buildingId: b.id });""",
 """        LW.Agents.memory(world, a, { type: 'built', text: `felépítettem: ${def.label.toLowerCase()}`, importance: 0.6, emotion: 'pride', intensity: 0.6, buildingId: b.id });"""),
("""      for (const rid of b.residents) { const r = world.agents.get(rid); if (r) { r.home = null; LW.Agents.memory(world, r, { type: 'loss', text: `lost home to ${cause}`, importance: 0.7, emotion: 'sadness', intensity: 0.7 });""",
 """      for (const rid of b.residents) { const r = world.agents.get(rid); if (r) { r.home = null; LW.Agents.memory(world, r, { type: 'loss', text: `elvesztettem az otthonom (${cause})`, importance: 0.7, emotion: 'sadness', intensity: 0.7 });"""),
("""          if (b.progress >= 1 || def.divine) { b.hp -= 1 / def.lifeDays; if (b.hp <= 0) { this.destroy(world, b, def.divine ? 'faded' : 'decay'); continue; } }
          else if (world.tick - b.startedTick > TPD * 200) { this.destroy(world, b, 'abandoned'); continue; }""",
 """          if (b.progress >= 1 || def.divine) { b.hp -= 1 / def.lifeDays; if (b.hp <= 0) { this.destroy(world, b, def.divine ? 'elhalványult' : 'elkorhadt'); continue; } }
          else if (world.tick - b.startedTick > TPD * 200) { this.destroy(world, b, 'félbehagyták'); continue; }"""),
]),
('src/world/ecology.js', [
("""        const b = world.buildingAt(i); if (b) LW.Buildings.damage(world, b, 0.06, 'fire');""",
 """        const b = world.buildingAt(i); if (b) LW.Buildings.damage(world, b, 0.06, 'tűz');"""),
]),
]
