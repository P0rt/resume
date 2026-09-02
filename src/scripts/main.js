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
  themeColors.forEach((meta) => meta.setAttribute("content", current === "dark" ? "#131416" : "#f7f7f4"));
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
