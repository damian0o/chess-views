# Folding look picker, moves above it — design

**Why.** The user: the view configuration takes too much of the screen; it should fold, or the moves should
come before it. On a phone the five picker rows (~300 px) push the move list out of sight, and lessons often say
"press ▶" and talk about the moves.

**What (user approved "Yes that it", 2026-11-28): both.**

1. **The picker folds.** Folded, it is one line: a button `Widok: Bierki · Drogi · Domki króla ▾` (the label
   of every option that is on, in picker order) plus the ⓘ legend button. Tapping it opens the rows (`▴`);
   tapping again folds them. The button has `aria-expanded` and controls the rows.
   - Starts folded on a phone (the existing `useIsPhone`), open on a laptop.
   - Not saved anywhere (no new browser saving); it stays as set while the screen stays open.
   - While a blocks question freezes the picker, it can still be opened; the rows show disabled as today.
2. **Moves above the picker.**
   - Lesson, phone sheet: move list, then picker (was picker, then moves).
   - Lesson, laptop: board, ◀ ▶, move list, then picker.
   - Free board: status line and move list, then picker (the right column).

**Approaches considered.** Fold only (moves still hidden while open); move only (picker still 300 px);
both (chosen — the folded line keeps what's on visible, and the moves are never under the picker).

**Non-goals.** No change to what the options do; no remembering the fold across reloads.

**Left to the builder.** Exact styling of the summary line (Kredki look, a chevron).
