// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { LookPicker } from '../../src/app/lesson/LookPicker';
import { LegendPopup } from '../../src/app/lesson/LegendPopup';
import { optionStates, PLAIN } from '@core/look';
import { makeStore, mount } from './helpers/harness';
import { showsSquareNames } from '@core/storage/local';

afterEach(cleanup);
const open = async (path: string, unlocked: string[] = []) => {
  const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
  if (unlocked.length) await store.getState().updatePlayer({ unlocked: unlocked as never });
  mount(<AppRoutes />, { store, path });
  await screen.findByRole('button', { name: /^Dalej/ });
  return store;
};
const row = (name: string) => screen.queryByRole('group', { name });
const opt = (id: string) => document.querySelector(`[data-option="${id}"]`) as HTMLButtonElement;
const pressed = (id: string) => opt(id).getAttribute('aria-pressed') === 'true';
const pieces = () => screen.queryAllByRole('img', { name: /biał|czarn/ });

describe('the look picker in a lesson', () => {
  test('rows for the lesson\'s groups; no Widok dropdown, no Pokaż bierki', async () => {
    await open('/lesson/scholars-mate/s03-roads');
    expect(row('Bierki')).toBeTruthy();
    expect(row('Ruchy')).toBeTruthy();
    expect(row('Strategia')).toBeTruthy();
    expect(row('Plansza')).toBeTruthy();
    expect(row('Pomocnik')).toBeNull();
    expect(screen.queryByRole('button', { name: /Widok/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pokaż bierki' })).toBeNull();
    expect(pressed('roads')).toBe(true);
  });
  test('Domki króla joins Drogi; Terytorium replaces Domki', async () => {
    await open('/lesson/scholars-mate/s03-roads', ['kings', 'territory']);
    fireEvent.click(opt('kings'));
    await waitFor(() => expect(pressed('kings')).toBe(true));
    expect(pressed('roads')).toBe(true);
    expect(document.querySelector('[data-layer="roads"]')).toBeTruthy();
    fireEvent.click(opt('territory'));
    await waitFor(() => expect(pressed('territory')).toBe(true));
    expect(pressed('kings')).toBe(false);
  });
  test('an option not unlocked yet is locked', async () => {
    await open('/lesson/scholars-mate/s03-roads');
    expect(opt('kings').disabled || opt('kings').getAttribute('aria-disabled') === 'true').toBe(true);
    expect(opt('kings').textContent).toMatch(/🔒/);
  });
  test('on a recall step every option is disabled', async () => {
    await open('/lesson/scholars-mate/s07-blocks');
    const buttons = document.querySelectorAll('[data-option]');
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) expect((b as HTMLButtonElement).disabled).toBe(true);
  });
  test('Bierki on a blocks step without a question shows the pieces, Klocki hides them', async () => {
    await open('/lesson/scholars-mate/s04-shapes');
    expect(pieces()).toHaveLength(0);
    fireEvent.click(opt('pieces'));
    await waitFor(() => expect(pieces().length).toBeGreaterThan(0));
    fireEvent.click(opt('blocks'));
    await waitFor(() => expect(pieces()).toHaveLength(0));
  });
  test('Nazwy pól toggles the square-names setting', async () => {
    const store = await open('/lesson/scholars-mate/s03-roads');
    const before = showsSquareNames(store.getState().player!);
    expect(pressed('names')).toBe(before);
    fireEvent.click(opt('names'));
    await waitFor(() => expect(showsSquareNames(store.getState().player!)).toBe(!before));
    await waitFor(() => expect(pressed('names')).toBe(!before));
  });
  test('Obróć turns the board', async () => {
    await open('/lesson/scholars-mate/s03-roads');
    const first = () => screen.getAllByRole('gridcell')[0]!.getAttribute('aria-label');
    expect(first()).toMatch(/^a8/);
    fireEvent.click(opt('flip'));
    await waitFor(() => expect(first()).toMatch(/^h1/));
  });
});

describe('the look picker on its own', () => {
  test('the diamond blocks the drawings', () => {
    const states = optionStates({ pieces: 'pieces', diamond: true }, { flip: false, names: false }, ['pieces', 'roads', 'reach', 'diamond'], () => true);
    const onToggle = vi.fn();
    mount(<LookPicker options={states} frozen={false} onToggle={onToggle} />);
    expect(opt('roads').disabled).toBe(true);
    expect(opt('reach').disabled).toBe(true);
    fireEvent.click(opt('diamond'));
    expect(onToggle).toHaveBeenCalledWith('diamond');
  });
  test('the legend lists every active option', () => {
    mount(<LegendPopup on={['roads', 'kings']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Co widzę?' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Linie, po których bierka może iść/)).toBeTruthy();
    expect(within(dialog).getByText(/Obrysowane pola wokół każdego króla/)).toBeTruthy();
    expect(within(dialog).queryByText(/Bierki tak, jak stoją/)).toBeNull();
  });
  test('the legend with nothing on explains the pieces', () => {
    mount(<LegendPopup on={[PLAIN.pieces]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Co widzę?' }));
    expect(within(screen.getByRole('dialog')).getByText(/Bierki tak, jak stoją/)).toBeTruthy();
  });
});
