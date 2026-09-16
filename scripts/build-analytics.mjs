import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { profile } from "./site-metadata.mjs";

// This ingestion-only project key is public by design; never use a personal API key here.
const PUBLIC_PROJECT_KEY = "phc_posNrSU8xsWCgSShArGvz8ajUrikHjoNihHfHsMaTRbC";
const PAGE_TYPES = new Set(["home", "work_together", "blog_index", "article", "privacy", "not_found"]);
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const OWN_PROFILES = new Map([
  ["https://github.com/P0rt", "github"],
  ["https://dev.to/p0rt", "dev"],
  ["https://www.linkedin.com/in/sergei--parfenov", "linkedin"],
]);
const DOWNLOADS = new Map([
  ["/assets/downloads/agent-memory-probe.zip", "agent-memory-probe"],
  ["/assets/downloads/ai-test-demo.zip", "ai-test-demo"],
]);

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2];
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function withAttributes(tag, properties) {
  for (const [name, value] of Object.entries(properties)) {
    tag = tag.replace(new RegExp(`\\s${name}\\s*=\\s*(["'])[^]*?\\1`, "gi"), "");
    tag = tag.replace(/>$/, ` ${name}="${escapeAttribute(value)}">`);
  }
  return tag;
}

// Restrict events to visible, intentional calls to action. In particular, a DEV
// article citation or a GitHub repository in prose is not a profile conversion.
function annotateLinks(html, pageType) {
  const stack = [];
  const within = (className) => stack.some((element) => element.classes.includes(className));
  const tokens = /<!--[\s\S]*?-->|<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)\s*>|<\/?[a-z][^>]*>/gi;
  return html.replace(tokens, (tag) => {
    if (/^<!--|^<(?:script|style)\b/i.test(tag)) return tag;
    const name = tag.match(/^<\/?([a-z][a-z0-9-]*)/i)?.[1].toLowerCase();
    if (tag.startsWith("</")) {
      const index = stack.findLastIndex((element) => element.name === name);
      if (index >= 0) stack.length = index;
      return tag;
    }

    if (name === "a") {
      const href = attribute(tag, "href");
      const footerPlacement = within("site-footer")
        ? ({ home: "home_footer", work_together: "work_footer", blog_index: "blog_footer" })[pageType]
        : undefined;
      const placement = pageType === "blog_index" && within("blog-tools") ? "blog_tools" : footerPlacement;
      if (href?.startsWith("mailto:") && ((pageType === "home" && footerPlacement) || (pageType === "work_together" && within("contact-note")))) {
        tag = withAttributes(tag, { "data-analytics-event": "contact_clicked", "data-analytics-placement": pageType === "home" ? "home_footer" : "work_primary" });
      } else if (href) {
        let url;
        try { url = new URL(href, "https://sergei-parfenov.com/"); } catch { /* Invalid links do not become analytics targets. */ }
        const supportPlacement = pageType === "article" && within("article-support") ? "article_footer"
          : pageType === "blog_index" && within("blog-support") ? "blog_intro" : undefined;
        if (url?.href === profile.supportUrl && supportPlacement) {
          tag = withAttributes(tag, { "data-analytics-event": "support_clicked", "data-analytics-placement": supportPlacement, "data-analytics-provider": "ko-fi" });
        } else if (url && !url.search && !url.hash) {
          const profile = OWN_PROFILES.get(`${url.origin}${url.pathname.replace(/\/+$/, "")}`);
          if (placement && profile) {
            tag = withAttributes(tag, { "data-analytics-event": "profile_clicked", "data-analytics-placement": placement, "data-analytics-platform": profile });
          } else if (pageType === "article" && stack.some((element) => element.articleBody) && url.origin === "https://sergei-parfenov.com" && DOWNLOADS.has(url.pathname)) {
            tag = withAttributes(tag, { "data-analytics-event": "download_clicked", "data-analytics-placement": "article_body", "data-analytics-asset-id": DOWNLOADS.get(url.pathname), "data-analytics-file-type": "zip" });
          } else if (placement === "blog_tools" && url.origin === "https://sergei-parfenov.com" && url.pathname === "/rss.xml") {
            tag = withAttributes(tag, { "data-analytics-event": "rss_clicked", "data-analytics-placement": "blog_tools", "data-analytics-feed-id": "main" });
          }
        }
      }
    }

    if (!VOID_TAGS.has(name) && !/\/\s*>$/.test(tag)) {
      stack.push({ name, classes: (attribute(tag, "class") || "").split(/\s+/), articleBody: /\sdata-article-body(?:\s|=|>)/i.test(tag) });
    }
    return tag;
  });
}

export function decorateAnalytics(html, { pageType, locale, slug } = {}) {
  if (!PAGE_TYPES.has(pageType)) throw new Error(`Unknown analytics page type: ${pageType}`);
  if (pageType === "article" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "")) throw new Error("Article analytics needs a valid slug");
  const htmlLanguage = attribute(html.match(/<html\b[^>]*>/i)?.[0] || "", "lang");
  const language = (htmlLanguage || locale || "en").toLowerCase().split(/[-_]/)[0];
  if (!/^[a-z]{2,3}$/.test(language)) throw new Error(`Invalid analytics locale: ${language}`);
  const properties = {
    "data-analytics-page-type": pageType,
    "data-analytics-content-key": pageType === "article" ? `article:${slug}` : pageType,
    "data-analytics-locale": language,
    ...(pageType === "article" ? { "data-analytics-article-slug": slug } : {}),
  };
  if (!/<body\b[^>]*>/i.test(html) || !/<\/body>/i.test(html)) throw new Error("Analytics decoration needs a complete HTML document");
  html = html.replace(/<body\b[^>]*>/i, (tag) => withAttributes(tag, properties));
  html = annotateLinks(html, pageType);
  if (html.includes('data-analytics-event="support_clicked"')) {
    html = html.replace(/<body\b[^>]*>/i, (tag) => withAttributes(tag, { "data-analytics-support-available": "true" }));
  }
  const script = '<script type="module" src="/scripts/analytics.js"></script>';
  if (!html.includes(script)) html = html.replace(/<\/body>/i, `  ${script}\n</body>`);
  return html;
}

export async function buildAnalytics(root, distDir) {
  return build({
    absWorkingDir: root,
    entryPoints: { analytics: path.join(root, "src/scripts/analytics.js") },
    outdir: path.join(distDir, "scripts"),
    // A build can target a disposable content fixture outside the repository;
    // dependencies still belong to the compiler, just like the other builders.
    nodePaths: [fileURLToPath(new URL("../node_modules", import.meta.url))],
    bundle: true,
    format: "esm",
    splitting: true,
    chunkNames: "analytics-[name]-[hash]",
    target: ["es2020"],
    minify: true,
    sourcemap: false,
    legalComments: "none",
    metafile: true,
    define: { __POSTHOG_PUBLIC_KEY__: JSON.stringify(PUBLIC_PROJECT_KEY) },
  });
}
