import { test, expect } from "@playwright/test";
test.use({ permissions: ["microphone"], launchOptions: { ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}), args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });

const clips = [
 "hello-im-banban.mp3", "nice-try.mp3", "well-done.mp3",
 "word-under.mp3", "word-underneath.mp3", "word-at-the-bottom-of.mp3", "word-below.mp3",
 "a1-question-1.mp3", "a1-question-2.mp3", "a1-answer-1.mp3", "a1-answer-2.mp3",
 "a1-success-1.mp3", "a1-success-2.mp3", "a2-question-1.mp3", "a2-question-2.mp3",
 "a2-success.mp3", "a2-retry.mp3", "a3-question-1.mp3",
 "a3-hint-1.mp3", "a3-hint-2.mp3", "a3-hint-3.mp3",
 "word-fireplace.mp3", "word-table.mp3", "word-in.mp3", "word-in-the-middle-of.mp3", "a3-success.mp3",
];

test("all supplied Speaking recordings can be decoded by the browser", async ({ page }) => {
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
  for (const key of ["SpeechRecognition", "webkitSpeechRecognition"]) Object.defineProperty(window, key, { configurable: true, value: undefined });
  window.Audio = class extends NativeAudio { constructor(src) { super(src); window.speakingAudio.push(this); } };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel() {}, getVoices() { return []; }, speak(utterance) { window.spoken.push(utterance.text); utterance.onstart?.(); queueMicrotask(() => utterance.onend?.()); } } });
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

async function startConversation(page){
 await page.goto("/speaking.html");await page.locator("#start-speaking").click();
 await expectClip(page,"hello-im-banban.mp3");await finishClip(page,"hello-im-banban.mp3");
 await expectClip(page,"a1-question-1.mp3");
 await expect(page.locator(".transcript-text").last()).toHaveText("Whose blanket is this?");
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
 await page.locator("#answer-transcript").screenshot({ path: testInfo.outputPath(name + ".png"), animations: "disabled" });
}

test("Activity 1 keeps spoken turns, follows the answer and adds a new turn on replay", async ({ page }, testInfo) => {
 await observeAudio(page);
 await startConversation(page);
 const panel=page.locator("#answer-transcript"),texts=page.locator("#transcript-words .transcript-text");
 await expect(panel).toBeVisible();
 await expect(texts.nth(1)).toHaveText("Whose blanket is this?");
 await panel.locator("summary").focus();await page.keyboard.press("Enter");
 await expect(panel).not.toHaveAttribute("open");
 await page.keyboard.press("Space");await expect(panel).toHaveAttribute("open");
 await page.locator("#listen-prompt").click();
 await expectClip(page,"a1-answer-1.mp3");
 await playAnswerTo(page,0.8);
 await expect(texts.last()).toHaveText("It's my grandmother's");
 await expect(texts.last().locator(".is-current")).toHaveText("grandmother's");
 await expect(page.locator(".transcript-speaker")).toHaveText(["BanBan:","BanBan:","BanBan:"]);
 await transcriptScreenshot(page,testInfo,"transcript-following");
 await playAnswerTo(page,2.55);
 await expect(texts.last()).toHaveText("It's my grandmother's blanket. It's on the");
 await finishClip(page,"a1-answer-1.mp3");
 await expect(texts.last()).toHaveText("It's my grandmother's blanket. It's on the floor next to the fireplace.");
 await expect(page.locator(".is-current")).toHaveCount(0);
 await transcriptScreenshot(page,testInfo,"transcript-complete");
 await page.locator("#listen-prompt").click();
 await expectClip(page,"a1-answer-1.mp3");await playAnswerTo(page,0.1);
 await expect(texts.last()).toHaveText("It's");
 await expect(texts).toHaveCount(4);
 await page.evaluate(()=>{const old=window.speakingAudio.at(-2);old.currentTime=4;old.dispatchEvent(new Event("timeupdate"));old.dispatchEvent(new Event("ended"));});
 await expect(texts.last()).toHaveText("It's");
 await panel.locator("summary").click();await playAnswerTo(page,2.8);
 await expect(panel).not.toHaveAttribute("open");
 await panel.locator("summary").click();
 await expect(texts.last()).toHaveText("It's my grandmother's blanket. It's on the floor");
});

