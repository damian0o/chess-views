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

import { rays, crossings } from '../analysis.js';
const SCHOLAR_B = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';

test('rays: a sliding piece\'s road runs to the first piece, keeping an enemy it hits and stopping before a friend', () => {
  const r = rays(boardFromFen(SCHOLAR_B));
  const from = (sq) => r.filter((x) => x.from === sq);
  const bishopToF7 = from('c4').find((x) => x.squares.includes('f7'));
  assert.deepEqual(bishopToF7.squares, ['d5', 'e6', 'f7']);
  assert.equal(bishopToF7.hit, 'f7');
  assert.equal(bishopToF7.end, 'enemy');
  const queenToF7 = from('h5').find((x) => x.squares.includes('f7'));
  assert.deepEqual(queenToF7.squares, ['g6', 'f7']);
  const queenRank = from('h5').find((x) => x.squares.includes('g5'));
  assert.deepEqual(queenRank.squares, ['g5', 'f5', 'e5']);   // the e5 pawn is an enemy: the road ends on it
  assert.equal(queenRank.hit, 'e5');
  const queenDown = from('h5').find((x) => x.squares.includes('h4'));
  assert.deepEqual(queenDown.squares, ['h4', 'h3']);         // stops before the own pawn on h2
  assert.equal(queenDown.end, 'own');
  const edge = from('h5').find((x) => x.squares.includes('h6'));
  assert.deepEqual(edge.squares, ['h6', 'h7']); assert.equal(edge.end, 'enemy'); assert.equal(edge.hit, 'h7');
  assert.ok(r.every((x) => x.squares.length > 0), 'empty roads are left out');
  assert.ok(r.every((x) => 'rbq'.includes(x.piece.type)));
});

test('rays: in the start position no rook, bishop or queen has a road', () => {
  assert.deepEqual(rays(boardFromFen(START_FEN)), []);
});

test('crossings: squares where two roads of one side meet, enemy squares first', () => {
  const r = rays(boardFromFen(SCHOLAR_B));
  const x = crossings(r);
  const f7 = x.find((c) => c.square === 'f7');
  assert.ok(f7, 'f7 is a crossing');
  assert.equal(f7.color, 'w');
  assert.deepEqual(f7.from.sort(), ['c4', 'h5']);
  assert.equal(f7.hit, true);
  assert.equal(x[0].square, 'f7');          // a crossing on an enemy piece ranks first
});
