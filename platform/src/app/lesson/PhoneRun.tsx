import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LessonRun } from '@core/lessons/run';
import { useT, useText } from '../i18n';
import { Button } from '../ui/Button';
import { StepText } from './StepText';
import { BoardSheet } from './BoardSheet';
import { NEXT_PAUSE_MS, NEXT_SLIDE_MS, readingPauseMs } from './sheet';

/**
 * A lesson step on a phone: the instruction first; the child pulls the board up (that is the "Rozumiem"),
 * and every new step opens on its instruction again.
 */
export function PhoneRun({ run, topBar, board, actions, tools, dock, onBack }: {
  run: LessonRun; topBar: ReactNode; board: ReactNode; actions: ReactNode; tools: ReactNode; dock: ReactNode; onBack: () => void;
}) {
  const t = useT(); const tx = useText();
  // The sheet is up for the step it was pulled up on. After Next it is still up for the old step: it stays a moment
  // (inert, so the new step takes no taps yet), then slides down slowly to the new step's instruction.
  const [upFor, setUpFor] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const leaving = upFor !== null && upFor !== run.step.id;
  const up = upFor !== null;
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => { setSlow(true); setUpFor(null); }, NEXT_PAUSE_MS);
    return () => clearTimeout(id);
  }, [leaving]);
  useEffect(() => {
    if (!slow) return;
    const id = setTimeout(() => setSlow(false), NEXT_SLIDE_MS);
    return () => clearTimeout(id);
  }, [slow]);
  const panel = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLButtonElement>(null);
  const lastStep = useRef(run.step.id);
  const wasUp = useRef(false);
  const focusNext = useRef<'strip' | 'text' | null>(null);
  const toTop = useRef(false);
  // Focus moves after the panels have swapped, when the one it lands in is no longer inert;
  // when the board was up and the step changed, focus follows to the new text.
  useEffect(() => {
    if (lastStep.current !== run.step.id) { if (wasUp.current) focusNext.current = 'text'; lastStep.current = run.step.id; toTop.current = true; }
    // A new step's instruction starts at the top of the page (once the board is down: iOS may have scrolled it).
    if (toTop.current && !up) { toTop.current = false; window.scrollTo(0, 0); }
    if (!leaving) wasUp.current = up;
    // While the board lingers the instruction is still inert: focus waits until it is down.
    const target = up && focusNext.current === 'text' ? null : focusNext.current;
    if (target) focusNext.current = null;
    if (target === 'strip') strip.current?.focus();
    if (target === 'text') panel.current?.querySelector<HTMLElement>('[data-step-text]')?.focus({ preventScroll: true });
  });
  const open = () => { focusNext.current = 'strip'; setUpFor(run.step.id); };
  const close = () => { focusNext.current = 'text'; setSlow(false); setUpFor(null); };

  return (
    <>
      <div data-instruction ref={panel} inert={up} className="flex min-h-svh flex-col">
        {topBar}
        <main className="flex flex-col gap-4 px-4 pb-40 pt-2">
          <StepText run={run} withPrompt />
          <div><Button tone="quiet" isDisabled={run.index === 0} onPress={onBack}>◀ {t('back')}</Button></div>
        </main>
      </div>
      <BoardSheet up={up} leaving={leaving} slow={slow} onUp={open} onDown={close} stripRef={strip} strip={tx(run.step.explain)}
        counter={`${run.index + 1}/${run.total}`} dock={dock} resetKey={run.step.id}
        pauseMs={readingPauseMs(`${tx(run.step.explain)} ${run.step.question?.prompt ? tx(run.step.question.prompt) : ''}`.trim())}>
        {/* On a short phone the board shrinks so the strip, the answers and the dock still fit. */}
        <div className="mx-auto w-full" style={{ maxWidth: 'min(100vw - 16px, 100dvh - 244px)' }}>{board}</div>
        {actions}
        {tools}
      </BoardSheet>
    </>
  );
}