test("the second answer follows its own audio position and playback speed through the real ending", async ({ page }, testInfo) => {
 await observeAudio(page);
 await page.addInitScript(()=>localStorage.setItem("localingo.progress.v1",JSON.stringify({speakingVersion:2,speaking:["house-1"]})));
 await page.goto("/speaking.html#missions");
 await page.locator("#listen-prompt").click();await expectClip(page,"a1-answer-2.mp3");
 const text=page.locator("#transcript-words .transcript-text").last();
 await playAnswerTo(page,1.7);await expect(text).toHaveText("There is a fireplace in the");
 await playAnswerTo(page,3.9);await expect(text).toHaveText("There is a fireplace in the middle of the room. There is a low table");
 await transcriptScreenshot(page,testInfo,"transcript-second-answer");
 await page.locator("#listen-prompt").click();await expectClip(page,"a1-answer-2.mp3");
 await page.evaluate(()=>{window.speakingAudio.at(-1).playbackRate=2;});
 await expect.poll(()=>page.evaluate(()=>window.speakingAudio.at(-1).ended)).toBe(true);
 await expect(text).toHaveText("There is a fireplace in the middle of the room. There is a low table next to the fireplace.");
 await expect(page.locator("#transcript-words .is-current")).toHaveCount(0);
});

test("recording freezes the answer and conversation remains available across activities", async ({ page }) => {
 await observeAudio(page);
 await page.route("**/api/speaking/status",route=>route.fulfill({json:{configured:false}}));
 await startConversation(page);
 for(let question=1;question<=2;question++){
  await page.locator("#listen-prompt").click();await expectClip(page,"a1-answer-"+question+".mp3");await playAnswerTo(page,0.8);
  const answer=page.locator("#transcript-words .transcript-turn:not(.is-user)").last().locator(".transcript-text");
  const partial=await answer.innerText();
  await page.locator("#record").click();await expect(page.locator("#record")).toHaveAttribute("aria-pressed","true");
  expect(await page.evaluate(()=>window.speakingAudio.at(-1).paused)).toBe(true);
  await expect(page.locator("#transcript-words .is-current")).toHaveCount(0);
  await page.evaluate(()=>{const old=window.speakingAudio.at(-1);old.currentTime=4;old.dispatchEvent(new Event("timeupdate"));old.dispatchEvent(new Event("ended"));});
  await expect(answer).toHaveText(partial);
  await expect(page.locator("#record-status")).toContainText("2/60");await page.locator("#record").click();
  await expect(page.locator("#next-mission")).toBeEnabled();await page.locator("#next-mission").click();
 }
 await expect(page.locator("#answer-transcript")).toBeVisible();
 await expect(page.locator("#transcript-words")).toContainText("Whose blanket is this?");
 await expect(page.locator("#mission-example")).toHaveText("The piece of wood is ____ the stilt house.");
 await page.locator("#listen-prompt").click();await expectClip(page,"a2-question-1.mp3");
 await expect(page.locator("#transcript-words .transcript-text").last()).toHaveText("Where is the piece of wood?");
});

