import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/'
SCH = 'r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2B1P3%2F8%2FPPPP1PPP%2FRNB1K1NR+b+KQkq+-+3+3'
ok = True
def check(n, c):
    global ok; ok &= bool(c); print(('PASS ' if c else 'FAIL ') + n)
with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width':390,'height':844}); errs=[]; page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(BASE + f'#fen={SCH}&view=territory&sq=f7', wait_until='networkidle'); page.wait_for_timeout(200)
    txt = page.locator('.summary').inner_text(); print(txt)
    check('f7 marked held', 'take-held' in page.locator('.board .sq[data-square="f7"]').get_attribute('class'))
    check('f7 summary says checkmate', 'checkmate' in txt and "White's turn" in txt)
    page.locator('.board .sq[data-square="f7"]').click(); page.wait_for_timeout(100)
    ov = page.locator('.summary').inner_text(); print(ov[:200])
    check('overview: nothing free in Scholar', 'Nothing can be taken' in ov)
    page.goto('about:blank'); page.goto(BASE + '#fen=4k3%2F8%2F4p3%2F3R4%2F8%2F8%2F8%2F3QK3+w+-+-+0+1&view=territory', wait_until='networkidle'); page.wait_for_timeout(200)
    cls = page.locator('.board .sq[data-square="d5"]').get_attribute('class')
    check('rook d5 marked cheap with black taker', 'take-cheap' in cls and 'taker-b' in cls)
    check('x tag present', page.locator('.board .sq[data-square="d5"] .taketag').count() == 1)
    check('overview lists it', "Can be taken: White's rook d5" in page.locator('.summary').inner_text())
    page.locator('.board .sq[data-square="d5"]').click(); page.wait_for_timeout(100)
    t2 = page.locator('.summary').inner_text(); print(t2[:220])
    check('d5 story', 'can be taken: the pawn e6 is worth less' in t2)
    check('legend rows', page.locator('.vlegend .sw.take').count() == 1 and page.locator('.vlegend .sw.take-held').count() == 1)
    check('no errors', not errs); print(errs if errs else '')
    print('ALL PASS' if ok else 'SOME FAILED'); b.close()
sys.exit(0 if ok else 1)
