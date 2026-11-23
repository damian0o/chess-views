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
    pg.goto("about:blank"); pg.goto(f"{base}#pos=london-system", wait_until="networkidle"); pg.wait_for_timeout(600)
    h = pg.evaluate("location.hash")
    check("direct link lands on ply 15 in Roads", "ply=15" in h and "view=roads" in h, h)
    check("no view error", pg.locator(".viewerror").count() == 0)
    check("slider at 15 of 15", pg.evaluate("[+document.getElementById('slider').value, +document.getElementById('slider').max]") == [15, 15])
    fen = pg.evaluate("location.hash")
    # final position: white bishop g3, pawns c3 d4 e3, bishop d3
    board = pg.evaluate("() => Object.fromEntries([...document.querySelectorAll('.board .sq[data-square]')].map(s => [s.dataset.square, s.querySelector('[class*=piece], .piece, img, span')?.className || '']))")
    check("squares rendered", len(board) == 64, str(len(board)))
    # library lists it
    pg.goto("about:blank"); pg.goto(base, wait_until="networkidle"); pg.keyboard.press("p"); pg.wait_for_timeout(300)
    pg.locator("#libsearch").fill("london"); pg.wait_for_timeout(200)
    card = pg.locator("#library").get_by_text("London System")
    check("library search finds London System", card.count() >= 1)
    card.first.click(); pg.wait_for_timeout(500)
    check("picking it loads the game at the setup", "ply=15" in pg.evaluate("location.hash"), pg.evaluate("location.hash"))
    check("no page errors", not errs, " | ".join(errs)[:300])
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
