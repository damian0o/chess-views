/** Turning engine scores into grades, words for an age, a number, a bar and arrows. No engine here. */
import type { AgeBand, Color, Locale } from '../types';
import { t, type MessageKey, type Params } from '../i18n/index';
import type { AnalysisLine, Score } from './types';

export type { Score };

const isMate = (s: Score): s is { mate: number } => 'mate' in s;
const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** A score as pawns for ordering: cp / 100, or ±(100 − N) for a mate in N. */
export function pawns(s: Score): number {
  return isMate(s) ? Math.sign(s.mate) * (100 - Math.abs(s.mate)) : s.cp / 100;
}

/** Engine scores are from the side to move; flip them to White's point of view. */
export function toWhite(s: Score, turn: Color): Score {
  if (turn !== 'b') return { ...s };
  return isMate(s) ? { mate: -s.mate } : { cp: -s.cp };
}

/** How a guess compares with the best move (both from the mover's view, same search). With a mate involved the loss is withheld. */
export function grade(best: Score, guess: Score): { label: MessageKey; params: Params; loss: number | null } {
  const loss = round2(pawns(best) - pawns(guess));
  const bestMates = isMate(best) && best.mate > 0;
  if (bestMates && isMate(guess) && guess.mate > 0) return { label: 'gradeBest', params: {}, loss: null };
  if (bestMates) return { label: 'gradeMissedMate', params: { n: (best as { mate: number }).mate }, loss: null };
  if (isMate(guess) && guess.mate < 0) return { label: 'gradeAllowsMate', params: { n: Math.abs(guess.mate) }, loss: null };
  if (loss <= 0) return { label: 'gradeBest', params: {}, loss: 0 };
  if (loss <= 0.2) return { label: 'gradeJustAsGood', params: {}, loss };
  if (loss <= 0.5) return { label: 'gradeGood', params: {}, loss };
  if (loss <= 1.5) return { label: 'gradeOkay', params: {}, loss };
  return { label: 'gradeLoses', params: {}, loss };
}

/** The number: +0.6, -1.2, 0.0, #3, -#2 (White's view). */
export function evalNumber(white: Score): string {
  if (isMate(white) && white.mate !== 0) return `${white.mate < 0 ? '-' : ''}#${Math.abs(white.mate)}`;
  const r = round1((isMate(white) ? 0 : white.cp) / 100);
  return r === 0 ? '0.0' : `${r > 0 ? '+' : '-'}${Math.abs(r).toFixed(1)}`;
}

/** Words for kids and teens; adults get the number. */
export function evalWords(white: Score, age: AgeBand, locale: Locale): string {
  if (age === 'adults') return evalNumber(white);
  if (isMate(white) && white.mate !== 0) {
    return t(locale, white.mate > 0 ? 'evalWhiteMates' : 'evalBlackMates', { count: Math.abs(white.mate) });
  }
  const s = pawns(white);
  const a = Math.abs(s);
  const w = s > 0;
  if (a >= 3) return t(locale, w ? 'evalWhiteWinning' : 'evalBlackWinning');
  if (a >= 1.2) return t(locale, w ? 'evalWhiteBetter' : 'evalBlackBetter');
  if (a >= 0.4) return t(locale, w ? 'evalWhiteLittleBetter' : 'evalBlackLittleBetter');
  return t(locale, 'evalEqual');
}

/** White's share of the bar, 0..100. */
export function barPercent(white: Score): number {
  if (isMate(white) && white.mate !== 0) return white.mate > 0 ? 100 : 0;
  return round1(50 + 50 * Math.tanh(pawns(white) / 4));
}

/** Up to three lines within half a pawn of the best (lines sorted best first). */
export function arrowMoves(lines: AnalysisLine[]): AnalysisLine[] {
  if (!lines.length) return [];
  const top = pawns(lines[0]!.score);
  return lines.filter((l) => top - pawns(l.score) <= 0.5).slice(0, 3);
}
