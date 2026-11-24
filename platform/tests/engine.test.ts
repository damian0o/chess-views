import { describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createWasmStockfish, type WorkerLike } from '@core/engine/wasm';
import { cachedEngine } from '@core/engine/cache';
import { judgeable } from '@core/engine/index';
import type { Fen } from '@core/types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;
const OTHER = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' as Fen;

test('the vendored Stockfish files keep their pinned hashes', () => {
  const sha = (p: string) => createHash('sha256').update(readFileSync(new URL(`../../engine/${p}`, import.meta.url))).digest('hex');
  expect(sha('stockfish-19-lite-single.js')).toBe('ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a');
  expect(sha('stockfish-19-lite-single.wasm')).toBe('ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de');
});

type Script = (cmd: string, w: FakeWorker) => string[] | undefined;
type FakeWorker = WorkerLike & { sent: string[]; emit(line: string): void; terminated: boolean };
function fakeWorker(script: Script): FakeWorker {
  const w: FakeWorker = {
    onmessage: null, onerror: null, sent: [], terminated: false,
    emit(line) { setTimeout(() => w.onmessage?.({ data: line }), 0); },
    postMessage(cmd: string) { w.sent.push(cmd); for (const l of script(cmd, w) ?? []) w.emit(l); },
    terminate() { w.terminated = true; },
  };
  return w;
}
const basic: Script = (cmd) => {
  if (cmd === 'uci') return ['id name Fake 1', 'uciok'];
  if (cmd === 'isready') return ['readyok'];
  if (cmd.startsWith('go')) return ['info depth 10 multipv 2 score cp 10 pv d2d4', 'info depth 10 multipv 1 score cp 25 pv e2e4 e7e5', 'bestmove e2e4'];
  return undefined;
};

describe('WasmStockfish', () => {
  test('ready reports the engine name', async () => {
    const eng = createWasmStockfish({ workerFactory: () => fakeWorker(basic) });
    await expect(eng.ready()).resolves.toEqual({ name: 'Fake 1' });
  });
  test('analyse sets MultiPV once, searches to the depth and returns lines in order', async () => {
    let w!: FakeWorker;
    const eng = createWasmStockfish({ workerFactory: () => (w = fakeWorker(basic)) });
    const a = await eng.analyse(START, { depth: 10, multipv: 2 });
    expect(a.lines.map((l) => [l.move.uci, l.score])).toEqual([['e2e4', { cp: 25 }], ['d2d4', { cp: 10 }]]);
    expect(a.depth).toBe(10);
    expect(w.sent).toContain('setoption name MultiPV value 2');
    expect(w.sent).toContain('go depth 10');
    await eng.analyse(START, { depth: 10, multipv: 2 });
    expect(w.sent.filter((c) => c.startsWith('setoption name MultiPV')).length).toBe(1);
  });
  test('a search that times out stops, and the next one still gets its own answer', async () => {
    let calls = 0;
    const slow: Script = (cmd) => {
      if (cmd === 'uci') return ['uciok']; if (cmd === 'isready') return ['readyok'];
      if (cmd === 'stop') return ['bestmove a2a3'];
      if (cmd.startsWith('go')) return ++calls === 1 ? [] : ['info depth 10 multipv 1 score cp 5 pv h2h3', 'bestmove h2h3'];
      return undefined;
    };
    const eng = createWasmStockfish({ workerFactory: () => fakeWorker(slow), timeoutMs: 50 });
    await expect(eng.analyse(START, { depth: 10 })).rejects.toThrow(/within 50 ms/);
    expect((await eng.analyse(START, { depth: 10 })).lines.map((l) => l.move.uci)).toEqual(['h2h3']);
  });
  // Review Focus 4
  test('an aborted search never answers the next one and is not cached', async () => {
    let calls = 0;
    const script: Script = (cmd) => {
      if (cmd === 'uci') return ['uciok']; if (cmd === 'isready') return ['readyok'];
      if (cmd === 'stop') return ['info depth 3 multipv 1 score cp 1 pv a2a3', 'bestmove a2a3'];   // the first search's late answer
      if (cmd.startsWith('go')) return ++calls === 1 ? [] : ['info depth 10 multipv 1 score cp 5 pv h2h3', 'bestmove h2h3'];
      return undefined;
    };
    const base = createWasmStockfish({ workerFactory: () => fakeWorker(script) });
    const eng = cachedEngine(base);
    const ctrl = new AbortController();
    const first = eng.analyse(START, { depth: 10 }, ctrl.signal);
    setTimeout(() => ctrl.abort(), 20);
    await expect(first).rejects.toThrow(/aborted/i);
    const second = await eng.analyse(OTHER, { depth: 10 });
    expect(second.lines.map((l) => l.move.uci)).toEqual(['h2h3']);
    // asking for the aborted position again searches again (nothing was cached for it)
    const again = await eng.analyse(START, { depth: 10 });
    expect(again.lines.map((l) => l.move.uci)).toEqual(['h2h3']);
    expect(calls).toBe(3);
  });
  test('the cache answers a repeated request without searching', async () => {
    let w!: FakeWorker;
    const eng = cachedEngine(createWasmStockfish({ workerFactory: () => (w = fakeWorker(basic)) }));
    await eng.analyse(START, { depth: 10 });
    await eng.analyse(START, { depth: 10 });
    expect(w.sent.filter((c) => c.startsWith('go')).length).toBe(1);
  });
  test('a shallower result than asked is not cached', async () => {
    let w!: FakeWorker;
    const shallow: Script = (cmd) => (cmd.startsWith('go') ? ['info depth 6 multipv 1 score cp 5 pv e2e4', 'bestmove e2e4'] : basic(cmd, w));
    const eng = cachedEngine(createWasmStockfish({ workerFactory: () => (w = fakeWorker(shallow)) }));
    await eng.analyse(START, { depth: 10 }); await eng.analyse(START, { depth: 10 });
    expect(w.sent.filter((c) => c.startsWith('go')).length).toBe(2);
  });
  test('a worker error fails ready and pending calls', async () => {
    const eng = createWasmStockfish({ workerFactory: () => { const w = fakeWorker(() => []); setTimeout(() => w.onerror?.({ message: 'boom' }), 0); return w; }, timeoutMs: 500 });
    await expect(eng.ready()).rejects.toThrow(/worker failed/);
  });
  test('bestMove plays at a level and returns the move', async () => {
    let w!: FakeWorker;
    const eng = createWasmStockfish({ workerFactory: () => (w = fakeWorker(basic)) });
    expect(await eng.bestMove(START, { level: 'easy' })).toEqual({ uci: 'e2e4', from: 'e2', to: 'e4' });
    expect(w.sent.some((c) => c.startsWith('setoption name Skill Level'))).toBe(true);
  });
});

describe('judgeable', () => {
  test('rejects positions the engine cannot judge', () => {
    expect(judgeable(START)).toBe(true);
    expect(judgeable('8/8/8/8/8/8/8/8 w - - 0 1' as Fen)).toBe(false);                                     // no kings
    expect(judgeable('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3' as Fen)).toBe(false);  // mate: no move
    expect(judgeable('4k3/8/8/8/8/8/4R3/4K3 b - - 0 1' as Fen)).toBe(true);                                  // Black in check, to move
    expect(judgeable('4k3/8/8/8/8/8/4R3/4K3 w - - 0 1' as Fen)).toBe(false);                                 // Black in check, White to move
  });
});
