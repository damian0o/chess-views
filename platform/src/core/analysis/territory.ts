import type { Color, Square } from '../types';
import { squareName, type Board, type PieceType } from './board';
import { absolutePinMap, attacksFromPinned } from './attacks';
import { PIECE_VALUE, cellAt, emptyGrid, gridGet, gridSet } from './internal';

/** '+' White owns the square, '-' Black owns it, '=' contested evenly, '' nobody attacks it. */
export type TerritoryMark = '' | '+' | '-' | '=';
export type Guard = { type: PieceType; square: Square };
export type Territory = {
  mark: TerritoryMark[][];
  diff: number[][];
  lead: number[][];
  cheapest: Record<Color, (Guard | null)[][]>;
  summary: { w: number; b: number; centerW: number; centerB: number };
  pinned: { square: Square; by: Square; to: Square }[];
};

const CENTER = ['d4', 'e4', 'd5', 'e5'];

/**
 * Who owns each square. Counts respect pins. Ownership follows the cheapest guard: the side whose
 * cheapest attacker is worth less owns the square (nothing dearer can land there safely); when the
 * cheapest guards are worth the same, the bigger count wins. `lead` is the signed strength of that
 * ownership (at least 1 for an owned square), `diff` the raw count difference.
 */
export function territory(board: Board): Territory {
  const pinMap = absolutePinMap(board);
  const a: Record<Color, number[][]> = { w: emptyGrid(0), b: emptyGrid(0) };
  const cheapest: Record<Color, (Guard | null)[][]> = { w: emptyGrid<Guard | null>(null), b: emptyGrid<Guard | null>(null) };
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const piece = cellAt(board, row, col);
    if (!piece) continue;
    for (const [r, c] of attacksFromPinned(board, row, col, pinMap)) {
      gridSet(a[piece.color], r, c, gridGet(a[piece.color], r, c) + 1);
      const cur = gridGet(cheapest[piece.color], r, c);
      if (!cur || PIECE_VALUE[piece.type] < PIECE_VALUE[cur.type]) gridSet(cheapest[piece.color], r, c, { type: piece.type, square: piece.square });
    }
  }
  const pinned = [...pinMap.values()].map((pn) => ({ square: pn.pinned.square, by: pn.pinner.square, to: pn.target.square }));
  const mark = emptyGrid<TerritoryMark>('');
  const diff = emptyGrid(0);
  const lead = emptyGrid(0);
  const summary = { w: 0, b: 0, centerW: 0, centerB: 0 };
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const w = gridGet(a.w, row, col), b = gridGet(a.b, row, col);
      gridSet(diff, row, col, w - b);
      let m: TerritoryMark = '';
      const gw = gridGet(cheapest.w, row, col), gb = gridGet(cheapest.b, row, col);
      if (w && b && gw && gb) {
        const vw = PIECE_VALUE[gw.type], vb = PIECE_VALUE[gb.type];
        m = vw < vb ? '+' : vb < vw ? '-' : w > b ? '+' : b > w ? '-' : '=';
      } else if (w) m = '+';
      else if (b) m = '-';
      gridSet(mark, row, col, m);
      gridSet(lead, row, col, m === '+' ? Math.max(1, w - b) : m === '-' ? -Math.max(1, b - w) : 0);
      const central = CENTER.includes(squareName(row, col));
      if (m === '+') { summary.w++; if (central) summary.centerW++; }
      if (m === '-') { summary.b++; if (central) summary.centerB++; }
    }
  }
  return { mark, diff, lead, cheapest, summary, pinned };
}
