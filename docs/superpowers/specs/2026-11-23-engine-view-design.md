# Engine view and evaluation toggle: design

Date: 2026-11-23. Status: draft for approval.

## Intent

Chess Views is a viewer: eight lenses on one position, for an 8-year-old
learning strategy and the parent helping. Stockfish is now vendored
(`engine/`, wrapped by `engine.js`). This design adds the engine as a
*reference opinion* about the position on screen, in the same spirit as
the Territory marks or the King houses score: never as an opponent.

The centre is an exercise, not a lookup. The kid has a move in mind, taps
it, and only then learns how good it was and what the better moves were.
The engine's own answer is the reveal, not the headline.

## Goals

- A new **Engine** view: guess the best move in the current position, get a
  graded answer in kid words, see the few good moves, and, with a loaded
  game, what was actually played.
- An **evaluation line** (bar + words) on the Board view behind a toggle,
  quiet by default.
- Everything stays a static page: no build step, no new dependencies, the
  engine starts only when one of the two features is used.

## Non-goals (this round)

- Playing against the engine: no game loop, no levels, no clocks.
- Grades in the move list of a loaded game (the "C" step; it reuses this
  work later).
- Engine help in Diamond, Shapes and Knight (seeing exercises).
- Engine lines beyond the first move, text explanations of *why* a move is
  good, opening names, persistent scores of the kid's guesses.
- Any change to the print sheet.

## Anti-goals

- Showing the engine's move before the kid committed to a guess. The view
  must not leak it, not even as a tinted square.
- Raw numbers as the main message. A kid reads "+1.3" as nothing. Words
  first, the number small, for the parent.
- A single "best move" presented as the only right answer. Show the two or
  three moves that are about as good.

## Constraints

- Static folder on GitHub Pages, also to move to other static hosts later.
  Same-origin engine files; no CDN for the engine.
- No npm dependencies; unit tests with `node --test`; browser checks with
  Playwright against `python3 -m http.server` and against the live site.
- Works on a phone (390 px wide) with touch; the long-press legal-move dots
  already work there.
- New modules imported by `index.html` get a content stamp (`npm run
  stamp`, enforced by a test), so a cached old module never meets a new page.
- The engine is single-threaded WebAssembly; keep every search well under a
  second on a phone. The vendored loader needs no special headers.
- Stockfish reports scores from the side to move; mate scores as "mate N".

## Approaches considered

1. **A dedicated Engine view plus a Board toggle** (chosen). One tab is one
   lens, which is how the app already works; the Board toggle is the same
   evaluation line reused. Smallest surface, nothing else changes.
2. A "coach layer" available in every board-shaped view (grading dots in
   the long-press overlay everywhere, threat arrows in King houses). More
   powerful, but it touches five views and blurs what each tab is for. The
   user asked to keep this a simple views app. Rejected for this round;
   the Engine view's parts are built so a later layer can reuse them.
3. Grading by two searches (search the position after the kid's move and
   compare with the best line) instead of one MultiPV search. Slower and
   mixes depths; MultiPV scores every legal move in one go at the same
   depth. Rejected, with one allowance noted under Performance.

## The Engine view

A new entry `engine` in the views registry, tab title **Engine**, placed
after King houses and before Diamond.

### Layout

```
 [Board] [Territory] [Reach] [Roads] [King houses] [Engine] [Diamond] …
 ┌──────────────────┐
 │      board       │   same board grid as the Board view; arrows are an
 │                  │   SVG overlay like the Territory lines
 └──────────────────┘
 ▮▮▮▮▮▮▯▯▯▯  White is a little better (+0.6)
 Tap a piece, then a square, to guess the best move.          [Show me]
 (legend, as in other views)
```

The evaluation line is shown from the start: it does not leak the move.

### States

1. **Thinking.** Engine not yet answered for this position: the bar is grey,
   the words say "Thinking…". Taps are still accepted; the reveal waits for
   the analysis.
