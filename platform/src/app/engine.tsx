/**
 * One engine for the whole app, created only when first needed: Stockfish's WASM worker behind the core's
 * EngineService (with its cache and its "never an unjudgeable position" rule). The status says whether it
 * runs; a failed or dead engine can be restarted.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createWasmStockfish, type WorkerLike } from '@core/engine/wasm';
import { cachedEngine } from '@core/engine/cache';
import { judgeable } from '@core/engine/index';
import type { AnalyseOptions, Analysis, EngineService } from '@core/engine/types';
import type { Fen } from '@core/types';

export type EngineStatus = 'idle' | 'starting' | 'ready' | 'failed' | 'dead';
export interface EngineApi { status: EngineStatus; analyse(fen: Fen, opts?: AnalyseOptions, signal?: AbortSignal): Promise<Analysis | null>; restart(): void }

const defaultWorker = (): WorkerLike => new Worker(new URL('engine/stockfish-19-lite-single.js', document.baseURI)) as unknown as WorkerLike;
const EngineContext = createContext<EngineApi | null>(null);

export function EngineProvider({ workerFactory = defaultWorker, children }: { workerFactory?: () => WorkerLike; children: ReactNode }) {
  const [status, setStatus] = useState<EngineStatus>('idle');
  const engine = useRef<EngineService | null>(null);

  const get = useCallback((): EngineService => {
    if (engine.current) return engine.current;
    setStatus('starting');
    const e = cachedEngine(createWasmStockfish({ workerFactory }));
    engine.current = e;
    e.ready().then(() => { if (engine.current === e) setStatus('ready'); }, () => { if (engine.current === e) setStatus('failed'); });
    return e;
  }, [workerFactory]);

  const analyse = useCallback(async (fen: Fen, opts: AnalyseOptions = {}, signal?: AbortSignal) => {
    if (!judgeable(fen)) return null;
    const e = get();
    try { return await e.analyse(fen, opts, signal); }
    catch (err) {
      const msg = (err as Error).message;
      if (engine.current === e && /stopped responding|worker failed/.test(msg)) setStatus(/worker failed/.test(msg) ? 'failed' : 'dead');
      throw err;
    }
  }, [get]);

  const restart = useCallback(() => {
    engine.current?.dispose();
    engine.current = null;
    setStatus('idle');
  }, []);

  const api = useMemo(() => ({ status, analyse, restart }), [status, analyse, restart]);
  return <EngineContext.Provider value={api}>{children}</EngineContext.Provider>;
}

export function useEngine(): EngineApi {
  const api = useContext(EngineContext);
  if (!api) throw new Error('useEngine outside EngineProvider');
  return api;
}
