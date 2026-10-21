import { completeLesson } from "./progress.js";

import { email, huntQuestions, clues, mystery, journal, homeQuestions, hometown, practiceQuestions } from "./reading-content.js";

const $ = id => document.getElementById(id);
const collected = new Set();
let activity = "hunt";
let huntScreen = "hunt-intro";
let homeScreen = "home-intro";
let huntIndex = 0;
let basketSeen = false;
let mysteryOpen = false;

function node(tag, text = "", className = "") {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}
function focusHeading(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "start", behavior: "instant" });
}
function updateBasket() {
  $("basket-count").textContent = `${collected.size} / 4`;
  const ready = collected.size === 4 && !basketSeen;
  $("basket-alert").hidden = !ready;
  $("clue-basket").setAttribute("aria-label", `Open clue basket, ${collected.size} of 4 clues collected${ready ? ", all clues ready!" : ""}`);
}
function showScreen(id, target) {
  if (id === "hunt-success") completeLesson("my-house", "reading-hunt");
  document.querySelectorAll(".reading-screen").forEach(screen => { screen.hidden = screen.id !== id; });
  activity = id.startsWith("hunt-") ? "hunt" : "home";
  if (activity === "hunt") huntScreen = id;
  else homeScreen = id;
  $("clue-basket").hidden = !(activity === "hunt" && ["hunt-email", "hunt-collection"].includes(id));
  updateBasket();
  const screen = $(id);
  screen.classList.remove("screen-enter");
  void screen.offsetWidth;
  screen.classList.add("screen-enter");
  focusHeading(target || screen.querySelector("h2"));
}
// Native radio controls support touch, keyboard navigation and screen readers.
function choiceGroup(question, name, title) {
  const fieldset = node("fieldset", "", "reading-choices");
  const legend = node("legend", title || question.prompt);
  fieldset.append(legend);
  const inputs = question.choices.map((choice, index) => {
    const label = node("label", "", "reading-choice");
    const input = node("input");
    input.type = "radio";
    input.name = name;
    input.value = String(index);
    input.required = true;
    const letter = node("span", String.fromCharCode(65 + index), "choice-letter");
    letter.setAttribute("aria-hidden", "true");
    label.append(input, letter, node("span", choice, "choice-text"));
    fieldset.append(label);
    return input;
  });
  return {
    fieldset, inputs,
    value: () => inputs.find(input => input.checked)?.value,
    lock: value => inputs.forEach(input => { input.disabled = value; }),
    reset: () => inputs.forEach(input => { input.checked = false; input.disabled = false; input.closest("label").classList.remove("is-correct", "is-incorrect"); }),
  };
}
function singleQuestion(question, id, { kicker, correctAction, onCorrect, retryLabel = "Try again!" } = {}) {
  const form = node("form", "", "question-panel");
  form.id = id;
  const heading = node("h3", question.prompt);
  heading.tabIndex = -1;
  heading.id = id + "-title";
  form.setAttribute("aria-labelledby", heading.id);
  if (kicker) form.append(node("p", kicker, "reading-kicker"));
  const group = choiceGroup(question, id);
  group.fieldset.querySelector("legend").className = "sr-only";
  const feedback = node("p", "", "reading-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  const submit = node("button", "Submit", "reading-button");
  submit.type = "submit";
  submit.disabled = true;
  let phase = "answer";
  form.append(heading, group.fieldset, feedback, submit);
  form.addEventListener("change", () => { if (phase === "answer") submit.disabled = group.value() === undefined; });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (phase === "retry") {
      group.reset();
      feedback.textContent = "";
      feedback.className = "reading-feedback";
      submit.textContent = "Submit";
      submit.disabled = true;
      phase = "answer";
      group.inputs[0].focus();
      return;
    }
    if (phase === "correct") { onCorrect?.(); return; }
    const value = group.value();
    if (value === undefined) return;
    group.lock(true);
    const correct = Number(value) === question.answer;
    group.inputs[Number(value)].closest("label").classList.add(correct ? "is-correct" : "is-incorrect");
    feedback.textContent = (correct ? "Correct! " : "Incorrect. ") + (correct ? question.correct || "" : question.incorrect);
    feedback.classList.add(correct ? "is-correct" : "is-incorrect");
    if (correct && !correctAction) { onCorrect?.(); return; }
    phase = correct ? "correct" : "retry";
    submit.textContent = correct ? correctAction : retryLabel;
    feedback.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
  return form;
}

const emailText = $("email-text");
const metadata = node("dl", "", "email-metadata");
for (const [label, value] of [["From", email.from], ["To", email.to], ["Subject", email.subject]]) {
  const row = node("div");
  row.append(node("dt", label + ":"), node("dd", value));
  metadata.append(row);
}
emailText.append(metadata, ...email.paragraphs.map(text => node("p", text)));
const journalText = $("journal-text");
journalText.append(...journal.paragraphs.map(text => node("p", text)), node("h4", "New words I learned today:"));
const glossary = node("dl", "", "journal-words");
journal.words.forEach(([word, meaning]) => {
  const row = node("div");
  const translation = node("dd", meaning + ".");
  translation.lang = "vi";
  row.append(node("dt", word + ":"), translation);
  glossary.append(row);
});
journalText.append(glossary);

const icons = {
  landscape: '<svg viewBox="0 0 180 120"><path d="m10 87 44-67 38 47 27-41 51 64" fill="#a3ad78" stroke="#6a7848" stroke-width="4"/><path d="m40 41 14-21 17 21-15-5Z" fill="#fff6d7"/><path d="M4 96Q52 46 100 84T178 87v29H4Z" fill="#7b994e"/><path d="M8 106Q50 65 95 96M25 118Q63 82 113 110M89 88q30-17 82 13" fill="none" stroke="#d5dfa1" stroke-width="5"/><circle cx="144" cy="20" r="12" fill="#f4c254"/></svg>',
  house: '<svg viewBox="0 0 180 120"><path d="M34 65h112v34H34Z" fill="#bd843d"/><path d="m19 63 71-43 71 43Z" fill="#86602e" stroke="#684415" stroke-width="3"/><path d="M40 99v18m36-18v18m34-18v18m30-18v18" stroke="#78542c" stroke-width="7"/><path d="M38 85h104M54 66v31m73-31v31" stroke="#e3b25d" stroke-width="3"/><path d="M78 74h24v25H78Z" fill="#66451f"/><path d="m140 98 22 19m-18-15h10m-5 6h11" stroke="#78542c" stroke-width="4"/><path d="m83 29 14-15m-14 0 14 15" stroke="#d1d2ad" stroke-width="4"/></svg>',
  food: '<svg viewBox="0 0 180 120"><ellipse cx="104" cy="89" rx="61" ry="21" fill="#e9d8a4" stroke="#96763b" stroke-width="3"/><path d="M61 80q41-35 77 2l24-17v31l-24-14q-38 32-77-2Z" fill="#b9833c" stroke="#805b28" stroke-width="3"/><circle cx="76" cy="79" r="3" fill="#4f3e23"/><path d="m101 66-8 25m25-23-8 22" stroke="#66451f" stroke-width="3"/><path d="m17 47 30-17 20 25-15 32-35-5Z" fill="#6d8b43" stroke="#4f6e31" stroke-width="3"/><path d="m17 47 35 12 15-4m-20-25 5 57" stroke="#c8cf89" stroke-width="3"/><path d="M106 51q-10-29 9-34m-4 19q-22-8-16-17m17 12q25-4 23-17" stroke="#6d8b43" stroke-width="5" fill="none"/></svg>',
  culture: '<svg viewBox="0 0 180 120"><path d="m24 65 28 8 38-12 38 12 28-8" fill="none" stroke="#dba86e" stroke-width="7" stroke-linecap="round"/><circle cx="90" cy="26" r="12" fill="#e5ba83"/><path d="m78 40-10 30 19 5 25-5-10-30Z" fill="#f4efd3"/><path d="m80 74-13 39h47l-14-39Z" fill="#403c32"/><path d="M83 14q7-10 16 0l3 27-11-7Z" fill="#8f4162"/><path d="M94 14v23m4-17-10 3" stroke="#efbf69" stroke-width="3"/><path d="M90 43v25" stroke="#7d8b74" stroke-width="2"/><path d="m86 49 4-3 4 3-4 3Zm0 10 4-3 4 3-4 3Z" fill="#aeb3a2"/><circle cx="43" cy="43" r="9" fill="#e5ba83"/><path d="m34 54-7 24h32l-8-24Z" fill="#c0cf85"/><path d="m34 78-8 29h33l-9-29Z" fill="#403c32"/><circle cx="137" cy="43" r="9" fill="#e5ba83"/><path d="m128 54-7 24h32l-8-24Z" fill="#c0cf85"/><path d="m128 78-8 29h33l-9-29Z" fill="#403c32"/></svg>',
};
function clueCard(index, locked = false) {
  const article = node("article", "", "clue-card" + (locked ? " clue-locked" : ""));
  article.dataset.clue = String(index + 1);
  article.append(node("p", `CLUE CARD ${index + 1}`, "clue-number"));
  if (locked) {
    article.append(node("h3", "A clue to discover"), node("p", "Read Lan’s email and answer the next question to unlock this card."));
    return article;
  }
  const clue = clues[index];
  const art = node("div", "", "clue-icon");
  art.setAttribute("aria-hidden", "true");
  art.innerHTML = icons[clue.icon];
  article.append(art, node("h3", clue.title), node("p", clue.keywords, "clue-keywords"), node("p", clue.description));
  return article;
}
function renderHuntQuestion() {
  const area = $("hunt-question-area");
  area.replaceChildren();
  if (huntIndex === huntQuestions.length) {
    const panel = node("section", "", "question-panel all-clues-ready");
    const title = node("h3", "You have all four clues!");
    title.tabIndex = -1;
    panel.append(title, node("p", "Open your clue basket to review the evidence and solve the mystery."));
    area.append(panel);
    return;
  }
  const question = huntQuestions[huntIndex];
  area.append(singleQuestion(question, "hunt-answer", {
    kicker: `🍎 QUESTION ${huntIndex + 1} OF 4`,
    correctAction: question.action,
    onCorrect: () => {
      if (huntScreen !== "hunt-email") return;
      collected.add(huntIndex);
      $("clue-reveal-title").textContent = `Clue ${huntIndex + 1} unlocked!`;
      $("clue-reveal-card").replaceChildren(clueCard(huntIndex));
      showScreen("hunt-clue");
    },
  }));
}
$("start-hunt").addEventListener("click", () => { renderHuntQuestion(); showScreen("hunt-email"); });
$("got-clue").addEventListener("click", () => {
  if (huntScreen !== "hunt-clue") return;
  huntIndex++;
  renderHuntQuestion();
  showScreen("hunt-email", $("hunt-question-area").querySelector("h3"));
});
function openCollection() {
  if (collected.size === 4) basketSeen = true;
  $("clue-grid").replaceChildren(...clues.map((_, i) => clueCard(i, !collected.has(i))));
  $("solve-mystery").disabled = collected.size !== 4;
  $("solve-mystery").hidden = mysteryOpen;
  $("mystery-area").hidden = !mysteryOpen;
  showScreen("hunt-collection");
}
$("clue-basket").addEventListener("click", openCollection);
$("return-to-email").addEventListener("click", () => showScreen("hunt-email", $("hunt-question-area").querySelector("h3")));
$("solve-mystery").addEventListener("click", () => {
  if (collected.size !== 4) return;
  mysteryOpen = true;
  $("solve-mystery").hidden = true;
  $("mystery-area").hidden = false;
  $("mystery-area").replaceChildren(singleQuestion(mystery, "mystery-answer", {
    kicker: "THE FINAL MYSTERY",
    retryLabel: "Try Again",
    onCorrect: () => showScreen("hunt-success"),
  }));
  focusHeading($("mystery-area").querySelector("h3"));
});

// The butterfly works with a mouse, keyboard or a tap.
let butterflyPinned = false;
const discovery = document.querySelector(".butterfly-discovery");
function showButterfly(open) {
  $("butterfly-fact").hidden = !open;
  $("butterfly-button").setAttribute("aria-expanded", String(open));
}
$("butterfly-button").addEventListener("mouseenter", () => showButterfly(true));
discovery.addEventListener("mouseleave", () => { if (!butterflyPinned && !discovery.contains(document.activeElement)) showButterfly(false); });
$("butterfly-button").addEventListener("focus", () => showButterfly(true));
discovery.addEventListener("focusout", event => { if (!butterflyPinned && !discovery.contains(event.relatedTarget)) showButterfly(false); });
$("butterfly-button").addEventListener("click", () => { butterflyPinned = !butterflyPinned; showButterfly(butterflyPinned); });
$("close-butterfly").addEventListener("click", () => {
  butterflyPinned = false;
  $("butterfly-button").focus({ preventScroll: true });
  showButterfly(false);
});
discovery.addEventListener("keydown", event => {
  if (event.key === "Escape") { butterflyPinned = false; $("butterfly-button").focus(); showButterfly(false); }
});
$("continue-home").addEventListener("click", () => { butterflyPinned = false; showButterfly(false); showScreen(homeScreen); });

function renderHomeQuestions() {
  const area = $("home-question-area");
  const form = node("form", "", "question-panel");
  form.id = "journal-answers";
  const title = node("h3", "Answer the 3 Questions");
  title.tabIndex = -1;
  form.append(node("p", "STEP 2 · FOLLOW THE JOURNAL", "reading-kicker"), title, node("p", "Answer all three questions, then submit your answers together."));
  const groups = homeQuestions.map((question, i) => {
    const group = choiceGroup(question, `home-${i}`, `Question ${i + 1} – ${question.title}: ${question.prompt}`);
    form.append(group.fieldset);
    return group;
  });
  const feedback = node("p", "", "reading-feedback");
  feedback.setAttribute("role", "status");
  const submit = node("button", "Submit my answers", "reading-button");
  submit.type = "submit";
  submit.disabled = true;
  form.append(feedback, submit);
  let retry = false;
  const complete = () => groups.every(group => group.value() !== undefined);
  form.addEventListener("change", () => { submit.disabled = !complete(); });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (retry) {
      groups.forEach((group, i) => { if (Number(group.value()) !== homeQuestions[i].answer) group.reset(); else group.lock(false); });
      retry = false;
      feedback.textContent = "";
      submit.textContent = "Submit my answers";
      submit.disabled = !complete();
      groups.find(group => group.value() === undefined)?.inputs[0].focus();
      return;
    }
    if (!complete()) return;
    const score = groups.filter((group, i) => Number(group.value()) === homeQuestions[i].answer).length;
    if (score === 3) { renderHometown(); return; }
    groups.forEach(group => group.lock(true));
    retry = true;
    feedback.className = "reading-feedback is-incorrect";
    feedback.textContent = score === 0 ? "Incorrect. Uh oh! Let’s read Minh’s journal again, shall we?" : "Incorrect. Something is wrong! Seems like we need to take a closer look in Minh’s journal!";
    submit.textContent = "Try again!";
    feedback.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
  area.replaceChildren(form);
}
function renderHometown() {
  $("home-question-area").replaceChildren(singleQuestion(hometown, "hometown-answer", {
    kicker: "STEP 3 · DISCOVER THE HOMETOWN",
    correctAction: "Continue to Practice",
    onCorrect: renderPractice,
  }));
  focusHeading($("home-question-area").querySelector("h3"));
}
function renderPractice() {
  const form = node("form", "", "question-panel practice-panel");
  form.id = "reading-practice";
  const heading = node("h3", "A little practice");
  heading.tabIndex = -1;
  form.append(node("p", "STEP 4 · MAKE THE WORDS YOURS", "reading-kicker"), heading, node("p", "Choose a word for each blank. You’ll see an explanation for every answer."));
  const items = practiceQuestions.map((question, i) => {
    const row = node("div", "", "practice-item");
    const label = node("label", `${i + 1}. ${question.before} `);
    label.htmlFor = `practice-${i}`;
    const select = node("select");
    select.id = `practice-${i}`;
    select.required = true;
    select.setAttribute("aria-label", `Question ${i + 1}: ${question.before} blank ${question.after}`);
    const placeholder = node("option", "Choose a word");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.append(placeholder, ...question.choices.map(word => { const option = node("option", word); option.value = word; return option; }));
    const explanation = node("div", "", "practice-explanation");
    explanation.hidden = true;
    row.append(label, select, node("span", ` ${question.after}`), explanation);
    form.append(row);
    return { select, explanation };
  });
  const status = node("p", "", "reading-feedback");
  status.setAttribute("role", "status");
  const submit = node("button", "Check my answers", "reading-button");
  submit.type = "submit";
  submit.disabled = true;
  const back = node("a", "Back to My House →", "reading-button");
  back.href = "./my-house.html";
  back.hidden = true;
  form.append(status, submit, back);
  form.addEventListener("change", () => { submit.disabled = items.some(item => !item.select.value); });
  let checked = false;
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (checked || items.some(item => !item.select.value)) return;
    checked = true;
    items.forEach(({ select, explanation }, i) => {
      const correct = select.value === practiceQuestions[i].answer;
      select.disabled = true;
      explanation.hidden = false;
      explanation.append(node("strong", correct ? "✓ Correct" : "✕ Incorrect", correct ? "practice-correct" : "practice-incorrect"), node("p", practiceQuestions[i].explanation));
    });
    completeLesson("my-house", "reading-home");
    status.textContent = "Practice complete! Read the explanation under each sentence.";
    submit.hidden = true;
    back.hidden = false;
  });
  $("home-question-area").replaceChildren(form);
  focusHeading(heading);
}
$("start-home").addEventListener("click", () => { renderHomeQuestions(); showScreen("home-journal"); });
updateBasket();

document.querySelectorAll("#start-hunt, #start-home").forEach(button => { button.disabled = false; });
