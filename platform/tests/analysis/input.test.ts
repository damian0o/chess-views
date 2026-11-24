import { test } from 'vitest';
import assert from './assert';
import { parseInput, normaliseFen, START_FEN, type ParsedInput } from '@core/analysis';

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
  assert.deepEqual(parseInput('https://lichess.org/AbCd1234/black#33'), { kind: 'lichess-game', gameId: 'AbCd1234', ply: 33 });
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

test('parseInput: a lichess-exported PGN with a [Site] header is PGN, not a game link', () => {
  const pgn = '[Event "Rated Blitz game"]\n[Site "https://lichess.org/AbCd1234"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 1-0';
  assert.deepEqual(parseInput(pgn), { kind: 'pgn', pgn });
});

test('parseInput: game link only when the whole input is a lichess URL', () => {
  assert.deepEqual(parseInput('https://lichess.org/AbCd1234#42'), { kind: 'lichess-game', gameId: 'AbCd1234', ply: 42 });
  assert.deepEqual(parseInput('https://lichess.org/AbCd1234wxyz/black#7'), { kind: 'lichess-game', gameId: 'AbCd1234', ply: 7 });
  assert.deepEqual(parseInput('https://lichess.org/training/daily'), { kind: 'unknown' });
  assert.deepEqual(parseInput('https://lichess.org/analysis'), { kind: 'unknown' });
  assert.deepEqual(parseInput('see https://lichess.org/AbCd1234 please'), { kind: 'unknown' });
});

test('parseInput: a FEN rank with the wrong number of squares is rejected with a reason', () => {
  const r = parseInput('rnbqkbn/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  assert.equal(r.kind, 'invalid');
  assert.match((r as Extract<ParsedInput, { kind: 'invalid' }>).reason, /rank 8 .*7 squares/i);
  assert.equal(parseInput('rnbqkbnr/ppppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR').kind, 'invalid');
  assert.equal(parseInput(START_FEN).kind, 'fen');
});

test('parseInput: a malformed percent-escape in an analysis URL does not throw', () => {
  assert.deepEqual(parseInput('https://lichess.org/analysis/%E0%A4%A'), { kind: 'unknown' });
});
