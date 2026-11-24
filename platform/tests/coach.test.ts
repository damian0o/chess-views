import { describe, expect, test } from 'vitest';
import { parseInfo, analysisFromLines } from '@core/engine/uci';
import { pawns, toWhite, grade, evalWords, evalNumber, barPercent, arrowMoves, type Score } from '@core/engine/coach';
import { t } from '@core/i18n/index';

const label = (best: Score, guess: Score) => { const g = grade(best, guess); return t('en', g.label, g.params); };
const line = (uci: string, score: Score) => ({ move: { uci, from: uci.slice(0, 2), to: uci.slice(2, 4) }, score, pv: [uci] });

describe('uci', () => {
  test('parseInfo reads depth, multipv, score and pv; ignores other lines', () => {
    expect(parseInfo('info depth 10 seldepth 14 multipv 2 score cp -35 nodes 1 nps 1 time 1 pv e7e5 g1f3 b8c6'))
      .toEqual({ depth: 10, multipv: 2, score: { cp: -35 }, pv: ['e7e5', 'g1f3', 'b8c6'] });
    expect(parseInfo('info depth 16 seldepth 8 multipv 1 score mate 4 nodes 1 pv d5d8')).toEqual({ depth: 16, multipv: 1, score: { mate: 4 }, pv: ['d5d8'] });
    expect(parseInfo('info depth 3 currmove e2e4 currmovenumber 1')).toBeNull();
    expect(parseInfo('bestmove e2e4 ponder e7e5')).toBeNull();
  });
  test('analysisFromLines keeps the deepest line per multipv, in multipv order', () => {
    const a = analysisFromLines(['info depth 9 multipv 1 score cp 20 pv e2e4', 'info depth 9 multipv 2 score cp 10 pv d2d4',
      'info depth 10 multipv 2 score cp 12 pv d2d4 d7d5', 'info depth 10 multipv 1 score cp 25 pv e2e4 e7e5', 'bestmove e2e4']);
    expect(a.depth).toBe(10);
    expect(a.lines.map((l) => [l.move.uci, l.score])).toEqual([['e2e4', { cp: 25 }], ['d2d4', { cp: 12 }]]);
    expect(a.lines[0]?.move).toEqual({ uci: 'e2e4', from: 'e2', to: 'e4' });
  });
});

describe('coach', () => {
  test('pawns and toWhite', () => {
    expect(pawns({ cp: 60 })).toBe(0.6); expect(pawns({ mate: 3 })).toBe(97); expect(pawns({ mate: -2 })).toBe(-98);
    expect(toWhite({ cp: 60 }, 'b')).toEqual({ cp: -60 }); expect(toWhite({ mate: 2 }, 'b')).toEqual({ mate: -2 }); expect(toWhite({ cp: 60 }, 'w')).toEqual({ cp: 60 });
  });
  test('grade follows the loss table', () => {
    expect(grade({ cp: 50 }, { cp: 50 })).toEqual({ label: 'gradeBest', params: {}, loss: 0 });
    expect(label({ cp: 50 }, { cp: 35 })).toBe('Just as good');
    expect(label({ cp: 50 }, { cp: 30 })).toBe('Just as good');
    expect(label({ cp: 50 }, { cp: 10 })).toBe('Good');
    expect(label({ cp: 50 }, { cp: -60 })).toBe('Okay, but there was better');
    expect(grade({ cp: 50 }, { cp: -110 }).loss).toBe(1.6);
    expect(label({ cp: 50 }, { cp: -110 })).toBe('Oops, that loses something');
  });
  test('grade: mates override the table and withhold the loss', () => {
    expect(label({ mate: 2 }, { cp: 300 })).toBe('You missed a mate in 2');
    expect(label({ cp: 20 }, { mate: -3 })).toBe('Oops, that allows mate in 3');
    expect(label({ mate: 2 }, { mate: 4 })).toBe('Best!');
    expect(grade({ mate: 2 }, { cp: 300 }).loss).toBeNull(); expect(grade({ cp: 20 }, { mate: -3 }).loss).toBeNull();
    expect(grade({ cp: 50 }, { cp: 10 }).loss).toBe(0.4);
  });
  test('grade with Black to move uses the mover view', () => {
    expect(label({ cp: -20 }, { cp: -250 })).toBe('Oops, that loses something');
  });
  test('evalWords for kids in English match the proof of concept', () => {
    const w = (s: Score) => evalWords(s, 'kids', 'en');
    expect(w({ cp: 0 })).toBe('Equal'); expect(w({ cp: 39 })).toBe('Equal'); expect(w({ cp: 40 })).toBe('White is a little better');
    expect(w({ cp: -120 })).toBe('Black is better'); expect(w({ cp: 300 })).toBe('White is winning'); expect(w({ mate: -2 })).toBe('Black mates in 2');
  });
  test('evalWords: Polish words for kids, the number for adults', () => {
    expect(evalWords({ cp: 300 }, 'kids', 'pl')).toBe('Białe wygrywają');
    expect(evalWords({ cp: -120 }, 'teens', 'pl')).toBe('Czarne stoją lepiej');
    expect(evalWords({ mate: 3 }, 'kids', 'pl')).toBe('Białe dają mata w 3 ruchach');
    expect(evalWords({ cp: 130 }, 'adults', 'pl')).toBe('+1.3');
    expect(evalWords({ mate: -2 }, 'adults', 'en')).toBe('-#2');
  });
  test('evalNumber and barPercent', () => {
    expect(evalNumber({ cp: 64 })).toBe('+0.6'); expect(evalNumber({ cp: -120 })).toBe('-1.2'); expect(evalNumber({ cp: 0 })).toBe('0.0');
    expect(evalNumber({ mate: 3 })).toBe('#3'); expect(evalNumber({ mate: -2 })).toBe('-#2');
    expect(barPercent({ cp: 0 })).toBe(50); expect(barPercent({ cp: 400 })).toBe(88.1); expect(barPercent({ mate: 1 })).toBe(100); expect(barPercent({ mate: -1 })).toBe(0);
  });
  test('arrowMoves keeps up to three moves within half a pawn of the best', () => {
    const ls = [line('a1a2', { cp: 50 }), line('b1b2', { cp: 10 }), line('c1c2', { cp: 0 }), line('d1d2', { cp: -5 }), line('e1e2', { cp: -100 })];
    expect(arrowMoves(ls).map((l) => l.move.uci)).toEqual(['a1a2', 'b1b2', 'c1c2']);
    expect(arrowMoves([line('a1a2', { mate: 2 }), line('b1b2', { mate: 3 })]).map((l) => l.move.uci)).toEqual(['a1a2']);
    expect(arrowMoves([])).toEqual([]);
  });
});
