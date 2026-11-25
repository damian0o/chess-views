// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
const withPlayer = async () => { const s = makeStore(); await s.getState().addPlayer({ name: 'Ola' }); return s; };
/** The first control in the top bar: the way back up one level, named after where it goes. */
const up = async () => { const bar = (await screen.findAllByRole('banner'))[0]!; return bar.querySelector('button')!; };

describe('◀ goes back one level, named after where it goes', () => {
  test('a room goes back to Start', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/room/patterns' });
    const b = await up();
    expect(b.textContent).toMatch(/◀\s*Start/);
    fireEvent.click(b);
    await waitFor(() => expect(history.at(-1)).toBe('/home'));
  });
  test('a pattern lesson goes back to Wzory, a game lesson to Partie', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/lesson/scholars-mate/s05-board' });
    const b = await up();
    expect(b.textContent).toMatch(/◀\s*Wzory/);
    fireEvent.click(b);
    await waitFor(() => expect(history.at(-1)).toBe('/room/patterns'));
    cleanup();
    mount(<AppRoutes />, { store, path: '/lesson/legal-mate' });
    expect((await up()).textContent).toMatch(/◀\s*Partie/);
  });
  test('the free board opened from a room goes back to that room', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/room/endgames' });
    fireEvent.click(within(await screen.findByRole('article', { name: /Luceny/ })).getByRole('button', { name: 'Otwórz' }));
    await waitFor(() => expect(history.at(-1)).toMatch(/^\/board\?/));
    const b = await up();
    expect(b.textContent).toMatch(/◀\s*Końcówki/);
    fireEvent.click(b);
    await waitFor(() => expect(history.at(-1)).toBe('/room/endgames'));
  });
  test('the free board opened from home goes back to Start', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/home' });
    fireEvent.click(within(await screen.findByRole('article', { name: 'Wolna szachownica' })).getByRole('button'));
    await waitFor(() => expect(history.at(-1)).toBe('/board'));
    expect((await up()).textContent).toMatch(/◀\s*Start/);
  });
  test('home has no way back: it is the top', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/home' });
    await screen.findByRole('article', { name: 'Wzory' });
    expect(screen.queryByRole('button', { name: /◀/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
  });
});
