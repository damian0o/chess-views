# Engine View and Evaluation Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Engine" view where the kid guesses the best move and gets a graded reveal from the vendored Stockfish, plus an evaluation line on the Board view behind a toggle kept in the link.

**Architecture:** `coach.js` holds every pure rule (UCI `info` parsing, score conversion, grading, words, bar width, arrow selection) with node tests. `engine.js` gains `analyse()` for MultiPV searches and an injectable Worker so it can be tested without a browser. `index.html` gets a small engine manager (one lazy instance, a FEN-keyed cache that keeps the richest result, re-render when an answer lands for the position still on screen), the `engine` entry in `VIEWS`, the Board toggle and the `eval=1` hash parameter. Browser behaviour is verified with Playwright scripts in the scratchpad, as every earlier feature was, with CPU throttling 4× as the phone stand-in.

**Tech Stack:** Plain ES modules, chess.js 1.0.0 from the CDN (already used), the vendored Stockfish 19 lite single-threaded Worker, `node --test`, Python Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-engine-view-design.md`

## Global Constraints

- Static page, no build step, no npm dependencies; the engine is loaded only from `engine/` on the same origin.
- New modules imported by `index.html` (`coach.js`, `engine.js`) must be in `ASSETS` of `scripts/stamp.js` and stamped with `npm run stamp` before every commit that touches them (the stamp test enforces it).
- Depth is fixed: `COACH_DEPTH = 10`. The Engine view analyses with MultiPV = number of legal moves; the Board toggle with MultiPV 1.
- The engine is only asked about positions `new Chess(fen)` accepts without `skipValidation` and that have at least one legal move.
- Nothing engine-chosen is drawn or tinted before the kid has guessed or pressed "Show me".
- Copy is short and plain; the only exclamation marks are "Best!" and "That's it!".
- Budget on the throttled browser: first evaluation within 1 s, reveal within 1.5 s.
- Work on branch `engine-view`; commit messages end with the session's attribution lines; merge with `--no-ff` into `main` only after the final browser checks pass locally and the user has had a look on their phone.

## Review Focus

1. Black to move: scores arrive from the mover's point of view, so a bad Black guess must grade "Oops", not "Best!", and the eval words must say "White is better" when Black is losing. Pinned by `grade` and `evalWords` tests in Task 2.
2. A position change while a search is running: the late answer must never be shown for the new position. Pinned by the rapid-slider check in Task 4.
3. A pawn guess onto the last rank must become a queen promotion and be graded as that move. Pinned by the promotion check in Task 5.
4. A flipped board must draw the arrows on the right squares. Pinned by the flip check in Task 5.
5. A pasted FEN with no kings, or a checkmate, must show the board with no prompt and never reach the engine. Pinned by Task 7.

---

### Task 1: `coach.js` — reading the engine

**Files:**
- Create: `coach.js`
- Test: `tests/coach.test.js`

**Interfaces:**
- Produces: `parseInfo(line: string) -> { depth, multipv, cp?, mate?, pv: string[] } | null` (null for lines without `multipv` and `score`).
- Produces: `analysisFromLines(lines: string[]) -> { depth, moves: Array<{ uci, cp?, mate?, pv }> }` — for each `multipv` index keep the line of the greatest depth; `moves` ordered by multipv; `depth` is the greatest depth seen.
- Produces: `pawns(score: {cp?, mate?}) -> number` — `cp / 100`, or `±(100 - |mate|)` with the sign of `mate`.
- Produces: `toWhite(score, turn: 'w'|'b') -> {cp?, mate?}` — negates both fields when `turn === 'b'`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInfo, analysisFromLines, pawns, toWhite } from '../coach.js';

test('parseInfo reads depth, multipv, score and pv; ignores other lines', () => {
  assert.deepEqual(parseInfo('info depth 10 seldepth 14 multipv 2 score cp -35 nodes 1 nps 1 time 1 pv e7e5 g1f3 b8c6'),
    { depth: 10, multipv: 2, cp: -35, pv: ['e7e5', 'g1f3', 'b8c6'] });
  assert.deepEqual(parseInfo('info depth 16 seldepth 8 multipv 1 score mate 4 nodes 1 pv d5d8'), { depth: 16, multipv: 1, mate: 4, pv: ['d5d8'] });
  assert.equal(parseInfo('info depth 3 currmove e2e4 currmovenumber 1'), null);
  assert.equal(parseInfo('bestmove e2e4 ponder e7e5'), null);
});

test('analysisFromLines keeps the deepest line per multipv, in multipv order', () => {
  const a = analysisFromLines([
    'info depth 9 multipv 1 score cp 20 pv e2e4', 'info depth 9 multipv 2 score cp 10 pv d2d4',
    'info depth 10 multipv 2 score cp 12 pv d2d4 d7d5', 'info depth 10 multipv 1 score cp 25 pv e2e4 e7e5',
    'bestmove e2e4',
  ]);
  assert.equal(a.depth, 10);
  assert.deepEqual(a.moves.map((m) => [m.uci, m.cp]), [['e2e4', 25], ['d2d4', 12]]);
});

test('pawns and toWhite', () => {
  assert.equal(pawns({ cp: 60 }), 0.6);
  assert.equal(pawns({ mate: 3 }), 97);
  assert.equal(pawns({ mate: -2 }), -98);
  assert.deepEqual(toWhite({ cp: 60 }, 'b'), { cp: -60 });
  assert.deepEqual(toWhite({ mate: 2 }, 'b'), { mate: -2 });
  assert.deepEqual(toWhite({ cp: 60 }, 'w'), { cp: 60 });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/coach.test.js`
