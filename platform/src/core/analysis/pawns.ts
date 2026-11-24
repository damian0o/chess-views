import type { Color, Square } from '../types';
import { squareName, type Board } from './board';
import { cellAt, onBoard } from './internal';

export type PawnPath = {
  square: Square;
  color: Color;
  /** The squares ahead on its file, up to the last rank. */
  path: Square[];
  /** The first occupied square ahead, if any. */
  blocker: Square | null;
  /** Enemy pawns ahead on its own or a neighbouring file. */
  guards: Square[];
  passed: boolean;
  clear: boolean;
  promotion: Square | null;
  stepsToPromote: number;
};

/** For every pawn: the squares ahead on its file, the first blocker, enemy pawns that could stop it, and whether it is passed. */
export function pawnPaths(board: Board): PawnPath[] {
  const out: PawnPath[] = [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const p = cellAt(board, row, col);
    if (!p || p.type !== 'p') continue;
    const dr = p.color === 'w' ? -1 : 1;
    const path: Square[] = [];
    let blocker: Square | null = null;
    for (let r = row + dr; onBoard(r, col); r += dr) {
      path.push(squareName(r, col));
      if (cellAt(board, r, col) && blocker === null) blocker = squareName(r, col);
    }
    const guards: Square[] = [];
    for (let r = row + dr; onBoard(r, col); r += dr) {
      for (const dc of [-1, 0, 1]) {
        const c = col + dc;
        if (!onBoard(r, c)) continue;
        const q = cellAt(board, r, c);
        if (q && q.type === 'p' && q.color !== p.color) guards.push(squareName(r, c));
      }
    }
    out.push({
      square: p.square, color: p.color, path, blocker, guards,
      passed: guards.length === 0, clear: blocker === null,
      promotion: path[path.length - 1] ?? null, stepsToPromote: path.length,
    });
  }
  return out;
}
