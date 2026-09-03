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
  assert.deepEqual(new Set(urls), new Set([`${origin}/`, `${origin}/work-together/`, `${origin}/blog.html`, ...snapshot.articles.map((article) => article.url)]));
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
  assert.equal(JSON.parse(await read("profile.json")).experience.length, snapshot.profile.experience.length);
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

test("the detailed profile stays consistent across the page, JSON, Markdown and MCP", async () => {
  const home = await read("index.html");
  const work = await read("work-together/index.html");
  const bio = JSON.parse(await read("profile.json"));
  const markdown = await read("index.md");
  const htmlText = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const paragraphs = [
    ...bio.about,
    ...Object.values(bio.collaboration),
    ...bio.capabilities.flatMap((item) => [item.name, item.description]),
    ...bio.projects.flatMap((item) => [item.name, item.description, item.url]),
    ...bio.experience.flatMap((job) => [job.description, ...(job.highlights || [])]).filter(Boolean),
  ];
  for (const text of paragraphs) {
    assert.ok(work.includes(htmlText(text)), `Missing visible profile content: ${text}`);
    // The collaboration heading is rendered as a stable section name in Markdown.
    if (text !== bio.collaboration.title) assert.ok(markdown.includes(text), `Missing agent content: ${text}`);
  }
  assert.deepEqual(snapshot.profile, bio);
  assert.ok(work.includes("Mastery Depth Tracker"));
  assert.ok(work.includes('id="work-together"'));
  assert.ok(home.includes(htmlText(bio.intro)));
  assert.ok(home.includes(htmlText(bio.blogIntro)));
  for (const paragraph of bio.homeStory) {
    assert.ok(home.replace(/<[^>]*>/g, "").includes(htmlText(paragraph)));
    assert.ok(markdown.includes(paragraph));
  }
  assert.ok(markdown.includes(bio.homeCurrent));
  assert.ok(!home.includes("Mastery Depth Tracker"));
  assert.ok(!home.includes("I joined Yandex Praktikum"));
  assert.ok(work.includes("I joined Yandex Praktikum"));
  assert.ok(!home.includes("open-project"));
  assert.ok(!home.includes("help-list"));
  assert.ok(!home.includes("experience-item"));
  assert.ok(home.includes('href="/work-together/"'));
  assert.ok(!home.includes("writing-lead"), "Article feed belongs on the separate blog");
  assert.ok(!home.includes("<blockquote"), "Recommendations inform the copy, not a testimonial section");
  assert.equal((home.match(/<h1(?:\s|>)/g) || []).length, 1);
  assert.equal((work.match(/<h1(?:\s|>)/g) || []).length, 1);
  const aboutPage = graph(work).find((item) => item["@type"] === "AboutPage");
  assert.equal(aboutPage.url, `${origin}/work-together/`);
  assert.equal(aboutPage.mainEntity["@id"], `${origin}/#person`);
  assert.ok(work.includes(`<link rel="canonical" href="${origin}/work-together/">`));
  assert.ok((await read("blog.html")).includes('class="archive-list"'));
});

test("404 assets and return links use absolute paths even for nested missing URLs", async () => {
  const page = await read("404.html");
  assert.ok(page.includes('href="/assets/favicon.ico"'));
  assert.ok(page.includes('href="/styles/index.css"'));
  assert.ok(page.includes('href="/"'));
});

test("LinkedIn uses the corrected canonical profile across pages and agent output", async () => {
  const linkedin = "https://www.linkedin.com/in/sergei--parfenov/";
  const bio = JSON.parse(await read("profile.json"));
  assert.ok(bio.sameAs.includes(linkedin));
  assert.ok(snapshot.profile.sameAs.includes(linkedin));
  assert.ok(snapshot.profileMarkdown.includes(linkedin));
  for (const file of ["index.html", "work-together/index.html"]) {
    assert.ok((await read(file)).includes(`href="${linkedin}"`));
  }
  for (const file of ["index.html", "work-together/index.html", "blog.html", ...snapshot.articles.map((article) => `blog/${article.id}/index.html`), "profile.json", "index.md"]) {
    assert.ok(!(await read(file)).includes("sergey-p-721b25171"), `Outdated LinkedIn URL in ${file}`);
    assert.ok((await read(file)).includes(linkedin), `Missing LinkedIn identity in ${file}`);
  }
});

test("education distinguishes the Stanford course from the university degree", async () => {
  const bio = JSON.parse(await read("profile.json"));
  const work = await read("work-together/index.html");
  const markdown = await read("index.md");
  assert.deepEqual(bio.education.map(({ kind, startDate, endDate }) => [kind, startDate, endDate]), [
    ["course", "2024-04", "2024-06"], ["degree", "2005", "2010"],
  ]);
  assert.equal(bio.education[0].program, "CS231n: Deep Learning for Computer Vision");
  assert.equal(bio.education[1].program, "Computer Information Systems");
  assert.deepEqual(snapshot.profile.education, bio.education);
  for (const item of bio.education) {
    for (const field of ["institution", "program", "qualification", "period"]) {
      assert.ok(work.includes(item[field]));
      assert.ok(markdown.includes(item[field]));
    }
  }
  assert.ok(work.includes('id="education"'));
  assert.ok(!(await read("index.html")).includes('class="education-note"'));
  const person = graph(work).find((item) => item["@type"] === "Person");
  assert.deepEqual(person.alumniOf.map((item) => item.name), [bio.education[1].institution]);
});

