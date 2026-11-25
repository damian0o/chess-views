import { describe, expect, test } from 'vitest';
import { createLocalProfileStore, defaultProfile, migratePocProgress, type StorageLike } from '@core/storage/index';
import { ProfileSchema } from '@core/types';

const memory = (init: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => (k in data ? data[k]! : null), setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
};
const throwing: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
const KEY = 'chess-views:profiles';

describe('defaultProfile', () => {
  test('is a valid Polish kids profile with pieces unlocked', () => {
    const p = defaultProfile();
    expect(ProfileSchema.safeParse(p).success).toBe(true);
    expect([p.locale, p.age, p.experience, p.theme.family, p.theme.mode, p.pieceStyle]).toEqual(['pl', 'kids', 'basic', 'kids', 'system', 'images']);
    expect(p.unlockedLayers).toEqual(['pieces']);
  });
});

describe('LocalProfileStore', () => {
  test('save, load, list, remove', async () => {
    const s = createLocalProfileStore(memory());
    const p = { ...defaultProfile(), id: 'kid-1', name: 'Ola' };
    await s.save(p);
    expect(await s.load('kid-1')).toEqual(p);
    expect(await s.list()).toEqual([{ id: 'kid-1', name: 'Ola', age: 'kids', avatar: 'violet' }]);
    await s.remove('kid-1');
    expect(await s.load('kid-1')).toBeNull();
  });

  // Review Focus 1: whatever is stored, loading never throws
  test.each([
    ['not json', 'not json'],
    ['an older version', JSON.stringify({ profiles: { a: { version: 0, id: 'a' } } })],
    ['a bad age', JSON.stringify({ profiles: { a: { ...defaultProfile(), id: 'a', age: 'toddler' } } })],
    ['a wrong shape', JSON.stringify([1, 2, 3])],
  ])('%s: load gives null and list skips it, without throwing', async (_name, raw) => {
    const s = createLocalProfileStore(memory({ [KEY]: raw }));
    await expect(s.load('a')).resolves.toBeNull();
    await expect(s.list()).resolves.toEqual([]);
  });

  test('a throwing storage behaves as empty and drops writes', async () => {
    const s = createLocalProfileStore(throwing);
    await expect(s.list()).resolves.toEqual([]);
    await expect(s.save(defaultProfile())).resolves.toBeUndefined();
    await expect(s.load('x')).resolves.toBeNull();
  });

  test('one bad profile does not hide the good ones', async () => {
    const good = { ...defaultProfile(), id: 'g' };
    const s = createLocalProfileStore(memory({ [KEY]: JSON.stringify({ profiles: { g: good, b: { nope: 1 } } }) }));
    expect(await s.load('g')).toEqual(good);
    expect((await s.list()).map((x) => x.id)).toEqual(['g']);
  });

  test('export then import gives an equal profile with a new id', async () => {
    const s = createLocalProfileStore(memory());
    const p = { ...defaultProfile(), id: 'kid-1', progress: { 'scholars-mate': { reachedStep: 'attack-houses', done: true } } };
    await s.save(p);
    const blob = await s.export('kid-1');
    const text = await blob.text();
    expect(JSON.parse(text)).toMatchObject({ format: 'chess-views-profile', version: 1 });
    const back = await s.import(blob);
    expect(back.id).not.toBe('kid-1');
    expect({ ...back, id: 'kid-1' }).toEqual(p);
    expect(await s.load(back.id)).toEqual(back);
  });

  test('importing another format is a readable error', async () => {
    const s = createLocalProfileStore(memory());
    await expect(s.import(new Blob([JSON.stringify({ format: 'other' })]))).rejects.toThrow(/not a Chess Views profile/);
    await expect(s.import(new Blob(['garbage']))).rejects.toThrow(/not a Chess Views profile/);
  });
});

describe('migratePocProgress', () => {
  // Review Focus 5
  const ids25 = Array.from({ length: 25 }, (_, i) => `step-${i + 1}`);
  test('step numbers become step ids, done is kept, unknown lessons are dropped', () => {
    expect(migratePocProgress({ 'scholars-mate': { step: 17, done: true }, gone: { step: 1, done: false } }, { 'scholars-mate': ids25 }))
      .toEqual({ 'scholars-mate': { reachedStep: 'step-17', done: true } });
  });
  test('a step past the end maps to the last step; garbage gives nothing', () => {
    expect(migratePocProgress({ 'scholars-mate': { step: 40, done: false } }, { 'scholars-mate': ids25 }))
      .toEqual({ 'scholars-mate': { reachedStep: 'step-25', done: false } });
    expect(migratePocProgress('nope', { 'scholars-mate': ids25 })).toEqual({});
    expect(migratePocProgress({ 'scholars-mate': { step: 'x' } }, { 'scholars-mate': ids25 })).toEqual({});
  });
});
