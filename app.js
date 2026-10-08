const dialog = document.querySelector(".journey-dialog");
const title = document.querySelector("#panel-title");
const description = document.querySelector("#panel-description");
const note = document.querySelector(".panel-note");

const panels = {
  learn: {
    title: "Learn with Purpose",
    description: "Build real English skills through meaningful and familiar contexts.",
    note: "Discover English through the places, people and everyday life around you.",
  },
  explore: {
    title: "Learn by Exploring",
    description: "Discover people, culture and places that make your community unique.",
    note: "Connect with your place and see your local world through English.",
  },
  practice: {
    title: "Practice your English",
    description: "Use what you learn in familiar, everyday situations.",
    note: "Bring English into your local world, one conversation at a time.",
  },
  badges: {
    title: "Your badges",
    description: "Your English journey starts here.",
    note: "Learning activities and badge tracking will be available when the courses are added.",
  },
};

document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = panels[button.dataset.panel];
    title.textContent = panel.title;
    description.textContent = panel.description;
    note.textContent = panel.note;
    dialog.showModal();
  });
});

dialog.addEventListener("click", (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left || event.clientX > bounds.right ||
    event.clientY < bounds.top || event.clientY > bounds.bottom
  ) {
    dialog.close();
  }
});
