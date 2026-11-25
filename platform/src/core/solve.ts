/**
 * "Find the move" steps: the child plays a move and the engine judges it. Pure rules, no engine here:
 * the app gives the engine's score of the step's position (`best`, from the mover's view) and of the
 * position after the child's move (`after`, from the opponent's view, who is to move then), or the
 * game's end when the move mates or stalemates.
 */
import type { Score } from './engine/types';
import { grade } from './engine/coach';
import type { MessageKey, Params } from './i18n/index';

export type SolveCheck =
  | { kind: 'right'; label: MessageKey; params: Params; game: boolean }
  | { kind: 'wrong'; label: MessageKey; params: Params }
  /** No engine score to judge by, and not the game's move. */
  | { kind: 'unchecked' };

/** Grades good enough to count as solving the step: the best move, one just as good, or a good one (within half a pawn). */
const SOLVES: readonly MessageKey[] = ['gradeBest', 'gradeJustAsGood', 'gradeGood'];

const forMover = (after: Score | 'mate' | 'stalemate'): Score =>
  after === 'mate' ? { mate: 1 } : after === 'stalemate' ? { cp: 0 } : 'mate' in after ? { mate: -after.mate } : { cp: -after.cp };

export function judgeSolve({ best, after, isGameMove }: { best: Score | null; after: Score | 'mate' | 'stalemate' | null; isGameMove: boolean }): SolveCheck {
  // The game's move always solves the step, with no engine needed.
  if (isGameMove) return { kind: 'right', label: 'gradeGameMove', params: {}, game: true };
  const g = best && after ? grade(best, forMover(after)) : null;
  if (!g) return { kind: 'unchecked' };
  return SOLVES.includes(g.label) ? { kind: 'right', label: g.label, params: g.params, game: false } : { kind: 'wrong', label: g.label, params: g.params };
}
