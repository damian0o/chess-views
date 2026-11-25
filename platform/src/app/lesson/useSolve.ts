import { useEffect, useRef, useState } from 'react';
import type { Score } from '@core/engine/types';
import { judgeSolve, type SolveCheck } from '@core/solve';
import { playMove } from '@core/chess/rules';
import type { Fen } from '@core/types';
import { useEngine } from '../engine';
import type { Guess } from '../board/GuessPanel';

export type SolveState =
  | { kind: 'idle' }
  | { kind: 'checking'; guess: Guess }
  | { kind: 'judged'; guess: Guess; check: SolveCheck };

const DEPTH = 12;

/**
 * A "find the move" step: the engine scores the step's position as soon as it opens, then each move the
 * child plays (the position after it). `tries` counts judged moves that did not solve the step.
 */
export function useSolve(fen: Fen | null, gameUci: string | null) {
  // `analyse` stays the same function while the engine starts; the engine object itself changes with its status.
  const { analyse } = useEngine();
  const [state, setState] = useState<SolveState>({ kind: 'idle' });
  const [tries, setTries] = useState(0);
  const best = useRef<Promise<Score | null>>(Promise.resolve(null));
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    setState({ kind: 'idle' }); setTries(0);
    if (!fen) return;
    const c = new AbortController();
    ctrl.current = c;
    best.current = analyse(fen, { depth: DEPTH, multipv: 1 }, c.signal).then((a) => a?.lines[0]?.score ?? null, () => null);
    return () => c.abort();
  }, [fen, analyse]);

  const submit = async (guess: Guess): Promise<SolveCheck | null> => {
    if (!fen) return null;
    const after = playMove(fen, guess.move.uci);
    if (!after) return null;
    const isGameMove = guess.move.uci === gameUci;
    if (isGameMove) {
      // The game's move needs no engine: it solves the step at once.
      const check = judgeSolve({ best: null, after: null, isGameMove });
      setState({ kind: 'judged', guess, check });
      return check;
    }
    setState({ kind: 'checking', guess });
    const signal = ctrl.current?.signal;
    const afterScore: Score | 'mate' | 'stalemate' | null = after.status === 'mate' || after.status === 'stalemate' ? after.status
      : await analyse(after.fen, { depth: DEPTH, multipv: 1 }, signal).then((a) => a?.lines[0]?.score ?? null, () => null);
    const check = judgeSolve({ best: await best.current, after: afterScore, isGameMove });
    if (signal?.aborted) return null;
    setState({ kind: 'judged', guess, check });
    if (check.kind !== 'right') setTries((n) => n + 1);
    return check;
  };
  const clear = () => setState({ kind: 'idle' });
  return { state, tries, submit, clear };
}
