import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, kingHouseReport } from '../analysis.js';

test('start position: white house is strong', () => {
  const r = kingHouseReport(boardFromFen(START_FEN), 'w');
  assert.equal(r.king, 'e1');
  assert.deepEqual(r.shield.map((s) => [s.square, s.status]), [['d2', 'pawn'], ['e2', 'pawn'], ['f2', 'pawn']]);
  assert.deepEqual(r.openFiles, []);
  assert.deepEqual(r.aiming, []);
  assert.deepEqual(r.defending.map((p) => p.square).sort(), ['b1', 'c1', 'd1', 'f1', 'g1']);
  assert.equal(r.score, 3);
  assert.equal(r.label, 'Strong');
  assert.equal(r.weakest.needs, 2);
  assert.equal(r.cells.find((c) => c.square === 'e2').balance, 4);
});

test('castled king with open h-file under queen pressure is shaky', () => {
  const b = boardFromFen('4k2r/8/8/8/7q/8/5PP1/6K1 w k - 0 1');
  const r = kingHouseReport(b, 'w');
  assert.equal(r.king, 'g1');
  assert.deepEqual(r.shield.map((s) => s.status), ['pawn', 'pawn', 'missing']);
  assert.deepEqual(r.openFiles, ['h']);
  assert.deepEqual(r.aiming.map((p) => p.square), ['h4']);
  assert.deepEqual(r.defending, []);
  assert.equal(r.score, 1);
  assert.equal(r.label, 'Shaky');
  assert.equal(r.weakest.needs, 1);
  assert.equal(r.weakest.balance, 0);
  assert.equal(r.cells.find((c) => c.square === 'h2').attackers, 1);
});

test('bare king in the centre is in danger', () => {
  const r = kingHouseReport(boardFromFen('4k2r/8/8/8/7q/8/5PP1/6K1 w k - 0 1'), 'b');
  assert.deepEqual(r.shield.map((s) => s.status), ['missing', 'missing', 'missing']);
  assert.deepEqual(r.openFiles, ['d', 'e', 'f']);
  assert.equal(r.score, -3);
  assert.equal(r.label, 'In danger');
});

test('advanced shield pawn and a broken square', () => {
  // White king g1, pawns f2 g3 h2; black queen on h3 attacks g2 (0 defenders besides king → 1), black bishop c6 also hits g2 → broken.
  const r = kingHouseReport(boardFromFen('4k3/8/2b5/8/8/6Pq/5P1P/6K1 w - - 0 1'), 'w');
  assert.deepEqual(r.shield.map((s) => s.status), ['pawn', 'advanced', 'pawn']);
  const g2 = r.cells.find((c) => c.square === 'g2');
  assert.equal(g2.attackers, 2);
  assert.equal(g2.balance, -1);
  assert.equal(r.weakest.square, 'g2');
  assert.equal(r.weakest.needs, 0);
  assert.equal(r.brokenSquares, 1);
});

test('no king gives null', () => {
  assert.equal(kingHouseReport(boardFromFen('8/8/8/8/8/8/8/4K3'), 'b'), null);
});
