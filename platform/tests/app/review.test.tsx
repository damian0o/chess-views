// @vitest-environment jsdom
/** Tests for the release-1 review findings (C1, I1-I5, M4); each failed before its fix. */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppRoutes } from '../../src/app/App';
import { ErrorBoundary } from '../../src/app/ui/ErrorBoundary';
import { Board } from '../../src/app/board/Board';
import { ThemeRoot } from '../../src/app/theme/ThemeRoot';
import { PlayerProvider } from '../../src/app/i18n';
import { sceneFor } from '@core/scene';
import { startLesson } from '@core/lessons/run';
import { defaultProfile } from '@core/storage/index';
import { en } from '@core/i18n/messages/en';
import { pl } from '@core/i18n/messages/pl';
import type { Fen, Step } from '@core/types';
import { LESSONS, makeStore, mount } from './helpers/harness';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const withPlayer = async (opts = {}) => { const s = makeStore(); await s.getState().addPlayer({ name: 'Ola', ...opts }); return s; };

describe('C1: opening another step of a running lesson', () => {
  test('a link to another step of the open lesson opens it, without a loop', async () => {
    const store = await withPlayer();
    const { history, navigate } = mount(<AppRoutes />, { store, path: '/lesson/scholars-mate/s03-roads' });
    await waitFor(() => expect(store.getState().run?.step.id).toBe('s03-roads'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => { navigate('/lesson/scholars-mate/s01-board'); });
    await new Promise((r) => setTimeout(r, 50));
    expect(store.getState().run?.step.id).toBe('s01-board');
    expect(history.at(-1)).toBe('/lesson/scholars-mate/s01-board');
    expect(err.mock.calls.some((c) => String(c[0]).includes('Maximum update depth'))).toBe(false);
  });
  test('Od nowa while the lesson is still in memory opens the first step', async () => {
    const store = await withPlayer();
    await store.getState().openLesson('legal-mate', 's02-roads');
    const loc = mount(<AppRoutes />, { store, path: '/lesson/legal-mate/s01-board' });
    await waitFor(() => expect(store.getState().run?.step.id).toBe('s01-board'));
    await new Promise((r) => setTimeout(r, 50));
    expect(store.getState().run?.step.id).toBe('s01-board');
    expect(loc.history.at(-1)).toBe('/lesson/legal-mate/s01-board');
  });
  test('a render error shows a way home instead of a blank page', () => {
    const Boom = () => { throw new Error('boom'); };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PlayerProvider player={null}><ErrorBoundary><Boom /></ErrorBoundary></PlayerProvider>);
    expect(screen.getByRole('link', { name: 'Start' })).toBeTruthy();
  });
});

