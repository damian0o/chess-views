import { describe, expect, test } from 'vitest';
import { playMove } from '@core/chess/rules';
import { judgeSolve } from '@core/solve';
import type { Fen } from '@core/types';

const S13 = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3' as Fen;
const S09 = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4' as Fen;

describe('playMove', () => {
  test('gives the position after a move and its status', () => {
    const r = playMove(S13, 'g7g6')!;
    expect(r.fen.split(' ').slice(0, 2).join(' ')).toBe('r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w');
    expect(r.status).toBe('play');
    expect(playMove(S09, 'h5f7')!.status).toBe('mate');
  });
  test('an illegal or malformed move gives null and never throws', () => {
    expect(playMove(S13, 'e1e2')).toBeNull();
    expect(playMove(S13, 'zz')).toBeNull();
    expect(playMove('nonsense' as Fen, 'g7g6')).toBeNull();
  });
});

describe('judgeSolve', () => {
  // Scores as the engine gives them: `best` from the mover's view, `after` from the opponent's (to move after the guess).
  test('the game move is always right', () => {
    expect(judgeSolve({ best: { cp: 29 }, after: { cp: -29 }, isGameMove: true })).toEqual({ kind: 'right', game: true, label: 'gradeGameMove', params: {} });
    expect(judgeSolve({ best: null, after: null, isGameMove: true })).toEqual({ kind: 'right', game: true, label: 'gradeGameMove', params: {} });
  });
  test('another move within half a pawn of the best is right (Qe7 0.16 against g6 0.29)', () => {
    expect(judgeSolve({ best: { cp: 29 }, after: { cp: -16 }, isGameMove: false })).toMatchObject({ kind: 'right', game: false, label: 'gradeJustAsGood' });
    expect(judgeSolve({ best: { cp: 29 }, after: { cp: 9 }, isGameMove: false })).toMatchObject({ kind: 'right', label: 'gradeGood' });
  });
  test('a move that allows mate is wrong and says so (a6 against Qxf7#)', () => {
    expect(judgeSolve({ best: { cp: 29 }, after: { mate: 1 }, isGameMove: false })).toEqual({ kind: 'wrong', label: 'gradeAllowsMate', params: { n: 1 } });
  });
  test('a merely okay move is wrong when a much better one exists (d4 1.27 against Nxe5 2.23)', () => {
    expect(judgeSolve({ best: { cp: 223 }, after: { cp: -127 }, isGameMove: false })).toMatchObject({ kind: 'wrong', label: 'gradeOkay' });
  });
  test('a move that mates is right when the best mates too (O-O-O# beside Kd2#)', () => {
    expect(judgeSolve({ best: { mate: 1 }, after: 'mate', isGameMove: false })).toMatchObject({ kind: 'right', label: 'gradeBest' });
  });
  test('missing a mate is wrong', () => {
    expect(judgeSolve({ best: { mate: 2 }, after: { cp: 150 }, isGameMove: false })).toEqual({ kind: 'wrong', label: 'gradeMissedMate', params: { n: 2 } });
  });
  test('a stalemate counts as a draw', () => {
    expect(judgeSolve({ best: { cp: 500 }, after: 'stalemate', isGameMove: false })).toMatchObject({ kind: 'wrong', label: 'gradeLoses' });
  });
  test('without the engine a move other than the game move cannot be checked', () => {
    expect(judgeSolve({ best: null, after: { cp: 0 }, isGameMove: false })).toEqual({ kind: 'unchecked' });
    expect(judgeSolve({ best: { cp: 10 }, after: null, isGameMove: false })).toEqual({ kind: 'unchecked' });
  });
});
