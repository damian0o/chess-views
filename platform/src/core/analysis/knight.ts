import type { Color, Square } from '../types';
import { squareIndex, squareName, type Board, type Cell, type Coord } from './board';
import { KNIGHT_OFFSETS, cellAt, emptyGrid, gridGet, gridSet, onBoard } from './internal';

export type HopStatus = 'free' | 'own' | 'enemy';
export type KnightHop = { square: Square; n: number; status: HopStatus };
export type KnightTrack = { dir: Coord; hops: KnightHop[] };
export type KnightJump = { square: Square; colors: Color[] };

export const KNIGHT_DIRS: readonly Coord[] = KNIGHT_OFFSETS;

/** The knight's 8 straight tracks from `origin`: hop squares with hop number and landing status. */
export function knightTracks(board: Board, origin: string): KnightTrack[] {
  const { row, col } = squareIndex(origin);
  const originPiece = cellAt(board, row, col);
  const color: Color = originPiece ? originPiece.color : 'w';
  return KNIGHT_DIRS.map(([dr, dc]) => {
    const hops: KnightHop[] = [];
    let r = row + dr, c = col + dc, n = 1;
    while (onBoard(r, c)) {
      const p = cellAt(board, r, c);
      hops.push({ square: squareName(r, c), n, status: !p ? 'free' : p.color === color ? 'own' : 'enemy' });
      r += dr; c += dc; n += 1;
    }
    return { dir: [dr, dc], hops };
  });
}

/** Squares every knight on the board can jump to right now (free or enemy-occupied), with the colours that reach each. */
export function knightJumps(board: Board): KnightJump[] {
  const reach = new Map<Square, Set<Color>>();
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = cellAt(board, r, c);
    if (!p || p.type !== 'n') continue;
    for (const [dr, dc] of KNIGHT_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (!onBoard(nr, nc)) continue;
      const t = cellAt(board, nr, nc);
      if (t && t.color === p.color) continue;
      const sq = squareName(nr, nc);
      let colors = reach.get(sq);
      if (!colors) { colors = new Set(); reach.set(sq, colors); }
      colors.add(p.color);
    }
  }
  return [...reach].map(([square, colors]) => ({ square, colors: (['w', 'b'] as const).filter((c) => colors.has(c)) }));
}

/** Minimum knight moves from `origin` to every square on an empty board. */
export function knightDistances(origin: string): number[][] {
  const d = emptyGrid(-1);
  const { row, col } = squareIndex(origin);
  gridSet(d, row, col, 0);
  const queue: Coord[] = [[row, col]];
  for (let next = queue.shift(); next; next = queue.shift()) {
    const [r, c] = next;
    for (const [dr, dc] of KNIGHT_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (onBoard(nr, nc) && gridGet(d, nr, nc) < 0) { gridSet(d, nr, nc, gridGet(d, r, c) + 1); queue.push([nr, nc]); }
    }
  }
  return d;
}

/** First knight of `turn`'s side, else any knight, else null. */
export function defaultKnightSquare(board: Board, turn: Color): Square | null {
  const knights = board.flat().filter((p): p is Cell => !!p && p.type === 'n');
  const own = knights.find((p) => p.color === turn);
  return (own || knights[0] || null)?.square ?? null;
}
