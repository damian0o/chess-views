"""Roads: a rook, bishop or queen's road runs to the first piece and ends on an enemy it hits."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check, run, base_arg

BASE = base_arg()
SCHOLAR = "r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2B1P3%2F8%2FPPPP1PPP%2FRNB1K1NR+b+KQkq+-+3+3"

def main(pw):
    s = Session(pw); pg = s.page
    s.goto(BASE, f"fen={SCHOLAR}&view=roads", settle=500)
    titles = pg.evaluate("[...document.querySelectorAll('.roadwrap line.ray title')].map(t => t.textContent)")
    check("every road belongs to a rook, bishop or queen", titles and all(t.split(' ')[0] in ('rook', 'bishop', 'queen') for t in titles), str(titles[:3]))
    check("bishop c4 runs d5 e6 f7 and hits f7", "bishop c4: d5 e6 f7 (hits f7)" in titles)
    check("queen h5 runs g6 f7 and hits f7", "queen h5: g6 f7 (hits f7)" in titles)
    check("queen h5 along the rank ends on the e5 pawn", "queen h5: g5 f5 e5 (hits e5)" in titles)
    check("no road runs through a piece", not any("e8" in t and "h5" in t for t in titles))
    check("rings mark the pieces hit", pg.locator(".roadwrap circle.hitring").count() >= 3)
    rings = pg.evaluate("Object.fromEntries([...document.querySelectorAll('.roadwrap circle.hitring')].map(c => [c.querySelector('title').textContent.split(':')[0], { w: c.getAttribute('stroke-width'), a: c.dataset.attackers, d: c.dataset.defenders, cls: c.getAttribute('class') }]))")
    check("f7 ring: two attackers, the king cannot take back: thick and solid", rings.get("f7", {}).get("a") == "2" and rings["f7"]["d"] == "0" and rings["f7"]["w"] == "0.18" and "free" in rings["f7"]["cls"], str(rings.get("f7")))
    check("e5 ring: one attacker, defended at least as much, thin and dotted", rings.get("e5", {}).get("a") == "1" and int(rings["e5"]["d"]) >= 1 and rings["e5"]["w"] == "0.08" and "held" in rings["e5"]["cls"], str(rings.get("e5")))
    check("ring titles name attackers and defenders", pg.evaluate("[...document.querySelectorAll('.roadwrap circle.hitring title')].some(t => t.textContent === 'f7: attacked by queen h5, bishop c4, defended by nobody (the king on e8 cannot take back: an attacker would still hit f7)')"))
    check("one ring per piece attacked, not per road", len(rings) == pg.locator(".roadwrap circle.hitring").count())
    # with ...Qe7 defending, f7 is two against two: thin and dotted
    s.goto(BASE, "fen=r1b1kbnr%2Fppppqppp%2F2n5%2F4p2Q%2F2B1P3%2F8%2FPPPP1PPP%2FRNB1K1NR+b+KQkq+-+3+3&view=roads", settle=500)
    r = pg.evaluate("(() => { const c = [...document.querySelectorAll('.roadwrap circle.hitring')].find(c => c.querySelector('title').textContent.startsWith('f7:')); return c && { w: c.getAttribute('stroke-width'), a: c.dataset.attackers, d: c.dataset.defenders, cls: c.getAttribute('class') }; })()")
    # the user's position: d4 added, e5 hit by queen and pawn, held by the knight; f7 only by the king
    s.goto(BASE, "fen=r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2BPP3%2F8%2FPPP2PPP%2FRNB1K1NR+w+KQkq+-+3+3&view=roads", settle=500)
    rr = pg.evaluate("Object.fromEntries([...document.querySelectorAll('.roadwrap circle.hitring')].map(c => [c.querySelector('title').textContent.split(':')[0], c.getAttribute('class') + ' ' + c.getAttribute('stroke-width')]))")
    check("e5 and f7 now look different: e5 cut, f7 solid and thick", "contested" in rr.get("e5", "") and "free" in rr.get("f7", "") and rr["e5"] != rr["f7"], str(rr))
    s.goto(BASE, "fen=r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2BPP3%2F8%2FPPP2PPP%2FRNB1K1NR+b+KQkq+-+3+3&view=roads", settle=500)
    d4 = pg.evaluate("(() => { const c = [...document.querySelectorAll('.roadwrap circle.hitring')].find(c => c.querySelector('title').textContent.startsWith('d4:')); return c && { cls: c.getAttribute('class'), t: c.querySelector('title').textContent }; })()")
    check("d4, hit by a knight and a pawn, gets a red ring: free, thick", d4 and "by-b" in d4["cls"] and "free" in d4["cls"] and "knight c6" in d4["t"] and "pawn e5" in d4["t"], str(d4))
    s.tap("c6"); pg.wait_for_timeout(200)
    only = pg.evaluate("[...document.querySelectorAll('.roadwrap circle.hitring title')].map(t => t.textContent.split(':')[0]).sort()")
    check("tapping the knight: rings only on what it attacks", only == ["d4"], str(only))
    s.tap("c6"); pg.wait_for_timeout(150)
    check("f7 defended twice (queen, then the king last): thin dotted ring", r and r["a"] == "2" and r["d"] == "2" and r["w"] == "0.08" and "held" in r["cls"], str(r))
    s.goto(BASE, f"fen={SCHOLAR}&view=roads", settle=500)
    marks = pg.evaluate("[...document.querySelectorAll('.roadwrap g.pawnguard')].map(g => g.dataset.square + ':' + g.getAttribute('class')).sort()")
    check("pawn-guarded road squares carry an x in the pawn's colour", marks == ["a3:pawnguard by-w", "a6:pawnguard by-b", "e6:pawnguard by-b", "g6:pawnguard by-b", "h6:pawnguard by-b"], str(marks))
    # the f7 pawn is pinned to its king by the queen on h5, so only d7 guards e6
    check("the x explains itself and respects pins", pg.evaluate("[...document.querySelectorAll('.roadwrap g.pawnguard title')].some(t => t.textContent === 'e6: a black pawn (d7) would take a piece landing here')"))
    summ = s.summary()
    check("summary names the crossing on f7", "Two roads meet on f7 (White: bishop c4, queen h5)" in summ and "e2 (" not in summ, summ[:200])
    check("no open files after 1.e4 e5", "Open files: none" in summ)
    s.tap("h5"); pg.wait_for_timeout(200)
    titles = pg.evaluate("[...document.querySelectorAll('.roadwrap line.ray title')].map(t => t.textContent)")
    check("tapping the queen: only her guarded squares are marked", pg.evaluate("[...document.querySelectorAll('.roadwrap g.pawnguard')].map(g => g.dataset.square).sort()") == ["g6", "h6"])
    check("tapping the queen shows only her five roads", titles and all(t.startswith("queen h5:") for t in titles) and len(titles) == 5, str(len(titles)))
    check("queen summary counts roads and squares and what they hit", "White queen on h5: 5 roads, 13 squares" in s.summary() and "pawn f7" in s.summary(), s.summary()[:160])
    s.tap("h5"); pg.wait_for_timeout(200)
    check("tapping again shows every road", len(pg.evaluate("[...document.querySelectorAll('.roadwrap line.ray')]")) > 5)
    # open file shading and the start position
    s.goto(BASE, "fen=r3k2r%2F8%2F8%2F8%2F8%2F8%2F8%2FR3K2R+w+KQkq+-+0+1&view=roads", settle=400)
    check("open files are shaded", pg.locator(".roadwrap .board .sq.openline").count() == 64)
    s.goto(BASE, "view=roads", settle=400)
    check("start position: no roads, knights' dots remain", pg.locator(".roadwrap line.ray").count() == 0 and pg.locator(".roadwrap circle.jump").count() == 8)
    check("start position summary", "White's roads reach 0 squares" in s.summary() and "No two roads of one side meet on an enemy piece yet" in s.summary(), s.summary()[:120])
    check("no horizontal overflow at 390px", pg.evaluate("document.documentElement.scrollWidth") == 390)
    check("no page errors", not s.errs, " | ".join(s.errs)[:300])
    s.close()

run(main)
