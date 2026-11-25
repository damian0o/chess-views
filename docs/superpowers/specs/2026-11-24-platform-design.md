# Chess Views platform: the core and its API (after the proof of concept)

Date: 2026-11-24. Status: draft for approval.

## Intent

The current site (`index.html` + `analysis.js`, `lessons.js`, `coach.js`,
`engine.js`, `positions.json`) is a proof of concept. It proved the idea —
nine ways of looking at one chess position, lessons that walk a child
through them, recognition rounds, Stockfish in the browser — and it showed
where a single hand-rolled page stops being maintainable.

The target is a **pattern-recognition platform**: lessons grouped by the
pattern or strategy they teach, explanations tuned to the learner's age,
Polish first with more languages possible, several themes, progress kept
in the browser, and Stockfish behind a clean interface.

This document designs the **foundation first**: the data types, the core
API (analysis, lessons, recognition, engine, storage, languages), the
content format and the build. The user interface comes later, on top of
this API, with React. In the user's words: "focus and api first taking into
consideration all of requirements then we will build ux above it".

## What went wrong in the proof of concept (to avoid)

1. One file holds markup, ~400 lines of CSS, state, routing, nine views,
   lessons, engine wiring and the library.
2. One mutable global `state`; every change re-renders everything; views
   intercept each other's events (tap questions had to swallow the board's
   handlers).
3. No types: steps, moments, sources and answers are untyped objects.
4. Content is hand-formatted JSON edited by string replacement.
5. No-build-step workarounds: cache stamps, a CDN chess.js plus a vendored
   test copy, duplicated tables.
6. Tests pinned to step numbers; fixtures injected by wrapping `fetch`;
   Node unit tests plus Python browser checks.
7. Lesson and engine flows live in page functions, testable only through a
   browser.

What went right and is kept: pure, well-tested chess analysis; lessons as
data; the engine on the device; phone-first checks; no accounts, no
tracking.

## Goals

1. **A typed, UI-free core** (TypeScript) that owns every rule: chess
   analysis (territory, reach, roads, king houses, shapes, diamond, knight
   distances, pins, piece safety), lesson flow, questions, recognition
   rounds, the engine interface, storage and languages. Everything in it is
   testable without a browser.
2. **Data types as schemas** from which both the TypeScript types and the
   runtime checks come (content at build time, saved profiles at load time).
3. **Lessons as Markdown files**, grouped by pattern or strategy, one file
   per lesson per language, with explanations per age inside each step;
   compiled and checked at build time.
4. **Views as layers aligned to the step.** A step describes a *scene*: one
   board plus the analysis layers, focus and emphasis it needs. The core
   produces the layer data; the future UI composes and animates it. No more
   "switch tab to see the other view" as the only mechanism.
5. **Audience**: an age band (8–12, 12–16, adult) and an experience level
   (only `basic` exists now; the model allows more later). Age selects the
   explanation text and the theme family.
6. **Themes**: at least three, one per age band, each with light and dark;
   all colours are named tokens.
7. **Languages**: Polish first and default, English second, through one
   i18n module with plural rules and Polish piece letters in displayed
   moves.
8. **Stockfish behind an interface** with the WASM worker as the first
   adapter, cancellation, a queue, and room for other adapters later.
9. **Storage behind an interface**: one versioned, validated profile in the
   browser now; export/import and an external profile service later through
   the same interface.
10. **Static deploy** to GitHub Pages, built by GitHub Actions.
11. Feature parity with the proof of concept as the first user-facing
    milestone of the platform, then the new UX. Parity means: the nine
    views, loading FEN / PGN / lichess games with the move list and player
    names, flip, letters-for-paper, the library with search and tags, the
    print sheet, share links, lessons with questions and moments,
    Recognise, the Engine view and the evaluation toggle.

