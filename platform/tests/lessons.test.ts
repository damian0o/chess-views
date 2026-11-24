import { describe, expect, test } from 'vitest';
import { sceneFor } from '@core/scene';
import { startLesson } from '@core/lessons/run';
import { unlockedLayers, recordSeen } from '@core/lessons/unlock';
import { defaultProfile } from '@core/storage/index';
import type { Lesson, LessonId, Step, Square } from '@core/types';

const PGN = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';
const at = (ply: number) => ({ kind: 'pgn' as const, pgn: PGN, ply });
const step = (id: string, extra: Partial<Step> = {}, layers: Step['scene']['layers'] = ['pieces']): Step =>
  ({ id, scene: { position: at(5), base: 'board', layers }, explain: { kids: id }, ...extra } as Step);
const LESSON: Lesson = {
  id: 'fx' as LessonId, group: { kind: 'pattern', id: 'f7' }, title: 'Fixture', about: { kids: 'x' }, game: 'Fixture', experience: 'basic',
  moments: [{ id: 'mate' as never, name: 'the mate', board: at(7) }],
  steps: [
    step('look'),
    step('ask', { question: { kind: 'choice', prompt: { kids: 'Which?' }, choices: ['e5', 'f7', 'f2'], answer: 1 } }, ['pieces', 'roads']),
    step('kids-only', { audience: { ages: ['kids'] } }),
    { ...step('find', { solve: { task: { kids: 'Find it' } } }), scene: { position: at(6), base: 'board', layers: ['pieces'] } },
    { ...step('recall', { moment: 'mate' as never, question: { kind: 'recall', moment: 'mate' as never, answer: 'yes' } }), scene: { position: at(7), base: 'board', layers: ['shapes'], hideMoves: true } },
    step('tap', { question: { kind: 'tap', prompt: { kids: 'Tap' }, squares: ['f7' as Square] } }, ['pieces', 'territory']),
  ],
};
const kid = { ...defaultProfile(), age: 'kids' as const };
const adult = { ...defaultProfile(), age: 'adults' as const };
const goto = (id: string, profile = kid) => startLesson(LESSON, profile, id);

describe('sceneFor', () => {
  test('a plain step: position, moves, ply and the requested layer data', () => {
    const s = sceneFor(LESSON.steps[1]!, { answered: false });
    expect(s.fen).toBe('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3');
    expect([s.ply, s.moves.length, s.hideMoves]).toEqual([5, 7, false]);
    expect(s.layers).toEqual(['pieces', 'roads']);
    expect(s.data.roads).toBeDefined(); expect(s.data.territory).toBeUndefined();
  });
  // Review Focus 3
  test('a recall step: blocks only and no moves until answered, then pieces and moves', () => {
    const before = sceneFor(LESSON.steps[4]!, { answered: false });
    expect(before.layers).not.toContain('pieces'); expect(before.moves).toEqual([]); expect(before.hideMoves).toBe(true);
    const after = sceneFor(LESSON.steps[4]!, { answered: true });
    expect(after.layers).toContain('pieces'); expect(after.moves.length).toBe(7); expect(after.hideMoves).toBe(false);
  });
  test('locked layers are hidden while the question is open', () => {
    const s = { ...LESSON.steps[1]!, scene: { ...LESSON.steps[1]!.scene, lockedLayers: ['roads' as const] } };
    expect(sceneFor(s, { answered: false }).layers).toEqual(['pieces']);
    expect(sceneFor(s, { answered: true }).layers).toEqual(['pieces', 'roads']);
  });
});

