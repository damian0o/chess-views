// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

// Count the board's renders: a drag must move the sheet without rendering the board again on every finger move.
const renders = vi.hoisted(() => ({ board: 0 }));
vi.mock('../../src/app/board/Board', async (orig) => {
  const m = await orig<typeof import('../../src/app/board/Board')>();
  return { ...m, Board: (props: Parameters<typeof m.Board>[0]) => { renders.board++; return m.Board(props); } };
});

beforeEach(() => {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('max-width'), media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); delete (window as { matchMedia?: unknown }).matchMedia; });

const open = async () => {
  const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
  mount(<AppRoutes />, { store, path: '/lesson/scholars-mate/s02-houses' });
  return screen.findByRole('button', { name: 'Rozumiem, pokaż planszę' });
};
const sheet = () => document.querySelector<HTMLElement>('[data-sheet]')!;

describe('the board sheet moves smoothly', () => {
  test('dragging moves the sheet under the finger without rendering the board on every move', async () => {
    const handle = await open();
    fireEvent.pointerDown(handle, { clientY: 700, pointerId: 1 });
    const before = renders.board;
    for (let y = 690; y >= 500; y -= 10) fireEvent.pointerMove(handle, { clientY: y, pointerId: 1 });
    expect(sheet().style.transform).toContain('-200px');
    expect(sheet().style.transition).toBe('none');
    expect(renders.board - before, 'board renders during a 20-step drag').toBeLessThanOrEqual(1);
    fireEvent.pointerUp(handle, { clientY: 500, pointerId: 1 });
    expect(sheet().dataset.sheet).toBe('up');
    expect(sheet().style.transform).toBe('');
  });
  test('the sheet slides on its own layer, and the waiting nudge moves only the handle, never the whole sheet', () => {
    const css = readFileSync('src/app/lesson/sheet.css', 'utf8');
    expect(css).toMatch(/\.cv-sheet\s*\{[^}]*will-change:\s*transform/);
    expect(css).not.toMatch(/\.cv-sheet\[data-glow\]\s*\{[^}]*animation/);
    expect(css).toMatch(/\.cv-sheet\[data-glow\] \.cv-peek\s*\{[^}]*animation:\s*cv-nudge/);
  });
});
