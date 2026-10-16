import test from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "../worker.js";
import { encodeWav } from "../audio.js";
import { compareWords, speechMetrics } from "../speech-analysis.js";
const response = {hasSpeech:true,correctedAnswer:"There is a kitchen.",grammar:{score:80,feedback:"Dùng There is cho danh từ số ít."},vocabulary:{score:90,feedback:"Từ vựng phù hợp."},encouragement:"Tốt lắm!",nextStep:"Thử thêm một câu."};
const req=(body,extra={})=>new Request("https://localingo.test/api/speaking/assess",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://localingo.test",...extra},body:JSON.stringify(body)});
const body={missionId:"house-1",mode:"text",consent:true,text:"There is a kitchen."};
test("missing AI binding reports unavailable rather than inventing results",async()=>{
 assert.equal((await handleApi(req(body))).status,503);
 const state=await handleApi(new Request("https://localingo.test/api/speaking/status"));
 assert.equal((await state.json()).configured,false);
});
test("cross-origin, methods and malformed payloads are rejected before inference",async()=>{
 let called=false; const env={AI:{run(){called=true;}}};
 assert.equal((await handleApi(req(body,{Origin:"https://other.test"}),env)).status,403);
 assert.equal((await handleApi(new Request("https://localingo.test/api/speaking/assess"),env)).status,405);
 assert.equal((await handleApi(req({...body,missionId:"injected"}),env)).status,400);
 assert.equal((await handleApi(req({...body,text:"a".repeat(2001)}),env)).status,400);
 assert.equal((await handleApi(req(body,{"Content-Length":"4000000"}),env)).status,413);
 assert.equal((await handleApi(req({...body,consent:false}),env)).status,400);
 assert.equal(called,false);
});
test("rate limiter rejects repeated requests",async()=>{
 const result=await handleApi(req(body),{AI:{},SPEAKING_LIMITER:{limit:async()=>({success:false})}});
 assert.equal(result.status,429);
});
test("text feedback can never claim recorded speech or acoustic scores",async()=>{
 const result=await handleApi(req(body),{AI:{run:async()=>({response:JSON.stringify(response)})}});
 assert.equal(result.status,200);const {assessment}=await result.json();
 assert.equal(assessment.hasSpeech,false); assert.equal(assessment.pronunciation.score,null);assert.equal(assessment.fluency.score,null);
 assert.equal(assessment.transcript,body.text);
});
test("audio runs speech recognition then text feedback and compares read-aloud words",async()=>{
 const samples=Float32Array.from({length:32000},(_,i)=>.1*Math.sin(i/10));
 const wav=await encodeWav(samples).arrayBuffer();
 const audio=Buffer.from(wav).toString("base64");
 const calls=[];
 const result=await handleApi(req({mode:"audio",missionId:"house-1",audio,consent:true,readAloud:true}),{AI:{run:async(model,input)=>{
  calls.push({model,input});
  return model.includes("whisper")?{text:"I live in Moc Chau.",segments:[{start:0,end:1.5}]}:{response:JSON.stringify(response)};
 }}});
 assert.equal(result.status,200);const {assessment}=await result.json();
 assert.equal(calls.length,2);assert.equal(calls[0].input.audio,audio);assert.equal(calls[0].input.vad_filter,true);
 assert.equal(assessment.hasSpeech,true);assert.equal(assessment.metrics.durationSeconds,2);
 assert.ok(assessment.comparison.tokens.length);assert.equal(assessment.pronunciation.score,null);
 assert.match(calls[1].input.messages[0].content,/NEVER claim to hear audio/);
});
test("silence, missing consent and invalid WAV cannot trigger inference",async()=>{
 const audio=Buffer.from(await encodeWav(new Float32Array(32000)).arrayBuffer()).toString("base64");
 let called=false;const env={AI:{run:async()=>{called=true;}}};
 for(const payload of [{audio,consent:true},{audio:"AAAA",consent:true},{audio,consent:false}]) assert.equal((await handleApi(req({mode:"audio",missionId:"house-1",...payload}),env)).status,400);
 assert.equal(called,false);
});
test("empty recognition never completes a mission",async()=>{
 const audio=Buffer.from(await encodeWav(Float32Array.from({length:32000},(_,i)=>.1*Math.sin(i/10))).arrayBuffer()).toString("base64");
 let calls=0;
 const result=await handleApi(req({mode:"audio",missionId:"house-1",audio,consent:true}),{AI:{run:async()=>{calls++;return {text:""};}}});
 assert.equal(result.status,200);assert.equal((await result.json()).assessment.hasSpeech,false);assert.equal(calls,1);
});
test("invalid model outputs and provider errors return recoverable errors",async()=>{
 for(const run of [async()=>({response:"not json"}),async()=>({response:JSON.stringify({...response,grammar:{score:999,feedback:"x"}})}),async()=>{throw Error("private token must never leak");}]) {
  const result=await handleApi(req(body),{AI:{run}});assert.equal(result.status,502);assert.doesNotMatch(await result.text(),/private token/);
 }
});
test("word alignment handles missing, substituted and extra words",()=>{
 const {tokens}=compareWords("There is a big room.","There is one room today.");
 assert.deepEqual(tokens.filter(t=>t.status==="matched").map(t=>t.word),["there","is","room"]);
 assert.ok(tokens.some(t=>t.status==="missing"||t.status==="different"));
 assert.ok(tokens.some(t=>t.status==="extra"));
 assert.deepEqual(compareWords("I’m here.","I’m here!").tokens.map(t=>t.status),["matched","matched"]);
 assert.equal(speechMetrics("one two three",6,[{start:0,end:1},{start:3,end:6}]).longestPauseSeconds,2);
});
