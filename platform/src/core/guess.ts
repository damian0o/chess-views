/**
 * Guess-the-move by taps: first the piece, then where it goes. Every tap is checked against the legal
 * moves, so a tap on an opponent's piece, an empty square or an illegal target is ignored with a reason
 * (the app shows a hint) and nothing ever throws. A pawn reaching the last rank promotes to a queen.
 */
import type { Fen, Square } from './types';
import { loadGame } from './chess/rules';
import { boardFromFen, squareIndex } from './analysis/board';
import type { EngineMove } from './engine/types';

export interface GuessState { from?: Square }
export type GuessResult =
  | { kind: 'pick'; from: Square }
  | { kind: 'drop' }
  | { kind: 'ignore'; reason: 'opponent' | 'empty' | 'illegal' | 'stuck' }
  | { kind: 'guess'; move: EngineMove; san: string };

export function tapGuess(state: GuessState, sq: Square, fen: Fen): { state: GuessState; result: GuessResult } {
  let game;
  try { game = loadGame({ kind: 'fen', fen }); } catch { return { state: {}, result: { kind: 'ignore', reason: 'illegal' } }; }
  const turn = fen.split(' ')[1] as 'w' | 'b';
  const { row, col } = squareIndex(sq);
  const piece = boardFromFen(fen)[row]?.[col] ?? null;
  const own = piece?.color === turn;

  if (state.from) {
    if (sq === state.from) return { state: {}, result: { kind: 'drop' } };
    const move = game.legalMoves(fen, state.from).find((m) => m.to === sq);
    if (move) {
      const promotion = move.promotion ? 'q' : undefined;
      const chosen = promotion ? game.legalMoves(fen, state.from).find((m) => m.to === sq && m.promotion === 'q') ?? move : move;
      return { state: {}, result: { kind: 'guess', san: chosen.san, move: { uci: `${chosen.from}${chosen.to}${promotion ?? ''}`, from: chosen.from, to: chosen.to, ...(promotion ? { promotion } : {}) } } };
    }
    if (!own) return { state, result: { kind: 'ignore', reason: 'illegal' } };
  }
  if (!piece) return { state, result: { kind: 'ignore', reason: 'empty' } };
  if (!own) return { state, result: { kind: 'ignore', reason: 'opponent' } };
  if (!game.legalMoves(fen, sq).length) return { state: {}, result: { kind: 'ignore', reason: 'stuck' } };
  return { state: { from: sq }, result: { kind: 'pick', from: sq } };
}
