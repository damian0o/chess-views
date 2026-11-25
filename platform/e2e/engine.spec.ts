import { expect, test } from '@playwright/test';
import { addPlayer } from './helpers';

const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3';
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

test('the real Stockfish evaluates the Scholar threat and grades a guess', async ({ page }) => {
  test.setTimeout(120_000);
  await addPlayer(page, 'Ola');
  await page.goto(`./?${q({ fen: SCHOLAR, view: 'engine' })}#/board`);
  await expect(page.locator('[data-arrow]').first()).toBeAttached({ timeout: 60_000 });   // a straight vertical arrow has zero width
  const arrows = await page.locator('[data-arrow]').evaluateAll((els) => els.map((e) => e.getAttribute('data-arrow')));
  expect(arrows.some((a) => ['d8e7', 'd8f6', 'g7g6', 'g8h6'].includes(a!))).toBe(true);   // the defences the lesson teaches
  await page.getByRole('switch', { name: 'Zgadnij ruch' }).click({ force: true });
  await page.getByRole('gridcell', { name: /^d8\b/ }).click();
  await page.getByRole('gridcell', { name: /^e7\b/ }).click();
  await expect(page.getByText(/Twój ruch He7/)).toBeVisible({ timeout: 60_000 });
});

// Review Focus 2
test('a blocked engine says so', async ({ page }) => {
  await page.route('**/engine/stockfish-19-lite-single.js', (r) => r.abort());
  await addPlayer(page, 'Ola');
  await page.goto(`./?${q({ fen: SCHOLAR, view: 'engine' })}#/board`);
  await expect(page.getByText('Silnik nie wystartował w tej przeglądarce')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Spróbuj jeszcze raz' })).toBeVisible();
});
