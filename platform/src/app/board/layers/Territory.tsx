/** The tint a territory mark gives a square: whose it is, or contested. */
export const ownerOf = (mark: string | undefined): 'w' | 'b' | 'contested' | undefined =>
  mark === '+' ? 'w' : mark === '-' ? 'b' : mark === '=' ? 'contested' : undefined;

export const TINT: Record<string, string> = {
  w: 'after:bg-accent-2/35', b: 'after:bg-accent/35', contested: 'after:bg-fun-2/40',
};
