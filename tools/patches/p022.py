PATCHES = [
('src/history/history.js', [
("""        case 'SettlementAbandoned': return { text: `${ev.name} was abandoned.`, base: 0.6 };""",
 """        case 'SettlementAbandoned': return { text: `${ev.name} was abandoned.`, base: 0.6 };
        case 'SettlementResettled': return { text: `People live in ${ev.name} again.`, base: 0.5 };"""),
("""        case 'BuildingStarted': return { text: `${n(ev.agentId)} began building a ${BD[ev.kind].label.toLowerCase()}.`, base: 0.18 };
        case 'BuildingCompleted': return { text: `${n(ev.agentId)} completed a ${BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.3 : 0.45, firstKey: 'building:' + ev.kind, firstTitle: BLD_FIRST[ev.kind] || `First ${BD[ev.kind].label}` };
        case 'BuildingDestroyed': return { text: `A ${BD[ev.kind].label.toLowerCase()} was destroyed by ${ev.cause}.`, base: ev.cause === 'decay' ? 0.15 : 0.5 };""",
 """        case 'BuildingStarted': return { text: `${n(ev.agentId)} began building a ${BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.05 : 0.18 };
        case 'BuildingCompleted': return { text: `${n(ev.agentId)} ${ev.kind === 'campfire' ? 'lit a fire' : 'completed a ' + BD[ev.kind].label.toLowerCase()}.`, base: ev.kind === 'campfire' ? 0.12 : 0.45, firstKey: 'building:' + ev.kind, firstTitle: BLD_FIRST[ev.kind] || `First ${BD[ev.kind].label}` };
        case 'BuildingDestroyed': return ev.kind === 'campfire' ? null : { text: `A ${BD[ev.kind].label.toLowerCase()} was destroyed by ${ev.cause}.`, base: ev.cause === 'decay' ? 0.15 : 0.5 };"""),
]),
('src/sim/macro.js', [
("""        else if (near.length && rng.chance(0.25)) { let best = null, bs = 0.35; for (const o of near) { if (!A().isAdult(w, o)) continue; const r = LW.Relationships.ensure(w, a, o); if (r.status === 'family' && LW.Relationships.kinship(w, a, o) >= 0.9) continue; if (r.attraction > bs) { bs = r.attraction; best = o; } } if (best) LW.Social.interact(w, a, best, 'flirt', {}); }""",
 """        else if (near.length && rng.chance(0.12)) { let best = null, bs = 0.35; for (const o of near) { if (!A().isAdult(w, o)) continue; const r = LW.Relationships.ensure(w, a, o); if (r.status === 'family' && LW.Relationships.kinship(w, a, o) >= 0.9) continue; if (r.lastFlirt != null && w.tick - r.lastFlirt < T.TICKS_PER_DAY * 6) continue; if (r.attraction > bs) { bs = r.attraction; best = o; } } if (best) LW.Social.interact(w, a, best, 'flirt', {}); }"""),
("""if (t.stone[j] > 30) A().rememberPlace(w, a, 'stone', j, t.stone[j]);""",
 """if (t.stone[j] > 30) { A().rememberPlace(w, a, 'stone', j, t.stone[j]); if (t.stone[j] >= 70 && (t.biome[j] === LW.BIOME.HILLS || t.biome[j] === LW.BIOME.MOUNTAIN || t.biome[j] === LW.BIOME.BEACH) && !t.depType[j]) A().rememberPlace(w, a, 'flint', j, t.stone[j] >> 1); }"""),
]),
]
