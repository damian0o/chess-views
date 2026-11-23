import sys, time
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
WORDS = {"Equal", "White is a little better", "White is better", "White is winning", "Black is a little better", "Black is better", "Black is winning"}
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + extra) if extra else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    reqs = []; pg.on("request", lambda r: reqs.append(r.url))
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    pg.goto("about:blank"); pg.goto(base, wait_until="networkidle"); pg.wait_for_timeout(300)
    check("fresh page: no eval line", pg.locator(".evalline").count() == 0)
    check("fresh page: engine not loaded", not any("stockfish" in u for u in reqs))
    pg.locator("#evaltoggle").tap(); pg.wait_for_timeout(50)
    first = pg.locator(".evalline .words").inner_text() if pg.locator(".evalline").count() else "(none)"
    check("toggle on: line appears, thinking first", first in ("Thinking…",) or first in WORDS, first)
    t0 = time.time(); words = first
    while time.time() - t0 < 3 and words not in WORDS:
        pg.wait_for_timeout(50); words = pg.locator(".evalline .words").inner_text()
    dt = time.time() - t0
    check("start position evaluated within 1 s (throttled 4x)", words in WORDS and dt <= 1.0, f"{words} after {dt:.2f}s")
    width = pg.evaluate("parseFloat(document.querySelector('.evalbar .w').style.width)")
    check("bar near the middle for the start position", 40 <= width <= 60, str(width))
    check("eval=1 in the link", "eval=1" in pg.evaluate("location.hash"), pg.evaluate("location.hash"))
    url = pg.url
    pg.goto("about:blank"); pg.goto(url, wait_until="networkidle"); pg.wait_for_timeout(800)
    check("reload keeps the toggle and the line", pg.evaluate("document.getElementById('evaltoggle').checked") and pg.locator(".evalline").count() == 1)
    # Review Focus 2: rapid stepping, the words must belong to the position on screen
    pg.goto("about:blank"); pg.goto(f"{base}#pos=opera-game", wait_until="networkidle"); pg.wait_for_timeout(300)
    pg.evaluate("() => { __viewer.state.evalOn = true; __viewer.state.tab = 'board'; __viewer.render(); }")
    for _ in range(5): pg.locator("#next").tap(); pg.wait_for_timeout(50)
    pg.wait_for_timeout(2500)
    onscreen = pg.evaluate("""async () => { const C = await import('./coach.js'); const s = __viewer.state; const keys = [...__viewer.coach.cache.keys()]; const last = keys[keys.length - 1];
      const entry = __viewer.coach.cache.get(last); const shown = document.querySelector('.evalline .words').textContent;
      return { ply: s.ply, lastKey: last, shown, expected: C.evalWords(C.toWhite(entry.moves[0], last.split(' ')[1])) }; }""")
    # ply 28 = after 14...Qe6: White to move at move 15; the words on screen must be those of that position's analysis
    check("after rapid stepping the shown words come from the position on screen", onscreen["ply"] == 28 and " w " in onscreen["lastKey"] and onscreen["lastKey"].endswith(" 15") and onscreen["shown"] == onscreen["expected"], str(onscreen))
    # checkmate: no evaluation, no engine request
    pg.goto("about:blank"); pg.goto(f"{base}#fen=rnb1kbnr%2Fpppp1ppp%2F8%2F4p3%2F6Pq%2F5P2%2FPPPPP2P%2FRNBQKBNR+w+KQkq+-+1+3&eval=1", wait_until="networkidle"); pg.wait_for_timeout(500)
    words = pg.locator(".evalline .words").inner_text()
    cached = pg.evaluate("[...__viewer.coach.cache.keys()].some(k => k.startsWith('rnb1kbnr/pppp1ppp/8/4p3/6Pq'))")
    check("checkmate: No evaluation here and nothing asked of the engine", words == "No evaluation here" and not cached, words)
    check("no page errors", not errs, " | ".join(errs)[:300])
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
