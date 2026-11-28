/** Saving a child's progress in a lesson: the step reached (never backwards), finished lessons, where to resume. */
import type { Lesson, Profile } from '../types';
import type { LessonRun } from './run';
import { recordSeen } from './unlock';
import { OPTIONS, optionsOf } from '../look';

export function recordStep(profile: Profile, run: LessonRun): Profile {
  const id = run.lesson.id as string;
  const order = run.lesson.steps.map((s) => s.id);
  const prev = profile.progress[id];
  const at = order.indexOf(run.step.id);
  const was = prev ? order.indexOf(prev.reachedStep) : -1;
  const reachedStep = at > was ? run.step.id : prev!.reachedStep;
  const seen = recordSeen(profile, run.step);
  return { ...seen, progress: { ...seen.progress, [id]: { reachedStep, done: prev?.done ?? false } } };
}

export function finishLesson(profile: Profile, lesson: Lesson): Profile {
  const unlocked = new Set(profile.unlocked);
  for (const s of lesson.steps) for (const k of optionsOf(s.scene.look)) if (!OPTIONS[k].always) unlocked.add(k);
  const last = lesson.steps[lesson.steps.length - 1]!.id;
  return { ...profile, unlocked: [...unlocked], progress: { ...profile.progress, [lesson.id]: { reachedStep: last, done: true } } };
}

/** The step to continue from, or undefined when the lesson is finished, not started, or the saved step no longer exists. */
export function resumeStepId(profile: Profile, lesson: Lesson): string | undefined {
  const p = profile.progress[lesson.id];
  if (!p || p.done) return undefined;
  return lesson.steps.some((s) => s.id === p.reachedStep) ? p.reachedStep : undefined;
}
