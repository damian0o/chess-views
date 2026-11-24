---
id: reti-tartakower
group:
  kind: game
  id: reti-tartakower
title: Réti kontra Tartakower
about: "Wiedeń 1910: ofiara hetmana na d8, podwójny szach i mat gońcem."
game: Partia Rétiego
experience: basic
moments:
  gift:
    name: dar hetmana
    pos: reti-1910
    ply: 17
  mate:
    name: mat
    pos: reti-1910
    ply: 21
---
<!-- draft: review -->

## s01-board {scene: "board", pos: "reti-1910", ply: 16, moment: "gift"}

::: kids
Wiedeń, 1910: Réti przeciw Tartakowerowi. Białe zrobiły długą roszadę, a czarne właśnie zbiły skoczka na e4.
:::

## s02-roads {scene: "board+roads", same: true, moment: "gift"}

::: kids
Droga białego hetmana biegnie kolumną d aż do d8, obok czarnego króla.
:::

? Gdzie kończy się droga hetmana?
- e8
- [x] d8
- d7
! Tak: na d8, obok króla.

## s03-board {scene: "board", pos: "reti-1910", ply: 16, moment: "gift", solve: "Znajdź ruch hetmanem Rétiego"}

::: kids
Białe oddają hetmana z szachem. Znajdź ten ruch, potem naciśnij ▶.
:::

## s04-houses {scene: "board+kings", same: true, ply: 18, moment: "gift"}

::: kids
Król musiał zbić i teraz stoi na d8, na jednej linii z wieżą na d1.
:::

## s05-blocks {scene: "blocks", moment: "gift"}

::: kids
Tylko bloki. Czy to ten sam moment, co przed chwilą?
:::

? Czy to dar hetmana? {recall: "gift", answer: "yes"}
! Tak: hetman stoi na d8, obok króla.

## s06-blocks {scene: "blocks", pos: "reti-1910", ply: 15, moment: "gift"}

::: kids
Inna plansza.
:::

? Czy to dar hetmana? {recall: "gift", answer: "no"}
! Dobrze: hetman jest jeszcze na d3.

## s07-board {scene: "board", pos: "reti-1910", ply: 18, moment: "mate", solve: "Znajdź podwójny szach"}

::: kids
Goniec z d2 odchodzi i dwie bierki dają szacha naraz. Znajdź to, potem naciśnij ▶.
:::

## s08-roads {scene: "board+roads", same: true, ply: 21, moment: "mate"}

::: kids
Bg5+ to był podwójny szach, Kc7, potem Bd8: mat. Wieża na d1 pilnuje gońca.
:::

? Która bierka daje mata?
- Wieża
- Hetman
- [x] Goniec
! Tak: goniec na d8, którego pilnuje wieża.

## s09-blocks {scene: "blocks", moment: "mate"}

::: kids
Tylko bloki. Czy to ten sam moment, co przed chwilą?
:::

? Czy to mat? {recall: "mate", answer: "yes"}
! Tak: goniec na d8, a za nim wieża.

## s10-blocks {scene: "blocks", pos: "opera-game", ply: 33, moment: "mate"}

::: kids
Inna plansza.
:::

? Czy to mat Rétiego? {recall: "mate", answer: "no"}
! Dobrze: to mat Morphy'ego, wieża na d8. Réti dał mata gońcem.

## s11-board {scene: "board", pos: "reti-1910", ply: 21}

::: kids
Partia Rétiego zaliczona: kolumna d, dar hetmana na d8, podwójny szach i mat gońcem.
:::
