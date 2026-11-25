/** Tests for the final review's findings (I1–I11, M15); each failed before its fix. */
import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneFor, sceneOfRun } from '@core/scene';
import { startLesson } from '@core/lessons/run';
import { defaultProfile } from '@core/storage/index';
import { createWasmStockfish, type WorkerLike } from '@core/engine/wasm';
import { localizeMoves } from '@core/chess/san';
import { compileContent } from '../src/content/compile';
import { lesson, tree, valid, LIBRARY, LIB_WORDS } from './content/helpers';
import type { Fen, Lesson, LessonId, Step } from '@core/types';

const PGN = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';
const at = (ply: number) => ({ kind: 'pgn' as const, pgn: PGN, ply });
const blocksNoQ: Step = { id: 'b', scene: { position: at(5), base: 'board', layers: ['shapes'], hideMoves: true }, explain: { kids: 'x' } };
const recall: Step = { id: 'r', scene: { position: at(7), base: 'board', layers: ['shapes'], hideMoves: true }, explain: { kids: 'x' }, moment: 'mate' as never, question: { kind: 'recall', moment: 'mate' as never, answer: 'yes' } };
const LESSON = { id: 'fx' as LessonId, group: { kind: 'pattern', id: 'p' }, title: 'F', about: { kids: 'x' }, game: 'F', experience: 'basic', moments: [{ id: 'mate', name: 'm', board: at(7) }], steps: [blocksNoQ, recall] } as Lesson;

describe('I1: a blocks step without a question stays blocks', () => {
  test('no pieces, no moves until the child turns pieces on', () => {
    const s = sceneFor(blocksNoQ, { answered: false });
    expect(s.layers).not.toContain('pieces'); expect(s.moves).toEqual([]); expect(s.hideMoves).toBe(true);
    const shown = sceneFor(blocksNoQ, { answered: false, layersOn: ['shapes', 'pieces'] });
    expect(shown.layers).toContain('pieces');
  });
});

describe('I2: layers during an open blocks question', () => {
  test('pieces cannot be turned on while the question is open, and the run and the scene agree', () => {
    const run = startLesson(LESSON, defaultProfile(), 'r')!.report({ kind: 'layers', on: ['shapes', 'pieces'] });
    expect(run.layersOn).toEqual(['shapes']);
    expect(sceneOfRun(run).layers).toEqual(['shapes']);
    const answered = run.report({ kind: 'answer', value: 0 });
    expect(sceneOfRun(answered).layers).toContain('pieces');
  });
  test('locked layers are not on at the start of an open question', () => {
    const s: Step = { id: 'q', scene: { position: at(5), base: 'board', layers: ['pieces', 'roads'], lockedLayers: ['roads'] }, explain: { kids: 'x' }, question: { kind: 'tap', prompt: { kids: 't' }, squares: ['f7' as never] } };
    const run = startLesson({ ...LESSON, steps: [s] }, defaultProfile())!;
    expect(run.layersOn).toEqual(['pieces']);
  });
});

describe('I3: a recall step that shows pieces is a content error', () => {
  test('scene: board on a recall step is rejected', () => {
    const errs = compileContent(tree({ 'library.yaml': LIBRARY, 'pl/library.yaml': LIB_WORDS('G'), 'en/library.yaml': LIB_WORDS('T'),
      'pl/patterns/f7-attack/mini.md': lesson('pl', { '## is-attack {moment: attack}': '## is-attack {scene: board, moment: attack}' }),
      'en/patterns/f7-attack/mini.md': lesson('en', { '## is-attack {moment: attack}': '## is-attack {scene: board, moment: attack}' }) })).errors;
    expect(errs.some((e) => /recall/.test(e.message) && /pieces/.test(e.message))).toBe(true);
  });
  test('sceneFor strips pieces from an open recall step whatever its scene says', () => {
    const bad = { ...recall, scene: { ...recall.scene, layers: ['pieces' as const] } };
    expect(sceneFor(bad, { answered: false }).layers).not.toContain('pieces');
  });
});

