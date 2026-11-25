# Chess Views platform, phase 2: the new UI

Date: 2026-11-24. Status: draft for approval. Builds on
`2026-11-24-platform-design.md` (phase 1, the core, merged) — everything
there still holds unless this document changes it.

## Intent

Phase 1 built a UI-free core: chess rules, analysis layers, lesson runs,
Recognise rounds, the engine service, profiles and languages, plus the
lessons as checked Markdown. Phase 2 builds the screens on top of it and
ends with the platform replacing the proof of concept (POC) on GitHub
Pages.

The user chose to go **straight to the new step-led layout** rather than
rebuild the POC's tab layout first: the board stays put and the step
decides what is on it; the POC stays reachable under `/poc/`.

## Goals

1. A React app in `platform/` that renders only what the core returns
   (`sceneOfRun`, `LessonRun`, `analyse`, `buildRound`, `EngineService`,
   `ProfileStore`, `t`, `localizeMoves`, `textFor`). No chess, lesson or
   engine rule in a component.
2. **Players:** a "Kto gra?" screen lists the profiles on the device; pick
   one or add one (name, avatar colour, age band, language — Polish
   preselected). Switch from the top bar. No parent step for now.
3. **The lesson screen** (sketch below): one board that never moves; a
   **view dropdown**; a step card with the age's text, the question, and
   Back/Next.
4. **Free board:** the same screen with the move strip and replay controls
   instead of the step card; load FEN, PGN or a lichess game link; flip;
   letters-for-paper; the view dropdown lists **all nine views** (decided
   with the user). Only lessons limit the list, to the views the lesson
   uses; unlocked layers still govern what a child may toggle inside a
   lesson step.
5. **The legend in a popup** (ⓘ next to the view dropdown) so the board
   and the move strip keep the space during replay.
6. **Home:** lessons grouped by kind (Wzory / Strategia / Partie) with
   progress, Recognise (locked/unlocked as the core says), the library
   (search, tags, print sheet), and "Wolna szachownica".
7. **Engine:** the evaluation bar and best-move arrows as the Engine view;
   the guess-the-move exercise and grades in free board; words for kids
   and teens, numbers for adults (`evalWords`).
8. **Age themes:** kids 8–12, teens 12–16, adults; each light and dark
   (six token sets). The kids theme is **very colourful and playful**, in
   the spirit of ChessKid: bright saturated colours, big rounded buttons,
   soft shadows, a cheerful "Dobrze!" moment (bounce, confetti), stars or
   ticks on finished lessons. Our own palette and look — no ChessKid
   characters, art or branding.
9. **Parity with the POC** (the goal of this phase; until it is reached
   the POC under `/poc/` covers what is missing): all nine views,
   loading FEN/PGN/lichess, the move list with player names, flip,
   letters-for-paper, the library with search and tags, the print sheet,
   share links, lessons with questions and moments, Recognise, the Engine
   view and the evaluation, problems with hidden moves.
10. **Old links keep working:** `#fen=`, `#pgn=`, `#pos=`, `#lesson=` …
    open the same thing in the new app. The POC's saved lesson progress is
    not carried over (decided 2026-11-25): every new player starts at zero.
11. **Publishing:** Pages is served from the GitHub Actions build: the
    platform at the root from its first release, the POC under `/poc/`
    (see "Settled after the builder check").

## Non-goals

- Parent controls, PINs, cloud accounts or sync (export/import per player
  exists; a remote store is a later phase).
- New lessons or content changes beyond what the screens need.
- Playing full games against the engine.
- Experience levels beyond `basic`.

## Anti-goals

