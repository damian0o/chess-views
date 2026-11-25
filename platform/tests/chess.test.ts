import { describe, expect, test } from 'vitest';
import { loadGame, ChessError } from '@core/chess/rules';
import { formatSan } from '@core/chess/san';
import type { Fen } from '@core/types';

const OPERA = '[White "Morphy"]\n[Black "Duke of Brunswick and Count Isouard"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';

describe('loadGame', () => {
  test('the Opera game: 33 plies, mate, headers', () => {
    const g = loadGame({ kind: 'pgn', pgn: OPERA, ply: 33 });
    expect(g.length).toBe(33);
    expect(g.ply).toBe(33);
    expect(g.status()).toBe('mate');
    expect(g.headers().White).toBe('Morphy');
    expect(g.moves()[32]?.san).toBe('Rd8#');
  });
  test('a ply past the end throws with the length', () => {
    expect(() => loadGame({ kind: 'pgn', pgn: OPERA, ply: 34 })).toThrow(ChessError);
    expect(() => loadGame({ kind: 'pgn', pgn: OPERA, ply: 34 })).toThrow(/33/);
  });
  test('an illegal pgn throws ChessError', () => {
    expect(() => loadGame({ kind: 'pgn', pgn: '1. e4 e5 2. Ke3', ply: 3 })).toThrow(ChessError);
  });
  test('a bad fen throws ChessError', () => {
    expect(() => loadGame({ kind: 'fen', fen: 'nonsense w - - 0 1' as Fen })).toThrow(ChessError);
  });
  test('fen(ply) of the Scholar threat', () => {
    const g = loadGame({ kind: 'pgn', pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5', ply: 5 });
    expect(g.fen(5)).toBe('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3');
    expect(g.fen()).toBe(g.fen(5));
    expect(g.status(5)).toBe('play');
  });
  test('legalMoves from a square', () => {
    const g = loadGame({ kind: 'fen', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen });
    expect(g.legalMoves(g.fen(), 'g1' as never).map((m) => m.san).sort()).toEqual(['Nf3', 'Nh3']);
    expect(g.legalMoves(g.fen()).length).toBe(20);
  });
});

describe('formatSan', () => {
  test('Polish piece letters', () => {
    expect(formatSan('Nf3', 'pl')).toBe('Sf3');
    expect(formatSan('Qxf7#', 'pl')).toBe('Hxf7#');
    expect(formatSan('O-O-O', 'pl')).toBe('O-O-O');
    expect(formatSan('exd8=Q+', 'pl')).toBe('exd8=H+');
    expect(formatSan('Kd2#', 'pl')).toBe('Kd2#');
    expect(formatSan('Rh2+', 'pl')).toBe('Wh2+');
    expect(formatSan('Bd8#', 'pl')).toBe('Gd8#');
    expect(formatSan('Nbd7', 'pl')).toBe('Sbd7');
  });
  test('English is unchanged', () => {
    for (const m of ['Nf3', 'Qxf7#', 'O-O', 'exd8=Q+', 'Bd8#']) expect(formatSan(m, 'en')).toBe(m);
  });
});

describe('viewing positions that are not legal games', () => {
  test('a FEN without kings loads for viewing (the POC shows such boards)', () => {
    const g = loadGame({ kind: 'fen', fen: '8/8/8/3N4/8/8/8/8 w - - 0 1' as Fen });
    expect(g.fen()).toBe('8/8/8/3N4/8/8/8/8 w - - 0 1');
    expect(g.status()).toBe('play');
  });
  test('a malformed FEN still throws', () => {
    expect(() => loadGame({ kind: 'fen', fen: '9/8/8/8/8/8/8/8 w - - 0 1' as Fen })).toThrow(ChessError);
  });
});
