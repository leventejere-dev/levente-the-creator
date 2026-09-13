PATCHES = [
('src/history/history.js', [
("""        case 'WeatherChanged': return ev.creator ? null : ev.state === 'storm' ? { text: 'A storm sweeps over the land.', base: 0.2 } : ev.state === 'rain' ? { text: 'Rain begins to fall.', base: 0.08 } : null;""",
 """        case 'WeatherChanged': return ev.creator ? null : (ev.state === 'storm' && ev.prev !== 'rain') ? { text: 'A storm sweeps over the land.', base: 0.2 } : (ev.state === 'rain' && ev.prev !== 'storm' && ev.prev !== 'overcast') ? { text: 'Rain begins to fall.', base: 0.08 } : null;"""),
("""      if (W.onHistory) W.onHistory(entry);""",
 """      if (W.onHistory && (imp >= cfg.feedThreshold || d.god || first)) W.onHistory(entry);"""),
]),
]
