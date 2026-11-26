import type { LessonRun } from '@core/lessons/run';
import { useT, useText } from '../i18n';

/** What the step asks: its text for the player's age, a find-the-move task, the play-through hint, and (when asked) the question's prompt. */
export function StepText({ run, withPrompt = false }: { run: LessonRun; withPrompt?: boolean }) {
  const t = useT(); const tx = useText();
  const step = run.step;
  const prompt = step.question?.prompt;
  return (
    <>
      <p data-step-text tabIndex={-1} className="text-step leading-relaxed outline-none">{tx(step.explain)}</p>
      {step.solve && <p className="font-black">{tx(step.solve.task)}</p>}
      {run.gate?.kind === 'play' && <p className="font-black">{t('playToEnd')}</p>}
      {withPrompt && prompt && <p className="text-lg font-black">{tx(prompt)}</p>}
    </>
  );
}
