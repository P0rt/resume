# Sergei Parfenov

Personal site, article archive, and career profile for [sergei-parfenov.com](https://sergei-parfenov.com).

The homepage contains the full profile and expanded career history. Its only top controls are the blog link and a persistent dark-theme switch. Articles keep their own URLs. The resume PDF is retained in `src/assets/resume.pdf` for later use but is excluded from the public build.

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
