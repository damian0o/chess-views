import sys, time
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
GRADES = ["Best!", "Just as good", "Good", "Okay, but there was better", "Oops, that loses something", "You missed a mate in", "Oops, that allows mate in"]
SCHOLAR = "r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2B1P3%2F8%2FPPPP1PPP%2FRNB1K1NR+w+KQkq+-+3+4"
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + extra) if extra else ""))
    if not ok: fails.append(name)
def tap(pg, sq): pg.locator(f'.board .sq[data-square="{sq}"]').tap()
def summary(pg): return pg.locator("#view .summary").first.inner_text() if pg.locator("#view .summary").count() else ""
def wait_grade(pg, timeout=3.0):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = summary(pg)
        if any(g in s for g in GRADES): return s, time.time() - t0
        pg.wait_for_timeout(50)
    return summary(pg), timeout
def goto(pg, hash_): pg.goto("about:blank"); pg.goto(f"{base}#{hash_}", wait_until="networkidle"); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    goto(pg, "view=engine")
    tabs = pg.locator(".tabs [role=tab]").all_inner_texts()
    check("Engine tab between King houses and Diamond", tabs.index("Engine") == tabs.index("King houses") + 1 and tabs[tabs.index("Engine") + 1] == "Diamond", str(tabs))
    check("eval line present", pg.locator("#view .evalline").count() == 1)
    pg.wait_for_timeout(600)
    leak = pg.evaluate("document.querySelectorAll('line.arrow, .sq.aim, .sq.focused, .sq[style*=background]').length")
    check("no leak before a guess", leak == 0 and "Tap a piece" in summary(pg), f"leak={leak} :: {summary(pg)[:80]}")
    tap(pg, "e7"); pg.wait_for_timeout(200)
    check("tapping the other side's piece: toast and no dots", "It is White's move" in pg.locator("#toast").inner_text() and pg.locator(".board .mv").count() == 0)
    tap(pg, "e2"); pg.wait_for_timeout(200)
    check("own pawn shows two dots", pg.locator(".board .mv").count() == 2, str(pg.locator(".board .mv").count()))
    tap(pg, "e4"); s, dt = wait_grade(pg)
    check("guess e4 is graded within 1.5 s", "Your move e4:" in s and any(g in s for g in GRADES) and dt <= 1.5, f"{s[:120]} ({dt:.2f}s)")
    check("arrows drawn after the guess", pg.locator("line.arrow").count() >= 1 and pg.locator("#again").count() == 1)
    pg.locator("#again").tap(); pg.wait_for_timeout(100)
    check("Try another resets", pg.locator("line.arrow").count() == 0 and "Tap a piece" in summary(pg) and pg.locator("#view .evalline").count() == 1)
    tap(pg, "f2"); tap(pg, "f3"); s, dt = wait_grade(pg)
    check("bad guess f3 is Okay or Oops with a yellow guess arrow", ("Okay, but there was better" in s or "Oops, that loses something" in s) and pg.locator("line.arrow.guess").count() == 1, s[:120])
    goto(pg, f"fen={SCHOLAR}&view=engine")
    tap(pg, "h5"); tap(pg, "f7"); s, dt = wait_grade(pg)
    check("Scholar's mate: Best! with one arrow and no number (a mate has no pawn loss)", "Best!" in s and "(" not in s.split("Best!")[1].split(".")[0] and pg.locator("line.arrow.rank-1").count() == 1 and pg.locator("line.arrow").count() == 1, s[:120])
    goto(pg, "fen=8%2FP6k%2F8%2F8%2F8%2F8%2F8%2FK7+w+-+-+0+1&view=engine")
    tap(pg, "a7"); tap(pg, "a8"); s, dt = wait_grade(pg)
    check("promotion guess becomes a8=Q and grades well", "Your move a8=Q:" in s and any(g in s for g in ("Best!", "Just as good", "Good")), s[:120])
    goto(pg, f"fen={SCHOLAR}&view=engine&flip=1")
    tap(pg, "h5"); tap(pg, "f7"); s, dt = wait_grade(pg)
    xy = pg.evaluate("() => { const l = document.querySelector('line.arrow.rank-1'); return [+l.getAttribute('x1'), +l.getAttribute('y1'), +l.getAttribute('x2'), +l.getAttribute('y2')]; }")
    check("flipped board: arrow h5->f7 drawn at flipped coordinates", xy == [0.5, 4.5, 2.5, 6.5], str(xy))
    goto(pg, "view=engine"); pg.wait_for_timeout(600)
    pg.locator("#showme").tap(); pg.wait_for_timeout(800)
    s = summary(pg)
    check("Show me reveals without a grade", s.startswith("Here is what the engine likes:") and pg.locator("line.arrow").count() >= 1 and not any(g in s for g in GRADES), s[:120])
    goto(pg, "pos=opera-game"); pg.locator(".tabs [role=tab]", has_text="Engine").tap(); pg.wait_for_timeout(300)   # #pos= links open in the entry's own view
    tap(pg, "a8"); pg.wait_for_timeout(100)
    check("a pick shows dots", pg.locator(".board .mv-from").count() == 1)
    pg.locator("#next").tap(); pg.wait_for_timeout(300)
    check("stepping clears a pending pick", pg.locator(".board .mv").count() == 0 and pg.locator(".board .mv-from").count() == 0 and "Tap a piece" in summary(pg))
    # Task 6: what was played in the game
    goto(pg, "pos=opera-game"); pg.locator(".tabs [role=tab]", has_text="Engine").tap(); pg.wait_for_timeout(300)
    tap(pg, "a8"); tap(pg, "d8"); s, dt = wait_grade(pg)
    check("ply 23: the Duke's Rd8 is named", "In the game Duke of Brunswick and Count Isouard played Rd8 (" in s, s[:160])
    pg.locator("#next").tap(); pg.wait_for_timeout(300)
    tap(pg, "d1"); tap(pg, "d7"); s, dt = wait_grade(pg)
    check("ply 24: Morphy played Rxd7 (Best)", "In the game Morphy played Rxd7 (Best)." in s, s[:160])
    # Task 6: solve mode against the stored key
    goto(pg, "pos=mate-in-three"); pg.locator(".tabs [role=tab]", has_text="Engine").tap(); pg.wait_for_timeout(600)
    check("problem: no arrows before a guess", pg.locator("line.arrow").count() == 0 and "Tap a piece" in summary(pg))
    tap(pg, "g1"); tap(pg, "f1"); pg.wait_for_timeout(800); s = summary(pg)
    check("key move: That's it! with the engine list", "That's it!" in s and "Engine:" in s, s[:160])
    pg.locator("#again").tap(); tap(pg, "d5"); tap(pg, "d8"); pg.wait_for_timeout(800); s = summary(pg)
    check("wrong move: Not the key. The answer is Rf1.", "Not the key. The answer is Rf1." in s, s[:160])
    pg.locator("#next").tap(); pg.wait_for_timeout(300); s = summary(pg)
    tap(pg, "b6"); pg.wait_for_timeout(150)
    check("opponent ply: Press ▶ for Black's reply, taps do nothing", "Press ▶ for Black's reply." in s and pg.locator(".board .mv-from").count() == 0 and pg.locator("#showme").count() == 0, s[:80])
    pg.locator("#first").tap(); pg.wait_for_timeout(300); pg.locator("#showme").tap(); pg.wait_for_timeout(800); s = summary(pg)
    check("Show me on a problem reveals the stored key", s.startswith("The answer is Rf1."), s[:120])
    check("no page errors", not errs, " | ".join(errs)[:300])
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
