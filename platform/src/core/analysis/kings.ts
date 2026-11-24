import type { Color, Square } from '../types';
import { squareIndex, squareName, type Board, type Cell, type PieceType } from './board';
import { absolutePinMap, attackMap, attacksFromPinned, type PinOptions } from './attacks';
import { FILES, cellAt, gridGet, onBoard } from './internal';
import { pins, type Pin } from './pins';

export type HouseCell = { square: Square; attackers: number; defenders: number; danger: boolean };
export type KingHouse = { king: Square; cells: HouseCell[] };
export type KingHouses = Record<Color, KingHouse | null>;

export function kingHouses(board: Board, { respectPins = false }: PinOptions = {}): KingHouses {
  const a = attackMap(board, { respectPins });
  const house = (color: Color): KingHouse | null => {
    let kr = -1, kc = -1;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const p = cellAt(board, row, col);
      if (p && p.type === 'k' && p.color === color) { kr = row; kc = col; }
    }
    if (kr < 0) return null;
    const enemy: Color = color === 'w' ? 'b' : 'w';
    const cells: HouseCell[] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = kr + dr, c = kc + dc;
      if (!onBoard(r, c)) continue;
      const attackers = gridGet(a[enemy], r, c), defenders = gridGet(a[color], r, c);
      cells.push({ square: squareName(r, c), attackers, defenders, danger: attackers > defenders });
    }
    return { king: squareName(kr, kc), cells };
  };
  return { w: house('w'), b: house('b') };
}

// ---------- king house report ----------

export type ReportCell = HouseCell & { balance: number };
export type ShieldStatus = 'pawn' | 'advanced' | 'missing';
export type HouseToucher = { square: Square; type: PieceType; color: Color; hits: Square[] };
export type KingSafetyLabel = 'Safe' | 'Strong' | 'Shaky' | 'In danger';
export type KingHouseReport = {
  king: Square;
  cells: ReportCell[];
  shield: { square: Square; status: ShieldStatus }[];
  openFiles: string[];
  aiming: HouseToucher[];
  defending: HouseToucher[];
  weakest: { square: Square; balance: number; needs: number };
  brokenSquares: number;
  shieldPawns: number;
  escapes: Square[];
  escapePenalty: number;
  pins: Pin[];
  pinPenalty: number;
  enemyForce: number;
  enemyForceWords: string;
  quiet: boolean;
  score: number;
  label: KingSafetyLabel;
};

const FORCE_VALUE: Partial<Record<PieceType, number>> = { q: 9, r: 5, b: 3, n: 3 };
const FORCE_WORD: Partial<Record<PieceType, string>> = { q: 'a queen', r: 'a rook', b: 'a bishop', n: 'a knight' };

/** Strengths, weaknesses and pressure on one king's 3x3 house. Null if that colour has no king. */
export function kingHouseReport(board: Board, color: Color): KingHouseReport | null {
  const houses = kingHouses(board, { respectPins: true });
  const house = houses[color];
  if (!house) return null;
  const rawCells = kingHouses(board)[color]?.cells ?? [];
  const pinMap = absolutePinMap(board);
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const { row: kr, col: kc } = squareIndex(house.king);
  const houseSet = new Set<string>(house.cells.map((c) => c.square));

  const cells: ReportCell[] = house.cells.map((c) => ({ ...c, balance: c.defenders - c.attackers }));

  // Shield: the three squares in front of the king.
  const forward = color === 'w' ? -1 : 1;
  const shield: KingHouseReport['shield'] = [];
  for (let dc = -1; dc <= 1; dc++) {
    const c = kc + dc, r = kr + forward;
    if (!onBoard(r, c)) continue;
    const sq = squareName(r, c);
    const here = cellAt(board, r, c);
    let status: ShieldStatus = 'missing';
    if (here && here.type === 'p' && here.color === color) status = 'pawn';
    else if (onBoard(r + forward, c)) {
      const up = cellAt(board, r + forward, c);
      if (up && up.type === 'p' && up.color === color) status = 'advanced';
    }
    shield.push({ square: sq, status });
  }

  // Files next to the king with no own pawn.
  const openFiles: string[] = [];
  for (let dc = -1; dc <= 1; dc++) {
    const c = kc + dc;
    if (c < 0 || c > 7) continue;
    const ownPawn = board.some((rowCells) => { const p = rowCells[c]; return !!p && p.type === 'p' && p.color === color; });
    if (!ownPawn) openFiles.push(FILES.charAt(c));
  }

  // Pieces touching the house.
  const aiming: HouseToucher[] = [], defending: HouseToucher[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = cellAt(board, r, c);
    if (!p || (p.type === 'k' && p.color === color)) continue;
    const hits = attacksFromPinned(board, r, c, pinMap).map(([ar, ac]) => squareName(ar, ac)).filter((sq) => houseSet.has(sq));
    if (!hits.length) continue;
    (p.color === enemy ? aiming : defending).push({ square: p.square, type: p.type, color: p.color, hits });
  }

  // The house always holds the king's own square, so `cells` is never empty.
  const weakestCell = cells.reduce((w, c) => (c.balance < w.balance ? c : w));
  const weakest = { square: weakestCell.square, balance: weakestCell.balance, needs: Math.max(0, weakestCell.balance + 1) };
  const brokenSquares = cells.filter((c) => c.balance < 0).length;
  const shieldPawns = shield.filter((s) => s.status === 'pawn').length;

  // Squares the king could step to right now: in the house, not its own square, not own-occupied, not attacked.
  // Escape squares use raw attacks: a pinned piece still gives check.
  const rawAttackers = new Map<string, number>(rawCells.map((c) => [c.square, c.attackers]));
  const escapes = cells
    .filter((c) => c.square !== house.king && rawAttackers.get(c.square) === 0)
    .filter((c) => { const { row, col } = squareIndex(c.square); const p = cellAt(board, row, col); return !p || p.color === enemy; })
    .map((c) => c.square);

  // What the opponent has to attack with (kings and pawns excluded).
  const enemyPieces = board.flat().filter((p): p is Cell => !!p && p.color === enemy && !!FORCE_VALUE[p.type]);
  const enemyForce = enemyPieces.reduce((n, p) => n + (FORCE_VALUE[p.type] ?? 0), 0);
  const enemyForceWords = enemyPieces.length ? enemyPieces.map((p) => FORCE_WORD[p.type] ?? '').join(' and ') : 'nothing';
  const quiet = enemyForce < 5;

  // Being boxed in only matters when somebody is aiming at the house.
  const escapePenalty = aiming.length ? (escapes.length === 0 ? 2 : escapes.length === 1 ? 1 : 0) : 0;
  // Pins against this side: pieces pinned to the king count against the house.
  const sidePins = pins(board).filter((p) => p.pinned.color === color);
  const pinPenalty = Math.min(2, sidePins.filter((p) => p.absolute).length);
  const score = shieldPawns - openFiles.length - brokenSquares - (aiming.length >= 3 ? 1 : 0) - escapePenalty - pinPenalty;
  const label: KingSafetyLabel = quiet ? 'Safe' : score >= 3 ? 'Strong' : score >= 1 ? 'Shaky' : 'In danger';

  return { king: house.king, cells, shield, openFiles, aiming, defending, weakest, brokenSquares, shieldPawns,
    escapes, escapePenalty, pins: sidePins, pinPenalty, enemyForce, enemyForceWords, quiet, score, label };
}
