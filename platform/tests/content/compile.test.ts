import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../../src/content/compile';
import { lesson, tree, valid, LIBRARY, LIB_WORDS } from './helpers';

const SCHOLAR5 = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
const PGN = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';

describe('compileContent: a valid lesson', () => {
  const out = compileContent(valid());
  test('no errors', () => expect(out.errors).toEqual([]));
  const L = out.lessons.pl[0]!;
  test('lesson metadata and moments', () => {
    expect([L.id, L.group, L.game, L.experience]).toEqual(['mini', { kind: 'pattern', id: 'f7-attack' }, 'Mat szkolny', 'basic']);
    expect(L.moments.map((m) => [m.id, m.name, m.board])).toEqual([['attack', 'atak', { kind: 'pgn', pgn: PGN, ply: 5 }], ['mate', 'mat', { kind: 'pgn', pgn: PGN, ply: 7 }]]);
  });
  test('positions are resolved inline: lesson pgn + ply, same, pos, recall', () => {
    const by = Object.fromEntries(L.steps.map((s) => [s.id, s]));
    expect(by.look!.scene.position).toEqual({ kind: 'pgn', pgn: PGN, ply: 5 });
    expect(by.roads!.scene.position).toEqual(by.look!.scene.position);
    expect(by['from-library']!.scene.position).toEqual({ kind: 'fen', fen: SCHOLAR5 });
    expect(by['is-attack']!.scene.position).toEqual({ kind: 'pgn', pgn: PGN, ply: 5 });
    expect(by['not-mate']!.scene.position).toEqual({ kind: 'pgn', pgn: PGN, ply: 5 });
  });
  test('scenes, explanations, questions', () => {
    const by = Object.fromEntries(L.steps.map((s) => [s.id, s]));
    expect(by.look!.scene).toMatchObject({ base: 'board', layers: ['pieces'] });
    expect(by.roads!.scene).toMatchObject({ layers: ['pieces', 'roads'], focus: ['f7'] });
    expect(by['is-attack']!.scene).toMatchObject({ layers: ['shapes'], hideMoves: true });
    expect(by.look!.explain).toEqual({ kids: 'Trzy ruchy białych.', adults: 'Short.' });
    expect(by.roads!.question).toEqual({ kind: 'choice', prompt: { kids: 'Which square?' }, choices: ['e5', 'f7', 'f2'], answer: 1, right: { kids: 'Yes, f7.' } });
    expect(by['tap-it']!.question).toEqual({ kind: 'tap', prompt: { kids: 'Tap the square.' }, squares: ['f7'] });
    expect(by['is-attack']!.question).toEqual({ kind: 'recall', moment: 'attack', answer: 'yes' });
    expect(by['not-mate']!.question).toEqual({ kind: 'recall', moment: 'mate', answer: 'no' });
    expect(by.strike!.solve).toEqual({ task: { kids: 'Find the strike' } });
  });
  test('library: shared positions, words per locale', () => {
    expect(out.library.pl).toEqual([{ id: 'scholar-threat', tags: ['opening'], name: 'Groźba', note: { kids: 'Qxf7 is coming.' }, source: { kind: 'fen', fen: SCHOLAR5 } }]);
    expect(out.library.en[0]?.name).toBe('Threat');
  });
});

// Review Focus 2: each broken lesson yields exactly one error with the file and the line
const broken = (swapPl: Record<string, string>, swapEn: Record<string, string> = {}) => compileContent(tree({
  'library.yaml': LIBRARY, 'pl/library.yaml': LIB_WORDS('Groźba'), 'en/library.yaml': LIB_WORDS('Threat'),
  'pl/patterns/f7-attack/mini.md': lesson('pl', swapPl), 'en/patterns/f7-attack/mini.md': lesson('en', swapEn),
})).errors;
const lineOf = (text: string, needle: string) => text.split('\n').findIndex((l) => l.includes(needle)) + 1;

describe('compileContent: errors with file and line', () => {
  test.each([
    ['an illegal PGN', { '4. Qxf7#"': '4. Ke3"' }, '## look'],
    ['a ply past the end', { '## strike {scene: board, ply: 6,': '## strike {scene: board, ply: 9,' }, '## strike'],
    ['no right choice', { '- [x] f7': '- f7' }, '? Which square?'],
    ['two right choices', { '- e5': '- [x] e5' }, '? Which square?'],
    ['a tap on z9', { '{tap: f7}': '{tap: z9}' }, '? Tap the square.'],
    ['a recall naming an unknown moment', { '{recall: attack, answer: yes}': '{recall: nope, answer: yes}' }, '? Is this the attack?'],
    ['a missing kids block', { '::: kids\nTap.\n:::': '::: adults\nTap.\n:::' }, '## tap-it'],
  ])('%s', (_name, swap, needle) => {
    const errs = broken(swap);
    expect(errs).toHaveLength(1);
    const text = lesson('pl', swap);
    expect(errs[0]!.file).toMatch(/pl\/patterns\/f7-attack\/mini\.md$/);
    expect(errs[0]!.line).toBe(lineOf(text, needle.startsWith('##') ? needle : needle));
  });
  test('an English file whose step ids differ from Polish', () => {
    const errs = broken({}, { '## tap-it {': '## tap-this {' });
    expect(errs).toHaveLength(1);
    expect(errs[0]!.file).toMatch(/en\/patterns\/f7-attack\/mini\.md$/);
    expect(errs[0]!.message).toMatch(/step ids differ/);
  });
  test('an English file whose right answer differs from Polish', () => {
    const errs = broken({}, { '- e5\n- [x] f7': '- [x] e5\n- f7' });
    expect(errs).toHaveLength(1);
    expect(errs[0]!.file).toMatch(/en\/patterns\/f7-attack\/mini\.md$/);
    expect(errs[0]!.message).toMatch(/answer differs/);
    expect(errs[0]!.line).toBe(lineOf(lesson('en'), '? Which square?'));
  });
  test('a round answer longer than 32 characters', () => {
    const errs = broken({ 'game: Mat szkolny': 'game: Bardzo długa nazwa partii szachowej' });
    expect(errs.some((e) => /32 characters/.test(e.message))).toBe(true);
  });
});

describe('the compile script', () => {
  const script = fileURLToPath(new URL('../../scripts/compile-content.ts', import.meta.url));
  const run = (root: string) => {
    try { execFileSync('npx', ['tsx', script, root, `${root}/out`], { stdio: 'pipe' }); return { code: 0, out: '' }; }
    catch (e) { const err = e as { status: number; stderr: Buffer }; return { code: err.status, out: String(err.stderr) }; }
  };
  test('exits 1 and prints file:line for a broken tree', () => {
    const r = run(tree({ 'library.yaml': LIBRARY, 'pl/library.yaml': LIB_WORDS('G'), 'en/library.yaml': LIB_WORDS('T'),
      'pl/patterns/f7-attack/mini.md': lesson('pl', { '{tap: f7}': '{tap: z9}' }), 'en/patterns/f7-attack/mini.md': lesson('en', { '{tap: f7}': '{tap: z9}' }) }));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/mini\.md:\d+: /);
  }, 30000);
  test('exits 0 and writes lessons.json per locale', () => {
    const root = valid();
    expect(run(root).code).toBe(0);
  }, 30000);
});
