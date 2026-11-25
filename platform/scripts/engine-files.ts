/** Which vendored engine file a dev-server URL names, and its type; null when it names none. */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TYPES: Record<string, string> = { '.js': 'text/javascript', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

export function engineFileFor(url: string, root: string): { file: string; type: string } | null {
  const m = /\/engine\/([\w-]+(\.[\w]+))$/.exec(url.split(/[?#]/)[0] ?? '');
  if (!m) return null;
  const file = join(root, m[1]!);
  const type = TYPES[m[2]!];
  return type && existsSync(file) && statSync(file).isFile() ? { file, type } : null;
}
