import { useEffect, useRef } from 'react';
import type { Move } from '@core/chess/rules';
import { formatSan } from '@core/chess/san';
import { usePlayer, useT } from '../i18n';

/** The game's moves as numbered buttons; the current one is marked; tapping a move goes there (not while `locked`). */
export function MoveStrip({ moves, ply, onPly, white, black, hideFromPly, startFen, locked }: { locked?: boolean; startFen?: string; moves: Move[]; ply: number; onPly: (ply: number) => void; white?: string | undefined; black?: string | undefined; hideFromPly?: number | undefined }) {
  const t = useT();
  const locale = usePlayer()?.locale ?? 'pl';
  const nav = useRef<HTMLElement>(null);
  // Keep the current move in view in a long game.
  useEffect(() => { nav.current?.querySelector('[aria-current]')?.scrollIntoView?.({ block: 'nearest' }); }, [ply]);
  if (!moves.length) return null;
  // A game from a set-up position may start with Black and at any move number.
  const [, side = 'w', , , , full = '1'] = (startFen ?? '').split(' ');
  const off = side === 'b' ? 1 : 0;
  const first = Number(full) || 1;
  return (
    <div className="flex flex-col gap-2 rounded-card bg-card p-3 shadow-card">
      {(white || black) && <p className="break-words font-bold [overflow-wrap:anywhere]"><span>⚪ {white ?? '?'}</span> <span className="text-ink-soft">–</span> <span>⚫ {black ?? '?'}</span></p>}
      <nav ref={nav} aria-label={t('moveList')} className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
        {moves.map((m, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {(i + off) % 2 === 0 && <span className="text-sm text-ink-soft">{first + (i + off) / 2}.</span>}
            {i === 0 && off === 1 && <span className="text-sm text-ink-soft">{first}...</span>}
            {hideFromPly !== undefined && i >= hideFromPly
              ? <button type="button" disabled className="rounded-control px-2 py-1 font-mono font-bold text-ink-soft">?</button>
              : <button type="button" disabled={locked} aria-current={ply === i + 1 ? 'true' : undefined} onClick={() => onPly(i + 1)}
                  className={`rounded-control px-2 py-1 font-mono font-bold ${ply === i + 1 ? 'bg-accent text-accent-ink' : locked ? '' : 'hover:bg-surface'}`}>
                  {formatSan(m.san, locale)}
                </button>}
          </span>
        ))}
      </nav>
    </div>
  );
}
