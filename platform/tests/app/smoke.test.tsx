// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from '../../src/app/App';
import type { StorageLike } from '@core/storage/index';

afterEach(cleanup);
const empty = (): StorageLike => { const d: Record<string, string> = {}; return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; }, removeItem: (k) => { delete d[k]; } }; };

test('App renders the players screen title', () => {
  render(<App storage={empty()} />);
  expect(screen.getByRole('heading', { name: 'Kto gra?' })).toBeTruthy();
});
