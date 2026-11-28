// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
const opt = (id: string) => document.querySelector(`[data-option="${id}"]`) as HTMLButtonElement;
const pressed = (id: string) => opt(id).getAttribute('aria-pressed') === 'true';
const open = async (query: Record<string, string>) => {
  const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
  const m = mount(<AppRoutes />, { store, path: `/board?${new URLSearchParams(query).toString()}` });
  await screen.findByRole('grid');
  return Object.assign(store, { history: m.history });
};

describe('the free board look', () => {
  test('every option is shown and none is locked', async () => {
    await open({ fen: SCHOLAR });
    const ids = [...document.querySelectorAll('[data-option]')].map((o) => o.getAttribute('data-option'));
    expect(ids).toEqual(['pieces', 'blocks', 'hidden', 'roads', 'reach', 'knight', 'territory', 'kings', 'diamond', 'flip', 'names', 'engine']);
    expect(document.querySelectorAll('[data-option]:disabled')).toHaveLength(0);
    expect(screen.queryByRole('combobox')).toBeNull();
  });
  test('Drogi then Terytorium: both drawn, and the address says so', async () => {
    const store = await open({ fen: SCHOLAR });
    fireEvent.click(opt('roads'));
    fireEvent.click(opt('territory'));
    await waitFor(() => expect(pressed('roads') && pressed('territory')).toBe(true));
    expect(document.querySelector('[data-ring="f7"]')).not.toBeNull();
    expect(document.querySelector('[data-owner]') ?? document.querySelector('[data-tint]')).toBeTruthy();
    expect(store.getState().session!.look).toEqual({ pieces: 'pieces', moves: 'roads', strategy: 'territory' });
    await waitFor(() => expect(store.history.at(-1)).toMatch(/moves=roads/), { timeout: 3000 });
    expect(store.history.at(-1)).toMatch(/strategy=territory/);
  });
  test('Obróć turns the board', async () => {
    const store = await open({ fen: SCHOLAR });
    fireEvent.click(opt('flip'));
    await waitFor(() => expect(store.getState().session!.flip).toBe(true));
    expect(screen.getAllByRole('gridcell')[0]!.getAttribute('aria-label')).toMatch(/^h1/);
  });
  test('with Skoczek and Silnik both on, a tap moves the knight\'s start', async () => {
    await open({ fen: SCHOLAR, moves: 'knight', engine: '1' });
    fireEvent.click(screen.getByRole('gridcell', { name: /^a1\b/ }));
    // From a1 the knight reaches b3 and c2 in one jump.
    await waitFor(() => expect(document.querySelector('[data-square="b3"] [data-dist]')?.getAttribute('data-dist')).toBe('1'));
    expect(document.querySelector('[data-square="c2"] [data-dist]')?.getAttribute('data-dist')).toBe('1');
  });
});
