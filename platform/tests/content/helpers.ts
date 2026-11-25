import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Write a content tree { 'pl/patterns/x.md': '…' } into a fresh temp directory and return its path. */
export function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'cv-content-'));
  for (const [rel, text] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
  return root;
}

export const LIBRARY = `- id: scholar-threat
  tags: [opening]
  room: patterns
  family: [f7-attack]
  source: { kind: fen, fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3" }
`;
export const LIB_WORDS = (name: string) => `scholar-threat:
  name: ${name}
  note: Qxf7 is coming.
`;

/** A small valid lesson; `swap` replaces text to break it on purpose. */
export function lesson(locale: 'pl' | 'en', swap: Record<string, string> = {}): string {
  const say = locale === 'pl' ? 'Trzy ruchy białych.' : 'Three White moves.';
  let text = `---
id: mini
group: { kind: pattern, id: f7-attack }
title: ${locale === 'pl' ? 'Mini' : 'Mini'}
about: ${locale === 'pl' ? 'Krótka lekcja.' : 'A short lesson.'}
game: ${locale === 'pl' ? 'Mat szkolny' : "Scholar's mate"}
experience: basic
pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#"
moments:
  attack: { name: ${locale === 'pl' ? 'atak' : 'the attack'}, ply: 5 }
  mate: { name: ${locale === 'pl' ? 'mat' : 'the mate'}, ply: 7 }
---

## look {scene: board, ply: 5, moment: attack}

::: kids
${say}
:::

::: adults
Short.
:::

## roads {scene: board+roads, same: true, focus: f7}

::: kids
Roads.
:::

? Which square?
- e5
- [x] f7
- f2
! Yes, f7.

## tap-it {scene: board, same: true}

::: kids
Tap.
:::

? Tap the square. {tap: f7}

## from-library {scene: board+territory, pos: scholar-threat}

::: kids
From the library.
:::

## is-attack {moment: attack}

::: kids
Blocks.
:::

? Is this the attack? {recall: attack, answer: yes}

## not-mate {ply: 5, moment: mate}

::: kids
Another.
:::

? Is this the mate? {recall: mate, answer: no}

## strike {scene: board, ply: 6, solve: Find the strike}

::: kids
Find it.
:::
`;
  for (const [a, b] of Object.entries(swap)) {
    if (!text.includes(a)) throw new Error(`fixture has no "${a}"`);
    text = text.replace(a, b);
  }
  return text;
}

export const valid = (extra: Record<string, string> = {}) => tree({
  'library.yaml': LIBRARY,
  'pl/library.yaml': LIB_WORDS('Groźba'),
  'en/library.yaml': LIB_WORDS('Threat'),
  'pl/patterns/f7-attack/mini.md': lesson('pl'),
  'en/patterns/f7-attack/mini.md': lesson('en'),
  ...extra,
});
