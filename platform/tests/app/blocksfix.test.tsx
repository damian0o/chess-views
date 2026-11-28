// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
const open = async (path: string) => {
  const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
  const m = mount(<AppRoutes />, { store, path });
  await screen.findByRole('button', { name: /^Dalej/ });
  return m;
};
const pieces = () => screen.queryAllByRole('img', { name: /biał|czarn/ });
const cell = (sq: string) => screen.getByRole('gridcell', { name: new RegExp(`^${sq}\\b`) });
const next = () => screen.getByRole('button', { name: /^Dalej/ }) as HTMLButtonElement;

describe('block boards', () => {
  test('a blocks step without a question switches between Bierki and Klocki', async () => {
    await open('/lesson/scholars-mate/s04-shapes');
    const opt = (id: string) => document.querySelector(`[data-option="${id}"]`) as HTMLButtonElement;
    expect(pieces()).toHaveLength(0);
    fireEvent.click(opt('pieces'));
    await waitFor(() => expect(pieces().length).toBeGreaterThan(0));
    fireEvent.click(opt('blocks'));
    await waitFor(() => expect(pieces()).toHaveLength(0));
  });
  test('step 22: the child taps the square the shape strikes; the pieces come back after the right tap', async () => {
    await open('/lesson/scholars-mate/s22-shapes');
    expect((document.querySelector('[data-option="pieces"]') as HTMLButtonElement).disabled).toBe(true);     // no peeking while the question is open
    expect(next().disabled).toBe(true);
    fireEvent.click(cell('f7'));
    expect(await screen.findByText('Spróbuj jeszcze raz')).toBeTruthy();
    fireEvent.click(cell('f2'));
    await waitFor(() => expect(next().disabled).toBe(false));
    expect(pieces().length).toBeGreaterThan(0);
  });
  test('step 20 strikes f7', async () => {
    await open('/lesson/scholars-mate/s20-shapes');
    expect(next().disabled).toBe(true);
    fireEvent.click(cell('f7'));
    await waitFor(() => expect(next().disabled).toBe(false));
  });
  test('step 24 has no mate shape: the child answers No', async () => {
    await open('/lesson/scholars-mate/s24-shapes');
    fireEvent.click(screen.getByRole('button', { name: 'Tak' }));
    expect(next().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Nie' }));
    await waitFor(() => expect(next().disabled).toBe(false));
  });
});

describe('settings from a lesson', () => {
  test('Wstecz in settings goes back to the same lesson step', async () => {
    const { history } = await open('/lesson/scholars-mate/s22-shapes');
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }));
    fireEvent.click(await screen.findByRole('button', { name: /Wstecz/ }));
    await waitFor(() => expect(history.at(-1)).toBe('/lesson/scholars-mate/s22-shapes'));
    expect(await screen.findByText('Mat szkolny')).toBeTruthy();
  });
  test('opened directly, Wstecz goes home', async () => {
    const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
    const { history } = mount(<AppRoutes />, { store, path: '/settings' });
    fireEvent.click(await screen.findByRole('button', { name: /Wstecz/ }));
    await waitFor(() => expect(history.at(-1)).toBe('/home'));
  });
});
