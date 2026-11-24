/** The views a player can pick: named layer presets. Release 2 adds reach, knight, diamond and engine. */
import type { LayerKind, Lesson } from '@core/types';
import type { MessageKey } from '@core/i18n/index';

export type ViewId = 'board' | 'territory' | 'roads' | 'kings' | 'shapes';
export interface View { id: ViewId; layers: LayerKind[]; label: MessageKey; legend: MessageKey }

export const VIEWS: View[] = [
  { id: 'board', layers: ['pieces'], label: 'viewBoard', legend: 'legendBoard' },
  { id: 'territory', layers: ['pieces', 'territory'], label: 'viewTerritory', legend: 'legendTerritory' },
  { id: 'roads', layers: ['pieces', 'roads'], label: 'viewRoads', legend: 'legendRoads' },
  { id: 'kings', layers: ['pieces', 'kings'], label: 'viewKings', legend: 'legendKings' },
  { id: 'shapes', layers: ['shapes'], label: 'viewShapes', legend: 'legendShapes' },
];

/** The view a set of layers shows: an exact preset, blocks when shapes are on, else the preset with the same extra layer. */
export function viewOf(layers: readonly LayerKind[]): View {
  const set = new Set(layers);
  const exact = VIEWS.find((v) => v.layers.length === set.size && v.layers.every((l) => set.has(l)));
  if (exact) return exact;
  if (set.has('shapes')) return VIEWS.find((v) => v.id === 'shapes')!;
  return VIEWS.find((v) => v.layers.some((l) => l !== 'pieces' && set.has(l))) ?? VIEWS[0]!;
}

/** The views a lesson uses, in the menu's order: a lesson's dropdown lists only these. */
export function lessonViews(lesson: Lesson): View[] {
  const used = new Set(lesson.steps.map((s) => viewOf(s.scene.layers).id));
  return VIEWS.filter((v) => used.has(v.id));
}
