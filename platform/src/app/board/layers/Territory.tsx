/** The tint a territory mark gives a square: whose it is, or contested. */
export const ownerOf = (mark: string | undefined): 'w' | 'b' | 'contested' | undefined =>
  mark === '+' ? 'w' : mark === '-' ? 'b' : mark === '=' ? 'contested' : undefined;

/** White's tint is light and Black's dark, so they differ in lightness, not only in hue. */
export const TINT: Record<string, string> = {
  w: 'after:bg-[color-mix(in_srgb,var(--board-road-w)_25%,transparent)]',
  b: 'after:bg-[color-mix(in_srgb,var(--board-road-b)_55%,transparent)]',
  contested: 'after:bg-[color-mix(in_srgb,#eab308_55%,transparent)]',
};
