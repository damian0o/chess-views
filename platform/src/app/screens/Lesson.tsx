import { useEffect } from 'react';
import { useLocation } from 'wouter';
import type { LessonRun } from '@core/lessons/run';
import { sceneOfRun, isBlocks } from '@core/scene';
import type { Square } from '@core/types';
import { useApp, useAppStore } from '../appStore';
import { useT } from '../i18n';
import { Board } from '../board/Board';
import { TopBar } from '../ui/TopBar';
import { StepCard } from '../lesson/StepCard';
import { ViewPicker } from '../lesson/ViewPicker';
import { LegendPopup } from '../lesson/LegendPopup';
import { lessonViews, viewOf } from '../views';

/** The screen of a running lesson or round: one board, the view dropdown with its legend, and the step card. */
function RunScreen({ run, onDone }: { run: LessonRun; onDone: () => void }) {
  const t = useT();
  const store = useAppStore();
  const report = useApp((s) => s.report);
  const scene = sceneOfRun(run);
  const q = run.step.question;
  const answering = run.gate?.kind === 'answer';
  const views = lessonViews(run.lesson);
  const view = viewOf(run.layersOn);
  const tapRight = q?.kind === 'tap' && run.answered ? q.squares[0] : undefined;
  const tapWrong = q?.kind === 'tap' && run.lastAnswer === 'wrong' ? (run.wrong.at(-1) as Square | undefined) : undefined;
  const onSquare = (sq: Square) => { if (q?.kind === 'tap' && answering) report({ kind: 'answer', value: sq }); };
  const next = async () => { await store.getState().next(); if (!store.getState().run) onDone(); };

  return (
    <>
      <TopBar title={run.lesson.title} extra={<span className="font-bold text-ink-soft">{run.index + 1}/{run.total}</span>} />
      <main className="mx-auto grid max-w-6xl gap-4 p-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] md:items-start">
        <div className="flex flex-col gap-3">
          <Board scene={scene} onSquare={onSquare} flip={scene.flip}
            tapMarks={{ ...(tapRight ? { right: tapRight } : {}), ...(tapWrong ? { wrong: tapWrong } : {}) }} />
          <div className="flex flex-wrap items-center gap-2">
            <ViewPicker views={views} selected={view.id} disabled={answering && isBlocks(run.step)}
              onChange={(v) => report({ kind: 'layers', on: v.layers })} />
            <LegendPopup view={view} />
          </div>
        </div>
        <StepCard run={run}
          onAnswer={(v) => report({ kind: 'answer', value: v })}
          onReveal={() => report({ kind: 'ply', ply: run.ply + 1 })}
          onBack={() => void store.getState().back()}
          onNext={() => void next()} />
      </main>
      <p className="sr-only" aria-live="polite">{t('stepOf', { n: run.index + 1, total: run.total })}</p>
    </>
  );
}

/** #/lesson/<id>/<stepId?>: opens the lesson (resuming), keeps the link on the current step. */
export function LessonScreen({ id, stepId }: { id: string; stepId?: string | undefined }) {
  const [, navigate] = useLocation();
  const store = useAppStore();
  const run = useApp((s) => s.run);
  const isRound = useApp((s) => s.round !== null);
  useEffect(() => {
    const cur = store.getState().run;
    if (cur && !store.getState().round && cur.lesson.id === id && (!stepId || cur.step.id === stepId)) return;
    void store.getState().openLesson(id, stepId).then(() => { if (!store.getState().run) navigate('/home', { replace: true }); });
  }, [id, stepId, store, navigate]);
  useEffect(() => {
    if (run && !isRound && run.lesson.id === id && run.step.id !== stepId) navigate(`/lesson/${id}/${run.step.id}`, { replace: true });
  }, [run, isRound, id, stepId, navigate]);
  if (!run || isRound || run.lesson.id !== id) return null;
  return <RunScreen run={run} onDone={() => navigate('/home')} />;
}

/** #/recognise/<seed>/<n>: a Recognise round on the same screen. */
export function RecogniseScreen({ seed, n }: { seed: number; n: number }) {
  const [, navigate] = useLocation();
  const store = useAppStore();
  const run = useApp((s) => s.run);
  const round = useApp((s) => s.round);
  useEffect(() => {
    const r = store.getState().round;
    if (r && r.seed === seed && store.getState().run) return;
    void store.getState().openRound(seed, n).then(() => { if (!store.getState().run) navigate('/home', { replace: true }); });
  }, [seed, n, store, navigate]);
  useEffect(() => {
    if (run && round && round.seed === seed && run.index + 1 !== n) navigate(`/recognise/${seed}/${run.index + 1}`, { replace: true });
  }, [run, round, seed, n, navigate]);
  if (!run || !round || round.seed !== seed) return null;
  return <RunScreen run={run} onDone={() => navigate('/home')} />;
}
