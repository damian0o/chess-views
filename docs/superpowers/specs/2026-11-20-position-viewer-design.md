# Chess Position Viewer — Design

Date: 2026-11-20

## Intent

A single static web page, deployable on GitHub Pages, that reads a chess
position exported from lichess and shows it in several "learning views".
The audience is an 8-year-old learning strategy, and a parent helping them.
A secondary goal is a board the kid can copy onto paper in very little
space, so the piece symbols are deliberately simple.

Playing against Stockfish is a later phase, not part of this spec.

## Goals

- Paste a FEN, a PGN, or a lichess URL and see the position.
- For a PGN (or lichess game URL), scrub through the game move by move;
  all views update.
- Views, as tabs over the same position:
  1. **Board** — paper-friendly symbol board.
  2. **Territory** — who controls each square.
  3. **Reach** — each piece labelled with its mobility count.
  4. **Roads** — files, ranks and diagonals drawn thick when open.
  5. **King houses** — 3×3 zone around each king with attacker/defender counts.
  6. **Diamond** — the board rotated 45° so diagonals are straight lines.
- Printable: the Board view prints big, one position per page, with the
  symbol legend.

## Non-goals

- Playing moves or an engine (phase 2).
- Accounts, saving, or any backend.
- Mobile-perfect layout. It should not break on a phone, but desktop first.

## Anti-goals

- A build step, a framework, or npm. One `index.html` plus a README.
- Fancy chess glyphs. The whole point is symbols a kid can write.

## Symbol scheme (Board view)

One character per square, chosen so it fits a tiny paper square:

| Piece       | White | Black |
|-------------|-------|-------|
| King        | `K`   | `K'`  |
| Queen       | `Q`   | `Q'`  |
| Rook        | `R`   | `R'`  |
| Bishop      | `B`   | `B'`  |
| Knight      | `N`   | `N'`  |
| Pawn        | `o`   | `x`   |

- Empty dark squares show a centred `.`; empty light squares are blank.
- On screen, squares also get real light/dark backgrounds and white pieces
  are rendered light-on-dark-text contrast vs black pieces, so colour is
  obvious without hunting for the tick.
- Coordinates a–h and 1–8 on all four sides.
- A legend under the board: "Capitals are pieces. `'` means black.
  `o` white pawn, `x` black pawn. a1 is dark."
- A piece list under the board in words, with bishops annotated by square
  colour: e.g. `White: K Q R R B(light) B(dark) N N`.

## Input handling

The input box accepts, auto-detected:

- **FEN** — 6 fields (or the first 4; fill defaults).
- **PGN** — parsed with chess.js; shows a move slider / prev-next buttons
  and the move list; the current ply drives all views.
- **lichess analysis URL** — `https://lichess.org/analysis/<fen>` or
  `/analysis/standard/<fen>`; underscores are spaces. Extract the FEN.
- **lichess game URL** — `https://lichess.org/<gameId>[/white|/black][#ply]`.
  Fetch `https://lichess.org/game/export/<gameId>?pgnInJson=false` with
  `Accept: application/x-chess-pgn`; lichess allows cross-origin reads.
  Then treat as PGN. If the fetch fails, show a clear message asking the
  user to paste the PGN instead.

Parse errors show inline under the input, never a browser alert.

The current input is also kept in the URL hash (`#fen=...` or `#pgn=...`
URL-encoded, plus `&ply=N`) so a position can be shared or bookmarked.

## Views

Shared: all views are drawn from the same `Chess` instance at the current
ply. Side to move is shown. The board is always drawn from White's side
(a1 bottom-left) in phase 1; a flip toggle is cheap and allowed if time
permits.

### Territory

For each square, count white attackers and black attackers (attack = the
square is attacked by a piece of that colour, pawns count only diagonally,
pinned pieces still count). Show:

- `+` white more, `-` black more, `=` equal and non-zero, blank if none.
- Background tint: blue-ish for white-controlled, red-ish for black, grey
  for contested, scaled by the difference (capped at 3).
- Pieces drawn faintly underneath so the kid can relate map to position.
- A one-line summary: squares controlled by each side, and centre squares
  (d4 e4 d5 e5) controlled by each side.

### Reach

Each piece is drawn with its mobility: the number of squares it could move
to if it were its side's turn, ignoring check for the moving side (i.e. use
pseudo-legal moves so both sides get numbers at once). Kings and pawns
included. Pieces with 0–2 moves are tinted red, 3–6 neutral, 7+ green.
Summary line: total mobility per side.

### Roads

Draw the 8 files, 8 ranks, and the 22 diagonals of length ≥ 3 as lines
over a faint board. A line is **thick** if it contains no pawns, **medium**
if it contains only pawns of one colour (half-open), **thin** if blocked
by pawns of both colours. Pieces drawn on top as symbols. Rooks and queens
on thick files, and bishops and queens on thick diagonals, get a small
highlight ring.

### King houses

Only the 3×3 zone around each king is drawn in full; the rest of the board
is greyed out. Each square in a zone shows `attackers/defenders` (enemy
attackers vs own defenders, same attack counting as Territory). A square
where attackers > defenders is tinted red. Summary: total attackers vs
defenders per king, and whether the king has castled / can still castle.

