import type { Square } from '../types';
import { squareName, type Board, type Cell } from './board';
import { BISHOP_DIRS, PIECE_VALUE, ROOK_DIRS, cellAt, onBoard } from './internal';

export type Pin = {
  pinner: Cell;
  pinned: Cell;
  target: Cell;
  /** True when the target is the king. */
  absolute: boolean;
  /** Every square strictly between pinner and target, the pinned square included. */
  between: Square[];
};

/** Every pin on the board: a slider, one enemy piece in between, and the king or a more valuable piece behind it. */
export function pins(board: Board): Pin[] {
  const out: Pin[] = [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const pinner = cellAt(board, row, col);
    if (!pinner || !'brq'.includes(pinner.type)) continue;
    const dirs = pinner.type === 'b' ? BISHOP_DIRS : pinner.type === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      let pinned: Cell | null = null;
      const between: Square[] = [];
      while (onBoard(r, c)) {
        const p = cellAt(board, r, c);
        if (p) {
          if (p.color === pinner.color) break;
          if (!pinned) { if (p.type === 'k') break; pinned = p; }
          else {
            if (p.type === 'k' || PIECE_VALUE[p.type] > PIECE_VALUE[pinned.type]) {
              out.push({ pinner, pinned, target: p, absolute: p.type === 'k', between: between.slice() });
            }
            break;
          }
        }
        between.push(squareName(r, c));
        r += dr; c += dc;
      }
    }
  }
  return out;
}
