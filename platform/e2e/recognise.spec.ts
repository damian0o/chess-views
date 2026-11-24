import { expect, test } from '@playwright/test';
import { addPlayer, answerStep, nextButton, walkLesson } from './helpers';

test('after the game lessons a Recognise round of 8 boards can be answered', async ({ page }) => {
  test.setTimeout(600_000);
  await addPlayer(page, 'Ola');
  for (const id of ['opera-game-lesson', 'legal-mate', 'reti-tartakower', 'lasker-thomas']) await walkLesson(page, id);
  const card = page.getByRole('article', { name: 'Rozpoznaj' });
  await card.getByRole('button', { name: 'Zacznij' }).click();
  await expect(page).toHaveURL(/#\/recognise\/\d+\/1$/);
  for (let i = 0; i < 8; i++) {
    await expect(page.getByRole('img', { name: /white|black/ })).toHaveCount(0);   // blocks only before the answer
    await answerStep(page);
    await nextButton(page).click();
  }
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.getByRole('status')).toHaveText('Runda skończona');
});
