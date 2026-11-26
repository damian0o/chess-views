// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

// A phone: the layout query matches; listeners are kept so a test can turn the phone into a laptop.
let phone = true;
const listeners = new Set<(e: { matches: boolean }) => void>();
beforeEach(() => {
  phone = true; listeners.clear();
  window.matchMedia = ((q: string) => ({
    get matches() { return q.includes('max-width') ? phone : false; }, media: q,
    addEventListener: (_: string, f: (e: { matches: boolean }) => void) => { if (q.includes('max-width')) listeners.add(f); },
    removeEventListener: (_: string, f: (e: { matches: boolean }) => void) => { listeners.delete(f); },
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); delete (window as { matchMedia?: unknown }).matchMedia; });

const open = async (path: string) => {
  const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
  mount(<AppRoutes />, { store, path });
  await screen.findByRole('button', { name: 'Rozumiem, pokaż planszę' });
  return store;
};
const sheet = () => document.querySelector<HTMLElement>('[data-sheet]')!;
const panel = () => document.querySelector<HTMLElement>('[data-instruction]')!;
const sheetBody = () => document.querySelector<HTMLElement>('[data-sheet-body]')!;
const pull = () => fireEvent.click(screen.getByRole('button', { name: 'Rozumiem, pokaż planszę' }));

describe('a lesson on a phone', () => {
  test('a step opens on its instruction, the board sheet resting below and inert', async () => {
    await open('/lesson/scholars-mate/s02-houses');
    expect(sheet().dataset.sheet).toBe('down');
    expect(panel().textContent).toContain('f7 to najsłabsze pole');
    expect(sheetBody().hasAttribute('inert')).toBe(true);
    expect(panel().hasAttribute('inert')).toBe(false);
  });
  test('Rozumiem pulls the sheet up: the instruction goes inert and focus moves into the sheet', async () => {
    await open('/lesson/scholars-mate/s02-houses');
    pull();
    expect(sheet().dataset.sheet).toBe('up');
    expect(panel().hasAttribute('inert')).toBe(true);
    expect(sheetBody().hasAttribute('inert')).toBe(false);
    expect(sheet().contains(document.activeElement)).toBe(true);
    expect(screen.getByRole('button', { name: 'Pokaż instrukcję' }).textContent).toContain('2/25');
  });
  test('the strip takes the sheet down and focus back to the step text', async () => {
    await open('/lesson/scholars-mate/s02-houses');
    pull();
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż instrukcję' }));
    expect(sheet().dataset.sheet).toBe('down');
    expect(document.activeElement?.hasAttribute('data-step-text')).toBe(true);
  });
  test('Next from the dock opens the next step on its instruction, with focus on its text', async () => {
    const store = await open('/lesson/scholars-mate/s02-houses');
    pull();
    fireEvent.click(screen.getByRole('button', { name: /^Dalej/ }));
    await waitFor(() => expect(store.getState().run?.step.id).toBe('s03-roads'));
    await waitFor(() => expect(sheet().dataset.sheet).toBe('down'));
    expect(document.activeElement?.hasAttribute('data-step-text')).toBe(true);
  });
  test('a question\'s prompt is on the instruction and above the answers; the strip shows the step text', async () => {
    await open('/lesson/scholars-mate/s10-houses');
    expect(panel().textContent).toContain('Która bierka dała mata?');
    pull();
    expect(sheetBody().textContent).toContain('Która bierka dała mata?');
    const strip = screen.getByRole('button', { name: 'Pokaż instrukcję' });
    expect(strip.textContent).not.toContain('Która bierka');
  });
  test('turning the phone into a laptop keeps the run: the desktop screen shows, ply unchanged', async () => {
    const store = await open('/lesson/lasker-thomas/s07-board');
    pull();
    fireEvent.click(screen.getByRole('button', { name: 'Następny ruch' }));
    expect(store.getState().run?.ply).toBe(23);
    phone = false;
    act(() => { listeners.forEach((f) => f({ matches: false })); });
    expect(document.querySelector('[data-sheet]')).toBeNull();
    expect(screen.getByText('Ruch 23 z 35')).toBeTruthy();
    expect(store.getState().run?.ply).toBe(23);
  });
});
