import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, pins, kingHouseReport } from '../analysis.js';

const brief = (p) => ({ pinner: p.pinner.square, pinned: p.pinned.square, target: p.target.square, absolute: p.absolute });

test('bishop pins a knight to the king (absolute)', () => {
  const list = pins(boardFromFen('r3k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1'));
  assert.deepEqual(list.map(brief), [{ pinner: 'b5', pinned: 'c6', target: 'e8', absolute: true }]);
  assert.deepEqual(list[0].between, ['c6', 'd7']);
});

test('rook pins a knight to the queen (relative)', () => {
  const list = pins(boardFromFen('3q2k1/8/8/3n4/8/8/8/3RK3 w - - 0 1'));
  assert.deepEqual(list.map(brief), [{ pinner: 'd1', pinned: 'd5', target: 'd8', absolute: false }]);
});

test('a cheaper piece behind is not a pin, and own pieces block', () => {
  assert.deepEqual(pins(boardFromFen('3p2k1/8/8/3n4/8/8/8/3RK3 w - - 0 1')), []);
  assert.deepEqual(pins(boardFromFen('3q2k1/8/8/3n4/3P4/8/8/3RK3 w - - 0 1')), []);
  assert.deepEqual(pins(boardFromFen(START_FEN)), []);
});

test('a pawn can be pinned to its king', () => {
  const list = pins(boardFromFen('4r1k1/8/8/8/8/8/4P3/4K3 w - - 0 1'));
  assert.deepEqual(list.map(brief), [{ pinner: 'e8', pinned: 'e2', target: 'e1', absolute: true }]);
});

test('king house report lists pins against that king and scores them', () => {
  const r = kingHouseReport(boardFromFen('r3k3/8/2n5/1B6/8/8/8/4K2Q w - - 0 1'), 'b');
  assert.equal(r.pins.length, 2); // Bb5 pins c6 to the king, Qh1 pins c6 to the rook on a8
  assert.ok(r.pins.every((pn) => pn.pinned.square === 'c6'));
  assert.equal(r.pins.filter((pn) => pn.absolute).length, 1);
  assert.equal(r.pinPenalty, 1);
});
