import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
p = os.path.join(ROOT, 'src', 'agents', 'brain.js'); s = open(p, encoding='utf-8').read()
pairs = [
 ("`danger ${LW.pct(c.danger)}`, `fear ${LW.pct(E(a).fear)}`", "`veszély ${LW.pct(c.danger)}`, `félelem ${LW.pct(E(a).fear)}`"),
 ("f.push(`hunger ${LW.pct(1 - N(a).food)}`); if (c.foodInv) { s += N(a).food < 0.5 ? 0.5 : 0.2; f.push('has food'); } else if (c.storeFood > 0 && c.home) { s += 0.3; f.push('food at home'); } else if (!c.food && !(a.inv.spear && c.animals) && !(c.fish && a.knowledge.techs.has('fishing'))) { s *= 0.3; f.push('knows no food source'); }",
  "f.push(`éhség ${LW.pct(1 - N(a).food)}`); if (c.foodInv) { s += N(a).food < 0.5 ? 0.5 : 0.2; f.push('van nála étel'); } else if (c.storeFood > 0 && c.home) { s += 0.3; f.push('otthon van étel'); } else if (!c.food && !(a.inv.spear && c.animals) && !(c.fish && a.knowledge.techs.has('fishing'))) { s *= 0.3; f.push('nem ismer ételforrást'); }"),
 ("[`thirst ${LW.pct(1 - N(a).water)}`, `water ${Math.round(c.water.d)} tiles`]", "[`szomj ${LW.pct(1 - N(a).water)}`, `víz ${Math.round(c.water.d)} mezőre`]"),
 ("const f = [`tired ${LW.pct(1 - N(a).energy)}`, c.night ? 'night' : 'day']; if (N(a).food < 0.12 && (c.foodInv || c.food || c.storeFood > 0)) { s *= 0.4; f.push('too hungry to sleep'); } if (N(a).water < 0.12 && c.water) { s *= 0.3; f.push('too thirsty to sleep'); }",
  "const f = [`fáradtság ${LW.pct(1 - N(a).energy)}`, c.night ? 'éjszaka' : 'nappal']; if (N(a).food < 0.12 && (c.foodInv || c.food || c.storeFood > 0)) { s *= 0.4; f.push('túl éhes az alváshoz'); } if (N(a).water < 0.12 && c.water) { s *= 0.3; f.push('túl szomjas az alváshoz'); }"),
 ("const f = [`cold ${LW.pct(1 - N(a).warmth)}`, `feels ${Math.round(c.effTemp)}°C`]; if (c.rain > 0.3 && !c.fx.inside) { s += c.rain * 0.7; f.push(`rain ${LW.pct(c.rain)}`); } if (c.storm && !c.fx.inside) { s += 0.6; f.push('storm'); }",
  "const f = [`hideg ${LW.pct(1 - N(a).warmth)}`, `érzett ${Math.round(c.effTemp)} °C`]; if (c.rain > 0.3 && !c.fx.inside) { s += c.rain * 0.7; f.push(`eső ${LW.pct(c.rain)}`); } if (c.storm && !c.fx.inside) { s += 0.6; f.push('vihar'); }"),
 ("return [best, who ? [`${who.name} food ${LW.pct(N(who).food)}`] : []]; },", "return [best, who ? [`${who.name} étele ${LW.pct(N(who).food)}`] : []]; },"),
 ("return [best, who ? [`${who.name} hungry`, `empathy ${LW.pct(P(a).empathy)}`] : []]; },", "return [best, who ? [`${who.name} éhes`, `együttérzés ${LW.pct(P(a).empathy)}`] : []]; },"),
 ("[`parent ${Math.round(d)} tiles`]", "[`szülő ${Math.round(d)} mezőre`]"),
 ("return [best + (E(a).loneliness * 0.3), who ? [`lonely ${LW.pct(1 - N(a).social)}`, `with ${who.name}`] : []]; },", "return [best + (E(a).loneliness * 0.3), who ? [`magány ${LW.pct(1 - N(a).social)}`, `vele: ${who.name}`] : []]; },"),
 ("[`attraction to ${who.name} ${LW.pct(a.relationships.get(who.id).attraction)}`, `affection need ${LW.pct(1 - N(a).affection)}`]", "[`vonzalom (${who.name}) ${LW.pct(a.relationships.get(who.id).attraction)}`, `gyengédségigény ${LW.pct(1 - N(a).affection)}`]"),
 ("[`affection need ${LW.pct(1 - N(a).affection)}`, `love ${LW.pct(E(a).love)}`]", "[`gyengédségigény ${LW.pct(1 - N(a).affection)}`, `szerelem ${LW.pct(E(a).love)}`]"),
 ("[`stock ${stock.toFixed(1)} / ${target.toFixed(1)}`, `discipline ${LW.pct(P(a).discipline)}`]", "[`tartalék ${stock.toFixed(1)} / ${target.toFixed(1)}`, `fegyelem ${LW.pct(P(a).discipline)}`]"),
 ("if (cur >= tier[kind]) return [0, ['home is good enough']];\n        let s = cur === 0 ? 1.15 : 0.55; const f = [cur === 0 ? 'no home' : `upgrade to ${kind}`];\n        if (N(a).warmth < 0.7) { s += 0.35; f.push('cold'); } if (c.rain > 0.2 && !c.fx.inside) { s += 0.3; f.push('rain'); } if (c.season === 2) { s += 0.35; f.push('autumn'); }",
  "if (cur >= tier[kind]) return [0, ['az otthon elég jó']];\n        let s = cur === 0 ? 1.15 : 0.55; const f = [cur === 0 ? 'nincs otthona' : `jobb otthon: ${LW.Buildings.DEFS[kind].label.toLowerCase()}`];\n        if (N(a).warmth < 0.7) { s += 0.35; f.push('hideg'); } if (c.rain > 0.2 && !c.fx.inside) { s += 0.3; f.push('eső'); } if (c.season === 2) { s += 0.35; f.push('ősz'); }"),
 ("[`help build ${Bld().def(b).label}`]", "[`segít építeni: ${Bld().def(b).label.toLowerCase()}`]"),
 ("return [s, [`no fire near`, `feels ${Math.round(c.effTemp)}°C`]]; },", "return [s, ['nincs tűz a közelben', `érzett ${Math.round(c.effTemp)} °C`]]; },"),
 ("[`fire low (${Math.round(c.fire.fuel / 4)} h)`]", "[`fogy a tűz (${Math.round(c.fire.fuel / 4)} óra)`]"),
 ("a._craft = which; if (which) f.push(`wants ${which}`);", "a._craft = which; if (which) f.push(`kellene: ${LW.ITEMS[which] ? LW.ITEMS[which].label.toLowerCase() : which}`);"),
 ("const el = LW.Tech.eligible(c.world, a); if (!el.length) return [0, ['nothing to try']];", "const el = LW.Tech.eligible(c.world, a); if (!el.length) return [0, ['nincs mit kipróbálni']];"),
 ("return [best * (c.night ? 0.4 : 1), which ? [`try ${LW.Tech.D[which].name}`, `curiosity ${LW.pct(P(a).curiosity)}`, `creativity ${LW.pct(P(a).creativity)}`] : []];", "return [best * (c.night ? 0.4 : 1), which ? [`próba: ${LW.Tech.D[which].name.toLowerCase()}`, `kíváncsiság ${LW.pct(P(a).curiosity)}`, `kreativitás ${LW.pct(P(a).creativity)}`] : []];"),
 ("return [s * (c.night ? 0.3 : 1), t ? [`dig at ${t.x},${t.y}`] : []]; },", "return [s * (c.night ? 0.3 : 1), t ? [`ásás itt: ${t.x},${t.y}`] : []]; },"),
 ("if (!farm) return [c.season <= 1 && c.home ? 0.6 + P(a).discipline * 0.3 : 0.1, ['wants a farm']]; if (farm.progress < 1) return [0.7, ['finish farm']]; if (!farm.planted && c.season <= 1) return [((a.inv.roots || 0) + (a.inv.berries || 0) >= 2 ? 0.75 : 0.3), ['plant']]; if (farm.planted && farm.crop >= 1) return [1.0 + u(N(a).food) * 0.5, ['harvest ready']]; return [0.05, ['crop growing']]; },",
  "if (!farm) return [c.season <= 1 && c.home ? 0.6 + P(a).discipline * 0.3 : 0.1, ['szántót akar']]; if (farm.progress < 1) return [0.7, ['befejezi a szántót']]; if (!farm.planted && c.season <= 1) return [((a.inv.roots || 0) + (a.inv.berries || 0) >= 2 ? 0.75 : 0.3), ['vetés']]; if (farm.planted && farm.crop >= 1) return [1.0 + u(N(a).food) * 0.5, ['érett a termés']]; return [0.05, ['nő a termés']]; },"),
 ("const f = [`curiosity ${LW.pct(P(a).curiosity)}`]; if (!c.water) { s += 1.0; f.push('no water known'); } if (!c.food) { s += 0.8; f.push('no food known'); } else if (c.food.d > 10) { s += 0.4; f.push('food is far'); } if (a.knowledge.places.size < 20) { s += 0.3; f.push('knows little'); }",
  "const f = [`kíváncsiság ${LW.pct(P(a).curiosity)}`]; if (!c.water) { s += 1.0; f.push('nem ismer vizet'); } if (!c.food) { s += 0.8; f.push('nem ismer ételt'); } else if (c.food.d > 10) { s += 0.4; f.push('messze az étel'); } if (a.knowledge.places.size < 20) { s += 0.3; f.push('keveset ismer'); }"),
 ("return [best, who ? [`anger ${LW.pct(E(a).anger)}`, `resents ${who.name}`] : []]; },", "return [best, who ? [`harag ${LW.pct(E(a).anger)}`, `neheztel rá: ${who.name}`] : []]; },"),
 ("return [best, who ? [`teach ${LW.Tech.D[tech].name} to ${who.name}`] : []]; },", "return [best, who ? [`tanítja (${LW.Tech.D[tech].name.toLowerCase()}): ${who.name}`] : []]; },"),
 ("return [g ? 0.45 : 0, g ? ['items on the ground'] : []]; },", "return [g ? 0.45 : 0, g ? ['holmi hever a földön'] : []]; },"),
 ("[`grief ${LW.pct(E(a).grief)}`]", "[`gyász ${LW.pct(E(a).grief)}`]"),
 ("['nothing pressing']", "['semmi sürgős']"),
 ("if (a.failStreak && a.failStreak.goal === id && a.failStreak.count >= 3 && world.tick - a.failStreak.tick < 32) { s *= 0.3; factors = [...factors, `keeps failing (×${a.failStreak.count})`]; }",
  "if (a.failStreak && a.failStreak.goal === id && a.failStreak.count >= 3 && world.tick - a.failStreak.tick < 32) { s *= 0.3; factors = [...factors, `sorra kudarc (×${a.failStreak.count})`]; }"),
]
for old, new in pairs:
    if old not in s: print('NOT FOUND brain', old[:70].encode('ascii', 'replace').decode()); raise SystemExit(1)
    s = s.replace(old, new, 1)
