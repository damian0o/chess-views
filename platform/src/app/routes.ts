/** Hash routes, and old POC links: an old lesson link opens the same step; any other old link goes to /poc/. */
export type Route =
  | { kind: 'players' }
  | { kind: 'home' }
  | { kind: 'lesson'; id: string; stepId?: string }
  | { kind: 'recognise'; seed: number; step: number }
  | { kind: 'settings' }
  | { kind: 'poc'; hash: string }
  | { kind: 'notFound' };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseRoute(hash: string, pocStepIds: Record<string, string[]>): Route {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (h === '' || h === '/') return { kind: 'players' };
  if (h.startsWith('/')) {
    const [, a, b, c, ...rest] = h.split('/');
    if (rest.length) return { kind: 'notFound' };
    if (a === 'home' && b === undefined) return { kind: 'home' };
    if (a === 'settings' && b === undefined) return { kind: 'settings' };
    if (a === 'lesson' && b && SLUG.test(b) && (c === undefined || SLUG.test(c))) return c ? { kind: 'lesson', id: b, stepId: c } : { kind: 'lesson', id: b };
    if (a === 'recognise' && b && /^\d+$/.test(b) && c && /^[1-9]\d*$/.test(c)) return { kind: 'recognise', seed: Number(b), step: Number(c) };
    return { kind: 'notFound' };
  }
  if (!h.includes('=')) return { kind: 'notFound' };
  // An old proof-of-concept link.
  const p = new URLSearchParams(h);
  const lesson = p.get('lesson');
  const ids = lesson ? pocStepIds[lesson] : undefined;
  const step = Number(p.get('step') ?? '1');
  if (ids?.length && Number.isInteger(step) && step >= 1) return { kind: 'lesson', id: lesson!, stepId: ids[Math.min(step, ids.length) - 1]! };
  return { kind: 'poc', hash: `#${h}` };
}

export function routeHash(r: Route): string {
  switch (r.kind) {
    case 'players': return '#/';
    case 'home': return '#/home';
    case 'settings': return '#/settings';
    case 'lesson': return r.stepId ? `#/lesson/${r.id}/${r.stepId}` : `#/lesson/${r.id}`;
    case 'recognise': return `#/recognise/${r.seed}/${r.step}`;
    case 'poc': return r.hash;
    case 'notFound': return '#/';
  }
}
