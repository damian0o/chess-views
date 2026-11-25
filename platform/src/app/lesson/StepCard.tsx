import type { LessonRun } from '@core/lessons/run';
import type { MessageKey } from '@core/i18n/index';
import { formatSan } from '@core/chess/san';
import { usePlayer, useT, useText } from '../i18n';
import { Button } from '../ui/Button';
import { Question } from './Question';
import { Celebrate } from './Celebrate';
import type { SolveState } from './useSolve';

export interface SolveView { state: SolveState; tries: number; hint: MessageKey | null; solving: boolean; gameSan: string | null }

/**
 * A "find the move" step's status: what to do, the engine checking, the grade of the child's move,
 * "try again", and "Show the answer" once a move has not solved it.
 */
function SolveStatus({ solve, onReveal }: { solve: SolveView; onReveal: () => void }) {
  const t = useT();
  const locale = usePlayer()?.locale ?? 'pl';
  const { state, solving } = solve;
  const lines: string[] = [];
  if (state.kind === 'checking') lines.push(t('engineThinking'));
  else if (state.kind === 'judged') {
    const san = formatSan(state.guess.san, locale);
    const c = state.check;
    if (c.kind === 'unchecked') lines.push(t('solveUnchecked'));
    else lines.push(t('guessYour', { san, label: t(c.label, c.params) }));
    if (c.kind === 'right' && !c.game && solve.gameSan) lines.push(t('solveGameMove', { san: formatSan(solve.gameSan, locale) }));
    if (c.kind !== 'right' && solving) lines.push(t('tryAgain'));
  } else if (solving) lines.push(t(solve.hint ?? 'guessHint'));
  const right = state.kind === 'judged' && state.check.kind === 'right';
  return (
    <div className="relative flex flex-col gap-2">
      <div aria-live="polite" className="flex flex-col gap-1">
        {lines.map((l, i) => <p key={i} className={i === 0 ? 'text-lg font-black' : 'font-bold'}>{l}</p>)}
      </div>
      {solving && solve.tries > 0 && state.kind !== 'checking' && <div><Button tone="quiet" onPress={onReveal}>{t('showAnswer')}</Button></div>}
      {right && <Celebrate />}
    </div>
  );
}

/** The step: its text for the player's age, a "find the move" task played on the board, the question, Back and Next. */
export function StepCard({ run, solve, onAnswer, onReveal, onBack, onNext }: {
  run: LessonRun; solve?: SolveView | undefined; onAnswer: (v: number) => void; onReveal: () => void; onBack: () => void; onNext: () => void;
}) {
  const t = useT(); const tx = useText();
  const step = run.step;
  return (
    <section aria-label={t('stepOf', { n: run.index + 1, total: run.total })} className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card">
      <p className="text-step leading-relaxed">{tx(step.explain)}</p>
      {step.solve && (
        <div className="flex flex-col gap-2">
          <p className="font-black">{tx(step.solve.task)}</p>
          {solve
            ? <SolveStatus solve={solve} onReveal={onReveal} />
            : run.gate?.kind === 'reveal' && <div><Button tone="secondary" onPress={onReveal}>{t('play')}</Button></div>}
        </div>
      )}
      <Question run={run} onAnswer={onAnswer} />
      <div className="flex items-center justify-between gap-3">
        <Button tone="quiet" isDisabled={run.index === 0} onPress={onBack}>◀ {t('back')}</Button>
        <Button isDisabled={!!run.gate} onPress={onNext}>{run.done ? t('finish') : `${t('next')} ▶`}</Button>
      </div>
    </section>
  );
}
