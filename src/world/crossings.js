/* LEVENTE — THE CREATOR · world/crossings.js — átkelők: hidak folyón és tengerszoroson, alagút a hegyen át
 * A víz és a csúcs járhatatlan, amíg valaki át nem hidalja. A híd egy vonalnyi mező: attól kezdve járható és olcsó.
 * Hol akarnak hidat? Ahol a túlparton olyan föld van, ahová gyalog nem jutnak el (sziget), vagy ahol egy folyó
 * kettévág egy közösséget. Semmi sincs megírva: a lehetőség a térképből, a vágy a tudásból és a szükségből születik.
 */
(function (LW) {
  'use strict';
  const B = () => LW.Buildings.DEFS; const T = LW.TIME;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const Crossings = {
    /** Járható-e egy mező átkelővel együtt (a világ isPassable ezt hívja). */
    passable(world, i) { return world.tiles.bridge && world.tiles.bridge[i] > 0; },
    /** Az összefüggő szárazföld-darabok címkéi (átkelőkkel együtt); a hidak megépültével újraszámolva. */
    components(world) {
      if (world._comp && world._compGen === (world._crossGen || 0) && world._comp.length === world.w * world.h) return world._comp;
      const w = world.w, h = world.h, n = w * h; const comp = new Int32Array(n); let next = 0; const stack = [];
      for (let s = 0; s < n; s++) {
        if (comp[s] || !world.isPassable(s)) continue; next++; comp[s] = next; stack.push(s);
        while (stack.length) { const i = stack.pop(); const x = i % w, y = (i / w) | 0; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (comp[j] || !world.isPassable(j)) continue; comp[j] = next; stack.push(j); } }
      }
      world._comp = comp; world._compGen = world._crossGen || 0; world._compCount = next; return comp;
    },
    invalidate(world) { world._crossGen = (world._crossGen || 0) + 1; },
    /** Mit hidal át egy fajta: víz (folyó, tó, tenger) vagy hegy (csúcs, hegység). */
    crosses(def, world, i) { const bio = world.tiles.biome[i]; const Bm = LW.BIOME; if (def.over === 'mountain') return bio === Bm.PEAK; if (def.over === 'river') return bio === Bm.RIVER; return bio === Bm.RIVER || bio === Bm.LAKE || bio === Bm.OCEAN; },
    /** Egy jó átkelőhely a közelben: { shore, x, y, w, h, joins, len } vagy null. Emberenként naponta egyszer keres (drága). */
    candidate(world, a, kind) {
      const def = B()[kind]; if (!def || !def.bridge) return null;
      const day = world.tick / T.TICKS_PER_DAY | 0; a._bridgeC = a._bridgeC || {}; const c = a._bridgeC[kind]; if (c && c.day === day) return c.site;
      const site = this.search(world, a.x | 0, a.y | 0, def); a._bridgeC[kind] = { day, site }; return site;
    },
    search(world, ax, ay, def) {
      const w = world.w, h = world.h, t = world.tiles, rng = world.rng; const comp = this.components(world); const span = def.span || 4; const R = 14;
      let best = null, bs = 0;
      for (let k = 0; k < 36; k++) {
        const x = LW.clamp(ax + rng.int(-R, R), 1, w - 2), y = LW.clamp(ay + rng.int(-R, R), 1, h - 2); const i = y * w + x;
        if (!world.isPassable(i) || t.bridge[i]) continue; const own = comp[i];
        if (world.buildingsNear(x, y, 3).some((b) => { const d = B()[b.kind]; return d && d.bridge; })) continue; // egy átkelő elég egy helyre
        for (const [dx, dy] of DIRS) {
          let len = 0, nx = x + dx, ny = y + dy, j = -1, ok = true;
          while (len < span) { if (nx < 0 || ny < 0 || nx >= w || ny >= h) { ok = false; break; } j = ny * w + nx; if (world.isPassable(j) && !t.bridge[j]) break; if (!this.crosses(def, world, j) || t.bridge[j] || world.buildingAt(j)) { ok = false; break; } len++; nx += dx; ny += dy; }
          if (!ok || len === 0 || len >= span || j < 0 || !world.isPassable(j) || t.bridge[j]) continue;
          const joins = comp[j] !== own; let s = joins ? 3 : (def.over === 'river' || t.biome[i + dx + dy * w] === LW.BIOME.RIVER ? 1 : 0); if (!s) continue;
          // a túlpart értéke: fa, növény, ismert lelőhely; és a rövidebb híd jobb
          let value = 0; for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) { const px = nx + xx, py = ny + yy; if (px < 0 || py < 0 || px >= w || py >= h) continue; const q = py * w + px; if (!world.isPassable(q)) continue; value += (t.treeCap[q] + t.vegCap[q]) / 255 * 0.02 + (t.depType[q] ? 0.3 : 0) + (comp[q] === own ? 0 : 0.01); }
          s += Math.min(2, value) - len * 0.08 - LW.dist(x, y, ax, ay) * 0.02;
          if (s > bs) { bs = s; best = { shore: i, x: dx < 0 ? x - len : dy < 0 ? x : x + dx, y: dy < 0 ? y - len : dx < 0 ? y : y + dy, w: dx ? len : 1, h: dy ? len : 1, dir: dx ? 'h' : 'v', joins, len, far: j }; }
        }
      }
      return best;
    },
    /** Elkészült átkelő: a mezők járhatók lesznek; ha két külön földet kötött össze, az a krónikába kerül. */
    onComplete(world, b, a) {
      const def = B()[b.kind]; if (!def || !def.bridge) return;
      const comp = this.components(world); const ends = this.ends(world, b); const joined = ends.length === 2 && comp[ends[0]] !== comp[ends[1]];
      for (const i of world.buildingTiles(b)) { world.tiles.bridge[i] = def.bridge; world.dirtyTiles.add(i); }
      this.invalidate(world);
      world.events.emit('CrossingBuilt', { tick: world.tick, agentId: a ? a.id : null, kind: b.kind, buildingId: b.id, len: Math.max(b.w || 1, b.h || 1), joined, tunnel: def.over === 'mountain', tile: world.idx(b.x, b.y) });
      if (joined) { for (const o of world.agentsNear(b.x + 0.5, b.y + 0.5, 20)) { o.emotions.excitement = LW.clamp01(o.emotions.excitement + 0.3); o.emotions.pride = LW.clamp01(o.emotions.pride + 0.15); LW.Agents.memory(world, o, { type: 'built', text: def.over === 'mountain' ? 'átfúrták a hegyet: a túloldal a miénk lett' : 'híd épült a túlpartra: a sziget a miénk lett', importance: 0.7, emotion: 'excitement', intensity: 0.6, tile: world.idx(b.x, b.y) }); } }
    },
    onDestroy(world, b) { const def = B()[b.kind]; if (!def || !def.bridge || !world.tiles.bridge) return; for (const i of world.buildingTiles(b)) { world.tiles.bridge[i] = 0; world.dirtyTiles.add(i); } this.invalidate(world); },
    /** A híd két végén lévő szárazföldi mezők. */
    ends(world, b) { const out = []; const w = b.w || 1, h = b.h || 1; const horiz = b.dir ? b.dir === 'h' : w > 1; const cand = horiz ? [[b.x - 1, b.y], [b.x + w, b.y]] : [[b.x, b.y - 1], [b.x, b.y + h]]; for (const [x, y] of cand) if (world.inBounds(x, y) && world.isPassable(world.idx(x, y))) out.push(world.idx(x, y)); return out; },
    /** A közösség vágya egy átkelőre: van-e jó hely, és összeköt-e valamit. */
    want(world, a, kind) { const site = this.candidate(world, a, kind); if (!site) return 0; return site.joins ? 1.6 + a.personality.curiosity * 0.4 + a.personality.ambition * 0.3 : 0.7 + a.personality.discipline * 0.2; },
  };
  LW.Crossings = Crossings;
})(globalThis.LW || (globalThis.LW = {}));
