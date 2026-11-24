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
