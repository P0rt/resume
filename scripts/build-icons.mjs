import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// All raster fallbacks are rendered from the vector master, never upscaled from JPEG.
export async function buildIcons(sourceFile, outputDirectory) {
  const svg = await readFile(sourceFile);
  const render = (size) => sharp(svg, { density: 384 }).resize(size, size);
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = await Promise.all(sizes.map((size) => render(size).png().toBuffer()));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2); // ICO image type.
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[index].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[index].length;
  });
  const ico = Buffer.concat([header, ...images]);
  await Promise.all([
    writeFile(path.join(outputDirectory, "assets/favicon.ico"), ico),
    writeFile(path.join(outputDirectory, "favicon.ico"), ico),
    render(96).png().toFile(path.join(outputDirectory, "assets/favicon-96.png")),
    render(180).flatten({ background: "#f7f7f4" }).png().toFile(path.join(outputDirectory, "assets/apple-touch-icon.png")),
  ]);
}
