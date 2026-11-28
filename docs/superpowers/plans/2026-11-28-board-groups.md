# Board Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single "view" (a flat layer list plus a Widok dropdown) with a grouped board look. The
look has five groups: Bierki, Ruchy, Strategia, Plansza and Pomocnik. The child can mix one option from each
group, on the lesson screen and on the free board.

**Architecture:** A new `BoardLook` value (one field per group) replaces `Scene.base` and `Scene.layers`.
- One core module, `src/core/look.ts`, holds the option table and the switching rules. The lesson run and
  the free board both use it.
- Lesson Markdown keeps its `scene: "board+roads"` tokens. The compiler turns them into a look.
- A new `LookPicker` replaces `ViewPicker` and the pieces button.

**Tech Stack:** TypeScript, zod, React 19, react-aria-components, Zustand, Vitest/jsdom, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-28-board-groups-design.md`

All paths below are relative to `platform/`, unless they start with `docs/`.

## Global Constraints

- **Saved data:** browser saving only for lesson progress and profiles (squareNames, lastLesson, theme),
  pieceStyle, and the current-player key. The child's current mix is never saved.
- **Labels:** Polish first. Every label and legend sentence goes in both `src/core/i18n/messages/pl.ts` and
  `en.ts`.
- **Phone layout:** the picker fits the board sheet's tools at 390×844 without shrinking the board. Rows may
  scroll sideways.
- **Blocks and recall questions:** while one is open, the picker is frozen.
- **Engine during tasks:** Silnik is off and unusable while any question or find-the-move task is open.
- **Romb:** turning Romb on clears Moves and Strategy, and those rows are disabled while Romb is on.
- **Always allowed:** pieces, blocks, hidden, flip and names need no unlocking. Every other option unlocks as
  layers do today.
- **Lesson picker:** a lesson shows only options its steps use, plus the always-allowed ones. Options not yet
  unlocked show 🔒 and cannot be pressed.
- **Git and checks:**
  - Commit as "Damian Ospara <1453374+damian0o@users.noreply.github.com>".
  - End messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
    `Claude-Session: https://claude.ai/code/session_01P7r4y9XCRV4NafGyZ61FWC`.
  - Work on branch `board-groups`.
  - No installs without asking.

## Review Focus

1. **A blocks or recall step with `locked:` on the step's own drawing.** After answering, that drawing comes
   back, because the answer fills empty groups from the step. Test in Task 2.
2. **An old v2 profile in localStorage with `unlockedLayers: ['pieces','shapes','roads']`.** It loads as v3
   with `unlocked: ['blocks','roads']`. Test in Task 2.
3. **An old free-board link `#/board?fen=…&view=territory`.** It opens with Strategy = Terytorium. Test in
   Task 4.
4. **Pressing Romb on while Drogi is on, then Romb off.** Drogi stays off, with no stale road layer drawn.
   Test in Task 1.
5. **Going Back to an earlier step after mixing.** The earlier step starts from its own look, not the
   child's mix, as `fresh()` does today. Test in Task 2.

---

### Task 1: The look model and its rules

**Files:**
- Create: `src/core/look.ts`
- Modify: `src/core/types.ts` (add the schemas only; nothing removed yet)
- Test: `tests/look.test.ts`

**Interfaces:**
- Produces, in `src/core/types.ts`:
  ```ts
  export const PIECES_MODES = ['pieces', 'blocks', 'hidden'] as const;
  export const MOVES_DRAWINGS = ['roads', 'reach', 'knight'] as const;
  export const STRATEGY_DRAWINGS = ['territory', 'kings'] as const;
  export const OPTION_IDS = [...PIECES_MODES, ...MOVES_DRAWINGS, ...STRATEGY_DRAWINGS, 'diamond', 'flip', 'names', 'engine'] as const;
  export type OptionId = typeof OPTION_IDS[number];
  export const BoardLookSchema = z.object({ pieces: z.enum(PIECES_MODES), moves: z.enum(MOVES_DRAWINGS).optional(),
    strategy: z.enum(STRATEGY_DRAWINGS).optional(), diamond: z.boolean().optional(), engine: z.boolean().optional() })
    .refine((l) => !(l.diamond && (l.moves || l.strategy)), 'a drawing cannot be on the diamond');
  export type BoardLook = z.infer<typeof BoardLookSchema>;
  ```
