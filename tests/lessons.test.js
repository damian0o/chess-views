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

import { resolveSteps, openViews, nextGate, ALL_VIEWS } from '../lessons.js';

const positions = [{ id: 'opera-game', pgn: '1. e4 e5', ply: 2, view: 'roads' }, { id: 'lucena', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', view: 'roads' }];
const lesson = { id: 't', steps: [
  { pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5', ply: 5, view: 'board', say: 'a' },
  { same: true, view: 'kings', say: 'b' },
  { same: true, ply: 3, view: 'roads', sq: 'c4', say: 'c' },
  { pos: 'opera-game', view: 'territory', sq: 'f7', say: 'd' },
  { pos: 'lucena', view: 'board', solve: false, say: 'e' },
  { pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#', ply: 6, view: 'board', solve: true, task: 'Find the strike', say: 'f' },
  { same: true, view: 'shapes', shapes: { gate: true }, flip: true, say: 'g' },
] };

test('resolveSteps: same copies only the position, pos uses the step view, overrides apply', () => {
  const s = resolveSteps(lesson, positions);
  assert.deepEqual(s[1].source, { kind: 'pgn', pgn: '1. e4 e5 2. Bc4 Nc6 3. Qh5', ply: 5 });
  assert.equal(s[1].sq, null);
  assert.equal(s[2].source.ply, 3); assert.equal(s[2].sq, 'c4');
  assert.deepEqual(s[3].source, { kind: 'pgn', pgn: '1. e4 e5', ply: 2 }); assert.equal(s[3].view, 'territory');   // not the entry's roads
  assert.deepEqual(s[4].source, { kind: 'fen', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1' });
  assert.equal(s[5].solve, true); assert.equal(s[5].task, 'Find the strike');
  assert.equal(s[6].solve, false); assert.equal(s[6].task, null); assert.equal(s[6].shapesGate, true); assert.equal(s[6].flip, true);
  assert.equal(s[0].flip, false); assert.equal(s[0].index, 1); assert.equal(s[6].index, 7);
  assert.throws(() => resolveSteps({ id: 'x', steps: [{ pos: 'nope', view: 'board', say: '' }] }, positions), /lesson x step 1/);
});

test('openViews grows with the steps and opens everything once done', () => {
  const s = resolveSteps(lesson, positions);
  assert.deepEqual([...openViews(s, 1, false)], ['board']);
  assert.deepEqual([...openViews(s, 3, false)].sort(), ['board', 'kings', 'roads']);
  assert.equal(openViews(s, 1, true).size, ALL_VIEWS.length);
});

test('nextGate: view first, then the reveal, then the shapes reveal', () => {
  const s = resolveSteps(lesson, positions);
  assert.deepEqual(nextGate(s[1], { tab: 'board', ply: 5, shapesReveal: false }), { kind: 'view', text: 'Open King houses first' });
  assert.equal(nextGate(s[1], { tab: 'kings', ply: 5, shapesReveal: false }), null);
  assert.deepEqual(nextGate(s[5], { tab: 'board', ply: 6, shapesReveal: false }), { kind: 'reveal', text: 'Press ▶ first' });
  assert.equal(nextGate(s[5], { tab: 'board', ply: 7, shapesReveal: false }), null);
  assert.deepEqual(nextGate(s[6], { tab: 'shapes', ply: 6, shapesReveal: false }), { kind: 'shapes', text: 'Press Reveal pieces first' });
  assert.equal(nextGate(s[6], { tab: 'shapes', ply: 6, shapesReveal: true }), null);
});
