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

/**
 * The screen of a running lesson or round: one board, the view dropdown with its legend, and the step card.
 * Back and Next move the address themselves (`onStep`); the address never moves the run back (one owner).
 */
function RunScreen({ run, onStep, onDone }: { run: LessonRun; onStep: (r: LessonRun) => void; onDone: () => void }) {
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
  const tapOpen = q?.kind === 'tap' && answering;
  const after = (move: () => Promise<void>) => async () => {
    await move();
    const r = store.getState().run;
    if (!r) onDone(); else onStep(r);
  };

  return (
    <>
      <TopBar title={run.lesson.title} extra={<span className="font-bold text-ink-soft">{run.index + 1}/{run.total}</span>} />
      <main className="mx-auto grid max-w-6xl gap-4 p-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] md:items-start">
        <div className="flex flex-col gap-3">
          <Board scene={scene} flip={scene.flip}
            onSquare={tapOpen ? (sq) => report({ kind: 'answer', value: sq }) : undefined}
            tapMarks={{ ...(tapRight ? { right: tapRight } : {}), ...(tapWrong ? { wrong: tapWrong } : {}) }} />
          <div className="flex flex-wrap items-center gap-2">
            <ViewPicker views={views} selected={view.id} allowed={run.allowedLayers} disabled={answering && isBlocks(run.step)}
              onChange={(v) => report({ kind: 'layers', on: v.layers })} />
            <LegendPopup view={view} />
          </div>
        </div>
        <StepCard run={run}
          onAnswer={(v) => report({ kind: 'answer', value: v })}
          onReveal={() => report({ kind: 'ply', ply: run.ply + 1 })}
          onBack={() => void after(() => store.getState().back())()}
          onNext={() => void after(() => store.getState().next())()} />
      </main>
      <p className="sr-only" aria-live="polite">{t('stepOf', { n: run.index + 1, total: run.total })}</p>
    </>
  );
}

/** #/lesson/<id>/<stepId?>: the address picks the lesson and the step; the screen opens it. */
export function LessonScreen({ id, stepId }: { id: string; stepId?: string | undefined }) {
  const [, navigate] = useLocation();
  const store = useAppStore();
  const run = useApp((s) => s.run);
  const isRound = useApp((s) => s.round !== null);
  useEffect(() => {
    const st = store.getState();
    const cur = st.run;
    const here = cur && !st.round && cur.lesson.id === id;
    if (here && cur.step.id === stepId) return;
    if (here && !stepId) { navigate(`/lesson/${id}/${cur.step.id}`, { replace: true }); return; }
    void st.openLesson(id, stepId).then(() => {
      const r = store.getState().run;
      if (!r) navigate('/home', { replace: true });
      else if (r.step.id !== stepId) navigate(`/lesson/${id}/${r.step.id}`, { replace: true });
    });
  }, [id, stepId, store, navigate]);
  if (!run || isRound || run.lesson.id !== id) return null;
  return <RunScreen run={run} onDone={() => navigate('/home')} onStep={(r) => navigate(`/lesson/${id}/${r.step.id}`, { replace: true })} />;
}

/** #/recognise/<seed>/<n>: a Recognise round on the same screen. */
export function RecogniseScreen({ seed, n }: { seed: number; n: number }) {
  const [, navigate] = useLocation();
  const store = useAppStore();
  const run = useApp((s) => s.run);
  const round = useApp((s) => s.round);
  useEffect(() => {
    const st = store.getState();
    if (st.round && st.round.seed === seed && st.run && st.run.index + 1 === n) return;
    void st.openRound(seed, n).then(() => { if (!store.getState().run) navigate('/home', { replace: true }); });
  }, [seed, n, store, navigate]);
  if (!run || !round || round.seed !== seed) return null;
  return <RunScreen run={run} onDone={() => navigate('/home')} onStep={(r) => navigate(`/recognise/${seed}/${r.index + 1}`, { replace: true })} />;
}
