import { Marked, Renderer, TextRenderer } from "marked";
import { bundledLanguages, createHighlighter } from "shiki";
import { readFile } from "node:fs/promises";

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const languageNames = { python: "Python", py: "Python", javascript: "JavaScript", js: "JavaScript", typescript: "TypeScript", ts: "TypeScript", bash: "Bash", sh: "Shell", shell: "Shell", json: "JSON", yaml: "YAML", yml: "YAML", html: "HTML", css: "CSS", sql: "SQL", text: "Plain text", txt: "Plain text", plaintext: "Plain text" };
const highlighter = await createHighlighter({ themes: ["github-light-default", "github-dark-default"], langs: [] });
// Imported explicitly from public images; ordinary builds stay fully offline.
const imageManifest = JSON.parse(await readFile(new URL("../content/images/inline-dimensions.json", import.meta.url), "utf8"));
if (imageManifest.version !== 1 || !imageManifest.images || typeof imageManifest.images !== "object") {
  throw new Error("Invalid inline image dimensions manifest");
}
for (const dimensions of Object.values(imageManifest.images)) {
  if (!Number.isSafeInteger(dimensions?.width) || !Number.isSafeInteger(dimensions?.height) ||
      dimensions.width <= 0 || dimensions.height <= 0 || dimensions.width * dimensions.height > 40_000_000) {
    throw new Error("Invalid inline image dimensions");
  }
}

// One shared highlighter, but fresh heading IDs and parser state for each article.
export async function renderArticle(markdown) {
  const parser = new Marked({ gfm: true });
  const tokens = parser.lexer(markdown);
  const languages = new Set();
  const languageOf = (token) => (token.lang || "text").trim().split(/\s+/)[0].toLowerCase();
  parser.walkTokens(tokens, (token) => {
    if (token.type === "code" && Object.hasOwn(bundledLanguages, languageOf(token))) languages.add(languageOf(token));
  });
  await Promise.all([...languages].map((language) => highlighter.loadLanguage(language)));
  const headingIds = new Set(["main"]);
  let sectionLabel = "Article";
  let tableNumber = 0;

  parser.use({ renderer: {
    image(token) {
      // Let Marked keep its URL handling and escaping of alt/title unchanged.
      const html = Renderer.prototype.image.call(this, token);
      const dimensions = Object.hasOwn(imageManifest.images, token.href) ? imageManifest.images[token.href] : null;
      if (!dimensions || !html.startsWith("<img ")) return html;
      const ratio = (dimensions.width / dimensions.height).toFixed(6);
      return html.replace("<img ", `<img width="${dimensions.width}" height="${dimensions.height}" class="article-image" style="--image-width: ${dimensions.width}px; --image-ratio: ${ratio}" `);
    },
    code(token) {
      const requestedLanguage = languageOf(token);
      const language = Object.hasOwn(bundledLanguages, requestedLanguage) ? requestedLanguage : "text";
      const label = languageNames[language] || language;
      const html = highlighter.codeToHtml(token.text, {
        lang: language,
        themes: { light: "github-light-default", dark: "github-dark-default" },
        defaultColor: false,
        transformers: [{ pre(node) { node.properties["aria-label"] = `${label} code, scroll horizontally if needed`; } }],
      });
      return `<div class="code-block">
        <div class="code-toolbar"><span class="code-language">${escapeHtml(label)}</span><button class="code-copy" type="button" data-copy-code hidden>Copy code</button></div>
        ${html}
      </div>\n`;
    },
    heading(token) {
      const plain = this.parser.parseInline(token.tokens, new TextRenderer()).replace(/<[^>]*>/g, "");
      const base = plain.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/&(?:#\w+|\w+);/g, " ").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section";
      let id = base;
      for (let suffix = 2; headingIds.has(id); suffix += 1) id = `${base}-${suffix}`;
      headingIds.add(id);
      sectionLabel = plain;
      const depth = Math.max(2, token.depth);
      return `<h${depth} id="${id}">${this.parser.parseInline(token.tokens)}<a class="heading-anchor" href="#${id}" aria-label="Link to section: ${escapeHtml(plain)}"><span aria-hidden="true">#</span></a></h${depth}>\n`;
    },
    table(token) {
      tableNumber += 1;
      return `<div class="table-scroll" role="region" tabindex="0" aria-label="${escapeHtml(sectionLabel)} — table ${tableNumber}, scroll horizontally if needed">${Renderer.prototype.table.call(this, token)}</div>\n`;
    },
    tablecell(token) {
      const cell = Renderer.prototype.tablecell.call(this, token);
      return token.header ? cell.replace("<th", '<th scope="col"') : cell;
    },
  } });
  return parser.parser(tokens);
}
