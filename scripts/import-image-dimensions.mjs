// Explicit, one-time metadata import: node scripts/import-image-dimensions.mjs
// The site build only reads the resulting JSON; it never invokes this script.
import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const allowedHosts = new Set([
  "raw.githubusercontent.com",
  "dev-to-uploads.s3.amazonaws.com",
  "dev-to-uploads.s3.us-east-2.amazonaws.com",
]);
const maxBytes = 8 * 1024 * 1024;
const maxImages = 64;
const maxPixels = 40_000_000;

function checkedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !allowedHosts.has(url.hostname)) {
    throw new Error(`Image host or URL is not approved: ${value}`);
  }
  return url;
}

async function remoteImage(value) {
  let url = checkedUrl(value);
  const signal = AbortSignal.timeout(20_000);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      redirect: "manual", signal,
      headers: { Accept: "image/*", "User-Agent": "SergeiSiteImageMetadata/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location || redirects === 3) throw new Error(`Too many or invalid image redirects: ${value}`);
      url = checkedUrl(new URL(location, url).href);
      continue;
    }
    if (response.status !== 200 || !response.body) {
      await response.body?.cancel();
      throw new Error(`Image request returned HTTP ${response.status}: ${value}`);
    }
    if (Number(response.headers.get("content-length")) > maxBytes) {
      await response.body.cancel();
      throw new Error(`Image exceeds the ${maxBytes}-byte limit: ${value}`);
    }
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > maxBytes) throw new Error(`Image exceeds the ${maxBytes}-byte limit: ${value}`);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, length);
  }
  throw new Error(`Image redirect limit exceeded: ${value}`);
}

async function localImage(value) {
  // Reuse an already imported source when the same URL is also a cover.
  const hashedCover = path.join(root, "content/images/covers", `${createHash("sha256").update(value).digest("hex")}.img`);
  const candidates = [hashedCover];
  if (value.startsWith("/assets/") && !value.includes("?") && !value.includes("#")) {
    candidates.unshift(path.resolve(root, "src", `.${value}`));
  }
  for (const candidate of candidates) {
    let filename;
    try { filename = await realpath(candidate); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (!filename.startsWith(path.join(root, "src/assets") + path.sep) &&
        !filename.startsWith(path.join(root, "content/images") + path.sep)) {
      throw new Error(`Local image is outside the public asset directories: ${value}`);
    }
    const info = await stat(filename);
    if (!info.isFile() || info.size > maxBytes) throw new Error(`Invalid or oversized local image: ${value}`);
    return readFile(filename);
  }
  return null;
}

const sources = new Map();
for (const filename of (await readdir(path.join(root, "content/articles"))).sort()) {
  if (!filename.endsWith(".md")) continue;
  const { data, content } = matter(await readFile(path.join(root, "content/articles", filename), "utf8"));
  if (data.published === false) continue;
  marked.walkTokens(marked.lexer(content), (token) => {
    if (token.type === "image") sources.set(token.href, (sources.get(token.href) || 0) + 1);
    // Current published articles have no raw image HTML. Do not silently miss a
    // future image embedded in HTML, or rewrite its authored attributes by regex.
    if (token.type === "html" && /<(?:img|picture|source)\b/i.test(token.text)) {
      throw new Error(`Raw image HTML needs explicit dimension review: ${filename}`);
    }
  });
}
if (sources.size > maxImages) throw new Error(`Refusing to import more than ${maxImages} images`);

const images = {};
for (const source of [...sources.keys()].sort()) {
  const local = await localImage(source);
  const input = local || await remoteImage(source);
  const metadata = await sharp(input, { limitInputPixels: maxPixels }).metadata();
  if (!["png", "jpeg", "webp", "avif"].includes(metadata.format) || (metadata.pages || 1) > 1) {
    throw new Error(`Unsupported inline image format: ${source}`);
  }
  const { width, height } = metadata.autoOrient;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 || width * height > maxPixels) {
    throw new Error(`Invalid inline image dimensions: ${source}`);
  }
  images[source] = { width, height };
  console.log(`${local ? "local" : "remote"} ${width}×${height} ${source}`);
}
// Write only after every source succeeds, leaving the previous manifest intact
// on a network or metadata error. Image files and article bodies are untouched.
await writeFile(path.join(root, "content/images/inline-dimensions.json"), JSON.stringify({ version: 1, images }, null, 2) + "\n");
console.log(`Saved dimensions for ${sources.size} images (${[...sources.values()].reduce((sum, count) => sum + count, 0)} occurrences).`);
