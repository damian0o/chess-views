import type { Color, Square } from '../types';
import { squareIndex, squareName, type Board, type Cell, type Coord, type PieceType } from './board';
import { BISHOP_DIRS, KING_OFFSETS, KNIGHT_OFFSETS, ROOK_DIRS, cellAt, emptyGrid, gridGet, gridSet, onBoard } from './internal';
import { pins, type Pin } from './pins';

export type PinMap = Map<Square, Pin>;
export type AttackMap = Record<Color, number[][]>;
export type PinOptions = { respectPins?: boolean };

/** Squares attacked by the piece at (row, col). Sliders stop at (and include) the first occupied square. */
export function attacksFrom(board: Board, row: number, col: number): Coord[] {
  const piece = cellAt(board, row, col);
  if (!piece) return [];
  const out: Coord[] = [];
  const push = (r: number, c: number): void => { if (onBoard(r, c)) out.push([r, c]); };
  const slide = (dirs: readonly Coord[]): void => {
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (onBoard(r, c)) {
        out.push([r, c]);
        if (cellAt(board, r, c)) break;
        r += dr; c += dc;
      }
    }
  };
  switch (piece.type) {
    case 'p': { const dr = piece.color === 'w' ? -1 : 1; push(row + dr, col - 1); push(row + dr, col + 1); break; }
    case 'n': KNIGHT_OFFSETS.forEach(([dr, dc]) => push(row + dr, col + dc)); break;
    case 'k': KING_OFFSETS.forEach(([dr, dc]) => push(row + dr, col + dc)); break;
    case 'b': slide(BISHOP_DIRS); break;
    case 'r': slide(ROOK_DIRS); break;
    case 'q': slide(BISHOP_DIRS); slide(ROOK_DIRS); break;
  }
  return out;
}

/** Map of square → pin for every piece pinned to its king (the strongest pin per square). */
export function absolutePinMap(board: Board): PinMap {
  const m: PinMap = new Map();
  for (const pn of pins(board)) if (pn.absolute) m.set(pn.pinned.square, pn);
  return m;
}

/** Attacks from (row, col); with a pin map, a piece pinned to its king only attacks along the pin line. */
export function attacksFromPinned(board: Board, row: number, col: number, pinMap?: PinMap | null): Coord[] {
  const piece = cellAt(board, row, col);
  const all = attacksFrom(board, row, col);
  const pn = pinMap && piece ? pinMap.get(piece.square) : undefined;
  if (!pn) return all;
  const line = new Set<string>(pn.between.concat([pn.pinner.square, pn.target.square]));
  return all.filter(([r, c]) => line.has(squareName(r, c)));
}

export function attackMap(board: Board, { respectPins = false }: PinOptions = {}): AttackMap {
  const map: AttackMap = { w: emptyGrid(0), b: emptyGrid(0) };
  const pinMap = respectPins ? absolutePinMap(board) : null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = cellAt(board, row, col);
      if (!piece) continue;
      const grid = map[piece.color];
      for (const [r, c] of attacksFromPinned(board, row, col, pinMap)) gridSet(grid, r, c, gridGet(grid, r, c) + 1);
    }
  }
  return map;
}

const TYPE_ORDER: Readonly<Record<PieceType, number>> = { k: 0, q: 1, r: 2, b: 3, n: 4, p: 5 };

/** The pieces of each colour that attack `square` (a piece pinned to its king only along its pin line). */
export function attackersOf(board: Board, square: string, { respectPins = true }: PinOptions = {}): Record<Color, Cell[]> {
  const pinMap = respectPins ? absolutePinMap(board) : null;
  const target = squareIndex(square);
  const out: Record<Color, Cell[]> = { w: [], b: [] };
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const piece = cellAt(board, row, col);
    if (!piece) continue;
    if (attacksFromPinned(board, row, col, pinMap).some(([r, c]) => r === target.row && c === target.col)) out[piece.color].push(piece);
  }
  for (const c of ['w', 'b'] as const) out[c].sort((a, b) => (TYPE_ORDER[a.type] - TYPE_ORDER[b.type]) || a.square.localeCompare(b.square));
  return out;
}
