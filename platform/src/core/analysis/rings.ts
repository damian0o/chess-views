import type { Color, Square } from '../types';
import { squareIndex, type Board, type Cell, type Coord } from './board';
import { cellAt, onBoard } from './internal';
import { attackersOf } from './attacks';
import { realDefenders } from './safety';
import { movesAlong, type Ray } from './roads';

export type RingStyle = 'free' | 'contested' | 'held';
export type RoadRing = {
  square: Square;
  /** The attacking side. */
  color: Color;
  attackers: Square[];
  /** The defenders that can really take back (see realDefenders). */
  defenders: Square[];
  /** Attackers minus real defenders. */
  balance: number;
  style: RingStyle;
  /** Stroke width: thicker the more the attackers outnumber the defenders. */
  width: number;
};
export type PawnGuard = { square: Square; by: Color; pawns: Square[] };

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const DIRS: readonly Coord[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Pieces lined up behind a direct attacker of `square` that reach it through that attacker: walking
 * out from the square, the first piece must be one of `direct` and move along the line, and every
 * piece of its side behind it that also moves along the line counts, until anything else.
 */
function behind(board: Board, square: Square, direct: readonly Cell[]): Cell[] {
  const { row, col } = squareIndex(square);
  const out: Cell[] = [];
  for (const dir of DIRS) {
    let front: Cell | null = null;
    for (let r = row + dir[0], c = col + dir[1]; onBoard(r, c); r += dir[0], c += dir[1]) {
      const q = cellAt(board, r, c);
      if (!q) continue;
      if (!front) {
        if (!movesAlong(q.type, dir) || !direct.some((d) => d.square === q.square)) break;
        front = q; continue;
      }
      if (q.color !== front.color || !movesAlong(q.type, dir)) break;
      out.push(q);
    }
  }
  return out;
}

/**
 * One ring per piece under attack, whoever attacks it (a road's end, but also a knight or a pawn);
 * pins respected; pieces lined up behind an attacker or defender count too. As the proof of concept's roads view: free when nobody can really take back, held
 * when the real defenders match or outnumber the attackers, otherwise contested.
 */
export function roadRings(board: Board): RoadRing[] {
  const out: RoadRing[] = [];
  for (const p of board.flat()) {
    if (!p) continue;
    const color = other(p.color);
    const who = attackersOf(board, p.square);
    if (!who[color].length) continue;
    // Pieces lined up behind an attacker or a defender (a battery) join in once the front one has gone.
    const attackers = [...who[color], ...behind(board, p.square, who[color])];
    const defenders = realDefenders(attackers, [...who[p.color], ...behind(board, p.square, who[p.color])]);
    const balance = attackers.length - defenders.length;
    const style: RingStyle = !defenders.length ? 'free' : defenders.length >= attackers.length ? 'held' : 'contested';
    out.push({
      square: p.square, color,
      attackers: attackers.map((q) => q.square), defenders: defenders.map((q) => q.square),
      balance, style, width: 0.08 + 0.05 * Math.max(0, Math.min(3, balance)),
    });
  }
  return out;
}

/** Road squares (not the piece a road hits) an enemy pawn attacks: land there and a pawn takes you. Pins respected. */
export function pawnGuards(board: Board, rayList: readonly Ray[]): PawnGuard[] {
  const guarded = new Map<string, PawnGuard>();
  for (const ray of rayList) for (const sq of ray.squares) {
    if (sq === ray.hit) continue;
    const key = `${ray.piece.color}:${sq}`;
    if (guarded.has(key)) continue;
    const by = other(ray.piece.color);
    const pawns = attackersOf(board, sq)[by].filter((q) => q.type === 'p').map((q) => q.square);
    if (pawns.length) guarded.set(key, { square: sq, by, pawns });
  }
  return [...guarded.values()];
}