### Diamond

The board rotated 45°, a1 at the bottom, h8 at the top, a8 left, h1 right.
Each square is a rotated cell containing its symbol (same scheme as Board)
and a tiny coordinate label. Squares keep light/dark colour; in this
layout each horizontal row is one colour. The long diagonals a1–h8 and
a8–h1 are drawn as faint guide lines through the centre.

## Printing

- A "Print" button opens the browser print dialog with a print stylesheet.
- Print layout: the Board view only, scaled to fill the page width, the
  coordinates, the legend, the piece list, the FEN in small text, and a
  blank 8×8 grid of the same size underneath for the kid to copy into.
- `@page` margins modest; one position per page; `page-break-after`.

## Tech

- `index.html` with inline CSS and JS, no build.
- chess.js from a pinned CDN URL (cdnjs or jsdelivr, exact version) for
  FEN/PGN parsing, attack detection (`isAttacked`/`attackers`), move
  generation. Attack counting beyond what chess.js exposes is computed in
  plain JS from the board array.
- Monospace font for all boards. Views are rendered as a CSS grid of
  `<div>` cells (not a `<pre>`), so cells can carry colours and tooltips;
  the Board view also offers "Copy as text" that produces the plain text
  grid.
- `README.md`: what it is, how to use, how to deploy on GitHub Pages
  (Settings → Pages → deploy from `main` root).

## Approaches considered

1. **One static HTML page with chess.js (chosen).** Zero build, deploys
   anywhere, easy to tweak. All analysis is cheap enough to do on every
   render.
2. **Own move generator / attack tables.** More code, more bugs, no gain.
3. **A framework (React/Vite) build.** Nicer componentisation, but adds a
   toolchain and a build step to GitHub Pages deploys. Overkill for one
   page.

## Left to the builder

- Exact colours and spacing, as long as both light and dark squares and
  both piece colours stay clearly distinguishable in print (black and
  white, no colour reliance).
- Whether tabs or a sidebar; tabs are the suggestion.
- How much of the Roads diagonal set to draw; dropping length-3 diagonals
  is acceptable if the picture gets cluttered.

## Addendum 2026-11-20: Knight view

**Intent.** Show that a knight moves in straight lines (slopes 2 and ½) by
drawing its four tracks across the whole board, and teach knight distance
with a hop-count map. For an 8-year-old; drawable on paper with a ruler.

**Approaches considered.** (A) Knight tracks: four straight lines through
the knight with hop numbers — chosen. (B) Distance map: hop count on
every square — chosen as a toggle inside A. (C) Eight-target star only —
rejected, it is what every beginner book shows. Skewing the board so knight
lines become rook/bishop lines was rejected: no linear map sends all four
knight slopes onto the queen's four.

