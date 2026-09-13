PATCHES = [
('src/index.html', [
("""<html lang="en">""", """<html lang="hu">"""),
("""<meta name="description" content="An autonomous, persistent, emergent digital civilization. Built BUILD_STAMP.">""",
 """<meta name="description" content="Önálló, folyamatosan élő, magától fejlődő digitális civilizáció. Build: BUILD_STAMP.">"""),
("""      <div class="stat"><label>World age</label><b id="st-age">—</b><small id="st-date"></small></div>
      <div class="stat"><label>Population</label><b id="st-pop">—</b><small id="st-popsub"></small></div>
      <div class="stat"><label>Technology</label><b id="st-tech">—</b><small id="st-techsub"></small></div>
      <div class="stat"><label>Settlements</label><b id="st-settle">—</b><small id="st-largest"></small></div>
      <div class="stat"><label>Sky</label><b id="st-weather">—</b><small id="st-temp"></small></div>""",
 """      <div class="stat"><label>Világkor</label><b id="st-age">—</b><small id="st-date"></small></div>
      <div class="stat"><label>Népesség</label><b id="st-pop">—</b><small id="st-popsub"></small></div>
      <div class="stat"><label>Technológia</label><b id="st-tech">—</b><small id="st-techsub"></small></div>
      <div class="stat"><label>Települések</label><b id="st-settle">—</b><small id="st-largest"></small></div>
      <div class="stat"><label>Égbolt</label><b id="st-weather">—</b><small id="st-temp"></small></div>
      <div class="stat"><label>Mentés</label><b id="cloudstate" class="cloudstate">—</b><small>a világ otthona</small></div>"""),
("""        <button data-speed="pause" title="Pause (space)">❚❚</button>
        <button data-speed="slow" title="1 tick / s — 15 world minutes per second">1×</button>
        <button data-speed="normal" title="1 world hour per second">4×</button>
        <button data-speed="fast" title="4 world hours per second">16×</button>
        <button data-speed="ultra" title="1 world day per second">96×</button>
        <button data-speed="hyper" title="5 world days per second (as fast as your machine allows)">480×</button>
      </div>
      <button id="btn-sound" title="Sound on/off">♪</button>
      <button id="btn-help" title="Help">?</button>
      <button id="btn-menu" title="Menu">☰</button>""",
 """        <button data-speed="pause" title="Szünet (szóköz)">❚❚</button>
        <button data-speed="slow" title="15 világperc másodpercenként">1×</button>
        <button data-speed="normal" title="1 világóra másodpercenként">4×</button>
        <button data-speed="fast" title="4 világóra másodpercenként">16×</button>
        <button data-speed="ultra" title="1 világnap másodpercenként">96×</button>
        <button data-speed="hyper" title="5 világnap másodpercenként (amennyit a gép bír)">480×</button>
      </div>
      <button id="btn-sound" title="Hang be/ki">♪</button>
      <button id="btn-help" title="Súgó">?</button>
      <button id="btn-menu" title="Menü">☰</button>"""),
("""      <button data-tab="feed" class="active">Feed</button>
      <button data-tab="god">Creator</button>
      <button data-tab="chronicle">Chronicle</button>
      <button data-tab="firsts">Firsts</button>
      <button data-tab="people">People</button>""",
 """      <button data-tab="feed" class="active">Hírek</button>
      <button data-tab="god">Teremtő</button>
      <button data-tab="chronicle">Krónika</button>
      <button data-tab="firsts">Elsők</button>
      <button data-tab="people">Emberek</button>"""),
("""<div id="mmwrap"><canvas id="minimap" width="160" height="160"></canvas><div id="camhint">drag · wheel · click</div></div>""",
 """<div id="mmwrap"><canvas id="minimap" width="160" height="160"></canvas><div id="camhint">húzás · görgő · kattintás</div></div>"""),
]),
('src/styles.css', [
("""#debug { position: absolute;""",
 """.cloudstate { font-size: 13px !important; color: var(--teal) !important; } .cloudstate.warn { color: #d8a24a !important; }
#observer { position: absolute; top: 66px; left: 50%; transform: translateX(-50%); z-index: 9; background: rgba(224, 177, 90, 0.14); border: 1px solid var(--gold); border-radius: 6px; padding: 6px 12px; font-size: 12px; color: var(--ink); display: flex; gap: 10px; align-items: center; backdrop-filter: blur(6px); }
#observer b { color: var(--gold); letter-spacing: 0.2em; font-size: 10px; }
#observer button { padding: 3px 10px; }
#debug { position: absolute;"""),
]),
]
