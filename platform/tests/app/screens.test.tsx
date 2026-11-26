// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Players } from '../../src/app/screens/Players';
import { Home } from '../../src/app/screens/Home';
import { Settings } from '../../src/app/screens/Settings';
import { AppRoutes } from '../../src/app/App';
import { LESSONS, makeStore, memory, mount } from './helpers/harness';

afterEach(cleanup);

describe('Players', () => {
  test('lists stored players and adds one', async () => {
    const storage = memory();
    const pre = makeStore(storage); await pre.getState().addPlayer({ name: 'Kuba', age: 'teens' });
    const store = makeStore(storage);
    mount(<Players />, { store });
    expect(await screen.findByRole('button', { name: /Kuba/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj gracza' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Imię' }), { target: { value: 'Ola' } });
    fireEvent.click(screen.getByRole('radio', { name: '8–12' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    await waitFor(() => expect(store.getState().player?.name).toBe('Ola'));
    expect(store.getState().player?.age).toBe('kids');
  });
  test('picking a player goes home', async () => {
    const storage = memory();
    const pre = makeStore(storage); await pre.getState().addPlayer({ name: 'Kuba' });
    const { history } = mount(<Players />, { store: makeStore(storage) });
    fireEvent.click(await screen.findByRole('button', { name: /Kuba/ }));
    await waitFor(() => expect(history.at(-1)).toBe('/home'));
  });
});

describe('Home', () => {
  test('rooms show lessons with their progress', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    const last = LESSONS.pl.find((l) => l.id === 'legal-mate')!.steps.at(-1)!.id;
    await store.getState().openLesson('legal-mate', last); await store.getState().next();
    await store.getState().openLesson('scholars-mate', 's07-blocks'); store.getState().leave();
    mount(<AppRoutes />, { store, path: '/room/games' });
    const legal = await screen.findByRole('article', { name: /Mat Legala/ });
    expect(within(legal).getByText(/Ukończone/)).toBeTruthy();
    cleanup();
    mount(<AppRoutes />, { store, path: '/room/patterns' });
    const scholar = await screen.findByRole('article', { name: /Mat szkolny/ });
    expect(within(scholar).getByText('Krok 7 z 25')).toBeTruthy();
  });
  test('Recognise card is locked until two game lessons are finished', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    mount(<Home />, { store });
    const card = screen.getByRole('article', { name: /Rozpoznaj/ });
    expect(within(card).getByText(/Ukończ dwie lekcje z partiami/)).toBeTruthy();
    expect((within(card).getByRole('button', { name: 'Zacznij' }) as HTMLButtonElement).disabled).toBe(true);
  });
  test('opening a lesson navigates to it', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    const { history } = mount(<AppRoutes />, { store, path: '/room/patterns' });
    fireEvent.click(within(await screen.findByRole('article', { name: /Mat szkolny/ })).getByRole('button', { name: 'Zacznij' }));
    expect(history.at(-1)).toBe('/lesson/scholars-mate');
  });
});

describe('Settings', () => {
  test('changing the age band saves it and the look follows', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    mount(<Settings />, { store });
    fireEvent.click(screen.getByRole('radio', { name: '12–16' }));
    await waitFor(() => expect(store.getState().player?.age).toBe('teens'));
    expect(store.getState().player?.theme.family).toBe('teens');
  });
  test('the look list starts with Kredki, and choosing 8–12 picks Kredki', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola', age: 'teens' });
    mount(<Settings />, { store });
    const looks = within(screen.getByRole('radiogroup', { name: 'Wygląd' })).getAllByRole('radio').map((r) => r.closest('label')?.textContent?.trim());
    expect(looks).toEqual(['Kredki', 'Kolorowy', 'Spokojny', 'Prosty']);
    fireEvent.click(screen.getByRole('radio', { name: '8–12' }));
    await waitFor(() => expect(store.getState().player?.theme.family).toBe('crayons'));
  });
  test('remove asks for confirmation', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    mount(<Settings />, { store });
    fireEvent.click(screen.getByRole('button', { name: 'Usuń gracza' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Usunąć gracza Ola/)).toBeTruthy();
    expect(store.getState().player).not.toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń gracza' }));
    await waitFor(() => expect(store.getState().player).toBeNull());
  });
  test('importing a bad file shows the error message', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    mount(<Settings />, { store });
    const input = screen.getByLabelText('Wczytaj z pliku') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { files: [new File(['garbage'], 'x.json')] } }); });
    await waitFor(() => expect(store.getState().toast).toBe('To nie jest plik profilu Chess Views'));
  });
});
