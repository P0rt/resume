// Run against the actual deployment after Vercel is Ready. Unit tests cannot
// exercise its compiled middleware or prove that browser navigation keeps locale.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { DOMAIN, localeCodes, locales } from "./site-metadata.mjs";

const origin = new URL(process.argv[2] || DOMAIN).origin;
const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
function get(url, language) {
  // curl uses the same network settings as deployment checks on developer hosts.
  const output = execFileSync("curl", ["--silent", "--show-error", "--fail-with-body", "--location", "--max-redirs", "3", "--max-time", "30", "--header", `Accept-Language: ${language}`, "--write-out", "\n%{url_effective}\n%{http_code}", String(url)], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  const lines = output.split("\n");
  assert.equal(lines.pop(), "200", String(url));
  return { url: new URL(lines.pop()), html: lines.join("\n") };
}
function checkPage(result, code, pathname, description) {
  assert.equal(result.url.pathname, pathname);
  assert.ok(result.html.includes(`<html lang="${locales[code].htmlLang}">`), `${pathname}: HTML language`);
  assert.ok(result.html.includes(escapeHtml(description)), `${pathname}: translated content`);
}

for (const code of localeCodes) {
  const prefix = code === "en" ? "/" : `/${code}/`;
  // Explicit locale URLs must win even if the browser requests English.
  const home = get(`${origin}${prefix}`, "en-US,en;q=0.9");
  checkPage(home, code, prefix, locales[code].profile.intro);
  const workHref = home.html.match(/<a class="home-link" href="([^"]+)">/)?.[1];
  assert.ok(workHref, `${prefix}: visible experience link`);
  const work = get(new URL(workHref, home.url), "en-US,en;q=0.9");
  checkPage(work, code, `${prefix}work-together/`, locales[code].profile.collaboration.description);
  const homeHref = work.html.match(/<a class="page-link" href="([^"]+)">/)?.[1];
  assert.ok(homeHref, `${prefix}: visible return link`);
  const back = get(new URL(homeHref, work.url), "en-US,en;q=0.9");
  checkPage(back, code, prefix, locales[code].profile.intro);
  for (const entry of ["/", "/work-together/"]) {
    const result = get(`${origin}${entry}?from=locale-smoke`, code);
    checkPage(result, code, entry === "/" ? prefix : `${prefix}work-together/`, entry === "/" ? locales[code].profile.intro : locales[code].profile.collaboration.description);
    assert.equal(result.url.searchParams.get("from"), "locale-smoke");
  }
  console.log(`${code}: home → work → home preserves language; both entry redirects pass`);
}
console.log(`Deployed locale smoke passed: ${origin}`);
