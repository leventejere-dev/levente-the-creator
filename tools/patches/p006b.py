PATCHES = [
('src/agents/brain.js', [
("""if (A().load(a) > A().capacity(c.world, a) * 0.85) s *= 0.2; if (c.night) s *= 0.4; return [s, [`stock ${stock.toFixed(1)} / ${target.toFixed(1)}`, `discipline ${LW.pct(P(a).discipline)}`]]; },""",
 """if (A().load(a) > A().capacity(c.world, a) * 0.85) s *= 0.2; if (c.night) s *= 0.4; if (N(a).warmth < 0.35) s *= 0.3; return [s, [`stock ${stock.toFixed(1)} / ${target.toFixed(1)}`, `discipline ${LW.pct(P(a).discipline)}`]]; },"""),
("""        if (opts.length && opts[0].d < 25) return { steps: opts[0].steps };""",
 """        if (opts.length && opts[0].d < 25) { opts[0].steps[opts[0].steps.length - 1].n = N(a).warmth < 0.3 ? 24 : 12; return { steps: opts[0].steps }; }"""),
]),
]
