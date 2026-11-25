/**
 * The Stockfish WASM Web Worker behind EngineService. UCI over postMessage, one search at a time
 * (a queue), `stop` on abort or timeout, and the stopped search's late `bestmove` is drained so it
 * can never answer the next request. A worker error fails everything that is waiting.
 */
import type { Fen } from '../types';
import { analysisFromLines, moveOf } from './uci';
import { isJudgeable } from '../chess/rules';
import type { Analysis, EngineInfo, EngineService, Level } from './types';

export interface WorkerLike {
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  postMessage(cmd: string): void;
  terminate(): void;
}

const LEVELS: Record<Level, { skill: number; depth: number }> = {
  easy: { skill: 0, depth: 4 },
  medium: { skill: 4, depth: 8 },
  hard: { skill: 10, depth: 12 },
};

export function createWasmStockfish({ workerFactory, timeoutMs = 10000 }: { workerFactory: () => WorkerLike; timeoutMs?: number }): EngineService {
  const worker = workerFactory();
  const listeners = new Set<(line: string) => void>();
  const failures = new Set<(err: Error) => void>();
  // Once the worker fails, stops answering or is disposed, it is dead: everything waiting and everything later rejects at once.
  let dead: Error | null = null;
  const kill = (err: Error) => { if (dead) return; dead = err; for (const fail of [...failures]) fail(err); };
  worker.onmessage = (e) => { const line = String(e.data); for (const fn of [...listeners]) fn(line); };
  worker.onerror = () => kill(new Error('engine: worker failed'));
  const send = (cmd: string) => worker.postMessage(cmd);

  const waitFor = (prefix: string, ms: number, signal?: AbortSignal) => new Promise<string>((resolve, reject) => {
    const done = () => { clearTimeout(timer); listeners.delete(fn); failures.delete(fail); signal?.removeEventListener('abort', onAbort); };
    const timer = setTimeout(() => { done(); reject(new Error(`engine: no "${prefix}" within ${ms} ms`)); }, ms);
    const fn = (line: string) => { if (line.startsWith(prefix)) { done(); resolve(line); } };
    const fail = (err: Error) => { done(); reject(err); };
    const onAbort = () => { done(); reject(new Error('engine: search aborted')); };
    if (dead) { done(); reject(dead); return; }
    if (signal?.aborted) { onAbort(); return; }
    signal?.addEventListener('abort', onAbort);
    listeners.add(fn); failures.add(fail);
  });

  /** One `go …`: every line until `bestmove`. On timeout or abort: stop, drain the late bestmove, rethrow. */
  async function search(goCmd: string, signal: AbortSignal | undefined, onLine?: (lines: string[]) => void): Promise<string[]> {
    const lines: string[] = [];
    const collect = (line: string) => { lines.push(line); if (line.startsWith('info ')) onLine?.(lines); };
    listeners.add(collect);
    try {
      send(goCmd);
      await waitFor('bestmove', timeoutMs, signal);
    } catch (err) {
      listeners.delete(collect);
      if (!dead) {
        // Stop, and wait for the stopped search's bestmove so it cannot answer the next one. No answer: the worker is dead.
        send('stop');
        const drained = await waitFor('bestmove', 2000).then(() => true, () => false);
        if (!drained && !dead) { kill(new Error('engine: the engine stopped responding')); worker.terminate(); }
      }
      throw err;
    } finally { listeners.delete(collect); }
    return lines;
  }

  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(job: () => Promise<T>): Promise<T> => {
    const guarded = () => (dead ? Promise.reject(dead) : job());
    const run = queue.then(guarded, guarded);
    queue = run.catch(() => undefined);
    return run;
  };

  let name = 'Stockfish';
  const nameListener = (line: string) => { if (line.startsWith('id name ')) name = line.slice(8).trim(); };
  const readyP = serial(async (): Promise<EngineInfo> => {
    listeners.add(nameListener);
    try {
      send('uci'); await waitFor('uciok', timeoutMs);
      send('isready'); await waitFor('readyok', timeoutMs);
    } finally { listeners.delete(nameListener); }
    return { name };
  });
  readyP.catch(() => undefined);   // callers see the rejection through ready(); no unhandled rejection here

  let multiPV: number | null = null;
  let skill: number | null = null;

  const unjudgeable = () => Promise.reject(new Error('engine: the engine cannot judge this position'));

  return {
    ready: () => (dead ? Promise.reject(dead) : readyP),
    analyse(fen: Fen, { depth = 10, multipv = 1, movetimeMs } = {}, signal, onProgress) {
      if (!isJudgeable(fen)) return unjudgeable();
      return serial(async (): Promise<Analysis> => {
        await readyP;
        if (signal?.aborted) throw new Error('engine: search aborted');   // aborted while it waited its turn: send nothing
        if (multipv !== multiPV) { send(`setoption name MultiPV value ${multipv}`); multiPV = multipv; }
        send(`position fen ${fen}`);
        const lines = await search(movetimeMs ? `go movetime ${movetimeMs}` : `go depth ${depth}`, signal, onProgress && ((ls) => onProgress(analysisFromLines(ls))));
        return analysisFromLines(lines);
      });
    },
    bestMove(fen: Fen, { level }, signal) {
      if (!isJudgeable(fen)) return unjudgeable();
      return serial(async () => {
        await readyP;
        if (signal?.aborted) throw new Error('engine: search aborted');
        const o = LEVELS[level];
        if (o.skill !== skill) { send(`setoption name Skill Level value ${o.skill}`); skill = o.skill; }
        send('ucinewgame'); send('isready'); await waitFor('readyok', timeoutMs, signal);
        send(`position fen ${fen}`);
        const lines = await search(`go depth ${o.depth}`, signal);
        const uci = lines.filter((l) => l.startsWith('bestmove')).pop()?.split(/\s+/)[1];
        return !uci || uci === '(none)' ? null : moveOf(uci);
      });
    },
    dispose: () => { kill(new Error('engine: disposed')); worker.terminate(); },
  };
}
