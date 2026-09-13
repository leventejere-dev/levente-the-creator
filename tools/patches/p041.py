PATCHES = [
# ---------------------------------------------------------------- hangválasztó
('src/voice.js', [
("""    get speakOn() { try { return localStorage.getItem(this.speakKey) !== '0'; } catch (e) { return true; } },""",
 """    get speakOn() { try { return localStorage.getItem(this.speakKey) !== '0'; } catch (e) { return true; } },
    choice(kind) { try { return localStorage.getItem('lw.voice.' + kind) || ''; } catch (e) { return ''; } },
    setChoice(kind, name) { try { if (name) localStorage.setItem('lw.voice.' + kind, name); else localStorage.removeItem('lw.voice.' + kind); } catch (e) { /* ignore */ } },"""),
("""      let pool;
      if (purpose === 'own') pool = this.ownPool && this.ownPool.length ? this.ownPool : this.anyVoices;
      else pool = this.huNatural && this.huNatural.length ? this.huNatural : this.huVoices.length ? this.huVoices : this.anyVoices;""",
 """      let pool;
      const chosen = this.choice(purpose === 'own' ? 'own' : 'hu'); const cv = chosen ? this.anyVoices.find((v) => v.name === chosen) : null;
      if (cv) pool = [cv];
      else if (purpose === 'own') pool = this.ownPool && this.ownPool.length ? this.ownPool : this.anyVoices;
      else pool = this.huNatural && this.huNatural.length ? this.huNatural : this.huVoices.length ? this.huVoices : this.anyVoices;"""),
]),
('src/ui/ui.js', [
("""      el.appendChild(h('p', { class: 'tiny', style: 'margin:0 0 8px' }, `Beszédhangok: ${LW.Voice.describeVoices()} Az emberek a Beszéd fülön szólalnak meg („hang” kapcsoló); mikrofonnal te is szólhatsz hozzájuk.`));""",
 """      el.appendChild(h('p', { class: 'tiny', style: 'margin:0 0 4px' }, `Beszédhangok: ${LW.Voice.describeVoices()} Az emberek a Beszéd fülön szólalnak meg („hang” kapcsoló); mikrofonnal te is szólhatsz hozzájuk.`));
      { const V = LW.Voice; if (V.ttsSupported) { V.loadVoices(); const mk = (kind, label) => { const sel = h('select', { style: 'max-width:100%;font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:3px 4px' }); sel.appendChild(h('option', { value: '' }, 'automatikus')); for (const v of V.anyVoices) sel.appendChild(h('option', { value: v.name }, `${v.name} (${v.lang})`)); sel.value = V.choice(kind); sel.addEventListener('change', () => { V.setChoice(kind, sel.value); V.speak(kind === 'hu' ? 'Így fogok beszélni hozzád.' : 'Tuka vosha lii', { priority: true, voice: V.anyVoices.find((v) => v.name === sel.value) || null }); }); return h('div', { class: 'kv', style: 'margin:4px 0' }, h('span', null, label), sel); }; el.appendChild(mk('hu', 'Magyar válaszok hangja')); el.appendChild(mk('own', 'Saját nyelvük hangja')); } }"""),
]),
# ---------------------------------------------------------------- grafika: talaj-foltok, ruhaszínek korszak szerint, víz-csillogás
('src/render/sprites.js', [
("""    const clothCol = clothed ? [[150, 108, 62], [120, 96, 70], [96, 110, 70], [140, 84, 60], [110, 100, 90]][h % 5] : (f ? [120, 82, 48] : [100, 68, 40]);""",
 """    const K = a.knowledge && a.knowledge.techs; const dyed = K && K.has('weaving'); const modern = K && K.has('electrification');
    const clothCol = !clothed ? (f ? [120, 82, 48] : [100, 68, 40]) : modern ? [[70, 110, 190], [190, 70, 70], [60, 150, 110], [230, 200, 80], [120, 90, 170], [40, 40, 50], [220, 220, 220]][h % 7] : dyed ? [[150, 108, 62], [90, 110, 150], [150, 70, 60], [96, 130, 70], [170, 140, 70], [110, 80, 120]][h % 6] : [[150, 108, 62], [120, 96, 70], [96, 110, 70], [140, 84, 60], [110, 100, 90]][h % 5];"""),
("""      const cold = b === B.TUNDRA || t.baseTemp[i] < 6;
      if (b === B.GRASSLAND || b === B.FOREST || b === B.DENSE_FOREST || b === B.SAVANNA || b === B.HILLS) {""",
 """      const cold = b === B.TUNDRA || t.baseTemp[i] < 6;
      // finom foltok: a talaj nem egyszínű
      for (let k = 0; k < 3; k++) { const px2 = hash(i * 13 + k * 29) & 15, py2 = hash(i * 17 + k * 31) & 15; s(mul(col, k & 1 ? 0.94 : 1.06), px2, py2, 2 + (k & 1), 2); }
      if (b === B.GRASSLAND || b === B.FOREST || b === B.DENSE_FOREST || b === B.SAVANNA || b === B.HILLS) {"""),
]),
('src/render/renderer.js', [
("""      // vadak: a mezők állatállománya látható""",
 """      // víz-csillogás: a napfény mozog a hullámokon
      if (lod !== 'region') { const t = w.tiles; const ph = this.frame >> 2; c.fillStyle = 'rgba(255,255,255,0.35)'; for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const i = w.idx(tx, ty); if (!w.isWater(i)) continue; const hh = hashi(i * 7 + (ph >> 2)); if ((hh & 7) !== 0) continue; const ox = ((hh >> 3) + ph) & 15, oy = (hh >> 7) & 15; const s2 = this.worldToScreen(tx + ox / 16, ty + oy / 16); c.fillRect(s2.x, s2.y, Math.max(1, S * 3), Math.max(1, S)); } }
      // vadak: a mezők állatállománya látható"""),
]),
]
