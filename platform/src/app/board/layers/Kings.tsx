import type { KingHouses } from '@core/analysis';
import type { Color } from '@core/types';

/** Which king's house each square belongs to (the squares around a king, not the king's own). */
export function houseOf(kings: KingHouses | undefined): Map<string, Color> {
  const out = new Map<string, Color>();
  if (!kings) return out;
  for (const color of ['w', 'b'] as const) {
    const h = kings[color];
    if (h) for (const c of h.cells) if (c.square !== h.king) out.set(c.square, color);
  }
  return out;
}
