import { expect, test } from 'vitest';
import { openSession, sessionFromParams, sessionParams, type Session } from '@core/session';

const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
const ok = (s: unknown) => s as Session;

test('Review Focus 3: an old view= link opens with that look', () => {
  const s = ok(sessionFromParams(new URLSearchParams({ fen: SCHOLAR, view: 'territory' })));
  expect(s.look).toEqual({ pieces: 'pieces', strategy: 'territory' });
  expect(ok(sessionFromParams(new URLSearchParams({ fen: SCHOLAR, view: 'shapes' }))).look).toEqual({ pieces: 'blocks' });
});
test('group parameters win over an old view=', () => {
  const s = ok(sessionFromParams(new URLSearchParams({ fen: SCHOLAR, view: 'territory', strategy: 'kings', moves: 'roads' })));
  expect(s.look).toEqual({ pieces: 'pieces', moves: 'roads', strategy: 'kings' });
});
test('a mixed look and flip round-trip through the address', () => {
  const s = ok(openSession(SCHOLAR, { look: { pieces: 'blocks', moves: 'roads', strategy: 'kings', engine: true }, flip: true }));
  const p = sessionParams(s);
  expect(p.get('pieces')).toBe('blocks');
  expect(p.get('moves')).toBe('roads');
  expect(p.get('strategy')).toBe('kings');
  expect(p.get('engine')).toBe('1');
  expect(p.get('flip')).toBe('1');
  expect(p.has('view')).toBe(false);
  const back = ok(sessionFromParams(p));
  expect([back.look, back.flip]).toEqual([s.look, true]);
});
test('a plain look writes no look parameters; bad values are ignored', () => {
  const p = sessionParams(ok(openSession(SCHOLAR)));
  expect(['pieces', 'moves', 'strategy', 'diamond', 'engine'].filter((k) => p.has(k))).toEqual([]);
  expect(ok(sessionFromParams(new URLSearchParams({ fen: SCHOLAR, moves: 'nope', pieces: 'x' }))).look).toEqual({ pieces: 'pieces' });
});
test('the diamond from the address clears drawings', () => {
  expect(ok(sessionFromParams(new URLSearchParams({ fen: SCHOLAR, moves: 'roads', diamond: '1' }))).look).toEqual({ pieces: 'pieces', diamond: true });
});
