import type { Locale } from '../types';

/** Piece letters per locale, in the order K Q R B N. Stored SAN is always English. */
const LETTERS: Record<Locale, Record<string, string>> = {
  en: { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N' },
  pl: { K: 'K', Q: 'H', R: 'W', B: 'G', N: 'S' },   // król, hetman, wieża, goniec, skoczek
};

/** A move in standard SAN shown with the locale's piece letters: Nf3 → Sf3, exd8=Q+ → exd8=H+ in Polish. */
export function formatSan(san: string, locale: Locale): string {
  const map = LETTERS[locale];
  if (locale === 'en') return san;
  return san
    .replace(/^[KQRBN]/, (p) => map[p] ?? p)          // the moving piece
    .replace(/=([QRBN])/, (_, p: string) => `=${map[p] ?? p}`);   // a promotion
}

/**
 * Every move written in standard SAN inside a sentence, shown with the locale's piece letters:
 * "Qe7, Qf6 i Nh6" → "He7, Hf6 i Sh6" in Polish. A piece letter counts only when it starts a word and is
 * followed by a square (optionally a file or rank and "x"), so words like "Na" or "Bierki" stay as they are.
 */
export function localizeMoves(text: string, locale: Locale): string {
  if (locale === 'en') return text;
  const map = LETTERS[locale];
  return text
    .replace(/(?<![A-Za-z0-9])([KQRBN])(?=[a-h]?[1-8]?x?[a-h][1-8])/g, (p) => map[p] ?? p)
    .replace(/(?<=[a-h][18])=([QRBN])/g, (_m, p: string) => `=${map[p] ?? p}`);
}
