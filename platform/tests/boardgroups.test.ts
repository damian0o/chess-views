/** Board groups in the core: compiling looks, the lesson run's rules, unlocking, old profiles. */
import { describe, expect, test } from 'vitest';
import { compileContent } from '../src/content/compile';
import { lesson, tree, LIBRARY, LIB_WORDS } from './content/helpers';
import { startLesson } from '@core/lessons/run';
import { recordSeen, lessonOptions } from '@core/lessons/unlock';
import { defaultProfile } from '@core/storage/index';
import { migrateProfile } from '@core/storage/migrate';
import type { Lesson, LessonId, Step } from '@core/types';

const compile = (swap: Record<string, string>) => compileContent(tree({
  'library.yaml': LIBRARY, 'pl/library.yaml': LIB_WORDS('Groźba'), 'en/library.yaml': LIB_WORDS('Threat'),
  'pl/patterns/f7-attack/mini.md': lesson('pl', swap), 'en/patterns/f7-attack/mini.md': lesson('en', swap),
}));
const ROADS = '## roads {scene: board+roads, same: true, focus: f7}';
const roadsAs = (scene: string, extra = '') => ({ [ROADS]: `## roads {scene: ${scene}, same: true, focus: f7${extra}}` });

describe('compiling a scene into a look', () => {
  test('blocks with roads', () => {
    const out = compile(roadsAs('blocks+roads'));
    expect(out.errors).toEqual([]);
    const s = out.lessons.pl[0]!.steps.find((x) => x.id === 'roads')!;
    expect(s.scene.look).toEqual({ pieces: 'blocks', moves: 'roads' });
    expect(s.scene.hideMoves).toBe(true);
  });
  test('hidden pieces', () => {
    const s = compile(roadsAs('hidden')).lessons.pl[0]!.steps.find((x) => x.id === 'roads')!;
    expect(s.scene.look).toEqual({ pieces: 'hidden' });
  });
  test('two from one group is an error', () => {
    expect(compile(roadsAs('board+roads+reach')).errors[0]?.message).toMatch(/two options from one group: "roads" and "reach"/);
  });
  test('a drawing on the diamond is an error', () => {
    expect(compile(roadsAs('diamond+roads')).errors[0]?.message).toMatch(/"diamond" cannot be combined with drawings/);
  });
  test('an unknown option is an error', () => {
    expect(compile(roadsAs('board+rodas')).errors[0]?.message).toMatch(/unknown option "rodas"/);
  });
  test('locked options', () => {
    const s = compile(roadsAs('board+roads+territory', ', locked: territory')).lessons.pl[0]!.steps.find((x) => x.id === 'roads')!;
    expect(s.scene.look).toEqual({ pieces: 'pieces', moves: 'roads', strategy: 'territory' });
    expect(s.scene.locked).toEqual(['territory']);
  });
});

const PGN = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';
const at = (ply: number) => ({ kind: 'pgn' as const, pgn: PGN, ply });
const step = (id: string, look: Step['scene']['look'], extra: Partial<Step> = {}, scene: Partial<Step['scene']> = {}): Step =>
  ({ id, scene: { position: at(5), look, ...scene }, explain: { kids: id }, ...extra } as Step);
const recallQ = { kind: 'recall', moment: 'mate', answer: 'yes' } as const;
const FX: Lesson = {
  id: 'gx' as LessonId, group: { kind: 'pattern', id: 'f7' }, title: 'G', about: { kids: 'x' }, game: 'G', experience: 'basic',
  moments: [{ id: 'mate' as never, name: 'mate', board: at(7) }],
  steps: [
    step('roads', { pieces: 'pieces', moves: 'roads' }),
    step('recall', { pieces: 'blocks', moves: 'roads' }, { moment: 'mate' as never, question: recallQ as never }, { hideMoves: true }),
    step('lockd', { pieces: 'blocks', moves: 'roads' }, { question: { kind: 'choice', prompt: { kids: '?' }, choices: ['a', 'b'], answer: 0 } }, { hideMoves: true, locked: ['roads'] }),
    step('find', { pieces: 'pieces' }, { solve: { task: { kids: 'Find' } } }, { position: at(6) }),
    step('kings', { pieces: 'pieces', strategy: 'kings' }),
    step('reach', { pieces: 'pieces', moves: 'reach' }),
  ],
};
const open = (id: string) => startLesson(FX, { ...defaultProfile(), age: 'kids' }, id)!;
const mixer = { ...defaultProfile(), age: 'kids' as const, unlocked: ['roads' as const, 'reach' as const, 'kings' as const] };
const openMixer = (id: string) => startLesson(FX, mixer, id)!;

