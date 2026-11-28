/**
 * Recognise rounds: blocks-only boards from the moments of finished lessons, each asking
 * "which game, which moment?". The rules are the proof of concept's: wrong answers must be allowed
 * beside the right one and beside each other (looksLike in both directions), other moments of the
 * same lesson come first, and a seed makes a round reproducible.
 */
import type { Lesson, LessonId, Locale, PositionSource, Step } from './types';
import { t } from './i18n/index';

export const ROUND_SIZE = 8;
export const MIN_USABLE = 4;

export interface UsableMoment { key: string; lessonId: LessonId; momentId: string; label: string; board: PositionSource; looksLike: string[] }
export interface Round { seed: number; steps: Step[] }

/** mulberry32: the same seed always gives the same sequence. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function finishedMoments(lessons: Lesson[], done: Set<LessonId>): UsableMoment[] {
  return lessons.filter((l) => done.has(l.id) && l.moments.length > 0).flatMap((l) => l.moments.map((m) => ({
    key: `${l.id}/${m.id}`, lessonId: l.id, momentId: m.id, label: `${l.game ?? l.title}: ${m.name}`,
    board: m.board, looksLike: (m.looksLike ?? []) as string[],
  })));
}

const allowed = (a: UsableMoment, b: UsableMoment) => a.key !== b.key && !a.looksLike.includes(b.key) && !b.looksLike.includes(a.key);

/** Up to 3 wrong answers in `order`, each allowed beside `m` and beside each other; any allowed pair if the greedy pass finds fewer than 2. */
function pickWrong(m: UsableMoment, order: UsableMoment[]): UsableMoment[] {
  const cands = order.filter((o) => allowed(m, o));
  const taken: UsableMoment[] = [];
  for (const o of cands) if (taken.length < 3 && taken.every((x) => allowed(x, o))) taken.push(o);
  if (taken.length >= 2) return taken;
  for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) if (allowed(cands[i]!, cands[j]!)) return [cands[i]!, cands[j]!];
  return [];
}

export function usableMoments(lessons: Lesson[], done: Set<LessonId>): UsableMoment[] {
  const all = finishedMoments(lessons, done);
  return all.filter((m) => pickWrong(m, all).length >= 2);
}

export function roundUnlocked(lessons: Lesson[], done: Set<LessonId>): boolean {
  const finished = lessons.filter((l) => done.has(l.id) && l.moments.length > 0);
  return finished.length >= 2 && usableMoments(lessons, done).length >= MIN_USABLE;
}

export function buildRound(lessons: Lesson[], done: Set<LessonId>, seed: number, opts: { size?: number; locale?: Locale } = {}): Round | null {
  if (!roundUnlocked(lessons, done)) return null;
  const locale = opts.locale ?? 'pl';
  const rand = seeded(seed);
  const all = finishedMoments(lessons, done);
  const picked = shuffle(usableMoments(lessons, done), rand).slice(0, opts.size ?? ROUND_SIZE);
  const total = picked.length;
  const prompt = t(locale, 'whichGameWhichMoment');
  const steps: Step[] = picked.map((m, i) => {
    const same = shuffle(all.filter((o) => o.lessonId === m.lessonId), rand);
    const other = shuffle(all.filter((o) => o.lessonId !== m.lessonId), rand);
    const choices = shuffle([m.label, ...pickWrong(m, [...same, ...other]).map((o) => o.label)], rand);
    return {
      id: `round-${i + 1}`,
      scene: { position: m.board, look: { pieces: 'blocks' }, hideMoves: true },
      explain: { kids: t(locale, 'roundBoard', { n: i + 1, total }) },
      question: { kind: 'choice', prompt: { kids: prompt }, choices, answer: choices.indexOf(m.label) },
    };
  });
  return { seed, steps };
}
