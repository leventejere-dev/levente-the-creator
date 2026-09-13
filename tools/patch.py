#!/usr/bin/env python3
"""Apply exact-string patches: python tools/patch.py patches/xyz.py
The patch module defines PATCHES = [(path, [(old, new), ...]), ...]."""
import sys, importlib.util, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('p', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
for path, pairs in m.PATCHES:
    full = os.path.join(ROOT, path); s = open(full, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            print('NOT FOUND in', path, ':', old[:80].replace('\n', '\\n')); sys.exit(1)
        s = s.replace(old, new, 1)
    open(full, 'w', encoding='utf-8').write(s); print('patched', path, len(pairs))
