import { test, expect } from "@playwright/test";
test.use({ permissions: ["microphone"], launchOptions: { ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}), args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });

const clips = [
 "hello-im-banban.mp3", "nice-try.mp3", "well-done.mp3",
 "word-under.mp3", "word-underneath.mp3", "word-at-the-bottom-of.mp3", "word-below.mp3",
 "a1-question-1.mp3", "a1-question-2.mp3", "a1-answer-1.mp3", "a1-answer-2.mp3",
 "a1-success-1.mp3", "a1-success-2.mp3", "a2-question-1.mp3", "a2-question-2.mp3",
 "a2-success.mp3", "a2-retry.mp3", "a3-question-1.mp3",
 "a3-hint-1.mp3", "a3-hint-2.mp3", "a3-hint-3.mp3",
];

test("all twenty-one supplied Speaking recordings can be decoded by the browser", async ({ page }) => {
 await page.goto("/speaking.html");
 const recordings = await page.evaluate(async files => {
  const context = new AudioContext();
  try {
   return await Promise.all(files.map(async file => {
    try {
     const response = await fetch("./assets/speaking/audio/" + file);
     if (!response.ok) throw new Error("Audio unavailable: " + response.status);
     const decoded = await context.decodeAudioData(await response.arrayBuffer());
     return { file, duration: decoded.duration, samples: decoded.length };
    } catch (error) { return { file, error: error.message }; }
   }));
  } finally { await context.close(); }
 }, clips);
 for (const recording of recordings) {
  expect(recording.error, recording.file).toBeUndefined();
  expect(recording.duration, recording.file).toBeGreaterThan(0);
  expect(recording.duration, recording.file).toBeLessThan(60);
  expect(recording.samples, recording.file).toBeGreaterThan(0);
 }
});


async function observeAudio(page) {
 await page.addInitScript(() => {
  const NativeAudio = window.Audio; window.speakingAudio = []; window.spoken = [];
  window.Audio = class extends NativeAudio { constructor(src) { super(src); window.speakingAudio.push(this); } };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel() {}, getVoices() { return []; }, speak(utterance) { window.spoken.push(utterance.text); queueMicrotask(() => utterance.onend?.()); } } });
 });
}
async function expectClip(page, file) {
 await expect.poll(() => page.evaluate(file => {
  const audio = window.speakingAudio.at(-1);
  return Boolean(audio?.src.endsWith("/" + file) && audio.readyState >= 2 && !audio.error);
 }, file)).toBe(true);
}
async function finishClip(page, file) {
 await page.evaluate(file => {
  const audio = window.speakingAudio.findLast(audio => audio.src.endsWith("/" + file));
  audio.pause(); audio.dispatchEvent(new Event("ended"));
 }, file);
}

test("Start automatically plays the new Banban greeting before the first question, with no separate greeting button", async ({ page }) => {
 await observeAudio(page);
 await page.goto("/speaking.html");
 await expect(page.getByRole("button", { name: /Listen to Banban/i })).toHaveCount(0);
 await expect(page.locator("#listen-greeting, .greeting-listen")).toHaveCount(0);
 expect(await page.evaluate(() => window.speakingAudio.length)).toBe(0);
 await page.locator("#start-speaking").click();
 await expectClip(page, "hello-im-banban.mp3");
 await expect.poll(() => page.evaluate(() => !window.speakingAudio[0].paused && window.speakingAudio[0].currentTime > 0)).toBe(true);
 expect(await page.evaluate(() => window.speakingAudio.length)).toBe(1);
 expect(await page.evaluate(() => window.spoken)).toEqual([]);
 await finishClip(page, "hello-im-banban.mp3");
 await expectClip(page, "a1-question-1.mp3");
 expect(await page.evaluate(() => window.speakingAudio.length)).toBe(2);
 await expect(page.locator("#mission-prompt")).toHaveText("Whose blanket is this?");
});

test("interrupting the greeting stops its audio and prevents a late question from interrupting Listen", async ({ page }) => {
 await observeAudio(page);
 await page.goto("/speaking.html");
 await page.locator("#start-speaking").click();
 await expectClip(page, "hello-im-banban.mp3");
 await page.locator("#listen-prompt").click();
 await expectClip(page, "a1-answer-1.mp3");
 await finishClip(page, "hello-im-banban.mp3");
 expect(await page.evaluate(() => window.speakingAudio.map(audio => new URL(audio.src).pathname.split("/").at(-1)))).toEqual(["hello-im-banban.mp3", "a1-answer-1.mp3"]);
 expect(await page.evaluate(() => window.speakingAudio[0].paused)).toBe(true);
});