2. **Waiting for a guess.** Prompt text as above. Tapping one of the
   side-to-move's pieces shows its legal moves as the existing dots (the same
   overlay as the long-press, but on a plain tap in this view). Tapping a dot
   makes the guess; tapping elsewhere clears the dots. Promotion is always
   to a queen. Pieces of the side not to move do nothing except a short
   status hint "It is White's move".
3. **Revealed.** The board draws arrows for the best moves (see Reveal). The
   summary gives the grade and, with a loaded game, the played move. Buttons:
   **Try another** (back to state 2, same position) and, when a game is
   loaded, the usual ▶ which also resets the guess.
4. **Shown.** "Show me" from state 2 goes straight to the reveal with the
   words "Here is what the engine likes:" and no grade. It is a pass, not a
   wrong answer, and nothing is counted anywhere.
5. **No engine.** If the Worker fails to start (old browser, blocked wasm),
   the view shows the board and one line: "The engine could not start in
   this browser." with no further controls. The rest of the app is unaffected.
6. **Nothing to guess.** Checkmate, stalemate, or a position chess.js will
   not validate (no king, a king in check on the wrong turn, pawns on the
   back rank, as pasted FENs can be): the view shows the board, the status
   line already says what is wrong, and the engine is not asked. The engine
   only ever receives positions that chess.js accepts without
   `skipValidation` and that have at least one legal move.
7. **No answer.** If a search times out (10 s) or the Worker dies, the view
   says "The engine did not answer." with a **Try again** button, which
   terminates the Worker and starts a fresh one. The cache survives, so
   earlier positions still show instantly.

Changing the position (slider, flip, a new load, another library entry)
returns the view to state 1 or 2. Flip keeps a pending guess state but
redraws.

### Reveal

- Arrows for the top three moves whose score is within 0.5 pawn of the
  best (so a position with one clear move shows one arrow): the best is
  thickest, then thinner. Colour: the pen-blue of the app for White's
  moves, pen-red for Black's (the side to move), as the Roads view does.
- The kid's guess is drawn too, in the focus yellow, when it is not among
  the arrows, so they see where it went.
- Summary line, one sentence plus the list:
  `Your move Nf3: Good. Best: Bc4, then Nf3, d4.`
  With a loaded game and the next move known:
  `In the game Morphy played Bxf7+ (Best).` The player name comes from the
  PGN White/Black header if present, otherwise "White"/"Black". The
  played move's grade comes from the same all-moves analysis. The Opera
  game entry in `positions.json` gains `[White "Morphy"]` and
  `[Black "Duke of Brunswick and Count Isouard"]` headers so the example
  reads as written; the `#pos=opera-game` link and its ply are unchanged.
- In **solve mode** (library problems with hidden moves) the stored line is
  the authority, but only on the solver's plies: the side to move at ply 0
  of the problem. There the guess is compared with the stored next move,
  "That's it!" or "Not the key. The answer is Rf1.", and "Show me" reveals
  the stored key. On the opponent's plies there is no guess prompt; the
  summary says "Press ▶ for Black's reply", because a defence is one of
  many and not something to guess. The engine arrows are still drawn after
  a reveal, labelled "Engine:" in the summary, because the engine may find
  a different, longer mate; a mate found by the engine never counts as
  "Not the key" when it is the stored move.

### Grading

Grades compare the guessed move's score with the best move's score, both
from the mover's point of view, both from the same MultiPV search:

| Loss against best        | Words                         |
|--------------------------|-------------------------------|
| best move itself         | Best!                         |
| ≤ 0.20 pawn              | Just as good                  |
| ≤ 0.50 pawn              | Good                          |
| ≤ 1.50 pawn              | Okay, but there was better    |
| > 1.50 pawn              | Oops, that loses something    |

Mates override the table: if the best move mates and the guess does not,
"You missed a mate in N"; if the guess lets the opponent mate, "Oops, that
allows mate in N"; if the guess also mates, "Best!" even when longer.
Scores of "mate N" are treated as ±(100 − N) pawns for ordering.

A guess that is not a legal move cannot happen (dots only). The number
shown small after the grade is the loss, e.g. "(−0.4)".

