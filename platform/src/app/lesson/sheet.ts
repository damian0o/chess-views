import type { LessonRun } from '@core/lessons/run';

/** About one second a line (40 characters) to read the step before the board's edge starts to glow; 1–5 s. */
export function readingPauseMs(text: string): number {
  return Math.min(5000, Math.max(1000, Math.ceil(text.length / 40) * 1000));
}

/**
 * Where the board sheet settles after a drag: past a third of its travel, or a flick faster than
 * 0.5 px/ms over at least 32 px, in the direction it can go; otherwise it springs back. dy and vy are negative upward.
 */
export function sheetAfterDrag(start: 'up' | 'down', dy: number, travel: number, vy: number): 'up' | 'down' {
  const FLICK = 32;
  if (start === 'down') return -dy > travel / 3 || (vy < -0.5 && -dy >= FLICK) ? 'up' : 'down';
  return dy > travel / 3 || (vy > 0.5 && dy >= FLICK) ? 'down' : 'up';
}

/** The one dock control to press now: ▶ while a play-through step waits, Next when open, nothing while a question or task is open. */
export function dockHighlight(run: LessonRun): 'play' | 'next' | null {
  if (!run.gate) return 'next';
  return run.gate.kind === 'play' ? 'play' : null;
}

/** After Next the board stays up this long, so the child sees the step change, then slides down slowly. */
export const NEXT_PAUSE_MS = 600;
/** How long that slow slide down takes (matches `.cv-sheet[data-slow]` in sheet.css). */
export const NEXT_SLIDE_MS = 800;
