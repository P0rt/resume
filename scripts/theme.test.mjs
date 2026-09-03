import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../src/scripts/main.js", import.meta.url), "utf8");

function setup({ dark = false, reducedMotion = false } = {}) {
  const handlers = {};
  const meta = { setAttribute(name, value) { this[name] = value; } };
  const system = { matches: dark, addEventListener(name, callback) { handlers.system = callback; } };
  const revealed = new Set();
  const revealItem = { classList: { add: (name) => revealed.add(name) } };
  vm.runInNewContext(script, {
    document: {
      querySelectorAll(selector) {
        if (selector === "[data-theme-color]") return [meta];
        if (selector === "[data-reveal]") return [revealItem];
        return [];
      },
    },
    window: {
      matchMedia: (query) => query.includes("color-scheme") ? system : { matches: reducedMotion },
    },
    localStorage: {
      getItem() { throw new Error("Theme must not read stored overrides"); },
      setItem() { throw new Error("Theme must not persist overrides"); },
    },
  });
  return { meta, revealed, systemChange(value) { system.matches = value; handlers.system(); } };
}

test("theme color uses the browser preference without controls or storage", () => {
  for (const dark of [false, true]) {
    assert.equal(setup({ dark }).meta.content, dark ? "#131416" : "#f7f7f4");
  }
  assert.ok(!/localStorage|data-theme-toggle|dataset\.theme/.test(script));
});

test("theme color follows live operating system changes in both directions", () => {
  const page = setup();
  page.systemChange(true);
  assert.equal(page.meta.content, "#131416");
  page.systemChange(false);
  assert.equal(page.meta.content, "#f7f7f4");
});

test("CSS honors the system theme even without JavaScript or with a stale theme attribute", async () => {
  const styles = await readFile(new URL("../src/styles/index.css", import.meta.url), "utf8");
  assert.match(styles, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{/);
  assert.ok(!/\[data-theme|\.theme-toggle|\.theme-thumb/.test(styles));
});

test("content stays visible with reduced motion or without IntersectionObserver", () => {
  for (const reducedMotion of [false, true]) assert.ok(setup({ reducedMotion }).revealed.has("is-visible"));
});
