import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
PGN = "1.%20e4%20c5%202.%20c3%20d5%203.%20exd5%20Qxd5%204.%20d4%20g6%205.%20Nf3%20Bg7%206.%20Be2%20Nc6%207.%20O-O%20Nf6%208.%20c4%20Qd8%209.%20d5%20Ne5"
res = []
def chk(n, ok, d=""): res.append((n, ok, d))
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    for view in ["board", "territory", "reach", "roads", "kings", "diamond", "shapes", "knight"]:
        pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(BASE + f"#pgn={PGN}&ply=18&view={view}", wait_until="networkidle"); pg.wait_for_timeout(400)
        sw, iw = pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
        cell = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.board .sq, .dcell')).width)")
        chk(f"{view}: no horizontal overflow", sw == 390 and iw == 390, f"scrollW={sw} innerW={iw}")
        chk(f"{view}: squares at least 34px", cell >= 34, f"cell={cell}")
        chk(f"{view}: no errors", not errs, str(errs))
        pg.close()
    # press-and-hold on the board view
    pg = ctx.new_page()
    pg.goto(BASE + f"#pgn={PGN}&ply=18&view=board", wait_until="networkidle"); pg.wait_for_timeout(300)
    hint = pg.inner_text("#hint")
    chk("touch hint says press and hold", hint.startswith("Hold"), hint)
    pg.evaluate("""() => { const sq = document.querySelector('[data-square="e5"]');
      sq.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })); }""")
    pg.wait_for_timeout(650)
    n = pg.evaluate("document.querySelectorAll('.mv').length")
    chk("hold 650ms on Ne5 shows its moves", n == 6, f"dots={n}")
    pg.evaluate("""() => { const sq = document.querySelector('[data-square="e5"]');
      sq.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true })); }""")
    # a short tap must not trigger
    pg.evaluate("""() => { const sq = document.querySelector('[data-square="e5"]');
      sq.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
      setTimeout(() => sq.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true })), 120); }""")
    pg.wait_for_timeout(700)
    n2 = pg.evaluate("document.querySelectorAll('.mv').length")
    chk("short tap toggles nothing (moves still shown)", n2 == 6, f"dots={n2}")
    # Android: contextmenu right after long press must not double-toggle
    pg.evaluate("""() => { const sq = document.querySelector('[data-square="e5"]');
      sq.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })); }""")
    pg.wait_for_timeout(650)
    pg.evaluate("""() => { const sq = document.querySelector('[data-square="e5"]');
      sq.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); }""")
    pg.wait_for_timeout(100)
    n3 = pg.evaluate("document.querySelectorAll('.mv').length")
    chk("long press hides again; following contextmenu ignored", n3 == 0, f"dots={n3}")
    pg.close()
    # desktop unchanged
    dctx = b.new_context(viewport={"width": 1200, "height": 900})
    pg = dctx.new_page()
    pg.goto(BASE + f"#pgn={PGN}&ply=18&view=board", wait_until="networkidle"); pg.wait_for_timeout(300)
    chk("desktop hint says right-click", pg.inner_text("#hint").startswith("Right-click"), pg.inner_text("#hint"))
    pg.click('[data-square="e5"]', button="right"); pg.wait_for_timeout(150)
    chk("desktop right-click shows moves", pg.evaluate("document.querySelectorAll('.mv').length") == 6)
    cell = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.board .sq')).width)")
    chk("desktop cell still 52px", abs(cell - 53) < 1.5, f"cell={cell}")
    b.close()
for n, ok, d in res: print(("PASS " if ok else "FAIL ") + n + ("" if ok else "  -> " + d))
print("ALL PASS" if all(r[1] for r in res) else "SOME FAILED")
