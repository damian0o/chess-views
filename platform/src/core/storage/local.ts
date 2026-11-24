/**
 * Profiles in browser storage: one record { profiles: { [id]: Profile } } under one key.
 * Every read is validated; anything unreadable behaves as absent, and a storage that throws
 * (blocked, private mode) behaves as empty with writes dropped. Loading never throws.
 */
import { ProfileSchema, type Profile } from '../types';
import { EXPORT_FORMAT, type ProfileStore, type ProfileSummary, type StorageLike } from './store';

type Record_ = { profiles: Record<string, unknown> };

const newId = (): string => globalThis.crypto.randomUUID();

export function defaultProfile(): Profile {
  return {
    version: 1, id: newId(), age: 'kids', experience: 'basic', locale: 'pl',
    theme: { family: 'kids', mode: 'system' }, pieceStyle: 'images', progress: {}, unlockedLayers: ['pieces'],
  };
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
  const valid = (v: unknown): Profile | null => { const r = ProfileSchema.safeParse(v); return r.success ? r.data : null; };

  const store: ProfileStore = {
    async list() {
      return Object.values(read().profiles).map(valid).filter((p): p is Profile => p !== null)
        .map((p): ProfileSummary => ({ id: p.id, ...(p.name ? { name: p.name } : {}), age: p.age }));
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