Expected: FAIL, `Cannot find module` for `coach.js`.

- [ ] **Step 3: Implement the four functions in `coach.js`**

Plain regexes over the `info` line; `pv` is everything after ` pv `. No DOM, no imports.

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/coach.test.js`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add coach.js tests/coach.test.js
git commit -m "feat(coach): parse engine info lines and convert scores"
```

### Task 2: `coach.js` — grades, words, bar, arrows, solve helpers

**Files:**
- Modify: `coach.js`
- Test: `tests/coach.test.js`

**Interfaces:**
- Consumes: `pawns`, `toWhite` from Task 1.
- Produces: `grade(best: {cp?,mate?}, guess: {cp?,mate?}) -> { label: string, loss: number }` — both scores from the mover's point of view; `loss = pawns(best) - pawns(guess)` rounded to 2 decimals; labels exactly: `Best!`, `Just as good`, `Good`, `Okay, but there was better`, `Oops, that loses something`, `You missed a mate in N`, `Oops, that allows mate in N` (N positive).
- Produces: `evalWords(white: {cp?,mate?}) -> string` with exactly: `Equal`, `White is a little better`, `White is better`, `White is winning`, `White mates in N`, and the Black mirrors.
- Produces: `evalNumber(white) -> string`: `+0.6`, `-1.2`, `0.0`, `#3`, `-#2`.
- Produces: `barPercent(white) -> number`: `50 + 50 * Math.tanh(pawns / 4)`, 100 for a White mate, 0 for a Black mate, rounded to 1 decimal.
- Produces: `arrowMoves(moves) -> moves.slice` — up to three, each within 0.5 pawn of the first (which is the best); input is the `moves` array of `analysisFromLines`.
- Produces: `uciOf(move: {from, to, promotion?}) -> string` and `isSolverPly(startFen: string, turn: 'w'|'b') -> boolean` (true when `turn` equals the side to move in `startFen`).

- [ ] **Step 1: Write the failing tests**

