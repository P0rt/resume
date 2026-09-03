import { createHash } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const PORTRAIT_SIZES = "(max-width: 767px) 192px, 240px";
export const COVER_SIZES = "(max-width: 720px) calc(100vw - 48px), (max-width: 960px) calc(100vw - 96px), 864px";
export const coverSourceName = (url) => `${createHash("sha256").update(url).digest("hex")}.img`;

// Deterministic, offline build. Originals remain untouched; only derivatives go to dist.
export async function responsiveImage(source, outputDirectory, { name, widths, sizes, square = false }) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error("Invalid image name");
  const input = await readFile(source);
  const metadata = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  if (!metadata.width || !metadata.height || (metadata.pages || 1) > 1) throw new Error(`Unsupported image: ${source}`);
  const maxWidth = square ? Math.min(metadata.width, metadata.height) : metadata.width;
  const candidates = [...new Set(widths.map((width) => Math.min(width, maxWidth)))].sort((a, b) => a - b);
  const hash = createHash("sha256").update(input).update(JSON.stringify({ candidates, square, quality: 82, version: 1, vips: sharp.versions.vips, webp: sharp.versions.webp })).digest("hex").slice(0, 16);
  const directory = path.join(outputDirectory, "assets/optimized");
  await mkdir(directory, { recursive: true });
  const variants = [];
  for (const width of candidates) {
    const filename = `${name}-${hash}-${width}.webp`;
    const info = await sharp(input, { limitInputPixels: 40_000_000 }).rotate()
      .resize({ width, ...(square ? { height: width, fit: "cover", position: "centre" } : {}), withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(path.join(directory, filename));
    variants.push({ src: `/assets/optimized/${filename}`, width: info.width, height: info.height, bytes: info.size });
  }
  const largest = variants.at(-1);
  return { ...largest, sizes, srcset: variants.map((image) => `${image.src} ${image.width}w`).join(", "), variants };
}

export async function buildImages(root, outputDirectory, articles) {
  const portraitOptions = { widths: [192, 240, 384, 480, 576, 720], sizes: PORTRAIT_SIZES, square: true };
  const dark = await responsiveImage(path.join(root, "src/assets/portrait-blue.jpg"), outputDirectory, { ...portraitOptions, name: "portrait-blue" });
  const light = await responsiveImage(path.join(root, "src/assets/portrait-light.webp"), outputDirectory, { ...portraitOptions, name: "portrait-light" });
  const covers = new Map();
  for (const article of articles) {
    if (!article.coverImage || covers.has(article.coverImage)) continue;
    const source = path.join(root, "content/images/covers", coverSourceName(article.coverImage));
    try {
      covers.set(article.coverImage, await responsiveImage(source, outputDirectory, {
        name: "cover", widths: [384, 640, 864, 1000], sizes: COVER_SIZES,
      }));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      // New articles can still publish; import explicitly rather than fetching during a build.
      console.warn(`Cover not imported for ${article.slug}; using source URL. Run npm run images:import.`);
    }
  }
  return { dark, light, covers };
}
