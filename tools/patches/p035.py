PATCHES = [
('src/render/sprites.js', [
("""        case 'avatar': s('rgba(255,240,200,0.4)', 3, 1, 10, 14); s('#fff7d0', 6, 1, 4, 4); s('#ffe8a0', 5, 5, 6, 7); s('#ffd070', 6, 12, 4, 3); break;
      }
    },""",
 """        case 'avatar': s('rgba(255,240,200,0.4)', 3, 1, 10, 14); s('#fff7d0', 6, 1, 4, 4); s('#ffe8a0', 5, 5, 6, 7); s('#ffd070', 6, 12, 4, 3); break;
        default: generic(ctx, b, LW.Buildings.DEFS[b.kind] || {}, px, py, tick, night);
      }
    },"""),
("""  function baseColor(world, i, b) {""",
 """  // ---------------------------------------------------------------- épületek általános rajza (több mezős is)
  const STYLE = {
    granary: { wall: '#8a6a3c', roof: '#6a4a26', door: '#3a2a1a' }, well: { special: 'well' }, orchard: { special: 'orchard' }, pasture: { special: 'pasture' },
    kiln: { special: 'kiln' }, furnace: { special: 'furnace' }, forge: { wall: '#6a6a66', roof: '#4a3a2a', chimney: 1, glow: true, door: '#2a1a10' }, workshop: { wall: '#8a6a44', roof: '#5a4a30', door: '#3a2a1a', sign: '#c9a86a' },
    shrine: { special: 'shrine' }, temple: { wall: '#c8c0a8', roof: '#8a7048', columns: true }, archive: { wall: '#a08858', roof: '#6a5638', door: '#3a2a1a', sign: '#e0d8c0' }, library: { wall: '#9a8a6a', roof: '#4a3a2a', windows: '#f0e0a0', sign: '#e0d8c0' },
    school: { wall: '#b0986a', roof: '#7a5a34', windows: '#f4e8b0' }, university: { wall: '#c8c0b0', roof: '#5a4a3a', columns: true, windows: '#f4e8b0' }, market: { special: 'market' }, mill: { special: 'mill' }, irrigation: { special: 'irrigation' },
    brick_house: { wall: '#a4563c', roof: '#5a3a26', door: '#3a2a1a', windows: '#ffd070' }, town_house: { wall: '#b06a4a', roof: '#4a3a3a', door: '#3a2a1a', windows: '#ffd070', floors: 2 }, modern_house: { wall: '#d8d4cc', roof: '#6a6a70', door: '#3a3a44', windows: '#a0d0ff', flat: true },
    printing_house: { wall: '#8a7a5a', roof: '#4a3a2a', door: '#2a1a10', sign: '#2a2a2a' }, lab: { wall: '#e8e8e4', roof: '#7a8a9a', windows: '#a0d0ff', flat: true }, factory: { wall: '#8a4a3a', roof: '#4a4a4a', chimney: 2, smoke: true, windows: '#c0c0c0' },
    power_plant: { wall: '#9a9a96', roof: '#5a5a5a', chimney: 3, smoke: true, glow: true, bolt: true }, hospital: { wall: '#f0f0ec', roof: '#c8d8e8', windows: '#a0d0ff', cross: true, flat: true }, computer_center: { wall: '#2a3a5a', roof: '#1a2438', lights: true, flat: true },
    data_center: { wall: '#1a2434', roof: '#101820', lights: true, flat: true }, simulation_core: { special: 'core' },
  };
  function generic(ctx, b, def, px, py, tick, night) {
    const W = (b.w || 1) * PX, H = (b.h || 1) * PX; const st = STYLE[b.kind] || { wall: '#8a7a5a', roof: '#5a4a3a', door: '#2a1a10' }; const done = b.progress >= 1;
    const s = (col, x, y, w, h) => { ctx.fillStyle = typeof col === 'string' ? col : rgb(col); ctx.fillRect(px + x, py + y, w, h); };
    const f = (tick >> 2) & 3;
    s('rgba(0,0,0,0.25)', 1, H - 3, W - 2, 3);
    if (st.special === 'well') { s('#8a8a86', 3, 7, 10, 7); s('#6a6a66', 4, 8, 8, 5); s('#3a5a8a', 5, 9, 6, 3); s('#7a5a34', 2, 2, 2, 8); s('#7a5a34', 12, 2, 2, 8); s('#5a3c22', 2, 1, 12, 2); s('#8a6a3c', 7, 3, 2, 5); }
    else if (st.special === 'orchard') { for (const [tx, ty] of [[6, 8], [22, 9], [7, 24], [23, 23]]) { s('rgba(0,0,0,0.2)', tx - 4, ty + 5, 9, 2); s('#5a3a20', tx - 1, ty + 1, 2, 5); s('#2e7a36', tx - 5, ty - 5, 10, 9); s('#3e9a44', tx - 4, ty - 6, 8, 8); s('#66b85a', tx - 3, ty - 5, 4, 3); if (b.planted && b.crop > 0.5) { s('#d0302a', tx - 3, ty - 2, 2, 2); s('#d0302a', tx + 1, ty - 4, 2, 2); s('#e05040', tx, ty, 2, 2); } } }
    else if (st.special === 'pasture') { s('#6a8a44', 1, 1, W - 2, H - 2); for (let x = 1; x < W - 1; x += 4) { s('#8a6a3c', x, 1, 1, 4); s('#8a6a3c', x, H - 5, 1, 4); } s('#8a6a3c', 1, 2, W - 2, 1); s('#8a6a3c', 1, H - 3, W - 2, 1); for (let y = 1; y < H - 1; y += 4) { s('#8a6a3c', 1, y, 1, 3); s('#8a6a3c', W - 2, y, 1, 3); } Sprites.animal(ctx, 'deer', px + 4, py + 6, f & 1, 1, false); Sprites.animal(ctx, 'boar', px + 14, py + 14, f >> 1, 0, false); }
    else if (st.special === 'kiln' || st.special === 'furnace') { const big = st.special === 'furnace'; s('#7a6a5a', 3, 4, 10, 11); s('#9a8a78', 4, 5, 8, 9); s('#5a4a3a', 6, 0, 4, 5); if (done) { s(['#ffb040', '#ff7a2a', '#ffd060', '#ff8a30'][f], 6, 10, 4, 3); s('rgba(255,160,60,0.3)', 5, 9, 6, 5); } if (big) { s('#6a5a4a', 1, 8, 2, 7); s('#6a5a4a', 13, 8, 2, 7); if (done) s('rgba(120,120,120,0.5)', 7 + (f & 1), 0, 2, 2); } }
    else if (st.special === 'shrine') { for (const [x, y] of [[2, 10], [12, 10], [3, 4], [11, 4], [7, 2]]) { s('#7a7a76', x, y, 3, 4); s('#9a9a96', x, y, 2, 1); } s('#5a3a20', 7, 6, 2, 8); s('#e0b15a', 6, 5, 4, 2); if (done && (f & 1)) s('rgba(255,220,120,0.35)', 4, 3, 8, 10); }
    else if (st.special === 'market') { s('#8a6a44', 1, 8, W - 2, 7); for (const [x, c] of [[1, '#d75a4a'], [6, '#e0b15a'], [11, '#5ac8b8']]) { s(c, x, 3, 4, 3); s('#5a3a20', x, 6, 1, 8); s('#5a3a20', x + 3, 6, 1, 8); } s('#c8405a', 2, 9, 2, 2); s('#d4b04a', 7, 9, 2, 2); s('#8a5a2a', 12, 9, 2, 2); }
    else if (st.special === 'mill') { s('#8a6a44', 4, 6, 8, 9); s('#5a4a30', 3, 4, 10, 3); s('#3a2a1a', 7, 11, 2, 4); const cx = 8, cy = 5; ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 4; k++) { const ang = (k * Math.PI / 2) + (done ? f * 0.4 : 0); ctx.moveTo(px + cx, py + cy); ctx.lineTo(px + cx + Math.cos(ang) * 7, py + cy + Math.sin(ang) * 7); } ctx.stroke(); }
    else if (st.special === 'irrigation') { s('#3a6a9a', 0, 6, W, 4); s('#5a8ac0', 0, 7, W, 2); s('#7a6a4a', 0, 5, W, 1); s('#7a6a4a', 0, 10, W, 1); s('#3a6a9a', 6, 0, 4, 16); s('#5a8ac0', 7, 0, 2, 16); }
    else if (st.special === 'core') { s('#0a0c14', 4, 4, W - 8, H - 8); s('#141a2a', 6, 6, W - 12, H - 12); const cx = W / 2, cy = H / 2; for (let r = 4; r < W / 2 - 4; r += 6) { ctx.strokeStyle = `rgba(90,200,255,${0.35 + ((f + r) % 3) * 0.2})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px + cx, py + cy, r, 0, Math.PI * 2); ctx.stroke(); } s(['#9af0ff', '#5ac8ff', '#ffffff', '#5ac8ff'][f], cx - 2, cy - 2, 4, 4); }
    else {
      const wall = st.wall, roof = st.roof; const rh = st.flat ? 3 : Math.max(5, Math.round(H * 0.32));
      s(mul(parse(wall), 0.75), 1, rh, W - 2, H - rh - 2); s(wall, 2, rh + 1, W - 4, H - rh - 4);
      if (st.flat) { s(roof, 1, 1, W - 2, rh); s(mul(parse(roof), 1.2), 2, 1, W - 4, 1); }
      else { for (let k = 0; k < rh; k++) { const inset = Math.max(0, Math.round((rh - 1 - k) * 0.6) - 1); s(k % 2 ? roof : mul(parse(roof), 1.15), 1 + inset, k + 1, W - 2 - 2 * inset, 1); } }
      if (st.columns) for (let x = 3; x < W - 3; x += 6) s('#e8e0d0', x, rh + 1, 2, H - rh - 4);
      if (st.windows) { const rows = st.floors || 1; for (let r = 0; r < rows; r++) for (let x = 4; x < W - 5; x += 6) s(night && done ? st.windows : mul(parse(st.windows), 0.5), x, rh + 3 + r * 6, 2, 2); }
      if (st.door) s(st.door, Math.round(W / 2) - 1, H - 6, 3, 4);
      if (st.sign) s(st.sign, 3, rh + 2, 5, 2);
      if (st.chimney) for (let k = 0; k < st.chimney; k++) { const x = W - 5 - k * 6; s('#5a4a44', x, 0, 3, rh + 1); if (st.smoke && done) s('rgba(160,160,160,0.55)', x + ((f + k) & 1), 0, 2, 1); }
      if (st.glow && done) s(['rgba(255,150,60,0.5)', 'rgba(255,190,90,0.6)', 'rgba(255,120,40,0.5)', 'rgba(255,170,70,0.6)'][f], Math.round(W / 2) - 1, H - 6, 3, 3);
      if (st.bolt) { s('#ffd24a', Math.round(W / 2) + 4, rh + 2, 2, 3); s('#ffd24a', Math.round(W / 2) + 3, rh + 5, 2, 3); }
      if (st.cross) { s('#d75a4a', Math.round(W / 2) - 1, rh + 2, 3, 1); s('#d75a4a', Math.round(W / 2), rh + 1, 1, 3); }
      if (st.lights && done) { for (let x = 3; x < W - 3; x += 3) for (let y = rh + 2; y < H - 4; y += 3) if (((x * 7 + y * 13 + (tick >> 1)) & 7) < 3) s(((x + y) & 1) ? '#5ac8ff' : '#7fbf6a', x, y, 1, 1); }
    }
    if (!done) { s('rgba(255,255,255,0.35)', 0, 0, W, Math.round(H * (1 - b.progress))); s('#9a7a4a', 2, 2, 1, H - 4); s('#9a7a4a', W - 3, 2, 1, H - 4); }
  }
  function baseColor(world, i, b) {"""),
]),
('src/render/renderer.js', [
("""      LW.Sprites.tile(this.tctx, w, i, px, py);
      const b = w.buildingAt(i); if (b) LW.Sprites.building(this.tctx, b, px, py, w.tick);""",
 """      LW.Sprites.tile(this.tctx, w, i, px, py);
      const b = w.buildingAt(i); if (b) { if (b.w > 1 || b.h > 1) { for (const j of w.buildingTiles(b)) if (j !== i) LW.Sprites.tile(this.tctx, w, j, w.xOf(j) * PX, w.yOf(j) * PX); } LW.Sprites.building(this.tctx, b, b.x * PX, b.y * PX, w.tick); }"""),
]),
]
