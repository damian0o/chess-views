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

// ---------- validateLesson (questions, moments, PGN replay) ----------
import { validateLesson } from '../lessons.js';
import { Chess } from './vendor/chess.js';
import { readFileSync as readLib } from 'node:fs';

const shipped = JSON.parse(readLib(new URL('../positions.json', import.meta.url), 'utf8'));
const SAY = 'Open **Shapes**.';
const base = (steps, extra = {}) => ({ id: 'fx', name: 'Fixture', about: 'x', steps, ...extra });
const PGN = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#';
const withMoments = (steps) => base(steps, { game: 'Fixture game', moments: [
  { id: 'attack', name: 'the attack', pgn: PGN, ply: 5 },
  { id: 'mate', name: 'the mate', pgn: PGN, ply: 7 },
] });
const errs = (L) => validateLesson(L, shipped.positions, Chess);

test('validateLesson: the shipped lessons are valid', () => {
  for (const L of shipped.lessons) assert.deepEqual(errs(L), [], L.id);
});

test('validateLesson: an illegal pgn is reported', () => {
  const e = errs(base([{ pgn: '1. e4 e5 2. Ke3', ply: 3, view: 'board', say: SAY }]));
  assert.equal(e.length, 1); assert.match(e[0], /^fx step 1: /);
});

test('validateLesson: a ply beyond the game is reported', () => {
  assert.equal(errs(base([{ pgn: PGN, ply: 8, view: 'board', say: SAY }])).length, 1);
});

test('validateLesson: a recall step with its own position is reported', () => {
  const e = errs(withMoments([{ fen: '8/8/8/8/8/8/8/K6k w - - 0 1', moment: 'mate', recall: true, view: 'shapes', say: SAY, ask: { q: 'Is this the mate?', choices: ['Yes', 'No'], answer: 0 } }]));
  assert.ok(e.some((x) => x.startsWith('fx step 1: ')), e.join('|'));
});

test('validateLesson: a recall step whose answer is not Yes is reported', () => {
  const e = errs(withMoments([{ moment: 'mate', recall: true, view: 'shapes', say: SAY, ask: { q: 'Is this the mate?', choices: ['Yes', 'No'], answer: 1 } }]));
  assert.equal(e.length, 1, e.join('|'));
});

test('validateLesson: a valid recall step passes', () => {
  assert.deepEqual(errs(withMoments([{ moment: 'mate', recall: true, view: 'shapes', say: SAY, ask: { q: 'Is this the mate?', choices: ['Yes', 'No'], answer: 0 } }])), []);
});

test('validateLesson: an unknown moment is reported', () => {
  assert.equal(errs(withMoments([{ pgn: PGN, ply: 5, moment: 'nope', view: 'board', say: SAY }])).length, 1);
});

test('validateLesson: bad questions are each reported', () => {
  const step = (ask) => ({ pgn: PGN, ply: 5, view: 'board', say: SAY, ask });
  const bad = [
    { q: 'Pick', choices: ['a', 'b', 'c', 'd', 'e'], answer: 0 },
    { q: 'Pick', choices: ['a', 'b'], answer: 2 },
    { q: 'Pick', choices: ['x'.repeat(33), 'b'], answer: 0 },
    { q: 'Pick', choices: ['a', 'b'], answer: 0, tap: ['f7'] },
    { q: 'Tap', tap: ['f9'] },
    { q: 'x'.repeat(81), tap: ['f7'] },
  ];
  for (const ask of bad) assert.equal(errs(base([step(ask)])).length, 1, JSON.stringify(ask));
  assert.deepEqual(errs(base([step({ q: 'Tap', tap: ['f7'] })])), []);
});

test('validateLesson: blocks outside Shapes is reported', () => {
  assert.equal(errs(base([{ pgn: PGN, ply: 5, blocks: true, view: 'board', say: SAY, ask: { q: 'Yes?', choices: ['Yes', 'No'], answer: 0 } }])).length, 1);
});

test('validateLesson: moments need a game and 2-4 entries', () => {
  const L = withMoments([{ pgn: PGN, ply: 5, view: 'board', say: SAY }]);
  assert.deepEqual(errs(L), []);
  assert.equal(errs({ ...L, game: undefined }).length, 1);
  assert.equal(errs({ ...L, moments: L.moments.slice(0, 1) }).length, 1);
  assert.equal(errs({ ...L, moments: [L.moments[0], { ...L.moments[1], ply: 99 }] }).length, 1);
});

// ---------- Task 2: questions in resolved steps, the answer gate ----------
import { checkAnswer } from '../lessons.js';

