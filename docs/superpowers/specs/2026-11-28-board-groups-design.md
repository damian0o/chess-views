# Board groups: from one "view" to a few things you can mix

## Intent

Today a board shows one "view" at a time, picked from a single list (Widok). There are nine views:
- board,
- territory,
- reach,
- roads,
- kings,
- engine,
- diamond,
- shapes (blocks),
- knight.

Almost every view is "pieces + one extra layer". That list hides three different kinds of thing:
- drawings on the board (roads, territory and the rest);
- a different way to show the pieces (blocks, plus a separate "Pokaż bierki" button);
- a different board shape (diamond);
- a tool (the engine).

The child can never combine two drawings, for example roads with king houses.

The user's words: switching one view at a time is "too little"; views should be mixable, but grouped "so
there is not too much". Chess Views is for an 8-year-old (the 8–12 band), so a few groups with plain
names beat one long list.

**Success:**
- The child can show, on one board, how the pieces look, one drawing about moves and one drawing about
  strategy, all at the same time.
- Each group is one short row of buttons.
- Lessons can set any such mix for a step.

## The groups (agreed with the user)

Each group answers one question the child asks:

| Group | Child's question | Options | How many at once |
|---|---|---|---|
| **Bierki** (Pieces) | What is standing here? | Bierki · Klocki (blocks) · Ukryte (hidden) | exactly one |
| **Ruchy** (Moves) | Where can they go? | Drogi (roads) · Zasięg (reach) · Skoczek (knight) | none or one |
| **Strategia** (Strategy) | What is the game about? | Terytorium (territory) · Domki króla (king houses) | none or one |
| **Plansza** (Board) | How do I look at it? | Romb (diamond) · Obróć (flip) · Nazwy pól (square names) | each on/off |
| **Pomocnik** (Helper) | Who gives me a hint? | Silnik (engine) | on/off |

The rule "one from Moves and one from Strategy" replaces any limit on how many drawings may be on. That
means at most two drawings, and each answers a different question.

Later, new strategy drawings join the Strategy group: plan arrows, weak squares and so on. The model must
make adding one a matter of one new option, not a new mechanism.

