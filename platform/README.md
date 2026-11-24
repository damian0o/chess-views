# Chess Views platform

The successor of the proof of concept at the repository root. Phase 1 is the **core**: a typed,
UI-free TypeScript library with every rule of the app, the lesson content as Markdown, and checks
in CI. There are no screens yet; the proof of concept stays live until the platform matches it.
Design: `../docs/superpowers/specs/2026-11-24-platform-design.md`.

## Layout

```
src/core/          the rules; no DOM, no React (lint enforces it)
  types.ts         every data type as a Zod schema (the single source for lists like layer kinds)
  chess/           the only door to chess.js; Polish move letters for display
  analysis/        territory, reach, roads, king houses, shapes, diamond, knight, pins, safety
  scene.ts         a step's scene made concrete (position, moves, layer data)
  lessons/         lesson runs (immutable), gates, layers that unlock
  recognition.ts   Recognise rounds from finished lessons
  engine/          EngineService, the Stockfish WASM adapter, cache, coach (grades, words)
  storage/         versioned profiles in the browser, export/import, migration from the POC
  i18n/            messages (pl default, en fallback), CLDR plurals
  audience.ts      text by age band
src/content/       the Markdown compiler (build time only)
content/           lessons and library: content/<locale>/<patterns|strategy|games>/…
scripts/           compile-content.ts, convert-poc.ts (one-off)
tests/             Vitest; tests address steps by id, never by number
```

**The dependency rule:** `core` imports nothing from `content`, `scripts` or any UI; `content`
imports only `core`. ESLint fails the build otherwise.

## Commands

```
npm install
npm run check      # typecheck, lint, all tests
npm run content    # compile content/ into dist/content/<locale>/{lessons,library}.json
```

CI (`.github/workflows/platform.yml`) runs both on every push that touches `platform/`.

## Lesson format

One file per lesson per language. Positions, step ids and right answers must be the same in
every language (the compiler checks it); only the words differ.

```markdown
---
id: scholars-mate
group: { kind: pattern, id: f7-attack }
title: Mat szkolny
about: Zrób mata w czterech ruchach, naucz się go zatrzymać.
game: Mat szkolny                     # the name used in Recognise answers
experience: basic
pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#"   # optional: steps may then give only a ply
moments:
  attack: { name: atak na f7, ply: 5 }
  mate:   { name: mat, ply: 7 }
---
<!-- draft: review -->

## look {scene: board+kings, ply: 5, focus: f7, moment: attack}

::: kids
Pole f7 to najsłabsze pole w domu czarnych: broni go tylko król.
:::

::: adults
f7: broni go tylko król.
:::

? Które pole atakują obie bierki?
- e5
- [x] f7
- f2
! Tak: f7, tuż obok króla.

## spot-it {moment: attack}

::: kids
Same bloki. To ten moment?
:::

? Czy to atak na f7? {recall: attack, answer: yes}
```

- **A step's position** is one of:
  - `fen:`
  - `pgn:` with `ply:`
  - `pos:`, a library id, with an optional `ply:`
  - `same: true`, the previous step's position, with an optional `ply:`
  - `ply:` alone, which uses the lesson's `pgn`
  - a recall question with `answer: yes`, which uses its moment's board
- **`scene:`** is `board`, `blocks` (no pieces, moves hidden) or `diamond`, with `+layer` to add layers: `board+roads`, `blocks+roads`.
- **Other step attributes:**
  - `focus:` one square or a list;
  - `moment:`;
  - `solve: "task"` for a hidden move to find;
  - `locked:` layers hidden while the question is open;
  - `flip: true`;
  - `ages:` the age bands the step is for.
- **Explanations** go in `::: kids` (required), `::: teens` and `::: adults`. A missing age falls back to the next younger.
- **Questions:**
  - `? prompt` followed by `- [x]` / `- ` choices (2–4);
  - `? prompt {tap: f7}`;
  - `? prompt {recall: <moment>, answer: yes|no}`.
  - `!` gives the line shown after the right answer. `?teens` / `!adults` give other ages.
- **Moves in the text** stay in standard notation (Qxf7); the app shows them with the language's letters (Hxf7 in Polish) through `localizeMoves` in `src/core/chess/san.ts`.
- `content/poc-step-ids.json` is **frozen**: it maps the proof of concept's step numbers to step ids for migrating saved progress. Never regenerate it after steps change.

## Adding a language

1. Add it to `LOCALES` in `src/core/types.ts`.
2. Add `src/core/i18n/messages/<locale>.ts`. A test lists missing keys; they fall back to English.
3. Copy `content/en/` to `content/<locale>/` and translate the words only. `npm run content` reports anything that drifted.

## Status

The Polish lesson files are drafts marked `<!-- draft: review -->` and wait for review by a
native speaker before the platform replaces the proof of concept.
