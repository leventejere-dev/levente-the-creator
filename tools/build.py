#!/usr/bin/env python3
"""Concatenate the LEVENTE — THE CREATOR sources into a single self-contained HTML file.

Usage:  python tools/build.py            -> dist/levente-world.html (+ dist/index.html copy)
        python tools/build.py --engine   -> dist/engine.js (engine only, for Node / tests)
"""
import json, os, sys, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src'); DIST = os.path.join(ROOT, 'dist')
os.makedirs(DIST, exist_ok=True)
manifest = json.load(open(os.path.join(SRC, 'manifest.json'), encoding='utf-8'))

def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8') as f:
        return f.read()

def bundle(files):
    parts = []
    for rel in files:
        parts.append(f"\n/* ===== {rel} ===== */\n" + read(rel))
    return "\n".join(parts)

engine_js = bundle(manifest['engine'])
tests_js = bundle(manifest['tests'])
stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')

if '--engine' in sys.argv:
    out = os.path.join(DIST, 'engine.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(f"/* LEVENTE — THE CREATOR · engine bundle · built {stamp} */\n" + engine_js + "\n" + tests_js + "\nif (typeof module !== 'undefined') module.exports = globalThis.LW;\n")
    import shutil; shutil.copy(os.path.join(ROOT, 'tools', 'test.html'), os.path.join(DIST, 'test.html'))
    print('wrote', out, os.path.getsize(out), 'bytes'); sys.exit(0)

client_js = bundle(manifest['client'])
css = read('styles.css')
html = read('index.html')
js = engine_js + "\n" + tests_js + "\n" + client_js
html = html.replace('/* INLINE_CSS */', css).replace('/* INLINE_JS */', js).replace('BUILD_STAMP', stamp)
out = os.path.join(DIST, 'levente-world.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print('wrote', out, os.path.getsize(out), 'bytes')
