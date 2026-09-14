# p048 — a második kör épületeinek képe: hidak és alagút a vízen/hegyen, tornyok, kupolák, antennák, rakéta; és az „Ad” sor
PATCHES = [
('src/render/sprites.js', [
("""    palisade: { special: 'palisade' }, stone_wall: { special: 'stonewall' }, castle: { wall: '#8a8a86', roof: '#5a5a5a', flat: true, towers: true, door: '#2a1a10' }, harbor: { special: 'harbor' },
  };""",
 """    palisade: { special: 'palisade' }, stone_wall: { special: 'stonewall' }, castle: { wall: '#8a8a86', roof: '#5a5a5a', flat: true, towers: true, door: '#2a1a10' }, harbor: { special: 'harbor' },
    // — a második kör
    bridge: { special: 'bridge', deck: '#8a6a3c', rail: '#5a3c22' }, stone_bridge: { special: 'bridge', deck: '#9a9a96', rail: '#6a6a66', arch: true }, steel_bridge: { special: 'bridge', deck: '#6a6a70', rail: '#c8102e', cable: true }, tunnel: { special: 'tunnel' },
    aqueduct: { special: 'aqueduct' }, sewer: { wall: '#6a6a66', roof: '#4a4a48', flat: true, grate: true }, water_tower: { special: 'tower', tank: '#8ab0d0', legs: '#6a6a66' }, dam: { special: 'dam' },
    apartment_block: { wall: '#c8b8a0', roof: '#5a5a5a', flat: true, windows: '#ffd070', floors: 3 }, skyscraper: { wall: '#7a9ab8', roof: '#3a4a5a', flat: true, windows: '#a0d0ff', floors: 4, spire: true },
    shipyard: { special: 'harbor', crane: true }, rail_station: { wall: '#a08a6a', roof: '#4a3a3a', windows: '#ffd070', rails: true, clock: true }, airport: { wall: '#d8d8d4', roof: '#6a7a8a', flat: true, windows: '#a0d0ff', runway: true },
    windmill: { special: 'mill', big: true }, hydro_plant: { special: 'dam', plant: true }, wind_turbine: { special: 'turbine' }, solar_farm: { special: 'solar' }, nuclear_plant: { wall: '#d8d8d4', roof: '#9a9a96', flat: true, cooling: true, glow: false }, fusion_plant: { special: 'core', warm: true },
    robot_factory: { wall: '#7a8a9a', roof: '#3a4a5a', flat: true, lights: true, chimney: 1 },
    apiary: { special: 'apiary' }, fish_pond: { special: 'pond' }, greenhouse: { special: 'greenhouse' }, vertical_farm: { wall: '#6a9a7a', roof: '#3a5a4a', flat: true, windows: '#b0ffb0', floors: 3 },
    courthouse: { wall: '#d8d0c0', roof: '#5a4a3a', columns: true, windows: '#f4e8b0' }, assembly_hall: { wall: '#c8c0b0', roof: '#6a4a3a', columns: true, dome: true }, police_station: { wall: '#9aa4b8', roof: '#3a4a5a', door: '#2a2a34', windows: '#ffd070', badge: true }, bank: { wall: '#b8b0a0', roof: '#4a4a48', columns: true, windows: '#ffd070', sign: '#d4b04a' }, barracks: { wall: '#8a7a5a', roof: '#4a3a2a', door: '#2a1a10', flag: '#c8102e' },
    theatre: { wall: '#a04a4a', roof: '#5a2a2a', columns: true, windows: '#ffd070', mask: true }, stadium: { special: 'stadium' }, museum: { wall: '#d0c8b8', roof: '#6a5a4a', columns: true, windows: '#f4e8b0', dome: true }, cinema: { wall: '#3a3a5a', roof: '#2a2a3a', flat: true, marquee: true }, radio_tower: { special: 'antenna' },
    observatory: { wall: '#c8c8c4', roof: '#7a7a8a', dome: true, telescope: true }, spaceport: { special: 'spaceport' }, ai_core: { wall: '#101820', roof: '#0a0c14', flat: true, lights: true, halo: true },
  };"""),
("""    else if (st.special === 'core') {""",
 """    else if (st.special === 'bridge') {
      const horiz = b.dir ? b.dir === 'h' : W > H; const deck = st.deck, rail = st.rail;
      if (horiz) { s('rgba(0,0,0,0.25)', 0, 9, W, 4); s(deck, 0, 4, W, 8); s(rail, 0, 3, W, 1); s(rail, 0, 12, W, 1); for (let x = 2; x < W; x += 4) { s(mul(parse(deck), 0.8), x, 4, 1, 8); if (st.arch) s('#7a7a76', x + 1, 12, 2, 3); } if (st.cable) { for (let x = 6; x < W - 4; x += 12) { s('#4a4a50', x, 0, 2, 4); for (let k = -5; k <= 5; k += 2) s('#c8c8d0', x + 1 + k, 4 - Math.abs(k) + 1, 1, 1); } } }
      else { s('rgba(0,0,0,0.25)', 9, 0, 4, H); s(deck, 4, 0, 8, H); s(rail, 3, 0, 1, H); s(rail, 12, 0, 1, H); for (let y = 2; y < H; y += 4) { s(mul(parse(deck), 0.8), 4, y, 8, 1); if (st.arch) s('#7a7a76', 12, y + 1, 3, 2); } if (st.cable) for (let y = 6; y < H - 4; y += 12) { s('#4a4a50', 0, y, 4, 2); for (let k = -5; k <= 5; k += 2) s('#c8c8d0', 4 - Math.abs(k) + 1, y + 1 + k, 1, 1); } }
    }
    else if (st.special === 'tunnel') { const horiz = b.dir ? b.dir === 'h' : W > H; s('#3a3a40', 0, 0, W, H); if (horiz) { s('#1a1a20', 0, 5, W, 6); s('#8a8a90', 0, 4, W, 1); s('#8a8a90', 0, 11, W, 1); for (let x = 1; x < W; x += 6) s(night && done ? '#ffd070' : '#5a5a60', x, 7, 1, 2); } else { s('#1a1a20', 5, 0, 6, H); s('#8a8a90', 4, 0, 1, H); s('#8a8a90', 11, 0, 1, H); for (let y = 1; y < H; y += 6) s(night && done ? '#ffd070' : '#5a5a60', 7, y, 2, 1); } }
    else if (st.special === 'aqueduct') { s('#9a9a96', 0, 2, W, 4); s('#5a8ac0', 1, 3, W - 2, 2); for (let x = 0; x < W; x += 8) { s('#8a8a86', x + 1, 6, 6, 9); s('#6a6a66', x + 3, 9, 2, 6); } }
    else if (st.special === 'dam') { s('#3a6a9a', 0, 0, W, 6); s('#5a8ac0', 0, 1, W, 2); s('#9a9a96', 0, 6, W, 6); s('#b0b0ac', 0, 6, W, 1); for (let x = 2; x < W; x += 5) s('#7a7a76', x, 8, 1, 4); s('#5a8ac0', 3, 12, W - 6, 3); if (st.plant) { s('#6a6a66', W - 10, 3, 8, 8); s('#ffd24a', W - 6, 5, 2, 3); } }
    else if (st.special === 'tower') { s('#6a6a66', 6, 6, 4, 10); s('#6a6a66', 3, 8, 2, 8); s('#6a6a66', 11, 8, 2, 8); s(st.tank, 3, 1, 10, 6); s(mul(parse(st.tank), 1.2), 4, 2, 8, 1); s('#3a5a8a', 4, 5, 8, 1); }
    else if (st.special === 'turbine') { s('#e8e8e4', 7, 4, 2, 12); s('#c8c8c4', 6, 3, 4, 2); ctx.strokeStyle = '#f4f4f0'; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 3; k++) { const ang = k * Math.PI * 2 / 3 + (done ? f * 0.5 : 0); ctx.moveTo(px + 8, py + 4); ctx.lineTo(px + 8 + Math.cos(ang) * 6, py + 4 + Math.sin(ang) * 6); } ctx.stroke(); }
    else if (st.special === 'solar') { for (let y = 2; y < H - 2; y += 6) for (let x = 1; x < W - 1; x += 8) { s('#1a2a4a', x, y, 7, 4); s('#2a4a8a', x + 1, y + 1, 5, 2); s('#4a6aaa', x + 1, y + 1, 2, 1); } }
    else if (st.special === 'apiary') { s('#6a8a44', 1, 1, W - 2, H - 2); for (const x of [2, 9]) { s('#c9a86a', x, 6, 5, 7); s('#8a6a3c', x, 5, 5, 1); s('#8a6a3c', x, 9, 5, 1); s('#3a2a1a', x + 2, 11, 1, 1); } if (done) for (let k = 0; k < 3; k++) s('#e0b15a', 3 + ((f + k * 5) % 10), 2 + ((f * 3 + k * 7) % 4), 1, 1); }
    else if (st.special === 'pond') { s('#5a4a30', 0, 0, W, H); s('#3a6a9a', 1, 1, W - 2, H - 2); s('#5a8ac0', 2, 2, W - 4, 2); if (done) for (let k = 0; k < 4; k++) s('#c0c8d0', 3 + ((f * 2 + k * 7) % (W - 6)), 5 + ((k * 5 + f) % (H - 8)), 2, 1); }
    else if (st.special === 'greenhouse') { s('rgba(0,0,0,0.25)', 1, H - 3, W - 2, 3); s('#c0e8f0', 1, 3, W - 2, H - 5); s('#e8f8ff', 2, 4, W - 4, 2); for (let x = 1; x < W; x += 5) s('#8a9a9a', x, 3, 1, H - 5); s('#8a9a9a', 1, 3, W - 2, 1); s('#8a9a9a', 1, H - 2, W - 2, 1); for (let x = 3; x < W - 2; x += 5) s('#4aa848', x, H - 7, 2, 4); }
    else if (st.special === 'stadium') { s('#9a9a96', 1, 1, W - 2, H - 2); s('#b0b0ac', 2, 2, W - 4, 2); s('#5aa848', 6, 6, W - 12, H - 12); s('#e8e8e4', 7, 7, W - 14, 1); s('#e8e8e4', 7, H - 8, W - 14, 1); s('#e8e8e4', Math.round(W / 2), 7, 1, H - 14); if (done && night) for (const [x, y] of [[2, 2], [W - 4, 2], [2, H - 4], [W - 4, H - 4]]) s('#fff8d0', x, y, 2, 2); }
    else if (st.special === 'antenna') { s('#8a8a86', 7, 2, 2, 14); s('#8a8a86', 4, 14, 8, 2); s('#8a8a86', 5, 8, 6, 1); s('#8a8a86', 6, 4, 4, 1); s(done && (f & 1) ? '#ff4040' : '#802020', 7, 0, 2, 2); if (done && (f & 1)) { s('rgba(255,255,255,0.25)', 3, 1, 1, 3); s('rgba(255,255,255,0.25)', 12, 1, 1, 3); } }
    else if (st.special === 'spaceport') { s('#4a4a50', 2, 2, W - 4, H - 4); s('#6a6a70', 3, 3, W - 6, 2); s('#ffd24a', 4, H - 6, W - 8, 1); const rx = Math.round(W / 2) - 2; s('#e8e8e4', rx, 6, 4, H - 14); s('#c8102e', rx, H - 8, 4, 2); s('#c8102e', rx + 1, 4, 2, 2); s('#6a6a70', rx - 2, H - 8, 2, 3); s('#6a6a70', rx + 4, H - 8, 2, 3); if (done && f === 0) s('rgba(255,180,60,0.6)', rx + 1, H - 6, 2, 3); }
    else if (st.special === 'core') {"""),
("""      if (st.towers) { for (const [tx, ty] of [[1, 1], [W - 7, 1], [1, H - 9], [W - 7, H - 9]]) { s('#6a6a66', tx, ty, 6, 8); s('#9a9a96', tx + 1, ty + 1, 4, 6); s('#5a5a56', tx, ty, 2, 2); s('#5a5a56', tx + 4, ty, 2, 2); } s('#c8102e', Math.round(W / 2), 0, 1, 5); s('#c8102e', Math.round(W / 2) + 1, 0, 3, 2); }""",
 """      if (st.towers) { for (const [tx, ty] of [[1, 1], [W - 7, 1], [1, H - 9], [W - 7, H - 9]]) { s('#6a6a66', tx, ty, 6, 8); s('#9a9a96', tx + 1, ty + 1, 4, 6); s('#5a5a56', tx, ty, 2, 2); s('#5a5a56', tx + 4, ty, 2, 2); } s('#c8102e', Math.round(W / 2), 0, 1, 5); s('#c8102e', Math.round(W / 2) + 1, 0, 3, 2); }
      if (st.dome) { const cx = Math.round(W / 2); ctx.fillStyle = st.telescope ? '#8a9aaa' : '#7a8a6a'; ctx.beginPath(); ctx.arc(px + cx, py + rh + 1, Math.min(6, W / 3), Math.PI, 0); ctx.fill(); if (st.telescope) s('#3a3a44', cx, rh - 4, 1, 5); }
      if (st.spire) { s('#e8e8e4', Math.round(W / 2), 0, 1, 3); s(night && done ? '#ff4040' : '#802020', Math.round(W / 2), 0, 1, 1); }
      if (st.flag) { s('#8a7a5a', W - 4, 0, 1, rh + 3); s(st.flag, W - 3, 0, 3, 2); }
      if (st.badge) s('#ffd24a', Math.round(W / 2) - 1, rh + 2, 3, 3);
      if (st.mask) { s('#ffd070', Math.round(W / 2) - 3, rh + 2, 2, 2); s('#ffd070', Math.round(W / 2) + 1, rh + 2, 2, 2); }
      if (st.marquee && done) for (let x = 2; x < W - 2; x += 2) s(((x >> 1) + f) & 1 ? '#ffd24a' : '#ff6a3a', x, rh + 1, 1, 1);
      if (st.clock) { s('#f4f4f0', Math.round(W / 2) - 1, rh + 2, 3, 3); s('#2a2a2a', Math.round(W / 2), rh + 3, 1, 1); }
      if (st.rails) { s('#5a5a56', 0, H - 2, W, 1); for (let x = 0; x < W; x += 3) s('#8a6a3c', x, H - 3, 2, 1); }
      if (st.runway) { s('#3a3a40', 1, H - 5, W - 2, 3); for (let x = 2; x < W - 2; x += 4) s('#f4f4f0', x, H - 4, 2, 1); }
      if (st.cooling) { s('#c8c8c4', W - 9, 0, 7, rh + 6); s('#b0b0ac', W - 8, 1, 5, 2); if (done) s('rgba(240,240,240,0.5)', W - 7 + (f & 1), 0, 3, 1); }
      if (st.grate) for (let x = 3; x < W - 3; x += 3) s('#2a2a2a', x, H - 5, 2, 1);
      if (st.crane) { s('#c8102e', W - 5, 0, 1, 8); s('#c8102e', W - 9, 1, 5, 1); }
      if (st.halo && done) { ctx.strokeStyle = `rgba(90,200,255,${0.3 + (f & 1) * 0.3})`; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, W - 1, H - 1); }"""),
]),
('src/ui/ui.js', [
("""def.hospital ? 'gyógyulás' : null, def.power ? 'áram' : null, def.simulation ? 'egy világ a világban' : null].filter(Boolean).join(' · ') || '—'));""",
 """def.hospital ? 'gyógyulás' : null, def.power ? `áram ×${def.power}` : null, def.simulation ? 'egy világ a világban' : null, def.bridge ? (def.over === 'mountain' ? 'átjáró a hegyen át' : 'átkelő a vízen') : null, def.transport ? 'gyors utazás, kereskedelem' : null, def.produce ? 'termel: ' + Object.keys(def.produce).map((k) => LW.ITEMS[k].label.toLowerCase()).join(', ') : null, def.joy ? 'öröm, ünnep' : null, def.hygiene ? 'tisztaság' : null, def.court || def.police ? 'rend' : null, def.barracks ? 'katonák' : null, def.bank ? 'pénz, hitel' : null, def.media ? 'hírek mindenkinek' : null, def.assembly ? 'választás' : null, def.spaceport ? 'út az égbe' : null, def.computer ? 'számítás' : null].filter(Boolean).join(' · ') || '—'));"""),
]),
]
