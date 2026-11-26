// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { LessonDock } from '../../src/app/lesson/LessonDock';
import { Question } from '../../src/app/lesson/Question';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
const runAt = async (lesson: string, step: string) => {
  const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' });
  await store.getState().openLesson(lesson, step);
  return store;
};
const noop = () => {};

describe('the lesson dock', () => {
  test('a play-through step highlights ▶ and keeps Next locked; on the last move Next is highlighted', async () => {
    const store = await runAt('scholars-mate', 's01-board');
    const run = store.getState().run!;
    const { rerender } = mount(<LessonDock run={run} gameLength={5} movesLocked={false} onPly={noop} onNext={noop} highlight="play" />, { store });
    expect(screen.getByRole('button', { name: 'Następny ruch' }).getAttribute('data-highlight')).toBe('true');
    const next = screen.getByRole('button', { name: /^Dalej/ });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect(next.getAttribute('data-highlight')).toBeNull();
    store.getState().report({ kind: 'ply', ply: 5 });
    rerender(<LessonDock run={store.getState().run!} gameLength={5} movesLocked={false} onPly={noop} onNext={noop} highlight="next" />);
    expect(screen.getByRole('button', { name: /^Dalej/ }).getAttribute('data-highlight')).toBe('true');
    expect(screen.getByText('Ruch 5 z 5')).toBeTruthy();
  });
  test('a step without a game has no move buttons in the dock', async () => {
    const store = await runAt('scholars-mate', 's15-board');
    mount(<LessonDock run={store.getState().run!} gameLength={0} movesLocked={false} onPly={noop} onNext={noop} highlight="next" />, { store });
    expect(screen.queryByRole('button', { name: 'Następny ruch' })).toBeNull();
    expect(screen.getByRole('button', { name: /^Dalej/ })).toBeTruthy();
  });
});

describe('the question without its prompt', () => {
  test('showPrompt=false leaves out the prompt line but keeps the answers', async () => {
    const store = await runAt('scholars-mate', 's10-houses');
    mount(<Question run={store.getState().run!} onAnswer={noop} showPrompt={false} />, { store });
    expect(screen.queryByText('Która bierka dała mata?')).toBeNull();
    expect(screen.getByRole('group')).toBeTruthy();
  });
});
