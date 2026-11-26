# Kredki (crayons) theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fourth look, Kredki: a crayon notebook (light "Zeszyt") and black construction paper (dark "Czarny karton"), default for 8–12, with crayon texture on everything except pieces and text.

**Architecture:** The look is split from the age in the profile (`ThemeFamily`). Colours are two new token sets in `tokens.css`. A separate `crayons.css`, active only under `[data-family="crayons"]`, adds the paper, the crayon grain (a background-image layered over the element's own solid background-color), wobbly outlines (a `::before` with an SVG displacement filter) and the handwriting face; `CrayonDefs` mounts the SVG filters once. Pieces, square names and text are never filtered.

**Tech Stack:** React 19, Tailwind 4 (tokens via `@theme inline`), zod, Vitest + jsdom, Playwright; new dependency `@fontsource/patrick-hand@5.3.0` (OFL-1.1).

**Spec:** `docs/superpowers/specs/2026-11-26-crayons-theme-design.md` (mockup: `docs/superpowers/specs/2026-11-26-crayons-mock.html?n=1`).

## Global Constraints

- Text on surface/card/accent buttons ≥ 4.5:1; focus ring ≥ 3:1 on surface and card; board dark squares relative luminance > 0.45; board stays light in both modes.
- Board marks keep meaning and the shared `--board-road-*` etc. colours; White vs Black territory ≥ 1.4:1 (existing test).
- Every element keeps its solid `background-color`; texture only as `background-image` / pseudo-element overlay.
- Pieces (`img` and letters), square names, reach/dist numbers and all text: no `filter`.
- No runtime external requests; font bundled (latin + latin-ext).
- No change to the Kolorowy / Spokojny / Prosty looks, nor to engine-arrow layering (overlay svg stays `z-30`).
- Texture level 1 (from the mockup): grain turbulence baseFrequency `0.5 0.08`, alpha `-1.1·n + 1.75`; outline displacement scale ≈ 5 (px); roads stroke alpha `-0.8·n + 1.5`.
- Commit identity `Damian Ospara <1453374+damian0o@users.noreply.github.com>`, trailers as in the repo's recent commits. Work on branch `crayons`.

## Review Focus

1. An existing saved profile with `theme.family: 'kids'` must still open in Kolorowy after the update (no silent switch) — Task 1 test.
2. A profile file with an unknown look (`'foo'`) is repaired to the age's default look (8–12 → crayons) — Task 1 test.
3. Letters piece style and square names on the crayon board stay unfiltered and readable — Task 4 e2e.
4. Printing (`#/print`) must not carry paper lines or grain — Task 3 e2e with print media.
5. System mode switching light↔dark live under Kredki swaps Zeszyt↔Czarny karton — Task 2 test.

---

### Task 1: Look separated from age; Kredki selectable and default for 8–12

**Files:**
- Modify: `platform/src/core/types.ts` (add `THEME_FAMILIES`, `ThemeFamilySchema`, `ThemeFamily`; `theme.family` uses it)
- Modify: `platform/src/core/storage/local.ts` (`lookForAge`, `defaultProfile`)
- Modify: `platform/src/core/storage/migrate.ts:37` (fallback `lookForAge(age)`)
- Modify: `platform/src/app/screens/Settings.tsx:45-51` (age sets `lookForAge(age)`; look options add Kredki first)
- Modify: `platform/src/app/theme/ThemeRoot.tsx` (no profile → `'crayons'`)
- Modify: `platform/src/core/i18n/messages/pl.ts`, `en.ts` (`lookCrayons`: "Kredki" / "Crayons")
- Test: `platform/tests/storage.test.ts`, `platform/tests/app/theme.test.tsx`, `platform/tests/app/screens.test.tsx`

**Interfaces:**
- Produces: `THEME_FAMILIES = ['kids','teens','adults','crayons'] as const`; `type ThemeFamily`; `lookForAge(age: AgeBand): ThemeFamily` (kids→crayons, teens→teens, adults→adults) exported from `@core/storage/index`.

- [ ] **Step 1: Write the failing tests**
  - storage: `defaultProfile({age:'kids'}).theme.family === 'crayons'`; teens → 'teens'; adults → 'adults'.
  - storage: `repair({...valid, theme:{family:'kids',mode:'dark'}})!.theme.family === 'kids'` (Review Focus 1).
  - storage: `repair({...valid, age:'kids', theme:{family:'foo',mode:'light'}})!.theme.family === 'crayons'` (Review Focus 2).
  - storage: `ProfileSchema.safeParse({...valid, theme:{family:'crayons',mode:'system'}}).success === true`.
  - theme.test: rename "no profile gives kids…" → expects `['crayons','dark']`.
  - screens.test: in Settings, the look radio group lists `['Kredki','Kolorowy','Spokojny','Prosty']`; choosing age "8–12" from teens checks "Kredki".
- [ ] **Step 2: Run** `npx vitest run tests/storage.test.ts tests/app/theme.test.tsx tests/app/screens.test.tsx` — Expected: the new assertions FAIL.
- [ ] **Step 3: Implement** the interfaces above; Settings look option `{ value: 'crayons', label: t('lookCrayons') }` first.
- [ ] **Step 4: Run** the same command — Expected: PASS; then `npm run check` — Expected: all pass (fix any test that assumed kids-by-default look).
- [ ] **Step 5: Commit** "Kredki look: separate from age, default for 8–12".

### Task 2: Zeszyt and Czarny karton colour sets

**Files:**
- Modify: `platform/src/app/theme/tokens.css` (family block + two mode blocks for `crayons`)
- Test: `platform/tests/app/minors1.test.tsx` (sets count 6 → 8), new `platform/tests/app/crayons.test.tsx`

**Interfaces:**
- Produces CSS vars per mode, same names as other sets, plus `--paper-lines`, `--paper-margin`, `--title`, `--chip`, `--edge` (outline colour) used by Task 3.
- Family block: `--radius-control: 1.25rem; --radius-card: 1.5rem; --text-step: 1.25rem; --shadow-card: none` (outlines replace shadows).

Start values (spec; adjust only to pass the tests):
- light: surface #fffefa, card #ffffff, ink #23305c, ink-soft #5a6a9a, title #e0306b, accent #f23c7a / accent-ink #ffffff, accent-2 #ffe066 / accent-2-ink #23305c, fun-1..4 #f23c7a #ffe066 #7bd389 #8ccaf5, chip #7bd389, edge #23305c, good #15803d, bad #dc2626, board-light #fff7cf, board-dark #8ccaf5, board-ink #23305c, focus #c2410c, paper-lines #dceaf8, paper-margin #f6c9c9.
- dark: surface #1f1d2b, card #2c2940, ink #fbf7ff, ink-soft #cfc7ea, title #ffe14d, accent #3ee08f / accent-ink #10261a, accent-2 #ff8fc7 / accent-2-ink #1f1d2b, fun-1..4 #ff8fc7 #ffe14d #3ee08f #5ccfff, chip #5ccfff, edge #fbf7ff, good #4ade80 / good-ink #052e16, bad #fca5a5 / bad-ink #450a0a, board-light #fff4d6, board-dark #c3a6f7, board-ink #1e1b4b, focus #ffe14d, paper-lines transparent, paper-margin transparent.

- [ ] **Step 1: Write the failing tests** in `crayons.test.tsx`, reading `tokens.css` like minors1 does: for `crayons/light` and `crayons/dark`: contrast(ink,surface), (ink,card), (accent-ink,accent), (accent-2-ink,accent-2), (good-ink,good), (bad-ink,bad) ≥ 4.5; (title,surface) ≥ 3; luminance(board-dark) > 0.45; contrast(board-ink, board-dark) ≥ 4.5. In minors1 change `toHaveLength(6)` → 8. Review Focus 5: ThemeRoot with `{family:'crayons',mode:'system'}` and a matchMedia flip sets `data-mode` light→dark while `data-family` stays `crayons`.
- [ ] **Step 2: Run** `npx vitest run tests/app/crayons.test.tsx tests/app/minors1.test.tsx` — Expected: FAIL (sets missing).
- [ ] **Step 3: Implement** the three CSS blocks.
- [ ] **Step 4: Run** the same — Expected: PASS (existing focus / territory / review mark-contrast tests now also cover crayons); `npm run check` green.
- [ ] **Step 5: Commit** "Kredki colours: Zeszyt and Czarny karton".

### Task 3: The crayon layer (paper, grain, outlines, handwriting)

**Files:**
- Create: `platform/src/app/theme/crayons.css` (imported from `styles.css` after tokens)
- Create: `platform/src/app/theme/CrayonDefs.tsx` (hidden `<svg width=0 height=0 aria-hidden>` with filters `cv-rough`, `cv-stroke`)
- Create: `platform/src/app/theme/grain.ts` — `export const GRAIN: string` (an SVG data-URI of fractal-noise streaks at the level-1 values, white streaks on transparent, used as `--crayon-grain`)
- Modify: `platform/src/app/theme/ThemeRoot.tsx` (render `<CrayonDefs/>` when family is `crayons`; set `--crayon-grain` on `<html>`)
- Modify: `platform/package.json` (`@fontsource/patrick-hand` 5.3.0)
- Test: `platform/tests/app/crayons.test.tsx`, `platform/e2e/themes.spec.ts`

**Interfaces:**
- Consumes: Task 2 vars. Produces: filter ids `#cv-rough`, `#cv-stroke` (used by Task 4); utility class `cv-hand` (handwriting face).

CSS rules, all under `[data-family="crayons"]`:
- `html`/`body`: background-color `var(--surface)` + lines `repeating-linear-gradient(transparent 0 27px, var(--paper-lines) 27px 28px)` + margin line at 30px in `var(--paper-margin)`.
- Grain: `background-image: var(--crayon-grain)` on `.bg-accent, .bg-accent-2, .bg-fun-1…4, .bg-good, .bg-bad, .bg-board-light, .bg-board-dark` and chips (`[aria-pressed]`); background-color untouched.
- Outlines: buttons (`button`, `[role=radio]` labels used by Choice), cards (`.rounded-card`), the board frame get `position:relative` + `::before { inset:-2px; border:3px solid var(--edge); border-radius:inherit; filter:url(#cv-rough); pointer-events:none }`; quiet buttons drop their `ring-*` box-shadow.
- Handwriting: `h1, h2, .cv-hand { font-family: "Patrick Hand", var(--font-ui) }`; `h1,h2 { color: var(--title) }`.
- `@media print`: under crayons, `background-image: none !important` everywhere and `::before { display:none }` (Review Focus 4).

- [ ] **Step 1: Write the failing tests**
  - unit: ThemeRoot with a crayons profile renders `#cv-rough` and `#cv-stroke` filters; with a kids profile renders neither; `--crayon-grain` set only for crayons.
  - e2e `themes.spec.ts`: add `'Kredki'` to the looks loop (runs contrast, a1 luminance, overflow checks in Jasny/Ciemny).
  - e2e: under Kredki on `#/lesson/scholars-mate/s02-houses`: `getComputedStyle(img).filter === 'none'` for a piece image and for `[data-square-name]`; `[data-square="a1"]` has a `background-image` containing `data:image/svg+xml`.
  - e2e (print, Review Focus 4): `page.emulateMedia({media:'print'})` on `#/print` (or the print route used today) → square a1 `background-image === 'none'`.
- [ ] **Step 2: Run** `npx vitest run tests/app/crayons.test.tsx` — Expected: FAIL. Then build + assemble + `npx playwright test e2e/themes.spec.ts` — Expected: Kredki cases FAIL.
- [ ] **Step 3: Implement** files above; `npm i @fontsource/patrick-hand@5.3.0`, import `latin.css` and `latin-ext.css` (400) in `crayons.css`.
- [ ] **Step 4: Run** the same commands — Expected: PASS; full `npm run check` green.
- [ ] **Step 5: Look at it:** phone-size screenshots of home, a room, a lesson step with roads, free board, Settings in both modes; compare with the mockup at `?n=1`. If noise is heavier than the mockup, reduce grain alpha before committing.
- [ ] **Step 6: Commit** "Kredki layer: paper, crayon grain, wobbly outlines, handwriting".

### Task 4: Crayon marks on the board

**Files:**
- Modify: `platform/src/app/board/Board.tsx:130` (roads `<svg>` gets `data-layer="roads"`), `platform/src/app/board/layers/Kings.tsx`, `Blocks.tsx` (their svg/group gets `data-layer`)
- Modify: `platform/src/app/theme/crayons.css` (`[data-family="crayons"] [data-layer] { filter: url(#cv-stroke) }`; board focus/house outlines unchanged)
- Test: `platform/tests/app/board.test.tsx`, `platform/e2e/themes.spec.ts`

**Interfaces:** Consumes `#cv-stroke` (Task 3).

- [ ] **Step 1: Write the failing tests**
  - unit: a scene with roads renders an element `[data-layer="roads"]` containing the road lines; the overlay svg (engine arrows) has no `data-layer`.
  - e2e (Review Focus 3): Kredki, Settings piece style letters, lesson step with roads: the letters `span` and `[data-square-name]` have `filter: none`; `[data-layer="roads"]` computed filter contains `cv-stroke`; pieces paint above roads (elementFromPoint at the c4 square centre on `#/lesson/eyes-on-f7/s03-roads` returns the piece img).
- [ ] **Step 2: Run** `npx vitest run tests/app/board.test.tsx` and the e2e — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS; `npm run check` green; full e2e green.
- [ ] **Step 5: Performance check:** Playwright phone project with CPU throttling 4× (`CDP Emulation.setCPUThrottlingRate`): step Dalej through 5 steps of eyes-on-f7; each step's board must paint within 500 ms (measure `performance.now()` from click to the step counter change + one `requestAnimationFrame`). If slower, drop the `cv-stroke` filter on the board (keep grain) and re-measure.
- [ ] **Step 6: Commit** "Kredki: roads and board marks drawn in crayon".
