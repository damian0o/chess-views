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
    for h in ("lesson=nope&step=3", "lesson=scholars-mate&step=99", "lesson=scholars-mate&step=2.5", "lesson=scholars-mate&step=abc"):
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
    rect = pg.evaluate("(() => { const r = document.querySelector('.tabs [role=tab].wanted').getBoundingClientRect(); return [r.left, r.right]; })()")
    check("the wanted tab is scrolled into view on a phone", 0 <= rect[0] and rect[1] <= 390, str(rect))
    s.tab("Shapes", force=True)
    check("tapping a locked tab: stays in Board and toasts", pg.evaluate("__viewer.state.tab") == "board" and "Finish the lesson to open this" in s.text("#toast"), s.text("#toast"))
    s.tab("King houses"); pg.locator(NEXT).tap(); s.tab("Roads"); pg.locator(NEXT).tap(); s.tab("Shapes"); pg.locator(NEXT).tap(); pg.wait_for_timeout(200)
    opened = pg.evaluate("[...document.querySelectorAll('.tabs [role=tab]:not(.locked)')].map(b => b.textContent.trim())")
    check("by step 5 Roads and Shapes are open, Territory wanted", "Roads" in opened and "Shapes" in opened and "Territory" in opened and "Knight" not in opened, str(opened))
    s.close()
    s = Session(pw, init_script="try { localStorage.setItem('chess-views:lessons', JSON.stringify({ 'scholars-mate': { step: 17, done: true } })); } catch {}"); pg = s.page
    s.goto(BASE, "lesson=scholars-mate&step=2", settle=600)
    check("a finished lesson leaves every tab open", pg.locator(".tabs [role=tab].locked").count() == 0 and not pg.locator("#lesson").is_hidden())
    s.close()
    # --- Task 6: the Lessons shelf, saved progress, Finish
    s = Session(pw); pg = s.page
    s.goto(BASE, "", settle=400)
    pg.keyboard.press("p"); pg.wait_for_timeout(300)
    card = pg.locator("#liblessons .lesson-card", has_text="Scholar's mate")
    check("library: lessons shelf with the card", card.count() == 1 and pg.locator("#liblessons .lesson-card:not(.round)").count() == 2 and "Scholar's mate" in card.inner_text() and "17 steps" in card.inner_text() and card.locator("button.start").inner_text() == "Start", card.inner_text()[:120] if card.count() else "no card")
    pg.fill("#libsearch", "scholar"); pg.wait_for_timeout(200)
    check("search keeps the card", pg.locator("#liblessons .lesson-card", has_text="Scholar's mate").count() == 1 and pg.locator(".libitem").count() >= 1)
    pg.fill("#libsearch", "lucena"); pg.wait_for_timeout(200)
    check("search hides the card and keeps the position", pg.locator("#liblessons .lesson-card", has_text="Scholar's mate").count() == 0 and pg.locator(".libitem").count() == 1)
    pg.fill("#libsearch", ""); pg.locator("#libtags button", has_text="endgame").tap(); pg.wait_for_timeout(200)
    check("a tag chip leaves the card alone", pg.locator("#liblessons .lesson-card", has_text="Scholar's mate").count() == 1)
    pg.locator("#libtags button", has_text="endgame").tap(); card.locator("button.start").tap(); pg.wait_for_timeout(400)
    check("Start opens step 1 in Board and closes the dialog", "1 of 17" in s.text("#lesson-count") and pg.evaluate("__viewer.state.tab") == "board" and not pg.evaluate("document.getElementById('library').open"))
    pg.evaluate("__viewer.gotoStep(11)"); pg.wait_for_timeout(200); s.tab("Board"); pg.locator("#next").tap(); pg.wait_for_timeout(200); pg.locator(NEXT).tap(); pg.wait_for_timeout(300)
    check("a gated Shapes step opens in Shapes with the pieces hidden", "12 of 17" in s.text("#lesson-count") and pg.evaluate("__viewer.state.tab") == "shapes" and pg.evaluate("__viewer.state.shapesReveal") is False and pg.locator("#view .shape").count() > 0 and pg.locator("#view .piece").count() == 0, f"tab={pg.evaluate('__viewer.state.tab')} shapes={pg.locator('#view .shape').count()} pieces={pg.locator('#view .piece').count()}")
    check("its gate waits for Reveal pieces", pg.locator(NEXT).inner_text() == "Press Reveal pieces first")
    check("no horizontal overflow with the long gate label", pg.evaluate("document.documentElement.scrollWidth") == 390)
    pg.evaluate("__viewer.gotoStep(17)"); pg.wait_for_timeout(200)
    check("step 17: Next asks for Roads first", pg.locator(NEXT).inner_text() == "Open Roads first")
    s.tab("Roads")
    check("step 17 in Roads: Finish", pg.locator(NEXT).is_enabled() and pg.locator(NEXT).inner_text() == "Finish ✓")
    pg.locator(NEXT).tap(); pg.wait_for_timeout(300)
    saved = pg.evaluate("JSON.parse(localStorage.getItem('chess-views:lessons'))")
    check("Finish: toast, bar gone, tabs open, done saved", "Lesson finished" in s.text("#toast") and pg.locator("#lesson").is_hidden() and pg.locator(".tabs [role=tab].locked").count() == 0 and saved["scholars-mate"]["done"] is True and saved["scholars-mate"]["step"] == 17, str(saved))
    s.goto(BASE, "", settle=400); pg.keyboard.press("p"); pg.wait_for_timeout(300)
    card = pg.locator("#liblessons .lesson-card", has_text="Scholar's mate")
    check("after reload: finished tick and Continue", "✓ finished" in card.inner_text() and card.locator("button.start").inner_text() == "Continue" and card.locator("button.startover").count() == 1, card.inner_text()[:120])
    card.locator("button.startover").tap(); pg.wait_for_timeout(200)
    card = pg.locator("#liblessons .lesson-card", has_text="Scholar's mate")
    check("Start over: back to Start, record gone", card.locator("button.start").inner_text() == "Start" and card.locator("button.startover").count() == 0 and pg.evaluate("localStorage.getItem('chess-views:lessons')") in (None, "{}"))
    pg.evaluate("localStorage.setItem('chess-views:lessons', JSON.stringify({ 'scholars-mate': { step: 7, done: false } }))")
    pg.keyboard.press("Escape"); pg.keyboard.press("p"); pg.wait_for_timeout(300)
    card = pg.locator("#liblessons .lesson-card", has_text="Scholar's mate")
    check("a started lesson shows step 7 of 17 and Continue", "step 7 of 17" in card.inner_text() and card.locator("button.start").inner_text() == "Continue")
    card.locator("button.start").tap(); pg.wait_for_timeout(400)
    check("Continue opens step 7", "7 of 17" in s.text("#lesson-count"))
    check("no page errors (shelf)", not s.errs, " | ".join(s.errs)[:300])
    s.close()
    # Review Focus 4: a throwing storage
    s = Session(pw, init_script="Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });"); pg = s.page
    s.goto(BASE, "lesson=scholars-mate&step=1", settle=600)
    pg.locator(NEXT).tap(); s.tab("King houses"); pg.locator(NEXT).tap(); s.tab("Roads"); pg.wait_for_timeout(200)
    check("blocked storage: the lesson still runs", "3 of 17" in s.text("#lesson-count") and not s.errs, " | ".join(s.errs)[:200])
    pg.locator("#lesson-exit").tap(); pg.keyboard.press("p"); pg.wait_for_timeout(300)
    check("blocked storage: the shelf offers Start", pg.locator("#liblessons button.start").first.inner_text() == "Start")
    s.close()
    # --- the kid's own flip survives a reload; the Load box never shows a stale position in a lesson
    s = Session(pw); pg = s.page
    s.goto(BASE, "lesson=scholars-mate&step=1", settle=600)
    pg.locator("#flip").tap(); pg.wait_for_timeout(150)
    check("flipping in a lesson goes into the link", "flip=1" in pg.url, pg.url)
    pg.reload(wait_until="networkidle"); pg.wait_for_timeout(500)
    check("reloading keeps the board turned", pg.evaluate("__viewer.state.flipped") is True and "1 of 17" in s.text("#lesson-count"))
    pg.locator(NEXT).tap(); pg.wait_for_timeout(150)
    check("Next goes back to the step's own orientation", pg.evaluate("__viewer.state.flipped") is False and "flip=" not in pg.url, pg.url)
    s.goto(BASE, "", settle=400)
    pg.locator("#open-load").tap(); pg.locator("[data-example]").nth(0).tap(); pg.wait_for_timeout(300)
    stale = pg.locator("#input").input_value()
    pg.evaluate("__viewer.enterLesson('scholars-mate', 1)"); pg.wait_for_timeout(200)
    check("starting a lesson empties the Load box", stale != "" and pg.locator("#input").input_value() == "", repr(pg.locator("#input").input_value()[:40]))
    check("no page errors (flip, load box)", not s.errs, " | ".join(s.errs)[:200])
    s.close()
    # --- the second lesson, data only: walk all ten boards the way a kid does
    s = Session(pw); pg = s.page
    s.goto(BASE, "lesson=eyes-on-f7&step=1", settle=600)
    check("Eyes on f7: opener in Board, 1 of 21", "1 of 21" in s.text("#lesson-count") and pg.evaluate("__viewer.state.tab") == "board")
    boards_ok, answers_ok, leaks = 0, 0, []
    for i in range(10):
        pg.locator(NEXT).tap(); pg.wait_for_timeout(250)
        # the gated board opens in Shapes itself, blocks only, Next waits for the reveal
        if pg.evaluate("__viewer.state.tab") == "shapes" and pg.locator("#view .piece").count() == 0 and pg.locator("#view .shape").count() > 0 and pg.locator(NEXT).inner_text() == "Press Reveal pieces first": boards_ok += 1
        else: leaks.append((i + 1, pg.evaluate("__viewer.state.tab"), pg.locator("#view .piece").count(), pg.locator(NEXT).inner_text()))
        pg.locator("#view button.reveal").tap(); pg.wait_for_timeout(150)
        pg.locator(NEXT).tap(); pg.wait_for_timeout(250)
        want = pg.locator(NEXT).inner_text()        # "Open Roads first" / "Open Territory first"
        view = "Roads" if "Roads" in want else "Territory"
        s.tab(view)
        if pg.locator(NEXT).is_enabled(): answers_ok += 1
        if view == "Territory" and pg.locator('.board .sq.focused[data-square="f7"], .board .sq.focused[data-square="f2"]').count() != 1: leaks.append((i + 1, "no focused square"))
    check("all ten boards start as blocks with the reveal gate", boards_ok == 10, str(leaks))
    check("all ten answers open after the tab is tapped", answers_ok == 10, str(leaks))
    check("the last answer is step 21 with Finish", "21 of 21" in s.text("#lesson-count") and pg.locator(NEXT).inner_text() == "Finish ✓")
    pg.locator(NEXT).tap(); pg.wait_for_timeout(300)
    check("finishing the second lesson saves it", pg.evaluate("JSON.parse(localStorage.getItem('chess-views:lessons'))['eyes-on-f7'].done") is True)
    check("no page errors (second lesson)", not s.errs, " | ".join(s.errs)[:200])
    check("no horizontal overflow at 390px", pg.evaluate("document.documentElement.scrollWidth") == 390)
    check("no page errors", not s.errs, " | ".join(s.errs)[:300])
    s.close()

run(main)
