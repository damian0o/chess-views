# Questions in lessons, famous-game lessons, and recognition rounds

Date: 2026-11-24. Status: draft for approval. Builds on
`2026-11-23-lessons-design.md`; everything that spec says still holds
unless this one changes it.

## Intent

Lessons today show and point; the kid presses Next and is never asked
anything. The user wants the kid to *learn and then prove it*: watch a
famous game (or a mate pattern) presented moment by moment through the
views, answer quick questions that repeat what was just shown, say whether
a board of blocks is the thing they just learned, and later, across
several lessons, name **which game and which moment** a board of blocks
comes from.

The why, in the user's words: "give presentation on game then quick
questions to repeat what just learn then answer yes or no if the shape is
the game we just learn and then harder multi lessons recognitions", "split
each lesson also to crucial moments", and "do the same for scholar and
similar mates". The app's strength is seeing (shapes, roads, houses), so
recognition is by shape, not by engine numbers.

## Goals

1. **Questions inside lessons.** A step may carry a question. Two kinds:
   - *choice*: 2 to 4 answer buttons (yes/no is the 2-button case; other
     questions use 3 or 4, as the user asked);
   - *tap*: "tap a square" on the board, one or more correct squares.
   Next stays locked until the right answer is given. A wrong answer says
   "Try again" (and the wrong button is marked); the kid tries until right.
   A right answer shows a short confirmation line.
2. **Moments.** A lesson is split into crucial moments (2 to 4 per lesson).
   Each moment has a short name and one *recognition board*: the position
   that is that moment's shape. Every moment's part of the lesson follows
   the same cycle: show it in 2-3 views, 1-2 quick questions, then a
   yes/no "is this the <moment>?" on blocks.
3. **Famous-game lessons**, one per game, each split into moments:
   - Morphy's Opera game, 1858 (already in the library, `opera-game`);
   - Légal's mate (Légal vs Saint Brie, 1750);
   - Réti vs Tartakower, Vienna 1910;
   - Edward Lasker vs Thomas, London 1912 (the king hunt).
4. **The two existing lessons get questions and moments** (data only):
   Scholar's mate (make it / stop it / spot it become moments; e.g. "tap
   the square it strikes", "which move stops the mate: g6, Qe7, a6") and
   Eyes on f7 (the ten "say it, then reveal" boards become real answers).
5. **Recognition rounds, built from what the kid has finished** (approach
   B). A "Recognise" round picks boards from the moments of lessons the kid
   has *finished*, shows each as blocks, and asks "Which game, which
   moment?" with 3 or 4 answers; the wrong answers are other finished
   moments. Every replay is a different selection and order.
6. Adding a lesson stays data only, validated by `npm test`; a new lesson's
   moments join the rounds automatically once it is finished.

## Non-goals

- Engine use in questions or rounds.
- Scores, stars, streaks, timers, badges. A round ends with a plain
  "Round finished"; nothing is counted or saved about answers.
- Saving answers or round history. Lesson progress (`chess-views:lessons`)
  stays the only stored record; a reload re-asks the step's question.
- Free-text answers, an authoring UI, branching paths.

## Anti-goals

- A question the view already answers on screen at the moment it is asked
  (e.g. asking "which square" while Territory has that square focused and
  tinted). Questions are asked where the answer must come from memory or
  from looking.
- Answer leaks: a tap question must not show the selected-square tint of
  the answer; a recognition board is blocks only until answered.
- A round that offers two answers that look alike, or that offers a
  moment from a lesson the kid has not finished.
- Trapping: Back, Exit and the views stay usable while a question is open.
- Long games for an 8-year-old: each moment's part stays short.

## Constraints

- Everything from the lessons spec: static page, no build step, no new
  dependencies, `node --test` for data and pure rules, Playwright checks
  at 390 px, `positions.json` hand-formatted, copy short and plain, `say`
  at most 220 characters.
- Question text and answer labels short enough for 390 px: question at
  most 80 characters, each answer label at most 32 characters.
