import { useEffect, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { useT } from '../i18n';
import { sheetAfterDrag } from './sheet';

const PEEK = 132;   // px of the sheet showing while it rests: the handle and the board's top row
const TAP = 6;      // a move shorter than this is a tap, not a drag

/**
 * The phone's board panel: it rests with its top edge peeking under the instruction, the handle on it;
 * up, it covers the screen with a strip (back to the instruction), the board and its tools, and the dock.
 * Only the handle and the strip drag it, so moves played on the board never move the sheet.
 */
export function BoardSheet({ up, onUp, onDown, strip, counter, children, dock, stripRef, pauseMs, resetKey }: {
  up: boolean; onUp: () => void; onDown: () => void; strip: string; counter: string; children: ReactNode; dock: ReactNode;
  stripRef?: RefObject<HTMLButtonElement | null>; pauseMs: number; resetKey: string;
}) {
  const t = useT();
  const root = useRef<HTMLElement>(null);
  const [glow, setGlow] = useState(false);
  const [flash, setFlash] = useState(false);
  const [dragY, setDragY] = useState<number | null>(null);
  const drag = useRef<{ y0: number; y: number; t: number; vy: number; moved: boolean } | null>(null);
  const dragged = useRef(false);

  // After the reading pause the resting edge glows and nudges; never while up.
  useEffect(() => {
    setGlow(false);
    if (up) return;
    const id = setTimeout(() => setGlow(true), pauseMs);
    return () => clearTimeout(id);
  }, [up, pauseMs, resetKey]);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(id);
  }, [flash]);

  const travel = () => Math.max(1, (typeof window === 'undefined' ? 800 : window.innerHeight) - PEEK);
  const goUp = () => { setFlash(true); onUp(); };
  const start = (e: PointerEvent) => {
    drag.current = { y0: e.clientY, y: e.clientY, t: e.timeStamp, vy: 0, moved: false };
    dragged.current = false;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dt = Math.max(1, e.timeStamp - d.t);
    d.vy = (e.clientY - d.y) / dt; d.y = e.clientY; d.t = e.timeStamp;
    if (Math.abs(e.clientY - d.y0) > TAP) d.moved = true;
    if (d.moved) {
      const dy = e.clientY - d.y0;
      setDragY(up ? Math.max(0, dy) : Math.min(0, dy));
    }
  };
  const end = (e: PointerEvent) => {
    const d = drag.current; drag.current = null; setDragY(null);
    if (!d || !d.moved) return;   // a tap: the click that follows toggles
    dragged.current = true;
    const to = sheetAfterDrag(up ? 'up' : 'down', e.clientY - d.y0, travel(), d.vy);
    if (to === 'up' && !up) goUp();
    if (to === 'down' && up) onDown();
  };
  const click = (f: () => void) => () => { if (dragged.current) { dragged.current = false; return; } f(); };
  const grab = { onPointerDown: start, onPointerMove: move, onPointerUp: end, onPointerCancel: () => { drag.current = null; setDragY(null); } };
  const style = dragY === null ? undefined
    : { transform: up ? `translateY(${dragY}px)` : `translateY(calc(100dvh - ${PEEK}px + ${dragY}px))`, transition: 'none' };

  return (
    <section ref={root} data-sheet={up ? 'up' : 'down'} data-glow={glow && !up && dragY === null ? 'true' : undefined} aria-label={t('viewBoard')}
      style={{ ...style, ['--peek' as string]: `${PEEK}px` }}
      className="cv-sheet fixed inset-x-0 top-0 z-40 flex flex-col bg-surface">
      {up ? (
        <button ref={stripRef} type="button" aria-label={t('sheetClose')} onClick={click(onDown)} {...grab}
          className="flex min-h-12 touch-none items-center gap-2 border-b-2 border-ink/10 px-3 py-1 text-left font-bold">
          <span aria-hidden="true" className="text-xl">⌄</span>
          <span className="min-w-0 flex-1 truncate">{strip}</span>
          <span className="shrink-0 text-ink-soft">{counter}</span>
        </button>
      ) : (
        <div className="flex flex-col items-center gap-1 px-3 pb-2 pt-2">
          <span aria-hidden="true" className="h-1.5 w-14 rounded-full bg-ink/40" />
          <button type="button" aria-label={t('sheetOpen')} onClick={click(goUp)} {...grab}
            className="cv-handle touch-none rounded-full border-2 border-ink bg-accent-2 px-4 py-1.5 font-black text-accent-2-ink">{t('sheetHandle')}</button>
        </div>
      )}
      <div data-sheet-body inert={!up} className="flex min-h-0 flex-1 flex-col">
        {/* Keyed by step: a new step's board always starts at the top, however far the last one was scrolled. */}
        <div key={resetKey} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-3">{children}</div>
        {dock}
      </div>
      {flash && <p data-sheet-flash role="status" className="cv-flash pointer-events-none absolute left-1/2 top-1/3 z-50 -translate-x-1/2 rounded-card border-2 border-good bg-card px-5 py-2 text-2xl font-black text-good">{t('sheetFlash')}</p>}
    </section>
  );
}
