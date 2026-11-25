import { parseRoute, routeHash } from './routes';

/**
 * On load: an old proof-of-concept link the app cannot open yet goes to the same hash under ./poc/
 * (location.replace, no history entry; the POC never forwards back, so nothing loops). An old lesson
 * link is rewritten to the new address in place. Returns true when the page is leaving.
 */
export interface Nav { replace(url: string): void; setHash(hash: string): void; setUrl(url: string): void }

export function forwardOldLink(hash: string, pocStepIds: Record<string, string[]>, nav: Nav): boolean {
  if (!hash || hash.startsWith('#/')) return false;
  const r = parseRoute(hash, pocStepIds);
  if (r.kind === 'poc') { nav.replace(`./poc/${r.hash}`); return true; }
  if (r.kind === 'lesson') nav.setHash(routeHash(r));
  if (r.kind === 'board') nav.setHash(`#/board?${new URLSearchParams(r.search).toString()}`);
  return false;
}

/** Keep forwarding while the app is open: an old link typed or pasted into a running tab is handled too. */
export function watchOldLinks(pocStepIds: Record<string, string[]>, env: Nav & { readonly hash: string; onHashChange(fn: () => void): void }): void {
  env.onHashChange(() => { forwardOldLink(env.hash, pocStepIds, env); });
}
