import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, mkdir, cp, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import matter from "gray-matter";

const read = (file) => readFile(new URL(`../dist/${file}`, import.meta.url), "utf8");
const graph = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
const origin = "https://sergei-parfenov.com";
const snapshot = JSON.parse(await readFile(new URL("../.generated/mcp-data.json", import.meta.url), "utf8"));

test("profile and articles share one author identity and indexable HTML metadata", async () => {
  const home = await read("index.html");
  const profile = graph(home).find((item) => item["@type"] === "ProfilePage").mainEntity;
  assert.equal(profile["@id"], `${origin}/#person`);
  assert.equal(profile.name, snapshot.profile.name);
  assert.ok(profile.alternateName.includes("Сергей Парфенов"));
  for (const article of snapshot.articles) {
    const html = await read(`blog/${article.id}/index.html`);
    const nodes = graph(html);
    const posting = nodes.find((item) => item["@type"] === "BlogPosting");
    assert.equal(posting.author["@id"], profile["@id"]);
    assert.equal(posting.mainEntityOfPage["@id"], article.url);
    assert.equal(posting.datePublished, article.datePublished);
    assert.equal(posting.dateModified, article.dateModified);
    assert.equal(nodes.find((item) => item["@type"] === "BreadcrumbList").itemListElement.at(-1).item, article.url);
    assert.ok(html.includes(`<link rel="canonical" href="${article.url}">`));
    assert.ok(html.includes('name="robots" content="index, follow'));
    assert.ok(html.includes(`type="text/markdown" href="${article.markdownUrl}"`));
    assert.ok(html.includes('href="/" rel="author">Sergei Parfenov</a>'));
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
  }
});

test("sitemap has only indexable canonical pages with genuine article dates", async () => {
  const sitemap = await read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(new Set(urls), new Set([`${origin}/`, `${origin}/blog.html`, ...snapshot.articles.map((article) => article.url)]));
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(!sitemap.includes("privacy.html"));
  assert.ok(!sitemap.includes("index.html"));
  assert.ok(sitemap.includes(`<url><loc>${origin}/</loc></url>`));
  const robots = await read("robots.txt");
  assert.ok(robots.includes("User-agent: *\nAllow: /"));
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
});

test("Markdown, JSON and MCP agree and preserve original article text", async () => {
  const catalog = JSON.parse(await read("articles.json"));
  assert.equal(catalog.articles.length, snapshot.articles.length);
  assert.equal(JSON.parse(await read("profile.json")).experience.length, 5);
  assert.equal(await read("index.md"), snapshot.profileMarkdown);
  for (const article of snapshot.articles) {
    const metadata = catalog.articles.find((item) => item.id === article.id);
    assert.equal(metadata.url, article.url);
    assert.equal(await read(`blog/${article.id}/index.md`), article.text);
  }
  const sourceDirectory = new URL("../content/articles/", import.meta.url);
  for (const name of await readdir(sourceDirectory)) {
    if (!name.endsWith(".md")) continue;
    const source = matter(await readFile(new URL(name, sourceDirectory), "utf8"));
    if (source.data.published === false) continue;
    const article = snapshot.articles.find((item) => item.id === source.data.slug);
    assert.ok(article.text.includes(source.content.trim()));
  }
  assert.ok((await read("llms.txt")).includes(`${origin}/mcp`));
});

test("404 assets and return links use absolute paths even for nested missing URLs", async () => {
  const page = await read("404.html");
  assert.ok(page.includes('href="/assets/favicon.ico"'));
  assert.ok(page.includes('href="/styles/index.css"'));
  assert.ok(page.includes('href="/"'));
});

test("drafts never reach HTML, Markdown, catalogs or the MCP bundle", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "resume-seo-test-"));
  try {
    await cp(new URL("../src/", import.meta.url), path.join(directory, "src"), { recursive: true });
    const content = path.join(directory, "content/articles");
    await mkdir(content, { recursive: true });
    await writeFile(path.join(content, "published.md"), '---\ntitle: Public article\nslug: public-article\ndescription: Public description\npublished: true\ndate: 2026-09-01\n---\n\nPublic content.\n');
    await writeFile(path.join(content, "draft.md"), '---\ntitle: Private draft\nslug: draft-article\npublished: false\n---\n\nDO-NOT-PUBLISH-THIS-DRAFT\n');
    await promisify(execFile)(process.execPath, [new URL("./build-site.mjs", import.meta.url).pathname], { cwd: directory });
    for (const file of ["dist/index.html", "dist/blog.html", "dist/articles.json", "dist/llms.txt", ".generated/mcp-data.json"]) {
      assert.ok(!(await readFile(path.join(directory, file), "utf8")).includes("DO-NOT-PUBLISH-THIS-DRAFT"));
    }
    await assert.rejects(access(path.join(directory, "dist/blog/draft-article")));
    await assert.rejects(access(path.join(directory, "dist/assets/resume.pdf")));
    await writeFile(path.join(content, "bad.md"), '---\ntitle: Bad\nslug: ../escape\ndescription: Invalid slug\ndate: 2026-09-01\n---\nNo.\n');
    await assert.rejects(promisify(execFile)(process.execPath, [new URL("./build-site.mjs", import.meta.url).pathname], { cwd: directory }), /Invalid or duplicate slug/);
  } finally {
    // Only the exact disposable directory created above is removed.
    await rm(directory, { recursive: true, force: true });
  }
});
