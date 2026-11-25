import type { Color, Square } from '../types';
import { squareIndex, squareName, type Board, type Cell, type Coord, type PieceType } from './board';
import { FILES, cellAt, onBoard } from './internal';

export type LineKind = 'file' | 'rank' | 'diag';
export type Line = { id: string; kind: LineKind; squares: Square[] };
export type RoadState = 'open' | 'half' | 'closed';
export type Road = Line & { state: RoadState; pieces: Cell[] };
export type RayEnd = 'edge' | 'own' | 'enemy';
export type Ray = { from: Square; piece: Cell; dir: Coord; squares: Square[]; end: RayEnd; hit: Square | null };
export type Crossing = { square: Square; color: Color; from: Square[]; count: number; hit: boolean };

function buildLines(): Line[] {
  const lines: Line[] = [];
  for (let col = 0; col < 8; col++) {
    lines.push({ id: FILES.charAt(col), kind: 'file', squares: Array.from({ length: 8 }, (_, i) => squareName(7 - i, col)) });
  }
  for (let rank = 1; rank <= 8; rank++) {
    lines.push({ id: String(rank), kind: 'rank', squares: Array.from({ length: 8 }, (_, col) => squareName(8 - rank, col)) });
  }
  // Diagonals: walk from each starting square on the bottom/left edges going up-right, and bottom/right edges going up-left.
  const diag = (startRow: number, startCol: number, dc: number): void => {
    const squares: Square[] = [];
    let r = startRow, c = startCol;
    while (onBoard(r, c)) { squares.push(squareName(r, c)); r -= 1; c += dc; }
    if (squares.length >= 3) lines.push({ id: `${squares[0]}-${squares[squares.length - 1]}`, kind: 'diag', squares });
  };
  for (let col = 0; col < 8; col++) diag(7, col, 1);          // from rank 1 going up-right
  for (let row = 6; row >= 0; row--) diag(row, 0, 1);         // from a-file going up-right
  for (let col = 7; col >= 0; col--) diag(7, col, -1);        // from rank 1 going up-left
  for (let row = 6; row >= 0; row--) diag(row, 7, -1);        // from h-file going up-left
  return lines;
}

export const LINES: Line[] = buildLines();

export function roads(board: Board): Road[] {
  return LINES.map((line) => {
    const pieces = line.squares
      .map((sq) => { const { row, col } = squareIndex(sq); return cellAt(board, row, col); })
      .filter((p): p is Cell => Boolean(p));
    const pawnColors = new Set(pieces.filter((p) => p.type === 'p').map((p) => p.color));
    const state: RoadState = pawnColors.size === 0 ? 'open' : pawnColors.size === 1 ? 'half' : 'closed';
    return { id: line.id, kind: line.kind, squares: line.squares, state, pieces };
  });
}

/** Squares of rooks and queens on open files and bishops and queens on open diagonals. */
export function activeOnRoads(roadList: readonly Road[]): Set<string> {
  const active = new Set<string>();
  for (const road of roadList) {
    if (road.state !== 'open' || road.kind === 'rank') continue;
    const wants: PieceType[] = road.kind === 'file' ? ['r', 'q'] : ['b', 'q'];
    for (const p of road.pieces) if (wants.includes(p.type)) active.add(p.square);
  }
  return active;
}

