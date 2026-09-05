import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import matter from "gray-matter";
import { marked } from "marked";
import { renderArticle } from "./render-article.mjs";

const decodeText = (html) => html.replace(/<[^>]*>/g, "").replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10))).replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&amp;", "&");
const codeBodies = (html) => [...html.matchAll(/<pre\b[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map((match) => decodeText(match[1]));
const stripImageSizing = (html) => html.replace(/<img width="\d+" height="\d+" class="article-image" style="--image-width: \d+px; --image-ratio: \d+\.\d{6}" /g, "<img ");

test("syntax highlighting is static, dual-theme and preserves escaped code exactly", async () => {
  const code = 'def greet(name):\n    # <script> is only text & never markup\n    return f"Hello, {name}!"\n\nprint(greet("Sergei"))';
  const html = await renderArticle(`\`\`\`python\n${code}\n\`\`\``);
  assert.deepEqual(codeBodies(html), [code]);
  assert.match(html, /class="shiki shiki-themes github-light-default github-dark-default"/);
  assert.match(html, /<span style="--shiki-light:[^;]+;--shiki-dark:/);
  assert.match(html, /aria-label="Python code, scroll horizontally if needed"/);
  assert.match(html, /data-copy-code hidden/);
  assert.match(html, /class="code-language">Python/);
  assert.doesNotMatch(html, /<script>|<script src/);
});

test("language aliases and new supported languages load on demand", async () => {
  for (const [language, code, label] of [["js", 'const name = "Sergei";', "JavaScript"], ["yaml", "enabled: true", "YAML"], ["rust", "fn main() {}", "rust"]]) {
    const html = await renderArticle(`\`\`\`${language}\n${code}\n\`\`\``);
    assert.deepEqual(codeBodies(html), [code]);
    assert.ok(html.includes(`class="code-language">${label}</span>`));
    assert.match(html, /<span style="--shiki-light:/);
  }
});

test("unknown, missing and hostile language labels fall back safely", async () => {
  for (const language of ["", "plaintext", "not-a-language", 'bad"><script>alert(1)</script>']) {
    const html = await renderArticle(`\`\`\`${language}\n<a href="unsafe">& text\n\`\`\``);
    assert.deepEqual(codeBodies(html), ['<a href="unsafe">& text']);
    assert.match(html, /class="code-language">Plain text/);
    assert.doesNotMatch(html, /<script>|<a href="unsafe">/);
  }
});

test("heading links are unique per article and preserve inline markup without nested links", async () => {
  const markdown = '# Intro\n\n## Main\n\n## Same title\n\n## Same title\n\n## Same title 2\n\n## [Linked](https://example.com) and `code`\n\n## Пример';
  const html = await renderArticle(markdown);
  const ids = [...html.matchAll(/<h[2-6] id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ["intro", "main-2", "same-title", "same-title-2", "same-title-2-2", "linked-and-code", "пример"]);
  for (const id of ids) assert.ok(html.includes(`href="#${id}"`));
  assert.match(html, /<a href="https:\/\/example.com">Linked<\/a> and <code>code<\/code><a class="heading-anchor"/);
  assert.doesNotMatch(html, /<h1/);
  assert.equal(await renderArticle(markdown), html);
});

test("tables retain table semantics inside labelled keyboard-scrollable regions", async () => {
  const html = await renderArticle('## Results\n\n| Model | Score |\n|:--|--:|\n| Small | 42 |');
  assert.match(html, /class="table-scroll" role="region" tabindex="0" aria-label="Results — table 1,/);
  assert.match(html, /<table>\n<thead>/);
  assert.equal((html.match(/<th scope="col"/g) || []).length, 2);
  assert.match(html, /<td align="right">42<\/td>/);
});

test("inline image dimensions preserve Marked URL, alt and title escaping", async () => {
  const { images } = JSON.parse(await readFile(new URL("../content/images/inline-dimensions.json", import.meta.url), "utf8"));
  for (const [url, dimensions] of Object.entries(images)) {
    const markdown = `![A "quote" & <b>literal</b>](<${url}> 'A "title" & <tag>')`;
    const expected = marked.parse(markdown);
    const actual = await renderArticle(markdown);
    assert.ok(actual.includes(`<img width="${dimensions.width}" height="${dimensions.height}" `), url);
    assert.ok(actual.includes(`class="article-image" style="--image-width: ${dimensions.width}px; --image-ratio: ${(dimensions.width / dimensions.height).toFixed(6)}"`), url);
    assert.equal(stripImageSizing(actual), expected, url);
    assert.doesNotMatch(actual, /<b>|<tag>|alt="A "quote/);
  }
});

test("unknown Markdown images and authored raw image HTML retain their original rendering", async () => {
  const markdown = '![A "quote" & <tag>](<https://example.com/image?x=1&label=%22value%22> "Title & details")';
  assert.equal(await renderArticle(markdown), marked.parse(markdown));
  const { images } = JSON.parse(await readFile(new URL("../content/images/inline-dimensions.json", import.meta.url), "utf8"));
  const url = Object.keys(images)[0];
  const raw = `<figure><img src="${url}" alt="A &amp; B" width="80" height="60"></figure>`;
  assert.equal(await renderArticle(raw), marked.parse(raw));
});

test("inline image manifest covers every published Markdown image without changing article text", async () => {
  const { version, images } = JSON.parse(await readFile(new URL("../content/images/inline-dimensions.json", import.meta.url), "utf8"));
  assert.equal(version, 1);
  const sourceUrls = new Set();
  let occurrences = 0;
  for (const filename of await readdir(new URL("../content/articles/", import.meta.url))) {
    if (!filename.endsWith(".md")) continue;
    const { data, content } = matter(await readFile(new URL(`../content/articles/${filename}`, import.meta.url), "utf8"));
    if (data.published === false) continue;
    const sourceImages = [];
    marked.walkTokens(marked.lexer(content), (token) => {
      if (token.type === "image") sourceImages.push(token);
    });
    for (const token of sourceImages) {
      occurrences += 1;
      sourceUrls.add(token.href);
      const dimensions = images[token.href];
      assert.ok(dimensions, `${filename}: run node scripts/import-image-dimensions.mjs for ${token.href}`);
      assert.ok(Number.isSafeInteger(dimensions.width) && dimensions.width > 0);
      assert.ok(Number.isSafeInteger(dimensions.height) && dimensions.height > 0);
      const html = await renderArticle(token.raw);
      assert.equal(stripImageSizing(html), marked.parse(token.raw), `${filename}: image content changed`);
      assert.ok(html.includes(`<img width="${dimensions.width}" height="${dimensions.height}" `));
    }
  }
  assert.ok(occurrences >= 29, `Expected at least the existing 29 inline images; found ${occurrences}`);
  assert.deepEqual(Object.keys(images).sort(), [...sourceUrls].sort());
});

test("every published code sample is preserved in built HTML", async () => {
  let codeCount = 0;
  for (const filename of await readdir(new URL("../content/articles/", import.meta.url))) {
    if (!filename.endsWith(".md")) continue;
    const { data, content } = matter(await readFile(new URL(`../content/articles/${filename}`, import.meta.url), "utf8"));
    if (data.published === false) continue;
    const expected = [];
    marked.walkTokens(marked.lexer(content), (token) => { if (token.type === "code") expected.push(token.text); });
    const html = await readFile(new URL(`../dist/blog/${data.slug || filename.slice(0, -3)}/index.html`, import.meta.url), "utf8");
    assert.deepEqual(codeBodies(html), expected, filename);
    assert.equal((html.match(/data-copy-code hidden/g) || []).length, expected.length, filename);
    assert.equal((html.match(/<h1>/g) || []).length, 1, filename);
    assert.equal((html.match(/class="page-controls /g) || []).length, 1);
    assert.doesNotMatch(html, /class="back-link"/);
    codeCount += expected.length;
  }
  assert.ok(codeCount >= 46, `Expected the existing 46 code blocks; got ${codeCount}`);
});

test("blog styles and internal memory do not leak into the homepage or public output", async () => {
  const home = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  const blog = await readFile(new URL("../dist/blog.html", import.meta.url), "utf8");
  assert.doesNotMatch(home, /styles\/blog.css/);
  assert.match(blog, /styles\/blog.css/);
  assert.match(blog, /<h3 class="post-row-title">/);
  assert.ok(!(await readdir(new URL("../dist/", import.meta.url))).includes("AGENTS.md"));
  const script = await readFile(new URL("../src/scripts/main.js", import.meta.url), "utf8");
  assert.match(script, /copyText\(code.textContent, button\)/);
  assert.doesNotMatch(script, /pre\.replaceWith/);
});

test("every published syntax token has at least 4.5:1 contrast in both themes", async () => {
  const luminance = (hex) => {
    const rgb = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  for (const slug of await readdir(new URL("../dist/blog/", import.meta.url))) {
    const html = await readFile(new URL(`../dist/blog/${slug}/index.html`, import.meta.url), "utf8");
    for (const [, style, body] of html.matchAll(/<pre[^>]*style="([^"]+)"[^>]*>([\s\S]*?)<\/pre>/g)) {
      for (const theme of ["light", "dark"]) {
        const background = luminance(style.match(new RegExp(`--shiki-${theme}-bg:(#[a-f\\d]{6})`, "i"))[1]);
        for (const [, hex] of (style + body).matchAll(new RegExp(`--shiki-${theme}:(#[a-f\\d]{6})`, "gi"))) {
          const foreground = luminance(hex);
          const contrast = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
          assert.ok(contrast >= 4.5, `${slug}: ${theme} ${hex} has ${contrast.toFixed(2)}:1 contrast`);
        }
      }
    }
  }
});
