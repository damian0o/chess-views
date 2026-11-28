// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { LESSONS, makeStore, mount } from './helpers/harness';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const withPlayer = async () => { const store = makeStore(); await store.getState().addPlayer({ name: 'Ola' }); return store; };
const scholar = LESSONS.pl.find((l) => l.id === 'scholars-mate')!;
const stepWith = (pred: (s: (typeof scholar.steps)[number]) => boolean) => scholar.steps.find(pred)!.id;
const next = () => screen.getByRole('button', { name: /^(Dalej|Zakończ ✓)/ }) as HTMLButtonElement;
const pieces = () => screen.queryAllByRole('img', { name: /biał|czarn/ });

describe('lesson screen', () => {
  test("a step opens with its own look pressed and the picker lists only the lesson's options", async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/lesson/eyes-on-f7/s03-roads' });
    await screen.findByRole('group', { name: 'Ruchy' });
    const opts = [...document.querySelectorAll('[data-option]')];
    expect(opts.map((o) => o.getAttribute('data-option'))).toEqual(['pieces', 'blocks', 'hidden', 'roads', 'territory', 'flip', 'names']);
    expect(document.querySelector('[data-option="roads"]')!.getAttribute('aria-pressed')).toBe('true');
  });
  test('a wrong choice shows Spróbuj jeszcze raz and keeps Next disabled; the right one enables Next', async () => {
    const id = stepWith((s) => s.question?.kind === 'choice');
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/lesson/scholars-mate/${id}` });
    const q = scholar.steps.find((s) => s.id === id)!.question!;
    if (q.kind !== 'choice') throw new Error('choice expected');
    const wrong = q.choices.find((_, i) => i !== q.answer)!, right = q.choices[q.answer]!;
    fireEvent.click(await screen.findByRole('button', { name: wrong }));
    expect(await screen.findByText('Spróbuj jeszcze raz')).toBeTruthy();
    expect(next().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: right }));
    await waitFor(() => expect(next().disabled).toBe(false));
  });
  test('a tap question takes the square from the board', async () => {
    const id = stepWith((s) => s.question?.kind === 'tap');
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/lesson/scholars-mate/${id}` });
    expect(await screen.findByText('Dotknij pola na szachownicy')).toBeTruthy();
    fireEvent.click(screen.getByRole('gridcell', { name: /^e5\b/ }));
    expect(await screen.findByText('Spróbuj jeszcze raz')).toBeTruthy();
    fireEvent.click(screen.getByRole('gridcell', { name: /^f7\b/ }));
    await waitFor(() => expect(next().disabled).toBe(false));
  });
  // Review Focus 1
  test('recall step: blocks only, no pieces, look picker disabled until answered', async () => {
    const id = stepWith((s) => s.question?.kind === 'recall' && s.question.answer === 'yes');
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/lesson/scholars-mate/${id}` });
    await screen.findByRole('group', { name: 'Bierki' });
    expect(pieces()).toHaveLength(0);
    expect(document.querySelectorAll('[data-block]').length).toBeGreaterThan(0);
    const picker = document.querySelector('[data-option="pieces"]') as HTMLButtonElement;
    expect(picker.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tak' }));
    await waitFor(() => expect(pieces().length).toBeGreaterThan(0));
  });
  test('the legend popup opens and closes; on an open blocks question it explains the blocks', async () => {
    const id = stepWith((s) => s.question?.kind === 'recall');
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/lesson/scholars-mate/${id}` });
    fireEvent.click(await screen.findByRole('button', { name: 'Co widzę?' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Same bloki/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Zamknij' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  test("playing the game's move solves a find-the-move step at once, even while the engine is silent", async () => {
    const id = stepWith((s) => !!s.solve);        // s09: find Qxf7#
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/lesson/scholars-mate/${id}` });
    await screen.findByText('Dotknij bierki, potem pola, na które idzie');
    expect(next().disabled).toBe(true);
    fireEvent.click(screen.getByRole('gridcell', { name: /^h5\b/ }));
    fireEvent.click(screen.getByRole('gridcell', { name: /^f7\b/ }));
    expect(await screen.findByText('Twój ruch Hxf7#: Dobrze, tak zagrano w partii!')).toBeTruthy();
    await waitFor(() => expect(next().disabled).toBe(false));
  });
  // Review Focus 4
  test('reload on a step id reopens it with the question unanswered', async () => {
    const id = stepWith((s) => s.question?.kind === 'tap');
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/lesson/scholars-mate/${id}` });
    await screen.findByText('Dotknij pola na szachownicy');
    expect(store.getState().run?.step.id).toBe(id);
    expect(store.getState().run?.answered).toBe(false);
  });
  test('an unknown step id opens the first step; an unknown lesson goes home with a toast', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/lesson/scholars-mate/no-such-step' });
    await waitFor(() => expect(store.getState().run?.step.id).toBe(scholar.steps[0]!.id));
    cleanup();
    const again = mount(<AppRoutes />, { store, path: '/lesson/nope' });
    await waitFor(() => expect(again.history.at(-1)).toBe('/home'));
    expect(store.getState().toast).toBe('Nie ma tej lekcji');
    void history;
  });
  test('Recognise round: choices are game: position, finishing toasts roundFinished', async () => {
    const store = await withPlayer();
    for (const id of ['opera-game-lesson', 'legal-mate', 'reti-tartakower', 'lasker-thomas']) {
      const last = LESSONS.pl.find((l) => l.id === id)!.steps.at(-1)!.id;
      await store.getState().openLesson(id, last); await store.getState().next();
    }
    store.getState().leave();
    mount(<AppRoutes />, { store, path: '/recognise/5/1' });
    await screen.findAllByText(/Która partia, która pozycja\?/);
    for (let i = 0; i < 8; i++) {
      const run = store.getState().run!;
      const q = run.step.question!;
      if (q.kind !== 'choice') throw new Error('choice expected');
      expect(q.choices.every((c) => c.includes(':'))).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: q.choices[q.answer]! }));
      await waitFor(() => expect(next().disabled).toBe(false));
      fireEvent.click(next());
      await waitFor(() => expect(store.getState().run === null || store.getState().run!.index === i + 1).toBe(true));
    }
    await waitFor(() => expect(store.getState().toast).toBe('Runda skończona'));
  });
  test('reduced motion: no celebration animation', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    const id = stepWith((s) => s.question?.kind === 'tap');
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: `/lesson/scholars-mate/${id}` });
    fireEvent.click(await screen.findByRole('gridcell', { name: /^f7\b/ }));
    await screen.findByText(/f7/, { selector: '[data-right-line]' });
    expect(document.querySelector('[data-celebrate]')).toBeNull();
  });
});
