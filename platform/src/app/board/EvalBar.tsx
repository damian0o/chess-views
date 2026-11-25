import type { Color } from '@core/types';
import { barPercent, evalNumber, evalWords, toWhite, type Score } from '@core/engine/coach';
import { usePlayer } from '../i18n';

/** White's share of a bar, with words for kids and teens and the number for adults. `score` is from the side to move. */
export function EvalBar({ score, turn }: { score: Score | null; turn: Color }) {
  const p = usePlayer();
  const age = p?.age ?? 'kids', locale = p?.locale ?? 'pl';
  if (!score) return null;
  const white = toWhite(score, turn);
  const words = evalWords(white, age, locale);
  return (
    <div className="flex items-center gap-3" role="img" aria-label={words}>
      <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-board-ink ring-2 ring-ink/15">
        <div data-testid="eval-white" className="absolute inset-y-0 left-0 bg-white transition-[width] duration-500" style={{ width: `${barPercent(white)}%` }} />
      </div>
      <span className="font-black">{words}</span>
      {age !== 'adults' && <span className="text-sm text-ink-soft">({evalNumber(white)})</span>}
    </div>
  );
}
