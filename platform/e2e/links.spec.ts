import { expect, test } from '@playwright/test';
import { addPlayer, pressNext, walkLesson } from './helpers';

// Review Focus 3
test('an old lesson link opens the same step after picking a player', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#lesson=scholars-mate&step=7');
  await expect(page).toHaveURL(/#\/lesson\/scholars-mate\/s07-/);
});
// Review Focus 3 (release 2): old position links open in the new app
test('an old FEN link opens the free board with its view and flip', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#fen=r1bqkbnr%2Fpppp1ppp%2F2n5%2F4p2Q%2F2B1P3%2F8%2FPPPP1PPP%2FRNB1K1NR+b+KQkq+-+3+3&view=roads&flip=1');
  await expect(page).toHaveURL(/#\/board\?/);
  await expect(page.locator('[data-option="roads"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-label', /^h1/);
});
test('an old #pos link opens the library entry', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#pos=opera-game');
  await expect(page.getByText(/Morphy/)).toBeVisible();
});
test('an old Recognise link still goes to the POC', async ({ page }) => {
  await page.goto('./#lesson=recognise&seed=5&step=1');
  await expect(page).toHaveURL(/\/poc\/#lesson=recognise/);
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
  await page.goto('./#/room/games');
  const card = page.getByRole('article', { name: /Mat Legala/ });
  await card.getByRole('button', { name: 'Od nowa' }).click();
  await pressNext(page);
  await page.getByRole('button', { name: 'Partie' }).click();      // ◀ back up from the lesson to its room
  await expect(page).toHaveURL(/#\/room\/games$/);
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
