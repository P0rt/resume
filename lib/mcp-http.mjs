import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer, loadSnapshot } from "./mcp-server.mjs";
import { preferredLocale } from "./locale-routing.cjs";

const MAX_BODY_BYTES = 16 * 1024;
const publicHosts = new Set(["sergei-parfenov.com", "www.sergei-parfenov.com",
  process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean));

function allowedHost(host) {
  return publicHosts.has(host) || (!process.env.VERCEL && /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host || ""));
}

function validOrigin(origin) {
  try {
    const url = new URL(origin);
    return origin === url.origin && allowedHost(url.host) && (url.protocol === "https:" || (!process.env.VERCEL && url.protocol === "http:" && /^(127\.0\.0\.1|localhost)$/.test(url.hostname)));
  } catch { return false; }
}

function errorResponse(response, status, message, code = -32000) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code, message } }));
}

async function requestBody(request) {
  if (Number(request.headers["content-length"]) > MAX_BODY_BYTES) throw Object.assign(new Error("Request body too large"), { status: 413 });
  if (request.body !== undefined) {
    const raw = typeof request.body === "string" ? request.body : Buffer.isBuffer(request.body) ? request.body.toString("utf8") : JSON.stringify(request.body);
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw Object.assign(new Error("Request body too large"), { status: 413 });
    return JSON.parse(raw);
  }
  const raw = await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let oversized = false;
    request.on("data", (chunk) => {
      if (oversized) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        oversized = true;
        chunks.length = 0;
        reject(Object.assign(new Error("Request body too large"), { status: 413 }));
      } else chunks.push(chunk);
    });
    request.on("end", () => { if (!oversized) resolve(Buffer.concat(chunks).toString("utf8")); });
    request.on("error", reject);
  });
  return JSON.parse(raw);
}

export async function handleMcp(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex");
  response.setHeader("Vary", "Origin, Accept-Language");
  if (!allowedHost(request.headers.host)) return errorResponse(response, 403, "Host not allowed");
  const origin = request.headers.origin;
  if (origin && !validOrigin(origin)) return errorResponse(response, 403, "Origin not allowed");
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, MCP-Protocol-Version");
  }
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return errorResponse(response, 405, "Use MCP Streamable HTTP POST. Connection details: https://sergei-parfenov.com/mcp.json");
  }
  if (!/^application\/json(?:;|$)/i.test(request.headers["content-type"] || "")) return errorResponse(response, 415, "Content-Type must be application/json");
  let body;
  try { body = await requestBody(request); }
  catch (error) { return errorResponse(response, error.status || 400, error.status ? error.message : "Invalid JSON", error.status ? -32000 : -32700); }
  let server;
  try {
    server = createMcpServer(await loadSnapshot(), preferredLocale(request.headers["accept-language"]));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    response.once("close", () => { void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(request, response, body);
  } catch (error) {
    if (server) await server.close();
    // Do not echo input, filesystem paths or request contents in error responses/logs.
    console.error("MCP request failed");
    if (!response.headersSent) errorResponse(response, 500, "Unable to read public site content", -32603);
    else if (!response.writableEnded) response.end();
  }
}
