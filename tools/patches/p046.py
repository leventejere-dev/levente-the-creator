# p046 — átkelők bekötése: híd-mezők, járhatóság, építés a vízre, a közösség vágya, közelség a hídvéghez
PATCHES = [
('src/world/generate.js', [
("""      snow: new Uint8Array(n), danger: new Uint8Array(n), shade: new Uint8Array(n),
    };""",
 """      snow: new Uint8Array(n), danger: new Uint8Array(n), shade: new Uint8Array(n),
      bridge: new Uint8Array(n), // átkelő: 1 fahíd, 2 kőhíd, 3 acélhíd, 4 alagút — a víz és a csúcs járhatóvá válik
    };"""),
]),
('src/world/world.js', [
("""    isPassable(i) { return LW.MOVE_COST[this.tiles.biome[i]] !== Infinity; }
    moveCost(i) {
      const t = this.tiles; let c = LW.MOVE_COST[t.biome[i]];
      if (c === Infinity) return c;""",
 """    isPassable(i) { return LW.MOVE_COST[this.tiles.biome[i]] !== Infinity || (this.tiles.bridge && this.tiles.bridge[i] > 0); }
    moveCost(i) {
      const t = this.tiles; let c = LW.MOVE_COST[t.biome[i]];
      if (t.bridge && t.bridge[i]) c = t.bridge[i] === 4 ? 1.3 : t.bridge[i] === 1 ? 1.1 : 0.9; // a hídon a folyó és a szoros is út
      if (c === Infinity) return c;"""),
("""      this.w = newW; this.h = newH; this.tiles = nt; this._initPathBuffers(); this.reindexBuildings(); this.rebuildBuckets(); this.dirtyTiles = new Set();""",
 """      this.w = newW; this.h = newH; this.tiles = nt; this._initPathBuffers(); this.reindexBuildings(); this.rebuildBuckets(); this.dirtyTiles = new Set(); this._comp = null; this._bridgeSites = null;"""),
]),
('src/buildings/buildings.js', [
("""    create(world, kind, x, y, ownerId) {
      const def = DEFS[kind]; const b = { id: world.nextIds.building++, kind, x: x | 0, y: y | 0, w: def.size ? def.size[0] : 1, h: def.size ? def.size[1] : 1,""",
 """    create(world, kind, x, y, ownerId) {
      const def = DEFS[kind]; let bw = def.size ? def.size[0] : 1, bh = def.size ? def.size[1] : 1;
      if (def.bridge) { const g = world._bridgeSites && world._bridgeSites.get(world.idx(x | 0, y | 0)); if (g) { x = g.x; y = g.y; bw = g.w; bh = g.h; world._bridgeSites.delete(g.shore); } } // a hely a part, az épület a vízen
      const b = { id: world.nextIds.building++, kind, x: x | 0, y: y | 0, w: bw, h: bh,"""),
("""        if (b.kind === 'campfire') { b.fuel = def.fuelTicks; b.lit = true; }
        world.events.emit('BuildingCompleted',""",
 """        if (b.kind === 'campfire') { b.fuel = def.fuelTicks; b.lit = true; }
        if (def.bridge && LW.Crossings) LW.Crossings.onComplete(world, b, a);
        world.events.emit('BuildingCompleted',"""),
("""      world.removeBuilding(b.id); world.dirtyTiles.add(i);
      world.events.emit(def.divine ? 'ManifestationEnded' : 'BuildingDestroyed',""",
 """      if (def.bridge && LW.Crossings) LW.Crossings.onDestroy(world, b);
      world.removeBuilding(b.id); world.dirtyTiles.add(i);
      world.events.emit(def.divine ? 'ManifestationEnded' : 'BuildingDestroyed',"""),
("""    findSite(world, a, kind) {
      const anchor = a.home != null && world.buildings.get(a.home) ? world.buildings.get(a.home) : null;""",
 """    /** Hol álljon az ember, hogy egy épületen dolgozzon: a híd esetén a közelebbi hídfő, különben a sarokmező. */
    approach(world, a, b) { const def = DEFS[b.kind]; if (def && def.bridge && LW.Crossings) { const ends = LW.Crossings.ends(world, b); if (ends.length) return ends.sort((p, q) => LW.dist(a.x, a.y, world.xOf(p), world.yOf(p)) - LW.dist(a.x, a.y, world.xOf(q), world.yOf(q)))[0]; } return world.idx(b.x, b.y); },
    /** Elég közel van-e az ember az épület bármelyik mezőjéhez. */
    nearBuilding(world, a, b, r) { const w = b.w || 1, h = b.h || 1; if (w === 1 && h === 1) return LW.dist(a.x, a.y, b.x + 0.5, b.y + 0.5) <= r; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (LW.dist(a.x, a.y, b.x + dx + 0.5, b.y + dy + 0.5) <= r) return true; return false; },
    findSite(world, a, kind) {
      if (DEFS[kind].bridge) { const site = LW.Crossings.candidate(world, a, kind); if (!site) return -1; world._bridgeSites = world._bridgeSites || new Map(); world._bridgeSites.set(site.shore, site); return site.shore; }
      const anchor = a.home != null && world.buildings.get(a.home) ? world.buildings.get(a.home) : null;"""),
]),
('src/agents/actions.js', [
("""      if (world.buildingAt(i) || !world.isPassable(i)) { const j = Bld().findSite(world, a, st.kind); if (j < 0) return FAIL; st.i = j; return RUN; }
      const b = Bld().create(world, st.kind, world.xOf(i), world.yOf(i), a.id);""",
 """      const bridge = !!Bld().DEFS[st.kind].bridge;
      if ((world.buildingAt(i) && !bridge) || !world.isPassable(i) || (bridge && !(world._bridgeSites && world._bridgeSites.get(i)))) { const j = Bld().findSite(world, a, st.kind); if (j < 0) return FAIL; st.i = j; return RUN; }
      const b = Bld().create(world, st.kind, world.xOf(i), world.yOf(i), a.id);"""),
("""    deliver(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL;""",
 """    deliver(world, a, st) { const b = world.buildings.get(st.bid); if (!b || !Bld().nearBuilding(world, a, b, 1.8)) return FAIL;"""),
("""      const b = world.buildings.get(st.bid); if (!b) return FAIL; if (!near(world, a, world.idx(b.x, b.y), 1.8)) return FAIL;""",
 """      const b = world.buildings.get(st.bid); if (!b) return FAIL; if (!Bld().nearBuilding(world, a, b, 1.8)) return FAIL;"""),
]),
('src/agents/brain.js', [
("""    steps.push({ op: 'moveTo', i: c.world.idx(site.x, site.y), near: 1 });""",
 """    steps.push({ op: 'moveTo', i: Bld().approach(c.world, a, site), near: 1 });"""),
]),
('src/society/society.js', [
("""      for (const b of world.buildingsNear(a.x | 0, a.y | 0, 16)) if (b.kind === kind) return b.progress < 1 ? 0.9 : 0; // a félkész középületet be kell fejezni
      let want = 0.5;""",
 """      for (const b of world.buildingsNear(a.x | 0, a.y | 0, 16)) if (b.kind === kind) { if (b.progress < 1) return 0.9; if (!def.bridge) return 0; } // a félkész középületet be kell fejezni; hídból több is kellhet
      if (def.bridge) return LW.Crossings.want(world, a, kind);
      let want = 0.5;"""),
]),
('src/manifest.json', [
("""    "buildings/buildings.js",
    "tech/tree.js",""",
 """    "buildings/buildings.js",
    "world/crossings.js",
    "tech/tree.js",
    "tech/tree2.js","""),
]),
]
