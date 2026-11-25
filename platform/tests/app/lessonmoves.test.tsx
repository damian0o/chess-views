// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
const open = async (path: string) => {
  const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
  mount(<AppRoutes />, { store, path });
  await screen.findByRole('button', { name: /^Dalej/ });
  return store;
};
const fwd = () => screen.getByRole('button', { name: 'Następny ruch' }) as HTMLButtonElement;
const back = () => screen.getByRole('button', { name: 'Poprzedni ruch' }) as HTMLButtonElement;

describe('move buttons on a lesson step from a game', () => {
  test('Lasker step 7: ▶ plays the checks one by one and ◀ takes them back', async () => {
    const store = await open('/lesson/lasker-thomas/s07-board');
    expect(store.getState().run?.ply).toBe(22);
    expect(screen.getByText('Ruch 22 z 35')).toBeTruthy();
    fireEvent.click(fwd());
    expect(store.getState().run?.ply).toBe(23);
    expect(screen.getByText('Ruch 23 z 35')).toBeTruthy();
    fireEvent.click(fwd());
    expect(store.getState().run?.ply).toBe(24);
    fireEvent.click(back());
    expect(store.getState().run?.ply).toBe(23);
  });
  test('the buttons stop at the start and the end of the game', async () => {
    const store = await open('/lesson/lasker-thomas/s07-board');
    for (let i = 0; i < 40; i++) if (!fwd().disabled) fireEvent.click(fwd());
    expect(store.getState().run?.ply).toBe(35);
    expect(fwd().disabled).toBe(true);
  });
  test('while a find-the-move task is open the buttons are locked, so they cannot show the answer', async () => {
    await open('/lesson/lasker-thomas/s03-board');
    expect(fwd().disabled).toBe(true);
    expect(back().disabled).toBe(true);
  });
  test('while a question is open the buttons are locked too', async () => {
    await open('/lesson/lasker-thomas/s05-blocks');
    expect(fwd().disabled).toBe(true);
  });
  test('a step set up from a FEN has no move buttons', async () => {
    await open('/lesson/scholars-mate/s15-board');
    expect(screen.queryByRole('button', { name: 'Następny ruch' })).toBeNull();
  });
});
