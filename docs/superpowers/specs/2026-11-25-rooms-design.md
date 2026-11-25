# Rooms: lessons and library positions together by topic

## Why
The home screen had Wzory and Partie (guided lessons) and a separate Biblioteka (25 positions),
and the same famous games sat in both without links. A child should find everything about one
topic in one place. The user chose "separate rooms by topic" (option C) on 2026-11-25.

## Goals
- Home shows rooms; each room holds its guided lessons first, then its positions to explore.
- A game appears once: its lesson and its board on one card.
- Adding a lesson or a position means giving it a room; nothing else.
- Old links keep working.

## Non-goals
- No new lessons or positions; no rewrite of the two f7 lessons now (possible later as one "f7 path").
- No change to how a lesson or the free board behaves.

## Approaches considered
- A: "Lekcje" and "Biblioteka" side by side, linked. Keeps the overlap.
- B: one library holding lessons too. One place, but lessons drown among 25 positions.
- C (chosen): rooms by topic, each with its lessons and positions.

## Design
- Rooms: `patterns` Wzory, `games` Partie, `endgames` Końcówki, `openings` Debiuty i plany
  (Polish and English names in the messages). A room with nothing in it is not shown.
- Content: every library entry gets `room:` in library.yaml (compiler error if missing or unknown).
  A lesson's room follows its group kind: pattern -> patterns, game -> games, strategy -> openings.
  A lesson may name its board in the library with `library: <id>` in its front matter; that entry
  is then shown on the lesson's card ("Plansza") instead of as its own card. The 4 game lessons get it.
- Home: a "Kontynuuj" card for the lesson last opened and not finished (profile remembers
  `lastLesson`; the profile is already saved), then one card per room (name, short line, counts),
  then Wolna szachownica and Rozpoznaj. The Biblioteka card goes.
- Room screen `#/room/<id>`: Lekcje (cards with progress, Zacznij/Kontynuuj, and Plansza when linked),
  then Pozycje (the existing library cards: search, tag chips, mini boards, Otwórz), only this room's.
- Families (added on the user's suggestion): a pattern family groups everything about one idea,
  e.g. `f7-attack` "Atak na f7 i f2". A lesson's family is its existing `group.id`; a library entry
  may list `family: [..]` in library.yaml (compiler error for an unknown family). Family names live in
  the messages (pl/en). On a room screen, family chips filter its lessons and positions together;
  below the filtered list, "Także w innych pokojach" lists matching lessons and positions from other
  rooms (e.g. Légal's game in Partie for the f7 family), each opening where it lives.
  First family: f7-attack = Oczy na f7, Mat szkolny (lessons), groźba mata szkolnego, partia włoska
  (positions), Légal (lesson + game). Others (back rank, fork, pin) can be added later as content.
- Old `#/library` opens Home. Old position links are unchanged (they go to the free board).
- Positions mapping (from current tags): see the table in the conversation; the compiler enforces it.

## Left to the builder
Card wording and room descriptions; the room order on Home (Wzory, Partie, Końcówki, Debiuty).
