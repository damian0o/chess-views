import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, squareIndex, attackMap, territory } from '../analysis.js';

const at = (m, sq) => { const { row, col } = squareIndex(sq); return m[row][col]; };

test('attackMap start position', () => {
  const a = attackMap(boardFromFen(START_FEN));
  assert.equal(at(a.w, 'e3'), 2);   // d2, f2 pawns
  assert.equal(at(a.w, 'f3'), 3);   // e2 g2 pawns + Ng1
  assert.equal(at(a.w, 'd1'), 1);   // Ke1 only (Ra1 blocked by b1/c1)
  assert.equal(at(a.b, 'e6'), 2);   // d7, f7 pawns
  assert.equal(at(a.w, 'e4'), 0);
  assert.equal(at(a.w, 'a2'), 1);   // Ra1
  assert.equal(at(a.w, 'b1'), 1);   // Ra1 attacks the occupied square and stops
});

test('territory after 1.e4', () => {
  const t = territory(boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'));
  const m = (sq) => at(t.mark, sq);
  assert.equal(m('d5'), '+'); assert.equal(m('f5'), '+'); assert.equal(m('e5'), '');
  assert.equal(m('d6'), '-'); assert.equal(m('e4'), '');
  assert.equal(at(t.diff, 'd5'), 1);
  assert.equal(t.summary.centerW, 1); assert.equal(t.summary.centerB, 0);
  assert.ok(t.summary.w > 16 && t.summary.b >= 16);
});

test('territory contested mark', () => {
  const t = territory(boardFromFen('4k3/8/4p3/8/2P5/8/8/4K3 w - - 0 1'));
  assert.equal(at(t.mark, 'd5'), '=');
  assert.equal(at(t.diff, 'd5'), 0);
});
