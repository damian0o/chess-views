import { expect, test } from '@playwright/test';
import { addPlayer, openBoard } from './helpers';

const style = (sel: string, prop: string) => `getComputedStyle(document.querySelector('${sel}')).${prop}`;

test('Kredki: squares are coloured in crayon, pieces and square names stay sharp', async ({ page }) => {
  await addPlayer(page, 'Ola');   // 8–12 starts on Kredki
  await page.goto('./#/lesson/scholars-mate/s02-houses');
  await expect(page.getByRole('gridcell').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.family)).toBe('crayons');
  expect(await page.evaluate(style('[data-square="a1"]', 'backgroundImage'))).toContain('data:image/svg+xml');
  expect(await page.evaluate(style('[data-square="a1"] img', 'filter'))).toBe('none');
  expect(await page.evaluate(style('[data-square-name]', 'filter'))).toBe('none');
});

// Review Focus 4
test('Kredki: the print sheet prints without paper lines or handwriting colour', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#/board');
  await page.getByRole('button', { name: 'Drukuj' }).click();
  await expect(page.getByTestId('print-sheet')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundImage)).toBe('none');
  expect(await page.evaluate(style('#print-sheet h1', 'color'))).toBe('rgb(0, 0, 0)');
});

// Review Focus 3
test('Kredki: roads are drawn in crayon under sharp pieces; letters and square names stay sharp', async ({ page }) => {
  await page.addInitScript(() => {
    const p = { version: 2, id: 'p1', name: 'Ola', age: 'kids', experience: 'basic', locale: 'pl', theme: { family: 'crayons', mode: 'light' }, pieceStyle: 'images',
      progress: {}, unlockedLayers: ['pieces', 'roads', 'territory', 'shapes'], avatar: 'violet' };
    localStorage.setItem('chess-views:profiles', JSON.stringify({ profiles: { p1: p } })); localStorage.setItem('chess-views:current-player', 'p1');
  });
  await page.goto('./#/lesson/eyes-on-f7/s03-roads');
  await openBoard(page);
  await expect(page.locator('[data-layer="roads"]')).toBeVisible();
  expect(await page.evaluate(style('[data-layer="roads"]', 'filter'))).toContain('cv-stroke');
  const c4 = (await page.locator('[data-square="c4"]').boundingBox())!;
  expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.tagName, [c4.x + c4.width / 2, c4.y + c4.height / 2])).toBe('IMG');
  await page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem('chess-views:profiles')!); all.profiles.p1.pieceStyle = 'letters';
    localStorage.setItem('chess-views:profiles', JSON.stringify(all));
  });
  await page.reload();
  await expect(page.locator('[data-square="c4"] span[aria-hidden]').first()).toBeVisible();
  expect(await page.evaluate(style('[data-square="c4"] span[aria-hidden]', 'filter'))).toBe('none');
  expect(await page.evaluate(style('[data-square-name]', 'filter'))).toBe('none');
});

test('Kredki: blocks get a hand-drawn edge', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#/lesson/eyes-on-f7/s02-blocks');
  await expect(page.locator('[data-block]').first()).toBeVisible();
  expect(await page.evaluate(style('[data-block]', 'filter'))).toContain('cv-rough');
});

// Final review I1: with square names off the board root is also .rounded-card; its frame must still sit outside the squares.
test('Kredki: the board frame sits outside the squares with square names off too', async ({ page }) => {
  await page.addInitScript(() => {
    const p = { version: 2, id: 'p1', name: 'Ola', age: 'kids', experience: 'basic', locale: 'pl', theme: { family: 'crayons', mode: 'light' }, pieceStyle: 'images',
      squareNames: false, progress: {}, unlockedLayers: ['pieces'], avatar: 'violet' };
    localStorage.setItem('chess-views:profiles', JSON.stringify({ profiles: { p1: p } })); localStorage.setItem('chess-views:current-player', 'p1');
  });
  await page.goto('./#/lesson/scholars-mate/s01-board');
  await expect(page.locator('[data-board]')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-board]')!, '::before').top)).toBe('-7px');
});

// Final review I2: Kredki changes the heading face, not the sizes each screen chose.
test('Kredki: headings keep their own sizes', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await expect(page.locator('header h1')).toBeVisible();
  expect(await page.evaluate(style('header h1', 'fontSize'))).toBe('20px');   // TopBar: text-xl
  await page.goto('./#/board');
  await page.getByRole('button', { name: 'Drukuj' }).click();
  await expect(page.getByTestId('print-sheet')).toBeVisible();
  expect(await page.evaluate(style('#print-sheet h1', 'fontSize'))).toBe('24px');   // text-2xl
});
