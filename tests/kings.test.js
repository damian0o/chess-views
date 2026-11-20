import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, kingHouses } from '../analysis.js';

const cell = (house, sq) => house.cells.find((c) => c.square === sq);

test('king houses in the start position', () => {
  const h = kingHouses(boardFromFen(START_FEN));
  assert.equal(h.w.king, 'e1');
  assert.deepEqual(h.w.cells.map((c) => c.square).sort(), ['d1','d2','e1','e2','f1','f2']);
  assert.equal(cell(h.w, 'f2').defenders, 1);
  assert.equal(cell(h.w, 'f2').attackers, 0);
  assert.ok(h.w.cells.every((c) => !c.danger));
  assert.equal(h.b.king, 'e8');
});

test('king house under queen attack', () => {
  const h = kingHouses(boardFromFen('4k3/8/8/8/8/8/5q2/4K3 w - - 0 1'));
  assert.deepEqual([cell(h.w, 'f2').attackers, cell(h.w, 'f2').defenders], [0, 1]);
  assert.deepEqual([cell(h.w, 'f1').attackers, cell(h.w, 'f1').defenders, cell(h.w, 'f1').danger], [1, 1, false]);
  assert.deepEqual([cell(h.w, 'e2').attackers, cell(h.w, 'e2').defenders], [1, 1]);
  assert.deepEqual([cell(h.w, 'e1').attackers, cell(h.w, 'e1').defenders, cell(h.w, 'e1').danger], [1, 0, true]);
  assert.equal(cell(h.w, 'd1').attackers, 0);
});

test('missing king gives null house', () => {
  const h = kingHouses(boardFromFen('8/8/8/8/8/8/8/4K3 w - - 0 1'));
  assert.equal(h.b, null);
  assert.equal(h.w.king, 'e1');
});
