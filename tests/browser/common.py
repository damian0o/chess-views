"""Shared helpers for the browser checks (Python Playwright against a served copy of the page)."""
import sys, time
from playwright.sync_api import sync_playwright

_fails = []
_count = [0]

def check(name, ok, extra=""):
    _count[0] += 1
    print(("PASS " if ok else "FAIL ") + name + ((" :: " + str(extra)) if extra else ""))
    if not ok: _fails.append(name)

def finish():
    print("ALL PASS" if not _fails else f"FAILED: {_fails}", f"({_count[0]} checks)")
    sys.exit(1 if _fails else 0)

def base_arg(default="http://localhost:8080/"):
    b = sys.argv[1] if len(sys.argv) > 1 else default
    return b if b.endswith("/") else b + "/"

class Session:
    """One Chromium context sized like a phone, CPU-throttled, collecting page errors."""
    def __init__(self, pw, viewport=(390, 844), throttle=4, mobile=True, init_script=None, permissions=None):
        self.browser = pw.chromium.launch()
        kw = {"viewport": {"width": viewport[0], "height": viewport[1]}, "is_mobile": mobile, "has_touch": mobile}
        if permissions: kw["permissions"] = permissions
        self.ctx = self.browser.new_context(**kw)
        if init_script: self.ctx.add_init_script(init_script)
        self.page = self.ctx.new_page()
        self.errs = []
        self.page.on("pageerror", lambda e: self.errs.append(str(e)))
        if throttle and throttle > 1:
            cdp = self.ctx.new_cdp_session(self.page)
            cdp.send("Emulation.setCPUThrottlingRate", {"rate": throttle})
    def goto(self, base, hash_="", settle=300):
        self.page.goto("about:blank")
        self.page.goto(f"{base}#{hash_}" if hash_ else base, wait_until="networkidle")
        self.page.wait_for_timeout(settle)
    def tap(self, square):
        self.page.locator(f'.board .sq[data-square="{square}"]').tap()
    def tab(self, title, force=False):
        # force: Playwright refuses to tap an aria-disabled button, a finger does not
        self.page.locator(".tabs [role=tab]", has_text=title).first.tap(force=force)
        self.page.wait_for_timeout(150)
    def summary(self):
        loc = self.page.locator("#view .summary")
        return loc.first.inner_text() if loc.count() else ""
    def text(self, selector):
        loc = self.page.locator(selector)
        return loc.first.inner_text() if loc.count() else ""
    def wait_text(self, selector, needle, timeout=3.0):
        t0 = time.time()
        while time.time() - t0 < timeout:
            if needle in self.text(selector): return True
            self.page.wait_for_timeout(50)
        return needle in self.text(selector)
    def close(self):
        self.browser.close()

def run(fn):
    with sync_playwright() as pw:
        fn(pw)
    finish()
