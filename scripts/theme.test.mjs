import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const script = await readFile(new URL("../src/scripts/main.js", import.meta.url), "utf8");

function setup({ reducedMotion = false } = {}) {
  const revealed = new Set();
  const revealItem = { classList: { add: (name) => revealed.add(name) } };
  vm.runInNewContext(script, {
    document: {
      querySelectorAll(selector) {
        if (selector === "[data-reveal]") return [revealItem];
        return [];
      },
    },
    window: {
      matchMedia: () => ({ matches: reducedMotion }),
    },
    localStorage: {
      getItem() { throw new Error("Theme must not read stored overrides"); },
      setItem() { throw new Error("Theme must not persist overrides"); },
    },
  });
  return { revealed };
}

test("theme color is selected natively from the browser preference", async () => {
  for (const path of [
    "../dist/index.html",
    "../dist/work-together/index.html",
    "../dist/blog.html",
    "../dist/privacy.html",
    "../dist/404.html",
  ]) {
    const html = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(html, /<meta name="theme-color" content="#f7f7f4" media="\(prefers-color-scheme: light\)">/);
    assert.match(html, /<meta name="theme-color" content="#131416" media="\(prefers-color-scheme: dark\)">/);
    assert.doesNotMatch(html, /data-theme-color/);
  }
  assert.ok(!/prefers-color-scheme|localStorage|data-theme-toggle|dataset\.theme/.test(script));
});

test("the homepage and static profile pages ship without executable JavaScript", async () => {
  for (const path of ["../dist/index.html", "../dist/work-together/index.html", "../dist/privacy.html", "../dist/404.html"]) {
    const html = await readFile(new URL(path, import.meta.url), "utf8");
    const withoutStructuredData = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
    assert.doesNotMatch(withoutStructuredData, /<script\b/);
    assert.doesNotMatch(html, /data-current-year/);
  }
});

test("CSS honors the system theme even without JavaScript or with a stale theme attribute", async () => {
  const styles = await readFile(new URL("../src/styles/index.css", import.meta.url), "utf8");
  assert.match(styles, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{/);
  assert.ok(!/\[data-theme|\.theme-toggle|\.theme-thumb/.test(styles));
});

test("Manrope is available with the first stylesheet without a second font request", async () => {
  const styles = await readFile(new URL("../src/styles/index.css", import.meta.url), "utf8");
  assert.match(styles, /@font-face\s*\{[\s\S]*?font-family:\s*"Manrope";[\s\S]*?manrope-latin\.woff2/);
  assert.match(styles, /body\s*\{[\s\S]*?font-family:\s*"Manrope",\s*"Manrope Fallback",\s*sans-serif;/);

  const builtStyles = await readFile(new URL("../dist/styles/index.css", import.meta.url), "utf8");
  const bundledFont = builtStyles.match(/url\("data:font\/woff2;base64,([A-Za-z0-9+/=]+)"\)/)?.[1];
  assert.ok(bundledFont, "The shared CSS must contain the body font before first paint");
  assert.deepEqual(Buffer.from(bundledFont, "base64"), await readFile(new URL("../src/assets/fonts/manrope-latin.woff2", import.meta.url)));
  assert.doesNotMatch(builtStyles, /url\([^)]*manrope-latin\.woff2/);
  assert.match(builtStyles, /@font-face\s*\{[^}]*font-display:\s*block;/);

  for (const path of [
    "../src/index.html",
    "../src/work-together/index.html",
    "../src/blog.html",
    "../scripts/build-site.mjs",
  ]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /<link\s+rel="preload"[^>]+manrope-latin\.woff2/);
  }
});

test("the portrait follows the system theme with native picture sources and matching preloads", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const portrait = html.match(/<figure class="home-portrait">([\s\S]*?)<\/figure>/)?.[1];
  assert.ok(portrait?.includes("<picture>"));
  assert.match(portrait, /<source srcset="\/assets\/optimized\/portrait-blue-[^"]+" sizes="[^"]+" media="\(prefers-color-scheme: dark\)"/);
  assert.match(portrait, /<img src="\/assets\/optimized\/portrait-light-[^"]+"[^>]+alt="Portrait of Sergei Parfenov"/);
  assert.equal((portrait.match(/<img\s/g) || []).length, 1);
  for (const [file, theme] of [["portrait-blue.jpg", "dark"], ["portrait-light.webp", "light"]]) {
    const preload = [...html.matchAll(/<link rel="preload"[^>]+as="image"[^>]*>/g)].map((match) => match[0]).find((tag) => tag.includes(`prefers-color-scheme: ${theme}`));
    const source = theme === "dark" ? portrait.match(/<source[^>]+>/)[0] : portrait.match(/<img[^>]+>/)[0];
    assert.equal(preload.match(/imagesrcset="([^"]+)"/)[1], source.match(/srcset="([^"]+)"/)[1]);
    assert.equal(preload.match(/imagesizes="([^"]+)"/)[1], source.match(/sizes="([^"]+)"/)[1]);
    assert.ok(preload.includes('fetchpriority="high"'));
    assert.ok((await readFile(new URL(`../dist/assets/${file}`, import.meta.url))).length > 0);
  }
  assert.ok(html.includes('<meta property="og:image" content="https://sergei-parfenov.com/assets/portrait-blue.jpg">'));
});

test("content stays visible with reduced motion or without IntersectionObserver", () => {
  for (const reducedMotion of [false, true]) assert.ok(setup({ reducedMotion }).revealed.has("is-visible"));
});
