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

import { grade, evalWords, evalNumber, barPercent, arrowMoves, uciOf, isSolverPly } from '../coach.js';

test('grade follows the loss table and names the best move', () => {
  assert.deepEqual(grade({ cp: 50 }, { cp: 50 }), { label: 'Best!', loss: 0 });
  assert.equal(grade({ cp: 50 }, { cp: 35 }).label, 'Just as good');     // 0.15
  assert.equal(grade({ cp: 50 }, { cp: 30 }).label, 'Just as good');     // 0.20 inclusive
  assert.equal(grade({ cp: 50 }, { cp: 10 }).label, 'Good');             // 0.40
  assert.equal(grade({ cp: 50 }, { cp: -60 }).label, 'Okay, but there was better');   // 1.10
  assert.deepEqual(grade({ cp: 50 }, { cp: -110 }), { label: 'Oops, that loses something', loss: 1.6 });
});

test('grade: mates override the table', () => {
  assert.equal(grade({ mate: 2 }, { cp: 300 }).label, 'You missed a mate in 2');
  assert.equal(grade({ cp: 20 }, { mate: -3 }).label, 'Oops, that allows mate in 3');
  assert.equal(grade({ mate: 2 }, { mate: 4 }).label, 'Best!');
});

test('grade with Black to move uses the mover view, so a losing Black guess is Oops', () => {
  // Scores as the engine gives them for Black to move: best keeps -20 (Black slightly worse), guess drops to -250.
  assert.equal(grade({ cp: -20 }, { cp: -250 }).label, 'Oops, that loses something');
});

test('evalWords and evalNumber from White view', () => {
  assert.equal(evalWords({ cp: 0 }), 'Equal');
  assert.equal(evalWords({ cp: 39 }), 'Equal');
  assert.equal(evalWords({ cp: 40 }), 'White is a little better');
  assert.equal(evalWords({ cp: -120 }), 'Black is better');
  assert.equal(evalWords({ cp: 300 }), 'White is winning');
  assert.equal(evalWords({ mate: -2 }), 'Black mates in 2');
  assert.equal(evalNumber({ cp: 64 }), '+0.6');
  assert.equal(evalNumber({ cp: -120 }), '-1.2');
  assert.equal(evalNumber({ cp: 0 }), '0.0');
  assert.equal(evalNumber({ mate: 3 }), '#3');
  assert.equal(evalNumber({ mate: -2 }), '-#2');
});

test('barPercent', () => {
  assert.equal(barPercent({ cp: 0 }), 50);
  assert.equal(barPercent({ cp: 400 }), 88.1);
  assert.equal(barPercent({ mate: 1 }), 100);
  assert.equal(barPercent({ mate: -1 }), 0);
});

test('arrowMoves keeps up to three moves within half a pawn of the best', () => {
  const moves = [{ uci: 'a', cp: 50 }, { uci: 'b', cp: 10 }, { uci: 'c', cp: 0 }, { uci: 'd', cp: -5 }, { uci: 'e', cp: -100 }];
  assert.deepEqual(arrowMoves(moves).map((m) => m.uci), ['a', 'b', 'c']);
  assert.deepEqual(arrowMoves([{ uci: 'a', cp: 50 }, { uci: 'b', cp: -10 }]).map((m) => m.uci), ['a']);
  assert.deepEqual(arrowMoves([{ uci: 'a', mate: 2 }, { uci: 'b', mate: 3 }]).map((m) => m.uci), ['a']);  // 98 vs 97: 1 pawn apart
});

test('uciOf and isSolverPly', () => {
  assert.equal(uciOf({ from: 'a7', to: 'a8', promotion: 'q' }), 'a7a8q');
  assert.equal(uciOf({ from: 'e2', to: 'e4' }), 'e2e4');
  const fen = '8/1n4K1/qpB4p/3R3P/4kp1N/2p4P/2P1pP2/6R1 w - - 0 1';
  assert.equal(isSolverPly(fen, 'w'), true);
  assert.equal(isSolverPly(fen, 'b'), false);
});