**Behaviour.**
- New tab **Knight**. Origin square = the first knight of the side to
  move, else any knight, else none (message: "No knight here. Click a
  square to put an imaginary knight on it."). Clicking any square moves
  the origin there (an imaginary knight if the square is empty or holds
  another piece). The origin resets whenever a new position is loaded.
- Tracks: for each of the 8 knight directions, walk hops 1, 2, 3… until
  off the board. Each hop square shows its hop number. A hop square holding
  the knight's own piece is marked "own" (cannot land), an enemy piece
  "enemy" (capture). Tracks are drawn as thin straight lines through all
  hop squares of the two opposite directions (4 lines).
- Toggle "Hop counts for every square": every square shows the minimum
  number of knight moves from the origin on an empty board (pure geometry,
  pieces ignored), tinted by distance. The tracks stay drawn.
- Legend for paper: "Lay a ruler two across and one up through the
  knight: every dot on it is one hop."

**Left to the builder.** Colours; whether hop numbers beyond 1 on blocked
tracks are dimmed.

## Addendum 2026-11-20: piece images

After seeing the letter chips live, the user asked for standard piece images
on screen. Decision: the cburnett SVG set (CC BY-SA 3.0, embedded as data
URIs in `pieces.css`, no runtime CDN) is the default in every view; a
"Letters for paper" checkbox (remembered in localStorage) switches all views
to the one-character scheme, and the print sheet always uses letters since
it exists to be copied by hand.

## Addendum 2026-11-20: King houses, strengths and pressure

**Intent.** Make the house itself the subject: colour for health, plain
words for strengths, weaknesses and how much pressure breaks it.

**Behaviour.**
- House cells coloured by `defenders − attackers`: ≥ +2 green, +1 light
  green, 0 yellow, −1 orange, ≤ −2 red. The `attackers/defenders` text stays.
- Shield = the three squares in front of the king (next rank, files k−1..k+1).
  Each is `pawn` (own pawn there), `advanced` (own pawn one rank further) or
  `missing`. Pawns in the shield get a green border; missing slots a dashed one.
- Files k−1..k+1 with no own pawn are "open files next to the king" and get a
  red mark on their house cells.
- Enemy pieces attacking at least one house square are "aiming at the house"
  (red ring on the piece). Own pieces other than the king attacking at least
  one house square are "defending it" (green ring).
- Weakest square = the house square with the lowest balance; "opponent needs
  N more attackers" where N = balance + 1 (balance < 0 → "already broken").
- Score = shield pawns − open files − broken squares − (1 if ≥ 3 pieces aim).
  Label: ≥ 3 Strong, 1–2 Shaky, ≤ 0 In danger. The components are listed so
  the number is never a mystery.

**Approaches considered.** Lines from attackers to targets (rejected: busy),
a single engine-like safety number (rejected: opaque), this component list
(chosen).

**Follow-up (same day):** on `kb4Q1/1p6/1P6/8/1N6/1K6/8/8 w` the view called
White's king "In danger" with nobody to attack it and missed that Black's
king is boxed in. Two additions: (1) *attacking force* = enemy queens 9,
rooks 5, minors 3; below 5 the king is **Safe** and shield/open-file marks
are not drawn; (2) *escape squares* = house squares the king can step to
(not own-occupied, not attacked), drawn as dashed circles; when at least one
enemy piece aims at the house, no escape squares costs −2 and a single one
−1, and the panel says "A check could be mate!".

**Pins (same day):** `pins(board)` finds every slider, enemy piece, and king
or more valuable piece behind it on one line. King houses draws them as
orange lines (solid = to the king, dashed = relative), badges the pinned
piece, lists them per side in words, and subtracts 1 per piece pinned to
the king (max 2) from the house score. Pressure arrows (red, from each
aiming piece to each house square it hits) were added just before, with an
optional dashed green set for defenders.

**Pinned pieces (same day):** a closed padlock marks a piece pinned to its
king, an open padlock one pinned to a more valuable piece, with orange
hatching on the square for the closed case. Reach counts moves with pins
respected (`mobility(board, { respectPins: true })`: only moves along the
pin line towards or onto the pinner), Roads fades the roads a pinned slider
cannot use, King houses shows the padlock instead of a text badge. Arrow
overlays in King houses and Knight are drawn above the pieces.

**Pins in attack counting (same day):** `attackMap(board, { respectPins: true })`
limits a piece pinned to its king to the pin line. Territory and the King
houses attacker/defender numbers use it; escape squares keep raw attacks,
since a pinned piece still gives check. Territory shows the padlock.
**Move preview:** right-click any piece in any board view to see its legal
moves (dots, red ring for captures); for the side not to move the turn is
swapped for the lookup. Esc or a second right-click hides it.

**Pawn paths (same day):** `pawnPaths(board)` gives each pawn its file
ahead, the first blocker, the enemy pawns ahead on its own and neighbouring
files (guards) and `passed = no guards`. Roads draws passed pawns' paths in
the side colour (bar at a blocker) and stars the pawn; a toggle shows every
pawn's path, guarded ones dashed; clicking a pawn focuses it with a sentence.
Unused open roads are not drawn when the board has no rook, bishop or queen.

**Reach polish (same day):** kings do not count squares the enemy attacks
(raw attack map). Zero-move pieces get a solid red badge so a 0 is never
mistaken for "no counter"; the piece image sits top-left, the badge
bottom-right.

**Pawn reach (same day):** in Reach a pawn counts the squares it attacks
(two, one on the edge), not the squares it can step to, because attacking
is a pawn's job; a blocked pawn still controls its diagonals. Pins still
apply: a file-pinned pawn counts 0. Other pieces keep "squares it can move
to". Summary line renamed from Mobility to Reach.

**Stalemate watch (same day):** computed from legal moves (chess.js), never
from Reach numbers. If the side not to move has no legal move (turn swapped
for the lookup) and is not in check, the Reach view shows a box listing the
mover's moves that would stalemate and those that keep the game going (each
tried and undone). With 1–2 legal moves left it warns instead. A real
stalemate or checkmate is named. A status-bar chip on every view links to it.

**Stalemate on the board (same day, replaces the warning box):** no alert,
no status chip. In Reach, when the other side has ≤ 2 legal moves, squares
where every move there would stalemate get a grey ½ disc (dashed when only
some moves do), a mover piece whose every move stalemates gets a dashed
outline, and the right-click preview marks stalemating destinations ½. One
neutral sentence under the board states the counts.

**Stalemate ribbon (same day):** the side with no (or ≤ 2) legal moves is
shown on the board itself in Reach: all its pieces hatched grey, its king
tagged "no moves" (or "N moves"), and a ribbon across the top of the board
("Black cannot move: a quiet White move is a draw (½)"). The sentence under
the board stays as a secondary note.

**Revision (same day):** no text tags or ribbon. The stuck side is shown by
colour only (grey hatched pieces, solid grey king cell) plus the ½ discs,
and the Reach summary carries the numbers: legal moves per side, with how
many of the mover's would stalemate.

**Knights on Roads (same day):** clicking a knight in the Roads view draws
its four straight tracks with numbered hops (own-piece hops grey, enemy
pink) in its side colour, with a sentence explaining that a knight has no
road but runs on tracks. Nothing is drawn for knights without a click.
