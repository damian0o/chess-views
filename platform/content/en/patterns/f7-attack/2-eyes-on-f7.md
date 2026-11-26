---
id: eyes-on-f7
group:
  kind: pattern
  id: f7-attack
title: Eyes on f7
about: "Scholar's mate is not the only one: five other blows on f7 and f2, and how to stop them."
experience: basic
---

## s01-board {scene: "board", pgn: "1. e4 e5 2. Bc4 Nc6 3. c3 Nf6 4. Qb3", ply: 7}

::: kids
You already know scholar's mate. But there are other ways to hit f7. You will see five ideas: a battery, a knight, a sacrifice, a trap and Black's blow on f2.
:::

## s02-blocks {scene: "blocks", same: true}

::: kids
Idea 1 of 5. Blocks only: the queen is not next to the bishop, it is behind it.
:::

? Which square do two pieces aim at? Tap it. {tap: f7}
! Yes: f7, next to the black king.

## s03-roads {scene: "board+roads", same: true}

::: kids
Queen b3 stands behind bishop c4 on one road (the dashed line). That is a battery: two pieces one behind the other. The bishop takes on f7 with check and nobody can take it. The king cannot, because the queen on b3 guards f7 from behind the bishop.
:::

## s04-blocks {scene: "blocks", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5", ply: 7}

::: kids
Idea 2 of 5. Blocks only: this time the queen stays at home.
:::

? Which two pieces aim at f7?
- [x] Knight and bishop
- Queen and bishop
- Rook and bishop
! Yes: knight g5 and bishop c4.

## s05-territory {scene: "board+territory", same: true, focus: "f7"}

::: kids
Knight and bishop attack f7 and only the king guards it: two against one. Nxf7 would be a fork: the knight would attack the queen on d8 and the rook on h8 at once.
:::

## s06-board {scene: "board", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7 Kxf7 7. Qf3+", ply: 10, solve: "Hit f7"}

::: kids
Idea 3 of 5: a sacrifice. Black took the pawn on d5, and their knight now blocks bishop c4. Only knight g5 aims at f7, but strike there anyway. Play the move on the board.
:::

## s07-board {scene: "board", same: true, ply: 13}

::: kids
The knight gave itself up for the f7 pawn, and the king took it and left its house. After Qf3+ the queen and bishop attack the knight on d5, and the king stands in the middle of the board, where mate comes easily.
:::

## s08-blocks {scene: "blocks", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5", ply: 8}

::: kids
Idea 4 of 5: a trap. Blocks only. The knight on e5 can take on f7 and attack the queen on g5 and the rook on h8 at once.
:::

? Should White take on f7 now?
- Yes
- [x] No
! Right: first check what threatens your own king.

## s09-territory {scene: "board+territory", same: true, focus: "g2"}

::: kids
Queen g5 aims at g2 and nobody guards it. If White takes on f7, Black takes on g2 and starts hunting the king.
:::

## s10-board {scene: "board", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#", ply: 13}

::: kids
This is how a greedy capture on f7 ends: Qxg2, Qxe4 with check and mate by the knight on f3. The f7 square can be bait.
:::

## s11-board {scene: "board", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bc5 5. Nxf7 Bxf2+", ply: 9, solve: "Hit f2"}

::: kids
Idea 5 of 5: Black does the same. The white knight took on f7, but the white king has not castled either. Black to move: find the blow on f2 and play it on the board.
:::

## s12-board {scene: "board", same: true, ply: 10}

::: kids
The bishop takes on f2 with check. If the king takes it, the knight on f6 takes the e4 pawn with check again. Now it is the white king that is in trouble.
:::

## s13-blocks {scene: "blocks", pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 Ng4", ply: 10}

::: kids
Finally, defence. Blocks only: White has already castled.
:::

? Which square do two black pieces aim at? Tap it. {tap: f2}
! Yes: f2, next to the white king.

## s14-territory {scene: "board+territory", same: true, focus: "f2"}

::: kids
Knight g4 and bishop c5 attack f2, but now the king and the rook on f1 guard it: two against two. Castling gave f2 a second defender, so there is no mate here.
:::

## s15-roads {scene: "board+roads", same: true}

::: kids
Remember: at the start only the king guards f7 and f2. When two pieces aim at that square, count the defenders. The best defence is to castle early.
:::
