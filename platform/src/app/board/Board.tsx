/**
 * The board: 64 cells, the pieces or their blocks, and the scene's layers drawn from the core's data.
 * With `onSquare` the board takes one tab stop and arrow keys move between squares; without it the
 * cells take no focus. It decides nothing about chess.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { boardFromFen, defaultKnightSquare, diamondRows, knightDistances, squareIndex, squareName, symbol, type Cell } from '@core/analysis';
import type { ResolvedScene } from '@core/scene';
import type { Square } from '@core/types';
import type { MessageKey } from '@core/i18n/index';
import { useT } from '../i18n';
import { PIECES } from './pieces';
import { Block } from './layers/Blocks';
import { Roads } from './layers/Roads';
import { ownerOf, TINT } from './layers/Territory';
import { houseOf } from './layers/Kings';

const pieceKey = (c: Cell) => `piece${c.color.toUpperCase()}${c.type.toUpperCase()}` as MessageKey;

export interface BoardProps {
  scene: ResolvedScene;
  onSquare?: ((sq: Square) => void) | undefined;
  flip?: boolean;
  tapMarks?: { right?: Square; wrong?: Square };
  /** The square the knight view counts jumps from (default: the POC's choice for the side to move). */
  knightSquare?: Square | undefined;
  /** 'letters' draws the paper symbols (K, Q', o, x …) instead of piece images. */
  pieceStyle?: 'images' | 'letters';
  /** Show each square's name ("e4") small in its top-left corner. */
  squareNames?: boolean | undefined;
  /** Extra marks drawn over the board in its 8×8 coordinates (engine arrows). */
  overlay?: ReactNode;
}

