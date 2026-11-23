import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boardFromFen, validatePlacement } from '../analysis.js';

const VIEWS = ['board', 'territory', 'reach', 'roads', 'kings', 'diamond', 'shapes', 'knight'];
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
