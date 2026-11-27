import { expect, test, type Page } from '@playwright/test';
import { nextButton, openBoard } from './helpers';

/**
 * One step of every kind a lesson is made of, checked on a phone and a laptop, in the plain look and in Kredki:
 * the board is square and in view, and every mark drawn over it sits on its own square.
 */
const PATTERNS = [
  { kind: 'board, play the moves', step: 'scholars-mate/s01-board' },
  { kind: 'board, find the move', step: 'lasker-thomas/s03-board' },
  { kind: 'roads', step: 'scholars-mate/s03-roads' },
  { kind: 'roads (a long game)', step: 'opera-game-lesson/s02-roads' },
  { kind: 'king houses', step: 'scholars-mate/s02-houses' },
  { kind: 'territory', step: 'scholars-mate/s05-territory' },
  { kind: 'blocks', step: 'lasker-thomas/s05-blocks' },
];
const LOOKS = [{ family: 'kids', mode: 'light' }, { family: 'crayons', mode: 'light' }, { family: 'crayons', mode: 'dark' }] as const;

const withPlayer = async (page: Page, theme: (typeof LOOKS)[number]) => {
  await page.addInitScript((t) => {
    const p = { version: 2, id: 'p1', name: 'Ola', age: 'kids', experience: 'basic', locale: 'pl', theme: t, pieceStyle: 'images',
      progress: {}, unlockedLayers: ['pieces', 'roads', 'territory', 'shapes'], avatar: 'violet' };
    localStorage.setItem('chess-views:profiles', JSON.stringify({ profiles: { p1: p } })); localStorage.setItem('chess-views:current-player', 'p1');
  }, theme);
};

/** How far (px) each mark's centre is from its square's centre, and the board's shape and place. */
const geometry = (page: Page) => page.evaluate(() => {
  const board = document.querySelector('[data-board]')!.getBoundingClientRect();
  const centre = (r: DOMRect) => [r.x + r.width / 2, r.y + r.height / 2] as const;
  const off = (mark: Element, sq: string, part: Element) => {
    const [sx, sy] = centre(document.querySelector(`[data-square="${sq}"]`)!.getBoundingClientRect());
    const [mx, my] = centre(part.getBoundingClientRect());
    return { mark: `${mark.tagName}@${sq}`, d: Math.hypot(sx - mx, sy - my) };
  };
  const marks = [
    ...[...document.querySelectorAll<SVGGElement>('[data-ring]')].map((g) => off(g, g.dataset.ring!, g.querySelector('circle')!)),
    ...[...document.querySelectorAll<SVGGElement>('[data-guard]')].map((g) => off(g, g.dataset.guard!, g)),
  ];
  const blocks = [...document.querySelectorAll<HTMLElement>('[data-block]')].map((b) => {
    const cell = b.closest('[data-square]')!.getBoundingClientRect(), r = b.getBoundingClientRect();
    return r.x >= cell.x - 1 && r.y >= cell.y - 1 && r.right <= cell.right + 1 && r.bottom <= cell.bottom + 1;
  });
  const dock = document.querySelector('[data-dock]')?.getBoundingClientRect();
  const roads = document.querySelector('[data-layer="roads"]')?.getBoundingClientRect();
  return {
    w: board.width, h: board.height, left: board.left, right: board.right, top: board.top, bottom: board.bottom,
    dockTop: dock && dock.height ? dock.top : null, vw: innerWidth,
    roads: roads ? [roads.x - board.x, roads.y - board.y, roads.width - board.width, roads.height - board.height] : null,
    marks, blocks, houses: document.querySelectorAll('[data-house]').length, owners: document.querySelectorAll('[data-owner]').length,
  };
});

for (const look of LOOKS) {
  test.describe(`lesson patterns in ${look.family}/${look.mode}`, () => {
    for (const p of PATTERNS) {
      test(`${p.kind}: the board is square and in view, every mark on its square`, async ({ page, isMobile }) => {
        await withPlayer(page, look);
        await page.goto(`./#/lesson/${p.step}`);
        if (isMobile) {
          await expect(page.locator('[data-step-text]')).toBeVisible();
          expect(await page.evaluate(() => [scrollY, document.scrollingElement!.scrollHeight - innerHeight]), 'the instruction page does not scroll').toEqual([0, 0]);
        }
        await openBoard(page);
        const g = await geometry(page);
        expect(Math.abs(g.w - g.h), 'square board').toBeLessThan(1);
        expect(g.left).toBeGreaterThanOrEqual(0);
        expect(g.right).toBeLessThanOrEqual(g.vw + 0.5);
        expect(g.top).toBeGreaterThanOrEqual(0);
        if (isMobile) expect(g.bottom, 'the board ends above the dock').toBeLessThanOrEqual(g.dockTop! + 0.5);
        if (g.roads) for (const v of g.roads) expect(Math.abs(v), 'the roads layer covers exactly the board').toBeLessThan(1);
        for (const m of g.marks) expect(m.d, `${m.mark} on its square`).toBeLessThan(1.5);
        expect(g.blocks.every(Boolean), 'every block inside its square').toBe(true);
        if (p.kind === 'roads') expect(g.marks.length).toBeGreaterThan(0);
        if (p.kind === 'king houses') expect(g.houses).toBeGreaterThan(0);
        if (p.kind === 'territory') expect(g.owners).toBeGreaterThan(0);
        if (p.kind === 'blocks') expect(g.blocks.length).toBeGreaterThan(0);
      });
    }
  });
}

test('on a phone, after Next from a scrolled board the new instruction starts at the top', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');
  await withPlayer(page, LOOKS[1]);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('./#/lesson/opera-game-lesson/s02-roads');
  await openBoard(page);
  await page.locator('[data-sheet-body] > .overflow-y-auto').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(350);
  await nextButton(page).click();
  await expect(page.locator('[data-sheet]')).toHaveAttribute('data-sheet', 'down');
  await expect(page.locator('[data-step-text]')).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
