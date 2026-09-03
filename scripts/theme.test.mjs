import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../src/scripts/main.js", import.meta.url), "utf8");

function setup({ saved = null, dark = false, storageBlocked = false, hasControl = true, reducedMotion = false } = {}) {
  const root = { dataset: {} };
  // Mirrors the existing inline initialization before the stylesheet renders.
  if (!storageBlocked && ["light", "dark"].includes(saved)) root.dataset.theme = saved;
  const handlers = {};
  const button = {
    hidden: true,
    attributes: { "aria-label": "Dark theme" },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { handlers[name] = callback; },
  };
  const meta = { setAttribute(name, value) { this[name] = value; } };
  const system = { matches: dark, addEventListener(name, callback) { handlers.system = callback; } };
  const revealed = new Set();
  const revealItem = { classList: { add: (name) => revealed.add(name) } };
  const storage = {
    getItem() {
      if (storageBlocked) throw new Error("Storage unavailable");
      return saved;
    },
    setItem(key, value) {
      if (storageBlocked) throw new Error("Storage unavailable");
      saved = value;
    },
  };
  vm.runInNewContext(script, {
    document: {
      documentElement: root,
      querySelector: () => hasControl ? button : null,
      querySelectorAll: (selector) => {
        if (selector === "[data-theme-color]") return [meta];
        if (selector === "[data-reveal]") return [revealItem];
        return [];
      },
    },
    window: {
      matchMedia: (query) => query.includes("color-scheme") ? system : { matches: reducedMotion },
      addEventListener(name, callback) { handlers[name] = callback; },
    },
    localStorage: storage,
  });
  return {
    root, button, meta, revealed,
    saved: () => saved,
    click: () => handlers.click(),
    systemChange(value) { system.matches = value; handlers.system(); },
    storageChange(value, key = "theme") { saved = value; handlers.storage({ key }); },
  };
}

test("theme switch reflects the system preference on first visit", () => {
  for (const dark of [false, true]) {
    const page = setup({ dark });
    assert.equal(page.button.hidden, false);
    assert.equal(page.button.attributes["aria-checked"], String(dark));
    assert.equal(page.meta.content, dark ? "#131416" : "#f7f7f4");
  }
});

test("toggling both ways updates theme, persistence and checked state with a stable label", () => {
  const page = setup();
  for (const expected of ["dark", "light"]) {
    page.click();
    assert.equal(page.root.dataset.theme, expected);
    assert.equal(page.saved(), expected);
    assert.equal(page.button.attributes["aria-checked"], String(expected === "dark"));
    assert.equal(page.button.attributes["aria-label"], "Dark theme");
  }
});

test("a saved preference is restored on another page and overrides system changes", () => {
  for (const saved of ["light", "dark"]) {
    const page = setup({ saved, dark: saved !== "dark" });
    page.systemChange(saved !== "dark");
    assert.equal(page.root.dataset.theme, saved);
    assert.equal(page.button.attributes["aria-checked"], String(saved === "dark"));
  }
});

test("without a saved preference the switch follows system changes", () => {
  const page = setup({ saved: "invalid" });
  page.systemChange(true);
  assert.equal(page.button.attributes["aria-checked"], "true");
  page.systemChange(false);
  assert.equal(page.button.attributes["aria-checked"], "false");
});

test("blocked storage does not break switching", () => {
  const page = setup({ storageBlocked: true });
  page.click();
  assert.equal(page.root.dataset.theme, "dark");
  assert.equal(page.button.attributes["aria-checked"], "true");
  page.click();
  assert.equal(page.root.dataset.theme, "light");
});

test("theme stays in sync when another tab updates or clears the preference", () => {
  const page = setup({ saved: "light" });
  page.storageChange("dark");
  assert.equal(page.root.dataset.theme, "dark");
  assert.equal(page.button.attributes["aria-checked"], "true");
  page.storageChange(null, null);
  assert.equal(page.root.dataset.theme, undefined);
  assert.equal(page.button.attributes["aria-checked"], "false");
});

test("pages without a switch still initialize normally", () => {
  assert.doesNotThrow(() => setup({ hasControl: false }));
});

test("content stays visible with reduced motion or without IntersectionObserver", () => {
  for (const reducedMotion of [false, true]) {
    assert.ok(setup({ reducedMotion }).revealed.has("is-visible"));
  }
});
