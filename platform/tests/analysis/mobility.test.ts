import { test } from 'vitest';
import assert from './assert';
import { boardFromFen, START_FEN, mobility, mobilityTone, type Mobility } from '@core/analysis';

const count = (m: Mobility, sq: string) => m.pieces.find((p) => p.square === sq)!.count;

test('mobility start position', () => {
  const m = mobility(boardFromFen(START_FEN));
  assert.equal(m.pieces.length, 32);
  assert.equal(count(m, 'g1'), 2);
  assert.equal(count(m, 'e2'), 2);   // attacks d3 and f3
  assert.equal(count(m, 'f1'), 0);
  assert.equal(count(m, 'e1'), 0);
  assert.equal(count(m, 'e7'), 2);
  assert.equal(m.summary.w, 18);    // 6 inner pawns x 2 + 2 edge pawns x 1 + 2 knights x 2
  assert.equal(m.summary.b, 18);
});

test('mobility after 1.e4', () => {
  const m = mobility(boardFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'));
  assert.equal(count(m, 'f1'), 5);
  assert.equal(count(m, 'd1'), 4);
  assert.equal(count(m, 'e4'), 2);   // attacks d5 and f5
  assert.equal(count(m, 'e1'), 1);
});

test('pawn reach is its two attack squares whatever stands there', () => {
  const m = mobility(boardFromFen('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1'));
  assert.equal(count(m, 'e4'), 2); // d5 and f5
  assert.equal(count(m, 'd5'), 2); // c4 and e4
});

test('mobilityTone', () => {
  assert.equal(mobilityTone(0), 'low'); assert.equal(mobilityTone(2), 'low');
  assert.equal(mobilityTone(3), 'mid'); assert.equal(mobilityTone(6), 'mid');
  assert.equal(mobilityTone(7), 'high');
});

test('a king does not count squares the enemy attacks', () => {
  const study = mobility(boardFromFen('kb4Q1/1p6/1P6/8/1N6/1K6/8/8 w - - 0 1'));
  assert.equal(count(study, 'a8'), 0);          // a7 is hit by the b6 pawn, b8 and b7 are its own pieces
  const m = mobility(boardFromFen('4k3/8/8/8/8/8/5q2/4K3 w - - 0 1'));
  assert.equal(count(m, 'e1'), 2);              // d1 and the capture on f2; d2 e2 f1 are attacked
});

test('pawns count the squares they attack, not the squares they can step to', () => {
  const study = mobility(boardFromFen('kb4Q1/1p6/1P6/8/1N6/1K6/8/8 w - - 0 1'));
  assert.equal(count(study, 'b6'), 2);   // a7 and c7, even though it is blocked
  assert.equal(count(study, 'b7'), 2);   // a6 and c6
  const start = mobility(boardFromFen(START_FEN));
  assert.equal(count(start, 'a2'), 1);   // edge pawn: only b3
  assert.equal(count(start, 'e2'), 2);   // d3 and f3
  const pinned = mobility(boardFromFen('4r1k1/8/8/8/8/8/4P3/4K3 w - - 0 1'), { respectPins: true });
  assert.equal(count(pinned, 'e2'), 0);  // pinned on the file: it may not capture sideways
});