```js
import { grade, evalWords, evalNumber, barPercent, arrowMoves, uciOf, isSolverPly } from '../coach.js';

test('grade follows the loss table and names the best move', () => {
  assert.deepEqual(grade({ cp: 50 }, { cp: 50 }), { label: 'Best!', loss: 0 });
  assert.equal(grade({ cp: 50 }, { cp: 35 }).label, 'Just as good');     // 0.15
  assert.equal(grade({ cp: 50 }, { cp: 30 }).label, 'Just as good');     // 0.20 inclusive
  assert.equal(grade({ cp: 50 }, { cp: 10 }).label, 'Good');             // 0.40
  assert.equal(grade({ cp: 50 }, { cp: -60 }).label, 'Okay, but there was better');   // 1.10
  assert.deepEqual(grade({ cp: 50 }, { cp: -110 }), { label: 'Oops, that loses something', loss: 1.6 });
});

test('grade: mates override the table', () => {
  assert.equal(grade({ mate: 2 }, { cp: 300 }).label, 'You missed a mate in 2');
  assert.equal(grade({ cp: 20 }, { mate: -3 }).label, 'Oops, that allows mate in 3');
  assert.equal(grade({ mate: 2 }, { mate: 4 }).label, 'Best!');
});

test('grade with Black to move uses the mover view, so a losing Black guess is Oops', () => {
  // Scores as the engine gives them for Black to move: best keeps -20 (Black slightly worse), guess drops to -250.
  assert.equal(grade({ cp: -20 }, { cp: -250 }).label, 'Oops, that loses something');
});

test('evalWords and evalNumber from White view', () => {
  assert.equal(evalWords({ cp: 0 }), 'Equal');
  assert.equal(evalWords({ cp: 39 }), 'Equal');
  assert.equal(evalWords({ cp: 40 }), 'White is a little better');
  assert.equal(evalWords({ cp: -120 }), 'Black is better');
  assert.equal(evalWords({ cp: 300 }), 'White is winning');
  assert.equal(evalWords({ mate: -2 }), 'Black mates in 2');
  assert.equal(evalNumber({ cp: 64 }), '+0.6');
  assert.equal(evalNumber({ cp: -120 }), '-1.2');
  assert.equal(evalNumber({ cp: 0 }), '0.0');
  assert.equal(evalNumber({ mate: 3 }), '#3');
  assert.equal(evalNumber({ mate: -2 }), '-#2');
});

test('barPercent', () => {
  assert.equal(barPercent({ cp: 0 }), 50);
  assert.equal(barPercent({ cp: 400 }), 88.1);
  assert.equal(barPercent({ mate: 1 }), 100);
  assert.equal(barPercent({ mate: -1 }), 0);
});

test('arrowMoves keeps up to three moves within half a pawn of the best', () => {
  const moves = [{ uci: 'a', cp: 50 }, { uci: 'b', cp: 10 }, { uci: 'c', cp: 0 }, { uci: 'd', cp: -5 }, { uci: 'e', cp: -100 }];
  assert.deepEqual(arrowMoves(moves).map((m) => m.uci), ['a', 'b', 'c']);
  assert.deepEqual(arrowMoves([{ uci: 'a', cp: 50 }, { uci: 'b', cp: -10 }]).map((m) => m.uci), ['a']);
  assert.deepEqual(arrowMoves([{ uci: 'a', mate: 2 }, { uci: 'b', mate: 3 }]).map((m) => m.uci), ['a']);  // 98 vs 97: 1 pawn apart
});

test('uciOf and isSolverPly', () => {
  assert.equal(uciOf({ from: 'a7', to: 'a8', promotion: 'q' }), 'a7a8q');
  assert.equal(uciOf({ from: 'e2', to: 'e4' }), 'e2e4');
  const fen = '8/1n4K1/qpB4p/3R3P/4kp1N/2p4P/2P1pP2/6R1 w - - 0 1';
  assert.equal(isSolverPly(fen, 'w'), true);
  assert.equal(isSolverPly(fen, 'b'), false);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/coach.test.js`
Expected: FAIL, the new names are not exported.

- [ ] **Step 3: Implement in `coach.js`**

Thresholds are the spec's: 0.20, 0.50, 1.50 for grades; 0.4, 1.2, 3.0 for words. `loss` and `barPercent` use `Math.round(x * 100) / 100` and `Math.round(x * 10) / 10`.

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/coach.test.js`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add coach.js tests/coach.test.js
git commit -m "feat(coach): grading, evaluation words, bar and arrow selection"
```

### Task 3: `engine.js` — `analyse()` with MultiPV and an injectable Worker

**Files:**
- Modify: `engine.js`
- Test: `tests/engine.test.js` (append)