const Q = withMoments([
  { pgn: PGN, ply: 5, moment: 'attack', view: 'board', say: SAY, ask: { q: 'Which square?', choices: ['f7', 'f2'], answer: 0 } },
  { moment: 'mate', recall: true, view: 'shapes', say: SAY, ask: { q: 'Is this the mate?', choices: ['Yes', 'No'], answer: 0, right: 'Yes, Qxf7.' } },
  { same: true, view: 'kings', say: SAY },
  { pgn: PGN, ply: 3, view: 'board', say: SAY, ask: { q: 'Tap it', tap: ['f7'] } },
]);

test('resolveSteps: a recall step takes its moment\'s board', () => {
  const st = resolveSteps(Q, []);
  assert.deepEqual(st[1].source, { kind: 'pgn', pgn: PGN, ply: 7 });
  assert.equal(st[1].blocks, true);
  assert.deepEqual(st[1].moment, { id: 'mate', name: 'the mate' });
  assert.deepEqual(st[2].source, st[1].source, 'same after a recall copies its board');
  assert.equal(st[0].blocks, false);
  assert.equal(st[2].moment, null);
});

test('resolveSteps: ask defaults', () => {
  const st = resolveSteps(Q, []);
  assert.deepEqual(st[0].ask, { q: 'Which square?', choices: ['f7', 'f2'], answer: 0, tap: null, right: 'Right!' });
  assert.equal(st[1].ask.right, 'Yes, Qxf7.');
  assert.deepEqual(st[3].ask, { q: 'Tap it', choices: null, answer: null, tap: ['f7'], right: 'Right!' });
  assert.equal(st[2].ask, null);
});

test('nextGate: a question waits for the answer', () => {
  const st = resolveSteps(Q, []);
  assert.deepEqual(nextGate(st[0], { tab: 'board', ply: 5, answered: false }), { kind: 'answer', text: 'Answer first' });
  assert.equal(nextGate(st[0], { tab: 'board', ply: 5, answered: true }), null);
});

test('nextGate: the view gate comes before the answer gate', () => {
  const st = resolveSteps(Q, []);
  assert.equal(nextGate(st[0], { tab: 'roads', ply: 5, answered: false }).kind, 'view');
});

test('nextGate: a blocks step with a question never asks for Reveal pieces', () => {
  const st = resolveSteps(Q, []);
  const s = { ...st[1], shapesGate: true };
  assert.equal(nextGate(s, { tab: 'shapes', ply: 7, answered: true, shapesReveal: false }), null);
});

test('checkAnswer: choice index and tap square', () => {
  assert.equal(checkAnswer({ choices: ['a', 'b'], answer: 1 }, 1), true);
  assert.equal(checkAnswer({ choices: ['a', 'b'], answer: 1 }, 0), false);
  assert.equal(checkAnswer({ tap: ['d8', 'e8'] }, 'e8'), true);
  assert.equal(checkAnswer({ tap: ['d8', 'e8'] }, 'd7'), false);
  assert.equal(checkAnswer({ tap: ['d8'] }, 0), false);
});

// ---------- Task 4: recognition rounds ----------
import { usableMoments, roundUnlocked, buildRound, ROUND_ID, ROUND_SIZE, MIN_USABLE } from '../lessons.js';

const fenN = (n) => `8/8/8/8/8/8/${n}P${7 - n}/K6k w - - 0 1`.replace(/0P/, 'P').replace(/P0/, 'P');
const mk = (id, game, ids, extra = {}) => ({ id, name: game, about: 'x', game, steps: [{ fen: fenN(0), view: 'board', say: 'x' }],
  moments: ids.map((m, i) => ({ id: m, name: `the ${m}`, fen: fenN(i % 7), ...(extra[m] || {}) })) });
const RL = [
  mk('ga', 'Game A', ['start', 'trick', 'mate']),
  mk('gb', 'Game B', ['start', 'mate'], { mate: { looksLike: ['ga/mate'] } }),
  mk('gc', 'Game C', ['hunt', 'mate']),
  { id: 'plain', name: 'Plain', about: 'x', steps: [{ fen: fenN(0), view: 'board', say: 'x' }] },
];
const keys = (list) => list.map((m) => m.key).sort();

test('round constants', () => {
  assert.equal(ROUND_ID, 'recognise'); assert.equal(ROUND_SIZE, 8); assert.equal(MIN_USABLE, 4);
});

test('usableMoments: unfinished lessons never count', () => {
  const u = usableMoments(RL, [], new Set(['ga', 'gc']));
  assert.ok(u.every((m) => ['ga', 'gc'].includes(m.lessonId)));
  assert.deepEqual(keys(u), ['ga/mate', 'ga/start', 'ga/trick', 'gc/hunt', 'gc/mate']);
  assert.equal(u.find((m) => m.key === 'ga/trick').label, 'Game A: the trick');
});

