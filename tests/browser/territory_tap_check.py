import sys
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
FEN = "3r4%2Fp2q4%2F1p3k1p%2F2bP1pp1%2F2N1p3%2F1P4P1%2FP2R1P1P%2F3Q2K1+b+-+-+3+31"
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + extra) if extra else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    # 1. loose piece (h6 pawn: not attacked, not defended) via URL
    pg.goto("about:blank"); pg.goto(f"{base}#fen={FEN}&view=territory&sq=h6", wait_until="networkidle"); pg.wait_for_timeout(500)
    check("no view error for loose piece h6", pg.locator(".viewerror").count() == 0)
    txt = pg.locator(".summary").inner_text() if pg.locator(".summary").count() else ""
    check("h6 story says loose piece", "loose piece" in txt, txt[:160])
    # 2. defended, un-attacked piece: tap g3 (white pawn, defended by pawn h2 and f2)
    pg.locator('.board .sq[data-square="g3"], .board .sq[data-sq="g3"]').first.click() if pg.locator('.board .sq[data-square="g3"], .board .sq[data-sq="g3"]').count() else None
    pg.wait_for_timeout(300)
    txt2 = pg.locator(".summary").inner_text() if pg.locator(".summary").count() else ""
    check("no view error after tapping defended quiet piece", pg.locator(".viewerror").count() == 0)
    check("g3 story names its defenders", "g3" in txt2 and "not attacked" in txt2 and "defend" in txt2, txt2[:200])
    # 3. every square: tap each one, never an error
    bad = []
    for f in "abcdefgh":
        for r in range(1, 9):
            sq = f"{f}{r}"
            pg.goto("about:blank"); pg.goto(f"{base}#fen={FEN}&view=territory&sq={sq}", wait_until="networkidle")
            if pg.locator(".viewerror").count(): bad.append(sq)
    check("all 64 squares render when selected", not bad, ",".join(bad))
    check("no console errors", not errs, " | ".join(errs)[:300])
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
