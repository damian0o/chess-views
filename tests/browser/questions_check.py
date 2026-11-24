"""Questions in lessons: choice and tap answers, try again, blocks-first boards, reloads, dark mode (plan task 3)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check, run, base_arg

BASE = base_arg()
NEXT, BACK = "#lesson-next", "#lesson-back"
PGN = "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#"
LONG = ["A" * 32, "B" * 32, "C" * 32, "D" * 32]
FIXTURE = {
    "id": "qfx", "name": "Question fixture", "about": "Fixture for the questions check.", "game": "Fixture game",
    "moments": [{"id": "attack", "name": "the attack", "pgn": PGN, "ply": 5}, {"id": "mate", "name": "the mate", "pgn": PGN, "ply": 7}],
    "steps": [
        {"pgn": PGN, "ply": 5, "moment": "attack", "view": "board", "say": "Look.", "ask": {"q": "Which square do they aim at?", "choices": ["e5", "f7", "f2"], "answer": 1, "right": "Yes, f7."}},
        {"same": True, "view": "knight", "say": "Open **Knight**.", "ask": {"q": "Tap the square they aim at.", "tap": ["f7"]}},
        {"same": True, "view": "territory", "say": "Open **Territory**.", "ask": {"q": "Tap the square they aim at.", "tap": ["f7"]}},
        {"moment": "mate", "recall": True, "view": "shapes", "say": "Open **Shapes**.", "ask": {"q": "Is this the mate?", "choices": ["Yes", "No"], "answer": 0}},
        {"pgn": PGN, "ply": 5, "moment": "mate", "blocks": True, "view": "shapes", "say": "Open **Shapes**.", "ask": {"q": "Is this the mate?", "choices": ["Yes", "No"], "answer": 1}},
        {"pgn": PGN, "ply": 5, "view": "board", "say": "Long labels.", "ask": {"q": "Pick D.", "choices": LONG, "answer": 3}},
    ],
}
INIT = """
(() => {
  const fx = %s;
  const orig = window.fetch.bind(window);
  window.fetch = async (url, opts) => {
    const res = await orig(url, opts);
    if (!String(url).includes('positions.json')) return res;
    const json = await res.clone().json();
    json.lessons = [...(json.lessons || []), fx];
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
})();
""" % json.dumps(FIXTURE)

CONTRAST = """(sel) => {
  const e = document.querySelector(sel); if (!e) return 0;
  const rgb = (c) => { const m = c.match(/[\\d.]+/g).map(Number); return m.length >= 3 && c.startsWith('color(') ? m.slice(0, 3).map((x) => x * 255) : m.slice(0, 3); };
  const alpha = (c) => { const m = c.match(/[\\d.]+/g).map(Number); return c.startsWith('rgba') ? m[3] : c.includes('/') ? m[3] : 1; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let n = e, bg = null;
  while (n && n.nodeType === 1) { const c = getComputedStyle(n).backgroundColor; if (alpha(c) > 0.5) { bg = c; break; } n = n.parentElement; }
  bg = bg || getComputedStyle(document.body).backgroundColor;
  const a = lum(rgb(getComputedStyle(e).color)), b = lum(rgb(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}"""

def main(pw):
    s = Session(pw, init_script=INIT); pg = s.page
    s.goto(BASE, "lesson=qfx&step=1", settle=600)
    check("fixture lesson opens", "1 of 6" in s.text("#lesson-count"), s.text("#lesson"))
    check("step bar names the moment", "the attack" in s.text("#lesson .title"), s.text("#lesson .title"))
    check("question and three choices shown", "Which square do they aim at?" in s.text("#lesson .ask") and pg.locator("#lesson .choices button.choice").count() == 3)
    check("Next waits: Answer first", pg.locator(NEXT).is_disabled() and pg.locator(NEXT).inner_text() == "Answer first", pg.locator(NEXT).inner_text())
    pg.locator("#lesson button.choice").nth(0).tap(); pg.wait_for_timeout(150)
    wrong = pg.locator("#lesson button.choice").nth(0)
    check("wrong choice: crossed, disabled, Try again, Next still locked", "wrong" in (wrong.get_attribute("class") or "") and wrong.is_disabled() and "Try again" in s.text("#lesson .askline") and pg.locator(NEXT).is_disabled())
    pg.locator("#lesson button.choice").nth(1).tap(); pg.wait_for_timeout(150)
    check("right choice: marked right, the right line, Next open", "right" in (pg.locator("#lesson button.choice").nth(1).get_attribute("class") or "") and "Yes, f7." in s.text("#lesson .askline") and pg.locator(NEXT).is_enabled() and pg.locator(NEXT).inner_text() == "Next ▶")
    # --- tap question in Knight (Review Focus 1)
    pg.locator(NEXT).tap(); s.tab("Knight"); pg.wait_for_timeout(200)
    before = pg.evaluate("__viewer.state.knightSquare")
    check("tap question shows the hint", "Tap a square on the board" in s.text("#lesson .taphint"))
    s.tap("e4"); pg.wait_for_timeout(200)
    check("wrong tap in Knight: Try again, knight not moved", "Try again" in s.text("#lesson .askline") and pg.evaluate("__viewer.state.knightSquare") == before and pg.locator(NEXT).is_disabled(), str(pg.evaluate("__viewer.state.knightSquare")))
    s.tap("f7"); pg.wait_for_timeout(200)
    check("right tap in Knight opens Next, knight not moved", pg.locator(NEXT).is_enabled() and pg.evaluate("__viewer.state.knightSquare") == before)
    # --- tap question in Territory: no focus tint
    pg.locator(NEXT).tap(); s.tab("Territory"); pg.wait_for_timeout(200)
    s.tap("f7"); pg.wait_for_timeout(200)
    check("tap in Territory: right, and no square selected", pg.locator(NEXT).is_enabled() and pg.locator(".board .sq.focused").count() == 0 and pg.evaluate("__viewer.state.territoryFocus") is None)
    # --- recall step: blocks only, no reveal until answered
    pg.locator(NEXT).tap(); pg.wait_for_timeout(250)
    check("recall step opens in Shapes with blocks only and no reveal button", pg.evaluate("__viewer.state.tab") == "shapes" and pg.locator("#view .piece").count() == 0 and pg.locator("#view .shape").count() > 0 and pg.locator("#view button.reveal").count() == 0)
    check("recall board is the mate (queen on f7)", pg.evaluate("(__viewer.state.chess.get('f7') || {}).type") == "q")
    pg.locator("#lesson button.choice").nth(0).tap(); pg.wait_for_timeout(150)
    check("after the right answer the reveal button appears", pg.locator("#view button.reveal").count() == 1 and pg.locator(NEXT).is_enabled())
    # --- blocks No step, then Back re-asks (Review Focus 2)
    pg.locator(NEXT).tap(); pg.wait_for_timeout(250)
    check("blocks step: shapes, blocks, unanswered", pg.evaluate("__viewer.state.tab") == "shapes" and pg.locator("#view .piece").count() == 0 and pg.locator(NEXT).inner_text() == "Answer first")
    pg.locator(BACK).tap(); pg.wait_for_timeout(200)
    check("Back onto an answered step re-asks it", pg.locator("#lesson button.choice.right").count() == 0 and pg.locator("#lesson button.choice.wrong").count() == 0 and pg.locator(NEXT).inner_text() == "Answer first")
    pg.locator("#lesson button.choice").nth(0).tap(); pg.wait_for_timeout(150)
    pg.locator("#view button.reveal").tap(); pg.wait_for_timeout(150)
    pg.locator(NEXT).tap(); pg.wait_for_timeout(250)
    check("Next onto a blocks step hides the pieces again", pg.locator("#view .piece").count() == 0 and pg.locator("#view .shape").count() > 0)
    pg.reload(wait_until="networkidle"); pg.wait_for_timeout(600)
    check("reload on a question step re-asks it", "5 of 6" in s.text("#lesson-count") and pg.locator("#lesson button.choice.right").count() == 0 and pg.locator(NEXT).inner_text() == "Answer first" and pg.locator("#view .piece").count() == 0)
    # --- long labels at 390 px
    pg.locator("#lesson button.choice").nth(1).tap(); pg.wait_for_timeout(150); pg.locator(NEXT).tap(); s.tab("Board"); pg.wait_for_timeout(200)
    check("four 32-character answers wrap without horizontal overflow", pg.locator("#lesson button.choice").count() == 4 and pg.evaluate("document.documentElement.scrollWidth") == 390, str(pg.evaluate("document.documentElement.scrollWidth")))
    check("no page errors", not s.errs, " | ".join(s.errs)[:300])
    s.close()
    # --- dark mode (Review Focus 5)
    s = Session(pw, init_script=INIT, color_scheme="dark"); pg = s.page
    s.goto(BASE, "lesson=qfx&step=1", settle=600)
    c0 = pg.evaluate(CONTRAST, "#lesson button.choice")
    check("dark: answer button text contrast ≥ 4.5", c0 >= 4.5, f"{c0:.2f}")
    pg.locator("#lesson button.choice").nth(0).tap(); pg.wait_for_timeout(150)
    c1 = pg.evaluate(CONTRAST, "#lesson button.choice.wrong")
    c2 = pg.evaluate(CONTRAST, "#lesson .askline")
    pg.locator("#lesson button.choice").nth(1).tap(); pg.wait_for_timeout(150)
    c3 = pg.evaluate(CONTRAST, "#lesson button.choice.right")
    check("dark: wrong, right and the answer line are readable", c1 >= 3 and c2 >= 4.5 and c3 >= 4.5, f"wrong {c1:.2f} line {c2:.2f} right {c3:.2f}")
    check("no page errors (dark)", not s.errs, " | ".join(s.errs)[:300])
    s.close()

    # --- review fixes: nothing gives a blocks answer away; buttons never look live when they are not
    s = Session(pw, init_script=INIT); pg = s.page
    s.goto(BASE, "lesson=qfx&step=5", settle=600)
    moves = s.text("#moves") + " " + s.text("#plyLabel")
    check("blocks step: no move list and no ply counter before the answer", "Qh5" not in moves and "/" not in moves and pg.evaluate("__viewer.state.moves.length") == 0, moves)
    fen = pg.evaluate("__viewer.state.chess.fen()")
    pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(150)
    check("blocks step: arrow keys cannot step away from the board", pg.evaluate("__viewer.state.chess.fen()") == fen)
    s.tab("Board", force=True)
    check("blocks step: other tabs are closed until the answer", pg.evaluate("__viewer.state.tab") == "shapes" and "Answer first" in s.text("#toast") and pg.locator("#view .piece").count() == 0, s.text("#toast"))
    pg.locator("#lesson button.choice").nth(1).tap(); pg.wait_for_timeout(200)
    check("after the answer the moves come back at the same ply", "Qh5" in s.text("#moves") and pg.evaluate("__viewer.state.ply") == 5 and pg.evaluate("__viewer.state.moves.length") == 7)
    s.tab("Board")
    check("after the answer other tabs open again", pg.evaluate("__viewer.state.tab") == "board")
    s.goto(BASE, "lesson=qfx&step=4", settle=600)
    check("recall step: no move list either", "Qxf7" not in s.text("#moves") and pg.evaluate("__viewer.state.moves.length") == 0, s.text("#moves"))
    # a choice question seen from another view: the buttons are disabled, not dead
    s.goto(BASE, "lesson=qfx&step=6&view=territory", settle=600)
    check("choices are disabled outside the step's view", pg.locator("#lesson button.choice").count() == 4 and pg.evaluate("[...document.querySelectorAll('#lesson button.choice')].every(b => b.disabled)"))
    s.tab("Board")
    check("choices work again in the step's view", pg.evaluate("[...document.querySelectorAll('#lesson button.choice')].every(b => !b.disabled)"))
    pg.locator("#lesson button.choice").nth(3).tap(); pg.wait_for_timeout(150)
    check("the right answer is not dimmed", pg.evaluate("getComputedStyle(document.querySelector('#lesson button.choice.right')).opacity") == "1", pg.evaluate("getComputedStyle(document.querySelector('#lesson button.choice.right')).opacity"))
    check("no page errors (review fixes)", not s.errs, " | ".join(s.errs)[:300])
    s.close()

run(main)
