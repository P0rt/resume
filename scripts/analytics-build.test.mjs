import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import test from "node:test";
import { decorateAnalytics } from "./build-analytics.mjs";

const built = (relative) => readFile(new URL(`../dist/${relative}`, import.meta.url), "utf8");
const anchors = (html) => html.match(/<a\b[^>]*>/g) || [];
const eventAnchors = (html, event) => anchors(html).filter((tag) => tag.includes(`data-analytics-event="${event}"`));
const document = (body, lang = "en") => `<!doctype html><html lang="${lang}"><head></head><body>${body}</body></html>`;

test("all localized profile pages have stable content identity and the intended contact placements", async () => {
  for (const locale of ["en", "es", "fr", "pt", "ja", "zh", "ru"]) {
    const prefix = locale === "en" ? "" : `${locale}/`;
    for (const [file, pageType, placement, profileCount] of [["index.html", "home", "home_footer", 3], ["work-together/index.html", "work_together", "work_primary", 2]]) {
      const html = await built(`${prefix}${file}`);
      assert.ok(html.includes(`data-analytics-page-type="${pageType}"`));
      assert.ok(html.includes(`data-analytics-content-key="${pageType}"`));
      assert.ok(html.includes(`data-analytics-locale="${locale}"`));
      assert.doesNotMatch(html, /data-analytics-article-slug/);
      const contacts = eventAnchors(html, "contact_clicked");
      assert.equal(contacts.length, 1, `${locale} ${pageType} contact target`);
      assert.match(contacts[0], /href="mailto:/);
      assert.ok(contacts[0].includes(`data-analytics-placement="${placement}"`));
      assert.equal(eventAnchors(html, "profile_clicked").length, profileCount);
      assert.equal((html.match(/src="\/scripts\/analytics\.js"/g) || []).length, 1);
    }
  }
});

test("archive tracks its visible RSS and profile links, and utility pages have no conversion targets", async () => {
  const blog = await built("blog.html");
  assert.match(blog, /data-analytics-page-type="blog_index"/);
  assert.equal(eventAnchors(blog, "rss_clicked").length, 1);
  assert.equal(eventAnchors(blog, "support_clicked").length, 1);
  assert.match(eventAnchors(blog, "support_clicked")[0], /data-analytics-placement="blog_tools"/);
  assert.match(blog, /data-analytics-support-available="true"/);
  assert.match(eventAnchors(blog, "rss_clicked")[0], /data-analytics-feed-id="main"/);
  const profiles = eventAnchors(blog, "profile_clicked");
  assert.equal(profiles.length, 3);
  assert.equal(profiles.filter((tag) => tag.includes('data-analytics-placement="blog_tools"')).length, 1);
  assert.equal(profiles.filter((tag) => tag.includes('data-analytics-placement="blog_footer"')).length, 2);
  for (const [file, pageType] of [["privacy.html", "privacy"], ["404.html", "not_found"]]) {
    const html = await built(file);
    assert.ok(html.includes(`data-analytics-content-key="${pageType}"`));
    assert.doesNotMatch(html, /data-analytics-event=/);
  }
});

test("every published article has identity, but only the two actual companion downloads are conversions", async () => {
  const articles = await readdir(new URL("../dist/blog/", import.meta.url), { withFileTypes: true });
  const downloads = [];
  for (const entry of articles.filter((entry) => entry.isDirectory())) {
    const html = await built(`blog/${entry.name}/index.html`);
    assert.ok(html.includes(`data-analytics-content-key="article:${entry.name}"`));
    assert.ok(html.includes(`data-analytics-article-slug="${entry.name}"`));
    assert.match(html, /data-analytics-page-type="article"/);
    const support = eventAnchors(html, "support_clicked");
    assert.equal(support.length, 1);
    assert.match(support[0], /href="https:\/\/ko-fi.com\/sergeiparfenov\?ref=site"/);
    assert.match(support[0], /data-analytics-placement="article_footer"/);
    assert.match(support[0], /data-analytics-provider="ko-fi"/);
    assert.match(html, /data-analytics-support-available="true"/);
    assert.ok(html.indexOf('class="article-support"') > html.indexOf('class="article-footer section-shell"'), "Support remains outside measured article body");
    assert.equal(eventAnchors(html, "profile_clicked").length, 0, "Article citations are not profile clicks");
    downloads.push(...eventAnchors(html, "download_clicked"));
  }
  assert.equal(downloads.length, 2);
  for (const id of ["agent-memory-probe", "ai-test-demo"]) {
    const link = downloads.find((tag) => tag.includes(`data-analytics-asset-id="${id}"`));
    assert.ok(link);
    assert.match(link, /data-analytics-placement="article_body"/);
    assert.match(link, /data-analytics-file-type="zip"/);
  }
});

test("decoration ignores article references, unrelated profiles, external assets, scripts and comments", () => {
  const html = document(`
    <link rel="alternate" href="/rss.xml">
    <p><a href="https://dev.to/p0rt">Author citation</a></p>
    <!-- <footer class="site-footer"><a href="https://github.com/P0rt">Example</a></footer> -->
    <script>const example = '<footer class="site-footer"><a href="https://github.com/P0rt">Example</a></footer>';</script>
    <footer class="site-footer">
      <a href="https://github.com/P0rt/">Profile</a>
      <a href="https://github.com/P0rt/project">Repository</a>
      <a href="https://github.com/someone">Someone else</a>
      <a href="https://dev.to/p0rt/article">DEV article</a>
      <a href="https://www.linkedin.com/in/sergei-parfenov/">Different LinkedIn profile</a>
      <a href="https://github.com.evil.example/P0rt">Lookalike domain</a>
    </footer>`);
  const result = decorateAnalytics(html, { pageType: "home" });
  assert.equal(eventAnchors(result, "profile_clicked").length, 1);
  assert.match(eventAnchors(result, "profile_clicked")[0], /href="https:\/\/github.com\/P0rt\/"/);
  assert.equal(decorateAnalytics(result, { pageType: "home" }), result, "Repeated decoration must not duplicate metadata or the script");

  const article = decorateAnalytics(document(`<div data-article-body><div><p><a href="/assets/downloads/agent-memory-probe.zip">Companion</a></p></div><a href="https://another.example/assets/downloads/ai-test-demo.zip">Other host</a></div><a href="/assets/downloads/ai-test-demo.zip">Outside body</a>`), { pageType: "article", slug: "an-article" });
  assert.equal(eventAnchors(article, "download_clicked").length, 1);
});

test("metadata normalizes declared HTML language, escapes values, and rejects broken article identity", () => {
  const html = decorateAnalytics(document("<p>Content</p>", "pt-BR"), { pageType: "home", locale: "en" });
  assert.match(html, /data-analytics-locale="pt"/);
  assert.throws(() => decorateAnalytics(document(""), { pageType: "article", slug: "broken/slug" }), /valid slug/);
  assert.throws(() => decorateAnalytics(document(""), { pageType: "new-unmapped-page" }), /Unknown analytics page type/);
  assert.throws(() => decorateAnalytics("<p>Fragment</p>", { pageType: "home" }), /complete HTML/);
});

test("analytics ships as a small local loader and a lazy hashed SDK bundle without source maps", async () => {
  const scriptFiles = await readdir(new URL("../dist/scripts/", import.meta.url));
  const loader = await built("scripts/analytics.js");
  assert.doesNotMatch(loader, /__POSTHOG_PUBLIC_KEY__|from\s*["']posthog-js|import\(["']posthog-js/);
  assert.match(loader, /phc_/);
  assert.match(loader, /import\("\.\/analytics-[^"]+-[A-Z0-9]+\.js"\)/);
  assert.ok(gzipSync(loader).length < 5_000, "Initial analytics loader must stay below 5 kB gzip");
  const chunks = scriptFiles.filter((file) => /^analytics-.+-[A-Z0-9]+\.js$/.test(file));
  assert.ok(chunks.length > 0, "The SDK must be split out of the initial loader");
  const sdkBytes = await Promise.all(chunks.map(async (file) => gzipSync(await built(`scripts/${file}`)).length));
  assert.ok(sdkBytes.reduce((sum, bytes) => sum + bytes, 0) < 75_000, "Lazy analytics bundle must stay below 75 kB gzip");
  assert.equal(scriptFiles.filter((file) => file.endsWith(".map")).length, 0);
});
