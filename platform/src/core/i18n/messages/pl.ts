import type { Message } from '../types';
import type { en } from './en';

/** Polish: the default language. Every key of the English catalogue must be here (a test checks it). */
export const pl: Record<keyof typeof en, Message> = {
  answerFirst: 'Najpierw odpowiedz',
  tryAgain: 'Spróbuj jeszcze raz',
  right: 'Dobrze!',
  revealFirst: 'Najpierw naciśnij ▶',
  nOfTotal: '{n} z {total}',
  moves: { one: '{count} ruch', few: '{count} ruchy', many: '{count} ruchów', other: '{count} ruchu' },
  roundFinished: 'Runda skończona',
  lessonFinished: 'Lekcja skończona',
  whichGameWhichMoment: 'Która partia, który moment?',
  roundBoard: 'Plansza {n} z {total}. Która partia, który moment? Odpowiedz, potem odkryj bierki, żeby sprawdzić.',
  lessonNotHere: 'Nie ma tej lekcji',
};
