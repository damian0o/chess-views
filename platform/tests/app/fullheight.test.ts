import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(tsx|css)$/.test(p) ? [p] : [];
});

describe('a page is never taller than the phone shows', () => {
  // On iOS 100vh and 100dvh can count the browser's hidden bars, so a screen that only needs to fill the phone
  // scrolls by a bar's height. A minimum height is in svh: the phone with its bars showing.
  test('no minimum height in vh or dvh anywhere in the app', () => {
    const bad = files('src/app').flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => [f, i + 1, l] as const))
      .filter(([, , l]) => /min-h-dvh|min-h-screen|min-h-\[100d?vh\]|min-height:\s*100d?vh/.test(l))
      .map(([f, n]) => `${f}:${n}`);
    expect(bad).toEqual([]);
  });
});
