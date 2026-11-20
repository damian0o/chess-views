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
