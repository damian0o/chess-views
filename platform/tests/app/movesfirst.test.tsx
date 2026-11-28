// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

// The moves come before the look picker, so the picker never pushes them out of sight.
describe('moves above the look picker', () => {
  test('in a lesson from a game the move list comes before the picker', async () => {
    const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
    mount(<AppRoutes />, { store, path: '/lesson/scholars-mate/s03-roads' });
    const moves = await screen.findByRole('navigation', { name: 'Ruchy' });
    expect(before(moves, document.querySelector('[data-look-picker]')!)).toBe(true);
  });
  test('on the free board the status and the move list come before the picker', async () => {
    const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
    mount(<AppRoutes />, { store, path: `/board?pgn=${encodeURIComponent('1. e4 e5 2. Bc4 Nc6')}` });
    const moves = await screen.findByRole('navigation', { name: 'Ruchy' });
    const picker = document.querySelector('[data-look-picker]')!;
    expect(before(moves, picker)).toBe(true);
    expect(before(screen.getByRole('status', { name: /./ }), picker)).toBe(true);
  });
});
