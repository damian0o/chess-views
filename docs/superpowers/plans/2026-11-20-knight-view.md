# Knight View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Knight tab showing a knight's four straight tracks with hop numbers, and a toggle for a knight-distance map.

**Architecture:** Two pure functions in `analysis.js` (tracks and BFS distances) tested with `node --test`; one new `VIEWS.knight` entry in `index.html` reusing `boardGrid` and an SVG overlay like Roads.

**Tech Stack:** as the main plan.

**Spec:** `docs/superpowers/specs/2026-11-20-position-viewer-design.md`, section "Addendum: Knight view".

## Global Constraints
As the main plan (Board shape, symbol scheme, no build step).

## Review Focus
1. Position with no knights → message, click places an imaginary knight. (Task 2 browser check.)
2. Origin resets on load of a new position; survives tab switches. (Task 2 browser check.)
3. Knight on a corner/edge: tracks that leave the board immediately produce no hops, no errors. (Task 1 test.)

---

### Task 1: knightTracks and knightDistances

**Files:** Modify `analysis.js`; Create `tests/knight.test.js`.

**Interfaces:**
- `KNIGHT_DIRS`: the 8 `[dr, dc]` offsets.
- `knightTracks(board, origin: string): Array<{dir:[dr,dc], hops: Array<{square:string, n:number, status:'free'|'own'|'enemy'}>}>` — 8 entries in `KNIGHT_DIRS` order; `own`/`enemy` relative to the colour of the piece on `origin` if it is a knight or any piece, else relative to white.
- `knightDistances(origin: string): number[8][8]` — BFS on an empty board.
- `defaultKnightSquare(board, turn:'w'|'b'): string|null`.

- [ ] **Step 1: Tests**: f3 on empty board → total hop squares 12, direction `[-2,1]` hops `g5`(1), `h7`(2); direction `[2,-1]` hops `e1`(1) only. a1 → 2 directions with hops, others empty arrays. Statuses: white knight f3, white pawn g5, black pawn e5 → g5 `own`, e5 `enemy`. Distances from a1: a1 0, b3 1, d4 2, a2 3, b2 4, h8 6. `defaultKnightSquare(START, 'w') === 'b1'`; `('b')` → `'b8'`; no knights → null.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat: knight tracks and distances analysis`.

### Task 2: Knight tab

**Files:** Modify `index.html`.

- [ ] **Step 1:** Add `state.knightSquare` (null; reset in `setPosition`). `VIEWS.knight.render`: origin = `state.knightSquare ?? defaultKnightSquare(board, turn)`. Grid cells: origin shows the piece (or an `N` outline if imaginary); hop squares show the hop number with class `hop free|own|enemy`; other squares show the faint piece symbol or dot. If toggle on, every non-origin square shows its distance with class `d0..d6`. SVG overlay: 4 lines, each through the farthest hop of a direction and its opposite (or the origin if one side has none). Clicking a `.sq` sets `state.knightSquare` and re-renders. Toggle is a checkbox stored in `state.knightDistances`. Legend text from the spec.
- [ ] **Step 2: Browser check** (Playwright): start position → origin b1 with hop numbers on a3 (1), c3 (1), d2 (own); click f3 → origin f3 with 12 hop squares; toggle → 63 distance cells; load a king-only FEN → message shown, click e4 → tracks appear. Console clean.
- [ ] **Step 3: Commit** `feat: knight view`.
