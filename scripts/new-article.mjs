import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const title = process.argv.slice(2).join(" ").trim();

if (!title) {
  console.error('Usage: npm run article:new -- "Article title"');
  process.exit(1);
}

const slug = title
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 88);

if (!slug) {
  console.error("The title needs at least one Latin letter or number to create a URL slug.");
  process.exit(1);
}

const now = new Date().toISOString();
const target = path.resolve("content/articles", `${slug}.md`);
const metadata = {
  title,
  slug,
  description: "Add a concise summary for search and social previews.",
  published: false,
  date: now,
  updated: now,
  tags: ["ai"],
  language: "en",
  coverImage: "",
  source: "local",
  sourceUrl: "",
  canonicalUrl: `https://sergei-parfenov.com/blog/${slug}/`,
};
const body = `# Start with the strongest claim\n\nWrite the article here. Set \`published: true\` when it is ready.\n`;

await fs.mkdir(path.dirname(target), { recursive: true });

try {
  await fs.writeFile(target, `${matter.stringify(body, metadata).trim()}\n`, { encoding: "utf8", flag: "wx" });
  console.log(target);
} catch (error) {
  if (error.code === "EEXIST") {
    console.error(`Article already exists: ${target}`);
    process.exit(1);
  }
  throw error;
}
