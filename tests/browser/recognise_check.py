"""Recognise: a seeded round of blocks boards from finished lessons (plan task 5)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check, run, base_arg

BASE = base_arg()
NEXT = "#lesson-next"
OPERA = "opera-game"
F = ["r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
     "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
     "4k3/8/8/8/8/8/8/R3K3 w - - 0 1",
     "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
     "8/8/8/4k3/8/8/4P3/4K3 w - - 0 1"]
def lesson(id_, game, moments):
    return {"id": id_, "name": game, "about": f"{game} fixture.", "game": game,
            "moments": [{"id": m, "name": f"the {m}", "fen": F[i]} for m, i in moments],
            "steps": [{"fen": F[0], "view": "board", "say": "x"}] * 3}
FIX = [lesson("rfa", "Alpha game", [("start", 0), ("trick", 1), ("mate", 2)]), lesson("rfb", "Beta game", [("hunt", 3), ("end", 4)])]
INIT = """
(() => {
  const fx = %s;
  const orig = window.fetch.bind(window);
  window.fetch = async (url, opts) => {
    const res = await orig(url, opts);
    if (!String(url).includes('positions.json')) return res;
    const json = await res.clone().json();
    json.lessons = [...(json.lessons || []), ...fx];
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
})();
""" % json.dumps(FIX)
LABELS = {f"{l['game']}: {m['name']}" for l in FIX for m in l["moments"]}

def main(pw):
    s = Session(pw, init_script=INIT); pg = s.page
    # --- locked when nothing is finished
    s.goto(BASE, "", settle=400)
    pg.evaluate("localStorage.removeItem('chess-views:lessons')")
    pg.locator("#open-library").tap() if pg.locator("#open-library").count() else pg.keyboard.press("l")
    pg.wait_for_timeout(300)
    card = pg.locator("#liblessons .lesson-card.round")
    check("Recognise card is on the shelf", card.count() == 1)
    check("locked: Start disabled and the unlock line", card.locator("button.start").is_disabled() and "Finish two game lessons to unlock" in card.inner_text(), card.inner_text() if card.count() else "")
    # Review Focus 3: a valid seed with nothing finished
    s.goto(BASE, "lesson=recognise&seed=5&step=1", settle=600)
    check("seed but nothing finished: toast, no bar", "That lesson is not here" in s.text("#toast") and pg.locator("#lesson").is_hidden())
    # --- unlocked
    before = json.dumps({"rfa": {"step": 3, "done": True}, "rfb": {"step": 3, "done": True}})
    pg.evaluate(f"localStorage.setItem('chess-views:lessons', {json.dumps(before)})")
    s.goto(BASE, "", settle=400)
    pg.locator("#open-library").tap() if pg.locator("#open-library").count() else pg.keyboard.press("l")
    pg.wait_for_timeout(300)
    card = pg.locator("#liblessons .lesson-card.round")
    check("unlocked: Start enabled", card.locator("button.start").is_enabled())
    card.locator("button.start").tap(); pg.wait_for_timeout(500)
    n = 5
    check("round opens at 1 of 5 in Shapes with blocks only", f"1 of {n}" in s.text("#lesson-count") and pg.evaluate("__viewer.state.tab") == "shapes" and pg.locator("#view .piece").count() == 0 and pg.locator("#view .shape").count() > 0, s.text("#lesson"))
    choices = pg.evaluate("[...document.querySelectorAll('#lesson button.choice')].map(b => b.textContent)")
    check("three or four choices, all finished moments", 3 <= len(choices) <= 4 and set(choices) <= LABELS, str(choices))
    check("link carries the round and its seed", "lesson=recognise" in pg.url and "seed=" in pg.url, pg.url)
    fen0 = pg.evaluate("__viewer.state.chess.fen()")
    pg.reload(wait_until="networkidle"); pg.wait_for_timeout(600)
    check("reload: same board, same choices", pg.evaluate("__viewer.state.chess.fen()") == fen0 and pg.evaluate("[...document.querySelectorAll('#lesson button.choice')].map(b => b.textContent)") == choices)
    # walk the round: one wrong answer on the first board, then right answers
    right_i = pg.evaluate("__viewer.state.lesson.steps[0].ask.answer")
    wrong_i = 0 if right_i != 0 else 1
    pg.locator("#lesson button.choice").nth(wrong_i).tap(); pg.wait_for_timeout(150)
    check("wrong: Try again, Next locked", "Try again" in s.text("#lesson .askline") and pg.locator(NEXT).is_disabled())
    for i in range(n):
        a = pg.evaluate(f"__viewer.state.lesson.steps[{i}].ask.answer")
        pg.locator("#lesson button.choice").nth(a).tap(); pg.wait_for_timeout(150)
        if i < n - 1: pg.locator(NEXT).tap(); pg.wait_for_timeout(300)
    check("last board: Finish", pg.locator(NEXT).inner_text() == "Finish ✓")
    pg.locator(NEXT).tap(); pg.wait_for_timeout(300)
    check("finishing: Round finished, no bar, nothing stored", "Round finished" in s.text("#toast") and pg.locator("#lesson").is_hidden() and pg.evaluate("localStorage.getItem('chess-views:lessons')") == before, pg.evaluate("localStorage.getItem('chess-views:lessons')"))
    # --- every view is open in a round
    s.goto(BASE, "lesson=recognise&seed=7&step=2", settle=600)
    check("a round link opens at its step", "2 of 5" in s.text("#lesson-count"))
    check("no view is locked in a round", pg.locator(".tabs [role=tab].locked").count() == 0)
    # --- Review Focus 3: bad seeds
    for h in ("lesson=recognise&step=1", "lesson=recognise&seed=abc&step=1", "lesson=recognise&seed=-1&step=1", "lesson=recognise&seed=&step=1", "lesson=recognise&seed=7&step=9"):
        s.goto(BASE, h, settle=600)
        check(f"bad link {h}: toast, no bar", "That lesson is not here" in s.text("#toast") and pg.locator("#lesson").is_hidden(), s.text("#toast"))
    check("no page errors", not s.errs, " | ".join(s.errs)[:300])
    s.close()

run(main)
