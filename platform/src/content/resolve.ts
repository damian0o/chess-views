/** Turning a raw step's attributes into a full scene: its position, base, layers and focus. */
import type { LayerKind, PositionSource, Scene } from '@core/types';

export type LibraryPositions = Map<string, PositionSource>;

export interface PositionContext {
  lessonPgn: string | null;
  previous: PositionSource | null;
  library: LibraryPositions;
  momentBoard: (id: string) => PositionSource | null;
}

const asList = (v: unknown): string[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);
const plyOf = (v: unknown): number | undefined => (v === undefined ? undefined : Number(v));

/**
 * A position from `fen`, `pgn`+`ply`, `pos` (library, optional `ply`), `same` (previous, optional `ply`),
 * `ply` alone (the lesson's pgn), or a recall question with answer yes (its moment's board).
 * Returns a reason string when none applies or a reference is missing.
 */
export function resolvePosition(attrs: Record<string, unknown>, ctx: PositionContext, recallYes: string | null): PositionSource | string {
  const ply = plyOf(attrs.ply);
  if (typeof attrs.fen === 'string') return { kind: 'fen', fen: attrs.fen as never };
  if (typeof attrs.pgn === 'string') return ply === undefined ? 'a pgn needs a ply' : { kind: 'pgn', pgn: attrs.pgn, ply };
  if (typeof attrs.pos === 'string') {
    const entry = ctx.library.get(attrs.pos);
    if (!entry) return `no library entry "${attrs.pos}"`;
    return entry.kind === 'pgn' && ply !== undefined ? { ...entry, ply } : entry;
  }
  if (attrs.same === true) {
    if (!ctx.previous) return '"same" needs a previous step';
    return ctx.previous.kind === 'pgn' && ply !== undefined ? { ...ctx.previous, ply } : ctx.previous;
  }
  if (ply !== undefined) return ctx.lessonPgn ? { kind: 'pgn', pgn: ctx.lessonPgn, ply } : 'a ply alone needs the lesson\'s pgn';
  if (recallYes !== null) return ctx.momentBoard(recallYes) ?? `no moment "${recallYes}"`;
  return 'the step has no position (fen, pgn+ply, pos, same, ply, or a recall question)';
}

/** `scene: board+roads` → base board, layers pieces + roads; `blocks` → shapes without pieces; `diamond` → the diamond base. */
export function sceneOf(attrs: Record<string, unknown>, position: PositionSource, isRecall: boolean): Scene {
  const tokens = String(attrs.scene ?? (isRecall ? 'blocks' : 'board')).split('+').map((x) => x.trim()).filter(Boolean);
  const head = tokens.shift() ?? 'board';
  const blocks = head === 'blocks';
  const layers = [...(blocks ? ['shapes'] : ['pieces']), ...tokens] as LayerKind[];
  const scene: Scene = { position, base: head === 'diamond' ? 'diamond' : 'board', layers };
  const focus = asList(attrs.focus);
  if (focus.length) scene.focus = focus as never;
  if (blocks || isRecall) scene.hideMoves = true;
  if (attrs.flip === true) scene.flip = true;
  const locked = asList(attrs.locked);
  if (locked.length) scene.lockedLayers = locked as LayerKind[];
  return scene;
}

export { asList };
