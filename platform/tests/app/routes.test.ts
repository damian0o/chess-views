import { describe, expect, test } from 'vitest';
import { parseRoute, routeHash, type Route } from '../../src/app/routes';

const IDS = { 'scholars-mate': Array.from({ length: 25 }, (_, i) => `s${String(i + 1).padStart(2, '0')}-x`) };

describe('routes', () => {
  test.each<[string, Route]>([
    ['', { kind: 'players' }],
    ['#/', { kind: 'players' }],
    ['#/home', { kind: 'home' }],
    ['#/settings', { kind: 'settings' }],
    ['#/lesson/scholars-mate', { kind: 'lesson', id: 'scholars-mate' }],
    ['#/lesson/scholars-mate/s05-board', { kind: 'lesson', id: 'scholars-mate', stepId: 's05-board' }],
    ['#/recognise/123/4', { kind: 'recognise', seed: 123, step: 4 }],
  ])('%s', (hash, route) => {
    expect(parseRoute(hash, IDS)).toEqual(route);
    expect(parseRoute(routeHash(route), IDS)).toEqual(route);
  });
  // Review Focus 3
  test('an old lesson link opens the same step', () => {
    expect(parseRoute('#lesson=scholars-mate&step=7', IDS)).toEqual({ kind: 'lesson', id: 'scholars-mate', stepId: 's07-x' });
    expect(parseRoute('#lesson=scholars-mate&step=99', IDS)).toEqual({ kind: 'lesson', id: 'scholars-mate', stepId: 's25-x' });
    expect(parseRoute('#lesson=scholars-mate&step=2&view=roads', IDS)).toEqual({ kind: 'lesson', id: 'scholars-mate', stepId: 's02-x' });
  });
  test.each(['#fen=8%2F8%2F8%2F8%2F8%2F8%2F8%2FK6k+w+-+-+0+1&view=roads', '#pgn=1.+e4&ply=1', '#pos=lucena', '#lesson=nope&step=1', '#view=roads', '#lesson=recognise&seed=5&step=1'])('old link %s goes to the POC with the same hash', (hash) => {
    expect(parseRoute(hash, IDS)).toEqual({ kind: 'poc', hash });
  });
  test.each(['#/nope', '#/recognise/abc/1', '#/recognise/-1/1', '#/recognise/5/0', '#/lesson/', '#garbage'])('%s is not found', (hash) => {
    expect(parseRoute(hash, IDS)).toEqual({ kind: 'notFound' });
  });
});
