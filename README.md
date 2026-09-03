# Sergei Parfenov

Personal site, article archive, and career profile for [sergei-parfenov.com](https://sergei-parfenov.com).

The homepage is a compact personal notebook: an introduction with a photo, current roles and a mention of the blog. It has no header controls or music block. Theme follows the browser or operating system, including live preference changes; old saved theme overrides are ignored. Detailed biography, projects, collaboration areas and career history live at `/work-together/`, linked from the introduction. The full blog is a separate page; individual article and project links do not appear on the homepage. Articles keep their own URLs. The resume PDF is retained in `src/assets/resume.pdf` for later use but is excluded from the public build.

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

External review contributions live in `content/profile.json` under `contributions`. The blog highlights [The Agentic Commerce Blueprint](https://www.webdigestpro.com/the-agentic-commerce-blueprint/) above the chronological archive. Its credited author is Dimitrios S. Sfyris; Sergei is credited with public review feedback on provenance, inherited refusal, permissions and current-state checks. Keep that distinction in visible copy and structured data: this is an external technical guide with a review contribution, not an academic publication authored by Sergei. It is represented as a mentioned CreativeWork, not an authored BlogPosting, and does not increase the article count or enter the RSS feed. The same attribution is available through profile JSON, Markdown and MCP search/fetch. No individual paper link is added to the homepage.

## SEO and agent access

Public profile fields live in `content/profile.json`; the homepage, Person/ProfilePage schema and agent-readable profile use that same source. Each article has an explicit author, BlogPosting/BreadcrumbList data, canonical URL and Markdown alternate. The sitemap excludes noindex utility pages and uses actual article modification dates.

Edit the homepage lead `intro`, career overview `homeStory`, current-work paragraph `homeCurrent` and `blogIntro` in `content/profile.json`. The company names in `homeCurrent` receive links from `currentRoles`; keep these names consistent. Full biography paragraphs, collaboration copy, current work, open projects and experience live in the same file. Experience entries can include `highlights` for additional paragraphs and `coverage` for a source link. The full profile remains available in `profile.json`, `index.md` and the MCP snapshot, including information moved to `/work-together/`. That page has its own canonical URL, AboutPage metadata and sitemap entry. The compact homepage layout lives in `src/styles/home.css`; the detailed work page uses `src/styles/profile.css`. Shared controls and article typography live in `src/styles/index.css`.

The homepage deliberately reads as a personal introduction, not three independent columns or a directory of Now/Writing rows. A large 240px portrait sits to the right of the name and introductory paragraph on desktop; on mobile the 192px portrait leads the page. The story below stays in one reading column, with a connected account of the early Yandex team, TripleTen, IAWY and the current projects. The user removed the detailed Yandex paragraph about being the 11th member, trainer architecture and daily students; keep those details on the work page and in the full agent-readable biography. The latest copy takes the narrative structure of the user's supplied reference (a decade of work, named projects, concrete outcomes and source links), never its author's co-founder claims, revenue, graduate counts, nonprofit work, awards or partners. Keep the graph-paper background, local Manrope body font, the original Iowan/Palatino/Georgia serif headings (explicitly requested by the user), and blue accent. The only homepage blog link belongs below the introduction, not the header. Do not restore the music block or theme switch, or add an article feed, full career history or extra sales sections to fill space. The music data remains in the profile source for future use. Motion is limited to a short entrance and hover feedback, disabled for reduced-motion preferences.

The current LinkedIn URL is `https://www.linkedin.com/in/sergei--parfenov/`, supplied by Sergei. Footer links are generated from the `sameAs` entry so they match structured data and agent output. Education is also maintained in `content/profile.json`, shown at `/work-together/#education` and included in the JSON, Markdown and MCP profile. The supplied screenshot lists Stanford CS231n: Deep Learning for Computer Vision (April–June 2024) as a course, not a degree or claim of Stanford alumni status. It separately lists a bachelor's degree in Computer Information Systems from Saint Petersburg State University of Finance and Economics (2005–2010). Only these two visible entries were added; the screenshot's other two collapsed entries are unknown.

The homepage location now appears only in the footer as `Barcelona, 2026 ☯︎` (the year updates automatically). Do not restore the location under the name; the full location remains available in structured profile data.

The September 2026 editorial revision takes its reading-oriented layout cues from [Sergey Nugaev’s homepage](https://sergeynugaev.com/) and [collaboration page](https://sergeynugaev.com/work-together), not his biography, pricing or achievements. Copy is based on Sergei’s supplied career information, his [DEV profile](https://dev.to/p0rt), [GitHub profile](https://github.com/P0rt), public experiment repositories and articles, and [Aliwio](https://aliwio.com). The user supplied four LinkedIn recommendations as background for the writing: rapid AI hypothesis testing, learning personalisation and retention, Mastery Depth Tracker, technical leadership and communicating with non-technical colleagues. These insights are incorporated into the copy; the recommendations are not displayed as quotes, and no authors, precise retention gains, rates or availability were invented.

Career corrections supplied by Sergei on September 3, 2026 take precedence over the older profile: he was Yandex Praktikum’s 11th team member, designed test architecture for a trainer serving 7,000–10,000 students daily and built ML project assessment before ChatGPT. His stated current CTO roles are Aliwio and [Symptomato](https://symptomato.com/). The later LinkedIn screenshot lists Symptomato as **Technology Adviser**; the website retains Sergei’s explicit CTO wording pending clarification, not a claim that LinkedIn confirms that title.

User-supplied LinkedIn screenshots confirm TripleTen’s **AI Engineer** role, **December 2021–January 2026**, and the assessment, retrieval, authoring, support and voice metrics used in the detailed profile. They also supply IAWY’s **Co-Founder and CPO** role (**August 2023–July 2024**), Retailhub, the corrected Yandex Praktikum and Thingyfy titles/dates, Yandex School of Data Analysis and Sravni.ru. The unnamed “−23%” metric in the vectorization paragraph is not used because the screenshot does not specify what decreased. IAWY’s two Latin American bootcamp launches are user-supplied; LinkedIn describes a pilot. The [February 2024 Tech.eu article](https://tech.eu/2024/02/22/8-impact-driven-startups-worth-following/) confirms IAWY’s student-support and practical-task-feedback product description; it is sponsored accelerator coverage, not an award or independent validation of every career claim. Do not attribute its reference to a Forbes-listed founder to Sergei. Direct LinkedIn browsing was blocked by authentication; the supplied screenshots and recommendations were used instead.

The read-only MCP endpoint is `https://sergei-parfenov.com/mcp`. `MCP.md` documents connection options, tools, static Markdown/JSON alternatives and security limits. The function is bundled from published content only. `npm test` validates both SEO output and MCP behavior before deployment.

For Google, keep the domain verified in Search Console, submit `https://sergei-parfenov.com/sitemap.xml`, and use URL Inspection for the homepage and representative articles. Submission and structured data do not guarantee indexing, rich results or rankings. Update the canonical URL on existing DEV copies to the corresponding personal-site URL when the personal site should be the preferred version; local metadata cannot change DEV's canonical settings.

On September 3, 2026, the `sc-domain:sergei-parfenov.com` property was verified in Google Search Console with a dedicated root TXT record at GoDaddy. Google successfully processed the sitemap and discovered 24 pages. URL Inspection accepted an indexing request for the homepage and placed it in the priority crawl queue; this does not mean the page is indexed yet. Preserve that `google-site-verification` TXT record; the existing site, nameserver and mail-related records were left unchanged. The public DEV API still reported DEV canonical URLs for all 22 articles at this point; those external publications have not been modified.

The final September 3 review subsequently checked all 25 live sitemap pages, their self-referencing canonicals and structured metadata, HTTPS/www/legacy-path redirects, real 404 responses, and the public JSON/Markdown alternates. Live MCP initialization, all three tools, 25 resources and the complete text of all 22 articles were checked; host/origin, malformed request and draft-exclusion cases are also covered by local SDK integration tests. An independent code review was used because the specialized Bugbot runner was unavailable. It found and reproduced a draft-generator bug where truncating a long title left a trailing hyphen in its slug. The fix trims the final hyphen and has dedicated regression/duplicate-protection tests. All 26 tests pass; npm audit reported no known dependency vulnerabilities at review time.

With Sergei's explicit authorization, all 22 existing DEV articles were then given canonical URLs pointing to their matching personal-site article pages. This also replaced two old `YOUR-DOMAIN.com` placeholders and one GitHub-repository canonical. Every saved canonical was verified in the public DEV API and HTML head. Original article text (excluding the canonical front-matter line), titles, tags, cover images and publication dates were compared before and after and were unchanged. Earlier Search Console and DEV observations above are historical, not the current canonical state. Canonical annotations express a preference; they do not guarantee Google's selection or immediate reindexing.
