import { completeLesson } from "./progress.js";
import { pronunciationWords } from "./pronunciation-content.js";
const $ = id => document.getElementById(id);
const speaker = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
let selected = [], matched = new Set(), buttons = [], resolving = false, resetTimer = null, completionTimer = null;
let voice = null, speakingWord = null, round = 0;
function node(tag, text, className = "") {
 const el = document.createElement(tag); el.textContent = text;
 if (className) el.className = className; return el;
}
function feedback(text, correct = false) {
 const el = $("match-feedback"); el.textContent = text; el.hidden = !text;
 el.classList.toggle("is-correct", correct); el.classList.toggle("is-incorrect", Boolean(text) && !correct);
}
function showSpeaking() {
 buttons.forEach(button => button.classList.toggle("is-speaking", button.dataset.word === speakingWord));
}
function stopAudio() {
 if (voice) { voice.onended = null; voice.onerror = null; voice.pause(); voice = null; }
 speakingWord = null; showSpeaking();
}
function playWord(word) {
 stopAudio(); $("audio-status").hidden = true;
 const audio = new Audio("./assets/pronunciation/" + word + ".mp3");
 voice = audio; speakingWord = word; showSpeaking();
 const finish = () => { if (voice === audio) { voice = null; speakingWord = null; showSpeaking(); } };
 const fail = () => {
  if (voice !== audio) return;
  $("audio-status").textContent = "Could not play this word. Tap the card to listen again."; $("audio-status").hidden = false; finish();
 };
 audio.onended = finish; audio.onerror = fail; audio.play().catch(fail);
}
function render() {
 buttons.forEach(button => {
  const word = button.dataset.word, isMatched = matched.has(word), isSelected = selected.includes(word), flipped = isMatched || isSelected;
  button.classList.toggle("is-flipped", flipped);
  button.classList.toggle("is-selected", isSelected);
  button.classList.toggle("is-matched", isMatched);
  button.classList.toggle("is-wrong", resolving && isSelected && !isMatched);
  button.disabled = resolving && !isMatched;
  button.setAttribute("aria-pressed", String(isSelected));
  const item = pronunciationWords.find(item => item.word === word);
  button.setAttribute("aria-label", word + (flipped ? ", " + item.ipa + ", " + item.meaning : "") + (isMatched ? ", matched. Listen again." : isSelected ? ", selected. Listen again." : ". Listen and select."));
  button.querySelector(".card-front").setAttribute("aria-hidden", String(flipped));
  button.querySelector(".card-back").setAttribute("aria-hidden", String(!flipped));
  button.querySelector(".card-result").hidden = !isMatched;
 });
 $("pair-count").textContent = "Pairs matched: " + matched.size / 2 + "/4";
}
function choose(item) {
 if (resolving && !matched.has(item.word)) return;
 playWord(item.word);
 if (matched.has(item.word) || selected.includes(item.word)) return;
 if (!selected.length) feedback("");
 selected.push(item.word); render();
 if (selected.length !== 2) return;
 const first = pronunciationWords.find(word => word.word === selected[0]);
 // The rule is the final sound: any two /s/ words or any two /z/ words are valid.
 if (first.ending === item.ending) {
  selected.forEach(word => matched.add(word)); selected = [];
  feedback("Correct! Both words end with the same sound!", true); render();
  if (matched.size === pronunciationWords.length) {
   completeLesson("my-house", "pronunciation");
   const token = round;
   completionTimer = setTimeout(() => {
    if (token !== round) return;
    $("matcher-game").hidden = true; $("matcher-completion").hidden = false;
    $("completion-title").focus();
   }, 1000);
  }
 } else {
  resolving = true; feedback("Not quite! Listen again and try another pair."); render();
  const token = round;
  resetTimer = setTimeout(() => {
   if (token !== round) return;
   selected = []; resolving = false; render();
  }, 1600);
 }
}
function createCard(item) {
 const button = node("button", "", "sound-card"); button.type = "button"; button.dataset.word = item.word;
 const inner = node("span", "", "card-inner"), front = node("span", "", "card-face card-front"), back = node("span", "", "card-face card-back");
 const sound = node("span", "", "card-speaker"); sound.innerHTML = speaker;
 front.append(sound, node("strong", item.word, "card-word"), node("span", "Tap to select", "card-action"));
 const meaning = node("span", item.meaning, "card-meaning"); meaning.lang = "vi";
 const ipa = node("span", item.ipa, "card-ipa"); ipa.lang = "en";
 const check = node("span", "✓ Matched", "card-result"); check.hidden = true;
 back.append(node("strong", item.word, "card-word"), ipa, meaning, check);
 inner.append(front, back); button.append(inner);
 button.addEventListener("click", () => choose(item)); return button;
}
function startGame() {
 round++; clearTimeout(resetTimer); clearTimeout(completionTimer); stopAudio();
 selected = []; matched = new Set(); resolving = false; feedback(""); $("audio-status").hidden = true;
 const deck = [...pronunciationWords];
 for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
 buttons = deck.map(createCard); $("sound-cards").replaceChildren(...buttons); render();
 $("matcher-intro").hidden = true; $("matcher-completion").hidden = true; $("matcher-game").hidden = false;
 $("game-title").focus();
}
$("start-game").addEventListener("click", startGame);
$("play-again").addEventListener("click", startGame);
document.addEventListener("visibilitychange", () => { if (document.hidden) stopAudio(); });
window.addEventListener("pagehide", () => { round++; clearTimeout(resetTimer); clearTimeout(completionTimer); stopAudio(); });