**Interfaces:**
- Consumes: `analysisFromLines` from `coach.js`.
- Produces: `createEngine({ path?, timeoutMs?, worker? })` — `worker` is an optional factory `() => { postMessage, onmessage, onerror, terminate }` used instead of `new Worker(path)`; `ready` rejects with `Error('engine: worker failed')` if the Worker reports an error before `uciok`.
- Produces: `engine.analyse(fen: string, { depth = 10, multipv = 1, timeoutMs? }) -> Promise<{ depth, multipv, moves }>` — sends `setoption name MultiPV value <multipv>` when it changed, `ucinewgame` is NOT sent (keeps the hash warm across plies), `position fen …`, `go depth <depth>`, collects every `info` line until `bestmove`, returns `analysisFromLines(lines)` with `multipv` added; a timeout behaves like `bestMove` (stop, drain, reject).
- `bestMove` is unchanged and keeps using `LEVELS`.

- [ ] **Step 1: Write the failing tests** (append to `tests/engine.test.js`)

```js
import { createEngine } from '../engine.js';

/** A scripted stand-in for the Stockfish Worker: answers UCI commands from a table. */
function fakeWorker(script) {
  const w = { onmessage: null, onerror: null, sent: [], terminated: false,
    postMessage(cmd) { w.sent.push(cmd); for (const line of script(cmd) || []) setTimeout(() => w.onmessage && w.onmessage({ data: line }), 0); },
    terminate() { w.terminated = true; } };
  return w;
}
const basic = (cmd) => {
  if (cmd === 'uci') return ['id name Fake', 'uciok'];
  if (cmd === 'isready') return ['readyok'];
  if (cmd.startsWith('go')) return ['info depth 10 multipv 2 score cp 10 pv d2d4', 'info depth 10 multipv 1 score cp 25 pv e2e4 e7e5', 'bestmove e2e4'];
};

test('analyse sets MultiPV once, searches to the depth and returns scored moves in order', async () => {
  let w; const eng = createEngine({ worker: () => (w = fakeWorker(basic)) });
  await eng.ready;
  const a = await eng.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 10, multipv: 2 });
  assert.deepEqual(a.moves.map((m) => [m.uci, m.cp]), [['e2e4', 25], ['d2d4', 10]]);
  assert.equal(a.depth, 10); assert.equal(a.multipv, 2);
  assert.ok(w.sent.includes('setoption name MultiPV value 2'));
  assert.ok(w.sent.includes('go depth 10'));
  assert.ok(!w.sent.some((c) => c === 'ucinewgame'));
  await eng.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 10, multipv: 2 });
  assert.equal(w.sent.filter((c) => c.startsWith('setoption name MultiPV')).length, 1);
});

test('analyse times out, stops, and the next call still gets its own answer', async () => {
  let calls = 0;
  const slow = (cmd) => {
    if (cmd === 'uci') return ['uciok']; if (cmd === 'isready') return ['readyok'];
    if (cmd === 'stop') return ['bestmove a2a3'];
    if (cmd.startsWith('go')) return ++calls === 1 ? [] : ['info depth 10 multipv 1 score cp 5 pv h2h3', 'bestmove h2h3'];
  };
  const eng = createEngine({ worker: () => fakeWorker(slow) });
  await assert.rejects(eng.analyse('x', { depth: 10, timeoutMs: 50 }), /no "bestmove" within 50 ms/);
  const a = await eng.analyse('x', { depth: 10 });
  assert.deepEqual(a.moves.map((m) => m.uci), ['h2h3']);
});

test('ready rejects when the worker fails before uciok', async () => {
  const eng = createEngine({ worker: () => { const w = fakeWorker(() => []); setTimeout(() => w.onerror && w.onerror({ message: 'boom' }), 0); return w; }, timeoutMs: 500 });
  await assert.rejects(eng.ready, /worker failed/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/engine.test.js`
Expected: FAIL: `ReferenceError: Worker is not defined` (today `createEngine` calls `new Worker` at once), later `analyse` is not a function.

- [ ] **Step 3: Implement**

