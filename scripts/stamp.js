// Rewrites the ?v= query on analysis.js and pieces.css in index.html to a hash of each file's
// content, so a freshly served page can never pair with a stale cached module or stylesheet.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const stampOf = (text) => createHash('sha1').update(text).digest('hex').slice(0, 8);
export const ASSETS = ['analysis.js', 'pieces.css', 'engine.js', 'coach.js'];

export function expectedStamps(root = new URL('../', import.meta.url)) {
  return Object.fromEntries(ASSETS.map((f) => [f, stampOf(readFileSync(new URL(f, root), 'utf8'))]));
}

export function stampedHtml(html, stamps) {
  let out = html;
  for (const [file, v] of Object.entries(stamps)) {
    const re = new RegExp(`(["'./]*${file.replace('.', '\\.')})(\\?v=[0-9a-f]*)?(["'])`, 'g');
    out = out.replace(re, `$1?v=${v}$3`);
  }
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const root = new URL('../', import.meta.url);
  const path = new URL('index.html', root);
  const stamps = expectedStamps(root);
  writeFileSync(path, stampedHtml(readFileSync(path, 'utf8'), stamps));
  console.log('stamped', stamps);
}
