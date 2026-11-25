# Platform UI, release 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parity with the proof of concept (POC) in the new app. Release 2 adds:
- the free board (load FEN/PGN/lichess, move strip with player names, replay controls, flip, letters-for-paper, share link, all nine views);
- the library with search, tags and the print sheet;
- the views Zasięg, Skoczek, Romb and Silnik;
- the evaluation bar and arrows, and guess-the-move;
- Roads at POC parity (defender balance rings, pawn-guard ×).

Old `#fen` / `#pgn` / `#pos` links open in the new app.

**Architecture:** Same as release 1:
- rules in `platform/src/core` (new: the free-board session, guess grading flow, road rings with defenders, the print-sheet text);
- screens in `platform/src/app`;
- one Zustand store.

The engine runs through `createWasmStockfish` + `cachedEngine` with the vendored worker copied into the site at `engine/`.

**Tech Stack:** As release 1 (React 19, Vite 8, Tailwind 4, react-aria-components, Zustand, wouter, Vitest, Playwright).

**Spec:** `docs/superpowers/specs/2026-11-24-platform-ui-design.md` (goals 4–9), phase 1 `docs/superpowers/specs/2026-11-24-platform-design.md`.

## Global Constraints

Everything in release 1's Global Constraints, plus:
- **Free board views:** the free board's view dropdown lists **all nine views** (decided with the user); only lessons limit the list.
- **The engine never sees an unjudgeable position:** that's guaranteed by the adapter. When the worker cannot start or dies, the screens show a clear message and everything else keeps working.
- **lichess import** fetches `https://lichess.org/game/export/<id>?clocks=false&evals=false` with `Accept: application/x-chess-pgn`. It is the only network call besides loading the app, and it happens only when the user pastes a lichess link.
- **Engine files:** the vendored Stockfish files are copied byte-identical to `site/engine/`, and the hashes stay pinned in tests.

## Review Focus

1. **Bad input to Load:** garbage text, a bad FEN, an illegal PGN, an unknown lichess id, or lichess unreachable. Each gives a readable message in the dialog, keeps the current position, and never crashes. Tested in Task 4.
2. **The engine does not start** (worker blocked or fails), or the position cannot be judged (no kings, side not to move in check, mate). The Silnik view and the bar say so in words, and a "try again" restarts it. Tested in Task 5.
3. **Old links** `#fen=…&view=roads&flip=1`, `#pgn=…&ply=7`, `#pos=lucena` and `#pos=<pgn entry>` open the same position, ply, view and flip in the free board. Unknown `#pos` toasts and opens the start position. Tested in Task 8.
4. **Guess-the-move:**
   - tapping an opponent's piece, an empty square, or an illegal target is ignored with a hint, and never throws (a POC bug once);
   - a guess while the engine is still thinking waits, then grades.
   
   Tested in Task 6.
5. **Phone 390 px:** the free board's move strip and controls fit without horizontal overflow, the Load dialog fits, and the print sheet prints on one page (print media). Tested in Task 9.

---

### Task 1: Core — free-board session, road rings with defenders, print-sheet text

**Files:**
- Create: `platform/src/core/session.ts`, `platform/src/core/analysis/rings.ts`, `platform/src/core/print.ts`
- Test: `platform/tests/session.test.ts`, `platform/tests/analysis/rings.test.ts`, `platform/tests/print.test.ts`

