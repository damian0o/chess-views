import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInput, normaliseFen, START_FEN } from '../analysis.js';

const E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

test('normaliseFen pads missing fields', () => {
  assert.equal(normaliseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'), START_FEN);
  assert.equal(normaliseFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -'), E4);
  assert.equal(normaliseFen(`  ${START_FEN}  `), START_FEN);
});

test('parseInput: FEN variants', () => {
  assert.deepEqual(parseInput(START_FEN), { kind: 'fen', fen: START_FEN });
  assert.deepEqual(parseInput('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'), { kind: 'fen', fen: START_FEN });
  assert.deepEqual(parseInput('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -'), { kind: 'fen', fen: E4 });
});

test('parseInput: lichess analysis URLs', () => {
  assert.deepEqual(
    parseInput('https://lichess.org/analysis/standard/rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR_b_KQkq_-_0_1'),
    { kind: 'fen', fen: E4 });
  assert.deepEqual(
    parseInput('https://lichess.org/analysis/rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR%20b%20KQkq%20-%200%201?color=white#3'),
    { kind: 'fen', fen: E4 });
});

test('parseInput: lichess game URLs', () => {
  assert.deepEqual(parseInput('https://lichess.org/AbCd1234/black#33'), { kind: 'lichess-game', gameId: 'AbCd1234' });
  assert.deepEqual(parseInput('https://lichess.org/AbCd1234wxyz'), { kind: 'lichess-game', gameId: 'AbCd1234' });
  assert.deepEqual(parseInput('lichess.org/AbCd1234'), { kind: 'lichess-game', gameId: 'AbCd1234' });
});

test('parseInput: PGN', () => {
  const pgn = '[Event "x"]\n[Result "1-0"]\n\n1. e4 {best} e5 (1... c5 $1) 2. Nf3 1-0';
  assert.deepEqual(parseInput(pgn), { kind: 'pgn', pgn });
  assert.deepEqual(parseInput('1. e4 e5 2. Nf3'), { kind: 'pgn', pgn: '1. e4 e5 2. Nf3' });
  assert.deepEqual(parseInput('1.e4 e5 2.Nf3 Nc6'), { kind: 'pgn', pgn: '1.e4 e5 2.Nf3 Nc6' });
});

test('parseInput: unknown', () => {
  assert.deepEqual(parseInput(''), { kind: 'unknown' });
  assert.deepEqual(parseInput('   '), { kind: 'unknown' });
  assert.deepEqual(parseInput('hello world'), { kind: 'unknown' });
  assert.deepEqual(parseInput('rnbqkbnr/pppppppp/8/8'), { kind: 'unknown' });
});

test('normaliseFen infers castling from home squares', () => {
  assert.equal(normaliseFen('4k3/8/8/8/8/8/8/4K3'), '4k3/8/8/8/8/8/8/4K3 w - - 0 1');
  assert.equal(normaliseFen('r3k3/8/8/8/8/8/8/4K2R'), 'r3k3/8/8/8/8/8/8/4K2R w Kq - 0 1');
});