- Produces, in `src/core/look.ts`:
  - `type Group = 'pieces' | 'moves' | 'strategy' | 'board' | 'helper'`, and `GROUPS: Group[]` in that order.
  - `OPTIONS: Record<OptionId, { group: Group; label: MessageKey; legend?: MessageKey; always: boolean }>`.
    - `always` is true for pieces, blocks, hidden, flip and names.
    - flip and names have no legend.
  - `PLAIN: BoardLook = { pieces: 'pieces' }`.
  - `isOn(look, id): boolean`. For `flip` and `names` it is always false; callers track those.
  - `turnOn(look, id)` and `turnOff(look, id)`, plus `toggle(look, id) = isOn ? turnOff : turnOn`. All
    return a `BoardLook`.
  - `optionsOf(look): OptionId[]`: the options that are on, except `pieces` when that is the mode.
  - `export interface OptionState { id: OptionId; on: boolean; locked: boolean; blocked: boolean }`.
  - `optionStates(look, extra: { flip: boolean; names: boolean }, shown: readonly OptionId[], unlocked: (id: OptionId) => boolean): OptionState[]`.
    - `locked` is `!always && !unlocked(id)`.
    - `blocked` is true for a drawing while `look.diamond` is on.
  - `lookOfView(view: string): BoardLook` maps old view ids: `board`, `territory`, `reach`, `roads`,
    `kings`, `engine`, `diamond`, `shapes` (becomes blocks) and `knight`. An unknown id gives `PLAIN`.

- [ ] **Step 1: Write failing tests** in `tests/look.test.ts`.
  - Switching within a group: `turnOn({pieces:'pieces',moves:'roads'}, 'reach')` gives
    `{pieces:'pieces',moves:'reach'}`.
  - Bierki can't be turned off: `turnOff(PLAIN,'pieces')` equals `PLAIN`, and `turnOn(PLAIN,'hidden').pieces`
    is `'hidden'`.
  - Romb clears drawings, and they don't come back:
    `turnOff(turnOn({pieces:'pieces',moves:'roads',strategy:'kings'},'diamond'),'diamond')` equals `PLAIN`.
  - No drawing on Romb: `turnOn({pieces:'pieces',diamond:true},'roads')` is unchanged.
  - `optionsOf({pieces:'blocks',moves:'roads',engine:true})` gives `['blocks','roads','engine']`.
  - `optionStates` marks roads `blocked` when the diamond is on, and territory `locked` when it is not
    unlocked.
  - `lookOfView('shapes')` gives `{pieces:'blocks'}`, `lookOfView('territory').strategy` is `'territory'`,
    and `lookOfView('nope')` gives `PLAIN`.
  - `BoardLookSchema.safeParse({pieces:'pieces',diamond:true,moves:'roads'}).success` is false.
- [ ] **Step 2: Run and see them fail.**
  - Run: `npx vitest run tests/look.test.ts`
  - Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the schemas in `types.ts` and `look.ts`.
  - For the label keys, add these `opt*` and `group*` keys to both message files now.

  | Option | pl | en |
  |---|---|---|
  | pieces | Bierki | Pieces |
  | blocks | Klocki | Blocks |
  | hidden | Ukryte | Hidden |
  | roads | Drogi | Roads |
  | reach | Zasięg | Reach |
  | knight | Skoczek | Knight |
  | territory | Terytorium | Territory |
  | kings | Domki króla | King houses |
  | diamond | Romb | Diamond |
  | flip | Obróć | Flip |
  | names | Nazwy pól | Square names |
  | engine | Silnik | Engine |

  | Group | pl | en |
  |---|---|---|
  | pieces | Bierki | Pieces |
  | moves | Ruchy | Moves |
  | strategy | Strategia | Strategy |
  | board | Plansza | Board |
  | helper | Pomocnik | Helper |

  - Add the new legend key `legendHidden`:
    - pl: "Bierki są schowane. Zgadnij z tego, co widać, co stoi na planszy."
    - en: "The pieces are hidden. Work out what stands where from what you can see."
  - Reuse the existing `legend*` keys for the other options (pieces uses `legendBoard`, blocks uses
    `legendShapes`).