- Rules in components (the POC's main failure).
- Anything that gives a blocks question's answer away: while it is open
  the view dropdown is disabled, no pieces, no move list (`sceneOfRun`
  already guarantees the scene; the UI must not add its own way around).
- A board and its answers that cannot be seen together on a tablet or
  laptop.
- Copying another product's characters, art, logo or branding.
- Tracking, analytics, or sending the child's data anywhere.

## Constraints

- Static site on GitHub Pages; hash routes (`#/…`) so refresh and share
  links work without a server.
- Phone first (390 × 844, touch), then tablet and laptop.
- Polish default, English second; every visible string from the message
  catalogues or the compiled content; moves in text through
  `localizeMoves`.
- The vendored Stockfish files stay byte-identical (pinned hashes) and
  are served from the app.
- Accessibility: keyboard and screen-reader use for every control (React
  Aria), visible focus, reduced motion respected (confetti off).

## Approaches considered

Both are a Vite + React 19 single-page app with hash routes and our own
SVG board.

- **A. Tailwind + React Aria components + a small Zustand store
  (chosen).** Themes are CSS variables read by Tailwind; React Aria gives
  accessible dropdowns, dialogs and buttons styled with our tokens; one
  store holds the current player and the core's lesson run; Motion for
  the small celebrations. Class-heavy markup, but cheap themes and very
  reliable AI-assisted work.
- **B. CSS Modules + Radix + React context.** Fewer conventions, more
  hand-written CSS for three playful themes; context needs care to avoid
  re-rendering the board.
- **Next.js static export** was dropped: server machinery a static Pages
  app does not need.

## Decisions made with the user

- Go straight to the new layout; publish it at the root from the first
  release and move the POC to `/poc/`.
- A **dropdown for views**; in a lesson it lists **only the views that
  lesson uses**.
- The legend lives in a **popup** during replay.
- The kids theme is **very colourful**, like ChessKid (in spirit).
- **Multiple accounts** on one device; for now a simple sign-in that lists
  the profiles.
- Tailwind (approach A).
- The free board shows all nine views; only lessons limit the list.

## Design

### Screens and routes

```
#/                      Kto gra? (players)            → #/home after picking
#/home                  lessons by kind, Recognise, library, free board
#/lesson/<id>/<stepId>  the lesson screen
#/recognise/<seed>/<n>  a Recognise round (same screen, round steps)
#/board?fen=…|pgn=…&ply=…&view=…&flip=1   free board
#/library               search, tags, print sheet
#/settings              player: name, colour, age band, language, theme mode,
                        piece style, export/import, remove
```

Old POC hashes (`#fen=…`, `#pgn=…`, `#pos=…`, `#lesson=…&step=n`) are
rewritten on load to these routes (`step=n` through `poc-step-ids.json`).

### The lesson screen (phone)

```
┌──────────────────────────────┐
│ ♟ Mat szkolny   3/25   ☰  👤 │  top bar
├──────────────────────────────┤
│        [ szachownica ]       │  one board; layers fade in/out
├──────────────────────────────┤
│ Widok: [ Drogi ▾ ]      ⓘ    │  dropdown (lesson's views) + legend popup
├──────────────────────────────┤
│ Dwie bierki atakują f7…      │  step card: textFor(age), question,
│ Które pole? [e5][f7][f2]     │  "Spróbuj jeszcze raz" / right line
│ ◀ Wstecz          Dalej ▶    │
└──────────────────────────────┘
```

On a tablet or laptop the step card sits beside the board.

- Each step opens with its own view selected; the dropdown reports a
  `layers` event to the run; the run decides what is allowed.
- A tap question takes taps on the board (the board reports the square
  to the run); the view's own square interactions are off while it is
  open.
- A `solve` step shows ▶ for the hidden move; the run's `reveal` gate
  shows on Next.
- Finishing a lesson saves `done` and the unlocked layers to the player
  (`recordSeen`, profile store); Next on the last step says
  "Zakończ ✓".

### Views as layers

The board component draws a `ResolvedScene`: pieces (or blocks), then
each layer's data from `analyse` (territory tints, roads and rings, king
houses, reach numbers, knight distances, diamond base, engine bar and
arrows). A **view** in the dropdown is a named layer preset (the POC's
nine views); the step's own scene is selected on entry.

### Themes

Design tokens (colour, radius, shadow, spacing, type scale, motion) as CSS
variables; Tailwind reads them. Six token sets: `kids`, `teens`, `adults`
× light, dark. Board colours are tokens too and stay light enough for
black pieces in every dark set. Theme family follows the player's age
band unless the player picks another.

### State

One Zustand store: the current player (`Profile`), the current
`LessonRun` or free-board game, the engine service (created lazily, one
per app; recreated after it reports dead), and the compiled content (the
per-locale JSON from phase 1's compiler, bundled at build time). Every
store action calls the core and saves the profile through the
`ProfileStore`.

### Content at build time

`npm run content` runs before `vite build`; the app imports
`dist/content/<locale>/lessons.json` and `library.json`. A content error
fails the build (as in phase 1).

### Testing

- Vitest + Testing Library for components (each reads a fixture core
  state and renders it; no chess logic tested here).
- Storybook: every component in every theme (kids/teens/adults ×
  light/dark).
- Playwright (TypeScript) at 390 × 844 with touch, and at 1280 × 800:
  pick a player, walk each lesson by step ids answering questions,
  Recognise, free board load (FEN, PGN, a mocked lichess response), the
  legend popup, old POC links, the engine view with the vendored worker,
  dark mode contrast, no horizontal overflow.

### Build and deploy

GitHub Actions: `npm run check`, `npm run content`, `vite build`,
Playwright against the built site, then deploy to Pages with the platform
at the root and the POC copied to `/poc/`.

### Settled after the builder check (my calls)

- **Links before a player is picked:** "Kto gra?" comes first, then the
  app continues to the link's target with the chosen player. A link that
  names a view is honoured in the free board, where every view is open.
- **Polish review is not a blocker for publishing.** The user reviewed
  the open questions and said the Polish is fine and will be reviewed
  during testing. New interface strings (players, home, library,
  settings, legends, engine) are drafted in Polish and English and listed
  for that review; the `<!-- draft: review -->` markers stay until then.
- **Publishing (decided with the user):** the new app is published at the
  root from its first release, and the POC moves to `/poc/` at the same
  moment (there is no `/next/` preview). Until the new app reaches parity,
  an old-format link it cannot handle yet (`#fen=`, `#pgn=`, `#pos=`,
  `#lesson=…`) is sent to the same hash under `/poc/`, so no shared link
  breaks. The GitHub Actions build publishes both: the platform at the
  root and the POC files under `/poc/`. This needs one change by the repo
  owner: Pages source → "GitHub Actions" in the repository settings.
- **The core may grow in phase 2** where the screens need rules that do
  not exist yet (free-board game state and the guess-the-move exercise,
  the avatar colour and theme family in the profile). They go in
  `src/core` with tests, never in components; the profile schema gets a
  version 2 with a migration from version 1.

## Left to the builder

- Component breakdown, file layout under `platform/src/app/`, and exact
  token values (within "very colourful for kids").
- The board's SVG structure and animation details.
- Motion library choice (Motion or CSS-only), within reduced-motion
  respect.
- Avatar colours offered when adding a player.
