/**
 * Build the published site: the new app at the root and the proof of concept, unchanged, under poc/.
 * Run after `npm run build`: npx tsx scripts/assemble-site.ts   (writes platform/site/)
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Everything the POC page loads, relative to the repository root. */
export const POC_FILES = [
  'index.html', 'analysis.js', 'coach.js', 'engine.js', 'lessons.js', 'pieces.css', 'positions.json',
  'engine/stockfish-19-lite-single.js', 'engine/stockfish-19-lite-single.wasm', 'engine/COPYING.txt', 'engine/README.md',
];

export function assembleSite({ repoRoot, appDist, out }: { repoRoot: string; appDist: string; out: string }): void {
  rmSync(out, { recursive: true, force: true });
  cpSync(appDist, out, { recursive: true });
  for (const f of POC_FILES) {
    const dest = join(out, 'poc', f);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(repoRoot, f), dest);
  }
  writeFileSync(join(out, '.nojekyll'), '');   // serve files as they are
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const platform = fileURLToPath(new URL('..', import.meta.url));
  assembleSite({ repoRoot: join(platform, '..'), appDist: join(platform, 'dist', 'app'), out: join(platform, 'site') });
  console.log('site assembled in platform/site (app at /, POC at /poc/)');
}
