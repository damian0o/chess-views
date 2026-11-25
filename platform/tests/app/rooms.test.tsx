// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '../../src/app/App';
import { makeStore, mount } from './helpers/harness';

afterEach(cleanup);
const withPlayer = async () => { const s = makeStore(); await s.getState().addPlayer({ name: 'Ola' }); return s; };
const card = (name: string) => screen.getByRole('article', { name });

describe('home with rooms', () => {
  test('one card per room, in order, and no separate Biblioteka', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/home' });
    const rooms = await screen.findAllByRole('article', { name: /^(Wzory|Partie|Końcówki|Debiuty i plany)$/ });
    expect(rooms.map((r) => r.getAttribute('aria-label'))).toEqual(['Wzory', 'Partie', 'Końcówki', 'Debiuty i plany']);
    expect(screen.queryByRole('article', { name: 'Biblioteka' })).toBeNull();
    expect(screen.queryByRole('article', { name: 'Kontynuuj' })).toBeNull();     // nothing opened yet
  });
  test('room cards count only what the room lists: game boards sit on their lessons', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/home' });
    const text = async (name: string) => (await screen.findByRole('article', { name })).textContent ?? '';
    expect(await text('Wzory')).toContain('Lekcje: 2 · Pozycje: 6');
    expect(await text('Partie')).toContain('Lekcje: 4');
    expect(await text('Partie')).not.toContain('Pozycje');
    expect(await text('Końcówki')).toContain('Pozycje: 7');
    expect(await text('Końcówki')).not.toContain('Lekcje');
  });
  test('Kontynuuj shows the lesson opened last and opens it', async () => {
    const store = await withPlayer();
    await store.getState().openLesson('scholars-mate', 's05-board');
    const { history } = mount(<AppRoutes />, { store, path: '/home' });
    const k = await screen.findByRole('article', { name: 'Kontynuuj' });
    expect(within(k).getByText('Mat szkolny')).toBeTruthy();
    fireEvent.click(within(k).getByRole('button', { name: /Kontynuuj/ }));
    await waitFor(() => expect(history.at(-1)).toMatch(/^\/lesson\/scholars-mate/));
  });
  test('a room card opens its room', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/home' });
    fireEvent.click(within(await screen.findByRole('article', { name: 'Wzory' })).getByRole('button'));
    await waitFor(() => expect(history.at(-1)).toBe('/room/patterns'));
  });
  test('the old library address opens home', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/library' });
    await waitFor(() => expect(history.at(-1)).toBe('/home'));
  });
});

describe('a room', () => {
  test('Wzory: lessons first, then its positions', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/room/patterns' });
    expect(await screen.findByRole('article', { name: 'Oczy na f7' })).toBeTruthy();
    expect(card('Mat szkolny')).toBeTruthy();
    expect(card('Mat na ostatniej linii')).toBeTruthy();
    expect(screen.queryByRole('article', { name: 'Lucena' })).toBeNull();          // an endgame lives elsewhere
  });
  test('the f7 family chip filters the room and lists the family in other rooms', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/room/patterns' });
    fireEvent.click(await screen.findByRole('button', { name: 'Atak na f7 i f2' }));
    expect(card('Groźba mata szkolnego')).toBeTruthy();
    expect(screen.queryByRole('article', { name: 'Mat na ostatniej linii' })).toBeNull();
    const elsewhere = screen.getByRole('region', { name: 'Także w innych pokojach' });
    expect(within(elsewhere).getByText('Mat Legala')).toBeTruthy();
    expect(within(elsewhere).getByText('Partia włoska')).toBeTruthy();
    fireEvent.click(within(elsewhere).getByRole('button', { name: /Partia włoska/ }));
    await waitFor(() => expect(history.at(-1)).toMatch(/^\/board\?/));
  });
  test('a short list of positions has no tag chips or search: one position under the f7 filter', async () => {
    const store = await withPlayer();
    mount(<AppRoutes />, { store, path: '/room/patterns' });
    expect(await screen.findByRole('button', { name: 'taktyka', pressed: false })).toBeTruthy();   // 6 positions: chips
    fireEvent.click(screen.getByRole('button', { name: 'Atak na f7 i f2' }));
    expect(screen.queryByRole('button', { name: 'taktyka' })).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
  test('Partie: a game appears once, its lesson and its board on one card', async () => {
    const store = await withPlayer();
    const { history } = mount(<AppRoutes />, { store, path: '/room/games' });
    const legal = await screen.findByRole('article', { name: 'Mat Legala' });
    expect(screen.getAllByRole('article', { name: 'Mat Legala' })).toHaveLength(1);
    expect(screen.queryByRole('article', { name: "Partia w operze Morphy'ego" })).toBeNull();
    fireEvent.click(within(legal).getByRole('button', { name: 'Plansza' }));
    await waitFor(() => expect(history.at(-1)).toMatch(/^\/board\?/));
  });
});
