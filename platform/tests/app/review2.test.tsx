// @vitest-environment jsdom
/** Tests for the release-2 review findings (C1, C2, I1-I6); each failed before its fix. */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppRoutes } from '../../src/app/App';
import { useHashRoute, hashSearch } from '../../src/app/hashRoute';
import { loadGame } from '@core/chess/rules';
import { openSession, sessionParams, sessionScene } from '@core/session';
import { tapGuess } from '@core/guess';
import type { Fen, Square } from '@core/types';
import { makeStore, mount } from './helpers/harness';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const withPlayer = async () => { const s = makeStore(); await s.getState().addPlayer({ name: 'Ola' }); return s; };

describe('C1: the board position lives in the hash, one owner each way', () => {
  test('hashRoute splits #/board?fen=… into path and search', () => {
    window.location.hash = '#/board?fen=x&view=roads';
    function Probe() { const [path] = useHashRoute(); return <p>{path}|{hashSearch()}</p>; }
    render(<Probe />);
    expect(screen.getByText('/board|fen=x&view=roads')).toBeTruthy();
  });
  test('opening a second library entry while a board is open shows it, without a loop', async () => {
    const store = await withPlayer();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { navigate } = mount(<AppRoutes />, { store, path: '/board?pos=lucena' });
    await waitFor(() => expect(store.getState().session?.game.fen()).toContain('1K1k4'));
    await act(async () => { navigate('/board?pos=back-rank'); });
    await new Promise((r) => setTimeout(r, 500));
    expect(store.getState().session?.game.fen()).not.toContain('1K1k4');
    expect(err.mock.calls.some((c) => String(c[0]).includes('Maximum update depth'))).toBe(false);
  });
  test('going back to an earlier board address shows that board again', async () => {
    const store = await withPlayer();
    const { navigate } = mount(<AppRoutes />, { store, path: '/board?pos=lucena' });
    await waitFor(() => expect(store.getState().session?.game.fen()).toContain('1K1k4'));
    await act(async () => { navigate('/board?pos=back-rank'); });
    await waitFor(() => expect(store.getState().session?.game.fen()).not.toContain('1K1k4'));
    await act(async () => { navigate('/board?pos=lucena'); });
    await waitFor(() => expect(store.getState().session?.game.fen()).toContain('1K1k4'));
  });
});

