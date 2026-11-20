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
  assert.equal(r.score, 0); // 2 shield − 1 open file − 1 for a single escape square
  assert.equal(r.label, 'In danger');
  assert.equal(r.weakest.needs, 1);
  assert.equal(r.weakest.balance, 0);
  assert.equal(r.cells.find((c) => c.square === 'h2').attackers, 1);
});

test('bare king in the centre facing only pawns is Safe', () => {
  const r = kingHouseReport(boardFromFen('4k2r/8/8/8/7q/8/5PP1/6K1 w k - 0 1'), 'b');
  assert.deepEqual(r.shield.map((s) => s.status), ['missing', 'missing', 'missing']);
  assert.deepEqual(r.openFiles, ['d', 'e', 'f']);
  assert.equal(r.score, -3);
  assert.equal(r.quiet, true); // White has only pawns, so the bare king is Safe for now
  assert.equal(r.label, 'Safe');
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

const STUDY = 'kb4Q1/1p6/1P6/8/1N6/1K6/8/8 w - - 0 1';

test('a king nobody can attack is Safe, whatever its shield', () => {
  const r = kingHouseReport(boardFromFen(STUDY), 'w');
  assert.equal(r.enemyForce, 3);
  assert.equal(r.quiet, true);
  assert.equal(r.label, 'Safe');
  assert.deepEqual(r.escapes.sort(), ['a2', 'a3', 'a4', 'b2', 'c2', 'c3', 'c4']);
});

test('a boxed-in king under attack is In danger even with a decent score', () => {
  const r = kingHouseReport(boardFromFen(STUDY), 'b');
  assert.equal(r.quiet, false);
  assert.deepEqual(r.escapes, []);
  assert.equal(r.escapePenalty, 2);
  assert.equal(r.label, 'In danger');
});

test('boxed in by own pieces with nobody aiming is not penalised', () => {
  const r = kingHouseReport(boardFromFen(START_FEN), 'w');
  assert.deepEqual(r.escapes, []);
  assert.equal(r.escapePenalty, 0);
  assert.equal(r.label, 'Strong');
});

test('escape squares exclude attacked and own-occupied squares', () => {
  const r = kingHouseReport(boardFromFen('4k2r/8/8/8/7q/8/5PP1/6K1 w k - 0 1'), 'w');
  assert.deepEqual(r.escapes, ['f1']);
  assert.equal(r.escapePenalty, 1);
  assert.equal(r.label, 'In danger');
});

test('pinned defenders do not count in the house, but still deny escape squares', () => {
  const r = kingHouseReport(boardFromFen('kb4Q1/1p6/1P6/8/1N6/1K6/8/8 w - - 0 1'), 'b');
  assert.equal(r.cells.find((c) => c.square === 'a7').defenders, 1); // king only, the bishop is pinned
  assert.deepEqual(r.defending, []);
  // Rc8 pins Bc6 to Kc1; the bishop still stops the black king stepping to d7.
  const b = kingHouseReport(boardFromFen('2r1k3/8/2B5/8/8/8/8/2K5 w - - 0 1'), 'b');
  assert.equal(b.cells.find((c) => c.square === 'd7').attackers, 0);
  assert.ok(!b.escapes.includes('d7'));
  assert.ok(b.escapes.includes('e7'));
});
