# Chess position viewer

A single static page that reads a chess position exported from lichess and
shows it in six learning views. Made for an 8-year-old learning strategy and
a parent helping, with a board that is easy to copy onto squared paper.

Live: enable GitHub Pages on this repo (see below) and open the URL it gives you.

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

## How to use

Paste any of these into the box and press Load (or Ctrl/Cmd+Enter):

- a FEN, even just the piece placement part;
- a PGN, including comments and variations (variations are ignored);
- a lichess analysis link such as `https://lichess.org/analysis/standard/<fen>`;
- a lichess game link such as `https://lichess.org/AbCd1234`. The PGN is
  fetched from lichess; if that fails, paste the PGN instead.

With a PGN you get a move slider and the arrow keys step through the game.
"Flip board" (or the `f` key) turns every view around to play from Black's side.
Right-click any piece to see its legal moves; Esc hides them.
The position and the current view are kept in the URL, so you can bookmark
or share a link.

## The views

- **Board**: the paper board, with "Copy as text" and "Print". Print gives you
  the position big on one page plus an empty grid to copy it into.
- **Territory**: who attacks each square more. `+` white, `-` black, `=` equal.
- **Reach**: every piece shows how many squares it can move to right now.
- **Roads**: files and diagonals drawn thick when open (no pawns), thin when
  only one side's pawns are on them, coloured blue or red by which side has a
  rook, bishop or queen on them. Click a piece to see only its roads.
- **King houses**: the 3×3 zone around each king coloured by how well each
  square is held, with the shield pawns, open files next to the king, the
  pieces aiming at the house and the pieces defending it, a Strong / Shaky /
  In danger label with its score explained, and the weakest square with how
  many more attackers the opponent needs to break in. Red arrows show the
  pressure, orange lines show pins, dashed circles the king's escape squares.
- **Diamond**: the board turned 45°, so diagonals are straight lines and each
  row is one colour.
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

## Roadmap

This is phase 1 (viewing). Phase 2 is playing against Stockfish in the browser.
