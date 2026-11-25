import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import type { LessonRun } from '@core/lessons/run';
import { sceneOfRun, isBlocks } from '@core/scene';
import type { Fen, Square } from '@core/types';
import { loadGame } from '@core/chess/rules';
import { tapGuess, type GuessState } from '@core/guess';
import type { MessageKey } from '@core/i18n/index';
import { showsSquareNames } from '@core/storage/index';
import { useApp, useAppStore } from '../appStore';
import { useT } from '../i18n';
import { Board } from '../board/Board';
import { TopBar } from '../ui/TopBar';
import { Button } from '../ui/Button';
import { StepCard } from '../lesson/StepCard';
import { ViewPicker } from '../lesson/ViewPicker';
import { LegendPopup } from '../lesson/LegendPopup';
import { lessonViews, viewOf } from '../views';
import { useSolve } from '../lesson/useSolve';

const HINT: Record<string, MessageKey> = { opponent: 'guessOpponent', empty: 'guessEmpty', illegal: 'guessIllegal', stuck: 'guessStuck' };

/**
 * The screen of a running lesson or round: one board, the view dropdown with its legend, and the step card.
 * Back and Next move the address themselves (`onStep`); the address never moves the run back (one owner).
 */
function RunScreen({ run, onStep, onDone }: { run: LessonRun; onStep: (r: LessonRun) => void; onDone: () => void }) {
  const t = useT();
  const store = useAppStore();
  const report = useApp((s) => s.report);
  const player = useApp((s) => s.player);
  const scene = sceneOfRun(run);
  const q = run.step.question;
  const answering = run.gate?.kind === 'answer';
  const views = lessonViews(run.lesson);
  const view = viewOf(run.layersOn);
  // The right mark goes on the square the child tapped (any of the right squares), else the first one.
  const [lastTap, setLastTap] = useState<Square | undefined>(undefined);
  const tapRight = q?.kind === 'tap' && run.answered ? (lastTap && q.squares.includes(lastTap) ? lastTap : q.squares[0]) : undefined;
  const tapWrong = q?.kind === 'tap' && run.lastAnswer === 'wrong' ? (run.wrong.at(-1) as Square | undefined) : undefined;
  const tapOpen = q?.kind === 'tap' && answering;
  // A "find the move" step: the child plays the move on the board and the engine judges it.
  const step = run.step;
  const solveAt = useMemo(() => {
    const pos = step.scene.position;
    if (!step.solve) return null;
    try {
      const game = loadGame(pos);
      const ply = pos.kind === 'pgn' ? pos.ply : 0;
      const m = game.moves()[ply];
      return { ply, fen: game.fen(ply), gameUci: m ? `${m.from}${m.to}${m.promotion ?? ''}` : null, gameSan: m?.san ?? null };
    } catch { return null; }
  }, [step]);
  const solving = !!solveAt && run.gate?.kind === 'reveal';
  // A step from a game can be played on through the game with ◀ ▶, but not while a question or task is open.
  const gameLength = useMemo(() => {
    const pos = step.scene.position;
    if (pos.kind !== 'pgn') return 0;
    try { return loadGame({ ...pos, ply: 0 }).length; } catch { return 0; }
  }, [step]);
  const movesLocked = !!run.gate;
  const solve = useSolve(solveAt?.fen ?? null, solveAt?.gameUci ?? null);
  const [pick, setPick] = useState<GuessState>({});
  const [hint, setHint] = useState<MessageKey | null>(null);
  useEffect(() => { setPick({}); setHint(null); }, [step.id]);
  const onSolveTap = (sq: Square) => {
    if (!solveAt || solve.state.kind === 'checking') return;
    const r = tapGuess(pick, sq, solveAt.fen as Fen);
    setPick(r.state);
    if (r.result.kind === 'ignore') { setHint(HINT[r.result.reason]!); return; }
    setHint(null);
    if (r.result.kind !== 'guess') return;
    void solve.submit({ move: r.result.move, san: r.result.san }).then((check) => {
      if (check?.kind === 'right') report({ kind: 'ply', ply: solveAt.ply + 1 });
    });
  };
  const judged = solve.state.kind === 'judged' ? solve.state : null;
  const solveMarks = judged?.check.kind === 'right' && judged.check.game ? { right: judged.guess.move.to as Square }
    : judged && judged.check.kind !== 'right' && solving ? { wrong: judged.guess.move.to as Square } : {};
  const boardScene = solving && pick.from ? { ...scene, focus: [...scene.focus, pick.from] } : scene;
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
          <Board scene={boardScene} flip={scene.flip} squareNames={!!player && showsSquareNames(player)}
            onSquare={tapOpen ? (sq) => { setLastTap(sq); report({ kind: 'answer', value: sq }); } : solving ? onSolveTap : undefined}
            tapMarks={{ ...(tapRight ? { right: tapRight } : {}), ...(tapWrong ? { wrong: tapWrong } : {}), ...solveMarks }} />
          <div className="flex flex-wrap items-center gap-2">
            <ViewPicker views={views} selected={view.id} allowed={run.allowedLayers} disabled={answering && isBlocks(run.step)}
              onChange={(v) => report({ kind: 'layers', on: v.layers })} />
            <LegendPopup view={view} />
          </div>
          {gameLength > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button tone="quiet" aria-label={t('prevMove')} isDisabled={movesLocked || run.ply <= 0} onPress={() => report({ kind: 'ply', ply: run.ply - 1 })}>◀</Button>
              <Button tone="quiet" aria-label={t('nextMove')} isDisabled={movesLocked || run.ply >= gameLength} onPress={() => report({ kind: 'ply', ply: run.ply + 1 })}>▶</Button>
              <span className="font-bold text-ink-soft">{t('moveOfTotal', { n: run.ply, total: gameLength })}</span>
            </div>
          )}
        </div>
        <StepCard run={run}
          solve={{ state: solve.state, tries: solve.tries, hint, solving, gameSan: solveAt?.gameSan ?? null }}
          onAnswer={(v) => report({ kind: 'answer', value: v })}
          onReveal={() => { setPick({}); report({ kind: 'ply', ply: (solveAt?.ply ?? run.ply) + 1 }); }}
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