test("failed audio adds no invented speech and Listen can recover", async ({ page }) => {
 await observeAudio(page);
 await page.route("**/a1-answer-1.mp3",route=>route.abort());await startConversation(page);
 const texts=page.locator("#transcript-words .transcript-text");
 await expect(texts).toHaveCount(2);await expect(texts.last()).toHaveText("Whose blanket is this?");
 await page.locator("#listen-prompt").click();await expect(page.locator("#record-status")).toContainText("Could not play this audio");
 await expect(texts).toHaveCount(2);await expect(texts.last()).toHaveText("Whose blanket is this?");
 await page.unroute("**/a1-answer-1.mp3");await page.locator("#listen-prompt").click();await expectClip(page,"a1-answer-1.mp3");
 await playAnswerTo(page,0.8);await expect(texts.last()).toHaveText("It's my grandmother's");
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


test("all four words in Activity 2 question 2 use the new recordings", async ({ page }) => {
 await observeAudio(page);
 await page.addInitScript(() => localStorage.setItem("localingo.progress.v1", JSON.stringify({ speakingVersion: 2, speaking: ["house-1", "house-2", "house-3"] })));
 await page.goto("/speaking.html#missions");
 await expect(page.locator("#mission-prompt")).toHaveText("Where is the fireplace?");
 for (const [word, file] of [["fireplace", "word-fireplace.mp3"], ["table", "word-table.mp3"], ["in", "word-in.mp3"], ["in the middle of", "word-in-the-middle-of.mp3"]]) {
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
 async function open(page, assessment, completed = []) {
  await observeAudio(page);
  if (completed.length) await page.addInitScript(speaking => localStorage.setItem("localingo.progress.v1", JSON.stringify({ speakingVersion: 2, speaking })), completed);
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
  await expectClip(page, "word-fireplace.mp3");
  expect(await page.evaluate(() => window.spoken)).toEqual([]);
  await page.locator("#retry").click();
  await recordAnswer(page);
  await expectClip(page, "nice-try.mp3");
  await page.locator("#next-mission").click();
  await expectClip(page, "a1-question-2.mp3");
  await finishClip(page, "nice-try.mp3");
  expect(await page.evaluate(() => window.spoken)).toEqual([]);
  expect(await page.evaluate(() => window.speakingAudio.filter(audio => audio.src.endsWith("/word-fireplace.mp3")).length)).toBe(1);
  await expect(page.locator("#mission-prompt")).toHaveText("What is in the living room?");
 });
 test("Activity 1 question 2 plays its transition feedback and Next starts Activity 2", async ({ page }) => {
  await open(page, { hasSpeech: true, passed: true, encouragement: "Well done! Now you are ready for the next activity." }, ["house-1"]);
  await recordAnswer(page);
  await expectClip(page, "a1-success-2.mp3");
  await expect(page.locator("#feedback-content")).toContainText("next activity");
  await expect(page.locator("#next-mission")).toContainText("Next activity");
  await page.locator("#next-mission").click();
  await expectClip(page, "a2-question-1.mp3");
  await expect(page.locator("#feedback")).toBeHidden();
  expect(await page.evaluate(() => window.speakingAudio.slice(0, -1).every(audio => audio.paused))).toBe(true);
  expect(await page.evaluate(() => window.spoken)).toEqual([]);
 });
 for (const passed of [true, false]) {
  for (const question of [1, 2]) {
   test("Activity 2 question " + question + " plays " + (passed ? "success" : "retry") + " feedback and clears it on Next", async ({ page }) => {
    const completed = question === 1 ? ["house-1", "house-2"] : ["house-1", "house-2", "house-3"];
    await open(page, { hasSpeech: true, passed, encouragement: passed ? "Well done!" : "Look at the picture again. You can use the words below to help you." }, completed);
    await recordAnswer(page);
    await expectClip(page, passed ? "a2-success.mp3" : "a2-retry.mp3");
    await expect(page.locator("#word-bank")).toBeVisible();
    await expect(page.locator("#next-mission")).toContainText(question === 1 ? "Next question" : "Next activity");
    await page.locator("#next-mission").click();
    await expectClip(page, question === 1 ? "a2-question-2.mp3" : "a3-question-1.mp3");
    await expect(page.locator("#feedback")).toBeHidden();
    expect(await page.evaluate(() => window.speakingAudio.slice(0, -1).every(audio => audio.paused))).toBe(true);
    expect(await page.evaluate(() => window.spoken)).toEqual([]);
   });
  }
 }
 test("Activity 3 plays the supplied praise before reading the learner's improved answer", async ({ page }) => {
  const correctedAnswer = "This is Nhinh's house. The basket is by the window.";
  await open(page, { hasSpeech: true, passed: true, encouragement: "Great effort! You described the room well! I understand what you mean.", transcript: "This Nhinh house. Basket by window.", correctedAnswer }, ["house-1", "house-2", "house-3", "house-4"]);
  await recordAnswer(page);
  await expectClip(page, "a3-success.mp3");
  await expect(page.locator("#feedback-content")).toContainText(correctedAnswer);
  expect(await page.evaluate(() => window.spoken)).toEqual([]);
  await finishClip(page, "a3-success.mp3");
  await expect.poll(() => page.evaluate(() => window.spoken)).toEqual([correctedAnswer]);
  await page.getByRole("button", { name: "Listen to your improved answer", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.spoken)).toEqual([correctedAnswer, correctedAnswer]);
 });
 for (const action of ["#retry", "#next-mission", "#listen-prompt", "#record"]) {
  test("Activity 3 " + action + " interrupts praise without starting a late improved answer", async ({ page }) => {
   await open(page, { hasSpeech: true, passed: true, encouragement: "Great effort!", correctedAnswer: "This is Nhinh's house. The basket is by the window." }, ["house-1", "house-2", "house-3", "house-4"]);
   await recordAnswer(page);
   await expectClip(page, "a3-success.mp3");
   await page.locator(action).click();
   await finishClip(page, "a3-success.mp3");
   expect(await page.evaluate(() => window.spoken)).toEqual([]);
   expect(await page.evaluate(() => window.speakingAudio.find(audio => audio.src.endsWith("/a3-success.mp3")).paused)).toBe(true);
   if (action === "#record") await page.locator("#retry").click();
  });
 }
 test("Activity 3 retry and no-speech responses never play the success recording", async ({ page }) => {
  const encouragement = "Nice try! Look at the picture again and describe the room in two or three sentences.";
  await open(page, { hasSpeech: true, passed: false, encouragement, correctedAnswer: "There is a basket." }, ["house-1", "house-2", "house-3", "house-4"]);
  await recordAnswer(page);
  await expect.poll(() => page.evaluate(() => window.spoken)).toEqual([encouragement, "There is a basket."]);
  expect(await page.evaluate(() => window.speakingAudio.some(audio => audio.src.endsWith("/a3-success.mp3")))).toBe(false);
  await page.route("**/api/speaking/assess", route => route.fulfill({ json: { assessment: { hasSpeech: false, passed: false, encouragement: "Please record your answer again.", correctedAnswer: "" } } }));
  await page.locator("#retry").click();
  await recordAnswer(page);
  await expect.poll(() => page.evaluate(() => window.spoken.at(-1))).toBe("Please record your answer again.");
  expect(await page.evaluate(() => window.speakingAudio.some(audio => audio.src.endsWith("/a3-success.mp3")))).toBe(false);
 });
});

async function mockRecognition(page){
 await page.addInitScript(()=>{
  window.recognitions=[];
  class Recognition{
   start(){window.recognitions.push(this);}
   abort(){this.aborted=true;}
   emit(text,final=false){const result=[{transcript:text}];result.isFinal=final;this.onresult?.({results:[result]});}
  }
  Object.defineProperty(window,"SpeechRecognition",{configurable:true,value:Recognition});
 });
}

test("live User words update one turn, server transcript replaces it, and BanBan responds in order",async({page},testInfo)=>{
 await observeAudio(page);await mockRecognition(page);
 await page.route("**/api/speaking/status",route=>route.fulfill({json:{configured:true}}));
 const transcript="It's my grandmother's blanket. It's on the floor next to the fireplace.";
 await page.route("**/api/speaking/assess",route=>route.fulfill({json:{assessment:{hasSpeech:true,passed:true,transcript,encouragement:"Well done! Now you are ready for the next question."}}}));
 await startConversation(page);
 await expect(page.locator(".transcript-text").nth(1)).toHaveText("Whose blanket is this?");
 await page.locator("#record").click();await expect(page.locator("#record")).toHaveAttribute("aria-pressed","true");
 const user=page.locator(".transcript-turn.is-user");
 await page.evaluate(()=>window.recognitions[0].emit("It's my"));
 await expect(user).toContainText("User:");await expect(user.locator(".transcript-text")).toHaveText("It's my");
 await expect(user).toHaveClass(/is-interim/);
 await page.evaluate(()=>window.recognitions[0].emit("It's my grandmother blanket",true));
 await expect(user).toHaveCount(1);await expect(user.locator(".transcript-text")).toHaveText("It's my grandmother blanket");
 await expect(page.locator("#record-status")).toContainText("2/60");await page.locator("#record").click();
 await expect(user.locator(".transcript-text")).toHaveText(transcript);await expect(user).not.toHaveClass(/is-interim/);
 await expectClip(page,"well-done.mp3");
 await expect(page.locator(".transcript-speaker")).toHaveText(["BanBan:","BanBan:","User:","BanBan:"]);
 await expect(page.locator(".transcript-text").last()).toHaveText("Well done! Now you are ready for the next question.");
 expect(await page.evaluate(()=>window.recognitions[0].aborted)).toBe(true);
 await transcriptScreenshot(page,testInfo,"conversation");
 await page.locator("#retry").click();await expect(user.locator(".transcript-text")).toHaveText(transcript);
 await page.locator("#next-mission").click();await expectClip(page,"a1-question-2.mp3");
 await expect(page.locator(".transcript-text").nth(1)).toHaveText("Whose blanket is this?");
 await expect(page.locator(".transcript-text").last()).toHaveText("What is in the living room?");
});

test("recognition failure preserves recording and ignores late results after retry",async({page})=>{
 await observeAudio(page);await mockRecognition(page);
 await page.route("**/api/speaking/status",route=>route.fulfill({json:{configured:false}}));await page.goto("/speaking.html#missions");
 await page.locator("#record").click();await expect(page.locator("#record")).toHaveAttribute("aria-pressed","true");
 await page.evaluate(()=>{window.lateResult=window.recognitions[0].onresult;window.recognitions[0].emit("There is a fireplace.");window.recognitions[0].onerror({error:"network"});});
 await expect(page.locator("#record")).toHaveAttribute("aria-pressed","true");
 await expect(page.locator(".is-user .transcript-text")).toHaveText("There is a fireplace.");
 await page.locator("#retry").click();
 await page.evaluate(()=>{const result=[{transcript:"Late words must not appear."}];result.isFinal=true;window.lateResult({results:[result]});});
 await expect(page.locator("#transcript-words")).not.toContainText("Late words");
 await page.locator("#record").click();await expect(page.locator("#record")).toHaveAttribute("aria-pressed","true");
 await page.evaluate(()=>window.recognitions[1].emit("A new answer.",true));
 await expect(page.locator(".is-user .transcript-text")).toHaveText(["There is a fireplace.","A new answer."]);
 await page.locator("#retry").click();
});
