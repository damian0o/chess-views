import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, knightJumps } from '../analysis.js';

const bySquare = (list) => Object.fromEntries(list.map((j) => [j.square, j.colors.join('')]));

test('knightJumps: start position, each knight reaches its two free squares, never its own pieces', () => {
  const jumps = bySquare(knightJumps(boardFromFen(START_FEN)));
  assert.deepEqual(jumps, { a3: 'w', c3: 'w', f3: 'w', h3: 'w', a6: 'b', c6: 'b', f6: 'b', h6: 'b' });
});

test('knightJumps: a square both sides can jump to lists both colours, enemy pieces count as reachable', () => {
  // White knight b1, black knight b5, white pawn d4 (black can take it), white pawn d2 (white's own).
  const jumps = bySquare(knightJumps(boardFromFen('4k3/8/8/1n6/3P4/8/3P4/1N2K3 w - - 0 1')));
  assert.equal(jumps.a3, 'wb');
  assert.equal(jumps.c3, 'wb');
  assert.equal(jumps.d2, undefined);
  assert.equal(jumps.d4, 'b');
  assert.equal(jumps.a7, 'b');
});
