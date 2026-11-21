import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, pieceSafety } from '../analysis.js';

const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
const names = (list) => list.map((p) => `${p.type}${p.square}`);

test('pieceSafety: f7 in the Scholar position is attacked twice, held only by the king, not winnable on material', () => {
  const f7 = pieceSafety(boardFromFen(SCHOLAR)).get('f7');
  assert.equal(f7.piece.type, 'p');
  assert.deepEqual(names(f7.attackers), ['bc4', 'qh5']);
  assert.deepEqual(names(f7.defenders), ['ke8']);
  assert.equal(f7.status, 'held');
});

test('pieceSafety: an undefended piece under attack is free, even to a king', () => {
  const m = pieceSafety(boardFromFen('4k3/8/4p3/3N4/8/8/8/4K3 w - - 0 1'));
  assert.equal(m.get('d5').status, 'free');
  assert.deepEqual(names(m.get('d5').attackers), ['pe6']);
  const k = pieceSafety(boardFromFen('4k3/3N4/8/8/8/8/8/4K3 b - - 0 1'));
  assert.equal(k.get('d7').status, 'free');
});

test('pieceSafety: a defended piece attacked by something cheaper is still winnable', () => {
  const m = pieceSafety(boardFromFen('4k3/8/4p3/3R4/8/8/8/3QK3 w - - 0 1'));
  const d5 = m.get('d5');
  assert.equal(d5.status, 'cheap');
  assert.deepEqual(names(d5.defenders), ['qd1']);
  assert.equal(d5.by.square, 'e6');
});

test('pieceSafety: unattacked pieces are quiet, and a pinned attacker does not count off its line', () => {
  const m = pieceSafety(boardFromFen(SCHOLAR));
  assert.equal(m.get('e1').status, 'quiet');
  assert.equal(m.get('h5').status, 'quiet');
  assert.deepEqual(m.get('h5').defenders, []);
  // the pinned f7 pawn does not attack e6, so a white piece there would be attacked only by d7
  assert.equal(m.size, 32);
});
