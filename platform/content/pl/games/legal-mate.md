---
id: legal-mate
group:
  kind: game
  id: legal-mate
title: Mat Légala
about: "Paryż 1750: białe oddają hetmana, a trzy lekkie figury dają mata."
game: Mat Légala
experience: basic
moments:
  gift:
    name: dar hetmana
    pos: legal-1750
    ply: 9
  mate:
    name: mat
    pos: legal-1750
    ply: 13
---
<!-- draft: review -->

## s01-board {scene: "board", pos: "legal-1750", ply: 8, moment: "gift"}

::: kids
Paryż, 1750: Légal przeciw Saint Brie. Czarny goniec na g4 wiąże skoczka z hetmanem białych. A może jednak nie?
:::

## s02-roads {scene: "board+roads", same: true, moment: "gift"}

::: kids
Droga gońca biegnie g4, f3, e2, d1: przez skoczka do hetmana.
:::

? Co stoi za skoczkiem?
- Wieża
- [x] Hetman
- Król
! Tak: hetman na d1.

## s03-board {scene: "board", pos: "legal-1750", ply: 8, moment: "gift", solve: "Znajdź niespodziankę Légala"}

::: kids
Białe i tak ruszają związanym skoczkiem. Znajdź ten ruch, potem naciśnij ▶.
:::

## s04-blocks {scene: "blocks", moment: "gift"}

::: kids
Tylko bloki. Czy to ten sam moment, co przed chwilą?
:::

? Czy to dar hetmana? {recall: "gift", answer: "yes"}
! Tak: skoczek skoczył na e5, a hetman został do zbicia.

## s05-blocks {scene: "blocks", pos: "legal-1750", ply: 6, moment: "gift"}

::: kids
Inna plansza.
:::

? Czy to dar hetmana? {recall: "gift", answer: "no"}
! Dobrze: skoczek jest jeszcze na f3, nic nie zostało oddane.

## s06-board {scene: "board", pos: "legal-1750", ply: 10, moment: "mate", solve: "Znajdź mata w dwóch"}

::: kids
Czarne zbiły hetmana. Teraz białe dają mata w dwóch ruchach. Znajdź pierwszy, potem naciśnij ▶.
:::

## s07-houses {scene: "board+kings", same: true, ply: 13, moment: "mate"}

::: kids
Bxf7+, Ke7, Nd5: mat. Trzy lekkie figury pilnują wszystkich pól, a resztę pól zajmują własne bierki czarnych.
:::

? Ile białych bierek robi mata?
- Dwie
- Cztery
- [x] Trzy
! Tak: goniec i dwa skoczki.

## s08-blocks {scene: "blocks", moment: "mate"}

::: kids
Tylko bloki. Czy to ten sam moment, co przed chwilą?
:::

? Czy to mat? {recall: "mate", answer: "yes"}
! Tak: goniec f7, skoczki d5 i e5.

## s09-blocks {scene: "blocks", pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#", ply: 7, moment: "mate"}

::: kids
Inna plansza.
:::

? Czy to mat Légala? {recall: "mate", answer: "no"}
! Dobrze: to mat szkolny, hetman na f7. Légal daje mata lekkimi figurami.

## s10-board {scene: "board", pos: "legal-1750", ply: 13}

::: kids
Mat Légala zaliczony: związany skoczek, który wcale nie był związany, dar hetmana i trzy lekkie figury.
:::
