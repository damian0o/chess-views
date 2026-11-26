import type { LessonRun } from '@core/lessons/run';
import { useT } from '../i18n';
import { Button } from '../ui/Button';

const RING = 'ring-4 ring-accent-2 ring-offset-2 ring-offset-surface';

/** The phone's fixed bar: ◀ ▶ through the game (when the step has one) and Next; the control to press now is highlighted. */
export function LessonDock({ run, gameLength, movesLocked, onPly, onNext, highlight }: {
  run: LessonRun; gameLength: number; movesLocked: boolean; onPly: (ply: number) => void; onNext: () => void; highlight: 'play' | 'next' | null;
}) {
  const t = useT();
  const mark = (on: boolean) => (on ? { 'data-highlight': 'true' } : {});
  return (
    <div data-dock className="flex items-center gap-2 border-t-2 border-ink/15 bg-card px-3 py-2">
      {gameLength > 0 && (
        <>
          <Button tone="quiet" aria-label={t('prevMove')} isDisabled={movesLocked || run.ply <= 0} onPress={() => onPly(run.ply - 1)}>◀</Button>
          <Button tone="quiet" aria-label={t('nextMove')} isDisabled={movesLocked || run.ply >= gameLength} onPress={() => onPly(run.ply + 1)}
            className={highlight === 'play' ? RING : ''} {...mark(highlight === 'play')}>▶</Button>
          <span className="text-sm font-bold text-ink-soft">{t('moveOfTotal', { n: run.ply, total: gameLength })}</span>
        </>
      )}
      <Button isDisabled={!!run.gate} onPress={onNext} className={`ml-auto ${highlight === 'next' ? RING : ''}`} {...mark(highlight === 'next')}>
        {run.done ? t('finish') : `${t('next')} ▶`}
      </Button>
    </div>
  );
}
