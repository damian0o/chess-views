import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardFromFen, START_FEN, pawnPaths } from '../analysis.js';

const at = (list, sq) => list.find((p) => p.square === sq);

test('start position: paths run to the enemy pawn, nobody is passed', () => {
  const paths = pawnPaths(boardFromFen(START_FEN));
  assert.equal(paths.length, 16);
  const e2 = at(paths, 'e2');
  assert.deepEqual(e2.path, ['e3', 'e4', 'e5', 'e6', 'e7', 'e8']);
  assert.equal(e2.blocker, 'e7');
  assert.equal(e2.passed, false);
  assert.equal(e2.promotion, 'e8');
  const d7 = at(paths, 'd7');
  assert.deepEqual(d7.path, ['d6', 'd5', 'd4', 'd3', 'd2', 'd1']);
  assert.equal(d7.blocker, 'd2');
  assert.equal(paths.filter((p) => p.passed).length, 0);
});

test('a lone pawn with nothing ahead is passed with a clear run', () => {
  const d5 = at(pawnPaths(boardFromFen('8/8/8/3P4/8/8/8/4k2K w - - 0 1')), 'd5');
  assert.equal(d5.passed, true);
  assert.equal(d5.blocker, null);
  assert.deepEqual(d5.path, ['d6', 'd7', 'd8']);
  assert.equal(d5.stepsToPromote, 3);
});

test('an enemy pawn ahead on a neighbouring file means not passed', () => {
  const d5 = at(pawnPaths(boardFromFen('8/2p5/8/3P4/8/8/8/4k2K w - - 0 1')), 'd5');
  assert.equal(d5.passed, false);
  assert.deepEqual(d5.guards, ['c7']);
  assert.equal(d5.blocker, null);
});

test('an enemy pawn behind on a neighbouring file does not matter', () => {
  const d5 = at(pawnPaths(boardFromFen('8/8/8/3P4/2p5/8/8/4k2K w - - 0 1')), 'd5');
  assert.equal(d5.passed, true);
});

test('blocked passed pawn reports the blocker', () => {
  const paths = pawnPaths(boardFromFen('8/8/3n4/3P4/8/8/8/4k2K w - - 0 1'));
  const d5 = at(paths, 'd5');
  assert.equal(d5.passed, true);
  assert.equal(d5.blocker, 'd6');
  assert.equal(d5.clear, false);
});
