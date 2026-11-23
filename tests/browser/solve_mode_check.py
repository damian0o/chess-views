import sys
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + extra) if extra else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 390, "height": 844})
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("about:blank"); pg.goto(f"{base}#pos=mate-in-three", wait_until="networkidle"); pg.wait_for_timeout(600)
    moves = pg.locator("#moves").inner_text()
    check("opens at the problem, ply 0", pg.evaluate("[+document.getElementById('slider').value, +document.getElementById('slider').max]") == [0, 5])
    check("stipulation shown", "mate in three" in moves, moves)
    check("answer hidden", "Rf1" not in moves and moves.count("?") == 5, moves)
    check("solve flag in the link", "solve=1" in pg.evaluate("location.hash"))
    check("status says White to move", "White to move" in pg.locator(".status").inner_text())
    pg.locator("#next").click(); pg.wait_for_timeout(200)
    moves = pg.locator("#moves").inner_text()
    check("stepping reveals the first move only", "Rf1" in moves and "b5" not in moves and moves.count("?") == 4, moves)
    pg.locator("#last").click(); pg.wait_for_timeout(300)
    check("end is checkmate", "Checkmate" in pg.locator(".status").inner_text(), pg.locator(".status").inner_text()[:80])
    check("all moves shown at the end", "Rd3#" in pg.locator("#moves").inner_text())
    # reload the shared link keeps solve mode and the ply
    pg.locator("#first").click(); pg.wait_for_timeout(100)
    url = pg.url
    pg.goto("about:blank"); pg.goto(url, wait_until="networkidle"); pg.wait_for_timeout(400)
    check("reloading the link keeps the solution hidden", pg.locator("#moves").inner_text().count("?") == 5 and "Rf1" not in pg.locator("#moves").inner_text())
    # board shows the right position: white rook g1, black king e4
    sq = pg.evaluate("() => ({ g1: document.querySelector('.board .sq[data-square=\"g1\"]').innerHTML.includes('rook') || document.querySelector('.board .sq[data-square=\"g1\"]').textContent.trim(), e4: document.querySelector('.board .sq[data-square=\"e4\"]').textContent.trim() || document.querySelector('.board .sq[data-square=\"e4\"]').innerHTML.slice(0,80) })")
    print("  g1/e4 cells:", sq)
    # an ordinary game is unaffected
    pg.goto("about:blank"); pg.goto(f"{base}#pos=opera-game", wait_until="networkidle"); pg.wait_for_timeout(400)
    check("ordinary game shows its moves", "?" not in pg.locator("#moves").inner_text() and "solve" not in pg.evaluate("location.hash"))
    # pasting a new position after a problem leaves solve mode
    pg.goto("about:blank"); pg.goto(f"{base}#pos=mate-in-three", wait_until="networkidle"); pg.wait_for_timeout(400)
    pg.locator("#open-load").click(); pg.locator("[data-example]").nth(3).click(); pg.wait_for_timeout(400)
    check("loading another game turns solve mode off", "?" not in pg.locator("#moves").inner_text() and "solve" not in pg.evaluate("location.hash"), pg.evaluate("location.hash")[:60])
    # library filter chip
    pg.keyboard.press("p"); pg.wait_for_timeout(300)
    pg.locator("#libtags button", has_text="problem").click(); pg.wait_for_timeout(200)
    check("problem tag filters the library", pg.locator("#library").get_by_text("Mate in three").count() >= 1)
    check("no page errors", not errs, " | ".join(errs)[:300])
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
