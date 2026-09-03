import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

test("the favicon master is a compact vector with all three eyes", async () => {
  const svg = await readFile(new URL("../src/assets/favicon.svg", import.meta.url), "utf8");
  assert.match(svg, /viewBox="0 0 32 32"/);
  assert.match(svg, /<title>Sergei Parfenov/);
  assert.equal((svg.match(/<ellipse /g) || []).length, 3);
  assert.match(svg, /fill="#00ed00"/);
  assert.doesNotMatch(svg, /<image|<script|data:image|foreignObject/);
  assert.ok(Buffer.byteLength(svg) < 1024);
  const server = await readFile(new URL("./serve.mjs", import.meta.url), "utf8");
  assert.match(server, /"\.svg": "image\/svg\+xml"/);
});

test("ICO contains six correctly sized, antialiased PNG images from the SVG", async () => {
  const ico = await readFile(new URL("../dist/assets/favicon.ico", import.meta.url));
  assert.deepEqual(ico, await readFile(new URL("../dist/favicon.ico", import.meta.url)));
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 6);
  const sizes = [16, 32, 48, 64, 128, 256];
  let expectedOffset = 6 + 16 * sizes.length;
  for (const [index, size] of sizes.entries()) {
    const entry = 6 + index * 16;
    assert.equal(ico[entry] || 256, size);
    assert.equal(ico[entry + 1] || 256, size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.equal(offset, expectedOffset);
    const png = ico.subarray(offset, offset + length);
    const metadata = await sharp(png).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.ok([...data].some((alpha, index) => index % info.channels === 3 && alpha > 0 && alpha < 255), `${size}px edges should be antialiased`);
    expectedOffset += length;
  }
  assert.equal(expectedOffset, ico.length);
});

test("search and Apple fallbacks have the expected size and transparency", async () => {
  const search = await sharp(new URL("../dist/assets/favicon-96.png", import.meta.url).pathname).metadata();
  const apple = await sharp(new URL("../dist/assets/apple-touch-icon.png", import.meta.url).pathname).metadata();
  assert.equal(search.width, 96);
  assert.equal(search.height, 96);
  assert.equal(search.hasAlpha, true);
  assert.equal(apple.width, 180);
  assert.equal(apple.height, 180);
  assert.equal(apple.hasAlpha, false);
});

test("every page has the same root-relative icon links, including nested articles and 404", async () => {
  const paths = ["index.html", "blog.html", "work-together/index.html", "privacy.html", "404.html", ...(await readdir(new URL("../dist/blog/", import.meta.url))).map((slug) => `blog/${slug}/index.html`)];
  for (const path of paths) {
    const html = await readFile(new URL(`../dist/${path}`, import.meta.url), "utf8");
    for (const asset of ["favicon.ico", "favicon-96.png", "favicon.svg", "apple-touch-icon.png"]) assert.ok(html.includes(`href="/assets/${asset}"`), `${path}: ${asset}`);
    assert.match(html, /href="\/assets\/favicon.svg" sizes="any" type="image\/svg\+xml"/);
    assert.doesNotMatch(html, /\{\{SITE_ICONS\}\}/);
  }
});
