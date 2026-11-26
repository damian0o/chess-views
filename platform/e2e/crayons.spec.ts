import { expect, test } from '@playwright/test';
import { addPlayer } from './helpers';

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
