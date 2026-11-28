import { OPTION_IDS, type Lesson, type OptionId, type Profile, type Step } from '../types';
import { OPTIONS, optionsOf } from '../look';

/** Options free to use: those the profile has seen, plus every option of a finished lesson. */
export function unlockedOptions(profile: Profile, lessons: Lesson[]): Set<OptionId> {
  const out = new Set<OptionId>(profile.unlocked);
  for (const l of lessons) if (profile.progress[l.id]?.done) for (const s of l.steps) for (const k of optionsOf(s.scene.look)) out.add(k);
  return out;
}

/** The profile after seeing a step: its options join the unlocked ones (the always-allowed ones need no record). */
export function recordSeen(profile: Profile, step: Step): Profile {
  const set = new Set(profile.unlocked);
  for (const k of optionsOf(step.scene.look)) if (!OPTIONS[k].always) set.add(k);
  return set.size === profile.unlocked.length ? profile : { ...profile, unlocked: [...set] };
}

/** The options a lesson's picker shows: the always-allowed ones and every option its steps use, in picker order. */
export function lessonOptions(lesson: Lesson): OptionId[] {
  const used = new Set<OptionId>(lesson.steps.flatMap((s) => optionsOf(s.scene.look)));
  return OPTION_IDS.filter((id) => OPTIONS[id].always || used.has(id));
}
