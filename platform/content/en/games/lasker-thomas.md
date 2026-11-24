---
id: lasker-thomas
group:
  kind: game
  id: lasker-thomas
title: Lasker's king hunt
about: "London 1912: a queen sacrifice drags the black king across the whole board."
game: Lasker's game
experience: basic
moments:
  gift:
    name: the queen gift
    pos: lasker-1912
    ply: 21
  hunt:
    name: the king hunt
    pos: lasker-1912
    ply: 30
  mate:
    name: the mate
    pos: lasker-1912
    ply: 35
---

## s01-board {scene: "board", pos: "lasker-1912", ply: 20, moment: "gift"}

::: kids
London, 1912: Edward Lasker against Thomas. Black has castled and the king sits on g8. Safe, it seems.
:::

## s02-roads {scene: "board+roads", same: true, moment: "gift"}

::: kids
The queen on h5 and the two knights on e4 and e5 are close to Black's king.
:::

? Which pawn does the queen aim at?
- f7
- [x] h7
- g7
! Yes: h7, guarded only by the king.

## s03-board {scene: "board", pos: "lasker-1912", ply: 20, moment: "gift", solve: "Find Lasker's queen gift"}

::: kids
White gives the queen away with check. Find the move, then press ▶.
:::

## s04-houses {scene: "board+kings", same: true, ply: 22, moment: "gift"}

::: kids
The king took the queen and has left his house.
:::

? Where is the king now?
- g8
- h8
- [x] h7
! Yes: h7, out of his house.

## s05-blocks {scene: "blocks", moment: "gift"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the queen gift? {recall: "gift", answer: "yes"}
! Yes: the white queen has landed on h7.

## s06-blocks {scene: "blocks", pos: "lasker-1912", ply: 20, moment: "gift"}

::: kids
Another board.
:::

? Is this the queen gift? {recall: "gift", answer: "no"}
! Right: the queen is still on h5.

## s07-board {scene: "board", pos: "lasker-1912", ply: 22, moment: "hunt"}

::: kids
Now check after check: Nxf6+, Ng4+, h4+, g3+, Be2+, Rh2+. Press ▶ and watch the king walk.
:::

## s08-houses {scene: "board+kings", pos: "lasker-1912", ply: 30, moment: "hunt"}

::: kids
The black king is on f3, deep in White's half, far from his own pieces.
:::

? Which half is the king in now?
- [x] White's half
- Black's half
- The middle
! Yes: deep in White's half.

## s09-blocks {scene: "blocks", moment: "hunt"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the king hunt? {recall: "hunt", answer: "yes"}
! Yes: the black king is on f3, far from home.

## s10-blocks {scene: "blocks", pos: "lasker-1912", ply: 22, moment: "hunt"}

::: kids
Another board.
:::

? Is this the king hunt? {recall: "hunt", answer: "no"}
! Right: the hunt has not started, the king is still on h7.

## s11-board {scene: "board", pos: "lasker-1912", ply: 34, moment: "mate", solve: "Find the mate"}

::: kids
The king has reached g1, White's own corner. Even White's king can help. Find the mate, then press ▶.
:::

## s12-houses {scene: "board+kings", same: true, ply: 35, moment: "mate"}

::: kids
Kd2 uncovers the rook on a1: mate on the first rank. Castling long, O-O-O, mates too.
:::

? Which piece gives check?
- The king
- A knight
- [x] The rook on a1
! Yes: the king steps away and the rook gives check.

## s13-blocks {scene: "blocks", moment: "mate"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the mate? {recall: "mate", answer: "yes"}
! Yes: the black king on g1, mated in White's corner.

## s14-blocks {scene: "blocks", pos: "lasker-1912", ply: 32, moment: "mate"}

::: kids
Another board.
:::

? Is this the mate? {recall: "mate", answer: "no"}
! Right: the king is on g2, one step before the end.

## s15-board {scene: "board", pos: "lasker-1912", ply: 35}

::: kids
Lasker's king hunt done: a queen gift on h7, a king walked across the board, and a mate on g1.
:::