- Game PGNs must replay legally in chess.js 1.0.0 and the moment plies must
  exist, checked by `npm test` (my call, settling the builder check): a
  copy of chess.js 1.0.0 is vendored for the tests only, under
  `tests/vendor/`, with its SHA-256 pinned like the Stockfish files. The
  page keeps loading chess.js from the CDN as today. This is a test fixture,
  not a runtime dependency.
- Existing links and the two lessons' ids keep working; saved progress of
  an existing lesson is still valid after its steps change (a step number
  beyond the new length clamps to the last step).

## Approaches considered

- **A. Hand-written rounds.** Each recognition round is a fixed lesson.
  Every board and every wrong answer chosen on purpose and easy to check,
  but every new game means rewriting rounds, and a replay is the same order,
  so the kid can learn the order instead of the shapes.
- **B. Rounds built from finished lessons (chosen).** Moments are labelled;
  a round draws from finished lessons and takes distractors from other
  finished moments. Grows with the library and differs on each replay;
  costs a small generator and a rule against look-alike answers. The quick
  questions inside lessons stay hand-written, as in A.
- **C. A separate quiz screen.** Dropped: it bypasses the locked tabs and
  view-by-view learning the lessons are built on.

The user picked B.

## Decisions made with the user

- Presentation, then quick questions, then yes/no on blocks, then mixed
  rounds across lessons.
- Wrong answer: try again until right. 3 to 4 answers per question
  (yes/no keeps 2).
- The four games above, each split into crucial moments.
- Scholar's mate and similar mates get the same treatment.
- Rounds ask game **and** moment.
- Rounds built from finished lessons (B).

## Design

### Data (in `positions.json`, inside each lesson)

```
{ "id": "opera-game", "name": "Opera game", "game": "Opera game",
  "about": "...",
  "moments": [
    { "id": "opening", "name": "the fast start", "pos"|"pgn"+"ply"|"fen": ..., "looksLike": [] },
    { "id": "mate", "name": "the mate", ..., "looksLike": ["reti-tartakower/mate"] }
  ],
  "steps": [
    { ..., "moment": "opening", "view": "board", "say": "..." },
    { ..., "moment": "opening", "view": "roads",
      "ask": { "q": "Which piece is pinned?", "choices": ["Knight f6", "Bishop f8", "Pawn e5"], "answer": 0, "right": "Yes: the bishop on g5 holds it." } },
    { "moment": "opening", "recall": true, "view": "shapes",
      "ask": { "q": "Is this the fast start?", "choices": ["Yes", "No"], "answer": 0 } },
    { "pgn": "...", "ply": 9, "moment": "opening", "blocks": true, "view": "shapes",
      "ask": { "q": "Is this the fast start?", "choices": ["Yes", "No"], "answer": 1 } },
    { ..., "view": "board", "ask": { "q": "Tap the square of the mate.", "tap": ["d8"] } }
  ] }
```

- `game`: the name used in round answers ("Opera game: the mate"). For a
  mate-pattern lesson it is the pattern's name ("Scholar's mate").
- `moments[].` position: the recognition board, same position fields as a
  step (`pos`, `fen`, `pgn`+`ply`).
- `looksLike`: `"<lesson id>/<moment id>"` keys that must never appear
  together with this moment in one round question (both directions apply).
- `step.moment`: which moment the step belongs to. The step bar shows the
  moment's name next to the step counter ("the fast start, step 3 of 14").
- `step.ask`: `q` plus either `choices` (2-4 strings) and `answer` (index),
  or `tap` (array of squares). Optional `right`: the line shown when
  answered correctly (else "Right!").
- **Blocks steps** (my call, settling the builder check): `blocks: true`
  marks a step whose board is shown as gated blocks in Shapes and whose
  question is answered **before** pieces are revealed; the reveal button
  appears only after the right answer. It replaces `shapes.gate` for steps
  with a question (`shapes.gate` stays valid for steps without one).
