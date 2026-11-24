import { beforeAll, describe, expect, test } from 'vitest';
import { fileURLToPath } from 'node:url';
import { createAppStore } from '../../src/app/store';
import { compileContent } from '../../src/content/compile';
import type { StorageLike } from '@core/storage/index';

const ROOT = fileURLToPath(new URL('../../content', import.meta.url));
let content: ReturnType<typeof compileContent>;
let stepIds: Record<string, string[]>;
beforeAll(async () => {
  content = compileContent(ROOT);
  stepIds = (await import('../../content/poc-step-ids.json')).default as Record<string, string[]>;
});
const memory = (init: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
};
const make = (storage = memory()) => createAppStore({ storage, lessons: content.lessons, library: content.library, pocStepIds: stepIds });

describe('store', () => {
  test('add then pick a player persists it', async () => {
    const storage = memory();
    const s = make(storage);
    await s.getState().addPlayer({ name: 'Ola', age: 'kids' });
    expect(s.getState().player?.name).toBe('Ola');
    const again = make(storage);
    await again.getState().loadPlayers();
    expect(again.getState().players.map((p) => p.name)).toEqual(['Ola']);
    await again.getState().pickPlayer(again.getState().players[0]!.id);
    expect(again.getState().player?.name).toBe('Ola');
  });
  test('openLesson resumes at the saved step', async () => {
    const storage = memory();
    const s = make(storage);
    await s.getState().addPlayer({ name: 'Ola' });
    await s.getState().openLesson('scholars-mate', 's04-shapes');
    const again = make(storage); await again.getState().loadPlayers(); await again.getState().pickPlayer(s.getState().player!.id);
    await again.getState().openLesson('scholars-mate');
    expect(again.getState().run?.step.id).toBe('s04-shapes');
  });
  test('report + next records progress and never moves it back', async () => {
    const s = make();
    await s.getState().addPlayer({ name: 'Ola' });
    await s.getState().openLesson('scholars-mate', 's03-roads');
    await s.getState().next();
    expect(s.getState().player?.progress['scholars-mate']?.reachedStep).toBe('s04-shapes');
    await s.getState().back();
    expect(s.getState().player?.progress['scholars-mate']?.reachedStep).toBe('s04-shapes');
  });
  test('finishing marks done', async () => {
    const s = make();
    await s.getState().addPlayer({ name: 'Ola' });
    const last = content.lessons.pl.find((l) => l.id === 'scholars-mate')!.steps.at(-1)!.id;
    await s.getState().openLesson('scholars-mate', last);
    await s.getState().next();
    expect(s.getState().player?.progress['scholars-mate']?.done).toBe(true);
    expect(s.getState().run).toBeNull();
    expect(s.getState().toast).toBe('Lekcja skończona');
  });
  test('an unknown lesson id toasts lessonNotHere', async () => {
    const s = make();
    await s.getState().addPlayer({ name: 'Ola' });
    await s.getState().openLesson('nope');
    expect([s.getState().run, s.getState().toast]).toEqual([null, 'Nie ma tej lekcji']);
  });
  test('openRound with nothing finished toasts lessonNotHere', async () => {
    const s = make();
    await s.getState().addPlayer({ name: 'Ola' });
    await s.getState().openRound(5);
    expect([s.getState().run, s.getState().toast]).toEqual([null, 'Nie ma tej lekcji']);
  });
  test('openRound after finishing game lessons builds a round of blocks questions', async () => {
    const s = make();
    await s.getState().addPlayer({ name: 'Ola' });
    for (const id of ['opera-game-lesson', 'legal-mate', 'reti-tartakower', 'lasker-thomas']) {
      const last = content.lessons.pl.find((l) => l.id === id)!.steps.at(-1)!.id;
      await s.getState().openLesson(id, last); await s.getState().next();
    }
    await s.getState().openRound(5);
    expect(s.getState().run?.total).toBe(8);
    expect(s.getState().run?.step.question?.kind).toBe('choice');
  });
  // Review Focus 3
  test('POC progress is migrated into the first player once', async () => {
    const storage = memory({ 'chess-views:lessons': JSON.stringify({ 'scholars-mate': { step: 7, done: false } }) });
    const s = make(storage);
    await s.getState().loadPlayers();
    await s.getState().addPlayer({ name: 'Ola' });
    expect(s.getState().player?.progress['scholars-mate']?.reachedStep).toBe(stepIds['scholars-mate']![6]);
    await s.getState().addPlayer({ name: 'Kuba' });
    expect(s.getState().player?.progress).toEqual({});
  });
  test('updatePlayer saves; removePlayer forgets', async () => {
    const storage = memory();
    const s = make(storage);
    await s.getState().addPlayer({ name: 'Ola' });
    await s.getState().updatePlayer({ age: 'teens' });
    expect(s.getState().player?.age).toBe('teens');
    await s.getState().removePlayer(s.getState().player!.id);
    expect([s.getState().player, s.getState().players]).toEqual([null, []]);
  });
});