export function Board({ scene, onSquare, flip = false, tapMarks, knightSquare, pieceStyle = 'images', squareNames = false, overlay }: BoardProps) {
  const t = useT();
  const board = boardFromFen(scene.fen);
  const showPieces = scene.layers.includes('pieces');
  const showBlocks = !showPieces && scene.layers.includes('shapes');
  const order = flip ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const xy = (sq: Square): [number, number] => {
    const col = sq.charCodeAt(0) - 97, row = 8 - Number(sq[1]);
    return flip ? [7 - col + 0.5, 7 - row + 0.5] : [col + 0.5, row + 0.5];
  };
  const marks = scene.layers.includes('territory') ? scene.data.territory?.mark : undefined;
  const houses = scene.layers.includes('kings') ? houseOf(scene.data.kings) : new Map<string, string>();
  const roads = scene.layers.includes('roads') ? scene.data.roads : undefined;
  const focus = new Set<string>(scene.focus);
  const reach = scene.layers.includes('reach') ? new Map((scene.data.reach?.pieces ?? []).map((p) => [p.square as string, p.count])) : null;
  const turn = (scene.fen.split(' ')[1] ?? 'w') as 'w' | 'b';
  const kFrom = scene.layers.includes('knight') ? (knightSquare ?? (defaultKnightSquare(board, turn) as Square | null)) : null;
  const dist = kFrom ? knightDistances(kFrom) : null;
  const diamond = scene.layers.includes('diamond');
  // The diamond's cells are too small for a name, and its empty squares have no background to read it on.
  const names = squareNames && !diamond;

  // Roving focus: one cell is the tab stop; arrows move it (in screen order, so a flipped board still feels right).
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const move = (e: KeyboardEvent, i: number, j: number) => {
    const d = ({ ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] } as Record<string, [number, number]>)[e.key];
    if (d) {
      e.preventDefault();
      const ni = Math.max(0, Math.min(7, i + d[0])), nj = Math.max(0, Math.min(7, j + d[1]));
      setCursor([ni, nj]);
      refs.current.get(`${ni}:${nj}`)?.focus();
    }
    // Enter and Space reach onSquare through the button's own click; handling them here too made
    // Firefox report the square twice.
  };

  const cell = (row: number, col: number, i: number, j: number) => {
              const sq = squareName(row, col);
      const piece = board[row]?.[col] ?? null;
      const owner = ownerOf(marks?.[row]?.[col]);
      const house = houses.get(sq);
      const dark = (row + col) % 2 === 1;
      const label = `${sq}${piece && showPieces ? `, ${t(pieceKey(piece))}` : ''}`;
      const stop = !!onSquare && i === cursor[0] && j === cursor[1];
      return (
        <button type="button" role="gridcell" key={sq} aria-label={label} data-square={sq}
          ref={(el) => { if (el) refs.current.set(`${i}:${j}`, el); else refs.current.delete(`${i}:${j}`); }}
          tabIndex={stop ? 0 : -1} aria-disabled={onSquare ? undefined : true}
          data-owner={owner} data-house={house} data-focus={focus.has(sq) ? 'true' : undefined}
          data-tap={tapMarks?.right === sq ? 'right' : tapMarks?.wrong === sq ? 'wrong' : undefined}
          onClick={() => { setCursor([i, j]); onSquare?.(sq); }}
          onKeyDown={(e) => move(e, i, j)}
          className={[
            'relative flex items-center justify-center p-0 transition-colors duration-300 focus-visible:z-20 focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-[var(--board-focus)]',
            dark ? 'bg-board-dark' : 'bg-board-light',
            owner ? `after:absolute after:inset-0 after:content-[''] ${TINT[owner]}` : '',
            house ? 'shadow-[inset_0_0_0_3px_var(--board-house)]' : '',
            (focus.has(sq) || kFrom === sq) ? 'outline outline-4 -outline-offset-4 outline-[var(--board-focus)]' : '',
            tapMarks?.right === sq ? 'shadow-[inset_0_0_0_5px_var(--board-good)]' : tapMarks?.wrong === sq ? 'shadow-[inset_0_0_0_5px_var(--board-bad)]' : '',
          ].join(' ')}>
          {piece && showPieces && pieceStyle === 'letters' && <span aria-hidden="true" className="relative z-10 font-mono text-[min(5vw,1.6rem)] font-black text-board-ink">{symbol(piece, sq)}</span>}
          {piece && showPieces && pieceStyle !== 'letters' && <img src={PIECES[`${piece.color}${piece.type.toUpperCase()}`]} alt={t(pieceKey(piece))} className="relative z-10 h-[88%] w-[88%]" draggable={false} />}
          {piece && showBlocks && <Block cell={piece} />}
          {names && <span aria-hidden="true" data-square-name
            className={`pointer-events-none absolute left-0.5 top-0 z-20 text-[clamp(8px,2.2vw,11px)] font-bold leading-tight text-board-ink/70`}>{sq}</span>}
          {reach?.has(sq) && <span data-reach={reach.get(sq)} className="absolute right-0.5 top-0.5 z-20 rounded-full bg-board-ink px-1.5 text-xs font-black text-white">{reach.get(sq)}</span>}
          {dist && (dist[row]?.[col] ?? -1) > 0 && <span data-dist={dist[row]![col]} className="absolute bottom-0.5 left-0.5 z-20 text-sm font-black text-board-ink">{dist[row]![col]}</span>}
        </button>
      );
  };

  const diamondRowsUi = diamond ? diamondRows(board).map((r, k) => (
    <div role="row" key={k} data-diamond-row className="flex justify-center" style={{ height: `${100 / 15}%` }}>
      {r.map((d) => { const { row, col } = squareIndex(d.square); const i = order.indexOf(row), j = order.indexOf(col); return <div key={d.square} className="aspect-square h-full">{cell(row, col, i, j)}</div>; })}
    </div>
  )) : null;

  return (
    <div data-board data-square-names={names ? 'true' : undefined} className={`relative mx-auto aspect-square w-full max-w-[min(92vw,34rem)] select-none overflow-hidden shadow-card ${names ? 'rounded-lg' : 'rounded-card'}`}>
      {diamond ? (
        <div role="grid" aria-label={t('viewBoard')} className="flex h-full w-full flex-col">{diamondRowsUi}</div>
      ) : (
      <div role="grid" aria-label={t('viewBoard')} className="grid h-full w-full grid-cols-8 grid-rows-8">
        {order.map((row, i) => (
          <div role="row" key={row} className="contents">
            {order.map((col, j) => cell(row, col, i, j))}
          </div>
        ))}
      </div>
      )}
      {overlay && !diamond && (
        <svg viewBox="0 0 8 8" className="pointer-events-none absolute inset-0 z-30 h-full w-full" aria-hidden="true">{overlay}</svg>
      )}
      {roads && !diamond && (
        <svg viewBox="0 0 8 8" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <Roads rays={roads.rays} batteries={roads.batteries} rings={roads.rings} guards={roads.pawnGuards} xy={xy} />
        </svg>
      )}
    </div>
  );
}