test("career corrections stay accurate in every public representation", async () => {
  const bio = JSON.parse(await read("profile.json"));
  const work = await read("work-together/index.html");
  const home = await read("index.html");
  const markdown = await read("index.md");
  assert.deepEqual(bio.currentRoles.map((job) => [job.organization, job.role]), [["Aliwio", "CTO"], ["Symptomato", "CTO"]]);
  assert.deepEqual(bio.experience.filter((job) => job.status === "current").map((job) => job.company), ["Aliwio", "Symptomato"]);
  const tripleten = bio.experience.find((job) => job.company === "TripleTen");
  assert.equal(tripleten.status, "past");
  assert.equal(tripleten.role, "AI Engineer");
  assert.equal(tripleten.startDate, "2021-12");
  assert.equal(tripleten.endDate, "2026-01");
  assert.equal(tripleten.period, "Dec 2021 to Jan 2026");
  const iawy = bio.experience.find((job) => job.company === "IAWY");
  assert.equal(iawy.role, "Co-Founder and CPO");
  assert.equal(iawy.period, "Aug 2023 to Jul 2024");
  assert.equal(iawy.startDate, "2023-08");
  assert.equal(iawy.endDate, "2024-07");
  assert.ok(iawy.description.includes("two bootcamps in Latin America"));
  for (const [company, role, startDate, endDate] of [
    ["Aliwio", "CTO", "2026-02", undefined],
    ["Symptomato", "CTO", "2026-01", undefined],
    ["Retailhub", "AI Researcher", "2023-10", "2024-01"],
    ["Yandex Praktikum", "Software Engineer", "2018-03", "2021-12"],
    ["Thingyfy", "Software Engineer", "2019-10", "2020-10"],
    ["Yandex School of Data Analysis", "Learning Specialist", "2018-10", "2020-01"],
    ["Sravni.ru", "Software Engineer", "2017-11", "2018-10"],
  ]) {
    const job = bio.experience.find((entry) => entry.company === company);
    assert.equal(job.role, role);
    assert.equal(job.startDate, startDate);
    assert.equal(job.endDate, endDate);
  }
  for (const text of [work, markdown]) {
    for (const fact of ["11th", "7,000–10,000", "before ChatGPT", "8.4 seconds to 0.6 seconds", "140 legacy", "100,000 items", "2.5 hours to 18 minutes", "97.8%", "IAWY", "Symptomato", iawy.coverage.url]) assert.ok(text.includes(fact), `Missing career fact: ${fact}`);
    assert.ok(!text.includes("Dec 2020 to present"));
  }
  assert.ok(home.includes('href="https://tripleten.com"'));
  assert.ok(home.includes('href="https://practicum.yandex.ru/"'));
  assert.ok(home.includes(`href="${iawy.coverage.url}"`));
  assert.ok(home.includes('href="https://symptomato.com"'));
  const pages = [home, work, await read("blog.html"), await read(`blog/${snapshot.articles[0].id}/index.html`)];
  for (const page of pages) {
    const nodes = graph(page);
    const person = nodes.find((item) => item["@type"] === "Person") || nodes.find((item) => item["@type"] === "ProfilePage")?.mainEntity || nodes.find((item) => item["@type"] === "BlogPosting")?.author;
    assert.deepEqual(person.worksFor.map((job) => job.name), ["Aliwio", "Symptomato"]);
  }
});

test("homepage reads as a personal introduction without directory rows or header controls", async () => {
  const home = await read("index.html");
  const styles = await read("styles/home.css");
  assert.ok(home.includes('class="home-intro"'));
  assert.ok(home.includes('class="home-identity"'));
  assert.ok(home.includes('class="home-opening"'));
  assert.ok(!home.includes('class="home-location"'));
  assert.ok(home.includes('class="home-colophon">Barcelona, <span data-current-year>2026</span> <span aria-hidden="true">☯︎</span>'));
  assert.ok(home.includes('class="home-letter"'));
  assert.ok(!home.includes('class="profile-columns'));
  assert.ok(!home.includes('class="home-row"'));
  assert.ok(!home.includes("page-controls"));
  assert.ok(!home.includes("open.spotify.com"));
  assert.equal((home.match(/href="\.\/blog.html"/g) || []).length, 1);
  assert.ok(styles.includes("prefers-reduced-motion: no-preference"));
  assert.ok(styles.includes("max-width: 767px"));
  assert.match(styles, /\.home-identity h1\s*\{[^}]*font-family: var\(--font-editorial\)/);
  assert.match(styles, /\.home-writing h2\s*\{[^}]*font-family: var\(--font-editorial\)/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) 240px/);
  assert.match(styles, /\.home-portrait\s*\{[^}]*width: 192px/);
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
