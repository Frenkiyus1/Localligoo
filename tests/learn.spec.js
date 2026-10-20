import {test,expect} from "@playwright/test";
import {handleApi} from "../worker.js";
import {missions} from "../missions.js";
test.use({permissions:["microphone"],launchOptions:{...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}),args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]}});
const improved="This is Nhinh's house. There is a basket next to the window. A low table is in front of her.";
async function start(page,configured=true){
 await page.addInitScript(()=>{
  window.spoken=[];
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},getVoices(){return[];},speak(u){window.spoken.push(u.text);setTimeout(()=>u.onend?.(),0);}}});
 });
 await page.route('**/api/speaking/status',route=>route.fulfill({json:{configured}}));
 await page.goto('/speaking.html');await page.getByRole('button',{name:'Start speaking with BanBan'}).click();
 await expect(page.locator('#mission-prompt')).toBeVisible();
}
async function backend(page,transcripts){
 let count=0;
 await page.route('**/api/speaking/assess',async route=>{
  const body=route.request().postDataJSON();expect(body.audio).toMatch(/^UklGR/);expect(body.consent).toBe(true);
  const text=transcripts[Math.min(count++,transcripts.length-1)];
  const result=await handleApi(new Request(route.request().url(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{AI:{run:async model=>model.includes('whisper')?{text}:{response:JSON.stringify({hasSpeech:true,taskCompleted:true,correctedAnswer:improved,grammar:{score:90,feedback:'Good sentences.'},vocabulary:{score:90,feedback:'Good words.'},encouragement:'Keep going!',nextStep:'Try again.'})}}});
  await route.fulfill({status:result.status,json:await result.json()});
 });
 return ()=>count;
}
async function recordAnswer(page){
 await page.locator('#record').click();await expect(page.locator('#record')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#record-status')).toContainText('2/60');
 await page.locator('#record').click();await expect(page.locator('#recording')).toBeVisible();
}
async function submit(page){
 const response=page.waitForResponse('**/api/speaking/assess');
 await recordAnswer(page);await response;
 await expect(page.locator('#feedback')).toHaveAttribute('aria-busy','false');
}
async function screenshot(page,testInfo,name){
 await page.locator('#mission-image').evaluate(img=>img.decode());await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath(name+'.png'),fullPage:true,animations:'disabled'});
}
test('Learn to My House to Speaking opens supplied artwork and the first activity',async({page},testInfo)=>{
 await page.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{configurable:true,value:null}));
 await page.goto('/learn.html');await page.getByRole('link',{name:'Start My House'}).click();
 await page.getByRole('link',{name:/^Speaking/}).click();
 await page.locator('.page-art').evaluate(img=>img.decode());
 await page.screenshot({path:testInfo.outputPath('speaking-intro.png'),fullPage:true,animations:'disabled'});
 const questionAudio=page.waitForResponse(r=>r.url().endsWith('/a1-question-1.mp3'));
 await page.getByRole('button',{name:'Start speaking with BanBan'}).click();expect((await questionAudio).ok()).toBe(true);
 await expect(page.locator('#mission-prompt')).toHaveText('Whose blanket is this?');
 await expect(page.locator('#mission-example')).toHaveText(missions[0].example);
 await expect(page.locator('.speaking-controls button')).toHaveCount(4);
 await expect(page.locator('.practice-panel, .upload-panel, .consent, #assess')).toHaveCount(0);
 await expect(page.locator('#feedback')).toBeHidden();await expect(page.locator('#feedback-content')).toBeEmpty();
 await expect(page.locator('#record-status')).toBeHidden();
 const answer=page.waitForResponse(r=>r.url().endsWith('/a1-answer-1.mp3'));await page.locator('#listen-prompt').click();expect((await answer).ok()).toBe(true);
 await screenshot(page,testInfo,'activity-1');
});
test('all five recorded answers follow the three activities, save progress and read back the learner correction',async({page},testInfo)=>{
 test.setTimeout(60000);await start(page);
 const transcripts=[missions[0].example,missions[1].example,'The piece of wood is underneath the stilt house.','The fireplace is in the living room.',"This is Nhinh's house. There is a basket next to window. A table is in front her."];
 const requests=await backend(page,transcripts);
 for(let i=0;i<5;i++){
  await expect(page.locator('#mission-prompt')).toHaveText(missions[i].prompt);
  if(i===2){await expect(page.locator('#word-bank button')).toHaveText(['under','underneath','at the bottom of','below']);await screenshot(page,testInfo,'activity-2');}
  if(i===4){await expect(page.locator('#answer-panel')).toBeHidden();await expect(page.locator('#mission-example')).toBeEmpty();await screenshot(page,testInfo,'activity-3');}
  await expect(page.locator('#feedback')).toBeHidden();
  await submit(page);
  await expect(page.locator('#feedback')).toBeVisible();
  if(i===0)await screenshot(page,testInfo,'speaking-response');
  await expect(page.locator('[data-speaking-count]')).toHaveText((i+1)+'/5 speaking missions completed');
  await expect(page.locator('#next-mission')).toBeEnabled();
  if(i<4)await page.locator('#next-mission').click();
 }
 expect(requests()).toBe(5);await expect(page.locator('#feedback-content')).toContainText(improved);
 await expect.poll(()=>page.evaluate(()=>window.spoken.includes("Great effort! You described the room well! I understand what you mean."))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>window.spoken.includes("This is Nhinh's house. There is a basket next to the window. A low table is in front of her."))).toBe(true);
 await page.locator('#next-mission').click();await expect(page.locator('#completion')).toBeVisible();
 await page.reload();await expect(page.locator('[data-speaking-count]')).toHaveText('5/5 speaking missions completed');
 await page.locator('#retry').click();await expect(page.locator('#recording')).toBeHidden();
});
test('a wrong or incomplete sentence requires another attempt and cannot earn completion',async({page})=>{
 await start(page);await backend(page,['fireplace',missions[0].example]);
 await submit(page);await expect(page.locator('#feedback-content')).toContainText('Nice try!');
 await expect(page.locator('[data-speaking-count]')).toHaveText('0/5 speaking missions completed');await expect(page.locator('#next-mission')).toBeDisabled();
 await expect(page.locator('.feedback-word')).toBeVisible();await page.locator('#retry').click();await submit(page);
 await expect(page.locator('#next-mission')).toBeEnabled();
});
test('unavailable feedback permits listening and recording practice without awarding a badge',async({page})=>{
 test.setTimeout(60000);await start(page,false);
 await expect(page.locator('#next-mission')).toBeDisabled();await expect(page.locator('#record-status')).toBeHidden();
 for(let i=0;i<5;i++){
  await recordAnswer(page);await expect(page.locator('#record-status')).toContainText('Feedback is unavailable');
  await expect(page.locator('#feedback')).toBeHidden();await expect(page.locator('#next-mission')).toBeEnabled();await page.locator('#next-mission').click();
 }
 await expect(page.locator('#completion h2')).toHaveText('You practised all three activities!');
 await expect(page.locator('[data-speaking-count]')).toHaveText('0/5 speaking missions completed');
});
test('Activity 3 gives a hint after 90 seconds without revealing a model answer',async({page})=>{
 await page.clock.install();
 await page.addInitScript(()=>localStorage.setItem('localingo.progress.v1',JSON.stringify({speakingVersion:2,speaking:['house-1','house-2','house-3','house-4'],explore:{}})));
 await start(page);await expect(page.locator('#mission-prompt')).toHaveText(missions[4].prompt);
 await expect(page.locator('#banban-hint')).toBeHidden();await page.clock.fastForward(89000);await expect(page.locator('#banban-hint')).toBeHidden();
 await page.clock.fastForward(1000);await expect(page.locator('#hint-text')).toContainText('basket');await expect(page.locator('#answer-panel')).toBeHidden();
 await page.clock.fastForward(90000);await expect(page.locator('#hint-text')).toContainText('table');
});
test('failed assessment keeps the recording and does not advance progress',async({page})=>{
 await start(page);await page.route('**/api/speaking/assess',r=>r.fulfill({status:502,json:{error:'Feedback is busy. Try again.'}}));
 await submit(page);await expect(page.locator('#record-status')).toContainText('Feedback is busy');
 await expect(page.locator('#recording')).toBeVisible();await expect(page.locator('#next-mission')).toBeDisabled();
});
test('Try again cancels a pending assessment and clears the response before recording again',async({page})=>{
 await start(page);
 let release;const hold=new Promise(resolve=>{release=resolve;});
 await page.route('**/api/speaking/assess',async route=>{
  await hold;await route.fulfill({json:{assessment:{hasSpeech:true,passed:true,encouragement:'Well done!'}}}).catch(()=>{});
 });
 await recordAnswer(page);await expect(page.locator('#feedback')).toHaveAttribute('aria-busy','true');
 await expect(page.locator('#feedback')).toBeHidden();await page.locator('#retry').click();
 await expect(page.locator('#feedback-content')).toBeEmpty();await expect(page.locator('#feedback')).toBeHidden();
 await expect(page.locator('#recording')).toBeHidden();await expect(page.locator('#record')).toBeEnabled();
 release();await page.unroute('**/api/speaking/assess');await backend(page,[missions[0].example]);
 await submit(page);await expect(page.locator('#feedback')).toBeVisible();
 await expect(page.locator('[data-speaking-count]')).toHaveText('1/5 speaking missions completed');
 await page.locator('#retry').click();await expect(page.locator('#feedback')).toBeHidden();await expect(page.locator('#feedback-content')).toBeEmpty();
});
test('the revised course resets old speaking completions and preserves Explore progress',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('localingo.progress.v1',JSON.stringify({speaking:['house-1','house-2'],explore:{1:0}})));
 await start(page);await expect(page.locator('[data-speaking-count]')).toHaveText('0/5 speaking missions completed');
 expect(await page.evaluate(async()=>{const {readProgress}=await import('./progress.js');return readProgress().explore;})).toEqual({'1':0});
});
