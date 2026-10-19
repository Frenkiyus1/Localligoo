import { test, expect } from "@playwright/test";

async function enter(page) {
  await page.goto("/my-house.html");
  await page.getByRole("link", { name: "Reading — Secret Code Hunt and Discover My Home", exact: true }).click();
  await expect(page).toHaveURL(/reading\.html$/);
}
async function startHunt(page) {
  await enter(page);
  await page.getByRole("button", { name: "Start the Hunt!", exact: true }).click();
}
async function collectClues(page, checkWrong = false) {
  for (const [index, answer] of [0, 1, 1, 1].entries()) {
    const form = page.locator("#hunt-answer");
    await expect(page.locator("#hunt-email")).toBeVisible();
    await expect(page.locator("#email-text")).toContainText("traditional wooden stilt house");
    await expect(form.getByRole("button", { name: "Submit", exact: true })).toBeDisabled();
    if (checkWrong && index === 0) {
      await form.getByRole("radio").nth(2).check();
      await form.getByRole("button", { name: "Submit", exact: true }).click();
      await expect(form.getByRole("status")).toContainText("Incorrect");
      await expect(page.locator("#basket-count")).toHaveText("0 / 4");
      await form.getByRole("button", { name: "Try again!", exact: true }).click();
      await expect(form.getByRole("button", { name: "Submit", exact: true })).toBeDisabled();
    }
    await form.getByRole("radio").nth(answer).check();
    await form.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(form.getByRole("status")).toContainText("Correct!");
    await form.getByRole("button", { name: /See the .* clue!/ }).click();
    await expect(page.locator("#hunt-clue")).toBeVisible();
    await expect(page.locator("#hunt-email")).toBeHidden();
    await expect(page.locator("#clue-reveal-card .clue-card")).toHaveAttribute("data-clue", String(index + 1));
    await page.getByRole("button", { name: "Got it!", exact: true }).click();
    await expect(page.locator("#basket-count")).toHaveText(`${index + 1} / 4`);
  }
}
async function startHome(page) {
  await startHunt(page);
  await collectClues(page);
  await page.locator("#clue-basket").click();
  await page.getByRole("button", { name: "Solve the Mystery", exact: true }).click();
  const mystery = page.locator("#mystery-answer");
  await mystery.getByRole("radio").first().check();
  await mystery.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Awesome!", exact: true }).click();
  await page.getByRole("button", { name: "Let’s Go", exact: true }).click();
}
async function chooseHome(page, indexes) {
  for (const [i, answer] of indexes.entries()) {
    await page.locator("#journal-answers fieldset").nth(i).getByRole("radio").nth(answer).check();
  }
  await page.getByRole("button", { name: "Submit my answers", exact: true }).click();
}

test("Reading follows B.READING artwork and links from My House", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await enter(page);
  await expect(page).toHaveTitle("Reading · My House — LOCALINGO");
  await expect(page.locator("#hunt-intro .cover-art")).toHaveAttribute("src", "./assets/reading/hunt-cover.png");
  await page.locator("#hunt-intro img").evaluate(img => { img.loading = "eager"; return img.decode(); });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("reading-intro.png"), fullPage: true, style: ".skip-link { visibility: hidden; }" });
  await page.getByRole("button", { name: "Start the Hunt!", exact: true }).click();
  await expect(page.locator("#hunt-email")).toBeVisible();
  await page.locator(".email-art img").evaluate(img => { img.loading = "eager"; return img.decode(); });
  await expect(page.locator("#hunt-answer")).toContainText("Where does Lan live?");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("reading-email.png"), fullPage: true, style: ".skip-link { visibility: hidden; }" });
  expect(errors).toEqual([]);
});

