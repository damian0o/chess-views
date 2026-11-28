import { test } from 'vitest';
import assert from './assert';
import { analyse, boardFromFen, pawnGuards, rays, roadRings } from '@core/analysis';
import type { Fen } from '@core/types';

// FENs and expectations from the proof of concept's tests/browser/roads_check.py.
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3' as Fen;
const QE7 = 'r1b1kbnr/ppppqppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3' as Fen;
const D4_W = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2BPP3/8/PPP2PPP/RNB1K1NR w KQkq - 3 3' as Fen;
const D4_B = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2BPP3/8/PPP2PPP/RNB1K1NR b KQkq - 3 3' as Fen;

const ringsOf = (fen: Fen) => new Map(roadRings(boardFromFen(fen)).map((r) => [r.square as string, r]));

test('Scholar threat: f7 is free, two attackers, the king cannot take back, width 0.18', () => {
  const f7 = ringsOf(SCHOLAR).get('f7');
  assert.ok(f7);
  assert.equal(f7.color, 'w');
  assert.deepEqual([...f7.attackers].sort(), ['c4', 'h5']);
  assert.equal(f7.defenders.length, 0);
  assert.equal(f7.style, 'free');
  assert.equal(f7.width.toFixed(2), '0.18');
  assert.equal(f7.balance, 2);
});

test('Scholar threat: e5 has one attacker, is held, thin (0.08)', () => {
  const e5 = ringsOf(SCHOLAR).get('e5');
  assert.ok(e5);
  assert.equal(e5.attackers.length, 1);
  assert.ok(e5.defenders.length >= 1);
  assert.equal(e5.style, 'held');
  assert.equal(e5.width.toFixed(2), '0.08');
});

test('one ring per piece attacked', () => {
  const list = roadRings(boardFromFen(SCHOLAR));
  assert.equal(new Set(list.map((r) => r.square)).size, list.length);
  assert.ok(list.length >= 3);
});

test('...Qe7: f7 is held, two attackers and two real defenders (queen, king last), width 0.08', () => {
  const f7 = ringsOf(QE7).get('f7');
  assert.ok(f7);
  assert.equal(f7.attackers.length, 2);
  assert.deepEqual([...f7.defenders].sort(), ['e7', 'e8']);
  assert.equal(f7.style, 'held');
  assert.equal(f7.width.toFixed(2), '0.08');
});

test('d4 position: e5 contested, f7 free and thick, they look different', () => {
  const r = ringsOf(D4_W);
  const e5 = r.get('e5'), f7 = r.get('f7');
  assert.ok(e5 && f7);
  assert.equal(e5.style, 'contested');
  assert.equal(f7.style, 'free');
  assert.notEqual(`${e5.style} ${e5.width.toFixed(2)}`, `${f7.style} ${f7.width.toFixed(2)}`);
});

test('d4, hit by a knight and a pawn, gets a black ring: free, two attackers', () => {
  const d4 = ringsOf(D4_B).get('d4');
  assert.ok(d4);
  assert.equal(d4.color, 'b');
  assert.equal(d4.style, 'free');
  assert.deepEqual([...d4.attackers].sort(), ['c6', 'e5']);
});

test('pawn-guarded road squares, by the guarding pawn colour, respecting pins', () => {
  const board = boardFromFen(SCHOLAR);
  const marks = pawnGuards(board, rays(board)).map((g) => `${g.square}:${g.by}`).sort();
  assert.deepEqual(marks, ['a3:w', 'a6:b', 'e6:b', 'g6:b', 'h6:b']);
  const e6 = pawnGuards(board, rays(board)).find((g) => g.square === 'e6');
  assert.deepEqual(e6?.pawns, ['d7']);   // f7 is pinned to its king by the queen on h5
});

test('analyse roads fills rings and pawn guards', () => {
  const d = analyse(SCHOLAR, { pieces: 'pieces', moves: 'roads' });
  assert.ok(d.roads);
  assert.equal(d.roads.rings.find((r) => r.square === 'f7')?.style, 'free');
  assert.equal(d.roads.pawnGuards.length, 5);
});
