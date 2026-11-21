# Shapes View Implementation Plan

**Goal:** a Shapes tab that shows pieces as sized or equal squares, optional group boxes, and a Reveal toggle.

**Spec:** docs/superpowers/specs/2026-11-20-position-viewer-design.md, addendum 2026-11-21.

## Task 1: analysis helpers
- Test: `tests/shapes.test.js` — `shapeSize('p')==='small'`, `shapeSize('n'|'b'|'r')==='mid'`, `shapeSize('k'|'q')==='big'`; `pieceGroups(startBoard)` has 2 groups (one per side, 16 squares each); `pieceGroups` of `kb4Q1/1p6/1P6/8/1N6/1K6/8/8` has 1 black group {a8,b8,b7} and 3 white groups {b6}, {b4,b3}, {g8}, each with `box {r0,r1,c0,c1}`.
- Implement `shapeSize(type)` and `pieceGroups(board)` in analysis.js (flood fill, 8 neighbours, sorted by colour then first square).

## Task 2: view
- Add `shapes` to VIEWS: level buttons (Sizes / Same size / Groups), Reveal button, board of `.shape` squares, SVG overlay `.groupwrap > svg` with `rect.group g0..g5`, summary sentence, legend.
- State: `shapesLevel: 'sizes'`, `shapesReveal: false`.
- CSS for `.shape.w/.b`, `.small/.mid/.big`, `.groupwrap`.
- README + Playwright check (shape counts per level, 4 rects on the study position, reveal shows `.piece`).
