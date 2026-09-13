#!/usr/bin/env node
/* LEVENTE — THE CREATOR · tools/host.js
 * The world host: runs on GitHub Actions (or any Node) every half hour, loads the world
 * from the `world` branch, simulates the real time that passed, and writes it back.
 * This is what keeps the world alive when no browser has it open.
 * A browser that is actively simulating holds a lease; the host always yields to it.
 *
 *   node tools/host.js <path to world.json.gz>
 */
const fs = require('fs'); const zlib = require('zlib'); const path = require('path');
const LW = require(path.join(__dirname, '..', 'dist', 'engine.js'));

const file = process.argv[2] || path.join(__dirname, '..', '.world', 'world.json.gz');
const flag = path.join(path.dirname(file), 'changed');
try { fs.unlinkSync(flag); } catch (e) { /* none */ }
if (!fs.existsSync(file)) { console.log('host: no world in the cloud yet — nothing to do'); process.exit(0); }
const text = fs.readFileSync(file, 'utf8');
const json = text.startsWith('GZ:') ? zlib.gunzipSync(Buffer.from(text.slice(3), 'base64')).toString('utf8') : text;
const sim = LW.Persistence.fromJSON(json);
const w = sim.world, meta = w.meta;
if (meta.started === false) { console.log(`host: ${w.name} has not been started by the Creator yet`); process.exit(0); }
const lease = meta.lease;
const now = Date.now();
if (lease && !String(lease.sessionId).startsWith('host:') && now - lease.at < 6 * 60000) { console.log(`host: a browser is simulating ${w.name} right now (lease ${Math.round((now - lease.at) / 1000)} s old) — yielding`); process.exit(0); }
const before = sim.summary();
const rep = sim.catchUp(now, { sync: true });
meta.lease = { sessionId: 'host:github-actions', at: now }; meta.lastRealTimeMs = now;
const out = 'GZ:' + zlib.gzipSync(Buffer.from(LW.Persistence.toJSON(sim), 'utf8')).toString('base64');
fs.writeFileSync(file, out); fs.writeFileSync(flag, '1');
const after = sim.summary();
console.log(`host: ${w.name} · simulated ${LW.Time.span(rep.worldTicks || 0)} (${rep.owedTicks} ticks) · year ${before.year} → ${after.year} · population ${before.population} → ${after.population} · ${(out.length / 1024).toFixed(0)} KB`);
for (const e of (rep.chronicle || []).slice(-12)) console.log(`  ${e.year}. év ${e.first ? '★ ' : ''}${e.text}`);
if (sim.errors.length) { console.log('host: simulation errors:'); for (const e of sim.errors.slice(0, 5)) console.log('  ' + e.msg.slice(0, 300)); }
