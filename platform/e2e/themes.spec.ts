import { expect, test, type Page } from '@playwright/test';
import { addPlayer } from './helpers';

const CONTRAST = `(sel) => {
  const el = document.querySelector(sel); if (!el) return null;
  const rgb = (c) => (c.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
  const alpha = (c) => { const m = c.match(/[\\d.]+/g) || []; return m.length > 3 ? Number(m[3]) : 1; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let n = el, bg = null;
  while (n && n.nodeType === 1) { const c = getComputedStyle(n).backgroundColor; if (alpha(c) > 0.5) { bg = c; break; } n = n.parentElement; }
  bg = bg || getComputedStyle(document.documentElement).backgroundColor;
  const a = lum(rgb(getComputedStyle(el).color)), b = lum(rgb(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}`;
const LUM = `(sel) => { const el = document.querySelector(sel); const c = getComputedStyle(el).backgroundColor.match(/[\\d.]+/g).slice(0, 3).map(Number);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }`;

async function pick(page: Page, look: string, mode: string) {
  await page.goto('./#/settings');
  await page.getByRole('radio', { name: look }).check({ force: true });
  await page.getByRole('radio', { name: mode, exact: true }).check({ force: true });
}

// Review Focus 5
for (const look of ['Kolorowy', 'Spokojny', 'Prosty']) for (const mode of ['Jasny', 'Ciemny']) {
  test(`${look} / ${mode}: readable text, light board, no overflow`, async ({ page }, info) => {
    await addPlayer(page, 'Ola');
    await pick(page, look, mode);
    await page.goto('./#/home');
    expect(await page.evaluate(`(${CONTRAST})('main h2')`)).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(`(${CONTRAST})('main article button')`)).toBeGreaterThanOrEqual(4.5);
    await page.goto('./#/lesson/scholars-mate/s02-houses');
    await expect(page.getByRole('gridcell').first()).toBeVisible();
    expect(await page.evaluate(`(${LUM})('[data-square="a1"]')`)).toBeGreaterThan(0.45);   // a1 is a dark square
    expect(await page.evaluate(`(${CONTRAST})('section p')`)).toBeGreaterThanOrEqual(4.5);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBe(page.viewportSize()!.width);
    if (info.project.name === 'laptop') {
      const board = await page.getByRole('grid', { name: 'Szachownica' }).boundingBox();
      const card = await page.locator('section').first().boundingBox();
      expect(card!.x).toBeGreaterThan(board!.x + board!.width - 1);   // the card sits beside the board
    }
  });
}
