import { describe, expect, test } from 'vitest';
import { t, missingKeys, makeTranslator } from '@core/i18n/index';
import { en } from '@core/i18n/messages/en';
import { pl } from '@core/i18n/messages/pl';
import { textFor } from '@core/audience';

describe('t', () => {
  test('Polish plurals: one, few, many', () => {
    expect(t('pl', 'moves', { count: 1 })).toBe('1 ruch');
    expect(t('pl', 'moves', { count: 2 })).toBe('2 ruchy');
    expect(t('pl', 'moves', { count: 5 })).toBe('5 ruchów');
    expect(t('pl', 'moves', { count: 22 })).toBe('22 ruchy');
    expect(t('pl', 'moves', { count: 12 })).toBe('12 ruchów');
  });
  test('English plurals', () => {
    expect(t('en', 'moves', { count: 1 })).toBe('1 move');
    expect(t('en', 'moves', { count: 3 })).toBe('3 moves');
  });
  test('placeholders', () => {
    expect(t('en', 'nOfTotal', { n: 3, total: 25 })).toBe('3 of 25');
    expect(t('pl', 'nOfTotal', { n: 3, total: 25 })).toBe('3 z 25');
  });
  test('a key missing in Polish falls back to English', () => {
    const { tryAgain: _drop, ...partial } = pl;
    const tr = makeTranslator({ en, pl: partial });
    expect(tr('pl', 'tryAgain')).toBe(en.tryAgain);
  });
  test('the shipped Polish catalogue has every key', () => {
    expect(missingKeys('pl')).toEqual([]);
  });
});

describe('textFor', () => {
  test('falls back to the next younger text', () => {
    expect(textFor({ kids: 'k' }, 'adults')).toBe('k');
    expect(textFor({ kids: 'k', teens: 't' }, 'adults')).toBe('t');
    expect(textFor({ kids: 'k', adults: 'a' }, 'teens')).toBe('k');
    expect(textFor({ kids: 'k', teens: 't', adults: 'a' }, 'kids')).toBe('k');
  });
});