describe('I4: the locale comparison compares scenes and step settings', () => {
  const enOnly = (swap: Record<string, string>) => compileContent(tree({ 'library.yaml': LIBRARY, 'pl/library.yaml': LIB_WORDS('G'), 'en/library.yaml': LIB_WORDS('T'),
    'pl/patterns/f7-attack/mini.md': lesson('pl'), 'en/patterns/f7-attack/mini.md': lesson('en', swap) })).errors;
  test.each([
    ['another layer', { '{scene: board+roads, same: true, focus: f7}': '{scene: board+kings, same: true, focus: f7}' }],
    ['another focus', { '{scene: board+roads, same: true, focus: f7}': '{scene: board+roads, same: true, focus: e5}' }],
    ['blocks instead of board', { '## tap-it {scene: board, same: true}': '## tap-it {scene: blocks, same: true}' }],
    ['no solve', { '## strike {scene: board, ply: 6, solve: Find the strike}': '## strike {scene: board, ply: 6}' }],
    ['another moment', { '## look {scene: board, ply: 5, moment: attack}': '## look {scene: board, ply: 5, moment: mate}' }],
    ['ages added', { '## tap-it {scene: board, same: true}': '## tap-it {scene: board, same: true, ages: kids}' }],
    ['another group', { 'group: { kind: pattern, id: f7-attack }': 'group: { kind: pattern, id: other }' }],
  ])('%s in English only is an error', (_n, swap) => {
    expect(enOnly(swap).length).toBeGreaterThan(0);
  });
});

describe('I5: the library is checked', () => {
  const lib = (shared: string, words = LIB_WORDS('G')) => compileContent(tree({ 'library.yaml': shared, 'pl/library.yaml': words, 'en/library.yaml': words })).errors;
  test('a library PGN that does not replay', () => {
    const e = lib('- id: bad\n  tags: [x]\n  source: { kind: pgn, pgn: "1. e4 e5 2. Ke3", ply: 3 }\n', 'bad:\n  name: B\n  note: n\n');
    expect(e.some((x) => /library\.yaml$/.test(x.file) && x.line === 1 && /replay/.test(x.message))).toBe(true);
  });
  test('a ply past the end', () => {
    expect(lib('- id: bad\n  tags: [x]\n  source: { kind: pgn, pgn: "1. e4 e5", ply: 9 }\n', 'bad:\n  name: B\n  note: n\n').some((x) => /beyond/.test(x.message))).toBe(true);
  });
  test('YAML that is not a list, or not YAML, is an error, not a crash', () => {
    expect(lib('id: x\n')[0]?.message).toMatch(/list/);
    expect(lib('- id: [unclosed\n')[0]?.message).toMatch(/YAML/);
  });
  test('a duplicate id and words for an unknown id', () => {
    const shared = `${LIBRARY}${LIBRARY}`;
    expect(lib(shared).some((x) => /twice/.test(x.message))).toBe(true);
    expect(lib(LIBRARY, `${LIB_WORDS('G')}ghost:\n  name: G\n  note: n\n`).some((x) => /ghost/.test(x.message))).toBe(true);
  });
  test('an error points at the entry\'s line', () => {
    const shared = `${LIBRARY}- id: bad\n  tags: [x]\n  source: { kind: pgn, pgn: "1. e4", ply: 5 }\n`;
    const e = lib(shared, `${LIB_WORDS('G')}bad:\n  name: B\n  note: n\n`).find((x) => /beyond/.test(x.message));
    expect(e?.line).toBe(4);
  });
});

type FW = WorkerLike & { sent: string[] };
const fake = (script: (cmd: string, w: FW) => string[] | void, delays: Record<string, number> = {}): FW => {
  const w: FW = { onmessage: null, onerror: null, sent: [], postMessage(cmd: string) {
    w.sent.push(cmd);
    const lines = script(cmd, w) ?? [];
    const d = Object.entries(delays).find(([k]) => cmd.startsWith(k))?.[1] ?? 0;
    for (const l of lines) setTimeout(() => w.onmessage?.({ data: l }), d);
  }, terminate() {} };
  return w;
};
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;
const BLACK = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' as Fen;

