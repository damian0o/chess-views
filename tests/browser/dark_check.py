"""Dark mode: the page is dark but the board stays light, so black pieces and letters are readable."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check, run, base_arg

BASE = base_arg()
FEN = "r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2B1P3%2F8%2FPPPP1PPP%2FRNB1K1NR+b+KQkq+-+3+3"

def lum(css):
    """Relative luminance 0..1 of a computed colour: rgb(a, b, c) or color(srgb r g b / a)."""
    inner = css[css.index("(") + 1:css.rindex(")")]
    if inner.startswith("srgb"):
        r, g, b = [float(x) for x in inner.split("/")[0].split()[1:4]]
    else:
        r, g, b = [int(x) / 255 for x in inner.split(",")[:3]]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def main(pw):
    s = Session(pw, color_scheme="dark"); pg = s.page
    s.goto(BASE, f"fen={FEN}", settle=400)
    body = pg.evaluate("getComputedStyle(document.body).backgroundColor")
    dark_sq = pg.evaluate("getComputedStyle(document.querySelector('.board .sq.dark')).backgroundColor")
    light_sq = pg.evaluate("getComputedStyle(document.querySelector('.board .sq.light')).backgroundColor")
    check("the page is dark", lum(body) < 0.2, body)
    check("the dark squares are still light enough for black pieces", lum(dark_sq) > 0.45, dark_sq)
    check("the light squares are light", lum(light_sq) > 0.8, light_sq)
    pg.locator("#letters").tap(); pg.wait_for_timeout(200)
    ink = pg.evaluate("getComputedStyle(document.querySelector('.board .sq.dark')).color")
    check("letters on the board use a dark ink", lum(ink) < 0.3, ink)
    dot = pg.evaluate("(() => { const d = document.querySelector('.board .sq .dot'); return d ? getComputedStyle(d).color : 'rgb(0,0,0)'; })()")
    check("the dots on empty dark squares are readable", lum(dot) < 0.5, dot)
    pg.locator("#letters").tap()
    for view in ("territory", "roads", "shapes", "kings"):
        s.tab({"territory": "Territory", "roads": "Roads", "shapes": "Shapes", "kings": "King houses"}[view])
        bg = pg.evaluate("(() => { const q = document.querySelector('.board .sq.dark, .dcell.dark .shape'); return q ? getComputedStyle(q).backgroundColor : 'rgb(0,0,0)'; })()")
        check(f"{view}: board stays readable", lum(bg) > 0.4 or view == "roads" and lum(bg) > 0.3, f"{view} {bg}")
    check("no horizontal overflow at 390px", pg.evaluate("document.documentElement.scrollWidth") == 390)
    check("no page errors", not s.errs, " | ".join(s.errs)[:300])
    s.close()
    # and the light theme is untouched
    s = Session(pw, color_scheme="light"); pg = s.page
    s.goto(BASE, f"fen={FEN}", settle=300)
    check("light theme: white light squares", pg.evaluate("getComputedStyle(document.querySelector('.board .sq.light')).backgroundColor") == "rgb(255, 255, 255)")
    s.close()

run(main)
