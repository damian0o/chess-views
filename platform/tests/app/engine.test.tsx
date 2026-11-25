// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { EngineProvider, useEngine } from '../../src/app/engine';
import { EvalBar } from '../../src/app/board/EvalBar';
import { Arrows } from '../../src/app/board/Arrows';
import { PlayerProvider } from '../../src/app/i18n';
import { defaultProfile } from '@core/storage/index';
import type { WorkerLike } from '@core/engine/wasm';
import type { Fen } from '@core/types';

afterEach(cleanup);
type FW = WorkerLike & { sent: string[] };
const fake = (script: (cmd: string, w: FW) => string[] | void): FW => {
  const w: FW = { onmessage: null, onerror: null, sent: [], postMessage(cmd: string) { w.sent.push(cmd); for (const l of script(cmd, w) ?? []) setTimeout(() => w.onmessage?.({ data: l }), 0); }, terminate() {} };
  return w;
};
const ok = (cmd: string) => (cmd === 'uci' ? ['uciok'] : cmd === 'isready' ? ['readyok'] : cmd.startsWith('go') ? ['info depth 10 multipv 1 score cp 30 pv e2e4', 'bestmove e2e4'] : []);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;

describe('useEngine', () => {
  test('an unjudgeable position gives null without creating a worker', async () => {
    let made = 0;
    const wrapper = ({ children }: { children: ReactNode }) => <EngineProvider workerFactory={() => { made++; return fake(ok); }}>{children}</EngineProvider>;
    const { result } = renderHook(() => useEngine(), { wrapper });
    expect(await result.current.analyse('8/8/8/8/8/8/8/8 w - - 0 1' as Fen, { depth: 10 })).toBeNull();
    expect(made).toBe(0);
    expect(result.current.status).toBe('idle');
  });
  test('analyses a position once started', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <EngineProvider workerFactory={() => fake(ok)}>{children}</EngineProvider>;
    const { result } = renderHook(() => useEngine(), { wrapper });
    let a: Awaited<ReturnType<typeof result.current.analyse>> = null;
    await act(async () => { a = await result.current.analyse(START, { depth: 10 }); });
    expect(a!.lines[0]?.move.uci).toBe('e2e4');
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
  test('a worker that errors is failed; restart starts again', async () => {
    let n = 0;
    const factory = () => { n++; const w = fake(() => []); if (n === 1) setTimeout(() => w.onerror?.({}), 0); else w.postMessage = (cmd: string) => { w.sent.push(cmd); for (const l of ok(cmd)) setTimeout(() => w.onmessage?.({ data: l }), 0); }; return w; };
    const wrapper = ({ children }: { children: ReactNode }) => <EngineProvider workerFactory={factory}>{children}</EngineProvider>;
    const { result } = renderHook(() => useEngine(), { wrapper });
    await act(async () => { await result.current.analyse(START, { depth: 10 }).catch(() => null); });
    await waitFor(() => expect(result.current.status).toBe('failed'));
    act(() => result.current.restart());
    await act(async () => { await result.current.analyse(START, { depth: 10 }); });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(n).toBe(2);
  });
});

describe('EvalBar', () => {
  test('kids see words, adults see the number', () => {
    render(<PlayerProvider player={defaultProfile({ age: 'kids', locale: 'pl' })}><EvalBar score={{ cp: 130 }} turn="w" /></PlayerProvider>);
    expect(screen.getByText('Białe stoją lepiej')).toBeTruthy();
    cleanup();
    render(<PlayerProvider player={defaultProfile({ age: 'adults', locale: 'pl' })}><EvalBar score={{ cp: -130 }} turn="b" /></PlayerProvider>);
    expect(screen.getByText('+1.3')).toBeTruthy();
  });
  test('the bar width follows barPercent', () => {
    render(<PlayerProvider player={null}><EvalBar score={{ cp: 0 }} turn="w" /></PlayerProvider>);
    expect((screen.getByTestId('eval-white') as HTMLElement).style.width).toBe('50%');
  });
});

describe('Arrows', () => {
  const line = (uci: string, cp: number) => ({ move: { uci, from: uci.slice(0, 2), to: uci.slice(2, 4) }, score: { cp }, pv: [uci] });
  test('up to three arrows within half a pawn of the best', () => {
    const { container } = render(<svg><Arrows lines={[line('e2e4', 50), line('d2d4', 30), line('g1f3', 10), line('c2c4', 5), line('a2a3', -100)]} flip={false} /></svg>);
    expect(container.querySelectorAll('[data-arrow]')).toHaveLength(3);
  });
});
