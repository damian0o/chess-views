import { arrowMoves } from '@core/engine/coach';
import type { AnalysisLine } from '@core/engine/types';

const xy = (sq: string, flip: boolean): [number, number] => {
  const col = sq.charCodeAt(0) - 97, row = 8 - Number(sq[1]);
  return flip ? [7 - col + 0.5, 7 - row + 0.5] : [col + 0.5, row + 0.5];
};

/** The best moves as arrows on an 8×8 SVG: the best one thickest; only those within half a pawn of the best. */
export function Arrows({ lines, flip }: { lines: AnalysisLine[]; flip: boolean }) {
  const shown = arrowMoves(lines);
  return (
    <g aria-hidden="true">
      <defs>
        <marker id="cv-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3" markerHeight="3" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="var(--board-good)" />
        </marker>
      </defs>
      {shown.map((l, i) => {
        const [x1, y1] = xy(l.move.from, flip), [x2, y2] = xy(l.move.to, flip);
        return <line key={l.move.uci} data-arrow={l.move.uci} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--board-good)"
          strokeWidth={i === 0 ? 0.18 : 0.11} strokeLinecap="round" opacity={i === 0 ? 0.9 : 0.6} markerEnd="url(#cv-arrow)" />;
      })}
    </g>
  );
}
