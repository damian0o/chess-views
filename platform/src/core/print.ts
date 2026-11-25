/** The print sheet as text: the letters board, the piece list and the FEN (the proof of concept's buildPrintSheet). */
import type { Fen } from './types';
import { boardFromFen, squareColor, squareName, symbol, type Board, type PieceType } from './analysis/board';

export type PrintSheet = { ranks: string[]; pieceList: string; fen: string; title?: string; notes?: string };

const NAMES: Readonly<Record<PieceType, string>> = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };
const ORDER: Readonly<Record<PieceType, number>> = { k: 0, q: 1, r: 2, b: 3, n: 4, p: 5 };

/** "White: K Q R R B(dark) B(light) N N 8 pawns\nBlack: …": a bishop names the colour of its squares. */
export function pieceList(board: Board): string {
  const words: Record<'w' | 'b', string[]> = { w: [], b: [] };
  const all = board.flat().filter((p) => p !== null).sort((x, y) => ORDER[x.type] - ORDER[y.type]);
  for (const p of all) {
    if (p.type === 'p') continue;
    words[p.color].push(p.type === 'b' ? `B(${squareColor(p.square)})` : NAMES[p.type]);
  }
  for (const c of ['w', 'b'] as const) {
    const pawns = all.filter((p) => p.color === c && p.type === 'p').length;
    if (pawns) words[c].push(`${pawns} pawn${pawns === 1 ? '' : 's'}`);
  }
  return `White: ${words.w.join(' ') || 'nothing'}\nBlack: ${words.b.join(' ') || 'nothing'}`;
}

/** Eight rank lines, top of the board first ("8 R' N' … 8"): a dot on an empty dark square, blank on a light one. */
export function printSheet(fen: Fen, opts: { flip: boolean; title?: string; notes?: string }): PrintSheet {
  const board = boardFromFen(fen);
  const order = opts.flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const ranks = order.map((row) => {
    const cells = order.map((col) => symbol(board[row]?.[col] ?? null, squareName(row, col)).padEnd(2));
    return `${8 - row} ${cells.join(' ')} ${8 - row}`;
  });
  return {
    ranks, pieceList: pieceList(board), fen,
    ...(opts.title !== undefined ? { title: opts.title } : {}),
    ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
  };
}
