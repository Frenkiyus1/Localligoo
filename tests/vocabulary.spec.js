import { test, expect } from '@playwright/test';

test('My House New Words opens source vocabulary, plays words and cycles facts', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    window.vocabAudio = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      window.vocabAudio.push(this);
      return play.call(this);
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: null });
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
  const recordings = {
    'Khau cut (traditional gable ornament)': '1 traditional gable ornament.mp3',
    'Roof': '2 roof.mp3',
    'Stairs': '3 stairs.mp3',
    'Timber post / wooden pillar': '4 timber post, wooden pillar.mp3',
    'Ancestral altar': '5 ancestral altar.mp3',
    'Kitchen': '6 kitchen.mp3',
    'Sleeping area': '7 sleeping area.mp3',
    'Handloom': '8 handloom.mp3',
    'Main hearth': '9 main hearth.mp3',
    'Sticky rice steamer': '10 sticky rice steamer.mp3',
    'Wall': '11 wall.mp3',
    'Basket': '12 basket.mp3',
    'Brocade seat pad cushion': '13 brocade seat pad cushion.mp3',
    'Cooking tripod': '14 cooking tripod.mp3',
    'Firewood': '15 firewood.mp3',
  };
  for (const word of await page.locator('.vocab-word').all()) {
    const label = await word.getAttribute('data-word');
    const src = './VOCABULARY/' + recordings[label];
    await expect(word).toHaveAttribute('data-audio', src);
    const responsePromise = page.waitForResponse(response => decodeURIComponent(new URL(response.url()).pathname) === src.slice(1));
    await word.click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toBe('audio/mpeg');
    await expect.poll(() => page.evaluate(() => {
      const audio = window.vocabAudio.at(-1);
      return audio.readyState >= 2 && audio.duration > 0 && !audio.paused && !audio.error;
    })).toBe(true);
    await expect(word).toHaveClass(/is-speaking/);
  }
  expect(await page.evaluate(() => window.vocabAudio.length)).toBe(15);
  expect(await page.evaluate(() => window.vocabAudio.slice(0, -1).every(audio => audio.paused))).toBe(true);
  // Events from an interrupted recording must not reset the latest word.
  await page.evaluate(() => window.vocabAudio[0].dispatchEvent(new Event('ended')));
  await expect(page.locator('#vocab-audio-status')).toHaveText('Listen: Handloom');
  await page.getByRole('button', { name: /^Listen: Kitchen/ }).click();
  await expect(page.locator('#vocab-audio-status')).toHaveText('Try saying: Kitchen');
  await expect(page.locator('.vocab-word.is-speaking')).toHaveCount(0);
  await page.getByRole('button', { name: /^Listen: Roof/ }).click();
  await page.getByRole('button', { name: /^Listen: Stairs/ }).click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  expect(await page.evaluate(() => window.vocabAudio.every(audio => audio.paused))).toBe(true);
  await expect(page.locator('.vocab-word.is-speaking')).toHaveCount(0);
  await page.route('**/VOCABULARY/6%20kitchen.mp3', route => route.fulfill({ status: 404, body: 'Not found' }));
  await page.getByRole('button', { name: /^Listen: Kitchen/ }).click();
  await expect(page.locator('#vocab-audio-status')).toContainText('Could not play');
  await expect(page.locator('.vocab-word.is-speaking')).toHaveCount(0);
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
