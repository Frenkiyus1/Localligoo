import { test, expect } from "@playwright/test";
const correct = ['stilt house', 'brocade', 'plum', 'fireplace', 'hills', 'Pine Forest'];
async function enter(page) {
  await page.goto('/my-house.html');
  await page.getByRole('link', { name: 'Writing — Explorer’s Journal: Write It Down!', exact: true }).click();
  await expect(page).toHaveURL(/writing\.html$/);
  await page.getByRole('button', { name: 'Reply to Alex', exact: true }).click();
}
async function choose(page, answers = correct) {
  for (const [index, answer] of answers.entries()) if (answer) await page.locator(`[data-blank="${index}"]`).selectOption(answer);
}
async function screenshot(page, testInfo, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img:visible').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: 'disabled', style: '.skip-link { visibility: hidden; }' });
}
test('Writing opens the supplied artwork and preserves a draft when rereading Alex’s email', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/my-house.html');
  await page.getByRole('link', { name: /^Writing/ }).click();
  await expect(page).toHaveTitle('Writing · My House — LOCALINGO');
  await expect(page.locator('#guest-screen')).toBeVisible();
  await expect(page.locator('#compose-screen')).toBeHidden();
  await expect(page.locator('#guest-screen .canvas-art')).toHaveAttribute('src', './assets/writing/guest.webp');
  await expect(page.locator('.guest-copy')).toContainText('alex2042002@gmail.com');
  await expect(page.locator('#reply-alex img')).toHaveAttribute('src', './assets/writing/reply-alex.webp');
  await screenshot(page, testInfo, 'writing-guest');
  await page.locator('#reply-alex').click();
  await expect(page.locator('[data-blank]')).toHaveCount(6);
  await expect(page.locator('#check-answers img')).toHaveAttribute('src', './assets/writing/check-answers.webp');
  await expect(page.locator('#check-answers')).toBeDisabled();
  await expect(page.locator('#send-email')).toBeHidden();
  await choose(page, ['stilt house']);
  await expect(page.locator('#check-answers')).toBeDisabled();
  await page.locator('#read-alex').click();
  await expect(page.locator('#guest-screen')).toBeVisible();
  await page.locator('#reply-alex').click();
  await expect(page.locator('[data-blank="0"]')).toHaveValue('stilt house');
  await screenshot(page, testInfo, 'writing-compose');
  expect(errors).toEqual([]);
});
test('wrong answers show corrections and explanations; retry keeps correct answers and gates sending', async ({ page }, testInfo) => {
  await enter(page);
  await choose(page, ['stilt house', 'plum', 'plum', 'fireplace', 'fireplace', 'Pine Forest']);
  await page.locator('#check-answers').click();
  await expect(page.locator('#answer-feedback')).toHaveText('Good try! You got 4/6 correct. Check the red boxes and try again!');
  await expect(page.locator('#reply-text .is-incorrect')).toHaveCount(2);
  await expect(page.locator('#reply-text del')).toHaveText(['plum', 'fireplace']);
  await expect(page.locator('#reply-text .corrected-answer')).toHaveText(['brocade', 'hills']);
  await expect(page.locator('#send-email')).toBeHidden();
  const wrong = page.locator('#reply-text [data-answer="1"]');
  await wrong.click();
  await expect(page.locator('#answer-explanation')).toBeVisible();
  await expect(page.locator('#explanation-art')).toHaveAttribute('src', './assets/writing/explanation-2-incorrect.webp');
  await expect(page.locator('#explanation-art')).toHaveAttribute('alt', /brocade blankets = chăn thổ cẩm/);
  await page.locator('#explanation-art').evaluate(image => image.decode());
  await expect(page.locator('#close-explanation')).toHaveText('Got it!');
  await page.locator('#explanation-art').click({ position: { x: 20, y: 20 } });
  await expect(page.locator('#answer-explanation')).toBeVisible();
  const bubble = await page.locator('#answer-explanation').boundingBox();
  const gotIt = await page.locator('#close-explanation').boundingBox();
  expect(bubble.width).toBeLessThanOrEqual(480);
  expect(gotIt.width).toBeLessThan(bubble.width / 2);
  expect(gotIt.height).toBeGreaterThanOrEqual(44);
  await page.locator('#answer-explanation').screenshot({ path: testInfo.outputPath('writing-incorrect-explanation.png') });
  await expect(page.locator('#answer-explanation')).toBeInViewport();
  await page.locator('#close-explanation').click();
  await expect(page.locator('#answer-explanation')).toBeHidden();
  await expect(wrong).toBeFocused();
  await screenshot(page, testInfo, 'writing-corrections');
  await page.locator('#try-again').click();
  await expect(page.locator('[data-blank="0"]')).toHaveValue('stilt house');
  await expect(page.locator('[data-blank="1"]')).toHaveValue('');
  await expect(page.locator('[data-blank="4"]')).toHaveValue('');
  await expect(page.locator('#check-answers')).toBeDisabled();
  await expect(page.locator('[data-blank="1"]')).toBeFocused();
  await choose(page);
  await page.locator('#check-answers').click();
  await expect(page.locator('#answer-feedback')).toHaveText('Excellent! You got all the answers right!');
  await expect(page.locator('#reply-text [data-correct="true"]')).toHaveCount(6);
  await expect(page.locator('#try-again')).toBeHidden();
  await expect(page.locator('#send-email')).toBeVisible();
});
test('six correct answers send once, allow reading all explanations, and continue to Speaking', async ({ page }, testInfo) => {
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  await enter(page);
  await choose(page);
  await page.locator('#check-answers').click();
  const plum = page.locator('#reply-text [data-answer="2"]');
  await plum.focus();
  await expect(page.locator('#explanation-art')).toHaveAttribute('src', './assets/writing/explanation-3-correct.webp');
  await page.keyboard.press('Escape');
  await expect(page.locator('#answer-explanation')).toBeHidden();
  if (testInfo.project.name === 'desktop') {
    await page.locator('#reply-text [data-answer="0"]').hover();
    await expect(page.locator('#answer-explanation')).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.locator('#answer-explanation')).toBeHidden();
  }
  await screenshot(page, testInfo, 'writing-correct');
  await page.getByRole('button', { name: 'Ready to send', exact: true }).click();
  await expect(page.locator('#sent-screen')).toBeVisible();
  await expect(page.locator('#compose-screen')).toBeHidden();
  await expect(page.locator('#sent-screen')).toContainText('Email sent successfully!');
  await expect(page.locator('.confetti-piece')).toHaveCount(32);
  await expect(page.locator('#view-sent img')).toHaveAttribute('src', './assets/writing/view-sent-email.webp');
  await expect(page.locator('#next-challenge img')).toHaveAttribute('src', './assets/writing/next-challenge.webp');
  await screenshot(page, testInfo, 'writing-sent');
  await page.locator('#view-sent').click();
  await expect(page.locator('#sent-preview')).toBeVisible();
  await expect(page.locator('#sent-email-text select, #sent-email-text del')).toHaveCount(0);
  await expect(page.locator('#sent-email-text [data-correct="true"]')).toHaveCount(6);
  for (let index = 0; index < 6; index++) {
    await page.locator(`#sent-email-text [data-answer="${index}"]`).click();
    await expect(page.locator('#explanation-art')).toHaveAttribute('src', `./assets/writing/explanation-${index + 1}-correct.webp`);
    await expect(page.locator('#explanation-art')).toHaveAttribute('alt', new RegExp(correct[index]));
    await expect(page.locator('#answer-explanation')).toBeInViewport();
    await page.keyboard.press('Escape');
  }
  await screenshot(page, testInfo, 'writing-sent-preview');
  await page.locator('#back-to-sent').click();
  await expect(page.locator('#sent-screen')).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await page.locator('#next-challenge').click();
  await expect(page).toHaveURL(/speaking\.html$/);
});
test('a fresh Writing visit starts a new exercise', async ({ page }) => {
  await enter(page);
  await choose(page);
  await page.locator('#check-answers').click();
  await page.reload();
  await expect(page.locator('#guest-screen')).toBeVisible();
  await page.locator('#reply-alex').click();
  for (let index = 0; index < 6; index++) await expect(page.locator(`[data-blank="${index}"]`)).toHaveValue('');
  await expect(page.locator('#check-answers')).toBeDisabled();
});