// Advance real playback: the lightweight local server does not provide byte-range seeking.
async function playAnswerTo(page, seconds) {
 await page.evaluate(async seconds => {
  const audio = window.speakingAudio.at(-1);
  await audio.play();
  await new Promise(resolve => {
   function check() {
    if (audio.currentTime >= seconds || audio.ended) {
     audio.pause(); audio.dispatchEvent(new Event("timeupdate")); resolve();
    } else requestAnimationFrame(check);
   }
   check();
  });
 }, seconds);
}
async function transcriptScreenshot(page, testInfo, name) {
 await page.locator("#mission-image").evaluate(image => image.decode());
 await page.evaluate(() => document.fonts.ready);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.locator(".speaking-activity").screenshot({ path: testInfo.outputPath(name + ".png"), animations: "disabled" });
}

test("Activity 1 reveals only spoken words, keeps completed text, and restarts on Listen", async ({ page }, testInfo) => {
 await observeAudio(page);
 await page.goto("/speaking.html#missions");
 const panel = page.locator("#answer-transcript"), words = page.locator("#transcript-words");
 await expect(panel).toBeVisible();
 await expect(panel).not.toHaveAttribute("open");
 await expect(words).toBeEmpty();
 await panel.locator("summary").focus(); await page.keyboard.press("Enter");
 await expect(panel).toHaveAttribute("open");
 await expect(page.locator("#transcript-hint")).toBeVisible();
 await expect(words).toBeHidden();
 await page.keyboard.press("Space");
 await expect(panel).not.toHaveAttribute("open");
 await page.locator("#listen-prompt").click();
 await expectClip(page, "a1-answer-1.mp3");
 await expect(panel).toHaveAttribute("open");
 await expect(words).toBeVisible();
 await playAnswerTo(page, 0.8);
 await expect(words).toHaveText("It's my grandmother's");
 await expect(words.locator(".is-current")).toHaveText("grandmother's");
 await transcriptScreenshot(page, testInfo, "transcript-following");
 await playAnswerTo(page, 2.55);
 await expect(words).toHaveText("It's my grandmother's blanket. It's on the");
 await expect(words.locator(".is-current")).toHaveText("the");
 await finishClip(page, "a1-answer-1.mp3");
 await expect(words).toHaveText("It's my grandmother's blanket. It's on the floor next to the fireplace.");
 await expect(words.locator(".is-current")).toHaveCount(0);
 await transcriptScreenshot(page, testInfo, "transcript-complete");
 await page.locator("#listen-prompt").click();
 await expectClip(page, "a1-answer-1.mp3");
 await playAnswerTo(page, 0.1);
 await expect(words).toHaveText("It's");
 await page.evaluate(() => {
  const previous = window.speakingAudio.at(-2);
  previous.currentTime = 4; previous.dispatchEvent(new Event("timeupdate")); previous.dispatchEvent(new Event("ended"));
 });
 await expect(words).toHaveText("It's");
 await panel.locator("summary").click();
 await expect(panel).not.toHaveAttribute("open");
 await playAnswerTo(page, 2.8);
 await expect(panel).not.toHaveAttribute("open");
 await panel.locator("summary").click();
 await expect(words).toHaveText("It's my grandmother's blanket. It's on the floor");
});

test("the second answer follows its own audio position and playback speed through the real ending", async ({ page }, testInfo) => {
 await observeAudio(page);
 await page.addInitScript(() => localStorage.setItem("localingo.progress.v1", JSON.stringify({ speakingVersion: 2, speaking: ["house-1"] })));
 await page.goto("/speaking.html#missions");
 await page.locator("#listen-prompt").click();
 await expectClip(page, "a1-answer-2.mp3");
 await playAnswerTo(page, 1.7);
 await expect(page.locator("#transcript-words")).toHaveText("There is a fireplace in the");
 await playAnswerTo(page, 3.9);
 await expect(page.locator("#transcript-words")).toHaveText("There is a fireplace in the middle of the room. There is a low table");
 await transcriptScreenshot(page, testInfo, "transcript-second-answer");
 await page.locator("#listen-prompt").click();
 await expectClip(page, "a1-answer-2.mp3");
 await page.evaluate(() => { window.speakingAudio.at(-1).playbackRate = 2; });
 await expect.poll(() => page.evaluate(() => window.speakingAudio.at(-1).ended)).toBe(true);
 await expect(page.locator("#transcript-words")).toHaveText("There is a fireplace in the middle of the room. There is a low table next to the fireplace.");
 await expect(page.locator("#transcript-words .is-current")).toHaveCount(0);
});

