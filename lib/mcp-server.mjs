import { readFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { normalizeLocale, supportedLocales } from "./locale-routing.mjs";

const DOMAIN = "https://sergei-parfenov.com";
let snapshotPromise;
export function loadSnapshot() {
  snapshotPromise ??= readFile(new URL("../.generated/mcp-data.json", import.meta.url), "utf8").then(JSON.parse);
  return snapshotPromise;
}

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const result = (data) => ({ content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data });

function localizedSnapshot(snapshot, locale = "en") {
  return snapshot.locales?.[normalizeLocale(locale)] || { profile: snapshot.profile, profileMarkdown: snapshot.profileMarkdown };
}

export function documents(snapshot, locale = "en") {
  const localized = localizedSnapshot(snapshot, locale);
  return [{ id: "profile", title: localized.profile.name, description: localized.profile.description,
    url: localized.profile.url, text: localized.profileMarkdown, language: localized.profile.language || "en",
    tags: localized.profile.alternateNames }, ...snapshot.articles];
}

export function searchDocuments(snapshot, query, limit = 10, locale = "en") {
  const language = normalizeLocale(locale);
  const terms = [...new Set(query.toLocaleLowerCase(language).match(/[\p{L}\p{N}]+/gu) || [])];
  if (!terms.length) return [];
  return documents(snapshot, language).map((document) => {
    const fields = [document.title, document.tags.join(" "), document.description, document.text].map((value) => value.toLocaleLowerCase(language));
    const score = terms.every((term) => fields.some((field) => field.includes(term)))
      ? terms.reduce((total, term) => total + fields.reduce((sum, field, index) => sum + (field.includes(term) ? [8, 5, 3, 1][index] : 0), 0), 0) : 0;
    return { document, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id))
    .slice(0, limit)
    .map(({ document }) => ({ id: document.id, title: document.title, url: document.url, description: document.description, language: document.language || "en" }));
}

export function createMcpServer(snapshot, requestLocale = "en") {
  const defaultLocale = normalizeLocale(requestLocale);
  const localeSchema = z.enum(supportedLocales).optional().describe("Response language: en, es, fr, pt, ja, zh or ru. Defaults to the request Accept-Language header, then English.");
  const server = new McpServer({ name: "sergei-parfenov", version: "1.0.0", title: "Sergei Parfenov: profile and writing", websiteUrl: `${DOMAIN}/` }, {
    instructions: "Read-only access to Sergei Parfenov's public profile and published articles. Profile content is available in English, Spanish, French, Portuguese, Japanese, Simplified Chinese and Russian. Results include canonical HTML URLs suitable for source attribution. Markdown and JSON are alternate representations. No private data, drafts, account access, or write operations are available.",
  });

  server.registerTool("get_profile", {
    title: "Read Sergei Parfenov's profile", description: "Read the localized public biography, current roles, career history, skills, music interests and contact links.",
    inputSchema: { locale: localeSchema }, annotations,
  }, async ({ locale }) => result(localizedSnapshot(snapshot, locale || defaultLocale).profile));

  server.registerTool("search", {
    title: "Search the profile and articles", description: "Search this site's published content by keywords. Returns document IDs, titles and canonical URLs. Use fetch with an ID to read the complete document.",
    inputSchema: { query: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(20).default(10), locale: localeSchema }, annotations,
  }, async ({ query, limit, locale }) => result({ locale: locale || defaultLocale, results: searchDocuments(snapshot, query, limit, locale || defaultLocale) }));

  server.registerTool("fetch", {
    title: "Read a published document", description: "Read a complete document as Markdown using an ID returned by search, or profile for the biography. Returns its canonical source URL. Does not fetch arbitrary URLs or files.",
    inputSchema: { id: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), locale: localeSchema }, annotations,
  }, async ({ id, locale }) => {
    const document = documents(snapshot, locale || defaultLocale).find((entry) => entry.id === id);
    if (!document) return { isError: true, content: [{ type: "text", text: "Published document not found. Use search to obtain an existing document ID." }] };
    const { text, title, url } = document;
    return result({ id, title, text, url, language: document.language || "en", ...(document.sourceUrl ? { metadata: { sourceUrl: document.sourceUrl } } : {}) });
  });

  const resources = [
    { name: "profile", uri: `${DOMAIN}/profile.json`, mimeType: "application/json", text: JSON.stringify(snapshot.profile) },
    { name: "profile-markdown", uri: `${DOMAIN}/index.md`, mimeType: "text/markdown", text: snapshot.profileMarkdown },
    { name: "articles", uri: `${DOMAIN}/articles.json`, mimeType: "application/json", text: JSON.stringify({ author: snapshot.profile.name, home: snapshot.profile.url, articles: snapshot.articles.map(({ text, ...metadata }) => metadata) }) },
    ...supportedLocales.slice(1).flatMap((locale) => {
      const localized = localizedSnapshot(snapshot, locale);
      return [
        { name: `profile-${locale}`, uri: `${DOMAIN}/${locale}/profile.json`, mimeType: "application/json", text: JSON.stringify(localized.profile) },
        { name: `profile-markdown-${locale}`, uri: `${DOMAIN}/${locale}/index.md`, mimeType: "text/markdown", text: localized.profileMarkdown },
      ];
    }),
    ...snapshot.articles.map((article) => ({ name: article.id, uri: article.markdownUrl, mimeType: "text/markdown", text: article.text })),
  ];
  for (const resource of resources) {
    server.registerResource(resource.name, resource.uri, { mimeType: resource.mimeType, description: `Public ${resource.name} content from sergei-parfenov.com` }, async () => ({ contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.text }] }));
  }
  return server;
}
