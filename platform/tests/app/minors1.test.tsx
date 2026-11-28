// @vitest-environment jsdom
/** The release-1 deferred minors; each failed before its fix. */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppRoutes } from '../../src/app/App';
import { Board } from '../../src/app/board/Board';
import { AVATAR_COLORS } from '../../src/app/ui/Avatar';
import { createAppStore } from '../../src/app/store';
import { pocFiles } from '../../scripts/assemble-site';
import { openSession, sessionScene } from '@core/session';
import type { Session } from '@core/session';
import stepIds from '../../content/poc-step-ids.json';
import { LESSONS, LIBRARY, memory, makeStore, mount } from './helpers/harness';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const hex = (h: string) => { const n = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255); };
const lum = (c: number[]) => { const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
const mix = (a: string, b: string, p: number) => '#' + hex(a).map((v, i) => Math.round((v * p + hex(b)[i]! * (1 - p)) * 255).toString(16).padStart(2, '0')).join('');
const css = readFileSync(join(process.cwd(), 'src/app/theme/tokens.css'), 'utf8');
const sets = [...css.matchAll(/\[data-family="(\w+)"\]\[data-mode="(\w+)"\] \{([^}]*)\}/g)].map(([, f, m, body]) => ({ name: `${f}/${m}`, v: Object.fromEntries([...body!.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, k, c]) => [k!, c!])) as Record<string, string> }));
const root = Object.fromEntries([...css.matchAll(/--(board-road-[wb]):\s*(#[0-9a-f]{6})/gi)].map(([, k, c]) => [k!, c!]));

describe('colours', () => {
  test('the eight theme sets were found', () => expect(sets).toHaveLength(8));
  test.each(Object.entries(AVATAR_COLORS ?? { missing: { bg: '#ffffff', ink: '#ffffff' } }))('the %s avatar initial is readable (≥ 3:1, large bold text)', (_name, { bg, ink }) => {
    expect(contrast(bg, ink)).toBeGreaterThanOrEqual(3);
  });
  test('the focus ring stands out (≥ 3:1) on surfaces and cards in every theme', () => {
    for (const s of sets) {
      expect([s.name, contrast(s.v.focus!, s.v.surface!) >= 3]).toEqual([s.name, true]);
      expect([s.name, contrast(s.v.focus!, s.v.card!) >= 3]).toEqual([s.name, true]);
    }
  });
  test('White and Black territory differ in lightness, not only hue (≥ 1.4:1 on both square colours)', () => {
    const terr = readFileSync(join(process.cwd(), 'src/app/board/layers/Territory.tsx'), 'utf8');
    const pct = (who: string) => Number(new RegExp(`${who}: 'after:bg-\\[color-mix\\(in_srgb,var\\(--board-road-${who}\\)_(\\d+)%`).exec(terr)![1]) / 100;
    for (const s of sets) for (const sq of [s.v['board-light']!, s.v['board-dark']!]) {
      const w = mix(root['board-road-w']!, sq, pct('w')), b = mix(root['board-road-b']!, sq, pct('b'));
      expect([s.name, sq, contrast(w, b) >= 1.4]).toEqual([s.name, sq, true]);
    }
  });
});

describe('lesson tap mark', () => {
  test('the right mark goes on the square tapped, when several are right', async () => {
    const lessons = structuredClone(LESSONS);
    const scholar = lessons.pl.find((l) => l.id === 'scholars-mate')!;
    const step = scholar.steps.find((s) => s.question?.kind === 'tap')!;
    if (step.question?.kind !== 'tap') throw new Error('tap expected');
    step.question.squares = ['h7', 'f7'] as never;
    const store = createAppStore({ storage: memory(), lessons, library: LIBRARY, pocStepIds: stepIds as Record<string, string[]>, minStepMs: 0 });
    await store.getState().addPlayer({ name: 'Ola' });
    mount(<AppRoutes />, { store, path: `/lesson/scholars-mate/${step.id}` });
    fireEvent.click(await screen.findByRole('gridcell', { name: /^f7\b/ }));
    await waitFor(() => expect(document.querySelector('[data-tap="right"]')?.getAttribute('aria-label')).toMatch(/^f7\b/));
  });
  test('a choice group without a prompt is labelled as answers, not as the view', async () => {
    const src = readFileSync(join(process.cwd(), 'src/app/lesson/Question.tsx'), 'utf8');
    expect(src).not.toMatch(/q\.kind === 'recall' \? q\.prompt : q\.prompt/);
    expect(src).not.toMatch(/: t\('view'\)/);
  });
});

describe('board keys', () => {
  test('Space then the button\'s own click report the square once', () => {
    const s = openSession('8/8/8/8/8/8/8/K6k w - - 0 1') as Session;
    const onSquare = vi.fn();
    render(<Board scene={sessionScene(s, { pieces: 'pieces' })} onSquare={onSquare} />);
    const a1 = screen.getByRole('gridcell', { name: /^a1\b/ });
    fireEvent.keyDown(a1, { key: ' ' });
    fireEvent.keyUp(a1, { key: ' ' });
    fireEvent.click(a1);
    expect(onSquare).toHaveBeenCalledTimes(1);
  });
});

describe('theme before first paint', () => {
  test('index.html sets the theme before the app loads, from the device setting', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    const inline = /<script>([\s\S]*?)<\/script>[\s\S]*src\/app\/main\.tsx/.exec(html);
    expect(inline).not.toBeNull();
    expect(inline![1]).toMatch(/dataset\.family/);
    expect(inline![1]).toMatch(/prefers-color-scheme: dark/);
  });
});

describe('settings import control', () => {
  test('the import label shows a focus ring when its hidden input has keyboard focus', async () => {
    const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
    mount(<AppRoutes />, { store, path: '/settings' });
    const input = await screen.findByLabelText('Wczytaj z pliku');
    expect(input.closest('label')!.className).toMatch(/has-\[:focus-visible\]:outline/);
  });
});

describe('publishing', () => {
  test('the POC file list comes from what index.html loads, plus the engine folder', () => {
    const repo = join(process.cwd(), '..');
    expect(new Set(pocFiles(repo))).toEqual(new Set([
      'index.html', 'analysis.js', 'coach.js', 'engine.js', 'lessons.js', 'pieces.css', 'positions.json',
      'engine/stockfish-19-lite-single.js', 'engine/stockfish-19-lite-single.wasm', 'engine/COPYING.txt', 'engine/README.md',
    ]));
  });
  test('the Pages workflow runs the POC tests', () => {
    const wf = readFileSync(join(process.cwd(), '../.github/workflows/pages.yml'), 'utf8');
    expect(wf).toMatch(/- run: npm test\s+working-directory: \./);
  });
});
