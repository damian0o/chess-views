import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import type { Profile } from '@core/types';

const QUERY = '(prefers-color-scheme: dark)';
const systemDark = () => typeof matchMedia === 'function' && matchMedia(QUERY).matches;

/** Puts the player's theme on <html>: data-family (kids/teens/adults) and data-mode (light/dark, "system" followed live). */
export function ThemeRoot({ profile, children }: { profile: Profile | null; children: ReactNode }) {
  const family = profile?.theme.family ?? 'crayons';
  const wanted = profile?.theme.mode ?? 'system';
  const [dark, setDark] = useState(systemDark);
  useEffect(() => {
    if (wanted !== 'system' || typeof matchMedia !== 'function') return;
    const mq = matchMedia(QUERY);
    const on = (e: { matches: boolean }) => setDark(e.matches);
    setDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [wanted]);
  const mode = wanted === 'system' ? (dark ? 'dark' : 'light') : wanted;
  const lang = profile?.locale ?? 'pl';
  useLayoutEffect(() => {   // before paint, so a player's theme replaces the default without a flash
    document.documentElement.dataset.family = family;
    document.documentElement.dataset.mode = mode;
    document.documentElement.lang = lang;
  }, [family, mode, lang]);
  return <>{children}</>;
}
