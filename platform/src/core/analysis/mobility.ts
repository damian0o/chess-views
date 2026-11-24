import type { Color, Square } from '../types';
import { squareIndex, squareName, type Board, type PieceType } from './board';
import { attackMap, attacksFrom, type PinOptions } from './attacks';
import { cellAt, gridGet, onBoard } from './internal';
import { pins, type Pin } from './pins';

export type MobilityPiece = {
  square: Square;
  type: PieceType;
  color: Color;
  count: number;
  pinned: 'absolute' | 'relative' | null;
};
export type Mobility = { pieces: MobilityPiece[]; summary: Record<Color, number> };
export type MobilityTone = 'low' | 'mid' | 'high';

/** Pseudo-legal destination squares for the piece at (row, col): no castling, no en passant, check ignored. */
export function destinationsFrom(board: Board, row: number, col: number): Square[] {
  const piece = cellAt(board, row, col);
  if (!piece) return [];
  const out: Square[] = [];
  if (piece.type === 'p') {
    const dr = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    if (onBoard(row + dr, col) && !cellAt(board, row + dr, col)) {
      out.push(squareName(row + dr, col));
      if (row === startRow && !cellAt(board, row + 2 * dr, col)) out.push(squareName(row + 2 * dr, col));
    }
    for (const dc of [-1, 1]) {
      const r = row + dr, c = col + dc;
      const t = onBoard(r, c) ? cellAt(board, r, c) : null;
      if (t && t.color !== piece.color) out.push(squareName(r, c));
    }
    return out;
  }
  return attacksFrom(board, row, col)
    .filter(([r, c]) => { const t = cellAt(board, r, c); return !t || t.color !== piece.color; })
    .map(([r, c]) => squareName(r, c));
}

export function movesFrom(board: Board, row: number, col: number): number {
  return destinationsFrom(board, row, col).length;
}

/**
 * Mobility per piece: squares a piece can move to; for pawns, the squares it attacks. With { respectPins: true } a piece pinned to its king may only move along the
 * pin line (towards or capturing the pinner); pieces pinned to lesser targets are flagged but unrestricted.
 */
export function mobility(board: Board, { respectPins = false }: PinOptions = {}): Mobility {
  const pieces: MobilityPiece[] = [];
  const summary: Record<Color, number> = { w: 0, b: 0 };
  const pinInfo = new Map<Square, Pin>();
  if (respectPins) {
    for (const pn of pins(board)) {
      const prev = pinInfo.get(pn.pinned.square);
      if (!prev || (pn.absolute && !prev.absolute)) pinInfo.set(pn.pinned.square, pn);
    }
  }
  const enemyAttacks = attackMap(board);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = cellAt(board, row, col);
      if (!piece) continue;
      // Pawns count the squares they attack (their real influence); other pieces the squares they can move to.
      let dests = piece.type === 'p'
        ? attacksFrom(board, row, col).map(([r, c]) => squareName(r, c))
        : destinationsFrom(board, row, col);
      if (piece.type === 'k') {
        // A king may not step onto a square the enemy attacks.
        const enemy: Color = piece.color === 'w' ? 'b' : 'w';
        dests = dests.filter((sq) => { const { row: r, col: c } = squareIndex(sq); return gridGet(enemyAttacks[enemy], r, c) === 0; });
      }
      const pn = pinInfo.get(piece.square);
      if (pn && pn.absolute) {
        // Squares strictly between pinner and target, plus the pinner itself.
        const line = new Set(pn.between.concat([pn.pinner.square]));
        line.delete(piece.square);
        dests = dests.filter((sq) => line.has(sq));
      }
      const count = dests.length;
      pieces.push({ square: piece.square, type: piece.type, color: piece.color, count, pinned: pn ? (pn.absolute ? 'absolute' : 'relative') : null });
      summary[piece.color] += count;
    }
  }
  return { pieces, summary };
}

export function mobilityTone(count: number): MobilityTone {
  return count <= 2 ? 'low' : count <= 6 ? 'mid' : 'high';
}
