/**
 * Profiles in browser storage: one record { profiles: { [id]: Profile } } under one key.
 * Every read is validated; anything unreadable behaves as absent, and a storage that throws
 * (blocked, private mode) behaves as empty with writes dropped. Loading never throws.
 */
import { ProfileSchema, type AgeBand, type Avatar, type Locale, type Profile } from '../types';
import { migrateProfile } from './migrate';
import { EXPORT_FORMAT, type ProfileStore, type ProfileSummary, type StorageLike } from './store';

type Record_ = { profiles: Record<string, unknown> };

let counter = 0;
/** A random id; plain http pages have no crypto.randomUUID, so fall back to time + randomness. */
const newId = (): string => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  counter += 1;
  return `p-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export function defaultProfile(opts: { name?: string; age?: AgeBand; locale?: Locale; avatar?: Avatar } = {}): Profile {
  const age = opts.age ?? 'kids';
  return {
    version: 2, id: newId(), ...(opts.name ? { name: opts.name } : {}), age, experience: 'basic', locale: opts.locale ?? 'pl',
    theme: { family: age, mode: 'system' }, pieceStyle: 'images', progress: {}, unlockedLayers: ['pieces'], avatar: opts.avatar ?? 'violet',
  };
}

/** Whether boards show each square's name: the player's choice, else on for 8–12. */
export function showsSquareNames(p: Pick<Profile, 'age' | 'squareNames'>): boolean {
  return p.squareNames ?? p.age === 'kids';
}

export function createLocalProfileStore(storage: StorageLike, key = 'chess-views:profiles'): ProfileStore {
  const read = (): Record_ => {
    try {
      const raw = storage.getItem(key);
      const data: unknown = raw ? JSON.parse(raw) : null;
      if (data && typeof data === 'object' && !Array.isArray(data) && 'profiles' in data
        && data.profiles && typeof data.profiles === 'object' && !Array.isArray(data.profiles)) return data as Record_;
    } catch { /* unreadable: treat as empty */ }
    return { profiles: {} };
  };
  const write = (data: Record_) => { try { storage.setItem(key, JSON.stringify(data)); } catch { /* storage unavailable */ } };
  const valid = (v: unknown): Profile | null => migrateProfile(v);

  const store: ProfileStore = {
    async list() {
      return Object.values(read().profiles).map(valid).filter((p): p is Profile => p !== null)
        .map((p): ProfileSummary => ({ id: p.id, ...(p.name ? { name: p.name } : {}), age: p.age, avatar: p.avatar }));
    },
    async load(id) { return valid(read().profiles[id]); },
    async save(profile) {
      const p = ProfileSchema.parse(profile);
      const data = read(); data.profiles[p.id] = p; write(data);
    },
    async remove(id) { const data = read(); delete data.profiles[id]; write(data); },
    async export(id) {
      const p = await store.load(id);
      if (!p) throw new Error(`no profile ${id}`);
      return new Blob([JSON.stringify({ format: EXPORT_FORMAT, version: 1, profile: p }, null, 2)], { type: 'application/json' });
    },
    async import(file) {
      let parsed: unknown;
      try { parsed = JSON.parse(await file.text()); } catch { parsed = null; }
      const env = parsed as { format?: unknown; profile?: unknown } | null;
      const p = env && env.format === EXPORT_FORMAT ? valid(env.profile) : null;
      if (!p) throw new Error('This file is not a Chess Views profile');
      const copy = { ...p, id: newId() };
      await store.save(copy);
      return copy;
    },
  };
  return store;
}
