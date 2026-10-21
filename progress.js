const KEY = "localingo.progress.v1";
export const unitIds = ["my-new-school", "my-house", "my-friends", "my-neighbourhood"];
export const unitActivities = {
  "my-house": [
    { id: "vocabulary", lessons: ["vocabulary"] },
    { id: "pronunciation", lessons: ["pronunciation"] },
    { id: "grammar", lessons: ["grammar-magic", "grammar-tidy"] },
    { id: "reading", lessons: ["reading-hunt", "reading-home"] },
    { id: "listening", lessons: ["listening"] },
    { id: "writing", lessons: ["writing"] },
    { id: "speaking", lessons: ["speaking"] },
  ],
};
export const unitLessons = Object.fromEntries(Object.entries(unitActivities).map(([unit, activities]) => [unit, activities.flatMap(activity => activity.lessons)]));
let memory = { speaking: [], speakingVersion: 2, explore: {}, units: [], lessons: { "my-house": [] }, vocabulary: [] };
function markLesson(state, unit, lesson) {
  const lessons = state.lessons[unit] ||= [];
  if (!lessons.includes(lesson)) lessons.push(lesson);
}
function updateUnits(state) {
  if (state.speaking.length === 5) markLesson(state, "my-house", "speaking");
  for (const [unit, required] of Object.entries(unitLessons)) {
    if (required.every(lesson => state.lessons[unit]?.includes(lesson)) && !state.units.includes(unit)) state.units.push(unit);
  }
  return state;
}
export function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || JSON.stringify(memory));
    memory = updateUnits({
      speakingVersion: 2,
      speaking: saved.speakingVersion === 2 && Array.isArray(saved.speaking) ? [...new Set(saved.speaking.filter(id => /^house-[1-5]$/.test(id)))] : [],
      explore: saved.explore && typeof saved.explore === "object" && !Array.isArray(saved.explore) ? saved.explore : {},
      units: Array.isArray(saved.units) ? [...new Set(saved.units.filter(id => unitIds.includes(id)))] : [],
      lessons: Object.fromEntries(Object.entries(unitLessons).map(([unit, required]) => [unit, Array.isArray(saved.lessons?.[unit]) ? [...new Set(saved.lessons[unit].filter(lesson => required.includes(lesson)))] : []])),
      vocabulary: Array.isArray(saved.vocabulary) ? [...new Set(saved.vocabulary.filter(word => typeof word === "string"))] : [],
    });
  } catch {}
  return structuredClone(memory);
}
export function saveProgress(update) {
  const state = readProgress();
  update(state);
  updateUnits(state);
  memory = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { document.querySelectorAll("[data-storage-note]").forEach(el => { el.textContent = "Tiến độ chỉ được giữ trong phiên này vì trình duyệt đang chặn lưu trữ."; el.hidden = false; }); }
  window.dispatchEvent(new Event("localingo-progress"));
  return state;
}
export function completeLesson(unit, lesson) {
  if (!unitLessons[unit]?.includes(lesson) || readProgress().lessons[unit].includes(lesson)) return;
  // Speaking is completed through the five assessed questions.
  if (lesson === "speaking") return;
  saveProgress(state => { markLesson(state, unit, lesson); });
}
export function completeVocabularyWord(word, requiredWords) {
  if (!requiredWords.includes(word) || readProgress().vocabulary.includes(word)) return;
  saveProgress(state => {
    state.vocabulary.push(word);
    if (requiredWords.every(item => state.vocabulary.includes(item))) markLesson(state, "my-house", "vocabulary");
  });
}
export function renderProgress() {
  const progress = readProgress();
  document.querySelectorAll("[data-unit-progress]").forEach(el => { el.value = progress.units.length; el.max = unitIds.length; });
  document.querySelectorAll("[data-unit-count]").forEach(el => { el.textContent = progress.units.length + "/" + unitIds.length + " units completed"; });
  document.querySelectorAll("[data-unit-percent]").forEach(el => { el.textContent = Math.round(progress.units.length / unitIds.length * 100) + "%"; });
  document.querySelectorAll("[data-unit-step]").forEach(el => {
    const done = progress.units.includes(el.dataset.unitStep);
    el.classList.toggle("is-complete", done);
    el.querySelector(".journey-step__marker").textContent = done ? "✓" : el.dataset.stepNumber;
    el.querySelector("[data-step-status]").textContent = done ? "Completed" : "Not completed";
  });
  document.querySelectorAll("[data-activity-unit]").forEach(card => {
    const unit = card.dataset.activityUnit, activities = unitActivities[unit] || [];
    const completed = new Set(activities.filter(activity => activity.lessons.every(lesson => progress.lessons[unit]?.includes(lesson))).map(activity => activity.id));
    card.querySelector("[data-activity-count]").textContent = completed.size + "/" + activities.length + " activities completed";
    card.querySelector("[data-activity-percent]").textContent = (activities.length ? Math.round(completed.size / activities.length * 100) : 0) + "%";
    const bar = card.querySelector("[data-activity-progress]"); bar.value = completed.size; bar.max = activities.length;
    card.classList.toggle("is-complete", completed.size === activities.length);
    card.querySelector("[data-activity-note]").textContent = completed.size === activities.length ? "Unit completed. Well done!" : "One activity at a time";
    card.querySelectorAll("[data-activity-step]").forEach(el => {
      const id = el.dataset.activityStep, index = activities.findIndex(activity => activity.id === id), done = completed.has(id);
      const started = activities[index]?.lessons.some(lesson => progress.lessons[unit]?.includes(lesson)) || id === "vocabulary" && progress.vocabulary.length > 0 || id === "speaking" && progress.speaking.length > 0;
      el.classList.toggle("is-complete", done); el.classList.toggle("is-started", !done && Boolean(started));
      el.querySelector(".journey-step__marker").textContent = done ? "✓" : String(index + 1);
      el.setAttribute("aria-label", "Open " + el.dataset.stepLabel + " activity. " + (done ? "Completed." : started ? "In progress." : "Not started."));
    });
  });
}
window.addEventListener("storage", renderProgress);
window.addEventListener("localingo-progress", renderProgress);
renderProgress();
