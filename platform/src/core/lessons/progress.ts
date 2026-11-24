/** Saving a child's progress in a lesson: the step reached (never backwards), finished lessons, where to resume. */
import type { Lesson, Profile } from '../types';
import type { LessonRun } from './run';
import { recordSeen } from './unlock';

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
  const layers = new Set(profile.unlockedLayers);
  for (const s of lesson.steps) for (const l of s.scene.layers) layers.add(l);
  const last = lesson.steps[lesson.steps.length - 1]!.id;
  return { ...profile, unlockedLayers: [...layers], progress: { ...profile.progress, [lesson.id]: { reachedStep: last, done: true } } };
}

/** The step to continue from, or undefined when the lesson is finished, not started, or the saved step no longer exists. */
export function resumeStepId(profile: Profile, lesson: Lesson): string | undefined {
  const p = profile.progress[lesson.id];
  if (!p || p.done) return undefined;
  return lesson.steps.some((s) => s.id === p.reachedStep) ? p.reachedStep : undefined;
}
