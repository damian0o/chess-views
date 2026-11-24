/**
 * A lesson in progress, as an immutable value. The UI reports what happened (the viewer's ply, an
 * answer, layers turned on) and gets a new run back. Gates: a hidden move must be revealed (a ply past
 * the step's), then the question must be answered. Steps outside the profile's audience are skipped.
 */
import type { LayerKind, Lesson, Profile, Square, Step } from '../types';
import { unlockedLayers } from './unlock';

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
  report(e: LessonEvent): LessonRun;
  next(): LessonRun;
  back(): LessonRun;
}

interface State { lesson: Lesson; profile: Profile; steps: Step[]; index: number; answered: boolean; lastAnswer: 'right' | 'wrong' | null; wrong: (number | Square)[]; ply: number; layersOn: LayerKind[] }

const plyOf = (s: Step) => (s.scene.position.kind === 'pgn' ? s.scene.position.ply : 0);

function isRight(step: Step, value: number | Square): boolean {
  const q = step.question;
  if (!q) return false;
  if (q.kind === 'choice') return value === q.answer;
  if (q.kind === 'tap') return typeof value === 'string' && (q.squares as string[]).includes(value);
  return value === (q.answer === 'yes' ? 0 : 1);       // recall: 0 = Yes, 1 = No
}

function fresh(base: Omit<State, 'answered' | 'lastAnswer' | 'wrong' | 'ply' | 'layersOn'>): State {
  const step = base.steps[base.index]!;
  return { ...base, answered: false, lastAnswer: null, wrong: [], ply: plyOf(step), layersOn: step.scene.layers.slice() };
}

function make(s: State): LessonRun {
  const step = s.steps[s.index]!;
  const gate: Gate | null = step.solve && !(s.ply > plyOf(step)) ? { kind: 'reveal' }
    : step.question && !s.answered ? { kind: 'answer' } : null;
  const last = s.index === s.steps.length - 1;
  const run: LessonRun = {
    lesson: s.lesson, step, index: s.index, total: s.steps.length, gate, done: last && !gate,
    answered: s.answered, lastAnswer: s.lastAnswer, wrong: s.wrong.slice(), ply: s.ply, layersOn: s.layersOn.slice(),
    report(e) {
      if (e.kind === 'ply') return make({ ...s, ply: e.ply });
      if (e.kind === 'layers') {
        const allowed = new Set<LayerKind>([...unlockedLayers(s.profile, [s.lesson]), ...step.scene.layers]);
        return make({ ...s, layersOn: e.on.filter((l) => allowed.has(l)) });
      }
      if (s.answered || !step.question) return run;
      return isRight(step, e.value)
        ? make({ ...s, answered: true, lastAnswer: 'right' })
        : make({ ...s, lastAnswer: 'wrong', wrong: s.wrong.includes(e.value) ? s.wrong : [...s.wrong, e.value] });
    },
    next: () => (gate || last ? run : make(fresh({ ...s, index: s.index + 1 }))),
    back: () => (s.index === 0 ? run : make(fresh({ ...s, index: s.index - 1 }))),
  };
  return run;
}

export function startLesson(lesson: Lesson, profile: Profile, at?: string): LessonRun {
  const steps = lesson.steps.filter((st) => {
    const a = st.audience;
    return (!a?.ages || a.ages.includes(profile.age)) && (!a?.experience || a.experience.includes(profile.experience));
  });
  const found = at ? steps.findIndex((st) => st.id === at) : -1;
  return make(fresh({ lesson, profile, steps, index: Math.max(0, found) }));
}
