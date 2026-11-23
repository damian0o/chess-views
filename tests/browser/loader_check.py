import sys
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/"
FEN = "8/8/8/8/8/8/8/K6k w - - 0 1"
fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + extra) if extra else ""))
    if not ok: fails.append(name)
with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    def mobile(ctx_kwargs={}):
        ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, permissions=["clipboard-read", "clipboard-write"], **ctx_kwargs)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(base, wait_until="networkidle"); return ctx, pg
    # 1. phone: loader opens empty and does not grab focus
    ctx, pg = mobile()
    pg.locator("#open-load").tap(); pg.wait_for_timeout(200)
    check("phone: box opens empty", pg.locator("#input").input_value() == "", repr(pg.locator("#input").input_value()))
    check("phone: box not focused on open", pg.evaluate("document.activeElement.id") != "input", pg.evaluate("document.activeElement.id"))
    check("Paste button visible", pg.locator("#paste").is_visible())
    # 2. Paste button reads the clipboard and loads
    pg.evaluate("t => navigator.clipboard.writeText(t)", FEN)
    pg.locator("#paste").tap(); pg.wait_for_timeout(500)
    check("paste loads the position and closes the dialog", not pg.evaluate("document.getElementById('loader').open") and "K6k" in pg.evaluate("location.hash"), pg.evaluate("location.hash"))
    # 3. bad clipboard content shows the usual error, dialog stays open
    pg.locator("#open-load").tap(); pg.evaluate("t => navigator.clipboard.writeText(t)", "hello there")
    pg.locator("#paste").tap(); pg.wait_for_timeout(300)
    check("junk clipboard shows an error", pg.evaluate("document.getElementById('loader').open") and "Could not" in pg.locator("#error").inner_text(), pg.locator("#error").inner_text())
    check("junk text is left in the box to edit", pg.locator("#input").input_value() == "hello there")
    # 4. Current position chip fills the box with the current FEN
    pg.locator("#current-position").tap(); pg.wait_for_timeout(100)
    check("Current position chip fills the box", "K6k" in pg.locator("#input").input_value(), pg.locator("#input").input_value())
    ctx.close()
    # 5. clipboard read refused -> fallback toast, focus in the box
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.add_init_script("Object.defineProperty(navigator, 'clipboard', { value: { readText: () => Promise.reject(new Error('denied')) } });")
    pg.goto(base, wait_until="networkidle"); pg.locator("#open-load").tap(); pg.locator("#paste").tap(); pg.wait_for_timeout(300)
    check("refused clipboard: toast tells how to paste by hand", "Paste" in pg.locator("#toast").inner_text() and pg.locator("#toast").evaluate("e => e.classList.contains('show')"), pg.locator("#toast").inner_text())
    check("refused clipboard: box gets focus", pg.evaluate("document.activeElement.id") == "input")
    ctx.close()
    # 6. desktop keeps the keyboard-first flow: box focused on open
    ctx = b.new_context(viewport={"width": 1200, "height": 800}); pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(base, wait_until="networkidle"); pg.keyboard.press("l"); pg.wait_for_timeout(200)
    check("desktop: box focused on open", pg.evaluate("document.activeElement.id") == "input")
    check("desktop: box opens empty", pg.locator("#input").input_value() == "")
    ctx.close()
    check("no page errors", not errs, " | ".join(errs)[:300])
    b.close()
print("ALL PASS" if not fails else f"FAILED: {fails}")
sys.exit(1 if fails else 0)
