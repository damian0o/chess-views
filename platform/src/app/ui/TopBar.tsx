import type { ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { useApp, useAppStore } from '../appStore';
import { useT } from '../i18n';

/** The bar on top: ◀ back one level (Start by default, none on home), a title (and its progress), settings, and the player badge. */
export function TopBar({ title, extra, up }: { title: string; extra?: ReactNode; up?: { to: string; label: string } | undefined }) {
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
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 bg-surface/95 px-3 py-2 backdrop-blur">
      {/* Back up one level, named after where it goes, first in the bar where a child looks for it; none on home. */}
      {location !== '/home' && (
        <Button tone="quiet" aria-label={(up ?? { label: t('home') }).label} onPress={() => navigate(up?.to ?? '/home')} className="shrink-0 px-3">
          <span aria-hidden="true">◀</span> {(up ?? { label: t('home') }).label}
        </Button>
      )}
      {/* On a phone a screen's title gets its own line under the buttons, so it is never cut; home keeps one row. */}
      <h1 className={`min-w-0 break-words text-xl font-black leading-tight ${location === '/home' ? 'flex-1 truncate' : 'order-last basis-full sm:order-none sm:basis-auto sm:flex-1 sm:truncate'}`}>{title}</h1>
      {location !== '/home' && <span className="flex-1 sm:hidden" aria-hidden="true" />}
      {extra}
      <Button tone="quiet" aria-label={t('settings')} onPress={openSettings}>⚙</Button>
      {player && (
        <Button tone="quiet" aria-label={t('switchPlayer')} onPress={() => navigate('/')} className="px-1">
          <Avatar color={player.avatar} name={player.name} size="md" />
        </Button>
      )}
    </header>
  );
}
