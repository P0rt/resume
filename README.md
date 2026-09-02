# Sergei Parfenov

Personal site, article archive, and career profile for [sergei-parfenov.com](https://sergei-parfenov.com).

## Local development

```bash
npm install
npm start
```

Create a production build with `npm run build`. The build writes the site to `dist`, including one HTML page per article, RSS, sitemap, and robots.txt.

Vercel builds the `main` branch from GitHub with the settings in `vercel.json`. GitHub Actions validates the tests and production build without publishing to GitHub Pages.

## Articles

Article source files live in `content/articles`. Create a draft with:

```bash
npm run article:new -- "Article title"
```

Set `published: true` in its front matter when it is ready. The stable public URL will be `https://sergei-parfenov.com/blog/<slug>/`.

Refresh articles originally published on DEV with `npm run articles:sync`. The importer preserves local-first articles and only updates files whose `source` is `dev`.

See `BLOGGING.md` for the publishing and canonical URL workflow.
