import { expect, test } from '@playwright/test';
import { addPlayer, openBoard } from './helpers';

/** Give the current player some unlocked options (the profile store is the approved saving). */
async function unlock(page: import('@playwright/test').Page, ids: string[]) {
  await page.evaluate((ids) => {
    const all = JSON.parse(localStorage.getItem('chess-views:profiles')!);
    const id = localStorage.getItem('chess-views:current-player')!;
    all.profiles[id].unlocked = ids;
    localStorage.setItem('chess-views:profiles', JSON.stringify(all));
  }, ids);
}

test('a lesson step mixes roads and king houses on one board', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(String(e)));
  await addPlayer(page, 'Ola');
  await unlock(page, ['kings']);
  await page.reload();               // load the edited profile before the app saves its own copy again
  await page.goto('./#/lesson/scholars-mate/s03-roads');
  await openBoard(page);
  const roads = page.locator('[data-option="roads"]');
  const kings = page.locator('[data-option="kings"]');
  await expect(roads).toHaveAttribute('aria-pressed', 'true');
  await kings.click();
  await expect(kings).toHaveAttribute('aria-pressed', 'true');
  await expect(roads).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-layer="roads"]')).toHaveCount(1);
  expect(await page.locator('[data-house]').count()).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('on a recall step every option is disabled', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#/lesson/scholars-mate/s07-blocks');
  await openBoard(page);
  const opts = page.locator('[data-option]');
  expect(await opts.count()).toBeGreaterThan(0);
  for (let i = 0; i < await opts.count(); i++) await expect(opts.nth(i)).toBeDisabled();
});

test('390×844: the picker rows are in view in the sheet and the board keeps its width', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  await page.setViewportSize({ width: 390, height: 844 });
  await addPlayer(page, 'Ola');
  await page.goto('./#/lesson/scholars-mate/s03-roads');
  await openBoard(page);
  // The board's width before the picker: its own cap, min(92vw, 34rem) = 358.8 px at 390 wide.
  const board = (await page.locator('[data-sheet] [data-board]').boundingBox())!;
  expect(board.width).toBeGreaterThanOrEqual(358);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const rows = page.locator('[data-look-picker] [role="group"]');
  expect(await rows.count()).toBeGreaterThan(0);
  for (let i = 0; i < await rows.count(); i++) {
    await rows.nth(i).scrollIntoViewIfNeeded();
    const b = (await rows.nth(i).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390.5);
  }
});

test('Final: 390 wide, no picker row overflows, so no label is cut', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  await page.setViewportSize({ width: 390, height: 844 });
  await addPlayer(page, 'Ola');
  await page.goto('./#/lesson/scholars-mate/s03-roads');      // Strategia shows Terytorium 🔒 and Domki króla 🔒
  await openBoard(page);
  // Measure real edges, not scrollWidth/clientWidth: those round fractional widths in opposite directions and
  // read 1–2 px "over" even when the row has room to spare.
  const over = await page.locator('[data-look-picker] [role="group"]').evaluateAll((rows) => rows.map((row) => {
    const buttons = [...row.querySelectorAll('[data-option]')];
    const right = Math.max(...buttons.map((b) => b.getBoundingClientRect().right));
    const scroller = buttons[0]!.parentElement!.getBoundingClientRect();
    return right - Math.min(scroller.right, row.getBoundingClientRect().right);
  }));
  expect(over.length).toBeGreaterThan(0);
  // Under 1 px is invisible. Nunito is not loaded, so each device uses its system font: the Mac and the iPhone
  // (San Francisco) leave 9+ px spare in the tightest row; CI's wider Linux font comes out 0.58 px over.
  expect(Math.max(...over)).toBeLessThanOrEqual(1);
});
