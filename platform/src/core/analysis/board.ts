// Pure position-analysis functions over a plain 8x8 board array.
// Board = Cell[8][8], row 0 = rank 8, col 0 = file a (identical to chess.js board()).
import type { Color, Fen, Square } from '../types';
import { FILES, PLACEMENT_RE, cellAt } from './internal';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Cell = { square: Square; type: PieceType; color: Color };
export type Board = (Cell | null)[][];
/** [row, col] on the board, or a [dRow, dCol] direction. */
export type Coord = [number, number];
export type SquareShade = 'light' | 'dark';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;

export function squareName(row: number, col: number): Square {
  return (FILES.charAt(col) + (8 - row)) as Square;
}

export function squareIndex(name: string): { row: number; col: number } {
  const file = name[0];
  return { row: 8 - Number(name[1]), col: file === undefined ? -1 : FILES.indexOf(file) };
}

export function squareColor(name: string): SquareShade {
  const { row, col } = squareIndex(name);
  return (row + col) % 2 === 0 ? 'light' : 'dark';
}

export function boardFromFen(fen: string): Board {
  const placement = fen.trim().split(/\s+/)[0] ?? '';
  return placement.split('/').map((rankStr, row) => {
    const cells: (Cell | null)[] = [];
    for (const ch of rankStr) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push(null);
      } else {
        const col = cells.length;
        cells.push({
          square: squareName(row, col),
          type: ch.toLowerCase() as PieceType,
          color: ch === ch.toUpperCase() ? 'w' : 'b',
        });
      }
    }
    return cells;
  });
}

export function symbol(cell: Pick<Cell, 'type' | 'color'> | null, name: string): string {
  if (!cell) return squareColor(name) === 'dark' ? '.' : '';
  if (cell.type === 'p') return cell.color === 'w' ? 'o' : 'x';
  const letter = cell.type.toUpperCase();
  return cell.color === 'w' ? letter : letter + "'";
}

export function boardText(board: Board): string {
  const coords = '  ' + FILES.split('').map((f) => f.padEnd(2)).join(' ');
  const lines = [coords.trimEnd()];
  board.forEach((rowCells, row) => {
    const rank = 8 - row;
    const cells = rowCells.map((c, col) => symbol(c, squareName(row, col)).padEnd(2));
    lines.push(`${rank} ${cells.join(' ')} ${rank}`);
  });
  lines.push(coords.trimEnd());
  return lines.join('\n');
}

// ---------- FEN input ----------

/** Castling rights implied by kings and rooks still on their home squares. */
function inferCastling(placement: string): string {
  const b = boardFromFen(placement);
  const is = (sq: string, type: PieceType, color: Color): boolean => {
    const { row, col } = squareIndex(sq);
    const p = cellAt(b, row, col);
    return !!p && p.type === type && p.color === color;
  };
  let rights = '';
  if (is('e1', 'k', 'w')) { if (is('h1', 'r', 'w')) rights += 'K'; if (is('a1', 'r', 'w')) rights += 'Q'; }
  if (is('e8', 'k', 'b')) { if (is('h8', 'r', 'b')) rights += 'k'; if (is('a8', 'r', 'b')) rights += 'q'; }
  return rights || '-';
}

export function normaliseFen(fen: string): Fen {
  const fields = fen.trim().split(/\s+/);
  const defaults = ['w', inferCastling(fields[0] ?? ''), '-', '0', '1'];
  while (fields.length < 6) fields.push(defaults[fields.length - 1] ?? '');
  return fields.slice(0, 6).join(' ') as Fen;
}

/** Returns null when the placement is well formed, otherwise a human-readable reason. */
export function validatePlacement(placement: string): string | null {
  if (!PLACEMENT_RE.test(placement)) return 'Not a FEN: expected 8 ranks of pieces and digits separated by /.';
  const ranks = placement.split('/');
  for (let i = 0; i < 8; i++) {
    const n = [...(ranks[i] ?? '')].reduce((sum, ch) => sum + (/\d/.test(ch) ? Number(ch) : 1), 0);
    if (n !== 8) return `Rank ${8 - i} has ${n} squares, it needs 8.`;
  }
  return null;
}
