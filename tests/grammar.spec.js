import { test, expect } from "@playwright/test";

async function enterMagic(page) {
  await page.goto("/grammar.html");
  await page.getByRole("button", { name: "Let’s Start", exact: true }).click();
}
async function enterTidyIntro(page) {
  await enterMagic(page);
  await playMagic(page, [1, 0, 2, 0]);
  await page.locator("#try-other-game").click();
  await expect(page.locator("#tidy-intro")).toBeVisible();
}
async function enterTidy(page) {
  await enterTidyIntro(page);
  await page.getByRole("button", { name: "Let’s help Ban!", exact: true }).click();
}
async function screenshot(page, testInfo, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath(name + ".png"), fullPage: true, animations: "disabled", style: ".skip-link { visibility: hidden; }" });
}
async function playMagic(page, answers) {
  for (const [index, answer] of answers.entries()) {
    await expect(page.locator("#magic-round-label")).toContainText(`Round ${index + 1} of 4`);
    await page.locator("#magic-choices button").nth(answer).click();
    await expect(page.locator("#grammar-tip")).toBeVisible();
    await expect(page.locator("#tip-title")).toHaveText(`Magic Tip ${index + 1}!`);
    await expect(page.locator("#tip-rule")).not.toBeEmpty();
    await expect(page.locator("#tip-example")).toContainText("Example:");
    await expect(page.locator("#magic-choices button").first()).toBeDisabled();
    await page.locator("#tip-next").click();
  }
}
async function playTidy(page, answers) {
  for (const [index, answer] of answers.entries()) {
    await expect(page.locator("#tidy-round-label")).toHaveText(`Item ${index + 1} of 7`);
    await expect(page.locator("#tidy-image")).toHaveAttribute("src", `./assets/grammar/tidy-${index + 1}.jpg`);
    await page.locator("#tidy-image").evaluate(img => img.decode());
    await expect(page.locator("#check-tidy")).toBeDisabled();
    await page.locator("#preposition-choices").getByRole("button", { name: answer, exact: true }).click();
    await page.locator("#check-tidy").click();
    await expect(page.locator("#tidy-feedback")).not.toBeEmpty();
    await expect(page.locator("#tidy-progress")).toHaveJSProperty("value", index + 1);
    await expect(page.locator("#preposition-blank")).toBeDisabled();
    await page.locator("#tidy-next").click();
  }
}
test("My House opens Grammar with the supplied cover and round artwork", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/my-house.html");
  await page.getByRole("link", { name: "Grammar — The Magic’s Game and Thai Stilt House Tidy-Up", exact: true }).click();
  await expect(page).toHaveURL(/grammar\.html$/);
  await expect(page).toHaveTitle("Grammar · My House — LOCALINGO");
  await expect(page.locator(".grammar-toolbar nav, .grammar-toolbar button")).toHaveCount(0);
  await expect(page.locator(".grammar-back")).toHaveAccessibleName("My House");
  await expect(page.locator(".grammar-back")).toHaveAttribute("href", "./my-house.html");
  await page.locator("#magic-intro .scene-source").evaluate(img => img.decode());
  await screenshot(page, testInfo, "grammar-intro");
  await page.getByRole("button", { name: "Let’s Start", exact: true }).click();
  await page.locator("#magic-art, #magic-mobile-image").evaluateAll(images => Promise.all(images.map(img => { img.loading = "eager"; return img.decode(); })));
  await expect(page.locator("#magic-art")).toHaveAttribute("src", "./assets/grammar/magic-round-1.png");
  await expect(page.locator("#magic-choices button")).toHaveCount(3);
  await screenshot(page, testInfo, "grammar-round");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.locator(".grammar-back").click();
  await expect(page).toHaveURL(/my-house\.html$/);
});

