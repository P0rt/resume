# Publishing articles with an agent

The repository is the publishing system. There is no CMS or admin panel.

## New local-first article

Ask the agent to create a draft, or run:

```bash
npm run article:new -- "Article title"
```

The new Markdown file appears in `content/articles` with `published: false`. The agent should:

1. Write and edit the article in that file.
2. Replace the placeholder description.
3. Check the stable `slug` before first publication. Do not change it later.
4. Add useful tags and optional `coverImage`.
5. Set `published: true`.
6. For a DEV-hosted `coverImage`, run `npm run images:import`, then `npm test` and `npm run build`.
7. Commit and push to `main`.

The build creates all of this automatically:

- `dist/blog/<slug>/index.html`
- Self-referencing canonical metadata
- `BlogPosting` structured data
- Open Graph and Twitter metadata
- An entry in the blog archive
- An entry in `rss.xml`
- An entry in `sitemap.xml`
- A complete Markdown alternate at `/blog/<slug>/index.md`
- An entry in `/articles.json` and `/llms.txt`
- A searchable, readable document in the public MCP endpoint

Unpublished drafts are excluded from every public representation and from the server bundle. Keep actual publication and update dates: do not change dates just to suggest freshness. The build preserves the original article punctuation in HTML and Markdown.

## Cover images

Keep the original `coverImage` URL in front matter. `npm run images:import` saves missing public DEV cover images into `content/images/covers/` without modifying Markdown or replacing existing snapshots. Commit those source files with the article. Other image hosts require an explicitly reviewed importer change; redirects, credentials and non-image responses are rejected.

Normal builds are offline: `scripts/build-images.mjs` generates responsive WebP derivatives in `dist/assets/optimized/` from the committed sources. The browser chooses the right width; covers load eagerly with high priority. Generated filenames are content-versioned and cached immutably. If a source has not been imported yet, the build warns and keeps the original remote image, so it does not silently remove the cover or break publication. Import it before shipping.

Portrait derivatives come from the original light/blue photos in `src/assets/`, preserve the existing centre crop, and use matching native theme-aware responsive preloads. Do not replace the originals, change the visual layout, or add a client-side image library for resizing.

## Article formatting

Start the body with prose or an `##` heading; the page already supplies the article title as its H1. Use `##` for sections and `###` for subsections. Headings receive stable, unique permalinks automatically. Use descriptive link text, image alt text and simple Markdown tables with a header row.

Label fenced code blocks with a language, for example `python`, `js`, `ts`, `bash`, `json` or `yaml`. Use `text` for logs and diagrams. Shiki highlights code at build time for both system themes; there is no browser-side highlighting dependency. Unsupported languages safely fall back to plain text. Preserve indentation and keep lines reasonably short, though long lines and tables can scroll horizontally without widening the page. Copy buttons copy only code, and are hidden when JavaScript is unavailable.

The reading layout is in `src/styles/blog.css`, isolated from the homepage. Before publishing, check the archive and the actual article on mobile and desktop, in light and dark mode. See `AGENTS.md` for the project's design and editorial constraints.

## Republish on DEV

Publish the personal-site version first. Then add this to the DEV front matter:

```yaml
canonical_url: https://sergei-parfenov.com/blog/article-slug/
```

The article now has one canonical source while DEV remains the distribution and discussion channel. The local file can also include `sourceUrl` when a visible link back to the DEV discussion is useful.

## Imported DEV articles

Run this to refresh all articles currently published by `@p0rt`:

```bash
npm run articles:sync
```

Imported files use `source: dev`, keep the original DEV URL in `sourceUrl`, and render at their own stable local URL. To consolidate search signals, update the canonical URL for each DEV copy to the matching local URL after the domain is live.

The 22 existing DEV articles were aligned and verified on September 3, 2026. Keep their personal-site canonical URLs in DEV when editing or republishing them. Do not replace `sourceUrl` in the local Markdown: it is the link to the DEV discussion, not the preferred canonical source. Changing local front matter does not update DEV automatically.

## Before publishing

- Keep the slug stable.
- Use primary sources and descriptive link text.
- Add alt text to meaningful images.
- Verify the built article, not only the Markdown source.
- Check the canonical link and JSON-LD in the built HTML.
