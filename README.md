# Sergei Parfenov

Personal site, writing hub, and career archive.

Production: https://sergei-parfenov.com

## Local development

```bash
npm install
npm start
```

Create a production build with `npm run build`.

Vercel builds the `master` branch from GitHub with the settings in `vercel.json`. GitHub Actions validates tests and the production build without publishing to GitHub Pages.

## Content settings

The public Spotify URL lives in `src/scripts/main.js` under `profileLinks.spotify`. The link stays hidden until a real URL is provided.

The writing hub has indexable fallback content and refreshes its visible article list from the public DEV API in the browser.

See `BLOGGING.md` before publishing an article on both this site and DEV.
