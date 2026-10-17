import { test, expect } from '@playwright/test';

test('My House New Words opens source vocabulary, plays words and cycles facts', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.pronounced = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel() {}, getVoices() { return []; }, speak(utterance) { window.pronounced.push({ text: utterance.text, lang: utterance.lang }); utterance.onend?.(); },
    } });
  });
  await page.goto('/explore.html');
  await expect(page.locator('#vocabulary, .vocabulary-link')).toHaveCount(0);
  await expect(page.locator('script[src*="vocabulary"], link[href*="vocabulary"]')).toHaveCount(0);
  await page.goto('/my-house.html');
  await page.getByRole('link', { name: 'New Words — House vocabulary' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/my-house\.html#vocabulary$/);
  await expect(page.locator('#vocabulary')).toBeFocused();
  await expect(page.locator('.vocab-word')).toHaveCount(15);
  await page.locator('.vocabulary img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
  for (const word of await page.locator('.vocab-word').all()) {
    await word.click();
  }
  expect(await page.evaluate(() => window.pronounced)).toHaveLength(15);
  expect(await page.evaluate(() => window.pronounced.every(item => item.lang === 'en-US'))).toBe(true);
  await page.evaluate(() => { Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: null }); });
  await page.getByRole('button', { name: /^Listen: Kitchen/ }).click();
  await expect(page.locator('#vocab-audio-status')).toContainText('unavailable');
  for (const expected of [2, 3, 1]) {
    await page.locator('.vocab-fact:not([hidden]) button').click();
    await expect(page.locator('.vocab-fact-position')).toHaveText(`Fact ${expected} of 3`);
    await expect(page.locator('.vocab-fact:not([hidden])')).toHaveAttribute('data-fact', String(expected));
    await expect(page.locator('.vocab-fact:not([hidden]) button')).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#vocab-audio-status').evaluate(el => { el.textContent = 'Tap a word to hear its English pronunciation.'; });
  await page.locator('.vocabulary').screenshot({ path: testInfo.outputPath('vocabulary.png'), animations: 'disabled', style: '.skip-link { visibility: hidden; }' });
});

test('every footer has left logo and bold right contact details without overflow', async ({ page }, testInfo) => {
  for (const path of ['/', '/explore.html', '/learn.html', '/my-house.html', '/speaking.html']) {
    await page.goto(path);
    const footer = page.locator('.site-footer');
    await expect(footer).toHaveCount(1);
    await expect(footer.locator('.footer-tagline')).toHaveText('LOCALINGO FROM LOCAL TO GLOBAL');
    await expect(footer.locator('.footer-contact-title')).toHaveText('CONTACT US:');
    await expect(footer.locator('.footer-email')).toHaveAttribute('href', 'mailto:localingo.workspace@gmail.com');
    await expect(footer.locator('.footer-address')).toHaveText('2 Pham Van Dong, Cau Giay, Ha Noi');
    await expect(footer.locator('.footer-icon')).toHaveCount(2);
    const layout = await footer.evaluate(el => {
      const logo = el.querySelector('.footer-logo').getBoundingClientRect();
      const details = el.querySelector('.footer-details').getBoundingClientRect();
      return { gap: details.left - logo.right, weight: getComputedStyle(el.querySelector('.footer-contact')).fontWeight };
    });
    expect(layout.gap).toBeGreaterThan(0);
    expect(Number(layout.weight)).toBeGreaterThanOrEqual(700);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (path === '/') await footer.screenshot({ path: testInfo.outputPath('footer.png'), animations: 'disabled' });
  }
});
