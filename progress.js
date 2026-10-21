const KEY = "localingo.progress.v1";
export const unitIds = ["my-new-school", "my-house", "my-friends", "my-neighbourhood"];
export const unitLessons = {
  "my-house": ["vocabulary", "pronunciation", "grammar-magic", "grammar-tidy", "reading-hunt", "reading-home", "listening", "writing", "speaking"],
};
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
  catch { document.querySelectorAll("[data-storage-note]").forEach(el => { el.textContent = "Tiến độ chỉ được giữ trong phiên này vì trình duyệt đang chặn lưu trữ."; }); }
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
}
window.addEventListener("storage", renderProgress);
window.addEventListener("localingo-progress", renderProgress);
renderProgress();
