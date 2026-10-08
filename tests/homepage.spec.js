import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".page-art").evaluate((image) => image.decode());
  await page.locator(".element-visual img").evaluateAll((images) =>
    Promise.all(images.map((image) => image.decode())),
  );
});

test("homepage loads every asset without horizontal overflow", async ({ page }, testInfo) => {
  await expect(page).toHaveTitle("LOCALINGO — From Local to Global");
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    imagesLoaded: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  }));
  expect(state.overflow).toBe(false);
  expect(state.imagesLoaded).toBe(true);
  await expect(page.getByRole("heading", { name: "Your English journey", exact: true })).toBeAttached();
  await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true, animations: "disabled" });
});

test("start learning and navigation reach the journey controls", async ({ page }) => {
  await page.getByRole("link", { name: "Start learning", exact: true }).click();
  await expect(page).toHaveURL(/#journey$/);
  const nav = page.viewportSize().width <= 640 ? page.locator(".mobile-nav") : page.locator(".desktop-nav");
  await nav.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page).toHaveURL(/#explore$/);
  await expect(page.locator("#explore")).toBeInViewport();
});

test("journey buttons support keyboard activation, Escape and focus restoration", async ({ page }) => {
  for (const [id, title] of [
    ["learn", "Learn with Purpose"],
    ["explore", "Learn by Exploring"],
    ["practice", "Practice your English"],
  ]) {
    const button = page.locator("#" + id);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(button).toBeFocused();
  }
});

test("badges introduction can be opened and closed", async ({ page }) => {
  const nav = page.viewportSize().width <= 640 ? page.locator(".mobile-nav") : page.locator(".desktop-nav");
  await nav.getByRole("button", { name: "Badges", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your badges", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to your journey", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
