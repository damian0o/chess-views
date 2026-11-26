# Lesson Phone Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On phones the lesson step opens on its instruction. The child pulls the board up over it, and that
pull is the "Rozumiem". All controls sit in a fixed dock with the button to press now highlighted.

**Architecture:**
- RunScreen in `src/app/screens/Lesson.tsx` is split into shared pieces: board area, step text, step
  actions, and dock.
- Desktop (`md` and wider) composes the pieces exactly as today.
- Phone composes them into an instruction panel and a `BoardSheet`, a fixed panel that rests with its top
  edge peeking and slides up.
- Pure decisions (reading pause, drag outcome, dock highlight) live in `src/app/lesson/sheet.ts` so jsdom
  can test them. Layout and gestures are proven in Playwright on the phone project.

**Tech Stack:** React 19, Tailwind 4, react-aria-components, Vitest/jsdom, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-26-lesson-phone-layout-design.md` (mockups in
`docs/superpowers/specs/lesson-phone-layout/`).

## Global Constraints

- **Phone** means narrower than `md`: `matchMedia('(max-width: 767.98px)')`. jsdom has no matchMedia, so it
  is desktop, and existing app tests keep the desktop layout.
- **Copy:**
  - pl: handle "✓ Rozumiem · pociągnij planszę ⌃", flash "✓ Rozumiem!", button names "Rozumiem, pokaż
    planszę" and "Pokaż instrukcję".
  - en: "✓ Got it · pull the board up ⌃", "✓ Got it!", "Got it, show the board", "Show the instructions".
- **Reading pause:** about 1 s per line, clamped to 1000–5000 ms. One line is 40 characters of step text plus
  prompt.
- **Drag:** the sheet goes up past 1/3 of the travel, or on a flick faster than 0.5 px/ms upward. The same
  rule applies downward. A tap toggles.
- **What drags the sheet:** only the handle (resting) and the strip (up). A drag on squares never moves it.
- **Reduced motion:** no nudge or glow, and the sheet jumps. tokens.css already strips animations; the drag
  must still work.
- **New steps:** every step change (Dalej, Wstecz, address) opens on the instruction panel.
- **Dalej** is only in the dock on phones. ◀ Wstecz (previous step) is on the instruction panel.
- The TopBar is covered while the sheet is up. The strip shows ⌄, the start of the step text, and "n/m".
- **Question prompt:** in full on the instruction panel and again above the answers on the sheet.
- **No new browser storage.** Sheet state is component state only.
- Desktop and tablet layout unchanged.
- **Commits:** identity "Damian Ospara <1453374+damian0o@users.noreply.github.com>", trailers
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01P7r4y9XCRV4NafGyZ61FWC`. Branch `lesson-phone-layout`.

## Review Focus

1. **Turning the phone, or a window resized across 768 px, mid-step.** The layout switches, and the run (ply,
   answers) is kept, because it lives in the store. Test in Task 3.
2. **Instruction text taller than the screen** (long step plus prompt on 360×640). The panel scrolls above the
   peek, and the handle stays reachable. Test in Task 5.
3. **Step change while the sheet is up** (Dalej). Focus lands on the new step's text, not on a hidden
   element. Test in Task 3.
4. **Find-the-move on the sheet:** tapping and dragging on squares plays the move and leaves the sheet up.
   Test in Task 5.
5. **Finishing a lesson** (Zakończ ✓ in the dock) and a Recognise round on the phone both complete
   normally. Test in Task 5.

---

### Task 1: Pure sheet decisions

**Files:**
- Create: `platform/src/app/lesson/sheet.ts`
- Test: `platform/tests/app/sheet.test.ts`

**Interfaces:**
- Produces:
  - `readingPauseMs(text: string): number`
  - `sheetAfterDrag(start: 'up' | 'down', dy: number, travel: number, vy: number): 'up' | 'down'`.
    `dy` is pixels moved, with negative meaning upward. `vy` is px/ms, with negative meaning upward.
  - `dockHighlight(run: LessonRun): 'play' | 'next' | null`

