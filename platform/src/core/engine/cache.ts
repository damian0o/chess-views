import type { Fen } from '../types';
import type { Analysis, EngineService } from './types';

type Flight = { promise: Promise<Analysis>; ctrl: AbortController; waiting: number };
const aborted = () => new Error('engine: search aborted');

/**
 * An EngineService that remembers analyses per position and settings (least recently used out).
 * A result shallower than asked for is never kept, and an aborted or failed search leaves nothing.
 * Identical requests at the same time share one search, which stops only when every caller has
 * aborted. Every caller gets its own copy of a result.
 */
export function cachedEngine(engine: EngineService, max = 64): EngineService {
  const cache = new Map<string, Analysis>();
  const flying = new Map<string, Flight>();
  return {
    ...engine,
    analyse(fen: Fen, opts = {}, signal, onProgress) {
      const depth = opts.depth ?? 10;
      const key = `${fen}|${depth}|${opts.multipv ?? 1}|${opts.movetimeMs ?? ''}`;
      const hit = cache.get(key);
      if (hit) { cache.delete(key); cache.set(key, hit); return Promise.resolve(structuredClone(hit)); }
      const keep = (result: Analysis) => {
        if (opts.movetimeMs || result.depth >= depth) {
          cache.set(key, result);
          if (cache.size > max) cache.delete(cache.keys().next().value!);
        }
      };
      // A caller who wants progress lines gets a search of its own.
      if (onProgress) return engine.analyse(fen, opts, signal, onProgress).then((r) => { keep(r); return structuredClone(r); });

      let f = flying.get(key);
      if (!f) {
        const ctrl = new AbortController();
        const promise = engine.analyse(fen, opts, ctrl.signal);
        const flight: Flight = { promise, ctrl, waiting: 0 };
        f = flight;
        flying.set(key, flight);
        promise.then(keep, () => undefined).finally(() => { if (flying.get(key) === flight) flying.delete(key); });
      }
      const flight = f;
      flight.waiting++;
      return new Promise<Analysis>((resolve, reject) => {
        let settled = false;
        const leave = () => { if (settled) return false; settled = true; flight.waiting--; signal?.removeEventListener('abort', onAbort); return true; };
        const onAbort = () => { if (!leave()) return; if (flight.waiting === 0) flight.ctrl.abort(); reject(aborted()); };
        if (signal?.aborted) { onAbort(); return; }
        signal?.addEventListener('abort', onAbort);
        flight.promise.then((r) => { if (leave()) resolve(structuredClone(r)); }, (e: unknown) => { if (leave()) reject(e); });
      });
    },
  };
}
