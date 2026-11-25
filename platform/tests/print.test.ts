import { test } from 'vitest';
import assert from './analysis/assert';
import { printSheet } from '@core/print';
import { START_FEN } from '@core/analysis';
import type { Fen } from '@core/types';

test('printSheet: eight rank lines in the POC letters', () => {
  const s = printSheet(START_FEN, { flip: false });
  assert.equal(s.ranks.length, 8);
  assert.equal(s.ranks[0], "8 R' N' B' Q' K' B' N' R' 8");
  assert.equal(s.ranks[1], '7 x  x  x  x  x  x  x  x  7');
  assert.equal(s.ranks[2], '6    .     .     .     .  6');
  assert.equal(s.ranks[6], '2 o  o  o  o  o  o  o  o  2');
  assert.equal(s.ranks[7], '1 R  N  B  Q  K  B  N  R  1');
  assert.equal(s.fen, START_FEN);
  assert.equal(s.title, undefined);
});

test('printSheet: flipped puts rank 1 on top, files h to a', () => {
  const s = printSheet(START_FEN, { flip: true, title: 'Start', notes: 'n' });
  assert.equal(s.ranks[0], '1 R  N  B  K  Q  B  N  R  1');
  assert.equal(s.ranks[7], "8 R' N' B' K' Q' B' N' R' 8");
  assert.equal(s.title, 'Start');
  assert.equal(s.notes, 'n');
});

test('printSheet: piece list as the POC', () => {
  assert.equal(printSheet(START_FEN, { flip: false }).pieceList,
    'White: K Q R R B(dark) B(light) N N 8 pawns\nBlack: K Q R R B(light) B(dark) N N 8 pawns');
  assert.equal(printSheet('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1' as Fen, { flip: false }).pieceList,
    'White: K 1 pawn\nBlack: K');
});
