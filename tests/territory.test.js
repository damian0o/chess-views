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

const STUDY = 'kb4Q1/1p6/1P6/8/1N6/1K6/8/8 w - - 0 1';

test('attackMap can respect pins: a pinned bishop only counts along the pin line', () => {
  const b = boardFromFen(STUDY);
  const raw = attackMap(b);
  assert.equal(at(raw.b, 'c7'), 1);
  assert.equal(at(raw.b, 'a7'), 2);
  const pinned = attackMap(b, { respectPins: true });
  assert.equal(at(pinned.b, 'c7'), 0);   // bishop b8 is pinned to a8 by Qg8
  assert.equal(at(pinned.b, 'a7'), 1);   // only the king
  assert.equal(at(pinned.b, 'c8'), 0);   // a bishop cannot move along the rank it is pinned on
  const rook = attackMap(boardFromFen('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1'), { respectPins: true });
  assert.equal(at(rook.w, 'e5'), 1);     // a rook pinned on its file still counts along the file
  assert.equal(at(rook.w, 'a2'), 0);
});

test('territory respects pins', () => {
  const t = territory(boardFromFen(STUDY));
  assert.equal(at(t.mark, 'c7'), '+');   // only the white b6 pawn once the bishop is discounted
  assert.equal(at(t.diff, 'a7'), 0);     // pawn b6 against the king a8 once the bishop is discounted
  assert.equal(at(t.mark, 'a7'), '+');   // and the pawn is the cheaper guard, so White owns it
  assert.deepEqual(t.pinned.map((p) => p.square), ['b8']);
});

import { attackersOf } from '../analysis.js';

test('attackersOf: start position, f3 is hit by two white pawns and the knight, by nothing black', () => {
  const r = attackersOf(boardFromFen(START_FEN), 'f3');
  assert.deepEqual(r.w.map((p) => `${p.type}${p.square}`), ['ng1', 'pe2', 'pg2']);
  assert.deepEqual(r.b, []);
});

test('attackersOf: a piece pinned to its king only counts along the pin line', () => {
  // White bishop d2 is pinned by the black rook on d8 (king d1); it still covers d-file squares? No: a bishop cannot, so it attacks nothing.
  // Knight c3 (unpinned) attacks e4; bishop d2 would attack e3 but is pinned, so e3 has no white attacker.
  const board = boardFromFen('3rk3/8/8/8/8/2N5/3B4/3K4 w - - 0 1');
  assert.deepEqual(attackersOf(board, 'e3').w, []);
  assert.deepEqual(attackersOf(board, 'e4').w.map((p) => p.square), ['c3']);
  assert.deepEqual(attackersOf(board, 'd2').b.map((p) => p.square), ['d8']);
});

const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';

test('territory: the cheapest guard wins, so a pawn beats a bishop even at equal counts', () => {
  const t = territory(boardFromFen(SCHOLAR));
  assert.equal(at(t.mark, 'e6'), '-');
  assert.equal(at(t.diff, 'e6'), 0);        // raw count stays 1:1
  assert.equal(at(t.lead, 'e6'), -1);       // owned by Black, by the thinnest margin
  assert.deepEqual(at(t.cheapest.w, 'e6'), { type: 'b', square: 'c4' });
  assert.deepEqual(at(t.cheapest.b, 'e6'), { type: 'p', square: 'd7' });
});

test('territory: one pawn outranks a queen and a rook together', () => {
  const t = territory(boardFromFen('6k1/3p4/R7/8/8/8/8/4Q2K w - - 0 1'));
  assert.equal(at(t.diff, 'e6'), 1);        // White 2 (queen, rook), Black 1 (pawn)
  assert.equal(at(t.mark, 'e6'), '-');
  assert.equal(at(t.lead, 'e6'), -1);
  assert.equal(at(t.mark, 'c6'), '-');
  assert.equal(at(t.mark, 'e5'), '+');      // queen alone: no contest
  assert.equal(at(t.cheapest.b, 'e5'), null);
});

test('territory: when the cheapest guards are the same kind, the count decides and the lead is the count gap', () => {
  const t = territory(boardFromFen('4k3/8/8/4p3/8/2P1P3/8/4K3 w - - 0 1'));
  assert.equal(at(t.mark, 'd4'), '+');      // pawns c3, e3 against pawn e5
  assert.equal(at(t.lead, 'd4'), 1);
  const t2 = territory(boardFromFen('4k3/8/8/4p3/8/4P3/8/4K3 w - - 0 1'));
  assert.equal(at(t2.mark, 'd4'), '=');
  assert.equal(at(t2.lead, 'd4'), 0);
});

test('territory: the summary counts owned squares under the cheapest-guard rule', () => {
  const t = territory(boardFromFen(SCHOLAR));
  let b = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (t.mark[r][c] === '-') b++;
  assert.equal(t.summary.b, b);
});
