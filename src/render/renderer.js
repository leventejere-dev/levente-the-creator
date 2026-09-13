/* LEVENTE — THE CREATOR · render/renderer.js — Canvas 2D pixel renderer: baked terrain, dynamic layer, weather, day/night lighting, labels, minimap */
(function (LW) {
  'use strict';
  const PX = LW.Sprites.PX;
  const ZOOMS = [3, 4, 6, 8, 12, 16, 24, 32, 48, 64];

  class Renderer {
    constructor(canvas, minimap, world) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.minimap = minimap; this.mctx = minimap ? minimap.getContext('2d') : null;
      this.world = world;
      this.cam = { x: world.genesis.x + 0.5, y: world.genesis.y + 0.5, zoom: 16 };
      this.follow = null; this.selected = null; this.hover = null; this.godCursor = null; this.frame = 0;
      this.terrain = document.createElement('canvas'); this.terrain.width = world.w * PX; this.terrain.height = world.h * PX; this.tctx = this.terrain.getContext('2d');
      this.light = document.createElement('canvas'); this.lctx = this.light.getContext('2d');
      this.rain = []; this.flash = 0; this.lastTickDrawn = -1; this.perf = { ms: 0 };
      this.bakeAll();
    }
    setWorld(world) { this.world = world; this.terrain.width = world.w * PX; this.terrain.height = world.h * PX; this.cam = { x: world.genesis.x + 0.5, y: world.genesis.y + 0.5, zoom: 16 }; this.follow = null; this.selected = null; this.bakeAll(); }
    bakeAll() { const w = this.world; for (let i = 0; i < w.w * w.h; i++) this.bakeTile(i); w.dirtyTiles.clear(); this.bakeMinimapBase(); }
    bakeTile(i) {
      const w = this.world; const x = w.xOf(i), y = w.yOf(i); const px = x * PX, py = y * PX;
      LW.Sprites.tile(this.tctx, w, i, px, py);
      const b = w.buildingAt(i); if (b) { if (b.w > 1 || b.h > 1) { for (const j of w.buildingTiles(b)) if (j !== i) LW.Sprites.tile(this.tctx, w, j, w.xOf(j) * PX, w.yOf(j) * PX); } LW.Sprites.building(this.tctx, b, b.x * PX, b.y * PX, w.tick); }
    }
    bakeMinimapBase() {
      if (!this.minimap) return; const w = this.world; const mm = document.createElement('canvas'); mm.width = w.w; mm.height = w.h; const c = mm.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(this.terrain, 0, 0, w.w, w.h); this.minimapBase = mm;
    }
    // ---- camera
    zoomIn() { const i = ZOOMS.indexOf(this.cam.zoom); this.cam.zoom = ZOOMS[Math.min(ZOOMS.length - 1, i + 1)]; }
    zoomOut() { const i = ZOOMS.indexOf(this.cam.zoom); this.cam.zoom = ZOOMS[Math.max(0, i - 1)]; }
    zoomAt(sx, sy, dir) { const before = this.screenToWorld(sx, sy); if (dir > 0) this.zoomIn(); else this.zoomOut(); const after = this.screenToWorld(sx, sy); this.cam.x += before.x - after.x; this.cam.y += before.y - after.y; this.clampCam(); }
    pan(dx, dy) { this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom; this.follow = null; this.clampCam(); }
    clampCam() { const w = this.world; this.cam.x = LW.clamp(this.cam.x, 0, w.w); this.cam.y = LW.clamp(this.cam.y, 0, w.h); }
    centerOn(x, y) { this.cam.x = x; this.cam.y = y; this.clampCam(); }
    overview() { const w = this.world; this.cam.x = w.w / 2; this.cam.y = w.h / 2; this.cam.zoom = ZOOMS[0]; this.follow = null; }
    screenToWorld(sx, sy) { const z = this.cam.zoom; return { x: this.cam.x + (sx - this.canvas.width / 2) / z, y: this.cam.y + (sy - this.canvas.height / 2) / z }; }
    worldToScreen(x, y) { const z = this.cam.zoom; return { x: (x - this.cam.x) * z + this.canvas.width / 2, y: (y - this.cam.y) * z + this.canvas.height / 2 }; }
    /** What is under a screen point: agent, building or tile. */
    pick(sx, sy) {
      const w = this.world; const p = this.screenToWorld(sx, sy); let best = null, bd = 0.6 + 6 / this.cam.zoom;
      for (const a of w.agents.values()) { const d = LW.dist(a.x, a.y - 0.4, p.x, p.y); if (d < bd) { bd = d; best = a; } }
      if (best) return { agent: best };
      const i = w.inBounds(p.x | 0, p.y | 0) ? w.idx(p.x | 0, p.y | 0) : -1; if (i < 0) return null;
      const b = w.buildingAt(i); if (b) return { building: b, tile: i };
      return { tile: i };
    }
    lodLevel() { const z = this.cam.zoom; return z >= 24 ? 'micro' : z >= 12 ? 'local' : z >= 6 ? 'city' : 'region'; }

    // ---- frame
    draw(sim, audioEnv) {
      const t0 = performance.now(); const w = this.world, c = this.ctx, cv = this.canvas; const z = this.cam.zoom; this.frame++;
      if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; this.light.width = cv.width; this.light.height = cv.height; }
      if (this.terrain.width !== w.w * PX || this.terrain.height !== w.h * PX) { this.terrain.width = w.w * PX; this.terrain.height = w.h * PX; this.bakeAll(); } // a világ tágult
      if (this.follow) { const a = w.agents.get(this.follow); if (a) { this.cam.x += (a.x - this.cam.x) * 0.15; this.cam.y += (a.y - this.cam.y) * 0.15; } else this.follow = null; }
      // re-bake dirty tiles (bounded per frame)
      let n = 0; for (const i of w.dirtyTiles) { this.bakeTile(i); w.dirtyTiles.delete(i); if (++n > 3000) break; }
      if (this.frame % 300 === 0) this.bakeMinimapBase();
      c.fillStyle = '#07080c'; c.fillRect(0, 0, cv.width, cv.height);
      c.imageSmoothingEnabled = z < PX; c.imageSmoothingQuality = 'high'; // kicsinyítve simítva, nagyítva éles képpontok
      // visible world rect
      const vw = cv.width / z, vh = cv.height / z; const x0 = this.cam.x - vw / 2, y0 = this.cam.y - vh / 2;
      const sx = Math.floor(x0 * PX), sy = Math.floor(y0 * PX); const dx = -(x0 * PX - sx) * (z / PX), dy = -(y0 * PX - sy) * (z / PX);
      c.drawImage(this.terrain, sx, sy, Math.ceil(vw * PX) + PX, Math.ceil(vh * PX) + PX, dx, dy, (Math.ceil(vw * PX) + PX) * (z / PX), (Math.ceil(vh * PX) + PX) * (z / PX));
      c.imageSmoothingEnabled = false;
      const tx0 = Math.max(0, Math.floor(x0) - 1), ty0 = Math.max(0, Math.floor(y0) - 1), tx1 = Math.min(w.w - 1, Math.ceil(x0 + vw) + 1), ty1 = Math.min(w.h - 1, Math.ceil(y0 + vh) + 1);
      const S = z / PX; // sprite scale
      const lod = this.lodLevel();
      // ground items
      if (lod !== 'region' && w.ground) for (const [i, g] of w.ground) { const gx = w.xOf(i), gy = w.yOf(i); if (gx < tx0 || gx > tx1 || gy < ty0 || gy > ty1) continue; const s = this.worldToScreen(gx, gy); c.save(); c.translate(s.x, s.y); c.scale(S, S); LW.Sprites.itemPile(c, 0, 0, g); c.restore(); }
      // víz-csillogás: a napfény mozog a hullámokon
      if (lod !== 'region') { const t = w.tiles; const ph = this.frame >> 2; c.fillStyle = 'rgba(255,255,255,0.35)'; for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const i = w.idx(tx, ty); if (!w.isWater(i)) continue; const hh = hashi(i * 7 + (ph >> 2)); if ((hh & 7) !== 0) continue; const ox = ((hh >> 3) + ph) & 15, oy = (hh >> 7) & 15; const s2 = this.worldToScreen(tx + ox / 16, ty + oy / 16); c.fillRect(s2.x, s2.y, Math.max(1, S * 3), Math.max(1, S)); } }
      // vadak: a mezők állatállománya látható (legelő csapatok; éjjel ragadozók a veszélyes helyeken)
      if (lod !== 'region') { const B = LW.BIOME; const t = w.tiles; const night = LW.Time.isNight(w.tick); const step = w.tick >> 3;
        for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const i = w.idx(tx, ty); const an = t.animals[i]; const hi = hashi(i);
          const pred = night && t.danger[i] > 110 && hashi(i * 13 + (w.tick >> 5)) % 29 === 0;
          if (!pred && (an < 70 || hi % 9 !== 0)) continue; if (w.isWater(i) || w.buildingAt(i) || t.fire[i]) continue;
          const n = pred ? 1 : an > 150 ? 3 : an > 110 ? 2 : 1; const b = t.biome[i];
          for (let k = 0; k < n; k++) { const hh = hashi(i * 31 + step * 7 + k * 101); const hs = hashi(i * 17 + k * 53); const ox = ((hs & 7) + (hh & 3)) & 15, oy = (((hs >> 3) & 7) + ((hh >> 2) & 3)) & 15; const kind = pred ? 'wolf' : (b === B.FOREST || b === B.DENSE_FOREST) ? ((hs >> 6) & 1 ? 'boar' : 'deer') : (b === B.GRASSLAND || b === B.SAVANNA) ? ((hs >> 6) % 3 === 0 ? 'hare' : 'deer') : 'deer'; const moving = ((hh >> 5) & 3) === 0; const s2 = this.worldToScreen(tx + ox / 16, ty + oy / 16); c.save(); c.translate(s2.x, s2.y); c.scale(S, S); LW.Sprites.animal(c, kind, -8, -8, moving ? ((this.frame >> 3) & 1) : 0, (hs >> 8) & 1, night); c.restore(); }
        } }
      // wildfire flames
      for (const i of w.burning) { const fx = w.xOf(i), fy = w.yOf(i); if (fx < tx0 || fx > tx1 || fy < ty0 || fy > ty1) continue; const s = this.worldToScreen(fx, fy); c.save(); c.translate(s.x, s.y); c.scale(S, S); LW.Sprites.wildfire(c, 0, 0, w.tick + this.frame, w.tiles.fire[i] / 255); c.restore(); }
      // campfire flames & manifestations glow
      for (const b of w.buildings.values()) { if (b.x < tx0 || b.x > tx1 || b.y < ty0 || b.y > ty1) continue; if (b.kind === 'campfire' && b.lit && b.progress >= 1) { const s = this.worldToScreen(b.x, b.y); c.save(); c.translate(s.x, s.y); c.scale(S, S); LW.Sprites.flame(c, 0, 0, w.tick + (this.frame >> 2)); c.restore(); } }
      // agents (sorted by y for overlap)
      const agents = []; for (const a of w.agents.values()) if (a.x >= tx0 && a.x <= tx1 && a.y >= ty0 && a.y <= ty1) agents.push(a);
      agents.sort((p, q) => p.y - q.y);
      for (const a of agents) {
        const s = this.worldToScreen(a.x, a.y);
        if (lod === 'region') { c.fillStyle = '#ffe9a8'; c.fillRect(s.x - 1, s.y - 1, 2, 2); continue; }
        const stage = LW.Agents.stage(w, a); const moving = a.plan && !a.plan.done && a.plan.steps[a.plan.i] && (a.plan.steps[a.plan.i].op === 'moveTo' || a.plan.steps[a.plan.i].op === 'follow' || a.plan.steps[a.plan.i].op === 'flee');
        const frame = moving ? [1, 0, 2, 0][(this.frame >> 2) & 3] : 0; const spr = LW.Sprites.agent(a, stage, frame, a.facing, a.sleeping);
        const sw = spr.width * S, sh = spr.height * S;
        if (this.selected === a.id) { c.strokeStyle = '#ffd37a'; c.lineWidth = 2; c.beginPath(); c.ellipse(s.x, s.y + S * 1.5, Math.max(6, S * 7), Math.max(3, S * 3), 0, 0, Math.PI * 2); c.stroke(); }
        c.drawImage(spr, Math.round(s.x - sw / 2), Math.round(s.y - sh + S * 2), Math.max(1, Math.round(sw)), Math.max(1, Math.round(sh)));
        // carrying / status hints at close zoom
        if (lod === 'micro') { if (a.inv.wood) { c.fillStyle = '#7a4a22'; c.fillRect(s.x + sw * 0.3, s.y - sh * 0.8, S * 2, S * 7); } if (a.pregnancy && (w.tick - a.pregnancy.since) > 96 * 120) { c.fillStyle = '#ffb0c0'; c.fillRect(s.x - S * 1.5, s.y - sh - S * 3, S * 3, S * 1.5); } }
        if (a.divineRequest) { c.fillStyle = 'rgba(255,230,140,0.9)'; c.beginPath(); c.arc(s.x, s.y - sh - S * 4, Math.max(2, S * 2.4), 0, Math.PI * 2); c.fill(); }
      }
      // weather particles
      this.drawWeather(c, cv, z);
      // night & light
      this.drawLight(c, cv, z, tx0, ty0, tx1, ty1);
      // god cursor preview
      if (this.godCursor && this.hover) { const p = this.hover; const s = this.worldToScreen(p.x | 0, p.y | 0); c.strokeStyle = 'rgba(255,220,120,0.9)'; c.lineWidth = 2; c.strokeRect(s.x, s.y, z, z); const r = this.godCursor.radius || 0; if (r) { c.strokeStyle = 'rgba(255,220,120,0.4)'; c.beginPath(); c.arc(s.x + z / 2, s.y + z / 2, r * z, 0, Math.PI * 2); c.stroke(); } }
      // labels
      this.drawLabels(c, z, lod);
      this.drawMinimap();
      if (audioEnv) this.fillAudioEnv(audioEnv, tx0, ty0, tx1, ty1);
      this.perf.ms = this.perf.ms * 0.9 + (performance.now() - t0) * 0.1;
    }
    drawWeather(c, cv, z) {
      const w = this.world; const wx = w.weather; const i = w.idx(LW.clamp(this.cam.x | 0, 0, w.w - 1), LW.clamp(this.cam.y | 0, 0, w.h - 1));
      const rain = w.rainAt(i); const temp = w.tileTemp(i); const snow = temp < 0.5;
      if (rain > 0.05) {
        const n = Math.round(rain * cv.width * cv.height / 2500); const wind = wx.wind;
        c.strokeStyle = snow ? 'rgba(240,244,255,0.8)' : 'rgba(180,200,240,0.45)'; c.lineWidth = snow ? 2 : 1; c.beginPath();
        for (let k = 0; k < n; k++) { const x = (hashf(k * 7 + this.frame * 3) * cv.width), y = ((hashf(k * 13 + this.frame * 5) * cv.height + this.frame * (snow ? 2 : 14)) % cv.height); if (snow) { c.moveTo(x, y); c.lineTo(x + 1, y + 1); } else { c.moveTo(x, y); c.lineTo(x + wind.x * 3 * wind.speed, y + 8); } }
        c.stroke();
      }
      const st = wx.effectiveState().state;
      if (st === 'fog') { c.fillStyle = 'rgba(220,225,235,0.28)'; c.fillRect(0, 0, cv.width, cv.height); }
      if (st === 'storm') { c.fillStyle = 'rgba(20,24,40,0.25)'; c.fillRect(0, 0, cv.width, cv.height); }
      if (wx.lastLightning >= 0 && w.tick - wx.lastLightning <= 1 && this.lastLightningShown !== wx.lastLightning) { this.flash = 3; this.lastLightningShown = wx.lastLightning; }
      if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${0.25 * this.flash})`; c.fillRect(0, 0, cv.width, cv.height); this.flash--; }
    }
    drawLight(c, cv, z, tx0, ty0, tx1, ty1) {
      const w = this.world; const day = LW.Time.dayFactor(w.tick); const night = 1 - day;
      const wx = w.weather; const gloom = wx.cloud * 0.18;
      if (night < 0.02 && gloom < 0.05) return;
      const l = this.lctx; l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, cv.width, cv.height);
      const h = LW.Time.hour(w.tick); const dusk = day > 0.05 && day < 0.9;
      const alpha = Math.min(0.62, night * 0.58 + gloom);
      l.fillStyle = dusk ? `rgba(36,16,48,${alpha})` : `rgba(8,12,44,${alpha})`; l.fillRect(0, 0, cv.width, cv.height);
      if (dusk && night > 0.2) { l.fillStyle = `rgba(255,120,40,${0.12 * (1 - Math.abs(night - 0.5) * 2)})`; l.fillRect(0, 0, cv.width, cv.height); }
      // light sources cut holes
      l.globalCompositeOperation = 'destination-out';
      const src = [];
      for (const b of w.buildings.values()) { if (b.x < tx0 - 4 || b.x > tx1 + 4 || b.y < ty0 - 4 || b.y > ty1 + 4) continue; const def = LW.Buildings.def(b); if (b.kind === 'campfire' && b.lit && b.progress >= 1) src.push([b.x + 0.5, b.y + 0.5, 3.5 + (this.frame & 3) * 0.1, 1]); else if (def.light && (def.divine || (b.residents.length && b.progress >= 1))) src.push([b.x + 0.5, b.y + 0.5, def.divine ? 4 : 1.6, def.light]); }
      for (const i of w.burning) src.push([w.xOf(i) + 0.5, w.yOf(i) + 0.5, 3, 1]);
      for (const [x, y, r, k] of src) { const s = this.worldToScreen(x, y); const g = l.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * z); g.addColorStop(0, `rgba(0,0,0,${Math.min(1, k)})`); g.addColorStop(0.5, `rgba(0,0,0,${Math.min(1, k) * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = g; l.beginPath(); l.arc(s.x, s.y, r * z, 0, Math.PI * 2); l.fill(); }
      c.drawImage(this.light, 0, 0);
      // warm glow
      c.globalCompositeOperation = 'lighter';
      for (const [x, y, r, k] of src) { const s = this.worldToScreen(x, y); const g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * z * 0.8); g.addColorStop(0, `rgba(255,170,70,${0.22 * k * night})`); g.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(s.x, s.y, r * z, 0, Math.PI * 2); c.fill(); }
      c.globalCompositeOperation = 'source-over';
    }
    drawLabels(c, z, lod) {
      const w = this.world; c.font = `${Math.max(11, Math.min(16, z))}px "Segoe UI", system-ui, sans-serif`; c.textAlign = 'center';
      for (const s of w.settlements.values()) { if (s.abandonedTick) continue; const p = this.worldToScreen(s.x + 0.5, s.y - 1.2); if (p.x < -100 || p.x > c.canvas.width + 100 || p.y < -50 || p.y > c.canvas.height + 50) continue; const label = `${s.name}`; const sub = `${LW.HU.tier(s.tier)} · ${s.population} lakó`; c.fillStyle = 'rgba(0,0,0,0.55)'; const tw = Math.max(c.measureText(label).width, c.measureText(sub).width) + 14; c.fillRect(p.x - tw / 2, p.y - 26, tw, 30); c.fillStyle = '#f1e5c4'; c.fillText(label, p.x, p.y - 13); c.fillStyle = '#bdb090'; c.font = `${Math.max(9, Math.min(12, z * 0.8))}px "Segoe UI", system-ui, sans-serif`; c.fillText(sub, p.x, p.y - 1); c.font = `${Math.max(11, Math.min(16, z))}px "Segoe UI", system-ui, sans-serif`; }
      if (lod !== 'region') for (const a of w.agents.values()) { if (a.id !== this.selected && !(this.hoverAgent === a.id)) continue; const p = this.worldToScreen(a.x, a.y); c.fillStyle = 'rgba(0,0,0,0.6)'; const tw = c.measureText(a.name).width + 10; c.fillRect(p.x - tw / 2, p.y - z * 2.2 - 16, tw, 16); c.fillStyle = a.id === this.selected ? '#ffd37a' : '#eee'; c.fillText(a.name, p.x, p.y - z * 2.2 - 4); }
      // beszédbuborék: aki az imént szólt, annak a szavai egy pillanatra látszanak (közelről)
      if (z >= 10) { c.font = `italic ${Math.max(10, Math.min(13, z * 0.9))}px "Segoe UI", system-ui, sans-serif`; for (const a of w.agents.values()) { const u = a.lastSaid; if (!u || w.tick - u.t > 6 || (!u.w.length && !u.g.length)) continue; const p = this.worldToScreen(a.x, a.y); if (p.x < -60 || p.x > c.canvas.width + 60 || p.y < -30 || p.y > c.canvas.height + 30) continue; const txt = u.w.length ? u.w.map((x) => x[1]).join(' ') : '…'; const tw = c.measureText(txt).width + 12; const y = p.y - z * 2.2 - (a.id === this.selected || this.hoverAgent === a.id ? 34 : 18); c.fillStyle = 'rgba(245,238,220,0.92)'; c.fillRect(p.x - tw / 2, y - 12, tw, 16); c.fillStyle = '#2a2418'; c.fillText(txt, p.x, y); } c.font = `${Math.max(11, Math.min(16, z))}px "Segoe UI", system-ui, sans-serif`; }
    }
    drawMinimap() {
      if (!this.mctx || !this.minimapBase) return; const w = this.world; const m = this.mctx; const cv = this.minimap; m.imageSmoothingEnabled = false;
      m.drawImage(this.minimapBase, 0, 0, cv.width, cv.height); const kx = cv.width / w.w, ky = cv.height / w.h;
      m.fillStyle = '#ff9a3a'; for (const i of w.burning) m.fillRect(w.xOf(i) * kx, w.yOf(i) * ky, kx, ky);
      m.fillStyle = '#fff0b0'; for (const a of w.agents.values()) m.fillRect(a.x * kx - 1, a.y * ky - 1, 2, 2);
      m.fillStyle = '#ffd37a'; for (const s of w.settlements.values()) if (!s.abandonedTick) m.fillRect(s.x * kx - 2, s.y * ky - 2, 4, 4);
      const vw = this.canvas.width / this.cam.zoom, vh = this.canvas.height / this.cam.zoom; m.strokeStyle = 'rgba(255,255,255,0.8)'; m.lineWidth = 1; m.strokeRect((this.cam.x - vw / 2) * kx, (this.cam.y - vh / 2) * ky, vw * kx, vh * ky);
    }
    fillAudioEnv(env, tx0, ty0, tx1, ty1) {
      const w = this.world; const i = w.idx(LW.clamp(this.cam.x | 0, 0, w.w - 1), LW.clamp(this.cam.y | 0, 0, w.h - 1));
      env.rain = w.rainAt(i); env.wind = w.weather.wind.speed; env.night = 1 - LW.Time.dayFactor(w.tick); env.warm = w.tileTemp(i) > 8;
      let fire = 0; for (const b of w.buildings.values()) if (b.kind === 'campfire' && b.lit && b.x >= tx0 && b.x <= tx1 && b.y >= ty0 && b.y <= ty1) { const d = LW.dist(b.x, b.y, this.cam.x, this.cam.y); fire = Math.max(fire, LW.clamp01(1 - d / 12) * Math.min(1, this.cam.zoom / 12)); }
      for (const i2 of w.burning) { const d = LW.dist(w.xOf(i2), w.yOf(i2), this.cam.x, this.cam.y); fire = Math.max(fire, LW.clamp01(1 - d / 20)); }
      env.fire = fire;
    }
  }
  function hashi(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return h >>> 0; }
  function hashf(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
  LW.Renderer = Renderer; LW.ZOOMS = ZOOMS;
})(globalThis.LW || (globalThis.LW = {}));
