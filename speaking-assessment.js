import { words, compareWords } from "./speech-analysis.js";
export function normaliseSpeech(text) {
 return words(text.replace(/’|‘/g,"'").replace(/\bit's\b/gi,"it is").replace(/\bthere's\b/gi,"there is")).join(" ");
}
export function evaluateSpeaking(mission, transcript, model, audio) {
 const hasSpeech=audio&&model.hasSpeech===true;
 let passed=false, practiceWord=null, comparison=null;
 if(mission.activity===1){
  comparison=compareWords(normaliseSpeech(mission.example),normaliseSpeech(transcript));
  const differences=comparison.tokens.filter(t=>t.status!=="matched");
  const content=differences.filter(t=>!new Set(["a","an","the","is","it","in","on","to","of","my","there"]).has(t.word));
  const matched=comparison.tokens.filter(t=>t.status==="matched").length;
  passed=hasSpeech&&content.length===0&&matched/comparison.tokens.length>=.9;
  practiceWord=(content[0]||differences[0])?.word||null;
 }else if(mission.activity===2){
  passed=hasSpeech&&mission.accepted.some(answer=>normaliseSpeech(answer)===normaliseSpeech(transcript));
 }else{
  passed=hasSpeech&&model.taskCompleted===true&&words(transcript).length>=8;
 }
 const encouragement=passed?mission.success:mission.activity===1&&practiceWord
  ?"Nice try! Listen again and repeat the word "+practiceWord+"."
  :mission.activity===2?"Look at the picture again. You can use the words below to help you."
  :"Nice try! Look at the picture again and describe the room in two or three sentences.";
 const nextStep=passed?(mission.activity===3?"Listen to your improved answer, then finish.":"You can practise again or continue.")
  :mission.activity===1?"Listen to the word and record your answer again."
  :mission.activity===2?"Use the words below and say the whole sentence again."
  :"Tell Banban what you can see, where things are, and whose house this is.";
 return {hasSpeech,passed,practiceWord:passed?null:practiceWord,comparison,encouragement,nextStep};
}
