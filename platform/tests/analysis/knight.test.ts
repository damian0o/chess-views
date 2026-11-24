import { test } from 'vitest';
import assert from './assert';
import { boardFromFen, START_FEN, squareIndex, knightTracks, knightDistances, defaultKnightSquare, type KnightTrack } from '@core/analysis';

const EMPTY = '8/8/8/8/8/8/8/8';
const dir = (tracks: KnightTrack[], dr: number, dc: number) => tracks.find((t) => t.dir[0] === dr && t.dir[1] === dc)!;

test('knightTracks from f3 on an empty board', () => {
  const t = knightTracks(boardFromFen(EMPTY), 'f3');
  assert.equal(t.length, 8);
  assert.equal(t.reduce((n, x) => n + x.hops.length, 0), 12);
  assert.deepEqual(dir(t, -2, 1).hops.map((h) => [h.square, h.n]), [['g5', 1], ['h7', 2]]);
  assert.deepEqual(dir(t, 2, -1).hops.map((h) => [h.square, h.n]), [['e1', 1]]);
  assert.deepEqual(dir(t, -1, -2).hops.map((h) => h.square), ['d4', 'b5']);
});

test('knightTracks from a corner', () => {
  const t = knightTracks(boardFromFen(EMPTY), 'a1');
  assert.equal(t.filter((x) => x.hops.length > 0).length, 2);
  assert.deepEqual(dir(t, -2, 1).hops.map((h) => h.square), ['b3', 'c5', 'd7']);
  assert.deepEqual(dir(t, 2, 1).hops, []);
});

test('knightTracks hop status relative to the origin piece colour', () => {
  const t = knightTracks(boardFromFen('8/8/8/4p1P1/8/5N2/8/8'), 'f3');
  assert.equal(dir(t, -2, 1).hops[0]!.status, 'own');     // g5 white pawn
  assert.equal(dir(t, -2, -1).hops[0]!.status, 'enemy');  // e5 black pawn
  assert.equal(dir(t, -1, 2).hops[0]!.status, 'free');    // h4
});

test('knightDistances from a1', () => {
  const d = knightDistances('a1');
  const at = (sq: string) => { const { row, col } = squareIndex(sq); return d[row]![col]; };
  assert.equal(at('a1'), 0); assert.equal(at('b3'), 1); assert.equal(at('d4'), 2);
  assert.equal(at('a2'), 3); assert.equal(at('b2'), 4); assert.equal(at('h8'), 6);
});

test('defaultKnightSquare picks the side to move first', () => {
  const b = boardFromFen(START_FEN);
  assert.equal(defaultKnightSquare(b, 'w'), 'b1');
  assert.equal(defaultKnightSquare(b, 'b'), 'b8');
  assert.equal(defaultKnightSquare(boardFromFen('4k3/8/8/8/8/8/8/4K3'), 'w'), null);
  assert.equal(defaultKnightSquare(boardFromFen('4k3/8/8/8/8/8/8/4K1N1'), 'b'), 'g1');
});
