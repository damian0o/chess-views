import type { Message } from '../types';

/** English: the fallback catalogue. Its keys are the message keys of the whole app. */
export const en = {
  answerFirst: 'Answer first',
  tryAgain: 'Try again',
  right: 'Right!',
  revealFirst: 'Press ▶ first',
  nOfTotal: '{n} of {total}',
  moves: { one: '{count} move', other: '{count} moves' },
  roundFinished: 'Round finished',
  lessonFinished: 'Lesson finished',
  whichGameWhichMoment: 'Which game, which moment?',
  lessonNotHere: 'That lesson is not here',
} satisfies Record<string, Message>;