**Scope of this phase (my call, from "focus and api first … then we will
build ux above it"):** the core, the content format and compiler, the
conversion of the existing content, CI and the build. No React screens are
built in this phase and the POC stays live. Parity and the UX are the next
phase, designed on top of this API.

## Non-goals (for this design)

- The UX itself: screens, layout, animation, the look of each theme. They
  are designed next, on top of this API.
- A server, accounts, or a hosted profile service (planned for later; only
  the interface is designed now).
- Playing full games against the engine.
- Experience levels beyond `basic` (the type exists; no content yet).
- Languages beyond Polish and English.

## Anti-goals

- Rules inside components again. A React component never decides chess,
  lesson or engine logic; it renders what the core returns.
- A second source of truth: no table, type or text defined twice.
- Content that cannot be read and edited by a person in a text editor.
- Anything that tracks the child or sends their data anywhere.
- Breaking the shared lesson rule that only words differ between languages:
  positions, steps and right answers are identical across translations.

## Constraints

- Static hosting only (GitHub Pages). No runtime server. The build may use
  any tools.
- Persistence in the browser (localStorage or IndexedDB) only, for now.
- Phone-first: everything must work at 390 px width with touch.
- Stockfish 19 lite single-threaded WASM stays vendored with pinned hashes
  (CDNs do not serve it reliably); licence file kept.
- The child's data never leaves the device in this phase.

## Approaches considered

- **A. A UI-free TypeScript core; React on top later (chosen).** The core is
  plain TypeScript with no UI dependency; the app is a React shell.
  Testable without a browser, keeps the POC's strength, lets the UX be
  designed freely later. Cost: nothing visible until the first screen.
- **B. React first, app-centred.** Faster to a screen, but rules drift into
  components — the POC's main failure — and it commits to a UI before the
  UX is designed.
- **C. Plain JavaScript modules with type comments.** Smallest step from
  today, but keeps the no-build workarounds and does not meet "best
  practices, maybe a framework".
- **Scala.js** was considered for the core (Scala 3 types, cats) and
  dropped by the user. Note: scalachess has no Scala.js target, so the
  chess rules would have needed a JS library underneath anyway.

## Decisions made with the user

- Maintainability and best practices are the reason for the rewrite.
- Still a static web app on GitHub Pages; memory persisted in the browser;
  export/import or an external profile service later.
- Polish first, with a real internationalization module.
- Age-dependent experience: three bands, 8–12, 12–16, adult; each has its
  own theme; explanations differ by age.
- Lessons are Markdown files, grouped by pattern or strategy, **not** by
  age; age-specific explanations live inside each lesson.
- A split by user experience level exists in the model; everything now is
  `basic`, for all ages.
- Focus now: the pattern-recognition platform, its data types, and an API
  that includes Stockfish.
- Lesson steps show their layers by themselves; the child can toggle
  layers, and layers unlock as lessons introduce them (option 2).
- Views in a step are presented dynamically, aligned to the step, not only
  as a tab switch (designed here at the data level; the UX comes later).
- Approach A, TypeScript, React for the UI, with pattern libraries for the
  UI (accessible primitives and a component catalogue).

## Design

### Repository layout (one package, folders as modules)

```
src/
  core/
    chess/        rules adapter, Position, Move, SAN (incl. localized letters)
    analysis/     territory, reach, roads, kings, shapes, diamond, knight,
                  pins, safety, crossings  (ported from analysis.js, pure)
    scene/        Step → Scene: which layers, focus, emphasis
    lessons/      lesson flow, gates, answers, progress rules
    recognition/  rounds: usable moments, distractors, seeded builder
    engine/       EngineService interface, UCI parsing, coach (grades, words)
    storage/      ProfileStore interface, versioned schema, migrations
    i18n/         message lookup, plurals, SAN letters, fallbacks
    audience/     AgeBand, Experience, text selection with fallback
  content/        schemas + the Markdown compiler (runs at build time)
  app/            React shell (later): views compose layers from core
content/
  pl/ patterns/ strategy/ games/ positions/
  en/ (same tree)
public/engine/    vendored Stockfish (pinned)
tests/            unit (Vitest) and e2e (Playwright, TypeScript)
```

Dependency rule, enforced by a lint rule: `core` imports nothing from `app`
or React; `content` imports only `core`; `app` imports `core` and the
compiled content.

### Data types (schemas; names are binding, fields are the minimum)

```ts
type Square = 'a1' | … | 'h8';              // branded string
type Color = 'w' | 'b';
type Fen = string & { __brand: 'Fen' };

type PositionSource =
  | { kind: 'fen'; fen: Fen }
  | { kind: 'pgn'; pgn: string; ply: number };   // ply ≤ game length, checked

type AgeBand = 'kids' | 'teens' | 'adults';       // 8–12, 12–16, adult
type Experience = 'basic';                         // more later
type Locale = 'pl' | 'en';

/** Text for each age; `kids` is required, others fall back to the next younger. */
type AgedText = { kids: string; teens?: string; adults?: string };

type LayerKind = 'territory' | 'reach' | 'roads' | 'kings' | 'shapes'
               | 'diamond' | 'knight' | 'engine' | 'pieces';

interface Scene {
  position: PositionSource;
  base: 'board' | 'diamond';           // the drawing surface
  layers: LayerKind[];                  // in draw order; 'pieces' may be absent (blocks only)
  focus?: Square[];                     // squares the step is about
  hideMoves?: boolean;                  // nothing that names the answer
  flip?: boolean;
}

type Question =
  | { kind: 'choice'; prompt: AgedText; choices: string[]; answer: number; right?: AgedText }
  | { kind: 'tap'; prompt: AgedText; squares: Square[]; right?: AgedText }
  | { kind: 'recall'; moment: MomentId; answer: 'yes' | 'no'; right?: AgedText };

interface Step {
  id: string;                           // stable id, not a number
  scene: Scene;                         // compiled: always a full PositionSource
  explain: AgedText;
  moment?: MomentId;
  solve?: { task: AgedText };           // hidden move(s) to find
  question?: Question;
  audience?: { ages?: AgeBand[]; experience?: Experience[] };   // default: all
}

interface Moment { id: MomentId; name: string; board: PositionSource; looksLike?: MomentRef[] }

interface Lesson {
  id: LessonId;
  group: { kind: 'pattern' | 'strategy' | 'game'; id: string };
  title: string; about: AgedText;
  game?: string;                        // name used in recognition answers
  experience: Experience;
  moments: Moment[];                    // may be empty (practice lessons)
  steps: Step[];
}

interface LibraryEntry { id: string; name: string; tags: string[]; note: AgedText; source: PositionSource; scene?: Partial<Scene> }

interface Profile {
  version: 1;
  id: string;                           // local id, for multiple children later
  name?: string;
  age: AgeBand; experience: Experience; locale: Locale;
  theme: { family: AgeBand; mode: 'light' | 'dark' | 'system' };
  pieceStyle: 'images' | 'letters';
  progress: Record<LessonId, { reachedStep: string; done: boolean }>;
  unlockedLayers: LayerKind[];         // grows as steps showing a layer are seen
}
```

Notes:
- **Authoring positions (my call).** In Markdown a step names its position
  in one of five ways, all resolved by the compiler into a full
  `PositionSource`: `fen:`, `pgn:` + `ply:`, `pos:` (a library entry id,
  optional `ply:`), `same` (the previous step's position, optional new
  `ply:`), or `recall: <moment>` (the moment's board). A lesson may also
  declare a lesson-level `pgn:` so steps give only `ply:`. The compiled JSON
  is always inline, so the app and the parity check never resolve
  references.
- **The library is shared, its words are per locale (my call).** Positions,
  tags and default scenes live once in `content/library.yaml`; names and
  notes live in `content/<locale>/library.yaml`, keyed by entry id.
- Steps get stable `id`s so progress, links and tests never depend on step
  numbers (POC failure 6). Progress stores the step id reached.
- `Scene` replaces "a view" per step. A POC view maps to a preset scene
  (`territory` = board + territory layer + pieces), so parity is easy, and a
  step can ask for e.g. `['roads', 'shapes']` (roads over blocks).
- Content is per locale; the compiler checks that every locale has the same
  lessons, step ids, scenes, positions and answers.

### The core API (signatures; bodies to the builder)

```ts
// chess
interface Rules { load(src: PositionSource): Game; }
interface Game { fen(ply?): Fen; moves(): Move[]; ply: number; legalMoves(sq?): Move[]; status(): 'play'|'check'|'mate'|'stalemate'; }
formatSan(move: Move, locale: Locale): string;          // Nf3 → Sf3 in pl

// analysis (pure; ported 1:1 from analysis.js with its tests)
analyse(fen: Fen, layers: LayerKind[]): LayerData;     // only what is asked

// scene
sceneFor(step: Step, rules: Rules): ResolvedScene;    // position, layer data, focus

// lessons
startLesson(lesson: Lesson, profile: Profile, at?: string): LessonRun;
// LessonRun is an immutable value; the UI reports what happened and gets a new run back.
interface LessonRun { step: Step; index: number; total: number; gate: Gate | null;
                      report(e: LessonEvent): LessonRun; next(): LessonRun; back(): LessonRun; }
type LessonEvent =
  | { kind: 'layers'; on: LayerKind[] }           // the child turned layers on or off
  | { kind: 'ply'; ply: number }                   // the viewer stepped through moves
  | { kind: 'answer'; value: number | Square };
type Gate = { kind: 'reveal' | 'answer' };

// recognition
usableMoments(lessons: Lesson[], done: Set<LessonId>): MomentRef[];
buildRound(lessons: Lesson[], done: Set<LessonId>, seed: number, size?: number): Round | null;

// audience + i18n
textFor(t: AgedText, age: AgeBand): string;            // kids ← teens ← adults fallback
t(key: MessageKey, params?, locale?): string;           // typed keys, plural rules

// storage
interface ProfileStore {
  list(): Promise<ProfileSummary[]>; load(id): Promise<Profile | null>;
  save(p: Profile): Promise<void>; remove(id): Promise<void>;
  export(id): Promise<Blob>; import(file: Blob): Promise<Profile>;   // designed now, UI later
}
// adapters: LocalProfileStore (now); RemoteProfileStore (later, same interface)
```

**Layers in lessons (decided with the user: option 2).** A step shows its
scene's layers by itself: no tab-hunting and no "Open Roads first" gate.
The child can turn layers on and off around the step's scene, and a step
may declare `lockedLayers` it hides while a question is open (no answer
leaks, e.g. pieces on a blocks board). Layers *unlock* as lessons introduce
them: a layer becomes available for free use once a step that shows it has
been seen; finishing a lesson unlocks every layer it uses.
`unlockedLayers(profile, lessons): Set<LayerKind>` is a core function and
the profile keeps the set.

The POC's gates (view, ▶ reveal, answer, Shapes reveal) become one `gate`
with two kinds: the hidden move must be revealed, the question must be
answered.

### Stockfish API

```ts
interface EngineService {
  ready(): Promise<EngineInfo>;                                   // name, version
  analyse(fen: Fen, opts: { depth?: number; multipv?: number; movetimeMs?: number },
          signal?: AbortSignal, onProgress?: (a: Analysis) => void): Promise<Analysis>;
  bestMove(fen: Fen, opts: { level: Level }, signal?: AbortSignal): Promise<Move>;
  dispose(): void;
}
interface Analysis { depth: number; lines: { move: Move; score: Score; pv: Move[] }[] }
type Score = { cp: number } | { mate: number };                    // from the side to move
```

- First adapter: `WasmStockfish` (Web Worker, UCI, one search at a time,
  a queue, `stop` on abort, late `bestmove` drained — the POC's lessons).
- Results cached per FEN and settings; a search stopped early is never
  cached (POC rule).
- `coach` on top: `grade(best, guess)`, `evalWords(score, age, locale)`,
  `arrowMoves`. Words differ by age band (kids: "White is better";
  adults: "+1.3").
- Positions the engine cannot judge (no kings, side not to move in check)
  are rejected before reaching it (POC rule).
- Later adapters through the same interface are possible (e.g. a cloud
  evaluation service); none is built now.

### Content format (Markdown)

One lesson per file at `content/<locale>/<group-kind>/<group>/<lesson>.md`.
Front matter holds the lesson's metadata and moments; each `##` heading is
a step with its id and scene; age blocks hold explanations; a question
block holds the question.

```markdown
---
id: scholars-mate
group: { kind: pattern, id: f7-attack }
title: Mat szkolny
game: Mat szkolny
experience: basic
moments:
  attack: { name: atak na f7, pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5", ply: 5 }
---

## attack-houses {scene: board+kings, focus: f7, moment: attack}

::: kids
Pole f7 to najsłabsze pole w domu czarnych: broni go tylko król.
:::
::: adults
f7: bronione tylko przez króla.
:::

? Które pole atakują obie bierki? {tap: f7}
```

- PGNs and SAN in content are standard (English letters); display is
  localised.
- The compiler (build time, Node) parses with remark, validates with the
  schemas, replays every PGN, checks answers, checks locale parity, and
  writes typed JSON per locale. A failing check fails the build with the
  file and line.
- The existing six lessons and the library are converted once by a script
  into this format (English as written; Polish drafted, then reviewed by
  the user).

### Languages

- One message catalogue per locale with typed keys; plurals by CLDR rules
  (Polish one/few/many). Missing keys fall back to English and are listed
  by a test.
- View explanations become message templates with parameters (no glued
  strings).
- Displayed SAN uses locale piece letters: pl K, H, W, G, S (king, queen,
  rook, bishop, knight); input (PGN, FEN, lichess links) stays standard.
- Library choice (Paraglide or i18next) is left to the builder; it must
  give typed keys and CLDR plurals and work in a static build.

### Themes

- Design tokens (colour, radius, spacing, type scale) defined once; a theme
  is a set of token values. Families: `kids`, `teens`, `adults`, each with
  light and dark (six token sets). Board colours are tokens too, and the
  board stays light enough for black pieces in every dark set (POC lesson).
- Theme family defaults to the profile's age band and can be changed.

### UI (later, constraints only)

- React 19 + Vite; accessible primitives (React Aria or Radix) styled with
  the tokens; Storybook as the component catalogue (the pattern library).
- The board is the app's own SVG component (layers draw on it), not a
  third-party board.
- Components render `ResolvedScene` and `LessonRun`; they hold no rules.

### Polish at the parity release (my call, for the next phase)

The Pages switch to the platform happens only with all interface messages
and view explanations in Polish and the converted lessons reviewed by the
user in Polish; English remains available as the second language. Until
then the POC stays live.

### Testing

- Vitest for the core and the content compiler; the POC's 151 unit tests
  are ported with the code they test.
- Playwright in TypeScript for end-to-end at 390 × 844 with touch; tests
  address steps by id, never by number; test content comes from fixture
  Markdown compiled like real content (no fetch wrapping).
- Content checks run in CI on every push.

### Build and deploy

- GitHub Actions: install, typecheck, lint (including the dependency rule),
  unit tests, content compile, build, e2e against the built site, deploy to
  Pages. Content hashes in file names replace the POC's `?v=` stamps.
- chess rules library bundled from npm (one copy for app and tests).

### Migration

- The new platform is built in the same repository on a branch; the POC
  stays live until the platform reaches parity, then the Pages source
  switches to the Actions build.
- Existing on-device progress (`chess-views:lessons`) stays with the POC
  and is not carried over (decided 2026-11-25): every new player starts at
  zero. The step-id table written during conversion still maps old
  `#lesson=` links.
- Existing links (`#fen=`, `#pgn=`, `#pos=`, `#lesson=`) keep working
  through a compatibility route.

## Left to the builder

- Chess rules library: chessops or chess.js (both typed; the adapter hides
  the choice).
- i18n library (see Languages), state management in the app shell, and
  the exact Markdown directive syntax, within the format above.
- IndexedDB or localStorage behind `LocalProfileStore`.
- The order of porting the analysis modules.
- Exact token names and values.
