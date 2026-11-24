import type { Ray, RoadHit } from '@core/analysis';
import type { Square } from '@core/types';

type XY = (sq: Square) => [number, number];

/** Road lines from each piece to where its road ends, and a ring on every piece a road runs into (thicker for more attackers). */
export function Roads({ rays, hits, xy }: { rays: Ray[]; hits: RoadHit[]; xy: XY }) {
  return (
    <g aria-hidden="true">
      {rays.filter((r) => r.squares.length).map((r, i) => {
        const [x1, y1] = xy(r.from), [x2, y2] = xy(r.squares[r.squares.length - 1]!);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.07} strokeLinecap="round"
          stroke={r.piece.color === 'w' ? 'var(--board-road-w)' : 'var(--board-road-b)'} opacity={0.85} />;
      })}
      {hits.map((h) => {
        const [cx, cy] = xy(h.square);
        const w = 0.06 + 0.05 * Math.min(3, h.from.length);
        return (
          <g key={`${h.square}${h.color}`} data-ring={h.square} data-attackers={String(h.from.length)} data-by={h.color}>
            <circle cx={cx} cy={cy} r={0.42} fill="none" className="stroke-white" strokeWidth={w + 0.08} />
            <circle cx={cx} cy={cy} r={0.42} fill="none" stroke={h.color === 'w' ? 'var(--board-road-w)' : 'var(--board-road-b)'} strokeWidth={w} />
          </g>
        );
      })}
    </g>
  );
}
