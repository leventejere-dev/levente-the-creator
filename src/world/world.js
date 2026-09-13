/* LEVENTE — THE CREATOR · world/world.js
 * The World: tiles, registries (agents, deceased, buildings, settlements, landmarks),
 * spatial queries, pathfinding, and the shared services (rng, events, language).
 */
(function (LW) {
  'use strict';
  const B = LW.BIOME, T = LW.TIME;

  class BinaryHeap {
    constructor() { this.k = []; this.v = []; }
    get size() { return this.k.length; }
    push(key, val) { const k = this.k, v = this.v; k.push(key); v.push(val); let i = k.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= k[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; } }
    pop() { const k = this.k, v = this.v; const top = v[0]; const lk = k.pop(), lv = v.pop(); if (k.length) { k[0] = lk; v[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < k.length && k[l] < k[m]) m = l; if (r < k.length && k[r] < k[m]) m = r; if (m === i) break; [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m; } } return top; }
  }

  class World {
    constructor() {
      this.events = new LW.EventBus();
      this.agents = new Map();      // id → Agent (alive)
      this.deceased = new Map();    // id → compact record
      this.buildings = new Map();   // id → Building
      this.settlements = new Map(); // id → Settlement
      this.landmarks = [];          // god manifestations & named features
      this.nextIds = { agent: 1, building: 1, settlement: 1, landmark: 1 };
      this.tick = 0;
      this.buckets = new Map();
      this._pathGen = 0;
      this.stats = { births: 0, deaths: 0, discoveries: 0, buildingsBuilt: 0, interventions: 0 };
    }

    /** Create a brand new world from a seed. */
    static create(seed, cfg) {
      const w = new World();
      w.seed = seed >>> 0;
      w.cfg = cfg || LW.CONFIG;
      w.rng = new LW.Rng(w.seed);
      const gen = LW.generateWorld(w.seed, w.cfg.world);
      w.w = gen.w; w.h = gen.h; w.tiles = gen.tiles; w.genesis = gen.genesis; w.shape = gen.shape; w.climateMean = gen.climateMean; w.windDir = gen.windDir;
      w.language = new LW.Language(w.rng.fork('language'));
      w.name = w.language.world();
      w.createdMs = 0;
      w._initPathBuffers();
      return w;
    }

    _initPathBuffers() {
      const n = this.w * this.h;
      this._g = new Float32Array(n); this._from = new Int32Array(n); this._seen = new Uint32Array(n); this._closed = new Uint32Array(n);
    }

    idx(x, y) { return y * this.w + x; }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    xOf(i) { return i % this.w; }
    yOf(i) { return (i / this.w) | 0; }
    biomeAt(i) { return this.tiles.biome[i]; }
    isWater(i) { return LW.isWaterBiome(this.tiles.biome[i]); }
    isFresh(i) { return LW.isFreshBiome(this.tiles.biome[i]); }
    isPassable(i) { return LW.MOVE_COST[this.tiles.biome[i]] !== Infinity; }
    moveCost(i) {
      const t = this.tiles; let c = LW.MOVE_COST[t.biome[i]];
      if (c === Infinity) return c;
      if (t.path[i]) c *= t.path[i] === 1 ? 0.85 : t.path[i] === 2 ? 0.7 : 0.55;
      if (t.fire[i]) c += 40;
      if (t.snow[i] > 100) c *= 1.4;
      return c;
    }

    /** Current air temperature at tile (°C). Weather provides the dynamic offset. */
    tileTemp(i) {
      const base = this.tiles.baseTemp[i];
      const wx = this.weather;
      const f = LW.Time.yearFrac(this.tick);
      const seasonal = Math.cos((f - 0.375) * Math.PI * 2) * 8.5; // warmest mid-summer (day ~135), coldest mid-winter (day ~315)
      const h = LW.Time.hour(this.tick) + LW.Time.minute(this.tick) / 60;
      const diurnal = Math.sin((h - 9) / 24 * Math.PI * 2) * 5;
      return base + seasonal + diurnal + (wx ? wx.tempOffset : 0) - (wx ? wx.cloud * 2 : 0);
    }
    rainAt(i) { return this.weather ? this.weather.rainAt(i) : 0; }

    // ---- registries
    addAgent(a) { this.agents.set(a.id, a); return a; }
    removeAgent(id) { this.agents.delete(id); }
    /** Az épület által lefedett mezők (alapterület: b.w × b.h, a bal felső sarok a horgony). */
    buildingTiles(b) { const out = []; const w = b.w || 1, h = b.h || 1; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const x = b.x + dx, y = b.y + dy; if (this.inBounds(x, y)) out.push(this.idx(x, y)); } return out; }
    addBuilding(b) { this.buildings.set(b.id, b); if (!this.btile) this.btile = new Map(); for (const i of this.buildingTiles(b)) { this.btile.set(i, b.id); this.tiles.shade[i] = 1; } return b; }
    removeBuilding(id) { const b = this.buildings.get(id); if (!b) return; this.buildings.delete(id); if (this.btile) for (const i of this.buildingTiles(b)) { if (this.btile.get(i) === id) { this.btile.delete(i); this.tiles.shade[i] = 0; } } }
    buildingAt(i) { if (!this.btile) this.reindexBuildings(); const id = this.btile.get(i); return id != null ? (this.buildings.get(id) || null) : null; }
    reindexBuildings() { this.btile = new Map(); for (const b of this.buildings.values()) for (const i of this.buildingTiles(b)) this.btile.set(i, b.id); }
    /** Új föld a tengeren túl: a térkép keletre vagy délre bővül egy külön generált sávval; minden mezőindex újraszámolva. */
    expand(side, size, explorerId) {
      const oldW = this.w, oldH = this.h; const east = side === 'east';
      const newW = east ? oldW + size : oldW, newH = east ? oldH : oldH + size;
      const bandCfg = { ...this.cfg.world, width: east ? size : oldW, height: east ? oldH : size };
      this.expansions = (this.expansions || 0) + 1;
      const band = LW.generateWorld((this.seed ^ Math.imul(0x9e3779b9, this.expansions + 1)) >>> 0, bandCfg);
      const nt = LW.makeTiles(newW, newH);
      for (const k in nt) { const src = this.tiles[k], bt = band.tiles[k]; if (!src || !bt) continue; for (let y = 0; y < oldH; y++) for (let x = 0; x < oldW; x++) nt[k][y * newW + x] = src[y * oldW + x]; if (east) { for (let y = 0; y < oldH; y++) for (let x = 0; x < size; x++) nt[k][y * newW + oldW + x] = bt[y * size + x]; } else { for (let y = 0; y < size; y++) for (let x = 0; x < oldW; x++) nt[k][(oldH + y) * newW + x] = bt[y * oldW + x]; } }
      const remap = (i) => (i == null || i < 0 ? i : ((i / oldW) | 0) * newW + (i % oldW));
      if (newW !== oldW) {
        const seen = new Set();
        for (const a of this.agents.values()) {
          const places = new Map(); for (const p of a.knowledge.places.values()) { p.i = remap(p.i); places.set(LW.Agents.poiKey(p.k, p.i), p); } a.knowledge.places = places;
          if (a.avoid) { const av = {}; for (const key in a.avoid) { const kind = Math.floor(key / 1048576), i = key % 1048576; av[kind * 1048576 + remap(i)] = a.avoid[key]; } a.avoid = av; }
          for (const s of a.memory.social.values()) s.lastTile = remap(s.lastTile);
          for (const m of a.memory.episodic) { if (seen.has(m)) continue; seen.add(m); if (m.tile != null) m.tile = remap(m.tile); }
          for (const m of a.memory.emotional) { if (seen.has(m)) continue; seen.add(m); if (m.tile != null) m.tile = remap(m.tile); }
          if (a.divineRequest && a.divineRequest.tile != null) a.divineRequest.tile = remap(a.divineRequest.tile);
          a.plan = null; a.lastDecisionTick = -1000;
        }
        this.burning = new Set([...this.burning].map(remap)); this.ground = new Map([...this.ground].map(([i, g]) => [remap(i), g]));
        if (this.pathAnnounced) this.pathAnnounced = new Set([...this.pathAnnounced].map(remap));
        if (this.fireStats && this.fireStats.origin >= 0) this.fireStats.origin = remap(this.fireStats.origin);
        if (this.weather && this.weather.lightningTile >= 0) this.weather.lightningTile = remap(this.weather.lightningTile);
        if (this.history) { for (const list of [this.history.feed, this.history.godFeed, this.history.chronicle, this.history.wow]) for (const e of list) if (e.tile != null) e.tile = remap(e.tile); for (const k in this.history.firsts) if (this.history.firsts[k].tile != null) this.history.firsts[k].tile = remap(this.history.firsts[k].tile); }
      }
      this.w = newW; this.h = newH; this.tiles = nt; this._initPathBuffers(); this.reindexBuildings(); this.rebuildBuckets(); this.dirtyTiles = new Set();
      const name = this.language.place();
      this.landmarks.push({ kind: 'land', name, x: east ? oldW + size / 2 : oldW / 2, y: east ? oldH / 2 : oldH + size / 2, tick: this.tick });
      this.events.emit('NewLand', { tick: this.tick, name, side, agentId: explorerId, w: newW, h: newH, tile: this.idx(east ? oldW + (size >> 1) : (oldW >> 1), east ? (oldH >> 1) : oldH + (size >> 1)) });
      return name;
    }
    buildingsNear(x, y, r) { const out = []; for (const b of this.buildings.values()) if (Math.abs(b.x - x) <= r && Math.abs(b.y - y) <= r) out.push(b); return out; }

    // ---- spatial hash for agents (rebuilt each tick)
    rebuildBuckets() {
      this.buckets.clear();
      for (const a of this.agents.values()) { const k = ((a.y | 0) >> 3) * 64 + ((a.x | 0) >> 3); let l = this.buckets.get(k); if (!l) { l = []; this.buckets.set(k, l); } l.push(a); }
    }
    agentsNear(x, y, r, excludeId) {
      const out = []; const bx0 = ((x - r) | 0) >> 3, bx1 = ((x + r) | 0) >> 3, by0 = ((y - r) | 0) >> 3, by1 = ((y + r) | 0) >> 3; const r2 = r * r;
      for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
        const l = this.buckets.get(by * 64 + bx); if (!l) continue;
        for (let i = 0; i < l.length; i++) { const a = l[i]; if (a.id === excludeId) continue; if (LW.dist2(a.x, a.y, x, y) <= r2) out.push(a); }
      }
      return out;
    }

    /** Bounded A* on the tile grid. Returns array of tile indices (excluding start) or null. */
    findPath(sx, sy, tx, ty, maxNodes = 5000) {
      const w = this.w, h = this.h; sx |= 0; sy |= 0; tx |= 0; ty |= 0;
      if (!this.inBounds(tx, ty)) return null;
      const start = this.idx(sx, sy), goal = this.idx(tx, ty);
      if (start === goal) return [];
      if (!this.isPassable(goal)) return null;
      const gen = ++this._pathGen; const G = this._g, FROM = this._from, SEEN = this._seen, CLOSED = this._closed;
      const heap = new BinaryHeap();
      const hx = (i) => { const dx = Math.abs((i % w) - tx), dy = Math.abs(((i / w) | 0) - ty); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
      G[start] = 0; SEEN[start] = gen; FROM[start] = -1; heap.push(hx(start), start);
      let expanded = 0, bestI = start, bestH = hx(start);
      while (heap.size) {
        const i = heap.pop(); if (CLOSED[i] === gen) continue; CLOSED[i] = gen;
        if (i === goal) return this._reconstruct(i, start);
        const hh = hx(i); if (hh < bestH) { bestH = hh; bestI = i; }
        if (++expanded > maxNodes) break;
        const x = i % w, y = (i / w) | 0; const gi = G[i];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx; if (CLOSED[j] === gen) continue;
          const c = this.moveCost(j); if (c === Infinity) continue;
          if (dx && dy) { // no corner cutting through impassable tiles
            if (!this.isPassable(this.idx(x + dx, y)) || !this.isPassable(this.idx(x, y + dy))) continue;
          }
          const g = gi + c * (dx && dy ? 1.414 : 1);
          if (SEEN[j] !== gen || g < G[j]) { SEEN[j] = gen; G[j] = g; FROM[j] = i; heap.push(g + hx(j), j); }
        }
      }
      // partial path toward the closest explored node (keeps agents moving when goal is far/unreachable)
      if (bestI !== start) { const p = this._reconstruct(bestI, start); p.partial = true; return p; }
      return null;
    }
    _reconstruct(i, start) { const out = []; while (i !== start && i >= 0) { out.push(i); i = this._from[i]; } out.reverse(); return out; }

    /** Random passable tile near (x,y) within r */
    randomNear(x, y, r) { for (let k = 0; k < 20; k++) { const nx = LW.clamp((x + this.rng.int(-r, r)) | 0, 0, this.w - 1), ny = LW.clamp((y + this.rng.int(-r, r)) | 0, 0, this.h - 1); const i = this.idx(nx, ny); if (this.isPassable(i)) return i; } return this.idx(x | 0, y | 0); }

    get population() { return this.agents.size; }
    get year() { return LW.Time.year(this.tick); }

    /** Ids of alive agents in a stable order (insertion). */
    agentList() { return [...this.agents.values()]; }
  }

  LW.World = World;
})(globalThis.LW || (globalThis.LW = {}));
