// @vitest-environment jsdom
/** The Kredki look: its two colour sets and the crayon layer. */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ThemeRoot } from '../../src/app/theme/ThemeRoot';
import { defaultProfile } from '@core/storage/index';

const hex = (h: string) => { const n = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255); };
const lum = (h: string) => { const [r, g, b] = hex(h).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
const css = readFileSync(join(process.cwd(), 'src/app/theme/tokens.css'), 'utf8');
const set = (mode: string) => {
  const body = new RegExp(`\\[data-family="crayons"\\]\\[data-mode="${mode}"\\] \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, k, c]) => [k!, c!])) as Record<string, string>;
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe.each(['light', 'dark'])('Kredki %s colours', (mode) => {
  const v = set(mode);
  test('the set exists', () => expect(Object.keys(v).length).toBeGreaterThan(10));
  test.each([['ink', 'surface'], ['ink', 'card'], ['accent-ink', 'accent'], ['accent-2-ink', 'accent-2'], ['good-ink', 'good'], ['bad-ink', 'bad'], ['board-ink', 'board-dark'], ['board-ink', 'board-light']])('%s on %s ≥ 4.5', (a, b) => expect(contrast(v[a]!, v[b]!)).toBeGreaterThanOrEqual(4.5));
  test('the title stands out (≥ 3, large text)', () => expect(contrast(v.title!, v.surface!)).toBeGreaterThanOrEqual(3));
  test('dark squares are light enough for black pieces', () => expect(lum(v['board-dark']!)).toBeGreaterThan(0.45));
});

describe('Kredki follows the system mode', () => {
  test('light ↔ dark live, the look stays Kredki', () => {
    let dark = false; const ls = new Set<(e: { matches: boolean }) => void>();
    vi.stubGlobal('matchMedia', () => ({ get matches() { return dark; }, addEventListener: (_: string, l: (e: { matches: boolean }) => void) => ls.add(l), removeEventListener: () => {} }));
    render(<ThemeRoot profile={defaultProfile()}><p>x</p></ThemeRoot>);
    const h = document.documentElement;
    expect([h.dataset.family, h.dataset.mode]).toEqual(['crayons', 'light']);
    act(() => { dark = true; for (const l of ls) l({ matches: true }); });
    expect([h.dataset.family, h.dataset.mode]).toEqual(['crayons', 'dark']);
  });
});
