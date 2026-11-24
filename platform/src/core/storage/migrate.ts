import type { Profile } from '../types';

/**
 * The proof of concept stored { [lessonId]: { step: number, done: boolean } } under
 * `chess-views:lessons`. Step n becomes the lesson's n-th step id; a number past the end becomes the
 * last id; lessons the platform no longer has, and malformed records, are dropped.
 */
export function migratePocProgress(raw: unknown, stepIds: Record<string, string[]>): Profile['progress'] {
  const out: Profile['progress'] = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [lesson, rec] of Object.entries(raw as Record<string, unknown>)) {
    const ids = stepIds[lesson];
    const r = rec as { step?: unknown; done?: unknown } | null;
    if (!ids?.length || !r || !Number.isInteger(r.step) || (r.step as number) < 1) continue;
    out[lesson] = { reachedStep: ids[Math.min(r.step as number, ids.length) - 1]!, done: r.done === true };
  }
  return out;
}
