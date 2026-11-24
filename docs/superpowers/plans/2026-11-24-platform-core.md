# Platform core (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A typed, UI-free TypeScript core for Chess Views (data types, chess rules adapter, analysis, scenes, lessons, recognition, engine, storage, languages), the Markdown content compiler, today's content converted into it, and CI that checks all of it — with no screens and the proof of concept left live.

**Architecture:** (The spec's `src/`, `content/`, `tests/` tree lives under `platform/`, so the POC at the repo root keeps serving unchanged.) A new `platform/` package beside the POC (the POC keeps serving from the repo root on Pages). `platform/src/core` is pure TypeScript with no DOM or React imports (enforced by lint); `platform/src/content` compiles `platform/content/**/*.md` into checked JSON; `platform/scripts/convert-poc.ts` converts `positions.json` once. Every module is tested with Vitest on Node.

**Tech Stack:** Node 24, npm, TypeScript 5 (strict), Vitest, ESLint (flat config, `no-restricted-imports` for the dependency rule), Zod, chess.js 1.x (npm), unified + remark-parse + remark-frontmatter + remark-directive + yaml, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-24-platform-design.md`

## Global Constraints

- Static hosting only; nothing in this phase changes what GitHub Pages serves (the POC at the repo root).
- No DOM, `window`, `localStorage` or React import anywhere under `platform/src/core` except `core/storage/local.ts` and `core/engine/wasm.ts`, which take their browser objects as constructor parameters (tests pass fakes).
- `core` imports nothing from `content`, `scripts` or any UI; `content` imports only `core`.
- Locales `pl` (default) and `en`; age bands `kids` (8–12), `teens` (12–16), `adults`; experience `basic` only.
- `AgedText` fallback: `adults → teens → kids`, `teens → kids`; `kids` required.
- Polish SAN letters on display: K (king), H (queen), W (rook), G (bishop), S (knight); stored PGN/SAN stays English.
- Positions, step ids, scenes and right answers identical across locales; only words differ.
- Steps addressed by stable string ids, never by number, in code and tests.
- The child's data never leaves the device; no network calls in core.
- Stockfish files stay vendored at the repo's `engine/` with pinned SHA-256 (`ccb130d7…c91a` js, `ee4f115b…96de` wasm).
- Commits: `git -c user.name="Damian Ospara" -c user.email="1453374+damian0o@users.noreply.github.com"`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01P7r4y9XCRV4NafGyZ61FWC`.

## Review Focus

1. A saved profile that is corrupt, from an older version, or hand-edited loads as a valid profile (migrated or default), never throws — Task 9 test.
2. A Markdown lesson with a PGN that does not replay, a ply past the end, an answer out of range, or a locale whose steps/answers differ from the other fails the build with `file:line` and a readable reason — Task 10 test.
3. A step with an open question on a blocks board resolves to a scene with no `pieces` layer and `hideMoves: true` until the answer is right — Task 6 test.
4. An engine search aborted mid-way followed by a new search never returns the first search's late `bestmove` as the second's answer, and the aborted result is not cached — Task 8 test.
5. POC progress (`chess-views:lessons` with step numbers) migrates to step ids with `done` kept, and a step number past the new length maps to the last step — Task 9 and Task 11 test.

---

### Task 1: The `platform/` package, toolchain and CI

**Files:**
- Create: `platform/package.json`, `platform/tsconfig.json`, `platform/vitest.config.ts`, `platform/eslint.config.js`, `platform/src/core/index.ts`, `platform/tests/smoke.test.ts`, `platform/tests/boundaries.test.ts`, `.github/workflows/platform.yml`
- Modify: `README.md` (one paragraph: the platform lives in `platform/`, phase 1 has no screens)

**Interfaces:**
- Produces: npm scripts `typecheck` (`tsc --noEmit`), `lint` (`eslint .`), `test` (`vitest run`), `content` (Task 10), `check` (all four in order). Path alias `@core/*` → `src/core/*`.

- [ ] **Step 1:** Create the package (TypeScript `strict`, `noUncheckedIndexedAccess`, ESM, target ES2022) and a smoke test `core exports a version` asserting `CORE_VERSION === '0.1.0'` from `src/core/index.ts`.
- [ ] **Step 2:** Write `boundaries.test.ts`: run ESLint's Node API on two in-memory files — `src/core/x.ts` importing `react` and `src/core/y.ts` importing `../content/z` — and assert each yields exactly one `no-restricted-imports` error; `src/content/a.ts` importing `@core/index` yields none.
- [ ] **Step 3:** Run `cd platform && npm install && npm test` — Expected: FAIL (no ESLint config / no export).
- [ ] **Step 4:** Add `CORE_VERSION`, the ESLint flat config with the dependency rule (restricted patterns in `src/core/**`: `react`, `react-dom`, `**/content/**`, `**/scripts/**`; in `src/content/**`: `react`, `react-dom`).
- [ ] **Step 5:** Run `npm run check` — Expected: all pass.
- [ ] **Step 6:** Add `.github/workflows/platform.yml`: on push and PR touching `platform/**`, Node 24, `npm ci` then `npm run check` in `platform/`. No deploy job.
- [ ] **Step 7:** Commit `Platform: package, strict TypeScript, lint boundaries, CI`.

### Task 2: Data types as schemas

**Files:**
- Create: `platform/src/core/types.ts` (Zod schemas and inferred types), `platform/tests/types.test.ts`

**Interfaces:**
- Produces (exported schema `XSchema` and type `X` for each): `Square`, `Color`, `Fen`, `PositionSource`, `AgeBand`, `Experience`, `Locale`, `AgedText`, `LayerKind`, `Scene` (with `lockedLayers?: LayerKind[]`), `Question` (choice | tap | recall), `Step`, `Moment`, `MomentRef` (`"<lessonId>/<momentId>"`), `Lesson`, `LibraryEntry`, `Profile` (version 1, with `unlockedLayers`), exactly as the spec's "Data types" block, plus `LAYER_KINDS`, `AGE_BANDS`, `LOCALES` constant arrays (the single source for those lists).

- [ ] **Step 1: Write failing tests:** `Square accepts a1..h8 and rejects i9, A1, ''`; `PositionSource: pgn needs an integer ply ≥ 0`; `AgedText needs kids`; `Question choice: 2–4 choices, answer in range`; `Question tap: 1+ valid squares`; `Step id matches /^[a-z0-9-]+$/`; `Profile: version 1, locale pl|en, age kids|teens|adults`; `Scene.layers only LAYER_KINDS`.
- [ ] **Step 2:** Run `npx vitest run tests/types.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the schemas.
- [ ] **Step 4:** Run — Expected: PASS; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: data types as Zod schemas`.

### Task 3: Chess rules adapter and localised SAN

**Files:**
- Create: `platform/src/core/chess/rules.ts`, `platform/src/core/chess/san.ts`, `platform/tests/chess.test.ts`

**Interfaces:**
- Consumes: `PositionSource`, `Fen`, `Square`, `Locale` (Task 2).
- Produces: `loadGame(src: PositionSource): Game` (throws `ChessError` with a reason for a bad FEN/PGN or ply past the end); `interface Game { fen(ply?: number): Fen; moves(): Move[]; ply: number; length: number; headers(): Record<string,string>; legalMoves(fen: Fen, from?: Square): Move[]; status(ply?: number): 'play'|'check'|'mate'|'stalemate' }`; `Move = { from: Square; to: Square; san: string; promotion?: string }`; `formatSan(san: string, locale: Locale): string`. Backed by chess.js 1.x; no other file imports chess.js.

- [ ] **Step 1: Write failing tests:** load the Opera PGN (with headers) → `length 33`, `status() === 'mate'`, `headers().White === 'Morphy'`; `loadGame({kind:'pgn', pgn, ply: 34})` throws `ChessError` mentioning the length; `fen(5)` of `1. e4 e5 2. Bc4 Nc6 3. Qh5` equals `r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3`; `formatSan('Nf3','pl') === 'Sf3'`, `'Qxf7#' → 'Hxf7#'`, `'O-O-O' → 'O-O-O'`, `'exd8=Q+' → 'exd8=H+'`, `'Kd2#' → 'Kd2#'`, `'Rh2+' → 'Wh2+'`, `'Bd8#' → 'Gd8#'`, and `formatSan(x,'en') === x`.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: chess rules adapter and Polish move letters`.

### Task 4: Analysis, ported from the POC

**Files:**
- Create: `platform/src/core/analysis/*.ts` (one file per area: `board.ts`, `attacks.ts`, `territory.ts`, `safety.ts`, `mobility.ts`, `roads.ts`, `kings.ts`, `shapes.ts`, `diamond.ts`, `knight.ts`, `pins.ts`, `pawns.ts`, `input.ts`, `index.ts`), `platform/tests/analysis/*.test.ts`

**Interfaces:**
- Consumes: `Fen`, `Square`, `LayerKind` (Task 2).
- Produces: every export of the POC's `analysis.js` with the same name and behaviour, typed (`Board = (Cell | null)[][]`, `Cell = { type, color, square }`); plus `analyse(fen: Fen, layers: LayerKind[]): LayerData` where `LayerData` has one optional typed field per layer (`territory`, `reach`, `roads` (rays + crossings + pawnGuards), `kings`, `shapes`, `diamond`, `knight`, `safety`, `pins`) and computes only the requested ones.

- [ ] **Step 1:** Port the POC's 21 analysis-related test files (`tests/board.test.js` … `tests/shapes.test.js`, excluding `coach`, `engine`, `lessons`, `library`, `stamp`, `touch-css`) to Vitest under `platform/tests/analysis/`, unchanged in their assertions; add `analyse: computes only the requested layers` (asking `['roads']` returns `roads` and no `territory`).
- [ ] **Step 2:** Run — Expected: FAIL (modules missing).
- [ ] **Step 3:** Port `analysis.js` into the files above as typed TypeScript, behaviour unchanged.
- [ ] **Step 4:** Run — Expected: every ported assertion passes; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: analysis ported with its tests`.

### Task 5: Languages and audience

**Files:**
- Create: `platform/src/core/i18n/index.ts`, `platform/src/core/i18n/messages/en.ts`, `platform/src/core/i18n/messages/pl.ts`, `platform/src/core/audience.ts`, `platform/tests/i18n.test.ts`

**Interfaces:**
- Produces: `type MessageKey = keyof typeof en`; `t(locale: Locale, key: MessageKey, params?: Record<string, string|number>): string`; messages are strings or plural objects `{ one, few?, many?, other }` selected with `Intl.PluralRules(locale)` from `params.count`; `{name}` placeholders; a key missing in `pl` falls back to `en`; `missingKeys(locale): MessageKey[]`; `textFor(t: AgedText, age: AgeBand): string`. No i18n library (Ruling candidate: the spec left it to the builder; `Intl.PluralRules` gives CLDR plurals with typed keys and no dependency).
- Initial catalogue: the step-bar and question strings the lessons need (`answerFirst`, `tryAgain`, `right`, `revealFirst`, `nOfTotal`, `moves` (plural), `roundFinished`, `lessonFinished`, `whichGameWhichMoment`, `lessonNotHere`), in both locales.

- [ ] **Step 1: Write failing tests:** `t('pl','moves',{count:1}) === '1 ruch'`, `{count:2} → '2 ruchy'`, `{count:5} → '5 ruchów'`, `{count:22} → '22 ruchy'`; `t('en','moves',{count:1}) === '1 move'`; a key deleted from a test copy of `pl` falls back to English; `missingKeys('pl')` is `[]` for the shipped catalogue; `textFor({kids:'k'},'adults') === 'k'`; `textFor({kids:'k',teens:'t'},'adults') === 't'`; `textFor({kids:'k',adults:'a'},'teens') === 'k'`.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: messages with Polish plurals; text by age`.

### Task 6: Scenes, lesson runs and layer unlocking

**Files:**
- Create: `platform/src/core/scene.ts`, `platform/src/core/lessons/run.ts`, `platform/src/core/lessons/unlock.ts`, `platform/tests/lessons.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces:
  - `sceneFor(step: Step, opts: { answered: boolean }): ResolvedScene` — `ResolvedScene = { fen: Fen; moves: Move[]; ply: number; layers: LayerKind[]; data: LayerData; focus: Square[]; hideMoves: boolean; flip: boolean }`. While a question is open (`!answered`) the step's `lockedLayers` are removed, and a blocks step (scene without `pieces`, or `question.kind === 'recall'`) has `moves: []` and `hideMoves: true`.
  - `startLesson(lesson: Lesson, profile: Profile, at?: string): LessonRun` (unknown `at` → first step); `LessonRun` immutable: `{ lesson; step; index; total; gate: Gate | null; answered: boolean; lastAnswer: 'right'|'wrong'|null; wrong: (number|Square)[]; layersOn: LayerKind[]; report(e: LessonEvent): LessonRun; next(): LessonRun; back(): LessonRun }`. Steps whose `audience` excludes the profile's age or experience are skipped. Gates: `reveal` (a `solve` step until a `ply` event past the step's ply), then `answer`. `next()` while gated returns the same run. A `layers` event can only turn on unlocked layers or the step's own.
  - `unlockedLayers(profile: Profile, lessons: Lesson[]): Set<LayerKind>` and `recordSeen(profile: Profile, step: Step): Profile` (adds the step's layers to `unlockedLayers`; finishing a lesson adds all its layers).

- [ ] **Step 1: Write failing tests** with a fixture lesson built from the schema (not a file): gate order `reveal` before `answer`; wrong choice → `lastAnswer 'wrong'`, index kept in `wrong`, gate stays; right → gate null; `back()` then `next()` re-asks (answered false); Review Focus 3: a recall step resolves with no `pieces`, `moves: []`, `hideMoves: true` before the answer and with pieces and the game's moves after; a step with `audience: { ages: ['kids'] }` is skipped for an adult profile; `layers` event cannot turn on a locked layer; `recordSeen` adds `roads` after a roads step; `startLesson(…, 'no-such-id')` starts at the first step.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: scenes, lesson runs, layers that unlock`.

### Task 7: Recognition rounds

**Files:**
- Create: `platform/src/core/recognition.ts`, `platform/tests/recognition.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `MomentRef`, `Step`, `Question` (Task 2), `textFor` (Task 5).
- Produces: `usableMoments(lessons, done: Set<LessonId>): UsableMoment[]`, `roundUnlocked(lessons, done): boolean`, `buildRound(lessons, done, seed: number, size = 8): Round | null` with `Round = { seed; steps: Step[] }` (each step a recall-style blocks question whose choices are `"<game>: <moment name>"`), `ROUND_SIZE = 8`, `MIN_USABLE = 4` — the POC rules exactly: pairwise-allowed wrong answers (looksLike in both directions), same-lesson moments first, mulberry32 seed, 3–4 choices.

- [ ] **Step 1:** Port the POC's round tests from `tests/lessons.test.js` (sections "Task 4: recognition rounds") to Vitest against fixture lessons in the new schema; add `buildRound: labels come from the lesson's locale` (a `pl` fixture yields Polish labels).
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement (port of `lessons.js` round code).
- [ ] **Step 4:** Run — Expected: PASS; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: recognition rounds`.

### Task 8: Engine service and coach

**Files:**
- Create: `platform/src/core/engine/types.ts`, `platform/src/core/engine/uci.ts`, `platform/src/core/engine/wasm.ts`, `platform/src/core/engine/cache.ts`, `platform/src/core/engine/coach.ts`, `platform/tests/engine.test.ts`, `platform/tests/coach.test.ts`

**Interfaces:**
- Consumes: `Fen`, `Move`, `AgeBand`, `Locale`, `t` (Tasks 2, 3, 5).
- Produces: `EngineService`, `Analysis`, `Score`, `Level` (`'easy'|'medium'|'hard'`) exactly as the spec's "Stockfish API"; `createWasmStockfish({ workerFactory: () => WorkerLike, timeoutMs?: number }): EngineService` (one search at a time, queue, `stop` on abort, late `bestmove` drained, worker error fails pending calls); `parseInfo`, `analysisFromLines` (ported from `coach.js`); `cachedEngine(engine: EngineService, max = 64): EngineService` (never caches a result shallower than requested or an aborted one); `judgeable(fen: Fen): boolean` (kings present, side not to move not in check, a legal move exists); coach: `grade(best: Score, guess: Score): { label: MessageKey; loss: number | null }`, `evalWords(white: Score, age: AgeBand, locale: Locale): string` (kids/teens words, adults the number), `evalNumber`, `barPercent`, `arrowMoves` — all ported from `coach.js`, with labels as message keys added to Task 5's catalogue.

- [ ] **Step 1:** Port `tests/coach.test.js` and the fake-worker tests of `tests/engine.test.js` to Vitest; add Review Focus 4: start a search, abort it, start another; the fake worker then sends the first search's `bestmove` followed by the second's — the second promise resolves with the second's move, and `cachedEngine` holds no entry for the first FEN; add `judgeable: false for no kings, for the side not to move in check, for mate`; `evalWords({cp:130},'adults','pl') === '+1.3'` and kids/pl gives the Polish words.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: engine service, Stockfish adapter, coach`.

### Task 9: Profile storage

**Files:**
- Create: `platform/src/core/storage/store.ts`, `platform/src/core/storage/local.ts`, `platform/src/core/storage/migrate.ts`, `platform/tests/storage.test.ts`

**Interfaces:**
- Consumes: `Profile`, `ProfileSchema` (Task 2).
- Produces: `ProfileStore` exactly as the spec; `createLocalProfileStore(storage: StorageLike, key = 'chess-views:profiles'): ProfileStore`; `defaultProfile(): Profile` (`locale 'pl'`, `age 'kids'`, `experience 'basic'`, theme `{ family: 'kids', mode: 'system' }`, `pieceStyle 'images'`, empty progress, `unlockedLayers: ['pieces']`); `migratePocProgress(raw: unknown, stepIds: Record<LessonId, string[]>): Profile['progress']` (POC step number n → `stepIds[lesson][n-1]`, past the end → last id, `done` kept, unknown lessons dropped); `export(id)` yields a JSON Blob `{ format: 'chess-views-profile', version: 1, profile }`; `import(blob)` validates and returns the profile with a new local id.

- [ ] **Step 1: Write failing tests:** Review Focus 1 — storage holding `'not json'`, `{"version":0,…}`, a profile with `age: 'toddler'`, and a throwing storage each make `load` return `null` or the migrated/default profile and never throw, and `list()` returns `[]` for garbage; save→load round-trip; `remove`; export→import round-trip gives an equal profile except `id`; importing a Blob with `format: 'other'` rejects with a readable error; Review Focus 5 — `migratePocProgress({ 'scholars-mate': { step: 17, done: true }, 'gone': {step:1,done:false} }, { 'scholars-mate': ids25 })` → `{ 'scholars-mate': { reachedStep: ids25[16], done: true } }` and step 40 → `ids25[24]`.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: versioned profiles in the browser, export and import`.

### Task 10: The Markdown content compiler

**Files:**
- Create: `platform/src/content/parse.ts`, `platform/src/content/resolve.ts`, `platform/src/content/check.ts`, `platform/src/content/compile.ts`, `platform/scripts/compile-content.ts`, `platform/tests/content/*.test.ts`, `platform/tests/content/fixtures/**`
- Modify: `platform/package.json` (`content` script: `tsx scripts/compile-content.ts content dist/content`)

**Interfaces:**
- Consumes: schemas (Task 2), `loadGame` (Task 3), `validate` rules equivalent to the POC's `validateLesson`.
- Produces: `compileContent(root: string): { lessons: Record<Locale, Lesson[]>; library: Record<Locale, LibraryEntry[]>; errors: ContentError[] }` with `ContentError = { file: string; line: number; message: string }`; output files `dist/content/<locale>/lessons.json` and `library.json`. Format (spec "Content format"): front matter (`id`, `group`, `title`, `about` aged, `game`, `experience`, `moments`, optional lesson-level `pgn`); each `## <step-id> {scene: board+roads, focus: f7, moment: attack, fen|pgn|ply|pos|same|recall: …, solve: "task", locked: pieces}`; `::: kids|teens|adults` blocks → `explain`; question lines `? <prompt> {choices: a | *b* | c}` (the starred choice is right), `? <prompt> {tap: f7}`, `? <prompt> {recall: <moment>, answer: yes|no}`; a question may carry its own age blocks. Library: `content/library.yaml` (positions, tags, scene) + `content/<locale>/library.yaml` (names, notes). The script exits non-zero and prints `file:line: message` for every error.

- [ ] **Step 1: Write failing tests** against fixture trees: a valid two-locale lesson compiles to the expected `Lesson` objects (positions resolved inline for `same`, `pos`, `recall` and lesson-level `pgn`+`ply`); Review Focus 2 — separate fixtures for an illegal PGN, `ply` past the end, a choice list with no starred answer, two starred answers, a `tap` on `z9`, a `recall` naming an unknown moment, an `en` file whose step ids differ from `pl`, and an `en` file whose right answer differs from `pl` each yield exactly one `ContentError` with the right file and the line of the offending step heading or question; a missing `::: kids` block is an error; `npm run content` on the fixture tree with an error exits 1.
- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run — Expected: PASS; `npm run check` green.
- [ ] **Step 5:** Commit `Platform: Markdown lessons compiled and checked`.

### Task 11: Convert today's content

**Files:**
- Create: `platform/scripts/convert-poc.ts`, `platform/content/library.yaml`, `platform/content/{en,pl}/library.yaml`, `platform/content/{en,pl}/patterns/f7-attack/{scholars-mate,eyes-on-f7}.md`, `platform/content/{en,pl}/games/{opera-game,legal-mate,reti-tartakower,lasker-thomas}.md`, `platform/content/poc-step-ids.json`, `platform/tests/content/converted.test.ts`
- Modify: `.github/workflows/platform.yml` (add `npm run content` after `npm run check`)

**Interfaces:**
- Consumes: Task 10 format, Task 9 `migratePocProgress` (the `poc-step-ids.json` table is its `stepIds`).
- Produces: the six POC lessons and 25 library entries in the new format; English text = the POC's `say`/`note` as `kids` text; Polish = drafted translations marked `<!-- draft: review -->` at the top of each `pl` file; step ids derived from content (`attack-houses`, `mate-strike`, …), unique per lesson; `poc-step-ids.json` maps each lesson to its step ids in POC order (for the Scholar's mate, the POC's current 25 steps).

- [ ] **Step 1: Write failing tests:** `npm run content` on `platform/content` reports no errors; the compiled `en` lessons match the POC's `positions.json` lesson by lesson: same number of steps, same resolved FEN per step (compared via `loadGame`), same right answer per question, same moments; `pl` has the same ids, positions and answers; every `pl` file starts with the draft marker; `poc-step-ids.json['scholars-mate'].length === 25`; the library has 25 entries in both locales.
- [ ] **Step 2:** Run — Expected: FAIL (no content).
- [ ] **Step 3:** Write `convert-poc.ts`, run it once, then write the Polish drafts (kids text; piece moves in prose stay standard SAN and are localised on display).
- [ ] **Step 4:** Run `npm run check && npm run content` — Expected: PASS; CI workflow runs `content` too.
- [ ] **Step 5:** Commit `Platform: today's lessons and library in the new format (Polish drafts)`.

### Task 12: README and the final pass

**Files:**
- Modify: `platform/README.md` (create), `README.md` (link to it)

- [ ] **Step 1:** Write `platform/README.md`: layout, the dependency rule, `npm run check`, `npm run content`, the Markdown format with one full example, how to add a language, and that the Polish lesson texts await review.
- [ ] **Step 2:** Run `cd platform && npm run check && npm run content`; and the POC's own `npm test` at the repo root — Expected: all pass (the POC is untouched).
- [ ] **Step 3:** Commit `Platform: README`.
