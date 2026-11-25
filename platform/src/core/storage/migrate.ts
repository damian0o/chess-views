import { ProfileSchema, ProfileV1Schema, type Profile } from '../types';

/** A stored profile of any known version as the current one, or null when it is not a valid profile. */
export function migrateProfile(raw: unknown): Profile | null {
  const v2 = ProfileSchema.safeParse(raw);
  if (v2.success) return v2.data;
  const v1 = ProfileV1Schema.safeParse(raw);
  if (v1.success) return { ...v1.data, version: 2, avatar: 'violet' };
  return null;
}