**Interfaces:**
- Produces:
  - `type Session = { source: PositionSource; game: Game; ply: number; flip: boolean; view: string; headers: Record<string,string> }`.
  - `openSession(input: string | PositionSource): Session | { error: MessageKey; detail?: string }` (uses `parseInput` and `loadGame`; error keys `loadUnknown`, `loadBadFen`, `loadBadPgn`).
  - `stepTo(s, ply)` (clamped).
  - `stepBy(s, ±n)`.
  - `sessionScene(s, layers): ResolvedScene` (same shape as `sceneFor`, moves visible).
  - `sessionHash(s): string` and `parseSessionHash(params: URLSearchParams): Partial<…>` for `#/board?…`.
  - `roadRings(board: Board): { square; color; attackers: Square[]; defenders: Square[]; balance: number; style: 'free'|'contested'|'held'; width: number }[]` — the POC rule (ring on every attacked piece; width `0.08 + 0.05*min(3, max(0, attackers - realDefenders))`; style free when no real defenders, held when attackers ≤ realDefenders, else contested).
  - `pawnGuards(board, rays): { square; by: Color }[]` (road squares an enemy pawn guards).
  - `printSheet(fen, opts: { flip: boolean; title?: string; notes?: string }): { boardText: string; legend: string[] }` (letters board as the POC's print sheet).
- `LayerData.roads` gains `rings` and `pawnGuards`, computed by `analyse` for `'roads'`.

- [ ] **Step 1: Write failing tests:**
  - `openSession` on FEN, PGN with headers (Opera: 33 plies, White "Morphy"), a lichess analysis URL, garbage (`loadUnknown`), a bad FEN (`loadBadFen`), and an illegal PGN (`loadBadPgn`);
  - `stepTo` clamps;
  - `sessionHash` round-trips FEN+view+flip and PGN+ply;
  - `roadRings`, with the POC expectations from `tests/browser/roads_check.py`:
    - f7 in the Scholar threat is free with 2 attackers and width 0.18;
    - in the Qe7 line, f7 is held with 2 attackers and 2 real defenders and width 0.08;
    - in the d4 position (knight and pawn attack d4), d4 gets a ring with 2 attackers;
  - `pawnGuards` marks e5-square guards;
  - `printSheet` gives 8 rank lines with the POC symbols (o/x pawns, `'` for black pieces).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Port the POC's ring and pawn-guard logic from `index.html` (the roads view, around lines 1293–1510) and `buildPrintSheet` (around line 1972).
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `Core: free-board session, road rings with defenders, print sheet`.

### Task 2: The remaining views and Roads parity on the board

**Files:**
- Modify: `platform/src/app/views.ts` (add `reach`, `knight`, `diamond`, `engine` with labels and legends), `platform/src/app/board/Board.tsx`, `platform/src/app/board/layers/Roads.tsx`
- Create: `platform/src/app/board/layers/{Reach,Knight,Diamond}.tsx`
- Modify: `platform/src/core/i18n/messages/{en,pl}.ts` (legends `legendReach`, `legendKnight`, `legendDiamond`, `legendEngine`; and the four legends restored to describe the rings and × now drawn)
- Test: `platform/tests/app/views2.test.tsx`

**Interfaces:**
- Board drawing:
  - **reach:** the number of moves of each piece, on the piece's square;
  - **knight:** distances from `knightSquare` (a Board prop, default from `defaultKnightSquare`);
  - **diamond:** the board turned 45° (the POC's `diamondRows`);
  - **engine:** no board marks; the bar and arrows come in Task 5.
- **Roads:** rings use `rings` (width and style: dashed for contested, dotted for held), plus × marks at `pawnGuards`.

- [ ] **Step 1: Write failing tests:**
  - `VIEWS has nine views in the POC order`;
  - `reach shows 20 total moves at the start for White pawns+knights`;
  - `knight distances from g1 put 1 on f3 and h3`;
  - `diamond renders 15 rows`;
  - `roads: held f7 ring is dotted, free f7 ring is solid and thicker`;
  - `roads: an × on a pawn-guarded square`;
  - `legends for the new views exist in both catalogues and describe only drawn marks`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: Zasięg, Skoczek, Romb, Silnik views; Roads at parity`.

### Task 3: Engine in the app

**Files:**
- Create: `platform/src/app/engine.ts` (`useEngine()`: one lazily created `cachedEngine(createWasmStockfish({ workerFactory: () => new Worker(new URL('engine/stockfish-19-lite-single.js', document.baseURI)) }))`; state `idle|starting|ready|failed|dead`; `restart()`), `platform/src/app/board/EvalBar.tsx`, `platform/src/app/board/Arrows.tsx`
- Modify: `platform/scripts/assemble-site.ts` (copy `engine/` to `site/engine/` too), `platform/vite.config.ts` (dev server serves `../engine` at `/engine/`), `platform/tests/site.test.ts`
- Test: `platform/tests/app/engine.test.tsx`

**Interfaces:**
- `useEngine(): { status; analyse(fen, opts): Promise<Analysis|null>; restart(): void }`.
  - It returns null for unjudgeable positions without calling the worker.
  - Status `failed` when the worker cannot start.
  - It is tested with an injected fake `workerFactory` through a React context `EngineProvider`.
- `<EvalBar score={Score|null} turn age locale />` shows `evalWords` / `evalNumber` / `barPercent` (words for kids and teens, the number for adults).
- `<Arrows lines={AnalysisLine[]} flip />` draws up to three arrows (`arrowMoves`).

- [ ] **Step 1: Write failing tests:**
  - `assemble-site copies engine/ to the root with the pinned wasm hash`;
  - `useEngine: unjudgeable → null without a worker message`;
  - `useEngine: a worker that errors → status failed; restart → starting`;
  - `EvalBar: kids see Białe stoją lepiej, adults see +1.3`;
  - `Arrows: three lines within half a pawn`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: engine service, evaluation bar and arrows`.

### Task 4: The free board screen

**Files:**
- Create: `platform/src/app/screens/FreeBoard.tsx`, `platform/src/app/board/MoveStrip.tsx`, `platform/src/app/board/LoadDialog.tsx`
- Modify: `platform/src/app/store.ts` (`session`, `openBoard(input)`, `setPly`, `setView`, `toggleFlip`, `setPieceStyle`), `platform/src/app/App.tsx` (route `/board`), `platform/src/app/screens/Home.tsx` ("Wolna szachownica" card), messages
- Test: `platform/tests/app/freeboard.test.tsx`

**Interfaces:**
- Route `#/board?fen=…|pgn=…&ply=&view=&flip=1`.
- The screen shows:
  - the board;
  - the view dropdown (all nine);
  - the legend popup;
  - the move strip: players from headers, the current move highlighted, SAN via `formatSan`;
  - ◀◀ ◀ ▶ ▶▶ and a slider, with ArrowLeft/ArrowRight keys;
  - flip, letters-for-paper, a "Kopiuj link" share button (copies the address), and Load.
- The Load dialog takes:
  - pasted FEN/PGN;
  - a lichess game link, fetched as in the Global Constraints;
  - a lichess analysis link.
  
  Errors show inside the dialog (keys `loadUnknown`, `loadBadFen`, `loadBadPgn`, `loadLichessFailed`).
- Letters-for-paper is the player's `pieceStyle: 'letters'`. The board then draws the POC's letter symbols instead of images.

- [ ] **Step 1: Write failing tests:**
  - `opens a FEN from the address with view and flip`;
  - `step controls and arrow keys move the ply; the strip highlights the move`;
  - `player names from PGN headers`;
  - `Load: a bad FEN shows its message and keeps the position` (Review Focus 1);
  - `Load: a lichess link fetches the export URL with the PGN Accept header` (mocked fetch);
  - `Load: lichess failure shows loadLichessFailed`;
  - `letters-for-paper draws letters`;
  - `all nine views in the dropdown`;
  - `copy link writes the address to the clipboard`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: free board with load, replay, flip, letters and share`.

### Task 5: Silnik view and the evaluation in the free board

**Files:**
- Modify: `platform/src/app/screens/FreeBoard.tsx`, messages (`engineThinking`, `engineFailed`, `engineDead`, `engineNoEval`, `tryAgain` reused)
- Test: `platform/tests/app/engineview.test.tsx`

**Interfaces:**
- With the engine view selected, the free board shows `EvalBar` and `Arrows` for the current ply (`useEngine().analyse(fen, { depth: 10, multipv: 3 })`).
- Status words:
  - thinking: "Silnik myśli…";
  - failed: "Silnik nie wystartował w tej przeglądarce", with Try again;
  - unjudgeable: "Tu nie ma oceny".

- [ ] **Step 1: Write failing tests** (fake worker through `EngineProvider`):
  - `shows thinking, then the bar and arrows`;
  - `a blocked worker shows engineFailed with Try again, and Try again restarts` (Review Focus 2);
  - `no kings: engineNoEval and no worker call` (Review Focus 2);
  - `moving the ply asks for the new position and ignores the stale answer`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: Silnik view with evaluation and arrows`.

### Task 6: Guess-the-move

**Files:**
- Create: `platform/src/core/guess.ts` (`guessState`: `{ from?: Square }` → `tap(sq, fen)` returns `{ kind: 'pick', from } | { kind: 'ignore', reason: 'opponent'|'empty'|'illegal' } | { kind: 'guess', move: EngineMove }`), `platform/src/app/board/GuessPanel.tsx`
- Modify: `platform/src/app/screens/FreeBoard.tsx`, messages (`guessHint`, `guessOpponent`, `guessIllegal`, `guessYour` …)
- Test: `platform/tests/guess.test.ts`, `platform/tests/app/guess.test.tsx`

**Interfaces:**
- In the Silnik view, "Zgadnij ruch" hides the arrows.
- The child taps a piece, then a target. The core validates the guess with `legalMoves`.
- The grade comes from `grade(best, guessLine)` over the same analysis (multipv 5; a guess outside the lines is analysed with `searchmoves` — or, if the adapter lacks it, graded "not in the top moves").
- The panel shows the label (`t(label, params)`), the best move in localised SAN, and "Pokaż" to reveal the arrows.

- [ ] **Step 1: Write failing tests:**
  - **core:**
    - `tap on an opponent piece → ignore opponent`;
    - `empty first tap → ignore empty`;
    - `illegal target → ignore illegal`;
    - `legal from→to → guess with promotion q for a pawn to the last rank`;
  - **app:**
    - `guess e2e4 at the start → a grade label`;
    - `a guess while thinking waits and then grades` (Review Focus 4);
    - `opponent piece tap shows guessOpponent and never throws`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: guess the move`.

### Task 7: The library and the print sheet

**Files:**
- Create: `platform/src/app/screens/Library.tsx`, `platform/src/app/print/PrintSheet.tsx` (print CSS: `@media print` shows only the sheet, A4 portrait, one page)
- Modify: `platform/src/app/App.tsx` (`/library`, `/print?…`), Home (library card), messages
- Test: `platform/tests/app/library.test.tsx`

**Interfaces:**
- **Library:** search box (name, note, tags), tag chips, cards with a mini board (blocks or pieces), note text via `useText`. "Otwórz" opens the free board at the entry with its scene's view.
- **Print sheet:** opened from the free board's menu. It shows `printSheet` text (letters board, legend, title, notes) and calls `window.print()` on a button.

- [ ] **Step 1: Write failing tests:**
  - `25 entries; search "lucena" leaves one`;
  - `a tag chip filters`;
  - `Otwórz opens the free board at the entry with its view`;
  - `print sheet shows 8 ranks of letters and the title`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: library and print sheet`.

### Task 8: Old links open in the new app

**Files:**
- Modify: `platform/src/app/routes.ts` (old `fen`, `pgn`, `pos` and `view`/`flip`/`ply` become `{ kind: 'board', … }` or `{ kind: 'pos', id }`), `platform/src/app/forward.ts` (only `lesson=recognise` and unknown forms still go to `/poc/`), `platform/tests/app/routes.test.ts`, `platform/tests/site.test.ts`

- [ ] **Step 1: Write failing tests** (Review Focus 3):
  - `#fen=…&view=roads&flip=1 → board with view roads, flip`;
  - `#pgn=…&ply=7 → board ply 7`;
  - `#pos=lucena → the library entry in the free board`;
  - `#pos=opera-game → PGN entry at its ply`;
  - `#pos=nope → toast and the start position`;
  - `#lesson=recognise&seed=1 → still /poc/`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `Links: old position links open in the new app`.

### Task 9: End-to-end checks and README

**Files:**
- Create: `platform/e2e/{freeboard,library,engine}.spec.ts`
- Modify: `platform/e2e/links.spec.ts`, `platform/README.md`

- [ ] **Step 1: Write the specs:**
  - **freeboard:** load the Opera PGN, step to 33, mate shown, flip, letters, all nine views draw without errors;
  - **lichess:** route-mocked export;
  - **engine:** the real vendored worker evaluates the Scholar threat (Qe7 among the arrows), and a guess gets a grade; a blocked worker shows the failure words;
  - **library:** search, then open;
  - **print:** `page.emulateMedia({ media: 'print' })`, then the sheet's height fits one A4 page and nothing else is visible (Review Focus 5);
  - **links:** old `#fen`/`#pgn`/`#pos` open in the new app;
  - **phone:** free board at 390 px with no overflow (Review Focus 5).
- [ ] **Step 2:** Run `npm run build && npx tsx scripts/assemble-site.ts && npx playwright test`. Expected: all pass.
- [ ] **Step 3:** Update the README.
- [ ] **Step 4:** Commit `App: release 2 end-to-end checks; README`.
