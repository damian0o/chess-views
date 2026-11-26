import { ProfileSchema, ProfileV1Schema, type AgeBand, type Profile, type ThemeFamily } from '../types';

/** The look a new player of this age starts with: Kredki for 8–12, the age's own look otherwise. */
export function lookForAge(age: AgeBand): ThemeFamily {
  return age === 'kids' ? 'crayons' : age;
}

/**
 * A stored profile of any known version as the current one, or null when it is not a profile at all.
 * A profile with a known version and an id but a bad field keeps every good field; each bad one falls
 * back to its default, so one broken setting never hides a child's player and progress.
 */
export function migrateProfile(raw: unknown): Profile | null {
  const v2 = ProfileSchema.safeParse(raw);
  if (v2.success) return v2.data;
  const v1 = ProfileV1Schema.safeParse(raw);
  if (v1.success) return { ...v1.data, version: 2, avatar: 'violet' };
  return repair(raw);
}

function repair(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if ((r.version !== 1 && r.version !== 2) || typeof r.id !== 'string' || !r.id) return null;
  const S = ProfileSchema.shape;
  const pick = <T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } }, v: unknown, fallback: T): T => {
    const p = schema.safeParse(v);
    return p.success ? p.data : fallback;
  };
  const age = pick(S.age, r.age, 'kids');
  const theme = (r.theme && typeof r.theme === 'object' ? r.theme : {}) as Record<string, unknown>;
  const progress: Profile['progress'] = {};
  if (r.progress && typeof r.progress === 'object' && !Array.isArray(r.progress)) {
    const entry = S.progress.valueType;
    for (const [k, v] of Object.entries(r.progress)) { const p = entry.safeParse(v); if (p.success) progress[k] = p.data; }
  }
  const name = pick(S.name, r.name, undefined);
  const out = {
    version: 2 as const, id: r.id, ...(name ? { name } : {}), age,
    experience: pick(S.experience, r.experience, 'basic'),
    locale: pick(S.locale, r.locale, 'pl'),
    theme: { family: pick(S.theme.shape.family, theme.family, lookForAge(age)), mode: pick(S.theme.shape.mode, theme.mode, 'system') },
    pieceStyle: pick(S.pieceStyle, r.pieceStyle, 'images'),
    ...(typeof r.squareNames === 'boolean' ? { squareNames: r.squareNames } : {}),
    progress,
    unlockedLayers: pick(S.unlockedLayers, r.unlockedLayers, ['pieces']),
    avatar: pick(S.avatar, r.avatar, 'violet'),
  };
  const p = ProfileSchema.safeParse(out);
  return p.success ? p.data : null;
}
