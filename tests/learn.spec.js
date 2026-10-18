import {test,expect} from "@playwright/test";
import {encodeWav} from "../audio.js";
const assessment={hasSpeech:true,transcript:"There is a kitchen.",correctedAnswer:"There is a kitchen.",grammar:{score:85,feedback:"Câu đúng."},vocabulary:{score:90,feedback:"Từ phù hợp."},pronunciation:{score:null,feedback:"Đối chiếu từ với câu mẫu."},fluency:{score:null,feedback:"Nhịp nói ước tính 60 từ/phút."},encouragement:"Làm tốt lắm!",nextStep:"Thử thêm một câu."};
const fakeWav=async()=>Buffer.from(await encodeWav(Float32Array.from({length:32000},(_,i)=>.1*Math.sin(i/10))).arrayBuffer());
async function start(page,configured=true) {
 await page.route("**/api/speaking/status",route=>route.fulfill({json:{configured}}));
 await page.goto("/speaking.html");await page.getByRole("button",{name:"Start speaking with BanBan"}).click();
}
test("Learn → My House → Speaking follows supplied artwork",async({page},testInfo)=>{
 for(const [path,image] of [["/learn.html","learn"],["/my-house.html","my-house"]]) {
  await page.goto(path);await page.locator(".page-art").evaluate(img=>img.decode());
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(image+".png"),fullPage:true,animations:"disabled"});
 }
 await page.goto("/learn.html");await page.getByRole("link",{name:"Start My House"}).click();await expect(page).toHaveURL(/my-house.html$/);
 await page.getByRole("link",{name:"Speaking — Storyteller's Camp"}).click();await expect(page).toHaveURL(/speaking.html$/);
 await page.locator("#speaking-intro .page-art").evaluate(img=>img.decode());
 await page.screenshot({path:testInfo.outputPath("speaking-intro.png"),fullPage:true,animations:"disabled"});
 await page.getByRole("button",{name:"Start speaking with BanBan"}).click();await expect(page.locator("#mission-prompt")).toBeVisible();
 await page.locator(".speaking-control img").evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 await expect(page.locator("#speaking-exercise .page-art")).toHaveAttribute("src","./assets/learn/speaking-background.png");
 await expect(page.locator(".speaking-control")).toHaveCount(4);
 await expect(page.locator(".speaking-board,.paper-card,.exercise-shell")).toHaveCount(0);
 const controls=await page.locator(".speaking-control").evaluateAll(buttons=>buttons.map(button=>({id:button.id,x:button.getBoundingClientRect().x,y:button.getBoundingClientRect().y})));
 expect(controls.map(button=>button.id)).toEqual(["record","listen-prompt","retry","next-mission"]);
 expect(controls.every((button,i)=>i===0||button.x>controls[i-1].x)).toBe(true);
 expect(Math.max(...controls.map(button=>button.y))-Math.min(...controls.map(button=>button.y))).toBeLessThan(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath("speaking.png"),fullPage:true,animations:"disabled"});
});
test("written feedback does not complete a speaking mission",async({page})=>{
 await start(page);await page.route("**/api/speaking/assess",route=>route.fulfill({json:{mode:"text",assessment:{...assessment,hasSpeech:false}}}));
 await page.locator("#speaking-options").evaluate(el=>{el.open=true;});
 await page.getByText("Practise with a written answer",{exact:true}).click();
 await page.locator("#written-answer").fill("There is a kitchen.");await page.locator("#data-consent").check();
 await page.getByRole("button",{name:"Check written answer"}).click();
 await expect(page.locator("#feedback-content")).toContainText("There is a kitchen.");
 await expect(page.locator("[data-speaking-count]")).toHaveText("0/5 speaking missions completed");
 await expect(page.locator("#next-mission")).toBeDisabled();
});
test("audio consent, assessment, retry, saved completion and badge",async({page})=>{
 await start(page);
 let requests=0;await page.route("**/api/speaking/assess",async route=>{
  const body=route.request().postDataJSON();expect(body.audio).toMatch(/^UklGR/);expect(body.consent).toBe(true);requests++;
  await route.fulfill({json:{mode:"audio",assessment}});
 });
 const buffer=await fakeWav();
 for(let i=0;i<5;i++){
  await page.locator("#speaking-options").evaluate(el=>{el.open=true;});
  await page.locator("#mission-select").selectOption(String(i));
  await page.locator("#speaking-options").evaluate(el=>{el.open=true;});
 await page.locator("#audio-file").setInputFiles({name:"answer.wav",mimeType:"audio/wav",buffer});
  await expect(page.locator("#recording")).toBeVisible();
  await expect(page.locator("#assess")).toBeDisabled();
  await page.locator("#data-consent").check();await page.locator("#audio-consent").check();
  await page.locator("#assess").click();
  await expect(page.locator("[data-speaking-count]")).toHaveText(`${i+1}/5 speaking missions completed`);
 }
 expect(requests).toBe(5);await expect(page.locator("#completion")).toBeVisible();
 await page.reload();await expect(page.locator("[data-speaking-count]")).toHaveText("5/5 speaking missions completed");
 await expect(page.locator("[data-badge-status]")).toContainText("Storyteller — completed!");
 await page.locator("#retry").click();await expect(page.locator("#recording")).toBeHidden();
 await expect(page.locator("[data-speaking-count]")).toHaveText("5/5 speaking missions completed");
});
test("unavailable service and failed assessment never advance progress",async({page})=>{
 await start(page,false);await expect(page.locator("#ai-status")).toContainText("AI chưa");
 await expect(page.locator("#assess")).toBeDisabled();
 await start(page);await page.route("**/api/speaking/assess",route=>route.fulfill({status:502,json:{error:"Cloudflare AI đang bận."}}));
 await page.locator("#audio-file").setInputFiles({name:"answer.wav",mimeType:"audio/wav",buffer:await fakeWav()});
 await page.locator("#data-consent").check();await page.locator("#audio-consent").check();
 await page.locator("#assess").click();await expect(page.locator("#ai-status")).toContainText("đang bận");
 await expect(page.locator("#recording")).toBeVisible();await expect(page.locator("[data-speaking-count]")).toHaveText("0/5 speaking missions completed");
});
test("silence and corrupt audio are rejected before upload",async({page})=>{
 await start(page);
 const silent=Buffer.from(await encodeWav(new Float32Array(32000)).arrayBuffer());
 await page.locator("#audio-file").setInputFiles({name:"silent.wav",mimeType:"audio/wav",buffer:silent});
 await expect(page.locator("#record-status")).toContainText("quá nhỏ");await expect(page.locator("#assess")).toBeDisabled();
 await page.locator("#audio-file").setInputFiles({name:"broken.wav",mimeType:"audio/wav",buffer:Buffer.from("invalid")});
 await expect(page.locator("#record-status")).toContainText("Không đọc được");await expect(page.locator("#assess")).toBeDisabled();
});
