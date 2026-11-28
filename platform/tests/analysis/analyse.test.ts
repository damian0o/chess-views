import { test } from 'vitest';
import assert from './assert';
import { analyse, START_FEN } from '@core/analysis';

test('analyse: computes only the requested layers', () => {
  const data = analyse(START_FEN, { pieces: 'pieces', moves: 'roads' });
  assert.ok(data.roads);
  assert.ok(!('territory' in data));
});
