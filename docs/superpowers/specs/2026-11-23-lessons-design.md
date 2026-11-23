# Lessons: a guided tour through the views, first lesson Scholar's mate

Date: 2026-11-23. Status: draft for approval.

## Intent

The library holds positions; a lesson holds a *path*. One idea, shown
through several of the app's views in a fixed order, so an 8-year-old sees
the same pattern as a weak square, as two roads, as a shape of blocks, and
as a count on one square, until it sticks. The kid moves themselves: each
step says which view to open, and the tour only continues once they have
found it. The first lesson also teaches the app.

The first lesson is the Scholar's mate: first make it, then stop it, then
recognise it from blocks.

## Goals

- A lesson is data in `positions.json`: ordered steps, each a position, a
  view, an optional selected square, one or two sentences, and whether the
  moves are hidden (a "find it, then press ▶" step).
- A step bar on the page: lesson name, "step 3 of 14", the step text,
  Back and Next. Next waits until the kid is in the step's view.
- The library gets a Lessons shelf above the positions.
- The link carries `lesson=<id>&step=<n>`.
- While a lesson is open, only the views the lesson has introduced so far
  are open; the other tabs are locked until the lesson is finished.
- Progress is remembered on the device: the last step reached and whether
  the lesson was finished, per lesson.
- Adding the second lesson is data only, validated by the test suite.

## Non-goals

- The Engine view and the evaluation line inside lessons (the first lesson
  does not use them; a later lesson may, through the same step fields).
- Any saved state beyond lesson progress: the library stays curated in the
  repo and positions are never stored in the browser. Lesson progress is
  the one deliberate exception to that rule.
- An authoring UI, branching, scores, timers, badges.
- Changing what the views themselves show; a lesson only drives them.

## Anti-goals

- A step that explains with words what the view already shows. The text
  points, the view shows.
- Trapping the kid: a step whose view they cannot find must still be
  escapable, and a wrong tap must never lose their place.
- Leaking an answer in a "find it" step: no arrows, no tinted squares, the
  move list hidden, exactly as the library problem behaves today.

## Constraints

- Static page, no build step, no new dependencies; `node --test` for data
  and pure logic; Playwright checks for the page; phone width 390 px.
- `positions.json` keeps its hand-formatted one-entry-per-block style.
- Copy in the app's voice: short, plain, sentence case, at most two
  sentences per step, the view's name in bold the first time a step asks
  for it.
- Existing links (`#pos=`, `#fen=`, `#pgn=`) behave exactly as before.

## Approaches considered

1. **Lessons as a first-class thing** (chosen): data shape, step bar, link
   parameter, Lessons shelf. The second lesson costs only data.
2. Chained library entries with "Next: …" in their notes. Nothing new in
   the page, but no sense of progress, the note vanishes once the position
   loads, and the kid can wander off between steps. Rejected.

## The lesson data

In `positions.json`, next to `positions`:

```json
"lessons": [
  { "id": "scholars-mate", "name": "Scholar's mate",
    "about": "Make the four-move mate, then learn to stop it, then spot its shape.",
    "steps": [
      { "pgn": "1. e4 e5 2. Bc4 Nc6 3. Qh5", "ply": 5, "view": "board",
        "say": "Three moves by White. Now look what they aim at." },
      { "same": true, "view": "kings",
        "say": "Open **King houses**. f7 is the weakest square in Black's house: only the king guards it." },
      …
    ] }
]
```

Step fields:

