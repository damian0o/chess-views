import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { useApp } from '../appStore';
import { useT } from '../i18n';

/** The bar on top: a title (and its progress), home, settings, and the player badge to switch players. */
export function TopBar({ title, extra }: { title: string; extra?: ReactNode }) {
  const t = useT();
  const [, navigate] = useLocation();
  const player = useApp((s) => s.player);
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-surface/95 px-3 py-2 backdrop-blur">
      <h1 className="min-w-0 flex-1 truncate text-xl font-black">{title}</h1>
      {extra}
      <Button tone="quiet" aria-label={t('home')} onPress={() => navigate('/home')}>⌂</Button>
      <Button tone="quiet" aria-label={t('settings')} onPress={() => navigate('/settings')}>⚙</Button>
      {player && (
        <Button tone="quiet" aria-label={t('switchPlayer')} onPress={() => navigate('/')} className="px-1">
          <Avatar color={player.avatar} name={player.name} size="md" />
        </Button>
      )}
    </header>
  );
}
