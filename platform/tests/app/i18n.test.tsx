// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PlayerProvider, useT, useText } from '../../src/app/i18n';
import { defaultProfile } from '@core/storage/index';
import { missingKeys } from '@core/i18n/index';
import { en } from '@core/i18n/messages/en';
import { pl } from '@core/i18n/messages/pl';
import type { AgedText, Profile } from '@core/types';

afterEach(cleanup);
function Probe({ text }: { text?: AgedText }) {
  const t = useT(); const tx = useText();
  return <p data-testid="out">{t('whoPlays')}|{text ? tx(text) : ''}</p>;
}
const show = (p: Profile | null, text?: AgedText) => { render(<PlayerProvider player={p}><Probe {...(text ? { text } : {})} /></PlayerProvider>); return screen.getByTestId('out').textContent; };

describe('app i18n', () => {
  test("useT follows the player's locale, Polish without a player", () => {
    expect(show(null)).toBe('Kto gra?|');
    cleanup();
    expect(show(defaultProfile({ locale: 'en' }))).toBe("Who's playing?|");
  });
  test('useText picks the age text and localises moves', () => {
    expect(show(defaultProfile({ age: 'adults', locale: 'pl' }), { kids: 'Hetman: Qxf7', adults: 'Qxf7' })).toBe('Kto gra?|Hxf7');
    cleanup();
    expect(show(defaultProfile({ age: 'kids', locale: 'en' }), { kids: 'Queen: Qxf7', adults: 'Qxf7' })).toBe("Who's playing?|Queen: Qxf7");
  });
  test('both catalogues are complete', () => {
    expect(missingKeys('pl')).toEqual([]);
    expect(missingKeys('en')).toEqual([]);
    const keys = ['addPlayer', 'playerName', 'ageBand', 'groupPattern', 'groupStrategy', 'groupGame', 'recogniseLocked', 'recogniseAbout', 'stepOf', 'view', 'legend', 'legendBoard', 'legendTerritory', 'legendRoads', 'legendKings', 'legendShapes', 'pieceArt', 'tapASquare', 'finish', 'exportProfile', 'importProfile', 'removePlayer'];
    for (const k of keys) { expect(k in en, k).toBe(true); expect(k in pl, k).toBe(true); }
  });
});
