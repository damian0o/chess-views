import type { LayerKind, Lesson, Profile, Step } from '../types';

/** Layers free to use: those the profile has seen, plus every layer of a finished lesson. */
export function unlockedLayers(profile: Profile, lessons: Lesson[]): Set<LayerKind> {
  const out = new Set<LayerKind>(profile.unlockedLayers);
  for (const l of lessons) if (profile.progress[l.id]?.done) for (const s of l.steps) for (const k of s.scene.layers) out.add(k);
  return out;
}

/** The profile after seeing a step: its layers join the unlocked ones. */
export function recordSeen(profile: Profile, step: Step): Profile {
  const set = new Set(profile.unlockedLayers);
  for (const k of step.scene.layers) set.add(k);
  return set.size === profile.unlockedLayers.length ? profile : { ...profile, unlockedLayers: [...set] };
}
