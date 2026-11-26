# Lesson screen on a phone: read first, then pull the board up

Mockups: `lesson-phone-layout/pull.gif` (motion), `lesson-phone-layout/pull.html` (open in a phone-sized
window), `lesson-phone-layout/all.png` (the earlier two-screen idea).

## Intent

Most children use Chess Views on a phone. On a phone today the lesson screen stacks the board, the view
picker, ◀ ▶, the move list, and only then the step card. The child often cannot see what the app is asking.
Measured at 390×844:
- In Mat szkolny the step text starts at 716 px.
- In Lasker's game it starts at 844 px, just off the screen, so a find-the-move task is not visible at all.
- Next is always off the screen, in a different place from ◀ ▶.

The fix: the child reads the instruction first. Then the child pulls the board up over it, and that pull
counts as "I've read it" (Rozumiem). On the board screen everything the child presses sits in one bar at
the bottom, and the button to press now is highlighted.

**Success:** on a phone, the instruction is fully visible when a step opens. After the pull, the board, the
question's answers and the bottom bar are all on screen without scrolling.

## Goals

- **Instruction screen.** A step opens on its full text. Under the text sit the find-the-move task line, the
  play hint and the small ◀ Wstecz. The board's top edge peeks from the bottom of the screen.
- **The board's top edge.** It carries a handle: **"✓ Rozumiem · pociągnij planszę ⌃"**.
  - The child drags it up, or taps it, and the board sheet slides up over the instruction, like a drawer.
  - A short "✓ Rozumiem!" appears for a moment.
  - After a reading pause the edge glows yellow and nudges up and down. The pause is about one second per
    line of text: 1 s minimum, 5 s maximum. Before that the edge is visible and still. The handle works at
    any time; the pause only stops the app hurrying the child.
- **Board screen.** From the top down:
  - A one-line strip with ⌄. It shows the question's prompt when the step has one, else the start of the
    step text. Tapping it, or dragging down, slides the sheet back to the instruction.
  - The board.
  - The step's action area: answer buttons, the tap hint, right or wrong lines, the find-the-move status with
    Pokaż odpowiedź, and confetti.
  - The view picker, legend, and show/hide pieces.
  - The move list.
  - Then the **dock**, fixed at the bottom of the screen: ◀ ▶ and "Ruch n z m" when the step is from a game,
    then Dalej / Zakończ ✓ on the right.
- **The highlight.** The dock highlights the one control to press now:
  - ▶ while a playTo step waits.
  - Dalej when it is open.
  - Nothing while a question or task is open, because the action is then on the board or in the answers.
- **New steps.** Every new step, through Dalej or Wstecz, opens on its instruction screen again.
- **Recognise rounds** use the same screen, since they share RunScreen.

## Non-goals

- The laptop and tablet layout at `md` (768 px) and wider stays as it is: two columns with the card on the
  right.
- No change to lesson content, the run logic (gates, playTo) or the free board screen.
- No new saved state. Whether the sheet is up lives only in the component's memory, and nothing reaches
  localStorage.

## Anti-goals (a failure even if it works)

- **The pull fights the board.** A drag on the squares must never move the sheet: the sheet moves only from
  the handle (resting) or the top strip (up). Find-the-move and tap questions take taps on the squares.
- **Reading is forced.** No lock, no timer that blocks; the pause only delays the glow.
- **Motion for children who asked for none.** Under `prefers-reduced-motion` there is no nudge and no
  glow pulse, and the sheet jumps instead of sliding. tokens.css already strips animations globally; the
  drag must still work.
- **The board jumps between steps on the board screen.** Its position on that screen is the same on every step.

## Approaches considered

1. **A fixed bottom bar only:** board, card, bar. Next is always visible, but the text is still below the
   board and often cut.
2. **Instruction above the board:** like Lichess puzzles, which work because their prompt is one line. Here
   steps have 2–4 sentences plus questions, so the board would jump and get pushed off screen.
3. **The instruction collapses to one line on the child's first action.** This was close, but nothing
   confirms the child read the text.
4. **Two snap-scrolled screens with a "⬇ Do planszy" button:** works, but the user wanted something more
   inviting than a button.
5. **Chosen: the board sheet peeks and glows, and pulling it is the Rozumiem.** The child is curious, the
   pull is the confirmation, and it is the same gesture as the snap scroll in (4). Sideways slides were
   rejected because a sideways drag would fight moves played on the full-width board.

Research behind this:
- Lichess mobile: puzzles have the prompt above the board and a fixed bottom bar. Interactive lessons
  ("gamebook") have the comment under the board and a bottom bar whose buttons change with the state, with
  Next blinking.
- Chess.com Game Review: Next sits bottom right, and users complain about a coach bubble that covers the
  screen.
- Children's design guides: key buttons at the bottom, always in the same place, with large targets.

## Decided

- Phone only, below `md`.
- The handle text is "✓ Rozumiem · pociągnij planszę ⌃" (en: "✓ Got it · pull the board up ⌃"). The flash
  is "✓ Rozumiem!" ("✓ Got it!").
- Reading pause: about 1 s per line (estimated from text length), clamped to 1–5 s.
- The sheet goes up when the drag passes a third of the distance, or on a quick flick, or on a tap. Otherwise
  it springs back. The same rule applies downward.
- ◀ Wstecz to the previous step lives on the instruction screen, not in the dock.
- Dalej and Wstecz go to a step that opens on its instruction.
- **Dalej exists only in the dock, on every step.** On a look-only step the child pulls the board up (Rozumiem, I read it), looks, and presses Dalej (I looked). The instruction screen has no forward button. *(User's choice.)*
- *(Builder's call.)* **Question prompt.**
  - On the instruction screen the prompt is shown in full, in bold, under the step text.
  - On the board screen it is shown in full again, above the answers in the action area, because that is what
    is being answered there.
  - The strip always shows the start of the step text, so the prompt is not shown twice on one screen.
  - Recognise rounds rely on this, because their step text is only "Plansza n z m".
- *(Builder's call.)* **TopBar.** When the sheet is up it covers the TopBar. The strip carries ⌄, the
  one-line text, and the "n/m" counter on the right. To leave the lesson, the child goes back to the
  instruction screen, where the TopBar's ◀ is.
- *(Builder's call.)* **Short phones** (375×667, 360×640):
  - The board is sized to fit: min(width, screen height − strip − dock − about 120 px reserved for answers).
  - The area between the strip and the dock scrolls on its own if it still overflows. The picker and move
    list are allowed below the fold there.
  - That inner scroll never moves the sheet, because only the strip drags it down.
  - Required fit: on 390×844 and 360×640, the board, the answers and the dock are all visible.

## Left to the builder

- Implementation of the drag: pointer events on the handle or strip, and CSS transforms.
- Exact sizes. Keep the dock buttons at least 48 px tall, and keep the peeking edge, handle included,
  at about 120–130 px.
- **Accessibility.** The handle and strip are real buttons: "Rozumiem, pokaż planszę" and "Pokaż instrukcję".
  Focus moves to the board screen after the pull and back to the text after the return. The hidden panel is
  `inert`.
- The Kredki look of the new pieces: wobbly outlines through the existing button rules.
- Tests:
  - jsdom: the sheet state, resets on a step change, the highlight rules, and the buttons.
  - Playwright on the phone: the text is in the viewport when a step opens, and after the pull the board,
    the answers and the dock are in the viewport. A drag on the board does not move the sheet. The laptop
    layout is unchanged.