- [ ] **Step 1: Write the failing tests**

```ts
import { readingPauseMs, sheetAfterDrag, dockHighlight } from '../../src/app/lesson/sheet';
test('reading pause: ~1 s a line of 40 characters, 1–5 s', () => {
  expect(readingPauseMs('x'.repeat(10))).toBe(1000);
  expect(readingPauseMs('x'.repeat(120))).toBe(3000);
  expect(readingPauseMs('x'.repeat(1000))).toBe(5000);
});
test('drag: a third of the way or a flick decides; else it springs back', () => {
  expect(sheetAfterDrag('down', -300, 700, 0)).toBe('up');
  expect(sheetAfterDrag('down', -100, 700, 0)).toBe('down');
  expect(sheetAfterDrag('down', -60, 700, -0.8)).toBe('up');
  expect(sheetAfterDrag('up', 300, 700, 0)).toBe('down');
  expect(sheetAfterDrag('up', 100, 700, 0)).toBe('up');
  expect(sheetAfterDrag('up', 40, 700, 0.9)).toBe('down');
});
test('dock highlight: ▶ while a playTo step waits, Dalej when open, nothing while a question or task is open', () => {
  // build runs with startLesson on fixture lessons (see tests/lessons.test.ts): playTo step → 'play';
  // after report ply to playTo → 'next'; a step with an unanswered question → null; a solve step unrevealed → null
});
```
The third test builds its runs like `tests/lessons.test.ts`: a `step(...)` fixture and
`startLesson(L, kid)`.

