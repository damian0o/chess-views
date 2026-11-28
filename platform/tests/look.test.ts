import { describe, expect, test } from 'vitest';
import { BoardLookSchema } from '@core/types';
import { PLAIN, turnOn, turnOff, toggle, optionsOf, optionStates, lookOfView, OPTIONS, GROUPS } from '@core/look';

describe('board look rules', () => {
  test('an option replaces the other one of its group', () => {
    expect(turnOn({ pieces: 'pieces', moves: 'roads' }, 'reach')).toEqual({ pieces: 'pieces', moves: 'reach' });
    expect(turnOn({ pieces: 'pieces', strategy: 'kings' }, 'territory')).toEqual({ pieces: 'pieces', strategy: 'territory' });
  });
  test('moves and strategy mix', () => {
    expect(turnOn({ pieces: 'pieces', moves: 'roads' }, 'kings')).toEqual({ pieces: 'pieces', moves: 'roads', strategy: 'kings' });
  });
  test('pieces can be switched but never turned off', () => {
    expect(turnOff(PLAIN, 'pieces')).toEqual(PLAIN);
    expect(turnOn(PLAIN, 'hidden').pieces).toBe('hidden');
    expect(toggle({ pieces: 'blocks' }, 'blocks')).toEqual({ pieces: 'blocks' });
  });
  test('the diamond clears drawings, and they do not come back', () => {
    expect(turnOff(turnOn({ pieces: 'pieces', moves: 'roads', strategy: 'kings' }, 'diamond'), 'diamond')).toEqual(PLAIN);
  });
  test('no drawing on the diamond', () => {
    expect(turnOn({ pieces: 'pieces', diamond: true }, 'roads')).toEqual({ pieces: 'pieces', diamond: true });
  });
  test('toggle turns drawings and the engine on and off', () => {
    expect(toggle({ pieces: 'pieces', moves: 'roads' }, 'roads')).toEqual(PLAIN);
    expect(toggle(toggle(PLAIN, 'engine'), 'engine')).toEqual(PLAIN);
  });
  test('optionsOf lists what is on', () => {
    expect(optionsOf({ pieces: 'blocks', moves: 'roads', engine: true })).toEqual(['blocks', 'roads', 'engine']);
    expect(optionsOf(PLAIN)).toEqual([]);
  });
  test('optionStates: blocked on the diamond, locked when not unlocked', () => {
    const st = optionStates({ pieces: 'pieces', diamond: true }, { flip: true, names: false }, ['pieces', 'roads', 'territory', 'flip', 'diamond'], (id) => id === 'roads' || id === 'diamond');
    const by = Object.fromEntries(st.map((s) => [s.id, s]));
    expect(by.roads).toEqual({ id: 'roads', on: false, locked: false, blocked: true });
    expect(by.territory!.locked).toBe(true);
    expect(by.pieces).toEqual({ id: 'pieces', on: true, locked: false, blocked: false });
    expect(by.flip!.on).toBe(true);
    expect(by.diamond!.on).toBe(true);
  });
  test('old view ids map to looks', () => {
    expect(lookOfView('shapes')).toEqual({ pieces: 'blocks' });
    expect(lookOfView('territory').strategy).toBe('territory');
    expect(lookOfView('roads').moves).toBe('roads');
    expect(lookOfView('engine').engine).toBe(true);
    expect(lookOfView('diamond').diamond).toBe(true);
    expect(lookOfView('nope')).toEqual(PLAIN);
  });
  test('the schema rejects a drawing on the diamond', () => {
    expect(BoardLookSchema.safeParse({ pieces: 'pieces', diamond: true, moves: 'roads' }).success).toBe(false);
    expect(BoardLookSchema.safeParse({ pieces: 'blocks', moves: 'roads', strategy: 'kings' }).success).toBe(true);
  });
  test('every option has a group and a label; groups in order', () => {
    expect(GROUPS).toEqual(['pieces', 'moves', 'strategy', 'board', 'helper']);
    expect(OPTIONS.kings.group).toBe('strategy');
    expect(OPTIONS.flip.always && OPTIONS.names.always && OPTIONS.hidden.always).toBe(true);
    expect(OPTIONS.roads.always).toBe(false);
  });
});