describe('I1: marks on the board are visible in every theme', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/theme/tokens.css'), 'utf8');
  const L = (h: string) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; };
  const R = (a: string, b: string) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const vars = (block: string) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
  const root = vars(css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root'))));
  test.each([...css.matchAll(/\[data-family="(\w+)"\]\[data-mode="(\w+)"\] \{([^}]+)\}/g)].map((m) => [`${m[1]}/${m[2]}`, m[3]!]))('%s: road lines, outlines and tap marks reach 3:1 on both square colours', (_n, block) => {
    const v = { ...root, ...vars(block) };
    for (const mark of ['board-road-w', 'board-road-b', 'board-good', 'board-bad', 'board-focus', 'board-house']) {
      expect(v[mark], mark).toBeTruthy();
      for (const sq of ['board-light', 'board-dark']) expect(R(v[mark]!, v[sq]!), `${mark} on ${sq}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('I2: the view dropdown only offers what the lesson allows', () => {
  test('a view not allowed yet is disabled, and an allowed one switches the board', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/lesson/eyes-on-f7/s01-board' });
    fireEvent.click(await screen.findByRole('button', { name: /Widok/ }));
    const drogi = (await screen.findAllByRole('option')).find((o) => o.textContent?.includes('Drogi'))!;
    expect(drogi.getAttribute('aria-disabled')).toBe('true');
  });
  test('after Roads was shown, picking Drogi on a Territory step shows roads', async () => {
    const store = await withPlayer();
    await store.getState().openLesson('eyes-on-f7', 's03-roads');
    await store.getState().openLesson('eyes-on-f7', 's05-territory');
    const run = store.getState().run!;
    store.getState().report({ kind: 'layers', on: ['pieces', 'roads'] });
    expect(store.getState().run!.layersOn).toEqual(['pieces', 'roads']);
    void run;
  });
  test('core: withProfile refreshes what a run allows', () => {
    const L = LESSONS.pl.find((l) => l.id === 'eyes-on-f7')!;
    const p = defaultProfile();
    const run = startLesson(L, p, 's05-territory');
    expect(run.allowedLayers).not.toContain('roads');
    const fresh = run.withProfile({ ...p, unlockedLayers: ['pieces', 'roads'] });
    expect(fresh.allowedLayers).toContain('roads');
    expect(fresh.step.id).toBe('s05-territory');
  });
});

describe('I3: a language change mid-lesson', () => {
  test('the open lesson continues at the same step in the new language', async () => {
    const store = await withPlayer();
    await store.getState().openLesson('scholars-mate', 's03-roads');
    const plText = store.getState().run!.step.explain.kids;
    await store.getState().updatePlayer({ locale: 'en' });
    const run = store.getState().run!;
    expect(run.step.id).toBe('s03-roads');
    expect(run.step.explain.kids).not.toBe(plText);
    expect(run.lesson).toBe(LESSONS.en.find((l) => l.id === 'scholars-mate'));
  });
});

describe('I4: legends describe only what is drawn', () => {
  test.each([['pl', pl], ['en', en]] as const)('%s', (_l, cat) => {
    expect(cat.legendBoard).not.toMatch(/Dotknij|Tap/);
    expect(cat.legendRoads).not.toMatch(/Kropkowan|Krzyżyk|dotted|cross|defended|broniona/i);
    expect(cat.legendTerritory).not.toMatch(/Pierścień|ring/i);
    expect(cat.legendKings).not.toMatch(/wejść|step/i);
  });
});

describe('I5: the board by keyboard and in Polish', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;
  const scene = sceneFor({ id: 's', scene: { position: { kind: 'fen', fen: START }, base: 'board', layers: ['pieces'] }, explain: { kids: 'x' } } as Step, { answered: false });
  test('one tab stop, arrow keys move focus, Enter reports the square', () => {
    const on = vi.fn();
    render(<PlayerProvider player={null}><Board scene={scene} onSquare={on} /></PlayerProvider>);
    const cells = screen.getAllByRole('gridcell');
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
    const first = cells.find((c) => c.tabIndex === 0)!;
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect((document.activeElement as HTMLElement).getAttribute('data-square')).toBe('b8');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect((document.activeElement as HTMLElement).getAttribute('data-square')).toBe('b7');
    fireEvent.click(document.activeElement!);
    expect(on).toHaveBeenCalledWith('b7');
  });
  test('without onSquare the cells take no focus', () => {
    render(<PlayerProvider player={null}><Board scene={scene} /></PlayerProvider>);
    expect(screen.getAllByRole('gridcell').every((c) => c.tabIndex === -1)).toBe(true);
  });
  test('names are Polish for a Polish player', () => {
    render(<PlayerProvider player={defaultProfile({ locale: 'pl' })}><Board scene={scene} /></PlayerProvider>);
    expect(screen.getByRole('grid', { name: 'Szachownica' })).toBeTruthy();
    expect(screen.getByRole('gridcell', { name: 'd8, czarny hetman' })).toBeTruthy();
    expect(screen.getAllByRole('img', { name: 'biała wieża' })).toHaveLength(2);
  });
  test('<html lang> follows the player', () => {
    render(<ThemeRoot profile={defaultProfile({ locale: 'en' })}><p>x</p></ThemeRoot>);
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('M4 (re-graded): a double tap on Next moves one step', () => {
  test('two presses in a row advance once', async () => {
    const store = makeStore(undefined, { minStepMs: 300 });
    await store.getState().addPlayer({ name: 'Ola' });
    await store.getState().openLesson('scholars-mate', 's01-board');
    await Promise.all([store.getState().next(), store.getState().next()]);
    expect(store.getState().run?.step.id).toBe('s02-houses');
  });
});
