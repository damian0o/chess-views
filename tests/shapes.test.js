import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, shapeSize, pieceGroups } from '../analysis.js';

test('shapeSize: pawns small, minors and rooks medium, royals big', () => {
  assert.equal(shapeSize('p'), 'small');
  for (const t of ['n', 'b', 'r']) assert.equal(shapeSize(t), 'mid');
  for (const t of ['k', 'q']) assert.equal(shapeSize(t), 'big');
});

test('pieceGroups: start position is one group per side', () => {
  const groups = pieceGroups(boardFromFen(START_FEN));
  assert.equal(groups.length, 2);
  const w = groups.find((g) => g.color === 'w');
  const b = groups.find((g) => g.color === 'b');
  assert.equal(w.squares.length, 16);
  assert.equal(b.squares.length, 16);
  assert.deepEqual(w.box, { r0: 6, r1: 7, c0: 0, c1: 7 });
  assert.deepEqual(b.box, { r0: 0, r1: 1, c0: 0, c1: 7 });
});

test('pieceGroups: touching pieces of one side form a group, diagonal counts', () => {
  const groups = pieceGroups(boardFromFen('kb4Q1/1p6/1P6/8/1N6/1K6/8/8 w - - 0 1'));
  const black = groups.filter((g) => g.color === 'b');
  const white = groups.filter((g) => g.color === 'w');
  assert.equal(black.length, 1);
  assert.deepEqual(black[0].squares.sort(), ['a8', 'b7', 'b8']);
  assert.deepEqual(black[0].box, { r0: 0, r1: 1, c0: 0, c1: 1 });
  assert.equal(white.length, 3);
  assert.deepEqual(white.map((g) => g.squares.slice().sort()).sort(), [['b6'], ['b3', 'b4'], ['g8']].sort());
  const kn = white.find((g) => g.squares.includes('b4'));
  assert.deepEqual(kn.box, { r0: 4, r1: 5, c0: 1, c1: 1 });
});

test('pieceGroups: enemy pieces never join a group', () => {
  const groups = pieceGroups(boardFromFen('8/8/8/3pP3/3P4/8/8/8 w - - 0 1'));
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.find((g) => g.color === 'w').squares.sort(), ['d4', 'e5']);
  assert.deepEqual(groups.find((g) => g.color === 'b').squares, ['d5']);
});
