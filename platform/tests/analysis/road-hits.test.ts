import { expect, test } from 'vitest';
import { boardFromFen, rays, roadHits } from '@core/analysis';

test('roadHits: one entry per piece a road runs into, with its attackers', () => {
  const hits = roadHits(rays(boardFromFen('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3')));
  const f7 = hits.find((h) => h.square === 'f7' && h.color === 'w');
  expect(f7?.from.slice().sort()).toEqual(['c4', 'h5']);
  expect(hits.every((h) => h.from.length >= 1)).toBe(true);
});
