import { expect, test, type Page } from '@playwright/test';
import { addPlayer, openBoard, pressNext } from './helpers';

const SIZES = [{ width: 390, height: 844 }, { width: 360, height: 640 }];
const inView = async (page: Page, sel: ReturnType<Page['locator']>) => {
  const b = (await sel.boundingBox())!; const vh = page.viewportSize()!.height;
  expect(b.y, 'top in view').toBeGreaterThanOrEqual(0);
  expect(b.y + b.height, 'bottom in view').toBeLessThanOrEqual(vh + 0.5);
};

test.describe('a lesson on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone only');
  for (const size of SIZES) {
    test(`${size.width}×${size.height}: the instruction is in view when a step opens`, async ({ page }) => {
      await page.setViewportSize(size);
      await addPlayer(page, 'Ola');
      for (const step of ['scholars-mate/s01-board', 'lasker-thomas/s03-board']) {
        await page.goto(`./#/lesson/${step}`);
        await inView(page, page.locator('[data-step-text]'));
        await expect(page.getByRole('button', { name: 'Rozumiem, pokaż planszę' })).toBeInViewport();
      }
    });
    test(`${size.width}×${size.height}: after the pull the board, the answers and Next are all in view`, async ({ page }) => {
      await page.setViewportSize(size);
      await addPlayer(page, 'Ola');
      await page.goto('./#/lesson/scholars-mate/s10-houses');
      await openBoard(page);
      await inView(page, page.locator('[data-sheet] [data-board]'));
      await inView(page, page.locator('[data-sheet-body]').getByRole('group').filter({ hasNot: page.locator('[data-option]') }));
      await inView(page, page.locator('[data-dock]').getByRole('button', { name: /^Dalej/ }));
    });
  }
  test('360×640: a long instruction scrolls above the resting board, and its last line clears it', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await addPlayer(page, 'Ola');
    await page.goto('./#/lesson/lasker-thomas/s03-board');
    const back = page.locator('[data-instruction]').getByRole('button', { name: /Wstecz/ });
    await back.scrollIntoViewIfNeeded();
    const b = (await back.boundingBox())!;
    const sheetTop = (await page.locator('[data-sheet]').boundingBox())!.y;
    expect(b.y + b.height).toBeLessThanOrEqual(sheetTop);
    await expect(page.getByRole('button', { name: 'Rozumiem, pokaż planszę' })).toBeInViewport();
  });
  test('Kredki: the control to press now is visibly highlighted, not only marked', async ({ page }) => {
    await addPlayer(page, 'Ola');   // 8–12 opens in Kredki
    await page.goto('./#/lesson/scholars-mate/s01-board');
    await openBoard(page);
    const play = page.locator('[data-dock] [data-highlight="true"]');
    await expect(play).toHaveAccessibleName('Następny ruch');
    const o = await play.evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }; });
    expect(o.style).toBe('solid');
    expect(o.width).toBeGreaterThanOrEqual(3);
  });
  test('360×640: a sheet scrolled down on one step opens at the top of the board on the next', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await addPlayer(page, 'Ola');
    await page.goto('./#/lesson/lasker-thomas/s07-board');
    await openBoard(page);
    const scroller = page.locator('[data-sheet-body] > div').first();
    await scroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await pressNext(page);
    await openBoard(page);
    expect(await page.locator('[data-sheet-body] > div').first().evaluate((el) => el.scrollTop)).toBe(0);
  });
  test('a find-the-move task is played on the sheet and the sheet stays up', async ({ page }) => {
    await addPlayer(page, 'Ola');
    await page.goto('./#/lesson/scholars-mate/s13-territory');
    await openBoard(page);
    const cell = (sq: string) => page.locator('[data-sheet]').getByRole('gridcell', { name: new RegExp(`^${sq}\\b`) });
    await cell('a7').click(); await cell('a6').click();
    await expect(page.getByText('Twój ruch a6: Ojej, to pozwala na mata w 1')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-sheet]')).toHaveAttribute('data-sheet', 'up');
  });
});

test('on a laptop the lesson keeps its two columns and has no sheet', async ({ page, isMobile }) => {
  test.skip(isMobile, 'laptop only');
  await addPlayer(page, 'Ola');
  await page.goto('./#/lesson/lasker-thomas/s07-board');
  const board = (await page.locator('[data-board]').boundingBox())!;
  const card = (await page.getByRole('region', { name: /^Krok/ }).boundingBox())!;
  expect(card.x).toBeGreaterThan(board.x + board.width / 2);
  await expect(page.locator('[data-sheet]')).toHaveCount(0);
});