- Position: exactly one of `fen`, `pgn` (with `ply`), `pos` (a library
  entry id), or `same: true` (the previous step's position source; an
  optional `ply` then overrides the previous step's ply). `same` copies
  only the position, never `solve`, `task`, `sq`, `flip` or `shapes`.
- `view`: a view key (`board`, `territory`, `reach`, `roads`, `kings`,
  `engine`, `diamond`, `shapes`, `knight`).
- `sq`: optional selected square, applied as the link's `sq` is today
  (Territory square, Roads piece, Knight square).
- `solve`: optional `true`; the step's moves after `ply` are hidden and
  the move bar reads the step's `task` (one short line) in place of the
  PGN Event header; the kid finds the move on the board or on paper and
  presses ▶ to check. The step must have at least one move after `ply`.
- `task`: required when `solve` is true, e.g. "Find White's strike".
- `say`: the step text, one or two sentences, 220 characters at most.
  `**…**` marks bold; nothing else is interpreted.
- `shapes`: optional, for Shapes steps: `{ "reveal": false }` starts the
  Shapes view with the pieces hidden as blocks (the default) and the
  reveal button available, as the view works today. `{ "gate": true }`
  makes Next wait until the kid pressed Reveal pieces.
- `flip`: optional, default `false`. Every step applies its value, so a
  flip the kid made is reset on the next step. The first lesson leaves the
  board from White's side throughout, so the shape stays in the same
  place on the board while the kid changes sides.

Validation (`tests/library.test.js` grows a lessons block): ids unique and
kebab-case; every step has exactly one position source (`same` with an
optional `ply` counts as one); `pos` ids exist; `view` is a real view
(including `engine`); `sq` is a square; `solve` steps have a `task` and a
move after `ply`; `say` within length; a lesson has 3 to 30 steps; `same`
is never the first step; `shapes.gate` only on Shapes steps.

## The first lesson: Scholar's mate

Fourteen steps in three parts. Positions are PGN with ply unless noted;
"Black to move after 3.Qh5" is ply 5 of `1. e4 e5 2. Bc4 Nc6 3. Qh5`.

**Part 1: Make the mate**

1. Board, after 3.Qh5. "Three moves by White. Now look what they aim at."
2. King houses, same. "Open **King houses**. f7 is the weakest square in
   Black's house: only the king guards it."
3. Roads, same. "Open **Roads**. Two roads meet on f7: the bishop's from
   c4 and the queen's from h5."
4. Shapes, same, pieces as blocks. "Open **Shapes**. Forget the pieces and
   keep the shape: a big block on h5 and a small one on c4, both pointing
   at the square next to the king."
5. Territory, same, `sq: f7`. "Open **Territory**. f7 is attacked twice
   and defended once. If it were White's move: Qxf7, checkmate."
6. Board, `1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#`, ply 6, solve, task
   "Find White's strike". "Black played a careless move. Open **Board**,
   find the strike on the board or on paper, then press ▶."
7. King houses, `same: true, ply: 7`. "Open **King houses**. Checkmate:
   the king has no square to run to and nobody can take the queen."

**Part 2: Stop the mate**

8. Territory, after 3.Qh5, `sq: f7`, solve on
   `1. e4 e5 2. Bc4 Nc6 3. Qh5 g6`, ply 5, task "Stop the mate". "Open
   **Territory**. Black to move. Make f7 defended twice, or chase the
   queen away, then press ▶." After the reveal the step text does not
   change; the next step names the other answers.
9. Board, `same: true, ply: 6`. "g6 blocks the queen's road. Qe7, Qf6 and
   Nh6 also work: each one guards f7 or chases the queen."
10. Shapes, `1. e4 e5 2. Bc4 Nc6 3. Qh5 g6 4. Qf3`, ply 7. "Open
    **Shapes**. Same shape, the queen only moved. Where does it point?
    f7 again."
11. Board, same position, solve on
    `1. e4 e5 2. Bc4 Nc6 3. Qh5 g6 4. Qf3 Nf6`, ply 7, task "Defend
    again". "Open **Board**. Defend f7 once more, then press ▶. Keep
    watching f7 until you castle."

**Part 3: Spot the shape** (Shapes view with `shapes: { gate: true }`:
pieces as blocks, the kid says the answer out loud, presses Reveal pieces,
and only then does Next open the answer step)

12. Shapes, `1. e4 e5 2. Qh5 Nc6 3. Bc4`, ply 5. "Open **Shapes**. Is the
    mate shape here? Say which square it strikes, press Reveal pieces,
    then Next." Next step (12b) is Territory, same, `sq: f7`: "Yes: the
    same shape by another road. f7 again."
13. Shapes, `1. e4 e5 2. Nf3 Bc5 3. Nxe5 Qh4`, ply 6. Same instruction.
    Next step (13b) is Roads, same: "Yes, and it is coming at you: queen
    h4 and bishop c5 both point at f2, and Qxf2 would be checkmate. Guard
    f2 or chase the queen." (Verified with chess.js: Qxf2# is on.)
14. Shapes, `1. e4 e5 2. Bc4 Nc6 3. Nf3`, ply 5. Same instruction. Next
    step (14b) is Roads, same: "No. The queen is still at home, so only
    one road reaches f7. One attacker against one defender is no mate."

Step numbers above are the parts' logic; the data holds the "b" steps as
their own entries, so the lesson has 17 steps and the bar counts them.

## The step bar

A strip between the tabs row and the status line, present only while a
lesson is open:

```
 Scholar's mate · 3 of 17                                   ✕
 Open Roads. Two roads meet on f7: the bishop's from c4 and the queen's from h5.
 [◀ Back]                                                [Next ▶]
```

- **Next** is enabled only when every gate of the step is open, in this
  order of explanation: the kid is in the step's view ("Open Roads first"),
  on a `solve` step the hidden move has been revealed, `state.ply >
  step.ply` ("Press ▶ first"), on a gated Shapes step the pieces have been
  revealed ("Press Reveal pieces first"). Until then the button is
  disabled and carries that text. The wanted tab carries a gentle pulse
  (`.tabs [role=tab].wanted`, a two-second ring animation, honouring
  `prefers-reduced-motion`). The kid taps the tab themselves.
- On the last step Next reads **Finish ✓**: it records the lesson as
  finished, unlocks every tab, closes the bar, keeps the position and view,
  and toasts "Lesson finished".
- **Back** is always enabled except on step 1.
- **✕** leaves the lesson: the position and view stay as they are, all
  tabs unlock, the link loses `lesson`/`step`. Progress is kept.
- Moving to a step (Next, Back, a link) applies, in this order: position
  (and `solve`, hidden moves, `task`), `flip`, `sq`, Shapes reveal reset.
  Next and Back never switch the view: the kid does it. Entering a lesson
  (Start from the library, or a link without `view`) does switch to the
  step's view, so step 1 opens in Board.
- Changing position by any other means (Load, library, a `#pos=` link)
  leaves the lesson.

### Locked tabs

While a lesson is open, a tab is open only if the lesson has introduced
its view: the views of the steps up to and including the current one. The
others are drawn greyed with a small lock, `aria-disabled="true"`, and a
tap toasts "Finish the lesson to open this". When the lesson is finished
(now or on an earlier visit, per the saved progress), every tab is open
even while stepping through it again. Leaving with ✕ unlocks everything.

### Saved progress

One record per lesson in the browser's `localStorage`, key
`chess-views:lessons`, value `{ "<lesson id>": { "step": <n>, "done":
true|false } }`. `step` is the highest step reached; `done` is set by
Finish. Written on every step change and on Finish; read when the library
opens and when a lesson is entered. Every read and write is wrapped in
try/catch: with storage unavailable (private window, blocked site data)
the lesson behaves as session-only and nothing else changes. The Lessons
shelf shows "Continue from step 7" on a started lesson, a tick on a
finished one, and "Start over" next to either; "Start over" resets the
record for that lesson. Nothing else is ever stored.
- Arrow keys keep stepping through moves as today; Back/Next are buttons
  only.
- On a phone the bar is three short rows; the step text wraps; the
  buttons sit at the two ends.

## Links

- `#lesson=scholars-mate&step=3` opens that step. `fen`, `pgn`, `pos` and
  `sq` are ignored when `lesson` is present; the step provides the
  position and the selected square. `view` and `flip` are honoured when
  present, so a reload lands in the view the kid was in; without `view`
  the step's view is applied.
- While a lesson is open `writeHash` writes only `lesson`, `step`, `view`
  and `flip`.

## Library

The library dialog gets a "Lessons" shelf above the positions: one card
per lesson with name, `about`, step count, the saved progress (tick, or
"step 7 of 17") and a Start / Continue button plus "Start over" when
there is progress. Picking it opens the step and closes the dialog. The
search box also matches lessons by name and `about`; the tag chips filter
positions only.

## Accessibility and copy

- The bar is a `section` with `aria-label="Lesson"`; the step counter is
  `aria-live="polite"`.
- The disabled Next explains itself in its text.
- Bold is rendered as `<strong>`; no other markup.

## Documentation and tests

- README: a "Lessons" section after "Positions library" with the data
  fields and the first lesson's outline; the "How to use" link paragraph
  mentions `lesson=…&step=…`.
- Unit tests: the validation block above; the first lesson parses and
  every solve step's hidden move is legal (chess.js is not in node, so the
  test checks the `pgn` text has a move after `ply` and the browser check
  plays it).
- Browser checks: start from the library, bar present with "1 of 17" in
  Board, Next disabled until the right tab is tapped, pulse class on the
  wanted tab, locked tabs greyed and toasting, step 6 hides the moves and
  shows the task and Next says "Press ▶ first" until ▶ reveals Qxf7# with
  the status saying Checkmate, Territory steps land with f7 selected, the
  gated Shapes step keeps Next at "Press Reveal pieces first", the mirror
  step's Roads show the lines to f2, `#lesson=scholars-mate&step=5` reload
  lands on step 5 in Territory and a reload with `view=roads` stays in
  Roads with Next disabled, Finish on the last step unlocks the tabs and
  stores `done`, the library shows Continue and the tick after a reload,
  Start over clears it, a blocked `localStorage` (simulated by overriding
  it to throw) changes nothing visible, ✕ leaves the lesson, loading
  another position leaves it, and the phone layout has no horizontal
  overflow.

## Left to the builder

- The pulse animation details and the bar's exact spacing.
- How the step bar component shares code with the library dialog's cards.
- The exact mirror and near-miss PGNs if chess.js rejects a move in the
  browser check; the positions, not the wording, may be adjusted.
