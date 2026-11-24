---
id: scholars-mate
group:
  kind: pattern
  id: f7-attack
title: Scholar's mate
about: Make the four-move mate, then learn to stop it, then spot its shape.
game: Scholar's mate
experience: basic
moments:
  attack:
    name: the attack on f7
    pgn: 1. e4 e5 2. Bc4 Nc6 3. Qh5
    ply: 5
  defence:
    name: the defence
    pgn: 1. e4 e5 2. Bc4 Nc6 3. Qh5 g6
    ply: 6
  mate:
    name: the mate
    pgn: 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
    ply: 7
---

## s01-board {scene: "board", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5", ply: 5, moment: "attack"}

::: kids
Three moves by White. Now look what they aim at.
:::

## s02-houses {scene: "board+kings", same: true, moment: "attack"}

::: kids
f7 is the weakest square in Black's house: only the king guards it.
:::

## s03-roads {scene: "board+roads", same: true, moment: "attack"}

::: kids
Two roads meet on f7: the bishop's from c4 and the queen's from h5.
:::

## s04-shapes {scene: "blocks", same: true, moment: "attack"}

::: kids
Forget the pieces and keep the shape: a big block on h5 and a small one on c4, both pointing at the square next to the king.
:::

## s05-territory {scene: "board+territory", same: true, focus: "f7", moment: "attack"}

::: kids
Two attackers on f7 and only the king to guard it, but the king cannot take back while the bishop still aims there. If it were White's move: Qxf7, checkmate.
:::

## s06-board {scene: "board", same: true, moment: "attack"}

::: kids
No roads drawn here: answer from memory.
:::

? Tap the square both pieces aim at. {tap: "f7"}
! Yes: f7, next to the king.

## s07-blocks {scene: "blocks", moment: "attack"}

::: kids
Blocks only. Is this the attack you just saw?
:::

? Is this the attack on f7? {recall: "attack", answer: "yes"}
! Yes: a big block on h5 and a small one on c4.

## s08-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Nf3", ply: 5, moment: "attack"}

::: kids
Another board.
:::

? Is this the attack on f7? {recall: "attack", answer: "no"}
! Right: the queen is still at home, only one piece aims at f7.

## s09-board {scene: "board", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#", ply: 6, moment: "mate", solve: "Find White's strike"}

::: kids
Black played a careless move. Find the strike on the board or on paper, then press ▶.
:::

## s10-houses {scene: "board+kings", same: true, ply: 7, moment: "mate"}

::: kids
Checkmate: the king has no square to run to and nobody can take the queen.
:::

? Which piece gave the mate?
- Knight
- [x] Queen
- Bishop
! Yes: the queen, and the bishop guards her.

## s11-blocks {scene: "blocks", moment: "mate"}

::: kids
Blocks only again.
:::

? Is this the mate? {recall: "mate", answer: "yes"}
! Yes: the big block sits on f7, next to the king.

## s12-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#", ply: 5, moment: "mate"}

::: kids
One more board.
:::

? Is this the mate? {recall: "mate", answer: "no"}
! Right: the queen is still on h5. This is the threat, not the mate.

## s13-territory {scene: "board+territory", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 g6", ply: 5, focus: "f7", moment: "defence", solve: "Stop the mate"}

::: kids
Black to move. Give f7 a defender besides the king, or chase the queen away, then press ▶.
:::

## s14-board {scene: "board", same: true, ply: 6, moment: "defence"}

::: kids
g6 blocks the queen's road. Qe7, Qf6 and Nh6 also work: each one guards f7 or chases the queen.
:::

## s15-board {scene: "board", fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3", moment: "defence"}

::: kids
Black to move again, and Qxf7 is coming.
:::

? Which move stops the mate?
- a6
- h6
- [x] g6
! Yes: g6 blocks the queen's road and attacks the queen.

## s16-shapes {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 g6 4. Qf3", ply: 7, moment: "defence"}

::: kids
Same shape, the queen only moved. Where does it point? f7 again.
:::

## s17-board {scene: "board", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 g6 4. Qf3 Nf6", ply: 7, moment: "defence", solve: "Defend again"}

::: kids
The king alone is not enough again: guard f7 with a piece, then press ▶. Keep watching f7 until you castle.
:::

## s18-blocks {scene: "blocks", moment: "defence"}

::: kids
Blocks only.
:::

? Is this the defence? {recall: "defence", answer: "yes"}
! Yes: a small block on g6 stands in the queen's road.

## s19-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#", ply: 6, moment: "defence"}

::: kids
One more board.
:::

? Is this the defence? {recall: "defence", answer: "no"}
! Right: the knight went to f6 and the road to f7 is still open.

## s20-shapes {scene: "blocks", pgn: "1. e4 e5 2. Qh5 Nc6 3. Bc4", ply: 5}

::: kids
Is the mate shape here? Say which square it strikes, press Reveal pieces, then Next.
:::

## s21-territory {scene: "board+territory", same: true, focus: "f7"}

::: kids
Yes: the same shape by another road. f7 again.
:::

## s22-shapes {scene: "blocks", pgn: "1. e4 e5 2. Nf3 Bc5 3. Nxe5 Qh4", ply: 6}

::: kids
Is the mate shape here? Say which square it strikes, press Reveal pieces, then Next.
:::

## s23-roads {scene: "board+roads", same: true}

::: kids
Yes, and it is coming at you: queen h4 and bishop c5 both point at f2, and Qxf2 would be checkmate. Guard f2 or chase the queen.
:::

## s24-shapes {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Nf3", ply: 5}

::: kids
Is the mate shape here? Say which square it strikes, press Reveal pieces, then Next.
:::

## s25-roads {scene: "board+roads", same: true}

::: kids
No. The queen is still at home, so only one road reaches f7. One attacker against one defender is no mate.
:::
