import { test } from 'vitest';
import assert from './assert';
import { analyse, batteryRays, boardFromFen, roadRings } from '@core/analysis';
import type { Fen } from '@core/types';

// 1. e4 e5 2. Bc4 Nc6 3. c3 Nf6 4. Qb3 — eyes-on-f7 step s11: the queen stands behind the bishop.
const QB3 = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/1QP5/PP1P1PPP/RNB1K1NR b KQkq - 2 4' as Fen;
const ringsOf = (fen: Fen) => new Map(roadRings(boardFromFen(fen)).map((r) => [r.square as string, r]));

test('a queen behind its own bishop on a diagonal has a battery road through it to f7', () => {
  const b = batteryRays(boardFromFen(QB3)).filter((r) => r.from === 'b3');
  assert.equal(b.length, 1);
  assert.deepEqual(b[0]!.through, ['c4']);
  assert.deepEqual(b[0]!.squares, ['d5', 'e6', 'f7']);
  assert.equal(b[0]!.end, 'enemy');
  assert.equal(b[0]!.hit, 'f7');
});

test('f7 counts both the bishop and the queen behind it; the king cannot take back, so it is free', () => {
  const f7 = ringsOf(QB3).get('f7');
  assert.ok(f7);
  assert.deepEqual([...f7.attackers].sort(), ['b3', 'c4']);
  assert.equal(f7.defenders.length, 0);
  assert.equal(f7.style, 'free');
  assert.equal(f7.balance, 2);
});

test('doubled rooks: the back rook reaches through the front one, and both count on the target', () => {
  const fen = '3rk3/8/8/8/8/8/3R4/3RK3 w - - 0 1' as Fen;
  const b = batteryRays(boardFromFen(fen));
  assert.equal(b.length, 1);
  assert.equal(b[0]!.from, 'd1');
  assert.deepEqual(b[0]!.through, ['d2']);
  assert.equal(b[0]!.hit, 'd8');
  assert.deepEqual([...ringsOf(fen).get('d8')!.attackers].sort(), ['d1', 'd2']);
});

test('no battery through a piece that does not move that way (knight in front, bishop on a file)', () => {
  assert.deepEqual(batteryRays(boardFromFen('4k3/8/8/8/8/8/3N4/3QK3 w - - 0 1' as Fen)), []);
  assert.deepEqual(batteryRays(boardFromFen('4k3/3p4/8/8/3B4/8/8/3RK3 w - - 0 1' as Fen)), []);
  assert.deepEqual(ringsOf('4k3/3p4/8/8/3B4/8/8/3RK3 w - - 0 1' as Fen).get('d7'), undefined);
});

test('a defender behind a defender counts too: a rook behind a rook guarding a piece', () => {
  // The white rook e1 hits the black knight e5; the black rooks e7 and e8 (one behind the other) defend it.
  const fen = '4r1k1/4r3/8/4n3/8/8/8/4R1K1 w - - 0 1' as Fen;
  const e5 = ringsOf(fen).get('e5')!;
  assert.deepEqual(e5.attackers, ['e1']);
  assert.deepEqual([...e5.defenders].sort(), ['e7', 'e8']);
  assert.equal(e5.style, 'held');
});

test('a battery road that runs only into empty squares or its own camp is not drawn', () => {
  // Queen d1 behind rook d2: the d-file is empty up to the edge.
  assert.deepEqual(batteryRays(boardFromFen('4k3/8/8/8/8/8/3R4/3QK3 w - - 0 1' as Fen)), []);
  // In the step's position, only the queen through the bishop to f7 is left.
  assert.deepEqual(batteryRays(boardFromFen(QB3)).map((r) => `${r.from}>${r.hit}`), ['b3>f7']);
});

test('the roads layer carries the battery roads', () => {
  const data = analyse(QB3, ['pieces', 'roads']);
  assert.ok(data.roads?.batteries.some((r) => r.from === 'b3' && r.hit === 'f7'));
});
