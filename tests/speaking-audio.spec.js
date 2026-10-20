import { test, expect } from "@playwright/test";

const clips = [
 "a1-question-1.mp3", "a1-question-2.mp3", "a1-answer-1.mp3", "a1-answer-2.mp3",
 "a1-success-1.mp3", "a1-success-2.mp3", "a2-question-1.mp3", "a2-question-2.mp3",
 "a2-success.mp3", "a2-retry.mp3", "a3-question-1.mp3",
 "a3-hint-1.mp3", "a3-hint-2.mp3", "a3-hint-3.mp3",
];

test("all fourteen supplied Speaking recordings can be decoded by the browser", async ({ page }) => {
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
