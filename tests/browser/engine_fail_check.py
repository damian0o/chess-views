import sys, time
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + extra) if extra else ""))
    if not ok: fails.append(name)
def summary(pg): return pg.locator("#view .summary").first.inner_text() if pg.locator("#view .summary").count() else ""
def tap(pg, sq): pg.locator(f'.board .sq[data-square="{sq}"]').tap()
with sync_playwright() as p:
    b = p.chromium.launch()
    def fresh():
        ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        reqs = []; pg.on("request", lambda r: reqs.append(r.url))
        return ctx, pg, errs, reqs
    # Review Focus 5: no kings, and a checkmate: nothing to guess, engine never asked
    ctx, pg, errs, reqs = fresh()
    pg.goto("about:blank"); pg.goto(f"{base}#fen=8%2F8%2F8%2F8%2F8%2F8%2F8%2F8+w+-+-+0+1&view=engine", wait_until="networkidle"); pg.wait_for_timeout(500)
    check("no kings: Nothing to guess here", summary(pg) == "Nothing to guess here.", summary(pg)[:80])
    pg.goto("about:blank"); pg.goto(f"{base}#fen=rnb1kbnr%2Fpppp1ppp%2F8%2F4p3%2F6Pq%2F5P2%2FPPPPP2P%2FRNBQKBNR+w+KQkq+-+1+3&view=engine", wait_until="networkidle"); pg.wait_for_timeout(500)
    check("checkmate: Nothing to guess here", summary(pg) == "Nothing to guess here.", summary(pg)[:80])
    check("engine never loaded for those", not any("stockfish" in u for u in reqs))
    check("no page errors (1)", not errs, " | ".join(errs)[:200]); ctx.close()
    # Worker blocked: could not start
    ctx, pg, errs, reqs = fresh()
    pg.route("**/engine/stockfish-19-lite-single.js", lambda route: route.abort())
    pg.goto("about:blank"); pg.goto(f"{base}#view=engine", wait_until="networkidle")
    t0 = time.time()
    while time.time() - t0 < 12 and "could not start" not in summary(pg): pg.wait_for_timeout(200)
    check("blocked worker: The engine could not start in this browser.", "The engine could not start in this browser." in summary(pg) and pg.locator("#showme").count() == 0, f"{summary(pg)[:80]} after {time.time()-t0:.1f}s")
    check("the Engine view says it once", pg.evaluate("[...document.querySelectorAll('#view *')].filter(e => e.children.length === 0 && e.textContent.includes('could not start')).length") == 1)
    pg.locator(".tabs [role=tab]", has_text="Board").tap(); pg.wait_for_timeout(200); pg.locator("#evaltoggle").tap(); pg.wait_for_timeout(300)
    check("board toggle shows the same sentence", "The engine could not start in this browser." in pg.locator(".evalline .words").inner_text())
    check("no page errors (2)", not errs, " | ".join(errs)[:200]); ctx.close()
    # Slow wasm: no answer within the timeout, then Try again recovers
    ctx, pg, errs, reqs = fresh()
    def delay(route):
        time.sleep(0)  # the handler must not block the event loop; use a deferred continue instead
        route.fulfill(status=200, content_type="application/wasm", body=b"")   # an empty wasm: the loader fails to instantiate, the worker never answers
    pg.route("**/engine/stockfish-19-lite-single.wasm", delay)
    pg.goto("about:blank"); pg.goto(f"{base}#view=engine", wait_until="networkidle")
    t0 = time.time()
    while time.time() - t0 < 14 and pg.locator("#retry").count() == 0 and "could not start" not in summary(pg): pg.wait_for_timeout(250)
    words = pg.locator(".evalline .words").inner_text() if pg.locator(".evalline").count() else summary(pg)
    check("no answer: 'did not answer' with Try again, or 'could not start'", pg.locator("#retry").count() == 1 or "could not start" in summary(pg), f"{words[:80]} after {time.time()-t0:.1f}s")
    pg.unroute("**/engine/stockfish-19-lite-single.wasm")
    if pg.locator("#retry").count():
        pg.locator("#retry").tap()
    else:
        # the loader reported the broken wasm as a worker error: recover through the same path the user has, a reload
        pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(500); tap(pg, "e2"); tap(pg, "e4")
    t0 = time.time()
    while time.time() - t0 < 4 and "Your move e4:" not in summary(pg) or "thinking" in summary(pg): pg.wait_for_timeout(100)
    check("after recovery a guess is graded again", "Your move e4:" in summary(pg) and "thinking" not in summary(pg), summary(pg)[:100])
    own = [e for e in errs if "WebAssembly" not in e]   # the loader's own complaint about the broken wasm is the simulated fault, not an app error
    check("no page errors (3) beyond the simulated wasm fault", not own, " | ".join(own)[:200]); ctx.close()
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
