// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { ThemeRoot } from '../../src/app/theme/ThemeRoot';
import { defaultProfile } from '@core/storage/index';

type Listener = (e: { matches: boolean }) => void;
function fakeMedia(dark: boolean) {
  const listeners = new Set<Listener>();
  const mq = { matches: dark, media: '(prefers-color-scheme: dark)', addEventListener: (_: string, l: Listener) => listeners.add(l), removeEventListener: (_: string, l: Listener) => listeners.delete(l) };
  vi.stubGlobal('matchMedia', () => mq);
  return (next: boolean) => { mq.matches = next; for (const l of listeners) l({ matches: next }); };
}
const html = () => document.documentElement;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); html().removeAttribute('data-family'); html().removeAttribute('data-mode'); });

describe('ThemeRoot', () => {
  test('sets family and mode from the profile', () => {
    fakeMedia(false);
    const p = { ...defaultProfile({ age: 'teens' }), theme: { family: 'adults' as const, mode: 'dark' as const } };
    render(<ThemeRoot profile={p}><p>x</p></ThemeRoot>);
    expect([html().dataset.family, html().dataset.mode]).toEqual(['adults', 'dark']);
  });
  test('system mode follows a matchMedia change', () => {
    const flip = fakeMedia(false);
    render(<ThemeRoot profile={defaultProfile()}><p>x</p></ThemeRoot>);
    expect(html().dataset.mode).toBe('light');
    act(() => flip(true));
    expect(html().dataset.mode).toBe('dark');
  });
  test('no profile gives kids and the system mode', () => {
    fakeMedia(true);
    render(<ThemeRoot profile={null}><p>x</p></ThemeRoot>);
    expect([html().dataset.family, html().dataset.mode]).toEqual(['kids', 'dark']);
  });
});
