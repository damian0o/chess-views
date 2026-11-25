/** The tint a territory mark gives a square: whose it is, or contested. */
export const ownerOf = (mark: string | undefined): 'w' | 'b' | 'contested' | undefined =>
  mark === '+' ? 'w' : mark === '-' ? 'b' : mark === '=' ? 'contested' : undefined;

export const TINT: Record<string, string> = {
  w: 'after:bg-[color-mix(in_srgb,var(--board-road-w)_40%,transparent)]',
  b: 'after:bg-[color-mix(in_srgb,var(--board-road-b)_35%,transparent)]',
  contested: 'after:bg-[color-mix(in_srgb,#eab308_55%,transparent)]',
};
