import { completeLesson } from "./progress.js";

import { possessiveRounds, tidyRounds } from "./grammar-content.js";

const $ = id => document.getElementById(id);
const games = {
  magic: { phase: "intro", index: 0, answers: Array(possessiveRounds.length).fill(null) },
  tidy: { phase: "intro", index: 0, answers: Array(tidyRounds.length).fill(null), selected: null },
};
let activeGame = "magic";
let touchDrag = null;
const DRAG_TYPE = "application/x-localingo-preposition";

function element(tag, text = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function score(game) {
  const rounds = game === "magic" ? possessiveRounds : tidyRounds;
  return games[game].answers.filter((answer, index) => answer !== null && answer === rounds[index].answer).length;
}
function focusScreen(screen) {
  screen.querySelector("h2")?.focus({ preventScroll: true });
  screen.scrollIntoView({ block: "start", behavior: "instant" });
}
function showGame(game) {
  cleanupTouchDrag();
  activeGame = game;
  const state = games[game];
  let id = game + "-" + (state.phase === "intro" ? "intro" : "game");
  if (state.phase === "result") { id = "grammar-result"; renderResult(game); }
  else if (state.phase === "play") {
    if (game === "magic") renderMagic();
    else renderTidy();
  }
  document.querySelectorAll(".grammar-screen").forEach(screen => { screen.hidden = screen.id !== id; });
  focusScreen($(id));
}
function startGame(game) {
  const state = games[game];
  state.phase = "play";
  state.index = 0;
  state.answers.fill(null);
  if (game === "tidy") state.selected = null;
  showGame(game);
}
$("start-magic").addEventListener("click", () => startGame("magic"));
$("start-tidy").addEventListener("click", () => startGame("tidy"));
$("how-to-play").addEventListener("click", () => $("play-instructions").showModal());
$("play-again").addEventListener("click", () => startGame(activeGame));
$("try-other-game").addEventListener("click", () => showGame(activeGame === "magic" ? "tidy" : "magic"));

function renderMagic() {
  const state = games.magic;
  const round = possessiveRounds[state.index];
  $("magic-round-label").textContent = `Round ${state.index + 1} of 4 · ${round.category}`;
  $("magic-score-live").textContent = `${score("magic")} correct`;
  $("magic-question").textContent = round.prompt;
  $("magic-owner").textContent = round.owner;
  for (const id of ["magic-art", "magic-mobile-image"]) {
    $(id).src = round.image;
    $(id).alt = round.alt;
  }
  const chosen = state.answers[state.index];
  $("magic-choices").replaceChildren(...round.choices.map((text, index) => {
    const button = element("button", "", "magic-choice");
    button.type = "button";
    button.setAttribute("aria-label", text);
    button.setAttribute("aria-pressed", String(chosen === index));
    const letter = element("span", String.fromCharCode(65 + index), "magic-letter");
    letter.setAttribute("aria-hidden", "true");
    button.append(letter, element("span", text));
    button.disabled = chosen !== null;
    if (chosen !== null) {
      button.classList.toggle("is-correct", index === round.answer);
      button.classList.toggle("is-wrong", chosen === index && index !== round.answer);
    }
    button.addEventListener("click", () => choosePossessive(index));
    return button;
  }));
  $("magic-next").hidden = chosen === null;
  $("magic-next").textContent = state.index === 3 ? "See my score →" : "Next round →";
}
function choosePossessive(index) {
  const state = games.magic;
  if (activeGame !== "magic" || state.phase !== "play" || state.answers[state.index] !== null) return;
  state.answers[state.index] = index;
  const round = possessiveRounds[state.index];
  renderMagic();
  $("tip-title").textContent = `Magic Tip ${state.index + 1}!`;
  $("tip-feedback").textContent = index === round.answer ? "Correct! " + round.choices[round.answer] : "Not quite. The correct answer is “" + round.choices[round.answer] + "”.";
  $("tip-feedback").classList.toggle("is-correct", index === round.answer);
  $("tip-feedback").classList.toggle("is-wrong", index !== round.answer);
  $("tip-rule").textContent = round.tip;
  $("tip-example").textContent = "Example: " + round.example;
  $("tip-next").textContent = state.index === 3 ? "Got it! See my score →" : "Got it! Next →";
  $("grammar-tip").showModal();
  $("tip-title").focus({ preventScroll: true });
}
function advanceMagic() {
  const state = games.magic;
  if (activeGame !== "magic" || state.phase !== "play" || state.answers[state.index] === null) return;
  $("grammar-tip").close();
  if (state.index === possessiveRounds.length - 1) state.phase = "result";
  else state.index++;
  showGame("magic");
}
$("tip-next").addEventListener("click", advanceMagic);
$("magic-next").addEventListener("click", advanceMagic);
$("close-tip").addEventListener("click", () => $("grammar-tip").close());
$("grammar-tip").addEventListener("close", () => {
  if (activeGame === "magic" && games.magic.phase === "play" && games.magic.answers[games.magic.index] !== null) {
    $("magic-next").focus({ preventScroll: true });
  }
});

function selectPreposition(word) {
  const state = games.tidy;
  const round = tidyRounds[state.index];
  if (activeGame !== "tidy" || state.phase !== "play" || state.answers[state.index] !== null || !round.choices.includes(word)) return;
  state.selected = word;
  updateSelection();
}
function updateSelection() {
  const state = games.tidy;
  const answered = state.answers[state.index] !== null;
  $("preposition-blank").textContent = state.selected || "______";
  $("preposition-blank").setAttribute("aria-label", state.selected ? `Selected preposition: ${state.selected}. Press to clear.` : "Preposition blank. Choose or drop a word here.");
  $("preposition-blank").classList.toggle("has-word", Boolean(state.selected));
  $("preposition-blank").disabled = answered;
  $("check-tidy").disabled = answered || !state.selected;
  document.querySelectorAll(".preposition-choice").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.word === state.selected));
    button.disabled = answered;
    button.draggable = !answered;
  });
}
function renderTidy() {
  const state = games.tidy;
  const round = tidyRounds[state.index];
  const answered = state.answers[state.index] !== null;
  if (answered) state.selected = state.answers[state.index];
  $("tidy-round-label").textContent = `Item ${state.index + 1} of 7`;
  $("tidy-score-live").textContent = `${score("tidy")} correct`;
  $("tidy-progress").value = state.answers.filter(answer => answer !== null).length;
  $("tidy-image").src = round.image;
  $("tidy-image").alt = round.alt;
  $("tidy-before").textContent = round.before;
  $("tidy-after").textContent = round.after;
  $("preposition-choices").replaceChildren(...round.choices.map(word => {
    const button = element("button", word, "preposition-choice");
    button.type = "button";
    button.dataset.word = word;
    button.draggable = true;
    button.addEventListener("click", () => selectPreposition(word));
    button.addEventListener("dragstart", event => {
      if (state.answers[state.index] !== null) { event.preventDefault(); return; }
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ word, index: state.index }));
      event.dataTransfer.setData("text/plain", word);
    });
    button.addEventListener("dragend", () => $("preposition-blank").classList.remove("is-drag-over"));
    enableTouchDrag(button, word);
    return button;
  }));
  updateSelection();
  $("check-tidy").hidden = answered;
  $("tidy-next").hidden = !answered;
  $("tidy-next").textContent = state.index === 6 ? "See my score →" : "Next item →";
  $("preposition-blank").classList.remove("is-correct", "is-wrong");
  $("tidy-feedback").textContent = "";
  $("tidy-feedback").className = "grammar-feedback";
  if (answered) showTidyFeedback();
}
$("preposition-blank").addEventListener("click", () => {
  if (games.tidy.answers[games.tidy.index] !== null) return;
  games.tidy.selected = null;
  updateSelection();
});
$("preposition-blank").addEventListener("dragover", event => {
  if (activeGame !== "tidy" || games.tidy.answers[games.tidy.index] !== null || !event.dataTransfer.types.includes(DRAG_TYPE)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  $("preposition-blank").classList.add("is-drag-over");
});
$("preposition-blank").addEventListener("dragleave", () => $("preposition-blank").classList.remove("is-drag-over"));
$("preposition-blank").addEventListener("drop", event => {
  event.preventDefault();
  $("preposition-blank").classList.remove("is-drag-over");
  try {
    const data = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
    if (data.index === games.tidy.index) selectPreposition(data.word);
  } catch { /* Ignore drops from outside this game. */ }
});
function cleanupTouchDrag() {
  touchDrag?.ghost?.remove();
  touchDrag = null;
  $("preposition-blank").classList.remove("is-drag-over");
}
function isOverBlank(x, y) {
  const rect = $("preposition-blank").getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
function enableTouchDrag(button, word) {
  button.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" || button.disabled) return;
    cleanupTouchDrag();
    touchDrag = { pointerId: event.pointerId, word, x: event.clientX, y: event.clientY, moved: false };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", event => {
    if (!touchDrag || event.pointerId !== touchDrag.pointerId) return;
    if (!touchDrag.moved && Math.hypot(event.clientX - touchDrag.x, event.clientY - touchDrag.y) > 8) {
      touchDrag.moved = true;
      touchDrag.ghost = element("div", word, "drag-word-ghost");
      document.body.append(touchDrag.ghost);
    }
    if (!touchDrag.moved) return;
    event.preventDefault();
    touchDrag.ghost.style.left = event.clientX + "px";
    touchDrag.ghost.style.top = event.clientY + "px";
    $("preposition-blank").classList.toggle("is-drag-over", isOverBlank(event.clientX, event.clientY));
  });
  button.addEventListener("pointerup", event => {
    if (!touchDrag || event.pointerId !== touchDrag.pointerId) return;
    if (touchDrag.moved) {
      event.preventDefault();
      if (isOverBlank(event.clientX, event.clientY)) selectPreposition(word);
    }
    cleanupTouchDrag();
  });
  button.addEventListener("pointercancel", cleanupTouchDrag);
}
function showTidyFeedback() {
  const state = games.tidy;
  const round = tidyRounds[state.index];
  const correct = state.answers[state.index] === round.answer;
  $("tidy-feedback").textContent = (correct ? "Correct! " : `Not quite. The correct word is “${round.answer}”. `) + round.explanation;
  $("tidy-feedback").classList.toggle("is-correct", correct);
  $("tidy-feedback").classList.toggle("is-wrong", !correct);
  $("preposition-blank").classList.toggle("is-correct", correct);
  $("preposition-blank").classList.toggle("is-wrong", !correct);
}
$("check-tidy").addEventListener("click", () => {
  const state = games.tidy;
  if (activeGame !== "tidy" || state.phase !== "play" || state.answers[state.index] !== null || !state.selected) return;
  state.answers[state.index] = state.selected;
  renderTidy();
  $("tidy-feedback").scrollIntoView({ block: "nearest", behavior: "instant" });
});
$("tidy-next").addEventListener("click", () => {
  const state = games.tidy;
  if (activeGame !== "tidy" || state.phase !== "play" || state.answers[state.index] === null) return;
  if (state.index === tidyRounds.length - 1) state.phase = "result";
  else { state.index++; state.selected = null; }
  $("preposition-blank").classList.remove("is-correct", "is-wrong");
  showGame("tidy");
});
function renderResult(game) {
  completeLesson("my-house", "grammar-" + game);
  const correct = score(game);
  const total = games[game].answers.length;
  $("result-game-label").textContent = game === "magic" ? "POSSESSIVE CASE · THE MAGIC’S GAME!" : "PREPOSITIONS · THAI STILT HOUSE TIDY-UP";
  $("result-message").textContent = game === "magic"
    ? "You are a Grammar Superstar! You helped Vàng, Mai, and the clever tortoise label all their things perfectly."
    : "Ban's house is tidy again! Thank you for helping me! You did a great job!";
  $("result-score").textContent = `${correct} / ${total}`;
  $("result-score").setAttribute("aria-label", `${correct} out of ${total} correct answers`);
  $("result-stars").replaceChildren(...Array.from({ length: total }, (_, index) => element("span", index < correct ? "★" : "☆", index < correct ? "earned-star" : "empty-star")));
  $("try-other-game").textContent = game === "magic" ? "Let’s help Ban! →" : "Play The Magic’s Game! →";
}
document.querySelectorAll("#start-magic, #start-tidy, #how-to-play").forEach(button => { button.disabled = false; });
