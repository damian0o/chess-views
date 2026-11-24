import { parseRoute, routeHash } from './routes';

/**
 * On load: an old proof-of-concept link the app cannot open yet goes to the same hash under ./poc/
 * (location.replace, no history entry; the POC never forwards back, so nothing loops). An old lesson
 * link is rewritten to the new address in place. Returns true when the page is leaving.
 */
export function forwardOldLink(hash: string, pocStepIds: Record<string, string[]>, nav: { replace(url: string): void; setHash(hash: string): void }): boolean {
  if (!hash || hash.startsWith('#/')) return false;
  const r = parseRoute(hash, pocStepIds);
  if (r.kind === 'poc') { nav.replace(`./poc/${r.hash}`); return true; }
  if (r.kind === 'lesson') nav.setHash(routeHash(r));
  return false;
}
