import type { LessonRun } from '@core/lessons/run';
import { useT, useText } from '../i18n';
import { Button } from '../ui/Button';
import { Celebrate } from './Celebrate';

/** The step's question: answer buttons, the tap hint or Yes/No; then "try again" or the right line. */
export function Question({ run, onAnswer }: { run: LessonRun; onAnswer: (value: number) => void }) {
  const t = useT(); const tx = useText();
  const q = run.step.question;
  if (!q) return null;
  const open = !run.answered;
  const prompt = q.prompt;
  const right = q.right ? tx(q.right) : t('right');
  const choices = q.kind === 'choice' ? q.choices : q.kind === 'recall' ? [t('yes'), t('no')] : [];
  const rightIndex = q.kind === 'choice' ? q.answer : q.kind === 'recall' ? (q.answer === 'yes' ? 0 : 1) : -1;

  return (
    <div className="relative flex flex-col gap-3">
      {prompt && <p className="text-lg font-black">{tx(prompt)}</p>}
      {q.kind === 'tap' && open && <p className="text-ink-soft">{t('tapASquare')}</p>}
      {choices.length > 0 && (
        <div role="group" aria-label={prompt ? tx(prompt) : t('answerChoices')} className="flex flex-wrap gap-2">
          {choices.map((c, i) => {
            const wrong = run.wrong.includes(i);
            const isRight = run.answered && i === rightIndex;
            return (
              <Button key={i} tone={isRight ? 'secondary' : 'quiet'} isDisabled={!open || wrong}
                className={`${wrong ? 'line-through opacity-60' : ''} ${isRight ? 'cv-pop !bg-good !text-good-ink' : ''}`}
                onPress={() => onAnswer(i)}>{c}</Button>
            );
          })}
        </div>
      )}
      <p aria-live="polite" className="min-h-6 font-bold">
        {run.answered
          ? <span data-right-line className="text-good">{right}</span>
          : run.lastAnswer === 'wrong' ? <span className="text-bad">{t('tryAgain')}</span> : null}
      </p>
      {run.answered && run.lastAnswer === 'right' && <Celebrate />}
    </div>
  );
}
