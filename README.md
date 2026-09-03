# Sergei Parfenov

Personal site, article archive, and career profile for [sergei-parfenov.com](https://sergei-parfenov.com).

The homepage is a three-column personal notebook: biography, current work, writing and music, followed by collaboration areas and the expanded career history. It becomes a single reading column on phones. Its only top controls are the blog link and a persistent dark-theme switch. The full blog is a separate page; articles keep their own URLs. The resume PDF is retained in `src/assets/resume.pdf` for later use but is excluded from the public build.

## Local development

```bash
npm install
npm start
```

Create a production build with `npm run build`. The build writes the site to `dist`, including one HTML page per article, RSS, sitemap, and robots.txt.

Vercel builds the `main` branch from GitHub with the settings in `vercel.json`. GitHub Actions validates the tests and production build without publishing to GitHub Pages.

## Deployment

- Vercel project: [serzhooo-6913 / resume](https://vercel.com/serzhooo-6913/resume)
- Git repository: [P0rt/resume](https://github.com/P0rt/resume), production branch `main`
- Vercel production URL: [resume-ecru-beta-38.vercel.app](https://resume-ecru-beta-38.vercel.app/)
- Primary domain: `sergei-parfenov.com`; `www.sergei-parfenov.com` redirects to it with HTTP 308.
- Build command: `npm run build`; output directory: `dist`; application preset: Other.

Push a commit to `main` to start a production deployment. Check the Vercel dashboard for the final Ready status before announcing a publication. GitHub Actions runs validation separately; it is not a deployment gate.

DNS stays at GoDaddy. Vercel supplied these targets on September 3, 2026: `A @ → 216.198.79.1` and `CNAME www → 107e0173c2bab476.vercel-dns-017.com.`. Before changing DNS in the future, confirm the current targets in the project's Domains settings. Preserve nameservers, mail records, and other unrelated DNS records.

## Articles

Article source files live in `content/articles`. Create a draft with:

```bash
npm run article:new -- "Article title"
```

Set `published: true` in its front matter when it is ready. The stable public URL will be `https://sergei-parfenov.com/blog/<slug>/`.

Refresh articles originally published on DEV with `npm run articles:sync`. The importer preserves local-first articles and only updates files whose `source` is `dev`.

See `BLOGGING.md` for the publishing and canonical URL workflow.

## SEO and agent access

Public profile fields live in `content/profile.json`; the homepage, Person/ProfilePage schema and agent-readable profile use that same source. Each article has an explicit author, BlogPosting/BreadcrumbList data, canonical URL and Markdown alternate. The sitemap excludes noindex utility pages and uses actual article modification dates.

Edit biography paragraphs, collaboration copy, current work, open projects and experience in `content/profile.json`. Experience entries can include `highlights` for additional paragraphs. A build publishes the same content to HTML, `profile.json`, `index.md` and the MCP snapshot. The profile-specific layout lives in `src/styles/profile.css`; shared controls and article typography live in `src/styles/index.css`.

The September 2026 editorial revision takes its reading-oriented layout cues from [Sergey Nugaev’s homepage](https://sergeynugaev.com/) and [collaboration page](https://sergeynugaev.com/work-together), not his biography, pricing or achievements. Copy is based on Sergei’s supplied career information, his [DEV profile](https://dev.to/p0rt), [GitHub profile](https://github.com/P0rt), public experiment repositories and articles, and [Aliwio](https://aliwio.com). The user supplied four LinkedIn recommendations as background for the writing: rapid AI hypothesis testing, learning personalisation and retention, Mastery Depth Tracker, technical leadership and communicating with non-technical colleagues. These insights are incorporated into the copy; the recommendations are not displayed as quotes, and no authors, precise retention gains, rates or availability were invented.

The read-only MCP endpoint is `https://sergei-parfenov.com/mcp`. `MCP.md` documents connection options, tools, static Markdown/JSON alternatives and security limits. The function is bundled from published content only. `npm test` validates both SEO output and MCP behavior before deployment.

For Google, keep the domain verified in Search Console, submit `https://sergei-parfenov.com/sitemap.xml`, and use URL Inspection for the homepage and representative articles. Submission and structured data do not guarantee indexing, rich results or rankings. Update the canonical URL on existing DEV copies to the corresponding personal-site URL when the personal site should be the preferred version; local metadata cannot change DEV's canonical settings.

On September 3, 2026, the `sc-domain:sergei-parfenov.com` property was verified in Google Search Console with a dedicated root TXT record at GoDaddy. Google successfully processed the sitemap and discovered 24 pages. URL Inspection accepted an indexing request for the homepage and placed it in the priority crawl queue; this does not mean the page is indexed yet. Preserve that `google-site-verification` TXT record; the existing site, nameserver and mail-related records were left unchanged. The public DEV API still reported DEV canonical URLs for all 22 articles at this point; those external publications have not been modified.
