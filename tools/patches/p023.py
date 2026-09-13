PATCHES = [
('src/persistence/persistence.js', [
("""    a.plan = null; a.why = null; a.env = null; a.threat = null; a.engagedUntil = 0; a.sleeping = false; a.lastDecisionTick = -1000;""",
 """    a.plan = null; a.why = null; a.env = null; a.threat = null; if (a.engagedUntil == null) a.engagedUntil = 0; if (a.lastDecisionTick == null) a.lastDecisionTick = -1000;"""),
]),
('src/sim/simulation.js', [
("""      const elapsedMs = Math.max(0, nowMs - (meta.lastRealTimeMs || nowMs));""",
 """      const elapsedMs = Math.max(0, nowMs - (meta.lastRealTimeMs != null ? meta.lastRealTimeMs : nowMs));"""),
]),
]