In `engine.js`: `const worker = opts.worker ? opts.worker() : new Worker(path)`; `worker.onerror = (e) => fail(new Error('engine: worker failed'))` where `fail` rejects every pending `waitFor`; add `analyse` next to `bestMove`, sharing `serial`, `waitFor` and the timeout-drain branch (extract it into `search(cmd, timeoutMs)` returning the collected lines); import `analysisFromLines` from `./coach.js`.

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/engine.test.js tests/coach.test.js`
Expected: all passing. Then the browser spike still passes: `python3 <scratchpad>/enginecheck.py` → `ALL PASS`.

- [ ] **Step 5: Commit**

```bash
git add engine.js tests/engine.test.js
git commit -m "feat(engine): analyse() with MultiPV and an injectable Worker for tests"
```

### Task 4: Engine manager, evaluation line and the Board toggle

**Files:**
- Modify: `index.html` — imports next to `import * as A from './analysis.js?v=…'`; `state` (line ~545); `writeHash`/`readHash` (~575–610); `VIEWS.board.render` (~801–816); CSS near the `.actions` and `.overlaywrap` rules.
- Modify: `scripts/stamp.js` — `ASSETS = ['analysis.js', 'pieces.css', 'engine.js', 'coach.js']`.
- Modify: `positions.json` — no change here (see Task 6).
- Test: `tests/stamp.test.js` already loops `ASSETS`; rename its title to "links every stamped asset…".

**Interfaces:**
- Consumes: `createEngine` + `analyse` (Task 3); `evalWords`, `evalNumber`, `barPercent`, `toWhite` (Task 2).
- Produces (module-level in `index.html`):
  - `const COACH_DEPTH = 10;`
  - `const coach = { engine: null, cache: new Map(), failed: false, error: null, inflight: null };`
  - `function analysable(chess) -> boolean` — `new Chess(chess.fen())` does not throw and `chess.moves().length > 0`.
  - `function requestAnalysis(fen, multipv) -> result | null` — returns the cached `{ depth, multipv, moves }` when `cache.get(fen).multipv >= multipv`; otherwise starts (at most one in flight; a newer request supersedes an older one by `engine.stop()`), stores the result under `fen` if richer than what is there, and calls `render()` when `currentChess().fen() === fen`; sets `coach.failed = true` when `ready` rejects, `coach.error = message` on a search error; returns `null` meanwhile.
  - `function evalLine(result, turn) -> HTMLElement` — `div.evalline` holding `div.evalbar[role=img][aria-label=words] > span.w[style=width:P%]`, `span.words`, `span.num`; with `result === null` the bar is grey (`class="evalbar thinking"`) and words say `Thinking…`.
  - `state.evalOn: boolean`, hash parameter `eval=1`, read in `readHash` (applied like `flip`, before `setPosition`) and written in `writeHash`.
  - `state.guess: null | { from, to, promotion } | { shown: true }`, cleared in `setPosition` and `goTo`; `state.showMoves` is already cleared in `setPosition`.

- [ ] **Step 1: Stamp test and ASSETS**

Add the two files to `ASSETS`, run `node --test tests/stamp.test.js`. Expected: FAIL, `engine.js is linked with ?v=` (not linked yet).

- [ ] **Step 2: Imports, state, hash, manager, eval line, Board toggle**

Imports: `import { createEngine } from './engine.js'; import * as C from './coach.js';` — the stamp script adds `?v=`.
Board render: after the board grid, `if (state.evalOn) container.append(evalLine(analysable(ctx.chess) ? requestAnalysis(ctx.fen, 1) : null, ctx.turn))`; in the `.actions` row a `label.evaltoggle` with `input[type=checkbox]#evaltoggle` and text `Engine evaluation`, `onchange` → `state.evalOn = checked; writeHash(); render()`.
When the position is not analysable the words are `No evaluation here` with a grey bar.
CSS: `.evalline { display:flex; align-items:center; gap:10px; margin:6px 0 }`, `.evalbar { width: 140px; height: 12px; border: 2px solid var(--pencil); border-radius: 6px; background: var(--side-b); overflow: hidden }`, `.evalbar .w { display:block; height:100%; background:#fff }`, `.evalbar.thinking { background: var(--pencil); opacity: .5 }`, `.evalline .num { color: var(--ink-soft); font-size: .85em }`.

- [ ] **Step 3: Stamp and run the suite**

Run: `npm run stamp && npm test`
Expected: all passing (stamp test green).

