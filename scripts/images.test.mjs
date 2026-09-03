import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import sharp from "sharp";
import { responsiveImage, coverSourceName, COVER_SIZES } from "./build-images.mjs";
import { checkedCoverUrl, downloadCover } from "./import-images.mjs";

const root = new URL("../", import.meta.url);

test("all published covers are first-party, responsive, dimensioned and high priority", async () => {
  for (const filename of await readdir(new URL("content/articles/", root))) {
    if (!filename.endsWith(".md")) continue;
    const { data } = matter(await readFile(new URL(`content/articles/${filename}`, root), "utf8"));
    if (data.published === false) continue;
    const html = await readFile(new URL(`dist/blog/${data.slug}/index.html`, root), "utf8");
    const figure = html.match(/<figure class="article-cover"[^>]*>([\s\S]*?)<\/figure>/)?.[1];
    if (!data.coverImage) { assert.equal(figure, undefined); continue; }
    assert.ok(figure?.includes('src="/assets/optimized/cover-'), filename);
    assert.ok(figure.includes(`sizes="${COVER_SIZES}"`));
    assert.ok(figure.includes('fetchpriority="high"'));
    assert.ok(figure.includes('loading="eager"'));
    assert.match(figure, /width="\d+" height="\d+"/);
    assert.ok(!figure.includes("dev.to"));
    const original = await readFile(new URL(`content/images/covers/${coverSourceName(data.coverImage)}`, root));
    for (const candidate of figure.match(/srcset="([^"]+)"/)[1].split(", ")) {
      const [url, descriptor] = candidate.split(" ");
      const buffer = await readFile(new URL(`dist${url}`, root));
      const metadata = await sharp(buffer).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, Number.parseInt(descriptor));
      assert.ok(buffer.length < original.length, `Derivative larger than original: ${url}`);
    }
    // Source URLs stay in social metadata; source articles and their canonicals are not rewritten.
    assert.ok(html.includes(`<meta property="og:image" content="${data.coverImage}">`));
  }
});

test("portrait variants preserve square framing and stay within a small payload budget", async () => {
  for (const filename of await readdir(new URL("dist/assets/optimized/", root))) {
    if (!filename.startsWith("portrait-")) continue;
    const buffer = await readFile(new URL(`dist/assets/optimized/${filename}`, root));
    const { width, height, format } = await sharp(buffer).metadata();
    assert.equal(width, height);
    assert.equal(format, "webp");
    assert.ok(width <= 720);
    assert.ok(buffer.length < 85_000, filename);
    if (width <= 384) assert.ok(buffer.length < 30_000, filename);
  }
});

test("image generation is repeatable, never upscales and leaves its source intact", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "resume-images-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, "source.png");
  const original = await sharp({ create: { width: 80, height: 60, channels: 3, background: "#00ed00" } }).png().toBuffer();
  await writeFile(source, original);
  const options = { name: "test", widths: [32, 64, 128], sizes: "32px", square: true };
  const first = await responsiveImage(source, directory, options);
  const second = await responsiveImage(source, directory, options);
  assert.deepEqual(first, second);
  assert.deepEqual(first.variants.map((image) => image.width), [32, 60]);
  assert.deepEqual(await readFile(source), original);
  const bytes = await readFile(path.join(directory, first.src));
  assert.ok(bytes.length > 0);
  const changed = await responsiveImage(source, directory, { ...options, square: false });
  assert.notEqual(first.src, changed.src);
});

test("the importer restricts hosts, redirects, payload size and file types", async () => {
  for (const url of ["http://media2.dev.to/x", "https://localhost/x", "https://127.0.0.1/x", "https://media2.dev.to.evil.test/x", "https://user:password@media2.dev.to/x", "https://media2.dev.to:444/x", "file:///etc/passwd"]) {
    assert.throws(() => checkedCoverUrl(url));
  }
  const url = "https://media2.dev.to/example.png";
  assert.equal(checkedCoverUrl(url).hostname, "media2.dev.to");
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
  assert.deepEqual(await downloadCover(url, async (target, options) => {
    assert.equal(target.href, url);
    assert.equal(options.redirect, "error");
    return new Response(png, { headers: { "content-type": "image/png" } });
  }), png);
  await assert.rejects(downloadCover(url, async () => new Response("Not an image", { headers: { "content-type": "text/html" } })), /Invalid cover response/);
  await assert.rejects(downloadCover(url, async () => new Response("", { headers: { "content-type": "image/png", "content-length": "99999999" } })), /too large/);
  await assert.rejects(downloadCover(url, async () => new Response("not png", { headers: { "content-type": "image/png" } })));
});
