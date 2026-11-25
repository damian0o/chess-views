/** The free board: a position the user pasted or linked, the ply shown, the orientation and the view. */
import type { LayerKind, PositionSource } from './types';
import { loadGame, type Game } from './chess/rules';
import { parseInput } from './analysis/input';
import { analyse } from './analysis/index';
import type { ResolvedScene } from './scene';
import type { MessageKey } from './i18n/index';

export type Session = { source: PositionSource; game: Game; ply: number; flip: boolean; view: string; headers: Record<string, string> };
export type SessionError = { error: MessageKey; detail?: string };
export type SessionOptions = { ply?: number; flip?: boolean; view?: string };

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
    game, ply, flip: !!opts.flip, view: opts.view ?? 'board', headers: game.headers(),
  };
}

/** The session at another ply, clamped to the game (0..length). */
export function stepTo(s: Session, ply: number): Session {
  const p = clampPly(s.game, ply);
  return { ...s, ply: p, source: s.source.kind === 'pgn' ? { ...s.source, ply: p } : s.source };
}

export const stepBy = (s: Session, n: number): Session => stepTo(s, s.ply + n);

/** The session's scene: the position at its ply, every move visible, the analysis the layers need. */
export function sessionScene(s: Session, layers: LayerKind[]): ResolvedScene {
  const fen = s.game.fen(s.ply);
  return {
    fen, ply: s.ply, moves: s.game.moves(),
    layers: layers.slice(), data: analyse(fen, layers),
    focus: [], hideMoves: false, flip: s.flip,
  };
}

/** The link of a session: fen, or pgn and ply; view (unless the board) and flip=1 when turned. */
export function sessionParams(s: Session): URLSearchParams {
  const p = new URLSearchParams();
  if (s.source.kind === 'fen') p.set('fen', s.source.fen);
  else { p.set('pgn', s.source.pgn); p.set('ply', String(s.ply)); }
  if (s.view !== 'board') p.set('view', s.view);
  if (s.flip) p.set('flip', '1');
  return p;
}

/** The session a link names; null when the link carries neither a fen nor a pgn. */
export function sessionFromParams(p: URLSearchParams): Session | SessionError | null {
  const opts: SessionOptions = { flip: p.get('flip') === '1' };
  const view = p.get('view');
  if (view) opts.view = view;
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
