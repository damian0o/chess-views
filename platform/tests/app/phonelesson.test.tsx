// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { NEXT_PAUSE_MS, NEXT_SLIDE_MS, readingPauseMs } from '../../src/app/lesson/sheet';
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
  test('after Next the board stays a moment (inert), then slides down slowly to the new instruction', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const store = await open('/lesson/scholars-mate/s02-houses');
      pull();
      fireEvent.click(screen.getByRole('button', { name: /^Dalej/ }));
      await waitFor(() => expect(store.getState().run?.step.id).toBe('s03-roads'));
      expect(sheet().dataset.sheet).toBe('up');
      expect(sheet().hasAttribute('data-leaving')).toBe(true);
      expect(sheetBody().hasAttribute('inert')).toBe(true);
      act(() => { vi.advanceTimersByTime(NEXT_PAUSE_MS + 10); });
      expect(sheet().dataset.sheet).toBe('down');
      expect(sheet().getAttribute('data-slow')).toBe('true');
      expect(document.activeElement?.hasAttribute('data-step-text')).toBe(true);
      act(() => { vi.advanceTimersByTime(NEXT_SLIDE_MS + 10); });
      expect(sheet().hasAttribute('data-slow')).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  test('the slow slide after Next is 0.8 s in the sheet CSS', async () => {
    const css = (await import('node:fs')).readFileSync('src/app/lesson/sheet.css', 'utf8');
    expect(css).toMatch(/\.cv-sheet\[data-slow\][^}]*transition:\s*transform 0\.8s/);
  });
  test('the new step\'s instruction starts at the top of the page, and focusing its text never scrolls (iOS)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const scrollTo = vi.fn(); const was = window.scrollTo; window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    try {
      const store = await open('/lesson/scholars-mate/s02-houses');
      pull();
      fireEvent.click(screen.getByRole('button', { name: /^Dalej/ }));
      await waitFor(() => expect(store.getState().run?.step.id).toBe('s03-roads'));
      act(() => { vi.advanceTimersByTime(NEXT_PAUSE_MS + 10); });
      expect(scrollTo).toHaveBeenCalledWith(0, 0);
      const textFocus = focus.mock.contexts.findIndex((el) => (el as HTMLElement).hasAttribute('data-step-text'));
      expect(textFocus).toBeGreaterThanOrEqual(0);
      expect(focus.mock.calls[textFocus]?.[0]).toEqual({ preventScroll: true });
    } finally { vi.useRealTimers(); window.scrollTo = was; focus.mockRestore(); }
  });
  test('scrolling the board sheet never spills over to the page under it', async () => {
    const css = (await import('node:fs')).readFileSync('src/app/lesson/sheet.css', 'utf8');
    expect(css).toMatch(/\.cv-sheet[^{]*\{[^}]*overscroll-behavior:\s*contain/);
    await open('/lesson/scholars-mate/s02-houses');
    expect(document.querySelector('[data-sheet-body] .overflow-y-auto')?.classList.contains('overscroll-contain')).toBe(true);
  });
  test('the strip on top of the board looks pullable: a grip and a bobbing down-arrow', async () => {
    await open('/lesson/scholars-mate/s02-houses');
    pull();
    const strip = screen.getByRole('button', { name: 'Pokaż instrukcję' });
    expect(strip.querySelector('[data-grip]')).not.toBeNull();
    expect(strip.querySelector('[data-pull-hint]')?.classList.contains('cv-bob')).toBe(true);
    const css = (await import('node:fs')).readFileSync('src/app/lesson/sheet.css', 'utf8');
    expect(css).toMatch(/@keyframes cv-bob/);
    expect(css).toMatch(/prefers-reduced-motion[^{]*\{[^}]*\.cv-bob/);
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

describe('pulling the board sheet', () => {
  const handle = () => screen.getByRole('button', { name: 'Rozumiem, pokaż planszę' });
  const drag = (el: Element, from: number, to: number) => {
    fireEvent.pointerDown(el, { clientY: from, pointerId: 1 });
    fireEvent.pointerMove(el, { clientY: (from + to) / 2, pointerId: 1 });
    fireEvent.pointerMove(el, { clientY: to, pointerId: 1 });
    fireEvent.pointerUp(el, { clientY: to, pointerId: 1 });
  };
  test('the edge starts to glow only after the reading pause', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await open('/lesson/scholars-mate/s02-houses');
      expect(sheet().hasAttribute('data-glow')).toBe(false);
      const text = 'f7 to najsłabsze pole w domku czarnych: pilnuje go tylko król.';
      act(() => { vi.advanceTimersByTime(readingPauseMs(text) + 10); });
      expect(sheet().getAttribute('data-glow')).toBe('true');
      pull();
      expect(sheet().hasAttribute('data-glow')).toBe(false);
    } finally { vi.useRealTimers(); }
  });
  test('a drag past a third of the way pulls the sheet up and says Rozumiem', async () => {
    await open('/lesson/scholars-mate/s02-houses');
    drag(handle(), 700, 300);
    expect(sheet().dataset.sheet).toBe('up');
    expect(document.querySelector('[data-sheet-flash]')?.textContent).toBe('✓ Rozumiem!');
  });
  test('a short drag springs back', async () => {
    await open('/lesson/scholars-mate/s02-houses');
    drag(handle(), 700, 680);
    expect(sheet().dataset.sheet).toBe('down');
  });
  test('dragging down on the strip takes the sheet back to the instruction', async () => {
    await open('/lesson/scholars-mate/s02-houses');
    pull();
    drag(screen.getByRole('button', { name: 'Pokaż instrukcję' }), 60, 500);
    expect(sheet().dataset.sheet).toBe('down');
  });
  test('a drag on the board never moves the sheet', async () => {
    await open('/lesson/scholars-mate/s02-houses');
    pull();
    drag(document.querySelector('[data-square="e2"]')!, 600, 100);
    drag(document.querySelector('[data-square="e2"]')!, 100, 700);
    expect(sheet().dataset.sheet).toBe('up');
  });
});

describe('the sheet on old phones', () => {
  test('every dvh size has a vh fallback before it, so a phone without dvh still rests the sheet below the text', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(`${process.cwd()}/src/app/lesson/sheet.css`, 'utf8');
    const rule = css.slice(css.indexOf('.cv-sheet {'), css.indexOf('}', css.indexOf('.cv-sheet {')));
    expect(rule).toMatch(/height: 100vh;[\s\S]*height: 100dvh;/);
    expect(rule).toMatch(/translateY\(calc\(100vh[^;]*;[\s\S]*translateY\(calc\(100dvh/);
  });
});
