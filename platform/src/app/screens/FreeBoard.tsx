import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { sessionParams, sessionScene } from '@core/session';
import type { Square } from '@core/types';
import { showsSquareNames } from '@core/storage/index';
import { useApp, useAppStore } from '../appStore';
import { useT } from '../i18n';
import { Board } from '../board/Board';
import { MoveStrip } from '../board/MoveStrip';
import { LoadDialog } from '../board/LoadDialog';
import { LookPicker } from '../lesson/LookPicker';
import { LegendPopup } from '../lesson/LegendPopup';
import { TopBar } from '../ui/TopBar';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { ROOM_NAME } from '../rooms/names';
import { useAnalysis } from '../board/useAnalysis';
import { EnginePanel } from '../board/EnginePanel';
import { Arrows } from '../board/Arrows';
import { GuessPanel, type Guess } from '../board/GuessPanel';
import { tapGuess, type GuessState } from '@core/guess';
import type { MessageKey } from '@core/i18n/index';
import { OPTION_IDS, type Fen } from '@core/types';
import { optionStates, optionsOf } from '@core/look';

const ALL_OPTIONS = [...OPTION_IDS];

/** #/board?fen=…|pgn=…&ply=&pieces=&moves=&strategy=&diamond=1&engine=1&flip=1 — any position or game, every board look option mixed freely. The address follows the board. */
export function FreeBoard() {
  const t = useT();
  const [, navigate] = useLocation();
  const search = useSearch();
  const store = useAppStore();
  const session = useApp((s) => s.session);
  const player = useApp((s) => s.player);
  const boardFrom = useApp((s) => s.boardFrom);
  const [knight, setKnight] = useState<Square | undefined>(() => { const sq = new URLSearchParams(search).get('sq'); return sq && /^[a-h][1-8]$/.test(sq) ? sq as Square : undefined; });
  const fen = session?.game.fen(session.ply);
  const engineOn = !!session?.look.engine;
  const { state: analysis, retry } = useAnalysis((fen ?? '') as never, !!session && engineOn, { depth: 10, multipv: 5 });
  const [guessing, setGuessing] = useState(false);
  const [pick, setPick] = useState<GuessState>({});
  const [hint, setHint] = useState<MessageKey | null>(null);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [revealed, setRevealed] = useState(false);
  const resetGuess = () => { setPick({}); setHint(null); setGuess(null); setRevealed(false); };
  // A new position starts a new guess.
  useEffect(() => { resetGuess(); }, [fen, engineOn, session?.look.moves]);
  const HINT: Record<string, MessageKey> = { opponent: 'guessOpponent', empty: 'guessEmpty', illegal: 'guessIllegal', stuck: 'guessStuck' };
  const onGuessTap = (sq: Square) => {
    if (!fen || guess) return;
    const r = tapGuess(pick, sq, fen as Fen);
    setPick(r.state);
    if (r.result.kind === 'ignore') setHint(HINT[r.result.reason]!);
    else if (r.result.kind === 'guess') { setGuess({ move: r.result.move, san: r.result.san }); setHint(null); }
    else setHint(null);
  };

  // The address opens a session only when it differs from the board on screen (one owner, no loop).
  useEffect(() => {
    const cur = store.getState().session;
    if (cur && sessionParams(cur).toString() === new URLSearchParams(search).toString()) return;
    if (cur && !search) return;
    store.getState().openBoard(new URLSearchParams(search));
  }, [search, store]);
  // The board writes the address only when the board changes, and at most once per pause (Safari limits
  // replaceState bursts); an address change alone never writes back.
  const searchRef = useRef(search);
  searchRef.current = search;
  useEffect(() => {
    if (!session) return;
    const p = sessionParams(session).toString();
    if (p === new URLSearchParams(searchRef.current).toString()) return;
    const timer = setTimeout(() => {
      if (p !== new URLSearchParams(searchRef.current).toString()) { try { navigate(`/board?${p}`, { replace: true }); } catch { /* address not updated */ } }
    }, 300);
    return () => clearTimeout(timer);
  }, [session, navigate]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest?.('[role=grid],[role=listbox],[role=dialog],[role=slider]'))) return;
      if (e.key === 'ArrowLeft') store.getState().stepPly(-1);
      if (e.key === 'ArrowRight') store.getState().stepPly(1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [store]);

  if (!session) return null;
  const roomFrom = boardFrom?.match(/^\/room\/(\w+)$/)?.[1];
  const upFrom = roomFrom && roomFrom in ROOM_NAME ? { to: boardFrom!, label: t(ROOM_NAME[roomFrom as keyof typeof ROOM_NAME]) } : undefined;
  const scene = sessionScene(session);
  const names = !!player && showsSquareNames(player);
  const options = optionStates(session.look, { flip: session.flip, names }, ALL_OPTIONS, () => true);
  const s = store.getState();
  const copy = async () => {
    const url = `${location.origin}${location.pathname}#/board?${sessionParams(session).toString()}`;
    try { await navigator.clipboard.writeText(url); store.setState({ toast: t('linkCopied') }); } catch { store.setState({ toast: t('linkCopyFailed') }); }
  };

  return (
    <>
      <TopBar title={t('freeBoard')} up={upFrom} />
      <main className="mx-auto grid max-w-6xl gap-4 p-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] md:items-start">
        <div className="flex flex-col gap-3">
          <Board scene={scene} flip={session.flip} pieceStyle={player?.pieceStyle ?? 'images'} squareNames={names} knightSquare={knight}
            onSquare={session.look.moves === 'knight' ? setKnight : engineOn && guessing ? onGuessTap : undefined}
            tapMarks={pick.from ? { right: pick.from } : {}}
            overlay={analysis.kind === 'done' && analysis.fen === scene.fen && (!guessing || revealed) ? <Arrows lines={analysis.analysis.lines} flip={session.flip} /> : undefined} />
          {(!guessing || analysis.kind !== 'thinking') && <EnginePanel state={guessing && !revealed && analysis.kind === 'done' ? { kind: 'off' } : analysis} turn={(scene.fen.split(' ')[1] ?? 'w') as 'w' | 'b'} onRetry={retry} />}
          {engineOn && (
            <div className="flex flex-col gap-2 rounded-card bg-card p-3 shadow-card">
              <Toggle isSelected={guessing} onChange={(on) => { setGuessing(on); resetGuess(); }}>{t('guessMode')}</Toggle>
              {guessing && fen && <GuessPanel fen={fen as Fen} analysis={analysis} hint={hint} guess={guess} revealed={revealed} onReveal={() => setRevealed(true)} onAgain={resetGuess} />}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button tone="quiet" aria-label={t('firstMove')} onPress={() => s.setPly(0)}>⏮</Button>
            <Button tone="quiet" aria-label={t('prevMove')} onPress={() => s.stepPly(-1)}>◀</Button>
            <Button tone="quiet" aria-label={t('nextMove')} onPress={() => s.stepPly(1)}>▶</Button>
            <Button tone="quiet" aria-label={t('lastMove')} onPress={() => s.setPly(session.game.length)}>⏭</Button>
          </div>
          {session.game.length > 0 && (
            <input type="range" min={0} max={session.game.length} value={session.ply} aria-label={t('moveSlider')}
              aria-valuetext={t('moveOfTotal', { n: session.ply, total: session.game.length })}
              onChange={(e) => s.setPly(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <LookPicker options={options} frozen={false}
              onToggle={(id) => (id === 'names' ? void s.updatePlayer({ squareNames: !names }) : s.toggleOption(id))} />
            <LegendPopup on={[session.look.pieces, ...optionsOf(session.look)]} />
          </div>
          <p role="status" aria-label={t('gameStatus')} className="text-lg font-black">{(() => {
            const st = session.game.status(session.ply);
            const side = t(scene.fen.split(' ')[1] === 'b' ? 'toMoveBlack' : 'toMoveWhite');
            return st === 'mate' ? t('statusMate') : st === 'stalemate' ? t('statusStalemate') : st === 'check' ? `${t('statusCheck')} · ${side}` : side;
          })()}</p>
          <MoveStrip moves={session.game.moves()} ply={session.ply} onPly={s.setPly} white={session.headers.White} black={session.headers.Black} hideFromPly={session.solve ? session.ply : undefined} startFen={session.game.fen(0)} />
          <div className="flex flex-wrap items-center gap-2">
            <LoadDialog />
            <Button tone="quiet" onPress={() => s.toggleFlip()}>⟲ {t('flip')}</Button>
            <Button tone="quiet" onPress={() => void copy()}>{t('copyLink')}</Button>
            <Button tone="quiet" onPress={() => navigate('/print')}>{t('print')}</Button>
            <Toggle isSelected={player?.pieceStyle === 'letters'} onChange={(on) => void s.updatePlayer({ pieceStyle: on ? 'letters' : 'images' })}>{t('letters')}</Toggle>
          </div>
        </div>
      </main>
    </>
  );
}
