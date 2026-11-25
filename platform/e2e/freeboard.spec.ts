import { expect, test } from '@playwright/test';
import { addPlayer } from './helpers';

const OPERA = '[White "Morphy"]\n[Black "Duke of Brunswick and Count Isouard"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

test('the Opera game: step to the end, mate, flip, letters, every view draws', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(String(e)));
  await addPlayer(page, 'Ola');
  await page.goto(`./?${q({ pgn: OPERA, ply: '0' })}#/board`);
  await expect(page.getByText(/Morphy/)).toBeVisible();
  await page.getByRole('button', { name: 'Koniec' }).click();
  await expect(page.getByRole('status', { name: 'Stan partii' })).toHaveText('Mat');
  await page.getByRole('button', { name: /Obróć/ }).click();
  await expect(page.getByRole('gridcell').first()).toHaveAttribute('aria-label', /^h1/);
  await page.getByRole('switch', { name: 'Litery do druku' }).click({ force: true });
  await expect(page.getByRole('img', { name: /biał|czarn/ })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Litery do druku' }).click({ force: true });
  for (const name of ['Szachownica', 'Terytorium', 'Zasięg', 'Drogi', 'Domki królów', 'Romb', 'Bloki', 'Skoczek']) {
    await page.getByRole('button', { name: /Widok/ }).click();
    await page.getByRole('option', { name, exact: true }).click();
    await expect(page.getByRole('grid')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('lichess: a game link loads through the export URL', async ({ page }) => {
  await page.route('https://lichess.org/game/export/**', (r) => r.fulfill({ status: 200, contentType: 'application/x-chess-pgn', body: OPERA }));
  await addPlayer(page, 'Ola');
  await page.goto('./#/board');
  await page.getByRole('button', { name: 'Wczytaj' }).click();
  await page.getByRole('textbox', { name: /Wklej/ }).fill('https://lichess.org/AbCd1234');
  await page.getByRole('dialog').getByRole('button', { name: 'Wczytaj' }).click();
  await expect(page.getByText(/Morphy/)).toBeVisible();
});

// Review Focus 5
test('the free board fits a phone', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone width only');
  await addPlayer(page, 'Ola');
  await page.goto(`./?${q({ pgn: OPERA })}#/board`);
  await expect(page.getByRole('grid')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Wczytaj' }).click();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
