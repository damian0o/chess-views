import sys, time
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + extra) if extra else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(base, wait_until="networkidle")
    r = pg.evaluate("""async () => {
      const t0 = performance.now();
      const E = await import('./engine.js');
      const eng = E.createEngine();
      await eng.ready; const tReady = performance.now() - t0;
      const out = { tReady, levels: Object.keys(E.LEVELS) };
      const t1 = performance.now();
      out.start = await eng.bestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { level: 'learning' });
      out.tStart = performance.now() - t1;
      const t2 = performance.now();
      out.master = await eng.bestMove('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 3 4', { level: 'master' });   // Qxf7# available
      out.tMaster = performance.now() - t2;
      out.promo = await eng.bestMove('8/P6k/8/8/8/8/8/K7 w - - 0 1', { level: 'master' });                               // a8=Q (low skill levels may dawdle on purpose)
      out.none = await eng.bestMove('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', { level: 'club' });  // White is mated
      // two calls at once must both resolve and stay in order
      const [a, c] = await Promise.all([
        eng.bestMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', { level: 'club' }),
        eng.bestMove('8/P6k/8/8/8/8/8/K7 w - - 0 1', { level: 'master' }),
      ]);
      out.parallel = [a && a.uci, c && c.uci];
      // movetime path
      const t3 = performance.now();
      out.timed = await eng.bestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { skill: 20, movetime: 200 });
      out.tTimed = performance.now() - t3;
      // timeout path
      try { await eng.bestMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { skill: 20, depth: 40, timeoutMs: 300 }); out.timeout = 'resolved'; }
      catch (e) { out.timeout = e.message; eng.stop(); }
      // engine still usable after a timeout
      out.after = await eng.bestMove('8/P6k/8/8/8/8/8/K7 w - - 0 1', { level: 'master' });
      eng.terminate();
      return out;
    }""")
    print({k: v for k, v in r.items() if not k.startswith('t')})
    print("timings ms:", {k: round(v) for k, v in r.items() if k.startswith('t') and isinstance(v, (int, float))})
    check("ready", r["tReady"] < 5000)
    check("legal opening move at learning level", r["start"] and r["start"]["from"][1] in "12", str(r["start"]))
    check("master finds Qxf7#", r["master"]["uci"] == "h5f7" and r["master"]["mateIn"] == 1, str(r["master"]))
    check("promotion parsed", r["promo"]["uci"] == "a7a8q" and r["promo"]["promotion"] == "q", str(r["promo"]))
    check("no move when already mated", r["none"] is None, str(r["none"]))
    check("concurrent calls both answer", all(r["parallel"]) and r["parallel"][1] == "a7a8q", str(r["parallel"]))
    check("movetime search answers in time", r["timed"] and 150 < r["tTimed"] < 2000, str(r["tTimed"]))
    check("timeout rejects with a clear error", "within 300 ms" in str(r["timeout"]), str(r["timeout"]))
    check("engine still answers after a timeout", r["after"] and r["after"]["uci"] == "a7a8q", str(r["after"]))
    check("no page errors", not errs, " | ".join(errs)[:200])
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
