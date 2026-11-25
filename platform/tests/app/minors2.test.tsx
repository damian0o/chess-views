// @vitest-environment jsdom
/** The release-2 deferred minors; each failed before its fix. */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { parseRoute } from '../../src/app/routes';
import { forwardOldLink } from '../../src/app/forward';
import { makeStore, mount } from './helpers/harness';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const withPlayer = async (opts: Parameters<typeof makeStore>[1] = {}) => { const s = makeStore(undefined, opts); await s.getState().addPlayer({ name: 'Ola' }); return s; };
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
const KINGLESS = '8/8/8/3N4/8/8/8/8 w - - 0 1';

describe('guess panel', () => {
  test('a guess where the engine gives no evaluation says so, not "thinking"', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ fen: KINGLESS, view: 'engine' })}` });
    fireEvent.click(await screen.findByRole('switch', { name: 'Zgadnij ruch' }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^d5\b/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^f6\b/ }));
    expect(screen.queryByText('Silnik myśli…')).toBeNull();
    expect(screen.getByText('Tu silnik nie oceni ruchu')).toBeTruthy();
  });
  test('the picked piece mark goes away when the view changes', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', view: 'engine' })}` });
    fireEvent.click(await screen.findByRole('switch', { name: 'Zgadnij ruch' }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^d8\b/ }));
    expect(document.querySelector('[data-tap="right"]')).not.toBeNull();
    act(() => store.getState().setView('board'));
    await waitFor(() => expect(document.querySelector('[data-tap="right"]')).toBeNull());
  });
});

describe('switches show keyboard focus', () => {
  test('both switch tracks carry a focus-visible ring', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ fen: KINGLESS, view: 'engine' })}` });
    for (const name of ['Zgadnij ruch', 'Litery do druku']) {
      const track = (await screen.findByRole('switch', { name })).closest('label')!.querySelector('span.rounded-full')!;
      expect(track.className).toMatch(/group-data-\[focus-visible\]:outline/);
    }
  });
});

describe('library', () => {
  test('mini boards are hidden from assistive tech and tags are in Polish', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/library' });
    await screen.findByRole('searchbox', { name: 'Szukaj' });
    expect(screen.queryAllByRole('gridcell')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'końcówka' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'endgame' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'końcówka' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });
});

describe('old links', () => {
  test('a hand-written PGN with a raw # opens the board', () => {
    const hash = '#pgn=1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#&ply=2';
    expect(parseRoute(hash, {}).kind).toBe('board');
    let set = '';
    forwardOldLink(hash, {}, { replace: () => {}, setHash: (h) => { set = h; }, setUrl: () => {} });
    expect(set.indexOf('#', 1)).toBe(-1);
  });
  test('sq= sets the knight\'s start square', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ fen: KINGLESS, view: 'knight', sq: 'a1' })}` });
    const a1 = await screen.findByRole('gridcell', { name: /^a1\b/ });
    expect(a1.querySelector('[data-dist]')).toBeNull();   // the start square has no number
    expect(screen.getByRole('gridcell', { name: /^b3\b/ }).querySelector('[data-dist]')?.getAttribute('data-dist')).toBe('1');
  });
});

describe('Load', () => {
  test('a lichess fetch that never answers gives up with the message', async () => {
    const store = await withPlayer({ fetch: (_u: string, init?: RequestInit) => new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('timeout')))), fetchTimeoutMs: 50 } as never);
    expect(await store.getState().loadBoardText('https://lichess.org/AbCd1234')).toBe('loadLichessFailed');
  });
  test('loading keeps the board flipped', async () => {
    const store = await withPlayer();
    store.getState().openBoard(new URLSearchParams('fen=8/8/8/8/8/8/8/K6k w - - 0 1&flip=1'));
    await store.getState().loadBoardText('1. e4 e5');
    expect(store.getState().session?.flip).toBe(true);
  });
  test('copy link says so when the clipboard is blocked', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('blocked')) } });
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ fen: KINGLESS })}` });
    fireEvent.click(await screen.findByRole('button', { name: 'Kopiuj link' }));
    await waitFor(() => expect(store.getState().toast).toBe('Nie udało się skopiować — skopiuj adres z paska'));
  });
});

describe('move strip and slider', () => {
  test('a game starting with Black numbers its first move 1...', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ pgn: '[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n[SetUp "1"]\n\n1... e5 2. Nf3', ply: '0' })}` });
    const nav = await screen.findByRole('navigation', { name: 'Ruchy' });
    expect(nav.textContent?.replace(/\s+/g, '')).toBe('1...e52.Sf3');
  });
  test('the slider says which move it is on', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ pgn: '1. e4 e5 2. Nf3', ply: '2' })}` });
    const slider = await screen.findByRole('slider', { name: 'Przewiń partię' });
    expect(slider.getAttribute('aria-valuetext')).toBe('Ruch 2 z 3');
  });
  test('a very long player name wraps instead of widening the page', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ pgn: `[White "${'A'.repeat(64)}"]\n\n1. e4` })}` });
    const names = (await screen.findByText(new RegExp('A{64}'))).closest('p')!;
    expect(names.className).toMatch(/break-words|break-all/);
  });
});

describe('engine words', () => {
  test('a slow start is told apart from a browser that cannot run it', async () => {
    const { stateForError } = await import('../../src/app/board/useAnalysis');
    expect(stateForError('engine: no "uciok" within 10000 ms')).toBe('slow');
    expect(stateForError('engine: worker failed')).toBe('failed');
    expect(stateForError('engine: the engine stopped responding')).toBe('dead');
  });
});

describe('dev server engine files', () => {
  test('query strings, folders, .. and text files are handled', async () => {
    const { engineFileFor } = await import('../../scripts/engine-files');
    const root = `${process.cwd()}/../engine`;
    expect(engineFileFor('/engine/stockfish-19-lite-single.wasm?v=1', root)?.type).toBe('application/wasm');
    expect(engineFileFor('/engine/COPYING.txt', root)?.type).toBe('text/plain; charset=utf-8');
    expect(engineFileFor('/engine/..', root)).toBeNull();
    expect(engineFileFor('/engine/', root)).toBeNull();
    expect(engineFileFor('/engine/nope.js', root)).toBeNull();
  });
});
