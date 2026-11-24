# Platform UI, release 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The first published release of the new UI. It covers:
- players ("Kto gra?");
- home;
- the lesson screen with the view dropdown, the step card, questions and the legend popup;
- Recognise;
- the six age themes.

It is published at the Pages root, with the POC moved to `/poc/` and old POC links forwarded there.

**Architecture:** A React 19 app in `platform/src/app/` built by Vite next to the phase-1 core (same package).
- **Components** render what the core returns.
- **The store:** a single Zustand store calls the core and saves through `ProfileStore`.
- **Routing:** hash routes with wouter.
- **Styling:** design tokens are CSS variables read by Tailwind 4.
- **Publishing:** a GitHub Actions workflow builds the content and the app, copies the POC to `/poc/`, and deploys to Pages.

**Scope of this plan:** release 1. A second plan (release 2) adds these to reach parity:
- the free board (load FEN/PGN/lichess, move strip, flip, letters-for-paper, guess-the-move);
- the library with the print sheet;
- the four views no lesson uses yet (reach, knight, diamond, engine);
- the evaluation bar.

Until then those POC links are forwarded to `/poc/`.

**Tech Stack:**
- Vite 8, @vitejs/plugin-react 6, React 19.3, TypeScript 5 (strict);
- Tailwind 4 (@tailwindcss/vite);
- react-aria-components 1.22;
- Zustand 5, wouter 3 (hash location), motion 14;
- Vitest with jsdom and @testing-library/react;
- @playwright/test 1.65;
- GitHub Actions + actions/deploy-pages.

**Spec:** `docs/superpowers/specs/2026-11-24-platform-ui-design.md` (and phase 1: `docs/superpowers/specs/2026-11-24-platform-design.md`)

## Global Constraints

- **No rules in components.** Chess, lesson, engine and profile rules live in `platform/src/core` (with tests). `src/app` may import `core` and the compiled content, nothing in `core` may import `app`, and lint enforces it.
- **Text:**
  - Every visible string comes from the message catalogues (`t`) or compiled content, Polish default, with English complete too (`missingKeys('pl')` and `missingKeys('en')` are `[]`).
  - Moves inside text go through `localizeMoves`.
  - Explanations go through `textFor(…, profile.age)`.
- **No answer leaks.** While a question is open on a blocks step:
  - the view dropdown is disabled;
  - other routes and tabs cannot show the pieces;
  - the board renders exactly `sceneOfRun(run)`.
- **Layout and accessibility:**
  - Phone first: 390 × 844 with touch, no horizontal overflow.
  - Tablet and laptop (≥ 768 px wide): the step card sits beside the board.
  - Accessibility: every control is reachable by keyboard and has a visible focus ring; `prefers-reduced-motion` turns off celebrations.
- **Kids theme:** very colourful and playful (bright saturated palette, big rounded controls, soft shadows, a celebration on "Dobrze!"), with our own look. No other product's characters, art, logo or branding.
- **Piece art and engine files:**
  - Piece images are the cburnett set (CC BY-SA 3.0) as embedded in the POC's `pieces.css`, with the attribution kept in the app's About text and README.
  - The vendored Stockfish files are not used in release 1 and stay untouched.
- **Commits** use `git -c user.name="Damian Ospara" -c user.email="1453374+damian0o@users.noreply.github.com"` and end with:
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01P7r4y9XCRV4NafGyZ61FWC`

## Review Focus

1. **An open blocks question** (recall, or `scene: blocks`). Nothing shows the pieces or the moves until the answer is right:
   - view dropdown disabled;
   - the legend popup does not describe the pieces;
   - no move list;
   - tapping a locked option does nothing.
   
   Tested in Task 8.
2. **A saved profile from phase 1 (version 1)** opens as version 2 with its progress intact. A corrupt store still shows "Kto gra?" with "add a player". Tested in Task 2.
3. **Old POC links in the new app:**
   - `#lesson=scholars-mate&step=7` opens that step for the chosen player.
   - `#fen=…`, `#pgn=…`, `#pos=…` and `#lesson=` with an unknown id go to the same hash under `/poc/`.
   - Nothing loops.
   
   Tested in Tasks 5 and 10.
4. **Reload mid-lesson.** A reload on `#/lesson/<id>/<stepId>` reopens the same step with the question re-asked. An unknown step id opens the lesson's first step, and an unknown lesson goes home with a toast. Tested in Task 8.
5. **Dark mode and 390 px.** In all six theme sets, text on buttons and cards has contrast ≥ 4.5, the board's dark squares stay light enough for black pieces (relative luminance > 0.45), and nothing overflows horizontally. Tested in Task 10.

