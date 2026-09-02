import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const contentDir = path.resolve("content/articles");
const distDir = path.resolve("dist");
const filenames = (await fs.readdir(contentDir)).filter((filename) => filename.endsWith(".md"));
const slugs = new Set();

for (const filename of filenames) {
  const parsed = matter(await fs.readFile(path.join(contentDir, filename), "utf8"));
  const slug = parsed.data.slug;
  if (!slug || slugs.has(slug)) throw new Error(`Missing or duplicate slug in ${filename}`);
  slugs.add(slug);
  if (parsed.data.published === false) continue;

  const built = path.join(distDir, "blog", slug, "index.html");
  const html = await fs.readFile(built, "utf8");
  const url = `https://sergei-parfenov.com/blog/${slug}/`;
  if (!html.includes(`<link rel="canonical" href="${url}">`)) throw new Error(`Wrong canonical URL for ${slug}`);
  if (!html.includes('"@type":"BlogPosting"')) throw new Error(`Missing BlogPosting data for ${slug}`);
  if (parsed.data.sourceUrl && !html.includes(parsed.data.sourceUrl)) throw new Error(`Missing source URL for ${slug}`);
}

const index = await fs.readFile(path.join(distDir, "index.html"), "utf8");
if (!index.includes("AI/ML Engineer")) throw new Error("TripleTen role is missing");
if (index.includes("Practicum USA")) throw new Error("Standalone Practicum USA entry still exists");
if (!index.includes("open.spotify.com/playlist/6kX9RuLad2D5hsX86fjvgg")) throw new Error("Spotify playlist is missing");
if (!index.includes("portrait-blue.jpg")) throw new Error("New portrait is missing");

const articlePages = await fs.readdir(path.join(distDir, "blog"));
if (articlePages.length !== slugs.size) throw new Error("Not every article has its own output directory");

for (const filename of ["index.html", "blog.html", "rss.xml", "sitemap.xml", "robots.txt"]) {
  await fs.access(path.join(distDir, filename));
}

console.log(`Validated ${slugs.size} unique article URLs and core site metadata.`);
