# Folding Look Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The look picker folds to one summary line (folded by default on phones) and the move list sits above it.

**Architecture:** `LookPicker` gains a fold: a summary toggle button plus the existing rows, its open state held in
component state, initial value `!useIsPhone()`. Lesson and FreeBoard reorder their JSX so the move list comes first.

**Tech Stack:** React 19, react-aria-components, Tailwind 4, Vitest/jsdom, Playwright (phone, laptop).

**Spec:** docs/superpowers/specs/2026-11-28-fold-picker-design.md

## Global Constraints

- No new browser saving: the fold is not stored.
- Summary text: `t('view')` + `: ` + labels of on options joined with ` · `, in OPTION_IDS order, from the options passed in (`o.on`).
- Polish first; existing keys `view` ("Widok"/"View"); add `showOptions`/`hideOptions` only if an aria-label is needed (prefer `aria-expanded` on the summary button, no new keys).
- Phone = `useIsPhone()` (max-width 767.98px). jsdom reports not-phone, so unit tests see the picker open.

## Review Focus

1. Summary while frozen (blocks question open): the summary button still opens; rows disabled — test in Task 1.
2. Option toggled while open updates the summary text immediately — test in Task 1.
3. Rotating a phone to laptop width does not force the fold open/closed mid-use (initial value only) — accepted; no test.
4. Phone e2e specs that click `[data-option]` must open the fold first — Task 3 helper `openPicker`.
5. ⓘ legend stays reachable while folded — test in Task 1.

---

### Task 1: LookPicker folds

**Files:** Modify `platform/src/app/lesson/LookPicker.tsx`; Test `platform/tests/app/lookpicker.test.tsx`

**Interfaces:**
- Produces: `LookPicker({ options, frozen, onToggle, aside, startOpen? }: {...; startOpen?: boolean })`; default
  `startOpen = !useIsPhone()`. Summary button: `data-look-summary`, `aria-expanded`, `aria-controls` = rows id.
  Rows container: `data-look-rows`, rendered only when open.

- [ ] Step 1: failing tests in lookpicker.test.tsx:
  - `folded: one line "Widok: Bierki · Drogi" and no rows; the legend button still shows` — `startOpen={false}`, options pieces+roads on → summary text `Widok: Bierki · Drogi ▾`, `aria-expanded="false"`, no `[data-option]`, `aside` rendered.
  - `tapping the summary opens the rows and tapping again folds them` — aria-expanded true/false, `[data-option]` count toggles.
  - `frozen: the summary still opens; the rows are disabled`.
  - `the summary follows what is on` — rerender with kings on → text contains `Domki króla`.
- [ ] Step 2: `npx vitest run tests/app/lookpicker.test.tsx` → the new tests FAIL.
- [ ] Step 3: implement. The aside moves from the first row to the summary line (summary button flex-1, aside at the end).
- [ ] Step 4: tests pass; `npm run check` green.
- [ ] Step 5: commit "Look picker folds to one line".

### Task 2: moves above the picker

**Files:** Modify `platform/src/app/screens/Lesson.tsx`, `platform/src/app/screens/FreeBoard.tsx`; Test `platform/tests/app/lesson.test.tsx`, `platform/tests/app/freeboard.test.tsx`

- [ ] Step 1: failing tests: `in a lesson from a game the move list comes before the picker` (laptop layout in jsdom: `moveStrip.compareDocumentPosition(picker) & DOCUMENT_POSITION_FOLLOWING`); same for the free board (status + MoveStrip before `[data-look-picker]`). MoveStrip root needs a findable hook — use its existing role/aria-label if any, else add `data-move-strip`.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: Lesson phone `tools={<>{moveList}{tools}</>}`; Lesson laptop order board, ◀ ▶, moveList, tools; FreeBoard right column: status, MoveStrip, picker, buttons.
- [ ] Step 4: pass; `npm run check` green.
- [ ] Step 5: commit "Moves above the look picker".

### Task 3: phone e2e

**Files:** Modify `platform/e2e/helpers.ts`, phone specs that press `[data-option]`; add a test to `platform/e2e/look-picker.spec.ts`.

- [ ] Step 1: add `openPicker(page)` (click `[data-look-summary]` if `aria-expanded="false"`); new phone test `phone: the picker starts folded, the moves are visible above it, and it opens` — 390×844, lesson scholars-mate/s03-roads after `openBoard`: `[data-look-summary]` aria-expanded false, no `[data-option]` visible; open → Strategia row visible. Laptop: starts open.
- [ ] Step 2: build + assemble, run e2e → the new test passes, the old phone specs fail where they click options without opening; add `openPicker` there.
- [ ] Step 3: full e2e green (`npm run build && npx tsx scripts/assemble-site.ts && npx playwright test`).
- [ ] Step 4: phone screenshot for the user; commit "e2e: folded picker on phones".

### Task 4: drawings are off-limits while a question or task is open (user approved 2026-11-28, case s06-board)

**Files:** Modify `platform/src/core/lessons/run.ts`; Test `platform/tests/boardgroups.test.ts`

**Rule:** while `busy` (gate answer or reveal), a Ruchy/Strategia option (roads, reach, knight, territory, kings)
is not usable unless it is the step's own drawing (`step.scene.look.moves/strategy`). Bierki, Romb, Obróć,
Nazwy pól stay usable. After the answer / reveal everything opens as before. Such options show as
`blocked: true` (disabled, no 🔒); `locked` (🔒) stays only for options not yet unlocked. Step-`locked:` options
while busy also become `blocked`, not `locked` (folds the deferred 🔒 minor).

- [ ] Step 1: failing tests:
  - `s06-board: Drogi is unlocked but disabled while the tap question is open, and usable after f7` (real lesson scholars-mate with a profile that has roads unlocked; toggle roads ignored while open; option `{blocked:true, locked:false}`; after answering f7 toggle works).
  - `a find-the-move task keeps its own drawing (territory) usable but not reach/kings` (s13-territory).
  - `Bierki, Klocki, Obróć stay usable while a question is open`.
- [ ] Step 2: run → FAIL. Step 3: implement in `make` (usable + options mapping). Step 4: `npm run check` green. Step 5: commit "Lessons: no extra drawings while a question is open".

### Task 5: no frame on the square after a wrong find-the-move (case s13-territory)

**Files:** Modify `platform/src/app/screens/Lesson.tsx` (`solveMarks`); Test `platform/tests/app/solve.test.tsx:63-75`

- [ ] Step 1: change the existing test: after the wrong a6, no cell has `data-tap="wrong"` (the text still names a6). Tap questions keep their wrong mark (existing tests stay).
- [ ] Step 2: run → FAIL. Step 3: drop the `wrong` branch of `solveMarks`. Step 4: check green. Step 5: commit "Find the move: no frame left on the square after a wrong move".
