import { copyFile, mkdir } from "node:fs/promises";

// Keep the supplied activity clips and Banban recordings in sync with the deployed assets.
export const speakingAudio = [
 ["hello im banban.mp3", "hello-im-banban.mp3"],
 ["nice try.mp3", "nice-try.mp3"],
 ["well done.mp3", "well-done.mp3"],
 ["under.mp3", "word-under.mp3"],
 ["underneath.mp3", "word-underneath.mp3"],
 ["at the bottom of.mp3", "word-at-the-bottom-of.mp3"],
 ["below.mp3", "word-below.mp3"],
 ["Audio/ACT 1/Question 1.mp3", "a1-question-1.mp3"],
 ["Audio/ACT 1/Question 2.mp3", "a1-question-2.mp3"],
 ["Audio/ACT 1/Answer 1.mp3", "a1-answer-1.mp3"],
 ["Audio/ACT 1/Answer 2.mp3", "a1-answer-2.mp3"],
 ["Audio/ACT 1/Phản hồi đúng Q1.mp3", "a1-success-1.mp3"],
 ["Audio/ACT 1/Phản hồi đúng Q2.mp3", "a1-success-2.mp3"],
 ["Audio/ACT 2/Question 1.mp3", "a2-question-1.mp3"],
 ["Audio/ACT 2/Question 2.mp3", "a2-question-2.mp3"],
 ["Audio/ACT 2/Phản hồi khi đúng.mp3", "a2-success.mp3"],
 ["Audio/ACT 2/Phản hồi khi sai.mp3", "a2-retry.mp3"],
 ["Audio/ACT 3/Question 1.mp3", "a3-question-1.mp3"],
 ["Audio/ACT 3/Gợi ý 1.mp3", "a3-hint-1.mp3"],
 ["Audio/ACT 3/Gợi ý 2.mp3", "a3-hint-2.mp3"],
 ["Audio/ACT 3/Gợi ý 3.mp3", "a3-hint-3.mp3"],
];
const source = new URL("../E. SPEAKING/", import.meta.url);
const target = new URL("../assets/speaking/audio/", import.meta.url);
await mkdir(target, { recursive: true });
for (const [file, output] of speakingAudio) {
 await copyFile(new URL(file, source), new URL(output, target));
}
console.log("Prepared " + speakingAudio.length + " Speaking audio clips.");
