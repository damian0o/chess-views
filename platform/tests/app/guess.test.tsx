// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { EngineProvider } from '../../src/app/engine';
import type { WorkerLike } from '@core/engine/wasm';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
function fake(delay = 0): WorkerLike {
  const w: WorkerLike = { onmessage: null, onerror: null, postMessage(cmd: string) {
    const out = cmd === 'uci' ? ['uciok'] : cmd === 'isready' ? ['readyok'] : cmd.startsWith('go')
      ? ['info depth 10 multipv 1 score cp 30 pv e2e4', 'info depth 10 multipv 2 score cp 25 pv d2d4', 'info depth 10 multipv 3 score cp -40 pv a2a3', 'bestmove e2e4'] : [];
    for (const l of out) setTimeout(() => w.onmessage?.({ data: l }), delay);
  }, terminate() {} };
  return w;
}
const withPlayer = async () => { const s = makeStore(); await s.getState().addPlayer({ name: 'Ola' }); return s; };
const cell = (sq: string) => screen.getByRole('gridcell', { name: new RegExp(`^${sq}\\b`) });
const open = async (delay = 0) => {
  const store = await withPlayer();
  mount(<EngineProvider workerFactory={() => fake(delay)}><AppRoutes /></EngineProvider>, { store, path: '/board?view=engine' });
  fireEvent.click(await screen.findByRole('switch', { name: 'Zgadnij ruch' }));
  return store;
};

describe('guess the move', () => {
  test('guessing e2e4 at the start gives a grade and names the best move', async () => {
    await open();
    expect(document.querySelectorAll('[data-arrow]')).toHaveLength(0);     // arrows hidden while guessing
    fireEvent.click(cell('e2')); fireEvent.click(cell('e4'));
    expect(await screen.findByText('Twój ruch e4: Najlepszy!')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż' }));
    expect(document.querySelector('[data-arrow="e2e4"]')).not.toBeNull();
  });
  test('a weaker guess is graded against the best', async () => {
    await open();
    fireEvent.click(cell('a2')); fireEvent.click(cell('a3'));
    expect(await screen.findByText(/Twój ruch a3: Może być, ale był lepszy/)).toBeTruthy();
    expect(screen.getByText('Najlepszy: e4')).toBeTruthy();
  });
  test('a guess outside the top moves says so', async () => {
    await open();
    fireEvent.click(cell('h2')); fireEvent.click(cell('h4'));
    expect(await screen.findByText(/Nie ma go wśród najlepszych ruchów silnika/)).toBeTruthy();
  });
  // Review Focus 4
  test('a guess while the engine is thinking waits and then grades', async () => {
    await open(80);
    fireEvent.click(cell('e2')); fireEvent.click(cell('e4'));
    expect(screen.getByText('Silnik myśli…')).toBeTruthy();
    expect(await screen.findByText('Twój ruch e4: Najlepszy!')).toBeTruthy();
  });
  test("tapping the opponent's piece shows a hint and never throws", async () => {
    await open();
    fireEvent.click(cell('e7'));
    expect(await screen.findByText('To bierka przeciwnika: wybierz swoją')).toBeTruthy();
    fireEvent.click(cell('e4'));
    expect(screen.getByText('Najpierw dotknij swojej bierki')).toBeTruthy();
    fireEvent.click(cell('e2')); fireEvent.click(cell('e5'));
    expect(screen.getByText('Ta bierka nie może tam pójść')).toBeTruthy();
  });
});