# describeGoal → HU map
i = s.index('    describeGoal(id) {'); j = s.index('\n', s.index('}[id] || id; },', i)) + 1
s = s[:i] + "    describeGoal(id) { return LW.HU.goalVerb(id); },\n" + s[j:]
open(p, 'w', encoding='utf-8').write(s); print('brain translated')

# god.js scoreRequest factors
p = os.path.join(ROOT, 'src', 'god', 'god.js'); s = open(p, encoding='utf-8').read()
old = "return [1.2 + ob * 1.5, [`obedience ${LW.pct(ob)}`, `belief ${LW.pct(a.beliefs.creator)}`, `interpreted: ${a.divineRequest.interpreted}`]];"
assert old in s
s = s.replace("if (r.force) return [100, ['compelled by the Creator']];", "if (r.force) return [100, ['a Teremtő kényszeríti']];")
s = s.replace(old, "return [1.2 + ob * 1.5, [`engedelmesség ${LW.pct(ob)}`, `hit ${LW.pct(a.beliefs.creator)}`, `értelmezés: ${{ obey: 'engedelmeskedik', misinterpret: 'félreértette', fear: 'fél', ignore: 'nem törődik vele' }[a.divineRequest.interpreted] || a.divineRequest.interpreted}`]];")
open(p, 'w', encoding='utf-8').write(s); print('god factors translated')

