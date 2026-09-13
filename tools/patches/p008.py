PATCHES = [
('src/agents/agent.js', [
("""    knowsPlace(a, kind, idx) { return a.knowledge.places.has(this.poiKey(kind, idx)); },
    rememberPlace(world, a, kind, idx, q) {
      const key = this.poiKey(kind, idx); const cur = a.knowledge.places.get(key);
      if (cur) { cur.q = q; cur.t = world.tick; return; }""",
 """    knowsPlace(a, kind, idx) { return a.knowledge.places.has(this.poiKey(kind, idx)); },
    /** Places that turned out to be unreachable are avoided for a while. */
    avoidPlace(world, a, kind, idx, days = 3) { a.avoid = a.avoid || {}; a.avoid[this.poiKey(kind, idx)] = world.tick + days * TPD; this.forgetPlace(a, kind, idx); },
    isAvoided(world, a, key) { return !!(a.avoid && a.avoid[key] > world.tick); },
    rememberPlace(world, a, kind, idx, q) {
      const key = this.poiKey(kind, idx); const cur = a.knowledge.places.get(key);
      if (cur) { cur.q = q; cur.t = world.tick; return; }
      if (a.avoid && a.avoid[key] > world.tick) return;"""),
("""    nearestPoi(world, a, kind, minQ = 1, maxD = 1e9) {
      let best = null, bd = maxD;
      for (const v of a.knowledge.places.values()) { if (v.k !== kind || v.q < minQ) continue; const x = world.xOf(v.i), y = world.yOf(v.i); const d = LW.dist(a.x, a.y, x + 0.5, y + 0.5); if (d < bd) { bd = d; best = { i: v.i, x, y, q: v.q, d }; } }
      return best;
    },""",
 """    nearestPoi(world, a, kind, minQ = 1, maxD = 1e9) {
      let best = null, bd = maxD;
      for (const v of a.knowledge.places.values()) { if (v.k !== kind || v.q < minQ) continue; const x = world.xOf(v.i), y = world.yOf(v.i); const d = LW.dist(a.x, a.y, x + 0.5, y + 0.5); if (d < bd) { bd = d; best = { i: v.i, x, y, q: v.q, d }; } }
      return best;
    },
    /** Passable tile next to `i` (for water/fish targets), preferring the side the agent is on. */
    tileNear(world, a, i) {
      if (world.isPassable(i)) return i; const x = world.xOf(i), y = world.yOf(i); let best = null, bd = 1e9;
      for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (!world.inBounds(nx, ny)) continue; const j = world.idx(nx, ny); if (!world.isPassable(j)) continue; const d = LW.dist(a.x, a.y, nx + 0.5, ny + 0.5) + r * 0.5; if (d < bd) { bd = d; best = j; } }
      return best;
    },"""),
]),
('src/agents/brain.js', [
("""  function tileNear(world, i) { // passable tile adjacent to i (for water/fish)
    if (world.isPassable(i)) return i; const x = world.xOf(i), y = world.yOf(i);
    for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (world.inBounds(nx, ny) && world.isPassable(world.idx(nx, ny))) return world.idx(nx, ny); }
    return null;
  }""",
 """  let _tileNearAgent = null;
  function tileNear(world, i) { return A().tileNear(world, _tileNearAgent, i); }"""),
("""    decide(world, a, force) {
      const ctx = context(world, a);""",
 """    decide(world, a, force) {
      _tileNearAgent = a;
      const ctx = context(world, a);"""),
]),
('src/agents/actions.js', [
("""        st.retries = (st.retries || 0) + 1; if (st.retries > 4) { if (st.poi) A().forgetPlace(a, st.poi.k, st.poi.i); return FAIL; }
        const p = world.findPath(a.x | 0, a.y | 0, tx, ty, 12000); if (!p) { if (st.poi) A().forgetPlace(a, st.poi.k, st.poi.i); return FAIL; }""",
 """        st.retries = (st.retries || 0) + 1; if (st.retries > 4) { if (st.poi) A().avoidPlace(world, a, st.poi.k, st.poi.i); return FAIL; }
        const p = world.findPath(a.x | 0, a.y | 0, tx, ty, 6000); if (!p) { if (st.poi) A().avoidPlace(world, a, st.poi.k, st.poi.i); else { a.avoidTiles = a.avoidTiles || {}; a.avoidTiles[st.i] = world.tick + 96 * 3; } return FAIL; }"""),
("""    moveTo(world, a, st) {
      const tx = world.xOf(st.i), ty = world.yOf(st.i); const acceptR = st.near ? 1.6 : 0.4;
      if (LW.dist(a.x, a.y, tx + 0.5, ty + 0.5) <= acceptR) return DONE;""",
 """    moveTo(world, a, st) {
      const tx = world.xOf(st.i), ty = world.yOf(st.i); const acceptR = st.near ? 1.6 : 0.4;
      if (LW.dist(a.x, a.y, tx + 0.5, ty + 0.5) <= acceptR) return DONE;
      if (a.avoidTiles && a.avoidTiles[st.i] > world.tick) return FAIL;"""),
]),
]
