PATCHES = [
('tests/invariants.js', [
("""        const s3 = LW.Simulation.newWorld(99, JSON.parse(JSON.stringify(LW.CONFIG)), 0); s3.world.meta.lastRealTimeMs = 0; const r = s3.catchUp(3 * 24 * 3600 * 1000, { sync: true }); push('catch-up advances the exact owed ticks', r.worldTicks === r.owedTicks, `${r.worldTicks} ticks`);""",
 """        const s3 = LW.Simulation.newWorld(99, JSON.parse(JSON.stringify(LW.CONFIG)), 0); s3.world.meta.lastRealTimeMs = 0; const r = s3.catchUp(5 * 3600 * 1000, { sync: true }); push('catch-up advances the exact owed ticks', r.worldTicks === r.owedTicks, `${r.worldTicks} ticks (${LW.Time.span(r.worldTicks)})`);"""),
]),
('src/ui/ui.js', [
("""      for (let s = 1; s <= 3; s++) { const has = app.hasSnapshot(s); grid.appendChild(h('button', { onclick: () => { app.snapshot(s); this.showMenu(); } }, `Snapshot slot ${s}`, h('small', null, has ? `saved · ${has}` : 'empty — click to save'))); if (has) grid.appendChild(h('button', { onclick: () => { if (confirm('Restore this snapshot? The current world will be replaced (it is auto-snapshotted to the export first).')) app.restoreSnapshot(s); } }, `Restore slot ${s}`, h('small', null, 'or branch: Restore then continue = alternate timeline'))); }""",
 """      for (let s = 1; s <= 3; s++) { const has = app.hasSnapshot(s); grid.appendChild(h('button', { onclick: async () => { await app.snapshot(s); this.showMenu(); } }, `Snapshot slot ${s}`, h('small', null, has ? `saved · ${has}` : 'empty — click to save'))); if (has) grid.appendChild(h('button', { onclick: () => { if (confirm('Restore this snapshot? The current world will be replaced. Export it first if you want to keep it.')) app.restoreSnapshot(s); } }, `Restore slot ${s}`, h('small', null, 'restore, then continue = an alternate timeline'))); }"""),
]),
]
