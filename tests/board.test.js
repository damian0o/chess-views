import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, squareColor, symbol, boardText, START_FEN, squareName, squareIndex } from '../analysis.js';

test('boardFromFen start position', () => {
  const b = boardFromFen(START_FEN);
  assert.deepEqual(b[0][4], { square: 'e8', type: 'k', color: 'b' });
  assert.deepEqual(b[7][4], { square: 'e1', type: 'k', color: 'w' });
  assert.equal(b[4][4], null);
});
test('boardFromFen accepts placement only', () => {
  assert.deepEqual(boardFromFen('8/8/8/8/8/8/8/4K3')[7][4], { square: 'e1', type: 'k', color: 'w' });
});
test('squareColor', () => {
  assert.equal(squareColor('a1'), 'dark'); assert.equal(squareColor('h1'), 'light');
  assert.equal(squareColor('e4'), 'light'); assert.equal(squareColor('d4'), 'dark');
});
test('symbol scheme', () => {
  assert.equal(symbol({type:'k',color:'w'}, 'e1'), 'K');
  assert.equal(symbol({type:'n',color:'b'}, 'g8'), "N'");
  assert.equal(symbol({type:'p',color:'w'}, 'e2'), 'o');
  assert.equal(symbol({type:'p',color:'b'}, 'e7'), 'x');
  assert.equal(symbol(null, 'a1'), '.'); assert.equal(symbol(null, 'h1'), '');
});
test('boardText start position', () => {
  const lines = boardText(boardFromFen(START_FEN)).split('\n');
  assert.equal(lines.length, 10);
  assert.equal(lines[1], "8 R' N' B' Q' K' B' N' R' 8");
  assert.equal(lines[2], '7 x  x  x  x  x  x  x  x  7');
  assert.equal(lines[7], '2 o  o  o  o  o  o  o  o  2');
  assert.equal(lines[9], '  a  b  c  d  e  f  g  h');
});
test('squareName and squareIndex', () => {
  assert.equal(squareName(0,0), 'a8'); assert.equal(squareName(7,7), 'h1');
  assert.deepEqual(squareIndex('e4'), { row: 4, col: 4 });
});
