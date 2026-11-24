import { expect, test } from '@playwright/test';
import { addPlayer, answerStep, nextButton, pressNext, walkLesson } from './helpers';

const LESSONS = ['scholars-mate', 'eyes-on-f7', 'opera-game-lesson', 'legal-mate', 'reti-tartakower', 'lasker-thomas'];

test('every lesson can be walked to the end and shows as finished', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'the long walks run on the phone; the laptop checks layout and themes');
  test.setTimeout(600_000);
  await addPlayer(page, 'Ola');
  for (const id of LESSONS) await walkLesson(page, id);
  await expect(page.getByText(/Ukończone ✓/)).toHaveCount(LESSONS.length);
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
