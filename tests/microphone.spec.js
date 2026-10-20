import {test,expect} from "@playwright/test";
test.use({
 permissions:["microphone"],
 launchOptions:{...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]}
});
test("record start, timed capture, stop and retry release the microphone",async({page})=>{
 await page.route("**/api/speaking/status",route=>route.fulfill({json:{configured:true}}));
 await page.route("**/api/speaking/assess",route=>route.fulfill({json:{assessment:{hasSpeech:true,passed:true,encouragement:"Well done!"}}}));
 await page.addInitScript(()=>{
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async constraints=>{
   const stream=await original(constraints);window.testAudioStream=stream;return stream;
  };
 });
 await page.goto("/speaking.html#missions");
 await page.locator("#record").click();await expect(page.locator("#record")).toHaveAttribute("aria-pressed","true");
 await expect(page.locator("#record-status")).toContainText("2/60");
 await page.locator("#record").click();
 await expect(page.locator("#record")).toHaveAttribute("aria-pressed","false");
 await expect(page.locator("#recording")).toBeVisible();
 expect(await page.evaluate(()=>window.testAudioStream.getTracks().every(track=>track.readyState==="ended"))).toBe(true);
 await page.locator("#retry").click();await expect(page.locator("#recording")).toBeHidden();
 await expect(page.locator("#feedback")).toBeHidden();
 await expect(page.locator("#assess, .practice-panel, .consent")).toHaveCount(0);
});
test("microphone permission denial keeps the microphone retry available",async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Denied","NotAllowedError");};});
 await page.goto("/speaking.html#missions");await page.locator("#record").click();
 await expect(page.locator("#record-status")).toContainText("permission was denied");
 await expect(page.locator("#audio-file")).toHaveCount(0);
 await expect(page.locator("#retry")).toBeEnabled();
 await expect(page.locator("#feedback")).toBeHidden();
 await expect(page.locator("#record")).toHaveAttribute("aria-pressed","false");
});