- [ ] **Step 4: Run.**
  - Run: `npx vitest run tests/look.test.ts tests/i18n.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit.** Message: "Core: the board look, its groups and switching rules".

### Task 2: Core and content on looks

This task switches the data model. The app does not typecheck until Task 3. That is expected. The gate is the
core and content tests.

**Files:**
- Modify: `src/core/types.ts`
  - `SceneSchema`: drop `base`, `layers` and `lockedLayers`; add `look: BoardLookSchema` and
    `locked: z.array(z.enum(OPTION_IDS)).optional()`.
  - `LibraryEntrySchema`: `scene` becomes `look: BoardLookSchema.optional()`.
  - `ProfileSchema` gets version 3, and `unlockedLayers` becomes `unlocked: z.array(z.enum(OPTION_IDS))`.
  - Remove `LAYER_KINDS` and `LayerKind`.
- Modify: `src/content/resolve.ts` (`sceneOf`) and `src/content/compile.ts`
  - The recall check becomes `look.pieces === 'pieces'`.
  - Library raw `scene:` tokens are parsed with the same token parser into `look`.
  - Error text maps to the new keys.
- Modify: `src/core/scene.ts`
  - `ResolvedScene` gets `look` in place of `layers`.
  - `isBlocks(step)` is true when `step.scene.look.pieces !== 'pieces'` or the question is a recall.
- Modify: `src/core/analysis/index.ts` to `analyse(fen, look: BoardLook)`.
  - It computes the same data as today for the matching options.
  - Blocks computes `shapes`. Diamond computes `diamond`.
- Modify: `src/core/lessons/run.ts`, `unlock.ts`, `progress.ts`, `src/core/recognition.ts`
  (`look: {pieces:'blocks'}`), `src/core/storage/migrate.ts`, `src/core/storage/local.ts` (default
  `unlocked: []`).
- Test: update `tests/content/compile.test.ts`, `tests/lessons.test.ts`, `tests/progress.test.ts`,
  `tests/recognition.test.ts`, `tests/review.test.ts`, `tests/rooms.test.ts`, `tests/storage.test.ts` and
  `tests/types.test.ts` to looks. Add the cases below.

**Interfaces:**
- Consumes: Task 1's `BoardLook`, `OptionId`, `turnOn`, `turnOff`, `toggle`, `optionsOf`, `optionStates`
  and `OPTIONS`.
- Produces:
  - `sceneOf(attrs, position, isRecall): Scene | string`. It returns an error message string on bad tokens;
    `compile.ts` reports it.
    - The head token is `board`, `blocks`, `hidden` or `diamond`. The rest are option ids.
    - Messages:
      - `two options from one group: "roads" and "reach"`;
      - `"diamond" cannot be combined with drawings`;
      - `unknown option "x"`.
  - `unlockedOptions(profile, lessons): Set<OptionId>` replaces `unlockedLayers`.
  - `recordSeen(profile, step)` adds `optionsOf(step.scene.look)`.
  - `lessonOptions(lesson): OptionId[]` returns the always-allowed ids plus every option of any step's look,
    in `OPTION_IDS` order.
  - `LessonRun` changes:
    - `layersOn` and `allowedLayers` are replaced by `look: BoardLook`, `flip: boolean`,
      `options: OptionState[]` (from `optionStates` over `lessonOptions`) and `frozen: boolean`.
    - The event `{kind:'layers'}` is replaced by `{ kind: 'toggle'; option: OptionId }`.
    - `names` is not handled by the run; the app handles it.
  - Run rules:
    - **Frozen:** `frozen` is `gate?.kind === 'answer' && isBlocks(step)`, and toggles are ignored while
      frozen.
    - **Usable options:** an option the child may use is always-allowed, unlocked, or in the step's own
      look.
    - **Engine:** the engine counts as not unlocked, and is forced off, while `gate` is `answer` or
      `reveal`.
    - **While a question is open:** the step's `locked` options are forced off.
    - **On a right answer to a blocks step:** pieces becomes `'pieces'`. Moves and strategy keep the
      child's choice, or take the step's when empty (skipped when diamond is on).
    - **Flip:** starts from `step.scene.flip`. The `flip` toggle flips it.
  - `sessionScene` keeps its old signature until Task 4. Leave `src/core/session.ts` building a scene from
    `lookOfView(s.view)`.
  - `migrateProfile` turns v1 and v2 into v3.
    - `unlockedLayers` maps to `unlocked`: `shapes` becomes `blocks`, `pieces` is dropped, and unknown names
      are dropped.
    - The repair path does the same.

- [ ] **Step 1: Write failing tests.**
  - **Compile:**
    - `scene: "blocks+roads"` gives `look {pieces:'blocks',moves:'roads'}` with `hideMoves: true`.
    - `"board+roads+reach"` errors with the group message.
    - `"diamond+roads"` errors with the diamond message.
    - `"hidden"` gives `pieces:'hidden'`.
    - `locked: territory` gives `locked:['territory']`.
  - **Run:**
    - `toggle` of reach on a roads step gives `look.moves === 'reach'`.
    - A recall step is `frozen` until answered, and a toggle while frozen returns the same look.
    - After a right answer on `blocks+roads` with the child having switched to reach, the look is
      `{pieces:'pieces',moves:'reach'}`.
    - The same with the child having cleared roads gives `moves:'roads'`.
    - Review Focus 1: a blocks step with `locked: roads` has no roads while open and roads after answering.
    - A solve step: `options` engine `locked` while gate is `reveal`.
    - Review Focus 5: after a toggle and Next then Back, the look equals the step's own look.
  - **Unlock:**
    - `recordSeen` on a `board+kings` step adds `kings`.
    - `lessonOptions` of Mat szkolny includes `kings`, `roads`, `territory` and `blocks`, but not `reach`.
  - **Storage (Review Focus 2):** a v2 profile with `unlockedLayers:['pieces','shapes','roads']` migrates to
    `version:3, unlocked:['blocks','roads']`.
  - **Content:** `npm run content` compiles every lesson in `content/` with no
    errors.
- [ ] **Step 2: Run and see them fail.**
  - Run: `npx vitest run tests --exclude 'tests/app/**'`
  - Expected: the new cases FAIL.
- [ ] **Step 3: Implement** the files listed above. Fix any lesson file the new compile check rejects, and
  name each fix in the commit message.
- [ ] **Step 4: Run.**
  - Run: `npx vitest run tests --exclude 'tests/app/**' && npm run content`
  - Expected: PASS, and content OK.
- [ ] **Step 5: Commit.** Message: "Core and content: scenes hold a board look, profiles v3".

### Task 3: Board, LookPicker and the lesson screen

**Files:**
- Create: `src/app/lesson/LookPicker.tsx`
- Modify:
  - `src/app/board/Board.tsx`: read `scene.look`. Pieces are shown only when `pieces==='pieces'`. Blocks
    when `'blocks'`, and nothing when `'hidden'`. Territory, kings, roads, reach, knight and diamond come
    from the look fields.
  - `src/app/lesson/LegendPopup.tsx`: takes `on: OptionId[]`.
  - `src/app/screens/Lesson.tsx`: the tools.
- Delete: `src/app/lesson/ViewPicker.tsx`, and in `src/app/views.ts` everything the lesson used.
- Test: update `tests/app/board.test.tsx`, `batteries.test.tsx`, `squarenames.test.tsx`,
  `lessonpieces.test.tsx`, `blocksfix.test.tsx`, `lesson.test.tsx`, `phonelesson.test.tsx` and
  `views2.test.tsx` to looks. Add `tests/app/lookpicker.test.tsx`.

**Interfaces:**
- Consumes: Task 2's `LessonRun.look`, `flip`, `options`, `frozen` and `{kind:'toggle'}`. Task 1's
  `GROUPS` and `OPTIONS`.
- Produces:
  - `LookPicker({ options, frozen, onToggle }: { options: OptionState[]; frozen: boolean; onToggle: (id: OptionId) => void })`.
    - It renders one `role="group"` row per group that has at least one option, labelled with the group's
      label.
    - Each option is a react-aria `ToggleButton` with `isSelected={on}`, `isDisabled={frozen || locked || blocked}`
      and `data-option={id}`.
    - A locked option gets a ` 🔒` suffix.
    - Each row is `flex flex-nowrap overflow-x-auto`.
  - `LegendPopup({ on }: { on: OptionId[] })`.
    - Its heading is `t('legend')`.
    - It shows one `<p>` per option in `on` that has a legend key.
    - The pieces sentence shows only when `on` has no other legend.
  - Lesson tools:
    - `<LookPicker options={run.options} frozen={run.frozen} onToggle={…}/>` and
      `<LegendPopup on={[run.look.pieces, ...optionsOf(run.look)]}/>`.
    - `onToggle('names')` calls `updatePlayer({ squareNames: !showsSquareNames(player) })`. Any other option
      calls `report({kind:'toggle', option})`.
    - The names option's `on` comes from `showsSquareNames(player)`. Pass it into `optionStates` through the
      run's `extra`, or patch it in `Lesson.tsx`; the builder chooses.
    - `Board` gets `flip={run.flip}`.

- [ ] **Step 1: Write failing tests** in `tests/app/lookpicker.test.tsx`.
  - On a Mat szkolny `board+roads` step:
    - rows Bierki, Ruchy, Strategia and Plansza are shown, and Pomocnik is not;
    - pressing Domki króla sets `aria-pressed` on it and keeps Drogi pressed;
    - pressing Zasięg unpresses Drogi.
  - On a recall step, every option button is disabled.
  - Pressing Romb unpresses Drogi and disables the Ruchy buttons.
  - Pressing Nazwy pól calls `updatePlayer` with `squareNames` toggled.
  - The legend with roads and kings on shows both legend sentences.
  - The old "Pokaż bierki" button is gone. Pressing Bierki on an answered blocks step shows piece images.
- [ ] **Step 2: Run and see them fail.**
  - Run: `npx vitest run tests/app/lookpicker.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement** the Board, LookPicker, LegendPopup and Lesson changes.
