import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// The engine is vendored from nmrugg/stockfish.js release v19.0.1 (Stockfish 19, lite net, single-threaded).
// These hashes pin the exact files so a swapped or truncated engine fails the suite.
const PINNED = {
  'engine/stockfish-19-lite-single.js': 'ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a',
  'engine/stockfish-19-lite-single.wasm': 'ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de',
};

const sha256 = (path) => createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex');

test('engine: the vendored Stockfish files match their pinned release hashes', () => {
  for (const [path, hash] of Object.entries(PINNED)) assert.equal(sha256(path), hash, path);
});

test('engine: the wasm is a real WebAssembly module and the licence travels with it', () => {
  const wasm = readFileSync(new URL('../engine/stockfish-19-lite-single.wasm', import.meta.url));
  assert.deepEqual([...wasm.subarray(0, 4)], [0x00, 0x61, 0x73, 0x6d]);
  const licence = readFileSync(new URL('../engine/COPYING.txt', import.meta.url), 'utf8');
  assert.match(licence, /GNU GENERAL PUBLIC LICENSE/);
  assert.match(licence, /Version 3/);
});

import { createEngine } from '../engine.js';

/** A scripted stand-in for the Stockfish Worker: answers UCI commands from a table. */
function fakeWorker(script) {
  const w = { onmessage: null, onerror: null, sent: [], terminated: false,
    postMessage(cmd) { w.sent.push(cmd); for (const line of script(cmd) || []) setTimeout(() => w.onmessage && w.onmessage({ data: line }), 0); },
    terminate() { w.terminated = true; } };
  return w;
}
const basic = (cmd) => {
  if (cmd === 'uci') return ['id name Fake', 'uciok'];
  if (cmd === 'isready') return ['readyok'];
  if (cmd.startsWith('go')) return ['info depth 10 multipv 2 score cp 10 pv d2d4', 'info depth 10 multipv 1 score cp 25 pv e2e4 e7e5', 'bestmove e2e4'];
};

test('analyse sets MultiPV once, searches to the depth and returns scored moves in order', async () => {
  let w; const eng = createEngine({ worker: () => (w = fakeWorker(basic)) });
  await eng.ready;
  const a = await eng.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 10, multipv: 2 });
  assert.deepEqual(a.moves.map((m) => [m.uci, m.cp]), [['e2e4', 25], ['d2d4', 10]]);
  assert.equal(a.depth, 10); assert.equal(a.multipv, 2);
  assert.ok(w.sent.includes('setoption name MultiPV value 2'));
  assert.ok(w.sent.includes('go depth 10'));
  assert.ok(!w.sent.some((c) => c === 'ucinewgame'));
  await eng.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 10, multipv: 2 });
  assert.equal(w.sent.filter((c) => c.startsWith('setoption name MultiPV')).length, 1);
});

test('analyse times out, stops, and the next call still gets its own answer', async () => {
  let calls = 0;
  const slow = (cmd) => {
    if (cmd === 'uci') return ['uciok']; if (cmd === 'isready') return ['readyok'];
    if (cmd === 'stop') return ['bestmove a2a3'];
    if (cmd.startsWith('go')) return ++calls === 1 ? [] : ['info depth 10 multipv 1 score cp 5 pv h2h3', 'bestmove h2h3'];
  };
  const eng = createEngine({ worker: () => fakeWorker(slow) });
  await assert.rejects(eng.analyse('x', { depth: 10, timeoutMs: 50 }), /no "bestmove" within 50 ms/);
  const a = await eng.analyse('x', { depth: 10 });
  assert.deepEqual(a.moves.map((m) => m.uci), ['h2h3']);
});

test('ready rejects when the worker fails before uciok', async () => {
  const eng = createEngine({ worker: () => { const w = fakeWorker(() => []); setTimeout(() => w.onerror && w.onerror({ message: 'boom' }), 0); return w; }, timeoutMs: 500 });
  await assert.rejects(eng.ready, /worker failed/);
});
