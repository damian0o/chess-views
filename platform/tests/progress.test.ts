import { afterEach, describe, expect, test, vi } from 'vitest';
import { migrateProfile, defaultProfile, createLocalProfileStore } from '@core/storage/index';
import { recordStep, finishLesson, resumeStepId } from '@core/lessons/progress';
import { startLesson } from '@core/lessons/run';
import type { Lesson, LessonId, Step } from '@core/types';

const PGN = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';
const step = (id: string, look: Step['scene']['look'] = { pieces: 'pieces' }): Step => ({ id, scene: { position: { kind: 'pgn', pgn: PGN, ply: 5 }, look }, explain: { kids: id } });
const LESSON = { id: 'fx' as LessonId, group: { kind: 'pattern', id: 'p' }, title: 'F', about: { kids: 'x' }, experience: 'basic', moments: [],
  steps: [step('s01'), step('s02', { pieces: 'pieces', moves: 'roads' }), step('s03'), step('s04', { pieces: 'pieces', strategy: 'territory' }), step('s05', { pieces: 'blocks' })] } as Lesson;
const v1 = { version: 1, id: 'kid', age: 'kids', experience: 'basic', locale: 'pl', theme: { family: 'kids', mode: 'system' }, pieceStyle: 'images', progress: { fx: { reachedStep: 's03', done: false } }, unlockedLayers: ['pieces'] };

afterEach(() => vi.unstubAllGlobals());

describe('profile version 3', () => {
  test('migrateProfile: a version 1 profile becomes version 3 with progress kept', () => {
    const p = migrateProfile(v1);
    expect(p).toMatchObject({ version: 3, id: 'kid', avatar: 'violet', unlocked: [], progress: { fx: { reachedStep: 's03', done: false } } });
  });
  test('migrateProfile: version 4, garbage and null give null', () => {
    expect(migrateProfile({ ...v1, version: 4 })).toBeNull();
    expect(migrateProfile('nope')).toBeNull();
    expect(migrateProfile(null)).toBeNull();
  });
  test('migrateProfile: a version 1 profile with a bad age keeps the rest and gets the default age', () => {
    const p = migrateProfile({ ...v1, age: 'toddler' });
    expect([p?.version, p?.id, p?.age]).toEqual([3, v1.id, 'kids']);
  });
  test('LocalProfileStore: a stored version 1 profile loads as version 3', async () => {
    const data: Record<string, string> = { 'chess-views:profiles': JSON.stringify({ profiles: { kid: v1 } }) };
    const store = createLocalProfileStore({ getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: () => {} });
    expect((await store.load('kid'))?.version).toBe(3);
    expect(await store.list()).toEqual([{ id: 'kid', age: 'kids', avatar: 'violet' }]);
  });
  test('defaultProfile takes name, age, locale and avatar', () => {
    expect(defaultProfile({ name: 'Ola', age: 'teens', locale: 'en', avatar: 'green' })).toMatchObject({ version: 3, name: 'Ola', age: 'teens', locale: 'en', avatar: 'green', theme: { family: 'teens', mode: 'system' } });
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
  test("recordStep unlocks the step's options", () => {
    expect(recordStep(defaultProfile(), at('s02')).unlocked).toContain('roads');
  });
  test('finishLesson marks done and unlocks every option of the lesson', () => {
    const p = finishLesson(defaultProfile(), LESSON);
    expect(p.progress.fx?.done).toBe(true);
    expect([...p.unlocked].sort()).toEqual(['roads', 'territory']);
    expect(recordStep(p, at('s01')).progress.fx?.done).toBe(true);
  });
  test('resumeStepId returns the saved step, or undefined for a finished or unknown lesson', () => {
    expect(resumeStepId(recordStep(defaultProfile(), at('s04')), LESSON)).toBe('s04');
    expect(resumeStepId(finishLesson(defaultProfile(), LESSON), LESSON)).toBeUndefined();
    expect(resumeStepId(defaultProfile(), LESSON)).toBeUndefined();
  });
});
