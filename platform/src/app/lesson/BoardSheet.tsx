import type { ReactNode, RefObject } from 'react';
import { useT } from '../i18n';

/**
 * The phone's board panel: it rests with its top edge peeking under the instruction, the handle on it;
 * up, it covers the screen with a strip (back to the instruction), the board and its tools, and the dock.
 */
export function BoardSheet({ up, onUp, onDown, strip, counter, children, dock, stripRef }: {
  up: boolean; onUp: () => void; onDown: () => void; strip: string; counter: string; children: ReactNode; dock: ReactNode;
  stripRef?: RefObject<HTMLButtonElement | null>;
}) {
  const t = useT();
  return (
    <section data-sheet={up ? 'up' : 'down'} aria-label={t('viewBoard')}
      className="cv-sheet fixed inset-x-0 top-0 z-40 flex h-[100dvh] flex-col bg-surface">
      {up ? (
        <button ref={stripRef} type="button" aria-label={t('sheetClose')} onClick={onDown}
          className="flex min-h-12 items-center gap-2 border-b-2 border-ink/10 px-3 py-1 text-left font-bold">
          <span aria-hidden="true" className="text-xl">⌄</span>
          <span className="min-w-0 flex-1 truncate">{strip}</span>
          <span className="shrink-0 text-ink-soft">{counter}</span>
        </button>
      ) : (
        <div className="flex flex-col items-center gap-1 px-3 pb-2 pt-2">
          <span aria-hidden="true" className="h-1.5 w-14 rounded-full bg-ink/40" />
          <button type="button" aria-label={t('sheetOpen')} onClick={onUp}
            className="cv-handle rounded-full border-2 border-ink bg-accent-2 px-4 py-1.5 font-black text-accent-2-ink">{t('sheetHandle')}</button>
        </div>
      )}
      <div data-sheet-body inert={!up} className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-3">{children}</div>
        {dock}
      </div>
    </section>
  );
}
