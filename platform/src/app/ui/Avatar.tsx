import type { Avatar as AvatarColor } from '@core/types';

/** Each avatar colour with an initial colour that reads on it (≥ 3:1 for large bold text). */
export const AVATAR_COLORS: Record<AvatarColor, { bg: string; ink: string }> = {
  violet: { bg: '#8b5cf6', ink: '#ffffff' }, pink: { bg: '#ec4899', ink: '#ffffff' },
  orange: { bg: '#f97316', ink: '#1e1b4b' }, green: { bg: '#22c55e', ink: '#1e1b4b' },
  blue: { bg: '#0ea5e9', ink: '#1e1b4b' }, yellow: { bg: '#eab308', ink: '#1e1b4b' },
};

/** A round coloured badge with the player's initial. */
export function Avatar({ color, name, size = 'lg' }: { color: AvatarColor; name?: string | undefined; size?: 'md' | 'lg' }) {
  const c = AVATAR_COLORS[color];
  return (
    <span aria-hidden="true" style={{ background: c.bg, color: c.ink }}
      className={`inline-flex items-center justify-center rounded-full font-black shadow-card ${size === 'lg' ? 'h-20 w-20 text-3xl' : 'h-10 w-10 text-lg'}`}>
      {(name ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );
}
