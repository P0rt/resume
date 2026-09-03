import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const contentDir = path.resolve("content/articles");
const distDir = path.resolve("dist");
const filenames = (await fs.readdir(contentDir)).filter((filename) => filename.endsWith(".md"));
const slugs = new Set();
const publishedSlugs = new Set();

function validateControls(html, page, destination) {
  const header = html.match(/<header class="page-controls section-shell">([\s\S]*?)<\/header>/)?.[1];
  if (!header) throw new Error(`Missing page controls on ${page}`);
  if ((header.match(/<a\s/g) || []).length !== 1 || (header.match(/<button\s/g) || []).length !== 1) {
    throw new Error(`Expected only one link and one theme switch on ${page}`);
  }
  if (!header.includes(`href="${destination}"`)) throw new Error(`Wrong page control destination on ${page}`);
  if (!header.includes('role="switch" aria-checked="false" aria-label="Dark theme"')) {
    throw new Error(`Missing accessible theme switch on ${page}`);
  }
  if (/nav-menu|site-nav|resume\.pdf/.test(html)) throw new Error(`Old navigation or resume link on ${page}`);
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error(`Unresolved template on ${page}`);
}

for (const filename of filenames) {
  const parsed = matter(await fs.readFile(path.join(contentDir, filename), "utf8"));
  const slug = parsed.data.slug;
  if (!slug || slugs.has(slug)) throw new Error(`Missing or duplicate slug in ${filename}`);
  slugs.add(slug);
  if (parsed.data.published === false) continue;
  publishedSlugs.add(slug);

  const built = path.join(distDir, "blog", slug, "index.html");
  const html = await fs.readFile(built, "utf8");
  const url = `https://sergei-parfenov.com/blog/${slug}/`;
  validateControls(html, slug, "../../blog.html");
  if (!html.includes(`<link rel="canonical" href="${url}">`)) throw new Error(`Wrong canonical URL for ${slug}`);
  if (!html.includes('"@type":"BlogPosting"')) throw new Error(`Missing BlogPosting data for ${slug}`);
  if (parsed.data.sourceUrl && !html.includes(parsed.data.sourceUrl)) throw new Error(`Missing source URL for ${slug}`);
}

const index = await fs.readFile(path.join(distDir, "index.html"), "utf8");
const work = await fs.readFile(path.join(distDir, "work-together/index.html"), "utf8");
validateControls(index, "home", "./blog.html");
validateControls(work, "work-together", "/");
validateControls(await fs.readFile(path.join(distDir, "blog.html"), "utf8"), "blog", "/");
if (/<details\b|<summary\b/.test(index)) throw new Error("Homepage information is still collapsed");
if ((work.match(/<article class="experience-item">/g) || []).length !== 5) throw new Error("Experience entry is missing from work-together");
if (/experience-item|open-project|help-list/.test(index)) throw new Error("Detailed content must not appear on the compact homepage");
if (/href="(?:\.\/|\/)blog\//.test(index)) throw new Error("Homepage must link to the blog, not individual articles");
if (!index.includes('href="/work-together/"')) throw new Error("Missing link to the detailed profile");
for (const section of ["about", "writing", "personal"]) {
  if (!index.includes(`id="${section}"`)) throw new Error(`Missing homepage section ${section}`);
}
if (await fs.access(path.join(distDir, "assets/resume.pdf")).then(() => true, () => false)) {
  throw new Error("The resume PDF is still being published");
}
if (!work.includes("AI/ML Engineer")) throw new Error("TripleTen role is missing");
if (work.includes("Practicum USA")) throw new Error("Standalone Practicum USA entry still exists");
if (!index.includes("open.spotify.com/playlist/6kX9RuLad2D5hsX86fjvgg")) throw new Error("Spotify playlist is missing");
if (!index.includes("portrait-blue.jpg")) throw new Error("New portrait is missing");

const articlePages = await fs.readdir(path.join(distDir, "blog"));
if (articlePages.length !== publishedSlugs.size) throw new Error("Not every published article has its own output directory");

for (const filename of ["index.html", "blog.html", "rss.xml", "sitemap.xml", "robots.txt"]) {
  await fs.access(path.join(distDir, filename));
}

console.log(`Validated the compact homepage, detailed work page, minimal controls, unpublished PDF, and ${publishedSlugs.size} unique article URLs.`);
