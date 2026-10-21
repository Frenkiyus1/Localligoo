import { test, expect } from "@playwright/test";
const key = "localingo.progress.v1";
const speaking = ["house-1", "house-2", "house-3", "house-4", "house-5"];
const lessons = ["vocabulary", "pronunciation", "grammar-magic", "grammar-tidy", "reading-hunt", "reading-home", "listening", "writing", "speaking"];
async function state(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key); }
async function shot(page, testInfo, name) {
 await page.locator(".page-art").evaluate(image => image.decode());
 await page.evaluate(() => document.fonts.ready);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.screenshot({ path: testInfo.outputPath(name + ".png"), fullPage: true, animations: "disabled", style: ".skip-link { visibility: hidden; }" });
}
test("Learn shows unit progress out of four instead of speaking questions", async ({ page }, testInfo) => {
 await page.goto("/learn.html");
 await expect(page.locator("[data-unit-count]")).toHaveText(["0/4 units completed", "0/4 units completed"]);
 await expect(page.locator(".art-progress progress")).toHaveJSProperty("max", 4);
 await expect(page.locator(".art-progress progress")).toHaveJSProperty("value", 0);
 await expect(page.locator(".art-progress progress")).toHaveAccessibleName("Units completed");
 await expect(page.locator("[data-speaking-count],[data-badge-status]")).toHaveCount(0);
 await shot(page, testInfo, "learn-unit-progress-empty");
});
test("old Speaking and Explore progress are preserved and opening a unit does not complete it", async ({ page }) => {
 await page.goto("/learn.html");
 await page.evaluate(({ key, speaking }) => localStorage.setItem(key, JSON.stringify({ speakingVersion: 2, speaking, explore: { 1: 2 } })), { key, speaking });
 await page.reload();
 await expect(page.locator(".art-progress [data-unit-count]")).toHaveText("0/4 units completed");
 await page.getByRole("button", { name: "Start My New School", exact: true }).click();
 await page.keyboard.press("Escape");
 await page.getByRole("link", { name: "Start My House", exact: true }).click();
 await expect(page.locator("[data-speaking-count],[data-speaking-progress]")).toHaveCount(0);
 expect((await state(page)).speaking).toEqual(speaking);
 expect((await state(page)).explore).toEqual({ 1: 2 });
 await page.goto("/learn.html");
 await expect(page.locator(".art-progress [data-unit-count]")).toHaveText("0/4 units completed");
});
test("finishing the final activity awards one unit, syncs across tabs and survives replay and reload", async ({ page, context }, testInfo) => {
 await page.goto("/learn.html");
 await page.evaluate(({ key, speaking, lessons }) => localStorage.setItem(key, JSON.stringify({ speakingVersion: 2, speaking, explore: { 1: 2 }, lessons: { "my-house": lessons.filter(item => item !== "listening") }, units: [] })), { key, speaking, lessons });
 const overview = await context.newPage(); await overview.goto("/learn.html");
 const house = await context.newPage(); await house.goto("/my-house.html");
 await expect(house.locator("[data-activity-count]")).toHaveText("6/7 activities completed");
 await expect(overview.locator(".art-progress [data-unit-count]")).toHaveText("0/4 units completed");
 await page.goto("/listening.html"); await page.locator("#start-mission").click();
 await page.locator("#submit-matches").click();
 expect((await state(page)).units).toEqual([]);
 for (const [index, picture] of ["stairs", "cushion", "table", "bench"].entries()) {
  await page.locator('[data-clue="' + index + '"]').click();
  await page.locator('[data-picture="' + picture + '"]').click();
 }
 await page.locator("#submit-matches").click();
 await expect(page.locator("#listening-completion")).toBeVisible();
 expect((await state(page)).units).toEqual(["my-house"]);
 await expect(overview.locator(".art-progress [data-unit-count]")).toHaveText("1/4 units completed");
 await expect(overview.locator(".art-progress progress")).toHaveJSProperty("value", 1);
 await expect(overview.locator("[data-unit-percent]")).toHaveText(["25%", "25%"]);
 await expect(overview.locator("[data-unit-step=my-house]")).toHaveClass(/is-complete/);
 await expect(house.locator("[data-activity-count]")).toHaveText("7/7 activities completed");
 await expect(house.locator("[data-activity-percent]")).toHaveText("100%");
 await expect(house.locator("[data-activity-progress]")).toHaveJSProperty("value", 7);
 await expect(house.locator("[data-activity-step].is-complete")).toHaveCount(7);
 await expect(house.locator("[data-activity-note]")).toHaveText("Unit completed. Well done!");
 await house.locator(".course-content").screenshot({ path: testInfo.outputPath("house-progress-completed.png") });
 await house.close();
 await page.locator("#play-again").click();
 expect((await state(page)).units).toEqual(["my-house"]);
 await overview.reload();
 await expect(overview.locator(".art-progress [data-unit-count]")).toHaveText("1/4 units completed");
 expect((await state(page)).explore).toEqual({ 1: 2 });
 await shot(overview, testInfo, "learn-unit-progress-completed");
 await overview.close();
});
test("unit counts ignore duplicate and unknown saved ids and stay within four", async ({ page }) => {
 await page.goto("/learn.html");
 await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ speakingVersion: 2, speaking: [], explore: {}, units: ["my-new-school", "my-house", "my-friends", "my-neighbourhood", "my-house", "invalid", null] })), key);
 await page.reload();
 await expect(page.locator(".art-progress [data-unit-count]")).toHaveText("4/4 units completed");
 await expect(page.locator(".art-progress progress")).toHaveJSProperty("value", 4);
 await expect(page.locator(".art-progress progress")).toHaveJSProperty("max", 4);
});
test("Vocabulary completes only after all fifteen recordings finish and preserves heard words", async ({ page }) => {
 await page.addInitScript(() => {
  const NativeAudio = window.Audio; window.unitAudio = [];
  window.Audio = class extends NativeAudio { constructor(src) { super(src); window.unitAudio.push(this); } };
 });
 await page.goto("/my-house.html#vocabulary");
 const buttons = await page.locator(".vocab-word").all(); expect(buttons).toHaveLength(15);
 for (const [index, button] of buttons.entries()) {
  await button.click();
  await page.evaluate(() => window.unitAudio.at(-1).dispatchEvent(new Event("ended")));
  const progress = await state(page);
  expect(progress.vocabulary).toHaveLength(index + 1);
  expect(progress.lessons["my-house"].includes("vocabulary")).toBe(index === 14);
  expect(progress.units).toEqual([]);
 }
 await page.reload();
 expect((await state(page)).vocabulary).toHaveLength(15);
 await page.locator(".vocab-word").first().click();
 await page.evaluate(() => window.unitAudio.at(-1).dispatchEvent(new Event("ended")));
 expect((await state(page)).vocabulary).toHaveLength(15);
});