- [ ] **Step 4: Browser check** — write `<scratchpad>/evalcheck.py BASE` (pattern of `takecheck.py`, with `cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})`) asserting:
  - fresh page: no `.evalline`, no request for `engine/stockfish-19-lite-single.js` in the network log;
  - tick the toggle: `.evalline` appears with `Thinking…`, then within 1000 ms the words are one of the spec's phrases and `.evalbar .w` has a width between 40% and 60% for the start position, and the hash contains `eval=1`;
  - reload the same URL: toggle ticked and the line present;
  - Review Focus 2: load the Opera game (`#pos=opera-game&eval=1`), press ▶ five times fast (50 ms apart), wait 1.5 s, then the words shown equal `C.evalWords(toWhite(best))` of a direct `analyse` on `__viewer.state`'s current FEN (compare via `page.evaluate` using the page's own engine: `window.__viewer.coach.cache.get(fen)` must be for the FEN on screen and the `.evalline` words must match its best score). Expose `coach` on `window.__viewer` as the other state is;
  - the checkmate FEN `rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3` with eval on: words `No evaluation here`, grey bar, and no `go` sent (assert through `__viewer.coach.cache` having no entry for that FEN).

Run: `python3 evalcheck.py http://localhost:8080/` → `ALL PASS`.

- [ ] **Step 5: Commit**

```bash
git add index.html scripts/stamp.js tests/stamp.test.js
git commit -m "feat(board): engine evaluation line behind a toggle kept in the link"
```

### Task 5: The Engine view — guess, reveal, show me

**Files:**
- Modify: `index.html` — new `engine:` entry in `VIEWS` between `kings:` and `diamond:`; CSS for arrows and the guess strip near the `.overlaywrap` rules; `boardGrid` unchanged.

