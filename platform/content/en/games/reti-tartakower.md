---
id: reti-tartakower
group:
  kind: game
  id: reti-tartakower
title: Réti vs Tartakower
about: "Vienna 1910: a queen sacrifice on d8, a double check and a bishop mate."
game: Réti's game
experience: basic
moments:
  gift:
    name: the queen gift
    pos: reti-1910
    ply: 17
  mate:
    name: the mate
    pos: reti-1910
    ply: 21
---

## s01-board {scene: "board", pos: "reti-1910", ply: 16, moment: "gift"}

::: kids
Vienna, 1910: Réti against Tartakower. White has castled long, and Black just took a knight on e4.
:::

## s02-roads {scene: "board+roads", same: true, moment: "gift"}

::: kids
The white queen's road runs down the d-file all the way to d8, next to the black king.
:::

? Where does the queen's road end?
- e8
- [x] d8
- d7
! Yes: d8, next to the king.

## s03-board {scene: "board", pos: "reti-1910", ply: 16, moment: "gift", solve: "Find Réti's queen move"}

::: kids
White gives the queen away with check. Find the move, then press ▶.
:::

## s04-houses {scene: "board+kings", same: true, ply: 18, moment: "gift"}

::: kids
The king had to take, and now stands on d8, in line with the rook on d1.
:::

## s05-blocks {scene: "blocks", moment: "gift"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the queen gift? {recall: "gift", answer: "yes"}
! Yes: the queen sits on d8, next to the king.

## s06-blocks {scene: "blocks", pos: "reti-1910", ply: 15, moment: "gift"}

::: kids
Another board.
:::

? Is this the queen gift? {recall: "gift", answer: "no"}
! Right: the queen is still on d3.

## s07-board {scene: "board", pos: "reti-1910", ply: 18, moment: "mate", solve: "Find the double check"}

::: kids
The bishop on d2 steps away and two pieces give check at once. Find it, then press ▶.
:::

## s08-roads {scene: "board+roads", same: true, ply: 21, moment: "mate"}

::: kids
Bg5+ was a double check, Kc7, then Bd8: mate. The rook on d1 guards the bishop.
:::

? Which piece gives the mate?
- Rook
- Queen
- [x] Bishop
! Yes: the bishop on d8, guarded by the rook.

## s09-blocks {scene: "blocks", moment: "mate"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the mate? {recall: "mate", answer: "yes"}
! Yes: a bishop on d8 with the rook behind it.

## s10-blocks {scene: "blocks", pos: "opera-game", ply: 33, moment: "mate"}

::: kids
Another board.
:::

? Is this Réti's mate? {recall: "mate", answer: "no"}
! Right: that is Morphy's mate, a rook on d8. Réti mated with a bishop.

## s11-board {scene: "board", pos: "reti-1910", ply: 21}

::: kids
Réti's game done: the d-file, a queen gift on d8, a double check and a bishop mate.
:::
