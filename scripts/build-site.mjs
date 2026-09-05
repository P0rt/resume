import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderArticle } from "./render-article.mjs";
import { buildIcons } from "./build-icons.mjs";
import { buildImages } from "./build-images.mjs";
import {
  DOMAIN, profile, locales, localeCodes, localeHomeUrl, localeWorkUrl,
  homeSchema, workSchema, blogSchema, articleSchema, writeAgentFiles,
} from "./site-metadata.mjs";

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

const profileLinks = new Map([
  ["Yandex Praktikum", "https://practicum.yandex.ru/"],
  ["Яндекс Практикум", "https://practicum.yandex.ru/"],
  ["TripleTen", profile.experience.find((job) => job.company === "TripleTen").url],
  ["Nebius Academy", "https://academy.nebius.com"],
  ["Tech.eu", profile.experience.find((job) => job.company === "IAWY").coverage.url],
  ...profile.currentRoles.map((job) => [job.organization, job.url]),
]);

function linkedProfileText(value) {
  // Split plain text before escaping; never search inside generated anchor markup.
  let segments = [{ text: value }];
  for (const [label, url] of profileLinks) {
    segments = segments.flatMap((segment) => segment.url ? [segment] : segment.text.split(label).flatMap((text, index) => index ? [{ text: label, url }, { text }] : [{ text }]));
  }
  return segments.map(({ text, url }) => url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>` : escapeHtml(text)).join("");
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
  </header>`;
}

function experienceItem(job) {
  return `<article class="experience-item">
    <header class="experience-heading"><h3 class="experience-company">${job.url ? `<a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.company)}</a>` : escapeHtml(job.company)}</h3><p>${escapeHtml(job.role)}</p><p class="experience-date">${escapeHtml(job.period)}</p></header>
    <div class="experience-body${job.positions ? " experience-body-grid" : ""}">${job.positions
      ? job.positions.map((position) => `<p><strong>${escapeHtml(position.company)}</strong><br>${escapeHtml(position.description)}</p>`).join("")
      : `<p>${escapeHtml(job.description)}</p>${(job.highlights || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${job.coverage ? `<p><a href="${escapeHtml(job.coverage.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.coverage.label)} <span aria-hidden="true">↗</span></a></p>` : ""}`}</div>
  </article>`;
}

function experienceHistory(jobs, ui) {
  // Use the source identity so a translated company name cannot move the boundary.
  const boundary = profile.experience.findIndex((job) => job.company === "Yandex Praktikum") + 1;
  if (!boundary || boundary >= jobs.length) return jobs.map(experienceItem).join("\n");
  return `${jobs.slice(0, boundary).map(experienceItem).join("\n")}
    <details class="earlier-experience">
      <summary>${escapeHtml(ui.earlierExperience)}</summary>
      <div class="earlier-experience-list">${jobs.slice(boundary).map(experienceItem).join("\n")}</div>
    </details>`;
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
        <div class="post-row-date"><time datetime="${escapeHtml(article.date)}">${escapeHtml(humanDate(article.date))}</time><span>${article.readingTime} min read</span></div>
        <div class="post-row-copy">
          <h3 class="post-row-title">${escapeHtml(article.title)}</h3>
          <p class="post-row-description">${escapeHtml(article.description)}</p>
          <span class="post-row-meta">${tags}</span>
        </div>
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

async function articleDocument(article, older, newer) {
  const body = await renderArticle(article.content);
  const image = images.covers.get(article.coverImage);
  const cover = article.coverImage ? `
    <figure class="article-cover" data-reveal>
      <img src="${escapeHtml(image?.src || article.coverImage)}"${image ? ` srcset="${image.srcset}" sizes="${image.sizes}" width="${image.width}" height="${image.height}"` : ""} alt="${escapeHtml(article.coverAlt || "")}" loading="eager" fetchpriority="high">
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
  <meta name="theme-color" content="#f7f7f4" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#131416" media="(prefers-color-scheme: dark)">
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
  {{SITE_ICONS}}
  <link rel="stylesheet" href="../../styles/index.css">
  <link rel="stylesheet" href="../../styles/blog.css">
  <title>${escapeHtml(article.title)} | Sergei Parfenov</title>
  <script>document.documentElement.classList.add("js");</script>
  <script type="application/ld+json">${structuredData}</script>
</head>
<body class="article-page">
  <a class="skip-link" href="#main">Skip to article</a>
  ${pageControls("../../blog.html", "Blog", "←")}
  <main id="main">
    <article>
      <header class="article-header section-shell">
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-deck">${escapeHtml(article.description)}</p>
        <div class="article-meta-line">
          <a href="/" rel="author">${escapeHtml(profile.name)}</a>
          <time datetime="${escapeHtml(article.date)}">${escapeHtml(humanDate(article.date))}</time>
          <span>${article.readingTime} min read</span>
          <button type="button" data-copy-url hidden>Copy link</button>
        </div>
        <div class="article-tags" aria-label="Topics">${tags}</div>
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
    <span>© ${new Date().getFullYear()}</span>
  </footer>
  <span class="copy-status visually-hidden" role="status" aria-live="polite"></span>
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
  const alternateUrls = (page) => localeCodes.map((code) => ({
    hreflang: locales[code].hreflang,
    url: page === "home" ? localeHomeUrl(code) : localeWorkUrl(code),
  })).concat({ hreflang: "x-default", url: page === "home" ? localeHomeUrl("en") : localeWorkUrl("en") });
  const urls = [
    ...localeCodes.flatMap((code) => [
      { url: localeHomeUrl(code), alternates: alternateUrls("home") },
      { url: localeWorkUrl(code), alternates: alternateUrls("work") },
    ]),
    { url: `${DOMAIN}/blog.html` },
    ...articles.map((article) => ({ url: article.canonicalUrl, updated: article.updated })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((item) => `  <url><loc>${escapeXml(item.url)}</loc>${item.updated ? `<lastmod>${isoDate(item.updated)}</lastmod>` : ""}${(item.alternates || []).map((alternate) => `<xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${escapeXml(alternate.url)}"/>`).join("")}</url>`).join("\n")}
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
const images = await buildImages(ROOT, DIST_DIR, articles);
const siteIcons = `<link rel="icon" href="/assets/favicon.ico" sizes="16x16 32x32 48x48 64x64 128x128 256x256" type="image/x-icon">
  <link rel="icon" href="/assets/favicon-96.png" sizes="96x96" type="image/png">
  <link rel="icon" href="/assets/favicon.svg" sizes="any" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" sizes="180x180">`;
function languageAlternates(page) {
  return localeCodes.map((code) => `<link rel="alternate" hreflang="${escapeHtml(locales[code].hreflang)}" href="${escapeHtml(page === "home" ? localeHomeUrl(code) : localeWorkUrl(code))}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(page === "home" ? localeHomeUrl("en") : localeWorkUrl("en"))}">`).join("\n  ");
}

function portraitPicture(alt) {
  return `<picture>
              <source srcset="${images.dark.srcset}" sizes="${images.dark.sizes}" media="(prefers-color-scheme: dark)" type="image/webp" width="${images.dark.width}" height="${images.dark.height}">
              <img src="${images.light.src}" srcset="${images.light.srcset}" sizes="${images.light.sizes}" alt="${escapeHtml(alt)}" width="${images.light.width}" height="${images.light.height}" fetchpriority="high">
            </picture>`;
}

function replacementsFor(code = "en", page = "other") {
  const locale = locales[code];
  const localProfile = locale.profile;
  const homePath = code === "en" ? "/" : `/${code}/`;
  const workPath = code === "en" ? "/work-together/" : `/${code}/work-together/`;
  const profileBase = code === "en" ? DOMAIN : `${DOMAIN}/${code}`;
  const title = page === "work" ? locale.seo.workTitle : locale.seo.homeTitle;
  const canonical = page === "work" ? localeWorkUrl(code) : localeHomeUrl(code);
  return {
  "{{PORTRAIT_PRELOADS}}": [["dark", images.dark], ["light", images.light]].map(([theme, image]) => `<link rel="preload" href="${image.src}" as="image" type="image/webp" media="(prefers-color-scheme: ${theme})" imagesrcset="${image.srcset}" imagesizes="${image.sizes}" fetchpriority="high">`).join("\n  "),
  "{{PORTRAIT_PICTURE}}": portraitPicture(locale.ui.portraitAlt),
  "{{SITE_ICONS}}": siteIcons,
  "{{CURRENT_YEAR}}": String(new Date().getFullYear()),
  "{{PAGE_LANGUAGE}}": escapeHtml(locale.htmlLang),
  "{{PAGE_OG_LOCALE}}": escapeHtml(locale.ogLocale),
  "{{PAGE_TITLE}}": escapeHtml(title),
  "{{PAGE_CANONICAL}}": escapeHtml(canonical),
  "{{PAGE_LANGUAGE_ALTERNATES}}": languageAlternates(page === "work" ? "work" : "home"),
  "{{PROFILE_MARKDOWN_URL}}": `${profileBase}/index.md`,
  "{{PROFILE_JSON_URL}}": `${profileBase}/profile.json`,
  "{{WORK_SEO_DESCRIPTION}}": escapeHtml(locale.seo.workDescription),
  "{{HOME_PATH}}": homePath,
  "{{WORK_PATH}}": workPath,
  "{{SKIP_LABEL}}": escapeHtml(locale.ui.skip),
  "{{EXPERIENCE_LINK_LABEL}}": escapeHtml(locale.ui.experienceLink),
  "{{BLOG_LINK_LABEL}}": escapeHtml(locale.ui.blogTitle),
  "{{EMAIL_LABEL}}": escapeHtml(locale.ui.email),
  "{{PRIVACY_LABEL}}": escapeHtml(locale.ui.privacy),
  "{{ABOUT_TITLE}}": escapeHtml(locale.ui.aboutTitle),
  "{{OPEN_TITLE}}": escapeHtml(locale.ui.openTitle),
  "{{HELP_TITLE}}": escapeHtml(locale.ui.helpTitle),
  "{{EDUCATION_TITLE}}": escapeHtml(locale.ui.educationTitle),
  "{{EXPERIENCE_TITLE}}": escapeHtml(locale.ui.experienceTitle),
  "{{BLOG_LABEL}}": escapeHtml(locale.ui.blog),
  "{{PROFILE_SCHEMA}}": homeSchema(code),
  "{{WORK_SCHEMA}}": workSchema(code),
  "{{BLOG_SCHEMA}}": blogSchema(articles),
  "{{PROFILE_NAME}}": escapeHtml(localProfile.name),
  "{{PROFILE_ROLE}}": escapeHtml(localProfile.role),
  "{{PROFILE_DESCRIPTION}}": escapeHtml(localProfile.description),
  "{{PROFILE_SUMMARY}}": escapeHtml(localProfile.summary),
  "{{PROFILE_INTRO}}": escapeHtml(localProfile.intro),
  "{{PROFILE_HOME_STORY}}": localProfile.homeStory.map((paragraph) => `<p>${linkedProfileText(paragraph)}</p>`).join("\n"),
  "{{PROFILE_HOME_CURRENT}}": linkedProfileText(localProfile.homeCurrent),
  "{{PROFILE_BLOG_INTRO}}": escapeHtml(localProfile.blogIntro),
  "{{PROFILE_CURRENT_LINKS}}": localProfile.currentRoles.map((job) => `${escapeHtml(job.role)} · <a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.organization)}</a>`).join("<br>"),
  "{{PROFILE_LOCATION}}": escapeHtml(localProfile.location),
  "{{PROFILE_EMAIL}}": escapeHtml(localProfile.email),
  "{{PROFILE_LINKEDIN}}": escapeHtml(localProfile.sameAs.find((url) => url.startsWith("https://www.linkedin.com/in/"))),
  "{{PROFILE_ABOUT}}": localProfile.about.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n"),
  "{{PROFILE_WRITING}}": escapeHtml(localProfile.writing),
  "{{PROFILE_CONTRIBUTIONS}}": localProfile.contributions.map((item, index) => `<section class="contribution section-shell" id="contribution-${index + 1}" aria-labelledby="contribution-title-${index + 1}">
    <p class="contribution-label">Review contribution · ${escapeHtml(item.publisher)} · <time datetime="${escapeHtml(item.datePublished)}">${escapeHtml(item.datePublished.slice(0, 4))}</time></p>
    <h2 id="contribution-title-${index + 1}"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)} <span aria-hidden="true">↗</span></a></h2>
    <p class="contribution-byline">By ${escapeHtml(item.author)}</p>
    <p class="contribution-copy">${escapeHtml(item.summary)} ${escapeHtml(item.contribution)}</p>
  </section>`).join("\n"),
  "{{COLLABORATION_TITLE}}": escapeHtml(localProfile.collaboration.title),
  "{{COLLABORATION_DESCRIPTION}}": escapeHtml(localProfile.collaboration.description),
  "{{COLLABORATION_APPROACH}}": escapeHtml(localProfile.collaboration.approach),
  "{{COLLABORATION_INVITATION}}": escapeHtml(localProfile.collaboration.invitation),
  "{{PROFILE_NOW}}": localProfile.currentRoles.map((job) => `<div class="now-role"><h3><a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.organization)}</a> · ${escapeHtml(job.role)}</h3><p>${escapeHtml(job.description)}</p></div>`).join("\n"),
  "{{PROFILE_PROJECTS}}": localProfile.projects.map((project) => `<article class="open-project"><h3><a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.name)} <span aria-hidden="true">↗</span></a></h3><p>${escapeHtml(project.description)}</p></article>`).join("\n"),
  "{{PROFILE_CURRENT}}": localProfile.currentRoles.map((job) => `${escapeHtml(job.role)}, ${escapeHtml(job.organization)}`).join("<br>"),
  "{{PROFILE_FOCUS}}": escapeHtml(localProfile.focus),
  "{{PROFILE_AUDIENCE}}": escapeHtml(localProfile.audience),
  "{{PROFILE_MUSIC}}": escapeHtml(localProfile.music.description),
  "{{PROFILE_PLAYLIST}}": escapeHtml(localProfile.music.url),
  "{{PROFILE_CAPABILITIES}}": localProfile.capabilities.map((item) => `<div><dt>${escapeHtml(item.name)}</dt><dd>${escapeHtml(item.description)}</dd></div>`).join("\n"),
  "{{PROFILE_EDUCATION}}": localProfile.education.map((item) => `<article class="education-item">
    <h3>${escapeHtml(item.institution)}</h3>
    <p>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.program)} <span aria-hidden="true">↗</span></a>` : escapeHtml(item.program)}</p>
    <p class="education-meta">${escapeHtml(item.qualification)} · ${escapeHtml(item.period)}</p>
  </article>`).join("\n"),
  "{{PROFILE_EXPERIENCE}}": experienceHistory(localProfile.experience, locale.ui),
  "{{BLOG_CONTROLS}}": pageControls(homePath, locale.ui.home, "←"),
  "{{ARTICLE_COUNT}}": String(articles.length),
  "{{FEATURED_ARTICLES}}": featuredWriting(articles),
  "{{ARTICLE_ARCHIVE}}": archiveMarkup(articles),
  };
}

function applyReplacements(html, replacements) {
  Object.entries(replacements).forEach(([token, replacement]) => {
    html = html.replaceAll(token, replacement);
  });
  return html;
}

for (const filename of await walk(SRC_DIR)) {
  if (!filename.endsWith(".html")) continue;
  const relative = path.relative(SRC_DIR, filename);
  const page = relative === "index.html" ? "home" : relative === path.join("work-together", "index.html") ? "work" : "other";
  const html = applyReplacements(await fs.readFile(filename, "utf8"), replacementsFor("en", page));
  const target = path.join(DIST_DIR, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html, "utf8");
}

for (const code of localeCodes.slice(1)) {
  for (const [source, relative, page] of [
    [path.join(SRC_DIR, "index.html"), path.join(code, "index.html"), "home"],
    [path.join(SRC_DIR, "work-together", "index.html"), path.join(code, "work-together", "index.html"), "work"],
  ]) {
    const html = applyReplacements(await fs.readFile(source, "utf8"), replacementsFor(code, page));
    const target = path.join(DIST_DIR, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, html, "utf8");
  }
}

for (let index = 0; index < articles.length; index += 1) {
  const article = articles[index];
  const target = path.join(DIST_DIR, "blog", article.slug, "index.html");
  await fs.mkdir(path.dirname(target), { recursive: true });
  const html = (await articleDocument(article, articles[index + 1], articles[index - 1])).replace("{{SITE_ICONS}}", siteIcons);
  await fs.writeFile(target, html, "utf8");
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

// Deliver the exact font with the shared render-blocking CSS. A separate font
// request can reflow words even when the fallback has matching line heights.
// Compression keeps this within ~200 bytes of CSS + the original WOFF2.
const fontSource = 'url("../assets/fonts/manrope-latin.woff2")';
const fontBytes = await fs.readFile(path.join(SRC_DIR, "assets/fonts/manrope-latin.woff2"));
const sharedStyles = await fs.readFile(path.join(SRC_DIR, "styles/index.css"), "utf8");
if (!sharedStyles.includes(fontSource)) throw new Error("Manrope font declaration changed; update its CSS bundling.");
await fs.writeFile(path.join(DIST_DIR, "styles/index.css"), sharedStyles.replace(fontSource, `url("data:font/woff2;base64,${fontBytes.toString("base64")}")`), "utf8");

await buildIcons(path.join(SRC_DIR, "assets/favicon.svg"), DIST_DIR);
await writeAgentFiles(articles, DIST_DIR);

console.log(`Built ${articles.length} article pages.`);
