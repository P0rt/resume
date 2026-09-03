# Public MCP and machine-readable content

Endpoint: **https://sergei-parfenov.com/mcp**

Transport: MCP Streamable HTTP, stateless JSON responses. No API key is needed: this server only reads information already published on the website. It cannot edit the site, read drafts, access accounts, or fetch arbitrary URLs/files.

Add the endpoint as a remote HTTP MCP server in a compatible client. A common configuration shape is:

```json
{
  "mcpServers": {
    "sergei-parfenov": {
      "url": "https://sergei-parfenov.com/mcp"
    }
  }
}
```

Some clients also require `type: "http"`; use that client's documented configuration format. This repository does not change anyone's global client settings.

## Tools

- `get_profile`: biography, current roles, career history, skills and public contact links.
- `search`: keyword search across the profile and all published articles. Accepts `query` and optional `limit` (1–20). Returns IDs, titles and canonical source URLs.
- `fetch`: full Markdown text for an ID returned by search, or `profile`.

MCP resources expose the profile, article catalog and each article's Markdown. All tools have read-only, non-destructive, idempotent annotations. Results include canonical HTML URLs for attribution.

GET returns HTTP 405 intentionally: no long-lived SSE subscription is provided. Use a Streamable HTTP client, not a browser address bar. Initialization and requests use POST with `Accept: application/json, text/event-stream` and `Content-Type: application/json`.

## Static alternatives

- `/llms.txt`: concise reading guide and article links.
- `/index.md`: complete profile in Markdown.
- `/profile.json`: structured public biography.
- `/articles.json`: published article metadata and canonical/Markdown URLs.
- `/blog/<slug>/index.md`: complete article, original text, author and dates.
- `/mcp.json`: human/tool-readable connection information (site-specific, not a standard discovery manifest).
- `/rss.xml`: recent articles.

Machine-readable alternates have `noindex, follow` response headers to avoid competing with the canonical HTML pages in search. They remain publicly readable and are not blocked by robots.txt. `llms.txt` is an agent convenience, not a Google ranking mechanism.

## Updates and verification

The build derives every representation from `content/profile.json` and published Markdown in `content/articles`. Drafts are omitted from the static output and the function's `.generated/mcp-data.json` bundle. Do not manually edit generated files.

Run `npm test`. Tests include real MCP SDK negotiation over HTTP, tools/resources, concurrency, invalid requests, origin/host checks, body limits, canonical metadata, Markdown integrity and draft exclusion. `npm start` serves the website and `/mcp` locally.

The Vercel function uses the official MCP SDK, bounds requests to 16 KiB, limits query/result size, accepts only configured site origins, and does not retain sessions or invoke an LLM. The endpoint is public, so usage can consume the project's Vercel function quota; platform-level abuse controls and quota monitoring remain relevant.
