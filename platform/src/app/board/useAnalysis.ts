import { useEffect, useRef, useState } from 'react';
import type { Analysis } from '@core/engine/types';
import { judgeable } from '@core/engine/index';
import type { Fen } from '@core/types';
import { useEngine } from '../engine';

export type AnalysisState =
  | { kind: 'off' } | { kind: 'none' } | { kind: 'thinking' } | { kind: 'failed' } | { kind: 'dead' } | { kind: 'slow' }
  | { kind: 'done'; analysis: Analysis; fen: Fen };

/** Which failure an engine error is: too slow to start, stopped answering, or cannot run here. */
export const stateForError = (message: string): 'slow' | 'dead' | 'failed' =>
  /within \d+ ms/.test(message) ? 'slow' : /stopped responding/.test(message) ? 'dead' : 'failed';

/** The engine's view of `fen` while `on`; an answer for a position no longer on screen is dropped. */
export function useAnalysis(fen: Fen, on: boolean, opts = { depth: 10, multipv: 3 }) {
  const engine = useEngine();
  const [state, setState] = useState<AnalysisState>({ kind: 'off' });
  const [attempt, setAttempt] = useState(0);
  const current = useRef(fen);
  current.current = fen;
  useEffect(() => {
    if (!on) { setState({ kind: 'off' }); return; }
    if (!judgeable(fen)) { setState({ kind: 'none' }); return; }
    const ctrl = new AbortController();
    setState({ kind: 'thinking' });
    engine.analyse(fen, opts, ctrl.signal).then(
      (a) => { if (current.current === fen && !ctrl.signal.aborted) setState(a ? { kind: 'done', analysis: a, fen } : { kind: 'none' }); },
      (e: Error) => { if (current.current === fen && !/aborted/.test(e.message)) setState({ kind: stateForError(e.message) }); },
    );
    return () => ctrl.abort();
  }, [fen, on, attempt, opts.depth, opts.multipv]);
  const retry = () => { engine.restart(); setAttempt((n) => n + 1); };
  return { state, retry };
}
