import { expect, test } from '@playwright/test';
import { addPlayer, pressNext, walkLesson } from './helpers';

// Review Focus 3
test('an old lesson link opens the same step after picking a player', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#lesson=scholars-mate&step=7');
  await expect(page).toHaveURL(/#\/lesson\/scholars-mate\/s07-/);
});
test('an old position link goes to the POC under /poc/', async ({ page }) => {
  await page.goto('./#fen=r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2B1P3%2F8%2FPPPP1PPP%2FRNB1K1NR+b+KQkq+-+3+3&view=roads');
  await expect(page).toHaveURL(/\/poc\/#fen=/);
  await expect(page.locator('.board .sq').first()).toBeVisible();
});
test('the POC works by itself under /poc/', async ({ page }) => {
  await page.goto('./poc/');
  await expect(page.locator('.board .sq')).toHaveCount(64);
});
test('a link before any player shows Kto gra? first, then the asked-for lesson', async ({ page }) => {
  await page.goto('./#/lesson/legal-mate');
  await expect(page.getByRole('heading', { name: 'Kto gra?' })).toBeVisible();
  await page.getByRole('button', { name: 'Dodaj gracza' }).click();
  await page.getByRole('textbox', { name: 'Imię' }).fill('Kuba');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/#\/lesson\/legal-mate\/s01-/);
});

// Review C1: two ways that used to blank the page
test('Od nowa while the lesson is still in memory opens its first step', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await walkLesson(page, 'legal-mate');
  const card = page.getByRole('article', { name: /Mat Legala/ });
  await card.getByRole('button', { name: 'Od nowa' }).click();
  await pressNext(page);
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('article', { name: /Mat Legala/ }).getByRole('button', { name: 'Od nowa' }).click();
  await expect(page).toHaveURL(/#\/lesson\/legal-mate\/s01-/);
  await expect(page.getByRole('grid')).toBeVisible();
});
test('an old lesson link pasted inside the open lesson opens that step', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#/lesson/scholars-mate/s03-roads');
  await expect(page.getByRole('grid')).toBeVisible();
  await page.evaluate(() => { location.hash = '#lesson=scholars-mate&step=7'; });
  await expect(page).toHaveURL(/#\/lesson\/scholars-mate\/s07-/);
  await expect(page.getByRole('grid')).toBeVisible();
});