describe('LessonRun', () => {
  test('starts at the first step; an unknown step id starts at the first step too', () => {
    expect(startLesson(LESSON, kid).step.id).toBe('look');
    expect(startLesson(LESSON, kid, 'no-such-id').step.id).toBe('look');
    expect(startLesson(LESSON, kid).total).toBe(6);
  });
  test('a wrong choice is remembered and keeps the gate; the right one opens it', () => {
    let r = goto('ask');
    expect(r.gate).toEqual({ kind: 'answer' });
    expect(r.next()).toBe(r);                                   // gated: Next does nothing
    r = r.report({ kind: 'answer', value: 0 });
    expect([r.lastAnswer, r.wrong, r.answered, r.gate]).toEqual(['wrong', [0], false, { kind: 'answer' }]);
    r = r.report({ kind: 'answer', value: 1 });
    expect([r.lastAnswer, r.answered, r.gate]).toEqual(['right', true, null]);
  });
  test('Back then Next asks again', () => {
    const r = goto('ask').report({ kind: 'answer', value: 1 }).next().back();
    expect([r.step.id, r.answered, r.wrong, r.gate]).toEqual(['ask', false, [], { kind: 'answer' }]);
  });
  test('the reveal gate comes before the answer gate and opens on a later ply', () => {
    let r = goto('find');
    expect(r.gate).toEqual({ kind: 'reveal' });
    r = r.report({ kind: 'ply', ply: 6 });
    expect(r.gate).toEqual({ kind: 'reveal' });
    r = r.report({ kind: 'ply', ply: 7 });
    expect(r.gate).toBeNull();
  });
  test('a step for kids only is skipped for an adult', () => {
    expect(startLesson(LESSON, adult).total).toBe(5);
    const r = startLesson(LESSON, adult, 'ask').report({ kind: 'answer', value: 1 }).next();
    expect(r.step.id).toBe('find');
  });
  test('recall: 0 is Yes, 1 is No', () => {
    expect(goto('recall').report({ kind: 'answer', value: 1 }).lastAnswer).toBe('wrong');
    expect(goto('recall').report({ kind: 'answer', value: 0 }).answered).toBe(true);
  });
  test('tap answers', () => {
    expect(goto('tap').report({ kind: 'answer', value: 'e5' as Square }).lastAnswer).toBe('wrong');
    expect(goto('tap').report({ kind: 'answer', value: 'f7' as Square }).answered).toBe(true);
  });
  test('layers: only unlocked layers or the step\'s own can be turned on', () => {
    const r = goto('ask').report({ kind: 'layers', on: ['pieces', 'roads', 'kings'] });
    expect(r.layersOn).toEqual(['pieces', 'roads']);
    const p = { ...kid, unlockedLayers: ['pieces' as const, 'kings' as const] };
    expect(startLesson(LESSON, p, 'ask').report({ kind: 'layers', on: ['kings'] }).layersOn).toEqual(['kings']);
  });
  test('the last step: Next stays, done is true once ungated', () => {
    const r = goto('tap').report({ kind: 'answer', value: 'f7' as Square });
    expect(r.done).toBe(true);
    expect(r.next()).toBe(r);
  });
});

describe('unlocking', () => {
  test('recordSeen adds the step\'s layers once', () => {
    const p = recordSeen(recordSeen(kid, LESSON.steps[1]!), LESSON.steps[1]!);
    expect(p.unlockedLayers.sort()).toEqual(['pieces', 'roads']);
  });
  test('a finished lesson unlocks every layer it uses', () => {
    const p = { ...kid, progress: { fx: { reachedStep: 'tap', done: true } } };
    expect([...unlockedLayers(p, [LESSON])].sort()).toEqual(['pieces', 'roads', 'shapes', 'territory']);
    expect([...unlockedLayers(kid, [LESSON])]).toEqual(['pieces']);
  });
});

describe('sceneOfRun follows the viewer ply', () => {
  test('after ▶ on a solve step the scene shows the next position', async () => {
    const { sceneOfRun } = await import('@core/scene');
    const r = goto('find');
    expect(sceneOfRun(r).ply).toBe(6);
    const revealed = r.report({ kind: 'ply', ply: 7 });
    expect(sceneOfRun(revealed).ply).toBe(7);
    expect(sceneOfRun(revealed).fen).not.toBe(sceneOfRun(r).fen);
  });
});

test('sceneOfRun clamps a ply past the end of the game', async () => {
  const { sceneOfRun } = await import('@core/scene');
  expect(sceneOfRun(goto('find').report({ kind: 'ply', ply: 99 })).ply).toBe(7);
});
