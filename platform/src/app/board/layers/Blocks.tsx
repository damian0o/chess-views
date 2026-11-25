import { shapeSize, type Cell } from '@core/analysis';

const SIZE = { small: 'w-[38%] h-[38%]', mid: 'w-[58%] h-[58%]', big: 'w-[78%] h-[78%]' } as const;

/** A piece shown as a block: its size says how big the piece is, its colour whose it is. */
export function Block({ cell }: { cell: Cell }) {
  const size = shapeSize(cell.type);
  return (
    <span data-block data-testid="block" data-size={size} aria-hidden="true"
      className={`${SIZE[size]} rounded-[22%] shadow-sm ${cell.color === 'w' ? 'bg-white ring-2 ring-board-ink/60' : 'bg-board-ink'}`} />
  );
}
