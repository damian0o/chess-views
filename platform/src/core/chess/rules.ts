/**
 * The only door to chess.js: loading a FEN or a PGN at a ply, replaying positions, legal moves and
 * the game's status. Everything else in the platform uses this adapter's types.
 */
import { Chess } from 'chess.js';
import type { Fen, PositionSource, Square } from '../types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;

export class ChessError extends Error {
  override name = 'ChessError';
}

export interface Move { from: Square; to: Square; san: string; promotion?: string }

export type Status = 'play' | 'check' | 'mate' | 'stalemate';

export interface Game {
  /** The position after `ply` moves (default: the game's current ply). */
  fen(ply?: number): Fen;
  moves(): Move[];
  ply: number;
  length: number;
  headers(): Record<string, string>;
  legalMoves(fen: Fen, from?: Square): Move[];
  status(ply?: number): Status;
}

const toMove = (m: { from: string; to: string; san: string; promotion?: string }): Move =>
  ({ from: m.from as Square, to: m.to as Square, san: m.san, ...(m.promotion ? { promotion: m.promotion } : {}) });

function fromFen(fen: string): Chess {
  try { return new Chess(fen); } catch (e) { throw new ChessError(`not a legal position: ${(e as Error).message}`); }
}

export function loadGame(src: PositionSource): Game {
  let startFen: Fen;
  let moves: Move[];
  let headers: Record<string, string> = {};
  if (src.kind === 'fen') {
    fromFen(src.fen);
    startFen = src.fen;
    moves = [];
  } else {
    const c = new Chess();
    try { c.loadPgn(src.pgn); } catch (e) { throw new ChessError(`the PGN does not replay: ${(e as Error).message}`); }
    moves = c.history({ verbose: true }).map(toMove);
    headers = Object.fromEntries(Object.entries(c.getHeaders()).filter(([, v]) => v != null)) as Record<string, string>;
    startFen = (headers.FEN as Fen | undefined) ?? START_FEN;
  }
  const ply = src.kind === 'pgn' ? src.ply : 0;
  if (ply > moves.length) throw new ChessError(`ply ${ply} is beyond the game's ${moves.length} moves`);

  const at = (n: number): Chess => {
    const c = fromFen(startFen);
    for (const m of moves.slice(0, n)) c.move({ from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion } : {}) });
    return c;
  };
  const clamp = (n: number | undefined) => Math.max(0, Math.min(moves.length, n ?? ply));
  return {
    ply,
    length: moves.length,
    moves: () => moves.slice(),
    headers: () => ({ ...headers }),
    fen: (n) => at(clamp(n)).fen() as Fen,
    legalMoves: (fen, from) => fromFen(fen).moves({ verbose: true, ...(from ? { square: from } : {}) }).map(toMove),
    status: (n) => {
      const c = at(clamp(n));
      return c.isCheckmate() ? 'mate' : c.isStalemate() ? 'stalemate' : c.inCheck() ? 'check' : 'play';
    },
  };
}

/**
 * Can an engine judge this position? Both kings present, the side not to move not in check,
 * and at least one legal move.
 */
export function isJudgeable(fen: Fen): boolean {
  let c: Chess;
  try { c = new Chess(fen); } catch { return false; }
  const board = c.board().flat();
  if (board.filter((p) => p?.type === 'k').length !== 2) return false;
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
  try {
    const other = new Chess(parts.join(' '), { skipValidation: true });
    if (other.inCheck()) return false;
  } catch { return false; }
  return c.moves().length > 0;
}
