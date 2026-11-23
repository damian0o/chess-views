import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInfo, analysisFromLines, pawns, toWhite } from '../coach.js';

test('parseInfo reads depth, multipv, score and pv; ignores other lines', () => {
  assert.deepEqual(parseInfo('info depth 10 seldepth 14 multipv 2 score cp -35 nodes 1 nps 1 time 1 pv e7e5 g1f3 b8c6'),
    { depth: 10, multipv: 2, cp: -35, pv: ['e7e5', 'g1f3', 'b8c6'] });
  assert.deepEqual(parseInfo('info depth 16 seldepth 8 multipv 1 score mate 4 nodes 1 pv d5d8'), { depth: 16, multipv: 1, mate: 4, pv: ['d5d8'] });
  assert.equal(parseInfo('info depth 3 currmove e2e4 currmovenumber 1'), null);
  assert.equal(parseInfo('bestmove e2e4 ponder e7e5'), null);
});

test('analysisFromLines keeps the deepest line per multipv, in multipv order', () => {
  const a = analysisFromLines([
    'info depth 9 multipv 1 score cp 20 pv e2e4', 'info depth 9 multipv 2 score cp 10 pv d2d4',
    'info depth 10 multipv 2 score cp 12 pv d2d4 d7d5', 'info depth 10 multipv 1 score cp 25 pv e2e4 e7e5',
    'bestmove e2e4',
  ]);
  assert.equal(a.depth, 10);
  assert.deepEqual(a.moves.map((m) => [m.uci, m.cp]), [['e2e4', 25], ['d2d4', 12]]);
});

test('pawns and toWhite', () => {
  assert.equal(pawns({ cp: 60 }), 0.6);
  assert.equal(pawns({ mate: 3 }), 97);
  assert.equal(pawns({ mate: -2 }), -98);
  assert.deepEqual(toWhite({ cp: 60 }, 'b'), { cp: -60 });
  assert.deepEqual(toWhite({ mate: 2 }, 'b'), { mate: -2 });
  assert.deepEqual(toWhite({ cp: 60 }, 'w'), { cp: 60 });
});
