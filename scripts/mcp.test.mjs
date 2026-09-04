import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { after, before, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { handleMcp } from "../lib/mcp-http.mjs";
import { loadSnapshot, searchDocuments } from "../lib/mcp-server.mjs";

let server, url, client, snapshot;
const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25" };
before(async () => {
  snapshot = await loadSnapshot();
  server = createServer(handleMcp);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}/mcp`;
  client = new Client({ name: "site-integration-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
});
after(async () => {
  await client?.close();
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
});

test("official MCP client negotiates the transport and discovers only read-only tools", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(({ name }) => name).sort(), ["fetch", "get_profile", "search"]);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.openWorldHint, false);
  }
});

test("profile, search and fetch return canonical URLs and complete published content", async () => {
  const profile = await client.callTool({ name: "get_profile", arguments: {} });
  assert.equal(profile.structuredContent.name, "Sergei Parfenov");
  assert.equal(profile.structuredContent.url, "https://sergei-parfenov.com/");
  const found = await client.callTool({ name: "search", arguments: { query: "evaluation", limit: 3 } });
  assert.ok(found.structuredContent.results.length > 0);
  assert.ok(found.structuredContent.results.length <= 3);
  const article = snapshot.articles[0];
  const fetched = await client.callTool({ name: "fetch", arguments: { id: article.id } });
  assert.equal(fetched.structuredContent.url, article.url);
  assert.equal(fetched.structuredContent.text, article.text);
});

test("resources expose the same published snapshot, including every article", async () => {
  const { resources } = await client.listResources();
  assert.equal(resources.length, snapshot.articles.length + 3 + 12);
  for (const article of snapshot.articles) {
    assert.ok(resources.some(({ uri }) => uri === article.markdownUrl));
  }
  const article = snapshot.articles[0];
  const read = await client.readResource({ uri: article.markdownUrl });
  assert.equal(read.contents[0].text, article.text);
});

test("profile tools and resources expose every supported locale without translating articles", async () => {
  for (const locale of ["es", "fr", "pt", "ja", "zh", "ru"]) {
    const profile = await client.callTool({ name: "get_profile", arguments: { locale } });
    assert.equal(profile.structuredContent.language, snapshot.locales[locale].profile.language);
    assert.equal(profile.structuredContent.url, `https://sergei-parfenov.com/${locale}/`);
    assert.equal(profile.structuredContent.workUrl, `https://sergei-parfenov.com/${locale}/work-together/`);
    const fetched = await client.callTool({ name: "fetch", arguments: { id: "profile", locale } });
    assert.equal(fetched.structuredContent.text, snapshot.locales[locale].profileMarkdown);
    assert.equal(fetched.structuredContent.url, profile.structuredContent.url);
  }
  const article = snapshot.articles[0];
  const fetched = await client.callTool({ name: "fetch", arguments: { id: article.id, locale: "ja" } });
  assert.equal(fetched.structuredContent.url, article.url);
  assert.equal(fetched.structuredContent.language, article.language);
});

test("Accept-Language provides the MCP default when a tool call omits locale", async () => {
  const localizedClient = new Client({ name: "localized-site-test", version: "1.0.0" });
  await localizedClient.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { "Accept-Language": "de-DE,fr-FR;q=0.9" } } }));
  try {
    const profile = await localizedClient.callTool({ name: "get_profile", arguments: {} });
    assert.equal(profile.structuredContent.language, "fr");
    assert.equal(profile.structuredContent.url, "https://sergei-parfenov.com/fr/");
  } finally {
    await localizedClient.close();
  }
});

test("agents can discover review contributions without confusing them with authored articles", async () => {
  const contribution = snapshot.profile.contributions[0];
  const found = await client.callTool({ name: "search", arguments: { query: contribution.title } });
  assert.ok(found.structuredContent.results.some((item) => item.id === "profile"));
  const profile = await client.callTool({ name: "get_profile", arguments: {} });
  assert.deepEqual(profile.structuredContent.contributions, snapshot.profile.contributions);
  const fetched = await client.callTool({ name: "fetch", arguments: { id: "profile" } });
  assert.ok(fetched.structuredContent.text.includes(contribution.url));
  assert.ok(fetched.structuredContent.text.includes(`By ${contribution.author}`));
  assert.ok(fetched.structuredContent.text.includes(`My role: ${contribution.role}`));
  assert.ok(!snapshot.articles.some((item) => item.url === contribution.url));
});

test("keyword search supports names in Russian and English without empty-query dumping", () => {
  assert.equal(searchDocuments(snapshot, "Сергей Парфенов")[0].id, "profile");
  assert.equal(searchDocuments(snapshot, "Sergey Parfenov")[0].id, "profile");
  assert.deepEqual(searchDocuments(snapshot, "???"), []);
});

test("invalid IDs, arbitrary URLs and excessive search arguments are rejected", async () => {
  for (const id of ["not-a-published-document", "../../content/private", "https://example.com/"]) {
    const response = await client.callTool({ name: "fetch", arguments: { id } });
    assert.equal(response.isError, true);
  }
  const response = await client.callTool({ name: "search", arguments: { query: "x".repeat(201), limit: 500 } });
  assert.equal(response.isError, true);
});

test("GET is an intentional 405; OPTIONS works for the site's origin", async () => {
  assert.equal((await fetch(url)).status, 405);
  const options = await fetch(url, { method: "OPTIONS", headers: { Origin: "https://sergei-parfenov.com" } });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("Access-Control-Allow-Origin"), "https://sergei-parfenov.com");
});

test("untrusted origins and hosts cannot invoke the endpoint", async () => {
  for (const hostile of [{ Origin: "https://attacker.example" }, { Origin: "null" }]) {
    const response = await fetch(url, { method: "POST", headers: { ...headers, ...hostile }, body: "{}" });
    assert.equal(response.status, 403);
  }
  const status = await new Promise((resolve, reject) => {
    const call = request(url, { method: "POST", headers: { ...headers, Host: "attacker.example" } }, (response) => { response.resume(); resolve(response.statusCode); });
    call.on("error", reject);
    call.end("{}");
  });
  assert.equal(status, 403);
});

test("the endpoint limits bodies, validates JSON and does not cache responses", async () => {
  const invalid = await fetch(url, { method: "POST", headers, body: "{" });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, -32700);
  const oversized = await fetch(url, { method: "POST", headers, body: JSON.stringify({ text: "x".repeat(17 * 1024) }) });
  assert.equal(oversized.status, 413);
  const wrongType = await fetch(url, { method: "POST", body: "hello" });
  assert.equal(wrongType.status, 415);
  assert.equal(wrongType.headers.get("cache-control"), "no-store");
  assert.equal(wrongType.headers.get("x-robots-tag"), "noindex");
});

test("stateless requests remain independent under concurrent clients", async () => {
  const results = await Promise.all([1, 2, 3, 4].map(async (id) => {
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/list" }) });
    assert.equal(response.status, 200);
    return (await response.json()).id;
  }));
  assert.deepEqual(results, [1, 2, 3, 4]);
});
