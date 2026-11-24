# Chess Views

A single static page that reads a chess position exported from lichess and
shows it in eight learning views. Made for an 8-year-old learning strategy and
a parent helping, with a board that is easy to copy onto squared paper.

Live: https://damian0o.github.io/chess-views/ (GitHub Pages from `main`).

The page is laid out like an app: the board comes first under a sticky bar
(flip, letters, share link, Load), the views are a row of pills, and a loaded
game gets player controls pinned to the bottom of the screen. It works on a
phone as well as a desktop.

## Pieces

On screen the board uses the standard piece images (the cburnett set by
Colin M.L. Burnett, CC BY-SA 3.0, as shipped with chessground). Tick
"Letters for paper" to switch every view to one-character symbols that fit
in a tiny paper square; the print sheet always uses them:

| Piece  | White | Black |
|--------|-------|-------|
| King   | `K`   | `K'`  |
| Queen  | `Q`   | `Q'`  |
| Rook   | `R`   | `R'`  |
| Bishop | `B`   | `B'`  |
| Knight | `N`   | `N'`  |
| Pawn   | `o`   | `x`   |

Empty dark squares get a dot. The rule for the kid: capitals are pieces,
`'` means black, `o` is a white pawn, `x` a black pawn, a1 is dark.

## Positions library

The book icon in the top bar (or the `p` key) opens the built-in library:
some twenty named positions with a note, tags and the view they are best seen in,
from the start position and basic mates to pawn structures, the king-trap
study and Morphy's Opera game. Pick one and the app loads it in that view.
A link of the form `#pos=<id>` opens an entry directly, for example
`#pos=lucena`.

