import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boardFromFen, validatePlacement } from '../analysis.js';

const VIEWS = ['board', 'territory', 'reach', 'roads', 'kings', 'engine', 'diamond', 'shapes', 'knight'];
const TAGS = ['start', 'opening', 'structure', 'endgame', 'mate', 'tactic', 'study', 'king safety', 'knight', 'exercise', 'game', 'problem'];
const lib = JSON.parse(readFileSync(new URL('../positions.json', import.meta.url), 'utf8'));

test('library: has entries with the required fields and unique ids', () => {
  assert.ok(Array.isArray(lib.positions) && lib.positions.length >= 15, 'at least 15 positions');
  const ids = new Set();
  for (const p of lib.positions) {
    assert.match(p.id, /^[a-z0-9-]+$/, `id ${p.id}`);
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`); ids.add(p.id);
    assert.ok(p.name && p.name.length <= 40, `name of ${p.id}`);
    assert.ok(p.note && p.note.length <= 220, `note of ${p.id}`);
    assert.ok(VIEWS.includes(p.view), `view of ${p.id}: ${p.view}`);
    assert.ok(Array.isArray(p.tags) && p.tags.length >= 1 && p.tags.every((t) => TAGS.includes(t)), `tags of ${p.id}: ${p.tags}`);
    assert.ok((p.fen && !p.pgn) || (p.pgn && !p.fen), `${p.id} needs exactly one of fen or pgn`);
    if (p.pgn) assert.ok(Number.isInteger(p.ply) && p.ply >= 0, `ply of ${p.id}`);
  }
});

test('library: every FEN is a legal-looking position with one king per side', () => {
  for (const p of lib.positions.filter((x) => x.fen)) {
    const parts = p.fen.split(/\s+/);
    assert.equal(parts.length, 6, `${p.id}: full six-field FEN`);
    assert.equal(validatePlacement(parts[0]), null, `${p.id}: ${validatePlacement(parts[0])}`);
    assert.ok(['w', 'b'].includes(parts[1]), `${p.id}: side to move`);
    const flat = boardFromFen(p.fen).flat().filter(Boolean);
    assert.equal(flat.filter((c) => c.type === 'k' && c.color === 'w').length, 1, `${p.id}: one white king`);
    assert.equal(flat.filter((c) => c.type === 'k' && c.color === 'b').length, 1, `${p.id}: one black king`);
    assert.ok(!flat.some((c) => c.type === 'p' && (c.square.endsWith('1') || c.square.endsWith('8'))), `${p.id}: no pawn on rank 1 or 8`);
  }
});

test('library: the article position and the study are in it', () => {
  const byId = Object.fromEntries(lib.positions.map((p) => [p.id, p]));
  assert.equal(byId['alapin-structure'].fen, 'r1bqk1nr/pp2ppbp/2n3p1/3pP3/3P4/5N2/PP3PPP/RNBQKB1R w KQkq - 0 1');
  assert.equal(byId['king-trap-study'].fen, 'kb4Q1/1p6/1P6/8/1N6/1K6/8/8 w - - 0 1');
  assert.equal(byId['king-trap-study'].view, 'kings');
});

test('library: the blog problem starts from its own FEN with the solution hidden behind the moves', () => {
  const p = lib.positions.find((x) => x.id === 'mate-in-three');
  assert.ok(p.tags.includes('problem'));
  assert.equal(p.ply, 0);
  assert.match(p.pgn, /\[FEN "8\/1n4K1\/qpB4p\/3R3P\/4kp1N\/2p4P\/2P1pP2\/6R1 w - - 0 1"\]/);
  assert.match(p.pgn, /\[SetUp "1"\]/);
  assert.match(p.pgn, /1\. Rf1 .* 3\. Rd3#$/);
});

test('library: the Opera game names its players in PGN headers', () => {
  const p = lib.positions.find((x) => x.id === 'opera-game');
  assert.match(p.pgn, /^\[White "Morphy"\]\n\[Black "Duke of Brunswick and Count Isouard"\]\n\n1\. e4/);
  assert.equal(p.ply, 23);
});

import { resolveSteps, validateLesson } from '../lessons.js';
import { Chess } from './vendor/chess.js';
import { createHash } from 'node:crypto';

test('library: lessons are well formed', () => {
  assert.ok(Array.isArray(lib.lessons) && lib.lessons.length >= 1);
  const ids = new Set();
  for (const L of lib.lessons) {
    assert.match(L.id, /^[a-z0-9-]+$/); assert.ok(!ids.has(L.id)); ids.add(L.id);
    assert.ok(L.name && L.about);
    assert.ok(L.steps.length >= 3 && L.steps.length <= 30, `${L.id}: 3..30 steps`);
    assert.deepEqual(validateLesson(L, lib.positions, Chess), [], L.id);   // fields, questions, moments, every PGN replayed
  }
});

test('library: the test copy of chess.js is 1.0.0', () => {
  const hash = createHash('sha256').update(readFileSync(new URL('./vendor/chess.js', import.meta.url))).digest('hex');
  assert.equal(hash, 'b29ec4562b197c65d15eff8d1776c9005d3dcc25ecb1a38e543d3bcfa50ea4ee');
});

test("library: the Scholar's mate lesson has 25 steps in three moments with questions", () => {
  const L = lib.lessons.find((x) => x.id === 'scholars-mate');
  const steps = resolveSteps(L, lib.positions);
  assert.equal(steps.length, 25);
  assert.equal(L.game, "Scholar's mate");
  assert.deepEqual(L.moments.map((m) => m.id), ['attack', 'defence', 'mate']);
  assert.deepEqual(steps.slice(0, 5).map((s) => s.view), ['board', 'kings', 'roads', 'shapes', 'territory']);
  assert.equal(steps[4].sq, 'f7');
  const tap = steps[5];
  assert.deepEqual([tap.view, tap.ask.tap], ['board', ['f7']], 'the tap question is asked in Board, never in Territory with f7 focused');
  assert.ok(steps.every((s) => !(s.ask && s.ask.tap && s.view === 'territory')));
  assert.deepEqual([steps[8].solve, steps[8].task, steps[8].source.ply], [true, "Find White's strike", 6]);
  assert.equal(steps[9].source.ply, 7);
  const stop = steps.find((s) => s.ask && s.ask.q === 'Which move stops the mate?');
  assert.deepEqual([stop.ask.choices, stop.ask.answer], [['g6', 'a6', 'h6'], 0]);
  assert.equal(steps.filter((s) => s.blocks).length, 6, 'a Yes and a No board for each moment');
  for (const m of ['attack', 'defence', 'mate']) assert.ok(steps.some((s) => s.blocks && s.moment && s.moment.id === m && s.ask.answer === 0) && steps.some((s) => s.blocks && s.moment && s.moment.id === m && s.ask.answer === 1), m);
  assert.equal(steps.filter((s) => s.shapesGate).length, 3);
  assert.ok(steps.every((s) => s.flip === false));
  assert.ok(steps[1].say.includes('**King houses**'));
});

test('library: Eyes on f7 has an opener and ten blocks boards, each asking where two pieces aim', () => {
  const L = lib.lessons.find((x) => x.id === 'eyes-on-f7');
  assert.equal(L.moments, undefined, 'a practice lesson: no moments, never in Recognise');
  const steps = resolveSteps(L, lib.positions);
  assert.equal(steps.length, 21);
  const boards = steps.filter((s) => s.blocks);
  assert.equal(boards.length, 10);
  assert.deepEqual(boards.map((b) => b.ask.choices[b.ask.answer]), ['f7', 'Neither', 'f7', 'Neither', 'f7', 'Neither', 'f7', 'f7', 'f2', 'f2']);
  for (const g of boards) {
    assert.deepEqual(g.ask.choices, ['f7', 'f2', 'Neither']);
    const answer = steps[g.index];            // the step after each board
    assert.ok(['roads', 'territory'].includes(answer.view), `board at step ${g.index}: answer view`);
    assert.deepEqual(answer.source, g.source, `board at step ${g.index}: the answer shows the same position`);
    if (answer.view === 'territory') assert.ok(['f7', 'f2'].includes(answer.sq));
  }
  assert.ok(steps.every((s) => s.flip === false && !s.solve && !s.shapesGate));
});

import { buildRound, usableMoments } from '../lessons.js';

const GAME_LESSONS = ['opera-game-lesson', 'legal-mate', 'reti-tartakower', 'lasker-thomas'];

test('library: four game lessons with moments, a Yes and a No board for each moment', () => {
  for (const id of GAME_LESSONS) {
    const L = lib.lessons.find((x) => x.id === id);
    assert.ok(L, id);
    assert.ok(L.game && L.moments.length >= 2 && L.moments.length <= 4, `${id}: game and 2-4 moments`);
    const steps = resolveSteps(L, lib.positions);
    for (const m of L.moments) {
      assert.ok(`${L.game}: ${m.name}`.length <= 32, `${id}/${m.id}: the round answer fits 32 characters`);
      assert.ok(steps.some((s) => s.blocks && s.moment && s.moment.id === m.id && s.ask.answer === 0), `${id}/${m.id}: a Yes board`);
      assert.ok(steps.some((s) => s.blocks && s.moment && s.moment.id === m.id && s.ask.answer === 1), `${id}/${m.id}: a No board`);
    }
    assert.ok(steps.filter((s) => s.ask && !s.blocks).length >= L.moments.length, `${id}: at least one quick question per moment`);
    assert.equal(steps[0].view, 'board', `${id}: starts in Board`);
  }
});

test('library: the three new games are library entries with their players', () => {
  const byId = Object.fromEntries(lib.positions.map((p) => [p.id, p]));
  assert.match(byId['legal-1750'].pgn, /\[White "Légal"\]/);
  assert.match(byId['reti-1910'].pgn, /\[White "Réti"\]\n\[Black "Tartakower"\]/);
  assert.match(byId['lasker-1912'].pgn, /\[White "Edward Lasker"\]\n\[Black "Thomas"\]/);
  for (const id of ['legal-1750', 'reti-1910', 'lasker-1912']) {
    const c = new Chess(); c.loadPgn(byId[id].pgn);
    assert.ok(c.isCheckmate(), `${id} ends in mate`);
    assert.ok(byId[id].tags.includes('game'));
  }
});

test('library: with every lesson finished a round has 8 boards of 3-4 short answers', () => {
  const done = new Set(lib.lessons.map((l) => l.id));
  assert.ok(usableMoments(lib.lessons, lib.positions, done).length >= 8);
  for (const seed of [1, 2, 3, 99]) {
    const r = buildRound(lib.lessons, lib.positions, done, seed);
    assert.equal(r.steps.length, 8);
    for (const s of r.steps) {
      assert.ok(s.ask.choices.length >= 3 && s.ask.choices.length <= 4);
      assert.ok(s.ask.choices.every((c) => c.length <= 32), s.ask.choices.join(' | '));
    }
  }
});