Sketch (phone, inside the board sheet's tools):
```
Bierki:    [●Bierki] [ Klocki] [ Ukryte]
Ruchy:     [ Drogi] [●Zasięg] [ Skoczek]
Strategia: [●Terytorium] [ Domki]
Plansza:   [◇ Romb] [⇅ Obróć] [a1 Nazwy]     Pomocnik: [♟ Silnik]
```

## Goals

- **The scene model in `src/core` says what each group shows.** It replaces today's flat `layers` list
  plus `base`. Two options from one exclusive group cannot be written down at all.
- **Lessons set a mix per step.** Within a step the child may change any group, but only to options that
  are unlocked. Today's "lesson sets it, child adjusts" rule stays.
- **One grouped picker replaces the Widok dropdown and the "Pokaż/Ukryj bierki" button.** It is used on
  the lesson screen (phone and laptop) and on the free board.
- **The legend ("Co widzę?") explains whatever is on now.** That is one sentence per active option, not
  one per view.
- **Everything still works:**
  - recall and blocks questions keep pieces hidden until answered;
  - locked drawings stay off while a question is open;
  - unlocking works as before.

## Non-goals

- **No drawing on the diamond.** Today the board does not draw roads or other overlays on the diamond
  (`Board.tsx`: `roads && !diamond`). With Romb on, the Moves and Strategy rows are disabled, and turning
  Romb on clears them. Drawing on the diamond can come later.
- **No new drawings in this work.** The Strategy group just has to be ready for them.
- **No change to how each drawing looks or is computed** (`src/core/analysis`).

## Anti-goals

- **A wall of buttons.** If a group has nothing unlocked, its row does not appear. A lesson that only ever
  uses pieces and roads shows two short rows, not five.
- **A child losing a question's secret by mixing.** For example, revealing pieces on a recall board through
  the new Bierki row must be impossible while the question is open, exactly as today.
- **A child's progress being lost.** No one uses the app yet (user, 2026-11-28), so old saved profiles
  need no careful migration. Still, an old profile must load without errors (see Constraints).

## Constraints

- Saved data stays limited to what is already approved:
  - lesson progress,
  - profiles (squareNames, lastLesson, theme),
  - pieceStyle,
  - the current player key.

  The unlocked list stays in the profile, with new ids. The Nazwy pól button writes the existing
  `squareNames` setting. Nothing new is saved for the child's current mix.
- Polish first: every label and legend sentence in `pl.ts` and `en.ts`.
- Phone layout: the picker lives in the board sheet's tools on a phone. With all groups shown it must
  fit at 390×844 without making the board smaller than it is today. Rows may scroll sideways if needed.
- Tests: every changed behaviour gets a unit test. The e2e lesson-patterns test is updated to the new
  picker. `npm run check` and the e2e suite stay green.

## Approaches (the user picked B, "the whole thing")

- **A. New look only.** The data keeps a flat list of layers, and the groups live in the UI. Least work,
  but nothing stops a lesson from setting roads and reach together, and the lesson screen and free board
  each enforce the rules separately.
- **B. New data model (chosen).** The scene holds one field per group, so a wrong mix cannot be written.
  It means rewriting the scene in every lesson step (about 90) and the profile's unlocked list. The user
  chose it because nobody uses the app yet, so there is no progress to protect.
- **C. Middle.** Keep the list, add a layer-to-group map and a "turn on X" function in core, and add a
  content check. Rejected in favour of B once migration stopped mattering.

## Design (decided)

### Scene

`SceneSchema` loses `base` and `layers` and gains a view of groups. The shape below is my call; the builder
may rename fields:

```ts
type PiecesMode = 'pieces' | 'blocks' | 'hidden';
type MovesDrawing = 'roads' | 'reach' | 'knight';
type StrategyDrawing = 'territory' | 'kings';
interface BoardLook {                // one value per group
  pieces: PiecesMode;
  moves?: MovesDrawing;
  strategy?: StrategyDrawing;
  diamond?: boolean;
  engine?: boolean;
}
Scene = { position, look: BoardLook, flip?, focus?, hideMoves?, locked?: Option[] }
```

`Option` is a flat id for one button, for example `'roads'` or `'blocks'`, used for unlocking and locking.
A single table in core lists, for each option, its group, its label key and its legend key. The UI and the
legend read that table.

`flip` stays a scene field, set by the step; the Obróć button changes the shown flip. Square names stay a
profile setting.

### Rules in core (one place, shared by the lesson run and the free board)

- `turnOn(look, option)` and `turnOff(look, option)` return a new look:
  - in an exclusive group, the new option replaces the old one;
  - Bierki can only be switched, never turned off;
  - Romb on clears Moves and Strategy.
- **Blocks and recall steps.** "Blocks" now means `look.pieces !== 'pieces'` or a recall question.
  - While the question is open, Bierki stays on blocks or hidden and cannot change.
  - Answering switches it to pieces, as today.
  - Moves stay hidden while pieces are not shown, as today.
- **Locked options** are forced off while the step's question is open, as today.
- **Options shown in a lesson (user's choice, 2026-11-28):** only the options this lesson's steps use.
  - Of those, the ones not yet unlocked show with a lock (🔒), as the dropdown does today.
  - Options unlocked in other lessons do not appear.
  - A group with none of the lesson's options is not shown.
  - The always-allowed options (Bierki modes, Obróć, Nazwy pól) are always shown.
  - Full mixing of everything is the free board's job.

### Content syntax

Lesson Markdown keeps its short token form, for example `scene: "board+roads"`, `"blocks+kings"`,
`"diamond"` or `"board+roads+territory"`. The compiler turns it into a `look`:
- The head token picks Bierki: `board` is pieces, `blocks` is blocks, and the new `hidden` is hidden.
  The head `diamond` means pieces with Romb.
- The other tokens are options.
- The compiler rejects two options from one exclusive group, any drawing with `diamond`, and unknown
  tokens, with a clear message.

`locked:` takes the same option ids. Existing lesson files should compile unchanged, apart from fixing
anything the new check rejects.

### Profile

`unlockedLayers: LayerKind[]` becomes `unlocked: Option[]`. The profile version goes to 3. Migration from
v1 and v2 maps the old layer names one to one:
- `shapes` becomes `blocks`;
- `pieces` becomes always-unlocked and is dropped;
- the others keep their names.

### Free board

The free board's address changes from `view=` to one parameter per group, for example
`?pieces=blocks&moves=roads&strategy=kings&diamond=1`. Old `view=` links map to the matching look. The
free board allows every option, as today.

### Picker UI

- **New component.** A new `LookPicker` replaces `ViewPicker` and the pieces button.
- **Layout.** There is one labelled row per shown group. The exclusive groups are toggle-button groups
  (react-aria `ToggleButtonGroup`, single selection; Moves and Strategy may be empty). Plansza and Pomocnik
  are plain toggle buttons.
- **Disabled controls.** A disabled control, for example Bierki while a recall question is open or a drawing
  while Romb is on, stays visible but cannot be pressed.
- **Legend.** "Co widzę?" lists the legend sentence of each active option. The Bierki pieces sentence
  shows only when nothing else is on.

## Calls made after the builder check (my calls, open to correction)

- **While a blocks or recall question is open, the whole picker is frozen, as it is today.** That covers
  Moves and Strategy too, because a bishop's roads or a piece's reach would give away what stands on a
  block. Answering unfreezes it.
- **What answering a blocks question shows.** Bierki switches to pieces. The child's current drawings
  stay. Any group the child left empty takes the step's own option, the same union as today.
- **Silnik in a lesson** appears only once it is unlocked. It is forced off while any question or
  find-the-move task is open, whatever `locked:` says. No lesson step turns it on today.
- **Always allowed, no unlocking:** Bierki (all three modes), Obróć and Nazwy pól. Romb, the drawings and
  Silnik are unlocked as before, by seeing them in a step or finishing a lesson. A step with `flip: true`
  starts flipped, and the child can flip back.
- **Free board.** The address also carries `engine=1` and `flip=1`. When both Skoczek and Silnik are on,
  a square tap goes to the knight (choosing its start square). The engine guess works only with Skoczek
  off.

## Left to the builder

- Field and file names, and whether the option table lives in `src/core/look.ts` or similar.
- Exact styling of the rows within the existing themes (kids, teens, adults, crayons).
- How the engine panel is placed when Silnik is on in a lesson. Today the engine is only used on the free
  board and in find-the-move steps.
