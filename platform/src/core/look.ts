/**
 * The board look: what a board shows, in five groups. Bierki (how the pieces look, exactly one), Ruchy and
 * Strategia (at most one drawing each), Plansza (diamond, flip, square names) and Pomocnik (the engine).
 * The switching rules live here, shared by the lesson run and the free board.
 */
import { MOVES_DRAWINGS, OPTION_IDS, PIECES_MODES, STRATEGY_DRAWINGS, type BoardLook, type OptionId } from './types';
import type { MessageKey } from './i18n/index';

export type Group = 'pieces' | 'moves' | 'strategy' | 'board' | 'helper';
export const GROUPS: Group[] = ['pieces', 'moves', 'strategy', 'board', 'helper'];

export interface OptionInfo { group: Group; label: MessageKey; legend?: MessageKey; always: boolean }
export const OPTIONS: Record<OptionId, OptionInfo> = {
  pieces: { group: 'pieces', label: 'optPieces', legend: 'legendBoard', always: true },
  blocks: { group: 'pieces', label: 'optBlocks', legend: 'legendShapes', always: true },
  hidden: { group: 'pieces', label: 'optHidden', legend: 'legendHidden', always: true },
  roads: { group: 'moves', label: 'optRoads', legend: 'legendRoads', always: false },
  reach: { group: 'moves', label: 'optReach', legend: 'legendReach', always: false },
  knight: { group: 'moves', label: 'optKnight', legend: 'legendKnight', always: false },
  territory: { group: 'strategy', label: 'optTerritory', legend: 'legendTerritory', always: false },
  kings: { group: 'strategy', label: 'optKings', legend: 'legendKings', always: false },
  diamond: { group: 'board', label: 'optDiamond', legend: 'legendDiamond', always: false },
  flip: { group: 'board', label: 'optFlip', always: true },
  names: { group: 'board', label: 'optNames', always: true },
  engine: { group: 'helper', label: 'optEngine', legend: 'legendEngine', always: false },
};
export const GROUP_LABEL: Record<Group, MessageKey> = {
  pieces: 'rowPieces', moves: 'rowMoves', strategy: 'rowStrategy', board: 'rowBoard', helper: 'rowHelper',
};

export const PLAIN: BoardLook = { pieces: 'pieces' };

const isPiecesMode = (id: OptionId): id is BoardLook['pieces'] => (PIECES_MODES as readonly string[]).includes(id);
const isMoves = (id: OptionId): id is NonNullable<BoardLook['moves']> => (MOVES_DRAWINGS as readonly string[]).includes(id);
const isStrategy = (id: OptionId): id is NonNullable<BoardLook['strategy']> => (STRATEGY_DRAWINGS as readonly string[]).includes(id);

/** Drop unset fields, so equal looks compare equal. */
function tidy(l: BoardLook): BoardLook {
  return {
    pieces: l.pieces,
    ...(l.moves ? { moves: l.moves } : {}),
    ...(l.strategy ? { strategy: l.strategy } : {}),
    ...(l.diamond ? { diamond: true } : {}),
    ...(l.engine ? { engine: true } : {}),
  };
}

/** Whether an option is on. Flip and square names are not part of a look: always false here. */
export function isOn(look: BoardLook, id: OptionId): boolean {
  if (isPiecesMode(id)) return look.pieces === id;
  if (isMoves(id)) return look.moves === id;
  if (isStrategy(id)) return look.strategy === id;
  if (id === 'diamond') return !!look.diamond;
  if (id === 'engine') return !!look.engine;
  return false;
}

/** Turn an option on: it replaces the other one of its group; the diamond clears drawings; no drawing goes on the diamond. */
export function turnOn(look: BoardLook, id: OptionId): BoardLook {
  if (isPiecesMode(id)) return tidy({ ...look, pieces: id });
  if (isMoves(id)) return look.diamond ? tidy(look) : tidy({ ...look, moves: id });
  if (isStrategy(id)) return look.diamond ? tidy(look) : tidy({ ...look, strategy: id });
  if (id === 'diamond') return tidy({ ...look, diamond: true, moves: undefined, strategy: undefined });
  if (id === 'engine') return tidy({ ...look, engine: true });
  return tidy(look);
}

/** Turn an option off. The pieces group is never empty, so its options cannot be turned off. */
export function turnOff(look: BoardLook, id: OptionId): BoardLook {
  if (isMoves(id) && look.moves === id) return tidy({ ...look, moves: undefined });
  if (isStrategy(id) && look.strategy === id) return tidy({ ...look, strategy: undefined });
  if (id === 'diamond') return tidy({ ...look, diamond: false });
  if (id === 'engine') return tidy({ ...look, engine: false });
  return tidy(look);
}

export const toggle = (look: BoardLook, id: OptionId): BoardLook => (isOn(look, id) ? turnOff(look, id) : turnOn(look, id));

/** The options a look has on, in picker order; the plain pieces mode is left out (it is the default). */
export function optionsOf(look: BoardLook): OptionId[] {
  return OPTION_IDS.filter((id) => id !== 'pieces' && isOn(look, id));
}

/** One picker button: on, locked (not unlocked yet), blocked (a drawing while the diamond is on). */
export interface OptionState { id: OptionId; on: boolean; locked: boolean; blocked: boolean }

export function optionStates(look: BoardLook, extra: { flip: boolean; names: boolean }, shown: readonly OptionId[], unlocked: (id: OptionId) => boolean): OptionState[] {
  return OPTION_IDS.filter((id) => shown.includes(id)).map((id) => ({
    id,
    on: id === 'flip' ? extra.flip : id === 'names' ? extra.names : isOn(look, id),
    locked: !OPTIONS[id].always && !unlocked(id),
    blocked: !!look.diamond && (isMoves(id) || isStrategy(id)),
  }));
}

/** The look of an old view id (links and library entries from before the groups). */
export function lookOfView(view: string): BoardLook {
  if (view === 'shapes') return { pieces: 'blocks' };
  if ((OPTION_IDS as readonly string[]).includes(view) && view !== 'flip' && view !== 'names') return turnOn(PLAIN, view as OptionId);
  return PLAIN;
}