test("recording freezes the transcript and Next clears it before hiding it in Activity 2", async ({ page }) => {
 await observeAudio(page);
 await page.route("**/api/speaking/status", route => route.fulfill({ json: { configured: false } }));
 await page.goto("/speaking.html#missions");
 for (let question = 1; question <= 2; question++) {
  await expect(page.locator("#answer-transcript")).not.toHaveAttribute("open");
  await expect(page.locator("#transcript-words")).toBeEmpty();
  await page.locator("#listen-prompt").click();
  await expectClip(page, "a1-answer-" + question + ".mp3");
  await playAnswerTo(page, 0.8);
  const partial = await page.locator("#transcript-words").innerText();
  await page.locator("#record").click();
  await expect(page.locator("#record")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.speakingAudio.at(-1).paused)).toBe(true);
  await expect(page.locator("#transcript-words .is-current")).toHaveCount(0);
  await page.evaluate(() => {
   const audio = window.speakingAudio.at(-1);
   audio.currentTime = 4; audio.dispatchEvent(new Event("timeupdate")); audio.dispatchEvent(new Event("ended"));
  });
  await expect(page.locator("#transcript-words")).toHaveText(partial);
  await expect(page.locator("#record-status")).toContainText("2/60");
  await page.locator("#record").click();
  await expect(page.locator("#next-mission")).toBeEnabled();
  await page.locator("#next-mission").click();
 }
 await expect(page.locator("#answer-transcript")).toBeHidden();
 await expect(page.locator("#transcript-words")).toBeEmpty();
 await expect(page.locator("#mission-example")).toHaveText("The piece of wood is ____ the stilt house.");
 await page.locator("#listen-prompt").click();
 await expectClip(page, "a2-question-1.mp3");
 await expect(page.locator("#answer-transcript")).toBeHidden();
});

test("an unavailable answer does not reveal unspoken text and Listen can recover", async ({ page }) => {
 await observeAudio(page);
 await page.route("**/a1-answer-1.mp3", route => route.abort());
 await page.goto("/speaking.html#missions");
 await page.locator("#listen-prompt").click();
 await expect(page.locator("#record-status")).toContainText("Could not play this audio");
 await expect(page.locator("#transcript-words")).toBeEmpty();
 await expect(page.locator("#transcript-hint")).toBeVisible();
 await page.unroute("**/a1-answer-1.mp3");
 await page.locator("#listen-prompt").click();
 await expectClip(page, "a1-answer-1.mp3");
 await playAnswerTo(page, 0.8);
 await expect(page.locator("#transcript-words")).toHaveText("It's my grandmother's");
 await expect(page.locator("#record-status")).toBeHidden();
});

test("all four preposition hints use their supplied recordings and stop the previous voice", async ({ page }) => {
 await observeAudio(page);
 await page.addInitScript(() => localStorage.setItem("localingo.progress.v1", JSON.stringify({ speakingVersion: 2, speaking: ["house-1", "house-2"] })));
 await page.goto("/speaking.html#missions");
 const words = [["under", "word-under.mp3"], ["underneath", "word-underneath.mp3"], ["at the bottom of", "word-at-the-bottom-of.mp3"], ["below", "word-below.mp3"]];
 for (const [word, file] of words) {
  await page.locator("#word-bank").getByRole("button", { name: word, exact: true }).click();
  await expectClip(page, file);
  expect(await page.evaluate(() => window.speakingAudio.slice(0, -1).every(audio => audio.paused))).toBe(true);
 }
 expect(await page.evaluate(() => window.spoken)).toEqual([]);
});


test.describe("recorded Banban feedback", () => {
 async function recordAnswer(page) {
  await page.locator("#record").click();
  await expect(page.locator("#record")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#record-status")).toContainText("2/60");
  await page.locator("#record").click();
  await expect(page.locator("#feedback")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#feedback")).toBeVisible();
 }
 async function open(page, assessment) {
  await observeAudio(page);
  await page.route("**/api/speaking/status", route => route.fulfill({ json: { configured: true } }));
  await page.route("**/api/speaking/assess", route => route.fulfill({ json: { assessment } }));
  await page.goto("/speaking.html#missions");
 }
 test("a correct first answer plays the new well done recording", async ({ page }) => {
  await open(page, { hasSpeech: true, passed: true, encouragement: "Well done! Now you are ready for the next question." });
  await recordAnswer(page);
  await expectClip(page, "well-done.mp3");
  expect(await page.evaluate(() => window.spoken)).toEqual([]);
 });
 test("nice try is followed by the learner's practice word and Next cancels a pending word", async ({ page }) => {
  await open(page, { hasSpeech: true, passed: false, practiceWord: "fireplace", encouragement: "Nice try! Listen again and repeat the word fireplace." });
  await recordAnswer(page);
  await expectClip(page, "nice-try.mp3");
  expect(await page.evaluate(() => window.spoken)).toEqual([]);
  await finishClip(page, "nice-try.mp3");
  await expect.poll(() => page.evaluate(() => window.spoken)).toEqual(["fireplace"]);
  await page.locator("#retry").click();
  await recordAnswer(page);
  await expectClip(page, "nice-try.mp3");
  await page.locator("#next-mission").click();
  await expectClip(page, "a1-question-2.mp3");
  await finishClip(page, "nice-try.mp3");
  expect(await page.evaluate(() => window.spoken)).toEqual(["fireplace"]);
  await expect(page.locator("#mission-prompt")).toHaveText("What is in the living room?");
 });
});