test('usableMoments: lessons without moments never count', () => {
  assert.ok(usableMoments(RL, [], new Set(['ga', 'gc', 'plain'])).every((m) => m.lessonId !== 'plain'));
});

test('usableMoments: a moment whose only others are looksLike is not usable', () => {
  // x/a looks like y/a and y/b; y/b looks like x/b. The rule applies in both directions,
  // and the two wrong answers must not look like each other either.
  const two = [mk('x', 'X', ['a', 'b'], { a: { looksLike: ['y/a', 'y/b'] } }), mk('y', 'Y', ['a', 'b'], { b: { looksLike: ['x/b'] } })];
  const u = keys(usableMoments(two, [], new Set(['x', 'y'])));
  assert.ok(!u.includes('x/a'), 'x/a: only x/b is allowed beside it');
  assert.ok(!u.includes('y/b'), 'y/b: x/a lists it and it lists x/b, only y/a is left');
  assert.ok(!u.includes('x/b'), 'x/b: x/a and y/a are allowed beside it, but they look like each other');
  assert.ok(!u.includes('y/a'), 'y/a: x/b and y/b are allowed beside it, but they look like each other');
  const three = [...two, mk('z', 'Z', ['a', 'b'])];
  const u3 = keys(usableMoments(three, [], new Set(['x', 'y', 'z'])));
  assert.ok(u3.includes('x/a') && u3.includes('x/b'), 'a third lesson gives enough different answers');
});

test('roundUnlocked: needs two finished lessons and four usable moments', () => {
  assert.equal(roundUnlocked(RL, [], new Set(['ga'])), false);
  assert.equal(roundUnlocked(RL, [], new Set(['ga', 'plain'])), false);
  assert.equal(roundUnlocked(RL, [], new Set(['ga', 'gc'])), true);
  const tiny = [mk('p', 'P', ['a', 'b']), mk('q', 'Q', ['a', 'b'], { a: { looksLike: ['p/a', 'p/b'] }, b: { looksLike: ['p/a', 'p/b'] } })];
  assert.equal(roundUnlocked(tiny, [], new Set(['p', 'q'])), false, 'two lessons but too few usable moments');
});

test('buildRound: the same seed gives the same round, another seed another order', () => {
  const done = new Set(['ga', 'gb', 'gc']);
  const a = buildRound(RL, [], done, 42), b = buildRound(RL, [], done, 42);
  assert.deepEqual(a, b);
  assert.equal(a.id, 'recognise'); assert.equal(a.name, 'Recognise');
  const orders = new Set([1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(buildRound(RL, [], done, seed).steps.map((s) => s.ask.choices[s.ask.answer]))));
  assert.ok(orders.size > 1);
});

test('buildRound: every question has 3 or 4 distinct choices, the right one included, no looksLike pair together', () => {
  const done = new Set(['ga', 'gb', 'gc']);
  for (let seed = 0; seed < 30; seed++) {
    const r = buildRound(RL, [], done, seed);
    assert.equal(r.steps.length, Math.min(ROUND_SIZE, usableMoments(RL, [], done).length));
    const rights = r.steps.map((s) => s.ask.choices[s.ask.answer]);
    assert.equal(new Set(rights).size, rights.length, 'each moment once');
    r.steps.forEach((s, i) => {
      assert.ok(s.ask.choices.length >= 3 && s.ask.choices.length <= 4);
      assert.equal(new Set(s.ask.choices).size, s.ask.choices.length);
      const has = (l) => s.ask.choices.includes(l);
      assert.ok(!(has('Game A: the mate') && has('Game B: the mate')), 'looks-alike pair');
      assert.equal(s.view, 'shapes'); assert.equal(s.blocks, true); assert.equal(s.index, i + 1);
      assert.equal(s.ask.q, 'Which game, which moment?');
      assert.match(s.say, new RegExp(`Board ${i + 1} of ${r.steps.length}`));
      assert.ok(s.say.length <= 220);
    });
  }
});

test('buildRound: same-lesson moments are offered first as wrong answers', () => {
  const done = new Set(['ga', 'gb', 'gc']);
  const r = buildRound(RL, [], done, 7);
  const step = r.steps.find((s) => s.ask.choices[s.ask.answer] === 'Game A: the start');
  assert.ok(step.ask.choices.includes('Game A: the trick') && step.ask.choices.includes('Game A: the mate'));
});

test('buildRound: returns null when locked', () => {
  assert.equal(buildRound(RL, [], new Set(['ga']), 1), null);
});
