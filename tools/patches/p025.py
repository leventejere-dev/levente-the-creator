PATCHES = [
('src/agents/agent.js', [
("""(mother.children.some((c) => { const ch = world.agents.get(c); return ch && LW.Time.ageYears(ch.bornTick, world.tick) < 1.2; }) ? 0.35 : 1);""",
 """(mother.children.some((c) => { const ch = world.agents.get(c); return ch && LW.Time.ageYears(ch.bornTick, world.tick) < 2.5; }) ? 0.12 : 1);"""),
]),
('src/styles.css', [
("""@media (max-width: 800px) { #left { display: none; } .stats .stat:nth-child(n+4) { display: none; } #godbar { left: 12px; } }""",
 """@media (max-width: 1100px) { #mmwrap { display: none; } #godbar { right: 12px; } #godbar.shift { right: 300px; } }
@media (max-width: 800px) { #left { display: none; } .stats .stat:nth-child(n+4) { display: none; } #godbar { left: 12px; } }"""),
]),
]
