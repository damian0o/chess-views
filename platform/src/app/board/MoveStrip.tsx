import { useEffect, useRef } from 'react';
import type { Move } from '@core/chess/rules';
import { formatSan } from '@core/chess/san';
import { usePlayer, useT } from '../i18n';

/** The game's moves as numbered buttons; the current one is marked; tapping a move goes there. */
export function MoveStrip({ moves, ply, onPly, white, black, hideFromPly }: { moves: Move[]; ply: number; onPly: (ply: number) => void; white?: string | undefined; black?: string | undefined; hideFromPly?: number | undefined }) {
  const t = useT();
  const locale = usePlayer()?.locale ?? 'pl';
  const nav = useRef<HTMLElement>(null);
  // Keep the current move in view in a long game.
  useEffect(() => { nav.current?.querySelector('[aria-current]')?.scrollIntoView?.({ block: 'nearest' }); }, [ply]);
  if (!moves.length) return null;
  return (
    <div className="flex flex-col gap-2 rounded-card bg-card p-3 shadow-card">
      {(white || black) && <p className="font-bold"><span>⚪ {white ?? '?'}</span> <span className="text-ink-soft">–</span> <span>⚫ {black ?? '?'}</span></p>}
      <nav ref={nav} aria-label={t('moveList')} className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
        {moves.map((m, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i % 2 === 0 && <span className="text-sm text-ink-soft">{i / 2 + 1}.</span>}
            {hideFromPly !== undefined && i >= hideFromPly
              ? <button type="button" disabled className="rounded-control px-2 py-1 font-mono font-bold text-ink-soft">?</button>
              : <button type="button" aria-current={ply === i + 1 ? 'true' : undefined} onClick={() => onPly(i + 1)}
                  className={`rounded-control px-2 py-1 font-mono font-bold ${ply === i + 1 ? 'bg-accent text-accent-ink' : 'hover:bg-surface'}`}>
                  {formatSan(m.san, locale)}
                </button>}
          </span>
        ))}
      </nav>
    </div>
  );
}
