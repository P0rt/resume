import { readFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const DOMAIN = "https://sergei-parfenov.com";
let snapshotPromise;
export function loadSnapshot() {
  snapshotPromise ??= readFile(new URL("../.generated/mcp-data.json", import.meta.url), "utf8").then(JSON.parse);
  return snapshotPromise;
}

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const result = (data) => ({ content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data });

export function documents(snapshot) {
  return [{ id: "profile", title: snapshot.profile.name, description: snapshot.profile.description,
    url: snapshot.profile.url, text: snapshot.profileMarkdown, tags: snapshot.profile.alternateNames }, ...snapshot.articles];
}

export function searchDocuments(snapshot, query, limit = 10) {
  const terms = [...new Set(query.toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu) || [])];
  if (!terms.length) return [];
  return documents(snapshot).map((document) => {
    const fields = [document.title, document.tags.join(" "), document.description, document.text].map((value) => value.toLocaleLowerCase("en"));
    const score = terms.every((term) => fields.some((field) => field.includes(term)))
      ? terms.reduce((total, term) => total + fields.reduce((sum, field, index) => sum + (field.includes(term) ? [8, 5, 3, 1][index] : 0), 0), 0) : 0;
    return { document, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id))
    .slice(0, limit)
    .map(({ document }) => ({ id: document.id, title: document.title, url: document.url, description: document.description }));
}

export function createMcpServer(snapshot) {
  const server = new McpServer({ name: "sergei-parfenov", version: "1.0.0", title: "Sergei Parfenov: profile and writing", websiteUrl: `${DOMAIN}/` }, {
    instructions: "Read-only access to Sergei Parfenov's public profile and published articles. Results include canonical HTML URLs suitable for source attribution. Markdown and JSON are alternate representations. No private data, drafts, account access, or write operations are available.",
  });

  server.registerTool("get_profile", {
    title: "Read Sergei Parfenov's profile", description: "Read the public biography, current roles, career history, skills, music interests and contact links.",
    inputSchema: {}, annotations,
  }, async () => result(snapshot.profile));

  server.registerTool("search", {
    title: "Search the profile and articles", description: "Search this site's published content by keywords. Returns document IDs, titles and canonical URLs. Use fetch with an ID to read the complete document.",
    inputSchema: { query: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(20).default(10) }, annotations,
  }, async ({ query, limit }) => result({ results: searchDocuments(snapshot, query, limit) }));

  server.registerTool("fetch", {
    title: "Read a published document", description: "Read a complete document as Markdown using an ID returned by search, or profile for the biography. Returns its canonical source URL. Does not fetch arbitrary URLs or files.",
    inputSchema: { id: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }, annotations,
  }, async ({ id }) => {
    const document = documents(snapshot).find((entry) => entry.id === id);
    if (!document) return { isError: true, content: [{ type: "text", text: "Published document not found. Use search to obtain an existing document ID." }] };
    const { text, title, url } = document;
    return result({ id, title, text, url, ...(document.sourceUrl ? { metadata: { sourceUrl: document.sourceUrl } } : {}) });
  });

  const resources = [
    { name: "profile", uri: `${DOMAIN}/profile.json`, mimeType: "application/json", text: JSON.stringify(snapshot.profile) },
    { name: "profile-markdown", uri: `${DOMAIN}/index.md`, mimeType: "text/markdown", text: snapshot.profileMarkdown },
    { name: "articles", uri: `${DOMAIN}/articles.json`, mimeType: "application/json", text: JSON.stringify({ author: snapshot.profile.name, home: snapshot.profile.url, articles: snapshot.articles.map(({ text, ...metadata }) => metadata) }) },
    ...snapshot.articles.map((article) => ({ name: article.id, uri: article.markdownUrl, mimeType: "text/markdown", text: article.text })),
  ];
  for (const resource of resources) {
    server.registerResource(resource.name, resource.uri, { mimeType: resource.mimeType, description: `Public ${resource.name} content from sergei-parfenov.com` }, async () => ({ contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.text }] }));
  }
  return server;
}
