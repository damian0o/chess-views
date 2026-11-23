#!/usr/bin/env python3
"""Run every *_check.py in this folder against a served copy of the page.

    python3 -m http.server 8080          # in the repo root, in another terminal
    python3 tests/browser/run.py http://localhost:8080/

Each check prints PASS/FAIL lines and a final ALL PASS or FAILED; this runner prints one line per
check and exits non-zero if any failed. Needs Python Playwright with Chromium installed.
"""
import glob, os, subprocess, sys

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
here = os.path.dirname(os.path.abspath(__file__))
only = sys.argv[2:]
scripts = sorted(glob.glob(os.path.join(here, "*_check.py")))
if only: scripts = [s for s in scripts if any(o in os.path.basename(s) for o in only)]
bad = []
for script in scripts:
    name = os.path.basename(script)[:-3]
    r = subprocess.run([sys.executable, script, base], capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip().splitlines()
    verdict = next((l for l in reversed(out) if "ALL PASS" in l or "FAILED" in l or "SOME FAILED" in l), out[-1] if out else "(no output)")
    ok = r.returncode == 0 and "ALL PASS" in verdict
    print(f"{'ok  ' if ok else 'FAIL'} {name:24s} {verdict[:100]}")
    if not ok:
        bad.append(name)
        for l in out:
            if l.startswith("FAIL") or "Error" in l: print("      " + l[:160])
print(f"{len(scripts) - len(bad)}/{len(scripts)} checks passed" + (f"; failed: {', '.join(bad)}" if bad else ""))
sys.exit(1 if bad else 0)