test("My House and Speaking have no speaking progress bars or counters",async({page})=>{
 for(const path of ["/my-house.html","/speaking.html"]){
  await page.goto(path);
  await expect(page.locator("[data-speaking-count],[data-speaking-progress],.speaking-progress")).toHaveCount(0);
 }
});


test("My House groups multi-part activities and updates its progress without reloading", async ({ page }, testInfo) => {
 await page.goto("/my-house.html");
 await expect(page.getByRole("link", { name: "Start Speaking with BanBan", exact: false })).toHaveCount(0);
 await expect(page.locator("[data-activity-count]")).toHaveText("0/7 activities completed");
 await expect(page.locator("[data-activity-step]")).toHaveCount(7);
 await expect(page.locator("[data-activity-percent]")).toHaveText("0%");
 await page.evaluate(({ key }) => localStorage.setItem(key, JSON.stringify({
  speakingVersion: 2, speaking: ["house-1"], units: [],
  lessons: { "my-house": ["vocabulary", "pronunciation", "grammar-magic", "reading-hunt"] }
 })), { key });
 await page.reload();
 await expect(page.locator("[data-activity-count]")).toHaveText("2/7 activities completed");
 await expect(page.locator("[data-activity-percent]")).toHaveText("29%");
 await expect(page.locator("[data-activity-progress]")).toHaveJSProperty("value", 2);
 await expect(page.locator("[data-activity-step=grammar]")).toHaveClass(/is-started/);
 await expect(page.locator("[data-activity-step=reading]")).toHaveClass(/is-started/);
 await expect(page.locator("[data-activity-step=speaking]")).toHaveAccessibleName("Open Speaking activity. In progress.");
 await page.evaluate(async () => (await import("/progress.js")).completeLesson("my-house", "grammar-tidy"));
 await expect(page.locator("[data-activity-count]")).toHaveText("3/7 activities completed");
 await expect(page.locator("[data-activity-percent]")).toHaveText("43%");
 await expect(page.locator("[data-activity-step=grammar]")).toHaveClass(/is-complete/);
 await expect(page.locator("[data-activity-step=grammar]")).not.toHaveClass(/is-started/);
 expect((await state(page)).units).toEqual([]);
 await page.reload();
 await expect(page.locator("[data-activity-count]")).toHaveText("3/7 activities completed");
 await page.evaluate(() => document.fonts.ready);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.locator(".course-content").screenshot({ path: testInfo.outputPath("house-progress-partial.png") });
 await page.getByRole("link", { name: "Open Reading activity. In progress.", exact: true }).click();
 await expect(page).toHaveURL(/reading.html$/);
});
