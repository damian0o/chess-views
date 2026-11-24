/**
 * The board: 64 cells (buttons, so a tap or Enter reports the square), the pieces or their blocks,
 * and the scene's layers drawn from the core's data. It decides nothing about chess.
 */
import { boardFromFen, roadHits, squareName, type Cell } from '@core/analysis';
import type { ResolvedScene } from '@core/scene';
import type { Square } from '@core/types';
import { PIECES } from './pieces';
import { Block } from './layers/Blocks';
import { Roads } from './layers/Roads';
import { ownerOf, TINT } from './layers/Territory';
import { houseOf } from './layers/Kings';

const NAMES: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const pieceName = (c: Cell) => `${c.color === 'w' ? 'white' : 'black'} ${NAMES[c.type]}`;

export interface BoardProps {
  scene: ResolvedScene;
  onSquare?: (sq: Square) => void;
  flip?: boolean;
  tapMarks?: { right?: Square; wrong?: Square };
}

export function Board({ scene, onSquare, flip = false, tapMarks }: BoardProps) {
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

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(92vw,34rem)] select-none overflow-hidden rounded-card shadow-card">
      <div role="grid" aria-label="board" className="grid h-full w-full grid-cols-8 grid-rows-8">
        {order.map((row) => (
          <div role="row" key={row} className="contents">
            {order.map((col) => {
              const sq = squareName(row, col);
              const cell = board[row]?.[col] ?? null;
              const owner = ownerOf(marks?.[row]?.[col]);
              const house = houses.get(sq);
              const dark = (row + col) % 2 === 1;
              const label = `${sq}${cell && showPieces ? `, ${pieceName(cell)}` : ''}`;
              return (
                <button type="button" role="gridcell" key={sq} aria-label={label} data-square={sq}
                  data-owner={owner} data-house={house} data-focus={focus.has(sq) ? 'true' : undefined}
                  data-tap={tapMarks?.right === sq ? 'right' : tapMarks?.wrong === sq ? 'wrong' : undefined}
                  onClick={() => onSquare?.(sq)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSquare?.(sq); } }}
                  className={[
                    'relative flex items-center justify-center p-0 transition-colors duration-300',
                    dark ? 'bg-board-dark' : 'bg-board-light',
                    owner ? `after:absolute after:inset-0 after:content-[''] ${TINT[owner]}` : '',
                    house ? 'shadow-[inset_0_0_0_3px_var(--fun-3)]' : '',
                    focus.has(sq) ? 'outline outline-4 -outline-offset-4 outline-[var(--focus)]' : '',
                    tapMarks?.right === sq ? 'shadow-[inset_0_0_0_5px_var(--good)]' : tapMarks?.wrong === sq ? 'shadow-[inset_0_0_0_5px_var(--bad)]' : '',
                  ].join(' ')}>
                  {cell && showPieces && <img src={PIECES[`${cell.color}${cell.type.toUpperCase()}`]} alt={pieceName(cell)} className="relative z-10 h-[88%] w-[88%]" draggable={false} />}
                  {cell && showBlocks && <Block cell={cell} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {roads && (
        <svg viewBox="0 0 8 8" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <Roads rays={roads.rays} hits={roadHits(roads.rays)} xy={xy} />
        </svg>
      )}
    </div>
  );
}
