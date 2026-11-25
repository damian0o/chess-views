import type { BatteryRay, PawnGuard, Ray, RoadRing } from '@core/analysis';
import type { Square } from '@core/types';

type XY = (sq: Square) => [number, number];
const DASH: Record<string, string | undefined> = { free: undefined, contested: '0.18 0.1', held: '0.04 0.09' };

/**
 * Road lines; a ring on every attacked piece, its thickness and style from the core (solid: free,
 * dashed: defended but not enough, dotted: held); a cross on road squares an enemy pawn guards.
 * A battery road (a piece behind its own piece on the same line) is a dashed lane beside the front piece's road.
 */
export function Roads({ rays, batteries = [], rings, guards, xy }: { rays: Ray[]; batteries?: BatteryRay[]; rings: RoadRing[]; guards: PawnGuard[]; xy: XY }) {
  const road = (c: string) => (c === 'w' ? 'var(--board-road-w)' : 'var(--board-road-b)');
  return (
    <g aria-hidden="true">
      {rays.filter((r) => r.squares.length).map((r, i) => {
        const [x1, y1] = xy(r.from), [x2, y2] = xy(r.squares[r.squares.length - 1]!);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.07} strokeLinecap="round" stroke={road(r.piece.color)} opacity={0.85} />;
      })}
      {batteries.map((r, i) => {
        // From the back piece to its target, shifted to one side so it runs beside the front piece's road, not on it.
        const to = r.squares[r.squares.length - 1]!;
        const [ax, ay] = xy(r.from), [bx, by] = xy(to);
        const len = Math.hypot(bx - ax, by - ay) || 1, ox = (-(by - ay) / len) * 0.16, oy = ((bx - ax) / len) * 0.16;
        const [x1, y1, x2, y2] = [ax + ox, ay + oy, bx + ox, by + oy];
        return <line key={`b${i}`} data-battery={r.from} data-through={r.through.join(' ')} data-to={to} x1={x1} y1={y1} x2={x2} y2={y2}
          strokeWidth={0.07} strokeLinecap="round" strokeDasharray="0.16 0.14" stroke={road(r.piece.color)} opacity={0.85} />;
      })}
      {guards.map((g) => {
        const [cx, cy] = xy(g.square);
        return (
          <g key={`${g.square}${g.by}`} data-guard={g.square} data-by={g.by} stroke={road(g.by)} strokeWidth={0.07} strokeLinecap="round" opacity={0.9}>
            <line x1={cx - 0.12} y1={cy - 0.12} x2={cx + 0.12} y2={cy + 0.12} />
            <line x1={cx - 0.12} y1={cy + 0.12} x2={cx + 0.12} y2={cy - 0.12} />
          </g>
        );
      })}
      {rings.map((h) => {
        const [cx, cy] = xy(h.square);
        return (
          <g key={`${h.square}${h.color}`} data-ring={h.square} data-attackers={String(h.attackers.length)} data-by={h.color} data-style={h.style} data-width={String(h.width)}>
            <circle cx={cx} cy={cy} r={0.42} fill="none" stroke="white" strokeWidth={h.width + 0.08} />
            <circle cx={cx} cy={cy} r={0.42} fill="none" stroke={road(h.color)} strokeWidth={h.width} strokeDasharray={DASH[h.style]} strokeLinecap="round" />
          </g>
        );
      })}
    </g>
  );
}