- [ ] **Step 2:** `npx vitest run tests/app/sheet.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the three functions in `sheet.ts`.
  - `readingPauseMs = clamp(ceil(len/40)*1000, 1000, 5000)`.
  - `dockHighlight`: `gate?.kind === 'play'` → `'play'`; `!gate` → `'next'`; otherwise `null`.
- [ ] **Step 4:** Rerun. Expected: PASS.
- [ ] **Step 5:** Commit "Lesson sheet: reading pause, drag outcome and dock highlight".

### Task 2: Split RunScreen into shared pieces (no visible change)

**Files:**
- Create: `platform/src/app/lesson/LessonDock.tsx`
- Create: `platform/src/app/lesson/StepText.tsx`
- Modify: `platform/src/app/lesson/StepCard.tsx`
- Modify: `platform/src/app/lesson/Question.tsx`
- Modify: `platform/src/app/screens/Lesson.tsx`
- Test: existing `tests/app/*.test.tsx` (they must stay green). New `tests/app/lessonpieces.test.tsx`.

**Interfaces:**
- Produces:
  - `StepText({ run }: { run: LessonRun; withPrompt?: boolean })`: explain, solve task line, play hint, and
    the question prompt when `withPrompt`.
  - `Question({ run, onAnswer, showPrompt = true })`: `showPrompt=false` omits the prompt line.
  - `StepActions({ run, solve, onAnswer, onReveal, showPrompt })`: Question plus SolveStatus, moved out of
    StepCard.
  - `LessonDock({ run, gameLength, movesLocked, onPly, onNext, highlight }: { highlight: 'play' | 'next' | null })`:
    renders ◀ ▶ "Ruch n z m" when `gameLength > 0`, and Next or Finish. The highlighted button gets
    `data-highlight="true"` and a ring (`ring-4 ring-accent-2`).
  - `StepCard` keeps its props and is now composed from `StepText` and `StepActions`.

- [ ] **Step 1: Failing test** `tests/app/lessonpieces.test.tsx`.
  - Render `LessonDock` for a playTo run at ply 0. ▶ (name "Następny ruch") has
    `data-highlight="true"`, Next is disabled with no highlight.
  - At ply 5, Next has `data-highlight`.
  - Render `Question` with `showPrompt={false}` on the scholars-mate s06 run. The prompt text is absent and
    the answer group is present.
- [ ] **Step 2:** `npx vitest run tests/app/lessonpieces.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Extract the pieces. Desktop RunScreen renders the same DOM order as today.
- [ ] **Step 4:** `npm run check`. Expected: all tests pass, including the new file.
- [ ] **Step 5:** Commit "Lesson: split the step screen into shared pieces".

### Task 3: Phone layout: instruction panel and BoardSheet (tap only)

**Files:**
- Create: `platform/src/app/lesson/useIsPhone.ts`
- Create: `platform/src/app/lesson/BoardSheet.tsx`
- Create: `platform/src/app/lesson/PhoneRun.tsx`
- Modify: `platform/src/app/screens/Lesson.tsx`
- Modify: `platform/src/core/i18n/messages/pl.ts`
- Modify: `platform/src/core/i18n/messages/en.ts`
- Test: `platform/tests/app/phonelesson.test.tsx`

**Interfaces:**
- Consumes: Task 2 pieces, `dockHighlight`.
- Produces:
  - `useIsPhone(): boolean`. It listens to `(max-width: 767.98px)` and returns false without matchMedia.
  - `BoardSheet({ up, onUp, onDown, strip, counter, children, dock }: { up: boolean; onUp: () => void; onDown: () => void; strip: string; counter: string; children: ReactNode; dock: ReactNode })`.
    It has a `data-sheet={up ? 'up' : 'down'}` root. When down, it shows the handle button (name
    `t('sheetOpen')`). When up, it shows the strip button (name `t('sheetClose')`), the counter, the
    children, and the dock.
  - i18n keys: `sheetHandle`, `sheetFlash`, `sheetOpen`, `sheetClose` (copy in Global Constraints).

- [ ] **Step 1: Failing tests** `tests/app/phonelesson.test.tsx`. Before mount, stub
  `window.matchMedia = (q) => ({ matches: q.includes('max-width'), addEventListener(){}, removeEventListener(){} })`.
  - **A step opens on the instruction:** the step text is visible, `data-sheet="down"`, and the board
    panel's container has `inert`.
  - **The handle opens the sheet:** pressing "Rozumiem, pokaż planszę" gives `data-sheet="up"`. The
    instruction panel gets `inert`, and focus is inside the sheet.
  - **The strip closes it:** pressing "Pokaż instrukcję" gives `data-sheet="down"`, and focus is on the step
    text.
  - **Dalej resets:** open the sheet on scholars-mate s02, press Dalej. Now on s03, `data-sheet="down"`, and
    focus is on the step text (Review Focus 3).
  - **The prompt is on both panels:** on s06 the prompt text appears in the instruction panel and above the
    answers in the sheet. The strip shows the start of the step text, not the prompt.
  - **Resize keeps the run:** on Lasker s07, press ▶ once in the dock (ply 23). Flip the stub to desktop
    and fire the change listener. The desktop layout renders and the store ply is still 23 (Review Focus 1).
- [ ] **Step 2:** `npx vitest run tests/app/phonelesson.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement `useIsPhone`, `BoardSheet` (no drag yet: buttons only), `PhoneRun`, and the
  RunScreen switch.
  - PhoneRun's instruction panel: TopBar, `StepText withPrompt`, then the ◀ Wstecz button.
  - The sheet's children: board, `StepActions showPrompt`, view picker, legend, pieces toggle, MoveStrip.
  - Sheet `up` state is reset by `useEffect` on `run.step.id`.
  - The hidden panel gets `inert`.
- [ ] **Step 4:** Rerun. Then run `npm run check`. Expected: PASS everywhere.
- [ ] **Step 5:** Commit "Lesson on a phone: instruction first, board sheet with dock".

### Task 4: Drag, reading pause glow, and Rozumiem flash

**Files:**
- Modify: `platform/src/app/lesson/BoardSheet.tsx`
- Create: `platform/src/app/lesson/sheet.css`, imported from `platform/src/app/styles.css`
- Test: `platform/tests/app/phonelesson.test.tsx` (add)

**Interfaces:**
- Consumes: `sheetAfterDrag`, `readingPauseMs`.
- Produces:
  - BoardSheet prop `pauseMs: number`.
  - Root `data-glow="true"` once the pause has passed while down.
  - Flash element `[data-sheet-flash]` shown for 700 ms after opening.

- [ ] **Step 1: Failing tests** (fake timers, matchMedia stubbed as phone):
  - **Glow after the pause:** no `data-glow` at open. After `vi.advanceTimersByTime(readingPauseMs(text))`,
    `data-glow="true"`.
  - **A drag past a third opens it:** pointerdown on the handle (clientY 800), pointermove to 500,
    pointerup. Result: `data-sheet="up"`, and "✓ Rozumiem!" is shown.
  - **A short drag springs back:** pointerdown 800, move 760, up. `data-sheet="down"`.
  - **The board never drags the sheet:** pointerdown on `[data-square="e2"]`, move up 300, up.
    `data-sheet` is unchanged.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement pointer handlers on the handle and strip only.
  - Use `setPointerCapture`, follow the finger with `transform: translateY`, and track velocity over the last
    move.
  - On release, call `sheetAfterDrag`. Travel is the sheet's resting offset.
  - A move under 6 px counts as a tap and toggles.
  - In `sheet.css`, define the slide transition (.45s), `@keyframes cv-nudge`, and the edge glow under
    `[data-glow]`. The global reduced-motion rule already removes them.
- [ ] **Step 4:** Rerun the file, then `npm run check`. Expected: PASS.
- [ ] **Step 5:** Commit "Board sheet: pull to open, reading pause glow, Rozumiem flash".

### Task 5: Fit on short phones and prove it in the browser

**Files:**
- Modify: `platform/src/app/lesson/PhoneRun.tsx` (board size)
- Modify: `platform/src/app/lesson/sheet.css`
- Modify: `platform/e2e/helpers.ts`
- Create: `platform/e2e/phone-lesson.spec.ts`
- Modify: any phone e2e spec that fails because the sheet now covers the board

**Interfaces:**
- Produces: `openBoard(page: Page): Promise<void>` in `e2e/helpers.ts`. It clicks "Rozumiem, pokaż planszę"
  when it is visible and does nothing otherwise. `answerStep` and `pressNext` call it first.

- [ ] **Step 1: Failing e2e** `e2e/phone-lesson.spec.ts`, phone project only (`test.skip` on laptop), at
  390×844 and at 360×640 via `page.setViewportSize`:
  - **Instruction in view:** open scholars-mate s01 and Lasker s03. The step text's bounding box lies within
    the viewport, and the handle is visible.
  - **After openBoard:** the board, the answers (s06 group) and the dock's Next are fully inside the viewport
    at both sizes.
  - **Long text:** at 360×640 the instruction panel scrolls, and the handle stays visible at the bottom
    (Review Focus 2).
  - **Find-the-move on the sheet** (scholars-mate s13 after openBoard): click a7, then a6. The engine
    verdict appears and `data-sheet` is still "up" (Review Focus 4).
  - **Laptop unchanged** (laptop project): Lasker s07 has the card to the right of the board (card x >
    board x), and there is no `[data-sheet]`.
  - **Finishing and Recognise:** walking a lesson to the end with the helpers lands on home. A Recognise
    round reaches its end screen (Review Focus 5). Reuse the existing spec helpers.
- [ ] **Step 2:** `npm run build && npx tsx scripts/assemble-site.ts && npx playwright test e2e/phone-lesson.spec.ts`.
  Expected: the fit checks fail at 360×640 before sizing, or the spec fails because of missing pieces.
- [ ] **Step 3:** Size the sheet's board to
  `min(100vw - 16px, 100dvh - strip - dock - 120px)` with a CSS custom property on the sheet. The middle
  region (`overflow-y:auto`) scrolls on its own. Add `openBoard` and wire it into the helpers.
- [ ] **Step 4:** `npx playwright test`. Fix each failing phone spec by calling `openBoard(page)` before it
  touches the board or the dock. Expected: all pass (3 skipped, as before, plus the new laptop skips).
- [ ] **Step 5:** `npm run check`. Expected: PASS.
- [ ] **Step 6:** Commit "Lesson on a phone: fit short screens, browser tests".
