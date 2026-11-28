/** Turning a raw step's attributes into a full scene: its position, board look and focus. */
import { OPTION_IDS, type BoardLook, type OptionId, type PositionSource, type Scene } from '@core/types';
import { OPTIONS, PLAIN, turnOn } from '@core/look';

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

const HEADS: Record<string, BoardLook> = { board: PLAIN, blocks: { pieces: 'blocks' }, hidden: { pieces: 'hidden' }, diamond: { pieces: 'pieces', diamond: true } };
/** Options a scene may add after its head: the drawings and the engine. */
const ADDS = OPTION_IDS.filter((id) => ['moves', 'strategy', 'helper'].includes(OPTIONS[id].group));

/**
 * `board+roads+kings` → a look. The head says how the pieces look (board, blocks, hidden) or is the
 * diamond; the rest are drawings, at most one per group, and none on the diamond. A string is an error.
 */
export function lookOf(text: string): BoardLook | string {
  const tokens = text.split('+').map((x) => x.trim()).filter(Boolean);
  const head = tokens.shift() ?? 'board';
  let look = HEADS[head];
  if (!look) return `unknown option "${head}"`;
  const seen = new Map<string, string>();
  for (const tok of tokens) {
    if (!(ADDS as string[]).includes(tok)) return `unknown option "${tok}"`;
    const group = OPTIONS[tok as OptionId].group;
    if (seen.has(group)) return `two options from one group: "${seen.get(group)!}" and "${tok}"`;
    seen.set(group, tok);
    if (look.diamond && group !== 'helper') return '"diamond" cannot be combined with drawings';
    look = turnOn(look, tok as OptionId);
  }
  return look;
}

/** A step's scene, or an error message. A blocks, hidden or recall board hides its moves. */
export function sceneOf(attrs: Record<string, unknown>, position: PositionSource, isRecall: boolean): Scene | string {
  const look = lookOf(String(attrs.scene ?? (isRecall ? 'blocks' : 'board')));
  if (typeof look === 'string') return look;
  const scene: Scene = { position, look };
  const focus = asList(attrs.focus);
  if (focus.length) scene.focus = focus as never;
  if (look.pieces !== 'pieces' || isRecall) scene.hideMoves = true;
  if (attrs.flip === true) scene.flip = true;
  const locked = asList(attrs.locked);
  if (locked.length) {
    const bad = locked.find((x) => !(OPTION_IDS as readonly string[]).includes(x));
    if (bad) return `unknown option "${bad}"`;
    scene.locked = locked as OptionId[];
  }
  return scene;
}

export { asList };
