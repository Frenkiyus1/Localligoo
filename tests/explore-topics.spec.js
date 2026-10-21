import { test, expect } from "@playwright/test";
const topics = [
  { id: 'nature-wildlife', title: 'Nature & Wildlife', phrases: ['silk scarf', 'plum trees', 'Cuba'] },
  { id: 'local-food', title: 'Local Food', phrases: ['folded in half', 'Tương Bần', 'Smoked Buffalo Meat'] },
  { id: 'people-tradition', title: 'People & Traditions', phrases: ['khau cut', 'hot beeswax', 'khèn'] },
  { id: 'festivals-seasons', title: 'Festivals & Seasons', phrases: ['Miss Dairy Cow', 'Love market', 'bridge made of bamboo'] },
];
test('all four Explore topic links open the supplied stories and return to the topic list', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/explore.html#topics');
  for (const topic of topics) {
    await page.locator(`.topic-${topic.id}`).click();
    await expect(page).toHaveURL(new RegExp(`explore-${topic.id}\\.html$`));
    await expect(page).toHaveTitle(`${topic.title} · Explore — LOCALINGO`);
    await expect(page.locator('h1')).toHaveText(topic.title);
    await expect(page.locator('.topic-story')).toHaveCount(3);
    for (const [index, phrase] of topic.phrases.entries()) {
      await expect(page.locator('.topic-story').nth(index)).toContainText(phrase);
      await expect(page.locator('.story-art').nth(index)).toHaveAttribute('src', `./assets/explore/stories/${topic.id}-${index + 1}.webp`);
    }
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (testInfo.project.name === 'mobile') {
      await expect(page.locator('.story-art').first()).toBeHidden();
      const copy = await page.locator('.story-paragraphs').first().evaluate(el => ({ size: parseFloat(getComputedStyle(el).fontSize), width: el.getBoundingClientRect().width }));
      expect(copy.size).toBeGreaterThanOrEqual(15);
      expect(copy.width).toBeLessThanOrEqual(390);
    } else {
      await expect(page.locator('.story-art').first()).toBeVisible();
    }
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath(`${topic.id}.png`), fullPage: true, animations: 'disabled', style: '.skip-link { visibility: hidden; }' });
    await page.getByRole('link', { name: /^explore$/i }).first().click();
    await expect(page).toHaveURL(/explore\.html$/);
    await expect(page.locator('.explore-topics a')).toHaveCount(4);
  }
  expect(errors).toEqual([]);
});
test('topic links work with the keyboard and the shared Badges control opens normally', async ({ page }) => {
  await page.goto('/explore.html#topics');
  await page.locator('.topic-local-food').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('h1')).toHaveText('Local Food');
  await page.getByRole('button', { name: /^badges$/i }).filter({ visible: true }).click();
  await expect(page.locator('.journey-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('.journey-dialog')).toBeHidden();
});
test.describe('static story pages', () => {
  test.use({ javaScriptEnabled: false });
  test('all direct topic URLs keep their three stories readable without JavaScript', async ({ page }) => {
    for (const topic of topics) {
      await page.goto(`/explore-${topic.id}`);
      await expect(page.locator('h1')).toHaveText(topic.title);
      await expect(page.locator('.topic-story')).toHaveCount(3);
      await expect(page.locator('.story-toolbar, .story-bottom-nav')).toHaveCount(0);
      await expect(page.getByRole('link', { name: /^explore$/i }).first()).toHaveAttribute('href', './explore.html');
    }
  });
});
