import { expect, test } from '@playwright/test';
import { addPlayer, answerStep, nextButton, pressNext, walkLesson } from './helpers';

const LESSONS = ['scholars-mate', 'eyes-on-f7', 'opera-game-lesson', 'legal-mate', 'reti-tartakower', 'lasker-thomas'];

test('every lesson can be walked to the end and shows as finished', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'the long walks run on the phone; the laptop checks layout and themes');
  test.setTimeout(600_000);
  await addPlayer(page, 'Ola');
  for (const id of LESSONS) await walkLesson(page, id);
  // Lessons live in their rooms now: two pattern lessons and four game lessons, all finished.
  await page.goto('./#/room/patterns');
  await expect(page.getByText(/Ukończone ✓/)).toHaveCount(2);
  await page.goto('./#/room/games');
  await expect(page.getByText(/Ukończone ✓/)).toHaveCount(4);
});

// Review Focus 4
test('a reload mid-lesson reopens the same step with the question asked again', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#/lesson/scholars-mate');
  for (let i = 0; i < 5; i++) { await answerStep(page); await pressNext(page); }
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.getByText('Dotknij pola na szachownicy')).toBeVisible();
  await expect(nextButton(page)).toBeDisabled();
});

test('a find-the-move step is judged by the real engine: a6 allows mate, Qe7 also stops it', async ({ page }) => {
  await addPlayer(page, 'Ola');
  await page.goto('./#/lesson/scholars-mate/s13-territory');
  const cell = (sq: string) => page.getByRole('gridcell', { name: new RegExp(`^${sq}\\b`) });
  await expect(page.getByText('Dotknij bierki, potem pola, na które idzie')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pokaż odpowiedź' })).toHaveCount(0);
  await cell('a7').click(); await cell('a6').click();
  await expect(page.getByText('Twój ruch a6: Ojej, to pozwala na mata w 1')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Pokaż odpowiedź' })).toBeVisible();
  await expect(nextButton(page)).toBeDisabled();
  await cell('d8').click(); await cell('e7').click();
  await expect(page.getByText(/^Twój ruch He7: (Najlepszy!|Równie dobry|Dobry)$/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('W partii: g6')).toBeVisible();
  await expect(nextButton(page)).toBeEnabled();
});
