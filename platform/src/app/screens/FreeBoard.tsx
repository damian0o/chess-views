import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Switch } from 'react-aria-components';
import { sessionParams, sessionScene } from '@core/session';
import type { Square } from '@core/types';
import { useApp, useAppStore } from '../appStore';
import { useT } from '../i18n';
import { Board } from '../board/Board';
import { MoveStrip } from '../board/MoveStrip';
import { LoadDialog } from '../board/LoadDialog';
import { ViewPicker } from '../lesson/ViewPicker';
import { LegendPopup } from '../lesson/LegendPopup';
import { TopBar } from '../ui/TopBar';
import { Button } from '../ui/Button';
import { VIEWS, type View } from '../views';

const ALL = VIEWS.flatMap((v) => v.layers);

/** #/board?fen=…|pgn=…&ply=&view=&flip=1 — any position or game, in all nine views. The address follows the board. */
export function FreeBoard() {
  const t = useT();
  const [, navigate] = useLocation();
  const search = useSearch();
  const store = useAppStore();
  const session = useApp((s) => s.session);
  const player = useApp((s) => s.player);
  const [knight, setKnight] = useState<Square | undefined>(undefined);

  // The address opens a session only when it differs from the board on screen (one owner, no loop).
  useEffect(() => {
    const cur = store.getState().session;
    if (cur && sessionParams(cur).toString() === new URLSearchParams(search).toString()) return;
    if (cur && !search) return;
    store.getState().openBoard(new URLSearchParams(search));
  }, [search, store]);
  useEffect(() => {
    if (!session) return;
    const p = sessionParams(session).toString();
    if (p !== new URLSearchParams(search).toString()) navigate(`/board?${p}`, { replace: true });
  }, [session, search, navigate]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') store.getState().stepPly(-1);
      if (e.key === 'ArrowRight') store.getState().stepPly(1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [store]);

  if (!session) return null;
  const view: View = VIEWS.find((v) => v.id === session.view) ?? VIEWS[0]!;
  const scene = sessionScene(session, view.layers);
  const s = store.getState();
  const copy = async () => {
    const url = `${location.origin}${location.pathname}?${sessionParams(session).toString()}#/board`;
    try { await navigator.clipboard.writeText(url); store.setState({ toast: t('linkCopied') }); } catch { /* clipboard blocked */ }
  };

  return (
    <>
      <TopBar title={t('freeBoard')} />
      <main className="mx-auto grid max-w-6xl gap-4 p-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] md:items-start">
        <div className="flex flex-col gap-3">
          <Board scene={scene} flip={session.flip} pieceStyle={player?.pieceStyle ?? 'images'} knightSquare={knight}
            onSquare={view.id === 'knight' ? setKnight : undefined} />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button tone="quiet" aria-label={t('firstMove')} onPress={() => s.setPly(0)}>⏮</Button>
            <Button tone="quiet" aria-label={t('prevMove')} onPress={() => s.stepPly(-1)}>◀</Button>
            <Button tone="quiet" aria-label={t('nextMove')} onPress={() => s.stepPly(1)}>▶</Button>
            <Button tone="quiet" aria-label={t('lastMove')} onPress={() => s.setPly(session.game.length)}>⏭</Button>
          </div>
          {session.game.length > 0 && (
            <input type="range" min={0} max={session.game.length} value={session.ply} aria-label={t('moveList')}
              onChange={(e) => s.setPly(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ViewPicker views={VIEWS} selected={view.id} allowed={ALL} disabled={false} onChange={(v) => s.setView(v.id)} />
            <LegendPopup view={view} />
          </div>
          <MoveStrip moves={session.game.moves()} ply={session.ply} onPly={s.setPly} white={session.headers.White} black={session.headers.Black} />
          <div className="flex flex-wrap items-center gap-2">
            <LoadDialog />
            <Button tone="quiet" onPress={() => s.toggleFlip()}>⟲ {t('flip')}</Button>
            <Button tone="quiet" onPress={() => void copy()}>{t('copyLink')}</Button>
            <Switch isSelected={player?.pieceStyle === 'letters'} onChange={(on) => void s.updatePlayer({ pieceStyle: on ? 'letters' : 'images' })}
              className="group flex min-h-12 cursor-pointer items-center gap-2 font-bold">
              <span className="h-7 w-12 rounded-full bg-ink/20 p-1 transition group-data-[selected]:bg-accent">
                <span className="block h-5 w-5 rounded-full bg-card shadow transition group-data-[selected]:translate-x-5" />
              </span>
              {t('letters')}
            </Switch>
          </div>
        </div>
      </main>
    </>
  );
}
