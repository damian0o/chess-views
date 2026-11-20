import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, LINES, roads, activeOnRoads } from '../analysis.js';

const byId = (list, id) => list.find((l) => l.id === id);

test('LINES has 8 files, 8 ranks and 22 diagonals', () => {
  assert.equal(LINES.length, 38);
  assert.equal(LINES.filter((l) => l.kind === 'file').length, 8);
  assert.equal(LINES.filter((l) => l.kind === 'rank').length, 8);
  assert.equal(LINES.filter((l) => l.kind === 'diag').length, 22);
  assert.deepEqual(byId(LINES, 'a1-h8').squares, ['a1','b2','c3','d4','e5','f6','g7','h8']);
  assert.deepEqual(byId(LINES, 'a3-f8').squares, ['a3','b4','c5','d6','e7','f8']);
  assert.equal(byId(LINES, 'e').squares.length, 8);
  assert.equal(byId(LINES, '4').squares.length, 8);
  assert.ok(byId(LINES, 'a7-b8') === undefined, 'length-2 diagonals excluded');
});

test('roads in the start position', () => {
  const r = roads(boardFromFen(START_FEN));
  assert.equal(r.length, 38);
  for (const f of 'abcdefgh') assert.equal(byId(r, f).state, 'closed');
  assert.equal(byId(r, '1').state, 'open');
  assert.equal(byId(r, '2').state, 'half');
  assert.equal(byId(r, '7').state, 'half');
  assert.equal(byId(r, '5').state, 'open');
  assert.equal(byId(r, 'a1-h8').state, 'closed');
  assert.deepEqual(byId(r, '1').pieces.map((p) => p.square), ['a1','b1','c1','d1','e1','f1','g1','h1']);
});

test('open file with a rook is active', () => {
  const r = roads(boardFromFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'));
  assert.equal(byId(r, 'a').state, 'open');
  const active = activeOnRoads(r);
  assert.ok(active.has('a1'));
  assert.ok(!active.has('e1'));
});

test('bishop on an open diagonal is active, on a closed one is not', () => {
  const open = roads(boardFromFen('4k3/8/8/8/8/8/8/2B1K3 w - - 0 1'));
  assert.ok(activeOnRoads(open).has('c1'));
  const blocked = roads(boardFromFen('4k3/8/8/8/8/4p3/1P1P4/2B1K3 w - - 0 1'));
  assert.ok(!activeOnRoads(blocked).has('c1'));
});
