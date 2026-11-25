import type { ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { useApp, useAppStore } from '../appStore';
import { useT } from '../i18n';

/** The bar on top: a title (and its progress), home, settings, and the player badge to switch players. */
export function TopBar({ title, extra }: { title: string; extra?: ReactNode }) {
  const t = useT();
  const [location, navigate] = useLocation();
  const search = useSearch();
  const store = useAppStore();
  const player = useApp((s) => s.player);
  const openSettings = () => {
    if (location !== '/settings') store.setState({ returnTo: `${location}${search ? `?${search}` : ''}` });
    navigate('/settings');
  };
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-surface/95 px-3 py-2 backdrop-blur">
      <h1 className="min-w-0 flex-1 truncate text-xl font-black">{title}</h1>
      {extra}
      <Button tone="quiet" aria-label={t('home')} onPress={() => navigate('/home')}>⌂</Button>
      <Button tone="quiet" aria-label={t('settings')} onPress={openSettings}>⚙</Button>
      {player && (
        <Button tone="quiet" aria-label={t('switchPlayer')} onPress={() => navigate('/')} className="px-1">
          <Avatar color={player.avatar} name={player.name} size="md" />
        </Button>
      )}
    </header>
  );
}
