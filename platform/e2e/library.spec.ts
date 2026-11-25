import { expect, test } from '@playwright/test';
import { addPlayer } from './helpers';

test('open a room from home, search its positions and open one in the free board', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.getByRole('article', { name: 'Końcówki' }).getByRole('button', { name: 'Otwórz' }).click();
  await expect(page).toHaveURL(/#\/room\/endgames$/);
  await expect(page.getByRole('article')).toHaveCount(7);
  await page.getByRole('searchbox', { name: 'Szukaj' }).fill('lucena');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('article').getByRole('button', { name: 'Otwórz' }).click();
  await expect(page).toHaveURL(/#\/board\?/);
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

// Review C1 (release 2): the second library open used to loop; Back used to stay on the board
test('a second position opens, and Back returns to its room', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(String(e)));
  await addPlayer(page, 'Ola');
  await page.goto('./#/room/endgames');
  await page.getByRole('searchbox', { name: 'Szukaj' }).fill('lucena');
  await page.getByRole('article').getByRole('button', { name: 'Otwórz' }).click();
  await expect(page).toHaveURL(/#\/board\?/);
  const first = page.url();
  await page.getByRole('button', { name: 'Końcówki', exact: true }).click();   // ◀ back to the room it came from
  await expect(page).toHaveURL(/#\/room\/endgames$/);
  await page.goto('./#/room/patterns');
  await page.getByRole('searchbox', { name: 'Szukaj' }).fill('back-rank');
  await page.getByRole('article').getByRole('button', { name: 'Otwórz' }).click();
  await expect(page).toHaveURL(/#\/board\?/);
  await expect(page.getByText(/Coś poszło nie tak/)).toHaveCount(0);
  expect(page.url()).not.toBe(first);
  await page.goBack();
  await expect(page).toHaveURL(/#\/room\/patterns/);
  expect(errors).toEqual([]);
});
