# Kredki (crayons) theme — design

Date: 2026-11-26. Status: approved look (mockup "Zeszyt", texture level 1); doc awaiting approval.

## Intent
The user's child (8) learns chess with Chess Views. The user wants the kids' look to be a full
immersion in wax crayons ("kredki świecowe"): the app should feel like the child's own colouring
notebook, not a generic app. Success: the child sees it and recognises "crayons" everywhere —
home, rooms, lessons, the board — while reading and playing stay as easy as today.

## Goals
- A new look **Kredki** next to Kolorowy / Spokojny / Prosty, with a light and a dark mode.
- Light = **Zeszyt** (lined notebook page, red margin, bright crayon fills).
  Dark = **Czarny karton** (black construction paper, bright crayons, light board).
- Crayon everywhere around the content: page background, buttons, chips, cards' outlines, the board
  (squares, frame), and the board's drawn marks (roads, territory, focus rings, blocks, houses).
- New kids profiles start on Kredki. Picking the age "8–12" in Settings also picks Kredki.

## Non-goals
- No new screens or layouts (approach 2, a separate kids' front, was rejected for now).
- No crayon-drawn piece set: pieces stay the existing crisp cburnett images (user: "figury bardziej ostre").
- No change to the other three looks.

## Anti-goals (a failure even if it "works")
- Noise: the first mockup's grain was "za dużo szumu". Texture is level 1: soft horizontal streaks,
  few gaps, no speckle. Lesson cards are smooth inside; only their outline is crayon.
- Pieces, square names and text blurred or wobbly. Only fills, outlines and marks get the crayon effect.
- Marks drawn over pieces: pieces stay above roads/territory marks (user: "nad strzałkami").
- A slow phone: if the texture makes scrolling or moving pieces janky, the texture is simplified
  (first on the board) before anything else.

## Constraints (existing rules that still hold)
- Text on surfaces, cards and accent buttons: contrast ≥ 4.5. Focus ring ≥ 3 against surface and card.
- Board dark squares: relative luminance > 0.45 (black pieces readable); the board stays light in both modes.
- The board marks keep their meaning and colours (white roads vs black roads, good/bad, focus, house).
- The e2e theme test measures `background-color` of real elements; each element keeps its solid
  colour as its background, the crayon texture is an overlay on top of it (so measurements stay true).
- No external requests at runtime: the handwriting font is bundled (latin-ext for Polish letters).
- Reduced motion respected (the theme has no animation anyway).
- Saved data: `theme.family` gains the value `crayons`; profile import/repair accepts it.

## Approaches (picked: 1)
1. **A theme (picked).** Tokens for colours + a small crayon layer (SVG filters and CSS) switched on
   by `data-family="crayons"`. Same screens; every future feature gets the look for free.
2. A separate kids' front-end on the same core: most freedom, but two UIs to maintain. Rejected for now;
   a crayon-only screen (e.g. a notebook-cover home) can still be added later inside approach 1.

## Look (from the approved mockup, docs/superpowers/specs/2026-11-26-crayons-mock.html, `?n=1`)
- **Zeszyt (light):** paper #fffefa with lines #dceaf8 every 28px and a margin line #f6c9c9;
  ink #23305c, soft ink #5a6a9a, title pink #e0306b; board light #fff7cf, dark #8ccaf5;
  outline #23305c; accent (main button) #f23c7a with white text; quiet buttons yellow #ffe066;
  chips green #7bd389. Roads keep their meaning (white = orange-brown family, black = violet family).
- **Czarny karton (dark):** paper #1f1d2b with a faint dot grain; ink #fbf7ff; title yellow #ffe14d;
  board light #fff4d6, dark #c3a6f7; accent green #3ee08f with dark text; quiet pink #ff8fc7; chips blue #5ccfff.
- Exact values may move to pass the contrast/luminance rules; the feel must stay.
- **Crayon fill:** SVG filter = fractal noise (base frequency ≈ 0.5 × 0.08) mapped to alpha
  (coverage ≈ 1.75 − 1.1·noise), composited over the solid colour, plus a small displacement
  (≈ 5px) for a wobbly edge. Lines/roads: same idea with a stroke texture, round caps.
- **Outlines:** 3px crayon outline with a slight wobble on buttons, cards, the board frame.
- **Type:** a handwriting face (mockup: Patrick Hand) for titles (h1/h2) and small labels/chips only;
  body text stays Nunito.

## Decided by the user
- Approach 1; Zeszyt for light; texture level 1; crisp pieces above the marks.

## My calls (the user can override)
- Czarny karton as the dark mode (proposed, not explicitly confirmed).
- Kredki becomes the kids' default; the current kids look (Kolorowy) stays selectable; existing
  profiles keep their saved look.
- Handwriting only in headings and labels.
- "Pieces above the marks" means the lesson marks (roads, territory, focus rings, blocks, houses), as
  in the mockup. The free board's engine arrows keep today's layering (drawn over pieces) in every
  look; in Kredki they only get the crayon stroke.
- Kredki is a look anyone can pick (like the other looks), with its own corner radius, text size and
  shadow (start from Kolorowy's values). The look is separated from the age in the schema:
  `theme.family` becomes its own enum `kids | teens | adults | crayons`. Picking the age 8–12 sets
  Kredki; 12–16 and adults keep today's mapping. Profile repair falls back to the age's default look.
- Screens shown before any profile exists (first start, player picker) also use Kredki.

## Left to the builder
- How the overlay is attached (pseudo-elements vs. a wrapper), filter tuning per element size,
  how board layers get the stroke texture, and the performance check method on a phone-sized viewport.
