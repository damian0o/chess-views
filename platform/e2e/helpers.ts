import { expect, type Page } from '@playwright/test';

export async function addPlayer(page: Page, name: string, age: '8–12' | '12–16' | 'Dorosły' = '8–12') {
  await page.goto('./');
  await page.getByRole('button', { name: 'Dodaj gracza' }).click();
  await page.getByRole('textbox', { name: 'Imię' }).fill(name);
  await page.getByRole('radio', { name: age }).check({ force: true });
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page).toHaveURL(/#\/home$/);
}

export const nextButton = (page: Page) => page.getByRole('button', { name: /^(Dalej|Zakończ ✓)/ });

/** Answer the current step the way a child might: play the hidden move, try choices or squares until Next opens. */
export async function answerStep(page: Page) {
  const next = nextButton(page);
  const play = page.getByRole('button', { name: /Zagraj ruch/ });
  const tapHint = page.getByText('Dotknij pola na szachownicy');
  for (let guard = 0; guard < 80 && await next.isDisabled(); guard++) {
    if (await play.isVisible()) { await play.click(); continue; }
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
  await expect(nextButton(page)).toBeVisible();
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
  await page.waitForTimeout(350);
  await nextButton(page).click();
  await expect(page).not.toHaveURL(before);
}

/** Press "Zakończ ✓" the same way and expect to land on home. */
export async function pressFinish(page: Page) {
  await page.waitForTimeout(350);
  await nextButton(page).click();
  await expect(page).toHaveURL(/#\/home$/);
}
