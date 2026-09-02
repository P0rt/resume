const profileLinks = {
  spotify: "",
};

const root = document.documentElement;
const themeButton = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const themeColors = document.querySelectorAll("[data-theme-color]");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

function savedTheme() {
  try {
    return localStorage.getItem("theme");
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch (error) {
    return;
  }
}

function activeTheme() {
  return root.dataset.theme || (systemTheme.matches ? "dark" : "light");
}

function updateThemeControl() {
  const currentTheme = activeTheme();
  themeColors.forEach((meta) => {
    meta.setAttribute("content", currentTheme === "dark" ? "#181818" : "#f4f7fb");
  });
  if (!themeButton || !themeLabel) return;
  const nextTheme = currentTheme === "dark" ? "Light" : "Dark";
  themeLabel.textContent = nextTheme;
  themeButton.setAttribute("aria-label", `Use ${nextTheme.toLowerCase()} theme`);
}

themeButton?.addEventListener("click", () => {
  const nextTheme = activeTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  saveTheme(nextTheme);
  updateThemeControl();
});

systemTheme.addEventListener("change", () => {
  if (!savedTheme()) updateThemeControl();
});

updateThemeControl();

const revealItems = document.querySelectorAll("[data-reveal]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12%", threshold: 0.12 });

  revealItems.forEach((item) => revealObserver.observe(item));
}

document.querySelectorAll("[data-word-reveal]").forEach((element) => {
  const words = element.textContent.trim().split(/\s+/);
  element.textContent = "";

  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "tagline-word";
    span.textContent = word;
    element.append(span);
    if (index < words.length - 1) element.append(" ");
  });

  const revealWords = () => {
    element.querySelectorAll(".tagline-word").forEach((word, index) => {
      window.setTimeout(() => word.classList.add("is-visible"), reduceMotion ? 0 : index * 52);
    });
  };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealWords();
    return;
  }

  const wordObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    revealWords();
    observer.disconnect();
  }, { rootMargin: "0px 0px -28%", threshold: 0.3 });

  wordObserver.observe(element);
});

const practiceContent = {
  model: {
    kicker: "Build the capability",
    title: "Models need a clear job.",
    copy: "I work on evaluation, distillation, agents, and retrieval with the product boundary in view from the start.",
    index: "01",
  },
  pipeline: {
    kicker: "Make it observable",
    title: "A demo is not a system.",
    copy: "I design the evaluation, infrastructure, and feedback loops that keep AI behavior legible after launch.",
    index: "02",
  },
  product: {
    kicker: "Close the loop",
    title: "Useful beats impressive.",
    copy: "I connect technical choices to user behavior, educational outcomes, and the metric the team is responsible for.",
    index: "03",
  },
};

const practice = document.querySelector("[data-practice]");

if (practice) {
  const tabs = Array.from(practice.querySelectorAll("[data-practice-tab]"));
  const kicker = practice.querySelector("[data-practice-kicker]");
  const title = practice.querySelector("[data-practice-title]");
  const copy = practice.querySelector("[data-practice-copy]");
  const index = practice.querySelector("[data-practice-index]");
  const panel = practice.querySelector("[role='tabpanel']");

  function selectPractice(tab) {
    const content = practiceContent[tab.dataset.practiceTab];
    if (!content) return;

    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });

    kicker.textContent = content.kicker;
    title.textContent = content.title;
    copy.textContent = content.copy;
    index.textContent = content.index;
    panel.setAttribute("aria-labelledby", tab.id);

    const url = new URL(window.location.href);
    url.searchParams.set("practice", tab.dataset.practiceTab);
    window.history.replaceState({}, "", url);
  }

  const initialPractice = new URLSearchParams(window.location.search).get("practice");
  const initialTab = tabs.find((tab) => tab.dataset.practiceTab === initialPractice);
  if (initialTab) selectPractice(initialTab);

  tabs.forEach((tab, tabIndex) => {
    tab.addEventListener("click", () => selectPractice(tab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (tabIndex + direction + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      selectPractice(tabs[nextIndex]);
    });
  });
}

const experienceItems = document.querySelectorAll(".experience-item");
experienceItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    experienceItems.forEach((otherItem) => {
      if (otherItem !== item) otherItem.open = false;
    });
  });
});

const spotifyLink = document.querySelector("[data-spotify-link]");
if (spotifyLink && profileLinks.spotify) {
  spotifyLink.href = profileLinks.spotify;
  spotifyLink.hidden = false;
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
