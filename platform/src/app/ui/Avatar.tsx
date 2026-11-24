import type { Avatar as AvatarColor } from '@core/types';

const BG: Record<AvatarColor, string> = {
  violet: 'bg-[#8b5cf6]', orange: 'bg-[#f97316]', green: 'bg-[#22c55e]', blue: 'bg-[#0ea5e9]', pink: 'bg-[#ec4899]', yellow: 'bg-[#eab308]',
};

/** A round coloured badge with the player's initial. */
export function Avatar({ color, name, size = 'lg' }: { color: AvatarColor; name?: string | undefined; size?: 'md' | 'lg' }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center rounded-full font-black text-white shadow-card ${BG[color]} ${size === 'lg' ? 'h-20 w-20 text-3xl' : 'h-10 w-10 text-lg'}`}>
      {(name ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );
}