describe('I6/I7/I8: engine robustness', () => {
  test('I6: a stop answered too late marks the engine dead instead of answering the next search', async () => {
    let n = 0;
    const eng = createWasmStockfish({ workerFactory: () => fake((cmd) => {
      if (cmd === 'uci') return ['uciok']; if (cmd === 'isready') return ['readyok'];
      if (cmd === 'stop') return ['bestmove a2a3'];
      if (cmd.startsWith('go')) return ++n === 1 ? [] : ['info depth 4 multipv 1 score cp 5 pv e7e5', 'bestmove e7e5'];
    }, { stop: 2500 }) });
    const ctrl = new AbortController();
    const first = eng.analyse(START, { depth: 10 }, ctrl.signal);
    setTimeout(() => ctrl.abort(), 10);
    await expect(first).rejects.toThrow(/aborted/);
    await expect(eng.bestMove(BLACK, { level: 'easy' })).rejects.toThrow(/stopped responding/);
  }, 10000);
  test('I7: after a worker error every later call rejects at once', async () => {
    let w!: FW;
    const eng = createWasmStockfish({ workerFactory: () => (w = fake((cmd) => (cmd === 'uci' ? ['uciok'] : cmd === 'isready' ? ['readyok'] : []))), timeoutMs: 3000 });
    await eng.ready();
    const running = eng.analyse(START, { depth: 10 });
    setTimeout(() => w.onerror?.({}), 10);
    const t0 = Date.now();
    await expect(running).rejects.toThrow(/worker failed/);
    await expect(eng.analyse(START, { depth: 10 })).rejects.toThrow(/worker failed/);
    await expect(eng.ready()).rejects.toThrow(/worker failed/);
    expect(Date.now() - t0).toBeLessThan(500);
  });
  test('I7: dispose rejects a pending search at once', async () => {
    const eng = createWasmStockfish({ workerFactory: () => fake((cmd) => (cmd === 'uci' ? ['uciok'] : cmd === 'isready' ? ['readyok'] : [])) });
    await eng.ready();
    const p = eng.analyse(START, { depth: 10 });
    setTimeout(() => eng.dispose(), 10);
    const t0 = Date.now();
    await expect(p).rejects.toThrow(/disposed/);
    expect(Date.now() - t0).toBeLessThan(500);
  });
  test('I8: an unjudgeable position never reaches the engine', async () => {
    let w!: FW;
    const eng = createWasmStockfish({ workerFactory: () => (w = fake((cmd) => (cmd === 'uci' ? ['uciok'] : cmd === 'isready' ? ['readyok'] : []))) });
    await expect(eng.analyse('8/8/8/8/8/8/8/8 w - - 0 1' as Fen)).rejects.toThrow(/cannot judge/);
    await expect(eng.bestMove('8/8/8/8/8/8/8/8 w - - 0 1' as Fen, { level: 'easy' })).rejects.toThrow(/cannot judge/);
    expect(w.sent.some((c) => c.startsWith('position'))).toBe(false);
  });
});

describe('I9: recall prompts are kept; stray choices are errors', () => {
  test('a recall question keeps its prompt', () => {
    const L = compileContent(valid()).lessons.pl[0]!;
    const q = L.steps.find((s) => s.id === 'is-attack')!.question;
    expect(q).toMatchObject({ kind: 'recall', prompt: { kids: 'Is this the attack?' } });
  });
  test('choices under a tap question are an error', () => {
    const swap = { '? Tap the square. {tap: f7}': '? Tap the square. {tap: f7}\n- a\n- [x] b' };
    const errs = compileContent(tree({ 'library.yaml': LIBRARY, 'pl/library.yaml': LIB_WORDS('G'), 'en/library.yaml': LIB_WORDS('T'),
      'pl/patterns/f7-attack/mini.md': lesson('pl', swap), 'en/patterns/f7-attack/mini.md': lesson('en', swap) })).errors;
    expect(errs.some((e) => /choices/.test(e.message))).toBe(true);
  });
});

describe('I10: moves inside text get the language\'s letters', () => {
  test('Polish', () => {
    expect(localizeMoves('Qxf7, szach-mat. Qe7, Qf6 i Nh6 też działają; O-O-O też.', 'pl')).toBe('Hxf7, szach-mat. He7, Hf6 i Sh6 też działają; O-O-O też.');
    expect(localizeMoves('Bxf7+, Ke7, Nd5: mat. Rd8#, exd8=Q+', 'pl')).toBe('Gxf7+, Ke7, Sd5: mat. Wd8#, exd8=H+');
    expect(localizeMoves('Na polu f7 Bierki. Ruch 3. Qh5', 'pl')).toBe('Na polu f7 Bierki. Ruch 3. Hh5');
    expect(localizeMoves('Qxf7 stays', 'en')).toBe('Qxf7 stays');
  });
});

describe('I11 and M15: content', () => {
  const ROOT = fileURLToPath(new URL('../content', import.meta.url));
  const POC = JSON.parse(readFileSync(new URL('../../positions.json', import.meta.url), 'utf8')) as { lessons: { id: string; steps: unknown[] }[] };
  test('I11: the frozen step-id table has one id per POC step, and every id still exists', () => {
    const table = JSON.parse(readFileSync(join(ROOT, 'poc-step-ids.json'), 'utf8')) as Record<string, string[]>;
    const out = compileContent(ROOT);
    for (const poc of POC.lessons) {
      expect(table[poc.id]?.length, poc.id).toBe(poc.steps.length);
      const ids = new Set(out.lessons.en.find((l) => l.id === poc.id)!.steps.map((s) => s.id));
      for (const id of table[poc.id]!) expect(ids.has(id), `${poc.id}/${id}`).toBe(true);
    }
  });
  test('M15: Polish uses "lekkie figury", not "małe figury"', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
    for (const f of walk(join(ROOT, 'pl'))) expect(readFileSync(f, 'utf8'), f).not.toMatch(/mał(e|ych|ymi) figur/);
  });
});