test("clues require correct answers, reveal separately and unlock the final mystery", async ({ page }, testInfo) => {
  await startHunt(page);
  await page.locator("#clue-basket").click();
  await expect(page.locator("#clue-grid .clue-locked")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Solve the Mystery", exact: true })).toBeDisabled();
  await expect(page.locator("#clue-grid")).not.toContainText("Com blouse");
  await page.getByRole("button", { name: "← Back to Lan’s email", exact: true }).click();
  await collectClues(page, true);
  await expect(page.locator("#basket-alert")).toBeVisible();
  await page.locator("#clue-basket").click();
  await expect(page.locator("#basket-alert")).toBeHidden();
  await expect(page.locator("#clue-grid .clue-card:not(.clue-locked)")).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath("reading-clues.png"), fullPage: true, style: ".skip-link { visibility: hidden; }" });
  await page.getByRole("button", { name: "Solve the Mystery", exact: true }).click();
  const form = page.locator("#mystery-answer");
  await form.getByRole("radio").nth(1).check();
  await form.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("Review your clues");
  await expect(page.locator("#clue-grid .clue-card")).toHaveCount(4);
  await form.getByRole("button", { name: "Try Again", exact: true }).click();
  await form.getByRole("radio").first().check();
  await form.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.locator("#hunt-success")).toBeVisible();
  await expect(page.locator("#hunt-success")).toContainText("Thai ethnic group");
  if (!testInfo.project.use.isMobile) {
    await page.locator("#butterfly-button").hover();
    await expect(page.locator("#butterfly-fact")).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.locator("#butterfly-fact")).toBeHidden();
  }
  await page.locator("#butterfly-button").click();
  await expect(page.locator("#butterfly-fact")).toBeVisible();
  await expect(page.locator("#butterfly-button")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#butterfly-fact")).toContainText("7, 9, or 11 buttons");
  await page.screenshot({ path: testInfo.outputPath("reading-butterfly.png"), fullPage: true, style: ".skip-link { visibility: hidden; }" });
  await page.getByRole("button", { name: "Close butterfly fact", exact: true }).click();
  await expect(page.locator("#butterfly-fact")).toBeHidden();
  await page.locator("#butterfly-button").press("Enter");
  await expect(page.locator("#butterfly-fact")).toBeVisible();
  await page.locator("#butterfly-button").press("Escape");
  await expect(page.locator("#butterfly-fact")).toBeHidden();
  await page.getByRole("button", { name: "Awesome!", exact: true }).click();
  await expect(page.locator("#home-intro")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("journal submits three answers together, retries all-wrong and partly-wrong sets", async ({ page }) => {
  await startHome(page);
  await expect(page.getByRole("button", { name: "Submit my answers", exact: true })).toBeDisabled();
  await chooseHome(page, [1, 1, 1]);
  await expect(page.locator("#journal-answers [role=status]")).toContainText("Uh oh!");
  await expect(page.locator("#hometown-answer")).toHaveCount(0);
  await page.getByRole("button", { name: "Try again!", exact: true }).click();
  await chooseHome(page, [0, 0, 2]);
  await expect(page.locator("#journal-answers [role=status]")).toContainText("Something is wrong!");
  await page.getByRole("button", { name: "Try again!", exact: true }).click();
  await page.locator("#journal-answers fieldset").nth(2).getByRole("radio").first().check();
  await page.getByRole("button", { name: "Submit my answers", exact: true }).click();
  await expect(page.locator("#hometown-answer")).toBeVisible();
  await expect(page.locator("#home-journal")).toBeVisible();
  await expect(page.locator("#journal-text")).toContainText("white flowers");
});

test("hometown feedback leads to practice with explanations for correct and incorrect answers", async ({ page }, testInfo) => {
  await startHome(page);
  await page.locator(".journal-art img").evaluate(img => { img.loading = "eager"; return img.decode(); });
  await page.screenshot({ path: testInfo.outputPath("reading-journal.png"), fullPage: true, style: ".skip-link { visibility: hidden; }" });
  await chooseHome(page, [0, 0, 0]);
  const form = page.locator("#hometown-answer");
  await form.getByRole("radio").first().check();
  await form.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("tea hills");
  await form.getByRole("button", { name: "Try again!", exact: true }).click();
  await form.getByRole("radio").nth(1).check();
  await form.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("Congratulations!");
  await form.getByRole("button", { name: "Continue to Practice", exact: true }).click();
  await expect(page.locator("#reading-practice .practice-explanation:visible")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check my answers", exact: true })).toBeDisabled();
  await page.locator("#practice-0").selectOption("back");
  await page.locator("#practice-1").selectOption("busy");
  await page.locator("#practice-2").selectOption("sofa");
  await page.getByRole("button", { name: "Check my answers", exact: true }).click();
  await expect(page.locator("#reading-practice .practice-explanation:visible")).toHaveCount(3);
  await expect(page.locator(".practice-correct")).toHaveCount(2);
  await expect(page.locator(".practice-incorrect")).toHaveCount(1);
  await expect(page.locator(".practice-explanation").nth(1)).toContainText('The air cannot be "busy"');
  await expect(page.locator("#practice-1")).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("reading-practice.png"), fullPage: true, style: ".skip-link { visibility: hidden; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Back to My House →", exact: true }).click();
  await expect(page).toHaveURL(/my-house\.html$/);
});
