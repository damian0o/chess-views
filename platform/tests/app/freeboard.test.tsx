// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const OPERA = '[White "Morphy"]\n[Black "Duke of Brunswick and Count Isouard"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
const withPlayer = async (opts: Parameters<typeof makeStore>[1] = {}) => { const s = makeStore(undefined, opts); await s.getState().addPlayer({ name: 'Ola' }); return s; };
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

describe('free board', () => {
  test('opens a FEN from the address with view and flip', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ fen: SCHOLAR, view: 'roads', flip: '1' })}` });
    await screen.findByRole('grid');
    expect(screen.getAllByRole('gridcell')[0]!.getAttribute('aria-label')).toMatch(/^h1/);
    await waitFor(() => expect(document.querySelector('[data-option="roads"]')?.getAttribute('aria-pressed')).toBe('true'));
    expect(document.querySelector('[data-ring="f7"]')).not.toBeNull();
  });
  test('step controls and arrow keys move the ply; the strip highlights the move', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ pgn: OPERA, ply: '0' })}` });
    fireEvent.click(await screen.findByRole('button', { name: 'Następny ruch' }));
    expect(store.getState().session?.ply).toBe(1);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(store.getState().session?.ply).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Koniec' }));
    expect(store.getState().session?.ply).toBe(33);
    expect(screen.getByRole('button', { name: /Wd8#/, current: true })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(store.getState().session?.ply).toBe(32);
  });
  test('player names from PGN headers', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ pgn: OPERA })}` });
    expect(await screen.findByText(/Morphy/)).toBeTruthy();
    expect(screen.getByText(/Duke of Brunswick/)).toBeTruthy();
  });
  // Review Focus 1
  test('Load: a bad FEN shows its message and keeps the position', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ fen: SCHOLAR })}` });
    fireEvent.click(await screen.findByRole('button', { name: 'Wczytaj' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'nonsense w - - 0 1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Wczytaj' }));
    expect(await within(dialog).findByText(/Nie umiem odczytać|Ten FEN nie jest poprawną pozycją/)).toBeTruthy();
    expect(store.getState().session?.game.fen()).toBe(SCHOLAR);
  });
  test('Load: a lichess link fetches the export URL with the PGN Accept header', async () => {
    const fetch = vi.fn(async () => new Response(OPERA, { status: 200 }));
    const store = await withPlayer({ fetch: fetch as unknown as typeof globalThis.fetch });
    mount(<AppRoutes />, { store, path: '/board' });
    fireEvent.click(await screen.findByRole('button', { name: 'Wczytaj' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'https://lichess.org/AbCd1234' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Wczytaj' }));
    await waitFor(() => expect(store.getState().session?.game.length).toBe(33));
    expect(fetch).toHaveBeenCalledWith('https://lichess.org/game/export/AbCd1234?clocks=false&evals=false', expect.objectContaining({ headers: { Accept: 'application/x-chess-pgn' } }));
  });
  test('Load: a lichess failure shows loadLichessFailed', async () => {
    const fetch = vi.fn(async () => new Response('', { status: 404 }));
    const store = await withPlayer({ fetch: fetch as unknown as typeof globalThis.fetch });
    mount(<AppRoutes />, { store, path: '/board' });
    fireEvent.click(await screen.findByRole('button', { name: 'Wczytaj' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'lichess.org/AbCd1234' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Wczytaj' }));
    expect(await within(dialog).findByText(/Nie udało się pobrać partii z lichess/)).toBeTruthy();
  });
  test('letters for paper draws letters instead of images', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/board' });
    fireEvent.click(await screen.findByRole('switch', { name: 'Litery do druku' }));
    await waitFor(() => expect(store.getState().player?.pieceStyle).toBe('letters'));
    expect(screen.queryAllByRole('img', { name: /biał|czarn/ })).toHaveLength(0);
    expect(document.querySelector('[data-square="e1"] span:not([data-square-name])')?.textContent).toBe('K');
  });
  test('all twelve look options in the picker', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/board' });
    await screen.findByRole('group', { name: 'Bierki' });
    expect(document.querySelectorAll('[data-option]')).toHaveLength(12);
  });
  test('copy link writes the address to the clipboard', async () => {
    const write = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: write }, configurable: true });
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/board' });
    fireEvent.click(await screen.findByRole('button', { name: 'Kopiuj link' }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(String((write.mock.calls[0] as unknown[])[0])).toMatch(/#\/board/);
  });
});

describe('library entries by id (old #pos links)', () => {
  test('pos=lucena opens that position', async () => {
    const store = await withPlayer();
    store.getState().openBoard(new URLSearchParams('pos=lucena'));
    expect(store.getState().session?.source.kind).toBe('fen');
    expect(store.getState().session?.game.fen()).toContain('1K1k4');
  });
  test('pos=opera-game opens the PGN at its ply in its view', async () => {
    const store = await withPlayer();
    store.getState().openBoard(new URLSearchParams('pos=opera-game'));
    expect([store.getState().session?.game.length, store.getState().session?.ply, store.getState().session?.look]).toEqual([33, 23, { pieces: 'pieces', moves: 'roads' }]);
  });
  test('pos=nope says so and opens the start position', async () => {
    const store = await withPlayer();
    store.getState().openBoard(new URLSearchParams('pos=nope'));
    expect(store.getState().toast).toBe('Nie ma takiej pozycji w bibliotece');
    expect(store.getState().session?.game.fen()).toMatch(/^rnbqkbnr\/pppppppp/);
  });
});

describe('game status (POC parity)', () => {
  test('whose move, check, mate', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/board?${q({ pgn: OPERA, ply: '0' })}` });
    expect(await screen.findByRole('status', { name: 'Stan partii' })).toHaveProperty('textContent', 'Ruch białych');
    fireEvent.click(screen.getByRole('button', { name: 'Koniec' }));
    expect(screen.getByRole('status', { name: 'Stan partii' }).textContent).toBe('Mat');
    fireEvent.click(screen.getByRole('button', { name: 'Poprzedni ruch' }));
    fireEvent.click(screen.getByRole('button', { name: 'Poprzedni ruch' }));
    expect(screen.getByRole('status', { name: 'Stan partii' }).textContent).toBe('Szach · Ruch czarnych');
  });
});