- [ ] **Step 4: Run.**
  - Run: `npx vitest run tests/app --exclude 'tests/app/freeboard*'`
  - Expected: PASS. Free board tests may still fail until Task 4.
- [ ] **Step 5: Commit.** Message: "Lesson: grouped look picker replaces the view dropdown".

### Task 4: Free board on looks

**Files:**
- Modify:
  - `src/core/session.ts`:
    - `Session.view: string` becomes `look: BoardLook`;
    - `SessionOptions.view` becomes `look?: BoardLook`;
    - `sessionScene(s)` reads the look.
  - `src/app/store.ts`:
    - `setView` becomes `toggleOption(id: OptionId)`, which applies `toggle`, or flips `session.flip` for
      `flip`;
    - library entries open with `entry.look ?? PLAIN`.
  - `src/app/screens/FreeBoard.tsx` and `src/app/rooms/PositionList.tsx`.
- Delete: `src/app/views.ts` (whatever is left).
- Test: update `tests/session.test.ts`, `tests/app/freeboard.test.tsx`, `engine.test.tsx`,
  `engineview.test.tsx`, `guess.test.tsx`, `library.test.tsx`, `review*.test.tsx`, `store.test.ts` and
  `routes.test.ts`.

**Interfaces:**
- Consumes: Task 1's `lookOfView`, `toggle`, `optionStates` and `PLAIN`. Task 3's `LookPicker` and
  `LegendPopup`.
