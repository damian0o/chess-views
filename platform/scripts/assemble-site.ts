/**
 * Build the published site: the new app at the root and the proof of concept, unchanged, under poc/.
 * Run after `npm run build`: npx tsx scripts/assemble-site.ts   (writes platform/site/)
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Everything the POC page loads, relative to the repository root: index.html, the local scripts,
 * stylesheets and fetched files it names, and the whole engine folder (loaded by engine.js).
 */
export function pocFiles(repoRoot: string): string[] {
  const found = new Set<string>(['index.html']);
  const local = (f: string) => f.replace(/^\.\//, '').split('?')[0]!;
  const scan = (file: string) => {
    const text = readFileSync(join(repoRoot, file), 'utf8');
    const refs = [...text.matchAll(/(?:src|href)="([^"]+)"|from '([^']+)'|import\('([^']+)'\)|fetch\('([^']+)'/g)]
      .map((m) => local((m[1] ?? m[2] ?? m[3] ?? m[4])!))
      .filter((f) => !/^(https?:|data:|#|\/)/.test(f) && existsSync(join(repoRoot, f)));
    for (const f of refs) if (!found.has(f)) { found.add(f); if (f.endsWith('.js')) scan(f); }
  };
  scan('index.html');
  for (const f of readdirSync(join(repoRoot, 'engine'))) found.add(`engine/${f}`);
  return [...found];
}

export function assembleSite({ repoRoot, appDist, out }: { repoRoot: string; appDist: string; out: string }): void {
  rmSync(out, { recursive: true, force: true });
  cpSync(appDist, out, { recursive: true });
  const POC_FILES = pocFiles(repoRoot);
  for (const f of POC_FILES) {
    const dest = join(out, 'poc', f);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(repoRoot, f), dest);
  }
  // The new app's engine: the same vendored files, at the site root.
  for (const f of POC_FILES.filter((x) => x.startsWith('engine/'))) cpSync(join(repoRoot, f), join(out, f));
  writeFileSync(join(out, '.nojekyll'), '');   // serve files as they are
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const platform = fileURLToPath(new URL('..', import.meta.url));
  assembleSite({ repoRoot: join(platform, '..'), appDist: join(platform, 'dist', 'app'), out: join(platform, 'site') });
  console.log('site assembled in platform/site (app at /, POC at /poc/)');
}
