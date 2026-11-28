/** The free board: a position the user pasted or linked, the ply shown, the orientation and the view. */
import { MOVES_DRAWINGS, PIECES_MODES, STRATEGY_DRAWINGS, type BoardLook, type PositionSource } from './types';
import { PLAIN, lookOfView, turnOn } from './look';
import { loadGame, type Game } from './chess/rules';
import { parseInput } from './analysis/input';
import { analyse } from './analysis/index';
import type { ResolvedScene } from './scene';
import type { MessageKey } from './i18n/index';

export type Session = { source: PositionSource; game: Game; ply: number; flip: boolean; look: BoardLook; headers: Record<string, string>; /** A problem: the moves after the current one stay hidden. */ solve?: boolean };
export type SessionError = { error: MessageKey; detail?: string };
export type SessionOptions = { ply?: number; flip?: boolean; look?: BoardLook; solve?: boolean };

const clampPly = (game: Game, ply: number): number => Math.max(0, Math.min(game.length, Math.trunc(ply) || 0));

/**
 * Opens a FEN, a PGN or a lichess analysis link (or a ready source). A PGN opens at `opts.ply`, else at
 * the source's ply when one is given as a source, else at its last move. A lichess game link comes back
 * as `loadLichessGame`: the app fetches the PGN and opens that.
 */
export function openSession(input: string | PositionSource, opts: SessionOptions = {}): Session | SessionError {
  let source: PositionSource;
  let wantPly = opts.ply;
  if (typeof input === 'string') {
    const parsed = parseInput(input);
    switch (parsed.kind) {
      case 'fen': source = { kind: 'fen', fen: parsed.fen }; break;
      case 'pgn': source = { kind: 'pgn', pgn: parsed.pgn, ply: 0 }; break;
      case 'lichess-game': return { error: 'loadLichessGame' };
      case 'invalid': return { error: 'loadBadFen', detail: parsed.reason };
      default: return { error: 'loadUnknown' };
    }
  } else {
    source = input;
    if (wantPly === undefined && input.kind === 'pgn') wantPly = input.ply;
  }
  let game: Game;
  try {
    game = loadGame(source.kind === 'pgn' ? { ...source, ply: 0 } : source);
  } catch (e) {
    return { error: source.kind === 'fen' ? 'loadBadFen' : 'loadBadPgn', detail: (e as Error).message };
  }
  const ply = source.kind === 'pgn' ? clampPly(game, wantPly ?? game.length) : 0;
  return {
    source: source.kind === 'pgn' ? { ...source, ply } : source,
    game, ply, flip: !!opts.flip, look: opts.look ?? PLAIN, headers: game.headers(), ...(opts.solve ? { solve: true } : {}),
  };
}

/** The session at another ply, clamped to the game (0..length). */
export function stepTo(s: Session, ply: number): Session {
  const p = clampPly(s.game, ply);
  return { ...s, ply: p, source: s.source.kind === 'pgn' ? { ...s.source, ply: p } : s.source };
}

export const stepBy = (s: Session, n: number): Session => stepTo(s, s.ply + n);

/** The session's scene: the position at its ply, every move visible, the analysis the look needs. */
export function sessionScene(s: Session, look: BoardLook = s.look): ResolvedScene {
  const fen = s.game.fen(s.ply);
  return {
    fen, ply: s.ply, moves: s.solve ? s.game.moves().slice(0, s.ply) : s.game.moves(),
    look, data: analyse(fen, look),
    focus: [], hideMoves: !!s.solve, flip: s.flip,
  };
}

/** The link of a session: fen, or pgn and ply; one parameter per board look group that is not plain; flip=1 when turned. */
export function sessionParams(s: Session): URLSearchParams {
  const p = new URLSearchParams();
  if (s.source.kind === 'fen') p.set('fen', s.source.fen);
  else { p.set('pgn', s.source.pgn); p.set('ply', String(s.ply)); }
  if (s.look.pieces !== 'pieces') p.set('pieces', s.look.pieces);
  if (s.look.moves) p.set('moves', s.look.moves);
  if (s.look.strategy) p.set('strategy', s.look.strategy);
  if (s.look.diamond) p.set('diamond', '1');
  if (s.look.engine) p.set('engine', '1');
  if (s.flip) p.set('flip', '1');
  if (s.solve) p.set('solve', '1');
  return p;
}

/** The session a link names; null when the link carries neither a fen nor a pgn. */
export function sessionFromParams(p: URLSearchParams): Session | SessionError | null {
  const opts: SessionOptions = { flip: p.get('flip') === '1', ...(p.get('solve') === '1' ? { solve: true } : {}) };
  opts.look = lookFromParams(p);
  const fen = p.get('fen');
  if (fen) {
    const parsed = parseInput(fen);
    if (parsed.kind !== 'fen') return { error: 'loadBadFen', ...(parsed.kind === 'invalid' ? { detail: parsed.reason } : {}) };
    return openSession({ kind: 'fen', fen: parsed.fen }, opts);
  }
  const pgn = p.get('pgn');
  if (pgn) {
    const ply = p.get('ply');
    if (ply !== null && /^\d+$/.test(ply)) opts.ply = Number(ply);
    return openSession({ kind: 'pgn', pgn, ply: 0 }, opts);
  }
  return null;
}

const oneOf = <T extends string>(list: readonly T[], v: string | null): T | undefined => (v !== null && (list as readonly string[]).includes(v) ? v as T : undefined);

/** The look a link names: an old `view=` first, then each group's own parameter wins; bad values are ignored. */
export function lookFromParams(p: URLSearchParams): BoardLook {
  let look = lookOfView(p.get('view') ?? 'board');
  const pieces = oneOf(PIECES_MODES, p.get('pieces'));
  const moves = oneOf(MOVES_DRAWINGS, p.get('moves'));
  const strategy = oneOf(STRATEGY_DRAWINGS, p.get('strategy'));
  if (pieces) look = turnOn(look, pieces);
  if (moves) look = turnOn(look, moves);
  if (strategy) look = turnOn(look, strategy);
  if (p.get('engine') === '1') look = turnOn(look, 'engine');
  if (p.get('diamond') === '1') look = turnOn(look, 'diamond');
  return look;
}