### Evaluation words

From the best line's score, converted to White's point of view:

| White's score s (pawns)  | Words                         |
|--------------------------|-------------------------------|
| mate                     | White mates in N / Black mates in N |
| s ≥ 3.0                  | White is winning              |
| 1.2 ≤ s < 3.0            | White is better               |
| 0.4 ≤ s < 1.2            | White is a little better      |
| −0.4 < s < 0.4           | Equal                         |
| symmetric for Black      | Black is a little better, …   |

The bar is a horizontal strip, white share from the left, computed as
`50 + 50 · tanh(s / 4)` percent, full for mates. The number follows in
brackets with one decimal and a sign, for the parent.

## Board view toggle

A checkbox **Engine evaluation** in the Board view's control row, next to
"Copy as text" and "Print". On, it adds the same evaluation line (bar +
words + number) under the board, in the thinking state until the engine
answers. The setting travels in the link as `eval=1`, like `flip`. Off by
default. Turning it on starts the engine if it is not running. The print
sheet ignores it.

## Engine use

- One engine instance per page, created lazily by whichever feature first
  needs it, kept for the session.
- The Engine view runs one analysis per position: `go depth 10` with
  `MultiPV` set to the number of legal moves (chess.js gives the count) so
  every move, including the guess and the played move, gets a score at the
  same depth. Measured on 2026-11-23 with the vendored engine on a laptop:
  all legal moves at depth 10 take 70–310 ms in positions with 20 to 49
  legal moves (depth 12: up to 1.3 s), so depth 10 fits the budget below
  with room for a phone being three to four times slower. There is no
  MultiPV-3 fallback.
- The Board toggle needs only the best line: it runs `go depth 10` with
  MultiPV 1, which takes about 25 ms. The cache is keyed by FEN and keeps
  the richest result: an all-moves analysis also serves the toggle, and a
  MultiPV-1 result is replaced when the Engine view later asks for more.
- Budget: the reveal within 1.5 s and the first evaluation within 1 s on a
  phone. The stand-in for the phone is Playwright's Chromium with CPU
  throttling at 4× (the DevTools `Emulation.setCPUThrottlingRate`), run in
  the browser checks; one manual check on the family's phone before merge.
- A new analysis cancels a running one (`stop`) and the stale answer is
  drained, as `engine.js` already does for timeouts.
- `engine.js` gains an `analyse(fen, { depth, multipv })` returning the
  scored move list; the pure parts (parsing `info` lines, converting
  scores, grading, words, bar width) live in a new `coach.js` with unit
  tests that need no engine.

## URL and state

- `view=engine` selects the view as for any other tab.
- `eval=1` turns the Board evaluation on. No other new parameters: a guess
  is not persisted; reloading lands in the waiting state.

## Accessibility and copy

- The bar has `role="img"` with the words as its label; the words are
  real text.
- Arrows have `<title>` elements with the move in SAN.
- Copy stays in the app's voice: short, plain, no exclamation marks except
  "Best!" and "That's it!".

## Documentation and tests

- README: a paragraph for the Engine view in "The views", the toggle in
  "How to use", and `coach.js` in the stamp note.
- Unit tests: score conversion (side to move → White; mate), grading table
  edges, evaluation words edges, bar width, `info` line parsing with
  MultiPV, solve-mode comparison against a stored line.
- Browser checks: the view renders in all five states on a phone-sized
  viewport, no move leaks before a guess (no arrow and no tinted square
  present in the DOM), a correct guess grades "Best!", a bad one grades
  "Oops", "Show me" reveals without a grade, the game line names the
  player, solve mode compares with the stored key, the Board toggle round-
  trips through the link, and nothing changes when the engine is absent
  (simulate by blocking the Worker URL).

## Left to the builder

- Arrow geometry and thickness steps; reuse the overlay approach of the
  Territory lines.
- How the tap-to-guess shares code with the long-press legal-move overlay.
- The order of cache eviction, if the FEN cache needs a cap.
- Wording of the "no engine" line and the thinking state's exact look.
