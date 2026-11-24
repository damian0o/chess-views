import { createContext, useCallback, useContext, type ReactNode } from 'react';
import type { AgedText, Profile } from '@core/types';
import { t, type MessageKey, type Params } from '@core/i18n/index';
import { textFor } from '@core/audience';
import { localizeMoves } from '@core/chess/san';

const PlayerContext = createContext<Profile | null>(null);

/** The current player for everything below: their language and age choose the words. */
export function PlayerProvider({ player, children }: { player: Profile | null; children: ReactNode }) {
  return <PlayerContext.Provider value={player}>{children}</PlayerContext.Provider>;
}

export const usePlayer = () => useContext(PlayerContext);

/** Interface messages in the player's language (Polish without a player). */
export function useT(): (key: MessageKey, params?: Params) => string {
  const locale = usePlayer()?.locale ?? 'pl';
  return useCallback((key, params) => t(locale, key, params), [locale]);
}

/** Lesson text for the player's age, with moves shown in the player's letters. */
export function useText(): (text: AgedText) => string {
  const p = usePlayer();
  const age = p?.age ?? 'kids', locale = p?.locale ?? 'pl';
  return useCallback((text) => localizeMoves(textFor(text, age), locale), [age, locale]);
}
