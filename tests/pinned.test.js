import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, mobility } from '../analysis.js';

const piece = (m, sq) => m.pieces.find((p) => p.square === sq);

test('a knight pinned to its king has no moves when pins are respected', () => {
  const b = boardFromFen('r3k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1');
  assert.equal(piece(mobility(b), 'c6').count, 8);
  const m = mobility(b, { respectPins: true });
  assert.equal(piece(m, 'c6').count, 0);
  assert.equal(piece(m, 'c6').pinned, 'absolute');
  assert.equal(m.summary.b, 15); // rook a8 10 + king e8 5 + pinned knight 0
});

test('a rook pinned on its file can still slide along the file', () => {
  const m = mobility(boardFromFen('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1'), { respectPins: true });
  const r = piece(m, 'e2');
  assert.equal(r.pinned, 'absolute');
  assert.equal(r.count, 6); // e3 e4 e5 e6 e7 and the capture on e8
});

test('a pawn pinned on its file can push, pinned on a diagonal it cannot', () => {
  const file = mobility(boardFromFen('4r1k1/8/8/8/8/8/4P3/4K3 w - - 0 1'), { respectPins: true });
  assert.equal(piece(file, 'e2').count, 2);
  const diag = mobility(boardFromFen('6k1/8/8/b7/8/8/3P4/4K3 w - - 0 1'), { respectPins: true });
  assert.equal(piece(diag, 'd2').count, 0);
  assert.equal(piece(diag, 'd2').pinned, 'absolute');
});

test('a piece pinned to the queen keeps its moves but is flagged', () => {
  const m = mobility(boardFromFen('r1bqk2r/pppp1ppp/2n2n2/2b1p1B1/2B1P3/2NP4/PPP2PPP/R2QK1NR b KQkq - 0 6'), { respectPins: true });
  assert.equal(piece(m, 'f6').pinned, 'relative');
  assert.equal(piece(m, 'f6').count, 5);
  assert.equal(piece(m, 'c6').pinned, null);
});
