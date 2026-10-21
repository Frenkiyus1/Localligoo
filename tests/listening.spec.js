import { test, expect } from "@playwright/test";
const answers = ["stairs", "cushion", "table", "bench"];
async function enter(page) {
 await page.goto("/my-house.html");
 await page.getByRole("link", { name: "Listening — Alex’s Guidebook: The Missing Notes", exact: true }).click();
 await expect(page).toHaveURL(/listening\.html$/);
}
async function start(page) {
 await enter(page); await page.getByRole("button", { name: "Start Mission", exact: true }).click();
 await expect(page.locator("#listening-mission")).toBeVisible();
}
async function match(page, index, picture) {
 await page.locator('[data-clue="' + index + '"]').click();
 await page.locator('[data-picture="' + picture + '"]').click();
}
async function screenshot(page, testInfo, name) {
 await page.evaluate(() => document.fonts.ready);
 await page.locator("img:visible").evaluateAll(images => Promise.all(images.map(image => image.decode())));
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.screenshot({ path: testInfo.outputPath(name + ".png"), fullPage: true, animations: "disabled", style: ".skip-link { visibility: hidden; }" });
}
test("Listening opens from My House with the exact storyline and supplied picture", async ({ page }, testInfo) => {
 await enter(page);
 await expect(page).toHaveTitle("Listening · Alex’s Guidebook — LOCALINGO");
 await expect(page.locator(".storyline")).toHaveText("Welcome to Moc Chau! Alex is visiting a traditional Thai stilt house, but some important notes are missing from his guidebook. Can you help him listen to the owner and find the missing information?");
 await expect(page.locator(".intro-photo img")).toHaveAttribute("src", "./assets/listening/stilt-house.png");
 await expect(page.locator("#listening-mission")).toBeHidden();
 await expect(page.locator("#transcript-copy")).toBeEmpty();
 await screenshot(page, testInfo, "listening-intro");
});
test("the supplied MP4 plays as audio without showing video or a first-listen transcript", async ({ page }, testInfo) => {
 await start(page);
 await expect(page.locator("video")).toHaveCount(0);
 await expect(page.locator("#mission-audio")).toHaveAttribute("src", "./assets/listening/visit.mp4");
 await expect.poll(() => page.locator("#mission-audio").evaluate(audio => audio.readyState), { timeout: 15000 }).toBeGreaterThanOrEqual(2);
 await expect.poll(() => page.locator("#mission-audio").evaluate(audio => !audio.paused && audio.currentTime > 0)).toBe(true);
 const duration = await page.locator("#mission-audio").evaluate(audio => { audio.pause(); return audio.duration; });
 expect(duration).toBeGreaterThan(0); expect(duration).toBeLessThan(120);
 testInfo.annotations.push({ type: "audio-duration", description: duration.toFixed(2) + " seconds" });
 await expect(page.locator("#transcript-panel")).toBeHidden();
 await expect(page.locator("#picture-cards img")).toHaveCount(0);
 await expect(page.locator(".picture-placeholder")).toHaveCount(4);
 await expect(page.locator("#listening-feedback")).toBeHidden();
 await screenshot(page, testInfo, "listening-matching");
});
test("partial matching shows only the incomplete message and cannot unlock transcript or completion", async ({ page }) => {
 await start(page);
 await page.getByRole("button", { name: "Submit", exact: true }).click();
 await expect(page.locator("#feedback-title")).toHaveText("Complete all the clues before checking!");
 await expect(page.locator("#pair-feedback")).toBeEmpty();
 await expect(page.locator("#transcript-panel")).toBeHidden();
 await match(page, 0, "stairs");
 await expect(page.locator("#listening-feedback")).toBeHidden();
 await expect(page.locator("#match-count")).toHaveText("1 / 4 matched");
 await expect(page.locator("#match-lines path")).toHaveCount(1);
 await page.getByRole("button", { name: "Submit", exact: true }).click();
 await expect(page.locator("#feedback-title")).toHaveText("Complete all the clues before checking!");
 await expect(page.locator("#listening-completion")).toBeHidden();
 await expect(page.locator("#transcript-panel")).toBeHidden();
});
test("all four pairs are graded together below Submit; wrong pairs can be corrected", async ({ page }, testInfo) => {
 await start(page);
 for (const [index, picture] of ["cushion", "stairs", "table", "bench"].entries()) await match(page, index, picture);
 await expect(page.locator("#match-count")).toHaveText("4 / 4 matched");
 await expect(page.locator("#listening-feedback")).toBeHidden();
 await expect(page.locator(".is-correct,.is-incorrect")).toHaveCount(0);
 await page.getByRole("button", { name: "Submit", exact: true }).click();
 await expect(page.locator("#pair-feedback li")).toHaveCount(4);
 await expect(page.locator("#pair-feedback .pair-incorrect")).toHaveCount(2);
 await expect(page.locator("#pair-feedback .pair-correct")).toHaveCount(2);
 await expect(page.locator("#pair-feedback li").first()).toHaveText("Clue 1: Not quite! Listen again and try once more!");
 await expect(page.locator("#pair-feedback li").nth(2)).toHaveText("Clue 3: Correct! You found a missing note!");
 const submit = await page.locator("#submit-matches").boundingBox(), feedback = await page.locator("#listening-feedback").boundingBox();
 expect(feedback.y).toBeGreaterThan(submit.y + submit.height);
 await expect(page.locator("#listening-completion")).toBeHidden();
 await expect(page.locator("#transcript-panel")).toBeVisible();
 await expect(page.locator("#transcript-copy")).toBeHidden();
 await page.locator("#transcript-panel summary").click();
 await expect(page.locator("#transcript-copy")).toContainText("What is this near the entrance?");
 await screenshot(page, testInfo, "listening-feedback");
 await match(page, 0, "stairs");
 await expect(page.locator("#match-count")).toHaveText("3 / 4 matched");
 await match(page, 1, "cushion");
 await page.getByRole("button", { name: "Submit", exact: true }).click();
 await expect(page.locator("#pair-feedback .pair-correct")).toHaveCount(4);
 await expect(page.locator("#completion-title")).toHaveText("Mission Completed! You helped Alex finish his guidebook!");
 await expect(page.locator("#listening-completion")).toBeVisible();
 await expect(page.locator("#submit-matches")).toBeDisabled();
 await screenshot(page, testInfo, "listening-completed");
 await page.getByRole("button", { name: "Play Again!", exact: true }).click();
 await expect(page.locator("#match-count")).toHaveText("0 / 4 matched");
 await expect(page.locator("#match-lines path")).toHaveCount(0);
 await expect(page.locator("#transcript-panel")).toBeHidden();
 await expect(page.locator("#transcript-copy")).toBeEmpty();
 await expect(page.locator("#listening-feedback")).toBeHidden();
 await expect(page.locator("#listening-completion")).toBeHidden();
 await expect(page.locator("#submit-matches")).toBeEnabled();
});
test("matching works with keyboard controls and preserves one picture per clue", async ({ page }) => {
 await start(page);
 await page.locator('[data-clue="0"]').focus(); await page.keyboard.press("Enter");
 await page.locator('[data-picture="stairs"]').focus(); await page.keyboard.press("Space");
 await expect(page.locator("#match-count")).toHaveText("1 / 4 matched");
 await match(page, 1, "stairs");
 await expect(page.locator("#match-count")).toHaveText("1 / 4 matched");
 await expect(page.locator('[data-clue="0"] .match-letter')).toHaveText("—");
 await expect(page.locator('[data-clue="1"] .match-letter')).toHaveText("B");
 for (const [index, picture] of answers.entries()) await match(page, index, picture);
 await expect(page.locator("#match-lines path")).toHaveCount(4);
 await page.locator("#submit-matches").focus(); await page.keyboard.press("Enter");
 await expect(page.locator("#listening-completion")).toBeVisible();
});
