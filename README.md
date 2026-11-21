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
twenty named positions with a note, tags and the view they are best seen in,
from the start position and basic mates to pawn structures, the king-trap
study and Morphy's Opera game. Pick one and the app loads it in that view.
A link of the form `#pos=<id>` opens an entry directly, for example
`#pos=lucena`.

The library is the file `positions.json`. To add a position, append an
entry with an `id`, `name`, `note`, `tags`, `view` and either a six-field
`fen` or a `pgn` with a `ply`; `npm test` validates every entry (fields,
FEN shape, one king per side). There is no saving in the browser by design:
the collection is curated in the repo and published with the page.

## How to use

Press **Load** in the top bar (or the `l` key), paste any of these and press
Load again (or Ctrl/Cmd+Enter). The dialog also offers a few example positions.

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
can bookmark or share a link that lands on exactly what you see.

## The views

- **Board**: the paper board, with "Copy as text" and "Print". Print gives you
  the position big on one page plus an empty grid to copy it into.
- **Territory**: who owns each square. `+` white, `-` black, `=` equal. The
  side with the cheapest guard owns a square (a pawn guard beats any piece,
  since whatever lands there gets taken by a pawn); when the cheapest guards
  are worth the same, the bigger attacker count wins. Tap a square to see
  exactly which pieces attack it, with a line from each, and why it is owned.
- **Reach**: every piece shows how many squares it can move to right now
  (pawns: the squares they attack). A stalemate watch warns when the other
  side is out of moves and lists which moves would stalemate.
- **Roads**: files and diagonals drawn thick when open (no pawns), thin when
  only one side's pawns are on them, coloured blue or red by which side has a
  rook, bishop or queen on them. Passed pawns get a star and their path to
  promotion. Small dots mark the squares a knight can jump to right now.
  Click a piece or pawn to see only its road, or a knight to see its four
  tracks.
- **King houses**: the 3×3 zone around each king coloured by how well each
  square is held, with the shield pawns, open files next to the king, the
  pieces aiming at the house and the pieces defending it, a Strong / Shaky /
  In danger label with its score explained, and the weakest square with how
  many more attackers the opponent needs to break in. Red arrows show the
  pressure, orange lines show pins, dashed circles the king's escape squares.
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

The analysis functions in `analysis.js` have unit tests that need only Node 20+:

```
node --test
```

## Deploy on GitHub Pages

1. Push this repository to GitHub.
2. Settings → Pages → Build and deployment → Source: "Deploy from a branch".
3. Branch `main`, folder `/ (root)`. Save.
4. The page is live at `https://<user>.github.io/<repo>/` within a minute or two.

Nothing to build: `index.html` loads chess.js from a CDN, plus `analysis.js`
and `pieces.css` next to it.

After changing `analysis.js` or `pieces.css`, run `npm run stamp` before
committing. It rewrites the `?v=` query on their links in `index.html` to a
hash of the file, so a browser that still has the old module cached (GitHub
Pages allows ten minutes) never pairs it with a newer page. The test suite
fails when a stamp is stale.

## Roadmap

This is phase 1 (viewing). Phase 2 is playing against Stockfish in the browser.
