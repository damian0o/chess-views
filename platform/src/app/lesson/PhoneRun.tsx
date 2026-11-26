import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LessonRun } from '@core/lessons/run';
import { useT, useText } from '../i18n';
import { Button } from '../ui/Button';
import { StepText } from './StepText';
import { BoardSheet } from './BoardSheet';
import { readingPauseMs } from './sheet';

/**
 * A lesson step on a phone: the instruction first; the child pulls the board up (that is the "Rozumiem"),
 * and every new step opens on its instruction again.
 */
export function PhoneRun({ run, topBar, board, actions, tools, dock, onBack }: {
  run: LessonRun; topBar: ReactNode; board: ReactNode; actions: ReactNode; tools: ReactNode; dock: ReactNode; onBack: () => void;
}) {
  const t = useT(); const tx = useText();
  // The sheet is up only for the step it was pulled up on, so a new step opens on its instruction in its first render.
  const [upFor, setUpFor] = useState<string | null>(null);
  const up = upFor === run.step.id;
  const panel = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLButtonElement>(null);
  const lastStep = useRef(run.step.id);
  const wasUp = useRef(false);
  const focusNext = useRef<'strip' | 'text' | null>(null);
  // Focus moves after the panels have swapped, when the one it lands in is no longer inert;
  // when the board was up and the step changed, focus follows to the new text.
  useEffect(() => {
    if (lastStep.current !== run.step.id) { if (wasUp.current) focusNext.current = 'text'; lastStep.current = run.step.id; }
    wasUp.current = up;
    const target = focusNext.current; focusNext.current = null;
    if (target === 'strip') strip.current?.focus();
    if (target === 'text') panel.current?.querySelector<HTMLElement>('[data-step-text]')?.focus();
  });
  const open = () => { focusNext.current = 'strip'; setUpFor(run.step.id); };
  const close = () => { focusNext.current = 'text'; setUpFor(null); };

  return (
    <>
      <div data-instruction ref={panel} inert={up} className="flex min-h-[100dvh] flex-col">
        {topBar}
        <main className="flex flex-col gap-4 px-4 pb-40 pt-2">
          <StepText run={run} withPrompt />
          <div><Button tone="quiet" isDisabled={run.index === 0} onPress={onBack}>◀ {t('back')}</Button></div>
        </main>
      </div>
      <BoardSheet up={up} onUp={open} onDown={close} stripRef={strip} strip={tx(run.step.explain)}
        counter={`${run.index + 1}/${run.total}`} dock={dock} resetKey={run.step.id}
        pauseMs={readingPauseMs(`${tx(run.step.explain)} ${run.step.question?.prompt ? tx(run.step.question.prompt) : ''}`.trim())}>
        {/* On a short phone the board shrinks so the strip, the answers and the dock still fit. */}
        <div className="mx-auto w-full" style={{ maxWidth: 'min(100vw - 16px, 100dvh - 232px)' }}>{board}</div>
        {actions}
        {tools}
      </BoardSheet>
    </>
  );
}
