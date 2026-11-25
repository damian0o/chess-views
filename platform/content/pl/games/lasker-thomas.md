---
id: lasker-thomas
group:
  kind: game
  id: lasker-thomas
title: Lasker poluje na króla
about: "Londyn 1912: ofiara hetmana ciągnie czarnego króla przez całą szachownicę."
game: Lasker – Thomas
experience: basic
moments:
  gift:
    name: dar hetmana
    pos: lasker-1912
    ply: 21
  hunt:
    name: polowanie na króla
    pos: lasker-1912
    ply: 30
  mate:
    name: mat
    pos: lasker-1912
    ply: 35
---
<!-- draft: review -->

## s01-board {scene: "board", pos: "lasker-1912", ply: 20, moment: "gift"}

::: kids
Londyn, 1912: Edward Lasker przeciw Thomasowi. Czarne zrobiły roszadę i król stoi na g8. Wygląda na to, że bezpiecznie.
:::

## s02-roads {scene: "board+roads", same: true, moment: "gift"}

::: kids
Hetman na h5 i dwa skoczki na e4 i e5 są blisko czarnego króla.
:::

? W który pionek celuje hetman?
- f7
- [x] h7
- g7
! Tak: h7, którego pilnuje tylko król.

## s03-board {scene: "board", pos: "lasker-1912", ply: 20, moment: "gift", solve: "Znajdź dar hetmana Laskera"}

::: kids
Białe oddają hetmana z szachem. Znajdź ten ruch i zagraj go na planszy.
:::

## s04-houses {scene: "board+kings", same: true, ply: 22, moment: "gift"}

::: kids
Król zbił hetmana i wyszedł ze swojego domku.
:::

? Gdzie jest teraz król?
- g8
- h8
- [x] h7
! Tak: na h7, poza swoim domkiem.

## s05-blocks {scene: "blocks", moment: "gift"}

::: kids
Tylko bloki. Ta sama pozycja?
:::

? Czy to dar hetmana? {recall: "gift", answer: "yes"}
! Tak: biały hetman wylądował na h7.

## s06-blocks {scene: "blocks", pos: "lasker-1912", ply: 20, moment: "gift"}

::: kids
Inna pozycja.
:::

? Czy to dar hetmana? {recall: "gift", answer: "no"}
! Dobrze: hetman jest jeszcze na h5.

## s07-board {scene: "board", pos: "lasker-1912", ply: 22, moment: "hunt"}

::: kids
Teraz szach za szachem: Nxf6+, Ng4+, h4+, g3+, Be2+, Rh2+. Naciśnij ▶ i patrz, jak król wędruje.
:::

## s08-houses {scene: "board+kings", pos: "lasker-1912", ply: 30, moment: "hunt"}

::: kids
Czarny król jest na f3, głęboko na połowie białych, daleko od swoich bierek.
:::

? Na której połowie jest teraz król?
- [x] Na połowie białych
- Na połowie czarnych
- Na środku
! Tak: głęboko na połowie białych.

## s09-blocks {scene: "blocks", moment: "hunt"}

::: kids
Tylko bloki. Ta sama pozycja?
:::

? Czy to polowanie na króla? {recall: "hunt", answer: "yes"}
! Tak: czarny król jest na f3, daleko od domu.

## s10-blocks {scene: "blocks", pos: "lasker-1912", ply: 22, moment: "hunt"}

::: kids
Inna pozycja.
:::

? Czy to polowanie na króla? {recall: "hunt", answer: "no"}
! Dobrze: polowanie jeszcze się nie zaczęło, król jest wciąż na h7.

## s11-board {scene: "board", pos: "lasker-1912", ply: 34, moment: "mate", solve: "Znajdź mata"}

::: kids
Król doszedł aż na g1, do rogu białych. Nawet biały król może pomóc. Znajdź mata i zagraj go na planszy.
:::

## s12-houses {scene: "board+kings", same: true, ply: 35, moment: "mate"}

::: kids
Kd2 odsłania wieżę na a1: mat na pierwszej linii. Długa roszada, O-O-O, też daje mata.
:::

? Która bierka daje szacha?
- Król
- Skoczek
- [x] Wieża na a1
! Tak: król odchodzi, a wieża daje szacha.

## s13-blocks {scene: "blocks", moment: "mate"}

::: kids
Tylko bloki. Ta sama pozycja?
:::

? Czy to mat? {recall: "mate", answer: "yes"}
! Tak: czarny król na g1, zamatowany w rogu białych.

## s14-blocks {scene: "blocks", pos: "lasker-1912", ply: 32, moment: "mate"}

::: kids
Inna pozycja.
:::

? Czy to mat? {recall: "mate", answer: "no"}
! Dobrze: król jest na g2, jeden krok przed końcem.

## s15-board {scene: "board", pos: "lasker-1912", ply: 35}

::: kids
Polowanie Laskera zaliczone: dar hetmana na h7, wędrówka króla przez całą szachownicę i mat na g1.
:::
