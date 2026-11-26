import { expect, type Page } from '@playwright/test';

export async function addPlayer(page: Page, name: string, age: '8–12' | '12–16' | 'Dorosły' = '8–12') {
  await page.goto('./');
  await page.getByRole('button', { name: 'Dodaj gracza' }).click();
  await page.getByRole('textbox', { name: 'Imię' }).fill(name);
  await page.getByRole('radio', { name: age }).check({ force: true });
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/#\/home$/);
}

/** On a phone a step opens on its instruction: pull the board sheet up (a no-op on a laptop or when it is already up). */
export async function openBoard(page: Page) {
  await expect(page.locator('[data-step-text]')).toBeVisible();   // the step is on screen (either layout)
  const handle = page.getByRole('button', { name: 'Rozumiem, pokaż planszę' });
  if (await handle.isVisible()) {
    await handle.click({ force: true });   // after the reading pause the edge nudges, so it is never 'stable'
    await expect(page.locator('[data-sheet]')).toHaveAttribute('data-sheet', 'up');
    await expect.poll(async () => (await page.locator('[data-sheet]').boundingBox())?.y).toBe(0);   // slid all the way up
  }
}

export const nextButton = (page: Page) => page.getByRole('button', { name: /^(Dalej|Zakończ ✓)/ });

/**
 * Answer the current step the way a child might: on a find-the-move step tap squares until some move is
 * played, then Show the answer if it was not right; try choices or squares until Next opens.
 */
export async function answerStep(page: Page) {
  const next = nextButton(page);
  const showAnswer = page.getByRole('button', { name: 'Pokaż odpowiedź' });
  const verdict = page.getByText(/^(Twój ruch |Tu silnik nie sprawdzi|Silnik myśli)/);
  await openBoard(page);
  const tapHint = page.getByText('Dotknij pola na szachownicy');
  const playHint = page.getByText('Naciskaj ▶ aż do ostatniego ruchu');
  for (let guard = 0; guard < 80 && await next.isDisabled(); guard++) {
    if (await playHint.isVisible()) { await page.getByRole('button', { name: 'Następny ruch' }).click(); continue; }
    if (await showAnswer.isVisible()) { await showAnswer.click(); continue; }
    if (await page.getByRole('gridcell').first().getAttribute('aria-disabled') !== 'true' && !(await tapHint.isVisible())) {
      // A find-the-move step: the board takes taps. Tap through the squares until a move is played, then wait for the verdict.
      const cells = page.getByRole('gridcell');
      for (let i = 0; i < 64 && !(await verdict.isVisible()); i++) await cells.nth(i).click();
      await expect.poll(async () => (await next.isEnabled()) || (await showAnswer.isVisible()), { timeout: 30_000 }).toBe(true);
      continue;
    }
    if (await tapHint.isVisible()) {
      const cells = page.getByRole('gridcell');
      for (let i = 0; i < 64 && await next.isDisabled(); i++) await cells.nth(i).click();
      continue;
    }
    const options = page.getByRole('region').or(page.locator('section')).getByRole('group').getByRole('button');
    const n = await options.count();
    for (let i = 0; i < n; i++) { const b = options.nth(i); if (await b.isEnabled()) { await b.click(); break; } }
  }
  await expect(next).toBeEnabled();
}

/** Walk a lesson from its first step to the end; lands on home. */
export async function walkLesson(page: Page, id: string) {
  await page.goto(`./#/lesson/${id}`);
  await expect(page.locator('[data-step-text]')).toBeVisible();
  for (let guard = 0; guard < 80; guard++) {
    await answerStep(page);
    const finishing = (await nextButton(page).textContent())?.startsWith('Zakończ');
    if (finishing) { await pressFinish(page); break; }
    await pressNext(page);
  }
  await expect(page).toHaveURL(/#\/home$/);
}

/** Press Next once the double-tap window (300 ms after a step change) has passed, and expect the step to move. */
export async function pressNext(page: Page) {
  const before = page.url();
  await openBoard(page);
  await page.waitForTimeout(350);
  await nextButton(page).click();
  await expect(page).not.toHaveURL(before);
}

/** Press "Zakończ ✓" the same way and expect to land on home. */
export async function pressFinish(page: Page) {
  await openBoard(page);
  await page.waitForTimeout(350);
  await nextButton(page).click();
  await expect(page).toHaveURL(/#\/home$/);
}
