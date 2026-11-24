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
  gradeBest: 'Najlepszy!',
  gradeJustAsGood: 'Równie dobry',
  gradeGood: 'Dobry',
  gradeOkay: 'Może być, ale był lepszy',
  gradeLoses: 'Ojej, to coś traci',
  gradeMissedMate: 'Był mat w {n}',
  gradeAllowsMate: 'Ojej, to pozwala na mata w {n}',
  evalEqual: 'Równo',
  evalWhiteLittleBetter: 'Białe stoją trochę lepiej',
  evalBlackLittleBetter: 'Czarne stoją trochę lepiej',
  evalWhiteBetter: 'Białe stoją lepiej',
  evalBlackBetter: 'Czarne stoją lepiej',
  evalWhiteWinning: 'Białe wygrywają',
  evalBlackWinning: 'Czarne wygrywają',
  evalWhiteMates: { one: 'Białe dają mata w {count} ruchu', few: 'Białe dają mata w {count} ruchach', many: 'Białe dają mata w {count} ruchach', other: 'Białe dają mata w {count} ruchu' },
  evalBlackMates: { one: 'Czarne dają mata w {count} ruchu', few: 'Czarne dają mata w {count} ruchach', many: 'Czarne dają mata w {count} ruchach', other: 'Czarne dają mata w {count} ruchu' },
  lessonNotHere: 'Nie ma tej lekcji',
};
