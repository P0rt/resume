import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { localeRedirect, localizedPath, normalizeLocale, preferredLocale } from "../lib/locale-routing.cjs";

test("locale routing loads in Vercel's CommonJS bundle as well as ESM consumers", () => {
  const require = createRequire(import.meta.url);
  const routing = require("../lib/locale-routing.cjs");
  const { next } = require("@vercel/functions");
  for (const header of ["", "en-US,en;q=0.9", "de-DE", "es-ES", "ru-RU"]) {
    const request = new Request("https://sergei-parfenov.com/?from=regression", {
      headers: { "Accept-Language": header },
    });
    const response = routing.localeRedirect(request) ?? next();
    assert.ok(response instanceof Response);
    if (header.startsWith("es") || header.startsWith("ru")) {
      assert.equal(response.status, 307);
      assert.equal(response.headers.get("location"), `https://sergei-parfenov.com/${header.slice(0, 2)}/?from=regression`);
    } else {
      assert.equal(response.headers.get("x-middleware-next"), "1");
      assert.equal(response.headers.get("location"), null);
    }
  }
});

test("normalizes the supported browser language families", () => {
  assert.equal(normalizeLocale("es-ES"), "es");
  assert.equal(normalizeLocale("pt-BR"), "pt");
  assert.equal(normalizeLocale("zh-Hans-CN"), "zh");
  assert.equal(normalizeLocale("ja-JP"), "ja");
  assert.equal(normalizeLocale("ru_RU"), "ru");
  assert.equal(normalizeLocale("de-DE"), "en");
});

test("honors Accept-Language quality and order", () => {
  assert.equal(preferredLocale("en-US,en;q=0.9,es;q=0.8"), "en");
  assert.equal(preferredLocale("de-DE;q=0.7,fr-FR;q=0.9,en;q=0.8"), "fr");
  assert.equal(preferredLocale("de-DE,fr-FR;q=0.9,en;q=0.8"), "fr");
  assert.equal(preferredLocale("zh-TW,ja;q=0.8"), "zh");
  assert.equal(preferredLocale("ru;q=0,pt-PT;q=0.7"), "pt");
  assert.equal(preferredLocale("*"), "en");
});

test("only localizes the two translated entry pages", () => {
  assert.equal(localizedPath("/", "es"), "/es/");
  assert.equal(localizedPath("/work-together/", "ja"), "/ja/work-together/");
  assert.equal(localizedPath("/blog.html", "fr"), "/blog.html");
  assert.equal(localizedPath("/", "en"), "/");
});

test("routing returns a temporary, private redirect and preserves the request URL", () => {
  const response = localeRedirect(new Request("https://sergei-parfenov.com/work-together/?from=test", { headers: { "Accept-Language": "es-ES,es;q=0.9" } }));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://sergei-parfenov.com/es/work-together/?from=test");
  assert.equal(response.headers.get("vary"), "Accept-Language");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(localeRedirect(new Request("https://sergei-parfenov.com/", { headers: { "Accept-Language": "en-US" } })), undefined);
});
