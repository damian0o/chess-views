---
id: opera-game-lesson
group:
  kind: game
  id: opera-game
title: Partia w operze
about: "Morphy, Paryż 1858: szybki start, poświęcenie skoczka i mat wieżą na d8."
game: Partia w operze
experience: basic
library: opera-game
moments:
  start:
    name: szybki start
    pos: opera-game
    ply: 16
  sacrifice:
    name: poświęcenie skoczka
    pos: opera-game
    ply: 19
  mate:
    name: mat
    pos: opera-game
    ply: 33
---
<!-- draft: review -->

## s01-board {scene: "board", pos: "opera-game", ply: 16, moment: "start"}

::: kids
Paryż, 1858: Paul Morphy gra w czasie opery. Po osiem ruchów każdy. Policz, ile bierek wyprowadziła każda strona.
:::

? Która strona ma więcej wyprowadzonych bierek?
- Tyle samo
- [x] Białe
- Czarne
! Tak: białe wyprowadziły hetmana, gońca i skoczka.

## s02-roads {scene: "board+roads", same: true, moment: "start"}

::: kids
Hetman i goniec białych już celują w obóz czarnych. Goniec i wieża czarnych po stronie króla jeszcze się nie ruszyły.
:::

## s03-blocks {scene: "blocks", moment: "start"}

::: kids
Tylko bloki. Ta sama pozycja?
:::

? Czy to szybki start? {recall: "start", answer: "yes"}
! Tak: bierki białych wyszły, a czarnych są jeszcze w domu.

## s04-blocks {scene: "blocks", pos: "opera-game", ply: 4, moment: "start"}

::: kids
Inna pozycja.
:::

? Czy to szybki start? {recall: "start", answer: "no"}
! Dobrze: to dopiero dwa ruchy, wyszedł tylko jeden skoczek.

## s05-board {scene: "board", pos: "opera-game", ply: 18, moment: "sacrifice", solve: "Znajdź poświęcenie Morphy'ego"}

::: kids
Czarny pionek b5 atakuje gońca. Morphy się nie cofa. Znajdź jego ruch i zagraj go na planszy.
:::

## s06-roads {scene: "board+roads", same: true, ply: 19, moment: "sacrifice"}

::: kids
Skoczek zbił na b5 i zostanie zbity. W zamian otwierają się drogi do czarnego króla.
:::

? Co oddał Morphy?
- Gońca
- Swojego hetmana
- [x] Skoczka
! Tak: skoczka za dwa pionki, żeby otworzyć drogi.

## s07-blocks {scene: "blocks", moment: "sacrifice"}

::: kids
Tylko bloki. Ta sama pozycja?
:::

? Czy to poświęcenie skoczka? {recall: "sacrifice", answer: "yes"}
! Tak: skoczek wskoczył na b5.

## s08-blocks {scene: "blocks", pos: "opera-game", ply: 25, moment: "sacrifice"}

::: kids
Inna pozycja.
:::

? Czy to poświęcenie skoczka? {recall: "sacrifice", answer: "no"}
! Dobrze: to później, wieża zbiła już na d7.

## s09-board {scene: "board", pos: "opera-game", ply: 30, moment: "mate", solve: "Znajdź poświęcenie hetmana"}

::: kids
Morphy oddaje hetmana i w następnym ruchu daje mata. Znajdź ruch hetmanem i zagraj go na planszy.
:::

## s10-houses {scene: "board+kings", same: true, ply: 33, moment: "mate"}

::: kids
Qb8+, Nxb8, Rd8: mat. Goniec na g5 pilnuje wieży i pola e7.
:::

? Która bierka daje mata?
- [x] Wieża
- Goniec
- Hetman
! Tak: wieża na d8, której pilnuje goniec.

## s11-blocks {scene: "blocks", moment: "mate"}

::: kids
Tylko bloki. Ta sama pozycja?
:::

? Czy to mat? {recall: "mate", answer: "yes"}
! Tak: wieża na d8 i goniec na g5.

## s12-blocks {scene: "blocks", pos: "reti-1910", ply: 21, moment: "mate"}

::: kids
Inna pozycja.
:::

? Czy to mat z Partii w operze? {recall: "mate", answer: "no"}
! Dobrze: tu mata na d8 daje goniec. W Partii w operze była to wieża.

## s13-board {scene: "board", pos: "opera-game", ply: 33}

::: kids
Partia w operze zaliczona: szybki start, poświęcenie skoczka i mat wieżą na d8.
:::