# actions.describe
p = os.path.join(ROOT, 'src', 'agents', 'actions.js'); s = open(p, encoding='utf-8').read()
i = s.index('    describe(world, a) {'); j = s.index('  };\n  LW.Actions = Actions;')
new_desc = """    describe(world, a) {
      const p = a.plan; if (!p || p.done) return 'gondolkodik';
      const st = p.steps[p.i]; if (!st) return 'gondolkodik';
      const g = LW.Brain.describeGoal(p.goal); const item = (k) => (LW.ITEMS[k] ? LW.ITEMS[k].label.toLowerCase() : k);
      switch (st.op) {
        case 'moveTo': return `úton van (${g})`; case 'gather': return `gyűjt: ${item(st.item)}`; case 'hunt': return 'vadászik'; case 'fish': return 'halászik'; case 'sleep': return 'alszik'; case 'interact': return st.kind === 'converse' ? 'beszélget' : st.kind === 'flirt' ? 'flörtöl' : st.kind === 'mate' ? 'együtt van a párjával' : st.kind === 'fight' ? 'verekszik' : st.kind === 'teach' ? 'tanít' : st.kind;
        case 'build': case 'buildNew': case 'deliver': return `épít: ${LW.Buildings.DEFS[p.kind] ? LW.Buildings.DEFS[p.kind].label.toLowerCase() : ''}`; case 'craft': return `készít: ${st.recipe && LW.Tech.RECIPES[st.recipe] ? item(Object.keys(LW.Tech.RECIPES[st.recipe].out)[0]) : st.recipe}`; case 'experiment': return `kísérletezik: ${LW.Tech.D[st.tech].name.toLowerCase()}`; case 'dig': return 'ás'; case 'flee': return 'menekül'; case 'wait': return st.at === 'fire' ? 'a tűznél ül' : st.at === 'mourning' ? 'gyászol' : st.at === 'shelter' ? 'fedél alatt vár' : st.at === 'huddling' ? 'összebújva melegszik' : 'pihen'; case 'follow': return 'a szülőjét követi';
        default: return g;
      }
    },
"""
s = s[:i] + new_desc + s[j:]
open(p, 'w', encoding='utf-8').write(s); print('actions.describe translated')
