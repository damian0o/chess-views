/** The lessons and library compiled by `npm run content`, bundled at build time. */
import type { Lesson, LibraryEntry, Locale } from '@core/types';
import plLessons from '@content/pl/lessons.json';
import enLessons from '@content/en/lessons.json';
import plLibrary from '@content/pl/library.json';
import enLibrary from '@content/en/library.json';
import stepIds from '../../content/poc-step-ids.json';

export const LESSONS: Record<Locale, Lesson[]> = { pl: plLessons as unknown as Lesson[], en: enLessons as unknown as Lesson[] };
export const LIBRARY: Record<Locale, LibraryEntry[]> = { pl: plLibrary as unknown as LibraryEntry[], en: enLibrary as unknown as LibraryEntry[] };
export const POC_STEP_IDS = stepIds as Record<string, string[]>;
