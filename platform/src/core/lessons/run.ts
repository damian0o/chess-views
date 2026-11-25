/**
 * A lesson in progress, as an immutable value. The UI reports what happened (the viewer's ply, an
 * answer, layers turned on) and gets a new run back. Gates: a hidden move must be revealed (a ply past
 * the step's), then the question must be answered. Steps outside the profile's audience are skipped.
 */
import type { LayerKind, Lesson, Profile, Square, Step } from '../types';
import { unlockedLayers } from './unlock';
import { isBlocks } from '../scene';

export type Gate = { kind: 'reveal' | 'answer' };
export type LessonEvent =
  | { kind: 'layers'; on: LayerKind[] }
  | { kind: 'ply'; ply: number }
  | { kind: 'answer'; value: number | Square };

export interface LessonRun {
  lesson: Lesson; step: Step; index: number; total: number;
  gate: Gate | null; done: boolean;
  answered: boolean; lastAnswer: 'right' | 'wrong' | null; wrong: (number | Square)[];
  ply: number; layersOn: LayerKind[];
  /** Layers the child may turn on in this step: unlocked ones plus the step's own. */
  allowedLayers: LayerKind[];
  report(e: LessonEvent): LessonRun;
  /** The same run with an up-to-date profile (after progress unlocked more layers). */
  withProfile(profile: Profile): LessonRun;
  next(): LessonRun;
  back(): LessonRun;
}

interface State { lesson: Lesson; profile: Profile; steps: Step[]; index: number; revealed: boolean; answered: boolean; lastAnswer: 'right' | 'wrong' | null; wrong: (number | Square)[]; ply: number; layersOn: LayerKind[] }

const plyOf = (s: Step) => (s.scene.position.kind === 'pgn' ? s.scene.position.ply : 0);

function isRight(step: Step, value: number | Square): boolean {
  const q = step.question;
  if (!q) return false;
  if (q.kind === 'choice') return value === q.answer;
  if (q.kind === 'tap') return typeof value === 'string' && (q.squares as string[]).includes(value);
  return value === (q.answer === 'yes' ? 0 : 1);       // recall: 0 = Yes, 1 = No
}

/** While a question is open: no locked layers, and no pieces on a blocks board. */
function whileOpen(step: Step, layers: LayerKind[]): LayerKind[] {
  if (!step.question) return layers;
  const locked = step.scene.lockedLayers ?? [];
  return layers.filter((l) => !locked.includes(l) && !(l === 'pieces' && isBlocks(step)));
}

function fresh(base: Omit<State, 'revealed' | 'answered' | 'lastAnswer' | 'wrong' | 'ply' | 'layersOn'>): State {
  const step = base.steps[base.index]!;
  return { ...base, revealed: false, answered: false, lastAnswer: null, wrong: [], ply: plyOf(step), layersOn: whileOpen(step, step.scene.layers.slice()) };
}

function make(s: State): LessonRun {
  const step = s.steps[s.index]!;
  // The hidden move stays revealed once the viewer has gone past it, even after stepping back.
  const gate: Gate | null = step.solve && !s.revealed ? { kind: 'reveal' }
    : step.question && !s.answered ? { kind: 'answer' } : null;
  const last = s.index === s.steps.length - 1;
  const allowed = new Set<LayerKind>([...unlockedLayers(s.profile, [s.lesson]), ...step.scene.layers]);
  const run: LessonRun = {
    lesson: s.lesson, step, index: s.index, total: s.steps.length, gate, done: last && !gate,
    answered: s.answered, lastAnswer: s.lastAnswer, wrong: s.wrong.slice(), ply: s.ply, layersOn: s.layersOn.slice(),
    allowedLayers: [...allowed],
    withProfile: (profile) => make({ ...s, profile }),
    report(e) {
      if (e.kind === 'ply') return make({ ...s, ply: e.ply, revealed: s.revealed || e.ply > plyOf(step) });
      if (e.kind === 'layers') {
        const on = e.on.filter((l) => allowed.has(l));
        return make({ ...s, layersOn: s.answered ? on : whileOpen(step, on) });
      }
      if (s.answered || !step.question || gate?.kind === 'reveal') return run;   // reveal the hidden move first
      const back = [...new Set<LayerKind>([...s.layersOn, ...step.scene.layers, ...(isBlocks(step) ? ['pieces' as const] : [])])];
      return isRight(step, e.value)
        ? make({ ...s, answered: true, lastAnswer: 'right', layersOn: back })
        : make({ ...s, lastAnswer: 'wrong', wrong: s.wrong.includes(e.value) ? s.wrong : [...s.wrong, e.value] });
    },
    next: () => (gate || last ? run : make(fresh({ ...s, index: s.index + 1 }))),
    back: () => (s.index === 0 ? run : make(fresh({ ...s, index: s.index - 1 }))),
  };
  return run;
}

/** The lesson for this profile, at step `at` if given; null when none of its steps is for this profile. */
export function startLesson(lesson: Lesson, profile: Profile, at?: string): LessonRun | null {
  const steps = lesson.steps.filter((st) => {
    const a = st.audience;
    return (!a?.ages || a.ages.includes(profile.age)) && (!a?.experience || a.experience.includes(profile.experience));
  });
  if (!steps.length) return null;
  const found = at ? steps.findIndex((st) => st.id === at) : -1;
  return make(fresh({ lesson, profile, steps, index: Math.max(0, found) }));
}
