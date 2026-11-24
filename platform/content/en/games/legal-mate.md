---
id: legal-mate
group:
  kind: game
  id: legal-mate
title: Légal's mate
about: "Paris 1750: White gives the queen away, and three small pieces mate."
game: Légal's mate
experience: basic
moments:
  gift:
    name: the queen gift
    pos: legal-1750
    ply: 9
  mate:
    name: the mate
    pos: legal-1750
    ply: 13
---

## s01-board {scene: "board", pos: "legal-1750", ply: 8, moment: "gift"}

::: kids
Paris, 1750: Légal against Saint Brie. Black's bishop on g4 pins the knight to White's queen. Or does it?
:::

## s02-roads {scene: "board+roads", same: true, moment: "gift"}

::: kids
The bishop's road runs g4, f3, e2, d1: through the knight to the queen.
:::

? What stands behind the knight?
- A rook
- [x] The queen
- The king
! Yes: the queen on d1.

## s03-board {scene: "board", pos: "legal-1750", ply: 8, moment: "gift", solve: "Find Légal's surprise"}

::: kids
White moves the pinned knight anyway. Find the move, then press ▶.
:::

## s04-blocks {scene: "blocks", moment: "gift"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the queen gift? {recall: "gift", answer: "yes"}
! Yes: the knight jumped to e5 and the queen is left to be taken.

## s05-blocks {scene: "blocks", pos: "legal-1750", ply: 6, moment: "gift"}

::: kids
Another board.
:::

? Is this the queen gift? {recall: "gift", answer: "no"}
! Right: the knight is still on f3, nothing is given yet.

## s06-board {scene: "board", pos: "legal-1750", ply: 10, moment: "mate", solve: "Find the mate in two"}

::: kids
Black took the queen. Now White mates in two moves. Find the first one, then press ▶.
:::

## s07-houses {scene: "board+kings", same: true, ply: 13, moment: "mate"}

::: kids
Bxf7+, Ke7, Nd5: mate. The three small pieces cover every square, and Black's own pieces fill the rest.
:::

? How many White pieces make the mate?
- Two
- Four
- [x] Three
! Yes: a bishop and two knights.

## s08-blocks {scene: "blocks", moment: "mate"}

::: kids
Blocks only. Is this the moment you just saw?
:::

? Is this the mate? {recall: "mate", answer: "yes"}
! Yes: bishop f7, knights d5 and e5.

## s09-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#", ply: 7, moment: "mate"}

::: kids
Another board.
:::

? Is this Légal's mate? {recall: "mate", answer: "no"}
! Right: that is the Scholar's mate, a queen on f7. Légal mates with small pieces.

## s10-board {scene: "board", pos: "legal-1750", ply: 13}

::: kids
Légal's mate done: a pinned knight that was not really pinned, a queen gift, and three small pieces.
:::