---

### Task 1: The app scaffold and its toolchain

**Files:**
- Modify: `platform/package.json` (deps, scripts `dev`, `build` = `npm run content && vite build`, `preview`, `e2e`), `platform/tsconfig.json` (DOM lib and JSX for `src/app`), `platform/vitest.config.ts` (jsdom for `tests/app/**`), `platform/eslint.config.js` (core may not import `**/app/**`; app may not import `**/scripts/**`)
- Create: `platform/vite.config.ts` (base `./`, React and Tailwind plugins, alias `@core`, `@content` → `dist/content`), `platform/index.html`, `platform/src/app/main.tsx`, `platform/src/app/App.tsx`, `platform/src/app/styles.css`, `platform/tests/app/smoke.test.tsx`
- Modify: `platform/tests/boundaries.test.ts`

**Interfaces:**
- Produces:
  - `App` (default export of `App.tsx`);
  - npm scripts `dev`, `build`, `preview`, `e2e`;
  - the `@content/<locale>/lessons.json` and `library.json` imports.

- [ ] **Step 1:** Install the stack:
  - react@19, react-dom@19, @vitejs/plugin-react@6, vite@8, @tailwindcss/vite@4, tailwindcss@4, react-aria-components@1, zustand@5, wouter@3, motion@14;
  - dev: @testing-library/react@16, jsdom, @types/react, @types/react-dom.
  
  If Vitest 3 does not support Vite 8, upgrade Vitest to the first major that does (record it as a ruling).
- [ ] **Step 2: Write failing tests:**
  - `smoke.test.tsx` — `App renders the players screen title`: rendering `<App />` with an empty fake storage shows the text `Kto gra?`.
  - In `boundaries.test.ts`: `core may not import app` (`src/core/x.ts` importing `../app/App` gives one `no-restricted-imports` error).
- [ ] **Step 3:** Run `cd platform && npx vitest run tests/app tests/boundaries.test.ts`. Expected: FAIL (no App, no rule).
- [ ] **Step 4:** Implement the scaffold. `App` renders a placeholder players screen with `t('pl','whoPlays')`, a new key (en "Who's playing?", pl "Kto gra?"). Add the lint rule.
- [ ] **Step 5:** Run `npm run check && npm run build`. Expected: all pass, `dist/index.html` exists.
- [ ] **Step 6:** Commit `App: Vite, React 19, Tailwind 4 scaffold`.

### Task 2: Core additions — profile version 2, recording progress

**Files:**
- Modify: `platform/src/core/types.ts`, `platform/src/core/storage/local.ts`, `platform/src/core/storage/migrate.ts`, `platform/src/core/lessons/unlock.ts`
- Create: `platform/src/core/lessons/progress.ts`
- Test: `platform/tests/progress.test.ts`, `platform/tests/storage.test.ts` (extend)

