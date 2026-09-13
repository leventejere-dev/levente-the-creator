PATCHES = [
('src/agents/dialogue.js', [
("""      if (has(s, /\\b(folyo|viz|to |tohoz|tenger|part|patak|vizhez|folyohoz|itat)\\b/)) return 'water';""",
 """      if (has(s, /\\b(tenger|tengerhez|tengerpart|ocean|a partra)\\b/)) return 'sea';
      if (has(s, /\\b(folyo|viz|to |tohoz|part|patak|vizhez|folyohoz|itat)\\b/)) return 'water';"""),
("""        case 'forest': return scan(30, (i) => t.trees[i] > 80 && W.isPassable(i));""",
 """        case 'sea': { scan(60, (i) => t.biome[i] === LW.BIOME.OCEAN); if (best < 0) return null; const sh = LW.Agents.tileNear(W, a, best); return sh != null && sh >= 0 ? sh : W.randomNear(W.xOf(best), W.yOf(best), 2); }
        case 'forest': return scan(30, (i) => t.trees[i] > 80 && W.isPassable(i));"""),
]),
]
