# Project memory

## What this is
- Sergei Parfenov's English-language personal site: https://sergei-parfenov.com. Speak with Sergei in Russian unless he asks otherwise.
- Static HTML/CSS/JS, Node 20+, Markdown + Marked + build-time Shiki. No framework, CMS, database or admin UI is needed.
- GitHub `P0rt/resume`, production branch `main`, existing Vercel project `serzhooo-6913/resume`. GitHub Pages is not used.

## Source of truth and development
- `content/profile.json`: biography, roles, education, public links and external contributions. Do not scatter duplicate profile copy through templates.
- `content/articles/*.md`: original article bodies and front matter. Never edit `dist/` or `.generated/`; both are rebuilt.
- `src/index.html` + `src/styles/home.css`: homepage. `src/work-together/index.html` + `src/styles/profile.css`: detailed profile.
- `src/blog.html` + `src/styles/blog.css`: archive and article presentation; `scripts/build-site.mjs` generates article pages.
- `scripts/render-article.mjs`: Markdown, syntax highlighting, section permalinks and accessible table wrappers. `src/scripts/main.js`: progressive enhancements.
- `src/styles/index.css`: shared tokens, fonts, controls and background. Keep blog-only changes isolated from the homepage.
- `scripts/site-metadata.mjs`, `api/` and `MCP.md`: SEO, machine-readable output and public read-only MCP.
- Install with `npm ci`; `npm start` builds and serves locally. After edits run `npm test` (includes build, validation, SEO/MCP and regression tests).
- Visually inspect archive, a code-heavy article and a table-heavy article at desktop and narrow mobile widths, light/dark, and without JavaScript. Check live theme changes, keyboard focus, copy buttons and page overflow.
- Preserve unrelated local changes. Publication uses commit + push to `main`; verify Vercel **Ready** and the live result before saying it is deployed. Do not relink hosting or change DNS for normal edits.

## Design decisions to preserve
- Simple, distinctive personal notebook, with fine graph-paper squares, white/black and cobalt accent. Avoid generic marketing sections, card grids, three-column home layouts and filler copy.
- Sergei explicitly likes the original serif headings: Iowan Old Style / Palatino / Georgia. Body is local Manrope; code and small technical labels use system monospace.
- Homepage: large portrait, name and a concise but substantive narrative in one reading column. Only a mention/link to the blog below the introduction; no article feed, full CV, header menu or top blog link.
- Detailed career, education, projects and collaboration belong on `/work-together/`. Blog is separate at `/blog.html`.
- Theme follows browser/OS `prefers-color-scheme`, including live changes. No manual switch, localStorage override or forced dark mode.
- Native `<picture>`: monochrome `portrait-light.webp` for light mode, original `portrait-blue.jpg` for dark; preserve frame/size and theme-aware preloads. `scripts/build-images.mjs` makes responsive WebP derivatives with matching `srcset` / `imagesrcset`; keep originals untouched. Social previews keep the blue photo.
- Favicon: the user's neon-green three-eyed smile, smoothly redrawn in `src/assets/favicon.svg`. Preserve all three eyes. `scripts/build-icons.mjs` renders PNG, multi-size ICO and Apple fallbacks automatically; edit only the SVG master.
- Footer location is `Barcelona, <current year> ☯︎`, not a subtitle under the name. Music/Spotify is hidden for now. Do not publish `src/assets/resume.pdf`.
- Motion stays subtle and respects reduced motion. Article text and highlighting must work without JavaScript; copy controls are progressive enhancements.
- Polish reading measure, paragraph rhythm, lists, long titles, code and tables. Do not rewrite an article merely to make its layout easier.

## Biographical accuracy
- Use Sergei's supplied facts and screenshots, not achievements from design-reference biographies. No invented awards, revenues, client names, metrics, availability or testimonial quotes.
- Current stated roles: Co-Founder and CTO at Aliwio; Tech Adviser at Symptomato. These titles were explicitly corrected by Sergei on September 4, 2026. See README provenance.
- Nebius Academy belongs in the compact homepage career arc after TripleTen. Do not add a dated experience entry or infer a role until Sergei supplies the exact title and dates.
- TripleTen is a **past** role: AI Engineer, December 2021–January 2026. No separate Practicum USA block.
- Yandex Praktikum: 11th member of that product team, not of all Yandex and not a claimed co-founder. Trainer architecture served 7,000–10,000 students/day; ML project assessment preceded ChatGPT. Those detailed facts belong on the work page, not the compact homepage.
- IAWY: Co-Founder/CPO, August 2023–July 2024; two LATAM bootcamp launches are user-supplied. Tech.eu coverage is sponsored accelerator coverage, not an award.
- Stanford CS231n (April–June 2024) is a course, not a degree or alumni claim. The bachelor's degree is from Saint Petersburg State University of Finance and Economics (2005–2010).
- Correct LinkedIn: https://www.linkedin.com/in/sergei--parfenov/ (double hyphen). Recommendations inform copy; do not display them as testimonials.
- “The Agentic Commerce Blueprint” is by **Dimitrios S. Sfyris**; Sergei contributed public review feedback. Keep it in external contributions, not authored articles, RSS counts or academic credentials.

## Publishing and discoverability
- Follow `BLOGGING.md`: `npm run article:new -- "Title"` creates an unpublished draft; write Markdown, complete metadata, then set `published: true` when approved.
- Every article keeps its permanent `/blog/<slug>/` URL. Do not rename a published slug, rewrite source text or refresh dates without a content reason.
- Label fenced code blocks (`python`, `js`, `bash`, `json`, etc.). Highlighting is static and dual-theme; unrecognised languages fall back to plain text without breaking publication.
- `npm run articles:sync` can overwrite DEV-sourced local articles. Use only for an explicitly requested refresh, not as a routine build step.
- For new DEV-hosted covers run `npm run images:import` and commit `content/images/covers/` sources. Normal builds must stay offline; only published covers are generated into public assets. Keep original front-matter URLs and text unchanged. Check payloads, theme switching, image requests and clean mobile Lighthouse when changing image delivery; do not trade image quality or typography for a score.
- Existing DEV copies have canonicals pointing to the matching personal-site URLs. Local metadata does not update DEV; modify external publications only when requested, preserving their content.
- Preserve self-canonicals, one article H1, author identity, JSON-LD, RSS, sitemap, Markdown alternates, JSON catalogs and stable MCP document IDs. Do not promise Google rankings or indexing.
- Drafts must never enter HTML, feeds, catalogs, Markdown output or the MCP bundle. MCP only exposes published content; no arbitrary file/URL fetching, account access, mutations or secrets.
- Keep this file and other internal instructions outside public `src/` assets. More context: `README.md`, `BLOGGING.md`, `MCP.md`.
