import type { Fen } from '../types';
import type { Analysis, EngineService } from './types';

/**
 * An EngineService that remembers analyses per position and settings (least recently used out).
 * A result shallower than asked for is never kept, and an aborted or failed search leaves nothing.
 */
export function cachedEngine(engine: EngineService, max = 64): EngineService {
  const cache = new Map<string, Analysis>();
  return {
    ...engine,
    async analyse(fen: Fen, opts = {}, signal, onProgress) {
      const depth = opts.depth ?? 10;
      const key = `${fen}|${depth}|${opts.multipv ?? 1}|${opts.movetimeMs ?? ''}`;
      const hit = cache.get(key);
      if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
      const result = await engine.analyse(fen, opts, signal, onProgress);
      if (opts.movetimeMs || result.depth >= depth) {
        cache.set(key, result);
        if (cache.size > max) cache.delete(cache.keys().next().value!);
      }
      return result;
    },
  };
}
