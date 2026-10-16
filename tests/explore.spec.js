import { test, expect } from "@playwright/test";
import { questions } from "../questions.js";

test.beforeEach(async ({ page }) => { await page.goto("/explore.html"); });
test("each visit shows five distinct source questions with answer-only controls", async ({ page }, testInfo) => {
  await expect(page).toHaveTitle("Explore — LOCALINGO");
  await expect(page.locator(".question-card")).toHaveCount(5);
  const ids = await page.locator(".question-card").evaluateAll(cards => cards.map(card => Number(card.dataset.questionId)));
  expect(new Set(ids).size).toBe(5);
  expect(ids.every(id => questions.some(question => question.id === id))).toBe(true);
  await expect(page.locator(".question-card:not([hidden]) .question-choice")).toHaveCount(3);
  await expect(page.locator("#explore-quiz button:not(.question-choice), #explore-quiz select")).toHaveCount(0);
  await expect(page.locator("[data-quiz-category], #reset-dialog")).toHaveCount(0);
  await expect(page.locator("#question-position")).toHaveText("Question 1 of 5");
  await expect(page.locator(".explore-topics article")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("explore.png"), fullPage: true, animations: "disabled" });
});
test("answers lock once, advance automatically and finish after five questions", async ({ page }, testInfo) => {
  await page.clock.install();
  for (let index = 0; index < 5; index++) {
    const card = page.locator(".question-card:not([hidden])");
    const id = Number(await card.getAttribute("data-question-id"));
    const question = questions.find(item => item.id === id);
    const selected = index === 0 ? (question.answer + 1) % 3 : question.answer;
    // A repeated activation must never count the same answer twice.
    await card.locator(".question-choice").nth(selected).evaluate(button => { button.click(); button.click(); });
    await expect(card.locator(".question-choice").nth(selected)).toBeDisabled();
    await expect(card.locator(".answer-feedback")).not.toBeEmpty();
    await expect(page.locator("#quiz-progress")).toHaveJSProperty("value", index + 1);
    if (index === 0) await page.screenshot({ path: testInfo.outputPath("explore-answer.png"), fullPage: true, animations: "disabled" });
    await page.clock.runFor(2500);
  }
  await expect(page.locator(".quiz-result-score")).toHaveText("4 / 5 correct");
  await expect(page.locator("#question-position")).toHaveText("5 / 5 completed");
  await expect(page.locator("#explore-quiz button")).toHaveCount(0);
  await expect(page.locator("#quiz-status")).toContainText("Round complete");
  await page.screenshot({ path: testInfo.outputPath("explore-result.png"), fullPage: true, animations: "disabled" });
});
test("reload draws a fresh round and old answers cannot lock it", async ({ page }) => {
  await page.evaluate(ids => {
    localStorage.setItem("localingo.progress.v1", JSON.stringify({
      speaking: ["house-1"],
      explore: Object.fromEntries(ids.map(id => [id, 0])),
    }));
  }, questions.map(question => question.id));
  const samples = new Set();
  for (let visit = 0; visit < 4; visit++) {
    await page.reload();
    await expect(page.locator(".question-card")).toHaveCount(5);
    samples.add(await page.locator(".question-card").evaluateAll(cards => cards.map(card => card.dataset.questionId).join(",")));
    await expect(page.locator(".question-card:not([hidden]) .question-choice").first()).toBeEnabled();
    await expect(page.locator("#quiz-progress")).toHaveJSProperty("value", 0);
  }
  expect(samples.size).toBeGreaterThan(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("localingo.progress.v1")).speaking)).toEqual(["house-1"]);
});
test("clean URL and skip link reach the questions", async ({ page }) => {
  await page.goto("/explore");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to Explore questions" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#explore-quiz")).toBeFocused();
});
