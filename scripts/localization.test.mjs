import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DOMAIN, localeCodes, localeHomeUrl, locales, localeWorkUrl } from "./site-metadata.mjs";

const read = (file) => readFile(new URL(`../dist/${file}`, import.meta.url), "utf8");
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const filePrefix = (code) => code === "en" ? "" : `${code}/`;

test("home and work pages are complete static documents in every supported locale", async () => {
  for (const code of localeCodes) {
    const locale = locales[code];
    const home = await read(`${filePrefix(code)}index.html`);
    const work = await read(`${filePrefix(code)}work-together/index.html`);
    assert.ok(home.includes(`<html lang="${locale.htmlLang}">`));
    assert.ok(work.includes(`<html lang="${locale.htmlLang}">`));
    assert.ok(home.includes(`<link rel="canonical" href="${localeHomeUrl(code)}">`));
    assert.ok(work.includes(`<link rel="canonical" href="${localeWorkUrl(code)}">`));
    assert.ok(home.includes(`<title>${escapeHtml(locale.seo.homeTitle)}</title>`));
    assert.ok(work.includes(`<title>${escapeHtml(locale.seo.workTitle)}</title>`));
    assert.ok(home.includes(escapeHtml(locale.profile.intro)));
    assert.ok(work.includes(escapeHtml(locale.profile.about[0])));
    assert.ok(home.includes(`href="${code === "en" ? "/work-together/" : `/${code}/work-together/`}"`));
    assert.ok(work.includes(`href="${code === "en" ? "/" : `/${code}/`}">${escapeHtml(locale.profile.name)}</a>`));
    assert.equal((home.match(/rel="alternate" hreflang=/g) || []).length, localeCodes.length + 1);
    assert.equal((work.match(/rel="alternate" hreflang=/g) || []).length, localeCodes.length + 1);
    assert.ok(home.includes(`<link rel="alternate" hreflang="x-default" href="${localeHomeUrl("en")}">`));
    assert.ok(work.includes(`<link rel="alternate" hreflang="x-default" href="${localeWorkUrl("en")}">`));
    assert.ok(!home.includes(`/${code}/blog`));
    assert.ok(!work.includes(`/${code}/blog`));

    const homeGraph = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
    const workGraph = JSON.parse(work.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
    assert.equal(homeGraph.find((node) => node["@type"] === "ProfilePage").inLanguage, locale.htmlLang);
    assert.equal(homeGraph.find((node) => node["@type"] === "ProfilePage").url, localeHomeUrl(code));
    assert.equal(workGraph.find((node) => node["@type"] === "AboutPage").inLanguage, locale.htmlLang);
    assert.equal(workGraph.find((node) => node["@type"] === "AboutPage").url, localeWorkUrl(code));
  }
});

test("localized agent documents agree with their human-readable canonical pages", async () => {
  for (const code of localeCodes.slice(1)) {
    const bio = JSON.parse(await read(`${code}/profile.json`));
    const markdown = await read(`${code}/index.md`);
    assert.equal(bio.language, locales[code].htmlLang);
    assert.equal(bio.url, `${DOMAIN}/${code}/`);
    assert.equal(bio.workUrl, `${DOMAIN}/${code}/work-together/`);
    assert.equal(bio.description, locales[code].profile.description);
    assert.ok(markdown.includes(locales[code].profile.collaboration.description));
    assert.ok(markdown.includes(`${locales[code].markdown.canonicalProfile}: ${bio.url}`));
  }
  assert.equal(JSON.parse(await read("ru/profile.json")).name, "Сергей Парфенов");
});
