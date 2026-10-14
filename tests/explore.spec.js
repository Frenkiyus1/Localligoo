import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/explore.html");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
});

test("Explore loads its artwork and topics without horizontal overflow", async ({ page }, testInfo) => {
  await expect(page).toHaveTitle("Explore — LOCALINGO");
  await expect(page.getByRole("heading", { name: "There's more to discover", exact: true })).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".topic-button")).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath("explore.png"), fullPage: true, animations: "disabled" });
});

test("all four topics support keyboard activation and restore focus after closing", async ({ page }) => {
  for (const title of ["Nature & Wildlife","Local Food","People & Tradition","Festivals & Seasons"]) {
    const button = page.getByRole("button", { name: title, exact: true });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(button).toBeFocused();
  }
});

test("Explore can return home and be reached again through the journey card", async ({ page }) => {
  const nav = page.viewportSize().width <= 640 ? page.locator(".mobile-nav") : page.locator(".desktop-nav");
  await nav.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveTitle("LOCALINGO — From Local to Global");
  await page.locator("#explore").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveTitle("Explore — LOCALINGO");
});

test("clean URL and skip link reach the topics", async ({ page }) => {
  await page.goto("/explore");
  await expect(page).toHaveTitle("Explore — LOCALINGO");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to explore topics" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#topics$/);
  await expect(page.locator("#topics")).toBeFocused();
});
