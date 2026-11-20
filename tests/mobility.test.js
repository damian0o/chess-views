import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, mobility, mobilityTone } from '../analysis.js';

const count = (m, sq) => m.pieces.find((p) => p.square === sq).count;

test('mobility start position', () => {
  const m = mobility(boardFromFen(START_FEN));
  assert.equal(m.pieces.length, 32);
  assert.equal(count(m, 'g1'), 2);
  assert.equal(count(m, 'e2'), 2);
  assert.equal(count(m, 'f1'), 0);
  assert.equal(count(m, 'e1'), 0);
  assert.equal(count(m, 'e7'), 2);
  assert.equal(m.summary.w, 20);
  assert.equal(m.summary.b, 20);
});

test('mobility after 1.e4', () => {
  const m = mobility(boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'));
  assert.equal(count(m, 'f1'), 5);
  assert.equal(count(m, 'd1'), 4);
  assert.equal(count(m, 'e4'), 1);
  assert.equal(count(m, 'e1'), 1);
});

test('pawn captures only onto enemy pieces', () => {
  const m = mobility(boardFromFen('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1'));
  assert.equal(count(m, 'e4'), 2); // e5 push + d5 capture
  assert.equal(count(m, 'd5'), 2); // d4 push + e4 capture
});

test('mobilityTone', () => {
  assert.equal(mobilityTone(0), 'low'); assert.equal(mobilityTone(2), 'low');
  assert.equal(mobilityTone(3), 'mid'); assert.equal(mobilityTone(6), 'mid');
  assert.equal(mobilityTone(7), 'high');
});
