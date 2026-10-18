import { missions } from "./missions.js";
import { readProgress, saveProgress, renderProgress } from "./progress.js";
import { toWav, base64Audio } from "./audio.js";
const $ = id => document.getElementById(id);
let current = Math.min(readProgress().speaking.length, missions.length - 1);
let wav = null, audioUrl = null, recorder = null, stream = null, timer = null, controller = null;
let busy = false, preparing = false, configured = false, generation = 0, acquiring = false;
const record = $("record"), player = $("recording"), status = $("record-status"), aiStatus = $("ai-status");
const select = $("mission-select");
missions.forEach((mission, i) => { const option=document.createElement("option"); option.value=i; option.textContent=`${i+1}. ${mission.title}`; select.append(option); });
function message(el, text, error=false) { el.textContent=text; el.classList.toggle("error", error); }
function updateControls() {
  const recording = recorder?.state === "recording";
  const locked = busy || preparing || acquiring || recording;
  $("assess").disabled = !configured || !wav || !$("audio-consent").checked || locked;
  $("assess-text").disabled = !configured || locked || $("written-answer").value.trim().length < 5;
  select.disabled = locked;
  $("audio-file").disabled = locked;
  $("retry").disabled = busy || preparing || acquiring;
  $("record").disabled = busy || preparing || acquiring || !window.MediaRecorder || !navigator.mediaDevices?.getUserMedia;
  $("written-answer").disabled = locked;
  $("read-aloud").disabled = locked;
  $("listen-prompt").disabled = locked;
  $("next-mission").disabled = locked || !readProgress().speaking.includes(missions[current].id);
}
function releaseAudio() {
  $("recording-review").hidden=true;
  wav = null; player.pause(); player.removeAttribute("src"); player.hidden = true; player.load();
  if(audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
}
function clearFeedback() {
  $("feedback").hidden=true; $("feedback").open=false;
  $("feedback-content").replaceChildren();
  const p=document.createElement("p"); p.className="feedback-empty"; p.textContent="Record your answer, then get feedback from BanBan."; $("feedback-content").append(p);
}
function showMission() {
  generation++; controller?.abort(); releaseAudio();
  $("audio-file").value=""; $("written-answer").value=""; $("audio-consent").checked=false;
  select.value=current;
  $("read-aloud").checked=false;
  $("mission-example").parentElement.open=false;
  $("mission-count").textContent=`MISSION ${current+1} OF ${missions.length}`;
  $("mission-prompt").textContent=missions[current].prompt;
  $("mission-hint").textContent=missions[current].hint;
  $("mission-example").textContent=missions[current].example;
  const nextLabel=current===missions.length-1?"Finish mission":"Next mission";
  $("next-label").textContent=nextLabel;
  $("next-mission").setAttribute("aria-label",nextLabel);
  $("next-mission").title=nextLabel;
  message(status,"Speak in English for 5–60 seconds. Listen to your recording before sending it.");
  clearFeedback(); updateControls();
  $("completion").hidden = readProgress().speaking.length !== 5;
}
$("start-speaking").addEventListener("click", () => {
  $("speaking-intro").hidden=true; $("speaking-exercise").hidden=false;
  showMission(); $("mission-prompt").focus();
  history.replaceState(null,"","#missions");
});
if(location.hash==="#missions") $("start-speaking").click();
select.addEventListener("change",()=>{current=Number(select.value); showMission();});
$("read-aloud").addEventListener("change",()=> {
  releaseAudio(); clearFeedback();
  $("mission-hint").textContent=$("read-aloud").checked?"Read the example below aloud. Listen first, then record your voice.":missions[current].hint;
  document.querySelector("#mission-example").parentElement.open=$("read-aloud").checked;
  updateControls();
});
$("listen-prompt").addEventListener("click",()=> {
  if(!window.speechSynthesis) { message(status,"Trình duyệt chưa hỗ trợ đọc mẫu. Hãy đọc phần Need a little help.",true); return; }
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance($("read-aloud").checked?missions[current].example:missions[current].prompt);
  utterance.lang="en-US"; utterance.rate=.85;
  const voice=window.speechSynthesis.getVoices().find(v=>v.lang==="en-US") || window.speechSynthesis.getVoices().find(v=>v.lang.startsWith("en"));
  if(voice) utterance.voice=voice;
  utterance.onerror=()=>message(status,"Không phát được giọng mẫu. Kiểm tra âm lượng hoặc thử trình duyệt khác.",true);
  window.speechSynthesis.speak(utterance);
});
function stopTracks() { stream?.getTracks().forEach(track=>track.stop()); stream=null; clearInterval(timer); timer=null; }
function stopRecording() { if(recorder?.state==="recording") recorder.stop(); stopTracks(); }
async function prepare(blob, token) {
  preparing=true; updateControls(); message(status,"Đang chuẩn bị bản ghi âm…");
  try {
    const ready=await toWav(blob);
    if(token!==generation) return;
    releaseAudio(); wav=ready; audioUrl=URL.createObjectURL(wav); player.src=audioUrl; player.hidden=false; $("recording-review").hidden=false;
    $("recording-review").scrollIntoView({block:"nearest"});
    message(status,"Bản ghi đã sẵn sàng. Nghe lại, đồng ý gửi và bấm Get AI feedback.");
    clearFeedback();
  } catch(error) { if(token===generation) message(status,error.message,true); }
  finally { preparing=false; updateControls(); }
}
function setRecordLabel(label) {
  $("record-label").textContent=label; record.setAttribute("aria-label",label); record.title=label;
}
record.addEventListener("click",async()=>{
  if(recorder?.state==="recording") { stopRecording(); return; }
  if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { message(status,"Micro không khả dụng. Hãy dùng HTTPS/localhost hoặc tải lên file âm thanh.",true); return; }
  acquiring=true; updateControls();
  const token=++generation;
  try {
    window.speechSynthesis?.cancel(); player.pause();
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    if(token!==generation) { stopTracks(); return; }
    const chunks=[];
    recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size) chunks.push(e.data);};
    recorder.onstop=()=> {
      stopTracks(); record.setAttribute("aria-pressed","false"); setRecordLabel("Record answer");
      if(token===generation) prepare(new Blob(chunks,{type:recorder.mimeType}),token);
    };
    recorder.onerror=()=> { generation++; stopTracks(); message(status,"Micro đã bị ngắt. Hãy thử ghi lại.",true); record.setAttribute("aria-pressed","false");setRecordLabel("Record answer"); updateControls(); };
    recorder.start(); record.setAttribute("aria-pressed","true"); setRecordLabel("Stop recording");
    const started=Date.now();
    message(status,"Đang ghi âm… 0/60 giây");
    timer=setInterval(()=> {
      const seconds=Math.floor((Date.now()-started)/1000);
      message(status,`Đang ghi âm… ${seconds}/60 giây`);
      if(seconds>=60) stopRecording();
    },250);
  } catch(error) { stopTracks(); message(status,error.name==="NotAllowedError"?"Bạn chưa cho phép micro. Cho phép micro hoặc tải lên file âm thanh.":"Không mở được micro. Kiểm tra thiết bị hoặc tải lên file âm thanh.",true); }
  finally { acquiring=false; updateControls(); }
});
$("audio-file").addEventListener("change",async()=>{
  const file=$("audio-file").files[0]; if(!file) return;
  releaseAudio(); await prepare(file,++generation);
});
$("retry").addEventListener("click",()=>{
  generation++; stopRecording(); releaseAudio(); clearFeedback(); $("audio-file").value=""; $("audio-consent").checked=false;
  message(status,"Sẵn sàng thử lại. Bấm Record answer."); updateControls();
});
$("written-answer").addEventListener("input",updateControls);
$("audio-consent").addEventListener("change",updateControls);
function element(tag,text,className="") { const el=document.createElement(tag); el.textContent=text; if(className) el.className=className; return el; }
function renderFeedback(assessment) {
  $("feedback").hidden=false; $("feedback").open=true;
  const target=$("feedback-content"); target.replaceChildren(element("p",assessment.encouragement));
  const scores=element("div","","feedback-grid");
  for(const [key,label] of [["grammar","Grammar"],["vocabulary","Vocabulary"]]) {
    const score=element("div","","score"); score.append(element("span",label),element("strong",assessment[key].score===null?"—":`${Math.round(assessment[key].score)}/100`)); scores.append(score);
  }
  target.append(scores);
  for(const [label,text] of [["What you said",assessment.transcript],["Try saying",assessment.correctedAnswer],["Grammar",assessment.grammar.feedback],["Vocabulary",assessment.vocabulary.feedback],["Pronunciation practice",assessment.pronunciation.feedback],["Speaking rhythm",assessment.fluency.feedback],["Your next step",assessment.nextStep]]) {
    if(!text) continue;
    const section=element("div","","feedback-detail"); section.append(element("h3",label),element("p",text)); target.append(section);
  }
  if(assessment.comparison) {
    const section=element("div","","feedback-detail"); section.append(element("h3","Read-aloud word comparison"));
    const legend=element("p","Green: matched · Orange: different or missing · Blue: extra. Speech recognition can make mistakes.","storage-note");
    const tokens=element("div","","word-comparison");
    assessment.comparison.tokens.forEach(token=> {
      const chip=element("span",token.word,`word-chip ${token.status}`);
      chip.title=token.status==="matched"?"Recognised":token.status==="missing"?"Not recognised":`Recognised as: ${token.heard}`; tokens.append(chip);
    });
    section.append(legend,tokens); target.append(section);
  }
}
async function assess(mode) {
  if(busy || preparing || !configured) return;
  if(mode==="audio" && (!wav || !$("audio-consent").checked)) return;
  if(!$("data-consent").checked) { message(aiStatus,"Hãy đồng ý gửi câu trả lời tới Cloudflare Workers AI trước khi nhận phản hồi.",true); return; }
  busy=true; controller=new AbortController(); updateControls(); $("feedback").setAttribute("aria-busy","true");
  message(aiStatus,"BanBan đang xem câu trả lời của bạn…");
  const token=generation;
  const timeout=setTimeout(()=>controller.abort(),75000);
  try {
    const payload={missionId:missions[current].id,mode,consent:true,readAloud:$("read-aloud").checked};
    if(mode==="audio") payload.audio=await base64Audio(wav); else payload.text=$("written-answer").value.trim();
    const response=await fetch("./api/speaking/assess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:controller.signal});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error || "Chưa nhận được phản hồi. Hãy thử lại.");
    if(token!==generation) return;
    renderFeedback(data.assessment);
    $("speaking-options").open=false;
    $("feedback").scrollIntoView({block:"nearest"});
    if(mode==="audio" && data.assessment.hasSpeech) {
      saveProgress(state=>{if(!state.speaking.includes(missions[current].id)) state.speaking.push(missions[current].id);});
      renderProgress(); message(aiStatus,"Đã nhận phản hồi và lưu tiến độ nhiệm vụ!");
    } else message(aiStatus, mode==="text"?"Đã kiểm tra bài viết. Hãy ghi âm để hoàn thành nhiệm vụ.":"Chưa nhận được lời nói rõ ràng. Hãy ghi âm lại.",mode==="audio");
    $("completion").hidden=readProgress().speaking.length!==5;
  } catch(error) { if(token===generation) message(aiStatus,error.name==="AbortError"?"Kết nối mất quá nhiều thời gian. Bản ghi vẫn còn để thử lại.":error.message,true); }
  finally {clearTimeout(timeout);busy=false;$("feedback").setAttribute("aria-busy","false");updateControls();}
}
$("assess").addEventListener("click",()=>assess("audio"));
$("assess-text").addEventListener("click",()=>assess("text"));
$("next-mission").addEventListener("click",()=>{
  if(current===missions.length-1) {
    if(readProgress().speaking.length===5) { $("completion").hidden=false; $("completion").scrollIntoView({behavior:"smooth"}); }
    else { current=missions.findIndex(m=>!readProgress().speaking.includes(m.id)); showMission(); $("mission-prompt").focus(); }
  } else {current++; showMission(); $("mission-prompt").focus();}
});
document.addEventListener("visibilitychange",()=>{if(document.hidden && recorder?.state==="recording") stopRecording();});
window.addEventListener("pagehide",()=>{generation++; controller?.abort(); stopRecording(); releaseAudio(); window.speechSynthesis?.cancel();});
async function connect() {
  try {
    const response=await fetch("./api/speaking/status",{signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw new Error("Status");
    const data=await response.json();configured=data.configured===true;
    message(aiStatus,configured?"BanBan is ready · Cloudflare Workers AI":"AI chưa được kết nối trên bản chạy local. Cần Cloudflare Worker có binding AI; bạn vẫn có thể nghe câu mẫu và ghi âm.",!configured);
  } catch {message(aiStatus,"Chưa kết nối được Cloudflare AI. Bạn vẫn có thể nghe câu mẫu và ghi âm luyện tập.",true);}
  updateControls();
}
showMission(); connect();
