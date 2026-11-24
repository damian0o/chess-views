// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Board } from '../../src/app/board/Board';
import { sceneFor } from '@core/scene';
import type { Fen, LayerKind, Step } from '@core/types';

afterEach(cleanup);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3' as Fen;
const scene = (fen: Fen, layers: LayerKind[]) => sceneFor({ id: 's', scene: { position: { kind: 'fen', fen }, base: 'board', layers }, explain: { kids: 'x' } } as Step, { answered: false });
const cell = (sq: string) => screen.getByRole('gridcell', { name: new RegExp(`^${sq}\\b`) });

describe('Board', () => {
  test('start position draws 32 piece images and 64 cells', () => {
    render(<Board scene={scene(START, ['pieces'])} />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(64);
    expect(screen.getAllByRole('img', { name: /biał|czarn/ })).toHaveLength(32);
  });
  test('a blocks scene draws blocks and no piece image', () => {
    render(<Board scene={scene(START, ['shapes'])} />);
    expect(screen.queryAllByRole('img', { name: /biał|czarn/ })).toHaveLength(0);
    expect(document.querySelectorAll('[data-block]')).toHaveLength(32);
    expect(within(cell('d1')).getByTestId('block').dataset.size).toBe('big');
    expect(within(cell('e2')).getByTestId('block').dataset.size).toBe('small');
  });
  test('the territory layer tints f7 for White in the Scholar threat', () => {
    render(<Board scene={scene(SCHOLAR, ['pieces', 'territory'])} />);
    expect(cell('f7').dataset.owner).toBe('w');
  });
  test('the roads layer draws a ring on f7 with the attacker count', () => {
    render(<Board scene={scene(SCHOLAR, ['pieces', 'roads'])} />);
    const ring = document.querySelector('[data-ring="f7"]') as HTMLElement | null;
    expect(ring?.dataset.attackers).toBe('2');
  });
  test('the king houses layer outlines the squares around each king', () => {
    render(<Board scene={scene(START, ['pieces', 'kings'])} />);
    expect(cell('f2').dataset.house).toBe('w');
    expect(cell('d8').dataset.house).toBe('b');
  });
  test('flip puts h1 at the top-left', () => {
    render(<Board scene={scene(START, ['pieces'])} flip />);
    expect(screen.getAllByRole('gridcell')[0]!.getAttribute('aria-label')).toMatch(/^h1/);
  });
  test('focus squares carry a ring', () => {
    const s = { ...scene(SCHOLAR, ['pieces']), focus: ['f7' as never] };
    render(<Board scene={s} />);
    expect(cell('f7').dataset.focus).toBe('true');
  });
  test('tapping a cell calls onSquare with its square', () => {
    const on = vi.fn();
    render(<Board scene={scene(START, ['pieces'])} onSquare={on} />);
    fireEvent.click(cell('e4'));
    expect(on).toHaveBeenCalledWith('e4');
  });
  test('keyboard: Enter on a focused cell calls onSquare', () => {
    const on = vi.fn();
    render(<Board scene={scene(START, ['pieces'])} onSquare={on} />);
    fireEvent.keyDown(cell('g1'), { key: 'Enter' });
    expect(on).toHaveBeenCalledWith('g1');
  });
});
