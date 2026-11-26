import { describe, expect, test } from 'vitest';
import { createLocalProfileStore, defaultProfile, lookForAge, migrateProfile, type StorageLike } from '@core/storage/index';
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
    expect([p.locale, p.age, p.experience, p.theme.family, p.theme.mode, p.pieceStyle]).toEqual(['pl', 'kids', 'basic', 'crayons', 'system', 'images']);
    expect(p.unlockedLayers).toEqual(['pieces']);
  });
});

describe('the Kredki look', () => {
  test('each age gets its own default look: 8–12 Kredki', () => {
    expect(['kids', 'teens', 'adults'].map((a) => defaultProfile({ age: a as never }).theme.family)).toEqual(['crayons', 'teens', 'adults']);
    expect(lookForAge('kids')).toBe('crayons');
  });
  test('a saved Kolorowy profile stays Kolorowy', () => {
    const p = { ...defaultProfile(), theme: { family: 'kids', mode: 'dark' } };
    expect(migrateProfile(p)!.theme.family).toBe('kids');
  });
  test('an unknown look is repaired to the age default', () => {
    const p = { ...defaultProfile({ age: 'kids' }), theme: { family: 'foo', mode: 'light' } };
    expect(migrateProfile(p)!.theme).toEqual({ family: 'crayons', mode: 'light' });
  });
  test('crayons is a valid look', () => {
    expect(ProfileSchema.safeParse({ ...defaultProfile({ age: 'adults' }), theme: { family: 'crayons', mode: 'system' } }).success).toBe(true);
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
    ['no id', JSON.stringify({ profiles: { a: { ...defaultProfile(), id: '' } } })],
    ['a wrong shape', JSON.stringify([1, 2, 3])],
  ])('%s: load gives null and list skips it, without throwing', async (_name, raw) => {
    const s = createLocalProfileStore(memory({ [KEY]: raw }));
    await expect(s.load('a')).resolves.toBeNull();
    await expect(s.list()).resolves.toEqual([]);
  });

  test('a throwing storage reads as empty, and a save says it failed', async () => {
    const s = createLocalProfileStore(throwing);
    await expect(s.list()).resolves.toEqual([]);
    await expect(s.save(defaultProfile())).rejects.toThrow();
    await expect(s.load('x')).resolves.toBeNull();
  });

  test('one bad field does not hide the player: it falls back to its default and the rest is kept', async () => {
    const p = { ...defaultProfile({ name: 'Ola' }), id: 'a', age: 'toddler', theme: { family: 'kids', mode: 'neon' },
      progress: { 'scholars-mate': { reachedStep: 's05', done: false } } };
    const s = createLocalProfileStore(memory({ [KEY]: JSON.stringify({ profiles: { a: p } }) }));
    const loaded = await s.load('a');
    expect(loaded).not.toBeNull();
    expect([loaded!.name, loaded!.age, loaded!.theme.mode]).toEqual(['Ola', 'kids', 'system']);
    expect(loaded!.progress['scholars-mate']?.reachedStep).toBe('s05');
    expect(ProfileSchema.safeParse(loaded).success).toBe(true);
    expect((await s.list()).map((x) => x.name)).toEqual(['Ola']);
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

