// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const withPlayer = async () => { const s = makeStore(); await s.getState().addPlayer({ name: 'Ola' }); return s; };

describe('positions in a room (the library, now by room)', () => {
  test('Końcówki has its 7 positions; a search for lucena leaves one', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/room/endgames' });
    expect(await screen.findAllByRole('article')).toHaveLength(7);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Szukaj' }), { target: { value: 'lucena' } });
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
  });
  test('a tag chip filters, and again shows all', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/room/endgames' });
    await screen.findAllByRole('article');
    fireEvent.click(screen.getByRole('button', { name: 'studium', pressed: false }));
    const n = screen.getAllByRole('article').length;
    expect(n).toBeGreaterThan(0); expect(n).toBeLessThan(7);
    fireEvent.click(screen.getByRole('button', { name: 'studium', pressed: true }));
    expect(screen.getAllByRole('article')).toHaveLength(7);
  });
  test("Plansza on the Opera lesson opens the free board at the game with its view", async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/room/games' });
    const card = (await screen.findAllByRole('article')).find((a) => /operze/i.test(a.getAttribute('aria-label') ?? ''))!;
    fireEvent.click(within(card).getByRole('button', { name: 'Plansza' }));
    await waitFor(() => expect(store.getState().session?.game.length).toBe(33));
    expect(store.getState().session?.view).toBe('roads');
    expect(history.at(-1)).toMatch(/^\/board/);
  });
});

describe('print sheet', () => {
  test('shows 8 ranks of letters, the FEN and the legend, and prints', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    const store = await withPlayer();
    store.getState().openBoard(new URLSearchParams('fen=r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3'));
    mount(<AppRoutes />, { store, path: '/print' });
    const sheet = await screen.findByTestId('print-sheet');
    expect(within(sheet).getAllByTestId('rank')).toHaveLength(8);
    expect(within(sheet).getByText(/r1bqkbnr\/pppp1ppp/)).toBeTruthy();
    expect(within(sheet).getByText(/Wielkie litery to bierki/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Drukuj' }));
    expect(print).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
