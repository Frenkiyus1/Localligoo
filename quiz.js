import { saveProgress } from "./progress.js";
import { questions } from "./questions.js";

const QUESTION_COUNT = 5;
const FEEDBACK_DELAY = 2400;
const deck = document.getElementById("question-deck");
const pool = [...questions];
// Draw a fresh, distinct sample for this visit; saved answers never lock a new round.
for (let i = pool.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [pool[i], pool[j]] = [pool[j], pool[i]];
}
const round = pool.slice(0, QUESTION_COUNT);
let position = 0;
let correct = 0;
let answered = 0;
let timer;

function node(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
function updateProgress() {
  document.getElementById("quiz-progress").value = answered;
  document.getElementById("question-position").textContent = answered === round.length
    ? "5 / 5 completed"
    : `Question ${position + 1} of ${round.length}`;
}
function finish() {
  deck.replaceChildren();
  const result = node("section", "", "quiz-result");
  result.setAttribute("aria-labelledby", "result-title");
  const title = node("h3", "You did it!");
  title.id = "result-title";
  title.tabIndex = -1;
  result.append(
    title,
    node("p", `${correct} / ${round.length} correct`, "quiz-result-score"),
    node("p", "Five little discoveries. A little closer to Mộc Châu."),
  );
  deck.append(result);
  document.getElementById("quiz-status").textContent = `Round complete. ${correct} out of ${round.length} answers correct.`;
  updateProgress();
  title.focus({ preventScroll: true });
}
function advance() {
  position++;
  if (position === round.length) {
    finish();
    return;
  }
  [...deck.children].forEach((card, index) => { card.hidden = index !== position; });
  document.getElementById("quiz-status").textContent = "";
  updateProgress();
  deck.children[position].querySelector("h3").focus({ preventScroll: true });
}
round.forEach((question, index) => {
  const card = node("article", "", "question-card");
  card.dataset.questionId = question.id;
  card.hidden = index !== 0;
  const heading = node("h3", question.prompt);
  heading.id = `question-${question.id}`;
  heading.tabIndex = -1;
  card.setAttribute("aria-labelledby", heading.id);
  const choices = node("div", "", "question-choices");
  const feedback = node("p", "", "answer-feedback");
  let submitted = false;

  question.choices.forEach((choice, choiceIndex) => {
    const button = node("button", `${String.fromCharCode(65 + choiceIndex)}. ${choice}`, "question-choice");
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (submitted || index !== position) return;
      submitted = true;
      answered++;
      const isCorrect = choiceIndex === question.answer;
      if (isCorrect) correct++;
      choices.querySelectorAll("button").forEach((option, optionIndex) => {
        option.disabled = true;
        option.classList.toggle("correct", optionIndex === question.answer);
        option.classList.toggle("incorrect", optionIndex === choiceIndex && !isCorrect);
        option.setAttribute("aria-pressed", String(optionIndex === choiceIndex));
      });
      const response = isCorrect ? "That's right!" : `Good try! Answer: ${question.choices[question.answer]}`;
      feedback.textContent = response;
      feedback.classList.toggle("answer-correct", isCorrect);
      document.getElementById("quiz-status").textContent = response + (answered < round.length ? " Next question coming up…" : " Your results are coming up…");
      saveProgress(state => { state.explore[question.id] = choiceIndex; });
      // The visible counter advances together with the next question.
      document.getElementById("quiz-progress").value = answered;
      timer = window.setTimeout(advance, FEEDBACK_DELAY);
    });
    choices.append(button);
  });
  card.append(heading, choices, feedback);
  deck.append(card);
});
window.addEventListener("pagehide", () => window.clearTimeout(timer));
updateProgress();

// A return through browser history starts a new visit too.
window.addEventListener("pageshow", event => { if (event.persisted) window.location.reload(); });
