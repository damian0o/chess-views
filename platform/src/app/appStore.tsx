import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from 'zustand';
import type { AppState, AppStore } from './store';
import { PlayerProvider } from './i18n';

const StoreContext = createContext<AppStore | null>(null);

/** Gives the screens the app store, and the current player to the text hooks. */
export function AppStoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  const player = useStore(store, (s) => s.player);
  return <StoreContext.Provider value={store}><PlayerProvider player={player}>{children}</PlayerProvider></StoreContext.Provider>;
}

export function useApp<T>(select: (s: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useApp outside AppStoreProvider');
  return useStore(store, select);
}
