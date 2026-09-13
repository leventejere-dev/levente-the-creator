PATCHES = [
('src/agents/perception.js', [
("""      if (tech && !a.knowledge.techs.has(tech) && !LW.Tech.D[tech].hidden) {
        const prereqOk = !LW.Tech.D[tech].prereq || LW.Tech.D[tech].prereq.every((p) => a.knowledge.techs.has(p));
        const gain = 0.05 * (0.5 + a.personality.intelligence) * (LW.Agents.isChild(world, a) ? 1.5 : 1);
        a.knowledge.progress[tech] = (a.knowledge.progress[tech] || 0) + gain;
        if (a.knowledge.progress[tech] >= 1 && prereqOk) LW.Tech.learn(world, a, tech, 'observed_practice', o);
      }""",
 """      if (tech && !a.knowledge.techs.has(tech) && !LW.Tech.D[tech].hidden) {
        const prereqOk = !LW.Tech.D[tech].prereq || LW.Tech.D[tech].prereq.every((p) => a.knowledge.techs.has(p));
        if (o.knowledge.techs.has(tech)) { // a real demonstration by someone who knows
          const gain = 0.05 * (0.5 + a.personality.intelligence) * (LW.Agents.isChild(world, a) ? 1.5 : 1);
          a.knowledge.progress[tech] = (a.knowledge.progress[tech] || 0) + gain;
          if (a.knowledge.progress[tech] >= 1 && prereqOk) LW.Tech.learn(world, a, tech, 'observed_practice', o);
        } else { // watching someone *try* only plants the idea
          a.knowledge.progress[tech] = Math.min(0.5, (a.knowledge.progress[tech] || 0) + 0.01);
        }
      }"""),
]),
]