- Produces:
  - **`sessionParams`** writes:
    - `pieces=` unless pieces;
    - `moves=` and `strategy=` when set;
    - `diamond=1`, `engine=1` and `flip=1` when on.
  - **`sessionFromParams`** reads those. An old `view=` is read through `lookOfView`, and explicit group
    parameters win over it.
  - **Free board options:** all 12 options are shown and none is locked.
  - **Square tap:** a tap goes to the knight when `moves==='knight'`. Otherwise it goes to the engine guess
    when `engine` is on and guessing.

- [ ] **Step 1: Write failing tests.**
  - **Review Focus 3:** `sessionFromParams(new URLSearchParams('fen=…&view=territory'))` gives
    `look.strategy === 'territory'`.
  - **Round trip:** a look of `{pieces:'blocks',moves:'roads',strategy:'kings',engine:true}` with flip goes
    through `sessionParams` and back to the same look and flip.
  - **Free board UI:** pressing Drogi and then Terytorium shows roads and territory marks at once, and the
    address contains `moves=roads&strategy=territory`.
  - **Taps:** with Skoczek and Silnik both on, a square tap moves the knight's start.
- [ ] **Step 2: Run and see them fail.**
  - Run: `npx vitest run tests/session.test.ts tests/app/freeboard.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.**
  - Run: `npm run check`
  - Expected: content, typecheck, lint and test all PASS.
- [ ] **Step 5: Commit.** Message: "Free board: mix board groups, links per group".

### Task 5: End-to-end

**Files:**
- Modify:
  - `e2e/links.spec.ts`: the `Widok` check becomes `[data-option="roads"][aria-pressed="true"]`.
  - `e2e/lesson-patterns.spec.ts`, `e2e/crayons.spec.ts`, `e2e/helpers.ts`, wherever they use views.
- Test: add `e2e/look-picker.spec.ts`.

**Interfaces:**
- Consumes: Task 3's `data-option`, and the Task 4 address parameters.

- [ ] **Step 1: Write the e2e test** for both projects (phone and laptop).
  - Open Mat szkolny `s03-roads` and pull the board up on a phone.
  - Press Domki króla. Roads and king houses are both visible: `[data-layer="roads"]` and a house outline.
  - On the phone (390×844), the picker rows are in the viewport inside the sheet, and the board's width is
    no smaller than on `main`. Measure on `main` first and put the number in the test.
  - On a recall step, every `[data-option]` is disabled.
- [ ] **Step 2: Build and run.**
  - Run: `npm run build && npx tsx scripts/assemble-site.ts && npx playwright test`
  - Expected: all PASS.
  - If the phone width check fails, make the rows scroll sideways or tighten the gaps. Do not shrink the
    board.
- [ ] **Step 3: Commit.** Message: "e2e: grouped look picker on phone and laptop".
