// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { EngineProvider } from '../../src/app/engine';
import type { WorkerLike } from '@core/engine/wasm';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
type FW = WorkerLike & { sent: string[] };
function fake(answer: (cmd: string, w: FW) => string[] | undefined, delay = () => 0): FW {
  const w: FW = { onmessage: null, onerror: null, sent: [], postMessage(cmd: string) { w.sent.push(cmd); const d = delay(); for (const l of answer(cmd, w) ?? []) setTimeout(() => w.onmessage?.({ data: l }), d); }, terminate() {} };
  return w;
}
const basic = (cmd: string) => (cmd === 'uci' ? ['uciok'] : cmd === 'isready' ? ['readyok'] : cmd.startsWith('go')
  ? ['info depth 10 multipv 1 score cp 25 pv d8e7', 'info depth 10 multipv 2 score cp 10 pv g7g6', 'bestmove d8e7'] : undefined);
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
const withPlayer = async () => { const s = makeStore(); await s.getState().addPlayer({ name: 'Ola' }); return s; };

describe('Silnik view', () => {
  test('shows thinking, then the bar and arrows', async () => {
    const store = await withPlayer();
    mount(<EngineProvider workerFactory={() => fake(basic, () => 30)}><AppRoutes /></EngineProvider>, { store, path: `/board?${q({ fen: SCHOLAR, view: 'engine' })}` });
    expect(await screen.findByText('Silnik myśli…')).toBeTruthy();
    expect(await screen.findByRole('img', { name: /Równo|lepiej/ })).toBeTruthy();
    await waitFor(() => expect(document.querySelectorAll('[data-arrow]').length).toBeGreaterThan(0));
    expect(document.querySelector('[data-arrow="d8e7"]')).not.toBeNull();
  });
  // Review Focus 2
  test('a blocked worker shows engineFailed with Try again, and Try again restarts', async () => {
    let n = 0;
    const factory = () => { n++; const w = fake(n === 1 ? () => undefined : basic); if (n === 1) setTimeout(() => w.onerror?.({}), 0); return w; };
    const store = await withPlayer();
    mount(<EngineProvider workerFactory={factory}><AppRoutes /></EngineProvider>, { store, path: `/board?${q({ fen: SCHOLAR, view: 'engine' })}` });
    expect(await screen.findByText('Silnik nie wystartował w tej przeglądarce')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj jeszcze raz' }));
    expect(await screen.findByRole('img', { name: /Równo|lepiej/ })).toBeTruthy();
    expect(n).toBe(2);
  });
  test('no kings: engineNoEval and no worker at all', async () => {
    let n = 0;
    const store = await withPlayer();
    mount(<EngineProvider workerFactory={() => { n++; return fake(basic); }}><AppRoutes /></EngineProvider>, { store, path: `/board?${q({ fen: '8/8/8/8/8/8/8/8 w - - 0 1', view: 'engine' })}` });
    expect(await screen.findByText('Tu nie ma oceny')).toBeTruthy();
    expect(n).toBe(0);
  });
  test('moving the ply asks for the new position and ignores the stale answer', async () => {
    const OPERA = '1. e4 e5 2. Nf3 d6';
    // Answers by position: the old one (after 1. e4 e5) says a2a3, the new one (after 2. Nf3) says g1f3.
    let pos = '';
    const answer = (cmd: string) => {
      if (cmd === 'uci') return ['uciok']; if (cmd === 'isready') return ['readyok'];
      if (cmd.startsWith('position')) { pos = cmd; return undefined; }
      if (cmd.startsWith('go')) return pos.includes('5N2') ? ['info depth 10 multipv 1 score cp 0 pv g1f3', 'bestmove g1f3'] : ['info depth 10 multipv 1 score cp 900 pv a2a3', 'bestmove a2a3'];
      return undefined;
    };
    const store = await withPlayer();
    mount(<EngineProvider workerFactory={() => fake(answer, () => 40)}><AppRoutes /></EngineProvider>, { store, path: `/board?${q({ pgn: OPERA, ply: '2', view: 'engine' })}` });
    await screen.findByText('Silnik myśli…');
    fireEvent.click(screen.getByRole('button', { name: 'Następny ruch' }));
    await waitFor(() => expect(document.querySelector('[data-arrow="g1f3"]')).not.toBeNull());
    expect(document.querySelector('[data-arrow="a2a3"]')).toBeNull();
    expect(screen.queryByRole('img', { name: /wygrywają/ })).toBeNull();
  });
});
