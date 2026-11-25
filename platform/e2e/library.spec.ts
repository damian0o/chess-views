import { expect, test } from '@playwright/test';
import { addPlayer } from './helpers';

test('search the library and open an entry in the free board', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.getByRole('article', { name: 'Biblioteka' }).getByRole('button', { name: 'Otwórz' }).click();
  await expect(page.getByRole('article')).toHaveCount(25);
  await page.getByRole('searchbox', { name: 'Szukaj' }).fill('lucena');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('article').getByRole('button', { name: 'Otwórz' }).click();
  await expect(page).toHaveURL(/#\/board$/);
  await expect(page.getByRole('grid')).toBeVisible();
});

// Review Focus 5
test('the print sheet fits one A4 page and nothing else prints', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#/board');
  await page.getByRole('button', { name: 'Drukuj' }).click();
  await expect(page.getByTestId('print-sheet')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  const box = await page.getByTestId('print-sheet').boundingBox();
  expect(box!.height).toBeLessThan(1123 - 2 * 53);   // A4 at 96 dpi minus the 14 mm margins
  expect(await page.getByRole('button', { name: 'Drukuj' }).isVisible()).toBe(false);
});
