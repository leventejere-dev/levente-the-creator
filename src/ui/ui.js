/* LEVENTE — THE CREATOR · ui/ui.js — panelek, vizsgáló, MIÉRT?, családfa, Teremtő-sáv, ablakok, értesítések (magyar felület) */
(function (LW) {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const h = (tag, attrs, ...kids) => { const el = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') el.className = attrs[k]; else if (k === 'html') el.innerHTML = attrs[k]; else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]); else if (k === 'style') el.style.cssText = attrs[k]; else el.setAttribute(k, attrs[k]); } for (const kid of kids) { if (kid == null) continue; el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid); } return el; };
  const pct = (v) => Math.round(v * 100) + '%';
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : '';
  const HU = () => LW.HU;

  class UI {
    constructor(app) {
      this.app = app; this.sim = app.sim; this.world = app.sim.world; this.r = app.renderer; this.audio = app.audio;
      this.tab = 'feed'; this.selected = null; this.selKind = null; this.godTool = null; this.cmdMode = 'message'; this.pendingCmd = null; this.lastPanel = 0; this.feedCount = 0; this.tree = null;
      this.bindTop(); this.bindTabs(); this.bindCanvas(); this.buildGodBar(); this.bindKeys();
      this.chat = new LW.Chat(this);
      this.attachWorld(this.world);
    }
    attachWorld(world) {
      this.world = world; this.sim = this.app.sim; this.feedCount = 0; this.selected = null; this.selKind = null; $('#right').classList.add('hidden'); $('#mmwrap').classList.remove('shift'); $('#godbar').classList.remove('shift');
      $('#tab-feed').innerHTML = ''; $('#tab-god').innerHTML = ''; this.renderChronicle(); this.renderFirsts(); this.renderPeople();
      world.onHistory = (e) => this.onHistory(e);
      this.chat.attachWorld(world);
      for (const e of world.history.feed.slice(-120)) this.appendFeed(e, false);
      for (const e of world.history.godFeed.slice(-60)) this.appendFeed(e, false, $('#tab-god'));
      this.bindSounds(world);
      this.refreshTop(); this.refreshGodBar();
    }
    // ---------------- felső sáv & fülek
    bindTop() {
      document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => { this.setSpeed(b.dataset.speed); this.click(); }));
      $('#btn-sound').addEventListener('click', () => { this.app.toggleSound(); this.refreshSound(); });
      $('#btn-menu').addEventListener('click', () => { this.click(); this.showMenu(); });
      $('#btn-help').addEventListener('click', () => { this.click(); this.showHelp(); });
      this.refreshSpeed(); this.refreshSound();
    }
    setSpeed(p) { if (this.app.observer) { this.toast('Megfigyelő mód', 'Itt csak nézni lehet a világot. A menüből átveheted.', true); return; } if (!this.world.meta.started) { this.showGenesis(); return; } if (p === 'pause') this.sim.paused = !this.sim.paused; else { this.sim.paused = false; this.sim.setPreset(p); } this.refreshSpeed(); }
    refreshSpeed() { document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('active', this.sim.paused ? b.dataset.speed === 'pause' : b.dataset.speed === this.sim.preset)); }
    refreshSound() { $('#btn-sound').classList.toggle('active', this.audio.enabled && !this.audio.muted); $('#btn-sound').textContent = this.audio.enabled && !this.audio.muted ? '♪' : '♪̸'; }
    bindTabs() { document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab; document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b)); document.querySelectorAll('.tabbody').forEach((x) => x.classList.toggle('hidden', x.id !== 'tab-' + this.tab)); if (this.tab === 'chronicle') this.renderChronicle(); if (this.tab === 'firsts') this.renderFirsts(); if (this.tab === 'people') this.renderPeople(); if (this.tab === 'chat') { this.chat.scrollEnd(); if (!this.app.observer) this.chat.input.focus(); } this.click(); })); }
    showTab(name) { const b = document.querySelector(`.tabs button[data-tab="${name}"]`); if (b) b.click(); }
    click() { this.audio.play('click'); }
    refreshTop() {
      const w = this.world, s = this.sim.summary(); const T = LW.Time;
      $('#st-age').textContent = `${w.year}. év`; $('#st-date').textContent = `${T.seasonName(w.tick)} · ${T.dayOfYear(w.tick) + 1}. nap · ${T.clock(w.tick)}`;
      $('#st-pop').textContent = s.population; $('#st-popsub').textContent = `${s.births} született · ${s.deaths} meghalt`;
      $('#st-tech').textContent = s.techLevel; $('#st-techsub').textContent = `${s.techs} ismert · ${s.discoveries} felfedezés`;
      $('#st-settle').textContent = s.settlements; $('#st-largest').textContent = s.largest;
      const i = w.idx(LW.clamp(this.r.cam.x | 0, 0, w.w - 1), LW.clamp(this.r.cam.y | 0, 0, w.h - 1)); const temp = w.tileTemp(i);
      $('#st-weather').textContent = w.weather.describe(temp); $('#st-temp').textContent = `${temp.toFixed(0)} °C · szél ${Math.round(w.weather.wind.speed * 40)} km/h`;
    }
    refreshCloud() { const el = $('#cloudstate'); if (!el) return; const C = LW.Cloud; const st = this.app.observer ? 'megfigyelő' : C.status === 'ok' ? `felhő ✓ ${C.lastSaveMs ? LW.Time.realSpan(Date.now() - C.lastSaveMs) + ' óta' : ''}` : C.status === 'saving' ? 'felhő: mentés…' : C.status === 'error' ? 'felhő: hiba' : C.canWrite ? 'felhő' : 'csak helyi'; el.textContent = st; el.classList.toggle('warn', C.status === 'error' || (!C.canWrite && !this.app.observer)); }
    // ---------------- hírek / történelem
    onHistory(e) {
      if (this.app.catchingUp) return;
      this.appendFeed(e, true); if (e.god) this.appendFeed(e, true, $('#tab-god'));
      if (e.importance >= this.world.cfg.history.chronicleThreshold && this.tab === 'chronicle') this.renderChronicle();
      if (e.first) { this.toast(e.first, e.text, false); this.audio.play('first'); if (this.tab === 'firsts') this.renderFirsts(); }
      else if (e.importance >= 0.6 && !e.god) this.toast(HU().eventType(e.type), e.text, true);
    }
    appendFeed(e, scroll, container) {
      const box = container || $('#tab-feed'); const cls = e.god ? 'god' : e.importance >= 0.6 ? 'i3' : e.importance >= 0.3 ? 'i2' : 'i1';
      const el = h('div', { class: 'feed-item ' + cls, onclick: () => this.jumpTo(e) }, h('time', null, `${e.year}. év ${LW.Time.dayOfYear(e.tick) + 1}. nap ${LW.Time.clock(e.tick)}`), e.first ? h('span', { class: 'first' }, '★ ' + e.first) : null, document.createTextNode(e.text));
      box.appendChild(el); while (box.children.length > 220) box.removeChild(box.firstChild);
      if (scroll && box.scrollHeight - box.scrollTop - box.clientHeight < 80) box.scrollTop = box.scrollHeight;
    }
    jumpTo(e) { const w = this.world; if (e.agentId != null && w.agents.has(e.agentId)) { this.select(w.agents.get(e.agentId)); const a = w.agents.get(e.agentId); this.r.centerOn(a.x, a.y); } else if (e.tile != null) { this.r.centerOn(w.xOf(e.tile) + 0.5, w.yOf(e.tile) + 0.5); } if (this.r.cam.zoom < 16) this.r.cam.zoom = 16; }
    renderChronicle() {
      const box = $('#tab-chronicle'); box.innerHTML = ''; const ch = this.world.history.chronicle; let year = -1;
      const list = ch.slice(-400);
      if (!list.length) box.appendChild(h('p', { class: 'tiny' }, 'A krónika üres. A történelem még nem kezdődött el.'));
      for (const e of list) { if (e.year !== year) { year = e.year; box.appendChild(h('div', { class: 'chron-year' }, `${year}. ÉV`)); } const el = h('div', { class: 'feed-item ' + (e.first ? 'i3' : e.god ? 'god' : 'i2'), onclick: () => this.jumpTo(e) }, e.first ? h('span', { class: 'first' }, '★ ' + e.first) : null, document.createTextNode(e.text)); box.appendChild(el); }
      box.scrollTop = box.scrollHeight;
    }
    renderFirsts() {
      const box = $('#tab-firsts'); box.innerHTML = ''; const f = Object.values(this.world.history.firsts).sort((a, b) => a.tick - b.tick);
      if (!f.length) box.appendChild(h('p', { class: 'tiny' }, 'Még nem történt semmi először.'));
      for (const x of f) box.appendChild(h('div', { class: 'first-card', onclick: () => this.jumpTo(x) }, h('b', null, x.title), h('small', null, `${LW.Time.year(x.tick)}. év — ${x.text}`)));
    }
    renderPeople() {
      const box = $('#tab-people'); box.innerHTML = ''; const w = this.world; const A = LW.Agents;
      const list = [...w.agents.values()].sort((a, b) => b.importance - a.importance || a.bornTick - b.bornTick);
      box.appendChild(h('p', { class: 'tiny' }, `${list.length} élő · ${w.deceased.size} akire emlékeznek`));
      for (const a of list) box.appendChild(h('div', { class: 'person-row', onclick: () => { this.select(a); this.r.centerOn(a.x, a.y); this.r.follow = a.id; } }, h('span', { class: 'sw', style: `background:${a.palette.skin};border:2px solid ${a.palette.hair}` }), h('span', { class: 'nm' }, a.name), h('small', null, `${Math.floor(A.age(w, a))} éves · ${HU().occupation(a.occupation || A.stage(w, a))}`)));
      if (w.deceased.size) { box.appendChild(h('h3', { style: 'margin:10px 0 4px;font-size:10px;letter-spacing:.2em;color:#6f6a60' }, 'A HALOTTAK')); for (const d of [...w.deceased.values()].slice(-40).reverse()) box.appendChild(h('div', { class: 'person-row', onclick: () => this.showDeceased(d) }, h('span', { class: 'sw', style: `background:${d.palette ? d.palette.skin : '#666'};opacity:.5` }), h('span', { class: 'nm', style: 'color:#8a8478' }, d.name), h('small', null, `${d.cause} · ${LW.Time.year(d.diedTick)}. év`))); }
    }
    // ---------------- vászon bemenet
    bindCanvas() {
      const cv = $('#world'); let drag = null, moved = false;
      cv.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY }; moved = false; });
      window.addEventListener('mousemove', (e) => { const rect = cv.getBoundingClientRect(); const p = this.r.screenToWorld(e.clientX - rect.left, e.clientY - rect.top); this.r.hover = p; const pk = this.r.pick(e.clientX - rect.left, e.clientY - rect.top); this.r.hoverAgent = pk && pk.agent ? pk.agent.id : null; if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true; if (moved) { this.r.pan(dx, dy); drag = { x: e.clientX, y: e.clientY }; } } });
      window.addEventListener('mouseup', (e) => { if (!drag) return; const rect = cv.getBoundingClientRect(); if (!moved && e.target === cv) this.onClick(e.clientX - rect.left, e.clientY - rect.top, e.button); drag = null; });
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('wheel', (e) => { e.preventDefault(); const rect = cv.getBoundingClientRect(); this.r.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1 : -1); }, { passive: false });
      $('#minimap').addEventListener('click', (e) => { const rect = e.target.getBoundingClientRect(); const w = this.world; this.r.centerOn((e.clientX - rect.left) / rect.width * w.w, (e.clientY - rect.top) / rect.height * w.h); this.r.follow = null; });
      cv.addEventListener('touchstart', (e) => { const t = e.touches[0]; drag = { x: t.clientX, y: t.clientY }; moved = false; }, { passive: true });
      cv.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (drag) { const dx = t.clientX - drag.x, dy = t.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true; this.r.pan(dx, dy); drag = { x: t.clientX, y: t.clientY }; } }, { passive: true });
      cv.addEventListener('touchend', (e) => { if (drag && !moved) { const rect = cv.getBoundingClientRect(); const t = e.changedTouches[0]; this.onClick(t.clientX - rect.left, t.clientY - rect.top, 0); } drag = null; });
    }
    onClick(sx, sy, button) {
      const w = this.world; const p = this.r.screenToWorld(sx, sy); const pk = this.r.pick(sx, sy);
      if (button === 2) { this.godTool = null; this.pendingCmd = null; this.r.godCursor = null; $('#world').classList.remove('god'); this.refreshGodBar(); return; }
      if (this.pendingCmd) { const cmd = this.pendingCmd; const a = w.agents.get(this.selected); this.pendingCmd = null; $('#world').classList.remove('god'); if (a) { const tile = w.inBounds(p.x | 0, p.y | 0) ? w.idx(p.x | 0, p.y | 0) : null; const targetId = pk && pk.agent && pk.agent.id !== a.id ? pk.agent.id : null; LW.God.command(w, a, cmd, { tile, targetId, force: this.cmdMode === 'force' }); this.audio.play('command'); this.app.save(true); } this.refreshGodBar(); return; }
      if (this.godTool) { const K = LW.God.KINDS[this.godTool]; const params = { x: p.x, y: p.y }; if (K.target === 'agent') { if (!(pk && pk.agent)) { this.toast('Válassz valakit', 'Kattints egy emberre.', true); return; } params.agentId = pk.agent.id; } const text = LW.God.intervene(w, this.godTool, params); if (text) { this.audio.play(this.godTool === 'earthquake' ? 'quake' : this.godTool === 'meteor' ? 'meteor' : this.godTool === 'lightning' || this.godTool === 'storm' ? 'thunder' : this.godTool === 'fire' ? 'fire' : this.godTool === 'rain' ? 'rain' : 'god'); this.app.save(true); } if (K.manifest || this.godTool === 'spawn') { this.godTool = null; this.r.godCursor = null; $('#world').classList.remove('god'); this.refreshGodBar(); } return; }
      if (pk && pk.agent) { this.select(pk.agent); return; }
      if (pk && pk.building) { this.selectBuilding(pk.building); return; }
      if (pk && pk.tile != null) { this.selectTile(pk.tile); return; }
    }
    bindKeys() {
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
        const k = e.key.toLowerCase(); const st = 24;
        if (k === ' ') { e.preventDefault(); this.setSpeed('pause'); } else if (k === 'w' || k === 'arrowup') this.r.pan(0, st); else if (k === 's' || k === 'arrowdown') this.r.pan(0, -st); else if (k === 'a' || k === 'arrowleft') this.r.pan(st, 0); else if (k === 'd' || k === 'arrowright') this.r.pan(-st, 0);
        else if (k === '+' || k === '=') this.r.zoomIn(); else if (k === '-') this.r.zoomOut(); else if (k === 'o') this.r.overview(); else if (k === 'h') { this.r.centerOn(this.world.genesis.x, this.world.genesis.y); this.r.cam.zoom = 16; }
        else if (k === 'f' && this.selected != null) this.r.follow = this.r.follow ? null : this.selected; else if (k === 'escape') { this.godTool = null; this.pendingCmd = null; this.r.godCursor = null; $('#world').classList.remove('god'); this.refreshGodBar(); this.closeModal(); }
        else if (k === '1') this.setSpeed('slow'); else if (k === '2') this.setSpeed('normal'); else if (k === '3') this.setSpeed('fast'); else if (k === '4') this.setSpeed('ultra'); else if (k === '5') this.setSpeed('hyper');
        else if (k === '`') $('#debug').classList.toggle('hidden'); else if (k === 't' && this.selected != null) this.showTree(this.world.agents.get(this.selected));
      });
    }
    // ---------------- kiválasztás & vizsgáló
    _openRight() { $('#right').classList.remove('hidden'); $('#mmwrap').classList.add('shift'); $('#godbar').classList.add('shift'); }
    select(a) { this.selected = a.id; this.selKind = 'agent'; this.r.selected = a.id; this._openRight(); this.renderInspector(true); this.refreshGodBar(); if (this.chat && LW.Agents.stage(this.world, a) !== 'infant') this.chat.setTarget(a.id); }
    selectBuilding(b) { this.selected = b.id; this.selKind = 'building'; this.r.selected = null; this._openRight(); this.renderInspector(true); this.refreshGodBar(); }
    selectTile(i) { this.selected = i; this.selKind = 'tile'; this.r.selected = null; this._openRight(); this.renderInspector(true); this.refreshGodBar(); }
    closeInspector() { this.selected = null; this.selKind = null; this.r.selected = null; this.r.follow = null; $('#right').classList.add('hidden'); $('#mmwrap').classList.remove('shift'); $('#godbar').classList.remove('shift'); this.refreshGodBar(); }
    renderInspector(force) {
      const box = $('#inspector'); if (this.selected == null) return; const w = this.world;
      const scroll = box.scrollTop;
      if (this.selKind === 'agent') { const a = w.agents.get(this.selected); if (!a) { const d = w.deceased.get(this.selected); if (d) { this.showDeceased(d); } this.closeInspector(); return; } box.innerHTML = ''; box.appendChild(this.agentView(a)); }
      else if (this.selKind === 'building') { const b = w.buildings.get(this.selected); if (!b) { this.closeInspector(); return; } box.innerHTML = ''; box.appendChild(this.buildingView(b)); }
      else if (this.selKind === 'tile') { box.innerHTML = ''; box.appendChild(this.tileView(this.selected)); }
      box.scrollTop = scroll;
    }
    bar(label, v, cls) { const c = cls || (v < 0.25 ? 'bad' : v < 0.5 ? 'warn' : ''); return h('div', { class: 'bar' }, h('span', null, label), h('div', { class: 'track' }, h('div', { class: 'fill ' + c, style: `width:${Math.round(LW.clamp01(v) * 100)}%` })), h('span', null, pct(LW.clamp01(v)))); }
    agentView(a) {
      const w = this.world, A = LW.Agents, R = LW.Relationships; const age = A.age(w, a); const stage = A.stage(w, a);
      const el = h('div');
      el.appendChild(h('h2', null, h('span', { class: 'sw', style: `display:inline-block;width:14px;height:14px;border-radius:3px;background:${a.palette.skin};border:3px solid ${a.palette.hair}` }), a.name, h('button', { class: 'close', onclick: () => this.closeInspector() }, '✕')));
      const home = a.home != null ? w.buildings.get(a.home) : null; const settlement = LW.Settlements.at(w, a.x, a.y);
      el.appendChild(h('div', { class: 'sub' }, `${a.sex === 'f' ? 'Nő' : 'Férfi'} · ${Math.floor(age)} éves · ${HU().occupation(a.occupation || stage)} · ${a.generation}. nemzedék${a.genesis ? ' · az Elsők egyike' : ''}${settlement ? ' · ' + settlement.name : ''}${a.pregnancy ? ' · gyermeket vár' : ''}`));
      el.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: () => { this.r.follow = this.r.follow === a.id ? null : a.id; this.click(); } }, this.r.follow === a.id ? '● Követem' : 'Követés'), h('button', { onclick: () => { this.showTree(a); this.click(); } }, 'Családfa'), h('button', { onclick: () => { this.showWhy(a); this.click(); } }, 'MIÉRT?'), h('button', { class: 'primary', onclick: () => { this.chat.setTarget(a.id); this.showTab('chat'); } }, 'Beszélgetés')));
      el.appendChild(h('div', { class: 'thought' }, `„${this.thought(a)}”`));
      el.appendChild(h('h3', null, 'Állapot'));
      el.appendChild(this.bar('Egészség', a.health)); el.appendChild(this.bar('Kedv', LW.clamp01(0.5 + this.mood(a) / 2), this.mood(a) < -0.2 ? 'bad' : this.mood(a) < 0.1 ? 'warn' : ''));
      el.appendChild(h('h3', null, 'Szükségletek'));
      for (const k of ['food', 'water', 'energy', 'warmth', 'safety', 'social', 'affection', 'curiosity']) el.appendChild(this.bar(HU().need(k), a.needs[k]));
      el.appendChild(h('h3', null, 'Érzések'));
      const em = Object.entries(a.emotions).filter(([, v]) => v > 0.12).sort((x, y) => y[1] - x[1]).slice(0, 5);
      el.appendChild(h('div', { class: 'chips' }, ...(em.length ? em.map(([k, v]) => h('span', { class: 'chip' + (k === 'love' || k === 'attraction' ? ' rose' : '') }, `${HU().emotion(k)} ${pct(v)}`)) : [h('span', { class: 'chip' }, 'nyugodt')])));
      el.appendChild(h('h3', null, 'Jellem'));
      const tr = Object.entries(a.personality).sort((x, y) => Math.abs(y[1] - 0.5) - Math.abs(x[1] - 0.5)).slice(0, 6);
      el.appendChild(h('div', { class: 'chips' }, ...tr.map(([k, v]) => h('span', { class: 'chip' }, `${v >= 0.5 ? '' : 'kevés '}${HU().trait(k)} ${pct(v)}`))));
      el.appendChild(h('h3', null, 'Család & kötelékek'));
      const kv = h('div', { class: 'kv' });
      const link = (id) => { const o = w.agents.get(id); const d = w.deceased.get(id); if (o) return h('span', { class: 'chip link', onclick: () => { this.select(o); this.r.centerOn(o.x, o.y); } }, o.name); if (d) return h('span', { class: 'chip', style: 'opacity:.6', onclick: () => this.showDeceased(d) }, d.name + ' †'); return h('span', { class: 'chip' }, '?'); };
      kv.appendChild(h('span', null, 'Pár')); kv.appendChild(h('div', { class: 'chips' }, a.partner != null ? link(a.partner) : h('span', { class: 'chip' }, stage === 'adult' || stage === 'elder' ? 'egyedülálló' : '—')));
      kv.appendChild(h('span', null, 'Szülők')); kv.appendChild(h('div', { class: 'chips' }, ...(a.parents.some((p) => p != null) ? a.parents.filter((p) => p != null).map(link) : [h('span', { class: 'chip' }, a.genesis ? 'nincs — teremtetett' : 'ismeretlen')])));
      kv.appendChild(h('span', null, 'Gyermekek')); kv.appendChild(h('div', { class: 'chips' }, ...(a.children.length ? a.children.map(link) : [h('span', { class: 'chip' }, 'nincs')])));
      const rels = [...a.relationships.entries()].map(([id, r]) => ({ id, r, label: R.label(r) })).filter((x) => x.label !== 'idegen' && x.label !== 'rokon' && w.agents.has(x.id)).sort((x, y) => (y.r.friendship + y.r.romance - y.r.resentment) - (x.r.friendship + x.r.romance - x.r.resentment)).slice(0, 8);
      kv.appendChild(h('span', null, 'Mások')); kv.appendChild(h('div', { class: 'chips' }, ...(rels.length ? rels.map((x) => h('span', { class: 'chip link' + (x.label === 'jár vele' || x.label === 'pár' ? ' rose' : ''), onclick: () => { const o = w.agents.get(x.id); this.select(o); this.r.centerOn(o.x, o.y); }, title: `bizalom ${pct(x.r.trust)} · barátság ${pct(x.r.friendship)} · vonzalom ${pct(x.r.attraction)} · neheztelés ${pct(x.r.resentment)}` }, `${w.agents.get(x.id).name} · ${x.label}`)) : [h('span', { class: 'chip' }, 'senkit nem ismer jól')])));
      el.appendChild(kv);
      el.appendChild(h('h3', null, 'Tudás & készségek'));
      const techs = [...a.knowledge.techs].map((t) => LW.Tech.D[t]).filter((d) => !d.hidden); const hidden = [...a.knowledge.techs].map((t) => LW.Tech.D[t]).filter((d) => d.hidden);
      el.appendChild(h('div', { class: 'chips' }, ...(techs.length ? techs.map((d) => h('span', { class: 'chip gold', title: d.desc }, d.name)) : [h('span', { class: 'chip' }, 'csak ösztön')]), ...hidden.map((d) => h('span', { class: 'chip', title: d.desc }, d.name))));
      const sk = Object.entries(a.skills).filter(([, v]) => v > 0.12).sort((x, y) => y[1] - x[1]).slice(0, 5);
      if (sk.length) el.appendChild(h('div', { class: 'chips', style: 'margin-top:4px' }, ...sk.map(([k, v]) => h('span', { class: 'chip' }, `${HU().skill(k)} ${pct(v)}`))));
      el.appendChild(h('h3', null, 'Holmi'));
      const inv = Object.entries(a.inv).filter(([, q]) => q > 0);
      el.appendChild(h('div', { class: 'chips' }, ...(inv.length ? inv.map(([k, q]) => h('span', { class: 'chip' }, `${LW.ITEMS[k] ? LW.ITEMS[k].label : k} ×${q}`)) : [h('span', { class: 'chip' }, 'semmi')])));
      el.appendChild(h('div', { class: 'kv', style: 'margin-top:6px' }, h('span', null, 'Otthon'), h('span', null, home ? `${LW.Buildings.def(home).label}${home.storage && Object.keys(home.storage).length ? ' · raktár: ' + Object.entries(home.storage).map(([k, q]) => `${q} ${LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k}`).join(', ') : ''}` : 'nincs'), h('span', null, 'Hit'), h('span', null, a.beliefs.creator > 0.7 ? `hisz a Teremtőben (${pct(a.beliefs.creator)})` : a.beliefs.creator > 0.3 ? `tűnődik egy Teremtőn (${pct(a.beliefs.creator)})` : 'nem tud rólad semmit'), a.wealth ? h('span', null, 'Vagyon') : null, a.wealth ? h('span', null, `${a.wealth > 0 ? '+' : ''}${a.wealth} (a piacon adott/kapott)`) : null));
      // nyelv & viszony a hanghoz
      el.appendChild(h('h3', null, 'Nyelv & a hang'));
      const lang = w.langs ? w.langs.get(a.langId) : null; const vk = Object.keys(a.vocab || {}); const secret = vk.filter((c) => a.vocab[c].s).length;
      const trust = a.beliefs.trust || 0; const trLabel = a.beliefs.creator < 0.25 ? 'nem tud rólad' : trust > 0.35 ? 'bízik benned' : trust > 0.1 ? 'inkább bízik benned' : trust < -0.35 ? 'neheztel rád' : trust < -0.1 ? 'tart tőled' : 'még nem döntött rólad';
      const fl = LW.Speech.fluency(w, a); const flLabel = fl < 0.2 ? 'mutogat' : fl < 0.4 ? 'akadozva beszél' : fl < 0.7 ? 'beszél' : 'folyékonyan beszél';
      el.appendChild(h('div', { class: 'chips' }, h('span', { class: 'chip' }, lang ? LW.Speech.describeLang(w, lang) : 'nincs nyelv'), h('span', { class: 'chip' }, `${vk.length} szó${secret ? ` · ${secret} titkos` : ''}`), h('span', { class: 'chip', title: `folyékonyság ${pct(fl)}` }, flLabel), h('span', { class: 'chip' + (trust < -0.1 ? ' warn' : trust > 0.1 ? ' gold' : '') }, trLabel)));
      if (vk.length) { const ear = w.creatorSettings && w.creatorSettings.divineEar; const show = vk.slice(-8).map((c) => { const v = a.vocab[c]; const k = LW.Speech.known(w, a.langId, v.w); const und = k || (ear && !v.s); return h('span', { class: 'chip', title: und ? LW.Speech.gloss(c) : 'nem érted (még)' }, `${v.w}${und ? ' = ' + LW.Speech.gloss(c) : ' = ?'}${v.s ? ' 🔒' : ''}`); }); el.appendChild(h('div', { class: 'chips', style: 'margin-top:4px' }, ...show)); }
      if (a.achievements.length) { el.appendChild(h('h3', null, 'Tettek')); el.appendChild(h('div', { class: 'chips' }, ...a.achievements.map((x) => h('span', { class: 'chip gold' }, x)))); }
      el.appendChild(h('h3', null, 'Emlékek'));
      const mems = a.memory.episodic.slice(-10).reverse();
      for (const m of mems) el.appendChild(h('div', { class: 'mem' + (m.divine ? ' divine' : '') }, h('time', null, `${LW.Time.year(m.tick)}. év ${LW.Time.dayOfYear(m.tick) + 1}. nap`), h('b', null, m.text), m.source === 'told' ? h('span', { class: 'tiny' }, ` (mesélte: ${this.nameOf(m.teller)})`) : null));
      if (!mems.length) el.appendChild(h('div', { class: 'mem' }, 'Még nincsenek emlékei.'));
      return el;
    }
    mood(a) { const E = a.emotions; return E.joy + E.love + E.pride + 0.5 * E.excitement - E.sadness - E.fear - E.anger - E.grief - E.shame - 0.5 * E.stress; }
    nameOf(id) { const a = this.world.agents.get(id) || this.world.deceased.get(id); return a ? a.name : 'valaki'; }
    thought(a) {
      const w = this.world; const act = LW.Actions.describe(w, a); const E = a.emotions, N = a.needs;
      if (a.sleeping) return E.grief > 0.3 ? 'Csak álmomban nem fáj.' : 'Alszik.';
      if (a.divineRequest) return a.divineRequest.force ? 'A testem mozdul, és nem én mozdítom.' : 'Egy hang, aminek nincs szája. El kell döntenem, mit akar.';
      if (a.nudge && w.tick < a.nudge.until && a.plan && a.plan.goal === a.nudge.goal) return `„${a.nudge.text}” — ezt mondta a hang. Talán igaza van.`;
      if (a.danger > 0.4) return 'Veszély. El innen.';
      if (N.food < 0.2) return `Olyan éhes vagyok. ${cap(act)}.`; if (N.water < 0.2) return `Kiszáradt a torkom. ${cap(act)}.`; if (N.warmth < 0.3) return `A hideg a csontomig hatol. ${cap(act)}.`;
      if (E.grief > 0.5) return 'Elment. Mégis keresem.'; if (E.love > 0.6 && a.partner != null) return `${this.nameOf(a.partner)}. Ma minden könnyebb.`; if (E.jealousy > 0.5) return 'Láttam őket együtt. Nem tudom nem látni.'; if (E.fear > 0.5) return 'Valami nincs rendben. Érzem a levegőben.'; if (E.pride > 0.5) return 'Csináltam valamit. Az enyém, és jó.';
      const p = a.plan; if (p && p.goal === 'experiment') return `Mi lenne, ha másképp próbálnám? (${act})`; if (p && p.goal === 'explore') return 'Mi lehet a fákon túl?'; if (p && p.goal === 'flirt') return `${cap(act)}. Remélem, észrevesz.`; if (p && p.goal === 'buildShelter') return 'Falak kellenek, mielőtt jön a hideg.';
      return cap(act) + '.';
    }
    showWhy(a) {
      const why = a.why; const el = h('div');
      el.appendChild(h('h1', null, 'MIÉRT?', h('small', null, `${a.name} · ${LW.Time.stamp(why ? why.tick : this.world.tick)}`)));
      if (!why) { el.appendChild(h('p', null, 'Még nincs rögzített döntés.')); }
      else {
        const g = (id) => HU().goal(id);
        const lines = [`VÁLASZTOTT  ${g(why.chosen.goal).padEnd(22)} pont ${why.chosen.score.toFixed(2)}`, `            ${why.chosen.factors.join(' · ') || '—'}`, '', 'HELYZET     ' + Object.entries(why.context).map(([k, v]) => `${HU().ctx(k)} ${typeof v === 'number' ? (v > 1 ? v : Math.round(v * 100) + '%') : (v === true ? 'igen' : v === false ? 'nem' : v)}`).join(' · '), '', 'ELVETETT'];
        for (const alt of why.alternatives) lines.push(`  ${g(alt.goal).padEnd(22)} ${alt.score.toFixed(2)}   ${alt.factors.join(' · ')}`);
        lines.push('', `TERV        ${a.plan ? a.plan.steps.map((s, i) => (i === a.plan.i ? '▶' : ' ') + HU().op(s.op) + (s.item ? ':' + (LW.ITEMS[s.item] ? LW.ITEMS[s.item].label.toLowerCase() : s.item) : s.recipe ? ':' + s.recipe : s.tech ? ':' + (LW.Tech.D[s.tech] ? LW.Tech.D[s.tech].name : s.tech) : '')).join('  ') : '—'}`);
        el.appendChild(h('div', { class: 'why' }, lines.join('\n')));
        el.appendChild(h('p', { class: 'tiny' }, 'Pont = szükséglet sürgőssége × jellem × érzelem × helyzet + kis zaj. A terv az az állapotgép, amely a választott célt éppen végrehajtja.'));
      }
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Bezár')));
      this.modal(el);
    }
    buildingView(b) {
      const w = this.world; const def = LW.Buildings.def(b); const el = h('div');
      el.appendChild(h('h2', null, def.label, h('button', { class: 'close', onclick: () => this.closeInspector() }, '✕')));
      const owner = b.ownerId != null ? (w.agents.get(b.ownerId) || w.deceased.get(b.ownerId)) : null; const s = b.settlementId ? w.settlements.get(b.settlementId) : null;
      el.appendChild(h('div', { class: 'sub' }, `${b.progress >= 1 ? 'Kész' : 'Épül'} ${b.builtTick > 0 ? '· ' + LW.Time.year(b.builtTick) + '. év' : ''}${s ? ' · ' + s.name : ''}`));
      if (b.progress < 1) { el.appendChild(this.bar('Készültség', b.progress, '')); const m = LW.Buildings.missing(b); const ms = Object.entries(m); if (ms.length) el.appendChild(h('div', { class: 'chips' }, ...ms.map(([k, q]) => h('span', { class: 'chip' }, `hiányzik: ${q} ${LW.ITEMS[k].label.toLowerCase()}`)))); }
      el.appendChild(this.bar('Állapot', b.hp, b.hp < 0.3 ? 'bad' : ''));
      if (b.kind === 'campfire') el.appendChild(this.bar('Tüzelő', Math.min(1, b.fuel / def.fuelTicks), b.lit ? '' : 'bad'));
      if (def.farm) el.appendChild(this.bar('Termés', b.planted ? b.crop : 0, ''));
      const kv = h('div', { class: 'kv', style: 'margin-top:8px' });
      kv.appendChild(h('span', null, 'Tulajdonos')); kv.appendChild(h('span', null, owner ? owner.name : 'senki'));
      if (b.records) { kv.appendChild(h('span', null, 'Feljegyzések')); kv.appendChild(h('div', { class: 'chips' }, ...(b.records.length ? b.records.map((t) => h('span', { class: 'chip gold', title: LW.Tech.D[t] ? LW.Tech.D[t].desc : '' }, LW.Tech.D[t] ? LW.Tech.D[t].name : t)) : [h('span', { class: 'chip' }, 'még üres')]))); }
      if (b.trades) { kv.appendChild(h('span', null, 'Cserék')); kv.appendChild(h('span', null, String(b.trades))); }
      if (b.worlds) { kv.appendChild(h('span', null, 'Szimulált világok')); kv.appendChild(h('span', null, String(b.worlds))); }
      if (b.w > 1 || b.h > 1) { kv.appendChild(h('span', null, 'Méret')); kv.appendChild(h('span', null, `${b.w}×${b.h} mező`)); }
      if (def.dwelling) { kv.appendChild(h('span', null, 'Lakók')); kv.appendChild(h('div', { class: 'chips' }, ...(b.residents.length ? b.residents.map((id) => { const o = w.agents.get(id); return o ? h('span', { class: 'chip link', onclick: () => { this.select(o); } }, o.name) : null; }) : [h('span', { class: 'chip' }, 'üres')]))); }
      if (def.storage) { kv.appendChild(h('span', null, 'Raktár')); kv.appendChild(h('div', { class: 'chips' }, ...(Object.keys(b.storage).length ? Object.entries(b.storage).map(([k, q]) => h('span', { class: 'chip' }, `${LW.ITEMS[k] ? LW.ITEMS[k].label : k} ×${q}`)) : [h('span', { class: 'chip' }, 'üres')]))); }
      kv.appendChild(h('span', null, 'Ad')); kv.appendChild(h('span', null, [def.insulation ? `+${def.insulation}° meleg` : null, def.warmth ? `+${def.warmth}° meleg a közelben` : null, def.light ? 'fény' : null, def.safety ? `biztonság ${pct(def.safety)}` : null, def.sleep ? `alvás ${pct(def.sleep)}` : null, def.divine ? 'jel a túlvilágról' : null, def.water ? 'víz' : null, def.furnace ? 'tűz az olvasztáshoz' : null, def.workshop ? 'műhely' : null, def.records ? 'írott tudás' : null, def.shrine ? 'hit és nyugalom' : null, def.market ? 'csere' : null, def.school ? 'tanítás' : null, def.discovery ? `felfedezés +${pct(def.discovery)}` : null, def.teach ? `tanítás +${pct(def.teach)}` : null, def.craft ? `készítés +${pct(def.craft)}` : null, def.hospital ? 'gyógyulás' : null, def.power ? 'áram' : null, def.simulation ? 'egy világ a világban' : null].filter(Boolean).join(' · ') || '—'));
      el.appendChild(kv);
      if (def.divine) el.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: () => { LW.Buildings.destroy(w, b, 'a Teremtő akarata'); this.closeInspector(); } }, 'Visszavonom')));
      return el;
    }
    tileView(i) {
      const w = this.world, t = w.tiles; const el = h('div'); const x = w.xOf(i), y = w.yOf(i); const B = LW.BIOME_NAME[t.biome[i]];
      el.appendChild(h('h2', null, B, h('button', { class: 'close', onclick: () => this.closeInspector() }, '✕')));
      const s = LW.Settlements.at(w, x, y);
      el.appendChild(h('div', { class: 'sub' }, `${x}, ${y}${s ? ' · ' + s.name + ' közelében' : ''}`));
      const kv = h('div', { class: 'kv' });
      const row = (k, v) => { kv.appendChild(h('span', null, k)); kv.appendChild(h('span', null, v)); };
      row('Hőmérséklet', `${w.tileTemp(i).toFixed(1)} °C`); row('Magasság', `${Math.round((t.elev[i] - w.cfg.world.seaLevel) * 2500)} m`); row('Nedvesség', pct(t.moist[i] / 255)); row('Termékenység', pct(t.fert[i] / 255));
      row('Ehető növény', `${t.veg[i]} / ${t.vegCap[i]}`); row('Fák', `${t.trees[i]} / ${t.treeCap[i]}`); row('Vadak', `${t.animals[i]} / ${t.animalCap[i]}`); if (t.fishCap[i]) row('Halak', `${t.fish[i]} / ${t.fishCap[i]}`); row('Felszíni kő', String(t.stone[i]));
      row('Föld alatt', t.depType[i] ? (t.depKnown[i] ? `${HU().deposit(t.depType[i])} (${t.depAmt[i]} maradt)` : 'valami, még felfedezetlen') : 'semmi említésre méltó');
      row('Ösvény', t.path[i] === 2 ? 'kitaposott út' : t.path[i] === 1 ? 'halvány csapás' : '—'); if (t.snow[i]) row('Hó', pct(t.snow[i] / 255)); if (t.fire[i]) row('Tűz', 'ég!'); if (t.burnt[i]) row('Leégett', 'igen');
      el.appendChild(kv);
      el.appendChild(h('p', { class: 'tiny', style: 'margin-top:10px' }, 'Teremtői jegyzet: a föld alatti világ valódi. A lelőhelyek végesek, és csak az tud róluk, aki ás.'));
      return el;
    }
    showDeceased(d) {
      const w = this.world; const el = h('div'); el.appendChild(h('h1', null, d.name, h('small', null, `${d.sex === 'f' ? 'nő' : 'férfi'} · élt: ${LW.Time.year(d.bornTick)}. – ${LW.Time.year(d.diedTick)}. év · halála oka: ${d.cause}, ${Math.floor(LW.Time.ageYears(d.bornTick, d.diedTick))} évesen`)));
      const link = (id) => { const o = w.agents.get(id) || w.deceased.get(id); return h('span', { class: 'chip' + (w.agents.has(id) ? ' link' : ''), onclick: () => { if (w.agents.has(id)) { this.closeModal(); this.select(w.agents.get(id)); } else if (o) this.showDeceased(o); } }, o ? o.name + (w.agents.has(id) ? '' : ' †') : '?'); };
      el.appendChild(h('div', { class: 'kv' }, h('span', null, 'Szülők'), h('div', { class: 'chips' }, ...(d.parents.filter((p) => p != null).length ? d.parents.filter((p) => p != null).map(link) : [h('span', { class: 'chip' }, d.genesis ? 'nincs — teremtetett' : 'ismeretlen')])), h('span', null, 'Gyermekek'), h('div', { class: 'chips' }, ...(d.children.length ? d.children.map(link) : [h('span', { class: 'chip' }, 'nincs')])), h('span', null, 'Volt'), h('span', null, HU().occupation(d.occupation || '—'))));
      if (d.achievements.length) el.appendChild(h('div', { class: 'chips', style: 'margin-top:8px' }, ...d.achievements.map((x) => h('span', { class: 'chip gold' }, x))));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => { this.closeModal(); this.showTree(d); } }, 'Családfa'), h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Bezár')));
      this.modal(el);
    }
    // ---------------- családfa (vászon)
    showTree(root) {
      const w = this.world; const get = (id) => w.agents.get(id) || w.deceased.get(id);
      const nodes = new Map(); const visit = (p, g) => { if (!p || nodes.has(p.id)) return; nodes.set(p.id, { p, g }); for (const par of p.parents) if (par != null) visit(get(par), g - 1); for (const c of p.children) visit(get(c), g + 1); };
      visit(root, 0);
      const byGen = new Map(); for (const n of nodes.values()) { if (!byGen.has(n.g)) byGen.set(n.g, []); byGen.get(n.g).push(n); }
      const gens = [...byGen.keys()].sort((a, b) => a - b);
      const el = h('div'); el.appendChild(h('h1', null, 'Családfa', h('small', null, `${root.name} · ${nodes.size} ember · ${gens.length} nemzedék`)));
      const cv = h('canvas', { id: 'tree' }); el.appendChild(cv); el.appendChild(h('p', { class: 'tiny' }, 'Húzással mozgatható · görgővel nagyítható · élő emberre kattintva megnyílik.')); el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Bezár')));
      this.modal(el);
      cv.width = cv.clientWidth; cv.height = cv.clientHeight; const c = cv.getContext('2d');
      const pos = new Map(); const BW = 96, BH = 34, GX = 18, GY = 70;
      for (const g of gens) { const row = byGen.get(g); row.sort((a, b) => (a.p.parents[0] || 0) - (b.p.parents[0] || 0) || a.p.bornTick - b.p.bornTick); const totalW = row.length * (BW + GX); row.forEach((n, k) => pos.set(n.p.id, { x: -totalW / 2 + k * (BW + GX) + BW / 2, y: (g - gens[0]) * GY + 40 })); }
      const view = { x: cv.width / 2, y: 20, s: 1 };
      const draw = () => {
        c.clearRect(0, 0, cv.width, cv.height); c.save(); c.translate(view.x, view.y); c.scale(view.s, view.s);
        c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1;
        for (const n of nodes.values()) { const a = pos.get(n.p.id); for (const par of n.p.parents) { const b = par != null ? pos.get(par) : null; if (!b) continue; c.beginPath(); c.moveTo(b.x, b.y + BH / 2); c.lineTo(b.x, b.y + BH / 2 + 12); c.lineTo(a.x, a.y - BH / 2 - 12); c.lineTo(a.x, a.y - BH / 2); c.stroke(); } }
        for (const n of nodes.values()) { const p = pos.get(n.p.id); const alive = w.agents.has(n.p.id); c.fillStyle = n.p.id === root.id ? 'rgba(224,177,90,0.25)' : alive ? 'rgba(90,200,184,0.15)' : 'rgba(255,255,255,0.05)'; c.strokeStyle = n.p.id === root.id ? '#e0b15a' : alive ? '#5ac8b8' : '#444'; c.fillRect(p.x - BW / 2, p.y - BH / 2, BW, BH); c.strokeRect(p.x - BW / 2, p.y - BH / 2, BW, BH); c.fillStyle = n.p.palette ? n.p.palette.skin : '#888'; c.fillRect(p.x - BW / 2 + 5, p.y - 8, 10, 10); c.fillStyle = n.p.palette ? n.p.palette.hair : '#444'; c.fillRect(p.x - BW / 2 + 5, p.y - 11, 10, 4); c.fillStyle = alive ? '#eee' : '#888'; c.font = '11px system-ui'; c.textAlign = 'left'; c.fillText(n.p.name.slice(0, 11), p.x - BW / 2 + 20, p.y - 1); c.fillStyle = '#777'; c.font = '9px system-ui'; c.fillText(alive ? `${Math.floor(LW.Agents.age(w, n.p))} éves` : `†${LW.Time.year(n.p.diedTick)}. év`, p.x - BW / 2 + 20, p.y + 11); }
        c.restore();
      };
      draw();
      let drag = null; cv.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: false }; });
      window.addEventListener('mousemove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true; view.x += dx; view.y += dy; drag.x = e.clientX; drag.y = e.clientY; draw(); });
      window.addEventListener('mouseup', (e) => { if (!drag) return; if (!drag.moved) { const rect = cv.getBoundingClientRect(); const mx = (e.clientX - rect.left - view.x) / view.s, my = (e.clientY - rect.top - view.y) / view.s; for (const n of nodes.values()) { const p = pos.get(n.p.id); if (Math.abs(mx - p.x) < BW / 2 && Math.abs(my - p.y) < BH / 2) { if (w.agents.has(n.p.id)) { this.closeModal(); this.select(w.agents.get(n.p.id)); this.r.centerOn(n.p.x, n.p.y); } else this.showDeceased(n.p); break; } } } drag = null; });
      cv.addEventListener('wheel', (e) => { e.preventDefault(); view.s = LW.clamp(view.s * (e.deltaY < 0 ? 1.15 : 0.87), 0.3, 3); draw(); }, { passive: false });
    }
    // ---------------- Teremtő-sáv
    buildGodBar() {
      const box = $('#god-interventions'); box.innerHTML = ''; box.appendChild(h('span', { class: 'gtitle' }, 'Teremtő'));
      for (const [k, K] of Object.entries(LW.God.KINDS)) { const b = h('button', { class: 'godbtn' + (['disease', 'kill', 'destroy', 'meteor', 'earthquake', 'fire', 'lightning'].includes(k) ? ' danger' : ''), title: K.desc, onclick: () => this.pickGod(k) }, LW.Icons.el(k, 20), K.label); b.dataset.god = k; box.appendChild(b); }
      const cb = $('#god-commands'); cb.innerHTML = ''; cb.appendChild(h('span', { class: 'gtitle', id: 'cmd-title' }, 'Parancs'));
      for (const [k, label] of Object.entries(LW.God.COMMANDS)) cb.appendChild(h('button', { class: 'godbtn', onclick: () => this.pickCmd(k) }, LW.Icons.el(k, 20), label));
      const mode = h('button', { class: 'modebtn', id: 'cmd-mode', onclick: () => { this.cmdMode = this.cmdMode === 'force' ? 'message' : 'force'; this.refreshGodBar(); this.click(); } }, 'Isteni üzenet'); cb.appendChild(mode);
    }
    pickGod(k) { this.click(); if (this.app.observer) { this.toast('Megfigyelő mód', 'Innen nem tudsz beavatkozni. A menüből átveheted a világot.', true); return; } if (this.godTool === k) { this.godTool = null; this.r.godCursor = null; $('#world').classList.remove('god'); } else { this.godTool = k; this.pendingCmd = null; const K = LW.God.KINDS[k]; this.r.godCursor = { kind: k, radius: { rain: 12, forest: 3, food: 3, animals: 4, resource: 6, disease: 5, healing: 5, fertility: 6, earthquake: 8, meteor: 4 }[k] || 0 }; $('#world').classList.add('god'); if (K.target === 'world') { const text = LW.God.intervene(this.world, k, { x: -1, y: -1 }); if (text) this.audio.play(k === 'storm' ? 'thunder' : 'god'); this.godTool = null; this.r.godCursor = null; $('#world').classList.remove('god'); this.app.save(true); } } this.refreshGodBar(); }
    pickCmd(k) { this.click(); if (this.app.observer) return; const a = this.world.agents.get(this.selected); if (!a) return; if (k === 'leave' || k === 'build') { LW.God.command(this.world, a, k, { force: this.cmdMode === 'force' }); this.audio.play('command'); this.app.save(true); return; } this.pendingCmd = k; this.godTool = null; this.r.godCursor = null; $('#world').classList.add('god'); this.toast(LW.God.COMMANDS[k], k === 'follow' || k === 'protect' ? 'Kattints egy emberre.' : 'Kattints a térképre.', true); this.refreshGodBar(); }
    refreshGodBar() {
      document.querySelectorAll('[data-god]').forEach((b) => b.classList.toggle('active', b.dataset.god === this.godTool));
      $('#godbar').classList.toggle('hidden', !!this.app.observer);
      const agentSel = this.selKind === 'agent' && this.world.agents.has(this.selected);
      $('#god-commands').classList.toggle('hidden', !agentSel);
      if (agentSel) { $('#cmd-title').textContent = `Parancs: ${this.world.agents.get(this.selected).name}`; const m = $('#cmd-mode'); m.textContent = this.cmdMode === 'force' ? 'KÉNYSZER' : 'Isteni üzenet'; m.classList.toggle('active', this.cmdMode === 'force'); }
    }
    // ---------------- értesítések & ablakok
    toast(title, text, minor) { const box = $('#toasts'); const el = h('div', { class: 'toast' + (minor ? ' minor' : '') }, h('b', null, title), h('span', null, text)); box.appendChild(el); setTimeout(() => el.remove(), minor ? 3600 : 6800); while (box.children.length > 4) box.removeChild(box.firstChild); }
    modal(content) { const m = $('#modal'); m.innerHTML = ''; m.appendChild(content); $('#overlay').classList.remove('hidden'); }
    closeModal() { $('#overlay').classList.add('hidden'); }
    showObserver(reason) { let b = $('#observer'); if (!b) { b = h('div', { id: 'observer' }); document.body.appendChild(b); } b.innerHTML = ''; b.appendChild(h('b', null, 'MEGFIGYELŐ MÓD')); b.appendChild(h('span', null, ` ${reason || 'A világ máshol fut.'} A kép percenként frissül. `)); b.appendChild(h('button', { onclick: () => { this.click(); if (LW.Cloud.canWrite) this.app.takeOver(); else this.showMenu(); } }, LW.Cloud.canWrite ? 'Átveszem itt' : 'Teremtő-kulcs megadása')); b.classList.remove('hidden'); this.refreshGodBar(); this.refreshCloud(); }
    hideObserver() { const b = $('#observer'); if (b) b.classList.add('hidden'); this.refreshGodBar(); this.refreshCloud(); }
    showMenu() {
      const app = this.app; const el = h('div'); const w = this.world; const C = LW.Cloud;
      el.appendChild(h('h1', null, w.name, h('small', null, `seed ${w.seed} · ${HU().shape(w.shape)} · motor ${LW.ENGINE_VERSION}`)));
      // felhő
      const cloudBox = h('div', { style: 'border:1px solid rgba(224,177,90,.3);border-radius:6px;padding:10px 12px;margin:10px 0' });
      cloudBox.appendChild(h('h3', { style: 'margin:0 0 6px;font-size:11px;letter-spacing:.2em;color:#e0b15a' }, 'FELHŐ — A VILÁG OTTHONA'));
      cloudBox.appendChild(h('p', { class: 'tiny', style: 'margin:0 0 6px' }, `A világ a GitHub-repóban él (${C.owner}/${C.repo}, „${C.branch}” ág), és félóránként a GitHub gépei is továbbviszik, amikor senki nem nézi. Bárki nézheti; írni csak a Teremtő-kulccsal lehet. Állapot: ${app.observer ? 'megfigyelő' : C.canWrite ? (C.status === 'error' ? 'hiba — ' + C.error : C.lastSaveMs ? 'mentve ' + LW.Time.realSpan(Date.now() - C.lastSaveMs) + ' óta' : 'kulcs megadva') : 'NINCS KULCS — ez a gép csak helyben ment'}.`));
      const tokenIn = h('input', { type: 'password', placeholder: 'GitHub személyes hozzáférési kulcs (Contents: read & write)', style: 'width:100%', value: '' });
      cloudBox.appendChild(tokenIn);
      cloudBox.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: async () => { const t = tokenIn.value.trim(); if (!t) return; try { await C.verify(t); this.toast('Kulcs elfogadva', 'Ez a gép mostantól a Teremtő gépe; a világ a felhőbe ment.', true); if (app.observer) app.takeOver(); else app.save(true); this.showMenu(); } catch (e) { this.toast('A kulcs nem jó', String(e.message || e), true); } } }, 'Kulcs mentése'), C.canWrite ? h('button', { onclick: () => { C.setToken(''); this.toast('Kulcs törölve', 'Ez a gép csak helyben ment.', true); this.showMenu(); } }, 'Kulcs törlése') : null, app.observer && C.canWrite ? h('button', { class: 'primary', onclick: () => { this.closeModal(); app.takeOver(); } }, 'Átveszem itt a világot') : null));
      cloudBox.appendChild(h('p', { class: 'tiny', style: 'margin:6px 0 0' }, 'Kulcs: github.com → Settings → Developer settings → Personal access tokens → Fine-grained → csak ez a repó, Contents: Read and write. A kulcs csak ebben a böngészőben tárolódik.'));
      el.appendChild(cloudBox);
      // nyelvi modell a beszélgetéshez
      const L = LW.LLM; const aiBox = h('div', { style: 'border:1px solid rgba(90,200,184,.3);border-radius:6px;padding:10px 12px;margin:10px 0' });
      aiBox.appendChild(h('h3', { style: 'margin:0 0 6px;font-size:11px;letter-spacing:.2em;color:#5ac8b8' }, 'BESZÉLGETÉS — NYELVI MODELL (INGYENES GEMINI-KULCS)'));
      aiBox.appendChild(h('p', { class: 'tiny', style: 'margin:0 0 6px' }, `Kulcs nélkül is beszélhetsz velük: a beépített válaszoló az emlékeikből, érzéseikből, kapcsolataikból felel. Ingyenes Google Gemini-kulccsal természetesebben fogalmaznak (a modell csak fogalmaz — hogy mi történik, azt a világ dönti el). Állapot: ${L.enabled ? (L.status === 'quota' ? 'a keret most kimerült, kis szünet' : L.status === 'error' ? 'hiba — ' + L.error : 'kulcs megadva · ' + L.model) : 'NINCS KULCS — beépített válaszoló'}.`));
      const aiIn = h('input', { type: 'password', placeholder: 'Gemini API-kulcs (AIza…)', style: 'width:100%', value: '' }); aiBox.appendChild(aiIn);
      const modelSel = h('select', { style: 'margin-top:6px;max-width:100%;font:inherit;color:var(--ink);background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:3px 4px' });
      const fillModels = () => { modelSel.innerHTML = ''; const names = L.models.length ? L.models : (L.model ? [L.model] : []); for (const n of names) modelSel.appendChild(h('option', { value: n }, n)); if (L.model) modelSel.value = L.model; modelSel.classList.toggle('hidden', !names.length); };
      fillModels(); modelSel.addEventListener('change', () => { L.setModel(modelSel.value); this.toast('Modell', modelSel.value, true); });
      aiBox.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: async () => { const k = aiIn.value.trim(); if (!k) return; try { const m = await L.verify(k); this.toast('Gemini-kulcs elfogadva', `Modell: ${m}. Beszélgess velük a Beszéd fülön.`, true); this.showMenu(); } catch (e) { this.toast('A kulcs nem jó', String(e.message || e), true); } } }, 'Kulcs mentése'), L.enabled ? h('button', { onclick: () => { L.setKey(''); L.setModel(''); L.models = []; this.toast('Kulcs törölve', 'A beépített válaszoló felel.', true); this.showMenu(); } }, 'Kulcs törlése') : null, L.enabled ? h('button', { onclick: async () => { try { L.models = await L.listModels(L.key); fillModels(); this.toast('Modellek frissítve', `${L.models.length} elérhető`, true); } catch (e) { this.toast('Nem sikerült', String(e.message || e), true); } } }, 'Modellek') : null));
      aiBox.appendChild(modelSel);
      aiBox.appendChild(h('p', { class: 'tiny', style: 'margin:6px 0 0' }, 'Kulcs: aistudio.google.com/apikey → „Create API key” (ingyenes, bankkártya nem kell). A kulcs csak ebben a böngészőben tárolódik; a kérések közvetlenül a Google-hoz mennek. Az ingyenes csomagban a Google felhasználhatja a beszélgetéseket a modelljei fejlesztésére.'));
      el.appendChild(aiBox);
      const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: this.audio.volume, oninput: (e) => this.audio.setVolume(+e.target.value) });
      el.appendChild(h('div', { class: 'kv', style: 'margin:10px 0' }, h('span', null, 'Hangerő'), vol));
      el.appendChild(h('p', { class: 'tiny', style: 'margin:0 0 8px' }, `Beszédhangok: ${LW.Voice.describeVoices()} Az emberek a Beszéd fülön szólalnak meg („hang” kapcsoló); mikrofonnal te is szólhatsz hozzájuk.`));
      const grid = h('div', { class: 'menu-grid' });
      grid.appendChild(h('button', { onclick: () => { app.save(true); this.toast('Mentve', 'A világ biztonságban van.', true); } }, 'Mentés most', h('small', null, 'Automatikus mentés 30 mp-enként és kilépéskor')));
      grid.appendChild(h('button', { onclick: () => app.exportWorld() }, 'Világ exportálása', h('small', null, 'Letölt egy .json fájlt, amit bárhol importálhatsz')));
      grid.appendChild(h('button', { onclick: () => app.importWorld() }, 'Világ importálása', h('small', null, 'Fájlból cseréli a jelenlegi világot')));
      for (let s = 1; s <= 3; s++) { const has = app.hasSnapshot(s); grid.appendChild(h('button', { onclick: async () => { await app.snapshot(s); this.showMenu(); } }, `Pillanatkép ${s}. hely`, h('small', null, has ? `mentve · ${has}` : 'üres — kattints a mentéshez'))); if (has) grid.appendChild(h('button', { onclick: () => { if (confirm('Visszaállítod ezt a pillanatképet? A jelenlegi világ lecserélődik. Előbb exportáld, ha meg akarod tartani.')) app.restoreSnapshot(s); } }, `Visszaállítás ${s}. hely`, h('small', null, 'visszaállítás, majd folytatás = alternatív idővonal'))); }
      grid.appendChild(h('button', { onclick: () => this.showNewWorld() }, 'Új világ…', h('small', null, 'Más seed, más történelem')));
      grid.appendChild(h('button', { onclick: () => { $('#debug').classList.toggle('hidden'); } }, 'Fejlesztői kijelző', h('small', null, 'tick µs, tick/s, rajzolás ms (` billentyű)')));
      grid.appendChild(h('button', { onclick: () => { this.closeModal(); this.showWelcomeReport(app.lastReport); } }, 'Utolsó látogatás jelentése', h('small', null, 'Mi történt, amíg nem voltál itt')));
      el.appendChild(grid);
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Vissza a világhoz')));
      this.modal(el);
    }
    showNewWorld() {
      const el = h('div'); el.appendChild(h('h1', null, 'Genezis', h('small', null, 'az új világ a jelenlegit váltja fel')));
      const seed = h('input', { type: 'text', value: String((Math.random() * 4294967295) >>> 0), style: 'width:100%' }); const pop = h('input', { type: 'number', min: 2, max: 20, value: 3, style: 'width:80px' });
      el.appendChild(h('p', null, 'Világ-seed')); el.appendChild(seed); el.appendChild(h('p', null, 'Kezdő népesség (2–20)')); el.appendChild(pop);
      el.appendChild(h('p', { class: 'tiny' }, 'Előbb exportáld a jelenlegi világot, ha meg akarod tartani.'));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => this.showMenu() }, 'Vissza'), h('button', { class: 'primary', onclick: () => { const s = seed.value.trim(); const n = /^\d+$/.test(s) ? (+s >>> 0) : LW.hash32(s); this.closeModal(); this.app.newWorld(n, LW.clamp(+pop.value || 3, 2, 20)); } }, 'Teremtés')));
      this.modal(el);
    }
    showHelp() {
      const el = h('div'); el.appendChild(h('h1', null, 'Hogyan nézz egy világot', h('small', null, 'Te vagy a Teremtő. A világnak nincs rád szüksége.')));
      el.appendChild(h('div', { class: 'help-grid' }, h('b', null, 'Beszéd fül'), h('span', null, 'hallgasd, ahogy egymással beszélnek (a saját, kialakuló nyelvükön), és szólj hozzájuk — kérj, kérdezz, sugallj; ők döntik el, mit kezdenek vele'), h('b', null, 'húzás / WASD'), h('span', null, 'kamera mozgatása'), h('b', null, 'görgő / + −'), h('span', null, 'nagyítás (közelről emberek, távolról civilizációk)'), h('b', null, 'kattintás'), h('span', null, 'ember, épület vagy mező megvizsgálása'), h('b', null, 'F'), h('span', null, 'a kiválasztott ember követése'), h('b', null, 'T'), h('span', null, 'a kiválasztott ember családfája'), h('b', null, 'szóköz'), h('span', null, 'szünet'), h('b', null, '1–5'), h('span', null, 'sebességfokozatok'), h('b', null, 'O / H'), h('span', null, 'világtérkép / vissza a Genezis helyére'), h('b', null, 'jobb klikk / Esc'), h('span', null, 'Teremtő-eszköz elvetése'), h('b', null, '`'), h('span', null, 'fejlesztői kijelző')));
      el.appendChild(h('p', null, 'A lenti Teremtő-eszközök a fizikai világot változtatják; aki látja, emlékezik rá, továbbadja, és hit alakulhat belőle. Válassz ki egy embert isteni parancshoz — üzenetként, amit ő értelmez, vagy kényszerként.'));
      el.appendChild(h('p', null, 'Nyelv: senki nem kap szavakat. Aki mondani akar valamit, kitalál rá egy szót; a másik megtanulja vagy elrontja; a távol élő csoportok szava eltér, és idővel külön nyelv lesz belőle. Aki neheztel rád, titkos szavakat sugdos, hogy ne értsd. Az „isteni fül” minden nem titkos szót megért; kikapcsolva neked kell kihallgatnod, mi mit jelent — vagy megkérdezni tőlük.'));
      el.appendChild(h('p', null, 'A világ akkor is él, amikor ez az oldal be van zárva: a felhőben lakik, a GitHub gépei félóránként továbbviszik, és visszatéréskor jelentést kapsz arról, mi történt.'));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => { this.closeModal(); if (!this.world.meta.started && !this.app.observer) this.showGenesis(); } }, 'Bezár')));
      this.modal(el);
    }
    showGenesis() {
      const w = this.world; const names = [...w.agents.values()].map((a) => a.name).join(', ');
      const el = h('div'); el.appendChild(h('h1', null, 'Genezis', h('small', null, 'egy világ születik')));
      el.appendChild(h('div', { class: 'big' }, w.name)); el.appendChild(h('p', null, `${HU().shape(w.shape)}, ${w.climateMean.toFixed(0)} °C-os átlaghőmérséklettel. Három kis lény áll egy hatalmas, vad világban: ${names}. Semmit sem tudnak. Tanulni fognak.`));
      el.appendChild(h('p', { class: 'tiny' }, 'Seed ' + w.seed + ' · a világ automatikusan mentődik · a menüből exportálhatod, hogy örökre megőrizd.'));
      el.appendChild(h('p', null, h('b', null, 'Az idő még nem indult el.'), ' A Nézem gombra indul — és onnantól nem vár rád: amíg az oldal zárva van, amíg a géped ki van kapcsolva, ők tovább élnek, és elmondjuk, mi történt.'));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => { this.closeModal(); this.showHelp(); } }, 'Hogyan működik?'), h('button', { class: 'primary', onclick: () => { this.closeModal(); this.app.startAudio(); this.app.beginWorld(); } }, 'Nézem')));
      this.modal(el);
    }
    showCatchup(progress, label) {
      let m = $('#modal'); if (!m.querySelector('#cu-bar')) { const el = h('div'); el.appendChild(h('h1', null, 'Üdv újra, Teremtő', h('small', null, 'a világ nem várt rád'))); el.appendChild(h('p', { id: 'cu-label' }, label)); el.appendChild(h('div', { class: 'progress' }, h('div', { id: 'cu-bar' }))); this.modal(el); }
      $('#cu-label').textContent = label; $('#cu-bar').style.width = Math.round(progress * 100) + '%';
    }
    showWelcomeReport(rep) {
      if (!rep || rep.skipped) { this.closeModal(); return; }
      const b = rep.before, a = rep.after; const el = h('div');
      el.appendChild(h('h1', null, 'Üdv újra, Teremtő', h('small', null, `${LW.Time.realSpan(rep.awayMs)} voltál távol · a világban ${LW.Time.span(rep.worldTicks)} telt el${rep.capped ? ' (korlátozva)' : ''}`)));
      const cell = (label, from, to, sub) => h('div', { class: 'cell' }, h('label', null, label), h('b', null, String(to)), from != null && from !== to ? h('span', { class: 'delta' }, `${from} → ${to}`) : null, sub ? h('div', null, h('small', null, sub)) : null);
      el.appendChild(h('div', { class: 'report' }, cell('Népesség', b.population, a.population, `${a.births - b.births} született · ${a.deaths - b.deaths} meghalt`), cell('Települések', b.settlements, a.settlements), cell('Technológia', b.techLevel, a.techLevel, `${Math.max(0, a.discoveries - b.discoveries)} új felfedezés`), cell('Épületek', null, a.buildings - b.buildings, 'elkészült'), cell('Párok', null, a.couples - b.couples, 'alakult'), cell('Hit benned', pct(rep.beliefBefore || 0), pct(rep.beliefAfter || 0))));
      const newTechs = a.techs.filter((t) => !b.techs.includes(t)).map((t) => LW.Tech.D[t].name).filter(Boolean);
      if (newTechs.length) el.appendChild(h('p', null, h('b', null, 'Felfedezték: '), newTechs.join(', ')));
      const firsts = (rep.firsts || []).slice(0, 8); if (firsts.length) { el.appendChild(h('h3', { style: 'color:#e0b15a;letter-spacing:.2em;font-size:11px;margin:12px 0 4px' }, 'TÖRTÉNELMI ELSŐK')); for (const [, f] of firsts) el.appendChild(h('div', { class: 'feed-item i3' }, h('span', { class: 'first' }, '★ ' + f.title), f.text)); }
      const ch = (rep.chronicle || []).filter((e) => !e.first).slice(-10); if (ch.length) { el.appendChild(h('h3', { style: 'color:#a9a395;letter-spacing:.2em;font-size:11px;margin:12px 0 4px' }, 'FONTOS ESEMÉNYEK')); for (const e of ch) el.appendChild(h('div', { class: 'feed-item ' + (e.god ? 'god' : 'i2') }, h('time', null, `${e.year}. év`), e.text)); }
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => { this.closeModal(); this.app.startAudio(); } }, 'Megnézem a világot')));
      this.modal(el);
    }
    // ---------------- hangok
    bindSounds(world) {
      const on = (t, name, cond) => world.events.on(t, (ev) => { if (this.app.catchingUp || (cond && !cond(ev))) return; this.audio.play(name); });
      on('AgentBorn', 'birth'); on('AgentDied', 'death'); on('CoupleFormed', 'love', (e) => e.stage === 'partners'); on('DiscoveryMade', 'discovery', (e) => !LW.Tech.D[e.tech].hidden); on('BuildingCompleted', 'build', (e) => e.kind !== 'campfire'); on('Lightning', 'thunder'); on('WildfireStarted', 'fire'); on('SettlementFounded', 'settlement'); on('SettlementGrew', 'settlement'); on('ConflictOccurred', 'conflict'); on('DivineCommandInterpreted', 'command');
    }
    // ---------------- képkockánkénti frissítés
    update(dt) {
      const now = performance.now(); if (now - this.lastPanel < 250) return; this.lastPanel = now;
      this.refreshTop(); this.refreshCloud(); this.chat.update(); if (this.selected != null && !$('#right').classList.contains('hidden')) this.renderInspector();
      if (this.tab === 'people' && (this.frameCount = (this.frameCount || 0) + 1) % 12 === 0) this.renderPeople();
      const dbg = $('#debug'); if (!dbg.classList.contains('hidden')) { const p = this.sim.perf; dbg.textContent = `tick ${p.tickUs.toFixed(0)} µs (max ${p.tickMaxUs.toFixed(0)}) · ${p.ticksLastSec} tick/s · rajz ${this.r.perf.ms.toFixed(1)} ms · emberek ${this.world.population} · épületek ${this.world.buildings.size} · ég ${this.world.burning.size} · piszkos ${this.world.dirtyTiles.size} · mentés ${(this.app.lastSaveSize / 1024).toFixed(0)} KB · hibák ${this.sim.errors.length} · felhő ${LW.Cloud.status}`; }
    }
  }
  LW.UI = UI;
})(globalThis.LW || (globalThis.LW = {}));
