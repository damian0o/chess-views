import type { Color, Square } from '../types';
import { squareName, type Board, type Coord } from './board';
import { cellAt } from './internal';

export type ShapeSize = 'small' | 'mid' | 'big';
export type Zone = 'queenside' | 'centre' | 'kingside';
export type GroupBox = { r0: number; r1: number; c0: number; c1: number };
export type PieceGroup = { color: Color; zone: Zone; squares: Square[]; box: GroupBox };

/** Square size for the Shapes view: pawns small, minors and rooks medium, king and queen big. */
export function shapeSize(type: string): ShapeSize {
  if (type === 'p') return 'small';
  if (type === 'k' || type === 'q') return 'big';
  return 'mid';
}

/** Which third of the board a file belongs to: a-c queenside, d-e centre, f-h kingside. */
export function zoneOf(col: number): Zone {
  return col < 3 ? 'queenside' : col < 5 ? 'centre' : 'kingside';
}

/**
 * Groups of touching same-side pieces (8-neighbour adjacency) inside one zone
 * (queenside, centre, kingside), the "chunks" a strong player sees. Without the
 * zone split a normal middlegame is one giant group per side. Each group:
 * { color, zone, squares, box: { r0, r1, c0, c1 } } in board coordinates
 * (row 0 = rank 8). Scan order: rank 8 to 1, a to h.
 */
export function pieceGroups(board: Board): PieceGroup[] {
  const seen = new Set<number>();   // row * 8 + col
  const groups: PieceGroup[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const start = cellAt(board, row, col);
      if (!start || seen.has(row * 8 + col)) continue;
      const squares: Square[] = [];
      const box: GroupBox = { r0: row, r1: row, c0: col, c1: col };
      const stack: Coord[] = [[row, col]];
      seen.add(row * 8 + col);
      for (let top = stack.pop(); top; top = stack.pop()) {
        const [r, c] = top;
        squares.push(squareName(r, c));
        box.r0 = Math.min(box.r0, r); box.r1 = Math.max(box.r1, r);
        box.c0 = Math.min(box.c0, c); box.c1 = Math.max(box.c1, c);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if ((dr === 0 && dc === 0) || nr < 0 || nr > 7 || nc < 0 || nc > 7 || seen.has(nr * 8 + nc)) continue;
            const p = cellAt(board, nr, nc);
            if (!p || p.color !== start.color || zoneOf(nc) !== zoneOf(col)) continue;
            seen.add(nr * 8 + nc);
            stack.push([nr, nc]);
          }
        }
      }
      groups.push({ color: start.color, zone: zoneOf(col), squares, box });
    }
  }
  return groups;
}
