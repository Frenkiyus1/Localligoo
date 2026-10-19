import {test,expect} from "@playwright/test";
import {encodeWav} from "../audio.js";
import {handleApi} from "../worker.js";
import {missions} from "../missions.js";
const fakeWav=async()=>Buffer.from(await encodeWav(Float32Array.from({length:32000},(_,i)=>.1*Math.sin(i/10))).arrayBuffer());
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
async function submit(page,buffer){
 await page.locator('#audio-file').setInputFiles({name:'answer.wav',mimeType:'audio/wav',buffer});
 await expect(page.locator('#recording')).toBeVisible();await expect(page.locator('#assess')).toBeDisabled();
 await page.locator('#data-consent').check();await page.locator('#audio-consent').check();await page.locator('#assess').click();
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
 const answer=page.waitForResponse(r=>r.url().endsWith('/a1-answer-1.mp3'));await page.locator('#listen-prompt').click();expect((await answer).ok()).toBe(true);
 await screenshot(page,testInfo,'activity-1');
});
test('all five recorded answers follow the three activities, save progress and read back the learner correction',async({page},testInfo)=>{
 test.setTimeout(60000);await start(page);
 const transcripts=[missions[0].example,missions[1].example,'The piece of wood is underneath the stilt house.','The fireplace is in the living room.',"This is Nhinh's house. There is a basket next to window. A table is in front her."];
 const requests=await backend(page,transcripts), buffer=await fakeWav();
 for(let i=0;i<5;i++){
  await expect(page.locator('#mission-prompt')).toHaveText(missions[i].prompt);
  if(i===2){await expect(page.locator('#word-bank button')).toHaveText(['under','underneath','at the bottom of','below']);await screenshot(page,testInfo,'activity-2');}
  if(i===4){await expect(page.locator('#answer-panel')).toBeHidden();await expect(page.locator('#mission-example')).toBeEmpty();await screenshot(page,testInfo,'activity-3');}
  await submit(page,buffer);
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
 await start(page);await backend(page,['fireplace',missions[0].example]);const buffer=await fakeWav();
 await submit(page,buffer);await expect(page.locator('#feedback-content')).toContainText('Nice try!');
 await expect(page.locator('[data-speaking-count]')).toHaveText('0/5 speaking missions completed');await expect(page.locator('#next-mission')).toBeDisabled();
 await expect(page.locator('.feedback-word')).toBeVisible();await page.locator('#retry').click();await submit(page,buffer);
 await expect(page.locator('#next-mission')).toBeEnabled();
});
test('unavailable feedback permits listening and recording practice without awarding a badge',async({page})=>{
 await start(page,false);await expect(page.locator('#ai-status')).toContainText('Feedback is unavailable');
 await expect(page.locator('#next-mission')).toBeDisabled();await expect(page.locator('#assess')).toBeDisabled();
 const buffer=await fakeWav();
 for(let i=0;i<5;i++){
  await page.locator('#audio-file').setInputFiles({name:'answer.wav',mimeType:'audio/wav',buffer});
  await expect(page.locator('#next-mission')).toBeEnabled();await page.locator('#next-mission').click();
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
 await submit(page,await fakeWav());await expect(page.locator('#ai-status')).toContainText('Feedback is busy');
 await expect(page.locator('#recording')).toBeVisible();await expect(page.locator('#next-mission')).toBeDisabled();
});
test('silence and corrupt audio are rejected before upload',async({page})=>{
 await start(page);const silent=Buffer.from(await encodeWav(new Float32Array(32000)).arrayBuffer());
 await page.locator('#audio-file').setInputFiles({name:'silent.wav',mimeType:'audio/wav',buffer:silent});
 await expect(page.locator('#recording')).toBeHidden();await expect(page.locator('#assess')).toBeDisabled();
 await page.locator('#audio-file').setInputFiles({name:'broken.wav',mimeType:'audio/wav',buffer:Buffer.from('invalid')});
 await expect(page.locator('#recording')).toBeHidden();await expect(page.locator('#next-mission')).toBeDisabled();
});
test('the revised course resets old speaking completions and preserves Explore progress',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('localingo.progress.v1',JSON.stringify({speaking:['house-1','house-2'],explore:{1:0}})));
 await start(page);await expect(page.locator('[data-speaking-count]')).toHaveText('0/5 speaking missions completed');
 expect(await page.evaluate(async()=>{const {readProgress}=await import('./progress.js');return readProgress().explore;})).toEqual({'1':0});
});
