/**
 * Routing entirely inside the hash: `#/board?fen=…` keeps the path and its query together, so one
 * hashchange moves both (no split between popstate and hashchange), nothing reaches the server, and no
 * query is left behind on other routes.
 */
import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };
const raw = () => window.location.hash.replace(/^#/, '') || '/';
export const hashPath = () => raw().split('?')[0] || '/';
export const hashSearch = () => raw().split('?')[1] ?? '';

export function navigateHash(to: string, { replace = false }: { replace?: boolean } = {}) {
  const url = `#${to}`;
  if (replace) {
    try { history.replaceState(history.state, '', url); } catch { return; }   // Safari limits replaceState bursts
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else window.location.hash = url;
}

export const useHashRoute = (): [string, typeof navigateHash] => [useSyncExternalStore(subscribe, hashPath), navigateHash];
export const useHashSearch = (): string => useSyncExternalStore(subscribe, hashSearch);
