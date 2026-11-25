import { expect, test } from 'vitest';
import { openSession, sessionFromParams, sessionParams, sessionScene, stepBy, stepTo, type Session } from '@core/session';
import { START_FEN } from '@core/chess/rules';

const OPERA = '[White "Morphy"]\n[Black "Duke of Brunswick and Count Isouard"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';

const ok = (r: ReturnType<typeof openSession>): Session => {
  if ('error' in r) throw new Error(`expected a session, got ${r.error}`);
  return r;
};

test('openSession on a FEN', () => {
  const s = ok(openSession(SCHOLAR));
  expect(s.source).toEqual({ kind: 'fen', fen: SCHOLAR });
  expect(s.ply).toBe(0);
  expect(s.flip).toBe(false);
  expect(s.view).toBe('board');
  expect(s.game.fen(0)).toBe(SCHOLAR);
});

test('openSession on a PGN with headers opens at the end, or at the ply asked', () => {
  const s = ok(openSession(OPERA));
  expect(s.game.length).toBe(33);
  expect(s.ply).toBe(33);
  expect(s.headers.White).toBe('Morphy');
  expect(ok(openSession(OPERA, { ply: 5, flip: true, view: 'roads' }))).toMatchObject({ ply: 5, flip: true, view: 'roads' });
});

test('openSession on a lichess analysis link is a FEN', () => {
  const s = ok(openSession('https://lichess.org/analysis/r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR_b_KQkq_-_3_3'));
  expect(s.source).toEqual({ kind: 'fen', fen: SCHOLAR });
});

test('openSession on a lichess game link asks the app to fetch it', () => {
  expect(openSession('https://lichess.org/abcdEFGH')).toEqual({ error: 'loadLichessGame' });
});

test('openSession errors', () => {
  expect(openSession('hello there')).toMatchObject({ error: 'loadUnknown' });
  expect('error' in openSession('8/8/8/8/8/8/8/8 w - - 0 1')).toBe(false);   // no kings: shown for viewing (POC parity)
  expect(openSession('rnbqkbnr/ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toMatchObject({ error: 'loadBadFen' });   // rank of 7
  expect(openSession('1. e4 e5 2. Ke3 Ke6 3. Qxh8')).toMatchObject({ error: 'loadBadPgn' });
  expect(openSession({ kind: 'pgn', pgn: '1. e5', ply: 0 })).toMatchObject({ error: 'loadBadPgn' });
});

test('stepTo clamps and stepBy moves', () => {
  const s = ok(openSession(OPERA, { ply: 0 }));
  expect(stepTo(s, -4).ply).toBe(0);
  expect(stepTo(s, 99).ply).toBe(33);
  expect(stepTo(s, 10).ply).toBe(10);
  expect(stepBy(stepTo(s, 10), -3).ply).toBe(7);
  expect(stepBy(s, 40).ply).toBe(33);
  expect(stepBy(s, 1)).not.toBe(s);
  expect(s.ply).toBe(0);
});

test('sessionScene: the position at the ply, moves visible, analysis for the layers', () => {
  const s = stepTo(ok(openSession(OPERA, { flip: true })), 0);
  const sc = sessionScene(s, ['pieces', 'roads']);
  expect(sc.fen).toBe(START_FEN);
  expect(sc.ply).toBe(0);
  expect(sc.moves).toHaveLength(33);
  expect(sc.hideMoves).toBe(false);
  expect(sc.flip).toBe(true);
  expect(sc.focus).toEqual([]);
  expect(sc.layers).toEqual(['pieces', 'roads']);
  expect(sc.data.roads?.rings).toBeDefined();
  expect(sessionScene(stepTo(s, 33), []).fen).toBe(s.game.fen(33));
});

test('sessionParams round-trips FEN + view + flip', () => {
  const s = ok(openSession(SCHOLAR, { view: 'roads', flip: true }));
  const p = sessionParams(s);
  expect(p.get('fen')).toBe(SCHOLAR);
  expect(p.get('flip')).toBe('1');
  expect(p.get('view')).toBe('roads');
  expect(p.has('ply')).toBe(false);
  const back = ok(sessionFromParams(new URLSearchParams(p.toString())) as ReturnType<typeof openSession>);
  expect(back).toMatchObject({ source: s.source, view: 'roads', flip: true, ply: 0 });
});

test('sessionParams round-trips PGN + ply', () => {
  const s = stepTo(ok(openSession(OPERA)), 12);
  const p = sessionParams(s);
  expect(p.get('pgn')).toBe(OPERA);
  expect(p.get('ply')).toBe('12');
  expect(p.has('flip')).toBe(false);
  const back = ok(sessionFromParams(new URLSearchParams(p.toString())) as ReturnType<typeof openSession>);
  expect(back.ply).toBe(12);
  expect(back.headers.White).toBe('Morphy');
  expect(back.view).toBe('board');
});

test('sessionFromParams: null without a position, errors for a bad one', () => {
  expect(sessionFromParams(new URLSearchParams('view=roads'))).toBeNull();
  expect(sessionFromParams(new URLSearchParams('fen=nonsense'))).toMatchObject({ error: 'loadBadFen' });
  expect(sessionFromParams(new URLSearchParams('pgn=1.+e5'))).toMatchObject({ error: 'loadBadPgn' });
});
