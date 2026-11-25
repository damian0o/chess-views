import { expect, test } from '@playwright/test';
import { addPlayer } from './helpers';

test('add a player and land on home with the lesson groups', async ({ page }) => {
  await addPlayer(page, 'Ola');
  for (const g of ['Wzory', 'Partie']) await expect(page.getByRole('heading', { name: g })).toBeVisible();
  await page.getByRole('button', { name: 'Zmień gracza' }).click();
  await expect(page.getByRole('button', { name: /Ola/ })).toBeVisible();
});