const ROOK_RAYS: readonly Coord[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_RAYS: readonly Coord[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const RAY_DIRS: Partial<Record<PieceType, readonly Coord[]>> = { r: ROOK_RAYS, b: BISHOP_RAYS, q: [...ROOK_RAYS, ...BISHOP_RAYS] };

/**
 * Each rook, bishop and queen's roads: for every direction, the squares it reaches up to the first
 * piece, keeping an enemy piece it hits (`end: 'enemy'`, `hit`) and stopping before a friend (`'own'`)
 * or at the edge (`'edge'`). Directions with no square at all are left out.
 */
export function rays(board: Board): Ray[] {
  const out: Ray[] = [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const p = cellAt(board, row, col);
    const dirs = p ? RAY_DIRS[p.type] : undefined;
    if (!p || !dirs) continue;
    for (const [dr, dc] of dirs) {
      const squares: Square[] = [];
      let end: RayEnd = 'edge';
      let hit: Square | null = null;
      for (let r = row + dr, c = col + dc; onBoard(r, c); r += dr, c += dc) {
        const q = cellAt(board, r, c);
        if (q && q.color === p.color) { end = 'own'; break; }
        squares.push(squareName(r, c));
        if (q) { end = 'enemy'; hit = squareName(r, c); break; }
      }
      if (squares.length) out.push({ from: p.square, piece: p, dir: [dr, dc], squares, end, hit });
    }
  }
  return out;
}

export type BatteryRay = Ray & { through: Square[] };

/** Whether a piece of this type moves along a direction: bishops and queens diagonally, rooks and queens straight. */
export function movesAlong(type: PieceType, [dr, dc]: Coord): boolean {
  return dr !== 0 && dc !== 0 ? type === 'b' || type === 'q' : type === 'r' || type === 'q';
}

/**
 * Battery roads: a rook, bishop or queen standing behind its own piece that moves the same way (a
 * queen behind a bishop on a diagonal, doubled rooks) reaches on through it. `through` lists those
 * own pieces; `squares` are the squares after the last of them, up to and including the enemy piece
 * it hits. Batteries that hit no enemy piece are left out.
 */
export function batteryRays(board: Board): BatteryRay[] {
  const out: BatteryRay[] = [];
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const p = cellAt(board, row, col);
    const dirs = p ? RAY_DIRS[p.type] : undefined;
    if (!p || !dirs) continue;
    for (const dir of dirs) {
      const through: Square[] = [];
      let squares: Square[] = [];
      let end: RayEnd = 'edge';
      let hit: Square | null = null;
      for (let r = row + dir[0], c = col + dir[1]; onBoard(r, c); r += dir[0], c += dir[1]) {
        const q = cellAt(board, r, c);
        if (q && q.color === p.color) {
          if (movesAlong(q.type, dir)) { through.push(q.square); squares = []; continue; }
          end = 'own'; break;
        }
        squares.push(squareName(r, c));
        if (q) { end = 'enemy'; hit = q.square; break; }
      }
      // Only a battery that ends on an enemy piece matters; one running into empty squares is clutter.
      if (through.length && end === 'enemy') out.push({ from: p.square, piece: p, dir, squares, end, hit, through });
    }
  }
  return out;
}

/** Squares where two or more roads of one side meet: [{ square, color, from, count, hit }], enemy squares first. */
export function crossings(rayList: readonly Ray[]): Crossing[] {
  type Seen = { square: Square; color: Color; from: Set<Square>; hit: boolean };
  const seen = new Map<string, Seen>();   // `${color}:${square}` -> entry
  for (const ray of rayList) for (const sq of ray.squares) {
    const key = `${ray.piece.color}:${sq}`;
    const e = seen.get(key) || { square: sq, color: ray.piece.color, from: new Set<Square>(), hit: false };
    e.from.add(ray.from);
    if (ray.hit === sq) e.hit = true;
    seen.set(key, e);
  }
  return [...seen.values()].filter((e) => e.from.size >= 2)
    .map((e) => ({ square: e.square, color: e.color, from: [...e.from].sort(), count: e.from.size, hit: e.hit }))
    .sort((a, b) => (Number(b.hit) - Number(a.hit)) || (b.count - a.count) || a.square.localeCompare(b.square));
}

export type RoadHit = { square: Square; color: Color; from: Square[] };

/** Every piece a road runs into, with the squares of the pieces whose roads reach it (grouped by the attacking side). */
export function roadHits(rayList: readonly Ray[]): RoadHit[] {
  const by = new Map<string, RoadHit>();
  for (const r of rayList) {
    if (r.end !== 'enemy' || !r.hit) continue;
    const key = `${r.hit}|${r.piece.color}`;
    const h = by.get(key) ?? { square: r.hit, color: r.piece.color, from: [] };
    if (!h.from.includes(r.from)) h.from.push(r.from);
    by.set(key, h);
  }
  return [...by.values()];
}
