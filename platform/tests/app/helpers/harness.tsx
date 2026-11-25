import { render } from '@testing-library/react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { createAppStore, type AppStore } from '../../../src/app/store';
import { AppStoreProvider } from '../../../src/app/appStore';
import { EngineProvider } from '../../../src/app/engine';
import { compileContent } from '../../../src/content/compile';
import stepIds from '../../../content/poc-step-ids.json';
import type { StorageLike } from '@core/storage/index';

const content = compileContent(join(process.cwd(), 'content'));   // vitest runs in platform/
export const LESSONS = content.lessons;

export const memory = (init: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
};
export const makeStore = (storage = memory(), opts: { minStepMs?: number; fetch?: typeof fetch; fetchTimeoutMs?: number } = {}) => createAppStore({ storage, lessons: content.lessons, library: content.library, pocStepIds: stepIds as Record<string, string[]>, minStepMs: opts.minStepMs ?? 0, ...(opts.fetch ? { fetch: opts.fetch } : {}), ...(opts.fetchTimeoutMs ? { fetchTimeoutMs: opts.fetchTimeoutMs } : {}) });

/** Render UI with a store and an in-memory router starting at `path`. */
export function mount(ui: ReactNode, { store = makeStore(), path = '/' }: { store?: AppStore; path?: string } = {}) {
  const [p, q] = path.split('?');
  const loc = memoryLocation({ path: p!, ...(q ? { searchPath: q } : {}), record: true });
  // A quiet engine by default (never answers); tests of the engine wrap their own provider inside.
  const quiet = () => ({ onmessage: null, onerror: null, postMessage() {}, terminate() {} });
  const result = render(<AppStoreProvider store={store}><EngineProvider workerFactory={quiet}><Router hook={loc.hook}>{ui}</Router></EngineProvider></AppStoreProvider>);
  return { ...result, store, history: loc.history!, navigate: loc.navigate };
}