**Interfaces:**
- Produces:
  - `ProfileSchema` with `version: 2` and new fields:
    - `avatar: 'violet' | 'orange' | 'green' | 'blue' | 'pink' | 'yellow'`;
    - `theme.family: AgeBand` stays, and becomes user-choosable.
  - `migrateProfile(raw: unknown): Profile | null` (version 1 → 2 with `avatar: 'violet'`; version 2 validated; anything else null). `createLocalProfileStore` uses it in `load` and `list`.
  - `defaultProfile(opts?: { name?: string; age?: AgeBand; locale?: Locale; avatar?: Avatar }): Profile` uses `crypto.randomUUID` when present, else a time+random id (fixes phase-1 minor M2).
  - `recordStep(profile: Profile, run: LessonRun): Profile` (sets `progress[lesson].reachedStep` to the run's step id, never moves backwards in the lesson's step order, and adds the step's layers through `recordSeen`).
  - `finishLesson(profile: Profile, lesson: Lesson): Profile` (`done: true`, all its layers unlocked).
  - `resumeStepId(profile: Profile, lesson: Lesson): string | undefined`.

- [ ] **Step 1: Write failing tests:**
  - `migrateProfile: a version 1 profile becomes version 2 with progress kept`
  - `migrateProfile: version 3, garbage and null give null`
  - `LocalProfileStore: a stored version 1 profile loads as version 2` (Review Focus 2)
  - `defaultProfile works without crypto.randomUUID` (stub `globalThis.crypto` without it)
  - `recordStep never moves progress backwards` (reach s05 then report s03 → `reachedStep` stays s05)
  - `recordStep unlocks the step's layers`
  - `finishLesson marks done and unlocks every layer of the lesson`
  - `resumeStepId returns the saved step, or undefined for a finished or unknown lesson`
- [ ] **Step 2:** Run `npx vitest run tests/progress.test.ts tests/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: all pass.
- [ ] **Step 5:** Commit `Core: profile version 2, progress recording`.

### Task 3: Themes

**Files:**
- Create: `platform/src/app/theme/tokens.css` (six sets as `[data-family="kids|teens|adults"][data-mode="light|dark"]` blocks of CSS variables), `platform/src/app/theme/ThemeRoot.tsx`, `platform/tests/app/theme.test.tsx`
- Modify: `platform/src/app/styles.css` (Tailwind `@theme` mapping the variables: `--color-surface`, `--color-ink`, `--color-ink-soft`, `--color-accent`, `--color-accent-ink`, `--color-good`, `--color-bad`, `--color-board-light`, `--color-board-dark`, `--radius-control`, `--shadow-card`, `--text-step`)

**Interfaces:**
- Produces:
  - `<ThemeRoot profile={Profile | null}>` sets `data-family` and `data-mode` on `document.documentElement`. `mode: 'system'` follows `prefers-color-scheme` live. With no profile it defaults to `kids` and `system`.
  - The Tailwind colour names above.

Values: every set keeps:
- body and control text contrast ≥ 4.5;
- `--color-board-dark` relative luminance > 0.45.

Per family:
- **kids:** saturated violet, orange, green, sky and pink accents, `--radius-control: 1.25rem`, large soft shadows.
- **teens:** calmer, `0.75rem`.
- **adults:** neutral, `0.375rem`, compact text.

- [ ] **Step 1: Write failing tests:**
  - `ThemeRoot sets family and mode from the profile`
  - `system mode follows a matchMedia change`
  - `no profile gives kids/system`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement tokens and `ThemeRoot`.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: six theme token sets`.

### Task 4: Messages for the app, and the `useT` hook

**Files:**
- Modify: `platform/src/core/i18n/messages/en.ts`, `pl.ts` (new keys below)
- Create: `platform/src/app/i18n.ts`, `platform/tests/app/i18n.test.tsx`

**Interfaces:**
- Produces:
  - `useT(): (key: MessageKey, params?) => string`, which reads the current profile's locale from the store (Task 5), default `pl`;
  - `useText(): (t: AgedText) => string`, which applies `textFor` by age, then `localizeMoves` by locale.
- New keys (en / pl), drafted for the user's later review:
  - **Players:** `whoPlays` (Who's playing? / Kto gra?), `addPlayer` (Add a player / Dodaj gracza), `playerName` (Name / Imię), `ageBand` (Age / Wiek), `age8to12` (8–12), `age12to16` (12–16), `ageAdult` (Adult / Dorosły), `language` (Language / Język), `save` (Save / Zapisz), `cancel` (Cancel / Anuluj), `switchPlayer` (Switch player / Zmień gracza), `settings` (Settings / Ustawienia).
  - **Home:** `home` (Home / Start), `groupPattern` (Patterns / Wzory), `groupStrategy` (Strategy / Strategia), `groupGame` (Games / Partie), `start` (Start / Zacznij), `continue` (Continue / Kontynuuj), `startOver` (Start over / Od nowa), `finished` (Finished / Ukończone), `recognise` (Recognise / Rozpoznaj), `recogniseLocked` (Finish two game lessons to unlock / Ukończ dwie lekcje z partiami, żeby odblokować), `recogniseAbout` (Which game, which position? Boards from the lessons you finished. / Która partia, która pozycja? Pozycje z ukończonych lekcji.), `stepOf` (Step {n} of {total} / Krok {n} z {total}).
  - **Lesson screen:** `view` (View / Widok), `legend` (What do I see? / Co widzę?), `close` (Close / Zamknij), `finish` (Finish ✓ / Zakończ ✓), `tapASquare` (Tap a square on the board / Dotknij pola na szachownicy).
  - **Theme and settings:** `themeFamily` (Look / Wygląd), `modeLight` (Light / Jasny), `modeDark` (Dark / Ciemny), `modeSystem` (Like the device / Jak urządzenie), `exportProfile` (Save to a file / Zapisz do pliku), `importProfile` (Load from a file / Wczytaj z pliku), `removePlayer` (Remove player / Usuń gracza), `about` (About / O aplikacji), `pieceArt` (Piece images: cburnett set by Colin M.L. Burnett, CC BY-SA 3.0. / Grafiki bierek: zestaw cburnett, Colin M.L. Burnett, CC BY-SA 3.0.).
  - **Legends**, one per view, written for kids: `legendBoard`, `legendTerritory`, `legendRoads`, `legendKings`, `legendShapes`. Release 2 adds the other four.

- [ ] **Step 1: Write failing tests:**
  - `useT follows the player's locale` (pl then en)
  - `useText picks the age text and localises moves` ({kids:'Hetman: Qxf7', adults:'Qxf7'} for adults/pl → 'Hxf7')
  - `missingKeys is empty for pl and en` (already exists; must stay green with the new keys)
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: messages for the screens; useT and useText`.

### Task 5: The store and the routes

**Files:**
- Create: `platform/src/app/store.ts`, `platform/src/app/routes.ts`, `platform/src/app/content.ts` (typed access to the compiled JSON per locale), `platform/tests/app/store.test.ts`, `platform/tests/app/routes.test.ts`

**Interfaces:**
- Consumes: Tasks 2 and 4; core `startLesson`, `sceneOfRun`, `buildRound`, `roundUnlocked`, `createLocalProfileStore`, `migratePocProgress`.
- Produces:
  - `createAppStore(deps: { storage: StorageLike; lessons: Record<Locale, Lesson[]>; library: Record<Locale, LibraryEntry[]>; pocStepIds: Record<string, string[]>; random?: () => number })`, returning a Zustand store with:
    - **state:** `{ players: ProfileSummary[]; player: Profile | null; run: LessonRun | null; round: Round | null; toast: string | null }`;
    - **actions:** `loadPlayers()`, `addPlayer(opts)`, `pickPlayer(id)`, `updatePlayer(patch)`, `removePlayer(id)`, `openLesson(id, stepId?)`, `openRound(seed, stepIndex?)`, `report(event: LessonEvent)`, `next()`, `back()`, `leave()`, `dismissToast()`.
  - Each action that changes progress saves through the store (`recordStep` on every step change, `finishLesson` on finishing). `openLesson` with an unknown id sets `toast = t(locale,'lessonNotHere')` and `run = null`.
  - On the first `loadPlayers()` with no players and a POC record under `chess-views:lessons`, the first `addPlayer` gets `migratePocProgress(that record, pocStepIds)`.
  - `parseRoute(hash: string): Route`, where `Route` is one of:
    - `{ kind: 'players' }`
    - `{ kind: 'home' }`
    - `{ kind: 'lesson'; id: string; stepId?: string }`
    - `{ kind: 'recognise'; seed: number; step: number }`
    - `{ kind: 'settings' }`
    - `{ kind: 'poc'; hash: string }` (an old-format link to forward)
    - `{ kind: 'notFound' }`
  - `routeHash(r: Route): string`.
  - Old POC hashes: `#lesson=<id>&step=<n>` becomes `{ kind: 'lesson', id, stepId: pocStepIds[id][n-1] }` when known. Everything else old-format (`fen=`, `pgn=`, `pos=`, `lesson=` unknown, `view=` alone) becomes `{ kind: 'poc', hash }`.

- [ ] **Step 1: Write failing tests:**
  - **Store:**
    - `add then pick a player persists it`
    - `openLesson resumes at the saved step`
    - `report + next records progress and never moves it back`
    - `finishing marks done`
    - `an unknown lesson id toasts lessonNotHere`
    - `openRound with nothing finished toasts lessonNotHere`
    - `POC progress is migrated into the first player once` (Review Focus 3)
  - **Routes:**
    - round-trips for every route kind
    - `#lesson=scholars-mate&step=7 → lesson s07…`
    - `#lesson=scholars-mate&step=99 → the last step id`
    - `#fen=…, #pgn=…, #pos=…, #lesson=nope&step=1 → poc with the same hash`
    - `garbage → notFound`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: store over the core, hash routes, old-link forwarding`.

### Task 6: The board component

**Files:**
- Create: `platform/src/app/board/Board.tsx`, `platform/src/app/board/pieces.ts` (the cburnett data URIs, extracted once from the POC's `pieces.css` by a small script `platform/scripts/extract-pieces.ts`), `platform/src/app/board/layers/{Territory,Roads,Kings,Blocks}.tsx`, `platform/tests/app/board.test.tsx`

**Interfaces:**
- Consumes: `ResolvedScene` (core), `Square`.
- Produces: `<Board scene={ResolvedScene} onSquare?: (sq: Square) => void flip?: boolean tapMarks?: { right?: Square; wrong?: Square } />`. It is an 8 × 8 SVG with `role="grid"` and each square a `role="gridcell"` button named by its square (`aria-label="f7"`).
  - **Pieces** are images when `scene.layers` has `pieces`.
  - **Blocks** use `analyse`'s shapes data (sizes) when it has `shapes`.
  - **The other layers** draw from `scene.data`:
    - territory: tinted squares by owner;
    - roads: lines along rays, rings on attacked pieces with the POC's thickness rule, × for pawn guards;
    - kings: the house squares outlined.
  - **Focus squares** get a ring.
  - **Layer changes** cross-fade, which is off under reduced motion.

- [ ] **Step 1: Write failing tests:**
  - `start position draws 32 piece images and 64 cells`
  - `a blocks scene draws blocks and no piece image`
  - `the territory layer tints f7 for White in the Scholar threat` (cell `data-owner`)
  - `the roads layer draws a ring on f7 with the attacker count` (`data-attackers="2"`)
  - `flip puts h1 at the top-left`
  - `tapping a cell calls onSquare with its square`
  - `keyboard: Enter on a focused cell calls onSquare`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: board with pieces, blocks, territory, roads and king houses`.

### Task 7: Players, home and settings screens

**Files:**
- Create: `platform/src/app/screens/Players.tsx`, `Home.tsx`, `Settings.tsx`, `platform/src/app/ui/{Button,Card,Avatar,Toast,TopBar}.tsx`, `platform/tests/app/screens.test.tsx`

**Interfaces:**
- Consumes: the store (Task 5), `useT` (Task 4), themes (Task 3).
- Produces:
  - **Screens:**
    - `Players`: avatars with name and age band, plus a "+" that opens the add form (name required, age band radio, language preset `pl`).
    - `Home`: groups Wzory / Strategia / Partie from `lesson.group.kind`, each lesson card showing progress (`finished` ✓ / `stepOf` / `start`), then the Recognise card (locked text until `roundUnlocked`).
    - `Settings`: name, avatar, age band, language, look (theme family), mode, export and import, remove with a confirm dialog.
  - **TopBar:** title, progress, ☰ menu (Home, Settings, About), and the 👤 switch.

- [ ] **Step 1: Write failing tests:**
  - `Players lists stored players and adds one` (with a fake store)
  - `picking a player goes home`
  - `Home groups lessons and shows progress` (a done lesson shows ✓, a started one shows `Krok 7 z 25`)
  - `Recognise card is locked until two game lessons are finished`
  - `Settings changes the age band and the theme follows`
  - `remove asks for confirmation`
  - `import of a bad file shows the error message`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: players, home and settings`.

### Task 8: The lesson screen (and Recognise on it)

**Files:**
- Create: `platform/src/app/screens/Lesson.tsx`, `platform/src/app/lesson/{StepCard,Question,ViewPicker,LegendPopup,Celebrate}.tsx`, `platform/src/app/views.ts`, `platform/tests/app/lesson.test.tsx`

**Interfaces:**
- Consumes: the store's `run`, `round`, `report`, `next`, `back`, and `sceneOfRun`; `Board` (Task 6).
- Produces:
  - `views.ts`: `VIEWS: { id: ViewId; layers: LayerKind[]; label: MessageKey; legend: MessageKey }[]` for board, territory, roads, kings, shapes (release 2 adds the rest), and `lessonViews(lesson): ViewId[]` (the views whose layer preset appears in the lesson's steps, in `VIEWS` order).
  - **The view picker:**
    - choosing a view reports `{ kind: 'layers', on: preset }`;
    - it is disabled while `run.gate?.kind === 'answer'` on a blocks step (`isBlocks`);
    - the step's own view is selected when the step opens.
  - **The legend popup** (React Aria `Dialog`) shows the selected view's legend text.
  - **The step card:**
    - `useText(step.explain)`;
    - for a question: choice buttons, tap hint, Yes/No for recall;
    - "Spróbuj jeszcze raz" after a wrong answer, and the right line with `Celebrate` after the right one;
    - for a solve step: ▶ reports `{ kind: 'ply', ply: run.ply + 1 }`;
    - Back and Next (`next`/`finish`).
  - **Recognise:** `#/recognise/<seed>/<n>` renders the same screen from `round`.
  - **Layout:** on ≥ 768 px wide the card sits beside the board.

- [ ] **Step 1: Write failing tests:**
  - `a step opens with its own view selected and the dropdown lists only the lesson's views`
  - `a wrong choice shows Spróbuj jeszcze raz and keeps Next disabled; the right one enables Next`
  - `a tap question takes the square from the board`
  - `recall step: blocks only, no move list, view dropdown disabled until answered` (Review Focus 1)
  - `the legend popup opens and closes, and on an open blocks question shows the blocks legend, not the pieces`
  - `▶ reveals a solve step and opens Next`
  - `reload on a step id reopens it with the question unanswered` (Review Focus 4)
  - `an unknown step id opens the first step; an unknown lesson goes home with a toast` (Review Focus 4)
  - `Recognise round: four choices of game: position, finishing toasts roundFinished`
  - `reduced motion: no celebration animation`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expected: pass.
- [ ] **Step 5:** Commit `App: lesson screen with view dropdown, questions, legend; Recognise`.

### Task 9: Publishing with the POC under `/poc/`

**Files:**
- Create: `.github/workflows/pages.yml`, `platform/scripts/assemble-site.ts` (copies `platform/dist/` to `site/` and the POC files to `site/poc/`: `index.html`, `*.js`, `pieces.css`, `positions.json`, `engine/`), `platform/src/app/forward.ts`
- Modify: `.github/workflows/platform.yml` (no change in checks), `platform/src/app/App.tsx` (a `poc` route replaces `location` with `./poc/` + the same hash)

**Interfaces:**
- Consumes: `parseRoute` (Task 5).
- Produces:
  - **The site layout:** `/` = new app; `/poc/` = the POC, unchanged and working, including its own engine path and lesson storage.
  - **The workflow:** on push to main, check, build, assemble, `actions/upload-pages-artifact`, `actions/deploy-pages`.
- Forwarding uses `location.replace` (no history entry). The POC never forwards back, so nothing loops.

- [ ] **Step 1: Write failing tests** (Vitest, Node):
  - `assemble-site copies the app to the root and the POC to poc/` (in a temp dir; `site/poc/index.html` and `site/poc/engine/stockfish-19-lite-single.wasm` exist, and the wasm hash is unchanged)
  - `forward builds ./poc/#fen=… from #fen=…`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the script, forwarding and the workflow.
- [ ] **Step 4:** Run `npm run check && npm run build && npx tsx scripts/assemble-site.ts`. Expected: `site/` assembled.
- [ ] **Step 5:** Commit `Publish: app at the root, POC under /poc/`. **Do not change the repository's Pages settings.** The user switches Pages source to "GitHub Actions" when this lands (state it in the final message).

### Task 10: End-to-end checks, README

**Files:**
- Create: `platform/playwright.config.ts` (serve `site/` with `npx serve` or `vite preview` over the assembled folder; projects `phone` 390 × 844 touch and `laptop` 1280 × 800), `platform/e2e/{players,lessons,recognise,links,themes}.spec.ts`
- Modify: `platform/README.md`, root `README.md` (where the new app and the POC live; piece-art attribution)

- [ ] **Step 1: Write the e2e specs:**
  - **players:** add Ola (8–12), pick her, home shows the groups.
  - **lessons:** walk every lesson by reading each step's question from the page (choice/tap/recall/solve) and answering it, to "Zakończ ✓"; progress shows ✓ on home; reload mid-lesson reopens the step.
  - **recognise:** after the lessons, a round of 8 boards, every one answered.
  - **links** (Review Focus 3):
    - `/#lesson=scholars-mate&step=7` → that step after picking a player;
    - `/#fen=…` → `/poc/#fen=…` showing the POC board;
    - `/poc/` works by itself.
  - **themes** (Review Focus 5): for each family × mode, button text contrast ≥ 4.5, board dark square luminance > 0.45, `scrollWidth == 390` on phone, and the card beside the board at 1280.
- [ ] **Step 2:** Run `npm run build && npx tsx scripts/assemble-site.ts && npx playwright test`. Expected: all pass on both projects.
- [ ] **Step 3:** Add `npm run e2e` to `pages.yml` before deploy.
- [ ] **Step 4:** Update the READMEs.
- [ ] **Step 5:** Run `npm run check`, `npm run e2e`, and the POC's `npm test` at the root. Expected: all pass.
- [ ] **Step 6:** Commit `App: end-to-end checks; README`.
