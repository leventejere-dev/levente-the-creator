import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# (file, [(old, new)]) — substrings; each must exist
R = [
('src/agents/agent.js', [
 ("a.achievements.push('One of the First');", "a.achievements.push('Az Elsők egyike');"),
 ("a.achievements.push('Came from beyond');", "a.achievements.push('A messzeségből jött');"),
 ("text: 'came over the hills from a land I no longer remember'", "text: 'a dombokon túlról jöttem, egy földről, amire már nem emlékszem'"),
 ("text: 'fell ill after eating raw food'", "text: 'rosszul lettem a nyers ételtől'"),
 ("this.die(world, a, a.needs.water <= 0 ? 'dehydration' : a.needs.food <= 0 ? 'starvation' : a.needs.warmth <= 0 ? 'cold' : world.tiles.fire[i] ? 'fire' : a.injury > 0.5 ? 'injury' : 'illness');",
  "this.die(world, a, a.needs.water <= 0 ? 'kiszáradás' : a.needs.food <= 0 ? 'éhezés' : a.needs.warmth <= 0 ? 'kihűlés' : world.tiles.fire[i] ? 'tűz' : a.injury > 0.5 ? 'sérülés' : 'betegség');"),
 ("this.die(world, a, 'old age');", "this.die(world, a, 'öregség');"),
 ("text: 'fell ill', importance: 0.4", "text: 'megbetegedtem', importance: 0.4"),
 ("text: 'lost the unborn child'", "text: 'elvesztettem a meg nem született gyermekem'"),
 ("text: `was hurt by ${cause}`", "text: `megsérültem: ${cause}`"),
 ("text: `gave birth to ${child.name}`", "text: `világra hoztam őt: ${child.name}`"),
 ("text: `became father of ${child.name}`", "text: `apa lettem: ${child.name}`"),
 ("text: `${a.name} died of ${cause}`", "text: `${a.name} meghalt: ${cause}`"),
 ("const cand = [['gatherer', c.gathered], ['builder', c.built * 6], ['hunter', c.hunted || 0], ['crafter', (c.crafted || 0) * 3], ['explorer', (c.explored || 0)], ['tinkerer', c.experiments * 4], ['farmer', (c.farmed || 0) * 2], ['fisher', (c.fished || 0)]];",
  "const cand = [['gatherer', c.gathered], ['builder', c.built * 6], ['hunter', c.hunted || 0], ['crafter', (c.crafted || 0) * 3], ['explorer', (c.explored || 0)], ['tinkerer', c.experiments * 4], ['farmer', (c.farmed || 0) * 2], ['fisher', (c.fished || 0)]]; // ids; LW.HU.occupation() names them"),
]),
('src/agents/social.js', [
 ("text: `flirted with ${t.name}`", "text: `flörtöltem: ${t.name}`"),
 ("text: `${a.name} flirted with me`", "text: `${a.name} flörtölt velem`"),
 ("text: `was turned down by ${t.name}`", "text: `elutasított: ${t.name}`"),
 ("text: `began seeing ${t.name}`, importance: 0.75, emotion: 'love', intensity: 0.7, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `began seeing ${a.name}`",
  "text: `járni kezdtünk: ${t.name}`, importance: 0.75, emotion: 'love', intensity: 0.7, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `járni kezdtünk: ${a.name}`"),
 ("text: `became partners with ${t.name}`, importance: 0.85, emotion: 'love', intensity: 0.85, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `became partners with ${a.name}`",
  "text: `párom lett: ${t.name}`, importance: 0.85, emotion: 'love', intensity: 0.85, subjects: [t.id] }); M().add(world, t, { type: 'romance', text: `párom lett: ${a.name}`"),
 ("text: `broke up with ${t.name} (${reason})`", "text: `szakítottam vele: ${t.name} (${reason})`"),
 ("text: `${a.name} left me (${reason})`", "text: `${a.name} elhagyott (${reason})`"),
 ("this.breakup(world, a, world.agents.get(a.partner), 'left for another');", "this.breakup(world, a, world.agents.get(a.partner), 'másért ment el');"),
 ("this.breakup(world, t, world.agents.get(t.partner), 'left for another');", "this.breakup(world, t, world.agents.get(t.partner), 'másért ment el');"),
 ("this.breakup(world, a, t, r.jealousy > 0.6 ? 'jealousy' : 'resentment');", "this.breakup(world, a, t, r.jealousy > 0.6 ? 'féltékenység' : 'neheztelés');"),
 ("text: `saw ${a.name} and ${t.name} fight`", "text: `láttam, ahogy ${a.name} és ${t.name} összeverekedett`"),
 ("text: `fought ${loser.name} and won`", "text: `megverekedtem vele és győztem: ${loser.name}`"),
 ("text: `fought ${winner.name} and lost`", "text: `megverekedtem vele és vesztettem: ${winner.name}`"),
 ("A().damage(world, loser, dmg, `a fight with ${winner.name}`); A().damage(world, winner, dmg * 0.25, `a fight with ${loser.name}`);",
  "A().damage(world, loser, dmg, `verekedés (${winner.name})`); A().damage(world, winner, dmg * 0.25, `verekedés (${loser.name})`);"),
 ("text: `${a.name} gave me ${label}`", "text: `${a.name} adott nekem: ${label}`"),
]),
('src/agents/perception.js', [
 ("text: 'saw fire for the first time'", "text: 'először láttam tüzet'"),
 ("text: `found ${LW.ITEMS[LW.DEPOSIT_ITEM[foundDeposit.dt]].label.toLowerCase()}`", "text: `találtam: ${LW.ITEMS[LW.DEPOSIT_ITEM[foundDeposit.dt]].label.toLowerCase()}`"),
 ("text: `saw ${o.name} flirting with ${rival.name}`", "text: `láttam, ahogy ${o.name} flörtöl vele: ${rival.name}`"),
]),
('src/agents/actions.js', [
 ("A().damage(world, a, 0.15, 'a wounded animal');", "A().damage(world, a, 0.15, 'sebzett vad');"),
 ("text: 'brought down prey'", "text: 'elejtettem egy vadat'"),
 ("text: `made a ${LW.ITEMS[Object.keys(R.out)[0]].label.toLowerCase()}`", "text: `készítettem: ${LW.ITEMS[Object.keys(R.out)[0]].label.toLowerCase()}`"),
 ("text: `tried ${d.name.toLowerCase()} and failed`", "text: `próbáltam (${d.name.toLowerCase()}), nem sikerült`"),
 ("text: `dug up ${LW.ITEMS[item].label.toLowerCase()}`", "text: `kiástam: ${LW.ITEMS[item].label.toLowerCase()}`"),
]),
('src/sim/simulation.js', [
 ("LW.Agents.damage(w, a, w.rng.range(0.15, 0.45), 'a night predator');", "LW.Agents.damage(w, a, w.rng.range(0.15, 0.45), 'éjszakai ragadozó');"),
 ("text: 'was attacked by a beast in the dark'", "text: 'a sötétben rám támadt egy vad'"),
 ("cb.progress(doneTicks / total, `Simulating ${LW.Time.span(doneTicks)} of ${LW.Time.span(total)}…`);", "cb.progress(doneTicks / total, `Szimulálás: ${LW.Time.span(doneTicks)} / ${LW.Time.span(total)}…`);"),
 ("if (cb && cb.progress) cb.progress(0, 'Waking the world…');", "if (cb && cb.progress) cb.progress(0, 'A világ ébred…');"),
]),
('src/sim/macro.js', [
 ("A().die(w, a, deficit > 0 ? 'starvation' : eff < 8 ? 'cold' : 'illness');", "A().die(w, a, deficit > 0 ? 'éhezés' : eff < 8 ? 'kihűlés' : 'betegség');"),
]),
('src/settlements/settlements.js', [
 ("founder.achievements.push(`Founder of ${s.name}`);", "founder.achievements.push(`${s.name} alapítója`);"),
 ("text: `our camp became known as ${s.name}`", "text: `a táborunk neve lett: ${s.name}`"),
]),
('src/world/weather.js', [
 ("if ((eff.state === 'rain' || eff.state === 'storm') && tempC < 0.5) return eff.state === 'storm' ? 'Blizzard' : 'Snow';\n      return { clear: 'Clear', cloudy: 'Cloudy', overcast: 'Overcast', rain: 'Rain', storm: 'Storm', fog: 'Fog' }[eff.state];",
  "if ((eff.state === 'rain' || eff.state === 'storm') && tempC < 0.5) return eff.state === 'storm' ? 'Hóvihar' : 'Havazás';\n      return { clear: 'Derült', cloudy: 'Felhős', overcast: 'Borult', rain: 'Eső', storm: 'Vihar', fog: 'Köd' }[eff.state];"),
]),
('src/agents/relationships.js', [
 ("if (!r) return 'stranger';\n      if (r.status === 'partner') return 'partner'; if (r.status === 'dating') return 'dating'; if (r.status === 'ex') return 'former partner'; if (r.status === 'family') return 'family';\n      if (r.resentment > 0.5 && r.resentment > r.friendship) return 'enemy'; if (r.resentment > 0.3 && r.resentment > r.friendship) return 'rival';\n      if (r.friendship > 0.6) return 'close friend'; if (r.friendship > 0.3) return 'friend'; if (r.familiarity > 0.15) return 'acquaintance';\n      return 'stranger';",
  "if (!r) return 'idegen';\n      if (r.status === 'partner') return 'pár'; if (r.status === 'dating') return 'jár vele'; if (r.status === 'ex') return 'volt pár'; if (r.status === 'family') return 'rokon';\n      if (r.resentment > 0.5 && r.resentment > r.friendship) return 'ellenség'; if (r.resentment > 0.3 && r.resentment > r.friendship) return 'rivális';\n      if (r.friendship > 0.6) return 'jó barát'; if (r.friendship > 0.3) return 'barát'; if (r.familiarity > 0.15) return 'ismerős';\n      return 'idegen';"),
]),
('src/render/renderer.js', [
 ("const label = `${s.name}`; const sub = `${s.tier} · ${s.population}`;", "const label = `${s.name}`; const sub = `${LW.HU.tier(s.tier)} · ${s.population} lakó`;"),
]),
]
for path, pairs in R:
    full = os.path.join(ROOT, path); s = open(full, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s: print('NOT FOUND', path, old[:70].encode('ascii', 'replace').decode()); raise SystemExit(1)
        s = s.replace(old, new, 1)
    open(full, 'w', encoding='utf-8').write(s); print('patched', path, len(pairs))
