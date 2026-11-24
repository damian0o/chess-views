import type { LessonRun } from '@core/lessons/run';
import { useT, useText } from '../i18n';
import { Button } from '../ui/Button';
import { Question } from './Question';

/** The step: its text for the player's age, the hidden-move ▶, the question, Back and Next. */
export function StepCard({ run, onAnswer, onReveal, onBack, onNext }: {
  run: LessonRun; onAnswer: (v: number) => void; onReveal: () => void; onBack: () => void; onNext: () => void;
}) {
  const t = useT(); const tx = useText();
  const step = run.step;
  return (
    <section aria-label={t('stepOf', { n: run.index + 1, total: run.total })} className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card">
      <p className="text-step leading-relaxed">{tx(step.explain)}</p>
      {step.solve && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-black">{tx(step.solve.task)}</p>
          {run.gate?.kind === 'reveal' && <Button tone="secondary" onPress={onReveal}>{t('play')}</Button>}
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
