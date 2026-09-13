/* LEVENTE — THE CREATOR · core/config.js
 * Every tunable parameter of the simulation lives here (spec §24 / ROADMAP §5).
 */
(function (LW) {
  'use strict';

  LW.ENGINE_VERSION = '0.1.0';

  const TIME = {
    TICK_MINUTES: 15,
    TICKS_PER_HOUR: 4,
    TICKS_PER_DAY: 96,
    DAYS_PER_MONTH: 30,
    MONTHS_PER_YEAR: 12,
    DAYS_PER_YEAR: 360,
    TICKS_PER_YEAR: 96 * 360,
    SEASON_DAYS: 90,
  };

  const CONFIG = {
    world: { width: 128, height: 128, seaLevel: 0.38, riverDensity: 1 / 1400, depositDensity: 1 / 700 },
    time: {
      speedPresets: { slow: 15, normal: 60, fast: 240, ultra: 1440, hyper: 7200 }, // world minutes per real second
      defaultPreset: 'normal',
      frameBudgetMs: 12,
    },
    genesis: { population: 3, minAdultAge: 17, maxAdultAge: 26 },
    agents: {
      decisionInterval: 8,
      perceptionRadius: 6,
      noiseSigma: 0.05,
      memoryCap: 80,
      emotionalCap: 12,
      poiCap: 200,
      carryCapacity: 12,
      needDrainPerDay: { food: 0.75, water: 0.8, energy: 1.2, social: 0.35, affection: 0.12, curiosity: 0.2 },
      starvationHealthPerDay: 0.06,
      dehydrationHealthPerDay: 0.2,
      hypothermiaHealthPerDay: 0.08,
      adultAge: 16,
      childAge: 3,
      adolescentAge: 12,
      longevityRange: [40, 62],
      gestationDays: 270,
      fertilityBase: 0.07,
      infantMortality: 0.05,
      baseSpeed: 2.0, // tiles per tick (a tile is ~25 m; 2 tiles per 15-minute tick is a slow forager's pace)
    },
    social: {
      conversationTransferBase: 0.25,
      flirtBase: 0.3,
      datingThreshold: 0.5,
      partnerThreshold: 0.9,
      breakupResentment: 0.3,
    },
    tech: { experimentBase: 0.05, accidentMultiplier: 1.0, hintProgress: 0.12, forgetPerYearElder: 0.02 },
    ecology: { vegRegrowth: 0.08, treeRegrowth: 0.004, animalRegrowth: 0.03, fishRegrowth: 0.06, fireSpread: 0.05 },
    weather: { stormLightningPerTick: 0.02, wildfireIgnitionTreeMin: 40, overrideDefaultHours: 6 },
    settlements: { clusterRadius: 6, tiers: [['camp', 2], ['hamlet', 4], ['village', 10], ['town', 30], ['city', 100], ['metropolis', 400]] },
    paths: { trail: 40, path: 160, road: 600, decayPerDay: 0.02 },
    history: { chronicleThreshold: 0.6, feedThreshold: 0.15, feedCap: 300, firstBonus: 3.0, creatorBonus: 1.5 },
    catchup: { detailWindowTicks: 192, maxYears: 500, chunkDays: 30 },
    persistence: { autosaveSeconds: 30, snapshotSlots: 3, key: 'lw.world.v1' },
    lod: { microCap: 300, mesoCap: 3000 },
    audio: { masterVolume: 0.35 },
    debug: { why: true, overlay: false },
  };

  /** Item catalogue. food = need restored per unit; spoilDays = mean life; weight for carry. */
  const ITEMS = {
    berries:     { food: 0.30, water: 0.05, spoilDays: 4,  weight: 0.5, label: 'Berries' },
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
    gems:       { weight: 0.5, label: 'Glittering stone' },
  };
  const FOOD_ITEMS = Object.keys(ITEMS).filter((k) => ITEMS[k].food);

  const BIOME = { OCEAN: 0, LAKE: 1, RIVER: 2, BEACH: 3, GRASSLAND: 4, FOREST: 5, DENSE_FOREST: 6, HILLS: 7, MOUNTAIN: 8, PEAK: 9, MARSH: 10, TUNDRA: 11, DESERT: 12, SAVANNA: 13 };
  const BIOME_NAME = ['Ocean', 'Lake', 'River', 'Beach', 'Grassland', 'Forest', 'Dense forest', 'Hills', 'Mountain', 'Peak', 'Marsh', 'Tundra', 'Desert', 'Savanna'];
  const DEPOSIT = { NONE: 0, CLAY: 1, FLINT: 2, SALT: 3, COAL: 4, COPPER: 5, TIN: 6, IRON: 7, GOLD: 8, GEMS: 9, OIL: 10 };
  const DEPOSIT_NAME = ['none', 'clay', 'flint', 'salt', 'coal', 'copper', 'tin', 'iron', 'gold', 'gems', 'oil'];
  const DEPOSIT_ITEM = [null, 'clay', 'flint', 'salt', 'coal', 'ore_copper', 'ore_tin', 'ore_iron', 'gold_nugget', 'gems', null];

  /** Movement cost per biome (Infinity = impassable). */
  const MOVE_COST = [Infinity, Infinity, 3.0, 1.1, 1.0, 1.4, 1.8, 2.0, 3.0, Infinity, 2.5, 1.3, 1.4, 1.0];

  const TRAITS = ['curiosity', 'creativity', 'intelligence', 'empathy', 'aggression', 'patience', 'bravery', 'sociability', 'ambition', 'discipline', 'loyalty', 'greed', 'riskTolerance', 'optimism', 'dominance', 'humor'];
  const EMOTIONS = ['joy', 'sadness', 'fear', 'anger', 'stress', 'love', 'attraction', 'jealousy', 'loneliness', 'grief', 'excitement', 'shame', 'pride'];
  const NEEDS = ['food', 'water', 'energy', 'warmth', 'safety', 'social', 'affection', 'curiosity'];
  const SKILLS = ['gathering', 'hunting', 'crafting', 'building', 'foraging', 'social', 'exploring', 'medicine', 'farming'];

  LW.TIME = TIME;
  LW.CONFIG = CONFIG;
  LW.ITEMS = ITEMS;
  LW.FOOD_ITEMS = FOOD_ITEMS;
  LW.BIOME = BIOME;
  LW.BIOME_NAME = BIOME_NAME;
  LW.DEPOSIT = DEPOSIT;
  LW.DEPOSIT_NAME = DEPOSIT_NAME;
  LW.DEPOSIT_ITEM = DEPOSIT_ITEM;
  LW.MOVE_COST = MOVE_COST;
  LW.TRAITS = TRAITS;
  LW.EMOTIONS = EMOTIONS;
  LW.NEEDS = NEEDS;
  LW.SKILLS = SKILLS;
})(globalThis.LW || (globalThis.LW = {}));
