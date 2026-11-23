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
