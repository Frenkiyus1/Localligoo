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
function unitProgress(unit, state) {
  const lessons = state.lessons[unit] || [];
  const activities = (unitActivities[unit] || []).map(activity => {
    const complete = activity.lessons.every(lesson => lessons.includes(lesson));
    let fraction = activity.lessons.filter(lesson => lessons.includes(lesson)).length / activity.lessons.length;
    if (!complete && unit === "my-house") {
      if (activity.id === "vocabulary") fraction = Math.min(state.vocabulary.length / 15, 1);
      if (activity.id === "speaking") fraction = state.speaking.length / 5;
    }
    return { id: activity.id, complete, fraction: complete ? 1 : fraction };
  });
  const studied = activities.reduce((sum, activity) => sum + activity.fraction, 0);
  return {
    activities, studied,
    completed: activities.filter(activity => activity.complete).length,
    fraction: state.units.includes(unit) ? 1 : activities.length ? studied / activities.length : 0,
  };
}
function percentage(fraction) {
  const rounded = Math.round(fraction * 100);
  return fraction > 0 && rounded === 0 ? "<1%" : rounded + "%";
}
export function renderProgress() {
  const state = readProgress();
  const units = Object.fromEntries(unitIds.map(unit => [unit, unitProgress(unit, state)]));
  const studiedUnits = Object.values(units).reduce((sum, unit) => sum + unit.fraction, 0);
  const coursePercent = percentage(studiedUnits / unitIds.length);
  document.querySelectorAll("[data-unit-progress]").forEach(el => {
    el.max = unitIds.length; el.value = studiedUnits;
    el.setAttribute("aria-valuetext", coursePercent + " studied. " + state.units.length + " of " + unitIds.length + " units completed.");
  });
  document.querySelectorAll("[data-unit-count]").forEach(el => { el.textContent = state.units.length + "/" + unitIds.length + " units completed"; });
  document.querySelectorAll("[data-unit-percent]").forEach(el => { el.textContent = coursePercent; });
  document.querySelectorAll("[data-unit-step]").forEach(el => {
    const done = state.units.includes(el.dataset.unitStep), fraction = units[el.dataset.unitStep]?.fraction || 0;
    el.classList.toggle("is-complete", done);
    el.classList.toggle("is-started", !done && fraction > 0);
    el.querySelector(".journey-step__marker").textContent = done ? "✓" : el.dataset.stepNumber;
    el.querySelector("[data-step-status]").textContent = done ? "Completed" : fraction > 0 ? "In progress: " + percentage(fraction) : "Not completed";
  });
  document.querySelectorAll("[data-activity-unit]").forEach(card => {
    const unit = units[card.dataset.activityUnit];
    if (!unit?.activities.length) return;
    const { activities, studied, completed } = unit;
    const percent = percentage(studied / activities.length);
    const started = activities.filter(activity => !activity.complete && activity.fraction > 0).length;
    card.querySelector("[data-activity-count]").textContent = completed + "/" + activities.length + " activities completed";
    card.querySelector("[data-activity-percent]").textContent = percent;
    const bar = card.querySelector("[data-activity-progress]"); bar.max = activities.length; bar.value = studied;
    bar.setAttribute("aria-valuetext", percent + " studied. " + completed + " of " + activities.length + " activities completed.");
    card.classList.toggle("is-complete", completed === activities.length);
    card.querySelector("[data-activity-note]").textContent = completed === activities.length ? "Unit completed. Well done!" : started ? started + (started === 1 ? " activity in progress" : " activities in progress") : "One activity at a time";
    card.querySelectorAll("[data-activity-step]").forEach(el => {
      const index = activities.findIndex(activity => activity.id === el.dataset.activityStep);
      const activity = activities[index];
      if (!activity) return;
      el.classList.toggle("is-complete", activity.complete);
      el.classList.toggle("is-started", !activity.complete && activity.fraction > 0);
      el.querySelector(".journey-step__marker").textContent = activity.complete ? "✓" : String(index + 1);
      el.setAttribute("aria-label", "Open " + el.dataset.stepLabel + " activity. " + (activity.complete ? "Completed." : activity.fraction > 0 ? "In progress." : "Not started."));
    });
  });
}
window.addEventListener("storage", renderProgress);
window.addEventListener("localingo-progress", renderProgress);
// History navigation may restore a page from the browser cache without rerunning modules.
window.addEventListener("pageshow", renderProgress);
renderProgress();
