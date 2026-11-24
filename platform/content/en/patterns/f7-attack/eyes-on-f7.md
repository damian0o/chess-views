---
id: eyes-on-f7
group:
  kind: pattern
  id: f7-attack
title: Eyes on f7
about: "Ten openings: which two pieces aim at the square next to the king?"
experience: basic
---

## s01-board {scene: "board", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5", ply: 5}

::: kids
Ten boards from the first moves. Each time ask: which blocks aim at the square next to the king, f7 or f2? Two pieces there is the danger sign.
:::

## s02-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5", ply: 5}

::: kids
Board 1 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- [x] f7
- f2
- Neither

## s03-roads {scene: "board+roads", same: true}

::: kids
Queen h5 and bishop c4: two roads crossing on f7. Only the king guards it, so Qxf7 would be mate.
:::

## s04-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Nf3", ply: 5}

::: kids
Board 2 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- f7
- f2
- [x] Neither

## s05-territory {scene: "board+territory", same: true, focus: "f7"}

::: kids
Only the bishop points at f7 and the king guards it: one against one, nothing yet.
:::

## s06-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qf3", ply: 5}

::: kids
Board 3 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- [x] f7
- f2
- Neither

## s07-roads {scene: "board+roads", same: true}

::: kids
Queen f3 and bishop c4. The queen's road comes from the other side, the target is the same: Qxf7 would be mate.
:::

## s08-blocks {scene: "blocks", pgn: "1. e4 e5 2. Qh5 Nc6", ply: 4}

::: kids
Board 4 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- f7
- f2
- [x] Neither

## s09-territory {scene: "board+territory", same: true, focus: "f7"}

::: kids
The queen alone looks at f7: if it takes, the king takes back. One attacker is never enough.
:::

## s10-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. c3 Nf6 4. Qb3", ply: 7}

::: kids
Board 5 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- [x] f7
- f2
- Neither

## s11-roads {scene: "board+roads", same: true}

::: kids
Queen b3 behind bishop c4 on one road: two attackers lined up. If the bishop takes on f7, the queen follows.
:::

## s12-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qe2", ply: 5}

::: kids
Board 6 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- f7
- f2
- [x] Neither

## s13-roads {scene: "board+roads", same: true}

::: kids
Two pieces out, but the queen on e2 looks along the e-file, not at f7. Only the bishop aims there: nothing yet.
:::

## s14-blocks {scene: "blocks", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5", ply: 7}

::: kids
Board 7 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- [x] f7
- f2
- Neither

## s15-roads {scene: "board+roads", same: true}

::: kids
Knight g5 and bishop c4 both reach f7. No mate here, but Nxf7 would fork the queen and the rook.
:::

## s16-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Qe7", ply: 6}

::: kids
Board 8 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- [x] f7
- f2
- Neither

## s17-territory {scene: "board+territory", same: true, focus: "f7"}

::: kids
The full shape, but Qe7 guards f7: two against two. Taking on f7 now loses the queen. Count the defenders first.
:::

## s18-blocks {scene: "blocks", pgn: "1. e4 e5 2. Nf3 Bc5 3. Nxe5 Qh4", ply: 6}

::: kids
Board 9 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- f7
- [x] f2
- Neither

## s19-roads {scene: "board+roads", same: true}

::: kids
Black's turn to aim: queen h4 and bishop c5 point at f2, and Qxf2 would be mate. Guard f2 or chase the queen.
:::

## s20-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Bc5 3. Nc3 Qf6", ply: 6}

::: kids
Board 10 of 10. Blocks only: look at the square next to each king.
:::

? Where do two pieces aim?
- f7
- [x] f2
- Neither

## s21-roads {scene: "board+roads", same: true}

::: kids
Queen f6 down the open f-file and bishop c5: both on f2, and Qxf2 would be mate. White must guard it now.
:::
