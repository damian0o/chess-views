import { useEffect, useState } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { useStore } from 'zustand';
import type { StorageLike } from '@core/storage/index';
import { createAppStore } from './store';
import { AppStoreProvider, useApp } from './appStore';
import { ThemeRoot } from './theme/ThemeRoot';
import { LESSONS, LIBRARY, POC_STEP_IDS } from './content';
import { Players } from './screens/Players';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
import { LessonScreen, RecogniseScreen } from './screens/Lesson';
import { FreeBoard } from './screens/FreeBoard';
import { Library } from './screens/Library';
import { Print } from './screens/Print';
import { Toast } from './ui/Toast';
import { useT } from './i18n';
import { Button } from './ui/Button';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { EngineProvider } from './engine';

function NotFound() {
  const t = useT(); const [, navigate] = useLocation();
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6"><p className="text-xl font-black">{t('notFound')}</p><Button onPress={() => navigate('/')}>{t('home')}</Button></main>;
}

/** The screens by route. Without a player, "Kto gra?" comes first and then continues to the address asked for. */
export function AppRoutes() {
  const player = useApp((s) => s.player);
  const [location] = useLocation();
  if (!player && location !== '/') return <><Players next={location} /><Toast /></>;
  return (
    <>
      <Switch>
        <Route path="/"><Players /></Route>
        <Route path="/home"><Home /></Route>
        <Route path="/settings"><Settings /></Route>
        <Route path="/board"><FreeBoard /></Route>
        <Route path="/library"><Library /></Route>
        <Route path="/print"><Print /></Route>
        <Route path="/lesson/:id/:step?">{(p) => <LessonScreen id={p.id} stepId={p.step} />}</Route>
        <Route path="/recognise/:seed/:n">{(p) => <RecogniseScreen seed={Number(p.seed)} n={Number(p.n)} />}</Route>
        <Route><NotFound /></Route>
      </Switch>
      <Toast />
    </>
  );
}

export interface AppProps { storage?: StorageLike | undefined }

export default function App({ storage }: AppProps) {
  const [store] = useState(() => createAppStore({ storage, lessons: LESSONS, library: LIBRARY, pocStepIds: POC_STEP_IDS }));
  const player = useStore(store, (s) => s.player);
  const [ready, setReady] = useState(false);
  useEffect(() => { void store.getState().restore().then(() => setReady(true)); }, [store]);
  if (!ready) return null;
  return (
    <AppStoreProvider store={store}>
      <ThemeRoot profile={player}>
        <EngineProvider><Router hook={useHashLocation}><ErrorBoundary><AppRoutes /></ErrorBoundary></Router></EngineProvider>
      </ThemeRoot>
    </AppStoreProvider>
  );
}
