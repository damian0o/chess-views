/** Helpers shared by the analysis modules. Not re-exported from the package index. */
import type { Board, Cell, Coord, PieceType } from './board';

export const FILES = 'abcdefgh';

export const KNIGHT_OFFSETS: readonly Coord[] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
export const KING_OFFSETS: readonly Coord[] = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
export const BISHOP_DIRS: readonly Coord[] = [[-1,-1],[-1,1],[1,-1],[1,1]];
export const ROOK_DIRS: readonly Coord[] = [[-1,0],[1,0],[0,-1],[0,1]];

export const PIECE_VALUE: Readonly<Record<PieceType, number>> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export const PLACEMENT_RE = /^[prnbqkPRNBQK1-8]+(\/[prnbqkPRNBQK1-8]+){7}$/;

export const onBoard = (r: number, c: number): boolean => r >= 0 && r < 8 && c >= 0 && c < 8;

export const emptyGrid = <T>(v: T): T[][] => Array.from({ length: 8 }, () => Array<T>(8).fill(v));

/** The cell at (r, c), or null when empty or off the board. */
export const cellAt = (board: Board, r: number, c: number): Cell | null => board[r]?.[c] ?? null;

/** Reads a grid cell; the analysis only indexes inside the 8x8 board. */
export function gridGet<T>(grid: T[][], r: number, c: number): T {
  const row = grid[r];
  if (!row || c < 0 || c >= row.length) throw new RangeError(`no grid cell at ${r},${c}`);
  return row[c] as T;
}

export function gridSet<T>(grid: T[][], r: number, c: number, v: T): void {
  const row = grid[r];
  if (!row || c < 0 || c >= row.length) throw new RangeError(`no grid cell at ${r},${c}`);
  row[c] = v;
}
