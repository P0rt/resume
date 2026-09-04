const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealItems = document.querySelectorAll("[data-reveal]");
if (!revealItems.length) {
  // Static pages do not need an observer.
} else if (reduceMotion || !("IntersectionObserver" in window)) {
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

async function copyText(text, button) {
  button.disabled = true;
  let message;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
    message = "Copied to clipboard.";
  } catch (error) {
    button.textContent = "Copy failed";
    message = "Could not copy. Select the text and copy it manually.";
  }
  document.querySelectorAll(".copy-status").forEach((status) => { status.textContent = message; });
  window.setTimeout(() => {
    button.textContent = button.dataset.label || "Copy";
    button.disabled = false;
    document.querySelectorAll(".copy-status").forEach((status) => { status.textContent = ""; });
  }, 1600);
}

document.querySelectorAll("[data-copy-url]").forEach((button) => {
  button.dataset.label = button.textContent;
  button.hidden = false;
  button.addEventListener("click", () => copyText(window.location.href, button));
});

document.querySelectorAll("[data-copy-code]").forEach((button) => {
  const code = button.closest(".code-block").querySelector("pre code");
  button.dataset.label = "Copy code";
  button.hidden = false;
  button.addEventListener("click", () => copyText(code.textContent, button));
});
