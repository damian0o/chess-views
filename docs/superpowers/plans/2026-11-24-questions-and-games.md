# Questions, game lessons and recognition rounds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lesson steps can ask questions (choice or tap, try again until right); lessons are split into moments; four famous-game lessons; a "Recognise" round built from finished lessons asks "which game, which moment?".

**Architecture:** Pure rules in `lessons.js` (resolving the new step fields, the answer gate, checking an answer, validating a lesson, building a seeded round); page wiring in `index.html` (question UI in the step bar, tap interception, blocks steps, the Recognise card and pseudo-lesson); content in `positions.json`. A test-only copy of chess.js lets `npm test` replay every PGN.

**Tech Stack:** Vanilla ES modules, chess.js 1.0.0 (CDN on the page, vendored for tests), `node --test`, Playwright (Python) checks in `tests/browser/`.

**Spec:** `docs/superpowers/specs/2026-11-24-questions-and-games-design.md` (builds on `docs/superpowers/specs/2026-11-23-lessons-design.md`).

## Global Constraints

- Static page, no build step, no new runtime dependencies; `npm test` = `node --test`; browser checks at 390 × 844 via `python3 tests/browser/run.py http://localhost:8080/`.
- `positions.json` keeps its hand-formatted style: one step per line; edit by exact string insertion, never `json.dump` the whole file.
- `say` ≤ 220 characters; `ask.q` ≤ 80 characters; each answer label ≤ 32 characters; 2–4 choices (yes/no is the 2-choice case).
- Only stored record: `chess-views:lessons` progress. Rounds and answers are never saved.
- Copy: short, plain, sentence case; no exclamation marks except "Right!".
- After changing `lessons.js` run `npm run stamp` (it is in `ASSETS`).
- Commits use `git -c user.name="Damian Ospara" -c user.email="1453374+damian0o@users.noreply.github.com"` and end with the two attribution lines (`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, `Claude-Session: https://claude.ai/code/session_01P7r4y9XCRV4NafGyZ61FWC`).

## Review Focus

1. A tap answer in a view with its own square handlers (Knight, Territory, Roads, Board piece preview) must not also select, move or tint anything — Task 3 check.
2. A reload, or Back then Next, on a question step re-asks the question with no answer marked; a blocks step hides the pieces again — Task 3 check.
3. A Recognise link with a missing, non-integer or negative `seed`, or with too few finished lessons, shows the toast "That lesson is not here" and no bar, never a broken round — Task 5 check.
4. Progress saved by the old 17-step Scholar's mate (`done: true`, or `step` beyond the new length) still opens and still counts as finished for the unlock rule — Task 6 check.
5. Answer buttons stay readable in dark mode and wrap without horizontal overflow at 390 px — Task 3 check.

---

### Task 1: Test-only chess.js and the lesson validator

**Files:**
- Create: `tests/vendor/chess.js` (chess.js 1.0.0, `https://cdn.jsdelivr.net/npm/chess.js@1.0.0/dist/esm/chess.js`, plain download)
- Modify: `lessons.js` (add `validateLesson`)
- Modify: `tests/library.test.js` (call the validator for every lesson; pin the vendored file's SHA-256)
- Test: `tests/lessons.test.js`

**Interfaces:**
- Produces: `validateLesson(lesson, positions, Chess) -> string[]` (empty when valid; each string starts with `"<lesson id> step <n>: "` or `"<lesson id>: "`). Takes `Chess` as a parameter so `lessons.js` stays free of imports.

Rules it enforces (on top of what `tests/library.test.js` checks today, which moves into it):
- every `pgn` source (step, moment, or via `pos`) loads in `Chess` and has at least `ply` moves; `ply` is an integer ≥ 0;
- `moments` (optional): 2–4 entries, unique `id` (`/^[a-z0-9-]+$/`), `name` non-empty, exactly one position field (`fen`|`pgn`+`ply`|`pos`); `game` required when `moments` exist; `looksLike` entries match `/^[a-z0-9-]+\/[a-z0-9-]+$/`;
- `step.moment` names one of the lesson's moments;
- `step.ask`: `q` 1–80 chars; either `choices` (2–4 strings, each 1–32 chars) with integer `answer` in range, or `tap` (non-empty array of `/^[a-h][1-8]$/`), never both; `right` optional ≤ 120 chars;
- `step.recall: true`: needs `moment`, has no position field (`fen`/`pgn`/`pos`/`same`), and `ask.choices` is exactly `["Yes","No"]` with `answer: 0`;
- `step.blocks: true` (or `recall`): `view` is `shapes` and an `ask` exists;
- every other step has exactly one position field, as today.

- [ ] **Step 1:** Download the vendored file; add to `tests/library.test.js` a pin test `library: the test copy of chess.js is 1.0.0` asserting its SHA-256 equals the value you compute right after downloading (record the value in the test).
- [ ] **Step 2: Write the failing tests** in `tests/lessons.test.js`, importing `Chess` from `./vendor/chess.js`:
  - `validateLesson: the shipped lessons are valid` → `[]` for every lesson in `positions.json`;
  - `validateLesson: an illegal pgn is reported` (a step `{"pgn":"1. e4 e5 2. Ke3","ply":3,...}`) → one error containing `step 1`;
  - `validateLesson: a ply beyond the game is reported`;
  - `validateLesson: a recall step with its own position is reported`;
  - `validateLesson: a recall step whose answer is not Yes is reported`;
  - `validateLesson: an unknown moment is reported`;
  - `validateLesson: 5 choices, an out-of-range answer, a 33-char label, choices with tap, and a bad tap square are each reported`;
  - `validateLesson: blocks outside Shapes is reported`.
- [ ] **Step 3:** Run `node --test tests/lessons.test.js` — Expected: FAIL, `validateLesson` is not exported.
- [ ] **Step 4:** Implement `validateLesson`. Make `tests/library.test.js`'s `lessons are well formed` assert `validateLesson(L, lib.positions, Chess)` is `[]` and drop the rules that moved.
- [ ] **Step 5:** Run `npm test` — Expected: all pass (count = previous 120 + new).
- [ ] **Step 6:** `npm run stamp`; commit `Lessons: validator replays every PGN with a test copy of chess.js`.

### Task 2: Resolving questions, and the answer gate

**Files:**
- Modify: `lessons.js` (`resolveSteps`, `nextGate`; add `checkAnswer`)
- Test: `tests/lessons.test.js`

**Interfaces:**
- Consumes: lesson data as validated in Task 1.
- Produces:
  - `resolveSteps` adds to each step: `moment` (`{ id, name } | null`), `ask` (`{ q, choices, answer, tap, right } | null`, with `choices`/`tap` null when absent and `right` defaulting to `"Right!"`), `blocks` (boolean; true for `blocks` or `recall`). A `recall` step's `source` is its moment's position source. A step after a recall step using `same` copies the recall step's source.
  - `nextGate(step, now)` takes `now.answered` (boolean). Order: view → hidden-move reveal → answer (`{ kind: 'answer', text: 'Answer first' }` when `step.ask && !now.answered`) → Shapes reveal (only when `step.shapesGate && !step.ask`).
  - `checkAnswer(ask, value) -> boolean`: `value` is a choice index (number) or a square (string).

- [ ] **Step 1: Write the failing tests:**
  - `resolveSteps: a recall step takes its moment's board` (source deep-equals the moment's resolved source; `blocks === true`);
  - `resolveSteps: ask defaults` (`right === 'Right!'`, `tap === null` for a choice question);
  - `nextGate: a question waits for the answer` → `{ kind: 'answer', text: 'Answer first' }`, and `null` once `answered: true`;
  - `nextGate: the view gate comes before the answer gate`;
  - `nextGate: a blocks step with a question never asks for Reveal pieces`;
  - `checkAnswer: choice index and tap square` (`checkAnswer({choices:['a','b'],answer:1},1) === true`, `…,0) === false`, `checkAnswer({tap:['d8','e8']},'e8') === true`, `'d7'` false).
- [ ] **Step 2:** Run `node --test tests/lessons.test.js` — Expected: the new tests FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` — Expected: all pass.
- [ ] **Step 5:** `npm run stamp`; commit `Lessons: questions, recall steps and the answer gate`.

### Task 3: Questions on the page

**Files:**
- Modify: `index.html` (state, `gotoStep`, `renderLesson`, `render`, Shapes view, CSS)
- Create: `tests/browser/questions_check.py`
- Modify: `tests/browser/README.md` (list the new check)

**Interfaces:**
- Consumes: Task 2's step fields, `nextGate(step, { …, answered })`, `checkAnswer`.
- Produces: `state.answer = { wrong: [], right: false }`, reset in `gotoStep`; `window.__viewer` unchanged in shape.

Behaviour (spec "The page"):
- Under the step text: `p.ask` with the question; then `div.choices` of `button.choice` (one per choice, `data-i`), or `p.taphint` "Tap a square on the board". Below: `p.askline` with "Try again" after a wrong answer, or the `right` line after the right one.
- Wrong choice: button gets class `wrong` and `disabled`. Right choice: class `right`; all choices disabled.
- Tap question pending: after the view renders, add a **capture-phase** `click` listener on `#view` that, for a target inside `.board .sq`, calls `stopImmediatePropagation()` and `preventDefault()`, then checks `dataset.square`. Wrong: add class `tapwrong` to that square for 600 ms, "Try again". Right: class `tapright`, the right line. The view's own handlers never see the tap.
- Blocks step: on entry `state.tab = 'shapes'` (like `shapesGate`); the Shapes "Reveal pieces" button is hidden until `state.answer.right`.
- Step bar title: `<lesson name> · <moment name> · <n> of <total>` when the step has a moment.
- CSS: answer buttons wrap (`flex-wrap`), min touch height 44 px, use existing tokens; `.wrong` crossed style, `.right` the existing "good" colour; both readable under dark mode.

- [ ] **Step 1: Write the failing check** `questions_check.py` against a test lesson injected through `__viewer` (push a lesson object into `__viewer.library.lessons` and call `__viewer.enterLesson`), so it does not depend on Task 6/7 content. Checks:
  - choice: Next reads "Answer first" and is disabled; a wrong tap → that button `.wrong` + disabled, "Try again", Next still disabled; the right one → `.right`, the `right` line, Next enabled;
  - tap question in **Knight** view (Review Focus 1): tapping a wrong square shows "Try again" and `__viewer.state.knightSquare` is unchanged; the right square opens Next; no `.focused` square appears in Territory for a tap question there;
  - blocks/recall step: opens in Shapes with no `.piece` and no `button.reveal` until answered; after the right answer `button.reveal` appears;
  - Review Focus 2: reload on a question step → no `.right`/`.wrong`, Next "Answer first"; Back then Next re-asks; a blocks step shows blocks again;
  - Review Focus 5: dark scheme (`color_scheme="dark"`) — answer button text contrast ratio ≥ 4.5 against its background (reuse the luminance helper in `dark_check.py`); `scrollWidth == 390` with four 32-char labels;
  - no page errors.
- [ ] **Step 2:** Run `python3 tests/browser/run.py http://localhost:8080/ questions` — Expected: FAIL (no `.choices`).
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the check — Expected: ALL PASS; then the full browser pass — Expected: 16/16.
- [ ] **Step 5:** Commit `Lessons: questions in the step bar, tap answers, blocks-first boards`.

### Task 4: The round generator

**Files:**
- Modify: `lessons.js` (add `usableMoments`, `buildRound`)
- Test: `tests/lessons.test.js`

**Interfaces:**
- Consumes: `resolveSteps`-style source resolution for moment boards.
- Produces:
  - `ROUND_ID = 'recognise'`, `ROUND_SIZE = 8`, `MIN_USABLE = 4`.
  - `usableMoments(lessons, positions, doneIds: Set<string>) -> Array<{ key, lessonId, momentId, label, source }>` — moments of finished lessons that have `moments`, each with at least 2 allowed distractors among the other finished moments (`label` = `"<game>: <moment name>"`, `key` = `"<lessonId>/<momentId>"`). Allowed = different key, not linked by `looksLike` in either direction.
  - `roundUnlocked(lessons, positions, doneIds) -> boolean` — at least two finished lessons with moments **and** `usableMoments(...).length >= MIN_USABLE`.
  - `buildRound(lessons, positions, doneIds, seed: integer) -> { id: 'recognise', name: 'Recognise', steps } | null` — null when not unlocked. `steps` are resolved steps (same shape as `resolveSteps` output): `min(ROUND_SIZE, usable.length)` distinct moments in seeded order; each step `{ source, view: 'shapes', blocks: true, ask: { q: 'Which game, which moment?', choices, answer, right: 'Right!' }, say: 'Open **Shapes**. Board <i> of <n>. Which game, which moment? Answer, then press Reveal pieces if you want to check.' , moment: null, sq: null, solve: false, flip: false }`. Choices: the right label plus up to 3 allowed distractors, preferring other moments of the same lesson first, then other lessons, at least 2; shuffled with the seed. Use a small seeded PRNG (mulberry32) — same seed, same round.

- [ ] **Step 1: Write the failing tests** with fixture lessons (not `positions.json`):
  - `usableMoments: unfinished lessons never count`;
  - `usableMoments: lessons without moments never count`;
  - `usableMoments: a moment whose only others are looksLike is not usable` (both directions);
  - `roundUnlocked: needs two finished lessons and four usable moments`;
  - `buildRound: the same seed gives the same round, another seed another order`;
  - `buildRound: every question has 3 or 4 distinct choices, the right one included, no looksLike pair together`;
  - `buildRound: same-lesson moments are offered first as wrong answers`;
  - `buildRound: returns null when locked`.
- [ ] **Step 2:** Run `node --test tests/lessons.test.js` — Expected: FAIL, not exported.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test` — Expected: all pass.
- [ ] **Step 5:** `npm run stamp`; commit `Lessons: seeded recognition rounds from finished lessons`.

### Task 5: Recognise on the page

**Files:**
- Modify: `index.html` (`enterLesson`, `writeHash`, `loadLibrary`, `gotoStep`, `finishLesson`, `renderLessonsShelf`)
- Create: `tests/browser/recognise_check.py`

**Interfaces:**
- Consumes: `buildRound`, `roundUnlocked`, `ROUND_ID`, Task 3's question UI.
- Produces: link form `#lesson=recognise&seed=<n>&step=<i>[&view=…]`; `state.lesson.seed`.

Behaviour:
- `enterLesson('recognise', index, { seed })` builds the round from `progress.all()` done ids; `null`, a non-integer or negative seed → toast "That lesson is not here", return false. `state.lesson.done = true` (all views open). `progress.set` is skipped for the round.
- Shelf: a "Recognise" card after the lessons. Locked: disabled Start and the line "Finish two game lessons to unlock". Unlocked: about "Which game, which moment? Boards from the lessons you finished." and a Start that picks a new seed (`Math.floor(Math.random() * 2**31)`).
- The last board's Next reads "Finish ✓"; finishing toasts "Round finished" and leaves the round; nothing is stored.

- [ ] **Step 1: Write the failing check** (seed progress with `localStorage.setItem('chess-views:lessons', …)` before load; use fixture lessons injected via `__viewer` if Task 7 content is not in yet — the check must pass on either):
  - locked shelf card with the unlock line when nothing is finished;
  - unlocked: Start opens "1 of N", Shapes, blocks only, three or four `button.choice`, link carries `lesson=recognise&seed=`;
  - reload keeps the same board and choices (same seed);
  - a wrong answer → "Try again"; the right one opens Next; finishing → toast "Round finished", no bar, `localStorage` unchanged;
  - Review Focus 3: `lesson=recognise` with no seed, `seed=abc`, `seed=-1`, and a valid seed with nothing finished → toast "That lesson is not here", no bar;
  - no page errors.
- [ ] **Step 2:** Run `python3 tests/browser/run.py http://localhost:8080/ recognise` — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it — Expected: ALL PASS; full browser pass — Expected: 17/17.
- [ ] **Step 5:** Commit `Recognise: a round of boards from finished lessons`.

### Task 6: Questions and moments in the two existing lessons

**Files:**
- Modify: `positions.json` (`scholars-mate`, `eyes-on-f7`)
- Modify: `tests/library.test.js` (the two lesson-shape tests), `tests/browser/lessons_check.py` (step counts and walk-through)

**Interfaces:**
- Consumes: Task 1 field rules.

Content (spec "Existing lessons"):
- `scholars-mate`: `game: "Scholar's mate"`; moments `attack` ("the attack on f7", board = after `3. Qh5`), `defence` ("the defence", board = after `3... g6`), `mate` ("the mate", board = after `4. Qxf7#`). Keep the current steps; add, per moment, 1–2 questions and one recall yes/no plus one "No" blocks board (a near miss, e.g. queen still at home). Required questions: tap "Tap the square it strikes." (`tap: ["f7"]`) asked in **Board** (never in Territory with f7 focused); choice "Which move stops the mate?" with `["g6", "a6", "h6"]`, answer 0. Keep ≤ 30 steps.
- `eyes-on-f7`: no moments. Each of the ten boards becomes a blocks step with a choice question "Where do two pieces aim?" `["f7", "f2", "Neither"]`. Answers by board: 2 (bishop alone), 4 (queen alone) and 6 (queen on e2) are "Neither"; 9 and 10 are "f2"; 1, 3, 5, 7 and 8 are "f7" (8 is aimed but defended: the answer step says so). The answer step after each board stays.
- Saved progress beyond the new length clamps (shelf already uses `Math.min`); `enterLesson` with a saved step beyond the length opens the last step.

- [ ] **Step 1:** Update the tests first: `library.test.js` Scholar's test asserts the moments `['attack','defence','mate']`, at least one tap question with `["f7"]` on a `board` step, the stop question's choices; Eyes test asserts ten blocks steps with the three choices and the answer indices above. `lessons_check.py` walk-through answers each question. Add Review Focus 4 to `lessons_check.py`: `localStorage` `{"scholars-mate":{"step":17,"done":true}}` → shelf shows "✓ finished" and Continue/Start over work; `{"scholars-mate":{"step":40,"done":false}}` → Continue opens the last step.
- [ ] **Step 2:** Run `npm test` and the lessons check — Expected: FAIL on the new assertions.
- [ ] **Step 3:** Edit `positions.json` by exact string insertion; clamp a saved step in the shelf's Continue if needed.
- [ ] **Step 4:** Run `npm test` and the full browser pass — Expected: all pass.
- [ ] **Step 5:** Commit `Lessons: questions and moments for Scholar's mate and Eyes on f7`.

### Task 7: The four game lessons

**Files:**
- Modify: `positions.json` (lessons `opera-game-lesson`, `legal-mate`, `reti-tartakower`, `lasker-thomas`; library entries for the three new games tagged `game`)
- Modify: `tests/library.test.js`, `tests/browser/lessons_check.py` (walk each new lesson to Finish)

Games (verify each against a reliable source and by replay — Task 1's validator does the replay):
- Opera game: the existing `opera-game` entry (`pos`).
- Légal vs Saint Brie, Paris 1750: `1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#`.
- Réti vs Tartakower, Vienna 1910: `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 5. Qd3 e5 6. dxe5 Qa5+ 7. Bd2 Qxe5 8. O-O-O Nxe4 9. Qd8+ Kxd8 10. Bg5+ Kc7 11. Bd8#`.
- Edward Lasker vs Thomas, London 1912: `1. d4 e6 2. Nf3 f5 3. Nc3 Nf6 4. Bg5 Be7 5. Bxf6 Bxf6 6. e4 fxe4 7. Nxe4 b6 8. Ne5 O-O 9. Bd3 Bb7 10. Qh5 Qe7 11. Qxh7+ Kxh7 12. Nxf6+ Kh6 13. Neg4+ Kg5 14. h4+ Kf4 15. g3+ Kf3 16. Be2+ Kg2 17. Rh2+ Kg1 18. Kd2#`.

Each lesson: `game`, 2–4 moments (suggested in the spec's "Left to the builder"), per moment the cycle show (2–3 views) → 1–2 questions → recall yes/no → one "No" blocks board; ≤ 30 steps. `looksLike`: mark the Réti mate and the Opera mate as look-alikes only if their blocks really look alike (compare the two Shapes boards); Légal's mate and Scholar's mate mates both strike next to the king — decide by looking, record the decision in the ledger.

- [ ] **Step 1:** Tests first: `library.test.js` `library: four game lessons with moments` (ids present, each has `game` and 2–4 moments, every moment board replays); `lessons_check.py` walks each lesson answering every question and reaches Finish with no page errors; with all four finished, `__viewer` round for a fixed seed has 8 boards and every question 3–4 choices.
- [ ] **Step 2:** Run — Expected: FAIL (lessons missing).
- [ ] **Step 3:** Write the data.
- [ ] **Step 4:** `npm test` and full browser pass — Expected: all pass.
- [ ] **Step 5:** Commit `Lessons: Opera, Légal, Réti–Tartakower and the Lasker king hunt`.

### Task 8: README and the final pass

**Files:**
- Modify: `README.md` (Lessons section: questions, moments, Recognise; tests section: the vendored chess.js and the two new checks)

- [ ] **Step 1:** Update the README.
- [ ] **Step 2:** `npm run stamp`; `npm test` — Expected: all pass; `python3 tests/browser/run.py http://localhost:8080/` — Expected: 17/17.
- [ ] **Step 3:** Commit `README: questions, game lessons and Recognise`.
