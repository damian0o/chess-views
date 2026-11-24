---
id: opera-game-lesson
group:
  kind: game
  id: opera-game
title: Opera game
about: "Morphy, Paris 1858: a fast start, a knight sacrifice and a rook mate on d8."
game: Opera game
experience: basic
moments:
  start:
    name: the fast start
    pos: opera-game
    ply: 16
  sacrifice:
    name: the knight sacrifice
    pos: opera-game
    ply: 19
  mate:
    name: the mate
    pos: opera-game
    ply: 33
---

## s01-board {scene: "board", pos: "opera-game", ply: 16, moment: "start"}

::: kids
Paris, 1858: Paul Morphy plays during an opera. Eight moves each. Count the pieces each side has moved out.
:::

? Which side has more pieces out?
- The same
- [x] White
- Black
! Yes: queen, bishop and knight are out for White.

## s02-roads {scene: "board+roads", same: true, moment: "start"}

::: kids
White's queen and bishop already aim into Black's camp. Black's bishop and rook on the king's side have not moved.
:::

## s03-blocks {scene: "blocks", moment: "start"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the fast start? {recall: "start", answer: "yes"}
! Yes: White's pieces are out, Black's are still at home.

## s04-blocks {scene: "blocks", pos: "opera-game", ply: 4, moment: "start"}

::: kids
Another board.
:::

? Is this the fast start? {recall: "start", answer: "no"}
! Right: two moves in, only one knight is out.

## s05-board {scene: "board", pos: "opera-game", ply: 18, moment: "sacrifice", solve: "Find Morphy's sacrifice"}

::: kids
Black's pawn b5 attacks the bishop. Morphy does not step back. Find his move, then press ▶.
:::

## s06-roads {scene: "board+roads", same: true, ply: 19, moment: "sacrifice"}

::: kids
The knight took on b5 and will be taken. In return the roads to Black's king open up.
:::

? What did Morphy give up?
- A bishop
- His queen
- [x] A knight
! Yes: a knight for two pawns, to open the roads.

## s07-blocks {scene: "blocks", moment: "sacrifice"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the knight sacrifice? {recall: "sacrifice", answer: "yes"}
! Yes: the knight has jumped into b5.

## s08-blocks {scene: "blocks", pos: "opera-game", ply: 25, moment: "sacrifice"}

::: kids
Another board.
:::

? Is this the knight sacrifice? {recall: "sacrifice", answer: "no"}
! Right: this is later, the rook has taken on d7.

## s09-board {scene: "board", pos: "opera-game", ply: 30, moment: "mate", solve: "Find the queen sacrifice"}

::: kids
Morphy gives away his queen and mates next move. Find the queen move, then press ▶.
:::

## s10-houses {scene: "board+kings", same: true, ply: 33, moment: "mate"}

::: kids
Qb8+, Nxb8, Rd8: mate. The bishop on g5 guards the rook and e7.
:::

? Which piece gives the mate?
- [x] Rook
- Bishop
- Queen
! Yes: the rook on d8, guarded by the bishop.

## s11-blocks {scene: "blocks", moment: "mate"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the mate? {recall: "mate", answer: "yes"}
! Yes: the rook on d8 and the bishop on g5.

## s12-blocks {scene: "blocks", pos: "reti-1910", ply: 21, moment: "mate"}

::: kids
Another board.
:::

? Is this the Opera mate? {recall: "mate", answer: "no"}
! Right: here a bishop mates on d8. In the Opera game it was a rook.

## s13-board {scene: "board", pos: "opera-game", ply: 33}

::: kids
Opera game done: a fast start, a knight sacrifice, and a rook mate on d8.
:::
