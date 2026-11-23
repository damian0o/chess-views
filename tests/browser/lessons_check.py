"""Lessons: the step bar, gates, hidden moves, links and leaving (plan tasks 4-6)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check, run, base_arg

BASE = base_arg()
NEXT, BACK = "#lesson-next", "#lesson-back"

def main(pw):
    s = Session(pw); pg = s.page
    # --- entering, step 1, Next/Back
    s.goto(BASE, "lesson=scholars-mate&step=1", settle=600)
    check("bar visible with 1 of 17", not pg.locator("#lesson").is_hidden() and "1 of 17" in s.text("#lesson-count"), s.text("#lesson-count"))
    check("step 1 opens in Board", pg.evaluate("__viewer.state.tab") == "board")
    check("Next enabled, Back disabled on step 1", pg.locator(NEXT).is_enabled() and pg.locator(NEXT).inner_text() == "Next ▶" and pg.locator(BACK).is_disabled())
    check("hash carries only the lesson", "lesson=scholars-mate" in pg.url and "step=1" in pg.url and "pgn=" not in pg.url)
    # --- step 2: the view gate
    pg.locator(NEXT).tap(); pg.wait_for_timeout(200)
    check("step 2: view not switched, Next asks for King houses", "step=2" in pg.url and pg.evaluate("__viewer.state.tab") == "board" and pg.locator(NEXT).is_disabled() and pg.locator(NEXT).inner_text() == "Open King houses first", pg.locator(NEXT).inner_text())
    s.tab("King houses")
    check("tapping the tab opens Next", pg.locator(NEXT).is_enabled() and pg.locator(NEXT).inner_text() == "Next ▶")
    # --- steps 3-5
    pg.locator(NEXT).tap(); s.tab("Roads"); pg.locator(NEXT).tap(); s.tab("Shapes"); pg.locator(NEXT).tap(); s.tab("Territory"); pg.wait_for_timeout(200)
    check("step 5: Territory with f7 selected", "5 of 17" in s.text("#lesson-count") and pg.locator('.board .sq.focused[data-square="f7"]').count() == 1)
    # --- step 6: hidden move, reveal gate
    pg.locator(NEXT).tap(); s.tab("Board"); pg.wait_for_timeout(200)
    moves = s.text("#moves")
    check("step 6: task shown and one hidden move", "Find White's strike" in moves and moves.count("?") == 1 and "Qxf7" not in moves, moves.replace("\n", " "))
    check("step 6: Next waits for the reveal", pg.locator(NEXT).is_disabled() and pg.locator(NEXT).inner_text() == "Press ▶ first")
    pg.locator("#next").tap(); pg.wait_for_timeout(300)
    check("reveal: Qxf7# and Checkmate", "Qxf7#" in s.text("#moves") and "Checkmate" in s.text("#turn") and pg.locator(NEXT).is_enabled())
    # --- step 7 then Back (Review Focus 3)
    pg.locator(NEXT).tap(); s.tab("King houses"); pg.wait_for_timeout(200)
    check("step 7 at ply 7 in the right view", "7 of 17" in s.text("#lesson-count") and pg.evaluate("__viewer.state.ply") == 7)
    pg.locator(BACK).tap(); pg.wait_for_timeout(200)
    # the kid is still in King houses, so the view gate comes first; the move must be hidden again either way
    check("Back onto the solve step hides the move again", "6 of 17" in s.text("#lesson-count") and pg.evaluate("__viewer.state.ply") == 6 and "?" in s.text("#moves") and "Qxf7" not in s.text("#moves") and pg.locator(NEXT).is_disabled() and pg.locator(NEXT).inner_text() == "Open Board first", pg.locator(NEXT).inner_text())
    s.tab("Board"); pg.wait_for_timeout(150)
    check("back in Board the reveal gate applies", pg.locator(NEXT).inner_text() == "Press ▶ first")
    # --- reload mid-lesson (Review Focus 2)
    s.goto(BASE, "lesson=scholars-mate&step=4&view=roads", settle=600)
    check("reload keeps the kid's view and the gate", pg.evaluate("__viewer.state.tab") == "roads" and "4 of 17" in s.text("#lesson-count") and pg.locator(NEXT).is_disabled() and pg.locator(NEXT).inner_text() == "Open Shapes first")
    s.goto(BASE, "lesson=scholars-mate&step=5", settle=600)
    check("reload without a view lands in the step's view", pg.evaluate("__viewer.state.tab") == "territory" and pg.locator('.board .sq.focused[data-square="f7"]').count() == 1)
    # --- bad links (Review Focus 5)
    for h in ("lesson=nope&step=3", "lesson=scholars-mate&step=99"):
        s.goto(BASE, h, settle=600)
        check(f"bad link {h}: toast, no bar, start position", "That lesson is not here" in s.text("#toast") and pg.locator("#lesson").is_hidden() and pg.evaluate("__viewer.state.chess.fen()").startswith("rnbqkbnr/pppppppp"), s.text("#toast"))
    # --- leaving
    s.goto(BASE, "lesson=scholars-mate&step=3", settle=600)
    pg.locator("#lesson-exit").tap(); pg.wait_for_timeout(200)
    check("exit hides the bar, keeps the position, cleans the link", pg.locator("#lesson").is_hidden() and "lesson=" not in pg.url and pg.evaluate("__viewer.state.ply") == 5)
    s.goto(BASE, "lesson=scholars-mate&step=3", settle=600)
    pg.locator("#open-load").tap(); pg.locator("[data-example]").nth(0).tap(); pg.wait_for_timeout(300)
    check("loading another position leaves the lesson", pg.locator("#lesson").is_hidden() and "lesson=" not in pg.url)
    # --- Task 5: locked tabs
    s.goto(BASE, "lesson=scholars-mate&step=1", settle=600); pg.locator(NEXT).tap(); pg.wait_for_timeout(200)   # reach step 2 as a kid does: still in Board
    locked = pg.evaluate("[...document.querySelectorAll('.tabs [role=tab].locked')].map(b => b.textContent.replace('🔒','').trim())")
    check("step 2: every view the lesson has not opened is locked", sorted(locked) == sorted(["Territory", "Reach", "Roads", "Engine", "Diamond", "Shapes", "Knight"]), str(locked))
    check("locked tabs are aria-disabled", pg.evaluate("[...document.querySelectorAll('.tabs [role=tab].locked')].every(b => b.getAttribute('aria-disabled') === 'true')"))
    check("King houses is the wanted tab", pg.locator(".tabs [role=tab].wanted").count() == 1 and "King houses" in pg.locator(".tabs [role=tab].wanted").inner_text())
    s.tab("Shapes", force=True)
    check("tapping a locked tab: stays in Board and toasts", pg.evaluate("__viewer.state.tab") == "board" and "Finish the lesson to open this" in s.text("#toast"), s.text("#toast"))
    s.tab("King houses"); pg.locator(NEXT).tap(); s.tab("Roads"); pg.locator(NEXT).tap(); s.tab("Shapes"); pg.locator(NEXT).tap(); pg.wait_for_timeout(200)
    opened = pg.evaluate("[...document.querySelectorAll('.tabs [role=tab]:not(.locked)')].map(b => b.textContent.trim())")
    check("by step 5 Roads and Shapes are open, Territory wanted", "Roads" in opened and "Shapes" in opened and "Territory" in opened and "Knight" not in opened, str(opened))
    s.close()
    s = Session(pw, init_script="try { localStorage.setItem('chess-views:lessons', JSON.stringify({ 'scholars-mate': { step: 17, done: true } })); } catch {}"); pg = s.page
    s.goto(BASE, "lesson=scholars-mate&step=2", settle=600)
    check("a finished lesson leaves every tab open", pg.locator(".tabs [role=tab].locked").count() == 0 and not pg.locator("#lesson").is_hidden())
    check("no horizontal overflow at 390px", pg.evaluate("document.documentElement.scrollWidth") == 390)
    check("no page errors", not s.errs, " | ".join(s.errs)[:300])
    s.close()

run(main)