- **`recall: true`** (my call): the step's position is its moment's
  recognition board; it implies `blocks: true`, and the step must have no
  position field of its own. Its yes/no answer is therefore "Yes".
- A "No" step is a normal blocks step with its own position field (another
  moment, another lesson, or a near miss). The validator checks: exactly
  one of `recall` or a position field; a recall step's `choices` are
  `["Yes", "No"]` with `answer: 0`; a step with `moment` names a moment of
  its lesson; `answer` is a valid index; `tap` squares are valid squares.

### The page

- The question sits in the step bar under the step text: the question, then
  the answer buttons in a row (wrapping at 390 px), or for a tap question
  the hint "Tap a square on the board". Next shows "Answer first" while
  locked (after the existing view gate: open the view first, then answer).
- Tap questions take the tap in any view that shows the board; the tap
  does not select or tint the square (no answer leak) and does not change
  the view's own selection.
- A wrong choice: that button gets a crossed style and is disabled, the
  line says "Try again". A wrong tap: the square flashes, "Try again".
- A right answer: the button (or square) is marked right, the `right`
  line shows, Next opens.
- Back and Next keep working as today; answering is per visit (going Back
  and forward re-asks).

### Recognition rounds

- A pseudo-lesson "Recognise" on the Lessons shelf. A finished moment is
  *usable* when it can get at least 2 allowed distractors from the other
  finished moments. Recognise unlocks when at least two lessons with
  moments are finished **and** at least 4 moments are usable (my call,
  settling the builder check); before that it shows as locked with "Finish
  two game lessons to unlock". Moments that are not usable are left out of
  the round, never asked with only 1 distractor, and never padded from
  unfinished lessons.
- A round is 8 boards (or every eligible moment if fewer). For each:
  the recognition board as gated blocks in Shapes, the question "Which game,
  which moment?", 3 or 4 answers "<game>: <moment name>". The right answer
  plus 2-3 distractors from other finished moments, never one listed in
  `looksLike` of the right one (or listing it), never the same lesson and
  moment twice. Distractors prefer *other moments of the same game* first
  when the game has them, so "which moment" is really asked.
- After the right answer, pieces can be revealed; Next goes to the next
  board; the last board ends with "Round finished" and leaves the round.
- The generator is pure (in `lessons.js`) and takes a seed; the seed is in
  the link (`lesson=recognise&seed=<n>&step=<i>`) so a reload shows the
  same round. A new round from the shelf picks a new seed.
- Rounds open every view (the kid has already finished lessons); only
  Shapes is required.

### Existing lessons

- **Scholar's mate** gets `game: "Scholar's mate"`, moments (my call:
  "the attack on f7", "the defence", "the mate") and questions. Current
  steps are kept where they still fit; question steps are added.
- **Eyes on f7** (my call, settling the builder check) gets questions on
  its ten boards but **no moments**: its boards are all one shape (two
  pieces on f7 or f2), so as rounds material they would be look-alikes of
  Scholar's mate and of each other. It is a practice lesson and does not
  feed Recognise. Lessons without `moments` never feed rounds.
- Saved progress stays valid via clamping.

### Copy

- Question and answer labels in the app's voice, sentence case, no
  exclamation marks except "Right!".
- Moment names are short noun phrases: "the fast start", "the pin", "the
  mate", "the king hunt".

## Left to the builder

- Exact steps and question wording for each lesson, within the cycle above
  and the anti-goals (no question the screen already answers).
- Which moments each game gets (2-4), and each recognition board's ply.
  Suggested: Opera game: fast start, the queen sacrifice on b8 / the mate;
  Légal: the queen "blunder", the mate; Réti-Tartakower: queen sacrifice on
  d8, double check, the mate; Lasker-Thomas: queen sacrifice on h7, the king
  hunt, the mate on g1/d2.
- Verifying the PGNs (from a reliable source) replay legally.
- Visual styling of answer buttons within the existing tokens and dark mode.
