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
  const [up, setUp] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLButtonElement>(null);
  const wasUp = useRef(false);
  const focusNext = useRef<'strip' | 'text' | null>(null);
  // A new step opens on its instruction; if the board was up, focus follows to the new text.
  useEffect(() => {
    if (wasUp.current) focusNext.current = 'text';
    setUp(false);
  }, [run.step.id]);
  // Focus moves after the panels have swapped, when the one it lands in is no longer inert.
  useEffect(() => {
    wasUp.current = up;
    const target = focusNext.current; focusNext.current = null;
    if (target === 'strip') strip.current?.focus();
    if (target === 'text') panel.current?.querySelector<HTMLElement>('[data-step-text]')?.focus();
  });
  const open = () => { focusNext.current = 'strip'; setUp(true); };
  const close = () => { focusNext.current = 'text'; setUp(false); };

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
        {board}
        {actions}
        {tools}
      </BoardSheet>
    </>
  );
}
