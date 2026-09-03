import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { DOMAIN, profile, homeSchema, workSchema, blogSchema, articleSchema, writeAgentFiles } from "./site-metadata.mjs";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const DIST_DIR = path.join(ROOT, "dist");
const ARTICLES_DIR = path.join(ROOT, "content/articles");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeXml(value = "") {
  return escapeHtml(value);
}

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error(`Invalid publication date: ${value}`);
  return date.toISOString();
}

function humanDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function estimateReadingTime(markdown) {
  const words = markdown.replace(/[`#>*_[\]()!-]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function absoluteArticleUrl(slug) {
  return `${DOMAIN}/blog/${slug}/`;
}

function pageControls(href, label, arrow = "↗") {
  return `<header class="page-controls section-shell">
    <a class="page-link" href="${escapeHtml(href)}">${escapeHtml(label)} <span aria-hidden="true">${arrow}</span></a>
    <button class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="Dark theme" data-theme-toggle hidden>
      <span aria-hidden="true">Dark</span>
      <span class="theme-track" aria-hidden="true"><span class="theme-thumb"></span></span>
    </button>
  </header>`;
}

async function loadArticles() {
  const slugs = new Set();
  const filenames = (await fs.readdir(ARTICLES_DIR)).filter((filename) => filename.endsWith(".md"));
  const articles = await Promise.all(filenames.map(async (filename) => {
    const raw = await fs.readFile(path.join(ARTICLES_DIR, filename), "utf8");
    const parsed = matter(raw);
    if (parsed.data.published === false) return null;
    const slug = parsed.data.slug || filename.replace(/\.md$/, "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slugs.has(slug)) throw new Error(`Invalid or duplicate slug: ${slug}`);
    slugs.add(slug);
    if (!parsed.data.title?.trim() || !parsed.data.description?.trim()) throw new Error(`Missing article metadata: ${filename}`);
    const content = parsed.content;

    return {
      ...parsed.data,
      title: parsed.data.title,
      description: parsed.data.description,
      slug,
      content,
      date: isoDate(parsed.data.date),
      updated: isoDate(parsed.data.updated || parsed.data.date),
      readingTime: Number(parsed.data.readingTime) || estimateReadingTime(content),
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
      canonicalUrl: absoluteArticleUrl(slug),
    };
  }));

  return articles
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function articleRow(article, className = "") {
  const tags = article.tags.slice(0, 2).map((tag) => escapeHtml(tag)).join(", ");
  return `
    <article class="post-row ${className}" data-reveal>
      <a class="post-row-link" href="./blog/${escapeHtml(article.slug)}/">
        <time datetime="${escapeHtml(article.date)}">${escapeHtml(humanDate(article.date))}</time>
        <span class="post-row-copy">
          <span class="post-row-title">${escapeHtml(article.title)}</span>
          <span class="post-row-description">${escapeHtml(article.description)}</span>
        </span>
        <span class="post-row-meta">${escapeHtml(tags)}<br>${article.readingTime} min</span>
      </a>
    </article>`;
}

function featuredWriting(articles) {
  const [lead, ...rest] = articles.slice(0, 3);
  if (!lead) return "<p>No articles published yet.</p>";

  return `
    <article class="writing-lead" data-reveal>
      <a href="./blog/${escapeHtml(lead.slug)}/">
        <time datetime="${escapeHtml(lead.date)}">${escapeHtml(humanDate(lead.date))}</time>
        <h3>${escapeHtml(lead.title)}</h3>
        <p>${escapeHtml(lead.description)}</p>
        <span>Read article <span aria-hidden="true">↗</span></span>
      </a>
    </article>
    <div class="writing-recent">${rest.map((article) => articleRow(article, "post-row-compact")).join("")}</div>`;
}

function archiveMarkup(articles) {
  const byYear = articles.reduce((groups, article) => {
    const year = new Date(article.date).getUTCFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(article);
    return groups;
  }, new Map());
  return [...byYear].map(([year, yearArticles]) => `
    <section class="archive-year" aria-labelledby="year-${year}">
      <h2 id="year-${year}">${year}</h2>
      <div class="archive-list">${yearArticles.map((article) => articleRow(article)).join("")}</div>
    </section>`).join("");
}

function articleDocument(article, older, newer) {
  const body = marked.parse(article.content, { gfm: true });
  const cover = article.coverImage ? `
    <figure class="article-cover" data-reveal>
      <img src="${escapeHtml(article.coverImage)}" alt="" width="1000" height="500" loading="eager">
    </figure>` : "";
  const sourceLink = article.sourceUrl ? `
    <p class="source-line">First published on <a href="${escapeHtml(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">DEV Community <span aria-hidden="true">↗</span></a></p>` : "";
  const olderLink = older ? `<a href="../${escapeHtml(older.slug)}/"><span>Previous</span>${escapeHtml(older.title)}</a>` : "<span></span>";
  const newerLink = newer ? `<a href="../${escapeHtml(newer.slug)}/"><span>Next</span>${escapeHtml(newer.title)}</a>` : "<span></span>";
  const tags = article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const socialImage = article.coverImage || `${DOMAIN}/assets/portrait-blue.jpg`;
  const structuredData = articleSchema(article);

  return `<!doctype html>
<html lang="${escapeHtml(article.language || "en")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(article.description)}">
  <meta name="author" content="${escapeHtml(profile.name)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="theme-color" content="#f7f7f4" data-theme-color>
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${escapeHtml(profile.name)}">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(article.description)}">
  <meta property="og:image" content="${escapeHtml(socialImage)}">
  <meta property="og:url" content="${escapeHtml(article.canonicalUrl)}">
  <meta property="article:published_time" content="${escapeHtml(article.date)}">
  <meta property="article:modified_time" content="${escapeHtml(article.updated)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.title)}">
  <meta name="twitter:description" content="${escapeHtml(article.description)}">
  <meta name="twitter:image" content="${escapeHtml(socialImage)}">
  <link rel="canonical" href="${escapeHtml(article.canonicalUrl)}">
  <link rel="author" href="${DOMAIN}/">
  <link rel="alternate" type="text/markdown" href="${escapeHtml(article.canonicalUrl)}index.md" title="Article as Markdown">
  <link rel="describedby" type="text/plain" href="${DOMAIN}/llms.txt" title="Agent reading guide">
  <link rel="alternate" type="application/rss+xml" title="Writing by Sergei Parfenov" href="${DOMAIN}/rss.xml">
  <link rel="icon" href="../../assets/favicon.ico" sizes="any">
  <link rel="preload" href="../../assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../../styles/index.css">
  <title>${escapeHtml(article.title)} | Sergei Parfenov</title>
  <script>document.documentElement.classList.add("js");try{const t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>
  <script type="application/ld+json">${structuredData}</script>
</head>
<body class="article-page">
  <a class="skip-link" href="#main">Skip to article</a>
  ${pageControls("../../blog.html", "Blog", "←")}
  <main id="main">
    <article>
      <header class="article-header section-shell">
        <a class="back-link" href="../../blog.html">← All writing</a>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-deck">${escapeHtml(article.description)}</p>
        <div class="article-meta-line">
          <a href="/" rel="author">${escapeHtml(profile.name)}</a>
          <time datetime="${escapeHtml(article.date)}">${escapeHtml(humanDate(article.date))}</time>
          <span>${article.readingTime} min read</span>
          <span class="article-tags">${tags}</span>
          <button type="button" data-copy-url>Copy URL</button>
        </div>
      </header>
      ${cover}
      <div class="article-prose section-shell" data-article-body>${body}</div>
      <footer class="article-footer section-shell">
        ${sourceLink}
        <nav class="article-pagination" aria-label="More articles">${olderLink}${newerLink}</nav>
      </footer>
    </article>
  </main>
  <footer class="site-footer section-shell">
    <a href="/">Sergei Parfenov</a>
    <a href="../../blog.html">Writing</a>
    <span>© <span data-current-year>${new Date().getFullYear()}</span></span>
  </footer>
  <script src="../../scripts/main.js"></script>
</body>
</html>`;
}

function rssDocument(articles) {
  const items = articles.slice(0, 30).map((article) => `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(article.canonicalUrl)}</link>
      <guid isPermaLink="true">${escapeXml(article.canonicalUrl)}</guid>
      <pubDate>${new Date(article.date).toUTCString()}</pubDate>
      <description>${escapeXml(article.description)}</description>
    </item>`).join("");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <atom:link href="${DOMAIN}/rss.xml" rel="self" type="application/rss+xml" />
    <title>Writing by Sergei Parfenov</title>
    <link>${DOMAIN}/blog.html</link>
    <description>Essays on AI systems, agents, infrastructure, and product engineering.</description>
    <language>en</language>${items}
  </channel>
</rss>`;
}

function sitemapDocument(articles) {
  // Utility pages are noindex. Do not invent lastmod dates for static pages.
  const staticPages = ["/", "/work-together/", "/blog.html"];
  const urls = [
    ...staticPages.map((pathname) => ({ url: `${DOMAIN}${pathname}` })),
    ...articles.map((article) => ({ url: article.canonicalUrl, updated: article.updated })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((item) => `  <url><loc>${escapeXml(item.url)}</loc>${item.updated ? `<lastmod>${isoDate(item.updated)}</lastmod>` : ""}</url>`).join("\n")}
</urlset>`;
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return files.flat();
}

if (path.basename(DIST_DIR) !== "dist") throw new Error("Refusing to clean an unexpected output directory.");
await fs.rm(DIST_DIR, { recursive: true, force: true });
await fs.mkdir(DIST_DIR, { recursive: true });

const articles = await loadArticles();
const replacements = {
  "{{PROFILE_SCHEMA}}": homeSchema(),
  "{{WORK_SCHEMA}}": workSchema(),
  "{{BLOG_SCHEMA}}": blogSchema(articles),
  "{{PROFILE_NAME}}": escapeHtml(profile.name),
  "{{PROFILE_ROLE}}": escapeHtml(profile.role),
  "{{PROFILE_DESCRIPTION}}": escapeHtml(profile.description),
  "{{PROFILE_SUMMARY}}": escapeHtml(profile.summary),
  "{{PROFILE_INTRO}}": escapeHtml(profile.intro),
  "{{PROFILE_BLOG_INTRO}}": escapeHtml(profile.blogIntro),
  "{{PROFILE_CURRENT_LINKS}}": profile.currentRoles.map((job) => `${escapeHtml(job.role)} at <a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.organization)}</a>.`).join("<br>"),
  "{{PROFILE_LOCATION}}": escapeHtml(profile.location),
  "{{PROFILE_EMAIL}}": escapeHtml(profile.email),
  "{{PROFILE_ABOUT}}": profile.about.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n"),
  "{{PROFILE_WRITING}}": escapeHtml(profile.writing),
  "{{COLLABORATION_TITLE}}": escapeHtml(profile.collaboration.title),
  "{{COLLABORATION_DESCRIPTION}}": escapeHtml(profile.collaboration.description),
  "{{COLLABORATION_APPROACH}}": escapeHtml(profile.collaboration.approach),
  "{{COLLABORATION_INVITATION}}": escapeHtml(profile.collaboration.invitation),
  "{{PROFILE_NOW}}": profile.currentRoles.map((job) => `<div class="now-role"><h3><a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.organization)}</a> · ${escapeHtml(job.role)}</h3><p>${escapeHtml(job.description)}</p></div>`).join("\n"),
  "{{PROFILE_PROJECTS}}": profile.projects.map((project) => `<article class="open-project"><h3><a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.name)} <span aria-hidden="true">↗</span></a></h3><p>${escapeHtml(project.description)}</p></article>`).join("\n"),
  "{{PROFILE_CURRENT}}": profile.currentRoles.map((job) => `${escapeHtml(job.role)}, ${escapeHtml(job.organization)}`).join("<br>"),
  "{{PROFILE_FOCUS}}": escapeHtml(profile.focus),
  "{{PROFILE_AUDIENCE}}": escapeHtml(profile.audience),
  "{{PROFILE_MUSIC}}": escapeHtml(profile.music.description),
  "{{PROFILE_PLAYLIST}}": escapeHtml(profile.music.url),
  "{{PROFILE_CAPABILITIES}}": profile.capabilities.map((item) => `<div><dt>${escapeHtml(item.name)}</dt><dd>${escapeHtml(item.description)}</dd></div>`).join("\n"),
  "{{PROFILE_EXPERIENCE}}": profile.experience.map((job) => `<article class="experience-item">
    <header class="experience-heading"><h3 class="experience-company">${job.url ? `<a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.company)}</a>` : escapeHtml(job.company)}</h3><p>${escapeHtml(job.role)}</p><p class="experience-date">${escapeHtml(job.period)}</p></header>
    <div class="experience-body${job.positions ? " experience-body-grid" : ""}">${job.positions
      ? job.positions.map((position) => `<p><strong>${escapeHtml(position.company)}</strong><br>${escapeHtml(position.description)}</p>`).join("")
      : `<p>${escapeHtml(job.description)}</p>${(job.highlights || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}`}</div>
  </article>`).join("\n"),
  "{{HOME_CONTROLS}}": pageControls("./blog.html", "Blog"),
  "{{BLOG_CONTROLS}}": pageControls("/", "Home", "←"),
  "{{ARTICLE_COUNT}}": String(articles.length),
  "{{FEATURED_ARTICLES}}": featuredWriting(articles),
  "{{ARTICLE_ARCHIVE}}": archiveMarkup(articles),
};

for (const filename of await walk(SRC_DIR)) {
  if (!filename.endsWith(".html")) continue;
  const relative = path.relative(SRC_DIR, filename);
  let html = await fs.readFile(filename, "utf8");
  Object.entries(replacements).forEach(([token, replacement]) => {
    html = html.replaceAll(token, replacement);
  });
  const target = path.join(DIST_DIR, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html, "utf8");
}

for (let index = 0; index < articles.length; index += 1) {
  const article = articles[index];
  const target = path.join(DIST_DIR, "blog", article.slug, "index.html");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, articleDocument(article, articles[index + 1], articles[index - 1]), "utf8");
}

await Promise.all([
  fs.cp(path.join(SRC_DIR, "assets"), path.join(DIST_DIR, "assets"), {
    recursive: true,
    // Keep the source resume for later, but do not publish it.
    filter: (source) => source !== path.join(SRC_DIR, "assets", "resume.pdf"),
  }),
  fs.cp(path.join(SRC_DIR, "scripts"), path.join(DIST_DIR, "scripts"), { recursive: true }),
  fs.cp(path.join(SRC_DIR, "styles"), path.join(DIST_DIR, "styles"), { recursive: true }),
  fs.writeFile(path.join(DIST_DIR, "rss.xml"), rssDocument(articles), "utf8"),
  fs.writeFile(path.join(DIST_DIR, "sitemap.xml"), sitemapDocument(articles), "utf8"),
  fs.writeFile(path.join(DIST_DIR, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${DOMAIN}/sitemap.xml\n`, "utf8"),
]);

await writeAgentFiles(articles, DIST_DIR);

console.log(`Built ${articles.length} article pages.`);
