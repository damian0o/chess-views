/** Position analysis: pure functions over a plain 8x8 board (row 0 = rank 8, col 0 = file a). */
import type { BoardLook, Fen } from '../types';
import { boardFromFen } from './board';
import { kingHouses, type KingHouses } from './kings';
import { knightJumps, type KnightJump } from './knight';
import { mobility, type Mobility } from './mobility';
import { pieceGroups, type PieceGroup } from './shapes';
import { pieceSafety, type PieceSafety } from './safety';
import { pins, type Pin } from './pins';
import { batteryRays, crossings, rays, type BatteryRay, type Crossing, type Ray } from './roads';
import { territory, type Territory } from './territory';
import { diamondRows, type DiamondCell } from './diamond';
import { pawnGuards, roadRings, type PawnGuard, type RoadRing } from './rings';

export * from './board';
export * from './attacks';
export * from './territory';
export * from './safety';
export * from './mobility';
export * from './roads';
export * from './kings';
export * from './shapes';
export * from './diamond';
export * from './knight';
export * from './pins';
export * from './pawns';
export * from './input';
export * from './rings';

/** What `analyse` computed, one field per layer; a field is present only when its layer was asked for. */
export type LayerData = {
  territory?: Territory;
  reach?: Mobility;
  roads?: { rays: Ray[]; batteries: BatteryRay[]; crossings: Crossing[]; rings: RoadRing[]; pawnGuards: PawnGuard[] };
  kings?: KingHouses;
  shapes?: PieceGroup[];
  diamond?: DiamondCell[][];
  knight?: KnightJump[];
  safety?: Map<string, PieceSafety>;
  pins?: Pin[];
};

/**
 * Computes the data the requested layers draw, and nothing else. Following the proof of concept's
 * views, `territory` also brings `safety` (the territory view marks hanging pieces) and `roads` also
 * brings `pins` (the roads view marks frozen pieces), and roads carry the rings on attacked pieces and
 * the pawn-guarded road squares. Reach and king houses respect pins.
 * Blocks bring `shapes`, the diamond its rows. The engine and plain pieces need no analysis.
 */
export function analyse(fen: Fen, look: BoardLook): LayerData {
  const board = boardFromFen(fen);
  const want = new Set<string>([look.moves, look.strategy, look.pieces === 'blocks' ? 'shapes' : undefined, look.diamond ? 'diamond' : undefined].filter((x): x is string => !!x));
  const out: LayerData = {};
  if (want.has('territory')) {
    out.territory = territory(board);
    out.safety = pieceSafety(board);
  }
  if (want.has('reach')) out.reach = mobility(board, { respectPins: true });
  if (want.has('roads')) {
    const r = rays(board);
    out.roads = { rays: r, batteries: batteryRays(board), crossings: crossings(r), rings: roadRings(board), pawnGuards: pawnGuards(board, r) };
    out.pins = pins(board);
  }
  if (want.has('kings')) out.kings = kingHouses(board, { respectPins: true });
  if (want.has('shapes')) out.shapes = pieceGroups(board);
  if (want.has('diamond')) out.diamond = diamondRows(board);
  if (want.has('knight')) out.knight = knightJumps(board);
  return out;
}
