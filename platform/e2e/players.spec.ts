import { expect, test } from '@playwright/test';
import { addPlayer } from './helpers';

test('add a player and land on home with the lesson groups', async ({ page }) => {
  await addPlayer(page, 'Ola');
  for (const g of ['Wzory', 'Partie']) await expect(page.getByRole('heading', { name: g })).toBeVisible();
  await page.getByRole('button', { name: 'Zmień gracza' }).click();
  await expect(page.getByRole('button', { name: /Ola/ })).toBeVisible();
});

test('the first screen, with and without the new-player form, fits the phone and does not scroll', async ({ page }) => {
  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(size);
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Dodaj gracza' })).toBeVisible();
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: 'Dodaj gracza' }).click();
    await expect(page.getByRole('textbox', { name: 'Imię' })).toBeVisible();
    expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
  }
});
