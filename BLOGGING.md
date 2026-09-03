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
6. Run `npm test` and `npm run build`.
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

## Before publishing

- Keep the slug stable.
- Use primary sources and descriptive link text.
- Add alt text to meaningful images.
- Verify the built article, not only the Markdown source.
- Check the canonical link and JSON-LD in the built HTML.
