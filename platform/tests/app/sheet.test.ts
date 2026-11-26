import { describe, expect, test } from 'vitest';
import { readingPauseMs, sheetAfterDrag, dockHighlight } from '../../src/app/lesson/sheet';
import { startLesson } from '@core/lessons/run';
import { defaultProfile } from '@core/storage/index';
import type { Lesson, LessonId, Step } from '@core/types';

const PGN = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';
const at = (ply: number) => ({ kind: 'pgn' as const, pgn: PGN, ply });
const step = (id: string, extra: Partial<Step> = {}, ply = 5): Step =>
  ({ id, scene: { position: at(ply), base: 'board', layers: ['pieces'] }, explain: { kids: id }, ...extra } as Step);
const lessonOf = (s: Step): Lesson => ({ id: 'fx' as LessonId, group: { kind: 'pattern', id: 'f7' }, title: 'F', about: { kids: 'x' }, experience: 'basic', moments: [], steps: [s, step('after')] } as Lesson);
const kid = { ...defaultProfile(), age: 'kids' as const };

describe('lesson sheet decisions', () => {
  test('reading pause: ~1 s a line of 40 characters, 1–5 s', () => {
    expect(readingPauseMs('x'.repeat(10))).toBe(1000);
    expect(readingPauseMs('x'.repeat(120))).toBe(3000);
    expect(readingPauseMs('x'.repeat(1000))).toBe(5000);
    expect(readingPauseMs('')).toBe(1000);
  });
  test('drag: a third of the way or a flick decides; else it springs back', () => {
    expect(sheetAfterDrag('down', -300, 700, 0)).toBe('up');
    expect(sheetAfterDrag('down', -100, 700, 0)).toBe('down');
    expect(sheetAfterDrag('down', -60, 700, -0.8)).toBe('up');
    expect(sheetAfterDrag('up', 300, 700, 0)).toBe('down');
    expect(sheetAfterDrag('up', 100, 700, 0)).toBe('up');
    expect(sheetAfterDrag('up', 40, 700, 0.9)).toBe('down');
    expect(sheetAfterDrag('down', 200, 700, 0.9)).toBe('down');   // pulling a resting sheet down does nothing
    expect(sheetAfterDrag('down', -20, 700, -5)).toBe('down');    // a flick needs some distance: a jittery tap is not one
  });
  test('dock highlight: ▶ while a playTo step waits, Dalej when open, nothing while a question or task is open', () => {
    const play = startLesson(lessonOf(step('walk', { playTo: 5 }, 0)), kid)!;
    expect(dockHighlight(play)).toBe('play');
    expect(dockHighlight(play.report({ kind: 'ply', ply: 5 }))).toBe('next');
    const ask = startLesson(lessonOf(step('ask', { question: { kind: 'choice', prompt: { kids: 'Which?' }, choices: ['a', 'b'], answer: 0 } })), kid)!;
    expect(dockHighlight(ask)).toBeNull();
    expect(dockHighlight(ask.report({ kind: 'answer', value: 0 }))).toBe('next');
    const solve = startLesson(lessonOf(step('find', { solve: { task: { kids: 'Find' } } }, 6)), kid)!;
    expect(dockHighlight(solve)).toBeNull();
  });
});
