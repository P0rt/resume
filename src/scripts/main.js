const themeColors = document.querySelectorAll("[data-theme-color]");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function updateThemeColor() {
  themeColors.forEach((meta) => meta.setAttribute("content", systemTheme.matches ? "#131416" : "#f7f7f4"));
}

systemTheme.addEventListener("change", updateThemeColor);
updateThemeColor();

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
