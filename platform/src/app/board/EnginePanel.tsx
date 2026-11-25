import type { AnalysisState } from './useAnalysis';
import type { Color } from '@core/types';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { EvalBar } from './EvalBar';

/** Under the board in the Silnik view: the bar, or what the engine is doing, with Try again after a failure. */
export function EnginePanel({ state, turn, onRetry }: { state: AnalysisState; turn: Color; onRetry: () => void }) {
  const t = useT();
  if (state.kind === 'off') return null;
  if (state.kind === 'thinking') return <p aria-live="polite" className="font-bold text-ink-soft">{t('engineThinking')}</p>;
  if (state.kind === 'none') return <p className="font-bold text-ink-soft">{t('engineNoEval')}</p>;
  if (state.kind === 'failed' || state.kind === 'dead') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="font-bold text-bad">{t(state.kind === 'failed' ? 'engineFailed' : 'engineDead')}</p>
        <Button tone="quiet" onPress={onRetry}>{t('tryAgain')}</Button>
      </div>
    );
  }
  const best = state.analysis.lines[0];
  return best ? <EvalBar score={best.score} turn={turn} /> : <p className="font-bold text-ink-soft">{t('engineNoEval')}</p>;
}
