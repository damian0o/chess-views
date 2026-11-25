// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { EngineProvider } from '../../src/app/engine';
import type { WorkerLike } from '@core/engine/wasm';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
// Scores from Stockfish at depth 12 for scholars-mate step 13 (Black to move after 3. Qh5), keyed by board + side.
const SCORES: Record<string, string> = {
  'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b': 'score cp 29 pv g7g6',        // the step: best g6
  'r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w': 'score cp -29 pv h5f3',      // after g6
  'r1b1kbnr/ppppqppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w': 'score cp -16 pv g1f3',        // after Qe7
  'r1bqkbnr/1ppp1ppp/p1n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w': 'score mate 1 pv h5f7',       // after a6: Qxf7#
};
function fake(): WorkerLike {
  let pos = '';
  const w: WorkerLike = { onmessage: null, onerror: null, postMessage(cmd: string) {
    if (cmd.startsWith('position fen ')) pos = cmd.slice(13).split(' ').slice(0, 2).join(' ');
    const out = cmd === 'uci' ? ['uciok'] : cmd === 'isready' ? ['readyok'] : cmd.startsWith('go')
      ? [`info depth 12 multipv 1 ${SCORES[pos] ?? 'score cp 0 pv a2a3'}`, 'bestmove a2a3'] : [];
    for (const l of out) setTimeout(() => w.onmessage?.({ data: l }), 0);
  }, terminate() {} };
  return w;
}
function broken(): WorkerLike {
  const w: WorkerLike = { onmessage: null, onerror: null, postMessage() {}, terminate() {} };
  setTimeout(() => w.onerror?.({}), 0);
  return w;
}
const cell = (sq: string) => screen.getByRole('gridcell', { name: new RegExp(`^${sq}\\b`) });
const next = () => screen.getByRole('button', { name: /^Dalej/ }) as HTMLButtonElement;
const open = async (worker = fake) => {
  const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
  mount(<EngineProvider workerFactory={worker}><AppRoutes /></EngineProvider>, { store, path: '/lesson/scholars-mate/s13-territory' });
  await screen.findByText('Zatrzymaj mata');
  return store;
};
const play = (from: string, to: string) => { fireEvent.click(cell(from)); fireEvent.click(cell(to)); };

describe('a find-the-move step played on the board', () => {
  test('opens asking for a move: no answer button yet, Next locked', async () => {
    await open();
    expect(screen.getByText('Dotknij bierki, potem pola, na które idzie')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Zagraj ruch|Pokaż odpowiedź/ })).toBeNull();
    expect(next().disabled).toBe(true);
  });
  test("the game's move is right: the grade, the move on the board, Next opens", async () => {
    const store = await open();
    play('g7', 'g6');
    expect(await screen.findByText('Twój ruch g6: Dobrze, tak zagrano w partii!')).toBeTruthy();
    await waitFor(() => expect(next().disabled).toBe(false));
    expect(store.getState().run?.ply).toBe(6);
  });
  test('another good move is right too, and the game move is named', async () => {
    await open();
    play('d8', 'e7');
    expect(await screen.findByText('Twój ruch He7: Równie dobry')).toBeTruthy();
    expect(screen.getByText('W partii: g6')).toBeTruthy();
    await waitFor(() => expect(next().disabled).toBe(false));
  });
  test('a move that allows mate is wrong: the reason, try again, and only now Show the answer', async () => {
    const store = await open();
    play('a7', 'a6');
    expect(await screen.findByText('Twój ruch a6: Ojej, to pozwala na mata w 1')).toBeTruthy();
    expect(screen.getByText('Spróbuj jeszcze raz')).toBeTruthy();
    expect(next().disabled).toBe(true);
    expect(cell('a6').dataset.tap).toBe('wrong');
    // A second try works; the wrong mark goes.
    play('g7', 'g6');
    expect(await screen.findByText('Twój ruch g6: Dobrze, tak zagrano w partii!')).toBeTruthy();
    expect(store.getState().run?.ply).toBe(6);
  });
  test('Show the answer plays the game move and opens Next', async () => {
    const store = await open();
    play('a7', 'a6');
    fireEvent.click(await screen.findByRole('button', { name: 'Pokaż odpowiedź' }));
    await waitFor(() => expect(next().disabled).toBe(false));
    expect(store.getState().run?.ply).toBe(6);
  });
  test('without the engine the game move still counts; another move cannot be checked', async () => {
    await open(broken);
    play('d8', 'e7');
    expect(await screen.findByText(/Tu silnik nie sprawdzi ruchu/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pokaż odpowiedź' })).toBeTruthy();
    play('g7', 'g6');
    expect(await screen.findByText('Twój ruch g6: Dobrze, tak zagrano w partii!')).toBeTruthy();
    await waitFor(() => expect(next().disabled).toBe(false));
  });
  test('a tap on an opponent piece gives a hint and never counts as a try', async () => {
    await open();
    fireEvent.click(cell('h5'));
    expect(screen.getByText('To bierka przeciwnika: wybierz swoją')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pokaż odpowiedź' })).toBeNull();
  });
});