describe('the lesson run on looks', () => {
  test('a step starts with its own look', () => {
    expect(open('roads').look).toEqual({ pieces: 'pieces', moves: 'roads' });
  });
  test('toggling reach replaces roads', () => {
    expect(openMixer('roads').report({ kind: 'toggle', option: 'reach' }).look.moves).toBe('reach');
    expect(open('roads').report({ kind: 'toggle', option: 'reach' }).look.moves).toBe('roads');   // not unlocked yet
  });
  test('a recall step is frozen until answered', () => {
    const r = open('recall');
    expect(r.frozen).toBe(true);
    expect(r.report({ kind: 'toggle', option: 'pieces' }).look).toEqual(r.look);
    expect(r.report({ kind: 'answer', value: 0 }).frozen).toBe(false);
  });
  test('answering a blocks step shows pieces and keeps the child\'s drawing', () => {
    // A non-recall blocks question: the child may switch drawings while it is open.
    const r = openMixer('lockd');
    expect(r.frozen).toBe(true);
    const right = r.report({ kind: 'answer', value: 0 });
    expect(right.look.pieces).toBe('pieces');
    const switched = right.report({ kind: 'toggle', option: 'reach' });
    expect(switched.look).toEqual({ pieces: 'pieces', moves: 'reach' });
  });
  test('answering fills an empty group from the step', () => {
    expect(open('recall').report({ kind: 'answer', value: 0 }).look).toEqual({ pieces: 'pieces', moves: 'roads' });
  });
  test('Review Focus 1: a locked drawing is off while open and back after answering', () => {
    const r = open('lockd');
    expect(r.look.moves).toBeUndefined();
    expect(r.report({ kind: 'answer', value: 0 }).look.moves).toBe('roads');
  });
  test('the engine is locked while a find-the-move task is open', () => {
    const p = { ...defaultProfile(), age: 'kids' as const, unlocked: ['engine' as const] };
    const r = startLesson({ ...FX, steps: FX.steps.map((s) => (s.id === 'find' ? { ...s, scene: { ...s.scene, look: { pieces: 'pieces' as const, engine: true } } } : s)) }, p, 'find')!;
    expect(r.gate?.kind).toBe('reveal');
    expect(r.look.engine).toBeFalsy();
    expect(r.options.find((o) => o.id === 'engine')!.locked).toBe(true);
  });
  test('flip starts from the step and the flip option turns it', () => {
    const r = open('roads');
    expect(r.flip).toBe(false);
    expect(r.report({ kind: 'toggle', option: 'flip' }).flip).toBe(true);
  });
  test('Review Focus 5: after mixing, Next then Back starts from the step\'s own look', () => {
    const mixed = openMixer('roads').report({ kind: 'toggle', option: 'kings' });
    expect(mixed.look.strategy).toBe('kings');
    expect(mixed.next().back().look).toEqual({ pieces: 'pieces', moves: 'roads' });
  });
  test('options: only what the lesson uses, plus the always-allowed ones; not unlocked ones are locked', () => {
    const ids = open('roads').options.map((o) => o.id);
    expect(ids).toEqual(['pieces', 'blocks', 'hidden', 'roads', 'reach', 'kings', 'flip', 'names']);
    const kings = open('roads').options.find((o) => o.id === 'kings')!;
    expect(kings.locked).toBe(true);
    expect(open('kings').options.find((o) => o.id === 'kings')!.locked).toBe(false);
  });
});

describe('unlocking options', () => {
  test('seeing a kings step unlocks kings', () => {
    expect(recordSeen(defaultProfile(), FX.steps[4]!).unlocked).toContain('kings');
  });
  test('lessonOptions of a lesson', () => {
    expect(lessonOptions(FX)).toEqual(['pieces', 'blocks', 'hidden', 'roads', 'reach', 'kings', 'flip', 'names']);
  });
});

describe('old profiles', () => {
  test('Review Focus 2: a v2 profile with old layer names becomes v3', () => {
    const v2 = { version: 2, avatar: 'violet', id: 'p1', age: 'kids', experience: 'basic', locale: 'pl', theme: { family: 'kids', mode: 'system' }, pieceStyle: 'images', progress: {}, unlockedLayers: ['pieces', 'shapes', 'roads'] };
    const p = migrateProfile(v2)!;
    expect(p.version).toBe(3);
    expect(p.unlocked).toEqual(['blocks', 'roads']);
  });
  test('a broken v2 profile is repaired into v3', () => {
    const v2 = { version: 2, id: 'p1', age: 'kids', locale: 'xx', unlockedLayers: ['pieces', 'kings', 'bogus'] };
    const p = migrateProfile(v2)!;
    expect(p.version).toBe(3);
    expect(p.unlocked).toEqual(['kings']);
  });
});
