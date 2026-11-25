import { describe, expect, test } from 'vitest';
import { tapGuess } from '@core/guess';
import type { Fen, Square } from '@core/types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;
const PROMO = '8/P6k/8/8/8/8/8/K7 w - - 0 1' as Fen;
const sq = (s: string) => s as Square;

describe('tapGuess', () => {
  test('an opponent piece first is ignored as opponent', () => {
    expect(tapGuess({}, sq('e7'), START)).toEqual({ state: {}, result: { kind: 'ignore', reason: 'opponent' } });
  });
  test('an empty first tap is ignored as empty', () => {
    expect(tapGuess({}, sq('e4'), START).result).toEqual({ kind: 'ignore', reason: 'empty' });
  });
  test('own piece picks it; an illegal target is ignored as illegal and keeps the pick', () => {
    const a = tapGuess({}, sq('e2'), START);
    expect(a).toEqual({ state: { from: 'e2' }, result: { kind: 'pick', from: 'e2' } });
    expect(tapGuess(a.state, sq('e5'), START)).toEqual({ state: { from: 'e2' }, result: { kind: 'ignore', reason: 'illegal' } });
  });
  test('tapping another own piece switches the pick; tapping the same piece drops it', () => {
    const a = tapGuess({}, sq('e2'), START);
    expect(tapGuess(a.state, sq('g1'), START).result).toEqual({ kind: 'pick', from: 'g1' });
    expect(tapGuess(a.state, sq('e2'), START)).toEqual({ state: {}, result: { kind: 'drop' } });
  });
  test('a legal from→to is a guess; a pawn to the last rank promotes to a queen', () => {
    const a = tapGuess({}, sq('e2'), START);
    expect(tapGuess(a.state, sq('e4'), START)).toEqual({ state: {}, result: { kind: 'guess', move: { uci: 'e2e4', from: 'e2', to: 'e4' }, san: 'e4' } });
    const p = tapGuess({}, sq('a7'), PROMO);
    expect(tapGuess(p.state, sq('a8'), PROMO).result).toEqual({ kind: 'guess', move: { uci: 'a7a8q', from: 'a7', to: 'a8', promotion: 'q' }, san: 'a8=Q' });
  });
  test('never throws on a position with no legal moves', () => {
    const mate = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3' as Fen;
    expect(() => tapGuess({}, sq('e1'), mate)).not.toThrow();
    expect(tapGuess({}, sq('e1'), mate).result.kind).toBe('ignore');
  });
});
