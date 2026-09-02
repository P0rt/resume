import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const API_ROOT = "https://dev.to/api";
const DOMAIN = "https://sergei-parfenov.com";
const USERNAME = "p0rt";
const ARTICLES_DIR = path.resolve("content/articles");
const headers = {
  Accept: "application/vnd.forem.api-v1+json",
  "User-Agent": "sergei-parfenov-site-importer/1.0",
};

const wait = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

function normalizeTypography(value = "") {
  return String(value)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[ \t]+$/gm, "");
}

function stripDevFrontmatter(markdown = "") {
  const normalized = markdown.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n")) return normalized;
  const closing = normalized.indexOf("\n---\n", 4);
  return closing === -1 ? normalized : normalized.slice(closing + 5);
}

function normalizeTags(article) {
  if (Array.isArray(article.tag_list)) return article.tag_list;
  return String(article.tags || article.tag_list || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, { headers });
    const body = await response.text();

    if (response.ok) return JSON.parse(body);
    if (attempt === 5) {
      throw new Error(`DEV returned ${response.status} for ${url}: ${body}`);
    }

    await wait(attempt * 800);
  }

  throw new Error(`Could not fetch ${url}`);
}

await fs.mkdir(ARTICLES_DIR, { recursive: true });

const list = await fetchJson(`${API_ROOT}/articles?username=${USERNAME}&per_page=100`);
let imported = 0;
let preserved = 0;

for (const summary of list) {
  const target = path.join(ARTICLES_DIR, `${summary.slug}.md`);
  let existing;

  try {
    existing = matter(await fs.readFile(target, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  if (existing && existing.data.source !== "dev") {
    preserved += 1;
    continue;
  }

  const article = await fetchJson(`${API_ROOT}/articles/${summary.id}`);
  const localUrl = `${DOMAIN}/blog/${article.slug}/`;
  const frontmatter = {
    title: normalizeTypography(article.title),
    slug: article.slug,
    description: normalizeTypography(article.description),
    published: true,
    date: article.published_at,
    updated: article.edited_at || article.published_at,
    readingTime: article.reading_time_minutes,
    tags: normalizeTags(article),
    language: article.language || "en",
    coverImage: article.cover_image || "",
    source: "dev",
    sourceUrl: article.url,
    devId: article.id,
    canonicalUrl: localUrl,
  };
  const body = stripDevFrontmatter(article.body_markdown);
  const markdown = `${matter.stringify("", frontmatter).trim()}\n\n${normalizeTypography(body).trim()}\n`;

  await fs.writeFile(target, markdown, "utf8");
  imported += 1;
  await wait(300);
}

console.log(`Imported ${imported} DEV articles. Preserved ${preserved} local articles.`);
