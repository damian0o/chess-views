---
id: scholars-mate
group:
  kind: pattern
  id: f7-attack
title: Mat szkolny
about: Zrób mata w czterech ruchach, potem naucz się go zatrzymać, potem rozpoznaj jego kształt.
game: Mat szkolny
experience: basic
moments:
  attack:
    name: atak na f7
    pgn: 1. e4 e5 2. Bc4 Nc6 3. Qh5
    ply: 5
  defence:
    name: obrona
    pgn: 1. e4 e5 2. Bc4 Nc6 3. Qh5 g6
    ply: 6
  mate:
    name: mat
    pgn: 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
    ply: 7
---
<!-- draft: review -->

## s01-board {scene: "board", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5", ply: 0, moment: "attack"}

::: kids
Naciskaj ▶ i zagraj pierwsze ruchy partii: e4 e5, Gc4 Sc6, Hh5. Po trzech ruchach białych zobacz, w co celują.
:::

## s02-houses {scene: "board+kings", same: true, ply: 5, moment: "attack"}

::: kids
f7 to najsłabsze pole w domku czarnych: pilnuje go tylko król.
:::

## s03-roads {scene: "board+roads", same: true, moment: "attack"}

::: kids
Dwie drogi spotykają się na f7: droga gońca z c4 i droga hetmana z h5.
:::

## s04-shapes {scene: "blocks", same: true, moment: "attack"}

::: kids
Zapomnij o bierkach i zapamiętaj kształt: duży blok na h5 i mały na c4, oba celują w pole obok króla.
:::

## s05-territory {scene: "board+territory", same: true, focus: "f7", moment: "attack"}

::: kids
Dwie bierki atakują f7, a pilnuje go tylko król. Król nie może odbić, bo goniec wciąż tam celuje. Gdyby był ruch białych: Qxf7, szach-mat.
:::

## s06-board {scene: "board", same: true, moment: "attack"}

::: kids
Tu nie ma narysowanych dróg: odpowiedz z pamięci.
:::

? Dotknij pola, w które celują obie bierki. {tap: "f7"}
! Tak: f7, obok króla.

## s07-blocks {scene: "blocks", moment: "attack"}

::: kids
Tylko bloki. Ten sam atak?
:::

? Czy to atak na f7? {recall: "attack", answer: "yes"}
! Tak: duży blok na h5 i mały na c4.

## s08-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Nf3", ply: 5, moment: "attack"}

::: kids
Inna pozycja.
:::

? Czy to atak na f7? {recall: "attack", answer: "no"}
! Dobrze: hetman jest jeszcze w domu, tylko jedna bierka celuje w f7.

## s09-board {scene: "board", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#", ply: 6, moment: "mate", solve: "Znajdź cios białych"}

::: kids
Czarne zrobiły nieuważny ruch. Znajdź cios i zagraj go na planszy.
:::

## s10-houses {scene: "board+kings", same: true, ply: 7, moment: "mate"}

::: kids
Szach-mat: król nie ma dokąd uciec i nikt nie może zbić hetmana.
:::

? Która bierka dała mata?
- Skoczek
- [x] Hetman
- Goniec
! Tak: hetman, a goniec go pilnuje.

## s11-blocks {scene: "blocks", moment: "mate"}

::: kids
Znowu tylko bloki.
:::

? Czy to mat? {recall: "mate", answer: "yes"}
! Tak: duży blok stoi na f7, obok króla.

## s12-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#", ply: 5, moment: "mate"}

::: kids
Jeszcze jedna pozycja.
:::

? Czy to mat? {recall: "mate", answer: "no"}
! Dobrze: hetman jest jeszcze na h5. To groźba, a nie mat.

## s13-territory {scene: "board+territory", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 g6", ply: 5, focus: "f7", moment: "defence", solve: "Zatrzymaj mata"}

::: kids
Ruch czarnych. Daj polu f7 obrońcę oprócz króla albo przegoń hetmana. Zagraj ruch na planszy.
:::

## s14-board {scene: "board", same: true, ply: 6, moment: "defence"}

::: kids
g6 zasłania drogę hetmana. Qe7, Qf6 i Nh6 też działają: każdy z nich pilnuje f7 albo przegania hetmana.
:::

## s15-board {scene: "board", fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3", moment: "defence"}

::: kids
Znowu ruch czarnych, a Qxf7 już nadchodzi.
:::

? Który ruch zatrzymuje mata?
- a6
- h6
- [x] g6
! Tak: g6 zasłania drogę hetmana i atakuje hetmana.

## s16-shapes {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 g6 4. Qf3", ply: 7, moment: "defence"}

::: kids
Ten sam kształt, tylko hetman się przesunął. W co celuje? Znowu w f7.
:::

## s17-board {scene: "board", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 g6 4. Qf3 Nf6", ply: 7, moment: "defence", solve: "Obroń się jeszcze raz"}

::: kids
Sam król znowu nie wystarczy: pilnuj f7 bierką i zagraj ruch na planszy. Uważaj na f7, dopóki nie zrobisz roszady.
:::

## s18-blocks {scene: "blocks", moment: "defence"}

::: kids
Tylko bloki.
:::

? Czy to obrona? {recall: "defence", answer: "yes"}
! Tak: mały blok na g6 stoi na drodze hetmana.

## s19-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#", ply: 6, moment: "defence"}

::: kids
Jeszcze jedna pozycja.
:::

? Czy to obrona? {recall: "defence", answer: "no"}
! Dobrze: skoczek poszedł na f6, a droga do f7 jest wciąż otwarta.

## s20-shapes {scene: "blocks", pgn: "1. e4 e5 2. Qh5 Nc6 3. Bc4", ply: 5}

::: kids
Same bloki. Szukaj kształtu mata: duży i mały blok celują w jedno pole obok króla.
:::

? W które pole uderza kształt? Dotknij go. {tap: f7}
! Tak: f7, obok czarnego króla.

## s21-territory {scene: "board+territory", same: true, focus: "f7"}

::: kids
Tak: ten sam kształt, tylko inną drogą. Znowu f7.
:::

## s22-shapes {scene: "blocks", pgn: "1. e4 e5 2. Nf3 Bc5 3. Nxe5 Qh4", ply: 6}

::: kids
Znowu same bloki. Tym razem patrz na oba króle.
:::

? W które pole uderza kształt? Dotknij go. {tap: f2}
! Tak: f2, obok białego króla.

## s23-roads {scene: "board+roads", same: true}

::: kids
Tak, i to na ciebie: hetman h4 i goniec c5 celują w f2, a Qxf2 byłoby szach-matem. Broń f2 albo przegoń hetmana.
:::

## s24-shapes {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Nf3", ply: 5}

::: kids
Ostatnie bloki. Policz, ile bloków celuje w pole obok króla.
:::

? Czy jest tu kształt mata?
- Tak
- [x] Nie
! Dobrze: w f7 celuje tylko jeden blok.

## s25-roads {scene: "board+roads", same: true}

::: kids
Nie. Hetman jest jeszcze w domu, więc tylko jedna droga sięga f7. Jedna atakująca bierka na jednego obrońcę to nie mat.
:::
