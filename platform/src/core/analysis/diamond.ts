import type { Square } from '../types';
import { squareName, type Board, type Cell } from './board';
import { cellAt } from './internal';

export type DiamondCell = { square: Square; cell: Cell | null };

/** 15 rows; row i holds the squares with file + rank === 16 - i (a = 1), ordered a-file first. */
export function diamondRows(board: Board): DiamondCell[][] {
  const rows: DiamondCell[][] = Array.from({ length: 15 }, () => []);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = col + 1, rank = 8 - row;
      rows[16 - (file + rank)]?.push({ square: squareName(row, col), cell: cellAt(board, row, col) });
    }
  }
  return rows;
}
