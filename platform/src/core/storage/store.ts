import type { AgeBand, Profile } from '../types';

export interface ProfileSummary { id: string; name?: string; age: AgeBand }

/** Where profiles live. Local now; a remote service later through the same interface. */
export interface ProfileStore {
  list(): Promise<ProfileSummary[]>;
  load(id: string): Promise<Profile | null>;
  save(profile: Profile): Promise<void>;
  remove(id: string): Promise<void>;
  export(id: string): Promise<Blob>;
  import(file: Blob): Promise<Profile>;
}

/** The subset of the Web Storage API the local store needs (the page passes localStorage; tests pass a fake). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const EXPORT_FORMAT = 'chess-views-profile';