test("each choice shows its Grammar Tip and the mixed score counts only correct answers", async ({ page }, testInfo) => {
  await enterMagic(page);
  const answers = [1, 1, 2, 1];
  for (const [index, answer] of answers.entries()) {
    if (index === 2) await expect(page.locator("#magic-choices button").nth(2)).toHaveText(/The tortoise's shell/);
    await page.locator("#magic-choices button").nth(answer).evaluate(button => { button.click(); button.click(); });
    await expect(page.locator("#grammar-tip")).toBeVisible();
    await expect(page.locator("#tip-title")).toHaveText(`Magic Tip ${index + 1}!`);
    await expect(page.locator("#tip-feedback")).toContainText(index === 0 || index === 2 ? "Correct!" : "Not quite.");
    if (index === 0) await screenshot(page, testInfo, "grammar-tip");
    await page.locator("#tip-next").click();
  }
  await expect(page.locator("#result-score")).toHaveText("2 / 4");
  await expect(page.locator("#result-stars .earned-star")).toHaveCount(2);
  await expect(page.locator("#result-stars .empty-star")).toHaveCount(2);
  await screenshot(page, testInfo, "grammar-result");
  await page.getByRole("button", { name: "Play Again 🔄", exact: true }).click();
  await expect(page.locator("#magic-round-label")).toContainText("Round 1 of 4");
  await expect(page.locator("#magic-score-live")).toHaveText("0 correct");
  await expect(page.locator("#magic-choices button").first()).toBeEnabled();
});

test("a perfect possessive score is accurate and closing a tip still allows progression", async ({ page }) => {
  await enterMagic(page);
  await page.locator("#magic-choices button").nth(1).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#grammar-tip")).toBeHidden();
  await expect(page.locator("#magic-next")).toBeVisible();
  await page.locator("#magic-next").click();
  for (const [index, answer] of [0, 2, 0].entries()) {
    await page.locator("#magic-choices button").nth(answer).click();
    await expect(page.locator("#grammar-tip")).toBeVisible();
    if (index === 1) {
      await page.locator("#close-tip").click();
      const gap = await page.evaluate(() => {
        const choicesBottom = Math.max(...Array.from(document.querySelectorAll("#magic-choices button"), button => button.getBoundingClientRect().bottom));
        return document.querySelector("#magic-next").getBoundingClientRect().top - choicesBottom;
      });
      expect(gap).toBeGreaterThanOrEqual(4);
      await page.locator("#magic-next").click();
    } else {
      await page.locator("#tip-next").click();
    }
  }
  await expect(page.locator("#result-score")).toHaveText("4 / 4");
  await expect(page.locator("#result-stars .earned-star")).toHaveCount(4);
});

// Independent all-wrong round verifies that learning tips cannot inflate the score.
test("all incorrect possessive answers finish with zero stars", async ({ page }) => {
  await enterMagic(page);
  await playMagic(page, [0, 1, 0, 2]);
  await expect(page.locator("#result-score")).toHaveText("0 / 4");
  await expect(page.locator("#result-stars .earned-star")).toHaveCount(0);
});

test("Ban introduction, instructions and choice editing work after completing Magic", async ({ page }, testInfo) => {
  await enterTidyIntro(page);
  await page.locator("#tidy-intro .scene-source").evaluate(img => { img.loading = "eager"; return img.decode(); });
  await screenshot(page, testInfo, "ban-intro");
  await page.getByRole("button", { name: "How to play?", exact: true }).click();
  await expect(page.locator("#play-instructions")).toContainText("Read the sentence and drag the correct preposition into the blank.");
  await page.getByRole("button", { name: "Let’s do it!", exact: true }).click();
  await expect(page.locator("#tidy-intro")).toBeVisible();
  await page.getByRole("button", { name: "Let’s help Ban!", exact: true }).click();
  await expect(page.locator("#check-tidy")).toBeDisabled();
  await page.locator("#preposition-choices").getByRole("button", { name: "behind", exact: true }).click();
  await expect(page.locator("#preposition-blank")).toHaveText("behind");
  await page.locator("#preposition-blank").click();
  await expect(page.locator("#check-tidy")).toBeDisabled();
  await page.locator("#preposition-choices").getByRole("button", { name: "on", exact: true }).press("Enter");
  await expect(page.locator("#preposition-blank")).toHaveText("on");
  await expect(page.locator("#tidy-feedback")).toBeEmpty();
  await page.locator("#tidy-image").evaluate(img => img.decode());
  await screenshot(page, testInfo, "tidy-game");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("seven supplied photos and mixed preposition answers produce the real score and replay clears it", async ({ page }, testInfo) => {
  await enterTidy(page);
  await playTidy(page, ["on", "next to", "under", "in front of", "in", "under", "behind"]);
  await expect(page.locator("#result-score")).toHaveText("6 / 7");
  await expect(page.locator("#result-stars .earned-star")).toHaveCount(6);
  await expect(page.locator("#result-stars .empty-star")).toHaveCount(1);
  await expect(page.locator("#result-message")).toContainText("Ban's house is tidy again!");
  await screenshot(page, testInfo, "tidy-result");
  await page.getByRole("button", { name: "Play Again 🔄", exact: true }).click();
  await expect(page.locator("#tidy-round-label")).toHaveText("Item 1 of 7");
  await expect(page.locator("#tidy-score-live")).toHaveText("0 correct");
  await expect(page.locator("#preposition-blank")).toHaveText("______");
  await expect(page.locator("#preposition-blank")).not.toHaveClass(/is-correct|is-wrong/);
  await expect(page.locator("#check-tidy")).toBeDisabled();
});

test("a perfect tidy-up earns seven points and seven stars", async ({ page }) => {
  await enterTidy(page);
  await playTidy(page, ["on", "next to", "under", "in front of", "in", "between", "behind"]);
  await expect(page.locator("#result-score")).toHaveText("7 / 7");
  await expect(page.locator("#result-stars .earned-star")).toHaveCount(7);
});

test("dragging accepts a word only in the blank, with mouse or touch", async ({ page }, testInfo) => {
  await enterTidy(page);
  const word = page.locator("#preposition-choices").getByRole("button", { name: "on", exact: true });
  const blank = page.locator("#preposition-blank");
  if (testInfo.project.use.isMobile) {
    const session = await page.context().newCDPSession(page);
    async function touchDrag(source, target) {
      await page.locator(".tidy-exercise").scrollIntoViewIfNeeded();
      const from = await source.boundingBox();
      const to = await target.boundingBox();
      const x = from.x + from.width / 2, y = from.y + from.height / 2;
      const endX = to.x + to.width / 2, endY = to.y + to.height / 2;
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
      for (let step = 1; step <= 8; step++) {
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (endX - x) * step / 8, y: y + (endY - y) * step / 8, id: 1 }] });
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    await touchDrag(word, blank);
    await expect(blank).toHaveText("on");
    await blank.click();
    await touchDrag(word, page.locator("#tidy-help"));
    await expect(blank).toHaveText("______");
    await session.detach();
  } else {
    await word.dragTo(blank);
    await expect(blank).toHaveText("on");
    await blank.click();
    await word.dragTo(page.locator("#tidy-help"));
    await expect(blank).toHaveText("______");
  }
  await expect(page.locator("#tidy-feedback")).toBeEmpty();
  await expect(page.locator("#tidy-score-live")).toHaveText("0 correct");
});
