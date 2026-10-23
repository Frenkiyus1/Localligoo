import { missions, activities, greeting } from "./missions.js";
import { readProgress, saveProgress, renderProgress } from "./progress.js";
import { toWav, base64Audio } from "./audio.js";
const $ = id => document.getElementById(id);
const completed = new Set(readProgress().speaking);
let current = missions.findIndex(item => !completed.has(item.id));
if(current < 0)current = missions.length - 1;
let wav=null, audioUrl=null, recorder=null, stream=null, timer=null, controller=null;
let busy=false, preparing=false, configured=false, generation=0, acquiring=false, practiced=false;
let narration=null, finishNarration=null, hintTimer=null, hintIndex=0, answered=false;
let liveRecognition=null, userTurn=null;
const record=$("record"), player=$("recording"), status=$("record-status"), aiStatus=status;
const mission=()=>missions[current];
const wordClips={under:"word-under.mp3",underneath:"word-underneath.mp3","at the bottom of":"word-at-the-bottom-of.mp3",below:"word-below.mp3",fireplace:"word-fireplace.mp3",table:"word-table.mp3",in:"word-in.mp3","in the middle of":"word-in-the-middle-of.mp3"};
const listenWord=word=>wordClips[word.toLowerCase()]?playClip(wordClips[word.toLowerCase()]):say(word);
function message(el,text,error=false){el.textContent=text;el.classList.toggle("error",error);el.hidden=!text;}
function element(tag,text,className=""){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function stopNarration(){
 const finish=finishNarration; finishNarration=null;
 if(narration){narration.pause();narration=null;}
 window.speechSynthesis?.cancel(); finish?.(false);
}
function resetConversation(){
 $("answer-transcript").open=false;$("transcript-words").replaceChildren();
 $("transcript-words").hidden=true;$("transcript-hint").hidden=false;userTurn=null;
}
function addTurn(speaker){
 const row=element("p","","transcript-turn"+(speaker==="User"?" is-user":""));row.hidden=true;
 const text=element("span","","transcript-text");
 row.append(element("strong",speaker+":","transcript-speaker"),text);$("transcript-words").append(row);
 $("answer-transcript").open=true;
 return {row,text};
}
function updateTurn(turn,text,interim=false){
 const log=$("transcript-words"),atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<48;
 if(typeof text==="string")turn.text.textContent=text;
 turn.row.hidden=!turn.text.textContent.trim();turn.row.classList.toggle("is-interim",interim);
 const visible=Array.from(log.children).some(row=>!row.hidden);
 log.hidden=!visible;$("transcript-hint").hidden=visible;
 if(atBottom)log.scrollTop=log.scrollHeight;
}
function clipTranscript(file){
 const word=Object.keys(wordClips).find(word=>wordClips[word]===file);
 if(word)return word;
 if(file==="hello-im-banban.mp3")return greeting;
 if(file==="nice-try.mp3")return "Nice try! Listen again and repeat the word.";
 if(file==="a2-retry.mp3")return "Look at the picture again. You can use the words below to help you.";
 if(file==="well-done.mp3"||/^a[123]-success/.test(file))return mission().success;
 if(/^a[123]-question/.test(file))return mission().prompt;
 if(/^a1-answer/.test(file))return mission().example;
 const hint=file.match(/^a3-hint-([123])/);
 return hint?missions[4].hints[Number(hint[1])-1]:"";
}
function followClipTranscript(audio,file){
 const text=clipTranscript(file);if(!text)return ()=>{};
 const words=text.split(/\s+/),starts=/^a1-answer/.test(file)?mission().answerWordStarts:null;
 let frame=null,shown=-1,highlighted=false,turn=null;
 function render(count,highlight=true){
  if(!turn||count===shown&&highlight===highlighted)return;
  shown=count;highlighted=highlight;
  const content=document.createDocumentFragment();
  words.slice(0,count).forEach((word,index)=>{
   if(index)content.append(" ");
   content.append(element("span",word,"transcript-word"+(highlight&&index===count-1?" is-current":"")));
  });
  turn.text.replaceChildren(content);updateTurn(turn);
 }
 function sync(){if(turn)render(starts?starts.findLastIndex(start=>audio.currentTime>=start)+1:words.length,Boolean(starts));}
 function cancelFrame(){cancelAnimationFrame(frame);frame=null;}
 function tick(){sync();if(starts&&!audio.paused&&!audio.ended)frame=requestAnimationFrame(tick);}
 function playing(){if(!turn)turn=addTurn("BanBan");cancelFrame();tick();}
 audio.addEventListener("playing",playing);
 audio.addEventListener("timeupdate",sync);
 audio.addEventListener("seeked",sync);
 audio.addEventListener("pause",cancelFrame);
 audio.addEventListener("waiting",cancelFrame);
 return finished=>{
  cancelFrame();
  audio.removeEventListener("playing",playing);audio.removeEventListener("timeupdate",sync);audio.removeEventListener("seeked",sync);
  audio.removeEventListener("pause",cancelFrame);audio.removeEventListener("waiting",cancelFrame);
  if(finished){if(!turn)turn=addTurn("BanBan");render(words.length,false);}
  else turn?.text.querySelector(".is-current")?.classList.remove("is-current");
 };
}
function stopLiveTranscript(){
 const recognition=liveRecognition;liveRecognition=null;
 if(recognition){recognition.onresult=null;recognition.onend=null;recognition.onerror=null;try{recognition.abort();}catch{}}
}
function startUserTranscript(token){
 stopLiveTranscript();userTurn=addTurn("User");const turn=userTurn;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition)return;
 try{
  const recognition=new Recognition();liveRecognition=recognition;
  recognition.lang="en-US";recognition.continuous=true;recognition.interimResults=true;
  recognition.onresult=event=>{
   if(token!==generation||liveRecognition!==recognition||recorder?.state!=="recording")return;
   const results=Array.from(event.results);
   updateTurn(turn,results.map(result=>result[0].transcript.trim()).join(" "),results.some(result=>!result.isFinal));
  };
  recognition.onerror=()=>{if(liveRecognition===recognition)stopLiveTranscript();};
  recognition.onend=()=>{if(liveRecognition===recognition)liveRecognition=null;};
  recognition.start();
 }catch{stopLiveTranscript();}
}
function playClip(file){
 stopNarration();
 if(status.textContent==="Could not play this audio. Try Listen again.")message(status,"");
 return new Promise(resolve=>{
  const audio=new Audio("./assets/speaking/audio/"+file); narration=audio;
  const finishTranscript=followClipTranscript(audio,file);let settled=false;
  const finish=ok=>{
   if(settled)return;settled=true;finishTranscript?.(ok);audio.onended=null;audio.onerror=null;
   if(narration===audio){narration=null;finishNarration=null;}resolve(ok);
  };
  finishNarration=finish;audio.onended=()=>finish(true);
  audio.onerror=()=>{if(narration===audio)message(status,"Could not play this audio. Try Listen again.",true);finish(false);};
  audio.play().catch(()=>finish(false));
 });
}
function say(text){
 stopNarration();
 return new Promise(resolve=>{
  if(!text||!window.speechSynthesis||!window.SpeechSynthesisUtterance){resolve(false);return;}
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang="en-US";utterance.rate=.85;
  utterance.voice=window.speechSynthesis.getVoices().find(v=>v.lang==="en-US")||window.speechSynthesis.getVoices().find(v=>v.lang.startsWith("en"))||null;
  let settled=false,turn=null;
  const show=()=>{if(!settled&&!turn){turn=addTurn("BanBan");updateTurn(turn,text);}};
  const finish=ok=>{if(settled)return;if(ok)show();settled=true;if(finishNarration===finish)finishNarration=null;resolve(ok);};
  finishNarration=finish;utterance.onstart=show;utterance.onend=()=>finish(true);utterance.onerror=()=>finish(false);
  try{window.speechSynthesis.speak(utterance);}catch{finish(false);}
 });
}
function listenQuestion(){return playClip("a"+mission().activity+"-question-"+mission().question+".mp3");}
function updateControls(){
 const recording=recorder?.state==="recording",locked=busy||preparing||acquiring||recording;
 $("retry").disabled=acquiring;
 record.disabled=busy||preparing||acquiring||!window.MediaRecorder||!navigator.mediaDevices?.getUserMedia;
 $("listen-prompt").disabled=locked;$("listen-hint").disabled=locked;
 $("next-mission").disabled=acquiring||recording||!practiced;
 $("word-bank").querySelectorAll("button").forEach(b=>b.disabled=locked);
}
function releaseAudio(){
 wav=null;player.pause();player.removeAttribute("src");player.hidden=true;player.load();
 if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=null;
}
function clearFeedback(){ $("feedback-content").replaceChildren();$("feedback").hidden=true;$("feedback").setAttribute("aria-busy","false"); }
function scheduleHint(){
 clearTimeout(hintTimer);
 if(mission().activity!==3||answered||document.hidden||$("speaking-exercise").hidden)return;
 const token=generation;
 hintTimer=setTimeout(()=>{
  if(token!==generation||answered)return;
  if(busy||preparing||acquiring||recorder?.state==="recording"){scheduleHint();return;}
  const index=hintIndex%3;$("banban-hint").hidden=false;$("hint-text").textContent=mission().hints[index];
  if(!narration&&!window.speechSynthesis?.speaking)playClip("a3-hint-"+(index+1)+".mp3");
  hintIndex++;scheduleHint();
 },90000);
}
function showMission(autoplay=true){
 generation++;controller?.abort();busy=false;preparing=false;stopNarration();releaseAudio();clearTimeout(hintTimer);
 practiced=false;answered=false;hintIndex=0;
 $("banban-hint").hidden=true;
 $("activity-title").textContent="Activity "+mission().activity+": "+activities[mission().activity-1];
 $("mission-count").textContent="Question "+mission().question+" of "+(mission().activity===3?1:2);
 $("mission-prompt").textContent=mission().prompt;message($("mission-hint"),mission().hint);
 $("mission-image").src="./assets/speaking/"+mission().image+".webp";$("mission-image").alt=mission().alt;
 $("answer-panel").hidden=mission().activity!==2;
 $("mission-example").textContent=mission().sentence||"";
 $("word-bank").hidden=mission().activity!==2;
 $("word-bank").replaceChildren(...(mission().options||[]).map(word=>{
  const button=element("button",word);button.type="button";button.addEventListener("click",()=>listenWord(word));return button;
 }));
 $("next-mission").querySelector("span").textContent=current===4?"Finish":missions[current+1].activity!==mission().activity?"Next activity":"Next question";
 message(status,"");
 clearFeedback();updateControls();
 $("completion").hidden=readProgress().speaking.length!==5;
 if(autoplay)listenQuestion();scheduleHint();
}
$("start-speaking").addEventListener("click",async()=>{
 $("speaking-intro").hidden=true;$("speaking-exercise").hidden=false;showMission(false);
 $("mission-prompt").focus();history.replaceState(null,"","#missions");
 const token=generation;const finished=await playClip("hello-im-banban.mp3");
 if(finished&&token===generation&&!acquiring&&recorder?.state!=="recording")listenQuestion();
});
$("listen-prompt").addEventListener("click",()=>mission().activity===1?playClip("a1-answer-"+mission().question+".mp3"):listenQuestion());
$("listen-hint").addEventListener("click",()=>playClip("a3-hint-"+(((hintIndex||1)-1)%3+1)+".mp3"));
function stopTracks(){stopLiveTranscript();stream?.getTracks().forEach(track=>track.stop());stream=null;clearInterval(timer);timer=null;}
function stopRecording(){if(recorder?.state==="recording")recorder.stop();stopTracks();}
async function prepare(blob,token){
 preparing=true;updateControls();message(status,"Preparing your recording...");
 try{
  const ready=await toWav(blob);if(token!==generation)return;
  releaseAudio();wav=ready;audioUrl=URL.createObjectURL(wav);player.src=audioUrl;player.hidden=false;
  await connection;if(token!==generation)return;
  preparing=false;
  if(configured)await assess();
  else message(status,"Feedback is unavailable right now. You can listen to your recording, practise again, or continue.",true);
 }catch(error){if(token===generation)message(status,error.message,true);}
 finally{if(token===generation){preparing=false;updateControls();scheduleHint();}}
}
record.addEventListener("click",async()=>{
 if(recorder?.state==="recording"){stopRecording();return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){message(status,"Microphone unavailable. Use HTTPS or localhost and allow microphone access.",true);return;}
 acquiring=true;stopNarration();releaseAudio();clearFeedback();answered=false;clearTimeout(hintTimer);updateControls();const token=++generation;
 try{
  const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  if(token!==generation){acquired.getTracks().forEach(track=>track.stop());return;}stream=acquired;
  const chunks=[],activeRecorder=new MediaRecorder(stream);recorder=activeRecorder;
  activeRecorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  activeRecorder.onstop=()=>{
   acquired.getTracks().forEach(track=>track.stop());
   if(recorder!==activeRecorder)return;
   stopTracks();record.setAttribute("aria-pressed","false");record.querySelector("span").textContent="Record answer";
   if(token===generation){practiced=true;prepare(new Blob(chunks,{type:activeRecorder.mimeType}),token);}
  };
  activeRecorder.onerror=()=>{generation++;stopTracks();record.setAttribute("aria-pressed","false");record.querySelector("span").textContent="Record answer";message(status,"Microphone disconnected. Try recording again.",true);updateControls();scheduleHint();};
  activeRecorder.start();startUserTranscript(token);record.setAttribute("aria-pressed","true");record.querySelector("span").textContent="Stop recording";
  const started=Date.now();message(status,"Recording... 0/60 seconds");
  timer=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);message(status,"Recording... "+seconds+"/60 seconds");if(seconds>=60)stopRecording();},250);
 }catch(error){stopTracks();message(status,error.name==="NotAllowedError"?"Microphone permission was denied. Allow the microphone, then tap Record answer again.":"Could not open the microphone. Check your device and try again.",true);scheduleHint();}
 finally{acquiring=false;updateControls();}
});
$("retry").addEventListener("click",()=>{
 generation++;controller?.abort();busy=false;preparing=false;stopRecording();stopNarration();releaseAudio();clearFeedback();answered=false;
 message(status,"");updateControls();scheduleHint();
});
function renderFeedback(assessment){
 const target=$("feedback-content");target.replaceChildren(element("p",assessment.encouragement));$("feedback").hidden=false;
 if(mission().activity===2&&!assessment.passed)$("word-bank").hidden=false;
 for(const [label,text] of (mission().activity===3?[["What you said",assessment.transcript],["Try saying",assessment.correctedAnswer]]:[])){
  if(!text)continue;const section=element("div","","feedback-detail");section.append(element("h3",label),element("p",text));target.append(section);
 }
 if(assessment.practiceWord){
  const note=element("p","This word was different or missing in the recognised text. Listen and try it again.");
  const button=element("button","Listen: "+assessment.practiceWord,"feedback-word");button.type="button";button.addEventListener("click",()=>listenWord(assessment.practiceWord));target.append(note,button);
 }
 if(mission().activity===3&&assessment.correctedAnswer){
  const button=element("button","Listen to your improved answer","feedback-word");button.type="button";button.addEventListener("click",()=>say(assessment.correctedAnswer));target.append(button);
 }
}
async function speakFeedback(assessment){
 if(mission().activity===1){
  if(assessment.passed)await playClip(mission().question===1?"well-done.mp3":"a1-success-2.mp3");
  else if(assessment.practiceWord){
   const token=generation;const finished=await playClip("nice-try.mp3");
   if(finished&&token===generation)await listenWord(assessment.practiceWord);
  }else await say(assessment.encouragement);
 }
 else if(mission().activity===2)await playClip(assessment.passed?"a2-success.mp3":"a2-retry.mp3");
 else{
  const token=generation;const finished=await (assessment.passed?playClip("a3-success.mp3"):say(assessment.encouragement));
  if(finished&&token===generation&&assessment.correctedAnswer)await say(assessment.correctedAnswer);
 }
}
async function assess(){
 if(busy||preparing||!configured||!wav)return;
 busy=true;answered=true;stopNarration();player.pause();clearTimeout(hintTimer);controller=new AbortController();const requestController=controller;updateControls();$("feedback").setAttribute("aria-busy","true");
 message(aiStatus,"Banban is listening to your answer...");const token=generation;const timeout=setTimeout(()=>requestController.abort(),75000);
 try{
  const payload={missionId:mission().id,mode:"audio",consent:true,readAloud:mission().activity===1,audio:await base64Audio(wav)};
  const response=await fetch("./api/speaking/assess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:requestController.signal});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not check the recording. Please try again.");if(token!==generation)return;
  const assessment=data.assessment;
  if(typeof assessment.transcript==="string"&&assessment.transcript.trim()&&userTurn)updateTurn(userTurn,assessment.transcript.trim());
  renderFeedback(assessment);const passed=assessment.hasSpeech===true&&assessment.passed===true;
  if(passed){saveProgress(state=>{if(!state.speaking.includes(mission().id))state.speaking.push(mission().id);});renderProgress();message(status,"");}
  else{answered=false;message(status,"");scheduleHint();}
  $("completion").hidden=readProgress().speaking.length!==5;speakFeedback(assessment);
 }catch(error){if(token===generation){answered=false;message(aiStatus,error.name==="AbortError"?"The connection took too long. Tap Try again to record a new answer.":error.message,true);scheduleHint();}}
 finally{clearTimeout(timeout);if(token===generation){busy=false;$("feedback").setAttribute("aria-busy","false");updateControls();}}
}
$("next-mission").addEventListener("click",()=>{
 if($("next-mission").disabled)return;
 if(current===4){generation++;controller?.abort();busy=false;preparing=false;answered=true;stopNarration();player.pause();clearTimeout(hintTimer);message(status,"");$("feedback").setAttribute("aria-busy","false");updateControls();$("completion").hidden=false;$("completion").querySelector("h2").textContent=readProgress().speaking.length===5?"You earned your Storyteller badge!":"You practised all three activities!";$("completion").querySelector("p").textContent=readProgress().speaking.length===5?"You have completed all five speaking questions.":"Keep practising your answers to complete all five questions and earn your badge.";$("completion").scrollIntoView({behavior:"smooth"});}
 else{current++;showMission();$("mission-prompt").focus();}
});
document.addEventListener("visibilitychange",()=>{if(document.hidden){clearTimeout(hintTimer);stopNarration();if(recorder?.state==="recording"){generation++;stopRecording();message(status,"Recording stopped. Tap Record answer to try again.");updateControls();}}else if(!$("speaking-exercise").hidden)scheduleHint();});
window.addEventListener("pagehide",()=>{generation++;controller?.abort();clearTimeout(hintTimer);stopRecording();stopNarration();releaseAudio();});
async function connect(){
 try{const response=await fetch("./api/speaking/status",{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error("Status");const data=await response.json();configured=data.configured===true;}
 catch{configured=false;}
 updateControls();
}
resetConversation();showMission(false);const connection=connect();
if(location.hash==="#missions"){$("speaking-intro").hidden=true;$("speaking-exercise").hidden=false;listenQuestion();scheduleHint();}
