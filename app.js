import { readProgress } from "./progress.js";
const dialog = document.querySelector(".journey-dialog");
const panels = {
  "nature-wildlife": ["Nature & Wildlife", "Discover the natural wonders"],
  "local-food": ["Local Food", "Taste the local culture"],
  "people-tradition": ["People & Tradition", "Meet local communities."],
  "festivals-seasons": ["Festivals & Seasons", "Explore seasonal traditions."],
  "coming-soon": ["Coming soon", "Start Unit 2 · My House to meet BanBan and try the speaking missions."],
  badges: ["Your badges", "Complete the five My House speaking missions to earn your Storyteller badge."]
};
document.querySelectorAll("[data-panel]").forEach(button => {
  button.addEventListener("click", () => {
    const panel = panels[button.dataset.panel];
    if (!panel || !dialog) return;
    document.querySelector("#panel-title").textContent = panel[0];
    document.querySelector("#panel-description").textContent = panel[1];
    const count = readProgress().speaking.length;
    document.querySelector(".panel-note").textContent = button.dataset.panel === "badges" ? (count === 5 ? "🏅 Storyteller — completed!" : `${count}/5 speaking missions completed. Your progress is saved on this browser.`) : "Discover the land, people and culture of Mộc Châu, Sơn La.";
    dialog.showModal();
  });
});
dialog?.addEventListener("click", event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
