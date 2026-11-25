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
    expect(by['is-attack']!.question).toEqual({ kind: 'recall', prompt: { kids: 'Is this the attack?' }, moment: 'attack', answer: 'yes' });
    expect(by['not-mate']!.question).toEqual({ kind: 'recall', prompt: { kids: 'Is this the mate?' }, moment: 'mate', answer: 'no' });
    expect(by.strike!.solve).toEqual({ task: { kids: 'Find the strike' } });
  });
  test('library: shared positions, words per locale', () => {
    expect(out.library.pl).toEqual([{ id: 'scholar-threat', tags: ['opening'], name: 'Groźba', note: { kids: 'Qxf7 is coming.' }, source: { kind: 'fen', fen: SCHOLAR5 }, room: 'patterns', family: ['f7-attack'] }]);
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
  test.each([
    ['an unknown step attribute', { '## tap-it {scene: board, same: true}': '## tap-it {scene: board, same: true, colour: red}' }, '## tap-it', /unknown attribute "colour"/],
    ['two positions on one step', { '## from-library {scene: board+territory, pos: scholar-threat}': '## from-library {scene: board+territory, pos: scholar-threat, fen: "8/8/8/8/8/8/8/K6k w - - 0 1"}' }, '## from-library', /only one position/],
    ['an unknown question attribute', { '{tap: f7}': '{tap: f7, hint: x}' }, '? Tap the square.', /unknown attribute "hint"/],
    ['a recall "yes" step with its own position', { '## is-attack {moment: attack}': '## is-attack {moment: attack, ply: 3}' }, '## is-attack', /shows its moment's board/],
    ['a focus that is not a square', { 'same: true, focus: f7}': 'same: true, focus: f9}' }, '## roads', /"f9" is not a square/],
    ['a scene with an unknown view', { '## roads {scene: board+roads,': '## roads {scene: board+rodas,' }, '## roads', /unknown view "rodas"/],
  ])('%s: one error, on its line, said plainly', (_name, swap, needle, message) => {
    const errs = broken(swap, swap);
    const pl = errs.filter((e) => /\/pl\//.test(e.file));
    expect(pl).toHaveLength(1);
    expect(pl[0]!.line).toBe(lineOf(lesson('pl', swap), needle));
    expect(pl[0]!.message).toMatch(message);
  });
  test('a lesson id used by two files', () => {
    const errs = compileContent(valid({ 'pl/patterns/f7-attack/copy.md': lesson('pl') })).errors;
    expect(errs.map((e) => e.message)).toContainEqual(expect.stringMatching(/lesson id "mini" is used twice/));
  });
  test('a looksLike naming a moment that does not exist', () => {
    const errs = broken({ 'mate: { name: mat, ply: 7 }': 'mate: { name: mat, ply: 7, looksLike: [nope/mate] }' },
      { 'mate: { name: the mate, ply: 7 }': 'mate: { name: the mate, ply: 7, looksLike: [nope/mate] }' });
    expect(errs.map((e) => e.message)).toContainEqual(expect.stringMatching(/looksLike "nope\/mate"/));
  });
  test('a file with Windows line endings compiles like any other', () => {
    const crlf = (t: string) => t.replace(/\n/g, '\r\n');
    const out = compileContent(tree({
      'library.yaml': crlf(LIBRARY), 'pl/library.yaml': crlf(LIB_WORDS('Groźba')), 'en/library.yaml': crlf(LIB_WORDS('Threat')),
      'pl/patterns/f7-attack/mini.md': crlf(lesson('pl')), 'en/patterns/f7-attack/mini.md': crlf(lesson('en')),
    }));
    expect(out.errors).toEqual([]);
    expect(out.lessons.pl[0]).toEqual(compileContent(valid()).lessons.pl[0]);
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
  test('a round answer longer than 40 characters', () => {
    const errs = broken({ 'game: Mat szkolny': 'game: Bardzo długa nazwa partii szachowej' });   // 41 with ": mat"
    expect(errs.some((e) => /40 characters/.test(e.message))).toBe(true);
  });
  test('a round answer of up to 40 characters is fine', () => {
    expect(broken({ 'game: Mat szkolny': 'game: Partia w operze', 'name: atak, ply: 5': 'name: poświęcenie skoczka, ply: 5' })).toEqual([]);   // 36
  });
});

describe('rooms and families in content', () => {
  test('a library entry carries its room and families; a lesson its board and families', () => {
    const out = compileContent(valid({}));
    expect(out.errors).toEqual([]);
    expect(out.library.pl[0]).toMatchObject({ id: 'scholar-threat', room: 'patterns', family: ['f7-attack'] });
    const linked = compileContent(tree({
      'library.yaml': LIBRARY, 'pl/library.yaml': LIB_WORDS('Groźba'), 'en/library.yaml': LIB_WORDS('Threat'),
      'pl/patterns/f7-attack/mini.md': lesson('pl', { 'experience: basic': 'experience: basic\nlibrary: scholar-threat\nfamily: [f7-attack]' }),
      'en/patterns/f7-attack/mini.md': lesson('en', { 'experience: basic': 'experience: basic\nlibrary: scholar-threat\nfamily: [f7-attack]' }),
    }));
    expect(linked.errors).toEqual([]);
    expect(linked.lessons.pl[0]).toMatchObject({ library: 'scholar-threat', family: ['f7-attack'] });
  });
  test.each([
    ['no room', '  room: patterns\n', '', /room/],
    ['an unknown room', 'room: patterns', 'room: kitchen', /room "kitchen"/],
    ['an unknown family', 'family: [f7-attack]', 'family: [f9-attack]', /family "f9-attack"/],
  ])('library: %s is an error', (_n, a, b, message) => {
    const errs = compileContent(valid({ 'library.yaml': LIBRARY.replace(a, b) })).errors;
    expect(errs.map((e) => e.message)).toContainEqual(expect.stringMatching(message));
  });
  test('a lesson naming a board that is not in the library is an error', () => {
    const swap = { 'experience: basic': 'experience: basic\nlibrary: nowhere' };
    expect(broken(swap, swap).map((e) => e.message)).toContainEqual(expect.stringMatching(/library entry "nowhere"/));
  });
  test('a lesson whose board or families differ between languages is an error', () => {
    const errs = broken({ 'experience: basic': 'experience: basic\nlibrary: scholar-threat' });
    expect(errs.map((e) => e.message)).toContainEqual(expect.stringMatching(/differ/));
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
