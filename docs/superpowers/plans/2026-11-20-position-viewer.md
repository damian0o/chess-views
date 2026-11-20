# Chess Position Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static GitHub-Pages page that reads a FEN / PGN / lichess URL and shows the position in six learning views, with a printable paper board.

**Architecture:** All position analysis lives in `analysis.js`, an ES module of pure functions over a plain 8×8 board array (the same shape chess.js's `board()` returns), so it is unit-tested with Node's built-in test runner and has no dependencies. `index.html` loads chess.js (ESM, pinned CDN) for FEN/PGN parsing and move navigation, calls `analysis.js`, and renders each view as a CSS grid of `<div>` cells. No build step.

**Tech Stack:** Plain HTML/CSS/JS ES modules; chess.js 1.0.0 from jsdelivr; Node ≥ 20 `node --test` for unit tests only (no npm dependencies). `package.json` exists solely to set `"type": "module"`.

**Spec:** `docs/superpowers/specs/2026-11-20-position-viewer-design.md`

## Global Constraints

- No build step, no npm dependencies. Files shipped: `index.html`, `analysis.js`, `README.md` (+ `package.json` marker, `tests/`).
- chess.js pinned: `https://cdn.jsdelivr.net/npm/chess.js@1.0.0/dist/esm/chess.js`.
- Board arrays: `Board = Cell[8][8]`, row 0 = rank 8, col 0 = file a; `Cell = null | {square:'e4', type:'p'|'n'|'b'|'r'|'q'|'k', color:'w'|'b'}` (identical to chess.js `board()`).
- Symbol scheme (verbatim from spec): white `K Q R B N`, black `K' Q' R' B' N'`, white pawn `o`, black pawn `x`, empty dark square `.`, empty light square blank.
- a1 is dark. `squareColor('a1') === 'dark'`.
- Attack counting: pawns only diagonally; sliders stop at the first piece but that piece's square counts; pinned pieces still count; kings count.
- Parse errors render inline, never `alert()`.
- Print: Board view only, black-and-white legible, one position per page, blank 8×8 grid underneath.

## Review Focus

1. FEN with only the placement field (or 4 fields) pasted from lichess → must load with defaults (`w KQkq - 0 1`). Test in Task 6.
2. PGN containing `{comments}`, `(variations)`, NAGs `$1`, and a `1-0` result → must load; variations are ignored. Pinned in Task 7 manual check (chess.js handles it) and `parseInput` must classify it as PGN even when it starts with `[Event`. Test in Task 6.
3. Lichess game URL with `/white`, `/black`, `#42` suffix, or `https://lichess.org/abcdefgh1234` (12-char with colour-specific id) → extract the 8-char game id. Test in Task 6.
4. Position without one or both kings (puzzle fragments, hand-made FENs) → King houses view shows "no king" instead of throwing. Test in Task 5.
5. Empty/whitespace input or random text → inline message "Could not read that as FEN, PGN or lichess link", views keep the previous position. Test in Task 6 (`parseInput` returns `{kind:'unknown'}`).

---

### Task 1: Scaffold, board model, symbols

**Files:**
- Create: `package.json`, `analysis.js`, `tests/board.test.js`, `.gitignore`

**Interfaces:**
- Produces: `boardFromFen(fen: string): Board` (accepts full FEN or placement only).
  `squareName(row:number, col:number): string` and `squareIndex(name: string): {row, col}`.
  `squareColor(name: string): 'light'|'dark'`.
  `symbol(cell: Cell, name: string): string` (returns `'.'` for empty dark, `''` for empty light).
  `boardText(board: Board): string` — 10 lines: coord header, 8 ranks (`8 R' N' B' ...`), coord footer, cells separated by one space, each cell padded to width 2.
  `START_FEN` constant.

- [ ] **Step 1: Write failing tests** in `tests/board.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, squareColor, symbol, boardText, START_FEN, squareName } from '../analysis.js';

test('boardFromFen start position', () => {
  const b = boardFromFen(START_FEN);
  assert.deepEqual(b[0][4], { square: 'e8', type: 'k', color: 'b' });
  assert.deepEqual(b[7][4], { square: 'e1', type: 'k', color: 'w' });
  assert.equal(b[4][4], null);
});
test('boardFromFen accepts placement only', () => {
  assert.deepEqual(boardFromFen('8/8/8/8/8/8/8/4K3')[7][4], { square: 'e1', type: 'k', color: 'w' });
});
test('squareColor', () => {
  assert.equal(squareColor('a1'), 'dark'); assert.equal(squareColor('h1'), 'light');
  assert.equal(squareColor('e4'), 'light'); assert.equal(squareColor('d4'), 'dark');
});
test('symbol scheme', () => {
  assert.equal(symbol({type:'k',color:'w'}, 'e1'), 'K');
  assert.equal(symbol({type:'n',color:'b'}, 'g8'), "N'");
  assert.equal(symbol({type:'p',color:'w'}, 'e2'), 'o');
  assert.equal(symbol({type:'p',color:'b'}, 'e7'), 'x');
  assert.equal(symbol(null, 'a1'), '.'); assert.equal(symbol(null, 'h1'), '');
});
test('boardText start position', () => {
  const lines = boardText(boardFromFen(START_FEN)).split('\n');
  assert.equal(lines.length, 10);
  assert.equal(lines[1], "8 R' N' B' Q' K' B' N' R' 8");
  assert.equal(lines[2], '7 x  x  x  x  x  x  x  x  7');
  assert.equal(lines[8], '2 o  o  o  o  o  o  o  o  2');
  assert.equal(lines[9], '  a  b  c  d  e  f  g  h');
});
test('squareName', () => { assert.equal(squareName(0,0), 'a8'); assert.equal(squareName(7,7), 'h1'); });
```

- [ ] **Step 2: Run** `node --test tests/` → FAIL (cannot find module `../analysis.js`).
- [ ] **Step 3: Create** `package.json` `{"name":"chess-position-viewer","private":true,"type":"module","scripts":{"test":"node --test tests/"}}`, `.gitignore` (`.DS_Store`), and implement the Task 1 functions in `analysis.js`. `boardText` rank lines: `rank + ' ' + cells.map(c => c.padEnd(2)).join(' ') + ' ' + rank`; the empty-light cell pads to two spaces. Trailing spaces on the footer line are trimmed.
- [ ] **Step 4: Run** `node --test tests/` → all PASS.
- [ ] **Step 5: Commit** `feat: board model and paper symbol scheme`.

### Task 2: Attack map and Territory

**Files:**
- Modify: `analysis.js`
- Create: `tests/territory.test.js`

**Interfaces:**
- Produces: `attackMap(board): {w: number[8][8], b: number[8][8]}`.
  `territory(board): {mark: string[8][8], diff: number[8][8], summary: {w:number, b:number, centerW:number, centerB:number}}` where `mark ∈ {'+','-','=',''}`, `diff = w - b`, summary counts squares with mark `+`/`-`; centre squares are d4 e4 d5 e5.

- [ ] **Step 1: Write failing tests**

```js
test('attackMap start position', () => {
  const a = attackMap(boardFromFen(START_FEN));
  const at = (m, sq) => { const {row,col} = squareIndex(sq); return m[row][col]; };
  assert.equal(at(a.w,'e3'), 2);   // d2, f2 pawns
  assert.equal(at(a.w,'f3'), 3);   // e2 g2 pawns + Ng1
  assert.equal(at(a.w,'d1'), 1);   // Ke1 only (Ra1 blocked by b1/c1)
  assert.equal(at(a.b,'e6'), 2);   // d7, f7 pawns
  assert.equal(at(a.w,'e4'), 0);
  assert.equal(at(a.w,'a2'), 1);   // Ra1
  assert.equal(at(a.w,'b1'), 1);   // Ra1 attacks the occupied square and stops
});
test('territory after 1.e4', () => {
  const t = territory(boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'));
  const m = (sq) => { const {row,col} = squareIndex(sq); return t.mark[row][col]; };
  assert.equal(m('d5'), '+'); assert.equal(m('f5'), '+'); assert.equal(m('e5'), '');
  assert.equal(m('d6'), '-'); assert.equal(m('e4'), '');  // white pawn on e4 not attacked by anyone
  assert.equal(t.summary.centerW, 1); assert.equal(t.summary.centerB, 0);
});
test('territory contested mark', () => {
  // white pawn d4, black pawn e6 -> d5 attacked once each
  const t = territory(boardFromFen('4k3/8/4p3/8/3P4/8/8/4K3 w - - 0 1'));
  const {row,col} = squareIndex('d5'); assert.equal(t.mark[row][col], '=');
});
```

- [ ] **Step 2: Run** → FAIL (`attackMap` not exported).
- [ ] **Step 3: Implement** `attackMap` by iterating pieces: pawn diagonals by colour, knight/king offsets, sliders (b/r/q) ray-cast stopping after the first occupied square (counting it). Implement `territory` from it.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: attack map and territory analysis`.

### Task 3: Reach (mobility)

**Files:**
- Modify: `analysis.js`; Create: `tests/mobility.test.js`

**Interfaces:**
- Produces: `mobility(board): {pieces: Array<{square, type, color, count}>, summary: {w:number, b:number}}`. Pseudo-legal counts: sliders/knights/kings to empty or enemy squares; pawns: single push if empty, double push from start rank if both empty, diagonal captures only onto enemy pieces (no en passant, no castling). `mobilityTone(count): 'low'|'mid'|'high'` for 0–2 / 3–6 / 7+.

- [ ] **Step 1: Tests**: start position → every piece 0 except knights 2 each and pawns 2 each; `summary.w === 20`. After `1.e4`: white bishop f1 count 5, queen d1 count 4, pawn e4 count 1. `mobilityTone(2)==='low'`, `(3)==='mid'`, `(7)==='high'`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat: mobility analysis`.

### Task 4: Roads

**Files:**
- Modify: `analysis.js`; Create: `tests/roads.test.js`

**Interfaces:**
- Produces: `LINES: Array<{id:string, kind:'file'|'rank'|'diag', squares:string[]}>` — 8 files (`id` `'a'`..`'h'`), 8 ranks (`'1'`..`'8'`), and all diagonals of length ≥ 3 in both directions (`id` = first and last square, e.g. `'a1-h8'`, `'a3-f8'`). Count: 8 files + 8 ranks + 11 diagonals per direction (lengths 3,4,5,6,7,8,7,6,5,4,3) × 2 = 38 lines.
  `roads(board): Array<{id, kind, squares, state:'open'|'half'|'closed', pieces: Array<{square,type,color}>}>` — state from pawns on the line: none → `open`, one colour → `half`, both → `closed`.
  `activeOnRoads(roads): Set<string>` — squares of rooks/queens on open files and bishops/queens on open diagonals (ranks excluded).

- [ ] **Step 1: Tests**: `LINES.length === 38`; diagonal `'a1-h8'` has 8 squares; start position: all files `closed`, all ranks `open` except ranks 2 and 7 `half`, `'a1-h8'` is `closed`; FEN `4k3/8/8/8/8/8/8/R3K3 w - - 0 1`: file `a` open, `activeOnRoads` contains `'a1'`.
- [ ] Steps 2–5 as above. Commit `feat: roads analysis`.

### Task 5: King houses

**Files:**
- Modify: `analysis.js`; Create: `tests/kings.test.js`

**Interfaces:**
- Produces: `kingHouses(board): {w: House|null, b: House|null}` where `House = {king: string, cells: Array<{square, attackers:number, defenders:number, danger:boolean}>}`; cells are the up-to-9 squares around and including the king, `danger = attackers > defenders`. Attack counts from `attackMap` (enemy count = attackers, own count = defenders). `null` when that colour has no king (Review Focus 4).

- [ ] **Step 1: Tests**: start position white house has 6 cells (d1 e1 f1 d2 e2 f2), `f2` defenders 1 (Ke1 only), no danger. FEN `4k3/8/8/8/8/8/5q2/4K3 w - - 0 1`: white house cell `f2` (the queen's own square) attackers 0 defenders 1; `f1` attackers 1 defenders 1 → not danger; `e2` attackers 1 defenders 1; `e1` attackers 1 defenders 0 → danger; `d1` attackers 0. FEN `8/8/8/8/8/8/8/4K3 w - - 0 1` → `b === null`.
- [ ] Steps 2–5. Commit `feat: king houses analysis`.

### Task 6: Input detection

**Files:**
- Modify: `analysis.js`; Create: `tests/input.test.js`

**Interfaces:**
- Produces: `parseInput(text: string): {kind:'fen', fen} | {kind:'pgn', pgn} | {kind:'lichess-game', gameId} | {kind:'unknown'}`.
  Rules, in order: trim; empty → unknown. URL matching `lichess.org/analysis/(standard/)?<rest>` → decode, replace `_` with space, strip query/hash, return `fen` (normalised via `normaliseFen`). URL matching `lichess.org/([A-Za-z0-9]{8})` (ignore anything after the 8 chars: `/white`, `/black`, 4 extra id chars, `#ply`) → `lichess-game`. Text containing `[Event` or a token like `1.` followed by a move → `pgn`. Text whose first field matches `^[prnbqkPRNBQK1-8/]+$` with 8 ranks → `fen`. Else unknown.
  `normaliseFen(fen: string): string` — pads missing fields with `w`, `-`, `-`, `0`, `1` (Review Focus 1).

- [ ] **Step 1: Tests**: placement-only FEN → `{kind:'fen', fen: '... w - - 0 1'}`; 4-field FEN → padded with `0 1`; `https://lichess.org/analysis/standard/rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR_b_KQkq_-_0_1` → fen with spaces; `https://lichess.org/analysis/<fen with %20>` → decoded; `https://lichess.org/AbCd1234/black#33` → gameId `AbCd1234`; `https://lichess.org/AbCd1234wxyz` → `AbCd1234`; PGN starting with `[Event "x"]` and containing `{comment} (1... e5) $1 1-0` → `pgn`; bare `1. e4 e5 2. Nf3` → `pgn`; `''`, `'   '`, `'hello world'` → `unknown`.
- [ ] Steps 2–5. Commit `feat: input detection for FEN, PGN and lichess links`.

### Task 7: Page shell, input, Board view, move navigation

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: Task 1 and Task 6 exports; chess.js `Chess`, `.load(fen)`, `.loadPgn(pgn)`, `.history({verbose:true})`, `.board()`, `.fen()`, `.turn()`, `.inCheck()`, `.getCastlingRights(color)`.
- Produces: page state `{game: Chess, moves: Move[], ply: number}`; `currentBoard()` returns `Board` at `ply`; `render()` redraws the active tab; tabs registry `VIEWS = {board, territory, reach, roads, kings, diamond}` each `{title, render(container, board, ctx)}` where `ctx = {chess, turn, fen}`. Later tasks add entries to `VIEWS`.

- [ ] **Step 1: Build the shell**: header with title, `<textarea id="input">` + "Load" button + inline `<p id="error">`; tab bar; `<main id="view">`; move navigation bar (`⏮ ◀ ▶ ⏭`, `<input type="range">`, move list with clickable SAN) shown only when a PGN is loaded; status line "White to move" / "Black to move (in check)".
- [ ] **Step 2: Implement Board view**: 10×10 CSS grid (coords on all sides), cell background by `squareColor`, cell text `symbol()`; white pieces class `w`, black `b`; monospace font; `title` tooltip with square name. Under the board: legend (spec copy verbatim: "Capitals are pieces. ' means black. o white pawn, x black pawn. a1 is dark.") and piece list in words with `B(light)`/`B(dark)`. "Copy as text" button → `navigator.clipboard.writeText(boardText(board))`.
- [ ] **Step 3: Load flow**: on Load (and on page load from hash) → `parseInput`; `fen` → `chess.load`, `moves = []`, `ply = 0`; `pgn` → `chess.loadPgn`, `moves = history`, `ply = moves.length`; `lichess-game` → `fetch('https://lichess.org/game/export/'+id, {headers:{Accept:'application/x-chess-pgn'}})` then as PGN, on failure error text "Could not fetch that game from lichess; paste the PGN instead."; `unknown` → error "Could not read that as FEN, PGN or lichess link". Hash sync: `#fen=<enc>` or `#pgn=<enc>&ply=N`; `currentBoard()` replays `moves.slice(0, ply)` on a fresh `Chess`. Default on first visit: `START_FEN`.
- [ ] **Step 4: Verify** manually: `python3 -m http.server 8080` from repo root, open `http://localhost:8080/`, paste the start FEN, a placement-only FEN, a PGN with comments and a result, a lichess analysis URL; confirm the board, status line, slider and error messages. Also run `node --test tests/` → PASS.
- [ ] **Step 5: Commit** `feat: page shell with board view, input and move navigation`.

### Task 8: Territory and Reach views

**Files:** Modify `index.html`.

- [ ] **Step 1: Territory tab**: 8×8 grid + coords; each cell shows the mark, background tint by `diff`: white-controlled `hsl(210 70% L)` and black-controlled `hsl(0 70% L)` with lightness stepping 90/80/70 % for |diff| 1/2/≥3, contested light grey; piece symbol faint in the cell corner. Summary line: "White controls N squares (centre: n), Black controls M (centre: m)".
- [ ] **Step 2: Reach tab**: board grid, each piece cell shows symbol + count (e.g. `B 5`), tinted by `mobilityTone`; empty squares plain. Summary line: "Mobility: White 20, Black 20".
- [ ] **Step 3: Verify** in browser on the start position and after `1.e4`: Territory shows `+` on d5/f5 and summary centre 1/0; Reach shows `B 5` on f1.
- [ ] **Step 4: Commit** `feat: territory and reach views`.

### Task 9: Roads and King houses views

**Files:** Modify `index.html`.

- [ ] **Step 1: Roads tab**: faint board grid as background; an absolutely-positioned inline `<svg viewBox="0 0 8 8">` overlay drawing each road from `roads(board)` as a line through cell centres (files/ranks/diagonals), stroke width 0.18 for `open`, 0.08 for `half`, 0.03 for `closed`, dashed when closed; piece symbols on top in the grid; squares in `activeOnRoads` get a ring (`outline: 2px solid`). Legend: "thick = open, medium = pawns of one side, thin dashed = blocked".
- [ ] **Step 2: King houses tab**: board grid with every cell greyed out except house cells; house cells show `attackers/defenders`, red tint if `danger`, the king cell shows `K`/`K'`. Summary per side: "White king on g1 — attackers 2, defenders 5 — castled / can castle K/Q / cannot castle" (castling state from `ctx.chess.getCastlingRights`, "castled" when king is on g1/c1 (g8/c8) with no rights left). If a house is `null`: "White: no king".
- [ ] **Step 3: Verify** in browser: start position roads all files thin, ranks 1 and 8 thick; king house FEN with no black king shows "Black: no king".
- [ ] **Step 4: Commit** `feat: roads and king houses views`.

### Task 10: Diamond view

**Files:** Modify `analysis.js` (add `diamondRows`), `index.html`; Create `tests/diamond.test.js`.

**Interfaces:**
- Produces: `diamondRows(board): Array<Array<{square, cell}>>` — 15 rows, row index `i` holds squares with `file + rank === 16 - i` (file a=1), ordered from a-file to h-file (so row 0 = `[h8]`, row 7 = `[a8 … h1]`, row 14 = `[a1]`).

- [ ] **Step 1: Test**: 15 rows; row 0 is `['h8']`; row 14 is `['a1']`; row 7 squares `['a8','b7','c6','d5','e4','f3','g2','h1']`; every row has a single `squareColor`.
- [ ] **Step 2: Implement** `diamondRows`; run → PASS.
- [ ] **Step 3: Render**: 15 flex rows centred; each cell a rotated square (`transform: rotate(45deg)` on a container, counter-rotate the text) sized so rows overlap by half a cell height (`margin-top: -0.5 * cell`); symbol centred, tiny coordinate in the corner; light/dark by `squareColor`; two faint lines for a1–h8 (vertical centre) and a8–h1 (horizontal centre).
- [ ] **Step 4: Verify** in browser: c1 bishop straight line to h6 reads vertically; row colours alternate.
- [ ] **Step 5: Commit** `feat: diamond view`.

### Task 11: Print layout, README, deploy notes

**Files:** Modify `index.html`; Create `README.md`.

- [ ] **Step 1: Print**: "Print" button → `window.print()`. `@media print`: hide everything except a `#print-sheet` section rendered on demand containing the Board view (black on white, no square tints beyond a light grey for dark squares plus the `.` dots so it survives B&W), legend, piece list, FEN in `font-size: 9pt`, and a blank 8×8 grid with coordinates of the same size underneath. `@page { margin: 12mm }`, `.print-sheet { page-break-after: always }`. Board width `min(170mm, 100%)`.
- [ ] **Step 2: Verify** with the browser print preview (Cmd+P) on the start position: one page, board and blank grid both fully visible, symbols legible.
- [ ] **Step 3: README.md**: what it is, the symbol legend, how to use (paste FEN / PGN / lichess link), run locally (`python3 -m http.server`), run tests (`node --test tests/`), deploy (push to GitHub, Settings → Pages → Deploy from branch `main` / root), note that the six views are phase 1 and play-vs-Stockfish is planned.
- [ ] **Step 4: Run** `node --test tests/` → PASS. **Step 5: Commit** `feat: print sheet and README`.
