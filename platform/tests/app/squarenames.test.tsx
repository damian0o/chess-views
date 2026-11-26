// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Board } from '../../src/app/board/Board';
import { AppRoutes } from '../../src/app/App';
import { Settings } from '../../src/app/screens/Settings';
import { sceneFor } from '@core/scene';
import { defaultProfile, showsSquareNames } from '@core/storage/index';
import { migrateProfile } from '@core/storage/index';
import type { Fen, Step } from '@core/types';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;
const scene = sceneFor({ id: 's', scene: { position: { kind: 'fen', fen: START }, base: 'board', layers: ['pieces'] }, explain: { kids: 'x' } } as Step, { answered: false });
const names = () => [...document.querySelectorAll<HTMLElement>('[data-square-name]')];
const nameOn = (sq: string) => document.querySelector<HTMLElement>(`[data-square="${sq}"] [data-square-name]`);

describe('square names on the board', () => {
  test('with squareNames every square shows its own name, hidden from screen readers', () => {
    render(<Board scene={scene} squareNames />);
    expect(names()).toHaveLength(64);
    expect(nameOn('e4')?.textContent).toBe('e4');
    expect(nameOn('a8')?.textContent).toBe('a8');
    expect(nameOn('e4')?.getAttribute('aria-hidden')).toBe('true');
    // The accessible name of the square stays as it was.
    expect(screen.getByRole('gridcell', { name: /^e2, / })).toBeTruthy();
  });
  test('names follow the square when the board is flipped', () => {
    render(<Board scene={scene} squareNames flip />);
    expect(nameOn('h1')?.textContent).toBe('h1');
    expect(document.querySelector('[data-square]')?.getAttribute('data-square')).toBe('h1');
  });
  test('with names on, the board corners are only slightly rounded so a8 is not cut off', () => {
    render(<Board scene={scene} squareNames />);
    const frame = document.querySelector<HTMLElement>('[data-square-names]')!;
    expect(frame.className).toContain('rounded-lg');
    expect(frame.className).not.toContain('rounded-card');
  });
  test('the diamond view shows no names', () => {
    const diamond = sceneFor({ id: 's', scene: { position: { kind: 'fen', fen: START }, base: 'board', layers: ['pieces', 'diamond'] }, explain: { kids: 'x' } } as Step, { answered: false });
    render(<Board scene={diamond} squareNames />);
    expect(document.querySelectorAll('[data-square]').length).toBe(64);
    expect(names()).toHaveLength(0);
  });
  test('without the prop the board shows no names', () => {
    render(<Board scene={scene} />);
    expect(names()).toHaveLength(0);
  });
});

describe('the square names preference', () => {
  test('defaults to on for 8–12 and off for older players', () => {
    expect(showsSquareNames(defaultProfile({ age: 'kids' }))).toBe(true);
    expect(showsSquareNames(defaultProfile({ age: 'teens' }))).toBe(false);
    expect(showsSquareNames(defaultProfile({ age: 'adults' }))).toBe(false);
  });
  test('a choice the player made wins over the age default', () => {
    expect(showsSquareNames({ ...defaultProfile({ age: 'kids' }), squareNames: false })).toBe(false);
    expect(showsSquareNames({ ...defaultProfile({ age: 'adults' }), squareNames: true })).toBe(true);
  });
  test('a profile saved before this setting still loads', () => {
    const old = defaultProfile({ age: 'kids' });
    expect(migrateProfile(JSON.parse(JSON.stringify(old)))).not.toBeNull();
    expect(migrateProfile({ ...old, squareNames: true })?.squareNames).toBe(true);
  });
  test('the Settings switch turns names off and on for the player', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    mount(<Settings />, { store });
    const sw = screen.getByRole('switch', { name: 'Nazwy pól na planszy' }) as HTMLInputElement;
    expect(sw.checked).toBe(true);
    fireEvent.click(sw);
    await waitFor(() => expect(store.getState().player?.squareNames).toBe(false));
    fireEvent.click(sw);
    await waitFor(() => expect(store.getState().player?.squareNames).toBe(true));
  });
  test('the free board and a lesson show names for an 8–12 player', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    mount(<AppRoutes />, { store, path: '/board' });
    await waitFor(() => expect(names()).toHaveLength(64));
    cleanup();
    mount(<AppRoutes />, { store, path: '/lesson/eyes-on-f7/s03-roads' });
    await waitFor(() => expect(names().length).toBeGreaterThan(0));
  });
  test('the free board shows no names for a 12–16 player', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Kuba', age: 'teens' });
    mount(<AppRoutes />, { store, path: '/board' });
    await waitFor(() => expect(document.querySelectorAll('[data-square]').length).toBe(64));
    expect(names()).toHaveLength(0);
  });
});

describe('edge numbers when square names are off', () => {
  const coords = () => [...document.querySelectorAll<HTMLElement>('[data-coord]')];
  const coordOn = (sq: string) => [...document.querySelectorAll<HTMLElement>(`[data-square="${sq}"] [data-coord]`)].map((e) => e.textContent);
  test('ranks 1–8 down the left edge and files a–h along the bottom, hidden from screen readers', () => {
    render(<Board scene={scene} />);
    expect(coords()).toHaveLength(16);
    expect(coordOn('a8')).toEqual(['8']);
    expect(coordOn('a1')).toEqual(['1', 'a']);
    expect(coordOn('h1')).toEqual(['h']);
    expect(coordOn('e4')).toEqual([]);
    expect(coords().every((e) => e.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
  test('a flipped board numbers its own edges: h on the left, 8 at the bottom', () => {
    render(<Board scene={scene} flip />);
    expect(coordOn('h1')).toEqual(['1']);
    expect(coordOn('h8')).toEqual(['8', 'h']);
    expect(coordOn('a8')).toEqual(['a']);
  });
  test('with square names on there are no edge numbers', () => {
    render(<Board scene={scene} squareNames />);
    expect(coords()).toHaveLength(0);
  });
});
