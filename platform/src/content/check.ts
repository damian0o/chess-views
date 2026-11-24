/**
 * The rule that only words differ between languages: every locale has the same lessons, the same
 * step ids in the same order, the same positions, the same moments and the same right answers.
 * Polish (the default) is the reference; differences are reported in the other locale's file.
 */
import { LOCALES, type Lesson, type Locale, type Question } from '@core/types';
import type { ContentError, Origin } from './compile';

const REFERENCE: Locale = 'pl';

const answerOf = (q: Question | undefined): string => {
  if (!q) return '';
  if (q.kind === 'choice') return `choice:${q.answer}:${q.choices.length}`;
  if (q.kind === 'tap') return `tap:${[...q.squares].sort().join(',')}`;
  return `recall:${q.moment}:${q.answer}`;
};

export function compareLocales(
  lessons: Record<Locale, Lesson[]>, origins: Record<Locale, Map<string, Origin>>, files: Record<Locale, Map<string, string>>, broken: Set<string>,
): ContentError[] {
  const errors: ContentError[] = [];
  const ref = new Map(lessons[REFERENCE].map((l) => [l.id as string, l]));
  const allIds = new Set(LOCALES.flatMap((loc) => [...files[loc].keys()]));
  for (const id of allIds) {
    if (broken.has(id)) continue;
    for (const loc of LOCALES) {
      if (!files[loc].has(id)) {
        const other = LOCALES.find((l) => files[l].has(id))!;
        errors.push({ file: files[other].get(id)!, line: 1, message: `lesson "${id}" has no ${loc} version` });
      }
    }
  }
  for (const loc of LOCALES) {
    if (loc === REFERENCE) continue;
    for (const lesson of lessons[loc]) {
      const id = lesson.id as string;
      const base = ref.get(id);
      if (!base || broken.has(id)) continue;
      const origin = origins[loc].get(id)!;
      const file = origin.file;
      const a = base.steps.map((s) => s.id), b = lesson.steps.map((s) => s.id);
      if (a.join('|') !== b.join('|')) {
        const i = b.findIndex((x, k) => x !== a[k]);
        const at = b[i >= 0 ? i : b.length - 1];
        errors.push({ file, line: (at && origin.steps.get(at)?.line) || 1, message: `step ids differ from ${REFERENCE}: ${a.join(', ')} vs ${b.join(', ')}` });
        continue;
      }
      if (JSON.stringify(base.moments.map((m) => [m.id, m.board])) !== JSON.stringify(lesson.moments.map((m) => [m.id, m.board]))) {
        errors.push({ file, line: 1, message: `moments differ from ${REFERENCE}` });
      }
      lesson.steps.forEach((s, k) => {
        const r = base.steps[k]!;
        const where = origin.steps.get(s.id);
        if (JSON.stringify(r.scene.position) !== JSON.stringify(s.scene.position)) {
          errors.push({ file, line: where?.line ?? 1, message: `step "${s.id}": the position differs from ${REFERENCE}` });
        }
        if (answerOf(r.question) !== answerOf(s.question)) {
          errors.push({ file, line: where?.questionLine ?? where?.line ?? 1, message: `step "${s.id}": the answer differs from ${REFERENCE}` });
        }
      });
    }
  }
  return errors;
}
