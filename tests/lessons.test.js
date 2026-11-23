import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sayParts, progressStore, PROGRESS_KEY } from '../lessons.js';

test('sayParts splits bold runs and leaves the rest alone', () => {
  assert.deepEqual(sayParts('Open **King houses**. Only the king guards f7.'),
    [{ text: 'Open ', strong: false }, { text: 'King houses', strong: true }, { text: '. Only the king guards f7.', strong: false }]);
  assert.deepEqual(sayParts('No bold here'), [{ text: 'No bold here', strong: false }]);
});

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m }; };

test('progressStore keeps the highest step and the done flag under one key', () => {
  const s = memory(); const p = progressStore(s);
  assert.equal(p.get('scholars-mate'), null);
  p.set('scholars-mate', { step: 3, done: false });
  p.set('scholars-mate', { step: 2, done: false });           // never lowers
  assert.deepEqual(p.get('scholars-mate'), { step: 3, done: false });
  p.set('scholars-mate', { step: 17, done: true });
  p.set('scholars-mate', { step: 4, done: false });           // never clears done
  assert.deepEqual(p.get('scholars-mate'), { step: 17, done: true });
  assert.deepEqual(JSON.parse(s.getItem(PROGRESS_KEY)), { 'scholars-mate': { step: 17, done: true } });
  p.reset('scholars-mate');
  assert.equal(p.get('scholars-mate'), null);
});

test('progressStore survives a throwing or missing storage', () => {
  const bad = { getItem() { throw new Error('quota'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('quota'); } };
  const p = progressStore(bad);
  assert.doesNotThrow(() => p.set('x', { step: 1, done: false }));
  assert.equal(p.get('x'), null);
  assert.equal(progressStore(undefined).get('x'), null);
  const corrupt = memory(); corrupt.setItem(PROGRESS_KEY, '{not json');
  assert.equal(progressStore(corrupt).get('x'), null);
});
