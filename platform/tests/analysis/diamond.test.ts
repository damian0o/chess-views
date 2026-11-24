import { test } from 'vitest';
import assert from './assert';
import { boardFromFen, START_FEN, diamondRows, squareColor } from '@core/analysis';

test('diamondRows layout', () => {
  const rows = diamondRows(boardFromFen(START_FEN));
  assert.equal(rows.length, 15);
  assert.deepEqual(rows[0]!.map((c) => c.square), ['h8']);
  assert.deepEqual(rows[14]!.map((c) => c.square), ['a1']);
  assert.deepEqual(rows[7]!.map((c) => c.square), ['a8','b7','c6','d5','e4','f3','g2','h1']);
  for (const row of rows) assert.equal(new Set(row.map((c) => squareColor(c.square))).size, 1);
  assert.deepEqual(rows[14]![0]!.cell, { square: 'a1', type: 'r', color: 'w' });
});
