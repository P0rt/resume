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

test("the portrait follows the system theme with native picture sources and matching preloads", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const portrait = html.match(/<figure class="home-portrait">([\s\S]*?)<\/figure>/)?.[1];
  assert.ok(portrait?.includes("<picture>"));
  assert.match(portrait, /<source srcset="\.\/assets\/portrait-blue\.jpg" media="\(prefers-color-scheme: dark\)"/);
  assert.match(portrait, /<img src="\.\/assets\/portrait-light\.webp" alt="Portrait of Sergei Parfenov"/);
  assert.equal((portrait.match(/<img\s/g) || []).length, 1);
  for (const [file, theme] of [["portrait-blue.jpg", "dark"], ["portrait-light.webp", "light"]]) {
    assert.ok(html.includes(`<link rel="preload" href="./assets/${file}" as="image" media="(prefers-color-scheme: ${theme})"`));
    assert.ok((await readFile(new URL(`../dist/assets/${file}`, import.meta.url))).length > 0);
  }
  assert.ok(html.includes('<meta property="og:image" content="https://sergei-parfenov.com/assets/portrait-blue.jpg">'));
});

test("content stays visible with reduced motion or without IntersectionObserver", () => {
  for (const reducedMotion of [false, true]) assert.ok(setup({ reducedMotion }).revealed.has("is-visible"));
});
