const $ = id => document.getElementById(id);
const clues = [
 { text: "It is near the entrance to enter the house.", answer: "stairs" },
 { text: "People sit on it in the living area to drink tea.", answer: "cushion" },
 { text: "It is a big wooden furniture next to the window.", answer: "table" },
 { text: "It is in front of the house to relax and look at the mountains.", answer: "bench" },
];
// Temporary picture slots, deliberately arranged in a different order from the clues.
const pictures = [
 { id: "bench", name: "Bamboo bench", note: "Ảnh: Ghế băng bằng tre" },
 { id: "stairs", name: "Wooden stairs", note: "Ảnh: Cầu thang gỗ" },
 { id: "table", name: "Wooden table", note: "Ảnh: Cái bàn gỗ" },
 { id: "cushion", name: "Brocade seat pad cushion", note: "Ảnh: Tấm đệm ngồi dân tộc Thái" },
];
const transcript = [
 ["Alex", "Hello! Wow, your stilt house is so beautiful!"],
 ["Host", "Welcome to our house! Come in."],
 ["Alex", "Thank you! What is this near the entrance?"],
 ["Host", "That is the wooden stairs. Everyone uses them to enter the house."],
 ["Alex", "I see. And where do family members usually sit?"],
 ["Host", "Look at the living area. We sit on a brocade seat pad cushion on the floor to talk and drink tea."],
 ["Alex", "Nice! Oh, there is a big wooden table next to the window."],
 ["Host", "Yes, that's where we welcome our guests."],
 ["Alex", "And what is that long bamboo bench in front of the house?"],
 ["Host", "That is for people to sit, relax, and look at the mountains."],
 ["Alex", "Wonderful! Thank you so much for sharing!"],
];
const audio = $("mission-audio");
let matches = Array(clues.length).fill(null), selected = null, results = null, completed = false;
const letter = index => String.fromCharCode(65 + index);
function node(tag, text, className = "") {
 const el = document.createElement(tag); el.textContent = text;
 if (className) el.className = className;
 return el;
}
const clueButtons = clues.map((clue, index) => {
 const button = node("button", "", "clue-card"); button.type = "button";
 button.dataset.clue = index; button.setAttribute("aria-pressed", "false");
 button.append(node("span", String(index + 1), "clue-number"), node("span", clue.text, "clue-text"), node("span", "—", "match-letter"));
 button.addEventListener("click", () => {
  selected = selected === index ? null : index;
  $("matching-instruction").textContent = selected === null ? "Choose a clue, then choose its picture." : "Clue " + (selected + 1) + " selected. Choose its picture.";
  render();
 });
 $("clue-cards").append(button); return button;
});
const pictureButtons = pictures.map((picture, index) => {
 const button = node("button", "", "picture-card"); button.type = "button";
 button.dataset.picture = picture.id;
 const slot = node("span", "", "picture-placeholder");
 slot.append(node("strong", picture.name), node("span", picture.note, "picture-note"));
 slot.lastChild.lang = "vi";
 button.append(node("span", letter(index), "picture-letter"), slot, node("span", "", "picture-match"));
 button.setAttribute("aria-label", "Picture " + letter(index) + ": " + picture.name);
 button.addEventListener("click", () => {
  if (selected === null || completed) return;
  const previous = matches.indexOf(picture.id);
  if (previous >= 0 && previous !== selected) matches[previous] = null;
  matches[selected] = picture.id;
  selected = null; results = null; $("listening-feedback").hidden = true;
  $("matching-instruction").textContent = matches.every(Boolean) ? "All four clues are matched. Submit to check your answers." : "Choose a clue, then choose its picture.";
  render();
 });
 $("picture-cards").append(button); return button;
});
function render() {
 clueButtons.forEach((button, index) => {
  const pictureIndex = pictures.findIndex(picture => picture.id === matches[index]);
  button.querySelector(".match-letter").textContent = pictureIndex < 0 ? "—" : letter(pictureIndex);
  button.setAttribute("aria-label", "Clue " + (index + 1) + ": " + clues[index].text + (pictureIndex < 0 ? " Unmatched." : " Matched to picture " + letter(pictureIndex) + "."));
  button.setAttribute("aria-pressed", String(selected === index));
  button.classList.toggle("is-selected", selected === index);
  button.classList.toggle("is-matched", pictureIndex >= 0);
  button.classList.toggle("is-correct", results?.[index] === true);
  button.classList.toggle("is-incorrect", results?.[index] === false);
  button.disabled = completed;
 });
 pictureButtons.forEach((button, index) => {
  const clueIndex = matches.indexOf(pictures[index].id);
  button.querySelector(".picture-match").textContent = clueIndex < 0 ? "" : "Clue " + (clueIndex + 1);
  button.classList.toggle("is-matched", clueIndex >= 0);
  button.classList.toggle("is-correct", clueIndex >= 0 && results?.[clueIndex] === true);
  button.classList.toggle("is-incorrect", clueIndex >= 0 && results?.[clueIndex] === false);
  button.disabled = selected === null || completed;
 });
 $("match-count").textContent = matches.filter(Boolean).length + " / 4 matched";
 $("submit-matches").disabled = completed;
 requestAnimationFrame(drawLines);
}
function drawLines() {
 const svg = $("match-lines"), board = $("matching-board").getBoundingClientRect();
 if (!board.width || !board.height) return;
 svg.setAttribute("viewBox", "0 0 " + board.width + " " + board.height);
 const paths = matches.flatMap((match, index) => {
  if (!match) return [];
  const from = clueButtons[index].getBoundingClientRect();
  const to = pictureButtons[pictures.findIndex(picture => picture.id === match)].getBoundingClientRect();
  const x1 = from.right - board.left, y1 = from.top + from.height / 2 - board.top;
  const x2 = to.left - board.left, y2 = to.top + to.height / 2 - board.top;
  const mid = (x1 + x2) / 2;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M " + x1 + " " + y1 + " C " + mid + " " + y1 + ", " + mid + " " + y2 + ", " + x2 + " " + y2);
  path.setAttribute("class", results ? results[index] ? "line-correct" : "line-incorrect" : "");
  return [path];
 });
 svg.replaceChildren(...paths);
}
$("matching-form").addEventListener("submit", event => {
 event.preventDefault();
 const feedback = $("listening-feedback");
 if (!matches.every(Boolean)) {
  $("feedback-title").textContent = "Complete all the clues before checking!";
  $("pair-feedback").replaceChildren(); feedback.hidden = false;
  return;
 }
 results = clues.map((clue, index) => matches[index] === clue.answer);
 completed = results.every(Boolean); selected = null;
 $("feedback-title").textContent = results.filter(Boolean).length + " / 4 missing notes found";
 $("pair-feedback").replaceChildren(...results.map((correct, index) => {
  const item = node("li", "", correct ? "pair-correct" : "pair-incorrect");
  item.append(node("strong", "Clue " + (index + 1) + ": "), document.createTextNode(correct ? "Correct! You found a missing note!" : "Not quite! Listen again and try once more!"));
  return item;
 }));
 feedback.hidden = false;
 $("listening-completion").hidden = !completed;
 $("matching-instruction").textContent = completed ? "All four notes are back in Alex’s guidebook." : "Choose a clue to change its match, then submit again.";
 if ($("transcript-panel").hidden) {
  $("transcript-copy").replaceChildren(...transcript.map(([speaker, words]) => {
   const line = node("p", ""); line.append(node("strong", speaker + ": "), document.createTextNode(words)); return line;
  }));
  $("transcript-panel").hidden = false;
 }
 render();
});
function playAudio() { audio.play().catch(() => {}); }
$("start-mission").addEventListener("click", () => {
 $("listening-intro").hidden = true; $("listening-mission").hidden = false;
 $("mission-title").focus(); render(); playAudio();
});
$("play-again").addEventListener("click", () => {
 matches = Array(clues.length).fill(null); selected = null; results = null; completed = false;
 $("listening-feedback").hidden = true; $("pair-feedback").replaceChildren(); $("feedback-title").textContent = "";
 $("listening-completion").hidden = true;
 $("transcript-panel").hidden = true; $("transcript-panel").open = false; $("transcript-copy").replaceChildren();
 $("matching-instruction").textContent = "Choose a clue, then choose its picture.";
 audio.pause(); if (audio.readyState) audio.currentTime = 0;
 render(); $("mission-title").focus(); playAudio();
});
audio.addEventListener("error", () => { $("audio-status").textContent = "The audio could not load. Please reload the page and try again."; $("audio-status").hidden = false; });
audio.addEventListener("loadeddata", () => { $("audio-status").hidden = true; });
window.addEventListener("pagehide", () => audio.pause());
new ResizeObserver(() => requestAnimationFrame(drawLines)).observe($("matching-board"));
render();
