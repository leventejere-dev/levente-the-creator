PATCHES = [
('src/sim/macro.js', [
("""      const rng = w.rng; const stage = A().stage(w, a); const adult = stage === 'adult' || stage === 'elder'; const child = stage === 'infant' || stage === 'child';
      const home = a.home != null ? w.buildings.get(a.home) : null;
      if (home) { a.x = home.x + 0.5; a.y = home.y + 0.5; }
      const hh = A().household(w, a); const i = w.idx(a.x | 0, a.y | 0);""",
 """      const rng = w.rng; const stage = A().stage(w, a); const adult = stage === 'adult' || stage === 'elder'; const child = stage === 'infant' || stage === 'child';
      const home = a.home != null ? w.buildings.get(a.home) : null;
      if (home) { a.x = home.x + 0.5; a.y = home.y + 0.5; }
      const hh = A().household(w, a); const i = w.idx(a.x | 0, a.y | 0);
      // the young learn where things are from the people they live with
      if (!adult) { const cg = [...A().caregivers(w, a), ...hh.filter((o) => o !== a && A().isAdult(w, o))]; for (const c of cg) { const pl = [...c.knowledge.places.values()]; for (let k = 0; k < 4 && pl.length; k++) { const p = rng.pick(pl); A().rememberPlace(w, a, p.k, p.i, p.q); } } }"""),
("""      if (child) { const cg = A().caregivers(w, a); intake = cg.length ? 0.95 : 0.4; }
      else {""",
 """      const supported = A().caregivers(w, a).length > 0 || hh.some((o) => o !== a && A().isAdult(w, o));
      if (child) { intake = supported ? 0.95 : 0.4; }
      else {"""),
("""        intake = 0.55 + 0.5 * (0.6 + a.skills.gathering * 0.6) * seasonFood * foodQ * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1) + hunt + fish;""",
 """        intake = 0.55 + 0.5 * (0.6 + a.skills.gathering * 0.6) * seasonFood * foodQ * (a.knowledge.techs.has('foraging_lore') ? 1.15 : 1) + hunt + fish;
        if (stage === 'adolescent' && supported) intake = Math.max(intake, 0.9);
        // people who live together share food
        if (intake < 0.9) { const donors = hh.filter((o) => o !== a && A().isAdult(w, o)); if (donors.length) intake = Math.max(intake, 0.85); }"""),
]),
]