test('every blank opens its supplied incorrect and correct explanation images', async ({ page }, testInfo) => {
  await enter(page);
  await choose(page, ['brocade', 'plum', 'fireplace', 'hills', 'Pine Forest', 'stilt house']);
  await page.locator('#check-answers').click();
  await expect(page.locator('#answer-feedback')).toContainText('0/6');
  for (let index = 0; index < 6; index++) {
    await page.locator(`#reply-text [data-answer="${index}"]`).click();
    const image = page.locator('#explanation-art');
    await expect(image).toHaveAttribute('src', `./assets/writing/explanation-${index + 1}-incorrect.webp`);
    await image.evaluate(element => element.decode());
    expect(await image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('#answer-explanation')).toBeInViewport();
    await page.locator('#close-explanation').click();
  }
  await page.locator('#try-again').click();
  await choose(page);
  await page.locator('#check-answers').click();
  for (let index = 0; index < 6; index++) {
    await page.locator(`#reply-text [data-answer="${index}"]`).click();
    const image = page.locator('#explanation-art');
    await expect(image).toHaveAttribute('src', `./assets/writing/explanation-${index + 1}-correct.webp`);
    await image.evaluate(element => element.decode());
    expect(await image.evaluate(element => element.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('#answer-explanation')).toBeInViewport();
    if (index === 5) await page.locator('#answer-explanation').screenshot({ path: testInfo.outputPath('writing-correct-explanation.png') });
    await page.keyboard.press('Escape');
  }
});
