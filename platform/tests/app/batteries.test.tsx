// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Board } from '../../src/app/board/Board';
import { sceneFor } from '@core/scene';
import type { Fen, Step } from '@core/types';

afterEach(cleanup);
const QB3 = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/1QP5/PP1P1PPP/RNB1K1NR b KQkq - 2 4' as Fen;
const roads = (fen: Fen) => sceneFor({ id: 's', scene: { position: { kind: 'fen', fen }, look: { pieces: 'pieces', moves: 'roads' } }, explain: { kids: 'x' } } as Step, { answered: false });

test('the roads view draws the queen behind the bishop as a dashed road from c4 to f7', () => {
  render(<Board scene={roads(QB3)} />);
  const line = document.querySelector('[data-battery="b3"]');
  expect(line).not.toBeNull();
  expect(line!.getAttribute('stroke-dasharray')).toBeTruthy();
  expect(line!.getAttribute('data-through')).toBe('c4');
  expect(line!.getAttribute('data-to')).toBe('f7');
  // It starts at the queen (b3 = column 1.5, row 5.5) and runs beside the bishop's road, not on top of it.
  const n = (a: string) => Number(line!.getAttribute(a));
  expect(Math.hypot(n('x1') - 1.5, n('y1') - 5.5)).toBeLessThan(0.25);
  expect(Math.hypot(n('x1') - 1.5, n('y1') - 5.5)).toBeGreaterThan(0.1);
  expect(document.querySelector('[data-ring="f7"]')?.getAttribute('data-attackers')).toBe('2');
  expect(document.querySelector('[data-ring="f7"]')?.getAttribute('data-style')).toBe('free');
});