describe('C2: an illegal but well-formed FEN never crashes', () => {
  test.each(['P3k3/8/8/8/8/8/8/4K3 w - - 0 1', '4k3/8/8/8/8/8/8/p3K3 b - - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1', '4k3/8/8/8/8/8/8/4K3 w ZZ z9 x y'])('%s is a bad FEN', (fen) => {
    expect(openSession(fen)).toMatchObject({ error: 'loadBadFen' });
  });
  test('status and legal moves never throw on a lenient position', () => {
    const g = loadGame({ kind: 'fen', fen: '8/8/8/3N4/8/8/8/8 w - - 0 1' as Fen });
    expect(() => g.status()).not.toThrow();
    expect(() => tapGuess({}, 'd5' as Square, '8/8/8/3N4/8/8/8/8 w - - 0 1' as Fen)).not.toThrow();
  });
  test('the free board shows a message for such a link, not an error screen', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${new URLSearchParams({ fen: 'P3k3/8/8/8/8/8/8/4K3 w - - 0 1' })}` });
    await screen.findByRole('grid');
    expect(store.getState().toast).toBe('Ten FEN nie jest poprawną pozycją.');
    expect(screen.queryByText(/Coś poszło nie tak/)).toBeNull();
  });
});

describe('I1: arrow keys step the game only from the page itself', () => {
  test('not from the board, a listbox or a dialog, and not with a modifier', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/board?pgn=1.+e4+e5+2.+Nf3+Nc6&ply=2&view=knight' });
    const cell = await screen.findByRole('gridcell', { name: /^a8\b/ });
    fireEvent.keyDown(cell, { key: 'ArrowRight' });
    expect(store.getState().session?.ply).toBe(2);
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    expect(store.getState().session?.ply).toBe(2);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(store.getState().session?.ply).toBe(1);
  });
});

describe('I2: the print sheet goes back to the board', () => {
  test('Wstecz opens the board, not a missing page', async () => {
    const store = await withPlayer();
    store.getState().openBoard(new URLSearchParams('pos=lucena'));
    const { history } = mount(<AppRoutes />, { store, path: '/print' });
    fireEvent.click(await screen.findByRole('button', { name: /Wstecz/ }));
    await waitFor(() => expect(history.at(-1)).toMatch(/^\/board/));
  });
});

describe('I3: problems hide their solution', () => {
  test('a problem from the library opens with the moves hidden until stepped', async () => {
    const store = await withPlayer();
    store.getState().openBoard(new URLSearchParams('pos=mate-in-three'));
    const s = store.getState().session!;
    expect(s.solve).toBe(true);
    expect(sessionParams(s).get('solve')).toBe('1');
    expect(sessionScene(s, ['pieces']).hideMoves).toBe(true);
    mount(<AppRoutes />, { store, path: `/board?${sessionParams(s)}` });
    await screen.findByRole('grid');
    expect(screen.queryByRole('button', { name: /Wd3#/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: '?' }).length).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: 'Następny ruch' }));
    expect(screen.getAllByRole('button', { name: '?' }).length).toBe(4);
  });
});

describe('I4: printing other screens', () => {
  test('the print-only rule applies only when the print sheet is on the page', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/styles.css'), 'utf8');
    expect(css).toMatch(/body:has\(#print-sheet\) \*/);
    expect(css).not.toMatch(/^\s*body \* \{ visibility: hidden; \}/m);
  });
});

describe('I5: the current move stays in view', () => {
  test('stepping scrolls the move list itself to the current move, never the page around it', async () => {
    const intoView = vi.fn();
    Element.prototype.scrollIntoView = intoView;
    // jsdom has no layout: the current move sits 200–230 px down a list 100 px tall.
    const writes: number[] = [];
    const sizes: [string, number][] = [['offsetTop', 200], ['offsetHeight', 30], ['clientHeight', 100]];
    const restore = sizes.map(([k, v]) => {
      const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, k) ?? Object.getOwnPropertyDescriptor(Element.prototype, k);
      Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get: () => v });
      return [k, d] as const;
    });
    const st = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', { configurable: true, get: () => 0, set: (v: number) => { writes.push(v); } });
    try {
      const store = await withPlayer();
      mount(<AppRoutes />, { store, path: '/board?pgn=1.+e4+e5+2.+Nf3+Nc6&ply=0' });
      fireEvent.click(await screen.findByRole('button', { name: 'Następny ruch' }));
      await waitFor(() => expect(writes).toContain(130));
      expect(intoView).not.toHaveBeenCalled();
    } finally {
      for (const [k, d] of restore) { if (d) Object.defineProperty(HTMLElement.prototype, k, d); else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[k]; }
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTop;
      if (st) Object.defineProperty(Element.prototype, 'scrollTop', st);
    }
  });
});

describe('I6: the address is written at most once per pause', () => {
  test('eight quick steps write the address once', async () => {
    const { memoryLocation } = await import('wouter/memory-location');
    const { Router } = await import('wouter');
    const { AppStoreProvider } = await import('../../src/app/appStore');
    const { EngineProvider } = await import('../../src/app/engine');
    const loc = memoryLocation({ path: '/board', searchPath: 'pgn=1.+e4+e5+2.+Nf3+Nc6+3.+Bb5+a6+4.+Ba4+Nf6&ply=0' });
    let writes = 0;
    const counting = () => { const [path, nav] = loc.hook(); return [path, (to: string, o?: object) => { writes++; nav(to, o as never); }] as const; };
    const store = await withPlayer();
    const quiet = () => ({ onmessage: null, onerror: null, postMessage() {}, terminate() {} });
    render(<AppStoreProvider store={store}><EngineProvider workerFactory={quiet}><Router hook={counting as never} searchHook={loc.searchHook}><AppRoutes /></Router></EngineProvider></AppStoreProvider>);
    await screen.findByRole('grid');
    await new Promise((r) => setTimeout(r, 400));
    writes = 0;
    for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole('button', { name: 'Następny ruch' }));
    await new Promise((r) => setTimeout(r, 700));
    expect(writes).toBe(1);
  });
});
