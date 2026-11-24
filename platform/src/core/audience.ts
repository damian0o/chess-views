import type { AgeBand, AgedText } from './types';

/** The text for an age band: adults fall back to teens, then kids; teens fall back to kids. */
export function textFor(text: AgedText, age: AgeBand): string {
  if (age === 'adults') return text.adults ?? text.teens ?? text.kids;
  if (age === 'teens') return text.teens ?? text.kids;
  return text.kids;
}
