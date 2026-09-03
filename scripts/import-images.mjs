import { mkdir, readFile, readdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import sharp from "sharp";
import { coverSourceName } from "./build-images.mjs";

const MAX_BYTES = 12 * 1024 * 1024;

export function checkedCoverUrl(value) {
  const url = new URL(value);
  const allowed = /^media[0-9]?\.dev\.to$/.test(url.hostname)
    || ["dev-to-uploads.s3.amazonaws.com", "dev-to-uploads.s3.us-east-2.amazonaws.com"].includes(url.hostname);
  if (url.protocol !== "https:" || !allowed || url.username || url.password || url.port) {
    throw new Error(`Cover import only accepts public DEV image hosts: ${url.hostname}`);
  }
  return url;
}

export async function downloadCover(value, fetchImage = fetch) {
  const url = checkedCoverUrl(value);
  const response = await fetchImage(url, {
    redirect: "error", signal: AbortSignal.timeout(30_000), headers: { Accept: "image/png,image/jpeg,image/webp" },
  });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`Invalid cover response: ${response.status}`);
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("Cover is too large");
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > MAX_BYTES) throw new Error("Cover is too large");
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  const metadata = await sharp(body, { limitInputPixels: 40_000_000 }).metadata();
  if (!["png", "jpeg", "webp", "avif"].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error("Expected a static cover image");
  return body;
}

export async function importImages(root) {
  const directory = path.join(root, "content/images/covers");
  await mkdir(directory, { recursive: true });
  let imported = 0;
  for (const filename of (await readdir(path.join(root, "content/articles"))).sort()) {
    if (!filename.endsWith(".md")) continue;
    const { data } = matter(await readFile(path.join(root, "content/articles", filename), "utf8"));
    if (data.published === false || !data.coverImage) continue;
    const target = path.join(directory, coverSourceName(data.coverImage));
    try { await access(target); continue; } catch (error) { if (error.code !== "ENOENT") throw error; }
    const body = await downloadCover(data.coverImage);
    await writeFile(target, body, { flag: "wx" });
    imported += 1;
    console.log(`Imported cover for ${data.slug || filename}: ${Math.round(body.length / 1024)} KiB`);
  }
  console.log(`Imported ${imported} covers. Existing snapshots and article sources were not changed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await importImages(process.cwd());
