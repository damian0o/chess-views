# Chess Views

A single static page that reads a chess position exported from lichess and
shows it in eight learning views. Made for an 8-year-old learning strategy and
a parent helping, with a board that is easy to copy onto squared paper.

Live: https://damian0o.github.io/chess-views/ (GitHub Pages from `main`).

The page is laid out like an app: the board comes first under a sticky bar
(flip, letters, share link, Load), the views are a row of pills, and a loaded
game gets player controls pinned to the bottom of the screen. It works on a
phone as well as a desktop. In dark mode the page goes dark but the board
stays light, so black pieces and the paper letters remain readable.

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

- A **step bar** under the tabs shows the lesson name, the moment, "3 of 25", one
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

- **Questions**: a step may ask something. Either 2 to 4 answer buttons, or
  "tap a square on the board" (the tap goes to the question, not to the
  view). A wrong answer says "Try again"; Next opens only after the right
  one. A reload, or Back then Next, asks again: answers are never saved.
- **Moments**: a lesson is split into its crucial moments (2 to 4). Each
  moment is shown in a few views, followed by quick questions and then
  "Is this the moment?" on blocks, once with the moment's own board (Yes)
  and once with another board (No). Pieces can be revealed only after the
  answer.

The lessons:

- **Scholar's mate** (25 steps): the attack on f7, the defence, the mate,
  then three boards to spot the shape.
- **Eyes on f7**: ten openings as blocks; for each the kid answers where
  two pieces aim (f7, f2 or neither), then reads it in Roads or Territory.
  A practice drill with no moments.
- **Opera game** (Morphy, 1858): the fast start, the knight sacrifice, the
  rook mate on d8.
- **Légal's mate** (1750): the queen gift, the mate by three small pieces.
- **Réti vs Tartakower** (1910): the queen gift on d8, the double check and
  the bishop mate.
- **Lasker's king hunt** (Edward Lasker vs Thomas, 1912): the queen gift on
  h7, the king hunt, the mate on g1.

**Recognise** is a round built from the lessons finished on this device:
up to 8 boards as blocks, each asking "Which game, which moment?" with 3
or 4 answers. Wrong answers come from other finished moments, other
moments of the same game first; moments marked `looksLike` never stand
side by side. It unlocks once two lessons with moments are finished. The
link carries a seed (`#lesson=recognise&seed=123&step=1`), so a reload
shows the same round; Start picks a new one. Nothing about a round is
saved.

Lessons live in `positions.json` under `lessons`. A step has a position
(`fen`, `pgn` with `ply`, `pos` for a library entry, or `same` for the
previous step's position with an optional `ply`), a `view`, an optional
`sq`, `solve` with a `task` for a hidden move, `shapes: { gate: true }` to
wait for the reveal, `flip`, and `say` (at most two sentences, `**bold**`
for the view name). A question is `ask: { q, choices, answer }` or
`ask: { q, tap: ["f7"] }`, with an optional `right` line; `moment` names
one of the lesson's `moments` (`id`, `name`, a board, optional
`looksLike: ["lesson/moment"]`), and the lesson then needs a `game` name.
`recall: true` shows the moment's own board as a Yes/No question;
`blocks: true` shows the step's board as blocks with a question.
`npm test` validates every lesson and replays every PGN.

## The platform (in progress)

This page is the proof of concept. Its successor is being built in
`platform/`: a typed TypeScript core (chess rules, analysis, lessons,
recognition, engine, storage, languages) with no screens yet, lessons as
Markdown, and checks in CI. Phase 1 has no user interface; this page stays
live until the platform matches it. See
`docs/superpowers/specs/2026-11-24-platform-design.md`.

## Tests

The analysis functions in `analysis.js` and the pure modules `coach.js`,
`engine.js` and `lessons.js` have unit tests that need only Node 20+:

```
npm test
```

To replay the lessons' games, the tests use a copy of chess.js 1.0.0 in
`tests/vendor/chess.js`, pinned by its SHA-256. The page itself still loads
chess.js from the CDN.

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
