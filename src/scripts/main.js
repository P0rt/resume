const root = document.documentElement;
const themeButton = document.querySelector("[data-theme-toggle]");
const themeLabel = document.querySelector("[data-theme-label]");
const themeColors = document.querySelectorAll("[data-theme-color]");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function storedTheme() {
  try {
    return localStorage.getItem("theme");
  } catch (error) {
    return null;
  }
}

function activeTheme() {
  return root.dataset.theme || (systemTheme.matches ? "dark" : "light");
}

function updateThemeControl() {
  const current = activeTheme();
  const next = current === "dark" ? "Light" : "Dark";
  themeColors.forEach((meta) => meta.setAttribute("content", current === "dark" ? "#111317" : "#f5f5f2"));
  if (themeLabel) themeLabel.textContent = next;
  themeButton?.setAttribute("aria-label", `Use ${next.toLowerCase()} theme`);
}

themeButton?.addEventListener("click", () => {
  const next = activeTheme() === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch (error) {
    root.dataset.theme = next;
  }
  updateThemeControl();
});

systemTheme.addEventListener("change", () => {
  if (!storedTheme()) updateThemeControl();
});

updateThemeControl();

const revealItems = document.querySelectorAll("[data-reveal]");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12%", threshold: 0.08 });
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

  const showWords = () => {
    element.querySelectorAll(".tagline-word").forEach((word, index) => {
      window.setTimeout(() => word.classList.add("is-visible"), reduceMotion ? 0 : index * 48);
    });
  };

  if (reduceMotion || !("IntersectionObserver" in window)) {
    showWords();
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      showWords();
      observer.disconnect();
    }, { threshold: 0.28 });
    observer.observe(element);
  }
});

const practiceContent = {
  model: {
    kicker: "Build the capability",
    title: "Models need a clear job.",
    copy: "I work on evaluation, distillation, agents, and retrieval with the product boundary in view from the start.",
  },
  pipeline: {
    kicker: "Make it observable",
    title: "A demo is not a system.",
    copy: "I design evaluation, infrastructure, and feedback loops that keep AI behavior legible after launch.",
  },
  product: {
    kicker: "Close the loop",
    title: "Useful beats impressive.",
    copy: "I connect technical choices to user behavior, educational outcomes, and the metric the team owns.",
  },
};

const practice = document.querySelector("[data-practice]");
if (practice) {
  const tabs = Array.from(practice.querySelectorAll("[data-practice-tab]"));
  const kicker = practice.querySelector("[data-practice-kicker]");
  const title = practice.querySelector("[data-practice-title]");
  const copy = practice.querySelector("[data-practice-copy]");
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
    panel.setAttribute("aria-labelledby", tab.id);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectPractice(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      next.focus();
      selectPractice(next);
    });
  });
}

const experienceItems = document.querySelectorAll(".experience-item");
experienceItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    experienceItems.forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch (error) {
    button.textContent = "Copy failed";
  }
  window.setTimeout(() => { button.textContent = button.dataset.label || "Copy"; }, 1600);
}

document.querySelectorAll("[data-copy-url]").forEach((button) => {
  button.dataset.label = button.textContent;
  button.addEventListener("click", () => copyText(window.location.href, button));
});

document.querySelectorAll("[data-article-body] pre").forEach((pre) => {
  const wrapper = document.createElement("div");
  const button = document.createElement("button");
  wrapper.className = "code-block";
  button.className = "code-copy";
  button.type = "button";
  button.textContent = "Copy code";
  button.dataset.label = "Copy code";
  pre.replaceWith(wrapper);
  wrapper.append(button, pre);
  button.addEventListener("click", () => copyText(pre.textContent, button));
});
