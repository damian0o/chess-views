import sys, time
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + extra) if extra else ""))
    if not ok: fails.append(name)
def summary(pg): return pg.locator("#view .summary").first.inner_text() if pg.locator("#view .summary").count() else ""
def tap(pg, sq): pg.locator(f'.board .sq[data-square="{sq}"]').tap()
def goto(pg, h): pg.goto("about:blank"); pg.goto(f"{base}#{h}", wait_until="networkidle"); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    reqs = []; pg.on("request", lambda r: reqs.append(r.url))
    cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    # Finding 1: right-click (long press) on an opponent piece shows its moves; tapping one must not crash or count as a guess
    goto(pg, "view=engine"); pg.wait_for_timeout(500)
    pg.locator('.board .sq[data-square="e7"]').dispatch_event("contextmenu"); pg.wait_for_timeout(200)
    check("opponent overlay shows dots", pg.locator(".board .mv").count() == 2)
    tap(pg, "e6"); pg.wait_for_timeout(300)
    check("tapping an opponent's dot: no crash, no guess", pg.locator(".viewerror").count() == 0 and "Tap a piece" in summary(pg) and pg.evaluate("__viewer.state.guess") is None, summary(pg)[:60])
    # Finding 2: superseded searches must not leave shallow analyses in the cache
    goto(pg, "pos=opera-game"); pg.locator(".tabs [role=tab]", has_text="Engine").tap(); pg.wait_for_timeout(200)
    for _ in range(5): pg.locator("#next").tap(); pg.wait_for_timeout(40)
    for _ in range(5): pg.locator("#prev").tap(); pg.wait_for_timeout(40)
    pg.wait_for_timeout(3000)
    depths = pg.evaluate("[...__viewer.coach.cache.values()].map(r => r.depth)")
    check("every cached analysis reached full depth", all(d >= 10 for d in depths) and len(depths) >= 1, str(depths))
    # Finding 3: a king in check on the wrong turn never reaches the engine
    goto(pg, "fen=4k3%2F8%2F8%2F8%2F8%2F8%2F8%2Fr3K3+b+-+-+0+1&view=engine"); pg.wait_for_timeout(500)
    asked = pg.evaluate("[...__viewer.coach.cache.keys()].some(k => k.startsWith('4k3/8/8/8/8/8/8/r3K3')) || (__viewer.coach.inflight && __viewer.coach.inflight.fen.startsWith('4k3'))")
    check("wrong-turn check: Nothing to guess here, engine not asked", summary(pg) == "Nothing to guess here." and not asked, summary(pg)[:60])
    # Finding 7: no loss number next to a mate grade
    goto(pg, "fen=r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2B1P3%2F8%2FPPPP1PPP%2FRNB1K1NR+w+KQkq+-+3+4&view=engine")
    tap(pg, "h5"); tap(pg, "h4"); pg.wait_for_timeout(1500); s = summary(pg)
    check("missed mate: no nonsense number", "You missed a mate in 1" in s and "(" not in s.split("You missed a mate in 1")[1].split(".")[0], s[:120])
    check("no page errors", not errs, " | ".join(errs)[:300])
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
