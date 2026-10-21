import { test, expect } from "@playwright/test";
const words = ["roofs", "steps", "doors", "windows", "baskets", "mats", "beads", "clothes"];
const card = (page, word) => page.locator('[data-word="' + word + '"]');
async function enter(page) {
 await page.goto("/my-house.html");
 await page.getByRole("link", { name: "Pronunciation — The Bamboo Matcher", exact: true }).click();
 await expect(page).toHaveURL(/pronunciation\.html$/);
}
async function start(page) {
 await enter(page); await page.getByRole("button", { name: "Start Game", exact: true }).click();
 await expect(page.locator("#matcher-game")).toBeVisible();
}
async function match(page, one, two) { await card(page, one).click(); await card(page, two).click(); }
async function screenshot(page, testInfo, name) {
 await page.evaluate(() => document.fonts.ready);
 await page.locator("img:visible").evaluateAll(images => Promise.all(images.map(image => image.decode())));
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.screenshot({ path: testInfo.outputPath(name + ".png"), fullPage: true, animations: "disabled", style: ".skip-link { visibility: hidden; }" });
}
async function observeAudio(page) {
 await page.addInitScript(() => {
  const NativeAudio = window.Audio; window.matcherAudio = [];
  window.Audio = class extends NativeAudio { constructor(src) { super(src); window.matcherAudio.push(this); } };
 });
}
test("Pronunciation opens from My House with the reference instructions and eight word fronts", async ({ page }, testInfo) => {
 await enter(page);
 await expect(page).toHaveTitle("Pronunciation · The Bamboo Matcher — LOCALINGO");
 await expect(page.locator(".how-to-play li")).toHaveText(["Tap a card to hear the word.", "Choose another word with the same ending sound.", "Match all 4 pairs to complete the game!"]);
 await expect(page.locator(".sound-reminder")).toContainText("Listen to the final sound, not just the spelling.");
 await expect(page.locator("#matcher-game")).toBeHidden();
 await screenshot(page, testInfo, "pronunciation-instructions");
 await page.getByRole("button", { name: "Start Game", exact: true }).click();
 await expect(page.locator(".sound-card")).toHaveCount(8);
 expect((await page.locator(".card-front .card-word").allTextContents()).sort()).toEqual([...words].sort());
 await expect(page.locator(".card-back[aria-hidden=true]")).toHaveCount(8);
 await expect(page.locator("#pair-count")).toHaveText("Pairs matched: 0/4");
 await expect(page.locator("#match-feedback")).toBeHidden();
 await screenshot(page, testInfo, "pronunciation-game");
});
test("all eight supplied recordings decode; selecting a card flips it and plays its actual audio", async ({ page }, testInfo) => {
 await observeAudio(page); await start(page);
 const recordings = await page.evaluate(async files => {
  const context = new AudioContext();
  try { return await Promise.all(files.map(async word => {
   const response = await fetch("./assets/pronunciation/" + word + ".mp3");
   if (!response.ok) throw Error(word + " unavailable");
   const decoded = await context.decodeAudioData(await response.arrayBuffer());
   return { word, duration: decoded.duration, samples: decoded.length };
  })); } finally { await context.close(); }
 }, words);
 for (const recording of recordings) {
  expect(recording.duration, recording.word).toBeGreaterThan(0);
  expect(recording.duration, recording.word).toBeLessThan(10);
  expect(recording.samples, recording.word).toBeGreaterThan(0);
 }
 await card(page, "roofs").click();
 await expect(card(page, "roofs")).toHaveClass(/is-flipped/);
 await expect(card(page, "roofs").locator(".card-ipa")).toHaveText("/ruːfs/");
 await expect(card(page, "roofs").locator(".card-meaning")).toHaveText("những mái nhà");
 await expect.poll(() => page.evaluate(() => {
  const audio = window.matcherAudio.at(-1); return audio.src.endsWith("/roofs.mp3") && audio.readyState >= 2 && !audio.paused && !audio.error;
 })).toBe(true);
 await card(page, "steps").click();
 await expect(card(page, "steps").locator(".card-ipa")).toHaveText("/steps/");
 await expect(card(page, "steps").locator(".card-meaning")).toHaveText("những bậc thang");
 await expect(page.locator("#match-feedback")).toHaveText("Correct! Both words end with the same sound!");
 expect(await page.evaluate(() => window.matcherAudio.slice(0, -1).every(audio => audio.paused))).toBe(true);
 await screenshot(page, testInfo, "pronunciation-card-backs");
});
test("wrong sounds show the exact retry feedback, block a third card and flip back for another try", async ({ page }, testInfo) => {
 await start(page); await match(page, "roofs", "doors");
 await expect(page.locator("#match-feedback")).toHaveText("Not quite! Listen again and try another pair.");
 await expect(page.locator("#pair-count")).toHaveText("Pairs matched: 0/4");
 await expect(card(page, "windows")).toBeDisabled();
 await card(page, "windows").evaluate(button => button.click());
 await expect(card(page, "windows")).toHaveAttribute("aria-pressed", "false");
 await screenshot(page, testInfo, "pronunciation-wrong-pair");
 await expect(card(page, "roofs")).not.toHaveClass(/is-flipped/);
 await expect(card(page, "doors")).not.toHaveClass(/is-flipped/);
 await expect(card(page, "windows")).toBeEnabled();
 await match(page, "roofs", "steps");
 await expect(page.locator("#pair-count")).toHaveText("Pairs matched: 1/4");
 await expect(page.locator(".sound-card.is-matched")).toHaveCount(2);
});
test("matching by sound accepts alternative valid pairs, completes four pairs and starts a fresh shuffled game", async ({ page }, testInfo) => {
 await start(page);
 const pairs = [["roofs", "baskets"], ["steps", "mats"], ["doors", "clothes"], ["windows", "beads"]];
 for (const [index, pair] of pairs.entries()) {
  await match(page, ...pair);
  await expect(page.locator("#pair-count")).toHaveText("Pairs matched: " + (index + 1) + "/4");
  await expect(page.locator("#match-feedback")).toHaveText("Correct! Both words end with the same sound!");
 }
 await expect(page.locator("#matcher-completion")).toBeVisible();
 await expect(page.locator("#matcher-game")).toBeHidden();
 await expect(page.locator("#completion-title")).toHaveText("Great job!");
 await expect(page.locator(".completion-message")).toHaveText("You matched all the words!");
 await expect(page.locator(".completion-note")).toHaveText("You found all 4 pairs. Keep listening and learning!");
 await screenshot(page, testInfo, "pronunciation-completed");
 await page.getByRole("button", { name: "Play Again", exact: true }).click();
 await expect(page.locator("#matcher-game")).toBeVisible();
 await expect(page.locator("#matcher-completion")).toBeHidden();
 await expect(page.locator("#pair-count")).toHaveText("Pairs matched: 0/4");
 await expect(page.locator(".sound-card.is-flipped,.sound-card.is-matched")).toHaveCount(0);
 await expect(page.locator("#match-feedback")).toBeHidden();
 expect((await page.locator(".sound-card").evaluateAll(cards => cards.map(card => card.dataset.word))).sort()).toEqual([...words].sort());
});
test("one card cannot match itself, matched cards replay without extra points and keyboard selection works", async ({ page }) => {
 await observeAudio(page); await start(page);
 await card(page, "roofs").focus(); await page.keyboard.press("Enter");
 await page.keyboard.press("Enter");
 await expect(page.locator("#pair-count")).toHaveText("Pairs matched: 0/4");
 await expect(page.locator(".sound-card.is-selected")).toHaveCount(1);
 await card(page, "steps").focus(); await page.keyboard.press("Space");
 await expect(page.locator("#pair-count")).toHaveText("Pairs matched: 1/4");
 await card(page, "roofs").click();
 await expect.poll(() => page.evaluate(() => window.matcherAudio.at(-1).src.endsWith("/roofs.mp3"))).toBe(true);
 await expect(page.locator("#pair-count")).toHaveText("Pairs matched: 1/4");
 await expect(page.locator(".sound-card.is-selected")).toHaveCount(0);
});
test("failed audio can be retried by tapping the same card", async ({ page }) => {
 await observeAudio(page);
 await page.route("**/assets/pronunciation/clothes.mp3", route => route.abort());
 await start(page); await card(page, "clothes").click();
 await expect(page.locator("#audio-status")).toHaveText("Could not play this word. Tap the card to listen again.");
 await page.unroute("**/assets/pronunciation/clothes.mp3");
 await card(page, "clothes").click();
 await expect(page.locator("#audio-status")).toBeHidden();
 await expect.poll(() => page.evaluate(() => window.matcherAudio.at(-1).readyState >= 2 && !window.matcherAudio.at(-1).error)).toBe(true);
 await expect(page.locator("#pair-count")).toHaveText("Pairs matched: 0/4");
});
