import { afterEach, describe, expect, test, vi } from 'vitest';
import { migrateProfile, defaultProfile, createLocalProfileStore } from '@core/storage/index';
import { recordStep, finishLesson, resumeStepId } from '@core/lessons/progress';
import { startLesson } from '@core/lessons/run';
import type { Lesson, LessonId, Step } from '@core/types';

const PGN = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';
const step = (id: string, layers: Step['scene']['layers'] = ['pieces']): Step => ({ id, scene: { position: { kind: 'pgn', pgn: PGN, ply: 5 }, base: 'board', layers }, explain: { kids: id } });
const LESSON = { id: 'fx' as LessonId, group: { kind: 'pattern', id: 'p' }, title: 'F', about: { kids: 'x' }, experience: 'basic', moments: [],
  steps: [step('s01'), step('s02', ['pieces', 'roads']), step('s03'), step('s04', ['pieces', 'territory']), step('s05', ['shapes'])] } as Lesson;
const v1 = { version: 1, id: 'kid', age: 'kids', experience: 'basic', locale: 'pl', theme: { family: 'kids', mode: 'system' }, pieceStyle: 'images', progress: { fx: { reachedStep: 's03', done: false } }, unlockedLayers: ['pieces'] };

afterEach(() => vi.unstubAllGlobals());

describe('profile version 2', () => {
  test('migrateProfile: a version 1 profile becomes version 2 with progress kept', () => {
    const p = migrateProfile(v1);
    expect(p).toMatchObject({ version: 2, id: 'kid', avatar: 'violet', progress: { fx: { reachedStep: 's03', done: false } } });
  });
  test('migrateProfile: version 3, garbage and null give null', () => {
    expect(migrateProfile({ ...v1, version: 3 })).toBeNull();
    expect(migrateProfile('nope')).toBeNull();
    expect(migrateProfile(null)).toBeNull();
    expect(migrateProfile({ ...v1, age: 'toddler' })).toBeNull();
  });
  test('LocalProfileStore: a stored version 1 profile loads as version 2', async () => {
    const data: Record<string, string> = { 'chess-views:profiles': JSON.stringify({ profiles: { kid: v1 } }) };
    const store = createLocalProfileStore({ getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: () => {} });
    expect((await store.load('kid'))?.version).toBe(2);
    expect(await store.list()).toEqual([{ id: 'kid', age: 'kids', avatar: 'violet' }]);
  });
  test('defaultProfile takes name, age, locale and avatar', () => {
    expect(defaultProfile({ name: 'Ola', age: 'teens', locale: 'en', avatar: 'green' })).toMatchObject({ version: 2, name: 'Ola', age: 'teens', locale: 'en', avatar: 'green', theme: { family: 'teens', mode: 'system' } });
  });
  test('defaultProfile works without crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {});
    const a = defaultProfile(), b = defaultProfile();
    expect(a.id).toBeTruthy(); expect(a.id).not.toBe(b.id);
  });
});

describe('progress', () => {
  const at = (id: string) => startLesson(LESSON, defaultProfile(), id)!;
  test('recordStep never moves progress backwards', () => {
    let p = recordStep(defaultProfile(), at('s05'));
    p = recordStep(p, at('s03'));
    expect(p.progress.fx).toEqual({ reachedStep: 's05', done: false });
  });
  test("recordStep unlocks the step's layers", () => {
    expect(recordStep(defaultProfile(), at('s02')).unlockedLayers).toContain('roads');
  });
  test('finishLesson marks done and unlocks every layer of the lesson', () => {
    const p = finishLesson(defaultProfile(), LESSON);
    expect(p.progress.fx?.done).toBe(true);
    expect([...p.unlockedLayers].sort()).toEqual(['pieces', 'roads', 'shapes', 'territory']);
    expect(recordStep(p, at('s01')).progress.fx?.done).toBe(true);
  });
  test('resumeStepId returns the saved step, or undefined for a finished or unknown lesson', () => {
    expect(resumeStepId(recordStep(defaultProfile(), at('s04')), LESSON)).toBe('s04');
    expect(resumeStepId(finishLesson(defaultProfile(), LESSON), LESSON)).toBeUndefined();
    expect(resumeStepId(defaultProfile(), LESSON)).toBeUndefined();
  });
});
