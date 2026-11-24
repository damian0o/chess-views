import type { Color } from '../types';
import type { Board, Cell } from './board';
import { absolutePinMap, attacksFromPinned } from './attacks';
import { PIECE_VALUE, cellAt } from './internal';

/**
 *  'free'  attacked and nobody defends it (even a king may take it)
 *  'cheap' defended, but an attacker is worth less than the piece, so taking it wins material
 *  'held'  attacked, but every attacker is worth at least as much and it is defended
 *  'quiet' not attacked
 */
export type SafetyStatus = 'free' | 'cheap' | 'held' | 'quiet';
export type PieceSafety = {
  piece: Cell;
  attackers: Cell[];
  defenders: Cell[];
  /** A king that defends but cannot take back. */
  kingOnly: Cell[];
  /** The cheapest attacker. */
  by: Cell | null;
  status: SafetyStatus;
};

/**
 * The defenders that can really take back. A king may never recapture onto a square another attacker
 * still hits, so it only counts as the last recapture: when the other defenders can trade off every
 * attacker but one (attackers <= other defenders + 1).
 */
export function realDefenders<D extends { type: string }>(attackers: readonly unknown[], defenders: readonly D[]): D[] {
  const others = defenders.filter((p) => p.type !== 'k');
  return attackers.length <= others.length + 1 ? defenders.slice() : others;
}

/**
 * How safe every piece stands. For each occupied square: the enemy attackers and own defenders
 * (pins respected), the cheapest attacker `by`, and a status (see SafetyStatus). Keyed by square name.
 */
export function pieceSafety(board: Board): Map<string, PieceSafety> {
  const pinMap = absolutePinMap(board);
  const hits = new Map<string, Record<Color, Cell[]>>();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const piece = cellAt(board, row, col);
    if (!piece) continue;
    for (const [r, c] of attacksFromPinned(board, row, col, pinMap)) {
      const target = cellAt(board, r, c);
      if (!target) continue;
      let h = hits.get(target.square);
      if (!h) { h = { w: [], b: [] }; hits.set(target.square, h); }
      h[piece.color].push(piece);
    }
  }
  const out = new Map<string, PieceSafety>();
  const sortByValue = (list: Cell[]): Cell[] => list.slice().sort((a, b) => (PIECE_VALUE[a.type] - PIECE_VALUE[b.type]) || a.square.localeCompare(b.square));
  for (const piece of board.flat()) {
    if (!piece) continue;
    const h = hits.get(piece.square) || { w: [], b: [] };
    const enemy: Color = piece.color === 'w' ? 'b' : 'w';
    const attackers = sortByValue(h[enemy]), all = sortByValue(h[piece.color]);
    const defenders = realDefenders(attackers, all);
    const kingOnly = all.filter((p) => !defenders.includes(p));
    const by = attackers[0] || null;
    let status: SafetyStatus = 'quiet';
    if (by) {
      if (!defenders.length) status = 'free';
      else if (PIECE_VALUE[by.type] < PIECE_VALUE[piece.type]) status = 'cheap';
      else status = 'held';
    }
    out.set(piece.square, { piece, attackers, defenders, kingOnly, by, status });
  }
  return out;
}