**Interfaces:**
- Consumes: `requestAnalysis`, `analysable`, `evalLine`, `state.guess` (Task 4); `C.arrowMoves`, `C.grade`, `C.uciOf`, `C.toWhite` (Task 2); `cellXY`, `legalMovesFor`, `boardGrid`, `pieceNode`, `currentChess`.
- Produces: `VIEWS.engine = { title: 'Engine', render(container, board, ctx) }` with:
  - the board via `boardGrid(board, (r, c, cell, name) => pieceNode(cell, name))` inside `div.overlaywrap` with an SVG `viewBox 0 0 8 8`;
  - tap handling on every `.sq` (`click`): with no guess yet and `analysable(ctx.chess)`: own piece (`cell.color === ctx.turn`) → `state.showMoves = name; render()`; a square that is a legal target of `state.showMoves` → `state.guess = { from, to, promotion }` (`'q'` when the mover is a pawn reaching rank 1 or 8), `state.showMoves = null; render()`; any other square → `state.showMoves = null; render()`; a piece of the other side → `toast(\`It is ${White|Black}'s move\`)`;
  - after a guess or `shown`: arrows for `C.arrowMoves(result.moves)` as SVG `line.arrow.rank-{1,2,3}.side-{w,b}` from `cellXY(from)` to `cellXY(to)` with `marker-end` arrowheads and a `<title>` of the SAN (`ctx.chess.move(uci)` then `undo` to get `san`); the guess, when not among them, as `line.arrow.guess`;
  - `function moveLabel(chess, uci) -> string` SAN helper used for every move named in copy;
  - the strip under the board: `evalLine(result, turn)` first, then `p.summary`:
    - waiting: `Tap a piece, then a square, to guess the best move.` plus `button.quiet#showme` "Show me";
    - thinking after a guess: `Your move Nf3: thinking…`;
    - revealed: `Your move Nf3: Good (−0.4). Best: Bc4, then Nf3, d4.` (list = the arrow moves' SAN; when the guess is the best, omit "then" and list the others as "Also good: …" or nothing when there are none) plus `button.quiet#again` "Try another" → `state.guess = null; render()`;
    - shown: `Here is what the engine likes: Bc4, then Nf3, d4.` plus "Try another";
  - a legend with rows for the arrows (`best`, `also good`, `your move`);
  - CSS: `.overlaywrap line.arrow { stroke-linecap: round; opacity: .85 }`, `.rank-1 { stroke-width: .22 } .rank-2 { stroke-width: .15 } .rank-3 { stroke-width: .10 }`, `.side-w { stroke: var(--side-w) } .side-b { stroke: var(--side-b) }`, `.arrow.guess { stroke: var(--focus); stroke-width: .15; stroke-dasharray: .25 .15 }`; arrowheads via one `<marker>` per colour inside the SVG `<defs>`.

- [ ] **Step 1: Implement the view** as above. No new unit tests: the logic that can be unit-tested is in `coach.js` already; the view is checked in the browser.

- [ ] **Step 2: Stamp and run the suite**

Run: `npm run stamp && npm test`
Expected: all passing.

- [ ] **Step 3: Browser check** — `<scratchpad>/guesscheck.py BASE`, throttled 4×, asserting:
  - `#view=engine` on the start position: tab "Engine" present between "King houses" and "Diamond"; `.evalline` present; no `line.arrow`, no `.sq.aim`, no `.sq.focused`, no tinted square (`.sq[style*=background]`) before any tap — the no-leak check;
  - tap `e7` (Black piece): toast "It is White's move", still no `.mv` dots; tap `e2`: `.mv` dots appear (count 2); tap `e4`: `.summary` contains `Your move e4:` and within 1500 ms a grade from the table and at least one `line.arrow`; `button#again` present;
  - a bad guess: start position, tap `f2` then `f3`: grade text is `Okay, but there was better` or `Oops, that loses something` (either is acceptable at depth 10) and `line.arrow.guess` is present;
  - Scholar's mate FEN `r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 3 4`: tap `h5`, `f7` → `Best!` and a single `line.arrow.rank-1`; the number shown is `(0.0)`;
  - Review Focus 3: FEN `8/P6k/8/8/8/8/8/K7 w - - 0 1`, tap `a7` then `a8`: `Best!` and the summary names `a8=Q`;
  - Review Focus 4: Scholar's FEN with `flip=1`: after the reveal the `rank-1` arrow's `x1,y1` equal `cellXY('h5')` under flip, i.e. `[0.5, 4.5]`... compute in the page: assert `line.x1 == 8 - col(h5) - 0.5` → `0.5` and `y1 == 7 - row(h5) + 0.5` → `4.5`;
  - "Show me" from the waiting state: arrows appear, summary starts with `Here is what the engine likes:`, no grade words present;
  - "Try another": arrows gone, prompt back, eval line still there;
  - stepping ▶ in a loaded game clears a pending guess;
  - no page errors.

Run: `python3 guesscheck.py http://localhost:8080/` → `ALL PASS`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(engine view): guess the best move, graded reveal, show me"
```

### Task 6: The game line and solve mode

**Files:**
- Modify: `index.html` — `VIEWS.engine.render` summary; `positions.json` Opera game headers.
- Test: `tests/library.test.js` (append).

**Interfaces:**
- Consumes: `state.moves[state.ply]` (the next played move, verbose), `state.chess.getHeaders()`, `state.solve`, `state.startFen`; `C.isSolverPly`, `C.uciOf`, `C.grade`.
- Produces, in the revealed/shown summary:
  - with a loaded game and `state.ply < state.moves.length`: a second sentence `In the game ${name} played ${san} (${label}).` where `name` is the PGN `White`/`Black` header for the side to move, else `White`/`Black`, and `label` is the grade's label for the played move without its exclamation mark (`Best`), from the same `result.moves`;
  - solve mode on a solver ply (`C.isSolverPly(state.startFen, ctx.turn)`): the guess compares with `C.uciOf(state.moves[state.ply])`: `That's it!` or `Not the key. The answer is ${san}.`, then `Engine: Bc4, then …` for the arrows; "Show me" reveals the key: `The answer is ${san}.` plus the engine list;
  - solve mode on an opponent ply: no tap handling, no "Show me", summary `Press ▶ for ${Black|White}'s reply.`, eval line still shown;
  - `positions.json`: the Opera game `pgn` starts with `[White "Morphy"]\n[Black "Duke of Brunswick and Count Isouard"]\n\n`; `ply` stays 23.

- [ ] **Step 1: Write the failing library test**

```js
test('library: the Opera game names its players in PGN headers', () => {
  const p = lib.positions.find((x) => x.id === 'opera-game');
  assert.match(p.pgn, /^\[White "Morphy"\]\n\[Black "Duke of Brunswick and Count Isouard"\]\n\n1\. e4/);
  assert.equal(p.ply, 23);
});
```

Run: `node --test tests/library.test.js` → FAIL on the match.

- [ ] **Step 2: Add the headers** (escape the quotes in JSON as in the `mate-in-three` entry), run the test → PASS. Check `python3 <scratchpad>/libcheck.py http://localhost:8080/` still says `ALL PASS` (the Opera entry opens at ply 23 of 33).

- [ ] **Step 3: Implement the game line and solve mode** in the view.

- [ ] **Step 4: Stamp, suite, browser check** — extend `guesscheck.py` with:
  - `#pos=opera-game&view=engine` opens at ply 23, Black to move, and the next played move is `12...Rd8`: tap `a8` then `d8` → the summary contains `In the game Duke of Brunswick and Count Isouard played Rd8 (`; press ▶ to ply 24 (White to move, next played move `13.Rxd7`): tap `d1` then `d7` → `In the game Morphy played Rxd7 (Best)`;
  - `#pos=mate-in-three&view=engine`: no arrows before a guess; tap `g1`, `f1` → `That's it!` and `Engine:` in the summary; "Try another", tap `d5`, `d8` → `Not the key. The answer is Rf1.`; press ▶ once: summary `Press ▶ for Black's reply.`, taps on `b6` do nothing; "Show me" at ply 0 → `The answer is Rf1.`

Run: `npm run stamp && npm test && python3 guesscheck.py http://localhost:8080/` → all green.

- [ ] **Step 5: Commit**

```bash
git add index.html positions.json tests/library.test.js
git commit -m "feat(engine view): what was played in the game, and solve mode against the stored key"
```

### Task 7: Failure states

**Files:**
- Modify: `index.html` — `requestAnalysis`, `evalLine`, `VIEWS.engine.render`.

**Interfaces:**
- Consumes: `coach.failed`, `coach.error` (Task 4).
- Produces:
  - Engine view with `!analysable(ctx.chess)`: board, status line as it is, summary `Nothing to guess here.` and no "Show me"; no engine request;
  - `coach.failed`: summary `The engine could not start in this browser.`; eval line omitted;
  - `coach.error`: summary `The engine did not answer.` plus `button#retry` "Try again" → `coach.engine.terminate(); coach.engine = null; coach.error = null; coach.inflight = null; render()`; the cache is kept;
  - the Board toggle in the two failure cases shows the same sentences in place of the words.

- [ ] **Step 1: Implement.**

- [ ] **Step 2: Browser check** — `<scratchpad>/failcheck.py BASE`:
  - Review Focus 5: `#fen=8/8/8/8/8/8/8/8 w - - 0 1` (no kings; `parseInput` accepts the placement) in `view=engine`: `Nothing to guess here.`, no request for the engine files; checkmate FEN: same;
  - block `**/engine/stockfish-19-lite-single.js` with `page.route` → `The engine could not start in this browser.` within 11 s, no page error; the Board toggle shows the same sentence;
  - route the wasm to a 10-second delay → after the 10 s timeout `The engine did not answer.` and `#retry`; unroute; click `#retry` → a grade works again within 2 s.

Run: `python3 failcheck.py http://localhost:8080/` → `ALL PASS`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(engine view): nothing-to-guess, no-engine and no-answer states"
```

### Task 8: Docs, full verification, hand-over

**Files:**
- Modify: `README.md` — "The views" (an **Engine** paragraph after King houses), "How to use" (the Board toggle and `eval=1`), the Deploy note (`npm run stamp` now also covers `engine.js` and `coach.js`), the Engine section (now wired in).

- [ ] **Step 1: README edits** as listed.

- [ ] **Step 2: Full local verification**

Run, from the repo and the scratchpad:
```
npm test
python3 evalcheck.py http://localhost:8080/
python3 guesscheck.py http://localhost:8080/
python3 failcheck.py http://localhost:8080/
python3 mobilecheck.py http://localhost:8080/
python3 libcheck.py http://localhost:8080/
python3 solvecheck.py http://localhost:8080/
python3 enginecheck.py http://localhost:8080/
```
Expected: every script prints `ALL PASS`; the suite is green.

- [ ] **Step 3: Commit, then stop before merging**

```bash
git add README.md
git commit -m "docs: Engine view and evaluation toggle"
```

Report to the user with the branch name and ask for the one manual check the spec requires: open the Engine view on their phone, make one guess, and confirm the reveal arrives in about a second. Merge with `--no-ff`, push, and run `guesscheck.py` and `evalcheck.py` against the live site only after that.
