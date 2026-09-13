PATCHES = [
('src/render/renderer.js', [
("""      const alpha = Math.min(0.82, night * 0.8 + gloom);
      l.fillStyle = dusk ? `rgba(40,18,50,${alpha})` : `rgba(6,8,32,${alpha})`; l.fillRect(0, 0, cv.width, cv.height);""",
 """      const alpha = Math.min(0.62, night * 0.58 + gloom);
      l.fillStyle = dusk ? `rgba(36,16,48,${alpha})` : `rgba(8,12,44,${alpha})`; l.fillRect(0, 0, cv.width, cv.height);"""),
]),
('src/styles.css', [
("""#godbar { position: absolute; left: 50%; transform: translateX(-50%); bottom: 14px; z-index: 5; display: flex; flex-direction: column; gap: 6px; align-items: center; }
.godrow { display: flex; gap: 4px; padding: 6px 8px; background: var(--panel); border: 1px solid rgba(224, 177, 90, 0.25); border-radius: 8px; backdrop-filter: blur(6px); flex-wrap: wrap; justify-content: center; max-width: 860px; }""",
 """#godbar { position: absolute; left: 352px; right: 196px; bottom: 14px; z-index: 5; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; pointer-events: none; }
#godbar.shift { right: 372px; }
.godrow { display: flex; gap: 3px; padding: 5px 8px; background: var(--panel); border: 1px solid rgba(224, 177, 90, 0.25); border-radius: 8px; backdrop-filter: blur(6px); flex-wrap: wrap; justify-content: flex-start; max-width: 100%; pointer-events: auto; }"""),
("""@media (max-width: 800px) { #left { display: none; } .stats .stat:nth-child(n+4) { display: none; } }""",
 """@media (max-width: 800px) { #left { display: none; } .stats .stat:nth-child(n+4) { display: none; } #godbar { left: 12px; } }"""),
]),
('src/ui/ui.js', [
("""    select(a) { this.selected = a.id; this.selKind = 'agent'; this.r.selected = a.id; $('#right').classList.remove('hidden'); $('#mmwrap').classList.add('shift'); this.renderInspector(true); this.refreshGodBar(); }
    selectBuilding(b) { this.selected = b.id; this.selKind = 'building'; this.r.selected = null; $('#right').classList.remove('hidden'); $('#mmwrap').classList.add('shift'); this.renderInspector(true); this.refreshGodBar(); }
    selectTile(i) { this.selected = i; this.selKind = 'tile'; this.r.selected = null; $('#right').classList.remove('hidden'); $('#mmwrap').classList.add('shift'); this.renderInspector(true); this.refreshGodBar(); }
    closeInspector() { this.selected = null; this.selKind = null; this.r.selected = null; this.r.follow = null; $('#right').classList.add('hidden'); $('#mmwrap').classList.remove('shift'); this.refreshGodBar(); }""",
 """    _openRight() { $('#right').classList.remove('hidden'); $('#mmwrap').classList.add('shift'); $('#godbar').classList.add('shift'); }
    select(a) { this.selected = a.id; this.selKind = 'agent'; this.r.selected = a.id; this._openRight(); this.renderInspector(true); this.refreshGodBar(); }
    selectBuilding(b) { this.selected = b.id; this.selKind = 'building'; this.r.selected = null; this._openRight(); this.renderInspector(true); this.refreshGodBar(); }
    selectTile(i) { this.selected = i; this.selKind = 'tile'; this.r.selected = null; this._openRight(); this.renderInspector(true); this.refreshGodBar(); }
    closeInspector() { this.selected = null; this.selKind = null; this.r.selected = null; this.r.follow = null; $('#right').classList.add('hidden'); $('#mmwrap').classList.remove('shift'); $('#godbar').classList.remove('shift'); this.refreshGodBar(); }"""),
("""      this.world = world; this.sim = this.app.sim; this.feedCount = 0; this.selected = null; this.selKind = null; $('#right').classList.add('hidden'); $('#mmwrap').classList.remove('shift');""",
 """      this.world = world; this.sim = this.app.sim; this.feedCount = 0; this.selected = null; this.selKind = null; $('#right').classList.add('hidden'); $('#mmwrap').classList.remove('shift'); $('#godbar').classList.remove('shift');"""),
]),
]
