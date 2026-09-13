/* LEVENTE — THE CREATOR · ui/ui.js — panels, inspector, WHY?, family tree, god panel, modals, toasts */
(function (LW) {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const h = (tag, attrs, ...kids) => { const el = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') el.className = attrs[k]; else if (k === 'html') el.innerHTML = attrs[k]; else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]); else if (k === 'style') el.style.cssText = attrs[k]; else el.setAttribute(k, attrs[k]); } for (const kid of kids) { if (kid == null) continue; el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid); } return el; };
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const pct = (v) => Math.round(v * 100) + '%';
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : '';

  class UI {
    constructor(app) {
      this.app = app; this.sim = app.sim; this.world = app.sim.world; this.r = app.renderer; this.audio = app.audio;
      this.tab = 'feed'; this.selected = null; this.selKind = null; this.godTool = null; this.cmdMode = 'message'; this.pendingCmd = null; this.lastPanel = 0; this.feedCount = 0; this.tree = null;
      this.bindTop(); this.bindTabs(); this.bindCanvas(); this.buildGodBar(); this.bindKeys();
      this.attachWorld(this.world);
    }
    attachWorld(world) {
      this.world = world; this.sim = this.app.sim; this.feedCount = 0; this.selected = null; this.selKind = null; $('#right').classList.add('hidden'); $('#mmwrap').classList.remove('shift'); $('#godbar').classList.remove('shift');
      $('#tab-feed').innerHTML = ''; $('#tab-god').innerHTML = ''; this.renderChronicle(); this.renderFirsts(); this.renderPeople();
      world.onHistory = (e) => this.onHistory(e);
      for (const e of world.history.feed.slice(-120)) this.appendFeed(e, false);
      for (const e of world.history.godFeed.slice(-60)) this.appendFeed(e, false, $('#tab-god'));
      this.bindSounds(world);
      this.refreshTop();
    }
    // ---------------- top bar & tabs
    bindTop() {
      document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => { this.setSpeed(b.dataset.speed); this.click(); }));
      $('#btn-sound').addEventListener('click', () => { this.app.toggleSound(); this.refreshSound(); });
      $('#btn-menu').addEventListener('click', () => { this.click(); this.showMenu(); });
      $('#btn-help').addEventListener('click', () => { this.click(); this.showHelp(); });
      this.refreshSpeed(); this.refreshSound();
    }
    setSpeed(p) { if (!this.world.meta.started) { this.showGenesis(); return; } if (p === 'pause') this.sim.paused = !this.sim.paused; else { this.sim.paused = false; this.sim.setPreset(p); } this.refreshSpeed(); }
    refreshSpeed() { document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('active', this.sim.paused ? b.dataset.speed === 'pause' : b.dataset.speed === this.sim.preset)); }
    refreshSound() { $('#btn-sound').classList.toggle('active', this.audio.enabled && !this.audio.muted); $('#btn-sound').textContent = this.audio.enabled && !this.audio.muted ? '♪' : '♪̸'; }
    bindTabs() { document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab; document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b)); document.querySelectorAll('.tabbody').forEach((x) => x.classList.toggle('hidden', x.id !== 'tab-' + this.tab)); if (this.tab === 'chronicle') this.renderChronicle(); if (this.tab === 'firsts') this.renderFirsts(); if (this.tab === 'people') this.renderPeople(); this.click(); })); }
    click() { this.audio.play('click'); }
    refreshTop() {
      const w = this.world, s = this.sim.summary(); const T = LW.Time;
      $('#st-age').textContent = `Year ${w.year}`; $('#st-date').textContent = `${T.seasonName(w.tick)} · day ${T.dayOfYear(w.tick) + 1} · ${T.clock(w.tick)}`;
      $('#st-pop').textContent = s.population; $('#st-popsub').textContent = `${s.births} born · ${s.deaths} died`;
      $('#st-tech').textContent = s.techLevel; $('#st-techsub').textContent = `${s.techs} known · ${s.discoveries} discoveries`;
      $('#st-settle').textContent = s.settlements; $('#st-largest').textContent = s.largest;
      const i = w.idx(LW.clamp(this.r.cam.x | 0, 0, w.w - 1), LW.clamp(this.r.cam.y | 0, 0, w.h - 1)); const temp = w.tileTemp(i);
      $('#st-weather').textContent = w.weather.describe(temp); $('#st-temp').textContent = `${temp.toFixed(0)}°C · wind ${Math.round(w.weather.wind.speed * 40)} km/h`;
    }
    // ---------------- feed / history
    onHistory(e) {
      if (this.app.catchingUp) return;
      this.appendFeed(e, true); if (e.god) this.appendFeed(e, true, $('#tab-god'));
      if (e.importance >= this.world.cfg.history.chronicleThreshold && this.tab === 'chronicle') this.renderChronicle();
      if (e.first) { this.toast(e.first, e.text, false); this.audio.play('first'); if (this.tab === 'firsts') this.renderFirsts(); }
      else if (e.importance >= 0.6 && !e.god) this.toast(e.type.replace(/([A-Z])/g, ' $1').trim(), e.text, true);
    }
    appendFeed(e, scroll, container) {
      const box = container || $('#tab-feed'); const cls = e.god ? 'god' : e.importance >= 0.6 ? 'i3' : e.importance >= 0.3 ? 'i2' : 'i1';
      const el = h('div', { class: 'feed-item ' + cls, onclick: () => this.jumpTo(e) }, h('time', null, `Y${e.year} D${LW.Time.dayOfYear(e.tick) + 1} ${LW.Time.clock(e.tick)}`), e.first ? h('span', { class: 'first' }, '★ ' + e.first) : null, document.createTextNode(e.text));
      box.appendChild(el); while (box.children.length > 220) box.removeChild(box.firstChild);
      if (scroll && box.scrollHeight - box.scrollTop - box.clientHeight < 80) box.scrollTop = box.scrollHeight;
    }
    jumpTo(e) { const w = this.world; if (e.agentId != null && w.agents.has(e.agentId)) { this.select(w.agents.get(e.agentId)); const a = w.agents.get(e.agentId); this.r.centerOn(a.x, a.y); } else if (e.tile != null) { this.r.centerOn(w.xOf(e.tile) + 0.5, w.yOf(e.tile) + 0.5); } if (this.r.cam.zoom < 12) this.r.cam.zoom = 12; }
    renderChronicle() {
      const box = $('#tab-chronicle'); box.innerHTML = ''; const ch = this.world.history.chronicle; let year = -1;
      const list = ch.slice(-400);
      if (!list.length) box.appendChild(h('p', { class: 'tiny' }, 'The chronicle is empty. History has not happened yet.'));
      for (const e of list) { if (e.year !== year) { year = e.year; box.appendChild(h('div', { class: 'chron-year' }, `YEAR ${year}`)); } const el = h('div', { class: 'feed-item ' + (e.first ? 'i3' : e.god ? 'god' : 'i2'), onclick: () => this.jumpTo(e) }, e.first ? h('span', { class: 'first' }, '★ ' + e.first) : null, document.createTextNode(e.text)); box.appendChild(el); }
      box.scrollTop = box.scrollHeight;
    }
    renderFirsts() {
      const box = $('#tab-firsts'); box.innerHTML = ''; const f = Object.values(this.world.history.firsts).sort((a, b) => a.tick - b.tick);
      if (!f.length) box.appendChild(h('p', { class: 'tiny' }, 'No firsts yet.'));
      for (const x of f) box.appendChild(h('div', { class: 'first-card', onclick: () => this.jumpTo(x) }, h('b', null, x.title), h('small', null, `Year ${LW.Time.year(x.tick)} — ${x.text}`)));
    }
    renderPeople() {
      const box = $('#tab-people'); box.innerHTML = ''; const w = this.world; const A = LW.Agents;
      const list = [...w.agents.values()].sort((a, b) => b.importance - a.importance || a.bornTick - b.bornTick);
      box.appendChild(h('p', { class: 'tiny' }, `${list.length} living · ${w.deceased.size} remembered`));
      for (const a of list) box.appendChild(h('div', { class: 'person-row', onclick: () => { this.select(a); this.r.centerOn(a.x, a.y); this.r.follow = a.id; } }, h('span', { class: 'sw', style: `background:${a.palette.skin};border:2px solid ${a.palette.hair}` }), h('span', { class: 'nm' }, a.name), h('small', null, `${Math.floor(A.age(w, a))} · ${a.occupation || A.stage(w, a)}`)));
      if (w.deceased.size) { box.appendChild(h('h3', { style: 'margin:10px 0 4px;font-size:10px;letter-spacing:.2em;color:#6f6a60' }, 'THE DEAD')); for (const d of [...w.deceased.values()].slice(-40).reverse()) box.appendChild(h('div', { class: 'person-row', onclick: () => this.showDeceased(d) }, h('span', { class: 'sw', style: `background:${d.palette ? d.palette.skin : '#666'};opacity:.5` }), h('span', { class: 'nm', style: 'color:#8a8478' }, d.name), h('small', null, `${d.cause} · Y${LW.Time.year(d.diedTick)}`))); }
    }
    // ---------------- canvas input
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
      if (this.pendingCmd) { const cmd = this.pendingCmd; const a = w.agents.get(this.selected); this.pendingCmd = null; $('#world').classList.remove('god'); if (a) { const tile = w.inBounds(p.x | 0, p.y | 0) ? w.idx(p.x | 0, p.y | 0) : null; const targetId = pk && pk.agent && pk.agent.id !== a.id ? pk.agent.id : null; LW.God.command(w, a, cmd, { tile, targetId, force: this.cmdMode === 'force' }); this.audio.play('command'); this.app.save(); } this.refreshGodBar(); return; }
      if (this.godTool) { const K = LW.God.KINDS[this.godTool]; const params = { x: p.x, y: p.y }; if (K.target === 'agent') { if (!(pk && pk.agent)) { this.toast('Choose a person', 'Click on someone.', true); return; } params.agentId = pk.agent.id; } const text = LW.God.intervene(w, this.godTool, params); if (text) { this.audio.play(this.godTool === 'earthquake' ? 'quake' : this.godTool === 'meteor' ? 'meteor' : this.godTool === 'lightning' || this.godTool === 'storm' ? 'thunder' : this.godTool === 'fire' ? 'fire' : this.godTool === 'rain' ? 'rain' : 'god'); this.app.save(); } if (!K.manifest && this.godTool !== 'spawn') { /* keep tool active for repeated use */ } else { this.godTool = null; this.r.godCursor = null; $('#world').classList.remove('god'); this.refreshGodBar(); } return; }
      if (pk && pk.agent) { this.select(pk.agent); return; }
      if (pk && pk.building) { this.selectBuilding(pk.building); return; }
      if (pk && pk.tile != null) { this.selectTile(pk.tile); return; }
    }
    bindKeys() {
      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
        const k = e.key.toLowerCase(); const st = 24;
        if (k === ' ') { e.preventDefault(); this.setSpeed('pause'); } else if (k === 'w' || k === 'arrowup') this.r.pan(0, st); else if (k === 's' || k === 'arrowdown') this.r.pan(0, -st); else if (k === 'a' || k === 'arrowleft') this.r.pan(st, 0); else if (k === 'd' || k === 'arrowright') this.r.pan(-st, 0);
        else if (k === '+' || k === '=') this.r.zoomIn(); else if (k === '-') this.r.zoomOut(); else if (k === 'o') this.r.overview(); else if (k === 'h') { this.r.centerOn(this.world.genesis.x, this.world.genesis.y); this.r.cam.zoom = 12; }
        else if (k === 'f' && this.selected != null) this.r.follow = this.r.follow ? null : this.selected; else if (k === 'escape') { this.godTool = null; this.pendingCmd = null; this.r.godCursor = null; $('#world').classList.remove('god'); this.refreshGodBar(); this.closeModal(); }
        else if (k === '1') this.setSpeed('slow'); else if (k === '2') this.setSpeed('normal'); else if (k === '3') this.setSpeed('fast'); else if (k === '4') this.setSpeed('ultra'); else if (k === '5') this.setSpeed('hyper');
        else if (k === '`') $('#debug').classList.toggle('hidden'); else if (k === 't' && this.selected != null) this.showTree(this.world.agents.get(this.selected));
      });
    }
    // ---------------- selection & inspector
    _openRight() { $('#right').classList.remove('hidden'); $('#mmwrap').classList.add('shift'); $('#godbar').classList.add('shift'); }
    select(a) { this.selected = a.id; this.selKind = 'agent'; this.r.selected = a.id; this._openRight(); this.renderInspector(true); this.refreshGodBar(); }
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
      el.appendChild(h('div', { class: 'sub' }, `${a.sex === 'f' ? 'Woman' : 'Man'} · ${Math.floor(age)} years · ${cap(a.occupation || stage)} · generation ${a.generation}${a.genesis ? ' · one of the First' : ''}${settlement ? ' · ' + settlement.name : ''}${a.pregnancy ? ' · expecting' : ''}`));
      el.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: () => { this.r.follow = this.r.follow === a.id ? null : a.id; this.click(); } }, this.r.follow === a.id ? '● Following' : 'Follow'), h('button', { onclick: () => { this.showTree(a); this.click(); } }, 'Family tree'), h('button', { onclick: () => { this.showWhy(a); this.click(); } }, 'WHY?')));
      el.appendChild(h('div', { class: 'thought' }, `“${this.thought(a)}”`));
      el.appendChild(h('h3', null, 'Condition'));
      el.appendChild(this.bar('Health', a.health)); el.appendChild(this.bar('Mood', LW.clamp01(0.5 + this.mood(a) / 2), this.mood(a) < -0.2 ? 'bad' : this.mood(a) < 0.1 ? 'warn' : ''));
      el.appendChild(h('h3', null, 'Needs'));
      for (const k of ['food', 'water', 'energy', 'warmth', 'safety', 'social', 'affection', 'curiosity']) el.appendChild(this.bar(cap(k), a.needs[k]));
      el.appendChild(h('h3', null, 'Feeling'));
      const em = Object.entries(a.emotions).filter(([, v]) => v > 0.12).sort((x, y) => y[1] - x[1]).slice(0, 5);
      el.appendChild(h('div', { class: 'chips' }, ...(em.length ? em.map(([k, v]) => h('span', { class: 'chip' + (k === 'love' || k === 'attraction' ? ' rose' : '') }, `${k} ${pct(v)}`)) : [h('span', { class: 'chip' }, 'calm')])));
      el.appendChild(h('h3', null, 'Character'));
      const tr = Object.entries(a.personality).sort((x, y) => Math.abs(y[1] - 0.5) - Math.abs(x[1] - 0.5)).slice(0, 6);
      el.appendChild(h('div', { class: 'chips' }, ...tr.map(([k, v]) => h('span', { class: 'chip' }, `${v >= 0.5 ? '' : 'low '}${k.replace(/([A-Z])/g, ' $1').toLowerCase()} ${pct(v)}`))));
      el.appendChild(h('h3', null, 'Family & bonds'));
      const kv = h('div', { class: 'kv' });
      const link = (id) => { const o = w.agents.get(id); const d = w.deceased.get(id); if (o) return h('span', { class: 'chip link', onclick: () => { this.select(o); this.r.centerOn(o.x, o.y); } }, o.name); if (d) return h('span', { class: 'chip', style: 'opacity:.6', onclick: () => this.showDeceased(d) }, d.name + ' †'); return h('span', { class: 'chip' }, '?'); };
      kv.appendChild(h('span', null, 'Partner')); kv.appendChild(h('div', { class: 'chips' }, a.partner != null ? link(a.partner) : h('span', { class: 'chip' }, stage === 'adult' || stage === 'elder' ? 'single' : '—')));
      kv.appendChild(h('span', null, 'Parents')); kv.appendChild(h('div', { class: 'chips' }, ...(a.parents.some((p) => p != null) ? a.parents.filter((p) => p != null).map(link) : [h('span', { class: 'chip' }, a.genesis ? 'none — created' : 'unknown')])));
      kv.appendChild(h('span', null, 'Children')); kv.appendChild(h('div', { class: 'chips' }, ...(a.children.length ? a.children.map(link) : [h('span', { class: 'chip' }, 'none')])));
      const rels = [...a.relationships.entries()].map(([id, r]) => ({ id, r, label: R.label(r) })).filter((x) => x.label !== 'stranger' && x.label !== 'family' && w.agents.has(x.id)).sort((x, y) => (y.r.friendship + y.r.romance - y.r.resentment) - (x.r.friendship + x.r.romance - x.r.resentment)).slice(0, 8);
      kv.appendChild(h('span', null, 'Others')); kv.appendChild(h('div', { class: 'chips' }, ...(rels.length ? rels.map((x) => h('span', { class: 'chip link' + (x.label.includes('enemy') || x.label === 'rival' ? '' : x.label === 'dating' || x.label === 'partner' ? ' rose' : ''), onclick: () => { const o = w.agents.get(x.id); this.select(o); this.r.centerOn(o.x, o.y); }, title: `trust ${pct(x.r.trust)} · friendship ${pct(x.r.friendship)} · attraction ${pct(x.r.attraction)} · resentment ${pct(x.r.resentment)}` }, `${w.agents.get(x.id).name} · ${x.label}`)) : [h('span', { class: 'chip' }, 'knows no one well')])));
      el.appendChild(kv);
      el.appendChild(h('h3', null, 'Knowledge & skills'));
      const techs = [...a.knowledge.techs].map((t) => LW.Tech.D[t]).filter((d) => !d.hidden); const hidden = [...a.knowledge.techs].map((t) => LW.Tech.D[t]).filter((d) => d.hidden);
      el.appendChild(h('div', { class: 'chips' }, ...(techs.length ? techs.map((d) => h('span', { class: 'chip gold', title: d.desc }, d.name)) : [h('span', { class: 'chip' }, 'only instinct')]), ...hidden.map((d) => h('span', { class: 'chip', title: d.desc }, d.name))));
      const sk = Object.entries(a.skills).filter(([, v]) => v > 0.12).sort((x, y) => y[1] - x[1]).slice(0, 5);
      if (sk.length) el.appendChild(h('div', { class: 'chips', style: 'margin-top:4px' }, ...sk.map(([k, v]) => h('span', { class: 'chip' }, `${k} ${pct(v)}`))));
      el.appendChild(h('h3', null, 'Belongings'));
      const inv = Object.entries(a.inv).filter(([, q]) => q > 0);
      el.appendChild(h('div', { class: 'chips' }, ...(inv.length ? inv.map(([k, q]) => h('span', { class: 'chip' }, `${LW.ITEMS[k] ? LW.ITEMS[k].label : k} ×${q}`)) : [h('span', { class: 'chip' }, 'nothing')])));
      el.appendChild(h('div', { class: 'kv', style: 'margin-top:6px' }, h('span', null, 'Home'), h('span', null, home ? `${LW.Buildings.def(home).label}${home.storage && Object.keys(home.storage).length ? ' · stores ' + Object.entries(home.storage).map(([k, q]) => `${q} ${LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k}`).join(', ') : ''}` : 'none'), h('span', null, 'Belief'), h('span', null, a.beliefs.creator > 0.7 ? `believes in the Creator (${pct(a.beliefs.creator)})` : a.beliefs.creator > 0.3 ? `wonders about a Creator (${pct(a.beliefs.creator)})` : 'knows nothing of you')));
      if (a.achievements.length) { el.appendChild(h('h3', null, 'Achievements')); el.appendChild(h('div', { class: 'chips' }, ...a.achievements.map((x) => h('span', { class: 'chip gold' }, x)))); }
      el.appendChild(h('h3', null, 'Memories'));
      const mems = a.memory.episodic.slice(-10).reverse();
      for (const m of mems) el.appendChild(h('div', { class: 'mem' + (m.divine ? ' divine' : '') }, h('time', null, `Y${LW.Time.year(m.tick)} D${LW.Time.dayOfYear(m.tick) + 1}`), h('b', null, m.text), m.source === 'told' ? h('span', { class: 'tiny' }, ` (heard from ${this.nameOf(m.teller)})`) : null));
      if (!mems.length) el.appendChild(h('div', { class: 'mem' }, 'No memories yet.'));
      return el;
    }
    mood(a) { const E = a.emotions; return E.joy + E.love + E.pride + 0.5 * E.excitement - E.sadness - E.fear - E.anger - E.grief - E.shame - 0.5 * E.stress; }
    nameOf(id) { const a = this.world.agents.get(id) || this.world.deceased.get(id); return a ? a.name : 'someone'; }
    thought(a) {
      const w = this.world; const act = LW.Actions.describe(w, a); const E = a.emotions, N = a.needs;
      if (a.sleeping) return E.grief > 0.3 ? 'Sleep is the only place the ache stops.' : 'Sleeping.';
      if (a.divineRequest) return a.divineRequest.force ? 'My body moves and it is not I who moves it.' : 'A voice with no mouth. I must decide what it wants.';
      if (a.danger > 0.4) return 'Danger. Get away.';
      if (N.food < 0.2) return `So hungry. ${cap(act)}.`; if (N.water < 0.2) return `My throat is dust. ${cap(act)}.`; if (N.warmth < 0.3) return `The cold is in my bones. ${cap(act)}.`;
      if (E.grief > 0.5) return 'They are gone. I keep looking for them anyway.'; if (E.love > 0.6 && a.partner != null) return `${this.nameOf(a.partner)}. Everything is lighter today.`; if (E.jealousy > 0.5) return 'I saw them together. I cannot stop seeing it.'; if (E.fear > 0.5) return 'Something is wrong. I feel it in the air.'; if (E.pride > 0.5) return 'I made something. It is mine and it is good.';
      const p = a.plan; if (p && p.goal === 'experiment') return `What if I try it another way? (${act})`; if (p && p.goal === 'explore') return 'What lies beyond the trees?'; if (p && p.goal === 'flirt') return `${cap(act)}. I hope they notice me.`; if (p && p.goal === 'buildShelter') return 'We need walls before the cold comes.';
      return cap(act) + '.';
    }
    showWhy(a) {
      const why = a.why; const el = h('div');
      el.appendChild(h('h1', null, 'WHY?', h('small', null, `${a.name} · ${LW.Time.stamp(why ? why.tick : this.world.tick)}`)));
      if (!why) { el.appendChild(h('p', null, 'No decision recorded yet.')); }
      else {
        const lines = [`CHOSEN  ${why.chosen.goal.padEnd(14)} score ${why.chosen.score.toFixed(2)}`, `        ${why.chosen.factors.join(' · ') || '—'}`, '', 'CONTEXT ' + Object.entries(why.context).map(([k, v]) => `${k} ${typeof v === 'number' ? (v > 1 ? v : Math.round(v * 100) + '%') : v}`).join(' · '), '', 'REJECTED'];
        for (const alt of why.alternatives) lines.push(`  ${alt.goal.padEnd(14)} ${alt.score.toFixed(2)}   ${alt.factors.join(' · ')}`);
        lines.push('', `PLAN    ${a.plan ? a.plan.steps.map((s, i) => (i === a.plan.i ? '▶' : ' ') + s.op + (s.item ? ':' + s.item : s.recipe ? ':' + s.recipe : s.tech ? ':' + s.tech : '')).join('  ') : '—'}`);
        el.appendChild(h('div', { class: 'why' }, lines.join('\n')));
        el.appendChild(h('p', { class: 'tiny' }, 'Scores = need urgency × personality × emotion × context + small noise. The plan is the state machine currently executing the chosen goal.'));
      }
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Close')));
      this.modal(el);
    }
    buildingView(b) {
      const w = this.world; const def = LW.Buildings.def(b); const el = h('div');
      el.appendChild(h('h2', null, def.label, h('button', { class: 'close', onclick: () => this.closeInspector() }, '✕')));
      const owner = b.ownerId != null ? (w.agents.get(b.ownerId) || w.deceased.get(b.ownerId)) : null; const s = b.settlementId ? w.settlements.get(b.settlementId) : null;
      el.appendChild(h('div', { class: 'sub' }, `${b.progress >= 1 ? 'Built' : 'Under construction'} ${b.builtTick > 0 ? 'year ' + LW.Time.year(b.builtTick) : ''}${s ? ' · ' + s.name : ''}`));
      if (b.progress < 1) { el.appendChild(this.bar('Progress', b.progress, '')); const m = LW.Buildings.missing(b); const ms = Object.entries(m); if (ms.length) el.appendChild(h('div', { class: 'chips' }, ...ms.map(([k, q]) => h('span', { class: 'chip' }, `needs ${q} ${LW.ITEMS[k].label.toLowerCase()}`)))); }
      el.appendChild(this.bar('Condition', b.hp, b.hp < 0.3 ? 'bad' : ''));
      if (b.kind === 'campfire') el.appendChild(this.bar('Fuel', Math.min(1, b.fuel / def.fuelTicks), b.lit ? '' : 'bad'));
      if (def.farm) el.appendChild(this.bar('Crop', b.planted ? b.crop : 0, ''));
      const kv = h('div', { class: 'kv', style: 'margin-top:8px' });
      kv.appendChild(h('span', null, 'Owner')); kv.appendChild(h('span', null, owner ? owner.name : 'no one'));
      if (def.dwelling) { kv.appendChild(h('span', null, 'Residents')); kv.appendChild(h('div', { class: 'chips' }, ...(b.residents.length ? b.residents.map((id) => { const o = w.agents.get(id); return o ? h('span', { class: 'chip link', onclick: () => { this.select(o); } }, o.name) : null; }) : [h('span', { class: 'chip' }, 'empty')]))); }
      if (def.storage) { kv.appendChild(h('span', null, 'Storage')); kv.appendChild(h('div', { class: 'chips' }, ...(Object.keys(b.storage).length ? Object.entries(b.storage).map(([k, q]) => h('span', { class: 'chip' }, `${LW.ITEMS[k] ? LW.ITEMS[k].label : k} ×${q}`)) : [h('span', { class: 'chip' }, 'empty')]))); }
      kv.appendChild(h('span', null, 'Provides')); kv.appendChild(h('span', null, [def.insulation ? `+${def.insulation}° warmth` : null, def.warmth ? `+${def.warmth}° warmth nearby` : null, def.light ? 'light' : null, def.safety ? `safety ${pct(def.safety)}` : null, def.sleep ? `sleep ${pct(def.sleep)}` : null, def.divine ? 'a sign from beyond' : null].filter(Boolean).join(' · ') || '—'));
      el.appendChild(kv);
      if (def.divine) el.appendChild(h('div', { class: 'btnrow' }, h('button', { onclick: () => { LW.Buildings.destroy(w, b, 'the will of the Creator'); this.closeInspector(); } }, 'Withdraw')));
      return el;
    }
    tileView(i) {
      const w = this.world, t = w.tiles; const el = h('div'); const x = w.xOf(i), y = w.yOf(i); const B = LW.BIOME_NAME[t.biome[i]];
      el.appendChild(h('h2', null, B, h('button', { class: 'close', onclick: () => this.closeInspector() }, '✕')));
      const s = LW.Settlements.at(w, x, y);
      el.appendChild(h('div', { class: 'sub' }, `${x}, ${y}${s ? ' · near ' + s.name : ''}`));
      const kv = h('div', { class: 'kv' });
      const row = (k, v) => { kv.appendChild(h('span', null, k)); kv.appendChild(h('span', null, v)); };
      row('Temperature', `${w.tileTemp(i).toFixed(1)}°C`); row('Elevation', `${Math.round((t.elev[i] - w.cfg.world.seaLevel) * 2500)} m`); row('Moisture', pct(t.moist[i] / 255)); row('Fertility', pct(t.fert[i] / 255));
      row('Food plants', `${t.veg[i]} / ${t.vegCap[i]}`); row('Trees', `${t.trees[i]} / ${t.treeCap[i]}`); row('Animals', `${t.animals[i]} / ${t.animalCap[i]}`); if (t.fishCap[i]) row('Fish', `${t.fish[i]} / ${t.fishCap[i]}`); row('Surface stone', String(t.stone[i]));
      row('Underground', t.depType[i] ? (t.depKnown[i] ? `${LW.DEPOSIT_NAME[t.depType[i]]} (${t.depAmt[i]} left)` : 'something, undiscovered') : 'nothing of note');
      row('Path', t.path[i] === 2 ? 'a worn path' : t.path[i] === 1 ? 'a faint trail' : '—'); if (t.snow[i]) row('Snow', pct(t.snow[i] / 255)); if (t.fire[i]) row('Fire', 'burning!'); if (t.burnt[i]) row('Scorched', 'yes');
      el.appendChild(kv);
      el.appendChild(h('p', { class: 'tiny', style: 'margin-top:10px' }, 'Creator note: the underground is real. Deposits are finite and only people who dig will know what lies beneath.'));
      return el;
    }
    showDeceased(d) {
      const w = this.world; const el = h('div'); el.appendChild(h('h1', null, d.name, h('small', null, `${d.sex === 'f' ? 'woman' : 'man'} · lived Y${LW.Time.year(d.bornTick)} – Y${LW.Time.year(d.diedTick)} · died of ${d.cause} at ${Math.floor(LW.Time.ageYears(d.bornTick, d.diedTick))}`)));
      const link = (id) => { const o = w.agents.get(id) || w.deceased.get(id); return h('span', { class: 'chip' + (w.agents.has(id) ? ' link' : ''), onclick: () => { if (w.agents.has(id)) { this.closeModal(); this.select(w.agents.get(id)); } else if (o) this.showDeceased(o); } }, o ? o.name + (w.agents.has(id) ? '' : ' †') : '?'); };
      el.appendChild(h('div', { class: 'kv' }, h('span', null, 'Parents'), h('div', { class: 'chips' }, ...(d.parents.filter((p) => p != null).length ? d.parents.filter((p) => p != null).map(link) : [h('span', { class: 'chip' }, d.genesis ? 'none — created' : 'unknown')])), h('span', null, 'Children'), h('div', { class: 'chips' }, ...(d.children.length ? d.children.map(link) : [h('span', { class: 'chip' }, 'none')])), h('span', null, 'Was'), h('span', null, cap(d.occupation || '—'))));
      if (d.achievements.length) el.appendChild(h('div', { class: 'chips', style: 'margin-top:8px' }, ...d.achievements.map((x) => h('span', { class: 'chip gold' }, x))));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => { this.closeModal(); this.showTree(d); } }, 'Family tree'), h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Close')));
      this.modal(el);
    }
    // ---------------- family tree (canvas)
    showTree(root) {
      const w = this.world; const get = (id) => w.agents.get(id) || w.deceased.get(id);
      // collect ancestors and descendants with generation offsets
      const nodes = new Map(); const visit = (p, g) => { if (!p || nodes.has(p.id)) return; nodes.set(p.id, { p, g }); for (const par of p.parents) if (par != null) visit(get(par), g - 1); for (const c of p.children) visit(get(c), g + 1); };
      visit(root, 0);
      const byGen = new Map(); for (const n of nodes.values()) { if (!byGen.has(n.g)) byGen.set(n.g, []); byGen.get(n.g).push(n); }
      const gens = [...byGen.keys()].sort((a, b) => a - b);
      const el = h('div'); el.appendChild(h('h1', null, 'Family tree', h('small', null, `${root.name} · ${nodes.size} people · ${gens.length} generations`)));
      const cv = h('canvas', { id: 'tree' }); el.appendChild(cv); el.appendChild(h('p', { class: 'tiny' }, 'Drag to pan · wheel to zoom · click a living person to inspect.')); el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Close')));
      this.modal(el);
      cv.width = cv.clientWidth; cv.height = cv.clientHeight; const c = cv.getContext('2d');
      const pos = new Map(); const BW = 96, BH = 34, GX = 18, GY = 70;
      for (const g of gens) { const row = byGen.get(g); row.sort((a, b) => (a.p.parents[0] || 0) - (b.p.parents[0] || 0) || a.p.bornTick - b.p.bornTick); const totalW = row.length * (BW + GX); row.forEach((n, k) => pos.set(n.p.id, { x: -totalW / 2 + k * (BW + GX) + BW / 2, y: (g - gens[0]) * GY + 40 })); }
      const view = { x: cv.width / 2, y: 20, s: 1 };
      const draw = () => {
        c.clearRect(0, 0, cv.width, cv.height); c.save(); c.translate(view.x, view.y); c.scale(view.s, view.s);
        c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1;
        for (const n of nodes.values()) { const a = pos.get(n.p.id); for (const par of n.p.parents) { const b = par != null ? pos.get(par) : null; if (!b) continue; c.beginPath(); c.moveTo(b.x, b.y + BH / 2); c.lineTo(b.x, b.y + BH / 2 + 12); c.lineTo(a.x, a.y - BH / 2 - 12); c.lineTo(a.x, a.y - BH / 2); c.stroke(); } }
        for (const n of nodes.values()) { const p = pos.get(n.p.id); const alive = w.agents.has(n.p.id); c.fillStyle = n.p.id === root.id ? 'rgba(224,177,90,0.25)' : alive ? 'rgba(90,200,184,0.15)' : 'rgba(255,255,255,0.05)'; c.strokeStyle = n.p.id === root.id ? '#e0b15a' : alive ? '#5ac8b8' : '#444'; c.fillRect(p.x - BW / 2, p.y - BH / 2, BW, BH); c.strokeRect(p.x - BW / 2, p.y - BH / 2, BW, BH); c.fillStyle = n.p.palette ? n.p.palette.skin : '#888'; c.fillRect(p.x - BW / 2 + 5, p.y - 8, 10, 10); c.fillStyle = n.p.palette ? n.p.palette.hair : '#444'; c.fillRect(p.x - BW / 2 + 5, p.y - 11, 10, 4); c.fillStyle = alive ? '#eee' : '#888'; c.font = '11px system-ui'; c.textAlign = 'left'; c.fillText(n.p.name.slice(0, 11), p.x - BW / 2 + 20, p.y - 1); c.fillStyle = '#777'; c.font = '9px system-ui'; c.fillText(alive ? `${Math.floor(LW.Agents.age(w, n.p))} y` : `†${LW.Time.year(n.p.diedTick)}`, p.x - BW / 2 + 20, p.y + 11); }
        c.restore();
      };
      draw();
      let drag = null; cv.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: false }; });
      window.addEventListener('mousemove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true; view.x += dx; view.y += dy; drag.x = e.clientX; drag.y = e.clientY; draw(); });
      window.addEventListener('mouseup', (e) => { if (!drag) return; if (!drag.moved) { const rect = cv.getBoundingClientRect(); const mx = (e.clientX - rect.left - view.x) / view.s, my = (e.clientY - rect.top - view.y) / view.s; for (const n of nodes.values()) { const p = pos.get(n.p.id); if (Math.abs(mx - p.x) < BW / 2 && Math.abs(my - p.y) < BH / 2) { if (w.agents.has(n.p.id)) { this.closeModal(); this.select(w.agents.get(n.p.id)); this.r.centerOn(n.p.x, n.p.y); } else this.showDeceased(n.p); break; } } } drag = null; });
      cv.addEventListener('wheel', (e) => { e.preventDefault(); view.s = LW.clamp(view.s * (e.deltaY < 0 ? 1.15 : 0.87), 0.3, 3); draw(); }, { passive: false });
    }
    // ---------------- god bar
    buildGodBar() {
      const box = $('#god-interventions'); box.innerHTML = ''; box.appendChild(h('span', { class: 'gtitle' }, 'Creator'));
      for (const [k, K] of Object.entries(LW.God.KINDS)) { const b = h('button', { class: 'godbtn' + (['disease', 'kill', 'destroy', 'meteor', 'earthquake', 'fire', 'lightning'].includes(k) ? ' danger' : ''), title: K.desc, onclick: () => this.pickGod(k) }, h('i', null, K.icon), K.label); b.dataset.god = k; box.appendChild(b); }
      const cb = $('#god-commands'); cb.innerHTML = ''; cb.appendChild(h('span', { class: 'gtitle', id: 'cmd-title' }, 'Command'));
      for (const [k, label] of Object.entries(LW.God.COMMANDS)) cb.appendChild(h('button', { class: 'godbtn', onclick: () => this.pickCmd(k) }, h('i', null, { go: '➤', build: '⌂', follow: '↝', protect: '⛨', explore: '✧', leave: '⇥', search: '⌕' }[k]), label));
      const mode = h('button', { class: 'modebtn', id: 'cmd-mode', onclick: () => { this.cmdMode = this.cmdMode === 'force' ? 'message' : 'force'; this.refreshGodBar(); this.click(); } }, 'Divine message'); cb.appendChild(mode);
    }
    pickGod(k) { this.click(); if (this.godTool === k) { this.godTool = null; this.r.godCursor = null; $('#world').classList.remove('god'); } else { this.godTool = k; this.pendingCmd = null; const K = LW.God.KINDS[k]; this.r.godCursor = { kind: k, radius: { rain: 12, forest: 3, food: 3, animals: 4, resource: 6, disease: 5, healing: 5, fertility: 6, earthquake: 8, meteor: 4 }[k] || 0 }; $('#world').classList.add('god'); if (K.target === 'world') { const text = LW.God.intervene(this.world, k, { x: -1, y: -1 }); if (text) this.audio.play(k === 'storm' ? 'thunder' : 'god'); this.godTool = null; this.r.godCursor = null; $('#world').classList.remove('god'); this.app.save(); } } this.refreshGodBar(); }
    pickCmd(k) { this.click(); const a = this.world.agents.get(this.selected); if (!a) return; if (k === 'leave' || k === 'build') { LW.God.command(this.world, a, k, { force: this.cmdMode === 'force' }); this.audio.play('command'); this.app.save(); return; } this.pendingCmd = k; this.godTool = null; this.r.godCursor = null; $('#world').classList.add('god'); this.toast(LW.God.COMMANDS[k], k === 'follow' || k === 'protect' ? 'Click on a person.' : 'Click on the map.', true); this.refreshGodBar(); }
    refreshGodBar() {
      document.querySelectorAll('[data-god]').forEach((b) => b.classList.toggle('active', b.dataset.god === this.godTool));
      const agentSel = this.selKind === 'agent' && this.world.agents.has(this.selected);
      $('#god-commands').classList.toggle('hidden', !agentSel);
      if (agentSel) { $('#cmd-title').textContent = `Command ${this.world.agents.get(this.selected).name}`; const m = $('#cmd-mode'); m.textContent = this.cmdMode === 'force' ? 'FORCE' : 'Divine message'; m.classList.toggle('active', this.cmdMode === 'force'); }
    }
    // ---------------- toasts & modals
    toast(title, text, minor) { const box = $('#toasts'); const el = h('div', { class: 'toast' + (minor ? ' minor' : '') }, h('b', null, title), h('span', null, text)); box.appendChild(el); setTimeout(() => el.remove(), minor ? 3600 : 6800); while (box.children.length > 4) box.removeChild(box.firstChild); }
    modal(content) { const m = $('#modal'); m.innerHTML = ''; m.appendChild(content); $('#overlay').classList.remove('hidden'); }
    closeModal() { $('#overlay').classList.add('hidden'); }
    showMenu() {
      const app = this.app; const el = h('div'); const w = this.world;
      el.appendChild(h('h1', null, w.name, h('small', null, `seed ${w.seed} · ${w.shape} · engine ${LW.ENGINE_VERSION}`)));
      const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: this.audio.volume, oninput: (e) => this.audio.setVolume(+e.target.value) });
      el.appendChild(h('div', { class: 'kv', style: 'margin:10px 0' }, h('span', null, 'Sound volume'), vol));
      const grid = h('div', { class: 'menu-grid' });
      grid.appendChild(h('button', { onclick: () => { app.save(true); this.toast('Saved', 'The world is safe in this browser.', true); } }, 'Save now', h('small', null, 'Autosaves every 30 s and when you leave')));
      grid.appendChild(h('button', { onclick: () => app.exportWorld() }, 'Export world', h('small', null, 'Download a .json you can import anywhere')));
      grid.appendChild(h('button', { onclick: () => app.importWorld() }, 'Import world', h('small', null, 'Replace the current world with a file')));
      for (let s = 1; s <= 3; s++) { const has = app.hasSnapshot(s); grid.appendChild(h('button', { onclick: async () => { await app.snapshot(s); this.showMenu(); } }, `Snapshot slot ${s}`, h('small', null, has ? `saved · ${has}` : 'empty — click to save'))); if (has) grid.appendChild(h('button', { onclick: () => { if (confirm('Restore this snapshot? The current world will be replaced. Export it first if you want to keep it.')) app.restoreSnapshot(s); } }, `Restore slot ${s}`, h('small', null, 'restore, then continue = an alternate timeline'))); }
      grid.appendChild(h('button', { onclick: () => this.showNewWorld() }, 'New world…', h('small', null, 'A different seed, a different history')));
      grid.appendChild(h('button', { onclick: () => { $('#debug').classList.toggle('hidden'); } }, 'Debug overlay', h('small', null, 'tick µs, ticks/s, render ms (` key)')));
      grid.appendChild(h('button', { onclick: () => { this.closeModal(); this.showWelcomeReport(app.lastReport); } }, 'Last visit report', h('small', null, 'What happened while you were away')));
      el.appendChild(grid);
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => this.closeModal() }, 'Back to the world')));
      this.modal(el);
    }
    showNewWorld() {
      const el = h('div'); el.appendChild(h('h1', null, 'Genesis', h('small', null, 'a new world replaces the current one')));
      const seed = h('input', { type: 'text', value: String((Math.random() * 4294967295) >>> 0), style: 'width:100%' }); const pop = h('input', { type: 'number', min: 2, max: 20, value: 3, style: 'width:80px' });
      el.appendChild(h('p', null, 'World seed')); el.appendChild(seed); el.appendChild(h('p', null, 'Genesis population (2–20)')); el.appendChild(pop);
      el.appendChild(h('p', { class: 'tiny' }, 'Export your current world first if you want to keep it.'));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => this.showMenu() }, 'Back'), h('button', { class: 'primary', onclick: () => { const s = seed.value.trim(); const n = /^\d+$/.test(s) ? (+s >>> 0) : LW.hash32(s); this.closeModal(); this.app.newWorld(n, LW.clamp(+pop.value || 3, 2, 20)); } }, 'Create')));
      this.modal(el);
    }
    showHelp() {
      const el = h('div'); el.appendChild(h('h1', null, 'How to watch a world', h('small', null, 'You are the Creator. The world does not need you.')));
      el.appendChild(h('div', { class: 'help-grid' }, h('b', null, 'drag / WASD'), h('span', null, 'pan the camera'), h('b', null, 'wheel / + −'), h('span', null, 'zoom (close zoom shows people, far zoom shows civilizations)'), h('b', null, 'click'), h('span', null, 'inspect a person, building or tile'), h('b', null, 'F'), h('span', null, 'follow the selected person'), h('b', null, 'T'), h('span', null, 'family tree of the selected person'), h('b', null, 'space'), h('span', null, 'pause'), h('b', null, '1–5'), h('span', null, 'speed presets'), h('b', null, 'O / H'), h('span', null, 'world overview / back to the Genesis site'), h('b', null, 'right-click / Esc'), h('span', null, 'cancel a Creator tool'), h('b', null, '`'), h('span', null, 'debug overlay')));
      el.appendChild(h('p', null, 'Creator tools at the bottom change the physical world; people who witness them remember, tell others, and may come to believe. Select a person to send divine commands — as a message they interpret, or as force.'));
      el.appendChild(h('p', null, 'The world keeps living while this page is closed: when you return, the missing time is simulated and a report tells you what happened.'));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => { this.closeModal(); if (!this.world.meta.started) this.showGenesis(); } }, 'Close')));
      this.modal(el);
    }
    showGenesis() {
      const w = this.world; const names = [...w.agents.values()].map((a) => a.name).join(', ');
      const el = h('div'); el.appendChild(h('h1', null, 'Genesis', h('small', null, 'a world is born')));
      el.appendChild(h('div', { class: 'big' }, w.name)); el.appendChild(h('p', null, `A ${w.shape === 'twin' ? 'world of two lands' : w.shape} with a mean temperature of ${w.climateMean.toFixed(0)}°C. Three small beings stand in a vast wild world: ${names}. They know nothing. They will learn.`));
      el.appendChild(h('p', { class: 'tiny' }, 'Seed ' + w.seed + ' · the world is saved in this browser automatically · export it from the menu to keep it forever.'));
      el.appendChild(h('p', null, h('b', null, 'Time has not started yet.'), ' It starts the moment you press Watch — and from then on it never waits for you: while this page is closed, while your computer is off, they keep living, and you will be told what happened.'));
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { onclick: () => { this.closeModal(); this.showHelp(); } }, 'How does this work?'), h('button', { class: 'primary', onclick: () => { this.closeModal(); this.app.startAudio(); this.app.beginWorld(); } }, 'Watch')));
      this.modal(el);
    }
    showCatchup(progress, label) {
      let m = $('#modal'); if (!m.querySelector('#cu-bar')) { const el = h('div'); el.appendChild(h('h1', null, 'Welcome back, Creator', h('small', null, 'the world did not wait for you'))); el.appendChild(h('p', { id: 'cu-label' }, label)); el.appendChild(h('div', { class: 'progress' }, h('div', { id: 'cu-bar' }))); this.modal(el); }
      $('#cu-label').textContent = label; $('#cu-bar').style.width = Math.round(progress * 100) + '%';
    }
    showWelcomeReport(rep) {
      if (!rep || rep.skipped) { this.closeModal(); return; }
      const w = this.world; const b = rep.before, a = rep.after; const el = h('div');
      el.appendChild(h('h1', null, 'Welcome back, Creator', h('small', null, `you were away ${LW.Time.realSpan(rep.awayMs)} · world time elapsed ${LW.Time.span(rep.worldTicks)}${rep.capped ? ' (capped)' : ''}`)));
      const cell = (label, from, to, sub) => h('div', { class: 'cell' }, h('label', null, label), h('b', null, String(to)), from != null && from !== to ? h('span', { class: 'delta' }, `${from} → ${to}`) : null, sub ? h('div', null, h('small', null, sub)) : null);
      el.appendChild(h('div', { class: 'report' }, cell('Population', b.population, a.population, `${a.births - b.births} born · ${a.deaths - b.deaths} died`), cell('Settlements', b.settlements, a.settlements), cell('Technology', b.techLevel, a.techLevel, `${Math.max(0, a.discoveries - b.discoveries)} new discoveries`), cell('Buildings', null, a.buildings - b.buildings, 'completed'), cell('Couples', null, a.couples - b.couples, 'formed'), cell('Belief in you', pct(rep.beliefBefore || 0), pct(rep.beliefAfter || 0))));
      const newTechs = a.techs.filter((t) => !b.techs.includes(t)).map((t) => LW.Tech.D[t].name).filter(Boolean);
      if (newTechs.length) el.appendChild(h('p', null, h('b', null, 'Discovered: '), newTechs.join(', ')));
      const firsts = (rep.firsts || []).slice(0, 8); if (firsts.length) { el.appendChild(h('h3', { style: 'color:#e0b15a;letter-spacing:.2em;font-size:11px;margin:12px 0 4px' }, 'HISTORIC FIRSTS')); for (const [, f] of firsts) el.appendChild(h('div', { class: 'feed-item i3' }, h('span', { class: 'first' }, '★ ' + f.title), f.text)); }
      const ch = (rep.chronicle || []).filter((e) => !e.first).slice(-10); if (ch.length) { el.appendChild(h('h3', { style: 'color:#a9a395;letter-spacing:.2em;font-size:11px;margin:12px 0 4px' }, 'MAJOR EVENTS')); for (const e of ch) el.appendChild(h('div', { class: 'feed-item ' + (e.god ? 'god' : 'i2') }, h('time', null, `Y${e.year}`), e.text)); }
      el.appendChild(h('div', { class: 'modal-actions' }, h('button', { class: 'primary', onclick: () => { this.closeModal(); this.app.startAudio(); } }, 'See the world')));
      this.modal(el);
    }
    // ---------------- sounds
    bindSounds(world) {
      const on = (t, name, cond) => world.events.on(t, (ev) => { if (this.app.catchingUp || (cond && !cond(ev))) return; this.audio.play(name); });
      on('AgentBorn', 'birth'); on('AgentDied', 'death'); on('CoupleFormed', 'love', (e) => e.stage === 'partners'); on('DiscoveryMade', 'discovery', (e) => !LW.Tech.D[e.tech].hidden); on('BuildingCompleted', 'build', (e) => e.kind !== 'campfire'); on('Lightning', 'thunder'); on('WildfireStarted', 'fire'); on('SettlementFounded', 'settlement'); on('SettlementGrew', 'settlement'); on('ConflictOccurred', 'conflict'); on('DivineCommandInterpreted', 'command');
    }
    // ---------------- per-frame update
    update(dt) {
      const now = performance.now(); if (now - this.lastPanel < 250) return; this.lastPanel = now;
      this.refreshTop(); if (this.selected != null && !$('#right').classList.contains('hidden')) this.renderInspector();
      if (this.tab === 'people' && (this.frameCount = (this.frameCount || 0) + 1) % 12 === 0) this.renderPeople();
      const dbg = $('#debug'); if (!dbg.classList.contains('hidden')) { const p = this.sim.perf; dbg.textContent = `tick ${p.tickUs.toFixed(0)} µs (max ${p.tickMaxUs.toFixed(0)}) · ${p.ticksLastSec} ticks/s · render ${this.r.perf.ms.toFixed(1)} ms · agents ${this.world.population} · buildings ${this.world.buildings.size} · burning ${this.world.burning.size} · dirty ${this.world.dirtyTiles.size} · save ${(this.app.lastSaveSize / 1024).toFixed(0)} KB · errors ${this.sim.errors.length}`; }
    }
  }
  LW.UI = UI;
})(globalThis.LW || (globalThis.LW = {}));
