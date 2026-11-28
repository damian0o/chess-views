// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);

// iOS opens the keyboard over the page without shrinking it, so anything pinned to the bottom of a
// fixed overlay hides behind the keyboard. The paste dialog must live in the visible part of the screen.
describe('Load dialog and the phone keyboard', () => {
  test('the overlay is only as tall as the visible viewport and puts the dialog at the top on phones', async () => {
    const store = makeStore();
    await store.getState().addPlayer({ name: 'Ola' });
    mount(<AppRoutes />, { store, path: '/board' });
    fireEvent.click(await screen.findByRole('button', { name: 'Wczytaj' }));
    const dialog = await screen.findByRole('dialog');
    const overlay = dialog.closest<HTMLElement>('[style*="--visual-viewport-height"]')!;
    const cls = overlay.className.split(/\s+/);
    expect(cls).toContain('h-(--visual-viewport-height)');
    expect(cls).not.toContain('inset-0');
    expect(cls).toContain('items-start');
    expect(cls).not.toContain('items-end');
    // If the visible part is very short, the dialog scrolls instead of being cut.
    const modal = dialog.parentElement!;
    expect(modal.className.split(/\s+/)).toEqual(expect.arrayContaining(['max-h-full', 'overflow-y-auto']));
  });
});
