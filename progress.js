const KEY = "localingo.progress.v1";
let memory = { speaking: [], explore: {} };
export function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || JSON.stringify(memory));
    memory = { speaking: Array.isArray(saved.speaking) ? [...new Set(saved.speaking.filter(id => /^house-[1-5]$/.test(id)))] : [], explore: saved.explore && typeof saved.explore === "object" && !Array.isArray(saved.explore) ? saved.explore : {} };
  } catch {}
  return structuredClone(memory);
}
export function saveProgress(update) {
  const state = readProgress();
  update(state);
  memory = state;
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { document.querySelectorAll("[data-storage-note]").forEach(el => { el.textContent = "Tiến độ chỉ được giữ trong phiên này vì trình duyệt đang chặn lưu trữ."; }); }
  window.dispatchEvent(new Event("localingo-progress"));
  return state;
}
export function renderProgress() {
  const count = readProgress().speaking.length;
  document.querySelectorAll("[data-speaking-progress]").forEach(el => { el.value = count; el.max = 5; });
  document.querySelectorAll("[data-speaking-count]").forEach(el => { el.textContent = `${count}/5 speaking missions completed`; });
  document.querySelectorAll("[data-badge-status]").forEach(el => { el.textContent = count === 5 ? "🏅 Storyteller — completed!" : "Complete all 5 speaking missions to earn your Storyteller badge."; });
}
window.addEventListener("storage", renderProgress);
window.addEventListener("localingo-progress", renderProgress);
renderProgress();