Entries tagged `problem` are composed chess problems (the first one is the
mate in three from NM ZugAddict's post "Are you rated 1600? Good."). They
open in solve mode: the move list shows the task and a row of `?` instead
of the moves, so the answer stays hidden until you step forward with ▶.
The idea follows the post's advice: set the position up on a real board,
think, and only then check. Solve mode travels in the link as `solve=1`.

The library is the file `positions.json`. To add a position, append an
entry with an `id`, `name`, `note`, `tags`, `view` and either a six-field
`fen` or a `pgn` with a `ply` (a `pgn` may start from its own position with
`[FEN "..."]` and `[SetUp "1"]` headers; the `Event` header is shown as
the task in solve mode); `npm test` validates every entry (fields,
FEN shape, one king per side). Positions are never saved in the browser:
the collection is curated in the repo and published with the page. The one
thing the page remembers on a device is lesson progress (below).

## Lessons

A lesson is a path through the views: one idea shown as a weak square, as
roads, as a shape of blocks and as a count on one square, in a fixed order,
with the kid moving themselves. Open the library and the Lessons shelf is
at the top; Start opens step 1.

- A **step bar** under the tabs shows the lesson name, "step 3 of 17", one
  or two sentences, Back and Next. Each step names the view to open, in
  bold; the tab pulses, and Next waits ("Open Roads first") until the kid
  taps it. Steps that say "find it, then press ▶" hide the moves like a
  library problem, and Next waits for the reveal; steps in Shapes may wait
  for "Reveal pieces".
- **Locked tabs**: while a lesson is open, only the views it has introduced
  so far can be opened; the others show a lock and say "Finish the lesson
  to open this". Finishing, or leaving with ✕, unlocks everything.
- **Progress on the device**: the highest step reached and whether the
  lesson was finished are kept in the browser's local storage, per lesson,
  so the shelf offers "Continue from step 7", shows a tick, and "Start
  over". With storage blocked the lesson still works for the session.
- A step's link is `#lesson=scholars-mate&step=3`.

The first lesson, **Scholar's mate**, has 17 steps in three parts: make the
mate (watch the setup through King houses, Roads, Shapes and Territory,
then find the strike), stop it (defend f7 twice, then again after the
queen returns), and spot the shape (three boards shown as blocks: the same
shape by another road, the mirror against f2, and a near miss with the
queen still at home).

The second lesson, **Eyes on f7**, is a recognition drill: ten openings
from the first three or four moves, each shown as blocks first. The kid
says which two pieces aim at the square next to the king, f7 or f2, then
reveals the pieces and reads the answer in Roads or Territory: mate, fork,
nothing yet, or guarded. Yes and no boards alternate.

Lessons live in `positions.json` under `lessons`. A step has a position
(`fen`, `pgn` with `ply`, `pos` for a library entry, or `same` for the
previous step's position with an optional `ply`), a `view`, an optional
`sq`, `solve` with a `task` for a hidden move, `shapes: { gate: true }` to
wait for the reveal, `flip`, and `say` (at most two sentences, `**bold**`
for the view name). `npm test` validates every lesson.

## How to use

Press **Load** in the top bar (or the `l` key). On a phone, tap **Paste** and
the position loads straight from the clipboard; otherwise paste into the box
and press Load (or Ctrl/Cmd+Enter). The dialog also offers a few example
positions and a "Current position" chip that puts the position you are
looking at into the box for editing. It accepts:

- a FEN, even just the piece placement part;
- a PGN, including comments and variations (variations are ignored);
- a lichess analysis link such as `https://lichess.org/analysis/standard/<fen>`;
- a lichess game link such as `https://lichess.org/AbCd1234`. The PGN is
  fetched from lichess; if that fails, paste the PGN instead.

With a PGN you get a move slider and the arrow keys step through the game.
"Flip board" (or the `f` key) turns every view around to play from Black's side.
Right-click any piece (press and hold on a phone) to see its legal moves; Esc hides them.
The position, the current view and the selected square (a Territory square,
a Roads piece or the Knight square, as `sq=e4`) are kept in the URL, so you
can bookmark or share a link that lands on exactly what you see; a lesson
step is `lesson=scholars-mate&step=3`. On the
Board view, "Engine evaluation" adds a bar and a sentence ("White is a
little better (+0.6)") under the board; it is off by default and travels in
the link as `eval=1`.

## The views

- **Board**: the paper board, with "Copy as text" and "Print". Print gives you
  the position big on one page plus an empty grid to copy it into.
- **Territory**: who owns each square. `+` white, `-` black, `=` equal. The
  side with the cheapest guard owns a square (a pawn guard beats any piece,
  since whatever lands there gets taken by a pawn); when the cheapest guards
  are worth the same, the bigger attacker count wins. Pieces that can be
  taken (undefended, or attacked by something cheaper) get a dashed frame and
  an × in the taker's colour; attacked but defended pieces a dotted frame.
  Tap a square to see exactly which pieces attack it, with a line from each,
  why it is owned, and whether a capture there would be check or mate.
- **Reach**: every piece shows how many squares it can move to right now
  (pawns: the squares they attack). A stalemate watch warns when the other
  side is out of moves and lists which moves would stalemate.
- **Roads**: every rook, bishop and queen's roads, drawn as far as the piece
  can actually go: up to the first piece in the way, ending with a ring on an
  enemy piece it hits. The ring is thicker the more the attackers outnumber
  the defenders, cut when the piece is defended, and thin and dotted when the
  defenders match or outnumber the attackers. Blue for White's pieces, red for Black's. The summary
  says where two roads of one side meet, the sign of a target. Open files
  (no pawns on them) are shaded as the rooks' highway. Passed pawns get a
  star and their path to promotion. Small dots mark the squares a knight can
  jump to right now. Click a piece or pawn to see only its roads, or a knight
  to see its four tracks.
- **King houses**: the 3×3 zone around each king coloured by how well each
  square is held, with the shield pawns, open files next to the king, the
  pieces aiming at the house and the pieces defending it, a Strong / Shaky /
  In danger label with its score explained, and the weakest square with how
  many more attackers the opponent needs to break in. Red arrows show the
  pressure, orange lines show pins, dashed circles the king's escape squares.
- **Engine**: guess the best move. Tap a piece, then a square; only then
  does Stockfish say how good it was ("Best!", "Just as good", "Good",
  "Okay, but there was better", "Oops, that loses something", or the mate
  you missed or allowed) and draw the two or three good moves as arrows,
  thickest first. With a loaded game it also says what was actually played
  and grades that. Library problems are checked against their stored key
  instead. "Show me" reveals without a grade. Nothing engine-chosen is shown
  before you commit to a move.
- **Diamond**: the board turned 45°, so diagonals are straight lines and each
  row is one colour.
- **Shapes**: the chunking exercise from "How Masters See the Board": pieces
  become squares (sized by value, or all the same), optionally boxed into
  groups of touching pieces per wing. Look, say what each square is, then
  press Reveal pieces.
- **Knight**: a knight's four straight tracks with hop numbers; click any
  square to move the knight there, and toggle hop counts for every square.

## Run locally

Browsers block ES modules from `file://`, so serve the folder:

```
python3 -m http.server 8080
```

then open http://localhost:8080/.

## Tests

The analysis functions in `analysis.js` and the pure modules `coach.js`,
`engine.js` and `lessons.js` have unit tests that need only Node 20+:

```
node --test
```

The browser checks under `tests/browser/` drive the served page with
Playwright on a throttled phone-sized viewport; see `tests/browser/README.md`:

```
python3 -m http.server 8080
python3 tests/browser/run.py http://localhost:8080/
```

## Deploy on GitHub Pages

1. Push this repository to GitHub.
2. Settings → Pages → Build and deployment → Source: "Deploy from a branch".
3. Branch `main`, folder `/ (root)`. Save.
4. The page is live at `https://<user>.github.io/<repo>/` within a minute or two.

Nothing to build: `index.html` loads chess.js from a CDN, plus `analysis.js`
and `pieces.css` next to it.

After changing `analysis.js`, `pieces.css`, `engine.js`, `coach.js` or
`lessons.js`, run `npm run stamp` before committing. It rewrites the `?v=` query on their links in `index.html` to a
hash of the file, so a browser that still has the old module cached (GitHub
Pages allows ten minutes) never pairs it with a newer page. The test suite
fails when a stamp is stale.

## Engine

The `engine/` folder holds Stockfish 19 (lite net, single-threaded
WebAssembly) from nmrugg/stockfish.js v19.0.1, under the GPL v3; see
`engine/README.md` for the provenance and the pinned hashes, which the test
suite checks. `engine.js` is a small wrapper: `createEngine()` starts the
Worker, `analyse(fen, { depth, multipv })` scores moves, and
`bestMove(fen, { level })` picks one at a given strength. `coach.js` holds
the pure rules (reading engine output, grading, words, bar) with unit
tests. The page starts the engine only when the Engine view or the Board
evaluation is used, and analyses at depth 10, scoring every legal move of
the position at once.

## Roadmap

Phase 1 is viewing; the Engine view and the evaluation line are the first
engine features. Still to come: grades in the move list of a loaded game,
and later playing against the engine.
