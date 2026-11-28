// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Board } from '../../src/app/board/Board';
import { PlayerProvider } from '../../src/app/i18n';
import { sceneFor } from '@core/scene';
import { OPTIONS } from '@core/look';
import { en } from '@core/i18n/messages/en';
import { pl } from '@core/i18n/messages/pl';
import type { Fen, BoardLook, Square, Step } from '@core/types';

afterEach(cleanup);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' as Fen;
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3' as Fen;
const QE7 = 'r1b1kbnr/ppppqppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3' as Fen;
const scene = (fen: Fen, look: BoardLook) => sceneFor({ id: 's', scene: { position: { kind: 'fen', fen }, look }, explain: { kids: 'x' } } as Step, { answered: false });
const show = (ui: ReactElement) => render(<PlayerProvider player={null}>{ui}</PlayerProvider>);

describe('the drawings', () => {
  test('reach puts each piece count on it: 18 for White at the start (as the POC counts)', () => {
    show(<Board scene={scene(START, { pieces: 'pieces', moves: 'reach' })} />);
    const white = [...document.querySelectorAll('[data-reach]')].filter((e) => /[12]$/.test(e.closest('[data-square]')!.getAttribute('data-square')!));
    expect(white.reduce((n, e) => n + Number(e.getAttribute('data-reach')), 0)).toBe(18);
  });
  test('knight distances from g1 put 1 on f3 and h3', () => {
    show(<Board scene={scene(START, { pieces: 'pieces', moves: 'knight' })} knightSquare={'g1' as Square} />);
    for (const sq of ['f3', 'h3', 'e2']) expect(document.querySelector(`[data-square="${sq}"] [data-dist]`)?.getAttribute('data-dist')).toBe('1');
  });
  test('diamond renders 15 rows', () => {
    show(<Board scene={scene(START, { pieces: 'pieces', diamond: true })} />);
    expect(document.querySelectorAll('[data-diamond-row]')).toHaveLength(15);
    expect(screen.getAllByRole('gridcell')).toHaveLength(64);
  });
  test('roads: a held f7 ring is dotted, a free one solid and thicker', () => {
    show(<Board scene={scene(QE7, { pieces: 'pieces', moves: 'roads' })} />);
    const held = document.querySelector('[data-ring="f7"]')!;
    expect([held.getAttribute('data-style'), held.getAttribute('data-width')]).toEqual(['held', '0.08']);
    cleanup();
    show(<Board scene={scene(SCHOLAR, { pieces: 'pieces', moves: 'roads' })} />);
    const free = document.querySelector('[data-ring="f7"]')!;
    expect([free.getAttribute('data-style'), free.getAttribute('data-width')]).toEqual(['free', '0.18']);
  });
  test('roads: a cross on a pawn-guarded road square', () => {
    show(<Board scene={scene(SCHOLAR, { pieces: 'pieces', moves: 'roads' })} />);
    expect(document.querySelector('[data-guard="e6"]')?.getAttribute('data-by')).toBe('b');
  });
  test('labels and legends for every option in both catalogues; Roads explains the rings and the cross', () => {
    for (const o of Object.values(OPTIONS)) for (const k of [o.label, o.legend].filter(Boolean) as string[]) { expect(k in en, k).toBe(true); expect(k in pl, k).toBe(true); }
    expect(pl.legendRoads).toMatch(/krzyżyk/i);
    expect(en.legendRoads).toMatch(/cross/i);
  });
});
